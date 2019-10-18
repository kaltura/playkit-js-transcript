import { h, Component } from "preact";
import { Popover } from "../popover-component";
// import { Popover } from "@playkit-js-contrib/ui";
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
        dropdownAriaLabel: "Download or print transcript",
        printButtonAriaLabel: "Print current transcript",
        downloadButtonAriaLabel: "Download current transcript"
    };
    state: DownloadPrintMenuState = {
        popoverOpen: false
    };
    private _controlElement: any;

    componentDidMount() {
        document.addEventListener("click", this._handleClickOutside);
    }

    componentWillUnmount() {
        document.removeEventListener("click", this._handleClickOutside);
    }

    // TODO: could be used for popover accessibility
    // componentDidUpdate(prevProps: DownloadPrintMenuProps, prevState: DownloadPrintMenuState) {
    //     if (!prevState.popoverOpen && this.state.popoverOpen) {
    //         this._controlElement.children[0].focus();
    //     }
    // }

    private _handleClickOutside = (e: any) => {
        if (
            //   !this.props.isMobile &&
            !!this._controlElement &&
            !this._controlElement.contains(e.target) &&
            this.state.popoverOpen
        ) {
            // if (e.target.classList.contains(style.overlayPlay)) {
            //     e.stopPropagation();
            // }
            this._handleClosePopover();
        }
    };

    private _handleClosePopover = () => {
        this.setState({ popoverOpen: false });
    };

    private _onButtonClick = () => {
        this.setState((state: DownloadPrintMenuState) => ({ popoverOpen: !state.popoverOpen }));
    };

    private _onDownloadClicked = () => {
        this._handleClosePopover();
        this.props.onDownload();
    };

    private _onPrintClicked = () => {
        this._handleClosePopover();
        this.props.onPrint();
    };
    private _onKeyDown = (e: KeyboardEvent, cb: Function) => {
        e.stopPropagation();
        switch (e.keyCode) {
            case 13: // Enter pressed
                if (typeof cb === "function") {
                    cb();
                }
                break;
            case 27: // ESC pressed
                this._handleClosePopover();
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

    private _renderButton = () => (
        <button
            tabIndex={1}
            aria-label={this.props.dropdownAriaLabel}
            className={styles.downloadPrintButton}
        >
            <div className={[styles.icon, styles.downloadIcon].join(" ")} />
        </button>
    );

    render(props: DownloadPrintMenuProps) {
        if (!props.downloadDisabled && !props.printDisabled) {
            return (
                <div ref={c => (this._controlElement = c)}>
                    <Popover
                        className="download-print-popover"
                        onClose={this._onButtonClick}
                        onOpen={this._onButtonClick}
                        verticalPosition="bottom"
                        horizontalPosition="left"
                        open={this.state.popoverOpen}
                        anchorEl={this._renderButton()}
                        closeOnEsc={true}
                    >
                        <PopoverMenu
                            onDownload={this._onDownloadClicked}
                            onPrint={this._onPrintClicked}
                            itemRenderer={this._popoverMenuItemRenderer}
                            options={this._getPopoverMenuOptions()}
                        />
                    </Popover>
                </div>
            );
        }
        if (!props.downloadDisabled && props.printDisabled) {
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
        if (props.downloadDisabled && !props.printDisabled) {
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
