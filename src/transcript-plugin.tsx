import {h} from 'preact';
import {OnClickEvent} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {ui} from '@playkit-js/kaltura-player-js';
import {UpperBarManager, SidePanelsManager} from '@playkit-js/ui-managers';
import {ObjectUtils, downloadContent, printContent} from './utils';
import {icons} from './components/icons';
import {PluginButton} from './components/plugin-button/plugin-button';
import {Transcript} from './components/transcript';
import {getConfigValue, isBoolean, makePlainText, prepareCuePoint} from './utils';
import {TranscriptConfig, PluginStates, HighlightedMap, CuePointData, ItemTypes, CuePoint} from './types';

const {SidePanelModes, SidePanelPositions, ReservedPresetNames, ReservedPresetAreas} = ui;
const {withText, Text} = KalturaPlayer.ui.preacti18n;
const {get} = ObjectUtils;

const LOADING_TIMEOUT = 10000;

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
  private _loadingTimeoutId?: ReturnType<typeof setTimeout>;
  private _hasError = false;
  private _triggeredByKeyboard = false;

  private _transcriptPanel = -1;
  private _transcriptIcon = -1;
  private _pluginState: PluginStates | null = null;
  private _pluginButtonRef: HTMLButtonElement | null = null;

  constructor(name: string, player: KalturaPlayerTypes.Player, config: TranscriptConfig) {
    super(name, player, config);
  }

  get sidePanelsManager() {
    return this.player.getService('sidePanelsManager') as SidePanelsManager | undefined;
  }

  get upperBarManager() {
    return this.player.getService('upperBarManager') as UpperBarManager | undefined;
  }

  get cuePointManager() {
    return this.player.getService('kalturaCuepoints') as any;
  }

  private get _data() {
    return this._captionMap.get(this._activeCaptionMapId) || [];
  }

  loadMedia(): void {
    if (!this.cuePointManager || !this.sidePanelsManager || !this.upperBarManager) {
      this.logger.warn("kalturaCuepoints, sidePanelsManager or upperBarManager haven't registered");
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
    this.eventManager.listenOnce(this.player, this.player.Event.TRACKS_CHANGED, () => {
      if (this._getTextTracks().length) {
        this.eventManager.listen(this.player, this.player.Event.TIMED_METADATA_CHANGE, this._onTimedMetadataChange);
        this.eventManager.listen(this.player, this.player.Event.TIMED_METADATA_ADDED, this._onTimedMetadataAdded);
        this.eventManager.listen(this.player, this.player.Event.TEXT_TRACK_CHANGED, this._handleLanguageChange);
      }
    });
  }

  private _initLoading = () => {
    clearTimeout(this._loadingTimeoutId);
    this._isLoading = false;
    this._hasError = false;
    if (!this._captionMap.has(this._activeCaptionMapId)) {
      // turn on loading animation till captions added to TextTrack
      this._isLoading = true;
      this._loadingTimeoutId = setTimeout(() => {
        // display error slate
        this._isLoading = false;
        this._hasError = true;
        this._updateTranscriptPanel();
      }, LOADING_TIMEOUT);
    }
    this._updateTranscriptPanel();
  };

  private _handleLanguageChange = () => {
    this._activeCaptionMapId = this._getCaptionMapId();
    this._initLoading();
  };

  private _updateTranscriptPanel() {
    if (this._transcriptPanel) {
      this.sidePanelsManager?.update(this._transcriptPanel);
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
      this._addTranscriptItem();
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
    clearTimeout(this._loadingTimeoutId);
    this._updateTranscriptPanel();
  };

  private _getTextTracks = () => {
    return this.player.getTracks(this.player.Track.TEXT) || [];
  };

  private _getCaptionMapId = (): string => {
    const allTextTracks = this._getTextTracks();
    const activeTextTrack = allTextTracks.find(track => track.active);
    if (activeTextTrack?.language === 'off') {
      // use 1st captions from text-track list
      return `${allTextTracks[0]?.language}-${allTextTracks[0]?.label}`;
    }
    return `${activeTextTrack?.language}-${activeTextTrack?.label}`;
  };

  private _activatePlugin = () => {
    this.ready.then(() => {
      this.sidePanelsManager?.activateItem(this._transcriptPanel);
      this._pluginState === PluginStates.OPENED;
      this.upperBarManager?.update(this._transcriptIcon);
    });
  };

  private _deactivatePlugin = () => {
    this.ready.then(() => {
      this.sidePanelsManager?.deactivateItem(this._transcriptPanel);
      this._pluginState = PluginStates.CLOSED;
      this.upperBarManager?.update(this._transcriptIcon);
    });
  };

  private _isPluginActive = () => {
    return this.sidePanelsManager!.isItemActive(this._transcriptPanel);
  };

  private _handleClickOnPluginIcon = (e: OnClickEvent, byKeyboard?: boolean) => {
    if (this._isPluginActive()) {
      this._triggeredByKeyboard = false;
      this._deactivatePlugin();
    } else {
      this._triggeredByKeyboard = Boolean(byKeyboard);
      this._activatePlugin();
    }
  };

  private _addTranscriptItem(): void {
    if (Math.max(this._transcriptPanel, this._transcriptIcon) > 0) {
      // transcript panel or icon already exist
      return;
    }

    const {
      expandMode,
      position,
      expandOnFirstPlay,
      showTime,
      scrollOffset,
      searchDebounceTimeout,
      searchNextPrevDebounceTimeout,
      downloadDisabled,
      printDisabled
    } = this.config;
    this._transcriptPanel = this.sidePanelsManager!.add({
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
            onItemClicked={this._seekTo}
            captions={this._data}
            isLoading={this._isLoading}
            hasError={this._hasError}
            onRetryLoad={this._updateTranscriptPanel}
            currentTime={this.player.currentTime}
            videoDuration={this.player.duration}
            kitchenSinkActive={this._isPluginActive()}
            toggledWithEnter={this._triggeredByKeyboard}
            onClose={this._handleClose}
            downloadDisabled={getConfigValue(downloadDisabled, isBoolean, false)}
            onDownload={this._handleDownload}
            printDisabled={getConfigValue(printDisabled, isBoolean, false)}
            onPrint={this._handlePrint}
          />
        );
      },
      presets: [ReservedPresetNames.Playback, ReservedPresetNames.Live, ReservedPresetNames.Ads],
      position: position,
      expandMode: expandMode === SidePanelModes.ALONGSIDE ? SidePanelModes.ALONGSIDE : SidePanelModes.OVER,
      onDeactivate: this._deactivatePlugin
    }) as number;
    const translates = {
      showTranscript: <Text id="transcript.show_plugin">Show Transcript</Text>,
      hideTranscript: <Text id="transcript.hide_plugin">Hide Transcript</Text>
    };
    this._transcriptIcon = this.upperBarManager!.add({
      label: 'Transcript',
      svgIcon: {path: icons.PLUGIN_ICON, viewBox: `0 0 ${icons.BigSize} ${icons.BigSize}`},
      onClick: this._handleClickOnPluginIcon as () => void,
      component: withText(translates)((props: {showTranscript: string; hideTranscript: string}) => {
        const isActive = this._isPluginActive();
        const label = isActive ? props.hideTranscript : props.showTranscript;
        return (
          <PluginButton
            isActive={isActive}
            id="transcript-icon"
            label={label}
            icon={icons.PLUGIN_ICON}
            dataTestId="transcript_pluginButton"
            setRef={this._setPluginButtonRef}
          />
        );
      })
    }) as number;

    if ((expandOnFirstPlay && !this._pluginState) || this._pluginState === PluginStates.OPENED) {
      this._activatePlugin();
    }
  }

  private _setPluginButtonRef = (ref: HTMLButtonElement | null) => {
    this._pluginButtonRef = ref;
  };

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

  private _handleClose = (e: OnClickEvent, byKeyboard: boolean) => {
    if (byKeyboard) {
      this._pluginButtonRef?.focus();
    }
    this._deactivatePlugin();
  };

  static isValid(): boolean {
    return true;
  }

  reset(): void {
    this.eventManager.removeAll();
    if (Math.max(this._transcriptPanel, this._transcriptIcon) > 0) {
      this.sidePanelsManager?.remove(this._transcriptPanel);
      this.upperBarManager!.remove(this._transcriptIcon);
      this._transcriptPanel = -1;
      this._transcriptIcon = -1;
      this._pluginButtonRef = null;
    }
    this._captionMap = new Map();
    this._activeCaptionMapId = '';
    this._isLoading = false;
    clearTimeout(this._loadingTimeoutId);
    this._hasError = false;
    this._triggeredByKeyboard = false;
  }

  destroy(): void {
    this.reset();
  }
}
