# Story Forge: keyboard and review improvements

Implemented locally, without deployment.

- Escape dismisses the open Project menu and returns focus to its trigger before attempting to close Story Forge. Existing confirmation dialogs retain priority.
- Clicking or moving keyboard focus outside the Project menu dismisses it. The modal's focusable-element list now includes disclosure summaries.
- AI-only optional review tools are disabled when their service is unavailable. The explanatory message and manual self-check remain available. Comic Flow remains enabled because it provides local checks without AI.
- Self-assessment replaces small numeric sliders with descriptive, labeled native selects and 44px minimum touch height. Criteria wrap instead of truncating, and mobile controls stack vertically.
- Ratings retain the existing starting value of 3; instructions now explicitly explain this. This pass improves clarity without changing the review completion rule.

Verification artifacts are in `third-pass/`. The browser harness checks Escape focus restoration, pointer and focus dismissal, unavailable AI actions, editable ratings, mobile bounds, accessibility, and successful self-check progression. It uses the built module in isolated Chromium with cached repository styling, English strings, and no live AI service. The full Story Forge regression suite is recorded in `third-pass/tests.json`.
