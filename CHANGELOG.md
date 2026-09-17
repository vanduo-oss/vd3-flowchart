# Changelog

All notable changes to `@vanduo-oss/vd3-flowchart` are documented here.

## 1.3.0 — 2026-09-17

### Added

- Keyboard canvas navigation (arrows, Home/End, Enter to edit) and a native
  **Graph outline** with labelled Edit/Connect controls.
- `FLOWCHART_DOCUMENT_VERSION` owns saved `version`. Package release stays on
  `VD_FLOWCHART_VERSION`.

### Fixed

- Option updates (read-only, grid, history) keep the live editor, camera,
  selection, and applicable history. Parent echoes of emitted documents do
  not loop.
- Malformed JSON and unsupported future documents throw before the active
  document, selection, or history change. Unversioned input and numeric or
  shortened 1.x versions through 1.2.0 still load.
- Graph outline refuses self-connection.
- Node drag translates the moved SVG node and rebuilds only incident edges;
  pointer-up still records history.

## 1.2.0 — 2026-09-13

Extracted from `@vanduo-oss/vd3-cbun@1.4.2` as a standalone package. Component
API and `VD_FLOWCHART_VERSION` remain `1.2.0` (Vue wrapper + `VdFlowchartCore`,
`computeLayout`, `LAYOUT_MODES`, `FLOWCHART_*` tables, `{ version, viewport,
nodes, edges }` serialization, `MAX_NODES`/`MAX_EDGES` caps, `--vd-bg-*`
chrome). Playwright smoke is new in this repo (cbun never shipped one).
