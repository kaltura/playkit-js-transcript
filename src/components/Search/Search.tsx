import { h, Component } from "preact";
import * as styles from "./Search.scss";

export interface SearchProps {
    onChange(value: string): void;
    // onSearchIndexChange(value: number): void;
    value: string;
}

export class Search extends Component<SearchProps> {
    private _handleOnChange = (e: any) => {
        this.props.onChange(e.target.value);
    }

    private _onClear = () => {
        this.props.onChange("");
    }

    // private _goToNextSearchResult = () => {

    // }
    // private _goToPrevSearchResult = () => {

    // }
    render() {
        return (
            <div className={styles.searchWrapper}>
                <div className={styles.searchIcon} />
                <input
                    className={styles.searchInput}
                    placeholder={'Search in Transcript'}
                    value={this.props.value}
                    onInput={this._handleOnChange}
                />
                {/* <button onClick={this._goToPrevSearchResult}>prev</button>
                <button onClick={this._goToNextSearchResult}>next</button> */}
                <button className={styles.clearIcon} onClick={this._onClear} />
            </div>
        );
    }
}
