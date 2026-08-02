# AlloSheet educator-tool integration roadmap

## Purpose

AlloSheet should be the place where an educator deliberately compares,
filters, charts, and reviews bounded tabular copies. It should not become a
second student information system, gradebook of record, assessment database,
or hidden synchronization layer.

This roadmap ranks integrations that follow the BehaviorLens reference
adapter. The order weighs educator value, how naturally the tool's output
becomes a table, privacy risk, and implementation effort. It is an
implementation sequence, not permission to move every field a tool stores.

Current implementation status (July 2026): the shared deny-by-default adapter,
authenticated transfer-ID/receipt queue, independently meaningful destination
review, BehaviorLens handoff, aggregate-only Quiz item-analysis handoff, and the
reviewed Student Analytics / RTI and Submission Inbox adapters are implemented.
AlloSheet also now has explicit multi-table workspace save/reopen, a local
column profile, deterministic local analysis, and grouped-result CSV export. The reviewed Dynamic Assessment, Live Polling, and Fluency handoffs are now
implemented; Accessibility Lab and Research Hub are now implemented.

## Shared integration shape

Every source tool should follow the same visible, two-review workflow:

1. The source provides **Open in AlloSheet** and shows the educator the date
   range, datasets, fields, row counts, truncation, and privacy choices.
2. The source builds a bounded `alloflow.tabular.v1` envelope with source
   identity, classification, privacy flags, tables, provenance, and explicit
   capabilities.
3. The host bridge validates and normalizes the envelope. It assigns a random
   transfer ID, queues bounded concurrent transfers in FIFO order, and sends
   the copy through the authenticated popup message channel, never through a
   URL.
4. AlloSheet validates it again and acknowledges receipt. Its isolated modal
   shows the stable source ID and version, sensitivity, identifier and notes
   flags, relevant provenance, every table's exact fields, row counts, and
   truncation. The educator may include or exclude each table.
5. AlloSheet reports accepted, cancelled, or rejected separately from receipt.
   Accepted tables enter one browser-local workspace and remain separate in
   the table selector. The source remains authoritative.

The initial direction is always source tool to AlloSheet. A v1 transfer must
carry `transferEnablesAI: false`, `aiEnabled: false`, and `writeBack: false`.
Opening a copy must never send it to an AI provider. AlloSheet's existing
field-selection and consent step remains required for a later AI request.

The current envelope limits are 2 MB total, 5 tables, 40 columns per table, 200
rows per table, and 1,200 characters per cell. Sources must summarize, filter,
or visibly truncate instead of bypassing those limits.

Names being absent does not prove that a dataset is de-identified. Dates,
small groups, uncommon events, free text, and combinations of indirect
identifiers can still identify a learner. The review should say exactly what
was omitted and use “reduced-data copy” when that is the accurate claim.

## Ranked opportunities

| Rank | Tool | Initial direction and useful tables | Privacy-safe default | Possible later return |
| ---: | --- | --- | --- | --- |
| 1 | Student Analytics / RTI | **Implemented:** reviewed `probe_trends`, `intervention_summary`, `goal_progress`, and `group_tier_counts` copies with class, active-learner, and intervention-group scopes. | Class summary defaults to aggregate-only. Individual scopes use fresh transfer-local opaque codes. Names, notes, raw uploads, narrative, safety/SEL data, audio/transcripts, program labels, and decisions are excluded; small tier cells suppress the full distribution. | No return exists. Only a future separately versioned, educator-reviewed contract could propose goal or intervention parameters; it must never change a tier, goal, or student automatically. |
| 2 | Quiz Analytics / Live Gradebook | **Aggregate item analysis is implemented.** The current one-table copy contains bounded item type, response/scoring counts, rate, sample status, and signal codes. Option distributions, standards mastery, completion counts, and any selected-student score table remain future work. | The implemented adapter excludes names, UIDs, prompts, option wording, raw answers, reflections, AI feedback, session/resource IDs, and cohorts. It enforces the existing five-respondent signal floor again at the transfer boundary. | A later contract could return a reviewed score correction or item exclusion. It must not post grades automatically. |
| 3 | Submission Inbox Gradebook | **Implemented v2:** reviewed `saved_submission_summary` and `saved_score_summary` copies of explicitly teacher-saved gradebook records, with assignment selection, 30/90/all date windows, stable-first identity grouping, legacy fallback, and explicit revision-sensitive human-review attestation. | Source-only labels become transfer-local `A###` codes. Stable class, assignment, and confirmed roster-learner IDs remain local; the artifact reports only coverage counts. Names, IDs, titles, responses, feedback, rubric prose, keys, and files are excluded. Score, review-state, and late/on-time distributions use small-group suppression. Missing work is not inferred because there is no roster denominator. | No return exists. A future separately versioned contract would require exact allowlisted fields and final confirmation in Submission Inbox; it must never silently replace a submission, feedback, or grade. |
| 4 | Dynamic Assessment | **Implemented:** reviewed `da-session-summary`, optional detailed `da-probe-results`, and `da-progress-summary` tables with date range, summary/detailed mode, and dataset review. | Coded learner/session/item IDs and bounded derived results only. Verbatim answers, examiner observations, session notes, intake/referral data, prompts, answer keys, transcripts, and accommodation/IEP narrative are excluded. Derived progress rates remain explicitly suppressed until at least five sessions exist. | A later return could propose a reviewed next probe or goal target; it must not launch an assessment or alter a learner plan automatically. |
| 5 | Live Polling | **Implemented:** reviewed post-session `lp-session-summary`, `lp-item-summary`, coded `lp-answer-distribution`, and `lp-time-summary` tables. | Aggregate-only by default; coded session/item/answer IDs, five-person suppression for totals and nonzero buckets, no prompts, codenames, peer IDs, signaling, routing, feedback, Q&A, or free-text responses. Teacher-authored choice labels are an explicit opt-in. | No return is needed. A future reusable report remains one-way and cannot change live-session state. |
| 6 | Reading and Math Fluency | **Implemented:** reviewed `fluency-measures`, `fluency-trend-summary`, and `fluency-error-summary` tables for WCPM/DCPM, accuracy, timing, benchmark context, and categorized counts. | Transfer-local session codes only; no student IDs, passage/source content, audio, transcripts, word-level sequences, problem text, answers, notes, or reviewer identity. Per-family aggregate suppression applies below three sessions; calibrated benchmark claims require three parallel forms. | Prefer no return. A future goal-target return would require the same narrow, reviewed contract as Student Analytics. |
| 7 | Accessibility Lab | **Implemented:** reviewed `a11y-review-summary`, `a11y-criterion-summary`, and `a11y-trend-summary` tables with WCAG/impact counts, audit status, remediation status, and bounded trends. | Transfer-local artifact codes only; exclude page content, student text, DOM/HTML, selectors, code excerpts, descriptions, notes, fingerprints, and bindings. | A reviewed priority, owner, or resolution-status update could return later. Automated DOM or document changes remain in the Accessibility Lab's own preview workflow. |
| 8 | Research Hub / Evidence Graph | Implemented: reviewed research-overview, research-claim-summary, research-evidence-summary, and research-provenance-summary tables with date windows and dataset selection. | Reduced-data metadata only: counts, relationship shape, method tags, status, and receipt health. Claim/evidence text, citations, files, credentials, notes, stable IDs, and unapproved learner interpretation are excluded. | A future return may propose reviewed tags or weights through the Research Hub approval flow; it must never bypass learner interpretation or approval. |

### 1. Student Analytics / RTI

This adapter is implemented. Its source review separates active-student,
intervention-group, and class-summary scopes; class summary and 90 days are the
defaults. Intervention groups require at least five learners. Individual
scopes use fresh random transfer-local codes rather than names or stable IDs.

The fixed tables are `probe_trends`, `intervention_summary`,
`goal_progress`, and `group_tier_counts`. Provenance records the scope,
measurement window, included/excluded tables, pseudonym type, and small-group
suppression. Automatic tier decisions and recommendations remain outside the
envelope, so a descriptive AlloSheet trend is not presented as a current
diagnostic determination.

### 2. Quiz Analytics / Live Gradebook

The implemented v1 adapter is item analysis, not a gradebook export. It emits
one `quiz_item_analysis` table with a fixed 15-field allowlist and at most 100
item rows. It reuses and independently enforces the five-respondent signal
threshold: descriptive aggregate counts remain available below five, while
interpretive signal codes are blank and the sample is labelled early signal.

If a future aggregate suppresses a value for privacy, that suppression should
be explicit rather than rendered as zero. An optional detailed transfer can be
considered only after item analysis is stable, with selected rows, selected
fields, and a second warning that the copy contains education records.

### 3. Submission Inbox Gradebook

This adapter is implemented for records the educator explicitly saved to
Submission Inbox's gradebook. Its source review selects assignments, a 30-day,
90-day (default), or all-dates window, and either all saved records or the
latest saved record for each normalized class-name + nickname key within a
normalized class-name + document-title group. Latest saved is the default. The
fixed tables are `saved_submission_summary` and `saved_score_summary`.

New v2 records use stable class and assignment IDs and a roster learner ID
after an exact match or explicit confirmation of a normalized match. Legacy and
unresolved records retain the prior normalized class/title/nickname fallback.
The artifact never contains those internal IDs; it reports stable and fallback
coverage instead. `unique_class_nickname_count` remains for compatibility but
is labeled as unique saved learner groups. The source review visibly discloses
the limit of 2,000 source records and 200 grade results per source record and
reports any truncation.

Source-only assignment/class labels distinguish same-titled assignments in the
review. Each selected assignment/class group becomes a fresh transfer-local
`A###` assignment code. The boundary excludes names, class names, assignment
titles, response text and keys, feedback, rubric prose, file references, and storage
keys. Score-derived statistics and distributions are suppressed when fewer
than five scored responses are available and whenever a
nonzero score band or result-status cell is smaller than five.

Saving a record does not establish human review: the stored score may be
AI-assisted. The educator can attest the current grade revision, and regrading
invalidates that attestation. Review-state counts use the same five-record
small-group floor. The source now accepts an optional validated ISO due instant
plus IANA timezone. The adapter derives late only when both timestamps exist,
applies the five-record small-group rule to on-time/late/unknown buckets, and
still makes no missing-work or structured-criterion claims. It is a one-way copy
with AI and writeback disabled. Any future return would require a separately versioned
allowlist and an exact source-side review before saving.

### 4. Dynamic Assessment

The reviewed Dynamic Assessment adapter is implemented. From a completed
session summary, the educator can open a nested accessible review, choose a
date range, summary or detailed mode, and include the session summary, probe
results, or progress summary tables. The default is a summary transfer with
the probe table off. The envelope uses fresh coded learner, session, and item
identifiers, and an optional student identifier is opt-in and disclosed.

`da-session-summary` contains reviewed session-level counts and duration;
`da-probe-results` is available only in detailed mode and contains coded probe
outcomes, attempts, mediation level, elapsed time, and bounded skill labels;
`da-progress-summary` contains descriptive skill-level aggregates. No raw
responses, examiner observations, notes, intake/referral fields, prompts,
answer keys, generated content, transcripts, or accommodation/IEP narrative
cross the boundary. Progress rates and sensitivity are null, with an explicit
`suppressed (<5 sessions)` status, until the aggregate contains five sessions.
The adapter declares AI and writeback disabled and records the exclusions and
limits in provenance. Canvas and Desktop use the same popup bridge callback.

### 5. Live Polling

The reviewed Live Polling adapter is implemented as a post-session aggregate
snapshot. While the host panel is open, or after completed polls are retained
for the current session, the educator can open an accessible nested review and
choose the session, item, coded answer, and 15-minute time-summary tables. The
default is aggregate-only with teacher-authored choice labels off.

`lp-session-summary` reports bounded duration, poll count, and privacy-aware
participant/response totals. `lp-item-summary` contains coded poll rows, type,
duration, response rate, optional aggregate correctness when a poll explicitly
provides a key, and a text-suppressed status for free-text or word-cloud polls.
`lp-answer-distribution` uses coded rating/choice rows; nonzero buckets below
five are suppressed, and labels require explicit opt-in. `lp-time-summary`
aggregates response volume into 15-minute UTC buckets. No prompt text, learner
response text, codenames, peer IDs, routing groups, feedback, Q&A, peer
showcase, or signaling metadata crosses the boundary. AI and writeback are
disabled, missing work is not inferred, and Canvas/Desktop use the same popup
bridge callback.

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

The reviewed Research Hub adapter is implemented. From the educator-mode Research Hub header, an accessible nested review lets the educator choose a 30-day, 90-day, or all-record window and include the overview, claim relationship, evidence metadata, and provenance-health tables. The source builds fresh transfer-local C001-style and E001-style codes; stable claim, evidence, source, artifact, relationship, episode, and receipt IDs remain local.

The overview reports inquiry status, method/lane metadata, bounded counts, evidence-graph status, audit status, and integration-health counts. Claim rows report relationship shape and warrant presence without claim text. Evidence rows report type, linked-claim counts, tags, citation/summary presence, reproducibility status, and integration status without content. Provenance rows report family-level completeness and review counts. The handoff excludes claim/evidence text, citations, files, credentials, notes, stable IDs, and unapproved learner interpretation.

The copy is one-way with AI disabled, writeback disabled, and transfer-time AI disabled. Canvas and Desktop use the same authenticated AlloSheet popup bridge.

### 4–6. Assessment and live-result tools

Dynamic Assessment, Live Polling, and Fluency can share a results-adapter
utility after the first three integrations establish the pattern. They should
all distinguish raw evidence from a reviewed measure:

- Dynamic Assessment sends scored or coded result rows, not verbatim student
  answers.
- Live Polling sends a post-session aggregate snapshot, not a live participant
  feed.
- Fluency sends reviewed measures and categorized counts, not audio or
  transcripts.

### 7–8. Workflow and evidence tools

Accessibility Lab and Research Hub contain less conventional student
gradebook data, so they are lower priority even though their privacy risk may
be lower. Their adapters should improve triage and comparison without
duplicating the source tool's richer workflow. Research Hub integrations must
continue to use
[`alloflow_tool_integration_contract_v1.md`](alloflow_tool_integration_contract_v1.md)
and [`tool_integration_sdk.md`](tool_integration_sdk.md) for capture,
provenance, learner review, and approval.

## Explicit SEL boundary

Raw SEL reflections are out of scope for AlloSheet integration. Do not transfer
reflection text, journal entries, private free text, voice or audio, transcripts,
safety disclosures, or inferred sentiment—even if identifiers are removed.
Counts that already exist as privacy-reviewed product summaries do not grant
permission to expose the underlying reflections.

If a future learner-facing use case is compelling, it must be a separate
learner-controlled **Share summary** flow. The learner must review the exact,
short summary and approve its destination at that moment. Educator access,
general tool consent, or approval of a different artifact cannot substitute
for that decision.

## Phased delivery

### Phase 0 — foundation and BehaviorLens

- Ship blank browser-local sheet creation and CSV import in the same popup.
- Ship the double-validated, double-reviewed multi-table envelope.
- Use BehaviorLens as the reference adapter: summary by default; dataset and
  date filters; identifier and notes off by default; one-way copy; no AI or
  writeback on transfer.
- Keep source and destination validation tests as the contract fixture for
  later adapters.

### Phase 1 — highest-value educator data

- **Implemented:** shared adapter utility for strict field allowlists, UTF-8
  limits, immutable table snapshots, provenance, privacy flags, row-count
  previews, and truncation.
- **Implemented:** Quiz Analytics aggregate item analysis with the
  five-respondent signal floor, a source review, destination review, and
  receipt/decision feedback.
- **Implemented:** Student Analytics class/learner/group review with
  probe/intervention/goal/tier tables, random transfer-local codes, and
  all-tier small-cell suppression.
- **Implemented:** Submission Inbox teacher-saved submission and score
  summaries with stable-first identity, explicit human-review provenance,
  assignment/date/attempt controls, transfer-local `A###` codes, and
  small-group score and review-state suppression.
- **Implemented:** Dynamic Assessment reviewed results with coded bounded
  tables, optional detailed probes, and five-session suppression for derived
  progress measures.
- **Implemented:** Live Polling post-session aggregates with coded answer
  distributions, time buckets, and five-person suppression.

Phase 1 integrations remain one-way. Each source has a keyboard- and
screen-reader-operable review, AlloSheet has a second review, and privacy
fixtures prove excluded fields never enter the envelope.

### Phase 2 — reviewed measures

- **Complete:** Add Dynamic Assessment reviewed results.
- **Complete:** Add post-session Live Polling aggregates.
- **Complete:** Add reviewed reading and math fluency summaries.
- **Next candidate:** Add Accessibility Lab issue/status tables.

These integrations should reuse the Phase 1 utility but keep separate source
allowlists. A generic “export all tool state” method is not acceptable.

### Phase 3 — workflow and research tables

- **Complete:** Add Accessibility Lab issue/status tables.
- Complete: Add Research Hub metadata and evidence-relationship tables through the
  existing integration contract and learner approval model.

### Phase 4 — optional narrow return contracts

Only explore return messages after the one-way integrations pass privacy,
security, accessibility, and educator usability review. A return contract must
be versioned separately, list the exact writable fields, bind changes to stable
source record IDs, prevent replay, show old and proposed values, log the
educator decision, and require final confirmation inside the source tool.

There should be no generic bidirectional sync, silent background updates,
automatic grade posting, automatic RTI tier changes, or transfer-time AI
activation.

## Acceptance gate for every adapter

An integration is ready only when:

1. the source review names every included table, field category, date range,
   identifier choice, notes choice, row count, and truncation;
2. source and destination validators reject unknown versions, invalid types,
   oversized cells, tables, rows, columns, and payloads;
3. privacy tests prove prohibited fields are absent and small-group suppression
   is preserved where applicable;
4. table data never appears in the popup URL, logs, credentials, analytics, or
   an AI request as a side effect of transfer;
5. canceling either review makes no destination copy, and accepting one makes
   no source change;
6. keyboard-only, screen-reader, 320-pixel reflow, zoom, text-spacing, forced
   colors, focus recovery, and live-status behavior pass for both reviews;
7. truncation and “reduced-data” labels are accurate and never imply
   de-identification without evidence; and
8. canonical and packaged copies, tests, attribution, and user documentation
   are in sync.
