import { h, Ref, ComponentChild } from "preact";
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
    OverlayItem,
    OverlayItemProps,
    OverlayUIModes,
    UIManager,
    PresetNames,
    KitchenSinkPositions,
    KitchenSinkExpandModes
} from "@playkit-js-contrib/ui";
import Stage, { StageProps } from "./shared/components/Stage";
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
import { getContribLogger } from "@playkit-js-contrib/common";

import { RawHotspotCuepoint } from "./shared/hotspot";
// import { convertToTranscript } from "./shared/cuepoints";
import { MenuIcon } from "./components/menu-icon";
import { Transcript } from "./components/Transcript";

import { getCaptionsByFormat } from "./utils";

const isDev = true; // TODO - should be provided by Omri Katz as part of the cli implementation
const pluginName = `transcript${isDev ? "-local" : ""}`;

const logger = getContribLogger({
    class: "TranscriptPlugin",
    module: "transcript-plugin"
});

export class TranscriptPlugin extends PlayerContribPlugin
    implements OnMediaUnload, OnRegisterUI, OnMediaLoad, OnPluginSetup {
    static defaultConfig = {};

    private _overlay: OverlayItem | null = null;
    private _captionsList: RawHotspotCuepoint[] = [];
    private _kalturaClient = new KalturaClient();

    onPluginSetup(config: ContribConfig): void {
        this._kalturaClient.setOptions({
            clientTag: "playkit-js-transcript",
            endpointUrl: config.server.serviceUrl
        });

        this._kalturaClient.setDefaultRequestOptions({
            ks: config.server.ks
        });

        console.log(KalturaPlayer.ui.EventType.USER_SELECTED_CAPTION_TRACK)

        this.eventManager.listen(this.player, this.player.Event.TIME_UPDATE, (e: any) => {
            // console.log(e)
            // if (!this._componentRef) {
            //     return;
            // }
            // this._componentRef.update();
        });

        this.eventManager.listen(this.player, KalturaPlayer.ui.EventType.USER_SELECTED_CAPTION_TRACK, (e: any) => {
          console.log(e)
        });

        // events add here
        // + unregister events
    }

    onRegisterUI(uiManager: UIManager): void {
        uiManager.kitchenSink.add({
            label: "Transcript",
            renderIcon: () => <MenuIcon />,
            position: KitchenSinkPositions.Bottom,
            expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
            renderContent: this._renderKitchenSinkContent
        });

        this._overlay = uiManager.overlay.add({
            label: "Transcript",
            mode: OverlayUIModes.FirstPlay,
            renderContent: this._renderRoot
        });
    }

    onMediaLoad(config: OnMediaLoadConfig): void {
        // this._loadCuePoints(config.entryId);
        this._getCaptionsList(config.entryId)
    }

    onMediaUnload(): void {
        this._overlay = null;
        this._captionsList = [];
    }

    // private _loadCuePoints = (entryId: string): void => {
    //     this._kalturaClient
    //         .request(
    //             new CuePointListAction({
    //                 filter: new KalturaCuePointFilter({
    //                     entryIdEqual: entryId,
    //                     cuePointTypeEqual: KalturaCuePointType.annotation,
    //                     tagsLike: "transcript"
    //                 })
    //             }).setRequestOptions({
    //                 acceptedTypes: [KalturaAnnotation]
    //             })
    //         )
    //         .then(
    //             response => {
    //                 if (!response) {
    //                     return;
    //                 }

    //                 this._transcript = convertToTranscript(response);
    //                 console.log('this._transcript', response)
    //                 if (this._overlay) {
    //                     // TODO
    //                     //this._overlay.update();
    //                 }
    //             },
    //             reason => {
    //                 console.warn("failed to load transcript", reason);
    //             }
    //         );
    // };

    private _getCaptionsList = (entryId: string): void => {
        // const { setError } = this.props;
        const filter: KalturaCaptionAssetFilter = new KalturaCaptionAssetFilter();
        filter.entryIdEqual = entryId;
        const request = new CaptionAssetListAction({ filter: filter });
        // logger.info("start fetching caption list", {
        //     method: "_getCaptionsList",
        //     data: {
        //         entryId,
        //     }
        // });
        this._kalturaClient.request(request).then(
          data => {
            if (data && data.objects) {
              this._captionsList = data.objects;
                if (this._captionsList && this._captionsList.length > 0) {
                  const captionAsset: KalturaCaptionAsset | undefined = this._findCaptionAsset();
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

    private _findCaptionAsset = () => {
      const captionAsset: KalturaCaptionAsset = this._captionsList.find((ca: KalturaCaptionAsset) => {
        return ca.languageCode === this.player.config.playback.textLanguage
      })
      return captionAsset;
    }

    private _getCaptionsById = (item: KalturaCaptionAsset): void => {
        const request = new CaptionAssetGetUrlAction({ id: item.id });
        this._kalturaClient.request(request).then(
          data => {
            if (data) {
              // the data is in fact the URL of the file. Now we need to fetch it
              this._loadCaptionsAsset(data);
            }
          },
          err => {
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
              // console.log(data);
            this._parseCaptions(data);
          })
          .catch(function(err: Error) {
            logger.error("Failed to fetch caption asset", {
              method: "_loadCaptionsAsset",
              data: {
                  err
              }
            });
          });
    }

    private _parseCaptions = (data: string) => {
      const captionFormat = this._getCaptionFormat();
      const parsedData = getCaptionsByFormat(data, captionFormat);
      console.log(parsedData)
    }

    private _getCaptionFormat = () => {
      const captionAsset: KalturaCaptionAsset = this._findCaptionAsset();
      const selectedLanguage = 
          this._captionsList &&
          this._captionsList.find((item: KalturaCaptionAsset) => item.id === captionAsset.id);
      return selectedLanguage && selectedLanguage.format;
    }


 
    private _pauseVideo() {
        this.player.pause();
    }

    private _seekTo(time: number) {
        this.player.currentTime = time;
    }

    private _renderRoot = (overlayUIProps: OverlayItemProps): ComponentChild => {
        const props: StageProps = {
            ...overlayUIProps,
            transcript: this._transcript,
            pauseVideo: this._pauseVideo.bind(this),
            seekTo: this._seekTo.bind(this),
            sendAnalytics: this._sendAnalytics.bind(this)
        };

        // NOTE: the key attribute here is
        return null;
    };

    private _renderKitchenSinkContent(props: KitchenSinkContentRendererProps) {
        return <Transcript {...props} />;
    }
}

KalturaPlayer.core.registerPlugin(pluginName, TranscriptPlugin);
