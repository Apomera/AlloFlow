# EPPP QA provenance

This directory is the canonical, non-runtime home for EPPP quality evidence.

- `evidence/audit/` contains automated content-audit and inventory snapshots.
- `evidence/curation/` contains the 500-, 1,000-, and 1,500-item curation records.
- `evidence/adjudication/` contains quarantined editorial adjudication batches and their index.
- `evidence/review/` contains the review docket, ledger, progress record, and bulk-review wave.
- `evidence/manifest.json` binds every live evidence byte with SHA-256 and byte length.
- `relocation_baseline_v1.json` binds all 44 original blobs to their source Git commit and historical paths.
- `history/v1/audit/` preserves the four exact originals whose live audit/inventory reports were later regenerated from the frozen archive.

The evidence is intentionally not copied to `desktop/web-app/public`: it is QA provenance, not a learner runtime dependency. Learner-linked review artifacts remain under `test_prep/` and are outside this archive.

`test_prep/eppp_legacy` remains a separate migration-source boundary. Its JavaScript, HTML, styles, and media may be read by migration or reproducibility tooling, but QA evidence must not be written there.

Rebuild the integrity manifest after intentionally changing evidence:

```powershell
node dev-tools/build_eppp_evidence_manifest.cjs
```
