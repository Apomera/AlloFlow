# Perception Lab: high-resolution image export

Updated October 5, 2026.

**Export PNG** saves the current experiment as a 2400 × 1440 image with an opaque white background. It is available alongside Export SVG in the regular and focused workspaces, making drawings easier to use in slides, worksheets, and art applications.

The export captures the live drawing at the moment of the click, including its current surroundings and revealed guides. Later edits do not change that snapshot. A pinned comparison is kept separate. Moiré rotation continues while its captured frame is exported. Exporting does not change notes, saved observations, or layout.

The button shows **Creating PNG…** while processing and prevents duplicate requests. Failed image decoding, drawing, or encoding returns a retryable error. A stalled export times out after 15 seconds. Temporary image URLs, canvas buffers, and callbacks are cleaned up after success, failure, cancellation, or leaving the tool.

PNG export is unavailable while a three-match study is collecting or awaiting reveal. Starting a study, changing the experiment or learner profile, or leaving the tool cancels an unfinished export. Late callbacks cannot download a canceled image.

SVG and PNG now share one serialization path. It removes a redundant namespace attribute before serialization, avoiding duplicate XML namespace declarations while retaining the actual drawing and its accessible description. Existing SVG export coverage now checks that the result parses as valid SVG XML.

There are four new English interface strings. Scientific calculations, scene geometry, notebook format, and study reports are unchanged. No new production dependencies are added.

## Verification

All 161 targeted tests passed across six files, including 22 new PNG-export cases. Chromium passed 19 browser groups covering all six experiments, actual PNG downloads and decoded pixels, five screen widths, focused export, 200% text, study reveal protection, moving-frame capture, and cancellation. The exported pixels matched across light, dark, high-contrast, and both system forced-color modes. Accessibility checks in the focused view were clear at all five widths.

The initial export test exposed the namespace issue. After its correction, the existing exact-SVG test was updated to require valid XML and rerun successfully. An initial browser download was canceled; rerunning with explicit download acceptance and task-local browser and download directories passed. Diagnostic attempts are retained alongside the final results.

See [validation.json](validation.json) for source hashes, selected test results, and verification limits. Browser validation uses Chromium; Safari and Firefox were not tested. The broader 690-test Perception suite was not rerun in this pass.

Application status: applied to the project and desktop copy. No commit was created. See [application.json](application.json).

## Examples

- [Exported size-and-surroundings PNG](drawing-ebbinghaus.png)
- [Exported moiré PNG](drawing-moire.png)
- [Exported brightness PNG](drawing-brightness.png)
- [Export controls in the focused workspace](workspace-1600.png)
- [Phone export controls](workspace-390.png)
- [Controls at 200% text](workspace-large-text.png)
