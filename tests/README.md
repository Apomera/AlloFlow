# AlloFlow Test Suites

This directory holds **two complementary suites**:

1. **Unit / clinical-logic tests** (Node + vitest) — verify pure functions: scoring, classification, PII scrubbing, RTI tiers, etc.
2. **End-to-end browser tests** (Playwright) — verify the live deployed app: app boots, modals open, all 174 STEM + SEL tool CDN files are reachable, flagship tools render without throwing.

## Layout

```
tests/
  # — Unit / clinical-logic tests (Node + vitest) —
  clinical_tests.js              # 111 tests across 3 tiers (Tier 1/2/3)
  translation_pipeline.test.js   # 22 tests — DNT masking + glossary preamble + round-trip
  *.test.js                      # anchor_charts, glossary, math_helpers, etc.
  extracted_logic/
    clinical_logic.js            # Pure functions copied from source modules
  setup.js
  README.md                      # this file

  # — End-to-end Playwright suite (~280 tests, runs against production) —
  e2e/
    01-app-boot.spec.ts                 # 6 tests — page mounts, no critical errors
    02-launch-pad.spec.ts               # 5 — mode picker (Full/Guided/Learning/Educator)
    03-cdn-modules.spec.ts              # 4 — lazy CDN module loading
    04-learning-hub.spec.ts             # 6 — Learning Hub modal + 6 tiles
    05-sidebar-controls.spec.ts         # 10 — mute/theme/animation/language toggles
    06-stem-lab-modal.spec.ts           # 5 — STEM Lab modal + registry contract
    07-sel-hub-modal.spec.ts            # 5 — SEL Hub + StoryForge + AlloHaven
    08-sidebar-tool-categories.spec.ts  # 23 — sidebar tool categories visible
    09-a11y-baseline.spec.ts            # 7 — lang/landmarks/alt/keyboard nav
    10-public-pages.spec.ts             # 8 — catalog.html, contribute.html, critical CDN
    11-stem-tools-load.spec.ts          # 26 — 13 flagship STEM tools: CDN + registry
    12-sel-tools-load.spec.ts           # 70 — every SEL Hub tool CDN reachable
    13-stem-tools-all-cdn.spec.ts       # 104 — every STEM Lab tool CDN reachable
    14-flagship-tool-render.spec.ts     # 6 — Optics/Solar/Plate/Cell/Chem/Raptor render
    helpers.ts
    README.md                            # E2E-specific docs
```

## Quick Start

### Unit tests (clinical logic)
```bash
node tests/clinical_tests.js          # standalone (no deps)
node tests/translation_pipeline.test.js  # standalone (no deps) — DNT + glossary
npm test                          # all vitest tests
```

### E2E (Playwright)
```bash
npm run test:e2e                  # all tests, headless, against production
npm run test:e2e:headed           # visible browser
npm run test:e2e:report           # open HTML report from last run
PW_BASE_URL=http://localhost:3000 npm run test:e2e   # against local dev server
npx playwright test tests/e2e/01-app-boot.spec.ts    # single file
npx playwright test --grep "Optics"                  # tests matching a name
```

E2E suite takes ~15-18 minutes against production. Run unit tests in seconds.

---

## Why the Unit Tests Exist

AlloFlow's clinical tools make real decisions about real students. The Report Writer generates psychoeducational reports used in IEP meetings. The RTI Dashboard classifies students into intervention tiers. The familiarity system determines which words to practice. A regression in any of these functions could affect the services a student receives.

These tests verify the **pure logic** — the scoring algorithms, classification lookups, and data transformations — that form the clinical decision-making core of AlloFlow.

### How It Works

The source modules (report_writer_module.js, student_analytics_module.js, etc.) contain clinical logic mixed with UI code, React state, and API calls. The `extracted_logic/clinical_logic.js` file contains **copies** of just the pure functions — the parts that take data in and produce data out with no browser or API dependencies.

The tests import from `extracted_logic/clinical_logic.js` and verify known-answer behavior.

**Important:** The extracted logic file is a mirror, not a replacement. The source modules still contain the originals. If you change a clinical formula in a source module, update the extracted copy and run the tests.

## Test Tiers

### Tier 1: Clinical Decisions (affects student services)
- **Score Classification** — Standard score and T-score to label mapping (Average, Borderline, Clinically Significant, etc.)
- **Percentile Calculation** — Abramowitz-Stegun error function for standard score to percentile conversion
- **PII Scrubbing** — Student name and date redaction for FERPA compliance
- **RTI Tier Classification** — Quiz, fluency, word study, and math metrics to Tier 1/2/3
- **Developmental Norms** — Age-referenced attention span, tantrum frequency, social play, vocabulary lookups

### Tier 2: Learning Tracking (affects practice & growth)
- **Familiarity Score** — Weighted composite of interactions, accuracy, and recency
- **Word Growth Levels** — Context breadth x familiarity depth to seed/sprout/growing/blooming/mastered
- **Codename Generation** — Privacy-safe identifier format validation and collision space
- **Pearson Correlation** — Practice-to-quiz correlation calculation
- **Aimline Calculation** — Progress monitoring slope and alert detection

### Tier 3: Data Quality (affects reports & exports)
- **Math Fluency Benchmarks** — Grade/operation/season lookup with strategic and frustration thresholds
- **Error Analysis** — CBM error categorization and frustration detection
- **Issue Normalization** — WCAG code extraction, dangling paren cleanup, punctuation enforcement
- **Issue Merging** — Cross-auditor deduplication
- **Duration Formatting** — Observation timing display
- **Assessment Preset Integrity** — All 11 presets have valid scoreType, mean, sd, and subtests

## Bugs Found & Fixed by This Test Suite

The initial test run revealed two bugs that have since been fixed:

1. **Tantrum frequency norms** (fixed in report_writer_module.js): The `crossReferenceDevNorms` function originally checked only `value >= typicalMin`, but for tantrums `typicalMin` is 0, so any non-negative value was classified as "appropriate" — even 10 tantrums/week for a 7-year-old. **Fix:** The function now checks `clinicalThreshold` first (returning "Clinically Elevated"), then `typicalMax` (returning "Elevated" for values above the typical range), before the within-range check.

2. **Grade 'K' benchmark lookup** (fixed in math_fluency_module.js): The `getBenchmark` function stripped non-digit characters first (`'K'.replace(/\D/g, '') === ''`), which fell through to the default grade '3'. **Fix:** The function now checks for 'K' (case-insensitive) before stripping digits.

## Adding New Tests

Follow the existing pattern:

```javascript
test('Descriptive name of what you are verifying', function () {
    var result = logic.someFunction(input);
    assert.strictEqual(result.field, expectedValue);
});
```

For clinical tests, **you** (the clinician) should verify the expected values against the actual assessment manuals. The test framework just ensures the code produces those values consistently.

## Source Module Mapping

| Extracted Function | Source Module | Lines |
|---|---|---|
| `classifyScore` | report_writer_module.js | 97-107 |
| `calculatePercentile` | report_writer_module.js | 849 |
| `scrubPII` | report_writer_module.js | 834-841 |
| `crossReferenceDevNorms` | report_writer_module.js | 355-368 |
| `classifyRTITier` | student_analytics_module.js | 885-978 |
| `calculateAimline` | student_analytics_module.js | 2610-2639 |
| `computeCorrelation` | student_analytics_module.js | 2640-2669 |
| `getFamiliarityScore` | symbol_studio_module.js | 779-789 |
| `getGrowthLevel` | symbol_studio_module.js | 3100-3110 |
| `generateCodename` | symbol_studio_module.js | 49 |
| `getBenchmark` | math_fluency_module.js | 43-57 |
| `getBenchmarkLabel` | math_fluency_module.js | 59-63 |
| `analyzeErrors` | math_fluency_module.js | 66-96 |
| `normalizeIssue` | doc_pipeline_source.jsx | 256-288 |
| `mergeIssues` | doc_pipeline_source.jsx | 289-298 |
| `fmtDuration` | behavior_lens_module.js | 165-170 |
