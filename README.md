#  Design System Mapper

A Figma plugin for associating canvas layers with supported Design System components.

## Supported mappings

- Button
- Text input
- Header / navigation

Mappings save automatically when an option is chosen. The plugin keeps one document-level mapping set with one target each for Button, Text input, and Header / navigation. Assigning a new node to a category replaces its previous target. A green state confirms that the selected node is the saved target.

Choose **Export JSON** to download that single mapping set. Each category contains its saved page and node identity, or `null` when it has not been mapped.

## Develop

```sh
npm install
npm run build
```

Import `manifest.json` through **Figma → Plugins → Development → Import plugin from manifest**. Run `npm run watch` while developing to rebuild `code.js` after changes.

## Plugin data

The plugin writes one versioned JSON payload to the document-level `ontario.design-system.mappings.v2` key. Older per-node v1 data is ignored so component instances cannot multiply the exported mappings.
