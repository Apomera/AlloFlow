/* ============================================================
   PasstheEPPP — Textbook Ch 21: Neurotransmitters, Endocrine System & Genetics
   Domain: Biological Bases of Behavior (12% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-21',
    domain: 'Biological Bases of Behavior',
    domainNumber: 4,
    title: 'Neurotransmitters, Endocrine System & Genetics',
    examWeight: '12%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests neurotransmitter systems, endocrine stress regulation, behavioral-genetic concepts, and sleep physiology. Learn pathway-level associations while avoiding “one chemical causes one disorder,” genetic determinism, or fixed biological values detached from population and context.</p>'
        },
        {
            heading: 'Major Neurotransmitters',
            content: '<p>Neurotransmitters act through multiple receptor subtypes and circuits. The table gives high-yield associations; “too little/too much” is an exam shorthand, not a direct diagnostic test or complete causal model:</p>' +
                '<table>' +
                '<tr><th>Neurotransmitter</th><th>Type</th><th>Selected functions</th><th>Lower-function associations</th><th>Higher-function/toxicity associations</th></tr>' +
                '<tr><td><strong>Dopamine (DA)</strong></td><td>Catecholamine</td><td>Reward, motivation, motor control, attention</td><td>Nigrostriatal dopamine-neuron loss is central in Parkinson disease; depression and ADHD are not simple dopamine-deficiency disorders</td><td>Mesolimbic dopamine dysregulation is one component of psychosis models; schizophrenia and mania are not global dopamine-excess states</td></tr>' +
                '<tr><td><strong>Serotonin (5-HT)</strong></td><td>Indolamine</td><td>Mood, sleep, appetite, aggression, impulse control</td><td>Serotonergic systems are implicated across mood, anxiety, OCD, sleep, and impulse-control research; low serotonin does not diagnose these conditions</td><td>Serotonin toxicity is a medication/drug-induced syndrome involving mental-status, autonomic, and neuromuscular findings—not merely “high mood serotonin”</td></tr>' +
                '<tr><td><strong>Norepinephrine (NE)</strong></td><td>Catecholamine</td><td>Arousal, alertness, fight-or-flight, attention, mood</td><td>Noradrenergic function is implicated in arousal, attention, and mood; these symptoms are nonspecific</td><td>Increased noradrenergic signaling may contribute to autonomic arousal in some contexts but does not alone explain anxiety or panic</td></tr>' +
                '<tr><td><strong>GABA</strong></td><td>Amino acid</td><td><strong>Primary inhibitory</strong> neurotransmitter \u2014 reduces neural excitability</td><td>Reduced inhibitory signaling can increase excitability and seizure risk; anxiety and Huntington disease are not global GABA-deficiency diagnoses</td><td>Drugs that enhance GABAergic signaling can cause sedation and, in combinations or overdose, dangerous CNS/respiratory depression</td></tr>' +
                '<tr><td><strong>Glutamate</strong></td><td>Amino acid</td><td><strong>Primary excitatory</strong> neurotransmitter \u2014 essential for learning and memory (LTP)</td><td>Glutamatergic dysfunction may impair plasticity and cognition, but a single “low glutamate” state is not clinically inferred</td><td>Excessive receptor activation can contribute to excitotoxic injury, including ischemia; roles in neurodegeneration are complex and disease-specific</td></tr>' +
                '<tr><td><strong>Acetylcholine (ACh)</strong></td><td>Cholinergic</td><td>Memory, learning, muscle contraction, attention, REM sleep</td><td>Cholinergic neuron loss/dysfunction occurs in Alzheimer disease; myasthenia gravis involves antibodies at the neuromuscular junction, not simply low brain ACh</td><td>Cholinergic excess can cause muscarinic and nicotinic toxicity, including secretions, weakness, fasciculations, and autonomic effects</td></tr>' +
                '<tr><td><strong>Endorphins</strong></td><td>Peptide</td><td>Natural pain relief, pleasure, stress reduction</td><td>Endogenous opioid signaling modulates pain, stress, and reward; individual pain sensitivity is multifactorial</td><td>Exogenous opioid excess—not “too many endorphins”—is the clinically important toxicity model</td></tr>' +
                '</table>' +
                '<p><strong>Dopamine pathways (EPPP tested):</strong></p>' +
                '<ul>' +
                '<li><strong>Mesolimbic</strong>: Salience, motivation, reinforcement, and reward-related learning; increased presynaptic dopamine function is associated with psychosis, but positive symptoms are not explained by a single pathway alone</li>' +
                '<li><strong>Mesocortical</strong>: Cognitive and motivational functions; altered prefrontal dopamine is one hypothesis for cognitive/negative symptoms, not a proven one-variable deficit</li>' +
                '<li><strong>Nigrostriatal</strong>: Motor control; degeneration = Parkinson\u2019s disease</li>' +
                '<li><strong>Tuberoinfundibular</strong>: Regulates prolactin; antipsychotic blockade = elevated prolactin (galactorrhea)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> For exams, associate mesolimbic dopamine dysregulation with positive psychotic symptoms and D2 blockade with antipsychotic effects/EPS/prolactin consequences. Contemporary schizophrenia models also involve glutamate, development, genetics, stress, cognition, and networks. GABA and glutamate are the major inhibitory and excitatory transmitters in the adult CNS; Alzheimer disease is not reducible to an ACh deficit.</p>',
            keyTerms: ['Dopamine', 'Serotonin', 'Norepinephrine', 'GABA', 'Glutamate', 'Acetylcholine', 'Endorphins', 'Mesolimbic', 'Mesocortical', 'Nigrostriatal', 'Dopamine hypothesis'],
            interactiveDiagram: {
                description: 'Four dopamine pathways: associations and D2-blockade effects',
                svg: '<svg viewBox="0 0 800 240" width="100%" role="img" aria-labelledby="ch21DaTitle ch21DaDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch21DaTitle">Four dopamine pathway associations</title><desc id="ch21DaDesc">Mesolimbic, mesocortical, nigrostriatal, and tuberoinfundibular pathways with selected functions, psychosis hypotheses, and possible effects of dopamine D2 receptor blockade. Associations are not one-chemical diagnoses.</desc><defs><linearGradient id="limbic" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#b91c1c"/></linearGradient><linearGradient id="cortical" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient><linearGradient id="nigro" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#047857"/></linearGradient><linearGradient id="tubero" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/></linearGradient></defs><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">Four Dopamine Pathways: Associations &amp; D2 Blockade</text><rect x="20" y="50" width="175" height="150" rx="10" fill="url(#limbic)" opacity="0.85"/><text x="107" y="80" text-anchor="middle" fill="#fff" font-weight="bold" font-size="15">Mesolimbic</text><text x="107" y="105" text-anchor="middle" fill="#fecaca" font-size="12">Reward &amp; Pleasure</text><line x1="30" y1="120" x2="185" y2="120" stroke="#fca5a5" stroke-width="1"/><text x="107" y="140" text-anchor="middle" fill="#fff" font-size="11">DYSREGULATION:</text><text x="107" y="155" text-anchor="middle" fill="#fff" font-weight="bold" font-size="13">Positive Symptoms</text><text x="107" y="180" text-anchor="middle" fill="#fecaca" font-size="10" font-style="italic">(Target of antipsychotics)</text><rect x="210" y="50" width="175" height="150" rx="10" fill="url(#cortical)" opacity="0.85"/><text x="297" y="80" text-anchor="middle" fill="#fff" font-weight="bold" font-size="15">Mesocortical</text><text x="297" y="105" text-anchor="middle" fill="#bfdbfe" font-size="12">Cognition / Exec. Func.</text><line x1="220" y1="120" x2="375" y2="120" stroke="#93c5fd" stroke-width="1"/><text x="297" y="140" text-anchor="middle" fill="#fff" font-size="11">HYPOTHESIS:</text><text x="297" y="155" text-anchor="middle" fill="#fff" font-weight="bold" font-size="13">Negative Symptoms</text><text x="297" y="180" text-anchor="middle" fill="#bfdbfe" font-size="10" font-style="italic">(effects vary by drug/person)</text><rect x="400" y="50" width="175" height="150" rx="10" fill="url(#nigro)" opacity="0.85"/><text x="487" y="80" text-anchor="middle" fill="#fff" font-weight="bold" font-size="15">Nigrostriatal</text><text x="487" y="105" text-anchor="middle" fill="#a7f3d0" font-size="12">Motor Control</text><line x1="410" y1="120" x2="565" y2="120" stroke="#6ee7b7" stroke-width="1"/><text x="487" y="140" text-anchor="middle" fill="#fff" font-size="11">BLOCKADE =</text><text x="487" y="155" text-anchor="middle" fill="#fff" font-weight="bold" font-size="13">EPS / Parkinsonism</text><text x="487" y="180" text-anchor="middle" fill="#a7f3d0" font-size="10" font-style="italic">(Degenerates in Parkinson\'s)</text><rect x="590" y="50" width="175" height="150" rx="10" fill="url(#tubero)" opacity="0.85"/><text x="677" y="80" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">Tuberoinfundibular</text><text x="677" y="105" text-anchor="middle" fill="#fde68a" font-size="12">Prolactin Regulation</text><line x1="600" y1="120" x2="755" y2="120" stroke="#fcd34d" stroke-width="1"/><text x="677" y="140" text-anchor="middle" fill="#fff" font-size="11">BLOCKADE =</text><text x="677" y="155" text-anchor="middle" fill="#fff" font-weight="bold" font-size="13">Hyperprolactinemia</text><text x="677" y="180" text-anchor="middle" fill="#fde68a" font-size="10" font-style="italic">(Galactorrhea / Gynecomastia)</text><text x="400" y="225" text-anchor="middle" fill="#94a3b8" font-size="12" font-style="italic">First-generation antipsychotics differ in affinity, dose, occupancy, kinetics, and off-target effects; D2 blockade across pathways helps explain common benefits and harms.</text></svg>'
            },
            knowledgeCheck: {
                question: 'A patient with schizophrenia is treated with a first-generation (typical) antipsychotic. His hallucinations and delusions improve, but he develops involuntary restlessness and an inability to sit still. Which dopamine pathway is responsible for this side effect, and what is the condition called?',
                options: [
                    'Mesolimbic pathway; tardive dyskinesia',
                    'Mesocortical pathway; avolition',
                    'Nigrostriatal pathway; akathisia',
                    'Tuberoinfundibular pathway; galactorrhea'
                ],
                answer: 2,
                rationale: 'Akathisia is characterized by subjective inner restlessness with observable motor activity and is associated with D2-blocking drugs, implicating nigrostriatal motor circuits in the classic pathway model. Do not infer it solely from “involuntary movement”: assess timing, subjective experience, other EPS, agitation, medications, and differential diagnoses.'
            }
        },
        {
            heading: 'The Endocrine System & Stress Response',
            content: '<p>The <strong>endocrine system</strong> communicates through <strong>hormones</strong> (slower but longer-lasting than neurotransmitters).</p>' +
                '<p><strong>Key glands and hormones:</strong></p>' +
                '<table>' +
                '<tr><th>Gland</th><th>Key Hormones</th><th>Functions</th></tr>' +
                '<tr><td><strong>Hypothalamus</strong></td><td>CRH, TRH, GnRH</td><td>Master regulator \u2014 links nervous and endocrine systems; controls pituitary</td></tr>' +
                '<tr><td><strong>Pituitary</strong></td><td>Anterior: ACTH, TSH, GH, FSH, LH, prolactin; posterior releases hypothalamically synthesized oxytocin and vasopressin/ADH</td><td>Coordinates endocrine axes, growth, reproduction, lactation, and water balance; “master gland” is shorthand because hypothalamic and peripheral feedback regulate it</td></tr>' +
                '<tr><td><strong>Adrenal glands</strong></td><td>Cortisol (cortex), Epinephrine/NE (medulla)</td><td>Stress response, metabolism, immune regulation, fight-or-flight</td></tr>' +
                '<tr><td><strong>Thyroid</strong></td><td>T3, T4</td><td>Metabolism, energy, development. Hypo = fatigue, depression, weight gain. Hyper = anxiety, weight loss, agitation.</td></tr>' +
                '<tr><td><strong>Pineal gland</strong></td><td>Melatonin</td><td>Regulates circadian rhythms and sleep-wake cycle</td></tr>' +
                '</table>' +
                '<p><strong>The HPA Axis (Stress Response):</strong></p>' +
                '<ol>' +
                '<li>Stress-related neural appraisal and circadian inputs engage hypothalamic paraventricular neurons → <strong>CRH</strong> release (corticotropin-releasing hormone)</li>' +
                '<li><strong>Anterior pituitary</strong> \u2192 releases <strong>ACTH</strong> (adrenocorticotropic hormone)</li>' +
                '<li><strong>Adrenal cortex</strong> \u2192 releases <strong>cortisol</strong></li>' +
                '<li>Cortisol influences metabolism, cardiovascular function, cognition, and immune activity; effects depend on timing, dose, tissue, receptor, and context rather than uniform “suppression”</li>' +
                '<li><strong>Negative feedback loop</strong>: Elevated cortisol signals hypothalamus/pituitary to stop producing CRH/ACTH</li>' +
                '</ol>' +
                '<p><strong>Chronic stress and cortisol:</strong></p>' +
                '<ul>' +
                '<li>Chronic stress and glucocorticoid dysregulation are associated with memory and hippocampal changes, but human causality is bidirectional and “cortisol damages the hippocampus” is too categorical</li>' +
                '<li>Suppresses immune function (psychoneuroimmunology)</li>' +
                '<li>Associated with depression, anxiety, PTSD, metabolic syndrome</li>' +
                '</ul>' +
                '<p><strong>Selye\u2019s General Adaptation Syndrome (GAS):</strong></p>' +
                '<ol>' +
                '<li><strong>Alarm</strong>: Fight-or-flight activation (sympathetic NS + adrenal medulla)</li>' +
                '<li><strong>Resistance</strong>: Sustained coping (cortisol maintains arousal)</li>' +
                '<li><strong>Exhaustion</strong>: Resources depleted; vulnerability to illness and breakdown</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> HPA sequence: hypothalamic CRH → pituitary ACTH → adrenal-cortex cortisol, regulated by circadian inputs and feedback. Thyroid disease can contribute to mood/cognitive symptoms and belongs in a clinically indicated differential; it does not impose one universal test before any MDD diagnosis. GAS is Selye’s historical alarm–resistance–exhaustion model, not a literal resource gauge for every stress response.</p>',
            keyTerms: ['HPA axis', 'Cortisol', 'CRH', 'ACTH', 'Pituitary', 'Adrenal', 'Thyroid', 'Melatonin', 'Selye', 'GAS', 'Psychoneuroimmunology']
        },
        {
            heading: 'Behavioral Genetics',
            content: '<p><strong>Behavioral genetics</strong> studies how genes and environment interact to influence behavior.</p>' +
                '<p><strong>Key research methods:</strong></p>' +
                '<table>' +
                '<tr><th>Method</th><th>Logic</th><th>Key Findings</th></tr>' +
                '<tr><td><strong>Twin studies</strong></td><td>Compare monozygotic twins, who share nearly all inherited sequence variation, with dizygotic twins, who share about half of segregating variants on average. Inference depends on assumptions about environments, ascertainment, measurement, and representativeness.</td><td>Estimates vary by phenotype definition, age, ancestry, cohort, environment, sampling, and method; fixed textbook percentages should not be treated as universal constants.</td></tr>' +
                '<tr><td><strong>Adoption studies</strong></td><td>Compare adopted children with biological parents (shared genes) vs. adoptive parents (shared environment)</td><td>Can help separate genetic relatedness from rearing context, but selective placement, prenatal factors, contact, measurement, and social context complicate causal inference</td></tr>' +
                '<tr><td><strong>Family studies</strong></td><td>Look at prevalence of traits across family members with varying genetic relatedness</td><td>Cannot separate shared genes from shared environment (limitation)</td></tr>' +
                '</table>' +
                '<p><strong>Key concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Heritability</strong>: The proportion of observed phenotypic variance statistically associated with genetic variance in a specified population and environment under a model. It is not immutability, individual causation, universality across groups, or proof that environmental intervention cannot work.</li>' +
                '<li><strong>Concordance rate</strong>: The probability that both twins share a trait. Higher MZ than DZ concordance = genetic contribution.</li>' +
                '<li><strong>Shared environment</strong>: Environmental factors that make siblings similar (e.g., same home, same SES)</li>' +
                '<li><strong>Nonshared environment</strong>: Environmental factors that make siblings different (e.g., different peer groups, different experiences)</li>' +
                '<li><strong>Gene–environment interaction (G×E)</strong>: Effects of genotype can differ across environments (and vice versa). The widely taught 5-HTTLPR × stress/depression example has produced conflicting findings; a large collaborative meta-analysis found no strong interaction, illustrating replication and measurement challenges.</li>' +
                '<li><strong>Epigenetics</strong>: Mechanisms such as DNA methylation and chromatin modification help regulate gene activity without changing DNA sequence. “On/off” is an oversimplification, marks can be tissue- and time-specific, and evidence for environmentally induced transgenerational inheritance in humans is difficult to distinguish from genetic, prenatal, social, and cultural transmission.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Heritability applies to <em>populations</em>, not individuals. A heritability of .80 for IQ does NOT mean 80% of YOUR intelligence is genetic \u2014 it means 80% of the VARIANCE in intelligence across the population is attributable to genetic variation. Higher MZ than DZ concordance is consistent with genetic contribution under study assumptions, while less-than-perfect MZ concordance is consistent with non-genetic and stochastic influences. No single concordance estimate “proves” a complete causal model.</p>',
            keyTerms: ['Twin studies', 'Adoption studies', 'Heritability', 'Concordance', 'MZ', 'DZ', 'Shared environment', 'Nonshared environment', 'Gene-environment interaction', 'Epigenetics'],
            knowledgeCheck: {
                question: 'A study estimates a trait’s heritability at .70 in one sampled population. Which conclusion is justified?',
                options: ['Seventy percent of each person’s trait is caused by genes.', 'The trait cannot be changed environmentally.', 'Under that study’s model and population conditions, genetic differences statistically account for about 70% of observed variance; the estimate need not generalize to other populations or environments.', 'The difference between two demographic groups is 70% genetic.'],
                answer: 2,
                rationale: 'Heritability is a population- and environment-specific variance statistic. It does not partition an individual, establish immutability, or explain between-group differences.'
            }
        },
        {
            heading: 'Sensation, Perception & Sleep',
            content: '<p><strong>Sensation vs. Perception:</strong></p>' +
                '<ul>' +
                '<li><strong>Sensation</strong>: Detection of physical stimuli (bottom-up processing)</li>' +
                '<li><strong>Perception</strong>: Interpretation of sensory information (top-down processing)</li>' +
                '</ul>' +
                '<p><strong>Key psychophysics concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Absolute threshold</strong>: Minimum stimulus intensity detected 50% of the time</li>' +
                '<li><strong>Difference threshold (JND)</strong>: Smallest detectable difference between two stimuli. <strong>Weber\u2019s Law</strong>: JND is a constant proportion of the original stimulus.</li>' +
                '<li><strong>Signal Detection Theory (SDT)</strong>: Detection depends on both sensitivity (d\u2019) and response bias (\u03b2). Accounts for motivation, expectation, and fatigue. Four outcomes: <strong>hit, miss, false alarm, correct rejection</strong>.</li>' +
                '</ul>' +
                '<p><strong>Sleep stages:</strong></p>' +
                '<table>' +
                '<tr><th>Stage</th><th>Brain Waves</th><th>Key Features</th></tr>' +
                '<tr><td><strong>N1 (NREM 1)</strong></td><td>Theta waves</td><td>Light sleep; hypnagogic hallucinations; muscle twitches</td></tr>' +
                '<tr><td><strong>N2 (NREM 2)</strong></td><td>Sleep spindles + K-complexes</td><td>Most of sleep time; memory consolidation begins</td></tr>' +
                '<tr><td><strong>N3 (NREM 3)</strong></td><td>Delta waves (slow-wave sleep)</td><td>Deepest sleep; physical restoration; night terrors and sleepwalking occur here (NOT in REM)</td></tr>' +
                '<tr><td><strong>REM</strong></td><td>Low-voltage, mixed-frequency, desynchronized EEG; sawtooth activity may occur</td><td>Rapid eye movements, markedly reduced skeletal-muscle tone with exceptions, variable dreaming, and roles in learning/emotional processing under active study</td></tr>' +
                '</table>' +
                '<p><strong>Key sleep concepts:</strong></p>' +
                '<ul>' +
                '<li>NREM–REM cycles average roughly 90–110 minutes in adults but vary within and between people and across age</li>' +
                '<li><strong>N3 decreases</strong> across the night; <strong>REM increases</strong></li>' +
                '<li><strong>Night terrors</strong> and <strong>sleepwalking</strong> occur in <strong>N3</strong> (slow-wave sleep), NOT REM</li>' +
                '<li>Nightmare disorder is usually associated with REM and detailed recall, but dysphoric dreams are not absolutely restricted to REM</li>' +
                '<li><strong>Circadian rhythms</strong>: Regulated by the <strong>suprachiasmatic nucleus (SCN)</strong> in the hypothalamus, influenced by light via the retinohypothalamic tract</li>' +
                '<li><strong>Melatonin</strong> (pineal gland): Promotes sleep; released in darkness</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Sleepwalking and night terrors = N3 (NOT REM). Nightmares = REM. Sleep spindles = N2. Delta waves = N3. Signal detection theory has four outcomes (hit, miss, false alarm, correct rejection). Weber\u2019s Law = JND is proportional.</p>',
            keyTerms: ['Sensation', 'Perception', 'Absolute threshold', 'Weber\u2019s Law', 'Signal detection theory', 'REM', 'NREM', 'Sleep stages', 'Delta waves', 'Night terrors', 'SCN', 'Melatonin'],
            expandableCase: {
                title: 'The Screaming Child',
                clinicalDescription: 'A 6-year-old boy sits bolt upright in bed approximately 90 minutes after falling asleep, screaming and thrashing. His eyes are open but he appears confused and unresponsive to his parents\u2019 attempts to comfort him. His heart rate is elevated and he is sweating profusely. After 5 minutes, he falls back to sleep. In the morning, he has absolutely no memory of the event.',
                diagnosis: 'Night Terror (N3 / Slow-Wave Sleep Parasomnia)',
                explanation: 'The vignette is most consistent with a disorder of arousal from NREM sleep, commonly arising from N3 in the first third of the night, with incomplete awakening, autonomic activation, confusion, and limited recall. The classic contrast is REM-associated nightmares with fuller alertness and recall, but real diagnosis also considers frequency, impairment, seizures, breathing disorders, medications, trauma, and safety.'
            }
        }
    ],
    aiCoda: {
        teaser: 'How can AI teach biological psychology without inventing chemical-imbalance stories?',
        content: '<p>AI can help compare pathways, rehearse HPA-axis order, interpret a heritability statement, or classify a sleep-stage vignette. It should not infer a person’s neurotransmitter level, genotype, endocrine state, sleep disorder, or medication need from conversation.</p>' +
            '<p>Biological shorthand is especially easy to misuse: depression is not “low serotonin,” schizophrenia is not “too much dopamine everywhere,” chronic stress is not a guaranteed hippocampal injury, and a high heritability estimate does not make a trait fixed. Artificial-network analogies to neurotransmitters, epigenetics, or hallucinations do not establish shared mechanisms or inner experience.</p>' +
            '<p>Use three labels in learner material: <strong>mechanism</strong> (what a pathway can do), <strong>association</strong> (what research links it with), and <strong>clinical inference</strong> (what cannot be concluded without assessment or testing). Keep uncertainty, population context, drug effects, and alternative explanations visible.</p>',
        studyNote: '💡 <strong>Study Note:</strong> (1) Neurotransmitters act in circuits and receptors; avoid one-chemical diagnoses. (2) D2 blockade: mesolimbic benefit model, nigrostriatal EPS, tuberoinfundibular prolactin effects. (3) HPA: CRH → ACTH → cortisol with feedback and circadian regulation. (4) Heritability is population/model specific, not individual causation or immutability. (5) The 5-HTTLPR × stress example is contested. (6) Human transgenerational epigenetic claims require caution. (7) REM has low-voltage mixed-frequency EEG; N3 disorders of arousal differ classically from REM nightmares.'
},
    references: [
        'Carlson, N. R., & Birkett, M. A. (2021). <em>Physiology of behavior</em> (13th ed.). Pearson.',
        'Plomin, R., DeFries, J. C., Knopik, V. S., & Neiderhiser, J. M. (2016). <em>Behavioral genetics</em> (7th ed.). Worth Publishers.',
        'Selye, H. (1974). <em>Stress without distress</em>. Lippincott.',
        'Stahl, S. M. (2021). <em>Stahl\u2019s essential psychopharmacology: Neuroscientific basis and practical applications</em> (5th ed.). Cambridge University Press.',
        'Border, R., et al. (2019). No support for historical candidate gene or candidate gene-by-interaction hypotheses for major depression across multiple large samples. <em>American Journal of Psychiatry, 176</em>(5), 376–387. https://doi.org/10.1176/appi.ajp.2018.18070881',
        'Culverhouse, R. C., et al. (2018). Collaborative meta-analysis finds no evidence of a strong interaction between stress and 5-HTTLPR genotype contributing to depression. <em>Molecular Psychiatry, 23</em>, 133–142. https://doi.org/10.1038/mp.2017.44',
        'National Human Genome Research Institute. <em>Heritability</em>. https://www.genome.gov/genetics-glossary/Heritability',
        'National Library of Medicine. <em>Sleep physiology</em>. https://www.ncbi.nlm.nih.gov/books/NBK19956/'
    ]
});
