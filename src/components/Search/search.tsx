import * as styles from "./search.scss";
const { h, Component } = KalturaPlayer.ui.preact;

export interface SearchProps {
    onChange(value: string): void;
    onSearchIndexChange(value: number): void;
    value: string;
    activeSearchIndex: number;
    totalSearchResults: number;
}

interface SearchState {
    active: boolean;
}

export class Search extends Component<SearchProps, SearchState> {
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
        const { value, activeSearchIndex, totalSearchResults } = this.props;
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
                />
                {value && <button className={styles.clearIcon} onClick={this._onClear} />}
                {value && (
                    <p className={styles.searchResults}>
                        {`${
                            totalSearchResults > 0
                                ? `${activeSearchIndex}/${totalSearchResults}`
                                : "0/0"
                        }`}
                    </p>
                )}
                <div className={styles.prevNextWrapper}>
                    {value && (
                        <button
                            className={`${styles.prevNextButton} ${styles.prevButton} ${
                                totalSearchResults === 0 ? styles.disabled : ""
                            }`}
                            onClick={this._goToPrevSearchResult}
                        />
                    )}
                    {value && (
                        <button
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
