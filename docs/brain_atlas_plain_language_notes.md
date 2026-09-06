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

## Neuromyths and Neurodiversity view

September 4, 2026. A new Evidence group holds one view with eight cards. Each card pairs a popular claim with the evidence, a classroom alternative, an evidence verdict, and a source link. The verdicts are fixed vocabulary: debunked, oversimplified, real but small and not diagnostic, and promising but not proven. The diagram shows how many surveyed UK teachers endorsed four of the claims in Dekker et al. (2012), labelled as one 2012 sample rather than a current figure, next to verdict chips that open the cards.

Cards and the sources reviewed:

- Learning styles: the meshing hypothesis has no adequate support (Pashler, McDaniel, Rohrer and Bjork 2008, Psychological Science in the Public Interest). Later assignment studies (Rogowsky et al. 2015; Husmann and O'Loughlin 2019) found no benefit from matching. Endorsement figure from Dekker et al. 2012, Frontiers in Psychology.
- Left-brained and right-brained people: real functional lateralization is kept and cross-referenced to the Cross-Lateral view. The person-level dominance claim is not supported (Nielsen et al. 2013, PLoS ONE, 1,011 resting-state scans).
- Ten percent of the brain: functional imaging, lesion evidence, and the brain's energy cost. Sources are Scientific American (Boyd 2008) and Jarrett, Great Myths of the Brain (2014).
- The window closes at age three: genuine sensory critical periods are acknowledged and linked to the Synapse and Development view. The Mozart effect is described as one small 1993 result with little support in the Pietschnig et al. 2010 meta-analysis (Intelligence). Bruer 1999 for the broader claim.
- Brain-training apps: trained-task gains without far transfer (Simons et al. 2016, Psychological Science in the Public Interest); the 2016 FTC action against Lumosity is mentioned as fact.
- ADHD brain differences: ENIGMA-ADHD (Hoogman et al. 2017, Lancet Psychiatry) group-level subcortical volume differences with small effects and near-complete overlap. The theta/beta EEG ratio hedge (Arns et al. 2013) is restated. Both the "a scan can diagnose it" and the "so it is not real" readings are named as wrong. Diagnosis is described as clinical. The SEL Hub Advocacy tool is named in text for support and accommodation; there is no cross-tool link mechanism in this tool.
- The autistic brain: ENIGMA-ASD (van Rooij et al. 2018, American Journal of Psychiatry) small, heterogeneous differences. Heterogeneity is presented as the main finding and the neurodiversity framing is stated as a better fit for the data than a single deficit model.
- Retinal photograph ADHD model: Choi et al. 2025 (npj Digital Medicine), AUROC about 0.96 in a matched case-control design. The card explains why case-control accuracy overstates real screening performance, that the model has no external validation, and that it is not a diagnostic test. The source link points at the journal home page rather than a guessed article URL.

Scope and safeguards:

- Myth cards have no damage field, so they never enter the damage-localization quiz pool. They have no Brodmann, blood-supply, or drug fields, so the Advanced panel shows only the claim, evidence, alternative, verdict, and source.
- The view-level panel states that nothing in it is a diagnosis or treatment claim, that condition differences are described at the group level only, and that support decisions belong with the student, family, and clinical team.
- Card names, group labels, verdict labels, and panel copy use translation keys with English fallbacks; the 33 new keys are registered in ui_strings.js and its desktop copy. Long evidence text is plain English like the other views' function text.
- Every ADHD and autism sentence is intended for Aaron's review before deployment.

Validation targets: golden digests for all 23 views; the neuromyths content locks in tests/brain_atlas_neuromyths.test.js; the existing Brain Atlas suites; a pixel render of the belief-versus-evidence canvas.

## Quiz distractors and diagram selection

September 5, 2026. The damage-localization quiz now draws its three wrong answers from the same view as the correct region first, and reaches into other views only when that view has fewer than three other damage-bearing regions. Before this, a question about the frontal lobe could offer a sleep stage or a brain wave as a choice, which let students answer by elimination instead of by localization. Each option button carries the option's view and the answer's view as data attributes so the rule is testable.

Picking a region on the 2D diagram, by its label or by its marker, now sends a short spoken confirmation naming the region and saying where the details are. Directory picks already announced through the detail-panel scroll; the canvas path had been silent. No science content changed.

## Headline check

September 5, 2026. The Neuromyths view has an ungraded practice panel. Eight headlines, invented for practice and paraphrased so that no outlet is named and none quotes a real article, are sorted one at a time into the four evidence verdicts. Feedback names the cue in the headline that points to the verdict (for example "match the lesson to the style", "reveal", "company reports") and links to the card that holds the evidence. Every verdict class appears at least once. The panel does not score, store answers beyond the current headline, or call AI.

### Verified in a browser

The Neuromyths view was driven in Chromium against the deployed host with the local tool file injected over the CDN copy. At 1280px in the light, dark, and high-contrast themes, and at 390px in light, the framing panel, the eight cards, the belief chart, and the headline check all rendered with no blank labels, no contrast failures below WCAG AA in the new panels, no horizontal page overflow, and no touch target under 24px. Answering a headline showed the red mark on the chosen wrong verdict, the green mark on the correct one, and the cue text. The two action buttons carry a minimum width so they share a row on desktop and stack full width on a phone.

## Following a myth card into the atlas

September 5, 2026. Several myth cards point at another view in their own evidence text, for example the left/right card citing the cross-lateral view for real lateralization, or the brain-training card citing neuroplasticity in the synapse view. That reference used to be a dead end. Seven of the eight cards now carry a button that opens the view they cite and, where one applies, selects the specific region: critical periods for the age-three window, neuroplasticity for brain training, synaptic pruning for the autism card, and theta waves for the ADHD card, which is where the theta/beta hedge already lives. Learning styles has no button because its text cites no view.

The jump sets the view, its group, and the region together, leaves quiz mode, clears a stale search, and announces the destination, matching the existing treatment and 3D jumps. A test asserts that each named region really belongs to the view it is paired with, so a card can never promise a destination that does not exist.

The jump was clicked in a browser against the deployed host. Opening the ADHD card and pressing its button moved the reader to the EEG view with theta waves selected, where the associated-conditions text already carries the theta/beta caveat. That is the intended payoff: the myth card hands the reader to the place the evidence lives.

## The return leg

September 5, 2026. Four regions elsewhere in the atlas state a contested clinical association in their own text: theta waves and the theta/beta ADHD marker, synaptic pruning and the autism and schizophrenia findings, neuroplasticity and what brain training does not transfer to, and critical periods and the age-three claim. Those are the points where a reader can most easily over-read a finding, so each now offers the evidence card that gives the honest verdict, under the heading "The claim you may have heard".

The pairing is derived from the myth cards' own view and region fields rather than kept as a second list, so the outbound jump and the return link cannot drift apart. The link appears only on those four regions, never inside the myths view, and never on a region with no paired card. A myth card cannot link to itself.

## The chemical-imbalance card

September 5, 2026. A ninth card covers the claim that depression is caused by a chemical imbalance, usually described as too little serotonin. This is the misconception most likely to come up in a medication conversation with a family, and the tool already hedged the theory in two places citing Moncrieff, so the card makes an existing position explicit rather than taking a new one.

The verdict is oversimplified, not debunked. Depression does involve biology; it is the specific low-serotonin story that is unsupported. The card states that the 2022 umbrella review was itself contested by other researchers, and that the practical point survives that argument: whether a medicine helps is a separate question from whether the imbalance story explains why. It says plainly that antidepressants help some people, with modest average benefit over placebo and more in severe depression. It notes the phrase spread through 1990s advertising rather than scientific consensus, and that describing depression as a fixed chemical defect has been associated with more pessimism about recovery.

The alternative section says starting, changing or stopping any medication is a decision with the prescriber and never something a lesson or an app should advise. The card links to the serotonin region in the neurotransmitter view, which puts the corrective one click from the existing monoamine text there. Sources: Moncrieff et al. 2022 in Molecular Psychiatry, and Deacon and Baird 2009.

The chips now sit in three rows of three; only the three claims with a published survey figure carry a belief bar, and no number was invented for the rest.

FOR REVIEW: the serotonin region's own "if damaged" text still reads "serotonin depletion contributes to depression", which is closer to the deficiency framing than the hedge in the same card's function field. That is a clinical wording call, so it is flagged here rather than changed.

## Taking a card out of the tool

September 5, 2026. Each myth card can be copied as plain text: the claim, what the evidence says, the alternative, the verdict with its meaning, and the source and link. The intended use is handing the evidence to a teacher or a family in an email or a report, which a screenshot cannot do.

The copied text ends with a line stating that the findings are described at the group level and that it is not a diagnosis and not medical advice, so the limits travel with the words once they leave the tool.

The copy goes through the shell's alloCopyText helper rather than the Clipboard API directly. Gemini Canvas refuses navigator.clipboard by permissions policy, so a direct call would fail on every click for a Canvas user while passing every jsdom and browser test. A standalone fallback creates a hidden textarea and uses execCommand, and because that needs the click's own activation the text is built synchronously with nothing awaited in between. A test asserts all of this, including that no await or fetch sits between the click and the copy.

The result line is scoped to the card it belongs to, so a success message from one card does not appear on another.

## Keeping focus after an answer

September 5, 2026. A disabled button leaves the tab order. In the headline check and the Stimulation Lab, answering therefore removed the element the keyboard user was standing on, dropped focus to the document, and left the feedback that had just appeared below reachable only by tabbing again from the top of the tool. The authored-card checks in the same file already avoided this by marking answered choices aria-disabled instead, which keeps them focusable and still announces them as unavailable.

Both widgets now use that pattern, with a guard so a second press cannot overwrite a locked answer. Nothing about the questions, the feedback, or the scoring changed. This was a defect in code added earlier in the day, and the Stimulation Lab shared it.

## Finishing the side view's plain cards

September 5, 2026. The side view is the first diagram a learner meets, and Plain is the default reading mode. Eight of its thirteen regions had an authored card; the other five, Broca's area, Wernicke's area, the insular cortex, the angular gyrus and the supramarginal gyrus, fell back to a trimmed slice of the clinical text. That fallback is shorter but it is not plainer: a reader who cannot get through "left inferior frontal gyrus, pars opercularis and triangularis" is no better off with the first hundred characters of it. All thirteen now have a card, so the entry view no longer mixes authored plain language with truncated clinical prose.

Each card carries the same three fields as the existing ones, a question with an explanation behind a disclosure, an ungraded check, and a link on to a related region on the same view. The five new cards are the language and integration areas, which is exactly where single-region language is easiest to slip into, so each says contributes to rather than is responsible for. The language pair says in as many words that producing words and understanding them are different contributions inside one network. The insular card carries an extra note stating that no single region produces a feeling on its own, since that area is the one most often described as the seat of empathy or disgust.

The insular card's own example, a fast heartbeat, is used to make the point that noticing a body signal is not the same as knowing what it means, because the same signal follows exercise, excitement or worry. That is the honest version of interoception for this audience and it avoids naming an emotion the region supposedly owns.

Three vocabulary entries were added for the new cards: speech, comprehension, and bringing information together. Sources: the two aphasia cards link to the NIDCD aphasia page; the other three fall through to the existing NIMH default.

FOR REVIEW: these are newly authored explanations of language and interoception. The wording was chosen to describe contributions rather than jobs, but the science has not been reviewed by anyone but me.

## Finishing the midline view's plain cards

September 5, 2026. Same slice, one view over. The midline view is second in the rail and holds the memory and limbic structures that the quiz and the case decoders lean on. Six of its twelve regions had an authored card; the cingulate gyrus, basal ganglia, fornix, mammillary bodies, septum pellucidum and pineal gland did not. All twelve now do.

Three of those six are not processing areas at all, and that is the point of authoring them. The fornix is a bundle of nerve fibers, the septum pellucidum a thin membrane, the pineal gland an endocrine gland. A learner reading a truncated slice of anatomy has no way to tell any of them from a region that thinks. Each card now says which kind of structure it is in its first line, and the fornix card states plainly that a bundle carries signals between places while the processing happens at the structures it connects. The septum pellucidum card extends the point the ventricles card already made: a labeled part is not always an area of nerve cells.

The pineal card describes melatonin as a timing signal that follows the light and dark cycle, not as a sleep switch. Its check makes that the whole question, because "the sleep hormone" is the version a learner is most likely to arrive with, and sleep timing depends on tiredness, routine and surroundings as well.

The cingulate card is about noticing that something is not going as expected, with a wrong turn as the example, and carries a note that the front and back parts take part in different things and that it is one contributor to each rather than the source. The basal ganglia card is about practice making an action need less deliberate thought, and says several brain systems change over that time rather than one. Neither card uses reward or pleasure language.

The walk-on chain used to close back on the first card after six steps. Ventricles now leads on into the new cards and the last of them returns to the start, so the chain runs through all twelve. Four vocabulary entries were added: habit, nerve-fiber bundle, membrane, gland. The new cards carry no curated source and fall through to the existing NIMH default rather than inventing a URL.

FOR REVIEW: newly authored explanations again, this time of the memory circuit, habit learning and melatonin. Same caveat as the side view cards.

## Progress that says what it actually measured

September 5, 2026. The overview reported activity in language that sounded like mastery. Opening a view was labeled map coverage, which reads as ground covered rather than screens seen. A second tile counted the regions in the current view, which is not progress at all, and that number was already on the canvas chip, the search results button and the directory heading.

The four tiles now separate three things and say what each one is. Views opened counts screens seen and states in the tile that opening is not the same as practising. Checks answered counts the understanding checks on the region cards that have an answer stored, out of the twenty-five that exist. Quiz answers keeps the damage-pattern count and adds that it is practice, not a grade. Selected is unchanged.

The old current-targets tile is gone, and its place is taken by one concrete next step. If a check is currently answered wrongly, the tile offers to look again at that region: the jump opens the region's own view, selects it, switches to Plain, opens the check, and clears the stored answer so the retry is a real attempt rather than a locked screen. The destination view comes from the lesson's own view field, the same derivation the card rendering uses, so the button cannot point at a region the destination does not contain. Answers for other regions are left alone.

There is no new stored state. This reads the check answers that were already being saved.

Four ui_strings keys are now unreferenced by this tool (views_explored, current_targets, quiz_score, damage_pattern_practice) and could be swept later; they were left in place rather than hand-edited out of a file several sessions are writing at once.

## A saved-set round that asks for retrieval

September 5, 2026. The custom round over a learner's saved 3D structures named the target above an answer list containing that same name. A learner using the accessible answer list could finish the round by matching text, without knowing where anything is or what it does, and the summary read the same either way. The June review flagged this: answer labels should not repeat the prompt when retrieval is intended.

The prompt is now what the structure does, taken from the same teaching lookup the compare tray already uses, so no new anatomy was authored. The name sits behind a Show the name button. Taking that button is recorded on the result and reported in the summary, which says that those items were locating practice rather than recall, and that the whole thing is a record of the round and not a score. The panel states its practice goal in a line above the prompt.

Two fallbacks keep the round answerable. A structure with no usable clue is named outright. Two saved structures can also map to the same atlas region and so share a clue word for word, which would be unanswerable by clue; those are named too. In both cases the prompt is never blank.

The screen-reader announcements moved to the clue as well. They previously read the target name aloud when a round started and again on every advance, which handed the answer to exactly the learners the accessible route exists for.

Two other things in the same panel. The answer buttons used the disabled attribute, so answering removed them from the tab order, the same defect fixed earlier in the headline check and the Stimulation Lab; they now use aria-disabled with a click guard. And they were 34 px tall with 9 px text, so they are now 44 px with 11 px text, and the clue reads at 13 px.

Layout checked in Chromium at 1280, 390 and 320 CSS px: every answer button 44 px tall, the hint button 44 px, nothing overflowing its box.

Worth knowing: the clue is the region's clinical function text, so it reads at the level of the rest of the 3D surface rather than in plain language. Whether that surface should get a plain tier is a separate question from this fix.

