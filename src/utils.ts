import { xml2js } from "xml-js";
import { Cuepoint } from "@playkit-js-contrib/common";

export const HOUR = 3600; // seconds in 1 hour

export interface CaptionItem extends Cuepoint {
    text: string;
    id: number;
}

export const toSeconds = (val: any, vtt = false): number => {
    const regex = vtt
        ? /(\d+):(\d{2}):(\d{2}).(\d{2,3}|\d{2})/
        : /(\d+):(\d{2}):(\d{2}),(\d{2,3}|\d{2})/;
    const parts: any | null[] = regex.exec(val);
    if (parts === null) {
        return 0;
    }
    for (var i = 1; i < 5; i++) {
        parts[i] = parseInt(parts[i], 10);
        if (isNaN(parts[i])) {
            parts[i] = 0;
        }
    }
    // hours + minutes + seconds + ms
    return parts[1] * HOUR + parts[2] * 60 + parts[3] + parts[4] / 1000;
};

export const getCaptionsByFormat = (captions: any, captionsFormat: string): CaptionItem[] => {
    const format = captionsFormat.toLowerCase();
    // const a = fromSrt(captions);
    switch (format) {
        case "1":
            return fromSrt(captions);
        case "2":
            // strip 'span' from the p tags, they break the parser and no time (now) to write a parser
            captions = captions
                .replace(/<span[^>]+\?>/i, "")
                .replace(/<\/span>/i, "")
                .replace(/<br><\/br>/g, " ") // remove <br></br>'s as it breaks the parser too.
                .replace(/<[//]{0,1}(SPAN|span)[^><]*>/g, "");
            return TTML2Obj(captions);
        case "3":
            return fromVtt(captions);
        default:
            return [];
    }
};

const fromVtt = (data: string): CaptionItem[] => {
    let source: string | string[] = data.replace(/\r/g, "");
    const regex = /(\d+)?\n?(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3}).*\n/g;
    source = source.replace(/[\s\S]*.*(?=00:00:00.000)/, "");
    source = source.split(regex);
    source.shift();
    const result = [];
    for (let i = 0; i < source.length; i += 4) {
        result.push({
            id: result.length + 1,
            startTime: toSeconds(source[i + 1].trim(), true),
            endTime: toSeconds(source[i + 2].trim(), true),
            text: source[i + 3].trim()
        });
    }
    return result;
};

const fromSrt = (data: string): CaptionItem[] => {
    let source: string | string[] = data.replace(/\r/g, "");
    const regex = /(\d+)?\n?(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3}).*\n/g;
    source = source.split(regex);
    source.shift();
    const result = [];
    for (let i = 0; i < source.length; i += 4) {
        result.push({
            id: result.length + 1,
            startTime: toSeconds(source[i + 1].trim()),
            endTime: toSeconds(source[i + 2].trim()),
            text: source[i + 3].trim()
        });
    }
    return result;
};

export const TTML2Obj = (ttml: any): CaptionItem[] => {
    const data: any = xml2js(ttml, { compact: true });
    // need only captions for showing. they located in tt.body.div.p.
    const chapters = data.tt.body.div.p;
    const correctData = chapters.map((item: any, index: number) => {
        const { begin, end, ...otherAttributes } = item._attributes;
        // convert time to 00:00:00.000 to 00:00:00,000
        const endTime = end.replace(/\./g, ",");
        const startTime = begin.replace(/\./g, ",");
        const prepareObj = {
            id: index + 1,
            endTime: toSeconds(endTime),
            startTime: toSeconds(startTime),
            text: (Array.isArray(item._text) ? item._text.join(" ") : item._text) || ""
            // all non-required
            // otherAttributes: otherAttributes
        };
        return prepareObj;
    });
    return correctData;
};

const pad = (number: number) => {
    if (number < 10) {
        return `0${number}`;
    }
    return number;
};

const makeHoursString = (seconds: number): string => {
    const hours = Math.floor(seconds / HOUR)
    if (hours >= 1) {
        return `${hours}:`
    }
    return "";
};

export const secontsToTime = (seconds: number, isLongVideo: boolean): string => {
    const date = new Date(0);
    date.setSeconds(seconds);
    return `${isLongVideo ? makeHoursString(seconds) : ""}${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
};

export function getConfigValue(value: any, condition: (value: any) => boolean, defaultValue: any) {
    let result = defaultValue;
    if (typeof condition === "function" && condition(value)) {
        result = value;
    }
    return result;
}

export function isBoolean(value: any) {
    return typeof value === "boolean";
}

export function makePlainText(captions: Array<CaptionItem>): string {
    return captions.reduce((acc: string, next: CaptionItem) => {
        return `${acc} ${next.text}`;
    }, "");
}
