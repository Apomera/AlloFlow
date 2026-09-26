# September 26 cloud-session integration

Integrated the nine newly published Claude branches into `main`, preserving their
commit history and the local source-import work. The starting `main` was
`efed3b8d6`. A second fetch confirmed no additional unmerged commits on these
branches.

| Work | Branch | Integrated tip |
| --- | --- | --- |
| Sourcebook print preview | claude/affectionate-ritchie-bffjyk | 50aca0312 |
| Plate Tectonics scenes | claude/dreamy-pascal-7fn535 | de675efb8 |
| Auto Repair immersive workshop | claude/ecstatic-bardeen-jaf51c | a988eb2ad |
| Architecture Studio navigation | claude/fervent-turing-hnursz | eb0a912bc |
| Ecosystem meadow | claude/great-rubin-5dej7h | 44e0ff717 |
| Accessibility pass | claude/inspiring-sagan-w8uvid | 548a67131 |
| Moon Mission surface and movement | claude/moon-surface-visuals-w24qei | 53a48f7fc |
| Reader workflow | claude/quirky-bardeen-a54z08 | 3599bf248 |
| Bird Lab illustrations | claude/sleepy-dijkstra-i7nbcw | 9f8b7f5ce |

## Integration repairs

- Backed up all 114 initially pending files outside the checkout before editing.
- Preserved local source-import/citation fixes, tests, and benchmark evidence in
  `6730fa873`. Rebuilt stale generated modules and synchronized the content-engine
  source copy. Recovered an empty tracked screenshot from its previous version.
- Moved the one-off lunar capture script from automatic E2E discovery into reports
  and removed its machine-specific output path.
- Resolved reader conflicts by retaining the new embedded word-help workflow,
  disclosure affordance, and accessibility improvements. Preserved both branches'
  appended session notes.
- Fixed percentage-width Bird Lab illustrations emitting an invalid SVG height.
- Removed a conflicting accessible label from the reader Edit button, localized
  its stale-preview warning and a Symbol Studio tooltip, and registered two
  missing Architecture Studio fullscreen labels.
- Updated stale test assumptions about the STL export selector, wrapping mobile
  header, camera-control placement, bilingual helper signature, and the current
  ecosystem behavior range during playback. Assertions still verify downloads,
  non-overlapping layout, state preservation, and playback interruption.
- Reviewed and refreshed Bird Lab and Throw Lab render snapshots. RoadReady's
  unrelated, already-stale snapshot was refreshed after 195 behavior/content
  checks passed; its source and shared render harness were unchanged by this batch.

## Validation

- Initial changed-work unit run: 726 passed, one label check failed; repaired.
- Wider 162-file regression run: 2,721 passed, 27 failures. These included short
  timeouts during concurrent WebGL tests, old build mirrors, stale fixtures, and
  the rendering snapshots described above. No tests were quarantined or disabled.
- Final focused 39-file run: 1,129 passed and only the old RoadReady snapshot
  failed. After the separate 195-check RoadReady validation, its snapshot test
  passed with the reviewed expected output.
- Browser run: 180 passed and four stale-selector/timing assertions failed.
  All four passed on rerun after the test corrections above.
- Six additional real-WebGL checks passed for lunar rendering, keyboard walking,
  frame-independent jumping, EVA startup, plate-boundary rendering, and rotation.
- Real document import/storage browser check passed with no page errors, covering
  retrieval, independent web/document switches, Include/Exclude, and removal.
- Volcano cutaway reached the real renderer's ready state with no lost context;
  the captured image was visually inspected.
- Teacher-guide verification, maintained-document audit, promotional-site audit,
  source-copy check, deployment-mirror check, and secret scan passed.
- The static gate passed module parsing, render smoke, accessibility labels, and
  related checks up to its existing toast-localization failures. The one newly
  introduced toast was repaired. See the remaining baseline issues below.

## Remaining baseline issues and scope limits

The full `verify:gate` is still red on pre-existing unlocalized toast counts in
`behavior_lens_module.js`, `symbol_studio_module.js`, `view_image_module.js`,
`stem_tool_geologyexplorer.js`, `stem_tool_optics.js`, and `sel_hub_module.js`.
The scanner was run against both the current files and their `efed3b8d6` blobs:
the counts and message sets match. The ratchet baseline was not raised.

The accessibility branch's [audit](../wcag-audit-2026-09-26/README.md) explicitly
retains contrast and coverage limitations; this integration does not assert
complete WCAG conformance. Cloud work that was never pushed is not visible in
this repository. Historical branches outside this September 26 batch were not
blindly merged over the current application.

Deployment uses the existing `deploy.sh` workflow. The checkout's Firebase project
is `YOUR_PROJECT_ID`, so the script intentionally skips Firebase and publishes the
public Cloudflare `/app/` shell through Git, with its configured Codeberg backup.

## Release execution

`deploy.sh` completed with exit code 0. It created source commit `55e824a46` and
generated-asset commit `6cab3a919`, and pushed both to GitHub and Codeberg. The
hosted and isolated desktop production builds succeeded; the desktop key scan,
remediation parity, manifest, and service-worker checks passed. The deploy script's
affected-test gate passed all 47 tests.

Post-deploy verification confirmed the source hash, core CDN modules, validator
page, and real veraPDF JAR. Its only warning was asynchronous propagation of
`app/index.html` and `app/sw.js`; live verification continued after script exit.
Separate byte comparisons confirmed the updated Reader, Moon Mission, Plate
Tectonics, Bird Lab, Auto Repair, Architecture Studio, Ecosystem, and Sourcebook
modules on the public CDN. A final remote-branch check found exactly nine Claude
branches and no new commits beyond the integrated tips.

GitHub CI reproduced the six existing toast-localization failures above. The
STEM recovery job passed its four isolated browser tests, then its full-app dev
server exhausted Node's default 4 GB heap before starting the next two tests.
The test-server configuration now defaults to the production build's 8 GB heap
allowance, while preserving an explicitly supplied `NODE_OPTIONS`. Playwright
successfully loaded that configuration and discovered both full-app tests. This
configuration check alone does not establish a successful CI rerun.

The build also regenerated the root educator-evaluation standalone bundle but
left it unstaged. Its bytes match the public copy already committed by the deploy
script; the final cleanup commit preserves that generated root copy as well.
