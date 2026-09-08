# Directions improvements — implementation

Implemented the five reviewed fixes and a formatted directions preview. Changes are built locally; no deployment was performed.

- Directions now export in HTML/IMS-compatible packs and worksheets, including the due line, body, goals, and choice-board content. An explicit export capability profile prevents packaging from treating directions as unsupported.
- The editor uses a viewport-bounded scroll area, with the save/cancel controls outside that area. It includes a live formatted body preview.
- The student view preserves all available stations, all valid goals, long goal labels, and the full directions body instead of silently truncating them.
- A canonical directions formatter is embedded in both the host and document pipeline by `npm run build:directions`. Directions use it regardless of document-module loading state. Nested lists and explicit step numbers are preserved.
- Quest-map width accounts for both stations and goals.
- Generated modules, desktop mirrors, and targeted CDN version pins are synchronized. The build uses atomic writes to tolerate OneDrive replacement locks.

Validation:

- All 23 focused tests passed: directions improvements, Markdown preview, and composer behavior. The improvements suite includes a full-pack export reproduction.
- All three existing export-profile tests passed in the isolated run.
- All 75 directions tests that completed in the broader final run passed. A separate goal-capabilities run passed 36 of 38 tests; the two failures concern the concurrently added `definitionDetective` glossary capability. Those unrelated edits were preserved.
- Direct checks passed for app JSX syntax, document syntax, shared formatter parity, and byte-for-byte generated document/composer/result-view parity. The subprocess-based build-parity test had exceeded its time limit; direct parity was checked after rebuilding the latest shared source.
- Chromium checks passed at 390 × 844 and 320 × 568: the editor and save controls fit, the body scrolls, and the formatted preview displays two numbered steps. The larger-content fixture preserved 13 resources, 25 goals, and text past the former 20,000-character limit. Four goals fit within a one-resource quest map.
- Automatic approval review timed out twice before a final browser repeat could start. The successful browser measurements are from the earlier implementation pass; subsequent changes added nested-list formatting, export-profile registration, preview memoization, and build reliability.

Evidence: `after/results.json`, `after/focused-tests.json`, `after/export-profile-tests.json`, `after/build-checks.json`, and the screenshots in `after/`.

Rebuild: `npm run build:directions`.

Focused tests: `node node_modules/vitest/vitest.mjs run tests/directions_improvements.test.js tests/directions_markdown_preview.test.js tests/directions_composer_extraction.test.js --pool=threads --maxWorkers=1`.
