# AlloFlow data privacy posture

Updated October 24, 2026. This describes the reviewed application paths for district evaluation. AlloFlow can use browser storage, downloaded files, peer connections, a teacher's local server, and optional remote services. Local-first operation does not mean that all content stays off servers or that every saved copy is encrypted.

For the proposed Portland Public Schools, Maine deployment, Gemini Canvas should use public or synthetic authoring material while its account, sharing, runtime API, storage, and deletion arrangements are approved. The three protected clinical tools block real records in Canvas by default and disable their external AI requests by default. A school sign-in, public app link, educator access code, or local configuration flag does not establish district approval or verified staff authorization.

The [school data flow inventory](audits/2026-10-24-school-district/data-flow-inventory.md) identifies the reviewed feature paths, recipients, persistence, and deletion boundaries. [DEPLOY_YOUR_OWN.md](../DEPLOY_YOUR_OWN.md) describes the owned deployment boundary; the [district cybersecurity audit](audits/2026-10-24-school-district/report.md) tracks remaining approval and deployment requirements.

## Deployment boundaries

| Deployment or service | Data boundary |
| --- | --- |
| Gemini Canvas | Google provides the surrounding Canvas service and may provision app storage. The generated app also runs its own requests, external modules, and optional integrations. Review those routes separately. Keep real clinical records blocked until the actual deployment is approved and configured. |
| Hosted browser app | Browser/device persistence and configured remote routes apply. Public hosting does not create an approved student-record service. Source rules and policy files take effect only through the reviewed deployment. |
| Desktop LAN classroom mode | The teacher's Desktop runtime serves the selected classroom session on the local network. This avoids Firestore for that session path, but the teacher machine is still a server and received/saved work still needs access and retention controls. |
| Owned Firebase live sessions | An explicitly selected project provides coordination, resources, supported answer/fallback paths and optional sync. Deploy the reviewed rules/index configuration and verify actual auth, App Check, access, expiry and cleanup behavior. The default browser Firebase configuration is hosting-only. |
| Optional Apps Script mailbox | The script owner's Google account provides cache/properties for live state and Drive storage for homework, complete submissions and delivered documents. Account ownership, deployment access, file sharing and retention require separate approval. |

Google describes enterprise protections for eligible Education users of the Gemini app. Its Canvas guidance separately warns that public links to shared multi-user apps can expose shared app data. Neither school-account use nor an automatically provisioned API key settles the agreement for every request a generated app makes. Confirm the effective service and terms for the chosen routes. [Google Education FAQ](https://knowledge.workspace.google.com/admin/generative-ai/workspace-with-gemini/gemini-for-google-workspace-faq-education), [Canvas safety guidance](https://support.google.com/gemini/answer/16419134?hl=en).

## Content and storage

Ordinary authoring and tool data can persist in localStorage, IndexedDB, the configured Canvas DeviceStorage bridge, or downloaded project files. Encryption of one recovery store does not encrypt all other tools, media, preferences, exports, or provider copies.

BehaviorLens, Dynamic Assessment and Report Writer now use a separate encrypted clinical workspace before real-record components open. Setup verifies an encrypted backup and offline recovery key before removing known readable legacy copies. The migration covers recognized clinical localStorage/sessionStorage keys and their Canvas preferences mirror; it preserves differing versions inside the encrypted store. Other-tool originals, older downloads, remote copies and data recreated by an older open app are outside that cleanup. See the [protected clinical workspace implementation](audits/2026-10-24-school-district/protected-clinical-workspace-followup.md).

Supported live responses can travel directly to the teacher through WebRTC. The selected backend can still receive session metadata, teacher-authored resources, signaling, supported answer receipts or fallback responses, and referenced assets. WebRTC signaling can include network addresses. Codenames and browser UIDs do not guarantee anonymity when records contain identifying context.

Teacher history cloud sync is a separate optional path. Its sanitizer removes selected media, including raw fluency audio, while retaining supported scored results such as metrics, word data and feedback. Turning sync off does not delete a document already stored in the cloud. Apps Script mailbox submissions can contain complete student work and persist in the script owner's Drive until deleted.

Source pointers: [DeviceStorage](../allo_device_storage_module.js), [history sanitization](../firestore_sync_module.js), [teacher history sync](../AlloFlowANTI.txt), [Firebase rules](../firestore.rules), [mailbox storage and submissions](../apps_script/session_mailbox/README.md).

## AI media and diagnostics

The configured AI operation can transmit instructions, selected source/context, images, audio or documents to its provider. A managed AI policy and the clinical policy are configuration controls; their effective route and settings must be verified in the deployment.

The three protected clinical tools require deployment approval before their guarded AI requests can proceed to editable text review. Automatic identifier removal can miss names or identifying context and does not anonymize attached images or recordings. It is not a general guarantee for all AI features.

Adventure portrait refinement and consistent-character scene generation can send an uploaded portrait to the configured image provider; scene generation can send it again. Teacher consent in the UI does not establish school approval or provider terms. Browser speech voices may use a local or remote service; selecting a browser voice is not an offline-processing guarantee. Schools must review allowed voices and cloud speech routes separately. [Browser voice service distinction](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).

Support reporting sends only after review under the configured support policy. Its credential removal and editable review reduce accidental disclosure but cannot guarantee that user free text contains no personal information. The built-in service gives newly stored reports a 30-day expiry; legacy reports, custom endpoints, external forms, platform logs and downloaded copies have separate retention boundaries. See the [support security follow-up](audits/2026-10-24-school-district/support-security-followup.md).

## Retention deletion and recovery

The [reviewed retention/deletion paths](audits/2026-10-24-school-district/retention-deletion-followup.md) now cover whole-store protected clinical deletion, selected expired-assignment cleanup in an owned Firebase project, and mailbox access expiry/manual Drive deletion evidence. These are separately scoped operations, not an all-app or per-student purge. Uncertain results stay unverified; retained backups, other tools and provider copies require separate outcomes.

The data owner must set a records schedule for each enabled store and recipient, including applicable holds. Closing a tab, ending a session, disabling sync, clearing one tool, or removing a parent record does not establish deletion of every copy.

Device recovery capacity/pruning settings protect recoverability; they are not a district retention schedule. Protected clinical buckets are not automatically aged out by the new setup. Exported backups, readable reports, clipboard/print copies, teacher downloads and submitted files require separate custody and deletion procedures. Losing a saved-records password and its offline recovery key can make locked work inaccessible.

Firestore TTL is asynchronous and must be active for the selected collection group. It does not delete a parent's subcollections. The current index file configures expiry for session assets, signaling peers and rate limits, rather than every session, assignment, answer or history store. Verify access expiry, recursive/orphan cleanup, and actual deletion separately. [TTL configuration](../firestore.indexes.json), [Firebase TTL behavior](https://firebase.google.com/docs/firestore/ttl).

## District review and historical claims

Approve a versioned feature/provider map with the actual account/project, data categories, purpose, permitted recipients, access controls, retention, deletion owner, recovery arrangements and release evidence. Shared staff services need verified identity and server-side authorization. An anonymous browser identity and an educator navigation code do not provide that boundary.

AlloFlow's source design does not itself establish FERPA, COPPA, Maine-law or other legal compliance. The district must approve the intended workflow and applicable agreements. Keep other optional school services, such as Educator Evaluation and School Rewards/Print Lab, within their separately approved data and account scope.

This revision replaces the July 2026 design memo's universal no-server, no-stored-content and automatic Workspace-coverage claims. The [earlier design memo](https://github.com/Apomera/AlloFlow/blob/46130b0a0caaa6acf472e21cc9450bcccf40d7e9/docs/DATA_PRIVACY_POSTURE.md) remains available for architectural history and should not be used as a current deployment or retention assurance.
