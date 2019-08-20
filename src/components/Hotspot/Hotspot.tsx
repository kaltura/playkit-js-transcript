import { h, Component } from "preact";
import { HotspotCuepoint } from "../../shared/hotspot";
// import { AnalyticsEvents } from "../../shared/analyticsEvents";
import * as styles from "./Hotspot.scss";

// declare const window: any;

// const defaultButtonsStyles = {
//     position: "relative",
//     width: "100%",
//     height: "100%",
//     appearance: "none",
//     border: "none",
//     display: "table-cell",
//     verticalAlign: "middle",
//     textAlign: "center",
//     cursor: "pointer",
//     wordBreak: "break-all",
//     textRendering: "geometricPrecision"
// };

type Props = {
    visible: boolean;
    hotspot: HotspotCuepoint;
    // styles?: { [key: string]: any };
    // pauseVideo(): void;
    // seekTo(time: number): void;
    // sendAnalytics(event: AnalyticsEvents): void;
};

type State = {
    disableClick: boolean;
    isReady: boolean;
};

const defaultProps = {
    styles: {}
};

function prepareUrl(url: string): string {
    if (!url.match(/^https?:\/\//i)) {
        url = "http://" + url;
    }
    return url;
}

export class Hotspot extends Component<Props, State> {
    static defaultProps = defaultProps;

    state = {
        disableClick: true,
        isReady: false
    };

    componentDidMount() {
        const { hotspot } = this.props;

        if (!hotspot || !hotspot.onClick) {
            this.setState({
                isReady: true
            });
            return;
        }

        const { type, url } = hotspot.onClick;

        const disableClick = !type || !url || type.length == 0 || url.length === 0;

        this.setState({
            isReady: true,
            disableClick: !this.isClickable()
        });
    }

    isClickable = (): boolean => {
        const {
            hotspot: { onClick }
        } = this.props;

        if (!onClick) {
            return false;
        }

        switch (onClick.type) {
            case "jumpToTime":
                return typeof onClick.jumpToTime !== "undefined";
            case "openUrl":
            case "openUrlInNewTab":
                return !!onClick.url;
            default:
                return false;
        }
    };

    // handleClick = () => {
    //     const { hotspot } = this.props;
    //     const { disableClick } = this.state;

    //     if (!hotspot.onClick || disableClick) {
    //         return;
    //     }

    //     switch (hotspot.onClick.type) {
    //         case "jumpToTime":
    //             if (typeof hotspot.onClick.jumpToTime === "undefined") {
    //                 return;
    //             }

    //             this.props.seekTo(hotspot.onClick.jumpToTime / 1000);
    //             break;
    //         case "openUrl":
    //             {
    //                 if (!hotspot.onClick.url) {
    //                     return;
    //                 }
    //                 const url = prepareUrl(hotspot.onClick.url);
    //                 window.open(url, "_top");
    //                 this.props.sendAnalytics({
    //                     eventNumber: 47,
    //                     target: url,
    //                     hotspotId: hotspot.id
    //                 });
    //             }
    //             break;
    //         case "openUrlInNewTab":
    //             {
    //                 if (!hotspot.onClick.url) {
    //                     return;
    //                 }

    //                 this.props.pauseVideo();

    //                 const url = prepareUrl(hotspot.onClick.url);
    //                 try {
    //                     window.open(url, "_blank");
    //                     this.props.sendAnalytics({
    //                         eventNumber: 47,
    //                         target: url,
    //                         hotspotId: hotspot.id
    //                     });
    //                 } catch (e) {
    //                     // do nothing
    //                 }
    //             }
    //             break;
    //         default:
    //             break;
    //     }
    // };

    render() {
        const { hotspot } = this.props;
        const { text } = hotspot;
        const { isReady, disableClick } = this.state

        // if (!isReady || !this.props.visible) {
        //     return null;
        // }

        // const buttonStyles = {
        //     ...defaultButtonsStyles,
        //     ...hotspot.styles,
        //     cursor: disableClick ? "default" : "pointer"
        // };

        return (
            <p
                // onClick={this.handleClick}
                className={styles.caption}
            >
                {text}
            </p>
        );
    }
}
