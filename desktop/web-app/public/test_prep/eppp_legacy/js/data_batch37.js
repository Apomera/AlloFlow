/* PasstheEPPP — Question Batch 37 (Domains 1-4, ~40 questions) */
(function(){
if(typeof EPPPData==='undefined')return;

const batch37 = {
    1: [
        {
            q: "Which of the following medications is a dopamine partial agonist and is often favored for its lower risk of metabolic syndrome and hyperprolactinemia compared to other atypical antipsychotics?",
            options: [
                "Risperidone (Risperdal)",
                "Aripiprazole (Abilify)",
                "Clozapine (Clozaril)",
                "Haloperidol (Haldol)"
            ],
            correct: 1,
            rationale: "Aripiprazole (Abilify) is unique among atypical (second-generation) antipsychotics because it functions as a partial agonist at D2 and 5-HT1A receptors, rather than a pure antagonist. This mechanism often leads to a more favorable side-effect profile, particularly regarding weight gain, metabolic syndrome, and prolactin elevation.\n\nWhy others are wrong:\n• Risperidone (Risperdal) is a D2/5-HT2A antagonist known for a high risk of hyperprolactinemia (elevated prolactin levels) and moderate risk of metabolic syndrome.\n• Clozapine (Clozaril) is highly effective for treatment-resistant schizophrenia but has a very high risk of metabolic syndrome, weight gain, and agranulocytosis (requiring blood monitoring).\n• Haloperidol (Haldol) is a typical (first-generation) antipsychotic that acts as a strong D2 antagonist and carries a high risk of extrapyramidal symptoms (EPS) and tardive dyskinesia, not metabolic syndrome."
        },
        {
            q: "A patient presents with visual agnosia, the inability to recognize objects by sight despite intact basic visual acuity. Which brain region is most likely damaged?",
            options: [
                "The dorsal stream extending to the parietal lobe",
                "The ventral stream extending to the temporal lobe",
                "The prefrontal cortex",
                "The primary visual cortex (V1) in the occipital lobe"
            ],
            correct: 1,
            rationale: "Visual agnosia typically results from damage to the ventral stream (the 'what' pathway), which projects from the primary visual cortex in the occipital lobe to the inferior temporal lobe. This pathway is responsible for object recognition and form representation.\n\nWhy others are wrong:\n• The dorsal stream to the parietal lobe (the 'where' pathway) processes spatial location and motion. Damage here causes issues like optic ataxia or simultanagnosia (Balint's syndrome).\n• Prefrontal cortex damage affects executive functioning, working memory, and inhibition, not basic object recognition.\n• Primary visual cortex (V1) damage causes cortical blindness (e.g., a scotoma or hemianopia), leading to a loss of basic vision rather than a failure to recognize objects that are seen."
        },
        {
            q: "Which neurotransmitter is most directly implicated in the pathology of Alzheimer's disease, particularly concerning early memory loss, leading to the use of cholinesterase inhibitors as a primary treatment?",
            options: [
                "Dopamine",
                "Acetylcholine",
                "Glutamate",
                "GABA"
            ],
            correct: 1,
            rationale: "Acetylcholine (ACh) is crucial for learning and memory. The cholinergic hypothesis of Alzheimer's disease posits that degeneration of cholinergic neurons in the basal forebrain significantly contributes to the cognitive decline in AD. Cholinesterase inhibitors (like donepezil, rivastigmine) work by preventing the breakdown of ACh, prolonging its action in the synapse.\n\nWhy others are wrong:\n• Dopamine is primarily implicated in Parkinson's disease (due to loss in the substantia nigra) and schizophrenia, not primarily early Alzheimer's memory deficits.\n• Glutamate is involved in AD (excitotoxicity), and memantine (an NMDA receptor antagonist) is used for moderate-to-severe AD, but ACh is the primary target for early memory loss and the focus of cholinesterase inhibitors.\n• GABA is the main inhibitory neurotransmitter, implicated in anxiety and sleep disorders, but not the primary driver of early AD memory loss."
        },
        {
            q: "Damage to the hippocampus would most likely produce which of the following deficits?",
            options: [
                "Inability to form new declarative (explicit) memories",
                "Loss of previously acquired motor skills (implicit memories)",
                "Inability to recall events from childhood",
                "Loss of speech production abilities"
            ],
            correct: 0,
            rationale: "The hippocampus is essential for consolidating short-term memory into long-term declarative (explicit) memories. Damage results in anterograde amnesia—the inability to form new semantic and episodic memories after the injury (as seen in the famous case of H.M.).\n\nWhy others are wrong:\n• Motor skills and procedural memories (implicit memories) rely more on the basal ganglia, cerebellum, and motor cortex, and are typically spared in hippocampal damage.\n• Remote childhood memories are mostly stored in the neocortex and are generally preserved (only temporally graded retrograde amnesia usually occurs, affecting memories closer to the time of injury).\n• Speech production relies on Broca's area in the left frontal lobe, not the hippocampus."
        },
        {
            q: "The 'gate control theory' of pain proposes that:",
            options: [
                "Pain is purely psychological and gate pathways in the brain ignore false pain signals.",
                "Non-painful input closes the 'gates' to painful input, preventing pain sensation from traveling to the central nervous system.",
                "Pain intensity is directly proportional to the amount of tissue damage.",
                "The thalamus acts as a primary gate that completely blocking severe pain during emergencies."
            ],
            correct: 1,
            rationale: "Melzack and Wall's Gate Control Theory suggests that a 'gate' mechanism in the dorsal horn of the spinal cord controls the transmission of pain signals to the brain. Activation of large-diameter sensory fibers (by touch, rubbing, or non-painful stimulation) can 'close' the gate, inhibiting the transmission of pain signals carried by small-diameter fibers.\n\nWhy others are wrong:\n• The theory does not claim pain is purely psychological, though it acknowledges psychological factors (e.g., attention, emotion) can descend from the brain to influence the gate.\n• Saying pain intensity is purely proportional to tissue damage reflects earlier, inaccurate specificity theories (which Gate Control Theory largely replaced).\n• While descending pathways from the brain can influence the gate, the primary physiological 'gate' is located in the spinal cord, not the thalamus."
        },
        {
            q: "A patient taking a monoamine oxidase inhibitor (MAOI) for depression consumes aged cheese and red wine. They suddenly experience a severe throbbing headache, stiff neck, nausea, and dangerously high blood pressure. This reaction is caused by an accumulation of:",
            options: [
                "Serotonin",
                "Dopamine",
                "Tyramine",
                "Glutamate"
            ],
            correct: 2,
            rationale: "This describes a hypertensive crisis, a potentially fatal side effect of MAOIs when taken with foods high in tyramine. MAO in the gut normally breaks down dietary tyramine. When this enzyme is inhibited, tyramine enters the bloodstream and causes a massive release of norepinephrine, leading to severe vasoconstriction and hypertension.\n\nWhy others are wrong:\n• Serotonin accumulation causes Serotonin Syndrome (altered mental status, autonomic instability, neuromuscular abnormalities), usually caused by combining multiple serotonergic drugs, not diet.\n• Dopamine accumulation is not the direct physiological cause of the MAOI hypertensive crisis.\n• Glutamate is an excitatory neurotransmitter unrelated to the specific dietary restriction mechanism of MAOIs."
        },
        {
            q: "During action potential propagation, the repolarization phase of the neuronal membrane is primarily caused by:",
            options: [
                "The influx of sodium (Na+) ions",
                "The efflux (outflow) of potassium (K+) ions",
                "The influx of calcium (Ca2+) ions",
                "The operation of the sodium-potassium pump"
            ],
            correct: 1,
            rationale: "During an action potential, depolarization is caused by an influx of Na+ ions. Repolarization (the return toward the resting negative potential) occurs when sodium channels close and voltage-gated potassium channels open, allowing K+ ions to rush out (efflux) of the cell, carrying positive charge away.\n\nWhy others are wrong:\n• Influx of sodium (Na+) causes the initial depolarization (the rising phase of the action potential).\n• Influx of calcium occurs at the axon terminal and triggers the release of neurotransmitter vesicles into the synaptic cleft, not the primary repolarization of the axon.\n• The sodium-potassium pump restores the exact ionic balance over time after the action potential is over; it does not drive the rapid repolarization phase itself."
        },
        {
            q: "Broca's aphasia is characterized by:",
            options: [
                "Fluent, grammatical speech that lacks meaning ('word salad')",
                "Inability to understand spoken language",
                "Non-fluent, effortful, ungrammatical speech with relatively intact comprehension",
                "Loss of the ability to read while writing remains intact"
            ],
            correct: 2,
            rationale: "Broca's aphasia (expressive aphasia), caused by damage to the left frontal lobe, results in non-fluent, halting, agrammatic speech (often omitting function words like 'the' and 'is'). However, patient comprehension of simple statements is usually relatively well preserved.\n\nWhy others are wrong:\n• Fluent speech lacking meaning describes Wernicke's aphasia (receptive aphasia), caused by damage to the left posterior temporal lobe.\n• Inability to understand language is the hallmark of Wernicke's aphasia, whereas Broca's patients usually understand basic language.\n• Loss of reading with intact writing is alexia without agraphia, a rare syndrome usually caused by a stroke affecting the left occipital lobe and splenium of the corpus callosum."
        },
        {
            q: "Which neuroimaging technique provides the most detailed structural images of the brain using magnetic fields and radio waves, without exposing the patient to ionizing radiation?",
            options: [
                "CT scan (Computed Tomography)",
                "PET scan (Positron Emission Tomography)",
                "MRI (Magnetic Resonance Imaging)",
                "fMRI (Functional MRI)"
            ],
            correct: 2,
            rationale: "Structural MRI uses strong magnetic fields and radio waves to create highly detailed, high-resolution anatomical images of the brain without using ionizing radiation (X-rays).\n\nWhy others are wrong:\n• CT scans use X-rays (ionizing radiation) and provide lower resolution images for soft tissue compared to MRI, though they are faster and better for detecting fresh bleeding.\n• PET scans use radioactive tracers injected into the bloodstream to measure brain metabolism or receptor binding (functional, not purely structural imaging).\n• fMRI measures blood oxygenation level dependent (BOLD) signals to track brain activity over time; while it uses the same machine as MRI, it is a functional measure rather than a purely structural one."
        },
        {
            q: "The somatic nervous system is a component of the:",
            options: [
                "Central nervous system",
                "Autonomic nervous system",
                "Peripheral nervous system",
                "Parasympathetic nervous system"
            ],
            correct: 2,
            rationale: "The peripheral nervous system (PNS) is divided into the somatic nervous system (which controls voluntary movements and sensory information from the skin/muscles) and the autonomic nervous system (which controls involuntary internal organs).\n\nWhy others are wrong:\n• The central nervous system consists of only the brain and spinal cord.\n• The autonomic nervous system is the other branch of the PNS, operating independently of the somatic nervous system.\n• The parasympathetic nervous system is a subdivision of the autonomic nervous system."
        }
    ],
    2: [
        {
            q: "In classical conditioning, the phenomenon in which a conditioned response is elicited by stimuli that are similar but not identical to the original conditioned stimulus is known as:",
            options: [
                "Spontaneous recovery",
                "Stimulus discrimination",
                "Stimulus generalization",
                "Higher-order conditioning"
            ],
            correct: 2,
            rationale: "Stimulus generalization occurs when an organism responds to stimuli that are similar to the original Conditioned Stimulus (CS). For example, Little Albert was conditioned to fear a white rat, but generalized that fear to other furry white objects like a rabbit or a Santa beard.\n\nWhy others are wrong:\n• Spontaneous recovery refers to the reappearance of an extinguished conditioned response after a rest period.\n• Stimulus discrimination is the opposite—learning to respond only to the specific CS and not to other similar stimuli.\n• Higher-order conditioning involves pairing a new neutral stimulus with the established CS, creating a second (usually weaker) CS."
        },
        {
            q: "According to Bandura's Social Learning Theory, the four steps required for observational learning to occur are:",
            options: [
                "Attention, retention, reproduction, and motivation",
                "Encoding, storage, retrieval, and rehearsal",
                "Conditioning, shaping, fading, and chaining",
                "Id, ego, superego, and environment"
            ],
            correct: 0,
            rationale: "Bandura identified four cognitive and behavioral processes necessary for observational learning (modeling): Attention (noticing the behavior), Retention (remembering it), Reproduction (having the physical/cognitive ability to execute it), and Motivation (having a reason or incentive to perform it).\n\nWhy others are wrong:\n• Encoding, storage, retrieval, and rehearsal are stages of the information processing model of memory.\n• Conditioning, shaping, fading, and chaining are operant conditioning techniques.\n• Id, ego, and superego relate to Freudian psychoanalytic theory."
        },
        {
            q: "Tversky and Kahneman showed that people often estimate the probability of an event happening based on how easily examples of that event come to mind. This is known as:",
            options: [
                "The representativeness heuristic",
                "The availability heuristic",
                "Anchoring and adjustment",
                "Confirmation bias"
            ],
            correct: 1,
            rationale: "The availability heuristic is a mental shortcut where judgments of frequency or probability are based on how easily instances can be retrieved from memory. Because plane crashes are highly publicized, people often overestimate their frequency and fear flying more than driving, despite driving being statistically more dangerous.\n\nWhy others are wrong:\n• The representativeness heuristic involves judging the likelihood of something belonging to a category based on how closely it matches a typical prototype of that category.\n• Anchoring and adjustment involves relying too heavily on an initial piece of information (the 'anchor') and insufficiently adjusting from it.\n• Confirmation bias is the tendency to seek out, interpret, and remember information that confirms one's pre-existing beliefs."
        },
        {
            q: "According to the fundamental attribution error, when making judgments about another person's behavior, observers tend to:",
            options: [
                "Overestimate situational factors and underestimate dispositional factors",
                "Overestimate dispositional factors and underestimate situational factors",
                "Attribute the person's success to situation and failure to disposition",
                "Evaluate people from their own in-group more positively"
            ],
            correct: 1,
            rationale: "The fundamental attribution error is the pervasive tendency for observers to underestimate the impact of situational (external) influences and overestimate the impact of dispositional (internal/personality) factors when explaining the behavior of others. (E.g., assuming someone cut you off because they are a jerk, rather than because they are rushing to the hospital).\n\nWhy others are wrong:\n• Overestimating situational factors while underestimating disposition describes what people often do for their OWN behavior (part of the actor-observer bias).\n• Attributing success to disposition and failure to situation describes the self-serving bias, which applies to evaluating oneself.\n• Evaluating your in-group more positively describes in-group favoritism/bias, not attribution theory specifically."
        },
        {
            q: "A person with anterograde amnesia would have the greatest difficulty with which of the following tasks?",
            options: [
                "Riding a bicycle they learned to ride years ago",
                "Remembering the name of their first grade teacher",
                "Learning the layout of a hospital they moved into after their injury",
                "Tying their shoelaces"
            ],
            correct: 2,
            rationale: "Anterograde amnesia is the inability to form new declarative/explicit memories after the brain injury or event that caused the amnesia. Therefore, learning new spatial layouts, names of new people, or daily events post-injury is extremely impaired.\n\nWhy others are wrong:\n• Old motor skills (bicycle riding, shoelace tying) are implicit/procedural memories and are famously preserved in standard amnesic patients.\n• Remembering a childhood teacher relies on retrograde memory (memories formed before the injury), which is largely intact in pure anterograde amnesia."
        },
        {
            q: "In operant conditioning, a 'variable-ratio' schedule of reinforcement typically produces:",
            options: [
                "A low, steady rate of responding",
                "A scalloped response pattern with a pause after reinforcement",
                "A high, steady rate of responding with little to no pause after reinforcement",
                "Rapid extinction of the behavior"
            ],
            correct: 2,
            rationale: "A variable-ratio (VR) schedule provides reinforcement after an unpredictable number of responses (e.g., slot machines). This produces the highest, most steady rate of responding among the four basic schedules and is highly resistant to extinction, as you never know exactly when the next payoff will happen.\n\nWhy others are wrong:\n• A low, steady rate is more characteristic of a variable-interval (VI) schedule.\n• A scalloped pattern (pause after reinforcement then increasing rate) is the hallmark of a fixed-interval (FI) schedule.\n• Variable-ratio schedules are highly resistant to extinction, whereas continuous reinforcement (CRF) leads to rapid extinction when reinforcement stops."
        },
        {
            q: "Ebbinghaus's famous 'forgetting curve' demonstrated that:",
            options: [
                "Forgetting proceeds at a constant, linear rate over time.",
                "Most forgetting occurs very rapidly immediately after learning, then levels off.",
                "Forgetting only occurs if interference is introduced.",
                "Meaningful material is forgotten faster than nonsense syllables."
            ],
            correct: 1,
            rationale: "Ebbinghaus used nonsense syllables to study memory. His forgetting curve showed that a massive amount of information is forgotten very quickly (within the first hour or day), but the rate of forgetting then slows down significantly, leaving a baseline amount of retained information over time.\n\nWhy others are wrong:\n• Forgetting is a logarithmic/exponential decay curve, not a linear, constant rate.\n• Interference (proactive/retroactive) contributes to forgetting, but Ebbinghaus found decay occurred simply over time without intentionally introduced interference.\n• Ebbinghaus found (and modern research confirms) that meaningful material is retained much better and longer than nonsense syllables."
        },
        {
            q: "Which theory of emotion posits that physiological arousal and the cognitive interpretation (labeling) of that arousal must occur simultaneously for an emotion to be experienced?",
            options: [
                "James-Lange theory",
                "Cannon-Bard theory",
                "Schachter-Singer Two-Factor theory",
                "Cognitive Appraisal theory (Lazarus)"
            ],
            correct: 2,
            rationale: "The Schachter-Singer Two-Factor Theory argues that emotion requires two components: physiological arousal and a cognitive label applied to that arousal based on environmental cues. Without the cognitive interpretation of the arousal, no specific emotion is strongly experienced.\n\nWhy others are wrong:\n• James-Lange posits that emotion is directly caused by the perception of physiological changes (arousal leads to emotion: 'I am afraid because I am shaking').\n• Cannon-Bard argues that a stimulus simultaneously triggers both physiological arousal and the subjective experience of emotion, independently of each other.\n• Lazarus's Cognitive Appraisal theory emphasizes that the cognitive appraisal of a stimulus comes first and determines if there will be physiological arousal and emotion at all."
        },
        {
            q: "The phenomenon where later learning impairs the recall of previously learned information is called:",
            options: [
                "Proactive interference",
                "Retroactive interference",
                "Decay",
                "Repression"
            ],
            correct: 1,
            rationale: "Retroactive interference occurs when new learning works backward to disrupt the retrieval of older, previously learned information (e.g., studying French this week makes it harder to remember the Spanish you studied last week).\n\nWhy others are wrong:\n• Proactive interference is the opposite: old learning interferes with recalling new information (e.g., writing last year's date on a new check).\n• Decay is forgetting simply due to the passage of time without rehearsal.\n• Repression is a psychoanalytic defense mechanism involving the unconscious blocking of traumatic memories."
        },
        {
            q: "According to Yerkes-Dodson law, optimal performance on a highly complex or difficult task is usually achieved when physiological arousal is:",
            options: [
                "Very low",
                "Moderate to moderately low",
                "Very high",
                "Fluctuating rapidly"
            ],
            correct: 1,
            rationale: "The Yerkes-Dodson law forms an inverted-U curve representing the relationship between arousal and performance. For simple, well-learned tasks, a relatively high level of arousal is optimal. But for complex, novel, or difficult cognitive tasks, a lower level of arousal is optimal because high arousal creates distracting anxiety and cognitive overload.\n\nWhy others are wrong:\n• Very low arousal generally results in poor performance (boredom, inattention) across all task types.\n• Very high arousal (panic/stress) severely impairs complex task performance.\n• Rapidly fluctuating arousal impairs sustained attention and focus."
        }
    ],
    3: [
        {
            q: "According to Festinger's cognitive dissonance theory, people are most likely to change their attitudes when they:",
            options: [
                "Are paid a very large amount of money to act contrary to their beliefs",
                "Engage in behavior contrary to their beliefs with insufficient external justification",
                "Observe a high-status role model expressing a different attitude",
                "Are provided with logical, evidence-based arguments"
            ],
            correct: 1,
            rationale: "Festinger's classic $1 vs $20 experiment showed that people who were paid $1 (insufficient justification) to lie about a boring task experienced cognitive dissonance. To resolve this internal discomfort, they changed their internal attitude to believe the task was actually interesting. Those paid $20 had sufficient external justification for the lie and did not change their attitude.\n\nWhy others are wrong:\n• Being paid a large amount provides significant external justification, so the person doesn't need to change their internal attitude to resolve dissonance.\n• Observing a role model relates to social learning, not the internal conflict of dissonance.\n• Logical arguments relate to the central route of persuasion (Elaboration Likelihood Model), not the specific motivation aroused by cognitive dissonance."
        },
        {
            q: "In social psychology, 'social loafing' is defined as:",
            options: [
                "The tendency for individuals to work less hard in a group than they would when working individually",
                "The decline in individual performance when observed by a crowd",
                "The tendency for groups to make riskier decisions than individuals",
                "The loss of personal identity in a large crowd"
            ],
            correct: 0,
            rationale: "Social loafing (the Ringelmann effect) occurs when individuals exert less effort when pooling their efforts toward a common goal compared to when they are individually accountable. It is more common in large groups and when individual contributions cannot be easily measured.\n\nWhy others are wrong:\n• A decline in performance due to audience presence is social inhibition (the opposite is social facilitation, where audience improves performance on easy tasks).\n• Groups making riskier decisions is 'risky shift' (a type of group polarization).\n• Loss of personal identity in a crowd is deindividuation, which often leads to disinhibited behavior."
        },
        {
            q: "A leader who focuses on clarifying roles, setting goals, providing contingent rewards, and tracking deviations from rules is utilizing which leadership style?",
            options: [
                "Transformational leadership",
                "Laissez-faire leadership",
                "Transactional leadership",
                "Charismatic leadership"
            ],
            correct: 2,
            rationale: "Transactional leadership (Bass) focuses on the basic transaction between leader and follower: exchanging rewards for performance (contingent reward) and taking corrective action when rules are broken (management by exception). It aims to maintain the status quo and ensure tasks are completed.\n\nWhy others are wrong:\n• Transformational leadership inspires followers to exceed expectations through idealized influence, inspirational motivation, intellectual stimulation, and individualized consideration.\n• Laissez-faire leadership is a 'hands-off' approach where the leader provides very little guidance, direction, or feedback.\n• Charismatic leadership relies heavily on the leader's personality and charm to inspire followers, a concept closely overlapping with Transformational but distinct from Transactional."
        },
        {
            q: "The 'bystander effect' (Latane and Darley) demonstrated that a witness to an emergency is less likely to intervene when there are many other witnesses present. The primary psychological mechanism explaining this is:",
            options: [
                "Diffusion of responsibility",
                "Deindividuation",
                "Group polarization",
                "Hostile attribution bias"
            ],
            correct: 0,
            rationale: "Diffusion of responsibility occurs when multiple bystanders are present; each individual feels less personal obligation to help because they assume someone else has already acted or will act. This significantly reduces helping behavior as group size increases.\n\nWhy others are wrong:\n• Deindividuation involves loss of self-awareness in groups, often leading to anti-social behavior (like riots), but it is not the primary mechanism of the bystander effect.\n• Group polarization is the tendency for group discussions to make individual attitudes more extreme.\n• Hostile attribution bias is the tendency to interpret ambiguous actions of others as aggressive or hostile."
        },
        {
            q: "Sherif's Robbers Cave experiment demonstrated that hostility between two competing groups of boys could be reliably reduced by:",
            options: [
                "Allowing the groups to socialize informally during pleasant activities (e.g., a movie)",
                "Providing clear rules and individual punishments for aggressive acts",
                "Introducing superordinate goals that required both groups to cooperate to succeed",
                "Having the group leaders negotiate a peace treaty"
            ],
            correct: 2,
            rationale: "Sherif found that mere contact or pleasant activities were vastly insufficient to resolve intergroup hostility. The only effective method was introducing 'superordinate goals'—compelling goals that both groups desired but neither could achieve without the participation and cooperation of the other group (e.g., fixing the camp water supply).\n\nWhy others are wrong:\n• Mere contact or informal socialization often exacerbated conflicts by providing more opportunities for taunting and fighting.\n• Punishments did not change the underlying group biases and hostility.\n• Negotiating a treaty between leaders does not address the attitudes of the group members themselves; superordinate goals were required to shift the group dynamic."
        },
        {
            q: "Berry's model of acculturation suggests that an individual who values maintaining their cultural identity while ALSO seeking to participate heavily in the dominant culture is utilizing the strategy of:",
            options: [
                "Assimilation",
                "Separation",
                "Integration",
                "Marginalization"
            ],
            correct: 2,
            rationale: "In Berry's model, Integration (also called biculturalism) occurs when an individual maintains both strong ties to their culture of origin and strong engagement with the new dominant culture. It is generally associated with the best mental health outcomes.\n\nWhy others are wrong:\n• Assimilation involves adopting the dominant culture while rejecting or abandoning the original culture.\n• Separation involves maintaining the original culture while avoiding interaction with the dominant culture.\n• Marginalization involves a loss of connection to both the original culture and the dominant culture."
        },
        {
            q: "Kirkpatrick's model for evaluating training programs in organizations measures outcomes at four levels. Which of the following is Level 3?",
            options: [
                "Reaction (did the trainees like it?)",
                "Learning (did they acquire knowledge?)",
                "Behavior (are they applying it on the job?)",
                "Results (did it impact the organization's bottom line?)"
            ],
            correct: 2,
            rationale: "Kirkpatrick's 4-level model evaluates training effectiveness. Level 1 is Reaction (trainee satisfaction). Level 2 is Learning (knowledge acquisition, usually measured by tests). Level 3 is Behavior (transfer of training back to the workplace). Level 4 is Results (business impact, e.g., ROI, reduced accidents).\n\nWhy others are wrong:\n• Reaction is Level 1.\n• Learning is Level 2.\n• Results is Level 4."
        },
        {
            q: "In cross-cultural psychology, an 'emic' perspective investigates phenomena:",
            options: [
                "By comparing multiple cultures from an external, objective viewpoint",
                "From within a specific culture to understand its unique concepts and meaning",
                "Using only standardized biological measurements",
                "Over historical time spans rather than in the present"
            ],
            correct: 1,
            rationale: "An emic approach focuses on understanding a culture from the internal perspective of its members, using indigenous concepts and recognizing culture-specific nuances. It is idiographic in nature.\n\nWhy others are wrong:\n• An 'etic' approach involves studying behavior from the outside, applying universal concepts to compare across different cultures (nomothetic approach).\n• Standardized biological measurements imply a highly universal (etic) approach ignoring cultural interpretation.\n• Studying spans of historical time is a longitudinal or historical approach, not the defining feature of emic vs. etic."
        },
        {
            q: "Fiedler's Contingency Model of leadership effectiveness proposes that to maximize group performance:",
            options: [
                "Leaders must be trained to alter their leadership style depending on the situation.",
                "The leader's style is fixed, so the situation must be engineered to match the leader's style.",
                "A transformational leadership style is superior in all situations.",
                "Leaders should focus entirely on interpersonal relations regardless of the task."
            ],
            correct: 1,
            rationale: "Fiedler's unique contribution was arguing that a leader's style (task-oriented vs. relationship-oriented, measured by the Least Preferred Coworker or LPC scale) is relatively fixed and difficult to change. Therefore, to ensure effectiveness, leaders must be matched to situations that fit their style, or the environment must be changed to suit the leader.\n\nWhy others are wrong:\n• Hersey-Blanchard's Situational Leadership theory is the one that suggests leaders CAN and SHOULD adapt their style (telling, selling, participating, delegating) to the maturity/readiness of followers.\n• Fiedler did not believe one style was superior universally; task-oriented leaders (low LPC) do best in highly favorable or highly unfavorable situations, while relationship-oriented leaders (high LPC) do best in moderately favorable situations.\n• Focusing entirely on relations is a high-LPC style, which is ineffective in extremes of situational control."
        },
        {
            q: "According to the Elaboration Likelihood Model (ELM) of persuasion, attitude change via the 'peripheral route' is most likely to occur when:",
            options: [
                "The message presents strong, logical arguments.",
                "The audience is highly motivated to process the message and has high cognitive capacity.",
                "The audience relies on superficial cues, such as the attractiveness or expertise of the communicator.",
                "The audience is personally invested deeply in the outcome of the issue."
            ],
            correct: 2,
            rationale: "The ELM proposes two routes to persuasion. The peripheral route occurs when motivation or ability to process the message is low. Therefore, the audience bypasses logic and relies on peripheral cues or heuristics (e.g., 'the speaker looks like an expert,' 'the speaker is attractive,' 'there is a catchy jingle').\n\nWhy others are wrong:\n• Strong, logical arguments are the hallmark of the central route to persuasion.\n• High motivation and capacity lead an audience to use the central route.\n• Deep personal investment increases motivation, pushing the audience to scrutinize the logic via the central route."
        }
    ],
    4: [
        {
            q: "According to Piaget, a child who realizes that pouring water from a short, wide glass into a tall, thin glass does not change the amount of water has achieved:",
            options: [
                "Object permanence",
                "Conservation",
                "Abstract logic",
                "Egocentrism"
            ],
            correct: 1,
            rationale: "Conservation is the understanding that physical properties of an object or substance (volume, mass, number) remain the same despite changes in physical appearance or arrangement. Mastery of conservation marks the transition from the preoperational stage to the concrete operational stage.\n\nWhy others are wrong:\n• Object permanence is the realization that objects continue to exist when out of sight, achieved in the sensorimotor stage (infancy).\n• Abstract logic is the hallmark of the formal operational stage (adolescence).\n• Egocentrism (inability to take another's perspective) is characteristic of the preoperational stage; achieving conservation usually coincides with a decrease in egocentrism."
        },
        {
            q: "Vygotsky's concept of the Zone of Proximal Development (ZPD) refers to:",
            options: [
                "The optimal physical distance a child should keep from strangers",
                "The gap between what a child can do independently and what they can do with guidance from a skilled partner",
                "The neurological window during which language must be acquired",
                "A child's tendency to focus on only one dimension of a problem"
            ],
            correct: 1,
            rationale: "The ZPD is a core concept in Vygotsky's sociocultural theory. It describes the range of tasks that a child cannot yet perform entirely alone but can accomplish with the help (scaffolding) of an adult or more capable peer. It represents the child's learning potential.\n\nWhy others are wrong:\n• Distance from strangers relates to attachment (e.g., stranger anxiety) and proxemics.\n• The window for language acquisition is called the 'critical period' or 'sensitive period'.\n• Focusing on one dimension is called 'centration', a Piagetian concept of the preoperational stage."
        },
        {
            q: "Mary Ainsworth's 'Strange Situation' paradigm was developed to assess:",
            options: [
                "Cognitive development stages",
                "Moral reasoning",
                "Infant attachment styles",
                "Gender identity development"
            ],
            correct: 2,
            rationale: "Ainsworth created the Strange Situation to observe attachment relationships between a caregiver and a child. By observing the infant's reactions to a series of separations and reunions with the mother and introductions of a stranger, she classified infants into secure, insecure-avoidant, and insecure-ambivalent/resistant attachment styles.\n\nWhy others are wrong:\n• Cognitive development was assessed by Piaget using tasks like conservation tests.\n• Moral reasoning was assessed by Kohlberg using moral dilemmas (e.g., the Heinz dilemma).\n• Gender identity development is assessed through self-report, play observation, or tests of gender constancy."
        },
        {
            q: "According to Erikson's psychosocial theory, the central crisis of adolescence is:",
            options: [
                "Trust vs. Mistrust",
                "Industry vs. Inferiority",
                "Identity vs. Role Confusion",
                "Intimacy vs. Isolation"
            ],
            correct: 2,
            rationale: "In adolescence (roughly ages 12-18), individuals grapple with Identity vs. Role Confusion. They explore their independence and develop a sense of self. Success leads to an ability to stay true to oneself, while failure leads to role confusion and weak sense of self.\n\nWhy others are wrong:\n• Trust vs. Mistrust is the crisis of infancy (0-1 year).\n• Industry vs. Inferiority occurs in middle childhood (school age, roughly 6-11 years) as children learn to master academic and social skills.\n• Intimacy vs. Isolation is the crisis of early adulthood (roughly 19-40 years), focusing on forming close, loving relationships."
        },
        {
            q: "Which of the following maternal infections poses a significant teratogenic risk to the developing fetus, particularly leading to deafness, cataracts, and congenital heart defects if contracted during the first trimester?",
            options: [
                "Rhinovirus (Common cold)",
                "Rubella (German measles)",
                "Norovirus",
                "Influenza"
            ],
            correct: 1,
            rationale: "Rubella is a highly dangerous teratogen (environmental agent that causes birth defects). If a mother contracts it during the first trimester, there is a high risk of Congenital Rubella Syndrome, which classically causes the triad of deafness, cataracts/eye anomalies, and congenital heart disease, along with intellectual disability.\n\nWhy others are wrong:\n• The common cold (rhinovirus) and stomach bug (norovirus) are not teratogenic; they do not cross the placenta to cause birth defects.\n• While influenza can cause fever (which carries small separate risks), it is not a direct teratogen causing the classic CRS triad."
        },
        {
            q: "Baumrind's typology of parenting styles identifies 'Authoritative' parenting as characterized by:",
            options: [
                "High demandingness/control and low responsiveness/warmth",
                "Low demandingness/control and high responsiveness/warmth",
                "High demandingness/control and high responsiveness/warmth",
                "Low demandingness/control and low responsiveness/warmth"
            ],
            correct: 2,
            rationale: "Authoritative parents establish clear rules and high expectations (high demandingness) but are also highly responsive, warm, and willing to explain their reasoning and negotiate (high responsiveness). This style consistently correlates with the best cognitive and social outcomes for children.\n\nWhy others are wrong:\n• High demandingness with low warmth is Authoritarian parenting (associated with lower self-esteem and higher anxiety).\n• Low demandingness with high warmth is Permissive/Indulgent parenting (associated with impulsivity and lacking self-control).\n• Low demandingness with low warmth is Uninvolved/Neglectful parenting (associated with the worst overall outcomes)."
        },
        {
            q: "Kohlberg's theory of moral development states that individuals in the 'Postconventional' stage make moral choices based primarily on:",
            options: [
                "Avoiding punishment",
                "Gaining approval from others",
                "Upholding the letter of the law to maintain social order",
                "Universal ethical principles and self-chosen abstract values"
            ],
            correct: 3,
            rationale: "Postconventional morality (Level 3) is the highest level of moral reasoning. Individuals base decisions on internal, self-chosen abstract principles of justice, human rights, and equality, which may sometimes conflict with societal laws.\n\nWhy others are wrong:\n• Avoiding punishment is Preconventional Stage 1.\n• Gaining approval is Conventional Stage 3 ('good boy/good girl').\n• Upholding the law strictly to maintain order is Conventional Stage 4 (law and order orientation)."
        },
        {
            q: "The term 'presbyopia' refers to a normative change in aging relating to:",
            options: [
                "Decline in high-frequency hearing",
                "Decreased elasticity of the lens of the eye, making it harder to focus on near objects",
                "Loss of proprioception and balance",
                "A sudden drop in fluid intelligence"
            ],
            correct: 1,
            rationale: "Presbyopia is age-related farsightedness. As people age (usually starting around 40), the lens of the eye becomes less flexible, making it difficult to accommodate and focus on near objects (hence the need for reading glasses).\n\nWhy others are wrong:\n• Decline in high-frequency hearing is called presbycusis.\n• Loss of balance involves the vestibular system and muscle changes, not presbyopia.\n• Fluid intelligence does tend to decline in later adulthood, but this is cognitive, not sensory like presbyopia."
        },
        {
            q: "According to Thomas and Chess, a baby who has irregular routines, is slow to accept new experiences, and reacts negatively and intensely has a:",
            options: [
                "Difficult temperament",
                "Easy temperament",
                "Slow-to-warm-up temperament",
                "Insecurely attached temperament"
            ],
            correct: 0,
            rationale: "Thomas and Chess's New York Longitudinal Study categorized temperament into three types. The 'Difficult' child (about 10% of children) is characterized by irregularity, negative moods, intense reactions to stimuli, and slow adaptation to new situations. This temperament requires skilled parenting (goodness of fit).\n\nWhy others are wrong:\n• 'Easy' children (40%) establish regular routines, are generally cheerful, and adapt easily.\n• 'Slow-to-warm-up' children (15%) are inactive, show mild, low-key reactions, are negative in mood, and adjust slowly.\n• 'Attachment' is a relationship construct developed later based on caregiver interactions, not an innate, early-appearing infant temperament."
        },
        {
            q: "Chomsky's theory of language acquisition argues that children are born with a:",
            options: [
                "Tabula rasa (blank slate) that requires intensive environmental conditioning",
                "Language Acquisition Device (LAD) containing universal grammar",
                "Zone of Proximal Development for semantic structures",
                "Strict dependency on reinforcement for every word uttered"
            ],
            correct: 1,
            rationale: "Noam Chomsky championed the nativist approach, arguing that the human brain contains an innate Language Acquisition Device (LAD) pre-programmed with universal grammatical rules. This explains why children all over the world acquire language at similar rates and make predictable (but unmodeled) errors like overregularization ('I goed').\n\nWhy others are wrong:\n• Tabula rasa and operant conditioning (dependency on reinforcement) reflect B.F. Skinner's behaviorist theory of language, which Chomsky famously critiqued.\n• The Zone of Proximal Development belongs to Vygotsky, representing a sociocultural approach to learning rather than a purely nativist biological mechanism."
        }
    ]
};

Object.entries(batch37).forEach(([domainId, questions]) => {
    const domain = EPPPData.getDomain(parseInt(domainId));
    if (domain) questions.forEach(q => domain.questions.push(q));
});

console.log('PasstheEPPP: Loaded ' + Object.values(batch37).reduce((s,q)=>s+q.length,0) + ' questions (batch 37).');
})();
