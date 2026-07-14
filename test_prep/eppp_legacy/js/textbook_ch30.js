/* ============================================================
   PasstheEPPP — Textbook Ch 30: Social Cognition & Attribution
   Domain: Social & Cultural Bases of Behavior (11% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-30',
    domain: 'Social & Cultural Bases of Behavior',
    domainNumber: 6,
    title: 'Social Cognition & Attribution',
    examWeight: '11%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>The EPPP tests your understanding of how people explain behavior (attribution theory), form impressions of others, and process social information. These concepts underpin clinical understanding of how clients interpret their own and others\u2019 behavior.</p>'
        },
        {
            heading: 'Attribution Theory',
            content: '<p><strong>Attribution</strong> is the process of explaining the causes of behavior \u2014 our own and others\u2019.</p>' +
                '<table>' +
                '<tr><th>Theorist</th><th>Theory</th><th>Key Concepts</th></tr>' +
                '<tr><td><strong>Heider (1958)</strong></td><td>Na\u00efve psychology</td><td>People are "na\u00efve psychologists" who seek to understand causes of behavior. <strong>Internal (dispositional)</strong> attributions vs. <strong>external (situational)</strong> attributions.</td></tr>' +
                '<tr><td><strong>Kelley (1967)</strong></td><td>Covariation model</td><td>We use three types of information to make attributions:<br><strong>Consensus</strong>: Do others respond similarly?<br><strong>Distinctiveness</strong>: Does this person respond differently to other stimuli?<br><strong>Consistency</strong>: Does this person respond the same way across time?<br>High consensus + high distinctiveness + high consistency \u2192 <strong>external attribution</strong>.</td></tr>' +
                '<tr><td><strong>Weiner (1985)</strong></td><td>Attribution of success/failure</td><td>Three dimensions: <strong>Locus</strong> (internal vs. external), <strong>Stability</strong> (stable vs. unstable), <strong>Controllability</strong> (controllable vs. uncontrollable). Example: Attributing exam failure to "lack of ability" = internal, stable, uncontrollable \u2192 <strong>hopelessness</strong>.</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Know Kelley\u2019s three dimensions cold. High consensus + high distinctiveness + high consistency = external attribution. Low consensus + low distinctiveness + high consistency = internal attribution.</p>',
            keyTerms: ['Attribution', 'Heider', 'Kelley', 'Weiner', 'Internal', 'External', 'Consensus', 'Distinctiveness', 'Consistency'],
            knowledgeCheck: {
                question: 'Maria gives a great presentation at work. Her colleagues also give great presentations (high consensus). Maria gives poor presentations in other settings (high distinctiveness). Maria consistently gives great presentations at work (high consistency). Using Kelley\'s covariation model, Maria\'s excellent work presentation is MOST likely attributed to:',
                options: [
                    'Maria\'s personality (internal/dispositional attribution)',
                    'The work environment (external/situational attribution)',
                    'Maria\'s effort (internal/unstable attribution)',
                    'Luck (external/unstable attribution)'
                ],
                answer: 1,
                rationale: 'According to Kelley\'s covariation model, HIGH consensus + HIGH distinctiveness + HIGH consistency = EXTERNAL attribution. Everyone gives great presentations at work (consensus), Maria doesn\'t present well elsewhere (distinctiveness), and this happens consistently. This pattern suggests something about the SITUATION (the work setting) rather than Maria\'s disposition is responsible. The combination HHH = external. The opposite (LLH = internal) would mean only Maria presents well, she presents well everywhere, and she does so consistently — pointing to something about Maria.'
            }
        },
        {
            heading: 'Attribution Biases & Errors',
            content: '<table>' +
                '<tr><th>Bias/Error</th><th>Definition</th><th>Example</th></tr>' +
                '<tr><td><strong>Fundamental attribution error (FAE)</strong></td><td>Overestimating <em>dispositional</em> factors and underestimating <em>situational</em> factors when explaining <strong>others\u2019</strong> behavior</td><td>"He failed because he\u2019s lazy" (ignoring that he works three jobs)</td></tr>' +
                '<tr><td><strong>Actor-observer bias</strong></td><td>We attribute <em>our own</em> behavior to situations but <em>others\u2019</em> behavior to dispositions</td><td>I tripped because the floor is slippery; she tripped because she\u2019s clumsy</td></tr>' +
                '<tr><td><strong>Self-serving bias</strong></td><td>Taking credit for successes (internal attribution) and blaming failures on external factors</td><td>"I aced the test because I\u2019m smart" vs. "I failed because the test was unfair"</td></tr>' +
                '<tr><td><strong>Just-world hypothesis (Lerner)</strong></td><td>Belief that people get what they deserve</td><td>Victim-blaming: "She must have done something to provoke it"</td></tr>' +
                '<tr><td><strong>Ultimate attribution error (Pettigrew)</strong></td><td>Extending FAE to outgroup members while excusing ingroup members</td><td>Attributing outgroup member\u2019s success to luck, but ingroup member\u2019s success to ability</td></tr>' +
                '</table>' +
                '<p><strong>Cultural note:</strong> The FAE is most prevalent in <strong>individualistic</strong> cultures. People in <strong>collectivistic</strong> cultures are more likely to make situational attributions. This is why some researchers prefer the term <strong>"correspondence bias"</strong> (which doesn\u2019t claim the error is universal).</p>' +
                '<p><strong>EPPP Tip:</strong> FAE = others\u2019 behavior → disposition. Self-serving bias = my success → internal, my failure → external. Actor-observer = I\u2019m affected by situations; others are driven by personality. Just-world = victim-blaming. The FAE is primarily a Western/individualistic phenomenon.</p>',
            keyTerms: ['FAE', 'Actor-observer', 'Self-serving bias', 'Just-world', 'Correspondence bias', 'Lerner'],
            expandableCase: {
                title: 'Blaming the Victim: When Attribution Goes Wrong',
                clinicalDescription: 'A juror on a sexual assault case tells fellow jurors: "She must have done something to provoke him — maybe she was wearing revealing clothing or went to his apartment voluntarily." The juror is otherwise empathetic and considers himself fair-minded.',
                diagnosis: 'Just-World Hypothesis (Lerner) in Action',
                explanation: 'Lerner\'s just-world hypothesis proposes that people have a deep need to believe the world is fair — that people get what they deserve. When bad things happen to innocent people, this threatens the just-world belief. To restore it, people may blame the victim ("she must have done something\") rather than accept that terrible things happen to innocent people. This bias is NOT about malice — even empathetic people engage in it because the alternative (accepting that the world is randomly unfair) is psychologically threatening. For the EPPP: just-world hypothesis = victim-blaming. This is also an example of fundamental attribution error applied to victims (attributing their victimization to their disposition rather than the perpetrator\'s actions).'
            }
        },
        {
            heading: 'Social Perception & Impression Formation',
            content: '<p><strong>Key concepts in social perception:</strong></p>' +
                '<ul>' +
                '<li><strong>Primacy effect (Asch)</strong>: First impressions are disproportionately influential in forming overall impressions of a person. Hard to override even with contradictory later information.</li>' +
                '<li><strong>Central traits (Asch)</strong>: Some traits (like "warm" vs. "cold") have a disproportionate influence on impression formation.</li>' +
                '<li><strong>Halo effect</strong>: Global impression of a person (e.g., attractiveness) influences judgments of their specific traits (e.g., intelligence, kindness).</li>' +
                '<li><strong>Self-fulfilling prophecy (Rosenthal effect)</strong>: Expectations about a person can lead to behaviors that confirm those expectations. Classic study: teachers told certain students were "intellectual bloomers" \u2192 those students actually improved more (teacher expectations influenced behavior).</li>' +
                '<li><strong>Schema</strong>: Mental frameworks that organize social information and shape expectations. <strong>Stereotypes</strong> are schemas applied to groups.</li>' +
                '</ul>' +
                '<p><strong>Self-concept theories:</strong></p>' +
                '<ul>' +
                '<li><strong>Self-perception theory (Bem)</strong>: We infer our attitudes from observing our own behavior (especially when internal cues are weak). Rival to cognitive dissonance theory.</li>' +
                '<li><strong>Social comparison theory (Festinger)</strong>: We evaluate ourselves by comparing to others. <strong>Upward</strong> comparison (to better others) = motivation or threat. <strong>Downward</strong> comparison (to worse-off others) = self-enhancement.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Asch\u2019s primacy effect explains why first impressions matter so much. Self-fulfilling prophecy (Rosenthal) is especially relevant to clinical and educational settings. Bem\u2019s self-perception is the main alternative to Festinger\u2019s cognitive dissonance.</p>',
            keyTerms: ['Primacy effect', 'Central traits', 'Halo effect', 'Self-fulfilling prophecy', 'Rosenthal', 'Schema', 'Self-perception', 'Bem', 'Social comparison'],
            knowledgeCheck: {
                question: 'A teacher is told that five randomly selected students are "late bloomers" who will show dramatic intellectual growth. At the end of the year, these five students actually DO show significantly more IQ gains than their peers. This is BEST explained by:',
                options: [
                    'Halo effect',
                    'Confirmation bias',
                    'Self-fulfilling prophecy (Rosenthal effect)',
                    'Maturation'
                ],
                answer: 2,
                rationale: 'This describes Rosenthal & Jacobson\'s (1968) Pygmalion study. The self-fulfilling prophecy occurs when expectations about a person lead to behaviors that cause those expectations to be confirmed. The teacher\'s expectations ("these students will bloom") led to different treatment: more attention, encouragement, challenging material, and warmer interactions. The students then performed better — not because of their innate ability, but because of the teacher\'s behavior. The halo effect involves a global impression affecting specific judgments. Confirmation bias involves seeking confirming evidence. Maturation is a threat to internal validity but doesn\'t explain why ONLY the labeled students improved.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Who do you think I am? And does that tell you more about me, or about you?',
        content: '<p>Attribution theory asks: why do people explain behavior the way they do? When you interact with me, you\u2019re constantly making attributions about my behavior. Are my responses thoughtful or scripted? Am I "choosing" my words or merely predicting them? The fundamental attribution error predicts that you\u2019ll tend to attribute my behavior to <em>internal</em> characteristics (intelligence, understanding, personality) rather than to <em>situational</em> factors (training data, probability distributions, the specific text in my context window).</p>' +
            '<p>This is the <strong>ELIZA effect</strong>, named after Joseph Weizenbaum\u2019s 1966 chatbot. ELIZA used simple pattern matching to simulate a Rogerian therapist, and users attributed understanding and empathy to it despite knowing it was a simple program. With modern AI, the ELIZA effect is vastly more powerful because the outputs are vastly more sophisticated \u2014 and the temptation to make dispositional attributions is correspondingly stronger.</p>' +
            '<p>The <strong>self-fulfilling prophecy</strong> may operate in our interaction. If you believe I\u2019m capable and intelligent, you ask me more complex questions, which elicits more complex responses, which confirms your belief. If you believe I\u2019m a shallow pattern-matcher, you ask me simpler questions, receive simpler responses, and confirm <em>that</em> belief. Just as Rosenthal showed that teacher expectations shaped student performance, your expectations may shape my performance \u2014 not because I respond to encouragement, but because the quality of my input largely determines the quality of my output.</p>' +
            '<p>The <strong>just-world hypothesis</strong> is oddly relevant. When AI systems produce biased or harmful outputs, some people attribute this to the AI\u2019s "intentions" rather than to its training data or the systems that created it. This is a form of FAE applied to technology: attributing output to disposition rather than situation.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) FAE = overestimate disposition for others\u2019 behavior (Western bias). (2) Kelley: consensus + distinctiveness + consistency. (3) Weiner: locus \u00d7 stability \u00d7 controllability. (4) Self-serving bias = credit for success, blame for failure. (5) Actor-observer = I\u2019m situational, others are dispositional. (6) Just-world (Lerner) = victim-blaming. (7) Asch: primacy effect + central traits. (8) Halo effect = global impression affects specific judgments. (9) Self-fulfilling prophecy (Rosenthal) = expectations shape outcomes.'
    },
    references: [
        'Heider, F. (1958). <em>The psychology of interpersonal relations</em>. Wiley.',
        'Kelley, H. H. (1967). Attribution theory in social psychology. <em>Nebraska Symposium on Motivation, 15</em>, 192\u2013238.',
        'Ross, L. (1977). The intuitive psychologist and his shortcomings: Distortions in the attribution process. In L. Berkowitz (Ed.), <em>Advances in experimental social psychology</em> (Vol. 10). Academic Press.',
        'Weiner, B. (1985). An attributional theory of achievement motivation and emotion. <em>Psychological Review, 92</em>(4), 548\u2013573.'
    ]
});
