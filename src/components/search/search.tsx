import {h, Component} from 'preact';
import * as styles from './search.scss';
import {debounce} from '../../utils';
const DEBOUNCE_TIMEOUT = 300;

export interface SearchProps {
  onChange(value: string): void;
  searchQuery: string;
  kitchenSinkActive: boolean;
  toggledWithEnter: boolean;

  onSearchIndexChange: (index: number) => void;
  value: string;
  activeSearchIndex: number;
  totalSearchResults: number;
}

interface SearchState {
  active: boolean;
  focused: boolean;
}

export class Search extends Component<SearchProps, SearchState> {
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

  private _onClear = (event: MouseEvent) => {
    if (event.x !== 0 && event.y !== 0) {
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
        className={[styles.searchWrapper, searchQuery || this.state.active ? styles.active : '', this.state.focused ? styles.focused : ''].join(' ')}
      >
        <div className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder={'Search in Transcript'}
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
        {searchQuery && <button className={styles.clearIcon} onClick={this._onClear} tabIndex={1} />}
        {searchQuery && (
          <div className={styles.searchResults}>{`${totalSearchResults > 0 ? `${activeSearchIndex}/${totalSearchResults}` : '0/0'}`}</div>
        )}
        <div className={styles.prevNextWrapper}>
          {searchQuery && (
            <button
              tabIndex={1}
              className={`${styles.prevNextButton} ${styles.prevButton} ${totalSearchResults === 0 ? styles.disabled : ''}`}
              onClick={this._goToPrevSearchResult}
            />
          )}
          {searchQuery && (
            <button
              tabIndex={1}
              className={`${styles.prevNextButton} ${styles.nextButton} ${totalSearchResults === 0 ? styles.disabled : ''}`}
              onClick={this._goToNextSearchResult}
            />
          )}
        </div>
      </div>
    );
  }
}
