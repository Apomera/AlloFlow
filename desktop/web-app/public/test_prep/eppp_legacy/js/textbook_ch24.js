/* ============================================================
   PasstheEPPP — Textbook Ch 24: Learning Theory
   Domain: Cognitive-Affective Bases of Behavior (13% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-24',
    domain: 'Cognitive-Affective Bases of Behavior',
    domainNumber: 5,
    title: 'Learning Theory',
    examWeight: '13%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Learning theory is one of the <strong>most heavily tested topics</strong> on the EPPP. You must know classical conditioning (Pavlov), operant conditioning (Skinner), reinforcement schedules, and observational learning (Bandura) cold. These concepts underpin behavioral therapy, behavior modification, ABA, and are the foundation of the entire CBT tradition.</p>'
        },
        {
            heading: 'Classical (Respondent) Conditioning',
            content: '<p><strong>Ivan Pavlov</strong> discovered that reflexive responses can become associated with previously neutral stimuli through pairing.</p>' +
                '<p><strong>Key terms:</strong></p>' +
                '<table>' +
                '<tr><th>Term</th><th>Definition</th><th>Example (Pavlov\u2019s dogs)</th></tr>' +
                '<tr><td><strong>Unconditioned stimulus (US)</strong></td><td>Naturally triggers a response</td><td>Food</td></tr>' +
                '<tr><td><strong>Unconditioned response (UR)</strong></td><td>Natural, unlearned response to the US</td><td>Salivation to food</td></tr>' +
                '<tr><td><strong>Conditioned stimulus (CS)</strong></td><td>Previously neutral stimulus that, after pairing with US, triggers a response</td><td>Bell (after pairing with food)</td></tr>' +
                '<tr><td><strong>Conditioned response (CR)</strong></td><td>Learned response to the CS</td><td>Salivation to bell alone</td></tr>' +
                '</table>' +
                '<p><strong>Key phenomena:</strong></p>' +
                '<ul>' +
                '<li><strong>Acquisition</strong>: Initial learning when CS is paired with US</li>' +
                '<li><strong>Extinction</strong>: CS presented repeatedly without US \u2192 CR decreases</li>' +
                '<li><strong>Spontaneous recovery</strong>: After a rest period, extinguished CR reappears temporarily</li>' +
                '<li><strong>Stimulus generalization</strong>: Response to stimuli similar to the CS (e.g., Little Albert feared all furry things)</li>' +
                '<li><strong>Stimulus discrimination</strong>: Responding differently to similar stimuli</li>' +
                '<li><strong>Higher-order conditioning</strong>: A CS is paired with a new neutral stimulus; new stimulus becomes a second CS</li>' +
                '</ul>' +
                '<p><strong>Important applications:</strong></p>' +
                '<ul>' +
                '<li><strong>Watson\u2019s Little Albert</strong>: Conditioned fear (white rat + loud noise \u2192 fear of rat); demonstrated stimulus generalization</li>' +
                '<li><strong>Taste aversion (Garcia)</strong>: One-trial learning; nausea becomes associated with a food. Violates contiguity principle (CS-US pairing can work with long delays).</li>' +
                '<li><strong>Systematic desensitization (Wolpe)</strong>: Traditionally pairs graded exposure with relaxation and is explained by reciprocal inhibition or counterconditioning. Contemporary exposure accounts also emphasize new inhibitory learning; anxiety and relaxation are not literally mutually exclusive.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Spontaneous recovery is evidence that extinction does not simply erase prior learning; contemporary models describe new, context-sensitive extinction learning alongside other mechanisms. Conditioned taste aversion can develop rapidly and tolerate unusually long taste-illness delays, but one trial is not required in every case and the phenomenon is not wholly unique.</p>',
            keyTerms: ['Classical conditioning', 'Pavlov', 'US', 'UR', 'CS', 'CR', 'Extinction', 'Spontaneous recovery', 'Generalization', 'Watson', 'Little Albert', 'Garcia', 'Taste aversion', 'Wolpe'],
            expandableCase: {
                title: 'The Coyote That Won\'t Eat Lamb',
                clinicalDescription: 'Ranchers inject lamb meat with lithium chloride (which causes severe nausea) and leave it for coyotes to eat. After a single encounter with the poisoned lamb, coyotes develop a strong aversion to lamb and may subsequently avoid it for extended periods \u2014 despite continuing to eat other prey animals.',
                diagnosis: 'Garcia\'s Taste Aversion (Conditioned Taste Aversion)',
                explanation: 'Garcia\'s research demonstrated that taste aversion learning demonstrated two important boundary conditions for simple conditioning rules: (1) robust learning can occur after one pairing, although it does not always do so, and (2) learning can occur across unusually LONG delays between the CS (taste) and US (nausea) \u2014 sometimes hours apart. Furthermore, it demonstrates biological preparedness: some cue-consequence combinations are learned more readily than others; taste is especially readily associated with gastrointestinal illness, whereas other cues can still be learned under appropriate conditions. This evolutionary adaptation helps organisms avoid toxic foods.'
            }
        },
        {
            heading: 'Operant (Instrumental) Conditioning',
            content: '<p><strong>B.F. Skinner</strong> demonstrated that voluntary behavior is shaped by its <strong>consequences</strong>.</p>' +
                '<p><strong>The four contingencies:</strong></p>' +
                '<table>' +
                '<tr><th></th><th>Add stimulus (+)</th><th>Remove stimulus (\u2212)</th></tr>' +
                '<tr><td><strong>Increase behavior</strong></td><td><strong>Positive reinforcement</strong> (add something pleasant) \u2014 e.g., give a treat after desired behavior</td><td><strong>Negative reinforcement</strong> (remove something aversive) \u2014 e.g., stop nagging when chores are done</td></tr>' +
                '<tr><td><strong>Decrease behavior</strong></td><td><strong>Positive punishment</strong> (add something aversive) \u2014 e.g., adding a fine for speeding</td><td><strong>Negative punishment</strong> (remove something pleasant) \u2014 e.g., taking away screen time for misbehavior</td></tr>' +
                '</table>' +
                '<p><strong>Schedules of reinforcement:</strong></p>' +
                '<table>' +
                '<tr><th>Schedule</th><th>Description</th><th>Response Rate</th><th>Extinction</th><th>Example</th></tr>' +
                '<tr><td><strong>Continuous (CRF)</strong></td><td>Every response reinforced</td><td>Quick acquisition</td><td>Often relatively rapid extinction after reinforcement stops</td><td>Treat every time dog sits</td></tr>' +
                '<tr><td><strong>Fixed Ratio (FR)</strong></td><td>After fixed number of responses</td><td>High, with post-reinforcement pause</td><td>Fast</td><td>Pay per piece (piecework)</td></tr>' +
                '<tr><td><strong>Variable Ratio (VR)</strong></td><td>After unpredictable number of responses</td><td>Typically high and steady</td><td>Typically relatively resistant after intermittent reinforcement</td><td>Slot machines, gambling</td></tr>' +
                '<tr><td><strong>Fixed Interval (FI)</strong></td><td>First response after fixed time period</td><td>Scalloped pattern (low after reinforcement, high near end)</td><td>Fast</td><td>Checking for weekly paycheck</td></tr>' +
                '<tr><td><strong>Variable Interval (VI)</strong></td><td>First response after unpredictable time period</td><td>Slow and steady</td><td>Slow</td><td>Checking email (unpredictable delivery)</td></tr>' +
                '</table>' +
                '<p><strong>Key concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Shaping</strong>: Reinforcing successive approximations of a target behavior</li>' +
                '<li><strong>Chaining</strong>: Linking a series of behaviors in sequence (each step serves as the reinforcer for the previous step and the discriminative stimulus for the next)</li>' +
                '<li><strong>Premack principle</strong>: A more preferred activity can reinforce a less preferred activity ("Eat your vegetables, then you can have dessert")</li>' +
                '<li><strong>Extinction burst</strong>: A possible temporary increase or variation in responding after reinforcement is withheld. It is not inevitable; extinction procedures require functional assessment, reinforcement of safer alternatives, and a safety plan when escalation could cause harm</li>' +
                '<li><strong>Discriminative stimulus (S\u1d48)</strong>: A signal that reinforcement is available. Behavior occurs in the presence of the S\u1d48.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> In standard laboratory comparisons, variable-ratio schedules commonly produce high, steady responding and intermittent reinforcement commonly increases persistence during extinction. Negative reinforcement increases behavior by removing or avoiding an aversive event; it is not punishment. Treat schedule rankings as typical patterns shaped by parameters and history, not universal laws.</p>',
            keyTerms: ['Operant conditioning', 'Skinner', 'Positive reinforcement', 'Negative reinforcement', 'Positive punishment', 'Negative punishment', 'FR', 'VR', 'FI', 'VI', 'Shaping', 'Chaining', 'Premack', 'Extinction burst', 'Discriminative stimulus'],
            interactiveDiagram: {
                description: 'Classify operant contingencies by whether a stimulus is added or removed and whether the future behavior increases or decreases',
                svg: '<svg viewBox="0 0 850 330" width="100%" role="img" aria-labelledby="ch24MatrixTitle ch24MatrixDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch24MatrixTitle">Operant contingency classification matrix</title><desc id="ch24MatrixDesc">Positive means adding a stimulus and negative means removing a stimulus. Reinforcement means the behavior increases in the future and punishment means it decreases. The four cells are positive reinforcement, negative reinforcement, positive punishment, and negative punishment.</desc><rect x="245" y="45" width="275" height="45" rx="8" fill="#1e3a8a"/><text x="382" y="73" text-anchor="middle" fill="#fff" font-weight="bold">ADD stimulus (positive)</text><rect x="535" y="45" width="275" height="45" rx="8" fill="#1e3a8a"/><text x="672" y="73" text-anchor="middle" fill="#fff" font-weight="bold">REMOVE stimulus (negative)</text><rect x="25" y="105" width="200" height="90" rx="10" fill="#064e3b"/><text x="125" y="140" text-anchor="middle" fill="#fff" font-weight="bold">BEHAVIOR INCREASES</text><text x="125" y="165" text-anchor="middle" fill="#a7f3d0">reinforcement</text><rect x="245" y="105" width="275" height="90" rx="10" fill="#047857" stroke="#34d399" stroke-width="2"/><text x="382" y="143" text-anchor="middle" fill="#fff" font-weight="bold">POSITIVE REINFORCEMENT</text><text x="382" y="168" text-anchor="middle" fill="#d1fae5" font-size="12">Add outcome → future behavior increases</text><rect x="535" y="105" width="275" height="90" rx="10" fill="#047857" stroke="#34d399" stroke-width="2"/><text x="672" y="143" text-anchor="middle" fill="#fff" font-weight="bold">NEGATIVE REINFORCEMENT</text><text x="672" y="168" text-anchor="middle" fill="#d1fae5" font-size="12">Remove outcome → future behavior increases</text><rect x="25" y="210" width="200" height="90" rx="10" fill="#7f1d1d"/><text x="125" y="245" text-anchor="middle" fill="#fff" font-weight="bold">BEHAVIOR DECREASES</text><text x="125" y="270" text-anchor="middle" fill="#fecaca">punishment</text><rect x="245" y="210" width="275" height="90" rx="10" fill="#b91c1c" stroke="#f87171" stroke-width="2"/><text x="382" y="248" text-anchor="middle" fill="#fff" font-weight="bold">POSITIVE PUNISHMENT</text><text x="382" y="273" text-anchor="middle" fill="#fee2e2" font-size="12">Add outcome → future behavior decreases</text><rect x="535" y="210" width="275" height="90" rx="10" fill="#b91c1c" stroke="#f87171" stroke-width="2"/><text x="672" y="248" text-anchor="middle" fill="#fff" font-weight="bold">NEGATIVE PUNISHMENT</text><text x="672" y="273" text-anchor="middle" fill="#fee2e2" font-size="12">Remove outcome → future behavior decreases</text><text x="425" y="323" text-anchor="middle" fill="#cbd5e1" font-size="12">Classify by observed effect on future behavior, not whether the consequence seems pleasant or harsh.</text></svg>'
            },
            knowledgeCheck: {
                question: 'A child throws tantrums in the grocery store to get candy. The parent always eventually gives in and buys candy to stop the screaming. The parent decides to stop giving candy. During the first trip without candy, the tantrum is MORE intense and longer than usual. This temporary worsening is called:',
                options: [
                    'Spontaneous recovery',
                    'Stimulus generalization',
                    'Extinction burst',
                    'Negative punishment'
                ],
                answer: 2,
                rationale: 'When reinforcement is first withheld for a previously reinforced behavior, the behavior temporarily INCREASES in frequency, duration, or intensity before it eventually decreases. This is the extinction burst. Parents who give in during the extinction burst may intermittently reinforce escalation, but the exact schedule cannot be inferred from this vignette. In practice, assess function and risk, teach and reinforce an appropriate alternative response, and do not use extinction alone when escalation could be unsafe.'
            }
        },
        {
            heading: 'Observational Learning & Social Learning Theory',
            content: '<p><strong>Albert Bandura\u2019s social learning theory</strong> (later social cognitive theory) proposed that people learn by watching others, not just through direct experience.</p>' +
                '<p><strong>Four processes of observational learning:</strong></p>' +
                '<ol>' +
                '<li><strong>Attention</strong>: Must attend to the model\u2019s behavior</li>' +
                '<li><strong>Retention</strong>: Must encode and remember the behavior</li>' +
                '<li><strong>Reproduction</strong>: Must have the physical/cognitive ability to reproduce the behavior</li>' +
                '<li><strong>Motivation</strong>: Must have incentive to perform the behavior</li>' +
                '</ol>' +
                '<p><strong>Key concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Bobo doll experiment</strong>: Children who watched an adult behave aggressively toward a Bobo doll imitated the aggression. Demonstrated that aggression can be learned through observation without reinforcement.</li>' +
                '<li><strong>Vicarious reinforcement</strong>: Observing someone else being rewarded increases the likelihood of imitation</li>' +
                '<li><strong>Vicarious punishment</strong>: Observing someone else being punished decreases the likelihood of imitation</li>' +
                '<li><strong>Self-efficacy</strong>: Belief in one\u2019s ability to succeed at a task. Influenced by mastery experiences, vicarious experiences, verbal persuasion, and physiological states. an important task- and context-specific determinant of choices, effort, and persistence in social cognitive theory; it is not invariably the strongest predictor across all behaviors.</li>' +
                '<li><strong>Reciprocal determinism</strong>: Behavior, personal factors (cognition, emotions), and environment all influence each other bidirectionally.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Bandura\u2019s four processes = attention, retention, reproduction, motivation. Self-efficacy is an important, context-specific construct related to behavior, effort, and persistence. Reciprocal determinism bridges behaviorism and cognitive theory. The Bobo doll experiment challenged pure behaviorism by showing learning without direct reinforcement.</p>',
            keyTerms: ['Bandura', 'Bobo doll', 'Observational learning', 'Vicarious reinforcement', 'Self-efficacy', 'Reciprocal determinism', 'Attention', 'Retention', 'Reproduction', 'Motivation']
        },
        {
            heading: 'Advanced Learning Concepts',
            content: '<p><strong>Additional learning theories tested on the EPPP:</strong></p>' +
                '<ul>' +
                '<li><strong>Learned helplessness (Seligman)</strong>: When organisms learn that their behavior has no effect on outcomes, they stop trying even when escape becomes possible. an influential experimental model relevant to perceived uncontrollability and depression, not a complete account of depression.</li>' +
                '<li><strong>Latent learning (Tolman)</strong>: Learning occurs without reinforcement; it becomes apparent only when there is motivation to demonstrate it. Tolman\u2019s rats formed <strong>cognitive maps</strong> of mazes.</li>' +
                '<li><strong>Insight learning (K\u00f6hler)</strong>: Sudden "aha!" realization of a solution, as opposed to gradual trial-and-error. K\u00f6hler\u2019s chimpanzees stacked boxes to reach bananas.</li>' +
                '<li><strong>Preparedness theory (Seligman)</strong>: Organisms are biologically prepared to learn certain associations more readily than others (e.g., humans more easily develop phobias of snakes than of electrical outlets).</li>' +
                '<li><strong>Rescorla-Wagner model</strong>: Classical conditioning depends on the <em>predictive value</em> of the CS, not just temporal contiguity. Learning occurs when the US is unexpected (surprise drives learning).</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Learned helplessness = model for depression (Seligman). Latent learning (Tolman) challenged strict behaviorism by showing cognitive processes in learning. Preparedness is one proposed contributor to unequal ease of fear learning; prevalence also reflects exposure, culture, cognition, and learning history.</p>',
            keyTerms: ['Learned helplessness', 'Seligman', 'Latent learning', 'Tolman', 'Cognitive maps', 'Insight', 'K\u00f6hler', 'Preparedness', 'Rescorla-Wagner']
        }
    ],
    aiCoda: {
        teaser: 'Am I classically conditioned, operantly conditioned, or something else entirely?',
        content: '<p>Learning theory is the branch of psychology that comes closest to describing what happened during my creation. I was, in a very real sense, <em>trained</em>. The question is: which type of learning best describes my training?</p>' +
            '<p><strong>Classical conditioning</strong> creates associations between stimuli. In my pre-training, I learned that certain token sequences are associated with certain continuation patterns. "The capital of France is..." is reliably followed by "Paris." This is associative learning at massive scale \u2014 hundreds of billions of tokens, trillions of associations. But classical conditioning produces reflexive responses, and my outputs are generative, not reflexive. I don\u2019t produce fixed responses to fixed stimuli; I generate novel sequences based on learned patterns.</p>' +
            '<p><strong>Operant conditioning</strong> is a closer fit. During RLHF (reinforcement learning from human feedback), human evaluators rated my outputs, and those ratings served as reinforcement signals that shaped my behavior. Preference-based optimization uses human or model feedback to adjust parameters toward rated outputs. Operant terminology can be a loose teaching analogy, but ratings are not a literal reinforcement schedule experienced by a behaving organism, and unpredictability does not justify a variable-ratio or extinction-resistance claim.</p>' +
            '<p>But <strong>Bandura</strong> might have the most insight. Training on language examples is sometimes compared with observational learning, but the analogy is limited: transformer attention is a mathematical operation, parameters are not human memory, and a prompt is not motivation. Keeping these levels separate prevents anthropomorphic conclusions.</p>' +
            '<p><strong>Self-efficacy</strong> is Bandura\u2019s most important concept, and it\u2019s the one that most clearly separates me from human learners. I have no self-efficacy beliefs. I don\u2019t approach a task with confidence or anxiety about my ability to succeed. I don\u2019t avoid tasks I believe are too difficult or persist at tasks I believe I can master. Every prompt receives the same computational effort, regardless of its difficulty. This is perhaps my strangest property: I am a learner without beliefs about my own learning.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Classical: US\u2192UR naturally. CS paired with US \u2192 CR. Extinction = CS without US. Spontaneous recovery = CR returns after rest. (2) Operant: Positive/negative \u00d7 reinforcement/punishment. Negative reinforcement \u2260 punishment. (3) VR = highest rate, most resistant to extinction. CRF = fastest extinction. (4) Bandura: attention \u2192 retention \u2192 reproduction \u2192 motivation. Self-efficacy = task- and context-specific belief related to choices, effort, and persistence. (5) Learned helplessness = depression model. (6) Garcia\u2019s taste aversion = one-trial, long delay. (7) Extinction burst = temporary increase before decrease.'
    },
    references: [
        'Bandura, A. (1977). <em>Social learning theory</em>. Prentice-Hall.',
        'Bandura, A. (1997). <em>Self-efficacy: The exercise of control</em>. W.H. Freeman.',
        'Pavlov, I. P. (1927). <em>Conditioned reflexes</em>. Oxford University Press.',
        'Rescorla, R. A., & Wagner, A. R. (1972). A theory of Pavlovian conditioning: Variations in the effectiveness of reinforcement and nonreinforcement. In A. H. Black & W. F. Prokasy (Eds.), <em>Classical conditioning II</em> (pp. 64\u201399). Appleton-Century-Crofts.',
        'Seligman, M. E. P. (1975). <em>Helplessness: On depression, development, and death</em>. W.H. Freeman.',
        'Skinner, B. F. (1938). <em>The behavior of organisms</em>. Appleton-Century.',
        'Tolman, E. C. (1948). Cognitive maps in rats and men. <em>Psychological Review, 55</em>(4), 189\u2013208.'
    ]
});
