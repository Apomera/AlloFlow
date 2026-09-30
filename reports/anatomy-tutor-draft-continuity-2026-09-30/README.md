# Anatomy tutor: drafts, question context, and readability

## Changes

Questions now keep their original structure and browsing collection while the learner edits them or explores another lesson. A visible context panel explains which lesson the tutor will use. **Use current study** updates that context while preserving the question.

Starting questions and retry controls are disabled while a draft contains text. **Clear draft** removes only the question; **Clear chat** removes the conversation and stops its pending request while keeping newer writing. Accepted actions restore focus to the question field. A late response cannot refill a cleared conversation.

Retrying an earlier question uses its recorded structure, even when the learner has since selected another structure. The request still uses the learner's current learning level and current permissions for clinical material. An empty reference lesson now opens Explore with Search visible and focused.

The context panel, controls, focus outlines, and spacing work across light, dark, and high contrast themes. Larger-text mode gives tutor text and controls a minimum 17 px size. Six new tutor labels and 19 previously missing study-record labels are translated into French, Latin American Spanish, and Arabic in both app catalogs.

## Evidence from the initial audit

| Interaction | Before | After |
| --- | --- | --- |
| Choose a starting question while writing | Replaced the unfinished question | Preserves writing; the learner can clear it explicitly |
| Clear chat after beginning another question | Removed the draft | Keeps the draft and its question context |
| Retry a Kidney question after selecting Heart | Sent the question with Heart context | Keeps Kidney context and offers an explicit switch |
| Larger text | Tutor body, context, help, and input stayed at 16 px | Visible tutor text and controls are at least 17 px |
| Empty reference lesson | Required finding the study controls | Opens Explore and focuses visible Search |

## Verification

All **495 checks across 10 regression suites** passed, including **106 new tutor continuity checks**. The **one Chromium journey** passed and all **15 scoped accessibility scans** reported zero violations. Final results are recorded in [verification.json](verification.json).

The regression checks cover both anatomy source copies, queued stale actions, current learning-level permissions, profile changes within the youngest learning level, draft serialization, retry context, focus, cancellation, and saved writing. Independent conversations and changing context wrappers are included. The browser journey uses controlled AI responses, including a late response after Clear chat.

Visual and accessibility coverage includes 320, 390, 768, and 1440 px layouts in light, dark, and high contrast themes, plus Arabic with larger text at 320 px. Accessibility scans are scoped to the tutor panel and study controls. They do not establish accessibility for the entire app. [locale-commit-scope.json](locale-commit-scope.json) records the exact 25 labels included in each catalog candidate.

## Screens

- [Before: phone](before-phone.png)
- [Draft retaining its original context](draft-context-phone.png)
- [New writing after Clear chat](recovery-phone.png)
- [Phone with reference lesson and saved writing](after-phone.png)
- [Dark theme](after-dark.png)
- [Arabic with larger text](after-arabic.png)
- [Desktop](after-desktop.png)
