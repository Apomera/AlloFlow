# AlloSheet pilot

AlloSheet is an agent-assisted educator data workspace built around a
replaceable spreadsheet adapter. The first adapter targets
[Grist](https://github.com/gristlabs/grist-core), an Apache-2.0 relational
spreadsheet.

This is intentionally a pilot, not a claim of full Excel compatibility. Grist
uses typed columns and Python-based column formulas, so arbitrary Excel macros,
cell-by-cell formulas, charts, pivots, and formatting may not round-trip
losslessly.

## What the pilot includes

- An Educator Hub launcher and accessible companion window.
- A Grist editor view plus a semantic, screen-reader-friendly table mirror.
- A local audit for blanks, duplicates, and surrounding whitespace.
- An AI flow that defaults to structure-only context.
- Explicit row selection and consent before any cell values are sent to the
  configured AlloFlow AI provider.
- A JSON-only plan, field/record allowlisting, preview, selective apply, and
  one-step undo.
- A server-side Grist REST bridge. Grist credentials never enter browser code.
- A desktop-managed local Grist process for the default single-user experience.

The pilot permits record reads and reviewed updates only. It does not expose
row deletion, column deletion, schema mutation, arbitrary formulas, code
execution, or unrestricted Grist routes.

The same popup also has a bounded browser-local CSV workspace for Gemini Canvas.

## Default: local popup, no Docker

AlloSheet opens as an AlloFlow popup, like the other local educator tools.
Educators do not install Docker, enter a server address, or manage an API key
for the default workflow.

On first use, AlloFlow Desktop obtains the official
[Grist Desktop v0.3.13](https://github.com/gristlabs/grist-desktop/releases/tag/v0.3.13)
artifact for the current supported platform from an AlloFlow-controlled release
manifest. The initial managed-sidecar pin is the official Windows x64 ZIP:

- Artifact: `grist-desktop-0.3.13-win-x64.zip`
- SHA-256: `c85f49625cfd355b9c445a77bc5e4df6a8a6ea2e4c54597ccca3faa322a4b1cc`

Other packaged operating systems and architectures must receive their own
reviewed artifact entry before managed local mode is enabled on them.

It accepts only HTTPS release URLs, verifies the artifact against the manifest's
expected SHA-256 digest before installation, and refuses unverified or
unexpected downloads. The version remains pinned until an intentional AlloFlow
update changes that manifest.

The desktop runtime then:

1. Starts Grist on loopback only as an AlloFlow-managed child process.
2. Uses Grist's Pyodide sandbox and disables telemetry and automatic update
   checks.
3. Stores spreadsheet data in AlloFlow's per-user application-data directory.
4. Connects the AlloSheet popup through AlloFlow's same-origin broker, without
   placing credentials in the popup or URL.
5. Stops the child process when AlloFlow exits.

The first launch therefore needs network access only to obtain the pinned
artifact. Later launches use the verified local installation, and spreadsheet
data remains local unless an administrator deliberately configures a remote
server. Administrators may pre-provision the same verified artifact for offline
installations.

Loopback prevents access from other computers, but it is not a security boundary
against other software already running as the same local user. Managed local
mode is for a single-user workstation, not a shared or hostile host.

The desktop package deliberately does not assume that a Grist binary exists in
the repository. This keeps normal AlloFlow builds reproducible and prevents a
missing optional binary from breaking packaging. The first-use manager is the
default distribution path.

## Gemini Canvas: the same popup, browser-local workbook

When AlloFlow is running inside Gemini Canvas, the same AlloSheet launcher opens
the same accessible companion popup. Because Canvas cannot start or reach the
Desktop-only Grist sidecar, the popup switches automatically to a browser-local
CSV workspace after a validated handshake with its opener:

- Data stays in the popup's memory unless the educator explicitly downloads a
  reviewed CSV.
- Imports are limited to 2 MB, 200 rows, and 40 columns.
- Direct cell editing, the local accessibility audit, reviewed AI suggestions,
  apply, and one-step undo remain available.
- Selected values are sent for AI assistance only after an explicit consent
  step that identifies the connected host.

Canvas mode does not claim full Excel compatibility. Native `.xlsx` handling,
large workbooks, and the full Grist editor require AlloFlow Desktop or an
administrator-managed district service. Formula-like exported text is hardened
to prevent spreadsheet applications from executing it when the CSV is opened.

Educators still see one AlloSheet popup and one workflow; there is no Docker,
terminal, port, server-address, or second setup window in either mode.

### Windows import acceptance check

The upstream Grist Desktop documentation notes that some imports use symbolic
links and may require Windows Developer Mode, administrator privileges, or
equivalent symbolic-link permission. Test representative CSV/XLSX imports with
a standard, non-administrator school account before rollout. If the current
upstream build still encounters that limitation, surface a clear import
diagnostic; do not ask educators to run the whole application as administrator.

## Optional: district or server deployment

Docker is retained only as an optional deployment recipe for administrators who
need a persistent shared Grist server. See
[`docker/allosheet-grist/README.md`](../docker/allosheet-grist/README.md).

For a separately managed Grist installation, start AlloFlow Desktop with:

```text
ALLOFLOW_GRIST_URL=http://127.0.0.1:8484
ALLOFLOW_GRIST_API_KEY=<your Grist API key>
```

These administrator-facing environment variables override the managed local
mode. Do not place the API key in this directory, a browser bundle, a URL, or
source control.

Remote Grist is disabled by default. A trusted remote installation requires
HTTPS and `ALLOFLOW_GRIST_ALLOW_REMOTE=1`. Public or school-network deployment
also requires real SSO/forward authentication, TLS, access-control review, and
deployment-specific privacy approval.

## Accessibility conformance scope

The AlloFlow-owned companion shell, accessible table workflow, reviewed-change
workflow, and Gemini Canvas CSV workflow target WCAG 2.2 Level AA. The browser
regression suite covers WCAG A/AA axe rules, all three themes, 320 CSS-pixel
reflow, text-spacing overrides, forced colors, keyboard tab and table
navigation, focus persistence and recovery, visible input errors, target sizes,
and live-status accuracy.

This evidence is not a whole-product WCAG conformance claim for the embedded
Grist editor. Grist is an upstream, separately originated visual editor and
must be audited independently with keyboard and screen-reader users. Until that
audit is complete, describe the combined Desktop experience as partial
conformance due to third-party content; do not present the accessible mirror as
a functionally equivalent alternate version of all Grist features.

## Acceptance gate

Before treating Grist as the long-term substrate:

1. Test five representative educator workbooks.
2. Set a documented fidelity threshold for imports and exports.
3. Test keyboard-only, screen-reader, zoom/reflow, high-contrast, and reduced
   motion behavior independently in both AlloSheet and Grist.
4. Verify local-model behavior for identifiable student information.
5. Complete threat modeling, retention review, and school privacy/legal review.
6. On Windows, exercise imports as a non-administrator and confirm any required
   symbolic-link policy is acceptable for the district.

If workbook fidelity misses the threshold, retain Grist for CSV and structured
data workflows while evaluating another adapter. The AlloSheet agent and
accessibility layers are designed to remain AlloFlow-owned and replaceable.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution.
