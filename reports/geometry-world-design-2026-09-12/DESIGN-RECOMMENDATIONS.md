# Geometry World: larger lessons and stronger environmental design

Research and source review completed September 12, 2026. This pass downloaded reference archives and prepared recommendations; it did not change production lessons or implement an importer.

## What was actually inspected

Four Minecraft Education world downloads plus a supporting ZIP are saved in `reference-worlds/`, with provenance, byte counts, SHA-256 checksums, and URLs in `references.json`. Public lesson metadata is saved in `reference-metadata/`. These two reference folders are ignored by Git and are not included in AlloFlow deployment assets.

Archive inspection verified ZIP contents, world names, and database files. These worlds were not launched in Minecraft Education, and their block databases were not decoded into maps. Lesson-flow observations below come from the official lesson descriptions, rather than a claimed in-game walkthrough.

| Reference | Download / verification | Useful design pattern |
|---|---|---|
| [Geometry World](https://education.minecraft.net/en-us/lessons/geometry-world) | 327,305 bytes; internal name `GeometryWorld` | Nine shared work areas; increasingly demanding area/perimeter assignments; compare several valid constructions. |
| [Volume World](https://education.minecraft.net/en-us/lessons/volume-world) | 102,318 bytes; official `aka.ms/VolumeWorld5` redirect; internal name `5.MD.3,4,5 Volume World` | Successive sandbox, maze, and culminating challenge stages. Students observe, construct, then apply ideas. |
| [Geometric Garden](https://education.minecraft.net/en-us/lessons/geometric-garden) | 14,682,617 bytes; internal name `Geometric Garden STUDENT` | A world supporting classroom instruction, with students documenting their creations and discoveries. |
| [Geometry — Points, Lines, Planes](https://education.minecraft.net/en-us/lessons/geometry-points-lines-planes) | Main download is 1,730,689 bytes and internally named `Geometry - Building Symmetry`. The separately listed 1,477,186-byte supporting ZIP contains `Geometry - Points Lines Planes.mcworld`. | A prescribed exploration route starting at a schoolhouse; progressively more challenging constructions. Use the supporting ZIP when investigating the titled lesson. |

The references are inspiration for original AlloFlow environments and activity design. The current Geometry World JSON importer does not translate Minecraft archives, and no Minecraft blocks, textures, or scripts were added to AlloFlow.

## Why the current lessons feel small

The source inventory in `current-lessons.json` contains 11 presets. Each has three or four listed objectives. Most ground footprints are around 25–35 blocks across; the lessons generally place a handful of example structures and NPCs in a compact area. Volume Explorer has a 29×29 ground footprint, three objectives, four NPCs, and nine question steps including follow-ups. This suits a focused activity, but provides limited travel, spatial variety, or continuity between challenges.

There is also a concrete capacity issue:

- `MAX_BLOCKS` is 1,500.
- `engine.loadLesson` fills ground first, then structures.
- `engine.fillBlocks` counts ground and structures in the same budget and truncates when it reaches the limit.
- Geometry Garden requests 57×31 = 1,767 ground blocks before any structures are added. From the source, this necessarily exceeds the loader budget.
- AI lesson validation also clamps structure coordinates and budgets against ground area. Asking the generator for a larger world cannot overcome those constraints reliably.

Verify and correct this loading-budget problem before expanding lessons. Increasing the cap alone would preserve the architecture's rendering and memory costs.

## Recommended first original expedition: Geometry Harbor

An island community needs a new waterfront learning center. A visible lighthouse anchors navigation, and a looping promenade connects distinct districts. A learner can complete one district as a short lesson or carry saved progress through the whole expedition.

| District | Activity and student evidence | Visual identity |
|---|---|---|
| Arrival quay | Place, remove, rotate, and measure a sample block; learn Home, map, and cursor release. | Open sightlines, a small practice pad, clear route signs. |
| Market gardens | Make two plots with equal area and different perimeters; explain the difference. | Terraced beds, trellises, warm stone paths. |
| Reservoir works | Fill a capacity model, predict the total, then compare a differently shaped reservoir with equal volume. | Water channels, cutaway tanks, blue-and-gold measurement markers. |
| Bridge workshop | Construct a crossing under width and material constraints; revise after testing. | A shallow ravine, scaffold frames, repairable spans. |
| Lighthouse studio | Combine prisms into a tower; identify the parts and justify the total volume. | A strong vertical landmark and sectional viewing platforms. |
| Makers' pavilion | Design the final learning center, explain dimensions, choose a scale, and send the student's model to Showcase/Print Lab. | A spacious, well-lit construction plot and exhibition stands. |

This is a proposed original design, not an existing feature. Start with the quay, gardens, and reservoir as one complete vertical slice; add the remaining districts once progression and performance are verified.

## Changes with the greatest impact

1. **Separate scenery from instructional geometry.** Render terrain and distant architecture with efficient meshes and suitable collision handling. Keep mathematically meaningful solids and student blocks addressable, measurable, and editable. Explicitly exclude scenery from STL and editable student-build exports. Validate ground placement, collision, raycasting, and measurement after the separation.
2. **Add persistent expedition stages.** Save each district's objectives, student constructions, evidence, and checkpoints. Zone transitions must not call the current destructive `loadLesson` path without preserving work. Define stable IDs for zones, tasks, and student projects.
3. **Evaluate building actions.** Check plot area, capacity, dimensions, or connectivity directly from a defined student build region. Offer explanatory feedback and several valid solutions. Use deterministic geometry checks for correctness; AI NPCs can discuss strategy and explanations through the already selected Gemini/Kokoro speech pathway.
4. **Make navigation part of the world.** Use a landmark visible from several districts, labeled junctions, matching icons and colors, an accessible list of destinations, and an optional route guide. Provide return-to-checkpoint/fast travel, captions, and paths that do not require jumping or precise mouse control.
5. **Create visible consequences.** A completed challenge can restore a garden, illuminate the lighthouse, or open a route. Always keep a teacher-controlled skip/review path so progression cannot strand a learner.
6. **Build a strong environmental palette.** Combine foreground vegetation, middle-distance architecture, and a distant skyline. Use changes in elevation, framed views through arches, restrained contact shadows, softer distance fog, and distinctive materials per district. Preserve contrast around measurement targets; keep decorative animation subtle and optional.

## Implementation order and acceptance

First reproduce the Garden truncation in real WebGL and add a regression that requires every declared teaching structure to exist. Redesign the ground budget without losing buildable floor targets or protected-lesson behavior. Reserve sufficient capacity for students to build.

Next implement saved zone/task state and a compact three-district Harbor prototype. Verify a complete observe → build → measure → explain → revise sequence, with a visible world change at completion. Keep existing quick lessons available alongside the new expedition.

Then profile frame time, draw calls, memory, load time, and travel transitions on a modest device before increasing the visible area. Use chunked or instanced scenery where measurements justify it, and limit active distant effects. Do not equate archive download size with geometric complexity or performance.

Finally verify keyboard/touch access, saved progress after re-entry, backward-compatible imports, no lost constructions during travel, correct measurements, and a Print Lab round trip containing only the selected student project. The expedition is successful when the world is larger in purpose and exploration while remaining easy to navigate and mathematically dependable.
