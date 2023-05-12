import {Component, h} from 'preact';
import {PopoverMenu} from '../popover-menu';
import {PopoverMenuItemData} from '../popover-menu';

import {Button, ButtonType} from '@playkit-js/common/dist/components/button';
const {withText, Text} = KalturaPlayer.ui.preacti18n;

interface TranscriptMenuProps {
  printTranscript?: string;
  downloadTranscript?: string;
  onDownload: () => void;
  onPrint: () => void;
  downloadDisabled?: boolean;
  printDisabled?: boolean;
  isLoading?: boolean;
}

interface TranscriptMenuState {
  items: Array<PopoverMenuItemData>;
}

const translates = {
  printTranscript: <Text id="transcript.more_options">Print current transcript</Text>,
  downloadTranscript: <Text id="transcript.more_options">Download current transcript</Text>
};

@withText(translates)
class TranscriptMenu extends Component<TranscriptMenuProps, TranscriptMenuState> {
  constructor(props: TranscriptMenuProps) {
    super();

    const {downloadDisabled, onDownload, printDisabled, onPrint, printTranscript, downloadTranscript, isLoading} = props;
    const items = [];
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

    this.state = {items};
  }

  render() {
    return this.state.items.length ? (
      <PopoverMenu items={this.state.items}>
        <Button type={ButtonType.borderless} icon={'more'} tabIndex={-1} />
      </PopoverMenu>
    ) : null;
  }
}

export {TranscriptMenu};
