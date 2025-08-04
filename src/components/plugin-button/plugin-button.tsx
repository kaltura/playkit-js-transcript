import { h } from 'preact';
import * as styles from './plugin-button.scss';
import {ui} from '@playkit-js/kaltura-player-js';
import {icons} from '../icons';
import {A11yWrapper, OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import { useEffect, useRef } from 'preact/hooks';
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
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setRef?.(buttonRef.current ?? null);
    return () => {
      setRef?.(null);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      tabIndex={0}
      type="button"
      aria-label={label}
      className={[ui.style.upperBarIcon, styles.pluginButton, isActive ? styles.active : ''].join(' ')}
      data-testid={dataTestId}>
      <Tooltip label={label} type="bottom-left">
        <Icon
          id={id}
          height={icons.BigSize}
          width={icons.BigSize}
          viewBox={`0 0 ${icons.BigSize} ${icons.BigSize}`}
          path={icon}
          hidden="true"
        />
      </Tooltip>
    </button>
  );
};

PluginButton.defaultProps = {
  dataTestId: 'transcript_pluginButton'
};
