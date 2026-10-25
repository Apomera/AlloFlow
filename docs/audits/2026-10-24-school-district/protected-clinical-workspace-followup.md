# Protected clinical workspaces

October 24, 2026. Implemented locally after approval of the [sensitive-feature access design](sensitive-feature-access-design.md). This change has not been deployed, and it does not certify PPS or Gemini Canvas for student-record use.

## What changes for users

Ordinary lessons, student activities, and synthetic clinical examples remain available without an educator password. Opening real records in BehaviorLens, Dynamic Assessment, or Report Writer requires a separate encrypted clinical workspace. Resetting the educator access code does not decrypt this workspace.

Setup asks for a passphrase of at least ten characters, creates an offline recovery key, independently verifies an encrypted backup with that key, and requires confirmation that both were saved. Until this completes, the real-record components do not mount. Cancelled initial setup leaves the prior records untouched and does not leave a new password-protected primary store behind. Keep the recovery key separately in a district-approved location. Losing both password and key can make locked work inaccessible.

Manual locking saves registered editor drafts and encrypted buckets before clearing working maps, keys, transfers, and registered save callbacks. AI and export operations become invalid as locking begins. If saving fails, the app retains the key and work, shows an error, and suspends idle locking so the user can preserve the work. Optional idle locking supports 5, 15, or 30 minutes; manual locking is the default. A global indicator remains visible when records are unlocked after a clinical tool closes.

Report Writer defaults to encrypted autosave after protected setup, while honoring a previously explicit session-only preference. Unsaved session-only drafts block locking and encrypted backup. Temporary source documents remain transient; locking requires explicit preservation or discard, and backup requires confirmation that those temporary sources are excluded. These prompts retain the source documents in memory when cancelled. A saved-records backup is not an attachment archive.

## Storage and migration

The shared service reuses the existing AES-256-GCM vault and its password/recovery-key wrappers. New password envelopes use PBKDF2-SHA256 with 600,000 iterations. Feature buckets and their key names are encrypted in a separate DeviceStorage namespace, `protected_clinical_records/store_v1`; plaintext record metadata uses fixed feature identifiers and a generic title. Browser/session storage facades operate on the decrypted in-memory buckets and queue encrypted writes. There is no plaintext persistence fallback.

Migration recognizes these prefixes in localStorage, sessionStorage, and the Canvas DeviceStorage `ls_prefs/all` mirror:

| Tool | Recognized legacy prefixes |
| --- | --- |
| BehaviorLens | `behaviorLens_`, `bl_`, `allo_behaviorlens_` |
| Dynamic Assessment | `alloflow_dynamic_assessment_`, `alloflow_da_` |
| Report Writer | `allo_rw_` |

The migration first stages encryption in memory. It verifies the downloaded backup independently with the recovery key, commits the encrypted primary copy through atomic compare-and-swap to a connected durable backend, then removes only unchanged verified originals. Storage quota failure, a memory fallback, disconnected storage, concurrent clinical changes, or cleanup failure leaves setup incomplete and preserves recoverable copies. Other preferences remain untouched. New keys or changed records during migration require the older windows to be closed and their work preserved before retrying.

When sources differ, the current localStorage version is the initial working copy, followed by sessionStorage and the preferences mirror when no local copy exists. Every differing version is retained inside an encrypted preserved-copy archive and the backup. Each tool's protection bar offers retrieval after unlocking, with a readable-export confirmation. The original key and source are included in that retrieved file so it can be reviewed and imported deliberately.

Canvas preferences no longer hydrate clinical keys into ordinary localStorage or snapshot new local clinical values. Preference snapshots preserve existing legacy clinical entries until verified migration removes them, using fresh reads and atomic compare-and-swap retries. This prevents a stale cooperating snapshot from resurrecting a cleaned mirror. An older application version or noncooperating tab can still recreate readable records; close those windows before migration and use only the reviewed release for student data. Browser localStorage does not support an atomic read-and-delete operation across old tabs.

Concurrent encrypted edits to the same feature reject stale writes and retain the current window's work. Different feature buckets merge through the vault's atomic repository. A broadcast lock request asks cooperating tabs to save and lock; a tab with a failed save stays unlocked with an error. Password recovery does not revoke a key already held by another unlocked tab.

## Transfers, exports, and AI

The real-record boundary wraps clinical components before hooks, imports, or browser-storage reads. Sessions use private capability metadata and revocable epochs. Learner context and unapproved Canvas deployments cannot open records; a role flag does not establish staff identity. Late AI, file, and media operations cannot use a stale session after locking or changing case. BehaviorLens and Dynamic Assessment tests exercise the actual core, encryption, migration, lock, and restoration paths.

BehaviorLens legacy clinical Firebase auth/sync is disabled. Dynamic Assessment no longer publishes clinical records to the main application's ordinary history, generated-content/image state, or delegated generator. Automatic imports from other tools are disabled; explicit post-unlock imports explain that other-tool originals remain outside this encrypted store. DA-to-Report-Writer transfer uses protected transient memory cleared on lock. Readable downloads, clipboard, printing, and explicit transfers out of the clinical workspace require confirmation; an encrypted saved-records backup does not use that readable-copy warning.

External clinical AI is disabled by default. Deployment configuration can enable reviewed requests per tool, after which the existing per-request identifier-removal and editable-review boundary still applies. This does not establish de-identification, authorize every media type, or control unrelated AI features.

## Deployment configuration and remaining requirements

The default blocks real student records in Gemini Canvas. A reviewed deployment may supply this configuration before the service loads:

```js
window.ALLOFLOW_SENSITIVE_WORKSPACE_POLICY = {
  version: 1,
  allowCanvasRecords: false,
  allowExternalAi: []
};
```

Permitted AI identifiers are `behavior-lens`, `dynamic-assessment`, and `report-writer`. Unknown fields, malformed values, or an explicitly undefined policy fail closed. Setting an allow flag is a deployment decision; it is not proof of district approval, a verified staff account, an AI contract, or a technical boundary against someone controlling page code.

Before real-record use, PPS must approve the actual hosting/account, storage bridge, providers, data flows, retention, recovery-key custody, managed-device restrictions, and applicable agreements. Shared services still require verified staff identity and server-side authorization. Encryption protects locked data at rest; it does not protect an unlocked page from malicious scripts, a compromised device, or an authorized readable export. Other application stores, existing project files/downloads, old provider copies, and other-tool originals are outside this migration.

Ship the reviewed source modules and matching public mirrors together, update reviewed browser-delivery hashes, and build a coherent release from the coordinated checkout. Do not distribute a new Canvas source against older CDN modules. The shared checkout contains unrelated ongoing work; this pass uses bounded module generation, complete host JSX parsing, and focused tests rather than a broad rebuild or deployment. The browser check uses a synthetic isolated origin and real production crypto/IndexedDB; it does not verify Google's live Canvas runtime or district account policy.

## Validation evidence

All 569 focused tests passed across 48 files, plus 17 synthetic native-browser checks. These cover the shared core and host delivery (53), preferences/storage contracts (66), Report Writer (367), BehaviorLens local preservation and disabled sync (17), Dynamic Assessment isolation/adapter checks (25), and the BehaviorLens/Dynamic Assessment protected-boundary and AI suites (41). The existing isolation checker and bounded diff whitespace check also passed. No full-repository build, district rollout, or live Canvas test was performed.

The [machine-readable validation record](protected-clinical-workspace-validation.json) records exact test groups, synthetic browser checks, source hashes, and remaining limitations. The [browser results](protected-records-browser-checks.json) cover setup, encrypted backup, cleanup of local and mirrored copies, preserved older versions, wrong-password rejection, saving the latest UI draft before lock, reload, independent recovery, the global indicator, and mobile layout. Screenshots contain synthetic test text only.
