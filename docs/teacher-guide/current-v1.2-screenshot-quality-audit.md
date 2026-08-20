# AlloFlow v1.2 screenshot quality audit

**Audit date:** August 20, 2026
**Capture surface:** signed-in Gemini Canvas at 1536 × 902
**Source:** synthetic third-grade water-cycle lesson; no student data or PII
**Screenshot index:** [current-v1.2 resources](assets/live-screenshots/current-v1.2-resources/README.md)

## Outcome

All 49 PNG files were reviewed individually. The 22 resource panels and Universal Image Style example now have clean live-browser recaptures without the floating AlloBot, red diagnostics badge, or transient toast covering instructional controls. No screenshot was retouched, inpainted, or reconstructed.

The remaining publication risk is concentrated in legacy **result** screenshots. Their generated content is often valid, but several still contain the old assistant overlay, one has the wrong viewport, and the three incomplete workflows do not yet show a finished artifact.

Quality labels used below:

- **Ready:** suitable for the educator manual now.
- **Usable:** content is legible; clean recapture preferred for a strict visual atlas.
- **Replace:** do not use in the main atlas until recaptured.
- **Diagnostic:** troubleshooting evidence only.

## File-by-file review

| File | Quality | Findings and action |
|---|---|---|
| `00-universal-settings.png` | Ready | Live recapture shows the effective Universal Image Style and inheritance note with no assistant, error badge, or toast. |
| `01-analyze-panel.png` | Ready | Analyze controls are visible and unobstructed. |
| `01-analyze-result.png` | Ready | Clean paired view: Analyze controls on the left and grounded source analysis on the right. |
| `02-glossary-panel.png` | Ready | Full Glossary generation panel is clear. |
| `02-glossary-result.png` | Replace | Generated glossary exists, but the legacy assistant overlaps the left side and the result framing does not emphasize the term cards strongly enough. |
| `03-text-adaptation-panel.png` | Ready | Generation controls are clean; use only to explain setup. |
| `03-text-adaptation-result.png` | Diagnostic | Resource shell loaded without the adapted passage. |
| `03-text-adaptation-error.png` | Diagnostic | Authentication-category error evidence. |
| `03-text-adaptation-stalled-retry.png` | Diagnostic | Retry remained on “Adapting text complexity…”. |
| `04-word-sounds-panel.png` | Ready | Clean manual-source view with Rain, Cloud, and Sun selected; no toast blocks the modal. |
| `04-word-sounds-setup.png` | Ready | Clean session settings plus populated lesson preview. A finished activity result is still missing. |
| `05-visual-organizer-panel.png` | Ready | Reframed to include the title, organizer type, custom instructions, and Generate action. |
| `05-visual-organizer-result.png` | Replace | Venn organizer is valid, but a large legacy assistant overlay affects the left side. |
| `06-anchor-chart-panel.png` | Ready | Anchor Chart controls are unobstructed. |
| `06-anchor-chart-result.png` | Replace | Result content is valid; legacy assistant overlay remains. |
| `07-lesson-images-panel.png` | Ready | Visual-support controls are clear. |
| `07-lesson-images-result.png` | Usable | Two-panel image is clear and demonstrates inherited style; minor legacy chrome remains. |
| `08-faq-panel.png` | Ready | Reframed so the FAQ title, question count, instructions, and Generate action are visible. |
| `08-faq-result.png` | Usable | FAQ content is legible; refresh preferred to remove legacy overlay/chrome. |
| `09-writing-scaffolds-panel.png` | Ready | Scaffold type and Generate Frames action are clear. |
| `09-writing-scaffolds-result.png` | Usable | Result is legible; minor assistant remnant on the left. |
| `10-note-taking-panel.png` | Ready | Cornell Notes selection and Generate action are clear. |
| `10-note-taking-result.png` | Usable | Result is legible; minor legacy overlay/chrome remains. |
| `11-activity-ideas-panel.png` | Ready | Activity tabs, instructions, and Generate action are clear. |
| `11-activity-ideas-result.png` | Replace | Large assistant bubble obstructs the left panel. |
| `12-interview-mode-panel.png` | Ready | Explicit candidate instructions and Free Response Mode are visible. |
| `12-interview-mode-blank-candidates.png` | Diagnostic | Candidate cards are blank/missing; do not use as a successful example. |
| `13-sequence-builder-panel.png` | Ready | Sequence topic, count, ordering mode, visuals option, and Generate action are clear. |
| `13-sequence-builder-result.png` | Usable | Seven-step sequence is legible; clean recapture preferred. |
| `14-concept-sort-panel.png` | Ready | Reframed around the title and the category, item-count, and card-visual controls. |
| `14-concept-sort-result.png` | Replace | Generated sort is valid, but the assistant overlay materially affects the capture. |
| `15-dbq-panel.png` | Ready | Reframed to show the title, DBQ description, analysis modes, packet contents, and Generate action. |
| `15-dbq-result.png` | Replace | Generated DBQ is valid; large assistant overlay remains. |
| `16-steam-lab-panel.png` | Ready | Reframed to show STEAM Lab, subject, output mode, Math Studio, and core settings. |
| `16-steam-lab-water-cycle-result.png` | Replace | Large assistant speech bubble covers important Water Cycle activity UI. |
| `17-adventure-mode-panel.png` | Ready | Reframed around title, interaction mode, difficulty, language, and student-response options. |
| `17-adventure-mode-result.png` | Replace | App content occupies only a roughly 1024 × 600 region inside the full 1536 × 902 capture, leaving excessive white space and inconsistent framing. |
| `18-assess-panel.png` | Ready | Reframed around assessment purpose, recommended preset, question customization, reflection, and scoring. |
| `18-assess-result.png` | Replace | Large assistant bubble covers purpose/recommendation guidance. |
| `19-standards-udl-alignment-panel.png` | Ready | Clean guided-audit context with the generated Curriculum Audit visible. |
| `19-standards-udl-alignment-panel-standard-added.png` | Diagnostic | Older blocked-state evidence; the right side shows an unrelated resource and is misleading as a success example. |
| `19-standards-udl-alignment-result.png` | Ready | Clean generated Standard Audit with score, critical issues, standards evidence, UDL evidence, and suggested fixes. |
| `20-lesson-plan-panel.png` | Ready | Lesson Plan controls and Generate action are unobstructed. |
| `20-lesson-plan-result.png` | Usable | Lesson plan is legible; minor legacy overlay/chrome remains. |
| `21-assignment-directions-panel.png` | Ready | Clean Assignment Directions modal with title, directions, due date, goals, auto-check, drafting, and Add to pack. |
| `21-assignment-directions-result.png` | Usable | Draft result is clear; old diagnostics chrome remains at the edge. |
| `21-assignment-directions-resource-view.png` | Usable | Student resource view is legible; minor assistant remnant remains. |
| `22-preview-package-deliver-panel.png` | Ready | Clean delivery-route capture; document, web/accessibility, LMS, sharing, and resource-specific choices are visible. |
| `22-preview-package-deliver-result.png` | Ready | Clean Document Builder capture with formats, accessibility tools, appearance controls, and live preview. |

## Publication queue

### Use now

- All 22 clean panel/setup captures.
- `01-analyze-result.png`.
- `19-standards-udl-alignment-result.png`.
- `22-preview-package-deliver-result.png`.
- The Word Sounds setup pair as a setup example, clearly labeled as not yet a finished student activity.

### Recapture first

Prioritize results where the overlay covers meaningful controls or the viewport is wrong:

1. STEAM Lab.
2. Assess.
3. Adventure Mode.
4. Concept Sort.
5. DBQ.
6. Activity Ideas.
7. Glossary, Visual Organizer, and Anchor Chart.

The remaining usable result screenshots can follow in a second cleanup pass.

### Keep only in troubleshooting

- Text Adaptation error, blank shell, and stalled retry.
- Interview Mode blank candidates.
- The older Standards/UDL “standard added” blocked-state capture.

## Capture rules for the next pass

1. Wait for every toast and progress overlay to disappear.
2. Confirm the floating assistant and diagnostics badge are hidden.
3. Keep 1536 × 902 and capture the full browser viewport.
4. Frame the resource title plus the controls that materially change the result.
5. Confirm the right side shows the matching artifact, not a stale prior resource.
6. Reject empty shells, unfinished spinners, clipped dialogs, and large blank regions from the main atlas.
7. Preserve an untouched original; make crops only as derived callout copies.
