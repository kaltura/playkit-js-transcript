import {h} from 'preact';
import * as styles from './plugin-button.scss';
import {ui} from '@playkit-js/kaltura-player-js';
import {icons} from '../icons';

const {Tooltip, Icon} = KalturaPlayer.ui.components;

interface PluginButtonProps {
  isActive: boolean;
  id: string;
  icon: string;
  label?: string;
  dataTestId?: string;
}

export const PluginButton = ({isActive, label, id, icon, dataTestId}: PluginButtonProps) => {
  return (
    <Tooltip label={label} type="bottom-left" strictPosition={true}>
        <button
          tabIndex={0}
          type="button"
          aria-label={label}
          className={[ui.style.upperBarIcon, styles.pluginButton, isActive ? styles.active : ''].join(' ')}
          data-testid={dataTestId}>
          <Icon id={id} height={icons.BigSize} width={icons.BigSize} viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`} path={icon} hidden="true"/>
        </button>
    </Tooltip>
  );
};

PluginButton.defaultProps = {
  dataTestId: 'transcript_pluginButton'
};
