import {A11yWrapper} from '@playkit-js/common';
import {h, Component, VNode} from 'preact';

const {withEventManager} = KalturaPlayer.ui.Event;
const {ENTER, ESC, SPACE} = KalturaPlayer.ui.utils.KeyMap;

import * as styles from './popover-menu.scss';

interface PopoverMenuItemData {
  label: string;
  onClick: () => void;
}

interface PopoverMenuProps {
  eventManager?: any;
  children?: VNode;
  items: Array<PopoverMenuItemData>;
}

interface PopoverMenuState {
  isOpen: boolean;
}

@withEventManager
class PopoverMenu extends Component<PopoverMenuProps, PopoverMenuState> {
  private _controlElementRef: HTMLDivElement | null = null;
  private _popoverElementRef: HTMLDivElement | null = null;

  eventManager: any;

  constructor(props: PopoverMenuProps) {
    super(props);
    this.state = {isOpen: false};

    this.props.eventManager?.listen(document, 'click', this.handleMouseEvent);
    this.props.eventManager?.listen(document, 'keydown', this.handleKeyboardEvent);
  }

  private handleMouseEvent = (event: MouseEvent) => {
    if (!this._controlElementRef?.contains(event.target as Node | null)) {
      this.closePopover();
    }
  };

  private handleKeyboardEvent = (event: KeyboardEvent) => {
    if (this._controlElementRef?.contains(event.target as Node | null) && [ENTER, SPACE].includes(event.keyCode)) {
      // use handler of control element
      event.preventDefault();
      return;
    }
    if (this._popoverElementRef?.contains(event.target as Node | null) && event.keyCode !== ESC) {
      // use handler of popover element
      return;
    }
    this.closePopover();
  };

  private closePopover() {
    this.setState({isOpen: false});
  }

  private togglePopover = () => {
    this.setState({isOpen: !this.state.isOpen});
  };

  render() {
    const {children, items} = this.props;

    return (
      <div className={styles.popoverContainer}>
        <div
          className={`${styles.popoverAnchorContainer} ${this.state.isOpen ? styles.active : ''}`}
          ref={node => {
            this._controlElementRef = node;
          }}
          onClick={this.togglePopover}>
          <div className={styles.popoverAnchor}>{children}</div>
        </div>
        <div className={styles.popoverComponent} role="menu">
          {this.state.isOpen
            ? items.map(({label, onClick}) => {
                return (
                  <A11yWrapper
                    {...{
                      onClick: () => {
                        this.closePopover();
                        onClick();
                      }
                    }}>
                    {
                      <div tabIndex={0} role="menuitem" className={styles.popoverMenuItem}>
                        {label}
                      </div>
                    }
                  </A11yWrapper>
                );
              })
            : null}
        </div>
      </div>
    );
  }
}

export {PopoverMenu, PopoverMenuItemData};
