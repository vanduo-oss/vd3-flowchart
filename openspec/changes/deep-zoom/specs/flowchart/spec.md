## ADDED Requirements

### Requirement: camera bounds are opt-in

The editor SHALL default `minScale` to `0.35` and `maxScale` to `3`. A finite pair with `0 < minScale < maxScale` SHALL replace that default. Any other pair SHALL fall back to the whole default pair. Every camera ingress SHALL clamp to the active pair.

#### Scenario: omitted options keep the legacy camera

- **GIVEN** an editor constructed without scale options
- **WHEN** the user zooms out and a document with scale `0.05` is loaded
- **THEN** the scale MUST NOT go below `0.35` or above `3`

#### Scenario: a host opts into a wide camera

- **GIVEN** `minScale` `0.05` and `maxScale` `20`
- **WHEN** the user zooms with the wheel, toolbar, `zoomTo`, `setViewport`, `fitView`, or `resetView`
- **THEN** scale `0.05` and scale `20` MUST be reachable and MUST NOT be clamped to `0.35` or `3`

#### Scenario: an invalid scale pair falls back

- **GIVEN** `minScale` `20` and `maxScale` `0.05`
- **WHEN** the editor is constructed
- **THEN** the active camera bounds MUST be `0.35` and `3`

#### Scenario: undo keeps a legal wide scale

- **GIVEN** a wide camera whose current scale is `0.05`
- **WHEN** a node edit is undone
- **THEN** the scale MUST remain `0.05`

### Requirement: viewport scale uses four decimal places

The editor SHALL round `viewport.scale` to four decimal places. Positions and sizes SHALL stay rounded to two decimal places. A 1.12 zoom step at `0.05` MUST change the stored scale.

#### Scenario: low-scale step

- **GIVEN** a wide camera at scale `0.05`
- **WHEN** the user zooms in by the toolbar factor
- **THEN** the stored scale MUST be greater than `0.05` and MUST keep four decimal places

### Requirement: node size bounds are opt-in

Resizable nodes SHALL default to `56` through `420`. A finite pair with `0 < minNodeSize < maxNodeSize` SHALL replace that default. Junctions MUST stay their fixed size. Existing nodes MUST NOT be resized when the bounds change later.

#### Scenario: omitted options keep the legacy node size

- **GIVEN** an editor without node-size options
- **WHEN** a resizable node is created or resized below `56` or above `420`
- **THEN** its sides MUST stay inside `56` through `420`

#### Scenario: a host opts into micro and large nodes

- **GIVEN** `minNodeSize` `6` and `maxNodeSize` `4800`
- **WHEN** a rectangle is resized to `6` and another to `4800`
- **THEN** those sizes MUST be kept on add, update, paste, and load

#### Scenario: junctions ignore the wide size bounds

- **GIVEN** wide node bounds
- **WHEN** a junction is added or updated
- **THEN** its width and height MUST remain `28`

### Requirement: small nodes render in proportion

A node smaller than its default size SHALL scale its text, wrapping, radius, stroke, connected markers, curve arms, orthogonal routing, edge labels, and inline editors by that reduction. Nodes at or above the default size MUST NOT grow their chrome. Edge scale SHALL follow the smaller endpoint.

#### Scenario: micro-node arrow and label

- **GIVEN** two 6-by-6 rectangles connected by an arrow with a label
- **WHEN** the edge is rendered
- **THEN** the arrowhead, stroke, curve arms, and label MUST be smaller than the same edge between default-size nodes
- **AND** the node text MUST wrap against the node's unscaled equivalent width

#### Scenario: a large node does not enlarge its marker

- **GIVEN** a node larger than its default size
- **WHEN** its outgoing arrow is rendered
- **THEN** the marker MUST NOT exceed the default-size marker

### Requirement: wide cameras keep a readable grid

The default camera bounds SHALL keep the 12,000-unit grid and the configured grid size. Wider camera bounds SHALL use a grid of at least 240,000 world units and a pattern whose screen spacing stays readable at scale `0.05` and scale `20`.

#### Scenario: default grid is unchanged

- **GIVEN** the default camera bounds and `gridSize` `24`
- **WHEN** the grid is rendered at scale `1`
- **THEN** the grid rectangle MUST be 12,000 units on each side and the pattern MUST be `24`

#### Scenario: wide grid covers a deep zoom

- **GIVEN** camera bounds `0.05` and `20`
- **WHEN** the scale is `0.05` and then `20`
- **THEN** the grid MUST cover at least 240,000 world units and its lines MUST have a non-zero screen size at both scales

### Requirement: fitNode frames one node

`fitNode(nodeId, padding = 48)` SHALL centre a visible node and choose a scale that fits it inside the canvas minus `padding` screen pixels, clamped to the active camera bounds. An unknown or hidden node MUST be a chainable no-op. The call MUST render once and emit viewport reason `viewport:fit-node`.

#### Scenario: frame a visible node

- **GIVEN** a visible node and a measurable canvas
- **WHEN** `fitNode` is called with padding `48`
- **THEN** the node's centre MUST be at the view centre and the node MUST fit within the padding

#### Scenario: hidden node does nothing

- **GIVEN** a node hidden by a collapsed branch
- **WHEN** `fitNode` is called for it
- **THEN** the viewport MUST stay unchanged and the method MUST return the editor

### Requirement: document format stays 1.3.0

This change MUST NOT change `FLOWCHART_DOCUMENT_VERSION`. Scale and node size MUST remain plain numbers. A 1.1, 1.2, or 1.3 document MUST round-trip to version `1.3.0`.

#### Scenario: old fixture stays on 1.3.0

- **GIVEN** the frozen `flowchart-doc-1.1.json` fixture
- **WHEN** it is loaded by 1.5.0 and serialized
- **THEN** `version` MUST be `'1.3.0'` and no package version MUST be written into the document

## MODIFIED Requirements

### Requirement: editor options update in place

Ordinary option changes SHALL keep the live editor, camera, valid selection, and applicable history. Echoing the last emitted document MUST NOT loop. `updateOptions` SHALL accept `minScale`, `maxScale`, `minNodeSize`, and `maxNodeSize`. A camera-bound change SHALL clamp the current scale once without clearing selection or history. A node-bound change MUST NOT resize existing nodes.

#### Scenario: read-only toggle after edits

- **GIVEN** an editor with local node edits
- **WHEN** read-only or grid options change
- **THEN** those edits remain

#### Scenario: narrowing the camera clamps once

- **GIVEN** a wide camera at scale `10`
- **WHEN** `updateOptions` sets `maxScale` to `3` and a valid `minScale`
- **THEN** the scale MUST become `3`, the selection MUST remain, and history MUST remain
