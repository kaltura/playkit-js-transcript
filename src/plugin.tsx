import { 
  h
} from "preact";
import {
    KalturaClient,
    KalturaClientException,
    KalturaAPIException
} from "kaltura-typescript-client";
import {
    ContribConfig,
    OnMediaLoad,
    OnMediaLoadConfig,
    OnMediaUnload,
    OnPluginSetup,
    OnRegisterUI,
    PlayerContribPlugin
} from "@playkit-js-contrib/plugin";
import {
    KitchenSinkContentRendererProps,
    UIManager,
    KitchenSinkItem,
    KitchenSinkPositions,
    KitchenSinkExpandModes
} from "@playkit-js-contrib/ui";
import {
    KalturaCaptionAssetFilter,
    CaptionAssetListAction,
    KalturaCaptionAsset,
    CaptionAssetGetUrlAction
} from "kaltura-typescript-client/api/types";
import {
  getContribLogger,
  CuepointEngine
} from "@playkit-js-contrib/common";

import { MenuIcon } from "./components/menu-icon";
import { Transcript } from "./components/Transcript";

import {
  getCaptionsByFormat,
  CaptionItem,
  getPluginPosition
} from "./utils";

const isDev = true; // TODO - should be provided by Omri Katz as part of the cli implementation
const pluginName = `transcript${isDev ? "-local" : ""}`;

const logger = getContribLogger({
    class: "TranscriptPlugin",
    module: "transcript-plugin"
});

import { DownloadPrintMenu } from "./components/download-print-menu";

export class TranscriptPlugin extends PlayerContribPlugin
    implements OnMediaUnload, OnRegisterUI, OnMediaLoad, OnPluginSetup {
    static defaultConfig = {
      showTime: true,
      position: KitchenSinkPositions.Bottom
    };

    private _kitchenSinkItem: KitchenSinkItem | null = null;
    private _isLoading = false;
    private _hasError = false;
    private _entryId = '';
    private _captionsList: KalturaCaptionAsset[] = [];  // list of captions
    private _captions: CaptionItem[] = []; // parsed captions
    private _kalturaClient = new KalturaClient();
    private _captionsRaw: null | string = null;
    private _engine: CuepointEngine<CaptionItem> | null = null;
    private _highlightedMap: Record<number, true> = {};

    onPluginSetup(config: ContribConfig): void {
        this._kalturaClient.setOptions({
            clientTag: "playkit-js-transcript",
            endpointUrl: config.server.serviceUrl
        });

        this._kalturaClient.setDefaultRequestOptions({
            ks: config.server.ks
        });

        this.eventManager.listen(this.player, this.player.Event.TIME_UPDATE, this._onTimeUpdate);
        this.eventManager.listen(this.player, this.player.Event.TEXT_TRACK_CHANGED, this._loadCaptions);
    }

    onRegisterUI(uiManager: UIManager): void {
      uiManager.upperBar.add({
        label: "test",
        onClick: () => {},
        renderItem: () => <DownloadPrintMenu onDownload={this._handleDownload} />,
      });
      this._kitchenSinkItem = uiManager.kitchenSink.add({
        label: "Transcript",
        renderIcon: () => <MenuIcon />,
        position: getPluginPosition(this.config.position),
        expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
        renderContent: this._renderKitchenSinkContent
      });
    }

    onMediaLoad(config: OnMediaLoadConfig): void {
        // Kaltura analytics
        const kava = this.player.plugins.kava;
        const viewModel = kava.getEventModel(kava.EventType.VIEW);
        kava.sendAnalytics(viewModel);
        this._entryId = config.entryId;
        this._loadCaptions();
    }

    onMediaUnload(): void {
        this._captionsList = [];
        this._captionsRaw = null;
        this._captions = [];
        this._isLoading = false;
        this._hasError = false;
        this._entryId = '';
        this.player.removeEventListener(this.player.Event.TIME_UPDATE, this._onTimeUpdate)
        this.player.removeEventListener(this.player.Event.TEXT_TRACK_CHANGED, this._loadCaptions)
    }

    private _createEngine = (captions: CaptionItem[] ) => {
      if (!captions || captions.length === 0) {
          this._engine = null;
          return;
      }
      this._engine = new CuepointEngine<CaptionItem>(captions);
      this._syncVisibleTranscript(this.player.currentTime);
    };

    private _syncVisibleTranscript = (currentTime: number, forceSnapshot = false) => {
      if (!this._engine) {
            this._highlightedMap = {};
            return;
      };

    const transcriptUpdate = this._engine.updateTime(currentTime, forceSnapshot);
    if (transcriptUpdate.snapshot) {
        const highlightedMap = transcriptUpdate.snapshot.reduce((acc, item) => {
            return { ...acc, [item.id]: true };
        }, {});
        this._highlightedMap = highlightedMap;
        return
    }

    if (!transcriptUpdate.delta) {
        return;
    }

    const { show, hide } = transcriptUpdate.delta;
    if (show.length > 0 || hide.length > 0) {
        const newHighlightedMap = { ...this._highlightedMap };
        show.forEach((caption: CaptionItem) => {
            newHighlightedMap[caption.id] = true;
        });

        hide.forEach((caption: CaptionItem) => {
            delete newHighlightedMap[caption.id];
        });
        this._highlightedMap = newHighlightedMap;
      }
    };

    private _onTimeUpdate = (): void => {
      this._syncVisibleTranscript(this.player.currentTime);
      this._updateKitchenSink();
    }

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

    private _onError = (
      error?: Error,
      message?: string,
      method?: string
    ) => {
      let msg: string = message || 'Error message not defined';
      if (error instanceof KalturaClientException) {
        msg = `${msg} (network error etc)`
      } else if (error instanceof KalturaAPIException) {
        msg = `${msg} (api exception)`
      }
      logger.error(msg, {
        method: method || 'Method not defined',
        data: {
          error
        }
      });
      this._isLoading = false;
      this._hasError = true;
      this._updateKitchenSink();
    }

    private _loadCaptions = (e?: any): void => {
      if (this._captionsList && this._captionsList.length > 0) {
        this._getCaptionsById(e ? e.payload.selectedTextTrack._language : this.player.config.playback.textLanguage);
      } else {
        this._getCaptionsList();
      }
    }

    private _getCaptionsList = (): void => {
        const filter: KalturaCaptionAssetFilter = new KalturaCaptionAssetFilter();
        filter.entryIdEqual = this._entryId;
        const request = new CaptionAssetListAction({ filter: filter });
        this._initLoading();
        this._kalturaClient.request(request).then(
          data => {
            if (data && data.objects) {
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
    }

    private _findCaptionAsset = (lang: string = this.player.config.playback.textLanguage): KalturaCaptionAsset | undefined => {
      if (lang === "off") {
        return this._captionsList[0];
      }
      return this._captionsList.find((ca: KalturaCaptionAsset) => {
        return ca.languageCode === lang
      })
    }

    private _getCaptionsById = (lang?: string): void => {
      if (this._captionsList && this._captionsList.length > 0) {
        const captionAsset: KalturaCaptionAsset | undefined = this._findCaptionAsset(lang);
        if (captionAsset) {
          const request = new CaptionAssetGetUrlAction({ id: captionAsset.id });
          this._initLoading();
          this._kalturaClient.request(request).then(
            data => {
              if (data) {
                // the data is in fact the URL of the file. Now we need to fetch it
                this._loadCaptionsAsset(data);
              } else {
                this._onError(undefined, "Data is empty", "_getCaptionsById");
              }
            },
            err => {
              this._onError(err, "Failed to fetch captions", "_getCaptionsById");
            }
          );
        } else {
          this._onError(undefined, "Current video doesn't have captions in selected language", "_getCaptionsById");
        }
      } else {
          this._onError(undefined, "Current video doesn't have captions", "_getCaptionsById");
      }
    }

    private _loadCaptionsAsset = (url: string) => {
        fetch(url)
          .then(function(response: any) {
            if (response.ok) {
              return response.text();
            }
            throw new Error("Error message.");
          })
          .then((data: string) => {
            this._captionsRaw = data; // keep it for downloading
            this._captions = this._parseCaptions(data);
            this._createEngine(this._captions);
            this._isLoading = false;
            this._updateKitchenSink();
          })
          .catch((err: Error) => {
            this._onError(err, "Failed to fetch caption asset", "_loadCaptionsAsset");
          });
    }

    private _parseCaptions = (data: string): CaptionItem[] => {
      const captionFormat = this._getCaptionFormat();
      return getCaptionsByFormat(data, captionFormat);
    }

    private _getCaptionFormat = (): string => {
      const captionAsset = this._findCaptionAsset();
      const selectedLanguage = 
          this._captionsList &&
          captionAsset &&
          this._captionsList.find((item: KalturaCaptionAsset) => item.id === captionAsset.id);
      return selectedLanguage && selectedLanguage.format || '';
    }

    private _seekTo = (time: number) => {
        this.player.currentTime = time;
    }

    private _handleDownload = () => {
      if (!this._captionsRaw) {
        return;
      }
      const captionsFormat = this._getCaptionFormat();
      let format = 'srt';
      if (captionsFormat === '2') {
        format = 'xml';
      }
      const link = document.createElement('a');
      link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this._captionsRaw));
      link.setAttribute('download', `transcript.${format}`);
      link.click();
    }

    private _renderKitchenSinkContent = (props: KitchenSinkContentRendererProps) => {
        return (
          <Transcript
            {...props}
            showTime={this.config.showTime}
            seek={this._seekTo}
            captions={this._captions}
            isLoading={this._isLoading}
            hasError={this._hasError}
            onRetryLoad={this._loadCaptions}
            highlightedMap={this._highlightedMap}
          />
        );
    }
}

KalturaPlayer.core.registerPlugin(pluginName, TranscriptPlugin);
