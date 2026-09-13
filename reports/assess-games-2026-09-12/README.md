# Assess games and presentation update, September 12, 2026

Implemented in the workspace and mirrored browser assets. No deployment was performed.

## Changes

- Board Game and Escape Room generation now use assessment content when the original source is only a short topic. Previously that topic displaced usable assessment text and disabled generation.
- Game setup loading now waits for a callable component, supports delayed loader registration, catches loading errors, times out after 30 seconds, and offers Retry and Close.
- The original quiz-puzzle activity is now **Puzzle Challenge**. The connected-clue activity is now **Escape Room**. Existing identifiers and saved game formats remain compatible. English labels and fallbacks are updated; existing translations retain their current wording.
- Assess groups its game options behind the same disclosure pattern used by Glossary, with descriptions, Escape dismissal, focus restoration, and visible active-game exit controls.
- **Concept Quest solo** adds the existing RPG engine to independent play: roles, abilities, connected paths, encounters, inventory, sigils, a final boss, and a debrief. The module bundles its engine and requires no live session or generation request. It uses scored multiple-choice questions and clearly reports that scope. Progress lasts while the adventure is open.
- Presentation starts with one question at a time and provides previous/next, jump-to-question, and all-question controls. Authored images are retained, answer selection is accessible, authoring panels are hidden while presenting, and discussion appears only when prompts exist.
- Review Game includes all nine assessment formats. Its MCQ-only filter caused mixed assessments to show only three 100-point tiles. Each format now has a revealable answer guide, item counts, completion state, and a viewport-centered question dialog. A 503-item regression case verifies full coverage.

## Verification

- 695 tests passed in the final combined run across 30 test files; no failures or skipped tests. Details: [tests.json](tests.json).
- 183 additional legacy Puzzle Challenge tests passed after the final fallback-label update.
- Desktop (1280px) and phone (390px) Chromium checks passed for Games, presentation images/navigation, numeric answer reveal, mixed-format Review Game, and lazy solo launch. No browser exceptions or horizontal overflow. Details: [browser-results.json](browser-results.json).
- Quiz and solo adventure static accessibility audits reported zero heuristic findings. These checks are not a full accessibility conformance evaluation.
- View-prop analysis found no missing props. Module registry verified all 192 consumers have producers. New solo module build parity and generated module syntax checks passed.
- The existing main UI translation parity tool stops at four unrelated missing directions keys; no translation packs were regenerated.

Browser reproduction: `node dev-tools/check_assess_refresh.cjs`.

Screenshots: [Games on phone](games-390.png), [Presentation on phone](presentation-390.png), [Review on phone](review-390.png), [Solo encounter on phone](quest-encounter-390.png).
