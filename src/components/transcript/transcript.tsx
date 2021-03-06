import { h, Component } from "preact";
import { KeyboardKeys } from "@playkit-js-contrib/ui";
import * as styles from "./transcript.scss";
import { getContribLogger, CuepointEngine, debounce } from "@playkit-js-contrib/common";
import { Spinner } from "../spinner";
import { CaptionItem } from "../../utils";
import { Search } from "../search";
import { CaptionList } from "../caption-list";

export interface TranscriptProps {
    onSeek(time: number): void;
    onClose: () => void;
    onRetryLoad: () => void;
    isLoading: boolean;
    hasError: boolean;
    captions: CaptionItem[];
    showTime: boolean;
    currentTime: number;
    scrollOffset: number;
    searchDebounceTimeout: number;
    searchNextPrevDebounceTimeout: number;
    videoDuration: number;
    kitchenSinkActive: boolean;
    toggledWithEnter: boolean;
}

interface TranscriptState {
    isAutoScrollEnabled: boolean;
    search: string;
    activeSearchIndex: number;
    searchMap: Record<number, Record<string, number>>;
    totalSearchResults: number;
    highlightedMap: Record<number, true>;
    searchLength: number;
    widgetWidth: number;
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

const SEARCHBAR_HEIGHT = 38; // height of search bar with margins

export class Transcript extends Component<TranscriptProps, TranscriptState> {
    private _transcriptListRef: HTMLElement | null = null;
    private _captionListRef: any = null;
    private _skipTranscriptButtonRef: HTMLDivElement | null = null;
    private _autoscrollButtonRef: HTMLDivElement | null = null;
    private _preventScrollEvent: boolean = false;
    private _scrollToSearchMatchEnabled: boolean = false;
    private _widgetRootRef: HTMLElement | null = null;
    private _engine: CuepointEngine<CaptionItem> | null = null;

    private _widgetHeight: number = 0;
    private _topAutoscrollEdge: number = 0;
    private _bottomAutoscrollEdge: number = 0;
    private _thirdOfWidgetHeight: number = 0;

    private _log = (msg: string, method: string) => {
        logger.trace(msg, {
            method: method || "Method not defined"
        });
    };
    private _silence = false;
    state: TranscriptState = {
        isAutoScrollEnabled: true,
        highlightedMap: {},
        widgetWidth: 0,
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
            this.setState({ search: "", isAutoScrollEnabled: true });
        }

        if (previousProps.currentTime !== currentTime) {
            this._syncVisibleTranscript();
        }

        if (previousState.search !== search) {
            this._debounced.findSearchMatches();
        }

        this._setWidgetSize();
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
                this._silence = false;
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

            if (show.length === 0 && hide.length > 0) {
                this._silence = true;
                return state;
            }

            if (show.length > 0 || hide.length > 0) {
                let newHighlightedMap: Record<number, true> = {};
                if (this._silence) {
                    this._silence = false;
                } else {
                    newHighlightedMap = { ...state.highlightedMap };
                }
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

    private _enableAutoScroll = (event: any) => {
        event.preventDefault();
        if (this.state.isAutoScrollEnabled) {
          return;
        }
        if (
            event.type === "click" ||
            event.keyCode === KeyboardKeys.Space ||
            event.keyCode === KeyboardKeys.Enter
        ) {
            this._preventScrollEvent = true;
            this.setState({
                isAutoScrollEnabled: true
            });
            if (event.type !== "click") {
                this._skipTranscriptButtonRef?.focus();
            }
        }
    };

    private _renderScrollToButton = () => {
        const { isAutoScrollEnabled } = this.state;
        return (
            <div
                role="button"
                className={`${styles.autoscrollButton} ${isAutoScrollEnabled ? "" : styles.autoscrollButtonVisible}`}
                onClick={this._enableAutoScroll}
                onKeyDown={this._enableAutoScroll}
                tabIndex={isAutoScrollEnabled ? -1 : 1}
                ref={node => {
                  this._autoscrollButtonRef = node;
                }}
            />
        );
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
        this._scrollToSearchMatchEnabled = true;
        this.setState({
            activeSearchIndex: index,
            isAutoScrollEnabled: false
        });
    };

    private _getHeaderStyles = (): string => {
        const { widgetWidth } = this.state;
        if (widgetWidth >= 692) {
            return "";
        }
        if (widgetWidth >= 649) {
            return styles.mediumWidth;
        }
        return styles.smallWidth;
    }

    private _renderHeader = () => {
        const { toggledWithEnter, kitchenSinkActive } = this.props;
        const { search, activeSearchIndex, totalSearchResults } = this.state;
        return (
            <div className={[styles.header, this._getHeaderStyles()].join(' ')}>
                <Search
                    onChange={this._onSearch}
                    onSearchIndexChange={this._debounced.onActiveSearchIndexChange}
                    value={search}
                    activeSearchIndex={activeSearchIndex}
                    totalSearchResults={totalSearchResults}
                    toggledWithEnter={toggledWithEnter}
                    kitchenSinkActive={kitchenSinkActive}
                />
            </div>
        );
    };

    private _handleKeyDown = (event: KeyboardEvent) => {
      if (event.keyCode === KeyboardKeys.Tab && !event.shiftKey) {
        this.setState({
          isAutoScrollEnabled: false
        });
        const captionRef = this._captionListRef?._currentCaptionRef?._hotspotRef;
        if (captionRef) {
          event.preventDefault();
          captionRef.focus();
        }
      } else if (
        event.keyCode === KeyboardKeys.Enter ||
        event.keyCode === KeyboardKeys.Space
      ) {
        event.preventDefault();
        this._autoscrollButtonRef?.focus();
      }
    };

    private _renderSkipTranscriptButton = () => {
      return (
        <div
          role="button"
          ref={(node) => {
            this._skipTranscriptButtonRef = node;
          }}
          className={styles.skipTranscriptButton}
          onKeyDown={this._handleKeyDown}
          tabIndex={1}
        >
          Skip transcript
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
            scrollTo: this._scrollTo,
            scrollToSearchMatch: this._scrollToSearchMatch,
            videoDuration
        };

        return (
            <CaptionList
                ref={node => {
                  this._captionListRef = node;
                }}
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

    private _setWidgetSize = () => {
        if (this._widgetRootRef) {
            const { width, height, top } = this._widgetRootRef.getBoundingClientRect();
            if (this.state.widgetWidth !== width) {
                this.setState({
                    widgetWidth: width
                })
            }
            if (this._widgetHeight !== height) {
                this._widgetHeight = height;
                this._thirdOfWidgetHeight = height / 3;
                this._topAutoscrollEdge = Math.floor(this._thirdOfWidgetHeight + SEARCHBAR_HEIGHT);
                this._bottomAutoscrollEdge = Math.ceil((this._thirdOfWidgetHeight * 2) + SEARCHBAR_HEIGHT);
            }
        }
    }

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
            const { top } = el.getBoundingClientRect();
            if (top >= this._topAutoscrollEdge || top <= this._bottomAutoscrollEdge) {
                this._transcriptListRef.scrollTop = el.offsetTop - (this._thirdOfWidgetHeight - SEARCHBAR_HEIGHT);
            }
        }
    };

    private _scrollToSearchMatch = (el: HTMLElement) => {
        if (this._transcriptListRef && this._scrollToSearchMatchEnabled) {
            this._scrollToSearchMatchEnabled = false;
            this._preventScrollEvent = true;
            this._transcriptListRef.scrollTop = el.offsetTop - SEARCHBAR_HEIGHT;
        }
    }

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
        findSearchMatches: debounce(this._findSearchMatches, this.props.searchDebounceTimeout),
        onActiveSearchIndexChange: debounce(
            this._setActiveSearchIndex,
            this.props.searchNextPrevDebounceTimeout
        )
    };

    private _handleEsc = (event: KeyboardEvent) => {
      if (event.keyCode === KeyboardKeys.Esc) {
        this.props.onClose();
      }
    };

    private _handleClose = (event: any) => {
        if (
            event.type === "click" ||
            event.keyCode === KeyboardKeys.Space ||
            event.keyCode === KeyboardKeys.Enter
        ) {
            this.props.onClose();
        }
    };

    render(props: TranscriptProps) {
        const { isLoading, kitchenSinkActive } = props;
        return (
            <div
                className={`${styles.root} ${kitchenSinkActive ? '' : styles.hidden}`}
                ref={node => {
                    this._widgetRootRef = node;
                }}
                onKeyUp={this._handleEsc}
            >
                <div className={styles.globalContainer}>
                    {this._renderHeader()}
                    <div
                        role="button"
                        className={styles.closeButton}
                        tabIndex={1}
                        onClick={this._handleClose}
                        onKeyUp={this._handleClose}
                    />
                    {!isLoading && this._renderSkipTranscriptButton()}
                    <div
                        className={styles.body}
                        onScroll={this._onScroll}
                        ref={node => {
                            this._transcriptListRef = node;
                        }}
                    >
                        {isLoading ? this._renderLoading() : this._renderTranscript()}
                    </div>
                    {this._renderScrollToButton()}
                </div>
            </div>
        );
    }
}
