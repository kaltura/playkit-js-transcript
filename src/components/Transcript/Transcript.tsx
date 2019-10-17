import { h, Component } from "preact";
import * as styles from "./transcript.scss";
import { getContribLogger, CuepointEngine } from "@playkit-js-contrib/common";
import { Spinner } from "../spinner";
import { CaptionItem, debounce } from "../../utils";
import { Search } from "../search";
import { CaptionList } from "../caption-list";

export interface TranscriptProps {
    onSeek(time: number): void;
    onClose: () => void;
    onRetryLoad: () => void;
    onDownload: () => void;
    isLoading: boolean;
    hasError: boolean;
    captions: CaptionItem[];
    showTime: boolean;
    currentTime: number;
    scrollOffset: number;
    scrollDebounceTimeout: number;
    searchDebounceTimeout: number;
    searchNextPrevDebounceTimeout: number;
    videoDuration: number;
}

interface TranscriptState {
    isAutoScrollEnabled: boolean;
    search: string;
    activeSearchIndex: number;
    searchMap: Record<number, Record<string, number>>;
    totalSearchResults: number;
    highlightedMap: Record<number, true>;
    searchLength: number;
}

const initialSearch = {
    search: "",
    activeSearchIndex: 1,
    searchMap: {},
    totalSearchResults: 0,
    searchLength: 0
};

const logger = getContribLogger({
    class: "Transcript",
    module: "transcript-plugin"
});

export class Transcript extends Component<TranscriptProps, TranscriptState> {
    private _transcriptListRef: HTMLElement | null = null;
    private _preventScrollEvent: boolean = false;
    private _engine: CuepointEngine<CaptionItem> | null = null;
    private _log = (msg: string, method: string) => {
        logger.trace(msg, {
            method: method || "Method not defined"
        });
    };
    state: TranscriptState = {
        isAutoScrollEnabled: true,
        highlightedMap: {},
        ...initialSearch
    };

    componentDidMount(): void {
        this._log("Creating engine", "componentDidMount");
        this._createEngine();
    }

    componentDidUpdate(
        previousProps: Readonly<TranscriptProps>,
        previousState: Readonly<TranscriptState>
    ): void {
        const { captions, currentTime } = this.props;
        const { search } = this.state;
        if (previousProps.captions !== captions) {
            this._log("Re-creating engine", "componentDidUpdate");
            this._createEngine();
        }

        if (previousProps.currentTime !== currentTime) {
            this._syncVisibleTranscript();
        }

        if (previousState.search !== search) {
            this._debounced.findSearchMatches();
        }
    }

    componentWillUnmount(): void {
        this._log("Removing engine", "componentWillUnmount");
        this._engine = null;
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
                    delete newHighlightedMap[caption.id];
                });

                return {
                    highlightedMap: newHighlightedMap
                };
            }
            return state;
        });
    };

    private _enableAutoScroll = (e: any) => {
        e.preventDefault();
        this._preventScrollEvent = true;
        this.setState({
            isAutoScrollEnabled: true
        });
    };

    private _renderScrollToButton = () => {
        return <button className={styles.gotoButton} onClick={this._enableAutoScroll} />;
    };

    private _onSearch = (search: string) => {
        this.setState({ search });
    };

    private _findSearchMatches = () => {
        this.setState((state: TranscriptState) => {
            if (!state.search) {
                return { ...initialSearch };
            }
            let index = 0;
            const loSearch = state.search.toLowerCase();
            const searchMap: Record<number, Record<number, number>> = {};
            this.props.captions.forEach((caption: CaptionItem) => {
                const text = caption.text.toLowerCase();
                const regex = new RegExp(loSearch, "gi");
                let result;
                const indices = [];
                while ((result = regex.exec(text))) {
                    indices.push(result.index);
                }
                indices.forEach((i: number) => {
                    index++;
                    searchMap[caption.id] = { ...searchMap[caption.id], [index]: i };
                });
            });
            return {
                searchMap,
                totalSearchResults: index,
                activeSearchIndex: 1,
                searchLength: loSearch.length
            };
        });
    };

    private _setActiveSearchIndex = (index: number) => {
        this.setState({
            activeSearchIndex: index,
            isAutoScrollEnabled: false
        });
    };

    private _renderHeader = (onClose: () => void) => {
        const { search, activeSearchIndex, totalSearchResults } = this.state;
        return (
            <div className={styles.header}>
                <Search
                    onChange={this._onSearch}
                    onSearchIndexChange={this._debounced.onActiveSearchIndexChange}
                    value={search}
                    activeSearchIndex={activeSearchIndex}
                    totalSearchResults={totalSearchResults}
                />
                <div className={styles.closeButton} onClick={onClose} />
            </div>
        );
    };

    private _renderTranscript = () => {
        const { captions, hasError, onRetryLoad, showTime, videoDuration } = this.props;
        const {
            isAutoScrollEnabled,
            searchMap,
            activeSearchIndex,
            highlightedMap,
            searchLength
        } = this.state;
        if (!captions || !captions.length) {
            return null;
        }

        if (hasError) {
            return (
                <div className={styles.errorWrapper}>
                    <div className={styles.errorIcon} />
                    <p className={styles.errorMainText}>Whoops!</p>
                    <p className={styles.errorDescriptionText}>
                        Failed to get transcript, please try again
                        {/* <button
                            className={styles.retryButton}
                            onClick={onRetryLoad}
                        >
                            Retry
                        </button> */}
                    </p>
                </div>
            );
        }

        const captionProps = {
            showTime,
            searchLength,
            scrollTo: this._debounced.scrollTo,
            videoDuration
        };

        return (
            <CaptionList
                highlightedMap={highlightedMap}
                captions={captions}
                seekTo={this._handleSeek}
                isAutoScrollEnabled={isAutoScrollEnabled}
                searchMap={searchMap}
                activeSearchIndex={activeSearchIndex}
                captionProps={captionProps}
            />
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
        if (this._transcriptListRef) {
            this._preventScrollEvent = true;
            this._transcriptListRef.scrollTop = el.offsetTop - this.props.scrollOffset; // delta;
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

    private _handleSeek = (caption: CaptionItem) => {
        const { onSeek } = this.props;
        const selection = window.getSelection();
        if (selection && selection.type !== "Range") {
            onSeek(caption.startTime);
        }
    };

    private _debounced = {
        scrollTo: debounce(this._scrollTo, this.props.scrollDebounceTimeout),
        findSearchMatches: debounce(this._findSearchMatches, this.props.searchDebounceTimeout),
        onActiveSearchIndexChange: debounce(
            this._setActiveSearchIndex,
            this.props.searchNextPrevDebounceTimeout
        )
    };

    render(props: TranscriptProps) {
        const { onClose, isLoading } = props;
        return (
            <div className={styles.root}>
                {this._renderHeader(onClose)}
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
