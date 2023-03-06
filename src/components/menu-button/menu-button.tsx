import {h, Component} from 'preact';
const {withText} = KalturaPlayer.ui.preacti18n;
const {Icon, Tooltip} = KalturaPlayer.ui.components;
import {icons} from '../icons';

import * as styles from './menu-button.scss';
import {A11yWrapper} from '@playkit-js/common';

interface MenuButtonProps {
  onClick: () => void;
}

const MenuButton = ({onClick}: MenuButtonProps) => (
  <A11yWrapper onClick={onClick}>
    <div className={`${styles.menuButton}`}>
      <Icon id="transcript-menu" path={icons.MORE_ICON} viewBox={'0 0 24 24'}></Icon>
    </div>
  </A11yWrapper>
);

export {MenuButton};
