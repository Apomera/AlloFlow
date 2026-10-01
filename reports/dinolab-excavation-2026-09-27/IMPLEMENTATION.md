# Dinosaur Lab: excavation and navigation enhancements

Implemented locally on 27 September 2026. The main Dinosaur Lab script and desktop public copy match.

## Learning improvements

Dig Site now offers **six candidates instead of 359**. Each generated set includes the answer, three close alternatives, and two broader contrasts. Candidate order varies deterministically by site, and saved excavation layouts remain compatible.

Learners select a candidate and cite at least two uncovered clues before checking. Feedback evaluates those citations:

- **Conflict:** identifies the cited fields that disagree with the candidate.
- **Ambiguity:** names the candidates that still fit and asks for more evidence. It does not reveal which hidden answer was selected by the generator.
- **Unique match:** records an identification only when the cited clues distinguish one candidate within the set.

Finding the answer earns completion once per site. Selecting names alone does not complete the activity. Duplicate or invalid saved cell indices cannot unlock additional clues. Earlier completions remain available without inventing a record of citations.

After identifying a candidate, learners can open their notebook with the cited catalog evidence beside the writing prompts. The reflection asks which clue ruled out an alternative and what further evidence would be needed in actual fieldwork. Existing specimen notes are preserved. Notebook downloads include the current excavation reference context alongside the learner's writing.

The interface explicitly describes this as a **catalog mystery**. The bone icons are symbolic, and the activity does not establish that a real fossil can be identified from those icons or broad catalog traits. Written reasoning is recorded without automatic grading.

## Visual and interaction improvements

- A grouped section picker provides direct access to all 18 activities through Discover, Investigate, Explain, and Practice and teach. Existing tab navigation and arrow-key controls remain available.
- Dig Site separates collecting clues, comparing candidates, and checking evidence into three numbered areas.
- Candidate cards show reference fields corresponding to uncovered clues. Cards reflow for phone widths.
- Completed investigations emphasize the identified candidate and place the other five inside a review disclosure.
- The excavation grid uses one Tab entry point, arrow-key movement, Home/End, and Enter/Space to dig. Revealed cells remain reviewable.
- A prepared-sample option opens the clues for learners who want to concentrate on comparing evidence.
- New interface labels are registered in both default string catalogs. Additional language translations were not authored in this pass.

## Verification

**124 distinct unit tests passed across seven files.** Coverage includes 100 sampled sites, candidate uniqueness and solvability, ambiguous evidence, conflicting evidence, invalid restored state, repeat scoring, legacy completions, translated clue labels, notebook retention, existing investigation behavior, keyboard contracts, and all 18 section render snapshots.

The Chromium scenario passed with retries disabled. It exercised grouped navigation, tab arrow keys, keyboard excavation, the prepared sample, ambiguous and conflicting answers, successful identification, notebook writing and export, restoration from saved activity state, and starting a new site.

Automated WCAG A/AA checks through 2.2 reported **zero violations across nine combinations**: Dig Site, Field Notes, and Explore in light, dark, and high-contrast themes. Phone layouts were checked at 390 px and 320 px for horizontal page overflow. Browser runtime errors were absent in the tested flow.

Source syntax, scoped patch whitespace, source mirror parity, and Dinosaur Lab string parity were checked. Existing React test-harness warnings remain. Verification used the local browser harness and application theme styles; classroom outcomes and assistive-technology usability still require learner testing.

Validation artifacts: `unit-tests.json`, `final-unit-tests.json`, `accessibility-unit-tests.json`, `browser-tests.json`, `accessibility.json`, `validation-summary.json`, and `excavation-notebook.txt`.

## Screenshots

![Excavation and candidate comparison on desktop](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-excavation-2026-09-27/dig-desktop.png)

![Completed investigation on a phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-excavation-2026-09-27/dig-phone.png)

## Next substantial step

A future fossil-identification activity should use sourced specimen images or diagrams with diagnostic anatomical features and real geological context. That would support reasoning from fossil observations, extending the catalog-comparison reasoning practiced here. The anatomy workflow is also ready for learner-authored explanations and comparison with worked examples.
