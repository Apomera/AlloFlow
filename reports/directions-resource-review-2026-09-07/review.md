# Directions resource review

Reviewed the current local source after the bolding and line-break fixes. This is an analysis report; no application code was changed during this review.

## Confirmed findings, in recommended order

### 1. High: directions disappear from the shared document export

The shared generateResourceHTML function has no directions branch and falls through to an empty string. Calling the actual generator with a plain-text directions resource and with a structured body/objectives resource returned an empty string in both cases. The document assembler discards empty sections, so export paths using this generator omit the assignment instructions. The IMS export caller also classifies empty output as a skipped entry.

Recommendation: add a directions export adapter that includes the title, due line, formatted body, goals, and an appropriate printable choice-board representation. Test plain and structured resources in student and worksheet outputs.

Evidence: [doc_pipeline_source.jsx](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:38237); [export_source.jsx](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/export_source.jsx:1427). The reproduced generator outputs are in results.json. This was a generator-level reproduction, not a downloaded-file end-to-end test.

### 2. Medium: the composer can put its title and save button off-screen

In Chromium at 390 × 844, rendering the actual composer with ten goals produced a dialog extending from y=-86 to y=930. Add to pack extended from y=841 to y=875. The fixed overlay and dialog both use visible overflow rather than a bounded scrolling area. The top and bottom controls therefore extend outside the visible screen.

Recommendation: give the dialog a viewport-relative maximum height and an internal scrolling content area, while keeping its heading and action buttons reachable. Check smaller phones, expanded choice boards, and increased text size.

Evidence: [view_directions_composer_source.jsx](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_directions_composer_source.jsx:48); composer-mobile.png. Measurements use an isolated rendering of the real module with the current compiled app CSS, not a live full-app session.

### 3. Medium: saved content can be silently omitted from the student view

The composer accepts more content than the result adapter displays. Reproductions with 13 resources and 25 manual goals yielded only 12 station entries and 24 goals. A sentinel instruction after character 20,000 was also absent. Once the first twelve resources were visited, the recommendation was empty even though resource thirteen was unvisited. Other app navigation may still expose that resource; the directions navigation does not.

Recommendation: enforce and explain authoring limits before saving, or paginate/show all entries. Keep navigation and recommendation data complete even if the visual map shows only a subset. Warn about truncation instead of silently removing directions or success criteria.

Evidence: [AlloFlowANTI.txt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:3774); [AlloFlowANTI.txt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:3797); [AlloFlowANTI.txt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:3874).

### 4. Medium: formatting still depends on whether the document module has loaded

For the same two numbered steps, the new preview fallback emits an ordered list with two list items. The document formatter emits two ordinary paragraphs containing literal numbers. The words and visible step numbers remain, but indentation, list semantics, and screen-reader list announcements differ. The earlier fix solved the unloaded fallback; it did not unify the two renderers.

Recommendation: share one Markdown renderer between previews and exports, with tests for ordered and nested lists, links, emphasis, escaped punctuation, and both loading states.

Evidence: [AlloFlowANTI.txt](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/AlloFlowANTI.txt:3704); [doc_pipeline_source.jsx](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/doc_pipeline_source.jsx:38117); parserComparison in results.json.

### 5. Medium: the quest map clips goals when goals outnumber stations

With one resource and four goals, the SVG width is 340 units but the fourth goal reaches x=380. SVG overflow is hidden, so part of that goal is clipped. The width is derived only from station count, while goals have their own horizontal spacing. The checklist below the map remains available.

Recommendation: size the map to include both station and goal bounds, or wrap goals into rows. Verify one-resource/many-goal assignments and long translated labels.

Evidence: [view_directions_result_source.jsx](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_directions_result_source.jsx:235); quest-map.png and questMap in results.json.

## Further usability improvements

These are design opportunities rather than additional confirmed defects:

- Offer a formatted preview of the entire directions body in the composer; the existing preview covers choice-board cards.
- Make the assignment sequence clearer: keep the introduction visible before a prominent next-activity action, and distinguish opening an activity from completing its learning goal.
- Use a structured due-date field where useful, while retaining flexible teacher-entered wording.

## Verification and scope

All 103 tests in seven existing directions suites passed. Additional source-level and Chromium reproductions found the cases above; passing tests do not cover these edge cases today.

Reproduction: run node reports/directions-resource-review-2026-09-07/reproduce.cjs from the repository root. It reads production functions/modules and writes results.json and two screenshots. Lightweight dependency stubs are used for translation, icons, student-safety filtering, and sanitization; those subsystems are not under test. Full-app interaction, screen-reader behavior, translated layouts, and a downloaded export were not exercised.
