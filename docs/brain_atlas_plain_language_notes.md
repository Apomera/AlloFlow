# Brain Atlas: authored Plain view cards

September 4, 2026. Eight side-view regions now have an authored big idea, everyday example, related idea, explanation prompt, and optional sample explanation: frontal, prefrontal, primary motor cortex, parietal, temporal, occipital, cerebellum, and brainstem.

The examples and questions are original teaching illustrations, not descriptions of experiments or claims that an activity is localized to a single region. The shared note explicitly describes network contributions. Related-region links connect learning ideas; they do not claim a direct anatomical projection between the two areas. There is no score or mastery inference from revealing an explanation.

Background sources checked:

- [NIMH: Get to Know Your Brain](https://www.nimh.nih.gov/news/media/2023/get-to-know-your-brain): broad lobe functions, cerebellar balance/coordination, brainstem breathing, and temporal auditory processing.
- [NCBI Bookshelf: Neuroanatomy, Frontal Cortex](https://www.ncbi.nlm.nih.gov/books/NBK554483/): frontal planning, voluntary motor signals, and prefrontal function. Used as factual background, with original wording rather than adapted passages.
- [Murray and Constantinidis, The Position of the Prefrontal Cortex in the Cortical Hierarchy](https://www.ncbi.nlm.nih.gov/books/NBK609789/): goal-related control and working-memory/network framing. The chapter distinguishes experimental evidence, including nonhuman-primate work; no species-specific claim or quantitative effect is transferred into these cards.

Scope and fallback:

- Authored cards appear only for these eight IDs in the lateral view while Plain view is selected.
- Existing function, clinical, and anatomical fields remain in Advanced. Other views and unsupported IDs keep their existing detail rendering.
- Cards use translation keys with English fallbacks and require no AI or network request to render.
- Optional explanations use native disclosures keyed by region, so a revealed answer does not stay open when moving to a new region.
- The related-region action stays in the same orientation, clears stale search/3D selection, and reveals and focuses the new detail panel. It does not award points.

Validation targets: all eight cards; Advanced/fallback behavior; related-region selection/focus; explanation reset; desktop/phone reflow; dark and contrast readability; existing Brain Atlas science and quiz regressions.

## Optional understanding checks

Each of the eight cards now has one original application question with three contribution-based answers and feedback specific to each choice. The questions use the same background sources and functional distinctions as the cards above. They ask about the contribution highlighted in an example, rather than assigning a whole activity to one brain region.

Checks are explicitly ungraded and allow reference to the card. Answer order is rotated by region but stays stable across rerenders. The selected answer is stored by region; correctness is derived from the authored question, never from a saved score. An answer locks until the learner resets or retries. Retry clears only that region's answer. There are no points, new mastery claims, AI calls, or external answer storage.


## Planning and movement guided lesson

A four-stage lesson connects the existing frontal-lobe and primary-motor-cortex cards: notice their anatomical relationship, predict contributions in a tapping example, inspect a comparison, and explain a new dance example. Primary motor cortex is explicitly described as part of the frontal lobe. The lesson uses the existing card scope plus the location/function distinctions in [Neuroanatomy, Frontal Cortex](https://www.ncbi.nlm.nih.gov/books/NBK554483/) (reviewed September 4, 2026). Everyday scenarios are original teaching examples, not an experimentally validated lesson or a diagnostic assessment.

The lesson is optional. Its stages can be revisited or skipped, and its text descriptions work without precise diagram interaction. Show in atlas selects the requested structure in lateral 2D view; Lesson navigation returns to the saved stage. Prediction feedback appears in Inspect. The final checkpoint gives choice-specific feedback and permits retry; completion distinguishes a fitting answer, a concept to revisit, and an unanswered checkpoint. It does not award points or claim mastery.

Stage, prediction, checkpoint answer, and optional reflection use the existing atlas state. Closing, inspecting a region, or reviewing the comparison preserves these fields. No AI or new external storage is introduced. Reflection is optional, limited to 2,000 characters, and rendered as text; learners may instead think, speak, or draw their explanation. Calm neutral surfaces, 44px controls, responsive comparison columns, explicit stage labels, and keyboard focus support the same journey on phones and desktop.
