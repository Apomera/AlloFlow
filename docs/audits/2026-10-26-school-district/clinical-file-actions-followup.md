# Clinical file actions: stale imports and failed output

October 26, 2026. Continued local cybersecurity work for the proposed Gemini Canvas / Portland Public Schools, Maine K–12 workflow. This pass follows the [temporary-data fixes](clinical-transient-data-followup.md). Read-only coordination left release builds, CI reconciliation, private runtime loaders and cloud services with their existing workstreams. No real student records were used.

## Corrected findings

**A pending restore could reopen a locked workspace.** The protected workspace's restore form awaited `file.text()` before calling the service. Locking during that read advanced the service epoch, but the old continuation then began a fresh restore with its captured password. Actual React and encrypted-service tests reproduced records reopening after that lock, and a restore starting on an old service after the view switched to another service.

UI actions now belong to an individual view owner and resolved service. Before a delayed restore starts, the continuation checks that owner and the captured workspace phase, epoch and recovery identity. Unmount, lock or replacement invalidates it. Old completion callbacks cannot clear another action's busy state, credentials or errors. The default-service initialization path also checks resolved-service ownership, so a fresh click cannot use a retained old service while its replacement loads. Independent review identified that initialization case and it was corrected before final validation. The existing cryptography, restore-store conflict checks and recovery format are unchanged.

**A delayed BehaviorLens import could mix students' records.** The mounted UI reproduction selected a partial export for synthetic student A, switched to student B before the file read finished, and accepted the old import confirmation. Entries from A were then added to B's saved workspace. The file action now captures its protected session and workspace-selection identity. It checks them before parsing and again after asynchronous confirmation, before staging or merging records. A switch away and back, lock, or unmount invalidates the old action; stale errors and success messages are suppressed. Normal imports, new-student backups and practice-workspace isolation remain covered by regression tests.

**Failed report and assessment downloads retained readable data.** Both tools created Blob URLs and body-level anchors that could survive a thrown download click. Dynamic Assessment also retained a URL after invalid filename preparation or when another action removed the anchor before its cleanup timer ran. All four assessment download paths now share guarded cleanup: failure revokes the URL and removes the anchor, while successful handoff retains its existing short browser-consumption window. URL revocation does not depend on the anchor still being attached.

Report Writer now removes its temporary anchor and revokes its Blob URL on failure. It marks a snapshot saved only after the browser download click returns successfully, preserving the unsaved-work and close/reload warnings when file creation or handoff throws. A successful click is download initiation, not proof that the operating system finished saving a file. Failed print preparation or printing now blanks and closes the temporary readable popup; successful print previews remain available as before.

## Validation

**122 focused tests passed across 13 files** against the final four-module source snapshot. **37 native Edge checks passed**, and all **12 scoped asset/host integrity checks** passed. Runtime/public mirrors and full host parsing passed. A separate compatibility file passed six checks and retained one reproduced pre-existing cloud-control test failure; that failing check is excluded from the focused total.

Native restore checks verify cancellation after lock, service replacement and unmount, preservation of a replacement action, and successful current restores. The native BehaviorLens harness mounts the full module over the real protected service and confirms current import, case-switch cancellation, switch-away/back cancellation, confirmation-time rechecks, unmount/lock cancellation and preservation of both students’ existing records. All candidate checks use the final reviewed sources. The assessment browser harness was corrected to obtain a fresh session after unlocking; its earlier stale-handle error was in the harness, with no production change needed.

The selected new regressions cover both blocked stale actions and allowed current actions. The BehaviorLens import reproduction uses the mounted component, a delayed native FileReader and saved synthetic records. Report Writer's mounted protected-service regression verifies that a failed download keeps the draft and unsaved-work warning. Restore tests mount actual React boundaries over real encryption; supported minimum PBKDF2 settings are used only in synthetic fixtures.

Native browser checks and their precise boundaries are recorded in the [validation record](clinical-file-actions-validation.json). Report/assessment output checks use native DOM, Blob URLs and synthetic popups, with clicks and printing deliberately stubbed or made to fail. Navigation is fulfilled locally and external requests are blocked. These checks do not send a record to a provider, download a real school file or operate a printer.

One existing BehaviorLens cloud-copy UI test fails because it expects a legacy cloud control that is absent. Running that test against the preserved pre-change source reproduced the identical failure. It remains outside this file-action change and is reported separately; its failure is not counted as a passing check. The release workstream retains ownership of broader test reconciliation.

## Delivery and remaining limits

The four changed runtime modules have matching public copies. All three host files receive only those assets' integrity/size approvals and loader cache identities. Full parsing and the actual embedded delivery policy verify those bounded changes. Existing differences between host policy and the canonical policy source remain with coordinated release reconciliation; no repository-wide green release claim is made.

These are local lifecycle and data-integrity controls. They do not provide staff identity, secure memory erasure, remote deletion or retraction of an already delivered export or print job. Sensitive Canvas use still requires a verified release, actual managed-workflow validation and PPS approval. Real-record access and clinical external AI remain disabled by default.

Nothing was committed, pushed or deployed, and no release build or district/cloud account change was performed for this pass.
