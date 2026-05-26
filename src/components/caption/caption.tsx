import {Component, h} from 'preact';
import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {secondsToTime} from '../../utils';
import {CuePointData} from '../../types';
import * as styles from './caption.scss';

import {TranscriptEvents} from '../../events/events';

//@ts-ignore
const {getDurationAsText} = KalturaPlayer.ui.utils;
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
  setTextToRead: (textToRead: string, delay?: number) => void;
}

interface ExtendedCaptionProps extends CaptionProps {
  caption: CuePointData;
  onClick: () => void;
  isHighlighted: boolean;
  shouldScroll: boolean;
  shouldScrollToSearchMatch: boolean;
  indexMap: Record<string, number> | undefined;
  activeSearchIndex: number;
  longerThanHour: boolean;
  isAutoScrollEnabled: boolean;
  onUpKeyPressed?: (e: KeyboardEvent) => void;
  onDownKeyPressed?: (e: KeyboardEvent) => void;
  includeNavigationInstructions?: boolean;
  jumpTo?: string;
  navigationInstruction?: string;
}

const translates = {
  jumpTo: <Text id="transcript.jump_to">Jump to</Text>,
  navigationInstruction: (
    <Text id="transcript.navigation_instruction">
      Press Home to navigate to the beginning of the transcript. Press End to jump to the end of the transcript.
    </Text>
  )
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

    eventManager?.listen(player, TranscriptEvents.TRANSCRIPT_SCROLLING, () => {
      if (this._captionRef && this._hasSearchMatch()) {
        this.props.scrollTo(this._captionRef);
      }
    });
  }

  shouldComponentUpdate(nextProps: ExtendedCaptionProps) {
    const {indexMap, isHighlighted, isAutoScrollEnabled, activeSearchIndex, longerThanHour} = this.props;
    if (longerThanHour !== nextProps.longerThanHour) {
      return true;
    }
    if (isHighlighted !== nextProps.isHighlighted) {
      return true;
    }
    if (isHighlighted && isAutoScrollEnabled !== nextProps.isAutoScrollEnabled) {
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
    const styleDetachedProtection = !!this.props.player?.config.ui.isCopyProtected ? styles.noCopyDetached : '';
    return (
      <span className={`${styles.captionSpan} no-copy ${styleDetachedProtection}`}>
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
    const {caption, isHighlighted, showTime, longerThanHour, indexMap, jumpTo, player, includeNavigationInstructions, navigationInstruction} =
      this.props;
    const {startTime} = caption;
    const time = showTime ? secondsToTime(startTime, longerThanHour) : '';
    // Always include timestamp in aria-label for screen reader navigation, regardless of showTime visual display setting
    const baseLabel = `${jumpTo} ${getDurationAsText(Math.floor(startTime), player?.config.ui.locale, true)}. ${caption.text}`;
    const ariaLabel = includeNavigationInstructions ? `${baseLabel}${/[.!?]$/.test(baseLabel.trim()) ? ' ' : '. '}${navigationInstruction}` : baseLabel;

    const captionA11yProps: Record<string, any> = {
      ariaCurrent: isHighlighted,
      tabIndex: 0,
      ariaLabel,
      role: 'button'
    };

    return (
      <A11yWrapper
        onClick={this._handleClick}
        onUpKeyPressed={(e: KeyboardEvent) => this.props.onUpKeyPressed?.(e)}
        onDownKeyPressed={(e: KeyboardEvent) => this.props.onDownKeyPressed?.(e)}
      >
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
