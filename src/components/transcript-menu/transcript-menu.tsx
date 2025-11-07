import {Component, h, Fragment, createRef} from 'preact';
import {core, ui} from '@playkit-js/kaltura-player-js';
import {PopoverMenu} from '../popover-menu';
import {PopoverMenuItemData} from '../popover-menu';
import { PopoverOverlay } from '../popover-overlay';
import {capitalizeFirstLetter} from '../../utils';

import {Button, ButtonType} from '@playkit-js/common/dist/components/button';
const {withText, Text} = KalturaPlayer.ui.preacti18n;
const {SidePanelPositions, getOverlayPortalElement} = ui;

interface TranscriptMenuProps {
  shouldUseCalculatedHeight: boolean;
  popOverHeight: number;
  printTranscript?: string;
  downloadTranscript?: string;
  moreOptionsLabel?: string;
  onDownload: () => void;
  onPrint: () => void;
  downloadDisabled?: boolean;
  printDisabled?: boolean;
  isLoading?: boolean;
  kitchenSinkDetached: boolean;
  textTracks: Array<core.TextTrack>;
  changeLanguage: (textTrack: core.TextTrack) => void;
  detachMenuItem?: {
    testId: string;
    label: string;
    onClick: () => void;
    isDisabled: boolean;
  } | null;
  sidePanelPosition: string;
  isMobile?: boolean;
  smallScreen?: boolean;
  player: any;
  onOverlayOpen?: () => void;
  onOverlayClose?: () => void;
  playerWidth?: number;
}

interface TranscriptMenuState {
  isOverlayOpen: boolean;
  items: Array<PopoverMenuItemData>;
}

const translates = {
  printTranscript: <Text id="transcript.print_transcript">Print current transcript</Text>,
  downloadTranscript: <Text id="transcript.download_transcript">Download current transcript</Text>,
  moreOptionsLabel: <Text id="transcript.more_options">More transcript options</Text>
};

@withText(translates)
class TranscriptMenu extends Component<TranscriptMenuProps, TranscriptMenuState> {
  private _triggerButtonRef = createRef<HTMLButtonElement>();

  state: TranscriptMenuState = {
    isOverlayOpen: false,
    items: []
  };

  private _focusTriggerButton = () => {
    const ref = this._triggerButtonRef.current as any;
    const innerBtn = ref?.base || ref?.buttonRef?.current;
    if (innerBtn && typeof innerBtn.focus === 'function') {
      innerBtn.focus();
    }
  };

  render() {
    const {
      shouldUseCalculatedHeight,
      popOverHeight,
      downloadDisabled,
      onDownload,
      printDisabled,
      onPrint,
      printTranscript,
      downloadTranscript,
      isLoading,
      detachMenuItem,
      kitchenSinkDetached,
      textTracks,
      changeLanguage,
      sidePanelPosition,
      smallScreen
    } = this.props;
    const items = [];
    const { isOverlayOpen } = this.state;

    if (textTracks?.length > 1) {
      const activeTextTrack = textTracks.find(track => track.active);
      items.push({
        testId: 'language-change-menu-item-active',
        label: capitalizeFirstLetter(activeTextTrack?.label!),
        isDisabled: isLoading,
        items: textTracks.map(track => ({
          testId: `language-change-menu-item-${track.label}`,
          label: capitalizeFirstLetter(track.label!),
          isDisabled: isLoading,
          isSelected: track.active,
          onClick: () => changeLanguage(track)
        }))
      });
    }

    if (detachMenuItem) {
      items.push(detachMenuItem);
    }

    if (!downloadDisabled) {
      items.push({
        testId: 'download-menu-item',
        label: downloadTranscript!,
        onClick: onDownload,
        isDisabled: isLoading
      });
    }

    if (!printDisabled) {
      items.push({
        testId: 'print-menu-item',
        label: printTranscript!,
        onClick: onPrint,
        isDisabled: isLoading
      });
    }

    const shouldUseOverlay = !kitchenSinkDetached && (sidePanelPosition === SidePanelPositions.BOTTOM || smallScreen);

    if (shouldUseOverlay) {
      return (
        <Fragment>
          <Button
            ref={this._triggerButtonRef}
            type={ButtonType.borderless}
            icon="more"
            ariaLabel={this.props.moreOptionsLabel}
            onClick={() => {
              this.props.onOverlayOpen?.();
              this.setState({ isOverlayOpen: true });
            }}
          />

          <PopoverOverlay
            player={this.props.player}
            isOpen={isOverlayOpen}
            items={items}
            textTracks={this.props.textTracks}
            changeLanguage={this.props.changeLanguage}
            playerWidth={this.props.playerWidth}  // 👈 add this
            onClose={() => {
              this.setState({ isOverlayOpen: false }, () => {
                this.props.onOverlayClose?.();
                setTimeout(() => this._focusTriggerButton(), 50);
              });
            }}
          />
        </Fragment>
      );
    }

    return items.length ? (
      <PopoverMenu
        items={items}
        kitchenSinkDetached={kitchenSinkDetached}
        popOverMenuHeight={popOverHeight}
        shouldUseCalculatedHeight={shouldUseCalculatedHeight}>
        <Button type={ButtonType.borderless} icon={'more'} tabIndex={-1} ariaLabel={this.props.moreOptionsLabel} />
      </PopoverMenu>
    ) : null;
  }
}

export {TranscriptMenu};
