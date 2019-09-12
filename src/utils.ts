import { xml2js } from "xml-js";
//@ts-ignore
import { fromSrt } from "subtitles-parser";
import { Cuepoint } from "@playkit-js-contrib/common";
import { KitchenSinkPositions } from "@playkit-js-contrib/ui";

export interface CaptionItem extends Cuepoint {
    text: string;
    id: number;
}

export const toSeconds = (val: any): number => {
    const regex = /(\d+):(\d{2}):(\d{2}),(\d{2,3}|\d{2})/;
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
    return parts[1] * 3600 + parts[2] * 60 + parts[3] + parts[4] / 1000;
};

export const getCaptionsByFormat = (captions: any, captionsFormat: string): CaptionItem[] => {
    const format = captionsFormat.toLowerCase();
    switch (format) {
        case "2":
            // strip 'span' from the p tags, they break the parser and no time (now) to write a parser
            captions = captions
                .replace(/<span[^>]+\?>/i, "")
                .replace(/<\/span>/i, "")
                .replace(/<br><\/br>/g, " ") // remove <br></br>'s as it breaks the parser too.
                .replace(/<[//]{0,1}(SPAN|span)[^><]*>/g, "");
            return TTML2Obj(captions);

        case "1":
            return fromSrt(captions).map((item: any, index: number) => ({
                id: index + 1,
                endTime: toSeconds(item.endTime),
                startTime: toSeconds(item.startTime),
                text: item.text
            }));
        default:
            return [];
    }
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
            text: item._text
            // all non-required
            // otherAttributes: otherAttributes
        };
        return prepareObj;
    });
    return correctData;
};

/**
 * A function that emits a side effect and does not return anything.
 */
type Procedure = (...args: any[]) => void;

type Options = {
    isImmediate: boolean;
};

export function debounce<F extends Procedure>(
    func: F,
    waitMilliseconds = 50,
    options: Options = {
        isImmediate: false
    }
): F {
    let timeoutId: NodeJS.Timeout | undefined;

    return function(this: any, ...args: any[]) {
        const context = this;

        const doLater = function() {
            timeoutId = undefined;
            if (!options.isImmediate) {
                func.apply(context, args);
            }
        };

        const shouldCallNow = options.isImmediate && timeoutId === undefined;

        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(doLater, waitMilliseconds);

        if (shouldCallNow) {
            func.apply(context, args);
        }
    } as any;
}

export const secontsToTime = (seconts: number): string => {
    const date = new Date(0);
    date.setSeconds(seconts);
    return date.toISOString().substr(14, 5);
};

export function getPluginPosition(position: string, defaultPosition = KitchenSinkPositions.Bottom) {
    let pluginPosition = defaultPosition;
    if (
        typeof position === "string" &&
        (position === KitchenSinkPositions.Bottom || position === KitchenSinkPositions.Right)
    ) {
        pluginPosition = position;
    }
    return pluginPosition;
}
