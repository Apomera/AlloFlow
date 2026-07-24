/* PasstheEPPP — Rationale Enhancement Overlay Part 2
   Patches remaining questions from batches 1-5 (questions_bank.js)
   with "Why others are wrong" explanations */
(function(){
    if (typeof EPPPData === 'undefined') return;

    const enhancements = {
        // ===== DOMAIN 4 — Batch 1 =====
        "A 3-year-old who can use language but cannot understand conservation tasks is in Piaget's:":
            "The preoperational stage (2-7 years) features symbolic thinking and language but lacks logical operations like conservation, reversibility, and decentration.\n\nWhy others are wrong:\n(A) Sensorimotor (0-2) — children don't yet use true language\n(C) Concrete operational (7-11) — children CAN understand conservation\n(D) Formal operational (11+) — children handle abstract reasoning, well beyond conservation",

        "Harlow's monkey experiments demonstrated that:":
            "Harlow showed infant monkeys preferred the cloth (contact comfort) 'mother' over the wire 'mother' that provided food, challenging drive-reduction theories of attachment.\n\nWhy others are wrong:\n(A) Food is NOT the primary basis — the cloth mother provided no food but was preferred\n(C) Isolated monkeys showed severe social/emotional deficits — they did NOT prefer isolation\n(D) Attachment formed with the cloth surrogate — biological motherhood is not required",

        "According to Erikson, failure to resolve the Identity vs. Role Confusion stage results in:":
            "Identity diffusion: lack of clear sense of self, values, and direction. Adolescents who don't successfully explore and commit to an identity experience role confusion.\n\nWhy others are wrong:\n(A) Mistrust = failure to resolve trust vs. mistrust (infancy, Stage 1)\n(C) Inferiority = failure to resolve industry vs. inferiority (school age, Stage 4)\n(D) Social isolation = failure to resolve intimacy vs. isolation (young adulthood, Stage 6)",

        "A child believes that rules are absolute and unchangeable. According to Piaget, this reflects:":
            "Heteronomous morality (moral realism, ~4-7 years): rules are fixed, made by authority, and violations are judged by consequences not intentions. Autonomous morality develops later.\n\nWhy others are wrong:\n(A) Autonomous morality = rules are agreements that can be changed by consensus (later stage)\n(C) Postconventional morality = Kohlberg's highest level (universal principles), not Piaget's stage\n(D) Amoral reasoning implies no moral understanding — these children DO understand rules, just rigidly",

        "Marcia's identity status of 'moratorium' is characterized by:":
            "Marcia's moratorium: actively exploring options (career, values, relationships) but has not yet committed. Considered a healthy, developmentally appropriate process during adolescence.\n\nWhy others are wrong:\n(A) Commitment without exploration = foreclosure (adopting others' values without questioning)\n(C) Neither exploration nor commitment = identity diffusion (most concerning status)\n(D) Both exploration and commitment = identity achievement (most mature status)",

        "Stranger anxiety typically emerges at approximately:":
            "Stranger anxiety emerges around 7-9 months when infants develop object permanence and can distinguish caregivers from strangers. Separation anxiety emerges around the same time.\n\nWhy others are wrong:\n(A) At birth, infants cannot distinguish familiar from unfamiliar people\n(B) At 3-4 months, social smiling develops but discrimination between people is just beginning\n(D) By 18 months, stranger anxiety is typically diminishing as social cognition advances",

        "According to Kübler-Ross, the grief stage characterized by attempting to negotiate or make deals is:":
            "Bargaining is the third stage: attempting to negotiate with a higher power or make deals to reverse or delay the loss. 'If only I had...' thinking is characteristic.\n\nWhy others are wrong:\n(A) Denial = refusing to accept the reality of the loss (Stage 1)\n(B) Anger = frustration and helplessness directed outward (Stage 2)\n(D) Depression = sadness and withdrawal as reality sets in (Stage 4)",

        "The 'goodness of fit' model (Thomas & Chess) proposes that development is optimized when:":
            "Goodness of fit: optimal development occurs when environmental demands/expectations match the child's temperamental characteristics. Mismatch can lead to behavioral problems.\n\nWhy others are wrong:\n(A) Having an 'easy' temperament helps but isn't sufficient — fit with environment matters more\n(B) Authoritarian parenting is a specific style, not the central concept of goodness of fit\n(D) Treating all children identically ignores individual temperamental differences — the opposite of goodness of fit",

        "Selective optimization with compensation (SOC) theory addresses:":
            "Baltes' SOC theory: older adults adapt by selecting fewer activities, optimizing remaining abilities, and compensating for losses — allowing continued high functioning despite decline.\n\nWhy others are wrong:\n(A) Adolescent identity development = Erikson/Marcia's theories, not SOC\n(C) Infant attachment = Bowlby/Ainsworth, not SOC\n(D) Moral development = Piaget/Kohlberg/Gilligan, not SOC",

        "Research on authoritative parenting (Baumrind) consistently shows it is associated with:":
            "Authoritative parenting (high warmth + high control/structure) consistently produces the best outcomes across cultures: higher achievement, self-regulation, social skills, and self-esteem.\n\nWhy others are wrong:\n(A) Authoritative parenting is associated with LESS rebellion due to the combination of warmth and reasoning\n(C) Creativity is supported, not suppressed, by authoritative parenting's encouragement of autonomy\n(D) Authoritative parenting fosters INDEPENDENCE, not dependence, through age-appropriate autonomy-granting",

        "Vygotsky's concept of 'private speech' refers to:":
            "Vygotsky viewed private speech (talking to oneself) as a crucial cognitive tool — children internalize social speech to regulate thinking. It eventually becomes inner speech.\n\nWhy others are wrong:\n(A) Private speech is spoken aloud to oneself, not whispered to peers\n(C) Secret languages between children are social play, not self-regulatory private speech\n(D) Lying involves deception — private speech is a genuine self-guidance tool",

        "Theory of mind typically develops around age:":
            "Theory of mind (understanding that others have different beliefs, desires, knowledge) develops around age 4, assessed by false-belief tasks (e.g., Sally-Anne test).\n\nWhy others are wrong:\n(A) At 1 year, infants may show some implicit understanding but not full false-belief comprehension\n(B) At 2 years, children are still largely egocentric in perspective-taking\n(D) By age 7, ToM is well established — its DEVELOPMENT begins around age 4",

        "Disorganized attachment (Main & Hesse) is MOST associated with:":
            "Disorganized attachment (Type D) is linked to caregivers who are themselves sources of fear — abusive, traumatized, or frightening behavior creates approach-avoidance conflict for the child.\n\nWhy others are wrong:\n(A) Consistent caregiving → secure attachment (Type B)\n(B) Responsive parenting → secure attachment (Type B)\n(D) Permissive parenting may produce insecure attachment but isn't specifically linked to disorganized patterns",

        "Adolescent egocentrism (Elkind) includes the concept of:":
            "Elkind's adolescent egocentrism includes the imaginary audience (believing others are constantly watching/evaluating you) and the personal fable (believing your experiences are unique).\n\nWhy others are wrong:\n(A) Object permanence = sensorimotor stage (Piaget), not adolescent egocentrism\n(C) Conservation failure = preoperational stage, not adolescence\n(D) Animism = preoperational stage (attributing life to inanimate objects)",

        "Continuity vs. discontinuity in development refers to debate about whether development:":
            "Continuity: development is gradual and cumulative. Discontinuity: development occurs in qualitatively distinct stages (as Piaget proposed). Most theorists now see both as contributing.\n\nWhy others are wrong:\n(A) Cross-cultural universality is a separate developmental debate\n(B) Nature vs. nurture is a different foundational debate in developmental psychology\n(D) Reversibility vs. irreversibility of development is a related but separate question",

        // ===== DOMAIN 5 — Batch 1 =====
        "A patient scores 2 SDs below the mean on the WAIS. Their IQ score is approximately:":
            "WAIS has M=100, SD=15. Two SDs below the mean: 100 - 2(15) = 70. This is the cutoff traditionally associated with intellectual disability.\n\nWhy others are wrong:\n(A) 85 = 1 SD below the mean (100 - 15 = 85), not 2 SDs\n(C) 55 = 3 SDs below the mean (100 - 45 = 55)\n(D) 100 = the mean — not below it at all",

        "The MMPI-2 clinical scale MOST associated with depression is:":
            "Scale 2 (Depression/D) measures symptomatic depression — low morale, lack of hope, general dissatisfaction. Elevation suggests depressive symptoms.\n\nWhy others are wrong:\n(A) Scale 1 (Hs/Hypochondriasis) = preoccupation with bodily health, not depression specifically\n(C) Scale 4 (Pd/Psychopathic Deviate) = social maladjustment, authority conflict, not depression\n(D) Scale 7 (Pt/Psychasthenia) = anxiety, obsessiveness, worry — related but distinct from depression",

        "Content validity is BEST established by:":
            "Content validity is established through expert judgment — evaluating whether test items adequately represent/sample the domain being measured. It's not statistical.\n\nWhy others are wrong:\n(A) Correlating with a criterion = criterion-related validity (concurrent or predictive)\n(C) Factor analysis = construct validity evidence (internal structure)\n(D) Test-retest correlation = reliability (stability), not content validity",

        "Incremental validity refers to:":
            "Incremental validity: the degree to which a test improves prediction of a criterion over and above what is already provided by other sources of information.\n\nWhy others are wrong:\n(A) Improving reliability over time describes temporal stability, not incremental validity\n(C) Face validity = whether a test APPEARS valid to examinees, not incremental prediction improvement\n(D) Internal consistency = reliability (Cronbach's alpha), not validity enhancement",

        "Base rate information is important in diagnosis because:":
            "Bayesian reasoning: even a highly accurate test produces many false positives when the base rate (prevalence) of the condition is low. PPV = true positives / (true positives + false positives).\n\nWhy others are wrong:\n(A) Base rates don't determine reliability — reliability is a psychometric property independent of prevalence\n(C) Test-retest stability is about measurement consistency, not base rates\n(D) The APA Ethics Code doesn't specifically mandate base rate consideration (though competent practice requires it)",

        "The Trail Making Test Part B primarily assesses:":
            "TMT-B (connecting alternating numbers and letters: 1-A-2-B-3-C...) assesses cognitive flexibility, set-shifting, and executive function. Sensitive to frontal lobe and diffuse brain damage.\n\nWhy others are wrong:\n(A) Visual scanning is part of TMT-A (numbers only) — TMT-B adds the cognitive flexibility component\n(C) Memory consolidation is assessed by tests like the CVLT or WMS, not the TMT\n(D) Language fluency is assessed by the FAS/COWA verbal fluency test, not TMT",

        "A test with high sensitivity will:":
            "Sensitivity = true positive rate — the test correctly identifies most people WITH the condition. Highly sensitive tests are good for screening (few false negatives) but may have false positives.\n\nWhy others are wrong:\n(B) Correctly identifying those WITHOUT the condition = specificity, not sensitivity\n(C) Few false positives = high specificity, not sensitivity — sensitive tests may have MORE false positives\n(D) Perfect specificity is separate from sensitivity — a test can be highly sensitive but poorly specific",

        "The difference between the MMPI-2 and MMPI-2-RF is that the RF:":
            "MMPI-2-RF (Restructured Form) has 338 items (vs. 567) with scales restructured to reduce overlap and improve discriminant validity. Maintains core validity scales.\n\nWhy others are wrong:\n(A) The RF has FEWER items (338 vs. 567), not more\n(C) The RF maintains validity scales — they were restructured but not eliminated\n(D) The RF is used across settings (inpatient, outpatient, forensic), not just inpatient",

        "Double dissociation":
            "Double dissociation: Patient A has impaired Function X but intact Function Y, while Patient B shows the reverse — demonstrating X and Y are served by independent brain mechanisms.\n\nWhy others are wrong:\n(A) Two tests measuring the SAME construct would show positive correlation, not dissociation\n(C) Having two diagnoses = comorbidity, a clinical concept unrelated to double dissociation\n(D) Two tests with identical validity doesn't demonstrate functional independence",

        "The Conners Rating Scales are primarily used to assess:":
            "Conners scales are the gold-standard parent/teacher rating scales for assessing ADHD symptoms (inattention, hyperactivity, impulsivity) and associated behavioral problems in children.\n\nWhy others are wrong:\n(A) Adult depression → BDI-II, PHQ-9, HDRS\n(C) Personality disorders → MMPI-2, PAI, MCMI-IV\n(D) Cognitive decline in elderly → MMSE, MoCA, or full neuropsychological battery",

        "Construct underrepresentation is a threat to:":
            "Construct underrepresentation occurs when a test fails to capture important aspects of the construct it claims to measure, threatening construct validity.\n\nWhy others are wrong:\n(A) Reliability is about measurement consistency, not construct coverage\n(C) Inter-rater agreement reflects consistency between raters, not construct representation\n(D) Test-retest stability measures temporal consistency, not construct coverage",

        "When a bell curve is positively skewed, the mean is:":
            "Positive skew: tail extends right. The mean is pulled toward extreme scores (right), so mean > median > mode. Negative skew: mean < median < mode.\n\nWhy others are wrong:\n(A) Mean = median only in a perfectly symmetric (normal) distribution\n(B) Mean LOWER than median occurs in negative skew, not positive skew\n(D) The mean is always calculable with numerical data — skewness doesn't prevent calculation",

        "The WAIS-IV Processing Speed index is MOST sensitive to:":
            "Processing Speed (Coding, Symbol Search) is highly sensitive to TBI, aging, ADHD, and neurological conditions because it requires rapid, accurate cognitive processing.\n\nWhy others are wrong:\n(A) Crystallized knowledge is measured by Verbal Comprehension, not Processing Speed\n(C) Verbal comprehension is a separate WAIS index from Processing Speed\n(D) Long-term memory is not directly assessed by Processing Speed subtests",

        "Malingering should be suspected when:":
            "Below-chance performance on forced-choice validity tests (e.g., TOMM) is the strongest indicator of malingering — performing worse than guessing suggests deliberate intent to appear impaired.\n\nWhy others are wrong:\n(A) Consistent results ACROSS measures would suggest genuine impairment, not malingering\n(C) Attorney referral increases concern but alone is insufficient evidence of malingering\n(D) Only (B) is the strongest indicator — the question asks for the BEST answer, which is below-chance performance",

        "The diagnostic criteria for Intellectual Disability in the DSM-5 include:":
            "DSM-5 ID requires: (1) intellectual functioning deficits, (2) adaptive functioning deficits (conceptual, social, practical), and (3) onset during the developmental period. Severity by adaptive functioning, not IQ alone.\n\nWhy others are wrong:\n(A) IQ below 70 alone is insufficient — adaptive functioning deficits must also be present\n(C) Behavioral problems may coexist but aren't diagnostic criteria for ID\n(D) ID has many etiologies (genetic, environmental, unknown) — it's not exclusively genetic",

        // ===== DOMAIN 6 — Batch 1 =====
        "Motivational Interviewing (MI) is MOST consistent with which therapeutic approach?":
            "MI (Miller & Rollnick) draws heavily from Rogers' person-centered approach — empathy, collaboration, autonomy support — while adding strategic direction toward change.\n\nWhy others are wrong:\n(A) Psychoanalytic focuses on unconscious, not the collaborative MI stance\n(C) Strict behavioral focuses on contingencies, not MI's empathic/motivational approach\n(D) CBT uses structured techniques — MI is more about the therapeutic relationship style",

        "Paradoxical intention is a technique associated with:":
            "Frankl's paradoxical intention: actively intending or exaggerating the feared behavior/symptom. For insomnia: try to stay awake. Breaks the anxiety cycle maintaining the problem.\n\nWhy others are wrong:\n(A) CBT uses cognitive restructuring and behavioral experiments, not paradoxical strategies\n(C) ABA uses reinforcement contingencies, not paradoxical techniques\n(D) Psychoanalysis uses free association, interpretation, and dream analysis",

        "The most effective treatment for Specific Phobias is:":
            "Exposure therapy (especially in vivo) is the most effective treatment for specific phobias. Systematic desensitization adds relaxation but direct exposure allows extinction of the fear response.\n\nWhy others are wrong:\n(A) Psychodynamic therapy hasn't shown strong efficacy for specific phobias\n(B) SSRIs have limited efficacy for specific phobias compared to exposure\n(D) Group therapy isn't the first-line treatment, though it can supplement individual exposure",

        "In psychoanalytic therapy, 'resistance' refers to:":
            "Resistance includes unconscious defenses that impede therapeutic progress — changing topics, arriving late, intellectualizing, forgetting dreams — blocking access to anxiety-provoking unconscious material.\n\nWhy others are wrong:\n(A) Disagreement with interpretations CAN be resistance but also could be valid feedback\n(C) Medication non-compliance is a behavioral issue, not the psychoanalytic concept of resistance\n(D) Missing sessions CAN be resistance but doesn't define the broader psychoanalytic concept",

        "Clozapine is distinguished from other antipsychotics by its:":
            "Clozapine is the most effective antipsychotic for treatment-resistant schizophrenia but requires regular blood monitoring due to risk of agranulocytosis.\n\nWhy others are wrong:\n(A) Clozapine has LOWER risk of tardive dyskinesia than typical antipsychotics\n(C) Clozapine is available in oral form (tablets, orally disintegrating tablets), not only injectable\n(D) Clozapine has significant side effects including weight gain, metabolic syndrome, and agranulocytosis risk",

        "Solution-focused brief therapy (SFBT) differs from traditional therapy by:":
            "SFBT (de Shazer, Berg) focuses on constructing solutions rather than analyzing problems. Key techniques: miracle question, exception finding, scaling questions.\n\nWhy others are wrong:\n(A) SFBT explicitly avoids focusing on childhood trauma — solutions-focused, not problem-focused\n(B) Exploring unconscious conflicts = psychoanalytic approach, the opposite of SFBT\n(D) SFBT is specifically BRIEF — typically 3-5 sessions, not 100+",

        "Behavioral activation for depression works by:":
            "Behavioral activation targets the withdrawal cycle in depression: inactivity → fewer rewards → more depression. Systematically scheduling and engaging in reinforcing activities breaks this cycle.\n\nWhy others are wrong:\n(A) Challenging cognitive distortions = cognitive therapy (Beck), not behavioral activation specifically\n(C) Free association = psychoanalytic technique\n(D) Dream analysis = psychoanalytic technique",

        "The 'empty chair technique' is associated with:":
            "Gestalt therapy (Perls): the empty chair technique facilitates dialogue between conflicting parts of the self or unfinished business with others.\n\nWhy others are wrong:\n(A) CBT uses cognitive restructuring, behavioral experiments, and thought records\n(B) Psychoanalysis uses free association, dream analysis, and transference interpretation\n(D) Reality therapy (Glasser) focuses on choice theory and meeting basic needs",

        "EMDR (Eye Movement Desensitization and Reprocessing) is primarily used for:":
            "EMDR (Shapiro) is an evidence-based treatment for PTSD. Uses bilateral stimulation (eye movements) while processing traumatic memories.\n\nWhy others are wrong:\n(A) Schizophrenia → antipsychotics and psychosocial rehabilitation\n(C) Intellectual disability → supportive services and behavioral interventions\n(D) Substance use disorders → MI, CBT, 12-step, medication-assisted treatment",

        "Research on therapy outcomes consistently shows that approximately what percentage of clients improve?":
            "Meta-analyses consistently show approximately 75-80% of therapy clients improve compared to untreated controls.\n\nWhy others are wrong:\n(A) 25% significantly underestimates therapy effectiveness\n(B) 50% underestimates — the actual rate is closer to 75-80%\n(D) 95% overestimates — some clients don't respond or deteriorate",

        "A therapist who helps clients identify 'musturbatory thinking' is practicing:":
            "Ellis coined 'musturbatory thinking' — the irrational demand that things MUST be a certain way. REBT disputes these absolutistic beliefs.\n\nWhy others are wrong:\n(A) Person-centered therapy doesn't label thinking patterns as irrational\n(C) Psychoanalysis doesn't use the concept of 'musturbatory thinking'\n(D) Behavioral therapy focuses on observable behavior, not irrational beliefs",

        "The dose-effect model of psychotherapy suggests:":
            "Howard's dose-effect model: approximately 50% of patients improve by session 8, 75% by session 26. Early sessions show the most rapid gains.\n\nWhy others are wrong:\n(A) Clients improve at different rates — the model describes averages, not individual requirements\n(C) Many clients improve significantly in far fewer than 2 years\n(D) Medication is not always needed — psychotherapy alone is effective for many conditions",

        "Structural family therapy (Minuchin) focuses on:":
            "Minuchin's structural therapy maps family organization — boundaries, hierarchies, subsystems — and restructures dysfunctional patterns.\n\nWhy others are wrong:\n(A) Individual unconscious conflicts = psychoanalytic approach, not structural family therapy\n(C) Behavioral contingencies = behavioral family therapy, not Minuchin's structural approach\n(D) Circular questioning = Milan systemic family therapy (Selvini Palazzoli), not Minuchin",

        "MAOIs interact dangerously with foods containing:":
            "MAOIs inhibit monoamine oxidase, which normally breaks down tyramine. High-tyramine foods can cause hypertensive crisis — a potentially fatal surge in blood pressure.\n\nWhy others are wrong:\n(A) Caffeine can interact with some medications but is not the primary MAOI dietary danger\n(C) Gluten sensitivity is unrelated to MAOI interactions\n(D) Lactose intolerance involves dairy digestion, not monoamine oxidase metabolism",

        "A client consistently arrives late, 'forgets' appointments, and avoids discussing their childhood. A psychodynamic therapist would interpret this as:":
            "Psychodynamic perspective: these behaviors represent resistance — unconscious attempts to avoid anxiety-provoking material.\n\nWhy others are wrong:\n(A) Poor time management is the behavioral explanation but misses the unconscious motivation\n(C) Cognitive distortion is a CBT concept, not the psychodynamic interpretation\n(D) Behavioral deficit implies skill deficiency — resistance implies unconscious avoidance of threatening content"
    };

    let patched = 0;
    EPPPData.domains.forEach(domain => {
        domain.questions.forEach(question => {
            const enhanced = enhancements[question.q];
            if (enhanced && !question.rationale.includes('Why others are wrong')) {
                question.rationale = enhanced;
                patched++;
            }
        });
    });

    console.log(`PasstheEPPP: Enhanced rationales patched for ${patched} questions (batch 2 overlay — domains 4-8).`);
})();
