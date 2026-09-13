# Adventure Mode clarity improvements and bug fixes

Implemented locally September 12, 2026, following the approved review. Both setup locations and permitted student edits remain available.

## What changed

- Standard play uses one scrolling flow for the story and responses. Story summary, reading view, and automatic reading retain visible labels on phones. Status and management tools sit in an expandable section; systems and debate modes open it initially so their learning indicators remain available.
- Missing illustrations no longer reserve a large blank area. Illustration loading displays a compact message, while existing artwork keeps its resize and full-image controls. A visible shortcut moves to choices or the written response and supports keyboard focus.
- Start appears above configuration in the launch view and sidebar. Locked students see the lesson, a readable summary, Start, and expandable teacher settings. The notice no longer asks them to configure controls they cannot change.
- Summaries identify Social Practice and its skill, response format, decision limit, language, and final challenge. Automatic reading and microphone practice have separate status labels. Translated-story summaries follow the same language policy as generation, including its English fallback, in both setup locations.
- “Start over” and “Continue the story” now describe distinct actions. Starting over an existing story uses the app's confirmation dialog with a “Keep my story” cancellation option. Technical tooltip language and misleading waiting/reset guidance were replaced.

## Bugs fixed

- New scenes no longer scroll past their prose to the bottom. Scroll and focus behavior now belong to the Adventure view.
- Focus moves to a newly received scene or ending, while a loading-state change alone does not steal focus from Retry.
- Starting over clears stale completion, immersive view, shop/cast overlays, scene media, and pending response/dice state before opening setup. Canceling preserves the current story.
- Duplicate launch requests and duplicate restart prompts are blocked, including requests from an older React render before state has updated.
- A failed sequel restores the completed chapter. Late finale-detection results cannot overwrite that restored state, and failed detection is handled without an unhandled rejection.
- The sidebar disables its launch action during a pending turn and uses the correct label for an existing story. Start narration occurs only after confirmation.

## Verification

- **280 unit tests passed** across 28 Adventure-related files: lifecycle, settings, permissions, lesson-scoped saves, language, media, voting, learning supports, and accessibility contracts. [Results](unit-results.json).
- **73 browser tests passed**: desktop/phone layout, light/dark/high-contrast themes, keyboard navigation, long choices, setup permissions, loading/recovery, and scripted choice/writing/debate journeys. [Run log](browser-final.log).
- **15 rendered fixtures completed** with zero browser errors, no document-level horizontal overflow, and no scoped axe violations. [Capture results](after/findings.json).
- All three host JSX sources parsed successfully. Rebuilt Adventure view, sidebar, and handler bundles match their public mirrors; English UI strings also match. Targeted diff whitespace checks passed.

The 375 × 667 fixture now has a **458 px** shared reading area, compared with the previous **166 px** scene area. Locked-student Start fits on the first phone screen. These measurements describe isolated fixtures, not a production performance benchmark.

## Final screenshots

- [Phone reading screen](after/active-short-phone-initial.png)
- [Locked-student launch](after/student-locked-phone.png)
- [Teacher desktop setup](after/teacher-desktop.png)
- [Systems mode](after/systems-desktop-initial.png)
- [Episode recap](after/ending-phone.png)

## Reproduction and scope

Run `node reports/adventure-clarity-review-2026-09-12/capture-after.cjs` for the final captures, and `npx playwright test -c reports/adventure-clarity-review-2026-09-12/playwright.config.cjs` for the browser suites.

Browser verification uses local shipped modules, actual translation strings for the review captures, and scripted content. It does not invoke live AI or verify microphone/audio services, production networking, or a deployed application. No deployment was performed. Unrelated workspace changes were preserved.
