import { h, Component } from "preact";
import * as styles from "./Caption.scss";
import { secontsToTime } from "../../utils";

type Props = {
    caption: any;
    seekTo(time: number): void;
    highlighted: boolean;
    scrollTo(el: HTMLElement, isAutoScroll: boolean): void;
    search: string;
};

export class Caption extends Component<Props> {
    private _hotspotRef: HTMLElement | null = null;

    componentDidUpdate() {
        if (this._hotspotRef) {
            this.props.scrollTo(this._hotspotRef, true);
        }
    }

    private _handleClick = () => {
        const { caption, seekTo } = this.props;
        seekTo(caption.startTime);
    };

    private _renderText = (text: string) => {
        const lcText = text.toLowerCase();
        const lcSearch = this.props.search.toLowerCase();
        const index = lcText.indexOf(lcSearch);
        return (
            <span className={styles.captionSpan}>
                {(lcSearch && index > -1) ? (
                    <span>
                        {text.substring(0, index)}
                        <span className={styles.highlightSearch}>
                            {text.substring(index, index + lcSearch.length)}
                        </span>
                        {text.substring(index + lcSearch.length)}
                    </span>
                ) : (
                    text
                )}
            </span>
        );
    };

    render() {
        const { caption, highlighted } = this.props;
        const { text, startTime } = caption;

        return (
            <tr className={styles.caption}>
                <td className={styles.captionTime}>{secontsToTime(startTime)}</td>
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
