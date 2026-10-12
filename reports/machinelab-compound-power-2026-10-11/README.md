# Machine Lab: power through compound machines — October 11, 2026

The existing **Compound machine lab** now connects its energy ledger to average mechanical power. A shared task duration supplies five new values: input power, power between stages, useful output power and each stage's power loss. Five corresponding calculation skills bring the compound collection to **14 skills** across all six workshop stations for grades 6–8 and 9–12.

The original force/travel/work table remains unchanged. The new powers appear in responsive cards inside the existing comparison disclosure. Learners can choose seconds or minutes; the default is five seconds and the supported interval is 0.01–3600 seconds. Duration changes the calculation, not animation playback.

## Physics and practice

Each average power is its corresponding energy divided by the same positive task duration. Dividing the existing energy balance by that duration gives:

`input power = useful output power + first-stage power loss + second-stage power loss`

Useful output power divided by input power gives the same combined efficiency as useful work divided by input work. For example, an energy path of 750 → 600 → 300 J over ten seconds gives 75 → 60 → 30 W, with stage losses of 15 W and 30 W.

Doubling duration halves all five average powers while leaving force, travel and energy unchanged. For fixed final task, efficiencies and duration, geometry changes effort and travel but leaves required power unchanged. These are average mechanical powers for the assumed compatible, constant-ratio series model. They do not predict electrical consumption, acceleration, inertia or a connected 3D assembly.

The derivation follows [OpenStax's definition of average power](https://openstax.org/books/university-physics-volume-1/pages/7-4-power), [mechanical advantage and efficiency](https://openstax.org/books/physics/pages/9-3-simple-machines), and [energy conservation](https://openstax.org/books/university-physics-volume-1/pages/8-3-conservation-of-energy). The power-balance equation above is the algebraic consequence of dividing the lab's existing energy balance by one shared duration.

Each new skill uses watts, separates unit feedback from numeric feedback, provides two hints and a deliberate worked solution, and offers an optional written explanation. Incorrect-answer feedback addresses the requested stage's energy and conversion from minutes to seconds. The reflection asks what would change if the same task took twice as long, distinguishing watts from joules; its prompt is connected to the text field for assistive technology.

## Compatibility and saved work

The original `compoundWork` function and nine original question definitions are unchanged. A blank or invalid duration leaves their calculations and practice available. Power options remain selectable, but checking, hints, revealing and saving are disabled until a valid duration is entered. Guards also reject stale or directly invoked callbacks.

Original energy skills retain their exact version-1 record shape and interpretation. Only new power skills use version-2 records with fixed, validated seconds. They preserve both stage geometries, the final load and movement, efficiencies, entered answer and unit, hints, explanation and checked-versus-solution provenance. Work-record copy and download recompute values from that saved snapshot, including the original task, power path and energy ledger. Changing live settings cannot reinterpret old records using the new duration.

Changing duration, time unit, stage geometry, efficiencies, final task or skill clears the visible attempt. Saving remains explicit and bounded to one record per skill. The saved count describes collected practice, not mastery. Imported records are validated; version-1 records cannot masquerade as new power skills and version-2 records require numeric seconds within the supported range.

## Verification

Final-source coverage is **948 passing tests across 10 files in 32 successful serial processes**: 156 new power tests, all 223 existing compound tests and 569 selected regressions. Every case executes exactly once; filtered skips and retained diagnostics are excluded. [Test coverage](tests-final.json), [process and artifact summary](validation-summary.json) and [retained diagnostics](diagnostics.json) bind the observed exits and source/test/receipt hashes.

The frozen canonical/public source SHA-256 is `1638880a9e7b98963b72461ea5394c728f2298912f68efadfa3e8fe0655ec1d9`. Final counts, observed process exits, native receipts, source/test hashes, browser artifacts and any retained diagnostics are recorded in `validation-summary.json`.

New focused checks cover independent physics across all 30 ordered machine pairings and five new skills at each of six default pairings (30 new station/skill combinations). They check common-duration energy conservation, seconds/minutes equivalence, input bounds, near-100% efficiency, unit feedback, task changes, fixed power records and legacy record compatibility. Existing compound tests retain the original nine-skill assertions, with only the expanded selector/cycle expectation updated.

Selected regressions cover the existing compound, efficiency and single-stage power practice, work records, read-aloud, localization, grade bands, accessibility and the 192 view cases. These are scoped Machine Lab checks; no full repository suite or application build is claimed. Heavy checks run serially with a 512 MiB old-space limit, 8 MiB semispace, one Vitest fork, no isolation and unchanged 30-second test timeouts. Filtered cases count only in the process that executes them.

The final native Chromium run passes **681 checks in 13 scenarios**, with observed exit 0 and no errors. It uses real React/THREE, keyboard input and a native text download. All four screenshots were inspected: [desktop calculation](browser/desktop-compound-power-checked.png), [phone hints](browser/phone-compound-power-hints.png), [320-pixel forced colors](browser/forced-colors-compound-power-solution.png) and [dark saved work](browser/dark-phone-compound-power-record.png). Generated HTML, temporary browser profiles, duplicate downloads and test-temp files are excluded from the report. No physical assistive-device session, performance benchmark, push or deployment is claimed.

The first browser run identified one narrow forced-color failure: the selected stage-loss option had 333 pixels of text content inside a 256-pixel dropdown. The document and panel themselves fit. A first shortening fixed the first-stage option, but a stronger check caught the second-stage option still truncating. All five new option labels now use compact wording, with stage-loss labels putting the stage first. The surrounding section, givens and formula identify these as average mechanical powers. The final harness explicitly checks all five selected labels at 320 pixels and both stage distinctions. Both earlier browser attempts and the focused DOM diagnosis are retained; the earlier 379 passing unit checks on the preceding source are kept under `before-ui-fix/` and excluded from final coverage. The final source differs from that reviewed source only in these five label strings.

A tool-session interruption occurred after seven focused test groups had durably completed. No Node process remained; the next group's existing receipt was identified as an old-source file rather than a completed final-source result. It is retained under `interrupted-focused-run/` with an unknown exit and excluded from coverage. The seven observed successful groups were preserved, and only the three uncompleted groups were resumed. All ten final-source groups subsequently recorded exit 0; no assertion, filter or timeout was relaxed.

The selected regression runner also resumed after a tool-session interruption following seven completed children. No Node process or eighth receipt remained. `interrupted-regression-run/` preserves that checkpoint; resume verified the seven source/test/receipt hashes and continued with the uncompleted groups. Interrupted launches and earlier browser attempts do not count as successful processes or assertion coverage.

For later reproduction, use fresh output directories to retain original receipts:

```powershell
node reports/machinelab-compound-power-2026-10-11/run-regressions.cjs reports/machinelab-compound-power-2026-10-11/regression-rerun
node dev-tools/ml_compound_power_qa.cjs reports/machinelab-compound-power-2026-10-11/browser-rerun
```

Focused manifests record the exact test filters. The regression runner can resume verified successful receipts with `--resume`; it checks frozen input and receipt hashes, then rebuilds complete exactly-once coverage. Failed or incomplete attempts must be preserved before retry and never count toward final coverage.
