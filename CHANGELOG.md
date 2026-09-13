# Changelog

All notable changes to `@vanduo-oss/vd3-flowchart` are documented here.

## 1.2.0 — 2026-09-13

Extracted from `@vanduo-oss/vd3-cbun@1.4.2` as a standalone package. Component
API and `VD_FLOWCHART_VERSION` remain `1.2.0` (Vue wrapper + `VdFlowchartCore`,
`computeLayout`, `LAYOUT_MODES`, `FLOWCHART_*` tables, `{ version, viewport,
nodes, edges }` serialization, `MAX_NODES`/`MAX_EDGES` caps, `--vd-bg-*`
chrome). Playwright smoke is new in this repo (cbun never shipped one).
