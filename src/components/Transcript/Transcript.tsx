import { h, Component } from "preact";
import * as styles from "./Transcript.scss";
import { ContribLogger, CuepointEngine } from "@playkit-js-contrib/common";
import { Spinner } from "../spinner";
import { CaptionItem } from "../../utils"
import { Hotspot } from "../Hotspot"

export interface KitchenSinkProps {
    seek: any;
    onClose: () => void;
    onDownload: () => void;
    isLoading: boolean;
    captions: CaptionItem[];
    currentTime: number;
}

interface KitchenSinkState {
    visibleTranscript: CaptionItem[];
}

export class Transcript extends Component<KitchenSinkProps, KitchenSinkState> {
    log(cb: (logger: ContribLogger) => void): void {
        if (!this.context.logger) {
            return;
        }

        cb(this.context.logger);
    }

    componentDidMount(): void {
        this.log(logger => {
            logger.debug("Mount Transcript component", {
                class: "Transcript",
                method: "componentDidMount"
            });
        });
        this._reset();
        this._createEngine();
    }

    componentDidUpdate(
        previousProps: Readonly<KitchenSinkProps>,
        previousState: Readonly<KitchenSinkState>,
        previousContext: any
    ): void {
        // if (previousProps.transcript !== this.props.transcript) {
        //     this._createEngine();
        // }

        if (previousProps.currentTime !== this.props.currentTime) {
            this.log(logger => {
                logger.debug("current time updated", {
                    method: "componentDidUpdate"
                });
            });
            this._syncVisibleTranscript();
        }
    }

    componentWillUnmount(): void {
        this.log(logger => {
            logger.debug("Unmount Transcript component", {
                class: "Transcript",
                method: "componentWillUnmount"
            });
        });
    }

    engine: CuepointEngine<CaptionItem> | null = null;

    initialState = {
        visibleTranscript: []
    };

    state: KitchenSinkState = {
        ...this.initialState
    };

    private _createEngine() {
        const {
            captions,
            currentTime,
        } = this.props;

        if (!captions || captions.length === 0) {
            this.engine = null;
            return;
        }

        this.engine = new CuepointEngine<CaptionItem>(captions);
        this.engine.updateTime(currentTime);
    }

    private _syncVisibleTranscript(forceSnapshot = false) {
        const { currentTime } = this.props;

        this.setState((state: KitchenSinkState) => {
            if (!this.engine) {
                return {
                    visibleTranscript: []
                };
            }

            const transcriptUpdate = this.engine.updateTime(currentTime, forceSnapshot);
            if (transcriptUpdate.snapshot) {
                return {
                    visibleTranscript: transcriptUpdate.snapshot
                };
            }

            if (!transcriptUpdate.delta) {
                return {
                    visibleTranscript: []
                };
            }

            const { show, hide } = transcriptUpdate.delta;

            if (show.length > 0 || hide.length > 0) {
                let visibleTranscript: CaptionItem[] = state.visibleTranscript;
                show.forEach((hotspot: CaptionItem) => {
                    const index = visibleTranscript.indexOf(hotspot);
                    if (index === -1) {
                        visibleTranscript.push(hotspot);
                    }
                });

                hide.forEach((hotspot: CaptionItem) => {
                    const index = visibleTranscript.indexOf(hotspot);
                    if (index !== -1) {
                        visibleTranscript.splice(index, 1);
                    }
                });

                return {
                    visibleTranscript
                };
            }
        });
    }

    private _reset = () => {
        this.engine = null;

        this.setState({
            ...this.initialState
        });
    };

    private _renderTranscript = (visualHotspot: CaptionItem[]) => {
        if (!visualHotspot) {
            return null;
        }
        // const { seekTo, sendAnalytics } = this.props;
        return visualHotspot.map(hotspotData => (
            <Hotspot
                // seekTo={seekTo}
                key={hotspotData.id}
                visible={true}
                hotspot={hotspotData}
                // sendAnalytics={sendAnalytics}
            />
        ));
    };

    render(props: KitchenSinkProps) {
        const {
            onClose,
            onDownload,
            isLoading,
            captions,
            currentTime
        } = props;
        console.log('currentTime ----- >', currentTime)
        return (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.title}>Transcript</div>
                    <div className={styles.downloadButton} onClick={onDownload} />
                    <div className={styles.closeButton} onClick={onClose} />
                </div>
                <div className={styles.body}>
                    {isLoading
                        ? (
                            <div className={styles.loadingWrapper}>
                                <Spinner />
                            </div>
                        )
                        : this._renderTranscript(captions)
                    }
                </div>
            </div>
        );
    }
}
