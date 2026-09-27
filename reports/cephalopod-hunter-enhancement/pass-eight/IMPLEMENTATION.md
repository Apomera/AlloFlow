# Cephalopod Hunter: eighth enhancement pass

Work log (2026-09-27): COMPLETE. Root owns canonical Cephalopod source, its three exact desktop mirrors, focused reef tests and this report folder. Shared handoff, host loaders and unrelated work remain with their owners. No deployment or new ocean tool is requested.

The user authorized continued enhancement and requested development advice on extending Hunter into an ocean/reef simulator versus a separate tool built from shared code.

## Reef appearance and placement

The reef now contains three procedural growth forms: stout finger colonies, open antler branches, and broad crowns with upright branchlets. Rounded growth tips replace the previous pointed taper. Each colony remains one indexed mesh with its existing material, tint and camouflage metadata; no textures, external assets, or per-frame coral deformation were added. These are illustrative growth forms, not species identification models.

The scripted opening previously placed its first ten colonies inside or beneath the nearby rocks. `createCLReefFootprint` measures actual geometry vertices after rotation and scale. `findCLReefSite` uses those footprints to find deterministic clear sites beside rocks and already settled colonies, preserving the opening and sandy mission route. A bounded local search and wider fallback return no site if the area is fully occupied; that rare case retains the pooled resources, hides the colony, and excludes it from camouflage substrate detection until settlement succeeds.

Settlement runs after initial placement and whenever rocks or colonies recycle. A moved rock can also displace a surviving colony, so the whole small coral pool is checked in stable order. Newly recycled colonies stay inside the existing 55–95 scene-unit ring. Each colony's lowest rotated vertex sets its ground offset, and recycled scenery receives its new terrain height before rendering that frame.

The geometry and placement helpers make no random draws. Existing initial construction draws and each ordinary recycle candidate's draw count are preserved. This does **not** promise identical random-call timing over an entire future dive: relocated colonies can cross recycling boundaries at different times. Terrain grounding continues to use the existing analytic height field; the rendered terrain is a sampled mesh.

## Resource cost and evidence

The three forms use 675–972 vertices and 984–1,320 triangles per colony. Across the 18-colony pool this increases coral vertices from 9,315 to 14,148 and triangles from 12,888 to 19,968, while retaining one static mesh per colony. No frame-rate improvement is claimed.

Six captured views were inspected: desktop reef exploration, desktop inspection, phone inspection, and one close-up of each growth form. Normal movement and inspection produced the reef views. Detail captures only moved the paused camera and hid overlays; world geometry, placement, actors, materials and lighting were not altered. Capture errors were empty. See `visual-review.cjs` and the PNGs in this folder.

Fifty-four construction cases (18 colony indices at three heights) passed finite-buffer, normal, index, determinism, anchor, size, radius, triangle-budget and disposal checks. Six new placement unit tests and four existing canvas/focus contracts passed on the final source.

Nine browser scenarios passed on their first runs, with one worker and zero retries: four reef cases, three existing visual-polish cases, and two existing mission/rock-cover cases. These cover growth-form construction/disposal, initial clearance, exact first-recycle-frame grounding, retained resources and camouflage metadata, relocation of surviving colonies obstructed by a moved rock, desktop/phone inspection, low/balanced rendering, caustic attachment and pause behavior, mission completion, and predator cover/ink. Clearance checks use conservative XZ bounds of actual transformed vertices, not triangle-triangle collision. Terrain-ray grounding is checked in flat far-water terrain; initial geometry checks its lowest vertex against the configured offset.

Syntax and scoped whitespace checks passed. All four runtime copies have SHA-256 `28e86803cb57809f7d2b0c6b099a961c56e957f400e781fc787a1c95f8d8756a`. The scoped source review found no actionable issue with placement, pooled inactive colonies, recycling timing, ownership or inspection visibility. See [validation-summary.json](validation-summary.json) for exact results. Raw local runner logs and JSON are retained but ignored; the summary and six final captures are committed evidence.

## Reuse direction

The recommendation in [OCEAN_REUSE.md](OCEAN_REUSE.md) is to keep Hunter focused, extract one unchanged visual recipe at a time, and develop a separate bounded reef experience using those shared components. The existing meadow helpers provide a local precedent. Hunter's recycling, prey respawn and compressed depth scale are game policies rather than ecological models. A future reef tool should own persistent model state, units, scenario rules and saves, and can reuse the existing Aquarium tool's investigation patterns after reviewing its assumptions.

No shared ocean module, new tool, loader, registry entry, ecological model, or save migration was introduced in this pass.
