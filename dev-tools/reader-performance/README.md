# Reader performance fixtures

This is a disposable, local browser fixture for the reader component and its overlays. It uses synthetic readings, isolated browser storage, and a loopback audio route. It never loads the full host or the deployed release. External requests fail the run.

## Run

Use the existing dependency tree; no installation is necessary. From the worktree root:

```powershell
node dev-tools/reader-performance/run.cjs --deps C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated --validate
node dev-tools/reader-performance/run.cjs --deps C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated --smoke
node dev-tools/reader-performance/run.cjs --deps C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated --baseline-ready <full-HEAD> --output reports/reader-performance.json
```

`--baseline-ready` records the exact inspected HEAD. It is an explicit baseline identifier, not a dependency gate. The run fails if HEAD or measured source changes while it runs. `--baseline-source` reads the reader and helper sources from that HEAD with `git show`; it does not change the checkout. Omit it to measure the working files. `--instrument` enables the profiling React build, public-helper counters, storage counters, and timer/rAF tracking. Compare timings from runs with the same instrumentation mode. `--case` accepts comma-separated case names. `--browser` defaults to `msedge`.

The runner bundles JSX in memory, uses the checked-in CSS, starts an ephemeral loopback server, opens a new browser context per case, then closes the browser and server in `finally`. JSON reports record source/CSS hashes, hardware and browser versions, and hashes of the four harness files. There is no app build or generated-module mutation in this command.

`--retention` adds a fixture-only probe for the reading-place cache: entry count, total exact-text key characters, and counts of authored/recovery entries. It does not expose text or add a production API. Use it with `--case unique-navigation --instrument` to compare pristine-cache growth. Only never-saved, empty, position-free entries are disposable; authored work, saved baselines, positions, pending writes, removal markers and recovery evidence stay in page memory. The default pristine-entry limit is 20, not a limit on total session memory or bytes. Compare equal instrumentation modes and source hashes; residual heap growth is not proof of a leak or a lifetime memory bound.

## Scenarios and measurements

The 14 cases cover 30/300/3,000 sentences; 0/30/200/1,000 anchored supports; a closed outline; bilingual comparison; 320px layout with large text; 50 preview cycles; 100 alternating resource/learner/text/support changes; 50 immersive open/close cycles; native Audio playback through the karaoke overlay; and reading-place scrolling. Fixture generation is deterministic and every support anchor is checked against the exact source substring. The runtime records accepted supports and canonical sentence counts.

Each case receives 25 sweep updates. Update-to-two-paints latency excludes the first five samples and includes animation-frame pacing, layout, paint scheduling, and machine contention. It is **not React CPU time**. Instrumented React Profiler totals cover all 25 updates. Public-helper counters exclude nested lexical helper calls. Long-task counters use the browser's long-task observer. Reset discards setup entries and rejects subsequently delivered entries that began before the measurement window; snapshot drains queued records. Unsupported metrics are null.

GC-assisted CDP heap/DOM/listener counts are recorded mounted, every ten lifecycle cycles, and after unmount plus a 4.5-second timer drain. Timer IDs and audio WeakRefs do not retain DOM nodes. Audio tracking adds one telemetry listener per Audio instance. Preview loops focus and click controls within the page to avoid retaining locator element handles; karaoke uses in-page focus and trusted keyboard activation. These aggregate counters detect trends; a detached-node leak requires a heap snapshot and a retaining path.

The smoke case checks actual preview open/close, an immersive sentence mapping, and two comparison panes. Unit tests supply stricter highlight/click/version-invalidation assertions; this fixture does not replace them.

## Limits and budget setting

Icons, references UI, and some host callbacks are stubs. Ordinary `handleSpeak` records calls; native karaoke Audio is exercised only with a local one-second fixture response. Full-host TTS, late cloud callbacks, audio ownership across navigation, CSP, production asset pins, and deployed-release behavior need integration verification. The large-text case changes fixture root and immersive font settings; verify the user's complete browser zoom/preferences separately. Reading-place writes occur only in disposable storage. There is no learner data in these fixtures.

Use work-count invariants as immediate regression guards: no full hidden-passage formatting or adapted-support validation solely for unchanged immersive sweep updates; only active-sentence word rendering; no sweep-driven storage writes; exact invalidation when resource, learner, text, or supports change; zero active audio/highlight ranges/timers/rAF after close. Allow the existing root/browser listeners when comparing unmounted snapshots. Compare lifecycle counts after warmup and investigate a sustained slope, not a single retained snapshot.

Do not turn one timing run on a busy workstation into a hard CI threshold. Repeat alternating baseline/candidate runs on a named target device after integration and correctness stabilization. Set per-fixture p50/p95 latency, React render-time, long-task, retained-heap, and listener envelopes from the measured distribution and noise; retain both the representative 300-sentence case and the 3,000-sentence stress case. There is no claim that the stress case meets a 60fps budget.
