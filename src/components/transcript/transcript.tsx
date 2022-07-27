import {h, Component} from 'preact';
import {debounce} from '../../utils';
import * as styles from './transcript.scss';
import {Spinner} from '../spinner';
import {Search} from '../search';
import {CaptionList} from '../caption-list';
import {HighlightedMap, CuePointData, PluginPositions} from '../../types';
import { A11yWrapper } from '../a11y-wrapper';
import {CloseButton} from '../close-button';

const {ENTER, Space, Tab, Esc, click} = KalturaPlayer.ui.utils.KeyMap;
export interface TranscriptProps {
  onSeek(time: number): void;
  onClose: () => void;
  onRetryLoad: () => void;
  isLoading: boolean;
  hasError: boolean;
  captions: Array<CuePointData>;
  showTime: boolean;
  currentTime: number;
  scrollOffset: number;
  searchDebounceTimeout: number;
  searchNextPrevDebounceTimeout: number;
  videoDuration: number;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;
  highlightedMap: HighlightedMap;
  pluginMode: PluginPositions
  onItemClicked: (n:number) => void
}

interface TranscriptState {
  isAutoScrollEnabled: boolean;
  search: string;
  activeSearchIndex: number;
  searchMap: Record<string, Record<string, number>>;
  totalSearchResults: number;
  searchLength: number;
  widgetWidth: number;
}

const initialSearch = {
  search: '',
  activeSearchIndex: 1,
  searchMap: {},
  totalSearchResults: 0,
  searchLength: 0
};

const SEARCHBAR_HEIGHT = 38; // height of search bar with margins

export class Transcript extends Component<TranscriptProps, TranscriptState> {
  private _transcriptListRef: HTMLElement | null = null;
  private _captionListRef: any = null;
  private _skipTranscriptButtonRef: HTMLDivElement | null = null;
  private _autoscrollButtonRef: HTMLDivElement | null = null;
  private _preventScrollEvent: boolean = false;
  private _scrollToSearchMatchEnabled: boolean = false;
  private _widgetRootRef: HTMLElement | null = null;

  private _widgetHeight: number = 0;
  private _topAutoscrollEdge: number = 0;
  private _bottomAutoscrollEdge: number = 0;
  private _thirdOfWidgetHeight: number = 0;

  state: TranscriptState = {
    isAutoScrollEnabled: true,
    widgetWidth: 0,
    ...initialSearch
  };

  componentDidUpdate(previousProps: Readonly<TranscriptProps>, previousState: Readonly<TranscriptState>): void {
    const {captions} = this.props;
    const {search} = this.state;
    if (previousProps.captions !== captions) {
      this.setState({search: '', isAutoScrollEnabled: true});
    }

    if (previousState.search !== search) {
      this._debounced.findSearchMatches();
    }

    this._setWidgetSize();
  }

  private _enableAutoScroll = (event: any, byKeyboard?: boolean) => {
    event.preventDefault();
    if (this.state.isAutoScrollEnabled) {
      return;
    }
    this._preventScrollEvent = true;
    this.setState({
      isAutoScrollEnabled: true
    });
    if (event.type !== 'click') {
      this._skipTranscriptButtonRef?.focus();
    }
  };

  private _renderScrollToButton = () => {
    const {isAutoScrollEnabled} = this.state;
    return (
      <A11yWrapper onClick={this._enableAutoScroll}>
        <div
          role="button"
          className={`${styles.autoscrollButton} ${isAutoScrollEnabled ? '' : styles.autoscrollButtonVisible}`}
          tabIndex={isAutoScrollEnabled ? -1 : 1}
          ref={node => {
            this._autoscrollButtonRef = node;
          }}
        />
      </A11yWrapper>
    );
  };

  private _onSearch = (search: string) => {
    this.setState({search});
  };

  private _findSearchMatches = () => {
    this.setState((state: TranscriptState) => {
      if (!state.search) {
        return {...initialSearch};
      }
      let index = 0;
      const loSearch = state.search.toLowerCase();
      const searchMap: Record<string, Record<string, number>> = {};
      this.props.captions.forEach((caption: CuePointData) => {
        const text = caption?.text?.toLowerCase() || '';
        const regex = new RegExp(loSearch, 'gi');
        let result;
        const indices = [];
        while ((result = regex.exec(text))) {
          indices.push(result.index);
        }
        indices.forEach((i: number) => {
          index++;
          searchMap[caption.id] = {...searchMap[caption.id], [index]: i};
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
    const {widgetWidth} = this.state;
    if (widgetWidth >= 692) {
      return '';
    }
    if (widgetWidth >= 649) {
      return styles.mediumWidth;
    }
    return styles.smallWidth;
  };

  private _renderHeader = () => {
    const {toggledWithEnter, kitchenSinkActive} = this.props;
    const {search, activeSearchIndex, totalSearchResults} = this.state;
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
          searchQuery={search}
        />
      </div>
    );
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === Tab && !event.shiftKey) {
      this.setState({
        isAutoScrollEnabled: false
      });
      const captionRef = this._captionListRef?._currentCaptionRef?._hotspotRef;
      if (captionRef) {
        event.preventDefault();
        captionRef.focus();
      }
    } else if (event.keyCode === ENTER || event.keyCode === Space) {
      event.preventDefault();
      this._autoscrollButtonRef?.focus();
    }
  };

  private _renderSkipTranscriptButton = () => {
    return (
      <div
        role="button"
        ref={node => {
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
    const {captions, hasError, onRetryLoad, showTime, videoDuration, highlightedMap} = this.props;
    const {isAutoScrollEnabled, searchMap, activeSearchIndex, searchLength} = this.state;
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
            <button className={styles.retryButton} onClick={onRetryLoad}>
              Retry
            </button>
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
        data={captions}
        onSeek={this._handleSeek}
        isAutoScrollEnabled={isAutoScrollEnabled}
        searchMap={searchMap}
        activeSearchIndex={activeSearchIndex}
        captionProps={captionProps}
        onScroll={this._onScroll}
        widgetWidth={this.state.widgetWidth}
        showItemsIcons={true}
        searchActive={false}
      />
    );
  };

  private _setWidgetSize = () => {
    if (this._widgetRootRef) {
      const {width, height, top} = this._widgetRootRef.getBoundingClientRect();
      if (this.state.widgetWidth !== width) {
        this.setState({
          widgetWidth: width
        });
      }
      if (this._widgetHeight !== height) {
        this._widgetHeight = height;
        this._thirdOfWidgetHeight = height / 3;
        this._topAutoscrollEdge = Math.floor(this._thirdOfWidgetHeight + SEARCHBAR_HEIGHT);
        this._bottomAutoscrollEdge = Math.ceil(this._thirdOfWidgetHeight * 2 + SEARCHBAR_HEIGHT);
      }
    }
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
      const {top} = el.getBoundingClientRect();
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

  private _handleSeek = (caption: CuePointData) => {
    const {onSeek} = this.props;
    const selection = window.getSelection();
    if (selection && selection.type !== 'Range') {
      onSeek(caption.startTime);
    }
  };

  private _debounced = {
    findSearchMatches: debounce(this._findSearchMatches, this.props.searchDebounceTimeout),
    onActiveSearchIndexChange: debounce(this._setActiveSearchIndex, this.props.searchNextPrevDebounceTimeout)
  };

  private _handleEsc = (event: KeyboardEvent) => {
    if (event.keyCode === Esc) {
      this.props.onClose();
    }
  };

  render(props: TranscriptProps) {
    const {isLoading, kitchenSinkActive} = props;
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

          <CloseButton onClick={this.props.onClose} />

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
