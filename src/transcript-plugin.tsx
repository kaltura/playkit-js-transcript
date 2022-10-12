import {h} from 'preact';
import {OnClickEvent} from '@playkit-js/common';
import {ui} from 'kaltura-player-js';
import {ObjectUtils} from './utils';
import {PluginButton} from './components/plugin-button/plugin-button';
import {Transcript} from './components/transcript';
import {getConfigValue, isBoolean, makePlainText, prepareCuePoint} from './utils';
import {TranscriptConfig, PluginPositions, PluginStates, HighlightedMap, CuePointData, ItemTypes, CuePoint} from './types';
import {DownloadPrintMenu, downloadContent, printContent} from './components/download-print-menu';

const {SidePanelModes, SidePanelPositions, ReservedPresetNames, ReservedPresetAreas} = ui;
const {get} = ObjectUtils;

interface TimedMetadataEvent {
  payload: {
    cues: Array<CuePoint>;
  };
}

export class TranscriptPlugin extends KalturaPlayer.core.BasePlugin {
  static defaultConfig: TranscriptConfig = {
    expandMode: SidePanelModes.ALONGSIDE,
    expandOnFirstPlay: true,
    showTime: true,
    position: SidePanelPositions.RIGHT,
    scrollOffset: 0,
    searchDebounceTimeout: 250,
    searchNextPrevDebounceTimeout: 100,
    downloadDisabled: false,
    printDisabled: false
  };
  private _activeCaptionMapId: string = '';
  private _activeCuePointsMap: HighlightedMap = {};
  private _captionMap: Map<string, Array<CuePointData>> = new Map();
  private _isLoading = false;
  private _hasError = false;
  private _triggeredByKeyboard = false;

  private _removePopoverIcon: null | Function = null;

  private _transcriptPanel = null;
  private _pluginState: PluginStates | null = null;

  constructor(name: string, player: KalturaPlayerTypes.Player, config: TranscriptConfig) {
    super(name, player, config);
  }

  get sidePanelsManager() {
    return this.player.getService('sidePanelsManager') as any;
  }

  get cuePointManager() {
    return this.player.getService('kalturaCuepoints') as any;
  }

  private get _data() {
    return this._captionMap.get(this._activeCaptionMapId) || [];
  }

  loadMedia(): void {
    if (!this.cuePointManager || !this.sidePanelsManager) {
      this.logger.warn("kalturaCuepoints or sidePanelsManager haven't registered");
      return;
    }
    if (this.player.isLive()) {
      // transcript plugin is not supported for live entries
      return;
    }
    this._initListeners();
    this.cuePointManager.registerTypes([this.cuePointManager.CuepointType.CAPTION]);
  }

  private _initListeners(): void {
    this.eventManager.listen(this.player, this.player.Event.FIRST_PLAYING, () => {
      if ((this.player.getTracks(this.player.Track.TEXT) || []).length) {
        // check if captions already added in TextTrack
        if (!this._captionMap.size) {
          // turn on loading animation till captions added to TextTrack
          this._isLoading = true;
        }
        this._addPopoverIcon();
        this._addTranscriptItem();
      }
    });
    this.eventManager.listen(this.player, this.player.Event.TIMED_METADATA_CHANGE, this._onTimedMetadataChange);
    this.eventManager.listen(this.player, this.player.Event.TIMED_METADATA_ADDED, this._onTimedMetadataAdded);
    this.eventManager.listen(this.player, this.player.Event.TEXT_TRACK_CHANGED, this._handleLanguageChange);
  }

  private _handleLanguageChange = () => {
    this._activeCaptionMapId = this._getCaptionMapId();
    this._isLoading = !this._captionMap.has(this._activeCaptionMapId);
    this._updateTranscriptPanel();
  };

  private _updateTranscriptPanel() {
    if (this._transcriptPanel) {
      this.sidePanelsManager.update(this._transcriptPanel);
    }
  }

  private _onTimedMetadataAdded = ({payload}: TimedMetadataEvent) => {
    const captionData: CuePointData[] = [];
    payload.cues.forEach((cue: CuePoint) => {
      if (cue.metadata.cuePointType === ItemTypes.Caption) {
        captionData.push(prepareCuePoint(cue));
      }
    });
    if (captionData.length) {
      this._addCaptionData(captionData);
    }
  };

  private _onTimedMetadataChange = ({payload}: TimedMetadataEvent) => {
    const transcriptCuePoints: Array<CuePoint> = payload.cues
      .filter((cue: CuePoint) => {
        return cue.metadata.cuePointType === ItemTypes.Caption;
      })
      .filter((cue, index, array) => {
        // filter out captions that has endTime eq to next caption startTime
        const nextCue = array[index + 1];
        return !nextCue || cue.endTime !== nextCue.startTime;
      });
    this._activeCuePointsMap = {};
    transcriptCuePoints.forEach(cue => {
      this._activeCuePointsMap[cue.id] = true;
    });
    this._updateTranscriptPanel();
  };

  private _addCaptionData = (newData: CuePointData[]) => {
    this._activeCaptionMapId = this._getCaptionMapId();
    this._captionMap.set(this._activeCaptionMapId, newData);
    this._isLoading = false;
    this._updateTranscriptPanel();
  };

  private _getCaptionMapId = (): string => {
    const allTextTracks = this.player.getTracks(this.player.Track.TEXT) || [];
    const activeTextTrack = allTextTracks.find(track => track.active);
    if (activeTextTrack?.language === 'off') {
      // use 1st captions from text-track list
      return `${allTextTracks[0]?.language}-${allTextTracks[0]?.label}`;
    }
    return `${activeTextTrack?.language}-${activeTextTrack?.label}`;
  };

  private _handleCloseClick = () => {
    this.sidePanelsManager.deactivateItem(this._transcriptPanel);
    this._pluginState = PluginStates.CLOSED;
  };

  private _addPopoverIcon(): void {
    const {downloadDisabled, printDisabled} = this.config;
    if (this._removePopoverIcon) {
      return;
    }
    this._removePopoverIcon = this.player.ui.addComponent({
      label: 'Download or print transcript',
      area: ReservedPresetAreas.TopBarRightControls,
      presets: [ReservedPresetNames.Playback, ReservedPresetNames.Live],
      get: () => (
        <DownloadPrintMenu
          onDownload={this._handleDownload}
          onPrint={this._handlePrint}
          downloadDisabled={getConfigValue(downloadDisabled, isBoolean, false)}
          printDisabled={getConfigValue(printDisabled, isBoolean, false)}
        />
      )
    });
  }

  private _addTranscriptItem(): void {
    const buttonLabel = 'Transcript';
    const {expandMode, position, expandOnFirstPlay} = this.config;
    const pluginMode: PluginPositions = [SidePanelPositions.RIGHT, SidePanelPositions.LEFT].includes(position)
      ? PluginPositions.VERTICAL
      : PluginPositions.HORIZONTAL;
    const {showTime, scrollOffset, searchDebounceTimeout, searchNextPrevDebounceTimeout} = this.config;
    this._transcriptPanel = this.sidePanelsManager.addItem({
      label: 'Transcript',
      panelComponent: () => {
        return (
          <Transcript
            showTime={getConfigValue(showTime, isBoolean, true)}
            scrollOffset={getConfigValue(scrollOffset, Number.isInteger, 0)}
            searchDebounceTimeout={getConfigValue(searchDebounceTimeout, Number.isInteger, 250)}
            searchNextPrevDebounceTimeout={getConfigValue(searchNextPrevDebounceTimeout, Number.isInteger, 100)}
            highlightedMap={this._activeCuePointsMap}
            onSeek={this._seekTo}
            pluginMode={pluginMode}
            onItemClicked={this._seekTo}
            captions={this._data}
            isLoading={this._isLoading}
            hasError={this._hasError}
            onRetryLoad={this._updateTranscriptPanel}
            currentTime={this.player.currentTime}
            videoDuration={this.player.duration}
            kitchenSinkActive={!!this.sidePanelsManager.isItemActive(this._transcriptPanel)}
            toggledWithEnter={this._triggeredByKeyboard}
            onClose={this._handleCloseClick}
          />
        );
      },
      iconComponent: ({isActive}: {isActive: boolean}) => {
        return (
          <PluginButton
            isActive={isActive}
            onClick={(e: OnClickEvent, byKeyboard?: boolean) => {
              if (this.sidePanelsManager.isItemActive(this._transcriptPanel)) {
                this._triggeredByKeyboard = false;
                this._handleCloseClick();
              } else {
                this._triggeredByKeyboard = Boolean(byKeyboard);
                this.sidePanelsManager.activateItem(this._transcriptPanel);
              }
            }}
          />
        );
      },
      presets: [ReservedPresetNames.Playback, ReservedPresetNames.Live, ReservedPresetNames.Ads],
      position: position,
      expandMode: expandMode === SidePanelModes.ALONGSIDE ? SidePanelModes.ALONGSIDE : SidePanelModes.OVER,
      onActivate: () => {
        this._pluginState = PluginStates.OPENED;
      }
    });

    if ((expandOnFirstPlay && !this._pluginState) || this._pluginState === PluginStates.OPENED) {
      this.player.ready().then(() => {
        this.sidePanelsManager.activateItem(this._transcriptPanel);
      });
    }
  }

  private _seekTo = (time: number) => {
    this.player.currentTime = time;
  };

  private _handleDownload = () => {
    const {config} = this.player;
    const captions = this._captionMap.get(this._activeCaptionMapId) || [];

    if (captions) {
      const entryMetadata = get(config, 'sources.metadata', {});
      const language = this._getCaptionMapId();

      downloadContent(makePlainText(captions), `${language}${entryMetadata.name ? `-${entryMetadata.name}` : ''}.txt`);
    }
  };

  private _handlePrint = () => {
    const captions = this._captionMap.get(this._activeCaptionMapId) || [];

    if (captions) {
      printContent(makePlainText(captions));
    }
  };

  static isValid(): boolean {
    return true;
  }

  reset(): void {
    this.eventManager.removeAll();
    if (this._removePopoverIcon) {
      this._removePopoverIcon();
      this._removePopoverIcon = null;
    }
    if (this._transcriptPanel) {
      this.sidePanelsManager.removeItem(this._transcriptPanel);
      this._transcriptPanel = null;
    }
    this._captionMap = new Map();
    this._activeCaptionMapId = '';
    this._isLoading = false;
    this._hasError = false;
    this._triggeredByKeyboard = false;
  }

  destroy(): void {
    this.reset();
  }
}
