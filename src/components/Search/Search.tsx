import { h, Component } from "preact";
import * as styles from "./search.scss";

export interface SearchProps {
    onChange(value: string): void;
    onSearchIndexChange(value: number): void;
    value: string;
    activeSearchIndex: number;
    totalSearchResults: number;
}

export class Search extends Component<SearchProps> {
    private _handleOnChange = (e: any) => {
        this.props.onChange(e.target.value);
    };

    private _onClear = () => {
        this.props.onChange("");
    };

    private _goToNextSearchResult = () => {
        const { activeSearchIndex, totalSearchResults, onSearchIndexChange } = this.props;
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
            <div className={`${styles.searchWrapper} ${value ? styles.active : ""}`}>
                <div className={styles.searchIcon} />
                <input
                    className={styles.searchInput}
                    placeholder={"Search in Transcript"}
                    value={value}
                    onInput={this._handleOnChange}
                />
                {value && <button className={styles.clearIcon} onClick={this._onClear} />}
                {value && (
                    <p className={styles.searchResults}>
                        {`${
                            totalSearchResults > 0
                                ? `${activeSearchIndex}/${totalSearchResults}`
                                : "0 results"
                        }`}
                    </p>
                )}
                <div className={styles.prevNextWrapper}>
                    {value && totalSearchResults > 0 && (
                        <button
                            className={styles.prevNextButton}
                            onClick={this._goToPrevSearchResult}
                        />
                    )}
                    {value && totalSearchResults > 0 && (
                        <button
                            className={styles.prevNextButton}
                            onClick={this._goToNextSearchResult}
                        />
                    )}
                </div>
            </div>
        );
    }
}
