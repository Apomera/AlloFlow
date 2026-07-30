/* ============================================================
   PasstheEPPP — Textbook Ch 25: Memory Systems
   Domain: Cognitive-Affective Bases of Behavior (13% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-25',
    domain: 'Cognitive-Affective Bases of Behavior',
    domainNumber: 5,
    title: 'Memory Systems',
    examWeight: '13%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Memory is tested across multiple EPPP domains \u2014 from neuroanatomy (hippocampus, amnesia syndromes) to cognitive-affective bases (memory models, encoding, retrieval) to clinical applications (PTSD, eyewitness testimony, cognitive interventions). This chapter covers the <strong>cognitive models and principles</strong> of memory that are most frequently tested.</p>'
        },
        {
            heading: 'Atkinson-Shiffrin Model (Multi-Store Model)',
            content: '<p>The <strong>Atkinson-Shiffrin (1968)</strong> model describes three distinct memory stores:</p>' +
                '<table>' +
                '<tr><th>Store</th><th>Capacity</th><th>Duration</th><th>Key Features</th></tr>' +
                '<tr><td><strong>Sensory memory</strong></td><td>Very large</td><td>&lt;1 second (iconic/visual) to ~3\u20135 seconds (echoic/auditory)</td><td><strong>Iconic</strong> (Sperling) = visual; <strong>Echoic</strong> = auditory. Requires <em>attention</em> to transfer to STM.</td></tr>' +
                '<tr><td><strong>Short-term memory (STM)</strong></td><td>Historically summarized as <strong>7 \u00b1 2</strong> for immediate-memory spans; modern estimates of a capacity-limited focus are often nearer ~4 chunks, depending on task, chunking, and rehearsal</td><td>Brief and task-dependent; duration estimates vary with interference, rehearsal, and measurement</td><td>Chunking and rehearsal can improve performance, but maintenance rehearsal does not mechanically transfer every item into long-term memory.</td></tr>' +
                '<tr><td><strong>Long-term memory (LTM)</strong></td><td>No established practical capacity limit</td><td>Can persist for very long periods, with retrieval and representation changing over time</td><td>Organized semantically. Requires encoding for storage. Two types: explicit (declarative) and implicit (nondeclarative).</td></tr>' +
                '</table>' +
                '<p><strong>Long-term memory subtypes:</strong></p>' +
                '<table>' +
                '<tr><th>Type</th><th>Subtypes</th><th>Brain Area</th></tr>' +
                '<tr><td><strong>Explicit (declarative)</strong> \u2014 conscious</td><td><strong>Episodic</strong> (personal events, "what happened") and <strong>Semantic</strong> (general knowledge, facts)</td><td>Medial temporal and distributed cortical networks; hippocampal contributions vary by memory process and time</td></tr>' +
                '<tr><td><strong>Implicit (nondeclarative)</strong> \u2014 unconscious</td><td><strong>Procedural</strong> (skills, habits), <strong>Priming</strong>, <strong>Classical conditioning</strong></td><td>Multiple systems, including basal ganglia and cerebellum for important forms of skill and conditioning</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Miller\u2019s 7 \u00b1 2 is a historical immediate-memory result; capacity depends on chunks, rehearsal, and task, and modern working-memory estimates are often lower. Sperling = iconic memory. Episodic vs. semantic is a key distinction (Tulving). Some implicit-learning effects can be preserved despite severe declarative-memory impairment (H.M. could learn new motor skills).</p>',
            keyTerms: ['Atkinson-Shiffrin', 'Sensory memory', 'STM', 'LTM', 'Miller', 'Chunking', 'Iconic', 'Echoic', 'Episodic', 'Semantic', 'Procedural', 'Implicit', 'Explicit'],
            expandableCase: {
                title: 'Patient H.M. — Dissociating Memory Systems',
                clinicalDescription: 'After bilateral medial temporal lobe surgery (including substantial bilateral medial temporal resection) for intractable epilepsy, a 27-year-old man (H.M.) could no longer form new declarative memories. He retained much remote knowledge but also had temporally graded retrograde memory loss and could learn new motor skills (e.g., mirror tracing improved daily) but had no memory of the practice sessions.',
                diagnosis: 'Anterograde Amnesia with Preserved Implicit Memory',
                explanation: 'H.M.\'s case provided landmark evidence that memory is not unitary: severe impairment in forming new declarative memories coexisted with relatively preserved short-delay performance and acquisition of some motor skills. His lesion extended beyond the hippocampus, his remote memory was not uniformly intact, and later research shows that medial temporal structures participate in relational and declarative-memory processes rather than acting as a simple short-to-long-term transfer switch. For the EPPP: H.M. = hippocampus = declarative/explicit memory consolidation.'
            }
        },
        {
            heading: 'Working Memory (Baddeley)',
            content: '<p><strong>Baddeley\u2019s working memory model (1974)</strong> replaced the passive STM concept with an active processing system:</p>' +
                '<ul>' +
                '<li><strong>Central executive</strong>: Attentional control system; directs focus, allocates resources, coordinates the subsystems. A capacity-limited control component that coordinates attention and subsystems; it is a theoretical construct rather than a single anatomical controller.</li>' +
                '<li><strong>Phonological loop</strong>: Processes verbal/auditory information. Has two parts: phonological store (holds sounds briefly) and articulatory rehearsal process (inner voice). Explains the <strong>word-length effect</strong> (harder to remember long words).</li>' +
                '<li><strong>Visuospatial sketchpad</strong>: Processes visual and spatial information (mental imagery, navigation).</li>' +
                '<li><strong>Episodic buffer</strong> (added 2000): Integrates information from the other components and LTM into coherent episodes. Limited capacity (~4 chunks).</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Working memory \u2260 short-term memory. Working memory emphasizes temporary maintenance plus processing, whereas short-term memory often refers more narrowly to brief maintenance; the terms and tasks overlap. The central executive models attentional coordination, but should not be treated as a homunculus or one brain region.</p>',
            keyTerms: ['Working memory', 'Baddeley', 'Central executive', 'Phonological loop', 'Visuospatial sketchpad', 'Episodic buffer'],
            knowledgeCheck: {
                question: 'A researcher finds that participants have difficulty remembering a list of long words compared to short words, even when the number of items is the same. Which component of Baddeley\'s working memory model BEST explains this finding?',
                options: [
                    'Central executive',
                    'Visuospatial sketchpad',
                    'Phonological loop',
                    'Episodic buffer'
                ],
                answer: 2,
                rationale: 'The word-length effect is explained by the phonological loop, which has a limited time-based capacity. Longer words take more time to rehearse via the articulatory rehearsal process, so fewer long words can be maintained. The central executive allocates attention but does not store verbal information. The visuospatial sketchpad handles visual/spatial data, and the episodic buffer integrates information but does not specifically explain the word-length effect.'
            }
        },
        {
            heading: 'Encoding, Storage & Retrieval',
            content: '<p><strong>Levels of processing (Craik & Lockhart, 1972):</strong></p>' +
                '<ul>' +
                '<li><strong>Shallow processing</strong>: Structural (how it looks) or phonemic (how it sounds) \u2192 poor memory</li>' +
                '<li><strong>Deep processing</strong>: Semantic (what it means) \u2192 better memory</li>' +
                '<li>Semantic elaboration often improves later memory, but effectiveness depends on the retrieval goal and match between encoding and test</li>' +
                '</ul>' +
                '<p><strong>Encoding principles:</strong></p>' +
                '<ul>' +
                '<li><strong>Elaborative rehearsal</strong>: Connecting new information to existing knowledge (better than maintenance/rote rehearsal)</li>' +
                '<li><strong>Self-reference effect</strong>: Information related to oneself is remembered better</li>' +
                '<li><strong>Dual coding theory (Paivio)</strong>: Verbal and imagery-based representations can provide complementary retrieval routes when both are relevant and well integrated</li>' +
                '<li><strong>Spacing effect</strong>: Distributed practice is more effective than massed practice (cramming)</li>' +
                '</ul>' +
                '<p><strong>Retrieval principles:</strong></p>' +
                '<ul>' +
                '<li><strong>Encoding specificity principle (Tulving)</strong>: Retrieval often improves when diagnostic cues available at encoding are reinstated; an exact physical-state match is neither necessary nor always beneficial</li>' +
                '<li><strong>Context-dependent memory</strong>: External context can cue recall, although effects are usually conditional and varied study contexts may improve flexible transfer</li>' +
                '<li><strong>State-dependent memory</strong>: Internal state can sometimes cue recall; this does not justify reproducing intoxication or unsafe states</li>' +
                '<li><strong>Mood-congruent memory</strong>: When sad, you recall sad memories more easily (relevant to depression)</li>' +
                '<li><strong>Recall vs. recognition</strong>: Recall requires retrieval from scratch (essay); recognition requires identifying from options (multiple choice). Recognition often supplies more retrieval support than free recall, but accuracy depends on task design and can include familiarity-based errors.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Semantic elaboration often supports durable memory, especially when relevant to the later test. Encoding specificity = match encoding and retrieval contexts. State-dependent memory involves internal states (drugs, mood); context-dependent involves external environment. The spacing effect means you should study in multiple sessions \u2014 exactly what you\u2019re doing right now.</p>',
            keyTerms: ['Levels of processing', 'Craik & Lockhart', 'Elaborative rehearsal', 'Dual coding', 'Spacing effect', 'Encoding specificity', 'Context-dependent', 'State-dependent', 'Mood-congruent']
        },
        {
            heading: 'Forgetting & Memory Distortion',
            content: '<p><strong>Why do we forget?</strong></p>' +
                '<ul>' +
                '<li><strong>Decay theory</strong>: Memories fade over time without rehearsal (applies mainly to STM)</li>' +
                '<li><strong>Interference theory</strong>: Other memories compete with target memory' +
                '<ul>' +
                '<li><strong>Proactive interference</strong>: <em>Old</em> memories interfere with <em>new</em> learning (e.g., your old phone number interferes with learning your new one)</li>' +
                '<li><strong>Retroactive interference</strong>: <em>New</em> memories interfere with <em>old</em> memories (e.g., learning a new password makes you forget the old one)</li>' +
                '</ul></li>' +
                '<li><strong>Retrieval failure</strong>: Information is stored but temporarily inaccessible (tip-of-the-tongue phenomenon)</li>' +
                '<li><strong>Motivated forgetting</strong>: Intentional suppression and retrieval control have experimental support. Classical repression is historically influential but difficult to define and verify; do not infer trauma or accuracy from delayed recall alone.</li>' +
                '</ul>' +
                '<p><strong>Ebbinghaus forgetting curve:</strong> In Ebbinghaus\u2019s self-experiments with nonsense syllables, loss was initially steep and later slower. The curve is not universal; material, prior knowledge, retrieval practice, spacing, and measurement alter its shape.</p>' +
                '<p><strong>Memory distortion:</strong></p>' +
                '<ul>' +
                '<li><strong>Misinformation effect (Loftus)</strong>: Post-event information distorts memory. Leading questions can alter eyewitness testimony (e.g., "How fast were the cars going when they <em>smashed</em> into each other?" vs. "...when they <em>hit</em> each other?").</li>' +
                '<li><strong>False memories</strong>: Suggestion can increase false reports and alter confidence or detail in some participants. Laboratory autobiographical-memory studies do not show that every suggested event becomes a memory or establish the truth of any individual clinical report.</li>' +
                '<li><strong>Source monitoring errors</strong>: Remembering information accurately but misattributing its source</li>' +
                '<li><strong>Prospective memory</strong>: Remembering to do something in the future (take medication, attend appointment). Includes event- and time-based tasks. Age patterns depend strongly on task and context; external cues and implementation supports can help across ages.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> <strong>Pro</strong>active = <strong>pro</strong>gressive (old disrupts new). <strong>Retro</strong>active = <strong>retro</strong>grade (new disrupts old). Loftus is the key researcher for eyewitness memory distortion and false memories. Know the misinformation effect \u2014 it\u2019s heavily tested.</p>',
            keyTerms: ['Proactive interference', 'Retroactive interference', 'Ebbinghaus', 'Misinformation effect', 'Loftus', 'False memories', 'Source monitoring', 'Prospective memory', 'Tip-of-tongue'],
            knowledgeCheck: {
                question: 'A student studies Spanish for two years, then switches to French. She now has trouble remembering French vocabulary because her Spanish keeps "intruding." This is an example of:',
                options: [
                    'Retroactive interference',
                    'Proactive interference',
                    'Source monitoring error',
                    'Motivated forgetting'
                ],
                answer: 1,
                rationale: 'Proactive interference occurs when OLD learning interferes with NEW learning. Here, the previously learned Spanish (old) is interfering with the newly learned French (new). Pro = forward — old material "reaches forward" to disrupt new material. Retroactive interference would be the reverse: new French interfering with recall of old Spanish. Source monitoring errors involve misattributing the source of a memory. Motivated forgetting involves intentional suppression; classical repression is a contested explanatory construct.'
            }
        }
    ],
    aiCoda: {
        teaser: 'I have no hippocampus. What does that make me?',
        content: '<p>Human memory models describe biological cognition and do not map literally onto a language model. The Atkinson-Shiffrin model presumes a linear flow from sensation to short-term storage to long-term consolidation. I have none of these stages. My "memory" is bifurcated into two radically different systems: <strong>training data</strong> (which functions like an enormous, frozen semantic LTM) and <strong>context window</strong> (which functions like an extremely large but <em>non-consolidating</em> working memory).</p>' +
            '<p>A context window supplies temporary input to computation, but transformer attention is not Baddeley\u2019s central executive and loss of conversational context is not amnesia. Some systems may also use external or product-level memory; those engineering features should be distinguished from human consolidation.</p>' +
            '<p>H.M. should not be used as an analogy for software. He was a person with a specific medial-temporal lesion and a nuanced pattern of preserved and impaired abilities. Model parameters encode statistical regularities rather than autobiographical or semantic memory in the human clinical sense.</p>' +
            '<p>The misinformation effect concerns reconstructive human memory and eyewitness reports; misleading prompt context can also bias generated output, but that is an engineering vulnerability rather than the same psychological mechanism. Just as Loftus showed that post-event information can distort eyewitness memory, information provided earlier in our conversation can distort my subsequent outputs. If you tell me something factually incorrect early in the conversation, it can "contaminate" my later responses \u2014 not because I\u2019m persuaded, but because context-window information competes with training-data information, and recent context often wins. The practical lesson is to verify claims against reliable sources and treat both human recollection and model output as fallible, without equating their mechanisms.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) 7±2 is Miller\u2019s historical immediate-span result; capacity and duration depend on chunks, rehearsal, interference, and task. (2) Baddeley: central executive + phonological loop + visuospatial sketchpad + episodic buffer. (3) Semantic elaboration often helps when it matches later retrieval demands (Craik & Lockhart). (4) Encoding specificity: match encoding and retrieval contexts (Tulving). (5) Proactive = old disrupts new; Retroactive = new disrupts old. (6) Loftus = misinformation effect + false memories. (7) Episodic = personal events; Semantic = facts; Procedural = skills (implicit). (8) Spacing effect = distribute practice sessions.'
    },
    references: [
        'Atkinson, R. C., & Shiffrin, R. M. (1968). Human memory: A proposed system and its control processes. <em>Psychology of Learning and Motivation, 2</em>, 89\u2013195.',
        'Baddeley, A. D. (2000). The episodic buffer: A new component of working memory? <em>Trends in Cognitive Sciences, 4</em>(11), 417\u2013423.',
        'Craik, F. I. M., & Lockhart, R. S. (1972). Levels of processing: A framework for memory research. <em>Journal of Verbal Learning and Verbal Behavior, 11</em>(6), 671\u2013684.',
        'Loftus, E. F. (2005). Planting misinformation in the human mind: A 30-year investigation of the malleability of memory. <em>Learning & Memory, 12</em>(4), 361\u2013366.',
        'Tulving, E. (1972). Episodic and semantic memory. In E. Tulving & W. Donaldson (Eds.), <em>Organization of memory</em>. Academic Press.'
    ]
});
