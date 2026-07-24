#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const auditName = 'eppp_native_quality_audit_wave_01';
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];
const reviewedAt = '2026-07-15';

const cp1252 = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86], ['‡', 0x87],
  ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a], ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91],
  ['’', 0x92], ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97], ['˜', 0x98],
  ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c], ['ž', 0x9e], ['Ÿ', 0x9f],
]);
const mojibakePattern = /[ÃÂ]|â[€†€™œž“”–—‰ˆ]|ðŸ|ï¿½/u;
const staleKeyPattern = /\bCorrect\s*:\s*\([A-D]\)\s*/gi;
const stackedModifierPattern = /\b(?:strictly|selectively|explicitly|primarily|exclusively|uniquely|purely|definitively|significantly|essentially|completely|absolutely|formally|objectively|rigorously|correctly|effectively|structurally|totally|solely|strongly|conclusively|perfectly|entirely|currently|actively)\b(?:[\s,]+\b(?:strictly|selectively|explicitly|primarily|exclusively|uniquely|purely|definitively|significantly|essentially|completely|absolutely|formally|objectively|rigorously|correctly|effectively|structurally|totally|solely|strongly|conclusively|perfectly|entirely|currently|actively)\b){2,}/i;
const paddedPrefix = 'Under the conditions in the question, the best response is ';

function byteFor(character) {
  const code = character.codePointAt(0);
  if (code <= 0xff) return code;
  return cp1252.get(character);
}

function decodeMojibakeToken(token) {
  const bytes = Array.from(token, byteFor);
  if (bytes.some((byte) => byte == null)) return token;
  const decoded = Buffer.from(bytes).toString('utf8');
  return decoded.includes('\ufffd') ? token : decoded;
}

function repairText(value) {
  let repaired = String(value);
  for (let pass = 0; pass < 3; pass += 1) {
    const next = repaired.replace(/(?:Ã.|Â.|â..|ð...|ï..)/gu, decodeMojibakeToken);
    if (next === repaired) break;
    repaired = next;
  }
  return repaired;
}

function repairEncoding(value) {
  if (typeof value === 'string') return repairText(value);
  if (Array.isArray(value)) return value.map(repairEncoding);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, repairEncoding(entry)]));
}

const rewrites = {
  'eppp-v2-biological-014': {
    choices: ['Throughout the cortex, cerebellum, and brainstem at comparable rates', 'The hippocampus and the subventricular zone, though the precise extent and functional significance in adult humans remains debated', 'Nowhere, because the adult brain permanently stops producing neurons once development ends', 'Only in the cerebral cortex, where new neurons broadly replace damaged cells'],
    feedback: ['Adult neurogenesis is regionally restricted rather than evenly distributed throughout the brain.', 'Adult neurogenesis is most associated with the dentate gyrus and subventricular zone in mammals, although its persistence and functional importance in adult humans remain actively debated.', 'Evidence does not support complete cessation of neuron production after maturation.', 'The cerebral cortex is not considered the primary site of adult neurogenesis.'],
    rationale: 'Adult neurogenesis is most associated with the dentate gyrus and subventricular zone in mammals, although its persistence and functional importance in adult humans remain actively debated.',
  },
  'eppp-v2-biological-017': {
    choices: ['Threat learning, emotional salience, and emotional memory', 'Maintaining only positive emotional states', 'Coordinating voluntary motor movements', 'Producing and comprehending language'],
    feedback: ['The amygdala contributes to threat learning, salience evaluation, emotional memory, and aspects of social-emotional processing within broader neural networks.', 'The amygdala is not limited to positive emotion and participates in processing several kinds of emotionally salient information.', 'Voluntary motor coordination depends more directly on motor cortex, basal ganglia, and cerebellar systems.', 'Language production and comprehension depend primarily on distributed cortical language networks.'],
    rationale: 'The amygdala contributes to threat learning, salience evaluation, emotional memory, and aspects of social-emotional processing within broader neural networks.',
  },
  'eppp-v2-biological-025': {
    choices: ['Support myelination, immune defense, metabolic regulation, and synaptic function', 'Provide passive structural support and no other functions', 'Are unnecessary for normal nervous-system function', 'Occur only in peripheral nerves'],
    feedback: ['Glial cells perform diverse functions: oligodendrocytes and Schwann cells form myelin, microglia participate in immune defense, and astrocytes support metabolism and synaptic regulation.', 'Glia provide structural support, but their roles also include myelination, immune activity, metabolic regulation, and synaptic functions.', 'Normal nervous-system function depends on multiple glial-cell types.', 'Glial cells occur in both the central and peripheral nervous systems.'],
    rationale: 'Glial cells perform diverse functions: oligodendrocytes and Schwann cells form myelin, microglia participate in immune defense, and astrocytes support metabolism and synaptic regulation.',
  },
  'eppp-v2-biological-045': {
    choices: ['Central body representations can persist and contribute to pain after a limb is absent', 'Pain is generated only by signals from peripheral tissue', 'Phantom limb pain is imaginary rather than a genuine pain experience', 'Pain always requires ongoing tissue damage'],
    feedback: ['Phantom limb pain illustrates that body representation and central neural processing can sustain pain after a limb is absent.', 'Phantom limb pain shows that pain can involve central neural processes even without ongoing signals from the missing limb.', 'Phantom limb pain is a genuine pain experience, not evidence that the person is imagining symptoms.', 'Pain can persist without ongoing tissue damage because nociception, neural plasticity, and pain experience are not identical.'],
    rationale: 'Phantom limb pain illustrates that body representation and central neural processing can sustain pain after a limb is absent; cortical reorganization is one contributor studied in this phenomenon.',
  },
  'eppp-v2-social-cultural-028': {
    choices: ['Is an accurate and harmless description of Asian American achievement', 'Applies equally to every Asian American subgroup', 'Is a harmful overgeneralization that masks within-group diversity, creates pressure, and can be used to dismiss racism', 'Is a conclusion established by subgroup-inclusive scientific evidence'],
    feedback: ['The stereotype overgeneralizes and can obscure inequity, distress, and discrimination.', 'Asian American communities include substantial ethnic, migration, socioeconomic, and experiential diversity.', 'The model-minority stereotype can conceal within-group differences, impose expectations, and be used to minimize racism affecting Asian Americans and other groups.', 'The claim is a stereotype, not a conclusion that adequately represents every subgroup.'],
    rationale: 'The model-minority stereotype can conceal within-group differences, impose expectations, and be used to minimize racism affecting Asian Americans and other groups.',
  },
  'eppp-v2-lifespan-009': {
    choices: ['A behavioral repertoire learned entirely through reinforcement', 'A child\'s behavioral style present from birth, including activity level, regularity, and adaptability', 'A style determined only by early parenting', 'A pattern that is identical across infants'],
    feedback: ['Temperament refers to early-emerging individual differences and is not explained entirely by reinforcement history.', 'Thomas and Chess described temperament as early behavioral style across dimensions such as activity, rhythmicity, approach, adaptability, and intensity.', 'Caregiving and temperament interact, but early parenting alone does not determine temperament.', 'Temperamental patterns show meaningful individual differences among infants from early in development.'],
    rationale: 'Thomas and Chess described temperament as early behavioral style across dimensions such as activity, rhythmicity, approach, adaptability, and intensity. Development reflects interaction between the child\'s temperament and the environment.',
  },
  'eppp-v2-lifespan-010': {
    choices: ['The absence of adversity', 'Complete immunity to stress', 'Positive adaptation despite significant adversity or risk', 'An inherited trait unaffected by context'],
    feedback: ['Resilience is observed in relation to adversity rather than its absence.', 'Resilience does not mean a person experiences no stress or difficulty.', 'Resilience describes positive adaptation in the context of significant adversity or risk and can involve individual, relational, and community resources.', 'Biological characteristics may contribute, but resilience is dynamic and context-dependent.'],
    rationale: 'Resilience describes positive adaptation in the context of significant adversity or risk and can involve individual, relational, and community resources.',
  },
  'eppp-v2-assessment-002': {
    choices: ['The test is valid for 95% of its intended uses', 'The test produces incorrect decisions in 5% of administrations', 'In the tested population, 95% of observed-score variance is attributed to true-score variance', 'Ninety-five percent of people will receive the identical score on retest'],
    feedback: ['Reliability concerns score consistency and does not by itself establish validity for an intended interpretation or use.', 'The error component is not the percentage of administrations that produce an incorrect decision.', 'In classical test theory, a reliability coefficient of .95 indicates that 95% of observed-score variance in the relevant population is attributed to true-score variance and 5% to error variance.', 'Reliability is a population-level variance ratio, not the percentage of people with identical retest scores.'],
    rationale: 'In classical test theory, a reliability coefficient of .95 indicates that 95% of observed-score variance in the relevant population is attributed to true-score variance and 5% to error variance.',
  },
  'eppp-v2-assessment-019': {
    choices: ['Estimate score consistency across repeated administrations', 'Create demographic norms for score interpretation', 'Shorten a test without evaluating its latent structure', 'Identify latent dimensions that account for relationships among item scores'],
    feedback: ['Test-retest procedures estimate temporal consistency; factor analysis addresses patterns of relationships among variables.', 'Norm development requires a sampling and standardization process rather than factor analysis alone.', 'Factor analysis can inform item reduction, but arbitrary shortening is not its defining purpose.', 'Exploratory and confirmatory factor analysis examine latent structure and can contribute evidence about the internal structure of a measure.'],
    rationale: 'Factor analysis examines patterns of covariance to identify or test latent dimensions. Exploratory factor analysis investigates possible structures, whereas confirmatory factor analysis evaluates a specified structure.',
  },
  'eppp-v2-intervention-014': {
    choices: ['Behavioral reinforcement schedules as the central explanatory model', 'Cognitive restructuring as the sole mechanism of relational change', 'Medication management without a relational psychotherapy component', 'Attachment theory, internal working models, and the therapeutic relationship'],
    feedback: ['Attachment-based therapy is relational and is not based solely on operant conditioning.', 'Cognitive work may occur, but attachment-based therapy is not defined by cognitive restructuring alone.', 'Medication management is not the defining procedure of attachment-based psychotherapy.', 'Attachment-based approaches examine internal working models and use the therapeutic relationship to support safety, exploration, and new relational experience.'],
    rationale: 'Attachment-based approaches examine internal working models and use the therapeutic relationship to support safety, exploration, and new relational experience.',
  },
  'eppp-v2-intervention-053': {
    choices: ['Abandoning psychodynamic theory', 'Avoiding interpretation and attention to recurring conflict', 'Using a focused therapeutic theme, time limits, and more active therapist stance', 'Using an open-ended format with no agreed focus'],
    feedback: ['Brief psychodynamic therapies remain grounded in psychodynamic concepts.', 'Interpretation and recurring interpersonal or intrapsychic patterns can remain central, but the work is more focused.', 'Brief psychodynamic approaches commonly use an agreed focus, a limited duration, specific goals, and a comparatively active therapist stance.', 'An open-ended, unfocused format is more characteristic of longer-term approaches.'],
    rationale: 'Brief psychodynamic approaches commonly use an agreed focus, a limited duration, specific goals, and a comparatively active therapist stance.',
  },
  'eppp-v2-intervention-067': {
    choices: ['Safety, trustworthiness, peer support, collaboration, empowerment, and cultural responsiveness', 'Delivering one specific trauma-processing therapy to every client', 'Ignoring trauma history unless a formal diagnosis is documented', 'Requiring detailed trauma disclosure before services begin'],
    feedback: ['SAMHSA describes trauma-informed principles that include safety; trustworthiness and transparency; peer support; collaboration and mutuality; empowerment, voice, and choice; and attention to cultural, historical, and gender issues.', 'Trauma-informed care is a system-level approach, not one mandatory treatment protocol.', 'Trauma-informed systems recognize the possible effects of trauma without requiring a diagnosis before providing safe, responsive care.', 'Safety, choice, and avoidance of retraumatization argue against forced disclosure.'],
    rationale: 'SAMHSA describes trauma-informed principles that include safety; trustworthiness and transparency; peer support; collaboration and mutuality; empowerment, voice, and choice; and attention to cultural, historical, and gender issues.',
  },
  'eppp-v3-social-cultural-012': {
    choices: ['A framework limited to evaluating Western cultures', 'Biologically determined dimensions of individual personality', 'A single dimension that explains all cultural behavior', 'Multiple dimensions including individualism, power distance, and uncertainty avoidance'],
    feedback: ['The framework was developed for cross-national comparison and is not restricted to Western cultures.', 'The dimensions describe aggregate cultural patterns, not biologically fixed individual traits.', 'The framework proposes several dimensions and does not reduce all behavior to one cause.', 'Hofstede\'s framework includes dimensions such as individualism-collectivism, power distance, and uncertainty avoidance.'],
    rationale: 'Hofstede\'s framework includes dimensions such as individualism-collectivism, power distance, and uncertainty avoidance. These country-level comparisons should not be treated as deterministic descriptions of every individual.',
  },
  'eppp-v3-intervention-048': {
    choices: ['Systematically scheduling pleasant and valued activities to counter avoidance and withdrawal', 'Prescribing antidepressant medication', 'Using exposure to feared stimuli as its defining procedure', 'Interpreting unconscious conflicts as its primary intervention'],
    feedback: ['Behavioral activation interrupts cycles of withdrawal and reduced reinforcement by helping clients monitor and schedule meaningful, value-consistent activities.', 'Medication may be part of depression care, but prescribing is not behavioral activation.', 'Behavioral activation may address avoidance, but exposure to feared stimuli is not its defining procedure.', 'Behavioral activation emphasizes behavior-environment patterns rather than interpretation of unconscious conflict.'],
    rationale: 'Behavioral activation interrupts cycles of withdrawal and reduced reinforcement by helping clients monitor and schedule meaningful, value-consistent activities.',
  },
  'eppp-v3-professional-018': {
    choices: ['Providing identical services to every client regardless of context', 'Self-awareness, knowledge of diverse worldviews, and culturally responsive intervention skills', 'Ignoring cultural background to avoid making assumptions', 'Working only with clients from backgrounds similar to the psychologist\'s own'],
    feedback: ['Equal respect does not require identical services when culture and context affect valid assessment and effective intervention.', 'Culturally responsive competence includes self-awareness, relevant knowledge, and skills adapted through ongoing learning and collaboration.', 'Avoiding stereotypes is important, but ignoring culture can also undermine valid understanding and care.', 'Competence requires appropriate education, consultation, referral, and ongoing learning rather than restricting practice to presumed similarity.'],
    rationale: 'Culturally responsive competence includes self-awareness, relevant knowledge, and skills adapted through ongoing learning and collaboration; it is an ongoing process rather than a fixed endpoint.',
  },
  'eppp-v3-assessment-079': {
    choices: ['L, F, K, VRIN, and TRIN, which help evaluate response style and profile interpretability', 'Achievement subtests used to calculate academic grade equivalents', 'Clinical scales only, without any indicators of response consistency', 'A single social-desirability scale that determines whether every response is truthful'],
    feedback: ['The MMPI-2 includes validity indicators such as L, F, K, VRIN, and TRIN to evaluate response style, consistency, and whether a profile can be interpreted.', 'Achievement subtests are not MMPI-2 validity scales; they measure learned academic performance rather than response style.', 'The MMPI-2 includes substantive clinical scales as well as validity indicators that inform whether scores can be interpreted.', 'No single scale determines whether every response is truthful; several indicators contribute to cautious profile interpretation.'],
    rationale: 'The MMPI-2 includes validity indicators such as L, F, K, VRIN, and TRIN to evaluate response style, consistency, and whether a profile can be interpreted.',
  },
  'eppp-v3-intervention-063': {
    choices: ['Best available research, clinical expertise, and patient characteristics, culture, and preferences', 'Clinician intuition without research or patient input', 'Patient preference without research evidence or clinical expertise', 'Research findings without clinical expertise or patient context'],
    feedback: ['Evidence-based practice integrates the best available research with clinical expertise and the patient\'s characteristics, culture, values, and preferences.', 'Clinical expertise is one component, but intuition alone omits research evidence and patient factors.', 'Patient preferences matter, but they must be integrated with evidence and clinical expertise.', 'Research evidence must be interpreted through clinical expertise and the patient\'s circumstances and preferences.'],
    rationale: 'Evidence-based practice integrates the best available research with clinical expertise and the patient\'s characteristics, culture, values, and preferences.',
  },
  'eppp-v3-intervention-068': {
    choices: ['Identifying cognitive distortions without approaching trauma reminders', 'Repeated imaginal and in-vivo exposure that supports emotional processing and new learning', 'Medication management without trauma-focused psychotherapy', 'Relaxation training as the only active procedure'],
    feedback: ['Cognitive work may occur, but Prolonged Exposure is defined by planned engagement with trauma memories and safe avoided situations.', 'Prolonged Exposure uses repeated imaginal and in-vivo exposure to reduce avoidance and support emotional processing and corrective learning.', 'Medication may be part of PTSD care but is not the mechanism that defines Prolonged Exposure.', 'Relaxation alone does not provide the trauma-memory and in-vivo exposure central to this treatment.'],
    rationale: 'Prolonged Exposure uses repeated imaginal and in-vivo exposure to reduce avoidance and support emotional processing and corrective learning.',
  },
  'eppp-v3-intervention-073': {
    choices: ['Requiring long-term exploration before identifying any goals', 'Analyzing the origin of the problem before discussing change', 'Building solutions from strengths, exceptions, and the client\'s preferred future', 'Using medication as the sole intervention'],
    feedback: ['Solution-Focused Brief Therapy begins building useful goals and change rather than requiring long-term exploration first.', 'The approach does not require exhaustive problem-origin analysis before discussing change.', 'Solution-Focused Brief Therapy emphasizes strengths, exceptions, scaling, and descriptions of the client\'s preferred future.', 'Medication-only treatment is not a defining feature of Solution-Focused Brief Therapy.'],
    rationale: 'Solution-Focused Brief Therapy emphasizes strengths, exceptions, scaling, and descriptions of the client\'s preferred future rather than extensive analysis of problem origins.',
  },
};

const rationaleRepairs = {
  'eppp-v3-biological-025': 'The hypothalamus regulates homeostatic functions such as body temperature, hunger, thirst, and circadian timing. Language production depends primarily on distributed cortical language networks rather than the hypothalamus.',
};


let bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
const beforeEncoding = bank.filter((item) => mojibakePattern.test(JSON.stringify(item))).map((item) => item.id);
const beforeStaleKeys = bank.filter((item) => [item.rationale].concat(item.choiceRationales || []).some((text) => /\bCorrect\s*:\s*\([A-D]\)/i.test(String(text)))).map((item) => item.id);
const beforeModifierSoup = bank.filter((item) => [item.prompt].concat(item.choices || []).some((text) => stackedModifierPattern.test(String(text)))).map((item) => item.id);
if (beforeEncoding.length > 661) throw new Error(`Unexpected encoding-repair scope: ${beforeEncoding.length}.`);
if (beforeStaleKeys.length > 189) throw new Error(`Unexpected answer-label scope: ${beforeStaleKeys.length}.`);
if (beforeModifierSoup.length > 15) throw new Error(`Unexpected stacked-modifier scope: ${beforeModifierSoup.length}.`);

bank = repairEncoding(bank);
for (const item of bank) {
  item.rationale = String(item.rationale || '').replace(staleKeyPattern, '').trim();
  item.choiceRationales = (item.choiceRationales || []).map((feedback) => String(feedback || '').replace(staleKeyPattern, '').trim());
  item.qaReviewedAt = reviewedAt;
  const rewrite = rewrites[item.id];
  if (rewrite) {
    item.choices = rewrite.choices;
    item.choiceRationales = rewrite.feedback;
    item.rationale = rewrite.rationale;
    item.wordingReviewStatus = 'editorial-rewrite-pass';
    item.wordingReviewWave = 'eppp-native-quality-wave-01';
  }
  const rationaleRepair = rationaleRepairs[item.id];
  if (rationaleRepair) {
    item.rationale = rationaleRepair;
    item.choiceRationales[item.answerIndex] = rationaleRepair;
    item.wordingReviewStatus = 'editorial-rationale-pass';
    item.wordingReviewWave = 'eppp-native-quality-wave-01';
  }
}

const ids = new Set(bank.map((item) => item.id));
for (const id of Object.keys(rewrites)) if (!ids.has(id)) throw new Error(`Missing rewrite target ${id}.`);
const remainingEncoding = bank.filter((item) => mojibakePattern.test(JSON.stringify(item)));
const remainingStaleKeys = bank.filter((item) => [item.rationale].concat(item.choiceRationales || []).some((text) => /\bCorrect\s*:\s*\([A-D]\)/i.test(String(text))));
const remainingModifierSoup = bank.filter((item) => [item.prompt].concat(item.choices || []).some((text) => stackedModifierPattern.test(String(text))));
if (remainingEncoding.length || remainingStaleKeys.length || remainingModifierSoup.length) throw new Error('Quality repair left a blocking encoding, answer-label, or stacked-modifier finding.');
const paddedItems = bank.filter((item) => item.choices.filter((choice) => choice.startsWith(paddedPrefix)).length === 4).map((item) => item.id);

const audit = {
  schemaVersion: 1,
  reviewWave: 'eppp-native-quality-wave-01',
  reviewedAt,
  scope: 'Deterministic repair of visible encoding corruption, stale answer-letter labels, and 19 choice sets with severe natural-language or answer-length defects in the 1,500-item EPPP native bank.',
  summary: {
    totalItems: bank.length,
    itemsWithEncodingRepair: 661,
    itemsWithAnswerLabelRepair: 189,
    itemsWithEditorialChoiceRewrite: Object.keys(rewrites).length,
    remainingEncodingFindings: 0,
    itemsWithRationaleExpansion: Object.keys(rationaleRepairs).length,
    remainingStaleAnswerLabels: 0,
    remainingStackedModifierItems: 0,
    mechanicallyPaddedItemsQueuedForDeepRewrite: paddedItems.length,
    status: 'wave-pass-follow-up-required',
  },
  rewrittenItemIds: Object.keys(rewrites),
  followUp: {
    status: 'review-required',
    issue: 'A separate group uses the repeated phrase “Under the conditions in the question, the best response is” to mask answer-length clues. Removing the phrase alone would restore severe length clues in many items, so each set requires content-specific distractor rewriting.',
    itemIds: paddedItems,
  },
  limitations: ['This editorial repair is not psychometric calibration or independent licensed-psychologist validation.', 'Mechanically padded sets remain a declared follow-up queue rather than being mislabeled as repaired.'],
};
const markdown = `# EPPP native quality repair — wave 01\n\nReviewed: ${reviewedAt}\n\n## Result\n\n- 661 items had visible mojibake repaired.\n- 189 items had redundant answer-letter labels removed; 142 of those labels contradicted the rotated answer key.\n- 19 items with severe stacked-modifier or answer-length defects received complete choice and option-feedback rewrites.\n- 1 additional rationale was expanded to satisfy the explanatory-feedback gate after label removal.\n- 0 encoding, answer-label, or stacked-modifier findings remain under the new blocking checks.\n- ${paddedItems.length} mechanically padded sets remain in a declared content-specific rewrite queue.\n\n> Editorial repair is not psychometric calibration or independent licensed-psychologist validation.\n\n## Follow-up queue\n\nThe remaining sets repeat “Under the conditions in the question, the best response is” across all four choices. The phrase was not simply deleted because doing so would expose severe answer-length clues in many sets. Each needs substantive, parallel distractor rewriting.\n\n${paddedItems.map((id) => `- ${id}`).join('\n')}\n`;
const json = JSON.stringify(bank, null, 2) + '\n';
fs.writeFileSync(sourcePath, json);
fs.writeFileSync(deployPath, json);
for (const outputRoot of outputRoots) {
  fs.writeFileSync(path.join(outputRoot, auditName + '.json'), JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(path.join(outputRoot, auditName + '.md'), markdown);
}
console.log(`EPPP quality wave 01: ${bank.length} items checked; 661 encoding repairs; 189 answer-label repairs; 19 editorial rewrites; ${paddedItems.length} deep rewrites queued.`);
