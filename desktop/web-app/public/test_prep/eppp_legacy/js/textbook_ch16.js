/* ============================================================
   PasstheEPPP — Textbook Ch 16: Evidence-Based Practice & Psychopharmacology
   Domain: Treatment, Intervention & Prevention (15% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-16',
    domain: 'Treatment, Intervention & Prevention',
    domainNumber: 3,
    title: 'Evidence-Based Practice & Psychopharmacology',
    examWeight: '15%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests whether you understand the current model of evidence-based practice, the debate over what makes therapy work (specific factors vs. common factors), and the major classes of psychotropic medications. Prescribing authority is jurisdiction- and credential-specific. Psychologists should recognize major medication purposes, risks, and interaction patterns within their competence, communicate observations to prescribers, and avoid turning exam associations into treatment recommendations.</p>'
        },
        {
            heading: 'Evidence-Based Practice in Psychology (EBPP)',
            content: '<p>APA policy defines EBPP as integrating best available research with clinical expertise in the context of patient characteristics, culture, and preferences. The \u201cthree-legged stool\u201d is a useful teaching image, not language that makes the components independent or equal in every decision:</p>' +
                '<table>' +
                '<tr><th>Leg</th><th>Component</th><th>Description</th></tr>' +
                '<tr><td>1</td><td><strong>Best Available Research</strong></td><td>Empirical evidence from RCTs, meta-analyses, case studies, and other research designs</td></tr>' +
                '<tr><td>2</td><td><strong>Clinical Expertise</strong></td><td>The clinician\u2019s judgment, experience, and ability to integrate data with individual cases</td></tr>' +
                '<tr><td>3</td><td><strong>Patient Characteristics, Culture, and Preferences</strong></td><td>The client\u2019s values, identity, culture, and treatment preferences</td></tr>' +
                '</table>' +
                '<p><strong>Key distinction:</strong></p>' +
                '<ul>' +
                '<li><strong>Empirically Supported Treatments (ESTs)</strong>: Specific treatments shown to be effective for specific disorders (e.g., CBT for depression, PE for PTSD). Focus on the <em>treatment</em>.</li>' +
                '<li><strong>Evidence-Based Practice (EBP)</strong>: A broader concept integrating research, expertise, AND client factors. Focus on the <em>clinician\u2019s decision-making process</em>.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> EBP \u2260 ESTs. The EPPP will try to trick you into thinking they\u2019re the same. EBP is the <em>process</em> of integrating all three legs. ESTs are one component (the research leg) of that process. A named EST list is not the whole research component, but clinical expertise or preference alone cannot rescue an unsupported intervention. Evaluate relevant evidence, fit, feasibility, risks and benefits, alternatives, collaborative choice, and ongoing outcomes.</p>',
            keyTerms: ['EBPP', 'Three-legged stool', 'Clinical expertise', 'ESTs', 'APA 2006 policy'],
            interactiveDiagram: {
                description: 'The Three-Legged Stool of Evidence-Based Practice',
                svg: '<svg viewBox="0 0 800 300" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ebppTitle ebppDesc"><title id="ebppTitle">Evidence-based practice integration model</title><desc id="ebppDesc">Best available research, clinical expertise, and patient characteristics, culture, and preferences are integrated through collaborative clinical decision-making and ongoing evaluation. The components inform one another rather than acting as interchangeable votes.</desc><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">APA (2006) Evidence-Based Practice (EBP) Model</text><circle cx="400" cy="150" r="110" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="5,5"/><circle cx="400" cy="150" r="45" fill="#e2e8f0"/><text x="400" y="145" text-anchor="middle" fill="#0f172a" font-weight="bold" font-size="13">EBP</text><text x="400" y="165" text-anchor="middle" fill="#334155" font-size="10">Integration</text><circle cx="400" cy="65" r="50" fill="#3b82f6" opacity="0.9"/><text x="400" y="60" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Best Available</text><text x="400" y="75" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Research</text><text x="400" y="95" text-anchor="middle" fill="#bfdbfe" font-size="9">(methods fit questions)</text><circle cx="315" cy="210" r="50" fill="#f59e0b" opacity="0.9"/><text x="315" y="205" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Clinical</text><text x="315" y="220" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Expertise</text><text x="315" y="240" text-anchor="middle" fill="#fde68a" font-size="9">(assessment and skill)</text><circle cx="485" cy="210" r="50" fill="#10b981" opacity="0.9"/><text x="485" y="200" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Patient</text><text x="485" y="215" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Characteristics</text><text x="485" y="235" text-anchor="middle" fill="#a7f3d0" font-size="9">(values/culture/context)</text><path d="M400,115 L400,105" stroke="#94a3b8" stroke-width="3"/><path d="M355,180 L362,170" stroke="#94a3b8" stroke-width="3"/><path d="M445,180 L438,170" stroke="#94a3b8" stroke-width="3"/><text x="400" y="285" text-anchor="middle" fill="#94a3b8" font-size="12" font-style="italic">Integrate evidence, expertise, and patient context; monitor benefits, harms, and fit.</text></svg>'
            }
        },
        {
            heading: 'The Common Factors Debate',
            content: '<p>One of the most important debates in psychotherapy research: what makes therapy work?</p>' +
                '<table>' +
                '<tr><th>Position</th><th>Key Proponent</th><th>Argument</th></tr>' +
                '<tr><td><strong>Specific Factors (Medical Model)</strong></td><td>Treatment researchers</td><td>Specific techniques (exposure, cognitive restructuring, EMDR) are the active ingredients. Different disorders require different specific treatments.</td></tr>' +
                '<tr><td><strong>Common Factors (Contextual Model)</strong></td><td><strong>Bruce Wampold</strong></td><td>Shared relational and contextual processes contribute to outcome, but their magnitude, causal role, and interaction with specific methods vary across problems, patients, therapists, and study designs.</td></tr>' +
                '</table>' +
                '<p><strong>The Dodo Bird Verdict</strong> (Rosenzweig, 1936): "Everybody has won, and all must have prizes." The \u201cDodo bird\u201d phrase summarizes an influential equivalence hypothesis, not a universal verdict. Some bona fide therapies have similar average outcomes in some comparisons, while specific procedures are important for particular targets and equivalence depends on comparator quality, outcome, timing, and population.</p>' +
                '<p><strong>Lambert\u2019s historical 40/30/15/15 graphic:</strong> These percentages are often repeated as if they partition empirically estimated outcome variance. They are better treated as an illustrative heuristic; categories overlap, estimates depend on definitions and design, and they should not be used to rank a patient\u2019s treatment ingredients.</p>' +
                '<p><strong>Therapeutic alliance</strong>: Alliance is reliably associated with outcome across many studies, with historical meta-analytic estimates around r = .28. Association is not a fixed causal percentage: early improvement can strengthen alliance, measurement timing matters, and effective treatment integrates relationship and appropriate methods.</p>' +
                '<p><strong>EPPP Tip:</strong> Do not memorize 40/30/15/15 as measured variance. Know the broader lesson: outcomes reflect patient/context factors, relationship processes, expectations, therapist effects, and intervention methods, and EBPP evaluates how they interact for the case.</p>',
            keyTerms: ['Common factors', 'Wampold', 'Dodo Bird Verdict', 'Lambert', 'Therapeutic alliance', 'Specific factors', 'Extratherapeutic factors'],
            knowledgeCheck: {
                question: 'Which interpretation of Lambert\u2019s often-repeated 40/30/15/15 psychotherapy graphic is most defensible?',
                options: [
                    'It is a precise causal variance decomposition that applies to every disorder.',
                    'It is a historical heuristic highlighting multiple contributors, not a universal empirical partition of outcome variance.',
                    'It proves specific techniques do not matter.',
                    'It means alliance scores alone should determine treatment selection.'
                ],
                answer: 1,
                rationale: 'The graphic is pedagogically memorable but is not a stable causal partition derived for every population and treatment. Relationship, patient/context, expectations, therapist, and specific-method effects can overlap and interact.'
            }
        },
        {
            heading: 'Dose-Response and Therapy Outcomes',
            content: '<p>Research on how much therapy is needed:</p>' +
                '<ul>' +
                '<li><strong>Howard et al. (1986) dose-response</strong>: A historical dose-effect analysis estimated improvement probabilities that rose with session count. These sample-level estimates do not prescribe an individual treatment length and depend on outcome definitions, case mix, setting, treatment, and dropout.</li>' +
                '<li><strong>Lambert (2013)</strong>: Measurement-based feedback can help detect nonresponse or deterioration and may improve outcomes in some settings, especially when clinicians act on valid feedback; effects depend on implementation and population</li>' +
                '<li><strong>Therapist effects</strong>: Therapist effects are detectable, but estimates vary with design, nesting, reliability, setting, patient mix, and outcome; they do not imply a therapist is equally effective across all cases</li>' +
                '<li><strong>Deterioration</strong>: Some clients deteriorate, with rates varying substantially by population, setting, measure, threshold, and follow-up. Routine monitoring can support earlier recognition but is not sufficient by itself.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Early change is common at the group level, but duration should follow need, response, risk, preference, evidence, and context. Track outcomes and functioning without imposing a session quota from an average curve.</p>',
            keyTerms: ['Dose-response', 'Howard', 'OQ-45', 'Outcome monitoring', 'Therapist effects', 'Deterioration']
        },
        {
            heading: 'Antidepressant Medications',
            content: '<p>Psychologists must understand the major classes of antidepressants, their mechanisms, and their side effects:</p>' +
                '<table>' +
                '<tr><th>Class</th><th>Mechanism</th><th>Examples</th><th>Key Side Effects</th></tr>' +
                '<tr><td><strong>SSRIs</strong></td><td>Inhibit the serotonin transporter; downstream clinical effects involve broader adaptation</td><td>Fluoxetine (Prozac), Sertraline (Zoloft), Paroxetine (Paxil), Escitalopram (Lexapro)</td><td>Sexual, gastrointestinal, sleep, activation, bleeding, sodium, discontinuation, and interaction risks vary by agent and patient; generally less cardiotoxic in overdose than TCAs, not \u201csafe.\u201d</td></tr>' +
                '<tr><td><strong>SNRIs</strong></td><td>Block serotonin AND norepinephrine reuptake</td><td>Venlafaxine (Effexor), Duloxetine (Cymbalta)</td><td>Agent- and dose-specific serotonergic/noradrenergic effects; monitor relevant cardiovascular, discontinuation, interaction, and indication-specific risks</td></tr>' +
                '<tr><td><strong>TCAs</strong></td><td>Block serotonin and norepinephrine reuptake + affect other receptors</td><td>Amitriptyline (Elavil), Imipramine (Tofranil), Nortriptyline (Pamelor)</td><td>Anticholinergic, orthostatic, sedation, conduction/arrhythmia, and overdose toxicity risks; can be life-threatening in overdose</td></tr>' +
                '<tr><td><strong>MAOIs</strong></td><td>Inhibit monoamine oxidase enzyme \u2192 more serotonin, norepinephrine, dopamine</td><td>Phenelzine (Nardil), Tranylcypromine (Parnate)</td><td>Severe hypertension can occur with high-tyramine exposure and interacting drugs; follow medication-specific dietary, washout, and interaction guidance.</td></tr>' +
                '</table>' +
                '<p><strong>Key pharmacological concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Therapeutic lag</strong>: Onset and trajectory vary by symptom, medication, dose, adherence, and patient; early adverse effects and activation may precede benefit, and full response may take longer than a fixed 2\u20134 weeks</li>' +
                '<li><strong>Black box warning</strong>: U.S. labels warn of increased suicidal thoughts and behaviors versus placebo in short-term studies of children, adolescents, and young adults through age 24; monitor all ages for clinical worsening, suicidality, or unusual behavior, especially early and around dose changes</li>' +
                '<li><strong>Serotonin syndrome</strong>: Potentially fatal condition from too much serotonergic activity (combining SSRIs with MAOIs, St. John\u2019s Wort, or other serotonergic drugs). Symptoms: agitation, hyperthermia, tremor, clonus.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> SSRIs are common options, but treatment selection is diagnosis- and person-specific. SSRI/MAOI coadministration is contraindicated and switching requires label-specific washout. Do not use a universal 2\u20134-week rule for response.</p>',
            keyTerms: ['SSRIs', 'SNRIs', 'TCAs', 'MAOIs', 'Serotonin syndrome', 'Tyramine', 'Therapeutic lag', 'Black box warning'],
            expandableCase: {
                title: 'The Dangerous Supplement',
                clinicalDescription: 'A 45-year-old woman on fluoxetine (Prozac) for depression begins taking St. John\'s Wort, an herbal supplement, on a friend\'s recommendation. Within 48 hours, she presents to the ER with agitation, high fever (104\u00b0F), profuse sweating, rapid heart rate, muscle rigidity, and involuntary jerking movements (clonus).',
                diagnosis: 'Serotonin Syndrome',
                explanation: 'Fluoxetine (an SSRI) and St. John\'s Wort both increase serotonergic activity. Combining them created dangerously high serotonin levels, causing Serotonin Syndrome \u2014 a potentially fatal condition. The pattern includes mental-status, autonomic, and neuromuscular findings, with hyperreflexia and clonus particularly informative. Severe suspected toxicity requires urgent medical evaluation; interaction risk is drug-, dose-, and context-specific.'
            }
        },
        {
            heading: 'Antipsychotic, Anxiolytic & Mood Stabilizer Medications',
            content: '<p><strong>Antipsychotics:</strong></p>' +
                '<table>' +
                '<tr><th>Generation</th><th>Mechanism</th><th>Examples</th><th>Key Side Effects</th></tr>' +
                '<tr><td><strong>First-generation (Typical)</strong></td><td>Block D2 dopamine receptors</td><td>Haloperidol (Haldol), Chlorpromazine (Thorazine)</td><td><strong>Extrapyramidal symptoms (EPS)</strong>: dystonia, akathisia, parkinsonism. <strong>Tardive dyskinesia (TD)</strong>: potentially persistent involuntary movements; risk varies and can occur with multiple dopamine-receptor-blocking agents</td></tr>' +
                '<tr><td><strong>Second-generation (Atypical)</strong></td><td>D2 and serotonin effects vary; some agents are partial agonists</td><td>Risperidone (Risperdal), Olanzapine (Zyprexa), Quetiapine (Seroquel), Clozapine (Clozaril), Aripiprazole (Abilify)</td><td>Movement, prolactin, metabolic, cardiac, sedation, and other risks vary by agent. Clozapine has a severe-neutropenia warning and label-directed ANC monitoring; its U.S. REMS was removed in 2025.</td></tr>' +
                '</table>' +
                '<p><strong>Anxiolytics:</strong></p>' +
                '<table>' +
                '<tr><th>Class</th><th>Mechanism</th><th>Examples</th><th>Key Facts</th></tr>' +
                '<tr><td><strong>Benzodiazepines</strong></td><td>Enhance GABA activity at GABA-A receptors</td><td>Diazepam (Valium), Alprazolam (Xanax), Lorazepam (Ativan), Clonazepam (Klonopin)</td><td>Can act rapidly but carry misuse, addiction, physical-dependence, withdrawal, sedation, and psychomotor risks; alcohol, opioids, and other CNS depressants can increase danger</td></tr>' +
                '<tr><td><strong>Buspirone</strong></td><td>5-HT1A partial agonist</td><td>Buspirone (BuSpar)</td><td>Delayed effect and lower misuse/physical-dependence liability than benzodiazepines, but adverse effects such as dizziness or drowsiness occur; selection is individualized</td></tr>' +
                '</table>' +
                '<p><strong>Mood Stabilizers:</strong></p>' +
                '<table>' +
                '<tr><th>Drug</th><th>Uses</th><th>Key Side Effects / Monitoring</th></tr>' +
                '<tr><td><strong>Lithium</strong></td><td>An established option for acute and maintenance treatment in selected patients</td><td>Narrow therapeutic range; monitor serum levels and relevant renal, thyroid, electrolyte, hydration, pregnancy, symptom, and interaction factors according to the clinical situation.</td></tr>' +
                '<tr><td><strong>Valproate (Depakote)</strong></td><td>Bipolar disorder, seizures</td><td>Liver toxicity, weight gain, teratogenic (neural tube defects)</td></tr>' +
                '<tr><td><strong>Carbamazepine (Tegretol)</strong></td><td>Bipolar disorder, seizures</td><td>Blood dyscrasias, liver effects, drug interactions</td></tr>' +
                '<tr><td><strong>Lamotrigine (Lamictal)</strong></td><td>Bipolar depression prevention</td><td>Boxed warning for serious rash including SJS/TEN; risk is affected by age, valproate, starting dose, and escalation, and label-directed titration matters</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Use associations as prompts for agent-specific review: lithium monitoring and interactions; movement and metabolic risks across antipsychotics; clozapine severe-neutropenia/ANC guidance; benzodiazepine misuse, dependence, withdrawal, and co-depressant risks; buspirone\u2019s lower liability but nonzero adverse effects.</p>',
            keyTerms: ['Antipsychotics', 'Typical', 'Atypical', 'EPS', 'Tardive dyskinesia', 'Clozapine', 'Agranulocytosis', 'Benzodiazepines', 'GABA', 'Buspirone', 'Lithium', 'Valproate', 'Lamotrigine']
        },
        {
            heading: 'Stimulants and ADHD Medications',
            content: '<p>Stimulants are common and often effective ADHD medications, but age, impairment, comorbidity, cardiovascular and misuse risk, preferences, behavioral/educational supports, and monitoring shape an individualized plan:</p>' +
                '<table>' +
                '<tr><th>Class</th><th>Mechanism</th><th>Examples</th></tr>' +
                '<tr><td><strong>Methylphenidate</strong></td><td>Blocks dopamine and norepinephrine reuptake</td><td>Ritalin, Concerta, Focalin</td></tr>' +
                '<tr><td><strong>Amphetamine-based</strong></td><td>Increases dopamine and norepinephrine release + blocks reuptake</td><td>Adderall, Vyvanse, Dexedrine</td></tr>' +
                '</table>' +
                '<p><strong>Non-stimulant alternatives:</strong></p>' +
                '<ul>' +
                '<li><strong>Atomoxetine (Strattera)</strong>: NRI (norepinephrine reuptake inhibitor); not a controlled stimulant and has lower abuse liability, while retaining important warnings and adverse effects</li>' +
                '<li><strong>Guanfacine (Intuniv)</strong>: Alpha-2 agonist; an alpha-2A agonist used for ADHD; sedation, blood-pressure, pulse, and discontinuation considerations matter</li>' +
                '</ul>' +
                '<p><strong>Side effects of stimulants:</strong> may include appetite/weight and sleep effects, heart-rate/blood-pressure changes, mood or psychotic symptoms, and misuse risk. Monitor growth in children; reduced growth rate is possible but not deterministic.</p>' +
                '<p><strong>EPPP Tip:</strong> Avoid the \u201cparadoxical calming\u201d myth. Stimulants alter catecholamine signaling and can improve core symptoms in many people with ADHD, but response does not diagnose ADHD and mechanisms, benefits, and adverse effects are more complex than a single prefrontal-activation slogan.</p>',
            keyTerms: ['Stimulants', 'Methylphenidate', 'Amphetamine', 'ADHD', 'Atomoxetine', 'Dopamine', 'Norepinephrine']
        }
    ],
    aiCoda: {
        teaser: 'A contemporary extension: evaluating AI-supported care through EBPP rather than enthusiasm',
        content: '<p><strong>Reflective extension:</strong> AI-supported mental-health tools should be evaluated through the same EBPP integration: best available evidence for the intended use and population, competent human judgment, and the person\u2019s characteristics, culture, preferences, risks, and goals.</p>' +
            '<p>Historical common-factor percentages do not prove that technique is unimportant or that simulated empathy is equivalent to a therapeutic alliance. AI studies need direct measures of benefit, harm, engagement, equity, privacy, dependency, escalation, and durability, compared with relevant alternatives.</p>' +
            '<p>For medication content, an AI system should retrieve current labels and flag uncertainty rather than recommend treatment from class mnemonics. A qualified prescriber and pharmacist remain essential for diagnosis, medication reconciliation, contraindications, monitoring, and changes in therapy.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> EBPP integrates research, clinical expertise, and patient characteristics/culture/preferences through collaborative decisions and monitoring. Do not treat Lambert\u2019s 40/30/15/15 as a literal variance decomposition. Medication associations are recognition cues, not prescribing rules; agent- and patient-specific evidence matters.'
    },
    references: [
        'American Psychological Association. (2006). Evidence-based practice in psychology. <em>American Psychologist, 61</em>(4), 271\u2013285.',
        'Horvath, A. O., Del Re, A. C., Fl\u00fcckiger, C., & Symonds, D. (2011). Alliance in individual psychotherapy. <em>Psychotherapy, 48</em>(1), 9\u201316.',
        'Howard, K. I., Kopta, S. M., Krause, M. S., & Orlinsky, D. E. (1986). The dose\u2013effect relationship in psychotherapy. <em>American Psychologist, 41</em>(2), 159\u2013164.',
        'Lambert, M. J. (2013). <em>Bergin and Garfield\u2019s handbook of psychotherapy and behavior change</em> (6th ed.). Wiley.',
        'Rosenzweig, S. (1936). Some implicit common factors in diverse methods of psychotherapy. <em>American Journal of Orthopsychiatry, 6</em>(3), 412\u2013415.',
        'Stahl, S. M. (2021). <em>Stahl\u2019s essential psychopharmacology: Neuroscientific basis and practical applications</em> (5th ed.). Cambridge University Press.',
        'Wampold, B. E. (2015). How important are the common factors in psychotherapy? An update. <em>World Psychiatry, 14</em>(3), 270\u2013277.'
    ]
});
