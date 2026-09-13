# Design

Flatten `vd3-cbun/src/flowchart/*` to `src/`. Single-entry build with isolation
guard (all inputs under `src/`, only `vue` external). Keep
`VD_FLOWCHART_VERSION` at `1.2.0`. Add Chromium Playwright smoke against the
built entry.
