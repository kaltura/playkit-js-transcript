export type HighlightedMap = Record<string, boolean>;

export interface RawItemData {
  content?: Array<{text: string}>;
  cuePointType?: string;
  label?: string;
  language?: string;
  text?: string;
}

export interface CuePointData {
  id: string;
  startTime: number;
  displayTime?: number;
  text: string;
}

export enum ItemTypes {
  Caption = 'kalturaCaption'
}

export interface CuePoint {
  startTime: number;
  endTime?: number;
  id: string;
  type: string;
  metadata: RawItemData;
  text?: string;
}
