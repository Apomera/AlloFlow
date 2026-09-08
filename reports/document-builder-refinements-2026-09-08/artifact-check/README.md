# Current-document PowerPoint artifact check

Passed 11 of 11 automated checks against the final built application modules on 2026-09-08T21:46:12.352Z. The probe used a synthetic education document in an isolated Chromium context and performed real contenteditable edits before export.

The actual route was `ExportHandlers.executeExportFromPreview` → `createExport().handleExportSlides` → `AccessibleOfficeExport.build` → locally bundled PptxGenJS 3.12.0. Instrumentation recorded the shared Office call while delegating to its real implementation. The probe did not mock the slide builder, library, object URL, anchor click, or browser download. It loaded the repaired classic-script PDF module successfully. All external requests were blocked and none were attempted. No runtime errors occurred.

## Result

- A real three-slide PPTX downloaded successfully: [live-edited-education.pptx](run-01/live-edited-education.pptx), 2,968,622 bytes.
- SHA-256: `5e02f1c0ffe696d2ff18c00e6b1a31f903726f34fdebcd17949992c55cf62fd6`.
- ZIP CRC checks passed. Slide XML contains the edited heading `LIVE_EDITED_LESSON` and value `LIVE_VALUE_42`.
- Old preview marker `OLD_PREVIEW_VALUE_10`, old History marker `OLD_HISTORY_VALUE_10`, and inspector chrome are absent from all XML parts.
- The native table and corrected cell value remain. The water-cycle image is embedded with byte-for-byte equality to the existing repository image and its authored alternative description appears in slide XML.
- The equation survives as ordinary editable slide text `x=42`. The export does not contain native mathematical structure.
- Chromium 148.0.7778.96; JSZip 3.10.1. Module and input-image hashes, call evidence, console output, and individual observations are in [results.json](run-01/results.json).

## Reproduce

From the repository root, use a new output directory:

```powershell
node reports/document-builder-refinements-2026-09-08/artifact-check/check-live-pptx.cjs reports/document-builder-refinements-2026-09-08/artifact-check/run-new
```

The script loads existing local assets only and refuses to overwrite a prior evidence directory. The original and edited HTML snapshots and slide XML are saved alongside the PPTX. The image comes from `allopacks/media/water_cycle_grade6/wc-img-cycle-diagram.png`. No application source or generated modules changed during this probe.

## Boundaries

This is a controlled coordinator host, not a full Builder button interaction. It establishes artifact content and the local download route. No PowerPoint, Google Slides, or LibreOffice import/rendering was run; no visual-layout or destination-application claim follows from the XML checks. Human screen-reader and assistive-technology testing remain **not run**. This evidence file has not been visually finalized for distribution as a teaching deck.
