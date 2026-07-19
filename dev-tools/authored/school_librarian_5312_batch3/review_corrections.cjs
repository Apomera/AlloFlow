'use strict';

// Manual review corrections remove avoidable stem-to-key lexical cues without changing
// the verified construct or zero-based answer position assigned by the Batch 3 builder.
const corrections = {
  'sl5312-b3-001': { correct: 'Disaggregate use and access evidence, consult underrepresented groups and their teachers, and define a measurable access need.' },
  'sl5312-b3-003': { correct: 'By May, at least 80 percent of sampled grade-eight inquiry products will meet the agreed source-quality criteria on a common rubric.' },
  'sl5312-b3-006': { correct: 'Examine implementation and learner-work evidence with teaching partners, locate where learning stalled, and revise the approach for a subsequent cycle.' },
  'sl5312-b3-008': { correct: 'Review the restriction under district rules and reconsideration procedures, assess its effect on equitable access, and propose the least restrictive lawful approach.' },
  'sl5312-b3-009': { correct: 'Activate a documented contingency plan that relocates essential instruction and resources, communicates access routes, and tracks unmet needs.' },
  'sl5312-b3-016': { correct: 'A procedure that assigns roles, documents the sequence and exceptions, protects learner information, and aligns with adopted policy.' },
  'sl5312-b3-017': { correct: 'Explain the value of applying the established procedure consistently, preserve the material\'s status as policy directs, and document the referral.' },
  'sl5312-b3-018': { correct: 'Translate the distinct needs into design criteria, prototype competing layouts with users, and evaluate access and learning tradeoffs during preconstruction review.' },
  'sl5312-b3-020': { correct: 'Review participation and learner feedback by group, test alternative access times, and judge the program against both engagement and equity criteria.' },
  'sl5312-b3-021': { correct: 'Combine gap analysis with learner and curriculum input, then seek well-reviewed disability-authored titles across genres and viewpoints.' },
  'sl5312-b3-022': { correct: 'Withdraw or replace the outdated guide promptly, document the decision, and direct users to up-to-date authoritative medical information.' },
  'sl5312-b3-023': { correct: 'Follow the adopted reconsideration procedure, including the resource\'s stated status during review, and avoid ad hoc restriction.' },
  'sl5312-b3-030': { correct: 'Confirm that the license and authentication rules permit the proposed users and method, then follow the resource-sharing protocol and access safeguards.' },
  'sl5312-b3-031': { correct: 'Reconcile circulation, location, service, and transfer documentation with a physical check and record each device\'s verified status.' },
  'sl5312-b3-037': { correct: 'Work with the vendor and district to implement license-compliant individual or federated access that protects privacy and produces appropriate security audit trails.' },
  'sl5312-b3-039': { correct: 'Review demand, condition, availability, format, and curricular or reading value, then complete, replace, relocate, or withdraw the set coherently.' },
  'sl5312-b3-040': { correct: 'Separate the concepts, generate synonyms, combine them strategically, and revise the query after examining relevant subject terms and retrieved records.' },
  'sl5312-b3-043': { correct: 'Trace each assertion to its evidence, examine methods and context, distinguish reporting from inference, and seek corroboration.' },
  'sl5312-b3-046': { correct: 'Provide a private, nonjudgmental reference interaction, clarify the request, offer credible age-appropriate sources, and follow applicable safety policy.' },
  'sl5312-b3-053': { correct: 'Trace the image through reverse-search or provenance tools, compare landmarks and dates, and confirm the event with reliable community sources.' },
  'sl5312-b3-056': { correct: 'Query age-group synonyms in appropriate subject or abstract fields, combine them with the anxiety concept, and inspect indexing in useful records.' },
  'sl5312-b3-061': { correct: 'Students will synthesize relevant findings from multiple credible perspectives and justify a feasible recommendation with cited reasoning.' },
  'sl5312-b3-062': { correct: 'Use shared outcomes and rubric evidence, document each instructional component, gather student process evidence, and interpret contribution together.' },
  'sl5312-b3-064': { correct: 'Clarify the learning need, propose shared teaching and a manageable evidence-sampling plan, and define responsibilities before the next unit.' },
  'sl5312-b3-065': { correct: 'Unpack the common goals, agree on observable criteria and performance levels, and allow assignment-specific features where justified.' },
  'sl5312-b3-067': { correct: 'Provide accessible content and structured graphic organizers to all, allow supported ways to examine sources, and assess the same evaluation criteria.' },
  'sl5312-b3-068': { correct: 'Offer readable text, audio, and captioned media sources, model evidence revision, and let students explain claim revisions in accessible formats using common criteria.' },
  'sl5312-b3-071': { correct: 'Learners may recognize source credentials yet need targeted modeling and practice connecting particular support to a claim and context.' },
  'sl5312-b3-072': { correct: 'Preteach key concepts with visuals and resources in relevant languages, model abstract structure, and allow linguistic supports while assessing source reasoning.' },
  'sl5312-b3-075': { correct: 'Use low-stakes reading-interest conversations and varied book encounters, protect choice, and refine suggestions from learner feedback.' },
  'sl5312-b3-079': { correct: 'Model predicting from the result snippet, opening the source, tracing publisher and evidence, and narrating the revision decision.' },
  'sl5312-b3-089': { correct: 'Analyze learner and teacher evidence by grade, identify priority practices, and co-design differentiated educator-development goals.' },
  'sl5312-b3-091': { correct: 'Combine participation and implementation records with samples of teacher practice and student performance aligned to the program outcomes.' },
  'sl5312-b3-092': { correct: 'Clarify instructional purposes, examine evidence and current policy, surface access and data risks, and facilitate a bounded pilot with shared criteria if appropriate.' },
  'sl5312-b3-100': { correct: 'Pause joint promotion, clarify authority and responsibilities with the organization, resolve safeguards, and issue a coordinated update.' },
};

// The first cross-review cleared the shared per-item severe-length heuristic, but
// a second batch-level review found that the key was still the longest response
// in 96 of 100 items. These item-specific extensions retain plausible professional
// misconceptions while preventing response length from functioning as a testwise
// clue. Key positions and tested concepts are unchanged.
const distractorLengthCorrections = {
  'sl5312-b3-091': { distractorIndex: 1, detail: ', without examining classroom implementation evidence' },
  'sl5312-b3-041': { distractorIndex: 2, detail: ', without verifying the claims outside the site' },
  'sl5312-b3-042': { distractorIndex: 0, detail: ', published decades after the event' },
  'sl5312-b3-052': { distractorIndex: 1, detail: ', including retained document content and metadata' },
  'sl5312-b3-098': { distractorIndex: 1, detail: ', rather than substantive evidence or questions' },
  'sl5312-b3-058': { distractorIndex: 1, detail: ', without describing what resource the link opens' },
  'sl5312-b3-021': { distractorIndex: 2, detail: ', regardless of the remaining health-information need' },
  'sl5312-b3-034': { distractorIndex: 0, detail: ', regardless of voice, context, or use' },
  'sl5312-b3-066': { distractorIndex: 2, detail: ', without changing what the final product must demonstrate' },
  'sl5312-b3-023': { distractorIndex: 2, detail: ', and use the added availability as the program response to the complaint' },
  'sl5312-b3-028': { distractorIndex: 2, detail: ', and keep allocating them by request order throughout the pilot' },
  'sl5312-b3-055': { distractorIndex: 1, detail: ', without checking whether any result reports a study' },
  'sl5312-b3-089': { distractorIndex: 1, detail: ', and use completion as the sole evidence of improvement' },
  'sl5312-b3-012': { distractorIndex: 2, detail: ', regardless of its educational value or safeguards' },
  'sl5312-b3-045': { distractorIndex: 0, detail: ', while the formal review is pending' },
  'sl5312-b3-071': { distractorIndex: 1, detail: ', regardless of the claim or context being evaluated' },
  'sl5312-b3-031': { distractorIndex: 2, detail: ', and use classroom location as proof of staff liability' },
  'sl5312-b3-029': { distractorIndex: 0, detail: ', and explain which class placed the request' },
  'sl5312-b3-043': { distractorIndex: 0, detail: ', without tracing where any linked evidence originated' },
  'sl5312-b3-076': { distractorIndex: 0, detail: ', and use that preference for every future promotion' },
  'sl5312-b3-001': { distractorIndex: 1, detail: ', treating popularity as sufficient evidence of need' },
  'sl5312-b3-024': { distractorIndex: 2, detail: ', and use sales rank as the continuing selection rule' },
  'sl5312-b3-027': { distractorIndex: 0, detail: ', without examining unsuccessful searches across groups' },
  'sl5312-b3-074': { distractorIndex: 2, detail: ', and use the quiz as each student\'s entire inquiry grade' },
  'sl5312-b3-047': { distractorIndex: 2, detail: ', regardless of purpose, amount, license, or permission' },
  'sl5312-b3-063': { distractorIndex: 1, detail: ', and assess it solely through notes from that lecture' },
  'sl5312-b3-100': { distractorIndex: 2, detail: ', without defining what participation or media use covers' },
  'sl5312-b3-016': { distractorIndex: 0, detail: ', including cases not addressed by adopted policy' },
  'sl5312-b3-056': { distractorIndex: 0, detail: ', and discard records using different age-group terminology' },
  'sl5312-b3-065': { distractorIndex: 1, detail: ', even if it omits evidence-use criteria from the outcomes' },
  'sl5312-b3-070': { distractorIndex: 1, detail: ', so the paper improves without another student evaluation decision' },
  'sl5312-b3-080': { distractorIndex: 2, detail: ', using the quiz score as the sole participation measure' },
  'sl5312-b3-087': { distractorIndex: 1, detail: ', and combine the sections without shared synthesis or revision' },
  'sl5312-b3-036': { distractorIndex: 1, detail: ', and revisit multilingual purchasing after vendor quality improves' },
  'sl5312-b3-039': { distractorIndex: 2, detail: ', and treat series completeness as sufficient reason to buy them' },
  'sl5312-b3-075': { distractorIndex: 2, detail: ', using total completions as the program\'s primary success measure' },
  'sl5312-b3-081': { distractorIndex: 0, detail: ', across every genre, purpose, format, and instructional context' },
  'sl5312-b3-090': { distractorIndex: 0, detail: ', including for teachers who did not transfer the strategy' },
  'sl5312-b3-095': { distractorIndex: 2, detail: ', with partnership success measured by the amount raised' },
  'sl5312-b3-011': { distractorIndex: 2, detail: ', without changing supervision, records, or monitoring' },
  'sl5312-b3-019': { distractorIndex: 0, detail: ', and use its monthly growth as the sole success measure' },
  'sl5312-b3-004': { distractorIndex: 1, detail: ', even when those costs meet documented access obligations' },
  'sl5312-b3-005': { distractorIndex: 0, detail: ', and treat the result as representative of affected learners' },
  'sl5312-b3-059': { distractorIndex: 1, detail: ', and continue until the sender\'s identity is established' },
  'sl5312-b3-060': { distractorIndex: 2, detail: ', before reviewing the assignment or its learning evidence' },
  'sl5312-b3-064': { distractorIndex: 0, detail: ', and use corrected reference lists as evidence that collaboration worked' },
  'sl5312-b3-084': { distractorIndex: 0, detail: ', and postpone access and privacy review until after adoption' },
  'sl5312-b3-003': { distractorIndex: 1, detail: ', using teacher satisfaction as the primary success measure' },
  'sl5312-b3-078': { distractorIndex: 1, detail: ', as long as the overall summary sounds coherent and useful' },
  'sl5312-b3-079': { distractorIndex: 0, detail: ', without opening or evaluating the sources themselves' },
  'sl5312-b3-015': { distractorIndex: 2, detail: ', whenever grant funds cover the initial purchase price' },
  'sl5312-b3-040': { distractorIndex: 2, detail: ', and use the filtered count to decide whether the search succeeded' },
  'sl5312-b3-048': { distractorIndex: 0, detail: ', without reviewing whether the subscription permits the audience' },
  'sl5312-b3-007': { distractorIndex: 2, detail: ', even if readers infer that the measures have no possible connection' },
  'sl5312-b3-009': { distractorIndex: 2, detail: ', beginning with the sections closest to the damaged area' },
  'sl5312-b3-022': { distractorIndex: 2, detail: ', without identifying which claims are obsolete or unsafe' },
  'sl5312-b3-093': { distractorIndex: 2, detail: ', and consult policy only after a complaint escalates' },
  'sl5312-b3-014': { distractorIndex: 2, detail: ', and adopt whichever version receives the most votes' },
  'sl5312-b3-046': { distractorIndex: 1, detail: ', regardless of the student\'s stated information need' },
  'sl5312-b3-049': { distractorIndex: 0, detail: ', while treating noncommercial status as the sole license condition' },
  'sl5312-b3-062': { distractorIndex: 2, detail: ', and rely on final-product quality without studying the instruction' },
  'sl5312-b3-002': { distractorIndex: 2, detail: ', using student enthusiasm as the initial success evidence' },
  'sl5312-b3-026': { distractorIndex: 1, detail: ', and rely on staff memory to tell researchers it exists' },
  'sl5312-b3-032': { distractorIndex: 0, detail: ', without documenting local significance or replacement scarcity' },
  'sl5312-b3-053': { distractorIndex: 0, detail: ', and treat repeated captions as confirmation of location and date' },
  'sl5312-b3-085': { distractorIndex: 1, detail: ', and rely on a generic warning to prevent disclosure' },
  'sl5312-b3-086': { distractorIndex: 0, detail: ', then assess details from the summary rather than the artifact' },
  'sl5312-b3-096': { distractorIndex: 0, detail: ', while retaining the same time, language, location, and format' },
  'sl5312-b3-010': { distractorIndex: 0, detail: ', and formalize request frequency as the standing allocation rule' },
  'sl5312-b3-017': { distractorIndex: 1, detail: ', and state that the donor has no legitimate route for review' },
};

function applyReviewCorrections(spec, itemId) {
  const merged = { ...spec, ...(corrections[itemId] || {}) };
  const lengthCorrection = distractorLengthCorrections[itemId];
  if (!lengthCorrection) return merged;
  const distractors = merged.distractors.slice();
  const original = distractors[lengthCorrection.distractorIndex];
  if (typeof original !== 'string') throw new Error('Invalid distractor-length correction for ' + itemId);
  distractors[lengthCorrection.distractorIndex] = original.replace(/\.\s*$/, '') + lengthCorrection.detail + '.';
  return { ...merged, distractors };
}

module.exports = corrections;
Object.defineProperties(module.exports, {
  applyReviewCorrections: { value: applyReviewCorrections },
  distractorLengthCorrections: { value: distractorLengthCorrections },
});
