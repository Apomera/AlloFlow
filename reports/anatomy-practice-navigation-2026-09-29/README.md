# Anatomy practice navigation

This pass makes it easier to move between an anatomy question, its diagram, and answer feedback. It also keeps each Imaging question tied to the scan used to create it.

## Spotter

- Show diagram moves focus to the crosshair. A return button beside the figure leads back to the current question or its feedback.
- A new round focuses its question. Submitting an answer focuses the explanation; ending practice returns focus to Start.
- The pending diagram description keeps the answer hidden. After submission, it identifies the marked structure.
- Choices show Your answer and Correct answer labels. Phone layouts use a single column, larger type, and visible focus. Dark and high contrast themes retain the answer labels.
- Navigation preserves the attempt, optional timing, score, and written notes. Returning to a question exits model focus mode so the practice panel is visible. Deferred focus checks the current round and view before moving.

## Imaging

In the phone baseline, the top of the question was **2,359 px below the top of the scan** at a width of 390 px. The practice prompt and answer review now sit directly beside the scan.

Questions belong to their modality, region, plane, slice, and MRI sequence. Changing the scan ends the current question explicitly and preserves the completed score, notes, measurements, and other saved activities. A restored question without a matching scan can be replaced with a fresh question. Outdated and duplicate answer callbacks cannot record another attempt.

Start, Next, and Skip focus the scan. Answering focuses the nearby review. Review outlined structure returns to the image, and Escape returns to the question or feedback. Pins and rulers stay paused until the challenge ends; placing a new observation attaches the draft note to it and clears the draft as before.

The practice panel uses larger text, visible focus, clear action buttons, and theme colors. Its scan description isolates modality codes and numbers in right-to-left layouts. Missed-answer wording also works for plural target names.

## Mode navigation

Arrow keys follow the visual direction in left-to-right and right-to-left layouts. Home and End use the first and last available modes. Modified arrow keys remain available to the browser.

The tab strip reveals its selected tab by scrolling horizontally. It keeps focus on the tab during arrow navigation and avoids a page jump from a delayed mode-panel focus.

## Verification

- **236 passing regression checks** across nine suites, including 36 new Spotter cases, 76 Imaging cases, and 14 mode navigation cases across both source copies.
- **Seven passing browser checks**, covering both practice flows and keyboard observations.
- **30 accessibility scans with no violations** on the practice surfaces. English checks cover 320, 390, 768, and 1440 px in light, dark, and high contrast themes. Arabic checks use 320 px with larger text in all three themes.
- **19 new labels** in French, Latin American Spanish, and Arabic, with matching placeholders and desktop mirrors.

Recorded results, source hashes, and language coverage are in [verification.json](verification.json). Accessibility results cover the revised practice surfaces.

## Visual review

- [Before: Spotter on a phone](before-spotter-phone.png)
- [Current question](spotter-question-phone.png)
- [Answer feedback](spotter-feedback-phone.png)
- [Diagram return control](spotter-diagram-phone.png)
- [Imaging practice](imaging-practice-phone.png)
- [Imaging review](imaging-review-phone.png)
- [Dark theme](practice-dark.png)
- [Arabic with larger text](practice-arabic.png)

The changes apply to the web source and its desktop mirror. Learning progress remains local to the activity, and the scan is a synthetic teaching phantom.
