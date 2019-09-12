import { h, Component } from "preact";
import * as styles from "./Transcript.scss";
import { ContribLogger } from "@playkit-js-contrib/common";
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
    showTime: boolean;
    highlightedMap: Record<number, true>;
}

interface TranscriptState {
    isAutoScrollEnabled: boolean;
    search: string;
    // activeSearchIndex: number;
    // searchMap: Record<number, any>;
}

const Constants = {
    SCROLL_OFFSET: 0,
    SCROLL_DEBOUNCE_TIMEOUT: 200,
    SEARCH_DEBOUNCE_TIMEOUT: 250
};

export class Transcript extends Component<TranscriptProps, TranscriptState> {
    private _transcriptListRef: HTMLElement | null = null;
    private _preventScrollEvent: boolean = false;
    state: TranscriptState = {
        isAutoScrollEnabled: true,
        search: "",
        // activeSearchIndex: 0,
        // searchMap: {}
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
    }

    componentWillUnmount(): void {
        this.log(logger => {
            logger.debug("Unmount Transcript component", {
                class: "Transcript",
                method: "componentWillUnmount"
            });
        });
    }

    shouldComponentUpdate(
        nextProps: Readonly<TranscriptProps>,
        nextState: Readonly<TranscriptState>
    ) {
        if (
            nextState.isAutoScrollEnabled !== this.state.isAutoScrollEnabled ||
            nextState.search !== this.state.search ||
            nextProps.highlightedMap !== this.props.highlightedMap ||
            nextProps.isLoading !== this.props.isLoading ||
            nextProps.hasError !== this.props.hasError
        ) {
            return true;
        }
        return false;
    }

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

    // private _setActiveSearchIndex = (index: number) => {
    //     this.setState({
    //         activeSearchIndex: index
    //     });
    // };

    private _renderHeader = (onClose: () => void, onDownload: () => void) => {
        return (
            <div className={styles.header}>
                <Search
                    onChange={this._debounced.onSearch}
                    // onSearchIndexChange={this._debounced.onActiveSearchIndexChange}
                    value={this.state.search}
                    // activeSearchIndex={this.state.activeSearchIndex}
                />
                <div className={styles.downloadButton} onClick={onDownload} />
                <div className={styles.closeButton} onClick={onClose} />
            </div>
        );
    };

    private _renderTranscript = () => {
        const { captions, seek, hasError, onRetryLoad, highlightedMap, showTime } = this.props;
        const { search, isAutoScrollEnabled } = this.state;
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
                        {captions.map(captionData => {
                            const lcText = captionData.text.toLowerCase();
                            const lcSearch = search.toLowerCase();
                            let index = -1;
                            if (lcSearch) {
                                index = lcText.indexOf(lcSearch);
                            }
                            // TODO: cover the case when we have more than 2 match for the caption
                            return (
                                <Caption
                                    key={captionData.id}
                                    seekTo={seek}
                                    caption={captionData}
                                    highlighted={highlightedMap[captionData.id]}
                                    scrollTo={this._debounced.scrollTo}
                                    searchLength={search.length}
                                    searchIndex={index}
                                    showTime={showTime}
                                    isAutoScrollEnabled={isAutoScrollEnabled && highlightedMap[captionData.id]}
                                />
                            );
                        })}
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
        onSearch: debounce(this._onSearch, Constants.SEARCH_DEBOUNCE_TIMEOUT),
        // onActiveSearchIndexChange: debounce(
        //     this._setActiveSearchIndex,
        //     Constants.SEARCH_DEBOUNCE_TIMEOUT
        // )
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
