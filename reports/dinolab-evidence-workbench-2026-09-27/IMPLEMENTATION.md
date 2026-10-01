# Dinosaur Lab: evidence workbench

Implemented locally on September 27, 2026. Open **Dinosaur Lab → Anatomy** to use it.

## What changed

The Anatomy section now opens with an investigation instead of a fossil-type recognition exercise. Learners choose between two published fossil cases, read a visual evidence file, distinguish observations from supported inferences and overreach, and write an explanation that names the evidence and its limits.

The workbench uses a two-column desktop layout and a single-column phone layout. Original SVG teaching diagrams have descriptive accessible names and explicit labels identifying them as schematics, not fossil photographs or scale drawings. Native selects, checkboxes, buttons, and text areas support keyboard use. The existing fossil matching activity and reference library remain available in collapsed sections below the investigation.

## Learning and engagement

- **Two contrasting cases:** feather attachment evidence in Velociraptor and the limits of preserved skin samples in Tyrannosaurus. Each case links directly to its research source.
- **Reasoning before writing:** learners classify three statements. Feedback explains why each classification fits or needs reconsideration, including the distinction between a well-supported inference and an unsupported extension. Learners can revise choices and proceed without needing a perfect score.
- **Authored explanations:** learners cite evidence, write a claim, connect evidence to that claim, and identify a limit and a next question. Brief bullet points and device dictation are explicitly welcomed.
- **Optional support:** sentence starters, a worked example, and a self-review checklist are available without automatically inserting an answer into the learner's writing.
- **Visible revision:** the first classification attempt, first recorded explanation, and latest recorded revision are retained. A first-explanation comparison and a prompt to investigate the other case support reflection and transfer.
- **Honest progress:** recording checks only that the required fields and a citation are present. The interface explicitly says that prose is not automatically assessed. Self-review resets when the learner changes writing or cited evidence.

## Persistence and notebook integration

Each case keeps its own draft and progress across section changes. Workbench records appear in Field Notes, with a return action for each case. Notebook downloads include sources, selected evidence, the first classification attempt, the first explanation, the latest recorded revision, and any current draft that differs from the recorded version. Existing specimen notes, time investigations, and excavation references are preserved.

Restored state is normalized to known cases, choices, and citation IDs. Text is bounded to 1,000 characters per response, duplicate citations are removed, and incomplete stored explanations are not treated as recorded. Learner text is rendered as text, not HTML. The feature uses the activity's existing persistence; downloading remains the way to keep an independent copy.

The main module and desktop public mirror are synchronized. Added 89 English localization keys to both registries, with checks that the runtime keys match their fallbacks. Additional language translations were not authored in this pass.

## Research basis

The case content paraphrases published evidence. The diagrams, classification prompts, feedback, and worked examples are teaching materials created for the lab; they are not reproduced research figures.

- [Turner, Makovicky & Norell (2007), Feather quill knobs in the dinosaur Velociraptor](https://doi.org/10.1126/science.1145076). [PubMed abstract](https://pubmed.ncbi.nlm.nih.gov/17885130/).
- [Bell and colleagues (2017), Tyrannosauroid integument reveals conflicting patterns of gigantism and feather evolution](https://doi.org/10.1098/rsbl.2017.0092). [Article record and text](https://pmc.ncbi.nlm.nih.gov/articles/PMC5493735/).

## Verification

- **139 tests passed across eight test files:** new workbench interactions and normalization; existing evidence matching, field notebook, localization, time inquiry, excavation investigation, Anatomy Quest, and golden render contracts. The 18 render snapshots were updated for the shared stylesheet and Anatomy page changes. See `unit-tests.json`.
- **One full Chromium workflow passed, no retries:** both cases, keyboard citation selection, feedback and revision, source attribution in downloads, preservation of existing notes, and remounting saved state. See `browser-tests.json` and the generated `evidence-notebook.txt` example.
- **Nine accessibility scans, zero violations:** writing, classification, and notebook screens in default, dark, and high-contrast themes. WCAG 2 A/AA, 2.1 AA, and 2.2 AA tags were included. See `accessibility.json`.
- **Responsive verification:** no page overflow at 390px or 320px for either workbench step. Desktop, phone, and high-contrast screenshots were visually inspected.

These checks validate the implemented interactions and selected accessibility rules. Learning effectiveness has not been measured with students, and automated checks are not a substitute for assistive-technology testing. This pass does not change the 3D renderer or re-audit every older fossil-library statement.

## Screenshots

### Desktop evidence file and classification

![Desktop evidence workbench](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-evidence-workbench-2026-09-27/workbench-desktop.png)

### Learner writing and first-explanation comparison

![Reasoning and revision](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-evidence-workbench-2026-09-27/reasoning-and-revision.png)

### Phone layout

![Phone workbench](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-evidence-workbench-2026-09-27/workbench-mobile.png)

### High-contrast layout

![High contrast workbench](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dinolab-evidence-workbench-2026-09-27/workbench-theme-contrast.png)
