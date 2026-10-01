# Moon Mission enhancement pass 12

Added an optional lunar departure laboratory in phase 8. The previously skipped SPS departure burn now has finite thrust, changing mass, validated fuel continuity, bound/escape outcomes, ignition timing comparisons and an unpowered coast. Use **Explore the lunar departure burn** above the Earth-return card.

## What changed

- Carry remaining SPS fuel from a verified captured insertion; identify a reference reserve for earlier saves.
- Compare a short burn, a 151 s reference burn, ignition five minutes late and fuel exhaustion. Commanded duration and ignition offset are adjustable.
- Integrate lunar position, velocity, mass and propellant together. Report orbital energy, local escape speed, ideal engine delta-v, lunar excess speed and outgoing direction.
- Show the equal-axis reference orbit, powered trail, unpowered coast, velocity, engine flame, finite-distance radio blockage and true outgoing hyperbola asymptote. Fit the greatest reached radius in the coast camera.
- Inspect ignition, zero escape energy, cutoff and the coast endpoint with milestones, seeking, four playback rates, pause, hidden-tab clock protection, resize and keyboard controls. Opening the lab pauses Earth return; playing either trajectory holds the other clock.
- Recompute saved evidence against its model, burn plan, fuel amount and origin. Include verified review in the debrief, text report and archive; reset it on mission replay.
- Skip insertion/departure calculations when optional evidence is unused. Keep the two tracked runtimes byte-identical.

The lab is optional and awards no XP. It begins in the docking exercise's circular 110 km reference orbit after LM jettison, with an explicit 10,000 kg CSM mass excluding SPS propellant. It does not join the existing Earth-return boundary preset: lunar escape and alignment alone cannot establish an Earth intercept. Earth/Sun gravity, moving bodies, detailed mass accounting, real navigation and attitude dynamics remain outside this exercise. See [PHYSICS.md](PHYSICS.md) for equations, source references, numerical convergence, measured outcomes and limits.

## Verification

- **528 distinct unit checks across 58 files passed** across the full run and focused recovery. The original full run passed 508 of 515 represented checks, with seven test timeouts and two worker-start failures. Focused reruns recovered every missing or timed-out check with unchanged assertions and timeouts; the final two cases used AboveNormal priority on their own short-lived test process. See [unit-verification.json](unit-verification.json) for the case-by-case evidence.
- **137 checks across 17 files passed against the exact original commit candidate**, including the variable-scope syntax check. See [candidate-verification.json](candidate-verification.json).
- **12 Chromium workflows passed**, six departure and six Earth-return, with zero retries, skipped, unexpected or flaky results. Both 320 px workflows had no horizontal overflow and zero scoped axe violations. Independent review accepted all twelve final captures. See [browser-verification.json](browser-verification.json).
- The current shared-commit source passes **141 focused checks across 18 files** after the announcement callbacks were connected. Its canonical/public copies match byte-for-byte and match committed source. See [current-source-verification.json](current-source-verification.json).

Four additional completion-announcement checks pass for Earth injection, lunar orbit environment, powered approach and lunar departure. Each exercises its real canvas completion action and verifies that rewind/review does not repeat the announcement. Together with the original suite, **532 distinct unit checks across 59 files are verified**; the total is consolidated from the recorded runs. See [verification.json](verification.json).

The physics and final-capture reviews found no actionable correctness or rendering defects. The original source hashes are retained in [source-verification.json](source-verification.json); the shared commit provenance is recorded separately.

Raw initial and final reports are retained. The initial new checks found an exact-equality assertion on floating-point canvas scale; it now checks seven decimal places. Visual review refined the direction guide into the correctly displaced hyperbola asymptote and moved the Earth-direction arrow clear of its label. The existing source-quality test caught repeated `var` declarations; they were corrected without changing the numerical model. Two resource-heavy fork runs were stopped only through verified task-owned process trees while fixes were pending. One refined fork report omitted the physics file despite marking its reported files successful; physics then passed a complete standalone run. The final suite uses isolated worker threads, one worker, unchanged assertions and unchanged timeouts. The initial announcement fixture accessed `props.ref`; it was corrected to React18's `element.ref`, and all four actual completion actions then passed. Both reports are retained. The current-source command first rejected an unsupported `--minWorkers` option before test discovery; it then completed with the installed runner's supported one-worker options.

Browser video/trace recording is disabled for this pass's temporary config. Captures are actual Chromium renders. The previous return spec accepts a report-directory override so this pass retains its own captures without replacing earlier reports.

## Scope

The originally prepared candidate excluded all 34 pre-existing Moonwalk hunks. Before this task's scoped commit, the shared app commit `a9ae02cb56598a8774478922012e8a2b70baa348` included the departure feature, its tests and reports together with the existing Moonwalk work. It also connected four simulation-card announcement callbacks. A reverse-hunk audit confirms the departure model is otherwise identical to the tested candidate.

This task preserves that shared history and finalizes only its own completion-announcement regression and verification reports. It does not rewrite the shared app commit or restage the simulator. A separate index and explicit file manifest guard the finalization commit and preserve unrelated staged entries. An initial fresh-index attempt was stopped through its verified task-owned process tree during the index refresh, before message or hook creation. The final attempt copies the real index to reuse file metadata, then restores unrelated staged changes to HEAD inside that private copy. No push, deployment or package build.
