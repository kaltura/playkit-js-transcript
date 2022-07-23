import {h, Component, ComponentChild} from 'preact';
import * as styles from './popover.scss';

export enum PopoverVerticalPositions {
  Top = 'top',
  Bottom = 'bottom'
}
export enum PopoverHorizontalPositions {
  Left = 'left',
  Right = 'right'
}
export enum PopoverTriggerMode {
  Click = 'click',
  Hover = 'hover'
}

export enum KeyboardKeys {
  Esc = 27,
  Enter = 13,
  Tab = 9,
  Space = 32,
  End = 35,
  Home = 36
}

const CLOSE_ON_HOVER_DELAY = 500;

const defaultProps = {
  verticalPosition: PopoverVerticalPositions.Top,
  horizontalPosition: PopoverHorizontalPositions.Left,
  triggerMode: PopoverTriggerMode.Click,
  className: 'popover',
  closeOnEsc: true,
  closeOnClick: true
};

interface PopoverProps {
  onClose?: () => void;
  onOpen?: () => void;
  closeOnClick: boolean;
  closeOnEsc: boolean;
  verticalPosition: PopoverVerticalPositions;
  horizontalPosition: PopoverHorizontalPositions;
  className: string;
  triggerMode: PopoverTriggerMode;
  content: ComponentChild;
  children: ComponentChild;
}

interface PopoverState {
  open: boolean;
}

export class Popover extends Component<PopoverProps, PopoverState> {
  private _closeTimeout: any = null;
  private _controlElement: HTMLDivElement | null = null;
  static defaultProps = {
    ...defaultProps
  };
  state = {
    open: false
  };

  componentWillUnmount() {
    this._removeListeners();
  }

  private _clearTimeout = () => {
    clearTimeout(this._closeTimeout);
    this._closeTimeout = null;
  };

  private _handleMouseEvent = (event: MouseEvent) => {
    if (!this._controlElement?.contains(event.target as Node | null) && this.props.closeOnClick) {
      this._closePopover();
    }
  };

  private _handleKeyboardEvent = (event: KeyboardEvent) => {
    if (this._controlElement?.contains(event.target as Node | null) && event.keyCode === KeyboardKeys.Enter) {
      // handle Enter key pressed on Target icon to prevent triggering of _closePopover twice
      return;
    }
    if ((this.props.closeOnEsc && event.keyCode === KeyboardKeys.Esc) || event.keyCode === KeyboardKeys.Enter) {
      // handle if ESC or Enter button presesd
      this._closePopover();
    }
  };

  private _openPopover = () => {
    const {onOpen} = this.props;
    this._clearTimeout();
    this.setState({open: true}, () => {
      this._addListeners();
      if (onOpen) {
        onOpen();
      }
    });
  };

  private _closePopover = () => {
    const {onClose} = this.props;
    this._clearTimeout();
    this.setState({open: false}, () => {
      this._removeListeners();
      if (onClose) {
        onClose();
      }
    });
  };

  private _togglePopover = (e: MouseEvent | KeyboardEvent) => {
    if (this.state.open) {
      this._closePopover();
    } else {
      this._openPopover();
    }
  };
  private _handleMouseEnter = () => {
    if (!this.state.open) {
      this._openPopover();
    }
  };
  private _handleMouseLeave = () => {
    this._closeTimeout = setTimeout(this._closePopover, CLOSE_ON_HOVER_DELAY);
  };
  private _handleHoverOnPopover = () => {
    if (this.state.open && this._closeTimeout) {
      this._clearTimeout();
    } else {
      this._closePopover();
    }
  };
  private _addListeners = () => {
    document.addEventListener('click', this._handleMouseEvent);
    document.addEventListener('keydown', this._handleKeyboardEvent);
  };
  private _removeListeners = () => {
    document.removeEventListener('click', this._handleMouseEvent);
    document.removeEventListener('keydown', this._handleKeyboardEvent);
  };
  private _getHoverEvents = () => {
    if (this.props.triggerMode === PopoverTriggerMode.Hover) {
      return {
        targetEvents: {
          onMouseEnter: this._handleMouseEnter,
          onMouseLeave: this._handleMouseLeave
        },
        popoverEvents: {
          onMouseEnter: this._handleHoverOnPopover,
          onMouseLeave: this._handleHoverOnPopover
        }
      };
    }
    return {targetEvents: {onClick: this._togglePopover}, popoverEvents: {}};
  };
  render(props: PopoverProps) {
    if (!props.content || !props.children) {
      return null;
    }
    const {targetEvents, popoverEvents} = this._getHoverEvents();
    return (
      <div className={styles.popoverContainer}>
        <div
          className="popover-anchor-container"
          ref={node => {
            this._controlElement = node;
          }}
          {...targetEvents}
        >
          {props.children}
        </div>
        {this.state.open && (
          <div
            aria-expanded="true"
            className={[props.className, styles.popoverComponent, styles[props.verticalPosition], styles[props.horizontalPosition]].join(' ')}
            {...popoverEvents}
          >
            {props.content}
          </div>
        )}
      </div>
    );
  }
}
