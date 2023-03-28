import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {h, Component, VNode} from 'preact';

const {Tooltip} = KalturaPlayer.ui.components;

const {withEventManager} = KalturaPlayer.ui.Event;
const {TAB} = KalturaPlayer.ui.utils.KeyMap;

import * as styles from './popover-menu.scss';

interface PopoverMenuItemData {
  testId: string;
  label: string;
  onClick: () => void;
  isDisabled?: boolean;
}

interface PopoverMenuProps {
  label: string;
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
  private _itemsRefMap: Map<number, HTMLDivElement | null> = new Map();

  eventManager: any;

  constructor(props: PopoverMenuProps) {
    super(props);
    this.state = {isOpen: false};

    this.props.eventManager?.listen(document, 'click', this.handleMouseEvent);
    this.props.eventManager?.listen(document, 'keydown', this.handleKeydownEvent);
  }

  componentWillUnmount() {
    this._itemsRefMap = new Map();
  }

  private handleMouseEvent = (event: MouseEvent) => {
    if (!this._controlElementRef?.contains(event.target as Node | null)) {
      this.closePopover();
    }
  };

  private handleKeydownEvent = (event: KeyboardEvent) => {
    const eventTarget = event.target as Node | null;
    if (
      this.state.isOpen &&
      event.keyCode === TAB &&
      !this._controlElementRef?.contains(eventTarget) &&
      !this._popoverElementRef?.contains(eventTarget)
    ) {
      this.closePopover();
    }
  };

  private _handleUpKeyPressed = (currentIndex: number) => () => {
    this._getItemRef(currentIndex - 1)?.focus();
  };

  private _handleDownKeyPressed = (currentIndex: number) => () => {
    this._getItemRef(currentIndex + 1)?.focus();
  };

  private closePopover() {
    this.setState({isOpen: false});
  }

  private togglePopover = (focusFirstItem: boolean) => {
    const isOpen = !this.state.isOpen;

    this.setState({isOpen}, () => {
      if (isOpen && focusFirstItem) {
        const firstNonDisabledItem = this.props.items.findIndex((item: PopoverMenuItemData) => !item.isDisabled);
        if (firstNonDisabledItem !== -1) {
          this._getItemRef(firstNonDisabledItem)?.focus();
        }
      }
    });
  };

  private _getItemRef = (index: number) => {
    return this._itemsRefMap.get(index);
  };

  private _setItemRef = (index: number, ref: HTMLDivElement | null) => {
    return this._itemsRefMap.set(index, ref);
  };

  render() {
    const {label, children, items} = this.props;

    const popoverMenuContent = (
      <div className={styles.popoverContainer}>
        <A11yWrapper onClick={() => this.togglePopover(true)}>
          <div
            data-testid="popover-anchor-container"
            className={`${styles.popoverAnchorContainer} ${this.state.isOpen ? styles.active : ''}`}
            ref={node => {
              this._controlElementRef = node;
            }}>
            <div className={styles.popoverAnchor}>{children}</div>
          </div>
        </A11yWrapper>

        <div
          className={styles.popoverComponent}
          role="menu"
          aria-expanded={this.state.isOpen}
          ref={node => {
            this._popoverElementRef = node;
          }}>
          {this.state.isOpen
            ? items.map(({label, onClick, testId, isDisabled}, index) => {
                return (
                  <A11yWrapper
                    onClick={() => {
                      if (!isDisabled) {
                        this.closePopover();
                        onClick();
                      }
                    }}
                    onDownKeyPressed={() => {
                      if (!isDisabled) {
                        this._handleDownKeyPressed(index);
                      }
                    }}
                    onUpKeyPressed={() => {
                      if (!isDisabled) {
                        this._handleUpKeyPressed(index);
                      }
                    }}>
                    {
                      <div
                        tabIndex={isDisabled ? -1 : 0}
                        role="menuitem"
                        className={`${styles.popoverMenuItem} ${isDisabled ? styles.popoverMenuItemDisabled : ''}`}
                        data-testid={testId}
                        ref={node => {
                          this._setItemRef(index, node);
                        }}>
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

    return this.state.isOpen ? (
      popoverMenuContent
    ) : (
      <div>
        <Tooltip label={label}>{popoverMenuContent}</Tooltip>
      </div>
    );
  }
}

export {PopoverMenu, PopoverMenuItemData};
