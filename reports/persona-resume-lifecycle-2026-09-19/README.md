# Persona saved-conversation recovery

Implemented September 19, 2026.

## Improvements

- A delayed saved-conversation lookup no longer offers an older transcript after the current conversation changes. An already visible offer disappears when newer conversation activity makes it stale. Same-length transcript revisions are covered.
- Initial panel greetings wait for the saved-conversation lookup before autosaving, protecting longer saved discussions from being overwritten during startup.
- Autosaves waiting for the storage bridge are invalidated when the interview closes, unmounts, or changes. Clearing a snapshot also cancels its debounce timer and invalidates pending saves.
- Resume is disabled while a reply or topic spark is pending, and its handler rechecks the current conversation before applying a snapshot.
- Resume/Discard action guards reset when switching resources. Discarding one resource's snapshot no longer prevents resuming another resource.
- Resuming revalidates character metadata against the current lesson, preserving teacher changes made after the resume offer appeared.

The chat renderer was rebuilt for both distribution locations and its loader cache key refreshed.

## Validation

**176/176 unit tests passed across 13 files. All 20 Chromium browser scenarios passed.** Persona JSX and bundle parsing, distribution-copy equality, and loader cache versions also passed verification.

The initial 13 lifecycle scenarios reproduced nine failures in the previous shipped module. The corrected module passed those scenarios; two more checks cover same-length transcript changes and teacher metadata updates.

The new tests render the shipped React chat component and control storage promises and time, making slow-read and late-save behavior deterministic. The browser suite checks the existing phone/desktop composer, mode controls, navigation, archive, and accessibility behavior. Storage race tests use a controlled adapter; they do not contact live storage or AI services.

Reproduce from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run tests/persona_ --maxWorkers=1 --testTimeout=30000 --hookTimeout=60000
node node_modules/@playwright/test/cli.js test --config reports/persona-resume-lifecycle-2026-09-19/playwright.config.cjs --timeout=60000
node reports/persona-resume-lifecycle-2026-09-19/verify.cjs
```

Evidence: [baseline failures](baseline-verbose.log), [unit results](unit-results.json), [browser results](browser.log).
