import { h } from "preact";
import {
    KalturaClient,
    KalturaClientException,
    KalturaAPIException
} from "kaltura-typescript-client";
import {
    ContribPluginConfigs,
    ContribPluginData,
    ContribPluginManager,
    ContribServices,
    OnMediaLoad,
    OnMediaUnload,
    OnPluginSetup,
    OnRegisterUI
} from "@playkit-js-contrib/plugin";
import {
    KitchenSinkContentRendererProps,
    UIManager,
    KitchenSinkItem,
    KitchenSinkPositions,
    KitchenSinkExpandModes
} from "@playkit-js-contrib/ui";
import { KalturaCaptionAssetFilter } from "kaltura-typescript-client/api/types/KalturaCaptionAssetFilter";
import { CaptionAssetListAction } from "kaltura-typescript-client/api/types/CaptionAssetListAction";
import { KalturaCaptionAsset } from "kaltura-typescript-client/api/types/KalturaCaptionAsset";
import { CaptionAssetGetUrlAction } from "kaltura-typescript-client/api/types/CaptionAssetGetUrlAction";
import { getContribLogger } from "@playkit-js-contrib/common";

import { Transcript } from "./components/transcript";

import { getCaptionsByFormat, CaptionItem, getConfigValue } from "./utils";

import * as styles from "./plugin.scss";

const logger = getContribLogger({
    class: "TranscriptPlugin",
    module: "transcript-plugin"
});

interface TranscriptPluginConfig {
    showTime: boolean;
    position: KitchenSinkPositions;
    scrollOffset: number; // distance between top border of transcript container and active caption on auto-scroll
    scrollDebounceTimeout: number; // debounce on scroll
    searchDebounceTimeout: number; // debounce on search
    searchNextPrevDebounceTimeout: number; // debounce on jump between prev/next search result
}

export class TranscriptPlugin implements OnMediaUnload, OnRegisterUI, OnMediaLoad, OnPluginSetup {
    private _kitchenSinkItem: KitchenSinkItem | null = null;
    private _isLoading = false;
    private _hasError = false;
    private _entryId = "";
    private _captionsList: KalturaCaptionAsset[] = []; // list of captions
    private _captions: CaptionItem[] = []; // parsed captions
    private _kalturaClient = new KalturaClient();
    private _captionsRaw: null | string = null;

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

    onRegisterUI(uiManager: UIManager): void {
        const { pluginConfig } = this._configs;
        this._kitchenSinkItem = uiManager.kitchenSink.add({
            label: "Transcript",
            renderIcon: () => <div className={styles.pluginIcon} />,
            position: getConfigValue(
                pluginConfig.position,
                position =>
                    typeof position === "string" &&
                    (position === KitchenSinkPositions.Bottom ||
                        position === KitchenSinkPositions.Right),
                KitchenSinkPositions.Bottom
            ),
            expandMode: KitchenSinkExpandModes.AlongSideTheVideo,
            renderContent: this._renderKitchenSinkContent
        });
    }

    onMediaLoad(): void {
        const { playerConfig } = this._configs;

        this._entryId = playerConfig.sources.id;
        this._loadCaptions();
    }

    onMediaUnload(): void {
        this._captionsList = [];
        this._captionsRaw = null;
        this._captions = [];
        this._isLoading = false;
        this._hasError = false;
        this._entryId = "";
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
        if (this._captionsList.length > 0) {
            this._getCaptionsByLang(
                e
                    ? e.payload.selectedTextTrack._language
                    : this._configs.playerConfig.playback.textLanguage
            );
        } else {
            this._getCaptionsList();
        }
    };

    private _getCaptionsList = (): void => {
        const filter: KalturaCaptionAssetFilter = new KalturaCaptionAssetFilter();
        filter.entryIdEqual = this._entryId;
        const request = new CaptionAssetListAction({ filter: filter });
        this._initLoading();
        this._kalturaClient.request(request).then(
            data => {
                if (
                    data &&
                    data.objects &&
                    Array.isArray(data.objects) &&
                    data.objects.length > 0
                ) {
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
        if (lang === "off") {
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
                const request = new CaptionAssetGetUrlAction({ id: captionAsset.id });
                this._initLoading();
                this._kalturaClient.request(request).then(
                    data => {
                        if (data) {
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
                this._captionsRaw = data; // keep it for downloading
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
        if (!this._captionsRaw) {
            return;
        }
        const link = document.createElement("a");
        link.setAttribute(
            "href",
            "data:text/plain;charset=utf-8," + encodeURIComponent(this._captionsRaw)
        );
        link.setAttribute("download", "transcript.txt");
        link.click();
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
                showTime={getConfigValue(showTime, showTime => typeof showTime === "boolean", true)}
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
    "transcript",
    (data: ContribPluginData<TranscriptPluginConfig>) => {
        return new TranscriptPlugin(data.contribServices, data.configs, data.player);
    },
    {
        defaultConfig: {
            showTime: true,
            position: KitchenSinkPositions.Bottom,
            scrollOffset: 0,
            scrollDebounceTimeout: 200,
            searchDebounceTimeout: 250,
            searchNextPrevDebounceTimeout: 100
        }
    }
);
