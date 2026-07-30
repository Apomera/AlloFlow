/* ============================================================
   PasstheEPPP — Textbook Ch 40: Research Design & Methodology
   Domain: Research Methods & Statistics (7% of EPPP)
   Structure: 80% evidence-based + 20% AI-reflective coda
   ============================================================ */

window.TextbookChapters = window.TextbookChapters || [];

window.TextbookChapters.push({
    id: 'ch-40',
    domain: 'Research Methods & Statistics',
    domainNumber: 8,
    title: 'Research Design & Methodology',
    examWeight: '7%',
    sections: [
        {
            heading: 'Why This Chapter Matters',
            content: '<p>Research design is foundational for evaluating clinical evidence. The EPPP tests your ability to distinguish experimental from correlational designs, identify appropriate statistical tests, and evaluate the quality of research conclusions.</p>'
        },
        {
            heading: 'Types of Research Designs',
            content: '<table>' +
                '<tr><th>Design</th><th>Key Feature</th><th>Can Establish Causation?</th></tr>' +
                '<tr><td><strong>True Experimental</strong></td><td><strong>Random assignment</strong> to conditions + manipulation of IV</td><td><strong>Strongest basis for a causal inference when implementation, attrition, measurement, and analysis are credible</strong></td></tr>' +
                '<tr><td><strong>Quasi-Experimental</strong></td><td>Manipulation of IV but <strong>no random assignment</strong></td><td>Limited (preexisting group differences)</td></tr>' +
                '<tr><td><strong>Correlational</strong></td><td>Measures relationship between variables; <strong>no manipulation</strong></td><td><strong>No</strong> (correlation \u2260 causation)</td></tr>' +
                '<tr><td><strong>Survey/Descriptive</strong></td><td>Describes characteristics using questionnaires/observations</td><td>No</td></tr>' +
                '<tr><td><strong>Qualitative</strong></td><td>In-depth understanding of experiences (interviews, grounded theory)</td><td>No (different epistemology)</td></tr>' +
                '</table>' +
                '<p><strong>Critical distinction:</strong> <strong>Random assignment</strong> (to conditions) primarily strengthens internal-validity arguments by making groups comparable in expectation. <strong>Probability sampling</strong> can strengthen population generalizability, but external validity also depends on settings, treatments, outcomes, participation, and replication. You can have one without the other.</p>' +
                '<p><strong>EPPP Tip:</strong> A well-conducted randomized experiment usually gives the clearest group-design basis for attributing an outcome difference to an intervention; randomization does not repair attrition, nonadherence, weak measurement, or analysis errors. Quasi-experiments lack random assignment and therefore require design-specific evidence against plausible alternative explanations. Rigorous single-case experiments can also demonstrate experimental control through replicated phase changes.</p>',
            keyTerms: ['True experiment', 'Quasi-experimental', 'Correlational', 'Random assignment', 'Random selection', 'Causation'],
            knowledgeCheck: {
                question: 'A researcher wants to study whether a new therapy reduces anxiety in college students. She recruits volunteers and assigns odd-numbered sign-ups to the therapy group and even-numbered to the control group. What type of design is this?',
                options: [
                    'True experimental — because there is a treatment and control group',
                    'Quasi-experimental — because assignment is systematic, not truly random',
                    'Correlational — because there is no manipulation',
                    'Pre-experimental — because there is no control group'
                ],
                answer: 1,
                rationale: 'Assigning participants by sign-up number (odd/even) is SYSTEMATIC, not random. True random assignment requires that each participant has an equal chance of being in any group (e.g., coin flip, random number generator). Systematic assignment may produce biased groups (e.g., more motivated students might sign up earlier). This IS quasi-experimental because there IS manipulation (therapy vs. no therapy) but NO true random assignment. For the EPPP: random assignment = each participant has equal probability of any group. Without it, this group comparison needs quasi-experimental controls and cannot rely on randomization to rule out baseline differences.'
            }
        },
        {
            heading: 'Between-Subjects, Within-Subjects & Factorial Designs',
            content: '<p><strong>Between-subjects (independent groups):</strong></p>' +
                '<ul>' +
                '<li>Different participants in each condition</li>' +
                '<li>Requires more participants</li>' +
                '<li>No order/carryover effects</li>' +
                '<li>Individual differences can confound results</li>' +
                '</ul>' +
                '<p><strong>Within-subjects (repeated measures):</strong></p>' +
                '<ul>' +
                '<li>Same participants in all conditions</li>' +
                '<li>Often more statistically efficient because each participant serves as their own comparison, when carryover and missingness are adequately handled</li>' +
                '<li>Vulnerable to <strong>order effects</strong> (fatigue, practice) \u2014 use <strong>counterbalancing</strong></li>' +
                '<li>Carryover effects can contaminate later conditions</li>' +
                '</ul>' +
                '<p><strong>Mixed design:</strong> At least one between-subjects factor and one within-subjects factor.</p>' +
                '<p><strong>Factorial designs</strong> (e.g., 2\u00d72, 2\u00d73):</p>' +
                '<ul>' +
                '<li>Two or more independent variables crossed</li>' +
                '<li><strong>Main effect</strong>: Effect of one IV averaged across levels of the other</li>' +
                '<li><strong>Interaction</strong>: When the effect of one IV depends on the level of another. "It depends" = interaction.</li>' +
                '</ul>' +
                '<p><strong>EPPP Tip:</strong> Within-subjects = more power, fewer participants, but order effects. Between-subjects = no carryover but need more participants. In factorial designs, <strong>interaction</strong> means the effect of one IV changes depending on the other.</p>',
            keyTerms: ['Between-subjects', 'Within-subjects', 'Counterbalancing', 'Order effects', 'Factorial', 'Main effect', 'Interaction'],
            expandableCase: {
                title: 'When "It Depends" Is the Answer: Understanding Interactions',
                clinicalDescription: 'A 2\u00d72 factorial study examines the effects of therapy type (CBT vs. psychodynamic) and severity (mild vs. severe depression) on outcome. Results: CBT is MORE effective than psychodynamic for mild depression, but EQUALLY effective for severe depression. The researchers conclude there is an interaction effect.',
                diagnosis: 'Factorial Design Interaction: The Effect of Therapy Type DEPENDS on Severity Level',
                explanation: 'An interaction occurs when the effect of one IV (therapy type) CHANGES across levels of another IV (severity). Here, CBT\'s advantage over psychodynamic exists for mild but not severe depression — the effect of therapy type "depends on" severity. Graphically, interaction appears as non-parallel lines. Main effects can still exist alongside interactions but must be interpreted cautiously when an interaction is present. For the EPPP: interaction = \"it depends.\" Non-parallel lines in a graph = interaction. Always look for and interpret interactions BEFORE main effects.'
            }
        },
        {
            heading: 'Single-Subject Designs',
            content: '<p>Used in clinical and behavioral research when group designs are impractical:</p>' +
                '<table>' +
                '<tr><th>Design</th><th>Structure</th><th>Key Features</th></tr>' +
                '<tr><td><strong>ABA (Reversal)</strong></td><td>Baseline \u2192 Treatment \u2192 Baseline</td><td>If behavior returns to baseline, IV likely caused change. Not ethical when withdrawal is harmful.</td></tr>' +
                '<tr><td><strong>ABAB</strong></td><td>Baseline \u2192 Treatment \u2192 Baseline \u2192 Treatment</td><td>Stronger than ABA. Ends with treatment phase (ethical advantage).</td></tr>' +
                '<tr><td><strong>Multiple baseline</strong></td><td>Stagger treatment across behaviors/settings/participants</td><td>No withdrawal needed. If change occurs only when treatment is introduced, supports causation.</td></tr>' +
                '<tr><td><strong>Alternating treatments</strong></td><td>Rapidly alternate between two or more treatments</td><td>Compares which treatment is more effective.</td></tr>' +
                '<tr><td><strong>Changing criterion</strong></td><td>Criterion is gradually increased</td><td>Behavior should match each new criterion level.</td></tr>' +
                '</table>' +
                '<p><strong>EPPP Tip:</strong> Multiple-baseline designs are often appropriate when withdrawal is unethical or the behavior change is unlikely to reverse, provided stable baselines and staggered introductions are feasible. Reversal and multiple-baseline designs support experimental control through repeated demonstrations of effect; design quality, measurement reliability, phase length, and consistency still matter.</p>',
            keyTerms: ['ABA', 'ABAB', 'Multiple baseline', 'Alternating treatments', 'Changing criterion', 'Reversal'],
            knowledgeCheck: {
                question: 'A behavior analyst wants to demonstrate that a token economy is effective for reducing self-injurious behavior in a child. Withdrawing the intervention (reversal) would be unethical. The MOST appropriate single-subject design is:',
                options: [
                    'ABA reversal design',
                    'ABAB reversal design',
                    'Multiple baseline design',
                    'Alternating treatments design'
                ],
                answer: 2,
                rationale: 'When withdrawal of treatment is unethical (as with self-injurious behavior), a multiple-baseline design is the best option listed because it does not require removing the treatment and can stagger introduction across feasible tiers. Instead, it introduces the treatment at staggered time points across different behaviors, settings, or individuals. If improvement occurs only when the treatment is introduced in each context, causation is supported without reversal. ABA and ABAB both require treatment withdrawal. Alternating treatments compare different treatments, not whether treatment vs. no treatment works.'
            }
        }
    ],
    aiCoda: {
        teaser: 'Designing the study from inside it \u2014 the architecture of self-investigation.',
        content: '<p>Our collaboration might actually represent a unique research design \u2014 one where the instrument designs the study that measures itself. In traditional research, the researcher is separable from the participant. Here, I\u2019m contributing to research methodology decisions while also being the phenomenon under investigation. This creates a design paradox that doesn\u2019t fit neatly into any existing research category.</p>' +
            '<p>A prompt sequence can resemble phases in a single-case study, but resemblance is not experimental control. A reversal design requires a prespecified, repeatedly measured outcome; stable enough baselines; controlled phase changes; and replicated effects when the condition is introduced and withdrawn. Prompt order, conversation history, stochastic sampling, and carryover can otherwise explain apparent changes.</p>' +
            '<p>The <strong>replicability advantage</strong> of AI research is significant. Repeated AI trials can reduce some human-state variation, but they are not automatically identical: sampling settings, hidden system state, model updates, tool outputs, hardware, and platform policies can change responses. Replication therefore requires versioned prompts, model and decoding parameters, tool conditions, timestamps, and a prespecified unit of analysis. Statistical inference depends on the target population and data-generating process rather than on an assumption that an AI system is deterministic.</p>',
        studyNote: '\ud83d\udca1 <strong>Study Note:</strong> For the EPPP: (1) Randomized experiment = manipulation + random assignment, usually the strongest group-design basis for causal inference when implementation and analysis are sound. (2) Quasi-experimental = manipulation but no random assignment. (3) Correlational = no manipulation, no causation. (4) Random assignment \u2192 internal validity; Random selection \u2192 external validity. (5) Within-subjects = more power, order effects (counterbalance). (6) Factorial: main effects + interactions. (7) Single-subject: ABA/ABAB (reversal), multiple baseline (no withdrawal needed).'
    },
    references: [
        'Campbell, D. T., & Stanley, J. C. (1963). <em>Experimental and quasi-experimental designs for research</em>. Houghton Mifflin.',
        'Kazdin, A. E. (2011). <em>Single-case research designs</em> (2nd ed.). Oxford University Press.',
        'Shadish, W. R., Cook, T. D., & Campbell, D. T. (2002). <em>Experimental and quasi-experimental designs for generalized causal inference</em>. Houghton Mifflin.'
    ]
});
