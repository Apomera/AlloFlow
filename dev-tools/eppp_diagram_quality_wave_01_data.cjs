#!/usr/bin/env node
'use strict';

const reviewWave = 'eppp-diagram-review-wave-01';
const reviewDate = '2026-07-16';

const sourceRecords = {
  stressHippocampusReview: {
    title: 'Stress effects on the hippocampus: a critical review',
    organization: 'Progress in Neuro-Psychopharmacology & Biological Psychiatry; PubMed Central, U.S. National Library of Medicine (2015)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4561403/',
    whyReputable: 'This peer-reviewed critical review evaluates human and animal evidence about stress-related hippocampal structural and functional change. PubMed Central supplies stable full text and traceable publication metadata; the review supports qualified associations rather than deterministic claims.',
  },
  hpaMechanismReview: {
    title: 'Regulation of the Hypothalamic-Pituitary-Adrenocortical Stress Response',
    organization: 'Comprehensive Physiology; PubMed, U.S. National Library of Medicine (2016)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27065163/',
    whyReputable: 'This peer-reviewed mechanistic review explains CRH, ACTH, adrenal glucocorticoid secretion, feedback regulation, and adaptation of the hypothalamic-pituitary-adrenocortical response. PubMed provides traceable journal and author metadata for the cascade shown.',
  },
  openStaxMemory: {
    title: 'Psychology: How Memory Functions',
    organization: 'OpenStax, Rice University',
    url: 'https://openstax.org/books/psychology/pages/8-1-how-memory-functions',
    whyReputable: 'OpenStax is Rice University’s nonprofit educational publisher. Its expert-authored, peer-reviewed psychology text identifies the Atkinson–Shiffrin framework as a stage model and distinguishes sensory, short-term, and long-term storage for foundational instruction.',
  },
  cowanCapacity: {
    title: 'The magical number 4 in short-term memory: A reconsideration of mental storage capacity',
    organization: 'Behavioral and Brain Sciences; PubMed, U.S. National Library of Medicine (2001)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/11515286/',
    whyReputable: 'Cowan’s peer-reviewed theoretical review is a widely cited reappraisal of short-term-memory capacity. The PubMed record makes the journal, author, and publication details traceable and supports avoiding an unqualified seven-plus-or-minus-two rule.',
  },
  statPearlsMaoi: {
    title: 'Monoamine Oxidase Inhibitors (MAOIs)',
    organization: 'StatPearls, NCBI Bookshelf, U.S. National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK539848/',
    whyReputable: 'This clinician-authored and medically reviewed NCBI Bookshelf chapter describes monoamine oxidase as an intracellular mitochondrial enzyme and explains how MAO inhibitors reduce monoamine metabolism. It is an appropriate mechanism-level clinical reference.',
  },
  antidepressantMechanisms: {
    title: 'How antidepressant drugs act: A primer on neuroplasticity as the eventual mediator of antidepressant efficacy',
    organization: 'Indian Journal of Psychiatry; PubMed Central, U.S. National Library of Medicine (2010)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3025168/',
    whyReputable: 'This peer-reviewed review separates acute monoamine actions from downstream adaptations associated with therapeutic effects. PubMed Central provides the full article and publication metadata, supporting a mechanism description that does not collapse all antidepressants into generic neurotransmitter activity.',
  },
  visualPathway: {
    title: 'Neuroanatomy, Visual Pathway',
    organization: 'StatPearls, NCBI Bookshelf, U.S. National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK553189/',
    whyReputable: 'This clinician-authored and medically reviewed NCBI Bookshelf chapter traces retinal projections through the optic chiasm, tracts, lateral geniculate nuclei, optic radiations, and visual cortex. It directly supports the crossing and laterality labels in the diagram.',
  },
  hemianopsia: {
    title: 'Hemianopsia',
    organization: 'StatPearls, NCBI Bookshelf, U.S. National Library of Medicine',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK562262/',
    whyReputable: 'This clinician-authored and medically reviewed NCBI Bookshelf chapter relates lesion location to visual-field patterns, including homonymous hemianopia and quadrantanopia. It supports stating that a postchiasmal deficit depends on the location and extent of injury.',
  },
  openStaxFreud: {
    title: 'Psychology 2e: Freud and the Psychodynamic Perspective',
    organization: 'OpenStax, Rice University',
    url: 'https://openstax.org/books/psychology-2e/pages/11-2-freud-and-the-psychodynamic-perspective',
    whyReputable: 'OpenStax is Rice University’s nonprofit educational publisher. This expert-authored, peer-reviewed chapter presents the id, ego, superego, and levels of consciousness as Freud’s historical theory while explicitly noting the limited modern research support for many Freudian ideas.',
  },
  freudMuseumModels: {
    title: 'What is Psychoanalysis? – The Ego, the Id and the Superego',
    organization: 'Freud Museum London educational resources',
    url: 'https://www.freud.org.uk/schools/resources/what-is-psychoanalysis-part-4-the-ego-the-id-and-the-superego/',
    whyReputable: 'The Freud Museum London preserves and interprets Freud’s historical work. Its educational resource directly distinguishes the topographic and structural models and explains that they do not map one-to-one, making it a strong primary-institution source for faithful historical labeling rather than evidence of modern validity.',
  },
  openStaxKohlberg: {
    title: 'Lifespan Development: Cognitive Development in Early Adulthood',
    organization: 'OpenStax, Rice University',
    url: 'https://openstax.org/books/lifespan-development/pages/11-4-cognitive-development-in-early-adulthood',
    whyReputable: 'OpenStax is Rice University’s nonprofit educational publisher. This expert-reviewed lifespan text summarizes Kohlberg’s proposed moral-reasoning levels and discusses cultural, sampling, justice-orientation, and care-orientation limitations instead of treating age labels as fixed rules.',
  },
  moralOrientationMetaAnalysis: {
    title: 'Gender differences in moral orientation: A meta-analysis',
    organization: 'Psychological Bulletin; PubMed, U.S. National Library of Medicine (2000)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/10989620/',
    whyReputable: 'This peer-reviewed meta-analysis by Jaffee and Hyde synthesized empirical studies of care and justice orientations. Its PubMed-indexed record supports the conclusion that average gender differences were small, contradicting a uniform women-use-care claim.',
  },
  aschPrimary: {
    title: 'Studies of independence and conformity: I. A minority of one against a unanimous majority',
    organization: 'Psychological Monographs: General and Applied, American Psychological Association (Asch, 1956)',
    url: 'https://doi.org/10.1037/h0093718',
    whyReputable: 'This is Solomon Asch’s primary published report of the line-judgment experiments, linked by its persistent DOI. It is the direct source for the 36.8% critical-trial yielding result and for distinguishing majority pressure from inevitable participant conformity.',
  },
};

function withSources(record, sourceKeys) {
  const sourceDetails = sourceKeys.map((key) => sourceRecords[key]);
  return {
    ...record,
    references: sourceDetails.map((source) => source.url),
    sourceDetails,
  };
}

const commonChecks = {
  textAlternative: 'editorial-pass',
  reducedMotion: 'shared-renderer-pass',
  keyboardDependency: 'shared-renderer-pass',
  conceptAccuracy: 'assisted-editorial-pass-expert-pending',
  labelQuality: 'editorial-pass',
  sourceSupport: 'topically-aligned-reputable-source',
  expertReview: 'pending-independent-review',
};

const corrections = [
  withSources({
    key: 'hpaAxis',
    correctionSummary: 'Replaced deterministic hippocampal-damage and disorder language with a qualified association and replaced a simplistic cortisol-effects list with an energy-mobilization and feedback description.',
    historicalContext: 'not-applicable',
    replacements: [
      { from: '↑HR ↑glucose ↓immunity ↓digestion', to: 'mobilizes energy; feeds back on CRH/ACTH' },
      { from: 'Sustained cortisol →', to: 'Prolonged stress may' },
      { from: 'hippocampal damage,', to: 'alter HPA function and' },
      { from: 'depression, anxiety', to: 'hippocampal processes' },
      {
        from: '🔴 The HPA axis stress cascade: Hypothalamus → CRH → Pituitary → ACTH → Adrenal Cortex → Cortisol. The red dashed line shows the negative feedback loop. Chronic activation leads to hippocampal damage and mood disorders.',
        to: '🔴 The HPA axis stress cascade: hypothalamic CRH stimulates pituitary ACTH, which stimulates adrenal-cortex cortisol release; cortisol participates in negative feedback. Prolonged or dysregulated stress-system activity is associated with hippocampal structural and functional changes and greater risk for stress-related disorders, but it does not determine that a person will develop a disorder.',
      },
    ],
  }, ['stressHippocampusReview', 'hpaMechanismReview']),
  withSources({
    key: 'memoryModel',
    correctionSummary: 'Reframed the figure as the historical modal model, removed the unqualified 7±2 capacity rule, separated short-term storage from modern working-memory models, and removed claims that sensory traces are exact or long-term memories permanent.',
    historicalContext: 'editorial-pass',
    replacements: [
      { from: 'Information Processing Model of Memory (Atkinson & Shiffrin)', to: 'Atkinson–Shiffrin Modal Model of Memory' },
      { from: 'Large cap, &lt;1-3 sec', to: 'Brief sensory register' },
      { from: '>Short-Term /</text>', to: '>Short-Term</text>' },
      { from: '>Working</text>', to: '>Store</text>' },
      { from: '7±2 items, 15-30s', to: 'Limited, brief holding' },
      { from: 'Infinite cap, Permanent', to: 'Large capacity, durable' },
      {
        from: '🧠 The Atkinson-Shiffrin 3-Stage Memory Model. Sensory memory briefly holds exact environmental info. Paying ATTENTION moves it to Short-Term Memory (STM) where it loops via rehearsal. ENCODING moves it to permanent Long-Term Memory (LTM), and RETRIEVAL brings it back to STM for use.',
        to: '🧠 The Atkinson–Shiffrin modal model is a historical, simplified framework: sensory registers briefly retain incoming information; attention supports transfer to a limited short-term store; and rehearsal or other control processes can support encoding and retrieval. Long-term storage can be durable but is not guaranteed permanent, and modern working-memory models add processes not shown in this three-store flow.',
      },
    ],
  }, ['openStaxMemory', 'cowanCapacity']),
  withSources({
    key: 'synapseDrugs',
    correctionSummary: 'Placed monoamine oxidase inside the presynaptic terminal, distinguished serotonin-transporter inhibition from intracellular monoamine-metabolism inhibition, and removed the claim that the two classes simply create the same generic increase in neurotransmitter activity.',
    historicalContext: 'not-applicable',
    replacements: [
      { from: 'Synaptic Transmission & Psychotropics', to: 'Selected Antidepressant Mechanisms' },
      { from: 'SSRI (e.g., Prozac)', to: 'SSRI (e.g., fluoxetine)' },
      { from: 'Blocks reuptake pump', to: 'Inhibits serotonin reuptake' },
      { from: '<circle cx="380" cy="220" r="15"', to: '<circle cx="380" cy="165" r="15"' },
      { from: '<text x="380" y="224" text-anchor="middle" fill="#eab308" font-size="10" font-weight="bold">MAO</text>', to: '<text x="380" y="169" text-anchor="middle" fill="#eab308" font-size="10" font-weight="bold">MAO</text>\n                <text x="380" y="189" text-anchor="middle" fill="#fde68a" font-size="8">intracellular</text>' },
      { from: '<!-- Destroying NT -->', to: '<!-- Intracellular metabolism of monoamines -->' },
      { from: '<line x1="330" y1="230" x2="365" y2="225"', to: '<line x1="345" y1="145" x2="365" y2="160"' },
      { from: '<rect x="420" y="210" width="40" height="20"', to: '<rect x="420" y="155" width="40" height="20"' },
      { from: '<text x="470" y="215" fill="#fca5a5"', to: '<text x="470" y="160" fill="#fca5a5"' },
      { from: '<text x="470" y="230" fill="#fca5a5" font-size="9">Blocks breakdown</text>', to: '<text x="470" y="175" fill="#fca5a5" font-size="9">Inhibits monoamine metabolism</text>' },
      { from: '<line x1="420" y1="220" x2="395" y2="220"', to: '<line x1="420" y1="165" x2="395" y2="165"' },
      { from: 'Both SSRIs and MAOIs result in MORE neurotransmitter (like serotonin)', to: 'SSRIs inhibit serotonin reuptake at the transporter.' },
      { from: 'remaining in the synaptic cleft to bind to postsynaptic receptors.', to: 'MAOIs inhibit intracellular metabolism of monoamines.' },
      {
        from: '💊 Synaptic Transmission & Drug Mechanisms. SSRIs (like Prozac) block the reuptake pump, keeping more serotonin in the synapse. MAOIs block the monoamine oxidase (MAO) enzyme from destroying neurotransmitters. Both effectively increase neurotransmitter activity.',
        to: '💊 Selected antidepressant mechanisms. SSRIs inhibit the serotonin transporter and reduce serotonin reuptake. Monoamine oxidase is an intracellular, mitochondrial enzyme; MAOIs inhibit monoamine metabolism. These are distinct acute mechanisms, and therapeutic effects involve downstream adaptations rather than one interchangeable increase in generic “neurotransmitter activity.”',
      },
    ],
  }, ['statPearlsMaoi', 'antidepressantMechanisms']),
  withSources({
    key: 'visualPathway',
    correctionSummary: 'Clarified which retinal fibers cross and replaced the claim that every postchiasmal lesion removes an entire visual field with lesion-location and lesion-extent dependent homonymous defects.',
    historicalContext: 'not-applicable',
    replacements: [
      {
        from: '👁️ The Visual Pathway. Note the contralateral processing: The entirely LEFT Visual Field (Blue) hits the nasal retina of the left eye and temporal retina of the right eye, crossing at the Optic Chiasm to be processed in the RIGHT Occipital Lobe. Conversely, the entirely RIGHT Visual Field (Red) is processed in the LEFT Occipital Lobe. Damage before the chiasm affects one eye; damage after the chiasm affects one entire visual field.',
        to: '👁️ The visual pathway. Information from the left visual hemifield falls on the left nasal retina and right temporal retina. Nasal retinal axons cross at the optic chiasm while temporal retinal axons remain ipsilateral, bringing left-field information into the right postchiasmal pathway; the reverse applies to the right field. Prechiasmal lesions can produce monocular deficits. Postchiasmal lesions produce contralateral homonymous field defects whose extent depends on lesion site and completeness; optic-radiation lesions can produce quadrantanopia rather than loss of an entire hemifield.',
      },
    ],
  }, ['visualPathway', 'hemianopsia']),
  withSources({
    key: 'freudIceberg',
    correctionSummary: 'Labeled the figure as a historical theoretical metaphor, distinguished structural constructs from levels of consciousness, and removed wording that presented the id as a literal hidden brain structure.',
    historicalContext: 'editorial-pass',
    replacements: [
      { from: "Freud's Structural Model (The Iceberg)", to: "Freud's Historical Model (Iceberg Metaphor)" },
      { from: '>Completely hidden</text>', to: '>In Freud’s theory</text>' },
      { from: '>Basic biological urges</text>', to: '>Theoretical drives</text>' },
      {
        from: "🧊 Freud\\'s Structural Iceberg Model. The Ego represents conscious reality, the Superego spans all levels to represent morality, and the Id operates completely unconsciously on the pleasure principle. Water level indicates the threshold of consciousness.",
        to: '🧊 Historical theory, not an anatomical map. This teaching metaphor combines Freud’s structural constructs (id, ego, and superego) with the related topographic ideas of conscious, preconscious, and unconscious mental life. It is useful for recognizing Freudian terminology, but these constructs should not be presented as literal brain regions or as conclusions established by modern empirical research.',
      },
    ],
  }, ['openStaxFreud', 'freudMuseumModels']),
  withSources({
    key: 'kohlbergMoral',
    correctionSummary: 'Removed fixed childhood/adolescent/adult labels, framed the sequence as a proposed model of moral reasoning, modernized the stage-three label, and replaced a binary gender claim with the meta-analytic finding of small average differences.',
    historicalContext: 'editorial-pass',
    replacements: [
      { from: "Kohlberg's Stages of Moral Development", to: "Kohlberg's Proposed Stages of Moral Reasoning" },
      { from: '(Childhood - Self Focus)', to: '(Consequences / self-interest)' },
      { from: '(Adolescent - Society Focus)', to: '(Approval / social order)' },
      { from: '(Adult - Principles Focus)', to: '(Rights / principles)' },
      { from: 'Stage 3: Good Boy/Girl', to: 'Stage 3: Interpersonal Accord' },
      { from: 'Human Rights > Law', to: 'Rights can guide law reform' },
      { from: 'Stage 6: Univ. Principles', to: 'Proposed 6: Principles' },
      { from: '>"Life is sacred above</text>', to: '>General principles guide</text>' },
      { from: '>all other considerations."</text>', to: '>moral judgment.</text>' },
      { from: 'Increasing complexity of moral reasoning (Gilligan criticized this as male-biased)', to: 'Proposed progression in reasoning; age does not fix a person’s level' },
      {
        from: "⚖️ Kohlberg\\'s Stages of Moral Development. Focuses on the reasoning behind moral choices (like the Heinz Dilemma), not just the choice itself. Moves from avoiding punishment (Preconventional) to following society\\'s rules (Conventional) to personal, universal ethics (Postconventional). Carol Gilligan famously criticized Kohlberg for neglecting the \"ethics of care\" more prevalent in women.",
        to: '⚖️ Kohlberg’s framework classifies the reasoning used to justify moral choices, not whether a particular choice is correct. Its levels are not fixed to childhood, adolescence, and adulthood, and the proposed sequence is not a rule for every person or culture. Gilligan challenged its justice emphasis and sampling; a meta-analysis found only small average gender differences in care versus justice orientations, not a uniform women-use-care distinction.',
      },
    ],
  }, ['openStaxKohlberg', 'moralOrientationMetaAnalysis']),
  withSources({
    key: 'aschConformity',
    correctionSummary: 'Changed the statistic to Asch’s 36.8% of critical trials, emphasized that many judgments remained independent, qualified generalization beyond the classic conditions, and removed an animation that automatically made the participant choose the majority’s wrong line.',
    historicalContext: 'editorial-pass',
    replacements: [
      { from: 'Asch Conformity Experiment (1951)', to: 'Asch Line-Judgment Studies (1950s)' },
      { from: '70%, 80% { transform: translateY(-5px); fill: #EF4444; } /* Gives in to majority */', to: '70%, 80% { transform: translateY(-2px); fill: #F59E0B; } /* Response is not predetermined */' },
      {
        from: '@keyframes participantSpeech {\n                        0%, 60% { opacity: 0; content: "?"; }\n                        70%, 80% { opacity: 1; content: "Line 1"; }\n                        90%, 100% { opacity: 0; }\n                    }',
        to: '/* The participant’s answer is intentionally not animated or preselected. */',
      },
      { from: '<rect x="5" y="-35" width="30" height="18" class="asch-speech" style="animation: confederateSpeech 4s infinite 0.8s; stroke: #3B82F6;"/>', to: '<!-- Participant response intentionally not preselected. -->' },
      { from: '<text x="20" y="-22" class="asch-speech-text" style="animation: confederateSpeech 4s infinite 0.8s;">"...1"</text>', to: '<text x="20" y="-22" class="asch-text" font-size="9">answer varies</text>' },
      {
        from: '👥 Asch Conformity Experiment. Demonstrated the power of normative social influence. Participants conformed to the clearly incorrect majority answer on about 32% of trials. Conformity dropped sharply if even ONE confederate gave the correct answer (breaking unanimity) or if the participant could write their answer privately.',
        to: '👥 In Asch’s 1956 line-judgment report, participants yielded to a unanimous majority’s wrong answer on 36.8% of critical trials—not on all trials—and many judgments remained independent. Breaking unanimity and changing response conditions reduced yielding. The classic paradigm demonstrates majority influence under specified conditions; it does not imply that a participant will conform or establish one universal conformity rate across settings.',
      },
    ],
  }, ['aschPrimary']),
].map((item) => ({
  ...item,
  reviewStatus: 'source-reviewed-editorial-pass',
  reviewWave,
  reviewDate,
  reviewNote: `Diagram wording and labels were corrected for accuracy, nuance, source alignment, and learner interpretation. ${item.correctionSummary} Independent qualified expert validation remains pending.`,
  checks: { ...commonChecks, historicalContext: item.historicalContext },
}));

module.exports = { reviewWave, reviewDate, sourceRecords, corrections };
