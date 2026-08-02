# AlloFlow Shared Standards Context - Implementation Handoff

**Date:** 2026-07-31  
**Status:** Implemented locally and verified; external standards-provider resolution remains a future phase.

## What was implemented

The structured standards layer now applies above Blueprint rather than only inside Blueprint. The same context can travel through:

```text
teacher standard input
        |
        v
StandardsContext.normalize/resolve
        |
        +--> direct resource generation
        +--> Full Pack generation
        +--> Blueprint draft/revision/execution/rebuild
        +--> curriculum audit
        +--> audit-to-ACG graph -> Alignment Map
```

The old `standards` string is still retained everywhere for backward compatibility. The new `standardsContext` field is additive.

## Context contract

`standards_context_module.js` exposes `window.AlloModules.StandardsContext` with:

```js
{
  version: 'standards-context/v1',
  inputText: 'the original bounded teacher input',
  promptText: 'safe prompt-ready representation',
  standards: [{
    id, code, label, text, framework, jurisdiction,
    grade, subject, sourceUrl, sourceUrls, relationships
  }],
  provider: 'user-input' | 'provider id',
  datasetVersion,
  snapshotId,
  sourceUrls,
  resolutionStatus: 'unresolved' | 'partial' | 'resolved',
  provenance: { provider, datasetVersion, snapshotId, sourceUrls,
    resolutionStatus, retrievedAt, license }
}
```

The module is deliberately a bounded normalizer, not a live Learning Commons client. A raw string is marked `unresolved`; the code never presents a teacher-entered code as externally verified. A future local/CDN dataset adapter can provide a resolved object without changing the downstream generation or audit contracts.

## Code paths changed

- `standards_context_module.js` - new shared normalizer. Accepts strings, arrays, standard records, or an existing context snapshot.
- `agent_core_contracts_module.js` - Blueprint now accepts and bounds top-level `standardsContext` while preserving `standards`.
- `agent_core_blueprint_service_module.js` - draft creation, pure revision, and AI revision preserve the context.
- `generate_dispatcher_module.js` - every direct resource resolves the context at the dispatcher boundary; the single artifact config builder records it on generated history items. Dynamic Assessment isolation blanks it like the other lesson context fields. Alignment audit output records it on `comprehensive.standardsContext` and `comprehensive.standards.standardsContext`.
- `generation_helpers_module.js` - Full Pack resolves once and passes the same context to every resource step, including non-Blueprint Full Pack mode.
- `phase_o_misc_handlers_module.js` - Blueprint execution and individual step rebuilds pass the stored Blueprint context explicitly; Blueprint lesson DNA uses its prompt-ready standard context.
- `concept_graph_engine_module.js` - `fromAlignmentAudit(...)` reads the context from the audit dimension and carries provider, dataset, snapshot, provenance, and the context snapshot into `g.meta.alignmentAudit`.
- `build.js` and `AlloFlowANTI.txt` - register/load `StandardsContext` before the Agent Core modules.
- `desktop/web-app/src/App.jsx`, `desktop/web-app/src/AlloFlowANTI.txt`, and `desktop/web-app/public/` - synchronized by the development build. The public folder includes `standards_context_module.js` and the modified runtime modules.

## Runtime behavior by user flow

| Flow | Context source | What is preserved |
| --- | --- | --- |
| Individual resource | Ambient `standardsInput`/`targetStandards`, or `configOverride.standardsContext` | Prompt text plus `history` item `config.standardsContext` |
| Full Pack | One normalized snapshot before the resource loop | Same snapshot on every generated resource |
| Blueprint | Stored `blueprint.standardsContext` | Draft, revision, execution, audit step, and rebuild |
| Audit | The dispatcher context and generated artifact configs | `comprehensive.standardsContext` and standards dimension metadata |
| Alignment Map | `ConceptGraphEngine.fromAlignmentAudit` | Graph metadata and evidence relationships; no free-text artifact links are inferred |

`toLegacyConfig()` intentionally does not put the structured field into the old execution object. The Phase O execution path passes the stored context separately, which keeps older consumers of the legacy shape stable.

## Verification completed

Syntax checks passed for the new module and all edited root generation, Blueprint, graph, and test modules.

Focused test command:

```text
npx vitest run tests/standards_context_integration.test.js tests/agent_core_contracts.test.js tests/agent_core_blueprint_service.test.js tests/concept_graph_engine.test.js tests/curriculum_audit_render.test.js --maxWorkers=1
```

Result: **5 test files passed, 86 tests passed.**

Build checks:

```text
node build.js --mode=dev --dry-run
node build.js --mode=dev
```

The dry run passed, then the development build wrote the generated app, copied the runtime modules, and reported 167 module URL replacements and 401 module/plugin files copied. The unrelated dirty root `studio_module.js` was not propagated into the final public change set.

## How to check this in another session

1. Run the focused Vitest command above.
2. Open `standards_context_module.js` and call `window.AlloModules.StandardsContext.resolve('NGSS 5-ESS2-1')` in the app console. Confirm the result is `unresolved` and contains one bounded standard entry.
3. Create a Blueprint with a structured context and inspect that `blueprint.standardsContext` survives validation and revision.
4. Generate one direct resource and confirm its history item has both the legacy `config.standards` string and `config.standardsContext`.
5. Generate a Full Pack and confirm each new resource has the same provider/dataset/context snapshot.
6. Run the curriculum audit and inspect `generatedContent.data.comprehensive.standardsContext`; open the Alignment Map and confirm the graph metadata shows the same provider/dataset.

## Known limits and next safe phase

- This change does not download or resolve Learning Commons data. It creates the stable seam for a local/CDN snapshot or an optional provider adapter.
- No API call is required for the current behavior. Raw standards input works offline. A future resolver should be explicit, cacheable, attribution-aware, and fail back to this local context when unavailable.
- The current Alignment Map visualizes audit evidence, findings, and recommendations. A later Learning Web view can add standard-to-prerequisite/related-concept neighborhoods using the same `acg/v1` graph contract.
- The source loader currently uses the existing CDN URL convention. The development build points the generated desktop app at local public copies; production deployment should happen only after the new modules are committed/pushed and a production build is run so the CDN hash contains them.
- Next implementation step: add a versioned, license/attribution-aware local standards snapshot adapter behind `StandardsContext.resolve`, then add provider-specific tests. Do not make the generation paths depend directly on a Learning Commons API.

## Files intentionally not part of this feature

`studio_module.js` and `tests/allostudio_pptx.test.js` were already dirty in the workspace before this implementation. They are preserved and are unrelated to the standards-context work.
