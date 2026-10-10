# First Response Lab — contact exploration

## Improvements

- **Heel side view:** a low side close-up reveals the relationship between the lower heel, chest and upper hand. It fits the complete hand movement bounds and compensates for the shared viewer's camera offset. The camera stays fixed through a push and retains its actual view direction when age, child hand choice, depth range or viewport changes.
- **Clear resting-height marks:** two fixed side segments replace the bar that crossed the compressed fingers. The gap follows the actual torso and complete rescuer rig, including the hidden upper hand, so it stays clear when the child hand arrangement changes. The reference height, markers, ruler and graph retain their existing meaning.
- **Observation support:** learners compare both close-ups before opening “Check your observation.” The explanation follows the displayed one-hand or two-hand arrangement. It explicitly describes compressions, matching the coach's separate breathing sequence.
- **Matching visual key:** the resting-height legend now uses a split symbol and calls the reference “side marks.”

The new view and observation check preserve learner answers, saved A/B comparisons, recovery progress and compression settings. The controls retain the existing availability rules for placement, hidden hands and viewer status.

## Verification

**199 unit cases passed** across contact exploration (25), reference clearance (12), hand inspection (35), hand alignment (12) and depth exploration (115).

**Two native Chromium workflows passed**, recording 11 rendered poses. Checks cover adult, child one/two-hand and infant views; actual mesh framing and heel contact; fixed reference height; compression and camera stability; age/hand/depth/resize refits; 320px keyboard use; observation disclosure; graph/inquiry preservation; contrast; accessibility; browser errors and renderer cleanup.

Visual review confirmed a readable heel-side profile and an unobstructed compressed stack. The hand rig, contact-bounds calculations, compression motion and interactive depth graph match the starting snapshot byte-for-byte. The contact proxy now exposes stable numeric metadata for camera refitting. Canonical and public runtime files match each other.

### Captures

- [Adult heel-side release](adult-heel-side-release.png)
- [Compressed adult stack, with the reference clear of the hands](adult-oblique-contact-compression.png)
- [Child compression](child-heel-side-compression.png) and [infant compression](infant-heel-side-compression.png)
- [320px side view](phone-heel-side-320.png) and [app contrast](phone-heel-side-app-contrast.png)
- [Validation](validation.json), [rendered pose measurements](contact-metrics.json), [guide measurements](guide-metrics.json)

The initial native run exposed clipped phone hands and direction drift during refits. The compensated camera fit resolves both with the original strict assertions. Initial browser failures, camera-fixture corrections and a depth-worker startup failure are retained in diagnostic logs. Final unit runs used separate forked processes.

## Scope and delivery

The contact explanation is consistent with the [AHA adult basic life support guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-basic-life-support). Clinical thresholds and treatment sequences are unchanged. The model remains an illustration of position and motion, with raised parallel fingers and no pressure measurement.

Prior uncommitted hand-alignment and graph enhancements, along with unrelated agents' work, were preserved. **Uncommitted and unstaged; no push or deployment.**
