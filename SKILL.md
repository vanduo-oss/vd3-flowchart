---
name: vanduo-vd3-flowchart
description: Integrate @vanduo-oss/vd3-flowchart into Vue 3 apps with controlled documents, editing, layouts, undo, and JSON persistence.
---

# Vanduo flowchart

Install `@vanduo-oss/vd3-flowchart` alongside Vue. Import `VdFlowchart` and
`@vanduo-oss/vd3-flowchart/css`; no global registration is needed. Styles have
token fallbacks. In a VD3 app, share the base stylesheet already imported at
app entry; choose `/css` or `/css/core`, not both.

Start from [the complete editor recipe](recipes/editor.vue). It includes two
nodes, an edge, a controlled `data` prop, change events, read-only state, and undo.
Give the editor a definite height. Set `auto-fit` for its first measurable layout.

## State and persistence

Local edits emit `change` with `{ reason, document }`. Feeding `document` back
into `data` is safe. External replacements are silent and undoable; identical
echoes preserve selection/history. Ordinary option changes keep the live editor.
Disabling history clears it; reenabling starts from the current document.

Save `event.document` or `getInstance().toJSON()`. Core `load()` emits by default;
catch validation errors so a failed import can be reported to the user. Unknown
future versions and malformed JSON are rejected before changing current work.
`FLOWCHART_DOCUMENT_VERSION` describes saved JSON; `VD_FLOWCHART_VERSION`
describes the package release. Do not replace document versions with app versions.

## Keyboard

`keyboardShortcuts` defaults to `'mindmap'`. With the canvas focused:

| Keys | Action |
| --- | --- |
| Arrow keys | Select the nearest node in that direction |
| Shift+Arrow | Select a connection on that side (repeat to cycle) |
| Enter, F2, or typing on a connection | Edit its label |
| Cmd/Ctrl+A | Select all nodes |
| Cmd/Ctrl+/ | Collapse or expand the branch |
| Tab | Add a child node and edit it |
| Enter / Shift+Enter | Add a sibling below / above and edit it |
| F2, Space, or typing | Edit the label |
| Enter / Tab while editing | Save / save and add a child (Shift+Enter: new line) |
| Alt+Arrow (Shift for 1 px) | Nudge the node by one grid step |
| Cmd/Ctrl+D | Duplicate the node |
| Cmd/Ctrl + `]` / `[` (Shift for front/back) | Bring forward/front, send backward/back |
| Cmd/Ctrl+L | Lock or unlock the selected node(s) |
| Cmd/Ctrl + `=` / `-` / `0`, Shift+1 | Zoom in, out, 100%, fit |
| Esc | Cancel editing, then the tool, then deselect |
| Shift+Tab, or Esc then Tab | Leave the canvas |
| `?` | Show all shortcuts |

`'basic'` keeps Tab for focus movement. Enter or F2 edits, and Ctrl/Cmd+Enter saves. A node plus its edge, and naming a just-inserted node, undo in one step. Shift+click, Shift+drag, and Cmd/Ctrl+A select several nodes (`select` lists them in `nodeIds`). Hover or select a node to show connection handles. Drag a handle to connect, or click it to add a node in that direction. Resize from the corner squares or a side. Drags snap to other nodes' edges and centres; hold Alt to bypass. Double-click a connection to edit its label. A collapsed branch shows a "+N" badge.

## Canvas options

`snapGuides` (default true) snaps drags to alignment guides; `minimap`
(default true) shows the overview; `autoLayout` (default false) re-runs the
current tree or radial layout after insertions. Saved JSON uses document
format 1.3.0, which writes optional `collapsed: true`, `color`, `fill`,
`stroke`, `textColor`, and `locked: true` on nodes and `color`, `strokeStyle`
on edges only when non-default.

## Coloring, arrange, locking, and export

Nodes and edges adapt to light/dark themes by default and accept named presets
(`FLOWCHART_COLOR_PRESETS`: `'primary'`, `'secondary'`, `'success'`,
`'warning'`, `'danger'`, `'info'`, `'violet'`, `'teal'`, `'orange'`, `'pink'`,
`'neutral'`) or custom CSS colors via `setNodeColor()`, `setEdgeColor()`,
`setSelectionColor()`, and `clearSelectionColor()`. Reorder z-order with
`bringToFront()`, `bringForward()`, `sendBackward()`, and `sendToBack()`
(or Cmd/Ctrl + `]` / `[`). Align and distribute multi-selected nodes with
`alignNodes()` and `distributeNodes()`, lock nodes with `setNodeLocked()` /
`toggleNodeLocked()` (Cmd/Ctrl+L), and export standalone SVG markup with
`exportSvg()`.

## Deep zoom

`minScale` and `maxScale` default to `0.35` and `3`. `minNodeSize` and
`maxNodeSize` default to `56` and `420`. Pass both ends of a pair to opt into
a wider camera or smaller and larger nodes. An invalid pair falls back to those
defaults. Junctions stay 28×28. `getInstance().fitNode(id, padding)` frames one
visible node; padding is screen pixels. Scale is stored to four decimal places.
A node smaller than its default size scales its text, markers, and connectors
with it. The default grid is 12,000 units; a wider camera uses 240,000. The
same four names are Vue props. Saved JSON stays document format 1.3.0; scale
and size remain plain numbers.

## Observed interaction cost

These are observations, not supported-size guarantees. Measured on a Mac mini
(Apple M4, macOS 26) with Chromium at 1440×1000, two warmups and ten samples,
including forced layout and excluding compositor paint. Graph label edit at
25 / 100 / 250 / 500 nodes was about 2.9 / 11.2 / 29.9 / 57 ms. Undo+redo was
about 3.6 / 14 / 34.5 / 69.8 ms. Tree/grid layout was about 2.9 / 11.1 / 28.4 /
58.9 ms. Dragging a node (translate that SVG node and rebuild only incident
edges) stayed under 1 ms. Raw JSON:
`vd3-docs/reviews/2026-09-16/performance-results.json`.

## Verification

Add a node, toggle read-only, and confirm the edit remains. Undo/redo, save/reload,
and echo a change back through `data`. With only the keyboard, build a small map
with Tab, typing, and Enter, move with arrows, and use Graph outline to read
relationships and connect nodes. Check the consumer's screen reader.

Use [Vue declarations](dist/vue.d.ts) for component props/events/exposed methods
and [core declarations](dist/core.d.ts) for document types and editor methods.
Core `VdFlowchartCore` requires a browser element and explicit `destroy()`;
the Vue wrapper mounts and cleans it up automatically.
