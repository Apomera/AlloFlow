# Titration equipment guide expansion — September 9, 2026

This pass brought the Equipment tab to 11 technique entries. Six new entries offer three selectable illustrated stages each: volumetric flask, pipette filler, filling funnel, stand and clamp, magnetic stirrer, and pH electrode. The existing glassware comparison bench and five original entries remain available.

Each new entry has an SVG apparatus illustration, stage-specific instructions, technique notes, a common-error note, and a reference link. The diagrams change immediately when students select a stage. They are explicitly labeled as illustrations and do not operate the live experiment, calibrate its signal, or change recorded readings. These are technique walkthroughs, not six new physical simulations or additional 3D renderers.

Native buttons expose their selected state and control the live instruction region. Opening equipment focuses its detail panel; Back to equipment and Escape restore focus to the selecting card. Switching equipment or reopening a guide starts at its first stage. The equipment grid uses three columns when space permits; diagrams and controls stack on phones. No animation loop or dependency was added.

The illustrations emphasize the relevant action: a single flask calibration mark with an eye-level sightline, controlled pipette filling and wall-contact delivery, removal of a filling funnel, a supported vertical burette, gentle magnetic stirring, and electrode clearance and storage. They are schematic, not dimensionally calibrated. A tilted flask retains a horizontal liquid surface, and the pipette delivery illustration keeps its tip above the receiving liquid.

The guide has since expanded to 14 entries with a weighing activity. See [the weighing practice follow-up](titration-weighing-practice-2026-09-09.md) for the current behavior and verification. The figures below describe this earlier pass.

## Content references

The guide uses concise original summaries and directs students to the reviewed lab procedure and their actual equipment instructions. Sources checked for the relevant technique, rather than adopted wholesale:

- [Augusta University general procedures](https://spots.augusta.edu/smyers1/Chemistry2810/GENERALPROCEDURES.html): volumetric flask preparation and contained-versus-delivered volume.
- [BRAND pipette-controller operating manual, English technique section](https://shop.brand.de/media/import/1/27/32406/42485/42534/42546/GA_macro.pdf#page=27): fitting, controlled filling, meniscus adjustment, and delivery. The illustration is generic; controller designs differ.
- [University of Wisconsin burette filling instructions](https://www2.chem.wisc.edu/deptfiles/genchem/lab/labdocs/modules/buret/bretfill.htm): supported filling, air clearance, and funnel removal.
- [Purdue University titration technique](https://chemed.chem.purdue.edu/genchem/lab/techniques/titration/perform.html): mixing without splashing.
- [Vernier pH sensor care](https://www.vernier.com/blog/answers-to-the-top-five-questions-about-ph-sensor-care/) and [buffer handling](https://www.vernier.com/blog/three-tips-for-keeping-your-ph-sensor-healthy/): calibration, protection, and storage. Storage is tied to the manufacturer's instructions, not to a universal solution recipe.

The new content uses 71 translated-string calls with matching English fallbacks registered in `dev-tools/i18n/stem_titration_en.json`. Other language translations remain follow-up work. The existing pack-coverage ratchet is unchanged; its passing result is not evidence that these new strings have been translated.

## Verification

- All 115 targeted tests passed across remaining tabs, dynamic focus relationships, existing internationalization checks, and the immersive bench.
- Real Chromium exercised all 18 stages, native keyboard selection, unique selected states, changing illustration/instruction content, external-reference attributes, direct equipment switching, reopening reset, return/Escape focus, and unchanged experiment data.
- All 36 focused axe scans passed: six new guides, three stages, two viewport widths (1200 and 320 pixels). No guide overflow was detected.
- A further axe scan of the entire Equipment tab passed, for 37 scans total. These automated checks do not establish complete accessibility conformance.
- Forced-colors keyboard activation, retained original burette guidance, clean unmount, and absence of page errors were checked.
- Desktop and phone screenshots were visually inspected. Source syntax, source/public byte parity, new English-fallback matching, and scoped whitespace checks passed.

Repeat browser checks with `node reports/chemistry-refinement-2026-09-06/titration-equipment-browser.cjs`. Evidence is in the same folder: `titration-equipment-browser-results.json`, `titration-equipment-tests.json`, and equipment JPEG screenshots. The fixture uses the actual widget, React, Three.js, and application stylesheet. No deployment or physical-device classroom trial was performed.

A useful next expansion for this guide would be a weighing workflow: analytical balance, weighing boat, and spatula, followed by quantitative transfer into the volumetric flask.
