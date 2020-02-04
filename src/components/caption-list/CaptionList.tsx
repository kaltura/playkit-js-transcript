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

    private _getShouldMakeScroll = (captionData: CaptionItem) => {
        const { isAutoScrollEnabled, highlightedMap, searchMap, activeSearchIndex } = this.props;
        return (isAutoScrollEnabled && highlightedMap[captionData.id]) ||
        (!isAutoScrollEnabled &&
            !!(searchMap[captionData.id] || {})[
                String(activeSearchIndex)
            ])
    }

    render() {
        const {
            captions,
            highlightedMap,
            searchMap,
            activeSearchIndex,
            captionProps,
            isAutoScrollEnabled
        } = this.props;
        return (
            <div className={styles.transcriptWrapper}>
                {captions.map(captionData => {
                    const searchProps: any = {};
                    if (searchMap[captionData.id]) {
                        searchProps.indexMap = searchMap[captionData.id];
                        searchProps.activeSearchIndex = activeSearchIndex;
                        searchProps.searchLength = captionProps.searchLength;
                    }
                    const newCaptionProps = {
                        showTime: captionProps.showTime,
                        scrollTo: captionProps.scrollTo,
                        key: captionData.id,
                        onClick: this._handleClick(captionData),
                        caption: captionData,
                        highlighted: highlightedMap[captionData.id],
                        longerThanHour: captionProps.videoDuration >= HOUR,
                        shouldMakeScroll: this._getShouldMakeScroll(captionData),
                        isAutoScrollEnabled,
                        ...searchProps
                    }
                    return (
                        <Caption
                            {...newCaptionProps}
                        />
                    );
                })}
            </div>
        );
    }
}
