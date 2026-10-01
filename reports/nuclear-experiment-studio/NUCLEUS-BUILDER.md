# Nucleus builder — 2026-09-29

Nuclear Lab has a new optional starting experience for protons, neutrons, and isotopes. It appears in a closed panel near the top of the experiment studio, before the experiment chooser.

## Learner experience

- Predict what adding neutrons to carbon will change.
- Add or remove particles and see the nucleus name, particle diagram, and mass number update immediately.
- Follow one comparison prompt at a time: save carbon-12, carbon-14, and nitrogen-15.
- Prepare a suggested nucleus when needed. Preparing changes the current diagram and focuses Save; it does not add a saved comparison.
- Save distinct nuclei in a compact table. Repeated saves update the existing row.
- Explain the particle changes after saving the three comparison nuclei. Learners can revise an incorrect explanation.
- Review folded controls, keep an optional takeaway, and continue directly to the half-life introduction.

The builder resumes the current particle counts and saved comparisons when revisited. Restarting keeps its earned completion and takeaway. Existing introduction progress, notebooks, Signal detective work, and other tool data are preserved.

## Science and scope

The proton count determines the element. Isotopes share a proton count and differ in neutron count; mass number is the total number of protons and neutrons. The carbon examples use six protons with six or eight neutrons. These definitions and examples were checked against [DOE isotope basics](https://www.energy.gov/science/doe-explainsisotopes) and [NIDC isotope notation](https://www.isotopes.gov/isotope-basics).

Nitrogen-15 has atomic number seven and mass number fifteen, so the comparison uses seven protons and eight neutrons. [NIST nitrogen isotope data](https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=N).

This activity labels nuclei from their particle counts. The diagram uses schematic positions, and changing the counts represents a comparison between nuclei rather than a specific nuclear reaction. Its collapsed science panel explains that isotopes can be stable or radioactive and connects the builder to the half-life experience.

## Verification

- **72 unit tests passed**, including particle identity, mass numbers, control limits, unique comparisons, explanation requirements, shortcut focus, malformed saved state, notes, and retention of earlier work.
- **All 20 studio browser scenarios passed in one run.** The three new builder scenarios cover keyboard exploration, explanation navigation, preserved half-life progress, 320px with larger text, reduced motion, light and dark palettes, forced colors, and targeted axe accessibility scans with the real app stylesheet.
- Screenshots of the comparison, mobile completion, light palette, and forced colors were visually reviewed.
- Three isolated mutations were rejected: an incorrect mass number, an explanation available after only two required comparisons, and a preparation shortcut that saved a comparison immediately. Each run confirmed that production source stayed untouched.
- The integration verifier and its negative cases passed. All four module copies and 396 active translation keys match; the production loader still maps the module.
- A comparison with this turn's saved baseline confirmed that code outside the studio was preserved. Scoped whitespace checks passed.

Local preview: <http://127.0.0.1:52674/__harness?experience=nucleus>.

Changes are uncommitted. Unrelated shared workspace and registry edits remain intact.
