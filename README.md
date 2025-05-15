# figma-variables-JSON-import

## Fork & Disclaimer

**figma-variables-JSON-import** is a fork of [microsoft/figma-variables-import](https://github.com/microsoft/figma-variables-import), now maintained by Thierry Charbonnel.

## Changes since Microsoft’s version

-   Renamed `figma-variables-import` → **figma-variables-json-import**
-   Added Node.js ≥ 20 support
-   Added browse button to import JSON files
-   Added support for scoped tokens and code syntax
-   Minor UI improvements

> **Disclaimer:** This project is not affiliated with or endorsed by Microsoft Corporation.

Thanks to Travis Spomer <travis@microsoft.com> for the original version.

This Figma plugin allows you to import design tokens in the [Design Token Community Group](https://design-tokens.github.io/community-group/format/) format as Figma Variables.

This plugin does not contain a fully spec-compliant parser for the DTCG format and cannot handle every single valid token file—it's just a tool we built for internal use.

The following token types are supported:

-   `string`
-   `number`, `dimension`, `duration`
-   `boolean`
-   Aliases to any other supported token in the same JSON and Figma file

The following are supported **only** when running a local copy of this plugin, not from the Figma Community:

-   Aliases to any other supported token in a different JSON file and Figma file, if the other Figma file has published the variables to a team library

## Prerequisites

-   Node.js ≥ 20.0.0
-   npm ≥ 8.x
-   Figma desktop app or Figma web with plugin support

## Setup

### Node.js

Install [Node.js](https://nodejs.org/en/download) so you can build this project.

### Install

Then install dependencies.

```bash
npm install
```

### Build

Then you can build.

#### Dev

To enable all features, you need to open `manifest.json` and add the following line:

```json
"enableProposedApi": true
```

Then, you can start a background build with:

```bash
npm run build:watch
```

#### Production

```bash
npm run build
```

`enableProposedApi` **cannot** be used in a plugin published to the Figma community, even internal to your own organization.

# Adding to Figma

Add this plugin to Figma using "[import new plugin from manifest](https://help.figma.com/hc/en-us/articles/360042786733-Create-a-plugin-for-development)".

## Usage

1. Open your Figma file.
2. Go to **Plugins › Development › Import plugin from manifest**.
3. Run **Figma Variables Import** from the Plugins menu.
4. Select your design tokens JSON file to import.

---

## License & Trademarks

Copyright (c) Microsoft Corporation.
Copyright (c) 2025 Thierry Charbonnel.
MIT License.

## Trademarks

“Microsoft” is a registered trademark of Microsoft Corporation. This fork does **not** use any Microsoft trademarks beyond the attribution required by the MIT license and is **not** affiliated with or endorsed by Microsoft.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for guidelines.
