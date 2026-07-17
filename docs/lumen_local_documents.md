# Lumen local document import

Status: implemented, July 2026.

Study Sources can import up to five local documents at a time. Supported formats are PDF, DOCX, PPTX, XLSX/XLS/XLSB/ODS, TXT, Markdown, CSV, and EPUB.

## Privacy and execution boundary

Document bytes stay in the browser. Import does not call an AI provider and does not upload the selected file. Lumen stores only the extracted, normalized text snapshot and bounded provenance metadata in the existing device-scoped evidence project. Shared parser code such as pdf.js, Mammoth, SheetJS, or JSZip may be loaded from AlloFlow's configured library CDN when it is not already present; the file is never sent to that CDN.

Binary formats reuse AlloFlow's deterministic document pipeline:

- PDF uses the text layer and preserves page boundaries.
- DOCX uses the structured Mammoth/OOXML path, including headings where available.
- PPTX preserves slide order and labels speaker notes explicitly.
- Workbooks preserve sheet headings and table text.
- EPUB uses the same local JSZip dependency path as Office documents and follows the package spine order.
- TXT, Markdown, and CSV use the browser's native local file reader.

## Provenance model

A local-file source retains the file name, normalized format, byte size, last-modified time, bounded content fingerprint, extraction method, document-part count, and a local-file locator, alongside the ordinary Lumen source content hash, version, active state, and labels.

PDF pages, PowerPoint slides, workbook sheets, and EPUB sections become standalone heading boundaries before passage chunking. Evidence nodes within those boundaries carry a structured `documentPart` locator in addition to the exact stored character and line range. Replacing a file with the same name updates the existing source version and preserves its active state and labels.

The original file is not retained in the Lumen project. Citation inspection always opens the stored extracted snapshot, so it works after the original file moves or the device goes offline.

## Fail-closed rules

Lumen refuses rather than promotes partial evidence when:

- a file type is unsupported or a file exceeds 25 MB;
- a PDF page fails extraction;
- a scanned PDF lacks a usable text layer;
- an Office document is encrypted, corrupt, or produces no readable content;
- workbook conversion would truncate rows;
- an EPUB is malformed, lacks a readable spine, or expands beyond 60 MB;
- extracted text is shorter than the readable minimum or exceeds the 600,000-character source limit.

The UI reports each file independently. Successfully extracted siblings may enter the project, but a failed file contributes no source, passage, citation, or prompt content.

## Acceptance coverage

- Format routing, size limits, stable source identity, and provenance metadata.
- PDF page and PowerPoint slide locator construction.
- EPUB spine-order extraction.
- Scanned, damaged, encrypted, truncated, unsupported, oversized, too-short, and too-large refusal paths.
- Schema migration and active/label preservation across file refresh.
- React file selection, per-file status, exact passage inspection, keyboard focus, and WCAG 2.1 A/AA automation.
