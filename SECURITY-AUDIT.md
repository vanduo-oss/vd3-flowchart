# Development audit exceptions

Reviewed again for the 1.5.0 release on 2026-10-25. The braces and uri-js
advisories below still have no patched install path, so the existing exceptions
remain. Owner: vanduo-oss. Review again at the next dependency update or
release and no later than 2026-12-31, or sooner if a patched path ships.

## braces — CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm

- Installed path: `stylelint > micromatch > braces@3.0.3`.
- Patched version: none at approval time.
- Scope: development tooling only. Published `@vanduo-oss/vd3-flowchart` has no
  runtime dependencies beyond the Vue peer.

CI uses:

```sh
pnpm audit --audit-level=moderate --ignore GHSA-vfj7-8cjw-p6xm
```

pnpm 10.28.2 does not enforce the former `auditConfig.ignoreCves` workspace
setting. The explicit CLI flag is the gate; an unfiltered audit still exposes
the approved advisory.

## uri-js — CVE-2026-93690 / CVE-2026-93751 / CVE-2026-103387

- Installed path: `eslint > ajv > uri-js@4.4.1`.
- Patched version: none reported by Snyk (`fixedIn: []`).
- Scope: eslint on repository-owned sources.

## Snyk organization policy

The `vanduo-oss-default` organization-specific policy contains exactly:

- `SNYK-JS-BRACES-19963945`
- `SNYK-JS-URIJS-19963961`
- `SNYK-JS-URIJS-19963963`
- `SNYK-JS-URIJS-20341609`

The policy has no automatic expiry and no unpatched-only condition. Review and
remove it manually by 2026-12-31, removing individual IDs earlier when patched
paths ship. Do not add fixable findings or MPL-2.0 license findings.

## Removal conditions

Remove each exception when a supported patched path is available and the
filtered audit plus the package CI gates stay green.
Do not copy exceptions to unrelated advisories.
