import { h, Component } from "preact";
import * as styles from "./Transcript.scss";

export interface KitchenSinkProps {
    onClose: () => void;
}

export class Transcript extends Component<KitchenSinkProps> {
    componentDidMount(): void {
        console.log(`>>>>>>>>>>>>>>> QandA componentDidMount`);
    }

    componentWillUnmount(): void {
        console.log(`>>>>>>>>>>>>>>> QandA componentWillUnmount`);
    }

    render(props: KitchenSinkProps) {
        const { onClose } = props;
        return (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.title}>Transcript</div>
                    <div className={styles.closeButton} onClick={onClose} />
                </div>
                <div className={styles.body}>

                </div>
            </div>
        );
    }
}
