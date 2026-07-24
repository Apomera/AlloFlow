/* PasstheEPPP — Expanded Flashcard Bank
   Additional flashcards across all 8 EPPP domains
   This file adds flashcards to EPPPData.domains */
(function() {
    if (typeof EPPPData === 'undefined') return;

    const flashcardExpansion = {
        1: [
            {front: "What is the function of the hippocampus?", back: "Critical for consolidating new explicit (declarative) memories from short-term to long-term storage. Bilateral damage causes severe anterograde amnesia (as in patient H.M.)."},
            {front: "What is the HPA axis?", back: "Hypothalamic-Pituitary-Adrenal axis: hypothalamus releases CRH → pituitary releases ACTH → adrenal cortex releases cortisol. Chronic activation linked to depression and immune suppression."},
            {front: "Broca's area vs. Wernicke's area", back: "Broca's (left frontal): speech production. Damage → non-fluent aphasia (effortful, telegraphic speech, comprehension intact). Wernicke's (left temporal): speech comprehension. Damage → fluent but meaningless speech."},
            {front: "What neurotransmitter is depleted in Parkinson's disease?", back: "Dopamine — specifically from degeneration of dopaminergic neurons in the substantia nigra. Produces resting tremor, bradykinesia, rigidity, and postural instability."},
            {front: "What is Long-Term Potentiation (LTP)?", back: "A long-lasting increase in synaptic strength following repeated stimulation. Requires NMDA receptor activation and calcium influx. The leading cellular model for how memories are encoded."},
            {front: "Typical vs. atypical antipsychotics", back: "Typical (1st gen): block D2 dopamine receptors. Risk of EPS and tardive dyskinesia. Atypical (2nd gen): block both D2 and 5-HT2A serotonin receptors. Lower EPS risk, but metabolic side effects."},
            {front: "What is the blood-brain barrier?", back: "Formed by endothelial cell tight junctions supported by astrocyte foot processes. Selectively allows lipid-soluble substances to pass while blocking large water-soluble molecules."},
            {front: "What causes Wernicke-Korsakoff syndrome?", back: "Thiamine (Vitamin B1) deficiency, usually from chronic alcoholism. Wernicke's: confusion, ataxia, ophthalmoplegia. Korsakoff's: severe anterograde amnesia, confabulation."},
            {front: "What is hemispatial neglect?", back: "Failure to attend to stimuli on one side (usually left) despite intact vision. Caused by damage to the right parietal lobe. The right hemisphere processes spatial attention for both fields."}
        ],
        2: [
            {front: "What is the serial position effect?", back: "Items at the beginning (primacy effect — transferred to LTM) and end (recency effect — still in STM) of a list are better remembered than middle items."},
            {front: "Classical vs. operant conditioning", back: "Classical: learning associations between stimuli (Pavlov). Operant: learning from consequences — reinforcement increases behavior, punishment decreases it (Skinner)."},
            {front: "What is the overjustification effect?", back: "Providing extrinsic rewards for intrinsically motivated behavior undermines intrinsic motivation when rewards are removed. Extrinsic reward replaces internal drive."},
            {front: "Dual-process theory (Kahneman)", back: "System 1: fast, automatic, intuitive, effortless. System 2: slow, deliberate, analytical, effortful. Most thinking relies on System 1, leading to predictable biases."},
            {front: "What is the availability heuristic?", back: "Judging event probability based on how easily examples come to mind (Tversky & Kahneman). Dramatic events seem more common than they are (plane crashes vs. car accidents)."},
            {front: "What is cognitive dissonance?", back: "Psychological discomfort from holding contradictory beliefs/attitudes. People reduce it through attitude change, behavior change, or rationalization (Festinger, 1957)."},
            {front: "Encoding specificity principle (Tulving)", back: "Memory retrieval is best when retrieval context matches encoding context. Basis for context-dependent and state-dependent memory effects."},
            {front: "Garcia & Koelling: Taste aversion", back: "Rats readily associated taste (not light/sound) with illness — demonstrating biological preparedness. Animals are predisposed to make certain CS-UCS pairings, constraining conditioning."},
            {front: "Working memory model (Baddeley)", back: "Components: phonological loop (verbal info), visuospatial sketchpad (visual/spatial info), central executive (attention), and episodic buffer (integration with LTM)."}
        ],
        3: [
            {front: "Fundamental attribution error", back: "Tendency to overestimate dispositional factors and underestimate situational factors when explaining others' behavior. More prominent in individualistic cultures."},
            {front: "Zimbardo's Stanford Prison Experiment", back: "Demonstrated how rapidly assigned social roles (guard/prisoner) shaped behavior — the power of situational forces over individual personality."},
            {front: "Allport's contact hypothesis", back: "Prejudice is reduced when intergroup contact involves: equal status, common goals, cooperation, and institutional support. Mere contact without these conditions can increase prejudice."},
            {front: "What is stereotype threat?", back: "When awareness of negative stereotypes about one's group impairs performance. Strongest when the individual strongly identifies with the domain being tested (Steele & Aronson)."},
            {front: "Social identity theory (Tajfel)", back: "People derive self-esteem from group memberships. In-group favoritism occurs even with minimal, arbitrary group distinctions. Categorization → identification → comparison."},
            {front: "Bystander effect (Darley & Latané)", back: "People are less likely to help when others are present. Mechanisms: diffusion of responsibility, pluralistic ignorance, evaluation apprehension. More bystanders = less individual help."},
            {front: "Individualistic vs. collectivist cultures", back: "Individualistic (US, Western Europe): personal goals, autonomy, self-expression. Collectivist (East Asia, Latin America): group harmony, interdependence, family obligations."},
            {front: "What is deindividuation?", back: "Loss of self-awareness and reduced personal responsibility in large groups with anonymity and arousal. Leads to impulsive, uninhibited behavior (mobs, online anonymity)."},
            {front: "What is intersectionality?", back: "Coined by Kimberlé Crenshaw (1989). Overlapping social identities (race, gender, class) create unique experiences of discrimination — categories interact, not exist independently."}
        ],
        4: [
            {front: "Piaget's 4 stages of cognitive development", back: "1. Sensorimotor (0-2): object permanence. 2. Preoperational (2-7): symbolic thought, egocentrism. 3. Concrete operational (7-11): conservation, logical thought. 4. Formal operational (11+): abstract reasoning."},
            {front: "Erikson's 8 psychosocial stages", back: "Trust vs. Mistrust → Autonomy vs. Shame → Initiative vs. Guilt → Industry vs. Inferiority → Identity vs. Role Confusion → Intimacy vs. Isolation → Generativity vs. Stagnation → Integrity vs. Despair"},
            {front: "Ainsworth's attachment types", back: "Secure: distressed at separation, comforted at reunion. Avoidant: minimal distress. Resistant/ambivalent: intense distress, hard to comfort. Disorganized: contradictory behaviors (abuse-linked)."},
            {front: "Vygotsky's Zone of Proximal Development", back: "The gap between what a child can do alone and what they can do with guidance. Scaffolding (Bruner) provides temporary support that is gradually withdrawn as competence increases."},
            {front: "Kohlberg's levels of moral reasoning", back: "Preconventional: self-interest, avoiding punishment. Conventional: social norms, law and order. Postconventional: universal ethical principles. Few adults consistently reach postconventional."},
            {front: "Thomas & Chess temperament types", back: "Easy (40%): regular, positive, adaptable. Difficult (10%): irregular, intense, slow to adapt. Slow-to-warm-up (15%): initially withdrawn, gradually warming. 35% don't fit neatly."},
            {front: "What is theory of mind?", back: "Understanding that others have different beliefs, desires, and knowledge. Develops around age 4. Assessed by false-belief tasks (Sally-Anne test). Delayed in autism spectrum disorder."},
            {front: "Harlow's contact comfort experiments", back: "Infant monkeys preferred cloth 'mother' (contact comfort) over wire 'mother' with food. Challenged drive-reduction theory of attachment. Attachment serves emotional/protective function."},
            {front: "Bronfenbrenner's ecological systems", back: "Microsystem → Mesosystem → Exosystem → Macrosystem → Chronosystem. Development influenced by nested environmental systems from immediate settings to cultural values over time."}
        ],
        5: [
            {front: "Reliability vs. validity", back: "Reliability: consistency of measurement (test-retest, internal consistency, inter-rater). Validity: does it measure what it claims? A test can be reliable but not valid, never valid without reliability."},
            {front: "MMPI-2 validity scales", back: "L (Lie): faking good. F (Infrequency): faking bad/random. K (Correction): subtle defensiveness. VRIN/TRIN: inconsistent responding. Elevated F may indicate genuine pathology OR malingering."},
            {front: "Standard error of measurement (SEM)", back: "SEM = SD × √(1-reliability). Estimates the range within which a true score likely falls. 95% confidence interval ≈ observed score ± 2 SEMs. Higher reliability = smaller SEM = more precision."},
            {front: "Sensitivity vs. specificity", back: "Sensitivity: true positive rate (correctly identifies those WITH condition). Specificity: true negative rate (correctly identifies those WITHOUT). High sensitivity = good for screening."},
            {front: "T-scores and z-scores", back: "z-score: M=0, SD=1. T-score: M=50, SD=10. A T-score of 70 = 2 SDs above mean ≈ 98th percentile. Clinical cutoff on MMPI-2 is typically T ≥ 65."},
            {front: "WAIS-IV index scores", back: "Verbal Comprehension, Perceptual Reasoning, Working Memory, Processing Speed. Full Scale IQ: M=100, SD=15. Processing Speed most sensitive to TBI and aging."},
            {front: "What is incremental validity?", back: "The degree to which a test adds predictive value beyond what is already provided by existing methods. Justifies the cost and time of additional assessment measures."},
            {front: "Malingering detection", back: "Below-chance performance on forced-choice validity tests (e.g., TOMM) = strongest indicator. Performing worse than random guessing suggests deliberate intent to appear impaired."},
            {front: "Criterion-referenced vs. norm-referenced tests", back: "Criterion-referenced: performance against a fixed standard (e.g., EPPP pass/fail at 500). Norm-referenced: comparing individuals to a normative group (e.g., IQ percentiles)."}
        ],
        6: [
            {front: "Motivational Interviewing core principles", back: "Express empathy, develop discrepancy, roll with resistance, support self-efficacy. Collaborative, not confrontational. Based on person-centered approach with strategic direction."},
            {front: "CBT vs. REBT", back: "CBT (Beck): identifies automatic thoughts and cognitive distortions. REBT (Ellis): targets irrational beliefs (demandingness, awfulizing, low frustration tolerance) using the ABCDE model."},
            {front: "Stages of Change model", back: "Precontemplation → Contemplation → Preparation → Action → Maintenance. (Prochaska & DiClemente) Match interventions to stage. Relapse is normal part of change."},
            {front: "DBT skills modules", back: "Marsha Linehan, developed for BPD. Four modules: Mindfulness, Distress Tolerance, Emotion Regulation, Interpersonal Effectiveness. Integrates CBT with dialectical philosophy."},
            {front: "The Dodo bird verdict", back: "Different therapeutic approaches tend to produce equivalent outcomes when common factors are controlled. Common factors (alliance, empathy, expectation) may matter more than specific techniques."},
            {front: "Empty chair technique", back: "Gestalt therapy (Perls): client engages in dialogue with imagined person/aspect of self in empty chair. Promotes awareness, emotional expression, and integration of polarities."},
            {front: "Systematic desensitization (Wolpe)", back: "Based on reciprocal inhibition. Three steps: 1) learn relaxation, 2) construct fear hierarchy, 3) pair relaxation with progressively anxiety-provoking stimuli. Effective for specific phobias."},
            {front: "Therapeutic alliance", back: "Bordin: agreement on goals, agreement on tasks, and the bond between therapist and client. One of the strongest predictors of therapy outcomes across all modalities (~5-8% variance)."},
            {front: "Howard's dose-effect model", back: "~50% of patients improve by session 8, ~75% by session 26. Early sessions show most rapid gains with diminishing returns over time."}
        ],
        7: [
            {front: "Type I vs. Type II error", back: "Type I (α/false positive): rejecting a true null hypothesis. Type II (β/false negative): failing to reject a false null. Power = 1 - β. α is typically set at .05."},
            {front: "Internal vs. external validity", back: "Internal: can we draw causal conclusions? (random assignment helps). External: do findings generalize to other settings/populations? (random sampling helps). Often trade-off between them."},
            {front: "Cohen's effect size benchmarks", back: "d = 0.20 (small), 0.50 (medium), 0.80 (large). r = .10 (small), .30 (medium), .50 (large). Statistical significance ≠ practical significance."},
            {front: "Correlation does NOT imply causation", back: "Three possible explanations for correlation: A causes B, B causes A, or a third variable (C) causes both. Only experiments with random assignment can establish causation."},
            {front: "Factorial design", back: "Studies 2+ IVs simultaneously. A 2×3 design = 6 conditions. Allows testing main effects AND interaction effects (does the effect of one IV depend on the level of another?)."},
            {front: "Within-subjects vs. between-subjects", back: "Within-subjects: same participants in all conditions → more power, fewer participants needed. Risk: order effects (counterbalancing helps). Between-subjects: different participants per condition."},
            {front: "What is a meta-analysis?", back: "Uses statistical methods to combine results across multiple studies. Greater statistical power, more precise effect estimates. Can identify moderating variables. Follows explicit protocols."},
            {front: "Hawthorne effect", back: "Participants modify behavior because they know they're being observed, not because of the treatment — a threat to internal validity."},
            {front: "Random assignment vs. random sampling", back: "Random assignment: distributes participants equally across conditions → internal validity. Random sampling: selecting from population → external validity/generalizability. Different purposes."}
        ],
        8: [
            {front: "Tarasoff v. Regents (1976)", back: "Established duty to protect identifiable third parties from serious harm. When a client makes a credible threat, therapist must take protective action (warn victim, notify police, hospitalize)."},
            {front: "Limits of confidentiality", back: "Must break confidentiality for: (1) danger to self/others (Tarasoff), (2) suspected child/elder abuse (mandated reporting), (3) court order (not just subpoena), (4) client consent."},
            {front: "Informed consent requirements", back: "Must include: nature/purpose of service, duration, fees, confidentiality limits, risks/benefits, alternatives, right to withdraw. Ongoing process, not just a form. Special considerations for minors."},
            {front: "APA Ethics Code: Multiple relationships", back: "Not all multiple relationships are unethical. Prohibited when they could impair objectivity, competence, or effectiveness, or risk exploitation. May be unavoidable in rural/military settings."},
            {front: "Subpoena vs. court order", back: "Subpoena alone does NOT compel release of privileged records. Consult attorney, assert privilege, notify client. A court order IS legally binding and must be complied with."},
            {front: "Competence boundaries", back: "APA 2.01: practice only within boundaries of competence based on education, training, supervised experience. Must seek consultation/additional training for new areas. Ongoing professional development required."},
            {front: "Mandatory reporting", back: "All 50 states designate psychologists as mandated reporters of suspected child abuse/neglect. 'Suspected' is the threshold — proof not required. Confidentiality does not override this."},
            {front: "Goldwater Rule", back: "Unethical to offer professional opinion on a public figure's mental health without direct examination and proper authorization (APA Section 7.3)."},
            {front: "Record retention", back: "APA guidelines: maintain records for at least 7 years after last contact (3 years after a minor reaches age of majority, if longer). State laws may vary; follow the stricter requirement."}
        ]
    };

    // Add flashcards to each domain, avoiding duplicates
    Object.entries(flashcardExpansion).forEach(([domainId, cards]) => {
        const id = parseInt(domainId);
        const domain = EPPPData.getDomain(id);
        if (domain) {
            cards.forEach(card => {
                const exists = domain.flashcards.some(f => f.front === card.front);
                if (!exists) {
                    domain.flashcards.push(card);
                }
            });
        }
    });

    const totalAdded = Object.values(flashcardExpansion).reduce((s, c) => s + c.length, 0);
    console.log(`PasstheEPPP: Loaded ${totalAdded} expanded flashcards.`);
})();
