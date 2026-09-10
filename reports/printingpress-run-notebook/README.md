# Printing Press: saved print runs

The press now saves the current phrase, completed-impression count, part-label preference, recent proofs, and observations. Each completed proof captures its phrase, sequence number, timestamp, and whether it was made manually or during a guided tour. Editing the next phrase leaves earlier proofs unchanged.

The notebook keeps the most recent 12 proofs and retains the total impression count. Students can download a plain-text record with observations or use a proof as a broadside title. Replacing an existing title requires confirmation and preserves the body text and design settings. Starting a new run requires confirmation before clearing proofs and notes.

Guided tours now compare against the count at the start of that tour, allowing repeated tours after manual impressions. Timer callbacks read the latest run state so notes and phrase changes during a tour are retained. Reduced-motion preferences skip the inking animation. Returning to the activity or reopening it restores the notebook with a clean press rather than resuming an unfinished animation.

Validation:
- All 36 focused tests passed across the existing Printing Press suites and the new saved-run integrity suite. A worker startup timeout on a follow-up run was resolved by rerunning its two suites with `--pool=threads` (10/10 passed).
- `node dev-tools/printingpress_run_qa.cjs` passed the real React/Chromium workflow: manual cycle, immutable proof, two repeat tours, edits during a tour, unfinished-cycle restart, storage recovery, notebook download, protected broadside handoff, proof retention, reset confirmation, and storage-failure feedback.
- `node dev-tools/printingpress_broadside_qa.cjs` passed again, covering the previous broadside improvements.
- No browser page errors or notebook WCAG A/AA axe violations. No horizontal overflow at 320px or 390px. Desktop and 320px screenshots visually reviewed.
- Source syntax, whitespace, and desktop mirror parity checked.

Browser checks use the real tool in an isolated React host. Tour narration pauses are accelerated in the test; the inking timer is unchanged. The browser uses reduced motion.

Evidence: `browser-results.json`, `notebook.txt`, `notebook-desktop.png`, `notebook-mobile-320.png`, and `notebook-mobile-390.png`.
