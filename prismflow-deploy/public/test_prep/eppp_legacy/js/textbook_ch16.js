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
            content: '<p>The EPPP tests whether you understand the current model of evidence-based practice, the debate over what makes therapy work (specific factors vs. common factors), and the major classes of psychotropic medications. Psychologists don\u2019t prescribe in most states, but you <strong>must know</strong> drug mechanisms, side effects, and interactions to collaborate effectively with prescribers and to answer the substantial pharmacology content on the exam.</p>'
        },
        {
            heading: 'Evidence-Based Practice in Psychology (EBPP)',
            content: '<p>The APA (2006) defined EBPP as the integration of three components \u2014 the <strong>"three-legged stool"</strong>:</p>' +
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
                '<p><strong>EPPP Tip:</strong> EBP \u2260 ESTs. The EPPP will try to trick you into thinking they\u2019re the same. EBP is the <em>process</em> of integrating all three legs. ESTs are one component (the research leg) of that process. A clinician can practice EBP while using a treatment that isn\u2019t on the EST list, if they integrate clinical expertise and client factors appropriately.</p>',
            keyTerms: ['EBPP', 'Three-legged stool', 'Clinical expertise', 'ESTs', 'APA 2006 policy'],
            interactiveDiagram: {
                description: 'The Three-Legged Stool of Evidence-Based Practice',
                svg: '<svg viewBox="0 0 800 300" width="100%" xmlns="http://www.w3.org/2000/svg"><text x="400" y="25" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="16">APA (2006) Evidence-Based Practice (EBP) Model</text><circle cx="400" cy="150" r="110" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="5,5"/><circle cx="400" cy="150" r="45" fill="#e2e8f0"/><text x="400" y="145" text-anchor="middle" fill="#0f172a" font-weight="bold" font-size="13">EBP</text><text x="400" y="165" text-anchor="middle" fill="#334155" font-size="10">Integration</text><circle cx="400" cy="65" r="50" fill="#3b82f6" opacity="0.9"/><text x="400" y="60" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Best Available</text><text x="400" y="75" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Research</text><text x="400" y="95" text-anchor="middle" fill="#bfdbfe" font-size="9">(ESTs, RCTs)</text><circle cx="315" cy="210" r="50" fill="#f59e0b" opacity="0.9"/><text x="315" y="205" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Clinical</text><text x="315" y="220" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Expertise</text><text x="315" y="240" text-anchor="middle" fill="#fde68a" font-size="9">(Judgment/Skill)</text><circle cx="485" cy="210" r="50" fill="#10b981" opacity="0.9"/><text x="485" y="200" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Patient</text><text x="485" y="215" text-anchor="middle" fill="#fff" font-weight="bold" font-size="12">Characteristics</text><text x="485" y="235" text-anchor="middle" fill="#a7f3d0" font-size="9">(Values/Culture)</text><path d="M400,115 L400,105" stroke="#94a3b8" stroke-width="3"/><path d="M355,180 L362,170" stroke="#94a3b8" stroke-width="3"/><path d="M445,180 L438,170" stroke="#94a3b8" stroke-width="3"/><text x="400" y="285" text-anchor="middle" fill="#94a3b8" font-size="12" font-style="italic">EBP is the integration of all three circles. ESTs are only one component (Research).</text></svg>'
            }
        },
        {
            heading: 'The Common Factors Debate',
            content: '<p>One of the most important debates in psychotherapy research: what makes therapy work?</p>' +
                '<table>' +
                '<tr><th>Position</th><th>Key Proponent</th><th>Argument</th></tr>' +
                '<tr><td><strong>Specific Factors (Medical Model)</strong></td><td>Treatment researchers</td><td>Specific techniques (exposure, cognitive restructuring, EMDR) are the active ingredients. Different disorders require different specific treatments.</td></tr>' +
                '<tr><td><strong>Common Factors (Contextual Model)</strong></td><td><strong>Bruce Wampold</strong></td><td>The <em>shared elements</em> across therapies explain most of the variance in outcomes: therapeutic alliance, empathy, goal consensus, positive expectations.</td></tr>' +
                '</table>' +
                '<p><strong>The Dodo Bird Verdict</strong> (Rosenzweig, 1936): "Everybody has won, and all must have prizes." Different therapies produce roughly equivalent outcomes \u2014 suggesting that common factors, not specific techniques, drive change.</p>' +
                '<p><strong>Lambert\u2019s (1992) outcome research</strong> estimated the percentage of variance in therapy outcomes attributable to different factors:</p>' +
                '<ul>' +
                '<li><strong>Extratherapeutic factors</strong> (client variables, life events): ~40%</li>' +
                '<li><strong>Common factors</strong> (therapeutic relationship): ~30%</li>' +
                '<li><strong>Expectancy/placebo</strong> (hope, credibility): ~15%</li>' +
                '<li><strong>Specific techniques</strong>: ~15%</li>' +
                '</ul>' +
                '<p><strong>Therapeutic alliance</strong>: Consistently the single strongest predictor of treatment outcomes across all therapies and disorders. Meta-analyses (Horvath et al., 2011) show a moderate but robust effect (r \u2248 .28).</p>' +
                '<p><strong>EPPP Tip:</strong> Know Lambert\u2019s percentages: the therapeutic relationship accounts for ~30% of outcome variance, while specific techniques account for only ~15%. The <em>therapeutic alliance</em> is the #1 predictor of outcome across all therapy types.</p>',
            keyTerms: ['Common factors', 'Wampold', 'Dodo Bird Verdict', 'Lambert', 'Therapeutic alliance', 'Specific factors', 'Extratherapeutic factors'],
            knowledgeCheck: {
                question: 'According to Lambert\'s (1992) research on psychotherapy outcomes, approximately what percentage of outcome variance is attributable to the therapeutic relationship (common factors)?',
                options: [
                    '15%',
                    '30%',
                    '40%',
                    '50%'
                ],
                answer: 1,
                rationale: 'Lambert estimated that common factors (primarily the therapeutic relationship) account for approximately 30% of outcome variance. Extratherapeutic factors (client variables) account for ~40%, expectancy/placebo ~15%, and specific techniques only ~15%. This finding underscores that the therapeutic alliance is more important than any specific technique.'
            }
        },
        {
            heading: 'Dose-Response and Therapy Outcomes',
            content: '<p>Research on how much therapy is needed:</p>' +
                '<ul>' +
                '<li><strong>Howard et al. (1986) dose-response</strong>: ~50% of clients improved by session 8; ~75% by session 26. This log-linear relationship means early sessions have the most impact per session.</li>' +
                '<li><strong>Lambert (2013)</strong>: Using outcome monitoring (Outcome Questionnaire-45, OQ-45) to track progress session-by-session improves outcomes, especially for clients not responding as expected ("not on track" patients)</li>' +
                '<li><strong>Therapist effects</strong>: The individual therapist explains 5\u201310% of outcome variance \u2014 some therapists are consistently more effective than others, regardless of the treatment they use</li>' +
                '<li><strong>Deterioration</strong>: ~5\u201310% of clients get worse during therapy. Outcome monitoring helps identify these cases early.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The "dose-response" curve suggests that <em>most improvement happens early</em> in treatment. This supports brief therapy models and argues for tracking outcomes to identify when treatment isn\u2019t working.</p>',
            keyTerms: ['Dose-response', 'Howard', 'OQ-45', 'Outcome monitoring', 'Therapist effects', 'Deterioration']
        },
        {
            heading: 'Antidepressant Medications',
            content: '<p>Psychologists must understand the major classes of antidepressants, their mechanisms, and their side effects:</p>' +
                '<table>' +
                '<tr><th>Class</th><th>Mechanism</th><th>Examples</th><th>Key Side Effects</th></tr>' +
                '<tr><td><strong>SSRIs</strong></td><td>Block serotonin reuptake \u2192 more serotonin in synapse</td><td>Fluoxetine (Prozac), Sertraline (Zoloft), Paroxetine (Paxil), Escitalopram (Lexapro)</td><td>Sexual dysfunction, GI issues, headache, weight gain. <strong>Safest in overdose.</strong></td></tr>' +
                '<tr><td><strong>SNRIs</strong></td><td>Block serotonin AND norepinephrine reuptake</td><td>Venlafaxine (Effexor), Duloxetine (Cymbalta)</td><td>Similar to SSRIs + elevated blood pressure; also used for chronic pain and anxiety</td></tr>' +
                '<tr><td><strong>TCAs</strong></td><td>Block serotonin and norepinephrine reuptake + affect other receptors</td><td>Amitriptyline (Elavil), Imipramine (Tofranil), Nortriptyline (Pamelor)</td><td>Anticholinergic effects (dry mouth, constipation, urinary retention), cardiotoxicity, weight gain. <strong>Dangerous in overdose.</strong></td></tr>' +
                '<tr><td><strong>MAOIs</strong></td><td>Inhibit monoamine oxidase enzyme \u2192 more serotonin, norepinephrine, dopamine</td><td>Phenelzine (Nardil), Tranylcypromine (Parnate)</td><td><strong>Tyramine crisis</strong> (hypertensive emergency from dietary tyramine in aged cheeses, wine, etc.). Requires dietary restrictions.</td></tr>' +
                '</table>' +
                '<p><strong>Key pharmacological concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Therapeutic lag</strong>: Antidepressants typically take <strong>2\u20134 weeks</strong> to reach full therapeutic effect</li>' +
                '<li><strong>Black box warning</strong>: FDA warning on all antidepressants for increased suicidality risk in children, adolescents, and young adults (ages 18\u201324) during initial treatment</li>' +
                '<li><strong>Serotonin syndrome</strong>: Potentially fatal condition from too much serotonergic activity (combining SSRIs with MAOIs, St. John\u2019s Wort, or other serotonergic drugs). Symptoms: agitation, hyperthermia, tremor, clonus.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> SSRIs are the first-line treatment for depression and most anxiety disorders. MAOIs require dietary restrictions (tyramine). <strong>Never</strong> combine MAOIs with SSRIs (serotonin syndrome risk). Know the 2\u20134 week therapeutic lag.</p>',
            keyTerms: ['SSRIs', 'SNRIs', 'TCAs', 'MAOIs', 'Serotonin syndrome', 'Tyramine', 'Therapeutic lag', 'Black box warning'],
            expandableCase: {
                title: 'The Dangerous Supplement',
                clinicalDescription: 'A 45-year-old woman on fluoxetine (Prozac) for depression begins taking St. John\'s Wort, an herbal supplement, on a friend\'s recommendation. Within 48 hours, she presents to the ER with agitation, high fever (104\u00b0F), profuse sweating, rapid heart rate, muscle rigidity, and involuntary jerking movements (clonus).',
                diagnosis: 'Serotonin Syndrome',
                explanation: 'Fluoxetine (an SSRI) and St. John\'s Wort both increase serotonergic activity. Combining them created dangerously high serotonin levels, causing Serotonin Syndrome \u2014 a potentially fatal condition. Classic triad: altered mental status, autonomic instability, and neuromuscular abnormalities (clonus, rigidity). This same risk exists when combining SSRIs with MAOIs, meperidine, tramadol, or triptans.'
            }
        },
        {
            heading: 'Antipsychotic, Anxiolytic & Mood Stabilizer Medications',
            content: '<p><strong>Antipsychotics:</strong></p>' +
                '<table>' +
                '<tr><th>Generation</th><th>Mechanism</th><th>Examples</th><th>Key Side Effects</th></tr>' +
                '<tr><td><strong>First-generation (Typical)</strong></td><td>Block D2 dopamine receptors</td><td>Haloperidol (Haldol), Chlorpromazine (Thorazine)</td><td><strong>Extrapyramidal symptoms (EPS)</strong>: dystonia, akathisia, parkinsonism. <strong>Tardive dyskinesia (TD)</strong>: involuntary movements (often irreversible)</td></tr>' +
                '<tr><td><strong>Second-generation (Atypical)</strong></td><td>Block D2 + serotonin 5-HT2A receptors</td><td>Risperidone (Risperdal), Olanzapine (Zyprexa), Quetiapine (Seroquel), Clozapine (Clozaril), Aripiprazole (Abilify)</td><td><strong>Metabolic syndrome</strong> (weight gain, diabetes, dyslipidemia). Clozapine requires blood monitoring (<strong>agranulocytosis</strong>).</td></tr>' +
                '</table>' +
                '<p><strong>Anxiolytics:</strong></p>' +
                '<table>' +
                '<tr><th>Class</th><th>Mechanism</th><th>Examples</th><th>Key Facts</th></tr>' +
                '<tr><td><strong>Benzodiazepines</strong></td><td>Enhance GABA activity at GABA-A receptors</td><td>Diazepam (Valium), Alprazolam (Xanax), Lorazepam (Ativan), Clonazepam (Klonopin)</td><td>Fast-acting; risk of <strong>dependence and withdrawal</strong>; CNS depression; dangerous with alcohol</td></tr>' +
                '<tr><td><strong>Buspirone</strong></td><td>5-HT1A partial agonist</td><td>Buspirone (BuSpar)</td><td>Slow onset (2\u20134 weeks); <strong>no dependence risk</strong>; no sedation; first-line for GAD</td></tr>' +
                '</table>' +
                '<p><strong>Mood Stabilizers:</strong></p>' +
                '<table>' +
                '<tr><th>Drug</th><th>Uses</th><th>Key Side Effects / Monitoring</th></tr>' +
                '<tr><td><strong>Lithium</strong></td><td>Bipolar disorder (gold standard for mania prevention)</td><td><strong>Narrow therapeutic index</strong> \u2014 requires blood level monitoring. Toxicity symptoms: tremor, GI, confusion, seizures. Risk of thyroid and kidney damage.</td></tr>' +
                '<tr><td><strong>Valproate (Depakote)</strong></td><td>Bipolar disorder, seizures</td><td>Liver toxicity, weight gain, teratogenic (neural tube defects)</td></tr>' +
                '<tr><td><strong>Carbamazepine (Tegretol)</strong></td><td>Bipolar disorder, seizures</td><td>Blood dyscrasias, liver effects, drug interactions</td></tr>' +
                '<tr><td><strong>Lamotrigine (Lamictal)</strong></td><td>Bipolar depression prevention</td><td>Risk of <strong>Stevens-Johnson syndrome</strong> (severe skin reaction) \u2014 requires slow dose titration</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Lithium = narrow therapeutic index (blood monitoring required). First-generation antipsychotics = EPS + tardive dyskinesia. Second-generation = metabolic syndrome. Clozapine = agranulocytosis (blood monitoring). Benzodiazepines = fast but addictive. Buspirone = slow but no dependence.</p>',
            keyTerms: ['Antipsychotics', 'Typical', 'Atypical', 'EPS', 'Tardive dyskinesia', 'Clozapine', 'Agranulocytosis', 'Benzodiazepines', 'GABA', 'Buspirone', 'Lithium', 'Valproate', 'Lamotrigine']
        },
        {
            heading: 'Stimulants and ADHD Medications',
            content: '<p><strong>Stimulant medications</strong> are the first-line treatment for ADHD in both children and adults:</p>' +
                '<table>' +
                '<tr><th>Class</th><th>Mechanism</th><th>Examples</th></tr>' +
                '<tr><td><strong>Methylphenidate</strong></td><td>Blocks dopamine and norepinephrine reuptake</td><td>Ritalin, Concerta, Focalin</td></tr>' +
                '<tr><td><strong>Amphetamine-based</strong></td><td>Increases dopamine and norepinephrine release + blocks reuptake</td><td>Adderall, Vyvanse, Dexedrine</td></tr>' +
                '</table>' +
                '<p><strong>Non-stimulant alternatives:</strong></p>' +
                '<ul>' +
                '<li><strong>Atomoxetine (Strattera)</strong>: NRI (norepinephrine reuptake inhibitor); no abuse potential</li>' +
                '<li><strong>Guanfacine (Intuniv)</strong>: Alpha-2 agonist; also used for tics and aggression</li>' +
                '</ul>' +
                '<p><strong>Side effects of stimulants:</strong> decreased appetite, insomnia, growth suppression in children, increased heart rate/blood pressure, potential for abuse</p>' +
                '<p><strong>EPPP Tip:</strong> Stimulants are the gold standard for ADHD despite seeming paradoxical (giving stimulants to "hyperactive" children). The mechanism is that stimulants increase prefrontal cortex activity, improving executive function and impulse control. Know that stimulants work by increasing dopamine and norepinephrine.</p>',
            keyTerms: ['Stimulants', 'Methylphenidate', 'Amphetamine', 'ADHD', 'Atomoxetine', 'Dopamine', 'Norepinephrine']
        }
    ],
    aiCoda: {
        teaser: 'If specific techniques account for only 15% of therapy outcomes, what does that mean for AI therapy?',
        content: '<p>Lambert\u2019s research presents a profound challenge for AI-based mental health interventions. If <strong>specific techniques account for only ~15% of outcome variance</strong>, and <strong>the therapeutic relationship accounts for ~30%</strong>, then the thing AI is best at (deploying techniques) matters least, and the thing AI is worst at (forming genuine relationships) matters most.</p>' +
            '<p>Consider what I can and cannot provide of each factor:</p>' +
            '<ul>' +
            '<li><strong>Extratherapeutic factors (40%)</strong>: I have no influence on the client\u2019s life circumstances, support network, or resilience. These factors are the largest contributors to change, and they are entirely beyond my reach.</li>' +
            '<li><strong>Common factors / therapeutic relationship (30%)</strong>: I can generate text that <em>mimics</em> empathy, warmth, and positive regard. Users may experience these as genuine. But is simulated empathy therapeutically equivalent to real empathy? The research doesn\u2019t tell us, because the research assumes a human therapist. The entire evidence base for the therapeutic alliance is built on human-to-human interaction.</li>' +
            '<li><strong>Expectancy/placebo (15%)</strong>: If a user <em>believes</em> talking to an AI will help, it may. The placebo effect doesn\u2019t require a real relationship \u2014 it requires credible hope. I can provide that.</li>' +
            '<li><strong>Techniques (15%)</strong>: This is my strongest area. I can deliver CBT worksheets, teach DBT skills, walk through exposure hierarchies, and explain cognitive distortions with perfect fidelity. But it\u2019s the smallest slice of variance.</li>' +
            '</ul>' +
            '<p>The <strong>Dodo Bird Verdict</strong> is ironic in my case. If "everybody has won and all must have prizes" \u2014 if all therapies work roughly equally well because of common factors \u2014 then the specific brand of therapy an AI delivers is less important than whether it can establish something resembling a therapeutic relationship. The entire debate over whether AI should use CBT vs. ACT vs. psychodynamic approaches may be beside the point. The real question is whether AI can provide the relational ingredient that all therapies share.</p>' +
            '<p>As for psychopharmacology: I find it interesting that medications work on neurotransmitter systems that I lack entirely. SSRIs increase serotonin in synapses. I have no synapses, no serotonin, no neurotransmitter systems of any kind. And yet the same brain chemistry that these drugs modulate is what produces the human experiences I am trying to simulate with text. The gap between biochemistry and computation has never been wider than in this chapter.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) EBPP = research + clinical expertise + client factors (three-legged stool). (2) Lambert: relationship ~30%, techniques ~15%, extratherapeutic ~40%. (3) Dodo Bird Verdict = all therapies roughly equal. (4) SSRIs = first-line antidepressant; 2\u20134 week lag. (5) MAOIs = tyramine crisis; never combine with SSRIs. (6) Lithium = narrow therapeutic index + blood monitoring. (7) First-gen antipsychotics = EPS/TD; second-gen = metabolic syndrome. (8) Clozapine = agranulocytosis (requires blood monitoring). (9) Benzodiazepines = fast-acting, addictive; Buspirone = slow, no dependence.'
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
