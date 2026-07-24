# Research Integration Verification

The repository currently contains more than 1,200 Vitest files. A single unsharded `npm test` run can exceed an interactive desktop task’s time bound, especially while other workspace test batches or the development server are active. That duration is a suite-scale constraint; it should not hide failures in the Research Hub integration surface.

## Required integration lane

Run:

```powershell
npm run verify:research-integrations
```

This bounded lane verifies:

- Evidence Graph derivation and privacy boundaries;
- Research Hub substrate migrations and rigor audits;
- accessible evidence-map semantics;
- Tool Integration SDK behavior;
- AlphaFold and Text Inquiry capture contracts;
- Text Inquiry browser flow;
- Annotation Suite inquiry handoffs;
- integration-manifest conformance.

## Full-suite sharding

CI should distribute the complete suite across stable shards:

```powershell
npm test -- --shard=1/16
npm test -- --shard=2/16
# …
npm test -- --shard=16/16
```

Each shard should report independently. A failed or timed-out shard can then be rerun with `--maxWorkers=1 --reporter=verbose` to identify a specific test file. Do not treat an interactive timeout of the unsharded 1,200+ file command as a passing or failing test result.

## Generated-file gates

After Research Hub or Annotation Suite changes:

```powershell
node _build_research_hub_module.js
node _build_annotation_suite_module.js
npm run verify:research-drift
npm run verify:view-props
npm run verify:build
```

The builders compile to temporary artifacts before synchronizing committed outputs so file watchers and test readers do not receive partially written JavaScript.

