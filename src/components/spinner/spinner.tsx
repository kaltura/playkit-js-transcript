import * as styles from "./spinner.scss";
const { h, Component } = KalturaPlayer.ui.preact;

export class Spinner extends Component {
    render() {
        return (
            <div className={styles.spinnerBall}>
                <div className={styles.bounceFrame} />
            </div>
        );
    }
}
