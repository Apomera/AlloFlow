# Katie Novak lesson-generation investigation

Investigated October 21, 2026. Aaron confirmed the Gemini Canvas launch path and believes the report was recent. Katie's exact Canvas URL, browser, saved session, console/network logs, and click sequence are unavailable.

## Conclusion

Two real loading defects can combine to produce a good planning conversation followed by no generated resources. One reproduces an indefinitely stuck background loader; the other lets the lesson execute before all of its prerequisites are available. Both have focused repairs committed in release 73be313d6d0771426557c0a956d97efb1997ac6f. These findings fit the report but do not establish what happened in Katie's particular session. Cloudflare Pages reported successful deployment at 5:26:47 p.m. Eastern. The public app loads the new release, but subsequent native quiz inspection found a sample compatibility defect described below; its correction remains local while further publication is paused. The existing shared Gemini Canvas still needs its embedded source updated and an authenticated generation run before calling that reported experience fixed.

The phrase **Loading tools…** belongs to the app-wide background module counter. It is not a lesson-generation progress report and does not mean an AI request is running.

## Confirmed findings

### 1. Background loading can starve indefinitely

The deferred module pump uses `requestIdleCallback`, but only dispatches a script if `deadline.didTimeout` is true or `deadline.timeRemaining()` exceeds 10 ms. A callback can repeatedly arrive on time with less than that budget. Its timeout therefore never fires, while the callback never starts work. The existing starvation escape covered continuous input, not short idle periods.

A controlled-clock execution of the actual pump reproduced **zero of six modules dispatched after approximately 15 minutes** with recurring 8 ms or 10 ms idle budgets. The fixed pump dispatches all six in **12.98 seconds** in that same simulation. A 12 ms control dispatches all six in 1.762 seconds both before and after. This establishes a scheduling defect without assuming Katie's hardware or browser produced those conditions; the simulated modules settle immediately, so these are dispatch timings rather than real download benchmarks.

The local repair permits one queued module to start after a 1.5-second low-idle-budget starvation window. It retains hidden-tab and launch-pad gates, the separate eight-second continuous-input guard, and the in-flight concurrency limit. User-requested modules continue to bypass the background queue; the fallback is not the intended lesson-loading path.

### 2. Lesson execution did not wait for all prerequisites

The host's `handleExecuteBlueprint` previously waited for `AgentCoreUIAdapter` and `PhaseOHandlers` separately. It did not explicitly promote and await `AgentCoreContracts`, `AgentCoreBlueprintService`, or `GenerationMatrix`.

The adapter needs the contracts/service when execution is prepared. The executor deliberately refuses to generate without GenerationMatrix because that module enforces the planned resource variants and deduplication. The existing executor test confirms that a missing matrix produces a finished, retryable `waiting` result with zero generation calls. That branch does not itself load the missing module or automatically replay the requested lesson.

The local repair waits for all five prerequisite modules before preparing or executing the approved plan. It uses the existing bounded loader and error/retry path instead of weakening the executor's checks.

Repeated clicks share the pending request. If the teacher cancels, edits, or replaces the plan during loading, the old request cannot execute afterward.

### 3. Planning success does not establish creation readiness

The conversation and resource-generation paths use different modules. A strong overview is consistent with creation dependencies still being absent. The global loading pill can remain visible independently of either path, making it easy to mistake idle background work for a lesson being generated.

The current loader already has per-script watchdogs and a 65-second required-module readiness limit. A single required-module wait in current intact code should not silently run for 15 minutes. A background queue stall, an execution attempt that returned early, an older saved Canvas shell, or a different provider failure must be distinguished using the session's diagnostics.

Source intake is another separate check: ordinary conversation passes chat context to the model. The guided source-selection branch explicitly fetches a URL only when the message begins with `http`, `https`, or `www`. A link mentioned within normal conversation is not evidence that the complete article was imported. Also, the URL fetch handler catches extraction errors internally without returning a success indicator, while the guided branch subsequently records `URL Content Fetched` unconditionally. That separate misleading-status issue was identified but not changed in this focused loading repair. Inspect the source material before judging the lesson's fidelity.

## Live checks and limits

- The live launcher and CDN both reported release **1.9**, released October 19, 2026, with Canvas share URL `https://share.gemini.google/MjUL7MZ7eu4Z`.
- Public requests to the current source and sampled generation/bot modules returned HTTP 200. Sampled JavaScript had suitable content types and cross-origin headers; there was no broad outage in those probes. This does not exclude a school filter, extension, connection interruption, cached session, or transient incident affecting Katie.
- The public Canvas link was opened in a fresh, signed-out browser. After Google's Continue prompt, Google displayed **Something went wrong (7)** and an empty app frame. This was a separate reproduction limitation, not evidence that Katie encountered that error. No authenticated provider generation was completed.
- Current CDN source is not proof of the exact source embedded in a previously shared or saved Gemini Canvas. A repaired local source file does not update an existing Canvas artifact automatically.
- No student data or private classroom resources were used. The reviewed source, rebuilt browser app, catalog links, and original lesson draft were committed to main on October 21, 2026. Nothing was sent to Katie.

## Example based on the blog

Katie's linked article is [Beyond Turn & Talk: How to Teach Academic Discourse and Collaboration](https://www.novakeducation.com/blog/how-to-teach-academic-discourse-and-collaboration), dated October 20, 2026. It was retrieved directly after the search browser could not open it.

The accompanying example uses newly authored fictional school decision-making material and credits the article as pedagogical inspiration. It does not reproduce the blog. Grade 6 and a roughly 50-minute lesson are demonstration assumptions, not details supplied by Katie.

The example is an agent-authored draft validated through the repository's local resource-pack connector. It demonstrates a tangible resource workflow; it is not a claim that the failing Gemini Canvas session generated it. Teacher review is still required for goal, difficulty, assessment, and student delivery.

The local HTML rendering harness needed explicit English translations and review-specific formatting settings. The review copies use the exporter's existing nonpersistent print/review flag to avoid asking for a learner identity. Their provenance file records these settings. A worksheet preview does not establish working response persistence or live student distribution.

Both preview editions passed the final browser checks with no recorded page errors, no horizontal overflow at desktop or phone widths, and no detected axe violations in the checked configuration. Student materials exclude the teacher answers; the teacher edition includes them. Visual review corrected raw translation labels, cover/subtitle contrast, an inappropriate multiple-choice heading, and the narrow-screen notebook column. These are scoped checks, not a full accessibility-conformance claim.

Files: [student preview](../../artifacts/novak-investigation-2026-10-21/student-preview.html), [teacher preview](../../artifacts/novak-investigation-2026-10-21/teacher-preview.html), and [teacher review and provenance](../../artifacts/novak-investigation-2026-10-21/TEACHER-REVIEW.md).

## Verification

- Seven existing selected suites passed: **94 tests** covering lesson conversation handoff, generation matrix behavior, provider retry policy, formatter loading, blueprint service, and catalog fetch/discovery.
- The focused native preflight regression passed **8 tests**, including cold/out-of-order dependencies, failure and retry, 65-second timeout, duplicate clicks, cancelled/replaced plans, and exact wrapper parity across the three host copies. See [preflight receipt](blueprint-preflight-evidence.json).
- The deferred-pump suite passed **12 tests**, including low idle budgets and the existing hard-stop/concurrency cases. See [controlled-clock evidence](loader-evidence.json).
- All three edited host files parse as JSX; the existing build smoke check passes. Scoped whitespace checks pass. An independent review found no blocking issue in the handoff repair.
- Tests exercise actual extracted host logic with controlled delivery; they do not establish successful live model generation. The complete project test suite was not run.
- An initial Vitest invocation used an unsupported `--minWorkers` flag; a corrected invocation then hit sandbox Temp-cache `EPERM` errors before test execution. Pointing `TEMP` and `TMP` to a workspace-local test directory resolved the environment issue. The reported 94 passes are from the successful run, not the blocked attempts.

The isolated release includes the host loading repairs, lesson route, catalog preview, reliable importer-completion signal, example pack, focused tests, and rebuilt browser app. The shared workspace contains unrelated work; only reviewed changes were transplanted onto the clean published base 2f69704ab4161680431012d9222386914e19fbdb. No unrelated shared-workspace edits were published.

## Community-catalog lesson links

A catalog-slug route is now implemented in the reviewed browser-app release:

https://alloflow-cdn.pages.dev/app/?lesson=academic-discourse-reading-space-grade6

The route selects an approved catalog entry and opens a completed student-resource preview without making an AI request. Opening or closing the preview does not import the lesson or change history. The explicit **Load in AlloFlow** action warns that it replaces the current workspace, awaits importer completion, then opens the directions and four resources. Cards offer **Copy lesson link** and **Preview lesson**. Unknown lessons, fetch failures, timeouts, and retries have bounded recovery paths.

The preview is rendered using the existing resource export pipeline inside a scriptless sandbox. Teacher answers are excluded. This link opens the browser app; the launcher's Gemini link remains a fixed Canvas artifact and has no verified per-lesson handoff.

The original Grade 6 draft contains directions and fictional evidence, a communication anchor chart, group decision notes, and an individual exit check. It credits Katie's article and does not claim her review or endorsement. An imported pack preserves the workspace's current generator settings; select **6th Grade in Universal Settings before generating additional material**. First-time users may also see the existing Quick Start setup after import and can use its Skip control.

## Release verification, October 21 follow-up

- Native host/import checks: 24 passed.
- Loading and blueprint checks: 72 passed across six selected Vitest suites.
- Catalog checks: 116 passed across four selected suites.
- Scoped JSX, free-variable, mirror, and whitespace checks passed. Independent reviews found no blocking issue.
- Production build passed using the repository's documented build settings. The 47 browser-app files match their public mirrors. Release ID: da7196dcf009fc4c28ac2e5583545313cdd05b0dcad59e6312f937127f1cba6e.
- The isolated production browser run passed preview, close-with-history-preserved, and explicit four-resource import without an AI request or page error. No readiness override was used. First-run setup and the preserved generator grade are documented above.
- A later runtime reset blocked a repeated local run at loopback navigation with ERR_NETWORK_ACCESS_DENIED, before app boot. That blocked repeat is not an application regression or another passing result. Public-browser verification is tracked separately.
- This remains a focused test selection, not the entire repository suite or authenticated Gemini generation.

## Release acceptance

1. Publish the reviewed source and create/update the Gemini Canvas artifact; verify which shell the launcher opens.
2. In an authenticated fresh Canvas session, use the article as teacher context and explicitly specify the student goal, grade, and desired resources.
3. Click lesson creation before background loading finishes. Verify prerequisites load on demand and resource rows progress to actual saved results.
4. Repeat with a deliberately delayed or failed prerequisite: a bounded actionable error should appear; retry should succeed without duplicate generation.
5. Open the resulting student preview and check that communication supports preserve the discourse goal and that teacher-only assessment material stays out of student delivery.

For Katie's exact incident, the most useful next evidence is the Canvas link/version and the generation diagnostics, including whether a resource row was marked waiting or failed. There is no need to ask her to wait another 15 minutes or clear her saved work.

## Native student-use follow-up

Aaron correctly distinguished the displayed teacher HTML export from a student completing the lesson inside AlloFlow. The pack is native structured history, not an HTML wrapper: directions include navigation/manual goals, the anchor chart is reference text, and student-mode Cornell notes offer six response rows plus summary/connections. Catalog import opens teacher authoring; its student preview is temporary and not a submitted assignment.

Opening the deployed quiz exposed three unsupported legacy `shortAnswer` tags. The export renders them, but native assessment preflight flags all three and omits their answer controls. Earlier successful preview/import checks did not verify those controls. A local-only change to `short-answer` makes the actual compiled native renderer show all three textareas; MCP validation/export passed. The live catalog remains unchanged. Native quiz checking retains AI-provisional scoring and needs AI setup. End-to-end student response persistence, delivery, and teacher submission remain unverified. See artifacts/novak-investigation-2026-10-21/native-quiz-correction-review.json and the local release-handoff.md.
