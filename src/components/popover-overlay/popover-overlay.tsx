import { h, Component, createRef } from 'preact';
import { createPortal } from 'preact/compat';
import { ui } from '@playkit-js/kaltura-player-js';
import {Icon, IconSize} from '@playkit-js/common/dist/icon';
import { icons } from '../icons';
import * as styles from '../popover-overlay/popover-overlay.scss';

const { Overlay } = KalturaPlayer.ui.components;
const { getOverlayPortalElement } = ui;
const { withText, Text } = ui.preacti18n;
const {PLAYER_BREAK_POINTS} = ui.Components;

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
}

@withText(translates)
export class PopoverOverlay extends Component<PopoverOverlayProps> {
  private _containerRef = createRef<HTMLDivElement>();

  private _focusFirstItem() {
    const container = this._containerRef.current;
    if (!container) return;
    const focusable = container.querySelector<HTMLElement>(
      'select, button, [href], input, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }

  componentDidMount() {
    if (this.props.isOpen) this._focusFirstItem();
  }

  componentDidUpdate(prevProps: PopoverOverlayProps) {
    if (!prevProps.isOpen && this.props.isOpen) this._focusFirstItem();
  }

  render() {
    const {
      player,
      isOpen,
      onClose,
      items,
      textTracks,
      changeLanguage,
    } = this.props;

    const { playerWidth } = this.props;
    const isCompact = playerWidth && playerWidth <= PLAYER_BREAK_POINTS.SMALL;


    if (!isOpen || !player) return null;
    const overlayRoot = getOverlayPortalElement(player);
    if (!overlayRoot) return null;

    const downloadItem = items.find(i => i.testId === 'download-menu-item');
    const printItem = items.find(i => i.testId === 'print-menu-item');

    return createPortal(
      <Overlay open onClose={onClose} ariaLabel={this.props.moreOptionsLabel}>
        <div ref={this._containerRef}   className={`${styles.popoverOverlayContainer} ${isCompact ? styles.compact : ''}`}>
          <h3 className={styles.overlayTitle}>{this.props.moreOptionsLabel}</h3>
          {textTracks && textTracks.length > 1 && (
            <div className={styles.languageSelector}>
              <svg
                viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`}
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d={icons.PLUGIN_ICON} />
              </svg>
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
