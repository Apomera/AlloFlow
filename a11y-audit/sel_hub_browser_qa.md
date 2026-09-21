# SEL Hub Browser QA

Generated: 2026-09-21T01:10:49.098Z

Harness: standalone SEL Hub and AlloHaven browser fixture

## Summary

- Passed: 20
- Failed: 1
- Scenarios: 6

## Checks

### desktop-light-focus
- FAIL runtime-error: locator.waitFor: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: /Build a new custom SEL Station/i }).first() to be visible[22m

- PASS responsive-overflow
- PASS theme-class-detected
- PASS first-run-explainer-dismissable
- PASS for-educators-focus-trap
- PASS share-packet-focus-trap
- PASS share-packet-lifecycle-reopen-draft
- PASS share-packet-lifecycle-update-in-place
- PASS teacher-launch-loads-station-preview

### desktop-dark-responsive
- PASS responsive-overflow
- PASS theme-class-detected

### tablet-high-contrast-responsive
- PASS responsive-overflow
- PASS theme-class-detected

### mobile-high-contrast-responsive
- PASS responsive-overflow
- PASS theme-class-detected

### allohaven-empty-portfolio
- PASS allohaven-empty-portfolio-entry-visible

### allohaven-mixed-portfolio
- PASS student-artifact-store-save-event
- PASS allohaven-portfolio-controls-labeled
- PASS allohaven-portfolio-source-filter
- PASS allohaven-portfolio-search
- PASS allohaven-portfolio-details-preview

