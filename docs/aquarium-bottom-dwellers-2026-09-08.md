# Aquarium bottom-dweller refinement — September 8, 2026

This pass refines four existing catalog entries: Corydoras, Otocinclus, Plecostomus, and Nerite Snail. It does not add new simulation taxa.

## What changed

- Corydoras now has an arched dorsal contour, flatter ventral surface, shorter broad head and tapered caudal region. Its two flank armor rows are suggested through subtle surface pigment instead of raised black rods.
- Otocinclus and Plecostomus have separate contoured body profiles, broader anterior bodies, narrower rear bodies and flatter undersides. The Otocinclus lateral stripe and pleco mottling remain on the continuous skin surface. Paired pelvic fins and visible underside oral discs improve their close-up anatomy.
- Nerite Snail has a broad foot and short head beneath a low domed shell, fine paired tentacles, and short ocular stalks beside their bases. Its striped shell has fine growth variation in one surface texture. The formerly upright spiral tube and eyes at the tentacle tips are removed.
- Deformed surface normals are joined at coincident UV seam and pole vertices to avoid visible lighting seams. Shell textures follow the existing renderer disposal lifecycle and quality settings.

These are representative group models at illustrative display scales. Catalog names, chemistry, stocking limits, plant sizing and simulation time retain their existing contracts. No exact age, sex, individual shell pattern, plate count or calibrated animal length is implied. Loricariid armor divisions are a visual suggestion; the catalog does not identify an exact species. The shell pattern is a representative striped form, not an identification of Neritina pulligera.

## Morphology references

- [Tencatt, Santos & Britto, Neotropical Ichthyology (2020)](https://www.ni.bio.br/1982-0224-2020-0088/): Callichthyidae flank armor has two longitudinal plate series. Individual Corydoras species and snout shapes vary; this model remains a short-snouted catalog representative.
- [Florida Museum: Suckermouth Catfish](https://www.floridamuseum.ufl.edu/discover-fish/florida-fishes-gallery/suckermouth-catfish/): museum reference for the arched suckermouth catfish body, large dorsal fin and suctorial mouth. Exact fin-ray counts are not transferred to the broad catalog group.
- [Lehmann (2006), Otocinclus batmani description](https://www.scielo.br/j/ni/a/y9KmyJjs3q7jVY4PXZD6TtQ/?lang=en): supporting reference for the flat underside of the head and abdomen. This does not identify the catalog fish as O. batmani or copy that species' diagnostic tail marking.
- [Australian Freshwater Molluscs: Neritina pulligera](https://keys.lucidcentral.org/keys/v3/freshwater_molluscs/key/australian_freshwater_molluscs/Media/Html/entities/neritina_pulligera.htm): genus-level neritid description of a low spire, cap-like to globular shell, narrow cephalic tentacles and eyes on short stalks beside them. The source's species-specific size, black shell and orange aperture are not attributed to the generic aquarium nerite.

## Validation

63 targeted checks across 7 suites pass. These cover real Three geometry and raycasting, body dimensions, profile identity, surfaces, quality changes, disposal, environment and viewport behavior. The initial run exceeded the 30-second allowance on three tests; their unchanged assertions passed when rerun with a 90-second allowance.

Real WebGL checks pass for all four top-view specimens, both underside sucker-mouth views, and the 390-pixel mobile aquarium. The mobile check exercises three plant zero/regrow/quality rebuild cycles, focus loss/restoration, unchanged time/stock/chemistry, GPU geometry and material cleanup on unmount, and remount behavior. No browser errors were reported.

Both distributed aquarium copies have SHA-256 `cefb2665712cef74019b767058233ebf13ec89485ea4b6442b64e0860b75aa0e`. Detailed evidence: `.codex-artifacts/species-v6/delivery-validation.json`. The compact preview is `.codex-artifacts/species-v6/species-gallery.html`.
