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
AlloSheet also now has explicit multi-table workspace save/reopen and
deterministic local analysis. Dynamic Assessment is the next candidate.

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
| 3 | Submission Inbox Gradebook | **Implemented:** reviewed `saved_submission_summary` and `saved_score_summary` copies of explicitly teacher-saved gradebook records, with assignment selection, 30/90/all date windows (90 days by default), and latest saved per normalized class-name + nickname within each normalized class-name + document-title group or all saved. | Source-only assignment/class labels become transfer-local `A###` codes. Stable learner and assignment IDs are unavailable, so counts represent unique saved class nicknames; reused nicknames may merge, changed nicknames may split, and repeated same-title documents in one class may merge. Names, class names, titles, responses, feedback, rubric prose, keys, and files are excluded. Small score samples and distributions with a nonzero cell below five are suppressed. Saved records may include AI-assisted scoring and do not attest human review; no due-date, late, missing, or criterion claims are made. | No return exists. A future separately versioned contract would require exact allowlisted fields and final confirmation in Submission Inbox; it must never silently replace a submission, feedback, or grade. |
| 4 | Dynamic Assessment | Dynamic Assessment to AlloSheet: probe/item results, attempt counts, mediation or scaffold level, elapsed time, and progress by skill. | Use coded learner and item IDs, derived scores, and reviewed results. Exclude verbatim answers, observation narrative, generated content, and accommodation or IEP narrative. | A later return could propose a reviewed next probe or goal target; it must not launch an assessment or alter a learner plan automatically. |
| 5 | Live Polling | Live Polling to AlloSheet after a session: option counts, response rates, correctness by item, and time-window summaries. | Export aggregates only, preserve small-group suppression, and omit participant names, peer identifiers, signaling data, and free-text responses. Do not stream a live roster into AlloSheet. | No return is needed initially. If added later, restrict it to a reviewed poll-item analysis or reusable aggregate report, not live-session state. |
| 6 | Reading and Math Fluency | Fluency tools to AlloSheet: reviewed date, measure, benchmark context, words correct per minute or math rate, accuracy, duration, and categorized error counts. | Include only educator-reviewed score summaries with a pseudonymous ID. Exclude audio, full transcripts, source passages, word-level response sequences, and student names. | Prefer no return. A future goal-target return would require the same narrow, reviewed contract as Student Analytics. |
| 7 | Accessibility Lab | Accessibility Lab to AlloSheet: issue counts by WCAG criterion and impact, affected artifact region, audit status, and remediation status. | Exclude full page content, student-entered content, DOM dumps, and long code excerpts. Use bounded issue descriptions and safe element/region labels. | A reviewed priority, owner, or resolution-status update could return later. Automated DOM or document changes remain in the Accessibility Lab's own preview workflow. |
| 8 | Research Hub / Evidence Graph | Research Hub to AlloSheet: source metadata, evidence-health fields, claim-to-evidence links, method tags, uncertainty, and provenance receipts. | Use metadata and short approved summaries. Exclude full documents, credentials, direct identifiers, restricted cultural material, and unapproved learner interpretation. Follow the existing Tool Integration Contract and SDK review inbox. | If justified, return only reviewed tags, weights, or short interpretations through the Research Hub approval flow. Do not bypass learner interpretation and approval. |

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

Stable learner and assignment IDs are unavailable. `unique_class_nickname_count`
therefore reports unique saved class nicknames rather than verified unique
learners. Reused nicknames may merge different people, changed nicknames may
split one person, and repeated documents with the same title in one class may
merge into one assignment group. The source review visibly discloses the limit
of 2,000 source records and 200 grade results per source record and reports any
truncation.

Source-only assignment/class labels distinguish same-titled assignments in the
review. Each selected assignment/class group becomes a fresh transfer-local
`A###` assignment code. The boundary excludes names, class names, assignment
titles, response text and keys, feedback, rubric prose, file references, and storage
keys. Score-derived statistics and distributions are suppressed when fewer
than five scored responses are available and whenever a
nonzero score band or result-status cell is smaller than five.

Saving a record does not establish human review: the stored score may be
AI-assisted. The source also has no reliable due-date field, structured rubric
criteria, or human-review attestation. The adapter therefore makes no missing,
late, criterion-level, or human-verified claims. It is a one-way copy with AI
and writeback disabled. Any future return would require a separately versioned
allowlist and an exact source-side review before saving.

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
  summaries with assignment selection, attempt and date controls,
  transfer-local `A###` assignment codes, and small-group score suppression.
- **Next candidate:** Dynamic Assessment reviewed results.

Phase 1 integrations remain one-way. Each source has a keyboard- and
screen-reader-operable review, AlloSheet has a second review, and privacy
fixtures prove excluded fields never enter the envelope.

### Phase 2 — reviewed measures

- Add Dynamic Assessment reviewed results.
- Add post-session Live Polling aggregates.
- Add reviewed reading and math fluency summaries.

These integrations should reuse the Phase 1 utility but keep separate source
allowlists. A generic “export all tool state” method is not acceptable.

### Phase 3 — workflow and research tables

- Add Accessibility Lab issue/status tables.
- Add Research Hub metadata and evidence-relationship tables through the
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
