#!/usr/bin/env node
'use strict';

// Expands the AP Psychology native learning library with original, source-
// linked lesson content. The library remains an internal preview: source
// review and editorial structure are not independent subject-expert approval.

const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const libraryPath = path.join(root, 'test_prep', 'ap_psychology_pilot_learning_library.json');
const verifiedAt = '2026-08-20';
const version = '0.5.0-internal-preview';
const enhancementVersion = 'ap-psychology-textbook-v1';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function textRun(text) {
  return { type: 'text', text: String(text || '') };
}

function paragraph(text) {
  const value = String(text || '').trim();
  return { type: 'paragraph', text: value, runs: [textRun(value)] };
}

function labeledParagraph(label, text) {
  const safeLabel = String(label || '').trim();
  const safeText = String(text || '').trim();
  return {
    type: 'paragraph',
    text: safeLabel + safeText,
    runs: [
      { type: 'strong', children: [textRun(safeLabel)] },
      textRun(safeText),
    ],
  };
}

function list(items, ordered = false) {
  return {
    type: 'list',
    ordered,
    items: items.map((item) => ({ text: String(item || '').trim(), runs: [textRun(String(item || '').trim())] })),
  };
}

function table(headers, rows) {
  const headerRow = {
    cells: headers.map((text) => ({ kind: 'header', text, columnSpan: 1, runs: [textRun(text)] })),
  };
  return {
    type: 'table',
    rows: [headerRow].concat(rows.map((row) => ({
      cells: row.map((text) => ({ kind: 'cell', text, columnSpan: 1, runs: [textRun(text)] })),
    }))),
  };
}

function referencesFor(section) {
  return Array.isArray(section.references) ? section.references.slice() : [];
}

const chapterEnhancements = {
  'ap-psych-ch-01': {
    summary: 'This chapter builds a systems view of behavior: inherited variation and environmental experience interact, neural signals move through connected systems, and sleep and sensation shape what a person can notice, learn, and do. Read each lesson by naming the mechanism, the observable measure, and the limit on the conclusion.',
    takeaways: [
      'A population statistic such as heritability does not describe one person or make a trait fixed.',
      'Neural and endocrine systems coordinate behavior through signals, pathways, feedback, and plasticity rather than one isolated “behavior center.”',
      'Sleep and sensation questions require attention to timing, thresholds, transduction, adaptation, and the difference between input and perception.',
    ],
  },
  'ap-psych-ch-02': {
    summary: 'This chapter treats cognition as active information processing. Perception selects and organizes input, memory depends on encoding and retrieval, and intelligence or achievement measures provide evidence only when reliability, validity, standardization, and context are considered together.',
    takeaways: [
      'Perception is an interpretation of sensory input shaped by features, expectations, context, and attention.',
      'Retrieval practice and meaningful organization improve access, while interference and misinformation can change later reports.',
      'A consistent score is not automatically an accurate or culturally complete measure of the intended construct.',
    ],
  },
  'ap-psych-ch-03': {
    summary: 'This chapter connects lifespan development with learning theory. Developmental claims depend on the design used to observe change, while conditioning and observational learning explain how cues, consequences, models, cognition, and biological preparedness alter behavior over time.',
    takeaways: [
      'Cross-sectional, longitudinal, and experimental designs answer different questions and carry different cohort or causal limits.',
      'In conditioning, identify the stimulus or consequence first, then ask whether behavior increased or decreased.',
      'Learning can occur through direct consequences, observation, cognitive representation, and biologically prepared associations.',
    ],
  },
  'ap-psych-ch-04': {
    summary: 'This chapter explains how social context and personality processes jointly shape behavior. Use attribution and persuasion concepts for social judgments, compare personality perspectives without treating them as interchangeable, and interpret motivation and emotion as interacting biological, cognitive, social, and cultural processes.',
    takeaways: [
      'Behavioral explanations should test situational and dispositional possibilities rather than defaulting to a trait label.',
      'Personality perspectives differ in what they treat as explanatory: unconscious conflict, growth and self-concept, traits, or person–environment interaction.',
      'Motivation and emotion questions often turn on appraisal, incentives, arousal, goals, and the meaning of the surrounding situation.',
    ],
  },
  'ap-psych-ch-05': {
    summary: 'This chapter applies a biopsychosocial and evidence-aware approach to stress, well-being, psychological disorders, and treatment. It emphasizes responsible language: describe patterns and functioning, avoid diagnosing from a short vignette, and evaluate treatment claims through design, ethics, access, and cultural fit.',
    takeaways: [
      'Stress depends on appraisal, resources, duration, controllability, biology, and social support—not simply on the presence of a demand.',
      'Classification organizes evidence for communication and care; it does not turn a brief description into a diagnosis.',
      'Treatment evidence must be separated from individual fit, risk, access, informed consent, and the limits of a study.',
    ],
  },
};

const enhancements = {
  'ap-psych-ch-01-section-01': {
    core: 'Behavior and mental processes reflect reciprocal influence among inherited variation, development, learning, and the environments people experience. Heritability is a population statistic: it describes how much variation in a measured trait is associated with genetic differences within a particular population and set of conditions. It does not describe the genetic percentage of one person, identify a single gene, or imply that change is impossible. Twin and adoption comparisons can inform the heredity–environment question, but shared environments, selective placement, sampling, measurement, and correlation still matter. Gene–environment interaction asks whether the same inherited sensitivity has different effects under different conditions; gene–environment correlation asks whether inherited tendencies help shape the environments people encounter. In every research vignette, separate the observed association from the causal claim.',
    examples: [
      'Identical twins raised in different homes may resemble one another on a tendency while still differing because development and experience are not identical.',
      'A student with an inherited sensitivity to stress may show different outcomes in a supportive classroom than in a chronically threatening setting.',
    ],
    nonExamples: [
      'A high heritability estimate does not mean that schooling, nutrition, or opportunity cannot change the trait.',
      'A family resemblance does not by itself prove that genes caused the resemblance because relatives can share environments and experiences.',
    ],
    misconception: '“Genetic influence” and “fixed” are not synonyms. Population variation can have a genetic contribution while individuals and populations remain responsive to environments.',
    dataTable: {
      headers: ['Observed pattern', 'Supports', 'Does not establish'],
      rows: [
        ['Biological siblings show a moderate positive correlation in reading scores.', 'An association worth investigating.', 'That a specific child’s score is a fixed genetic percentage.'],
        ['A heritability estimate is .60 in one district.', 'Genetic differences are associated with 60% of observed variation under those conditions.', 'That the estimate transfers unchanged to another population or environment.'],
      ],
    },
    retrieval: [
      'Define heritability in one sentence without using the words “one person.”',
      'Explain how a gene–environment interaction differs from a gene–environment correlation.',
      'Name one reason a family correlation cannot, by itself, establish causation.',
    ],
    transfer: 'When a question gives a family, twin, or adoption pattern, identify the comparison, the measured outcome, and the alternative environmental explanation before selecting a conclusion.',
    check: {
      prompt: 'A study reports that a reading score has a heritability estimate of .70 in one population. Which conclusion is most defensible?',
      choices: [
        'Seventy percent of each student’s reading ability is caused by genes.',
        'Genetic differences are associated with much of the variation in scores under the studied conditions.',
        'Reading ability cannot be changed through instruction or environmental support.',
        'The estimate proves that the study used random assignment.',
      ],
      answerIndex: 1,
      rationale: 'Heritability describes variation within a population and environment. It does not partition one person’s trait, establish immutability, or identify the study design.',
    },
    card: {
      front: 'What does a heritability estimate describe—and what does it not describe?',
      back: 'It describes the proportion of variation associated with genetic differences in a particular population and setting. It does not give a genetic percentage for one person or make a trait fixed.',
    },
  },
  'ap-psych-ch-01-section-02': {
    core: 'Neurons receive, integrate, and transmit information through connected systems. The central nervous system includes the brain and spinal cord; the peripheral nervous system carries information between the central system and the body. Somatic pathways support voluntary skeletal-muscle movement, while autonomic pathways regulate internal organs through sympathetic and parasympathetic activity. An action potential is an all-or-none event once threshold is reached, but stimulus intensity can be represented by firing frequency. At synapses, neurotransmitter effects depend on receptors, reuptake, and the balance of excitatory and inhibitory signals. Plasticity means that connections and functional patterns can change with development, learning, injury, and experience. Avoid reducing a complex behavior to one structure: brain systems work in networks and context.',
    examples: [
      'After a near collision, sympathetic activity can raise heart rate while temporarily reducing digestive activity; parasympathetic activity helps restore baseline afterward.',
      'A stronger stimulus can produce more action potentials per second without making each individual action potential larger.',
    ],
    nonExamples: [
      'The peripheral nervous system is not a second brain; it connects the central system with receptors, muscles, and organs.',
      'An inhibitory postsynaptic potential does not automatically stop all behavior; its effect depends on the combined input reaching the neuron.',
    ],
    misconception: '“All-or-none” applies to the individual action potential, not to the idea that all stimuli produce the same number of spikes or the same behavioral response.',
    dataTable: {
      headers: ['Neural observation', 'Best interpretation', 'Boundary'],
      rows: [
        ['Spike amplitude remains near 2 mV while firing rate rises from 10 to 30 spikes/second.', 'The all-or-none principle is paired with frequency coding.', 'Amplitude alone is not a measure of stimulus intensity.'],
        ['A drug blocks receptor binding at a synapse.', 'The drug may act as an antagonist at that receptor.', 'The label does not by itself identify the full behavioral effect.'],
      ],
    },
    retrieval: [
      'Trace a touch signal from receptor to a coordinated response using central and peripheral terms.',
      'Distinguish a neurotransmitter, a receptor, an agonist, and an antagonist.',
      'Explain why plasticity makes a strict one-structure explanation incomplete.',
    ],
    transfer: 'For a nervous-system item, classify the pathway, identify the signal or division involved, and then check whether the wording supports a network-level or a single-structure claim.',
    check: {
      prompt: 'A neuron’s individual action potentials remain the same amplitude, but their frequency increases as stimulation becomes stronger. Which principle best explains the pattern?',
      choices: [
        'The all-or-none principle with frequency coding',
        'Reuptake makes every neural signal identical',
        'The refractory period increases action-potential amplitude',
        'Inhibitory input always increases firing frequency',
      ],
      answerIndex: 0,
      rationale: 'An action potential has a stable amplitude after threshold, while stimulus intensity can be represented by how often action potentials occur.',
    },
    card: {
      front: 'How can a stronger stimulus be represented if action-potential amplitude stays constant?',
      back: 'The neuron can increase firing frequency. Individual action potentials remain all-or-none, but the number of spikes per unit time can vary.',
    },
  },
  'ap-psych-ch-01-section-03': {
    core: 'Sleep and sensation show how biological timing and sensory systems shape experience. Circadian rhythms organize roughly daily cycles, while sleep architecture changes across non-REM and REM stages. Sleep loss can affect attention, memory, emotion, and health, but a single tired day does not establish a diagnosis or a universal effect. Sensation begins when receptors detect physical energy; transduction converts that energy into neural signals. Absolute thresholds describe the minimum detectable input under specified conditions, difference thresholds describe a just-noticeable difference, and sensory adaptation reflects reduced response to an unchanging stimulus. Perception then interprets the input using attention, expectations, and context. Keep the sensory signal, neural conversion, and conscious interpretation distinct.',
    examples: [
      'A person becomes less aware of a steady odor after entering a room, illustrating sensory adaptation rather than the odor disappearing.',
      'A consistent light–dark schedule can help align circadian timing even when a person’s preferred sleep schedule differs.',
    ],
    nonExamples: [
      'A threshold is not a permanent property independent of attention, context, motivation, or measurement conditions.',
      'A vivid perception is not proof that the physical input was strong; top-down expectations can affect interpretation.',
    ],
    misconception: 'Sensation is not the same as perception. Sensation concerns detection and transduction; perception is the organized interpretation of sensory information.',
    dataTable: {
      headers: ['Measurement', 'Calculation or interpretation', 'Limit'],
      rows: [
        ['A participant detects 18 of 30 faint tones.', 'Detection rate is 60% under that testing condition.', 'It does not define a threshold for every person or context.'],
        ['Attention scores average 84 after regular sleep and 72 after restricted sleep.', 'The groups differ on the measured outcome.', 'Without a controlled design, the difference does not prove sleep alone caused it.'],
      ],
    },
    retrieval: [
      'Differentiate circadian rhythm, sleep stage, and sleep deprivation.',
      'Describe the sequence from physical stimulus to transduction to perception.',
      'Explain why sensory adaptation can occur without a change in the physical stimulus.',
    ],
    transfer: 'When a prompt gives a detection rate or sensory comparison, state exactly what was measured, under what conditions, and whether the result concerns sensation or interpretation.',
    check: {
      prompt: 'A person notices a room’s odor less after sitting there for ten minutes, even though the odor source remains. Which process best explains the change?',
      choices: ['Sensory adaptation', 'An increased absolute threshold caused by learning', 'A new conditioned stimulus', 'A complete loss of transduction'],
      answerIndex: 0,
      rationale: 'Sensory adaptation is reduced responsiveness to a constant stimulus. The receptor system has not necessarily stopped transducing the odor.',
    },
    card: {
      front: 'What is the difference between sensation and perception?',
      back: 'Sensation detects and transduces physical input; perception organizes and interprets that input using attention, expectations, context, and prior knowledge.',
    },
  },
  'ap-psych-ch-02-section-01': {
    core: 'Perception is an active process that organizes sensory information. Bottom-up processing begins with incoming features, while top-down processing uses expectations, schemas, context, and prior knowledge. Attention selects some information for deeper processing, which means a person can miss an obvious event while focused elsewhere. Gestalt principles describe common ways people organize parts into wholes, but they do not replace attention or context. Heuristics can make judgment efficient, yet availability, representativeness, anchoring, and framing can bias decisions. A strong explanation identifies whether the question is about sensory input, perceptual organization, attention, or judgment and avoids treating one process as the only cause.',
    examples: [
      'A blurry word is recognized because the surrounding sentence supplies a likely meaning, illustrating top-down processing.',
      'A person focused on counting passes may fail to notice a person in an unexpected costume, illustrating selective attention.',
    ],
    nonExamples: [
      'A heuristic is not automatically irrational; it is a shortcut whose usefulness depends on the task and the information available.',
      'A Gestalt principle does not mean that perception is always accurate or independent of culture and experience.',
    ],
    misconception: 'Top-down processing does not mean ignoring sensory evidence. It means using expectations and context to interpret incoming evidence.',
    dataTable: {
      headers: ['Result', 'Supports', 'Does not establish'],
      rows: [
        ['Participants identify ambiguous figures more accurately when given a meaningful context.', 'Context and expectations influence perception.', 'That bottom-up features are irrelevant.'],
        ['A group recalls more familiar than unfamiliar examples from a list.', 'Availability may shape judgment or recall.', 'That the familiar examples are objectively more common.'],
      ],
    },
    retrieval: [
      'Contrast bottom-up and top-down processing using the same ambiguous image.',
      'Explain how selective attention can produce an inattentional-blindness error.',
      'Name one benefit and one risk of a heuristic.',
    ],
    transfer: 'For a perception or judgment item, locate the information source: physical features, prior knowledge, attentional selection, or a decision shortcut.',
    check: {
      prompt: 'A reader correctly interprets a poorly printed word because the surrounding sentence strongly suggests its meaning. Which process is most directly involved?',
      choices: ['Top-down processing', 'Sensory adaptation', 'Negative reinforcement', 'The absolute threshold'],
      answerIndex: 0,
      rationale: 'Top-down processing uses context and prior knowledge to interpret incomplete or ambiguous sensory information in a given situation.',
    },
    card: {
      front: 'How do bottom-up and top-down processing differ?',
      back: 'Bottom-up processing begins with incoming sensory features. Top-down processing uses expectations, schemas, context, and prior knowledge to interpret those features.',
    },
  },
  'ap-psych-ch-02-section-02': {
    core: 'Memory involves encoding information, maintaining it over time, and retrieving it when needed. Attention and meaningful organization influence encoding; working memory supports active processing; long-term memory includes multiple forms rather than one undifferentiated store. Spacing and retrieval practice can improve later access, while interference can make information harder to retrieve. Memory is reconstructive: post-event suggestions, source confusion, schemas, and confidence can affect later reports. The best explanation distinguishes a failure to encode from a failure to retrieve and separates the existence of a memory from the accuracy of every detail in the report.',
    examples: [
      'A student remembers a concept better after spacing study across several days and practicing recall without notes.',
      'A witness incorporates a misleading detail into a later account, illustrating the misinformation effect and reconstruction.',
    ],
    nonExamples: [
      'Forgetting a fact during a test does not prove that the fact was never encoded or stored.',
      'High confidence in a memory does not guarantee that every remembered detail is accurate.',
    ],
    misconception: 'Memory is not a literal recording. Retrieval can reconstruct an event using stored information, context, expectations, and later suggestions.',
    dataTable: {
      headers: ['Study pattern', 'Best conclusion', 'Boundary'],
      rows: [
        ['Spaced group recalls 16 of 20 terms; crammed group recalls 11 of 20.', 'The groups differ on later recall under the tested conditions.', 'The result does not show that spacing is the only factor or that every task benefits equally.'],
        ['A misleading question increases reports of a detail absent from the event.', 'Post-event information can alter later memory reports.', 'It does not show that all witnesses knowingly lied.'],
      ],
    },
    retrieval: [
      'Define encoding, storage, and retrieval, then give one failure example for each.',
      'Explain why retrieval practice is not simply rereading the same notes.',
      'Describe how source monitoring can contribute to a false memory.',
    ],
    transfer: 'When a memory scenario includes timing, ask whether the problem occurred before learning, during maintenance, during retrieval, or after misleading information.',
    check: {
      prompt: 'After studying, a learner repeatedly tries to recall the ideas before checking the notes. Which process is most directly being practiced?',
      choices: ['Retrieval practice', 'Sensory adaptation', 'State-dependent punishment', 'A fixed-ratio schedule'],
      answerIndex: 0,
      rationale: 'Repeatedly bringing information to mind strengthens access and provides feedback about what has and has not been learned.',
    },
    card: {
      front: 'Why can retrieval practice be more useful than rereading?',
      back: 'Retrieval practice requires the learner to bring information to mind, strengthens access, and reveals gaps that rereading can conceal through familiarity.',
    },
  },
  'ap-psych-ch-02-section-03': {
    core: 'Intelligence and achievement tests are measurements of selected constructs, not complete descriptions of a person. Reliability concerns consistency across occasions, items, or raters; validity concerns whether evidence supports the intended interpretation. A test can be reliable but invalid if it consistently measures the wrong thing. Standardization provides common administration and comparison procedures, while norms describe performance in a reference group. Aptitude measures are intended to forecast learning or performance, whereas achievement measures assess learned knowledge or skills, although real assessments can overlap. Cultural context, language, opportunity, stereotype threat, and measurement error affect interpretation and fairness.',
    examples: [
      'A test that gives similar scores two weeks apart shows evidence of test–retest reliability, but it still needs validity evidence.',
      'An achievement assessment aligned with material taught in a course is interpreted differently from an aptitude assessment intended to forecast later performance.',
    ],
    nonExamples: [
      'A high score does not automatically measure every form of intelligence or guarantee future success.',
      'Standardized administration improves comparability but does not remove all cultural or construct-validity concerns.',
    ],
    misconception: 'Reliability is necessary for strong measurement but is not sufficient for validity. Consistency cannot guarantee that the intended construct is being measured.',
    dataTable: {
      headers: ['Evidence', 'Supports', 'Does not establish'],
      rows: [
        ['Test–retest correlation r = .86; correlation with an established construct measure r = .24.', 'The test appears consistent but has limited convergent validity evidence.', 'That the test is accurate simply because the first correlation is high.'],
        ['A score is compared with a large reference sample using identical directions.', 'Standardization and norm-referenced interpretation.', 'That the reference sample represents every learner or culture.'],
      ],
    },
    retrieval: [
      'State the difference between reliability and validity without saying “reliable means correct.”',
      'Distinguish aptitude and achievement with one example of each.',
      'Name two contextual factors that can affect interpretation of a score.',
    ],
    transfer: 'For a measurement question, identify the evidence type first: consistency, construct fit, prediction, comparison with norms, or fairness/context.',
    check: {
      prompt: 'A measure produces nearly identical scores on two occasions but disagrees with an established measure of the intended construct. Which conclusion is best supported?',
      choices: ['It appears reliable but has limited validity evidence.', 'It is valid because consistency guarantees accuracy.', 'It is neither reliable nor measurable.', 'It has validity but no reliability.'],
      answerIndex: 0,
      rationale: 'Similar scores support reliability, while disagreement with an established measure limits evidence that the test measures the intended construct.',
    },
    card: {
      front: 'Can a test be reliable without being valid?',
      back: 'Yes. Reliability is consistency; validity concerns whether the evidence supports the intended interpretation. A measure can consistently measure the wrong construct.',
    },
  },
  'ap-psych-ch-03-section-01': {
    core: 'Developmental psychology asks how people change and remain stable across the lifespan. Physical, cognitive, language, identity, and social-emotional domains influence one another, but a change in one domain does not automatically determine every other domain. Cross-sectional studies compare different age groups at one time and are efficient but vulnerable to cohort effects. Longitudinal studies follow the same people over time and can reveal individual change but require time and may lose participants. Experimental designs can test causal effects when assignment and control are appropriate. Continuity and stages are theoretical descriptions of patterns, not a choice between “all change” and “no change.”',
    examples: [
      'A longitudinal study can distinguish whether an individual’s vocabulary changes from age 10 to age 15.',
      'A cross-sectional difference between adolescents and older adults may reflect age, generation, education, or historical experience.',
    ],
    nonExamples: [
      'A study that measures several age groups once is not automatically longitudinal.',
      'A developmental stage label does not mean every person reaches a milestone at exactly the same age.',
    ],
    misconception: 'Age-group differences are not automatically developmental change. The design must separate age from cohort and historical experience.',
    dataTable: {
      headers: ['Design pattern', 'Strength', 'Main limit'],
      rows: [
        ['15-, 35-, and 65-year-olds tested once in the same month.', 'Efficient comparison of age groups.', 'Cohort effects are confounded with age.'],
        ['The same participants tested at ages 15, 35, and 65.', 'Tracks within-person change.', 'Attrition, practice effects, and long study duration can complicate interpretation.'],
      ],
    },
    retrieval: [
      'Contrast cross-sectional and longitudinal designs in two sentences.',
      'Define a cohort effect and explain why it matters.',
      'Give one reason development can be continuous in one domain and stage-like in another description.',
    ],
    transfer: 'For a development study, identify who is measured, how often they are measured, and whether the design can separate age, cohort, practice, and historical effects.',
    check: {
      prompt: 'A developmental comparison finds older adults scored higher than adolescents after one testing session. Which alternative explanation should be checked first?',
      choices: ['Cohort effects may be confused with age-related change.', 'The study cannot measure any behavior.', 'The design is automatically experimental.', 'The same people are measured repeatedly.'],
      answerIndex: 0,
      rationale: 'A cross-sectional design compares age groups at one time, so cohort experiences and historical opportunities may explain part of the observed difference.',
    },
    card: {
      front: 'What is the key limitation of a cross-sectional developmental study?',
      back: 'Age-group differences may reflect cohort or historical effects rather than developmental change because different people are measured at one time.',
    },
  },
  'ap-psych-ch-03-section-02': {
    core: 'Classical conditioning links stimuli: a previously neutral cue can become a conditioned stimulus after pairing with an unconditioned stimulus, producing a conditioned response. Identify the unconditioned stimulus and response first, then track what was learned. Operant conditioning changes behavior through consequences. Reinforcement increases behavior; punishment decreases behavior. Positive means something is added, and negative means something is removed. Schedules describe when reinforcement is delivered, and extinction occurs when a learned relation is no longer supported. Avoid deciding from whether a consequence sounds pleasant or unpleasant; ask what happened to the future frequency of the behavior.',
    examples: [
      'A tone paired with an aversive event later produces anxiety on its own, illustrating acquisition of a conditioned response.',
      'A warning sound stops when a driver buckles a seat belt, increasing buckling; removal of the sound is negative reinforcement.',
    ],
    nonExamples: [
      'Negative reinforcement is not punishment; it increases behavior by removing an aversive condition.',
      'Positive punishment is not “positive” in the everyday sense; it decreases behavior by adding an aversive consequence.',
    ],
    misconception: 'The words positive and negative describe addition and removal, not good and bad. The behavioral effect determines reinforcement versus punishment.',
    dataTable: {
      headers: ['Consequence pattern', 'Behavioral effect', 'Label'],
      rows: [
        ['A treat follows sitting, and sitting becomes more frequent.', 'Behavior increases; a desirable event is added.', 'Positive reinforcement.'],
        ['A warning tone stops after buckling, and buckling becomes more frequent.', 'Behavior increases; an aversive event is removed.', 'Negative reinforcement.'],
      ],
    },
    retrieval: [
      'Label the US, UR, CS, and CR in a simple fear-conditioning example.',
      'Use a two-by-two grid to distinguish reinforcement from punishment and positive from negative.',
      'Explain what extinction means for the learned relation, not just for the visible response.',
    ],
    transfer: 'For every consequence question, write “behavior went up/down” and “something was added/removed” before naming the schedule or consequence.',
    check: {
      prompt: 'A child’s whining increases after a caregiver removes a difficult cleanup demand whenever the child whines. For the whining, removal of the demand is what?',
      choices: ['Negative reinforcement', 'Positive punishment', 'Negative punishment', 'Classical extinction'],
      answerIndex: 0,
      rationale: 'Whining increases and an aversive demand is removed. That combination is negative reinforcement rather than punishment.',
    },
    card: {
      front: 'How do you identify negative reinforcement?',
      back: 'Find a behavior that increases because an aversive condition is removed after the behavior. “Negative” means removal; “reinforcement” means the behavior increases.',
    },
  },
  'ap-psych-ch-03-section-03': {
    core: 'People can learn by watching models, observing consequences, forming cognitive maps, and receiving direct feedback. Observational learning depends on attention, retention, the ability to reproduce the behavior, and motivation; model similarity, status, and consequences can influence imitation. Vicarious reinforcement occurs when observing someone else’s reward increases the observer’s behavior. Latent learning can exist before it is expressed, and a cognitive map represents relationships in an environment. Biological preparedness makes some associations easier to learn than others, but preparedness is not a guarantee that learning will occur. Distinguish learning as a change in knowledge or capacity from performance as the behavior currently shown.',
    examples: [
      'A learner watches a peer receive useful feedback, remembers the strategy, and later applies it without direct reward during observation.',
      'An animal navigates a new route after an incentive appears, suggesting prior learning that was not previously expressed.',
    ],
    nonExamples: [
      'Imitating a behavior after seeing it is not necessarily classical conditioning; the learning may involve a model and observed consequences.',
      'A failure to perform on the first attempt does not prove that no learning occurred.',
    ],
    misconception: 'Observational learning is not passive copying. Attention, memory, capability, motivation, and the consequences observed all influence performance.',
    dataTable: {
      headers: ['Observation', 'Supports', 'Boundary'],
      rows: [
        ['70% of learners who observed a praised strategy later used it; 35% of controls did.', 'Observed consequences may influence imitation.', 'The design and comparison condition still determine causal strength.'],
        ['An animal reaches food by a shortcut after food is introduced.', 'A cognitive map or latent learning may be involved.', 'The result does not reveal every mechanism without additional controls.'],
      ],
    },
    retrieval: [
      'List the four processes that support observational learning.',
      'Distinguish vicarious reinforcement from direct reinforcement.',
      'Explain why performance can lag behind learning.',
    ],
    transfer: 'When a prompt describes a model, identify what the learner attended to, retained, could reproduce, and wanted to do before selecting the explanation.',
    check: {
      prompt: 'Students participate more after watching a classmate receive praise for contributing an answer. Which process is most directly illustrated?',
      choices: ['Vicarious reinforcement', 'Sensory adaptation', 'Negative punishment', 'Retroactive interference'],
      answerIndex: 0,
      rationale: 'The students observe another person receive a rewarding consequence, and their own behavior increases after seeing the model.',
    },
    card: {
      front: 'What is vicarious reinforcement?',
      back: 'It is an increase in one’s behavior after observing another person receive a rewarding consequence for that behavior.',
    },
  },
  'ap-psych-ch-04-section-01': {
    core: 'Attributions explain behavior through dispositional factors such as traits and intentions or situational factors such as demands and constraints. The fundamental attribution error is a tendency to overemphasize dispositions when explaining other people’s behavior, while self-serving bias often credits the self for success and circumstances for failure. Attitudes can change through careful evidence-based processing or through peripheral cues, and cognitive dissonance reflects discomfort from inconsistency among attitudes, beliefs, and behavior. Social situations also matter: conformity follows group expectations, obedience follows authority commands, groupthink suppresses dissent, and diffusion of responsibility can reduce individual action. The most defensible explanation considers the situation before assigning a person-wide label.',
    examples: [
      'Calling a late driver careless without considering a road closure illustrates the fundamental attribution error.',
      'A committee that values agreement so strongly that members withhold realistic concerns shows groupthink.',
    ],
    nonExamples: [
      'A situational attribution does not deny that traits exist; it identifies a relevant environmental explanation for this behavior.',
      'Conformity is not the same as obedience: conformity follows group pressure, while obedience follows a direct authority command.',
    ],
    misconception: 'A behavior can have both dispositional and situational contributors. Naming one possible cause does not prove that other causes are absent.',
    dataTable: {
      headers: ['Pattern', 'Supports', 'Boundary'],
      rows: [
        ['Participants make more dispositional judgments when situational constraints are hidden.', 'Information access can influence attribution.', 'It does not prove that observers never use situational information.'],
        ['A unanimous group raises conformity from 30% to 65% on an ambiguous task.', 'Group unanimity may influence expressed judgment.', 'The result depends on task ambiguity, group size, and the comparison condition.'],
      ],
    },
    retrieval: [
      'Write one dispositional and one situational explanation for the same late arrival.',
      'Contrast conformity, obedience, and groupthink in a short social vignette.',
      'Explain how cognitive dissonance can motivate attitude or behavior change.',
    ],
    transfer: 'For a social-psychology vignette, name the social pressure or information gap before inferring a stable personality characteristic.',
    check: {
      prompt: 'A manager labels a driver irresponsible after a late arrival but ignores a road closure that morning. Which concept best fits the judgment?',
      choices: ['Fundamental attribution error', 'Self-actualization', 'Latent learning', 'The spacing effect'],
      answerIndex: 0,
      rationale: 'The manager overemphasizes a personal disposition while neglecting a relevant situational explanation for another person’s behavior.',
    },
    card: {
      front: 'What is the fundamental attribution error?',
      back: 'It is the tendency to overemphasize personal or dispositional factors when explaining other people’s behavior and underweight situational factors.',
    },
  },
  'ap-psych-ch-04-section-02': {
    core: 'Personality perspectives organize different explanations of stable tendencies and individual differences. Psychodynamic approaches emphasize unconscious processes and early relationships; humanistic approaches emphasize self-concept, growth, meaning, and authentic choice; trait approaches describe dimensions such as the Big Five; social-cognitive approaches emphasize reciprocal determinism among personal factors, behavior, and environment. A trait can predict behavior better in situations that allow it to be expressed, while self-efficacy concerns belief about success on a specific task rather than a global label. Personality inventories require evidence about reliability, validity, response bias, and cultural context. Compare perspectives by asking what each treats as the mechanism, not by treating every term as a synonym for personality.',
    examples: [
      'A normally talkative person becomes quiet in a formal interview but expressive with close friends, illustrating person–situation interaction.',
      'A student’s belief that effort can improve performance changes study behavior, which changes feedback and future self-efficacy.',
    ],
    nonExamples: [
      'A trait score does not guarantee identical behavior in every situation.',
      'Self-efficacy is not the same as self-esteem; it refers to perceived capability for a particular task or behavior.',
    ],
    misconception: 'Personality perspectives are not interchangeable labels. They differ in assumptions about unconscious conflict, growth, traits, learning, cognition, and context.',
    dataTable: {
      headers: ['Evidence', 'Best interpretation', 'Boundary'],
      rows: [
        ['Conscientiousness correlates r = .28 with assignment completion, but r = .55 when deadlines are clearly structured.', 'Trait expression can depend on situational affordances.', 'The correlations do not identify a single cause of completion.'],
        ['An inventory gives similar scores two weeks apart but predicts little behavior outside the testing context.', 'Evidence of consistency is stronger than evidence of predictive validity.', 'Self-report and context still require evaluation.'],
      ],
    },
    retrieval: [
      'Compare psychodynamic, humanistic, trait, and social-cognitive explanations using one sentence each.',
      'Differentiate task-specific self-efficacy from global self-esteem using an example.',
      'Explain reciprocal determinism with a person, behavior, and environment loop.',
    ],
    transfer: 'When options name personality perspectives, match the proposed mechanism—unconscious conflict, growth, trait dimensions, or person–environment interaction—to the evidence in the vignette.',
    check: {
      prompt: 'A learner’s confidence changes after observing a similar peer succeed, which increases persistence and changes the learning environment. Which perspective best captures the loop?',
      choices: ['Social-cognitive reciprocal determinism', 'A fixed trait-only explanation', 'Sensory adaptation', 'The psychodynamic id alone'],
      answerIndex: 0,
      rationale: 'The example connects personal belief, behavior, and environment in a reciprocal loop, a central social-cognitive idea.',
    },
    card: {
      front: 'What does reciprocal determinism describe?',
      back: 'Personal factors, behavior, and environment influence one another. A belief can shape behavior, behavior can change the environment, and the environment can feed back into the belief.',
    },
  },
  'ap-psych-ch-04-section-03': {
    core: 'Motivation reflects interacting biological states, incentives, expectations, goals, learning, and social context. Drive-reduction theory emphasizes reducing internal physiological tension; incentive theory emphasizes external goals; arousal theory proposes that people seek a preferred stimulation level; and intrinsic motivation comes from interest or satisfaction in the activity itself. Emotion theories make different claims about the relation between physiological arousal, cognitive appraisal, and conscious feeling. James–Lange emphasizes interpretation of bodily changes, Cannon–Bard emphasizes simultaneous feeling and arousal, and two-factor theory combines arousal with a contextual label. Display rules and culture shape how emotion is expressed, even when internal experience is not directly observable.',
    examples: [
      'A student studies for a scholarship bonus, illustrating an external incentive; another studies astronomy for interest, illustrating intrinsic motivation.',
      'The same racing heart can be labeled excitement at a concert or fear in a threatening setting, illustrating contextual appraisal.',
    ],
    nonExamples: [
      'A reward can increase short-term performance without proving that the learner became intrinsically interested.',
      'Physiological arousal alone does not identify one emotion without information about appraisal and context.',
    ],
    misconception: 'Theories of emotion are competing models of sequence and mechanism, not interchangeable descriptions of “feeling emotional.”',
    dataTable: {
      headers: ['Pattern', 'Supports', 'Boundary'],
      rows: [
        ['Performance is 58% at low arousal, 86% at moderate arousal, and 61% at high arousal.', 'An inverted-U relation is consistent with an optimal arousal range.', 'The best level can differ by task and person.'],
        ['Participants with the same heart rate give different emotion labels in different contexts.', 'Appraisal and context contribute to emotion.', 'Labels do not directly measure every physiological process.'],
      ],
    },
    retrieval: [
      'Contrast drive-reduction, incentive, arousal, and intrinsic motivation.',
      'Compare James–Lange, Cannon–Bard, and two-factor theories by sequence.',
      'Explain why display rules complicate interpreting visible emotion.',
    ],
    transfer: 'For motivation and emotion items, identify the internal state or external goal, then ask whether arousal is being interpreted through the surrounding context.',
    check: {
      prompt: 'The same elevated heart rate is labeled excitement at a concert but fear in a threatening alley. Which theory most directly emphasizes this pattern?',
      choices: ['Two-factor theory', 'The law of effect alone', 'The absolute threshold', 'The Big Five trait model'],
      answerIndex: 0,
      rationale: 'Two-factor theory combines physiological arousal with a cognitive interpretation of the situation to produce an emotion.',
    },
    card: {
      front: 'What two ingredients does two-factor theory propose for emotion?',
      back: 'Physiological arousal plus a cognitive label or interpretation of the surrounding context.',
    },
  },
  'ap-psych-ch-05-section-01': {
    core: 'Stress is not simply the presence of a demand; it involves appraisal of the demand, perceived resources, controllability, duration, biological responses, and social context. Acute activation can help a person respond, while chronic or uncontrollable stress can burden attention, sleep, emotion, and health. Problem-focused coping changes the stressor when possible; emotion-focused coping changes the emotional response or meaning attached to it. Social support and resilience can buffer demands, but no single coping strategy works for every situation. Psychological reasoning should describe evidence and functioning without turning a short stress vignette into a diagnosis or medical recommendation.',
    examples: [
      'A student who can change a deadline uses problem-focused coping by contacting the instructor and making a plan.',
      'When a demand cannot be changed immediately, breathing, social support, and reframing may reduce emotional activation while the person seeks further resources.',
    ],
    nonExamples: [
      'Avoiding every difficult situation is not automatically effective emotion-focused coping; its consequences and context matter.',
      'A single stressful week does not establish a chronic disorder or prove a specific health outcome.',
    ],
    misconception: 'Stress appraisal is not “all in someone’s head.” Appraisal interacts with real demands, resources, biology, relationships, and material conditions.',
    dataTable: {
      headers: ['Study result', 'Supports', 'Boundary'],
      rows: [
        ['Students with high perceived support report fewer stress symptoms after a common exam period.', 'Social support may buffer perceived stress.', 'A correlation cannot establish that support alone caused the difference.'],
        ['A controllable task produces lower average cortisol than an identical uncontrollable task.', 'Controllability can affect physiological stress response.', 'The finding does not predict every individual’s response.'],
      ],
    },
    retrieval: [
      'Distinguish a stressor, stress appraisal, coping response, and outcome.',
      'Give one problem-focused and one emotion-focused response to the same demand.',
      'Explain how social support can be protective without being a universal cure.',
    ],
    transfer: 'For a health vignette, identify demand, appraisal, resources, coping, duration, and measured outcome before judging whether the evidence supports a claim.',
    check: {
      prompt: 'A student can change a scheduling problem by contacting an instructor and reorganizing study time. Which coping response is most directly problem-focused?',
      choices: ['Changing the plan and addressing the source of the demand', 'Ignoring the demand while rehearsing the worry', 'Assuming the outcome is fixed', 'Diagnosing a disorder from the stress report'],
      answerIndex: 0,
      rationale: 'Problem-focused coping targets the stressor or the conditions producing it when change is possible, rather than only managing emotional activation.',
    },
    card: {
      front: 'How do problem-focused and emotion-focused coping differ?',
      back: 'Problem-focused coping changes the stressor or circumstances when possible. Emotion-focused coping changes emotional activation, meaning, or response to the stressor.',
    },
  },
  'ap-psych-ch-05-section-02': {
    core: 'Classification systems organize patterns of symptoms, duration, distress, impairment, and context so that researchers and clinicians can communicate and evaluate care. A biopsychosocial approach considers interacting biological, psychological, and social contributors rather than a single-cause story. Categories are revised as evidence changes, and comorbidity means that a person can meet criteria for more than one condition; neither idea makes a brief vignette sufficient for diagnosis. Stigma can distort judgment, reduce help-seeking, and affect treatment access. When reading a question, describe the pattern the evidence supports, distinguish a symptom from a diagnosis, and avoid treating a label as the whole person.',
    examples: [
      'A classification discussion considers duration, functional impairment, context, and differential explanations instead of matching one symptom to a label.',
      'A biopsychosocial formulation asks how sleep, learning history, health, relationships, and social conditions may interact with symptoms.',
    ],
    nonExamples: [
      'One unusual behavior is not enough to diagnose a psychological disorder.',
      'A classification category is not a moral judgment or a complete explanation of a person’s identity.',
    ],
    misconception: '“Abnormal” is not synonymous with unusual. Responsible classification considers distress, impairment, context, duration, risk, and cultural meaning.',
    dataTable: {
      headers: ['Evidence pattern', 'Supports', 'Boundary'],
      rows: [
        ['A screening tool identifies 80% of confirmed cases but also flags 25% of people without the condition.', 'Sensitivity and false-positive rates must both be considered.', 'A screening result is not a standalone diagnosis.'],
        ['Symptoms occur for two weeks during severe sleep loss and resolve after recovery.', 'Context and duration matter for interpretation.', 'The pattern alone does not establish a disorder category.'],
      ],
    },
    retrieval: [
      'Explain why distress and impairment matter in classification.',
      'Define a biopsychosocial approach with one example from each domain.',
      'State why a short vignette should not be treated as a diagnosis.',
    ],
    transfer: 'For a disorder-category question, first list the evidence, duration, impairment, context, and alternatives; only then evaluate whether the answer choice overclaims.',
    check: {
      prompt: 'A student reports unusual behavior for one day during severe sleep loss but returns to baseline afterward. Which response is most responsible?',
      choices: ['Consider context and duration rather than diagnosing from one brief report.', 'Assign a disorder category from the unusual behavior alone.', 'Treat the behavior as proof of a biological cause.', 'Ignore functioning because symptoms are the only relevant evidence.'],
      answerIndex: 0,
      rationale: 'Classification requires attention to duration, distress, impairment, context, and alternative explanations; one brief observation is insufficient before drawing a diagnosis.',
    },
    card: {
      front: 'Why is a brief symptom vignette not enough for a diagnosis?',
      back: 'Responsible classification considers symptom pattern, duration, distress, impairment, context, differential explanations, culture, and professional assessment—not one isolated behavior.',
    },
  },
  'ap-psych-ch-05-section-03': {
    core: 'Treatment evidence should be evaluated as a claim about an intervention under particular conditions, not as a guarantee for every person. Psychotherapies and biomedical treatments differ in proposed mechanisms, risks, benefits, training, access, and fit. Random assignment and a meaningful comparison condition strengthen causal inference, while blinding, attrition, measurement choice, sample representativeness, and follow-up affect interpretation. Efficacy in a controlled study is not identical to effectiveness in ordinary settings. Informed consent, privacy, cultural responsiveness, reasonable access, and risk–benefit discussion are part of ethical care. The AP-style reasoning task is to evaluate evidence, not prescribe treatment or diagnose a learner.',
    examples: [
      'If randomly assigned participants receiving a treatment improve more than a comparable control group on a preregistered measure, the design supports a causal treatment effect under those conditions.',
      'A treatment with evidence from one narrow sample may still require evaluation for fit, access, cultural responsiveness, and effectiveness in another setting.',
    ],
    nonExamples: [
      'Improvement after treatment without a comparison group does not rule out regression to the mean, expectancy, or natural recovery.',
      'A statistically significant group difference does not automatically establish meaningful benefit for every individual.',
    ],
    misconception: '“Evidence-based” does not mean risk-free, universally effective, or appropriate without informed consent and individualized professional judgment.',
    dataTable: {
      headers: ['Study result', 'Supports', 'Boundary'],
      rows: [
        ['68% of a randomly assigned treatment group improves versus 44% of a comparison group.', 'A group-level difference consistent with a treatment effect.', 'The result still depends on outcome quality, attrition, sample, and follow-up.'],
        ['A program works in a university clinic but has low attendance in a rural setting.', 'Efficacy and real-world access/effectiveness can differ.', 'Attendance is not the only measure of treatment effectiveness.'],
      ],
    },
    retrieval: [
      'List three design features that strengthen a causal treatment claim.',
      'Distinguish treatment efficacy from real-world treatment effectiveness.',
      'Name two ethical or access considerations that belong beside outcome data.',
    ],
    transfer: 'For a treatment question, separate the causal design, measured outcome, practical fit, ethical protections, and population limits before accepting a broad conclusion.',
    check: {
      prompt: 'A randomized study reports greater symptom improvement in the treatment group. Which additional result would help judge whether the benefit is practically meaningful?',
      choices: ['A comparison of effect size and functional improvement at follow-up', 'Anecdotal improvement from one participant', 'A treatment group selected because it already expects success', 'A follow-up with no record of who received treatment'],
      answerIndex: 0,
      rationale: 'Effect size and functional follow-up help show whether a statistically detectable group difference has practical significance beyond symptom counts alone.',
    },
    card: {
      front: 'What is the difference between treatment efficacy and effectiveness?',
      back: 'Efficacy is performance under controlled study conditions; effectiveness is how well an intervention works in ordinary settings with real access, adherence, diversity, and constraints.',
    },
  },
};

function applySectionEnhancement(section, detail) {
  const refs = referencesFor(section);
  const dataRows = detail.dataTable.rows.map((row) => row.join(' ')).join(' ');
  section.content = [
    detail.core,
    'Examples: ' + detail.examples.join(' '),
    'Nonexamples and boundaries: ' + detail.nonExamples.join(' '),
    'Common misconception: ' + detail.misconception,
    'Worked data moment: ' + dataRows,
    'Retrieval practice: ' + detail.retrieval.join(' '),
    'Transfer move: ' + detail.transfer,
  ].join(' ');
  section.contentBlocks = [
    paragraph(detail.core),
    labeledParagraph('Examples. ', 'Use these to identify the mechanism rather than matching a surface word.'),
    list(detail.examples),
    labeledParagraph('Nonexamples and boundaries. ', 'These statements sound plausible but overclaim or confuse neighboring concepts.'),
    list(detail.nonExamples),
    labeledParagraph('Common misconception. ', detail.misconception),
    labeledParagraph('Worked data moment. ', 'Read the observed pattern, state what it supports, then state the limit.'),
    table(detail.dataTable.headers, detail.dataTable.rows),
    labeledParagraph('Retrieval practice. ', 'Answer aloud or in writing before checking the 500-item bank.'),
    list(detail.retrieval, true),
    labeledParagraph('Transfer move. ', detail.transfer),
  ];
  section.examples = detail.examples.slice();
  section.nonExamples = detail.nonExamples.slice();
  section.commonMisconceptions = [detail.misconception];
  section.workedDataExample = {
    headers: detail.dataTable.headers.slice(),
    rows: detail.dataTable.rows.map((row) => row.slice()),
  };
  section.retrievalPrompts = detail.retrieval.slice();
  section.transferMove = detail.transfer;
  section.contentEnhancementVersion = enhancementVersion;
  section.contentComplete = true;
  section.contentWordCount = wordCount(section.content);
  section.contentBlockCount = section.contentBlocks.length;
  section.references = refs;
}

function buildSectionCheck(section, chapter, detail) {
  return {
    id: section.id + '-retrieval-check',
    sectionId: section.id,
    type: 'single-choice-retrieval',
    prompt: detail.check.prompt,
    choices: detail.check.choices.slice(),
    answerIndex: detail.check.answerIndex,
    rationale: detail.check.rationale,
    references: referencesFor(section),
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original section retrieval check; AP Psychology subject-expert and psychometric review remain pending.',
    chapterId: chapter.id,
  };
}

function buildSectionCard(section, chapter, detail, index) {
  return {
    id: 'ap-psych-card-section-' + String(index + 1).padStart(2, '0'),
    chapterId: chapter.id,
    sectionId: section.id,
    skillId: chapter.skillId,
    domainId: chapter.domainId,
    domain: chapter.domain,
    front: detail.card.front,
    back: detail.card.back,
    reviewStatus: 'source-reviewed-editorial-pass',
    references: referencesFor(section),
    reviewNote: 'Independent section-linked study card; AP Psychology expert validation remains pending.',
  };
}

const unitMemoryAids = [
  {
    id: 'ap-psych-memory-route-01',
    chapterId: 'ap-psych-ch-01',
    type: 'decision ladder',
    title: 'Biological evidence ladder',
    content: 'Start with the measured behavior. Name the signal or system. Separate population association from individual claim. Then check whether the evidence supports correlation, mechanism, or causation.',
    tags: ['heritability', 'neurons', 'sleep', 'sensation'],
  },
  {
    id: 'ap-psych-memory-route-02',
    chapterId: 'ap-psych-ch-02',
    type: 'decision ladder',
    title: 'Cognition pathway',
    content: 'Input is selected by attention, interpreted by perception, encoded into memory, retrieved with cues, and evaluated through measurement evidence. At each step ask what could be missing or distorted.',
    tags: ['perception', 'attention', 'memory', 'validity'],
  },
  {
    id: 'ap-psych-memory-route-03',
    chapterId: 'ap-psych-ch-03',
    type: 'comparison cue',
    title: 'Learning comparison grid',
    content: 'Classical conditioning links stimuli; operant conditioning links behavior and consequences; observational learning links models, attention, memory, capability, and motivation. Developmental designs determine how change is observed.',
    tags: ['development', 'conditioning', 'observational learning', 'reinforcement'],
  },
  {
    id: 'ap-psych-memory-route-04',
    type: 'comparison cue',
    chapterId: 'ap-psych-ch-04',
    title: 'Social-personality lens',
    content: 'Before labeling a person, test the situation. Then ask whether the explanation emphasizes attribution, group pressure, unconscious conflict, growth, traits, reciprocal interaction, incentives, or appraisal.',
    tags: ['attribution', 'personality', 'groups', 'emotion'],
  },
  {
    id: 'ap-psych-memory-route-05',
    chapterId: 'ap-psych-ch-05',
    type: 'evidence boundary',
    title: 'Health reasoning boundary',
    content: 'Describe the pattern, duration, impairment, context, and evidence. Do not diagnose from a short vignette. For treatment, separate causal design, outcome, fit, access, ethics, and individual limits.',
    tags: ['stress', 'classification', 'treatment', 'ethics'],
  },
];

function main() {
  const library = readJson(libraryPath);
  assert(library.libraryId === 'ap-psychology-pilot-learning-library', 'Unexpected AP Psychology library identity.');
  const sectionIds = new Set();
  const newChecks = [];
  const newCards = [];
  let sectionIndex = 0;

  for (const chapter of library.chapters) {
    const chapterEnhancement = chapterEnhancements[chapter.id];
    assert(chapterEnhancement, `Missing chapter enhancement for ${chapter.id}.`);
    chapter.summary = chapterEnhancement.summary;
    chapter.chapterTakeaways = chapterEnhancement.takeaways.slice();
    chapter.studyArchitecture = {
      format: 'expanded-native-study-chapter',
      lessonSequence: ['Read the core explanation', 'Compare examples and nonexamples', 'Work the data moment', 'Complete retrieval practice', 'Return to linked questions'],
      reviewStatus: 'source-reviewed-editorial-pass',
      expertReviewStatus: 'pending',
    };
    const retainedChecks = (chapter.knowledgeChecks || []).filter((check) => !String(check.id || '').endsWith('-retrieval-check'));
    chapter.knowledgeChecks = retainedChecks;
    for (const section of chapter.sections || []) {
      const detail = enhancements[section.id];
      assert(detail, `Missing section enhancement for ${section.id}.`);
      assert(!sectionIds.has(section.id), `Duplicate section ${section.id}.`);
      sectionIds.add(section.id);
      applySectionEnhancement(section, detail);
      const check = buildSectionCheck(section, chapter, detail);
      chapter.knowledgeChecks.push(check);
      newChecks.push(check);
      newCards.push(buildSectionCard(section, chapter, detail, sectionIndex));
      sectionIndex += 1;
    }
    chapter.sectionCount = chapter.sections.length;
    chapter.knowledgeCheckCount = chapter.knowledgeChecks.length;
    chapter.referenceCount = chapter.references.length;
    chapter.contentEnhancementVersion = enhancementVersion;
    chapter.contentComplete = chapter.sections.every((section) => section.contentComplete === true);
  }

  const retainedCards = (library.flashcards || []).filter((card) => !String(card.id || '').startsWith('ap-psych-card-section-'));
  library.flashcards = retainedCards.concat(newCards);

  const retainedAids = (library.memoryAids || []).filter((aid) => !String(aid.id || '').startsWith('ap-psych-memory-route-'));
  const chapterById = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
  const newAids = unitMemoryAids.map((aid) => {
    const chapter = chapterById.get(aid.chapterId);
    assert(chapter, `Memory aid ${aid.id} references an unknown chapter.`);
    return {
      ...aid,
      domain: chapter.domain,
      references: chapter.references.slice(),
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewNote: 'Independent retrieval aid; AP Psychology, accessibility, and expert validation remain pending.',
    };
  });
  library.memoryAids = retainedAids.concat(newAids);

  library.version = version;
  library.description = 'An independently authored AP Psychology internal preview with an expanded native study library: five chapter workspaces, fifteen richer lessons, worked data moments, section retrieval checks, topic-linked flashcards, memory aids, accessible diagrams, and clearly unscored written-response workshops.';
  library.blueprint.textbookEnhancementVersion = enhancementVersion;
  library.blueprint.textbookEnhancementNote = 'The expanded chapter content, examples, nonexamples, misconception boundaries, data moments, retrieval prompts, and study aids are original internal editorial material. Public sources support factual review; independent AP Psychology subject-expert, rights, accessibility, safety, production, field-testing, and psychometric gates remain open.';
  library.blueprint.lastVerifiedAt = verifiedAt;
  library.contentMigration = {
    schemaVersion: 1,
    contentVersion: enhancementVersion,
    sections: sectionIds.size,
    completeSections: sectionIds.size,
    status: 'complete',
    reviewStatus: 'source-reviewed-editorial-pass',
    note: 'All native AP Psychology sections use structured lesson blocks and remain subject-expert pending.',
  };
  library.summary = {
    ...library.summary,
    chapters: library.chapters.length,
    sections: library.chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
    knowledgeChecks: library.chapters.reduce((sum, chapter) => sum + chapter.knowledgeChecks.length, 0),
    flashcards: library.flashcards.length,
    memoryAids: library.memoryAids.length,
    sourceReviewedChapters: library.chapters.filter((chapter) => chapter.reviewStatus === 'source-reviewed-editorial-pass').length,
    sourceReviewedFlashcards: library.flashcards.filter((card) => card.reviewStatus === 'source-reviewed-editorial-pass').length,
    sourceReviewedMemoryAids: library.memoryAids.filter((aid) => aid.reviewStatus === 'source-reviewed-editorial-pass').length,
    contentCompleteSections: sectionIds.size,
    structuredContentSections: library.chapters.flatMap((chapter) => chapter.sections).filter((section) => Array.isArray(section.contentBlocks) && section.contentBlocks.length > 0).length,
    workedDataExamples: library.chapters.flatMap((chapter) => chapter.sections).filter((section) => section.workedDataExample).length,
    sectionRetrievalChecks: newChecks.length,
  };

  assert(sectionIds.size === 15, `Expected 15 enhanced sections, found ${sectionIds.size}.`);
  assert(newChecks.length === 15, `Expected 15 new retrieval checks, found ${newChecks.length}.`);
  assert(newCards.length === 15, `Expected 15 new section cards, found ${newCards.length}.`);
  assert(newAids.length === 5, `Expected five new unit memory aids, found ${newAids.length}.`);
  assert(library.flashcards.length === 30, `Expected 30 flashcards, found ${library.flashcards.length}.`);
  assert(library.memoryAids.length === 15, `Expected 15 memory aids, found ${library.memoryAids.length}.`);
  assert(library.chapters.every((chapter) => chapter.sections.every((section) => section.contentComplete === true)), 'A section is not marked complete.');

  writeGeneratedFile(libraryPath, JSON.stringify(library, null, 2) + '\n');
  console.log(`Enhanced ${library.libraryId} ${library.version}: ${sectionIds.size} lessons, ${library.summary.knowledgeChecks} checks, ${library.flashcards.length} flashcards, ${library.memoryAids.length} memory aids.`);
}

main();
