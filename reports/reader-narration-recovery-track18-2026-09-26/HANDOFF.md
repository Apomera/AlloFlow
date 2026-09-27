# Track 18 — Narration save recovery and focus

This follow-up improves feedback and keyboard behavior around the existing device-storage APIs. It does not add a storage implementation or modify host persistence. The earlier narration-access controls and device-readiness integration were already present in the working source at the start of this follow-up.

The candidate remains isolated. Shared source, host, generated files, Git state, deployments, and saved application data were not changed. No other sessions were contacted.

## Basis

- Captured working tree: **2026-09-26 22:56:48 UTC**, HEAD `6b63e76e862125e87422f02a54ed60beac68e8fb`. This includes other owners' uncommitted integration and does not identify a deployed release.
- Reader basis SHA-256: `948b82ea22995c57a05f556b111e9137b6b350d8bd6d0bae757c1f73db1db31d`.
- Reader candidate SHA-256: `94c76ad2a27e18e929233c309ddba74625ea441bb516212c1484e0d1a2341c20`.
- HEAD was unchanged at the final check, but the shared reader content hash had changed. Port the bounded delta; do not overwrite the shared reader with the candidate.
- No applicable AGENTS.md was found in the inspected ancestry or repository search.
- `basis-snapshot.json` records all 22 inputs. `manifest.json` records delivered files, patch hash, and the matching isolated root/public generated-module hash.

## Findings and changes

| Priority / evidence classification | Captured source and reproduced behavior | Candidate change |
| --- | --- | --- |
| P1 — source gap and isolated regression reproduction | [Retry handler, basis line 4362](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-recovery-track18-2026-09-26/basis/view_simplified_source.jsx:4362) awaited persistence but ignored a false/unconfirmed return. A retry could finish without explaining that saving was not confirmed. Thrown errors appeared in a separate preparation notice rather than beside Retry. | Distinguish a confirmed boolean/verified receipt from false, null, undefined, or a failed receipt. Show unconfirmed/failed feedback beside the action, refresh authoritative readiness, and suppress the old error once current audio is verified saved. Retry still calls only `__alloRetryReadAloudPersistence`; it never triggers synthesis. |
| P1 — source gap and isolated regression reproduction | [Unscoped busy state, basis line 4330](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-recovery-track18-2026-09-26/basis/view_simplified_source.jsx:4330) and the pending retry ref survived a resource change. A stalled old request could keep the next reading busy and block its retry. | Scope busy state and notices to the reading/profile context. Supply the existing API with an AbortSignal; invalidate the request when context changes, author controls hide, or the reader unmounts. Late completion cannot change the next reading's UI. Cancellation is cooperative; it does not undo a transaction that already committed. |
| P2 — reproduced keyboard failure | [Focus recovery, basis line 4376](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-recovery-track18-2026-09-26/basis/view_simplified_source.jsx:4376) remembered an audio action only when clicked. If background saving removed a focused Retry before activation, focus fell to the body. | Remember audio-action focus as it arrives. If that focused action disappears and focus has fallen to the body, focus Manage narration. Preserve focus if the user has already moved elsewhere. |
| P2 — source gap; real AT behavior remains unverified | The storage summary had no live region for asynchronous verification or retry feedback. | Add one polite, atomic status region outside the action controls. Announce explicit saving/failure and completed verification. Keep preparation wording stable rather than announcing every clip count. Suppress routine count announcements over active read-aloud, while retaining feedback for an explicitly requested save failure. |

Candidate implementation: [request ownership and retry](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-recovery-track18-2026-09-26/candidate/view_simplified_source.jsx:4330), [status wording](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-recovery-track18-2026-09-26/candidate/view_simplified_source.jsx:4423), [focus/status rendering](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/reader-narration-recovery-track18-2026-09-26/candidate/view_simplified_source.jsx:4498).

## Safeguards retained

- Device saving is still determined by the existing `__alloGetReadAloudReadiness` result, independently of playable in-memory audio.
- `__alloRetryReadAloudPersistence('reference', { signal })` remains the sole retry path. The candidate does not generate missing clips, change audio identities, replace recordings, or create another store.
- Original text protection, original/adapted narration access, text Edit behavior, sentence controls, separate student/reference audio, and profile compatibility remain intact.
- Busy Retry keeps focus and is marked `aria-busy`/`aria-disabled`; repeated activation is ignored by the request guard. It is not removed just to indicate progress.
- An unavailable or unsuccessful save cannot produce a new Saved claim. Only current verified readiness can do that.

## Verification performed

**60 focused tests passed across four suites:** 13 new save-recovery cases, 29 current audio-readiness cases, 12 narration-access cases, and 6 Edit Audio cases. The initial eight-case regression run had seven failures on the captured baseline; its report is retained as reproduction evidence. Additional unconfirmed-result, active-playback feedback, and later-verification cases were added before the final passing run.

**12 Chromium scenarios passed:** Original, Adapted, and Both at 320 × 640 CSS pixels under normal, text-spacing, and doubled-computed-font conditions; plus unclicked-focus background completion, focus preservation after moving to Edit, and navigation while saving. These use real browser focus/keyboard events, touch emulation, and mocked storage callbacks. They check visible failure/retry controls, duplicate-activation suppression, focus visibility/return, and status-region attributes.

The fixture uses no application server, live TTS, microphone, or real stored data. DOM status semantics are not proof of actual NVDA/VoiceOver announcements. Doubled computed fonts are not real browser text resizing or 400% zoom. Actual persistence, quota/eviction, browser restart, hardware mobile behavior, and package portability remain integration/manual checks.

The existing React test-utils deprecation warning remains. Babel used its existing automatic compact output behavior because the assembled source exceeds 500 KB; this was informational. The isolated root/public generated reader files match byte for byte. Patch reconstruction was verified against each exact normalized basis file.

## Acceptance routes after integration

1. **Session-only audio → Retry → unconfirmed/error:** keep Retry focused and usable, show the explanation beside it, and announce it once without moving focus. No TTS generation occurs.
2. **Retry pending → activate again:** only one persistence request runs; the focused control remains present with busy semantics.
3. **Retry pending in A → open B:** signal A's cancellation, give B independent retry state, and ignore A's late failure/completion. Repeat with teacher controls hidden and reader unmount.
4. **Focus Retry without clicking → background save completes:** restore visible focus to Manage narration when Retry disappears. If the user moved to Edit or another control, keep focus there.
5. **Failure → later verified save:** remove the obsolete failure message and announce current device-save status. Never promote an in-memory ready count into a durable-save claim.
6. **Active read-aloud:** routine storage-count updates do not speak over narration; an explicitly requested retry still reports its result. Confirm the actual announcement sequence with NVDA and VoiceOver.
7. **320 px, 200% text, 400% zoom, spacing overrides, mobile keyboard:** Save/Retry, Manage narration, Edit/Done, and Close remain reachable with visible focus and no clipped error text. Repeat against the assembled release candidate.

## Integration handoff

- **01, reader/host/build integrator:** port `narration-recovery.patch` semantically onto the current reader. It contains only reader source and two new validation fixtures. Keep ongoing reader changes and regenerate root/public modules through the normal build. Do not replay the earlier narration-access patch: its behavior is already in this basis.
- **02, audio/readiness owner:** preserve current stored-URL playback, store-revision tracking, identity/profile checks, and accurate device counts. This delta changes request ownership, feedback placement, and focus tracking around those APIs.
- **15, persistence owner:** retain receipt verification and persistence-only retry. Verify that AbortSignal is honored where cancellation is still possible, and that an already-committed save is reported truthfully. No backend/storage changes are included here.
- Assemble **04/09/10** dependencies before final route/AT/mobile checks. Run the four focused suites and the supplied Chromium fixture against the integrated source, then perform real storage restart/failure verification.

New fallback translation keys: `simplified.offline_audio_save_unconfirmed` and `simplified.offline_audio_preparing_announcement`. Route them through normal language-pack ownership.

Files: `narration-recovery.patch`, `candidate/`, exact reader `basis/`, `basis-snapshot.json`, `manifest.json`, and `validation/`.
