# Reading navigation browser QA

Run from the repository root:

    node reports/novak-reading-navigation/navigation-browser-qa.cjs

The runner bundles the existing generated reader module. Rebuild the reader before running after source changes. The --build-only option compiles the fixture without opening a browser.

- PASS: Older adaptation survives Original → Both despite newer companions
- PASS: Independent single-view and comparison scroll positions survive round trips
- PASS: Teacher source and language choices survive an alternate-original detour
- PASS: Changing comparison source or language stops prior audio; captured source uses its own language
- PASS: Reliable same-language passage linking highlights exact original content
- PASS: Ambiguous or unsupported links never highlight a guessed original passage
- PASS: Cross-language comparison never guesses related-passage highlights
- PASS: 320px layout supports keyboard switching, pane scrolling, and reduced-motion navigation
- PASS: No runtime errors or external service requests

Limitations:

- Production compiled reader and source contract inside an isolated stateful fixture, not the complete application shell.
- AI, actual speech synthesis, persistence, and host save handlers are not exercised; callbacks record local events.
- Offscreen version controls use DOM click for bookmark checks, avoiding Playwright auto-scroll before the reader captures position; keyboard checks use real browser input.
- Browser coverage is installed Microsoft Edge Chromium; no Safari or Firefox run.
