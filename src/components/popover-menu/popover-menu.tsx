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
    options: Array<{}>;
    itemRenderer: (el: PopoverMenuItem) => JSX.Element;
}

export class PopoverMenu extends Component<PopoverMenuProps> {
    render(props: any) {
        return (
            <div className={styles.popoverMenu}>
                {props.options.map((el: PopoverMenuItem) => (
                    el.customRenderer ? el.customRenderer(el) : props.itemRenderer(el)
                ))}
            </div>
        );
    }
}
