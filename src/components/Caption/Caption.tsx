import { h, Component } from "preact";
import * as styles from "./Caption.scss";
import { secontsToTime } from "../../utils";

type CaptionProps = {
    caption: any;
    seekTo(time: number): void;
    highlighted: boolean;
    isAutoScrollEnabled: boolean;
    showTime: boolean;
    scrollTo(el: HTMLElement, isAutoScroll: boolean): void;
    searchIndex: number;
    searchLength: number;
};

export class Caption extends Component<CaptionProps> {
    private _hotspotRef: HTMLElement | null = null;

    componentDidUpdate() {
        if (this._hotspotRef) {
            this.props.scrollTo(this._hotspotRef, true);
        }
    }

    shouldComponentUpdate(nextProps: Readonly<CaptionProps>) {
        if (
            nextProps.highlighted !== this.props.highlighted ||
            nextProps.caption !== this.props.caption ||
            nextProps.searchIndex !== this.props.searchIndex ||
            nextProps.searchLength !== this.props.searchLength ||
            nextProps.isAutoScrollEnabled !== this.props.isAutoScrollEnabled
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
        const { searchIndex, searchLength } = this.props;
        return (
            <span className={styles.captionSpan}>
                {searchIndex > -1 ? (
                    <span>
                        {text.substring(0, searchIndex)}
                        <span className={styles.highlightSearch}>
                            {text.substring(searchIndex, searchIndex + searchLength)}
                        </span>
                        {text.substring(searchIndex + searchLength)}
                    </span>
                ) : (
                    text
                )}
            </span>
        );
    };

    render() {
        const { caption, highlighted, showTime } = this.props;
        const { text, startTime } = caption;

        return (
            <tr className={styles.caption}>
                {showTime && <td className={styles.captionTime}>{secontsToTime(startTime)}</td>}
                <td
                    onClick={this._handleClick}
                    className={`${styles.captionContent} ${highlighted ? styles.highlighted : ""}`}
                    type="button"
                    ref={node => {
                        this._hotspotRef = highlighted ? node : null;
                    }}
                >
                    {this._renderText(text)}
                </td>
            </tr>
        );
    }
}
