import {h} from 'preact';
import {ui} from '@playkit-js/kaltura-player-js';
import {Button, ButtonType, ButtonSize} from '@playkit-js/common/dist/components/button';
import * as styles from './attach-placeholder.scss';

const {Text} = ui.preacti18n;

interface AttachPlaceholderProps {
  onAttach: () => void;
}

export const AttachPlaceholder = ({onAttach}: AttachPlaceholderProps) => {
  return (
    <div className={styles.attachPlaceholderContainer} data-testid="transcriptAttachPlaceholder">
      <div className={styles.attachText}>
        <Text id="transcript.attachTranscriptText">Transcript popped out</Text>
      </div>
      <Button type={ButtonType.primary} size={ButtonSize.medium} className={styles.attachButton} onClick={onAttach} testId="transcriptAttachButton">
        <Text id="transcript.attachTranscriptButton">Bring it back</Text>
      </Button>
    </div>
  );
};
