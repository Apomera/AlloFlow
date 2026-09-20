# Sidebar accessibility follow-up — September 19, 2026

The Create-tab loading relationship (INV-01) is repaired and verified in a fresh local app preview. This follow-up extends the [September 19 audit](../README.md) and [current VPAT](../../../VPAT-2.5-WCAG-AlloFlow.md).

## Changes

- Create and History now control persistent, labelled tab panels. Their IDs exist during loading and while inactive; inactive content is hidden. Existing tour and source-input IDs remain intact. Desktop panels accept focus; mobile retains its outer workspace tab-panel relationship.
- Both arrow directions wrap between tabs. Home/End move focus; Enter/Space activate. Tab buttons use their visible translated names, have English fallbacks when translations are missing, and cannot submit a surrounding form.
- The desktop workspace has a named region role. The History resource count has a named, atomic status role and stronger text contrast. Its measured light-theme contrast improved from 4.34:1 to 13.35:1 in the live preview.
- The History More menu supplies aria-controls while its popup exists. Keyboard opening focuses a menu item; Escape closes the menu and restores the trigger.

These relationships and keyboard behavior follow the [W3C tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). Pattern guidance supports implementation review; it is not itself a product-wide conformance determination.

- Repaired a confirmed mobile catalog reflow issue: its grid used an intrinsic column width of 375.5px inside a 288px sidebar. The column now fits its container, keeping Collapse, Show all tools, purpose filters and Expand All within the 320px viewport, including enlarged text spacing. [Before-fix bounds](browser-before-mobile-fix.json) preserve the evidence. Document-level overflow checks alone had missed this inner clipping.

## Verification

[Browser evidence](browser-results.json): **8 interaction/layout checks pass**, with **zero axe A/AA violations and no document overflow in five sidebar states**: desktop loading Create, ready Create, ready History, and mobile Create at 320px with normal and enlarged text spacing. No page errors were captured. The source module's response was deliberately held until the loading and tab-switching checks finished. The runner uses current generated App.jsx, React, local canonical lazy modules, and an isolated esbuild development bundle with the existing compiled Tailwind sheet. It does not replace or certify the production /app/ release. Third-party requests were blocked; data are from a fresh unauthenticated session.

**34 distinct regression assertions pass across focused runs:** [18 existing sidebar assertions](sidebar-retest.json), [5 navigation and 7 History discovery assertions](final-tests.json), and [4 History theme assertions](history-theme-retest.json). The final-tests file also retains one initial theme-test failure: its old selector searched for aria-controls while the popup was closed. The updated regression selects the menu button by its popup semantics and verifies the conditional relationship; all four theme tests then pass. The [initial navigation failure](navigation-before-fixture-fix.json) came from the isolated harness using the browser's native History constructor instead of the app's icon; the corrected fixture supplies that icon. The first combined run omitted the requested navigation file, so its 18-pass report is counted only for the two files actually present.

A later [sidebar regression run](sidebar-final-tests.json) reported one stale dependency-test failure after a concurrent change introduced a module-local ReadingSourceChoice helper. The test now recognizes declared module helpers while still rejecting unresolved host captures; the final sidebar retest passes all 18 assertions.

Generated navigation, History and sidebar-panel modules match their public mirrors. Local shell sources were regenerated with the development shell-only build. [Validation](validation.json) records source hashes, syntax checks, document links and the 55-row VPAT inventory. Changes are local; no publication occurred.

## Remaining limits

The final ready-History axe sample retains contrast review items for four nodes with gradients/background imagery: heading, saved status, filter select and empty-state message. They are incomplete checks, not asserted passes. The open menu retains axe's popup-target review item; the browser checks directly verified its target, focus and dismissal. Status announcements still need assistive-technology verification.

This is a sampled local browser audit. NVDA/VoiceOver, browser-native zoom, authenticated and complete workflows, generated outputs, other browsers, additional themes/forced colors in the complete app, and other tool findings remain open. The VPAT ratings remain qualified and unchanged.

## Reproduce

After regenerating current local sources and module mirrors, run:

```powershell
node reports/wcag-audit-2026-09-19/sidebar-followup/run-browser.cjs
node node_modules/vitest/vitest.mjs run tests/sidebar_tabs_navigation_a11y.test.js tests/sidebar_shell_extraction.test.js tests/view_sidebar_panels_wcag_a11y.test.js tests/history_panel_discovery_controls.test.js tests/history_panel_theme.test.js --maxWorkers=1 --testTimeout=60000
```
