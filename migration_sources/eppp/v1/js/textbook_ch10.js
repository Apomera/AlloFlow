/* ============================================================
   PasstheEPPP — Textbook Ch 10: Psychological Testing Ethics
   Domain: Ethical, Legal & Professional Issues (16% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-10',
    domain: 'Ethical, Legal & Professional Issues',
    domainNumber: 2,
    title: 'Psychological Testing Ethics & Assessment Standards',
    examWeight: '16%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Assessment ethics bridges the <strong>Assessment & Diagnosis</strong> domain with <strong>Ethics</strong>. The EPPP tests whether you know the ethical rules governing test use, test security, release of test data, use of tests with diverse populations, and the important distinction between <strong>test data</strong> and <strong>test materials</strong>. This chapter also covers the <em>Standards for Educational and Psychological Testing</em> (2014), a leading consensus source for responsible test development, evaluation, and use; it is guidance rather than a substitute for law, regulation, the Ethics Code, or test-specific evidence.</p>'
        },
        {
            heading: 'APA Ethics Code Standard 9: Assessment',
            content: '<p>Standard 9 contains the enforceable rules for assessment. Key sub-standards:</p>' +
                '<table>' +
                '<tr><th>Standard</th><th>Topic</th><th>Key Rule</th></tr>' +
                '<tr><td><strong>9.01</strong></td><td>Bases for Assessment</td><td>Opinions and recommendations must rest on information and techniques sufficient to substantiate the findings. When an individual examination is not warranted or necessary, explain the sources of information and limitations of conclusions.</td></tr>' +
                '<tr><td><strong>9.02</strong></td><td>Use of Assessments</td><td>Use tests in a manner consistent with their <em>validity and reliability</em>. Know the purpose, limitations, and appropriate population for each test.</td></tr>' +
                '<tr><td><strong>9.03</strong></td><td>Informed Consent</td><td>Obtain informed consent using understandable language, except when testing is mandated by law/governmental regulation, implied as routine institutional activity with voluntary participation, or used to evaluate decisional capacity. When testing is mandated, inform the person about the nature and purpose using understandable language.</td></tr>' +
                '<tr><td><strong>9.04</strong></td><td>Release of Test Data</td><td>Pursuant to a client/patient release, provide test data to the client/patient or identified persons. Psychologists may refrain to protect against substantial harm or misuse/misrepresentation; absent a release, provide data as required by law or court order.</td></tr>' +
                '<tr><td><strong>9.06</strong></td><td>Interpreting Results</td><td>Consider the <em>purpose</em> of the assessment, test factors, and <em>situational, personal, or linguistic differences</em> that might affect results.</td></tr>' +
                '<tr><td><strong>9.08</strong></td><td>Obsolete Tests</td><td>Do NOT base decisions on <em>obsolete tests or outdated results</em> unless the purpose of the assessment requires it.</td></tr>' +
                '<tr><td><strong>9.09</strong></td><td>Test Scoring & Interpretation</td><td>When using automated or computer-generated scoring, the psychologist retains responsibility for appropriate application.</td></tr>' +
                '<tr><td><strong>9.10</strong></td><td>Explaining Results</td><td>Take reasonable steps to ensure an explanation is provided unless the nature of the relationship precludes it and that fact was clearly explained in advance.</td></tr>' +
                '<tr><td><strong>9.11</strong></td><td>Maintaining Test Security</td><td>Make reasonable efforts to maintain integrity and security of test materials and assessment techniques consistent with law and contractual obligations.</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Standard 9.10 is critical: the explanation duty is qualified. When the relationship itself precludes providing results to the examinee, explain that limitation in advance; otherwise take reasonable steps to ensure an appropriate explanation is provided.</p>',
            keyTerms: ['Standard 9', 'Assessment ethics', 'Informed consent for assessment', 'Obsolete tests', 'Feedback requirement']
        },
        {
            heading: 'Test Data vs. Test Materials (9.04 vs. 9.11)',
            content: '<p>This is one of the <strong>most commonly tested distinctions</strong> on the entire EPPP:</p>' +
                '<table>' +
                '<tr><th>Category</th><th>Definition</th><th>Examples</th><th>Release Rules</th></tr>' +
                '<tr><td><strong>Test Data</strong> (9.04)</td><td>Raw and scaled scores, client responses, and psychologist\u2019s notes/recordings <em>related to the client\u2019s performance</em></td><td>MMPI profile scores, IQ score, client\u2019s specific answer choices, behavioral observations during testing</td><td>Provide pursuant to a client/patient release to the identified recipient, subject to the limited substantial-harm or misuse/misrepresentation exception; also follow law and court orders</td></tr>' +
                '<tr><td><strong>Test Materials</strong> (9.11)</td><td>The <em>test itself</em> \u2014 items, manuals, protocols, scoring keys</td><td>Actual MMPI items, Rorschach cards, WAIS administration manual, scoring templates</td><td>Use reasonable security measures consistent with law and contractual obligations; test security does not create an absolute rule overriding every legal requirement</td></tr>' +
                '</table>' +
                '<p><strong>The tricky overlap:</strong> Some materials contain BOTH test data and test materials on the same form (e.g., a Rorschach protocol sheet with test items printed on it and the client\u2019s responses written in). In such cases, the psychologist must balance the test-data pathway (9.04) with security duties (9.11), applicable law, client authorization, court process, and contractual restrictions.</p>' +
                '<p><strong>EPPP Tip:</strong> If a question asks whether you should release a client\u2019s <em>test scores</em> upon valid authorization, apply the release, recipient, harm/misuse, and legal conditions in 9.04. For actual test items and manuals, protect security under 9.11 while following law and contracts. When data and materials overlap, consider separation or redaction and obtain legal or publisher guidance as appropriate.</p>',
            keyTerms: ['Test data', 'Test materials', 'Test security', 'Standard 9.04', 'Standard 9.11', 'Copyright'],
            interactiveDiagram: {
                title: "Apply Standards 9.04 and 9.11 Without a Release-or-Refuse Shortcut",
                description: "First classify requested content as test data, test materials, or overlapping content. Then identify the legal authority and recipient. Apply APA Standard 9.04 to data and Standard 9.11’s reasonable security duty to materials, together with applicable law and contracts. For overlap, consider separation, redaction, secure transmission, legal or publisher consultation, and a documented response limited to the authorized or required scope. Neither category produces an automatic release or refusal.",
                svg: "<svg viewBox=\"0 0 900 430\" width=\"100%\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-labelledby=\"ch10RecordsTitle ch10RecordsDesc\"><title id=\"ch10RecordsTitle\">Conditional pathway for test data and test materials</title><desc id=\"ch10RecordsDesc\">A five-step pathway classifies test data, test materials, or overlap; identifies authority and recipient; applies Standards 9.04 and 9.11 with law and contracts; selects safeguards or consultation; and limits and documents the response. It rejects automatic release and automatic refusal.</desc><defs><marker id=\"ch10RecordsArrow\" viewBox=\"0 0 10 10\" refX=\"9\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto\"><path d=\"M0 0L10 5L0 10Z\" fill=\"#94a3b8\"/></marker></defs><text x=\"450\" y=\"27\" text-anchor=\"middle\" fill=\"#cbd5e1\" font-weight=\"bold\" font-size=\"17\">Standards 9.04 + 9.11: a conditional analysis</text><g font-family=\"system-ui\"><g transform=\"translate(30 55)\"><rect width=\"160\" height=\"140\" rx=\"13\" fill=\"#78350f\" stroke=\"#f59e0b\" stroke-width=\"2\"/><text x=\"80\" y=\"29\" text-anchor=\"middle\" fill=\"#fde68a\" font-weight=\"bold\" font-size=\"16\">1. CLASSIFY</text><text x=\"80\" y=\"61\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Scores &amp; responses?</text><text x=\"80\" y=\"85\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Items &amp; manuals?</text><text x=\"80\" y=\"109\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Overlap?</text></g><path d=\"M190 125H215\" stroke=\"#94a3b8\" stroke-width=\"3\" marker-end=\"url(#ch10RecordsArrow)\"/><g transform=\"translate(220 55)\"><rect width=\"160\" height=\"140\" rx=\"13\" fill=\"#1e3a8a\" stroke=\"#60a5fa\" stroke-width=\"2\"/><text x=\"80\" y=\"29\" text-anchor=\"middle\" fill=\"#bfdbfe\" font-weight=\"bold\" font-size=\"16\">2. AUTHORITY</text><text x=\"80\" y=\"61\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Release + recipient?</text><text x=\"80\" y=\"85\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Law or court order?</text><text x=\"80\" y=\"109\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Other valid route?</text></g><path d=\"M380 125H405\" stroke=\"#94a3b8\" stroke-width=\"3\" marker-end=\"url(#ch10RecordsArrow)\"/><g transform=\"translate(410 55)\"><rect width=\"180\" height=\"140\" rx=\"13\" fill=\"#312e81\" stroke=\"#818cf8\" stroke-width=\"2\"/><text x=\"90\" y=\"29\" text-anchor=\"middle\" fill=\"#c7d2fe\" font-weight=\"bold\" font-size=\"16\">3. APPLY RULES</text><text x=\"90\" y=\"61\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">9.04: data pathway</text><text x=\"90\" y=\"85\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">9.11: reasonable security</text><text x=\"90\" y=\"109\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Law + contracts</text></g><path d=\"M590 125H615\" stroke=\"#94a3b8\" stroke-width=\"3\" marker-end=\"url(#ch10RecordsArrow)\"/><g transform=\"translate(620 55)\"><rect width=\"250\" height=\"140\" rx=\"13\" fill=\"#064e3b\" stroke=\"#34d399\" stroke-width=\"2\"/><text x=\"125\" y=\"29\" text-anchor=\"middle\" fill=\"#a7f3d0\" font-weight=\"bold\" font-size=\"16\">4. SAFEGUARD / CONSULT</text><text x=\"125\" y=\"61\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Separate or redact overlap</text><text x=\"125\" y=\"85\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Use secure, appropriate delivery</text><text x=\"125\" y=\"109\" text-anchor=\"middle\" fill=\"#fff\" font-size=\"12\">Seek legal / publisher guidance</text></g></g><rect x=\"100\" y=\"235\" width=\"700\" height=\"92\" rx=\"14\" fill=\"#0f172a\" stroke=\"#22d3ee\" stroke-width=\"2\"/><text x=\"450\" y=\"267\" text-anchor=\"middle\" fill=\"#cffafe\" font-weight=\"bold\" font-size=\"16\">5. LIMIT + DOCUMENT THE RESPONSE</text><text x=\"450\" y=\"294\" text-anchor=\"middle\" fill=\"#e2e8f0\" font-size=\"13\">Disclose, withhold, separate, or protect only as the authorized route and governing duties support.</text><rect x=\"145\" y=\"355\" width=\"610\" height=\"45\" rx=\"10\" fill=\"#422006\" stroke=\"#f59e0b\"/><text x=\"450\" y=\"382\" text-anchor=\"middle\" fill=\"#fde68a\" font-weight=\"bold\" font-size=\"13\">No automatic “release all” • No automatic “never release”</text></svg>"
            },
            knowledgeCheck: {
                question: 'A client signs a release directing the psychologist to send the client\u2019s raw scores and response data to a named qualified psychologist, and separately asks for a blank test manual and item booklet. What is the best response under Standards 9.04 and 9.11?',
                options: [
                    'Send everything because a signed release overrides test-security duties.',
                    'Refuse both requests because all assessment information is protected test material.',
                    'Apply the 9.04 release pathway to the requested test data and recipient, while protecting the blank manual and item booklet under 9.11 consistent with law and contractual obligations.',
                    'Send only a narrative interpretation because raw scores can never be test data.'
                ],
                answer: 2,
                rationale: 'Standard 9.04 defines and governs release of test data, including raw/scaled scores and responses, pursuant to a client/patient release and its limited exceptions. Standard 9.11 calls for reasonable protection of test materials consistent with law and contracts. The analysis is conditional, not an absolute release-versus-refuse slogan.'
            }
        },
        {
            heading: 'Standards for Educational and Psychological Testing (2014)',
            content: '<p>The <em>Standards</em> (jointly published by AERA, APA, and NCME) is a jointly developed professional consensus document addressing test development, evaluation, and use. It informs good practice but does not itself replace applicable law, regulation, ethics rules, contracts, or purpose-specific evidence.</p>' +
                '<p><strong>Key areas covered:</strong></p>' +
                '<ul>' +
                '<li><strong>Validity</strong>: The central concept. The <em>Standards</em> emphasize that validity is a property of <em>test score interpretations and uses</em>, not of the test itself. Multiple sources of evidence are needed.</li>' +
                '<li><strong>Reliability/Precision</strong>: Tests must demonstrate adequate reliability for their intended use. The 2014 edition emphasizes <em>conditional standard errors of measurement</em> (SEM varies across the score range).</li>' +
                '<li><strong>Fairness</strong>: The 2014 edition significantly expanded the fairness chapter. Fairness is now treated as a <strong>foundational rather than supplementary</strong> consideration. Tests must minimize construct-irrelevant variance related to group membership.</li>' +
                '<li><strong>Test Administration and Scoring</strong>: Standardized conditions, qualified examiners, appropriate accommodations</li>' +
                '<li><strong>Test User Responsibilities (Chapter 9)</strong>: Users must understand validity evidence, protect test security, and protect examinee privacy</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The <em>Standards</em> define validity as a <em>unitary concept</em> supported by multiple sources of evidence (content, response processes, internal structure, relations with other variables, consequences). This is different from older textbooks that describe "types of validity" as separate entities. Know the modern, integrative view.</p>',
            keyTerms: ['Standards for Testing', 'AERA', 'APA', 'NCME', 'Validity as unitary', 'Fairness', 'Construct-irrelevant variance']
        },
        {
            heading: 'Assessment with Diverse Populations',
            content: '<p>Standard 9.06 requires psychologists to consider <strong>individual differences</strong> that might affect test interpretation. This includes:</p>' +
                '<ul>' +
                '<li><strong>Language</strong>: Evidence supporting a test use may not generalize across languages or language-proficiency levels; evaluate construct relevance, translation/adaptation, norms, administration, and interpretation for the individual and purpose. Use of interpreters introduces additional confounds.</li>' +
                '<li><strong>Culture</strong>: Cultural factors can affect item interpretation, response style, and test-taking behavior. Some items may be culturally biased.</li>' +
                '<li><strong>Disability</strong>: Accommodations may be needed (extended time, large print, sign language interpretation). Accommodations must not fundamentally alter the construct being measured.</li>' +
                '<li><strong>Age</strong>: Use age-appropriate norms. Age, cohort, health, sensory, educational, and normative differences may limit an interpretation; do not declare validity or invalidity from age alone.</li>' +
                '</ul>' +
                '<p><strong>Key concepts:</strong></p>' +
                '<table>' +
                '<tr><th>Concept</th><th>Definition</th></tr>' +
                '<tr><td><strong>Test bias</strong></td><td>Systematic error in measurement that differentially affects members of different groups</td></tr>' +
                '<tr><td><strong>Differential Item Functioning (DIF)</strong></td><td>A statistical method for detecting items that function differently for different groups after controlling for ability level</td></tr>' +
                '<tr><td><strong>Construct-irrelevant variance</strong></td><td>Variance in scores attributable to factors other than the intended construct (e.g., English proficiency affecting a math test)</td></tr>' +
                '<tr><td><strong>Construct underrepresentation</strong></td><td>A test that fails to adequately sample the full breadth of the construct it claims to measure</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> If a question describes a psychologist administering an English-language IQ test to a non-native English speaker and drawing conclusions about intellectual disability, language demands may introduce construct-irrelevant variance. Gather language and educational history, use appropriate measures and accommodations, and qualify conclusions rather than diagnosing from a confounded score.</p>',
            keyTerms: ['Test bias', 'DIF', 'Construct-irrelevant variance', 'Construct underrepresentation', 'Cultural bias', 'Accommodations'],
            expandableCase: {
                title: 'The "Deficient" Math Score',
                clinicalDescription: 'A 10-year-old recent immigrant from Mexico, whose primary language is Spanish and who is currently learning English, is administered a lengthy word-problem-based math test written in English by the school psychologist. He scores in the 5th percentile, and the psychologist diagnoses him with a Specific Learning Disorder with impairment in mathematics.',
                diagnosis: 'Construct-Irrelevant Language Variance and Insufficient Evaluation',
                explanation: 'The score cannot by itself distinguish mathematical difficulty from English-language and reading demands. Those demands may add construct-irrelevant variance, but the evaluator still needs language-accessible, culturally and educationally responsive assessment plus converging data before deciding whether a learning disorder is present. The categorical diagnosis from this single confounded measure is unsupported.'
            }
        },
        {
            heading: 'Computer-Based and Automated Assessment',
            content: '<p>Technology has transformed assessment, but ethical responsibilities remain with the psychologist:</p>' +
                '<ul>' +
                '<li><strong>Computer-Adaptive Testing (CAT)</strong>: Items are selected based on the examinee\u2019s previous responses. CAT selects items dynamically; validity, item exposure, accessibility, comparability, and security must be evaluated for the intended use.</li>' +
                '<li><strong>Automated scoring and interpretation</strong>: Psychologists who offer assessment or scoring services remain responsible for appropriate application, interpretation, and use, whether they score themselves or use automated or other services (9.09).</li>' +
                '<li><strong>Online assessment</strong>: Raises concerns about test security (may reduce control or observability of the testing environment), identity verification, and standardization of conditions.</li>' +
                '<li><strong>AI-generated assessment reports</strong>: An emerging concern. The psychologist must review and customize any AI-generated narrative \u2014 they need evidence appropriate to the use, privacy/security safeguards, transparent communication, critical human review, and documented limits before relying on or communicating generated conclusions.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The key principle for technology in assessment: <strong>the psychologist, not the software, bears responsibility</strong> for the validity and appropriateness of assessment conclusions. Automated scoring is a tool, not a substitute for clinical judgment.</p>',
            keyTerms: ['Computer-based testing', 'CAT', 'Automated interpretation', 'Standard 9.09', 'Online assessment']
        }
    ],
    aiCoda: {
        teaser: 'A contemporary extension: evaluating AI-assisted assessment as an assessment method',
        content: '<p><strong>Reflective extension grounded in current assessment principles:</strong> An AI-generated score, classification, or narrative is not self-validating. The psychologist must identify the construct and intended use, examine reliability and validity evidence for the relevant population and setting, evaluate fairness and accessibility, and understand how model updates or data drift may change performance.</p>' +
            '<p>Assessment responsibility also includes informed consent and transparency, privacy and data governance, test security, identity and administration conditions, human review, and a process for correcting errors. An appealing narrative cannot substitute for sufficient data or evidence supporting the interpretation.</p>' +
            '<p>APA\u2019s current AI guidance emphasizes critical evaluation, bias mitigation, transparency, and human oversight. The 2014 Testing Standards remain the current edition while a revision is underway; neither source makes every AI tool suitable for psychological assessment.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> (1) Test data and test materials have different definitions and conditional duties\u2014avoid absolute release/refuse rules. (2) Standard 9.10\u2019s explanation duty has a relationship-based advance-notice exception. (3) Standard 9.08 bars decisions based on obsolete tests or outdated results. (4) Validity concerns interpretations and uses supported by evidence. (5) Automated output requires competent human evaluation.'
    },
    references: [
        'American Educational Research Association, American Psychological Association, & National Council on Measurement in Education. (2014). <em>Standards for educational and psychological testing</em>. AERA.',
        'American Psychological Association. (2017). <em>Ethical principles of psychologists and code of conduct</em>. APA.',
        'Camara, W. J., Nathan, J. S., & Puente, A. E. (2000). Psychological test usage: Implications in professional psychology. <em>Professional Psychology: Research and Practice, 31</em>(2), 141\u2013154.',
        'Geisinger, K. F. (2013). <em>APA handbook of testing and assessment in psychology</em> (Vols. 1\u20133). American Psychological Association.',
        'Turner, S. M., DeMers, S. T., Fox, H. R., & Reed, G. M. (2001). APA\u2019s guidelines for test user qualifications. <em>American Psychologist, 56</em>(12), 1099\u20131113.'
    ]
});
