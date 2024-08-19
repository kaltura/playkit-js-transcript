export const TranscriptEvents = {
  TRANSCRIPT_OPEN: 'transcript_open',
  TRANSCRIPT_CLOSE: 'transcript_close',
  TRANSCRIPT_DOWNLOAD: 'transcript_download',
  TRANSCRIPT_PRINT: 'transcript_print',
  TRANSCRIPT_SEARCH: 'transcript_search',
  TRANSCRIPT_NAVIGATE_RESULT: 'transcript_navigate_result',
  TRANSCRIPT_POPOUT_OPEN: 'transcript_popout_open',
  TRANSCRIPT_POPOUT_CLOSE: 'transcript_popout_close',
  TRANSCRIPT_POPOUT_DRAG: 'transcript_popout_drag',
  TRANSCRIPT_POPOUT_RESIZE: 'transcript_popout_resize',

  TRANSCRIPT_TO_SEARCH_MATCH: 'transcript_to_search_match' // internal event
};

export enum CloseDetachTypes {
  closeWindow = 'close_window',
  bringBack = 'bring_back',
  arrow = 'arrow'
}
