# Design

## Context

`normalizeViewport()` and `getNodeSizeBounds()` clamp every load, resize, and zoom through module constants `MIN_SCALE` 0.35, `MAX_SCALE` 3, `MIN_NODE_SIZE` 56, and `MAX_NODE_SIZE` 420. `formatNumber()` rounds every number, including scale, to two decimals. Markers and route constants use fixed world-unit floors, so a 6-unit node can be smaller than its arrowhead. The grid is one 12,000-unit rectangle with a fixed pattern.

Oolaflow already proved the visual math in its host adapter. This change copies that math into the editor. It does not copy Oolaflow's method replacement, containment policy, or zoom-to-nest draw rule.

## Goals / Non-Goals

**Goals:**

- One bounds pair per editor, applied at every camera and node ingress.
- Legacy defaults when options are omitted or the pair is invalid.
- Rendering and hit targets that stay usable from 5% through 2000% when a host opts in.
- `fitNode` as a public camera operation.
- Document format 1.3.0 and no new runtime dependencies.

**Non-Goals:**

- Native containment, suggestion overlays, host-owned chrome, and export.
- Changing default limits for existing consumers.
- Four-decimal rounding for positions, sizes, or edge geometry.

## Decisions

1. **Normalize each pair once.** `normalizeBoundPair(min, max, fallbackMin, fallbackMax)` returns the whole legacy pair when either value is missing, non-finite, non-positive, or when `min >= max`. Store `minScale`, `maxScale`, `minNodeSize`, and `maxNodeSize` on the instance.

2. **Pass bounds into normalization.** `normalizeDocument`, `normalizeNode`, `normalizeViewport`, and the node clamp helpers take the instance bounds. Constructor, `load`, `clear`, paste, history restore, add, update, resize, and branch insertion all use those helpers. Junction specs keep their own fixed min and max.

3. **Scale rounding is separate.** `formatScale()` uses four decimal places and is the only formatter for `viewport.scale`. `formatNumber()` stays two decimals for x, y, width, height, and path coordinates.

4. **Camera ingress uses instance bounds.** Wheel and toolbar zoom, `scaleAround`, `zoomTo`, `setViewport`, `resetView`, `fitView`, `fitNode`, load, and history restoration clamp scale with the instance pair. History still preserves the current camera, then re-normalizes it, so a legal 0.05 is not pulled back to 0.35.

5. **`updateOptions` is non-destructive for nodes.** Camera bounds clamp the current scale once and emit `viewport:bounds` only when it changes. Node bounds affect later clamps. Existing nodes are not resized.

6. **`fitNode(nodeId, padding = 48)`** is a chainable no-op for an unknown or hidden node. Padding is screen pixels. The scale fits the node inside the canvas minus padding, then clamps to the camera bounds. The node centre stays at the view centre. It renders once and emits `viewport:fit-node` through the existing viewport and change events.

7. **Visual scale is node-relative and capped at 1.** `nodeVisualScale` is `min(1, width / defaultWidth, height / defaultHeight)`. Edge scale is the smaller endpoint scale. Below 1, scale text, wrapping (`width / nodeScale`), radius, stroke, markers, curve arms, orthogonal constants, label offset, preview strokes, and inline editors. Screen-sized handles, ports, and edge hit strokes stay reachable by dividing the screen target by the viewport scale, as the current chrome already does.

8. **Grid follows the configured camera.** Default bounds keep the 12,000-unit grid and the configured `gridSize`. Wider bounds use a 240,000-unit grid. Pattern spacing multiplies or divides by 4 until a tile is about 12–48 screen pixels, with `vector-effect: non-scaling-stroke` so the line stays visible at 5% and 2000%.

9. **Vue stays a thin wrapper.** Add numeric props and include them in `updateOptions`. Expose `fitNode` on the template ref. Do not add a document field.

10. **Release checks do not publish.** `release:check` runs the local gates, strict OpenSpec, pack inspection, and a temporary ESM/CJS install. `pnpm release` remains the explicit publish command.

## Risks / Trade-offs

- Threading bounds through pure helpers touches many call sites. Mitigation: one limits object and tests for every ingress.
- Four-decimal scale changes JSON viewport text for new zooms. Mitigation: document format stays 1.3.0; x and y stay two decimals; old fixtures are not regenerated.
- Adaptive grid can change the default appearance if it runs for the legacy range. Mitigation: leave the default range on the current pattern.
- Very small hit geometry can miss clicks. Mitigation: keep screen-pixel minimums for ports, resize handles, and edge hits.

## Migration Plan

Consumers who want the wide range pass the four options. Consumers who do not pass them stay on 1.4 limits. Rollback is a package pin back to 1.4.0; saved documents do not need migration.

## Open Questions

None for this release. Containment storage (`data.parentId` versus a future document field) stays deferred.
