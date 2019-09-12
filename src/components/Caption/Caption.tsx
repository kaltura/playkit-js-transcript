import { h, Component } from "preact";
import * as styles from "./Caption.scss";
import { secontsToTime } from "../../utils";

type CaptionProps = {
    caption: any;
    seekTo(time: number): void;
    highlighted: boolean;
    isAutoScrollEnabled: boolean;
    showTime: boolean;
    scrollTo(el: HTMLElement): void;
    searchLength: number;
    indexMap: Record<string, number> | undefined
    activeSearchIndex: number;
};

export class Caption extends Component<CaptionProps> {
    private _hotspotRef: HTMLElement | null = null;

    componentDidUpdate() {
        if (this._hotspotRef) {
            this.props.scrollTo(this._hotspotRef);
        }
    }

    shouldComponentUpdate(nextProps: Readonly<CaptionProps>) {
        if (
            nextProps.highlighted !== this.props.highlighted ||
            nextProps.caption !== this.props.caption ||
            nextProps.indexMap !== this.props.indexMap ||
            nextProps.searchLength !== this.props.searchLength ||
            nextProps.isAutoScrollEnabled !== this.props.isAutoScrollEnabled ||
            nextProps.activeSearchIndex !== this.props.activeSearchIndex
        ) {
            return true;
        }
        return false;
    }

    private _handleClick = () => {
        const { caption, seekTo } = this.props;
        seekTo(caption.startTime);
    };

    private _renderText = (text: string) => {
        const { activeSearchIndex, searchLength, indexMap } = this.props;
        let indexArray: string[] = [];
        if (indexMap) {
            indexArray = Object.keys(indexMap)
                .sort((a, b) => Number(a) - Number(b));
        }
        return (
            <span className={styles.captionSpan}>
                {indexMap ? (
                    indexArray.map((el: string, index: number) => {
                        return (
                            <span>
                                {index === 0 && text.substring(0, indexMap[el])}
                                <span className={Number(el) === activeSearchIndex ? styles.activeSearch : styles.highlightSearch}>
                                    {text.substring(indexMap[el], indexMap[el] + searchLength)}
                                </span>
                                {text.substring(indexMap[el] + searchLength, index - 1 === indexArray.length ? text.length : indexMap[indexArray[index + 1]])}
                            </span>
                        )
                    })
                ) : (
                    text
                )}
            </span>
        );
    };

    render() {
        const { caption, highlighted, showTime, isAutoScrollEnabled } = this.props;
        const { text, startTime } = caption;

        return (
            <tr className={styles.caption}>
                {showTime && <td className={styles.captionTime}>{secontsToTime(startTime)}</td>}
                <td
                    onClick={this._handleClick}
                    className={`${styles.captionContent} ${highlighted ? styles.highlighted : ""}`}
                    type="button"
                    ref={node => {
                        this._hotspotRef = isAutoScrollEnabled ? node : null;
                    }}
                >
                    {this._renderText(text)}
                </td>
            </tr>
        );
    }
}
