import {KalturaRequest, KalturaRequestArgs} from 'kaltura-typescript-client/api/kaltura-request';
import {KalturaObjectMetadata} from 'kaltura-typescript-client/api/kaltura-object-base';
import {CaptionItem} from '../types';
export const HOUR = 3600; // seconds in 1 hour

export const toSeconds = (val: any, vtt = false): number => {
  const regex = vtt ? /(\d+):(\d{2}):(\d{2}).(\d{2,3}|\d{2})/ : /(\d+):(\d{2}):(\d{2}),((\d{2,3}|\d{2}|\d{1}))?/;
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

const pad = (number: number) => {
  if (number < 10) {
    return `0${number}`;
  }
  return number;
};

const makeHoursString = (seconds: number): string => {
  const hours = Math.floor(seconds / HOUR);
  if (hours >= 1) {
    return `${hours}:`;
  }
  return '';
};

export const secontsToTime = (seconds: number, longerThanHour: boolean): string => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return `${longerThanHour ? makeHoursString(seconds) : ''}${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
};

export function getConfigValue(value: any, condition: (value: any) => boolean, defaultValue: any) {
  let result = defaultValue;
  if (typeof condition === 'function' && condition(value)) {
    result = value;
  }
  return result;
}

export function isBoolean(value: any) {
  return typeof value === 'boolean';
}

export function makePlainText(captions: Array<CaptionItem>): string {
  return captions.reduce((acc: string, next: CaptionItem) => {
    return `${acc} ${next.text}`;
  }, '');
}

// KalturaClient uses custom CaptionAssetServeAction method,
// once KalturaFileRequest is fixed remove custom CaptionAssetServeAction and use
// CaptionAssetServeAction from "kaltura-typescript-client/api/types/CaptionAssetServeAction"
interface CaptionAssetServeActionArgs extends KalturaRequestArgs {
  captionAssetId: string;
}
export class CaptionAssetServeAction extends KalturaRequest<{url: string}> {
  captionAssetId: any;
  constructor(data: CaptionAssetServeActionArgs) {
    super(data, {responseType: 'v', responseSubType: '', responseConstructor: null} as any);
  }
  protected _getMetadata(): KalturaObjectMetadata {
    const result = super._getMetadata();
    Object.assign(result.properties, {
      service: {type: 'c', default: 'caption_captionasset'},
      action: {type: 'c', default: 'serve'},
      captionAssetId: {type: 's'}
    });
    return result;
  }
}

import {ItemTypes, ItemData, CuePoint} from '../types';

// @ts-ignore
const {toHHMMSS} = KalturaPlayer.ui.utils;
const MAX_CHARACTERS = 77;

export const decodeString = (content: any): string => {
  if (typeof content !== 'string') {
    return content;
  }
  return content
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"');
};

export const prepareCuePoint = (cuePoint: CuePoint, cuePointType: ItemTypes, isLive: boolean): ItemData => {
  const {metadata} = cuePoint;
  const itemData: ItemData = {
    cuePointType,
    id: cuePoint.id,
    startTime: cuePoint.startTime,
    displayTime: isLive ? '' : toHHMMSS(Math.floor(cuePoint.startTime)),
    itemType: cuePointType,
    displayTitle: '',
    displayDescription: decodeString(metadata.description),
    previewImage: null,
    hasShowMore: false,
    groupData: null
  };

  itemData.displayTitle = decodeString(metadata.text);
  if (itemData.displayTitle && itemData.displayTitle.length > MAX_CHARACTERS && itemData.itemType !== ItemTypes.Caption) {
    let elipsisString = itemData.displayTitle.slice(0, MAX_CHARACTERS);
    elipsisString = elipsisString.trim();
    itemData.shorthandTitle = elipsisString + '... ';
  }
  if (!itemData.displayTitle && itemData.displayDescription && itemData.displayDescription.length > 79) {
    let elipsisDescription = itemData.displayTitle.slice(0, MAX_CHARACTERS);
    elipsisDescription = elipsisDescription.trim();
    itemData.shorthandDescription = elipsisDescription + '... ';
  }
  itemData.hasShowMore = Boolean(itemData.displayDescription || itemData.shorthandDescription);

  return itemData;
};

export const itemTypesOrder: Record<string, number> = {
  [ItemTypes.Caption]: 1
};
