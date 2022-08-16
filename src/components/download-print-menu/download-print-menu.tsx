import {h, Component, ComponentChild, VNode} from 'preact';
import {Popover, PopoverHorizontalPositions, PopoverVerticalPositions} from '../../utils';
import {PopoverMenu, PopoverMenuItem} from '../popover-menu';
import * as styles from './download-print-menu.scss';
import {DownloadIcon, PrintIcon} from './download-print-icons';

const {ENTER, Esc} = KalturaPlayer.ui.utils.KeyMap;

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
  dropdownAriaLabel: string;
  printButtonAriaLabel: string;
  downloadButtonAriaLabel: string;
  onDownload: () => void;
  onPrint: () => void;
  downloadDisabled: boolean;
  printDisabled: boolean;
}

interface ButtonProperties {
  ['aria-label']: string;
  buttonStyles: string;
  onClick?: () => void;
  tabIndex?: number;
  iconStyles: string;
  icon: VNode;
}

interface DownloadPrintMenuState {
  popoverOpen: boolean;
}

export class DownloadPrintMenu extends Component<DownloadPrintMenuProps, DownloadPrintMenuState> {
  state: DownloadPrintMenuState = {
    popoverOpen: false
  };

  private _onDownloadClicked = () => {
    this.props.onDownload();
  };

  private _onPrintClicked = () => {
    this.props.onPrint();
  };
  private _onKeyDown = (e: KeyboardEvent, callBack: Function) => {
    if (e.keyCode !== ENTER && e.keyCode !== Esc) {
      // don't stopPropagation on ESC and Enter pressed as it prevent the popup closing
      e.stopPropagation();
    }
    switch (e.keyCode) {
      case 13: // Enter pressed
        callBack();
        break;
    }
  };
  private _popoverMenuItemRenderer = (el: PopoverMenuItem) => (
    <div
      tabIndex={1}
      role="button"
      onClick={() => el.onMenuChosen()}
      onKeyDown={(e: KeyboardEvent) => this._onKeyDown(e, el.onMenuChosen)}
      className={styles.popoverMenuItem}>
      {el.label}
    </div>
  );

  private _getPopoverMenuOptions = () => {
    return [
      {
        label: this.props.downloadButtonAriaLabel,
        onMenuChosen: this._onDownloadClicked
      },
      {
        label: this.props.printButtonAriaLabel,
        onMenuChosen: this._onPrintClicked
      }
    ];
  };

  private _renderIcon = ({buttonStyles, tabIndex = 0, iconStyles, icon, ...props}: ButtonProperties): ComponentChild => {
    return (
      <button className={buttonStyles} tabIndex={tabIndex} {...props}>
        <div className={iconStyles}>{icon}</div>
      </button>
    );
  };

  private _popoverContent = () => {
    return <PopoverMenu itemRenderer={this._popoverMenuItemRenderer} options={this._getPopoverMenuOptions()} />;
  };

  render(props: DownloadPrintMenuProps) {
    const {downloadDisabled, printDisabled} = props;
    if (!downloadDisabled && !printDisabled) {
      return (
        <Popover
          className="download-print-popover"
          verticalPosition={PopoverVerticalPositions.Bottom}
          horizontalPosition={PopoverHorizontalPositions.Left}
          content={this._popoverContent()}>
          {this._renderIcon({
            ['aria-label']: props.dropdownAriaLabel,
            buttonStyles: styles.downloadPrintButton,
            iconStyles: styles.icon,
            icon: <DownloadIcon />
          })}
        </Popover>
      );
    }
    if (!downloadDisabled && printDisabled) {
      return this._renderIcon({
        ['aria-label']: props.downloadButtonAriaLabel,
        buttonStyles: styles.downloadPrintButton,
        iconStyles: styles.icon,
        onClick: this._onDownloadClicked,
        icon: <DownloadIcon />
      });
    }
    if (downloadDisabled && !printDisabled) {
      return this._renderIcon({
        ['aria-label']: props.printButtonAriaLabel,
        buttonStyles: styles.downloadPrintButton,
        iconStyles: styles.icon,
        onClick: this._onPrintClicked,
        icon: <PrintIcon />
      });
    }
    return null;
  }
}
