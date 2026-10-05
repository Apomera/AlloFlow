# Audience and DBQ scoped work

Baseline HEAD: cb106fd68907b7cb73bdf7ad7b4c676bb1f70dc6. Existing dirty work preserved. No staging, commit, network, deployment or package build.

## Changes

- session_transport_module.js and view_lesson_plan_source.jsx: recursive learner-field projection removes structured teacher dialogue, expected responses, teacher guides and unknown metadata. Teacher/unknown saved plans omit scalar narrative phases and display a limited-view notice; objectives, criteria, materials and structured activities remain. Study/Family learner prose and delivery remain intact. Viewer uses transport helper with matching fallback.
- doc_pipeline_source.jsx: exact lesson-plan rendering branch applies the same projection to the default student copy. Answer-key split is distinct from audience: only explicit audience teacher exempts the no-key teacher copy.
- host_handlers_source.jsx: only the saved lessonPlanId export caller stamps audience teacher to preserve complete scoped teacher printing.
- generate_dispatcher_source.jsx: only the authorized DBQ branch captures actual supplied/custom/search source records before model generation. Model URLs, provenance, factual titles, author and date attribution are replaced by captured records or conservative unknown metadata. Teacher-link domain-search metadata binds only to an exact URL match. Custom excerpts use the exact captured text. Document overcount is capped, shortage disclosed, references kept valid and multiple excerpts from one source disclosed.
- view_dbq_source.jsx: UI/print original links require captured provenance and exact URL agreement; legacy model-only links are hidden. Same-source excerpts are disclosed.

## Validation

Targeted builders passed: view lesson, DBQ view, generate dispatcher, document pipeline, and first-wave HostHandlers. Generated root/public pairs written by builders; coordinator owns additional mirrors and host pins.

Final focused run: 100/100 checks across ten files, one worker, no assertion weakening. Evidence: tests-final.json. Own suites: lesson_plan_audience_projection.test.js, lesson_plan_student_export_projection.test.js (actual HTML branch), dbq_trusted_provenance.test.js. Existing session, lesson batch/exports/structured editing and DBQ batch/briefing/fix0927 suites included. The existing DBQ safe-link positive fixture now supplies captured provenance; a new negative assertion rejects an otherwise safe URL without provenance. Saved teacher print assertion now checks explicit audience teacher.

Initial 98/100 run retained in tests-initial.json: expected changed DBQ provenance contract and teacher-key/audience mismatch. Intermediate 100/100 retained in tests-intermediate.json; final fixes explicitly distinguish audience and preserve scoped teacher print through its real caller. Installed Vitest rejects --minWorkers; corrected to supported --maxWorkers=1.

## Limits

Projection is structural. A teacher narrative embedded inside a retained structured text field cannot be reliably separated from student prose without a stronger content schema; no regex rewrite of mixed prose was introduced. Scalar teacher narrative phases are suppressed conservatively. Underfilled model output is disclosed instead of inventing documents to pad counts. Retrieved records may contain only a preview, so generated longer excerpts are reconstructed rather than quotations. No live AI/network evaluation or browser acceptance run in this delegated task.

Sandbox shell startup fails with deny-read ACL error. Narrow authorized elevated local reads/edits/builds/tests were used.
