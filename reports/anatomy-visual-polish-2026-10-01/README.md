# Anatomy visual refinement

## What changed

- Structure details use theme colors and a system accent that follows the reading direction. Function has its own heading and readable callout. Origin and insertion sit side by side on desktop and stack on phones.
- Phone actions fit into two rows, with Practice as the primary action. Larger text gives utilities more space and puts the return-to-structures action on a full row. Utility actions, Function and Myth buster read-aloud buttons, relationship actions, and structure navigation provide at least 44px targets.
- Tour and Pathway steps have 21px headings, 16px narration, a full-width diagram action, a source and audio footer, and equal navigation buttons at least 48px tall.
- Larger text uses at least 17px for Function, Myth buster, relationship-map text, confidence controls, notes, and guided-step content. Dark-theme detail navigation, Myth buster text, and relationship surfaces now use readable theme colors.
- Existing grading, saved notes, progress, and focus actions remain in place. The browser journeys exercise returning to the diagram, advancing a guided step, changing the display, and opening Practice with saved notes intact.

## Verification

- **288 checks passed across 12 unit files**, using Vitest 4.1.5 with one fork worker and 120s test/hook timeouts. [Final unit results](verified-unit-results.json)
- **4 browser journeys passed, with no skipped tests or retries.** [Playwright results](playwright-results.json)
- **28 scoped axe scans passed with zero violations** across the full exercised detail, Tour and Pathway panels: desktop English, 320px English, 320px Arabic with larger text, light/dark/high-contrast themes, and a forced-colors detail check. Page and panel overflow checks passed. [Browser measurements](after-browser-validation.json)
- Reviewed all final screenshots at their original resolution. [Combined verification](verification.json)
- Canonical and desktop source copies are byte-equal. LF-normalized source SHA-256: `9d106ec6b49868f9d365f26150daa582db2ea4991fad350dc4541681dacd14e6`.

The scans cover the rendered panels and selected structures in these journeys. Arabic layouts include authored English anatomy content where a translation is unavailable.

## Visual evidence

| View | Before | After |
| --- | --- | --- |
| Desktop Explore | [Baseline](baseline/desktop-explore.png) | [Refined](after/desktop-explore.png) |
| Phone Explore | [Baseline](baseline/phone-explore.png) | [Refined](after/phone-explore.png) |
| Phone detail | [Baseline](baseline/phone-detail.png) | [Refined](after/phone-detail.png) |
| Phone Tour | [Baseline](baseline/phone-tour.png) | [Refined](after/phone-tour.png) |
| Phone Pathway | [Baseline](baseline/phone-pathway.png) | [Refined](after/phone-pathway.png) |
| Phone Cards | [Baseline](baseline/phone-cards.png) | [Verified](after/phone-cards.png) |

Additional final captures: [dark detail](after/phone-detail-dark.png), [Arabic dark detail](after/phone-detail-arabic-dark.png), [muscle metadata](after/phone-muscle-metadata.png), [Arabic dark Tour](after/phone-tour-arabic-dark.png), and [Arabic dark Pathway](after/phone-pathways-arabic-dark.png).

## Earlier findings

The first unit run found four outdated assertions already failing against the preceding Anatomy commit. The updated fixtures check complete Function and clinical explanations, source links, and shorter list previews against current rendered behavior. The original run is retained in [unit-results.json](unit-results.json).

Browser checks exposed an older narration rule overriding the intended font size, then a dark-theme Myth buster contrast problem caused by its translucent pastel surface. Both production styles were corrected. The fixture also needed explicit axe injection. Earlier diagnostic runs remain in [initial-playwright-results.json](initial-playwright-results.json) and [contrast-diagnostic-results.json](contrast-diagnostic-results.json); the final results above are authoritative. An earlier capture attempt encountered a browser resource error before completing.

A final unit attempt timed out while starting a thread worker, before collecting any tests. Its zero-collection report is retained in [unit-startup-diagnostic.json](unit-startup-diagnostic.json). Switching to one fork worker resolved startup; the completed final run above exercises all 288 assertions against the verified source.
