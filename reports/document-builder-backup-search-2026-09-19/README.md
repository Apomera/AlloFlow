# Document Builder backup restoration and tool search

Implemented locally on 2026-09-19. The main toolbar and document preview retain their existing dimensions.

## What changed

- **Open HTML backup** is available in Review → Version History and through Find a tool. HTML files up to 20 MB receive a read-only preview before the user chooses Restore backup. Cancel and Escape preserve the current document and return focus to the opener. Preview links stay inside the preview flow.
- The latest current document is preserved before replacement. Version History offers **Undo backup restore** and **Download previous document**. If local storage fails, the session copy remains available with an explicit reminder to download it before closing the builder.
- Restored documents reuse the full editor initialization, including editing, image controls and keyboard shortcuts. Save feedback retains the distinction between persistent storage and session-only recovery.
- **Find a tool** recognizes terms such as picture, photos, typeface and colour, handles common plurals, and ranks exact labels first. Unavailable tools remain keyboard discoverable with requirement explanations; selecting them does not run their action. A live catalog updates when a control's availability changes.

## Import boundaries

Imports use the project's vendored DOMPurify asset and fail closed when it cannot be loaded. Active scripts, embeds, forms, external stylesheet links and resource-bearing CSS are excluded. Static HTML, supported SVG/MathML, image descriptions, comments, citation records and supported tracked revisions are retained. Deferred revision HTML and attributes are sanitized as well as the visible document. A restrictive document policy also limits active content after restoration.

The preview blocks linked images; they may load after restoration. This is a document backup, not an offline asset package or a complete project import. Review history from a different file does not replace the application's saved project metadata. The modal describes the relevant import limitations before replacement.

## Validation

- **117 focused unit checks passed** across backup restoration, tool discovery, draft protection, builder refinements and image crop behavior. The two final fidelity checks cover static SVG/MathML and tracked citation records. See `unit-tests-final.json`.
- **31 distinct Chromium scenarios passed across the full run and recheck**, covering desktop/tablet/phone layouts, light/dark/contrast themes, preserved live edits and undo, exports, keyboard focus, search and backup recovery. The 31-case run passed 30 cases and hit one browser-context teardown timeout. That unchanged keyboard case and all six new workflows passed in the subsequent seven-case run (`browser-recheck/.last-run.json`).
- The final preview link-containment change is checked by the desktop and phone restore-and-undo cases in `browser-preview-final`.
- New recovery scenarios verify that preview/cancel do not change live content, a restore checkpoint contains the latest edits, restored documents remain editable, malicious scripts/handlers are absent, quota failures retain a downloadable previous document, invalid files leave the current document untouched, and nested Escape returns focus without closing the builder.
- Reviewed phone backup-preview and unavailable-tool captures. Screenshots and synthetic downloaded backup evidence are saved alongside this report.
- Canonical build and JavaScript syntax checks passed; root and `desktop/web-app/public` generated modules match. Final digest is recorded in `module-integrity.json`. Scoped whitespace checks passed.

Initial unit verification exposed an older test expecting every successful restore to report durable recovery, and a crop test pointing at the host handler's former location. The tests now assert the actual capture result and the existing extracted host handler. Initial browser restore tests omitted closing the intentionally open Version History tray before clicking the document; the tests now follow that normal dismissal step.

## Delivery

Only the builder source, its root/public generated pair, focused tests and this report were changed in this pass. No live AI calls, push, deployment or installer build occurred. The shared source files retain concurrent uncommitted work; this pass remains uncommitted to preserve that ownership. Task-start snapshots are retained under `.tmp/builder-backup-search-2026-09-19` for integration. Existing desktop package outputs were not rebuilt.
