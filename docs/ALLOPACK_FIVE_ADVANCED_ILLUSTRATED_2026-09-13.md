# Five advanced AlloPacks — illustrated editions

Completed locally on 2026-09-13. These are educator-review drafts. The original text-only files were preserved. This batch was not committed, pushed or published to the live catalog.

## Downloads and coverage

| Illustrated pack | Resources | Image placements | Audited original string changes | Editable lesson labels |
| --- | ---: | ---: | ---: | ---: |
| [Figurative Language, Grade 5](../allopacks/illustrated/figurative_language_grade5.allopack.json) | 15 | 35 | 154 | 9 |
| [Argument and Evidence, Grade 6](../allopacks/illustrated/argument_evidence_grade6.allopack.json) | 15 | 32 | 145 | 8 |
| [Central Idea, Grade 7](../allopacks/illustrated/central_idea_grade7.allopack.json) | 14 | 34 | 138 | 9 |
| [Theme Development, Grade 8](../allopacks/illustrated/theme_development_grade8.allopack.json) | 16 | 36 | 166 | 9 |
| [Scarcity and Choice, Grade 7](../allopacks/illustrated/scarcity_choice_grade7.allopack.json) | 14 | 32 | 150 | 10 |
| Total | 74 | 169 | 753 | 45 |

All 54 glossary entries, 23 anchor sections, 52 concept-sort cards and 40 lesson panels have embedded images. There are ten selected generated originals and 76 selected SVG assets, with some diagram designs shared across packs; 169 placements does not mean 169 unique paintings. Every pack remains below the two-million-character import limit.

Artwork varies by topic: felt applique, screenprinted paper collage, linocut with watercolor, drypoint-style etching, and crafted-paper miniatures. Subjects focus on lesson objects and settings, without photorealistic people. Generated artwork contains no baked-in labels. Forty-five native lesson labels and all captions remain editable. Diagram marks support the accompanying text rather than replace it.

## Collection and community catalog status

There are now **43 illustrated editions locally**, out of 50 distinct source packs. Seven source packs remain without an illustrated edition. Counting original and illustrated files separately, the collection contains 93 files and 1,125 resources.

The [live community manifest](https://raw.githubusercontent.com/Apomera/AlloFlow/main/catalog/index.json) was checked at **2026-09-13 04:19:20 UTC**. It lists **six illustrated packs**: Forces and Motion, States of Matter, Water Cycle, Weather vs. Climate, Plant Needs, and Materials. The local catalog manifest also lists those six. **37 local illustrated editions are not listed live**, including all five in this batch. The status check confirms listings; it does not assert that the six remote pack files match every latest local byte.

See [saved live status](allopack-quality-2026-09-13/live-catalog-status.json) and [batch summary](allopack-quality-2026-09-13/five-advanced-summary.json). Local catalog integration tests below use intercepted responses; they do not publish or add an entry to the real catalog.

For the future publisher: review the illustrated files linked above and their content audits. Use the repository's existing `catalog/published_allopacks.json` and catalog-entry/index generation workflow to prepare entries after review. The app reads the manifest from raw GitHub main, so publication requires the reviewed entries and pack files to reach that branch. No live manifest or publication allowlist was changed during this batch.

## Content review

- **Figurative Language:** removes the characterization of figurative writing as a lie; distinguishes comparison from mere presence of like/as; removes the claim that metaphors are automatically stronger; uses clearer human-intention examples of personification; explains conventional idiom meanings without unsupported origin stories. Device overlap is acknowledged, and sort categories identify a main device. Originality is judged by meaningful choices, not an impossible promise that no one has ever written a phrase before.
- **Argument and Evidence:** facts can be asserted as claims, and opinions can be reasoned judgments. Reasoning connects evidence but cannot supply missing observations. Fictional library, cooking and team records identify their assumptions and limitations. The challenge now supplies four short proposals rather than assuming unavailable documents exist. Recommendations are classroom simulations, not real school commitments.
- **Central Idea:** adds the four-paragraph invented River Project passage so students can trace two ideas and cite actual wording. Removes unverified injury, sleep and turtle figures. Numerical cards are clearly fictional. Evidence supports a claim without automatically proving it; quotation, paraphrase, citation and explanation have distinct roles. The activities avoid assuming that every persuasive author deliberately hides facts.
- **Theme Development:** adds The Key on the Table, a four-paragraph original practice story. The recurring key supports discussion of continued belonging and changed relationships. Themes can be explicit or implied; morals can overlap with themes; disagreement is not a definition. Small choices may matter, motifs do not require exactly three appearances, and students must test interpretations against actual details.
- **Scarcity and Choice:** makes time/place/demand assumptions explicit. Opportunity cost is the value of the next-best feasible alternative forgone; alternatives can be combinations where feasible. A sunk cost must be unrecoverable: refunds, resale, remaining equipment value, acquired skills and future consequences still matter. Sort cards specify the relevant resource or past cost instead of treating air, seawater or sunlight as universally unlimited.

Each changed original string field is recorded in `allopacks/media/<slug>/content-refinements.json`. The illustrated edition carries the revisions; the corresponding original pack is unchanged. Original resource IDs and activity types remain intact.

Reference checks include [Purdue OWL's argument organization guide](https://owl.purdue.edu/owl/general_writing/academic_writing/establishing_arguments/organizing_your_argument.html), and the [Grade 8 theme-development standard](https://www.thecorestandards.org/ELA-Literacy/RL/8/2/). The economic definitions were checked against the St. Louis Fed's [opportunity-cost lesson](https://www.stlouisfed.org/education/economic-lowdown-podcast-series/episode-1-opportunity-cost) and [marginal and sunk-cost discussion](https://www.stlouisfed.org/open-vault/2020/march/three-ways-think-like-an-economist). These sources do not certify the generated art, grade suitability or the full packs.

## Validation and scope

- [332 tests passed](allopack-quality-2026-09-13/five-advanced-and-catalog-tests.json): 30 pack checks plus 302 catalog checks. The [final 30 pack checks](allopack-quality-2026-09-13/five-advanced-final-tests.json) also passed after the last label and wording refinements.
- [Production collection imports passed](allopack-quality-2026-09-13/imports.json) for 93 files and 1,125 resources. Final pack tests independently validate the production artifact envelope.
- Local catalog load, actual component download, offline production-loader reopen and history preservation passed for all five packs and all 74 resources. All 169 embedded images decoded offline; all 40 lesson-panel alt attributes were verified.
- Native anchor charts and teacher/student concept sorts rendered all 23 and 52 images respectively. No pending slots remain.
- All 45 final lesson labels fit mobile image boundaries without label-to-label overlap. Visual review also checked that the reasoning bridge and future-choice arrow remain visible under their labels.
- Visual review covered all ten generated originals, every selected diagram, twenty mobile lesson groups and all five sets of native anchor/teacher-sort/student-sort views. Diagrams were refined where review found a floating bridge, weak star/record/mountain cues or obstructive labels.

Per-pack reports are `<slug>-integration.json` and `<slug>-native-resources.json` under `docs/allopack-quality-2026-09-13/`. Mobile screenshots are under `scratch/<slug>-qa/` and `scratch/resource-backfill-qa/<slug>/`. The harness uses production components with local responses and incomplete surrounding styling/translations; it is not a full signed-in end-to-end classroom session or a live deployment.

Every placement has an image-specific description and matching hash. The glossary and lesson views consume those descriptions. Existing anchor and teacher-sort renderers treat images as decorative beside text; the student sort uses card statements as alt. This is not a complete screen-reader audit of those renderers. Some sort wording is deliberately scaffolded and explicitly identifies statement roles; teachers can increase difficulty after reviewing student needs.

## Artwork, exact prompts and rebuild

The built-in image generator was used for the ten originals; no external API fallback was used. Selected PNGs, compressed WebP assets, SVGs, exact prompts and manifests are stored in these project folders:

- [Figurative Language assets](../allopacks/media/figurative_language_grade5/) · [exact prompts](../allopacks/media/figurative_language_grade5/source-prompts.json)
- [Argument and Evidence assets](../allopacks/media/argument_evidence_grade6/) · [exact prompts](../allopacks/media/argument_evidence_grade6/source-prompts.json)
- [Central Idea assets](../allopacks/media/central_idea_grade7/) · [exact prompts](../allopacks/media/central_idea_grade7/source-prompts.json)
- [Theme Development assets](../allopacks/media/theme_development_grade8/) · [exact prompts](../allopacks/media/theme_development_grade8/source-prompts.json)
- [Scarcity and Choice assets](../allopacks/media/scarcity_choice_grade7/) · [exact prompts](../allopacks/media/scarcity_choice_grade7/source-prompts.json)

Packs embed their images and do not depend on generator credentials or remote image URLs. Each `manifest.json` maps every image to its native slot and records the selected source, prompt, caption and visual-review status.

```powershell
node dev-tools/build_five_advanced_illustrated.cjs figurative_language_grade5 argument_evidence_grade6 central_idea_grade7 theme_development_grade8 scarcity_choice_grade7
```

The wrapper assembles reviewed assets, applies `five_advanced_content_refinements.cjs`, writes the string audit, and adds `five_advanced_native_labels.cjs`. Diagrams are defined in `five_advanced_diagrams.cjs`. The initial planner refuses to overwrite an existing manifest; rebuilding an illustrated pack uses its existing reviewed assets.

## Remaining seven packs

American Revolution Causes, Ancient Egypt, Constitution, Local Government, Map Skills, Rules and Fairness, and Then and Now remain text-only. See the batch summary for their exact filenames.
