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
<script type="text/javascript" src="/PATH/TO/FILE/playkit-transcript.js"></script>
<!--PlayKit transcript plugin-->
<div id="player-placeholder" style="height:360px; width:640px">
  <script type="text/javascript">
    var playerContainer = document.querySelector("#player-placeholder");
    var config = {
     ...
     targetId: 'player-placeholder',
     plugins: {
       transcript: { ... }
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

- **[Configuration](docs/configuration.md)**

## Running the tests

Tests can be run locally via [Karma], which will run on Chrome, Firefox and Safari

[karma]: https://karma-runner.github.io/1.0/index.html

```
yarn run test
```

You can test individual browsers:

```
yarn run test:chrome
yarn run test:firefox
yarn run test:safari
```

### And coding style tests

We use ESLint [recommended set](http://eslint.org/docs/rules/) with some additions for enforcing [Flow] types and other rules.

See [ESLint config](.eslintrc.json) for full configuration.

We also use [.editorconfig](.editorconfig) to maintain consistent coding styles and settings, please make sure you comply with the styling.

## Compatibility

TBD

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/kaltura/playkit-js-transcript/tags).

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE.md](LICENSE.md) file for details

## Plugin configuration

### Plugin configuration can be defined as object of properties, ex: 
```
            'playkit-js-transcript': {
                position: 'right',
                printDisabled : true,
                expandMode:'over'
            }
```

### List of available configuration properties:
Parameter | Description | Type | Default 
--- | --- | :-----: | :-----:
expandMode | Set player area for TW | `"alongside" | "over"` | `"alongside"`
expandOnFirstPlay | Opens plugin on automatically | `boolean` | `true`
showTime | Show or hide caption time | `boolean` | `true`
position | Position of TW plugin | `"right" | "bottom"` | `"bottom"`
searchDebounceTimeout | Debounce on caption search | `number` | `250`
searchNextPrevDebounceTimeout | Debounce on jump to prev\next search result | `number` | `100`
downloadDisabled | Disable download of transcript | `boolean` | `false`
printDisabled | Disable print of transcript | `boolean` | `false`