# Design

## Handles

Port handles are drawn at `getPortPosition() + normal * PORT_HANDLE_OFFSET / scale`.
Edges still attach on the boundary. The hit circle radius equals the offset, so
the hit area touches the boundary and stays clear of the corner zones. Port
groups render whenever the editor is editable; CSS reveals them on node hover,
on selection, while connecting, and with the arrow tool. The hover effect
changes fill and stroke only, so nothing moves.

A pointer-down on a handle starts the existing connect interaction. If the
pointer is released without passing the drag threshold, the editor adds a
child in the handle's direction with fixed ports and opens the text editor.

## Keyboard

The canvas keydown handler resolves in this order: text inputs are ignored,
then `?` help, Escape staging, zoom, history and clipboard, then node keys.
Mind-map keys (Tab, Enter, type-to-edit) apply only with
`keyboardShortcuts: 'mindmap'` and a selected node. Shift+Tab is left to the
browser so focus can always leave the canvas.

Spatial navigation scores each candidate node centre by its distance along the
pressed direction plus twice its perpendicular offset, keeping only candidates
within a 60-degree half-cone; it falls back to a half-plane search.

Child placement grows away from the parent's parent (right for roots), stacks
below the last child on the same side, and copies the parent's incoming edge
route and stroke width.

## History

`batchHistory(fn, reason)` suspends history recording while `fn` runs and
records one entry afterwards, so a node and its edge undo together.
