import {TranscriptPlugin} from './transcript-plugin';

declare var __VERSION__: string;
declare var __NAME__: string;

const VERSION = __VERSION__;
const NAME = __NAME__;

export {TranscriptPlugin as Plugin};
export {VERSION, NAME};

const pluginName: string = 'playkit-js-transcript';

KalturaPlayer.core.registerPlugin(pluginName, TranscriptPlugin);
