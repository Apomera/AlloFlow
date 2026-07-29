'use strict';

function reviewedItem({ legacyId, title, domainId, content, sourceDetails, reviewNote }) {
  return {
    legacyId,
    title,
    domainId,
    reviewStatus: 'source-reviewed-editorial-pass',
    content,
    references: sourceDetails.map((source) => source.url),
    sourceDetails,
    reviewNote,
    reviewDate: '2026-07-28',
    reviewMode: 'claim-level-source-and-editorial-review',
  };
}

const items = [
  reviewedItem({
    legacyId: 'memory-aid-730cbc71c6ece58c',
    title: 'Psychotropic Medication Classes',
    domainId: 1,
    content: `**AMAS retrieves four broad medication families; it does not prescribe a drug.** **A**ntidepressants include SSRIs, SNRIs, and older agents, but indications overlap and response, adverse effects, age, pregnancy, comorbidity, interactions, prior treatment, and preference affect selection. A fixed "2-6 week onset" is too simple: different symptoms and people improve on different timelines. **M**ood stabilizer is a clinical umbrella that includes lithium and some anticonvulsants or antipsychotics; lithium requires serum-level and organ-function monitoring, and no one drug is universally the gold standard. **A**nti-anxiety medications include antidepressants, buspirone, benzodiazepines, and other agents in selected contexts. Benzodiazepines can produce tolerance, physical dependence, withdrawal, and misuse risk, but "addictive" is not an all-or-none property; buspirone has lower demonstrated abuse/dependence liability, not zero risk or universal superiority. **A**ntipsychotics are not cleanly divided into first-generation "EPS drugs" and second-generation "safe drugs": movement, metabolic, cardiovascular, sedation, and other risks vary by agent and person. Clozapine can be important after inadequate response and carries severe-neutropenia risk. FDA removed the Clozapine REMS in 2025, while label-directed ANC monitoring remains recommended. Use AMAS for recognition only; medication choice, initiation, monitoring, tapering, and interaction management require current labeling and a qualified prescriber.`,
    sourceDetails: [
      {
        title: 'Mental Health Medications',
        organization: 'National Institute of Mental Health, National Institutes of Health',
        url: 'https://www.nimh.nih.gov/health/topics/mental-health-medications',
        whyReputable: `This current federal overview describes antidepressant, anti-anxiety, stimulant, antipsychotic, and mood-stabilizing medications, their overlapping uses, variable response, important monitoring needs, and limits on using a summary as medical guidance.`,
      },
      {
        title: 'FDA removes risk evaluation and mitigation strategy program for the antipsychotic drug clozapine',
        organization: 'U.S. Food and Drug Administration',
        url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-removes-risk-evaluation-and-mitigation-strategy-rems-program-antipsychotic-drug-clozapine',
        whyReputable: `This is FDA's primary 2025 regulatory communication distinguishing removal of the Clozapine REMS program from the continuing severe-neutropenia warning and recommendation for ANC monitoring under prescribing information.`,
      },
    ],
    reviewNote: `Kept the four-family cue while removing universal indications, timelines, first-line rules, addiction binaries, classwide adverse-effect claims, and the now-outdated Clozapine REMS implication.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-2434cc8073eef0b4',
    title: 'Circadian Rhythms & Sleep Disorders',
    domainId: 1,
    content: `**Use LIGHT -> SCN -> BODY CLOCKS -> TIMED OUTPUTS, not "three built-in clocks."** The suprachiasmatic nucleus (SCN) is a central circadian pacemaker that receives retinal light information and helps synchronize rhythms across tissues. Melatonin is one output and timing signal: evening darkness usually promotes secretion, but light exposure, dose, timing, age, medications, and individual biology matter. Cortisol has a circadian pattern and often rises around awakening, yet it is not a separate "awakening clock" and a single morning measurement does not diagnose sleep or stress dysfunction. Jet lag and shift work involve misalignment between internal rhythms, sleep opportunity, and the external schedule; circadian rhythm sleep-wake disorders require a persistent pattern with clinically important sleep or waking impairment, not merely one late night. Timed light, planned sleep schedules, or melatonin may help selected circadian conditions, but timing is part of the intervention and the same advice is not correct for every disorder. Seasonal-pattern depression is a mood-disorder pattern, not simply "less daylight causes depression," and light therapy needs diagnostic and safety consideration. Sleep architecture changes across development and varies widely: older adults often have less slow-wave sleep and more fragmentation, while infants have more REM than adults. The map supports mechanism recognition; it cannot select a supplement, dose, treatment time, or diagnosis.`,
    sourceDetails: [
      {
        title: 'Circadian Rhythms',
        organization: 'National Institute of General Medical Sciences, National Institutes of Health',
        url: 'https://www.nigms.nih.gov/education/fact-sheets/Pages/circadian-rhythms',
        whyReputable: `This NIH fact sheet explains distributed biological clocks, the SCN's coordinating role, retinal light input, melatonin timing, and health effects of persistent circadian disruption without reducing the system to three hormones.`,
      },
      {
        title: 'Practice parameters for the clinical evaluation and treatment of circadian rhythm sleep disorders',
        organization: 'American Academy of Sleep Medicine; PubMed Central',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2082098/',
        whyReputable: `This professional guideline reviews disorder-specific assessment and the conditional use of planned schedules, timed light, and timed melatonin, supporting the crucial boundary that intervention direction and timing depend on the circadian presentation.`,
      },
      {
        title: 'How Sleep Works: Sleep Phases and Stages',
        organization: 'National Heart, Lung, and Blood Institute, National Institutes of Health',
        url: 'https://www.nhlbi.nih.gov/health/sleep/stages-of-sleep',
        whyReputable: `This current NIH resource defines REM and the three NREM stages and summarizes how sleep-stage organization changes with age, supporting developmentally bounded rather than rigid architecture percentages.`,
      },
    ],
    reviewNote: `Replaced the false three-clock model and hormone-as-cause shortcuts with light entrainment, distributed clocks, diagnostic impairment, timing-dependent interventions, and variable lifespan sleep architecture.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-5b8768222163c497',
    title: 'Schedules of Reinforcement',
    domainId: 2,
    content: `**Decode a schedule with two questions: WHAT advances it, and HOW predictable is the requirement?** **Ratio** schedules advance with responses; **interval** schedules make reinforcement available after time, usually for the first qualifying response after the interval. **Fixed** means a constant requirement and **variable** means requirements vary around a programmed value. Thus FR can produce a postreinforcement pause followed by responding, VR often supports relatively steady responding, FI can produce accelerating or "scalloped" responding, and VI often supports steadier moderate responding under classic laboratory arrangements. These are characteristic patterns, not rankings that every organism, task, or parameter must show. Reinforcer quality, deprivation or satiation, schedule value, instructions, response effort, prior learning, and concurrent alternatives change performance. A weekly paycheck is not automatically FI because salary usually is not delivered contingent on the first response after seven days; identify the actual response-reinforcer contingency. Intermittent reinforcement can produce more responding during extinction than continuous reinforcement in many preparations, but "VR is always most resistant" confuses different definitions and comparison arrangements. Resistance may be measured relative to baseline rate, time, responses, or omitted reinforcers, and those measures can disagree. FVFV is a classification cue, not a universal rate or persistence formula and not an intervention plan.`,
    sourceDetails: [
      {
        title: 'Schedules of Reinforcement',
        organization: 'B. F. Skinner Foundation',
        url: 'https://www.bfskinner.org/wp-content/uploads/2015/05/Schedules_of_Reinforcement_PDF.pdf',
        whyReputable: `This authorized digital edition of Ferster and Skinner's foundational experimental monograph documents the definitions, parameters, and diverse performance patterns produced by fixed and variable ratio and interval schedules.`,
      },
      {
        title: 'Applied Implications of Reinforcement History Effects',
        organization: 'Journal of Applied Behavior Analysis; PubMed Central',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2649832/',
        whyReputable: `This peer-reviewed review explains how schedule history, instructions, reinforcer parameters, and measurement choices influence responding and extinction, preventing textbook response-pattern generalizations from becoming universal laws.`,
      },
    ],
    reviewNote: `Preserved FVFV classification while correcting the weekly-paycheck example, converting rate rankings to characteristic laboratory patterns, and bounding the partial-reinforcement extinction claim by parameters and measurement.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-c537c5186122fa72',
    title: 'Extinction & Spontaneous Recovery',
    domainId: 2,
    content: `**Extinction changes contingencies; it does not make behavior "die."** In respondent conditioning, extinction repeatedly presents a conditioned stimulus without the expected unconditioned stimulus. In operant conditioning, the reinforcer that previously followed a response is no longer delivered for that response. Responding may decrease, but the course is not guaranteed to be smooth, complete, or permanent. A temporary increase in rate, duration, intensity, or variability is sometimes called an extinction burst; it can occur, but it is not required and should never be provoked or tolerated without a safety plan. Return of responding can occur after time passes (**spontaneous recovery**), after a context change (**renewal**), after unsignaled reinforcer exposure (**reinstatement**), or when reinforcement resumes (**reacquisition**). These patterns support the view that extinction often creates context-sensitive new learning rather than erasing the original relation. In applied work, first identify the response's function and the actual maintaining reinforcer, teach and reinforce a safe alternative, plan for generalization and maintenance, monitor adverse escalation, and protect assent, dignity, and safety. Withholding attention is not extinction when escape, sensory consequences, access to items, pain, communication difficulty, or another variable maintains the response. "Intermittent is hardest" is only a rough laboratory cue; history, context, reinforcer rate and magnitude, instructions, and the measure of persistence all matter.`,
    sourceDetails: [
      {
        title: 'Relapse processes after the extinction of instrumental learning: renewal, resurgence, and reacquisition',
        organization: 'Behavioural Processes; PubMed Central, U.S. National Library of Medicine',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3355659/',
        whyReputable: `This peer-reviewed review defines instrumental extinction and distinct return-of-response effects and explains the context-dependent new-learning account rather than treating extinction as erasure.`,
      },
      {
        title: 'Applied Implications of Reinforcement History Effects',
        organization: 'Journal of Applied Behavior Analysis; PubMed Central',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2649832/',
        whyReputable: `This peer-reviewed applied review documents that extinction course depends on schedule history, reinforcer magnitude and delay, instructions, and prior exposure, and it cautions against simple persistence rankings.`,
      },
    ],
    reviewNote: `Removed death and inevitable-burst language, distinguished four return effects, and added functional assessment, alternative reinforcement, safety, and context boundaries around applied extinction.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-3d1a213773c50a1a',
    title: 'Cognitive Biases in Clinical Judgment',
    domainId: 3,
    content: `**Use PAUSE as a debiasing routine: Prevalence, Alternatives, Updates, Systems, Evidence.** **Prevalence:** begin with relevant base rates while recognizing that local populations and referral settings change them. **Alternatives:** generate plausible competing explanations and actively seek findings that would differentiate or disconfirm them. **Updates:** revise an initial formulation when new information arrives instead of anchoring on the first label. **Systems:** examine access, culture, language, discrimination, environment, measurement, and team processes before attributing a problem only to the person. **Evidence:** combine validated measures, records, collateral information when appropriate, repeated observation, and explicit reasoning rather than relying on one vivid example. Familiar labels such as anchoring, availability, confirmation bias, hindsight bias, base-rate neglect, attribution error, and illusory correlation are useful hypotheses about judgment, not diagnoses of a clinician's motive or proof that a decision is wrong. Heuristics can be efficient, and merely naming a bias does not reliably remove it. Structured assessment, checklists, statistical tools, consultation, feedback, and deliberate reflection can reduce some errors under some conditions, but each tool has limits and may introduce new ones. Evidence-based practice therefore integrates research with clinical expertise and the person's characteristics, culture, and preferences. PAUSE supports transparent reasoning; it cannot replace competence, a validated instrument, collaborative assessment, or outcome monitoring.`,
    sourceDetails: [
      {
        title: 'Policy Statement on Evidence-Based Practice in Psychology',
        organization: 'American Psychological Association',
        url: 'https://www.apa.org/practice/guidelines/evidence-based-statement.html',
        whyReputable: `APA's official policy explicitly identifies cognitive and affective biases as limits on clinical expertise and defines evidence-based practice as integration of research, expertise, and patient characteristics, culture, and preferences.`,
      },
      {
        title: 'Cognitive biases associated with medical decisions: a systematic review',
        organization: 'BMC Medical Informatics and Decision Making; PubMed',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27809908/',
        whyReputable: `This peer-reviewed systematic review evaluates empirical studies connecting multiple cognitive biases with diagnostic or management decisions and also documents important evidence gaps and methodological limitations.`,
      },
    ],
    reviewNote: `Converted a list of clinician failings into a source-bounded debiasing routine, clarified that a bias label does not prove error, and retained structured methods as safeguards rather than cures.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-f118803317aafbc5',
    title: 'Prejudice & Discrimination Interventions',
    domainId: 3,
    content: `**CSER names intervention families, not four guaranteed prejudice reducers.** **C**ontact can improve intergroup attitudes on average, especially when interaction is meaningful and supported, but effects vary by group, setting, contact quality, power, threat, voluntariness, and outcome. Allport's equal-status, common-goal, cooperation, and institutional-support conditions are useful design considerations, not a checklist that makes contact harmless or successful. **S**uperordinate goals and cooperative interdependence can shift relationships, yet one historical demonstration does not establish durable transfer across settings. **E**mpathy and perspective-taking exercises sometimes change short-term self-report or attitudes, but light-touch effects may fade, fail to change behavior or institutions, or backfire when imposed without context. Jane Elliott's classroom exercise is historically recognizable, not a general evidence-based training prescription. **R**ecategorization or a common ingroup identity may reduce some boundaries while obscuring meaningful subgroup identities, inequities, or within-group variation. Contemporary reviews find promising effects for some contact and multifaceted approaches but substantial heterogeneity, publication bias concerns, and limited evidence about long-term behavioral or structural change. Define the target, measure behavior and climate as well as attitudes, attend to power and safety, involve affected communities, test for differential effects, and monitor durability and unintended harm. CSER helps compare mechanisms; it cannot certify a diversity program.`,
    sourceDetails: [
      {
        title: 'Prejudice Reduction: Progress and Challenges',
        organization: 'Annual Review of Psychology',
        url: 'https://doi.org/10.1146/annurev-psych-071620-030619',
        whyReputable: `This peer-reviewed review and meta-analysis evaluates 418 experiments, identifies publication-bias and generalizability concerns, and shows why light-touch mentalizing interventions do not support universal actionable claims.`,
      },
      {
        title: 'Can we really reduce ethnic prejudice outside the lab? A meta-analysis of direct and indirect contact interventions',
        organization: 'European Journal of Social Psychology',
        url: 'https://doi.org/10.1002/ejsp.2079',
        whyReputable: `This peer-reviewed meta-analysis specifically evaluates contact-based interventions in applied settings and supports average benefits while retaining heterogeneity and design boundaries.`,
      },
    ],
    reviewNote: `Preserved CSER as an intervention-family cue while removing guaranteed reduction claims, the classroom exercise as prescription, and one-size-fits-all assumptions about contact, empathy, goals, and recategorization.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-cf7fd0ed8fcd3826',
    title: 'Prenatal Development & Teratogens',
    domainId: 4,
    content: `**Remember TIME x DOSE x AGENT x SUSCEPTIBILITY, not a ranked danger list.** The germinal or preimplantation period, embryonic organogenesis, and fetal growth and functional maturation are useful broad phases, but exact boundaries differ depending on whether age is counted from fertilization or the last menstrual period. Early exposure is sometimes taught with an "all-or-none" rule: extensive cell loss may cause pregnancy loss while surviving cells may compensate. Treat that as a rule of thumb, not a guarantee of miscarriage or no effect. During organogenesis, many structures have exposure-specific windows of vulnerability, so structural malformation risk is often emphasized. Fetal development remains vulnerable to growth and functional effects, especially in the nervous system; "less vulnerable" never means safe. Developmental risk depends on the agent, route, timing, dose and duration, maternal and fetal biology, coexposures, and health context. Alcohol exposure can cause fetal alcohol spectrum disorders, and CDC states there is no known safe amount or time for alcohol use during pregnancy; that public-health guidance does not mean every exposure produces the same outcome. Tobacco, infections, medications, substances, metals, and environmental exposures have different evidence and risk patterns, so "alcohol is number one" is not a scientific comparison. Do not stop a prescribed medication after seeing a mnemonic: weigh maternal and fetal risks with qualified prenatal and prescribing professionals using exposure-specific evidence.`,
    sourceDetails: [
      {
        title: 'Critical Periods of Development',
        organization: 'MotherToBaby; NCBI Bookshelf, U.S. National Library of Medicine',
        url: 'https://www.ncbi.nlm.nih.gov/books/NBK582659/',
        whyReputable: `This evidence-based teratology fact sheet explains pregnancy dating, critical periods, the qualified all-or-none concept, and how dose, frequency, route, and timing affect developmental risk.`,
      },
      {
        title: 'About Alcohol Use During Pregnancy',
        organization: 'Centers for Disease Control and Prevention',
        url: 'https://www.cdc.gov/alcohol-pregnancy/about/index.html',
        whyReputable: `This current federal public-health source states the evidence-based no-known-safe-amount and no-safe-time guidance while also noting that prenatal alcohol exposure does not affect every pregnancy identically.`,
      },
    ],
    reviewNote: `Replaced deterministic periods and a sensational ranked teratogen list with exposure-specific timing, dose, agent, susceptibility, pregnancy-dating, medication-safety, and probabilistic-outcome boundaries.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-a61699e2115580b8',
    title: 'Aging & Cognitive Changes',
    domainId: 4,
    content: `**Use SELECTIVE CHANGE + WIDE VARIATION, not "fluid falls, crystal climbs" as destiny.** On average, processing speed, novel reasoning, episodic memory, and some working-memory or executive tasks become more difficult across adulthood, while vocabulary, general knowledge, well-practiced skills, and semantic knowledge are often more resilient and may improve into later life before changing. These are group trends with different trajectories, not an individual's timetable: education, culture, sensory status, health, sleep, mood, medications, vascular risk, opportunity, practice, and cohort affect performance. Fluid abilities do not all peak at one age or decline at one rate, and crystallized ability does not rise indefinitely. Recognition can provide more retrieval support than free recall, but neither is uniformly preserved. Prospective memory also depends strongly on whether the task uses an event cue, time cue, routine, external reminder, or personally meaningful goal. Normal age-related change is generally gradual and should not by itself prevent everyday functioning. Repeated questions, getting lost in familiar places, unsafe judgment, major personality or language change, or difficulty completing familiar daily tasks warrants clinical evaluation, but no single sign proves dementia. Hearing or vision loss, depression, delirium, sleep disorders, medication effects, and medical illness can affect cognition and may be treatable. The cue predicts average domains; longitudinal history, functional impact, appropriate norms, and comprehensive assessment guide conclusions about a person.`,
    sourceDetails: [
      {
        title: 'Memory loss and forgetfulness',
        organization: 'National Institute on Aging, National Institutes of Health',
        url: 'https://www.nia.nih.gov/health/memory-loss-and-forgetfulness',
        whyReputable: `This current NIH resource distinguishes occasional age-related forgetting from changes that interfere with everyday functioning and identifies medical, emotional, sensory, sleep, and medication contributors requiring evaluation.`,
      },
      {
        title: 'Normal Cognitive Aging',
        organization: 'Clinics in Geriatric Medicine; PubMed Central, U.S. National Library of Medicine',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4015335/',
        whyReputable: `This peer-reviewed clinical review synthesizes selective average changes and preserved abilities, emphasizes substantial heterogeneity, and warns that normal cognitive aging should not be equated with functional impairment.`,
      },
    ],
    reviewNote: `Retained the fluid-crystallized contrast but replaced fixed peaks, inevitable decline, and blanket memory rules with selective trajectories, heterogeneity, functional thresholds, and differential assessment.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-78b130d558ed2778',
    title: 'IQ Score Interpretation',
    domainId: 5,
    content: `**For many deviation-IQ scales, 100 is the reference mean and 15 is the reference SD; interpretation still begins with the manual.** Under an approximately normal reference distribution, 115 is about the 84th percentile, 130 about the 98th, 85 about the 16th, and 70 about the 2nd. Those are mathematical approximations, not diagnoses or immutable ranks. Exact percentile tables, composite construction, floors and ceilings, norms, confidence intervals, and descriptive categories depend on the test, edition, age band, and score. Labels such as "superior," "borderline," or "extremely low" are not universal across instruments or editions and can stigmatize; quote the applicable manual and describe functioning in context. An observed score is an estimate with measurement error, so report its confidence interval and avoid treating a cutoff as a perfectly sharp boundary. The 68-95-99.7 rule assumes an ideal normal distribution and does not replace empirical norms, especially in distribution tails. Compare indexes or subtests only with manual-based difference reliability and base rates; a visible gap is not automatically a disorder or special strength. Interpretation integrates referral question, language, culture, disability and access, education, testing behavior, effort and validity indicators when appropriate, developmental and medical history, adaptive functioning, and corroborating data. IQ scores do not measure every valued human ability, reveal fixed potential, establish etiology, or by themselves diagnose intellectual disability, giftedness, learning disorder, or neurocognitive disorder.`,
    sourceDetails: [
      {
        title: 'IQ',
        organization: 'APA Dictionary of Psychology, American Psychological Association',
        url: 'https://dictionary.apa.org/iq',
        whyReputable: `APA's professional dictionary defines modern deviation IQ, the customary mean and standard deviation, broad normal-distribution proportions, and major interpretation limits concerning learned skills and testing context.`,
      },
      {
        title: 'Standards for Educational and Psychological Testing',
        organization: 'American Educational Research Association, American Psychological Association, and National Council on Measurement in Education',
        url: 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf',
        whyReputable: `These jointly developed professional standards are the primary authoritative framework for measurement error, score precision, norms, fairness, validity, intended populations, and responsible interpretation and use.`,
      },
    ],
    reviewNote: `Retained quick deviation-score arithmetic while making percentiles approximate, categories manual-specific, confidence intervals mandatory context, and diagnosis dependent on broader functional and assessment evidence.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-e92318963f68f340',
    title: 'Conversion Disorder (Functional Neurological)',
    domainId: 5,
    content: `**FND is a positive functional diagnosis, not "stress converted into symptoms."** Functional neurological disorder (also called functional neurological symptom disorder) can involve weakness, movement, sensory, speech, gait, or seizure-like symptoms. Symptoms are real and can cause substantial disability. Diagnosis relies on a compatible presentation and positive clinical features showing internal inconsistency or incongruence with recognized neurological disease; it should not rest only on normal tests or the absence of a structural lesion. Psychological stress, trauma, anxiety, or depression may be relevant for some people but is not required, and no single psychodynamic explanation is established. Functional and other neurological conditions can coexist, so a positive FND sign does not make every symptom functional. "La belle indifference" is neither required nor diagnostically specific and should not be used to judge credibility. FND is distinct from intentionally produced symptoms, but intent cannot be inferred from inconsistency alone; malingering involves external incentive and factitious disorder involves deceptive production without that external reward, each requiring evidence beyond a mnemonic. Communicate the diagnosis without blame, explain what positive signs support it, assess comorbid medical and psychological needs, and coordinate individualized treatment that may include education, physiotherapy, occupational or speech therapy, and psychotherapy. The old conversion story is historical context, not a mechanism, lie detector, or treatment plan.`,
    sourceDetails: [
      {
        title: 'Functional Neurologic Disorder',
        organization: 'National Institute of Neurological Disorders and Stroke, National Institutes of Health',
        url: 'https://www.ninds.nih.gov/health-information/disorders/functional-neurologic-disorder',
        whyReputable: `This federal neurological-disorders resource describes FND symptoms as genuine, emphasizes altered nervous-system functioning rather than fabrication, and outlines multidisciplinary assessment and treatment.`,
      },
      {
        title: 'Current Concepts in Diagnosis and Treatment of Functional Neurological Disorders',
        organization: 'JAMA Neurology; PubMed Central, U.S. National Library of Medicine',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7293766/',
        whyReputable: `This peer-reviewed review explains positive rule-in signs, removal of a required psychological stressor, coexistence with neurological disease, communication principles, and evidence for multidisciplinary treatment.`,
      },
    ],
    reviewNote: `Replaced the unsupported stress-conversion mechanism and no-neurological-cause phrasing with positive rule-in signs, coexistence, nonrequired stress, nonjudgmental communication, and multidisciplinary care.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-2d807ddedc9112e8',
    title: 'Token Economy & Contingency Management',
    domainId: 6,
    content: `**A token economy is a linked system, not merely "points for prizes."** Specify at least six interacting elements: observable target responses; tokens that function as conditioned reinforcers; backup reinforcers selected with the participant; the token-production schedule; the exchange schedule and rate; and rules for when backup reinforcers are available. Clear instructions, immediate and consistent delivery, preference assessment, data collection, staff training, and a plan to thin or fade the system often matter. A token is not inherently reinforcing, and the same backup item will not remain valuable for every person or context. Token economies have been studied in schools, residential and clinical settings, but effectiveness and maintenance depend on population, target, implementation, comparison, and outcome; benefits do not generalize automatically to every classroom, inpatient unit, family, or behavior. Contingency management is a broader family, and a contingency contract is a related written arrangement, not a required component of every token economy. Do not remove already-earned necessities, food, safety, communication, education, treatment, or rights. Distinguish reinforcement from coercion and response cost, use the least restrictive effective procedure, seek meaningful assent and authorized consent, monitor equity and adverse effects, and pair reinforcement with skill building and natural supports. The three-part target-token-backup cue starts recall; ethical, individualized design and maintenance evidence determine practice.`,
    sourceDetails: [
      {
        title: 'Token Economy: A Systematic Review of Procedural Descriptions',
        organization: 'Behavior Modification; PubMed, U.S. National Library of Medicine',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28423911/',
        whyReputable: `This peer-reviewed systematic review identifies six core procedural components and documents incomplete reporting, directly supporting a more precise system definition than the three-step classroom mnemonic.`,
      },
      {
        title: 'A Systematic Review of Treatment Maintenance Strategies in Token Economies',
        organization: 'Journal of Applied Behavior Analysis; PubMed Central',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9712881/',
        whyReputable: `This peer-reviewed review evaluates maintenance and fading strategies and shows that immediate behavior change does not by itself establish durable effects after token procedures end.`,
      },
      {
        title: 'Ethical Principles of Psychologists and Code of Conduct',
        organization: 'American Psychological Association',
        url: 'https://www.apa.org/ethics/code',
        whyReputable: `APA's official ethics code supplies enforceable boundaries concerning avoiding harm, informed consent, competence, discrimination, privacy, and treatment that apply when psychologists design or oversee contingency procedures.`,
      },
    ],
    reviewNote: `Expanded the simplistic three-part definition to the six-component evidence base and added reinforcement-function, preference, fading, maintenance, assent, equity, rights, and least-restrictive-practice limits.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-14b0b315bdb75195',
    title: 'DBT — Dialectical Behavior Therapy',
    domainId: 6,
    content: `**DBT balances ACCEPTANCE + CHANGE, and DIME retrieves four skill areas.** **D**istress tolerance, **I**nterpersonal effectiveness, **M**indfulness, and **E**motion regulation organize skills taught in DBT. Named skills such as DEAR MAN, TIPP, PLEASE, opposite action, and wise mind are prompts to consult an authorized current manual, not self-explanatory crisis instructions. Comprehensive outpatient DBT is more than a skills list: research protocols commonly coordinate individual therapy, skills training, between-session coaching within defined limits, and a therapist consultation team. A group or app that teaches selected skills may be "DBT-informed" or DBT skills training and should not automatically be represented as the full treatment package. DBT was developed for chronically suicidal people diagnosed with borderline personality disorder, and evidence now spans additional populations and adaptations, but efficacy, format, duration, and component evidence differ by problem and setting. It is not the only evidence-supported treatment for borderline presentations or suicide risk. Behavioral target hierarchies, chain analysis, validation, contingency management, commitment strategies, monitoring, and crisis planning are central clinical processes that DIME does not capture. Do not use a mnemonic to coach an acute crisis, promise symptom elimination, or apply advanced methods outside competence. Treatment selection should integrate current evidence, risk, diagnosis and formulation, access, culture, preference, clinician training, fidelity, and response.`,
    sourceDetails: [
      {
        title: 'Two-Year Randomized Controlled Trial and Follow-up of Dialectical Behavior Therapy vs Therapy by Experts',
        organization: 'Archives of General Psychiatry; JAMA Network',
        url: 'https://jamanetwork.com/journals/jamapsychiatry/fullarticle/209726',
        whyReputable: `This landmark randomized trial reports an adherent comprehensive DBT protocol and explicitly identifies individual therapy, group skills training, telephone consultation, and therapist consultation-team meetings.`,
      },
      {
        title: 'Borderline personality disorder: recognition and management',
        organization: 'National Institute for Health and Care Excellence',
        url: 'https://www.nice.org.uk/guidance/CG78',
        whyReputable: `This current, independently developed evidence-based clinical guideline addresses assessment, crisis care, treatment structure, and the bounded role of DBT within broader person-centered management of borderline personality disorder.`,
      },
    ],
    reviewNote: `Retained the acceptance-change dialectic and DIME cue while separating skills from comprehensive DBT and adding protocol, evidence-scope, crisis, competence, fidelity, and individualized-treatment boundaries.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-ea2cef981bbaa657',
    title: 'Validity Types',
    domainId: 7,
    content: `**Replace "four types of validity" with CLAIM -> EVIDENCE -> ARGUMENT -> USE.** Contemporary standards define validity in relation to how well evidence and theory support a proposed interpretation of test scores for a specified use. The test itself does not possess four permanent validity badges. **Content evidence** asks whether tasks adequately represent the intended domain. **Response-process evidence** asks whether respondents and scorers use the processes the interpretation assumes. **Internal-structure evidence** examines dimensionality and relationships among items or components. **Relations-to-other-variables evidence** includes convergent, discriminant, concurrent, predictive, and group-difference patterns when relevant. **Consequences** require examining intended and unintended effects, while recognizing that consequences alone do not establish score meaning. Historical labels such as content, criterion, and construct validity can orient an exam question, but predictive and concurrent are timing distinctions within relations evidence, and convergent, discriminant, and factor-analytic findings are strands of a larger validity argument. "Ecological validity" can ask whether tasks, settings, or inferences generalize to real-world contexts; it is not a coequal fourth psychometric type that validates every use. Reliability or precision is necessary for many interpretations but not sufficient. State the population, score meaning, decision, and conditions; gather the evidence most vulnerable assumptions require; integrate supportive and contradictory findings; and revisit the argument as uses, populations, or evidence change.`,
    sourceDetails: [
      {
        title: 'Standards for Educational and Psychological Testing',
        organization: 'American Educational Research Association, American Psychological Association, and National Council on Measurement in Education',
        url: 'https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf',
        whyReputable: `These jointly developed professional standards provide the authoritative current definition of validity and organize evidence around content, response processes, internal structure, relations, and consequences for proposed interpretations and uses.`,
      },
      {
        title: 'Validating the Interpretations and Uses of Test Scores',
        organization: 'Journal of Educational Measurement, National Council on Measurement in Education',
        url: 'https://doi.org/10.1111/jedm.12000',
        whyReputable: `Kane's peer-reviewed foundational article explains argument-based validation, the distinction between validating interpretations and uses, and why more ambitious claims require stronger and more varied evidence.`,
      },
    ],
    reviewNote: `Replaced the outdated four-type taxonomy with the current unified validity argument while preserving historical labels as evidence cues and explicitly separating ecological generalization and reliability.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-5994feb6db338df9',
    title: 'Single-Subject Research Designs',
    domainId: 7,
    content: `**Single-case experiments seek REPEATED PREDICTION + VERIFICATION + REPLICATION, not a magic ABA label.** Repeated measurement within a case establishes a baseline prediction and tracks change when an intervention is systematically introduced or withdrawn. An A-B design can document change but usually cannot separate intervention effects from history, maturation, measurement change, or trend. Withdrawal or reversal designs can strengthen inference when behavior is expected to reverse and treatment can be withdrawn safely; an A-B-A-B sequence is not automatically "best," and returning toward baseline after withdrawal does not by itself prove causation. Multiple-baseline designs stagger intervention across independent but comparable participants, behaviors, or settings and can demonstrate effects without withdrawal, but a mere stagger is insufficient if baselines covary, intervention timing is not controlled, or change does not replicate. Alternating-treatments and changing-criterion designs answer different questions and have their own carryover and control requirements. Current standards look for repeated demonstrations of effect and examine level, trend, variability, immediacy, overlap, and consistency across similar phases. Visual analysis is central, yet effect-size or randomization methods can supplement it; neither visual inspection nor one statistic is infallible. Plan stable measurement, sufficient observations, fidelity, interobserver agreement, missing-data handling, generalization, maintenance, adverse-event reporting, and socially important outcomes. Ethical feasibility and reversibility determine design choice, not a hierarchy that always ends with ABAB.`,
    sourceDetails: [
      {
        title: 'Single-Case Design Technical Documentation',
        organization: 'What Works Clearinghouse, Institute of Education Sciences, U.S. Department of Education',
        url: 'https://ies.ed.gov/ncee/wwc/Document/229',
        whyReputable: `This federal technical standard defines design and evidence requirements, repeated demonstrations of effect, and systematic visual analysis of level, trend, variability, immediacy, overlap, and consistency.`,
      },
      {
        title: 'Optimizing behavioral health interventions with single-case designs: from development to dissemination',
        organization: 'Translational Behavioral Medicine; PubMed Central',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4167892/',
        whyReputable: `This peer-reviewed methodological review compares reversal, multiple-baseline, alternating-treatment, and changing-criterion designs and discusses causal inference, ethical withdrawal, measurement, and dissemination limits.`,
      },
    ],
    reviewNote: `Removed the behavioral-gold-standard and ABAB-is-best hierarchy, replacing it with replicated effect logic, current visual-analysis dimensions, design-specific threats, and ethical feasibility.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-ecaf8cdc679550e9',
    title: 'Tarasoff Ruling — Complete',
    domainId: 8,
    content: `**TARASOFF is a California case anchor; current jurisdiction controls.** In the 1976 California decision, the court held that when a therapist determines, or under professional standards should determine, that a patient presents a serious danger of violence to another, the therapist must use reasonable care to protect the foreseeable victim. The court described warning the victim or likely intermediaries, notifying police, and other reasonably necessary steps as possibilities whose adequacy depends on the circumstances. It did not create one national formula requiring direct warning whenever a client mentions harm. "Tarasoff I equals warn; Tarasoff II equals protect" is useful history but not a current multistate decision rule. States differ in whether a duty is mandatory, permissive, or not specially codified; covered professionals, triggering language, identifiable-victim requirements, immunity, permitted actions, documentation, and confidentiality rules also differ and can change. Threats involving self-harm, abuse reporting, weapons, forensic roles, schools, or property may invoke different authorities. Ethical confidentiality standards permit disclosure when mandated or permitted by law for a valid purpose, limited to what is necessary; they do not independently settle local duty-to-protect law. When risk emerges, conduct and document a competent individualized assessment, take proportionate safety steps, consult current law and qualified supervisors or counsel when feasible, and disclose only as authorized or required. Do not delay urgent protection while searching for a mnemonic, and do not promise that any single action automatically discharges a legal duty.`,
    sourceDetails: [
      {
        title: 'Tarasoff v. Regents of University of California, 17 Cal. 3d 425 (1976)',
        organization: 'Supreme Court of California decision reproduced by Justia',
        url: 'https://law.justia.com/cases/california/supreme-court/3d/17/425.html',
        whyReputable: `This full judicial opinion is the primary case text for the California duty of reasonable care to protect and the court's circumstance-dependent examples of warning, police notification, or other protective steps.`,
      },
      {
        title: 'Ethical Principles of Psychologists and Code of Conduct',
        organization: 'American Psychological Association',
        url: 'https://www.apa.org/ethics/code',
        whyReputable: `APA's official ethics code distinguishes confidentiality duties from disclosures mandated or permitted by law and requires limiting disclosure to the purpose, while leaving jurisdiction-specific legal duties to governing authority.`,
      },
    ],
    reviewNote: `Preserved Tarasoff as the California historical anchor while removing a fixed national trigger/exception list and adding jurisdiction, role, proportional response, minimum disclosure, documentation, and urgent-safety boundaries.`,
  }),
  reviewedItem({
    legacyId: 'memory-aid-2f43626024671c85',
    title: 'End-of-Life Ethical Issues',
    domainId: 8,
    content: `**Use VALUES + CAPACITY + AUTHORITY + TEAM, not a universal end-of-life checklist.** Advance care planning helps a person discuss goals, values, and treatment preferences for a time when they may be unable to decide. An advance directive may record instructions and/or appoint a health-care agent, but forms, witnessing, activation, revocation, surrogate priority, and scope depend on jurisdiction and setting. **Capacity** is a clinical, decision-specific, and time-specific assessment of abilities such as communicating a choice, understanding relevant information, appreciating its application, and reasoning about options; **competence** is a legal determination. A diagnosis, depression, disability, disagreement, or unconventional choice alone does not establish incapacity, and a stable choice is not always required when values or circumstances legitimately change. Psychologists can support communication, symptom and grief care, family work, team consultation, capacity evaluation within competence, and equitable access to palliative services. APA adopted a resolution on palliative care and end-of-life issues in February 2026, so "APA has no official position" is outdated; that resolution should not be stretched into a single rule about medical aid in dying. Laws and professional roles concerning aid in dying, euthanasia, refusal of treatment, hospice, and surrogate decisions differ. Avoid abandonment, but continuing the same therapy indefinitely is not required: plan transitions and referrals based on need, benefit, consent, competence, safety, and continuity. Kubler-Ross stages describe neither a required sequence nor a treatment plan. Verify current law and policy, collaborate with the person and interdisciplinary team, address culture and access, and document the reasoning.`,
    sourceDetails: [
      {
        title: 'Resolution on Palliative Care and End-of-life Issues and Justification',
        organization: 'American Psychological Association',
        url: 'https://www.apa.org/about/policy/palliative-care-end-life-issues',
        whyReputable: `This APA Council-adopted February 2026 policy is the current primary professional source on psychology's roles in palliative and end-of-life care and directly corrects the legacy claim that APA has no official position.`,
      },
      {
        title: 'Advance Care Planning',
        organization: 'Centers for Medicare & Medicaid Services, U.S. Department of Health and Human Services',
        url: 'https://www.hhs.gov/guidance/sites/default/files/hhs-guidance-documents/AdvanceCarePlanning.pdf',
        whyReputable: `This official federal guidance defines voluntary advance care planning and distinguishes instructions, living wills, health-care proxies, and powers of attorney while directing users to state-specific legal forms.`,
      },
      {
        title: 'Ethical Principles of Psychologists and Code of Conduct',
        organization: 'American Psychological Association',
        url: 'https://www.apa.org/ethics/code',
        whyReputable: `APA's official ethics code supplies relevant boundaries for competence, informed consent, avoiding harm, cooperation, interruption and termination of services, and responsible assessment without replacing local law.`,
      },
    ],
    reviewNote: `Updated the aid for APA's February 2026 policy, separated clinical capacity from legal competence, removed universal legal and nonabandonment claims, and added jurisdiction, team, continuity, equity, and scope boundaries.`,
  }),
];

const wave = {
  schemaVersion: 1,
  waveId: 'eppp-memory-aid-review-wave-07',
  generatedAt: '2026-07-28T18:00:00.000Z',
  status: 'source-reviewed-editorial-pass-independent-expert-review-pending',
  summary: {
    items: 16,
    domains: 8,
    itemsPerDomain: 2,
  },
  safeguards: [
    'Legacy text remains preserved; reviewed replacements are applied by stable legacy ID through the ordered native catalog builder.',
    'Wave 07 follows Wave 06, contains exactly two unique-title aids per domain, and cannot overlap a prior numbered memory-aid review wave.',
    'Medication, developmental, diagnostic, intervention, psychometric, ethical, and legal mnemonics remain retrieval aids rather than individual decision rules.',
    'Current-law, current-label, scope-of-practice, cultural-context, and safety boundaries are explicit where a simplified aid could otherwise direct harmful action.',
    'Source review and editorial review do not constitute independent qualified expert, clinical, legal, or psychometric validation.',
  ],
  items,
};

module.exports = {
  items,
  wave,
};
