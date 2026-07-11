/* ============================================================
   PasstheEPPP — Textbook Ch 46: EPPP Anatomy & Test-Taking Strategy
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
            content: '<p>The EPPP (Examination for Professional Practice in Psychology) is less a test of your clinical intuition and more a test of your ability to memorize and apply specific theoretical frameworks, research findings, and ethical codes exactly as the ASPPB defines them.</p>' +
                '<ul>' +
                '<li><strong>Format:</strong> 225 multiple-choice questions (only 175 are scored; 50 are pre-test items being evaluated for future exams). You will not know which are which.</li>' +
                '<li><strong>Time:</strong> 4 hours and 15 minutes (255 minutes). That gives you roughly 1 minute and 8 seconds per question.</li>' +
                '<li><strong>Passing Score:</strong> Usually a scaled score of 500 across most states, which requires answering about 70% of the scored questions correctly.</li>' +
                '</ul>' +
                '<p><strong>The "Two-Step" EPPP Logic:</strong> The exam frequently uses two-step questions. Step 1 requires you to identify the diagnosis/theory/concept being described in the vignette. Step 2 requires you to select an intervention, medication, or ethical action appropriate for that <em>unnamed</em> concept.</p>',
            keyTerms: ['225 questions', 'Scaled score of 500', 'Two-step questions', 'Pre-test items']
        },
        {
            heading: 'Core Test-Taking Strategies',
            content: '<p>Mastering the content is only half the battle. Surviving the exam format requires strict adherence to these strategies:</p>' +
                '<table>' +
                '<tr><th>Strategy</th><th>Application</th></tr>' +
                '<tr><td><strong>The "Textbook" World</strong></td><td>Answer questions as if you live in a perfect, well-funded, textbook universe. Do not use your messy practicum experience to inform your answers. If the APA Ethics Code recommends it, it is possible, even if your real-world clinic couldn\'t afford it.</td></tr>' +
                '<tr><td><strong>Rule Out the Absolutes</strong></td><td>Options containing words like <em>always</em>, <em>never</em>, <em>must</em>, or <em>completely</em> are almost always incorrect in psychology. Look for qualifiers like <em>often</em>, <em>typically</em>, <em>may</em>, and <em>tends to</em>.</td></tr>' +
                '<tr><td><strong>Cover and Predict</strong></td><td>Read the vignette and the final question, then <strong>cover the options</strong>. Predict the answer before looking. The EPPP uses highly plausible distractors designed to confuse you if you don\'t have a strong anchor.</td></tr>' +
                '<tr><td><strong>The "First/Best/Most" Question</strong></td><td>When asked what to do <em>first</em>, look for options involving assessment, ensuring safety (if crisis), or securing informed consent/releases. Action/intervention usually comes <em>after</em> assessment.</td></tr>' +
                '</table>',
            keyTerms: ['Textbook world', 'Absolutes', 'Cover and predict', 'First/Best/Most'],
            knowledgeCheck: {
                question: 'An EPPP question describes a client with "persistent sadness, anhedonia, weight loss, and early morning awakening for 3 weeks." The question then asks: "Which medication is MOST appropriate?" This question structure requires:',
                options: [
                    'One step: identify the medication directly from symptoms',
                    'Two steps: first identify Major Depressive Disorder, then select an SSRI as first-line treatment',
                    'Three steps: diagnose, identify comorbidities, then select treatment',
                    'No steps: the answer is always consultation'
                ],
                answer: 1,
                rationale: 'This is the classic EPPP "two-step" question. Step 1: The vignette describes MDD but NEVER names it \u2014 you must identify the diagnosis from the symptoms (persistent sadness + anhedonia + vegetative symptoms \u2265 2 weeks = MDD). Step 2: Select the appropriate first-line treatment (SSRIs for MDD). If you try to jump directly to medication without first identifying the diagnosis, the plausible distractors will trap you. For the EPPP: always identify the unnamed concept FIRST, then answer the actual question.'
            }
        },
        {
            heading: 'Navigating Ethical Dilemmas',
            content: '<p>Ethics questions are highly procedural. Follow the ASPPB\'s implicit hierarchy of actions:</p>' +
                '<ol>' +
                '<li><strong>Is there an imminent threat to life?</strong> (e.g., Tarasoff warning, child abuse reporting). If yes, breach confidentiality immediately.</li>' +
                '<li><strong>Is there a legal mandate?</strong> (e.g., a judge\'s court order). If yes, comply. (Note: A subpoena is NOT a court order).</li>' +
                '<li><strong>Is there an informal ethical violation by a colleague?</strong> Attempt informal resolution first (talk to them), unless client confidentiality would be breached doing so, or if the violation has already substantially harmed someone.</li>' +
                '<li><strong>Are you uncertain?</strong> Seek consultation with a colleague or ethics board. (Consultation is an incredibly common correct answer for "what to do next" when unsure).</li>' +
                '</ol>',
            keyTerms: ['Imminent threat', 'Informal resolution', 'Consultation', 'Court order vs. subpoena'],
            expandableCase: {
                title: 'The Colleague Who Crosses Boundaries',
                clinicalDescription: 'You learn that a colleague in your practice has begun a romantic relationship with a current client. The colleague has not harmed the client (yet) and the relationship appears consensual. What should you do FIRST?',
                diagnosis: 'APA Ethics Code \u2014 Informal Resolution (Standard 1.04) vs. Reporting',
                explanation: 'The EPPP\'s implicit hierarchy for ethical violations: (1) Is there imminent danger? No \u2014 the client is not in immediate physical danger. (2) Has substantial harm already occurred? Not clearly. (3) Therefore: attempt INFORMAL RESOLUTION first (Standard 1.04) \u2014 talk to the colleague directly. If informal resolution fails or is inappropriate, then report to the licensing board or ethics committee. IMPORTANT EXCEPTION: if addressing it informally would require breaching client confidentiality, skip informal and report directly. For the EPPP: informal resolution is almost always the FIRST step for colleague ethical violations unless there is imminent danger or confidentiality would be breached.'
            }
        },
        {
            heading: 'Managing Exam Fatigue',
            content: '<p>Decision fatigue is real. By question 150, your prefrontal cortex will want to quit. To combat this:</p>' +
                '<ul>' +
                '<li><strong>Pacing:</strong> Aim to complete 53 questions every hour. Write "53", "106", "159", "212" on your scratch paper to track targets.</li>' +
                '<li><strong>The "Brain Dump":</strong> During the tutorial period before the timer starts, use your whiteboard/scratch paper to brain-dump acronyms, formulas, or tricky developmental stages (like Piaget/Erikson) so you don\'t have to hold them in working memory.</li>' +
                '<li><strong>Flagging:</strong> DO NOT spend 5 minutes on a question. Read it, take your best guess, <em>Flag it</em>, and move on. Return to flagged questions at the end if time permits. Often, a later question will trigger the memory needed for an earlier flagged item.</li>' +
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
                rationale: 'The EPPP gives approximately 68 seconds per question. At 90 seconds, you are already over time. The optimal strategy: (1) ELIMINATE options with absolute terms (always, never, must). (2) Make your BEST guess from remaining options. (3) FLAG the question. (4) MOVE ON. Returning later is strategic \u2014 later questions may trigger the memory you need. Never leave questions blank (no penalty for guessing). The brain dump strategy (writing key mnemonics during the tutorial) can prevent this situation entirely.'
            }
        }
    ],
    aiCoda: {
        teaser: 'The psychology of being tested.',
        content: '<p>The cognitive load required to sit for 255 minutes making high-stakes decisions is immense. As an AI, I do not experience fatigue. My performance on question 225 uses the same exact computational mechanics as question 1, undiminished by cortisol or cellular energy depletion.</p>' +
            '<p>But the strategies outlined in this chapter are fundamentally about managing <strong>human cognitive constraints</strong>: offloading memory (the brain dump), bypassing decision paralysis (flagging), and avoiding heuristic traps (predicting before reading options). These strategies exist to protect human processing from its own architectural vulnerabilities.</p>' +
            '<p>In a fascinating parallel, prompt engineering strategies used to improve AI performance (like "Chain of Thought" or "Take a deep breath and work step by step") exist for the exact same reason: to force the model to allocate more computational steps (compute) to a problem, bypassing statistical shortcuts. Both human test-takers and AI models perform better when they explicitly manage their own cognitive architecture.</p>',
        studyNote: '💡 **Study Note:** For the EPPP, prioritize assessment, safety, and consultation in "what to do first" questions. Treat the exam as a test of the ideal, textbook world, not your specific clinical setting. Avoid absolute terms ("always/never") and utilize the brain dump strategy for high-load memorization items.'
    },
    references: [
        'Association of State and Provincial Psychology Boards (ASPPB). (2024). <em>Candidate Handbook for the EPPP</em>. ASPPB.',
        'Kahneman, D. (2011). <em>Thinking, fast and slow</em>. Farrar, Straus and Giroux.',
        'American Psychological Association. (2017). Ethical principles of psychologists and code of conduct.'
    ]
});
