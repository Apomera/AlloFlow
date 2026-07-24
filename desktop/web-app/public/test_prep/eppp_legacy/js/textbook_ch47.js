/* ============================================================
   PasstheEPPP — Textbook Ch 47: High-Yield Clinical Psychopharmacology
   Domain: Integrative (Bio, Cognitive, Treatment)
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-47',
    domain: 'Integrative Seminars',
    domainNumber: 9,
    title: 'High-Yield Clinical Psychopharmacology',
    examWeight: 'N/A',
    sections: [
        {
            heading: 'Antipsychotics (Neuroleptics)',
            content: '<p><strong>First-Generation (Typical) Antipsychotics:</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Haloperidol (Haldol), Chlorpromazine (Thorazine).</li>' +
                '<li><strong>Mechanism:</strong> Dopamine (D2) receptor antagonists.</li>' +
                '<li><strong>Effect:</strong> Can reduce psychotic symptoms; efficacy and tolerability vary by medication and patient, and persistent negative or cognitive symptoms require broader assessment.</li>' +
                '<li><strong>Side Effects:</strong> EPS and tardive dyskinesia risks are important, especially for higher-potency D2 blockade, while sedation, anticholinergic, cardiovascular, endocrine, and other effects vary by agent and dose.</li>' +
                '</ul>' +
                '<p><strong>Second-Generation (Atypical) Antipsychotics:</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Clozapine (Clozaril), Risperidone (Risperdal), Olanzapine (Zyprexa), Quetiapine (Seroquel).</li>' +
                '<li><strong>Mechanism:</strong> Often involve D2 and serotonin-receptor effects, but receptor profiles and partial agonism differ substantially across agents.</li>' +
                '<li><strong>Effect:</strong> Treat psychotic symptoms; average advantages for primary negative symptoms are limited and medication-specific rather than a class guarantee.</li>' +
                '<li><strong>Side Effects:</strong> EPS, prolactin, metabolic, cardiac, sedation, and other risks differ by agent. Clozapine has a boxed warning for severe neutropenia and requires label-directed ANC monitoring; the U.S. Clozapine REMS was removed in 2025, so REMS enrollment/reporting is no longer required.</li>' +
                '</ul>',
            keyTerms: ['Haloperidol', 'Chlorpromazine', 'D2 antagonist', 'Extrapyramidal Symptoms (EPS)', 'Tardive Dyskinesia', 'Atypical Antipsychotics', 'Metabolic Syndrome', 'Severe neutropenia (Clozapine)'],
            interactiveDiagram: {
                title: 'Psychotropic Safety Recognition Map',
                description: 'A recognition—not prescribing—map linking antipsychotics to movement, metabolic, and severe neutropenia monitoring; serotonergic combinations to serotonin toxicity; lithium to level, renal, thyroid, hydration, and interaction monitoring; lamotrigine to serious-rash vigilance; and sedatives or stimulants to individualized safety monitoring.',
                svg: '<svg viewBox="0 0 920 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="medSafetyTitle medSafetyDesc"><title id="medSafetyTitle">Psychotropic medication safety recognition map</title><desc id="medSafetyDesc">Five medication groups connect to characteristic safety domains. This is an educational recognition aid and not a treatment-selection or emergency-management algorithm.</desc><rect width="920" height="420" rx="24" fill="#f8fafc"/><text x="460" y="40" text-anchor="middle" font-family="system-ui" font-size="23" font-weight="700" fill="#172554">Recognize the safety domain—do not prescribe from a mnemonic</text><g font-family="system-ui"><g transform="translate(25 75)"><rect width="165" height="260" rx="16" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/><text x="82" y="34" text-anchor="middle" font-size="17" font-weight="700" fill="#991b1b">Antipsychotics</text><text x="16" y="70" font-size="14" fill="#7f1d1d">• Movement effects</text><text x="16" y="98" font-size="14" fill="#7f1d1d">• Metabolic effects</text><text x="16" y="126" font-size="14" fill="#7f1d1d">• Cardiac/endocrine</text><text x="16" y="168" font-size="14" font-weight="700" fill="#991b1b">Clozapine:</text><text x="16" y="195" font-size="14" fill="#7f1d1d">ANC + other boxed</text><text x="16" y="220" font-size="14" fill="#7f1d1d">warning risks</text></g><g transform="translate(205 75)"><rect width="165" height="260" rx="16" fill="#ffedd5" stroke="#ea580c" stroke-width="3"/><text x="82" y="34" text-anchor="middle" font-size="17" font-weight="700" fill="#9a3412">Antidepressants</text><text x="16" y="70" font-size="14" fill="#7c2d12">• Activation/sedation</text><text x="16" y="98" font-size="14" fill="#7c2d12">• Sexual/GI effects</text><text x="16" y="126" font-size="14" fill="#7c2d12">• Interaction review</text><text x="16" y="168" font-size="14" font-weight="700" fill="#9a3412">Urgent pattern:</text><text x="16" y="195" font-size="14" fill="#7c2d12">Serotonin toxicity</text><text x="16" y="220" font-size="14" fill="#7c2d12">or MAOI crisis</text></g><g transform="translate(385 75)"><rect width="165" height="260" rx="16" fill="#e0f2fe" stroke="#0284c7" stroke-width="3"/><text x="82" y="34" text-anchor="middle" font-size="17" font-weight="700" fill="#075985">Lithium</text><text x="16" y="70" font-size="14" fill="#0c4a6e">• Serum levels</text><text x="16" y="98" font-size="14" fill="#0c4a6e">• Renal/thyroid</text><text x="16" y="126" font-size="14" fill="#0c4a6e">• Hydration/sodium</text><text x="16" y="154" font-size="14" fill="#0c4a6e">• Interactions</text><text x="16" y="195" font-size="14" font-weight="700" fill="#075985">Urgent pattern:</text><text x="16" y="220" font-size="14" fill="#0c4a6e">New neurologic/GI</text></g><g transform="translate(565 75)"><rect width="165" height="260" rx="16" fill="#ede9fe" stroke="#7c3aed" stroke-width="3"/><text x="82" y="34" text-anchor="middle" font-size="17" font-weight="700" fill="#5b21b6">Lamotrigine</text><text x="16" y="70" font-size="14" fill="#4c1d95">• Slow titration</text><text x="16" y="98" font-size="14" fill="#4c1d95">• Interaction effects</text><text x="16" y="126" font-size="14" fill="#4c1d95">• Rash education</text><text x="16" y="168" font-size="14" font-weight="700" fill="#5b21b6">Urgent pattern:</text><text x="16" y="195" font-size="14" fill="#4c1d95">Possible serious</text><text x="16" y="220" font-size="14" fill="#4c1d95">skin reaction</text></g><g transform="translate(745 75)"><rect width="150" height="260" rx="16" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/><text x="75" y="34" text-anchor="middle" font-size="16" font-weight="700" fill="#166534">Sedatives /</text><text x="75" y="56" text-anchor="middle" font-size="16" font-weight="700" fill="#166534">Stimulants</text><text x="14" y="95" font-size="13" fill="#14532d">• Misuse risk</text><text x="14" y="123" font-size="13" fill="#14532d">• Sleep/appetite</text><text x="14" y="151" font-size="13" fill="#14532d">• Vital signs</text><text x="14" y="179" font-size="13" fill="#14532d">• Co-ingestants</text><text x="75" y="220" text-anchor="middle" font-size="13" font-weight="700" fill="#166534">Individualize</text></g></g><rect x="170" y="360" width="580" height="40" rx="12" fill="#fff" stroke="#334155" stroke-width="2"/><text x="460" y="386" text-anchor="middle" font-family="system-ui" font-size="15" font-weight="700" fill="#334155">Symptoms or medication changes → prompt qualified medical evaluation</text></svg>'
            },
            knowledgeCheck: {
                question: 'A patient taking clozapine has baseline and ongoing absolute neutrophil count (ANC) testing. Which serious labelled risk is this monitoring designed to detect early?',
                options: [
                    'Tardive dyskinesia',
                    'Serotonin syndrome',
                    'Severe neutropenia, which can lead to serious or fatal infection',
                    'Hypertensive crisis'
                ],
                answer: 2,
                rationale: 'Clozapine can cause severe neutropenia, increasing the risk of serious and fatal infection; label-directed ANC monitoring supports early detection. FDA removed the U.S. Clozapine REMS in 2025, so REMS enrollment and ANC reporting are no longer dispensing requirements, although monitoring remains recommended in prescribing information. Movement disorders can occur with multiple antipsychotics, with risk varying by agent and exposure.'
            }
        },
        {
            heading: 'Antidepressants',
            content: '<p><strong>Selective Serotonin Reuptake Inhibitors (SSRIs):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Fluoxetine (Prozac), Sertraline (Zoloft), Escitalopram (Lexapro). Common options across several depressive and anxiety-related disorders; selection depends on the specific diagnosis, patient factors, evidence, interactions, risks, and preferences.</li>' +
                '<li><strong>Side Effects:</strong> GI upset, sexual dysfunction, insomnia. Serotonin toxicity risk rises with MAOIs and other serotonergic combinations; labelled washout intervals and interaction review are essential.</li>' +
                '</ul>' +
                '<p><strong>Tricyclic Antidepressants (TCAs):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Amitriptyline (Elavil), Imipramine (Tofranil - also used for bedwetting/enuresis).</li>' +
                '<li><strong>Side Effects:</strong> Anticholinergic, orthostatic, conduction/arrhythmia, sedation, and overdose toxicity risks vary by drug and patient; overdose can be life-threatening.</li>' +
                '</ul>' +
                '<p><strong>Monoamine Oxidase Inhibitors (MAOIs):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Phenelzine (Nardil), Tranylcypromine (Parnate).</li>' +
                '<li><strong>Mechanism:</strong> Inhibit the enzyme that breaks down neurotransmitters.</li>' +
                '<li><strong>Side Effects:</strong> <strong>Tyramine-induced Hypertensive Crisis</strong>. Patients taking relevant MAOIs receive label- and clinician-specific interaction and dietary guidance because high-tyramine exposure can precipitate severe hypertension.</li>' +
                '</ul>',
            keyTerms: ['SSRIs', 'Serotonin Syndrome', 'TCAs', 'Cardiotoxicity', 'MAOIs', 'Hypertensive Crisis', 'Tyramine restriction'],
            expandableCase: {
                title: 'The Dangerous Combination: SSRI + MAOI',
                clinicalDescription: 'A patient taking phenelzine (an MAOI) for depression is switched to fluoxetine (an SSRI) without an adequate washout period. After the overlapping exposure, the patient develops agitation, hyperthermia, diaphoresis, tachycardia, hyperreflexia, and inducible clonus.',
                diagnosis: 'Serotonin Syndrome \u2014 Medical Emergency',
                explanation: 'Serotonin syndrome occurs when there is EXCESSIVE serotonin activity, most commonly from combining serotonergic drugs. The SSRI + MAOI combination is the most dangerous because MAOIs prevent serotonin breakdown while SSRIs prevent serotonin reuptake \u2014 causing massive serotonin accumulation. Characteristic findings may include mental-status change, autonomic instability, hyperreflexia, tremor, and clonus; severe cases can be life-threatening, and differential diagnosis matters. Suspected severe serotonin toxicity requires urgent medical evaluation. Fluoxetine has a particularly long half-life (and its active metabolite norfluoxetine lasts weeks), requiring a 5-WEEK washout before starting an MAOI. For the EPPP: SSRI + MAOI = serotonin syndrome. Fluoxetine requires 5-week washout. MAOI + tyramine = hypertensive crisis (different emergency).'
            }
        },
        {
            heading: 'Mood Stabilizers',
            content: '<p>Medication roles differ across acute mania, bipolar depression, and maintenance; indication and patient-specific safety factors matter.</p>' +
                '<ul>' +
                '<li><strong>Lithium:</strong> An established treatment for bipolar disorder with a narrow therapeutic range. Monitoring may include serum concentration, renal and thyroid function, electrolytes, hydration/sodium status, pregnancy considerations, symptoms, and interactions. Renal impairment changes risk and dosing and may preclude use in severe cases; it is not accurately summarized as a universal renal-disease contraindication.</li>' +
                '<li><strong>Anticonvulsants:</strong> Valproic Acid (Depakote), Carbamazepine (Tegretol), Lamotrigine (Lamictal). Roles and evidence differ by agent and episode. Valproate has major pregnancy and hepatic risks. Lamotrigine has a boxed warning for serious rashes including Stevens-Johnson syndrome and toxic epidermal necrolysis; risk is affected by age, valproate coadministration, starting dose, and titration.</li>' +
                '</ul>',
            keyTerms: ['Lithium', 'Lithium Toxicity', 'Narrow therapeutic window', 'Valproic Acid', 'Lamotrigine', 'Stevens-Johnson Syndrome'],
            knowledgeCheck: {
                question: 'A patient on lithium for bipolar disorder presents with severe nausea, coarse tremor, confusion, and slurred speech after starting a new NSAID for knee pain. The MOST likely explanation is:',
                options: [
                    'Serotonin syndrome from drug interaction',
                    'Lithium toxicity \u2014 NSAIDs reduce lithium clearance by the kidneys',
                    'Stevens-Johnson Syndrome from the NSAID',
                    'Neuroleptic malignant syndrome'
                ],
                answer: 1,
                rationale: 'Lithium has a narrow therapeutic range and is cleared renally. NSAIDs, renin-angiotensin system antagonists, some diuretics, dehydration, illness, and sodium changes can increase concentrations or toxicity risk. New gastrointestinal or neurologic findings after an interaction or fluid change warrant prompt medical assessment and serum-level/clinical evaluation; monitoring frequency is individualized rather than universally “frequent.”'
            }
        },
        {
            heading: 'Anxiolytics & Stimulants',
            content: '<p><strong>Benzodiazepines (Anxiolytics):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Alprazolam (Xanax), Diazepam (Valium), Lorazepam (Ativan).</li>' +
                '<li><strong>Mechanism:</strong> Enhance GABA (the brain\'s primary inhibitory neurotransmitter).</li>' +
                '<li><strong>Side Effects:</strong> Sedation, cognitive/motor impairment, can cause sedation and psychomotor/cognitive impairment and may lead to tolerance, physical dependence, misuse, and potentially life-threatening withdrawal. Alcohol, opioids, and other CNS depressants can increase impairment and respiratory risk.</li>' +
                '<li><strong>Buspirone (BuSpar):</strong> A non-benzodiazepine anxiolytic. Has lower misuse and physical-dependence liability than benzodiazepines but can cause dizziness, nausea, headache, or drowsiness and has a delayed clinical effect; it does not treat benzodiazepine withdrawal.</li>' +
                '</ul>' +
                '<p><strong>Stimulants (for ADHD):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Methylphenidate (Ritalin), Amphetamine (Adderall).</li>' +
                '<li><strong>Mechanism:</strong> Block reuptake and increase release of dopamine and norepinephrine.</li>' +
                '<li><strong>Side Effects:</strong> May affect sleep, appetite, weight, heart rate, blood pressure, mood, and misuse risk. Growth should be monitored in children; effects on growth and tics are not deterministic class outcomes.</li>' +
                '</ul>',
            keyTerms: ['Benzodiazepines', 'GABA', 'Tolerance/Dependence', 'Buspirone', 'Methylphenidate', 'Dopamine/Norepinephrine'],
            knowledgeCheck: {
                question: 'Among these options, which medication generally has lower misuse and physical-dependence liability than benzodiazepines, while still requiring individualized assessment of adverse effects, interactions, and delayed onset?',
                options: [
                    'Alprazolam (Xanax) \u2014 fast-acting benzodiazepine',
                    'Diazepam (Valium) \u2014 long-acting benzodiazepine',
                    'Buspirone (BuSpar) — a non-benzodiazepine option with lower misuse/dependence liability',
                    'Lorazepam (Ativan) \u2014 intermediate benzodiazepine'
                ],
                answer: 2,
                rationale: 'Buspirone generally has lower abuse and physical-dependence liability than benzodiazepines, but it is not free of adverse effects and is not automatically the best treatment for every person with an alcohol-use history. Benzodiazepines require careful indication, duration, co-ingestant, withdrawal, and monitoring analysis. This item tests relative liability among the listed options—not a prescribing rule.'
            }
        }
    ],
    aiCoda: {
        teaser: 'A contemporary extension: AI can support medication safety, but cannot prescribe from pattern matching',
        content: '<p><strong>Reflective extension:</strong> Medication questions are high stakes. AI may help retrieve label warnings, identify possible interactions, or structure monitoring information, but outputs can be incomplete, outdated, or wrong and must not substitute for a qualified prescriber, pharmacist, examination, medication reconciliation, laboratory interpretation, or emergency assessment.</p>' +
            '<p>A responsible workflow checks the current official label and safety communications, distinguishes class tendencies from medication-specific risks, considers dose and timing, reviews all prescribed and nonprescribed substances, accounts for medical conditions and pregnancy, and communicates uncertainty. Changes in symptoms after starting, stopping, or combining medication require individualized clinical evaluation.</p>' +
            '<p>Temperature settings in a language model are not analogues of mania or depression, and model “guardrails” are not analogous to pharmacotherapy. Those metaphors risk trivializing clinical syndromes and do not teach pharmacology.</p>',
        studyNote: '💡 <strong>Study Note:</strong> Recognize—not prescribe from—high-yield safety associations: clozapine → severe neutropenia/ANC monitoring (REMS removed in 2025); serotonergic combinations → serotonin-toxicity risk; lithium → narrow range, renal clearance, interactions; lamotrigine → serious-rash warning; benzodiazepines → CNS-depression, dependence, and withdrawal risks. Agent-specific exceptions matter.'
    },
    references: [
        'Preston, J. D., O\'Neal, J. H., & Talaga, M. C. (2017). <em>Handbook of clinical psychopharmacology for therapists</em> (8th ed.). New Harbinger Publications.',
        'Stahl, S. M. (2013). <em>Stahl\'s essential psychopharmacology: Neuroscientific basis and practical applications</em> (4th ed.). Cambridge University Press.',
        'American Psychiatric Association. (2022). <em>Diagnostic and statistical manual of mental disorders</em> (5th ed., text rev.).'
    ]
});
