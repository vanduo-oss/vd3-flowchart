## 1. Camera and node bounds

- [x] 1.1 Add pair normalization and instance bounds in `src/core.js`
- [x] 1.2 Thread bounds through load, history, zoom, fit, resize, paste, and insertion
- [x] 1.3 Round only viewport scale to four decimals
- [x] 1.4 Implement `fitNode` and `updateOptions` bound changes
- [x] 1.5 Declare the options and method in `src/core.d.ts`, `src/vue.js`, and `src/vue.d.ts`

## 2. Deep-scale rendering

- [x] 2.1 Scale node text, radius, stroke, markers, routes, labels, hits, and editors below default size
- [x] 2.2 Use the 240,000-unit adaptive grid only when camera bounds are wider than the default
- [x] 2.3 Keep default-size and default-bounds rendering unchanged

## 3. Verification and release metadata

- [x] 3.1 Add unit, Vue, type, serialization, and Playwright coverage for the new contract
- [x] 3.2 Add `release:check`, Node 20.19 CI, strict OpenSpec, and tarball ESM/CJS smoke
- [x] 3.3 Move `package.json` and `VD_FLOWCHART_VERSION` to `1.5.0` together
- [x] 3.4 Update README, SKILL, recipe, changelog, and `openspec/config.yaml`
- [x] 3.5 Run `pnpm test` and `pnpm build`; confirm the build metafile still isolates `src/` and externalizes only Vue
- [x] 3.6 Sync this delta into the main specs after the behavior lands

## 4. Downstream

- [ ] 4.1 After npm `latest` verification, update vd3-docs to the registry artifact and deploy
- [ ] 4.2 Pin oolaflow to the registry artifact and remove the superseded zoom patches
