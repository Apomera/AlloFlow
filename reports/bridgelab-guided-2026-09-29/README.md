# Bridge Lab: a guided damping investigation

## Learning workflow

In **Stress Test**, open **Guided investigation · damping and energy** beneath the bridge scene.

1. Write a prediction about changing damping from 5% to 20%.
2. Prepare the pair. The current response mode, shaking frequency, and acceleration are copied into reference A with 5% damping. Current experiment B uses 20% damping. Both start paused at 0 s.
3. Inspect the same moment in A and B, compare full-event peaks and energy at the selected frame, and record paired evidence.
4. Write a claim and explain it using the recorded values, units, time, and energy transfer. A final prompt asks students to predict what will happen at another shaking frequency.

Preparation retains existing notebook records, notebook writing, and static design inputs. The guide has separate prediction, claim, and explanation fields. It checks whether ground motion or response mode differs, whether damping is identical, and whether either input has zero shaking. These checks identify conditions that affect the interpretation; they do not grade a student's explanation.

## A/B scene inspection

**Compare damping scenes** enables A/B buttons inside the scene, including fullscreen. **Compare saved trial in scene** provides the same controls for the selected notebook reference.

- A is the chosen reference; B is the current experiment.
- Switching pauses playback at the shared time and retains the camera position along the bridge, orientation, and zoom. The eye-level camera moves with the selected trial's deck.
- Replay advances one shared experiment clock. Selecting A does not restore its saved inspection time or change B's inputs.
- The scene's displacement and energy readout follow the selected trial. Its energy bar uses one fixed scale covering both trials.
- Labels show the selected trial's inputs. A warning identifies different ground motion. Changing the current physical inputs selects B.
- **End scene comparison** returns to B and removes the extra controls.
- The current experiment's charts and mechanism remain B; saved-trial charts retain their explicitly selected reference. The guide's paired numeric readings remain available in 2D and with reduced motion.

The comparison uses one canvas and reuses the existing geometry. Switching trials does not create a second renderer or rebuild the bridge.

## Evidence that remains interpretable

Recorded evidence stores both validated input sets and the shared time, with a version identifier. Displayed results are recalculated. Imported cached answers are ignored. Later setting changes mark the evidence as coming from earlier settings and retain its original inputs and time. Recording again explicitly replaces that comparison.

The investigation report includes the prediction, recorded readings, claim, and explanation. Student writing is rendered as text. Draft reports without a recording identify the missing numerical evidence. Small positive energy values below the displayed precision appear as **<0.001 J/kg**, preserving the distinction between very small energy and zero.

## Dynamics demonstrations corrected

The Tacoma and Millennium case-study demonstrations now use four deliberate still-frame steps. The previous wind-speed status thresholds, crowd-count threshold, and unvalidated displacement formulas have been removed. There is no automatic motion in either illustration. Steps work with keyboard controls and reduced motion.

- **Tacoma:** airflow, motion-dependent aerodynamic forces, energy feedback, and design assessment. The explanation avoids a blanket claim that streamlined decks cannot flutter. [WSDOT's account](https://www.wsdot.wa.gov/TNBhistory/bridges-failure.htm) describes the aerodynamic interaction and lessons for design.
- **Millennium:** pedestrian forces, balance on a moving deck, interaction that can reinforce vibration, and damping. The supplier documents the damping retrofit and its purpose in [Taylor Devices' project account](https://www.taylordevices.com/structural/millennium-bridge-london-england/).

The diagrams state that positions and arrows are illustrative. They do not calculate a wind speed, crowd limit, failure point, or displacement. Both link into the damping investigation, which retains its separate synthetic earthquake model and assumed vibration modes. Static force colors continue to describe the static truss analysis.

The sequence supports comparing evidence and revising designs, as described in [NGSS MS-ETS1-3](https://www.nextgenscience.org/pe/ms-ets1-3-engineering-design). The specific next-step feedback follows [CAST's guidance on actionable feedback](https://udlguidelines.cast.org/engagement/effort-persistence/feedback/).

## Verification

**96 distinct checks pass:** 78 unit checks across four files and 18 Chromium browser workflows. The final focused browser run rechecks the small-energy presentation, A/B replay synchronization, and its desktop and phone previews. The verifier takes the latest result for each workflow; rechecks are not counted twice.

Coverage includes preparation without overwriting prior work, shared time and viewpoint, matching energy scales, changed-condition feedback, invalid restored records, earlier evidence, recalculated print output, qualitative case-study steps, 320 px phone layout, fullscreen sizing, reduced motion, and WebGL recovery. Both Bridge Lab sources match byte-for-byte, all 975 literal English fallbacks match both registries, and parsing and scoped whitespace checks pass.

- [Unit results](unit-results.json)
- [Browser regression results](browser-results.json)
- [Final focused browser results](browser-final-results.json)
- [Source and coverage verification](source-verification.json)

Run from the repository root:

    node reports/bridgelab-guided-2026-09-29/verify.cjs

## Previews

- Desktop: [A, 5% damping](bridge-1000-damping-a.png) · [B, 20% damping](bridge-1000-damping-b.png)
- Phone: [A](bridge-320-damping-a.png) · [B](bridge-320-damping-b.png)
- Paired evidence: [desktop](bridge-1000-paired-evidence.png) · [phone](bridge-320-paired-evidence.png)
- Investigation report: [desktop](bridge-1000-guided-report.png) · [phone](bridge-320-guided-report.png)
- Mechanisms: [Tacoma](bridge-320-tacoma-mechanism.png) · [Millennium](bridge-320-millennium-mechanism.png)
