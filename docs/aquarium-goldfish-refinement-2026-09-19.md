# Common goldfish anatomy refinement

This pass refines the existing goldfish stock entry as a representative orange common goldfish. It does not add a new species or change husbandry parameters.

## Visible changes

The model now has a long-based dorsal fin, a short posterior anal fin, paired pelvic fins and broader pectorals. Its single caudal fin has fuller lobes and an open central fork. The body narrows toward the tail while retaining the existing normalized length. Subtle overlapping scale arcs are painted into the existing body texture, with no per-scale meshes. Gill-cover seams follow the body surface; the small terminal mouth has a lip and dark opening, without barbels.

The two pectorals stroke symmetrically, as do the two pelvic fins, using a smaller amplitude and a phase offset for the pelvic pair. These are illustrative motion cues; fluid forces and fin-ray biomechanics are not simulated. Pausing or enabling reduced motion freezes the pose.

The identification note distinguishes this common single-tail form from fancy domestic forms. Scale and ray markings illustrate surface detail rather than an exact meristic count or an individual specimen.

## Morphology references

- [USGS / NOAA Great Lakes goldfish profile](https://nas.er.usgs.gov/queries/GreatLakes/FactSheet.aspx?Species_ID=508): elongated stocky body and long dorsal fin. The search excerpt was available; direct access returned HTTP 403.
- [Fisheries and Oceans Canada goldfish identification sheet](https://publications.gc.ca/collections/collection_2019/mpo-dfo/Fs94-184-4-eng.pdf): long-based dorsal, broadly forked caudal, short-based anal, paired pelvic and pectoral fins. The indexed excerpt was available; the full PDF exceeded the browser fetch size limit.
- [NOAA-hosted Great Lakes identification guide](https://repository.library.noaa.gov/view/noaa/41958/noaa_41958_DS1.pdf): small terminal mouth and absent barbels in the indexed goldfish description.

## Verification

The dedicated real-Three geometry tests cover all three quality settings, fin layout, a raycast through the open tail fork and both lobes, body taper, paired motion, pause, reduced motion, retained geometry, resource disposal, and containment across long, tall and cube vessels at three volumes. Those rendering bounds checks are not stocking recommendations.

Adjacent species, dimensions, surface and renderer tests accompany the new suite. Real WebGL captures use the active catalog and simulation bridge. The visual review includes the previous profile, refined profile and upper view. Exact test counts, source hashes, browser results and desktop mirror parity are recorded in .codex-artifacts/species-v18/delivery-validation.json.
