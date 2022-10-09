import {h, Component} from 'preact';
import {A11yWrapper, OnClickEvent} from '@playkit-js/common';
import * as styles from './search.scss';
import {debounce} from '../../utils';
const DEBOUNCE_TIMEOUT = 300;

const {withText, Text} = KalturaPlayer.ui.preacti18n;
const translates = {
  searchLabel: <Text id="transcript.search">Search in Transcript</Text>,
  clearSearchLabel: <Text id="transcript.clear_search">Clear search"</Text>,
  nextMatchLabel: <Text id="transcript.next_search_match">Next</Text>,
  prevMatchLabel: <Text id="transcript.prev_search_match">Previous</Text>
};

export interface SearchProps {
  onChange(value: string): void;
  searchQuery: string;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;

  onSearchIndexChange: (index: number) => void;
  value: string;
  activeSearchIndex: number;
  totalSearchResults: number;

  searchLabel?: string;
  clearSearchLabel?: string;
  nextMatchLabel?: string;
  prevMatchLabel?: string;
}

interface SearchState {
  active: boolean;
  focused: boolean;
}

class SearchComponent extends Component<SearchProps, SearchState> {
  state: SearchState = {
    active: false,
    focused: false
  };
  private _inputRef: null | HTMLInputElement = null;
  private _focusedByMouse = false;
  private _debouncedOnChange: (value: string) => void;
  constructor(props: SearchProps) {
    super(props);
    this._debouncedOnChange = debounce(props.onChange, DEBOUNCE_TIMEOUT);
    this.state = {
      active: false,
      focused: false
    };
  }

  shouldComponentUpdate(nextProps: Readonly<SearchProps>, nextState: Readonly<SearchState>) {
    const {value, activeSearchIndex, totalSearchResults, kitchenSinkActive} = this.props;
    if (
      value !== nextProps.value ||
      activeSearchIndex !== nextProps.activeSearchIndex ||
      totalSearchResults !== nextProps.totalSearchResults ||
      kitchenSinkActive !== nextProps.kitchenSinkActive ||
      this.state.active !== nextState.active
    ) {
      return true;
    }
    return false;
  }
  componentDidUpdate(previousProps: Readonly<SearchProps>): void {
    const {kitchenSinkActive, toggledWithEnter} = this.props;
    if (!previousProps.kitchenSinkActive && kitchenSinkActive && toggledWithEnter) {
      this._inputRef?.focus();
    }
  }

  private _handleOnChange = (e: any) => {
    this.props.onChange(e.target.value);
  };

  private _onClear = (event: OnClickEvent) => {
    if (!(event instanceof KeyboardEvent)) {
      this._focusedByMouse = true;
    }
    this._inputRef?.focus();
    this.props.onChange('');
  };

  private _onFocus = () => {
    this.setState({
      active: true,
      focused: !this._focusedByMouse
    });
    this._focusedByMouse = false;
  };

  private _onBlur = () => {
    this.setState({
      active: false,
      focused: false
    });
  };

  private _goToNextSearchResult = () => {
    const {activeSearchIndex, totalSearchResults, onSearchIndexChange} = this.props;
    if (totalSearchResults === 0) {
      return;
    }
    let index = 0;
    if (activeSearchIndex !== totalSearchResults) {
      index = this.props.activeSearchIndex + 1;
    } else {
      index = 1;
    }
    onSearchIndexChange(index);
  };
  private _goToPrevSearchResult = () => {
    const {activeSearchIndex, totalSearchResults, onSearchIndexChange} = this.props;
    let index = 0;
    if (activeSearchIndex !== 1) {
      index = activeSearchIndex - 1;
    } else {
      index = totalSearchResults;
    }
    onSearchIndexChange(index);
  };

  _handleMouseDown = () => {
    this._focusedByMouse = true;
  };

  render() {
    const {searchQuery, totalSearchResults, activeSearchIndex} = this.props;
    return (
      <div
        className={[styles.searchWrapper, searchQuery || this.state.active ? styles.active : '', this.state.focused ? styles.focused : ''].join(' ')}>
        <div className={styles.searchIcon}>
          <svg
            width="32px"
            height="32px"
            viewBox="0 0 32 32"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink">
            <g id="Icons/32/serch" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <path
                d="M15.1578947,8 C19.1110908,8 22.3157895,11.2046986 22.3157895,15.1578947 C22.3157895,16.8311546 21.7416502,18.3703171 20.7796271,19.5891266 L24.5954583,23.4045417 C24.9243209,23.7334042 24.9243209,24.2665958 24.5954583,24.5954583 C24.2665958,24.9243209 23.7334042,24.9243209 23.4045417,24.5954583 L19.5891266,20.7796271 C18.3703171,21.7416502 16.8311546,22.3157895 15.1578947,22.3157895 C11.2046986,22.3157895 8,19.1110908 8,15.1578947 C8,11.2046986 11.2046986,8 15.1578947,8 Z M15.1578947,9.68421053 C12.1348624,9.68421053 9.68421053,12.1348624 9.68421053,15.1578947 C9.68421053,18.1809271 12.1348624,20.6315789 15.1578947,20.6315789 C18.1809271,20.6315789 20.6315789,18.1809271 20.6315789,15.1578947 C20.6315789,12.1348624 18.1809271,9.68421053 15.1578947,9.68421053 Z"
                id="Shape"
                fill="#cccccc"></path>
            </g>
          </svg>
        </div>
        <input
          className={styles.searchInput}
          aria-label={this.props.searchLabel}
          placeholder={this.props.searchLabel}
          value={searchQuery}
          onInput={this._handleOnChange}
          onFocus={this._onFocus}
          onBlur={this._onBlur}
          onMouseDown={this._handleMouseDown}
          tabIndex={1}
          ref={node => {
            this._inputRef = node;
          }}
        />
        {searchQuery && (
          <A11yWrapper onClick={this._onClear}>
            <button className={styles.clearIcon} tabIndex={1} area-label={this.props.clearSearchLabel}>
              <svg
                width="32px"
                height="32px"
                viewBox="0 0 32 32"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink">
                <g id="Icons/32/Clere" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <path
                    d="M16,8 C20.418278,8 24,11.581722 24,16 C24,20.418278 20.418278,24 16,24 C11.581722,24 8,20.418278 8,16 C8,11.581722 11.581722,8 16,8 Z M19.8665357,12.1334643 C19.6885833,11.9555119 19.4000655,11.9555119 19.2221131,12.1334643 L16,15.356 L12.7778869,12.1334643 L12.7064039,12.0750737 C12.5295326,11.9582924 12.2891726,11.977756 12.1334643,12.1334643 L12.0750737,12.2049473 C11.9582924,12.3818186 11.977756,12.6221786 12.1334643,12.7778869 L15.356,16 L12.1334643,19.2221131 C11.9555119,19.4000655 11.9555119,19.6885833 12.1334643,19.8665357 C12.3114167,20.0444881 12.5999345,20.0444881 12.7778869,19.8665357 L16,16.644 L19.2221131,19.8665357 L19.2935961,19.9249263 C19.4704674,20.0417076 19.7108274,20.022244 19.8665357,19.8665357 L19.9249263,19.7950527 C20.0417076,19.6181814 20.022244,19.3778214 19.8665357,19.2221131 L16.644,16 L19.8665357,12.7778869 C20.0444881,12.5999345 20.0444881,12.3114167 19.8665357,12.1334643 Z"
                    id="Shape"
                    fill="#cccccc"></path>
                </g>
              </svg>
            </button>
          </A11yWrapper>
        )}
        {searchQuery && (
          <div className={styles.searchResults} aria-live="polite">{`${
            totalSearchResults > 0 ? `${activeSearchIndex}/${totalSearchResults}` : '0/0'
          }`}</div>
        )}
        <div className={styles.prevNextWrapper}>
          {searchQuery && (
            <A11yWrapper onClick={this._goToPrevSearchResult}>
              <button
                tabIndex={1}
                className={`${styles.prevNextButton} ${totalSearchResults === 0 ? styles.disabled : ''}`}
                area-label={this.props.prevMatchLabel}>
                <svg
                  width="14px"
                  height="12px"
                  viewBox="1 0 14 12"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink">
                  <g id="Icons/16/Arrow/-up" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <path
                      d="M4.78325732,5.37830235 C4.43990319,4.94572127 3.81088342,4.87338855 3.37830235,5.21674268 C2.94572127,5.56009681 2.87338855,6.18911658 3.21674268,6.62169765 L7.21674268,11.6611718 C7.61710439,12.165575 8.38289561,12.165575 8.78325732,11.6611718 L12.7832573,6.62169765 C13.1266115,6.18911658 13.0542787,5.56009681 12.6216977,5.21674268 C12.1891166,4.87338855 11.5600968,4.94572127 11.2167427,5.37830235 L8,9.43097528 L4.78325732,5.37830235 Z"
                      id="Path-2"
                      fill="#cccccc"
                      transform="translate(8.000000, 8.519717) scale(1, -1) translate(-8.000000, -8.519717) "></path>
                  </g>
                </svg>
              </button>
            </A11yWrapper>
          )}
          {searchQuery && (
            <A11yWrapper onClick={this._goToNextSearchResult}>
              <button
                tabIndex={1}
                className={`${styles.prevNextButton} ${totalSearchResults === 0 ? styles.disabled : ''}`}
                area-label={this.props.nextMatchLabel}>
                <svg
                  width="14px"
                  height="12px"
                  viewBox="1 2 14 12"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink">
                  <g id="Icons/16/Arrow/down" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                    <path
                      d="M4.78325732,5.37830235 C4.43990319,4.94572127 3.81088342,4.87338855 3.37830235,5.21674268 C2.94572127,5.56009681 2.87338855,6.18911658 3.21674268,6.62169765 L7.21674268,11.6611718 C7.61710439,12.165575 8.38289561,12.165575 8.78325732,11.6611718 L12.7832573,6.62169765 C13.1266115,6.18911658 13.0542787,5.56009681 12.6216977,5.21674268 C12.1891166,4.87338855 11.5600968,4.94572127 11.2167427,5.37830235 L8,9.43097528 L4.78325732,5.37830235 Z"
                      id="Path-2"
                      fill="#cccccc"></path>
                  </g>
                </svg>
              </button>
            </A11yWrapper>
          )}
        </div>
      </div>
    );
  }
}

export const Search = withText(translates)(SearchComponent);
