import {h, Component} from 'preact';
import {HOUR} from '../../utils';
import {Caption} from '../caption';
import * as styles from './captionList.scss';
import {HighlightedMap, CuePointData} from '../../types';

const {End, Home} = KalturaPlayer.ui.utils.KeyMap;


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
}
export class CaptionList extends Component<Props> {
  private _currentCaptionRef: any = null;
  private _firstCaptionRef: any = null;
  private _lastCaptionRef: any = null;
  shouldComponentUpdate(nextProps: Readonly<Props>) {
    const {highlightedMap, data, searchMap, activeSearchIndex, isAutoScrollEnabled, captionProps} = this.props;
    if (
      highlightedMap !== nextProps.highlightedMap ||
      data !== nextProps.data ||
      searchMap !== nextProps.searchMap ||
      activeSearchIndex !== nextProps.activeSearchIndex ||
      isAutoScrollEnabled !== nextProps.isAutoScrollEnabled ||
      captionProps.videoDuration !== nextProps.captionProps.videoDuration
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
      ...this._getSearchProps(id)
    };
    return newCaptionProps;
  };

  private _handleKeyUp = (event: KeyboardEvent) => {
    if (event.keyCode === End) {
      this._lastCaptionRef?._hotspotRef?.focus();
    } else if (event.keyCode === Home) {
      this._firstCaptionRef?._hotspotRef?.focus();
    }
  };

  render() {
    const {data} = this.props;
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
                if (captionProps.highlighted) {
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
