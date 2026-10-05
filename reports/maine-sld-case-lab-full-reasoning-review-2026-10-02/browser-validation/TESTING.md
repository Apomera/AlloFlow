# Full participant reasoning review — final validation

Six distinct targeted scenarios passed against the corrected final candidate: five module scenarios in one invocation and the actual source-application host scenario in a separate invocation with normal retained tracing. Both invocations used one worker, zero automatic retries and the existing 120-second limit. No trace-off diagnostic was used.

The two new scenarios cover participant-only Q1–Q7 review for all five cases; blank, choice-only, narrative, whitespace and literal multiline notes; reset, restore, reload and unchanged worksheet schema; all ten keyboard edit destinations and exact returns; selected-evidence detours; guide visibility; and internal content width/scroll offsets after every edit and return. All 27 original scenarios remain byte-preserved; 29 are available.

Four final scoped accessibility scans found zero violations. Final evidence includes 11 module screenshots, 3 host screenshots and exactly 2 supplemental keyboard Q5 captures. The supplemental shots verify actual served and browser-loaded final-module bytes, visible 3px keyboard rings, and main clientWidth=scrollWidth=320 with scrollLeft0.

The supplemental original capture exposed a real mobile crop. Geometry showed a 383px native reasoning track inside a 290px grid, producing main scrollWidth398 and focus scrollLeft33. The final source uses only a bounded minmax(0,1fr) reasoning track; final width assertions and keyboard screenshots verify the correction. Original cropped captures, helpers and temporary diagnostic geometry remain archived.

Three earlier-candidate attempts remain preserved: a preparation-hook timeout before any activity assertions; a five-pass module invocation with a final Page.close host timeout; and an isolated host panel-wait/context-teardown timeout whose later assertions did not complete. These are separate from the final-candidate pass evidence. The final host used the exact refreshed application snapshot; no comparison claims that changed instrumentation isolated a cause.

The first final normal-tracing host pass on the 12059/b3a application snapshot remains separately archived. A shared-host guard then found all three app files had changed identically with the Maine d69 pin intact. Root preserved that tested snapshot, refreshed the exact application preview to the b5fb/5b1 snapshot, and performed one separate host-only check. Module tests and keyboard captures were not repeated for this shared-host refresh.

The shared app files changed again after the refreshed host pass. The report records their observed hashes and unchanged Maine pins, with currentSourceMatchesTestedSnapshot=false. Only the exact passed b5fb/5b1 snapshot is accepted as host validation; current shared app bytes are not claimed to have passed. No source writes or further host reruns were performed in response to this second drift.

See validation-summary.json for actual invocation statistics, exit codes, tested source/module/spec/host hashes, screenshot identities and history. Final raw commands/results are in final-module-five/ and final-host-current-normal-trace/; the first successful final host snapshot remains in final-host-normal-trace/. Final module and latest host shots are in final-browser/; dedicated keyboard images, metadata and helper are in final-keyboard-captures/.

No full browser matrix, core suite or print rerun was performed. Root verified unchanged core/data/schema and print code; the retained accepted nine-page participant PDF remains hash-identical. No staging, commit, push, deployment or full application build was performed for this pass.
