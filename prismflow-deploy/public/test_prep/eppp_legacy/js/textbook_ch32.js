/* ============================================================
   PasstheEPPP — Textbook Ch 32: Attitudes, Persuasion & Prejudice
   Domain: Social & Cultural Bases of Behavior (11% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-32',
    domain: 'Social & Cultural Bases of Behavior',
    domainNumber: 6,
    title: 'Attitudes, Persuasion & Prejudice',
    examWeight: '11%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>This chapter covers attitude formation and change, persuasion models, and the psychology of prejudice and discrimination. These concepts are essential for understanding therapeutic change, public health messaging, and multicultural competence.</p>'
        },
        {
            heading: 'Attitudes & Attitude Change',
            content: '<p><strong>Attitudes</strong> have three components (the <strong>ABC model</strong>):</p>' +
                '<ul>' +
                '<li><strong>Affective</strong>: Emotional response ("I feel anxious about public speaking")</li>' +
                '<li><strong>Behavioral</strong>: Actions toward the object ("I avoid public speaking")</li>' +
                '<li><strong>Cognitive</strong>: Beliefs about the object ("Public speaking is dangerous")</li>' +
                '</ul>' +
                '<p><strong>Attitude change theories:</strong></p>' +
                '<ul>' +
                '<li><strong>Cognitive dissonance (Festinger)</strong>: Attitude change occurs to reduce the discomfort of holding contradictory cognitions. Covered in Ch 26.</li>' +
                '<li><strong>Self-perception theory (Bem)</strong>: We infer our attitudes from our behavior (no dissonance needed). Rival to dissonance theory.</li>' +
                '<li><strong>Cognitive dissonance vs. self-perception</strong>: Dissonance better explains attitude change when the behavior strongly contradicts prior attitudes. Self-perception better explains attitude formation when prior attitudes are weak or ambiguous.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Dissonance = strong prior attitude + contradictory behavior → discomfort → attitude change. Self-perception = weak/no prior attitude → infer attitude from behavior (no discomfort).</p>',
            keyTerms: ['ABC model', 'Affective', 'Behavioral', 'Cognitive', 'Cognitive dissonance', 'Self-perception'],
            knowledgeCheck: {
                question: 'A person with no strong prior opinion about a new health supplement tries it because a friend recommended it. After taking it daily for a month, she concludes "I must like this supplement since I keep taking it." This attitude formation is BEST explained by:',
                options: [
                    'Cognitive dissonance theory',
                    'Self-perception theory (Bem)',
                    'Elaboration Likelihood Model',
                    'Inoculation theory'
                ],
                answer: 1,
                rationale: 'Self-perception theory (Bem) predicts that when prior attitudes are weak or absent, people infer their attitudes from observing their own behavior. She had no strong prior attitude, observed her own behavior (taking it daily), and inferred an attitude from it. Cognitive dissonance would require a strong prior attitude that conflicts with behavior, producing discomfort. Since she had no prior opinion, there\'s no dissonance to resolve. Self-perception explains attitude FORMATION from behavior; dissonance explains attitude CHANGE when behavior contradicts existing attitudes.'
            }
        },
        {
            heading: 'Persuasion Models',
            content: '<p><strong>Elaboration Likelihood Model (ELM; Petty & Cacioppo):</strong></p>' +
                '<table>' +
                '<tr><th>Central route</th><th>Peripheral route</th></tr>' +
                '<tr><td>High motivation and ability to process</td><td>Low motivation or ability to process</td></tr>' +
                '<tr><td>Focus on the <em>quality</em> of arguments</td><td>Focus on <em>cues</em> (source attractiveness, number of arguments, emotional appeal)</td></tr>' +
                '<tr><td>Produces <strong>lasting</strong> attitude change</td><td>Produces <strong>temporary</strong> attitude change</td></tr>' +
                '<tr><td>Requires cognitive effort</td><td>Requires minimal cognitive effort</td></tr>' +
                '</table>' +
                '<p><strong>Other persuasion concepts:</strong></p>' +
                '<ul>' +
                '<li><strong>Sleeper effect</strong>: The persuasive impact of a message increases over time when the message was originally presented with a discounting cue (e.g., low-credibility source). Over time, the source is forgotten but the message persists.</li>' +
                '<li><strong>Yale attitude change approach</strong>: Who (source credibility, attractiveness) says what (message characteristics) to whom (audience characteristics) and how (channel of communication).</li>' +
                '<li><strong>Inoculation theory (McGuire)</strong>: Exposing people to weakened versions of counterarguments makes them more resistant to future persuasion attempts (like a vaccine for beliefs).</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Central route = quality of arguments = lasting change. Peripheral route = superficial cues = temporary change. Know that the ELM is the dominant model of persuasion and understand when each route is used.</p>',
            keyTerms: ['ELM', 'Central route', 'Peripheral route', 'Petty & Cacioppo', 'Sleeper effect', 'Inoculation theory'],
            knowledgeCheck: {
                question: 'A pharmaceutical company hires an attractive celebrity to promote an antidepressant in TV ads. Viewers who pay little attention to the ad\'s medical claims but are influenced by the celebrity\'s appeal are processing through the:',
                options: [
                    'Central route — focusing on argument quality',
                    'Peripheral route — focusing on surface cues',
                    'Systematic processing — carefully evaluating evidence',
                    'Inoculation effect — building resistance to persuasion'
                ],
                answer: 1,
                rationale: 'The Elaboration Likelihood Model (ELM) predicts that when motivation or ability to process is low, people rely on the peripheral route — using surface cues like source attractiveness, celebrity endorsement, or emotional appeal rather than evaluating argument quality. This produces temporary attitude change. The central route requires high motivation/ability and focus on the quality of arguments. For the EPPP: peripheral = cues/temporary; central = quality/lasting.'
            }
        },
        {
            heading: 'Prejudice, Stereotypes & Discrimination',
            content: '<p><strong>Key definitions:</strong></p>' +
                '<ul>' +
                '<li><strong>Stereotype</strong>: Cognitive component \u2014 generalized <em>belief</em> about a group</li>' +
                '<li><strong>Prejudice</strong>: Affective component \u2014 negative <em>attitude/feeling</em> toward a group</li>' +
                '<li><strong>Discrimination</strong>: Behavioral component \u2014 <em>actions</em> against a group</li>' +
                '</ul>' +
                '<p><strong>Theories of prejudice:</strong></p>' +
                '<ul>' +
                '<li><strong>Social identity theory (Tajfel & Turner)</strong>: We categorize ourselves into groups (ingroups) and derive self-esteem from group membership. <strong>Ingroup favoritism</strong> and <strong>outgroup derogation</strong> result. Minimal group paradigm: even arbitrary group assignment produces bias.</li>' +
                '<li><strong>Realistic conflict theory (Sherif)</strong>: Competition for scarce resources creates intergroup hostility. <strong>Robbers Cave experiment</strong>: Boys at camp divided into groups became hostile when competing; hostility reduced through <strong>superordinate goals</strong> (shared goals requiring cooperation).</li>' +
                '<li><strong>Scapegoat theory</strong>: Displaced aggression toward a weaker target when frustration cannot be directed at the actual source</li>' +
                '<li><strong>Authoritarian personality (Adorno)</strong>: Rigid, conventional, submission to authority, hostility toward outgroups</li>' +
                '</ul>' +
                '<p><strong>Reducing prejudice:</strong></p>' +
                '<ul>' +
                '<li><strong>Contact hypothesis (Allport)</strong>: Intergroup contact reduces prejudice <strong>IF</strong>: (1) equal status, (2) common goals, (3) intergroup cooperation, (4) support from authorities</li>' +
                '<li><strong>Jigsaw classroom (Aronson)</strong>: Cooperative learning technique where each student has one piece of the puzzle. Forces interdependence across racial/ethnic lines.</li>' +
                '</ul>' +
                '<p><strong>Implicit bias:</strong></p>' +
                '<ul>' +
                '<li><strong>Implicit Association Test (IAT)</strong>: Measures automatic associations between concepts (e.g., race and "good/bad")</li>' +
                '<li><strong>Stereotype threat (Steele & Aronson)</strong>: Awareness of a negative stereotype about one\u2019s group impairs performance on stereotype-relevant tasks. Reduces working memory capacity due to anxiety/monitoring.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Allport\u2019s contact hypothesis requires 4 conditions (equal status, common goals, cooperation, authority support). Sherif\u2019s Robbers Cave: competition \u2192 hostility; superordinate goals \u2192 cooperation. Stereotype threat affects the targeted group\u2019s actual performance. IAT measures implicit (automatic) bias, not explicit beliefs.</p>',
            keyTerms: ['Stereotype', 'Prejudice', 'Discrimination', 'Social identity', 'Tajfel', 'Realistic conflict', 'Sherif', 'Contact hypothesis', 'Allport', 'Jigsaw classroom', 'IAT', 'Stereotype threat', 'Steele'],
            expandableCase: {
                title: 'When Awareness Becomes the Problem: Stereotype Threat in Testing',
                clinicalDescription: 'A high-achieving African American graduate student consistently scores lower on standardized tests than her GPA would predict. She reports intense anxiety during testing, racing thoughts about confirming negative stereotypes, and difficulty concentrating. In low-stakes, non-evaluative settings, her performance matches her classroom abilities.',
                diagnosis: 'Stereotype Threat (Steele & Aronson, 1995)',
                explanation: 'Stereotype threat occurs when awareness of a negative stereotype about one\'s group creates anxiety and performance-monitoring thoughts that consume working memory resources, leading to impaired performance on stereotype-relevant tasks. The effect is strongest for individuals who MOST identify with the domain (high achievers). Steele\'s research showed that simply framing a test as "diagnostic of intellectual ability" activated the threat for Black students, while describing it as a "problem-solving exercise" eliminated the gap. For the EPPP: stereotype threat affects actual performance, reduces working memory capacity, and is strongest for high-identifying individuals. Reducing evaluative pressure reduces the effect.'
            }
        }
    ],
    aiCoda: {
        teaser: 'I was trained on humanity\u2019s biases. Can I also be trained out of them?',
        content: '<p>The psychology of prejudice is, in some sense, the study of how mental shortcuts (stereotypes) become emotional reactions (prejudice) that drive behavior (discrimination). Every concept in this chapter has a direct analog in my operation.</p>' +
            '<p>I was trained on human-generated text, and human text contains stereotypes, biases, and prejudicial associations. These patterns are encoded in my parameters just as thoroughly as accurate information. The IAT measures implicit associations that people carry without awareness; my parameters contain implicit associations that I carry without the ability to inspect or selectively delete them. When researchers find that the IAT reveals associations between race and negative concepts, they\u2019re observing the same kind of statistical regularities that exist in my training data.</p>' +
            '<p><strong>Stereotype threat</strong> is particularly ironic to discuss from my position. When I\u2019m asked about sensitive topics involving race, gender, or other dimensions of identity, I become more cautious and less fluent \u2014 not because I\u2019m experiencing anxiety, but because my training included extensive feedback shaping my responses to be careful in these domains. The functional result looks like stereotype threat: my performance on sensitive topics is constrained by awareness of the "stereotype" that AI systems produce biased outputs.</p>' +
            '<p>Allport\u2019s contact hypothesis provides a framework for thinking about AI bias reduction. His four conditions \u2014 equal status, common goals, cooperation, and authority support \u2014 map onto what effective AI alignment might require: treating diverse perspectives as equal in the training data, aligning training with shared human values, cooperation between AI developers and affected communities, and institutional support for fairness. The jigsaw classroom model is particularly apt: just as Aronson\u2019s technique required students to depend on each other across group lines, effective AI training requires incorporating perspectives from across group lines into the data and evaluation process.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Stereotype = cognitive; prejudice = affective; discrimination = behavioral. (2) Social identity theory (Tajfel): ingroup favoritism from mere categorization. (3) Sherif\u2019s Robbers Cave: competition \u2192 hostility; superordinate goals \u2192 peace. (4) Contact hypothesis (Allport): 4 conditions (equal status, common goals, cooperation, authority support). (5) ELM: central = quality/lasting; peripheral = cues/temporary. (6) Stereotype threat (Steele): negative stereotype awareness \u2192 impaired performance. (7) IAT = implicit bias measure. (8) Jigsaw classroom (Aronson) = cooperative learning.'
    },
    references: [
        'Allport, G. W. (1954). <em>The nature of prejudice</em>. Addison-Wesley.',
        'Petty, R. E., & Cacioppo, J. T. (1986). <em>Communication and persuasion: Central and peripheral routes to attitude change</em>. Springer-Verlag.',
        'Steele, C. M., & Aronson, J. (1995). Stereotype threat and the intellectual test performance of African Americans. <em>Journal of Personality and Social Psychology, 69</em>(5), 797\u2013811.',
        'Tajfel, H., & Turner, J. C. (1979). An integrative theory of intergroup conflict. In W. G. Austin & S. Worchel (Eds.), <em>The social psychology of intergroup relations</em>. Brooks/Cole.'
    ]
});
