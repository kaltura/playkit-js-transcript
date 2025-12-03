import {pluginName, TranscriptPlugin} from './transcript-plugin';
import {registerPlugin} from '@playkit-js/kaltura-player-js';

declare var __VERSION__: string;
declare var __NAME__: string;

const VERSION = __VERSION__;
const NAME = __NAME__;

export {TranscriptEvents} from './events/events';
export {TranscriptPlugin as Plugin};
export {VERSION, NAME};

registerPlugin(pluginName, TranscriptPlugin as any);
