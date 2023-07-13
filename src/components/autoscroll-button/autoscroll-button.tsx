import {h} from 'preact';
import * as styles from './autoscroll-button.scss';
import {OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {Button, ButtonType} from '@playkit-js/common/dist/components/button';

const {withText, Text} = KalturaPlayer.ui.preacti18n;

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
        <Button
          onClick={onClick}
          setRef={setAutoscrollButtonRef}
          className={`${styles.autoscrollButton} ${isAutoScrollEnabled ? '' : styles.autoscrollButtonVisible}`}
          type={ButtonType.primary}
          icon="autoScroll"
          tooltip={{label: autoScrollLabel!, type: 'left'}}
        />
      </div>
    );
  }
);
