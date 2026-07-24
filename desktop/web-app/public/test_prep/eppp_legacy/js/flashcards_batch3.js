/* PasstheEPPP — Flashcard Bank Batch 3
   ~80 flashcards: cross-domain integration, DSM-5-TR, commonly confused pairs,
   psychopharmacology quick-reference
   Loaded AFTER flashcards_batch2.js */
(function() {
    if (typeof EPPPData === 'undefined') return;

    const batch3 = {
        1: [ // Bio — Psychopharmacology Quick-Reference
            {front: "Antidepressant classes: complete list", back: "SSRIs (fluoxetine, sertraline) → first-line. SNRIs (venlafaxine, duloxetine) → depression + pain. TCAs (amitriptyline, imipramine) → older, cardiotoxic in OD. MAOIs (phenelzine, tranylcypromine) → tyramine restrictions. Atypicals (bupropion, mirtazapine, trazodone)."},
            {front: "Anxiolytics: complete comparison", back: "Benzodiazepines (alprazolam, clonazepam): fast-acting, dependence risk. Buspirone: 5-HT1A partial agonist, no dependence, slow onset. SSRIs/SNRIs: first-line for chronic anxiety. Hydroxyzine: antihistamine, PRN. Beta-blockers (propranolol): performance anxiety only."},
            {front: "Mood stabilizers comparison", back: "Lithium: classic, narrow therapeutic index, requires blood monitoring. Valproate (Depakote): also for seizures, hepatotoxic. Carbamazepine (Tegretol): also for seizures, blood dyscrasias. Lamotrigine (Lamictal): prevents depressive episodes, risk of SJS rash. Atypical antipsychotics: increasingly used."},
            {front: "ADHD medications: stimulant vs. non-stimulant", back: "Stimulants: methylphenidate (Ritalin/Concerta), amphetamines (Adderall/Vyvanse) — first-line, fast onset, abuse potential. Non-stimulants: atomoxetine (Strattera, NRI), guanfacine (Intuniv, alpha-2 agonist), clonidine. Non-stimulants preferred when abuse risk or comorbid tics."},
            {front: "Clozapine: major indications and monitoring", back: "Clozapine is used for treatment-resistant schizophrenia and can reduce recurrent suicidal behavior in schizophrenia or schizoaffective disorder. Serious risks include severe neutropenia, myocarditis, seizures, and metabolic effects. The U.S. REMS was removed in 2025, but FDA labeling still recommends ANC monitoring at specified frequencies."},
            {front: "Neuroanatomy: lobes and functions summary", back: "Frontal: planning, personality, motor, Broca's. Parietal: somatosensory, spatial processing. Temporal: auditory, memory (hippocampus), Wernicke's. Occipital: vision. Insula: interoception, disgust. Cingulate: error detection, motivation."},
            {front: "Neurotransmitter pathways summary", back: "Dopamine: mesolimbic (reward), mesocortical (cognition), nigrostriatal (movement), tuberoinfundibular (prolactin). Serotonin: raphe nuclei → widespread. Norepinephrine: locus coeruleus → widespread. ACh: basal forebrain → cortex (memory). GABA/Glutamate: ubiquitous."},
            {front: "Sleep stages and neurotransmitters", back: "NREM Stage 1: theta waves, hypnagogic hallucinations. Stage 2: sleep spindles, K-complexes. Stage 3 (SWS): delta waves, growth hormone release, memory consolidation. REM: rapid eye movements, dreaming, muscle atonia, ACh active. Melatonin, adenosine, GABA promote sleep. Orexin promotes wakefulness."},
            {front: "Autism spectrum disorder: biological basis", back: "Genetic: highly heritable (~80%), polygenic. Neurological: increased brain volume in early childhood, reduced pruning, atypical connectivity. Neurochemical: serotonin and oxytocin differences. NO causal link to vaccines (thoroughly debunked). Prevalence: ~1 in 36 (CDC, 2023)."},
            {front: "Seizure types and treatments", back: "Generalized tonic-clonic: whole brain, LOC, convulsions → valproate, levetiracetam. Absence: brief staring spells → ethosuximide. Focal/partial: one hemisphere → carbamazepine, lamotrigine. Status epilepticus: emergency → IV benzodiazepines (lorazepam). Psychogenic non-epileptic: therapy, not AEDs."}
        ],

        2: [ // Cognitive — Commonly Confused Pairs
            {front: "Proactive vs. retroactive interference", back: "ProACTIVE: old interferes with NEW (forward in time — pro = forward). RetroACTIVE: new interferes with OLD (backward in time — retro = backward). Mnemonic: 'Pro = previously learned disrupts,' 'Retro = recently learned disrupts.'"},
            {front: "Recall vs. recognition", back: "Recall: retrieve information with minimal cues (fill-in-the-blank, essay). Recognition: identify correct answer among options (multiple choice). Recognition is easier because it provides retrieval cues. Free recall < cued recall < recognition in difficulty."},
            {front: "Positive vs. negative reinforcement vs. punishment", back: "Positive reinforcement: ADD pleasant stimulus → increase behavior. Negative reinforcement: REMOVE aversive stimulus → increase behavior. Positive punishment: ADD aversive → decrease behavior. Negative punishment: REMOVE pleasant → decrease behavior. 'Positive/negative' = add/remove, not good/bad."},
            {front: "Fluid vs. crystallized intelligence", back: "Fluid (Gf): novel problem-solving, pattern recognition, abstract reasoning. Peaks ~25, declines with age. Crystallized (Gc): acquired knowledge, vocabulary, learned skills. Increases throughout life. Cattell-Horn model. Gf predicts learning speed; Gc predicts knowledge breadth."},
            {front: "Sensation vs. perception", back: "Sensation: detecting raw sensory stimuli (bottom-up). Perception: organizing and interpreting stimuli (top-down). Absolute threshold: minimum detectable stimulus (50% detection). Difference threshold (JND): minimum detectable change. Signal detection theory adds response bias to the model."},
            {front: "State-dependent vs. context-dependent memory", back: "State-dependent: internal state at encoding matches retrieval (drug studies — Goodwin et al.). Context-dependent: external environment matches (underwater study — Godden & Baddeley). Both support encoding specificity principle (Tulving). Mood-congruent memory is related."},
            {front: "Divergent vs. convergent thinking", back: "Divergent: generating multiple creative solutions (brainstorming). Associated with creativity. Convergent: narrowing down to single best answer (logic, analysis). IQ tests primarily measure convergent thinking. Guilford's distinction. Both needed for problem-solving."},
            {front: "Intrinsic vs. extrinsic motivation", back: "Intrinsic: doing activity for its own sake (enjoyment, curiosity). Extrinsic: doing for external rewards (money, grades). Overjustification effect: extrinsic rewards can UNDERMINE intrinsic motivation (Deci & Ryan, Self-Determination Theory). Autonomy, competence, relatedness support intrinsic."},
            {front: "Semantic vs. episodic memory", back: "Semantic: general knowledge and facts ('Paris is in France'). No specific time/place context. Episodic: personal events and experiences ('my trip to Paris'). Tied to specific time and context. Both are explicit/declarative. Episodic is more vulnerable to amnesia."},
            {front: "Short-term memory vs. working memory", back: "STM: passive storage of limited information (~7±2 items, ~20-30 seconds). Working memory (Baddeley): STM + active manipulation/processing. Components: phonological loop, visuospatial sketchpad, central executive, episodic buffer. Working memory is the modern, more comprehensive model."}
        ],

        3: [ // Social — Cross-Domain Integration
            {front: "Prejudice, discrimination, and stereotypes: distinctions", back: "Prejudice: attitude (cognitive/affective). Stereotype: cognitive belief about group traits. Discrimination: behavior/action. Can be explicit (conscious) or implicit (unconscious). Prejudice doesn't always lead to discrimination (and vice versa). All three can be positive or negative."},
            {front: "Kohlberg's moral reasoning applied to ethical dilemmas", back: "Heinz dilemma: Should he steal drug for dying wife? Preconventional: 'He'll go to jail' (punishment). Conventional: 'It's against the law' (rules). Postconventional: 'Life is more valuable than property' (principles). Level matters more than yes/no answer."},
            {front: "Power and privilege in assessment", back: "Test bias can disadvantage minority groups. Cultural loading in items. Stereotype threat can depress scores. Clinician bias in interpretation. APA Multicultural Guidelines: use culturally appropriate norms, consider linguistic differences, avoid pathologizing cultural differences."},
            {front: "Social psychology of mental health stigma", back: "Public stigma: societal prejudice/discrimination. Self-stigma: internalized negative beliefs. Label avoidance: avoiding treatment to avoid diagnosis. Contact-based interventions most effective for reducing stigma. Modified labeling theory: diagnosis itself creates social disadvantage."},
            {front: "Attachment theory applied to adult relationships", back: "Hazan & Shaver: infant attachment styles map to adult romantic styles. Secure adults: comfortable with intimacy, trust. Avoidant: uncomfortable with closeness, value independence. Anxious: fear abandonment, need constant reassurance. Disorganized: chaotic relationships."}
        ],

        4: [ // Development — DSM-5-TR Related
            {front: "Autism spectrum disorder: DSM-5-TR criteria", back: "Two domains: (1) Persistent deficits in social communication/interaction across contexts. (2) Restricted, repetitive behaviors/interests/activities. Symptoms in early developmental period. Severity levels 1-3 (requiring support → very substantial support). Prevalence ~1:36."},
            {front: "ADHD: DSM-5-TR presentations", back: "Three presentations: Predominantly Inattentive, Predominantly Hyperactive-Impulsive, Combined. Requires 6+ symptoms (5+ for age 17+) in ≥2 settings for ≥6 months. Onset before age 12 (changed from 7 in DSM-IV). Can persist into adulthood (~60% of childhood cases)."},
            {front: "Intellectual Disability: DSM-5-TR criteria", back: "Three criteria: (1) Intellectual functioning deficits (IQ ~70±5). (2) Adaptive functioning deficits (conceptual, social, practical). (3) Onset during developmental period. Severity based on ADAPTIVE functioning, not IQ alone (mild, moderate, severe, profound). Replaces 'mental retardation.'"},
            {front: "Specific Learning Disorders: DSM-5-TR", back: "Academic skill difficulties despite interventions, persisting ≥6 months. Specifiers: with impairment in reading (dyslexia), written expression (dysgraphia), mathematics (dyscalculia). Discrepancy model replaced by response-to-intervention (RTI). Intelligence is at least average."},
            {front: "Developmental milestones: key ages", back: "Social smile: 6-8 weeks. Object permanence: 8-12 months. First words: 12 months. Two-word sentences: 18-24 months. Theory of mind: 4 years. Conservation: 7 years. Abstract reasoning: 11+ years. Identity formation: adolescence. These are averages; cultural variation exists."}
        ],

        5: [ // Assessment — Commonly Compared Instruments
            {front: "MMPI-2 vs. PAI: key differences", back: "MMPI-2: 567 items, empirical keying, scales overlap, most researched. PAI (Morey): 344 items, rational construction, non-overlapping scales, easier reading level (4th vs 6th grade). Both are objective, broadband personality inventories. PAI gaining popularity due to shorter length and clarity."},
            {front: "WISC-V vs. Stanford-Binet 5", back: "WISC-V: ages 6-16, five index scores, Wechsler tradition. SB5: ages 2-85+, five factor scores, broader age range, nonverbal routing subtest useful for language-impaired. Both: M=100, SD=15. WISC-V: more widely used in schools. SB5: better for very young and very high/low ability."},
            {front: "Beck scales: BDI-II, BAI, BHS", back: "BDI-II: 21 items, depression severity, widely used, good sensitivity to change. BAI: 21 items, anxiety symptoms (especially somatic), differentiates anxiety from depression. BHS: 20 items, hopelessness — strong predictor of suicidal behavior. All: self-report, brief, well-validated."},
            {front: "Projective vs. objective tests", back: "Projective (Rorschach, TAT, sentence completion): ambiguous stimuli, reveal unconscious processes. Criticism: lower reliability, subjective scoring. Objective (MMPI-2, PAI, NEO-PI-R): structured items, standardized scoring. Better psychometrics but susceptible to response styles (faking)."},
            {front: "Achievement vs. aptitude tests", back: "Achievement: what has been learned (WIAT, WJ Achievement). Aptitude: potential for future learning/performance (SAT, GRE). Distinction is blurring — both measure learned abilities, differ mainly in PURPOSE. Intelligence tests were originally designed as aptitude measures."}
        ],

        6: [ // Treatment — Disorder-Specific Evidence Base
            {front: "First-line treatments for major depression", back: "Mild-moderate: CBT or behavioral activation alone. Moderate-severe: CBT + SSRI/SNRI (combined > either alone). Severe/chronic: medication essential. IPT also effective. ECT for treatment-resistant or acute suicide risk. Light therapy for seasonal pattern. Exercise as adjunct."},
            {front: "First-line treatments for anxiety disorders", back: "GAD: CBT (worry exposure, relaxation) + SSRI/SNRI. Social anxiety: CBT (cognitive restructuring + exposure) + SSRI. Specific phobias: exposure therapy (systematic desensitization or flooding — medication NOT first-line). Panic: CBT (interoceptive exposure) + SSRI. Agoraphobia: graded in-vivo exposure."},
            {front: "Treatment of PTSD: CPT vs. PE vs. EMDR", back: "CPT (Cognitive Processing Therapy): targets stuck points/maladaptive beliefs about trauma. PE (Prolonged Exposure): in-vivo + imaginal exposure. EMDR: bilateral stimulation during trauma reprocessing. All three have strong evidence, comparable outcomes. APA and VA recommend all three."},
            {front: "Treatment of substance use disorders", back: "MI for engagement. CBT for coping skills. Contingency management (reinforcing abstinence). 12-step facilitation. Relapse prevention (Marlatt). Medications: naltrexone/acamprosate (alcohol), buprenorphine/methadone/naltrexone (opioids). Integrated treatment for co-occurring disorders."},
            {front: "Treatment-resistant depression interventions", back: "Step 1: Optimize current medication. Step 2: Switch or augment (lithium, thyroid, aripiprazole). Step 3: ECT (most effective for treatment-resistant). Step 4: TMS (transcranial magnetic stimulation). Ketamine/esketamine (Spravato): rapid-acting for acute suicidality. Psychotherapy throughout."}
        ],

        7: [ // Research — Statistical Decision-Making
            {front: "When to use chi-square test", back: "Chi-square test of independence: two categorical variables (e.g., gender × preference). Goodness of fit: one categorical variable vs. expected distribution. Assumptions: independent observations, expected frequency ≥ 5 per cell. Non-parametric — no normality assumption needed."},
            {front: "When to use ANOVA vs. t-test", back: "t-test: compare 2 group means (independent or paired samples). ANOVA: compare 3+ group means simultaneously (avoids inflated Type I error from multiple t-tests). Significant ANOVA → post-hoc tests (Tukey, Bonferroni). One-way: 1 IV. Factorial: 2+ IVs (interaction effects)."},
            {front: "Parametric vs. non-parametric tests", back: "Parametric: assume normal distribution (t-test, ANOVA, Pearson r). More powerful. Non-parametric: no distribution assumption (Mann-Whitney U, Kruskal-Wallis, Spearman rho, chi-square). Use when: ordinal data, violated assumptions, small samples. Less power."},
            {front: "Regression vs. correlation", back: "Correlation (Pearson r): describes STRENGTH and DIRECTION of linear relationship between two variables. Regression: PREDICTS one variable from another (or multiple). Simple regression: one predictor. Multiple: 2+ predictors. r² = proportion of variance explained. Correlation is symmetric; regression has direction."},
            {front: "Effect size reporting: why it matters", back: "Statistical significance depends on sample size — large samples can make trivial effects significant. Effect sizes indicate practical significance. Cohen's d (mean difference), r (correlation), η² (ANOVA), odds ratio. APA Publication Manual requires effect size reporting. CI for effect sizes increasingly expected."}
        ],

        8: [ // Ethics — Ethical Decision-Making Scenarios
            {front: "Dual relationship with student scenario", back: "A professor is asked to provide therapy to their graduate student. Ethical response: Decline — this creates a clear multiple relationship (authority + therapeutic). Refer to another provider. Standard 3.05 prohibits relationships that could impair objectivity or risk exploitation."},
            {front: "Child custody evaluation ethical issues", back: "Common pitfalls: serving as both therapist and evaluator (dual role), bias toward one parent, inadequate data collection, exceeding competence. APA Guidelines: evaluate BOTH parents, multiple methods, focus on child's best interests, maintain impartiality, clearly communicate limitations."},
            {front: "Suicidal client: ethical and legal obligations", back: "Assess risk (plan, means, intent, protective factors). Document thoroughly. Duty to protect may override confidentiality. Options: voluntary hospitalization, involuntary commitment if imminent danger, safety planning, increase session frequency, involve family (with consent if possible)."},
            {front: "Insurance company requests full records", back: "Provide MINIMUM necessary information — not full therapy notes. Standard 4.04: disclose only info relevant to the purpose. Discuss with client first. Client must authorize release. Can provide summary/treatment report instead of process notes. Advocate for client privacy."},
            {front: "Rural practice: managing unavoidable multiple relationships", back: "In small communities, multiple relationships may be unavoidable (therapist is also your child's teacher's spouse). Steps: discuss openly with client, document, obtain informed consent, set clear boundaries, seek consultation, monitor for impairment. Standard 3.05 acknowledges these situations."}
        ]
    };

    // Add flashcards to each domain, avoiding duplicates by front text
    Object.entries(batch3).forEach(([domainId, cards]) => {
        const id = parseInt(domainId);
        const domain = EPPPData.getDomain(id);
        if (domain) {
            if (!domain.flashcards) domain.flashcards = [];
            cards.forEach(card => {
                const exists = domain.flashcards.some(f => f.front === card.front);
                if (!exists) domain.flashcards.push(card);
            });
        }
    });

    const totalAdded = Object.values(batch3).reduce((s, c) => s + c.length, 0);
    console.log(`PasstheEPPP: Loaded ${totalAdded} flashcards (batch 3).`);
})();
