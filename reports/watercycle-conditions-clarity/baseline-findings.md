# Explore Conditions baseline clarity audit

Frozen runtime SHA-256: `d43969e8c5824b6f2b94b2b7e29b51ef33a24833495059c79cad6e9551951061`.

The audit used the actual frozen Water Cycle runtime in an owned ephemeral localhost server and isolated Chromium. It captured light mode at 320, 390, and 1280px, plus dark and dark with forced colors at 320px. No learner tabs, preview port, runtime/test files, or Git state were changed.

## Prioritized opportunities

1. **Explain Land inputs where learners choose them.** Rainfall intensity and soil saturation appear as bare `55` and `45`, with no visible 0–100 endpoints or nearby explanation. Their screen-reader value text includes the scale. Soil permeability is only Low/Medium/High, while slope and land cover choices have no local definition of their modeled meaning. Show `/100` next to the current values, honest index endpoints, and brief input definitions. Preserve the existing model and independent score meanings.
2. **Separate the touch target from the slider track, and name the reset scope.** Climate ranges are 34px high and the colored track fills that height; Land ranges are 36px. Neither reaches 44px. The Climate Reset target is 28px high and Land Reset 40px at all measured widths. Both visible buttons say Reset, although their actions correctly restore only their own lab. Use 44px native range targets with a thinner track and a clear thumb; label resets Climate/Land and retain visible keyboard focus. At 320px the selected Medium/Moderate checkmarks also wrap above the label, making those segment rows 57px rather than 44px at 390/1280.
3. **Make the two Land results visually distinguish their pathways.** Current result cards differ primarily by wording and a narrow colored edge. A fixed decorative depiction of water moving over the surface versus entering soil pore spaces can reinforce the difference, especially before learners understand the vocabulary. Keep the diagrams separate from score magnitudes: these are independent teaching indices, not measured percentages or complementary shares. Baseline values are runoff 47/100 and infiltration 55/100.
4. **Reveal preset scope across both labs.** Heavy storm, chosen inside Climate Lab, changes all 8 climate/land inputs. Land stays folded and its summary remains Compare runoff and infiltration. The experiment focus mentions land conditions, and the comparison below provides evidence, but the chooser itself gives no direct scope cue. A short weather-and-land scope note would improve discoverability without moving or automatically opening the lab.

## Evidence and preservation

- Phone baseline: [Land 320](land-default-light-320.png), [Climate 320](climate-default-light-320.png).
- Desktop baseline: [Land 1280](land-default-light-1280.png), [Climate 1280](climate-default-light-1280.png).
- Narrower wrapping comparison: [Land 390](land-default-light-390.png).
- System-color baseline: [Land dark+forced 320](land-default-dark-forced-colors-320.png), [Climate dark+forced 320](climate-default-dark-forced-colors-320.png).
- Preset scope: [Heavy storm Climate 320](climate-heavy-storm-light-320.png), [folded Land after preset 320](land-folded-heavy-storm-light-320.png), [expanded Land after preset 320](land-heavy-storm-light-320.png).

All five rendered configurations fit the viewport without page overflow. Native keyboard range changes retain a visible 3px focus outline. Rainfall 55→60 changes the Land readings to 48/100 and 54/100; high permeability then changes them to 44/100 and 64/100. Sunlight 1→1.05 changes evaporation response 1.00x→1.05x. These responses are grounded in the existing teaching model.

The two keyboard range changes, high-permeability selection, and both scoped Reset actions preserved the paused infiltrating parcel at progress 0.37, saved baseline, comparison writing, and observation evidence. Climate Reset retained changed Land values; Land Reset restored Land defaults. No preservation defect was observed in these focused actions.

## Completion

`baseline-results.json` records 20 snapshots, 16 captures, 7 actions, and zero errors. `completed`, `successful`, `browserClosed`, and `serverClosed` are true. The owned Node process exited 0. This is a read-only audit, not a general regression or accessibility certification.


