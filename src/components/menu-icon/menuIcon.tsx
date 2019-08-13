import { h, Component } from "preact";
import * as styles from "./menuIcon.scss";

export class MenuIcon extends Component {
    componentDidMount(): void {
        console.log(`>>>>>>>>>>>>>>> MenuIcon componentDidMount`);
    }

    componentWillUnmount(): void {
        console.log(`>>>>>>>>>>>>>>> MenuIcon componentWillUnmount`);
    }

    render() {
        return <div className={styles.icon} />;
    }
}
