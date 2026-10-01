# Dinosaur Lab: illustrated fossil evidence atlas

Implemented locally on September 27, 2026. Open **Anatomy → Fossil reference library** to explore the new atlas.

## What changed

The eight static reference cards are now an illustrated selector beside a focused specimen panel. Each fossil type has an original SVG schematic, a descriptive image label, its preserved features, useful inferences, an explicit evidence limit, an investigation question, and a source link. The warm illustration surfaces, serif headings, and teal accents continue the evidence workbench's visual treatment.

Selection uses native buttons with a visible outline and underline, an accessible pressed state, and keyboard focus transferred to the selected heading. The layout adapts from a desktop sidebar to a compact grid above the reading panel on phones. Source links remain in normal reading order.

**Practice recognizing this evidence** opens matching practice on the selected fossil. Feedback includes the evidence limit, and **Inspect this fossil type** opens the corresponding reference entry. Selection and disclosure states survive navigation and session restoration. Existing notebook entries and workbench drafts are preserved. Practice remains unscored.

Three illustrated preservation routes replace the overly linear fossilization account. They distinguish minerals in hard parts, impressions/compressions, and preserved activity traces, with an explanation of preservation bias. These routes follow the [National Park Service overview](https://www.nps.gov/subjects/fossils/how-fossils-form.htm).

## Scientific content

The revisions distinguish pore filling from replacement, informed by [NPS body fossils](https://www.nps.gov/subjects/fossils/body-fossils.htm). Teeth and trackways now emphasize interpretation and estimation, using the [Natural History Museum's evidence guide](https://www.nhm.ac.uk/discover/what-can-scientists-learn-about-dinosaurs-and-how.html).

Nest colonies are no longer presented as proof of parental care; the entry discusses embryos and associated adults using [AMNH's dinosaur eggs account](https://www.amnh.org/dinosaurs/dinosaur-eggs) and [brooding overview](https://www.amnh.org/explore/videos/dinosaurs-and-fossils/dinosaur-eggs-101). Covering and color claims are bounded by the preserved sample, with [NHM's color-evidence account](https://www.nhm.ac.uk/discover/how-to-bring-a-dinosaur-to-life-in-technicolour.html).

Other entries distinguish food remains from identification of the dung producer ([NPS coprolites](https://www.nps.gov/fobu/learn/nature/coprolites.htm)), emphasize context when identifying gastroliths ([Wings, 2007](https://www.app.pan.pl/article/item/app52-001.html)), and distinguish microscopic shape from chemical identification ([Bertazzo and colleagues, 2015](https://doi.org/10.1038/ncomms8352)). All illustrations are explicitly teaching schematics, not specimen photographs or measurements.

## Verification

- **117 focused unit and regression tests passed** across six suites. After correcting the forced-colors styling, the 87 affected tests passed again. The 18 render snapshots were intentionally refreshed. Reports: `unit-tests.json` and `unit-final.json`.
- **Two Chromium scenarios passed**, with retries disabled, including keyboard selection of all eight entries, focus movement, practice feedback, reopening the atlas, navigation, and restored learner state. See `browser-final.json`.
- **Nine axe scans reported zero violations**, spanning three fossil selections across default, dark, and high-contrast themes. Automated scans are supplemented by screenshot review; they are not a complete screen-reader audit. See `accessibility.json`.
- **320px, 390px, and 768px layouts passed** overflow and card containment checks. Desktop and phone captures were visually inspected.
- **Forced-colors review found and fixed an obscured button label.** The corrected atlas and workbench primary buttons use system button colors in this mode. The final forced-colors screenshot was inspected; reduced-motion checks also passed.
- **86 atlas strings are registered** in both English registries. Translation hooks are in place; this pass does not add translations into other languages.
- Main and desktop public modules are identical. Hashes and result counts are recorded in `verification.json`.

The golden suite still emits a pre-existing React list-key warning. No new stylesheet parsing errors or browser harness errors were reported. These changes have not been deployed.

## Visual review

![Desktop fossil atlas](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-fossil-atlas-2026-09-27/atlas-theme-default.png)

![Phone specimen detail](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-fossil-atlas-2026-09-27/detail-phone.png)

![Dark fossil atlas](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-fossil-atlas-2026-09-27/atlas-theme-dark.png)

![Windows forced-colors fossil atlas](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-fossil-atlas-2026-09-27/atlas-forced-colors.png)
