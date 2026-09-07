# Roomier map and shared-patch exploration

The RTS landscape now has a larger illustrative footprint, wider nest spacing, and a taller viewport. The ground is 1.3 times wider and 1.35 times deeper (75.5% more diagram area), while the nest symbols retain their size. The default desktop map reaches 620px tall, up from 440px; the narrow-screen map is 360px tall.

**Expand map** uses the browser's fullscreen view without replacing the canvas. The exit button and Escape close it, keyboard focus stays within the expanded panel, and focus returns to the expand button afterward. Unsupported or denied fullscreen requests produce an announcement; the larger regular map and zoom controls remain usable.

The shared BayViewer now observes changes to its container size as well as window resizing. This fixes a stretched image and stale camera projection when entering fullscreen or resizing a panel. The observer disconnects on teardown and ignores callbacks for retired viewer instances.

## Patch explorer

- Select any of six patches using the labeled selector or by clicking its flowers or ground target.
- Show both colonies, your colony, or the neighboring colony. The same filter applies to routes and moving bees.
- Focus the selected patch with the camera, or restore the whole landscape and both colonies in one action.
- A ring marks the selected patch. Solid and dashed routes retain their colony identities.
- The readout counts the diagram routes actually displayed and explains when an overlay setting or the game's winter calendar hides them.
- View choices persist without changing colony resources, game time, or the RTS advantage score. Invalid saved choices fall back to the whole landscape and both colonies.

The map remains schematic: larger spacing is a visual-layout change, not a claim about measured nest separation or African habitat dimensions. Shared access and the source-linked science notes from the spatial-science review are preserved.

## Verification

All 403 Bee regression tests passed across the full suite and an isolated accessibility rerun. The full run passed 400 tests; three accessibility checks encountered timeouts and an overlapping Axe run. All 54 tests in the affected accessibility file passed when run independently. The new scene tests verify shared endpoints, route/bee filtering, pick identities, stale-save normalization, fixed game state, and the enlarged terrain.

Seven distinct browser scenarios passed across combined and focused runs: six RTS scenarios and the existing Beekeeper 3D hive startup scenario. They cover desktop and 320px framing, dark mode, existing game commands and construction, real pointer picking, fullscreen sizing and camera aspect, keyboard containment, Escape and focus restoration, canvas reuse, science notes, and accessibility checks. The fullscreen test exposed and verified the shared viewer's container-resize fix. Desktop, mobile, patch-focus and expanded-map screenshots were inspected.

Web and desktop copies of both `stem_tool_beehive.js` and `stem_lab_module.js` are identical. Whitespace checks passed. Changes are local; no deployment was performed.

Preview: `scratch/beehive-rts/expanded-shared-map.png` and `scratch/beehive-rts/patch-c-neighbor.png`.

Results: `scratch/bee-roomy-full-vitest.json`, `scratch/bee-roomy-a11y-rerun.json`, `scratch/bee-roomy-browser.log`, `scratch/bee-roomy-resize-final.log`, and `scratch/bee-roomy-hive-regression.log`.
