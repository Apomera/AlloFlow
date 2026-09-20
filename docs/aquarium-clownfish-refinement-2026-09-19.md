# Clownfish visual refinement

The existing clownfish entry now uses a representative orange Amphiprion ocellaris form. Its profile explains that other clownfish species and captive color strains differ; proportions, ray detail and swimming strokes remain illustrative.

## Model changes

A connected dorsal fin with a notch replaces the generic triangle. The model gains an anal fin, paired pelvic fins, rounded pectorals, gill-cover lines and a small terminal mouth. The tail has a rounded trailing edge. Dark fin margins are surface pigment on both faces rather than raised stripe meshes. The middle white body band bulges forward and continues onto the dorsal membrane; the three bands have finer dark outlines.

Paired pectorals move in mirrored strokes with a restrained tail sweep. Existing pause, reduced-motion and tank-resizing behavior is preserved. This pass changes visual anatomy and identification text, without changing stocking, chemistry, reproduction or other simulation rules.

## Primary references

- [Florida Museum: Clown Anemonefish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/clown-anemonefish/): rounded caudal fin, three narrowly outlined bands, forward bulge in the middle band, and rounded black-edged fins.
- [Museums Victoria / Fishes of Australia: Amphiprion ocellaris](https://fishesofaustralia.net.au/home/species/1275): species identification, photographs and distinction from Amphiprion percula. The model does not reproduce diagnostic spine or ray counts.

## Validation

Real Three geometry tests cover complete fin anatomy at three quality levels, the connected dorsal notch, rounded tail, two-sided fin and body pigment, paired motion, paused and reduced-motion poses, full-body bounds during tank resizing, and resource disposal. Tank-volume samples are renderer checks, not stocking advice. Regression tests retain the preceding tang refinement and check species profiles, dimensions, lifecycle and surface rendering.

WebGL captures use the active catalog and simulation bridge at desktop and mobile widths. A frame-based check verifies paired-fin movement, mirrored strokes, restrained tail motion, held pause and stable geometry. Exact final results and source hashes are in .codex-artifacts/species-v22/delivery-validation.json.
