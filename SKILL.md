---
name: vanduo-vd3-flowchart
description: Use when adding Vanduo Vue 3 flowchart with @vanduo-oss/vd3-flowchart — node/edge editor, undo/redo, layout modes, and a framework-agnostic core. Covers install, CSS, theming, and the load-bearing VD_FLOWCHART_VERSION 1.2.0.
---

# @vanduo-oss/vd3-flowchart

Standalone Vue 3 flowchart package. `vue >=3.3.0` is a required peer. The root
import re-exports the Vue wrapper AND the framework-agnostic core
(`VdFlowchartCore`). `VD_FLOWCHART_VERSION` is `1.2.0` and matches
`package.json`.

## Install

```sh
pnpm add @vanduo-oss/vd3-flowchart
```

Nothing registers globally. For correct theming, provide the Vanduo `--vd-*`
design tokens (see [Theming](#theming)).

## Flowchart

```js
import { VdFlowchart, VdFlowchartCore } from '@vanduo-oss/vd3-flowchart';
import '@vanduo-oss/vd3-flowchart/css';
```

`VdFlowchart` is the Vue 3 wrapper; the framework-agnostic editor core is the
same class name upstream, so it is re-exported as `VdFlowchartCore`. The entry
also re-exports `computeLayout`, `LAYOUT_MODES`, and the `FLOWCHART_*` constant
tables (`FLOWCHART_NODE_TYPES`, `FLOWCHART_PORTS`, `FLOWCHART_EDGE_MARKERS`,
`FLOWCHART_EDGE_ROUTES`) plus `VD_FLOWCHART_VERSION`. CSS ships at
`@vanduo-oss/vd3-flowchart/css`. `VD_FLOWCHART_VERSION` is `1.2.0` — it
continues the old-line lineage (never reset to `1.0.0`) because the value is
serialized into user documents via `toJSON().version`; resetting it would
mislabel documents saved by the old line.

## Theming

Flowchart uses `--vd-*` tokens (via `--vd-flowchart-*` locals) with built-in
fallbacks. vd3 is not a package dependency.

```js
import '@vanduo-oss/vd3/css';
import '@vanduo-oss/vd3/css/core';
```
