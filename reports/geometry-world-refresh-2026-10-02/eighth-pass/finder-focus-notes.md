# Finder Focus Verification

Date: 2026-10-04

Mounted production-builder tests reproduced three stale handoff failures: Escape followed by immediate finder reopening, and finder reopening before either tool-navigation animation frame. The baseline report records 14 passing existing cases and those three failures; it is diagnostic evidence, not a clean test run.

The finder now owns a monotonic focus-request generation. Opening or closing it supersedes older handoffs; deferred close, tool navigation, and palette/build resume check the request alongside the existing engine, transition, modal, and connection guards. Unmount invalidates outstanding requests. No geometry, camera, project, scoring, or preference data changes.

The final focused run passed 35/35 cases with exit code 0, zero failed assertions, and zero pending assertions: 20 focus-guard tests plus 15 existing builder-navigation tests. Six new regression cases cover reopen races and superseding an old request with a newer tool choice. Existing engine-replacement, modal, transition, normal Escape return, palette route, and launcher keyboard cases remain covered.

Reports: `finder-race-baseline-tests.json` and `finder-navigation-tests.json`. Both source and public modules passed JavaScript syntax checks and match by SHA-256. These are mounted local harness checks, not a browser or physical-device accessibility audit.
