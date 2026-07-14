/* ============================================================
   PasstheEPPP — Data Batch 54
   20 new high-quality items for Biological Bases & Assessment
   ============================================================ */
(function() {
    if (typeof EPPPData === 'undefined') return;

    const newQuestions = [
        {
            domainId: 1,
            q: "A new psychotropic medication has a half-life of 24 hours. Approximately how long will it take for the drug to reach steady state in the patient's bloodstream?",
            options: ["24 hours", "2 days", "4 to 5 days", "10 to 14 days"],
            answer: 2,
            rationale: "Steady state is typically achieved after 4 to 5 half-lives. Since the half-life is 24 hours (1 day), it will take 4 to 5 days to reach steady state.",
            difficulty: "medium"
        },
        {
            domainId: 1,
            q: "Which of the following neurotransmitters is most severely depleted in patients with Alzheimer's disease?",
            options: ["Dopamine", "Serotonin", "Acetylcholine", "GABA"],
            answer: 2,
            rationale: "Alzheimer's disease is characterized by a significant loss of cholinergic neurons in the basal forebrain, leading to a profound depletion of acetylcholine.",
            difficulty: "easy"
        },
        {
            domainId: 1,
            q: "Damage to the orbitofrontal cortex is most likely to result in:",
            options: ["Anterograde amnesia", "Aphasia", "Changes in personality and disinhibition", "Contralateral hemiplegia"],
            answer: 2,
            rationale: "The orbitofrontal cortex is involved in executive functioning, impulse control, and emotional regulation. Damage here (as with Phineas Gage) typically results in personality changes, impulsivity, and poor judgment.",
            difficulty: "medium"
        },
        {
            domainId: 1,
            q: "Which atypical antipsychotic is most notorious for causing agranulocytosis, necessitating regular blood monitoring?",
            options: ["Risperidone", "Olanzapine", "Clozapine", "Quetiapine"],
            answer: 2,
            rationale: "Clozapine can cause agranulocytosis (a life-threatening drop in white blood cells) in about 1% of patients, requiring strict blood monitoring protocols.",
            difficulty: "medium"
        },
        {
            domainId: 5,
            q: "On the MMPI-2, which validity scale is designed to detect a 'faking bad' response set or symptom exaggeration?",
            options: ["L (Lie) Scale", "F (Infrequency) Scale", "K (Correction) Scale", "TRIN Scale"],
            answer: 1,
            rationale: "The F (Infrequency) scale consists of items endorsed by less than 10% of the normative sample. High scores suggest random responding, severe psychopathology, or 'faking bad'.",
            difficulty: "easy"
        },
        {
            domainId: 5,
            q: "A researcher wants to ensure that a newly developed depression inventory correlates well with the established Beck Depression Inventory (BDI). The researcher is testing:",
            options: ["Content validity", "Discriminant validity", "Concurrent validity", "Internal consistency"],
            answer: 2,
            rationale: "Concurrent validity, a subtype of criterion validity, occurs when a new measure correlates highly with an established, existing measure assessing the same construct at the same time.",
            difficulty: "medium"
        },
        {
            domainId: 5,
            q: "A T-score of 60 on a standardized psychological test corresponds to approximately what percentile rank?",
            options: ["50th", "84th", "95th", "99th"],
            answer: 1,
            rationale: "A T-score of 60 is exactly +1 standard deviation above the mean (Mean=50, SD=10). On a normal curve, +1 SD corresponds to approximately the 84th percentile (50% below mean + 34% from mean to +1 SD).",
            difficulty: "medium"
        },
        {
            domainId: 8,
            q: "According to the APA ethics code, multiple relationships:",
            options: ["Are strictly prohibited in all circumstances", "Are unethical only if they do not involve fee exchanges", "Should be avoided if they could reasonably be expected to impair objectivity or cause harm", "Are acceptable as long as the client consents in writing"],
            answer: 2,
            rationale: "The APA code states multiple relationships are not inherently unethical, but psychologists must avoid them if they could impair objectivity, competence, or effectiveness, or risk exploitation/harm to the client.",
            difficulty: "easy"
        },
        {
            domainId: 8,
            q: "In forensic settings, who is typically the 'client' that a psychologist serves?",
            options: ["The individual being evaluated", "The court, attorney, or referring agency", "The victim of the crime", "The individual's family"],
            answer: 1,
            rationale: "In forensic evaluations, the client is usually the retaining party (e.g., the court or attorney), not the examinee. The examinee must be informed of the limits of confidentiality and the purpose of the evaluation.",
            difficulty: "medium"
        },
        {
            domainId: 8,
            q: "Regarding the retention of patient records, APA guidelines generally recommend retaining full records for at least:",
            options: ["3 years after last contact", "5 years after last contact", "7 years after last contact for adults", "Records must never be destroyed"],
            answer: 2,
            rationale: "APA Record Keeping Guidelines stipulate holding full records for at least 7 years for adults, and for minors, 3 years after they reach the age of majority (but not less than 7 years total).",
            difficulty: "hard"
        },
        {
            domainId: 2,
            q: "Which schedule of reinforcement produces a 'scalloped' response pattern where responding increases dramatically right before the reinforcement is due?",
            options: ["Fixed Ratio", "Variable Ratio", "Fixed Interval", "Variable Interval"],
            answer: 2,
            rationale: "Fixed Interval schedules produce a scalloped pattern (low responding immediately after reinforcement, accelerating rapidly as the next reinforcement time approaches).",
            difficulty: "medium"
        },
        {
            domainId: 2,
            q: "Proactive interference occurs when:",
            options: ["New learning disrupts the recall of old information", "Old learning disrupts the learning or recall of new information", "Traumatic events are repressed into the unconscious", "Physical damage to the hippocampus prevents memory consolidation"],
            answer: 1,
            rationale: "Proactive interference means moving 'forward'—previously learned material interferes with the acquisition or retrieval of newly learned material.",
            difficulty: "easy"
        },
        {
            domainId: 3,
            q: "The phenomenon where group decisions tend to be more extreme than the initial inclinations of individual members is termed:",
            options: ["Groupthink", "Social facilitation", "Group polarization", "Deindividuation"],
            answer: 2,
            rationale: "Group polarization occurs when discussion strengthens the average initial preference of group members, leading to more extreme decisions.",
            difficulty: "medium"
        },
        {
            domainId: 3,
            q: "According to cognitive dissonance theory, a person is most likely to change their attitude to match their behavior when they performed the behavior for:",
            options: ["A large reward", "A small reward", "To avoid a severe punishment", "When coerced by a strong authority figure"],
            answer: 1,
            rationale: "With a small reward (insufficient external justification), the person experiences high cognitive dissonance and must change their internal attitude to justify the behavior (as seen in Festinger & Carlsmith's classic $1 vs $20 study).",
            difficulty: "hard"
        },
        {
            domainId: 4,
            q: "In Piaget's theory, the understanding that properties of objects remain the same even when their outward appearance changes is known as:",
            options: ["Object permanence", "Egocentrism", "Conservation", "Centration"],
            answer: 2,
            rationale: "Conservation (e.g., pouring liquid into a taller glass doesn't change the amount) is a hallmark of the concrete operational stage.",
            difficulty: "easy"
        },
        {
            domainId: 4,
            q: "According to Erikson, the primary psychosocial crisis of middle adulthood is:",
            options: ["Intimacy vs. Isolation", "Generativity vs. Stagnation", "Integrity vs. Despair", "Identity vs. Role Confusion"],
            answer: 1,
            rationale: "Generativity vs. Stagnation is Erikson's 7th stage, occurring in middle adulthood (ages ~40-65), characterized by a need to contribute to society and guide the next generation.",
            difficulty: "easy"
        },
        {
            domainId: 6,
            q: "Which therapeutic approach is driven by the premise that irrational beliefs and absolute 'musts' or 'shoulds' are the primary cause of emotional distress?",
            options: ["Client-Centered Therapy", "Rational Emotive Behavior Therapy (REBT)", "Dialectical Behavior Therapy (DBT)", "Gestalt Therapy"],
            answer: 1,
            rationale: "Albert Ellis's REBT focuses on identifying and aggressively disputing irrational beliefs, rigid demands, and 'musterbations' that lead to psychopathology.",
            difficulty: "easy"
        },
        {
            domainId: 6,
            q: "In structural family therapy, what term describes emotional barriers that protect and enhance the separateness of family members?",
            options: ["Enmeshment", "Triangulation", "Boundaries", "Mimesis"],
            answer: 2,
            rationale: "Minuchin's structural family therapy defines boundaries as the rules delineating who participates and how. Clear boundaries are healthy; rigid boundaries lead to disengagement, and diffuse boundaries lead to enmeshment.",
            difficulty: "medium"
        },
        {
            domainId: 7,
            q: "If a researcher wants to compare the mean depression scores of clients across three distinct treatment groups, the appropriate statistical test is:",
            options: ["Independent samples t-test", "Chi-square Test of Independence", "One-way ANOVA", "Factorial ANOVA"],
            answer: 2,
            rationale: "A One-way ANOVA is used to compare the means of three or more independent groups on a continuous dependent variable.",
            difficulty: "easy"
        },
        {
            domainId: 7,
            q: "A Type I error in hypothesis testing is defined as:",
            options: ["Failing to reject the null hypothesis when it is false", "Rejecting the null hypothesis when it is true", "Using an insufficiently large sample size", "Calculating power incorrectly"],
            answer: 1,
            rationale: "A Type I error (false positive) occurs when a researcher incorrectly rejects a true null hypothesis, claiming an effect exists when it actually does not.",
            difficulty: "medium"
        }
    ];

    // Find the right domains and append questions
    newQuestions.forEach(q => {
        const domain = EPPPData.domains.find(d => d.id === q.domainId);
        if (domain) {
            domain.questions.push(q);
        }
    });

    console.log(`Loaded 20 new questions from data_batch54.js`);

})();
