# Document Builder: more room for the document

The builder now fills the application window. New view preferences start with settings closed, the ribbon collapsed, and Fit width selected; existing saved zoom and ribbon preferences are respected.

- A compact toolbar keeps Quick Access, paragraph styles, and bold/italic/underline available. The existing Home, Insert, Layout, Review, View, and Expert Workbench tools open in a bounded tray over the preview.
- Document settings open beside the document on desktop and replace the editing surface on small screens. The iframe remains mounted, preserving live edits, selection, and native undo history.
- Export groups the existing primary action, Page Designer handoff, and additional formats in one menu. Nested Escape handling restores focus without closing the builder.
- Detailed document metadata and shortcuts are available from the status bar. Fit width and Fit page are directly accessible there. Blocking preflight findings remain visible.
- Focus mode hides the toolbars, settings, navigation, and advanced review pane. Escape from the editable document dismisses tools or exits Focus mode, including when native fullscreen is unavailable.
- Clicking the document closes floating menus and ribbon tools. Panel visibility and zoom/ribbon preferences are saved on the device.

## Validation

- 121 focused unit tests passed across eight builder suites, covering accessibility contracts, draft protection, export handoff/notifications, advanced review, and existing builder behavior.
- 20 browser scenarios exercised the compiled builder across desktop, tablet, phone, light, dark, and high-contrast states. The 19-scenario run passed 18; one phone scenario timed out during browser-context cleanup. The targeted final run passed all six scenarios, including that phone scenario and a new iframe Escape/click-outside regression.
- Browser checks verified actual editing, selection restoration, undo after layout changes, image-picker access, nested export menus, saved preferences, and unchanged preview dimensions when ribbon tools open.
- Measured default preview: 1408 × 727 CSS pixels at 1440 × 900; 358 × 544 at 390 × 844. Measurements use the isolated builder fixture with sample content.
- Comparing JSX click/change/submit handlers with the original found all specialized actions retained; the two replaced handlers control settings and ribbon visibility.
- The missing-prop check reported no risks. The root and desktop/public runtime builds are byte-identical. Diff whitespace checks passed.

Evidence is in `reports/document-builder-declutter-2026-09-10/`. These are local changes; no deployment was performed. Export checks cover menu access and existing handoff behavior, not destination-application round trips.
