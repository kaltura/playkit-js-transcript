import { h, Component } from "preact";
import * as styles from "popover-menu.scss";

interface PopoverMenuProps {
    onDownload: () => void;
    onPrint: () => void;
}

export class PopoverMenu extends Component<PopoverMenuProps> {
    render(props: any) {
        return (
            <div>
                <p>download</p>
                <p>print</p>
                {/* <div
            ref={c => this._menuElement = c}
            className={[style.dropdownMenu, ...this.state.position].join(' ')}
        >
            {
            props.options.map((o, index) => (
                <div
                    key={index}
                    // className={this.isSelected(o) ? [style.dropdownMenuItem, style.active].join(' ') : style.dropdownMenuItem}
                    onClick={() => this.onSelect(o)}
                    onKeyDown={e => this.onKeyDown(e, o)}
                >
                <span>{o.label}</span>
                <span className={style.menuIconContainer} style={`opacity: ${ this.isSelected(o) ? 1 : 0 }`}><Icon
                    type={IconType.Check}/></span>
                </div>
            ))
            }
        </div> */}
            </div>
        );
    }
}
