# Concept Quest review — September 7, 2026

Concept Quest now has more reliable progression, current-turn live submissions, a complete teacher draft editor, and a usable phone layout. This review covered the deterministic engine, teacher controls, student overlay, launch handling, Firestore rules, and the Google Class Mailbox transport.

## Gameplay and learning evidence

- **Small question sets can finish.** The Mastery Gate requires the number of distinct concept sigils the generated map can actually provide, up to three. Complete campaigns using one and two concepts are covered by regression tests.
- **Only scored questions enter the quest.** Supported multiple-choice questions need a valid answer key. Text, numeric, and letter keys are normalized; opinion/Likert and malformed questions are excluded. An empty usable set produces an actionable launch error. Teachers see how many source questions were skipped.
- **Actions are validated without coercion.** Missing, malformed, unknown-ability, and stale answers are ignored instead of being graded as incorrect. Role bonuses follow the role committed with the answer.
- **Recovery resumes the encounter.** Rally and healing items return a defeated party to the live enemy when one remains.
- **Inventory effects apply once.** Publishing awards an item; using it applies the effect. Ineffective uses preserve the item. Full inventories preserve treasure and reject additional GM awards with a useful message.
- **Teacher-authored challenges persist.** Publishing replaces the active challenge sequence, so the original question no longer reappears on the next round. Enemy HP stays consistent with its maximum.
- **Pacing preserves the final concept check.** Softening an enemy leaves at least one HP, preventing the pacing control from silently completing an encounter without the normal resolution path.
- **Evidence follows the answered question.** Rotating questions carry their own concept label into the debrief. The previous prompt appears beside round feedback. The teacher panel states the number of recent rounds represented; the existing history retains up to 24 rounds.
- **Undo protects student progress.** A resolved student turn or room change clears GM undo history. Undo otherwise restores the GM state and advances the turn identity.

## Live-session behavior

New quests use a session identifier and turn key covering the current challenge. Student actions and votes carry that identity. Teacher counts and engine resolution exclude delayed submissions from prior turns or restarted quests.

Saved choices are restored on re-render. A successful commit receives immediate local acknowledgement while the session echo arrives. Failed saves keep the selected answer and support choices available for retry. Pause disables gameplay controls and focuses a visible pause notice; resuming preserves the draft. Roster map keys supply participant identities even when entries omit an embedded UID.

The teacher save flow guards duplicate submissions, reports failures, and clears previous turn collections when the challenge changes. AI drafts arriving after the encounter changes remain reviewable and require an explicit choice to use them in the current encounter.

Ending a quest uses a named confirmation dialog with keyboard focus handling, a safe return-to-game action, and inline save errors. A successful end removes the student overlay.

## Teacher and student interface

The GM preview now edits the question, each answer choice, correct answer, and explanation, plus enemy name/HP/attack or item name/effect/amount. Instructions explain item use, skipped source questions, stale drafts, and the undo boundary.

The student map uses a two-column grid on phones and connected room paths on larger screens. Battle controls move ahead of the map on phones. Room and pause colors have readable foreground contrast; health meters expose their values to assistive technology.

## Transport and packaging

Firestore rules validate current-turn action and vote metadata for new quests, reject paused or wrong-phase writes, and retain legacy quest compatibility. Google Class Mailbox version **20** accepts the same fields, validates phase and turn identity, and rejects parent progress-map writes that bypass participant-owned leaves. Its canonical script, public copy, generated installer module, host validation metadata, and outdated-deployment notice are synchronized.

The existing mailbox test for shareable Analysis resources was updated to inspect `teacher_source.jsx`, where the filter now lives, rather than its former location in the main host.

## Verification

- 297 distinct checks across seven affected Vitest suites, using the latest passing run for each suite: engine, Concept Quest mounted runtime, prior live-quiz/escape runtime, escape-room runtime, Class Mailbox, mailbox session bridge, and mailbox installer packaging.
- Firestore demo emulator behavior suite passed with valid current submissions and denied stale, paused, and cross-participant updates. The broader suite also checked receipts, team values, asset ownership, and signaling. Expected denied writes appear in its log; some invalid requests reach the existing expression-evaluation limit before denial.
- Firebase static contract: 50 invariants passed.
- Three real Chromium windows: teacher plus two students, with one student at 390 × 844. Passed voting, simultaneous answers, teammate assist, pause/resume, GM editing, failed-send retry, challenge persistence, defeat recovery, one-time item use, and ending the quest. No page errors or horizontal mobile overflow.
- Application build smoke, relevant JavaScript syntax, scoped whitespace checks, and runtime/backend mirror comparisons passed.

Screenshots: [phone map](concept-quest-review/mobile-map.png), [phone battle](concept-quest-review/mobile-battle.png), and [teacher draft editor](concept-quest-review/teacher-gm-preview.png).

## Release boundary

These are local workspace changes. The browser walkthrough used a synchronized in-memory transport; Firestore used a local demo emulator, and Class Mailbox used mocked Google services. Production Firebase and a deployed Google Apps Script instance were not exercised or changed.

Publish the updated Firestore rules with the new clients. Teachers using Google Class Mailbox need to redeploy version 20 through the existing setup flow before starting quests with these new turn fields. No site, backend, or original Claude artifact was deployed by this review.
