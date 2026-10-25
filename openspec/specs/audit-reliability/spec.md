# audit-reliability Specification

## Purpose
Reliability behavior accepted from the flowchart audit: in-place option
updates, an independent document version, bounded drag rendering, and a
Graph outline that cannot connect a node to itself.

## Requirements

### Requirement: reviewed improvements preserve supported integrations

The package SHALL implement the accepted audit changes without discarding
user state or breaking documented imports.

#### Scenario: existing consumer updates

- **GIVEN** a consumer using the documented package imports
- **WHEN** the audited interactions and updates are exercised
- **THEN** the behavior meets the audit acceptance criteria and has
  regression coverage

### Requirement: editor options update in place

Ordinary option changes SHALL keep the live editor, camera, valid selection,
and applicable history.

#### Scenario: read-only or grid toggle after edits

- **GIVEN** an editor with local node edits
- **WHEN** read-only or grid options change, or a parent echoes the last
  emitted document
- **THEN** those edits remain, parent echoes do not loop, and history
  disable or reenable follows the documented seed rules

### Requirement: saved documents use an independent format version

`FLOWCHART_DOCUMENT_VERSION` SHALL own the saved `version` field.
`VD_FLOWCHART_VERSION` SHALL track the package release.

#### Scenario: malformed or future documents are rejected atomically

- **GIVEN** malformed JSON or an unsupported future version
- **WHEN** the document is loaded
- **THEN** the active document, selection, and history stay unchanged and
  the error is visible to the caller

### Requirement: drag updates only the moved node and incident edges

During a node drag the editor SHALL translate the dragged node SVG and
rebuild only incident edges. Pointer-up SHALL refresh the inspector and
history.

#### Scenario: connected and disconnected nodes during drag

- **GIVEN** a connected node and a disconnected node
- **WHEN** the connected node is dragged
- **THEN** unrelated SVG nodes stay intact, incident paths update, and undo
  restores the previous position

### Requirement: graph outline refuses self-connection

Native Graph outline controls SHALL be labelled and MUST NOT connect a node
to itself.

#### Scenario: matching source and target disable connect

- **GIVEN** Graph outline is open with the same node selected as source and
  target
- **WHEN** Connect is invoked
- **THEN** no edge is added and the control is disabled
