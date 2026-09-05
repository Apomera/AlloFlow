# Studio workflow enhancements — 2026-09-04

## Delivered

### Applied Challenge focus mode

Learners can work through one phase at a time with Back/Next, a step overview, and a Show all steps option. Navigation moves keyboard focus to the selected writing field. Controlled response values survive switching steps and modes. The selected step and mode are remembered for the current browser tab, scoped by resource and profile; preview navigation is temporary. Malformed stored preferences fall back safely. Printing includes every phase even while focus mode is active.

### Save recovery and text backups

The existing autosave now treats an explicit storage refusal as failure, serializes overlapping writes, and prevents older completions from replacing newer save status. Retry save is available beside a learner's save error. Device saving is explicitly distinguished from submitting work to the teacher.

Learners can download a bounded JSON text backup and restore it into the matching resource. Backups contain writing and feedback, exclude teacher sources and private retrieval evidence, and do not submit anything. The interface states that images and recordings are not included. Restoring text preserves visuals already present in the learner response. A mismatched/oversized/invalid file is rejected, and a file that finishes loading after the learner edits or switches resources cannot overwrite that newer work. Teacher authoring and preview do not expose these learner recovery actions.

### Audio pacing

Saved-reference playback supports pause/resume, repeat of only the current field, optional pauses between fields, and optional focus following. Stopping or navigating away resolves pending pauses and prevents playback from continuing into the next field. Device reading of learner writing also supports pause/resume and uses the selected speed/volume without persisting learner audio into the reference store.

### Teacher sharing review

Both studios now have an advisory Ready to share panel. It identifies unverified/missing facts, missing visual descriptions, visuals awaiting approval, stale/damaged reference audio, and current clips omitted by the selected sharing budget. Review links open teacher editing and focus the relevant facts, visual, or audio section. The panel compares homework/QR with live/student-pack limits; it does not change the assignment's delivery method or automatically approve content. Missing prepared audio remains optional because a device voice can read the text.

### Localization

Added Spanish (Castilian), French, and Arabic translations for the new focus, recovery, pacing, and sharing controls, plus the surrounding studio status and reference-audio labels. Existing locale content was preserved. Other languages continue to use English fallbacks for these additions. These translations have automated checks and rendered-layout review, not independent human linguistic review.

## Validation

- Final focused run: **56/56 passed** across workflow, ownership, audio, and Applied interaction suites, including **17 new workflow tests**.
- Broader regression run: 322/323 passed across 14 suites. The remaining result was a five-second timeout in the Applied axe audit, not a reported accessibility violation. That suite passed in the final focused rerun with a 15-second timeout allowance. Earlier stale-module and outdated serializer-binding assertions were corrected and rechecked.
- Real Chromium: **16/16 scenarios** passed at 390px width across both studios, teacher/learner modes, and English, Spanish, French, and Arabic. No page errors, horizontal overflow, or axe violations; color contrast was included. Keyboard Next navigation focused the displayed phase, and sharing-review links focused editable facts. Reduced-motion preference was enabled. The Arabic learner layout was visually inspected.
- Translation checks preserve placeholders and valid JSON. Added 61 workflow/status/audio entries in each of Spanish (Castilian), French, and Arabic; other existing locale content was retained.
- Module registration: all 209 consumers have valid producers. All 63 host/view scans passed without missing-prop candidates.

The local development app was rebuilt. Generated JSX parses, both studio source freshness checks pass, and ten affected runtime/string/locale mirrors match. The sharing contract regression now verifies that the host binds homework resources to the QR audio budget rather than requiring the older direct callback spelling.

## External checks

Local mailbox/session-transport tests cover the configured delivery contracts without sending messages to real students. No test-only external mailbox/session was supplied during this run, so actual hosted mailbox delivery remains unverified. Manual screen-reader validation also remains to be done; automated accessibility checks do not substitute for that session.

For that final classroom check: open a prepared test assignment on a separate learner device, verify saved audio with AI disabled, write and reload a response, submit it, and confirm the teacher receives the writing without private recall attempts. With a screen reader, verify step navigation, pause/resume announcements, recovery status, and the review links.

Changes are local; nothing was published or deployed.


Follow-up: [Recovery and delivery hardening](STUDIO_DELIVERY_HARDENING_2026-09-04.md) adds stricter backup validation, complete multipart reassembly checks, and a repeatable local two-browser delivery regression.
