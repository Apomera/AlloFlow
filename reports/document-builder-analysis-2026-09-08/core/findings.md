# Document Builder editing and persistence review — 2026-09-08

Read-only review; no application files changed. Exact production functions were exercised in isolated VM/JSDOM probes. This is not a claim of live application or destination-app validation. Reproduce with `node reports/document-builder-analysis-2026-09-08/core/workflow-probes.cjs`.

Evidence: `probe-results.json` records four source-runtime cases; `source-evidence.json` contains SHA-256 hashes of the current source files, exact source offsets and AST declaration line ranges, and the bulk-toggle probe. Sources: `view_export_preview_source.jsx` SHA-256 `7d35226d07a583fd57f03707d4f865eb0c3ed32b06b7ae5509fc546d310f9551`; `AlloFlowANTI.txt` SHA-256 `21ee653640a92bea17a7e6dc101e9d622854b9f8e36b098d9b401ff3e8e76713`.

## Confirmed, high priority: stale comparison can replace an unrelated paragraph

Evidence: view_export_preview_source.jsx:3303–3330, 7430–7446, 9684–9704, 10921–10944.

Compare stores before/after block indexes. Use saved block later reads the current block at that index and checks only its tag and pending-change status. It does not verify the compared text/HTML or document revision. Typing does not invalidate the comparison. The UI explicitly promises to preserve the rest of the document.

Reproduction: compare a saved version with a modified first paragraph, insert a new paragraph above that paragraph, then choose Use saved block. The probe accepted the restore, deleted the newly inserted unrelated paragraph and left the intended original paragraph edited. Track Changes off is sufficient.

Recommended scope: bind comparison to the current document revision and exact block identity; refuse stale or ambiguous matches with a Compare again action. Test insertion, removal, reordering and duplicate blocks before restore.

## Confirmed, high priority: delayed edit capture removes saved-draft attribution after close

Evidence: view_export_preview_source.jsx:10907–10919, 10943–10944; AlloFlowANTI.txt:38814, 38837–38843, 39040–39048, 41101–41105.

The input listener schedules a function-local 800 ms timer. Its callback writes window.__alloBuilderEditedPack = {html,at} even after unmount; mountedRef guards only the later state update. Closing Builder first syncs a correctly attributed record containing source/historySignature/resourceIds, but clears only the different Canvas recovery timer. The pending callback can then replace that record with an unattributed one, which fails the project pack and automatic reopen guards.

Reproduction: edit a History document, close within 800 ms, wait one second, then save the project or reopen. The probe invokes the actual host sync, detaches the preview, invokes the deferred capture body, then calls the actual project pack callback. Source/historySignature disappear and project packing returns null.

Precise limitation: this loses draft eligibility/attribution, not necessarily the edit bytes. The session record still contains HTML and separate local recovery may retain it or mask failed automatic reopening. Do not describe all edits as irrecoverably lost.

Recommended scope: flush or cancel the same capture timer on close, preserve attribution in every producer, and check source document/session ownership before any delayed write. Cover close-before-debounce, reopen and project save together.

## Confirmed, high priority: local recovery is not bound to the current document

Evidence: view_export_preview_source.jsx:3849–3853, 7244–7267, 7355–7401, 9557–9562.

The local-draft key uses source, mode, title and only history count/first/last IDs. It omits remediation document identity and Guided resource selection. The stored record has no content signature or resource selection to validate after reading. The recovery prompt gives a timestamp without source identity; Restore writes that HTML to the current preview.

Reproduction: save a local edit for PDF A, then open PDF B with the same Builder title and unchanged workspace History. Both use the same recovery and version store. Different Guided resource selections from the same History also collide. The exact key calculation confirmed both cases in the probe. Project-file draft restoration already has stronger history/resource checks; local recovery bypasses them.

Recommended scope: stable source identity plus selection and a bounded digest, stored metadata validation, and a named source in the recovery prompt. Avoid identity keys made by truncating a readable concatenation.

## Confirmed, medium priority: version comparison claims a match after a figure replacement

Evidence: view_export_preview_source.jsx:3160–3204, 3280–3300, 9702–9704.

The comparison only compares normalized text blocks. Images are absent from the selector, and matching disregards alt text, link targets and formatting. Replacing first.png with second.png while retaining lesson text reports changed:0 and truncated:false. The UI says the current document matches the saved version. The 400-block window also uses a generic first-24-changes notice rather than disclosing the inspected content window.

Recommended scope: call the current result a text comparison. Add separate asset/structural changes for figures, alt text, links and table semantics before claiming full equivalence.

## Confirmed, medium priority: bulk resource toggle misses two visible resource types

Evidence: view_export_preview_source.jsx:8240–8248, 8263–8264, 8293. This independently confirms the parent review finding.

The bulk resourceKeys list omits includeMemoryAid and includeAppliedChallenge. Their visible checkboxes default to included unless explicitly false. Starting with the bulk keys true and those two absent, Deselect All leaves both checked. Starting with those two explicitly false, Select All leaves both unchecked. The exact current key list and effective checkbox default were evaluated in source-evidence.json.

Recommended scope: derive the bulk toggle from the same resource definitions and effective defaults that render the visible checkboxes, with a mixed resource regression.

## Recommendation requiring browser follow-up: one understandable Undo history

Typing/formatting Undo routes through doc.execCommand (view_export_preview_source.jsx:4661–4698, 11517–11518). Header/footer changes mutate DOM directly (5138–5198), as do page setup (4115–4163) and individual version restore (3321). These actions use distinct snapshot/Track Changes mechanisms rather than one transaction history. This is a source-confirmed architectural split; this pass did not run a browser Undo failure test.

Test type → structural action → Undo/Redo in the supported browser before expanding the editing surface. Then document which actions the main Undo controls reverse, or give unsupported actions named rollback points and eventually a common bounded command history.

## Existing strengths and verification limits

Project persistence already validates history signatures and scoped resource IDs, sanitizes imports, compresses/deduplicates image assets and rejects stale imports. Closing a genuinely edited remediation document updates canonical HTML and invalidates verification (AlloFlowANTI.txt:38788–38832). Reuse those safeguards for local recovery. Earlier fixes for short/image-led live export, draft dismissal, export locking and Guided handoff were reviewed and are not repeated as new issues.

No broad tests were run. The isolated behavioral probes completed with exit 0 and intentionally assert present adverse behavior; they are audit evidence scripts, not tests of an approved fix.
