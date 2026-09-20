# Native goal compatibility — 2026-09-19

The MCP text-draft service now supports the same seven directions goal kinds as the native app: manual, XP, game, visited, responded, completed, and time. Previously it rejected four valid native kinds while accepting game goals attached to resources that could not report the requested completion.

## What changed

- `visited`, `responded`, `completed`, and `time` goals require a resolvable resource reference. Time observations also need a finite duration of at least one minute.
- A game goal must name a game supported by its destination. For example, crossword belongs to a glossary; it cannot be attached to a reading. An outline goal must match the outline's actual `structureType`, including the native default when no structure type is supplied.
- `completed` is supported for quizzes. Within the draft service's supported types, `responded` is supported for math and sentence frames. Opening a resource, recording time, and manual self-checks follow the native universal capabilities.
- Legacy unbound game goals remain accepted when at least one resource in the pack offers that game. An invented game or a game unavailable anywhere in the pack is rejected.
- Updated authoring guidance identifies the supported kinds and required fields. Time labels should describe observed engagement; goals remain formative guides and do not block activity access.
- The root and desktop public service modules are synchronized.

The service's 12 resource-type text-draft boundary is unchanged. This work does not make it a lossless editing or image-generation endpoint.

## Keeping the contracts aligned

The headless validator carries the host's capability registry with clearly marked boundaries. A regression test compares that registry exactly against the current native definitions, catching removed as well as added capabilities.

Behavioral tests call the real host helper to obtain every goal offered for each supported resource type, compose/export the resulting pack, and pass its directions through the real host normalizer. They also check all 13 outline game mappings and reject incompatible kinds, missing resources, unsupported game names, and invalid time values.

This preserves valid existing behavior instead of simply tightening validation with a separate guessed list. The host UI and completion evaluator were not changed.

## Existing packs

The current catalog passed the expanded validation with no changes needed to its content or artwork: 105 files, 737 quiz questions, 114 math problems, and 385 goals. Existing game goals point to compatible glossary resources. This is structural/capability validation, not proof of factual accuracy or pedagogical suitability.

## Verification and artifacts

All 105 checks passed across the five affected suites: native goal compatibility, MCP formatting, resource-pack service, generation completeness, and native quiz contracts. The exact host-registry comparison passed, as did the full-catalog audit and module mirror/whitespace checks.

The broader run also executed two existing native directions suites: 52 checks passed and six source-code assertions failed. These assert old composer/excerpt locations in the monolithic host, an old evaluator call count, an SVG attribute order, and a broad no-gating text pattern. They inspect host/UI source files rather than the changed MCP service. Those host/UI files and the two native suites were not edited in this pass; their assertion updates remain separate work. Overall broader-run totals: 157 passed, six failed across seven suites. Do not treat that run as fully green.


- `tests/allopack_goal_compatibility.test.js`: native capability parity, goal normalization, export preservation, and rejection cases.
- `dev-tools/verify_allopack_answers_and_references_20260919.cjs`: full-catalog audit using the current service.
- `scratch/goal-compatibility-tests.log`: regression results.
- `goal-compatibility-validation.json`: current-catalog and test summary.

All work remains local. No pack publication, commit, or deployment occurred. The live community library was not modified or tested during this pass.
