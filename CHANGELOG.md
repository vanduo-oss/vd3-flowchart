# Changelog

All notable changes to `@vanduo-oss/vd3-flowchart` are documented here.

## 1.4.0 — 2026-10-03

### Changed

- **Behavior change:** with the new default `keyboardShortcuts: 'mindmap'`,
  Enter on a selected node adds a sibling; F2, Space, or typing edits the
  label. While editing, Enter saves (Shift+Enter: new line; textbox nodes keep
  Enter for a new line). Use `keyboardShortcuts: 'basic'` for the 1.3.0 keys.
- Arrow keys select the nearest node in that direction instead of cycling
  through document order.
- Selected nodes no longer draw side resize dots; sides resize by dragging the
  edge. Corner handles are squares on a slightly outset frame.
- Connection handles sit outside each side, appear on hover as well as on
  selection, and no longer shift on hover (the scale transform used the node
  origin).

### Added

- `keyboardShortcuts` option and Vue prop (`'mindmap' | 'basic'`) with
  `FLOWCHART_KEYBOARD_SHORTCUTS`. Mind-map keys: Tab adds a child, Enter /
  Shift+Enter add a sibling below / above, Tab while editing saves and adds a
  child. All modes: Alt+Arrow nudge (Shift for 1 px), Cmd/Ctrl+D duplicate,
  Cmd/Ctrl + `=` / `-` / `0` zoom, Shift+1 fit, staged Esc, and a `?` overlay
  (also on the toolbar). Shift+Tab is never captured.
- Clicking a connection handle adds a connected node in that direction and
  opens it for editing; dragging still connects.
- `insertBranchNode()`, `insertSiblingNode()`, `navigateSelection()`,
  `nudgeNode()`, `duplicateSelection()`, `zoomTo()`, `revealNode()`, and
  `toggleShortcutsHelp()`; `startTextEdit()` accepts `{ initialText }`.
- Dashed selection frame for circle, diamond, and label nodes.

### Fixed

- A node and its edge from `addChildNode()`, a handle click, or the keyboard
  undo in one step; naming a just-inserted node joins that step. New branch
  edges copy the sibling's or parent's edge style.
- Deleting a node from the keyboard selects its parent.
- The palette "Shapes" title no longer wraps mid-word in narrow columns.

The saved document format stays `1.2.0`.

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
