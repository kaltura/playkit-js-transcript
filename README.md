# PlayKit JS Transcript - plugin for the [PlayKit JS Player]

PlayKit JS Transcript is written in [ECMAScript6], statically analysed using [Typescript] and transpiled in ECMAScript5 using [Babel].

[typescript]: https://www.typescriptlang.org/
[ecmascript6]: https://github.com/ericdouglas/ES6-Learning#articles--tutorials
[babel]: https://babeljs.io

## Getting Started

### Prerequisites

The plugin requires [Kaltura Player] to be loaded first.

[kaltura player]: https://github.com/kaltura/kaltura-player-js

### Installing

First, clone and run [yarn] to install dependencies:

[yarn]: https://yarnpkg.com/lang/en/

```
git clone https://github.com/kaltura/playkit-js-transcript.git
cd playkit-js-transcript
yarn install
```

### Building

Then, build the player

```javascript
yarn run build
```

### Embed the library in your test page

Finally, add the bundle as a script tag in your page, and initialize the player

```html
<script type="text/javascript" src="/PATH/TO/FILE/kaltura-player.js"></script>
<!--Kaltura player-->
<script type="text/javascript" src="/PATH/TO/FILE/playkit-kaltura-cuepoints.js"></script>
<!--PlayKit cuepoints plugin-->
<script type="text/javascript" src="/PATH/TO/FILE/playkit-ui-managers.js"></script>
<!--PlayKit ui-managers plugin-->
<script type="text/javascript" src="/PATH/TO/FILE/playkit-transcript.js"></script>
<!--PlayKit transcript plugin-->
<div id="player-placeholder" style="height:360px; width:640px">
  <script type="text/javascript">
    var playerContainer = document.querySelector("#player-placeholder");
    var config = {
     ...
     targetId: 'player-placeholder',
     plugins: {
      transcript: { ... },
      uiManagers: { ... },
      kalturaCuepoints: { ... },
     }
     ...
    };
    var player = KalturaPlayer.setup(config);
    player.loadMedia(...);
  </script>
</div>
```

## Documentation

Transcript plugin configuration can been found here:

- **[Configuration](#configuration)**

Transcript plugin dependencies can been found here:

- **[Dependencies](#dependencies)**

### And coding style tests

We use ESLint [recommended set](http://eslint.org/docs/rules/) with some additions for enforcing [Flow] types and other rules.

See [ESLint config](.eslintrc.json) for full configuration.

We also use [.editorconfig](.editorconfig) to maintain consistent coding styles and settings, please make sure you comply with the styling.

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/kaltura/playkit-js-transcript/tags).

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE.md](LICENSE.md) file for details

## Commands

Run dev server: `yarn dev`;<br/>
Bump version: `yarn release`;<br/>

<a name="configuration"></a>
## Configuration

#### Configuration Structure

```js
//Default configuration
"transcript" = {};
//Plugin params
"transcript" = {
  expandMode?: string, // optional
  expandOnFirstPlay?: boolean, // optional
  showTime?: boolean, // optional
  position?: string, // optional
  scrollOffset?: number // optional
  searchDebounceTimeout?: number // optional
  searchNextPrevDebounceTimeout?: number // optional
  downloadDisabled?: boolean // optional
  printDisabled?: boolean // optional
}
```
##

> ### config.expandMode
>
> ##### Type: `string`
>
> ##### Default: `alongside`;(‘alongside', ‘hidden’, 'over’)
>

##

> ### config.expandOnFirstPlay
>
> ##### Type: `boolean`
>
> ##### Default: `true`
>

##

> ### config.showTime
>
> ##### Type: `boolean`
>
> ##### Default: `true`
>

##

> ### config.position
>
> ##### Type: `string`
>
> ##### Default: `bottom`;(‘left’, ‘right', ‘top’, 'bottom’)
>

##

> ### config.scrollOffset
>
> ##### Type: `number`
>
> ##### Default: `0`
>

##

> ### config.searchDebounceTimeout
>
> ##### Type: `number`
>
> ##### Default: `250`
>

##

> ### config.searchNextPrevDebounceTimeout
>
> ##### Type: `number`
>
> ##### Default: `100`
>

##

> ### config.downloadDisabled
>
> ##### Type: `boolean`
>
> ##### Default: `false`
>

##

> ### config.printDisabled
>
> ##### Type: `boolean`
>
> ##### Default: `false`
>

<a name="dependencies"></a>
## Dependencies

Plugin dependencies:<br/>
<a href="https://github.com/kaltura/playkit-js-kaltura-cuepoints">Cue Points</a><br/>
<a href="https://github.com/kaltura/playkit-js-ui-managers">UI Managers</a>

### Dev env

Node version: up to 14+<br/>
If nvm installed: `nvm use` change version of current terminal to required.<br/>

### ARM Architecture support

Install dependencies with `npm install --target_arch=x64` set target arch for running it through Rosetta (requires Rosetta installation).<br/>
