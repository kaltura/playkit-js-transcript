import {h} from 'preact';
import * as styles from './plugin-button.scss';
import {icons} from '../icons';
import {A11yWrapper, OnClick} from '@playkit-js/common';

const {Tooltip, Icon} = KalturaPlayer.ui.components;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

const translates = ({isActive}: PluginButtonProps) => {
  return {
    label: isActive ? <Text id="transcript.hide_plugin">Hide Transcript</Text> : <Text id="transcript.show_plugin">Show Transcript</Text>
  };
};

interface PluginButtonProps {
  isActive: boolean;
  onClick: OnClick;
  label?: string;
}

export const PluginButton = withText(translates)(({isActive, onClick, label}: PluginButtonProps) => {
  return (
    <Tooltip label={label} type="bottom">
      <A11yWrapper onClick={onClick}>
        <button aria-label={label} className={[styles.pluginButton, isActive ? styles.active : ''].join(' ')}>
          <Icon
            id="transcript-plugin-button"
            height={icons.BigSize}
            width={icons.BigSize}
            viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`}
            path={icons.PLUGIN_ICON}
          />
        </button>
      </A11yWrapper>
    </Tooltip>
  );
});
