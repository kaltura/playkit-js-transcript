import {h, Component} from 'preact';
import {OnClick} from '@playkit-js/common/dist/hoc/a11y-wrapper';
import {Button, ButtonType} from '@playkit-js/common/dist/components/button';
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
  player?: any;
  onClose: OnClick;
}

const translates = {
  smallScreenText: <Text id="transcript.small_screen">To see the transcript, go to full screen</Text>,
  smallScreenMobileText: <Text id="transcript.small_screen_mobile">To see the transcript, rotate the phone</Text>
};

// TODO: move AutoScrollIcon to common repo
// TODO: add translates
// TODO: add export and type to player repo

@withText(translates)
@withPlayer
// @ts-ignore
@connect(mapStateToProps)
export class SmallScreenSlate extends Component<SmallScreenSlateProps> {
  render() {
    const {isMobile, smallScreenMobileText, smallScreenText, onClose, toggledWithEnter, player} = this.props;
    return (
      <div className={styles.smallScreenWrapper}>
        <Button icon={'close'} onClick={onClose} type={ButtonType.borderless} focusOnMount={toggledWithEnter} className={styles.closeButton} />
        <div className={styles.contentWrapper}>
          {isMobile ? (
            <Icon name={'switch'} size={IconSize.large} />
          ) : (
            <Button icon={'expand'} onClick={() => player?.enterFullscreen()} type={ButtonType.borderless} />
          )}
          {isMobile ? smallScreenMobileText : smallScreenText}
        </div>
      </div>
    );
  }
}
