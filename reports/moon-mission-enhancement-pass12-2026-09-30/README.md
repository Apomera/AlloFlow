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

FINAL_VERIFICATION

Raw initial and final reports are retained. The initial new checks found an exact-equality assertion on floating-point canvas scale; it now checks seven decimal places. Visual review refined the direction guide into the correctly displaced hyperbola asymptote and moved the Earth-direction arrow clear of its label. The existing source-quality test caught repeated `var` declarations; they were corrected without changing the numerical model. Two resource-heavy fork runs were stopped only through verified task-owned process trees while fixes were pending. One refined fork report omitted the physics file despite marking its reported files successful; physics then passed a complete standalone run. The final suite uses isolated worker threads, one worker, unchanged assertions and unchanged timeouts.

Browser video/trace recording is disabled for this pass's temporary config. Captures are actual Chromium renders. The previous return spec accepts a report-directory override so this pass retains its own captures without replacing earlier reports.

## Scope

The exact commit source excludes all 34 pre-existing Moonwalk hunks. Those edits, the existing LRV test edit, untracked Moonwalk tests, shared handoff and unrelated work remain preserved. Source hashes and the excluded-hunk count are in [source-verification.json](source-verification.json). The commit uses a separate index, an explicit file manifest and guards on parent, source, scope and unrelated staged entries. No push, deployment or package build.
