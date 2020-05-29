import { h, Component } from "preact";
import * as styles from "./search.scss";

export interface SearchProps {
    onChange(value: string): void;
    onSearchIndexChange(value: number): void;
    value: string;
    activeSearchIndex: number;
    totalSearchResults: number;
    kitchenSinkActive: boolean;
    toggledWithEnter: boolean;
}

interface SearchState {
    active: boolean;
}

export class Search extends Component<SearchProps, SearchState> {
    private _inputRef: null | HTMLInputElement = null;
    shouldComponentUpdate(
        nextProps: Readonly<SearchProps>,
        nextState: Readonly<SearchState>
    ) {
        const { value, activeSearchIndex, totalSearchResults, kitchenSinkActive } = this.props;
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
        const { kitchenSinkActive, toggledWithEnter } = this.props;
        if (!previousProps.kitchenSinkActive && kitchenSinkActive && toggledWithEnter) {
          this._inputRef?.focus();
        }
    }
    private _handleOnChange = (e: any) => {
        this.props.onChange(e.target.value);
    };

    private _onClear = () => {
        this.props.onChange("");
    };

    private _onFocus = () => {
        this.setState({ active: true })
    }

    private _onBlur = () => {
        this.setState({ active: false })
    }

    private _goToNextSearchResult = () => {
        const { activeSearchIndex, totalSearchResults, onSearchIndexChange } = this.props;
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
        const { activeSearchIndex, totalSearchResults, onSearchIndexChange } = this.props;
        let index = 0;
        if (activeSearchIndex !== 1) {
            index = activeSearchIndex - 1;
        } else {
            index = totalSearchResults;
        }
        onSearchIndexChange(index);
    };
    render() {
        const { value, activeSearchIndex, totalSearchResults, kitchenSinkActive } = this.props;
        return (
            <div className={`${styles.searchWrapper} ${(value || this.state.active) ? styles.active : ""}`}>
                <div className={styles.searchIcon} />
                <input
                    className={styles.searchInput}
                    placeholder={"Search in Transcript"}
                    value={value}
                    onInput={this._handleOnChange}
                    onFocus={this._onFocus}
                    onBlur={this._onBlur}
                    tabIndex={kitchenSinkActive ? 1 : -1}
                    ref={(node) => {
                        this._inputRef = node;
                    }}
                />
                {value && <button className={styles.clearIcon} onClick={this._onClear} tabIndex={kitchenSinkActive ? 1 : -1} />}
                {value && (
                    <div className={styles.searchResults}>
                        {`${
                            totalSearchResults > 0
                                ? `${activeSearchIndex}/${totalSearchResults}`
                                : "0/0"
                        }`}
                    </div>
                )}
                <div className={styles.prevNextWrapper}>
                    {value && (
                        <button
                            tabIndex={kitchenSinkActive ? 1 : -1}
                            className={`${styles.prevNextButton} ${styles.prevButton} ${
                                totalSearchResults === 0 ? styles.disabled : ""
                            }`}
                            onClick={this._goToPrevSearchResult}
                        />
                    )}
                    {value && (
                        <button
                            tabIndex={kitchenSinkActive ? 1 : -1}
                            className={`${styles.prevNextButton} ${styles.nextButton} ${
                                totalSearchResults === 0 ? styles.disabled : ""
                            }`}
                            onClick={this._goToNextSearchResult}
                        />
                    )}
                </div>
            </div>
        );
    }
}
