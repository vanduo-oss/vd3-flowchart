## ADDED Requirements

### Requirement: Reviewed improvements preserve supported integrations

The package SHALL implement the accepted audit changes without silently discarding user state or breaking documented imports.

#### Scenario: Existing consumer updates

- **Given** a consumer using the documented package imports
- **When** the audited interactions and updates are exercised
- **Then** the behavior MUST meet the item-specific acceptance criteria in the audit backlog and have regression coverage

### Requirement: Editor options update in place

Ordinary option changes SHALL keep the live editor, camera, selection where valid, and history where applicable.

#### Scenario: Read-only or grid toggle after edits

- **Given** an editor with local node edits
- **When** read-only or grid options change, or a parent echoes the last emitted document
- **Then** those edits MUST remain, parent echoes MUST NOT loop, and history disable/reenable MUST follow the documented seed rules

### Requirement: Saved documents use an independent format version

`FLOWCHART_DOCUMENT_VERSION` SHALL own the saved `version` field. `VD_FLOWCHART_VERSION` SHALL track the package release.

#### Scenario: Malformed or future documents are rejected atomically

- **Given** malformed JSON or an unsupported future version
- **When** the document is loaded
- **Then** the active document, selection, and history MUST be unchanged and the error MUST be visible to the caller or JSON panel

### Requirement: Drag updates only the moved node and incident edges

During `drag-node` pointer moves the editor SHALL translate the dragged node SVG and rebuild only incident edges. Pointer-up SHALL refresh inspector and history.

#### Scenario: Connected and disconnected nodes during drag

- **Given** a graph with a connected node and a disconnected node
- **When** the connected node is dragged
- **Then** unrelated SVG nodes MUST stay intact, incident edge paths MUST update, labels MUST remain, and undo MUST restore the previous position

### Requirement: Graph outline refuses self-connection

Native Graph outline controls SHALL be labelled and MUST NOT connect a node to itself.

#### Scenario: Matching source and target disable connect

- **Given** Graph outline open with the same node selected as source and target
- **When** Connect is invoked
- **Then** no edge MUST be added and the control MUST be disabled
