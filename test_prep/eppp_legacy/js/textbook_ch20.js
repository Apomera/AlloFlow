/* ============================================================
   PasstheEPPP — Textbook Ch 20: Neuroanatomy & Brain Function
   Domain: Biological Bases of Behavior (12% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-20',
    domain: 'Biological Bases of Behavior',
    domainNumber: 4,
    title: 'Neuroanatomy & Brain Function',
    examWeight: '12%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests high-yield associations between neural systems and behavior. Use them as localization hypotheses, not one-symptom/one-lesion rules: real deficits depend on lesion location and extent, connected networks, timing, premorbid function, task demands, and recovery.</p>'
        },
        {
            heading: 'The Neuron & Neural Communication',
            content: '<p><strong>The neuron</strong> is the basic unit of the nervous system.</p>' +
                '<p><strong>Structure:</strong></p>' +
                '<ul>' +
                '<li><strong>Dendrites</strong>: Receive incoming signals from other neurons</li>' +
                '<li><strong>Cell body (soma)</strong>: Contains the nucleus; integrates incoming signals</li>' +
                '<li><strong>Axon</strong>: Transmits electrical impulse (action potential) away from the cell body</li>' +
                '<li><strong>Myelin sheath</strong>: Fatty insulation that speeds conduction (produced by Schwann cells in PNS, oligodendrocytes in CNS). Gaps = <strong>Nodes of Ranvier</strong> (saltatory conduction)</li>' +
                '<li><strong>Terminal buttons / synaptic knobs</strong>: Release neurotransmitters into the synapse</li>' +
                '</ul>' +
                '<p><strong>Action potential:</strong></p>' +
                '<ul>' +
                '<li><strong>Resting potential</strong>: Often taught as about −70 mV, but it varies by neuron, membrane conductances, and conditions</li>' +
                '<li><strong>Threshold</strong>: Often illustrated near −55 mV; it is not a universal fixed voltage and depends on membrane state and location</li>' +
                '<li><strong>All-or-none principle</strong>: The neuron either fires completely or not at all. Intensity is coded by <em>firing rate</em>, not action potential size.</li>' +
                '<li><strong>Refractory period</strong>: Absolute (cannot fire) and relative (can fire with stronger stimulus)</li>' +
                '</ul>' +
                '<p><strong>Synaptic transmission:</strong> Action potential \u2192 Ca\u00b2\u207a enters terminal \u2192 vesicles release neurotransmitters into synapse \u2192 bind to receptors on postsynaptic neuron \u2192 excitatory (EPSP) or inhibitory (IPSP) \u2192 summation determines whether postsynaptic neuron fires.</p>' +
                '<p><strong>EPPP Tip:</strong> Know the all-or-none principle and the difference between absolute and relative refractory periods. Multiple sclerosis involves inflammatory demyelination and neuroaxonal injury in the central nervous system; effects vary by lesion location and can disrupt conduction rather than producing one uniform deficit.</p>',
            keyTerms: ['Neuron', 'Dendrites', 'Axon', 'Myelin', 'Action potential', 'All-or-none', 'Refractory period', 'Synapse', 'EPSP', 'IPSP']
        },
        {
            heading: 'Cerebral Cortex: The Four Lobes',
            content: '<p>The four-lobe scheme is a useful anatomical organizer. Functions emerge from distributed cortical–subcortical networks, so the table lists common associations rather than exclusive modules or certain lesion outcomes:</p>' +
                '<table>' +
                '<tr><th>Lobe</th><th>Location</th><th>Key Functions</th><th>Damage Produces</th></tr>' +
                '<tr><td><strong>Frontal</strong></td><td>Front of brain</td><td>Executive functions (planning, judgment, inhibition), motor control (primary motor cortex = precentral gyrus), personality, working memory, Broca\u2019s area (speech production)</td><td>Possible executive, motivational, social-behavioral, language, or contralateral motor changes depending on region and network; “personality change” is not specific to all frontal lesions</td></tr>' +
                '<tr><td><strong>Parietal</strong></td><td>Top-back</td><td>Somatosensory processing (primary somatosensory cortex = postcentral gyrus), spatial awareness, body perception</td><td>Neglect is commonly associated with right-hemisphere attention-network injury that often includes parietal regions; other lesions can produce somatosensory, praxis, calculation, writing, or spatial deficits</td></tr>' +
                '<tr><td><strong>Temporal</strong></td><td>Sides</td><td>Auditory processing (primary auditory cortex), language comprehension (Wernicke\u2019s area), memory (hippocampus), face recognition (fusiform gyrus)</td><td>Possible language, auditory, recognition, or memory deficits depending on side and involved temporal/occipitotemporal or medial-temporal networks</td></tr>' +
                '<tr><td><strong>Occipital</strong></td><td>Back</td><td>Visual processing (primary visual cortex)</td><td>Possible visual-field loss, cortical visual impairment, or higher-order visual deficits; syndromes depend on lesion extent and connected pathways</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> High-yield associations are frontal networks with executive/social-motor functions, dominant perisylvian networks with language, and right-lateralized attention networks with left neglect. In an actual case, infer a network hypothesis and differential—not a diagnosis from one symptom.</p>',
            keyTerms: ['Frontal lobe', 'Parietal lobe', 'Temporal lobe', 'Occipital lobe', 'Motor cortex', 'Somatosensory cortex', 'Contralateral neglect', 'Phineas Gage']
        },
        {
            heading: 'Language Areas: Broca\u2019s and Wernicke\u2019s',
            content: '<p>The classic Broca–Wernicke model remains common exam vocabulary, but contemporary language neuroscience describes distributed dorsal and ventral networks with substantial individual variation:</p>' +
                '<table>' +
                '<tr><th>Area</th><th>Location</th><th>Function</th><th>Aphasia Type</th><th>Characteristics</th></tr>' +
                '<tr><td><strong>Broca\u2019s area</strong></td><td>Left frontal lobe (inferior frontal gyrus)</td><td>Classically associated with speech/language production; inferior frontal regions participate in broader language and control networks</td><td><strong>Broca\u2019s (expressive/nonfluent) aphasia</strong></td><td>Nonfluent, effortful output with agrammatism may occur; comprehension is often relatively better than expression but can be impaired, especially for syntactically complex material.</td></tr>' +
                '<tr><td><strong>Wernicke\u2019s area</strong></td><td>Left temporal lobe (superior temporal gyrus)</td><td>Classically associated with comprehension; posterior temporal regions participate in distributed lexical-semantic and auditory-language networks</td><td><strong>Wernicke\u2019s (receptive/fluent) aphasia</strong></td><td>Fluent output with paraphasias or neologisms and impaired auditory comprehension/repetition may occur. Awareness of errors varies and should not be assumed absent.</td></tr>' +
                '</table>' +
                '<p><strong>Additional aphasias:</strong></p>' +
                '<ul>' +
                '<li><strong>Conduction aphasia</strong>: Disproportionately impaired repetition with relatively fluent output and comparatively preserved comprehension. The classical account emphasizes arcuate-fasciculus disconnection, but cortical and broader dorsal-stream lesions can also produce the syndrome.</li>' +
                '<li><strong>Global aphasia</strong>: Severe impairment across multiple language modalities, usually after extensive dominant-hemisphere perisylvian network injury—not merely two small “area” lesions.</li>' +
                '</ul>' +
                '<p><strong>Mnemonic:</strong> <strong>B</strong>roca\u2019s = <strong>B</strong>roken speech. <strong>W</strong>ernicke\u2019s = <strong>W</strong>ords are wrong (but fluent).</p>',
            keyTerms: ['Broca\u2019s area', 'Wernicke\u2019s area', 'Expressive aphasia', 'Receptive aphasia', 'Conduction aphasia', 'Arcuate fasciculus', 'Global aphasia'],
            interactiveDiagram: {
                description: 'Classic language model and modern network qualification',
                svg: '<svg viewBox="0 0 800 340" width="100%" role="img" aria-labelledby="ch20LangTitle ch20LangDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch20LangTitle">Classic language areas in a left lateral brain view</title><desc id="ch20LangDesc">Broca-associated inferior frontal and Wernicke-associated posterior temporal regions are joined by a dotted dorsal pathway. A note explains that actual language relies on distributed dorsal and ventral networks and lesion patterns vary.</desc><defs><linearGradient id="brainGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1e293b"/></linearGradient></defs><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">Key Language Areas (Left Hemisphere Lateral View)</text><path d="M 250 180 C 250 80, 500 80, 550 180 C 580 230, 500 280, 400 250 C 350 250, 250 280, 250 180 Z" fill="url(#brainGrad)" stroke="#64748b" stroke-width="2"/><path d="M 430 150 C 430 150, 480 230, 530 250" fill="none" stroke="#64748b" stroke-width="2"/><path d="M 400 95 C 400 95, 380 170, 390 200" fill="none" stroke="#64748b" stroke-width="2"/><text x="320" y="130" text-anchor="middle" fill="#64748b" font-weight="bold" font-size="18">Frontal</text><text x="460" y="120" text-anchor="middle" fill="#64748b" font-weight="bold" font-size="18">Parietal</text><text x="520" y="180" text-anchor="middle" fill="#64748b" font-weight="bold" font-size="18">Occipital</text><text x="400" y="210" text-anchor="middle" fill="#64748b" font-weight="bold" font-size="18">Temporal</text><circle cx="340" cy="190" r="25" fill="#ef4444" opacity="0.8"/><text x="210" y="195" text-anchor="middle" fill="#fca5a5" font-weight="bold" font-size="14">Broca\'s Area</text><text x="210" y="210" text-anchor="middle" fill="#fecaca" font-size="10">(Speech Production)</text><circle cx="450" cy="200" r="25" fill="#3b82f6" opacity="0.8"/><text x="580" y="200" text-anchor="middle" fill="#93c5fd" font-weight="bold" font-size="14">Wernicke\'s Area</text><text x="580" y="215" text-anchor="middle" fill="#bfdbfe" font-size="10">(Comprehension)</text><path d="M 350 170 Q 400 130 450 180" fill="none" stroke="#10b981" stroke-width="6" stroke-dasharray="4,2" opacity="0.8"/><text x="400" y="150" text-anchor="middle" fill="#6ee7b7" font-weight="bold" font-size="12">Arcuate Fasciculus</text><text x="400" y="300" text-anchor="middle" fill="#cbd5e1" font-size="12">Classic Broca pattern: nonfluent output; comprehension relatively better, not always intact</text><text x="400" y="320" text-anchor="middle" fill="#cbd5e1" font-size="12">Classic Wernicke pattern: fluent output with impaired comprehension; awareness varies</text></svg>'
            },
            knowledgeCheck: {
                question: 'A 62-year-old stroke patient speaks fluently and at normal speed, but his speech is incomprehensible ("The sitter walked in the greeble and then the frandling went on"). When asked to repeat a phrase spoken by the examiner, he produces the wrong words but seems unaware of the errors. His comprehension is severely impaired. This presentation is most consistent with damage to:',
                options: [
                    'Broca\'s area in the left frontal lobe',
                    'Wernicke\'s area in the left temporal lobe',
                    'The arcuate fasciculus',
                    'The right parietal lobe'
                ],
                answer: 1,
                rationale: 'The vignette best matches the classic Wernicke/fluent aphasia pattern: fluent output with paraphasic or neologistic errors and markedly impaired comprehension. Posterior dominant-hemisphere language-network injury is the high-yield association. Awareness can vary, and Broca aphasia may include comprehension deficits; real localization requires a full language and neurological assessment.'
            }
        },
        {
            heading: 'Subcortical Structures',
            content: '<table>' +
                '<tr><th>Structure</th><th>Location</th><th>Key Functions</th><th>Clinical Significance</th></tr>' +
                '<tr><td><strong>Thalamus</strong></td><td>Central brain</td><td>Major set of nuclei that relays and modulates sensory, motor, limbic, cognitive, arousal, and sleep-related information. Each major sensory system except the initial olfactory pathway has a thalamic relay before primary cortex.</td><td>Damage: sensory deficits, pain syndromes, consciousness disorders</td></tr>' +
                '<tr><td><strong>Hypothalamus</strong></td><td>Below thalamus</td><td>Coordinates autonomic, endocrine (via pituitary), homeostatic, circadian, motivational, and defensive functions. The historical “Four Fs” mnemonic is crude and should not be treated as a complete functional model.</td><td>Disruption of hunger, thirst, temperature regulation, sleep</td></tr>' +
                '<tr><td><strong>Hippocampus</strong></td><td>Medial temporal lobe</td><td>Critical for encoding and consolidation of new episodic/declarative memories and for relational/spatial representations; it does not simply “convert” a unitary short-term store into all long-term memory.</td><td>H.M. (bilateral removal) \u2192 severe anterograde amnesia; Alzheimer\u2019s (early hippocampal damage)</td></tr>' +
                '<tr><td><strong>Amygdala</strong></td><td>Anterior temporal lobe</td><td>Participates in salience, associative learning, threat-related learning, valuation, and modulation of memory within broader networks; it is not a standalone fear center or universal preconscious threat detector.</td><td>Kl\u00fcver-Bucy syndrome (bilateral damage): flat affect, hypersexuality, hyperorality</td></tr>' +
                '<tr><td><strong>Basal ganglia</strong></td><td>Deep cerebral hemispheres</td><td>Motor planning, procedural memory, habit formation, reward processing</td><td>Parkinson\u2019s disease (DA depletion); Huntington\u2019s (degeneration of caudate/putamen)</td></tr>' +
                '<tr><td><strong>Cerebellum</strong></td><td>Posterior/inferior</td><td>Motor coordination, balance, motor learning, procedural timing</td><td>"Cerebellar signs": ataxia (uncoordinated movement), intention tremor, slurred speech (dysarthria)</td></tr>' +
                '</table>' +
                '<p><strong>Brainstem</strong> (midbrain, pons, medulla):</p>' +
                '<ul>' +
                '<li><strong>Medulla oblongata</strong>: Contains nuclei and pathways important for respiration, cardiovascular regulation, swallowing, and other functions. Effects of damage range widely; extensive bilateral injury can be life-threatening, but “damage = death” is false.</li>' +
                '<li><strong>Pons</strong>: Sleep, arousal, facial expression, connects cerebrum to cerebellum</li>' +
                '<li><strong>Midbrain</strong>: Contains substantia nigra (dopamine production; depleted in Parkinson\u2019s) and superior/inferior colliculi (visual/auditory reflexes)</li>' +
                '<li><strong>Reticular activating system (RAS)</strong>: Spans brainstem; controls arousal, consciousness, and sleep-wake transitions</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Use these as associations: medial temporal systems support new episodic/declarative memory; amygdala networks support salience and associative emotional learning; thalamic nuclei relay/modulate major systems, with initial olfactory pathways as the classic exception; hypothalamus supports homeostasis and neuroendocrine/autonomic regulation; basal-ganglia circuits are implicated in Parkinson and Huntington diseases.</p>',
            keyTerms: ['Thalamus', 'Hypothalamus', 'Hippocampus', 'Amygdala', 'Basal ganglia', 'Cerebellum', 'Brainstem', 'Medulla', 'RAS', 'H.M.', 'Kl\u00fcver-Bucy'],
            expandableCase: {
                title: 'The Man Who Couldn\'t Make New Memories',
                clinicalDescription: 'Patient H.M. (Henry Molaison) underwent bilateral medial-temporal resection for severe epilepsy in 1953, involving much of the hippocampal formation and adjacent cortex. He developed profound anterograde amnesia for new episodic/declarative material, with temporally graded retrograde loss, while working memory under some conditions and several forms of nondeclarative learning were relatively preserved.',
                diagnosis: 'Anterograde Amnesia (Hippocampal Lesion)',
                explanation: 'H.M.\'s case is the most famous neuropsychological case study in history. H.M.’s case provided influential evidence that medial-temporal systems are critical for establishing many new declarative memories while some working-memory and nondeclarative learning capacities can be dissociated. It did not isolate the hippocampus perfectly, prove a simple short-term-to-long-term converter, or show that all implicit learning belongs to only the basal ganglia and cerebellum.'
            }
        },
        {
            heading: 'Lateralization & Split-Brain Research',
            content: '<p>The two cerebral hemispheres are connected by the <strong>corpus callosum</strong>. While most functions are bilateral, some are lateralized:</p>' +
                '<table>' +
                '<tr><th>Left Hemisphere</th><th>Right Hemisphere</th></tr>' +
                '<tr><td>Language is left-lateralized in most people, with task and individual variation</td><td>Some visuospatial attention and face-processing functions show rightward specialization</td></tr>' +
                '<tr><td colspan="2">Logic, creativity, holistic thought, and personality are not assigned to one hemisphere; complex cognition recruits bilateral networks.</td></tr>' +
                '<tr><td>Some symbolic language and calculation components may be left-weighted</td><td>Face processing often shows rightward bias, especially in fusiform/occipitotemporal networks</td></tr>' +
                '<tr><td colspan="2">Affective lateralization findings are task- and model-dependent; “left positive/right negative” is too absolute.</td></tr>' +
                '</table>' +
                '<p><strong>Sperry\u2019s split-brain studies</strong> (Nobel Prize, 1981): In a small, unusual clinical population after callosotomy for severe epilepsy, carefully lateralized tasks revealed reduced interhemispheric transfer and striking dissociations; the hemispheres did not become wholly independent in ordinary life. Key finding: when an image was presented to the <em>left visual field</em> (processed by right hemisphere), the patient could not <em>name</em> it (because Broca\u2019s area is in the left hemisphere) but could point to it with their <em>left hand</em> (controlled by right hemisphere).</p>' +
                '<p><strong>Contralateral organization:</strong> Many motor and somatosensory pathways are predominantly contralateral, with important bilateral and ipsilateral contributions. Each visual field projects initially to the contralateral hemisphere from both eyes.</p>' +
                '<p><strong>Neuroplasticity:</strong> The brain\u2019s ability to reorganize neural pathways based on experience. Greatest in early development but continues throughout life. Key to recovery after stroke and injury.</p>' +
                '<p><strong>EPPP Tip:</strong> Language is left-lateralized in most people, while some attention and face-processing functions show rightward specialization. Reject “logical left brain/creative right brain” personality claims. Split-brain tasks demonstrate specialized processing and restricted transfer under specific conditions, not two universally independent minds.</p>',
            keyTerms: ['Lateralization', 'Corpus callosum', 'Split-brain', 'Sperry', 'Neuroplasticity', 'Contralateral', 'Left hemisphere', 'Right hemisphere'],
            knowledgeCheck: {
                question: 'Which statement best reflects contemporary understanding of hemispheric lateralization?',
                options: ['Logical people use the left hemisphere, while creative people use the right.', 'Each hemisphere becomes a fully independent mind whenever the corpus callosum is absent.', 'Some functions show relative lateralization, but complex cognition and personality depend on interacting bilateral networks.', 'All language is housed in two sharply bounded left-hemisphere centers in every person.'],
                answer: 2,
                rationale: 'Relative specialization is real—for example, language is left-lateralized in most people and some visuospatial/face functions show rightward biases—but the popular logical-left/creative-right personality dichotomy and strict two-center language model are misleading.'
            }
        }
    ],
    aiCoda: {
        teaser: 'How should AI help learners reason about brains without turning metaphors into neuroscience?',
        content: '<p>AI can quiz anatomical associations, compare classic and network models, or help learners trace how a symptom suggests a localization hypothesis. It must not convert a sparse vignette into a certain lesion, diagnosis, prognosis, or emergency decision.</p>' +
            '<p>Artificial neural networks borrow vocabulary from neuroscience but tokens, parameters, attention layers, and model training are not action potentials, synapses, hemispheres, memory systems, or lived experience. Claims that a model has an amygdala-like module, is “permanently left-brained,” or cannot show selective deficits are empirical engineering claims—not conclusions available from analogy.</p>' +
            '<p>Use a network-first check: What function is impaired? Which components and connections could contribute? What alternatives, laterality, timing, sensory/motor demands, medications, language background, and testing evidence are missing? AI-generated localization remains a study hypothesis that requires authoritative sources and qualified neurological or neuropsychological assessment.</p>',
        studyNote: '💡 <strong>Study Note:</strong> (1) Classic Broca pattern = nonfluent output with relatively better—not always intact—comprehension. (2) Classic Wernicke pattern = fluent paraphasic output with impaired comprehension; awareness varies. (3) Conduction aphasia is a dorsal-network syndrome, not an arcuate-only certainty. (4) Medial temporal systems support new declarative memory; H.M. retained some working and nondeclarative learning. (5) Thalamus, hypothalamus, amygdala, and basal ganglia are heterogeneous networks. (6) Reject logical-left/creative-right myths; lateralization is relative and complex cognition is bilateral.'
},
    references: [
        'Bear, M. F., Connors, B. W., & Paradiso, M. A. (2020). <em>Neuroscience: Exploring the brain</em> (4th ed.). Jones & Bartlett Learning.',
        'Gazzaniga, M. S. (2000). Cerebral specialization and interhemispheric communication: Does the corpus callosum enable the human condition? <em>Brain, 123</em>(7), 1293\u20131326.',
        'Kolb, B., & Whishaw, I. Q. (2021). <em>Fundamentals of human neuropsychology</em> (8th ed.). Worth Publishers.',
        'Purves, D., Augustine, G. J., Fitzpatrick, D., Hall, W. C., LaMantia, A. S., & White, L. E. (2018). <em>Neuroscience</em> (6th ed.). Sinauer Associates.',
        'Corballis, M. C. (2014). Left brain, right brain: Facts and fantasies. <em>PLoS Biology, 12</em>(1), e1001767. https://doi.org/10.1371/journal.pbio.1001767',
        'Bernal, B., & Ardila, A. (2009). The role of the arcuate fasciculus in conduction aphasia. <em>Brain, 132</em>(9), 2309–2316. https://doi.org/10.1093/brain/awp206',
        'National Library of Medicine. <em>Brain systems underlying declarative and procedural memories</em>. https://www.ncbi.nlm.nih.gov/books/NBK10940/',
        'National Library of Medicine. <em>Neuroanatomy, thalamus</em>. https://www.ncbi.nlm.nih.gov/books/NBK542184/'
    ]
});
