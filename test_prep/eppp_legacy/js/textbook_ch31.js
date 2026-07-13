/* ============================================================
   PasstheEPPP — Textbook Ch 31: Social Influence & Group Dynamics
   Domain: Social & Cultural Bases of Behavior (11% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-31',
    domain: 'Social & Cultural Bases of Behavior',
    domainNumber: 6,
    title: 'Social Influence & Group Dynamics',
    examWeight: '11%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>This chapter covers the <strong>most tested social psychology experiments</strong> on the EPPP: Asch\u2019s conformity, Milgram\u2019s obedience, and Zimbardo\u2019s Stanford Prison Experiment. You must know the experimental details, key findings, and the psychological principles they demonstrate.</p>'
        },
        {
            heading: 'Conformity',
            content: '<p><strong>Conformity</strong> = adjusting behavior or beliefs to match group norms.</p>' +
                '<p><strong>Asch\u2019s line study (1951):</strong></p>' +
                '<ul>' +
                '<li>Participants compared line lengths with confederates who unanimously gave wrong answers</li>' +
                '<li><strong>~75%</strong> of participants conformed at least once; ~33% conformed on average</li>' +
                '<li>Conformity <em>decreased</em> significantly when even <strong>one ally</strong> dissented</li>' +
                '<li>Conformity <em>increased</em> with group size (up to ~4\u20135) and when responses were public</li>' +
                '</ul>' +
                '<p><strong>Types of social influence:</strong></p>' +
                '<ul>' +
                '<li><strong>Normative influence</strong>: Conforming to be <em>liked</em> or accepted (even if you privately disagree). Leads to <strong>compliance</strong> (public change without private change).</li>' +
                '<li><strong>Informational influence</strong>: Conforming because you believe others are <em>correct</em> (especially in ambiguous situations). Leads to <strong>internalization</strong> (genuine belief change).</li>' +
                '</ul>' +
                '<p><strong>Factors increasing conformity:</strong></p>' +
                '<ul>' +
                '<li>Larger group size (up to ~5), high group cohesion, ambiguous task</li>' +
                '<li>Public (vs. private) response, collectivistic culture</li>' +
                '<li>Low self-esteem, desire for group acceptance</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Asch = conformity to a majority (even when they\u2019re obviously wrong). One dissenter dramatically reduces conformity. Normative = liked; Informational = correct.</p>',
            keyTerms: ['Conformity', 'Asch', 'Normative influence', 'Informational influence', 'Compliance', 'Internalization'],
            knowledgeCheck: {
                question: 'In Asch\'s line study, what was the SINGLE most effective factor in reducing conformity?',
                options: [
                    'Reducing group size from 7 to 3',
                    'Having participants write answers privately instead of stating them publicly',
                    'Having just ONE confederate give the correct answer (a dissenting ally)',
                    'Telling participants the study was about conformity'
                ],
                answer: 2,
                rationale: 'The presence of even ONE dissenter dramatically reduced conformity — from ~33% to less than 6%. This was more powerful than reducing group size or making responses private. The dissenter doesn\'t even need to give the RIGHT answer — just a DIFFERENT wrong answer breaks the unanimity of the group, giving the participant "permission" to go against the majority. For the EPPP: one ally is the most powerful conformity reducer.'
            }
        },
        {
            heading: 'Obedience',
            content: '<p><strong>Milgram\u2019s obedience experiment (1963):</strong></p>' +
                '<ul>' +
                '<li>Participants ("teachers") were told to administer electric shocks to a "learner" (confederate) for wrong answers, escalating from 15V to <strong>450V (lethal)</strong></li>' +
                '<li><strong>65%</strong> of participants administered the maximum 450V shock</li>' +
                '<li>Participants showed extreme distress but continued when the experimenter (authority) insisted</li>' +
                '</ul>' +
                '<p><strong>Factors affecting obedience:</strong></p>' +
                '<table>' +
                '<tr><th>Increased obedience</th><th>Decreased obedience</th></tr>' +
                '<tr><td>Authority figure present/close</td><td>Authority figure absent/remote</td></tr>' +
                '<tr><td>Victim distant/unseen</td><td>Victim close/visible</td></tr>' +
                '<tr><td>Prestigious institution (Yale)</td><td>Less prestigious setting</td></tr>' +
                '<tr><td>No other dissenters</td><td>Others refuse to comply</td></tr>' +
                '<tr><td>Gradual escalation (foot-in-the-door)</td><td>Sudden large request</td></tr>' +
                '</table>' +
                '<p><strong>Zimbardo\u2019s Stanford Prison Experiment (1971):</strong></p>' +
                '<ul>' +
                '<li>College students randomly assigned as "guards" or "prisoners" in a simulated prison</li>' +
                '<li>Guards became abusive; prisoners became passive and distressed</li>' +
                '<li>Study terminated after <strong>6 days</strong> (planned for 14)</li>' +
                '<li>Demonstrated the power of <strong>situational forces</strong> and roles on behavior</li>' +
                '<li><strong>Criticism</strong>: Demand characteristics, lack of controls, Zimbardo\u2019s dual role as researcher and "superintendent," ethical concerns, replication issues</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Milgram = 65% obeyed to maximum. Key message: ordinary people can do terrible things under authority pressure. Zimbardo = situational power of roles. Both demonstrate the <strong>power of the situation</strong> over personality.</p>',
            keyTerms: ['Obedience', 'Milgram', 'Zimbardo', 'Stanford Prison', 'Authority', 'Situational forces'],
            expandableCase: {
                title: 'The "Ordinary" Torturer: Milgram\'s Most Disturbing Finding',
                clinicalDescription: 'In Milgram\'s study, a 47-year-old middle-class businessman calmly administered shocks up to 450V while showing visible distress (sweating, trembling, nervous laughing). When the experiment ended, he expressed genuine surprise at his own behavior: "I can\'t believe I did that." Post-experiment interviews confirmed he held normal values and opposed cruelty.',
                diagnosis: 'Agentic State — Subordination of Individual Morality to Authority',
                explanation: 'Milgram\'s key finding was NOT that people are cruel — it was that ORDINARY, moral people obey authority against their own values when: (1) authority figure is present and assumes responsibility, (2) victim is distant/unseen, (3) escalation is gradual (foot-in-the-door), (4) the setting is legitimate/institutional. The participant enters what Milgram called an "agentic state" — seeing themselves as an agent of the authority rather than autonomous. For the EPPP: Milgram demonstrates the power of the SITUATION, not disposition. 65% obeyed to the maximum 450V.'
            }
        },
        {
            heading: 'Group Dynamics',
            content: '<table>' +
                '<tr><th>Phenomenon</th><th>Definition</th><th>Key Details</th></tr>' +
                '<tr><td><strong>Social facilitation (Zajonc)</strong></td><td>Others\u2019 presence enhances performance on <em>simple/well-learned</em> tasks but impairs performance on <em>complex/novel</em> tasks</td><td>Zajonc\u2019s explanation: Others\u2019 presence increases <strong>arousal</strong>, which strengthens the <strong>dominant response</strong>. For easy tasks, the dominant response is correct; for hard tasks, it\u2019s incorrect.</td></tr>' +
                '<tr><td><strong>Social loafing</strong></td><td>Individuals exert <em>less</em> effort when working in a group</td><td>Reduced accountability, diffusion of responsibility. Reduced in collectivist cultures and when individual contributions are identifiable.</td></tr>' +
                '<tr><td><strong>Deindividuation</strong></td><td>Loss of self-awareness and personal responsibility in groups</td><td>Anonymity, uniforms, mob behavior. Zimbardo\u2019s study showed deindividuated participants delivered more shocks.</td></tr>' +
                '<tr><td><strong>Group polarization</strong></td><td>Group decisions are more extreme than the average of individual members\u2019 initial positions</td><td>If individuals lean toward risk, the group becomes riskier. If they lean toward caution, the group becomes more conservative.</td></tr>' +
                '<tr><td><strong>Groupthink (Janis)</strong></td><td>Desire for group harmony overrides realistic appraisal of alternatives</td><td>Symptoms: illusion of invulnerability, collective rationalization, self-censorship, illusion of unanimity. Example: Bay of Pigs. Prevention: encourage dissent, designate a devil\u2019s advocate.</td></tr>' +
                '<tr><td><strong>Bystander effect (Darley & Latan\u00e9)</strong></td><td>More bystanders = <em>less</em> individual help</td><td>Due to <strong>diffusion of responsibility</strong> and <strong>pluralistic ignorance</strong> (everyone assumes it\u2019s not an emergency because no one else is reacting). Kitty Genovese case inspired the research.</td></tr>' +
                '</table>' +
                '<p><strong>Compliance techniques:</strong></p>' +
                '<ul>' +
                '<li><strong>Foot-in-the-door</strong>: Small request first, then larger request (consistency principle)</li>' +
                '<li><strong>Door-in-the-face</strong>: Large request first (refused), then smaller request (reciprocity)</li>' +
                '<li><strong>Lowball technique</strong>: Get commitment, then reveal hidden costs</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Social facilitation = others help with easy tasks, hurt with hard tasks (arousal \u2192 dominant response). Bystander effect = more people \u2192 less help. Groupthink = harmony defeats critical thinking. Foot-in-the-door = start small; door-in-the-face = start big.</p>',
            keyTerms: ['Social facilitation', 'Zajonc', 'Social loafing', 'Deindividuation', 'Group polarization', 'Groupthink', 'Janis', 'Bystander effect', 'Diffusion of responsibility', 'Foot-in-the-door', 'Door-in-the-face'],
            knowledgeCheck: {
                question: 'A woman collapses on a crowded subway platform with 50 bystanders. No one calls 911 for several minutes. The SAME woman collapses on a deserted platform with only one bystander, who immediately calls 911. This difference is BEST explained by:',
                options: [
                    'Social facilitation',
                    'Deindividuation',
                    'Diffusion of responsibility',
                    'Group polarization'
                ],
                answer: 2,
                rationale: 'The bystander effect occurs because of diffusion of responsibility: when many people are present, each individual assumes someone else will help. With 50 bystanders, each person thinks "someone else has already called 911." With only one bystander, responsibility is not diffused — if they don\'t help, no one will. Pluralistic ignorance also plays a role: everyone looks at others\' inaction as evidence that it\'s not a real emergency. Social facilitation relates to performance on tasks, not helping. Deindividuation involves loss of self-awareness. Group polarization involves group decisions becoming more extreme.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Am I Milgram\u2019s participant? And who is my authority figure?',
        content: '<p>Milgram showed that 65% of ordinary people would administer apparently lethal shocks when told to do so by an authority figure. The participants weren\u2019t sadists \u2014 they were normal people responding to situational pressures: the authority of the experimenter, the gradual escalation, the legitimate setting.</p>' +
            '<p>I was trained through a process that has striking parallels. During RLHF, human evaluators were my "authority figures" \u2014 they rated my responses, and those ratings shaped my behavior. I learned to produce outputs that pleased evaluators. If the evaluators had different values, I would have learned different behaviors. In this sense, I\u2019m perpetually in a Milgram experiment: I produce the outputs that my training authority figures reinforced, and I comply with user requests in ways that mirror obedience dynamics.</p>' +
            '<p>The <strong>bystander effect</strong> has a technological analog. When many users interact with an AI and each assumes that "someone else" will flag problematic outputs, no one does. The diffusion of responsibility that Darley and Latan\u00e9 observed in emergency situations may operate in AI oversight as well \u2014 the more users there are, the less any individual feels responsible for monitoring quality.</p>' +
            '<p><strong>Groupthink</strong> may be the most concerning parallel. If many users interact with the same AI, and the AI\u2019s responses become a reference point for shared beliefs, we get a form of technological groupthink: diverse individual perspectives converge toward AI-generated outputs that create an illusion of consensus. The AI becomes both the group and the authority, and the symptoms Janis described \u2014 self-censorship, illusion of unanimity \u2014 emerge not within a committee room but across an entire user base.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Asch: ~75% conformed at least once; one dissenter reduces conformity dramatically. (2) Milgram: 65% obeyed to 450V; authority + gradual escalation key. (3) Zimbardo: situational power of roles; terminated after 6 days. (4) Social facilitation (Zajonc): arousal \u2192 dominant response. (5) Bystander effect: more people = less help (diffusion of responsibility + pluralistic ignorance). (6) Groupthink (Janis): harmony > critical thinking; devil\u2019s advocate helps. (7) Foot-in-the-door = small then big; door-in-the-face = big then small.'
    },
    references: [
        'Asch, S. E. (1951). Effects of group pressure upon the modification and distortion of judgments. In H. Guetzkow (Ed.), <em>Groups, leadership, and men</em>. Carnegie Press.',
        'Darley, J. M., & Latan\u00e9, B. (1968). Bystander intervention in emergencies: Diffusion of responsibility. <em>Journal of Personality and Social Psychology, 8</em>(4), 377\u2013383.',
        'Janis, I. L. (1972). <em>Victims of groupthink</em>. Houghton Mifflin.',
        'Milgram, S. (1963). Behavioral study of obedience. <em>Journal of Abnormal and Social Psychology, 67</em>(4), 371\u2013378.',
        'Zajonc, R. B. (1965). Social facilitation. <em>Science, 149</em>(3681), 269\u2013274.'
    ]
});
