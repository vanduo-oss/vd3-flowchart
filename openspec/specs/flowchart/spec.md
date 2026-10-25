# flowchart Specification

## Purpose
Flowchart editor with document format 1.3.0, Vue wrapper, keyboard editing,
and `--vd-bg-*`-themed chrome on the package root.

## Requirements

### Requirement: flowchart subpath exports the wrapper and core

The package entry SHALL export Vue `VdFlowchart` and SHALL re-export
`VdFlowchartCore`, `computeLayout`, `LAYOUT_MODES`, `FLOWCHART_NODE_TYPES`,
`FLOWCHART_PORTS`, `FLOWCHART_EDGE_MARKERS`, `FLOWCHART_EDGE_ROUTES`,
`FLOWCHART_KEYBOARD_SHORTCUTS`, and `VD_FLOWCHART_VERSION`. The entry MUST
use named exports only.

#### Scenario: wrapper and core are importable from one subpath

- **GIVEN** a Vue 3 project with `@vanduo-oss/vd3-flowchart` installed
- **WHEN** it imports `VdFlowchart`, `VdFlowchartCore`, and `computeLayout`
- **THEN** `VdFlowchart` is a mountable Vue component, `VdFlowchartCore` is
  constructible against a DOM element, and `computeLayout` is pure

#### Scenario: history API is present

- **GIVEN** a `VdFlowchartCore` instance created with `{ history: true }`
- **WHEN** a node is added and `undo()` then `redo()` are called
- **THEN** `canUndo()` and `canRedo()` report correctly and the document
  returns to the post-add state

### Requirement: flowchart serialization uses document format 1.3.0

`FLOWCHART_DOCUMENT_VERSION` SHALL be `'1.3.0'`. `toJSON()` SHALL write that
version and the `{ version, viewport, nodes, edges }` shape. `collapsed: true`
SHALL be written only on collapsed nodes. `VD_FLOWCHART_VERSION` MUST equal
`package.json` `version`.

#### Scenario: serialized documents carry version 1.3.0

- **GIVEN** any `VdFlowchartCore` instance
- **WHEN** `toJSON()` is called
- **THEN** `version` is exactly `'1.3.0'` and the document has `viewport`,
  `nodes`, and `edges`

#### Scenario: older 1.x documents load

- **GIVEN** an unversioned, numeric, shortened, 1.1, or 1.2.x document
- **WHEN** it is passed to `load()` or the constructor
- **THEN** nodes and edges keep their ids, positions, and connections, and
  re-serializing emits `version: '1.3.0'`

#### Scenario: an oversized document is truncated

- **GIVEN** a document with more than 10000 nodes or 10000 edges
- **WHEN** it is loaded
- **THEN** `load()` does not throw, excess entries are dropped, and the
  emitted version is still `'1.3.0'`

#### Scenario: an in-range document round-trips

- **GIVEN** a document within the node and edge caps
- **WHEN** it is loaded and `toJSON()` is called
- **THEN** every node and edge round-trips and `version` is `'1.3.0'`

### Requirement: future and malformed documents are rejected atomically

`load()` MUST reject malformed JSON and document versions newer than 1.3.0
before changing the active document, selection, or history.

#### Scenario: future version

- **GIVEN** an editor with existing work
- **WHEN** a document whose version is `1.4.0` is loaded
- **THEN** loading throws and the current document, selection, and history
  stay unchanged

### Requirement: flowchart vanilla layer is excised

The module MUST NOT export auto-init helpers or register a global flowchart
runtime. `destroy()` MUST remove the instance's window listeners.

#### Scenario: importing the module registers no globals

- **GIVEN** `window.VanduoFlowchart` is undefined
- **WHEN** `@vanduo-oss/vd3-flowchart` is imported
- **THEN** that global is still undefined and no editor has been created

#### Scenario: destroy removes the runtime window listeners

- **GIVEN** a constructed `VdFlowchartCore` instance
- **WHEN** `destroy()` is called
- **THEN** its window listeners are removed and the host element is restored

### Requirement: flowchart stylesheet ships as a css subpath

The stylesheet SHALL be published as `dist/vd3-flowchart.css` and resolved
through the `./css` export.

#### Scenario: stylesheet resolves through the exports map

- **GIVEN** a bundler that honors package `exports`
- **WHEN** the consumer imports `@vanduo-oss/vd3-flowchart/css`
- **THEN** it resolves to `dist/vd3-flowchart.css`

### Requirement: flowchart serialization test coverage

Vitest SHALL pin `toJSON()` shape, `version === '1.3.0'`,
`VD_FLOWCHART_VERSION === package.json version`, and a frozen 1.1 fixture.

#### Scenario: toJSON emits document format 1.3.0

- **GIVEN** an editor with a node and an edge
- **WHEN** `toJSON()` is called
- **THEN** `version` is `'1.3.0'` and mutating the result does not change
  editor state

#### Scenario: frozen 1.1 document loads

- **GIVEN** `flowchart-doc-1.1.json`
- **WHEN** it is passed to `load()`
- **THEN** its nodes and edges survive and `toJSON()` emits `'1.3.0'`

### Requirement: flowchart history test coverage

Vitest SHALL cover undo, redo, disabled history, history limits, and
`clearHistory()`. A Vue mount spec MUST cover `change`, `ready`, and destroy.

#### Scenario: undo and redo round trip

- **GIVEN** an editor with one committed node addition
- **WHEN** `undo()` then `redo()` are called
- **THEN** the node disappears and returns, and the document matches the
  pre-undo JSON after redo

#### Scenario: wrapper forwards change events

- **GIVEN** a mounted `VdFlowchart` with an `@change` listener
- **WHEN** the exposed editor adds a node
- **THEN** the Vue `change` event fires, and unmount removes window listeners

### Requirement: flowchart chrome follows vd bg tokens

Panels, nodes, handles, and inspector chrome MUST theme through
`--vd-bg-primary`, `--vd-bg-secondary`, and related `--vd-*` tokens via
`--vd-flowchart-*` locals. Chrome fills MUST NOT use fixed cream or white hexes.

#### Scenario: panel and node fills read bg tokens

- **GIVEN** `src/styles.css`
- **WHEN** the flowchart surface, panel, and node-fill locals are inspected
- **THEN** each resolves through `var(--vd-bg-primary, …)` or
  `var(--vd-bg-secondary, …)`

#### Scenario: dark theme stays coherent without JS

- **GIVEN** a mounted flowchart under `[data-theme="dark"]`
- **WHEN** panel and node chrome are inspected
- **THEN** their backgrounds follow the dark `--vd-bg-*` values

### Requirement: connection handles sit outside the node

The editor SHALL draw one connection handle per side outside the node and
SHALL NOT draw side-midpoint resize handles. Hovering a handle MUST NOT move
its centre.

#### Scenario: selected rectangular node

- **GIVEN** an editable selected rectangular node
- **WHEN** it is rendered
- **THEN** four corner resize handles are drawn and every connection-handle
  centre lies outside the node bounds

### Requirement: clicking a connection handle adds a node

A click that does not pass the drag threshold SHALL add a connected node,
select it, and open its label. One undo SHALL remove the node and edge.

#### Scenario: click without dragging

- **GIVEN** an editable selected node
- **WHEN** a connection handle is clicked without dragging
- **THEN** a connected node is added in that direction and opened for editing

### Requirement: mind-map keyboard model

The default `keyboardShortcuts: 'mindmap'` SHALL add a child on Tab, a sibling
on Enter, edit on F2, Space, or typing, navigate spatially, and leave focus
on Shift+Tab. `basic` SHALL keep Tab for focus movement.

#### Scenario: leaving the canvas

- **GIVEN** the canvas is focused with a node selected
- **WHEN** the user presses Shift+Tab
- **THEN** the editor does not prevent the browser's focus movement

#### Scenario: basic mode

- **GIVEN** `keyboardShortcuts: 'basic'`
- **WHEN** Tab is pressed with a node selected
- **THEN** no node is added

### Requirement: connection labels are editable from the keyboard

The editor SHALL select a node's connection with Shift+Arrow and edit its
label from the keyboard.

#### Scenario: label a connection without a mouse

- **GIVEN** a selected node with a connection on its right
- **WHEN** the user presses Shift+ArrowRight, types, and presses Enter
- **THEN** that connection's label equals the typed text

### Requirement: dragged nodes snap to alignment guides

With the default snap guides, a dragged node SHALL snap to a nearby edge or
centre and show a guide. Alt SHALL bypass that snap.

#### Scenario: near-aligned drag

- **GIVEN** snap guides are enabled
- **WHEN** a node is dragged within 6 screen pixels of another node's edge
- **THEN** it snaps to that line unless Alt is held

### Requirement: minimap pans the view

The default minimap SHALL pan the viewport when clicked and MUST hide below
480px of canvas width. It MUST be pointer-only and `aria-hidden`.

#### Scenario: click on the minimap

- **GIVEN** the minimap is enabled
- **WHEN** the user clicks a point on it
- **THEN** the viewport centres on that world point and nodes stay unchanged

### Requirement: several nodes can be selected together

Shift+click, Shift+drag, and Cmd/Ctrl+A SHALL select several nodes. The group
SHALL move as one undo step. `select` SHALL keep one primary `selection` and
list every id in `nodeIds`.

#### Scenario: group move

- **GIVEN** two selected nodes and one unselected node
- **WHEN** one selected node is dragged
- **THEN** both selected nodes move by the same offset and one undo restores
  both

### Requirement: branches can be collapsed

Collapsing a node SHALL hide descendants that are not reachable through an
expanded path, show a count badge, and persist `collapsed: true` on that node
only.

#### Scenario: collapse hides descendants

- **GIVEN** a node with a child that has its own child
- **WHEN** the node is collapsed
- **THEN** both descendants do not render and `toJSON()` sets `collapsed`
  only on that node

### Requirement: optional layout after insertion

`autoLayout: true` SHALL re-run the current tree or radial layout after a
keyboard or handle insertion, in the same undo step. The default is false.

#### Scenario: autoLayout on

- **GIVEN** auto layout and the tree layout are enabled
- **WHEN** a sibling is inserted
- **THEN** layout runs again and one undo removes the node and restores the
  previous positions

### Requirement: editor options update in place

Ordinary option changes SHALL keep the live editor, camera, valid selection,
and applicable history. Echoing the last emitted document MUST NOT loop.
`updateOptions` SHALL accept `minScale`, `maxScale`, `minNodeSize`, and
`maxNodeSize`. A camera-bound change SHALL clamp the current scale once
without clearing selection or history. A node-bound change MUST NOT resize
existing nodes.

#### Scenario: read-only toggle after edits

- **GIVEN** an editor with local node edits
- **WHEN** read-only or grid options change
- **THEN** those edits remain

#### Scenario: narrowing the camera clamps once

- **GIVEN** a wide camera at scale `10`
- **WHEN** `updateOptions` sets `maxScale` to `3` and a valid `minScale`
- **THEN** the scale MUST become `3`, the selection MUST remain, and history
  MUST remain

### Requirement: drag updates incident geometry only

During a node drag the editor SHALL translate that node and rebuild only its
incident edges. Pointer-up SHALL refresh inspector state and history.

#### Scenario: disconnected node stays intact

- **GIVEN** a connected node and a disconnected node
- **WHEN** the connected node is dragged
- **THEN** the disconnected node's SVG element stays intact

### Requirement: graph outline refuses self-connection

Graph outline controls SHALL be labelled and MUST NOT connect a node to itself.

#### Scenario: same source and target

- **GIVEN** Graph outline is open with one node as source and target
- **WHEN** Connect is invoked
- **THEN** no edge is added

### Requirement: flowchart real-browser smoke coverage

Playwright SHALL mount the built `dist/index.js`, assert
`VD_FLOWCHART_VERSION` equals the package version, assert
`toJSON().version` is `'1.3.0'`, undo a committed add, and log zero console
errors.

#### Scenario: built flowchart entry mounts in a real browser

- **GIVEN** `pnpm build` has produced `dist/index.js`
- **WHEN** the Playwright flowchart spec loads the harness
- **THEN** the shell is present, seeded nodes render, undo works, and the
  page logs zero console errors

### Requirement: camera bounds are opt-in

The editor SHALL default `minScale` to `0.35` and `maxScale` to `3`. A finite
pair with `0 < minScale < maxScale` SHALL replace that default. Any other pair
SHALL fall back to the whole default pair. Every camera ingress SHALL clamp
to the active pair.

#### Scenario: omitted options keep the legacy camera

- **GIVEN** an editor constructed without scale options
- **WHEN** the user zooms out and a document with scale `0.05` is loaded
- **THEN** the scale MUST NOT go below `0.35` or above `3`

#### Scenario: a host opts into a wide camera

- **GIVEN** `minScale` `0.05` and `maxScale` `20`
- **WHEN** the user zooms with the wheel, toolbar, `zoomTo`, `setViewport`,
  `fitView`, or `resetView`
- **THEN** scale `0.05` and scale `20` MUST be reachable and MUST NOT be
  clamped to `0.35` or `3`

#### Scenario: an invalid scale pair falls back

- **GIVEN** `minScale` `20` and `maxScale` `0.05`
- **WHEN** the editor is constructed
- **THEN** the active camera bounds MUST be `0.35` and `3`

#### Scenario: undo keeps a legal wide scale

- **GIVEN** a wide camera whose current scale is `0.05`
- **WHEN** a node edit is undone
- **THEN** the scale MUST remain `0.05`

### Requirement: viewport scale uses four decimal places

The editor SHALL round `viewport.scale` to four decimal places. Positions and
sizes SHALL stay rounded to two decimal places. A 1.12 zoom step at `0.05`
MUST change the stored scale.

#### Scenario: low-scale step

- **GIVEN** a wide camera at scale `0.05`
- **WHEN** the user zooms in by the toolbar factor
- **THEN** the stored scale MUST be greater than `0.05` and MUST keep four
  decimal places

### Requirement: node size bounds are opt-in

Resizable nodes SHALL default to `56` through `420`. A finite pair with
`0 < minNodeSize < maxNodeSize` SHALL replace that default. Junctions MUST
stay their fixed size. Existing nodes MUST NOT be resized when the bounds
change later.

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

A node smaller than its default size SHALL scale its text, wrapping, radius,
stroke, connected markers, curve arms, orthogonal routing, edge labels, and
inline editors by that reduction. Nodes at or above the default size MUST NOT
grow their chrome. Edge scale SHALL follow the smaller endpoint.

#### Scenario: micro-node arrow and label

- **GIVEN** two 6-by-6 rectangles connected by an arrow with a label
- **WHEN** the edge is rendered
- **THEN** the arrowhead, stroke, curve arms, and label MUST be smaller than
  the same edge between default-size nodes
- **AND** the node text MUST wrap against the node's unscaled equivalent width

#### Scenario: a large node does not enlarge its marker

- **GIVEN** a node larger than its default size
- **WHEN** its outgoing arrow is rendered
- **THEN** the marker MUST NOT exceed the default-size marker

### Requirement: wide cameras keep a readable grid

The default camera bounds SHALL keep the 12,000-unit grid and the configured
grid size. Wider camera bounds SHALL use a grid of at least 240,000 world
units and a pattern whose screen spacing stays readable at scale `0.05` and
scale `20`.

#### Scenario: default grid is unchanged

- **GIVEN** the default camera bounds and `gridSize` `24`
- **WHEN** the grid is rendered at scale `1`
- **THEN** the grid rectangle MUST be 12,000 units on each side and the
  pattern MUST be `24`

#### Scenario: wide grid covers a deep zoom

- **GIVEN** camera bounds `0.05` and `20`
- **WHEN** the scale is `0.05` and then `20`
- **THEN** the grid MUST cover at least 240,000 world units and its lines
  MUST have a non-zero screen size at both scales

### Requirement: fitNode frames one node

`fitNode(nodeId, padding = 48)` SHALL centre a visible node and choose a
scale that fits it inside the canvas minus `padding` screen pixels, clamped
to the active camera bounds. An unknown or hidden node MUST be a chainable
no-op. The call MUST render once and emit viewport reason `viewport:fit-node`.

#### Scenario: frame a visible node

- **GIVEN** a visible node and a measurable canvas
- **WHEN** `fitNode` is called with padding `48`
- **THEN** the node's centre MUST be at the view centre and the node MUST fit
  within the padding

#### Scenario: hidden node does nothing

- **GIVEN** a node hidden by a collapsed branch
- **WHEN** `fitNode` is called for it
- **THEN** the viewport MUST stay unchanged and the method MUST return the
  editor

### Requirement: document format stays 1.3.0

This change MUST NOT change `FLOWCHART_DOCUMENT_VERSION`. Scale and node size
MUST remain plain numbers. A 1.1, 1.2, or 1.3 document MUST round-trip to
version `1.3.0`.

#### Scenario: old fixture stays on 1.3.0

- **GIVEN** the frozen `flowchart-doc-1.1.json` fixture
- **WHEN** it is loaded by 1.5.0 and serialized
- **THEN** `version` MUST be `'1.3.0'` and no package version MUST be written
  into the document
