# AlloFlow trailer

Install the locked dependencies with `npm ci --ignore-scripts`, then run
`npm run security:prepare` to apply the reviewed local backport. Use `npm run dev`
for Remotion Studio, and `npm run build` to bundle the trailer. `npm run lint`
checks the source and TypeScript types.

## Dependency security

The scoped `zod@4.5.4` override supplies Zod 4.6.7 to the existing Remotion
4.0.538 dependency tree. This fixes
[excessive memory use while validating oversized constrained collections](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
without changing the React or Remotion versions. Remotion also embeds Zod 4.5.4
inside its CommonJS and ESM Studio protocol bundles, which npm overrides and
audits do not replace or inspect. `scripts/patch-studio-protocol.cjs` backports
Zod 4.6.7's leading array-size guard into those two bundles, verifying their
original SHA-256 hashes before making any changes. The backport is repeatable
and refuses unknown package versions or modified bundles. Normal installation,
`npm run dev` and `npm run build` apply it automatically. For direct CLI/API use
after an installation with scripts disabled, run `npm run security:prepare`
first. CI performs this explicit step as well.

When upgrading Remotion, review whether both upstream bundles have the fix,
then remove or refresh the backport, its hooks and hashes together. Bounds must still be declared
on schemas; the patch does not impose limits on unconstrained arrays.

After installing both web and trailer dependencies, run from the repository root:

```sh
node --test dev-tools/security/test-web-trailer-security.cjs
npm audit --prefix trailer --package-lock-only --ignore-scripts --audit-level=low
```

The regression checks cover ordinary schema transforms and error paths, early
rejection of oversized constrained collections, and Remotion Studio protocol
messages in both module formats. They exercise the embedded validators as well
as the installed Zod dependency. Keep these checks when updating or removing the override. CI also
bundles and type-checks the actual trailer.
