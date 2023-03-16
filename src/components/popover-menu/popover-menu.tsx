import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {h, Component, VNode} from 'preact';

const {withEventManager} = KalturaPlayer.ui.Event;
const {ENTER, ESC, SPACE} = KalturaPlayer.ui.utils.KeyMap;

import * as styles from './popover-menu.scss';

interface PopoverMenuItemData {
  testId: string;
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
        <A11yWrapper onClick={this.togglePopover}>
          <div
            data-testid="popover-anchor-container"
            className={`${styles.popoverAnchorContainer} ${this.state.isOpen ? styles.active : ''}`}
            ref={node => {
              this._controlElementRef = node;
            }}>
            <div className={styles.popoverAnchor}>{children}</div>
          </div>
        </A11yWrapper>

        <div className={styles.popoverComponent} role="menu" aria-expanded={this.state.isOpen}>
          {this.state.isOpen
            ? items.map(({label, onClick, testId}) => {
                return (
                  <A11yWrapper
                    onClick={() => {
                      this.closePopover();
                      onClick();
                    }}>
                    {
                      <div tabIndex={0} role="menuitem" className={styles.popoverMenuItem} data-testid={testId}>
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
