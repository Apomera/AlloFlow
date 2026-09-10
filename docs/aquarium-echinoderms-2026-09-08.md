# Aquarium sea-star and urchin refinement — September 8, 2026

This pass refines the existing Sea Star, Sunflower Star and Sea Urchin catalog entries.

## What changed

- Sea stars have a closed, rounded body with separately shaded upper and lower surfaces. The ordinary sea-star profile retains five arms; the sunflower-star profile retains its representative twenty-arm form and a broader central disc. Fine pigment variation and small upper-surface granules replace the flat polygon and raised arm rods.
- Both stars show pale oral surfaces, radial grooves, a ventral mouth and paired rows of representative tube feet with terminal pads. The central disc is smoother than the arm valleys.
- The urchin has a rounded test with subtle fivefold color bands, tapered spines extending around its sides, and representative tube feet between the spines. Its mouth sits on the lower surface.
- Repeated feet, pads, granules and spines are merged into a few meshes. Detailed anatomy does not require one draw call per feature. Quality settings change surface resolution and feature density while preserving profile identity and display scale.
- Existing movement remains the model's illustrative crawl. No new feeding, gait, adhesion or water-vascular-system simulation is introduced.

## References and scope

- [NOAA: Are starfish really fish?](https://oceanservice.noaa.gov/facts/starfish.html): sea stars are echinoderms; arm counts vary, and tube feet support their movement.
- [Monterey Bay Aquarium: Sunflower star](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/sunflower-star): many-armed sunflower-star form and extensive tube feet. The catalog's twenty arms are a representative adult count, not a claim that every animal has twenty.
- [Port of Seattle: What Lies Beneath](https://www.portseattle.org/blog/what-lies-beneath): sunflower stars can have 16–24 arms, with tube feet lining the arms.
- [Sunflower Star Laboratory gallery](https://www.sunflowerstarlab.org/gallery): reference views of upper surfaces, raised arms, the underside and tube feet.
- [Aquarium of the Pacific: Red Sea Urchin](https://www.aquariumofpacific.org/onlinelearningcenter/species/red_sea_urchin/): spines and tube feet act around the test; the mouth is on the lower side. This is a structural reference, not a reassignment of the generic catalog urchin to a red-urchin species.

These are representative visual models, not calibrated anatomy or scientific scans. Rendered tube feet, granules and spines are sampled details whose counts vary with quality. Exact ossicle structure, microscopic papulae, pedicellariae and species-specific spine measurements are not reconstructed. Normalized display sizes and current simulation rules retain their existing meaning.

## Validation

53 targeted checks across 7 suites pass. The six new checks verify solid upper/lower surface orientation, tube-foot placement, batched feature counts, lower-side spine coverage, visible ventral mouths, quality scaling and resource ownership. Existing profile, species sizing, renderer, environment, shrimp and bottom-dweller checks also pass.

Real WebGL previews pass for all three models from above at 390 pixels and from below at desktop width. Both sets of images were visually reviewed, with no browser errors. Upper surfaces, lower surfaces and mouth geometry are present; the bodies fit the existing tank-sizing checks.

Both app copies match SHA-256 `e8acd89cba14e6687ede6d8aeda943e4232786c053c3ddd35d87beee43898e51`. Evidence: `.codex-artifacts/species-v8/delivery-validation.json`. Upper/underside gallery: `.codex-artifacts/species-v8/species-gallery.html`.
