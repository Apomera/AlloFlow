# Maine SLD Case Lab

Complete locally in the AlloFlow Leadership Hub, reviewed October 2, 2026. The actual source-app preview is available at [Open Case Lab](http://127.0.0.1:65058/app/?tool=maine-sld-practice). No commit, push, production deployment or full application/installer build was performed.

## Activity

The React activity adapts the reviewed v12 fictional workshop into five areas: Case record, Score record, Evidence board, Form reasoning and Debrief. Three cases preserve the original distinctions: Alex's instruction-need evidence gap, Alex with general education explicitly adequate, and Jordan's comprehensive age-and-grade achievement record.

- Both Alex cases retain all 52 simulated WISC-V/WIAT-4 results, with correct standard/scaled-score labels, search and assessment filters. Scores are not treated as eligibility cutoffs or a required universal battery.
- Participants select findings, classify their role, explain interpretation limits, and distinguish access supports from teaching adaptations.
- Q1-Q9 reasoning keeps the eight academic areas, four Q3 subparts, four Q4 evidence streams, Q7 validity review, and separate Q8/Q9 decisions visible. A multilingual learner transfer checklist prompts further evidence.
- A revealed-on-request, reviewed debrief and three process-understanding questions support discussion without grading a real child's eligibility.
- Per-case work remains in the browser tab for up to 12 hours. Download/restore uses bounded, versioned JSON; reset/restore confirmations protect current work. Imported markup stays literal text.
- Print includes participant case information and responses, with 16 mm margins and no facilitator key. Copy activity link includes only the selected case, never worksheet responses.

## Deep links and host integration

The Leadership card is **Maine SLD Case Lab**. Native routing accepts `maine-sld-practice` and `maineSldPractice`. Public case entry opens the activity directly; return to Leadership follows the existing educator access gate when configured. A launch from the trusted Hub card returns to the Hub normally.

Prepared for the next deployment:

- General short path: `https://alloflow-cdn.pages.dev/maine-sld-practice`
- Case-specific route: `https://alloflow-cdn.pages.dev/app/?tool=maine-sld-practice&case=alex`
- Alternative cases: `case=alex-general-ed-adequate` or `case=jordan`

These public links are configured in source and have not been published by this task. The short redirect lives outside the generated STEM block and opens the default case. Case-specific sharing uses the canonical query route. [Cloudflare's redirect documentation](https://developers.cloudflare.com/pages/configuration/redirects/) supports the destination-query rule; incoming query preservation on the short path is not promised.

## Validation

**33 focused unit/integration checks and 13 distinct Chromium scenarios passed.** All 30 activity-scoped axe scans have zero violations across five steps, 1440/390 px widths and light/dark/contrast themes. Keyboard focus, mobile confirmations, print separation, worksheet transfer, real source-app deep entry, educator-gated return and the real Hub card roundtrip were checked. Root and an independent reviewer inspected desktop/phone/host captures; both browser print pages were rendered and visually checked.

Two final-candidate scenarios completed their assertions but timed out during browser closing. Both passed unchanged focused reruns with local artifact storage; source, assertions, 120-second limit and zero automatic retries were preserved. [TESTING.md](TESTING.md), [validation-summary.json](validation-summary.json) and raw results distinguish successful coverage from retained attempts. This is scoped Chromium validation, not a comprehensive assistive-technology or production release audit.

## Content review

The summarized training claims were checked against current official Maine materials, with no blocking inaccuracies found. All 52 score labels/values exactly match the original fictional fixture, and all form source IDs resolve. The separate adverse-effect procedure excludes SLD; Q8 and Q9 remain distinct. Multilingual guidance covers access, assessment validity/norm limitations, primary cause, timely evaluation, and concurrent ESOL/special education. [Content audit](content-audit.json) records the scope and source links.

The SLD checklist's official URL is posted as August 13, 2026; its cover is marked Updated June 10, 2026. Current sources are the [Maine DOE SLD checklist](https://www.maine.gov/doe/sites/maine.gov.doe/files/inline-files/Supervision%20and%20Monitoring%20-%20Specific%20Learner%20Disability%20Checklist%20-%208.13.2026.pdf), [MUSER Chapter 101](https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/071c101-2026-129-AMD-EMR.docx), [IDEA specially designed instruction](https://sites.ed.gov/idea/regs/b/a/300.39), and [Maine multilingual learners with disabilities guide](https://www.maine.gov/doe/sites/maine.gov.doe/files/inline-files/Multilingual%20Learning%20-%20Identifying%20%26%20Serving%20Students%20Who%20are%20Multilingual%20with%20Disabilities%20Policy%20%26%20Resource%20Guide%20-%204.14.2025.pdf). Review covers these fictional training summaries, not a complete evaluation or an actual eligibility decision.

## Source and release provenance

Authoring files are `maine_sld_case_data.json`, `maine_sld_practice_core.js`, and `maine_sld_practice_source.jsx`. The focused builder is `_build_maine_sld_practice_module.js`; it exports `window.AlloModules.MaineSldPractice.MaineSldPracticePanel`. Change the case version when reviewed case content changes so older worksheet transfers are not silently reused.

Final activity SHA-256: `94bb51978ae58be5b7e88e36fc1cdc0150d4cf35ecc9f5ad91ae82c62062ef1f`. Four new activity asset copies match, all three host sources use pin `94bb5197`, and the Admin Hub root/public pair matches. [Final static verification](final-static-verification.json) records current hashes. [Integration report](integration/README.md) records the exact tested source snapshot, narrow shared-file changes and reproduction details.

Concurrent work was preserved. Existing packaged Admin Hub/application outputs were not rebuilt, so the working source preview is the review target. The preview helper remains running on port 65058.
