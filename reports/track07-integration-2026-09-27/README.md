# Track 07 local integration

Integrated the pending preserved-vocabulary language/readiness and reading-pane completeness increments into the current shared reader. Candidate and Apply use the same exact-term, source-pane and completeness contract; rejected candidates retain the source and actionable feedback. No silent term truncation or prompt-only compliance claim.

The final citation regression reproduced a false rejection for cited Spanish with translation disabled. Citation validation now checks a new translation only when the resolved policy requires one, after validating required panes. Missing, changed and duplicated citations still reject; requested translations retain citation checks.

## Baseline and coordination

Integration started from shared HEAD 13ebcc73f5784436643adc7c12ff8d83d5b29028; the isolated development checkout was based on fd4044c862ed9b345b340d69cb1411a19c09dafb. Current source, not that older HEAD, supplied the combined reader and both embedded helpers. Track 01 released reader/host/build ownership and its completed memory/partial-save changes. Track 10 released its completed prepared-help reader changes and regression suite. Their current source was preserved and rebuilt. Track 05 commit acknowledgement and stale-request safeguards remain covered.

An unrelated commit advanced HEAD to 286e09850680047d44efcc836075916cf488eff6 during checks. The recorded source/module/test/host inputs stayed stable; unrelated Scale Explorer/DinoLab English catalog additions were reviewed and preserved but excluded from the scoped commit. No deployment or push was performed; a local commit does not identify deployed bytes.

## Validation

- Initial combined run: 448 passed, one 5-second timeout in a support-draft image-picker test.
- Unchanged support-draft rerun: 58/58 passed with normal timeouts. All 449 distinct tests across 17 files passed across the run and retry.
- Browser fixture: 29/29 scenarios passed, zero page errors; Chromium, React StrictMode, blocked network.
- Isolated citation reproduction: one failure among 34 cases before the fix; 34/34 after.
- Three affected builders completed. Six root/public module/catalog pairs match; all three hosts use the generated hashes in validation-summary.json.
- Normal Git commit hooks are required; commit outcome is recorded in the chat.

The commit includes the completed reader memory and partial-save dependencies, prepared-help regression tests, and only track 07 catalog additions/module-pin changes. Other active-agent changes remain outside its scope. Full application packaging, deployed bytes, live providers, real screen readers and device audio were not validated. Other locale packs continue to fall back to English for these new keys.

Local detailed evidence is in integration.json, unit.json, draft-rerun.json and browser.json. The committed validation-summary.json keeps the portable results and hashes. Future reader work must merge against the combined source and rebuild with both reader_place_store.js and reader_support_drafts.js.

Commit recovery: the tool session interrupted the first commit attempt before any commit landed. The later Moon Mission commit e6e137b8e07a544beda49e54a7a2cdbbd778de65 has no overlap with this scope. Validated source/module/test/host fingerprints remained unchanged; only unrelated English catalog changes remain outside the commit. The reviewed private index was rebuilt on the new base, preserving shared staging and normal hooks.
