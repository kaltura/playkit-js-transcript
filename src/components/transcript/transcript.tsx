import {h, Component} from 'preact';
import {ui, core} from '@playkit-js/kaltura-player-js';
import {debounce} from '../../utils';
import * as styles from './transcript.scss';
import {Spinner} from '../spinner';
import {Search} from '../search';
import {CaptionList} from '../caption-list';
import {HighlightedMap, CuePointData} from '../../types';
import {ErrorIcon} from './error-icon';
import {AutoscrollButton} from '../autoscroll-button';
import {TranscriptMenu} from '../transcript-menu';
import {SmallScreenSlate} from '../small-screen-slate';
import {Button, ButtonType, ButtonSize} from '@playkit-js/common/dist/components/button';
import {ScreenReaderProvider} from '@playkit-js/common/dist/hoc/sr-wrapper';
import {OnClickEvent, OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {TranscriptEvents} from '../../events/events';

const {ENTER, SPACE, TAB, ESC} = ui.utils.KeyMap;
const {withText, Text} = ui.preacti18n;

const {SidePanelModes} = ui;
const {PLAYER_BREAK_POINTS} = ui.Components;
const {connect} = ui.redux;

const SEARCH_EVENT_DISPATCH_TIMEOUT = 2000;

const translates = {
  skipTranscript: <Text id="transcript.skip_transcript">Skip transcript</Text>,
  errorTitle: <Text id="transcript.whoops">Whoops!</Text>,
  errorDescripton: <Text id="transcript.load_failed">Failed to load transcript</Text>,
  attachTranscript: <Text id="transcript.attach_transcript">Bring Transcript back</Text>,
  detachTranscript: <Text id="transcript.detach_transcript">Popout transcript</Text>,
  toSearchResult: <Text id="transcript.to_search_result">Go to result</Text>
};

export interface TranscriptProps {
  onSeek(time: number): void;
  onClose: OnClick;
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
  onItemClicked: (n: number) => void;
  skipTranscript?: string;
  errorTitle?: string;
  errorDescripton?: string;
  attachTranscript?: string;
  detachTranscript?: string;
  toSearchResult?: string;
  downloadDisabled: boolean;
  onDownload: () => void;
  printDisabled: boolean;
  onPrint: () => void;
  smallScreen?: boolean;
  expandMode?: string;
  dispatcher: (name: string, payload?: any) => void;
  activeCaptionLanguage: string;
  onDetach: () => void;
  onAttach: () => void;
  kitchenSinkDetached: boolean;
  isMobile?: boolean;
  playerWidth?: number;
  onJumpToSearchMatch: () => void;
  onScrollToSearchMatch: () => void;
  focusPluginButton: (event: KeyboardEvent) => void;
  textTracks: Array<core.TextTrack>;
  changeLanguage: (textTrack: core.TextTrack) => void;
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

const SMALL_WIDGET_WIDTH = 240;
const SEARCHBAR_HEIGHT = 38; // height of search bar with margins

const mapStateToProps = (state: any, ownProps: Pick<TranscriptProps, 'expandMode'>) => ({
  smallScreen: ownProps.expandMode === SidePanelModes.ALONGSIDE && state.shell.playerClientRect?.width <= PLAYER_BREAK_POINTS.TINY,
  isMobile: state.shell.isMobile,
  playerWidth: state.shell.playerClientRect?.width
});

// @ts-ignore
@connect(mapStateToProps)
@withText(translates)
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

  private _resizeObserver: ResizeObserver | null = null;

  state: TranscriptState = {
    isAutoScrollEnabled: true,
    widgetWidth: 0,
    ...initialSearch
  };

  componentDidMount(): void {
    if (window.ResizeObserver) {
      // observe transcript root element size changes
      this._resizeObserver = new ResizeObserver(() => {
        this._setWidgetSize();
      });
      this._resizeObserver.observe(this._widgetRootRef!);
    } else {
      // use player size to define transcript root element size
      this._setWidgetSize();
    }
  }

  componentDidUpdate(previousProps: Readonly<TranscriptProps>, previousState: Readonly<TranscriptState>): void {
    const {captions, activeCaptionLanguage, playerWidth} = this.props;
    const {search} = this.state;
    if (previousProps.captions !== captions) {
      // clear search value only if active caption language was switched, otherwise keep previous value
      this.setState({search: previousProps.activeCaptionLanguage !== activeCaptionLanguage ? '' : previousState.search, isAutoScrollEnabled: true});
    }

    if (previousState.search !== search || (previousProps.captions !== captions && previousProps.activeCaptionLanguage === activeCaptionLanguage)) {
      // trigger search in case search value has changed, or new captions were added for the same language (preventSeek use-case)
      this._debounced.findSearchMatches();
    }

    if (!this._resizeObserver && previousProps.playerWidth !== playerWidth) {
      // re-calculate wiget size if player size changed
      this._setWidgetSize();
    }
  }

  componentWillUnmount(): void {
    if (this._resizeObserver) {
      this._resizeObserver?.disconnect();
      this._resizeObserver = null;
    }
  }

  private _handleClose = (event: KeyboardEvent) => {
    if (event.keyCode === ESC){
      this.props.onClose(event, true);
    }
  };

  private _enableAutoScroll = (event: OnClickEvent, byKeyboard?: boolean) => {
    event.preventDefault();
    if (this.state.isAutoScrollEnabled) {
      return;
    }
    this._preventScrollEvent = true;
    this.setState({
      isAutoScrollEnabled: true
    });
    if (byKeyboard) {
      this._skipTranscriptButtonRef?.focus();
    }
  };

  private _renderScrollToButton = () => {
    const {isAutoScrollEnabled} = this.state;
    return (
      <AutoscrollButton
        setAutoscrollButtonRef={(node: HTMLDivElement) => {
          this._autoscrollButtonRef = node;
        }}
        isAutoScrollEnabled={isAutoScrollEnabled}
        onClick={this._enableAutoScroll}
      />
    );
  };

  private _renderDetachButton = () => {
    const {onAttach, onDetach, attachTranscript, detachTranscript, kitchenSinkDetached, isMobile} = this.props;
    if (isMobile) {
      return null;
    }
    return (
      <div data-testid="transcriptDetachAttachButton">
        <Button
          type={ButtonType.borderless}
          size={ButtonSize.medium}
          onClick={kitchenSinkDetached ? onAttach : onDetach}
          icon={kitchenSinkDetached ? 'attach' : 'detach'}
          ariaLabel={kitchenSinkDetached ? attachTranscript : detachTranscript}
          tooltip={{
            label: kitchenSinkDetached ? attachTranscript! : detachTranscript!,
            ...(kitchenSinkDetached ? {type: 'bottom-left', strictPosition: kitchenSinkDetached} : {})
          }}
        />
      </div>
    );
  };

  private _onSearch = (search: string) => {
    this.setState({search});
    this.props.onScrollToSearchMatch()
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
      this._debounced.searchEventDispatcher(state);
      return {
        searchMap,
        totalSearchResults: index,
        activeSearchIndex: 1,
        searchLength: loSearch.length
      };
    });
  };

  private _dispatchSearchEvent = (state: TranscriptState) => {
    this.props.dispatcher(TranscriptEvents.TRANSCRIPT_SEARCH, {search: this.state.search});
  };

  private _setActiveSearchIndex = (index: number) => {
    this._scrollToSearchMatchEnabled = true;
    this.setState({
      activeSearchIndex: index,
      isAutoScrollEnabled: false
    });
    this.props.dispatcher(TranscriptEvents.TRANSCRIPT_NAVIGATE_RESULT, {index});
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

  private _renderJumpToSearchButton = () => {
    const {toSearchResult, onJumpToSearchMatch} = this.props;
    const {search, activeSearchIndex, totalSearchResults} = this.state;
    if (!search || totalSearchResults === 0 || activeSearchIndex === 0) {
      return null;
    }
    return (
      <Button
        type={ButtonType.secondary}
        className={styles.toSearchButton}
        onClick={onJumpToSearchMatch}
        ariaLabel={toSearchResult}
        testId="transcript_jumpToSearchMatch">
        {toSearchResult}
      </Button>
    );
  };

  private _renderHeader = () => {
    const {
      toggledWithEnter,
      kitchenSinkActive,
      kitchenSinkDetached,
      downloadDisabled,
      onDownload,
      printDisabled,
      onPrint,
      isLoading,
      attachTranscript,
      detachTranscript,
      onAttach,
      onDetach,
      textTracks,
      changeLanguage
    } = this.props;
    const {search, activeSearchIndex, totalSearchResults} = this.state;

    let detachMenuItem: null | any = null;
    if (this.state.widgetWidth <= SMALL_WIDGET_WIDTH && !kitchenSinkDetached) {
      detachMenuItem = {
        label: kitchenSinkDetached ? attachTranscript : detachTranscript,
        onClick: kitchenSinkDetached ? onAttach : onDetach,
        testId: 'transcript-detach-attach-button',
        disabled: isLoading
      };
    }
    return (
      <div className={[styles.header, this._getHeaderStyles()].join(' ')} data-testid="transcript_header">
        <Search
          onChange={this._onSearch}
          onSearchIndexChange={this._debounced.onActiveSearchIndexChange}
          value={search}
          activeSearchIndex={activeSearchIndex}
          totalSearchResults={totalSearchResults}
          toggledWithEnter={toggledWithEnter}
          kitchenSinkActive={kitchenSinkActive}
          focusPluginButton={this.props.focusPluginButton}
        />
        {this._renderJumpToSearchButton()}
        <TranscriptMenu
          {...{downloadDisabled, onDownload, printDisabled, onPrint, isLoading, detachMenuItem, kitchenSinkDetached, textTracks, changeLanguage}}
        />
        {!detachMenuItem && this._renderDetachButton()}
        {!kitchenSinkDetached && (
          <div data-testid="transcriptCloseButton">
            <Button
              type={ButtonType.borderless}
              size={ButtonSize.medium}
              disabled={false}
              onClick={this.props.onClose}
              ariaLabel={'Hide Transcript'}
              tooltip={{label: 'Hide Transcript'}}
              icon={'close'}
            />
          </div>
        )}
      </div>
    );
  };

  private _handleClick = (event: MouseEvent | KeyboardEvent) => {
    event.preventDefault();
    this._autoscrollButtonRef?.focus();
  };

  private _handleKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode === TAB && !event.shiftKey) {
      this.setState({
        isAutoScrollEnabled: false
      });
      const captionRef = this._captionListRef?._currentCaptionRef?._hotspotRef;
      if (captionRef) {
        event.preventDefault();
        captionRef.focus();
      }
    } else if (event.keyCode === ENTER || event.keyCode === SPACE) {
      this._handleClick(event);
    }
  };

  private _renderSkipTranscriptButton = () => {
    return (
      <div
        role="button"
        ref={node => {
          this._skipTranscriptButtonRef = node;
        }}
        data-testid="transcript_skipButton"
        className={styles.skipTranscriptButton}
        onKeyDown={this._handleKeyDown}
        onClick={this._handleClick}
        tabIndex={0}>
        {this.props.skipTranscript}
      </div>
    );
  };

  private _renderTranscript = () => {
    const {captions, hasError, onRetryLoad, showTime, videoDuration, highlightedMap} = this.props;
    const {isAutoScrollEnabled, searchMap, activeSearchIndex, searchLength} = this.state;

    if (hasError) {
      return (
        <div className={styles.errorWrapper}>
          <div className={styles.errorIcon}>
            <ErrorIcon />
          </div>
          <p className={styles.errorMainText}>{this.props.errorTitle}</p>
          <p className={styles.errorDescriptionText}>{this.props.errorDescripton}</p>
        </div>
      );
    }

    if (!captions || !captions.length) {
      return null;
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
    return <Spinner />;
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
    onActiveSearchIndexChange: debounce(this._setActiveSearchIndex, this.props.searchNextPrevDebounceTimeout),
    searchEventDispatcher: debounce(this._dispatchSearchEvent, SEARCH_EVENT_DISPATCH_TIMEOUT)
  };

  render(props: TranscriptProps) {
    const {isLoading, kitchenSinkActive, kitchenSinkDetached, hasError, smallScreen, toggledWithEnter} = props;
    const renderTranscriptButtons = !(isLoading || hasError);
    return (
      <ScreenReaderProvider>
        <div
          className={`${styles.root} ${kitchenSinkActive || kitchenSinkDetached ? '' : styles.hidden}`}
          ref={node => {
            this._widgetRootRef = node;
          }}
          onKeyUp={this._handleClose}
          data-testid="transcript_root">
          {smallScreen && !kitchenSinkDetached ? (
            <SmallScreenSlate onClose={this.props.onClose} toggledWithEnter={toggledWithEnter} />
          ) : (
            <div className={styles.globalContainer}>
              {this._renderHeader()}

              {renderTranscriptButtons && this._renderSkipTranscriptButton()}
              <div
                className={styles.body}
                onScroll={this._onScroll}
                ref={node => {
                  this._transcriptListRef = node;
                }}
                data-testid="transcript_list">
                {isLoading ? this._renderLoading() : this._renderTranscript()}
              </div>
              {renderTranscriptButtons && this._renderScrollToButton()}
            </div>
          )}
        </div>
      </ScreenReaderProvider>
    );
  }
}
