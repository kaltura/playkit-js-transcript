import { h, Component } from "preact";
import * as styles from "./Hotspot.scss";

type Props = {
    hotspot: any;
    seekTo(time: number): void;
    highlighted: boolean;
};


export class Hotspot extends Component<Props> {
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
            >
                {text}
            </p>
        );
    }
}
