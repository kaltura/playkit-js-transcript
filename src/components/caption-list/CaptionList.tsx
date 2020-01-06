import { h, Component } from "preact";
import { Caption, CaptionProps } from "../caption";
import * as styles from "./captionList.scss";
import { CaptionItem, HOUR } from "../../utils";


interface CaptionListProps {
    highlightedMap: Record<number, true>;
    captions: CaptionItem[];
    seekTo(caption: CaptionItem): void;
    isAutoScrollEnabled: boolean;
    searchMap: Record<number, Record<string, number>>;
    activeSearchIndex: number;
    captionProps: CaptionProps;
}

export class CaptionList extends Component<CaptionListProps> {
    shouldComponentUpdate(nextProps: Readonly<CaptionListProps>) {
        if (
            this.props.highlightedMap !== nextProps.highlightedMap ||
            this.props.captions !== nextProps.captions ||
            this.props.searchMap !== nextProps.searchMap ||
            this.props.activeSearchIndex !== nextProps.activeSearchIndex ||
            this.props.isAutoScrollEnabled !== nextProps.isAutoScrollEnabled
        ) {
            return true;
        }
        return false;
    }

    private _handleClick = (caption: CaptionItem) => () => {
        const { seekTo } = this.props;
        seekTo(caption);
    };

    render() {
        const {
            captions,
            highlightedMap,
            isAutoScrollEnabled,
            searchMap,
            activeSearchIndex,
            captionProps
        } = this.props;
        return (
            <div className={styles.transcriptWrapper}>
                {captions.map(captionData => {
                    return (
                        <Caption
                            key={captionData.id}
                            onClick={this._handleClick(captionData)}
                            caption={captionData}
                            highlighted={highlightedMap[captionData.id]}
                            isAutoScrollEnabled={
                                (isAutoScrollEnabled && highlightedMap[captionData.id]) ||
                                (!isAutoScrollEnabled &&
                                    !!(searchMap[captionData.id] || {})[
                                        String(activeSearchIndex)
                                    ])
                            }
                            indexMap={searchMap[captionData.id]}
                            activeSearchIndex={activeSearchIndex}
                            isLongVideo={captionProps.videoDuration >= HOUR}
                            {...captionProps}
                        />
                    );
                })}
            </div>
        );
    }
}
