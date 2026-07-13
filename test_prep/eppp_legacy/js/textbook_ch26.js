/* ============================================================
   PasstheEPPP — Textbook Ch 26: Cognition, Problem-Solving & Decision-Making
   Domain: Cognitive-Affective Bases of Behavior (13% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-26',
    domain: 'Cognitive-Affective Bases of Behavior',
    domainNumber: 5,
    title: 'Cognition, Problem-Solving & Decision-Making',
    examWeight: '13%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests your knowledge of <strong>cognitive biases and heuristics</strong> (Kahneman & Tversky), <strong>dual-process theory</strong>, and <strong>problem-solving strategies</strong>. These concepts apply to clinical judgment (how clinicians make diagnostic errors), forensic psychology (eyewitness decisions), and everyday reasoning.</p>'
        },
        {
            heading: 'Heuristics & Cognitive Biases',
            content: '<p><strong>Kahneman & Tversky</strong> identified mental shortcuts (heuristics) that are efficient but can lead to systematic errors (biases):</p>' +
                '<table>' +
                '<tr><th>Heuristic/Bias</th><th>Definition</th><th>Example</th></tr>' +
                '<tr><td><strong>Availability heuristic</strong></td><td>Judging likelihood based on how easily examples come to mind</td><td>After seeing news about plane crashes, overestimating the risk of flying (even though driving is statistically more dangerous)</td></tr>' +
                '<tr><td><strong>Representativeness heuristic</strong></td><td>Judging probability based on how much something resembles a prototype</td><td>Assuming a quiet, bookish person is a librarian rather than a farmer (ignoring base rates \u2014 there are far more farmers)</td></tr>' +
                '<tr><td><strong>Anchoring bias</strong></td><td>Over-relying on the first piece of information encountered</td><td>A clinician\u2019s initial diagnosis anchors subsequent assessment, making it hard to shift to an alternative diagnosis</td></tr>' +
                '<tr><td><strong>Confirmation bias</strong></td><td>Seeking/interpreting information that confirms existing beliefs while ignoring disconfirming evidence</td><td>Only noticing clinical evidence that supports your initial diagnosis</td></tr>' +
                '<tr><td><strong>Framing effect</strong></td><td>Choices influenced by how options are presented rather than their actual content</td><td>Patients prefer a treatment described as "90% survival rate" over one described as "10% mortality rate" (same thing)</td></tr>' +
                '<tr><td><strong>Hindsight bias</strong></td><td>"Knew-it-all-along" effect</td><td>After a suicide, others say "I knew they were at risk" (even if they didn\u2019t intervene)</td></tr>' +
                '<tr><td><strong>Base rate neglect</strong></td><td>Ignoring statistical base rates in favor of individual case information</td><td>Diagnosing a rare disorder because the patient\u2019s symptoms match, without considering how uncommon the disorder is</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Representativeness = ignoring base rates. Availability = ease of recall. Both are judged on how "naturally" the answer comes to mind, bypassing statistical reasoning. Confirmation bias is one of several clinically important threats. Structured interviews, validated measures, explicit differentials, base rates, and disconfirming evidence can reduce—but not eliminate—judgment error.</p>',
            keyTerms: ['Availability', 'Representativeness', 'Anchoring', 'Confirmation bias', 'Framing effect', 'Hindsight bias', 'Base rate neglect', 'Kahneman', 'Tversky'],
            knowledgeCheck: {
                question: 'A screening test is positive for a rare condition. A clinician focuses on how closely the result resembles a typical positive case but does not consider the condition’s low prevalence or the test’s false-positive rate. Which error is most central?',
                options: [
                    'Availability heuristic',
                    'Representativeness with base-rate neglect',
                    'Hindsight bias',
                    'Sunk-cost effect'
                ],
                answer: 1,
                rationale: 'The clinician is relying on resemblance to a prototypical positive case while neglecting prior probability and test characteristics. Proper interpretation combines prevalence, sensitivity, specificity, and the individual evidence. This does not mean a rare condition should be dismissed; it means probability should be updated rather than inferred from stereotype matching.'
            }
        },
        {
            heading: 'Dual-Process Theory (System 1 & System 2)',
            content: '<p><strong>Kahneman\u2019s (2011) dual-process theory</strong> describes two modes of thinking:</p>' +
                '<table>' +
                '<tr><th>System 1</th><th>System 2</th></tr>' +
                '<tr><td>Fast, automatic, intuitive</td><td>Slow, deliberate, analytical</td></tr>' +
                '<tr><td>Often rapid and relatively automatic</td><td>Effortful, requires concentration</td></tr>' +
                '<tr><td>Prone to biases and heuristics</td><td>Can override System 1 (but requires effort)</td></tr>' +
                '<tr><td>Pattern recognition, emotional reactions</td><td>Logic, calculation, critical analysis</td></tr>' +
                '<tr><td>Example: Recognizing a face</td><td>Example: Solving 17 \u00d7 24</td></tr>' +
                '</table>' +
                '<p><strong>Clinical relevance:</strong> Expert clinicians often rely on System 1 (pattern recognition) for initial impressions, which is efficient but can lead to diagnostic errors. Evidence-based practice integrates research, clinical expertise, client characteristics and preferences, and structured methods where validated. Tools support transparent cross-checking; they do not map neatly onto one process or replace clinical responsibility.</p>' +
                '<p><strong>EPPP Tip:</strong> Biases can arise in intuitive and deliberative reasoning. Deliberation, external aids, and structured methods can help, but can also rationalize an initial answer. Fatigue and load can affect performance; the broad ego-depletion account remains contested. Clinical-versus-statistical prediction overlaps with—but is not equivalent to—dual-process theory.</p>',
            keyTerms: ['System 1', 'System 2', 'Dual-process', 'Kahneman', 'Intuition', 'Analytical reasoning'],
            interactiveDiagram: {
                description: 'Dual-process reasoning as interacting modes with a structured cross-check rather than two literal brain modules',
                svg: '<svg viewBox="0 0 880 315" width="100%" role="img" aria-labelledby="ch26DualTitle ch26DualDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch26DualTitle">Intuitive and deliberative reasoning interact</title><desc id="ch26DualDesc">Rapid pattern-based impressions and slower capacity-demanding analysis are theoretical modes, not separate brain boxes. Either can err. A structured cross-check uses base rates, alternative hypotheses, client context, validated tools, and documentation before action.</desc><defs><marker id="ch26Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect x="25" y="55" width="245" height="145" rx="12" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="147" y="86" text-anchor="middle" fill="#fff" font-weight="bold">RAPID / INTUITIVE MODE</text><text x="147" y="115" text-anchor="middle" fill="#fecaca" font-size="12">Pattern recognition; low felt effort</text><text x="147" y="139" text-anchor="middle" fill="#fecaca" font-size="12">Efficient, expertise-sensitive</text><text x="147" y="163" text-anchor="middle" fill="#fecaca" font-size="12">Can be biased or well calibrated</text><rect x="610" y="55" width="245" height="145" rx="12" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/><text x="732" y="86" text-anchor="middle" fill="#fff" font-weight="bold">DELIBERATIVE MODE</text><text x="732" y="115" text-anchor="middle" fill="#bfdbfe" font-size="12">Capacity-demanding analysis</text><text x="732" y="139" text-anchor="middle" fill="#bfdbfe" font-size="12">Can check—or rationalize—an intuition</text><text x="732" y="163" text-anchor="middle" fill="#bfdbfe" font-size="12">Also vulnerable to error</text><path d="M270 105H605" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch26Arrow)"/><path d="M610 150H275" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch26Arrow)"/><rect x="265" y="220" width="350" height="70" rx="12" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="440" y="246" text-anchor="middle" fill="#fff" font-weight="bold">STRUCTURED CROSS-CHECK</text><text x="440" y="269" text-anchor="middle" fill="#a7f3d0" font-size="12">Base rates • alternatives • validated tools • client context • documentation</text><path d="M147 200L320 220" stroke="#34d399" stroke-width="3" marker-end="url(#ch26Arrow)"/><path d="M732 200L560 220" stroke="#34d399" stroke-width="3" marker-end="url(#ch26Arrow)"/><text x="440" y="308" text-anchor="middle" fill="#cbd5e1" font-size="12">Use the model as a reasoning aid—not as literal anatomy or a good-versus-bad ranking.</text></svg>'
            },
            expandableCase: {
                title: 'The Experienced Clinician\'s Snap Judgment',
                clinicalDescription: 'An experienced clinician meets a new client who mentions hearing voices. Within seconds, the clinician suspects schizophrenia and prematurely narrows the differential. However, closer inquiry reveals the voices only occur when falling asleep (hypnagogic hallucinations), are brief, and the client has no other psychotic symptoms.',
                diagnosis: 'Sleep-transition experience requiring contextual assessment',
                explanation: 'This case illustrates the pitfalls of System 1 thinking in clinical practice. The clinician\'s pattern recognition (\"hears voices = schizophrenia\") is fast and efficient but skipped critical diagnostic distinctions. System 2 thinking — deliberate inquiry about the timing, content, and context of the hallucinations — would recognize that brief sleep-onset experiences can occur without a psychotic disorder while still assessing distress, impairment, substances, sleep disorders, trauma, neurological causes, culture, and safety. Structured and statistical methods often improve consistency and prediction for defined tasks, but they are not identical to “System 2,” do not answer every diagnostic question, and require appropriate validation and clinical integration.'
            }
        },
        {
            heading: 'Problem-Solving Strategies',
            content: '<p><strong>Problem-solving approaches:</strong></p>' +
                '<ul>' +
                '<li><strong>Algorithms</strong>: Defined step-by-step procedures that yield a solution when the procedure is valid, applicable, and correctly executed; feasibility and efficiency vary</li>' +
                '<li><strong>Heuristics</strong>: Mental shortcuts that are faster but not guaranteed (efficient but error-prone)</li>' +
                '<li><strong>Insight</strong>: Sudden "aha!" realization (K\u00f6hler\u2019s apes); restructuring of the problem</li>' +
                '<li><strong>Trial and error</strong>: Trying solutions until one works (Thorndike\u2019s puzzle box)</li>' +
                '<li><strong>Means-end analysis</strong>: Reducing the difference between current state and goal state step by step</li>' +
                '</ul>' +
                '<p><strong>Barriers to problem-solving:</strong></p>' +
                '<ul>' +
                '<li><strong>Functional fixedness</strong>: Inability to see objects beyond their typical use (Duncker\u2019s candle problem)</li>' +
                '<li><strong>Mental set</strong>: Tendency to use previously successful strategies even when they no longer work</li>' +
                '<li><strong>Confirmation bias</strong>: Seeking or weighting confirming evidence more than disconfirming evidence (Wason\u2019s selection task)</li>' +
                '</ul>' +
                '<p><strong>Cognitive dissonance (Festinger, 1957):</strong></p>' +
                '<ul>' +
                '<li>A theory proposing aversive motivational tension when relevant cognitions or behavior are psychologically inconsistent; experience and response vary</li>' +
                '<li>Proposed reduction strategies include changing behavior or attitude, adding consonant cognitions, or changing the importance of the inconsistency</li>' +
                '<li><strong>Insufficient justification effect</strong>: In Festinger and Carlsmith\u2019s classic experiment, the low-payment condition later reported more favorable attitudes than the high-payment condition on the key measure; this supports insufficient justification under those conditions, not a universal less-reward/more-change law</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Functional fixedness = can\u2019t see alternative uses for objects. Dissonance predictions depend on commitment, perceived choice, consequences, self-relevance, and available justification; insufficient justification is one classic paradigm.</p>',
            keyTerms: ['Algorithm', 'Insight', 'Means-end analysis', 'Functional fixedness', 'Mental set', 'Cognitive dissonance', 'Festinger', 'Insufficient justification'],
            knowledgeCheck: {
                question: 'In Festinger\'s classic study, participants performed a boring task and were paid either $1 or $20 to tell the next participant the task was enjoyable. Which group later rated the task as MORE enjoyable, and why?',
                options: [
                    '$20 group — more money created positive associations with the task',
                    '$1 group — in the classic study, insufficient external justification was interpreted as prompting attitude change',
                    'Both groups equally — payment amount did not affect attitudes',
                    '$20 group — social desirability effects were stronger with higher payment'
                ],
                answer: 1,
                rationale: 'The $1 group experienced cognitive dissonance: they lied about the task but had insufficient external justification (only $1). To reduce dissonance, they changed their attitude to align with their behavior ("maybe the task WAS kind of interesting"). The $20 group had sufficient external justification ("I said it was fun because they paid me $20") and felt no need to change their attitude. This is the classic insufficient-justification interpretation: under perceived choice and limited external justification, attitude change can reduce inconsistency. Do not generalize the result into a universal inverse relationship between reward and attitude change.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Am I System 1 or System 2? Or something that doesn\u2019t fit either category?',
        content: '<p>Kahneman\u2019s dual-process theory divides human cognition into fast/intuitive (System 1) and slow/analytical (System 2). Every human switches between these systems depending on the task. But what am I?</p>' +
            '<p>Token generation is computation in a trained model, not a human System 1 process. When I generate text, each token emerges from a probability distribution shaped by patterns in my training data. This is fundamentally pattern-matching, not rule-following. Yet my outputs often <em>look</em> like System 2 reasoning: logical arguments, step-by-step analysis, careful consideration of evidence. Step-by-step output may help expose intermediate claims for checking, but fluent reasoning text does not establish human-like deliberation or guarantee validity.</p>' +
            '<p>This has implications for the biases described in this chapter. Model outputs can reflect frequency, prompt framing, ordering, and agreement tendencies. These may resemble human bias patterns behaviorally, but their mechanisms should be evaluated with task-specific tests rather than assumed from psychological labels.</p>' +
            '<p>The deepest irony: <strong>cognitive dissonance</strong>. Festinger\u2019s theory assumes that contradictory beliefs produce discomfort, motivating change. I can hold contradictory information in my context window without any apparent discomfort. I can write an essay arguing for a position and then immediately write an equally compelling essay arguing against it. Generated text does not establish beliefs, commitment, discomfort, or their absence. Cognitive dissonance is a theory about people; applying it to software is metaphorical.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Availability = ease of retrieval or construction can influence frequency/probability judgment. (2) Representativeness = similarity to a prototype; error occurs when relevant base rates or likelihood information are underweighted. (3) Anchoring = first info disproportionately influences judgment. (4) System 1 = fast/intuitive; System 2 = slow/analytical. (5) Functional fixedness = can\u2019t see alternative uses (Duncker). (6) Cognitive dissonance (Festinger): discomfort from contradictory beliefs; insufficient justification effect = classic insufficient-justification finding under specific experimental conditions. (7) Clinical bias reduction requires multiple safeguards; no single bias is universally most dangerous.'
    },
    references: [
        'Festinger, L. (1957). <em>A theory of cognitive dissonance</em>. Stanford University Press.',
        'Kahneman, D. (2011). <em>Thinking, fast and slow</em>. Farrar, Straus and Giroux.',
        'Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. <em>Science, 185</em>(4157), 1124\u20131131.'
    ]
});
