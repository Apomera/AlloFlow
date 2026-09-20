# Lesson plan refinements — September 19, 2026

Implemented the approved lesson-plan improvements:

- Full-screen spoken directions use the document fullscreen target supported by Chromium, show an exit control, and leave fullscreen when the view closes.
- Spoken filtering preserves mathematical operators and meaningful bracketed content. It removes only explicit teacher notes and recognized pause/wait cues, and avoids repeating exact questions.
- Script history keeps all new versions. Teachers can explicitly delete a version and its associated saved audio after confirmation. Stale confirmations and unauthorized roles are rejected. Versions previously discarded by the old three-version limit cannot be recovered.
- Objectives and materials can be added, edited, reordered, and removed, preserving structured metadata and translated values. Keyboard focus follows list changes and accessible input names remain stable after reordering.
- A collapsible Lesson at a glance shows objectives, materials, assessment/success criteria, and available timing from the latest whole-lesson script. Segment timing is not presented as a whole lesson; missing information is labeled.
- Spoken directions show voice, language, and speed, with a shortcut to the app voice settings.

Validation:

- 178 targeted tests passed across eight files (final-results.json).
- After the final module rebuild, all 50 focused UI tests passed again (final-ui-results.json).
- Real Chromium checks at 1280 px and 320 px passed fullscreen entry/exit and close cleanup, modal focus/isolation, objective/material list editing and reordering, overflow checks, and automated accessibility checks (browser-results.json). No browser errors or reported axe violations in checked views.
- Phone screenshots of the overview, list editor, and spoken view were visually reviewed.
- Core/view modules and desktop public mirrors rebuilt; development shell build passed. The lesson-plan builder now uses the existing atomic writer after a Windows output-file lock was encountered.
- Updated test fixtures for the existing host-handler extraction. Initial stale selectors and load-related timeout/worker startup failures were resolved; final results above are authoritative.

Limits: Browser checks use a deterministic local lesson fixture with real built modules. No live AI-provider or remote TTS-generation request was made. Older freeform scripts still need teacher review before playback. No deployment was performed.
