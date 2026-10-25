## ADDED Requirements

### Requirement: shipped artifact and engine-floor checks

`release:check` MUST run the local quality gates without publishing. CI MUST run those gates on Node 24 and MUST also install and test the built package on Node 20.19. A pack check MUST reject unexpected tarball paths and MUST install the tarball in temporary ESM and CJS consumers.

#### Scenario: release check does not publish

- **GIVEN** a maintainer runs `pnpm run release:check`
- **WHEN** the command finishes
- **THEN** it MUST NOT call `pnpm publish` and it MUST fail when strict OpenSpec or the pack consumer smoke fails

#### Scenario: Node 20.19 consumes the build

- **GIVEN** the package engines declare `node >=20.19.0`
- **WHEN** CI runs
- **THEN** a Node `20.19` job MUST install, build, and run the unit tests

## MODIFIED Requirements

### Requirement: package identity and exports contract

The package MUST be `@vanduo-oss/vd3-flowchart`, version `1.5.0`, MIT-licensed, ESM
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
- **THEN** `version` is `1.5.0` and `publishConfig.access` is `"public"`

### Requirement: toolchain baseline

The repo MUST pin `packageManager: "pnpm@10.28.2"` and engines
`pnpm >=10` and a consumer-friendly node floor (`node >=20.19.0`). The
development/CI toolchain node (24) is pinned by `packageManager` and
`.github/workflows/ci.yml`. It MUST define the scripts `build`, `clean`,
`lint`, `format`, `format:check`, `stylelint`, `test`, `test:types`,
`test:e2e`, `prepack`, `release:check`, and `release` (`pnpm run build && pnpm publish`).

#### Scenario: every defined script is green

- **GIVEN** a fresh clone with dependencies installed via `pnpm install`
- **WHEN** `pnpm lint`, `pnpm format:check`, `pnpm stylelint`, `pnpm test`,
  `pnpm build`, `pnpm run test:types`, and `pnpm run test:e2e` run
- **THEN** each exits with status 0

### Requirement: version constant equals package version

`VD_FLOWCHART_VERSION` MUST equal `package.json` `version` and MUST be `'1.5.0'`.
An automated test MUST assert that sync. There is no separate
`component-versions.json`.

#### Scenario: version constant matches the package

- **GIVEN** `src/core.js` and `package.json`
- **WHEN** `VD_FLOWCHART_VERSION` is compared against `package.json` `version`
- **THEN** both are exactly `'1.5.0'`

### Requirement: release-ready package documentation

The repo MUST ship `README.md`, `SKILL.md`, `CHANGELOG.md`, `CONTRIBUTING.md`,
and the MIT `LICENSE`. Published files MUST be `dist`, `README.md`,
`SKILL.md`, `CHANGELOG.md`, `LICENSE`, `recipes`, and `styles.d.ts`.
`CHANGELOG.md` MUST carry dated `## 1.4.0` and `## 1.5.0` entries. `SKILL.md` MUST carry
Agent Skills frontmatter.

#### Scenario: npm pack ships the docs and excludes internals

- **GIVEN** the `files` allow-list in `package.json`
- **WHEN** `pnpm pack` assembles the tarball
- **THEN** it contains `README.md`, `SKILL.md`, `CHANGELOG.md`, `LICENSE`,
  `recipes/`, `styles.d.ts`, `dist/`, and `package.json`, and never
  `openspec/`, `tests/`, `scripts/`, or `src/`
