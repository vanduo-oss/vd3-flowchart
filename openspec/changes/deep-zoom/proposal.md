# Proposal

## Why

Diagram editors need a bird's-eye view and a close view of small nodes, but the published camera stops at 35%–300% and resizable nodes stop at 56–420. Hosts such as Oolaflow currently patch private editor methods to go further. Those limits should be a public, opt-in package API so every consumer can use them without depending on internals.

## What Changes

- Add `minScale` and `maxScale`. Defaults stay `0.35` and `3`. A host may opt into `0.05` and `20`.
- Add `minNodeSize` and `maxNodeSize`. Defaults stay `56` and `420`. A host may opt into `6` and `4800`. Junctions stay fixed-size.
- Store viewport scale to four decimal places. Other geometry stays at two decimal places.
- Keep arrowheads, curves, orthogonal routes, labels, node text, and editors proportional on nodes smaller than their default size.
- Grow and retile the grid when a host configures a wider camera range, while the default range keeps today's grid.
- Add `fitNode(nodeId, padding?)` on the core and Vue wrapper.
- Move `package.json` and `VD_FLOWCHART_VERSION` together from `1.4.0` to `1.5.0`.

No methods are removed. Existing callers that omit the new options keep 1.4 behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `flowchart`: Opt-in camera and node bounds, four-decimal scale, proportional micro-node rendering, adaptive grid, and `fitNode`, with document format `1.3.0` unchanged.
- `repo-scaffold`: Package version `1.5.0`, a non-publishing `release:check`, Node 20.19 plus Node 24 CI, and a packed-tarball consumer smoke.

## Impact

Core, Vue props, hand-written declarations, stylesheet metrics, unit tests, Playwright, README, SKILL, recipe, changelog, and CI. No new runtime dependency. `FLOWCHART_DOCUMENT_VERSION` stays `1.3.0`. Older 1.x documents still load. A 1.5.0 document still loads in 1.4.0, where the old clamps apply.

## Non-goals

Unbounded zoom, a second renderer, animated zoom, and breadcrumb drill-in. No `parentId`, nested layout, container headers, grouped descendant drag, ghost overlays, history batching, floating toolbar or palette, or export API. Oolaflow continues to own containment, suggestions, floating chrome, and thumbnails until those have their own package APIs. No publication from this change's implementation tasks; publication stays a separate maintainer step.
