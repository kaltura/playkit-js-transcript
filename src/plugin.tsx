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
    CuePointListAction,
    KalturaAnnotation,
    KalturaCuePointFilter,
    KalturaCuePointType,
    KalturaCaptionAssetFilter,
    CaptionAssetListAction,
    KalturaCaptionAsset,
    CaptionAssetGetUrlAction
} from "kaltura-typescript-client/api/types";
import { getContribLogger } from "@playkit-js-contrib/common";

import { RawHotspotCuepoint } from "./shared/hotspot";
import { convertToTranscript } from "./shared/cuepoints";
import { MenuIcon } from "./components/menu-icon";
import { Transcript } from "./components/Transcript";

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
    private _transcript: RawHotspotCuepoint[] = [];
    private _kalturaClient = new KalturaClient();

    onPluginSetup(config: ContribConfig): void {
        this._kalturaClient.setOptions({
            clientTag: "playkit-js-transcript",
            endpointUrl: config.server.serviceUrl
        });

        this._kalturaClient.setDefaultRequestOptions({
            ks: config.server.ks
        });
    }

    onRegisterUI(uiManager: UIManager): void {
        uiManager.kitchenSink.add({
            label: "Transcript",
            renderIcon: () => <MenuIcon />,
            position: KitchenSinkPositions.Bottom,
            expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
            renderContent: this._renderKitchenSinkContent
        });

        // this._overlay = uiManager.overlay.add({
        //     label: "Transcript",
        //     mode: OverlayUIModes.FirstPlay,
        //     renderContent: this._renderRoot
        // });
    }

    onMediaLoad(config: OnMediaLoadConfig): void {
        this._loadCuePoints(config.entryId);
        this._getCaptionsList(config.entryId)
    }

    onMediaUnload(): void {
        this._overlay = null;
        this._transcript = [];
    }

    private _loadCuePoints = (entryId: string): void => {
        this._kalturaClient
            .request(
                new CuePointListAction({
                    filter: new KalturaCuePointFilter({
                        entryIdEqual: entryId,
                        cuePointTypeEqual: KalturaCuePointType.annotation,
                        tagsLike: "transcript"
                    })
                }).setRequestOptions({
                    acceptedTypes: [KalturaAnnotation]
                })
            )
            .then(
                response => {
                    if (!response) {
                        return;
                    }

                    this._transcript = convertToTranscript(response);
                    console.log('this._transcript', response)
                    if (this._overlay) {
                        // TODO
                        //this._overlay.update();
                    }
                },
                reason => {
                    console.warn("failed to load transcript", reason);
                }
            );
    };

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
            //   this.setState({ captionsList: data.objects });
            //   if (!this.state.selectedCaption) {
                // const captionsList = this.state.captionsList;
                const captionsList = data.objects;
                const targetAssetId =
                  captionsList &&
                //   this.props.assetId &&
                  false &&
                  captionsList.find((item: any) => item.id === this.props.assetId);
                if (targetAssetId) {
                //   this.captionAssetId = targetAssetId.id;
                  this._getCaptionsById(targetAssetId as KalturaCaptionAsset);
                } else {
                  if (captionsList && captionsList.length > 0) {
                    // this.captionAssetId = captionsList[0].id;
                    this._getCaptionsById(captionsList[0] as KalturaCaptionAsset);
                  } else {
                    // setError("Current video does not have captions");
                  }
                }
            //   }
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

    private _getCaptionsById = (item: KalturaCaptionAsset): void => {
        // const { setError } = this.props;
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
            // setError(getErrorMessage(err));
          }
        );
    }

    private _loadCaptionsAsset = (url: string) => {
        // const captionAssetId = this.captionAssetId;
        // const captionsList = this.state.captionsList;
        fetch(url)
          .then(function(response: any) {
            if (response.ok) {
              return response.text();
            }
            throw new Error("Error message.");
          })
          .then((data: string) => {
              console.log(data);
            // this.props.onCaptionsLoaded(data, captionAssetId, captionsList);
          })
          .catch(function(err: Error) {
            // console.log("failed to load ", url, getErrorMessage(err));
          });
      }

    private _pauseVideo() {
        this.player.pause();
    }

    private _seekTo(time: number) {
        this.player.currentTime = time;
    }

    // private _renderRoot = (overlayUIProps: OverlayItemProps): ComponentChild => {
    //     const props: StageProps = {
    //         ...overlayUIProps,
    //         transcript: this._transcript,
    //         pauseVideo: this._pauseVideo.bind(this),
    //         seekTo: this._seekTo.bind(this),
    //         sendAnalytics: this._sendAnalytics.bind(this)
    //     };

    //     // NOTE: the key attribute here is
    //     return (
    //         <LoggerProvider context={"Transcript"} kalturaPlayer={this.player}>
    //             <Stage {...props} />
    //         </LoggerProvider>
    //     );
    // };

    private _renderKitchenSinkContent(props: KitchenSinkContentRendererProps) {
        return <Transcript {...props} />;
    }
}

KalturaPlayer.core.registerPlugin(pluginName, TranscriptPlugin);
