# Design

## Selection

`selection` stays the primary item so existing code paths keep their meaning.
`selectedNodeIds` holds every selected node, including the primary one. Any
plain selection resets the set to the primary node. Group gestures read the
set; single-node affordances (resize handles, Tab/Enter insertion,
type-to-edit) apply only when the set has one node.

## Collapsed branches

A node is hidden when it has at least one incoming connection and every
incoming connection comes from a collapsed or hidden node. The pass iterates
to a fixpoint, so cycles and shared children are safe; a child reachable from
an expanded branch stays visible. Hidden nodes and their connections are
skipped by rendering, navigation, fit, minimap, guides, connection targets,
and marquee.

## Guides

At drag start the editor collects the left/centre/right x and
top/middle/bottom y lines of every other visible node. Each move snaps the
dragged box (single node or group bounds) to the nearest line within 6 screen
pixels per axis and draws the matching lines in `guidesLayer`, which is the
only layer touched besides the dragged nodes and their incident connections.

## Minimap

A separate SVG redrawn on the next animation frame after `render()`. It
scales the union of visible node bounds and the viewport into a fixed box.
Pointer down/move centres the main viewport on the pointed world position.

## Auto-layout

With `autoLayout` on, insertions run `layout(layoutMode)` inside the same
history batch (grid mode is skipped). New sibling connections are spliced in
after the anchor sibling's connection so tree and radial layouts keep order.
