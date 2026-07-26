'use strict';

// Authored shard C for the distractor-halving campaign. This module is data
// only: it describes reviewed replacements and cannot mutate either bank.

const nativeItems = require('../test_prep/eppp_native_items.json');
const {
  CAMPAIGN_ITEMS,
  DOMAIN_ID_SHARDS,
} = require('./eppp_distractor_halving_campaign_manifest.cjs');

const SHARD_ID = 'eppp-distractor-halving-revisions-c';
const REVIEWED_AT = '2026-07-25';
const ASSIGNED_DOMAINS = Object.freeze(['intervention', 'social-cultural']);
const ASSIGNED_IDS = Object.freeze(ASSIGNED_DOMAINS.flatMap((domainId) => DOMAIN_ID_SHARDS[domainId]));
const campaignById = new Map(CAMPAIGN_ITEMS.map((item) => [item.id, item]));
const liveById = new Map(nativeItems.map((item) => [item.id, item]));

function invariant(condition, message) {
  if (!condition) throw new Error(`${SHARD_ID}: ${message}`);
}

function words(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean);
}

function explain(issue, distinction) {
  const text = `${issue} ${distinction}`;
  invariant(text.length >= 100 && words(text).length >= 16, `feedback is too short: ${text}`);
  return text;
}

function contract(id, replacement) {
  const campaign = campaignById.get(id);
  const live = liveById.get(id);
  invariant(campaign, `unknown campaign ID ${id}`);
  invariant(live, `missing live item ${id}`);
  invariant(live.answerIndex === campaign.expectedAnswerIndex, `${id} answer index drifted`);
  invariant(typeof replacement.editorialNote === 'string' && words(replacement.editorialNote).length >= 14, `${id} needs a substantive editorial note`);
  invariant(Array.isArray(replacement.distractorDesign) && replacement.distractorDesign.length === 3, `${id} needs three distractor-design labels`);
  invariant(new Set(replacement.distractorDesign).size === 3, `${id} distractor-design labels must be distinct`);
  return {
    expectedAnswerIndex: campaign.expectedAnswerIndex,
    contentSha256: campaign.contentSha256,
    expectedWarningFamilies: [...campaign.expectedWarningFamilies],
    ...replacement,
  };
}

function retarget(id, replacement) {
  return Object.freeze(contract(id, replacement));
}

function rewrite(id, {
  prompt,
  distractors,
  wrongFeedback,
  rationale,
  cognitiveProcess,
  editorialNote,
  distractorDesign,
}) {
  const live = liveById.get(id);
  invariant(live, `missing live item ${id}`);
  invariant(Array.isArray(distractors) && distractors.length === 3, `${id} needs three authored distractors`);
  invariant(Array.isArray(wrongFeedback) && wrongFeedback.length === 3, `${id} needs three authored wrong-option explanations`);

  const choices = [];
  const choiceRationales = [];
  let wrongCursor = 0;
  const keyedRationale = rationale || live.rationale;
  for (let index = 0; index < 4; index += 1) {
    if (index === live.answerIndex) {
      choices.push(live.choices[index]);
      choiceRationales.push(keyedRationale);
    } else {
      choices.push(distractors[wrongCursor]);
      choiceRationales.push(wrongFeedback[wrongCursor]);
      wrongCursor += 1;
    }
  }

  invariant(choices[live.answerIndex] === live.choices[live.answerIndex], `${id} keyed-choice wording changed`);
  invariant(choiceRationales.every((text) => text.length >= 100 && words(text).length >= 16), `${id} choice feedback misses the detail floor`);
  invariant(choiceRationales[live.answerIndex] === keyedRationale, `${id} key feedback must equal the rationale`);

  const replacement = {
    prompt,
    choices,
    ...(rationale ? { rationale } : {}),
    choiceRationales,
    ...(cognitiveProcess ? { cognitiveProcess } : {}),
    editorialNote,
    distractorDesign,
  };
  return Object.freeze(contract(id, replacement));
}

const authored = {
  'eppp-v2-intervention-018': rewrite('eppp-v2-intervention-018', {
    prompt: 'A clinic obtains similar outcomes from several bona fide therapies, but improvement varies substantially with collaboration, expectancy, and clinician responsiveness. Which explanation best fits the common-factors model?',
    distractors: [
      'Disorder-specific ingredients in the selected manual explain the largest share of change once treatment begins',
      'Clinician adherence to one preferred therapy brand accounts for outcome differences after diagnosis is established',
      'Client expectancy is a nuisance influence that should be controlled so technical effects can be estimated',
    ],
    rationale: 'The common-factors account emphasizes processes shared across credible therapies, including alliance, empathy, hope, and agreement about aims and activities. Specific techniques can still matter; the model concerns their relative contribution and interaction with relationship, therapist, and client factors rather than claiming techniques are inert.',
    wrongFeedback: [
      explain('Disorder-specific procedures can contribute to change, but making them the dominant explanation does not fit the cross-model pattern in the vignette.', 'The observed variation with collaboration, expectancy, and clinician responsiveness is evidence for shared therapeutic processes.'),
      explain('Adherence can protect treatment integrity, yet allegiance to one brand cannot explain similar improvement across several credible approaches.', 'The outcome pattern points to relational and expectancy processes that operate across manuals while allowing technique-specific effects.'),
      explain('Expectancy can confound a narrow efficacy estimate, but common-factors theory treats credible rationale and hope as clinically active rather than mere noise.', 'Removing that influence would discard one of the processes the case asks the learner to explain.'),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The comparative clinic scenario removes the model-name completion cue and uses three defensible rival explanations rather than inflated technique caricatures.',
    distractorDesign: ['specific-ingredient-dominance', 'brand-adherence-dominance', 'expectancy-as-nuisance'],
  }),
  'eppp-b020-intervention-3': rewrite('eppp-b020-intervention-3', {
    prompt: 'A bounded treatment maps a client’s depressive episode to bereavement, a workplace change, conflict with a partner, and social isolation. Which organizing framework is being used?',
    distractors: [
      'Automatic thoughts, core assumptions, activity scheduling, and collaborative behavioral experiments',
      'Transference patterns, resistance, defensive operations, and interpretations of early relational wishes',
      'Pleasant-event monitoring, mastery ratings, graded task assignment, and reinforcement of activation',
    ],
    rationale: 'IPT is a present-focused, time-limited treatment that links symptoms with one of four interpersonal problem areas: grief, role disputes, role transitions, or interpersonal deficits. Past relationships may inform formulation, but current interpersonal functioning remains the treatment focus.',
    wrongFeedback: [
      explain('This set organizes a cognitive-behavioral formulation by linking appraisals and action patterns to mood.', 'The vignette instead maps recent losses, changes, conflicts, and social scarcity into the focal categories used by IPT.'),
      explain('These concepts can structure psychodynamic work, especially when the treatment emphasizes unconscious relational patterns and the therapy relationship.', 'The bounded map in the stem classifies present social circumstances rather than selecting interpretive themes.'),
      explain('Activity monitoring and graded tasks are characteristic behavioral-activation methods that target withdrawal and reinforcement loss.', 'They may help depression, but they do not name the interpersonal categories represented by bereavement, role change, conflict, and isolation.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The case formulation replaces a direct category-list completion and contrasts IPT with three credible depression formulations at the same conceptual level.',
    distractorDesign: ['cognitive-formulation-neighbor', 'psychodynamic-formulation-neighbor', 'behavioral-activation-neighbor'],
  }),
  'eppp-b024-intervention-2': rewrite('eppp-b024-intervention-2', {
    prompt: 'Serial blood-level results are being used to adjust a medication with a narrow safety margin. Which description best captures the target interval the prescriber is evaluating?',
    distractors: [
      'The laboratory reference interval observed in a comparison population that is not taking the medication',
      'The time between successive prescribed doses needed to keep administration on a consistent schedule',
      'A population-average dose expected to remain appropriate despite changes in health, interactions, or adherence',
    ],
    rationale: 'The therapeutic range is a blood concentration range expected to provide clinical benefit without unacceptable toxicity. It is medication-specific and can vary with individual health factors; monitoring informs, but does not replace, clinical assessment and careful dose adjustment by a qualified prescriber.',
    wrongFeedback: [
      explain('A general laboratory reference interval describes values in a comparison population and is not the medication-specific efficacy-safety target.', 'Therapeutic monitoring interprets the patient’s measured drug level alongside response, toxicity, timing, and clinical factors.'),
      explain('A dosing interval is the elapsed time between administrations, whereas the laboratory result represents drug concentration in a collected specimen.', 'Timing affects interpretation, but it is not the target concentration window the prescriber evaluates.'),
      explain('Population dosing guidance may inform an initial prescription, but individual health changes, interactions, timing, and adherence can alter exposure.', 'Monitoring supports individualized adjustment rather than treating one average dose as the therapeutic range.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The monitoring scenario separates concentration, reference, administration-timing, and population-dose concepts with plausible clinical alternatives.',
    distractorDesign: ['reference-interval-confusion', 'dosing-interval-confusion', 'population-dose-confusion'],
  }),
  'eppp-b025-intervention-1': rewrite('eppp-b025-intervention-1', {
    prompt: 'A clinician contracts for twelve sessions and sustains attention on one recurring relational conflict. What most clearly distinguishes this format from classical open-ended analysis?',
    distractors: [
      'A crisis-stabilization agenda centered on immediate coping, resource coordination, and restoration of basic functioning',
      'A symptom-specific behavioral protocol whose procedures do not draw on defenses, recurring relationships, or emotional conflict',
      'An interpretive process that expands its agenda whenever new material appears and leaves the ending date unspecified',
    ],
    rationale: 'Brief psychodynamic approaches retain attention to emotion, defenses, conflict, recurring interpersonal patterns, and the therapeutic relationship while using a clearer focus and limited time frame. Specific models differ in technique and suitability; brief does not mean superficial or free of assessment.',
    wrongFeedback: [
      explain('Crisis stabilization can appropriately prioritize safety, coping, and practical supports, but those aims do not define a brief psychodynamic format.', 'The vignette preserves dynamic themes while deliberately bounding the focus and treatment period.'),
      explain('A structured behavioral protocol may also be brief and active, yet excluding defenses, emotional conflict, and recurring relationships removes the psychodynamic basis.', 'The keyed format retains those themes within a circumscribed treatment contract.'),
      explain('An expanding agenda and unspecified ending resemble open-ended analytic work more than the bounded treatment described.', 'Brief psychodynamic care selects a focal conflict and works actively within an agreed time frame while still attending to the relationship.'),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The scenario now contrasts bounded psychodynamic treatment with crisis, behavioral, and open-ended analytic formats using credible same-level alternatives.',
    distractorDesign: ['crisis-stabilization-neighbor', 'behavioral-protocol-neighbor', 'open-ended-analysis-neighbor'],
  }),
  'eppp-migrated-intervention-1': rewrite('eppp-migrated-intervention-1', {
    prompt: 'A client trusts the therapist but rejects the proposed homework and has a different view of the desired outcome. Under Bordin’s formulation, what must be examined?',
    distractors: [
      'Agreement about diagnosis, improvement in symptom scores, and the anticipated number of sessions',
      'Confidence in clinician expertise, willingness to comply, and frequency of scheduled appointments',
      'Accurate empathy, unconditional positive regard, and therapist congruence during the encounter',
    ],
    rationale: 'Bordin conceptualized the working alliance across therapy approaches as agreement on treatment goals, agreement on the tasks used to pursue them, and the development of a relational bond. Trust suggests some bond, but disagreement about the desired outcome and homework shows that the other components still require collaborative repair.',
    wrongFeedback: [
      explain('Diagnosis, symptom change, and treatment duration are clinically relevant, but they do not constitute Bordin’s three alliance components.', 'The vignette specifically reveals disagreement about the desired outcome and proposed therapeutic activity despite interpersonal trust.'),
      explain('Expertise, attendance, and willingness can affect engagement, yet compliance is not interchangeable with collaboration in Bordin’s model.', 'A client can attend and respect expertise while disagreeing about what therapy seeks and how the work should proceed.'),
      explain('Empathy, positive regard, and congruence are central Rogerian therapist conditions and may strengthen a relationship.', 'They do not replace explicit agreement about therapeutic aims and activities within Bordin’s pan-theoretical alliance model.'),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The rupture vignette applies all three Bordin components and gives each neighboring alliance formulation a substantive option-specific contrast.',
    distractorDesign: ['outcome-monitoring-triad', 'authority-compliance-triad', 'rogerian-conditions-triad'],
  }),
  'eppp-v3-intervention-071': rewrite('eppp-v3-intervention-071', {
    prompt: 'After retirement, a client develops depression amid a painful change in family position and escalating conflict with a sibling. Which case map would an IPT clinician most likely use to select the treatment focus?',
    distractors: [
      'A hierarchy of distorted predictions and core assumptions maintained primarily by biased information processing',
      'A medication-response profile considered apart from the client’s recent relational environment',
      'A reconstruction of early memories selected while leaving the episode’s present social context unexamined',
    ],
    rationale: 'IPT would organize this episode around the client’s recent social change and conflict, then select a bounded interpersonal focus for communication and problem-solving work. The formulation connects mood symptoms with present relational circumstances without reducing depression to those circumstances or requiring an exclusively interpersonal cause.',
    wrongFeedback: [
      explain('A cognitive hierarchy could inform CBT, but it does not identify the interpersonal problem area that organizes IPT case formulation.', 'The retirement transition and sibling conflict point to a current relational focus rather than a schema-centered account.'),
      explain('Medication response may be clinically relevant, yet considering it apart from recent social circumstances omits the defining target of this psychotherapy.', 'IPT explicitly links the depressive episode to a manageable present relationship problem while coordinating other care when indicated.'),
      explain('Earlier relationships can inform understanding, but selecting memories without tying them to the current episode shifts toward an open-ended historical formulation.', 'IPT keeps the working focus on a recent role change, loss, conflict, or social difficulty.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'A retirement-and-sibling formulation now distinguishes this item from category-definition duplicates and removes the direct current-context cue from the stem.',
    distractorDesign: ['schema-hierarchy-substitution', 'decontextualized-medication-model', 'historical-memory-primary'],
  }),
  'eppp-v3-intervention-020': rewrite('eppp-v3-intervention-020', {
    prompt: 'During a tense multigenerational meeting, an adult repeatedly adopts a parent’s position to avoid conflict. A Bowen-oriented therapist coaches the adult to state a thoughtful “I-position” while remaining connected. What capacity is being strengthened?',
    distractors: [
      'Restructuring the household hierarchy by prescribing firmer cross-generational boundaries',
      'Interrupting the sequence through a strategic directive designed to make the symptom costly',
      'Amplifying exceptions through future-focused questions about times the conflict is absent',
    ],
    rationale: 'The therapist is strengthening the person’s capacity to think and act from a coherent position while staying emotionally connected under family pressure. In Bowen theory, that capacity reflects differentiation rather than emotional cutoff, rigid detachment, or a structural rearrangement of authority.',
    wrongFeedback: [
      explain('Changing hierarchy and strengthening generational boundaries are characteristic structural-family interventions, not the capacity illustrated by an I-position.', 'The vignette emphasizes maintaining thoughtful autonomy during emotional pressure rather than reorganizing who holds authority.'),
      explain('A paradoxical or strategic directive attempts to alter a recurring interaction sequence, whereas the therapist here is coaching a durable self-regulatory capacity.', 'Remaining connected while articulating one’s own considered position is central to the Bowen formulation.'),
      explain('Exception and preferred-future questions belong to solution-focused work and may reveal useful resources, but they do not name the target in this scene.', 'The relevant distinction is between fused reactivity and principled functioning within an emotionally activated family system.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The I-position vignette converts a duplicated theory definition into a clinical-process decision while preserving the original keyed wording.',
    distractorDesign: ['structural-hierarchy-neighbor', 'strategic-sequence-neighbor', 'solution-focused-exception-neighbor'],
  }),
  'eppp-v2-intervention-048': rewrite('eppp-v2-intervention-048', {
    prompt: 'A client’s depressive episode began after a close friendship ended and is sustained by unresolved conflict in a new caregiving role. Which treatment aim most specifically supports choosing IPT?',
    distractors: [
      'Testing predictions through activity scheduling while treating the recent relationships as incidental background',
      'Recovering a complete childhood narrative before addressing the client’s present loss and conflict',
      'Optimizing antidepressant dosage as the psychotherapy’s defining method and endpoint',
    ],
    rationale: 'IPT is selected when a focused link can be made between depressive symptoms and a current loss, transition, dispute, or difficulty sustaining relationships. Treatment works on that interpersonal focus to improve functioning and symptoms while allowing medication or other services to be coordinated when clinically appropriate.',
    wrongFeedback: [
      explain('Behavioral experiments and activity scheduling can be useful depression interventions, but making relationships incidental misses the selection logic tested here.', 'The onset after a friendship loss and conflict in a new role provides a direct interpersonal focus for IPT.'),
      explain('Developmental history may add context, yet requiring a complete childhood account before present work is inconsistent with IPT’s focused, time-limited structure.', 'The immediate treatment target is the recent loss and role conflict connected with the depressive episode.'),
      explain('Medication management can accompany psychotherapy, but it is neither the defining psychotherapy method nor the sole endpoint in this case.', 'IPT targets functioning in the identified relationship problem while monitoring change in depressive symptoms.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The selection vignette separates this item from IPT category-list questions and removes the stem-to-key repetition of primary goal language.',
    distractorDesign: ['behavioral-activation-without-context', 'developmental-history-prerequisite', 'pharmacotherapy-as-psychotherapy'],
  }),
  'eppp-b024-intervention-3': rewrite('eppp-b024-intervention-3', {
    prompt: 'In the opening phase of a structured depression treatment, the clinician inventories a bereavement, conflict over responsibilities, adjustment to relocation, and a sparse support network. Which set supplies the model’s possible focal categories?',
    distractors: [
      'Avoidance contingencies, reinforcement schedules, discriminative cues, and response generalization',
      'Dream themes, transference enactments, psychosexual conflicts, and unrestricted associative material',
      'Medication adherence, serum concentration, neurological signs, and sensory-processing thresholds',
    ],
    rationale: 'The inventory is part of an IPT formulation used to identify one central interpersonal problem area for focused work. The listed experiences correspond to the model’s traditional categories, but treatment still individualizes the focus and does not assume that every category is equally active.',
    wrongFeedback: [
      explain('These are behavior-analytic formulation elements and could organize contingency-based treatment, but they do not classify the client’s recent social difficulties.', 'The opening inventory is designed to select an interpersonal focus connected with the depressive episode.'),
      explain('Psychodynamic exploration may consider transference and associative material, yet an unrestricted analytic agenda differs from this structured focal inventory.', 'The model classifies a recent loss, conflict, life change, or relationship scarcity for time-limited work.'),
      explain('Medical assessment can be important in comprehensive care, but laboratory and neurological categories do not organize this psychotherapy’s focal problem map.', 'The clinician is sorting relational circumstances in order to choose one tractable treatment focus.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The intake-inventory task distinguishes this item from IPT mechanism and treatment-goal questions while reducing shared duplicate language outside the fixed key.',
    distractorDesign: ['contingency-map-substitution', 'unrestricted-analysis-substitution', 'medical-monitoring-substitution'],
  }),
  'eppp-v3-intervention-065': rewrite('eppp-v3-intervention-065', {
    prompt: 'During a brief depression treatment, the clinician conducts a detailed exchange analysis of an argument and rehearses a clearer appeal for support. Which content domain best matches that work?',
    distractors: [
      'Associative material, dream symbolism, resistance, and interpretation of transference wishes',
      'Exposure hierarchies, safety-learning trials, conditioned cues, and response prevention',
      'Thought records, evidence review, core assumptions, and formal behavioral experiments',
    ],
    rationale: 'Communication analysis and rehearsal are used in IPT to improve functioning in a selected present relationship problem. This session-level task is especially consistent with work on conflict or changing social roles; the treatment remains focused and collaborative rather than becoming a general survey of every relationship.',
    wrongFeedback: [
      explain('Dream and transference interpretation can be used in psychodynamic treatment, but they do not explain the communication analysis and request rehearsal described.', 'The clinician is examining a present exchange to improve functioning in a selected interpersonal focus.'),
      explain('Exposure and response prevention address learned fear and avoidance through contact with cues, not through analysis of a relationship exchange.', 'Here the active method is clarifying communication and practicing a more effective interpersonal response.'),
      explain('Thought records and belief testing characterize cognitive therapy, although beliefs may naturally arise during any clinical conversation.', 'The defining clue is the detailed examination of an argument followed by rehearsal within a current relationship.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'A communication-analysis session makes this IPT item method-specific and distinct from the bank’s category, formulation, and outcome questions.',
    distractorDesign: ['psychodynamic-process-neighbor', 'exposure-process-neighbor', 'cognitive-restructuring-neighbor'],
  }),
  'eppp-v3-intervention-067': rewrite('eppp-v3-intervention-067', {
    prompt: 'A client with posttraumatic stress symptoms can describe an assault but continues to shun the street where it occurred despite a current safety assessment and narrates the memory from a detached distance. Which next plan best addresses both patterns?',
    distractors: [
      'Require distress to fall below a preset score in each exercise before approaching another reminder',
      'Complete cognitive restructuring first and postpone behavioral contact until danger beliefs are considered adequately resolved',
      'Use relaxation to terminate each exercise when arousal rises, making calmness the condition for continuation',
    ],
    rationale: 'PE addresses both restricted engagement with the trauma memory and avoidance of objectively safe reminders through repeated imaginal and in-vivo practice followed by processing. Exercises are collaborative and monitored, but a fixed within-session distress reduction is not the required criterion for learning or progression.',
    wrongFeedback: [
      explain('A preset distress endpoint treats habituation within one exercise as mandatory and can turn symptom reduction into a safety requirement.', 'PE evaluates broader learning and functioning across repeated practices rather than demanding a particular arousal curve each time.'),
      explain('Trauma-related beliefs can be discussed during processing, but waiting for complete cognitive resolution preserves avoidance of safe reminders.', 'PE uses experiential contact to generate learning that can revise danger and coping expectations over time.'),
      explain('Relaxation may be a general coping resource, yet ending exposure whenever arousal rises makes escape contingent on distress and can reinforce avoidance.', 'The exercise should be paced collaboratively while allowing tolerable contact with the memory or safe cue.'),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The detached-narration and street-avoidance case tests integration of PE components without duplicating the bank’s general treatment-description stems.',
    distractorDesign: ['fixed-habituation-criterion', 'cognition-before-contact', 'calmness-contingent-exit'],
  }),
  'eppp-v3-intervention-036': rewrite('eppp-v3-intervention-036', {
    prompt: 'An adult has chronic sleep-onset and sleep-maintenance difficulty despite receiving general sleep-hygiene education and prefers a durable behavioral treatment before considering medication. Which referral is best supported?',
    distractors: [
      'A melatonin protocol selected prior to assessment of sleep timing, health factors, or other medications',
      'Relaxation practice used as a stand-alone treatment that omits stimulus-control and sleep-scheduling work',
      'Additional sleep-hygiene handouts offered in place of structured assessment and an individualized intervention plan',
    ],
    rationale: 'CBT-I is a multicomponent treatment for chronic insomnia that commonly integrates stimulus control, sleep scheduling or restriction, cognitive work, education, and relapse planning. It is recommended as an initial treatment and is more comprehensive than sleep hygiene or relaxation alone.',
    wrongFeedback: [
      explain('Melatonin can be relevant to particular circadian or sleep presentations, but an unassessed supplement-only plan is not equivalent to comprehensive insomnia care.', 'The client is asking for a structured behavioral treatment with durable skills and individualized monitoring.'),
      explain('Relaxation may be one CBT-I component, yet stand-alone relaxation omits behavioral scheduling, stimulus control, and targeted cognitive procedures.', 'Those coordinated methods address processes that can perpetuate chronic insomnia even after basic education.'),
      explain('The client has already received general sleep-hygiene information, so repeating handouts does not answer the need for an individualized intervention.', 'CBT-I uses assessment and active behavioral and cognitive procedures rather than education alone.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The referral decision differentiates multicomponent CBT-I from common partial substitutes and breaks the generic first-line-treatment duplicate pattern.',
    distractorDesign: ['unassessed-supplement-monotherapy', 'relaxation-component-substitution', 'education-only-repeat'],
  }),
  'eppp-v2-intervention-003': rewrite('eppp-v2-intervention-003', {
    prompt: 'A parent learning to praise appropriate play and give effective commands performs the skills while a clinician observes the interaction and provides immediate private guidance. Which service format is illustrated?',
    distractors: [
      'A parent education group that discusses principles weekly but does not observe parent-child practice',
      'An individual child play session followed by a written summary sent to the caregiver',
      'A medication consultation in which parenting behavior is recorded but not coached during interaction',
    ],
    rationale: 'PCIT teaches caregivers skills during observed parent-child interaction, commonly with the therapist coaching in the moment from outside the room. Its child-directed and parent-directed phases use direct practice and performance feedback, which distinguishes it from didactic education or child-only treatment.',
    wrongFeedback: [
      explain('A didactic parent group can convey useful principles, but it omits the observed practice and immediate performance feedback central to this format.', 'The clinician in the vignette coaches the caregiver while the target interaction is actually occurring.'),
      explain('Child-only play therapy places the clinician with the child and may later involve caregiver consultation, but it does not match this live caregiver coaching arrangement.', 'Here the parent performs specific skills with the child while receiving real-time guidance.'),
      explain('Medication consultation may accompany care for some children, yet merely recording parenting behavior does not teach interaction skills through coached rehearsal.', 'The defining service feature is direct observation paired with immediate feedback to the caregiver.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The parent-skill performance vignette removes the live-coaching lexical cue and separates PCIT delivery from other parent and child services.',
    distractorDesign: ['didactic-parent-group', 'child-only-play-format', 'medication-monitoring-format'],
  }),
  'eppp-v2-intervention-054': rewrite('eppp-v2-intervention-054', {
    prompt: 'A person in recovery chooses a “healthier” walking route that passes a former drinking location, then decides to stop nearby to meet an old acquaintance. In Marlatt’s formulation, how should the route choice be understood?',
    distractors: [
      'A coping response that directly reduces exposure to a personally relevant relapse cue',
      'An abstinence-violation reaction occurring after substance use has already happened',
      'A lapse-management decision made after the person has reviewed the consequences of renewed use',
    ],
    rationale: 'The route appears benign but moves the person toward cues and circumstances associated with prior drinking, making it an apparently irrelevant decision in relapse-prevention analysis. Identifying the chain early creates an opportunity to choose a safer route or support before a high-risk situation develops.',
    wrongFeedback: [
      explain('The route does not reduce exposure to a relevant cue; it deliberately brings the person near a location linked with previous drinking.', 'A protective coping response would alter the chain before proximity and social contact increase relapse risk.'),
      explain('The abstinence-violation effect concerns interpretations and reactions after a lapse, whereas no substance use has yet occurred in this vignette.', 'The question targets an earlier decision that quietly increases the likelihood of entering a high-risk situation.'),
      explain('Lapse management begins after renewed use or an acute lapse concern and focuses on limiting escalation and restoring the plan.', 'Here the clinically useful analysis occurs upstream, when an innocent-seeming route choice starts shaping exposure.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The recovery-route chain converts a memorized definition into application and replaces three meaningless distractors with adjacent relapse-prevention concepts.',
    distractorDesign: ['protective-coping-misclassification', 'postlapse-effect-timing', 'lapse-management-timing'],
  }),
  'eppp-b014-intervention-2': rewrite('eppp-b014-intervention-2', {
    prompt: 'A substance-use program awards a voucher after each laboratory-confirmed substance-negative sample, with voucher value increasing across consecutive negative samples. What is the active behavior-change arrangement?',
    distractors: [
      'Providing a fixed participation stipend on the same schedule whether or not each sample is negative',
      'Removing earned privileges after a substance-positive sample while providing no consequence for negative samples',
      'Reducing access to cues associated with use before testing begins while leaving outcomes unrelated to the sample',
    ],
    wrongFeedback: [
      explain('A fixed stipend is noncontingent because payment occurs regardless of whether the verified target behavior is demonstrated.', 'The vignette instead links each voucher and its escalating value directly to substance-negative samples.'),
      explain('Loss of privileges after a positive sample is a response-cost procedure, even if it might also influence substance use.', 'The described program strengthens a desired verified outcome by delivering a benefit after that outcome.'),
      explain('Antecedent cue reduction changes conditions that occur before behavior and can support treatment, but it is not the voucher contingency described.', 'The active arrangement makes a specified consequence depend on objective evidence of the target response.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The voucher schedule tests identification of the operative contingency and replaces remote alternatives with noncontingent reinforcement, response cost, and antecedent control.',
    distractorDesign: ['noncontingent-stipend', 'response-cost-confusion', 'antecedent-control-confusion'],
  }),
  'eppp-b016-intervention-2': rewrite('eppp-b016-intervention-2', {
    prompt: 'After one mistake, a depressed client concludes, “I fail at everything,” withdraws from a valued task, and feels more hopeless. Which intervention best represents Beck’s approach?',
    distractors: [
      'Interpret the mistake as a disguised dream symbol before examining its present consequences',
      'Increase pleasant activities while treating the client’s conclusion as clinically irrelevant to the withdrawal',
      'Reorganize authority boundaries in the client’s household while leaving the meaning assigned to the mistake unexamined',
    ],
    wrongFeedback: [
      explain('Dream interpretation can occur in psychodynamic work, but it does not directly examine the overgeneralized conclusion linked with current withdrawal.', 'Beck’s approach collaboratively evaluates that automatic thought and tests more balanced alternatives in action.'),
      explain('Behavioral activation may be useful and is often integrated with cognitive therapy, but declaring the thought irrelevant misses the reciprocal formulation.', 'The conclusion, hopelessness, and avoidance can all be examined while activity provides real-world evidence.'),
      explain('Family-boundary work may be indicated in some cases, yet the vignette identifies a biased inference immediately connected with mood and behavior.', 'The most direct intervention evaluates that inference and uses behavioral evidence to test it.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The mistake-to-withdrawal sequence elicits cognitive formulation while the alternatives remain plausible neighboring interventions rather than caricatures.',
    distractorDesign: ['symbolic-meaning-priority', 'activation-without-cognition', 'family-boundary-priority'],
  }),
  'eppp-b017-intervention-1': rewrite('eppp-b017-intervention-1', {
    prompt: 'A client interprets a racing heart as proof of catastrophe, leaves the situation, and then becomes more fearful of returning. Which formulation most closely guides CBT?',
    distractors: [
      'The bodily response reveals a fixed unconscious conflict whose meaning must be interpreted before behavior can change',
      'The episode is explained by physiology alone, so appraisal, avoidance, and situational learning are secondary',
      'Supportive discussion should proceed while avoiding examination of predictions and rehearsal of a different situational response',
    ],
    wrongFeedback: [
      explain('An unconscious-conflict formulation may guide psychodynamic inquiry, but it does not capture the reciprocal appraisal and avoidance loop emphasized here.', 'CBT examines how interpretation, arousal, action, and context maintain one another and where change can occur.'),
      explain('Physiology contributes to the episode, yet treating it as the complete explanation overlooks catastrophic appraisal and escape learning.', 'The keyed formulation integrates bodily sensations with cognition, emotion, behavior, and situational context.'),
      explain('Supportive discussion can aid engagement, but avoiding prediction testing or behavioral practice leaves the identified maintenance cycle unexamined.', 'CBT would collaboratively test the catastrophe belief and practice a response that changes the loop.'),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The panic-like maintenance cycle asks learners to analyze reciprocal processes and removes conspicuous absolute claims from the alternatives.',
    distractorDesign: ['unconscious-conflict-monism', 'physiology-monism', 'support-without-testing'],
  }),
  'eppp-b017-intervention-2': rewrite('eppp-b017-intervention-2', {
    prompt: 'A group member says, “I thought I was the only one who felt ashamed after becoming a caregiver, but two people here described something similar.” Which therapeutic factor is most directly operating?',
    distractors: [
      'Altruism, because the member experiences value primarily by providing concrete help to another participant',
      'Group cohesiveness, because liking the group and feeling accepted is the sole change process described',
      'Imitative behavior, because the member adopts a coping action after watching another participant model it',
    ],
    wrongFeedback: [
      explain('Altruism concerns therapeutic benefit from helping others, whereas the member emphasizes discovering shared experience in what others disclosed.', 'The reduction in singularity and shame is the discriminating feature of universality.'),
      explain('Cohesiveness and acceptance may support disclosure, but the quoted change is not simply attachment to or satisfaction with the group.', 'The member specifically revises the belief that no one else has a related struggle.'),
      explain('Imitative behavior involves learning by observing and trying another person’s behavior, which is not described in this exchange.', 'Hearing comparable experiences reduces perceived uniqueness without requiring adoption of another member’s coping action.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The caregiver disclosure distinguishes universality from three credible Yalom factors and avoids extreme claims about identical experiences or legal guarantees.',
    distractorDesign: ['altruism-neighbor', 'cohesiveness-neighbor', 'imitative-behavior-neighbor'],
  }),
  'eppp-b018-intervention-3': rewrite('eppp-b018-intervention-3', {
    prompt: 'A learner cannot yet complete a complex motor response. The trainer first rewards an attainable version, then gradually requires responses that more closely resemble the final performance. Which procedure is being used?',
    distractors: [
      'Reinforcing completion of successive links in a stable multistep sequence while keeping each link topographically unchanged',
      'Delivering reinforcement whenever the target response is absent for a specified observation interval',
      'Demonstrating the completed response repeatedly and relying on observation rather than contingent performance feedback',
    ],
    wrongFeedback: [
      explain('Chaining joins already defined component responses into an ordered sequence, rather than changing the form required for reinforcement across trials.', 'The trainer here raises the approximation criterion as performance increasingly resembles one target response.'),
      explain('Differential reinforcement of other behavior rewards periods without an unwanted response and is designed primarily to reduce that response.', 'This vignette builds a new performance by selectively reinforcing progressively closer forms.'),
      explain('Modeling may facilitate acquisition, but observation without contingent consequences does not describe the reinforcement schedule in the vignette.', 'The trainer delivers reinforcement selectively as the learner reaches each successive approximation criterion.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The motor-learning sequence tests shaping against chaining, DRO, and modeling, replacing punishment and respondent-conditioning caricatures.',
    distractorDesign: ['chaining-neighbor', 'dro-neighbor', 'modeling-without-contingency'],
  }),
  'eppp-b025-intervention-3': rewrite('eppp-b025-intervention-3', {
    prompt: 'A client’s effort to force sleep intensifies dread about bedtime. With careful collaboration, the therapist asks the client to try to remain awake peacefully rather than struggle to make sleep happen. Which Frankl technique is illustrated?',
    distractors: [
      'Thought stopping, in which the client interrupts the sleep worry whenever it appears and redirects attention',
      'Stimulus control, in which the client leaves the bed when unable to sleep and returns when drowsy',
      'Systematic desensitization, in which imagined sleep situations are paired progressively with relaxation',
    ],
    wrongFeedback: [
      explain('Thought stopping seeks to interrupt or redirect a distressing cognition, whereas the assigned exercise changes the client’s stance toward the feared outcome.', 'The invitation to remain awake deliberately loosens the struggle that fuels anticipatory anxiety.'),
      explain('Stimulus control is a well-supported insomnia procedure that changes associations between bed and wakefulness, but it does not name this paradoxical instruction.', 'The therapist specifically invites the feared response rather than prescribing when to leave or return to bed.'),
      explain('Systematic desensitization pairs graded fear cues with a competing relaxation response, which differs from deliberately wishing for or exaggerating the feared event.', 'The intervention aims to disrupt anxious striving through a paradoxical change in intention.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The insomnia scenario distinguishes paradoxical intention from three credible behavioral procedures without relying on absolute or implausible distractors.',
    distractorDesign: ['thought-stopping-neighbor', 'stimulus-control-neighbor', 'desensitization-neighbor'],
  }),
  'eppp-v2-intervention-013': rewrite('eppp-v2-intervention-013', {
    prompt: 'A couple experiencing performance anxiety receives private homework that temporarily removes intercourse as a goal and directs attention to giving and receiving touch. How should this intervention develop?',
    distractors: [
      'Begin with intercourse attempts while monitoring performance and add non-demand touch after anxiety subsides',
      'Use psychoeducation and communication discussion while postponing any structured experiential assignment',
      'Challenge beliefs about performance in session and treat touch practice as unnecessary when insight improves',
    ],
    wrongFeedback: [
      explain('Beginning with intercourse preserves the performance demand that the early exercise is designed to reduce and reverses the graduated sequence.', 'Sensate focus initially emphasizes sensory awareness and non-demand touch before later sexual stages are introduced.'),
      explain('Education and communication work can support sex therapy, but postponing experiential assignments omits the behavioral learning central to this intervention.', 'Structured touching practice helps partners shift attention from evaluation toward sensory experience and connection.'),
      explain('Cognitive work may address rigid performance beliefs, yet treating touch practice as unnecessary removes the defining experiential component.', 'The method combines a graduated behavioral assignment with reduction of spectatoring and demand.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The homework-development decision replaces modality caricatures with credible sequencing errors and preserves the source-supported graduated structure.',
    distractorDesign: ['performance-demand-first', 'education-without-practice', 'cognition-without-experience'],
  }),
  'eppp-v2-intervention-019': rewrite('eppp-v2-intervention-019', {
    prompt: 'After several participants disclose comparable fears, a previously silent member reports feeling less defective and more willing to participate. Which group mechanism best explains that immediate shift?',
    distractors: [
      'Corrective recapitulation, because the group has reenacted and repaired the member’s original family structure',
      'Interpersonal learning, because peers have given direct feedback about the member’s impact on them',
      'Instillation of hope, because observing another member’s improvement provides evidence that change is possible',
    ],
    wrongFeedback: [
      explain('Corrective recapitulation involves reworking family-like relational patterns in the group, which is not the event described in the vignette.', 'The immediate change follows recognition that other participants have related fears and experiences.'),
      explain('Interpersonal learning often uses feedback about how a person affects others, but no such feedback or relational experiment is described.', 'The member’s shame decreases after discovering the struggle is shared rather than uniquely defective.'),
      explain('Hope can increase when members witness progress, yet the vignette does not say that another participant improved or modeled recovery.', 'The operative information is similarity of experience, which directly reduces isolation.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The shame-reduction vignette distinguishes universality from three neighboring group factors and eliminates the prior ungrammatical extreme alternatives.',
    distractorDesign: ['family-recapitulation-neighbor', 'interpersonal-learning-neighbor', 'hope-neighbor'],
  }),
  'eppp-v2-intervention-046': rewrite('eppp-v2-intervention-046', {
    prompt: 'Which observation most specifically indicates universality rather than cohesion or interpersonal learning during a therapy group?',
    distractors: [
      'A member feels accepted by the group and becomes more invested in attending and protecting the group’s work',
      'A member recognizes a recurring interpersonal impact after receiving convergent feedback from several peers',
      'A member gains confidence after watching a peer use a difficult skill successfully outside the group',
    ],
    wrongFeedback: [
      explain('Feeling accepted and committed to the group is a strong example of cohesiveness, which can support many other therapeutic processes.', 'Universality is more specifically demonstrated when shared experiences revise a person’s belief that the problem is uniquely theirs.'),
      explain('Learning about one’s interpersonal impact from peer feedback illustrates interpersonal learning rather than the shared-experience mechanism asked about.', 'The keyed observation concerns reduced isolation through recognizing similarity with other members.'),
      explain('Confidence gained from another member’s successful coping can instantiate hope or modeling, even though it occurs in a group setting.', 'Universality depends on discovering related struggles, not principally on observing another person’s progress.'),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'This discriminative item now tests universality against adjacent group mechanisms rather than repeating a basic definition with conspicuous distractors.',
    distractorDesign: ['cohesion-neighbor', 'interpersonal-feedback-neighbor', 'hope-modeling-neighbor'],
  }),
  'eppp-v2-intervention-059': rewrite('eppp-v2-intervention-059', {
    prompt: 'A classroom plan provides access to a preferred activity after each five-minute period in which a student does not call out. Which contingency does this schedule instantiate?',
    distractors: [
      'Reinforcing hand-raising, a specific appropriate response selected to replace calling out',
      'Providing the preferred activity at fixed times independently of whether calling out occurred',
      'Removing a token after each call-out while withholding reinforcement at other times',
    ],
    wrongFeedback: [
      explain('Reinforcing a defined replacement such as hand-raising is differential reinforcement of alternative behavior rather than other behavior.', 'The schedule in the vignette requires absence of calling out but does not require one particular replacement response.'),
      explain('Time-based access delivered independently of behavior is noncontingent reinforcement, even if it reduces motivation for calling out.', 'Here access depends specifically on completing the interval without the target behavior.'),
      explain('Removing a token after calling out is response cost, a punishment procedure that follows occurrence of the target behavior.', 'The described plan instead delivers reinforcement after an interval in which that behavior does not occur.'),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The interval schedule tests DRO against DRA, noncontingent reinforcement, and response cost with credible classroom alternatives.',
    distractorDesign: ['dra-neighbor', 'noncontingent-reinforcement-neighbor', 'response-cost-neighbor'],
  }),
  'eppp-v2-intervention-062': rewrite('eppp-v2-intervention-062', {
    prompt: 'A client says the therapist is pushing an agenda, then becomes quiet and misses a session. What response best handles the possible relational strain?',
    distractors: [
      'Re-explain the treatment rationale and continue unchanged, treating the withdrawal as simple noncompliance',
      'Change to a different manual before asking how the client experienced the interaction',
      'Wait for the client to raise the concern again so that therapist influence does not shape the discussion',
    ],
    wrongFeedback: [
      explain('Clarifying rationale may eventually help, but labeling withdrawal as noncompliance bypasses the client’s report of pressure and the relational meaning of the exchange.', 'Direct exploration can reveal a disagreement about goals or tasks and support collaborative adjustment. '),
      explain('Changing manuals before understanding the event treats treatment selection as the whole problem and misses the interpersonal rupture signal.', 'The therapist should first invite the client’s perspective, take appropriate responsibility, and renegotiate the work. '),
      explain('Waiting can allow withdrawal to deepen because clients do not invariably feel safe initiating a difficult conversation with the therapist.', 'A tactful, nondefensive invitation makes the possible strain discussable without presuming what it means. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The missed-session vignette tests recognition and collaborative repair against three credible avoidance responses rather than dramatic termination caricatures.',
    distractorDesign: ['rationale-without-inquiry', 'manual-switch-before-repair', 'client-initiation-only'],
  }),
  'eppp-v3-intervention-014': rewrite('eppp-v3-intervention-014', {
    prompt: 'Several credible intervention models yield improvement, and outcome differences track relationship quality, agreed aims, and confidence in the work. Which explanation best organizes those findings?',
    distractors: [
      'Medication expectancy considered apart from the relationship and from the psychotherapy rationale',
      'Accurate use of the technique unique to whichever manual was selected, with therapist variation treated as error',
      'Strict adherence to theoretical language, even when client preferences and agreement about the work are weak',
    ],
    wrongFeedback: [
      explain('Medication expectancy can affect outcomes in relevant care, but isolating it does not explain relationship and collaboration effects across psychotherapies.', 'The pattern is broader and includes interpersonal and expectancy processes shared by credible treatment approaches. '),
      explain('Specific techniques can matter, yet treating therapist variation as error contradicts the outcome pattern described in the stem.', 'A common-factors account gives meaningful weight to alliance, empathy, expectations, and agreed therapeutic work. '),
      explain('Model coherence may support treatment, but theoretical vocabulary cannot substitute for collaboration or responsiveness to the client.', 'The findings point toward shared relational and expectancy processes rather than language fidelity alone. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The cross-model outcome pattern tests interpretation of common factors and replaces repeated only statements with plausible process explanations.',
    distractorDesign: ['medication-expectancy-narrowing', 'unique-technique-monism', 'theoretical-language-fidelity'],
  }),
  'eppp-v3-intervention-038': rewrite('eppp-v3-intervention-038', {
    prompt: 'A client abandons a valued presentation whenever anxiety appears and spends hours trying to suppress thoughts about embarrassment. In ACT terms, which process is maintaining the restriction?',
    distractors: [
      'Practical avoidance of an objectively hazardous setting after a realistic risk assessment',
      'Willing contact with discomfort while taking action in the direction of an identified value',
      'Cognitive defusion that helps the client notice an embarrassment thought as a passing mental event',
    ],
    wrongFeedback: [
      explain('Avoiding a genuinely hazardous setting after proportionate risk assessment can be adaptive and is not the process ACT is identifying here.', 'The presentation is valued and not objectively dangerous; the restriction follows efforts to escape private discomfort. '),
      explain('Willingness paired with value-consistent action is an ACT alternative to the maintaining pattern, not a description of that pattern.', 'The client instead organizes behavior around controlling anxiety and suppressing thoughts. '),
      explain('Defusion changes the function of a thought by allowing it to be noticed without automatic obedience, which would increase flexibility.', 'Hours of suppression and cancellation of valued action reflect the contrasting avoidance process. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The valued-presentation case requires distinguishing experiential avoidance from realistic safety behavior, willingness, and defusion without lexical scaffolding.',
    distractorDesign: ['realistic-hazard-avoidance', 'willingness-opposite-process', 'defusion-opposite-process'],
  }),
  'eppp-v3-intervention-047': rewrite('eppp-v3-intervention-047', {
    prompt: 'A DBT client wants to seek a schedule change, preserve a valued workplace connection, and avoid abandoning personal values. Which skills package most directly addresses those three aims?',
    distractors: [
      'Observe, describe, and participate while practicing a nonjudgmental, one-mindful, effective stance',
      'Check the facts, opposite action, and problem solving to change an emotion or its consequences',
      'STOP, paced breathing, and crisis-survival distraction to avoid making an acute situation worse',
    ],
    wrongFeedback: [
      explain('The mindfulness skills support awareness and effective participation, but they do not provide the specific request, relationship, and self-respect strategies asked about.', 'Those three interpersonal priorities are mapped by the keyed DBT acronyms. '),
      explain('Checking facts and opposite action belong to emotion regulation and may help prepare for the conversation.', 'They do not directly organize how to make the request, maintain the relationship, and preserve self-respect. '),
      explain('STOP and crisis-survival tools help a client tolerate acute distress without impulsive action, which can be useful before a conversation.', 'The stem asks for skills that structure the interpersonal exchange itself. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The workplace request makes learners map three interpersonal priorities to DBT modules while distractors represent credible neighboring skill sets.',
    distractorDesign: ['mindfulness-module-neighbor', 'emotion-regulation-module-neighbor', 'distress-tolerance-module-neighbor'],
  }),
  'eppp-v3-intervention-054': rewrite('eppp-v3-intervention-054', {
    prompt: 'A rural clinic is deciding whether to retain secure video psychotherapy after travel restrictions end. Which evidence summary is the most defensible starting point?',
    distractors: [
      'Comparable outcomes are established for medication visits, but psychotherapy outcome evidence remains too limited to inform service planning',
      'Average outcomes favor office treatment across diagnoses, so access gains rarely justify video delivery',
      'Evidence supports video care as a universal substitute that removes the need to assess privacy, fit, risk, or technology barriers',
    ],
    wrongFeedback: [
      explain('Telehealth research includes psychotherapy rather than being confined to medication management, although results vary by intervention and population.', 'Planning should consider the relevant evidence alongside client needs, clinical risk, privacy, and technical access. '),
      explain('A blanket office advantage is not supported for the many conditions and structured treatments showing similar average outcomes by video.', 'Modality choice still requires attention to individual fit instead of assuming either format is superior in every case. '),
      explain('Evidence of comparable outcomes does not make video treatment appropriate for every client or eliminate implementation responsibilities.', 'The clinic must assess safety, confidentiality, accessibility, technology, clinician competence, and client preference. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The service-planning decision replaces sweeping efficacy claims with nuanced evidence interpretations and preserves necessary modality-fit caveats.',
    distractorDesign: ['medication-evidence-narrowing', 'office-average-superiority', 'universal-video-substitution'],
  }),
  'eppp-v3-intervention-057': rewrite('eppp-v3-intervention-057', {
    prompt: 'A therapist has a client complete a validated symptom and functioning measure at regular periods, reviews the trajectory together, and adjusts care when improvement stalls. Which practice is illustrated?',
    distractors: [
      'One-time diagnostic screening used at intake with no later comparison to the client’s treatment course',
      'A therapist-adherence checklist used by a supervisor to score whether prescribed techniques were delivered',
      'A satisfaction survey completed after termination and stored rather than used to inform decisions during treatment',
    ],
    wrongFeedback: [
      explain('Intake screening can support assessment, but a single score cannot provide the repeated trajectory needed to detect progress or deterioration.', 'The vignette emphasizes serial outcomes that are reviewed and used during care. '),
      explain('Adherence measurement evaluates delivery of a treatment protocol rather than the client’s changing symptoms or functioning.', 'Measurement-based care feeds patient outcome data into collaborative clinical decisions over time. '),
      explain('A termination survey may improve future services, yet data collected after care and not used during treatment cannot guide current adjustments.', 'The active feature here is timely feedback from repeated standardized outcome assessment. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The stalled-progress vignette tests the measurement-to-decision loop against screening, fidelity monitoring, and post-treatment satisfaction assessment.',
    distractorDesign: ['intake-screening-only', 'fidelity-measure-confusion', 'posttermination-satisfaction-only'],
  }),
  'eppp-v3-intervention-063': rewrite('eppp-v3-intervention-063', {
    prompt: 'When selecting among reasonable interventions, a psychologist reviews outcome evidence, considers personal competence, and elicits the client’s background, goals, and treatment priorities. Which formulation best describes this decision process?',
    distractors: [
      'Selecting the intervention with the largest published average effect while omitting evaluation of therapist competence and client fit',
      'Following the client’s initial preference while omitting discussion of evidence, feasibility, risks, and available clinical expertise',
      'Using the clinician’s customary intervention because familiarity is treated as sufficient evidence of suitability',
    ],
    rationale: 'Evidence-based practice integrates relevant research evidence, clinical expertise, and the patient’s characteristics, culture, values, and preferences. Integration requires judgment about fit and feasibility; none of the three elements functions as an automatic trump card in every clinical decision.',
    wrongFeedback: [
      explain('Average research findings are important, but applying them without competence and client-fit analysis reduces integration to evidence selection alone.', 'Evidence-based practice combines research with clinical judgment and the person’s circumstances, culture, values, and preferences. '),
      explain('Client preference is an essential part of collaborative care, yet preference alone does not address evidence, risks, feasibility, or professional competence.', 'The decision process should integrate these considerations transparently rather than assigning one element exclusive control. '),
      explain('Clinician familiarity can contribute to competence, but habit does not establish that a treatment is supported or appropriate for this client.', 'A defensible choice weighs research, expertise, and the individual’s characteristics and priorities together. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The revision corrects the live stem-key mismatch and replaces single-source caricatures with plausible but incomplete evidence-based-practice decisions.',
    distractorDesign: ['research-alone-selection', 'preference-alone-selection', 'habit-as-sufficient-fit'],
  }),
  'eppp-v3-intervention-068': rewrite('eppp-v3-intervention-068', {
    prompt: 'A client with posttraumatic stress symptoms shuns reminders judged currently nonhazardous and gives a highly abbreviated account of the event. Which procedure most directly targets both patterns?',
    distractors: [
      'Write an impact statement and challenge stuck points about safety, trust, power, esteem, and intimacy',
      'Attend to a selected traumatic image while following bilateral stimulation within a phased protocol',
      'Use present-centered problem solving while agreeing not to approach trauma memories or avoided reminders directly',
    ],
    rationale: 'Prolonged Exposure uses repeated imaginal revisiting of the trauma memory and in-vivo approach to objectively safe reminders, with processing of learning across practice. Assessment, consent, pacing, and monitoring remain essential, and temporary distress is not itself evidence that exposure is harmful.',
    wrongFeedback: [
      explain('Impact statements and work on stuck points are characteristic cognitive processing therapy procedures rather than the PE procedure asked about.', 'Both are trauma-focused treatments, but PE directly combines imaginal revisiting with approach to safe avoided cues. '),
      explain('Attention to a target memory during bilateral stimulation is associated with EMDR and occurs within its own phased treatment protocol.', 'The keyed procedure instead relies on repeated imaginal and in-vivo exposure followed by processing. '),
      explain('Present-centered problem solving can be an active treatment, but deliberately excluding memory and reminder approach does not directly target avoidance through PE.', 'The vignette specifically calls for supported engagement with both the account and safe trauma cues. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The revision corrects a person-centered stem mismatch and tests PE against three credible PTSD treatment approaches with distinct active procedures.',
    distractorDesign: ['cpt-procedure-neighbor', 'emdr-procedure-neighbor', 'present-centered-neighbor'],
  }),
  'eppp-b001-intervention-2': rewrite('eppp-b001-intervention-2', {
    prompt: 'Two exposure plans are being compared for a severe but objectively safe dog fear. Which feature distinguishes traditional flooding from systematic desensitization?',
    distractors: [
      'Progressing through a collaboratively ranked fear hierarchy while using practiced relaxation at each step',
      'Beginning with a mildly distressing imagined dog and advancing after mastery across several sessions',
      'Testing a catastrophic prediction during moderate exposure while selecting intensity flexibly from a hierarchy',
    ],
    wrongFeedback: [
      explain('A graded hierarchy paired with relaxation describes traditional systematic desensitization rather than the defining contrast asked about.', 'Flooding begins with sustained contact at a highly feared level instead of advancing stepwise. '),
      explain('Starting with a mild imaginal cue and advancing after mastery is another graded exposure sequence, even if it is clinically sensible.', 'The traditional flooding distinction is the initial use of a high-intensity feared stimulus. '),
      explain('Flexible moderate exposure with prediction testing is compatible with contemporary exposure practice but does not specifically identify traditional flooding.', 'The keyed contrast concerns high-intensity entry rather than a collaboratively graded hierarchy. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The comparison now uses three credible exposure designs and retains explicit consent and safeguard boundaries in the existing rationale.',
    distractorDesign: ['graded-relaxation-sequence', 'mild-imaginal-progression', 'flexible-moderate-exposure'],
  }),
  'eppp-b004-intervention-2': rewrite('eppp-b004-intervention-2', {
    prompt: 'A client has met the agreed goals, and the final three sessions are scheduled. Which approach best uses this closing phase?',
    distractors: [
      'Keep the ending implicit and send a brief closure message after the final scheduled appointment',
      'Add open-ended sessions while declining to revisit goals because sadness about ending is treated as continued treatment need',
      'Reserve discussion of maintenance, warning signs, and referrals for contact initiated by the client after termination',
    ],
    wrongFeedback: [
      explain('An implicit ending misses opportunities to consolidate learning, discuss reactions, and clarify how the client can seek future help.', 'Planned sessions allow these tasks to occur collaboratively before the therapeutic relationship ends. '),
      explain('Feelings about termination deserve attention but do not by themselves demonstrate clinical need for indefinite treatment.', 'The clinician should review goals, explore the ending, and make a proportionate plan rather than automatically extending care. '),
      explain('Waiting until after termination can leave the client without a clear maintenance or contingency plan when difficulties arise.', 'Relapse indicators, supports, and appropriate referral options are better reviewed during the scheduled ending phase. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The scheduled-ending scenario replaces obvious neglect alternatives with realistic timing and boundary errors around termination planning.',
    distractorDesign: ['implicit-ending', 'termination-affect-as-extension', 'posttermination-planning-delay'],
  }),
  'eppp-b008-intervention-1': rewrite('eppp-b008-intervention-1', {
    prompt: 'A meta-analysis finds that stronger alliance ratings are associated with better psychotherapy outcomes across several orientations. Which conclusion is warranted by that result?',
    distractors: [
      'Alliance quality can replace disorder-relevant assessment and selection of an appropriate treatment approach',
      'The association establishes that alliance is the single causal ingredient responsible for improvement',
      'Appointment attendance is an adequate proxy for alliance because both reflect engagement with treatment',
    ],
    wrongFeedback: [
      explain('Alliance supports treatment but does not remove the need for competent assessment, risk management, or an intervention suited to the presenting problem.', 'The finding concerns association with outcome, not interchangeability with the rest of clinical care. '),
      explain('An association across studies does not isolate one causal mechanism or rule out reciprocal effects, client factors, and treatment processes.', 'The supported conclusion is a reliable correlation rather than proof of sole causation. '),
      explain('Attendance is behaviorally observable but does not capture agreement on goals and tasks or the quality of the relational bond.', 'Using it as an adequate proxy would change the construct measured and overstate what the meta-analysis found. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The evidence-interpretation question now uses three credible overclaims and tests correlation, construct validity, and treatment-context boundaries.',
    distractorDesign: ['alliance-as-treatment-substitute', 'single-cause-inference', 'attendance-proxy-error'],
  }),
  'eppp-v2-intervention-055': rewrite('eppp-v2-intervention-055', {
    prompt: 'After a critical review, a client says, “I must perform perfectly; if I do not, I am worthless,” and then becomes despondent. Which REBT target and method best fit the formulation?',
    distractors: [
      'The activating review itself, using environmental control to prevent future criticism from occurring',
      'The despondent feeling as an isolated symptom, using relaxation before examining the client’s appraisal',
      'An early relationship template, using transference interpretation as the required route to change the belief',
    ],
    rationale: 'REBT locates the demanding and global self-rating beliefs between the activating event and the emotional-behavioral consequences. Collaborative disputation examines their logic, evidence, and usefulness and supports a more flexible philosophy; it does not imply that criticism or difficult emotion must disappear.',
    wrongFeedback: [
      explain('The critical review is the activating event in the ABC sequence, but REBT does not assume that preventing all criticism is the primary therapeutic mechanism.', 'The client’s rigid demand and global self-rating mediate the despondent consequence and are the direct target. '),
      explain('Relaxation can reduce arousal, yet treating emotion apart from the appraisal omits the belief component that distinguishes the REBT formulation.', 'The therapist examines demandingness and worth judgments while also supporting behavioral practice. '),
      explain('Relational history may be clinically useful, but transference interpretation is not required to dispute the present absolutistic belief in REBT.', 'The method directly evaluates the belief’s logic, evidence, and pragmatic consequences. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The performance-review ABC analysis differentiates REBT from environmental control, symptom-only relief, and psychodynamic interpretation while breaking definitional duplicates.',
    distractorDesign: ['activating-event-as-target', 'consequence-only-treatment', 'transference-required-change'],
  }),
  'eppp-b026-intervention-2': rewrite('eppp-b026-intervention-2', {
    prompt: 'A program awards points immediately after specified adaptive behavior, and participants later trade points for chosen activities or items. What function do the points acquire?',
    distractors: [
      'Discriminative stimuli that signal whether a target response will be observed but have no reinforcing history',
      'Primary reinforcers whose effectiveness does not depend on learning or access to another consequence',
      'Response-cost penalties removed after appropriate behavior to suppress competing responses',
    ],
    rationale: 'The points acquire reinforcing value through their learned relation to the activities or items available in exchange. A sound token program defines target responses, delivery and exchange rules, choice and monitoring, then plans fading and transfer so adaptive behavior is maintained beyond the program.',
    wrongFeedback: [
      explain('A discriminative stimulus signals the availability of a consequence under certain conditions, but the points here are themselves delivered after behavior.', 'Their learned exchange relation allows them to strengthen the target response as conditioned reinforcers. '),
      explain('Primary reinforcers have value without the relevant learning history, whereas arbitrary points become useful through association with exchangeable outcomes.', 'Calling the points primary overlooks the acquired relation that gives a token its reinforcing function. '),
      explain('Response cost removes an earned item or privilege after behavior in order to reduce that behavior, which reverses the described contingency.', 'Here points are added following adaptive performance and can later be exchanged for selected outcomes. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The item now tests the acquired function of points within a program rather than duplicating another token-economy definition or emphasizing an exchange list.',
    distractorDesign: ['discriminative-stimulus-confusion', 'primary-reinforcer-confusion', 'response-cost-reversal'],
  }),
  'eppp-b018-intervention-2': rewrite('eppp-b018-intervention-2', {
    prompt: 'A trauma survivor concludes, “Because I froze, the assault was my fault.” Within cognitive processing therapy, what should the therapist help the client do with this conclusion?',
    distractors: [
      'Recount the trauma repeatedly while postponing examination of the guilt conclusion until exposure is complete',
      'Replace the memory with a safe image whenever guilt arises so that the conclusion is not activated',
      'Treat the conclusion as a factual account that should be accepted before work shifts to general stress management',
    ],
    rationale: 'CPT treats the self-blaming conclusion as a stuck point that can be examined for missing context, hindsight bias, and inaccurate responsibility. Structured cognitive work supports a more balanced account while respecting the reality of the trauma and avoiding coerced reassurance or forced disclosure beyond the protocol.',
    wrongFeedback: [
      explain('Repeated imaginal recounting is associated more directly with PE, and postponing the guilt belief misses the central CPT target already present.', 'CPT uses structured questions and worksheets to evaluate the responsibility conclusion and develop a balanced appraisal. '),
      explain('Substituting a safe image whenever guilt appears functions as avoidance of the memory and appraisal rather than examination of the stuck point.', 'The client needs supported contact with the belief so evidence, context, and responsibility can be evaluated. '),
      explain('Accepting self-blame as fact risks reinforcing an inaccurate trauma-related belief and fails to use CPT’s cognitive methods.', 'The therapist should validate distress without endorsing the conclusion and collaboratively analyze the evidence. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The freeze-response guilt case tests responsibility-focused CPT reasoning and separates the item from generic lists of stuck-point themes.',
    distractorDesign: ['pe-sequencing-substitution', 'safe-image-avoidance', 'self-blame-as-fact'],
  }),
  'eppp-b026-intervention-3': rewrite('eppp-b026-intervention-3', {
    prompt: 'After preparation and stabilization, a therapist using a bilateral-stimulation protocol asks a client to identify a troubling image, negative self-belief, feeling, and body location. During the next phase, where is attention directed?',
    distractors: [
      'Toward a graded list of safe external reminders while the memory target is intentionally left inactive',
      'Toward a written evidence analysis that excludes concurrent attention to the memory and body response',
      'Toward spontaneous dream associations that the therapist interprets before returning to the selected target',
    ],
    rationale: 'In EMDR processing, the client brings aspects of the assessed target and its associated cognition, emotion, and bodily sensation to mind while engaging in bilateral stimulation. This occurs within a phased protocol that includes preparation, monitoring, reevaluation, and trained clinical judgment rather than eye movements as an isolated technique.',
    wrongFeedback: [
      explain('Approaching safe external reminders while intentionally leaving the memory inactive resembles an in-vivo exposure task, not the EMDR processing step described.', 'The assessed image, cognition, emotion, and somatic response remain part of the selected target during bilateral stimulation. '),
      explain('Written evidence analysis can be used in cognitive therapies, but excluding the memory and body response changes the procedure tested here.', 'EMDR processing asks the client to attend to multiple aspects of the target while bilateral stimulation is applied. '),
      explain('Open-ended dream interpretation is not a defining phase of the EMDR protocol and would shift attention away from the deliberately assessed target.', 'The therapist returns to target-linked material and follows the protocol’s processing and reevaluation sequence. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The phase-transition vignette distinguishes EMDR target processing from in-vivo exposure, cognitive worksheets, and analytic association while breaking a general-definition duplicate.',
    distractorDesign: ['external-cue-only-exposure', 'written-cognition-only', 'dream-association-detour'],
  }),
  'eppp-b011-intervention-2': rewrite('eppp-b011-intervention-2', {
    prompt: 'A client asks why posttraumatic treatment includes recounting an event in session and practicing visits to an ordinary store that poses no current danger. Which description gives the best treatment rationale?',
    distractors: [
      'The two exercises are used mainly to distract from trauma-related thoughts until anxiety is absent outside therapy',
      'The store visits test general social confidence, while the trauma account is used for the purpose of improving autobiographical detail',
      'The exercises provide reassurance from the therapist so that the client does not experience meaningful distress during practice',
    ],
    rationale: 'PE uses supported repeated contact with the trauma memory and safe avoided situations to reduce avoidance and create new learning about danger, distress, and coping. The work is collaborative and paced, but neither distraction nor guaranteed calm is its mechanism; progress is assessed across practice and functioning.',
    wrongFeedback: [
      explain('Distraction from trauma cues conflicts with the engagement required for exposure learning and can preserve the belief that the cues are intolerable.', 'The paired exercises approach rather than suppress the memory and objectively safe reminders. '),
      explain('Autobiographical detail and social confidence may change, but they do not explain why these particular memory and store exercises are paired.', 'Both tasks directly address avoidance and permit revision of danger and coping expectations. '),
      explain('Therapeutic support is important, yet reassurance designed to eliminate meaningful distress can become a safety behavior and obscure new learning.', 'PE allows tolerable distress while the client discovers what occurs during sustained, supported engagement. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The mechanism-explanation task is distinct from simple PE component recognition and reduces shared wording with the bank’s other exposure definitions.',
    distractorDesign: ['distraction-as-mechanism', 'unrelated-dual-purpose', 'reassurance-as-safety-signal'],
  }),
  'eppp-v2-intervention-008': rewrite('eppp-v2-intervention-008', {
    prompt: 'An ACT therapist asks a client to say, “I am having the thought that I am unlovable,” and notice the words as sounds before choosing whether to call a friend. What shift is the exercise intended to support?',
    distractors: [
      'Replacing the thought with a more rational proposition after proving that its factual content is false',
      'Preventing the thought from entering awareness by redirecting attention whenever it begins',
      'Increasing concentration speed so that the client can analyze the thought before emotion develops',
    ],
    rationale: 'The exercise changes the client’s relationship to the thought by making it more observable as a mental event rather than a command or literal identity. Defusion does not require proving the thought false; it creates behavioral space for a value-consistent action such as contacting a friend.',
    wrongFeedback: [
      explain('Evaluating evidence and replacing an inaccurate proposition describes cognitive restructuring more directly than defusion.', 'ACT can discuss workability, but this exercise loosens literal attachment without requiring a verdict that the thought is false. '),
      explain('Thought suppression attempts to remove private experience and can strengthen the struggle with it, contrary to the exercise’s purpose.', 'The client is invited to notice the words openly while retaining freedom to choose a valued action. '),
      explain('Processing speed is unrelated to the functional shift demonstrated by adding the phrase and noticing sound qualities.', 'The exercise targets the thought’s control over behavior, not how rapidly the client can analyze it. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The phrase-and-action exercise makes defusion behaviorally observable and separates this item from the bank’s abstract ACT definitions.',
    distractorDesign: ['cognitive-restructuring-neighbor', 'thought-suppression-neighbor', 'processing-speed-misread'],
  }),
  'eppp-v2-intervention-027': rewrite('eppp-v2-intervention-027', {
    prompt: 'During an intake with a college student debating reduced weekend cannabis use after missed classes and falling grades, a clinician asks what matters about change, acknowledges persistence through prior attempts, reflects mixed feelings about friendships organized around use, and periodically gathers the discussion. Which communication toolkit is being used?',
    distractors: [
      'Elicit-provide-elicit, because the clinician is giving tailored information after obtaining permission and checking understanding',
      'Developing discrepancy, because the responses repeatedly contrast current behavior with the client’s stated values',
      'A decisional balance, because the clinician is constructing a formal list of advantages and disadvantages of change',
    ],
    rationale: 'The four clinician behaviors instantiate OARS: open questions, affirmations, reflective listening, and summaries. OARS is delivered in MI’s collaborative, accepting, compassionate, evocative spirit; using the skills mechanically to pressure a client would not represent competent MI.',
    wrongFeedback: [
      explain('Elicit-provide-elicit is an MI information-sharing sequence, but the vignette does not describe permission, information delivery, and a comprehension check.', 'It instead samples the four core communication behaviors represented in OARS. '),
      explain('Developing discrepancy is a strategic process that may emerge through these responses, but the stem enumerates communication forms rather than one change mechanism.', 'Questions, affirmations, reflections, and summaries can serve several MI processes. '),
      explain('A decisional balance explicitly explores perceived benefits and costs, whereas no formal comparison list is constructed in the vignette.', 'The clinician is using a broader communication toolkit to evoke and understand the client’s perspective. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The session transcript tests recognition of OARS against three genuine MI strategies and breaks the duplicate acronym-definition format.',
    distractorDesign: ['information-sharing-neighbor', 'discrepancy-process-neighbor', 'decisional-balance-neighbor'],
  }),
  'eppp-v2-intervention-029': rewrite('eppp-v2-intervention-029', {
    prompt: 'A client reports that arguments are less intense on evenings when the family cooks together. The therapist asks what is different on those evenings and how to create one more. Which SFBT orientation is clearest?',
    distractors: [
      'Tracing the earliest developmental origin of the conflict before discussing any recent variation in it',
      'Cataloging each argument in detail to produce a complete account of the problem’s maintaining causes',
      'Teaching a standardized relaxation hierarchy before asking what the family already does effectively',
    ],
    rationale: 'The therapist notices an exception, elicits the behaviors and conditions associated with it, and helps the client extend an existing success. SFBT uses preferred futures, exceptions, scaling, and strengths to construct workable next steps without requiring a complete causal explanation of the problem.',
    wrongFeedback: [
      explain('Developmental exploration can be clinically meaningful, but requiring an origin account before using a current exception does not match the illustrated orientation.', 'SFBT treats the less-conflicted evening as usable evidence for constructing a next step now. '),
      explain('Detailed problem assessment may sometimes be necessary, yet pursuing a complete causal account is not the intervention demonstrated by the therapist’s questions.', 'The questions identify what already works and invite replication of that difference. '),
      explain('A relaxation hierarchy is a specific skills intervention that may help some clients but does not build from the family’s observed exception.', 'The therapist is eliciting existing resources and translating them into another concrete success. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The family-dinner exception turns a duplicated slogan into process recognition and differentiates SFBT from historical, problem-saturated, and protocol-first approaches.',
    distractorDesign: ['origin-before-exception', 'complete-problem-catalog', 'protocol-before-resource'],
  }),
  'eppp-v3-intervention-005': rewrite('eppp-v3-intervention-005', {
    prompt: 'A client rates confidence about applying for work as 4 out of 10. The therapist asks what makes it a 4 rather than a 2 and what a 5 would look like tomorrow. Which treatment stance does this exchange reflect?',
    distractors: [
      'Interpreting the rating as resistance and exploring how it recreates a transference relationship',
      'Reconstructing the full history of unemployment before defining any observable next step',
      'Prescribing a fixed multiyear course because a low rating indicates a stable personality pattern',
    ],
    rationale: 'The scaling questions elicit existing resources and define a small, observable movement toward the client’s preferred future. This reflects SFBT’s focus on exceptions, strengths, and workable next steps rather than exhaustive problem explanation or therapist-imposed solutions.',
    wrongFeedback: [
      explain('A transference interpretation assigns psychodynamic meaning to the number, whereas the therapist uses it to elicit resources and client-defined movement.', 'Asking why the rating is not lower highlights what is already supporting change. '),
      explain('Relevant history may be assessed, but requiring a complete reconstruction before specifying a next step conflicts with the brief solution-building exchange.', 'The question about a 5 converts the client’s preferred direction into observable behavior. '),
      explain('A low confidence rating does not establish a stable personality pattern or determine treatment duration.', 'The therapist treats the rating as a collaborative scaling tool rather than a diagnostic indicator. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The two scaling questions make the SFBT process distinct from the exception item and replace duration and trauma caricatures with plausible formulation errors.',
    distractorDesign: ['rating-as-resistance', 'history-before-next-step', 'rating-as-trait-marker'],
  }),
  'eppp-v3-intervention-033': rewrite('eppp-v3-intervention-033', {
    prompt: 'A client says, “My partner must agree with me, and disagreement proves that I am unworthy.” What would an REBT therapist examine most directly?',
    distractors: [
      'The reinforcement schedule that follows arguments while leaving the client’s evaluative rules unexamined',
      'The partner’s attachment category as the sufficient explanation for the client’s emotional reaction',
      'An unconscious wish inferred from the disagreement before discussing the client’s present appraisal',
    ],
    rationale: 'REBT would identify demandingness in the “must” and global self-rating in the conclusion of unworthiness, then dispute their logic, evidence, and usefulness. The aim is a more flexible belief and effective action, not a guarantee that the partner will agree or that difficult emotion will vanish.',
    wrongFeedback: [
      explain('Consequences surrounding arguments may influence behavior, but ignoring the explicit must and global self-rating omits the central REBT mechanism.', 'The therapist directly examines how those evaluative beliefs shape emotional and behavioral consequences. '),
      explain('Attachment patterns might add formulation context, yet the partner’s category cannot by itself explain the client’s stated demand and self-condemnation.', 'REBT focuses on the client’s present absolutistic appraisal and its consequences. '),
      explain('Psychodynamic inference about an unconscious wish is a different treatment route and need not precede work on the expressed belief.', 'The client has already supplied a demanding rule and global evaluation suitable for direct collaborative disputation. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The disagreement vignette gives REBT a distinct demandingness and self-rating application rather than repeating the broad ABC definition item.',
    distractorDesign: ['contingency-only-formulation', 'attachment-sufficiency', 'unconscious-wish-priority'],
  }),
  'eppp-v3-social-cultural-053': rewrite('eppp-v3-social-cultural-053', {
    prompt: 'After people are assigned to arbitrary teams, some allocate slightly better outcomes to their own team even without prior conflict or material competition. Which group-membership explanation best fits the pattern?',
    distractors: [
      'Participants infer objective team superiority from diagnostic performance information supplied during assignment',
      'Team leaders directly reward favorable allocations after members observe the leaders model partiality',
      'Familiarity with teammates drives preference although assignment is anonymous and members have not interacted',
    ],
    rationale: 'Social identity theory proposes that people derive part of self-concept from group memberships and may seek favorable differentiation for the ingroup. Arbitrary categorization can therefore shape allocation even in the absence of prior conflict, objective evidence of superiority, leadership reinforcement, or personal familiarity.',
    wrongFeedback: [
      explain('Objective superiority would require valid diagnostic performance information, which arbitrary assignment does not provide.', 'The finding is notable because favorable allocation emerges despite the absence of evidence that one team is better.'),
      explain('Direct reinforcement and modeled partiality can teach favoritism, but neither leader behavior nor an observed reward history appears in this design.', 'Social identity theory can explain preference arising from categorization and its self-evaluative significance.'),
      explain('Familiarity can increase liking, yet anonymous participants who have not interacted cannot base the allocation on known teammate qualities.', 'The operative information is the minimal category membership rather than a developed interpersonal relationship.'),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The arbitrary-team allocation now contrasts identity-based differentiation with evidence, reinforcement, and familiarity accounts using research-design details.',
    distractorDesign: ['diagnostic-superiority-account', 'reinforced-leader-modeling', 'familiarity-account'],
  }),
  'eppp-b003-social-1': retarget('eppp-b003-social-1', {
    prompt: 'An IAT compares latency across two paired-categorization blocks, such as self-plus-calm and self-plus-anxious versus the reversed pairings. What construct is the latency contrast intended to estimate?',
    editorialNote: 'The paired-block example removes the response-speed-to-association echo and preserves the test’s relative, indirect interpretation limits.',
    distractorDesign: ['explicit-memory-accuracy', 'real-world-act-frequency', 'personality-diagnosis-severity'],
  }),
  'eppp-b028-social-2': rewrite('eppp-b028-social-2', {
    prompt: 'At a museum, a coordinator invites a retired donor to spend seven days cataloging water-damaged manuscripts in a rural archive, documenting mold exposure, replacing acid-free enclosures, staying overnight, and paying travel costs. The donor declines because respite care cannot cover the absence. The coordinator next proposes a Saturday morning digitizing sepia photographs at a neighborhood conservation lab near the bus route. Which persuasion sequence is being used?',
    distractors: [
      'Foot-in-the-door through a small initial agreement that establishes consistency before a larger target request',
      'Low-balling through securing agreement and then revealing additional costs attached to the same commitment',
      'An offer-enhancement sequence that adds a benefit before the recipient has accepted or rejected the original offer',
    ],
    rationale: 'The volunteer retreats from an intentionally large request to the smaller target request after refusal, which defines the door-in-the-face sequence. Reciprocal concession and perceptual contrast can contribute, but effectiveness varies and the technique does not justify manipulative or coercive use.',
    wrongFeedback: [
      explain('Foot-in-the-door begins with a small accepted request and later escalates, so its order and initial response differ from this vignette.', 'Here the recipient rejects a large request before receiving the smaller target request. '),
      explain('Low-balling obtains agreement and then makes that agreed commitment less attractive by revealing costs or removing advantages.', 'The volunteer instead changes from a refused large request to a separate smaller request. '),
      explain('That’s-not-all improves an offer before the recipient decides, often by adding a benefit or reducing a price.', 'In this sequence the first decision is already a refusal, after which the requester makes an apparent concession. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The volunteer sequence distinguishes door-in-the-face from three adjacent compliance techniques and breaks the fundraising-amount duplicate wording.',
    distractorDesign: ['foot-in-door-order', 'low-ball-postagreement', 'thats-not-all-predecision'],
  }),
  'eppp-v2-social-cultural-023': rewrite('eppp-v2-social-cultural-023', {
    prompt: 'One research team builds a measure from local participants’ meanings, while another applies a common construct to compare several societies. Which conceptual distinction best describes the two strategies?',
    distractors: [
      'Idiographic personality description versus nomothetic personality prediction within a single cultural setting',
      'Qualitative interviewing versus quantitative measurement, treated as independent of the cultural standpoint of either method',
      'Eastern philosophical assumptions versus Western philosophical assumptions treated as internally uniform categories',
    ],
    rationale: 'The locally grounded strategy is emic, whereas the cross-society strategy seeks an etic construct that can support comparison. Either standpoint may use qualitative or quantitative methods, and strong cross-cultural research can combine both while testing equivalence rather than assuming universality.',
    wrongFeedback: [
      explain('Idiographic and nomothetic approaches concern particularized versus general explanation, but they do not directly specify insider cultural meaning versus cross-cultural comparison.', 'The two teams differ in the standpoint from which constructs are developed and applied. '),
      explain('Emic and etic do not map neatly onto qualitative and quantitative methods; either standpoint can use interviews, observations, or numerical measures.', 'The defining issue is cultural specificity versus a comparative framework, not data format. '),
      explain('Treating East and West as uniform opposites creates broad essentialized categories and does not identify the research-design distinction in the stem.', 'Emic work is locally grounded, while etic work tests constructs intended for comparison across settings. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The two-team design makes the emic-etic distinction methodological and applied while avoiding duplicated definitional phrasing and cultural essentialism.',
    distractorDesign: ['idiographic-nomothetic-neighbor', 'method-format-confusion', 'east-west-essentialism'],
  }),
  'eppp-b026-social-2': rewrite('eppp-b026-social-2', {
    prompt: 'In a compliance experiment, a target appeal is accepted more often after a much larger appeal is refused. Which added comparison would most directly test whether the person’s move to the smaller appeal matters beyond simple size contrast?',
    distractors: [
      'Compare the two-request condition with a condition that makes the target request first and then presents the larger request after acceptance',
      'Measure whether participants who comply report more favorable attitudes toward volunteering than participants who decline',
      'Repeat the two requests with a longer delay while omitting any condition in which the apparent concession is removed',
    ],
    rationale: 'The reciprocal-concessions account predicts that compliance depends partly on perceiving the same requester retreat from the large request. A control that presents the same requests without a requester concession helps distinguish reciprocity from mere contrast, consistent with the control logic of the original research.',
    wrongFeedback: [
      explain('Reversing the order after target acceptance creates a different commitment sequence and cannot isolate why refusal followed by moderation raises compliance.', 'The useful control preserves exposure to request sizes while removing the requester’s apparent retreat. '),
      explain('Postdecision attitudes may reveal how participants interpret volunteering, but they do not experimentally separate reciprocity from perceptual contrast.', 'A causal test must manipulate whether the same requester appears to concede while holding key exposure features constant. '),
      explain('Changing delay could test timing, but without a no-concession comparison it leaves reciprocity and request-size contrast confounded.', 'The design needs a condition that retains comparable requests while eliminating the social concession signal. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The experimental-control question is genuinely distinct from basic door-in-the-face identification and targets the original research’s reciprocal-concession inference.',
    distractorDesign: ['postacceptance-order-control', 'attitude-measure-substitution', 'delay-without-mechanism-control'],
  }),
  'eppp-v2-social-cultural-048': rewrite('eppp-v2-social-cultural-048', {
    prompt: 'After hearing that a new professor is “absent-minded,” a student notices misplaced notes, overlooks well-organized lectures, and later recalls more examples consistent with the label. Which account best explains this pattern?',
    distractors: [
      'Limited attentional capacity causes random loss of details rather than systematically favoring label-consistent information',
      'Mood-congruent memory increases recall because the student and professor necessarily share the same emotional state',
      'A descriptive social norm directs the student to imitate how classmates take notes during the lectures',
    ],
    rationale: 'A schema can guide attention, interpretation, encoding, and retrieval, making label-consistent information more accessible while inconsistent information receives less weight. Schemas organize processing efficiently but can also sustain confirmation and stereotyping; they do not mechanically determine every judgment.',
    wrongFeedback: [
      explain('General capacity limits can cause missed information, but random loss does not explain the consistent preference for details matching the prior label.', 'A schema predicts selective attention and memory organized around an existing knowledge framework. '),
      explain('Mood-congruent memory involves correspondence between affective state and recalled material, and the vignette gives no shared mood information.', 'The selective pattern follows an expectation about the professor rather than the student’s emotional state. '),
      explain('A descriptive norm concerns perceptions of what others commonly do and can influence imitation, but no peer behavior drives the recall pattern.', 'The student’s prior label shapes how information about one person is processed and remembered. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The professor-label vignette removes the schema/framework lexical echo and replaces absolute distractors with neighboring information-processing explanations.',
    distractorDesign: ['random-capacity-loss', 'mood-congruence-confusion', 'descriptive-norm-confusion'],
  }),
  'eppp-b010-social-2': rewrite('eppp-b010-social-2', {
    prompt: 'Members of one academic department describe many meaningful differences among their own colleagues but speak of another department as if its members are interchangeable. Which perception is illustrated?',
    distractors: [
      'Ingroup homogeneity, because familiarity leads people to collapse distinctions among members of their own department',
      'Biological essentialism, because the perceived similarity is explicitly attributed to inherited differences between departments',
      'Outgroup individuation, because attention to category membership increases recognition of each outsider’s unique qualities',
    ],
    wrongFeedback: [
      explain('The described asymmetry runs opposite to ingroup homogeneity: participants recognize substantial variation among people in their own department.', 'They compress variation in the other department, which is the outgroup-homogeneity pattern. '),
      explain('Essentialism attributes group characteristics to deep, fixed causes, but the vignette does not mention biological or inherited explanations.', 'It concerns perceived within-group variability rather than a theory about where group differences originate. '),
      explain('Individuation would mean attending to personal information and seeing outsiders as differentiated individuals.', 'The interchangeable description instead reduces perceived variation among members of the other department. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The two-department comparison tests the direction of perceived variability using credible neighboring constructs rather than universal or genetic caricatures.',
    distractorDesign: ['ingroup-homogeneity-reversal', 'essentialist-cause-confusion', 'outgroup-individuation-opposite'],
  }),
  'eppp-b018-social-1': rewrite('eppp-b018-social-1', {
    prompt: 'A motivated consumer carefully evaluates a health message’s evidence but also gives some weight to the communicator’s recognized expertise. How would the heuristic-systematic model classify this processing?',
    distractors: [
      'Systematic processing alone, because careful evidence review prevents source expertise from affecting judgment',
      'Heuristic processing alone, because an expertise cue makes analysis of message content unnecessary',
      'A fixed personal style, because people use the same processing mode across topics once a preference is established',
    ],
    wrongFeedback: [
      explain('Careful evidence review indicates systematic processing, but the model does not require that source cues cease to have influence.', 'The consumer can analyze arguments while also using an expertise heuristic. '),
      explain('An expertise cue can support heuristic judgment, yet the vignette explicitly states that the consumer carefully evaluates evidence.', 'Both modes can contribute when motivation and capacity support systematic thought. '),
      explain('Processing varies with motivation, ability, context, and sufficiency concerns rather than operating as a permanent person-level route.', 'The same consumer may rely on different combinations for different judgments. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The dual-process health message demonstrates simultaneous modes and replaces mutually exclusive, personality-determined extremes with testable model distinctions.',
    distractorDesign: ['systematic-exclusivity', 'heuristic-exclusivity', 'fixed-style-account'],
  }),
  'eppp-b021-social-1': rewrite('eppp-b021-social-1', {
    prompt: 'Two youth groups remain hostile after informal social events. Their bus then becomes stranded, and repairing it requires members of both groups to coordinate skills and effort. Which condition should most reduce conflict?',
    distractors: [
      'Additional unstructured contact that preserves the existing competition for recognition and resources',
      'A facilitator’s request that participants stop mentioning their memberships while their goals remain opposed',
      'A contest in which one group receives the repair reward and the other group observes the winning strategy',
    ],
    wrongFeedback: [
      explain('Contact by itself did not resolve conflict in the Robbers Cave sequence when the competitive goal structure remained intact.', 'The bus repair creates consequential interdependence in which both groups must contribute to success. '),
      explain('Suppressing discussion of group membership does not change the opposed incentives and may be difficult to sustain.', 'The effective ingredient is coordinated work toward an important outcome unavailable to either group acting alone. '),
      explain('A winner-take-all contest preserves competition and unequal reward, conditions likely to maintain or intensify intergroup hostility.', 'Jointly achieved benefit changes the goal structure from rivalry toward cooperation. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The stranded-bus decision tests superordinate interdependence against plausible contact, identity-suppression, and renewed-competition alternatives grounded in the field sequence.',
    distractorDesign: ['contact-with-competition', 'identity-suppression-without-goal-change', 'winner-take-all-renewal'],
  }),
  'eppp-b023-social-1': rewrite('eppp-b023-social-1', {
    prompt: 'An employee weighs a promotion partly by how relocation would affect obligations to parents and the priorities of a close work team. Which cultural orientation is relatively more consistent with that emphasis?',
    distractors: [
      'An individualistic orientation emphasizing personal choice and achievement apart from role obligations',
      'A national-culture rule predicting that people from the same country will make the same decision',
      'A self-effacing norm requiring the employee to disregard personal interests in each family and workplace choice',
    ],
    wrongFeedback: [
      explain('Individualistic patterns relatively emphasize independent choice and personal goals, though individuals can still care deeply about family and teams.', 'The vignette foregrounds relational obligations and important group aims in the decision. '),
      explain('Cultural orientations describe broad tendencies and do not justify predicting one identical choice for everyone sharing a nationality.', 'Within-culture variation and situational demands remain substantial. '),
      explain('Interdependence does not require erasing personal interests or obeying others in each decision.', 'Collectivistic patterns give relatively greater weight to relationships, roles, and group goals while still allowing individual agency. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The relocation decision applies interdependence without essentializing cultures and replaces conspicuous all-or-none statements with nuanced errors.',
    distractorDesign: ['independent-goal-priority', 'national-uniformity', 'self-erasure-stereotype'],
  }),
  'eppp-v2-social-cultural-007': rewrite('eppp-v2-social-cultural-007', {
    prompt: 'A director communicates an inspiring mission, models its values, invites staff to challenge assumptions, and coaches each employee’s development. Which leadership pattern best integrates those behaviors?',
    distractors: [
      'Transactional leadership centered on clarifying performance exchanges and administering contingent rewards',
      'Leader-member exchange focused on differences in the quality of each leader-follower dyadic relationship',
      'Laissez-faire leadership characterized by delayed decisions and limited active guidance to followers',
    ],
    wrongFeedback: [
      explain('Transactional leadership uses contingent exchanges and corrective management, which can coexist with but does not integrate all behaviors described.', 'Vision, role modeling, intellectual challenge, and individualized development map onto transformational dimensions. '),
      explain('Leader-member exchange explains variation in dyadic relationship quality, but the vignette lists a broader set of leader behaviors toward the workforce.', 'Those behaviors correspond to idealized, inspirational, intellectually stimulating, and individually considerate leadership. '),
      explain('Laissez-faire leadership is marked by avoidance or absence of active leadership, unlike the director’s visible mission setting, challenge, and coaching.', 'The leader is actively engaging followers and their development. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The director vignette requires mapping behavior to the four transformational dimensions while distractors represent adjacent leadership theories.',
    distractorDesign: ['transactional-exchange-neighbor', 'lmx-dyad-neighbor', 'laissez-faire-opposite-pattern'],
  }),
  'eppp-v2-social-cultural-008': rewrite('eppp-v2-social-cultural-008', {
    prompt: 'Before accepting an offer, an applicant receives a candid description of rewarding duties, routine frustrations, schedule demands, and advancement limits. What is the main intended effect of this practice?',
    distractors: [
      'Strengthen employer branding by emphasizing attractive features and postponing difficult information until orientation',
      'Increase the selection ratio by reducing the number of applicants relative to the positions available',
      'Replace structured assessment by allowing each applicant to decide whether personal enthusiasm demonstrates job competence',
    ],
    wrongFeedback: [
      explain('Selective positive branding can attract applicants but does not create accurate expectations about both benefits and difficulties.', 'A realistic preview supports informed self-selection and reduces later surprise or disillusionment. '),
      explain('The selection ratio is an applicant-to-opening relationship and may change incidentally, but it is not the principal psychological mechanism.', 'The preview aligns expectations and fit by supplying balanced job information before commitment. '),
      explain('Self-selection based on fit can complement assessment, yet applicant enthusiasm does not establish the knowledge or skills required for the role.', 'A realistic preview informs the decision rather than replacing valid selection procedures. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The pre-offer information package tests expectation accuracy and self-selection against branding, selection-ratio, and assessment-replacement errors.',
    distractorDesign: ['positive-branding-substitution', 'selection-ratio-confusion', 'self-selection-as-validity'],
  }),
  'eppp-v2-social-cultural-010': rewrite('eppp-v2-social-cultural-010', {
    prompt: 'An ambiguous emergency is witnessed by either one other person or eight other witnesses. Holding the event constant, what individual helping pattern does the classic group-size finding predict?',
    distractors: [
      'Helping becomes more likely in the larger group because witnesses independently add monitoring and responsibility',
      'Individual helping remains unchanged because group size primarily affects how quickly professional responders arrive',
      'Helping varies with empathy but has no systematic relation to how many other witnesses are perceived to be present',
    ],
    wrongFeedback: [
      explain('Additional witnesses can increase the chance that someone responds, but they can reduce each individual’s felt responsibility and intervention probability.', 'The classic effect is defined at the level of an individual witness as group size increases. '),
      explain('Emergency-response speed is a separate outcome and does not remove the social influence of perceived co-witnesses on intervention decisions.', 'Diffusion of responsibility and interpretation of others can change an individual’s likelihood of helping. '),
      explain('Empathy and competence can matter, yet the classic studies predict a systematic group-size effect after other conditions are held comparable.', 'Perceived presence of more witnesses tends to reduce the probability that any one person intervenes. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The controlled group-size comparison tests the level of the bystander prediction with plausible aggregate-versus-individual interpretation errors.',
    distractorDesign: ['aggregate-helping-confusion', 'response-time-only-account', 'trait-only-account'],
  }),
  'eppp-v2-social-cultural-014': rewrite('eppp-v2-social-cultural-014', {
    prompt: 'A warehouse redesign lets employees use varied competencies, complete identifiable units, see the effect on customers, choose methods, and receive direct performance information. Which model best predicts how these features influence motivation?',
    distractors: [
      'Herzberg’s two-factor model through pay, policy, supervision, and working conditions as the five core dimensions',
      'Goal-setting theory through goal difficulty, specificity, commitment, feedback, and task complexity as job properties',
      'The job-demands resources model through workload, emotional demands, recovery time, support, and burnout risk',
    ],
    wrongFeedback: [
      explain('Herzberg distinguishes motivators and hygiene factors, but pay and policy are not the five core job dimensions described in this redesign.', 'The vignette maps task structure to meaningfulness, responsibility, and knowledge of results. '),
      explain('Goal difficulty and commitment can influence performance, yet they do not classify the five redesigned job properties listed in the stem.', 'Skill range, whole-task identity, significance, discretion, and direct feedback define the relevant model. '),
      explain('The demands-resources framework addresses strain and motivational resources broadly, but the vignette intentionally enumerates a different job-design set.', 'The keyed model specifies how core task dimensions influence psychological states and work outcomes. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The warehouse redesign asks learners to map concrete changes to the job-characteristics sequence while using credible organizational-theory alternatives.',
    distractorDesign: ['two-factor-model-neighbor', 'goal-setting-model-neighbor', 'demands-resources-neighbor'],
  }),
  'eppp-v2-social-cultural-024': rewrite('eppp-v2-social-cultural-024', {
    prompt: 'Two students explain a poor exam result differently: one cites low ability, the other cites insufficient study. Which explanatory properties in Weiner’s model help distinguish the accounts and their motivational consequences?',
    distractors: [
      'Consensus, consistency, and distinctiveness across people, occasions, and tasks',
      'Expectancy, instrumentality, and valence associated with future performance outcomes',
      'Internality and externality as one continuum, with temporal and volitional properties treated as consequences rather than dimensions',
    ],
    wrongFeedback: [
      explain('Consensus, consistency, and distinctiveness belong to Kelley’s covariation framework for deciding where to locate a cause.', 'Weiner’s achievement model additionally distinguishes whether a cause persists and whether it can be volitionally altered. '),
      explain('Expectancy, instrumentality, and valence are components of Vroom’s motivational model rather than dimensions for classifying ability and effort attributions.', 'The exam explanations differ in locus, expected persistence, and controllability. '),
      explain('Locus is one Weiner dimension, but treating stability and controllability as mere consequences leaves out two defining properties.', 'Ability and effort can both be internal while differing importantly in persistence and perceived control. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The ability-versus-effort comparison requires use of all three attribution dimensions and contrasts Weiner with neighboring causal and motivation models.',
    distractorDesign: ['kelley-covariation-neighbor', 'vroom-expectancy-neighbor', 'locus-only-reduction'],
  }),
  'eppp-v2-social-cultural-031': rewrite('eppp-v2-social-cultural-031', {
    prompt: 'A selection procedure advances 60% of applicants in the highest-rate group and 42% in another group. Which initial screening calculation is commonly used to flag possible adverse impact?',
    distractors: [
      'A statistical significance test of the mean predictor-score difference, used instead of comparing group selection rates',
      'A content-validity ratio showing how many subject-matter experts classify each test item as essential',
      'A utility analysis estimating the financial gain from selection accuracy after implementation costs are deducted',
    ],
    rationale: 'The four-fifths rule compares each group’s selection rate with the highest observed rate; here 42 divided by 60 equals .70, below .80, so the procedure is flagged for further review. The rule is a practical screen, not a final legal finding or substitute for contextual and statistical analysis under current guidance.',
    wrongFeedback: [
      explain('A significance test can contribute to a fuller analysis, but mean predictor scores are not the selection-rate ratio specified by the four-fifths screen.', 'The initial calculation divides 42 percent by the highest rate of 60 percent. '),
      explain('A content-validity ratio evaluates expert judgments about item relevance and does not compare hiring outcomes between applicant groups.', 'Adverse-impact screening begins with the relative rates at which groups pass or are selected. '),
      explain('Utility analysis estimates organizational value from a selection system but does not determine whether group outcome rates trigger an adverse-impact flag.', 'Economic benefit cannot replace examination of the 42-to-60 percent rate ratio. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The numerical hiring example tests correct use and interpretation of the four-fifths screen against three authentic personnel-assessment analyses.',
    distractorDesign: ['mean-difference-test-substitution', 'content-validity-ratio-confusion', 'utility-analysis-confusion'],
  }),
  'eppp-v2-social-cultural-032': rewrite('eppp-v2-social-cultural-032', {
    prompt: 'When observed, an experienced typist enters familiar text faster, whereas a novice makes more errors on an unfamiliar keyboard. Which social-performance pattern best fits the contrast?',
    distractors: [
      'Social loafing, because observation reduces each performer’s identifiable contribution to the typing output',
      'Group polarization, because interaction shifts both performers toward a more extreme shared typing strategy',
      'Deindividuation, because anonymity lowers self-awareness and releases behavior normally restrained by personal standards',
    ],
    wrongFeedback: [
      explain('Social loafing concerns reduced individual effort when contributions are pooled or difficult to identify, unlike these separately observed performances.', 'The contrast depends on whether arousal facilitates a dominant well-learned response or disrupts a difficult one. '),
      explain('Group polarization requires discussion or comparison that shifts a group’s position, neither of which occurs in the typing tasks.', 'The presence of an observer changes performance differently as task mastery changes. '),
      explain('Deindividuation involves reduced self-awareness and accountability under anonymity, whereas the performers are explicitly observed and identifiable.', 'The expert-novice reversal is the task-difficulty pattern associated with social facilitation. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The expert-novice crossover operationalizes social facilitation and replaces always claims with three nearby group-performance constructs.',
    distractorDesign: ['social-loafing-neighbor', 'group-polarization-neighbor', 'deindividuation-neighbor'],
  }),
  'eppp-v3-social-cultural-001': rewrite('eppp-v3-social-cultural-001', {
    prompt: 'A manager endorses egalitarian beliefs on a questionnaire, yet sorts names and evaluative words more quickly in one block than in the reversed block of a speeded task. What kind of attitude indicator is the latency difference intended to provide?',
    distractors: [
      'An explicit attitude measure because the manager deliberately reports the meaning of each response-time difference',
      'A direct count of discriminatory workplace decisions attributable to the measured association',
      'A diagnosis of prejudiced personality based on a stable pathology inferred from one testing session',
    ],
    wrongFeedback: [
      explain('Explicit measures ask respondents to report beliefs or evaluations directly, whereas the IAT infers relative association strength from performance.', 'The discrepancy with the questionnaire illustrates why the latency index is classified as indirect. '),
      explain('An IAT score is not a behavioral frequency and cannot by itself count or attribute actual workplace decisions to a manager.', 'Prediction of behavior depends on context, measurement quality, and other individual and situational variables. '),
      explain('The IAT was not designed to diagnose a personality disorder or establish a fixed pathological trait from one administration.', 'It provides an indirect, relative association measure that requires careful interpretation. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The questionnaire-latency discrepancy tests indirect measurement and adds explicit cautions against behavioral counts and diagnostic overreach.',
    distractorDesign: ['explicit-report-misclassification', 'behavior-count-overreach', 'diagnostic-trait-overreach'],
  }),
  'eppp-v3-social-cultural-026': rewrite('eppp-v3-social-cultural-026', {
    prompt: 'Employees accept the promotion outcomes but object that criteria changed across departments, affected staff could not provide input, and there is no appeal process. Which justice judgment is most directly impaired?',
    distractors: [
      'Distributive justice, because the complaint concerns the fairness of who received each promotion outcome',
      'Interactional justice, because the complaint centers on whether supervisors treated employees with dignity and respect',
      'Informational justice, because the complaint centers on the truthfulness and adequacy of explanations for each decision',
    ],
    wrongFeedback: [
      explain('Distributive justice concerns the fairness of outcomes, but the stem explicitly says employees accept who received the promotions.', 'Their concerns address consistency, voice, and correctability in the decision procedure. '),
      explain('Interactional justice concerns respectful interpersonal treatment, and no discourtesy or dignity violation is specified here.', 'The disputed features are structural properties of how promotion decisions were made and reviewed. '),
      explain('Informational justice concerns candid and adequate explanations, which can matter but is not the principal deficit listed.', 'Changing criteria, lack of voice, and absence of appeal are procedural rather than explanatory failures. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The accepted-outcome vignette isolates procedural justice from distributive, interactional, and informational justice using credible organizational complaints.',
    distractorDesign: ['distributive-outcome-neighbor', 'interactional-treatment-neighbor', 'informational-explanation-neighbor'],
  }),
  'eppp-v3-social-cultural-039': rewrite('eppp-v3-social-cultural-039', {
    prompt: 'A supervisor gives close direction to an employee learning an unfamiliar task, then reduces direction and increases delegation as competence and commitment develop. Which theory best predicts that adjustment?',
    distractors: [
      'Fiedler’s contingency model, which matches a relatively stable leader style to situational favorableness',
      'Leader-member exchange theory, which explains performance primarily through the quality of each dyadic relationship',
      'Path-goal theory, which selects directive, supportive, participative, or achievement behavior from task and subordinate characteristics',
    ],
    wrongFeedback: [
      explain('Fiedler treats leader style as relatively stable and emphasizes matching it to situational control rather than progressively changing style with one follower.', 'The vignette explicitly adjusts direction and delegation as task readiness changes. '),
      explain('Leader-member exchange highlights differing relationship quality across leader-follower dyads, which is not the developmental sequence described.', 'The supervisor is matching behavior to competence and commitment for a specific task. '),
      explain('Path-goal theory is a close situational neighbor, but its categories and explanatory focus differ from the readiness progression in the stem.', 'The directing-to-delegating sequence is the signature mapping of Situational Leadership Theory. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The within-employee progression tests task-specific readiness against three genuine contingency and relationship leadership theories.',
    distractorDesign: ['fiedler-stable-style-neighbor', 'lmx-dyad-neighbor', 'path-goal-neighbor'],
  }),
  'eppp-v3-social-cultural-040': rewrite('eppp-v3-social-cultural-040', {
    prompt: 'After a vendor provides an unsolicited benefit, a purchasing manager notices pressure to grant the vendor a meeting despite intending to compare suppliers neutrally. Which influence norm is producing the pressure?',
    distractors: [
      'Commitment and consistency, because the manager previously made a public choice that the meeting would preserve',
      'Social proof, because the manager infers the appropriate supplier from what similar purchasers selected',
      'Scarcity, because limited availability makes the vendor’s proposal appear more valuable and urgent',
    ],
    wrongFeedback: [
      explain('Consistency pressure follows a prior commitment or self-presentation, but the stem provides no earlier promise to meet with the vendor.', 'The felt obligation arises specifically after receiving a favor. '),
      explain('Social proof uses others’ behavior as evidence about an appropriate choice, and no information about other purchasers is presented.', 'The manager’s pressure is dyadic: receipt of a benefit prompts a desire to respond in kind. '),
      explain('Scarcity increases perceived value when an opportunity seems limited, yet the proposal is not described as rare or expiring.', 'The influence follows the vendor’s unsolicited favor rather than restricted availability. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The procurement vignette applies reciprocity to a conflict-sensitive setting and contrasts it with three neighboring influence principles.',
    distractorDesign: ['consistency-neighbor', 'social-proof-neighbor', 'scarcity-neighbor'],
  }),
  'eppp-b008-social-1': rewrite('eppp-b008-social-1', {
    prompt: 'High-performing students are told that a difficult test usually reveals a deficit associated with their identity group. Their performance then drops relative to a neutral-description condition. Which process best fits the result?',
    distractors: [
      'A self-fulfilling prophecy in which an evaluator communicates lower expectations and directly changes instruction across groups',
      'Stereotype lift, in which comparison with a negatively stereotyped outgroup improves the focal group’s performance',
      'Measurement invariance failure inferred from the fact that group membership was mentioned before the same test',
    ],
    wrongFeedback: [
      explain('A self-fulfilling prophecy can operate through others’ expectations and differential treatment, but no changed instruction or evaluator behavior is described.', 'The performance pressure arises from the relevance of a negative group stereotype to the student’s own test. '),
      explain('Stereotype lift refers to improved performance when comparison with a negatively stereotyped outgroup benefits another group.', 'The students in this vignette perform worse under identity-relevant evaluative pressure. '),
      explain('Mentioning identity does not by itself demonstrate that the test measures different constructs across groups, which requires dedicated psychometric evidence.', 'The experimental performance change is a situational threat effect rather than proof of noninvariance. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The neutral-condition comparison tests stereotype threat against expectancy-treatment, lift, and psychometric-invariance explanations without essentializing group ability.',
    distractorDesign: ['self-fulfilling-prophecy-neighbor', 'stereotype-lift-opposite', 'invariance-overclaim'],
  }),
  'eppp-b024-social-1': rewrite('eppp-b024-social-1', {
    prompt: 'A clinician explains arriving late by citing a train delay but explains a colleague’s lateness by citing carelessness. Which classic attribution contrast is present?',
    distractors: [
      'Self-serving attribution, because desirable outcomes are claimed personally while undesirable outcomes are assigned externally',
      'False-consensus bias, because the clinician assumes that most people share the clinician’s own behavior and opinions',
      'Ultimate attribution error, because negative outgroup behavior is explained dispositionally while ingroup behavior is excused',
    ],
    rationale: 'The clinician invokes the situation when explaining personal behavior but a disposition when explaining the colleague’s comparable behavior, matching the classic actor-observer contrast. The pattern is not invariant; perspective, familiarity, valence, culture, information, and context can alter its size or direction.',
    wrongFeedback: [
      explain('Self-serving attribution tracks outcome valence, such as taking credit for success and externalizing failure, which the vignette does not manipulate.', 'Both explanations concern the same undesirable lateness event viewed from actor and observer positions. '),
      explain('False consensus is an overestimate of how widely others share one’s attitudes or behavior, and no prevalence estimate appears here.', 'The relevant asymmetry concerns situational versus dispositional explanations for self and another person. '),
      explain('The ultimate attribution error applies attribution patterns across ingroup and outgroup boundaries, but no group category is specified.', 'The comparison is between one’s own action as actor and a colleague’s action as observer. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The matched lateness event isolates actor and observer perspectives while the rationale preserves important evidence-based moderator cautions.',
    distractorDesign: ['self-serving-valence-neighbor', 'false-consensus-neighbor', 'group-attribution-neighbor'],
  }),
  'eppp-v3-social-cultural-034': rewrite('eppp-v3-social-cultural-034', {
    prompt: 'During a pressured meeting, an employee explains a personal sharp remark by the deadline but explains a coworker’s similar remark by an irritable character. What pattern does this example illustrate?',
    distractors: [
      'A fundamental attribution error applied identically to both the employee’s own act and the coworker’s act',
      'A self-handicapping strategy in which the employee creates an obstacle before performance to protect self-esteem',
      'A just-world inference in which both remarks are treated as deserved consequences of prior moral conduct',
    ],
    rationale: 'The employee uses situational pressure to explain the personal remark but a dispositional trait to explain a similar remark by another person. That actor-observer contrast is a relative attribution tendency rather than a rule that occurs in every setting, and information or perspective can moderate it.',
    wrongFeedback: [
      explain('The fundamental attribution error concerns overemphasis on dispositions when explaining others, but the option says it is applied identically to both acts.', 'The vignette deliberately contrasts a situational self-explanation with a dispositional other-explanation. '),
      explain('Self-handicapping involves arranging or claiming an obstacle before evaluation so possible failure threatens self-esteem less.', 'The employee is explaining completed remarks and has not created a performance impediment. '),
      explain('Just-world reasoning links outcomes with deservedness, and the vignette contains no judgment that either person morally earned the deadline or remark.', 'Its contrast is causal locus across actor and observer perspectives. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The matched sharp-remark comparison tests directionality and differentiates this item from the separate lateness example through distinct rival biases.',
    distractorDesign: ['fae-identical-application', 'self-handicapping-neighbor', 'just-world-neighbor'],
  }),
  'eppp-b012-social-1': rewrite('eppp-b012-social-1', {
    prompt: 'Participants who never meet are labeled “overestimators” or “underestimators” from a trivial task, then distribute points anonymously. Which conclusion is best supported if allocations favor the assigned label?',
    distractors: [
      'A history of resource competition is necessary before category membership can affect allocation decisions',
      'Face-to-face interaction is required for people to learn which category should receive favorable treatment',
      'Anonymous allocation prevents category-based preference because personal accountability is absent',
    ],
    rationale: 'Minimal-group studies show that a trivial categorization can be sufficient for ingroup-favoring allocation even without interaction, prior conflict, or personal gain. The finding demonstrates the ease of categorization effects; it does not mean favoritism is inevitable or equally strong in every context.',
    wrongFeedback: [
      explain('Prior competition can intensify conflict, but the minimal-group design intentionally removes a history of contested resources.', 'Favoring the arbitrary label under those conditions shows that competition is not necessary for the observed allocation bias. '),
      explain('Participants can apply a category label without meeting other members, so direct interaction is not required by this result.', 'The anonymous point task demonstrates preference based on assignment alone under the study conditions. '),
      explain('Anonymity may alter accountability, yet it does not erase knowledge of the assigned categories in the allocation matrix.', 'The classic finding is that category-based favoritism can appear even in anonymous decisions. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The allocation-matrix evidence question makes this item about necessary conditions and avoids duplicating a simple label-to-construct recognition task.',
    distractorDesign: ['competition-necessity', 'interaction-necessity', 'anonymity-as-elimination'],
  }),
  'eppp-v3-social-cultural-049': rewrite('eppp-v3-social-cultural-049', {
    prompt: 'After a six-week coding course, an applicant has no rubric for rating debugging accuracy on a newly adopted platform, the certification score is still pending, and a supervisor cannot yet evaluate the work. The applicant compares recent database queries and test fixes with peers who completed the same lessons and practice projects. Which theory best explains that choice?',
    distractors: [
      'Reliance on objective criteria, because peer performance supplies a fixed external standard independent of social judgment',
      'Downward comparison as the default, because people select less capable targets whether the goal is accuracy or self-enhancement',
      'Avoidance of comparison, because interpersonal information is too biased to contribute to self-evaluation under uncertainty',
    ],
    wrongFeedback: [
      explain('Peer performance is social information rather than a fixed objective criterion, even when it provides a useful practical benchmark.', 'Festinger’s account predicts comparison when nonsocial standards are unavailable or ambiguous. '),
      explain('People do not invariably compare downward; target choice depends on goals such as accuracy, improvement, affiliation, or self-protection.', 'For accurate ability appraisal, similar others can be especially informative. '),
      explain('Social information can introduce bias, yet the theory specifically predicts greater use of comparison when objective standards are missing.', 'The applicant turns to similarly trained peers to reduce uncertainty about current ability. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The missing-benchmark vignette applies the theory to comparison-target selection and replaces exclusive or avoidant distractors with realistic misinterpretations.',
    distractorDesign: ['peer-as-objective-standard', 'downward-default-error', 'comparison-avoidance-error'],
  }),
  'eppp-b025-social-1': rewrite('eppp-b025-social-1', {
    prompt: 'Employees disadvantaged by an opaque promotion system nevertheless describe it as natural and necessary and resist a proposal to change it. Which finding does this pattern most directly illustrate?',
    distractors: [
      'Social dominance orientation treated as limited to high-status employees seeking greater group inequality',
      'Realistic group conflict produced by direct competition between equal-status groups for a newly scarce reward',
      'Collective action arising because disadvantaged employees identify unfairness and expect coordinated protest to succeed',
    ],
    rationale: 'System-justification theory allows that people may defend existing social arrangements as legitimate or necessary even when those arrangements disadvantage their group. The motive is probabilistic and context-sensitive; endorsement can coexist or compete with ego and group interests rather than appearing in every person.',
    wrongFeedback: [
      explain('Social dominance orientation concerns preference for group-based hierarchy and can relate to system support, but it is not restricted to one status group.', 'The distinctive finding is defense of an arrangement by employees whom it disadvantages. '),
      explain('Realistic conflict emphasizes competition over scarce resources between groups, whereas the vignette highlights legitimation of an established hierarchy.', 'No newly scarce reward or equal-status intergroup contest is needed for the described motive. '),
      explain('Collective action would involve recognizing disadvantage and mobilizing to change it, which is opposite to resisting the reform proposal.', 'The employees instead provide legitimacy-supporting explanations for the existing arrangement. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'The employee-reform scenario applies system justification against social dominance, realistic conflict, and collective-action accounts without universal claims.',
    distractorDesign: ['sdo-status-restriction', 'scarce-resource-conflict-neighbor', 'collective-action-opposite'],
  }),
  'eppp-b002-social-2': rewrite('eppp-b002-social-2', {
    prompt: 'In an experiment with no interaction or personal payoff, participants distribute points between anonymous recipients identified solely by arbitrary category labels. A preference for the assigned category is evidence of what effect?',
    distractors: [
      'Pluralistic ignorance, because participants privately reject a norm but mistakenly believe other participants accept it',
      'Group polarization, because discussion among category members shifts an initial preference toward a more extreme position',
      'Informational conformity, because uncertain participants observe other members’ allocations before choosing their own',
    ],
    rationale: 'Preference for anonymous recipients sharing a trivial assigned category exemplifies minimal-group favoritism. The design removes interaction, observation of others’ choices, established conflict, and direct self-benefit, isolating how mere categorization can influence allocation under limited conditions.',
    wrongFeedback: [
      explain('Pluralistic ignorance requires a discrepancy between private beliefs and assumptions about a group norm, neither of which is measured in the allocation task.', 'The observed result is a relative resource preference based on arbitrary category membership. '),
      explain('Group polarization requires interaction or exposure to group positions that makes a collective tendency more extreme.', 'Participants here make anonymous decisions without discussion, so polarization cannot account for the category preference. '),
      explain('Informational conformity depends on using others’ judgments as evidence under uncertainty, but participants do not observe other allocations.', 'The only social information supplied is the arbitrary ingroup or outgroup label. '),
    ],
    cognitiveProcess: 'analysis',
    editorialNote: 'This item now identifies the effect from tightly controlled design features, complementing rather than duplicating the separate necessary-conditions conclusion item.',
    distractorDesign: ['pluralistic-ignorance-neighbor', 'polarization-interaction-neighbor', 'informational-conformity-neighbor'],
  }),
  'eppp-b017-social-1': rewrite('eppp-b017-social-1', {
    prompt: 'After incorrectly treating a mourning custom as avoidance, a clinician asks how the client understands the practice, acknowledges the effect of professional authority, invites correction, seeks guidance from a local bereavement liaison with permission, and revises the treatment discussion. Which orientation is most evident?',
    distractors: [
      'Cultural neutrality, maintained by avoiding identity and power so that treatment remains technically objective',
      'Cultural mastery, achieved by applying a completed list of facts about the client’s presumed group membership',
      'Diversity certification, treated as sufficient evidence that future self-evaluation and accountability are unnecessary',
    ],
    rationale: 'The clinician demonstrates cultural humility through ongoing self-evaluation, attention to power, openness to the client’s expertise, and accountable repair. Humility does not replace knowledge or competence; it changes how knowledge is held and how partnership continues when uncertainty and mistakes arise.',
    wrongFeedback: [
      explain('Avoiding identity and power can silence relevant experience and does not make clinical work culturally neutral.', 'The vignette shows respectful inquiry and explicit attention to how professional authority shapes the partnership. '),
      explain('Group knowledge may offer hypotheses, but a fixed fact list can stereotype the client and cannot establish mastery of personal meaning.', 'Humility holds knowledge provisionally and treats the client as an essential source of understanding. '),
      explain('Training can build skill, yet one credential cannot eliminate the need for continuing reflection, feedback, and repair.', 'The orientation is lifelong and accountable rather than completed by a single educational event. '),
    ],
    cognitiveProcess: 'application',
    editorialNote: 'The repair-after-misstep vignette distinguishes cultural humility from neutrality, static mastery, and credential completion while preserving partnership and power awareness.',
    distractorDesign: ['identity-avoidance-neutrality', 'fixed-cultural-mastery', 'credential-as-completion'],
  }),
};

const revisions = Object.freeze(Object.fromEntries(Object.entries(authored).map(([id, value]) => [id, value])));

invariant(Object.keys(revisions).length === 74, 'expected exactly 74 revisions, found ' + Object.keys(revisions).length);
invariant(new Set(Object.keys(revisions)).size === 74, 'revision IDs must be unique');
invariant(
  [...Object.keys(revisions)].sort().join('\n') === [...ASSIGNED_IDS].sort().join('\n'),
  'revision IDs must equal the intervention and social-cultural assignment',
);

for (const id of ASSIGNED_IDS) {
  const live = liveById.get(id);
  const revision = revisions[id];
  const campaign = campaignById.get(id);
  invariant(revision.expectedAnswerIndex === live.answerIndex, id + ' exported answer index drifted');
  invariant(revision.contentSha256 === campaign.contentSha256, id + ' exported fingerprint drifted');
  invariant(revision.expectedWarningFamilies.join('\n') === campaign.expectedWarningFamilies.join('\n'), id + ' exported warning contract drifted');
  if (revision.choices) {
    invariant(revision.choices[live.answerIndex] === live.choices[live.answerIndex], id + ' exported keyed wording drifted');
    invariant(revision.choiceRationales[live.answerIndex] === (revision.rationale || live.rationale), id + ' keyed feedback/rationale mismatch');
  }
}

module.exports = Object.freeze({
  shardId: SHARD_ID,
  reviewedAt: REVIEWED_AT,
  assignedDomains: ASSIGNED_DOMAINS,
  assignedIds: ASSIGNED_IDS,
  revisions,
});
