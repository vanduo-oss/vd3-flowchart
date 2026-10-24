# Layered tree layout quality

## Why

Oolaflow's chat draws flowcharts and Forwardflow grows them one step at a time. The package tree layout is a depth-first spanning forest: it does not break cycles, rank nodes into layers, or reduce crossings. Back-edges disappear from the forest, long edges cut across ranks, and fixed gaps ignore node size, so a branching diagram comes out as a zig-zag or a single row. Oolaflow needs a readable layered drawing. Until this package ships it, oolaflow only calls the public API: it passes `direction` into `layout('tree')`, sets `route` to `orthogonal` on forward edges and `curve` on loops, and places Forwardflow ghosts on one axis.

## What changes

- Upgrade `tree` mode along the Sugiyama pipeline: break cycles with a depth-first feedback arc set, assign layers by the longest path, insert dummy nodes for edges that skip a layer, and sweep layers with the barycenter heuristic to cut crossings.
- Space ranks and siblings from the real node sizes, with extra room beside a diamond so branch labels fit.
- Keep `direction` (`down`, `right`, `up`, `left`). Forward edges attach on the flow side. A back-edge stays in the graph and routes as a loop instead of being dropped.
- Leave `radial` and `grid` as they are.

## Impact

Minor release when implemented. `package.json` and `VD_FLOWCHART_VERSION` move together from 1.4.0 to the next minor (1.5.0, or later if another minor lands first). `FLOWCHART_DOCUMENT_VERSION` stays `1.3.0` because positions and routes are already in the document. Oolaflow keeps choosing direction, hybrid routes, and Forwardflow alignment in the host until this layout ships.

## Non-goals

No new renderer, no force-directed mode, and no document-format change. No remote writes, publication, or deployment.
