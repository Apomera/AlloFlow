# Accessibility audit tooling

Use Node 22.12 or newer (CI uses Node 24). Install the locked dependencies and
the matching Chrome for Testing without running other package install scripts:

```sh
cd a11y-audit
npm ci --ignore-scripts --no-audit --no-fund
npx --no-install puppeteer browsers install chrome
npm run audit:runtime -- http://127.0.0.1:3000 --json
```

The browser is stored in Puppeteer's own cache and each scan uses a fresh profile.
To use an existing managed Chrome/Edge executable, set
`PUPPETEER_EXECUTABLE_PATH` to its absolute path. See Puppeteer's
[configuration documentation](https://pptr.dev/guides/configuration).
Browser download proxy support and ZIP extraction fallback dependencies are
installed explicitly so those features remain available after the upgrade.

The CLI and JSON report fields are unchanged. Reports default to
`a11y-audit/runtime-report.json`; `ALLOFLOW_AUDIT_REPORT` selects another output
file whose parent directory already exists. Static audit commands are unchanged.

## Browser boundaries

The Chromium sandbox is enabled by default. If an isolated CI/container runner
cannot support it, the operator can explicitly set `ALLOFLOW_AUDIT_NO_SANDBOX=1`
for that process. Use that exception only with trusted fixture pages. The normal
interactive audit command does not need the exception on supported systems.

Network requests must match the target's exact HTTP(S) origin, including its
port. Third-party requests stay blocked. Requests to exactly
`https://alloflow-cdn.pages.dev` can receive local JavaScript modules, preserving
the existing basename lookup order: `stem_lab`, repository root, then
`desktop/web-app/public`. Missing modules remain blocked instead of falling back
to a stale published copy. Lookalike domains, URL credentials, non-script files,
hidden files and symlink/junction escapes cannot use this substitution.

These rules keep scans deterministic and preserve the working-tree module
override used to audit local changes. They are a request filter, not a complete
network sandbox; run the auditor against pages you intend to inspect.

## Verification

From the repository root:

```sh
node --test dev-tools/security/test-a11y-tooling.cjs
node --test dev-tools/security/test-a11y-browser.cjs
npm audit --prefix a11y-audit --package-lock-only --ignore-scripts --audit-level=low
```

The tests cover URL/file boundaries, request failures, sandbox defaults, HTTP
proxy and FTP download compatibility, real browser module loading, positive and
negative accessibility controls, keyboard checks, JSON reports and failure
cleanup. They use synthetic data and loopback servers. CI uses its installed
Chrome and blocks all reported dependency advisory severities in this scope.

Puppeteer replaces the vulnerable `extract-zip` dependency. The scoped
`get-uri@8.0.1` override pins `basic-ftp` 6.2.3 to retain PAC-file download support
while fixing its directory-listing parser. Relevant upstream advisories:
[ZIP extraction](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) and
[FTP listing parsing](https://github.com/advisories/GHSA-c475-qrg2-pj4r).
