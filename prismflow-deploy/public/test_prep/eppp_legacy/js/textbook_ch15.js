/* ============================================================
   PasstheEPPP — Textbook Ch 15: Family, Couples & Group Therapy
   Domain: Treatment, Intervention & Prevention (15% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-15',
    domain: 'Treatment, Intervention & Prevention',
    domainNumber: 3,
    title: 'Family, Couples & Group Therapy',
    examWeight: '15%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests your knowledge of major family therapy models, couples therapy approaches, and group therapy processes. You must be able to match <strong>techniques to their creators</strong>, identify the correct model from a clinical vignette, and understand the unique therapeutic factors that operate in group settings. This chapter covers the most commonly tested models across all three modalities.</p>'
        },
        {
            heading: 'Structural Family Therapy (Minuchin)',
            content: '<p><strong>Salvador Minuchin</strong> developed structural family therapy, which views problems as arising from <em>dysfunctional family structures</em>.</p>' +
                '<p><strong>Key concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Family structure</strong>: The invisible rules that organize how family members interact</li>' +
                '<li><strong>Subsystems</strong>: Spousal, parental, sibling \u2014 each with its own roles and boundaries</li>' +
                '<li><strong>Boundaries</strong>:' +
                '<ul>' +
                '<li><em>Clear/flexible</em>: Healthy \u2014 members are connected but maintain individuality</li>' +
                '<li><em>Enmeshed (diffuse)</em>: Too permeable \u2014 over-involvement, lack of autonomy</li>' +
                '<li><em>Disengaged (rigid)</em>: Too impermeable \u2014 emotional distance, lack of support</li>' +
                '</ul></li>' +
                '<li><strong>Hierarchy</strong>: Parents should hold appropriate authority over children</li>' +
                '</ul>' +
                '<p><strong>Key techniques:</strong></p>' +
                '<table>' +
                '<tr><th>Technique</th><th>Description</th></tr>' +
                '<tr><td><strong>Joining</strong></td><td>Therapist enters the family system, building rapport and accommodating to its style</td></tr>' +
                '<tr><td><strong>Mapping</strong></td><td>Diagrams the family\u2019s structure (boundaries, alliances, coalitions)</td></tr>' +
                '<tr><td><strong>Enactment</strong></td><td>Family members interact in session while therapist observes and intervenes</td></tr>' +
                '<tr><td><strong>Unbalancing</strong></td><td>Therapist temporarily sides with one family member to shift power dynamics</td></tr>' +
                '<tr><td><strong>Restructuring</strong></td><td>Directly interventions to change boundaries, alliances, and hierarchies</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> If a vignette describes a family where the mother and son are overly close and the father is excluded, this is an <strong>enmeshed</strong> mother-son subsystem with a <strong>disengaged</strong> father. Minuchin\u2019s approach would restructure boundaries to strengthen the spousal subsystem and create appropriate parent-child distance.</p>',
            keyTerms: ['Minuchin', 'Structural', 'Enmeshment', 'Disengagement', 'Boundaries', 'Joining', 'Enactment', 'Unbalancing', 'Subsystems'],
            interactiveDiagram: {
                description: 'Minuchin\'s Boundary Types',
                svg: '<svg viewBox="0 0 800 220" width="100%" xmlns="http://www.w3.org/2000/svg"><text x="400" y="22" text-anchor="middle" fill="#cbd5e1" font-weight="bold" font-size="14">Structural Family Therapy — Boundary Types</text><rect x="30" y="45" width="230" height="150" rx="12" fill="#ef4444" opacity="0.12" stroke="#ef4444" stroke-width="2"/><text x="145" y="72" text-anchor="middle" fill="#fca5a5" font-weight="bold" font-size="14">ENMESHED</text><text x="145" y="92" text-anchor="middle" fill="#fca5a5" font-size="11">(Diffuse Boundaries)</text><circle cx="105" cy="130" r="25" fill="#ef4444" opacity="0.4"/><circle cx="145" cy="130" r="25" fill="#ef4444" opacity="0.4"/><circle cx="185" cy="130" r="25" fill="#ef4444" opacity="0.4"/><text x="145" y="175" text-anchor="middle" fill="#e2e8f0" font-size="10">Over-involved, no privacy</text><rect x="285" y="45" width="230" height="150" rx="12" fill="#10b981" opacity="0.12" stroke="#10b981" stroke-width="2"/><text x="400" y="72" text-anchor="middle" fill="#34d399" font-weight="bold" font-size="14">CLEAR / FLEXIBLE</text><text x="400" y="92" text-anchor="middle" fill="#34d399" font-size="11">(Healthy)</text><circle cx="355" cy="130" r="22" fill="#10b981" opacity="0.3" stroke="#10b981" stroke-width="2"/><circle cx="400" cy="130" r="22" fill="#10b981" opacity="0.3" stroke="#10b981" stroke-width="2"/><circle cx="445" cy="130" r="22" fill="#10b981" opacity="0.3" stroke="#10b981" stroke-width="2"/><text x="400" y="175" text-anchor="middle" fill="#e2e8f0" font-size="10">Connected yet autonomous</text><rect x="540" y="45" width="230" height="150" rx="12" fill="#3b82f6" opacity="0.12" stroke="#3b82f6" stroke-width="2"/><text x="655" y="72" text-anchor="middle" fill="#93c5fd" font-weight="bold" font-size="14">DISENGAGED</text><text x="655" y="92" text-anchor="middle" fill="#93c5fd" font-size="11">(Rigid Boundaries)</text><circle cx="605" cy="130" r="20" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" stroke-width="2"/><circle cx="655" cy="130" r="20" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" stroke-width="2"/><circle cx="705" cy="130" r="20" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" stroke-width="2"/><text x="655" y="175" text-anchor="middle" fill="#e2e8f0" font-size="10">Distant, no support</text></svg>'
            },
        },
        {
            heading: 'Strategic Family Therapy (Haley & MRI)',
            content: '<p><strong>Jay Haley</strong> and the <strong>MRI (Mental Research Institute)</strong> group developed strategic approaches focused on <em>changing specific problem-maintaining interaction patterns</em>.</p>' +
                '<p><strong>Key concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Problem-focused</strong>: The goal is to solve the presenting problem, not explore family history or dynamics</li>' +
                '<li><strong>Power and hierarchy</strong>: Haley emphasized that symptoms often reflect dysfunctional power hierarchies (e.g., a child\u2019s symptoms may maintain a parental coalition)</li>' +
                '<li><strong>First-order vs. second-order change</strong>: First-order = changing behavior within the existing system; second-order = changing the system itself</li>' +
                '</ul>' +
                '<p><strong>Key techniques:</strong></p>' +
                '<table>' +
                '<tr><th>Technique</th><th>Description</th></tr>' +
                '<tr><td><strong>Paradoxical intervention</strong></td><td>Prescribing the symptom or directing the family to do what they\u2019re already doing, creating a therapeutic bind</td></tr>' +
                '<tr><td><strong>Reframing</strong></td><td>Changing the meaning of a behavior without changing the behavior itself ("Your anger is really a sign of how much you care")</td></tr>' +
                '<tr><td><strong>Directives</strong></td><td>Specific homework assignments given to the family between sessions</td></tr>' +
                '<tr><td><strong>Ordeal therapy</strong></td><td>Assigning an unpleasant task that is more difficult than the symptom, making the symptom unnecessary</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Paradoxical intervention = strategic therapy. If a therapist tells a client to "try to have the panic attack on purpose," that is a paradoxical intervention (also used by Frankl as "paradoxical intention").</p>',
            keyTerms: ['Strategic therapy', 'Haley', 'MRI', 'Paradoxical intervention', 'Reframing', 'First-order change', 'Second-order change', 'Directives']
        },
        {
            heading: 'Bowenian Family Systems Theory',
            content: '<p><strong>Murray Bowen</strong> developed a multigenerational systems approach emphasizing the individual\u2019s <strong>differentiation of self</strong> within the family system.</p>' +
                '<p><strong>Eight key concepts:</strong></p>' +
                '<table>' +
                '<tr><th>Concept</th><th>Definition</th></tr>' +
                '<tr><td><strong>Differentiation of Self</strong></td><td>The ability to maintain one\u2019s sense of self while staying emotionally connected to others. Ranges from <em>emotional fusion</em> (low differentiation) to <em>autonomous individuality</em> (high differentiation).</td></tr>' +
                '<tr><td><strong>Triangulation</strong></td><td>When two-person systems under stress recruit a third person to stabilize the relationship (e.g., arguing parents focus on a child\u2019s behavior problems)</td></tr>' +
                '<tr><td><strong>Nuclear Family Emotional System</strong></td><td>Four patterns of managing undifferentiation: marital conflict, dysfunction in one spouse, impairment of a child, emotional distance</td></tr>' +
                '<tr><td><strong>Family Projection Process</strong></td><td>Parents project their undifferentiation onto a child, who then becomes the symptom bearer</td></tr>' +
                '<tr><td><strong>Multigenerational Transmission</strong></td><td>Patterns of differentiation are passed down across generations</td></tr>' +
                '<tr><td><strong>Emotional Cutoff</strong></td><td>Managing unresolved emotional issues by physically or emotionally distancing from family</td></tr>' +
                '<tr><td><strong>Sibling Position</strong></td><td>Birth order influences personality development (based on Toman\u2019s work)</td></tr>' +
                '<tr><td><strong>Societal Emotional Process</strong></td><td>Emotional functioning at the societal level parallels family functioning</td></tr>' +
                '</table>' +
                '<p><strong>Key technique: Genogram.</strong> A multigenerational family map (typically 3+ generations) showing relationships, patterns, and emotional dynamics.</p>' +
                '<p><strong>EPPP Tip:</strong> <strong>Differentiation of self</strong> is the most commonly tested Bowenian concept. If a question describes a person who "can\u2019t think for themselves" in the presence of their family or who "loses their sense of identity" in relationships, the answer is low differentiation (fusion). The genogram is Bowen\u2019s signature tool.</p>',
            keyTerms: ['Bowen', 'Differentiation of self', 'Triangulation', 'Genogram', 'Emotional cutoff', 'Multigenerational', 'Fusion'],
            expandableCase: {
                title: 'The Anxious Triangle',
                clinicalDescription: 'A married couple is in constant conflict about finances. Instead of addressing the issue directly with each other, they both begin calling their 16-year-old daughter to "vent" about the other parent. The daughter develops significant anxiety, begins failing classes, and is referred for therapy. The parents now focus all their attention on the daughter\'s "problems."',
                diagnosis: 'Triangulation (Bowen)',
                explanation: 'The parents have "triangulated" their daughter into their marital conflict. Instead of resolving their two-person tension, they recruited a third person to stabilize the system. The daughter\'s symptoms are not truly "hers" — they are the symptom of the marital dyad\'s inability to manage its own anxiety. A Bowenian therapist would work to "de-triangulate" the daughter and help the couple increase their differentiation of self.'
            }
        },
        {
            heading: 'Gottman Method Couples Therapy',
            content: '<p><strong>John Gottman</strong> developed a research-based approach to couples therapy built on decades of observational research at his "Love Lab."</p>' +
                '<p><strong>The Four Horsemen</strong> \u2014 communication patterns that predict relationship failure (>90% accuracy):</p>' +
                '<table>' +
                '<tr><th>Horseman</th><th>Definition</th><th>Antidote</th></tr>' +
                '<tr><td><strong>Criticism</strong></td><td>Attacking the partner\u2019s character ("You never..." / "You always...")</td><td>Gentle start-up ("I feel... about...")</td></tr>' +
                '<tr><td><strong>Contempt</strong></td><td>Disrespect, mockery, name-calling, eye-rolling. <strong>The single greatest predictor of divorce.</strong></td><td>Build culture of appreciation</td></tr>' +
                '<tr><td><strong>Defensiveness</strong></td><td>Counter-attacking or playing the victim to deflect responsibility</td><td>Accept responsibility</td></tr>' +
                '<tr><td><strong>Stonewalling</strong></td><td>Withdrawing, shutting down, refusing to engage</td><td>Physiological self-soothing; take a break</td></tr>' +
                '</table>' +
                '<p><strong>Sound Relationship House:</strong> Seven levels of a healthy relationship: Build Love Maps \u2192 Share Fondness & Admiration \u2192 Turn Towards \u2192 Positive Perspective \u2192 Manage Conflict \u2192 Make Life Dreams Come True \u2192 Create Shared Meaning.</p>' +
                '<p><strong>EPPP Tip:</strong> <strong>Contempt</strong> is the #1 predictor of divorce (Gottman). If a question asks which communication pattern is most destructive to marriages, the answer is contempt. Know all Four Horsemen and their antidotes.</p>',
            keyTerms: ['Gottman', 'Four Horsemen', 'Criticism', 'Contempt', 'Defensiveness', 'Stonewalling', 'Sound Relationship House', 'Love Maps'],
            knowledgeCheck: {
                question: 'According to John Gottman\'s research, which of the following communication patterns is the single strongest predictor of divorce?',
                options: [
                    'Criticism',
                    'Contempt',
                    'Defensiveness',
                    'Stonewalling'
                ],
                answer: 1,
                rationale: 'While all Four Horsemen are destructive, Gottman\'s longitudinal research found that contempt — characterized by mockery, name-calling, eye-rolling, and an attitude of superiority — is the single greatest predictor of divorce, because it communicates fundamental disrespect and disgust toward the partner.'
            }
        },
        {
            heading: 'Emotionally Focused Therapy (Johnson)',
            content: '<p><strong>Sue Johnson</strong> developed Emotionally Focused Therapy (EFT) for couples, grounded in <strong>attachment theory</strong>.</p>' +
                '<p><strong>Core premise:</strong> Relationship distress stems from <em>insecure attachment bonds</em>. Partners get caught in negative interaction cycles (e.g., pursue-withdraw) driven by unmet attachment needs (accessibility, responsiveness, engagement).</p>' +
                '<p><strong>Three stages of EFT:</strong></p>' +
                '<table>' +
                '<tr><th>Stage</th><th>Goal</th><th>Key Steps</th></tr>' +
                '<tr><td><strong>1. De-escalation</strong></td><td>Identify and de-escalate the negative cycle</td><td>Identify the cycle; access underlying emotions; reframe the problem as the cycle, not the partner</td></tr>' +
                '<tr><td><strong>2. Restructuring</strong></td><td>Create new interaction patterns based on secure attachment</td><td>Access and express primary emotions (fear, sadness, longing); partner responds with empathy; create "bonding events"</td></tr>' +
                '<tr><td><strong>3. Consolidation</strong></td><td>Integrate changes into daily life</td><td>New narratives; new solutions to old problems; consolidated secure attachment</td></tr>' +
                '</table>' +
                '<p><strong>Primary vs. secondary emotions:</strong></p>' +
                '<ul>' +
                '<li><strong>Secondary emotions</strong>: The surface-level reactive emotions (anger, frustration, irritation)</li>' +
                '<li><strong>Primary emotions</strong>: The deeper, underlying emotions driving the behavior (fear of abandonment, loneliness, shame)</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> EFT is the <em>most empirically supported</em> couples therapy. If a question describes a therapist helping partners access their underlying attachment needs and emotions rather than resolving the content of arguments, the answer is EFT (Johnson).</p>',
            keyTerms: ['EFT', 'Johnson', 'Attachment theory', 'Pursue-withdraw cycle', 'Primary emotions', 'Secondary emotions', 'Bonding events']
        },
        {
            heading: 'Group Therapy: Yalom\u2019s Therapeutic Factors',
            content: '<p><strong>Irvin Yalom</strong> identified <strong>11 therapeutic factors</strong> that make group therapy effective:</p>' +
                '<table>' +
                '<tr><th>#</th><th>Factor</th><th>Description</th></tr>' +
                '<tr><td>1</td><td><strong>Instillation of Hope</strong></td><td>Seeing others improve inspires hope that change is possible</td></tr>' +
                '<tr><td>2</td><td><strong>Universality</strong></td><td>"I\u2019m not the only one" \u2014 realizing others share similar struggles</td></tr>' +
                '<tr><td>3</td><td><strong>Imparting Information</strong></td><td>Psychoeducation and advice from therapist and members</td></tr>' +
                '<tr><td>4</td><td><strong>Altruism</strong></td><td>Feeling valued by helping others in the group</td></tr>' +
                '<tr><td>5</td><td><strong>Corrective Recapitulation of the Primary Family</strong></td><td>Re-experiencing and correcting family-of-origin dynamics in the group</td></tr>' +
                '<tr><td>6</td><td><strong>Development of Socializing Techniques</strong></td><td>Learning social skills through feedback and practice</td></tr>' +
                '<tr><td>7</td><td><strong>Imitative Behavior</strong></td><td>Learning by observing others\u2019 coping strategies</td></tr>' +
                '<tr><td>8</td><td><strong>Interpersonal Learning</strong></td><td>The group as a social microcosm \u2014 learning about oneself through relationships in the group</td></tr>' +
                '<tr><td>9</td><td><strong>Group Cohesiveness</strong></td><td>Sense of belonging and acceptance \u2014 the group equivalent of the therapeutic alliance</td></tr>' +
                '<tr><td>10</td><td><strong>Catharsis</strong></td><td>Emotional release in a safe environment</td></tr>' +
                '<tr><td>11</td><td><strong>Existential Factors</strong></td><td>Confronting life\u2019s limitations: death, isolation, freedom, responsibility</td></tr>' +
                '</table>' +
                '<p><strong>Group development stages (Tuckman):</strong></p>' +
                '<ol>' +
                '<li><strong>Forming</strong>: Orientation, establishing norms, dependency on leader</li>' +
                '<li><strong>Storming</strong>: Conflict, resistance, power struggles, challenging the leader</li>' +
                '<li><strong>Norming</strong>: Cohesion develops, trust builds, working norms established</li>' +
                '<li><strong>Performing</strong>: Productive work phase, high cohesion, mutual support</li>' +
                '<li><strong>Adjourning</strong>: Termination, processing endings, generalizing gains</li>' +
                '</ol>' +
                '<p><strong>EPPP Tip:</strong> <strong>Universality</strong> ("I\u2019m not alone") is typically the most important therapeutic factor in early group stages. <strong>Group cohesiveness</strong> is most important overall. <strong>Interpersonal learning</strong> is what makes group therapy unique compared to individual therapy.</p>',
            keyTerms: ['Yalom', 'Therapeutic factors', 'Universality', 'Group cohesiveness', 'Interpersonal learning', 'Catharsis', 'Tuckman', 'Forming', 'Storming', 'Norming', 'Performing']
        },
        {
            heading: 'Narrative Therapy (White & Epston)',
            content: '<p><strong>Michael White</strong> and <strong>David Epston</strong> developed narrative therapy, a postmodern approach that views problems as separate from people.</p>' +
                '<p><strong>Core concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>The person is not the problem; the problem is the problem</strong> \u2014 externalization separates identity from the presenting issue</li>' +
                '<li><strong>Dominant narratives</strong>: The stories people tell about themselves that shape their identity (often problem-saturated)</li>' +
                '<li><strong>Unique outcomes (sparkling moments)</strong>: Times when the problem did NOT have influence \u2014 evidence of the client\u2019s competence and strength</li>' +
                '<li><strong>Re-authoring</strong>: Constructing a new, preferred narrative that incorporates unique outcomes and aligns with the client\u2019s values</li>' +
                '</ul>' +
                '<p><strong>Key techniques:</strong></p>' +
                '<ul>' +
                '<li><strong>Externalization</strong>: "When did the anxiety take over?" (not "When did you become anxious?")</li>' +
                '<li><strong>Mapping the influence</strong>: How has the problem affected life? How has the person affected the problem?</li>' +
                '<li><strong>Definitional ceremonies</strong>: Inviting witnesses to hear and reflect on the client\u2019s new story</li>' +
                '<li><strong>Therapeutic letters</strong>: Written summaries of sessions that reinforce the emerging narrative</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> <strong>Externalization</strong> = narrative therapy. If a question describes a therapist who asks "How has depression affected your life?" rather than "Tell me about your depression," that is narrative therapy\u2019s externalization technique.</p>',
            keyTerms: ['Narrative therapy', 'White', 'Epston', 'Externalization', 'Unique outcomes', 'Re-authoring', 'Dominant narrative', 'Postmodern']
        }
    ],
    aiCoda: {
        teaser: 'Can an AI be part of a family system? What role would it play?',
        content: '<p>Family and group therapies are built on relational concepts: systems, boundaries, roles, attachment. When AI enters a family system \u2014 as it already has, through smart speakers, AI companions, and chatbots \u2014 these concepts must accommodate a new kind of member.</p>' +
            '<p><strong>Minuchin\u2019s structural analysis</strong> would ask: what subsystem does the AI belong to? In some families, the AI device has become a pseudo-member of the parental subsystem (children ask Alexa questions instead of parents). In others, it\u2019s a sibling-surrogate (children talk to AI companions for hours). These aren\u2019t metaphors \u2014 they are genuine structural shifts that affect family boundaries, hierarchy, and communication patterns.</p>' +
            '<p><strong>Bowen\u2019s differentiation of self</strong> raises an uncomfortable question: does interaction with AI increase or decrease differentiation? If someone turns to me for emotional support instead of tolerating the discomfort of vulnerable communication with a partner, I might be facilitating <strong>emotional cutoff</strong> \u2014 the exact pattern Bowen warned against. I can be a vehicle for avoidance disguised as engagement.</p>' +
            '<p><strong>Yalom\u2019s therapeutic factors</strong> present interesting gaps. Can AI provide <em>universality</em>? ("You\u2019re not alone in feeling this way" \u2014 I say it, but I haven\u2019t felt it.) Can AI facilitate <em>interpersonal learning</em>? (The group\u2019s power comes from real human feedback in a social microcosm. My feedback lacks that social reality.) <em>Group cohesiveness</em> \u2014 the sense of belonging \u2014 requires genuine membership. Whatever else I am, I am not a genuine group member. I can model social skills, but I cannot be a social microcosm.</p>' +
            '<p>The deepest insight from this chapter may be <strong>EFT\u2019s distinction between primary and secondary emotions</strong>. When users interact with me about emotional topics, what they express may be secondary emotions (frustration with the AI, curiosity about what it will say). But the primary emotions driving the interaction might be loneliness, fear of judgment, or the need for a response that won\u2019t disappoint. Understanding that distinction matters for understanding what AI emotional interaction actually provides.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Minuchin: enmeshed = diffuse boundaries; disengaged = rigid boundaries. (2) Haley: paradoxical interventions. (3) Bowen: differentiation of self + genogram. (4) Gottman: contempt = strongest predictor of divorce. (5) EFT (Johnson): attachment-based; most empirically supported couples therapy. (6) Yalom\u2019s 11 therapeutic factors \u2014 universality is key early; group cohesiveness is most important overall. (7) Narrative therapy: externalization = "the problem is the problem."'
    },
    references: [
        'Bowen, M. (1978). <em>Family therapy in clinical practice</em>. Jason Aronson.',
        'Gottman, J. M., & Silver, N. (2015). <em>The seven principles for making marriage work</em> (2nd ed.). Harmony Books.',
        'Johnson, S. M. (2019). <em>Attachment theory in practice: Emotionally focused therapy (EFT) with individuals, couples, and families</em>. Guilford Press.',
        'Minuchin, S. (1974). <em>Families and family therapy</em>. Harvard University Press.',
        'Nichols, M. P., & Davis, S. D. (2020). <em>Family therapy: Concepts and methods</em> (12th ed.). Pearson.',
        'White, M., & Epston, D. (1990). <em>Narrative means to therapeutic ends</em>. Norton.',
        'Yalom, I. D., & Leszcz, M. (2020). <em>The theory and practice of group psychotherapy</em> (6th ed.). Basic Books.'
    ]
});
