import {Component, h} from 'preact';
import {A11yWrapper, OnClickEvent} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {secontsToTime} from '../../utils';
import {CuePointData} from '../../types';
import * as styles from './caption.scss';

export interface CaptionProps {
  showTime: boolean;
  searchLength: number;
  scrollTo(el: HTMLElement): void;
  scrollToSearchMatch(el: HTMLElement): void;
  videoDuration: number;
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

interface CaptionState {
  focused: boolean;
}

export class Caption extends Component<ExtendedCaptionProps, CaptionState> {
  private _hotspotRef: HTMLElement | null = null;

  state = {focused: false};

  componentDidUpdate() {
    if (this._hotspotRef && this.props.shouldScroll) {
      this.props.scrollTo(this._hotspotRef);
    } else if (this._hotspotRef && this.props.shouldScrollToSearchMatch) {
      this.props.scrollToSearchMatch(this._hotspotRef);
    }
  }

  shouldComponentUpdate(nextProps: ExtendedCaptionProps, nextState: CaptionState) {
    const {indexMap, highlighted, isAutoScrollEnabled, activeSearchIndex, longerThanHour, caption} = this.props;
    if (longerThanHour !== nextProps.longerThanHour) {
      return true;
    }
    if (highlighted !== nextProps.highlighted || this.state.focused !== nextState.focused) {
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

  private _handleKeyDown = (event: OnClickEvent, byKeyboard?: boolean) => {
    if (byKeyboard) {
      event.preventDefault();
      this._gotoCurrentTime();
    }
  };

  private _handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    this._hotspotRef?.focus();
    this._gotoCurrentTime();
  };

  private _gotoCurrentTime = () => {
    const {caption, onClick} = this.props;
    if (caption.text.length) {
      onClick();
    }
  };

  private _renderText = (text: string) => {
    const {activeSearchIndex, searchLength, indexMap} = this.props;
    let indexArray: string[] = [];
    if (indexMap) {
      indexArray = Object.keys(indexMap).sort((a, b) => Number(a) - Number(b));
    }
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

  private _handleFocus = () => {
    this.setState({
      focused: true
    });
  };

  private _handleBlur = () => {
    this.setState({
      focused: false
    });
  };

  render() {
    const {caption, highlighted, showTime, longerThanHour} = this.props;
    const {startTime, id} = caption;
    const isHighlighted = Object.keys(highlighted)[0] === id;

    const captionA11yProps: Record<string, any> = {
      ariaCurrent: isHighlighted,
      onFocus: this._handleFocus,
      onBlur: this._handleBlur,
      tabIndex: 0,
      ariaHidden: !(isHighlighted || this.state.focused)
    };

    return (
      <A11yWrapper onClick={this._handleKeyDown} role={isHighlighted ? 'text' : 'listitem'}>
        <div
          className={styles.caption}
          ref={node => {
            this._hotspotRef = node;
          }}
          {...captionA11yProps}>
          {showTime && <div className={styles.captionTime}>{secontsToTime(startTime, longerThanHour)}</div>}
          <div
            onClick={this._handleClick}
            className={`${styles.captionContent} ${isHighlighted ? styles.highlighted : ''} ${showTime ? '' : styles.withoutTime}`}>
            {this._renderText(caption.text)}
          </div>
        </div>
      </A11yWrapper>
    );
  }
}
