# Aquaculture seasonal explorer — October 2, 2026

AquacultureLab now connects a farm design to an inspectable modeled year and a controlled redesign experiment.

- Seven selectable measurements with solid B / dashed A curves, event markers for both scenarios, twelve keyboard-accessible month controls, and shortcuts to the lowest oxygen or scheduled disturbance.
- Monthly readings with signed A/B differences, exact species threshold diagnostics, all warning signals, and an equivalent expanded table.
- One-input redesign previews for exchange, oxygen, stocking, and contained-system biofilters. Previewing does not change saved inputs; applying preserves predictions, reflections, evidence, history, and an existing A. When A is absent, applying captures the current farm as A.
- Numeric CSV export with twelve or twenty-four monthly rows and explicit units.
- Empty communities produce zero biomass, survival, resilience, effort, and harvest indices. Search normalization preserves the letter s.
- Repeated Maine LPA licensing errors corrected across the reference material, missions, chart, lesson activities, glossary, quiz, and statutory summaries. Acre-scale examples are explicitly illustrative leases. Calcium-carbonate carbon mass is distinguished from carbon-dioxide equivalent mass.

Validation: 74 distinct focused tests passed across nine suites and completed retries. The first new-suite fixtures needed canonical legacy defaults and precise oxygen expectations; final assertions test the full-precision threshold behavior. An existing guided suite encountered worker/setup timeouts under machine load and passed all five checks on a normal-timeout retry. Chromium passed at widths 1280, 390, and 320: keyboard month selection, event timing, all seven measurements, preview purity, baseline capture and retention, draft preservation, downloaded CSV bytes, save/reload, reflow, and scoped axe checks. No page errors or new-panel WCAG A/AA violations. Forced-colors and reduced-motion layout checked at 390px. Screenshots visually inspected. Root/public syntax, whitespace, and mirror hashes match.

Runtime SHA-256: d1f7b36324e7cea7917ad82932bcdf34cfa7d59181e143c279714eeb8f8ae387.

Scientific scope: this remains an ordinal classroom model. Species signals explain reference bands; they do not establish mortality forecasts. Shared growth/survival rules, fixed processing and load, seasonal offsets, and omitted oxygen-solubility/nitrification/nitrate/pH feedbacks are disclosed in the explorer. Broader historical industry counts and revenue claims were not independently validated. New interface copy uses English fallback content. No full-host build, live provider evaluation, deployment, or push.

Primary references:
- https://www.maine.gov/dmr/aquaculture/public-participation-in-aquaculture-leasing
- https://www.maine.gov/dmr/aquaculture/applications-and-forms/limited-purpose-aquaculture-lpa-license-applications-and-forms
- https://www.usgs.gov/tools/dotables
- https://www.fisheries.noaa.gov/resource/tool-app/oyster-aquaculture-nutrient-removal-calculator

Evidence: browser-results.json, desktop.png, phone.png, phone-320.png, forced-colors.png, redesign-desktop.png, and sample-timeline.csv. Browser fixture: seasonal-browser-qa.cjs. All unrelated working files and shared staging were preserved; the shared handoff row remains unstaged.

Commit status: the scoped add/commit could not proceed because another Git operation holds .git/index.lock. The lock was left untouched; aquaculture files remain saved and uncommitted. No unrelated staging was changed.
