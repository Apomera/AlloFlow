# First Response Lab — hand alignment

## What changed

The two rescuer hands previously pointed in opposite directions. Their heels were centered on the same point, but their palms extended to opposite sides of the chest. That made the pose look like two separate rescuers approaching from opposite sides.

The revised model:

- Points both hands in the same direction, with the thumbs on opposite sides.
- Places both wrists behind the fingers on the same side of the mannequin.
- Separates the wrists and gently spreads the arms while keeping each wrist, elbow, and shoulder on one straight axis.
- Repositions the wrist bridges so they connect to the wrists without passing through the other hand or arm.
- Aligns the sleeves with the arm axes.
- Sets the upper hand height against the modeled lower hand surface, keeping the heels aligned over the chest contact point.

The child one-hand/two-hand control and infant one-hand arrangement retain their existing behavior. The prior depth graph enhancement remains in place.

## Geometry checks

Measurements use model coordinates; they are not clinical measurements. These checks were made against the candidate geometry used for integration.

| Check | Result |
| --- | --- |
| Original finger direction difference | 180° |
| Revised finger directions | Aligned, with opposite thumb sides |
| Upper hand height offset | 0.078 |
| Smallest sampled upper-heel/lower-hand gap | 0.000242 |
| Independent footprint-grid minimum gap | 0.000507, across 1,184 contact samples per age |
| Upper hand vertices inside the lower wrist or arm | None found in the sampled geometry |
| Wrist endpoint in its bridge | Inside; normalized radius 0.987 |
| Adult arm tilt from vertical | About 8.08° and 8.89°; straight at each elbow |
| Adult minimum forearm cross-section separation | About 0.0634 |
| Child minimum forearm cross-section separation | About 0.0556 |

The support audit includes upper-heel vertices and triangle centers, plus an independent grid through the actual rendered surfaces. Separate checks inspect wrist/arm overlap and arm cross sections.

## Validation

- **175 unit cases passed:** hand alignment (12), rescuer arm contours (13), depth explorer (115), and hand inspection (35).
- **Three native Chromium workflows passed:** adult views, child/infant arrangements, and 320px interaction/contrast. Together they recorded 22 poses with actual rendered mesh bounds, contact, surface normals, camera state and geometry fingerprints.
- Browser checks cover compression/release, child one-to-two-hand camera refitting, graph/keyboard controls, saved inquiry and progress, text spacing, forced colors, app contrast, accessibility, browser errors and renderer cleanup.
- Reviewed the adult, child, infant and phone captures. Both hands share a direction, wrists connect separately, and the wider views keep straight arm axes. The lower heel remains on the moving chest.
- Canonical/public source bytes match. The source outside the rescuer-hand rig matches the starting snapshot exactly, preserving the previous graph enhancement and patient/recovery work.

### Captures

- [Adult close-up](desktop/adult-contact.png), [arms](desktop/adult-arms.png), [overhead](desktop/adult-overhead.png)
- [Child two-hand close-up](desktop/child-two-contact.png), [infant close-up](desktop/infant-contact.png)
- [320px close-up](phone-contact.png), [app contrast](phone-contact-app-contrast.png)
- [Structured validation](validation.json), [desktop pose measurements](desktop/hand-metrics.json), [phone pose measurements](hand-metrics.json)

### Diagnostic history

The first browser attempt exposed a probe bug: digit groups were treated as meshes. The corrected probe traverses actual visible mesh surfaces and includes nails. The initial combined desktop workflow later hit its seven-minute budget; splitting it into two focused workflows preserved all assertions and completed successfully. The first hand-inspection suite had one adult recovery timeout; that case passed in isolation and the full 35-case suite then passed. Original logs and browser diagnostics are retained.

### Clinical references

The placement review used the [AHA 2025 Adult Basic Life Support guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support), [Red Cross hands-only CPR guidance](https://www.redcross.org/get-help/how-to-prepare-for-emergencies/hands-only-cpr.html), and [Red Cross CPR steps](https://www.redcross.org/take-a-class/cpr/performing-cpr/cpr-steps). This pass changes the illustration; it does not change the clinical teaching text or thresholds.

## Limits

The raised fingers remain parallel rather than geometrically interlaced. The model illustrates placement and movement; it does not measure hand pressure or replace supervised practice. The numerical checks establish the sampled geometry's alignment, contact, and clearance.

## Change handling

Prior uncommitted graph work and unrelated agents' changes were preserved. This enhancement remains **uncommitted and unstaged**: no staging, commit, push, or deployment was requested or performed for this pass.
