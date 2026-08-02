# Luna Implementation Guide: Local Standards Provider

**Prepared:** 2026-08-01  
**Primary objective:** Prove a deterministic, local-first standards provider behind the completed `standards-context/v1` contract.  
**Scope:** One implementation slice. Do not redesign Standards Finder, build the full Learning Web, download a production dataset, or add a live API in this slice.

## Decision confirmed

The next safest task is a local standards-provider proof of contract.

The completed work already carries `standardsContext` through individual resources, Full Pack, Blueprint, curriculum audit, and Alignment Map. The missing layer is a trusted provider that can turn a teacher query such as `5-ESS2-1` into a resolved, versioned context without an API call.

This slice should establish that provider using a tiny checked-in fixture. It should prove the API, matching rules, provenance, relationship handling, and fallback behavior before anyone imports or hosts the full Learning Commons dataset.

## Exit criterion

Luna is done when all of the following are true:

1. A local provider can validate a small versioned snapshot.
2. It can resolve an exact standard code deterministically.
3. It can search by bounded text and filters without silently choosing an ambiguous result.
4. It returns a valid `standards-context/v1` object with dataset version, license, attribution/source URLs, and typed relationships.
5. Missing or ambiguous queries remain explicit and safely fall back to unresolved teacher input.
6. Provider tests pass alongside the existing standards-context, Blueprint, graph, audit, and Throughline tests.
7. Root and desktop public runtime copies are synchronized.
8. Luna leaves a concise implementation handoff with changed files, tests, limitations, and the next recommended slice.

## Starting state Luna must preserve

Read these documents first:

- `STANDARDS_CONTEXT_IMPLEMENTATION_HANDOFF.md`
- `LEARNING_WEB_KNOWLEDGE_GRAPH_HANDOFF.md`
- this guide

Inspect these implementation files before editing:

- `standards_context_module.js`
- `agent_core_contracts_module.js`
- `agent_core_blueprint_service_module.js`
- `generate_dispatcher_module.js`
- `generation_helpers_module.js`
- `phase_o_misc_handlers_module.js`
- `concept_graph_engine_module.js`
- `tests/standards_context_integration.test.js`

Important workspace note: this is an actively shared, dirty worktree. `studio_module.js` and `tests/allostudio_pptx.test.js` were already unrelated to this feature, and additional STEM Lab, music, and test changes may be present from parallel work. Treat every pre-existing change as user-owned. Preserve it, record the fresh status before editing, and do not propagate unrelated root modules into `desktop/web-app/public/`.

The latest focused verification before this guide was:

```text
8 test files passed
102 tests passed
```

## Explicit non-goals

Do not do any of the following in this slice:

- call the Learning Commons API;
- add or expose an API key;
- download or commit the full Knowledge Graph export;
- create Cloudflare R2/KV/D1 infrastructure;
- redesign Standards Finder UI;
- alter Full Pack product behavior;
- build Surprise Me;
- replace Throughline;
- infer prerequisite or alignment relationships with AI;
- treat a fuzzy or ambiguous match as canonical;
- change the `standards-context/v1` version unless a genuine incompatible change is required.

## Proposed files

Create:

```text
standards_provider_module.js
test_data/standards_context/local_snapshot_v1.json
tests/standards_provider.test.js
LOCAL_STANDARDS_PROVIDER_HANDOFF.md
```

Update only as needed:

```text
build.js
AlloFlowANTI.txt
desktop/web-app/src/App.jsx
desktop/web-app/src/AlloFlowANTI.txt
desktop/web-app/public/standards_provider_module.js
```

Avoid changing generation, Blueprint, audit, Alignment Map, or Throughline modules unless a failing integration test proves the existing contract is insufficient. If that happens, document the exact gap before widening scope.

## Snapshot contract for the fixture

Use a small, human-reviewable snapshot with approximately 4-8 standards, 2 frameworks, and enough relationships to test exact matches, filters, ambiguity, and neighborhoods.

Recommended shape:

```json
{
  "schemaVersion": "alloflow-standards-snapshot/v1",
  "dataset": {
    "provider": "fixture-local-standards",
    "datasetVersion": "fixture-2026-08-01",
    "snapshotId": "fixture-v1",
    "generatedAt": "2026-08-01T00:00:00.000Z",
    "license": "TEST FIXTURE ONLY",
    "attribution": "Synthetic fixture for AlloFlow tests",
    "sourceUrls": []
  },
  "standards": [
    {
      "id": "ngss:5-ess2-1",
      "code": "5-ESS2-1",
      "label": "Earth systems interactions",
      "text": "Synthetic test wording, not official standards text.",
      "framework": "NGSS",
      "jurisdiction": "US",
      "grade": "5",
      "subject": "Science",
      "sourceUrl": ""
    }
  ],
  "relationships": [
    {
      "fromId": "ngss:5-ess2-1",
      "toId": "ngss:4-ess2-1",
      "type": "prerequisite",
      "source": "fixture"
    }
  ]
}
```

Fixture wording must be clearly synthetic. Do not paste copyrighted or uncertain official text merely to make tests realistic.

## Provider API contract

Expose the browser module as:

```js
window.AlloModules.StandardsProvider
```

Recommended public API:

```js
StandardsProvider.validateSnapshot(snapshot)
// -> { ok, errors, warnings, value }

StandardsProvider.createLocalProvider(snapshot)
// -> provider instance

provider.getManifest()
// -> bounded dataset metadata

provider.searchStandards(query, filters)
// -> { query, filters, matches, total, truncated }

provider.resolveStandard(query, filters)
// -> { status, query, match, candidates, context }
// status: 'resolved' | 'ambiguous' | 'not-found'

provider.getStandardContext(id)
// -> standards-context/v1 object or null

provider.getNeighborhood(id, options)
// -> { rootId, nodes, relationships, truncated }
```

Keep the module synchronous and network-free in this slice. The snapshot object is injected by the caller or test. Loading files or URLs belongs to a later adapter.

## Resolution rules

Resolution must be deterministic and explainable. Apply rules in this order:

1. Exact normalized code match.
2. Exact stable ID match.
3. Exact normalized label match after framework/jurisdiction/grade/subject filters.
4. Otherwise return ranked search candidates; do not claim a resolved canonical match.

Normalization may safely:

- trim surrounding whitespace;
- collapse repeated internal whitespace;
- compare codes case-insensitively;
- normalize common dash characters to `-`;
- preserve the original display code and label.

Do not use substring search to auto-resolve. Substring/token search may populate candidates only.

When two records have the same code in different frameworks or jurisdictions, return `ambiguous` unless filters select exactly one.

## Step-by-step implementation

### Step 0 - Protect the current workspace

1. Run `git status --short --untracked-files=all`.
2. Record pre-existing unrelated files, especially Studio changes.
3. Do not reset, checkout, delete, stage, commit, or reformat unrelated files.
4. Run the current focused test command from `STANDARDS_CONTEXT_IMPLEMENTATION_HANDOFF.md` plus the three Throughline tests listed below.
5. If the baseline fails before Luna edits anything, stop and report the failing tests separately.

### Step 1 - Write the provider contract tests first

Create `tests/standards_provider.test.js` and pin these behaviors before implementation:

- valid snapshot accepted;
- wrong schema version rejected;
- duplicate standard IDs rejected;
- relationships referencing missing nodes rejected or dropped with an explicit warning;
- exact code resolves;
- code matching is case-insensitive and dash-normalized;
- exact ID resolves;
- filtered duplicate code resolves to one result;
- unfiltered duplicate code returns `ambiguous`;
- unknown query returns `not-found`;
- fuzzy text returns candidates but not `resolved`;
- context includes provider, datasetVersion, snapshotId, license, and source URLs;
- neighborhood includes only real stored relationships;
- max-result and max-neighborhood limits are enforced;
- provider performs no network call;
- repeated calls return deterministic ordering and equivalent values.

### Step 2 - Add the synthetic fixture

1. Add 4-8 standards across at least two frameworks or jurisdictions.
2. Include one duplicate-looking code to exercise ambiguity.
3. Include prerequisite and related relationships.
4. Include one intentionally invalid relationship only if testing warning behavior.
5. Mark every text and metadata field as synthetic/test-only where appropriate.
6. Keep the fixture small enough to review in one screenful or two.

### Step 3 - Implement snapshot validation

In `standards_provider_module.js`:

1. Use an IIFE and the existing `window.AlloModules` registration pattern.
2. Validate `schemaVersion` exactly.
3. Bound all strings, arrays, result counts, and traversal depth.
4. Reject duplicate IDs.
5. Validate relationship endpoints and types.
6. Preserve raw relationship type in addition to any normalized type if mapping is needed.
7. Copy only known fields into the normalized snapshot.
8. Never retain secret-like fields or filesystem paths.

Use structured errors shaped like `{ code, path, message }`, matching the style of the Agent Core contracts.

### Step 4 - Implement deterministic indexes and search

At provider creation time, build in-memory indexes for:

- ID;
- normalized code;
- normalized label tokens;
- framework;
- jurisdiction;
- grade;
- subject;
- outgoing and incoming relationships.

Search requirements:

1. Apply filters before ranking.
2. Rank exact code, exact ID, exact label, label prefix, then token overlap.
3. Add a stable tie-breaker such as framework, code, then ID.
4. Return a bounded candidate list and `truncated: true` when applicable.
5. Never rely on object insertion order as the semantic ranking rule.

### Step 5 - Produce `standards-context/v1`

For a resolved standard:

1. Collect the root standard.
2. Collect its stored incoming/outgoing relationships within the configured limit.
3. Include related standard IDs and labels when available.
4. Pass the structured object through `window.AlloModules.StandardsContext.resolve(...)` when available.
5. Return a context with:
   - `provider` from the snapshot manifest;
   - `datasetVersion`;
   - `snapshotId`;
   - `resolutionStatus: 'resolved'`;
   - license/attribution metadata;
   - source URLs;
   - the canonical code, label, text, framework, jurisdiction, grade, and subject;
   - only relationships actually present in the snapshot.
6. If `StandardsContext` is unavailable, fail clearly or use a tiny documented fallback that returns the same bounded shape. Do not silently return a different schema.

For `ambiguous` and `not-found`, preserve the teacher query and return an unresolved context using the existing normalizer. Never invent a code, label, source URL, or relationship.

### Step 6 - Keep graph integration out of this slice

Do not add provider nodes directly to `ConceptGraphEngine` yet. The context relationship records are sufficient for this milestone.

At most, add a test proving the resolved context survives Blueprint validation and can be read by `fromAlignmentAudit(...)`. Existing integration tests may already cover this generically; reuse them rather than duplicating large fixtures.

### Step 7 - Register the module safely

1. Add `StandardsProvider` to `build.js` immediately after `StandardsContext` because it depends on the normalizer.
2. Add the source loader call to `AlloFlowANTI.txt` after `StandardsContext`.
3. Add the local loader call to `desktop/web-app/src/App.jsx` and its generated backup after `StandardsContext`.
4. Copy only `standards_provider_module.js` to `desktop/web-app/public/`.
5. Confirm root and public SHA-256 hashes match.

Because the worktree contains unrelated dirty modules, do not run a full development build merely to copy this module. A full build can propagate unrelated root changes into public copies and rewrite many generated URLs. Use `node build.js --mode=dev --dry-run` for validation, then synchronize only the new provider module and intended loader lines.

### Step 8 - Verification gates

Run syntax checks for:

```text
standards_provider_module.js
standards_context_module.js
desktop/web-app/public/standards_provider_module.js
```

Run provider and existing focused tests:

```text
npx vitest run \
  tests/standards_provider.test.js \
  tests/standards_context_integration.test.js \
  tests/agent_core_contracts.test.js \
  tests/agent_core_blueprint_service.test.js \
  tests/concept_graph_engine.test.js \
  tests/curriculum_audit_render.test.js \
  tests/throughline_3d_entry.test.js \
  tests/throughline_golden.test.js \
  tests/throughline_lanes_a11y.test.js \
  --maxWorkers=1
```

On Windows PowerShell, Luna may place the command on one line rather than using the continuation formatting above.

Also run:

```text
node build.js --mode=dev --dry-run
git diff --check
```

Warnings about pre-existing CRLF normalization may be reported separately; newly introduced whitespace errors must be fixed.

### Step 9 - Manual contract checks

In a test or browser console, demonstrate:

```js
const P = window.AlloModules.StandardsProvider;
const provider = P.createLocalProvider(fixture);

provider.resolveStandard('5-ESS2-1');
// status === 'resolved'
// context.version === 'standards-context/v1'
// context.provider === fixture.dataset.provider

provider.resolveStandard('systems');
// status is not automatically 'resolved' from fuzzy text
// candidates are reviewable

provider.resolveStandard('duplicate-code');
// status === 'ambiguous' until filters identify one record
```

### Step 10 - Write Luna's handoff

Create `LOCAL_STANDARDS_PROVIDER_HANDOFF.md` with:

- objective and final status;
- files created/changed;
- provider and snapshot contracts;
- exact matching and ambiguity rules;
- test commands and results;
- root/public hash-sync result;
- limitations;
- confirmation that no API/network dependency was added;
- confirmation that unrelated Studio files were preserved;
- the recommended next slice.

## Stop conditions

Luna must stop and report instead of expanding scope if:

- the existing `standards-context/v1` shape cannot represent required provider metadata;
- official dataset licensing or attribution is uncertain;
- a production snapshot would be large enough to require a storage decision;
- implementation appears to require API credentials;
- generated app files show broad unrelated URL churn;
- unrelated dirty files would need to be overwritten;
- baseline tests fail for reasons outside this provider slice.

## Recommended follow-on slices after Luna finishes

These are backlog items, not part of Luna's first implementation:

1. **Ingestion inventory:** inspect a pinned public Learning Commons export and record available frameworks, subjects, relationship types, licensing, and size.
2. **Build-time converter:** create a deterministic JSONL-to-AlloFlow snapshot builder with checksums and attribution output.
3. **Sharding/storage:** choose repository assets, GitHub Releases, or Cloudflare R2 based on measured snapshot size.
4. **Standards Finder integration:** resolve selected standards locally and show a reviewable context drawer.
5. **Upstream generation:** pass the resolved selection into the already-completed shared context flow.
6. **Component-level audit:** compare artifacts to stored learning components and prerequisites.
7. **Learning Web view:** map provider relationships into `acg/v1` and add a focused accessible 2D neighborhood.

## Luna final response template

Luna's final response should answer only:

1. Was the local provider proof of contract completed?
2. What files changed?
3. How many tests passed?
4. Is any network/API dependency now required?
5. Were root/public copies verified identical?
6. What remains for the production Learning Commons snapshot?
7. Where is `LOCAL_STANDARDS_PROVIDER_HANDOFF.md`?
