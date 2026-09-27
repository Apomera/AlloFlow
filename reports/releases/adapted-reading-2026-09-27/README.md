# Adapted-reading and simulator release

The production release is deployed and verified at <https://alloflow-cdn.pages.dev/app/>. `deploy.sh` completed with exit code 0. Its temporary shell-propagation warning was resolved by the subsequent exact-byte and browser checks below.

## Published commits

- `14a2d9cfa1d19a3a8d64ebe7d017d35fe0d777f5`: integrated adapted reading, research, delivery and simulator work.
- `37bdb2883edeba6ba2b29b0fa1983a45af42c79a`: release accessibility, word-help, export-warning and focused test repairs; the production host's `pluginCdnVersion` is `37bdb2883`.
- `0cc63c58e949fe6ed4f6c245db0746354653872f`: final generated web shell and CDN references. GitHub and Codeberg `main` both matched this commit after deployment.

Cloudflare Pages deployment `d5b95c96-e203-417c-8bae-5f17731a27cc` succeeded at 2026-09-27 02:32:32 UTC. The desktop web flavor was separately built, atomically staged and validated locally; this run did not publish a new desktop installer. Firebase was intentionally skipped because no school-owned project is configured.

## Teacher and learner changes

- Reading answers, bookmarks and support drafts have safer persistence, recovery and navigation behavior. Word help handles stale requests and malformed data, and vocabulary preservation is checked before Apply.
- Student preview captures the current appearance, supports explicit refresh and isolates teacher interaction, storage and audio. Narration distinguishes playable audio from verified device storage and supports targeted retry.
- Research uses the exact topic, shows progress before writing and stops with retry guidance when usable research grounding is unavailable. Own-file reliability improvements preserve selections, successful imports and generation-time citations. **This does not add a teacher source-approval pause.**
- Raptor Lab adds guided investigations, a field notebook, paused 3D study and comparable saved flight moments. Evolution Lab adds the Living Island, inherited traits, generations, survival replay and family tracing. Kitchen Lab adds direct ingredient handling and observable cooking actions with keyboard alternatives and recorded observations.
- Cephalopod Hunter's anatomy, motion, reef mission, touch controls and paused specimen inspection were delivered in ancestor commits `6b63e76e8` and `a9c8fb362`; the release repair uses native control labels and a summary heading.

## Verification

| Check | Result |
| --- | --- |
| Normal deployment affected-test gate | 111 tests across 7 files passed; existing four quarantine exclusions retained |
| Web production compilation | Passed; `main.3231e3b9.js`, `main.99f5a409.css` |
| Desktop web compilation and validation | Passed; key scan, source/public/build parity, manifest and service-worker consistency |
| Public committed-byte checks | 52 of 52 selected files matched commit `0cc63c58e`; no mismatches |
| Static URL-reference comparison | 261 checks, zero mismatches and zero unavailable checks in the recorded summary |
| Live Chromium smoke | 3 passed: expected title, no critical page errors, active-service-worker reload |
| Script post-deploy checks | Module freshness, host hashes and veraPDF runtime identity passed; initial shell propagation warning resolved afterward |

The public-byte checks cover the actual app shell, boot files, Canvas host text, critical reader/engine modules, changed runtime and simulator assets, and selected locales. They do not cover every asset, every locale or every feature journey. Live smoke used fresh browser contexts and did not access student data.

Earlier integration validation passed 900 tests across 40 files and nine browser acceptance runs. Separate release repairs passed 105 bilingual tests, 106 reader tests, 71 cancellation/word-help tests, 22 export tests, 44 restore/engagement tests, 19 audio-preparation tests, six Cephalopod unit tests and two Cephalopod browser cases. These groups overlap and must not be added into a unique-test total. One initial Cephalopod WebGL setup failure passed on its focused recheck. The object-child gate checked 87 surfaces.

## Remaining limits

**Global CI is not green.** All eight unit shards on source commit `37bdb2883` failed. Remaining findings include stale extraction fixtures, translation checks and expectation/golden mismatches; not every failure has been classified, and this release does not claim they are all pre-existing. The new Cephalopod ARIA and export-toast failures cleared. The six remaining toast-gate modules, checker and ratchet baseline are byte-identical to `fd4044c`, as documented in `source-ci.json`. Some CI render checks skipped for missing React/jsdom dependencies; later static gates did not run after the toast failure.

Source CI also recorded failures in the non-blocking deployed-demo render smoke and full verify suite. The render-smoke cause and tested deployment/route remain unclassified here; the three passing final live checks cover boot and reload only and do not supersede those broader failed checks.

The separate `Workers Builds: alloflow-cdn` check failed for the final generated commit (build `c18ea5c0-764d-4132-ab21-7db601b915fd`). The Cloudflare Pages target succeeded and its public bytes were verified. The Worker's underlying cause and purpose were not established from the available check metadata.

The Storybook warning has a safe translation lookup and exact English fallback; catalog registration and locale completion remain deferred. Broader translation coverage, manual assistive-technology/native-zoom checks, live provider/codec checks, cold-start offline scenarios and deeper memory profiling remain documented follow-ups in the integration handoff.

**Gemini Canvas:** an existing Canvas artifact must be updated with the revised `AlloFlowANTI.txt` host bridge as well as current CDN modules. Manually check `water cycle` with Research with Web Search and own-files use both on and off. Research should precede writing; unavailable usable research should stop with retry guidance. Controlled provider fixtures and the public-app smoke do not establish a live Gemini Canvas account result.

## Deployment recovery and preserved files

An earlier attempt was stopped after its successful web build to repair newly identified release regressions. A later changed-test attempt unexpectedly selected the whole suite because an untracked report snapshot's `package.json` matched Vitest's force-rerun pattern. Only that exact temporary snapshot path was added to local `.git/info/exclude`; its bytes were preserved. No gate, quarantine entry or test-skip flag was changed. The next normal run selected seven test files and passed all 111 tests.

Temporary baseline copies and diagnostic files were kept outside the release commit. The 26 SEL review PNGs regenerated by the interrupted broad test run were preserved unstaged. All other tracked source/generated files were clean after publication. Only the release owner's exact aborted desktop temporary build was removed; no other chat's files or worktrees were cleaned up.

## Evidence

- `live-assets.json`: committed SHA-256 values, GET results and URL-reference comparisons.
- `live-browser.txt`: the three deployed Chromium results.
- `deployment.json`: script outcome, commit identities and publish destinations.
- `generated-ci.json` and `source-ci.json`: time-stamped CI snapshots and static baseline proof; pending checks are not passes.
- `baseline-config-local-exclude.json` and `force-rerun-trigger-check.json`: exact temporary snapshot preservation and test-selection diagnosis.
- Earlier integration: `reports/adapted-reader-integration-01-2026-09-26-1730/pass-two/HANDOFF.md`.

This receipt is a documentation follow-up to the generated release commit; it does not change the deployed runtime bytes.
