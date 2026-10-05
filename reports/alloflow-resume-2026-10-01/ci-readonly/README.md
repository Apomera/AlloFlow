# CI reconciliation — read-only evidence

Collected existing GitHub logs only. No workflow reruns, branch protection changes, source changes, dependency installation, or browser/test runner were performed in this lane.

The failed Verify run [36811362905](https://github.com/Apomera/AlloFlow/actions/runs/36811362905) evaluated `407f36e2dbb1b7c0990d5365c96731e34378756d`. The current checkout is `cb106fd68907b7cb73bdf7ad7b4c676bb1f70dc6` with additional uncommitted work. These logs establish previous failures; they do not establish current-candidate failures or passes.

## Confirmed previous failures

- All eight unit shards failed. Affected reading fixtures include Word Sounds localization, obsolete fallback/golden expectations, player refinement coverage, guided-path length, audio readiness, cancellation/save wording, and structural dispatcher-catch assertions. Their complete failure titles are retained in the JSON and sent to the relevant implementation owners. Unrelated STEM, document, voice-command, and localization failures are also present; no blanket attribution is made.
- The blocking local Heat/Nuclear browser job failed its expected `Nuclear & Radiation Lab` heading on desktop and phone. This is a locator failure in the old candidate, not proof that the current lab cannot load. Existing tests/source need reconciliation by the STEM owner.
- The static gate failed. Its log includes a jsdom CSS parse diagnostic during `check_stem_render.cjs`; the available log does not establish that diagnostic as the terminal failure cause.
- Advisory full verification reported nine failing checks: STEM `.find().field` access, command exact translation reuse, command identity staleness, runtime language-pack coverage, UI language-pack coverage, JSON/HTML request mismatch, help coverage, pipeline/document-builder tests, and the high/critical dependency audit. Those results must be rerun against a frozen current candidate before release.

## Enforcement boundaries

Current `verify.yml` defines blocking docs/remediation/static/unit/research/STEM-recovery/tagged-PDF/veraPDF jobs. Quarantine, full verification, deployed smoke, and CDN-heavy goldens are explicitly advisory. Merely defining a blocking job does not prove branch protection requires it. Repository settings were not changed or audited here.

## Evidence and limits

`run-36811362905.json` contains sanitized job metadata, failure titles, available totals, and selected diagnostics. `collect-ci.cjs` can repeat the same read-only collection and records the checkout HEAD at collection. No raw credentials, environment dumps, or complete raw logs are saved. Failure-title counts are not a WCAG/compliance measure or a deduplicated global test count.

The earlier run `36807029408` was not recollected in this lane; the parent reported 370 failures against an older commit. No full-current-suite green claim is made. Manual screen reader, real exported/downloaded artifacts, device-storage reload, and released Canvas startup evidence remain separate validation tasks.
