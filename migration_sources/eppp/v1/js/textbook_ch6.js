/* ============================================================
   PasstheEPPP — Textbook Ch 6: Specialized Assessment
   Domain: Assessment & Diagnosis (16% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-6',
    domain: 'Assessment & Diagnosis',
    domainNumber: 1,
    title: 'Specialized Assessment: Forensic, Neuropsychological, and Pediatric',
    examWeight: '16%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Standard IQ and personality tests aren\u2019t enough for every clinical situation. The EPPP routinely tests your knowledge of <strong>specialized assessment contexts</strong>. You must distinguish present adjudicative competence from mental state at the time of an alleged offense, match neuropsychological measures to the constructs they sample, and understand how pediatric assessment integrates evidence across people, settings, and methods.</p>'
        },
        {
            heading: 'Forensic Assessment: Competency vs. Insanity',
            content: '<p><strong>Competency to stand trial</strong> and an <strong>insanity defense</strong> answer different legal questions at different times. Psychological evaluation informs—but does not itself decide—either legal determination.</p>' +
                '<table>' +
                '<tr><th>Feature</th><th>Competency to Stand Trial (CST)</th><th>Insanity Defense (NGRI)</th></tr>' +
                '<tr><td><strong>Timeframe</strong></td><td><strong>Present</strong>: abilities during the proceedings</td><td><strong>Past</strong>: mental state at the alleged act</td></tr>' +
                '<tr><td><strong>Legal question</strong></td><td>Under <em>Dusky</em>, does the defendant have sufficient present ability to consult with counsel with a reasonable degree of rational understanding and a rational and factual understanding of the proceedings? Statutes add jurisdiction-specific detail.</td><td>Did a qualifying mental condition meet the jurisdiction\'s insanity rule at the time of the act? M\'Naghten, Model Penal Code, and the federal rule differ; not every jurisdiction recognizes the defense.</td></tr>' +
                '<tr><td><strong>Who decides?</strong></td><td>The evaluator supplies relevant data and an opinion within the referral and jurisdiction; the court makes the legal determination.</td><td>The evaluator addresses the jurisdiction\'s legal criteria; the judge or fact finder determines the legal outcome.</td></tr>' +
                '<tr><td><strong>What follows?</strong></td><td>Proceedings generally pause if the defendant is incompetent. Restoration, treatment, review, and disposition depend on governing law and due-process limits; medication is not automatic.</td><td>An NGRI verdict can lead to jurisdiction-specific commitment, review, conditional release, or supervision. It does not imply a single automatic placement.</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Competency is about present adjudicative abilities; insanity is about past mental state under a particular jurisdiction\'s rule.</p>',
            keyTerms: ['Competency to Stand Trial', 'Insanity Defense', 'NGRI', 'Dusky standard', 'M\'Naghten rule'],
            interactiveDiagram: {
                title: "Competence and Insanity Address Different Times and Legal Questions",
                description: "Two-column comparison. Competence to stand trial concerns present abilities: a factual and rational understanding of proceedings and sufficient ability to consult with counsel rationally. An insanity defense concerns mental state at the alleged offense under the jurisdiction’s rule. The evaluator supplies function-focused evidence and an opinion within applicable law; the court or fact finder makes the legal determination.",
                svg: "<svg viewBox=\"0 0 800 315\" width=\"100%\" role=\"img\" aria-labelledby=\"ch6LegalTitle ch6LegalDesc\" xmlns=\"http://www.w3.org/2000/svg\"><title id=\"ch6LegalTitle\">Competence and insanity address different timeframes</title><desc id=\"ch6LegalDesc\">The left panel asks about mental state at the alleged offense under the jurisdiction’s insanity rule. The right panel asks about present factual and rational understanding and rational ability to consult with counsel. Evaluators provide functional evidence and opinions; legal decision makers decide.</desc><rect x=\"25\" y=\"48\" width=\"360\" height=\"190\" rx=\"16\" fill=\"#4c1d1d\" stroke=\"#f87171\" stroke-width=\"2\"/><text x=\"205\" y=\"78\" text-anchor=\"middle\" fill=\"#fecaca\" font-weight=\"bold\" font-size=\"18\">THEN: alleged offense</text><text x=\"205\" y=\"111\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"14\">Apply the jurisdiction’s insanity rule</text><text x=\"205\" y=\"140\" text-anchor=\"middle\" fill=\"#e2e8f0\" font-size=\"12\">Mental condition + rule-specific capacities</text><text x=\"205\" y=\"174\" text-anchor=\"middle\" fill=\"#fecaca\" font-size=\"12\">Retrospective functional evidence</text><text x=\"205\" y=\"207\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Court or fact finder decides</text><rect x=\"415\" y=\"48\" width=\"360\" height=\"190\" rx=\"16\" fill=\"#172554\" stroke=\"#60a5fa\" stroke-width=\"2\"/><text x=\"595\" y=\"78\" text-anchor=\"middle\" fill=\"#bfdbfe\" font-weight=\"bold\" font-size=\"18\">NOW: proceedings</text><text x=\"595\" y=\"109\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"14\">Dusky + jurisdiction-specific law</text><text x=\"595\" y=\"137\" text-anchor=\"middle\" fill=\"#e2e8f0\" font-size=\"12\">Factual + rational understanding</text><text x=\"595\" y=\"162\" text-anchor=\"middle\" fill=\"#e2e8f0\" font-size=\"12\">Rational ability to consult with counsel</text><text x=\"595\" y=\"207\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Court decides</text><rect x=\"105\" y=\"258\" width=\"590\" height=\"42\" rx=\"10\" fill=\"#0f172a\" stroke=\"#94a3b8\"/><text x=\"400\" y=\"284\" text-anchor=\"middle\" fill=\"#e2e8f0\" font-size=\"13\">Evaluator: function-focused evidence + opinion • Decision maker: legal conclusion</text></svg>"
            },
            knowledgeCheck: {
                question: 'According to the Dusky standard, a defendant is competent to stand trial if they:',
                options: [
                    'Could not distinguish right from wrong at the time the crime was committed.',
                    'Have a factual and rational understanding of the proceedings and can consult with their attorney.',
                    'Are not currently suffering from a severe mental disease or defect.',
                    'Can remember the events of the crime with perfect accuracy.'
                ],
                answer: 1,
                rationale: 'Under Dusky, competence concerns present abilities: a rational and factual understanding of proceedings and sufficient present ability to consult with counsel with a reasonable degree of rational understanding. The court makes the legal determination under applicable law.'
            }
        },
        {
            heading: 'Forensic Assessment: Malingering and Risk',
            content: '<p>In forensic assessment, psychologists may evaluate response validity or violence risk when the referral, competence, and jurisdiction permit. These are probabilistic assessments—not lie detectors or guarantees.</p>' +
                '<p><strong>Response and performance validity:</strong></p>' +
                '<ul>' +
                '<li><strong>SIRS-2</strong>: A structured interview that samples response styles associated with feigned psychiatric symptoms. No single result proves malingering; interpretation integrates records, behavior, collateral information, and alternative explanations.</li>' +
                '<li><strong>M-FAST</strong>: A brief screen for possible feigned psychiatric symptoms; an elevated result calls for more comprehensive evaluation.</li>' +
                '<li><strong>TOMM</strong>: A performance-validity measure focused on effort and response validity in memory testing; it is not by itself a diagnosis of malingering.</li>' +
                '<li><strong>MMPI validity scales</strong>: Patterns can raise hypotheses about overreporting, underreporting, inconsistency, or unusual responding. They require scale-specific norms, context, and converging evidence rather than a simple high/low formula.</li>' +
                '</ul>' +
                '<p><strong>Violence risk formulation:</strong></p>' +
                '<ul>' +
                '<li><strong>HCR-20 V3</strong>: A structured professional judgment guide organizing historical, clinical, and risk-management information to support formulation, scenarios, and management planning. It does not produce certainty about an individual\'s future behavior.</li>' +
                '<li><strong>PCL-R</strong>: A clinician-rated measure of psychopathic traits. It may contribute information relevant to some risk formulations but is not a stand-alone violence-risk decision rule.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Structured methods improve transparency and consistency, but conclusions still require qualified judgment, multiple data sources, documented limitations, and attention to base rates and consequences.</p>',
            keyTerms: ['Malingering', 'SIRS', 'M-FAST', 'HCR-20', 'PCL-R', 'Structured Professional Judgment']
        },
        {
            heading: 'Neuropsychological Batteries: Fixed vs. Flexible',
            content: '<p>Neuropsychological assessment evaluates brain-behavior relationships using referral-focused history, observation, tests, validity evidence, and contextual data.</p>' +
                '<table>' +
                '<tr><th>Approach</th><th>More standardized / comprehensive</th><th>More flexible / hypothesis driven</th></tr>' +
                '<tr><td><strong>Selection</strong></td><td>A relatively consistent core of measures supports broad coverage and profile comparison.</td><td>Measures are selected and adapted to the referral, history, emerging findings, and practical constraints.</td></tr>' +
                '<tr><td><strong>Tradeoff</strong></td><td>Broad sampling may take longer and include low-yield measures.</td><td>Efficient targeting may miss an unanticipated weakness if the initial hypotheses are too narrow.</td></tr>' +
                '<tr><td><strong>Examples</strong></td><td>Historically, Halstead-Reitan and Luria-Nebraska batteries.</td><td>The Boston Process Approach emphasizes how a person solves tasks and analyzes errors; contemporary practice often blends standardized cores with flexible additions.</td></tr>' +
                '</table>' +
                '<p>Administration time is not a defining constant: it varies with the referral, version, patient, accommodations, and measures used. Battery scores describe performance under particular conditions; they do not independently identify lesion location or cause.</p>',
            keyTerms: ['Fixed battery', 'Flexible battery', 'Halstead-Reitan', 'Luria-Nebraska', 'Impairment Index']
        },
        {
            heading: 'Key Neuropsychological Tests',
            content: '<p>Match each measure to the <strong>constructs it samples</strong>, while remembering that performance reflects interacting cognitive systems, health, language, culture, education, sensory and motor abilities, effort, and testing conditions.</p>' +
                '<table>' +
                '<tr><th>Test</th><th>Typical task</th><th>Primary interpretive targets</th><th>Do not conclude from one score</th></tr>' +
                '<tr><td><strong>WCST</strong></td><td>Infer and shift sorting rules from feedback.</td><td>Set shifting, concept formation, feedback use, and perseverative responding.</td><td>A specific frontal lesion or etiology.</td></tr>' +
                '<tr><td><strong>Stroop-type task</strong></td><td>Resolve interference between word reading and ink color.</td><td>Inhibitory control, selective attention, and processing speed.</td><td>A uniquely frontal impairment.</td></tr>' +
                '<tr><td><strong>Benton Visual Retention Test</strong></td><td>Reproduce briefly presented geometric designs.</td><td>Visual perception, visual memory, and constructional performance.</td><td>A specific hemisphere or lobe lesion.</td></tr>' +
                '<tr><td><strong>Rey-Osterrieth Complex Figure</strong></td><td>Copy and later recall a complex figure.</td><td>Visuoconstruction, organization/strategy, and visual memory.</td><td>A single localization without the broader pattern.</td></tr>' +
                '<tr><td><strong>PPVT</strong></td><td>Select the picture matching a spoken word.</td><td>Receptive vocabulary without requiring a spoken response.</td><td>Global intelligence or a lesion; consider language, culture, hearing, vision, and motor access.</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Repeated use of an obsolete sorting rule after feedback is <strong>perseverative responding</strong>. It is associated with executive set-shifting difficulty, but interpretation depends on the full profile and context.</p>',
            keyTerms: ['WCST', 'Stroop', 'Benton Visual Retention', 'Rey-Osterrieth', 'PPVT', 'Executive functioning', 'Perseveration', 'Frontal lobe'],
            expandableCase: {
                title: 'The Unshifting Patient',
                clinicalDescription: 'A 55-year-old patient who recently suffered a traumatic brain injury is administered the Wisconsin Card Sorting Test (WCST). The examiner changes the sorting rule from "Color" to "Shape," and indicates that the patient\'s next card placement is "Incorrect." The patient becomes frustrated but continues to place the next 10 cards according to the old "Color" rule.',
                diagnosis: 'Perseverative responding and difficulty shifting set',
                explanation: 'Continuing the old rule despite corrective feedback is perseverative responding and suggests difficulty shifting cognitive set. WCST performance can be affected by several executive and nonexecutive factors; one result cannot establish a prefrontal lesion or identify the cause of impairment.'
            }
        },
        {
            heading: 'Pediatric Assessment: Behavior and Emotions',
            content: '<p>Pediatric assessment often integrates multiple informants and settings. Differences among parent, teacher, and youth reports are clinically meaningful data—not automatically measurement error. Rating scales support hypotheses and track functioning; they do not diagnose by themselves.</p>' +
                '<p><strong>Broad-band measures:</strong> BASC and ASEBA forms such as the CBCL sample internalizing, externalizing, adaptive, and other domains across available informants.</p>' +
                '<p><strong>Focused measures:</strong> Current validated Conners forms and Vanderbilt scales can contribute information about ADHD symptoms and impairment. Selection depends on age, setting, norms, purpose, and local practice; diagnosis also requires history, cross-setting impairment, differential assessment, and other relevant evidence.</p>' +
                '<p><strong>EPPP Tip:</strong> Choose a broad-band measure for a broad referral and a focused scale for a focused hypothesis—but always integrate multiple methods and sources.</p>',
            keyTerms: ['BASC-3', 'CBCL', 'Internalizing', 'Externalizing', 'Conners-3', 'ADHD']
        },
        {
            heading: 'Pediatric Assessment: Autism Spectrum Disorder',
            content: '<p>ASD evaluation separates <strong>screening</strong> from <strong>diagnosis</strong>. A positive screen indicates the need for timely diagnostic evaluation and supports; it does not confirm ASD.</p>' +
                '<table>' +
                '<tr><th>Instrument</th><th>Role</th><th>Responsible interpretation</th></tr>' +
                '<tr><td><strong>M-CHAT-R/F</strong></td><td>Parent-report screener validated for toddlers 16–30 months; autism-specific screening is recommended at 18 and 24 months and whenever concern arises.</td><td>Follow the scoring and follow-up algorithm. Elevated likelihood prompts referral; it is not a diagnosis.</td></tr>' +
                '<tr><td><strong>CARS-2</strong></td><td>Structured rating based on observation and history.</td><td>Supports clinical application of diagnostic criteria; no single observation tool fits every setting.</td></tr>' +
                '<tr><td><strong>ADOS-2</strong></td><td>Standardized observation of social communication and restricted/repetitive behavior.</td><td>Requires appropriate training and is interpreted with developmental history, functioning, and other data—not as a stand-alone confirmation.</td></tr>' +
                '<tr><td><strong>ADI-R</strong></td><td>Structured caregiver interview about developmental history and behavior.</td><td>Can contribute detailed historical evidence but does not replace direct observation or broader evaluation.</td></tr>' +
                '</table>' +
                '<p><strong>Integration map:</strong> developmental and medical history + caregiver and school information + direct observation + language, cognitive, adaptive, sensory, and functional assessment + differential diagnosis → clinical application of diagnostic criteria and an individualized support plan.</p>' +
                '<p><strong>EPPP Tip:</strong> Remember the role, not a “magic pair”: screeners flag risk; structured tools organize evidence; qualified clinicians integrate the complete record.</p>',
            keyTerms: ['Autism Spectrum Disorder', 'ADOS-2', 'ADI-R', 'CARS-2', 'M-CHAT-R/F', 'screening', 'comprehensive evaluation'],
            knowledgeCheck: {
                question: 'A toddler has an elevated M-CHAT-R/F result and later exceeds an ADOS-2 classification threshold. What is the best next conclusion?',
                options: [
                    'ASD is confirmed because two instruments agree.',
                    'The child should wait six months before any referral so false positives can resolve.',
                    'A qualified clinician should integrate developmental and caregiver history, direct observation, language/cognitive/adaptive and sensory functioning, impairment, and differential diagnoses while connecting the child with indicated services.',
                    'The ADOS-2 result should replace caregiver and school information.'
                ],
                answer: 2,
                rationale: 'Screening and structured observation provide important evidence but do not independently confirm ASD. Diagnosis requires clinical integration of history, observation, functioning, diagnostic criteria, and plausible alternatives; referral for indicated intervention need not wait for a final diagnosis.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Where can AI assist specialized assessment—and where must human legal and clinical judgment remain?',
        content: '<p>AI may help organize records, draft interview prompts, summarize score patterns, or improve access to educational explanations. Those uses require validated workflows, privacy and security controls, bias monitoring, transparent provenance, and qualified review.</p>' +
            '<p>AI must not be treated as the legal decision maker for competency or insanity, a stand-alone predictor of violence, a method for inferring a brain lesion from one score, or an autism diagnostic authority. These judgments depend on jurisdiction, referral context, standardized administration, direct examination, collateral evidence, functional impact, differential hypotheses, and professional accountability.</p>' +
            '<p>A useful safeguard is <strong>assist, verify, integrate</strong>: let a tool assist with bounded tasks; verify its output against source data and standards; and let an accountable professional integrate evidence and communicate uncertainty.</p>',
        studyNote: '💡 <strong>Study Note:</strong> (1) Competency = present abilities; insanity = past mental state under jurisdiction-specific law. (2) Neuropsychological tests sample constructs; one score rarely localizes or diagnoses. (3) Pediatric rating scales require cross-source integration. (4) ASD screeners and structured tools support—not replace—comprehensive clinical evaluation.'
    },
    references: [
        'American Academy of Pediatrics. (2020). <em>Identification, evaluation, and management of children with autism spectrum disorder</em>. Pediatrics, 145(1), e20193447.',
        'American Psychological Association. (2013). <em>Specialty guidelines for forensic psychology</em>. American Psychologist, 68(1), 7–19.',
        'Centers for Disease Control and Prevention. (2025). <em>Screening for autism spectrum disorder</em>.',
        '<em>Dusky v. United States</em>, 362 U.S. 402 (1960).',
        'Douglas, K. S., Hart, S. D., Webster, C. D., & Belfrage, H. (2013). <em>HCR-20 V3: Assessing risk for violence</em>. Mental Health, Law, and Policy Institute, Simon Fraser University.',
        'Hyman, S. L., Levy, S. E., & Myers, S. M. (2020). Identification, evaluation, and management of children with autism spectrum disorder. <em>Pediatrics, 145</em>(1), e20193447.',
        'U.S. Department of Justice. <em>Insanity—Present statutory test—18 U.S.C. § 17(a)</em>.'
    ]
});
