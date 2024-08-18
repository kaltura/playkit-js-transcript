import {Component, h} from 'preact';
import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {secondsToTime} from '../../utils';
import {CuePointData} from '../../types';
import * as styles from './caption.scss';

import {TranscriptEvents} from '../../events/events';

const {withText, Text} = KalturaPlayer.ui.preacti18n;
const {withEventManager} = KalturaPlayer.ui.Event;
const {withPlayer} = KalturaPlayer.ui.components;

export interface CaptionProps {
  showTime: boolean;
  searchLength: number;
  scrollTo(el: HTMLElement): void;
  scrollToSearchMatch(el: HTMLElement): void;
  videoDuration: number;
  eventManager?: any;
  player?: any;
  captionLabel?: string;
  moveToSearch?: string;
  setTextToRead: (textToRead: string, delay?: number) => void;
}

interface ExtendedCaptionProps extends CaptionProps {
  caption: CuePointData;
  onClick: () => void;
  highlighted: boolean;
  shouldScroll: boolean;
  shouldScrollToSearchMatch: boolean;
  indexMap: Record<string, number> | undefined;
  activeSearchIndex: number;
  longerThanHour: boolean;
  isAutoScrollEnabled: boolean;
}

const translates = {
  captionLabel: <Text id="transcript.caption_label">Jump to this point in video</Text>,
  moveToSearch: <Text id="transcript.move_to_search">Click to jump to search result</Text>
};

@withText(translates)
@withEventManager
@withPlayer
export class Caption extends Component<ExtendedCaptionProps> {
  private _captionRef: HTMLElement | null = null;

  get indexArray() {
    if (!this.props.indexMap) {
      return [];
    }
    return Object.keys(this.props.indexMap).sort((a, b) => Number(a) - Number(b));
  }

  componentDidUpdate(previousProps: Readonly<ExtendedCaptionProps>) {
    if (this._captionRef && this.props.shouldScroll) {
      this.props.scrollTo(this._captionRef);
    } else if (this._captionRef && this.props.shouldScrollToSearchMatch) {
      this.props.scrollToSearchMatch(this._captionRef);
    }
    if (this.props.indexMap && previousProps.activeSearchIndex !== this.props.activeSearchIndex) {
      if (this._hasSearchMatch()) {
        this.props.setTextToRead(this.props.caption.text);
      }
    }
  }

  componentDidMount(): void {
    const {eventManager, player} = this.props;
    eventManager?.listen(player, TranscriptEvents.TRANSCRIPT_TO_SEARCH_MATCH, () => {
      if (this._hasSearchMatch()) {
        this._captionRef?.focus();
      }
    });
  }

  shouldComponentUpdate(nextProps: ExtendedCaptionProps) {
    const {indexMap, highlighted, isAutoScrollEnabled, activeSearchIndex, longerThanHour} = this.props;
    if (longerThanHour !== nextProps.longerThanHour) {
      return true;
    }
    if (highlighted !== nextProps.highlighted) {
      return true;
    }
    if (highlighted && isAutoScrollEnabled !== nextProps.isAutoScrollEnabled) {
      return true;
    }
    if (indexMap !== nextProps.indexMap) {
      return true;
    }
    if (indexMap && nextProps.indexMap && indexMap[activeSearchIndex] !== nextProps.indexMap[nextProps.activeSearchIndex]) {
      return true;
    }
    return false;
  }

  private _handleClick = () => {
    this._gotoCurrentTime();
  };

  private _gotoCurrentTime = () => {
    const {caption, onClick} = this.props;
    if (caption.text.length) {
      onClick();
    }
  };

  private _hasSearchMatch = () => {
    if (!this.props.indexMap) {
      return false;
    }
    return Boolean(this.indexArray.find((el: string) => Number(el) === this.props.activeSearchIndex));
  };

  private _renderText = (text: string) => {
    const {activeSearchIndex, searchLength, indexMap} = this.props;
    const indexArray = this.indexArray;
    if (text?.length === 0) {
      return null;
    }
    return (
      <span className={styles.captionSpan}>
        {indexMap
          ? indexArray.map((el: string, index: number) => {
              const preSelected = index === 0 ? text.substring(0, indexMap[el]) : '';
              const selected = text.substring(indexMap[el], indexMap[el] + searchLength);
              const postSelected = text.substring(
                indexMap[el] + searchLength,
                index - 1 === indexArray.length ? text.length : indexMap[indexArray[index + 1]]
              );
              return (
                <span>
                  {preSelected}
                  <span className={Number(el) === activeSearchIndex ? styles.activeSearch : styles.highlightSearch}>{selected}</span>
                  {postSelected}
                </span>
              );
            })
          : text}
      </span>
    );
  };

  render() {
    const {caption, highlighted, showTime, longerThanHour, indexMap, captionLabel, moveToSearch} = this.props;
    const {startTime, id} = caption;
    const isHighlighted = Object.keys(highlighted).some(c => c === id);
    const time = showTime ? secondsToTime(startTime, longerThanHour) : '';

    const captionA11yProps: Record<string, any> = {
      ariaCurrent: isHighlighted,
      tabIndex: 0,
      ariaLabel: `${time}${showTime ? ' ' : ''}${caption.text} ${indexMap ? moveToSearch : captionLabel}`,
      role: 'button'
    };

    return (
      <A11yWrapper onClick={this._handleClick}>
        <div
          className={styles.caption}
          ref={node => {
            this._captionRef = node;
          }}
          {...captionA11yProps}>
          {showTime && (
            <div className={styles.captionTime} aria-hidden="true">
              {time}
            </div>
          )}
          <div
            aria-hidden="true"
            className={`${styles.captionContent} ${isHighlighted ? styles.highlighted : ''} ${showTime ? '' : styles.withoutTime}`}>
            {this._renderText(caption.text)}
          </div>
        </div>
      </A11yWrapper>
    );
  }
}
