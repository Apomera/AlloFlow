# Pipetting apparatus inspection — September 12, 2026

The Titration Lab's aliquot practice now offers selectable close-ups so students can inspect the apparatus at a readable scale, including on a 320 px phone layout.

## Student experience

**Inspect pipetting apparatus** offers five choices:

- **Whole bench** keeps the working solution, rinse waste, pipette, and aliquot receiver in context.
- **Follow current step** automatically shows the filler after conditioning, the meniscus during filling/alignment, the receiver during wall contact and drainage preparation, and the retained tip after delivery or blowout.
- **Pipette and filler** enlarges the upper pipette and its filler. The view stays centered on them as the pipette moves to the receiving vessel.
- **Meniscus / retained tip** shows the existing technique close-up, switching to the tip when delivery finishes.
- **Receiver and tip** enlarges the receiving vessel, contact point, and retained liquid.

The glass has stronger highlights, the filler uses a shaded material, and the main pipette tip now tapers to match its enlarged detail. Retained liquid is clipped to the glass outline. Close-ups omit unrelated bench labels and keep explanatory text outside the drawing at a readable size.

Guidance beneath the drawing reflects the selected subject and current practice state. It distinguishes an unloaded source, loaded solution, conditioned pipette, eye alignment, meniscus setting, wall contact, valid retained liquid, and blowout. Merely aligning the eye does not imply that the meniscus has been set. A blowout view continues to explain that the extra delivered volume is not modeled.

The existing **Enlarge technique detail** button remains as a shortcut between the technique close-up and whole bench. The new selector supports native keyboard navigation, has a visible label, and references its controlled figure and explanatory text. Automatic view changes do not take keyboard focus away from the next technique action. Escape still returns to the pipette equipment card.

## State and scope

Inspection is a local display preference. It defaults to the whole bench when the practice component is reopened. Manual selections remain in place while the procedure advances; automatic following is explicitly selected. Changing views does not load a source, perform a technique action, alter saved measurements, or change live titration settings.

The existing fixed 25 mL aliquot, concentration calculation, action gates, source-copy behavior, and model boundaries are preserved. These are SVG inspection views of the schematic practice bench. The main 3D titration bench is unchanged.

## Verification

- **176 tests passed across 10 suites**, including eight new inspection tests. They cover framing as the pipette moves, automatic versus manual views, malformed state, context-sensitive copy, and unchanged input records. All eight inspection tests passed again after the final copy, tip-clipping, and drawing-frame corrections.
- **50 scoped browser accessibility/layout scans passed**, at 1200 px and 320 px: 20 inspection checks and 30 existing aliquot regression checks. No scoped axe violations, horizontal overflow, or page errors were reported.
- Browser coverage includes the actual practice controls, view changes without state mutation, automatic following, native-select keyboard interaction, forced colors, the existing detail shortcut, recorded delivery, blowout recovery, remount defaults, corrupt source data, and Escape focus return.
- Desktop and phone screenshots were visually inspected for filler, meniscus, receiver contact, delivery, retained-tip, and forced-colors views.
- Source syntax, byte-for-byte source/public parity, all 513 helper English keys, and exact English fallback/catalog agreement for the **21 new strings** were checked. Translations of the new strings remain pending.

Implementation is in `stem_lab/stem_tool_titration.js`, mirrored to `desktop/web-app/public/stem_lab/stem_tool_titration.js`. English copy is registered in `dev-tools/i18n/stem_titration_en.json`. Tests are in `tests/titration_aliquot_inspection.test.js`.

Run `node reports/chemistry-refinement-2026-09-06/titration-inspection-browser.cjs` for inspection coverage and `titration-aliquot-browser.cjs` in the same directory for the existing workflow regression. Reports and screenshots use the `titration-inspection-*` prefix. Vitest runs use `--pool=threads --maxWorkers=1`.

See [the aliquot practice notes](titration-aliquot-practice-2026-09-09.md) for technique references and model boundaries. These changes are local and have not been deployed.
