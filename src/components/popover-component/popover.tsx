import { h, Component } from "preact";
import * as styles from "./popover.scss";

const VERTICAL_POSITIONS = ["top", "bottom"];
const HORIZONTAL_POSITIONS = ["left", "right"];
const TRIGGER_MOD = ["click", "hover"];

const defaultProps = {
    verticalPosition: VERTICAL_POSITIONS[0],
    horizontalPosition: HORIZONTAL_POSITIONS[0],
    triggerMod: TRIGGER_MOD[0],
    className: "popover",
    open: false,
    closeOnEsc: false
};

interface PopoverProps {
    onClose?: () => void;
    onOpen?: () => void;
    verticalPosition: "top" | "bottom";
    horizontalPosition: "right" | "left";
    className: string;
    open: boolean;
    closeOnEsc: boolean;
    triggerMod: "click" | "hover";
    anchorEl: JSX.Element;
    children: JSX.Element | JSX.Element[];
}

export class Popover extends Component<PopoverProps> {
    static defaultProps = {
        ...defaultProps
    };
    componentDidMount() {
        if (this.props.closeOnEsc && this.props.onClose) {
            document.addEventListener("keydown", this._handleEscButtonPressed);
        }
    }
    componentWillUnmount() {
        document.removeEventListener("keydown", this._handleEscButtonPressed);
    }
    private _handleEscButtonPressed = (e: KeyboardEvent) => {
        const { onClose } = this.props;
        if (e.keyCode === 27 && onClose) {
            onClose();
        }
    };
    private _getTrigger = () => {
        const { triggerMod } = this.props;
        return TRIGGER_MOD.indexOf(triggerMod) > -1 ? triggerMod : defaultProps.triggerMod;
    };
    private _handleClick = () => {
        const trigger = this._getTrigger();
        if (trigger === "click") {
            this._handleOpenOrClose();
        }
    };
    private _handleHover = () => {
        const trigger = this._getTrigger();
        if (trigger === "hover") {
            this._handleOpenOrClose();
        }
    };
    private _handleOpenOrClose = () => {
        const { onOpen, onClose, open } = this.props;
        if (!open && onOpen) {
            onOpen();
        } else if (open && onClose) {
            onClose();
        }
    };
    render(props: PopoverProps): JSX.Element | null {
        if (!props.anchorEl || !props.children) {
            return null;
        }
        const popoverPosition = {
            vertical:
                VERTICAL_POSITIONS.indexOf(props.verticalPosition) > -1
                    ? props.verticalPosition
                    : defaultProps.verticalPosition,
            horizontal:
                HORIZONTAL_POSITIONS.indexOf(props.horizontalPosition) > -1
                    ? props.horizontalPosition
                    : defaultProps.horizontalPosition
        };
        return (
            <div className={styles.popoverContainer}>
                <div
                    className="popover-anchor-container"
                    onClick={this._handleClick}
                    onMouseEnter={this._handleHover}
                    onMouseLeave={this._handleHover}
                >
                    {props.anchorEl}
                </div>
                {props.open && (
                    <div
                        aria-expanded="true"
                        onKeyDown={this.props.onClose}
                        tabIndex={-1}
                        className={[
                            props.className,
                            styles.popoverComponent,
                            styles[popoverPosition.vertical],
                            styles[popoverPosition.horizontal]
                        ].join(" ")}
                    >
                        {props.children}
                    </div>
                )}
            </div>
        );
    }
}
