# Kaltura Player V7 - Transcript plugin

[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

## Overview
> this section will be added soon

## Project structure
> this section will be added soon

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