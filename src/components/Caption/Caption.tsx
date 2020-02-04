import { h, Component } from "preact";
import * as styles from "./caption.scss";
import { secontsToTime, HOUR, CaptionItem } from "../../utils";

export interface CaptionProps {
    showTime: boolean;
    searchLength: number;
    scrollTo(el: HTMLElement): void;
    videoDuration: number;
}

interface ExtendedCaptionProps extends CaptionProps {
    caption: CaptionItem;
    onClick(): void;
    highlighted: boolean;
    shouldMakeScroll: boolean;
    indexMap: Record<string, number> | undefined;
    activeSearchIndex: number;
    longerThanHour: boolean
}

export class Caption extends Component<ExtendedCaptionProps> {
    private _hotspotRef: HTMLElement | null = null;

    componentDidUpdate() {
        console.log('Update')
        if (this._hotspotRef && this.props.shouldMakeScroll) {
            this.props.scrollTo(this._hotspotRef);
        }
    }

    shouldComponentUpdate(nextProps: ExtendedCaptionProps) {
        if (this.props.highlighted !== nextProps.highlighted) {
            return true;
        }
        if (this.props.indexMap !== nextProps.indexMap) {
            return true;
        }
        if (this.props.indexMap && nextProps.indexMap && this.props.indexMap[this.props.activeSearchIndex] !== nextProps.indexMap[nextProps.activeSearchIndex]) {
            return true;
        }
        return false;
    }

    private _handleClick = () => {
        const { caption, onClick } = this.props;
        if (caption.text.length) {
            onClick();
        }
    };

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
            <div className={styles.caption}>
                {showTime && (
                    <div className={`${styles.captionTime} ${longerThanHour ? styles.longDuration : ""}`}>
                        {secontsToTime(startTime, longerThanHour)}
                    </div>
                )}
                <div
                    onClick={this._handleClick}
                    className={`${styles.captionContent} ${highlighted ? styles.highlighted : ""}`}
                    type="button"
                    ref={node => {
                        this._hotspotRef = node;
                    }}
                >
                    {this._renderText(text)}
                </div>
            </div>
        );
    }
}
