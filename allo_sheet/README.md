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
- Deterministic local filtering, grouping, counts, numeric summaries, bar
  comparisons, and date trends with an equivalent narrative and semantic table.
- A local column profile that reports inferred types, completeness, distinct counts,
  and typed ranges before an educator chooses a grouping or measure.
- Explicit save/reopen for the complete bounded local workspace in one
  validated `.allosheet.json` file.
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

The same popup also has a bounded browser-local table workspace for Gemini
Canvas. An educator can start with a blank sheet, import a CSV, or accept a
reviewed multi-table handoff from another AlloFlow tool.

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
table workspace after a validated handshake with its opener:

- The educator can choose **Start a new sheet** without supplying a file, name
  the sheet, define up to 40 columns, and create between 1 and 200 blank rows.
- The educator can instead import a CSV of up to 2 MB, 200 rows, and 40
  columns.
- Data stays in the popup's memory unless the educator explicitly downloads the
  current table as hardened CSV or saves every local table in one AlloSheet
  workspace file. Nothing is persisted automatically.
- Direct cell editing, the local accessibility audit, reviewed AI suggestions,
  apply, and one-step undo remain available.
- A cross-origin Canvas opener cannot use AI silently. When an AI provider is
  available, the popup displays the exact opener origin and requires the
  educator to authorize that origin for the current popup. This temporary
  authorization sends no data and is never persisted.
- Selected values are sent for AI assistance only after a second, one-request
  consent bound to the current table, data revision, and exact selected rows.
  Changing the table, editing data, or changing row selection clears it.

A newly created sheet is treated as unsaved immediately. AlloSheet also tracks
subsequent local edits and warns before replacing an edited table or closing
the popup. A successful CSV download marks the current table's present state as
saved; later edits make it unsaved again. Imported files and accepted handoffs
remain copies: AlloSheet never changes the source CSV or source tool.

Canvas mode does not claim full Excel compatibility. Native `.xlsx` handling,
large workbooks, and the full Grist editor require AlloFlow Desktop or an
administrator-managed district service. Formula-like exported text is hardened
to prevent spreadsheet applications from executing it when the CSV is opened.

Educators still see one AlloSheet popup and one workflow; there is no Docker,
terminal, port, server-address, or second setup window in either mode.

### Deterministic accessible local analysis

The **Local analysis** tab operates only on the currently loaded bounded table.
It supports an optional contains/equality/blank or numeric comparison filter,
grouping, row count, average, sum, minimum, and maximum. A bar summary is
available for ordinary groups; an ISO date or date-time field can use a trend
whose horizontal spacing reflects elapsed time.

Every visual has an equivalent narrative and semantic result table. Blank and
non-numeric measures are excluded rather than changed to zero, invalid or
missing date groups remain in the table but are not plotted as dated points,
numeric overflow is disclosed as unavailable, and visuals are omitted beyond
50 groups while the complete table remains available. Trend language is
descriptive and never claims causation.

The analysis code is deterministic: it does not call AI, mutate cells, write
back, or contact a source tool. Recipes and derived results are not stored in a
workspace file; the educator reruns them against the reopened source tables so
saved charts cannot silently become stale. After an analysis runs, **Download
result CSV** saves only the grouped labels and calculated metrics currently shown;
it does not include the source table, change the workbook save state, or enter a
workspace file. Formula-like labels are hardened for spreadsheet applications,
and the downloaded summary should still be stored securely.

### Portable bounded workspace files

**Download all-table workspace** saves the complete browser-local workbook as a
versioned `alloflow.allosheet.workspace.v1` JSON document. **Open saved
AlloSheet workspace** validates it locally and shows the same isolated,
keyboard-contained table review before any current local data is replaced.
The review lists tables, rows, fields, types, truncation, privacy declarations,
and recorded provenance. File provenance is descriptive metadata, not an
authenticated assertion.

The workspace limit is 8 MiB UTF-8, five tables, 40 columns and 200 rows per
table, and 1,200 characters per cell. Unknown properties, versions,
capabilities, non-finite numbers, unsafe identifiers, prototype keys, and
inconsistent active/modified table references are rejected without changing
the open data. Formula-like and HTML-like cell strings remain literal data.

Workspace JSON is intentionally portable but **unencrypted** and may contain
education records. Educators must store and share it only through an approved
secure location. AlloSheet does not place a workspace in localStorage,
IndexedDB, a URL, an AI request, or a source-system writeback.

### Observation Casebook v1

The **Observation casebook** is a configurable, browser-local lens over the
same AlloSheet workspace primitive. An educator or learner can start from the
Aquarium, Specimens, or Learner support template, or define custom cases and up
to 12 number, text, category, or boolean parameters. Its portable wide schema
uses four ordinary AlloSheet tables:

- `casebook_definition` records the title, case label, description, privacy
  mode, schema version, and creation time;
- `casebook_cases` assigns a local case code, name, status, and context to each
  tank, specimen, learner, or other case;
- `casebook_parameters` records each parameter's key, label, type, unit,
  expected context, prompt, and recognition aliases; and
- `casebook_observations` stores one time-stamped row per entry, with one typed
  column per configured parameter plus separate qualitative evidence, human
  interpretation, and capture-source fields.

Typed text or shared voice dictation produces only a local, editable draft. If
the narrative names exactly one different case, its local case name or code is
used as the proposed target and the mismatch is called out for review. If it
names multiple cases, the observer must choose the single target explicitly.
The observer reviews that target, the recognized parameter values, note,
interpretation, time, and warnings before choosing **Record reviewed entry**;
dictation never saves automatically and AlloSheet does not retain raw audio.

Each case also has editable stable context for setup or approved background
information. Updating it does not rewrite earlier observation rows, and it is
not silently added to an observation-only agent reflection. After an entry is
recorded, **Start another observation** keeps the same case but copies no prior
values, notes, or interpretation. Recorded entries feed a per-case timeline,
an exact parameter-history table, a local numeric visual when appropriate,
latest-value comparisons across cases, and deterministic local questions about
patterns, limitations, and useful next observations. Parameter history keeps
blank values distinct from zero, does not estimate missing measurements, and
does not treat a recorded difference as a cause, diagnosis, rank, or established
progress.

**Prepare agent help** offers two explicit goals. **Brainstorm next
observations** selects up to three recent rows; **Feedback on latest entry**
selects only the latest row and focuses on specificity, observability,
repeatability, missing context, and the separation of evidence from human
interpretation. Neither action sends data or enables AI. The educator must
still review the selected rows and complete AlloSheet's normal selected-value
consent step before any values can reach the configured AI provider. The
prepared instruction contains no case context or copied observation text,
requests explanation-only output with no cell changes, and applies additional
learner-support guardrails against diagnosis, disability, placement, grading,
ranking, or hidden-trait inference.

Casebooks exist only in the current popup until explicitly downloaded as an
AlloSheet workspace. That file is unencrypted, and every table, including the
observation timeline, is limited to 200 rows. Learner-support casebooks may
contain sensitive education records: use coded identifiers when possible, keep
observable evidence separate from interpretation, and save or share downloads
only through an approved secure location.

### Reviewed handoffs from educator tools

BehaviorLens supports a reviewed **Open in AlloSheet** handoff. Its source
review lets the educator choose:

- a summary transfer, which is recommended and groups records into daily
  trends, or a detailed row-level transfer;
- the last 7 days, last 30 days, or all available dates;
- ABC entries, observation sessions, and session history as separate tables;
- whether to include the active student identifier; and
- whether to include free-text notes in a detailed transfer.

Student identifiers and notes are off by default. The source review identifies
the copy as sensitive education data and lists exactly which tables and row
counts will be included.

Quiz Analytics also supports **Open in AlloSheet** from live Item analysis. Its
current v1 handoff is aggregate-only: question number, item type, response and
scoring counts, correct-rate percent, sample status, and bounded signal codes.
It excludes names, learner IDs, question and option wording, raw answers,
reflections, AI feedback, session and resource identifiers, and cohorts.
Signal codes remain blank until at least five learners respond.

Student Analytics / RTI supports a reviewed **Open in AlloSheet** copy with a
90-day class summary as the default. The educator may instead choose one active
learner or an intervention group of at least five and may select 30, 90, or 365
days or all available dates. Its fixed tables are `probe_trends`,
`intervention_summary`, `goal_progress`, and `group_tier_counts`.
Individual scopes use fresh random transfer-local learner and program codes;
the class summary is aggregate-only. Any nonzero tier cell below five
suppresses the full tier distribution instead of exposing a small cell.

The Student Analytics allowlist excludes names, nicknames, stable UIDs, raw
uploads, program labels, free-text intervention notes, IEP or accommodation
narrative, safety and SEL information, audio, transcripts, automatic tier
decisions, recommendations, and generated narrative. It is a one-way reviewed
copy and cannot change a learner, goal, intervention, or tier.

Dynamic Assessment supports a reviewed **Open in AlloSheet** copy from a
completed session summary. The educator can choose a date range, summary or
detailed mode, and the session, probe, and progress tables independently. The
default is summary mode with coded learner/session/item IDs and no raw response
or narrative fields. The optional `da-probe-results` table is available only
in detailed mode; `da-progress-summary` suppresses derived rates and
sensitivity until at least five sessions exist. Student identifier inclusion
is an explicit opt-in. The handoff is one-way with AI and writeback disabled.

Live Polling supports a reviewed **Open in AlloSheet** copy of the current
post-session aggregate snapshot. The educator can select the session, item,
coded answer distribution, and 15-minute time-summary tables. Totals and
nonzero answer buckets below five are suppressed. Prompts, codenames, peer
identifiers, signaling, routing, feedback, Q&A, peer-showcase content, and
free-text responses are excluded. Teacher-authored choice labels are off by
default and require an explicit opt-in. The handoff is one-way with AI and
writeback disabled.

### 6. Reading and Math Fluency

The reviewed Reading and Math Fluency adapter is implemented. From the educator’s
Fluency panel, an accessible nested review lets the educator choose a 30-day,
90-day, or all-record window and select session measures, trend summaries, and
error categories. Reading rows carry WCPM, accuracy, duration, running-record
error counts, reading level, and explicitly documented benchmark context. Math
rows carry DCPM, accuracy, duration, operation, difficulty, and bounded attempt
counts.

Session codes are fresh transfer-local labels. Passage text and titles, source
and reference text, audio, transcripts, feedback, word-level classifications,
inserted or “student said” text, problem text, student answers, attempt logs,
and reviewer identity are excluded. Trend and error aggregates are suppressed
per measure family until three sessions exist; reading benchmark-ready status
still requires three calibrated, distinct parallel forms from one passage set.
The handoff is one-way with `aiEnabled: false`, `writeBack: false`,
and `transferEnablesAI: false`, and Canvas/Desktop use the same popup bridge.

### 7. Accessibility Lab

The reviewed Accessibility Lab adapter is implemented. From the artifact list,
an accessible nested review lets the educator choose a 30-day, 90-day, or
all-review window and select artifact review, WCAG criterion, and monthly trend
tables. Review rows carry transfer-local artifact codes, artifact type, audit
status, remediation status, manual check counts, automated violation counts,
finding counts, and review-history counts.

Criterion rows use bounded rule and WCAG codes with impact, evidence source,
remediation status, and counts. Artifact titles and content, student-entered
text, DOM/HTML, selectors, code excerpts, descriptions, notes, fingerprints,
bindings, replay keys, and stable history IDs are excluded. The handoff is
one-way with `aiEnabled: false`, `writeBack: false`, and
`transferEnablesAI: false`, and Canvas/Desktop use the same popup bridge.

### 8. Research Hub / Evidence Graph

Research Hub now supports an educator-mode Review in AlloSheet handoff. The source review offers 30-day, 90-day, and all-record windows plus four bounded datasets: inquiry overview, claim relationships, evidence metadata, and provenance health.

The copy uses fresh transfer-local C001-style and E001-style codes and excludes claim/evidence text, citations, files, credentials, notes, stable record IDs, and unapproved learner interpretation. It reports counts, relationship shape, method tags, audit/integration status, reproducibility status, and provenance completeness. The envelope is one-way with AI disabled, writeback disabled, and transfer-time AI disabled; Canvas and Desktop use the same authenticated popup bridge.

Submission Inbox supports a reviewed **Open in AlloSheet** copy of records the
educator explicitly saved to its gradebook. The educator may select assignments
and either the last 30 days, the last 90 days (the default), or all available
dates. The default attempt policy keeps the latest saved record for each
normalized class-name + nickname key within a normalized class-name +
document-title group; the educator may instead include all saved
records. The fixed tables are `saved_submission_summary` and
`saved_score_summary`.

Submission Inbox v2 records store a stable class ID, an opaque assignment ID,
and a roster learner ID only after an exact roster match or explicit educator
confirmation of a normalized match. Class identity survives encryption-key
rotation. Legacy and unresolved records remain readable and use the prior
class-name/title/nickname fallback. The source review and provenance report
stable-versus-fallback coverage. `unique_class_nickname_count` is retained as
a compatibility field but is labeled as unique saved learner groups. The
source review also discloses its 2,000-source-record and
200-grade-results-per-record limits and reports truncation.

Source-only assignment/class labels distinguish same-titled assignments in the
review. Each selected assignment/class group becomes a fresh transfer-local
`A###` assignment code in the envelope. Names, class names, assignment titles,
response text and keys, feedback, rubric prose, file references, and source
storage keys do not cross the boundary. Score-derived statistics and
distributions are suppressed for samples below five and whenever a nonzero
score band or status would expose a group smaller than five.

A saved gradebook record may contain AI-assisted scoring or feedback. Saving
alone is not an attestation. The educator can explicitly mark the current grade
revision human reviewed; regrading invalidates that attestation. AlloSheet v2
reports privacy-suppressed reviewed-versus-pending counts and never receives
the underlying stable IDs. Exported assignments may also carry a validated ISO
due instant and IANA timezone. AlloSheet reports on-time or late submission
counts only when a submission timestamp and due instant are both present, and
suppresses any nonzero late/on-time/unknown bucket below five. It never infers
missing work because the handoff has no roster denominator. The copy is one-way
and neither enables AI nor writes anything back to Submission Inbox.

AlloSheet performs its own validation and shows an isolated second review with
the stable source ID and version, privacy flags, provenance, exact field names
and types, row counts, and truncation. The educator may exclude individual
tables before opening the local copy.

Handoffs use the versioned `alloflow.tabular.v1` envelope and a shared
deny-by-default adapter. The current boundary is 2 MiB measured as UTF-8, at
most 5 tables, 40 columns per table, 200 rows per table, and 1,200 characters
per cell. The bridge validates the envelope before opening AlloSheet, assigns a
random transfer ID, queues up to five transfers in FIFO order, and sends data
only through the authenticated popup message channel. It never places table
data in the popup URL. AlloSheet validates the envelope again and returns
separate received, accepted, cancelled, or rejected receipts. Popup close,
destination rejection, delivery timeout, and queue-wait timeout fail pending
source requests explicitly rather than silently dropping or overwriting them.

A transfer is one-way. It does not change a source tool, enable AI in
AlloSheet, send data to an AI service, or grant AlloSheet permission to write
back. Any later AI action remains behind AlloSheet's separate selection and
consent workflow. Any future writeback integration must use a new, narrowly
allowlisted and educator-reviewed contract; it must not silently extend this
handoff.

The ranked follow-up plan for Fluency, Accessibility Lab, and Research Hub (now implemented)
is in
[`docs/allosheet_integration_roadmap.md`](../docs/allosheet_integration_roadmap.md).

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

The AlloFlow-owned companion shell, accessible table, reviewed-change,
workspace-file review, deterministic analysis, and Gemini Canvas local-table
workflows target WCAG 2.2 Level AA. The browser
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
