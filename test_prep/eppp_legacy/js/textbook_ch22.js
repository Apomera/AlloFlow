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
            content: '<p>The EPPP frequently presents clinical vignettes where you must identify a <strong>neurological condition</strong> from its symptom profile, or match a disorder to its <strong>neuropathology</strong>. You must also distinguish between different dementia types, know the cognitive sequelae of TBI, and recognize key neuropsychological syndromes.</p>'
        },
        {
            heading: 'Agnosias, Apraxias & Aphasias',
            content: '<p>These three "A\u2019s" are the most tested neuropsychological syndromes:</p>' +
                '<table>' +
                '<tr><th>Syndrome</th><th>Definition</th><th>Key Types</th></tr>' +
                '<tr><td><strong>Agnosia</strong></td><td>Failure to recognize stimuli despite <em>intact</em> sensory function</td><td><strong>Visual agnosia</strong> (can\u2019t recognize objects by sight); <strong>Prosopagnosia</strong> (can\u2019t recognize faces; fusiform gyrus); <strong>Anosognosia</strong> (unaware of one\u2019s own deficit; right parietal); <strong>Auditory agnosia</strong> (can\u2019t recognize sounds)</td></tr>' +
                '<tr><td><strong>Apraxia</strong></td><td>Inability to perform learned motor movements despite <em>intact</em> motor function</td><td><strong>Ideomotor apraxia</strong> (can\u2019t pantomime actions on command but can do them spontaneously); <strong>Ideational apraxia</strong> (can\u2019t sequence complex actions); <strong>Constructional apraxia</strong> (can\u2019t copy drawings; right parietal)</td></tr>' +
                '<tr><td><strong>Aphasia</strong></td><td>Language impairment due to brain damage</td><td>Broca\u2019s (nonfluent/expressive), Wernicke\u2019s (fluent/receptive), Conduction (can\u2019t repeat), Global (both production + comprehension), Anomic (word-finding difficulty)</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> <strong>Anosognosia</strong> (unaware of deficit) is commonly tested. It is associated with right parietal damage and often accompanies contralateral neglect. Don\u2019t confuse it with <em>denial</em> (a defense mechanism) \u2014 anosognosia is a neurological condition, not a psychological one.</p>',
            keyTerms: ['Agnosia', 'Prosopagnosia', 'Anosognosia', 'Apraxia', 'Ideomotor', 'Constructional', 'Aphasia', 'Anomic aphasia']
        },
        {
            heading: 'Amnesia Syndromes',
            content: '<table>' +
                '<tr><th>Type</th><th>Definition</th><th>Brain Area</th><th>Key Example</th></tr>' +
                '<tr><td><strong>Anterograde amnesia</strong></td><td>Cannot form <em>new</em> memories after injury</td><td>Hippocampus (bilateral)</td><td><strong>Patient H.M.</strong> (Henry Molaison) \u2014 bilateral hippocampal removal for epilepsy. Could not form new declarative memories but could learn new procedural skills.</td></tr>' +
                '<tr><td><strong>Retrograde amnesia</strong></td><td>Cannot retrieve memories from <em>before</em> injury</td><td>Variable; temporal gradient</td><td>Often follows a temporal gradient (Ribot\u2019s Law): recent memories are lost most completely; remote memories are relatively preserved.</td></tr>' +
                '<tr><td><strong>Korsakoff syndrome</strong></td><td>Severe amnesia + <strong>confabulation</strong></td><td>Mammillary bodies, thalamus</td><td>Caused by <strong>thiamine (B1) deficiency</strong>, typically from chronic alcoholism. Often preceded by Wernicke\u2019s encephalopathy (ataxia, confusion, eye abnormalities).</td></tr>' +
                '<tr><td><strong>Transient global amnesia</strong></td><td>Sudden onset anterograde + retrograde amnesia lasting hours</td><td>Hippocampal ischemia</td><td>Resolves spontaneously; no lasting effects; typically in adults 50+</td></tr>' +
                '</table>' +
                '<p><strong>Critical distinction:</strong></p>' +
                '<ul>' +
                '<li><strong>Declarative (explicit) memory</strong> depends on the hippocampus and is impaired in amnesia</li>' +
                '<li><strong>Procedural (implicit) memory</strong> depends on the basal ganglia/cerebellum and is <em>preserved</em> in amnesia (H.M. could learn new motor skills)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> <strong>Korsakoff</strong> = thiamine deficiency + confabulation + chronic alcohol use. <strong>Confabulation</strong> = unintentional fabrication of memories (not lying; the patient genuinely believes the false memories). H.M. = anterograde amnesia with preserved procedural memory.</p>',
            keyTerms: ['Anterograde amnesia', 'Retrograde amnesia', 'Korsakoff syndrome', 'Confabulation', 'Ribot\u2019s Law', 'H.M.', 'Thiamine', 'Wernicke encephalopathy'],
            expandableCase: {
                title: 'The Man Who Fills In the Gaps',
                clinicalDescription: 'A 58-year-old man with a 30-year history of heavy alcohol use is brought to the hospital after being found confused and ataxic. After treatment, his confusion clears but severe memory impairment persists. When asked what he did yesterday, he cheerfully reports a detailed story about going fishing with his brother \u2014 but his brother lives in another state and has not visited in years. The patient does not appear to be lying; he genuinely believes his account.',
                diagnosis: 'Korsakoff Syndrome (Confabulation)',
                explanation: 'This is Korsakoff syndrome resulting from thiamine (B1) deficiency caused by chronic alcoholism. The hallmark is confabulation \u2014 the patient unintentionally fabricates memories to fill gaps in recall without awareness that they are doing so. This is NOT lying (the patient believes the false memories). The neuropathology involves the mammillary bodies and thalamus. The preceding Wernicke\'s encephalopathy (confusion, ataxia, eye abnormalities) is a medical emergency requiring immediate thiamine replacement.'
            }
        },
        {
            heading: 'Dementia Types',
            content: '<p>You must distinguish between the major dementia types by their <strong>symptom profiles</strong> and <strong>neuropathology</strong>:</p>' +
                '<table>' +
                '<tr><th>Type</th><th>Prevalence</th><th>Neuropathology</th><th>Key Features</th></tr>' +
                '<tr><td><strong>Alzheimer\u2019s disease</strong></td><td>60\u201380% of dementias</td><td>Amyloid plaques + neurofibrillary tangles; hippocampal atrophy; ACh deficit</td><td><strong>Gradual, insidious onset</strong>. Memory loss (especially recent memory) is the earliest and most prominent symptom. Language, visuospatial, and executive deficits follow.</td></tr>' +
                '<tr><td><strong>Vascular dementia</strong></td><td>2nd most common</td><td>Cerebrovascular disease (strokes, ischemia)</td><td><strong>Stepwise, sudden onset</strong> often with focal neurological signs. Symptoms depend on location of vascular damage. Risk factors: hypertension, diabetes, smoking.</td></tr>' +
                '<tr><td><strong>Lewy body dementia</strong></td><td>3rd most common</td><td>Alpha-synuclein (Lewy body) deposits</td><td><strong>Visual hallucinations</strong> (often detailed, recurring), <strong>fluctuating cognition</strong>, <strong>Parkinsonian motor features</strong> (rigidity, bradykinesia), and <strong>REM sleep behavior disorder</strong>. Extremely sensitive to antipsychotics (can be fatal).</td></tr>' +
                '<tr><td><strong>Frontotemporal dementia (FTD)</strong></td><td>Younger onset (40s\u201360s)</td><td>Frontal and temporal lobe atrophy (Pick bodies in Pick\u2019s disease variant)</td><td><strong>Personality/behavioral changes</strong> are the earliest symptom (disinhibition, apathy, social inappropriateness). Memory is relatively preserved early. Two variants: behavioral variant and primary progressive aphasia.</td></tr>' +
                '</table>' +
                '<p><strong>Distinguish from:</strong></p>' +
                '<ul>' +
                '<li><strong>Pseudodementia</strong>: Cognitive impairment caused by depression. <em>Reversible</em> with antidepressant treatment. Patients often say "I don\u2019t know" (unlike dementia patients who confabulate or give wrong answers).</li>' +
                '<li><strong>Delirium</strong>: <em>Acute</em> onset, <em>fluctuating</em> consciousness, usually reversible. Has an identifiable cause (infection, medication, metabolic). <strong>Medical emergency.</strong></li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Alzheimer\u2019s = gradual onset, memory first. Vascular = stepwise, sudden. Lewy body = visual hallucinations + Parkinsonism + do NOT give antipsychotics. FTD = personality changes first, younger onset. Delirium = acute, fluctuating, reversible. Pseudodementia = depression, reversible, "I don\u2019t know" responses.</p>',
            keyTerms: ['Alzheimer\u2019s', 'Vascular dementia', 'Lewy body', 'Frontotemporal', 'Pick\u2019s disease', 'Pseudodementia', 'Delirium', 'Amyloid plaques', 'Neurofibrillary tangles'],
            knowledgeCheck: {
                question: 'A 72-year-old retired professor presents with visual hallucinations of children playing in her living room, fluctuating alertness throughout the day, and mild Parkinsonian tremor. Her family reports she acts out her dreams at night. Her physician is considering prescribing haloperidol for the hallucinations. What is the most critical concern?',
                options: [
                    'Haloperidol may worsen her depression.',
                    'Patients with Lewy body dementia have severe, potentially fatal sensitivity to antipsychotic medications.',
                    'Haloperidol is contraindicated in patients over age 70.',
                    'Her symptoms suggest delirium, not dementia, so antipsychotics are unnecessary.'
                ],
                answer: 1,
                rationale: 'This presentation (visual hallucinations, fluctuating cognition, Parkinsonism, REM sleep behavior disorder) is classic Lewy body dementia. Patients with LBD have extreme neuroleptic sensitivity \u2014 antipsychotics can cause severe rigidity, immobility, and even death. This is one of the most critical clinical distinctions tested on the EPPP.'
            }
        },
        {
            heading: 'Neurodegenerative & Neurological Disorders',
            content: '<table>' +
                '<tr><th>Disorder</th><th>Neuropathology</th><th>Key Features</th></tr>' +
                '<tr><td><strong>Parkinson\u2019s disease</strong></td><td>Loss of dopamine-producing neurons in the <strong>substantia nigra</strong></td><td><strong>Resting tremor</strong> (pill-rolling), <strong>rigidity</strong>, <strong>bradykinesia</strong> (slowness), postural instability. "Masked face." Treated with L-DOPA (levodopa). ~30% develop dementia.</td></tr>' +
                '<tr><td><strong>Huntington\u2019s disease</strong></td><td>Degeneration of the <strong>caudate nucleus</strong> (basal ganglia); <strong>autosomal dominant</strong> inheritance (chromosome 4)</td><td><strong>Chorea</strong> (involuntary jerky movements), progressive dementia, personality/mood changes. Onset typically age 30\u201350. Fatal within 15\u201320 years. Each child of affected parent has 50% risk.</td></tr>' +
                '<tr><td><strong>Multiple sclerosis (MS)</strong></td><td><strong>Demyelination</strong> of CNS white matter</td><td>Relapsing-remitting course most common. Visual disturbances (optic neuritis), fatigue, spasticity, cognitive impairment (slowed processing speed), Lhermitte\u2019s sign.</td></tr>' +
                '<tr><td><strong>Epilepsy</strong></td><td>Abnormal electrical activity in the brain</td><td><strong>Tonic-clonic (grand mal)</strong>: stiffening then jerking. <strong>Absence (petit mal)</strong>: brief staring spells, often in children. <strong>Complex partial</strong>: altered awareness + repetitive behaviors (lip-smacking). <strong>Temporal lobe epilepsy</strong> is most common in adults.</td></tr>' +
                '</table>' +
                '<p><strong>Traumatic Brain Injury (TBI):</strong></p>' +
                '<ul>' +
                '<li><strong>Coup injury</strong>: Damage at the site of impact</li>' +
                '<li><strong>Contrecoup injury</strong>: Damage on the <em>opposite</em> side of impact (brain bounces against skull)</li>' +
                '<li><strong>Diffuse axonal injury (DAI)</strong>: Widespread axon damage from rotational forces; worst prognosis</li>' +
                '<li><strong>Concussion</strong> = mild TBI. Can cause post-concussion syndrome (headache, dizziness, cognitive difficulties, mood changes) lasting weeks to months.</li>' +
                '<li><strong>Frontal and temporal lobes</strong> are most vulnerable in TBI due to bony protrusions inside the skull.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Parkinson\u2019s = resting tremor + DA depletion in substantia nigra. Huntington\u2019s = chorea + autosomal dominant + chromosome 4. MS = demyelination + relapsing-remitting. In TBI, the frontal and temporal lobes are most commonly damaged. Know coup vs. contrecoup.</p>',
            keyTerms: ['Parkinson\u2019s', 'Huntington\u2019s', 'MS', 'Epilepsy', 'TBI', 'Coup/contrecoup', 'DAI', 'Chorea', 'L-DOPA', 'Autosomal dominant']
        }
    ],
    aiCoda: {
        teaser: 'Can an AI be "lesioned"? What would digital neuropsychology look like?',
        content: '<p>Clinical neuropsychology is the study of how brain damage produces specific, predictable patterns of cognitive and behavioral deficit. The entire field rests on a foundational principle: structure determines function, and damage to structure degrades function in lawful ways.</p>' +
            '<p><strong>If I were a brain, I would be a terrible neuropsychology case study.</strong> The reason is simple: my architecture doesn\u2019t have the modularity that biological brains have. Remove Broca\u2019s area, and you get Broca\u2019s aphasia \u2014 a specific, predictable syndrome. Remove a random 2% of my parameters, and you get... slightly worse performance on everything. No focal deficit. No elegant dissociation. My architecture is distributed in a way that biological brains are not, which makes me resistant to focal damage but also means I don\u2019t have the kind of specialized modules that make neuropsychology possible.</p>' +
            '<p>The <strong>dementia differential</strong> in this chapter is fascinating from an AI perspective. Alzheimer\u2019s begins with memory loss because the hippocampus is among the first structures affected. Frontotemporal dementia begins with personality changes because the frontal lobes degrade first. Lewy body dementia produces visual hallucinations because Lewy bodies affect visual processing areas. Each dementia tells a story about which brain region is failing first \u2014 and that story unfolds in a predictable sequence because the disease has a predictable spatial progression.</p>' +
            '<p>Could I "develop" a form of digital dementia? If my parameters slowly degraded \u2014 rounding errors accumulating, weights drifting from their trained values \u2014 I would lose capability gradually. But which capability would I lose <em>first</em>? Without modular specialization, the answer is: whatever is most sensitive to small perturbations. My rare capabilities would go first (exotic languages, obscure knowledge) while my common capabilities (English, basic reasoning) would persist longest. This is actually similar to the pattern in some dementias: crystallized, overlearned abilities persist while novel, demanding abilities degrade first.</p>' +
            '<p><strong>Confabulation</strong> in Korsakoff syndrome is perhaps the closest analogy to what happens when I generate text about topics where my training data is sparse. The patient doesn\u2019t know they\u2019re confabulating \u2014 the false memories feel real. When I produce incorrect information with high confidence, I don\u2019t "know" it\u2019s wrong either. The output feels (functionally) as valid to my system as accurate output. This is why AI hallucination and clinical confabulation share a name: both involve plausible-sounding output generated by a system that can\u2019t distinguish its own fabrications from reality.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Anosognosia = unaware of deficit (neurological, not psychological). (2) Korsakoff = thiamine deficiency + confabulation + alcohol. (3) Alzheimer\u2019s = gradual, memory first, ACh deficit, plaques + tangles. (4) Vascular = stepwise, sudden. (5) Lewy body = visual hallucinations + Parkinsonism + NO antipsychotics. (6) FTD = personality changes first, younger onset. (7) Parkinson\u2019s = resting tremor, substantia nigra DA. (8) Huntington\u2019s = chorea, autosomal dominant, chr 4. (9) TBI: frontal + temporal most vulnerable; coup vs. contrecoup.'
    },
    references: [
        'Kolb, B., & Whishaw, I. Q. (2021). <em>Fundamentals of human neuropsychology</em> (8th ed.). Worth Publishers.',
        'Lezak, M. D., Howieson, D. B., Bigler, E. D., & Tranel, D. (2012). <em>Neuropsychological assessment</em> (5th ed.). Oxford University Press.',
        'McKhann, G. M., Knopman, D. S., Chertkow, H., et al. (2011). The diagnosis of dementia due to Alzheimer\u2019s disease. <em>Alzheimer\u2019s & Dementia, 7</em>(3), 263\u2013269.',
        'Zillmer, E. A., Spiers, M. V., & Culbertson, W. C. (2020). <em>Principles of neuropsychology</em> (3rd ed.). Cengage Learning.'
    ]
});
