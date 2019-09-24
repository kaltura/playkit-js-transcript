import { h, Component } from "preact";
import * as styles from "./transcript.scss";
import {
    getContribLogger,
    CuepointEngine
} from "@playkit-js-contrib/common";
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
}

interface TranscriptState {
    isAutoScrollEnabled: boolean;
    search: string;
    activeSearchIndex: number;
    searchMap: Record<number, Record<string, number>>;
    totalSearchResults: number;
    highlightedMap: Record<number, true>;
}

const initialSearch = {
    search: "",
    activeSearchIndex: 1,
    searchMap: {},
    totalSearchResults: 0
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
            method: method || 'Method not defined',
        });
    }
    state: TranscriptState = {
        isAutoScrollEnabled: true,
        highlightedMap: {},
        ...initialSearch
    };

    componentDidMount(): void {
        this._log("Creating engine", "componentDidMount")
        this._createEngine();
    }

    componentDidUpdate(previousProps: Readonly<TranscriptProps>): void {
        const { captions } = this.props;
        if (previousProps.captions !== captions) {
            this._createEngine();
        }

        if (previousProps.currentTime !== this.props.currentTime) {
            this._syncVisibleTranscript();
        }
    }

    componentWillUnmount(): void {
        this._log("Removing engine", "componentWillUnmount")
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
        if (!search) {
            this.setState({ ...initialSearch });
            return;
        }
        let index = 0;
        const loSearch = search.toLowerCase();
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
        this.setState({
            search,
            searchMap,
            totalSearchResults: index,
            activeSearchIndex: 1
        });
    };

    private _setActiveSearchIndex = (index: number) => {
        this.setState({
            activeSearchIndex: index,
            isAutoScrollEnabled: false
        });
    };

    private _renderHeader = (onClose: () => void, onDownload: () => void) => {
        return (
            <div className={styles.header}>
                <Search
                    onChange={this._debounced.onSearch}
                    onSearchIndexChange={this._debounced.onActiveSearchIndexChange}
                    value={this.state.search}
                    activeSearchIndex={this.state.activeSearchIndex}
                    totalSearchResults={this.state.totalSearchResults}
                />
                <div className={styles.downloadButton} onClick={onDownload} />
                <div className={styles.closeButton} onClick={onClose} />
            </div>
        );
    };

    private _renderTranscript = () => {
        const { captions, hasError, onRetryLoad, showTime } = this.props;
        const {
            search,
            isAutoScrollEnabled,
            searchMap,
            activeSearchIndex,
            highlightedMap
        } = this.state;
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
            <CaptionList
                highlightedMap={highlightedMap}
                captions={captions}
                seekTo={this._handleSeek}
                scrollTo={this._debounced.scrollTo}
                search={search}
                showTime={showTime}
                isAutoScrollEnabled={isAutoScrollEnabled}
                searchMap={searchMap}
                activeSearchIndex={activeSearchIndex}
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
        onSeek(caption.startTime);
    };

    private _debounced = {
        scrollTo: debounce(this._scrollTo, this.props.scrollDebounceTimeout),
        onSearch: debounce(this._onSearch, this.props.searchDebounceTimeout),
        onActiveSearchIndexChange: debounce(this._setActiveSearchIndex, this.props.searchNextPrevDebounceTimeout)
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
