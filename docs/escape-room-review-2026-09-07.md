# Escape room review and enhancements

Reviewed against the [shared Claude review](https://claude.ai/code/artifact/967f7901-ea7a-41b0-8134-c69dd1722b41?via=auto_preview) and the current working tree on September 6–7, 2026.

The artifact is a static code review, rather than an alternate game implementation. Its findings were checked against the current module, the host translator and language settings, and all 63 language packs. Most of the placeholder and English symbol repairs were already present when this task began; those existing changes were preserved.

| Finding | Verified outcome |
| --- | --- |
| Double-brace placeholders | The remaining ten affected strings in Maay Maay now use the host's single-brace convention. Regression checks cover every escape-room placeholder in English and all packs, including public mirrors. |
| Missing generation language | Both solo and collaborative prompts now use the current output-language setting. All learner-facing values are covered; JSON keys, identifiers, puzzle types, and numeric indices retain their machine format. The canonical host and generated development host both provide the setting. |
| Damaged emoji | The four remaining damaged escape-room messages in Maay Maay were repaired. The existing English and other pack repairs were left intact. |
| Repeated fill-in announcements | The changing sentence no longer has an explicit or implicit live-region role. Submission feedback still uses the host toast path. The entire underscore blank is replaced, so five-underscore source blanks do not leave stray underscores. |
| English editor names | All four editor input names use existing translated labels and the existing numbered-question template. Visible question, hint, answer, word-bank, matching-pair, and final-door labels also reuse translations. No additional translation catalog was needed. |
| Nested matching announcements | Matched-pair rows no longer introduce their own status regions; their container supplies the single announcement region. |
| Exit-door translation gaps | Filled 66 English fallback values across 23 language packs and their deployment mirrors. The seven documented PPS fallback packs retain their existing language policy. |

Additional gameplay and accessibility improvements:

- Collaborative generation preserves the supplied `correctOrder` instead of overwriting it with array order.
- The final door requires a complete canonical answer or an explicit accepted variant. Empty input and substring matches cannot unlock it; repeated successful submissions cannot award another completion bonus. Locked doors and completed/game-over runs ignore submissions.
- Text answers normalize Unicode and whitespace without stripping meaningful accents. Generated scramble tiles are derived from the actual answer and keep grapheme clusters together. Typing a scramble answer no longer changes the underlying characters to uppercase.
- Puzzle, final-door, settings, and preview dialogs all have accessible names, initial focus, a Tab/Shift+Tab loop, Escape handling, and focus restoration. When the original object becomes disabled after solving, focus advances to the next available object or the final door; completion receives focus after escape.
- The final-door content is no longer incorrectly exposed as a button containing other controls. Close buttons have larger targets. The room header stacks on narrow screens, and gameplay dialogs can scroll within a short viewport.

## Verification

- Focused Vitest regression suite: **170 tests passed across 7 files**; generation prompts, answer validation, real React dialog renders, existing solo/classroom accessibility and life-state contracts, translation interpolation, editor key coverage, and source/public module parity.
- Chromium playthrough: solve MCQ, sequence, matching, riddle, scramble, and fill-in; reject a partial final-door answer; accept the full answer and reach completion.
- Mobile viewport: 390 × 844; no horizontal page overflow or dialog overflow. Desktop completion inspected at 1280 × 900. No browser page errors.
- Canonical host and generated development host pass the JSX build smoke check.

The browser check is reproducible with `node dev-tools/check_escape_room_review.cjs`. Screenshots: [mobile puzzle](escape-room-review/mobile-puzzle.png) and [completed room](escape-room-review/completed-room.png).

For “All Selected Languages,” one room consistently uses the first selected language; an empty selection uses English. AI generation and collaborative session writes were tested with fixtures/mocks. No paid generation call, live classroom session, or deployment was performed.
## Follow-up gameplay pass

The next pass fixes the attempt lifecycle and makes failure, pause, and replay recoverable:

- Wrong answers now subtract ten seconds from the visible clock and consume the selected life budget. Normal has three lives; hard has one; easy uses unlimited lives. Settings show the total room time and translated budget labels.
- A shared clock implementation now drives the canonical host, development host, and module hook. It catches up after delayed browser callbacks, announces the one-minute and thirty-second thresholds, and stops at zero.
- Time-out and out-of-lives states keep the room visible with a focused result heading, Play Again, and Close. They no longer dismiss the activity unexpectedly or leave a live timer behind.
- Pause/Resume freezes the timer and preserves the current puzzle draft. Keyboard focus moves to Resume, then back into the available room controls. Paused and completed rooms reject answer and hint actions.
- Unfinished text, sequence order, and matching pairs are saved per puzzle, so switching objects cannot mix answers or erase progress. A matched pair cannot be counted twice.
- The final door opens after every puzzle is solved, including rooms shorter than four puzzles. Older saved rooms without a final door complete after their last puzzle.
- Play Again reuses the teacher-edited room and reshuffles its puzzles without a generation call. It clears the previous run's score, hints, streak, drafts, selected object, and door state. Saved-room hydration also fixes the undefined sequence-type variable and rejects malformed configs before replacing the current room.
- Hints reduce a puzzle's eventual reward once; they no longer also deduct from the existing global balance. The victory screen separates the run's score from newly earned XP. Stable room-specific score identifiers retain the host's high-score rule, so replaying the same performance does not award the same XP again or collide with a different room's puzzle ids.

Follow-up verification: **57 gameplay, lifecycle, and accessibility tests passed across seven files**. The 128 unchanged translation checks were excluded from this run; they passed in the initial pass. The expanded Chromium check completed all six puzzle types, preserved a draft through pause/resume, verified awarded XP against the displayed total, replayed the same room, and exercised both timeout and life exhaustion. Keyboard focus checks passed for Pause → Resume and Play Again → Start. Mobile screenshots have no page/dialog overflow, and the browser reported no page errors. Both host files pass the build syntax check.

Additional screenshot: [retry screen on a phone](escape-room-review/retry-room.png).