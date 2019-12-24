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
import { getContribLogger } from "@playkit-js-contrib/common";
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
  printContent, UpperBarItem
} from "@playkit-js-contrib/ui";
import { KalturaCaptionAssetFilter } from "kaltura-typescript-client/api/types/KalturaCaptionAssetFilter";
import { CaptionAssetListAction } from "kaltura-typescript-client/api/types/CaptionAssetListAction";
import { KalturaCaptionAsset } from "kaltura-typescript-client/api/types/KalturaCaptionAsset";
import { CaptionAssetGetUrlAction } from "kaltura-typescript-client/api/types/CaptionAssetGetUrlAction";

import { Transcript } from "./components/transcript";
import {
  getCaptionsByFormat,
  CaptionItem,
  getConfigValue,
  isBoolean,
  makePlainText
} from "./utils";
import { DownloadPrintMenu } from "./components/download-print-menu";



const pluginName = `transcript`;

const logger = getContribLogger({
  class: "TranscriptPlugin",
  module: "transcript-plugin"
});


interface TranscriptPluginConfig {
  expandOnFirstPlay: boolean;
  showTime: boolean;
  position: KitchenSinkPositions;
  scrollOffset: number; // distance between top border of transcript container and active caption on auto-scroll
  scrollDebounceTimeout: number; // debounce on scroll
  searchDebounceTimeout: number; // debounce on search
  searchNextPrevDebounceTimeout: number; // debounce on jump between prev/next search result
  downloadDisabled: boolean; // disable download menu
  printDisabled: boolean; // disable print menu
}

export class TranscriptPlugin implements OnMediaLoad, OnMediaUnload, OnPluginSetup, OnMediaUnload {
  private _kitchenSinkItem: KitchenSinkItem | null = null;
  private _upperBarItem: UpperBarItem | null = null;
  private _isLoading = false;
  private _hasError = false;
  private _entryId = "";
  private _captionsList: KalturaCaptionAsset[] = []; // list of captions
  private _captions: CaptionItem[] = []; // parsed captions
  private _kalturaClient = new KalturaClient();
  private _transcriptLanguage = "default";

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
      ks: playerConfig.provider.ks
    });

    this._player.addEventListener(this._player.Event.TIME_UPDATE, this._onTimeUpdate);
    this._player.addEventListener(this._player.Event.TEXT_TRACK_CHANGED, this._loadCaptions);
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

  private _addKitchenSinkItem(): void {
    const { position, expandOnFirstPlay } = this._configs.pluginConfig;
    this._contribServices.upperBarManager.remove;
    this._kitchenSinkItem = this._contribServices.kitchenSinkManager.add({
      label: "Transcript",
      expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
      renderIcon: () => <div className={styles.pluginIcon} />,
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

  private _loadCaptions = (e?: any): void => {
    if (!this._entryId) {
      return;
    }
    this._getCaptionsByLang(
        e
            ? e.payload.selectedTextTrack._language
            : this._configs.playerConfig.playback.textLanguage
    );
  };

  private _getCaptionsList = (): void => {
    const filter: KalturaCaptionAssetFilter = new KalturaCaptionAssetFilter();
    filter.entryIdEqual = this._entryId;
    const request = new CaptionAssetListAction({ filter: filter });
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

  private _findCaptionAsset = (
      lang: string = this._configs.playerConfig.playback.textLanguage || ""
  ): KalturaCaptionAsset | null => {
    if (lang === "off" || lang === "") {
      return this._captionsList[0];
    }
    return (
        this._captionsList.find((ca: KalturaCaptionAsset) => {
          return ca.languageCode === lang;
        }) || null
    );
  };

  private _getCaptionsByLang = (lang?: string): void => {
    if (this._captionsList && this._captionsList.length > 0) {
      const captionAsset: KalturaCaptionAsset | null = this._findCaptionAsset(lang);
      if (captionAsset) {
        this._transcriptLanguage = captionAsset.language;
        const request = new CaptionAssetGetUrlAction({ id: captionAsset.id });
        this._initLoading();
        this._kalturaClient.request(request).then(
            data => {
              if (data) {
                this._initKitchensinkAndUpperBarItems();
                // the data is in fact the URL of the file. Now we need to fetch it
                this._loadCaptionsAsset(data, captionAsset);
              } else {
                this._onError(undefined, "Data is empty", "_getCaptionsByLang");
              }
            },
            err => {
              this._onError(err, "Failed to fetch captions", "_getCaptionsByLang");
            }
        );
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

  private _loadCaptionsAsset = (url: string, captionAsset: KalturaCaptionAsset) => {
    fetch(url)
        .then(function(response: any) {
          if (response.ok) {
            return response.text();
          }
          throw new Error("Error message.");
        })
        .then((data: string) => {
          this._captions = this._parseCaptions(data, captionAsset);
          this._isLoading = false;
          this._updateKitchenSink();
        })
        .catch((err: Error) => {
          this._onError(err, "Failed to fetch caption asset", "_loadCaptionsAsset");
        });
  };

  private _parseCaptions = (data: string, captionAsset: KalturaCaptionAsset): CaptionItem[] => {
    const captionFormat = this._getCaptionFormat(captionAsset);
    return getCaptionsByFormat(data, captionFormat);
  };

  private _getCaptionFormat = (captionAsset: KalturaCaptionAsset): string => {
    const selectedLanguage =
        this._captionsList &&
        captionAsset &&
        this._captionsList.find((item: KalturaCaptionAsset) => item.id === captionAsset.id);
    return (selectedLanguage && selectedLanguage.format) || "";
  };

  private _seekTo = (time: number) => {
    this._player.currentTime = time;
  };

  private _handleDownload = () => {
    const { playerConfig } = this._configs;
    if (this._captions) {
      const entryMetadata = playerConfig.sources.metadata || {};
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
      scrollDebounceTimeout,
      searchDebounceTimeout,
      searchNextPrevDebounceTimeout
    } = this._configs.pluginConfig;
    return (
        <Transcript
            {...props}
            showTime={getConfigValue(showTime, isBoolean, true)}
            scrollOffset={getConfigValue(scrollOffset, Number.isInteger, 0)}
            scrollDebounceTimeout={getConfigValue(scrollDebounceTimeout, Number.isInteger, 200)}
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
      scrollDebounceTimeout: 200,
      searchDebounceTimeout: 250,
      searchNextPrevDebounceTimeout: 100,
      downloadDisabled: false,
      printDisabled: false
    }
  }
);