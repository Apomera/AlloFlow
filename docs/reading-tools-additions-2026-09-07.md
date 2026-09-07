# Reading tools additions — September 7, 2026

The approved additions now use Lumen's existing evidence project. Open **Read & reflect** from the Reading Library toolbar or the adapted reading controls. The reading activity appears first on mobile; the usual Study Sources view keeps it in an expandable section.

## What changed

- **Read & reflect:** choose a short source passage, write a gist, optionally copy exact supporting evidence, record a question, and mark understanding as clear, uncertain, or needing a reread. Responses are learner-authored; no AI answer or score is required. Save a reflection to keep it across mode changes and reopening.
- **Connected saved entries:** reflections, bookmarks, vocabulary and practice notes share the Lumen project and a filter for passages to revisit. Library handoffs include bookmarks and words with known page locations. New library words retain their passage and language. Older words without a location remain available in My words without an invented link.
- **Reopenable notes:** saved grounded answers and reading entries open with retained passage citations. Personal annotations save automatically and remain separate from verified answer text. Source updates or removal mark dependent notes stale while preserving the original cited passage. Older notes whose evidence had already been removed cannot recover a missing snapshot; the UI states this.
- **Listen–try–reread:** optional model playback uses the shared speech player, followed by independent or partner practice, rereading, and reflection. The saved practice step can be resumed. Changing passage, activity or step stops owned playback. No microphone permission, recording or AI assessment is required.
- **Reading supports:** the library offers reading columns of 40, 56 or 72 characters and five ruler-band heights. These preferences persist for the active reading identity. Default font inheritance and explicit font choices remain intact.
- **Multilingual paced reading:** Focus Reader uses word segmentation for unspaced scripts, including Chinese, Japanese and Thai, preserves punctuation and emoji, and falls back without crashing when segmentation is unavailable. Adapted readings supply their original word boundaries instead of rebuilding text with spaces. Common heading, emphasis and link markup is removed from the displayed paced text. Presentation pace is not a fluency score.

## Persistence and passage identity

Reading storage separates role, active profile and learner codename. The library and Lumen use the same boundary. A handoff is bound to its originating identity, so switching learners does not import the previous learner's word collection.

Existing device-wide library words/bookmarks and earlier Lumen projects are preserved. Named profiles provide explicit import controls that copy the older entries without deleting their originals. Anonymous use without a profile or codename still represents a shared device identity.

Passages retain resource, section/page, language, content revision and source version. A saved word from an older page cannot replace the current source revision. Return links reopen the reader and page; if a saved translation or passage differs from the current reader, the app explains the mismatch and keeps the stored passage in Lumen. Missing adapted resources retain their saved passage instead of opening an unrelated resource.

Project writes are serialized per identity, and reopening waits for queued saves. Storage failures continue to surface through Lumen's storage status.

## Verification

- Broad regression run: 539 passing checks across Lumen and reading suites; one disk-heavy whole-catalog contract scan exceeded its 120-second limit during the concurrent run.
- The whole-catalog contract scan passed when rerun alone (approximately 69 seconds of test execution).
- The final new workflow suites cover reflections and annotation reloads, delayed-save reopening, profile isolation, source revision preservation, restricted-source AI guards, library links/imports, display preferences, multilingual segmentation and accessibility.
- Chromium checks passed at 390px and 1280px viewport widths with 16px and 24px root typography. Reflection saving, citation reopening, passage return and practice playback stopping worked. No horizontal overflow or page errors remained. A mobile selector overflow found during the check was fixed.
- All 65 view prop checks and the CSS template check passed. The development app build regenerated the host and public copies; generated JSX and changed module syntax were checked.

Browser results and screenshots: [browser.json](../reports/reading-tools-additions-2026-09-07/browser.json). Runtime tests: reading_study_workflows.test.js and reading_library_study_bridge.test.js. Browser runner: dev-tools/check_reading_study.cjs.

## Scope and limits

Nothing was deployed or committed. Speech availability still follows the configured shared speech player. Reflections and unrecorded practice work without it.

Automatic approval review rejected a proposed change that would attach passage context to AI definition requests, because that could send sensitive reading text to an unverified provider. That request was left unchanged. The implemented reflection and practice features work locally, and source-provider AI restrictions are enforced before grounded-study requests are sent.
