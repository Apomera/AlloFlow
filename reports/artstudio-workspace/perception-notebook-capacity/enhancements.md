# Perception Lab: preserve notebook studies

Updated October 4, 2026. Changes are left uncommitted.

New observations and repeated matches no longer silently remove older records when the notebook reaches its 24-observation capacity. The notebook displays saved and available counts independently of finder filters. Saving an observation requires one available space; starting an ordinary, saved-settings, or one-setting repeat requires three.

## Make room deliberately

Blocked controls explain how many spaces are required and available, with a **Review notebook** shortcut beside a blocked ordinary study start. Existing observations, current settings, notes, and pinned drawings are preserved. Trial recording also checks the latest notebook capacity before appending, so a queued action cannot evict a retained match.

Saved-study cards and saved reviews now offer **Delete saved study**. An inline preview names the experiment and the number of retained observations. It includes **Cancel deletion** and a specific **Delete N observations** action. Opening or canceling the preview does not change the notebook or expose hidden drawing values. Escape cancels this preview without collapsing the drawing workspace.

Deletion removes every retained member of the selected group, including partial or conflicting groups, while other records remain in order. Existing per-observation deletion remains available.

## Restore all records together

One **Undo deletion** restores a removed study's actual records at their original positions, preserving settings, impressions, notes, dates, trial metadata, and reveal states. Restoration is all-or-nothing: insufficient capacity, record or group collisions, malformed undo data, a changed notebook, or a changed learner profile cannot produce a partial restoration or remove another observation.

The same capacity protection applies to individual-observation Undo. A later save can leave too few spaces for a previous deletion's Undo; the button is disabled with a visible required/available explanation, and the undo buffer remains until another deletion or an invalidating state change replaces it. Deleting another observation replaces the single available Undo.

Deleting the reviewed study closes its review and comparison. Deleting its comparison study clears the pair while keeping the first review open. Recorded previews and report actions recheck retained groups, so they cannot expose a removed drawing. Undo restores records rather than reopening previous selections.

## Current state and keyboard focus

Confirmation checks the latest notebook fingerprint, learner profile, and pending action before deleting. Queued Undo and deletion actions also check component lifetime and profile, including the case where both the old and new notebooks are empty. Changing the notebook invalidates an open deletion preview. If that preview held focus, a surviving trigger or notebook heading receives focus; focus elsewhere is preserved.

The persisted notebook schema and import format remain unchanged. Existing oversized legacy input still uses the established normalization bound; this enhancement prevents active saves, matches, and Undo from silently evicting retained records.

## Verification

Final validation passed 111 new capacity tests and all 515 previous Perception tests, for 626 unique current-source tests across twelve files. Chromium passed 67 capacity, 37 import, 26 finder, 25 guided-study, 42 recorded-preview, and 23 comparison groups (220 total), with no reported errors. All recorded WCAG-tagged axe stages were clear. Five viewport widths, 44-pixel controls, dark and Windows forced colors, and 200% text passed reflow checks. Phone, forced-color, and enlarged-text deletion previews were visually reviewed. All 363 Perception English entries, source mirrors, discovery, and integration checks passed.

See [validation.json](validation.json) for final results, hashes, and integration checks.

The new verification files are `tests/perception_lab_notebook_capacity.test.js` and `dev-tools/perception_lab_notebook_capacity_qa.cjs`. Six previous tests that explicitly required eviction were updated to verify the new preservation contract; their four original files and hashes are retained in `legacy-before`. Other previous tests remain unchanged.

## Previews

- [Phone deletion preview](delete-preview-panel-390.png)
- [Windows dark forced colors](delete-preview-forced-dark-panel.png)
- [200% text](delete-preview-large-text-panel.png)
- [Browser regression aggregate](browser-regression-results.json)
- [Six updated capacity expectations](legacy-capacity-contract-updates.json)
