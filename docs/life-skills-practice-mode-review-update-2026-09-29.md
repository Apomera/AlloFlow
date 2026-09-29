# Practice Mode: revisit a decision and compare outcomes

The outing now supports a predict, try, compare loop. Learners can revisit a specific choice, make another plan from the same starting point, and explain what changed.

## Learner flow

1. Open **Review a choice · try another way**, or choose **Revisit a choice** from the debrief.
2. Select any recorded step. Read the original action, consequence and clock afterward. The default selection is the latest decision before departure.
3. Think about what a different choice might change, then choose **Try from before this choice**.
4. Continue from the matching station. The earlier actions and situation are preserved in a new practice.
5. Compare the original and new choices. When both outings have finished, compare preparation time, arrival, travel plan, time before the start and requested clues.

The comparison describes what happened. It does not rank independence, reward fewer clues or treat the earliest arrival as the best plan. A prompt asks what changed, what stayed the same, and what support would help. Final totals include every later choice, so the interface does not attribute all differences to a single decision. An unfinished original has no final-arrival comparison.

The controls work with keyboard input and with the existing 3D scene. Finishing a comparison moves focus to its heading; the debrief remains directly below it. No additional model calls are needed for review or replay.

## Saved practices and backups

- Decision retries keep the original mission rules version, configuration and command prefix. They receive a new run ID. Full fresh replays still use the current rules.
- Story moments after the retry point are excluded. Earlier accepted prose is retained, and a pending story request is cancelled when the practice changes.
- The original run remains intact. A separate comparison record holds its validated snapshot and the retry point. Reloading a retry restores that comparison.
- **Download practice** is always available. The versioned JSON envelope includes the run, reflection and comparison snapshot when present.
- **Open a backup** validates the file before changing the page and opens a fresh copy. Original prototype downloads are still accepted. Existing runs are never replaced by an imported run.
- Files larger than 300,000 bytes, invalid journals, unsupported backup versions, invalid reflection data and comparisons without a shared starting point are rejected. A file that finishes loading after a learner changes the practice is set aside.
- Reflections save as the learner types. Export also reads the current field value, including text that has not lost focus. Reflections and comparison records remain in the page if storage is unavailable and can be downloaded.

Backup envelopes use format `alloflow-life-skills-practice`, version 1. The run's existing storage format remains unchanged. Comparisons use a separate `alloflow-life-outing-comparison:v1:` key; reflection keys retain their existing prefix. Imported prose and reflections are displayed as text.

## Verification

**36 focused tests passed** across the engine and UI suites. New coverage includes exact retry boundaries, version 1 compatibility, support history, prose filtering, shared-start validation, backup round trips, legacy downloads, malformed files, conflict preservation, keyboard focus, reload, stale file reads and operation with storage and 3D unavailable.

Chromium checks exercised the live WebGL page at 390 and 1280 pixels, a completed original/retry comparison, keyboard activation of the retry control, and actual FileReader restoration with a reflection and comparison. The checked layouts had no horizontal overflow. The phone page reported zero automated WCAG 2 A/AA and WCAG 2.1 AA axe violations; contrast review remains manual for the canvas caption and decorative glyphs. Browser console checks found no errors.

This is still one authored outing. Educational effectiveness and sustained engagement need learner testing across the intended range of ages and support needs. The next useful observation is whether learners can explain why two plans differ, including a case where longer preparation and a different travel option still lead to an earlier arrival.

## Main files

- `life_skills_outing/engine.js`: decision history, branching, comparison and backup validation.
- `life_skills_outing/outing.js`: review, comparison, reflection and file controls.
- `life_skills_outing/life_skills_outing.html` and `outing.css`: accessible page structure and responsive presentation.
- `tests/life_skills_outing_engine.test.js` and `tests/life_skills_outing_ui.test.js`: focused behavior checks.

Matching assets are copied to `desktop/web-app/public/life_skills_outing` for the desktop preview.
