# Water Worlds: follow water through a patch

The ground inspector's existing **What happens next?** section now contains a visual pathway explorer. It stays collapsed until opened and replaces the previous list of three transfers.

## Learning and interaction

- Four buttons focus on surface flow, infiltration, delayed storage, or water returning to the air. These concurrent processes use a common three-store diagram showing water now and after the next 15 model seconds.
- Transfers are computed by the same numerical solver as the simulation. The preview uses the current or inspected water and rainfall without advancing time or changing saved observations.
- Surface-route buttons follow actual incoming or outgoing connections to another cell. The inspector stays open, focus moves to its persistent heading, and the new location is announced. The valley outlet has no destination-cell button.
- Small positive transfers receive a less-than label rather than displaying as exactly zero. Dry and full-soil states include explanations.
- The optional cell balance accounts for rain, surface transfers, delayed-water exchanges, and losses to air. Internal infiltration and soil drainage cancel from the cell total.
- Copy distinguishes local storage from pooled delayed release, and specifies that depths describe water spread over a cell. No geographic underground route is implied.

## Implementation

`K.cellBudget(world, rain, selected)` returns the selected cell's before/after stores, nine transfer totals, incoming/outgoing routes, and conservation balance from one actual solver step. Trace data now separates surface evaporation and soil/plant loss while retaining the original combined evaporation field. The physical equations and existing saved-state format are unchanged. Source and desktop files are synchronized.

## Validation

- All **68 model tests** passed, including 13 new budget tests for exact solver agreement, stream pooling, dry/saturated conditions, routing, input handling, and immutability. See `model-tests.json`.
- All **11 new browser workflow groups** passed, with no browser exceptions. See `browser-results.json`.
- All **nine new accessibility audits** passed across light, dark, and high-contrast themes at desktop, 390px, and 320px widths.
- All **22 existing storm workflows** and **12 notebook workflows** passed.
- Desktop soil/delayed-water panels and the 320px dark panel were visually reviewed. Syntax, source/desktop parity, and focused whitespace checks passed.

Run the new browser checks with `node dev-tools/water_worlds_pathways_qa.cjs`. Run all model tests with `node node_modules/vitest/vitest.mjs run tests/water_worlds --maxWorkers=1 --pool=threads --testTimeout=30000`.

The checks use the isolated local preview at `http://127.0.0.1:8768/`.
