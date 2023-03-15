import {Component, h} from 'preact';
import {MenuButton} from '../menu-button';
import {PopoverMenu} from '../popover-menu';
import {PopoverMenuItemData} from '../popover-menu';

interface TranscriptMenuProps {
  printDownloadAreaLabel?: string;
  printTranscript?: string;
  downloadTranscript?: string;
  onDownload: () => void;
  onPrint: () => void;
  downloadDisabled?: boolean;
  printDisabled?: boolean;
}

interface TranscriptMenuState {
  isOpen: boolean;
  items: Array<PopoverMenuItemData>;
}

class TranscriptMenu extends Component<TranscriptMenuProps, TranscriptMenuState> {
  constructor(props: TranscriptMenuProps) {
    super();

    const {downloadDisabled, onDownload, printDisabled, onPrint, printDownloadAreaLabel, printTranscript, downloadTranscript} = props;
    const items = [];
    if (!downloadDisabled) {
      items.push({
        testId: 'download-menu-item',
        label: 'Download transcript',
        onClick: onDownload
      });
    }

    if (!printDisabled) {
      items.push({
        testId: 'print-menu-item',
        label: 'Print transcript',
        onClick: onPrint
      });
    }

    this.state = {isOpen: false, items};
  }

  render() {
    return this.state.items.length ? (
      <PopoverMenu items={this.state.items}>
        <div>
          <MenuButton />
        </div>
      </PopoverMenu>
    ) : null;
  }
}

export {TranscriptMenu};
