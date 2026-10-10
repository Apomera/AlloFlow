# Heat transfer actor clarity

The live heat diagram now states **Heat enters water** or **Heat leaves water**. Both participants have explicit **Gives heat** and **Receives heat** roles. Actor cards, readable labels, and a distinct receiving border make the direction easier to interpret at a glance.

The existing actor order, arrow geometry, direction attributes, accessible group labels, authored energy explanations and no-latent explanation remain intact. Reversing the two reviewed presentation slices restores the preceding groundwater-workspace runtime byte for byte. No simulation models, routes, scoring callbacks, state schemas or notebook writing changed.

## Verification

- 84 passing regression tests across the new heat actor suite, matter/energy, groundwater lens and groundwater workspace.
- 395 passing native browser checks, with eight captures covering desktop/mobile, light/dark/contrast/forced colors and 150% CSS zoom.
- The existing preview served the accepted source. Both runtime copies were pinned before and after tests. Owned QA browser contexts and its server closed.
- The browser checks include whole-word actor labels and a constrained 400px container; arrow orientation and actor alignment switch together at 440px.

## Evidence

- [Desktop heat release](12132650ea1f-2026-10-06T01-28-48-043Z/release-1280-light.png)
- [Narrow heat absorption](12132650ea1f-2026-10-06T01-28-48-043Z/absorption-320-light.png)
- [Enlarged text](12132650ea1f-2026-10-06T01-28-48-043Z/release-390-zoom150.png)
- [Browser results](12132650ea1f-2026-10-06T01-28-48-043Z/results.json)
- [Regression receipt](unit-receipt.json)
- [Presentation slices](presentation-changes.json)

Run `node reports/watercycle-heat-actor-clarity/verify.cjs` from the repository to check frozen evidence and current inputs. Use `--snapshot-only` after later enhancements to verify the archived result. The preceding groundwater report supplies the frozen baseline and remains unchanged.

All changes remain uncommitted.
