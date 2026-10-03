## ADDED Requirements

### Requirement: Connection handles do not overlap resize handles

The editor SHALL render one connection handle per side outside the node
boundary and SHALL NOT render side-midpoint resize handles.

#### Scenario: Selected node handles

- **Given** an editable editor with a selected rectangular node
- **When** the node is rendered
- **Then** exactly four corner resize handles MUST be drawn, every connection handle centre MUST lie outside the node bounds, and no connection hit circle MUST intersect a corner resize zone

#### Scenario: Hovering a handle

- **Given** a visible connection handle
- **When** the pointer hovers it
- **Then** its centre MUST NOT move

### Requirement: Clicking a connection handle adds a connected node

#### Scenario: Click without dragging

- **Given** an editable editor with a selected node
- **When** a connection handle is pressed and released without passing the drag threshold
- **Then** a new node MUST be added in that side's direction, connected from that port, selected, and opened for text editing, and one undo MUST remove both the node and the edge

### Requirement: Mind-map keyboard model

With `keyboardShortcuts: 'mindmap'` (default) and the canvas focused, the
editor SHALL support Tab to add a child, Enter to add a sibling, F2, Space or a
printable key to edit, arrow keys for spatial navigation, Alt+Arrow to nudge,
Cmd/Ctrl+D to duplicate, Escape to step back, and zoom keys.

#### Scenario: Rapid mind-map entry

- **Given** a selected root node
- **When** the user presses Tab, types a label, presses Enter, then Enter again
- **Then** a connected child MUST exist with the typed label, a second child of the same parent MUST be added below it, and each insertion MUST undo in one step

#### Scenario: Leaving the canvas

- **Given** the canvas is focused with a node selected
- **When** the user presses Shift+Tab, or Escape followed by Tab
- **Then** the editor MUST NOT prevent the browser's focus movement

#### Scenario: Basic mode

- **Given** `keyboardShortcuts: 'basic'`
- **When** Tab or a printable key is pressed with a node selected
- **Then** no node MUST be added and Enter MUST open the label editor

### Requirement: Document format unchanged

#### Scenario: Existing documents

- **Given** a saved 1.2.0 or legacy 1.x document
- **When** it is loaded by 1.4.0
- **Then** it MUST load unchanged and `toJSON()` MUST still write version 1.2.0
