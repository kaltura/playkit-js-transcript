
import {h, Component, cloneElement} from 'preact';
import * as styles from './popover-component.scss';

interface PopoverComponentProps {
    onClose: () => void;
}

export class PopoverComponent extends Component<PopoverComponentProps> {
  render(props: any) {
    return (
        <div
            onKeyDown={e => {
                props.onClose(e);
            }}
            tabIndex={-1}
            // className={[styles.smartContainer, styles.top, styles.left].join(' ')}
        >
        {props.children}
      </div>
    )
  }
}
