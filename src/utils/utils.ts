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

export const secondsToTime = (seconds: number, longerThanHour: boolean): string => {
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

export function makePlainText(captions: Array<CuePointData>): string {
  return captions.reduce((acc: string, next: CuePointData) => {
    return `${acc.trim()} ${next.text.trim()}`;
  }, '');
}

import {CuePointData, CuePoint} from '../types';

export const decodeString = (content: any): string => {
  if (typeof content !== 'string') {
    return content;
  }
  return content
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/  /gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"');
};

export const prepareCuePoint = (cuePoint: CuePoint): CuePointData => {
  const {metadata} = cuePoint;
  const itemData: CuePointData = {
    id: cuePoint.id,
    startTime: cuePoint.startTime,
    displayTime: Math.floor(cuePoint.startTime),
    text: decodeString(metadata.text)
  };

  return itemData;
};

export function downloadContent(content: string, name: string): void {
  const blob = new Blob([content], {type: 'text/plain;charset=utf-8;'});
  const anchor = document.createElement('a');
  const {navigator} = window as any;

  if (navigator.msSaveBlob) {
    // IE
    navigator.msSaveOrOpenBlob(blob, name);
    return;
  }
  if (navigator.userAgent.search('Firefox') !== -1) {
    // Firefox
    anchor.style.display = 'none';
    anchor.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  } else {
    // Chrome
    anchor.setAttribute('href', URL.createObjectURL(blob));
  }
  anchor.setAttribute('target', '_blank');
  anchor.setAttribute('download', name);
  anchor.click();
  anchor.remove();
}
export function printContent(content: string): void {
  const printWindow = window.open('', '', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
