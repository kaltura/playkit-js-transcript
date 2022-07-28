export interface TranscriptConfig {
  expandOnFirstPlay: boolean;
  showTime: boolean;
  position: string;
  scrollOffset: number; // distance between top border of transcript container and active caption on auto-scroll
  searchDebounceTimeout: number; // debounce on search
  searchNextPrevDebounceTimeout: number; // debounce on jump between prev/next search result
  downloadDisabled: boolean; // disable download menu
  printDisabled: boolean; // disable print menu
  expandMode: string; // over or pushing the player
}
