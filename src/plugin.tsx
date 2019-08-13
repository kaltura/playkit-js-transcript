import { h, Ref, ComponentChild } from "preact";
import { KalturaClient } from "kaltura-typescript-client";
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
    LoggerProvider,
    PresetNames,
    KitchenSinkPositions,
    KitchenSinkExpandModes
} from "@playkit-js-contrib/ui";
import Stage, { StageProps } from "./shared/components/Stage";
import {
    CuePointListAction,
    KalturaAnnotation,
    KalturaCuePointFilter,
    KalturaCuePointType
} from "kaltura-typescript-client/api/types";
import { RawHotspotCuepoint } from "./shared/hotspot";
import { convertToTranscript } from "./shared/cuepoints";
import { MenuIcon } from "./components/menu-icon";
import { Transcript } from "./components/Transcript";

const isDev = true; // TODO - should be provided by Omri Katz as part of the cli implementation
const pluginName = `transcript${isDev ? "-local" : ""}`;

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

        this._overlay = uiManager.overlay.add({
            label: "Transcript",
            mode: OverlayUIModes.FirstPlay,
            renderContent: this._renderRoot
        });
    }

    onMediaLoad(config: OnMediaLoadConfig): void {
        this._loadCuePoints(config.entryId);
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
        return (
            <LoggerProvider context={"Transcript"} kalturaPlayer={this.player}>
                <Stage {...props} />
            </LoggerProvider>
        );
    };

    private _renderKitchenSinkContent(props: KitchenSinkContentRendererProps) {
        return <Transcript {...props} />;
    }
}

KalturaPlayer.core.registerPlugin(pluginName, TranscriptPlugin);
