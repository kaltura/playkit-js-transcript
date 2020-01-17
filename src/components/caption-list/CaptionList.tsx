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
    latestActiveSearchIndex: null | number;
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
            captionProps,
            latestActiveSearchIndex
        } = this.props;
        return (
            <div className={styles.transcriptWrapper}>
                {captions.map(captionData => {
                    const highlightSearch = !!(searchMap[captionData.id] || {})[String(activeSearchIndex)]
                    return (
                        <Caption
                            key={captionData.id}
                            onClick={this._handleClick(captionData)}
                            caption={captionData}
                            highlighted={highlightedMap[captionData.id]}
                            isAutoScrollEnabled={
                                (
                                    isAutoScrollEnabled &&
                                    highlightedMap[captionData.id]
                                ) ||
                                (
                                    !isAutoScrollEnabled &&
                                    highlightSearch && 
                                    !(latestActiveSearchIndex === activeSearchIndex)
                                )
                            }
                            indexMap={searchMap[captionData.id]}
                            activeSearchIndex={activeSearchIndex}
                            longerThanHour={captionProps.videoDuration >= HOUR}
                            shouldSetLatestSearchIndex={highlightSearch}
                            {...captionProps}
                        />
                    );
                })}
            </div>
        );
    }
}
