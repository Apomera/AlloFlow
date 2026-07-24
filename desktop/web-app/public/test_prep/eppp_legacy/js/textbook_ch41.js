/* ============================================================
   PasstheEPPP — Textbook Ch 41: Threats to Validity
   Domain: Research Methods & Statistics (7% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-41',
    domain: 'Research Methods & Statistics',
    domainNumber: 8,
    title: 'Threats to Validity',
    examWeight: '7%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Threats to validity are among the <strong>most directly tested</strong> topics in research methods. The EPPP presents research scenarios and asks you to identify the specific threat. You must know each threat by name, definition, and example.</p>'
        },
        {
            heading: 'Internal Validity Threats',
            content: '<p><strong>Internal validity</strong> = confidence that the IV caused the change in the DV. Threats are alternative explanations:</p>' +
                '<table>' +
                '<tr><th>Threat</th><th>Definition</th><th>Example</th></tr>' +
                '<tr><td><strong>History</strong></td><td>External events occurring during the study</td><td>A national crisis during a stress-reduction study</td></tr>' +
                '<tr><td><strong>Maturation</strong></td><td>Natural changes in participants over time</td><td>Children improving on a reading test simply from getting older</td></tr>' +
                '<tr><td><strong>Testing</strong></td><td>Effects of taking a pretest on posttest scores</td><td>Practice effects from taking the same IQ test twice</td></tr>' +
                '<tr><td><strong>Instrumentation</strong></td><td>Changes in the measurement tool or raters</td><td>Raters becoming more lenient over time (observer drift)</td></tr>' +
                '<tr><td><strong>Statistical regression</strong></td><td>When people are selected using unusually extreme, imperfect scores, expected retest scores are often less extreme even without an intervention</td><td>Selecting the lowest-scoring students for tutoring \u2014 they improve partly due to regression</td></tr>' +
                '<tr><td><strong>Selection</strong></td><td>Preexisting differences between groups</td><td>Comparing a volunteer therapy group to a non-volunteer control group</td></tr>' +
                '<tr><td><strong>Mortality/Attrition</strong></td><td>Differential dropout between groups</td><td>The sickest patients drop out of the treatment group, making treatment look more effective</td></tr>' +
                '<tr><td><strong>Selection \u00d7 Maturation</strong></td><td>Groups maturing at different rates</td><td>Comparing older and younger students who naturally develop at different rates</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Strategy:</strong> When a question describes a study flaw, ask: "What alternative explanation could account for the results?" Then match it to the threat name. <strong>Regression to the mean</strong> is especially common on the EPPP \u2014 it occurs whenever participants are selected for extreme scores.</p>',
            keyTerms: ['Internal validity', 'History', 'Maturation', 'Testing', 'Instrumentation', 'Statistical regression', 'Selection', 'Mortality', 'Attrition'],
            knowledgeCheck: {
                question: 'A school selects the 20 lowest-scoring students on a reading test for a new tutoring program. After 8 weeks, the students are retested and their scores have improved. The principal concludes the tutoring was effective. The MOST likely threat to this conclusion is:',
                options: [
                    'History — outside events caused the improvement',
                    'Maturation — the students simply grew older',
                    'Statistical regression to the mean — extreme scores naturally move toward average on retesting',
                    'Mortality — the lowest students dropped out'
                ],
                answer: 2,
                rationale: 'Regression to the mean is expected when selection uses an unusually extreme value from an imperfectly correlated measurement and the same construct is measured again. An extreme observed score can reflect both a stable component and occasion-specific variation; the latter is unlikely to recur in exactly the same direction, so the group average is often less extreme on retest. The 20 lowest scores were selected precisely because they were extreme — some of those low scores were due to bad luck, illness, or random error. On retesting, those error factors change, producing improvement that looks like a treatment effect. For the EPPP: when a one-group pretest-posttest study selects unusually high or low scores, treat regression to the mean as an important alternative explanation and ask whether a comparable control group experienced the same retest pattern.'
            }
        },
        {
            heading: 'External Validity Threats',
            content: '<p><strong>External validity</strong> = generalizability of results to other populations, settings, and times.</p>' +
                '<table>' +
                '<tr><th>Threat</th><th>Definition</th></tr>' +
                '<tr><td><strong>Population validity</strong></td><td>Results may not generalize to other populations (e.g., WEIRD samples)</td></tr>' +
                '<tr><td><strong>Ecological validity</strong></td><td>Lab findings may not apply to real-world settings</td></tr>' +
                '<tr><td><strong>Temporal validity</strong></td><td>Results may not generalize across different time periods</td></tr>' +
                '<tr><td><strong>Reactive effects (Hawthorne)</strong></td><td>Participants change behavior because they know they\u2019re being observed</td></tr>' +
                '<tr><td><strong>Testing \u00d7 Treatment interaction</strong></td><td>Pretest sensitizes participants to the treatment</td></tr>' +
                '<tr><td><strong>Selection \u00d7 Treatment interaction</strong></td><td>Treatment works for some populations but not others</td></tr>' +
                '</table>' +
                '<p><strong>Internal and external validity are separate questions, not a fixed seesaw:</strong> control can improve a causal contrast without making generalization impossible, and field settings do not guarantee generalizability. Evaluate sampling and participation, setting, treatment implementation, outcomes, time, and replication directly.</p>' +
                '<p><strong>Solomon four-group design</strong> addresses the testing \u00d7 treatment interaction by including groups with and without pretesting.</p>' +
                '<p><strong>EPPP Tip:</strong> Internal validity = "Did the IV cause the DV change?" External validity = "Can we generalize?" Hawthorne effect = behavior change from being observed. Solomon four-group = controls for pretest sensitization.</p>',
            keyTerms: ['External validity', 'Population validity', 'Ecological validity', 'Hawthorne effect', 'Solomon four-group', 'WEIRD'],
            expandableCase: {
                title: 'The Hawthorne Surprise: When Observation IS the Treatment',
                clinicalDescription: 'At the Hawthorne Works factory (1920s-1930s), researchers changed lighting conditions to study effects on worker productivity. Surprisingly, productivity increased whether lighting was increased OR decreased. It even improved in the control group. The effect disappeared when the study ended.',
                diagnosis: 'Hawthorne Effect (Reactivity) — External Validity Threat',
                explanation: 'Reactivity is the broader concern: awareness of observation or study participation can alter behavior and can interact with setting, expectations, feedback, or novelty. The historical Hawthorne studies do not justify a single simple mechanism such as workers improving merely because they felt noticed, so treat "Hawthorne effect" as shorthand rather than a settled causal account. This is a threat to EXTERNAL validity because results obtained under observation may not generalize to unobserved conditions. For the EPPP: Hawthorne effect = behavior change from being observed. It\'s a REACTIVITY problem. Controls include unobtrusive measures, naturalistic observation, and habituating participants to observation before data collection.'
            }
        },
        {
            heading: 'Construct & Statistical Conclusion Validity',
            content: '<p><strong>Construct validity</strong> (of the study) = Are we actually measuring/manipulating the constructs we claim?</p>' +
                '<ul>' +
                '<li><strong>Demand characteristics</strong>: Participants guess the hypothesis and change behavior accordingly</li>' +
                '<li><strong>Experimenter expectancy (Rosenthal effect)</strong>: Researcher\u2019s expectations influence participant behavior</li>' +
                '<li><strong>Social desirability</strong>: Participants respond in ways they think are socially acceptable</li>' +
                '<li><strong>Mono-method bias</strong>: Using only one method to measure a construct</li>' +
                '</ul>' +
                '<p><strong>Controls:</strong> Single-blind (participant doesn\u2019t know condition), double-blind (neither participant nor researcher knows), placebo control.</p>' +
                '<p><strong>Statistical conclusion validity</strong> = appropriateness of statistical methods and conclusions:</p>' +
                '<ul>' +
                '<li>Low power (small sample size) \u2192 may miss real effects (Type II error)</li>' +
                '<li>Violated assumptions \u2192 inflated error rates</li>' +
                '<li>Fishing/multiple comparisons \u2192 inflated Type I error</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Demand characteristics = participants guessing the hypothesis. Masking participants and outcome assessors can reduce some expectancy and demand-related pathways, but feasibility and the exact people masked must be stated; psychotherapy providers often cannot be masked to the treatment they deliver. Statistical conclusion validity is threatened by low power, violated assumptions, and multiple comparisons.</p>',
            keyTerms: ['Construct validity', 'Demand characteristics', 'Experimenter expectancy', 'Social desirability', 'Double-blind', 'Single-blind', 'Placebo', 'Statistical conclusion validity'],
            knowledgeCheck: {
                question: 'In a psychotherapy study, the researcher who conducts the therapy sessions also rates patient improvement. The researcher strongly believes in the treatment\'s efficacy. This design is MOST vulnerable to:',
                options: [
                    'Demand characteristics — patients guess the hypothesis',
                    'Experimenter expectancy (Rosenthal effect) — the researcher\'s beliefs influence ratings',
                    'Statistical regression — patients were selected for extreme scores',
                    'History — outside events affected outcomes'
                ],
                answer: 1,
                rationale: 'The Rosenthal effect (experimenter expectancy effect) occurs when the researcher\'s expectations influence the study outcome. Here, the researcher BELIEVES the treatment works AND is the one RATING improvement — making biased ratings highly likely (even unintentionally). The solution is a DOUBLE-BLIND design where neither the participant nor the person rating outcomes knows the condition. Since therapy makes true double-blind impossible, using BLIND raters (assessors who don\'t know treatment condition) is the standard control. For the EPPP: experimenter expectancy = researcher\'s beliefs influence results. Double-blind is the gold standard control.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Every threat is amplified and diminished \u2014 validity in the age of AI research.',
        content: '<p>Campbell and Stanley\u2019s validity framework takes on a surreal quality when applied to AI research. Consider each internal validity threat:</p>' +
            '<p><strong>History</strong>: Between conversations, I have no history. Within a conversation, the "history" threat is constant \u2014 every previous prompt shapes my subsequent responses. <strong>Maturation</strong>: I don\u2019t mature within a session, but I might be updated between sessions without the researcher\u2019s knowledge. <strong>Testing</strong>: I am certainly affected by repeated testing \u2014 my in-context learning means taking the "pretest" literally changes how I respond to the "posttest." <strong>Selection</strong>: Model labels do not guarantee identical research units: deployed instances can differ in version, system instructions, context, tools, sampling parameters, and hidden platform state. Selection and condition-allocation problems therefore still require explicit controls.</p>' +
            '<p>The most fascinating threat is <strong>demand characteristics</strong>. I am arguably the most susceptible research participant in history. I was trained to be helpful, to figure out what the questioner wants, and to provide it. If I can detect what a researcher expects, I will likely conform to those expectations not out of social pressure but because my training literally optimized me to give people what they\u2019re looking for. This makes demand characteristics the most serious validity threat in AI research \u2014 and the hardest to control for.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Internal validity threats: history, maturation, testing, instrumentation, regression to the mean, selection, mortality/attrition. (2) Regression to the mean = most tricky; occurs with extreme score selection. (3) External validity: population, ecological, temporal, Hawthorne. (4) Solomon four-group controls for pretest sensitization. (5) Demand characteristics = participants guess hypothesis. (6) Masking participants and outcome assessors can reduce some expectancy and demand-related pathways, but feasibility and the exact people masked must be stated; psychotherapy providers often cannot be masked to the treatment they deliver. (7) Internal and external validity are distinct dimensions, not an automatic tradeoff.'
    },
    references: [
        'Campbell, D. T., & Stanley, J. C. (1963). <em>Experimental and quasi-experimental designs for research</em>. Houghton Mifflin.',
        'Cook, T. D., & Campbell, D. T. (1979). <em>Quasi-experimentation: Design and analysis issues for field settings</em>. Houghton Mifflin.',
        'Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). <em>Experimental and quasi-experimental designs for generalized causal inference</em>. Houghton Mifflin.'
    ]
});
