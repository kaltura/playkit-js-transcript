import {h} from 'preact';
import {ObjectUtils} from './utils';
import {ui} from 'kaltura-player-js';
import {PluginButton} from './components/plugin-button/plugin-button';
import {Transcript} from './components/transcript';
import {getConfigValue, isBoolean, makePlainText, prepareCuePoint} from './utils';
import {TranscriptConfig, PluginPositions, PluginStates, HighlightedMap, CuePointData, ItemTypes, CuePoint} from './types';
import {DownloadPrintMenu, downloadContent, printContent} from './components/download-print-menu';

const {SidePanelModes, SidePanelPositions, ReservedPresetNames, ReservedPresetAreas} = ui;
const {get} = ObjectUtils;
const {Tooltip} = KalturaPlayer.ui.components;

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
    this.onPluginSetup();
    this.cuePointManager.registerTypes([this.cuePointManager.CuepointType.CAPTION]);
  }

  onPluginSetup(): void {
    this.eventManager.listen(this.player, this.player.Event.TIMED_METADATA_CHANGE, this._onTimedMetadataChange);
    this.eventManager.listen(this.player, this.player.Event.TIMED_METADATA_ADDED, this._onTimedMetadataAdded);
    this.eventManager.listen(this.player, this.player.Event.TEXT_TRACK_CHANGED, this._handleLanguageChange);
  }

  onRegisterUI(): void {}

  private _handleLanguageChange = () => {
    this._activeCaptionMapId = this._getCaptionMapId();
    if (this._captionMap.has(this._activeCaptionMapId)) {
      this._updateTranscriptPanel();
    }
  };

  private _updateTranscriptPanel() {
    this._isLoading = false;
    if (this._transcriptPanel) {
      this.sidePanelsManager.update(this._transcriptPanel);
    }
  }

  private _onTimedMetadataAdded = ({payload}: TimedMetadataEvent) => {
    const captionData: CuePointData[] = [];
    payload.cues.forEach((cue: CuePoint) => {
      captionData.push(prepareCuePoint(cue, ItemTypes.Caption)); 
    });
    if (captionData.length) {
      this._addCaptionData(captionData);
    }
  };

  private _onTimedMetadataChange = ({payload}: TimedMetadataEvent) => {
    const transcriptCuePoints: Array<CuePoint> = payload.cues;
    this._activeCuePointsMap = {};
    if (transcriptCuePoints.length) {
      const latestTranscriptCuePoint = transcriptCuePoints[transcriptCuePoints.length - 1];
      const relevantTranscriptItem = this._data.find(item => item.id === latestTranscriptCuePoint.id);
      if (relevantTranscriptItem) {
        this._activeCuePointsMap[relevantTranscriptItem.id] = true;
        this._updateTranscriptPanel();
      }
    }
  };

  private _addCaptionData = (newData: CuePointData[]) => {
    this._activeCaptionMapId = this._getCaptionMapId();
    this._captionMap.set(this._activeCaptionMapId, newData);
    this._createOrUpdatePlugin();
  };

  private _getCaptionMapId = (): string => {
    const allTextTracks = this.player.getTracks(this.player.Track.TEXT) || [];
    const activeTextTrack = allTextTracks.find(track => track.active);
    if (activeTextTrack) {
      const captionMapId = `${activeTextTrack.language}-${activeTextTrack.label}`;
      return captionMapId;
    }
    return '';
  };

  private onClose = () => {
    if (this.sidePanelsManager.isItemActive(this._transcriptPanel)) {
      this._pluginState = PluginStates.CLOSED;
      this.sidePanelsManager.deactivateItem(this._transcriptPanel);
    } else {
      this.sidePanelsManager.activateItem(this._transcriptPanel);
    }
  };

  private _addPopoverIcon(): void {
    const {downloadDisabled, printDisabled} = this.config;
    if (this._removePopoverIcon) {
      return;
    }
    this._removePopoverIcon = this.player.ui.addComponent({
      label: 'Download transcript',
      area: ReservedPresetAreas.TopBarRightControls,
      presets: [ReservedPresetNames.Playback, ReservedPresetNames.Live],
      get: () => (
        <DownloadPrintMenu
          onDownload={this._handleDownload}
          onPrint={this._handlePrint}
          downloadDisabled={getConfigValue(downloadDisabled, isBoolean, false)}
          printDisabled={getConfigValue(printDisabled, isBoolean, false)}
          dropdownAriaLabel={`Download or print transcript`}
          printButtonAriaLabel={`Print transcript`}
          downloadButtonAriaLabel={`Download transcript`}
        />
      )
    });
  }

  private _createOrUpdatePlugin = () => {
    if (this._transcriptPanel) {
      this._updateTranscriptPanel();
    } else {
      this._initLoading();
      this._addPopoverIcon();
      this._addTranscriptItem();
    }
  };

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
            onRetryLoad={this._createOrUpdatePlugin}
            currentTime={this.player.currentTime}
            videoDuration={this.player.duration}
            kitchenSinkActive={!!this.sidePanelsManager.isItemActive(this._transcriptPanel)}
            toggledWithEnter={this._triggeredByKeyboard}
            onClose={this.onClose}
          />
        );
      },
      iconComponent: ({isActive}: {isActive: boolean}) => {
        return (
          <Tooltip label={buttonLabel} type="bottom">
            <PluginButton isActive={isActive} onClick={this.onClose} label={buttonLabel} />
          </Tooltip>
        );
      },
      presets: [ReservedPresetNames.Playback, ReservedPresetNames.Live, ReservedPresetNames.Ads],
      position: position,
      expandMode: expandMode,
      onActivate: () => {
        this._pluginState = PluginStates.OPENED;
      }
    });

    if ((expandOnFirstPlay && !this._pluginState) || this._pluginState === PluginStates.OPENED) {
      this.ready.then(() => {
        this.sidePanelsManager.activateItem(this._transcriptPanel);
      });
    }
  }

  private _initLoading() {
    if (!this._isLoading || this._hasError) {
      this._isLoading = true;
      this._hasError = false;
      this._updateTranscriptPanel();
    }
  }

  private _seekTo = (time: number) => {
    this.player.currentTime = time;
  };

  private _handleDownload = () => {
    const {config} = this.player;
    const captions = this._captionMap.get(this._activeCaptionMapId) || []

    if (captions) {
      const entryMetadata = get(config, 'sources.metadata', {});
      const language = this._getCaptionMapId();
      
      downloadContent(makePlainText(captions), `${language}${entryMetadata.name ? `-${entryMetadata.name}` : ''}.txt`);
    }
  };

  private _handlePrint = () => {
    const captions = this._captionMap.get(this._activeCaptionMapId) || []

    if (captions) {
      printContent(makePlainText(captions));
    }
  };

  static isValid(): boolean {
    return true;
  }

  reset(): void {
    if (this._removePopoverIcon) {
      this._removePopoverIcon();
      this._removePopoverIcon = null;
    }

    this._captionMap = new Map();
    this._activeCaptionMapId = '';
    this._isLoading = false;
    this._hasError = false;
  }

  destroy(): void {
    this.reset();
  }
}
