# Anatomy Tutor and Tour flow

## What changed

The Tutor puts its question box before the starting questions and reference lesson. The reference lesson and saved writing open from a native disclosure. A multiline question uses Enter to ask and Shift+Enter to add a line.

Answers show their original system and structure. Interrupted requests and reviewed-lesson fallbacks offer a way to draft the question again while preserving a newer draft. Each pending request belongs to its own conversation. A bounded conversation preserves the reader's position and offers a button to focus the latest answer.

The Tour saves recap answers when a learner revisits a teaching step, switches stops, or leaves and reopens the Tour. A return button restores the same clue and its feedback. Restart is a separate action that clears the current recap answers. Reviewing or returning does not add another retrieval attempt. Focus moves to the recap heading, submitted feedback, teaching step, or saved clue as appropriate.

Tutor and Tour use the compact system and level controls. Both panels have larger text, touch targets, and light, dark, and high contrast styling. The new controls are translated in French, Latin American Spanish, and Arabic.

## Verification

Results and source hashes are recorded in [verification.json](verification.json). Browser requests are mocked; these checks do not send questions to an external model service.

- 327 distinct regression checks passed, including a final run of 136 Tutor, Tour, and compact-control checks.
- Four browser walkthroughs passed with retries disabled.
- 25 scoped accessibility scans found no violations.
- Layouts fit widths of 320, 390, 768, and 1440 pixels. Arabic and larger text were also checked.
- The desktop Tutor panel begins at 246 pixels, and its initial question box at 456 pixels from the page top.

Browser checks caught and verified fixes for a restored conversation that stopped above its newest answer after resizing, and for Tour focus after returning from the diagram. A full 40-message conversation continues to follow the latest answer while preserving the reading position when the learner scrolls back.

## Visual review

- [Tutor before, phone](before-phone.png)
- [Tutor after, desktop](after-desktop.png)
- [Tutor after, phone](after-phone.png)
- [Tutor after, dark theme](after-dark.png)
- [Arabic Tutor with larger text](arabic-larger-light-320.png)
- [Tour review and saved return](tour-paused-review.png)
- [Tour recap, dark theme](tour-recap-dark-390.png)

## Scope

The canonical anatomy source and desktop copy match. Locale commit candidates include only the 13 `tutor_flow_*` and `tour_flow_*` labels. Other locale work remains outside this change.
