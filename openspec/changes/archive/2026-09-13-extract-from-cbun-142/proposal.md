# Extract flowchart from vd3-cbun 1.4.2

## Why

Flowchart will continue to evolve as a standalone package. `@vanduo-oss/vd3-cbun`
is read-only going forward. Recreate the flowchart component 1-to-1 as
`@vanduo-oss/vd3-flowchart@1.2.0`.

## What Changes

- New standalone repo with JS core + Vue wrapper, hand-written `.d.ts`,
  esbuild esm+cjs, and `./css`.
- `VD_FLOWCHART_VERSION` stays `1.2.0` (load-bearing serialization) and equals
  `package.json` version.
- Full QA gates, plus a Playwright smoke cbun never shipped.

## Non-goals

- No API or serialization changes versus cbun flowchart 1.2.0.
- No SFC rewrite.
- No vd3-docs consumer switch in this change.
- Do not edit vd3-cbun.
