import {h} from 'preact';
import * as styles from './plugin-button.scss';
import {ui} from 'kaltura-player-js';
import {icons} from '../icons';
import {A11yWrapper, OnClick} from '@playkit-js/common';

const {Tooltip, Icon} = KalturaPlayer.ui.components;

interface PluginButtonProps {
  isActive: boolean;
  onClick: OnClick;
  id: string;
  icon: string;
  label?: string;
  dataTestId?: string;
}

export const PluginButton = ({isActive, onClick, label, id, icon, dataTestId}: PluginButtonProps) => {
  return (
    <Tooltip label={label} type="bottom">
      <A11yWrapper onClick={onClick}>
        <button
          aria-label={label}
          className={[ui.style.upperBarIcon, styles.pluginButton, isActive ? styles.active : ''].join(' ')}
          data-testid={dataTestId}>
          <Icon id={id} height={icons.BigSize} width={icons.BigSize} viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`} path={icon} />
        </button>
      </A11yWrapper>
    </Tooltip>
  );
};

PluginButton.defaultProps = {
  dataTestId: 'transcript_pluginButton'
};
