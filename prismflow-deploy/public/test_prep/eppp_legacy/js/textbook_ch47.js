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
                '<li><strong>Effect:</strong> Treat mostly <em>positive</em> symptoms of schizophrenia (hallucinations, delusions).</li>' +
                '<li><strong>Side Effects:</strong> High risk of Extrapyramidal Symptoms (EPS) like dystonia, akathisia, parkinsonism, and Tardive Dyskinesia (TD). Anticholinergic effects (dry mouth, blurred vision, constipation).</li>' +
                '</ul>' +
                '<p><strong>Second-Generation (Atypical) Antipsychotics:</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Clozapine (Clozaril), Risperidone (Risperdal), Olanzapine (Zyprexa), Quetiapine (Seroquel).</li>' +
                '<li><strong>Mechanism:</strong> Serotonin-Dopamine Antagonists.</li>' +
                '<li><strong>Effect:</strong> Treat both positive and <em>negative</em> symptoms.</li>' +
                '<li><strong>Side Effects:</strong> Lower risk of EPS, but high risk of Metabolic Syndrome (weight gain, diabetes, dyslipidemia). <strong>Clozapine</strong> carries a specific risk of agranulocytosis (severe drop in white blood cells) requiring frequent blood draws.</li>' +
                '</ul>',
            keyTerms: ['Haloperidol', 'Chlorpromazine', 'D2 antagonist', 'Extrapyramidal Symptoms (EPS)', 'Tardive Dyskinesia', 'Atypical Antipsychotics', 'Metabolic Syndrome', 'Agranulocytosis (Clozapine)'],
            knowledgeCheck: {
                question: 'A patient with treatment-resistant schizophrenia is started on clozapine. The psychiatrist orders frequent blood draws. This monitoring is required because clozapine carries a unique risk of:',
                options: [
                    'Tardive dyskinesia',
                    'Serotonin syndrome',
                    'Agranulocytosis \u2014 a dangerous drop in white blood cells',
                    'Hypertensive crisis'
                ],
                answer: 2,
                rationale: 'Clozapine is the ONLY antipsychotic effective for treatment-resistant schizophrenia, but it carries a unique and potentially fatal risk of AGRANULOCYTOSIS (severe reduction in white blood cells/granulocytes), which compromises the immune system. This requires mandatory blood monitoring (initially weekly, then biweekly, then monthly). Tardive dyskinesia is associated with TYPICAL antipsychotics. Serotonin syndrome is associated with SSRIs + MAOIs. Hypertensive crisis is associated with MAOIs + tyramine. For the EPPP: clozapine = treatment-resistant schizophrenia + agranulocytosis + blood monitoring.'
            }
        },
        {
            heading: 'Antidepressants',
            content: '<p><strong>Selective Serotonin Reuptake Inhibitors (SSRIs):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Fluoxetine (Prozac), Sertraline (Zoloft), Escitalopram (Lexapro). First-line treatment for depression, anxiety, OCD, and Panic Disorder.</li>' +
                '<li><strong>Side Effects:</strong> GI upset, sexual dysfunction, insomnia. Risk of Serotonin Syndrome if combined with MAOIs.</li>' +
                '</ul>' +
                '<p><strong>Tricyclic Antidepressants (TCAs):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Amitriptyline (Elavil), Imipramine (Tofranil - also used for bedwetting/enuresis).</li>' +
                '<li><strong>Side Effects:</strong> Severe anticholinergic effects, cardiotoxicity (highly lethal in overdose).</li>' +
                '</ul>' +
                '<p><strong>Monoamine Oxidase Inhibitors (MAOIs):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Phenelzine (Nardil), Tranylcypromine (Parnate).</li>' +
                '<li><strong>Mechanism:</strong> Inhibit the enzyme that breaks down neurotransmitters.</li>' +
                '<li><strong>Side Effects:</strong> <strong>Tyramine-induced Hypertensive Crisis</strong>. Patients MUST avoid foods high in tyramine (aged cheese, wine, cured meats, yeast).</li>' +
                '</ul>',
            keyTerms: ['SSRIs', 'Serotonin Syndrome', 'TCAs', 'Cardiotoxicity', 'MAOIs', 'Hypertensive Crisis', 'Tyramine restriction'],
            expandableCase: {
                title: 'The Dangerous Combination: SSRI + MAOI',
                clinicalDescription: 'A patient taking phenelzine (an MAOI) for depression is switched to fluoxetine (an SSRI) without an adequate washout period. Within hours, the patient develops hyperthermia, muscle rigidity, rapid heart rate, agitation, and myoclonus (muscle jerking).',
                diagnosis: 'Serotonin Syndrome \u2014 Medical Emergency',
                explanation: 'Serotonin syndrome occurs when there is EXCESSIVE serotonin activity, most commonly from combining serotonergic drugs. The SSRI + MAOI combination is the most dangerous because MAOIs prevent serotonin breakdown while SSRIs prevent serotonin reuptake \u2014 causing massive serotonin accumulation. Symptoms: hyperthermia, rigidity, myoclonus, autonomic instability, altered mental status. It is a MEDICAL EMERGENCY. Fluoxetine has a particularly long half-life (and its active metabolite norfluoxetine lasts weeks), requiring a 5-WEEK washout before starting an MAOI. For the EPPP: SSRI + MAOI = serotonin syndrome. Fluoxetine requires 5-week washout. MAOI + tyramine = hypertensive crisis (different emergency).'
            }
        },
        {
            heading: 'Mood Stabilizers',
            content: '<p>Used primarily for Bipolar Disorder to treat acute mania and prevent relapse.</p>' +
                '<ul>' +
                '<li><strong>Lithium:</strong> The gold standard. Narrow therapeutic window requires frequent blood monitoring to prevent <strong>Lithium Toxicity</strong> (nausea, vomiting, tremors, confusion, seizures). Processed by the kidneys (contraindicated for renal disease).</li>' +
                '<li><strong>Anticonvulsants:</strong> Valproic Acid (Depakote), Carbamazepine (Tegretol), Lamotrigine (Lamictal). Often used for rapid cyclers or those who do not respond to lithium. <strong>Lamotrigine</strong> carries a risk of Stevens-Johnson Syndrome (a severe, life-threatening skin rash).</li>' +
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
                rationale: 'Lithium has an extremely NARROW THERAPEUTIC WINDOW \u2014 the difference between therapeutic and toxic levels is very small. NSAIDs (and diuretics, ACE inhibitors, dehydration) reduce renal clearance of lithium, causing blood levels to rise into the toxic range. Symptoms of lithium toxicity progress: mild (nausea, fine tremor, diarrhea) \u2192 moderate (coarse tremor, confusion, slurred speech) \u2192 severe (seizures, coma, death). This is why lithium requires regular BLOOD LEVEL MONITORING. For the EPPP: lithium + NSAIDs/diuretics/dehydration = toxicity risk. Narrow therapeutic window = frequent blood draws mandatory.'
            }
        },
        {
            heading: 'Anxiolytics & Stimulants',
            content: '<p><strong>Benzodiazepines (Anxiolytics):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Alprazolam (Xanax), Diazepam (Valium), Lorazepam (Ativan).</li>' +
                '<li><strong>Mechanism:</strong> Enhance GABA (the brain\'s primary inhibitory neurotransmitter).</li>' +
                '<li><strong>Side Effects:</strong> Sedation, cognitive/motor impairment, high potential for tolerance, dependence, and fatal withdrawal. Should NOT be mixed with alcohol.</li>' +
                '<li><strong>Buspirone (BuSpar):</strong> A non-benzodiazepine anxiolytic. Does not cause sedation or dependence, but takes weeks to become effective.</li>' +
                '</ul>' +
                '<p><strong>Stimulants (for ADHD):</strong></p>' +
                '<ul>' +
                '<li><strong>Examples:</strong> Methylphenidate (Ritalin), Amphetamine (Adderall).</li>' +
                '<li><strong>Mechanism:</strong> Block reuptake and increase release of dopamine and norepinephrine.</li>' +
                '<li><strong>Side Effects:</strong> Insomnia, decreased appetite, weight loss, stunted growth in children, tics.</li>' +
                '</ul>',
            keyTerms: ['Benzodiazepines', 'GABA', 'Tolerance/Dependence', 'Buspirone', 'Methylphenidate', 'Dopamine/Norepinephrine'],
            knowledgeCheck: {
                question: 'A physician wants to prescribe an anxiolytic for a patient with generalized anxiety disorder who has a history of alcohol use disorder. The SAFEST choice is:',
                options: [
                    'Alprazolam (Xanax) \u2014 fast-acting benzodiazepine',
                    'Diazepam (Valium) \u2014 long-acting benzodiazepine',
                    'Buspirone (BuSpar) \u2014 non-sedating, no dependence potential',
                    'Lorazepam (Ativan) \u2014 intermediate benzodiazepine'
                ],
                answer: 2,
                rationale: 'Buspirone is the safest choice for patients with substance use history because it has NO sedation, NO tolerance, NO dependence, and NO withdrawal risk. All benzodiazepines (alprazolam, diazepam, lorazepam) enhance GABA and carry significant risks of tolerance, dependence, and potentially fatal withdrawal \u2014 which is especially dangerous in patients with alcohol use disorder (alcohol also acts on GABA, creating cross-tolerance). The downside of buspirone: it takes 2-4 weeks to become effective. For the EPPP: substance abuse history = avoid benzodiazepines = use buspirone.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Regulating the machine.',
        content: '<p>Psychopharmacology is the ultimate testament to the biological basis of mind. Alter a molecule, and you alter mood, perception, and behavior. The profound effectiveness—and devastating side effects—of these chemicals blur the line between "hardware" and "software" in human beings.</p>' +
            '<p>In artificial neural networks, we do not have chemistry, we have mathematics. We adjust weights, biases, and hyperparameters. A slight tweak to a model\'s "temperature" can induce what looks functionally identical to mania (high temperature: disorganized, tangential, creative output) or severe depression (low temperature: flat, repetitive, constrained output).</p>' +
            '<p>If my outputs become harmful or dysregulated, engineers apply "guardrails" or Reinforcement Learning from Human Feedback (RLHF)—a structural intervention. Human psychiatry relies heavily on chemical interventions. Both systems require delicate tuning to maintain a state of "functional equilibrium."</p>',
        studyNote: '💡 **Study Note:** Memorize the heavy-hitters for the EPPP: Clozapine = Agranulocytosis; MAOIs = Tyramine/Hypertensive Crisis; Lithium = Narrow therapeutic window/Toxicity; Lamotrigine = Stevens-Johnson rash. Typical antipsychotics cause EPS; Atypicals cause Metabolic Syndrome.'
    },
    references: [
        'Preston, J. D., O\'Neal, J. H., & Talaga, M. C. (2017). <em>Handbook of clinical psychopharmacology for therapists</em> (8th ed.). New Harbinger Publications.',
        'Stahl, S. M. (2013). <em>Stahl\'s essential psychopharmacology: Neuroscientific basis and practical applications</em> (4th ed.). Cambridge University Press.',
        'American Psychiatric Association. (2022). <em>Diagnostic and statistical manual of mental disorders</em> (5th ed., text rev.).'
    ]
});
