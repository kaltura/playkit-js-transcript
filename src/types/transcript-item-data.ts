export type HighlightedMap = Record<string, boolean>;

export interface RawItemData {
  cuePointType: ItemTypes;
  text?: string;
  description?: string;
  title?: string;
  assetId?: string;
  subType?: ItemTypes;
  partnerData?: string;
  tags?: string;
  assetUrl?: string;
  relatedObjects?: {
    QandA_ResponseProfile?: {
      objects: Array<{xml: string}>;
    };
  };
}

export interface ItemData extends RawItemData {
  id: string;
  startTime: number;
  previewImage: string | null;
  itemType: ItemTypes;
  displayTime?: number;
  displayTitle: string;
  shorthandTitle?: string;
  displayDescription: string | null;
  shorthandDescription?: string;
  hasShowMore: boolean;
}

export enum ItemTypes {
  Caption = 'Caption'
}

export interface CuePoint {
  startTime: number;
  endTime?: number;
  id: string;
  type: string;
  metadata: RawItemData;
  text?: string;
}
