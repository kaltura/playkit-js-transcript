import {h} from 'preact';
import * as styles from './close-button.scss';
import {A11yWrapper} from '../a11y-wrapper/a11y-wrapper';
import {icons} from '../icons';
const {Icon} = KalturaPlayer.ui.components;

interface CloseButtonProps {
  onClick: () => void;
}

export const CloseButton = (props: CloseButtonProps) => (
  <A11yWrapper onClick={props.onClick}>
    <button className={styles.closeBtn} tabIndex={0}>
      <Icon
        id="transcript-plugin-close-button"
        height={icons.BigSize}
        width={icons.BigSize}
        viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`}
        path={icons.CLOSE_ICON}
      />
    </button>
  </A11yWrapper>
);
