# Claude handoff: make teaching scripts follow the actual lesson

## Start here: the user corrected the scope

The user wants an optional, more comprehensive, word-for-word teaching script for the **current lesson**, informed by relevant research for its content area, learning objectives, standard, and grade/age group.

Codex implemented a restricted fractions/grades 3–6 pilot. The user then said:

> I'm confused why is it only fractions grades 3-6 I thought it would be determined by the content of the lesson?

Codex acknowledged that it had narrowed the implementation too much. **Fractions and grades 3–6 were an implementation choice, not the user's desired product scope.** The user now requests this handoff because Codex quota is nearly exhausted.

Continue from the existing implementation and make it lesson-aware across the subjects and grade/age values supported by AlloFlow. Do not treat the earlier pilot scope document as overriding this correction. Do not simply remove the UI restriction while continuing to use fractions research for every lesson.

This handoff turn changes documentation only. Generalization has **not** been implemented yet.

## Workspace and current status

- Repository: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`
- App: AlloFlow; Windows/PowerShell workspace.
- The existing pilot is implemented and built locally. No production deployment was performed.
- The workspace already contains extensive unrelated changes from earlier resource refinements and other work. Inspect current files and any applicable repository instructions. Do not reset, clean, or overwrite unrelated changes, and do not assume the working tree belongs exclusively to this feature.
- Earlier work reviewed/refined the main 24 resources. A separate “Planning inputs changed” opportunity was scoped but is not part of the script implementation. Preserve those improvements; this task does not require reopening the whole resource audit.
- The user prefers follow-through without repeated confirmation of scope already explained. Their desired correction is clear: content-aware scripts, rather than a permanent fractions-only mode.

Related documents:

- `docs/lesson-teaching-script-pilot-2026-09-04.md`: what was actually implemented and tested.
- `docs/research-informed-teaching-script-option-2026-09-04.md`: earlier assessment; its narrow pilot restriction is superseded by the user's correction.
- `docs/lesson-plan-input-review-scope-2026-09-04.md`: separate, unimplemented opportunity.
- `docs/main-24-resource-refinements-2026-09-04.md`: earlier resource work.

## What already works and should be retained

In a saved teacher lesson plan, **Teaching script** opens a form for the learning goal, grade, duration, prior learning, optional standard, selected lesson resources, and research choice. The current language comes from the saved plan where available.

Generation creates a separate script version containing timed teacher wording, student actions, a check question, a possible student response, and if-struggling/if-ready follow-ups. Steps refer to actual selected materials and applicable retrieved recommendations. Teachers can edit, copy, and download the result. The three most recent versions are retained; the UI discloses this limit. The original plan is preserved.

Important existing behavior:

- Saved plan ID and inputs are captured before asynchronous work. Navigating to another resource does not redirect the completed script to that resource.
- Cancellation, deleted plans, changed relevant inputs, changed teacher identity/workspace, and nonteacher roles prevent late writes.
- Known unit, lesson, and source-artifact provenance limits material selection. Learner-marked submissions are excluded; actual supported teaching fields are projected rather than dumping entire objects into a prompt.
- Material input is bounded to 24,000 characters. Actual truncation/omission is disclosed in saved warnings and export.
- Generated JSON is structurally validated, including timing and reference IDs. At least one step must reference a selected material. Researched versions must reference at least one retrieved recommendation. Invalid output gets at most one corrective retry.
- Requested research failing does not silently become an unresearched result. The teacher may explicitly turn research off.
- Research tools load separately so their failure cannot block saved versions or generation with research off.
- Edit drafts survive rejected saves and detect stale edits. Copy/download includes research references and limitations.
- Parent and independent/student modes do not expose this teacher workflow.

## File map and contracts

| File | Responsibility |
| --- | --- |
| `lesson_teaching_script_source.jsx` | Pure input capture, prompt, validation, version updates, plaintext export. Despite the extension, this is pure JS. |
| `_build_lesson_teaching_script_module.js` | Builds the core runtime and public mirror; supports `--check`. |
| `lesson_teaching_script_module.js` | Generated core runtime; edit the source instead. |
| `lesson_teaching_research_module.js` | Handwritten research adapter and bounded public-page reader. Currently fixed to one fractions guide. |
| `lesson_teaching_script_host_module.js` | Handwritten controller: scoped materials, generation lifecycle, research, AI call, stale-input checks, saved-resource updates. |
| `view_lesson_teaching_script_source.jsx` | Form, versions, editing, references, copy/download. |
| `_build_view_lesson_teaching_script_module.js` | Builds the script view and public mirror. |
| `view_lesson_plan_source.jsx` | Mounts the script view and recoverable module-loading fallback inside the existing plan. |
| `AlloFlowANTI.txt` | Canonical host shell: lazy loaders, current-state refs, AI provider wiring, callbacks, and LessonPlanView props. |
| `build.js` | Module URL registry and source compilation pairs. |
| `ui_strings.js` | JSON-format English catalog, including `lesson_script` keys. |
| `desktop/web-app/public/` | Runtime mirrors. Keep these consistent with canonical sources. |
| `desktop/web-app/src/App.jsx` | Generated app; rebuild rather than editing directly. |

Core API: `window.AlloModules.LessonTeachingScript` (also CommonJS).

```text
captureInputs(plan, settings, materials) -> frozen snapshot
validateInputs(snapshot) -> { ok, errors }
buildScriptPrompt(snapshot, evidence) -> prompt
normalizeScript(rawJsonOrObject, snapshot, evidence) -> { ok, errors, version }
appendVersion(resource, version) -> new resource or unchanged original
updateVersion(resource, versionId, steps) -> new resource or unchanged original
toPlainText(version) -> export text
```

Versions live at `resource.data.teachingScripts`. Current schema version is 1. Versions include `planId`, `inputFingerprint`, `inputSnapshot`, `durationMinutes`, `steps`, `sources`, `researchStatus`, and warnings. Each step has `id`, `minutes`, `title`, `teacherSays`, `studentDoes`, `checkQuestion`, `possibleResponse`, `ifStruggling`, `ifReady`, `resourceIds`, and `recommendationIds`. Preserve readability/editability/export of already saved pilot versions when expanding the schema.

Research API: `window.AlloModules.LessonTeachingResearch`.

```text
collect({ grade, goal, standard, signal }, { search, read })
  -> { status: 'retrieved' | 'unavailable', sources, warnings }
readPublicGuidance(url, { signal, fetch? }) -> verified retrieved-page payload
```

Sources include stable IDs, URL, title, author, publication/retrieval dates, scope, evidence level, and recommendations with IDs/text/locators/evidence levels. Search summaries alone are not evidence.

Host API: `window.AlloModules.LessonTeachingScriptHost` exposes `availableMaterials`, `defaultSettings`, and `createController`. The controller exposes `generate(planId, settings)`, `cancel(planId)`, `saveEdits(planId, versionId, steps)`, and `dispose()`.

The host injects `getState`, core/research accessors, optional `ensureResearch`, `search`, `read`, `callText`, `updateResource`, and `onStatus`. The app currently calls the configured `ai.generateText(prompt, { json: true, search: false, signal, maxTokens: 12000 })`; research occurs before that call. Saving uses the existing `onUpdateResource(id, pureUpdater)` path rather than replacing the current view.

## Restrictions that must be generalized together

1. **Core:** `captureInputs` coerces grade to a number; `validateInputs` only accepts 3–6 and detects fractions with English regexes. The prompt hardcodes fractions and direct instruction. Duration is restricted to 10/15/20, step count to 3–6, and saved-version validation/export assume that format.
2. **Host defaults:** `defaultSettings` recognizes only grades 3–6. Use the app's actual grade/age representation and the saved lesson's metadata; avoid silently borrowing unrelated current-workspace settings for an older plan.
3. **UI:** grade initialization, options, submit guard, labels, pilot description, and download fallback name include the restriction. Search `lesson_script` strings too.
4. **Research:** `GUIDE_URL`, `GUIDANCE`, `pilotGrade`, topic detection, query, source extraction, URL allowlist, and source scope all assume the WWC fractions guide. The optional search currently does not determine the evidence source: collection always reads that same guide.

A successful generalization must change research selection as well as the visible controls and validators.

## Recommended continuation

### Derive a reviewable context from the actual lesson

Capture subject/topic, specific objectives, saved grade/age, lesson language, standards where supplied, relevant instructional content, and selected materials. Let the teacher review or correct missing/ambiguous context. Keep actual selected content as the generation grounding, not merely resource titles or counts. Respect unit/source provenance and the existing privacy boundaries.

Support the app's native grade/age formats, including nonnumeric values where the app uses them. Do not replace the fractions gate with another arbitrary subject or grade gate. Handle non-English lessons without requiring an English keyword to pass validation.

### Select and verify relevant evidence

Build bounded public-topic queries from the lesson context. Prefer attributable primary guidance, research syntheses, and reputable educational evidence sources. Retrieve the underlying documents/pages, then verify that each retained recommendation actually appears there and fits the subject, age range, and instructional setting.

Keep the existing guide as a possible fractions match, rather than the universal fallback. A named standard may inform a query, but a lesson's standard is not automatically research evidence or verified alignment. General instructional evidence and content-specific evidence should be described accurately; do not claim exact grade/standard validation when the source only supports a broader practice.

Retain bounded requests, cancellation, actual source metadata, safe URLs/redirect handling, and prompt-injection boundaries. Do not turn the current exact-URL reader into an unchecked arbitrary URL fetcher. Do not expose learner notes or raw class content in public search queries.

If no suitable evidence can be verified, explain the gap and preserve the explicit unresearched choice. Do not fabricate citations or mislabel the generated script as an evaluated intervention. Research extraction may use an AI model to identify candidates, but final quotations/locators and attributed claims must be checked against retrieved text.

### Match script depth and pacing to the lesson

The existing 10–20-minute direct-instruction segment is useful infrastructure, but that limit also originated in the pilot. The user's original direction was a more comprehensive word-for-word script. Reconcile output scope with the actual lesson and clearly label whether the teacher is generating a segment or the whole lesson. Do not silently present a short segment as a comprehensive whole-lesson script.

For broader output, preserve the lesson's phases, goals, resources, and realistic pacing. Include speakable explanations/models/transitions, student participation and wait time, likely misconceptions as possibilities, checks, and conditional follow-ups. Keep teacher judgment and editability. Expand validation/schema deliberately so old versions still work.

### Validate more than the original fractions case

Retain the existing fractions case as regression coverage. Add materially different lessons, for example early reading, middle-school science, and secondary history, plus a non-English lesson and a nonnumeric grade/age value supported by the app. Verify that queries and evidence change with context and that irrelevant fractions guidance is rejected.

Also test missing evidence, source-population mismatch, unavailable search/read services, malformed output, interrupted generation, changed/deleted source materials, changed teacher workspace, old saved-version compatibility, and copy/download. Include cases where the saved lesson differs from current ambient settings.

Real model examples still need educational quality review. Existing passing tests establish software behavior, not classroom effectiveness or the quality of live generated teaching prose.

## Build and integration pitfalls already encountered

- **Use literal module-loading calls.** The build rewrites calls such as `loadModule('LessonTeachingScriptModule', 'https://alloflow-cdn.pages.dev/lesson_teaching_script_module.js')`. An earlier generic array loop left remote URLs in the local app. Current required loaders use literal calls; keep them compatible with the build.
- **Optional research must stay optional at load time.** Required editor/core/host readiness must not depend on successfully loading research. Research is ensured when requested by generation.
- **Wait for ready before mounting the editor.** Otherwise it can initialize local form state with empty materials/grade before scoped defaults arrive. The parent now gates mounting on `teachingScriptLoadState === 'ready'` (undefined is permitted for legacy callers/tests).
- **History is canonical.** An active `generatedContent` object can be smaller than the saved resource. Do not resurrect a deleted plan from a stale active view.
- **Keep source IDs.** `sourceArtifactId` is established app provenance; matching only `sourceId` or a fingerprint missed a real boundary.
- **Inspect mobile visuals.** Automated accessibility checks did not catch an unreadably narrow version selector. It now occupies an appropriate mobile row.

Commands from repository root:

```powershell
node _build_lesson_teaching_script_module.js
node _build_view_lesson_teaching_script_module.js
node _build_view_lesson_plan_module.js
node build.js --mode=dev
node dev-tools/check_view_props.cjs
node dev-tools/verify_module_registry.cjs
```

The development build generates `desktop/web-app/src/App.jsx` and mirrors runtime assets. Check that new feature URLs in that output are local and that root/public runtime mirrors match. Do not use deployment flags merely to run a local build.

Windows/OneDrive writes have sometimes been unreliable in this environment. Existing utilities include `dev-tools/write_generated_atomic.cjs` and the workspace-specific `scratch/main24-write.cjs` (backup + expected-content check + atomic replacement). Preserve concurrent changes and inspect a failed write before retrying. Codex's final read-only verification hit an automatic approval-review timeout, then succeeded on retry; that was an environment timeout, not an unresolved code failure or a user refusal.

## Last completed validation baseline

| Test file | Passing checks |
| --- | ---: |
| `tests/lesson_teaching_script.test.js` | 17 |
| `tests/lesson_teaching_research.test.js` | 49 |
| `tests/lesson_teaching_script_host_boundary.test.js` | 14 |
| `tests/lesson_teaching_script_ui.test.js` | 19 |
| `tests/lesson_teaching_script_integration.test.js` | 4 |
| `tests/main_resource_host_mutations.test.js` | 36 |
| **Distinct total** | **139** |

The final development build passed. Generated JSX parsed, six public mirrors matched, all four feature module URLs resolved locally, view-prop checks passed, and module registration checks passed. Live Node and Chromium retrieval of the actual WWC guide succeeded, including source identity and recommendation ratings. Desktop, 390px, and 320px views, editing, and collapsed states had no axe violations, overflow, or console errors.

Useful artifacts:

- `scratch/lesson-teaching-script-final-tests.json`: earlier combined report; contains a subsequently fixed loader-test failure. Do not mistake it for the final unresolved state.
- `scratch/lesson-teaching-script-host-final.json`: 40 passing integration + existing mutation checks after correction.
- `scratch/lesson-teaching-script-integration-verified.json`: final four integration checks after the literal-loader fix.
- `scratch/lesson-teaching-script-verified-build.log`: final local build.
- `scratch/teaching-script-ui/audit.json` and PNGs: actual built UI with fixture script data.
- `scratch/lesson-teaching-research-browser.cjs`: live public-source browser smoke.

Example focused test invocation:

```powershell
node node_modules/vitest/vitest.mjs run tests/lesson_teaching_script.test.js tests/lesson_teaching_research.test.js tests/lesson_teaching_script_host_boundary.test.js tests/lesson_teaching_script_ui.test.js tests/lesson_teaching_script_integration.test.js tests/main_resource_host_mutations.test.js --maxWorkers=1 --testTimeout=30000
```

One combined test/build run experienced a worker termination timeout; affected tests passed when rerun separately. Prefer focused checks and avoid adding build load while diagnosing a worker issue. Update the test expectations that intentionally encode the old pilot restriction while retaining the safety and persistence regressions.

## Completion criteria for Claude's continuation

A teacher can open a supported lesson outside fractions/grades 3–6, review its detected context, request a script, and receive content and research appropriate to that lesson—or an honest explanation that applicable research could not be verified. The original lesson, existing scripts, scoped resources, cancellation, editing, and exports continue to work. The interface no longer presents the assistant's narrow pilot restriction as the product's intended scope. Report what was generalized, what was actually verified with live retrieval/model output, and any remaining coverage limits accurately.
