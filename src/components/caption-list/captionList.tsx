import {h, Component} from 'preact';
import {HOUR} from '../../utils';
import {Caption} from '../caption';
import * as styles from './captionList.scss';
import {HighlightedMap, CuePointData} from '../../types';
import {TranscriptEvents} from "../../events/events";
import {ui} from "@playkit-js/kaltura-player-js";

const {END, HOME} = KalturaPlayer.ui.utils.KeyMap;
const {withEventManager} = KalturaPlayer.ui.Event;
const {withPlayer} = ui.Components;

export interface CaptionProps {
  showTime: boolean;
  searchLength: number;
  scrollTo(el: HTMLElement): void;
  scrollToSearchMatch(el: HTMLElement): void;
  videoDuration: number;
}

export interface Props {
  data: Array<CuePointData>;
  onSeek: (n: CuePointData) => void;
  autoScroll?: boolean;
  onScroll: (n: number) => void;
  widgetWidth: number;
  highlightedMap: HighlightedMap;
  showItemsIcons: boolean;
  listDataContainCaptions?: boolean;
  searchActive: boolean;
  isAutoScrollEnabled: boolean;
  activeSearchIndex: number;
  searchMap: Record<string, Record<string, number>>;
  captionProps: CaptionProps;
  eventManager?: any;
  player?: any;
}


@withEventManager
@withPlayer
export class CaptionList extends Component<Props> {
  private _currentCaptionRef: any = null;
  private _firstCaptionRef: any = null;
  private _lastCaptionRef: any = null;
  private _isTranscriptNavigateTriggered: boolean = false;

  constructor(props: Props | undefined) {
    super(props);
    this._setFocus();
  }

  shouldComponentUpdate(nextProps: Readonly<Props>) {
    const {highlightedMap, data, searchMap, activeSearchIndex, isAutoScrollEnabled} = this.props;
    if (searchMap !== nextProps.searchMap){
      this._isTranscriptNavigateTriggered = false;
    }
    if (
      highlightedMap !== nextProps.highlightedMap ||
      data !== nextProps.data ||
      searchMap !== nextProps.searchMap ||
      activeSearchIndex !== nextProps.activeSearchIndex ||
      isAutoScrollEnabled !== nextProps.isAutoScrollEnabled
    ) {
      return true;
    }
    return false;
  }

  private _handleClick = (caption: CuePointData) => () => {
    const {onSeek} = this.props;
    onSeek(caption);
  };

  private _getShouldScroll = (captionId: string) => {
    const {isAutoScrollEnabled, highlightedMap} = this.props;
    return isAutoScrollEnabled && highlightedMap[captionId];
  };

  private _getShouldScrollToSearchMatch = (captionId: string) => {
    const {isAutoScrollEnabled, searchMap, activeSearchIndex} = this.props;
    return !isAutoScrollEnabled && searchMap[captionId] && searchMap[captionId][activeSearchIndex] !== undefined;
  };

  private _getSearchProps = (captionId: string) => {
    const {searchMap, activeSearchIndex, captionProps} = this.props;
    const searchProps: any = {};
    if (searchMap[captionId]) {
      searchProps.indexMap = searchMap[captionId];
      searchProps.activeSearchIndex = activeSearchIndex;
      searchProps.searchLength = captionProps.searchLength;
    }
    return searchProps;
  };

  private _getCaptionProps = (captionData: CuePointData) => {
    const {highlightedMap, captionProps, isAutoScrollEnabled} = this.props;
    const {id}: {id: string} = captionData;
    const newCaptionProps = {
      showTime: captionProps.showTime,
      scrollTo: captionProps.scrollTo,
      scrollToSearchMatch: captionProps.scrollToSearchMatch,
      key: id,
      onClick: this._handleClick(captionData),
      caption: captionData,
      highlighted: highlightedMap,
      longerThanHour: captionProps.videoDuration >= HOUR,
      shouldScroll: this._getShouldScroll(id),
      shouldScrollToSearchMatch: this._getShouldScrollToSearchMatch(id),
      isAutoScrollEnabled,
      searchCaption: this.props.searchMap[captionData.id],
      ...this._getSearchProps(id)
    };
    return newCaptionProps;
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.keyCode === END) {
      this._lastCaptionRef?._hotspotRef?.focus();
    } else if (event.keyCode === HOME) {
      this._firstCaptionRef?._hotspotRef?.focus();
    }
  };

  private _setFocus = () =>{
    this.props.eventManager?.listen(this.props.player, TranscriptEvents.TRANSCRIPT_NAVIGATE_RESULT, () => {
      this._isTranscriptNavigateTriggered = true
    });
  }

  render() {
    const {data} = this.props;
    let isSearchCaption = false;
    return (
      <div className={styles.transcriptWrapper} onKeyUp={this._handleKeyUp}>
        {data.map((captionData, index) => {
          const captionProps = this._getCaptionProps(captionData);
          return (
            <Caption
              ref={node => {
                if (index === 0) {
                  this._firstCaptionRef = node;
                } else if (index === data.length - 1) {
                  this._lastCaptionRef = node;
                }
                if (captionProps.searchCaption){
                  Object.keys(captionProps.searchCaption).forEach(key => {
                    if (parseInt(key) === this.props.activeSearchIndex) {
                      this._currentCaptionRef = node
                      isSearchCaption = true;
                    }
                  });
                }
                if (this._isTranscriptNavigateTriggered && isSearchCaption){
                  this._currentCaptionRef?.base?.focus();
                }
                if (!isSearchCaption && captionProps.highlighted[captionData.id]) {
                  this._currentCaptionRef = node;
                }
              }}
              {...captionProps}
            />
          );
        })}
      </div>
    );
  }
}
