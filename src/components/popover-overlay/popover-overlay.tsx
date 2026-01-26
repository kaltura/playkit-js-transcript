import { h, Component, createRef } from 'preact';
import { createPortal } from 'preact/compat';
import { ui } from '@playkit-js/kaltura-player-js';
import {Icon, IconSize} from '@playkit-js/common/dist/icon';
import { PopoverMenuItemData } from '../popover-menu/popover-menu-item';
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
  languageSelectorLabel: <Text id="transcript.transcript">Transcript</Text>
};

interface PopoverOverlayProps {
  player: any;
  isOpen: boolean;
  onClose: () => void;
  items: Array<PopoverMenuItemData>;
  textTracks: Array<any>;
  changeLanguage: (track: any) => void;
  playerSize?: number;
  moreOptionsLabel?: preact.VNode;
  handleKeyDown?: (e: KeyboardEvent) => void;
  addAccessibleChild?: (element: HTMLElement, pushToBeginning?: boolean) => void;
  setIsModal?: (isModal: boolean) => void;
}


const COMPACT_SIZES = [
  PLAYER_BREAK_POINTS.TINY,
  PLAYER_BREAK_POINTS.EXTRA_SMALL,
  PLAYER_BREAK_POINTS.SMALL
];

const iconsMap: Record<string, string> = {
  'transcript-detach-attach-button': 'detach',
  'download-menu-item': 'download',
  'print-menu-item': 'print'
};

interface TranscriptLanguageSelectorProps {
  textTracks: Array<any>;
  changeLanguage: (track: any) => void;
}

const TranscriptLanguageSelector = ({ textTracks, changeLanguage }: TranscriptLanguageSelectorProps) => {
  // Filter out metadata tracks
  const selectableTracks = (textTracks || []).filter(track => track.kind !== 'metadata');
  
  if (selectableTracks.length <= 1) return null;

  return (
    <div className={styles.languageSelector}>
      <Icon name="transcript" size={IconSize.medium} />
      <label htmlFor="transcript-language">{translates.languageSelectorLabel}</label>
      <select
        id="transcript-language"
        aria-labelledby="transcript-language"
        value={selectableTracks.findIndex(track => track.active)}
        onChange={(e) => {
          const selectedIdx = Number((e.target as HTMLSelectElement).value);
          changeLanguage(selectableTracks[selectedIdx]);
        }}
        onFocus={(e) => e.currentTarget.classList.add(styles.open)}
        onBlur={(e) => e.currentTarget.classList.remove(styles.open)}
      >
        {selectableTracks.map((track, idx) => (
          <option key={idx} value={idx}>
            {track.label}
          </option>
        ))}
      </select>
    </div>
  );
};

interface OverlayActionItemProps {
  item: PopoverMenuItemData;
}

const OverlayActionItem = ({ item }: OverlayActionItemProps) => {
  const iconName = iconsMap[item.testId];
  if (!iconName || item.items) return null;

  return (
    <button
      data-testid={item.testId}
      disabled={item.isDisabled}
      onClick={() => item.onClick?.()}
    >
      <Icon name={iconName} size={IconSize.medium} />
      <span>{item.label}</span>
    </button>
  );
};


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
      playerSize
    } = this.props;

    if (!isOpen || !player) return null;
    const overlayRoot = getOverlayPortalElement(player);
    if (!overlayRoot) return null;

    const isCompact = playerSize !== undefined ? COMPACT_SIZES.includes(playerSize) : false;

    return createPortal(
      <Overlay open onClose={onClose} ariaLabel={this.props.moreOptionsLabel} handleKeyDown={this.props.handleKeyDown} addAccessibleChild={this.props.addAccessibleChild}>
        <div data-testid="popover-overlay" ref={this._containerRef}   className={`${styles.popoverOverlayContainer} ${isCompact ? styles.compact : ''}`}>
          <h3 className={styles.overlayTitle}>{this.props.moreOptionsLabel}</h3>
          <TranscriptLanguageSelector textTracks={textTracks} changeLanguage={changeLanguage} />

          <div className={styles.actionButtons}>
            {items.map(item => (
              <OverlayActionItem key={item.testId} item={item} /> 
            ))}
          </div>
        </div>
      </Overlay>,
      overlayRoot
    );
  }
}
