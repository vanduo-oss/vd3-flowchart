# Clear connection handles and a mind-map keyboard model

## Why

Selected nodes drew a connection port on the boundary and a side resize dot
8 px further out on the same axis. The port hit circle covered the resize dot,
so the dot was visible but unreachable, and the port hover scale transformed
around the node origin, visibly shifting the circle. Keyboard support only
cycled nodes in array order and edited labels, which is too slow for building
mind maps.

## What changes

- Side resize dots are removed. Sides still resize through invisible strips
  with a resize cursor; corners keep square handles.
- Connection handles sit outside each side, appear on hover and selection,
  and never overlap a resize zone. Dragging a handle connects; clicking one
  adds a connected node in that direction and opens it for editing.
- Circle, diamond, and label selections show a dashed bounding box.
- A new `keyboardShortcuts` option (`'mindmap'` default, `'basic'`) adds
  Tab (child), Enter (sibling), F2/Space/type-to-edit, spatial arrow
  navigation, Alt+Arrow nudging, Cmd/Ctrl+D duplicate, staged Escape, zoom
  keys, and a `?` shortcut overlay. Shift+Tab is never captured.
- Keyboard and handle insertions (node plus edge) undo as one step.

## Impact

Minor release: package.json and `VD_FLOWCHART_VERSION` move together to
1.4.0. Behavior change: with the default `'mindmap'` mode, Enter on a selected
node adds a sibling instead of editing (F2 or Space edits); arrows navigate
spatially instead of by array order. `keyboardShortcuts: 'basic'` keeps the
previous Enter-to-edit behavior. The serialized document format stays 1.2.0;
no backward-compatibility work is required. No runtime dependencies are added.

## Non-goals

Multi-select, collapsing branches, collision-free automatic relayout,
alignment guides, minimap, and single-letter tool shortcuts. No remote writes,
publication, or deployment.
