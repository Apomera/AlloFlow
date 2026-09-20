# Private organizer submissions and review — September 19, 2026

The approved follow-up now delivers learner reflection writing directly through Desktop/School Box LAN, with teacher review, revision comparison, and private feedback. It extends the earlier [organizer follow-up](FOLLOWUP.md).

## Classroom behavior

- Learners write their own responses, submit privately, receive feedback, and submit revisions. Local drafts remain scoped to the learner, resource, and class. Failed delivery preserves the draft and does not claim completion.
- Teachers open **Live Dashboard → Review organizer reflections**. The review displays a reference snapshot of the diagram from activity launch beside the learner's writing, marks changed responses, and exposes earlier revisions.
- Teacher feedback belongs to a selected revision. Unsent feedback survives polling and switching revisions or learners within the open review. Concurrent edits cannot silently overwrite saved feedback; teachers can explicitly load the newer saved version.
- The learner feedback view refreshes periodically and has a manual refresh control. The teacher can export all submitted writing, revisions, and feedback as JSON.
- LAN session health is labeled LAN rather than Firebase.
- Added 94 translation keys in English, Castilian Spanish, Latin American Spanish, French, and Canadian French. Other locales retain readable English fallback text. Existing learner writing and diagram content are not automatically translated.

## Private delivery and retention

The private store is attached to the runtime session entry, outside shared session data. Writing and feedback never enter shared session snapshots, SSE broadcasts, or roster progress receipts. The teacher uses the existing protected private runtime listener. Participant routes require a joined token and return only records owned by that exact participant connection; a fresh token claiming another learner's uid cannot read or revise earlier writing. Normal reconnects retain the original token. A fresh join cannot take over an earlier connection's private history.

Identical retries return the saved revision rather than duplicating it. Changed work is numbered by the server. Stopped or replaced activities reject new submissions while still acknowledging an identical retry of already saved work. Reference snapshots survive later diagram edits. Feedback writes use a revision timestamp to reject stale overwrites.

The inbox follows existing LAN session lifetime: it is held in memory and disappears on expiry, deletion, or desktop runtime shutdown. The interface tells teachers to export before ending class. Limits are 20 revisions per learner/activity, 1,000 records and 6 MB per session, and 24 MB across reflection inboxes. Limits reject new writes with an actionable message and never silently remove earlier revisions. This change does not add disk persistence.

Class Mailbox continues using its existing authenticated submission route. Firebase-only sessions retain the explicit download/handoff path; the new private review API is LAN-specific.

## Validation

- 129 passing tests across 11 affected files; zero failures. Includes private ownership, duplicate retries, retained launch snapshots, expired activities, capacity/revision limits, feedback conflicts, stale session results, preserved drafts, existing game pairing, and reconnect behavior.
- 33 real isolated LAN HTTP/SSE checks with teacher and independent participant tokens.
- 20 Chromium checks using separate teacher/student contexts, the production reflection/review module, the actual host submission callback and LAN transport, and real isolated LAN listeners. Covers submission, feedback, revision comparison, export, reconnect/remount, stop behavior, keyboard navigation, 390px layouts, and 200% zoom.
- Three clean scoped axe scans including color contrast: learner reflection, Spanish review, and French review. French phone screenshot visually reviewed.
- Three host sources and two runtime sources parse; four generated modules parse; 27 existing module/language mirrors match; four LAN transport copies match. Scoped whitespace check passes.

The integrated browser scenario uses a deterministic reference diagram. It does not call a paid AI provider or claim deployed-classroom validation. No deployment, push, installer build, or production service change was made. The full host was compiled into an isolated test folder; production packaged host bundles were not rebuilt.

## Evidence

- [Test summary](private-validation.json), [LAN results](private-lan-results.json), [browser results](private-browser-results.json), [artifact integrity](private-integrity.json)
- [Desktop review](private-review-desktop.png), [Spanish phone review](private-review-spanish-phone.png), [French phone review](private-review-french-phone.png)
- Reproducible checks: [LAN script](verify-private-lan.cjs), [integrated browser script](verify-private-browser.cjs)

Shared host, renderer, and runtime files contain changes from concurrent tasks. They remain uncommitted rather than combining unrelated work into this pass.
