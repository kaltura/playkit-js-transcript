import * as styles from './caption.scss';
import {secontsToTime} from '../../utils';
import {ItemData} from '../../types';

const {ENTER, Space} = KalturaPlayer.ui.utils.KeyMap;

import {Component, h} from 'preact';

export interface CaptionProps {
  showTime: boolean;
  searchLength: number;
  scrollTo(el: HTMLElement): void;
  scrollToSearchMatch(el: HTMLElement): void;
  videoDuration: number;
}

interface ExtendedCaptionProps extends CaptionProps {
  caption: ItemData;
  onClick: () => void;
  highlighted: boolean;
  shouldScroll: boolean;
  shouldScrollToSearchMatch: boolean;
  indexMap: Record<string, number> | undefined;
  activeSearchIndex: number;
  longerThanHour: boolean;
  isAutoScrollEnabled: boolean;
}

export class Caption extends Component<ExtendedCaptionProps> {
  private _hotspotRef: HTMLElement | null = null;

  componentDidUpdate() {
    if (this._hotspotRef && this.props.shouldScroll) {
      this.props.scrollTo(this._hotspotRef);
    } else if (this._hotspotRef && this.props.shouldScrollToSearchMatch) {
      this.props.scrollToSearchMatch(this._hotspotRef);
    }
  }

  shouldComponentUpdate(nextProps: ExtendedCaptionProps) {
    const {indexMap, highlighted, isAutoScrollEnabled, activeSearchIndex, longerThanHour, caption} = this.props;
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

  private _handleKeyPress = (event: KeyboardEvent) => {
    const keyCode = event.which || event.keyCode;
    if (keyCode === ENTER || keyCode === Space) {
      event.preventDefault();
      this._gotoCurrentTime();
      return;
    }
  };

  private _handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    this._hotspotRef?.focus();
    this._gotoCurrentTime();
  };

  private _gotoCurrentTime = () => {
    const {caption, onClick} = this.props;
    if (caption.displayTitle.length) {
      onClick();
    }
  };

  private _renderText = (text: string) => {
    const {activeSearchIndex, searchLength, indexMap} = this.props;
    let indexArray: string[] = [];
    if (indexMap) {
      indexArray = Object.keys(indexMap).sort((a, b) => Number(a) - Number(b));
    }
    if (text.length === 0) {
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
    const {caption, highlighted, showTime, longerThanHour} = this.props;
    const {startTime, id} = caption;
    const isHighlighted = Object.keys(highlighted)[0] === id;
    return (
      <div
        className={styles.caption}
        tabIndex={1}
        ref={node => {
          this._hotspotRef = node;
        }}
        onKeyDown={this._handleKeyPress}
      >
        {showTime && <div className={styles.captionTime}>{secontsToTime(startTime, longerThanHour)}</div>}
        <div
          onClick={this._handleClick}
          className={`${styles.captionContent} ${isHighlighted ? styles.highlighted : ''} ${showTime ? '' : styles.withoutTime}`}
          role="button"
        >
          {this._renderText(caption.displayTitle)}
        </div>
      </div>
    );
  }
}
