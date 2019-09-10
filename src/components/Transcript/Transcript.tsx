import { h, Component } from "preact";
import * as styles from "./Transcript.scss";
import { ContribLogger, CuepointEngine } from "@playkit-js-contrib/common";
import { Spinner } from "../spinner";
import { CaptionItem, debounce } from "../../utils";
import { Caption } from "../Caption";
import { Search } from "../Search";

export interface TranscriptProps {
    seek(time: number): void;
    onClose: () => void;
    onRetryLoad: () => void;
    onDownload: () => void;
    isLoading: boolean;
    hasError: boolean;
    captions: CaptionItem[];
    currentTime: number;
}

interface TranscriptState {
    highlightedMap: Record<number, boolean>;
    isAutoScrollEnabled: boolean;
    search: string;
}

const Constants = {
    SCROLL_OFFSET: 0,
    SCROLL_DEBOUNCE_TIMEOUT: 200,
    SEARCH_DEBOUNCE_TIMEOUT: 300
};

export class Transcript extends Component<TranscriptProps, TranscriptState> {
    private _engine: CuepointEngine<CaptionItem> | null = null;
    private _transcriptListRef: HTMLElement | null = null;
    private _preventScrollEvent: boolean = false;
    state: TranscriptState = {
        highlightedMap: {},
        isAutoScrollEnabled: true,
        search: ""
    };

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
    componentWillReceiveProps(nextProps: Readonly<TranscriptProps>) {
        const { captions } = this.props;
        if (nextProps.captions !== captions) {
            this.log(logger => {
                logger.debug("handle changes of caption list", {
                    method: "componentDidUpdate"
                });
            });
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
        nextProps: Readonly<TranscriptProps>,
        nextState: Readonly<TranscriptState>
    ) {
        if (
            nextState.highlightedMap !== this.state.highlightedMap ||
            nextState.isAutoScrollEnabled !== this.state.isAutoScrollEnabled ||
            nextState.search !== this.state.search ||
            nextProps.isLoading !== this.props.isLoading ||
            nextProps.hasError !== this.props.hasError
        ) {
            return true;
        }
        return false;
    }

    private _createEngine = () => {
        const { captions } = this.props;
        if (!captions || captions.length === 0) {
            this._engine = null;
            return;
        }
        this._engine = new CuepointEngine<CaptionItem>(captions);
        this._syncVisibleTranscript();
    };

    private _syncVisibleTranscript = (forceSnapshot = false) => {
        const { currentTime } = this.props;
        this.setState((state: TranscriptState) => {
            if (!this._engine) {
                return {
                    highlightedMap: {}
                };
            }

            const transcriptUpdate = this._engine.updateTime(currentTime, forceSnapshot);
            if (transcriptUpdate.snapshot) {
                const highlightedMap = transcriptUpdate.snapshot.reduce((acc, item) => {
                    return { ...acc, [item.id]: true };
                }, {});
                return {
                    highlightedMap
                };
            }

            if (!transcriptUpdate.delta) {
                return state;
            }

            const { show, hide } = transcriptUpdate.delta;

            if (show.length > 0 || hide.length > 0) {
                const newHighlightedMap = { ...state.highlightedMap };
                show.forEach((caption: CaptionItem) => {
                    newHighlightedMap[caption.id] = true;
                });

                hide.forEach((caption: CaptionItem) => {
                    newHighlightedMap[caption.id] = false;
                });

                return {
                    highlightedMap: newHighlightedMap
                };
            }
            return state;
        });
    };

    private _reset = () => {
        this._engine = null;
    };

    private _enableAutoScroll = (e: any) => {
        e.preventDefault();
        this._preventScrollEvent = true;
        this.setState({
            isAutoScrollEnabled: true
        });
    };

    private _renderScrollToButton = () => {
        return (
            <button className={styles.gotoButton} onClick={this._enableAutoScroll}>
                Up
            </button>
        );
    };

    private _onSearch = (search: string) => {
        this.setState({
            search
        });
    };

    private _renderHeader = (onClose: () => void, onDownload: () => void) => {
        return (
            <div className={styles.header}>
                <Search
                    onChange={this._debounced.onSearch}
                    onPrev={() => {}}
                    onNext={() => {}}
                    value={this.state.search}
                />
                <div className={styles.downloadButton} onClick={onDownload} />
                <div className={styles.closeButton} onClick={onClose} />
            </div>
        );
    };

    private _renderTranscript = () => {
        const { captions, seek, hasError, onRetryLoad } = this.props;
        const { highlightedMap, search } = this.state;
        if (!captions || !captions.length) {
            return null;
        }

        if (hasError) {
            return (
                <div className={styles.errorWrapper}>
                    <p>Failed to get transcript, please try again</p>
                    <button className={styles.retryButton} onClick={onRetryLoad}>
                        Retry
                    </button>
                </div>
            );
        }
        return (
            <div className={styles.transcriptWrapper}>
                <table>
                    <tbody>
                        {captions.map(captionData => (
                            <Caption
                                key={captionData.id}
                                seekTo={seek}
                                caption={captionData}
                                highlighted={highlightedMap[captionData.id]}
                                scrollTo={this._debounced.scrollTo}
                                search={search}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    private _renderLoading = () => {
        return (
            <div className={styles.loadingWrapper}>
                <Spinner />
            </div>
        );
    };

    private _scrollTo = (el: HTMLElement) => {
        if (this._transcriptListRef && this.state.isAutoScrollEnabled) {
            this._preventScrollEvent = true;
            this._transcriptListRef.scrollTop = el.offsetTop - Constants.SCROLL_OFFSET; // delta;
        }
    };

    private _onScroll = () => {
        if (this._preventScrollEvent) {
            this._preventScrollEvent = false;
            return;
        }
        this.setState({
            isAutoScrollEnabled: false
        });
    };

    private _debounced = {
        scrollTo: debounce(this._scrollTo, Constants.SCROLL_DEBOUNCE_TIMEOUT),
        onSearch: debounce(this._onSearch, Constants.SEARCH_DEBOUNCE_TIMEOUT)
    };

    render(props: TranscriptProps) {
        const { onClose, onDownload, isLoading } = props;
        return (
            <div className={styles.root}>
                {this._renderHeader(onClose, onDownload)}
                {!this.state.isAutoScrollEnabled && this._renderScrollToButton()}
                <div
                    className={styles.body}
                    onScroll={this._onScroll}
                    ref={node => {
                        this._transcriptListRef = node;
                    }}
                >
                    {isLoading ? this._renderLoading() : this._renderTranscript()}
                </div>
            </div>
        );
    }
}
