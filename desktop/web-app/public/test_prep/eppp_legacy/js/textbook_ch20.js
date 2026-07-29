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
                title: "Classic Language Labels Sit Within Distributed Networks",
                description: "Two historical cards associate inferior frontal regions with Broca labels and posterior temporal regions with Wernicke labels. Both point to a distributed language-network card containing interacting frontal, temporal, and parietal regions plus dorsal and ventral connections. The figure keeps classic aphasia patterns available as exam shorthand while warning that these names are anatomically variable, functions are not one-to-one, and real lesion-symptom localization requires a full assessment.",
                svg: "<svg viewBox=\"0 0 960 390\" width=\"100%\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-labelledby=\"ch20LanguageTitle ch20LanguageDesc\"><title id=\"ch20LanguageTitle\">Classic language labels within distributed networks</title><desc id=\"ch20LanguageDesc\">Historical inferior-frontal Broca and posterior-temporal Wernicke labels point toward a distributed network of frontal, temporal, and parietal regions with dorsal and ventral connections. Aphasia patterns are useful shorthand but not one-to-one localization rules.</desc><defs><marker id=\"ch20LanguageArrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto\"><path d=\"M0 0L10 5L0 10Z\" fill=\"#94a3b8\"/></marker></defs><rect width=\"960\" height=\"390\" rx=\"20\" fill=\"#0f172a\"/><text x=\"480\" y=\"30\" text-anchor=\"middle\" fill=\"#f8fafc\" font-family=\"system-ui\" font-size=\"20\" font-weight=\"700\">Classic labels are landmarks inside a distributed language network</text><g font-family=\"system-ui\" text-anchor=\"middle\"><g transform=\"translate(40 65)\"><rect width=\"350\" height=\"125\" rx=\"14\" fill=\"#7f1d1d\" stroke=\"#f87171\" stroke-width=\"2\"/><text x=\"175\" y=\"30\" fill=\"#fff\" font-size=\"15\" font-weight=\"700\">INFERIOR FRONTAL REGIONS</text><text x=\"175\" y=\"56\" fill=\"#fee2e2\" font-size=\"13\">Historically called Broca&apos;s area</text><text x=\"175\" y=\"82\" fill=\"#fecaca\" font-size=\"12\">Often linked with speech planning and output</text><text x=\"175\" y=\"104\" fill=\"#fecaca\" font-size=\"12\">Lesions can affect more than fluency</text></g><g transform=\"translate(570 65)\"><rect width=\"350\" height=\"125\" rx=\"14\" fill=\"#1e3a8a\" stroke=\"#60a5fa\" stroke-width=\"2\"/><text x=\"175\" y=\"30\" fill=\"#fff\" font-size=\"15\" font-weight=\"700\">POSTERIOR TEMPORAL REGIONS</text><text x=\"175\" y=\"56\" fill=\"#dbeafe\" font-size=\"13\">Historically called Wernicke&apos;s area</text><text x=\"175\" y=\"82\" fill=\"#bfdbfe\" font-size=\"12\">Often linked with language comprehension</text><text x=\"175\" y=\"104\" fill=\"#bfdbfe\" font-size=\"12\">Anatomical definitions and deficits vary</text></g></g><path d=\"M215 190L365 225M745 190L595 225\" stroke=\"#94a3b8\" stroke-width=\"3\" marker-end=\"url(#ch20LanguageArrow)\"/><rect x=\"180\" y=\"220\" width=\"600\" height=\"105\" rx=\"16\" fill=\"#064e3b\" stroke=\"#34d399\" stroke-width=\"2\"/><text x=\"480\" y=\"248\" text-anchor=\"middle\" fill=\"#fff\" font-family=\"system-ui\" font-size=\"16\" font-weight=\"700\">DISTRIBUTED LANGUAGE NETWORK</text><g fill=\"#d1fae5\" font-family=\"system-ui\" font-size=\"13\" text-anchor=\"middle\"><text x=\"300\" y=\"280\">Frontal regions</text><text x=\"480\" y=\"280\">Temporal regions</text><text x=\"660\" y=\"280\">Parietal regions</text></g><path d=\"M335 285H445M515 285H625M300 300C390 340 570 340 660 300\" fill=\"none\" stroke=\"#6ee7b7\" stroke-width=\"3\" stroke-dasharray=\"6,4\"/><text x=\"480\" y=\"316\" text-anchor=\"middle\" fill=\"#a7f3d0\" font-family=\"system-ui\" font-size=\"12\">Dorsal and ventral connections; cortical and subcortical contributions</text><text x=\"480\" y=\"352\" text-anchor=\"middle\" fill=\"#fbbf24\" font-family=\"system-ui\" font-size=\"13\" font-weight=\"700\">Classic aphasia labels are exam shorthand, not one-region / one-function rules.</text><text x=\"480\" y=\"375\" text-anchor=\"middle\" fill=\"#cbd5e1\" font-family=\"system-ui\" font-size=\"12\">Real localization uses the complete language, neurological, and imaging pattern.</text></svg>"
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
