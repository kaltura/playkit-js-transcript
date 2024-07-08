import {Component, h} from 'preact';
import {PopoverMenu} from '../popover-menu';
import {PopoverMenuItemData} from '../popover-menu';

import {Button, ButtonType} from '@playkit-js/common/dist/components/button';
const {withText, Text} = KalturaPlayer.ui.preacti18n;

interface TranscriptMenuProps {
  printTranscript?: string;
  downloadTranscript?: string;
  moreOptionsLabel?: string;
  onDownload: () => void;
  onPrint: () => void;
  downloadDisabled?: boolean;
  printDisabled?: boolean;
  isLoading?: boolean;
  detachMenuItem?: {
    testId: string;
    label: string;
    onClick: () => void;
    isDisabled: boolean;
  } | null;
}

interface TranscriptMenuState {
  items: Array<PopoverMenuItemData>;
}

const translates = {
  printTranscript: <Text id="transcript.print_transcript">Print current transcript</Text>,
  downloadTranscript: <Text id="transcript.download_transcript">Download current transcript</Text>,
  moreOptionsLabel: <Text id="transcript.more_options">More transcript options</Text>
};

@withText(translates)
class TranscriptMenu extends Component<TranscriptMenuProps, TranscriptMenuState> {
  render() {
    const {downloadDisabled, onDownload, printDisabled, onPrint, printTranscript, downloadTranscript, isLoading, detachMenuItem} = this.props;
    const items = [];

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

    return items.length ? (
      <PopoverMenu items={items} kitchenSinkDetached={kitchenSinkDetached}>
        <Button type={ButtonType.borderless} icon={'more'} tabIndex={-1} ariaLabel={this.props.moreOptionsLabel} />
      </PopoverMenu>
    ) : null;
  }
}

export {TranscriptMenu};
