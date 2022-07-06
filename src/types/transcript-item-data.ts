import {ComponentChild, JSX} from 'preact';
export interface TranscriptContentRendererProps {
  onClose: () => void;
}
export declare enum TranscriptExpandModes {
  AlongSideTheVideo = 'alongside',
  Hidden = 'hidden',
  OverTheVideo = 'over'
}
export declare enum TranscriptPositions {
  Top = 'top',
  Left = 'left',
  Right = 'right',
  Bottom = 'bottom'
}
export interface TranscriptItemData {
  label: string;
  renderIcon: (isActive: boolean) => ComponentChild | JSX.Element;
  expandMode: TranscriptExpandModes;
  position: TranscriptPositions;
  fillContainer?: boolean;
  renderContent: (props: TranscriptContentRendererProps) => ComponentChild;
}
