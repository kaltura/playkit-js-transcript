import {h, Component} from 'preact';
import {OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {Button, ButtonType, ButtonSize} from '@playkit-js/common/dist/components/button';
import {Icon, IconSize} from '@playkit-js/common/dist/icon';
import {ui} from '@playkit-js/kaltura-player-js';
// @ts-ignore
const {withPlayer} = ui.Components;
const {connect} = ui.redux;
const {withText, Text} = ui.preacti18n;
import * as styles from './small-screen-slate.scss';

const mapStateToProps = (state: any) => ({
  isMobile: state.shell.isMobile
});

interface SmallScreenSlateProps {
  isMobile?: boolean;
  toggledWithEnter?: boolean;
  smallScreenText?: string;
  smallScreenMobileText?: string;
  hideTranscript?: string;
  player?: any;
  onClose: OnClick;
}

const translates = {
  smallScreenText: <Text id="transcript.small_screen">To see the transcript, go to full screen</Text>,
  smallScreenMobileText: <Text id="transcript.small_screen_mobile">To see the transcript, rotate the phone</Text>,
  hideTranscript: <Text id="transcript.hide_plugin">Hide Transcript</Text>
};

@withText(translates)
@withPlayer
// @ts-ignore
@connect(mapStateToProps)
export class SmallScreenSlate extends Component<SmallScreenSlateProps> {
  render() {
    const {isMobile, smallScreenMobileText, smallScreenText, onClose, toggledWithEnter, player, hideTranscript} = this.props;
    return (
      <div className={styles.smallScreenWrapper}>
        <Button
          icon={'close'}
          onClick={onClose}
          type={ButtonType.borderless}
          focusOnMount={toggledWithEnter}
          className={styles.closeButton}
          ariaLabel={hideTranscript}
        />
        <div className={styles.contentWrapper}>
          {isMobile ? (
            <Icon name={'screenRotation'} size={IconSize.large} />
          ) : (
            <Button
              icon={'expand'}
              onClick={() => player?.enterFullscreen()}
              type={ButtonType.borderless}
              size={ButtonSize.medium}
              ariaLabel={smallScreenText}
            />
          )}
          <div className={styles.textContent}>{isMobile ? smallScreenMobileText : smallScreenText}</div>
        </div>
      </div>
    );
  }
}
