# Learning Commons snapshot import for AlloFlow

## Decision

AlloFlow can use the public Learning Commons Knowledge Graph JSONL exports without a runtime API call. The upstream data is not committed to this repository. Instead, a reviewed, bounded subset is transformed into AlloFlow's existing `alloflow-standards-snapshot/v1` format.

This is the safest first production path because it:

- avoids API keys and runtime availability dependencies;
- preserves the Learning Commons CC BY 4.0 attribution and source links;
- preserves CASE UUIDs as stable AlloFlow record IDs and CASE URIs as source links;
- requires jurisdiction and subject filters unless a maintainer explicitly accepts a full-corpus import;
- keeps the teacher-facing resolver disabled until a validated snapshot is deliberately loaded;
- can emit a self-contained JavaScript registration module for GitHub Pages, Cloudflare, or another reviewed static origin.

The pinned upstream source and review record are in `dev-tools/learning_commons_snapshot_manifest.json`.

## Profile an export before importing it

Run the profiler against the locally downloaded JSONL files before generating a snapshot:

```powershell
node dev-tools/profile_learning_commons_export.cjs `
  --nodes C:\path\to\nodes.jsonl `
  --relationships C:\path\to\relationships.jsonl `
  --json-out C:\path\to\learning-commons-profile.json
```

The profiler is read-only with respect to the source files. It summarizes node labels and types, framework-item coverage, jurisdictions, subjects, grades, statement types, current/deprecated status, CASE identifier coverage, relationship endpoint integrity, and observed `hasChild` hierarchy depth. It does not register a provider, create a lesson context, call a remote API, or publish a snapshot.

Use the report to choose the first pilot scope and to identify real-export variants before changing the importer. A pilot should have complete enough identifiers, descriptions, codes, source URIs, and hierarchy relationships for the selected jurisdiction/subject/grade scope.
## Build a reviewed subset

Download the pinned `nodes.jsonl` and `relationships.jsonl` files named in the manifest, then run:

```powershell
node dev-tools/build_learning_commons_snapshot.cjs `
  --nodes C:\path\to\nodes.jsonl `
  --relationships C:\path\to\relationships.jsonl `
  --out C:\path\to\ma-science-grade-5.json `
  --module-out C:\path\to\ma-science-grade-5.js `
  --jurisdiction Massachusetts `
  --subject Science `
  --grade 5 `
  --max-standards 500 `
  --source-manifest dev-tools/learning_commons_snapshot_manifest.json `
  --verify-source
```

When using the pinned real export, add `--source-manifest dev-tools/learning_commons_snapshot_manifest.json --verify-source`; the builder will fail closed if either input file has the wrong byte length or SHA-256. The JSON output is suitable for review and tests. The optional JavaScript output embeds the same snapshot and registers it whether it loads before or after `standards_provider_module.js`. It makes no API request.

By default, the importer includes only current `StandardsFrameworkItem` records whose normalized statement type is `Standard`. Grouping nodes and deprecated records require the explicit `--include-structural` and `--include-deprecated` switches. Included grouping records are emitted as `kind: "group", resolvable: false`: they remain available to graph traversal but never appear as teacher-facing standard matches.

Use `--framework-id` when a single framework must be selected. The importer follows `hasChild` relationships from that framework before applying the other filters. This requires additional passes over the relationship file and is intentionally optimized for a release build, not interactive use.

## Review a pilot before enablement

Run the bounded QA gate against a generated structural snapshot:

```powershell
node dev-tools/review_learning_commons_pilot.cjs `
  --snapshot C:\path\to\massachusetts-science-grade-5-structural.json `
  --out LEARNING_COMMONS_MA_SCIENCE_G5_PILOT_QA.json
```

The gate checks provider validation, resolvable versus structural counts, framework and source coverage, source-integrity metadata, attribution, bounded neighborhood endpoints, context provenance, and exclusion of structural nodes from teacher-facing resolution.
## Runtime boundary

Publishing a generated registration module does not automatically enable it in AlloFlow. A deployment must deliberately include the reviewed module. Once loaded, the existing Universal Settings resolver appears and can attach resolved standards context to individual resources, full packs, and the curriculum audit path.

This first integration is grounding data, not a certification service. AlloFlow should distinguish:

- exact, resolved snapshot evidence;
- ambiguous or suggested candidates;
- raw teacher-entered standards text;
- lesson evidence found by the audit.

The graph can support upstream lesson planning and downstream audit verification. The same stable standard IDs and bounded relationships should be used in both places so the audit checks the target selected during planning rather than running an unrelated second search.

## Release checklist

Before publishing a generated snapshot:

1. Re-check the source version, license, attribution, and upstream update notes.
2. Review the exact jurisdiction, subject, grade, framework, and maximum-record scope.
3. Run the focused builder and provider tests.
4. Inspect counts and several source links against the upstream framework.
5. Publish the generated module only from an approved static origin with normal integrity/version controls.
6. Keep attribution visible in resolver details, generated provenance, and audit evidence.
7. Do not describe a match as official validation, and do not use it for high-stakes grading, placement, or evaluation.
