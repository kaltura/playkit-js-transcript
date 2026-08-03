import {h} from 'preact';
import {ui} from '@playkit-js/kaltura-player-js';
import {Button, ButtonType, ButtonSize} from '@playkit-js/common/dist/components/button';
import {OnClickEvent} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import * as styles from './attach-placeholder.scss';

const {withText, Text} = ui.preacti18n;

const translates = {
  hideTranscriptPanel: <Text id="transcript.hide_transcript_panel">Hide transcript panel</Text>
};

interface AttachPlaceholderProps {
  onAttach: () => void;
  onClose: (e: OnClickEvent, byKeyboard: boolean) => void;
  hideTranscriptPanel?: string;
}

export const AttachPlaceholder = withText(translates)(({onAttach, onClose, hideTranscriptPanel}: AttachPlaceholderProps) => {
  return (
    <div className={styles.attachPlaceholderContainer} data-testid="transcriptAttachPlaceholder">
      <div className={styles.attachHeader}>
        <div className={styles.attachHeaderTitle}>
          <Text id="transcript.transcript">Transcript</Text>
        </div>
        <Button type={ButtonType.borderless} size={ButtonSize.medium} icon={'close'} onClick={onClose} ariaLabel={hideTranscriptPanel}/>
      </div>
      <div className={styles.attachContent}>
        <div className={styles.attachText}>
          <Text id="transcript.attach_transcript_text">Transcript popped out</Text>
        </div>
        <Button type={ButtonType.primary} size={ButtonSize.medium} className={styles.attachButton} onClick={onAttach} testId="transcriptAttachButton">
          <Text id="transcript.attach_transcript_button">Bring it back</Text>
        </Button>
      </div>
    </div>
  );
});
