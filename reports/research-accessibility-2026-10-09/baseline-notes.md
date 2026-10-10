# Research Accessibility Baseline

The baseline used the canonical built research UI, engine, and Gemini transport. Only provider responses and webpage fetches were simulated. No external requests were permitted. The runtime hash and machine-readable observations are in `browser-baseline.json`.

## Confirmed Issues

- Keyboard activation of Next excerpts on the final transcript page disabled that button and dropped focus to the document body, outside the dialog.
- Transcript page and search-result changes were not included in a live status announcement. The existing status reported only the number of selected excerpts.
- Clip times had visual validation, but neither field exposed `aria-invalid` or referenced the time-format/validation description.
- Opening the link inputs also exposed pasted-text title, textarea, and submission controls, even for a URL-only task.

## Existing Behavior Preserved

- Forward focus wrapping and Escape-to-trigger restoration worked in the tested dialog state.
- Scoped axe-core WCAG 2 A/AA and 2.1 AA scans reported zero violations for an empty review, invalid clip, and populated transcript. The keyboard focus regression required manual-style browser interaction and was not caught by axe.
- No page errors or external network requests occurred.

Automated DOM and browser checks do not replace testing with a real screen reader. This pass verifies accessible names, descriptions, live-region structure, keyboard behavior, and responsive geometry; it does not claim a full WCAG conformance audit.
