# AlloFlow WCAG 2.2 AA Current Audit

**Audit date:** July 11, 2026
**Engineering target:** WCAG 2.2 Level A and AA
**DOJ Title II regulatory baseline:** WCAG 2.1 Level A and AA

## Scope and interpretation

This report evaluates the current local desktop command center and the bundled AlloFlow application shell. The May 2026 VPAT was used as historical context, not as evidence of current conformance. Automated results apply only to the rendered states and viewports listed below. They do not establish full-product conformance across every tool, modal, generated output, assistive technology, or user workflow.

## Methods

- axe-core 4.12 through the repository's Puppeteer audit harness, with WCAG 2.0, 2.1, and 2.2 Level A/AA tags.
- Custom runtime checks for landmarks, bypass navigation, visible focused states, labels, live regions, canvases, and redundant-entry hints.
- Source review and focused Vitest regression tests.
- Reflow probes at 640 CSS pixels (200% equivalent from a 1280px baseline) and 320 CSS pixels (400% equivalent).
- Production desktop rebuilds before rendered application verification.

## Verified results

| Surface/state | Viewport | axe result | Additional result |
|---|---:|---:|---|
| Desktop command center, initial App pane | 1280 x 800 | 0 violations; 44 passes | 72 focusable elements; 0 custom violations |
| Bundled AlloFlow application shell, initial state | 1280 x 800 | 0 violations; 46 passes | 104 focusable elements; 0 custom violations |
| Bundled application, reflow probe | 640 x 800 | 0 violations | No document overflow and no off-screen interactive controls |
| Bundled application, narrow reflow probe | 320 x 800 | 0 violations | No document scrollbar, but header controls render off-screen; see open finding |

## Remediation completed in this audit

- Upgraded automated axe coverage to include WCAG 2.2 A/AA tags.
- Added rendered checks for application readiness and corrected false-positive focus, hidden-input, dialog, and target-size heuristics.
- Added desktop bypass navigation, named/synchronized tabs, arrow-key tab navigation, visible focus styling, hidden-button behavior, and sufficient contrast.
- Corrected a desktop service-worker scope leak that could serve the command center inside the bundled app route.
- Named the AI backend dialog, removed an interactive modal backdrop, added Escape handling, and corrected reset-button text contrast.
- Added non-empty accessible-name fallbacks for the global mute control.
- Placed application heading, AlloBot, and save/sync status content within appropriate landmarks or live regions.

## Open finding

### A11Y-REFLOW-001 ? Header controls render off-screen at 320 CSS pixels

**WCAG:** 1.4.10 Reflow (Level AA)
**Severity:** High
**Status:** Open; canonical header source was under active parallel modification during this audit.

At a 320 CSS-pixel viewport, the header settings cluster (approximately 426px wide) and utility cluster (approximately 397px wide) extend past the left viewport edge. Several controls therefore become visually and pointer inaccessible even though the document itself reports no horizontal scrollbar. The affected source is the header cluster around `tour-header-settings` and `tour-header-utils` in `view_header_source.jsx`.

Expected remediation: at the narrow breakpoint, stack or collapse the clusters into a viewport-contained menu; do not merely hide required functionality. Re-test at 320px with keyboard navigation and 200%/400% browser zoom.

## Manual verification still required

- Complete keyboard-only walkthroughs of every major workflow and modal, including focus return and focus-not-obscured checks.
- NVDA + Chrome/Edge and VoiceOver + Safari testing across representative teacher and student workflows.
- 320px/400% reflow after A11Y-REFLOW-001 is fixed, plus text-spacing overrides.
- Dragging alternatives for every drag-and-drop interaction (WCAG 2.5.7).
- Authentication flows and third-party identity providers (WCAG 3.3.8).
- Consistent help placement across multi-step processes (WCAG 3.2.6).
- Generated PDFs, documents, media, and AI-created content, which require their own output-level evaluation.

## Conformance statement

The tested initial states have no automated WCAG A/AA violations after remediation. Full WCAG 2.2 AA conformance is **not claimed** because one reflow defect remains open and the manual verification matrix is incomplete.
