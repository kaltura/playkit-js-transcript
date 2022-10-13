import {h, Component, VNode} from 'preact';
import {A11yWrapper} from '@playkit-js/common';
import {Popover, PopoverMenuItem} from '../popover';
import * as styles from './download-print-menu.scss';
import {DownloadIcon, PrintIcon} from './download-print-icons';

const {Tooltip} = KalturaPlayer.ui.components;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

export function downloadContent(content: string, name: string): void {
  const blob = new Blob([content], {type: 'text/plain;charset=utf-8;'});
  const anchor = document.createElement('a');
  const {navigator} = window as any;

  if (navigator.msSaveBlob) {
    // IE
    navigator.msSaveOrOpenBlob(blob, name);
    return;
  }
  if (navigator.userAgent.search('Firefox') !== -1) {
    // Firefox
    anchor.style.display = 'none';
    anchor.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  } else {
    // Chrome
    anchor.setAttribute('href', URL.createObjectURL(blob));
  }
  anchor.setAttribute('target', '_blank');
  anchor.setAttribute('download', name);
  anchor.click();
  anchor.remove();
}
export function printContent(content: string): void {
  const printWindow = window.open('', '', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
}

interface DownloadPrintMenuProps {
  printDownloadAreaLabel?: string;
  printTranscript?: string;
  downloadTranscript?: string;
  onDownload: () => void;
  onPrint: () => void;
  downloadDisabled: boolean;
  printDisabled: boolean;
}

interface ButtonProperties {
  ['aria-label']?: string;
  tabIndex?: number;
  icon: VNode;
}

const translates = () => ({
  printDownloadAreaLabel: <Text id="transcript.print_download_area_label">Download or print current transcript</Text>,
  printTranscript: <Text id="transcript.print_transcript">Print current transcript</Text>,
  downloadTranscript: <Text id="transcript.download_transcript">Download current transcript</Text>
});

export class DownloadPrintMenuComponent extends Component<DownloadPrintMenuProps> {
  private _getPopoverMenuOptions = (): Array<PopoverMenuItem> => {
    return [
      {
        label: this.props.downloadTranscript,
        onMenuChosen: this.props.onDownload
      },
      {
        label: this.props.printTranscript,
        onMenuChosen: this.props.onPrint
      }
    ];
  };

  private _renderIcon = ({tabIndex = 0, icon, ...props}: ButtonProperties): VNode => {
    return (
      <button className={styles.downloadPrintButton} tabIndex={tabIndex} {...props}>
        <div className={styles.icon}>{icon}</div>
      </button>
    );
  };

  render(props: DownloadPrintMenuProps) {
    const {downloadDisabled, printDisabled, printDownloadAreaLabel, printTranscript, downloadTranscript} = props;
    if (!downloadDisabled && !printDisabled) {
      return (
        <Popover label={printDownloadAreaLabel!} options={this._getPopoverMenuOptions()}>
          {this._renderIcon({
            ['aria-label']: printDownloadAreaLabel,
            icon: <DownloadIcon />
          })}
        </Popover>
      );
    }
    if (!downloadDisabled && printDisabled) {
      return (
        <Tooltip label={downloadTranscript} type="bottom">
          <A11yWrapper onClick={this.props.onDownload}>
            {this._renderIcon({
              ['aria-label']: downloadTranscript,
              icon: <DownloadIcon />
            })}
          </A11yWrapper>
        </Tooltip>
      );
    }
    if (downloadDisabled && !printDisabled) {
      return (
        <Tooltip label={printTranscript} type="bottom">
          <A11yWrapper onClick={this.props.onPrint}>
            {this._renderIcon({
              ['aria-label']: printTranscript,
              icon: <PrintIcon />
            })}
          </A11yWrapper>
        </Tooltip>
      );
    }
    return null;
  }
}

export const DownloadPrintMenu = withText(translates)(DownloadPrintMenuComponent);
