## MODIFIED Requirements

### Requirement: flowchart serialization moves to document format 1.3.0

`FLOWCHART_DOCUMENT_VERSION` SHALL be `'1.3.0'` and `toJSON()` SHALL write it.
Every 1.x document up to 1.3.0 (unversioned, numeric, shortened, 1.1, 1.2.x)
SHALL load; later versions SHALL be rejected before any state changes.

#### Scenario: serialized documents carry version 1.3.0

- **Given** any editor
- **When** `toJSON()` is called
- **Then** `version` MUST be exactly `'1.3.0'` and nodes MUST carry `collapsed` only when collapsed

## ADDED Requirements

### Requirement: Connection labels are editable from the keyboard

#### Scenario: Label a connection without a mouse

- **Given** a selected node with an outgoing connection on its right side
- **When** the user presses Shift+ArrowRight, types a label, and presses Enter
- **Then** that connection MUST be selected, its label MUST equal the typed text, and one undo MUST restore the previous label

### Requirement: Dragged nodes snap to alignment guides

#### Scenario: Near-aligned drag

- **Given** `snapGuides` is enabled and another visible node
- **When** a node is dragged to within 6 screen pixels of that node's left edge, centre, or right edge
- **Then** the dragged node MUST snap to the line and a guide MUST be drawn, unless Alt is held

### Requirement: Minimap pans the view

#### Scenario: Click on the minimap

- **Given** `minimap` is enabled
- **When** the user clicks a point on the minimap
- **Then** the viewport MUST centre on the corresponding world position without changing the document

### Requirement: Several nodes can be selected and edited together

#### Scenario: Marquee then group move

- **Given** three nodes
- **When** the user Shift+drags a marquee around two of them and drags one of the two
- **Then** both MUST move by the same offset, the third MUST stay, and one undo MUST restore both

#### Scenario: Selection event stays compatible

- **Given** a consumer reading `select` payloads
- **When** several nodes are selected
- **Then** `selection` MUST keep its single-item shape and `nodeIds` MUST list every selected node

### Requirement: Branches can be collapsed and saved

#### Scenario: Collapse hides descendants

- **Given** a node with a child that has its own child
- **When** the node is collapsed
- **Then** both descendants and their connections MUST NOT render, the node MUST show a "+2" badge, and `toJSON()` MUST include `collapsed: true` on that node only

#### Scenario: Shared child stays visible

- **Given** a child connected from a collapsed node and from an expanded node
- **When** rendering
- **Then** the child MUST remain visible

#### Scenario: Backward compatibility of the 1.3.0 format

- **Given** an unversioned, 1.1, or 1.2.0 document
- **When** it is loaded by 1.4.0
- **Then** it MUST load with every node expanded, and `toJSON()` MUST write version 1.3.0 with no `collapsed` keys

#### Scenario: Future documents still rejected

- **Given** a document with version 1.4.0
- **When** it is loaded
- **Then** loading MUST throw and the current document, selection, and history MUST be unchanged

### Requirement: Optional layout after insertion

#### Scenario: autoLayout on

- **Given** `autoLayout` is enabled with the tree layout
- **When** a sibling is inserted with Enter
- **Then** the layout MUST re-run with the new node directly after its anchor sibling, and one undo MUST remove the node and restore every previous position
