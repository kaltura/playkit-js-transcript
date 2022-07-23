import {h} from 'preact';
import {ObjectUtils} from './utils';
import {ui} from 'kaltura-player-js';
import {KalturaCaptionAsset} from 'kaltura-typescript-client/api/types/KalturaCaptionAsset';
import {PluginButton} from './components/plugin-button/plugin-button';
import {Transcript} from './components/transcript';
import {getConfigValue, isBoolean, makePlainText, itemTypesOrder, prepareCuePoint} from './utils';
import {TranscriptConfig, PluginPositions, PluginStates, HighlightedMap, CaptionItem, ItemData, ItemTypes, CuePoint} from './types';
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
    position: SidePanelPositions.BOTTOM,
    scrollOffset: 0,
    searchDebounceTimeout: 250,
    searchNextPrevDebounceTimeout: 100,
    downloadDisabled: false,
    printDisabled: false
  };
  private _activeCaptionMapId: string = '';
  private _activeCuePointsMap: HighlightedMap = {};
  private _highlightedGroup: Array<ItemData> = [];
  private _captionMap: Map<string, Array<ItemData>> = new Map();
  private _isLoading = false;
  private _hasError = false;
  private _captionsList: KalturaCaptionAsset[] = []; // list of captions
  private _captions: CaptionItem[] = []; // parsed captions
  private _transcriptLanguage = 'default';
  private _triggeredByKeyboard = false;
  private _itemsFilter = itemTypesOrder;

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
    this._registerCuePointTypes();

    if (this.player.isLive()) {
      this._addTranscriptItem();
    }
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
    const isLive = this.player.isLive();
    const captionData: ItemData[] = [];
    payload.cues.forEach((cue: CuePoint) => {
      if (this._getCuePointType(cue) === ItemTypes.Caption && this._itemsFilter[ItemTypes.Caption]) {
        captionData.push(prepareCuePoint(cue, ItemTypes.Caption, isLive));
      }
    });
    if (captionData.length) {
      this._addCaptionData(captionData);
    }
  };

  private _onTimedMetadataChange = ({payload}: TimedMetadataEvent) => {
    const transcriptCuePoints: Array<CuePoint> = payload.cues;
    this._activeCuePointsMap = {};
    if (transcriptCuePoints.length) {
      if (this.player.isLive()) {
        const latestTranscriptCuePoint = transcriptCuePoints[transcriptCuePoints.length - 1];
        this._activeCuePointsMap[latestTranscriptCuePoint.id] = true;
        this._updateTranscriptPanel();
      } else {
        const latestTranscriptCuePoint = transcriptCuePoints[transcriptCuePoints.length - 1];
        // define transcript item group
        const relevantTranscriptItem = this._data.find(item => item.id === latestTranscriptCuePoint.id);
        if (relevantTranscriptItem) {
          this._highlightedGroup = this._data.filter(item => {
            return item.displayTime === relevantTranscriptItem.displayTime;
          });
          if (this._highlightedGroup.length) {
            this._highlightedGroup.forEach(item => {
              this._activeCuePointsMap[item.id] = true;
            });
            this._updateTranscriptPanel();
          }
        }
      }
    }
  };

  private _registerCuePointTypes = () => {
    const cuePointTypes: Array<string> = [];

    if (this._itemsFilter[ItemTypes.Caption]) {
      cuePointTypes.push(this.cuePointManager.CuepointType.CAPTION);
    }
    this.cuePointManager.registerTypes(cuePointTypes);
  };

  private _addCaptionData = (newData: ItemData[]) => {
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

  private _getCuePointType = (cue: CuePoint): ItemTypes | null => {
    const {metadata} = cue;
    const {KalturaCuePointType} = this.cuePointManager;
    if (metadata?.cuePointType === KalturaCuePointType.CAPTION) {
      return ItemTypes.Caption;
    }
    return null;
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
          dropdownAriaLabel={`Download or print ${this._captionsList.length > 1 ? 'current ' : ''}transcript`}
          printButtonAriaLabel={`Print ${this._captionsList.length > 1 ? 'current ' : ''}transcript`}
          downloadButtonAriaLabel={`Download ${this._captionsList.length > 1 ? 'current ' : ''}transcript`}
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
    const isLive = this.player.isLive();
    const {expandMode, position, expandOnFirstPlay} = this.config;
    const pluginMode: PluginPositions = [SidePanelPositions.RIGHT, SidePanelPositions.LEFT].includes(position)
      ? PluginPositions.VERTICAL
      : PluginPositions.HORIZONTAL;
    const {showTime, scrollOffset, searchDebounceTimeout, searchNextPrevDebounceTimeout} = this.config;
    this._transcriptPanel = this.sidePanelsManager.addItem({
      label: 'Transcript',
      panelComponent: () => {
        let props = {} as any;
        return (
          <Transcript
            {...props}
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
            isLive={isLive}
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
    if (this._captions) {
      const entryMetadata = get(config, 'sources.metadata', {});
      downloadContent(makePlainText(this._captions), `${this._transcriptLanguage}${entryMetadata.name ? `-${entryMetadata.name}` : ''}.txt`);
    }
  };

  private _handlePrint = () => {
    if (this._captions) {
      printContent(makePlainText(this._captions));
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

    this._captionsList = [];
    this._captionMap = new Map();
    this._activeCaptionMapId = '';
    this._captions = [];
    this._isLoading = false;
    this._hasError = false;
    this._transcriptLanguage = 'default';
  }

  destroy(): void {
    if (this._removePopoverIcon) {
      this._removePopoverIcon();
      this._removePopoverIcon = null;
    }
    this._pluginState = null;
  }
}
