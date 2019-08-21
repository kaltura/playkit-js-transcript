import { h, Component } from "preact";
import * as styles from "./Transcript.scss";
import { ContribLogger, CuepointEngine } from "@playkit-js-contrib/common";
import { Spinner } from "../spinner";
import { CaptionItem } from "../../utils"
import { Hotspot } from "../Hotspot"

export interface KitchenSinkProps {
    seek(time: number): void;
    onClose: () => void;
    onDownload: () => void;
    isLoading: boolean;
    captions: CaptionItem[];
    currentTime: number;
}

interface KitchenSinkState {
    captions: VisibleCaption[];
    preparedCaptions: VisibleCaption[];
}

interface VisibleCaption extends CaptionItem {
    isHighlighted: boolean,
}

export class Transcript extends Component<KitchenSinkProps, KitchenSinkState> {
    log(cb: (logger: ContribLogger) => void): void {
        if (!this.context.logger) {
            return;
        }

        cb(this.context.logger);
    }

    constructor(props: KitchenSinkProps) {
        super(props);
        this.state.preparedCaptions = this._prepareCaptions(props.captions);
    }

    componentDidMount(): void {
        this.log(logger => {
            logger.debug("Mount Transcript component", {
                class: "Transcript",
                method: "componentDidMount"
            });
        });
        this._createEngine();
    }

    componentDidUpdate(
        previousProps: Readonly<KitchenSinkProps>,
        // previousState: Readonly<KitchenSinkState>,
        // previousContext: any
    ): void {
        const { captions } = this.props;
        if (previousProps.captions !== captions) {
            const preparedCaptions = this._prepareCaptions(captions);
            this.setState({
                captions: [],
                preparedCaptions
            }, this._createEngine)
        }

        if (previousProps.currentTime !== this.props.currentTime) {
            this.log(logger => {
                logger.debug("current time updated", {
                    method: "componentDidUpdate"
                });
            });
            this._syncVisibleTranscript();
        }
    }

    componentWillUnmount(): void {
        this.log(logger => {
            logger.debug("Unmount Transcript component", {
                class: "Transcript",
                method: "componentWillUnmount"
            });
        });
        this._reset();
    }

    shouldComponentUpdate(
        nextProps: Readonly<KitchenSinkProps>,
        nextState: Readonly<KitchenSinkState>,
    ) {
        if (nextState.captions !== this.state.captions) {
            return false
        }
        return true
    }

    _engine: CuepointEngine<CaptionItem> | null = null;

    initialState = {
        captions: [],
        preparedCaptions: []
    };

    state: KitchenSinkState = {
        ...this.initialState
    };

    private _prepareCaptions(captions: CaptionItem[]): VisibleCaption[] {
        return captions.map(caption => ({
            ...caption,
            isHighlighted: false,
        }));
    } 

    private _createEngine = () => {
        const {
            preparedCaptions
        } = this.state;
        if (!preparedCaptions || preparedCaptions.length === 0) {
            this._engine = null;
            return;
        }
        this._engine = new CuepointEngine<CaptionItem>(preparedCaptions);
        this._syncVisibleTranscript();
    }

    private _syncVisibleTranscript = (forceSnapshot = false) => {
        const { currentTime } = this.props;
        this.setState((state: KitchenSinkState) => {
            if (!this._engine) {
                return {
                    captions: []
                };
            }

            const transcriptUpdate = this._engine.updateTime(currentTime * 1000, forceSnapshot);
            if (transcriptUpdate.snapshot) {
                let captions: VisibleCaption[] = [...state.preparedCaptions];
                // let captions: VisibleCaption[] = this._prepareCaptions(this.props.captions);
                transcriptUpdate.snapshot.forEach((caption: CaptionItem) => {
                    captions[caption.id - 1].isHighlighted = true;
                })
                return {
                    captions,
                };
            }

            if (!transcriptUpdate.delta) {
                return {
                    captions: state.captions,
                };
            }

            const { show, hide } = transcriptUpdate.delta;

            if (show.length > 0 || hide.length > 0) {
                let captions: VisibleCaption[] = [...state.captions]; // issue with shouldComponentUpdate
                show.forEach((caption: CaptionItem) => {
                    captions[caption.id - 1].isHighlighted = true;
                });

                hide.forEach((caption: CaptionItem) => {
                    captions[caption.id - 1].isHighlighted = false;
                });

                return {
                    captions
                };
            }
        });
    }

    private _reset = () => {
        this._engine = null;

        this.setState({
            ...this.initialState
        });
    };

    private _renderTranscript = (visualHotspot: VisibleCaption[]) => {
        if (!visualHotspot) {
            return null;
        }
        const {
            seek,
            // sendAnalytics
        } = this.props;
        return visualHotspot.map(hotspotData => (
            <Hotspot
                key={hotspotData.id}
                seekTo={seek}
                hotspot={hotspotData}
                // sendAnalytics={sendAnalytics}
            />
        ));
    };

    render(props: KitchenSinkProps) {
        const {
            onClose,
            onDownload,
            isLoading
        } = props;
        const {
            captions,
        } = this.state;
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
                        : this._renderTranscript(captions)
                    }
                </div>
            </div>
        );
    }
}
