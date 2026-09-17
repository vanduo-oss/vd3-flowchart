# @vanduo-oss/vd3-flowchart

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Vanduo **flowchart** for Vue 3: a node/edge editor with undo/redo, layout
modes, and a framework-agnostic core. Extracted 1-to-1 from
`@vanduo-oss/vd3-cbun` flowchart **1.2.0**.

**Status: 1.3.0.** `VD_FLOWCHART_VERSION` tracks the package release.
`FLOWCHART_DOCUMENT_VERSION` (currently `1.2.0`) is the value `toJSON()`
writes. Do not reset either independently without a compatibility plan.

## Install

```sh
pnpm add @vanduo-oss/vd3-flowchart
```

`vue >=3.3.0` is a **required** peer dependency (the only runtime dep) — install
it alongside if your project does not already depend on Vue. For correct
theming, also provide the Vanduo `--vd-*` design tokens (see
[Theming](#theming)).

## Import

```js
import {
  VdFlowchart,
  VdFlowchartCore,
  computeLayout,
  LAYOUT_MODES,
  FLOWCHART_NODE_TYPES,
  VD_FLOWCHART_VERSION,
  FLOWCHART_DOCUMENT_VERSION,
} from '@vanduo-oss/vd3-flowchart';
import '@vanduo-oss/vd3-flowchart/css';
```

Named exports only — no default export. `VdFlowchart` is the Vue wrapper; the
editor class is re-exported as `VdFlowchartCore` (same class name upstream).
`computeLayout`, `LAYOUT_MODES`, and the `FLOWCHART_*` tables
(`FLOWCHART_NODE_TYPES`, `FLOWCHART_PORTS`, `FLOWCHART_EDGE_MARKERS`,
`FLOWCHART_EDGE_ROUTES`) ship alongside. The core does not import Vue.

`vue` is never bundled — it stays external in both the esm and cjs outputs.
The build emits `dist/meta.json` and **fails** if any input leaves `src/` or
if anything but `vue` is externalized. The package declares
`sideEffects: ["**/*.css"]`.

## Version policy

`package.json` version **is** `VD_FLOWCHART_VERSION` (`1.3.0`). Bump those
together for a package release. Keep `FLOWCHART_DOCUMENT_VERSION` unchanged
unless the serialized schema changes; add fixtures and explicit compatibility
rules for a format change. Unversioned 1.x documents through 1.2.0 still load.
Malformed JSON and unsupported future versions throw before the active
document, selection, or history change. This continues the old-line
`@vanduo-oss/flowchart` lineage (never reset to `1.0.0`). Do not reuse the
retired npm name `@vanduo-oss/flowchart`.

## Theming

Flowchart chrome renders against Vanduo `--vd-*` design tokens — the same
tokens `@vanduo-oss/vd3` defines — with built-in fallbacks. vd3 is not a
package dependency; any provider of the tokens works.

```js
import '@vanduo-oss/vd3/css';
// Same component styles without bundled icon fonts:
import '@vanduo-oss/vd3/css/core';
```

`@vanduo-oss/vd3/css/core` is **not** tokens-only. Token JSON is
`@vanduo-oss/vd3/tokens.json`.

Tokens consumed include `--vd-bg-primary`, `--vd-bg-secondary`,
`--vd-text-primary`, `--vd-text-muted`, `--vd-border-color`, and
`--vd-color-primary` (via `--vd-flowchart-*` locals).

## Security

- **No bundled dependencies** — beyond the `vue` peer, nothing is bundled; the
  build fails if any other module is externalized or any `node_modules` input
  is bundled.
- **Hardened `.npmrc`:** `ignore-scripts`, `minimum-release-age`, `save-exact`,
  `strict-peer-dependencies`, `trust-policy=no-downgrade`,
  `block-exotic-subdeps`, and an explicit `registry`.
- **MIT** licensed ([LICENSE](./LICENSE)); toolbar Phosphor paths are inlined
  (MIT) so the package vendors no third-party runtime modules.

## Exports

| Export | Contents |
| --- | --- |
| `@vanduo-oss/vd3-flowchart` | `VdFlowchart` + `VdFlowchartCore`, layout, `FLOWCHART_*`, `VD_FLOWCHART_VERSION`, `FLOWCHART_DOCUMENT_VERSION` |
| `@vanduo-oss/vd3-flowchart/css` | Stylesheet (`dist/vd3-flowchart.css`) |

## Tested interaction envelope

Observed on a Mac mini (Apple M4, 10 cores, 24 GB, macOS 26.6.2) with
Chromium 153 at 1440×1000, no CPU throttling. Two warmups and ten samples per
synchronous operation; drag used 24 pointer steps. Times include forced layout
and exclude compositor paint. These are observations, not supported-size
guarantees.

- Bar chart update with a data table: 100 / 500 / 1,000 / 2,500 rows → 1.7 / 8.4 / 17.5 / 47.4 ms median.
- Graph label edit: 25 / 100 / 250 / 500 nodes → 2.9 / 11.2 / 29.9 / 57 ms.
- Graph undo + redo: 3.6 / 14 / 34.5 / 69.8 ms.
- Graph tree/grid layout: 2.9 / 11.1 / 28.4 / 58.9 ms.
- Graph drag (translate the moved node SVG and rebuild only incident edges): 0.2 / 0.3 / 0.2 / 0.3 ms, down from 1.6 / 4.5 / 10.7 / 20.7 ms before that path.

Raw JSON: `vd3-docs/reviews/2026-09-16/performance-results.json`.

## Development

```sh
pnpm install
pnpm lint          # eslint
pnpm format:check  # prettier
pnpm stylelint     # authored CSS
pnpm test          # vitest (jsdom + node)
pnpm build         # esbuild harness → dist/
pnpm test:types    # tsc --noEmit over tests/types (needs dist/)
pnpm test:e2e      # Playwright Chromium (needs dist/)
```

`test:types` and `test:e2e` consume the built `dist/` output, so **run
`pnpm build` first**. Chromium must be installed once:
`pnpm exec playwright install chromium`.

The published package declares a consumer-friendly `engines.node >=20.19.0`;
the dev/CI toolchain pins Node 24 via `packageManager` +
`.github/workflows/ci.yml`.

## Documentation

- Agent / LLM reference — [SKILL.md](./SKILL.md)
- Contributing — [CONTRIBUTING.md](./CONTRIBUTING.md)
- Changelog — [CHANGELOG.md](./CHANGELOG.md)

## License

[MIT](./LICENSE) © Vanduo Open Source Foundation
