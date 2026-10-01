# Dinosaur Lab: from impact to food webs

Implemented locally on September 28, 2026. Open **Extinction** to begin the new investigation, **One impact. A world of consequences.**

## Experience

The section now starts with a scientific question: how could an impact in one location disrupt life far from its crater? Three freely accessible stages connect the reference material to a learner-authored explanation.

1. **Inspect the sources.** Five illustrated source cards distinguish the rock record, models and mechanisms, and volcanic context. Each provides a source link, a supported inference, and a limit. Learners can cite a source directly from its detail panel.
2. **Connect the effects.** An illustrated pathway connects impact, reduced sunlight, reduced production, and food-web disruption. Three sets of wrapping radio choices ask learners to explain those connections. Feedback addresses particular misconceptions, such as treating predators as independent of producers. The first checked pathway is preserved when choices are revised.
3. **Explain and revise.** Learners cite a rock source and the impact-winter model, then write an explanation, a connection between sources, and a limit or further question. Recording checks completeness only. A worked example stays separate from learner writing. The first explanation, latest recorded revision, and current draft remain distinct.

The notebook now displays this investigation and exports the sources, original pathway choices, current choices, recorded explanations, and unfinished drafts. Existing specimen notes and evidence-workbench writing are preserved. A follow-up action opens the Bird Link section and places keyboard focus on its active tab.

## Visual and accessibility details

Original SVG diagrams illustrate sediment layers, the buried crater, altered minerals, atmospheric particles, lava flows, producers, and a food web. Reference diagrams have descriptive accessible names and explicit schematic labels. Decorative previews are hidden from assistive technology.

The existing warm fossil surfaces, teal accent, and serif headings now extend into Extinction. Selected sources have an underline and outline as well as a surface change. The process diagram becomes vertical on phones; answers wrap instead of disappearing inside a narrow menu. Controls remain native and keyboard accessible. Theme tokens and system button colors support dark, high-contrast, and forced-colors presentation. No animation, new dependency, or image download was added.

## Scientific framing

Impact markers and their geological context are based on [Schulte and colleagues (2010)](https://doi.org/10.1126/science.1177265). The crater card retains a published age estimate with uncertainty and now links to [Renne and colleagues (2013)](https://doi.org/10.1126/science.1230492).

The atmospheric source identifies modeling as a way to test consequences, following [Senel and colleagues (2023)](https://doi.org/10.1038/s41561-023-01290-4). The process activity cites [Morgan and colleagues (2022)](https://doi.org/10.1038/s43017-022-00283-y). It presents a simplified explanatory pathway, without simulating weather, specifying an exact darkness duration, or predicting every organism's fate.

Volcanism remains visible as environmental context; its contribution is distinguished from the strong evidence for the impact as the principal trigger. The related quiz wording was aligned with this distinction. The [Natural History Museum's extinction overview](https://www.nhm.ac.uk/discover/dinosaur-extinction.html) provides an accessible source. Survival wording distinguishes surviving lineages from a claim that all members of a group survived.

The five-event overview remains available in a disclosure. Its percentage bars were removed because they presented estimates with different scopes as a uniform species-loss comparison. The default K-Pg reference row can now be closed correctly. This pass is not an exhaustive fact-check of the wider species catalog or every legacy quiz item.

## Validation

- Initial run: **123 tests passed** across six focused suites, including notebook regression and the existing worksheet-print work.
- Final affected checks: **100 tests passed** across extinction investigation, scientific integrity, quiz integrity, and golden renders. The 18 render snapshots were intentionally updated for the new shared styles. After the final diagram outline correction, the 81 affected render and investigation checks passed again.
- **Two Chromium scenarios passed**, retries disabled, covering keyboard source selection, feedback, revision history, actual notebook download, restored drafts, and the Bird Link focus target. The visual scenario was repeated after the final diagram correction.
- **Nine axe scans, zero violations:** all three stages across default, dark, and high-contrast themes. This is not a complete assistive-technology audit.
- **768px, 390px, and 320px layouts passed** overflow checks, including source cards and the final wrapping answer labels. Desktop, phone, dark, and forced-colors screenshots were reviewed.
- **119 new English strings** are registered in both registries. Translation hooks are present; additional language translations were not added.
- Source and desktop public copies match. Result counts and hashes are in `verification.json`; detailed results are in `unit-tests.json`, `unit-final.json`, `browser-final.json`, `accessibility.json`, and `layout.json`.

Visual review prompted replacing the initial select menus because they clipped long answers, and outlining the atmospheric layer so it remains visible in forced colors. Both changes were revalidated; the final additional reports are `unit-visual-final.json` and `browser-visual-final.json`. A pre-existing React list-key warning remains in the golden suite; no browser harness errors were reported. Changes have not been deployed.

## Screenshots

![Source investigation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-extinction-investigation-2026-09-28/sources-desktop.png)

![Cause and consequence](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-extinction-investigation-2026-09-28/pathway-desktop.png)

![Phone pathway](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-extinction-investigation-2026-09-28/step-1-phone.png)

![Dark theme](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-extinction-investigation-2026-09-28/pathway-theme-dark.png)

![Windows forced colors](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-extinction-investigation-2026-09-28/pathway-forced-colors.png)
