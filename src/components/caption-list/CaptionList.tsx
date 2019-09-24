import { h, Component } from "preact";
import { Caption } from "../caption";
import * as styles from "./captionList.scss";
import { CaptionItem } from "../../utils";

interface CaptionListProps {
    highlightedMap: Record<number, true>,
    captions: CaptionItem[];
    seekTo(caption: CaptionItem): void;
    scrollTo(el: HTMLElement): void;
    search: string;
    showTime: boolean;
    isAutoScrollEnabled: boolean;
    searchMap: Record<number, Record<string, number>>;
    activeSearchIndex: number;
};

export class CaptionList extends Component<CaptionListProps> {
    shouldComponentUpdate(nextProps: Readonly<CaptionListProps>) {
        if (
            this.props.highlightedMap !== nextProps.highlightedMap ||
            this.props.captions !== nextProps.captions ||
            this.props.search !== nextProps.search ||
            this.props.activeSearchIndex !== nextProps.activeSearchIndex
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
        const { captions, highlightedMap, scrollTo, search, showTime, isAutoScrollEnabled, searchMap, activeSearchIndex } = this.props;
        return (
            <div className={styles.transcriptWrapper}>
                <table>
                    <tbody>
                        {captions.map(captionData => {
                            return (
                                <Caption
                                    key={captionData.id}
                                    onClick={this._handleClick(captionData)}
                                    caption={captionData}
                                    highlighted={highlightedMap[captionData.id]}
                                    scrollTo={scrollTo}
                                    searchLength={search.length}
                                    showTime={showTime}
                                    isAutoScrollEnabled={
                                        (isAutoScrollEnabled && highlightedMap[captionData.id]) ||
                                        (!isAutoScrollEnabled && !!(searchMap[captionData.id] || {})[String(activeSearchIndex)])
                                    }
                                    indexMap={searchMap[captionData.id]}
                                    activeSearchIndex={activeSearchIndex}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }
}