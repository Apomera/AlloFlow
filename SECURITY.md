# Security Policy

AlloFlow is built with the fundamental belief that student privacy is a non-negotiable human right. We prioritize robust architecture to ensure the software remains radically helpful without turning children into data products.

## Supported Versions

| Version / channel | Supported |
| ------- | ------------------ |
| Current `main` branch and latest local Desktop package work | :white_check_mark: |
| Older local snapshots or pre-Desktop builds | Unsupported for district/student-data use; upgrade to the reviewed release |

## Dependency checks before release

Run `npm run verify:audit` before releasing. The check covers the root, desktop,
web app, Firebase functions, local MCP runtime, remote MCP service and runner,
accessibility audit tools, and trailer lockfiles. It does not install packages
or execute package lifecycle scripts, and it does not require `node_modules`.
Missing lockfiles, registry failures, invalid responses, and timeouts produce
exit code 2 (incomplete); high or critical findings produce exit code 1.
Exit code 0 means every selected audit completed below the threshold.

Use `node dev-tools/check_npm_audit.cjs --scope=desktop/web-app/functions` for a
targeted check, `--include-moderate` for a stricter threshold, or `--json` for a
machine-readable report. `--production` explicitly omits development dependencies;
it is not sufficient for desktop release review because Electron is declared as
a development dependency but ships in the application.

Audit findings identify vulnerable package versions, not confirmed exploitation.
Review the affected code paths, update within supported version ranges where
possible, and test affected functionality before packaging or deployment. A
lockfile update takes effect only after dependencies are installed and the
affected application is rebuilt or redeployed. Never use a failed or skipped
audit as evidence that a release is safe.

The remote MCP verification workflow also audits its complete lockfile at the
high/critical threshold. For desktop upgrades, run
`npm --prefix desktop run verify:release` after installing the updated dependencies. For remote MCP
upgrades, regenerate Wrangler types and run the service's full `check` and
`runner:check` commands in Linux CI before deployment. Keep the previous signed
desktop installer and Worker release available until the new release passes its
installation and staging canary checks.

Imported or AI-generated markup must be sanitized at each live preview boundary,
even when it carries an AlloFlow-generated marker. The reconstructed-table preview
uses the remediation sanitizer, removes document-wide style blocks, and preserves
table semantics and review controls if a safe preview cannot be produced. Its
regression tests cover malicious attributes, active elements, safe links, math,
and accessible table headers.

## Architecture & Data Safety (FERPA-Aligned Design)

AlloFlow is designed to support school-controlled, FERPA-aligned deployments. The everyday local-first path is **AlloFlow Desktop**, which can keep the bundled app, local settings, local engine options, and same-room LAN classroom sessions on the teacher machine without Docker. The **School Box Server** Docker stack remains optional infrastructure for schools that need a server/appliance path. Compliance still depends on district policy, contracts, access controls, retention, consent, and actual use.

### 1. Zero-PII Cloud Policy
Even when using a cloud-hosted version of AlloFlow, ordinary saves use browser storage or downloaded project files rather than developer-owned student-profile databases. Live-session and optional sync behavior depends on the selected backend and deployment mode; those paths should stay data-minimized, short-lived, and school-controlled wherever possible.

### 2. Sensitive AI text review
**Report Writer**, **BehaviorLens**, and **Dynamic Assessment** use a shared review boundary for their guarded AI text requests. Common identifiers are removed from an outgoing copy, and the user reviews and can edit that copy before sending. Search-query text is reviewed separately where supplied. Missing review support, cancellation, or a changed case blocks transmission. Original clinical records remain unchanged by the review.

Automatic removal can miss unlisted names, school details, and identifying context; it is not a de-identification guarantee. Text removal does not anonymize attached recordings or images. District approval of the actual provider, permitted purpose, media, contracts, and retention remains necessary. The protected clinical tools disable external AI by default; an explicit deployment policy must approve each tool before its guarded requests can proceed to review. Dynamic Assessment's legacy delegated host-generation and main-history publishing paths are disabled to avoid readable clinical copies outside its protected store. These controls do not establish that every AI feature in the application uses the same boundary, or replace professional review of generated clinical content.

### 3. TeacherGate Authentication
`TeacherGate` restricts access to staff-facing modules in the application interface. It is not a substitute for verified staff identity, server-side authorization, or district-managed devices. Sensitive records and teacher-only server operations require controls in the actual deployment; browser UI state alone must not be treated as proof of staff authorization.

BehaviorLens, Dynamic Assessment, and Report Writer now require a separate protected clinical workspace before their real-record components mount. Ordinary lessons, student activities, and synthetic examples remain available without this saved-records password. These tools save their protected buckets with authenticated encryption, require a verified encrypted backup and offline recovery-key confirmation at setup, and save before locking. A failed save keeps the window unlocked with its work available. Losing both password and recovery key can make locked records inaccessible.

Migration covers known clinical keys in localStorage, sessionStorage, and the Canvas `ls_prefs/all` mirror. Verified encrypted copies are committed to connected persistent storage before exact readable originals are removed. Differing versions are preserved as encrypted older copies; memory-only storage, conflicts, and cleanup failures cannot finalize setup. Ordinary preference snapshots neither hydrate clinical records nor create new clinical copies. This does not remove other-tool stores, old downloads, remote provider copies, or records recreated by an older open application version.

Real-record mode is blocked in Gemini Canvas unless an explicit deployment policy approves it. That policy is configuration, not staff authentication or district approval evidence. Legacy clinical Firebase sync is disabled; this change provisions no district identity service or clinical server. See the [protected clinical workspace implementation](docs/audits/2026-10-24-school-district/protected-clinical-workspace-followup.md) for policy configuration, coverage, validation, and release requirements.

### 4. Live-session metadata validation
The versioned Firestore rules limit non-host roster changes to known, bounded student fields and preserve teacher-owned or unknown legacy fields unchanged. Each update changes at most five fields and one specialized progress family, matching the current client write patterns; universal activity progress may accompany that family. Reaction updates accept only the supported emoji and timestamp shape. Rejoining clients update individual join fields so they preserve teacher assignments, including changes made after the client's session read.

These rules must be tested and deployed to an owned Firebase project to take effect. They do not configure Gemini Canvas's provisioned backend, LAN sessions, or Apps Script mailboxes. The session creator's Firebase UID still establishes host ownership; this does not verify that the creator is district staff. Allowed short strings can contain identifying information, and host writes are outside this student-field restriction. See the [session metadata security follow-up](docs/audits/2026-10-24-school-district/session-metadata-security-followup.md) for validation and release requirements.

The separate local Desktop LAN and revision-25 mailbox implementations now compare whole participant roster replacements with current server data, preserving teacher-owned and unknown fields. They reject UID deletion/spoofing, malformed containers and ambiguous replacements while retaining bounded student progress and reading preferences. Mailbox fixed schemas require own-property membership. These changes require the reviewed Desktop/client release or an owned Apps Script update before they affect classrooms. See the [LAN and mailbox authorization follow-up](docs/audits/2026-10-24-school-district/session-transport-authorization-followup.md).

## Browser delivery and release safeguards

The reviewed host now embeds SHA-384 approvals for its module/plugin loaders, and release builds verify source, public, and packaged asset bytes. Boot scripts/styles and offline shell/static assets receive integrity checks; older classroom workers retain their release until an update is accepted. MCP publishing privileges are separated from tagged-source verification, with checksum/provenance checks and blocking browser regressions in CI.

These changes are local and require a fresh verified release before they protect deployed classrooms. Initial HTML/build-system trust, optional third-party resources, provider account controls, and branch/deployment settings remain separate boundaries. See the [browser delivery and release validation record](docs/audits/2026-10-24-school-district/browser-delivery-release-safeguards.md) for exact coverage, evidence, and release requirements.

The [optional-loader follow-up](docs/audits/2026-10-24-school-district/optional-browser-loader-coverage.md) pins the host's optional vendor chains and shared STEM loading, removes unsigned storage-mirror exceptions, and checks vendor bytes through packaging and publication. It records the separate tool-private and module/worker import graphs that still require owner-specific review.

### 5. Assignment expiry and dependent records
The versioned Firestore rules propagate assignment expiry to non-host participant updates, learner private-board answers, guest signaling, and shared-asset reads. Missing parents and missing/malformed assignment expiry deny those dependent access paths. Existing host/owner maintenance and cleanup permissions remain under their ownership checks. Legacy live-session lifetimes are unchanged. The latent Firebase Driving Questions item reader also requires authentication before its host/own/approved-item rules can apply.

These checks deny access; they do not recursively delete retained records or activate TTL. Deploy and verify the rules in an owned project before relying on them. They do not configure Google's provisioned Canvas backend or establish district staff identity. See the [expiry and speech follow-up](docs/audits/2026-10-24-school-district/expiry-and-speech-security-followup.md).

### 6. Managed speech requests
The speech module's queued and direct cloud fallback paths honor the managed AI media restriction. A blocked provider call cannot fall back to direct Gemini speech; policy is checked again before dispatch. Speech diagnostics use text lengths rather than spoken-text previews and omit raw provider error bodies. Existing local/browser speech routes remain, and browser or OS voices may use network services outside this fetch boundary.

Managed policy must be explicitly configured and verified for a district deployment. An absent or null managed policy retains existing unmanaged behavior. This is a browser routing control, not service-side authorization or approval of a provider. The [current data-flow inventory](docs/audits/2026-10-24-school-district/data-flow-inventory.md) describes separate persistence and deletion responsibilities.

### 7. Retention and reviewed deletion
The protected clinical workspace now supports reviewed deletion of its complete three-tool store. It requires the current password, a typed scope confirmation and retention/hold/window acknowledgments. Drafts are saved before review, concurrent changes block deletion, and an exact-revision non-content marker prevents stale cooperating writers from recreating the store. Uncertain commits remain paused until reconciled; they do not reopen normal saving. Backups, other stores, old application copies and forensic storage erasure are excluded.

An owned-project Firestore operator tool creates bounded plans for expired assignments using whitelisted metadata and defaults to dry run. Execution requires a reviewed hash, explicit project, hold review and paused writers. It enumerates nested and associated records, uses server update-time preconditions, deletes the parent last, and verifies results. Its receipts distinguish partial failure and scoped absence at a check; they do not claim all-store deletion.

Mailbox revision 26 preserves the original absolute six-hour session deadline across cache refill and serializes lifecycle changes. Its offline Drive review tool and runbook distinguish ending sessions, trashing packs, submitted/delivered files, provider retention and copies elsewhere. These changes require the reviewed client/script release or an authorized operator run before affecting actual records. No production cleanup is implied by source or synthetic test results. See the [retention and deletion implementation](docs/audits/2026-10-24-school-district/retention-deletion-followup.md).

### 8. Managed request authorization and dispatch
Provider and Gemini requests now capture their connection, credential, model and ordinary request options before asynchronous approval. A synchronous guard checks policy again at dispatch, retries, repairs and fallbacks. Search checks also run after asynchronous authentication headers. Malformed policy and model URL fragments fail closed; a policy change blocks pending requests. The shared retry helper and early boot fallback honor the same guard contract.

Configured managed deployments block legacy URL/video imports that used public relays or direct Gemini; manual paste and local-file workflows remain available. Source-import diagnostics omit source URLs, capability queries and provider response bodies. Absent/null policy retains unmanaged behavior, so district configuration is still required. This is client routing protection, not verified staff identity or service-side authorization. See the [managed request implementation and validation](docs/audits/2026-10-24-school-district/managed-request-security-followup.md) for policy schema, coverage and release limits.

## Reporting a Vulnerability

If you discover a vulnerability—especially one that could bypass `TeacherGate`, expose local-storage JSON payloads across origins, or leak PII via an improperly handled AI inference prompt—please report it immediately.

### How to Report:
1. Contact the primary maintainer directly.
2. Please include a clear description of the vulnerability and exactly how to reproduce it (e.g., "The STEM Lab module loader allows arbitrary XSS injection via the CDN hash parameterization").
3. DO NOT open a public GitHub Issue for critical security flaws until the patch has been tested and merged.

We will acknowledge receipt of your vulnerability report within 48 hours and strive to issue a patch to the main branch within 5 business days.

## Support diagnostics

The reporter's guarded send path requires review of an editable outgoing copy, with credential removal before storage, truncation, copying, and dispatch. Deployment-owned support policy can disable external reporting or select an approved HTTPS endpoint. Invalid policy blocks external sends; policy-aware fallback checks also cover the settings entry point and independent translation/item-correction feedback routes. These browser controls do not replace service-side authorization or district network policy, and automatic removal does not establish that free text is de-identified.

The updated built-in bug service gives newly stored reports a 30-day expiration and bounds newly appended review-note retention. This does not expire legacy records, external support-provider copies, or other application data stores. See the [support security implementation and configuration](docs/audits/2026-10-24-school-district/support-security-followup.md) for scope, validation, and release requirements.

*Thank you for helping keep our schools and students safe.*
