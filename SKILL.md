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

## Verification

Add a node, toggle read-only, and confirm the edit remains. Undo/redo, save/reload,
and echo a change back through `data`. With only the keyboard, select nodes using
canvas arrows, edit with Enter, save with Ctrl/Cmd+Enter, and use Graph outline
to read relationships and connect nodes. Check the consumer's screen reader.

Use [Vue declarations](dist/vue.d.ts) for component props/events/exposed methods
and [core declarations](dist/core.d.ts) for document types and editor methods.
Core `VdFlowchartCore` requires a browser element and explicit `destroy()`;
the Vue wrapper mounts and cleans it up automatically.
