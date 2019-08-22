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
// import Stage, { StageProps } from "./shared/components/Stage";
import {
    // CuePointListAction,
    // KalturaAnnotation,
    // KalturaCuePointFilter,
    // KalturaCuePointType,
    KalturaCaptionAssetFilter,
    CaptionAssetListAction,
    KalturaCaptionAsset,
    CaptionAssetGetUrlAction
} from "kaltura-typescript-client/api/types";
import {
  getContribLogger
} from "@playkit-js-contrib/common";

// import { RawHotspotCuepoint } from "./shared/hotspot";
// import { convertToTranscript } from "./shared/cuepoints";
import { MenuIcon } from "./components/menu-icon";
import { Transcript } from "./components/Transcript";

import { getCaptionsByFormat, CaptionItem } from "./utils";

const isDev = true; // TODO - should be provided by Omri Katz as part of the cli implementation
const pluginName = `transcript${isDev ? "-local" : ""}`;

const logger = getContribLogger({
    class: "TranscriptPlugin",
    module: "transcript-plugin"
});

export class TranscriptPlugin extends PlayerContribPlugin
    implements OnMediaUnload, OnRegisterUI, OnMediaLoad, OnPluginSetup {
    static defaultConfig = {};

    private _kitchenSinkItem: KitchenSinkItem | null = null;
    private _isLoading = false;
    private _hasError = false;
    private _captionsList: KalturaCaptionAsset[] = [];  // list of captions
    private _captions: CaptionItem[] = []; // parsed captions
    private _kalturaClient = new KalturaClient();
    private _captionsRaw: null | string = null;

    onPluginSetup(config: ContribConfig): void {
        this._kalturaClient.setOptions({
            clientTag: "playkit-js-transcript",
            endpointUrl: config.server.serviceUrl
        });

        this._kalturaClient.setDefaultRequestOptions({
            ks: config.server.ks
        });

        this.eventManager.listen(this.player, this.player.Event.TIME_UPDATE, this._onTimeUpdate);
        this.eventManager.listen(this.player, KalturaPlayer.ui.EventType.USER_SELECTED_CAPTION_TRACK, (e: any) => {
        });
    }

    onRegisterUI(uiManager: UIManager): void {
      this._kitchenSinkItem = uiManager.kitchenSink.add({
        label: "Transcript",
        renderIcon: () => <MenuIcon />,
        position: KitchenSinkPositions.Bottom,
        expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
        renderContent: this._renderKitchenSinkContent
      });
    }

    onMediaLoad(config: OnMediaLoadConfig): void {
        // Kaltura analytics
        const kava = this.player.plugins.kava;
        const viewModel = kava.getEventModel(kava.EventType.VIEW);
        kava.sendAnalytics(viewModel);

        this._getCaptionsList(config.entryId)
    }

    onMediaUnload(): void {
        this._captionsList = [];
        this._captionsRaw = null;
        this._captions = [];
        this._isLoading = false;
        this._hasError = false;
        this.player.removeEventListener(this.player.Event.TIME_UPDATE, this._onTimeUpdate)
    }

    private _onTimeUpdate = (): void => {
      this._updateKitchenSink();
    }

    private _updateKitchenSink() {
      if (this._kitchenSinkItem) {
          this._kitchenSinkItem.update();
      }
    }

    private _onError = () => {
      this._isLoading = false;
      this._hasError = true;
      this._updateKitchenSink();
  }

    private _getCaptionsList = (entryId: string): void => {
        const filter: KalturaCaptionAssetFilter = new KalturaCaptionAssetFilter();
        filter.entryIdEqual = entryId;
        const request = new CaptionAssetListAction({ filter: filter });
        this._isLoading = true;
        this._updateKitchenSink();
        this._kalturaClient.request(request).then(
          data => {
            if (data && data.objects) {
              this._captionsList = data.objects;
                if (this._captionsList && this._captionsList.length > 0) {
                  const captionAsset = this._findCaptionAsset();
                  if (captionAsset) {
                    this._getCaptionsById(captionAsset);
                  }
                } else {
                    logger.error("Current video doesn't have captions", {
                      method: "_getCaptionsList",
                    });
                }
            }
          },
          err => {
            if (err instanceof KalturaClientException) {
              // network error etc
            } else if (err instanceof KalturaAPIException) {
              // api exception
            }
            logger.error("Failed to fetch captions list", {
                method: "_getCaptionsList",
                data: {
                    err
                }
            });
          }
        );
    }

    private _findCaptionAsset = (): KalturaCaptionAsset | undefined => {
      const captionAsset = this._captionsList.find((ca: KalturaCaptionAsset) => {
        return ca.languageCode === this.player.config.playback.textLanguage
      })
      return captionAsset;
    }

    private _getCaptionsById = (item: KalturaCaptionAsset): void => {
        if (!this._isLoading) {
          this._isLoading = true;
          this._updateKitchenSink();
        }
        const request = new CaptionAssetGetUrlAction({ id: item.id });
        this._kalturaClient.request(request).then(
          data => {
            if (data) {
              // the data is in fact the URL of the file. Now we need to fetch it
              this._loadCaptionsAsset(data);
            }
          },
          err => {
            this._onError();
            if (err instanceof KalturaClientException) {
              // network error etc
            } else if (err instanceof KalturaAPIException) {
              // api exception
            }
            logger.error("Failed to fetch captions", {
              method: "_getCaptionsById",
              data: {
                  err
              }
            });
          }
        );
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
            this._isLoading = false;
            this._updateKitchenSink();
          })
          .catch((err: Error) => {
            this._onError();
            logger.error("Failed to fetch caption asset", {
              method: "_loadCaptionsAsset",
              data: {
                  err
              }
            });
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
 
    // private _pauseVideo = () => {
    //     this.player.pause();
    // }

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
            seek={this._seekTo}
            captions={this._captions}
            isLoading={this._isLoading}
            onDownload={this._handleDownload}
            currentTime={this.player.currentTime}
          />
        );
    }
}

KalturaPlayer.core.registerPlugin(pluginName, TranscriptPlugin);
