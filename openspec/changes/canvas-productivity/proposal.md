# Canvas productivity: selection, branches, guides, minimap

## Why

The 1.4.0 handle and keyboard work made single-node mind-map entry fast, but
larger diagrams still lack the basics of mainstream canvas editors: working on
several nodes at once, folding branches away, keeping manual layouts tidy,
finding your place in a big map, and labelling connections without a mouse.

## What changes

- Connection labels: Shift+Arrow selects a node's connection on that side;
  Enter, F2, or typing edits its label inline; double-click edits too.
- Alignment guides snap a dragged node to other nodes' edges and centres
  (Alt bypasses; `snapGuides` option).
- A minimap shows the whole diagram and pans on click or drag (`minimap`
  option and toolbar toggle).
- Multi-select: Shift+click, Shift+drag marquee, Cmd/Ctrl+A; group move,
  delete, copy, cut, paste, duplicate, and nudge. `select` gains `nodeIds`.
- Collapsible branches saved as `collapsed: true` on a node, with a "+N"
  badge and Cmd/Ctrl+/.
- Opt-in `autoLayout` re-runs the current layout after keyboard or handle
  insertions; inserted sibling connections keep sibling order.

## Impact

Package stays 1.4.0 (unpublished); package.json and `VD_FLOWCHART_VERSION`
stay equal. `FLOWCHART_DOCUMENT_VERSION` moves from 1.2.0 to 1.3.0 because
`collapsed` is a new serialized node field. 1.4.0 loads every 1.x document up
to 1.3.0; 1.3.0 documents are rejected by 1.3.0 and earlier packages (they
are future versions there). `collapsed` is written only on collapsed nodes,
so other nodes serialize exactly as before. All API additions are additive.

## Non-goals

Animated layout transitions, snapping while resizing, equal-spacing guides,
keyboard operation of the minimap, multi-select of connections. No remote
writes, publication, or deployment.
