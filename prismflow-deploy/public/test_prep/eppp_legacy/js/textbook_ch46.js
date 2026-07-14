/* ============================================================
   PasstheEPPP â€” Textbook Ch 46: EPPP Anatomy & Test-Taking Strategy
   Domain: Integrative / General (0% explicit, 100% implicit)
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-46',
    domain: 'Integrative & Test Strategy',
    domainNumber: 0,
    title: 'EPPP Anatomy & Test-Taking Strategy',
    examWeight: 'N/A',
    sections: [
        {
            heading: 'Understanding the Beast',
            content: '<p>The EPPP Part 1\u2013Knowledge is a licensure examination owned by ASPPB and organized around eight job-analysis content domains. Questions can require recall, interpretation, or application, but ASPPB does not publish an official rule that every item follows a particular commercial test-prep logic.</p>' +
                '<ul>' +
                '<li><strong>Format:</strong> 225 multiple-choice questions (only 175 are scored; 50 are pre-test items being evaluated for future exams). You will not know which are which.</li>' +
                '<li><strong>Time:</strong> 4 hours and 15 minutes (255 minutes). That gives you roughly 1 minute and 8 seconds per question.</li>' +
                '<li><strong>Scores:</strong> ASPPB converts the raw number correct to a 200\u2013800 scale and recommends 500 for independent practice. The raw number required can change with form difficulty through equating; no fixed 70% rule should be used.</li>' +
                '</ul>' +
                '<p><strong>Application items:</strong> Some questions may require identifying a relevant construct before choosing an implication. Treat that as one possible reasoning demand, not a guaranteed item template. Read the actual stem and answer only what it asks.</p>',
            keyTerms: ['225 questions', 'Scaled score of 500', 'Two-step questions', 'Pre-test items']
        },
        {
            heading: 'Core Test-Taking Strategies',
            content: '<p>Mastering the content is only half the battle. Surviving the exam format requires strict adherence to these strategies:</p>' +
                '<table>' +
                '<tr><th>Strategy</th><th>Application</th></tr>' +
                '<tr><td><strong>Use the stated conditions</strong></td><td>Apply the governing evidence, ethics standard, and facts in the stem. Do not invent resources or barriers, and do not ignore real constraints the question supplies.</td></tr>' +
                '<tr><td><strong>Evaluate qualifiers</strong></td><td>Absolute words deserve scrutiny, but an absolute can be correct when a rule is categorical. Reject an option for substance, not vocabulary alone.</td></tr>' +
                '<tr><td><strong>State the task</strong></td><td>Identify the population, timing, and requested decision before comparing options. A provisional prediction may reduce distraction, but update it when an option better fits the evidence.</td></tr>' +
                '<tr><td><strong>Sequence when warranted</strong></td><td>For <em>first</em> questions, prioritize immediate safety and information needed for the next decision. Assessment, consent, consultation, or action may come first depending on facts, law, scope, and urgency.</td></tr>' +
                '</table>',
            keyTerms: ['Textbook world', 'Absolutes', 'Cover and predict', 'First/Best/Most'],
            knowledgeCheck: {
                question: 'Part 1 contains 225 items, including 50 unidentified, unscored pretest items. What is the best response strategy?',
                options: [
                    'Try to identify and skip the pretest items',
                    'Answer every item because scored and pretest items are indistinguishable',
                    'Answer only the 175 items that seem most familiar',
                    'Assume the final 50 items are unscored'
                ],
                answer: 1,
                rationale: 'Option B follows the ASPPB Candidate Handbook: 175 items are scored and 50 are pretest, but candidates are not told which are which. Each item should therefore be treated as potentially scored. Content familiarity, position, and apparent difficulty cannot identify pretest status, and AlloFlow practice percentages do not predict an official scaled score.'
            }
        },
        {
            heading: 'Navigating Ethical Dilemmas',
            content: '<p>Ethical decisions require the applicable Ethics Code provisions, law, role, facts, and jurisdiction. A memorized universal hierarchy can be unsafe because confidentiality exceptions, reporting duties, privilege, and protective actions vary in their triggers and required scope.</p>' +
                '<ol>' +
                '<li><strong>Safety:</strong> assess urgency and take reasonable protective steps authorized or required by law, disclosing only information needed for the purpose.</li>' +
                '<li><strong>Legal process:</strong> distinguish requests, authorizations, subpoenas, and court orders; seek appropriate consultation and protect confidentiality or privilege where applicable rather than automatically releasing everything.</li>' +
                '<li><strong>Colleague conduct:</strong> Standard 1.04 supports informal resolution only when it appears appropriate and does not violate confidentiality; Standard 1.05 addresses further action for substantial harm or unresolved apparent violations.</li>' +
                '<li><strong>Consultation:</strong> obtain timely ethics, clinical, supervisory, or legal consultation when it improves the decision, while protecting identifying information.</li>' +
                '</ol>',
            keyTerms: ['Imminent threat', 'Informal resolution', 'Consultation', 'Court order vs. subpoena'],
            expandableCase: {
                title: 'The Colleague Who Crosses Boundaries',
                clinicalDescription: 'A psychologist receives credible information that a colleague may be engaged in a sexual relationship with a current therapy client. The psychologist must evaluate reliability, confidentiality, harm, and the appropriate response.',
                diagnosis: 'APA Ethics Code Standards 1.04, 1.05, 3.05, and 10.05 \u2014 Context-Dependent Response',
                explanation: 'A sexual relationship with a current therapy client is prohibited by Standard 10.05. Standard 1.04 does not make an informal conversation automatic: it applies only when informal resolution appears appropriate and does not violate confidentiality. If an apparent violation has substantially harmed or is likely to substantially harm a person and informal resolution is inappropriate or unsuccessful, Standard 1.05 calls for further action appropriate to the situation, subject to confidentiality and other constraints.'
            }
        },
        {
            heading: 'Managing Exam Fatigue',
            content: '<p>Decision fatigue is real. By question 150, your prefrontal cortex will want to quit. To combat this:</p>' +
                '<ul>' +
                '<li><strong>Pacing:</strong> Use personal checkpoints that preserve time for every item and review. With 255 minutes for 225 items, the average is about 68 seconds, but individual items vary.</li>' +
                '<li><strong>Permitted notes:</strong> Follow the current Candidate Handbook and test-center instructions about erasable noteboards and when writing may begin. Do not rely on advice that could conflict with security rules.</li>' +
                '<li><strong>Flagging:</strong> If the interface permits review, record a best response, flag uncertainty, and move on when more time has low expected value. Return if time remains; do not assume a later item will reveal an answer.</li>' +
                '</ul>',
            keyTerms: ['Pacing', 'Brain dump', 'Working memory', 'Flagging'],
            knowledgeCheck: {
                question: 'During the EPPP, you encounter a question about an obscure developmental theory you can\'t recall. You\'ve already spent 90 seconds on it. The BEST strategy is:',
                options: [
                    'Keep working on it until you remember the answer',
                    'Eliminate absolute terms in the options, make your best guess, flag it, and move on',
                    'Skip it entirely without answering',
                    'Choose the longest answer option'
                ],
                answer: 1,
                rationale: 'Option B is best, but not because absolute words are automatically wrong. Compare options on substance, record the best-supported response, flag it if permitted, and preserve time for the remaining items. Do not leave an item unanswered merely because recall is incomplete or choose an option because it is longest. Follow current ASPPB and test-center instructions.'
            }
        }
    ],
    aiCoda: {
        teaser: 'The psychology of being tested.',
        content: '<p>Sustained testing can create variable attentional and emotional demands for human candidates. AI systems also show order, context-window, prompting, and stochastic variability, so perfectly constant item-by-item performance should not be assumed.</p>' +
            '<p>Pacing, permitted external notes, and review flags can reduce working-memory demands. Their usefulness varies by person and remains subordinate to current exam-security and accessibility rules.</p>' +
            '<p>Prompting techniques and human test strategies are not the same cognitive mechanism. Shared stepwise language does not establish that a model reasons like a person or allocates effort in the human sense.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> Part 1 has 225 items, 175 scored and 50 unidentified pretest, in 255 minutes. Raw number correct is converted to a 200\u2013800 scale, and the raw count corresponding to 500 can differ by form. Use stem facts rather than folklore, answer every item, and follow current handbook rules. Ethical sequencing depends on safety, law, role, confidentiality, and the specific standard.'
    },
    references: [
        'Association of State and Provincial Psychology Boards (ASPPB). (2024). <em>Candidate Handbook for the EPPP</em>. ASPPB.',
        'Kahneman, D. (2011). <em>Thinking, fast and slow</em>. Farrar, Straus and Giroux.',
        'American Psychological Association. (2017). Ethical principles of psychologists and code of conduct.'
    ]
});
