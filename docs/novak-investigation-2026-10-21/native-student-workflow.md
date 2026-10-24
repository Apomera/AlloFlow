# Native Novak lesson: local verification

Verified October 21, 2026. **Local only: no commit, push, or deployment for this follow-up. Publication remains paused until Aaron coordinates the other agents.**

The lesson now works through AlloFlow's native student tools. The earlier teacher-preview.html is an exported reading view. Use the native preview below to enter work, save a project, reopen it, and submit the work file.

## Open the native lesson

While the current local server is running:

- Student: http://127.0.0.1:51641/student
- Teacher catalog: http://127.0.0.1:51641/app/?lesson=academic-discourse-reading-space-grade6

Choose a student codename to start. The teacher link opens the catalog entry; select **Load in AlloFlow**. This sample contains directions, an anchor chart, a Cornell notebook, and a three-question written assessment with two reflections.

For a reproducible server after this session, follow [LOCAL-STUDENT-PREVIEW.md](../../artifacts/novak-investigation-2026-10-21/LOCAL-STUDENT-PREVIEW.md). Its default port is 51642. Use a fresh browser profile when verifying a rebuilt local runtime; an existing service worker can retain earlier test modules. The current student fixture expires October 28 and must be regenerated for later use.

## Changes

- Corrected the three quiz types from unsupported `shortAnswer` to native `short-answer`.
- Made the assessment teacher reviewed, so students can complete it without an AI connection. Teacher criteria stay in the teacher copy and are removed from the student assignment.
- Restored saved learner responses during project import after the existing runtime reset. Imports replace the response map only after success; failed, cancelled, or superseded imports do not overwrite current work.
- Connected the quiz to imported drafts and completed attempts. Question matching and workspace ownership prevent stale work from appearing in another imported project.
- Guarded delayed quiz callbacks so an old workspace cannot write into a newer one that happens to reuse the same resource IDs.

Host changes are five exact edits in AlloFlowANTI.txt and the two desktop source mirrors. Quiz changes are in view_quiz_source.jsx, its compiled module, and the desktop public mirror. Exact patches, hashes, and preservation checks are in the two *response-restore-patch.json artifacts. Other agents' unfinished changes were preserved.

## Browser results

All checks passed using synthetic student **Calm Otter**:

1. Entered notebook text and answered all three quiz questions and both reflections in the native app.
2. Saved an actual project file. Opened it in a separate browser context and verified all eight notebook fields, the completed quiz, and its three answers plus two reflections.
3. Started another attempt, saved a partially answered quiz, and reopened that file in a fresh context. The typed answer remained, the other questions stayed blank, and the quiz stayed unfinished.
4. Continued that draft through completion and used **Submit → Download Submission File** on the final local host.
5. Loaded the corrected lesson through the native Community Catalog in a teacher context and imported the submission into **Submission Inbox**. It showed all 13 entered texts, the three matching teacher review criteria, and **0 import errors**.

The actual browser downloads were preserved unchanged. The observation copied each download Blob while still calling the original browser download function; it did not inject app state or replace save/import/submit handlers.

**77 focused tests passed:** 30 host/import checks and 47 quiz restoration/adjacent regressions. The local bundle and module syntax checks passed. Final browser asset hashes match the build receipts.

Evidence: [native-student-workflow-review.json](../../artifacts/novak-investigation-2026-10-21/native-student-workflow-review.json), [saved completed project](../../artifacts/novak-investigation-2026-10-21/native-student-saved-project.after-fix.json), [saved draft](../../artifacts/novak-investigation-2026-10-21/native-student-saved-draft.after-fix.json), [final submission](../../artifacts/novak-investigation-2026-10-21/native-student-submission.final-host.json), and [teacher inbox text](../../artifacts/novak-investigation-2026-10-21/native-teacher-inbox.final.txt).

## Scope and remaining release work

This validates the offline file handoff inside the app. Hosted classroom delivery, an LMS upload, AI grading, and authenticated Gemini Canvas generation were not exercised. Device voice playback was unavailable in the test browser. The teacher inbox also retains an existing empty aggregate notebook row alongside the eight correct individual entries.

The served host is a local esbuild bundle assembled from the immutable published source plus the five reviewed edits, with unchanged production styling. It is not a production CRA release build. The local server redirects only catalog fetch URLs to local files, ensuring this test uses the corrected sample rather than the published one.

The public catalog and existing Gemini Canvas artifact have **not** received these follow-up fixes. The earlier published commit remains 73be313. Reconcile that remote commit and the concurrent local work before preparing another production release. Do not deploy the shared dirty tree or these local preview assets.
