# Collective release — October 5, 2026

Status: GitHub and [the public app](https://alloflow-cdn.pages.dev/app/) are published and live-verified; the Codeberg backup is incomplete. Source `6a0c487492cb5512eb5198caf90c78bb62355175`; generated release `d1b93de1ecd8fff1023c2b28159f3e16e46afe7a`. Codeberg main remains at checkpoint `d88e655911b1ed0947e3216cefa0d0b445e2fca8`. 168 assets matched across 336 requests (167 from the main report plus the separately verified storage bridge); all three clean-browser boot/reload checks passed with 123 observed response bodies. Both builds and GitHub pushes passed. Original/first-retry backup pushes failed HTTP 504; after the ancestor checkpoint succeeded, the final backup push failed curl 18 during delta resolution at 95%. Step 9 did not run. Normal Step 10 passed independently, without skip flags. Normal deployment gates/hooks also ran without skips. The focused checks passed 318 unit cases and eight native browser workflows. The broad audit still fails in 12 commands, and source CI has checkout and actual test failures plus a separate Worker build failure of unknown cause. A locally validated Windows checkout fix is prepared; its CI result is pending. All 9,418 excluded raw files remain local. Details: [release receipt](release-receipt.json) and [CI triage](validation/source-ci-triage.json).

The user explicitly requested committing and deploying everyone's shared work. Initial local main: `d88e655911b1ed0947e3216cefa0d0b445e2fca8`. Initial GitHub/Codeberg main: `407f36e2dbb1b7c0990d5365c96731e34378756d` (63 local commits ahead).

The release includes source, tests and durable reports. Raw browser recordings, response/resource dumps, temporary snapshots and files above the existing CDN size limit stay local. No contributor files are deleted.

Validation uses the required repository gate and normal deployment gates/hooks without bypass flags. The deployment script automatically defers its changed-unit-test gate to CI for batches above 120 files; that deferral does not establish a passing full unit suite.

Post-deploy helpers are copied from the reviewed September 27 release. Run both with explicit `--commit FINAL_SHA --base 407f36e2dbb1b7c0990d5365c96731e34378756d`. They compare official-origin responses to committed blobs and perform disposable browser boot/reload checks. They do not cover authenticated feature journeys, existing users' caches or every CDN location.

Production target: https://alloflow-cdn.pages.dev/app/. Firebase has a placeholder project and is skipped by the existing workflow. The isolated desktop web build is validated; this release does not publish a new installer.

## Source validation

- Moon Mission: 289 unit cases and eight native browser workflows passed.
- Optics navigation: six cases passed.
- Final deployment/Art Studio repairs: 23 cases passed.
- Render references and list-key gates passed after repairs; the Art Studio free-variable repair passed its scoped gate.
- The broader `verify:gate` audit remains failing in 12 commands. Its localization, accessibility/scanner and anchored-source findings are retained in [validation/SUMMARY.json](validation/SUMMARY.json) and individual logs. This is not a green full application audit. No bypass flags or manual baseline acceptance were used. The anchored-slice scanner performed its own automatic inherited-file baseline absorption, recorded in the summary.
