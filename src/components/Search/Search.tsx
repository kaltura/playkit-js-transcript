import { h, Component } from "preact";
import * as styles from "./Search.scss";

export interface SearchProps {
    onChange(value: string): void;
    onPrev: () => void;
    onNext: () => void;
    value: string;
}

export class Search extends Component<SearchProps> {
    private _handleOnChange = (e: any) => {
        this.props.onChange(e.target.value);
    }

    private _onClear = () => {
        this.props.onChange("");
    }
    render() {
        const { value, onPrev, onNext } = this.props;
        return (
            <div className={styles.searchWrapper}>
                <div className={styles.searchIcon} />
                <input
                    className={styles.searchInput}
                    placeholder={'Search in Transcript'}
                    value={value}
                    onKeyUp={this._handleOnChange}
                />
                <button onClick={onPrev}>prev</button>
                <button onClick={onNext}>next</button>
                <button className={styles.clearIcon} onClick={this._onClear} />
            </div>
        );
    }
}
