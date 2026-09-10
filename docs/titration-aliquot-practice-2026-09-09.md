# Volumetric pipetting practice — September 9, 2026

The Titration Lab Equipment pathway now has a fourth step, **Take an aliquot**. A completed solution-preparation record also offers **Practice a 25 mL aliquot**, linking the earlier weighing, transfer, and preparation exercises to use of a volumetric pipette.

## Student workflow

Load a copy of a completed, mixed 100 mL preparation. Condition the pipette with solution, fill above the mark using its filler, align the eye, set the lower meniscus, place the tip against the receiving wall, and drain using the specified wait. Each step enables the next relevant action. Recording is available only after valid delivery.

The exercise represents a standard **non-blow-out volumetric pipette calibrated to deliver 25 mL**. A detailed tip view shows retained liquid after drainage. The guidance explains that this retention is included in the delivery calibration; the student should neither subtract it from the nominal delivery nor force it into the receiver.

The record combines nominal volume, working concentration, and calculated solute mass. A 25 mL aliquot at 4.800 g/L contains 0.12 g of solute. The portion has the same concentration as the well-mixed source. A second example at 5.000 g/L gives 0.125 g.

## Visual and interaction refinements

- The SVG bench includes a working-solution beaker, a rinse-waste receiver, a volumetric pipette with a filler, and an aliquot receiver.
- The detail view moves aside when the pipette moves to the receiver, keeping the apparatus visible. It switches from meniscus alignment to retained-tip liquid after delivery.
- **Enlarge technique detail** provides a readable view on phones and supports keyboard activation without altering the trial.
- The successful record appears before an optional **Try blowing out the tip** exercise. Blowout invalidates the nominal-volume result; the model does not invent an extra delivered volume. An earlier record is explicitly flagged as invalid.
- **Start over with this solution** appears beside the error guidance. Restart retains the selected concentration and clears technique progress and the record.
- Back/forward equipment links preserve progress. **Back to equipment** and Escape return focus to the pipette card.

The existing pipette description was revised to describe a calibrated transfer volume instead of an “exact” measurement. Its guidance now distinguishes this non-blow-out pipette from other pipettes whose markings and instructions differ. Unsupported wording about the most common safety violation was removed.

## State and model boundaries

State is isolated in `titrationLab.aliquotPractice`. Loading requires a completed preparation, with its eye-level check, final model volume, and mixing. The aliquot keeps a copy of the source concentration: a changed or unavailable preparation is flagged and cannot silently overwrite the trial. Explicit loading starts a fresh trial. The preparation, transfer record, balance sample, and live titration remain unchanged by pipetting actions.

The nominal volume is 25 mL; concentration is derived from the recorded sample in the 100 mL preparation. Calculated aliquot mass is one quarter of that preparation's solute mass. Small supported sample values remain nonzero in the display. Malformed masses and impossible saved action sequences cannot create a valid aliquot record.

Conditioning, drainage, and the applicable waiting period finish in single model actions. No universal waiting duration is prescribed. Working-solution consumption, rinse-waste volume, retained-liquid volume, uncertainty, and the extra amount from a blowout are not modeled. Vessel dimensions and liquid heights are schematic. This exercise does not use or modify the live titration's analyte settings.

## Content references

- [Purdue: use of the pipet](https://chemed.chem.purdue.edu/genchem/lab/equipment/pipet/use.html) supports solution conditioning, a separate working portion, meniscus setting, and leaving the calibrated retained tip liquid.
- [Purdue: sources of pipetting error](https://chemed.chem.purdue.edu/genchem/lab/equipment/pipet/error.html) covers viewing height and excess delivery from forcing liquid out.
- [BRAND macro controller manual, English delivery instructions](https://shop.brand.de/media/import/1/27/32406/42485/42534/42546/GA_macro.pdf#page=29) supports wall contact and following the waiting time specified for the pipette, while distinguishing blow-out pipettes. Its controller-specific instructions are not generalized to every filler.

## Verification

The main regression run passed **156 tests across eight suites**, including 11 new aliquot tests. These cover source eligibility, conditioning and alignment gates, wall contact, calibrated delivery, blowout before and after recording, retained source copies, restart, malformed state, and concentration/mass calculations across the supported range.

The browser fixtures use the actual widget, React, and application styles. They exercise a completed preparation through pipetting, both concentration examples, error recovery, current versus unavailable sources, enlarged views, forced-colors keyboard use, filler-guide navigation, close/Escape focus returns, corrupted state, and preservation of live chemistry fields. Screenshots and scoped axe/overflow checks cover desktop and 320 px phone layouts. The final runs passed **56 scoped accessibility/layout scans**: 30 for pipetting and 26 for the existing preparation workflow, with no overflow, scoped violations, or page errors. All 11 focused English-coverage and focus checks passed after the refinements. Source syntax, byte-for-byte source/public parity, all 318 equipment-helper English strings, and scoped whitespace checks passed. Desktop and phone screenshots were inspected, including the recorded result, enlarged tip view, rinse receiver, and blowout recovery.

Run `node reports/chemistry-refinement-2026-09-06/titration-aliquot-browser.cjs`. Results and screenshots use the `titration-aliquot-*` prefix in that directory. The existing preparation fixture is also rerun to cover the added continuation link and four-step pathway. Vitest runs use `--pool=threads --maxWorkers=1`.

There are 67 new English keys in this pass. Other-language translations remain pending. Source and desktop/public copies are synchronized. These changes are local; no deployment or physical-device classroom trial is included.

## Follow-up workflow refinement

The preparation pathway now displays record progress, values, and recovery guidance. Pipetting shows the next technique action by default, with an optional full step list and focus advancement. See [the workflow refinement notes](titration-workflow-refinement-2026-09-09.md) for current behavior and the subsequent 168-test, 82-scan validation.
