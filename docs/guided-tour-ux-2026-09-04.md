# Guided Mode and feature-tour UX - 2026-09-04

Implemented locally; no deployment or production app bundle was created.

## Guided Mode

- The step picker has a visible Customize label instead of an unexplained symbol alone.
- Next step names its destination; phase checkpoints retain their existing separate review actions.
- Path selection and resume/restart labels describe a lesson workflow rather than calling it a tour.

## Feature tour

- A new opening step explains where to find Guided Mode, how to choose a focused path, and how to review and deliver the lesson.
- The Assignment Directions step now describes the current Draft for me option and teacher review. Document accessibility copy describes audit/repair results and unresolved issues without promising an identical or automatically accessible export.
- Source, History, and delivery descriptions are shorter and reflect project backups and the distinction between the Guided lesson package and wider workspace exports.
- Back, Finish, and Exit tour have accurate accessible labels. All tour buttons are non-submitting controls with at least 44-pixel height.
- Space and arrow keys keep their native behavior on controls and editable content. Escape closes once, including from an editing control.
- The target resolver selects a visible Start & setup control when desktop and mobile copies coexist.
- The main tour fits narrow screens, and long instructions scroll separately from navigation. Opening the dialog keeps its introduction in view; each new step resets the instruction scroll position.

## Verification

- 152 tests passed across seven files, including 16 new cases for Guided navigation labels, tour keyboard behavior, accessible control names, current copy, and target resolution.
- All 35 main tour steps have non-empty titles and text; their target IDs or help keys have source references. This is a source audit, not proof that every state-dependent target is visible in every app configuration.
- A development build completed. The canonical host and both generated host files pass JSX syntax checks. Updated modules and English strings match their public mirrors. Scoped whitespace checks passed.
- Real-browser checks passed at 1200×850, 360×780, 320×568, and 667×375. Navigation stayed visible with long text, Space activated Back and Next once, and Escape closed the tour. The targeted tour-dialog axe check reported zero violations. Mobile screenshots were visually reviewed.
- Regression evidence: reports/classroom-review-2026-09-04/guided-tour-ux-regression.json. Build evidence: guided-tour-dev-build.log.

English copy and existing fallback strings were updated. Other language packs were not retranslated. Browser evidence is recorded separately in guided-tour-browser.json and tour-ux-axe.json; it exercises the real components with a small host fixture, not a full AI-to-classroom workflow or platform-wide accessibility certification.
