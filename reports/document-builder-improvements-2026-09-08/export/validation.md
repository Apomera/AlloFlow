# Document Builder export fidelity implementation

Date: 2026-09-08. Local implementation and focused source regression checks only. No deployment, paid provider calls, or production document upload.

## Behavior

- Builder Slides exports the frozen current editor HTML and title through the existing semantic HTML-to-Office-to-PPTX path. Explicit live snapshots fail visibly if empty or the exporter cannot load; they never fall back to old History. The ordinary History slide route remains available when no live snapshot is supplied. The host forwarding wrapper retains the selected History scope even when callers supply their own history property.
- Markdown and the edited NotebookLM fallback now share a finalized accepted-revision clone and DOM conversion. Embedded raster image references, MathML source, code whitespace, simple tables and internal links survive. Merged/complex tables retain HTML with a compatibility notice; unsupported image sources retain descriptive text and a warning. Review/editor chrome and active attributes are removed from retained table HTML.
- BRF cleans tracked changes before either shared converter. Cleanup failure is visible instead of silently exporting the live rejected/deleted text. The inline fallback normalizes actual CRLF/CR line endings, fixing the former optional-newline regex that split every character.
- ePub remote image loading is bounded to 10 seconds for the entire headers/body transfer and 8 MiB per image. Declared and streamed oversize bodies are rejected; timeout aborts/cancels the reader. Failed images use the existing descriptive fallback and release the export busy state.

## Owned source edits

- export_handlers_module.js: executeExportFromPreview Slides handoff (canonical hand-written module; no separate source file).
- export_source.jsx: createExport.handleExportSlides explicit live snapshot path.
- view_pdf_audit_source.jsx: _buildAccessibleOfficeExport format=pptx branch only.
- view_export_preview_source.jsx: _builderCleanMarkdownRoot, _builderMarkdownFromRoot, _builderFetchExportImage; Markdown, NotebookLM fallback, BRF and ePub callbacks.

Root owns the AlloFlowANTI.txt forwarding wrapper, all generated artifacts, and other concurrent Builder edits. Other agents own different spans of shared source/test files.

## Checks and evidence

- New tests/document_builder_export_fidelity.test.js: 20/20 pass. Actual callback/source-factory tests exercise current-vs-old content, failure without History fallback, accepted BRF before shared conversion, exact fallback grouping, Markdown image/MathML preservation, retained HTML cleanup, stream size checks, late/stalled network responses and actual ePub callback cleanup.
- export_preflight_modes.test.js: 3/3 pass. Together with the new 20 checks, recorded in tests-verified.json.
- Existing affected renderer/handoff suites: 30/30 pass (Office semantics 4, slide spec 9, export handoff 5, canonical BRF 12), recorded in tests-final.json. That command also passed the then-19 new cases but had a separate fork worker boot timeout before the preflight file could start; the affected files were subsequently rerun using one threads worker. JSON alone does not capture that process-level error.
- Follow-up source contracts: audit_coherence_fixes.test.js 37/37 and guided_builder_handoff.test.js 19/19 pass, recorded in tests-contracts-verified.json. The clone assertion now recognizes shared cleanup while retaining the cleanup-path count and asserting finalized helper usage by both callers. The Slides wrapper assertion also executes the actual callback and checks scope protection.
- 109 distinct passing checks across 8 focused files, assembled from the successful file runs above. Root's separate integration run is the authority for final generated build/browser checks.
- node --check export_handlers_module.js and scoped git diff --check passed. Git reported only existing line-ending normalization notices.

Initial/follow-up reports are retained honestly: tests-initial.json includes an extraction-marker test issue; tests-followup.json includes the subsequently fixed retained-table contenteditable cleanup regression; tests-contracts.json contains obsolete contract expectations before updates. helpers.txt and apply-source.cjs are historical drafting artifacts, not canonical source or scripts to rerun after integration.

Commands for the final focused test runs:

    npx vitest run tests/document_builder_export_fidelity.test.js tests/export_preflight_modes.test.js --pool=threads --maxWorkers=1
    npx vitest run tests/audit_coherence_fixes.test.js tests/guided_builder_handoff.test.js --pool=threads --maxWorkers=1

## Integration and limits

Required regeneration: node _build_export_module.js; node _build_view_export_preview_module.js; node _build_view_pdf_audit_module.js. Mirror canonical export_handlers_module.js into desktop/public/export_handlers_module.js. Root is performing integration; this agent did not independently regenerate shared bundles.

PPTX uses the existing semantic converter and generated slide layout, not a pixel-identical screenshot of the editor. Its success notice explicitly requests layout and image-description review and makes no verified-PPTX claim. Markdown preserves MathML source in a fence and complex table HTML; rendering depends on the receiving Markdown reader. BRF fallback remains Grade 1; this change does not claim contracted Braille or tactile math. The ePub limits bound each remote image transfer, not every possible resource or the complete ZIP packaging duration. These are local regression checks; no human assistive-technology acceptance or production network performance result is implied.
