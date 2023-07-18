import {h} from 'preact';
import * as styles from './autoscroll-button.scss';
import {A11yWrapper, OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {AutoScrollIcon} from "./AutoScrollIcon";

const {withText, Text} = KalturaPlayer.ui.preacti18n;
const {Tooltip} = KalturaPlayer.ui.components;

interface AutoscrollButtonProps {
  onClick: OnClick;
  isAutoScrollEnabled: boolean;
  setAutoscrollButtonRef: (node: HTMLButtonElement | null) => void;
  autoScrollLabel?: string;
}

const translates = {
  autoScrollLabel: <Text id="transcript.auto_scroll">Resume AutoScroll</Text>
};

export const AutoscrollButton = withText(translates)(
  ({onClick, isAutoScrollEnabled, setAutoscrollButtonRef, autoScrollLabel}: AutoscrollButtonProps) => {
    return (
      <div className={styles.autoscrollRoot} tabIndex={isAutoScrollEnabled ? -1 : 1} aria-label={autoScrollLabel}>
        <Tooltip label={autoScrollLabel} type="left">
          <A11yWrapper onClick={onClick}>
            <button
              className={`${styles.autoscrollButton} ${isAutoScrollEnabled ? '' : styles.autoscrollButtonVisible}`}
              ref={setAutoscrollButtonRef}>
              <AutoScrollIcon/>
            </button>
          </A11yWrapper>
        </Tooltip>
      </div>
    );
  }
);
