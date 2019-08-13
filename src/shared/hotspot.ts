import { OverlayCuepoint, RawOverlayCuepoint } from "@playkit-js-contrib/ui";

export interface OpenUrl {
    type: "openUrl";
    url: string;
}

export interface OpenUrlInNewTab {
    type: "openUrlInNewTab";
    url: string;
}

export interface JumpToTime {
    type: "jumpToTime";
    jumpToTime: number;
}

type OnClickAction = OpenUrl | OpenUrlInNewTab | JumpToTime;

export type RawHotspotCuepoint = RawOverlayCuepoint & {
    onClick?: OnClickAction;
    label?: string;
    styles: { [key: string]: string };
};

export type HotspotCuepoint = RawHotspotCuepoint & OverlayCuepoint;
