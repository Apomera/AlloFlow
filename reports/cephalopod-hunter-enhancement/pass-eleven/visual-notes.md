# Pass eleven: model eye surfaces

The model priority comes from the pass-ten cuttlefish, bobtail, Dumbo and vampire inspection captures: their flattened gold or blue eye layers and fixed white highlights still read as attached buttons after the fin improvements. The pupil color was also supplied as an sRGB hexadecimal value without the linear conversion already used for the iris, contributing to its pale blue appearance under the renderer's output conversion.

## Bounded implementation

The guarded `apply-eyes.cjs` script changes only those four species inside `createCLHuntAnimal`. It creates a curved muted iris, a dark domed pupil and an integrated skin socket. A narrow upper skin fold replaces each painted white dot. The `cl-eye-highlight` name remains as a compatibility group containing `cl-eye-lid`. Exact affected mesh names are `cl-eye-rim`, `cl-iris`, `cl-pupil`, the former `cl-eye-highlight`, and the new `cl-eye-lid`.

Cuttlefish receives a fixed light-adapted W-shaped aperture. Bobtail and Dumbo retain their existing horizontal pupil silhouette, and vampire retains its existing rounded silhouette. Those retained shapes are not newly claimed as a complete account of pupil biology. No pupil dilation, blinking, gaze behavior, flashing, emissive highlight, external texture or random variation is added. All eye geometry is static. Humboldt and all other animals keep their existing branch.

The pupil uses correctly converted dark color and a restrained view-dependent water reflection, with no clock uniform. Its distinct shader cache key is `cl-swimmer-pupil-water-v11`. The guarded check applies the hook to the actual bundled Three r128 physical fragment source and verifies its inserted code; root's browser checks establish GPU compilation and final appearance.

## Anatomy sources and limits

[Mäthger, Hanlon, Håkansson and Nilsson (2013)](https://www.sciencedirect.com/science/article/pii/S0042698913000539) directly examined live *Sepia officinalis* eyes across illumination levels and viewing angles. It documents the W-shaped pupil in bright light and a circular pupil in darkness. The model represents the former, rather than simulating adaptation to the scene's lighting.

[Young's vampire squid account](https://tolweb.org/Vampyroteuthis_infernalis) provides external-eye reference photographs and describes the circular eyelid. [Young's Grimpoteuthis account](https://tolweb.org/Grimpoteuthis/20104) supplies genus-level eye/body morphology and specimen illustrations; it also makes clear that the genus includes considerable variation. These references guide integration of the eye into the head, not an assertion of measured socket dimensions or a change to the retained pupil categories.

Eye surface colors, iris fibers and water reflection are restrained illustrative choices. No reference image is bundled. The body, arm, fin, feeding, movement and eye-label contracts remain outside this change.

## Cost and pure geometry verification

The existing pair of eyes uses eight sphere meshes with 3,400 vertices and 5,760 indexed triangles. The replacement keeps eight meshes and eight eye draw calls, with 2,040 vertices and 3,408 triangles: 1,360 fewer vertices and 2,352 fewer triangles per affected animal. Two shared iris/pupil materials replace the old iris/pupil plus two separate white-highlight materials; the lids reuse the existing skin material. No per-frame eye buffer allocation or update is introduced.

The guarded check passed syntax, exact branch matching, zero rig RNG, unchanged mesh count, finite unit normals and outward winding for 5,672 nondegenerate iris/pupil triangles across all four animals. The W aperture uses a grid following its outline, avoiding the inverted cells that can result from warping a radial fan. It also confirmed exact protected geometry during eight representative update states for each affected animal and Humboldt, common octopus and nautilus.

The owned `tests/cephalopodlab_eye_surfaces.test.js` checks the extracted production rig: bilateral symmetry, lid clearance, aperture containment within the actual iris boundary, pupil seating above actual rendered iris triangles, W/retained pupil silhouettes, material color and bundled shader hook, fixed static resources, and pre-change non-eye/protected-species hashes. Its initial seven cases passed after integration, and root's encompassing 121-unit run also passed. Root's four water/eye browser cases passed, including actual shader compilation and disposal.

## Capture review and cuttlefish placement correction

Reviewed the four final desktop model captures and the cuttlefish/vampire phone captures. The curved muted irises, dark pupils and skin folds remove the previous pale button appearance without adding oversized white highlights. The bobtail, Dumbo and vampire captures expose no corrective visual issue. The cuttlefish view reveals a real placement problem: the mantle and moving front skirt intersect the rear part of its aperture. At the captured inspection angle, CPU ray checks found 55 of 231 sampled pupil vertices hidden by the mantle or fin, and 45 within the mantle ellipsoid. This is actual geometry overlap, rather than only a misleading silhouette.

The separate guarded `refine-cuttle-eye-placement.cjs` translates only the cuttlefish eye/socket/lid meshes forward by 0.100 times animal scale and upward by 0.050 times scale. Body, head, fin, arm and material geometry remain unchanged. A check-only run passed the exact guard, syntax and 1,386 pupil samples across both eyes at three normal fin phases: no mantle/head/fin occlusions and no pupil points inside the mantle. At least 35.5% of socket vertices remain embedded in the head, preserving visible attachment. Other species remain exact. This is the smallest tested forward/up combination that cleared all sampled phases; it is not a claim that every arbitrary inspection angle must show both eyes.

An eighth production-rig unit checks those sampled phases and mirrored inspection views, plus pupil clearance and socket embedding. Root applied the correction and synchronized all four runtime copies. The final eight eye cases and seven body-geometry cases passed in the recovery run after an earlier fork-worker startup timeout; the nine fin cases also passed in that earlier run. This timeout is retained in the validation record rather than counted as a clean run.

Root accepted the updated cuttlefish desktop, phone and closer oblique inspection captures. The entire W aperture is visible, the socket remains attached to the head, and the front skirt passes behind the eye. Final capture output has no browser errors. The closer image was regenerated after an interrupted preview session left an invalid artifact; the fresh server and complete capture rerun succeeded. These views establish the intended appearance at ordinary inspection angles, not visibility from every possible viewpoint.
