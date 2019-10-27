import { h, Component } from "preact";
import {
    Popover,
    PopoverHorizontalPositions,
    PopoverVerticalPositions
} from "@playkit-js-contrib/ui";
import { PopoverMenu, PopoverMenuItem } from "../popover-menu";
import * as styles from "./download-print-menu.scss";

interface DownloadPrintMenuProps {
    dropdownAriaLabel: string;
    printButtonAriaLabel: string;
    downloadButtonAriaLabel: string;
    onDownload: () => void;
    onPrint: () => void;
    downloadDisabled: boolean;
    printDisabled: boolean;
}

interface DownloadPrintMenuState {
    popoverOpen: boolean;
}

export class DownloadPrintMenu extends Component<DownloadPrintMenuProps, DownloadPrintMenuState> {
    static defaultProps = {
        dropdownAriaLabel: "Download or print current transcript",
        printButtonAriaLabel: "Print current transcript",
        downloadButtonAriaLabel: "Download current transcript"
    };
    state: DownloadPrintMenuState = {
        popoverOpen: false
    };

    private _onDownloadClicked = () => {
        this.props.onDownload();
    };

    private _onPrintClicked = () => {
        this.props.onPrint();
    };
    private _onKeyDown = (e: KeyboardEvent, callBack: Function) => {
        e.stopPropagation();
        switch (e.keyCode) {
            case 13: // Enter pressed
                if (typeof callBack === "function") {
                    callBack();
                }
                break;
        }
    };
    private _popoverMenuItemRenderer = (el: PopoverMenuItem) => (
        <div
            tabIndex={1}
            role="button"
            onClick={() => el.onMenuChosen()}
            onKeyDown={e => this._onKeyDown(e, el.onMenuChosen)}
            className={styles.popoverMenuItem}
        >
            {el.label}
        </div>
    );

    private _getPopoverMenuOptions = () => {
        return [
            {
                label: this.props.downloadButtonAriaLabel,
                onMenuChosen: this._onDownloadClicked
            },
            {
                label: this.props.printButtonAriaLabel,
                onMenuChosen: this._onPrintClicked
            }
        ];
    };

    render(props: DownloadPrintMenuProps) {
        const { downloadDisabled, printDisabled } = props;
        if (!downloadDisabled && !printDisabled) {
            const popoverContent = (
                <PopoverMenu
                    itemRenderer={this._popoverMenuItemRenderer}
                    options={this._getPopoverMenuOptions()}
                />
            );
            return (
                <div>
                    <Popover
                        className="download-print-popover"
                        verticalPosition={PopoverVerticalPositions.Bottom}
                        horizontalPosition={PopoverHorizontalPositions.Left}
                        content={popoverContent}
                        closeOnEsc={true}
                    >
                        <button
                            tabIndex={1}
                            aria-label={this.props.dropdownAriaLabel}
                            className={styles.downloadPrintButton}
                        >
                            <div className={[styles.icon, styles.downloadIcon].join(" ")} />
                        </button>
                    </Popover>
                </div>
            );
        }
        if (!downloadDisabled && printDisabled) {
            return (
                <button
                    tabIndex={1}
                    aria-label={props.downloadButtonAriaLabel}
                    className={styles.downloadPrintButton}
                    onClick={this._onDownloadClicked}
                >
                    <div className={[styles.icon, styles.downloadIcon].join(" ")} />
                </button>
            );
        }
        if (downloadDisabled && !printDisabled) {
            return (
                <button
                    tabIndex={1}
                    aria-label={props.printButtonAriaLabel}
                    className={styles.downloadPrintButton}
                    onClick={this._onPrintClicked}
                >
                    <div className={[styles.icon, styles.printIcon].join(" ")} />
                </button>
            );
        }
        return null;
    }
}
