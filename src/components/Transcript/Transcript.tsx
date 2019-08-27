import { h, Component } from "preact";
import * as styles from "./Transcript.scss";
import { ContribLogger, CuepointEngine } from "@playkit-js-contrib/common";
import { Spinner } from "../spinner";
import { CaptionItem } from "../../utils"
import { Hotspot } from "../Hotspot"

export interface KitchenSinkProps {
    seek(time: number): void;
    onClose: () => void;
    onRetryLoad: () => void;
    onDownload: () => void;
    isLoading: boolean;
    hasError: boolean;
    captions: CaptionItem[];
    currentTime: number;
}

interface KitchenSinkState {
    highlightedMap: Record<number, boolean>
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
        this._createEngine();
    }

    // componentDidUpdate(
    //     previousProps: Readonly<KitchenSinkProps>,
    // ): void {
    //     const { captions } = this.props;
    //     if (previousProps.captions !== captions) {
    //         this._createEngine();
    //     }

    //     if (previousProps.currentTime !== this.props.currentTime) {
    //         this.log(logger => {
    //             logger.debug("current time updated", {
    //                 method: "componentDidUpdate"
    //             });
    //         });
    //         this._syncVisibleTranscript();
    //     }
    // }

    // we can use getDerivedStateFromProps in case when we keep "engine"
    // outside of class
    componentWillReceiveProps(nextProps: Readonly<KitchenSinkProps>,) {
        const { captions } = this.props;
        if (nextProps.captions !== captions) {
            this._createEngine();
        }

        if (nextProps.currentTime !== this.props.currentTime) {
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
        this._reset();
    }

    shouldComponentUpdate(
        nextProps: Readonly<KitchenSinkProps>,
        nextState: Readonly<KitchenSinkState>,
    ) {
        if (
            nextState.highlightedMap !== this.state.highlightedMap ||
            nextProps.isLoading !== this.props.isLoading ||
            nextProps.hasError !== this.props.hasError
        ) {
            return true
        }
        return false
    }

    private _engine: CuepointEngine<CaptionItem> | null = null;
    state: KitchenSinkState = {
        highlightedMap: {},
    };

    private _createEngine = () => {
        const {
            captions
        } = this.props;
        if (!captions || captions.length === 0) {
            this._engine = null;
            return;
        }
        this._engine = new CuepointEngine<CaptionItem>(captions);
        this._syncVisibleTranscript();
    }

    private _syncVisibleTranscript = (forceSnapshot = false) => {
        const { currentTime } = this.props;
        this.setState((state: KitchenSinkState) => {
            if (!this._engine) {
                return {
                    captions: []
                };
            }

            const transcriptUpdate = this._engine.updateTime(currentTime, forceSnapshot);
            if (transcriptUpdate.snapshot) {
                const highlightedMap = transcriptUpdate.snapshot.reduce((acc, item) => {
                    return { ...acc, [item.id]: true}
                }, {})
                return {
                    highlightedMap,
                };
            }

            if (!transcriptUpdate.delta) {
                return state
            }

            const { show, hide } = transcriptUpdate.delta;

            if (show.length > 0 || hide.length > 0) {
                const newHighlightedMap = { ...state.highlightedMap }
                show.forEach((caption: CaptionItem) => {
                    newHighlightedMap[caption.id] = true;
                });

                hide.forEach((caption: CaptionItem) => {
                    newHighlightedMap[caption.id] = false;
                });

                return {
                    highlightedMap: newHighlightedMap,
                };
            }
        });
    }

    private _reset = () => {
        this._engine = null;
    };

    private _renderTranscript = () => {
        const { captions, seek, hasError, onRetryLoad } = this.props;
        const { highlightedMap } = this.state;

        if (!captions) {
            return null;
        }

        if (hasError) {
            return (
                <div className={styles.errorWrapper}>
                    <p>Failed to get transcript, please try again</p>
                    <button
                        className={styles.retryButton}
                        onClick={onRetryLoad}
                    >Retry</button>
                </div>
            )
        }
        return captions.map(hotspotData => (
            <Hotspot
                key={hotspotData.id}
                seekTo={seek}
                hotspot={hotspotData}
                highlighted={highlightedMap[hotspotData.id]}
            />
        ));
    };

    render(props: KitchenSinkProps) {
        const {
            onClose,
            onDownload,
            isLoading,
        } = props;
        return (
            <div
                className={styles.root}
            >
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
                        : 
                        (
                            <div className={styles.transcriptWrapper}>
                                {this._renderTranscript()}
                            </div>
                        )
                    }
                </div>
            </div>
        );
    }
}
