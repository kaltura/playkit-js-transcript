import { h, Component, createRef } from 'preact';
import { createPortal } from 'preact/compat';
import { ui } from '@playkit-js/kaltura-player-js';
import {Icon, IconSize} from '@playkit-js/common/dist/icon';
import { icons } from '../icons';
import * as styles from '../popover-overlay/popover-overlay.scss';
// @ts-ignore
const {withKeyboardA11y} = KalturaPlayer.ui.utils
const { Overlay } = KalturaPlayer.ui.components;
const { getOverlayPortalElement } = ui;
const { withText, Text } = ui.preacti18n;
const {PLAYER_BREAK_POINTS} = ui.Components;
const focusableElements = 'select, button, [href], input:not([type="hidden"]), textarea, [tabindex]:not([tabindex="-1"])';

const translates = {
  moreOptionsLabel: <Text id="transcript.more_options">More transcript options</Text>,
};

interface PopoverOverlayProps {
  player: any;
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    testId: string;
    label: string;
    onClick?: () => void;
    isDisabled?: boolean;
  }>;
  textTracks: Array<any>;
  changeLanguage: (track: any) => void;
  title?: string;
  ariaLabel?: string;
  playerWidth?: number;
  moreOptionsLabel?: preact.VNode;
  transcript?: preact.VNode;
  printTranscript?: preact.VNode;
  downloadTranscript?: preact.VNode;
  kitchenSinkDetached: boolean;
  handleKeyDown?: (e: KeyboardEvent) => void;
  addAccessibleChild?: (element: HTMLElement, pushToBeginning?: boolean) => void;
  setIsModal?: (isModal: boolean) => void;
}

@withKeyboardA11y
@withText(translates)
export class PopoverOverlay extends Component<PopoverOverlayProps> {
  private _containerRef = createRef<HTMLDivElement>();
  private _focusablesRegistered = false;

  private _focusFirstItem() {
    const container = this._containerRef.current;
    if (!container) return;
    const focusable = container.querySelector<HTMLElement>(focusableElements);
    focusable?.focus();
  }

  componentDidMount() {
    this.props.setIsModal?.(true);
  }

  componentDidUpdate(prevProps: PopoverOverlayProps) {
    if (!prevProps.isOpen && this.props.isOpen) this._focusFirstItem();
    // Register focusable elements when overlay opens
    if (!prevProps.isOpen && this.props.isOpen) {
      this._focusablesRegistered = false;
      this._registerAccessibleChildren();
    }
    // If content changed while open, re-register once
    if (this.props.isOpen && !this._focusablesRegistered && (prevProps.items !== this.props.items || prevProps.textTracks !== this.props.textTracks)) {
      this._registerAccessibleChildren();
    }
    if (prevProps.isOpen && !this.props.isOpen) {
      this._focusablesRegistered = false;
    }
  }

  componentWillUnmount() {
    this.props.setIsModal?.(false);
  }

  private _getFocusableElements(): HTMLElement[] {
    const container = this._containerRef.current;
    if (!container) return [];

    return Array.from(
      container.querySelectorAll<HTMLElement>(focusableElements)).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  private _registerAccessibleChildren() {
    const { addAccessibleChild } = this.props;
    if (!addAccessibleChild || this._focusablesRegistered) return;

    this._getFocusableElements()
      .reverse()
      .forEach(el => addAccessibleChild(el, true));

    this._focusablesRegistered = true;
  }

  render() {
    const {
      player,
      isOpen,
      onClose,
      items,
      textTracks,
      changeLanguage,
      kitchenSinkDetached
    } = this.props;

    const { playerWidth } = this.props;
    const isCompact = playerWidth && playerWidth <= PLAYER_BREAK_POINTS.SMALL;


    if (!isOpen || !player) return null;
    const overlayRoot = getOverlayPortalElement(player);
    if (!overlayRoot) return null;

    const downloadItem = items.find(i => i.testId === 'download-menu-item');
    const printItem = items.find(i => i.testId === 'print-menu-item');
    const popoutTranscriptItem = items.find(i => i.testId === 'transcript-detach-attach-button');

    return createPortal(
      <Overlay open onClose={onClose} ariaLabel={this.props.moreOptionsLabel} handleKeyDown={this.props.handleKeyDown} addAccessibleChild={this.props.addAccessibleChild}>
        <div data-testid="popover-overlay" ref={this._containerRef}   className={`${styles.popoverOverlayContainer} ${isCompact ? styles.compact : ''}`}>
          <h3 className={styles.overlayTitle}>{this.props.moreOptionsLabel}</h3>
          {textTracks && textTracks.length > 1 && (
            <div className={styles.languageSelector}>
              <Icon name="transcript" size={IconSize.medium} />
              <label htmlFor="transcript-language">Transcript</label>
              <select
                id="transcript-language"
                aria-labelledby="transcript-language"
                value={textTracks.findIndex(track => track.active)}
                onChange={(e) => {
                  const selectedIdx = Number((e.target as HTMLSelectElement).value);
                  const selectedTrack = textTracks[selectedIdx];
                  changeLanguage(selectedTrack);
                }}
                onFocus={(e) => e.currentTarget.classList.add(styles.open)}
                onBlur={(e) => e.currentTarget.classList.remove(styles.open)}
              >
                {textTracks.map((track, idx) => (
                  <option key={idx} value={idx}>
                    {track.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.actionButtons}>
            {popoutTranscriptItem && (
              <button
                data-testid="transcript-detach-attach-button"
                disabled={popoutTranscriptItem.isDisabled}
                onClick={() => popoutTranscriptItem.onClick?.()}
              >
                <Icon name="detach" size={IconSize.medium} />
                <span>{popoutTranscriptItem.label}</span>
              </button>
            )}
            {downloadItem && (
              <button
                data-testid={downloadItem.testId}
                disabled={downloadItem.isDisabled}
                onClick={() => downloadItem.onClick?.()}
              >
                <Icon name="download" size={IconSize.medium} />
                <span>{downloadItem.label}</span>
              </button>
            )}
            {printItem && (
              <button
                data-testid={printItem.testId}
                disabled={printItem.isDisabled}
                onClick={() => printItem.onClick?.()}
              >
                <Icon name="print" size={IconSize.medium} />
                <span>{printItem.label}</span>
              </button>
            )}
          </div>
        </div>
      </Overlay>,
      overlayRoot
    );
  }
}
