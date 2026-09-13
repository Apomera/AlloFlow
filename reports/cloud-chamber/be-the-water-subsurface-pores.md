# Be the Water: soil and groundwater pore spaces

Added a close-up illustration to the active soil and groundwater pathway cards. Soil shows air and water sharing spaces around solid grains; groundwater shows water filling the spaces around those grains. Text explains the distinction and identifies gray as rock and blue as water.

The 3D cutaway now uses a shared granular pore-space texture for the water-table cross-section and aquifer bed, replacing flat color. The repeating grain pattern keeps its proportions when the groundwater route stretches toward a distant spring. Existing 3D grains, flow tracers, and the highlighted parcel remain in place.

These are static teaching illustrations, not measured porosity, fluid dynamics, or a new groundwater model. The close-up represents a porous-grain example; actual groundwater can also occupy rock fractures. Simulation timings, phase changes, and pathway rules remain unchanged.

## Validation

- Final experience and kernel regression suite: 116 passed; one existing climate server-render test reached its explicit 30-second limit. The exact same render assertions passed in a temporary diagnostic with a 180-second deadline. The original test and its deadline remain unchanged.
- `dev-tools/watercycle_pilot_subsurface_pores_qa.cjs` passed distinct soil/groundwater labels, a shared solid-and-water texture, route-stretch compensation, both camera views, paused/reduced-motion behavior, actual soil-to-groundwater transition, mobile and forced-color layouts, accessibility, and single disposal of the shared texture. No observed page or WebGL errors.
- Visual captures in `scratch/water-subsurface-pores-review/` include soil and aquifer cutaways, Water views, and mobile close-ups.
- Canonical source and desktop mirror are synchronized.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.

The temporary diagnostic test was removed after passing. Its reproducible setup remains in `scratch/check-pore-render-timeout.cjs`, and its result is saved in `pilot-subsurface-pore-render-diagnostic.json`. Final JavaScript syntax and source-mirror checks passed; the local preview returned HTTP 200.
