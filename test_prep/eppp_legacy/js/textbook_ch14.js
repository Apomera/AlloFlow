/* ============================================================
   PasstheEPPP — Textbook Ch 14: Cognitive & Behavioral Therapies
   Domain: Treatment, Intervention & Prevention (15% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-14',
    domain: 'Treatment, Intervention & Prevention',
    domainNumber: 3,
    title: 'Cognitive & Behavioral Therapies',
    examWeight: '15%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Cognitive and behavioral therapies are prominent in psychotherapy research and EPPP treatment questions. Learn the core models (Beck, Ellis), contextual or “third-wave” approaches (DBT, ACT), and behavioral procedures such as exposure and contingency management. For vignettes, identify the intervention from its defining procedure and rationale; do not infer that one named treatment is automatically best without the diagnosis, goals, preferences, risks, culture, access, comorbidity, and current evidence.</p>'
        },
        {
            heading: 'Beck\u2019s Cognitive Therapy',
            content: '<p><strong>Aaron Beck</strong> developed cognitive therapy, an important foundation for modern CBT. Cognitive formulations propose reciprocal links among situations, appraisals, emotions, physiology, and behavior. Biased or unhelpful appraisals can maintain distress, but they are not the sole cause of psychological problems, and CBT does not deny biological, interpersonal, cultural, or material influences.</p>' +
                '<p><strong>Key concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Cognitive Triad</strong> (for depression): Negative views of (1) the <em>self</em> ("I\u2019m worthless"), (2) the <em>world</em> ("everything is hostile"), and (3) the <em>future</em> ("nothing will improve")</li>' +
                '<li><strong>Automatic Thoughts</strong>: Spontaneous, rapid cognitions that occur in response to situations. Often distorted and taken as truth without examination.</li>' +
                '<li><strong>Cognitive Distortions</strong>: Systematic errors in thinking:' +
                '<ul>' +
                '<li><em>All-or-nothing thinking</em> (dichotomous)</li>' +
                '<li><em>Catastrophizing</em> (assuming the worst)</li>' +
                '<li><em>Overgeneralization</em> (one event = always)</li>' +
                '<li><em>Mind reading</em> (assuming others\u2019 thoughts)</li>' +
                '<li><em>Emotional reasoning</em> ("I feel it, therefore it\u2019s true")</li>' +
                '<li><em>Magnification/minimization</em></li>' +
                '<li><em>Personalization</em> (blaming self for external events)</li>' +
                '</ul></li>' +
                '<li><strong>Core Beliefs (Schemas)</strong>: Deep, enduring beliefs about self, others, and the world. These are the "roots" from which automatic thoughts grow.</li>' +
                '<li><strong>Guided discovery and Socratic questioning</strong>: Collaborative methods for examining meanings, evidence, alternatives, and consequences—not a cross-examination or a single universal technique.</li>' +
                '<li><strong>Behavioral Experiments</strong>: Testing beliefs by conducting real-world experiments</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> The cognitive triad (self, world, future) is specific to <em>depression</em>. Do not confuse it with the general CBT model, which applies to all disorders. If a question describes a depressed patient who believes "I\u2019m worthless, life is pointless, and things will never get better," that is the cognitive triad.</p>',
            keyTerms: ['Beck', 'Cognitive therapy', 'Cognitive triad', 'Automatic thoughts', 'Cognitive distortions', 'Schemas', 'Socratic questioning'],
            interactiveDiagram: {
                description: 'Beck\'s Cognitive Model of Depression',
                svg: '<svg viewBox="0 0 800 320" width="100%" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="beckSit" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="beckAT" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f87171"/></linearGradient><linearGradient id="beckEm" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient><marker id="beckArr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker></defs><text x="400" y="22" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="15">Beck\'s Cognitive Model</text><rect x="270" y="40" width="260" height="50" rx="12" fill="url(#beckSit)"/><text x="400" y="70" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">SITUATION (Trigger)</text><line x1="400" y1="90" x2="400" y2="115" stroke="#94a3b8" stroke-width="2" marker-end="url(#beckArr)"/><rect x="220" y="115" width="360" height="60" rx="12" fill="url(#beckAT)"/><text x="400" y="140" text-anchor="middle" fill="#fff" font-weight="bold" font-size="14">AUTOMATIC THOUGHTS</text><text x="400" y="158" text-anchor="middle" fill="#fecaca" font-size="11">Rapid, distorted cognitions</text><line x1="300" y1="175" x2="200" y2="205" stroke="#94a3b8" stroke-width="2" marker-end="url(#beckArr)"/><line x1="500" y1="175" x2="600" y2="205" stroke="#94a3b8" stroke-width="2" marker-end="url(#beckArr)"/><rect x="100" y="205" width="200" height="50" rx="10" fill="url(#beckEm)"/><text x="200" y="235" text-anchor="middle" fill="#fff" font-weight="bold" font-size="13">EMOTIONS</text><rect x="500" y="205" width="200" height="50" rx="10" fill="url(#beckEm)"/><text x="600" y="235" text-anchor="middle" fill="#fff" font-weight="bold" font-size="13">BEHAVIORS</text><rect x="220" y="275" width="360" height="35" rx="8" fill="#1e293b" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="6,3"/><text x="400" y="297" text-anchor="middle" fill="#a78bfa" font-weight="bold" font-size="12">CORE BELIEFS / SCHEMAS (Deep roots)</text><line x1="400" y1="275" x2="400" y2="175" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="4,3"/><text x="340" y="230" fill="#8b5cf6" font-size="9" font-style="italic">filter ↑</text></svg>'
            },
        },
        {
            heading: 'Rational Emotive Behavior Therapy (Ellis)',
            content: '<p><strong>Albert Ellis</strong> developed REBT, an action-oriented therapy that focuses on identifying and disputing <strong>irrational beliefs</strong>.</p>' +
                '<p><strong>The ABC(DE) Model:</strong></p>' +
                '<table>' +
                '<tr><th>Letter</th><th>Component</th><th>Example</th></tr>' +
                '<tr><td><strong>A</strong></td><td>Activating Event</td><td>You fail an exam</td></tr>' +
                '<tr><td><strong>B</strong></td><td>Belief (rational or irrational)</td><td>"I MUST succeed at everything I attempt" (irrational)</td></tr>' +
                '<tr><td><strong>C</strong></td><td>Consequence (emotional/behavioral)</td><td>Depression, anxiety, giving up</td></tr>' +
                '<tr><td><strong>D</strong></td><td>Disputation</td><td>Therapist challenges: "Where is the evidence you MUST succeed?"</td></tr>' +
                '<tr><td><strong>E</strong></td><td>Effective new belief</td><td>"I\u2019d prefer to succeed, but failing one exam doesn\u2019t make me a failure"</td></tr>' +
                '</table>' +
                '<p><strong>Irrational beliefs</strong> often contain <strong>"musts," "shoulds," and "absolute demands"</strong>:</p>' +
                '<ul>' +
                '<li><em>Demandingness</em>: "I must\u2026", "Others must\u2026", "The world must\u2026"</li>' +
                '<li><em>Awfulizing</em>: "It would be AWFUL if\u2026"</li>' +
                '<li><em>Low frustration tolerance</em>: "I can\u2019t stand it"</li>' +
                '<li><em>Global rating of self/others</em>: "I\u2019m totally worthless"</li>' +
                '</ul>' +
                '<p><strong>Beck vs. Ellis:</strong></p>' +
                '<table>' +
                '<tr><th>Feature</th><th>Beck (CT)</th><th>Ellis (REBT)</th></tr>' +
                '<tr><td><strong>Therapist style</strong></td><td>Collaborative, Socratic, guided discovery</td><td>Often active, directive, didactic, and disputational while maintaining alliance</td></tr>' +
                '<tr><td><strong>Focus</strong></td><td>Automatic thoughts & schemas</td><td>Irrational beliefs & musts</td></tr>' +
                '<tr><td><strong>Technique</strong></td><td>Socratic questioning</td><td>Direct disputation</td></tr>' +
                '<tr><td><strong>Emotional approach</strong></td><td>Empathic, collaborative empiricism</td><td>Actively challenges; humor; persuasion</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Direct disputation of rigid demands is the clearest REBT cue; collaborative guided discovery is strongly associated with Beckian cognitive therapy. Real practice overlaps, so identify the model from the full pattern rather than one isolated question.</p>',
            keyTerms: ['Ellis', 'REBT', 'ABC model', 'Irrational beliefs', 'Musturbatory thinking', 'Disputation', 'Demandingness'],
            knowledgeCheck: {
                question: 'A therapist says to a client: "You say you MUST get this promotion or you will be a complete failure. Where is the evidence that you MUST? And even if you don\'t get it, does that truly make you a total failure as a human being?" This therapist is most likely practicing:',
                options: [
                    'Beck\'s Cognitive Therapy',
                    'Acceptance and Commitment Therapy (ACT)',
                    'Rational Emotive Behavior Therapy (REBT)',
                    'Person-Centered Therapy'
                ],
                answer: 2,
                rationale: 'The explicit disputation of a rigid “must” and global self-rating is characteristic of Ellis\'s REBT. Beckian therapy also evaluates evidence, so the distinction rests on the vignette\'s REBT language and demandingness formulation—not on an absolute claim that only one approach asks challenging questions.'
            }
        },
        {
            heading: 'Dialectical Behavior Therapy (Linehan)',
            content: '<p><strong>Marsha Linehan</strong> developed DBT initially for people with pervasive emotion dysregulation and recurrent suicidal or self-harming behavior, and it became especially associated with borderline personality disorder (BPD). Standard comprehensive DBT integrates behavioral analysis and change procedures with validation, acceptance, and mindfulness practices.</p>' +
                '<p><strong>The "dialectic":</strong> The core dialectic is between <strong>acceptance</strong> (radical acceptance of what is) and <strong>change</strong> (actively working to modify dysfunctional behavior). The therapist holds both simultaneously.</p>' +
                '<p><strong>Four skill modules:</strong></p>' +
                '<table>' +
                '<tr><th>Module</th><th>Core Skills</th><th>Purpose</th></tr>' +
                '<tr><td><strong>Mindfulness</strong></td><td>Observe, describe, participate; non-judgmentally, one-mindfully, effectively</td><td>Present-moment awareness; foundation for all other skills</td></tr>' +
                '<tr><td><strong>Distress Tolerance</strong></td><td>TIPP (Temperature, Intense exercise, Paced breathing, Paired muscle relaxation), Pros/cons, radical acceptance</td><td>Surviving crises without making them worse</td></tr>' +
                '<tr><td><strong>Emotion Regulation</strong></td><td>ABC PLEASE (Accumulate positives, Build mastery, Cope ahead; Physical illness, balanced Eating, Avoid substances, balanced Sleep, Exercise)</td><td>Understanding and modulating emotional responses</td></tr>' +
                '<tr><td><strong>Interpersonal Effectiveness</strong></td><td>DEAR MAN (Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate), GIVE, FAST</td><td>Asking for what you need while maintaining relationships and self-respect</td></tr>' +
                '</table>' +
                '<p><strong>Treatment structure:</strong> Individual therapy + skills group + phone coaching + therapist consultation team</p>' +
                '<p><strong>Target hierarchy:</strong> (1) Life-threatening behaviors, (2) Therapy-interfering behaviors, (3) Quality-of-life behaviors, (4) Skills acquisition</p>' +
                '<p><strong>EPPP Tip:</strong> DBT is a high-yield treatment association for BPD, particularly recurrent self-harm and severe emotion dysregulation, but “BPD = DBT” is not individualized treatment planning. Know the four skills modules, dialectical acceptance/change stance, behavioral chain analysis, and target hierarchy.</p>',
            keyTerms: ['DBT', 'Linehan', 'BPD', 'Dialectic', 'Mindfulness', 'Distress tolerance', 'Emotion regulation', 'Interpersonal effectiveness', 'DEAR MAN', 'Radical acceptance']
        },
        {
            heading: 'Acceptance and Commitment Therapy (Hayes)',
            content: '<p><strong>Steven Hayes</strong> developed ACT (pronounced as one word, "act"), a "third-wave" behavioral therapy rooted in <strong>Relational Frame Theory (RFT)</strong>.</p>' +
                '<p><strong>Core premise:</strong> Suffering comes not from pain itself but from <strong>psychological inflexibility</strong> \u2014 the rigid dominance of psychological reactions over chosen values and actions.</p>' +
                '<p><strong>The Hexaflex \u2014 Six core processes:</strong></p>' +
                '<table>' +
                '<tr><th>Process</th><th>Definition</th><th>Opposite (Inflexible)</th></tr>' +
                '<tr><td><strong>Acceptance</strong></td><td>Actively embracing private events (thoughts, feelings) without trying to change them</td><td>Experiential avoidance</td></tr>' +
                '<tr><td><strong>Cognitive Defusion</strong></td><td>Stepping back from thoughts; seeing them as <em>mental events</em>, not literal truths</td><td>Cognitive fusion ("I am my thoughts")</td></tr>' +
                '<tr><td><strong>Present Moment</strong></td><td>Contacting the here-and-now flexibly</td><td>Dominance of past/future</td></tr>' +
                '<tr><td><strong>Self as Context</strong></td><td>A transcendent sense of self that observes but is not defined by experiences</td><td>Attachment to conceptualized self</td></tr>' +
                '<tr><td><strong>Values</strong></td><td>Chosen life directions that provide meaning</td><td>Lack of clear values</td></tr>' +
                '<tr><td><strong>Committed Action</strong></td><td>Taking effective action guided by values</td><td>Inaction, impulsivity, avoidant persistence</td></tr>' +
                '</table>' +
                '<p><strong>ACT vs. traditional CBT:</strong></p>' +
                '<ul>' +
                '<li>Traditional cognitive therapy often evaluates and modifies appraisals, while also using behavioral and experiential methods.</li>' +
                '<li>ACT emphasizes changing the function of and relationship to private events through acceptance, defusion, values, and committed action. This is a difference in emphasis, not a claim that the approaches never overlap.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> If a question mentions "cognitive defusion," "psychological flexibility," or "values-based action," the answer is ACT. If it mentions "challenging irrational beliefs" or "Socratic questioning," it\u2019s traditional CBT.</p>',
            keyTerms: ['ACT', 'Hayes', 'Psychological flexibility', 'Cognitive defusion', 'Experiential avoidance', 'Hexaflex', 'Values', 'Committed action']
        },
        {
            heading: 'Behavioral Techniques: Exposure Therapies',
            content: '<p>Exposure-based interventions draw on conditioning, emotional-processing, and inhibitory-learning accounts. They involve planned contact with feared but sufficiently safe cues while reducing avoidance or safety behavior so new learning can occur. Exposure is a component of several evidence-based protocols, but “the treatment of choice for all anxiety disorders” is too broad.</p>' +
                '<table>' +
                '<tr><th>Technique</th><th>Developer</th><th>Mechanism</th><th>Procedure</th><th>Best For</th></tr>' +
                '<tr><td><strong>Systematic Desensitization</strong></td><td>Joseph Wolpe</td><td><strong>Reciprocal inhibition</strong> (relaxation is incompatible with anxiety)</td><td>Create fear hierarchy \u2192 learn relaxation \u2192 pair relaxation with graduated exposure (imaginal or in vivo)</td><td>Phobias</td></tr>' +
                '<tr><td><strong>Flooding</strong></td><td>Historical behavioral tradition; implosive therapy is associated with Stampfl</td><td>Extinction or inhibitory learning through high-intensity exposure without the predicted catastrophe</td><td>Begins near the high end rather than proceeding gradually; requires rationale, consent, safety, and clinical judgment</td><td>Historical exam contrast with graded exposure; not synonymous with modern PE for PTSD</td></tr>' +
                '<tr><td><strong>Exposure and Response Prevention (ERP)</strong></td><td>Victor Meyer; later developed and studied by many teams</td><td>New learning occurs when obsessional cues are encountered without rituals or avoidance; distress reduction may occur but is not required within every exercise</td><td>Collaboratively expose to triggers while refraining from compulsions and other neutralizing responses</td><td><strong>OCD</strong>; recommended CBT component</td></tr>' +
                '<tr><td><strong>Prolonged Exposure (PE)</strong></td><td>Edna Foa and colleagues</td><td>Emotional processing and corrective learning about trauma memories, reminders, distress, and coping</td><td>Imaginal exposure plus in-vivo exposure to objectively safe or low-risk trauma reminders, with psychoeducation and processing</td><td><strong>PTSD</strong>; one strongly recommended trauma-focused option</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Systematic desensitization classically combines a hierarchy with relaxation; flooding starts at high intensity; ERP prevents compulsions during exposure to OCD triggers; PE is a specific multi-component PTSD protocol. Contemporary exposure does not require anxiety to fall during every exercise: expectancy violation, reduced avoidance, distress tolerance, and retrieval of safer learning may matter.</p>',
            keyTerms: ['Exposure therapy', 'Systematic desensitization', 'Wolpe', 'Reciprocal inhibition', 'Flooding', 'ERP', 'OCD', 'Prolonged Exposure', 'PTSD', 'Fear hierarchy'],
            expandableCase: {
                title: 'The Handwashing Ritual',
                clinicalDescription: 'A 28-year-old nurse washes her hands up to 80 times per day due to intense fear of contamination. She knows the washing is excessive but says she "can\'t stop" because the anxiety is unbearable if she doesn\'t wash. Her hands are raw and cracked. She avoids touching doorknobs, elevator buttons, and her own cell phone.',
                diagnosis: 'OCD presentation—consider CBT that includes ERP after assessment and shared planning',
                explanation: 'ERP would collaboratively test feared predictions by approaching appropriately selected contamination cues and refraining from washing, reassurance, or other neutralizing rituals. The goal is new learning and greater freedom of action—not forcing contact with genuinely hazardous material or requiring anxiety to decline on schedule. Treatment choice and pacing also consider severity, medical needs, preferences, comorbidity, access, and medication options. Relaxation is not categorically forbidden, but using it as a safety behavior to guarantee anxiety reduction can undermine the learning target.'
            },
            interactiveDiagram: {
                description: 'Exposure learning cycle: prediction, safe approach, response prevention, and new learning',
                svg: '<svg viewBox="0 0 860 300" width="100%" role="img" aria-labelledby="ch14ExposureTitle ch14ExposureDesc" xmlns="http://www.w3.org/2000/svg"><title id="ch14ExposureTitle">Exposure learning cycle</title><desc id="ch14ExposureDesc">A feared prediction leads to a planned safe approach. Avoidance, rituals, and safety behaviors are reduced. The learner compares predicted and observed outcomes and practices retrieving new learning across contexts.</desc><defs><marker id="ch14Arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#94a3b8"/></marker></defs><rect x="25" y="70" width="170" height="90" rx="14" fill="#451a03" stroke="#fb923c" stroke-width="2"/><text x="110" y="99" text-anchor="middle" fill="#fed7aa" font-weight="bold">1. PREDICT</text><text x="110" y="124" text-anchor="middle" fill="#fff" font-size="12">What is feared?</text><text x="110" y="143" text-anchor="middle" fill="#fff" font-size="12">What would it mean?</text><path d="M200 115H240" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch14Arrow)"/><rect x="245" y="70" width="170" height="90" rx="14" fill="#172554" stroke="#60a5fa" stroke-width="2"/><text x="330" y="99" text-anchor="middle" fill="#bfdbfe" font-weight="bold">2. APPROACH</text><text x="330" y="124" text-anchor="middle" fill="#fff" font-size="12">Planned, consent-based,</text><text x="330" y="143" text-anchor="middle" fill="#fff" font-size="12">and sufficiently safe</text><path d="M420 115H460" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch14Arrow)"/><rect x="465" y="55" width="175" height="120" rx="14" fill="#4c1d95" stroke="#c084fc" stroke-width="2"/><text x="552" y="84" text-anchor="middle" fill="#e9d5ff" font-weight="bold">3. DROP THE LOOP</text><text x="552" y="109" text-anchor="middle" fill="#fff" font-size="12">Reduce avoidance, ritual,</text><text x="552" y="128" text-anchor="middle" fill="#fff" font-size="12">reassurance, or safety</text><text x="552" y="147" text-anchor="middle" fill="#fff" font-size="12">behavior as appropriate</text><path d="M645 115H685" stroke="#94a3b8" stroke-width="3" marker-end="url(#ch14Arrow)"/><rect x="690" y="55" width="145" height="120" rx="14" fill="#064e3b" stroke="#34d399" stroke-width="2"/><text x="762" y="84" text-anchor="middle" fill="#a7f3d0" font-weight="bold">4. LEARN</text><text x="762" y="108" text-anchor="middle" fill="#fff" font-size="12">Compare outcomes</text><text x="762" y="127" text-anchor="middle" fill="#fff" font-size="12">Tolerate distress</text><text x="762" y="146" text-anchor="middle" fill="#fff" font-size="12">Retrieve across contexts</text><path d="M762 180C762 245 110 245 110 170" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#ch14Arrow)"/><text x="430" y="232" text-anchor="middle" fill="#cbd5e1" font-size="12">Repeat with variation; anxiety reduction can occur, but it is not the only learning signal.</text></svg>'
            },
            knowledgeCheck: {
                question: 'During a planned ERP exercise, a client’s anxiety remains elevated, but the feared catastrophe does not occur and the client refrains from the ritual. What is the best interpretation?',
                options: ['The exercise failed because anxiety must decline before it ends.', 'The exercise may still support corrective or inhibitory learning; review the prediction, observed outcome, ritual prevention, and what to practice next.', 'The therapist should add reassurance until anxiety reaches zero.', 'ERP should be replaced automatically with flooding.'],
                answer: 1,
                rationale: 'Within-session habituation can occur, but it is not the sole marker of successful exposure. Prediction testing, expectancy violation, reduced ritualizing or avoidance, distress tolerance, and later retrieval of new learning are also important.'
            }
        },
        {
            heading: 'Behavioral Techniques: Operant Approaches',
            content: '<p>Operant-based interventions use <strong>consequences</strong> to modify behavior. They are grounded in Skinner\u2019s principles.</p>' +
                '<table>' +
                '<tr><th>Technique</th><th>Description</th><th>Application</th></tr>' +
                '<tr><td><strong>Behavioral Activation (BA)</strong></td><td>Functional assessment and planned engagement with reinforcing or valued activities while reducing avoidance</td><td><strong>Depression</strong>. An evidence-based treatment; comparative findings depend on population, protocol, comparator, and follow-up.</td></tr>' +
                '<tr><td><strong>Contingency Management (CM)</strong></td><td>Delivering clearly specified reinforcers contingent on objectively verified target behavior</td><td><strong>Substance use</strong>, including strong evidence for stimulant-use outcomes; implementation includes ethical, equity, and sustainability considerations.</td></tr>' +
                '<tr><td><strong>Token Economy</strong></td><td>Systematic reinforcement using tokens exchangeable for backup reinforcers</td><td>Inpatient psychiatric units, schools, group homes</td></tr>' +
                '<tr><td><strong>Differential Reinforcement (DR)</strong></td><td>Reinforcing specific classes of behavior: DRA (alternative), DRO (other), DRI (incompatible), DRL (low rates)</td><td>Behavioral interventions with children, developmental disabilities, ABA</td></tr>' +
                '<tr><td><strong>Extinction</strong></td><td>Discontinuing the reinforcer that previously maintained a response, after functional assessment</td><td>Behavior may persist, vary, or temporarily intensify; an “extinction burst” is possible, not guaranteed. Safety and reinforcement of appropriate alternatives matter.</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> BA examines links among mood, context, avoidance, and access to reinforcement, then plans and reviews activities—not merely “do pleasant things.” In operant extinction, a temporary burst can occur, but never assume it must; identify the maintaining consequence and reinforce a safer alternative.</p>',
            keyTerms: ['Behavioral Activation', 'Contingency Management', 'Token economy', 'Differential reinforcement', 'Extinction', 'Extinction burst', 'DRA', 'DRO']
        }
    ],
    aiCoda: {
        teaser: 'How can AI support cognitive and behavioral learning without pretending to provide therapy?',
        content: '<p>AI can help a learner label a model, compare intervention rationales, generate low-stakes practice vignettes, or turn a therapist manual into a study table. It does not thereby have automatic thoughts, experiential avoidance, emotion dysregulation, fear extinction, values, or a therapeutic relationship; token generation is not a clinical mental process.</p>' +
            '<p>For cognitive exercises, AI can propose alternative appraisals, but its output may be inaccurate, invalidating, culturally narrow, or too quick to dispute a realistic concern. For exposure or contingency plans, those limits become safety-critical: a model cannot establish objective safety, conduct a functional assessment, monitor risk, obtain meaningful consent, or replace a qualified clinician.</p>' +
            '<p>Use an <strong>identify–verify–apply</strong> loop: identify the named model and its defining procedure; verify claims against current guidance and the person\'s context; apply only within appropriate competence, consent, monitoring, and accountability. In a learner tool, AI-generated material should remain clearly labeled and should never be presented as individualized treatment advice.</p>',
        studyNote: '💡 <strong>Study Note:</strong> (1) Beck: reciprocal cognitive-behavioral formulation; triad = self, world, future in depression. (2) Ellis: ABC(DE), rigid demands, disputation. (3) DBT: acceptance plus change, four skills modules, behavioral targets. (4) ACT: psychological flexibility, defusion, values, committed action. (5) Systematic desensitization = hierarchy plus relaxation; flooding = high-intensity exposure. (6) ERP = exposure plus prevention of rituals for OCD; anxiety need not fall during every exercise. (7) BA uses functional analysis and planned engagement for depression.'
},
    references: [
        'Beck, A. T. (1976). <em>Cognitive therapy and the emotional disorders</em>. International Universities Press.',
        'Beck, J. S. (2020). <em>Cognitive behavior therapy: Basics and beyond</em> (3rd ed.). Guilford Press.',
        'Dimidjian, S., Hollon, S. D., Dobson, K. S., Schmaling, K. B., Kohlenberg, R. J., Addis, M. E., ... & Jacobson, N. S. (2006). Randomized trial of behavioral activation, cognitive therapy, and antidepressant medication in the acute treatment of adults with major depression. <em>Journal of Consulting and Clinical Psychology, 74</em>(4), 658\u2013670.',
        'Ellis, A. (2001). <em>Overcoming destructive beliefs, feelings, and behaviors</em>. Prometheus Books.',
        'Foa, E. B., Yadin, E., & Lichner, T. K. (2012). <em>Exposure and response (ritual) prevention for obsessive-compulsive disorder: Therapist guide</em> (2nd ed.). Oxford University Press.',
        'Hayes, S. C., Strosahl, K. D., & Wilson, K. G. (2012). <em>Acceptance and commitment therapy: The process and practice of mindful change</em> (2nd ed.). Guilford Press.',
        'Linehan, M. M. (2015). <em>DBT skills training manual</em> (2nd ed.). Guilford Press.',
        'Wolpe, J. (1958). <em>Psychotherapy by reciprocal inhibition</em>. Stanford University Press.',
        'American Psychological Association. (2025). <em>Clinical practice guideline for the treatment of posttraumatic stress disorder in adults</em>. https://www.apa.org/ptsd-guideline',
        'National Institute for Health and Care Excellence. (2005, reviewed 2024). <em>Obsessive-compulsive disorder and body dysmorphic disorder: treatment (CG31)</em>. https://www.nice.org.uk/guidance/cg31',
        'U.S. Department of Veterans Affairs, National Center for PTSD. (2026). <em>Prolonged Exposure for PTSD</em>. https://www.ptsd.va.gov/professional/treat/txessentials/prolonged_exposure_pro.asp',
        'Craske, M. G., Treanor, M., Conway, C. C., Zbozinek, T., & Vervliet, B. (2014). Maximizing exposure therapy: An inhibitory learning approach. <em>Behaviour Research and Therapy, 58</em>, 10–23.'
    ]
});
