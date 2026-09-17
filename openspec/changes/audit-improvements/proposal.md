# Preserve editor state across Vue updates

## Why

The September 16 audit reproduced defects and identified avoidable integration and documentation costs.

## What changes

The core accepts option updates in place. The Vue data prop replaces the document without emitting a change echo; internal edits still emit change and remain undoable. Option changes retain nodes, edges, viewport, selection and history.

## Impact

Initial defect fixes preserve existing imports and need no migration from the Vue package. Additive APIs will be documented and require a minor release; release numbers are deferred until local QA is approved. No runtime dependencies are added.

## Non-goals

No remote writes, publication, deployment, new widget families, or replacement rendering engines. No edits to the old-line reference repositories.
