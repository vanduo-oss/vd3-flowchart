# flowchart Specification

## Purpose
Flowchart editor with 1.2.0 serialization lineage, Vue wrapper, and
`--vd-bg-*`-themed chrome on the package root.

## Requirements

### Requirement: flowchart subpath exports the wrapper primary and the 1.2.0 core

The package entry SHALL export the Vue wrapper `VdFlowchart` as
the primary surface and SHALL re-export the framework-agnostic core
alongside: the editor class aliased as `VdFlowchartCore`, `computeLayout` and
`LAYOUT_MODES` (from `layout.js`), the constants `FLOWCHART_NODE_TYPES`,
`FLOWCHART_PORTS`, `FLOWCHART_EDGE_MARKERS`, `FLOWCHART_EDGE_ROUTES`, and
`VD_FLOWCHART_VERSION`. The port source MUST be the old repo's WORKING TREE
(uncommitted 1.2.0 work: undo/redo history, layout engine, curve/straight/
orthogonal edge routes, theming tokens, hand-written `index.d.ts`), carried
verbatim outside the excision map. The entry MUST use named exports only.

#### Scenario: wrapper and core are importable from one subpath

- **GIVEN** a Vue 3 project with `@vanduo-oss/vd3-flowchart` installed
- **WHEN** it executes
  `import { VdFlowchart, VdFlowchartCore, computeLayout } from '@vanduo-oss/vd3-flowchart'`
- **THEN** `VdFlowchart` is a mountable Vue component, `VdFlowchartCore` is
  the editor class constructible against a DOM element, and `computeLayout`
  is the pure layout function

#### Scenario: 1.2.0 history API is present

- **GIVEN** a `VdFlowchartCore` instance created with `{ history: true }`
- **WHEN** a node is added and `undo()` then `redo()` are called
- **THEN** `canUndo()`/`canRedo()` report correctly and the document returns
  to the post-add state, matching the old-line working-tree behavior

### Requirement: flowchart serialization stays on the 1.2.0 lineage

`VD_FLOWCHART_VERSION` SHALL remain `'1.2.0'` — the constant is load-bearing
because `toJSON()` serializes it into user documents as `version` — and MUST
equal `package.json` `version`. `toJSON()` SHALL
keep the `{ version, viewport, nodes, edges }` document shape, and `load()`
MUST continue to accept documents produced by the old-line
`@vanduo-oss/flowchart` 1.x releases (normalization of missing/legacy fields
preserved verbatim from the working tree). **Deserialization MUST be bounded:
`normalizeDocument()` SHALL truncate an untrusted document to at most
`MAX_NODES` (10000) nodes and at most `MAX_EDGES` (10000) edges, dropping the
excess silently (never throwing), so a hostile document cannot be normalized
`O(n)` and rendered into a client-side denial of service.** This truncation
MUST NOT alter the serialized format of an in-range document.

#### Scenario: serialized documents carry version 1.2.0

- **GIVEN** any `VdFlowchartCore` instance
- **WHEN** `toJSON()` is called
- **THEN** the returned document's `version` is exactly `'1.2.0'` and the
  document has `viewport`, `nodes`, and `edges` keys

#### Scenario: old-line 1.x document loads unchanged (backward compatibility)

- **GIVEN** a document serialized by the old-line `@vanduo-oss/flowchart`
  (e.g. `version: '1.1.0'`, nodes/edges in the 1.x shape)
- **WHEN** it is passed to `load()` or the constructor's `data` option
- **THEN** all nodes and edges are preserved with their ids, positions, and
  connections intact, and re-serializing emits `version: '1.2.0'`

#### Scenario: an oversized untrusted document is truncated, not thrown

- **GIVEN** a document with more than `MAX_NODES` nodes (or more than
  `MAX_EDGES` edges)
- **WHEN** it is passed to `load()` or the constructor's `data` option
- **THEN** `load()` does not throw or hang; `toJSON().nodes` contains at most
  `MAX_NODES` nodes and `toJSON().edges` at most `MAX_EDGES` edges, and the
  emitted `version` is still `'1.2.0'`

#### Scenario: an in-range document round-trips unchanged under the caps (backward compatibility)

- **GIVEN** a document whose node and edge counts are within the caps (any
  normal saved diagram, or an old-line 1.x document)
- **WHEN** it is loaded and then `toJSON()` is called
- **THEN** all nodes and edges round-trip losslessly with `version: '1.2.0'`,
  identical to the pre-caps behavior

### Requirement: flowchart vanilla layer is excised, runtime listeners stay

The flowchart module SHALL NOT export `init`, `destroy` (module-level),
`destroyAll`, `reinit`, `instances`, `optionsFromElement`, or the
`VanduoFlowchart` namespace object, and importing the module MUST NOT write
`window.VanduoFlowchart`, call `window.Vanduo.register`, or scan the DOM for
`data-vd-flowchart` attributes. The auto-data helpers orphaned by the
excision (`parseFlowchartData`, `readAutoData`, `parseBooleanAttribute`,
`parseNumberAttribute`, `normalizeRoot`, `queryAll`) are removed with it. The
`VdFlowchart` class's internal `window.addEventListener` /
`requestAnimationFrame` usage SHALL stay — it is runtime interaction bound on
construction and MUST be fully removed by `destroy()`.

#### Scenario: importing the module registers no globals

- **GIVEN** a browser-like environment where `window.VanduoFlowchart` is
  undefined
- **WHEN** `@vanduo-oss/vd3-flowchart` is imported
- **THEN** `window.VanduoFlowchart` is still undefined and no editor
  instances have been created

#### Scenario: destroy removes the runtime window listeners

- **GIVEN** a constructed `VdFlowchartCore` instance (which binds `pointerup`
  and `resize` listeners on `window`)
- **WHEN** `destroy()` is called
- **THEN** those window listeners are removed and the host element is
  restored (class and content cleared)

### Requirement: flowchart stylesheet ships as a css subpath

The working-tree flowchart stylesheet SHALL be carried to
`src/styles.css` and published as `dist/vd3-flowchart.css`,
resolvable via the `./css` export.

#### Scenario: stylesheet resolves through the exports map

- **GIVEN** a bundler that honors package `exports`
- **WHEN** the consumer imports `@vanduo-oss/vd3-flowchart/css`
- **THEN** it resolves to `dist/vd3-flowchart.css`, whose rules
  match the old repo's working-tree `src/styles.css`

### Requirement: flowchart serialization test coverage

The repo SHALL provide vitest coverage (jsdom) pinning the serialization
contract: `toJSON()` returns a deep-cloned document with exactly the
`{ version, viewport, nodes, edges }` shape, `toJSON().version === '1.2.0'`,
and `VD_FLOWCHART_VERSION` equals `package.json` `version`. Because the serialized format is load-bearing, the
suite MUST include an explicit backward-compatibility case built on a frozen
fixture document in the old-line 1.x shape.

#### Scenario: toJSON emits the 1.2.0 lineage

- **GIVEN** a `VdFlowchartCore` instance with a node and an edge
- **WHEN** `toJSON()` is called
- **THEN** the document's `version` is exactly `'1.2.0'`, the shape is
  `{ version, viewport, nodes, edges }`, and mutating the returned object
  does not affect the editor state

#### Scenario: frozen 1.x document loads losslessly (backward compatibility)

- **GIVEN** the checked-in fixture `flowchart-doc-1.1.json` (old-line 1.x
  shape, `version: '1.1.0'`, never regenerated)
- **WHEN** it is passed to `load()`
- **THEN** every node and edge survives with ids, positions, text, and
  connections intact, and a subsequent `toJSON()` emits
  `version: '1.2.0'`

### Requirement: flowchart history test coverage

The repo SHALL provide vitest coverage (jsdom) for the 1.2.0 undo/redo
history: `canUndo`/`canRedo` reporting, `undo()`/`redo()` round trips
restoring document state, history disabled via `{ history: false }`,
`historyLimit` trimming, and `clearHistory()`. A `VdFlowchart` wrapper mount
spec MUST verify mount creates the editor, `change`/`ready` events are
forwarded as Vue events, and unmount destroys the instance (window listeners
removed).

#### Scenario: undo and redo round trip

- **GIVEN** an editor with `{ history: true }` and one committed node
  addition
- **WHEN** `undo()` then `redo()` are called
- **THEN** after `undo()` the node is gone and `canRedo()` is true; after
  `redo()` the node is back and the document equals the pre-undo `toJSON()`
  output

#### Scenario: wrapper forwards history-relevant change events

- **GIVEN** a jsdom mount of `VdFlowchart` with an `@change` listener
- **WHEN** the exposed editor instance adds a node
- **THEN** the Vue `change` event fires, and unmounting removes the editor's
  `window` listeners

### Requirement: flowchart-chrome-follows-vd-bg-tokens

The flowchart stylesheet MUST theme panels, nodes, handles, and inspector
chrome through `--vd-bg-primary` / `--vd-bg-secondary` (and related `--vd-*`
border tokens) via `--vd-flowchart-*` locals. It MUST NOT blend chrome fills
toward fixed light cream/white hexes (`#ffffff`, `#efe7d4`, `#f5ecd8`, and
similar) so dark mode stays coherent with the host palette.
`VD_FLOWCHART_VERSION` MUST remain `'1.2.0'` (serialization unchanged).

#### Scenario: panel and node fills read bg tokens

- **GIVEN** `src/styles.css`
- **WHEN** the `:root` `--vd-flowchart-surface` / `--vd-flowchart-panel` /
  `--vd-flowchart-node-fill` locals are inspected
- **THEN** each resolves through `var(--vd-bg-primary, …)` and/or
  `var(--vd-bg-secondary, …)` rather than a bare cream/white hex fill

#### Scenario: dark theme stays coherent without JS

- **GIVEN** a mounted flowchart under `[data-theme="dark"]` on `<html>`
- **WHEN** panel and node chrome are inspected
- **THEN** their backgrounds recompute from the dark `--vd-bg-*` values with
  no JavaScript recolor pass


### Requirement: flowchart real-browser smoke coverage

The Playwright smoke suite SHALL include a flowchart spec running against a
harness page that imports the BUILT `dist/index.js` (ESM, with an import map
resolving the external `vue` specifier). It MUST assert: the host shell
mounts (`.vd-flowchart-host`, `.vd-flowchart-shell`, `svg.vd-flowchart-svg`),
`VD_FLOWCHART_VERSION` is `'1.2.0'`, a seeded document renders nodes, 
`toJSON().version` is `'1.2.0'`, undo reverts a committed add, and the page
logs zero console errors.

#### Scenario: built flowchart entry mounts in a real browser

- **GIVEN** `pnpm build` has produced `dist/index.js` and the static test
  server is running
- **WHEN** the Playwright flowchart spec loads the harness
- **THEN** the editor shell is present, seeded nodes render, `toJSON().version`
  is `'1.2.0'`, undo works, and the page logs zero console errors
