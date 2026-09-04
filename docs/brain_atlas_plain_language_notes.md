# Brain Atlas: authored Plain view cards

September 4, 2026. Fourteen regions now have an authored big idea, everyday example, related idea, explanation prompt, and optional sample explanation. Eight are in the lateral view: frontal, prefrontal, primary motor cortex, parietal, temporal, occipital, cerebellum, and brainstem. Six are in the medial view: corpus callosum, thalamus, hypothalamus, hippocampus, amygdala, and ventricles.

The examples and questions are original teaching illustrations, not descriptions of experiments or claims that an activity is localized to a single region. The shared note explicitly describes network contributions. Related-region links connect learning ideas; they do not claim a direct anatomical projection between the two areas. There is no score or mastery inference from revealing an explanation.

Background sources checked:

- [NIMH: Get to Know Your Brain](https://www.nimh.nih.gov/news/media/2023/get-to-know-your-brain): broad lobe functions, cerebellar balance/coordination, brainstem breathing, and temporal auditory processing.
- [NCBI Bookshelf: Neuroanatomy, Frontal Cortex](https://www.ncbi.nlm.nih.gov/books/NBK554483/): frontal planning, voluntary motor signals, and prefrontal function. Used as factual background, with original wording rather than adapted passages.
- [Murray and Constantinidis, The Position of the Prefrontal Cortex in the Cortical Hierarchy](https://www.ncbi.nlm.nih.gov/books/NBK609789/): goal-related control and working-memory/network framing. The chapter distinguishes experimental evidence, including nonhuman-primate work; no species-specific claim or quantitative effect is transferred into these cards.

Scope and fallback:

- Authored cards appear only for their assigned view while Plain view is selected: eight lateral IDs and six medial IDs. Unsupported regions retain their prior detail rendering.
- Existing function, clinical, and anatomical fields remain in Advanced. Other views and unsupported IDs keep their existing detail rendering.
- Cards use translation keys with English fallbacks and require no AI or network request to render.
- Optional explanations use native disclosures keyed by region, so a revealed answer does not stay open when moving to a new region.
- The related-region action stays in the same orientation, clears stale search/3D selection, and reveals and focuses the new detail panel. It does not award points.

Validation targets: all fourteen cards; Advanced/fallback behavior; related-region selection/focus; explanation reset; desktop/phone reflow; dark and contrast readability; existing Brain Atlas science and quiz regressions.

## Optional understanding checks

Each of the fourteen cards now has one original application question with three contribution-based answers and feedback specific to each choice. The questions use the same background sources and functional distinctions as the cards above. They ask about the contribution highlighted in an example, rather than assigning a whole activity to one brain region.

Checks are explicitly ungraded and allow reference to the card. Answer order is rotated by region but stays stable across rerenders. The selected answer is stored by region; correctness is derived from the authored question, never from a saved score. An answer locks until the learner resets or retries. Retry clears only that region's answer. There are no points, new mastery claims, AI calls, or external answer storage.


## Planning and movement guided lesson

A four-stage lesson connects the existing frontal-lobe and primary-motor-cortex cards: notice their anatomical relationship, predict contributions in a tapping example, inspect a comparison, and explain a new dance example. Primary motor cortex is explicitly described as part of the frontal lobe. The lesson uses the existing card scope plus the location/function distinctions in [Neuroanatomy, Frontal Cortex](https://www.ncbi.nlm.nih.gov/books/NBK554483/) (reviewed September 4, 2026). Everyday scenarios are original teaching examples, not an experimentally validated lesson or a diagnostic assessment.

The lesson is optional. Its stages can be revisited or skipped, and its text descriptions work without precise diagram interaction. Show in atlas selects the requested structure in lateral 2D view; Lesson navigation returns to the saved stage. Prediction feedback appears in Inspect. The final checkpoint gives choice-specific feedback and permits retry; completion distinguishes a fitting answer, a concept to revisit, and an unanswered checkpoint. It does not award points or claim mastery.

Stage, prediction, checkpoint answer, and optional reflection use the existing atlas state. Closing, inspecting a region, or reviewing the comparison preserves these fields. No AI or new external storage is introduced. Reflection is optional, limited to 2,000 characters, and rendered as text; learners may instead think, speak, or draw their explanation. Calm neutral surfaces, 44px controls, responsive comparison columns, explicit stage labels, and keyboard focus support the same journey on phones and desktop.


## Contextual vocabulary

The fourteen authored cards and all five movement-lesson screens offer a native Key words disclosure. Each screen has two to four relevant definitions drawn from one 19-term dictionary; its collapsed preview names the terms available. Definitions are optional, render without AI, and use translation keys with English fallbacks. Cortex and lobe are explicitly scoped to the cerebrum in this lesson rather than presented as universal definitions for every brain structure.

Opening or closing Key words saves one atlas-wide reading preference. Changing regions or lesson stages replaces the vocabulary with the relevant terms and keeps that preference, without changing a prediction, checkpoint, reflection, or quiz score. Advanced and unsupported cards retain their existing content. Native summary controls support keyboard use; semantic definition lists, readable text, and wrapped previews support smaller screens.

Factual background follows the sources above, with nerve-cell communication checked against [NINDS: The Life and Death of a Neuron](https://www.ninds.nih.gov/es/node/8172) and broad anatomy against [NIMH: Get to Know Your Brain](https://www.nimh.nih.gov/news/media/2023/get-to-know-your-brain). Definitions use original wording and do not add clinical guidance.


## Medial-view extension

The six introductory deep-structure cards use the same optional explanations, context vocabulary, per-region answer storage, and retry flow as the side-view cards. Related links stay in the medial view and compare learning ideas; they do not assert a direct anatomical projection. The card data identifies its intended view and a specific background source, preventing a specialized view that reuses a structure ID from silently inheriting introductory content.

Factual scope and sources reviewed September 4, 2026:

- Corpus callosum: a major route for information sharing between hemispheres; two-hand examples illustrate communication, without implying that one hemisphere acts alone. [NCBI: Corpus Callosum](https://www.ncbi.nlm.nih.gov/books/NBK448209/).
- Thalamus: processing and relaying much sensory information; no claim that all senses must pass through it or that relaying alone explains comprehension. [NCBI: Thalamus](https://www.ncbi.nlm.nih.gov/books/NBK542184/).
- Hypothalamus: regulation of internal conditions, including temperature and water balance; homeostasis is ongoing adjustment, not an unchanging set point. [NCBI: Hypothalamus](https://www.ncbi.nlm.nih.gov/books/NBK525993/).
- Hippocampus: contributions to memories of events and places within a broader network; no storage-box or all-memory claim. [NCBI: Hippocampus](https://www.ncbi.nlm.nih.gov/books/NBK482171/).
- Amygdala: emotional learning includes positive and negative significance. Examples are original teaching scenarios, not reports of a specific human or animal experiment. [NIMH: Amygdala RDoC element](https://www.nimh.nih.gov/research/research-funded-by-nimh/rdoc/units/circuits/150934).
- Ventricles: CSF-containing spaces, explicitly distinguished from nerve tissue; CSF has supporting and cushioning roles. The card does not teach clinical assessment or prevention of head injury. [NCBI: Cerebrospinal Fluid](https://www.ncbi.nlm.nih.gov/books/NBK470578/).

Added vocabulary: hemisphere, relay, homeostasis, hormone, event memory, emotional significance, and cerebrospinal fluid. Existing advanced fields and the other medial regions are outside this content pass.

## Moving between regions and learning cards

Opening a directory item moves focus to the named detail panel. Region list, the mobile Regions shortcut, and Escape return to that region's button, revealing it inside the scrollable directory. A visible focus outline and a 44px Back control make the return easier to find. Related-card navigation returns to the most recently read region.

Search text and learning preferences remain intact. If a region selected on the diagram is outside the current search results, returning focuses the directory instead of clearing the search. Prenatal directory choices continue to update the timeline week. Returning clears the corresponding 3D selection and leaves quiz mode so the directory is available. Diagram clicks keep their existing focus behavior; opening a card from the directory is the explicit reading transition. Delayed focus requests are ignored when the intended view or region has changed.

## Finding a region

Plain directory previews reuse the fourteen authored big ideas. A matching everyday example is shown when it explains a search result better than the big idea. Other Plain entries show a bounded function overview; Advanced retains the full function text. Directory text, guidance, result controls, and search recovery use a larger reading scale and comfortable targets.

Search stays within the current view and matches every query word across identifiers, translated names, functions, conditions, and the view-appropriate authored ideas/examples/connections. It tolerates extra spaces, case, common accents, apostrophe styles, and hyphen/underscore separators. Results keep their original anatomical order, and the 2D diagram uses the same filtered set. No new scientific content, AI calls, or external search service is introduced.

Enter and View results reveal the directory even while a detail or quiz is open. The query and practice answers remain intact. Clear search returns focus to the input; the / shortcut uses the input ID so it also works with translated placeholders and prenatal milestones. Composition events are respected. A single live status announces the current-view result count.
