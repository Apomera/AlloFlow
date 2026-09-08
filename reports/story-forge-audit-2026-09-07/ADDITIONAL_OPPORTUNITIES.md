# Additional Story Forge improvement opportunities

Reviewed the current source after four implementation passes. This review changes no application code. Priority reflects likely user impact; source-confirmed paths below are distinct from browser-reproduced failures.

## 1. Protect every optional AI coach, not just main feedback — high

**Browser reproduced:** Show vs Tell accepts a JSON response with `tellings` as an object, stores it, and later calls `.map` during rendering. The isolated Story Forge component unmounts with `showTellResult.tellings.map is not a function`. A try/catch around the request cannot catch this later render error.

Evidence: `story_forge_source.jsx:6369` and `:11365`; reproduction in `audit-followup.cjs`, results in `followup-review/coach-malformed-response.json`. Synthetic response only; no live AI service or full host error boundary was involved.

Recommendation: add bounded response validators to Senses, Show vs Tell, Character Arcs, Dialogue, Mentor Match, and Help Me. Extend request identity, stale-result checks, and retry/cancel behavior to those tools. Add a local error boundary so an unexpected coach rendering failure does not take down the writing workspace.

Acceptance: malformed collections and object-valued display fields never crash the editor; results from earlier drafts do not appear as current advice.

## 2. Preview comic bubble replacements and protect edits made during generation — high

**Source-confirmed:** `draftComicBubbles` generates fields and merges them over existing dialogue and direction values by panel ID. Existing speech can be replaced; generated empty fields can clear existing values. The request has no equivalent to the scene-plan preview and checkpoint workflow. Tightening bubbles also merits the same review.

Evidence: `story_forge_source.jsx:5025`, especially `:5101`; related path `:5130`.

Recommendation: show old and proposed text, allow per-panel Apply, checkpoint bulk changes, and refuse to apply against changed target content. Preserve manually edited fields by default. Reuse comic Undo where appropriate, but do not rely on Undo as a substitute for explaining replacement.

Acceptance: editing a bubble while generation runs cannot be silently overwritten; a student can compare and reject a generated version.

## 3. Validate imported review content as rigorously as live feedback — high

**Source-confirmed:** the import validator accepts raw review objects and permits legacy review presence to establish `hasReviewData`. `applyImportedPackage` subsequently assigns raw `review.gradingResult` to state. The new live-feedback validator does not cover this path.

Evidence: `story_forge_source.jsx:1508` and `:8014` (applyImportedPackage vicinity).

Recommendation: validate imported score/feedback collections before rendering; discard invalid optional review data while recovering the valid writing. Explain that the story was recovered but needs another review. Preserve explicit compatibility rules for older package formats.

Acceptance: a malformed review object cannot crash an otherwise valid imported story or grant reviewed status solely by being truthy.

## 4. Use comic dialogue consistently across the remaining coaches — medium/high

**Source-confirmed:** main grading and metrics now use shared authored content, but Mentor Match, Senses, Show vs Tell, Character Arcs, and Dialogue analysis still build text primarily from `paragraphs[].text`. Dialogue-only comics can therefore receive a write-more message or advice based on incomplete content.

Evidence: `story_forge_source.jsx:6205`, `:6317`, `:6369`, `:6422`, `:6488`.

Recommendation: reuse the shared authored-content model with panel references and speaker attribution. Count actual authored words before adding labels when applying minimum-length requirements.

Acceptance: a meaningful dialogue-only comic reaches the appropriate coach, and its speech and thoughts appear in the request.

## 5. Keep dictation attached to a stable section ID — medium/high

**Source-confirmed risk, not microphone-reproduced:** dictation appends text by `dictatingParagraphIdx`. Removal and reordering change array positions without updating that target. The affected UI actions do not consistently block active capture. The custom-language selection also falls back to English recognition.

Evidence: `story_forge_source.jsx:3809`, `:3814`, `:4809`, `:4836`.

Recommendation: capture the section ID when dictation starts; stop or retarget explicitly if it disappears. Apply the same lifetime check to recording and OCR completion callbacks. Expose the actual recognition language and let custom-language users select a supported speech locale.

Acceptance: deleting/reordering earlier scenes during simulated recognition never sends text into another scene; late capture output after restore cannot modify the replacement project.

## 6. Give assignments a deliberate review model — medium

**Source-confirmed design gap:** custom rubric criteria are extracted only from pipe-separated rows, capped at six, and otherwise replaced with generic defaults. Self-ratings start at 3 and submitting accepts unchanged values. The UI now explains this, but submission is still a weak indication of reflection.

Evidence: `story_forge_source.jsx:7028`, `:11216`, `:11233`.

Recommendation: preview detected rubric criteria and let teachers correct them; explain unsupported rubric formats. Consider a brief strength/next-step reflection or explicit rating selection when required by the assignment, while retaining an accessible low-effort route for younger students.

Acceptance: students review the intended assignment criteria; a teacher can distinguish explicit reflection from default ratings.

## 7. Separate project identity from display names — medium, architectural

**Source-confirmed:** draft storage keys normalize codenames; different display names can map to the same key. XP uses one device-level key. This is not evidence of a real data incident, but it limits multiple-project and shared-device workflows.

Evidence: `story_forge_source.jsx:2402`, `:2475`.

Recommendation: stable user/project IDs, a small project library, and an explicit policy for device versus student progress. Migrate existing drafts with recovery and collision handling before changing storage keys.

Acceptance: distinct projects and users retain separate drafts even when display names normalize identically.

## 8. Verify the complete host and actual exported artifacts — medium, coverage gap

The accumulated browser checks exercise an isolated component with cached styles and synthetic services. They do not establish behavior with the full host shell, physical-device keyboards, live microphone capture, or every finished export.

Recommendation: a small end-to-end matrix covering a prose story and a dialogue-only comic through editable backup, import, finished output, and reopen. Include mobile keyboard open, 200% zoom, dark/high-contrast themes, and one supported RTL language. Inspect generated HTML/media and verify text, alt descriptions, audio, and reading order survive.

Acceptance: a student can recover the editable project and open its finished output with expected content and accessible reading order.

## Recommended next pass

Start with optional-coach validation and imported-review validation, then protect generated comic replacements. Follow with stable dictation targets and consistent comic coach inputs. Defer project-library migration until its ownership and compatibility rules are explicit.
