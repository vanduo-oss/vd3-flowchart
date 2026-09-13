# repo-scaffold Specification

## Purpose
Package metadata, single-entry build, CI gates, version pinning, and
publish surface for `@vanduo-oss/vd3-flowchart`.

## Requirements

### Requirement: package identity and exports contract

The package MUST be `@vanduo-oss/vd3-flowchart`, version `1.2.0`, MIT-licensed, ESM
(`type: "module"`), with `vue >=3.3.0` declared as a REQUIRED peer dependency
(no `peerDependenciesMeta` optionality). It MUST set
`publishConfig: { "access": "public" }`. The `exports` map SHALL declare `.`
(types / import / require under `dist/index.*`), `./css`
(`dist/vd3-flowchart.css`), and `./package.json`. It MUST also set `main`,
`module`, and `types` on the root. `sideEffects` MUST be `["**/*.css"]`.

#### Scenario: root export resolves wrappers and core

- **GIVEN** the `package.json`
- **WHEN** a consumer resolves `@vanduo-oss/vd3-flowchart`
- **THEN** the exports map routes `types` to `./dist/index.d.ts`, `import` to
  `./dist/index.js`, and `require` to `./dist/index.cjs`

#### Scenario: css subpath resolves the stylesheet

- **GIVEN** the `package.json` exports map
- **WHEN** a consumer resolves `@vanduo-oss/vd3-flowchart/css`
- **THEN** it resolves to `./dist/vd3-flowchart.css`

#### Scenario: vue is a required peer

- **GIVEN** a consumer project without `vue` installed
- **WHEN** the consumer installs `@vanduo-oss/vd3-flowchart` with strict peer
  enforcement
- **THEN** the package manager reports the missing `vue >=3.3.0` peer instead
  of silently proceeding

#### Scenario: manifest is publishable

- **GIVEN** the release-ready `package.json`
- **WHEN** its publish-relevant fields are inspected
- **THEN** `version` is `1.2.0` and `publishConfig.access` is `"public"`

### Requirement: toolchain baseline

The repo MUST pin `packageManager: "pnpm@10.28.2"` and engines
`pnpm >=10` and a consumer-friendly node floor (`node >=20.19.0`). The
development/CI toolchain node (24) is pinned by `packageManager` and
`.github/workflows/ci.yml`. It MUST define the scripts `build`, `clean`,
`lint`, `format`, `format:check`, `stylelint`, `test`, `test:types`,
`test:e2e`, `prepack`, and `release` (`pnpm run build && pnpm publish`).

#### Scenario: every defined script is green

- **GIVEN** a fresh clone with dependencies installed via `pnpm install`
- **WHEN** `pnpm lint`, `pnpm format:check`, `pnpm stylelint`, `pnpm test`,
  `pnpm build`, `pnpm run test:types`, and `pnpm run test:e2e` run
- **THEN** each exits with status 0

### Requirement: hardened install policy

The `.npmrc` MUST set `ignore-scripts=true`, `minimum-release-age=1440`,
`trust-policy=no-downgrade`, `block-exotic-subdeps=true`, `save-exact=true`,
`strict-peer-dependencies=true`, `registry=https://registry.npmjs.org/`, and
`minimum-release-age-exclude[]=@vanduo-oss/*`. Build-script execution SHALL
be limited to `esbuild` and `@playwright/test` via `onlyBuiltDependencies`
in `pnpm-workspace.yaml`.

#### Scenario: hardened install succeeds

- **GIVEN** the committed `.npmrc` and `pnpm-workspace.yaml`
- **WHEN** a contributor runs `pnpm install`
- **THEN** the install succeeds, third-party lifecycle scripts do not run
  except for the allow-listed build dependencies, and packages younger than
  24 hours are rejected unless scoped `@vanduo-oss/*`

### Requirement: version constant equals package version

`VD_FLOWCHART_VERSION` MUST equal `package.json` `version` and MUST be `'1.2.0'`.
An automated test MUST assert that sync. There is no separate
`component-versions.json`.

#### Scenario: version constant matches the package

- **GIVEN** `src/core.js` and `package.json`
- **WHEN** `VD_FLOWCHART_VERSION` is compared against `package.json` `version`
- **THEN** both are exactly `'1.2.0'`

### Requirement: CI pipeline

The repo MUST provide `.github/workflows/ci.yml` with SHA-pinned actions,
least-privilege `permissions: contents: read`, pnpm 10.28.2, Node 24, and
`paths-ignore: "**/*.md"` on push and pull_request. Gates run: frozen
install, audit, lint, format:check, stylelint, test, **build**, `test:types`,
then Playwright Chromium. A `dependabot.yml` MUST keep the pinned actions
current (weekly, grouped, 2-day cooldown).

#### Scenario: CI runs the full gate sequence

- **GIVEN** a push or pull request to `main` that is not markdown-only
- **WHEN** the `ci` workflow runs
- **THEN** it executes install, audit, lint, format:check, stylelint, test,
  build, test:types, and the Playwright smoke, all with a read-only token

### Requirement: single-entry isolation build

`scripts/build.js` MUST reset `dist/` and emit `src/index.js` as **esm + cjs**
into `dist/index.js|index.cjs`, copy `index.d.ts`, `core.d.ts`, `vue.d.ts`,
and copy `src/styles.css` to `dist/vd3-flowchart.css`. Builds SHALL be bundled,
es2020, sourcemapped, unminified, `vue` external, no IIFE. The metafile
guard MUST fail if any input leaves `src/`, if `node_modules` is bundled, or
if anything but `vue` is externalized. Every `./dist/` path in `exports` MUST
exist on disk.

#### Scenario: vue is never bundled

- **GIVEN** the build output
- **WHEN** `dist/index.js` and `dist/index.cjs` are inspected
- **THEN** `vue` appears only as an import/require specifier

#### Scenario: out-of-scope input breaks the build

- **GIVEN** a hypothetical edit making `src/core.js` import a file outside `src/`
- **WHEN** `pnpm build` runs
- **THEN** the metafile verification reports the foreign input and the build
  exits non-zero

### Requirement: type-test harness

The repo MUST provide `tests/types/` with a strict `tsconfig.json` (noEmit,
`moduleResolution: "bundler"`) and a `tests/types/api.test-d.ts` that imports
`@vanduo-oss/vd3-flowchart` via package self-reference so the built declarations
are what compile. It MUST pin removed/absent members with `@ts-expect-error`.

#### Scenario: declaration drift fails the type gate

- **GIVEN** a runtime export whose hand-written declaration is missing or wrong
- **WHEN** `pnpm run test:types` runs
- **THEN** `tsc` exits non-zero pointing at the drift

### Requirement: Playwright smoke harness

The repo MUST provide a Playwright harness (`playwright.config.ts`, Chromium
only) whose `webServer` runs Python `http.server` rooted at the repo. The
suite SHALL load the built `dist/index.js` and assert real-browser mount,
seeded nodes/edges, `toJSON().version === '1.2.0'`, undo, and zero console
errors.

#### Scenario: harness serves the shipped artifacts

- **GIVEN** `pnpm build` output in `dist/` and `pnpm run test:e2e`
- **WHEN** a harness page loads
- **THEN** the import map resolves `vue`, the module scripts import
  `/dist/index.js` successfully, and the specs run against the same files
  consumers install

### Requirement: release-ready package documentation

The repo MUST ship `README.md`, `SKILL.md`, `CHANGELOG.md`, `CONTRIBUTING.md`,
and the MIT `LICENSE`. Published files MUST stay limited to `dist`, `README.md`,
`SKILL.md`, `CHANGELOG.md`, and `LICENSE`. `CHANGELOG.md` MUST carry a dated
`## 1.2.0` entry. `SKILL.md` MUST carry Agent Skills frontmatter.

#### Scenario: npm pack ships the docs and excludes internals

- **GIVEN** the `files` allow-list in `package.json`
- **WHEN** `pnpm pack` assembles the tarball
- **THEN** it contains `README.md`, `SKILL.md`, `CHANGELOG.md`, `LICENSE`,
  `dist/`, and `package.json` — and never `openspec/`, `tests/`, or `scripts/`

### Requirement: release-publish-configuration

`publishConfig.access` MUST be `"public"`. A `release` script MUST explicitly
run `build` before `pnpm publish` because `.npmrc` `ignore-scripts=true`
skips `prepack`.

#### Scenario: release always ships a built dist

- **GIVEN** `.npmrc` sets `ignore-scripts=true` and `dist/` is gitignored
- **WHEN** the maintainer runs `pnpm run release`
- **THEN** the full `build` runs before `pnpm publish`
