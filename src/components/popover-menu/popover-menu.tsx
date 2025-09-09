import {A11yWrapper} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {h, Component, VNode} from 'preact';
import {PopoverMenuItem, PopoverMenuItemData} from './popover-menu-item';
import {ui} from '@playkit-js/kaltura-player-js';
const {Tooltip} = ui.components;
const {withText, Text} = ui.preacti18n;

const {withEventManager} = ui.Event;
const {KeyCode} = ui.utils

import * as styles from './popover-menu.scss';

interface PopoverMenuProps {
  moreOptionsLabel?: string;
  eventManager?: any;
  children?: VNode;
  items: Array<PopoverMenuItemData>;
  kitchenSinkDetached: boolean;
  popOverMenuHeight: number;
  shouldUseCalculatedHeight: boolean;
}

interface PopoverMenuState {
  isOpen: boolean;
}
const translates = {
  moreOptionsLabel: <Text id="transcript.more_options">More transcript options</Text>
};

@withText(translates)
@withEventManager
class PopoverMenu extends Component<PopoverMenuProps, PopoverMenuState> {
  private _controlElementRef: HTMLDivElement | null = null;
  private _popoverElementRef: HTMLDivElement | null = null;
  private _itemsRefMap: Map<number, HTMLDivElement | null> = new Map();

  eventManager: any;

  constructor(props: PopoverMenuProps) {
    super(props);
    this.state = {
      isOpen: false
    };

    this.props.eventManager?.listen(document, 'click', this._handleMouseEvent);
    this.props.eventManager?.listen(document, 'keydown', this._handleKeydownEvent);
  }

  componentWillUnmount() {
    this._itemsRefMap = new Map();
  }

  private _handleMouseEvent = (event: MouseEvent) => {
    if (!this._controlElementRef?.contains(event.target as Node | null)) {
      this._closePopover();
    }
  };

  // The Transcript parent component already listens onKeyDown at the root to close the entire plugin. 
  // By handling Escape onKeyUp here we prevent that parent handler from firing when the popover is open.
  private _handleKeyupEvent = (event: KeyboardEvent) => {
    if (this.state.isOpen && event.code === KeyCode.Escape) {
      event.preventDefault();
      event.stopPropagation();
      this._closePopover();
      this.setState({ isOpen: false }, () => {
      this._controlElementRef?.focus();
      });
    }
  };

  private _handleKeydownEvent = (event: KeyboardEvent) => {
    const eventTarget = event.target as Node | null;

    if (
      this.state.isOpen &&
      event.code === KeyCode.Tab &&
      !this._controlElementRef?.contains(eventTarget) &&
      !this._popoverElementRef?.contains(eventTarget) &&
      eventTarget !== this._controlElementRef
    ) {
      this._closePopover();
    }
  };

  private _handleUpKeyPressed = (currentIndex: number) => () => {
    this._getItemRef(currentIndex - 1)?.focus();
  };

  private _handleDownKeyPressed = (currentIndex: number) => () => {
    this._getItemRef(currentIndex + 1)?.focus();
  };

  private _closePopover() {
    this.setState({isOpen: false});
  }

  private _togglePopover = () => {
    const isOpen = !this.state.isOpen;

    this.setState({isOpen}, () => {
    if (isOpen) {
      const firstItemIndex = this.props.items.findIndex(
        (item: PopoverMenuItemData) => !item.isDisabled
      );
      if (firstItemIndex !== -1) {
        this._getItemRef(firstItemIndex)?.focus();
      }
      this.props.eventManager?.listen(this._controlElementRef, 'keydown', (event: KeyboardEvent) => {
        if (event.code === KeyCode.Tab) {
          const firstNonDisabledItem = this.props.items.findIndex((item: PopoverMenuItemData) => !item.isDisabled);
          if (firstNonDisabledItem !== -1) {
            this._getItemRef(firstNonDisabledItem - 1)?.focus();
          }
        }
      });
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
    const {children, items, kitchenSinkDetached, popOverMenuHeight, shouldUseCalculatedHeight} = this.props;

    let popOverHeight = 0;
    if (shouldUseCalculatedHeight) {
      const neededHeight = 48 * items.length;
      const padding = 14;
      popOverHeight = popOverMenuHeight - neededHeight <= 0 ? popOverMenuHeight - padding : neededHeight - padding;
    }

    const popoverMenuContent = (
      <div className={styles.popoverContainer}>
        <A11yWrapper
          onClick={e => {
            e.stopPropagation();
            this._togglePopover();
          }}>
          <div
            tabIndex={0}
            data-testid="popover-anchor-container"
            className={`${styles.popoverAnchorContainer} ${this.state.isOpen ? styles.active : ''}`}
            aria-expanded={this.state.isOpen}
            aria-controls="popoverContent"
            ref={node => {
              if (node) {
                this._controlElementRef = node;
              }
            }}>
            <div className={styles.popoverAnchor}>{children}</div>
          </div>
        </A11yWrapper>

        <div
          className={styles.popoverComponent}
          onKeyUp={this._handleKeyupEvent}
          style={shouldUseCalculatedHeight ? {height: `${popOverHeight}px`, overflowY: 'auto'} : {}}
          role="menu"
          aria-expanded={this.state.isOpen}
          id="popoverContent"
          ref={node => {
            this._popoverElementRef = node;
          }}>
          {this.state.isOpen
            ? items.map((item, index) => (
                <PopoverMenuItem
                  key={index}
                  item={item}
                  index={index}
                  onKeyDown={this._handleDownKeyPressed}
                  onKeyUp={this._handleUpKeyPressed}
                  setRef={this._setItemRef}
                  onClick={() => {
                    this._closePopover();
                    if (!item.items) {
                      item.onClick?.();
                    }
                  }}
                />
              ))
            : null}
        </div>
      </div>
    );

    return this.state.isOpen ? (
      popoverMenuContent
    ) : (
      <div>
        <Tooltip label={this.props.moreOptionsLabel!} {...(kitchenSinkDetached ? {type: 'bottom-left', strictPosition: true} : {})}>
          {popoverMenuContent}
        </Tooltip>
      </div>
    );
  }
}

export {PopoverMenu, PopoverMenuItemData};
