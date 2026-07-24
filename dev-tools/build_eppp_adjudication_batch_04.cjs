#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'test_prep', 'eppp_legacy');
const deployRoot = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_legacy');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const docket = readJson(path.join(sourceRoot, 'next_review_docket.json'));
const priorIds = new Set(['01', '02', '03'].flatMap((batch) => readJson(path.join(sourceRoot, `adjudication_batch_${batch}.json`)).items.map((item) => item.legacyId)));

const sources = {
  teratogens: {
    title: 'Identifying Human Teratogens: An Update',
    organization: 'Journal of Pediatric Genetics review archived by PubMed Central, U.S. National Library of Medicine',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4918715/',
    credibility: 'This peer-reviewed clinical genetics review explains that teratogenic effects depend on agent, dose, timing, and susceptibility and identifies organogenesis as a high-risk window for many major structural malformations.',
  },
  availability: {
    title: 'Availability: A heuristic for judging frequency and probability',
    organization: 'Amos Tversky and Daniel Kahneman, Cognitive Psychology, 5(2), 207-232 (1973)',
    url: 'https://www.sciencedirect.com/science/article/pii/0010028573900339',
    credibility: 'This is the original peer-reviewed article defining availability as judging frequency or probability by the ease with which relevant instances come to mind.',
  },
  prison: {
    title: 'Debunking the Stanford Prison Experiment',
    organization: 'Thibault Le Texier, American Psychologist, 74(7), 823-839 (2019), indexed by PubMed',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31380664/',
    credibility: 'This peer-reviewed archival analysis in the APA flagship journal uses study records and participant interviews to examine demand characteristics, instructions, data quality, and limits on the famous situational interpretation.',
  },
  parenting: {
    title: 'Current patterns of parental authority',
    organization: 'Diana Baumrind, Developmental Psychology Monographs, 4(1, Part 2), 1-103 (1971)',
    url: 'https://doi.org/10.1037/h0030372',
    credibility: 'This is Baumrind\'s primary monograph describing patterns of parental authority. It supports distinguishing permissive parenting by low demands and control while avoiding deterministic claims about child outcomes.',
  },
  dif: {
    title: 'Differential Item Functioning: A Primer',
    organization: 'Educational Testing Service',
    url: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/dif-primer.pdf',
    credibility: 'ETS is a major nonprofit assessment research organization. Its technical primer defines matched-group item performance and explicitly explains why statistical DIF is a flag for review rather than automatic proof of bias.',
  },
  sld: {
    title: 'Specific Learning Disorder: DSM-5 Fact Sheet',
    organization: 'American Psychiatric Association',
    url: 'https://www.psychiatry.org/File%20Library/Psychiatrists/Practice/DSM/APA_DSM-5-Specific-Learning-Disorder.pdf',
    credibility: 'The American Psychiatric Association publishes the DSM. Its official fact sheet explains the shift away from a required IQ-achievement discrepancy and toward persistent, functionally significant academic-skill difficulties.',
  },
  dbt: {
    title: 'Dialectical Behavioral Therapy: A Cognitive Behavioral Approach to Parasuicide',
    organization: 'Marsha M. Linehan, Journal of Personality Disorders, 1(4), 328-333 (1987)',
    url: 'https://guilfordjournals.com/doi/10.1521/pedi.1987.1.4.328',
    credibility: 'This primary article by DBT\'s developer describes the comprehensive behavioral treatment for chronically parasuicidal individuals and its relationship to borderline personality disorder.',
  },
  phobia: {
    title: 'Phobias and Phobia-Related Disorders',
    organization: 'National Institute of Mental Health, U.S. National Institutes of Health',
    url: 'https://www.nimh.nih.gov/health/publications/phobias-and-phobia-related-disorders',
    credibility: 'NIMH is the lead U.S. federal agency for mental-health research. Its current public clinical overview identifies psychotherapy as primary and describes exposure therapy as confronting avoided phobic stimuli.',
  },
  causation: {
    title: 'Finding and Using Health Statistics: Causation',
    organization: 'U.S. National Library of Medicine',
    url: 'https://www.nlm.nih.gov/oet/ed/stats/02-400.html',
    credibility: 'This federal health-statistics resource explains that correlation alone does not establish causality and describes design and alternative explanations that must be evaluated before causal inference.',
  },
  tarasoff: {
    title: 'Tarasoff v. Regents of the University of California, 17 Cal. 3d 425',
    organization: 'Supreme Court of California decision (1976), reproduced by Justia U.S. Law',
    url: 'https://law.justia.com/cases/california/supreme-court/3d/17/425.html',
    credibility: 'This is the full text of the controlling California Supreme Court decision. The opinion uses a duty-to-protect formulation and must be distinguished from later statutes and cases in other jurisdictions.',
  },
  tarasoffVariation: {
    title: 'The Tarasoff Rule: The Implications of Interstate Variation and Gaps in Professional Training',
    organization: 'Journal of the American Academy of Psychiatry and the Law, 42(4), 469-477 (2014)',
    url: 'https://jaapl.org/content/42/4/469',
    credibility: 'This peer-reviewed forensic psychiatry review documents substantial interstate variation in whether a duty exists, what triggers it, who is covered, and what protective acts can satisfy it.',
  },
};

const revisions = [
  {
    legacyId: 'legacy-fa28ef459c32f17e', decision: 'major-rewrite', sourceVerification: 'organogenesis-risk-supported-global-most-dangerous-claim-rejected',
    findings: ['Weeks 3-8 after conception are a particularly sensitive organogenesis window for many major structural malformations.', 'No single period is most dangerous for every teratogen and outcome; preimplantation loss, later growth and functional injury, dose, agent, and susceptibility all matter.'],
    sources: [sources.teratogens],
    prompt: 'Which statement best describes how timing influences prenatal teratogen effects?',
    choices: ['Organogenesis is especially sensitive for many structural malformations, but risk and outcome depend on the agent, dose, timing, and susceptibility.', 'The first two weeks are harmless because exposures cannot affect implantation or early embryonic survival.', 'After organogenesis, teratogens cannot affect growth, brain development, or later functional outcomes.', 'Every exposure produces the same effect throughout pregnancy because developmental timing does not alter vulnerability.'], answerIndex: 0,
    rationale: 'The embryonic organogenesis period is a major window of susceptibility for many structural malformations, but “most dangerous” is not universal. Effects depend on the particular agent, dose, duration, developmental timing, and biological susceptibility. Earlier exposure can affect implantation or survival, while later exposure can disrupt growth and functional development.',
    choiceRationales: ['This captures both the important organogenesis principle and the variables that prevent one universal ranking of prenatal periods.', 'Very early exposure can produce no detectable effect or impair implantation and survival; calling the period harmless is medically inaccurate.', 'The fetal period includes continued brain development, growth, and functional maturation, all of which can be affected by relevant exposures.', 'Critical windows differ among organs and agents, so timing materially changes both the likelihood and form of a developmental effect.'],
  },
  {
    legacyId: 'legacy-aa8c736228b329d2', decision: 'major-rewrite', sourceVerification: 'construct-supported-duplicate-reauthored',
    findings: ['The original Tversky and Kahneman construct concerns judgments of frequency or probability based on ease of retrieval or construction.', 'The definition appeared six times and the keyed option was longer and more specific than all distractors.'],
    sources: [sources.availability],
    prompt: 'After seeing several vivid news reports about house fires, a person estimates that house fires are much more common than base-rate data indicate. Which process most directly explains the estimate?',
    choices: ['Availability heuristic', 'Anchoring effect', 'Confirmation bias', 'Status quo bias'], answerIndex: 0,
    rationale: 'The availability heuristic uses the ease with which examples can be recalled or imagined as a cue to frequency or probability. Vivid and recently encountered fire reports are unusually retrievable, so the person overweights them relative to base-rate information. Ease of recall is a cue, not proof that the event is objectively frequent.',
    choiceRationales: ['The judgment follows the accessibility of vivid examples rather than the statistical base rate, which is the defining availability pattern.', 'Anchoring occurs when judgment remains influenced by an initial numerical value or starting point; no such starting value is supplied here.', 'Confirmation bias favors information consistent with an existing belief, whereas the scenario specifically links estimated frequency to easy recall.', 'Status quo bias is a preference for maintaining an existing option or condition and does not explain probability judgments from memorable examples.'],
  },
  {
    legacyId: 'legacy-09edce066124c67c', decision: 'major-rewrite', sourceVerification: 'classic-interpretation-not-demonstrated-by-design',
    findings: ['The study is historically associated with a situational-power interpretation.', 'Archival work identifies experimenter involvement, guard instructions, demand characteristics, small selected samples, limited controls, and other problems that prevent a clean causal demonstration.'],
    sources: [sources.prison],
    prompt: 'Which conclusion about the 1971 Stanford Prison study is most scientifically defensible today?',
    choices: ['It is historically influential but cannot by itself establish that assigned roles caused the observed behavior because major design and demand-characteristic concerns limit inference.', 'It conclusively proved that anyone assigned authority will become abusive regardless of instructions, selection, or context.', 'It was a randomized clinical trial demonstrating that cognitive-behavioral therapy prevents institutional aggression.', 'It validated a personality inventory by showing stable trait scores before and after incarceration.'], answerIndex: 0,
    rationale: 'The Stanford Prison study helped popularize discussion of roles and situations, but its evidence does not support the legacy claim that it demonstrated a general causal law. Experimenter participation, explicit guard orientation, demand characteristics, limited controls, sampling, and disputed reporting substantially constrain internal validity and generalizability.',
    choiceRationales: ['This recognizes the study\'s historical influence while matching the methodological limits documented through archival analysis and participant interviews.', 'Universal causal language exceeds what a small, heavily structured simulation with substantial experimenter involvement can establish.', 'The study neither tested psychotherapy nor used a clinical-treatment design, so it provides no evidence about cognitive-behavioral intervention efficacy.', 'Participants were assigned prison roles in a simulation; the project was not designed to validate the reliability or stability of a personality inventory.'],
  },
  {
    legacyId: 'legacy-6a3a65e71e6f9aa3', decision: 'major-rewrite', sourceVerification: 'style-description-supported-outcome-determinism-qualified',
    findings: ['Permissive parenting is classically characterized by relatively high responsiveness or acceptance and low demands or behavioral control.', 'The duplicate item treated authoritative parenting as universally optimal and implied deterministic child outcomes without cultural, contextual, or measurement qualification.'],
    sources: [sources.parenting],
    prompt: 'A caregiver is affectionate and responsive but rarely sets limits, enforces expectations, or requires age-appropriate responsibility. Which Baumrind-style pattern best fits?',
    choices: ['Permissive parenting', 'Authoritative parenting', 'Authoritarian parenting', 'Uninvolved parenting'], answerIndex: 0,
    rationale: 'The combination of warmth or responsiveness with low demands and limited behavioral control most closely matches permissive parenting in the classic typology. Parenting styles describe patterns rather than deterministic causes: observed child outcomes vary with culture, context, child characteristics, measurement, and the specific behaviors grouped under a label.',
    choiceRationales: ['High responsiveness paired with few enforced limits or demands is the defining contrast that makes permissive the best answer.', 'Authoritative parenting combines responsiveness with clear expectations and developmentally appropriate behavioral structure, which is missing here.', 'Authoritarian parenting emphasizes high control and obedience with comparatively lower responsiveness, the opposite control pattern from the scenario.', 'Uninvolved parenting is comparatively low in both responsiveness and demands; the caregiver here is explicitly affectionate and responsive.'],
  },
  {
    legacyId: 'legacy-b7efefe34a6b9b00', decision: 'major-rewrite', sourceVerification: 'dif-definition-supported-bias-inference-qualified',
    findings: ['DIF flags an item when matched examinees from different groups have different probabilities of item responses or success.', 'DIF is not synonymous with unfair bias; content review and construct-relevance analysis are needed to determine whether the difference is irrelevant or problematic.'],
    sources: [sources.dif],
    prompt: 'After examinees are matched on the ability targeted by a test, one item remains substantially easier for one demographic group than another. What is the best next interpretation?',
    choices: ['The item shows differential item functioning and should receive substantive review before any conclusion about bias.', 'The entire test is proven culturally biased and every score must be discarded immediately.', 'The item merely has low difficulty because group matching makes between-group differences impossible.', 'The result establishes that the groups have different overall ability on the construct being measured.'], answerIndex: 0,
    rationale: 'Differential item functioning is present when matched examinees from different groups respond differently to an item. It is a statistical signal for investigation, not an automatic verdict of bias. Reviewers must examine content, construct relevance, model fit, impact, and alternative explanations before deciding whether revision or removal is warranted.',
    choiceRationales: ['This correctly separates statistical detection from the later substantive judgment about whether the item difference is construct-irrelevant and unfair.', 'One DIF flag does not establish that the complete assessment is biased or that every resulting score is uninterpretable.', 'Matching makes the comparison meaningful; it does not guarantee identical item performance or reduce DIF to ordinary item difficulty.', 'Because examinees were matched on the target ability, the residual item difference cannot itself prove an overall group ability difference.'],
  },
  {
    legacyId: 'legacy-b32487b34d741744', decision: 'minor-revision', sourceVerification: 'key-supported-current-edition-framing-added',
    findings: ['The keyed concept matches the DSM-5 framework retained in DSM-5-TR: persistent academic-skill difficulty, underachievement, developmental onset, and exclusionary considerations.', 'The stem should identify the current DSM-5-TR context and avoid implying that failure of intervention alone is sufficient for diagnosis.'],
    sources: [sources.sld],
    prompt: 'Which pattern is most consistent with the DSM-5-TR framework for Specific Learning Disorder?',
    choices: ['Persistent difficulty in reading, written expression, or mathematics that is substantially below expectations and not better explained by other conditions or inadequate opportunity', 'A Full Scale IQ below 70 without evidence about adaptive functioning or any specific academic-skill pattern', 'Any temporary decline in grades that resolves after ordinary instruction and is fully explained by prolonged absence', 'A required mathematical discrepancy between global IQ and achievement regardless of history, instruction, or functional impact'], answerIndex: 0,
    rationale: 'Specific Learning Disorder involves persistent difficulties learning and using academic skills, performance substantially below age expectations with meaningful interference, onset during school years, and findings not better explained by intellectual disability, sensory problems, other disorders, language, adversity, or inadequate instruction. DSM-5 removed a required IQ-achievement discrepancy.',
    choiceRationales: ['This option includes persistence, a defined academic domain, substantial underperformance, and the need to evaluate alternative explanations.', 'Low intellectual test performance alone does not establish Specific Learning Disorder and intellectual-disability assessment also requires adaptive-functioning evidence.', 'A transient, fully explained academic decline does not meet the persistent neurodevelopmental pattern required for this diagnosis.', 'The DSM-5 framework does not require the older IQ-achievement discrepancy formula and instead uses comprehensive clinical and educational evidence.'],
  },
  {
    legacyId: 'legacy-23fbc1705f1e8f0f', decision: 'major-rewrite', sourceVerification: 'historical-target-supported-duplicate-reauthored',
    findings: ['DBT was developed for chronically suicidal and self-injuring people, with early evaluation focused on women meeting criteria for borderline personality disorder.', 'The duplicate legacy wording could imply that DBT is now limited to BPD, despite later adaptations and evidence in other populations.'],
    sources: [sources.dbt],
    prompt: 'Which statement most accurately describes the original clinical target and later scope of dialectical behavior therapy?',
    choices: ['It was developed for chronic suicidal and self-harming behavior, initially studied especially in people with borderline personality disorder, and later adapted more broadly.', 'It was created as a medication-only protocol for attention-deficit/hyperactivity disorder and has no psychotherapy component.', 'It began as an exposure-only treatment for specific phobia and excludes skills practice or therapist consultation.', 'It was designed solely for autism assessment and cannot be used with co-occurring emotion-regulation difficulties.'], answerIndex: 0,
    rationale: 'Linehan developed DBT to address chronic suicidal and self-injurious behavior, with foundational trials emphasizing people diagnosed with borderline personality disorder. Comprehensive DBT combines individual treatment, skills training, between-session coaching, and a clinician consultation team. Later adaptations mean its history should not be taught as an exclusive present-day indication.',
    choiceRationales: ['This accurately separates the treatment\'s original clinical problem and study population from its later adaptation to additional presentations and settings.', 'DBT is a comprehensive behavioral psychotherapy, not a medication protocol, and ADHD was not the original target of its development.', 'Although behavioral methods can include exposure principles, DBT is not an exposure-only specific-phobia treatment and includes multiple coordinated modes.', 'DBT was not created as an autism assessment, and categorical language about never using adapted skills with co-occurring needs is unwarranted.'],
  },
  {
    legacyId: 'legacy-63bcb8e883c60da9', decision: 'minor-revision', sourceVerification: 'exposure-first-line-supported-absolute-superlative-qualified',
    findings: ['Exposure-based psychotherapy is the primary evidence-based approach for specific phobia.', 'Most effective is too context-free; subtype, safety, readiness, access, comorbidity, preference, and adaptations such as applied tension can affect the plan.'],
    sources: [sources.phobia],
    prompt: 'An adult with a specific spider phobia wants treatment for severe avoidance. Which intervention has the strongest direct fit with the disorder\'s maintaining avoidance pattern?',
    choices: ['Planned, repeated exposure to the feared stimulus with reduction of avoidance and safety behaviors', 'Unstructured exploration of childhood memories without any contact with the feared stimulus', 'Long-term antipsychotic medication as the standard first-line monotherapy', 'Academic remediation focused on reading fluency and mathematical calculation'], answerIndex: 0,
    rationale: 'Exposure-based psychotherapy directly targets phobic avoidance by helping the person approach the feared object or situation in a planned and tolerable way while reducing escape and safety behaviors. Treatment should be individualized; for example, blood-injection-injury phobia may incorporate applied tension, and clinical judgment must address safety, consent, and comorbidity.',
    choiceRationales: ['The intervention directly targets avoidance and permits corrective learning, making it the best-supported match for a circumscribed specific phobia.', 'Insight-oriented discussion may be meaningful for some goals, but avoiding all contact with the feared cue does not directly treat the maintaining avoidance pattern.', 'Antipsychotics are not standard first-line monotherapy for a specific phobia and carry risks unrelated to the primary evidence-based approach.', 'Academic remediation treats learning difficulties and has no direct mechanism for reducing fear and avoidance of a phobic stimulus.'],
  },
  {
    legacyId: 'legacy-57c0f32734f38a06', decision: 'minor-revision', sourceVerification: 'key-supported-causal-boundary-sharpened',
    findings: ['Correlation alone is compatible with confounding, reverse direction, selection, measurement artifacts, and chance.', 'The legacy distractor saying only experiments measure relationships was false; many designs measure associations, while causal inference depends on design and assumptions.'],
    sources: [sources.causation],
    prompt: 'A cross-sectional study finds that adolescents who sleep less report more anxiety. Why does this correlation alone not establish that reduced sleep causes anxiety?',
    choices: ['Anxiety may reduce sleep, other variables may influence both, and the design does not establish temporal or causal direction.', 'Correlations cannot describe relationships between measured variables under any circumstances.', 'A nonzero correlation proves causation only when the sample size exceeds one hundred participants.', 'Causal direction is automatically determined by placing sleep before anxiety in the written research question.'], answerIndex: 0,
    rationale: 'The association is real as a statistical observation but is compatible with multiple causal structures. Anxiety could disrupt sleep, a third factor could affect both, selection or measurement could contribute, or effects could be bidirectional. Establishing causation requires design features and assumptions beyond a cross-sectional correlation.',
    choiceRationales: ['This option identifies reverse causation, confounding, and missing temporal evidence, all central limits of the stated design.', 'Correlation is useful for quantifying the direction and strength of association even though it cannot establish causation by itself.', 'A larger sample can improve precision but does not transform an observational correlation into a randomized or otherwise identified causal effect.', 'The wording or order of variables in a question has no bearing on temporal precedence, confounding control, or causal identification.'],
  },
  {
    legacyId: 'legacy-ec5367635d624e5a', decision: 'major-rewrite', sourceVerification: 'california-duty-supported-national-generalization-rejected',
    findings: ['The 1976 California decision is framed as a duty to protect a foreseeable victim, not a universal rule requiring only one specific warning action.', 'Other jurisdictions have adopted, modified, limited, permitted, or rejected related duties, with different triggers and protective options.'],
    sources: [sources.tarasoff, sources.tarasoffVariation],
    prompt: 'Which statement best describes the legal significance of Tarasoff for a psychologist practicing in the United States?',
    choices: ['The California decision articulated a duty to use reasonable care to protect a foreseeable victim, but the clinician must consult the current law of the controlling jurisdiction.', 'It created one federal statute imposing an identical warning procedure on every mental-health professional in every state.', 'It permits unrestricted disclosure of any client statement whenever a therapist feels uneasy, without considering threat criteria or minimum disclosure.', 'It established that confidentiality can never be limited to protect an identifiable person from a serious threat.'], answerIndex: 0,
    rationale: 'Tarasoff is a California Supreme Court duty-to-protect decision. It became highly influential, but it did not create a uniform federal rule. States differ in whether a duty is mandatory, permissive, or absent; what threat triggers it; which professionals are covered; and what reasonable protective steps can discharge it. Current local law and consultation are essential.',
    choiceRationales: ['This states the California holding at the right level and recognizes that present duties and permitted actions depend on the controlling jurisdiction.', 'A state supreme court decision is not a federal statute, and subsequent state statutes and cases do not impose one identical national procedure.', 'Protective disclosure is bounded by applicable threat criteria, professional judgment, law, and the principle of limiting disclosure to what is reasonably necessary.', 'The decision is famous precisely because confidentiality may yield to a legally recognized protective duty under qualifying circumstances.'],
  },
];

const docketById = new Map(docket.items.map((item) => [item.legacyId, item]));
const items = revisions.map((revision, index) => {
  const candidate = docketById.get(revision.legacyId);
  if (!candidate) throw new Error(`Missing docket candidate ${revision.legacyId}`);
  if (priorIds.has(revision.legacyId)) throw new Error(`Candidate already adjudicated: ${revision.legacyId}`);
  return {
    adjudicationPosition: index + 1,
    legacyId: revision.legacyId,
    domainId: candidate.domainId,
    originalPrompt: candidate.prompt,
    originalAnswerIndex: candidate.answerIndex,
    decision: revision.decision,
    sourceVerification: revision.sourceVerification,
    findings: revision.findings,
    workflowStage: 'editorial-adjudicated-quarantine',
    learnerVisibleInNativeBank: false,
    independentExpertStatus: 'not-started',
    productionStatus: 'not-production-validated',
    revisedItem: { prompt: revision.prompt, choices: revision.choices, answerIndex: revision.answerIndex, rationale: revision.rationale, choiceRationales: revision.choiceRationales, sourceDetails: revision.sources },
  };
});

const expectedDomains = { biological: 1, 'cognitive-affective': 1, 'social-cultural': 1, lifespan: 1, assessment: 2, intervention: 2, research: 1, professional: 1 };
const actualDomains = Object.fromEntries(Object.keys(expectedDomains).map((domain) => [domain, items.filter((item) => item.domainId === domain).length]));
if (JSON.stringify(actualDomains) !== JSON.stringify(expectedDomains)) throw new Error(`Unexpected domain distribution: ${JSON.stringify(actualDomains)}`);
for (const item of items) {
  const q = item.revisedItem;
  if (q.choices.length !== 4 || q.choiceRationales.length !== 4) throw new Error(`${item.legacyId} must have four choices and explanations.`);
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) throw new Error(`${item.legacyId} has an invalid key.`);
  if (q.rationale.length < 140 || q.choiceRationales.some((text) => text.length < 90)) throw new Error(`${item.legacyId} has incomplete feedback.`);
  if (!q.sourceDetails.length || q.sourceDetails.some((source) => !source.title || !source.organization || !/^https:\/\//.test(source.url) || source.credibility.length < 120)) throw new Error(`${item.legacyId} has incomplete provenance.`);
}

const summary = {
  adjudicatedCandidates: items.length,
  minorRevision: items.filter((item) => item.decision === 'minor-revision').length,
  majorRewrite: items.filter((item) => item.decision === 'major-rewrite').length,
  promotedToNativeBank: 0,
  independentExpertValidated: 0,
  domainDistribution: actualDomains,
};
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  currentSourceReviewDate: '2026-07-14',
  status: 'editorial-adjudication-complete-still-quarantined',
  purpose: 'Adjudicate ten EPPP legacy candidates selected for duplicate content, unsupported source claims, weak feedback, clinical overstatement, and jurisdiction-sensitive law without treating editorial revision as expert approval.',
  reviewMethod: [
    'Verify each key against an authoritative, official, primary, or peer-reviewed source and record the supported inference boundary.',
    'Treat duplicate stems as reauthoring tasks rather than merely changing a few words.',
    'Distinguish statistical flags from substantive conclusions and historical influence from causal proof.',
    'Require four plausible, conceptually distinct options and a substantive explanation for every option.',
    'Keep every revised item quarantined pending independent qualified review in the relevant specialty.',
  ],
  summary,
  items,
};

const rows = items.map((item) => `| ${item.adjudicationPosition} | ${item.legacyId} | ${item.domainId} | ${item.decision} | ${item.sourceVerification} |`).join('\n');
const markdown = `# EPPP editorial adjudication batch 04\n\nGenerated: ${report.generatedAt}\n\n**Status: editorial adjudication complete; all items remain quarantined.**\n\n${report.purpose}\n\n## Outcome\n\n- ${summary.adjudicatedCandidates} candidates reviewed across all eight EPPP domains.\n- ${summary.minorRevision} required minor corrections.\n- ${summary.majorRewrite} required major rewriting.\n- ${summary.promotedToNativeBank} were promoted to the learner-facing bank.\n- Independent qualified review remains pending for every item.\n- Current-edition and jurisdiction-sensitive sources were checked through ${report.currentSourceReviewDate}.\n\n| # | Legacy ID | Domain | Decision | Source finding |\n| ---: | --- | --- | --- | --- |\n${rows}\n\n## Review method\n\n${report.reviewMethod.map((step) => `- ${step}`).join('\n')}\n\nThe JSON companion preserves the original prompt and key, item-specific findings, the complete revised item, explanation of every option, and full source provenance.\n`;

for (const outputRoot of [sourceRoot, deployRoot]) {
  fs.writeFileSync(path.join(outputRoot, 'adjudication_batch_04.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'adjudication_batch_04.md'), markdown, 'utf8');
}

console.log(`EPPP adjudication batch 04: ${summary.adjudicatedCandidates} reviewed, ${summary.minorRevision} minor revisions, ${summary.majorRewrite} major rewrites, 0 released.`);
