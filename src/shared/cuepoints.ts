import { RawHotspotCuepoint } from "./hotspot";
//import { log } from "@playkit-js/playkit-js-ovp";

function toObject(
    jsonAsString: string,
    defaultValue: { [key: string]: any } = {}
): { error?: Error; result?: { [key: string]: any } } {
    if (!jsonAsString) {
        return defaultValue;
    }

    try {
        return { result: JSON.parse(jsonAsString) };
    } catch (e) {
        return { error: e };
    }
}

export function convertToTranscript(response: any): RawHotspotCuepoint[] {
    const result: RawHotspotCuepoint[] = [];

    (response.objects || []).forEach((cuepoint: any) => {
        const { result: partnerData, error } = toObject(cuepoint.partnerData);

        if (!partnerData || !partnerData.schemaVersion) {
            // log(
            //     "warn",
            //     "loadCuePoints",
            //     `annotation '${cuepoint.id}' has no schema version, skip annotation`
            // );
            return;
        }

        const rawLayout = {
            ...partnerData.layout
        };

        result.push({
            id: cuepoint.id,
            startTime: cuepoint.startTime,
            endTime: cuepoint.endTime,
            label: cuepoint.text,
            styles: partnerData.styles,
            onClick: partnerData.onClick,
            rawLayout: rawLayout
        });
    });

    return result;
}
