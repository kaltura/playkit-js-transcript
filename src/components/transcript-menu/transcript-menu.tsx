import {Component, h} from 'preact';
import {PopoverMenu} from '../popover-menu';
import {PopoverMenuItemData} from '../popover-menu';

import {Button, ButtonType} from '@playkit-js/common/dist/components/button';

interface TranscriptMenuProps {
  printDownloadAreaLabel?: string;
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

class TranscriptMenu extends Component<TranscriptMenuProps, TranscriptMenuState> {
  constructor(props: TranscriptMenuProps) {
    super();

    const {downloadDisabled, onDownload, printDisabled, onPrint, printDownloadAreaLabel, printTranscript, downloadTranscript, isLoading} = props;
    const items = [];
    if (!downloadDisabled) {
      items.push({
        testId: 'download-menu-item',
        label: 'Download transcript',
        onClick: onDownload,
        isDisabled: isLoading
      });
    }

    if (!printDisabled) {
      items.push({
        testId: 'print-menu-item',
        label: 'Print transcript',
        onClick: onPrint,
        isDisabled: isLoading
      });
    }

    this.state = {items};
  }

  render() {
    return this.state.items.length ? (
      <PopoverMenu label={'More'} items={this.state.items}>
        <Button type={ButtonType.borderless} icon={'more'}></Button>
      </PopoverMenu>
    ) : null;
  }
}

export {TranscriptMenu};
