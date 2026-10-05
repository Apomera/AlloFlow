# Classroom deep enhancements — October 3, 2026

Four reliability improvements are integrated locally. **175 distinct checks and two local browser workflows passed.** Final assertions have no failures or skips. No commit, push, deployment, full app build or installer build was performed.

- Student and teacher WebRTC callbacks now belong to their active peer/channel. Replaced or disposed callbacks cannot publish resources, presence, homework evidence, welcome chunks, retries or stale negotiation results. Both updated endpoints correlate offers and answers with an attempt ID; tokenless older peers remain compatible and do not gain correlation protection.
- Teacher and student mailbox receives are serial. Repeated network, visibility, bfcache and manual wake events produce one immediate follow-up after an active poll. The latch releases on failure, and terminal session errors retire callbacks before React cleanup. Backpressure waits stop when the sending peer loses ownership.
- Starting a fresh Canvas workspace clears learner answers alongside its lessons after retiring hydration. The prior saved snapshot remains intact; new snapshots exclude the old answers. This also applies to complete workspace clearing during vault locking, rather than changing the separate History-only clear behavior.
- Studio backup restoration now belongs to the latest actual file selection, including a newer invalid file. An older success or failure cannot overwrite current writing or feedback. Existing validation, learner-edit, identity and unmount guards remain active. StudioResponse uses content pin `9277bb54` in all three hosts and is registered for content pins in the selective build logic.

## Validation

| Suite | Distinct checks | Result |
| --- | ---: | --- |
| Actual student RTC effect and offer correlation | 14 | Passed |
| Actual teacher RTC/poll effect and welcome delivery | 25 | Passed |
| Actual student poll/drain helpers | 13 | Passed |
| Actual workspace clear/fresh/snapshot functions | 3 | Passed |
| Real React Studio Boundary with deferred backup reads | 9 | Passed |
| Existing Class Mailbox suite | 46 | Passed |
| Existing SessionTransport suite | 45 | Passed |
| Existing Studio response boundary suite | 13 | Passed |
| Existing Studio feedback preservation suite | 7 | Passed |
| **Total** | **175** | **Passed** |

The 64 new focused checks have before-source evidence: 19 controls passed and 45 expected preservation/correlation assertions failed before these changes. Candidate and final runs are retained, but repeat executions are not counted twice. The four existing suites ran with one fork worker and their normal 30-second test limit. The first sandboxed Vitest attempt collected zero tests because temporary-cache renames failed with EPERM; the same command outside that sandbox passed all 111 cases. No test assertion or worker constant was weakened.

The [native WebRTC workflow](native-rtc.json) uses the actual three effects plus production ICE, codec, chunk and drain helpers in Chromium. Four real peer connections deliver two complete resources over ten chunks through controlled loopback mailbox signaling. Initial connection, replacement connection, stale callbacks, offer correlation, serial receives, coalesced wakeups and closing all peers pass. The first browser launch used an unavailable sandbox browser location; a subsequent harness failure was traced to passing native window timers as unbound methods. Using the installed browser and bound timer wrappers corrected the harness without changing production behavior or its assertions.

The [Studio browser workflow](studio-workflow/report.json) confirms verified teacher saving/reopening, actual learner hydration and native IndexedDB readback, interrupted delivery recovery, repeat deduplication, exact submissions and teacher storage isolation. Both learner responses survive reload; all 22 synthetic audio clips reach native ended events without speech-synthesis fallback. Keyboard navigation/cancellation and 1280/320-pixel reflow pass; browser page errors are empty. This extra workflow is the established acceptance runner with only a fresh report destination and the installed browser path changed. It is separate from the nine deferred restore tests above.

The [validation summary](validation-summary.json), [final serial run](final-run.json), [existing regression results](existing-regressions-unsandboxed.json) and [source consistency record](consistency.json) retain exact inputs and outcomes. Seventeen of the eighteen Studio browser inputs match the final working files. The unowned `ui_strings.js` changed after that run; its tested and current hashes are recorded separately. The browser result covers its captured locale, and the newer locale bytes were not browser tested. Every affected production source/runtime and all 12 frozen focused-run inputs remain unchanged. Three source hosts and both Studio runtimes match byte for byte. Six final files parse; reversing the recorded operations recovers every exact preimage. The actual selective build pin function returns the same Studio pin as the hosts.

## Preservation and limits

Only six production files were integrated: the canonical host and its two desktop mirrors, canonical/public StudioResponse runtimes, and one build content-pin membership entry. The [application receipt](applied.json) and `final-before/` retain raw preimages, hashes and reversible region replacements. The concurrent Maine loader change from `8771e0b3` to `0ceb5207` was retained. Existing classroom, reader, localization, STEM, host-handler and build changes remain intact. Root never modified the shared Git index; another owner staged unrelated Universe work during this pass.

The local results cover controlled network/storage boundaries and native browser primitives. They do not cover a complete App-shell boot, hosted Class Mailbox services, WAN/TURN recovery, physical audio output, semantic narration or manual assistive technology. Native browser zoom remained blocked because automation did not change the measured metrics; it is not counted as a pass. The full repository test suite was not run.

Work remains uncommitted because the shared host and build changes include pending prerequisites and other owners' work. The tested complete working sources and their narrow reversible receipts are retained for coordinated integration.

To reproduce focused current checks from the repository root, run `node reports/classroom-deep-enhancements-2026-10-03/run-connections.cjs current` and the [native React restore runner](studio-audit/restore-ownership.cjs). `run-final.cjs` additionally checks the captured before-sources and current consistency. Browser entry points are [native-rtc.cjs](native-rtc.cjs) and [Studio acceptance](studio-workflow/acceptance.cjs). `apply-final.cjs` is a guarded one-time integration tool and refuses a second application.
