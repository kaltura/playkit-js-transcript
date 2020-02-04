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
        const {
            highlightedMap,
            captions,
            searchMap,
            activeSearchIndex,
            isAutoScrollEnabled,
            captionProps
        } = this.props
        if (
            highlightedMap !== nextProps.highlightedMap ||
            captions !== nextProps.captions ||
            searchMap !== nextProps.searchMap ||
            activeSearchIndex !== nextProps.activeSearchIndex ||
            isAutoScrollEnabled !== nextProps.isAutoScrollEnabled ||
            captionProps.videoDuration !== nextProps.captionProps.videoDuration
        ) {
            return true;
        }
        return false;
    }

    private _handleClick = (caption: CaptionItem) => () => {
        const { seekTo } = this.props;
        seekTo(caption);
    };

    private _getShouldMakeScroll = (captionId: number) => {
        const { isAutoScrollEnabled, highlightedMap, searchMap, activeSearchIndex } = this.props;
        return (isAutoScrollEnabled && highlightedMap[captionId]) ||
        (!isAutoScrollEnabled &&
            !!(searchMap[captionId] || {})[
                String(activeSearchIndex)
            ])
    }

    private _getSearchProps = (captionId: number) => {
        const { searchMap, activeSearchIndex, captionProps } = this.props;
        const searchProps: any = {};
        if (searchMap[captionId]) {
            searchProps.indexMap = searchMap[captionId];
            searchProps.activeSearchIndex = activeSearchIndex;
            searchProps.searchLength = captionProps.searchLength;
        }
        return searchProps;
    }

    private _getCaptionProps = (captionData: CaptionItem) => {
        const {
            highlightedMap,
            captionProps,
            isAutoScrollEnabled
        } = this.props;
        const { id } = captionData;
        const newCaptionProps = {
            showTime: captionProps.showTime,
            scrollTo: captionProps.scrollTo,
            key: id,
            onClick: this._handleClick(captionData),
            caption: captionData,
            highlighted: highlightedMap[id],
            longerThanHour: captionProps.videoDuration >= HOUR,
            shouldMakeScroll: this._getShouldMakeScroll(id),
            isAutoScrollEnabled,
            ...this._getSearchProps(id)
        }
        return newCaptionProps;
    }

    render() {
        return (
            <div className={styles.transcriptWrapper}>
                {this.props.captions.map(captionData => (
                    <Caption
                        {...this._getCaptionProps(captionData)}
                    />
                ))}
            </div>
        );
    }
}
