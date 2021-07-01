import { h, Component } from "preact";
import { ObjectUtils } from "@playkit-js-contrib/common";
import { KeyboardKeys } from "@playkit-js-contrib/ui";
import { Caption, CaptionProps } from "../caption";
import * as styles from "./captionList.scss";
import { CaptionItem, HOUR } from "../../utils";

const { get } = ObjectUtils;

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
    private _currentCaptionRef: any = null;
    private _firstCaptionRef: any = null;
    private _lastCaptionRef: any = null;
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

    private _getShouldScroll = (captionId: number) => {
        const { isAutoScrollEnabled, highlightedMap } = this.props;
        return isAutoScrollEnabled && highlightedMap[captionId];
    }

    private _getShouldScrollToSearchMatch = (captionId: number) => {
        const { isAutoScrollEnabled, searchMap, activeSearchIndex } = this.props;
        return !isAutoScrollEnabled && (searchMap[captionId] && searchMap[captionId][activeSearchIndex] !== undefined);
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
            scrollToSearchMatch: captionProps.scrollToSearchMatch,
            key: id,
            onClick: this._handleClick(captionData),
            caption: captionData,
            highlighted: highlightedMap[id],
            longerThanHour: captionProps.videoDuration >= HOUR,
            shouldScroll: this._getShouldScroll(id),
            shouldScrollToSearchMatch: this._getShouldScrollToSearchMatch(id),
            isAutoScrollEnabled,
            ...this._getSearchProps(id)
        }
        return newCaptionProps;
    }

    private _handleKeyUp = (event: KeyboardEvent) => {
        if (event.keyCode === KeyboardKeys.End) {
            this._lastCaptionRef?._hotspotRef?.focus();
        } else if (event.keyCode === KeyboardKeys.Home) {
            this._firstCaptionRef?._hotspotRef?.focus();
        }
    }

    render() {
        const { captions } = this.props;
        return (
            <div
                className={styles.transcriptWrapper}
                onKeyUp={this._handleKeyUp}
            >
                {captions.map((captionData, index) => {
                    const captionProps = this._getCaptionProps(captionData);
                    return (
                        <Caption
                            ref={node => {
                                if (index === 0) {
                                    this._firstCaptionRef = node;
                                } else if (index === captions.length - 1) {
                                    this._lastCaptionRef = node;
                                }
                                if (captionProps.highlighted) {
                                    this._currentCaptionRef = node;
                                }
                            }}
                            {...captionProps}
                        />
                    )
                })}
            </div>
        );
    }
}
