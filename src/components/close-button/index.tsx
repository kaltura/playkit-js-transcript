import {h} from 'preact';
import * as styles from './close-button.scss';
import {A11yWrapper} from '@playkit-js/common';
import {icons} from '../icons';
const {Icon} = KalturaPlayer.ui.components;
const {withText, Text} = KalturaPlayer.ui.preacti18n;

const translates = {
  closeLabel: <Text id="transcript.hide_plugin">Hide Transcript</Text>
};

interface CloseButtonProps {
  onClick: () => void;
  closeLabel?: string;
}

export const CloseButton = withText(translates)((props: CloseButtonProps) => (
  <A11yWrapper onClick={props.onClick}>
    <button className={styles.closeBtn} tabIndex={0} aria-label={props.closeLabel}>
      <Icon
        id="transcript-plugin-close-button"
        height={icons.BigSize}
        width={icons.BigSize}
        viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`}
        path={icons.CLOSE_ICON}
      />
    </button>
  </A11yWrapper>
));
