import { h } from "preact";
import {
  ObjectUtils
} from "./utils";
import {
  KalturaClient,
  KalturaClientException,
  KalturaAPIException
} from "kaltura-typescript-client";
import {ui} from 'kaltura-player-js';
const {SidePanelModes, SidePanelPositions, ReservedPresetNames, ReservedPresetAreas} = ui;

import { KalturaCaptionAssetFilter } from "kaltura-typescript-client/api/types/KalturaCaptionAssetFilter";
import { CaptionAssetListAction } from "kaltura-typescript-client/api/types/CaptionAssetListAction";
import { KalturaCaptionAsset } from "kaltura-typescript-client/api/types/KalturaCaptionAsset";
import {PluginButton} from './components/plugin-button/plugin-button';
import { Transcript } from "./components/transcript";
import {
  getCaptionsByFormat,
  CaptionItem,
  getConfigValue,
  isBoolean,
  makePlainText,
  CaptionAssetServeAction,
} from "./utils/utils";
import {
  TranscriptConfig,
  PluginPositions,
  PluginStates
} from './types';
import { DownloadPrintMenu, downloadContent, printContent } from "./components/download-print-menu";

const { get } = ObjectUtils;
const {Tooltip} = KalturaPlayer.ui.components;


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

  private _isLoading = false;
  private _hasError = false;
  private _entryId = "";
  private _captionsList: KalturaCaptionAsset[] = []; // list of captions
  private _captions: CaptionItem[] = []; // parsed captions
  private _kalturaClient = new KalturaClient();
  private _transcriptLanguage = "default";
  private _triggeredByKeyboard  = false;

  private _removePopoverIcon: null | Function = null;

  private _transcriptPanel = null;
  private _pluginState: PluginStates | null = null;


  constructor(name: string, player: KalturaPlayerTypes.Player, config: TranscriptConfig) {
    super(name, player, config);
    this.onPluginSetup();
  }

  get sidePanelsManager() {
    return this.player.getService('sidePanelsManager') as any;
  }

  onPluginSetup(): void {
    const { config } = this.player;
    this._kalturaClient.setOptions({
      clientTag: 'playkit-js-transcript',
      endpointUrl: this.player.config.provider.env.serviceUrl
    });

    this._kalturaClient.setDefaultRequestOptions({
        ks: config.provider.ks ? config.provider.ks : config.session.ks
    });
  
    this.player.addEventListener(this.player.Event.TIME_UPDATE, this._onTimeUpdate);
    this.player.addEventListener(this.player.Event.TEXT_TRACK_CHANGED, this._loadCaptions);
    this.player.addEventListener(this.player.Event.RESIZE, this._updateTranscriptPanel);
  }

  onRegisterUI(): void {}

  loadMedia(): void {
    const { config } = this.player;
    this._entryId = config.sources.id;
    this._getCaptionsList();
  }

  private onClose = () =>{
    if (this.sidePanelsManager.isItemActive(this._transcriptPanel)) {
      this._pluginState = PluginStates.CLOSED;
      this.sidePanelsManager.deactivateItem(this._transcriptPanel);
    } else {
      this.sidePanelsManager.activateItem(this._transcriptPanel);
    }
  }

  private _initTranscriptPanelItems(): void {
    if (!this._transcriptPanel && !this._removePopoverIcon) {
      this._addPopoverIcon();
      this._addTranscriptItem();
    }
  }

  private _addPopoverIcon(): void {
    const { downloadDisabled, printDisabled } = this.config;
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
          dropdownAriaLabel={`Download or print ${
              this._captionsList.length > 1 ? "current " : ""
              }transcript`}
          printButtonAriaLabel={`Print ${
              this._captionsList.length > 1 ? "current " : ""
              }transcript`}
          downloadButtonAriaLabel={`Download ${
              this._captionsList.length > 1 ? "current " : ""
              }transcript`}
        />)
    });
  }

  private _addTranscriptItem(): void {
    const buttonLabel = 'Transcript';
    const isLive = this.player.isLive();
    const { expandMode, position, expandOnFirstPlay } = this.config;
    const pluginMode: PluginPositions = [SidePanelPositions.RIGHT, SidePanelPositions.LEFT].includes(position)
      ? PluginPositions.VERTICAL
      : PluginPositions.HORIZONTAL;
    const {
      showTime,
      scrollOffset,
      searchDebounceTimeout,
      searchNextPrevDebounceTimeout
    } = this.config;


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
              searchNextPrevDebounceTimeout={getConfigValue(
                  searchNextPrevDebounceTimeout,
                  Number.isInteger,
                  100
              )}
              onSeek={this._seekTo}
              pluginMode={pluginMode}
              captions={this._captions}
              isLoading={this._isLoading}
              hasError={this._hasError}
              onRetryLoad={this._loadCaptions}
              currentTime={this.player.currentTime}
              videoDuration={this.player.duration}
              kitchenSinkActive={!!this.sidePanelsManager.isItemActive(this._transcriptPanel)}
              toggledWithEnter={this._triggeredByKeyboard}
              isLive={isLive}
              onClose={this.onClose}
          />
        );
      },
      iconComponent: () => {
        return (
          <Tooltip label={buttonLabel} type="bottom">
            <PluginButton
              onClick={this.onClose}
              label={buttonLabel}
            />
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

  private _onTimeUpdate = (): void => {
    this._updateTranscriptPanel();
  };

  private _updateTranscriptPanel() {
    if (this._transcriptPanel) {
      this.sidePanelsManager.update(this._transcriptPanel);
    }
  }

  private _initLoading() {
    if (!this._isLoading || this._hasError) {
      this._isLoading = true;
      this._hasError = false;
      this._updateTranscriptPanel();
    }
  }

  private _onError = (error?: Error, message?: string, method?: string) => {
    let msg: string = message || "Error message not defined";
    if (error instanceof KalturaClientException) {
      msg = `${msg} (network error etc)`;
    } else if (error instanceof KalturaAPIException) {
      msg = `${msg} (api exception)`;
    }

    this._isLoading = false;
    this._hasError = true;
    this._updateTranscriptPanel();
  };

  private _loadCaptions = (event?: {}): void => {
    if (!this._entryId) {
      return;
    }
    this._getCaptionsByLang(event);
  };

  private _getCaptionsList = (): void => {
    const filter: KalturaCaptionAssetFilter = new KalturaCaptionAssetFilter({ entryIdEqual: this._entryId});
    const request = new CaptionAssetListAction({ filter });
    this._initLoading();
    this._kalturaClient.request(request).then(
        data => {
          if (data && Array.isArray(data.objects) && data.objects.length > 0) {
            // cover both displayOnPlayer=true, as well as non-existence of the attribute
            this._captionsList = data.objects.filter(caption => caption.displayOnPlayer !== false)
            this._loadCaptions();
          } else {
            this._onError(undefined, "Data is empty", "_getCaptionsList");
          }
        },
        err => {
          this._onError(err, "Failed to fetch captions list", "_getCaptionsList");
        }
    );
  };

  private _filterCaptionAssetsByProperty = (
    list: KalturaCaptionAsset[],
    match: string | null,
    property: string
  ): KalturaCaptionAsset[] => {
    return list.filter((kalturaCaptionAsset: KalturaCaptionAsset) => {
      return get(kalturaCaptionAsset, property, null) === match;
    });
  }

  private _findCaptionAsset = (
      event: string | Record<string, any>
  ): KalturaCaptionAsset => {
    if (typeof event === 'string') {
      const filteredByLang = this._filterCaptionAssetsByProperty(this._captionsList, event, 'languageCode');
      // take first captions from caption-list when caption language is not defined
      return filteredByLang[0] ? filteredByLang[0] : this._captionsList[0];
    }
    const filteredByLang = this._filterCaptionAssetsByProperty(
      this._captionsList,
      get(event, 'payload.selectedTextTrack._language', null),
      'languageCode'
    );
    if (filteredByLang.length === 1) {
      return filteredByLang[0];
    }
    const filteredByLabel = this._filterCaptionAssetsByProperty(
      filteredByLang,
      get(event, 'payload.selectedTextTrack._label', null),
      'label'
    );
    if (filteredByLang.length === 1) {
      return filteredByLabel[0];
    }

    const index: number = get(event, 'payload.selectedTextTrack._id', -1);
    const filteredByIndex = this._captionsList[index];
    // take first captions from caption-list when caption language is not defined
    return filteredByIndex ? filteredByIndex : this._captionsList[0];
  };

  private _getCaptionsByLang = (
    event: string | Record<string, any> = get(this.player, 'config.playback.textLanguage', "")
  ): void => {
    if (
      (typeof event === "string" ?
        event :
        get(event, 'payload.selectedTextTrack._language', null)
      ) === "off" && this._captions.length
    ) {
      // prevent loading of captions when user select "off" captions option
      return;
    }
    if (this._captionsList && this._captionsList.length > 0) {
      const captionAsset: KalturaCaptionAsset = this._findCaptionAsset(event);
      if (captionAsset) {
        this._transcriptLanguage = captionAsset.language;
        this._initLoading();
        this._initTranscriptPanelItems();
        this._loadCaptionsAsset(captionAsset);
      } else {
        this._onError(
            undefined,
            "Current video doesn't have captions in selected language",
            "_getCaptionsByLang"
        );
      }
    } else {
      this._onError(undefined, "Current video doesn't have captions", "_getCaptionsByLang");
    }
  };

  private _loadCaptionsAsset = (captionAsset: KalturaCaptionAsset) => {

    // CaptionAssetServeAction should be imported from "kaltura-typescript-client/api/types/CaptionAssetServeAction"
    // replace CaptionAssetServeAction while client fixed (https://kaltura.atlassian.net/browse/FEV-470)
    const request = new CaptionAssetServeAction({ captionAssetId: captionAsset.id });

    this._kalturaClient.request(request).then(
      data => {
        this._getCaptionData(data, captionAsset);
      },
      err => {
        // remove getting captions from error while client fixed (https://kaltura.atlassian.net/browse/FEV-470)
        this._getCaptionData(err, captionAsset);
        // this._onError(err, "Failed to fetch caption asset", "_loadCaptionsAsset");
      }
    )
  };

  private _getCaptionData = (data: any, captionAsset: KalturaCaptionAsset) => {
    const rawCaptions = get(data, 'error.message', data);
    if (rawCaptions) {
      this._captions = this._parseCaptions(rawCaptions, captionAsset);
      this._isLoading = false;
      this._updateTranscriptPanel();
    } else {
      this._onError(undefined, "Captions data is empty", "_loadCaptionsAsset");
    }
  }

  private _parseCaptions = (data: string, captionAsset: KalturaCaptionAsset): CaptionItem[] => {
    try {
      const captionFormat = this._getCaptionFormat(captionAsset);
      if (data.toString().indexOf("Error: ") === 0) {
         // remove this condition once client fixed 
        data = data.toString().replace("Error: ", "");
      }
      return getCaptionsByFormat(data, captionFormat);
    } catch(err) {
// @ts-ignore
      this._onError(err, "Failed to parse the caption file", "_parseCaptions");
    }
    return [];
  };

  private _getCaptionFormat = (captionAsset: KalturaCaptionAsset): string => {
    const selectedLanguage: Record<string, any> =
        this._captionsList &&
        captionAsset &&  
        (this._captionsList.find((item: KalturaCaptionAsset) => item.id === captionAsset.id) || {});
    return get(selectedLanguage, 'format', '');
  };

  private _seekTo = (time: number) => {
    this.player.currentTime = time;
  };

  private _handleDownload = () => {
    const { config } = this.player;
    if (this._captions) {
      const entryMetadata = get(config, 'sources.metadata', {});
      downloadContent(
          makePlainText(this._captions),
          `${this._transcriptLanguage}${
              entryMetadata.name ? `-${entryMetadata.name}` : ""
              }.txt`
      );
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
    this._captions = [];
    this._isLoading = false;
    this._hasError = false;
    this._entryId = "";
    this._transcriptLanguage = "default";
  }

  destroy(): void {
    if (this._removePopoverIcon) {
      this._removePopoverIcon();
      this._removePopoverIcon = null;
    }
    this._pluginState = null;
  }

}
