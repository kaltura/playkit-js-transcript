import { h, Component } from "preact";
import { RawHotspotCuepoint, HotspotCuepoint } from "../hotspot";
import Hotspot from "./Hotspot";
import { AnalyticsEvents } from "../analyticsEvents";
import { CuepointOverlayEngine, PlayerSize, VideoSize } from "@playkit-js-contrib/ui";
import { ContribLogger } from "@playkit-js-contrib/common";

export interface StageProps {
    transcript: RawHotspotCuepoint[];
    currentTime: number;
    canvas: {
        playerSize: PlayerSize;
        videoSize: VideoSize;
    };
    pauseVideo(): void;
    seekTo(time: number): void;
    sendAnalytics(event: AnalyticsEvents): void;
}

interface State {
    visibleTranscript: HotspotCuepoint[];
}

export default class Stage extends Component<StageProps, State> {
    log(cb: (logger: ContribLogger) => void): void {
        if (!this.context.logger) {
            return;
        }

        cb(this.context.logger);
    }

    componentWillUnmount(): void {
        this.log(logger => {
            logger.debug("unmount component", {
                class: "Stage",
                method: "componentWillUnmount"
            });
        });
    }

    engine: CuepointOverlayEngine<RawHotspotCuepoint, HotspotCuepoint> | null = null;

    initialState = {
        visibleTranscript: []
    };

    state: State = {
        ...this.initialState
    };

    componentDidUpdate(
        previousProps: Readonly<StageProps>,
        previousState: Readonly<State>,
        previousContext: any
    ): void {
        if (previousProps.transcript !== this.props.transcript) {
            this._createEngine();
        }

        if (previousProps.currentTime !== this.props.currentTime) {
            this.log(logger => {
                logger.debug("current time updated", {
                    method: "componentDidUpdate"
                });
            });
            this.syncVisibleTranscript();
        }

        if (previousProps.canvas !== this.props.canvas) {
            this.log(logger => {
                logger.debug("canvas updated", {
                    method: "componentDidUpdate"
                });
            });
            this.handleResize();
        }
    }

    private _createEngine() {
        const {
            transcript,
            canvas: { playerSize, videoSize }
        } = this.props;

        if (!transcript || transcript.length === 0) {
            this.engine = null;
            return;
        }

        this.engine = new CuepointOverlayEngine<RawHotspotCuepoint, HotspotCuepoint>(transcript);
        this.engine.updateLayout(playerSize, videoSize);
    }

    componentDidMount() {
        this.log(logger => {
            logger.info("mount component", {
                method: "componentDidMount"
            });
        });

        this.reset();
        this._createEngine();
        this.syncVisibleTranscript();
    }

    private syncVisibleTranscript(forceSnapshot = false) {
        const { currentTime } = this.props;

        this.setState((state: State) => {
            if (!this.engine) {
                return {
                    visibleTranscript: []
                };
            }

            const transcriptUpdate = this.engine.updateTime(currentTime, forceSnapshot);
            if (transcriptUpdate.snapshot) {
                return {
                    visibleTranscript: transcriptUpdate.snapshot
                };
            }

            if (!transcriptUpdate.delta) {
                return {
                    visibleTranscript: []
                };
            }

            const { show, hide } = transcriptUpdate.delta;

            if (show.length !== 0 || hide.length !== 0) {
                let visibleTranscript: HotspotCuepoint[] = state.visibleTranscript;
                show.forEach((hotspot: HotspotCuepoint) => {
                    const index = visibleTranscript.indexOf(hotspot);
                    if (index === -1) {
                        visibleTranscript.push(hotspot);
                    }
                });

                hide.forEach((hotspot: HotspotCuepoint) => {
                    const index = visibleTranscript.indexOf(hotspot);
                    if (index !== -1) {
                        visibleTranscript.splice(index, 1);
                    }
                });

                return {
                    visibleTranscript
                };
            }
        });
    }

    handleResize = (): void => {
        const {
            canvas: { playerSize, videoSize }
        } = this.props;
        if (this.engine) {
            this.engine.updateLayout(playerSize, videoSize);
            this.syncVisibleTranscript(true);
        }
    };

    private reset = () => {
        this.engine = null;

        this.setState({
            ...this.initialState
        });
    };

    private renderTranscript = (visualHotspot: HotspotCuepoint[]) => {
        if (!visualHotspot) {
            return null;
        }

        const { seekTo, pauseVideo, sendAnalytics } = this.props;

        return visualHotspot.map(hotspotData => (
            <Hotspot
                pauseVideo={pauseVideo}
                seekTo={seekTo}
                key={hotspotData.id}
                visible={true}
                hotspot={hotspotData}
                sendAnalytics={sendAnalytics}
            />
        ));
    };

    render() {
        const { visibleTranscript } = this.state;
        const transcriptElements = this.renderTranscript(visibleTranscript);

        const style = {
            position: "absolute",
            display: "block",
            overflow: "visible",
            top: 0,
            left: 0,
            width: 0,
            height: 0
        };

        return <div style={style}>{transcriptElements}</div>;
    }
}
