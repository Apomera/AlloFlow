# Storage replies bound to the requesting document

October 26, 2026. Continuation of the Gemini Canvas / Portland Public Schools, Maine K–12 audit. This pass addresses the opaque-document navigation limitation recorded in the [previous storage follow-up](storage-boundaries-followup.md). It is local source work and synthetic validation; no production records were accessed and no release was deployed.

## Confirmed issue

The former `ds1` bridge checked the requesting window, observed origin and connection nonce. Those checks did not bind replies to the lifetime of an opaque document: a replacement document can retain the same window identity, while opaque origins require a wildcard window reply target. In native Edge, an approved synthetic opaque page requested a stored test value, navigated while the reply was held at a controlled test barrier, and its replacement received that value. The barrier delayed a completed read without changing authorization or reply routing. This is a reproduced source-level disclosure path, not evidence that real student records were disclosed.

The web messaging specification cautions against wildcard delivery of confidential information and describes MessagePorts as transferable communication capabilities. The implementation now uses that mechanism to keep record traffic off window messaging. [WHATWG HTML messaging specification](https://html.spec.whatwg.org/multipage/web-messaging.html).

## Implemented boundary

The adapter and bridge now speak `ds2`. The window handshake validates the exact source, bridge origin, nonce and actual popup/iframe channel. It carries only a request to establish a channel. The adapter then transfers one endpoint of a MessageChannel to the bridge. The bridge accepts one channel for its lifetime; subsequent attempts cannot replace it.

Consent status, approval, readiness, operations, results and storage errors travel exclusively over that port. Window messages cannot authorize a client, read or mutate a namespace, or deliver a record. A replacement page does not inherit the original document's port. Source/origin checks still apply to the initial transfer; a port does not establish the identity of an educator.

Denial, pagehide, explicit disconnect and message-decoding failures invalidate the connection and pending callbacks. Adapter send failures and request timeouts close the transport and reject outstanding operations. An already accepted storage transaction may still finish; timeout is not a rollback receipt. Existing vault/recovery reconciliation remains necessary for uncertain writes.

The prior consent controls remain: remembered grants match the exact concrete origin and connection type, opaque clients approve each connection, and iframe approval uses a separate confirmation window without opening or moving the record store. Database names, namespaces, record formats, encryption and existing stored data are unchanged. Same-origin access and separate clinical encryption retain their existing scope.

## Verification

The core run passed 187 tests across 13 files, with no failures or skips. Coverage includes port-only transport, legacy refusal, malformed and replacement ports, origin/nonce checks, cancellation races, and existing storage/clinical consistency and deletion controls.

The two additional report/recovery suites passed 29 tests and failed five preference-fixture cases. Their unchanged preferences mock exposes only set(), while the current preferences code requires status() and compareAndSwap(). The separate CI agent is already investigating that exact fixture; this pass updates only the ds2 transport fixtures and leaves those unrelated repairs with that agent. All transport/acknowledgment and mixed-resource reload cases in that run passed. The full failed run and five failure names remain in the evidence; this is not an all-green suite claim. Overall, 216 unique tests passed and five failed across 15 files.

Fifteen native Edge checks passed using locally fulfilled test origins, native IndexedDB and MessageChannel, and synthetic values only. They cover the reproduced navigation case, navigation during pending approval, rejected window writes and replacement ports, actual-adapter opaque iframe saves and reopened records, fresh opaque approval, concrete-origin grant reuse, denial and bridge navigation with a pending read. No record or readiness message reached the replacement document. The browser runner exited successfully.

The browser harness delays only the navigation test read; application approval and response routing are production code. It is not an authenticated Canvas/PPS session and does not reproduce district browser policy. Same-iframe record continuity in the harness is not proof of persistence across actual Canvas sessions or all browser partition policies. The [validation record](storage-document-channel-validation.json) binds the results to source hashes and records the baseline, unit coverage, browser evidence and delivery checks.

## Release and district requirements

`ds1` clients receive an upgrade-required error from the new bridge and cannot access records through the old window protocol. A new adapter against an old bridge fails to establish a secure connection. Unsupported or failed MessageChannel setup does not silently select memory or switch an iframe into the popup's different store. This compatibility break requires a coordinated adapter, bridge and host release; retained records are not erased by refusal to connect.

The root and public copies match. Only the adapter's approved hash/size and cache string were changed in the three host copies, with reversible-edit checks, complete-host parsing and actual embedded-policy checks. Other assets and embedded policy code were preserved. Before this pin update, the canonical policy checker reported a source mismatch in all three host copies; that separate release discrepancy remains open. No broad build or generated-package release is claimed.

Before relying on this control, verify the deployed bridge and adapter bytes together, reconcile release policy, regenerate affected delivery artifacts, and close/reopen old app and bridge documents. Old open/deployed code retains its former behavior. Validate approval, denial, storage reconnection and two-session synthetic-record persistence inside the actual district-managed Canvas deployment.

This closes the documented `ds1` document-lifetime gap in the reviewed source. It does not prevent an already authorized document from deliberately disclosing data or transferring its capability, protect against compromised scripts on the trusted storage origin, distinguish apps sharing an origin, establish staff roles, or supply PPS approval. The existing clinical real-record gate, managed AI configuration, provider agreements and retention responsibilities remain separate requirements.
