# Meaningful draft parity between host and native recovery storage

Status: source audit and report-local fixture/helper authored; no runner or production-write execution by this worker. Keep this separate from the omission-cap repair.

`AlloFlowANTI.txt` accepts a history-empty workspace when it contains meaningful input text, source topic, builder draft, units, profiles, guided progress, project state or Word Sounds state (`normalizeSnapshot`, originally lines 7395–7409). Native local and bridge normalizers accept only input text, source topic and builder draft (`allo_device_storage_module.js:254–260`, `storage_bridge.html:316–322`). Both use the same recursive meaningful-value behavior, including its existing metadata exclusions; the native predicates omit five fields.

Consequently, a Word Sounds-only workspace with phonics activity but no source/generated history is valid to the host, rejected by strict native atomic upsert, and dropped from an existing store during native normalization. The same mismatch applies to the other four host-supported draft fields. This is a save/read contract mismatch, not evidence that a particular classroom draft has already been lost.

The compatible candidate adds precisely those five existing host predicates to both native implementations (root/public client and canonical bridge HTML). It leaves schema version, IDs, timestamps, protocol, acknowledgement/CAS, retention rules and the host predicate unchanged. The separate media-intent candidate owns the shared cache token; this helper does not add a second token change or create a bridge mirror.

`recovery_draft_schema.test.js` has twenty actual-source cases: each missing draft field through atomic upsert and normalization, preservation of existing draft records, existing input/topic/builder controls, empty/metadata-only rejection, future-version rejection, and Compact age filtering with pinned/newest preservation. Two adapters cover native local and bridge helpers. The host normalizer supplies the existing acceptance/retention contract. Extraction boundaries are the same guarded production helper boundaries documented in `MEDIA-INTENT-REVIEW.md`; no native I/O/transport guarantee follows from these pure-helper checks.

Run the twenty-case baseline through its exclusive config:

```powershell
npx.cmd vitest run --config reports/classroom-reliability-followup-2026-10-03/draft-schema.vitest.config.js --maxWorkers=1 --reporter=json --outputFile=reports/classroom-reliability-followup-2026-10-03/draft-schema-baseline.json
```

Prepare after reviewed media-intent changes have been applied, so full-file guards describe the combined native candidate. Default preparation writes report snapshots/patches only, verifies exact unique substitution/reverse bytes and client parity, parses without executing production code, and records/rechecks hashes and HEAD. The coordinator alone uses `--apply` after review. Earlier full-file guards must never overwrite a later source edit.

```powershell
node reports/classroom-reliability-followup-2026-10-03/prepare_draft_schema.cjs
$env:ALLO_DRAFT_CLIENT='reports/classroom-reliability-followup-2026-10-03/draft-schema/candidate/0-allo_device_storage_module.js'
$env:ALLO_DRAFT_BRIDGE='reports/classroom-reliability-followup-2026-10-03/draft-schema/candidate/2-storage_bridge.html'
npx.cmd vitest run --config reports/classroom-reliability-followup-2026-10-03/draft-schema.vitest.config.js --maxWorkers=1 --reporter=json --outputFile=reports/classroom-reliability-followup-2026-10-03/draft-schema-candidate.json
Remove-Item Env:ALLO_DRAFT_CLIENT,Env:ALLO_DRAFT_BRIDGE
```

The host remains production by default. `ALLO_DRAFT_HOST` is an optional independent frozen-host override. Clear every override before reporting a production-source result. Retain baseline/intermediate failures; current CI/build/deployment and native/manual browser acceptance remain separate fields.
