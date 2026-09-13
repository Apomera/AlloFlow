# Build-aware lessons and reflection portfolios

Implemented in the canonical Geometry World core and builder modules, with parent-managed desktop mirror synchronization.

## Learner experience

The existing Activities guide now includes **Test, revise, and keep the evidence**. Learners intentionally select their activity creation using **Select aimed build**, or use the outlined selection they already chose. **Check my build** reports the actual measurement against the activity's explicit numeric target. It refreshes the connected student selection before evaluating, so attached additions and removed pieces are reflected. It never substitutes the whole world or an unrelated aimed build when a selection is absent.

**Save before snapshot** and **Save after snapshot** retain full selected geometry and show isometric illustrations with material colors, fractional shapes, rotations, and actual dimensions. Existing written reflections and self-review marks remain beside this evidence. Saving and checking leave blocks, undo history, NPC answers, and question scores unchanged. Saved checks are explicitly dated; students must run another check after changes.

**Download journal** exports JSON schema `alloflow-geometry-journal/2`, including before/after block geometry, numeric checks, reflection, and review marks. **Download portfolio** exports an offline HTML document with embedded SVG illustrations and reflections. HTML text is escaped, snapshot facts are recalculated from geometry, and neither export uses an external service.

## Explicit numeric goals

Optional activity `buildGoal` fields support:

- `metric`: `blockCount`, `occupiedVolume`, `footprintArea`, `width`, `depth`, or `height`.
- `comparator`: `eq`, `gte`, or `lte`.
- `target`: a positive finite numeric target, bounded to 1,500.
- `unitCubesOnly`: an optional boolean, used when a task asks for full cubes.

Example: `{"metric":"occupiedVolume","comparator":"eq","target":24,"unitCubesOnly":true}`.

Unknown fields, unsupported metrics, invalid comparators, strings instead of numbers, nonrepresentable exact quantities, and exact fractional targets requiring full cubes are rejected. Fractional minimum/maximum comparisons remain valid. Generation plans and final lessons validate these fields, and subsequent generation passes must preserve each planned goal. The prompt explicitly distinguishes numeric facts from design judgments and forbids invented automatic grading of beauty, layout, connectivity, location, interior air volume, perimeter, or explanations.

Six existing student-building activities have appropriate original targets: Area's layered prism (24 cubic units), Composite's stepped design (50 cubic units), and Harbor's arrival cargo (6 cubes), garden revision (24 square units of footprint), reservoir fill (24 cubes), and makers project (24 cubic units). Observation-only tasks retain written self-review.

## Measurement and persistence boundaries

- Protected teaching models and ground are excluded, including contradictory protected metadata.
- Exact occupied volume uses the supported cube, diagonal half, slab half, and quarter volumes. Physical height accounts for half-height slabs and quarter wedges.
- Footprint measures the union of occupied X/Z cells. All four currently supported shapes have complete square bases; holes between cells are not counted.
- A snapshot is limited to 1,500 selected blocks. Journals collectively hold at most 6,000 saved snapshot blocks and 30 lesson entries. Budget failures do not partially write data; clearing old snapshots frees capacity without clearing reflections.
- Existing lesson journal identities are preserved when optional numeric goal guidance is added, retaining prior notes and review marks.
- World changes reset transient notices and selection context. Saved evidence remains associated with its lesson.
- Numeric checks report one stated constraint; they do not establish that every other task criterion is satisfied.

## Verification

Final focused run: **104 tests passed across 6 files**, including **46 new journal/build-goal tests**. Report: [activity-journal-final-tests.json](activity-journal-final-tests.json).

Coverage includes generated-plan/final-goal validation and preservation, six metric types, exact fractional measurements, comparator behavior, protected/incomplete/missing selection refusal, refreshed connected additions, negative coordinates and rotated illustrations, nonmutation of geometry/history/scores, atomic persistence limits, before/after JSON roundtrips, existing journal identity, escaped offline export, and actual mounted selection/check/capture/revision/re-check/reopen/clear/download flows. Existing activity navigation, tracking, generated-lesson collision, depth, and request-scope tests also pass.

Parent integration owns real-browser visual verification, final mirror verification, and any deployment decisions. No paid generation calls, external uploads, or deployment were performed by this subtask.
