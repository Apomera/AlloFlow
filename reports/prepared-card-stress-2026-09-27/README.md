# Prepared-help card stress pass

The authorized stress pass found **no additional confirmed reader defect**. This pass changed no production source, generated modules, loader references, catalogs, original passage/citation data or shared Git index entries. The improvement is a reproducible browser regression fixture with explicit browser limitations.

## Baseline and ownership

Shared HEAD: `3752fe48d98ee8096e456d766427f3f513a11b25`. Isolated checkpoint at start: `77023912c23f11c96716ae6bd5917d4d4808377a`. Current shared reader SHA-256: `4fdd4c1c0013146b89072f09b72e5ffa588484861d3cb3f37aae588a10790265`. Reader module root/public pair: `ca2364ecc2e5e6f7bd9ebba26279dff79aae49227bc1615a7ddb1a8dd45ed493`. The shared working tree contains integrated, uncommitted reader/editor/cache changes; HEAD alone is not that runtime or a deployed-release identity.

The final receipt records shared HEAD `13ebcc73f5784436643adc7c12ff8d83d5b29028`, advanced by a concurrent squid/reef commit whose changed-file list was inspected. None of the recorded reader/helper/host/engine/style/test inputs drifted. The shared index differs from the earlier integration receipt because the other owner committed its previously staged files; this pass made no shared-index changes. Receipt: `card-stress-final/input-receipt.json` (shared report copy: `input-receipt.json`).

No applicable repository AGENTS.md was found; the isolated ancestor instruction file is empty. AGENT_HANDOFF ownership/commit instructions were followed. This pass owns the isolated browser fixture, new `card-stress.cjs`, report/evidence, and work-log rows. Track04/09 prerequisites remain integrated. Any later source fix must preserve the current shared editor/helper changes and rebuild from those inputs.

## Cases and results

Both installed engines completed ten cases: desktop long explanation; 320px phone; phone with doubled root text; landscape; landscape with doubled root text; 320x225 reflow equivalent to a 1280x900 viewport at 400%; Arabic phone; Arabic landscape with doubled text; Arabic/English mixed text with a long unbroken token; and touch activation followed by portrait-to-landscape rotation.

Every case uses a picture with source/license credits. Long translated action labels stress wrapping. Assertions cover viewport containment, horizontal overflow, control visibility after focus-driven scrolling, language/direction, exact pronunciation callback text/language, no lookup/sentence playback on activation, owned-audio cancellation, Escape focus return, and unchanged passage/support/citation data. Two credit links remain present, retain HTTPS destinations and accept visible focus. Screenshots of the narrow popup and focused credits were visually inspected.

- **Chromium: 10/10 scenarios passed**, including native keyboard traversal of every button and both credit links. Installed package revision 1223, version 148.0.7778.96.
- **WebKit: 10/10 scenarios passed for the supported checks**, including native keyboard traversal of buttons and separate programmatic focus/visibility of both credit links. Native credit-link traversal is **not verified**: this Windows test engine skipped ordinary anchors on a plain HTML control with both Tab and Alt+Tab. Installed package revision 2287, version 26.4. This is a WebKit test run, not a Safari device certification.
- No page errors in either final run. Evidence: `card-stress-final/chromium-card-stress.json`, `card-stress-final/webkit-card-stress.json`, and corresponding screenshots.

## Initial flags and classification

| Observation | Classification and evidence | Disposition |
| --- | --- | --- |
| WebKit initially skipped two card links in all nine keyboard cases. | Reproduced engine/harness limitation: the plain HTML Before button → Source anchor → After button control also skips the anchor with Tab and Alt+Tab. No reader code is present in that control. `card-stress-verified/webkit-card-stress.json:navigation`. | Keep native credit-link traversal unverified for this engine. Check card buttons natively; check link semantics, focus and scrolling separately. Do not alter production link semantics to compensate for a driver behavior. |
| WebKit initially reported partially clipped focused buttons. | Fixture timing: measurements ran before asynchronous native focus scrolling settled. All clipping flags disappeared when the test awaited target visibility for up to one second. Initial and diagnostic JSON retained in `card-stress-before` and `card-stress-verified`. | Corrected the fixture's observation timing; no reader fix. Persistent clipping would still fail. |
| The 320x225 card initially shows mostly its title and identification. | Expected constrained layout, not a reproduced access failure. The long body scrolls vertically; the explanation, controls and credits remain reachable. Existing viewport geometry: `view_simplified_source.jsx:1248`, `:1268`; card: `:5464`. | No automatic source change. A future product decision could explore a taller card for short screens, with separate user evaluation and regression checks. |

Existing source safeguards were sufficient: visualViewport-aware size/position updates, internal vertical scrolling and word wrapping, localized paragraph direction, semantic buttons/credit links, and scoped audio/focus cleanup. Original/translation matching and source text were not rewritten.

## Reproduction

From the shared workspace, use the copied fixture under `reports/prepared-card-stress-2026-09-27`. It compiles the current reader in memory, uses the app Tailwind config/index.css, creates only a disposable loopback/browser fixture and writes report files. The server/browser close on completion. No provider call or live saved app state is involved.

```powershell
$env:PREPARED_HELP_SOURCE_DIR=(Get-Location).Path
$env:PREPARED_HELP_STYLE_DIR=(Get-Location).Path
$env:PREPARED_HELP_OUTPUT_DIR=Join-Path (Get-Location).Path 'reports/prepared-card-stress-2026-09-27/rerun'
$env:PREPARED_HELP_BROWSER='chromium'
node reports/prepared-card-stress-2026-09-27/browser-check.cjs --card-stress
$env:PREPARED_HELP_BROWSER='webkit'
node reports/prepared-card-stress-2026-09-27/browser-check.cjs --card-stress
```

The 320x225 case tests reflow equivalent to 400% desktop zoom; it does not operate the browser toolbar zoom control. Doubled root text is a separate text-size stress test. Styling excludes the full host shell. Audio/AI callbacks are mocks. Actual screen-reader announcements, voice control, provider pronunciation/cancellation, Firefox (not installed), actual Safari/device behavior and deployed bytes remain unverified. No installs, source rebuilds, push, deployment or other-session messages occurred. The prior 315-test gate was not rerun because production inputs did not change; this pass claims only its newly executed browser results.
