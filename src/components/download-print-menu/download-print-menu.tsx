import { h, Component } from "preact";
import { PopoverComponent } from "../popover-component";
import { PopoverMenu } from "../popover-menu";
import * as styles from "./donwload-print-menu.scss";

interface DownloadPrintMenuProps {
    buttonAriaLabel: string;
}

interface DownloadPrintMenuState {
    popoverOpen: boolean;
}

class DownloadPrintMenu extends Component<DownloadPrintMenuProps, DownloadPrintMenuState> {
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

    private _handleClickOutside(e: any) {
        if (
            //   !this.props.isMobile &&
            !!this._controlElement &&
            // !this._controlSettingsElement.contains(e.target) &&
            this.state.popoverOpen
        ) {
            // if (e.target.classList.contains(style.overlayPlay)) {
            //     e.stopPropagation();
            // }
            this.setState({ popoverOpen: false });
        }
    }

    private _onButtonClick(): void {
        this.setState((state: DownloadPrintMenuState) => ({ popoverOpen: !state.popoverOpen }));
    }

    private _onDownloadClicked(): void {
        // start downloading
    }

    private _onPrintClicked(): void {
        // start downloading
    }

    render(props: DownloadPrintMenuProps) {
        return (
            <div
                ref={c => (this._controlElement = c)}
                // className={[style.controlButtonContainer, style.controlSettings].join(" ")}
            >
                <button
                    tabIndex={0}
                    aria-label={props.buttonAriaLabel}
                    // className={
                    //     this.state.smartContainerOpen
                    //         ? [style.controlButton, style.active].join(" ")
                    //         : style.controlButton
                    // }
                    onClick={this._onButtonClick}
                >
                    <div className={styles.icon} />;
                </button>
                {!this.state.popoverOpen ? (
                    ""
                ) : (
                    <PopoverComponent
                        onClose={this._onButtonClick}
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
