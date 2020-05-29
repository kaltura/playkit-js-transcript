import { h } from "preact";
import {
  ContribPluginManager,
  OnMediaLoad,
  OnMediaUnload,
  OnPluginSetup,
  ContribServices,
  ContribPluginData,
  ContribPluginConfigs
} from "@playkit-js-contrib/plugin";
import {
  getContribLogger,
  ObjectUtils
} from "@playkit-js-contrib/common";
import * as styles from './transcript-plugin.scss';
import {
  KalturaClient,
  KalturaClientException,
  KalturaAPIException
} from "kaltura-typescript-client";

import {
  KitchenSinkContentRendererProps,
  KitchenSinkItem,
  KitchenSinkPositions,
  KitchenSinkExpandModes,
  downloadContent,
  printContent,
  UpperBarItem,
  KeyboardKeys
} from "@playkit-js-contrib/ui";
import { KalturaCaptionAssetFilter } from "kaltura-typescript-client/api/types/KalturaCaptionAssetFilter";
import { CaptionAssetListAction } from "kaltura-typescript-client/api/types/CaptionAssetListAction";
import { KalturaCaptionAsset } from "kaltura-typescript-client/api/types/KalturaCaptionAsset";

import { Transcript } from "./components/transcript";
import {
  getCaptionsByFormat,
  CaptionItem,
  getConfigValue,
  isBoolean,
  makePlainText,
  CaptionAssetServeAction,
} from "./utils";
import { DownloadPrintMenu } from "./components/download-print-menu";

const pluginName = `playkit-js-transcript`;

const logger = getContribLogger({
  class: "TranscriptPlugin",
  module: "transcript-plugin"
});

const { get } = ObjectUtils;

interface TranscriptPluginConfig {
  expandOnFirstPlay: boolean;
  showTime: boolean;
  position: KitchenSinkPositions;
  scrollOffset: number; // distance between top border of transcript container and active caption on auto-scroll
  searchDebounceTimeout: number; // debounce on search
  searchNextPrevDebounceTimeout: number; // debounce on jump between prev/next search result
  downloadDisabled: boolean; // disable download menu
  printDisabled: boolean; // disable print menu
}

export class TranscriptPlugin implements OnMediaLoad, OnPluginSetup, OnMediaUnload {
  private _kitchenSinkItem: KitchenSinkItem | null = null;
  private _upperBarItem: UpperBarItem | null = null;
  private _isLoading = false;
  private _hasError = false;
  private _entryId = "";
  private _captionsList: KalturaCaptionAsset[] = []; // list of captions
  private _captions: CaptionItem[] = []; // parsed captions
  private _kalturaClient = new KalturaClient();
  private _transcriptLanguage = "default";
  private _pluginOpenedWithKeyboard  = false;

  constructor(
      private _contribServices: ContribServices,
      private _configs: ContribPluginConfigs<TranscriptPluginConfig>,
      private _player: KalturaPlayerTypes.Player
  ) {}

  onPluginSetup(): void {
    const { playerConfig } = this._configs;

    this._kalturaClient.setOptions({
      clientTag: "playkit-js-transcript",
      endpointUrl: playerConfig.provider.env.serviceUrl
    });

    this._kalturaClient.setDefaultRequestOptions({
        ks: playerConfig.provider.ks ? playerConfig.provider.ks : playerConfig.session.ks
    });
  
    this._player.addEventListener(this._player.Event.TIME_UPDATE, this._onTimeUpdate);
    this._player.addEventListener(this._player.Event.TEXT_TRACK_CHANGED, this._loadCaptions);
    this._player.addEventListener(this._player.Event.RESIZE, this._updateKitchenSink);
  }

  onRegisterUI(): void {}

  onMediaLoad(): void {
    const { playerConfig } = this._configs;
    this._entryId = playerConfig.sources.id;
    this._getCaptionsList();
  }

  onMediaUnload(): void {
    this._reset();
  }

  private _reset(): void {
    if (this._kitchenSinkItem) {
      this._contribServices.kitchenSinkManager.remove(this._kitchenSinkItem);
      this._kitchenSinkItem = null;
    }
    if (this._upperBarItem) {
      this._contribServices.upperBarManager.remove(this._upperBarItem);
      this._upperBarItem = null;
    }
    this._captionsList = [];
    this._captions = [];
    this._isLoading = false;
    this._hasError = false;
    this._entryId = "";
    this._transcriptLanguage = "default";
  }

  private _initKitchensinkAndUpperBarItems(): void {
    if (!this._upperBarItem && !this._kitchenSinkItem) {
      this._addPopoverIcon();
      this._addKitchenSinkItem();
    }
  }

  private _addPopoverIcon(): void {
    const { downloadDisabled, printDisabled } = this._configs.pluginConfig;
    this._upperBarItem = this._contribServices.upperBarManager.add({
      label: "Download transcript",
      onClick: () => {},
      renderItem: () => (
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
          />
      )
    });
  }

  private _handleKeyPress = (event: KeyboardEvent) => {
    if (event.keyCode === KeyboardKeys.Enter) {
      this._pluginOpenedWithKeyboard = true;
    } else {
      this._pluginOpenedWithKeyboard = false;
    }
  }

  private _addKitchenSinkItem(): void {
    const { position, expandOnFirstPlay } = this._configs.pluginConfig;
    this._contribServices.upperBarManager.remove;
    this._kitchenSinkItem = this._contribServices.kitchenSinkManager.add({
      label: "Transcript",
      expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
      renderIcon: () => (
        <button
          className={styles.transcriptIcon}
          tabIndex={1}
          onKeyPress={this._handleKeyPress}
        />
      ),
      position: getConfigValue(
          position,
          position =>
              typeof position === "string" &&
              (position === KitchenSinkPositions.Bottom ||
                  position === KitchenSinkPositions.Right),
          KitchenSinkPositions.Bottom
      ),
      renderContent: this._renderKitchenSinkContent
    });

    if (expandOnFirstPlay) {
      this._kitchenSinkItem.activate();
    }
  }

  private _onTimeUpdate = (): void => {
    this._updateKitchenSink();
  };

  private _updateKitchenSink() {
    if (this._kitchenSinkItem) {
      this._kitchenSinkItem.update();
    }
  }

  private _initLoading() {
    if (!this._isLoading || this._hasError) {
      this._isLoading = true;
      this._hasError = false;
      this._updateKitchenSink();
    }
  }

  private _onError = (error?: Error, message?: string, method?: string) => {
    let msg: string = message || "Error message not defined";
    if (error instanceof KalturaClientException) {
      msg = `${msg} (network error etc)`;
    } else if (error instanceof KalturaAPIException) {
      msg = `${msg} (api exception)`;
    }
    logger.error(msg, {
      method: method || "Method not defined",
      data: {
        error
      }
    });
    this._isLoading = false;
    this._hasError = true;
    this._updateKitchenSink();
  };

  private _loadCaptions = (event?: {}): void => {
    if (!this._entryId) {
      return;
    }
    this._getCaptionsByLang(event);
  };

  private _getCaptionsList = (): void => {
    const filter: KalturaCaptionAssetFilter = new KalturaCaptionAssetFilter({ entryIdEqual: this._entryId });
    const request = new CaptionAssetListAction({ filter });
    this._initLoading();
    this._kalturaClient.request(request).then(
        data => {
          if (data && Array.isArray(data.objects) && data.objects.length > 0) {
            this._captionsList = data.objects;
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
    event: string | Record<string, any> = get(this._configs, 'playerConfig.playback.textLanguage', "")
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
        this._initKitchensinkAndUpperBarItems();
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
      this._updateKitchenSink();
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
    this._player.currentTime = time;
  };

  private _handleDownload = () => {
    const { playerConfig } = this._configs;
    if (this._captions) {
      const entryMetadata = get(playerConfig, 'sources.metadata', {});
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

  private _renderKitchenSinkContent = (props: KitchenSinkContentRendererProps) => {
    const {
      showTime,
      scrollOffset,
      searchDebounceTimeout,
      searchNextPrevDebounceTimeout
    } = this._configs.pluginConfig;
    const isKitchenSinkActive = this._kitchenSinkItem ? this._kitchenSinkItem.isActive() : false;
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
            captions={this._captions}
            isLoading={this._isLoading}
            hasError={this._hasError}
            onRetryLoad={this._loadCaptions}
            currentTime={this._player.currentTime}
            videoDuration={this._player.duration}
            kitchenSinkActive={isKitchenSinkActive}
            toggledWithEnter={this._pluginOpenedWithKeyboard}
        />
    );
  };
}

ContribPluginManager.registerPlugin(
  pluginName,
  (data: ContribPluginData<TranscriptPluginConfig>) => {
    return new TranscriptPlugin(data.contribServices, data.configs, data.player);
  },
  {
    defaultConfig: {
      expandOnFirstPlay: true,
      showTime: true,
      position: KitchenSinkPositions.Bottom,
      scrollOffset: 0,
      searchDebounceTimeout: 250,
      searchNextPrevDebounceTimeout: 100,
      downloadDisabled: false,
      printDisabled: false
    }
  }
);
