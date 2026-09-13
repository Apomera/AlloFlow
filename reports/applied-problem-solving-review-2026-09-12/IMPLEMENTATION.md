# Applied Problem Solving implementation

Latest refinement: [second pass and validation](PASS2.md).

Implemented September 12, 2026 in the local workspace. The original [design review](README.md) remains the record of the starting point; its old screenshots and measurements are historical.

## What changed

- **Five stages:** Understand → Explore → Build → Check → Reflect. The learner starts in one-stage focus mode, can show all steps, and reaches an explicit response review. Stage navigation moves keyboard focus to the relevant writing field. Reading controls, references, detailed checks, and extra prompts open when needed.
- **A meaningful quick version:** Compact scope retains a short check and a keep-or-revise explanation. Keeping a direction is valid when the evidence supports it. Progress counts learner writing or an explicitly accepted question; an untouched template question does not earn progress, and a deliberately cleared question stays blank.
- **Evidence and criteria:** Learners link evidence rows to particular lesson facts. Stable fact and criterion identities survive reordering; changed requirements require a new rating while retaining the earlier note. A linked reviewed fact is distinguished from verification of the learner's claim.
- **Feedback continuity:** Edits retain earlier AI feedback with a clear outdated label. Existing guards continue to discard responses for a different resource or a draft that changed while AI was responding. Local checks and revision remain usable without AI.
- **Teacher setup:** Learning target, available time, materials, focused source excerpt, framing ownership, starting support, scope, and organizer preference feed generation. The teacher can edit the brief, source connections, starters, prompts, and parallel example. Multiline list editing preserves newlines while typing.
- **Generation:** A stronger required-content check covers the situation, product, criteria, constraints, lesson facts, and framing support. An incomplete result receives one repair attempt, then an actionable error. Generated learner fields stay empty. Source excerpts and locators are available for teacher review; factual accuracy still requires that review.
- **Visual support and expression:** Family-specific evidence organizers include a comparison overview on wider screens. Optional illustrations can be uploaded or generated, cropped with the shared image editor, described, and approved. Learners see an illustration only after approval and a description. Students can attach a safe web link to a diagram, model, presentation, or other work with a written explanation.
- **Exports:** Student task, My response, Teacher review, and Paper organizer presets use the shared export model. Task and paper copies omit learner drafts, feedback, and artifact links. Response copies include the learner's work and evidence connections; teacher review adds feedback and criteria context. Raw teacher source text is excluded. Existing full exports retain reviewed illustrations, source connections, and artifact links. Export exclusion settings, font size, paper size, and orientation are honored by the dedicated previews.

## Validation

83 focused tests passed across the component, interaction, generation, print, export-model, and shared-response suites. Coverage includes malformed/incomplete generation, one-attempt repair, isolated batch settings, stale AI responses, criterion re-review, restored artifact links, safe URLs, private-field exclusion, and legacy/full-export compatibility.

The app shell was rebuilt. The host and affected JSX sources compile, and six root/public module mirrors are synchronized.

Chromium checks used the actual built component and shared response boundary with an authored garden scenario and mocked AI. The tested learner, compact, evidence, check, and teacher states had no axe violations and no horizontal overflow. This is automated accessibility evidence, not a conformance claim.

| Viewport | Document width | First writing field | Visible writing fields initially |
| --- | --- | --- | --- |
| 1280px | 1280px | 829px | 1 |
| 390px | 390px | 1160px | 1 |
| 320px | 320px | 1379px | 1 |

The 390px first-field position fell from 4,586px to 1,160px (about 75% less scrolling); desktop fell from 2,537px to 829px. These measurements include the fixture's shared workspace controls and authored content; generated tasks vary in length.

Browser scenarios completed the five-stage flow, linked a source fact and external artifact, requested mocked feedback, revised with earlier feedback retained, and reviewed the response. Teacher checks exercised multiline criteria editing and the generated-illustration approval gate. Structured student responses remained separate from the teacher template. New text export content was checked for task/response separation and private-source exclusion.

## Try it

Open [the updated component preview](current-preview.html). It uses authored sample content and mocked AI. Append ?teacher for authoring, ?compact&offline for the quick version without AI, or ?family=design for another family. The deployed application has not been changed.

Screenshots: [desktop](implemented-1280.png), [phone](implemented-390.png), [small phone](implemented-320.png), [check and revise](implemented-check-390.png), [teacher authoring](implemented-teacher-390.png).

Sample print views: [student task](implemented-export-task.html), [response](implemented-export-response.html), [teacher review](implemented-export-teacher.html), [paper organizer](implemented-export-paper.html).

## Remaining validation before a wider release

Live provider quality/latency, real screen-reader use, classroom usability and learning outcomes, and cloud/live-room delivery were not exercised in this local pass. New UI strings have English fallbacks; translations and long translated labels need review. Image generation was mocked, so no claims are made about generated illustration quality. Browser printing and final PDF pagination can vary by delivery environment.
