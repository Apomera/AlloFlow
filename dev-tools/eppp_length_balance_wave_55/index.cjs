'use strict';

// EPPP Part 1 Length-Balance Wave 55 — 63 clean prose unpinned items,
// bringing EPPP Part 1 key=longest from 561/1500 (37.4%) down to 498/1500 (33.2%).
const revisions = [
  {
    id: 'eppp-v2-biological-001',
    answerIndex: 0,
    choices: [
      'Sympathetic threat-arousal and parasympathetic rest-and-digest branches',
      'The structural somatic branch managing movement and the central nervous system core',
      'Specialized afferent sensory pathways receiving input and efferent motor pathways',
      'The neurobiologically dominant left cortical hemisphere and right hemisphere system',
    ],
  },
  {
    id: 'eppp-v2-assessment-031',
    answerIndex: 3,
    choices: [
      'Verbal and nonverbal declarative memory capacity targeting hippocampal episodic encoding',
      'Enduring personality traits mapped onto the broad Five-Factor structural taxonomy model',
      'Academic achievement deficits covering reading syntax and multi-step arithmetic skills',
      'Executive flexibility, set-shifting, and abstract rule reasoning',
    ],
  },
  {
    id: 'eppp-v2-intervention-039',
    answerIndex: 0,
    choices: [
      'Repeated confrontation with feared cues and memories until distress habituates',
      'Cognitive restructuring of trauma-related core beliefs and rigid assumptions',
      'Medication regimens targeting autonomic nervous system hyperarousal symptoms',
      'Psychodynamic dream interpretation exploring symbolic repressed traumatic material',
    ],
  },
  {
    id: 'eppp-v2-assessment-034',
    answerIndex: 2,
    choices: [
      'An assessment instrument is far too difficult for most evaluated examinees',
      'Examinee raw scores group tightly around the mean in a normal bell curve',
      'Items are too easy to distinguish among strong high-scoring examinees',
      'The chosen psychometric scale includes too few questions for high reliability',
    ],
  },
  {
    id: 'eppp-b015-social-2',
    answerIndex: 2,
    choices: [
      'A distressing emotional memory fades gradually as the retention delay lengthens',
      'Individual effort drops when personal output is pooled inside a shared group task',
      'One vivid positive impression skews ratings on separate traits',
      'A person overestimates how widely peers share a private opinion or preference',
    ],
  },
  {
    id: 'eppp-b015-cognitive-2',
    answerIndex: 3,
    choices: [
      'Consciously recounting major plot events from a previously studied short story',
      'Recognizing a familiar name and identifying when and where it was first learned',
      'Deliberately recalling studied words from a memorized laboratory vocabulary list',
      'Faster word identification after prior exposure lacking conscious recall',
    ],
  },
  {
    id: 'eppp-b013-cognitive-2',
    answerIndex: 3,
    choices: [
      'Decorative visual graphics unrelated to the instructional goals of the lesson',
      'Avoidable visual search and integration strain caused by cluttered page layout',
      'Mental effort spent monitoring and regulating personal study motivation levels',
      'Task complexity from interacting elements relative to prior knowledge',
    ],
  },
  {
    id: 'eppp-v3-professional-048',
    answerIndex: 3,
    choices: [
      'Accurate descriptions of completed specialized postdoctoral training',
      'Accurate statements listing languages offered for clinical sessions',
      'Clear details explaining a legitimately offered sliding-fee policy',
      'Testimonials from current clients or vulnerable persons',
    ],
  },
  {
    id: 'eppp-v3-cognitive-affective-049',
    answerIndex: 3,
    choices: [
      'Recall works the same regardless of context cues present at study',
      'Visual cues support recall while verbal prompts rarely aid memory',
      'Different encoding strategies generate similarly helpful memory cues',
      'Recall improves when test cues match original study traces',
    ],
  },
  {
    id: 'eppp-b014-social-2',
    answerIndex: 2,
    choices: [
      'Accurately estimates a statistical link from representative data',
      'Confuses a linear correlation coefficient with a direct causal link',
      'Sees a stronger link between events than data support',
      'Fails to recall either of two routinely paired everyday events',
    ],
  },
  {
    id: 'eppp-v3-assessment-017',
    answerIndex: 2,
    choices: [
      'It measures one single isolated clinical construct',
      'It spans a narrow domain of structured test items',
      'It accurately clears people lacking the condition',
      'It accurately detects people who actually have the disorder',
    ],
  },
  {
    id: 'eppp-v2-social-cultural-020',
    answerIndex: 2,
    choices: [
      'Integration (actively keeping heritage and joining host life)',
      'Assimilation (adopting host customs while dropping heritage)',
      'Marginalization (disconnecting from heritage and host)',
      'Separation (affirming heritage customs while avoiding host)',
    ],
  },
  {
    id: 'eppp-v2-social-cultural-041',
    answerIndex: 3,
    choices: [
      'Having large crowds of onlookers nearby',
      'Diffusing responsibility across many observers',
      'Assuming another nearby witness will step in',
      'Clear urgency with one named helper',
    ],
  },
  {
    id: 'eppp-v2-lifespan-051',
    answerIndex: 3,
    choices: [
      'Being far too simple to score cleanly',
      'Including too few developmental stages',
      'Sampling predominantly female interview subjects',
      'Elevating abstract rules over relational care',
    ],
  },
  {
    id: 'eppp-v2-lifespan-025',
    answerIndex: 1,
    choices: [
      'Unfolds across diverse cultures or local groups',
      'Progresses smoothly or in discrete steps',
      'Stems mainly from heredity or upbringing',
      'Remains reversible or fixed after youth',
    ],
  },
  {
    id: 'eppp-v2-intervention-069',
    answerIndex: 2,
    choices: [
      'Initial first-onset depressive episodes',
      'Acute first-break psychotic episodes',
      'Recurrent depressive relapse',
      'Chronic alcohol use recurrence',
    ],
  },
  {
    id: 'eppp-v2-cognitive-affective-060',
    answerIndex: 1,
    choices: [
      'Explicit declarative recall store',
      'Implicit nondeclarative system',
      'Autobiographical episodic store',
      'General factual semantic store',
    ],
  },
  {
    id: 'eppp-v2-intervention-007',
    answerIndex: 0,
    choices: [
      'Noticing thoughts as passing mental events to lessen their grip on action',
      'Merging disparate cognitive schemas into one unified narrative of the self',
      'Increasing emotional entanglement with distressing thoughts toward catharsis',
      'Working aggressively to suppress or eliminate unpleasant cognitive thoughts',
    ],
  },
  {
    id: 'eppp-v2-intervention-052',
    answerIndex: 1,
    choices: [
      'Firmly challenging irrational beliefs tied to starting and continuing drug use',
      'Providing tangible rewards tied to verified objective abstinence',
      'Processing early childhood trauma linked theoretically to adult substance use',
      'Intensive group confrontation targeting the client’s defensive denial habits',
    ],
  },
  {
    id: 'eppp-v2-assessment-076',
    answerIndex: 2,
    choices: [
      'Validity remains a fixed trait of an instrument once one study has been published.',
      'A high reliability index proves that proposed interpretations of scores are sound.',
      'Evidence backs specific score uses for stated purposes and groups.',
      'Surface face validity suffices whenever examinees view the test items as relevant.',
    ],
  },
  {
    id: 'eppp-v3-professional-078',
    answerIndex: 1,
    choices: [
      'Condition urgent safety care on upfront payment before reviewing clinical context.',
      'Agree as early as feasible and keep fee practices lawful.',
      'Postpone disclosing ordinary session fees until therapy approaches termination.',
      'Adjust the diagnostic billing code whenever third-party payment looks more likely.',
    ],
  },
  {
    id: 'eppp-migrated-lifespan-1',
    answerIndex: 2,
    choices: [
      'Estimate an infant’s early cognitive ability using structured problem-solving tasks',
      'Assess stable infant temperament apart from any particular caregiver relationship',
      'Classify infant caregiver attachment across brief separations and reunions',
      'Screen broadly across early language, motor, and adaptive developmental skills',
    ],
  },
  {
    id: 'eppp-b016-social-2',
    answerIndex: 2,
    choices: [
      'Any explicit verbal disagreement arising between peers from different groups',
      'An intentional, openly acknowledged act of interpersonal racial discrimination',
      'A subtle slight or cue conveying a derogatory group message',
      'A defining clinical symptom associated with one specific personality disorder',
    ],
  },
  {
    id: 'eppp-v3-professional-002',
    answerIndex: 1,
    choices: [
      'Managing clinical fees and billing ledgers with detailed clerical precision',
      'Building trust, honoring duties, and clarifying professional roles',
      'Applying personal religious commitments across clinical client interactions',
      'Following agency procedures even when they conflict with ethical standards',
    ],
  },
  {
    id: 'eppp-v3-cognitive-affective-060',
    answerIndex: 1,
    choices: [
      'Applying abstract academic reasoning to difficult interpersonal disputes',
      'Perceiving, using, understanding, and regulating feelings',
      'Recalling textbook definitions of classic psychological emotion theories',
      'Maintaining aerobic physical fitness to stabilize daily mood and behavior',
    ],
  },
  {
    id: 'eppp-b017-assessment-3',
    answerIndex: 0,
    choices: [
      'Neuroticism, Extraversion, Openness, Agreeableness, Conscientiousness',
      'Verbal, perceptual, working-memory, processing-speed, and motor skills',
      'Mania, depression, psychosis, clinical anxiety, and alcohol dependence',
      'Sensitivity, specificity, reliability, validity, and diagnostic utility',
    ],
  },
  {
    id: 'eppp-b008-cognitive-1',
    answerIndex: 1,
    choices: [
      'The spacing effect across distributed classroom study sessions',
      'Representativeness paired with base-rate neglect',
      'State-dependent retrieval under matched internal mood states',
      'The mere-exposure effect after repeated neutral presentations',
    ],
  },
  {
    id: 'eppp-v2-assessment-025',
    answerIndex: 1,
    choices: [
      'Whether test scores were gathered in an outdoor setting',
      'Whether test scores predict everyday functioning',
      'Whether an inventory measures its stated construct',
      'How closely items correlate inside one test session',
    ],
  },
  {
    id: 'eppp-v3-social-cultural-011',
    answerIndex: 1,
    choices: [
      'Overestimate situational pressures for others’ actions',
      'Overestimate personal traits for others’ actions',
      'Underestimate one’s own everyday problem-solving skills',
      'Credit academic success to luck rather than hard effort',
    ],
  },
  {
    id: 'eppp-v2-intervention-043',
    answerIndex: 0,
    choices: [
      'Death, freedom, isolation, and meaning',
      'Id, ego, superego, and psychic libido',
      'Behavior, cognition, affect, and body',
      'Past, present, future, and timelessness',
    ],
  },
  {
    id: 'eppp-v3-assessment-049',
    answerIndex: 2,
    choices: [
      'Academic reading comprehension capacity alongside multi-step arithmetic reasoning',
      'Complex verbal working memory and semantic clustering of spoken story passages',
      'Visuospatial construction, planning organization, and nonverbal visual recall',
      'Broad personality integration parameters examining defenses against psychosis',
    ],
  },
  {
    id: 'eppp-v2-intervention-037',
    answerIndex: 2,
    choices: [
      'Giving up on personal values and surrendering to maladaptive cognitive patterns',
      'Enthusiastically endorsing painful events occurring across daily life changes',
      'Willingness to hold internal thoughts and feelings openly',
      'Passive resignation toward worsening physical or psychological clinical symptoms',
    ],
  },
  {
    id: 'eppp-v2-biological-030',
    answerIndex: 1,
    choices: [
      'Active forgetting and structured neurobiological decay of unused cortical pathways',
      'Memory encoding via lasting synaptic strengthening after repeated firing',
      'Circadian sleep-wake regulation and slow-wave cortical rhythm coordination',
      'Somatic pain signaling and ascending peripheral sensory relay to the cortex',
    ],
  },
  {
    id: 'eppp-v3-intervention-074',
    answerIndex: 3,
    choices: [
      'Classical psychoanalysis using dream interpretation and free association',
      'Gestalt therapy emphasizing present-centered awareness and active dialogue',
      'Person-centered therapy offering empathy and unconditional positive regard',
      'Rational emotive behavior therapy disputing irrational beliefs',
    ],
  },
  {
    id: 'eppp-v3-cognitive-affective-048',
    answerIndex: 2,
    choices: [
      'Distributed study benefits motor skills yet rarely helps verbal facts',
      'Massed cramming yields stronger recall after an extended retention gap',
      'Distributed study beats cramming for long-term recall',
      'Equal total study time yields matching recall across practice schedules',
    ],
  },
  {
    id: 'eppp-v3-cognitive-affective-054',
    answerIndex: 3,
    choices: [
      'Intentionally rehearsing vocabulary words for a later recall quiz',
      'Consciously describing a personally experienced childhood episode',
      'Deliberately recognizing facts learned during an earlier lecture',
      'Priming or motor skill gain lacking conscious recollection',
    ],
  },
  {
    id: 'eppp-v2-social-cultural-049',
    answerIndex: 3,
    choices: [
      'Attributing others’ actions mainly to situational cues',
      'Forming balanced causal judgments about peer behavior',
      'Attributing one’s own actions to internal dispositions',
      'Overweighting traits while discounting context',
    ],
  },
  {
    id: 'eppp-b014-cognitive-1',
    answerIndex: 1,
    choices: [
      'One deeply aversive initial encounter',
      'Repeated contact with a neutral stimulus',
      'Explicit logical proof of high product quality',
      'Learning that peers dislike the same stimulus',
    ],
  },
  {
    id: 'eppp-b013-assessment-1',
    answerIndex: 0,
    choices: [
      'Link to a relevant future criterion',
      'Appear sensible to untrained lay observers',
      'Correlate internally within one session',
      'Balance positively and negatively keyed items',
    ],
  },
  {
    id: 'eppp-b025-assessment-4',
    answerIndex: 2,
    choices: [
      'One standard deviation below the norm mean',
      'Positioned right at the normative group mean',
      'Two standard deviations above the mean',
      'One standard deviation above the norm mean',
    ],
  },
  {
    id: 'eppp-v2-lifespan-020',
    answerIndex: 0,
    choices: [
      'Egocentrism, animism, centration',
      'Logical operations and conservation',
      'Abstract hypothetical reasoning',
      'Early object permanence mastery',
    ],
  },
  {
    id: 'eppp-v3-cognitive-affective-042',
    answerIndex: 0,
    choices: [
      'Automatic vs. controlled effort',
      'Classical and operant conditioning',
      'Explicit and implicit recall stores',
      'Short-term and long-term memory',
    ],
  },
  {
    id: 'eppp-v2-intervention-063',
    answerIndex: 0,
    choices: [
      'Calm tone, active listening, emotion validation, space, and avoiding power struggles',
      'Raising one’s voice above an agitated client to establish dominance and regain control',
      'Taking a provocative confrontational stance to push for a rapid crisis resolution',
      'Applying physical restraints early before trying verbal calming and grounding steps',
    ],
  },
  {
    id: 'eppp-v3-lifespan-037',
    answerIndex: 2,
    choices: [
      'Roughly 10%, indicating pervasive relational instability across early home settings',
      'Roughly 20-25%, reflecting a high baseline of defensive avoidant attachment patterns',
      'Roughly 60-65%, displaying distress at separation and ready soothing at reunion',
      'Roughly 90-95%, indicating insecure attachment is exceedingly rare in young infants',
    ],
  },
  {
    id: 'eppp-v2-professional-015',
    answerIndex: 0,
    choices: [
      'Current capacity to understand court proceedings and assist defense counsel',
      'Criminal responsibility and mental state at the time of the alleged offense',
      'General intellectual functioning measured via standardized adult IQ batteries',
      'Comprehensive treatment needs for psychiatric inpatient or outpatient care',
    ],
  },
  {
    id: 'eppp-v2-intervention-023',
    answerIndex: 0,
    choices: [
      'Balancing rational and emotional functioning while staying connected',
      'Temporary geographic distance away from the immediate nuclear household',
      'Maintaining prolonged emotional cutoff from family-of-origin relationships',
      'Attending intensive individual therapy concurrently alongside family sessions',
    ],
  },
  {
    id: 'eppp-b028-social-1',
    answerIndex: 0,
    choices: [
      'Crediting success to personal skill while blaming failure on bad luck',
      'Explaining both success and failure through stable personal traits',
      'Attributing another person’s behavior to context after weighing constraints',
      'Revising a prior belief because carefully sampled evidence contradicts it',
    ],
  },
  {
    id: 'eppp-b015-assessment-1',
    answerIndex: 0,
    choices: [
      'Deliberately feigning or exaggerating symptoms for external gain',
      'Unconscious emergence of physical symptoms lacking an external reward',
      'An incorrect test answer caused by misreading a spoken item direction',
      'Low test performance accounted for by a documented genuine impairment',
    ],
  },
  {
    id: 'eppp-b013-professional-2',
    answerIndex: 3,
    choices: [
      'After clinical services have concluded and the client record is closed',
      'Prior to discussing responsibility for claims sent to third-party payers',
      'Using one uniform flat fee across diverse services and legal settings',
      'Early as feasible, lawfully, and accurately',
    ],
  },
  {
    id: 'eppp-b011-cognitive-1',
    answerIndex: 1,
    choices: [
      'Revising an established belief whenever new contradictory evidence emerges',
      'Seeking and favoring information that supports an existing belief',
      'Forgetting a past event because an effective retrieval cue is missing',
      'Estimating an event’s frequency from how easily examples come to mind',
    ],
  },
  {
    id: 'eppp-v2-biological-011',
    answerIndex: 2,
    choices: [
      'Slowed resting heart rate paired with constricted visual pupils',
      'Heightened gastrointestinal motility and active nutrient digestion',
      'Faster heart rate, dilated pupils, and open airways',
      'Persistently lowered systemic arterial blood pressure during rest',
    ],
  },
  {
    id: 'eppp-v2-cognitive-affective-020',
    answerIndex: 1,
    choices: [
      'Simply repeats target items to hold them briefly in short-term memory',
      'Links new material meaningfully to prior knowledge',
      'Produces noticeably weaker durability for long-term memory retention',
      'Operates primarily for brief visuospatial geometric stimuli in trials',
    ],
  },
  {
    id: 'eppp-b012-lifespan-1',
    answerIndex: 1,
    choices: [
      'Taller or wider containers hold a larger physical liquid volume',
      'Quantity stays constant despite outward shape shifts',
      'Hidden objects cease existing once blocked from direct visual sight',
      'Hypothetical statements offered by an adult must be factually true',
    ],
  },
  {
    id: 'eppp-b022-cognitive-2',
    answerIndex: 1,
    choices: [
      'Procedural habits expressed through smoother skilled motor execution',
      'Vivid and confident, yet still prone to drift and error',
      'Photographic mental records remaining stable after shocking events',
      'Restricted to neutral facts encountered repeatedly in daily routines',
    ],
  },
  {
    id: 'eppp-v3-cognitive-affective-064',
    answerIndex: 1,
    choices: [
      'Suppressing emotional reactions before noticing what they signal',
      'Recognizing another’s feeling and choosing a helpful response',
      'Scoring highly on cognitive tests while avoiding emotional settings',
      'Feeling strong arousal while neglecting to monitor or guide impact',
    ],
  },
  {
    id: 'eppp-v3-lifespan-050',
    answerIndex: 3,
    choices: [
      'Easy, difficult, and slow-to-warm-up infant temperament profiles',
      'Authoritative, authoritarian, permissive, and uninvolved parenting',
      'Secure and insecure bonds lacking distinct insecure subtypes',
      'Secure, avoidant, resistant, and disorganized types',
    ],
  },
  {
    id: 'eppp-v2-biological-035',
    answerIndex: 2,
    choices: [
      'Fluent speech comprehension and lexical semantic processing',
      'Primary visual perception and early cortical edge detection',
      'Motor control, habit formation, and procedural learning',
      'Complex auditory pitch mapping and tonal frequency analysis',
    ],
  },
  {
    id: 'eppp-v3-social-cultural-038',
    answerIndex: 3,
    choices: [
      'The testing context is anonymous and low-stakes',
      'The examinee remains unaware of the stereotype',
      'The task feels irrelevant to the stereotyped domain',
      'The person strongly values the stereotyped skill',
    ],
  },
  {
    id: 'eppp-v3-assessment-059',
    answerIndex: 0,
    choices: [
      'Correlates strongly with like-construct measures',
      'Shows weak correlation with measures of distinct constructs',
      'Produces consistent scores across independent clinic raters',
      'Accurately predicts future occupational job performance',
    ],
  },
  {
    id: 'eppp-v2-assessment-003',
    answerIndex: 3,
    choices: [
      'Highly structured self-report personality scale',
      'Standardized objective neuropsychological battery',
      'Comprehensive standardized intelligence instrument',
      'Performance-based projective personality task',
    ],
  },
  {
    id: 'eppp-v3-biological-007',
    answerIndex: 2,
    choices: [
      'Severe recurrent generalized motor seizures',
      'Targeted progressive voluntary limb paralysis',
      'Severe amnesia and confabulation',
      'Vivid isolated visual perceptual hallucinations',
    ],
  },
  {
    id: 'eppp-b010-assessment-1',
    answerIndex: 0,
    choices: [
      'At the normative average midpoint',
      'Two standard deviations above the mean',
      'The lowest obtainable performance band',
      'Equal to answering 5 percent accurately',
    ],
  },
  {
    id: 'eppp-v2-lifespan-035',
    answerIndex: 3,
    choices: [
      'Adolescence (approximately ages 12-18)',
      'Young adulthood (roughly ages 18-40)',
      'Late adulthood (approximately age 65+)',
      'Middle adulthood (roughly 40-65)',
    ],
  },
];

const seen = new Set();
for (const rev of revisions) {
  if (!rev || typeof rev.id !== 'string' || seen.has(rev.id)) {
    throw new Error(`Duplicate or invalid EPPP wave 55 revision id: ${rev && rev.id}`);
  }
  if (!Array.isArray(rev.choices) || rev.choices.length !== 4) {
    throw new Error(`EPPP wave 55 revision ${rev.id} must have 4 choices.`);
  }
  seen.add(rev.id);
}

module.exports = {
  reviewWave: 'eppp-length-balance-wave-55',
  reviewedAt: '2026-11-21',
  revisions,
};
