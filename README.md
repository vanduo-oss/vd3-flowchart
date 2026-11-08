# @vanduo-oss/vd3-flowchart

<a href="https://snyk.io/?utm_source=open-source&utm_medium=pg-ptr&utm_campaign=ref-2501-osp&utm_content=pg-cta"><img src="https://raw.githubusercontent.com/vanduo-oss/vd3-flowchart/main/assets/scanned-by-snyk.png" alt="Scanned by Snyk" width="206" height="141"></a>

[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A Vue 3 node and edge editor with undo, layout, and a framework-agnostic core. Peer: `vue >=3.3.0`.

**Status: 1.6.0.** `VD_FLOWCHART_VERSION` is the package release. `FLOWCHART_DOCUMENT_VERSION` is `1.3.0`, the value `toJSON()` writes. Bump those independently only with a compatibility plan. Guides: [vd3.vanduo.dev](https://vd3.vanduo.dev/). Agents: [SKILL.md](./SKILL.md).

## Install

```sh
pnpm add @vanduo-oss/vd3-flowchart
```

## Import

```js
import {
  VdFlowchart,
  VD_FLOWCHART_VERSION,
  FLOWCHART_DOCUMENT_VERSION,
} from '@vanduo-oss/vd3-flowchart';
import '@vanduo-oss/vd3-flowchart/css';
```

Named exports only. `VdFlowchart` is the Vue wrapper. The editor class is `VdFlowchartCore`. `computeLayout`, `LAYOUT_MODES`, and the `FLOWCHART_*` tables ship alongside and do not import Vue. `vue` stays external. The build fails if anything other than `vue` is externalized.

Chrome uses Vanduo `--vd-*` tokens, with fallbacks. `@vanduo-oss/vd3` is not a dependency. Import `@vanduo-oss/vd3/css` or `@vanduo-oss/vd3/css/core` once when the app already uses vd3. `/css/core` is not tokens-only; token JSON is `@vanduo-oss/vd3/tokens.json`.

## Security

This repo is monitored with [Snyk](https://snyk.io/?utm_source=open-source&utm_medium=pg-ptr&utm_campaign=ref-2501-osp&utm_content=pg-cta).

- Nothing is bundled beyond the `vue` peer. Toolbar Phosphor paths are inlined (MIT).
- Hardened `.npmrc`: `ignore-scripts`, `minimum-release-age`, `save-exact`, `strict-peer-dependencies`, `trust-policy=no-downgrade`, `block-exotic-subdeps`, and an explicit `registry`.
- [MIT](./LICENSE).

## Exports

| Export | Contents |
| --- | --- |
| `@vanduo-oss/vd3-flowchart` | `VdFlowchart`, `VdFlowchartCore`, layout, `FLOWCHART_*`, `VD_FLOWCHART_VERSION`, `FLOWCHART_DOCUMENT_VERSION` |
| `@vanduo-oss/vd3-flowchart/css` | Stylesheet (`dist/vd3-flowchart.css`) |

## Development

Node 26 LTS (`nvm use` from `.nvmrc`) and pnpm >= 10. `engines.node` `>=20.19.0` is the consumer floor. `pnpm release:check` is the pre-publish gate. `pnpm test:types` and `pnpm test:e2e` need `pnpm build` first. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Documentation

- [vd3.vanduo.dev](https://vd3.vanduo.dev/)
- [SKILL.md](./SKILL.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

[MIT](./LICENSE) © Vanduo
