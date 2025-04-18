import {h, Component} from 'preact';
import {InputField} from '@playkit-js/common/dist/components/input-field';
import {ui} from '@playkit-js/kaltura-player-js';

const {connect} = ui.redux;
const {withEventManager} = KalturaPlayer.ui.Event;
const {TAB} = KalturaPlayer.ui.utils.KeyMap;
const {withText, Text} = KalturaPlayer.ui.preacti18n;
const {withPlayer} = ui.Components;

const mapStateToProps = (state: any) => ({
  isOverlayOpen: state.shell.playerClasses?.includes('playkit-overlay-active')
});

const translates = ({activeSearchIndex, totalSearchResults}: SearchProps) => ({
  searchLabel: <Text id="transcript.search">Search in Transcript</Text>,
  clearSearchLabel: <Text id="transcript.clear_search">Clear search</Text>,
  nextMatchLabel: <Text id="transcript.next_search_match">Next search result</Text>,
  prevMatchLabel: <Text id="transcript.prev_search_match">Previous search result</Text>,
  searchResultsLabel: (
    <Text
      id="transcript.search_results"
      fields={{
        current: totalSearchResults > 0 ? activeSearchIndex : 0,
        total: totalSearchResults
      }}>
      {`Search result ${totalSearchResults > 0 ? activeSearchIndex : 0} out of ${totalSearchResults}`}
    </Text>
  )
});

export interface SearchProps {
  onChange(value: string): void;
  value: string;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;

  onSearchIndexChange: (index: number) => void;
  activeSearchIndex: number;
  totalSearchResults: number;

  searchLabel?: string;
  clearSearchLabel?: string;
  nextMatchLabel?: string;
  prevMatchLabel?: string;
  searchResultsLabel?: string;
  eventManager?: any;
  focusPluginButton: (event: KeyboardEvent) => void;
  player?: any;

  isOverlayOpen?: boolean;
}

@withPlayer
@withEventManager
@connect(mapStateToProps)
class SearchComponent extends Component<SearchProps> {
  private _inputField: InputField | null = null;

  constructor(props: SearchProps) {
    super(props);
    if (this.props.player._firstPlay) {
      this.props.eventManager?.listen(this.props.player, this.props.player.Event.FIRST_PLAY, () => {
        this.props.eventManager?.listen(document, 'keydown', this.handleKeydownEvent);
      });
    } else {
      this.props.eventManager?.listen(document, 'keydown', this.handleKeydownEvent);
    }
  }

  private handleKeydownEvent = (event: KeyboardEvent) => {
    if (event.keyCode === TAB && event.shiftKey && document.activeElement === this._inputField?.base?.childNodes[0] && !this.props.isOverlayOpen) {
      this.props.focusPluginButton(event);
    }
  };

  shouldComponentUpdate(nextProps: Readonly<SearchProps>) {
    const {value, activeSearchIndex, totalSearchResults, kitchenSinkActive} = this.props;
    if (
      value !== nextProps.value ||
      activeSearchIndex !== nextProps.activeSearchIndex ||
      totalSearchResults !== nextProps.totalSearchResults ||
      kitchenSinkActive !== nextProps.kitchenSinkActive
    ) {
      return true;
    }
    return false;
  }
  componentDidUpdate(previousProps: Readonly<SearchProps>): void {
    const {kitchenSinkActive, toggledWithEnter} = this.props;
    if (!previousProps.kitchenSinkActive && kitchenSinkActive && toggledWithEnter) {
      this._inputField?.setFocus({preventScroll: true});
    }
  }

  render() {
    const {value, totalSearchResults, activeSearchIndex, onChange, onSearchIndexChange} = this.props;
    return (
      <InputField
        ref={node => {
          this._inputField = node;
        }}
        value={value}
        onChange={onChange}
        placeholder={this.props.searchLabel}
        clearSearchLabel={this.props.clearSearchLabel}
        searchResults={{
          activeSearchIndex,
          totalSearchResults,
          onSearchIndexChange,
          nextMatchLabel: this.props.nextMatchLabel as string,
          prevMatchLabel: this.props.prevMatchLabel as string,
          searchResultsLabel: this.props.searchResultsLabel as string
        }}
      />
    );
  }
}

export const Search = withText(translates)(SearchComponent);
