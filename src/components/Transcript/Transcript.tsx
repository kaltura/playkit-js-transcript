import { h, Component } from "preact";
import * as styles from "./Transcript.scss";
import { ContribLogger } from "@playkit-js-contrib/common";
import { Spinner } from "../spinner";

export interface Caption {
    id: number;
    startTime: number;
    endTime: number;
    text?: string;
}

export interface KitchenSinkProps {
    seek: any;
    onClose: () => void;
    onDownload: () => void;
    isLoading: boolean;
    captions: Caption[];
    currentTime: number;
}

export class Transcript extends Component<KitchenSinkProps> {
    log(cb: (logger: ContribLogger) => void): void {
        if (!this.context.logger) {
            return;
        }

        cb(this.context.logger);
    }

    componentDidMount(): void {
        this.log(logger => {
            logger.debug("Mount Transcript component", {
                class: "Transcript",
                method: "componentDidMount"
            });
        });
    }

    componentWillUnmount(): void {
        this.log(logger => {
            logger.debug("Unmount Transcript component", {
                class: "Transcript",
                method: "componentWillUnmount"
            });
        });
    }

    render(props: KitchenSinkProps) {
        const {
            onClose,
            onDownload,
            isLoading,
            captions,
            currentTime
        } = props;
        console.log('currentTime ----- >', currentTime)
        return (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.title}>Transcript</div>
                    <div className={styles.downloadButton} onClick={onDownload} />
                    <div className={styles.closeButton} onClick={onClose} />
                </div>
                <div className={styles.body}>
                    {isLoading
                    ? (
                        <div className={styles.loadingWrapper}>
                            <Spinner />
                        </div>
                    )
                    : (
                        captions.map((cuePoint: Caption)  => (
                            <p
                                key={cuePoint.id}
                                className={styles.caption}
                            >{cuePoint.text}</p>
                        ))
                    )}
                </div>
            </div>
        );
    }
}
