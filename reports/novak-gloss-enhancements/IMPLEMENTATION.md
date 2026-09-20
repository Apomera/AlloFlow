# Novak gloss enhancements — implementation

Date: 2026-09-19. Completed locally; no commit or deployment.

## What changed

- **Correct reading relationships.** Original glosses and adapted companions must match the source family, lesson, and exact captured source. Explicit comparison choices use the selected reading's own supports. Legacy linked-ID comparisons now also check family and lesson.
- **Teacher review and editing.** In the original reader or the original pane of Both, use an inline Edit button or Review word supports. Teachers can add a word or phrase, choose its exact occurrence when repeated, edit its explanation, remove it, set importance, and pin it with Always show in lighter view.
- **Durable teacher choices.** Regeneration merges suggestions into the current saved support set. Teacher wording and pins survive; removed ranges stay suppressed. A deliberate addition can restore a removed occurrence. Edits made while generation is in flight are preserved. Student-mode changes, stale source snapshots, and changed source relationships prevent late writes.
- **Useful lighter view.** Essential explanations rank first, followed by teacher-authored supports. Spacing and paragraph budgets reduce crowding; pinned explanations remain visible. Single verse line breaks do not reset paragraph budgets. Visual glosses and gloss read-aloud use the same selection.
- **Contextual generation.** Prompts emphasize contextual literary meanings, unfamiliar referents, and essential/helpful priorities. Generated suggestions cannot grant themselves teacher authorship or pinning. Gloss annotations remain separate from the unchanged source.
- **Save/load and delivery.** Cloud/session normalization, student packs, and document notes retain valid curation metadata. Removed explanations do not render in outputs. Moving the same saved reading to a different lesson preserves its own supports; a different reading cannot borrow them across lesson boundaries.

## Verification

Passing test groups overlap and should not be added as a single total:

| Area | Passing result |
| --- | --- |
| Curation, preservation, roles, generation, downstream and session regression run | 171/171 |
| Final curation contract including same-owner lesson moves | 19/19 |
| Generation quality and source-preservation suites | 40/40 |
| Reader family isolation, delivery curation, existing delivery coverage | 29/29 |
| Final legacy isolation and role UI run | 22/22 |
| Final reader, extracted host callbacks, and family isolation | 82/82 |
| Stateful Edge browser checks | 9 passed; zero runtime errors |

The browser uses production reader/contract modules with stateful fixture callbacks. It verifies inline focus, teacher editing during a pending generation, pins, removal suppression, repeated-word occurrence selection, reopening, 320px layout, and editing the original pane in Both. Source text is compared exactly after edits. AI suggestions and audio are mocked in this fixture. Production host callbacks are separately exercised for persistence, race handling, stale updates, and mode changes.

Desktop and mobile screenshots were visually inspected. Module hashes, mirror parity, and source syntax are recorded in `module-integrity.json` by `verify-integrity.cjs`. Browser evidence is in `curation-browser-results.json` and the two `teacher-gloss-editor-*.png` files.

## Macbeth acceptance and limits

See `README.md` for the reproducible evaluation harness and full scene fixtures. The local source uses Graymalkin; a clearly labeled spelling variant covers Grimalkin as named in the feedback. Acceptance checks target heath, hurlyburly, anon, and the familiar's name while preserving verse, speakers, and punctuation exactly.

The attempted live check found no configured credentials for the supported provider adapters. It made zero model calls and zero HTTP attempts. `live-evaluation.json` therefore marks all live cases not run and human review pending. Fixture and contract tests do not establish the instructional quality of future AI output.

Optional passage-linked navigation between rewritten and original paragraphs remains a later improvement. The current Original / Adapted / Both controls and optional change markings remain available.
