'use strict';

const revisions = {
  'eppp-b001-assessment-2': {
    sourceCheck: 'The cited Hunsley and Meyer review supports incremental validity as added predictive or decision value beyond information already available.',
    feedbackDesign: ['test-retest-reliability', 'administrative-efficiency', 'test-length'],
    incorrectFeedback: {
      0: 'This describes test-retest reliability, or temporal score stability. Reliability concerns consistency across occasions; incremental validity asks whether a new measure improves prediction beyond existing information.',
      1: 'This reflects administrative efficiency, a facet of practical utility. Faster completion may lower burden, but incremental validity requires unique improvement in prediction or decisions beyond the current measure.',
      3: 'This is greater test length or content breadth, which can affect coverage and sometimes reliability. Item count alone says nothing about added predictive contribution beyond the existing measure.',
    },
  },
  'eppp-b003-assessment-2': {
    sourceCheck: 'Frank\'s historical projective hypothesis supports the keyed role of personal organization and meaning, without establishing reliability, validity, or fairness.',
    feedbackDesign: ['culture-free-measurement-claim', 'standardization-confusion', 'objective-ability-testing-confusion'],
    incorrectFeedback: {
      0: 'Culture-free measurement is a claim about measurement invariance and fairness across groups. Ambiguous stimuli do not guarantee that; the historical hypothesis concerns personal organization of stimulus meaning.',
      1: 'This invokes unstandardized administration, which increases examiner or procedure variance and weakens score comparability. The projective hypothesis concerns ambiguity of interpretation, not freedom from procedures.',
      3: 'This describes objective cognitive-ability measurement with scored right-wrong performance. Projective methods instead use open-ended responses to ambiguous material to infer personal meanings or patterns.',
    },
  },
  'eppp-b001-biological-2': {
    sourceCheck: 'The cited Bliss and Collingridge review supports NMDA-dependent calcium entry as an induction mechanism for hippocampal long-term potentiation.',
    feedbackDesign: ['presynaptic-depression', 'calcium-blockade', 'ampa-endocytosis'],
    qualityFlags: ['The original AMPA distractor used misleading permanent-removal language; wave 07 replaces it with a dynamic LTD-associated process.'],
    choices: {
      3: 'Activity-dependent AMPA-receptor internalization that reduces postsynaptic responsiveness',
    },
    incorrectFeedback: {
      0: 'Presynaptic long-term depression reduces transmitter-release probability and weakens a synapse. That is the opposite direction of plasticity; the stem asks for the coincidence-triggered induction of strengthening.',
      1: 'Calcium-channel blockade prevents postsynaptic Ca2+ signaling and therefore blocks LTP induction. It cannot initiate strengthening, which requires a rise rather than a fall in dendritic-spine calcium.',
      3: 'AMPA-receptor endocytosis is an expression mechanism of long-term depression that reduces excitatory transmission. LTP instead follows an induction signal and is associated with increased AMPA-receptor function or insertion.',
    },
  },
  'eppp-b003-biological-1': {
    sourceCheck: 'The cited comprehensive physiology review confirms hypothalamic CRH, pituitary ACTH, and adrenal-cortical glucocorticoid secretion.',
    feedbackDesign: ['adrenal-medulla-confusion', 'reverse-feedback-confusion', 'hormone-source-scramble'],
    qualityFlags: ['The key is accurate, but a later challenge-quality wave should replace the three source-scramble distractors with coherent neighboring stress pathways.'],
    incorrectFeedback: {
      1: 'This assigns the hormones to the wrong tissues and conflates the HPA axis with the adrenal-medullary response. The medulla releases catecholamines, whereas cortisol is synthesized in the adrenal cortex.',
      2: 'This reverses both the direction of the cascade and the hormone sources. Cortisol can inhibit upstream HPA activity through negative feedback, but feedback is not a reverse CRH-ACTH-cortisol secretion sequence.',
      3: 'This scrambles anterior-pituitary ACTH production with adrenal-cortical steroid synthesis. ACTH does not originate in the hypothalamus, CRH is not an adrenal hormone, and cortisol is not a pituitary product.',
    },
  },
  'eppp-b001-cognitive-1': {
    sourceCheck: 'The cited meta-analysis supports reduced free-choice intrinsic motivation after expected tangible rewards for an initially interesting activity.',
    feedbackDesign: ['spontaneous-recovery', 'negative-reinforcement', 'stimulus-generalization'],
    incorrectFeedback: {
      0: 'Spontaneous recovery is the return of an extinguished conditioned response after a rest interval. No conditioned response reappears here; voluntary drawing declines after an expected incentive is removed.',
      2: 'Negative reinforcement strengthens behavior because it removes or prevents an aversive event. Here no aversive event is escaped, and drawing decreases after withdrawal of a positive incentive rather than increasing.',
      3: 'Stimulus generalization is transfer of a learned response to cues resembling the training stimulus. The stem changes reward conditions over time, not settings or cues, and measures reduced voluntary engagement.',
    },
  },
  'eppp-b001-cognitive-2': {
    sourceCheck: 'The cited Murdock experiment supports the immediate free-recall serial-position pattern described in the stem.',
    feedbackDesign: ['interference-pair', 'state-and-mood-effects', 'encoding-strategies'],
    incorrectFeedback: {
      0: 'Proactive interference is old learning disrupting newer learning; retroactive interference is newer learning disrupting older learning. They concern competing material, not superior recall at both list endpoints.',
      1: 'State-dependent memory benefits when encoding and retrieval states match; mood congruence favors material consistent with current mood. The stem varies serial position, not internal state or emotional content.',
      2: 'Maintenance rehearsal repeats items, while semantic chunking organizes them by meaning. Either can aid encoding, but neither names the paired advantages tied specifically to the beginning and end of a list.',
    },
  },
  'eppp-b001-intervention-1': {
    sourceCheck: 'The AASM clinical guideline and Bootzin and Epstein review support restoring the bed-sleep association, leaving bed when unable to sleep, and maintaining a regular rise time.',
    feedbackDesign: ['paradoxical-intention', 'compensatory-schedule-shifting', 'conditioned-wakefulness'],
    references: [
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC7853203/',
      'https://doi.org/10.1146/annurev.clinpsy.3.022806.091516',
    ],
    sourceDetails: [
      {
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7853203/',
        title: 'Behavioral and psychological treatments for chronic insomnia disorder in adults: an American Academy of Sleep Medicine clinical practice guideline',
        organization: 'American Academy of Sleep Medicine and Journal of Clinical Sleep Medicine',
        summary: 'This clinical practice guideline evaluates behavioral and psychological treatments for adult chronic insomnia, including stimulus control as a recommended component or intervention.',
        credibility: 'The American Academy of Sleep Medicine convened an expert task force, used a systematic evidence review and GRADE process, and published the recommendations in its peer-reviewed clinical journal.',
      },
      {
        url: 'https://doi.org/10.1146/annurev.clinpsy.3.022806.091516',
        title: 'Understanding and Treating Insomnia',
        organization: 'Annual Review of Clinical Psychology',
        summary: 'This scholarly review explains behavioral models and established behavioral treatments for insomnia, including stimulus-control procedures associated with Richard Bootzin.',
        credibility: 'Annual Review of Clinical Psychology publishes invited, peer-reviewed syntheses by domain experts; Richard Bootzin developed stimulus-control treatment, making this review directly relevant to the procedure tested.',
      },
    ],
    qualityFlags: ['Wave 07 replaces an unresolvable Annual Reviews DOI with the correct Bootzin and Epstein DOI and a traceable AASM clinical guideline.'],
    incorrectFeedback: {
      0: 'This resembles paradoxical intention or passive wakefulness, which reduces sleep effort by asking a person to try staying awake. It conflicts with stimulus control, which breaks the bed-wakefulness link.',
      2: 'This is compensatory schedule shifting, such as sleeping in after a poor night. It can destabilize sleep timing; stimulus control instead anchors a consistent morning rise time.',
      3: 'This describes wakeful cognitive arousal and using the bed as a workspace, a sleep-hygiene and conditioning problem. Stimulus control removes stimulating wake activities from bed.',
    },
  },
  'eppp-b001-intervention-2': {
    sourceCheck: 'APA Dictionary definitions directly support the maximum-intensity versus graded-with-relaxation distinction between flooding and systematic desensitization.',
    feedbackDesign: ['systematic-desensitization', 'graded-imaginal-exposure', 'cognitive-therapy-without-exposure'],
    references: [
      'https://dictionary.apa.org/flooding',
      'https://dictionary.apa.org/systematic-desensitization',
    ],
    sourceDetails: [
      {
        url: 'https://dictionary.apa.org/flooding',
        title: 'Flooding - APA Dictionary of Psychology',
        organization: 'APA Dictionary of Psychology, American Psychological Association',
        summary: 'The professional dictionary defines flooding as direct exposure to a maximum-intensity anxiety-producing situation or stimulus without preliminary relaxation training.',
        credibility: 'The APA Dictionary of Psychology is an edited professional reference published by the American Psychological Association and provides a construct-specific definition for the treatment named in the item.',
      },
      {
        url: 'https://dictionary.apa.org/systematic-desensitization',
        title: 'Systematic desensitization - APA Dictionary of Psychology',
        organization: 'APA Dictionary of Psychology, American Psychological Association',
        summary: 'The professional dictionary defines systematic desensitization as gradual exposure to increasingly anxiety-provoking stimuli while using relaxation to inhibit anxiety.',
        credibility: 'The APA Dictionary of Psychology is an edited professional reference published by the American Psychological Association and directly defines the comparison treatment used in the item.',
      },
    ],
    qualityFlags: ['Wave 07 replaces an indirect implosive-therapy citation with direct professional definitions of both treatments.'],
    incorrectFeedback: {
      0: 'This is systematic desensitization: graded exposure is paired with relaxation as counterconditioning. Flooding differs by beginning at the high-intensity end without gradual steps.',
      1: 'This is low-level imaginal exposure within a graded hierarchy, an element of systematic desensitization when paired with relaxation. Its gradual starting point is the opposite of flooding.',
      2: 'This describes cognitive therapy using belief testing and behavioral experiments. Without confrontation of feared cues, it lacks the exposure procedure that defines flooding.',
    },
  },
  'eppp-b001-lifespan-2': {
    sourceCheck: 'Arnett\'s original article supports a period from the late teens through the twenties, with an initial emphasis on approximately ages 18 through 25.',
    feedbackDesign: ['middle-childhood', 'adolescence', 'established-adulthood'],
    incorrectFeedback: {
      0: 'Middle childhood or preadolescence is the school-age period leading toward puberty. It precedes the relative independence and identity exploration that Arnett located after adolescence, so it cannot mark emerging adulthood.',
      1: 'Adolescence spans pubertal development and the secondary-school years. Arnett distinguished the later, less structured period after adolescence, when many roles remain unsettled and identity exploration intensifies.',
      2: 'Established adulthood describes a later phase marked by more enduring work, partnership, and parenting commitments. It follows the exploratory, in-between period in Arnett\'s formulation rather than defining it.',
    },
  },
  'eppp-b003-lifespan-1': {
    sourceCheck: 'The original still-face study supports infant bids to restore interaction followed by wariness, distress, or withdrawal when caregiver responsiveness remains disrupted.',
    feedbackDesign: ['sleep-state-transition', 'absent-contingency-response', 'stranger-preference'],
    incorrectFeedback: {
      0: 'Sleep onset is a behavioral-state transition, not the still-face effect. Caregiver unresponsiveness usually reduces positive engagement and evokes bids, wariness, or distress before infants disengage.',
      2: 'An unchanged response would suggest absent social-contingency detection or habituation. The still-face episode violates expected reciprocity, typically reducing gaze and positive affect while increasing distress.',
      3: 'Preference for a novel person is a social-novelty or stranger-preference phenomenon tested by comparing partners. This procedure alters a caregiver\'s responsiveness and measures regulation, not person choice.',
    },
  },
  'eppp-b001-professional-1': {
    sourceCheck: 'The cited group-psychotherapy article and APA Standard 10.03 support explaining limits created by information shared among group members.',
    feedbackDesign: ['professional-duty-erasure', 'privilege-confidentiality-conflation', 'posttermination-timing-confusion'],
    qualityFlags: ['The guarantee framing is intentionally retained because legal privilege and member obligations vary by jurisdiction.'],
    incorrectFeedback: {
      0: 'This asserts a blanket professional exemption and confuses co-members\' uncertain compliance with the psychologist\'s own duty. Group treatment limits what can be promised; it does not erase that duty.',
      2: 'This conflates ethical confidentiality with evidentiary privilege. Privilege is a legal protection governed by jurisdiction and may be limited in groups; it is not automatic nationwide.',
      3: 'This mistakes continuing posttermination confidentiality for a rule that begins only at discharge. The duty protects information during treatment and persists after the group ends.',
    },
  },
  'eppp-b001-professional-2': {
    sourceCheck: 'APA Ethics Code Standard 10.05 categorically prohibits sexual intimacies with current therapy clients.',
    feedbackDesign: ['consent-waiver', 'consultation-exception', 'client-initiation'],
    incorrectFeedback: {
      0: 'This invokes informed-consent documentation, which can authorize many interventions but cannot waive the categorical therapist-client boundary in Standard 10.05.',
      1: 'This describes consultation, a safeguard for resolving ambiguous ethical questions. Consultation can inform judgment but cannot create an exception to an express Ethics Code prohibition.',
      2: 'This treats client initiation as shifting responsibility to the client. The boundary remains the psychologist\'s obligation, so who proposed the sexual relationship is irrelevant.',
    },
  },
  'eppp-b001-research-2': {
    sourceCheck: 'The cited methodological review supports the classical intention-to-treat principle of retaining randomized participants in their originally assigned groups.',
    feedbackDesign: ['completer-only-analysis', 'per-protocol-analysis', 'responder-analysis'],
    rationale: 'Under the classical intention-to-treat principle, every randomized participant remains in the target analysis population and in the originally assigned group regardless of adherence or crossover. This preserves the comparison created by randomization. Missing outcomes still require a prespecified, defensible handling method; intention-to-treat does not make unobserved data appear.',
    qualityFlags: ['The rationale now distinguishes retention in the target analysis population from the practical problem of missing outcome data.'],
    incorrectFeedback: {
      0: 'This is a completer-only analysis, which selects participants by postrandomization completion and can bias groups. Intention-to-treat retains randomized participants in their assigned arms despite noncompletion.',
      1: 'This is per-protocol analysis, restricted to participants meeting adherence requirements. It can sacrifice randomization; intention-to-treat analyzes by original assignment despite protocol deviations.',
      3: 'This is responder analysis based on a postrandomization outcome, creating selection bias and excluding failures. Intention-to-treat includes participants by randomization, not by whether they benefit.',
    },
  },
  'eppp-b005-research-1': {
    sourceCheck: 'HHS regulations at 45 CFR 46.109 authorize an IRB to approve, require modifications in, or disapprove covered research.',
    feedbackDesign: ['publication-function', 'hypothesis-testing-function', 'investigator-role-confusion'],
    incorrectFeedback: {
      1: 'This is a dissemination or publication-policy function controlled by investigators, sponsors, journals, and agreements. An IRB protects participants through regulatory review; it cannot ensure publication.',
      2: 'This confuses ethical and scientific review with empirical hypothesis testing. An IRB considers whether design and risk are acceptable; study data, not the board, determine support for a hypothesis.',
      3: 'This confuses IRB oversight with the investigator\'s operational responsibility for data collection. An IRB may require changes or disapprove a protocol, but it does not become the research team.',
    },
  },
  'eppp-b003-social-1': {
    sourceCheck: 'The original IAT paper supports estimating differential target-attribute association from relative categorization speed.',
    feedbackDesign: ['explicit-autobiographical-memory', 'behavior-frequency', 'diagnostic-severity'],
    qualityFlags: ['The rationale appropriately treats an IAT score as a relative indirect estimate, not a diagnosis, behavior count, or individual behavioral forecast.'],
    incorrectFeedback: {
      1: 'This describes an explicit autobiographical-memory test, which evaluates recall or recognition of personal events. The IAT instead infers relative conceptual associations from categorization performance.',
      2: 'This describes behavioral observation or experience sampling, which can count conduct over time. An IAT latency difference is an indirect association measure, not a tally or reliable forecast of one person\'s acts.',
      3: 'This describes diagnostic severity assessment, which requires validated clinical criteria and broader evidence. The IAT is neither a personality-disorder instrument nor a diagnostic test.',
    },
  },
  'eppp-b003-social-2': {
    sourceCheck: 'The original Darley and Latane seizure-emergency experiment supports diffusion of responsibility as the tested explanation for slower or less frequent helping with more perceived bystanders.',
    feedbackDesign: ['group-polarization', 'social-loafing', 'cognitive-dissonance'],
    incorrectFeedback: {
      0: 'This describes group polarization, a postdiscussion shift toward a more extreme version of members\' initial leaning. The seizure study varied perceived bystander number, not group deliberation.',
      1: 'This describes social loafing, reduced individual effort when contributions to a shared task are pooled or unidentifiable. Emergency intervention concerns personal responsibility to help, not task output.',
      3: 'This describes cognitive dissonance in forced-compliance research, where acting against one\'s attitude can prompt attitude change. The seizure study varied how many others might respond.',
    },
  },
};

const wave06WarningSnapshot = Object.freeze({
  itemsWithWarnings: 1469,
  incorrectOptionsWithWarnings: 4258,
  insufficientDetailOptions: 1491,
  genericTemplateOptions: 2702,
  choiceRestatementOptions: 1983,
  fullKeyEchoOptions: 1708,
});

const wave07WarningSnapshot = Object.freeze({
  itemsWithWarnings: 1453,
  incorrectOptionsWithWarnings: 4210,
  insufficientDetailOptions: 1491,
  genericTemplateOptions: 2654,
  choiceRestatementOptions: 1935,
  fullKeyEchoOptions: 1660,
});

module.exports = { revisions, wave06WarningSnapshot, wave07WarningSnapshot };
