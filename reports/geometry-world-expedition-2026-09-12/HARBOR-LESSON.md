# Geometry Harbor lesson specification

Original AlloFlow content prepared September 12, 2026. No Minecraft assets, maps, or dialogue are incorporated. The lesson uses the existing fill/NPC/question schema, plus six activity records for the parent's mission-trail UI.

## Deliverables

- `geometry-harbor.json`: complete original lesson fixture.
- `build-harbor-fixture.cjs`: regenerates the fixture and runs coordinate, teaching-component, capacity, and walkability assertions.
- `harbor-layout-evidence.json`: exact cell counts, teaching dimensions, build domains, and results.
- `apply-harbor-preset.cjs`: previews a patch by default; `--apply` installs it in the canonical core before authored question rotation, adds it to the lesson sequence, and adds its static Settings option. It does not synchronize mirrors.

## World and capacity

The harbor occupies a 55 by 43 ground footprint: x = -27 through 27 and z = -21 through 21. Ground contains 2,365 cells and must use the new batched-ground implementation. The 412 flat floor palette cells have `measurementLayer: "ground"` and must retain ground collision, protection, targeting, and measurement semantics. There are 308 unique above-ground teaching/scenery blocks across 61 fill records total. The 1,500-block construction budget therefore leaves at least 1,192 cells for student work.

A two-block-wide level stone promenade forms a connected loop. Arrival quay, market gardens, and reservoir works each have a distinct material palette. A hollow lighthouse is the principal skyline marker; trellis, planted borders, small trees, benches, and an open pavilion provide secondary landmarks. Decorative scenery is separated from the teaching models to keep their measured components correct.

## Sequence and mathematical evidence

| Stop | Actual model / task | Checked result |
|---|---|---|
| Arrival quay | Cyan 3 by 2 by 1 sample; build six cubes and rearrange to 6 by 1 by 1 | Volume 6 in both arrangements |
| Garden area | Gold 6 by 4 by 1 model; study its planting surface | Surface area 24 square units, 24 plants at one per tile |
| Garden perimeter | Cyan 8 by 3 by 1 model; compare to gold; student revises to 12 by 2 | Both reference areas 24; perimeters 22 and 20; student revision perimeter 28 |
| Reservoir fill | Empty interior x = 8..11, z = -7..-5, y = 1..2 | 12 cubes per layer, 24-cube capacity; front is open |
| Equal capacity | Separate cyan 6 by 2 by 2 and gold 4 by 3 by 2 solids | Each volume 24; each base area 12; height 2 |
| Makers pavilion | Student creates and revises a connected 24-cube room model | 3 by 4 by 2 and 2 by 3 by 4 are valid examples |

The six objectives align exactly with the six question-bearing NPCs. One additional welcome NPC explains routes and basic controls. The authored questions have 19 total steps. The existing deterministic question rotation will vary correct-answer placement after installation.

Activity fields are `id`, `title`, `npcName`, `position`, `challenge`, `hint`, `successCriteria`, and `reflection`. All arrival positions use eye height 2.2 on clear ground. All NPCs stand at y = 1 on reachable ground. Grid flood-fill checks prove there is a walking route from spawn to every NPC and activity arrival without jumping or flying.

## Honest progression

The NPC questions assess mathematical reasoning. Builds are self-reviewed through activity checklists and measurements; there are no claims of automatic geometry grading, scripted unlocks, or automatically saved student-block checkpoints. The objective title and NPC order are aligned with the current engine. The parent owns making the new activity trail navigable and persistent.

The world description suggests 45 minutes or a pause after a district. This is a suggested teaching pace, not a timer or enforced duration. All block counting uses unit cubes. Dialogue explicitly distinguishes a model's one-cube thickness from the two-dimensional garden planting surface.

## Validation scope

`node reports/geometry-world-expedition-2026-09-12/build-harbor-fixture.cjs` passed its geometry and layout assertions with 308 above-ground blocks, 412 floor-overlay cells, 19 question steps, and six aligned activity/NPC pairs. The patch script validates the resulting JavaScript syntax in preview mode. A real WebGL pass must still verify the integrated ground overlay implementation, labels, activity navigation, render composition, construction capacity, and responsive presentation.
