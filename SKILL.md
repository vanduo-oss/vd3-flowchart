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

`keyboardShortcuts` defaults to `'mindmap'`: with a node selected on the focused
canvas, Tab adds a child, Enter adds a sibling (Shift+Enter above), and F2, Space,
or typing edits the label. While editing, Enter saves and Tab saves and adds a
child. Arrows select the nearest node in that direction; Alt+Arrow nudges.
Shift+Tab, or Esc then Tab, leaves the canvas. `?` lists every shortcut. Use
`'basic'` when Tab must always move focus; Enter then edits and Ctrl/Cmd+Enter
saves. A node plus its edge, and naming a just-inserted node, undo in one step.
Shift+Arrow selects a connection on that side; Enter, F2, or typing edits its
label. Shift+click, Shift+drag, and Cmd/Ctrl+A select several nodes (the
`select` event lists them in `nodeIds`). Cmd/Ctrl+/ collapses a branch.

## Canvas options

`snapGuides` (default true) snaps drags to alignment guides; `minimap`
(default true) shows the overview; `autoLayout` (default false) re-runs the
current tree or radial layout after insertions. Saved JSON uses document
format 1.3.0, which adds `collapsed: true` on collapsed nodes only.

## Verification

Add a node, toggle read-only, and confirm the edit remains. Undo/redo, save/reload,
and echo a change back through `data`. With only the keyboard, build a small map
with Tab, typing, and Enter, move with arrows, and use Graph outline to read
relationships and connect nodes. Check the consumer's screen reader.

Use [Vue declarations](dist/vue.d.ts) for component props/events/exposed methods
and [core declarations](dist/core.d.ts) for document types and editor methods.
Core `VdFlowchartCore` requires a browser element and explicit `destroy()`;
the Vue wrapper mounts and cleans it up automatically.
