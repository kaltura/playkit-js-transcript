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
            this.setState({ popoverOpen: false });
        }
    }

    private _onButtonClick = () => {
        this.setState((state: DownloadPrintMenuState) => ({ popoverOpen: !state.popoverOpen }));
    }

    private _onDownloadClicked(): void {
        this.props.onDownload();
    }

    private _onPrintClicked(): void {
        // start downloading
    }

    render(props: DownloadPrintMenuProps) {
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
                        />
                    </PopoverComponent>
                )}
            </div>
        );
    }
}
