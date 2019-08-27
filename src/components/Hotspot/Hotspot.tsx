import { h, Component } from "preact";
import * as styles from "./Hotspot.scss";

type Props = {
    hotspot: any;
    seekTo(time: number): void;
    highlighted: boolean;
    scrollTo(el: HTMLElement, isAutoScroll: boolean): void;
};


export class Hotspot extends Component<Props> {
    private _hotspotRef: HTMLElement | null = null;

    componentDidUpdate() {
        if (this._hotspotRef) {
            this.props.scrollTo(this._hotspotRef, true);
        }
    }

    handleClick = () => {
        const { hotspot, seekTo } = this.props;
        seekTo(hotspot.startTime);
    };

    render() {
        const { hotspot, highlighted } = this.props;
        const { text } = hotspot;

        return (
            <p 
                onClick={this.handleClick}
                className={styles.caption}
                style={{ color: highlighted ? "yellow" : "white"}}
                type="button"
                ref={node => {
                    this._hotspotRef = highlighted ? node : null;
                }}
            >
                {text}
            </p>
        );
    }
}
