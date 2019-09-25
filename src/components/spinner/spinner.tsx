import { h, Component } from "preact";
import * as styles from "./spinner.scss";

export class Spinner extends Component {
    render() {
        return (
            <div className={styles.spinnerBall}>
                <div className={styles.doubleBounce1} />
                <div className={styles.doubleBounce2} />
            </div>
        );
    }
}
