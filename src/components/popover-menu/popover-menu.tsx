import { h, Component } from "preact";
import * as styles from "./popover-menu.scss";

interface PopoverMenuProps {
    onDownload: () => void;
    onPrint: () => void;
    options: Array<{}>;
    itemRenderer: (el: any) => JSX.Element;
}

export class PopoverMenu extends Component<PopoverMenuProps> {
    render(props: any) {
        return (
            <div className={styles.popoverMenu}>
                {props.options.map((el: any) => (
                    el.customRenderer ? el.customRenderer(el) : props.itemRenderer(el)
                ))}
            </div>
        );
    }
}
