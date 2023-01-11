import {h, Component} from 'preact';
import * as styles from './spinner.scss';

const DEFAULT_LINES = 20;

export class Spinner extends Component {
  render() {
    return (
      <div className={styles.transcriptLoader}>
        {Array.apply(null, Array(DEFAULT_LINES)).map((el, index) => (
          <svg key={index} width="100%" height="50" viewBox="0 0 100% 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="16" y="8" width="90%" height="12" rx="4" fill="white" />
            <rect x="16" y="30" width="60%" height="12" rx="4" fill="white" />
          </svg>
        ))}
      </div>
    );
  }
}
