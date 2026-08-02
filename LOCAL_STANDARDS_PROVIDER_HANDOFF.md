# Local Standards Provider — Implementation Handoff

Date: 2026-08-01
Status: Implemented and verified
Scope: Luna Model next milestone — local, network-free standards-provider proof of contract

## Outcome

AlloFlow now has a small local standards-provider adapter that can read a versioned bundled snapshot, search it deterministically, resolve exact standards safely, expose bounded graph neighborhoods, and return standards context with provenance. It is deliberately a fixture-backed contract, not an official standards dataset or a live API integration.

This is the safest Luna milestone because it tests the architecture and matching behavior before introducing licensing, ingestion, API quotas, large payloads, or a new teacher-facing UI.

## Files added

- `standards_provider_module.js` — provider implementation and browser/module registration.
- `desktop/web-app/public/standards_provider_module.js` — targeted public-runtime copy; SHA-256 matches the source copy.
- `test_data/standards_context/local_snapshot_v1.json` — small synthetic NGSS/CCSS/state-science snapshot with relationships and an intentional duplicate code for ambiguity testing.
- `tests/standards_provider.test.js` — provider contract, matching, provenance, graph, limits, validation, and no-network tests.

## Existing files updated

- `standards_context_module.js` and its public copy — additive `attribution` field on the context and provenance objects.
- `agent_core_contracts_module.js` and its public copy — preserves that attribution through Blueprint standards-context normalization.
- `build.js` — registers `StandardsProvider` after `StandardsContext`.
- `AlloFlowANTI.txt` — CDN loader entry.
- `desktop/web-app/src/App.jsx` and `desktop/web-app/src/AlloFlowANTI.txt` — local desktop loader entries.

No full build was run, and no unrelated dirty modules were overwritten.

## Provider contract

The browser module registers:

```js
window.AlloModules.StandardsProvider
```

The exported API is:

```js
const report = StandardsProvider.validateSnapshot(snapshot);
const provider = StandardsProvider.createLocalProvider(snapshot);

provider.getManifest();
provider.getValidationReport();
provider.searchStandards(query, filters, options);
provider.resolveStandard(query, filters, options);
provider.getStandardContext(id);
provider.getNeighborhood(id, options);
```

`createLocalProvider` throws an error with a `.report` property when the snapshot fails validation. Valid snapshots are normalized before indexes are built, so malformed relationship endpoints cannot leak into graph results.

## Matching behavior

Resolution is intentionally conservative:

1. Exact normalized code.
2. Exact stable ID.
3. Exact normalized label.
4. Otherwise return `not-found` with search candidates; never silently choose a fuzzy result.

An exact query that maps to more than one record returns `ambiguous` with candidates. For example, the fixture contains two `5-ESS2-1` records, so the unfiltered query is ambiguous while `{ framework: 'NGSS' }` resolves the NGSS record.

Code normalization handles case, whitespace, and common Unicode dash variants. Search ordering is deterministic: score first, then code, framework, and stable ID.

## Context and provenance

Resolved context carries:

- `provider`
- `datasetVersion`
- `snapshotId`
- `sourceUrls`
- `license`
- `attribution`
- resolved status
- the matched standard and bounded direct relationships

The additive attribution field now survives the existing Agent Core standards-context normalization path. This gives the later audit and lesson-generation layers a stable way to distinguish user input from a resolved snapshot without claiming official validation for the synthetic fixture.

## Graph behavior

`getNeighborhood(id, { depth, maxNodes, maxEdges })` returns only validated snapshot nodes and relationships. It is bounded and reports `truncated: true` when a requested neighborhood exceeds the limits. It does not call a graph API and does not attempt to infer missing edges.

This is the seam where a future Alignment Map can consume:

```text
target standard -> prerequisite/related/supporting standards -> lesson evidence
```

The visualization itself is intentionally not part of this milestone. The provider makes the data contract testable first.

## Verification

Passed:

```text
11 test files passed
132 tests passed
```

Focused command:

```text
npx vitest run tests/standards_provider.test.js tests/standards_context_integration.test.js tests/universal_settings_panel.test.js tests/view_sidebar_panels_wcag_a11y.test.js tests/agent_core_contracts.test.js tests/agent_core_blueprint_service.test.js tests/concept_graph_engine.test.js tests/curriculum_audit_render.test.js tests/throughline_3d_entry.test.js tests/throughline_golden.test.js tests/throughline_lanes_a11y.test.js --maxWorkers=1
```

Also passed:

- `node -c` for source and public provider, standards-context, and Agent Core contract modules.
- `node build.js --mode=dev --dry-run`; it recognized `StandardsProvider` and wrote no files.
- `git diff --check` and targeted trailing-whitespace checks.
- source/public provider SHA-256 equality check.
- static no-network checks: no `fetch(` or `XMLHttpRequest` in the provider.

## Explicit non-goals

This milestone does not yet:

- claim that the fixture is an official standards source;
- ship a full national/state standards dataset;
- call Knowledge Graph Explorer, Throughline, or a remote standards API;
- add an API key, CDN-hosted dataset, or ingestion pipeline;
- automatically resolve every teacher-entered standard in the live lesson UI;
- render the Alignment Map;
- replace the current internet standards search or curriculum audit.

## Continuation completed: opt-in resolver seam

The next consumer seam is now implemented in the Universal Settings `Target Standard` control.

Behavior:

- The action appears only when a validated snapshot has been explicitly registered with `StandardsProvider.registerLocalSnapshot(snapshot)` or injected before module load as `window.__ALLO_LOCAL_STANDARDS_SNAPSHOT__`.
- The synthetic fixture remains test-only and is not automatically exposed to teachers as authoritative curriculum data.
- Exact matches display the local record and can be adopted.
- Duplicate exact codes return an ambiguous state and require the teacher to choose the intended framework.
- Fuzzy matches remain suggestions and are never selected automatically.
- A resolved local record can be adopted only when no other target standard is active. This prevents a one-record context from silently claiming to cover a mixed standards list.
- The host retains the resolved context only while its exact target-standard display value remains selected. Manual edits, additions, removals, profile changes, or AI matches make a stale context inactive.
- Active resolved context is passed explicitly to individual-resource generation and full-pack generation, including Blueprint normalization and provenance.

The implementation touches:

- `standards_provider_module.js` — validated snapshot registry and optional pre-load injection.
- `view_sidebar_panels_source.jsx` plus generated/public module copies — resolver states and teacher controls.
- `AlloFlowANTI.txt`, desktop `App.jsx`, and desktop source backup — resolved selection state and panel wiring.
- `generation_helpers_source.jsx` plus generated/public copies — full-pack context forwarding.
- `generate_dispatcher_source.jsx` plus generated/public copies — individual-resource context forwarding.
- provider, standards-context, Universal Settings, and accessibility tests.

Focused verification for this continuation:

```text
4 test files passed
34 tests passed
```

## Next safe step

Choose and document the first real distributable snapshot source before enabling the action for ordinary users. That decision must include the dataset license, attribution text, update cadence, framework/jurisdiction scope, and a reproducible transform into `alloflow-standards-snapshot/v1`.

Until that review is complete, development and tests can register the synthetic fixture explicitly. The audit layer can also begin testing the distinction between resolved evidence, raw teacher-entered alignment, and ambiguous standards without presenting the fixture as official data.
## Continuation completed: Learning Commons importer path

The first real-source decision is now documented and implemented as an importer-only release path.

- Source: Learning Commons Knowledge Graph Academic Standards public JSONL exports.
- Pinned export: `v1.11.0` in `dev-tools/learning_commons_snapshot_manifest.json`.
- Access: local files; no runtime API call or API key is required.
- Data license: CC BY 4.0 with the upstream attribution preserved in every generated snapshot.
- Scope: jurisdiction plus subject are required unless a maintainer explicitly passes `--allow-all`; grade, framework, current/deprecated status, structural records, and a maximum count are additional controls.
- Identity: CASE UUIDs become stable AlloFlow IDs and CASE URIs remain source links.
- Distribution: the optional generated JavaScript module is self-contained and load-order-safe, so a reviewed subset can be hosted on GitHub or Cloudflare without a standards API dependency.
- Repository boundary: the large upstream corpus is not committed. Only the importer, source manifest, synthetic schema fixtures, tests, and operating guide are included.

Primary files:

- `dev-tools/build_learning_commons_snapshot.cjs`
- `dev-tools/learning_commons_snapshot_manifest.json`
- `LEARNING_COMMONS_SNAPSHOT_IMPORT.md`
- `tests/learning_commons_snapshot_builder.test.js`

Focused verification:

```text
3 test files passed
19 tests passed
end-to-end fixture CLI build passed
generated registration-module syntax check passed
```

The generated snapshot is intended to serve both sides of the pipeline. Lesson generation can use the resolved standard and bounded graph context upstream; curriculum audit can verify lesson evidence against the same stable target downstream. The audit must continue to distinguish exact resolved evidence, ambiguous suggestions, and raw teacher-entered text. A graph match is grounding evidence, not official certification.

## Next safe step after the importer

Generate and manually review one small pilot subset, such as one jurisdiction, one subject, and one grade band. Check record counts, several CASE source links, attribution display, ambiguous-code behavior, generation provenance, and audit evidence before adding that module to any ordinary-user deployment. Do not enable a national corpus by default.
## Continuation completed: identity and graph-node hardening

The importer/provider review identified and addressed two release-blocking issues:

- Snapshot IDs now include the filtered grades, build-mode flags, and a SHA-256 digest of the selected standards/relationships. The digest is also exposed as `dataset.contentDigest` for provenance.
- Snapshot records now carry additive `kind` and `resolvable` fields. Existing records default to `kind: "standard", resolvable: true` for compatibility. Imported grouping records are typed as non-resolvable graph nodes, so neighborhoods can traverse them without allowing them to appear as teacher-facing standard matches.
- The public provider copy is synchronized with the root provider copy.
- Regression coverage now checks grade-specific identity, build-mode identity, digest shape, structural traversal, and structural exclusion from search/resolution.

Verification after hardening:

```text
focused importer/provider tests passed
full standards + audit + Throughline regression set: 12 files, 138 tests passed before this additive hardening
```

The next safe task is a read-only profiler against an actual Learning Commons export, followed by one small manually reviewed jurisdiction/subject/grade pilot. The profiler should confirm real values for framework identity, grades, academic subjects, statement types, CASE identifiers, and relationship depth before making the structural graph path the default.
## Continuation completed: real-export profiler

A read-only profiler is now available at `dev-tools/profile_learning_commons_export.cjs` with focused coverage in `tests/learning_commons_export_profiler.test.js`.

It reports:

- node labels/types and framework counts;
- current, deprecated, and unknown-status academic standards items;
- jurisdiction, subject, grade, and statement-type distributions;
- coverage for CASE UUIDs, CASE URIs, codes, descriptions, jurisdiction, subject, and grades;
- relationship endpoint integrity and the proportion of edges connecting standards items;
- bounded `hasChild` hierarchy roots, reachable nodes, maximum depth, cycles, and truncation.

The profiler reads only caller-supplied local JSONL files. It does not call an API or enable a provider. The next gate is to run it against the pinned Learning Commons export and review one small jurisdiction/subject/grade scope before generating a real snapshot.
## Continuation completed: real v1.11.0 profile and pilot

The pinned public Learning Commons v1.11.0 exports were downloaded to temporary storage, hashed, profiled, and used to generate a verified Massachusetts Science Grade 5 pilot. The corpus profile is recorded in `LEARNING_COMMONS_V1_11_0_PROFILE.md`.

Important source findings:

- 222,865 academic-standard items and 214 frameworks.
- `isCurrent` is absent on all academic-standard items, so the importer must not claim current status from this export.
- CASE UUID/URI, description, jurisdiction, subject, and grade coverage are effectively complete; statement-code coverage is 72.03%.
- All 456,620 relationship endpoints resolve; 223,462 are `hasChild` edges; the corrected profiler observed no hierarchy cycles.
- Standards-only Massachusetts Science Grade 5 produced 25 standards and no direct edges because hierarchy edges pass through grouping nodes.
- The structural pilot produced 25 standards, 18 groups, 1 framework, and 43 `hasChild` relationships.

The importer now preserves the actual framework name and ID. The pilot identifies `Massachusetts Science and Technology/Engineering Framework` with framework ID `38542f25-9335-4099-bc86-19c23f23b4c4`. Source hashes are embedded in the reviewed manifest and can be enforced with `--verify-source`.

The structural pilot is a review candidate only. It should be manually checked for standard labels, hierarchy display, source links, attribution, resolver exclusion of groups, generation provenance, and curriculum-audit evidence before any deployment enablement.
## Continuation completed: structural pilot QA gate

A reusable pilot review command is now available at `dev-tools/review_learning_commons_pilot.cjs`, with coverage in `tests/learning_commons_pilot_review.test.js`. The generated report is `LEARNING_COMMONS_MA_SCIENCE_G5_PILOT_QA.json`.

The verified structural Massachusetts Science Grade 5 pilot passed:

- 25 resolvable standards;
- 19 non-resolvable structural nodes: 18 groups and 1 framework;
- 43 `hasChild` relationships;
- complete framework name/ID coverage for resolvable standards;
- complete source-link coverage for resolvable standards;
- valid nodes/relationships source hashes and attribution;
- valid bounded neighborhood endpoints and matching context provenance;
- zero structural records exposed through teacher-facing resolution.

The pilot remains a review artifact, not an ordinary-user deployment. The next product step is to connect this approved contract to an Alignment Map and curriculum-audit evidence view, with the structural graph used for context and only normative standards used for target selection.

## Continuation completed: provider-backed Alignment Map context

The existing `acg/v1` audit graph now accepts an optional local standards provider and adds bounded standards context without changing the audit evidence contract.

- `ConceptGraphEngine.fromAlignmentAudit(input, opts)` accepts `opts.standardsProvider`, performs exact code/ID/label resolution only, and calls the provider’s bounded `getNeighborhood` contract.
- The audited target keeps its existing stable audit node ID and receives a `standardsContext` summary with framework, source link, record kind, and resolvability.
- Parent/grouping and child/related records become `standardsContext` graph nodes. Grouping/framework records are context-only and remain excluded from teacher-facing resolution.
- Provider relationships are preserved as `relationType` metadata and mapped to safe ACG edge types (`contains` for `hasChild`, `relatedTo` otherwise). Limits remain bounded by depth, node, and edge options.
- The audit renderer passes the registered provider into the graph and shows exact-match grounding, framework/source provenance, related context, graph counts, and truncation state. If the provider or graph engine is absent, the previous readable audit fallback remains intact.
- Throughline does not need a new graph format: it can consume the same resulting `acg/v1` graph later. This change does not alter lesson generation or invoke a runtime standards API.

Primary files:

- `concept_graph_engine_module.js` and `desktop/web-app/public/concept_graph_engine_module.js`
- `view_alignment_report_source.jsx`
- `view_alignment_report_module.js` and `desktop/web-app/public/view_alignment_report_module.js`
- `tests/concept_graph_engine.test.js`
- `tests/curriculum_audit_render.test.js`

Verification:

```text
2 focused test files passed
40 tests passed
updated JSX source parsed successfully
root/public graph and renderer copies synchronized
```

The normal JSX rebuild script could not run in this workspace because `@babel/core` is declared but not installed in the current local `node_modules`; the generated renderer copies were updated directly and the JSX source was updated separately so a future dependency-complete build can reproduce the feature.

## Next safe step after the Alignment Map context layer

Add a small, read-only interaction contract: selecting a context node should reveal its source link and standard text, while selecting an audit evidence node should reveal the lesson artifact/evidence record that supports it. Keep those interactions bounded and provenance-first before considering a full Throughline standards canvas or AI-generated prerequisite claims.

## Continuation completed: Alignment Map v2 audit-scope provenance and source drill-down

The audit graph and renderer now expose a reusable, bounded provenance layer that can support both the current curriculum audit and a future Throughline view.

### What changed

- `ConceptGraphEngine.fromAlignmentAudit(input, opts)` now accepts `auditScope` from the dispatcher or the saved comprehensive audit.
- The graph preserves a versioned renderer-facing contract in `meta.alignmentMap`:
  - `version: alloflow-alignment-map/v2`
  - `targetNodeType: standard`
  - `contextNodeType: standardsContext`
  - `evidenceNodeType: auditEvidence`
  - `scopeNodeType: auditArtifact`
- Audited resources are represented as bounded `auditArtifact` nodes connected to the audit root with `auditScope` edges. The graph carries only non-content metadata: ID, title, type, and timestamp; it does not copy lesson content into the graph.
- The dispatcher now emits `metadata.includedArtifacts` alongside the existing `includedArtifactIds`. The list is capped at 100 items and preserves the selection mode so the UI can explain what was audited.
- Older saved audits that contain only `includedArtifactIds` still render through a safe fallback scope representation.
- The Alignment Map now has an accessible `details` disclosure for audited artifact scope. Its copy explicitly distinguishes scope provenance from per-standard attribution.
- Related standards context is also expandable. When the local provider supplies text or a source URL, the user can inspect the record and open the source record in a new tab.
- The same `acg/v1` graph remains the integration seam for Throughline. Throughline can consume `meta.alignmentMap`, standard/context/evidence/scope node types, and provenance edges without inventing a second graph format.

### Product meaning

This makes the audit a more honest verification layer:

```text
saved audit scope -> auditArtifact nodes -> audit root
standard target -> standards context -> audit evidence/findings/recommendations
```

The scope disclosure answers “what did the audit actually inspect?” The standards-context disclosure answers “what does this target mean and where did it come from?” The audit evidence remains the source of truth for claims about lesson alignment. The implementation intentionally does not claim that every audited artifact supports every standard, and it does not synthesize prerequisite claims.

### Primary files

- `concept_graph_engine_module.js` and `desktop/web-app/public/concept_graph_engine_module.js`
- `generate_dispatcher_source.jsx`, `generate_dispatcher_module.js`, and `desktop/web-app/public/generate_dispatcher_module.js`
- `view_alignment_report_source.jsx`
- `view_alignment_report_module.js` and `desktop/web-app/public/view_alignment_report_module.js`
- `tests/concept_graph_engine.test.js`
- `tests/curriculum_audit_render.test.js`
- `tests/curriculum_audit_logic.test.js`

### Verification

```text
6 focused test files passed
77 tests passed
root/public graph, renderer, and dispatcher mirrors synchronized
node syntax checks passed for generated modules
Alignment Map JSX source parsed successfully
node build.js --mode=dev --dry-run passed
```

The normal JSX rebuild script remains unavailable in this workspace because `@babel/core` is declared but not installed in the current local `node_modules`. The generated renderer was updated directly and the JSX source was kept equivalent and parser-validated. A dependency-complete build should be run before release.

## Next high-value enhancement

Add evidence-level artifact attribution only where the audit producer already has reliable IDs. The next contract should be additive and explicit:

- `auditEvidence.artifactIds`: bounded IDs of artifacts that supplied that evidence;
- `auditFinding.artifactIds`: only when the finding is tied to a specific artifact;
- no inferred links when the producer cannot prove them;
- renderer drill-down that shows “evidence from” artifacts separately from the overall audited scope.

That would turn the current honest scope map into a stronger verification map while preserving the same ACG/Throughline foundation. After that, the safest larger step is a read-only Throughline adapter that filters the graph by grade/framework/standard and visualizes the existing nodes, rather than introducing a second standards service.
## Continuation completed: explicit evidence-to-artifact attribution

The next verification layer is now implemented for standards-alignment evidence. It is deliberately explicit-only: no artifact link is inferred from a phrase in the model’s prose.

### Contract

- The audit prompt now includes an exact roster of the selected artifact IDs, titles, and types.
- Each standards evidence component may return `artifactIds` for `textAlignment`, `activityAlignment`, and `assessmentAlignment`.
- The normalizer intersects returned IDs with the actual `artifactsToAudit` IDs and caps the list at 12. Unknown, guessed, or out-of-scope IDs are discarded.
- The normalized evidence node carries `artifactIds` and `attribution: "explicit"` only when at least one valid ID survives.
- The graph adds `supportedBy` / `evidenceFrom` edges from the evidence node to the corresponding `auditArtifact` scope node.
- Graph metadata records `alignmentAudit.evidenceAttribution` with `mode: "explicit-only"` and a bounded link count.
- The renderer shows an accessible `details` disclosure labeled `Explicit artifact attribution`, with each source identified as an “Evidence source.” It also explains that this is a declared source link, not independent verification.

### Why this is safer

The model is not allowed to create an artifact namespace. It can choose only from IDs supplied by AlloFlow, and the graph can connect only to artifacts already present in the audit scope. A textual mention such as “the lesson” is not converted into a graph edge. Empty attribution remains a valid result when the evidence is cross-artifact or unclear.

```text
exact audit roster -> model-declared artifactIds -> scope intersection -> evidenceFrom edge
```

This makes the graph more useful for a future Throughline view while preserving the distinction between:

- what AlloFlow actually audited;
- what the audit explicitly named as an evidence source; and
- what has been independently verified by a human or another checker.

### Primary files

- `generate_dispatcher_source.jsx`, `generate_dispatcher_module.js`, and `desktop/web-app/public/generate_dispatcher_module.js`
- `concept_graph_engine_module.js` and `desktop/web-app/public/concept_graph_engine_module.js`
- `view_alignment_report_source.jsx`
- `view_alignment_report_module.js` and `desktop/web-app/public/view_alignment_report_module.js`
- `tests/concept_graph_engine.test.js`
- `tests/curriculum_audit_render.test.js`
- `tests/curriculum_audit_logic.test.js`

### Verification

```text
6 focused test files passed
79 tests passed
root/public graph, renderer, and dispatcher mirrors synchronized
node syntax checks passed for root/public generated modules
Alignment Map JSX source parsed successfully
node build.js --mode=dev --dry-run passed
```

The regular JSX build remains dependency-limited because `@babel/core` is declared but missing from the current local `node_modules`. The generated renderer was updated directly, and the source JSX was parser-validated for a dependency-complete rebuild.

## Next high-value enhancement

Extend the same explicit contract to structured findings only when a producer supplies `{ text, artifactIds }`. That would let a finding say which artifact exposed the gap without turning a generic gap sentence into a guessed attribution. After that, a read-only Throughline adapter can render three distinct relationship types: audit scope, evidence source, and standards context.
## Continuation completed: structured finding attribution

Finding attribution now extends the explicit-only contract without breaking older audit records.

- New audits may return `findingAttributions: [{ text, artifactIds }]` alongside the normal string `gaps` array.
- The normalizer also accepts a structured gap object such as `{ text, artifactIds }`, but converts it back to the legacy string form in `gaps` and stores the validated IDs in `findingAttributions`.
- Only IDs present in the actual audit scope survive normalization; each finding is capped at 12 source IDs and the finding list at 8 entries.
- The graph creates `auditFinding.artifactIds` and `findingFrom` edges only when a finding has explicit, scope-valid IDs.
- The Alignment Map preserves ordinary finding text and adds an accessible `Explicit finding attribution` disclosure when source artifacts are available.
- Older string-only gaps still render exactly as before and produce no guessed artifact edges.

The resulting relationship vocabulary is now:

```text
audit root --auditScope--> audited artifact
standard --evidencedBy--> evidence --evidenceFrom--> audited artifact
standard --contains--> finding --findingFrom--> audited artifact
standard --contains--> recommendation
standard --standards context--> standards context
```

The finding-source copy intentionally says “declared source link” rather than “verified source.” A finding can be model-declared, teacher-authored, or imported from a future deterministic audit producer; the graph does not collapse those provenance levels.

### Verification

```text
focused graph + renderer + audit-logic tests: 3 files, 58 tests passed
full graph + renderer + audit + standards-provider + Learning Commons pilot suite: 6 files, 79 tests passed before this finding-only extension
root/public renderer mirror synchronized
source JSX parsed and generated modules syntax-checked
```

The remaining release check is to resynchronize the graph and dispatcher public copies after the desktop runtime releases its temporary file handles, then rerun the mirror hash check and dev dry-run build.

## Prior handoff recommendation (completed in this continuation)

Add provenance labels to the attribution contract itself, such as `attributionSource: "audit-model" | "teacher" | "deterministic-check"`, but only when the producer can supply that value. This would let Throughline filter “declared,” “teacher-confirmed,” and “deterministically detected” relationships without implying that they have equal evidentiary strength.
## Continuation completed: provenance-source labels

The explicit attribution contract now records the producer category when a source relationship exists:

```text
attributionSource: "audit-model" | "teacher" | "deterministic-check" | "unknown"
```

- `audit-model` is the conservative default for artifact IDs returned by the curriculum audit model.
- `teacher` is reserved for an explicitly teacher-confirmed relationship supplied by a future UI or workflow.
- `deterministic-check` labels graph-projection relationships such as audit scope membership and standards-provider neighborhood materialization.
- Unsupported values fail closed to `audit-model` when valid model artifact IDs are present, or to `unknown` in the graph metadata.
- The graph keeps `attribution: "explicit"` separate from `attributionSource`; a source label describes who/what supplied the link, not whether the claim has been independently verified.

The Alignment Map now exposes the label in the evidence and finding disclosures and identifies scope membership as a deterministic check. Graph metadata includes the allowed source vocabulary, `provenancePolicy: "explicit-attribution-only"`, and counts by source for evidence and finding links.

### Primary files

- `generate_dispatcher_source.jsx`, `generate_dispatcher_module.js`, and `desktop/web-app/public/generate_dispatcher_module.js`
- `concept_graph_engine_module.js` and `desktop/web-app/public/concept_graph_engine_module.js`
- `view_alignment_report_source.jsx`, `view_alignment_report_module.js`, and `desktop/web-app/public/view_alignment_report_module.js`
- `tests/concept_graph_engine.test.js`
- `tests/curriculum_audit_logic.test.js`
- `tests/curriculum_audit_render.test.js`

### Next step

Add a teacher-confirmation action that can upgrade an existing explicit relationship to `attributionSource: "teacher"` without mutating the original audit-model declaration. That keeps the audit trace intact while enabling a future Throughline filter for model-declared, teacher-confirmed, and deterministic relationships.
## Continuation completed: non-mutating teacher confirmation projection

The graph engine now exposes `confirmExplicitAttributions(graph, confirmations, opts)` as a derived-copy contract.

- A confirmation request must name an existing edge ID (or edge IDs).
- Only explicit `supportedBy` edges with `relationType: "evidenceFrom"` or `"findingFrom"` can be confirmed.
- The function never creates an artifact edge, never accepts a free-text artifact reference, and never mutates the input graph.
- The derived edge changes to `attributionSource: "teacher"` and records the original producer declaration plus the teacher confirmation in bounded `attributionHistory`.
- Graph metadata records `attributionConfirmationPolicy: "derived-copy-only"` and the confirmed edge IDs.
- Scope membership and standards-context relationships remain `deterministic-check` relationships.

This creates the contract needed for a future review control without collapsing model-declared and teacher-confirmed evidence into one undifferentiated claim.

### Primary files

- `concept_graph_engine_module.js` and `desktop/web-app/public/concept_graph_engine_module.js`
- `tests/concept_graph_engine.test.js`

### Verification

```text
graph engine syntax check passed
33 concept graph tests passed
public graph mirror synchronized
```

### Next step

Wire a bounded Alignment Map review control to this derived-copy API, then persist the resulting graph snapshot only when the teacher explicitly saves the confirmation. The original audit graph should remain available for comparison.
## Continuation completed: Alignment Map confirmation review control

The Alignment Map now supports a host-gated teacher review flow for explicit artifact relationships.

- When the host supplies `onConfirmAttribution`, each explicit evidence/finding artifact link gets a `Confirm source` control.
- The control forwards the exact graph edge ID and graph snapshot; it is not shown when no save callback is available.
- The AlloFlow host calls `confirmExplicitAttributions`, then stores `comprehensive.alignmentMapGraph` and `comprehensive.alignmentMapGraphOriginal` in current resource state.
- `comprehensive.standards`, evidence text, findings, recommendations, and the original audit graph are not rewritten.
- Reloaded reports prefer the derived graph snapshot and visibly state that teacher-confirmed relationships are saved separately from the original audit declaration.

This makes teacher confirmation an explicit review action rather than an implicit upgrade of model evidence. The graph remains suitable for a later Throughline filter because relationship-level source labels and confirmation history are preserved.

### Primary files

- `view_alignment_report_source.jsx`, `view_alignment_report_module.js`, and `desktop/web-app/public/view_alignment_report_module.js`
- `desktop/web-app/src/App.jsx`
- `tests/curriculum_audit_render.test.js`

### Verification

```text
renderer and app JSX parse passed
13 curriculum audit renderer tests passed
public renderer mirror synchronized
```

### Next step

Add a deliberate save/export affordance for the derived graph snapshot, then expose the same saved `acg/v1` graph to a read-only Throughline view with filters for standards context, audited artifacts, evidence, findings, recommendations, and attribution source.
## Continuation completed: durable Alignment Map graph JSON export

The Alignment Map now exposes an explicit, host-gated `Export graph JSON` action.

- The renderer shows the action only when the host supplies `onExportAlignmentGraph`; ordinary read-only renderers do not gain a download side effect.
- The host accepts only `acg/v1` graphs and uses AlloFlow's existing `safeDownloadBlob` helper.
- The exported payload is `alloflow-alignment-graph-export/v1` and contains the bounded graph, export timestamp, compact audit metadata, and `originalGraph` when a teacher-confirmed derived graph has an original audit snapshot.
- The graph is the saved derived snapshot when one exists, so teacher-confirmed attribution and bounded `attributionHistory` survive the handoff. No new relationship is invented during export.
- The current App host also includes the teacher-confirmation bridge that stores `alignmentMapGraph` plus `alignmentMapGraphOriginal` in the resource state before export.

### Primary files

- `view_alignment_report_source.jsx`, `view_alignment_report_module.js`, and `desktop/web-app/public/view_alignment_report_module.js`
- `desktop/web-app/src/App.jsx`
- `tests/curriculum_audit_render.test.js`

### Verification

```text
focused renderer + graph suite: 2 files, 47 tests passed
core graph/audit/provider/Learning Commons suite: 6 files, 84 tests passed
Throughline/layout suite: 6 files, 75 tests passed
public renderer mirror synchronized and hash-checked after final edit
```

The dedicated JSX builder could not run in this checkout because `@babel/core` is not installed. The generated renderer was synchronized with the source through a narrow equivalent edit and validated with syntax and renderer tests; install the repository's normal build dependencies before the next full generated-module rebuild.

### Next step

Use the exported `acg/v1` payload as the read-only Throughline contract: add a small adapter/view with bounded filters for standards context, audited artifacts, evidence, findings, recommendations, and attribution source. Keep graph construction and teacher confirmation in AlloFlow; keep Throughline responsible for visualization and navigation.
## Continuation completed: read-only Throughline graph view and saved-graph import

The exported `alloflow-alignment-graph-export/v1` payload is now a read-only Throughline contract. Throughline receives the saved graph for the current resource when one exists and exposes bounded filters for node type, attribution source, and search text. The panel preserves standards source links, displays explicit-attribution policy, and never infers relationships from prose or visual proximity.

Throughline also has a separate host-gated `Open graph` action for a saved JSON export. The file is parsed and validated against `acg/v1` plus `alloflow-alignment-map/v2`; the canonical graph engine normalizer is used when available, with a fail-closed read-only fallback. The App host bounds nodes and edges again, keeps the imported graph in an isolated in-memory state, and never adds it to lesson history, editable unit state, cloud history, or live-session resources. `Close imported` returns the panel to the current resource graph without changing the unit editor.

### Primary files

- `mind_map_module.js` and `desktop/web-app/public/mind_map_module.js`
- `desktop/web-app/src/App.jsx`
- `concept_graph_engine_module.js` and `desktop/web-app/public/concept_graph_engine_module.js`
- `tests/throughline_lanes_a11y.test.js`

### Verification

```text
Throughline stateful interaction suite: 6 tests passed
Throughline module syntax check passed
App.jsx Babel parse passed
root/public Throughline mirror SHA-256 matched
```

### Next step

Add a compact graph summary/navigation bridge from an imported standard or finding back to the owning AlloFlow resource when that resource is available, while preserving the read-only boundary. Then run the full graph, audit-renderer, standards-provider, Learning Commons, and Throughline suites together before considering the graph layer complete.
## Continuation completed: audit-to-host persistence bridge

The App host now connects the audit renderer callbacks to the durable graph state used by Throughline:

- Teacher confirmation calls `confirmExplicitAttributions` and stores the derived `alignmentMapGraph` plus `alignmentMapGraphOriginal` on the current resource and matching history item. The original audit declaration remains intact.
- Graph export accepts only `acg/v1`, emits `alloflow-alignment-graph-export/v1`, carries compact audit metadata, and uses the existing safe download helper.
- Throughline receives the saved current-resource graph, the isolated imported graph buffer, and explicit callbacks to clear an imported graph. Imported data never enters lesson history or cloud/live-session state.

### Verification

```text
App.jsx Babel parse passed after host bridge repair
Existing audit renderer tests cover confirmation and export callback payloads
Combined graph/audit/Throughline suite: 5 files, 66 tests passed
Core graph/audit/provider/Learning Commons suite: 6 files, 85 tests passed
```

This closes the previously identified gap where the graph view existed but the current audit resource did not reliably expose the persistence/export bridge to the host.
## Continuation completed: artifact-to-resource navigation

Read-only Throughline graph nodes now expose a bounded `Open linked resource` action when an explicit `auditArtifact.artifactId` matches a resource ID in the host lesson history. The action calls the existing `onOpenLesson` handoff; it does not edit the graph, create a relationship, or alter unit layout. Nodes without an exact history match remain informational only.

### Verification

```text
Throughline stateful interaction suite: 6 tests passed, including linked artifact navigation
Source/public Throughline mirror SHA-256 matched
```

### Next step

Use the same explicit-ID rule to add optional standard-to-generation context navigation, then perform the final requirement audit across local standards provenance, audit graph construction, saved export/import, teacher confirmation, and Throughline rendering.