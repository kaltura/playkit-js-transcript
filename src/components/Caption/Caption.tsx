import { h, Component } from "preact";
import { KeyboardKeys } from "@playkit-js-contrib/ui";
import * as styles from "./caption.scss";
import { secontsToTime, CaptionItem } from "../../utils";

export interface CaptionProps {
    showTime: boolean;
    searchLength: number;
    scrollTo(el: HTMLElement): void;
    scrollToSearchMatch(el: HTMLElement): void;
    videoDuration: number;
}

interface ExtendedCaptionProps extends CaptionProps {
    caption: CaptionItem;
    onClick(): void;
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
        const {
            indexMap,
            highlighted,
            isAutoScrollEnabled,
            activeSearchIndex,
            longerThanHour,
        } = this.props;
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
        if (
            event.keyCode === KeyboardKeys.Enter ||
            event.keyCode === KeyboardKeys.Space
        ) {
            event.preventDefault();
            this._gotoCurrentTime();
            return;
        }
    }

    private _gotoCurrentTime = () => {
        const { caption, onClick } = this.props;
        if (caption.text.length) {
            onClick();
        }
    }

    private _renderText = (text: string) => {
        const { activeSearchIndex, searchLength, indexMap } = this.props;
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
                          const preSelected = index === 0 ? text.substring(0, indexMap[el]) : "";
                          const selected = text.substring(
                              indexMap[el],
                              indexMap[el] + searchLength
                          );
                          const postSelected = text.substring(
                              indexMap[el] + searchLength,
                              index - 1 === indexArray.length
                                  ? text.length
                                  : indexMap[indexArray[index + 1]]
                          );
                          return (
                              <span>
                                  {preSelected}
                                  <span
                                      className={
                                          Number(el) === activeSearchIndex
                                              ? styles.activeSearch
                                              : styles.highlightSearch
                                      }
                                  >
                                      {selected}
                                  </span>
                                  {postSelected}
                              </span>
                          );
                      })
                    : text}
            </span>
        );
    };

    render() {
        const { caption, highlighted, showTime, longerThanHour } = this.props;
        const { text, startTime } = caption;

        return (
            <div
                className={styles.caption}
                tabIndex={1}
                ref={node => {
                    this._hotspotRef = node;
                }}
                onKeyPress={this._handleKeyPress}
            >
                {showTime && (
                    <div className={styles.captionTime}>
                        {secontsToTime(startTime, longerThanHour)}
                    </div>
                )}
                <div
                    onClick={this._gotoCurrentTime}
                    className={`${styles.captionContent} ${highlighted ? styles.highlighted : ""} ${showTime ? "" : styles.withoutTime}`}
                    role="button"
                >
                    {this._renderText(text)}
                </div>
            </div>
        );
    }
}
