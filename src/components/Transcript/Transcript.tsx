import { h, Component } from "preact";
import * as styles from "./Transcript.scss";

export interface Caption {
    id: number;
    startTime: number;
    endTime: number;
    text?: string;
}

export interface KitchenSinkProps {
    onClose: () => void;
    onDownload: () => void;
    isLoading: boolean;
    captions: Caption[];
}

export class Transcript extends Component<KitchenSinkProps> {
    componentDidMount(): void {
        // console.log(`>>>>>>>>>>>>>>> QandA componentDidMount`);
    }

    componentWillUnmount(): void {
        // console.log(`>>>>>>>>>>>>>>> QandA componentWillUnmount`);
    }

    render(props: KitchenSinkProps) {
        console.log('transcript renders', props)
        const { onClose, onDownload, isLoading, captions } = props;
        return (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.title}>Transcript</div>
                    <div className={styles.downloadButton} onClick={onDownload} />
                    <div className={styles.closeButton} onClick={onClose} />
                </div>
                <div className={styles.body}>
                    {captions.map((cuePoint: Caption)  => (
                        <p
                            key={cuePoint.id}
                            className={styles.caption}
                        >{cuePoint.text}</p>
                    ))}
                </div>
            </div>
        );
    }
}
