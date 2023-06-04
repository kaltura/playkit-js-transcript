import {h} from 'preact';
import * as styles from './plugin-button.scss';
import {ui} from '@playkit-js/kaltura-player-js';
import {icons} from '../icons';
import {A11yWrapper, OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';

const {Tooltip, Icon} = KalturaPlayer.ui.components;

interface PluginButtonProps {
  isActive: boolean;
  setRef?: (ref: HTMLButtonElement | null) => void;
  id: string;
  icon: string;
  label?: string;
  dataTestId?: string;
}

export const PluginButton = ({isActive, label, id, icon, dataTestId, setRef}: PluginButtonProps) => {
  return (
    <Tooltip label={label} type="bottom">
        <button
          ref={node => {
            if (setRef) {
              setRef(node);
            }
          }}
          aria-label={label}
          className={[ui.style.upperBarIcon, styles.pluginButton, isActive ? styles.active : ''].join(' ')}
          data-testid={dataTestId}>
          <Icon id={id} height={icons.BigSize} width={icons.BigSize} viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`} path={icon} />
        </button>
    </Tooltip>
  );
};

PluginButton.defaultProps = {
  dataTestId: 'transcript_pluginButton'
};
