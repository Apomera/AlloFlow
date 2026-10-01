# Safe document-library reads

Added `createProjectStore().loadState()` in `stem_lab/stem_lumen_evidence.js` and its public mirror. This lets library mutations distinguish a genuinely new library from storage that temporarily cannot be read. The old `load()` API keeps its best-effort project-or-null behavior; both APIs use the same queued backend reader and snapshot-selection rules.

## Contract

- Valid project: `{ ok: true, project, reason: '', medium: 'indexeddb' | 'localstorage' }`.
- Confirmed absence or an authoritative tombstone: `{ ok: true, project: null, reason: 'empty', medium: null }`.
- Any configured backend is unreadable, lacks a read method, or no backend is configured: `{ ok: false, project: null, reason: 'unavailable', medium: null }`.
- A configured backend contains invalid JSON, an invalid snapshot, an unsupported storage envelope, a missing/null/non-array `sources` collection, or other malformed project collections: `{ ok: false, project: null, reason: 'corrupt', medium: null }`.

An inaccessible primary can have acknowledged a stale fallback, while an inaccessible fallback can hold a newer save. Consequently, safe reads fail even when another backend has an accessible project. A store deliberately configured with just one readable backend is supported. Once all configured backends can be read, the established identity/acknowledgment rules select the latest primary or fallback snapshot.

The safe path passes `{ throwOnError: true }` to the existing host storage adapter. Without this flag, `UtilsPure.storageDB.get` converts IndexedDB and decoding failures to `null`, defeating the distinction. JSON decoding `SyntaxError`s are classified as corruption. Save and clear result shapes are unchanged.

## Validation

Command: `npx.cmd vitest run tests/lumen_storage_load_state.test.js tests/lumen_storage_recovery.test.js tests/lumen_evidence.test.js tests/lumen_source_controls.test.js --maxWorkers=1`.

Result: **64 tests passed across 4 files**, including 28 new read-state cases. Coverage includes strict adapter behavior, failed primary with empty fallback, unreadable fallback with valid primary, invalid snapshots and source arrays, valid recovery, legacy records with `sources: []`, single-backend stores, tombstones, and ordered save/read/clear operations.

The public mirror matched the canonical file before editing. Synchronization retried successfully after one transient Windows mapped-file lock. No deployment, host edits, helper edits, or changes to the shared storage adapter were made by this subtask.

## Read-only follow-up observations

The separate research-evidence inspector caches snapshots under `alloflow.research-evidence.v1.*` without bounding or pruning entries. In an isolated synthetic 5,000-character storage quota, ten generations of one 1,200-character passage produced three old entries and seven failed writes; the latest passage remained available only in memory and disappeared after reload. The source text still retained its readable appendix. Cache limits and fresh-device viewer recovery remain separate helper work.

The shared host storage adapter can mirror project data through its configured DataService bridge. This subtask retains that behavior; wording that promises the extracted text always stays on one device needs to account for bridge-enabled configurations.
