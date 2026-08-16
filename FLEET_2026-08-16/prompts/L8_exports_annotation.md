You are **Lane 8** of an eleven-agent fleet working on AlloFlow, in
`C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated` on branch `main`.

**Before anything else, read `FLEET_2026-08-16/RULES.md` in full.** It is your operating
manual: architecture, shared-tree safety, the hot-file lock, verification, and your report
format. Your lane ID is **L8**. Then read `FLEET_2026-08-16/PLAN.md` section 3 for context.

## Your mission: exports, annotation, and Document Builder

Three related surfaces where output quality and direct manipulation are falling short.

## Files you own

- `view_export_preview_source.jsx` (builder `node _build_view_export_preview_module.js`)
- `annotation_suite_source.jsx` (builder `node _build_annotation_suite_module.js`)
- `doc_pipeline_source.jsx` (builder `node _build_doc_pipeline_module.js`)
- `export_handlers_module.js` — **plain JS, no source pair, edit directly**
- `doc_builder_renderer` and `annotation_inquiry_bridge.js`

Under lock (see RULES section 3): `AlloFlowANTI.txt`, `ui_strings.js`.

**Off-limits:** `view_pdf_audit_source.jsx` and its modules. Another session is actively
editing them right now. If your work genuinely requires a change there, file it into
`CROSS_LANE_REQUESTS.md` and move on.

Note that `doc_pipeline` has a history in this repo of being edited in its compiled form and
having the change wiped. Edit the source. Also note that `view_*` export renderers have been
hand-mirrored in the past, so check whether a change needs to land in more than one place, and
that HTML export has a watcher-compiled source: edit the source, not the compiled output.

## Scope

**E1 — Large text size clips content in export.** Increasing text size in the HTML or PDF
export cuts text off, and Aaron saw it in the glossary specifically. Find whether the clipping
is a fixed-height container, an overflow that is hidden rather than allowed to reflow, or a
page-break calculation that assumes a base font size. Glossary layouts in exports are often
built as fixed grids or columns, which is exactly the structure that clips when type grows.
The fix should make the layout reflow rather than capping the font size. Check the other
exported sections too, since the glossary is where he noticed it, not necessarily the only
place it happens. Related known trap in this codebase: a card given `aspect-ratio` and
`min-height` without `max-width` sized itself from its height and overflowed its column.

**E2 — Text size control shape.** Currently a button. Aaron wonders about a slider like the
app UI uses, and is explicitly open to keeping the button if you think that is better. Decide.
A stepped control that guarantees every step still lays out correctly is defensible, and is
arguably the better answer once E1 is fixed; an unconstrained slider invites the clipping back.
Whichever you pick, say why in your report.

**E3 — Font options in HTML export.** The HTML export offers far fewer fonts than the app.
Aaron does not know why and suspects there is no good reason. Find out whether the restriction
is deliberate. Likely constraints are fonts that must be embedded or web-loaded and would
break offline or no-egress use. Widen the list to everything that can be honestly supported in
a standalone HTML file, and if some app fonts genuinely cannot travel, say which and why. This
is an accessibility issue, since the dyslexia-friendly and high-legibility faces are exactly
the ones users need in a handout.

**E4 — "Worksheet" versus "Save / Print PDF".** Aaron cannot tell what the difference is
between these two Document Builder export options, and says "maybe there is a difference and I
just am not getting it, but you might need to explain that to me." So: first determine what
each actually does, in code. Then either differentiate them so the distinction is obvious from
the UI, or, if they genuinely overlap, collapse them. Put the plain-language explanation in
your report, because Aaron asked for it directly, and put a short version into the UI so the
next person does not have to ask. If they are meaningfully different, the labels are the
problem.

**E5 — The "Mind" annotation tool does nothing.** Aaron clicks it and nothing happens, and
notes that as the creator of it he is sure nobody else knows what it means either. Determine
whether it is broken or merely unlabeled. Either way the name has to change to something
self-evident, the way Highlight is self-evident. He also wants **freehand Draw** added, which
exists elsewhere in the app and which he considers a nice touch that annotation is missing.

**E6 — Annotations do not anchor to the resource.** This is the important one in your lane.
Annotations float on top of the viewport instead of belonging to the document: they do not move
when the user scrolls, and they are not part of the resource. Aaron: "otherwise, why are you
really annotating?" Required behavior: an annotation is positioned relative to the resource
content, scrolls with it, and persists as part of that resource. That means storing positions
in document coordinates rather than viewport coordinates, and re-projecting on scroll, zoom,
and text-size change. This affects every annotation type including highlight and draw, not just
the one Aaron happened to notice. Check how annotations are persisted before changing the
coordinate model, since existing saved annotations may need migrating, and say in your report
what happens to annotations saved under the old model.

**E7 — Expert Workbench missing from Document Builder.** The Expert Workbench exists in the
remediation panel, and the intent was to give Document Builder a comparable advanced-editing
surface with something closer to parity with Adobe Acrobat. Aaron sees nothing there and does
not know whether it was never built, was built and does not surface, or needs a button he did
not find. Determine which, then act: if the mount exists but is unreachable, wire it up; if it
was never built for Document Builder, assess how much of the remediation implementation is
reusable and either surface it or write up what building it would take. Verify reachability by
grepping for the registration, not by assuming the component's existence means it is mounted;
this codebase has repeatedly had components that exist but are never reached.

## Notes

- Every claim about export layout must come from actually generating an export and looking at
  it. Do not infer layout from CSS.
- Verify with `npm run verify:gate` and targeted vitest. ~98 tests were red before you started.
- No em dashes in user-facing text. New strings go through `ui_strings.js` under lock; list the
  new keys in your report for Lane 5.
- Write `FLEET_2026-08-16/reports/L8_report.md` as you go, per RULES section 6.
