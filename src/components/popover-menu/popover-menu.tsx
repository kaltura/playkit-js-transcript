import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {h, Component, VNode} from 'preact';

const {Tooltip} = KalturaPlayer.ui.components;

const {withEventManager} = KalturaPlayer.ui.Event;
const {ENTER, ESC, SPACE, TAB, UP, DOWN} = KalturaPlayer.ui.utils.KeyMap;

import * as styles from './popover-menu.scss';

interface PopoverMenuItemData {
  testId: string;
  label: string;
  onClick: () => void;
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
  }

  componentWillUnmount() {
    this._itemsRefMap = new Map();
  }

  private handleMouseEvent = (event: MouseEvent) => {
    if (!this._controlElementRef?.contains(event.target as Node | null)) {
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
        this._getItemRef(0)?.focus();
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

        <div className={styles.popoverComponent} role="menu" aria-expanded={this.state.isOpen}>
          {this.state.isOpen
            ? items.map(({label, onClick, testId}, index) => {
                return (
                  <A11yWrapper
                    onClick={() => {
                      this.closePopover();
                      onClick();
                    }}
                    onDownKeyPressed={this._handleDownKeyPressed(index)}
                    onUpKeyPressed={this._handleUpKeyPressed(index)}>
                    {
                      <div
                        tabIndex={0}
                        role="menuitem"
                        className={styles.popoverMenuItem}
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
