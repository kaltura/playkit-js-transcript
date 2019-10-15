import { h, Component, cloneElement } from "preact";
import * as styles from "./popover-component.scss";

const VERTICAL_POSIONS = ["top", "bottom"];
const HORIZONTAL_POSITOINS = ["left", "center", "right"];

const defaultPositions = {
    verticalPosition: VERTICAL_POSIONS[0],
    horizontalPosition: HORIZONTAL_POSITOINS[0]
}

interface PopoverComponentProps {
    onClose: () => void;
    verticalPosition: "top" | "bottom";
    horizontalPosition: "left" | "center" | "right";
}

export class PopoverComponent extends Component<PopoverComponentProps> {
    static defaultProps = {
        ...defaultPositions
    }
    render(props: any) {
        const popoverPosition = {
            vertical: VERTICAL_POSIONS.includes(props.verticalPosition) ? props.verticalPosition : defaultPositions.verticalPosition,
            horizontal: HORIZONTAL_POSITOINS.includes(props.horizontalPosition) ? props.horizontalPosition : defaultPositions.horizontalPosition,
        }
        return (
            <div
                onKeyDown={e => {
                    props.onClose(e);
                }}
                tabIndex={-1}
                className={[styles.popoverComponent, styles[popoverPosition.vertical], styles[popoverPosition.horizontal]].join(' ')}
            >
                {props.children}
            </div>
        );
    }
}
