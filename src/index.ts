import { pluginName, TranscriptPlugin } from "./transcript-plugin";

declare var __VERSION__: string;
declare var __NAME__: string;

const VERSION = __VERSION__;
const NAME = __NAME__;

export {TranscriptPlugin as Plugin};
export {VERSION, NAME};

KalturaPlayer.core.registerPlugin(pluginName, TranscriptPlugin);
