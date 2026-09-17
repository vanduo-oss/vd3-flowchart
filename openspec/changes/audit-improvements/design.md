# Design

The core accepts option updates in place. The Vue data prop replaces the document without emitting a change echo; internal edits still emit change and remain undoable. Option changes retain nodes, edges, viewport, selection and history.

Preserve public imports and existing explicit core calls. Extend current components and engines. Browser access remains behind client lifecycle hooks. This work fixes the current Vue implementation; it is not a new port from framework/js.

Complete focused regression tests before broader package gates. Validate built output as well as source. Synchronize user-facing examples with public declarations. Record manual gaps honestly in the QA log.

## Document format (A15)

Keep the existing serialized `version: "1.2.0"` shape, backed by a new
`FLOWCHART_DOCUMENT_VERSION` constant independent of package releases. Accept
unversioned partial input and numeric 1.x versions through 1.2.0. Normalize
known legacy fields using the existing conversion. Reject malformed or future
versions before changing the editor, selection or history. The JSON panel
reports the error inline. This is an additive API and a deliberate correction
to invalid-input behavior; callers of `load()` should catch validation errors.
