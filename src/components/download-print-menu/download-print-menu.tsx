import { h, Component } from "preact";
import { PopoverComponent } from "../popover-component";
import { PopoverMenu } from "../popover-menu";
import * as styles from "./download-print-menu.scss";

interface DownloadPrintMenuProps {
    buttonAriaLabel: string;
    onDownload: () => void;
}

interface DownloadPrintMenuState {
    popoverOpen: boolean;
}

export class DownloadPrintMenu extends Component<DownloadPrintMenuProps, DownloadPrintMenuState> {
    static defaultProps = {
        buttonAriaLabel: "Download or print transcript"
    }
    state: DownloadPrintMenuState = {
        popoverOpen: false,
    };
    private _controlElement: any;

    componentDidMount() {
        document.addEventListener("click", this._handleClickOutside);
    }

    componentWillUnmount() {
        document.removeEventListener("click", this._handleClickOutside);
    }

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
    }

    private _handleClosePopover = () => {
        this.setState({ popoverOpen: false });
    }

    private _onButtonClick = () => {
        this.setState((state: DownloadPrintMenuState) => ({ popoverOpen: !state.popoverOpen }));
    }

    private _onDownloadClicked = () => {
        this.props.onDownload();
        this._handleClosePopover();
    }

    private _onPrintClicked = () => {
        console.log("start printing")
        this._handleClosePopover();
    }
    private _onKeyDown = (e: KeyboardEvent, cb: Function) => {
        switch (e.keyCode) {
          case 13:
            if (typeof cb === "function") {
                cb();
            }
            break;
          case 27:
            e.stopPropagation();
            this._handleClosePopover();
            break;
        }
      }

    render(props: DownloadPrintMenuProps) {
        const itemRenderer = (el: any) => (
            <div
                onClick={el.onMenuChosen}
                onKeyDown={e => this._onKeyDown(e, el.onMenuChosen)}
                className={styles.popoverMenuItem}
            >{el.label}</div>
        )
        return (
            <div
                ref={c => (this._controlElement = c)}
                className={styles.downloadPrintContainer}
            >
                <button
                    tabIndex={0}
                    aria-label={props.buttonAriaLabel}
                    className={`${styles.downloadPrintButton}${this.state.popoverOpen ? ` ${styles.active}`:''}`}
                    onClick={this._onButtonClick}
                >
                    <div className={styles.icon} />
                </button>
                {this.state.popoverOpen && (
                    <PopoverComponent
                        onClose={this._onButtonClick}
                        verticalPosition={"bottom"}
                        horizontalPosition={"left"}
                    >
                        <PopoverMenu
                            onDownload={this._onDownloadClicked}
                            onPrint={this._onPrintClicked}
                            itemRenderer={itemRenderer}
                            options={[
                                { label: "Download ", onMenuChosen: this._onDownloadClicked },
                                { label: "Print", onMenuChosen: this._onPrintClicked }
                            ]}
                        />
                    </PopoverComponent>
                )}
            </div>
        );
    }
}
