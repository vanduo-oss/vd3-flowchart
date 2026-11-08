# Changelog

All notable changes to `@vanduo-oss/vd3-flowchart` are documented here.

## 1.6.0 — 2026-11-08

### Added

- **Theme-adaptive coloring for nodes and edges** (`FLOWCHART_COLOR_PRESETS`):
  12 presets (`default`, `primary`, `secondary`, `success`, `warning`,
  `danger`, `info`, `violet`, `teal`, `orange`, `pink`, `neutral`) driven by
  `--vd-flowchart-palette-*` light/dark CSS variables, plus optional custom CSS
  color overrides (`fill`, `stroke`, `textColor` on nodes; `color` on edges).
  Edge arrowheads and dot markers inherit the edge color automatically.
- **Coloring UI & API**: Inspector color swatch grid, custom color inputs, and
  reset action; toolbar quick-color palette popover; and programmatic methods
  `setNodeColor()`, `setEdgeColor()`, `setSelectionColor()`, and
  `clearSelectionColor()`.
- **Layer order ("Arrange")**: `bringToFront()`, `bringForward()`,
  `sendBackward()`, and `sendToBack()` for nodes, multi-selections, and edges,
  with Inspector controls and keyboard shortcuts (`Cmd/Ctrl + ]`,
  `Cmd/Ctrl + [`, `Cmd/Ctrl + Shift + ]`, `Cmd/Ctrl + Shift + [`).
- **Multi-selection Align & Distribute**: `alignNodes()`
  (`FLOWCHART_NODE_ALIGNMENTS`: `left`, `center`, `right`, `top`, `middle`,
  `bottom`) and `distributeNodes()` (`FLOWCHART_DISTRIBUTE_AXES`: `horizontal`,
  `vertical`), plus batch color, layer order, and lock controls in the
  multi-selection Inspector.
- **Edge stroke styles** (`FLOWCHART_EDGE_STROKE_STYLES`): `solid`, `dashed`,
  `dotted`, and `animated` (with `prefers-reduced-motion: reduce` support) via
  `edge.strokeStyle` and the Inspector `Style` selector.
- **Node locking**: `node.locked`, `setNodeLocked()`, `toggleNodeLocked()`,
  `Cmd/Ctrl + L` shortcut, and SVG lock badge. Locked nodes cannot be dragged,
  resized, nudged, inline-edited, or deleted via `deleteSelection()`.
- **Standalone SVG export**: `exportSvg({ padding, background })` serializes
  the visible diagram into a cropped, self-contained `<svg>` string with
  inlined colors and stripped interactive handles.
- **Vue template ref methods**: exposed all new coloring, layer order,
  align/distribute, locking, clipboard (`duplicateSelection`, `copySelection`,
  `pasteClipboard`, `pasteSelection`, `cutSelection`), and `exportSvg` methods
  on `VdFlowchart`.

### Fixed

- **Arrowhead endpoint retraction**: curved, straight, and orthogonal edge paths
  now retract their endpoint before start/end markers by the marker's overhang
  plus the target shape's outer stroke offset (including diamond miter vertices),
  so arrow tips meet the shape border cleanly instead of poking underneath the
  node fill.

### Compatibility

- `FLOWCHART_DOCUMENT_VERSION` stays `1.3.0`. Uncolored, unlocked, solid-stroke
  nodes and edges omit all new optional fields so default documents serialize
  identically to `1.5.1`. `load()` also accepts `data.color`, `data.fill`,
  `data.stroke`, `data.textColor`, `data.locked`, and `data.strokeStyle`
  fallbacks.

## 1.5.1 — 2026-11-01

### Fixed

- Inline text editors for shapes use transparent chrome so circles and diamonds
  keep their SVG silhouette while typing. Textbox, edge, and label editors keep
  an opaque panel.
- Dark theme idle node strokes lean on the accent color so outlines stay visible
  without hover or selection. Hosts may still override `--vd-flowchart-node-stroke`.
- The diagram canvas no longer draws a full-viewport focus ring. Mindmap Tab that
  opens a new branch editor skips the intermediate canvas focus flash.
- Tree layout measures node size. Rank and sibling gaps stay clear of the boxes,
  and a decision with one deep branch keeps that branch on the main spine.
- Facing orthogonal connectors shorten their stubs when two shapes sit closer
  than two full stubs, so the route does not loop around the pair.
- Tree layout re-picks ports from the flow: diamond side branches leave the side
  ports, and a reverse loop uses the quieter side of the spine.

## 1.5.0 — 2026-10-25

### Added

- Opt-in `minScale` and `maxScale` (default `0.35` and `3`) and `minNodeSize`
  and `maxNodeSize` (default `56` and `420`). Junctions stay fixed-size.
  Hosts that need a closer and wider view, including Oolaflow, can pass
  `0.05`–`20` and `6`–`4800`.
- Viewport scale is stored to four decimal places, so a zoom step still moves
  near 5%. Other geometry stays at two decimal places.
- Nodes smaller than their default size scale text, wrapping, radius, stroke,
  markers, curve arms, orthogonal routes, labels, and inline editors in
  proportion. Larger nodes do not grow that chrome.
- A wider camera range uses a 240,000-unit grid with spacing that stays
  readable at 5% and 2000%. The default range keeps the 12,000-unit grid.
- `fitNode(nodeId, padding?)` frames one visible node. Unknown and hidden
  nodes do nothing.

### Compatibility

- No methods were removed. Omitting the new options keeps 1.4.0 camera and
  node limits.
- `FLOWCHART_DOCUMENT_VERSION` stays `1.3.0`. Older 1.x documents still load.
  A 1.5.0 document still loads in 1.4.0, where the old clamps apply.
- This release does not add nested containers, suggestion overlays, floating
  panels, or an export API.

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
- **Document format 1.3.0:** nodes may carry `collapsed: true` (written only
  on collapsed nodes). Every 1.x document through 1.3.0 still loads; packages
  older than 1.4.0 reject 1.3.0 files as a future version.
- Double-clicking a connection edits its label instead of entering reconnect
  mode (a single click already shows the reconnect endpoints).
- The `select` event payload adds `nodeIds`; `selection` keeps its shape.

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
- Multi-select: Shift+click toggles, Shift+drag on empty canvas draws a
  marquee, Cmd/Ctrl+A selects all. Groups drag, nudge, copy, cut, paste,
  duplicate (with internal connections), and delete as one undo step each.
  `selectNodes()`, `toggleNodeSelection()`, `getSelectedNodeIds()`,
  `isNodeSelected()`, `nudgeNodes()`.
- Collapsible branches with a "+N" badge, a "−" toggle on a selected parent,
  and Cmd/Ctrl+/; hidden nodes are skipped by navigation, fit, minimap,
  guides, connection targets, and selection. `setCollapsed()`,
  `toggleCollapsed()`, `getVisibleNodes()`, `isNodeHidden()`.
- Connection labels from the keyboard: Shift+Arrow selects a node's connection
  on that side (repeat to cycle); Enter, F2, or typing edits inline; arrows
  move to the end nodes. `startEdgeLabelEdit()`, `selectSideEdge()`.
- Alignment guides while dragging, with Alt to bypass; `snapGuides` option.
- Minimap with click/drag panning, a toolbar toggle, and the `minimap` option;
  it hides on canvases narrower than 480px. `setMinimapEnabled()`,
  `centerViewOn()`.
- `autoLayout` option: re-run the current tree or radial layout after
  keyboard or handle insertions, in the same undo step.

### Fixed

- A node and its edge from `addChildNode()`, a handle click, or the keyboard
  undo in one step; naming a just-inserted node joins that step. New branch
  edges copy the sibling's or parent's edge style.
- Deleting a node from the keyboard selects its parent.
- The palette "Shapes" title no longer wraps mid-word in narrow columns.
- Inserted sibling connections keep sibling order for tree and radial layouts.
- The label editor no longer re-selects text that the user has already
  started typing.

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
