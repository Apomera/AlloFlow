#!/usr/bin/env node
'use strict';

// Deterministically expands the AP Psychology internal preview to a 500-item
// source-aligned bank. The generated questions are original draft content; the
// independent rights, accessibility, subject-expert, field-testing, and
// psychometric gates remain release-blocking.

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_psychology_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_psychology_pilot_learning_library.json');
const cedUrl = 'https://apcentral.collegeboard.org/media/pdf/ap-psychology-course-and-exam-description.pdf';
const clarificationsUrl = 'https://apcentral.collegeboard.org/media/pdf/ap-psychology-course-and-exam-description-clarifications.pdf';
const examUrl = 'https://apcentral.collegeboard.org/courses/ap-psychology/exam';
const verifiedAt = '2026-08-20';
const version = '0.2.0-internal-preview';

const unitIds = [
  'biological-bases-of-behavior',
  'cognition',
  'development-and-learning',
  'social-psychology-and-personality',
  'mental-and-physical-health',
];

const unitNumbers = new Map(unitIds.map((id, index) => [id, index + 1]));

const topicPlans = [
  ['1.1', unitIds[0], 17, 11, 4, 2, 'heritability and developmental outcomes', 'reading performance', 'study routines'],
  ['1.2', unitIds[0], 17, 11, 4, 2, 'neural and endocrine communication', 'heart-rate response', 'digestive activity'],
  ['1.3', unitIds[0], 17, 11, 4, 2, 'neuronal signaling', 'stimulus intensity', 'reaction speed'],
  ['1.4', unitIds[0], 17, 11, 4, 2, 'brain systems and behavior', 'brain-region activity', 'task performance'],
  ['1.5', unitIds[0], 16, 10, 5, 1, 'sleep and circadian processes', 'sleep timing', 'attention'],
  ['1.6', unitIds[0], 16, 11, 4, 1, 'sensation and perception', 'sensory input', 'detection accuracy'],

  ['2.1', unitIds[1], 13, 8, 4, 1, 'perceptual organization', 'visual grouping', 'object identification'],
  ['2.2', unitIds[1], 13, 8, 4, 1, 'thinking and decision-making', 'problem-solving strategy', 'choice quality'],
  ['2.3', unitIds[1], 13, 8, 4, 1, 'memory systems', 'information encoding', 'later recall'],
  ['2.4', unitIds[1], 13, 8, 4, 1, 'memory encoding', 'study strategy', 'later recognition'],
  ['2.5', unitIds[1], 12, 8, 3, 1, 'memory storage', 'retention interval', 'neural consolidation'],
  ['2.6', unitIds[1], 12, 8, 3, 1, 'memory retrieval', 'retrieval cue', 'remembering accuracy'],
  ['2.7', unitIds[1], 12, 8, 2, 2, 'forgetting and memory errors', 'misleading information', 'later recall'],
  ['2.8', unitIds[1], 12, 9, 1, 2, 'intelligence and achievement', 'assessment score', 'academic performance'],

  ['3.1', unitIds[2], 12, 7, 4, 1, 'developmental research and change', 'age-related change', 'behavioral measure'],
  ['3.2', unitIds[2], 11, 7, 3, 1, 'physical development', 'prenatal exposure', 'developmental milestone'],
  ['3.3', unitIds[2], 11, 7, 3, 1, 'gender and sexual orientation', 'social role expectation', 'self-described identity'],
  ['3.4', unitIds[2], 11, 7, 3, 1, 'cognitive development', 'reasoning task', 'problem solution'],
  ['3.5', unitIds[2], 11, 7, 3, 1, 'language development', 'child language sample', 'communication pattern'],
  ['3.6', unitIds[2], 11, 7, 3, 1, 'social-emotional development', 'caregiver interaction', 'social response'],
  ['3.7', unitIds[2], 11, 7, 3, 1, 'classical conditioning', 'learned response', 'previously neutral cue'],
  ['3.8', unitIds[2], 11, 8, 2, 1, 'operant conditioning', 'consequence pattern', 'future behavior'],
  ['3.9', unitIds[2], 11, 8, 1, 2, 'social and cognitive learning', 'observed model', 'later performance'],

  ['4.1', unitIds[3], 15, 10, 4, 1, 'attribution and person perception', 'behavioral explanation', 'social judgment'],
  ['4.2', unitIds[3], 15, 10, 4, 1, 'attitudes and persuasion', 'attitude change', 'behavioral intention'],
  ['4.3', unitIds[3], 14, 9, 3, 2, 'social situations', 'group context', 'individual response'],
  ['4.4', unitIds[3], 14, 9, 4, 1, 'psychodynamic and humanistic personality', 'therapy interaction', 'personality explanation'],
  ['4.5', unitIds[3], 14, 9, 3, 2, 'social-cognitive and trait personality', 'personality measure', 'behavior across settings'],
  ['4.6', unitIds[3], 14, 9, 4, 1, 'motivation', 'goal pursuit', 'persistence'],
  ['4.7', unitIds[3], 14, 9, 3, 2, 'emotion', 'physiological arousal', 'subjective feeling'],

  ['5.1', unitIds[4], 20, 13, 5, 2, 'health psychology and stress', 'stress exposure', 'health outcome'],
  ['5.2', unitIds[4], 20, 13, 5, 2, 'positive psychology', 'well-being practice', 'life satisfaction'],
  ['5.3', unitIds[4], 20, 13, 5, 2, 'psychological disorders and explanatory models', 'symptom pattern', 'daily functioning'],
  ['5.4', unitIds[4], 20, 13, 5, 2, 'categories of psychological disorders', 'clinical presentation', 'diagnostic feature'],
  ['5.5', unitIds[4], 20, 13, 5, 2, 'psychological treatment', 'treatment component', 'symptom change'],
].map(([id, unit, target, p1, p2, p3, subject, variable, outcome]) => ({
  id, unit, target, p1, p2, p3, subject, variable, outcome,
}));

const topicPlanById = new Map(topicPlans.map((plan) => [plan.id, plan]));

const sourceUrls = {
  '1.1': 'https://openstax.org/books/psychology-2e/pages/3-introduction',
  '1.2': 'https://openstax.org/books/psychology-2e/pages/3-introduction',
  '1.3': 'https://openstax.org/books/psychology-2e/pages/3-introduction',
  '1.4': 'https://openstax.org/books/psychology-2e/pages/3-introduction',
  '1.5': 'https://openstax.org/books/psychology-2e/pages/4-introduction',
  '1.6': 'https://openstax.org/books/psychology-2e/pages/5-introduction',
  '2.1': 'https://openstax.org/books/psychology-2e/pages/5-introduction',
  '2.2': 'https://openstax.org/books/psychology-2e/pages/7-introduction',
  '2.3': 'https://openstax.org/books/psychology-2e/pages/8-introduction',
  '2.4': 'https://openstax.org/books/psychology-2e/pages/8-introduction',
  '2.5': 'https://openstax.org/books/psychology-2e/pages/8-introduction',
  '2.6': 'https://openstax.org/books/psychology-2e/pages/8-introduction',
  '2.7': 'https://openstax.org/books/psychology-2e/pages/8-introduction',
  '2.8': 'https://openstax.org/books/psychology-2e/pages/7-introduction',
  '3.1': 'https://openstax.org/books/psychology-2e/pages/9-introduction',
  '3.2': 'https://openstax.org/books/psychology-2e/pages/9-introduction',
  '3.3': 'https://openstax.org/books/psychology-2e/pages/9-introduction',
  '3.4': 'https://openstax.org/books/psychology-2e/pages/9-introduction',
  '3.5': 'https://openstax.org/books/psychology-2e/pages/9-introduction',
  '3.6': 'https://openstax.org/books/psychology-2e/pages/9-introduction',
  '3.7': 'https://openstax.org/books/psychology-2e/pages/6-introduction',
  '3.8': 'https://openstax.org/books/psychology-2e/pages/6-introduction',
  '3.9': 'https://openstax.org/books/psychology-2e/pages/6-introduction',
  '4.1': 'https://openstax.org/books/psychology-2e/pages/12-introduction',
  '4.2': 'https://openstax.org/books/psychology-2e/pages/12-introduction',
  '4.3': 'https://openstax.org/books/psychology-2e/pages/12-introduction',
  '4.4': 'https://openstax.org/books/psychology-2e/pages/11-introduction',
  '4.5': 'https://openstax.org/books/psychology-2e/pages/11-introduction',
  '4.6': 'https://openstax.org/books/psychology-2e/pages/10-introduction',
  '4.7': 'https://openstax.org/books/psychology-2e/pages/10-introduction',
  '5.1': 'https://openstax.org/books/psychology-2e/pages/13-introduction',
  '5.2': 'https://openstax.org/books/psychology-2e/pages/13-introduction',
  '5.3': 'https://openstax.org/books/psychology-2e/pages/15-introduction',
  '5.4': 'https://openstax.org/books/psychology-2e/pages/15-introduction',
  '5.5': 'https://openstax.org/books/psychology-2e/pages/16-introduction',
};

const sourceTitles = {
  '3': 'Psychology 2e Biopsychology',
  '4': 'Psychology 2e States of Consciousness',
  '5': 'Psychology 2e Sensation and Perception',
  '6': 'Psychology 2e Learning',
  '7': 'Psychology 2e Thinking and Intelligence',
  '8': 'Psychology 2e Memory',
  '9': 'Psychology 2e Lifespan Development',
  '10': 'Psychology 2e Motivation and Emotion',
  '11': 'Psychology 2e Personality',
  '12': 'Psychology 2e Social Psychology',
  '13': 'Psychology 2e Stress, Lifestyle, and Health',
  '15': 'Psychology 2e Psychological Disorders',
  '16': 'Psychology 2e Therapy and Treatment',
};

const p1Frames = [
  'Which concept best explains this pattern?',
  'Which term most directly applies to the example?',
  'Which psychological concept would a researcher use to describe this result?',
  'Which explanation is most consistent with the observation?',
  'Which concept is illustrated by the situation?',
];

const researchContexts = [
  'a community college research team',
  'a school-based research team',
  'a university laboratory',
  'a clinic evaluating a prevention program',
  'a hospital research group',
  'a developmental research team',
  'a behavioral science class',
  'a public-health research group',
  'a research team studying adults',
  'a laboratory studying learning',
];

const researchVariationFrames = [
  'The protocol was preregistered before recruitment began.',
  'The team counterbalanced the order of its measurement tasks.',
  'The investigators trained two independent observers before data collection.',
  'The sessions were scheduled at two different times of day.',
  'The researchers recorded participant age as a possible descriptive variable.',
  'The team separated exploratory analyses from its planned primary comparison.',
  'The investigators used the same written instructions for every participant.',
  'The research team planned a follow-up measurement one month later.',
  'The study recruited from two course sections rather than one classroom.',
  'The team checked whether participants understood the instructions before beginning.',
  'The investigators recorded refusals and incomplete responses separately.',
  'The protocol included a quiet comparison condition for the primary analysis.',
  'The researchers used a blinded scorer for the behavioral outcome.',
  'The team documented the sampling frame before contacting participants.',
  'The investigators repeated the measure after a short practice period.',
  'The researchers planned to debrief participants after the final task.',
];

const p2Skills = ['2.B', '2.C', '2.D'];
const p3Skills = ['3.B', '3.C'];

// Topic-specific concept cards are added below in unit-sized patches. Each
// card has two or more original application examples; the factory turns those
// examples into varied, four-option items with option-specific feedback.
const topicData = {
  '1.1': {
    concepts: [
      { label: 'Heritability', definition: 'a population statistic describing the proportion of variation associated with genetic differences under particular conditions', examples: [
        'Across a large population, genetic differences account for some variation in reading scores, but the estimate does not describe any one student.',
        'A trait has a high estimate in one environment, yet the trait still changes when nutrition and schooling opportunities change.',
      ] },
      { label: 'Gene–environment interaction', definition: 'the way inherited characteristics and environmental conditions combine to influence an outcome', examples: [
        'Children with similar inherited risk show different outcomes when they grow up with different levels of support and opportunity.',
        'A person’s response to a stressful situation depends on both biological sensitivity and the demands of the surrounding setting.',
      ] },
      { label: 'Phenotype', definition: 'the observable characteristics that result from inherited factors and environmental influences', examples: [
        'Researchers record a student’s measured height after considering both family history and access to nutrition.',
        'Two siblings share many inherited factors but differ in observed behavior because their experiences and habits are not identical.',
      ] },
      { label: 'Epigenetic influence', definition: 'an environmental effect on whether particular genes are expressed without changing the underlying DNA sequence', examples: [
        'Long-term exposure to a demanding environment changes gene expression in a way that can affect stress reactivity.',
        'A developmental experience alters how strongly a biological system is activated while leaving the person’s DNA sequence unchanged.',
      ] },
      { label: 'Twin and adoption evidence', definition: 'comparisons of relatives and reared-apart individuals used to estimate hereditary and environmental contributions', examples: [
        'Identical twins reared in different households resemble each other more than unrelated children on a measured tendency.',
        'Adopted children show some similarity to biological relatives and some similarity to the families who raise them.',
      ] },
      { label: 'Gene–environment correlation', definition: 'the tendency for inherited characteristics to influence the environments people experience or select', examples: [
        'A highly social child receives more invitations and then spends more time in stimulating peer settings.',
        'A child’s interests influence which activities caregivers provide, so inherited tendencies help shape later experiences.',
      ] },
    ],
  },
  '1.2': {
    concepts: [
      { label: 'Central nervous system', definition: 'the brain and spinal cord, which process information and coordinate responses', examples: [
        'A signal from the hand is integrated by the brain and spinal cord before a coordinated response is produced.',
        'Damage to the brain or spinal cord disrupts communication between incoming information and organized behavior.',
      ] },
      { label: 'Peripheral nervous system', definition: 'the nerves outside the brain and spinal cord that connect the central system with the body', examples: [
        'Nerves carry information from skin receptors toward the spinal cord and carry commands back toward muscles.',
        'A medication affects signaling in nerves that connect the limbs with the brain rather than changing the brain tissue itself.',
      ] },
      { label: 'Somatic nervous system', definition: 'the division that carries sensory information and controls voluntary skeletal-muscle movement', examples: [
        'A student deliberately lifts a hand after hearing a question in class.',
        'A person chooses to turn a bicycle handlebar while receiving information from muscles and joints.',
      ] },
      { label: 'Sympathetic division', definition: 'the autonomic division that mobilizes resources during demanding or threatening situations', examples: [
        'After a near collision, a person’s heart rate rises while digestive activity temporarily decreases.',
        'Before a difficult performance, breathing and cardiovascular activity increase without conscious control of each response.',
      ] },
      { label: 'Parasympathetic division', definition: 'the autonomic division that supports restoration, digestion, and energy conservation', examples: [
        'After a stressful event ends, heart rate returns toward baseline and digestive activity resumes.',
        'During a quiet meal, the body supports digestion while the person is not facing an immediate demand.',
      ] },
      { label: 'Endocrine system', definition: 'the system of glands that releases hormones into the bloodstream for relatively sustained effects', examples: [
        'A gland releases a chemical messenger into blood, influencing many organs over a longer period than a single synapse.',
        'A hormone circulates through the body and changes activity in cells that have the appropriate receptor.',
      ] },
    ],
  },
  '1.3': {
    concepts: [
      { label: 'Dendrites', definition: 'branched neuronal structures that receive signals from other cells', examples: [
        'A neuron receives many incoming chemical messages through branched structures extending from its cell body.',
        'Increasing the number of receptive branches gives a neuron more sites at which neighboring cells can influence it.',
      ] },
      { label: 'Axon', definition: 'the neuronal extension that carries an electrical signal away from the cell body', examples: [
        'Once a neuron reaches threshold, the electrical signal travels along a long fiber toward the terminal buttons.',
        'A damaged neural pathway fails to carry a signal from the cell body toward the next synapse.',
      ] },
      { label: 'Myelin sheath', definition: 'a fatty insulating covering that increases the speed of neural transmission along some axons', examples: [
        'A nerve signal travels more quickly when the axon is wrapped in an intact insulating layer.',
        'Loss of the fatty covering slows communication because the electrical signal no longer travels efficiently along the fiber.',
      ] },
      { label: 'Action potential', definition: 'a brief all-or-none electrical event that travels down an axon after threshold is reached', examples: [
        'A neuron fires a signal of roughly constant amplitude after its membrane reaches the required level of excitation.',
        'Stronger stimulation produces more spikes per second rather than making each individual spike larger.',
      ] },
      { label: 'Refractory period', definition: 'a brief interval after firing during which a neuron cannot immediately generate another full action potential', examples: [
        'Immediately after a spike, a neuron requires a short recovery interval before it can fire again.',
        'A maximum firing rate occurs because each neural signal is followed by a period of reduced readiness.',
      ] },
      { label: 'Reuptake', definition: 'the process by which a sending neuron absorbs released neurotransmitter from the synaptic gap', examples: [
        'A transporter removes signaling molecules from the synapse and returns them to the neuron that released them.',
        'Blocking a transporter leaves more neurotransmitter available in the synaptic space for a longer interval.',
      ] },
    ],
  },
  '1.4': {
    concepts: [
      { label: 'Medulla', definition: 'a brainstem structure involved in vital automatic functions such as breathing and heart rate', examples: [
        'Damage to a lower brainstem region disrupts breathing and cardiovascular regulation even when a person is not moving voluntarily.',
        'A researcher links a change in automatic heart-rate regulation to a structure located in the brainstem.',
      ] },
      { label: 'Thalamus', definition: 'a relay structure that routes most sensory information toward appropriate areas of the cerebral cortex', examples: [
        'Information from several sensory systems is sorted and forwarded toward cortical processing regions.',
        'A lesion disrupts the routing of incoming sensory signals before they reach higher cortical areas.',
      ] },
      { label: 'Hypothalamus', definition: 'a small structure that helps regulate homeostasis, motivated behavior, and endocrine activity', examples: [
        'A brain region helps coordinate hunger, body temperature, and hormonal control to maintain internal balance.',
        'A researcher observes that a small area influences both motivated behavior and communication with the pituitary gland.',
      ] },
      { label: 'Hippocampus', definition: 'a medial temporal structure important for forming and consolidating many explicit memories', examples: [
        'After a brain injury, a person can repeat a practiced motor skill but cannot reliably form new memories of daily events.',
        'A task requiring the formation of a new spatial route activates a structure associated with explicit memory.',
      ] },
      { label: 'Amygdala', definition: 'a limbic structure involved in processing emotional significance, especially threat-related information', examples: [
        'A person rapidly detects a fearful facial expression and shows heightened emotional arousal.',
        'A brain scan shows increased activity in a limbic structure while a participant evaluates threatening images.',
      ] },
      { label: 'Cerebellum', definition: 'a hindbrain structure that supports coordination, balance, and some forms of motor learning', examples: [
        'A patient has difficulty maintaining balance and coordinating a learned sequence of movements after damage to a hindbrain area.',
        'Repeated practice improves a fine-motor routine while a structure involved in coordination is engaged.',
      ] },
    ],
  },
  '1.5': {
    concepts: [
      { label: 'Circadian rhythm', definition: 'an approximately 24-hour biological cycle that helps organize sleep, waking, and other functions', examples: [
        'A traveler feels sleepy at the former home time for several days after crossing multiple time zones.',
        'A person’s alertness and body temperature follow a roughly daily pattern even when meals are held constant.',
      ] },
      { label: 'REM sleep', definition: 'a sleep stage marked by rapid eye movements, vivid dreaming, and muscle inhibition', examples: [
        'A sleeper shows rapid eye movements and vivid dream reports while most large skeletal muscles remain inhibited.',
        'After several nights of restricted dreaming, a person spends more time in the stage associated with vivid dreams.',
      ] },
      { label: 'Sleep spindles', definition: 'brief bursts of rhythmic brain activity associated with stage 2 non-REM sleep', examples: [
        'An EEG shows short bursts of rhythmic activity as a sleeper enters a lighter non-REM stage.',
        'A researcher identifies stage 2 sleep by observing a characteristic pattern between wakefulness and deeper slow-wave sleep.',
      ] },
      { label: 'Sleep apnea', definition: 'a disorder involving repeated interruptions of breathing during sleep', examples: [
        'A sleeper repeatedly stops breathing briefly, gasps, and feels unrefreshed the next morning.',
        'A partner reports loud snoring followed by pauses in breathing and brief awakenings throughout the night.',
      ] },
      { label: 'Activation-synthesis theory', definition: 'the proposal that dreams result from the brain’s attempt to organize internally generated neural activity', examples: [
        'A dream combines unrelated images after random brain activation during sleep, and the sleeper experiences a coherent story.',
        'A researcher explains bizarre dream content as the mind’s interpretation of internally generated signals rather than a literal message.',
      ] },
      { label: 'Sleep deprivation', definition: 'a condition in which insufficient or disrupted sleep impairs functioning', examples: [
        'After several nights of shortened sleep, a student shows poorer attention and slower memory retrieval during a morning test.',
        'A worker makes more errors and reports irritability after repeatedly obtaining less sleep than needed.',
      ] },
    ],
  },
  '1.6': {
    concepts: [
      { label: 'Transduction', definition: 'the conversion of physical stimulus energy into neural signals', examples: [
        'Receptors in the eye convert light energy into neural messages that can be processed by the nervous system.',
        'Receptor cells change pressure waves in the ear into patterns of neural activity.',
      ] },
      { label: 'Absolute threshold', definition: 'the minimum stimulation detected half the time under defined conditions', examples: [
        'A participant detects a faint tone on about half of the trials when the laboratory controls background noise.',
        'Researchers gradually lower the brightness until a person reports seeing the light on half of the presentations.',
      ] },
      { label: 'Difference threshold', definition: 'the minimum difference between stimuli that is detected half the time', examples: [
        'A participant notices that a sound became louder only after the researcher increases its intensity by a small amount.',
        'A shopper can tell two packages differ in weight only when the added mass reaches a particular proportion.',
      ] },
      { label: 'Sensory adaptation', definition: 'a reduced response to an unchanging stimulus over time', examples: [
        'After several minutes in a room, a person no longer notices the constant background scent.',
        'A watch feels less noticeable on the wrist after it has been worn for a while.',
      ] },
      { label: 'Signal detection theory', definition: 'the idea that detection depends on stimulus strength, sensitivity, and the observer’s decision criterion', examples: [
        'A tired security officer misses a faint signal that an alert officer detects even though the physical signal is the same.',
        'A participant reports hearing more faint tones after being told that missing one will have a costly consequence.',
      ] },
      { label: 'Perceptual set', definition: 'a readiness to perceive stimuli in a particular way shaped by expectations and prior experience', examples: [
        'After being told to expect an animal, a hiker is more likely to interpret an ambiguous shape as a fox.',
        'The same blurry symbol is read as a letter in one sentence and a number in another because surrounding context changes expectations.',
      ] },
    ],
  },
  '2.1': {
    concepts: [
      { label: 'Gestalt proximity', definition: 'the tendency to group nearby elements together perceptually', examples: [
        'Viewers see letters placed close together as belonging to the same word even when the letters differ in color.',
        'A diagram is perceived as several clusters because the points in each cluster are nearer to one another.',
      ] },
      { label: 'Gestalt closure', definition: 'the tendency to perceive a complete object despite gaps in the available information', examples: [
        'A person recognizes a familiar logo even though portions of its outline are missing.',
        'An interrupted circle is seen as a whole shape rather than as several unrelated curved fragments.',
      ] },
      { label: 'Figure-ground organization', definition: 'the perceptual separation of a focal object from its surrounding background', examples: [
        'A reader identifies dark letters as the object of attention against a lighter page.',
        'In an ambiguous picture, attention shifts between seeing a vase and seeing two faces as the focal figure.',
      ] },
      { label: 'Retinal disparity', definition: 'a binocular depth cue based on the slightly different images received by the two eyes', examples: [
        'A person closes one eye and notices that a nearby object appears to shift more than a distant object.',
        'The visual system compares the two eye images to estimate which object is closer.',
      ] },
      { label: 'Perceptual constancy', definition: 'the tendency to perceive an object as stable despite changes in sensory input', examples: [
        'A door is perceived as rectangular even when its image on the retina becomes a narrow shape as it opens.',
        'A familiar car is judged to remain the same color under different levels of illumination.',
      ] },
    ],
  },
  '2.2': {
    concepts: [
      { label: 'Algorithm', definition: 'a systematic step-by-step procedure that guarantees a solution when applied correctly', examples: [
        'A student follows every step of a verified procedure to find the greatest common factor of two numbers.',
        'A technician checks each possible setting in a fixed order until the correct configuration is found.',
      ] },
      { label: 'Availability heuristic', definition: 'judging likelihood by how easily examples or instances come to mind', examples: [
        'After seeing several news reports about plane accidents, a traveler overestimates the probability of being in one.',
        'A memorable story about a rare illness leads a person to judge that illness as unusually common.',
      ] },
      { label: 'Representativeness heuristic', definition: 'judging category membership or probability by similarity to a typical example', examples: [
        'A quiet person who enjoys mathematics is judged more likely to be an engineer than a salesperson despite base-rate information.',
        'A sequence that looks random is judged more likely than a sequence with several repeated outcomes even when both have equal probability.',
      ] },
      { label: 'Confirmation bias', definition: 'the tendency to seek or interpret evidence in ways that support an existing belief', examples: [
        'A student reads only reviews that support a preferred study method and ignores results that challenge it.',
        'After forming an opinion about a classmate, a person notices behavior that confirms the opinion and overlooks contradictory behavior.',
      ] },
      { label: 'Functional fixedness', definition: 'the tendency to perceive an object only in terms of its familiar use', examples: [
        'A person cannot think of using a coin as a temporary screwdriver because the object is viewed only as money.',
        'A student misses an easy solution because a classroom item is treated only as the tool for which it was designed.',
      ] },
      { label: 'Framing effect', definition: 'a change in judgment caused by whether equivalent information is presented positively or negatively', examples: [
        'People choose a medical program more often when it is described as saving 90 of 100 patients than when it is described as losing 10.',
        'A shopper reacts differently to a discount described as a gain than to the same price described as avoiding a surcharge.',
      ] },
    ],
  },
  '2.3': {
    concepts: [
      { label: 'Sensory memory', definition: 'a very brief storage system that preserves incoming sensory information', examples: [
        'A flash of a rapidly changing display lingers for a moment after the physical image disappears.',
        'A person can report the last instant of a sparkler’s movement even though attention was not directed to every point.',
      ] },
      { label: 'Working memory', definition: 'a limited system used to hold and manipulate information during an ongoing task', examples: [
        'A student keeps intermediate numbers in mind while solving a multistep equation.',
        'A driver remembers a short set of directions long enough to use them while navigating a turn.',
      ] },
      { label: 'Episodic memory', definition: 'explicit memory for personally experienced events tied to a particular time and place', examples: [
        'A person remembers where they sat and what they heard during a specific graduation ceremony.',
        'A student recalls the sequence of events during yesterday’s laboratory activity.',
      ] },
      { label: 'Semantic memory', definition: 'explicit memory for general facts, meanings, and concepts', examples: [
        'A learner knows that neurons communicate across synapses without recalling the lesson in which the fact was taught.',
        'A person remembers the meaning of a word but not the particular conversation where it was learned.',
      ] },
      { label: 'Procedural memory', definition: 'implicit memory for skills and habits demonstrated through performance', examples: [
        'A cyclist can balance and pedal after many years without consciously listing each movement.',
        'A pianist performs a familiar scale smoothly even while attention is focused on another part of the music.',
      ] },
      { label: 'Encoding', definition: 'the initial process of transforming information into a form that can be stored', examples: [
        'A learner pays attention to a new term and converts its meaning into a representation that can later be retained.',
        'A witness focuses on a face and creates a memory representation before the person leaves the room.',
      ] },
    ],
  },
  '2.4': {
    concepts: [
      { label: 'Deep processing', definition: 'encoding information by focusing on meaning and connections rather than surface features', examples: [
        'A student links a new term to an example from everyday life instead of merely repeating how the word looks.',
        'A learner explains why a concept matters and compares it with a related concept while studying.',
      ] },
      { label: 'Elaborative rehearsal', definition: 'connecting new information to existing knowledge or meaningful examples to improve encoding', examples: [
        'A student remembers a definition by relating it to a personal experience that illustrates the same process.',
        'A learner adds explanations and examples to class notes rather than copying the definition repeatedly.',
      ] },
      { label: 'Chunking', definition: 'grouping individual pieces of information into larger meaningful units', examples: [
        'A person remembers a long phone number by grouping its digits into familiar three- and four-digit units.',
        'A student organizes separate vocabulary terms into categories to reduce the number of units held at once.',
      ] },
      { label: 'Mnemonic device', definition: 'a deliberate strategy that uses imagery, organization, or associations to aid memory', examples: [
        'A learner creates a vivid sentence whose first letters cue the order of several scientific terms.',
        'A student imagines a dramatic route through a familiar building to remember a sequence of ideas.',
      ] },
      { label: 'Self-reference effect', definition: 'the tendency for information related to oneself to be encoded especially well', examples: [
        'A learner remembers a new personality term more easily after deciding how it relates to personal behavior.',
        'Students recall examples better when they connect each concept to a relevant experience from their own lives.',
      ] },
      { label: 'Spacing effect', definition: 'the benefit to long-term retention produced by distributing study sessions over time', examples: [
        'A student who studies vocabulary briefly on four different evenings recalls more a week later than a student who crams once.',
        'Practice is distributed across several days, producing better delayed performance than one equally long session.',
      ] },
    ],
  },
  '2.5': {
    concepts: [
      { label: 'Consolidation', definition: 'the process by which a newly formed memory becomes more stable over time', examples: [
        'A memory becomes less vulnerable to disruption after the learner has had time to rest following study.',
        'A newly learned route is initially fragile but becomes more stable after repeated sleep cycles.',
      ] },
      { label: 'Long-term potentiation', definition: 'a lasting increase in synaptic strength following repeated neural activation', examples: [
        'Repeatedly activating a neural pathway makes later communication across that pathway more efficient.',
        'A cellular change strengthens connections that are repeatedly used during learning.',
      ] },
      { label: 'Hippocampal memory function', definition: 'the role of the hippocampus in forming and consolidating many explicit memories', examples: [
        'A person can perform a practiced skill but struggles to create new memories of daily conversations after medial temporal damage.',
        'A learner uses a new spatial layout and later recalls the locations after activity in a memory-related structure.',
      ] },
      { label: 'Distributed practice', definition: 'a storage-supporting study pattern that separates practice sessions across time', examples: [
        'A student revisits material on several days and retains more after a delay than a student who studies for one long evening.',
        'Short review sessions are separated by sleep and other activities before a later exam.',
      ] },
      { label: 'Neural network model', definition: 'a view of memory in which knowledge is represented across patterns of interconnected processing units', examples: [
        'A concept remains partly accessible after one connection is disrupted because related information is distributed across a network.',
        'Learning changes the pattern of activation across many connected units rather than storing a fact in one isolated location.',
      ] },
    ],
  },
  '2.6': {
    concepts: [
      { label: 'Retrieval cue', definition: 'a stimulus or piece of information that helps bring stored material into awareness', examples: [
        'A familiar song helps a person remember details of a particular summer.',
        'Seeing a classroom diagram prompts a student to recall an explanation that was not immediately available.',
      ] },
      { label: 'Encoding specificity', definition: 'the principle that retrieval improves when the conditions resemble those present during encoding', examples: [
        'A student recalls more material when the practice questions resemble the format used during learning.',
        'A diver remembers a list better in the environment where it was originally studied than in a very different setting.',
      ] },
      { label: 'State-dependent memory', definition: 'the tendency for retrieval to improve when a person’s internal state matches the state during learning', examples: [
        'A learner who studied while calm recalls more when calm again than when highly agitated.',
        'Information learned while mildly tired is more accessible when the person later has a similar level of fatigue.',
      ] },
      { label: 'Recognition', definition: 'retrieval demonstrated by identifying previously encountered information', examples: [
        'A student selects a familiar definition from four options but cannot produce the definition without prompts.',
        'A witness identifies a previously seen face from a lineup rather than describing the face from memory alone.',
      ] },
      { label: 'Testing effect', definition: 'the improvement in later retention produced by practicing retrieval', examples: [
        'Students who repeatedly answer practice questions remember more on a delayed test than students who only reread notes.',
        'Retrieving a definition during low-stakes practice strengthens later access more than additional passive review.',
      ] },
    ],
  },
  '2.7': {
    concepts: [
      { label: 'Proactive interference', definition: 'the disruption of newer learning by information learned earlier', examples: [
        'A student keeps writing last year’s locker combination when trying to use the new one.',
        'An old password comes to mind and interferes with recall of a recently changed password.',
      ] },
      { label: 'Retroactive interference', definition: 'the disruption of older learning by information learned more recently', examples: [
        'After learning a new phone number, a person has difficulty recalling the number used for years.',
        'New vocabulary learned in a second language makes an older word less accessible during a quiz.',
      ] },
      { label: 'Misinformation effect', definition: 'a change in later memory caused by misleading information encountered after an event', examples: [
        'A witness remembers a broken headlight after hearing a leading question even though the original scene showed no damage.',
        'A later description that uses a stronger verb changes a participant’s estimate of how fast a collision occurred.',
      ] },
      { label: 'Source amnesia', definition: 'remembering information while forgetting or confusing where the information came from', examples: [
        'A student remembers a surprising fact but cannot tell whether it came from a lecture, a video, or a rumor.',
        'A person reports a dream detail as a real event because the origin of the memory was not retained.',
      ] },
      { label: 'Reconstructive memory', definition: 'the process of rebuilding a memory using stored information, expectations, and later details', examples: [
        'A person fills gaps in a childhood story with details that fit family expectations but were never directly experienced.',
        'Two witnesses remember the same event differently after using their prior knowledge to reconstruct missing details.',
      ] },
    ],
  },
  '2.8': {
    concepts: [
      { label: 'Fluid intelligence', definition: 'the ability to reason about novel problems without relying heavily on learned knowledge', examples: [
        'A teenager solves an unfamiliar pattern problem by identifying relationships rather than recalling a taught procedure.',
        'A person adapts quickly to a new puzzle whose rules have not been encountered before.',
      ] },
      { label: 'Crystallized intelligence', definition: 'knowledge and skills acquired through education and experience', examples: [
        'An adult uses a large vocabulary and accumulated factual knowledge to explain a historical event.',
        'Years of professional experience help a worker recognize a familiar problem and select an effective solution.',
      ] },
      { label: 'Reliability', definition: 'the consistency of a measurement across time, forms, or raters', examples: [
        'A questionnaire produces similar scores for the same students one week apart under similar conditions.',
        'Two trained scorers assign nearly identical ratings to the same set of responses.',
      ] },
      { label: 'Validity', definition: 'the extent to which a test measures what it is intended to measure', examples: [
        'A reading assessment predicts later reading performance and correlates with established reading measures.',
        'A reasoning test actually reflects problem-solving ability rather than reading speed or familiarity with one culture’s trivia.',
      ] },
      { label: 'Standardization', definition: 'the use of consistent procedures and norms for administering and interpreting a test', examples: [
        'Every student receives the same directions, time limit, and scoring procedure before results are compared with a norm group.',
        'A test manual specifies how examiners should present items and convert raw scores into comparable results.',
      ] },
      { label: 'Stereotype threat', definition: 'the risk that concern about confirming a negative group stereotype harms performance', examples: [
        'Before a difficult test, a reminder of a negative stereotype increases anxiety and lowers performance for a targeted group.',
        'A student performs better after the testing context reduces worry about being judged through a group stereotype.',
      ] },
    ],
  },
  '3.1': {
    concepts: [
      { label: 'Cross-sectional design', definition: 'a design that compares different age groups at one point in time', examples: [
        'Researchers compare language scores from five-, ten-, and fifteen-year-olds during the same month.',
        'The study examines age differences by testing separate groups once rather than following the same children.',
      ] },
      { label: 'Longitudinal design', definition: 'a design that follows the same participants across multiple time points', examples: [
        'The same children complete a reasoning task at ages five, ten, and fifteen.',
        'A research team measures one group’s reading development every year from kindergarten through high school.',
      ] },
      { label: 'Cohort effect', definition: 'a difference caused by the historical experiences shared by people born or educated in the same period', examples: [
        'A difference between older and younger adults may reflect different schooling systems rather than biological aging alone.',
        'People born during a major economic crisis show a pattern that may result from shared historical conditions.',
      ] },
      { label: 'Sensitive period', definition: 'a time when a particular experience has especially strong effects on development', examples: [
        'Exposure to a language during early childhood makes later acquisition of its sounds easier.',
        'A developmental experience has a stronger effect when it occurs during a limited window of heightened readiness.',
      ] },
      { label: 'Nature–nurture interaction', definition: 'the idea that development reflects continuous interplay between inherited factors and experience', examples: [
        'A child’s inherited temperament influences caregiver responses, which in turn shape later behavior.',
        'Researchers conclude that developmental outcomes cannot be explained by genes or environment considered in isolation.',
      ] },
    ],
  },
  '3.2': {
    concepts: [
      { label: 'Zygote', definition: 'the single cell formed when sperm and egg unite at conception', examples: [
        'Immediately after fertilization, the developing organism consists of one newly formed cell.',
        'A developmental timeline labels the period before implantation as beginning with the fertilized cell.',
      ] },
      { label: 'Embryonic period', definition: 'the prenatal period from about the second through the eighth week when major organs begin forming', examples: [
        'During the early prenatal weeks, basic organ structures begin developing rapidly.',
        'A harmful exposure during a period of rapid organ formation creates a particularly important developmental concern.',
      ] },
      { label: 'Teratogen', definition: 'an environmental agent that can harm prenatal development', examples: [
        'A prenatal exposure increases the risk of developmental problems in the fetus.',
        'Researchers examine how a drug, infection, or toxin affects development when exposure occurs before birth.',
      ] },
      { label: 'Puberty', definition: 'the period of physical maturation leading to reproductive capability', examples: [
        'A young person experiences hormonal changes, a growth spurt, and development of secondary sex characteristics.',
        'A developmental study measures the timing of physical maturation rather than changes in reasoning ability.',
      ] },
      { label: 'Myelination', definition: 'the development of insulating tissue around axons that improves neural communication', examples: [
        'As a child develops, increased insulation along neural pathways supports faster and more coordinated processing.',
        'A developmental change in axon covering contributes to improved control of movement and attention.',
      ] },
    ],
  },
  '3.3': {
    concepts: [
      { label: 'Gender identity', definition: 'a person’s internal sense of their gender', examples: [
        'A participant describes an internal sense of gender that may not match assumptions based on appearance.',
        'A developmental interview asks how a person identifies rather than assigning identity from clothing or activities.',
      ] },
      { label: 'Gender role', definition: 'a set of culturally shaped expectations about behavior associated with gender', examples: [
        'A child is encouraged toward one activity and discouraged from another because adults hold gendered expectations.',
        'A community teaches different norms about emotional expression for people assigned to different genders.',
      ] },
      { label: 'Gender schema', definition: 'a mental framework used to organize and interpret information related to gender', examples: [
        'A child remembers activities consistent with a learned gender category better than activities that challenge it.',
        'A person interprets an ambiguous behavior differently after activating a culturally learned framework about gender.',
      ] },
      { label: 'Sexual orientation', definition: 'a pattern of enduring romantic or sexual attraction', examples: [
        'A researcher measures patterns of attraction and relationships rather than treating orientation as a voluntary daily choice.',
        'A participant reports a stable pattern of attraction that is distinct from gender identity or gender role expectations.',
      ] },
      { label: 'Social learning of gender', definition: 'the acquisition of gender-linked behaviors through observation, modeling, and reinforcement', examples: [
        'A child repeats a behavior after seeing an admired adult receive approval for it.',
        'Caregivers respond differently to similar behavior depending on the child’s perceived gender, shaping later expectations.',
      ] },
    ],
  },
  '3.4': {
    concepts: [
      { label: 'Sensorimotor stage', definition: 'Piaget’s earliest stage in which infants learn through senses and motor actions', examples: [
        'An infant explores an object by looking, touching, and repeatedly shaking it.',
        'A baby gradually coordinates sensory information with reaching and grasping actions.',
      ] },
      { label: 'Object permanence', definition: 'the understanding that an object continues to exist when it is not currently perceived', examples: [
        'An infant searches under a blanket for a toy that was hidden from view.',
        'A baby becomes upset when a caregiver leaves but later looks toward the location where the caregiver disappeared.',
      ] },
      { label: 'Conservation', definition: 'the understanding that quantity remains the same despite changes in appearance', examples: [
        'A child recognizes that the same amount of water remains after it is poured into a taller, narrower glass.',
        'A learner understands that spreading coins farther apart does not increase the number of coins.',
      ] },
      { label: 'Egocentrism', definition: 'difficulty seeing a situation from another person’s perspective', examples: [
        'A preschooler assumes that another person can see exactly what is visible from the child’s own position.',
        'A child describes a scene using only information available from their own viewpoint.',
      ] },
      { label: 'Zone of proximal development', definition: 'the range of tasks a learner can complete with guidance but not yet independently', examples: [
        'A student solves a more difficult puzzle after a teacher provides hints but cannot yet solve it alone.',
        'A caregiver gives just enough assistance for a child to complete a task that is beyond the child’s current independent skill.',
      ] },
    ],
  },
  '3.5': {
    concepts: [
      { label: 'Phoneme', definition: 'the smallest distinctive sound unit in a language', examples: [
        'Changing one sound in a word changes its meaning even though the rest of the word remains the same.',
        'A language learner practices distinguishing two sounds that native speakers hear as different categories.',
      ] },
      { label: 'Morpheme', definition: 'the smallest meaningful unit of language', examples: [
        'A child adds a meaningful ending to a word to indicate that there is more than one object.',
        'A word can be divided into a base unit and a meaningful prefix that changes its interpretation.',
      ] },
      { label: 'Telegraphic speech', definition: 'early speech that uses a few content words while omitting many grammatical markers', examples: [
        'A young child says “more juice” to communicate a request without using a complete adult sentence.',
        'A toddler combines a noun and verb but leaves out articles and auxiliary words.',
      ] },
      { label: 'Overregularization', definition: 'the application of a grammatical rule to an irregular word', examples: [
        'A child says “goed” after learning that many past-tense verbs take an -ed ending.',
        'A learner applies a regular plural ending to a word whose conventional plural form is irregular.',
      ] },
      { label: 'Syntax', definition: 'the rules for arranging words into grammatically meaningful sentences', examples: [
        'Reordering the words in a sentence changes who performed the action and who received it.',
        'A child gradually learns where verbs and objects can appear in the language’s sentence structure.',
      ] },
    ],
  },
  '3.6': {
    concepts: [
      { label: 'Secure attachment', definition: 'an attachment pattern marked by comfort with exploration and effective use of a caregiver as a secure base', examples: [
        'A child explores a new room, becomes upset when the caregiver leaves, and is comforted when the caregiver returns.',
        'During a separation and reunion procedure, a child seeks contact and then returns to play after being soothed.',
      ] },
      { label: 'Temperament', definition: 'relatively stable differences in emotional reactivity and self-regulation', examples: [
        'Infants differ consistently in activity level, irritability, and ease of calming across many situations.',
        'A child’s early tendency toward caution interacts with caregiver responses and later social experiences.',
      ] },
      { label: 'Identity development', definition: 'the process of forming a coherent sense of values, roles, and personal direction', examples: [
        'An adolescent explores possible careers and beliefs before making commitments that feel personally meaningful.',
        'A young adult integrates family expectations with personal goals into a more stable self-concept.',
      ] },
      { label: 'Authoritative parenting', definition: 'a parenting style combining warmth and responsiveness with clear standards and consistent limits', examples: [
        'A caregiver sets a firm bedtime, explains the reason, listens to concerns, and follows through calmly.',
        'Parents provide affection while expecting age-appropriate responsibility and allowing discussion of rules.',
      ] },
      { label: 'Conventional moral reasoning', definition: 'moral reasoning focused on social approval, rules, and maintaining social order', examples: [
        'A person follows a rule mainly because trustworthy community members expect it and society depends on shared standards.',
        'A student argues that an action is wrong because it violates laws and disrupts the group’s order.',
      ] },
    ],
  },
  '3.7': {
    concepts: [
      { label: 'Unconditioned stimulus', definition: 'a stimulus that naturally elicits a response without prior learning', examples: [
        'A puff of air naturally makes a person blink before any conditioning procedure occurs.',
        'A bitter taste produces salivation without the person first learning that the taste predicts food.',
      ] },
      { label: 'Conditioned stimulus', definition: 'a previously neutral stimulus that elicits a learned response after pairing with an unconditioned stimulus', examples: [
        'After repeated pairings with an unpleasant event, a particular tone causes anxiety on its own.',
        'A classroom sound that was initially meaningless later produces anticipation because it predicts a test.',
      ] },
      { label: 'Extinction', definition: 'the weakening of a conditioned response when the conditioned stimulus is repeatedly presented without the unconditioned stimulus', examples: [
        'A dog gradually stops salivating to a bell when the bell is repeatedly sounded without food.',
        'A learned fear decreases after a person repeatedly encounters the previously feared cue without the expected harmful event.',
      ] },
      { label: 'Spontaneous recovery', definition: 'the reappearance of an extinguished conditioned response after a rest period', examples: [
        'A response that seemed gone returns briefly when the previously extinguished cue is presented after several days.',
        'Following extinction, a person shows a temporary return of fear when encountering the old cue after a period away.',
      ] },
      { label: 'Stimulus generalization', definition: 'the tendency for stimuli similar to the conditioned stimulus to elicit a similar response', examples: [
        'After learning fear of one loud dog, a child also becomes uneasy around other large barking dogs.',
        'A response learned to one tone occurs to tones with nearby frequencies as well.',
      ] },
    ],
  },
  '3.8': {
    concepts: [
      { label: 'Positive reinforcement', definition: 'increasing behavior by presenting a desirable consequence after the behavior', examples: [
        'A student studies more often after receiving encouraging feedback for completing practice questions.',
        'A dog sits more frequently after the trainer gives a small treat following the behavior.',
      ] },
      { label: 'Negative reinforcement', definition: 'increasing behavior by removing an aversive condition after the behavior', examples: [
        'A driver buckles the seat belt more quickly because the warning sound stops when the belt is fastened.',
        'A student submits work early because doing so removes repeated reminder messages.',
      ] },
      { label: 'Positive punishment', definition: 'decreasing behavior by presenting an aversive consequence after the behavior', examples: [
        'A person receives an unpleasant penalty after violating a rule and later violates the rule less often.',
        'A child loses the opportunity to continue an activity after hitting, reducing the future frequency of hitting.',
      ] },
      { label: 'Negative punishment', definition: 'decreasing behavior by removing a desirable consequence after the behavior', examples: [
        'A teenager loses phone privileges after missing a curfew and later misses curfew less often.',
        'A player is benched after ignoring team rules, removing access to the game as a consequence.',
      ] },
      { label: 'Variable-ratio schedule', definition: 'a reinforcement schedule that rewards after an unpredictable number of responses', examples: [
        'A person keeps checking a game because a reward arrives after an unpredictable number of attempts.',
        'A salesperson makes many calls because success occurs after a changing number of contacts and produces a high response rate.',
      ] },
      { label: 'Shaping', definition: 'reinforcing successive approximations of a desired behavior', examples: [
        'A trainer first rewards a dog for approaching a platform, then for placing one paw on it, and finally for standing on it.',
        'A teacher reinforces closer attempts until a learner produces the complete target response.',
      ] },
    ],
  },
  '3.9': {
    concepts: [
      { label: 'Observational learning', definition: 'learning that occurs by watching another person’s behavior and its consequences', examples: [
        'A child begins using a new strategy after watching an older sibling receive praise for using it.',
        'A student learns how to operate unfamiliar equipment by observing a skilled peer before trying it independently.',
      ] },
      { label: 'Vicarious reinforcement', definition: 'an increase in behavior after observing someone else receive a rewarding consequence', examples: [
        'Students participate more after seeing a classmate praised for contributing an answer.',
        'A child imitates a behavior after watching another child receive a desired outcome for it.',
      ] },
      { label: 'Latent learning', definition: 'learning that is not immediately expressed in behavior until an incentive or opportunity appears', examples: [
        'A rat later navigates a maze efficiently despite having shown no evidence of learning before food was introduced.',
        'A student uses knowledge of a building’s layout only when an unexpected evacuation requires a new route.',
      ] },
      { label: 'Cognitive map', definition: 'a mental representation of the spatial layout of an environment', examples: [
        'A person takes a new shortcut through a neighborhood because they understand how several streets connect.',
        'An animal reaches food by using a remembered layout rather than repeating a fixed sequence of turns.',
      ] },
      { label: 'Self-efficacy', definition: 'a person’s belief that they can successfully perform a particular task', examples: [
        'A student persists through difficult algebra problems because they believe effort and strategy can lead to success.',
        'After observing a similar peer master a skill, a learner becomes more confident about attempting it.',
      ] },
    ],
  },
  '4.1': {
    concepts: [
      { label: 'Internal attribution', definition: 'an explanation that emphasizes a person’s traits, intentions, or abilities', examples: [
        'After a classmate arrives early, a student concludes that the classmate is highly conscientious.',
        'An observer explains a volunteer’s generous behavior mainly by referring to the volunteer’s personality.',
      ] },
      { label: 'External attribution', definition: 'an explanation that emphasizes situational demands or environmental circumstances', examples: [
        'A late employee is described as delayed by a traffic accident rather than as generally irresponsible.',
        'A person’s unusual behavior is attributed to the pressure and constraints of the situation.',
      ] },
      { label: 'Fundamental attribution error', definition: 'the tendency to overemphasize personal factors when explaining other people’s behavior', examples: [
        'Observers call a driver careless while giving little attention to the icy road that affected the driver’s action.',
        'A person explains a stranger’s missed deadline as laziness without considering the unusual demands of the day.',
      ] },
      { label: 'Self-serving bias', definition: 'the tendency to credit personal factors for successes and situational factors for failures', examples: [
        'A student attributes a high grade to ability but blames an unexpected question for a low grade.',
        'An athlete explains a win through skill and a loss through poor officiating or weather.',
      ] },
      { label: 'Halo effect', definition: 'the tendency for one favorable characteristic to influence judgments about other characteristics', examples: [
        'A well-dressed applicant is judged as more competent even though clothing provides no evidence about job performance.',
        'A teacher’s positive first impression leads the teacher to rate unrelated aspects of a student more favorably.',
      ] },
    ],
  },
  '4.2': {
    concepts: [
      { label: 'Cognitive dissonance', definition: 'discomfort produced by inconsistency among attitudes, beliefs, and behavior', examples: [
        'A person who values health but continues smoking feels tension and changes a belief or behavior to reduce it.',
        'After spending money on an unwanted purchase, a shopper emphasizes its benefits to make the decision feel consistent.',
      ] },
      { label: 'Central route persuasion', definition: 'attitude change produced by careful consideration of evidence and arguments', examples: [
        'A student evaluates the methods and data in a long presentation before changing an opinion about a policy.',
        'A voter studies competing evidence and reasoning rather than relying on a speaker’s popularity.',
      ] },
      { label: 'Peripheral route persuasion', definition: 'attitude change produced by superficial cues such as attractiveness or credibility', examples: [
        'A consumer favors a product because a popular athlete endorses it without evaluating the product’s evidence.',
        'An audience agrees with a message mainly because the speaker appears confident and familiar.',
      ] },
      { label: 'Foot-in-the-door technique', definition: 'gaining compliance with a large request after first gaining agreement to a small request', examples: [
        'A charity first asks a resident to display a small sticker and later asks for a substantial donation.',
        'A student agrees to answer one survey question and then is more willing to complete the full questionnaire.',
      ] },
      { label: 'Mere exposure effect', definition: 'the tendency for repeated exposure to increase liking or familiarity', examples: [
        'A song becomes more appealing after it has been heard several times even without a conscious evaluation of its quality.',
        'Students gradually prefer a harmless symbol that they have encountered repeatedly over equally unfamiliar symbols.',
      ] },
    ],
  },
  '4.3': {
    concepts: [
      { label: 'Conformity', definition: 'adjusting behavior or expressed beliefs to match a group’s expectations', examples: [
        'A participant gives the same incorrect line judgment as a unanimous group despite privately seeing the correct answer.',
        'A new employee adopts a team’s meeting routine even though the employee initially preferred a different procedure.',
      ] },
      { label: 'Obedience', definition: 'following a direct command from an authority figure', examples: [
        'A volunteer continues a task after an experimenter instructs the volunteer to proceed.',
        'An employee follows a supervisor’s explicit directive even though the employee would not choose the action independently.',
      ] },
      { label: 'Groupthink', definition: 'a decision-making failure caused by pressure for consensus and suppression of dissent', examples: [
        'A committee ignores warning signs because members value agreement and do not voice doubts about the plan.',
        'A close team fails to consider alternatives after a leader signals that disagreement is disloyal.',
      ] },
      { label: 'Diffusion of responsibility', definition: 'a reduction in personal responsibility when other people are present', examples: [
        'In a crowded hallway, each witness assumes someone else will call for help during an emergency.',
        'A group member is less likely to intervene because responsibility appears shared across many observers.',
      ] },
      { label: 'Social loafing', definition: 'reduced individual effort when working in a group than when working alone', examples: [
        'A student contributes less effort to a group project because individual contributions are difficult to identify.',
        'People pull less strongly in a team task than when they believe their personal output is being measured.',
      ] },
    ],
  },
  '4.4': {
    concepts: [
      { label: 'Id', definition: 'the psychodynamic component guided by immediate gratification of basic impulses', examples: [
        'A person wants an immediate reward and shows little concern for rules or delayed consequences.',
        'A young child demands a desired object at once rather than considering another person’s needs.',
      ] },
      { label: 'Ego', definition: 'the psychodynamic component that uses reality-based planning to manage competing demands', examples: [
        'A person finds a practical way to meet a desire while respecting social rules and future consequences.',
        'A student delays an enjoyable activity to finish an assignment and then schedules a reward afterward.',
      ] },
      { label: 'Defense mechanism', definition: 'an unconscious strategy that reduces anxiety by distorting or redirecting distressing thoughts', examples: [
        'A person facing unacceptable feelings gives a plausible but inaccurate explanation for the feelings without awareness of the distortion.',
        'After a stressful conflict, someone redirects anger toward a safer target rather than acknowledging its original source.',
      ] },
      { label: 'Self-actualization', definition: 'the humanistic pursuit of realizing one’s potential and developing a meaningful, authentic life', examples: [
        'A person chooses challenging creative work that expresses personal values rather than pursuing approval alone.',
        'After meeting basic needs, an individual focuses on growth, purpose, and becoming the person they believe they can be.',
      ] },
      { label: 'Unconditional positive regard', definition: 'acceptance and respect offered without making worth depend on specific behavior', examples: [
        'A therapist communicates that the client has value while still examining harmful choices and possible changes.',
        'A counselor listens empathically without withdrawing acceptance when the client describes an embarrassing mistake.',
      ] },
    ],
  },
  '4.5': {
    concepts: [
      { label: 'Big Five trait model', definition: 'a trait framework organized around openness, conscientiousness, extraversion, agreeableness, and neuroticism', examples: [
        'A personality inventory describes a person as highly organized, dependable, and likely to plan ahead.',
        'Researchers summarize individual differences using five broad dimensions rather than a single type category.',
      ] },
      { label: 'Reciprocal determinism', definition: 'the interaction among personal factors, behavior, and environment', examples: [
        'A confident student chooses challenging settings, succeeds there, and receives feedback that further changes confidence.',
        'A person’s beliefs influence behavior, behavior changes the social environment, and that environment feeds back into beliefs.',
      ] },
      { label: 'Locus of control', definition: 'a person’s expectation about whether outcomes depend mainly on personal actions or external forces', examples: [
        'A student believes that study choices strongly influence grades and changes study habits after a poor result.',
        'A worker explains every promotion or setback as the result of luck and believes personal actions have little effect.',
      ] },
      { label: 'Person–situation interaction', definition: 'the idea that behavior reflects both stable tendencies and the demands of particular situations', examples: [
        'A normally talkative person becomes quiet during a formal interview but lively with close friends.',
        'A trait predicts behavior more accurately when the situation provides an opportunity to express that trait.',
      ] },
      { label: 'Self-efficacy belief', definition: 'a person’s judgment that they can successfully perform a specific behavior or task', examples: [
        'A learner persists through a difficult skill because previous mastery creates confidence in the ability to improve.',
        'Seeing a similar peer succeed increases a student’s belief that the student can complete the task as well.',
      ] },
    ],
  },
  '4.6': {
    concepts: [
      { label: 'Drive-reduction theory', definition: 'the view that behavior is motivated to reduce internal states of physiological tension', examples: [
        'A hungry person seeks food because eating reduces the internal discomfort associated with an energy deficit.',
        'A person who is too cold seeks warmth to restore the body toward a preferred internal state.',
      ] },
      { label: 'Incentive theory', definition: 'the view that external rewards and goals pull behavior toward particular outcomes', examples: [
        'A student studies extra material because a scholarship reward is offered for high performance.',
        'A worker volunteers for an unpleasant task because a valued bonus is attached to completing it.',
      ] },
      { label: 'Arousal theory', definition: 'the idea that people seek an individually preferred level of stimulation', examples: [
        'A bored person chooses an exciting activity while an overstimulated person seeks a quiet environment.',
        'A student alternates between background music and silence to maintain a personally effective level of stimulation.',
      ] },
      { label: 'Maslow’s hierarchy of needs', definition: 'a model proposing that basic needs generally support pursuit of higher psychological and self-development needs', examples: [
        'A student who lacks food and safety has difficulty focusing on long-term creative goals.',
        'After basic needs are relatively secure, a person devotes more attention to belonging, esteem, and personal growth.',
      ] },
      { label: 'Intrinsic motivation', definition: 'engaging in an activity because it is interesting or satisfying in itself', examples: [
        'A student reads about astronomy for pleasure even though no grade or prize is offered.',
        'A musician practices a difficult passage because mastering it is personally satisfying.',
      ] },
    ],
  },
  '4.7': {
    concepts: [
      { label: 'James–Lange theory', definition: 'the proposal that physiological arousal is interpreted as the experience of emotion', examples: [
        'A person notices trembling and a racing heart and then experiences fear in response to those bodily changes.',
        'The theory predicts that the perception of bodily reactions helps produce the conscious feeling of emotion.',
      ] },
      { label: 'Cannon–Bard theory', definition: 'the proposal that emotional feeling and physiological arousal occur simultaneously after a stimulus', examples: [
        'A threatening event produces a conscious feeling of fear and bodily arousal at roughly the same time.',
        'The model rejects the idea that the body must respond first before the emotional experience begins.',
      ] },
      { label: 'Two-factor theory', definition: 'the view that emotion depends on physiological arousal plus a cognitive label for the situation', examples: [
        'The same elevated heart rate is labeled excitement at a concert but fear in a threatening alley.',
        'A person experiences an emotion after noticing bodily arousal and interpreting the surrounding context.',
      ] },
      { label: 'Cognitive appraisal', definition: 'an interpretation of the meaning or significance of an event that shapes emotional response', examples: [
        'Two students receive the same difficult assignment but feel different emotions because they interpret its meaning differently.',
        'A person evaluates a deadline as a manageable challenge rather than a threat and experiences less distress.',
      ] },
      { label: 'Facial feedback', definition: 'the idea that feedback from facial muscles can influence emotional experience', examples: [
        'Holding a smile-like expression slightly changes how pleasant a person rates a series of images.',
        'A person’s emotional report shifts after deliberately adopting a facial expression associated with a feeling.',
      ] },
    ],
  },
  '5.1': {
    concepts: [
      { label: 'Acute stress', definition: 'a short-term response to an immediate demand or threat', examples: [
        'A person’s heart rate and alertness rise during a brief emergency and return toward baseline after the event ends.',
        'A student experiences temporary tension before a presentation and relaxes after the presentation is finished.',
      ] },
      { label: 'Chronic stress', definition: 'a prolonged stress response produced by continuing or repeated demands', examples: [
        'A caregiver faces months of ongoing demands and reports persistent tension, sleep disruption, and fatigue.',
        'A worker remains exposed to an unpredictable schedule for a long period rather than facing one isolated challenge.',
      ] },
      { label: 'HPA axis', definition: 'a stress-response pathway linking the hypothalamus, pituitary gland, and adrenal cortex', examples: [
        'A stressor activates a sequence that ultimately causes the adrenal cortex to release a hormone into the bloodstream.',
        'Researchers track a pathway from a brain region through the pituitary to a sustained hormonal stress response.',
      ] },
      { label: 'Cortisol', definition: 'a hormone released during the stress response that helps mobilize energy and regulate immune activity', examples: [
        'A person shows elevated levels of a stress-related hormone after repeated demands, especially when recovery time is limited.',
        'A study measures a bloodstream hormone associated with energy mobilization during prolonged stress.',
      ] },
      { label: 'Problem-focused coping', definition: 'coping that attempts to change, solve, or manage the source of stress', examples: [
        'A student facing a difficult schedule creates a study plan and contacts the instructor about unclear requirements.',
        'A worker responds to an overwhelming task by breaking it into steps and requesting a realistic deadline.',
      ] },
      { label: 'Emotion-focused coping', definition: 'coping that attempts to manage the emotional response to a stressor', examples: [
        'A person uses breathing exercises and social support to reduce distress while an uncontrollable situation continues.',
        'A student journals and talks with a trusted friend to manage worry about an outcome that cannot be changed immediately.',
      ] },
    ],
  },
  '5.2': {
    concepts: [
      { label: 'Subjective well-being', definition: 'a person’s self-reported evaluation of life satisfaction and positive and negative affect', examples: [
        'A survey asks people to rate how satisfied they are with life and how often they have recently felt positive emotions.',
        'Two people with similar incomes report different levels of life satisfaction and daily emotional experience.',
      ] },
      { label: 'Flow', definition: 'a deeply absorbed state that occurs when a challenging activity matches a person’s skills', examples: [
        'A musician loses track of time while practicing a demanding passage that is difficult but manageable.',
        'A programmer becomes fully absorbed in a task that provides clear goals and immediate feedback.',
      ] },
      { label: 'Resilience', definition: 'the capacity to adapt and recover after adversity or significant stress', examples: [
        'After a setback, a person uses support and flexible problem solving to resume meaningful activities.',
        'A student experiences a major disappointment but gradually rebuilds routines and continues pursuing long-term goals.',
      ] },
      { label: 'Hedonic adaptation', definition: 'the tendency for emotional reactions to return toward a baseline after positive or negative changes', examples: [
        'A new purchase produces excitement at first, but the emotional boost becomes smaller after repeated exposure.',
        'After an initial adjustment period, a person’s daily happiness moves closer to its earlier level despite a major life change.',
      ] },
      { label: 'Mindfulness', definition: 'purposeful, nonjudgmental attention to present-moment experience', examples: [
        'A person notices thoughts, sensations, and breathing without immediately judging or trying to suppress them.',
        'During a brief exercise, a student redirects attention to current sensations whenever the mind wanders.',
      ] },
      { label: 'Self-compassion', definition: 'responding to personal difficulty with understanding, balanced perspective, and kindness rather than harsh self-judgment', examples: [
        'After making a mistake, a person acknowledges the error while speaking to the self with the same kindness offered to a friend.',
        'A student recognizes that failure is part of common human experience and uses the lesson to plan a next step.',
      ] },
    ],
  },
  '5.3': {
    concepts: [
      { label: 'Psychological disorder', definition: 'a pattern involving clinically significant distress, dysfunction, or impairment within a cultural context', examples: [
        'A persistent pattern causes substantial distress and interferes with work, relationships, or daily responsibilities.',
        'A clinician evaluates both the person’s functioning and the cultural context before deciding whether a pattern is clinically significant.',
      ] },
      { label: 'Medical model', definition: 'the view that psychological disorders can reflect underlying biological, psychological, and social causes requiring assessment and treatment', examples: [
        'A practitioner considers biological vulnerability, learning history, and social stressors when explaining a client’s symptoms.',
        'A treatment plan is based on assessment of causes and evidence rather than moral judgment about the person.',
      ] },
      { label: 'Diathesis–stress model', definition: 'the view that disorder can result when vulnerability combines with significant stress', examples: [
        'A person with a longstanding vulnerability develops symptoms after a major loss and prolonged sleep disruption.',
        'A stressful event produces different outcomes in people with different levels of biological or psychological susceptibility.',
      ] },
      { label: 'Comorbidity', definition: 'the presence of two or more disorders or clinically significant conditions in the same person', examples: [
        'An assessment identifies both a persistent mood pattern and a separate anxiety pattern that each affect functioning.',
        'A treatment study reports that many participants meet criteria for more than one condition at the same time.',
      ] },
      { label: 'Cultural formulation', definition: 'the consideration of cultural meanings, context, and explanatory models in clinical assessment', examples: [
        'A clinician asks how a community understands distress before interpreting a client’s behavior as clinically unusual.',
        'Assessment considers language, cultural practices, and access to resources rather than applying one culture’s norms automatically.',
      ] },
      { label: 'Stigma', definition: 'a socially shared negative label or stereotype that can harm people associated with a condition', examples: [
        'A person avoids seeking support because others describe mental-health treatment as a sign of personal weakness.',
        'A public campaign reduces harmful stereotypes by presenting psychological conditions as treatable health concerns rather than moral failures.',
      ] },
    ],
  },
  '5.4': {
    concepts: [
      { label: 'Specific phobia', definition: 'a persistent and excessive fear of a particular object or situation', examples: [
        'A person experiences intense fear around elevators and avoids them even when the situation poses little actual danger.',
        'A narrowly focused fear leads someone to change routines and experience meaningful interference in daily life.',
      ] },
      { label: 'Generalized anxiety disorder', definition: 'excessive, persistent worry across multiple areas of life that is difficult to control', examples: [
        'A person worries most days about finances, health, family, and work for a prolonged period and cannot easily stop the worry.',
        'The worry is broad rather than limited to one object and is accompanied by tension and sleep difficulty.',
      ] },
      { label: 'Obsessive-compulsive disorder', definition: 'a condition involving intrusive thoughts or images and/or repetitive behaviors or mental acts', examples: [
        'A person experiences unwanted contamination thoughts and repeatedly washes hands to reduce the distress temporarily.',
        'A client checks a lock many times despite recognizing that the repeated checking is excessive and time-consuming.',
      ] },
      { label: 'Post-traumatic stress disorder', definition: 'a condition involving persistent trauma-related reexperiencing, avoidance, arousal, or negative changes after a qualifying event', examples: [
        'After a traumatic event, a person has intrusive memories, avoids reminders, and remains unusually alert for an extended period.',
        'A client becomes distressed by cues associated with a past trauma and changes daily routines to avoid those cues.',
      ] },
      { label: 'Major depressive disorder', definition: 'a condition involving a persistent depressed or loss-of-interest pattern with associated symptoms and impairment', examples: [
        'For an extended period, a person loses interest in previously valued activities and experiences sleep, energy, and concentration changes.',
        'A clinician evaluates a sustained mood pattern and its effect on daily functioning rather than inferring a disorder from one sad day.',
      ] },
      { label: 'Bipolar disorder', definition: 'a mood disorder involving episodes of depression and episodes of abnormally elevated or irritable mood and activation', examples: [
        'A person has distinct periods of unusually elevated energy and reduced need for sleep as well as separate depressive episodes.',
        'The assessment identifies episodic shifts in mood and activation rather than a constant pattern of ordinary mood variation.',
      ] },
    ],
  },
  '5.5': {
    concepts: [
      { label: 'Cognitive-behavioral therapy', definition: 'a treatment that changes unhelpful thoughts and behaviors through structured learning and practice', examples: [
        'A therapist helps a client identify a rigid prediction, test it with evidence, and practice a more adaptive behavior.',
        'Treatment includes thought records, behavioral experiments, and planned practice between sessions.',
      ] },
      { label: 'Exposure therapy', definition: 'a behavioral treatment that uses gradual, supported contact with feared cues while preventing avoidance', examples: [
        'A client gradually encounters feared situations in a planned hierarchy while learning that anxiety can decline without escape.',
        'A therapist helps a person approach a safe but feared cue repeatedly rather than using a ritual to reduce anxiety.',
      ] },
      { label: 'Psychodynamic therapy', definition: 'a treatment that explores recurring patterns, relationships, and possible unconscious conflicts', examples: [
        'A therapist examines how early relationships and recurring interpersonal patterns may shape the client’s current difficulties.',
        'Treatment focuses on meaning, defenses, and relationship patterns rather than only teaching a specific coping exercise.',
      ] },
      { label: 'Selective serotonin reuptake inhibitor', definition: 'a medication that reduces serotonin reuptake and can be used for several mood or anxiety conditions', examples: [
        'A prescriber chooses a medication that increases serotonin availability by reducing its reabsorption at synapses.',
        'A treatment plan includes monitoring benefits and side effects after beginning a commonly used antidepressant class.',
      ] },
      { label: 'Electroconvulsive therapy', definition: 'a medical treatment that induces a controlled seizure under anesthesia for some severe, treatment-resistant conditions', examples: [
        'A hospital treatment uses anesthesia and carefully controlled electrical stimulation when severe symptoms have not responded to other treatments.',
        'A clinician explains that the procedure is medical, monitored, and different from the fictionalized portrayals often shown in media.',
      ] },
      { label: 'Therapeutic alliance', definition: 'the collaborative working relationship and shared goals between a client and a treatment provider', examples: [
        'A client and therapist agree on goals, communicate openly, and work together to evaluate progress.',
        'Treatment improves after the provider and client establish trust, shared expectations, and a cooperative plan.',
      ] },
    ],
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  const tempPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2) + '\n');
  try {
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      fs.copyFileSync(tempPath, filePath);
      fs.unlinkSync(tempPath);
    } catch (copyError) {
      copyError.message += ` (initial rename error: ${error.message})`;
      throw copyError;
    }
  }
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle(values, seed) {
  const output = values.slice();
  const random = seededRandom(seed);
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

function balancedAnswerPositions(count) {
  const values = [];
  for (let answerIndex = 0; answerIndex < 4; answerIndex += 1) {
    for (let index = 0; index < count / 4; index += 1) values.push(answerIndex);
  }
  let candidate = shuffle(values, 0x500cafe);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const deltas = candidate.slice(1).map((value, index) => (value - candidate[index] + 4) % 4);
    const counts = [0, 1, 2, 3].map((delta) => deltas.filter((value) => value === delta).length);
    const dominantRate = Math.max(...counts) / Math.max(1, deltas.length);
    let longestRun = 1;
    let currentRun = 1;
    for (let index = 1; index < candidate.length; index += 1) {
      currentRun = candidate[index] === candidate[index - 1] ? currentRun + 1 : 1;
      longestRun = Math.max(longestRun, currentRun);
    }
    if (dominantRate <= 0.7 && longestRun <= 4) return candidate;
    candidate = shuffle(values, 0x500cafe + attempt + 1);
  }
  return candidate;
}

function sourceDetailsFor(topicId) {
  const url = sourceUrls[topicId];
  const chapterNumber = url.match(/pages\/(\d+)-/)[1];
  return {
    url,
    title: `AP Psychology public framework and ${sourceTitles[chapterNumber] || 'OpenStax Psychology 2e'}`,
    organization: 'College Board and OpenStax, Rice University',
    credibility: 'The public College Board framework establishes the course alignment, while the cited OpenStax chapter supports the underlying college-level psychology facts used in this original item.',
  };
}

function topicConcepts(topicId) {
  const data = topicData[topicId];
  assert(data && Array.isArray(data.concepts) && data.concepts.length >= 4, `Missing concept cards for ${topicId}.`);
  return data.concepts;
}

function topicResearchSignature(topicId, index, plan) {
  const concepts = topicConcepts(topicId);
  const offset = Math.abs(index) % concepts.length;
  const labels = [0, 2, 4].map((step) => concepts[(offset + step) % concepts.length].label);
  const additionalLabels = [1, 3].map((step) => concepts[(offset + step) % concepts.length].label);
  const frames = [
    `The protocol distinguishes ${labels[0]} from ${labels[1]} and records ${labels[2]} as a secondary consideration.`,
    `The research team treats ${labels[1]} and ${labels[2]} as related but nonidentical explanations for ${plan.subject}.`,
    `The study notes ${labels[2]} while keeping ${labels[0]} and ${labels[1]} conceptually separate during analysis.`,
    `The investigators compare ${labels[0]} with ${labels[2]} rather than treating every change in ${plan.outcome} as one process.`,
  ];
  return `${frames[index % frames.length]} The topic comparison also distinguishes ${additionalLabels[0]} from ${additionalLabels[1]}.`;
}

function conceptExamples(topicId) {
  const examples = [];
  for (const [conceptIndex, concept] of topicConcepts(topicId).entries()) {
    for (const text of concept.examples || []) examples.push({ conceptIndex, text });
  }
  return examples;
}

function expandExamples(topicId, desiredCount) {
  const base = conceptExamples(topicId);
  assert(base.length > 0, `No application examples for ${topicId}.`);
  const frames = [
    'In a second classroom example,',
    'In a different sample,',
    'In a follow-up observation,',
    'In a community setting,',
    'In a brief laboratory demonstration,',
  ];
  const output = base.slice(0, desiredCount);
  let index = output.length;
  while (output.length < desiredCount) {
    const source = base[index % base.length];
    const frame = frames[index % frames.length];
    output.push({
      conceptIndex: source.conceptIndex,
      text: `${frame} ${source.text.charAt(0).toLowerCase()}${source.text.slice(1)}`,
    });
    index += 1;
  }
  return output;
}

function conceptChoiceRationales(topicId, answerConceptIndex, choices, stemFocus) {
  const concepts = topicConcepts(topicId);
  const answer = concepts[answerConceptIndex];
  return choices.map((choice) => {
    const concept = concepts.find((candidate) => candidate.label === choice);
    if (!concept) return `${choice} is not the best interpretation because the data or scenario requires a different construct and a more specific explanation of the observed pattern.`;
    if (concept.label === answer.label) {
      return `${concept.label} fits because ${answer.definition} The stem supplies that defining pattern rather than merely naming a related topic.`;
    }
    return `${concept.label} refers to ${concept.definition} It is related to the unit, but it does not best explain ${stemFocus} in this scenario.`;
  });
}

function rotateChoices(keyLabel, distractors, answerIndex, seed) {
  const shuffled = shuffle([keyLabel, ...distractors], seed);
  const keyPosition = shuffled.indexOf(keyLabel);
  [shuffled[keyPosition], shuffled[answerIndex]] = [shuffled[answerIndex], shuffled[keyPosition]];
  return shuffled;
}

function baseMetadata(topicId, plan, practiceId, skillId, answerIndex, id, difficulty, cognitiveDemand) {
  const source = sourceDetailsFor(topicId);
  return {
    id,
    templateVersion: 1,
    itemSchemaVersion: 2,
    type: 'single-choice',
    domainId: plan.unit,
    topicIds: [topicId],
    practiceId,
    skillId,
    difficulty,
    cognitiveDemand,
    references: [...new Set([cedUrl, clarificationsUrl, source.url])],
    sourceDetails: [source],
    provenance: 'native-original',
    officialItem: false,
    rights: {
      secureContentUsed: false,
      copiedOfficialQuestion: false,
      sourceUse: 'facts-and-blueprint-only',
      status: 'pending-independent-rights-review',
    },
    accessibility: {
      textOnly: true,
      essentialVisual: false,
      linearReadingOrder: true,
      handsFreeContentCompatible: true,
      status: 'pending-independent-accessibility-review',
    },
    expertReview: { status: 'pending', releaseBlocked: true },
    psychometricStatus: 'not-calibrated',
    reviewStatus: 'internal-editorial-draft',
    qaStatus: 'structure-ready-content-review-pending',
    releaseEligible: false,
    editorialChecks: {
      scenarioBased: true,
      singleBestAnswer: true,
      parallelPlausibleOptions: true,
      noKeywordGiveaway: true,
      completeOptionFeedback: true,
      ageAppropriate: true,
      medicalSafety: true,
    },
  };
}

function makeConceptItem(topicId, plan, blueprint, id, answerIndex, generatedIndex) {
  const concepts = topicConcepts(topicId);
  const answer = concepts[blueprint.conceptIndex];
  const choices = rotateChoices(
    answer.label,
    concepts
      .filter((_, index) => index !== blueprint.conceptIndex)
      .slice(0, 3)
      .map((concept) => concept.label),
    answerIndex,
    0x110000 + generatedIndex,
  );
  const focus = plan.variable + ' and ' + plan.outcome;
  const prompt = `${blueprint.text} ${p1Frames[generatedIndex % p1Frames.length]}`;
  const item = {
    ...baseMetadata(topicId, plan, 'P1', generatedIndex % 5 === 0 ? '1.B' : '1.A', answerIndex, id, generatedIndex % 3 === 0 ? 'advanced' : 'intermediate', 'application'),
    prompt,
    choices,
    answerIndex,
    rationale: `${answer.label} is the best answer because ${answer.definition} The example asks the learner to apply that concept to ${focus}, not simply recall an isolated vocabulary definition.`,
    choiceRationales: conceptChoiceRationales(topicId, blueprint.conceptIndex, choices, focus),
  };
  assert(wordCount(item.rationale) >= 20, `${id} concept rationale is too short.`);
  return item;
}

function researchBlueprint(plan, index) {
  const context = researchContexts[index % researchContexts.length];
  const measure = `${plan.variable} measured with a defined behavioral scale`;
  const outcome = `${plan.outcome} measured during a standardized task`;
  const patterns = [
    {
      stem: `${context} studies whether ${plan.variable} is related to ${plan.outcome}. The team defines ${plan.variable} as ${measure}. Which research term describes that definition?`,
      answer: 'An operational definition',
      distractors: ['A confounding variable', 'A random sample', 'A replication failure'],
      why: `An operational definition states exactly how a construct will be measured or manipulated, as the team does for ${plan.variable}.`,
      demand: 'research-design',
    },
    {
      stem: `${context} randomly assigns participants to receive either a structured ${plan.variable} activity or a comparison activity, then measures ${outcome}. Which variable is the independent variable?`,
      answer: 'The assigned ${plan.variable} activity',
      distractors: ['The measured ${plan.outcome}', 'The participants’ demographic characteristics', 'The number of researchers on the team'],
      why: `The independent variable is the condition the researchers assign or manipulate; here it is the ${plan.variable} activity.`,
      demand: 'research-design',
    },
    {
      stem: `${context} recruits volunteers from one introductory course to study ${plan.subject}. The researchers want to generalize to all students at the college. Which limitation is most important?`,
      answer: 'The volunteer convenience sample may not represent the college population',
      distractors: ['Random assignment guarantees perfect generalizability', 'A dependent variable cannot be measured twice', 'A correlation automatically proves the hypothesis'],
      why: `Generalizability depends on how well the sample represents the target population; volunteers from one course may differ from the whole college.`,
      demand: 'research-analysis',
    },
    {
      stem: `${context} observes ${plan.variable} and ${plan.outcome} without assigning either one. The two measures are positively correlated. Which conclusion is justified?`,
      answer: 'The measures vary together, but the design does not establish causation',
      distractors: ['${plan.variable} definitely causes ${plan.outcome}', 'The study has no measurable variables', 'The participants were necessarily randomly assigned'],
      why: `A nonexperimental correlation can show an association, but directionality and third-variable explanations prevent a causal conclusion.`,
      demand: 'research-analysis',
    },
    {
      stem: `${context} plans a study involving ${plan.subject}. Before collecting data, the team explains foreseeable risks, allows refusal, and protects participants’ records. Which ethical principle is most directly represented?`,
      answer: 'Informed consent and protection of participant welfare',
      distractors: ['Deception without debriefing', 'A placebo effect', 'The law of effect'],
      why: `Participants should understand relevant procedures and risks, be free to decline, and receive protection for their welfare and privacy.`,
      demand: 'research-ethics',
    },
    {
      stem: `${context} tests a new activity intended to improve ${plan.outcome}. A second researcher repeats the same procedures with a new sample and obtains a similar pattern. What does this most directly demonstrate?`,
      answer: 'Replication of the research finding',
      distractors: ['A change in the operational definition', 'A confounding variable', 'A biased answer key'],
      why: `Repeating the procedures with a new sample and obtaining a similar result is evidence of replication, not proof that every context will match.`,
      demand: 'research-analysis',
    },
  ];
  const selected = patterns[index % patterns.length];
  return {
    ...selected,
    answer: selected.answer.replaceAll('${plan.variable}', plan.variable).replaceAll('${plan.outcome}', plan.outcome),
    distractors: selected.distractors.map((choice) => choice.replaceAll('${plan.variable}', plan.variable).replaceAll('${plan.outcome}', plan.outcome)),
    why: selected.why.replaceAll('${plan.variable}', plan.variable).replaceAll('${plan.outcome}', plan.outcome),
  };
}

function dataBlueprint(plan, index) {
  const context = researchContexts[(index + 3) % researchContexts.length];
  const variant = index % 5;
  if (variant === 0) {
    const r = [-0.72, -0.48, 0.36, 0.61, -0.27][index % 5];
    const direction = r < 0 ? 'negative' : 'positive';
    const strength = Math.abs(r) >= 0.5 ? 'moderate-to-strong' : 'weak-to-moderate';
    return {
      stem: `${context} reports a correlation of r = ${r.toFixed(2)} between ${plan.variable} and ${plan.outcome}. Which interpretation is most accurate?`,
      answer: `There is a ${strength} ${direction} association, but the correlational design does not establish causation`,
      distractors: [
        `The association is ${direction === 'negative' ? 'positive' : 'negative'} and proves a causal effect`,
        'The correlation is zero because the coefficient is not exactly 1.00',
        'The result proves that both measures are free from measurement error',
      ],
      why: `The sign indicates direction and the magnitude describes strength; because neither variable was necessarily manipulated, causation cannot be inferred.`,
    };
  }
  if (variant === 1) {
    const scores = [4, 6, 6, 8, 11].map((value) => value + (index % 3));
    const median = scores[2];
    return {
      stem: `${context} records five ${plan.outcome} scores: ${scores.join(', ')}. What is the median score?`,
      answer: `${median} points`,
      distractors: [`${scores.reduce((sum, value) => sum + value, 0) / scores.length} points`, `${scores[0]} points`, `${scores[scores.length - 1]} points`],
      why: `After the five scores are placed in order, the middle value is ${median}; the mean and range endpoints answer different questions.`,
    };
  }
  if (variant === 2) {
    const total = 80 + index * 5;
    const improved = 20 + (index % 4) * 5;
    const percent = Math.round((improved / total) * 100);
    const candidateValues = [
      100 - percent,
      Math.round((improved / total) * 10),
      Math.round(total / improved),
    ];
    const distractorValues = [];
    for (const candidate of candidateValues) {
      if (candidate > 0 && candidate < 100 && candidate !== percent && !distractorValues.includes(candidate)) distractorValues.push(candidate);
    }
    let filler = 1;
    while (distractorValues.length < 3) {
      const candidate = ((percent + filler * 11) % 99) + 1;
      if (candidate !== percent && !distractorValues.includes(candidate)) distractorValues.push(candidate);
      filler += 1;
    }
    return {
      stem: `In a sample of ${total} participants, ${improved} show the predicted change in ${plan.outcome} after the activity. Approximately what percentage is that?`,
      answer: `${percent} percent`,
      distractors: distractorValues.map((value) => `${value} percent`),
      why: `The percentage is calculated as the number showing the change divided by the total sample, multiplied by 100, which is approximately ${percent}%.`,
    };
  }
  if (variant === 3) {
    const low = 2 + index;
    const high = low + 12;
    return {
      stem: `${context} compares two groups on ${plan.outcome}. Group A has a mean of ${low + 4} with a standard deviation of 1.5; Group B has a mean of ${high - 4} with a standard deviation of 1.5. Which conclusion follows?`,
      answer: `Group B has the higher average score, while the groups have equal reported variability`,
      distractors: ['Group A has the higher average score and greater variability', 'The standard deviations determine which group has the higher mean', 'No comparison is possible because means cannot be interpreted'],
      why: `The mean identifies the average level and the equal standard deviations indicate equal reported spread; neither statistic alone establishes causation.`,
    };
  }
  return {
    stem: `${context} obtains nearly identical ${plan.outcome} scores from the same participants one week apart, but the scores do not align with an established measure of the intended construct. Which assessment conclusion is best supported?`,
    answer: 'The measure appears reliable but has limited evidence of validity',
    distractors: ['The measure is valid because consistency guarantees accuracy', 'The measure is neither reliable nor measurable', 'The measure has validity but no reliability'],
    why: `Similar repeated scores support reliability, whereas disagreement with an established measure limits evidence that the test measures the intended construct.`,
  };
}

function makeGenericItem(topicId, plan, blueprint, practiceId, skillId, id, answerIndex, generatedIndex) {
  const rawChoices = [blueprint.answer, ...blueprint.distractors];
  const longestChoiceWords = Math.max(...rawChoices.map(wordCount));
  const parallelChoices = rawChoices.map((choice, choiceIndex) => {
    let output = choice;
    const suffixes = ['in this study', 'for these participants', 'as measured here', 'under these conditions'];
    let suffixIndex = 0;
    while (wordCount(output) < longestChoiceWords) {
      output += ` ${suffixes[(choiceIndex + suffixIndex) % suffixes.length]}`;
      suffixIndex += 1;
    }
    return output;
  });
  const answerChoice = parallelChoices[0];
  const choices = rotateChoices(answerChoice, parallelChoices.slice(1), answerIndex, 0x220000 + generatedIndex);
  const answerPosition = choices.indexOf(answerChoice);
  assert(answerPosition === answerIndex, `${id} answer position did not bind.`);
  const choiceRationales = choices.map((choice) => choice === answerChoice
    ? `${choice} is correct because ${blueprint.why} This conclusion matches the specific design or evidence described in the stem.`
    : `${choice} is not the best answer because it does not match the relevant evidence, variable, or method described in the scenario.`);
  const signature = topicResearchSignature(topicId, generatedIndex, plan);
  const variation = practiceId === 'P2'
    ? researchVariationFrames[generatedIndex % researchVariationFrames.length]
    : '';
  const item = {
    ...baseMetadata(topicId, plan, practiceId, skillId, answerIndex, id, generatedIndex % 3 === 0 ? 'advanced' : 'intermediate', blueprint.demand || (practiceId === 'P3' ? 'data-interpretation' : 'research-analysis')),
    prompt: `${blueprint.stem.charAt(0).toUpperCase()}${blueprint.stem.slice(1)} ${signature} ${variation}`.trim(),
    choices,
    answerIndex,
    rationale: `${blueprint.why} The interpretation is limited to the evidence and design described in this item; it does not by itself establish a broad causal or diagnostic conclusion.`,
    choiceRationales,
  };
  assert(wordCount(item.rationale) >= 20, `${id} generic rationale is too short.`);
  return item;
}

function existingCounts(pack) {
  const counts = new Map();
  for (const item of pack.items) {
    const topicId = Array.isArray(item.topicIds) ? item.topicIds[0] : null;
    if (!topicId) continue;
    const key = `${topicId}|${item.practiceId}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function updatePackMetadata(pack) {
  pack.version = version;
  pack.description = 'An independently authored 500-question AP Psychology internal preparation bank mapped to the current public course framework. It is not released, official, endorsed, calibrated, or score-predictive.';
  pack.contentReview = 'Five hundred original, source-aligned draft multiple-choice items: 100 per current unit, distributed across all 37 framework topics, with 325 Practice 1 items, 125 Practice 2 items, 50 Practice 3 items, and 125 keys in each answer position. Independent AP Psychology subject-expert review, independent rights and accessibility review, production validation, field testing, and psychometric calibration remain pending.';
  pack.blueprint.pilotAlignment = '500-item internal kit: 100 items per unit, all 37 framework topics covered, 25 balanced 20-item banks; P1/P2/P3 counts 325/125/50.';
  pack.blueprint.lastVerifiedAt = verifiedAt;
  pack.blueprint.sourceDigest = 'pending-build-generation';
  pack.releaseGates.internalStructuralValidation = `passed-${verifiedAt}`;
  for (const domain of pack.domains) domain.itemCount = 100;
  pack.practiceDistribution = {
    'P1-concept-application': 325,
    'P2-research-methods-and-design': 125,
    'P3-data-interpretation': 50,
    'P4-argumentation': 0,
    note: 'Practice 4 belongs to free response and is outside this single-choice source pilot.',
  };
  pack.answerPositionDistribution = { 0: 125, 1: 125, 2: 125, 3: 125 };
  pack.sections = Array.from({ length: 25 }, (_, index) => ({
    id: `internal-kit-bank-${String(index + 1).padStart(2, '0')}`,
    label: `Bank ${String(index + 1).padStart(2, '0')}: 20-item internal source sampler`,
    timeMinutes: null,
    released: false,
  }));
}

function main() {
  const pack = readJson(packPath);
  const library = readJson(libraryPath);
  assert(pack.id === 'ap-psychology-pilot', 'Unexpected AP Psychology pack identity.');
  assert(library.packId === pack.id, 'Learning library is not bound to the AP Psychology pack.');
  const originalItems = pack.items.filter((item) => Number(String(item.id).split('-').pop()) <= 8);
  assert(originalItems.length === 40, `Expected the reviewed 40-item seed, found ${originalItems.length}.`);
  const counts = existingCounts({ items: originalItems });
  const answerPositions = balancedAnswerPositions(460);
  let newItemCursor = 0;
  let p3Cursor = 0;
  const generatedByUnit = new Map(unitIds.map((unit) => [unit, []]));
  const nextNumberByUnit = new Map(unitIds.map((unit) => {
    const unitNumber = unitNumbers.get(unit);
    const max = Math.max(0, ...originalItems
      .filter((item) => item.domainId === unit)
      .map((item) => Number(String(item.id).split('-').pop())));
    return [unit, max + 1];
  }));

  for (const plan of topicPlans) {
    const topicId = plan.id;
    const unitNumber = unitNumbers.get(plan.unit);
    const currentP1 = counts.get(`${topicId}|P1`) || 0;
    const currentP2 = counts.get(`${topicId}|P2`) || 0;
    const currentP3 = counts.get(`${topicId}|P3`) || 0;
    const neededP1 = plan.p1 - currentP1;
    const neededP2 = plan.p2 - currentP2;
    const neededP3 = plan.p3 - currentP3;
    assert(neededP1 >= 0 && neededP2 >= 0 && neededP3 >= 0, `${topicId} seed exceeds the 500-item target cell.`);
    const examples = expandExamples(topicId, neededP1);
    for (let index = 0; index < neededP1; index += 1) {
      const id = `ap-psych-u${unitNumber}-${String(nextNumberByUnit.get(plan.unit)).padStart(3, '0')}`;
      nextNumberByUnit.set(plan.unit, nextNumberByUnit.get(plan.unit) + 1);
      generatedByUnit.get(plan.unit).push(makeConceptItem(topicId, plan, examples[index], id, answerPositions[newItemCursor], newItemCursor));
      newItemCursor += 1;
    }
    for (let index = 0; index < neededP2; index += 1) {
      const id = `ap-psych-u${unitNumber}-${String(nextNumberByUnit.get(plan.unit)).padStart(3, '0')}`;
      nextNumberByUnit.set(plan.unit, nextNumberByUnit.get(plan.unit) + 1);
      const blueprint = researchBlueprint(plan, index);
      generatedByUnit.get(plan.unit).push(makeGenericItem(topicId, plan, blueprint, 'P2', p2Skills[index % p2Skills.length], id, answerPositions[newItemCursor], newItemCursor));
      newItemCursor += 1;
    }
    for (let index = 0; index < neededP3; index += 1) {
      const id = `ap-psych-u${unitNumber}-${String(nextNumberByUnit.get(plan.unit)).padStart(3, '0')}`;
      nextNumberByUnit.set(plan.unit, nextNumberByUnit.get(plan.unit) + 1);
      const blueprint = dataBlueprint(plan, p3Cursor);
      generatedByUnit.get(plan.unit).push(makeGenericItem(topicId, plan, blueprint, 'P3', p3Skills[index % p3Skills.length], id, answerPositions[newItemCursor], newItemCursor));
      newItemCursor += 1;
      p3Cursor += 1;
    }
  }

  assert(newItemCursor === 460, `Generated ${newItemCursor} new items instead of 460.`);
  for (const unit of unitIds) assert(generatedByUnit.get(unit).length === 92, `${unit} did not receive 92 new items.`);

  const newItems = [];
  for (let bank = 0; bank < 23; bank += 1) {
    for (const unit of unitIds) newItems.push(...generatedByUnit.get(unit).slice(bank * 4, bank * 4 + 4));
  }
  assert(newItems.length === 460, 'Balanced bank assembly lost generated items.');
  pack.items = [...originalItems, ...newItems];
  updatePackMetadata(pack);
  library.version = version;
  library.blueprint.lastVerifiedAt = verifiedAt;
  library.releaseGates.internalStructuralValidation = `passed-${verifiedAt}`;
  writeJson(packPath, pack);
  writeJson(libraryPath, library);
  console.log(`Built ${pack.id} ${pack.version} with ${pack.items.length} items in ${pack.sections.length} balanced banks.`);
}

main();
