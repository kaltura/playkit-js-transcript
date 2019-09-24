import { h, Component } from "preact";
import * as styles from "./caption.scss";
import { secontsToTime } from "../../utils";
import { CaptionItem } from "../../utils";

type CaptionProps = {
    caption: CaptionItem;
    onClick(): void;
    highlighted: boolean;
    isAutoScrollEnabled: boolean;
    showTime: boolean;
    scrollTo(el: HTMLElement): void;
    searchLength: number;
    indexMap: Record<string, number> | undefined;
    activeSearchIndex: number;
};

export class Caption extends Component<CaptionProps> {
    private _hotspotRef: HTMLElement | null = null;

    componentDidUpdate() {
        if (this._hotspotRef && this.props.isAutoScrollEnabled) {
            this.props.scrollTo(this._hotspotRef);
        }
    }

    private _renderText = (text: string) => {
        const { activeSearchIndex, searchLength, indexMap } = this.props;
        let indexArray: string[] = [];
        if (indexMap) {
            indexArray = Object.keys(indexMap).sort((a, b) => Number(a) - Number(b));
        }
        return (
            <span className={styles.captionSpan}>
                {indexMap
                    ? indexArray.map((el: string, index: number) => {
                          return (
                              <span>
                                  {index === 0 && text.substring(0, indexMap[el])}
                                  <span
                                      className={
                                          Number(el) === activeSearchIndex
                                              ? styles.activeSearch
                                              : styles.highlightSearch
                                      }
                                  >
                                      {text.substring(indexMap[el], indexMap[el] + searchLength)}
                                  </span>
                                  {text.substring(
                                      indexMap[el] + searchLength,
                                      index - 1 === indexArray.length
                                          ? text.length
                                          : indexMap[indexArray[index + 1]]
                                  )}
                              </span>
                          );
                      })
                    : text}
            </span>
        );
    };

    render() {
        const { caption, highlighted, showTime, onClick } = this.props;
        const { text, startTime } = caption;

        return (
            <tr className={styles.caption}>
                {showTime && <td className={styles.captionTime}>{secontsToTime(startTime)}</td>}
                <td
                    onClick={onClick}
                    className={`${styles.captionContent} ${highlighted ? styles.highlighted : ""}`}
                    type="button"
                    ref={node => {
                        this._hotspotRef = node;
                    }}
                >
                    {this._renderText(text)}
                </td>
            </tr>
        );
    }
}
