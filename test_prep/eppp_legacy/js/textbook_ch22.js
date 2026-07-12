/* ============================================================
   PasstheEPPP — Textbook Ch 22: Clinical Neuropsychology & Neurological Disorders
   Domain: Biological Bases of Behavior (12% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-22',
    domain: 'Biological Bases of Behavior',
    domainNumber: 4,
    title: 'Clinical Neuropsychology & Neurological Disorders',
    examWeight: '12%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP uses clinical vignettes to test neurological and neuropsychological associations. In real assessment, symptoms rarely identify one lesion or disease by themselves: integrate onset and course, functional change, neurological findings, medications/substances, medical status, sensory and language access, imaging/labs when indicated, and formal cognitive testing.</p>'
        },
        {
            heading: 'Agnosias, Apraxias & Aphasias',
            content: '<p>These three "A\u2019s" are the most tested neuropsychological syndromes:</p>' +
                '<table>' +
                '<tr><th>Syndrome</th><th>Definition</th><th>Key Types</th></tr>' +
                '<tr><td><strong>Agnosia</strong></td><td>Disproportionate impairment recognizing or identifying stimuli that is not explained by elementary sensory loss, language, attention, or global cognitive impairment</td><td><strong>Visual agnosia</strong> (can\u2019t recognize objects by sight); <strong>Prosopagnosia</strong> (can\u2019t recognize faces; fusiform gyrus); <strong>Anosognosia</strong> (unaware of one\u2019s own deficit; right parietal); <strong>Auditory agnosia</strong> (can\u2019t recognize sounds)</td></tr>' +
                '<tr><td><strong>Apraxia</strong></td><td>Impaired execution or conceptualization of learned purposeful actions not adequately explained by primary weakness, sensory loss, comprehension, or incoordination</td><td><strong>Ideomotor apraxia</strong> (can\u2019t pantomime actions on command but can do them spontaneously); <strong>Ideational apraxia</strong> (can\u2019t sequence complex actions); <strong>Constructional apraxia</strong> (can\u2019t copy drawings; right parietal)</td></tr>' +
                '<tr><td><strong>Aphasia</strong></td><td>Language impairment due to brain damage</td><td>Broca\u2019s (nonfluent/expressive), Wernicke\u2019s (fluent/receptive), Conduction (can\u2019t repeat), Global (both production + comprehension), Anomic (word-finding difficulty)</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> <strong>Anosognosia</strong> (unaware of deficit) is commonly tested. It commonly occurs after right-hemisphere injury and can accompany neglect, but awareness depends on the deficit and distributed monitoring networks. It is not simply conscious denial; assessment should also consider comprehension, delirium, mood, communication, and context.</p>',
            keyTerms: ['Agnosia', 'Prosopagnosia', 'Anosognosia', 'Apraxia', 'Ideomotor', 'Constructional', 'Aphasia', 'Anomic aphasia']
        },
        {
            heading: 'Amnesia Syndromes',
            content: '<table>' +
                '<tr><th>Type</th><th>Definition</th><th>Brain Area</th><th>Key Example</th></tr>' +
                '<tr><td><strong>Anterograde amnesia</strong></td><td>Marked difficulty establishing new memories after onset; severity and affected memory systems vary, and working or nondeclarative learning may be relatively preserved</td><td>Bilateral medial-temporal or diencephalic memory networks are common associations</td><td><strong>H.M.</strong> developed profound declarative anterograde amnesia after bilateral medial-temporal resection while retaining some working and nondeclarative learning</td></tr>' +
                '<tr><td><strong>Retrograde amnesia</strong></td><td>Cannot retrieve memories from <em>before</em> injury</td><td>Variable; temporal gradient</td><td>Often follows a temporal gradient (Ribot\u2019s Law): recent memories are lost most completely; remote memories are relatively preserved.</td></tr>' +
                '<tr><td><strong>Korsakoff syndrome</strong></td><td>Severe amnesia + <strong>confabulation</strong></td><td>Mammillary bodies, thalamus</td><td>Results from thiamine deficiency and is commonly—but not exclusively—associated with severe alcohol use disorder, malnutrition, hyperemesis, bariatric surgery, cancer, or other causes. Wernicke encephalopathy is an emergency; the full classic triad is often absent.</td></tr>' +
                '<tr><td><strong>Transient global amnesia</strong></td><td>Sudden onset anterograde + retrograde amnesia lasting hours</td><td>Transient medial-temporal dysfunction; etiology remains uncertain, with migraine-related, venous, ischemic, and other hypotheses</td><td>Typical episodes resolve within 24 hours but leave an amnestic gap and can recur; first or atypical acute amnesia requires evaluation for stroke, seizure, toxic/metabolic causes, and other emergencies</td></tr>' +
                '</table>' +
                '<p><strong>Critical distinction:</strong></p>' +
                '<ul>' +
                '<li><strong>Declarative (explicit) memory</strong> depends on medial-temporal and diencephalic systems interacting with distributed cortex; “amnesia” is heterogeneous</li>' +
                '<li><strong>Nondeclarative learning</strong> includes multiple systems (skills/habits, priming, conditioning) and may be relatively preserved in some amnesias; it is not guaranteed intact</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> <strong>Korsakoff</strong> = thiamine deficiency + confabulation + chronic alcohol use. <strong>Confabulation</strong> = unintentional fabrication of memories (not lying; the patient genuinely believes the false memories). H.M. = anterograde amnesia with preserved procedural memory.</p>',
            keyTerms: ['Anterograde amnesia', 'Retrograde amnesia', 'Korsakoff syndrome', 'Confabulation', 'Ribot\u2019s Law', 'H.M.', 'Thiamine', 'Wernicke encephalopathy'],
            expandableCase: {
                title: 'The Man Who Fills In the Gaps',
                clinicalDescription: 'A 58-year-old man with a 30-year history of heavy alcohol use is brought to the hospital after being found confused and ataxic. After treatment, his confusion clears but severe memory impairment persists. When asked what he did yesterday, he cheerfully reports a detailed story about going fishing with his brother \u2014 but his brother lives in another state and has not visited in years. The patient does not appear to be lying; he genuinely believes his account.',
                diagnosis: 'Korsakoff Syndrome (Confabulation)',
                explanation: 'This presentation is consistent with Wernicke–Korsakoff syndrome related to thiamine deficiency in the context of long-term alcohol use. Confabulation is unintentional false memory production, not deliberate lying, but it is variable rather than required. Wernicke encephalopathy is a medical emergency warranting prompt parenteral thiamine based on clinical suspicion; do not wait for the full triad.'
            }
        },
        {
            heading: 'Dementia Types',
            content: '<p>Major neurocognitive disorders can have overlapping or mixed pathologies. The table lists common patterns; diagnosis requires decline from prior function, interference with independence for major NCD, history/examination, and appropriate testing:</p>' +
                '<table>' +
                '<tr><th>Type</th><th>Prevalence</th><th>Neuropathology</th><th>Key Features</th></tr>' +
                '<tr><td><strong>Alzheimer\u2019s disease</strong></td><td>Most common dementia diagnosis; estimates vary by population and method</td><td>Amyloid plaques + neurofibrillary tangles; hippocampal atrophy; ACh deficit</td><td>Typically gradual and progressive. An amnestic presentation is common, but language, visuospatial, or executive presentations can occur, and pathology may be mixed.</td></tr>' +
                '<tr><td><strong>Vascular dementia</strong></td><td>Common and frequently mixed with neurodegenerative pathology</td><td>Cerebrovascular disease (strokes, ischemia)</td><td>Course may be stepwise, abrupt, gradual, or fluctuating depending on cerebrovascular burden and ongoing events. Executive/processing-speed and focal findings are common but not universal.</td></tr>' +
                '<tr><td><strong>Lewy body dementia</strong></td><td>Common but prevalence ranking varies and mixed pathology is frequent</td><td>Alpha-synuclein (Lewy body) deposits</td><td><strong>Visual hallucinations</strong> (often detailed, recurring), <strong>fluctuating cognition</strong>, <strong>Parkinsonian motor features</strong> (rigidity, bradykinesia), and <strong>REM sleep behavior disorder</strong>. Some people have severe antipsychotic sensitivity. Typical agents such as haloperidol generally should be avoided; if symptoms create serious distress or danger, specialist-guided risk–benefit decisions may use selected agents cautiously at the lowest effective dose.</td></tr>' +
                '<tr><td><strong>Frontotemporal dementia (FTD)</strong></td><td>Younger onset (40s\u201360s)</td><td>Frontal and temporal lobe atrophy (Pick bodies in Pick\u2019s disease variant)</td><td>Behavioral-variant FTD often begins with progressive behavior, executive, or social-cognitive change; primary progressive aphasia syndromes begin with language decline. Memory can be affected and age of onset varies.</td></tr>' +
                '</table>' +
                '<p><strong>Distinguish from:</strong></p>' +
                '<ul>' +
                '<li><strong>Depression-related cognitive symptoms</strong>: “Pseudodementia” is an imprecise historical label. Depression and neurocognitive disease can coexist; response style does not diagnose either condition, and cognition may not fully normalize with mood improvement.</li>' +
                '<li><strong>Delirium</strong>: Acute disturbance in attention/awareness with fluctuation and additional cognitive change, due to a medical condition, substance/medication, toxin, withdrawal, or multiple causes. It requires urgent evaluation; outcomes include recovery, persistence, decline, or death, especially in vulnerable patients.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> High-yield patterns: Alzheimer disease is usually gradual/progressive; vascular cognitive impairment varies with vascular injury; DLB commonly includes fluctuations, recurrent visual hallucinations, REM sleep behavior disorder, and parkinsonism; FTD syndromes emphasize early behavioral/executive or language change. Delirium is acute/fluctuating and urgent. Avoid absolute antipsychotic, reversibility, and response-style rules.</p>',
            keyTerms: ['Alzheimer\u2019s', 'Vascular dementia', 'Lewy body', 'Frontotemporal', 'Pick\u2019s disease', 'Pseudodementia', 'Delirium', 'Amyloid plaques', 'Neurofibrillary tangles'],
            knowledgeCheck: {
                question: 'A 72-year-old retired professor presents with visual hallucinations of children playing in her living room, fluctuating alertness throughout the day, and mild Parkinsonian tremor. Her family reports she acts out her dreams at night. Her physician is considering prescribing haloperidol for the hallucinations. What is the most critical concern?',
                options: [
                    'Haloperidol may worsen her depression.',
                    'Lewy body dementia can confer severe neuroleptic sensitivity; typical antipsychotics such as haloperidol generally should be avoided, and any medication decision requires careful specialist risk–benefit assessment.',
                    'Haloperidol is contraindicated in patients over age 70.',
                    'Her symptoms suggest delirium, not dementia, so antipsychotics are unnecessary.'
                ],
                answer: 1,
                rationale: 'The cluster strongly suggests dementia with Lewy bodies, and haloperidol is a major concern because severe sensitivity reactions can include worsened parkinsonism, confusion, sedation, autonomic effects, neuroleptic malignant syndrome, and death. This does not mean every antipsychotic is absolutely forbidden; first assess triggers and nonpharmacologic options, then use specialist-guided risk–benefit reasoning if medication is necessary.'
            },
            interactiveDiagram: {
                description: 'Educational cognitive-change triage by onset and course',
                svg: '<svg viewBox="0 0 860 290" width="100%" role="img" aria-labelledby="ch22TriageTitle ch22TriageDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch22TriageTitle">Cognitive change: onset and course guide the differential</title><desc id="ch22TriageDesc">Acute or fluctuating attention and awareness prompts urgent delirium and medical evaluation. Sudden focal findings prompt stroke or seizure evaluation. Gradual progressive decline prompts neurocognitive assessment. Mood-related cognitive symptoms can coexist with neurological disease.</desc><defs><marker id="ch22Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect x="285" y="20" width="290" height="55" rx="12" fill="#172554" stroke="#60a5fa" stroke-width="2"/><text x="430" y="53" text-anchor="middle" fill="#fff" font-weight="bold">NEW COGNITIVE OR BEHAVIORAL CHANGE</text><path d="M430 75V105" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch22Arrow)"/><rect x="25" y="115" width="245" height="115" rx="12" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="147" y="143" text-anchor="middle" fill="#fecaca" font-weight="bold">ACUTE / FLUCTUATING</text><text x="147" y="169" text-anchor="middle" fill="#fff" font-size="12">Attention or awareness changed?</text><text x="147" y="190" text-anchor="middle" fill="#fff" font-size="12">Urgent medical/delirium evaluation</text><text x="147" y="211" text-anchor="middle" fill="#fff" font-size="11">Also consider seizure, toxin, infection</text><rect x="307" y="115" width="245" height="115" rx="12" fill="#78350f" stroke="#fbbf24" stroke-width="2"/><text x="429" y="143" text-anchor="middle" fill="#fde68a" font-weight="bold">SUDDEN + FOCAL</text><text x="429" y="169" text-anchor="middle" fill="#fff" font-size="12">Weakness, field cut, aphasia?</text><text x="429" y="190" text-anchor="middle" fill="#fff" font-size="12">Emergency stroke/seizure pathway</text><text x="429" y="211" text-anchor="middle" fill="#fff" font-size="11">Do not label as “dementia” first</text><rect x="590" y="115" width="245" height="115" rx="12" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="712" y="143" text-anchor="middle" fill="#a7f3d0" font-weight="bold">GRADUAL / PROGRESSIVE</text><text x="712" y="169" text-anchor="middle" fill="#fff" font-size="12">Document decline and function</text><text x="712" y="190" text-anchor="middle" fill="#fff" font-size="12">Medical + cognitive differential</text><text x="712" y="211" text-anchor="middle" fill="#fff" font-size="11">Mixed causes are common</text><text x="430" y="265" text-anchor="middle" fill="#cbd5e1" font-size="12">Educational guide only: mood, medications, sleep, sensory access, culture/language, and neurological disease may overlap.</text></svg>'
            }
        },
        {
            heading: 'Neurodegenerative & Neurological Disorders',
            content: '<table>' +
                '<tr><th>Disorder</th><th>Neuropathology</th><th>Key Features</th></tr>' +
                '<tr><td><strong>Parkinson\u2019s disease</strong></td><td>Loss of dopamine-producing neurons in the <strong>substantia nigra</strong></td><td><strong>Resting tremor</strong> (pill-rolling), <strong>rigidity</strong>, <strong>bradykinesia</strong> (slowness), postural instability. "Masked face." Levodopa is an important symptomatic treatment, among other pharmacologic and nonpharmacologic options. Cognitive impairment and dementia risk increase with disease duration and age; one fixed percentage is not universal.</td></tr>' +
                '<tr><td><strong>Huntington\u2019s disease</strong></td><td>Degeneration of the <strong>caudate nucleus</strong> (basal ganglia); <strong>autosomal dominant</strong> inheritance (chromosome 4)</td><td><strong>Chorea</strong> (involuntary jerky movements), progressive dementia, personality/mood changes. Autosomal-dominant HTT CAG-repeat disorder with variable age at onset and course. Each biological child of a heterozygous affected parent has a 50% chance of inheriting the expanded allele; predictive testing requires informed genetic counseling.</td></tr>' +
                '<tr><td><strong>Multiple sclerosis (MS)</strong></td><td><strong>Demyelination</strong> of CNS white matter</td><td>Relapsing-remitting course most common. Visual disturbances (optic neuritis), fatigue, spasticity, cognitive impairment (slowed processing speed), Lhermitte\u2019s sign.</td></tr>' +
                '<tr><td><strong>Epilepsy</strong></td><td>Abnormal electrical activity in the brain</td><td>Use current ILAE categories: focal onset (with preserved or impaired consciousness/awareness), generalized onset (including tonic–clonic and absence), unknown onset, and unclassified. “Grand mal,” “petit mal,” and “complex partial” are historical terms. Automatisms can occur in focal impaired-consciousness seizures but are not diagnostic by themselves.</td></tr>' +
                '</table>' +
                '<p><strong>Traumatic Brain Injury (TBI):</strong></p>' +
                '<ul>' +
                '<li><strong>Coup injury</strong>: Damage at the site of impact</li>' +
                '<li><strong>Contrecoup injury</strong>: Damage on the <em>opposite</em> side of impact (brain bounces against skull)</li>' +
                '<li><strong>Diffuse axonal injury (DAI)</strong>: Traumatic axonal injury associated with rotational/acceleration forces; severity and outcome vary, so “worst prognosis” is not a universal rule</li>' +
                '<li><strong>Concussion</strong> is a form of mild TBI. Symptoms and recovery vary; most improve, while some persist and require reassessment. Use current symptom-based language rather than assuming a single post-concussion syndrome course.</li>' +
                '<li><strong>Frontal and temporal lobes</strong> are most vulnerable in TBI due to bony protrusions inside the skull.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Parkinson\u2019s = resting tremor + DA depletion in substantia nigra. Huntington\u2019s = chorea + autosomal dominant + chromosome 4. MS = demyelination + relapsing-remitting. Coup/contrecoup and traumatic axonal injury are useful mechanisms, but actual injury patterns and outcome depend on forces, severity, complications, premorbid factors, care, and environment.</p>',
            keyTerms: ['Parkinson\u2019s', 'Huntington\u2019s', 'MS', 'Epilepsy', 'TBI', 'Coup/contrecoup', 'DAI', 'Chorea', 'L-DOPA', 'Autosomal dominant']
        }
    ],
    aiCoda: {
        teaser: 'How can AI support neuropsychology without imitating diagnosis or confabulation?',
        content: '<p>AI can help learners compare syndromes, organize a differential by onset and course, or practice interpreting a cognitive profile. It cannot establish effort, premorbid ability, functional decline, delirium, lesion location, disease pathology, or decision-making capacity from a chat.</p>' +
            '<p>Artificial-network “lesions,” model degradation, and factual generation errors are not equivalent to aphasia, dementia, traumatic brain injury, or clinical confabulation. Reusing those terms can obscure the lived and medical realities of neurological disability and falsely suggest shared mechanisms.</p>' +
            '<p>Use AI-generated neuropsychology material as a hypothesis scaffold only. Preserve current terminology, urgency cues, uncertainty, mixed pathology, cultural and language validity, sensory/motor demands, and the difference between a screening result and a diagnosis. Acute cognitive change or focal neurological signs require real-world medical evaluation.</p>',
        studyNote: '💡 <strong>Study Note:</strong> (1) Agnosia/apraxia require ruling out elementary sensory, motor, language, attention, and comprehension explanations. (2) TGA etiology is uncertain; atypical acute amnesia requires emergency differential. (3) Wernicke encephalopathy may lack the full triad and needs prompt thiamine. (4) Dementia pathologies and symptoms overlap. (5) DLB carries neuroleptic-sensitivity risk; avoid simplistic “no antipsychotics ever.” (6) Depression and neurocognitive disease can coexist. (7) Use current seizure classifications. (8) TBI outcome is not determined by one mechanism label.'
},
    references: [
        'Kolb, B., & Whishaw, I. Q. (2021). <em>Fundamentals of human neuropsychology</em> (8th ed.). Worth Publishers.',
        'Lezak, M. D., Howieson, D. B., Bigler, E. D., & Tranel, D. (2012). <em>Neuropsychological assessment</em> (5th ed.). Oxford University Press.',
        'McKhann, G. M., Knopman, D. S., Chertkow, H., et al. (2011). The diagnosis of dementia due to Alzheimer\u2019s disease. <em>Alzheimer\u2019s & Dementia, 7</em>(3), 263\u2013269.',
        'Zillmer, E. A., Spiers, M. V., & Culbertson, W. C. (2020). <em>Principles of neuropsychology</em> (3rd ed.). Cengage Learning.',
        'National Institute on Aging. (2024). <em>How is Lewy body dementia treated and managed?</em> https://www.nia.nih.gov/health/lewy-body-dementia/how-lewy-body-dementia-treated-and-managed',
        'National Institute on Alcohol Abuse and Alcoholism. <em>Wernicke–Korsakoff syndrome</em>. https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/wernicke-korsakoff-syndrome',
        'International League Against Epilepsy. (2017). <em>Operational classification of seizure types</em>. https://www.ilae.org/guidelines/definition-and-classification/operational-classification-2017',
        'Centers for Disease Control and Prevention. (2024). <em>Traumatic brain injury and concussion</em>. https://www.cdc.gov/traumatic-brain-injury/',
        'Nehring, S. M., Spurling, B. C., & Kumar, A. (2024). Transient global amnesia. <em>StatPearls</em>. https://www.ncbi.nlm.nih.gov/books/NBK442001/'
    ]
});
