import { h, Component } from "preact";
import * as styles from "./popover-menu.scss";

export interface PopoverMenuItem {
    label: string;
    onMenuChosen: Function;
    customRenderer?: (el: PopoverMenuItem) => JSX.Element;
}

interface PopoverMenuProps {
    onDownload: () => void;
    onPrint: () => void;
    options: Array<PopoverMenuItem>;
    itemRenderer?: (el: PopoverMenuItem) => JSX.Element;
}

export class PopoverMenu extends Component<PopoverMenuProps> {
    render(props: any) {
        return (
            <div className={styles.popoverMenu}>
                {props.options.map((el: PopoverMenuItem) => {
                    if (el.customRenderer) {
                        return el.customRenderer(el);
                    }
                    if (props.itemRenderer) {
                        return props.itemRenderer(el);
                    }
                    return (
                        <div className="popover-menu-item" onClick={() => el.onMenuChosen()}>
                            {el.label}
                        </div>
                    );
                })}
            </div>
        );
    }
}
