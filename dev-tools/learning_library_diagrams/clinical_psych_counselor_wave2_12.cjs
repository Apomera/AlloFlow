'use strict';

module.exports = {
  school_psychologist_5403: {
    diagrams: [
      {
        id: 'spsych5403-diagram-07',
        chapterId: 'sp5403-ch-01',
        domainId: 'permeating-practices',
        title: 'RIOT Ecological Problem-Solving and Multimethod Integration Cycle',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Move from an initial referral label to an operationalized baseline, RIOT ecological hypothesis testing, fidelity-monitored intervention, and transparent data integration.',
        caption:
          'An original study flow tracing problem identification, RIOT ecological inquiry, alterable-variable hypotheses, monitored intervention, and integrated reporting.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.nasponline.org/x55315.xml',
          'https://sites.ed.gov/idea/regs/b/d/300.304',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Concept flow of the RIOT ecological problem-solving cycle from referral operationalization to integrated reporting and feedback.',
          longDescription:
            'Read from left to right. The problem-solving cycle starts by translating a vague referral label into a measurable target behavior with baseline data. The team gathers multimethod RIOT evidence across instruction, curriculum, environment, and learner variables to build testable hypotheses about alterable causes. An aligned intervention is delivered with documented treatment integrity and progress monitoring. Finally, converged and discrepant evidence is synthesized in plain language with explicit uncertainty, informing ongoing problem-solving.',
          textEquivalent: [
            'Translate a broad referral label into a concrete, observable referral question with reliable baseline level and peer or benchmark context.',
            'Collect multimethod, multi-informant RIOT data through record review, interviews, observations, and targeted testing across ecological ICEL domains.',
            'Formulate testable hypotheses focused on alterable instructional, environmental, and skill variables rather than unverified internal traits.',
            'Match an evidence-based intervention to the leading hypothesis while verifying treatment integrity and charting repeated progress-monitoring data.',
            'Integrate converging and discrepant findings into an actionable psychoeducational summary that states confidence limits and guides the next cycle.',
          ],
          readingOrder: [
            'operationalize-baseline',
            'riot-ecological-gather',
            'testable-hypothesis',
            'intervention-fidelity-pm',
            'integrated-communication',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'operationalize-baseline',
              label: '1. Operationalize referral and baseline',
              detail:
                'Convert a broad referral label into an observable, measurable problem statement anchored in baseline performance and expected classroom standards.',
            },
            {
              id: 'riot-ecological-gather',
              label: '2. Gather RIOT ecological data',
              detail:
                'Triangulate record reviews, structured interviews, natural-setting observations, and targeted testing across instruction, curriculum, environment, and learner factors.',
            },
            {
              id: 'testable-hypothesis',
              label: '3. Formulate testable hypotheses',
              detail:
                'Generate competing, falsifiable explanations emphasizing alterable contextual and skill barriers before attributing difficulties solely to within-child deficits.',
            },
            {
              id: 'intervention-fidelity-pm',
              label: '4. Match intervention, fidelity, and monitoring',
              detail:
                'Select a hypothesis-aligned intervention, verify treatment integrity across sessions, and collect sensitive progress-monitoring probes to evaluate response.',
            },
            {
              id: 'integrated-communication',
              label: '5. Integrate findings and state uncertainty',
              detail:
                'Synthesize converging and conflicting data into a jargon-free psychoeducational report that clarifies remaining uncertainty and next instructional decisions.',
            },
          ],
          edges: [
            {
              id: 'baseline-to-riot',
              from: 'operationalize-baseline',
              to: 'riot-ecological-gather',
              label: 'focuses multimethod data collection',
            },
            {
              id: 'riot-to-hypothesis',
              from: 'riot-ecological-gather',
              to: 'testable-hypothesis',
              label: 'narrows alterable ecological causes',
            },
            {
              id: 'hypothesis-to-intervention',
              from: 'testable-hypothesis',
              to: 'intervention-fidelity-pm',
              label: 'guides targeted intervention and checks',
            },
            {
              id: 'intervention-to-report',
              from: 'intervention-fidelity-pm',
              to: 'integrated-communication',
              label: 'supplies response and fidelity evidence',
            },
            {
              id: 'report-to-baseline',
              from: 'integrated-communication',
              to: 'operationalize-baseline',
              label: 'refines targets for the next review cycle',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'spsych5403-diagram-08',
        chapterId: 'sp5403-ch-04',
        domainId: 'student-level-services',
        title: 'Skill-Matched Academic Intervention, Access Support, and Progress Flow',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Connect academic error analysis to explicit instruction, proper distinction among differentiation, accommodation, and modification, self-regulation fading, and goal-line decisions.',
        caption:
          'An original study flow linking diagnostic error analysis, explicit skill instruction, access supports, self-monitoring, and data-based progress decisions.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.nasponline.org/x55315.xml',
          'https://ies.ed.gov/ncee/wwc/PracticeGuide/12',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Academic support flow from skill error analysis through explicit instruction, access distinctions, and self-regulation to goal-line decision rules.',
          longDescription:
            'Read from left to right. Effective academic intervention starts with diagnostic error analysis to distinguish skill deficits from performance or fluency barriers. Educators deliver explicit modeling and guided practice matched to the specific skill. Teams preserve grade-level rigor by distinguishing differentiation and accommodations from curriculum modifications. Measurable goals incorporate self-monitoring and planned prompt fading, while trend lines against a goal line drive evidence-based decision rules.',
          textEquivalent: [
            'Conduct targeted error analysis to identify specific decoding, fluency, comprehension, math, or writing breakdowns and separate skill from performance deficits.',
            'Deliver evidence-based explicit instruction featuring clear modeling, guided practice with immediate corrective feedback, and cumulative review.',
            'Distinguish flexible differentiation and construct-preserving accommodations from modifications that alter grade-level learning expectations.',
            'Pair measurable academic goals with student self-monitoring, strategy cues, and systematic prompt fading to build independent transfer.',
            'Compare repeated progress-monitoring data points against the aim line using preset decision rules to intensify, adjust, or fade supports.',
          ],
          readingOrder: [
            'diagnostic-error-analysis',
            'explicit-instruction-match',
            'access-vs-modification',
            'self-regulation-fading',
            'goal-line-decision-rule',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'diagnostic-error-analysis',
              label: '1. Skill-specific error analysis',
              detail:
                'Inspect work samples and curriculum-based probes to pinpoint exact prerequisite skill gaps, fluency bottlenecks, or strategy errors rather than global low scores.',
            },
            {
              id: 'explicit-instruction-match',
              label: '2. Explicit instruction and guided practice',
              detail:
                'Select evidence-based routines with clear teacher modeling, scaffolded guided practice, high response opportunities, and immediate corrective feedback.',
            },
            {
              id: 'access-vs-modification',
              label: '3. Differentiate access vs. modification',
              detail:
                'Apply instructional differentiation and accommodations that remove access barriers without lowering standards, reserving modifications for teams changing expectations.',
            },
            {
              id: 'self-regulation-fading',
              label: '4. Measurable goals and self-regulation',
              detail:
                'Embed self-monitoring checklists, goal tracking, and planned prompt fading so academic gains generalize to independent classroom tasks.',
            },
            {
              id: 'goal-line-decision-rule',
              label: '5. Goal-line review and decision rules',
              detail:
                'Chart repeated probes against the goal line and apply team decision rules after verifying fidelity to adapt instruction, raise targets, or fade scaffolds.',
            },
          ],
          edges: [
            {
              id: 'error-to-explicit',
              from: 'diagnostic-error-analysis',
              to: 'explicit-instruction-match',
              label: 'pinpoints target skill for direct teaching',
            },
            {
              id: 'explicit-to-access',
              from: 'explicit-instruction-match',
              to: 'access-vs-modification',
              label: 'pairs core rigor with appropriate access supports',
            },
            {
              id: 'access-to-selfreg',
              from: 'access-vs-modification',
              to: 'self-regulation-fading',
              label: 'builds independent strategy use and fading',
            },
            {
              id: 'selfreg-to-goalline',
              from: 'self-regulation-fading',
              to: 'goal-line-decision-rule',
              label: 'tracks mastery slope against aim line',
            },
            {
              id: 'goalline-to-error',
              from: 'goal-line-decision-rule',
              to: 'diagnostic-error-analysis',
              label: 'triggers re-analysis when growth stalls',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'spsych5403-diagram-09',
        chapterId: 'sp5403-ch-05',
        domainId: 'student-level-services',
        title: 'Tiered School Mental Health Continuum and Mechanism-Matched Care',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Connect primary, secondary, and tertiary behavioral health supports with trauma-informed risk-protective analysis, safety triage, counseling mechanisms, and outcome monitoring.',
        caption:
          'An original study flow organizing tiered mental health promotion, risk-protective appraisal, safety screening, mechanism-matched counseling, and maintenance or referral.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.nasponline.org/x55315.xml',
          'https://www.nasponline.org/standards-and-certification/professional-ethics',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Vertical flow of tiered school mental health services from primary prevention and trauma-informed appraisal to safety triage, mechanism-matched counseling, and outcome maintenance.',
          longDescription:
            'Read from top to bottom. School mental health begins with primary prevention and social-emotional promotion across all students, escalating to secondary and tertiary care by need. Clinicians weigh risk and protective factors through a trauma-informed lens, conduct immediate safety assessment and differential hypothesis testing when concerns emerge, select brief counseling mechanisms such as cognitive behavioral, person-centered, or solution-focused approaches to fit the presenting mechanism, and evaluate outcomes for maintenance, generalization, or external referral.',
          textEquivalent: [
            'Establish a public-health continuum spanning primary prevention for all students, secondary targeted groups, and tertiary individualized supports.',
            'Evaluate cumulative risk factors alongside personal, family, and school protective factors using trauma-informed safety and predictability practices.',
            'Screen promptly for suicide, self-harm, abuse, or acute distress while forming differential hypotheses rather than jumping to premature clinical labels.',
            'Match counseling mechanisms such as person-centered alliance, cognitive behavioral skill building, or solution-focused goal work to the student need and developmental level.',
            'Track functional school outcomes to reinforce maintenance and generalization or coordinate warm external referrals when clinical intensity exceeds school scope.',
          ],
          readingOrder: [
            'prevention-promotion-tier',
            'risk-protective-trauma',
            'safety-differential-triage',
            'mechanism-matched-counseling',
            'outcome-referral-maintenance',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'top-to-bottom',
          nodes: [
            {
              id: 'prevention-promotion-tier',
              label: '1. Continuum from promotion to intensive care',
              detail:
                'Anchor school mental health in universal primary prevention and school climate, layering secondary targeted skill groups and tertiary individualized care as needed.',
            },
            {
              id: 'risk-protective-trauma',
              label: '2. Risk, protective, and trauma-informed lens',
              detail:
                'Balance attention to environmental stressors and trauma triggers with active mobilization of student strengths, trusted adult relationships, and predictable routines.',
            },
            {
              id: 'safety-differential-triage',
              label: '3. Safety assessment and differential hypotheses',
              detail:
                'Prioritize immediate safety assessment when risk indicators arise, then test competing developmental, contextual, and emotional hypotheses without over-pathologizing.',
            },
            {
              id: 'mechanism-matched-counseling',
              label: '4. Counseling theories as active mechanisms',
              detail:
                'Select brief school-based methods by mechanism: person-centered rapport for trust, cognitive behavioral practice for anxiety or mood, and solution-focused scaling for goal activation.',
            },
            {
              id: 'outcome-referral-maintenance',
              label: '5. Outcome evaluation, maintenance, or referral',
              detail:
                'Monitor attendance, coping, and classroom functioning to plan skill maintenance and booster fading, or initiate consented warm handoffs for intensive community care.',
            },
          ],
          edges: [
            {
              id: 'tier-to-risk',
              from: 'prevention-promotion-tier',
              to: 'risk-protective-trauma',
              label: 'frames needs within protective school ecology',
            },
            {
              id: 'risk-to-safety',
              from: 'risk-protective-trauma',
              to: 'safety-differential-triage',
              label: 'prompts immediate risk triage when signs appear',
            },
            {
              id: 'safety-to-mechanism',
              from: 'safety-differential-triage',
              to: 'mechanism-matched-counseling',
              label: 'matches brief school counseling mechanism to need',
            },
            {
              id: 'mechanism-to-outcome',
              from: 'mechanism-matched-counseling',
              to: 'outcome-referral-maintenance',
              label: 'verifies functional gains or triggers escalation',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'spsych5403-diagram-10',
        chapterId: 'sp5403-ch-09',
        domainId: 'systems-level-services',
        title: 'Reciprocal Family-School-Community Partnership and Wraparound Flow',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Build culturally responsive family partnerships by honoring family systems strengths, removing access barriers, co-designing acceptable home supports, and coordinating wraparound transitions.',
        caption:
          'An original study flow depicting strengths-based family engagement, language and scheduling access, feasible caregiver coaching, and consented interagency wraparound.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.nasponline.org/x55315.xml',
          'https://www.nasponline.org/standards-and-certification/professional-ethics',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Partnership flow from family systems strengths and access removal through co-designed home coaching to wraparound and transition coordination.',
          longDescription:
            'Read from left to right. Collaboration starts by approaching families as reciprocal experts within interconnected family systems. Schools proactively remove language, transportation, and scheduling barriers using qualified interpreters and transparent communication. Caregivers and educators co-design acceptable, routine-fitting home supports with coaching. For complex cross-system needs, teams coordinate consented wraparound services and structured grade or agency transitions around shared student outcomes.',
          textEquivalent: [
            'Honor family systems dynamics, cultural values, and caregiver knowledge as reciprocal expertise rather than one-way school compliance.',
            'Eliminate participation barriers through qualified interpreters, plain-language notices, flexible meeting formats, and trustworthy two-way communication.',
            'Co-design home interventions and caregiver coaching that fit real family routines, resources, and acceptability criteria.',
            'Coordinate interagency wraparound plans with informed written consent, clear role boundaries, and unified family-centered goals.',
            'Support developmental, grade-level, and post-school transitions with student voice and ongoing monitoring of shared academic and wellbeing outcomes.',
          ],
          readingOrder: [
            'family-systems-strengths',
            'remove-access-barriers',
            'co-designed-home-support',
            'interagency-wraparound',
            'transition-shared-outcomes',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'family-systems-strengths',
              label: '1. Family systems and reciprocal expertise',
              detail:
                'Engage caregivers as co-decision-makers who hold vital knowledge of student strengths, cultural routines, and ecological stressors across home and community.',
            },
            {
              id: 'remove-access-barriers',
              label: '2. Trustworthy engagement and access',
              detail:
                'Address practical and structural barriers using qualified interpreters instead of family members, translated materials, flexible times, and respectful outreach.',
            },
            {
              id: 'co-designed-home-support',
              label: '3. Acceptable home intervention and coaching',
              detail:
                'Co-create brief, realistic home-school strategies paired with collaborative caregiver coaching so supports match family capacity and cultural acceptability.',
            },
            {
              id: 'interagency-wraparound',
              label: '4. Consented wraparound coordination',
              detail:
                'Align mental health, pediatric, juvenile, or social-service partners around one family-driven plan after securing specific written releases of information.',
            },
            {
              id: 'transition-shared-outcomes',
              label: '5. Transition continuity and shared outcomes',
              detail:
                'Center student voice during school-entry, grade-level, or secondary transitions and review shared outcome data to sustain progress across settings.',
            },
          ],
          edges: [
            {
              id: 'strengths-to-access',
              from: 'family-systems-strengths',
              to: 'remove-access-barriers',
              label: 'builds trust through equitable access',
            },
            {
              id: 'access-to-home',
              from: 'remove-access-barriers',
              to: 'co-designed-home-support',
              label: 'enables genuine caregiver co-design',
            },
            {
              id: 'home-to-wraparound',
              from: 'co-designed-home-support',
              to: 'interagency-wraparound',
              label: 'links family routines to community partners',
            },
            {
              id: 'wraparound-to-transition',
              from: 'interagency-wraparound',
              to: 'transition-shared-outcomes',
              label: 'protects continuity across key transitions',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'spsych5403-diagram-11',
        chapterId: 'sp5403-ch-10',
        domainId: 'foundations',
        title: 'Culturally Responsive Equity Safeguards Across Assessment and System Decision Points',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Apply cultural humility, bias audits at system decision points, multilingual construct-access safeguards, and disproportionality monitoring to promote fair school outcomes.',
        caption:
          'An original study flow linking cultural humility, decision-point bias checks, language-versus-disability safeguards, disproportionality audits, and equitable redesign.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.nasponline.org/x55315.xml',
          'https://sites.ed.gov/idea/regs/b/d/300.304',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Equity safeguard cycle from cultural humility and decision-point bias checks through multilingual construct access to disproportionality audits and system redesign.',
          longDescription:
            'Read from left to right. Equitable practice begins with cultural humility that treats identity as dynamic context while recognizing wide within-group variation. Teams inspect subjective high-stakes decision points for implicit and structural bias. For multilingual learners, evaluators protect construct access using trained interpreters, native-language evidence, and opportunity-to-learn reviews so language acquisition is never misidentified as disability. Schools disaggregate identification, discipline, and intervention reach data to redesign inequitable policies and re-audit outcomes.',
          textEquivalent: [
            'Practice cultural humility by exploring intersecting identities, opportunity history, and within-group variation without relying on group stereotypes.',
            'Audit high-stakes referral, screening, discipline, and eligibility decision points with structured criteria to counter implicit and institutional bias.',
            'Protect construct access for multilingual learners by assessing language proficiency, collaborating with trained interpreters, and distinguishing language acquisition from disability.',
            'Disaggregate special education identification, restrictive placement, discipline, and Tier 2 or 3 intervention reach data to detect disproportionality early.',
            'Translate equity audit findings into concrete instructional, policy, and accountability reforms and re-check decision points over time.',
          ],
          readingOrder: [
            'cultural-humility-context',
            'audit-decision-points',
            'language-construct-access',
            'disproportionality-review',
            'systemic-equity-redesign',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'cultural-humility-context',
              label: '1. Cultural humility and within-group variation',
              detail:
                'Treat cultural, racial, linguistic, socioeconomic, and disability identities as rich contextual evidence rather than fixed stereotypes or deficit assumptions.',
            },
            {
              id: 'audit-decision-points',
              label: '2. Structured bias checks at decision points',
              detail:
                'Embed objective rubrics, team accountability, and reflection at vulnerable gates including office referrals, MTSS movement, and special education referrals.',
            },
            {
              id: 'language-construct-access',
              label: '3. Language, disability, and construct access',
              detail:
                'Use trained interpreters, home-language and English proficiency profiles, and non-discriminatory IDEA safeguards to prevent language barriers from mimicking disability.',
            },
            {
              id: 'disproportionality-review',
              label: '4. Disproportionality and reach analysis',
              detail:
                'Examine disaggregated rates across identification, discipline, advanced coursework, and preventive support reach to reveal systemic opportunity gaps.',
            },
            {
              id: 'systemic-equity-redesign',
              label: '5. Policy redesign and accountability loop',
              detail:
                'Adjust universal instruction, referral procedures, and resource allocation based on equity data, then track whether disparities narrow over subsequent terms.',
            },
          ],
          edges: [
            {
              id: 'humility-to-audit',
              from: 'cultural-humility-context',
              to: 'audit-decision-points',
              label: 'prompts scrutiny of subjective gates',
            },
            {
              id: 'audit-to-language',
              from: 'audit-decision-points',
              to: 'language-construct-access',
              label: 'protects valid, unbiased assessment access',
            },
            {
              id: 'language-to-disprop',
              from: 'language-construct-access',
              to: 'disproportionality-review',
              label: 'feeds equitable data into system metrics',
            },
            {
              id: 'disprop-to-redesign',
              from: 'disproportionality-review',
              to: 'systemic-equity-redesign',
              label: 'targets root structural drivers of inequity',
            },
            {
              id: 'redesign-to-audit',
              from: 'systemic-equity-redesign',
              to: 'audit-decision-points',
              label: 'verifies fairer decisions in next review',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'spsych5403-diagram-12',
        chapterId: 'sp5403-ch-11',
        domainId: 'foundations',
        title: 'Research Appraisal, Evidence-Based Integration, and Program Evaluation Pipeline',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Connect research design strength and statistical appraisal to contextualized evidence-based practice and fidelity-tracked school program evaluation.',
        caption:
          'An original study flow moving from study design and validity appraisal to local EBP integration, theory-of-change fidelity tracking, and program evaluation.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.nasponline.org/x55315.xml',
          'https://ies.ed.gov/ncee/wwc/PracticeGuide/12',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Pipeline from study design and validity appraisal through evidence-based contextual integration to theory-of-change fidelity tracking and program evaluation.',
          longDescription:
            'Read from left to right. Critical evidence use begins by matching research designs such as randomized trials, quasi-experiments, and single-case designs to the causal claim being made. Practitioners evaluate internal validity threats, effect sizes, and confidence intervals rather than relying on p-values alone. Evidence-based practice integrates that research quality with external validity, local resources, and stakeholder values. During local rollout, program evaluation maps a clear theory of change, monitors implementation fidelity, and examines disaggregated outcomes to guide program improvement.',
          textEquivalent: [
            'Match the research design—random assignment, quasi-experiment, or single-case design—to the specific causal or descriptive question asked.',
            'Audit internal validity threats alongside practical effect sizes and confidence intervals rather than treating statistical significance as practical impact.',
            'Integrate research quality with external validity, population fit, cultural context, professional expertise, and local feasibility.',
            'Articulate a program theory of change linking inputs and activities to expected outcomes while monitoring dosage and implementation fidelity.',
            'Evaluate disaggregated short- and long-term school outcomes to decide whether to retain, adapt, expand, or discontinue the program.',
          ],
          readingOrder: [
            'match-design-to-claim',
            'appraise-validity-effects',
            'contextualize-ebp-fit',
            'logic-model-fidelity',
            'decision-focused-evaluation',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'match-design-to-claim',
              label: '1. Match research design to claim',
              detail:
                'Distinguish correlational observations from stronger causal designs—randomized trials, well-controlled quasi-experiments, and replicated single-case designs.',
            },
            {
              id: 'appraise-validity-effects',
              label: '2. Audit validity, effect sizes, and CIs',
              detail:
                'Check internal validity threats such as attrition, maturation, or selection bias, and weigh effect size magnitude and confidence interval precision over bare p-values.',
            },
            {
              id: 'contextualize-ebp-fit',
              label: '3. Integrate evidence with local fit',
              detail:
                'Combine high-quality research with external validity for the school population, cultural responsiveness, staff capacity, and family values.',
            },
            {
              id: 'logic-model-fidelity',
              label: '4. Theory of change and implementation fidelity',
              detail:
                'Define core program mechanisms, target outcomes, and implementation fidelity indicators before launch so null results can be separated from poor delivery.',
            },
            {
              id: 'decision-focused-evaluation',
              label: '5. Decision-focused program evaluation',
              detail:
                'Analyze disaggregated reach, fidelity, and student outcome evidence to guide transparent decisions to sustain, refine, scale, or retire initiatives.',
            },
          ],
          edges: [
            {
              id: 'design-to-validity',
              from: 'match-design-to-claim',
              to: 'appraise-validity-effects',
              label: 'tests causal warrant and practical magnitude',
            },
            {
              id: 'validity-to-ebp',
              from: 'appraise-validity-effects',
              to: 'contextualize-ebp-fit',
              label: 'weighs rigor against school context and equity',
            },
            {
              id: 'ebp-to-logic',
              from: 'contextualize-ebp-fit',
              to: 'logic-model-fidelity',
              label: 'translates selected practice into local rollout',
            },
            {
              id: 'logic-to-eval',
              from: 'logic-model-fidelity',
              to: 'decision-focused-evaluation',
              label: 'links verified delivery to student results',
            },
            {
              id: 'eval-to-logic',
              from: 'decision-focused-evaluation',
              to: 'logic-model-fidelity',
              label: 'refines core components and fidelity supports',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
    ],
    diagramPlacements: [
      {
        id: 'spsych5403-diagram-placement-07',
        diagramId: 'spsych5403-diagram-07',
        chapterId: 'sp5403-ch-01',
        sectionId: 'sp5403-ch-01-section-02',
        position: 'after-section-content',
        learnerPurpose:
          'Move from an initial referral label to an operationalized baseline, RIOT ecological hypothesis testing, fidelity-monitored intervention, and transparent data integration.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-08',
        diagramId: 'spsych5403-diagram-08',
        chapterId: 'sp5403-ch-04',
        sectionId: 'sp5403-ch-04-section-02',
        position: 'after-section-content',
        learnerPurpose:
          'Connect academic error analysis to explicit instruction, proper distinction among differentiation, accommodation, and modification, self-regulation fading, and goal-line decisions.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-09',
        diagramId: 'spsych5403-diagram-09',
        chapterId: 'sp5403-ch-05',
        sectionId: 'sp5403-ch-05-section-03',
        position: 'after-section-content',
        learnerPurpose:
          'Connect primary, secondary, and tertiary behavioral health supports with trauma-informed risk-protective analysis, safety triage, counseling mechanisms, and outcome monitoring.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-10',
        diagramId: 'spsych5403-diagram-10',
        chapterId: 'sp5403-ch-09',
        sectionId: 'sp5403-ch-09-section-03',
        position: 'after-section-content',
        learnerPurpose:
          'Build culturally responsive family partnerships by honoring family systems strengths, removing access barriers, co-designing acceptable home supports, and coordinating wraparound transitions.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-11',
        diagramId: 'spsych5403-diagram-11',
        chapterId: 'sp5403-ch-10',
        sectionId: 'sp5403-ch-10-section-03',
        position: 'after-section-content',
        learnerPurpose:
          'Apply cultural humility, bias audits at system decision points, multilingual construct-access safeguards, and disproportionality monitoring to promote fair school outcomes.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-12',
        diagramId: 'spsych5403-diagram-12',
        chapterId: 'sp5403-ch-11',
        sectionId: 'sp5403-ch-11-section-04',
        position: 'after-section-content',
        learnerPurpose:
          'Connect research design strength and statistical appraisal to contextualized evidence-based practice and fidelity-tracked school program evaluation.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
    ],
  },

  school_counselor_5422: {
    diagrams: [
      {
        id: 'sc5422-diagram-07',
        chapterId: 'sc5422-ch-02',
        domainId: 'define',
        title: 'Developmental, Learning, and Ecological Lenses for Student Support Design',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Synthesize psychosocial stages, cognitive scaffolding, learning mechanisms, and family-ecological context as flexible lenses for designing developmentally responsive counseling supports.',
        caption:
          'An original study flow showing how psychosocial, cognitive, learning, and ecological frameworks converge into flexible student counseling supports.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dw1272f63e/pdfs/5422.pdf',
          'https://www.schoolcounselor.org/Standards-Positions/Standards/ASCA-Professional-Standards',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Concept flow combining psychosocial stages, cognitive scaffolding, learning theories, and ecological systems into flexible counseling support design.',
          longDescription:
            'Read from left to right. School counselors integrate four complementary lenses rather than treating any single theory as a rigid label. Psychosocial theory highlights mastery and identity tasks across elementary through high school. Cognitive and sociocultural frameworks guide concrete-to-abstract scaffolding within the zone of proximal development. Behavioral, cognitive, and social learning explain reinforcement, appraisal, and modeling. Family and ecological systems anchor cultural responsiveness so supports fit the whole student context.',
          textEquivalent: [
            'Examine Erikson psychosocial tasks such as industry versus inferiority and identity versus role confusion to align counseling with competence and belonging needs.',
            'Match task abstraction to concrete or formal operational reasoning while using Vygotsky zone-of-proximal-development scaffolding.',
            'Apply behavioral reinforcement, cognitive appraisal reframing, and social-learning modeling to build self-efficacy and coping skills.',
            'Situate student behavior within family systems, peer norms, school climate, and cultural strengths rather than isolating the child.',
            'Synthesize all four lenses into flexible, strengths-based classroom, group, or individual supports without using developmental stages as rigid labels.',
          ],
          readingOrder: [
            'psychosocial-tasks',
            'cognitive-scaffolding',
            'learning-mechanisms',
            'family-ecological-context',
            'tailored-counseling-support',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'psychosocial-tasks',
              label: '1. Psychosocial stage tasks (Erikson)',
              detail:
                'Consider developmental needs for competence during industry versus inferiority in elementary years and coherent belonging during identity versus role confusion in adolescence.',
            },
            {
              id: 'cognitive-scaffolding',
              label: '2. Cognitive readiness and ZPD scaffolding',
              detail:
                'Adjust counseling language and visuals for concrete versus formal operational thinking while providing structured zone-of-proximal-development scaffolds.',
            },
            {
              id: 'learning-mechanisms',
              label: '3. Behavioral, cognitive, and social learning',
              detail:
                'Combine positive reinforcement, cognitive appraisal checks, and peer or adult modeling to strengthen adaptive habits and self-efficacy.',
            },
            {
              id: 'family-ecological-context',
              label: '4. Family systems and ecological context',
              detail:
                'Interpret student patterns through interconnected family roles, cultural values, school climate, and systemic opportunities rather than deficit assumptions.',
            },
            {
              id: 'tailored-counseling-support',
              label: '5. Flexible, non-labeling support design',
              detail:
                'Translate developmental and ecological insights into developmentally appropriate lessons, advisement, and brief interventions without treating theories as diagnoses.',
            },
          ],
          edges: [
            {
              id: 'psychosocial-to-cognitive',
              from: 'psychosocial-tasks',
              to: 'cognitive-scaffolding',
              label: 'pairs identity needs with reasoning level',
            },
            {
              id: 'cognitive-to-learning',
              from: 'cognitive-scaffolding',
              to: 'learning-mechanisms',
              label: 'guides how new skills are modeled and practiced',
            },
            {
              id: 'learning-to-ecology',
              from: 'learning-mechanisms',
              to: 'family-ecological-context',
              label: 'grounds skill transfer in family and culture',
            },
            {
              id: 'ecology-to-support',
              from: 'family-ecological-context',
              to: 'tailored-counseling-support',
              label: 'shapes responsive, strengths-based services',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'sc5422-diagram-08',
        chapterId: 'sc5422-ch-05',
        domainId: 'deliver',
        title: 'Classroom, Small-Group, Prevention, and Crisis Service Alignment',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Align universal classroom counseling lessons, screened small-group stages, power-aware bullying and risk responses, and coordinated trauma-informed crisis care.',
        caption:
          'An original study flow aligning Tier 1 classroom instruction, screened small groups, power-sensitive prevention, coordinated crisis response, and continuity follow-up.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.schoolcounselor.org/Standards-Positions/Standards/ASCA-Professional-Standards',
          'https://www.schoolcounselor.org/About-School-Counseling/Ethical-Responsibilities/ASCA-Ethical-Standards-for-School-Counselors-%281%29',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Vertical flow aligning classroom lessons, screened small groups, power-aware prevention, trauma-informed crisis response, and follow-up continuity.',
          longDescription:
            'Read from top to bottom. Proactive school counseling begins with accessible classroom instruction tied to clear objectives and guided practice. Targeted small groups rely on pre-group screening, clear norms recognizing limits of peer confidentiality, and deliberate facilitation across group stages. Prevention and intervention match the power dynamics of the concern—avoiding peer mediation for bullying while addressing anxiety or substance safety appropriately. Acute events trigger coordinated trauma-informed crisis response and postvention followed by caregiver communication and ongoing support.',
          textEquivalent: [
            'Deliver accessible Tier 1 classroom lessons with clear ASCA objectives, active guided practice, and culturally responsive engagement for all students.',
            'Form small groups through purposeful screening, caregiver consent per policy, explicit peer-confidentiality limits, and structured stage facilitation.',
            'Match prevention and intervention to the concern and power balance: use peer mediation only for mutual peer conflict, never for bullying or coercion, and prioritize safety in substance or anxiety concerns.',
            'Activate coordinated multidisciplinary crisis protocols, trauma-informed stabilization, and safe suicide postvention without glorifying or spreading risk.',
            'Maintain continuity through caregiver communication, warm community referrals when needed, and structured check-ins after acute distress subsides.',
          ],
          readingOrder: [
            'universal-classroom-lessons',
            'group-screening-stages',
            'power-aware-prevention',
            'trauma-informed-crisis',
            'safety-referral-continuity',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'top-to-bottom',
          nodes: [
            {
              id: 'universal-classroom-lessons',
              label: '1. Accessible Tier 1 classroom instruction',
              detail:
                'Teach standards-aligned academic, career, and social-emotional objectives with proactive management, guided practice, and universal access scaffolds.',
            },
            {
              id: 'group-screening-stages',
              label: '2. Screened small groups and stage leadership',
              detail:
                'Screen members for readiness and safety, clarify that peer confidentiality cannot be guaranteed, and guide forming, norming, working, and termination stages.',
            },
            {
              id: 'power-aware-prevention',
              label: '3. Match bullying, conflict, and risk responses',
              detail:
                'Distinguish balanced peer conflict suited to mediation from power-imbalanced bullying requiring adult protection, and address anxiety or substance concerns with safety-first skill support.',
            },
            {
              id: 'trauma-informed-crisis',
              label: '4. Coordinated crisis triage and postvention',
              detail:
                'Operate within the school crisis team to ensure immediate physical and psychological safety, deliver trauma-informed stabilization, and follow evidence-based postvention guidelines.',
            },
            {
              id: 'safety-referral-continuity',
              label: '5. Caregiver partnership and ongoing follow-up',
              detail:
                'Communicate appropriately with caregivers, coordinate external clinical referrals when ongoing care is needed, and monitor student re-entry and coping.',
            },
          ],
          edges: [
            {
              id: 'classroom-to-group',
              from: 'universal-classroom-lessons',
              to: 'group-screening-stages',
              label: 'identifies students needing targeted group skill practice',
            },
            {
              id: 'group-to-prevention',
              from: 'group-screening-stages',
              to: 'power-aware-prevention',
              label: 'calibrates safety rules and power-sensitive responses',
            },
            {
              id: 'prevention-to-crisis',
              from: 'power-aware-prevention',
              to: 'trauma-informed-crisis',
              label: 'escalates acute safety threats into team crisis protocol',
            },
            {
              id: 'crisis-to-continuity',
              from: 'trauma-informed-crisis',
              to: 'safety-referral-continuity',
              label: 'sustains recovery, referrals, and re-entry monitoring',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'sc5422-diagram-09',
        chapterId: 'sc5422-ch-08',
        domainId: 'manage',
        title: 'From Measurement Quality and Baseline Needs to Executable Action Plans',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Connect baseline needs assessment and annual student outcome goals to executable action plans, participation-learning-outcome evidence, and sound psychometric interpretation.',
        caption:
          'An original study flow linking baseline needs analysis, annual outcome goals, executable action plans, three data tiers, and valid score interpretation.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.schoolcounselor.org/Standards-Positions/Standards/ASCA-Professional-Standards',
          'https://ies.ed.gov/ncee/wwc/PracticeGuide/12',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Management flow from baseline needs assessment through annual outcome goals and executable action plans to three evidence types and score interpretation.',
          longDescription:
            'Read from left to right. Program management starts by reviewing disaggregated baseline data and stakeholder needs assessments. Counselors draft specific annual student outcome goals targeting closing-the-gap achievement, attendance, or discipline improvements. Action plans turn goals into executable lessons, groups, timelines, and decision points. During delivery, teams gather participation, learning (Mindsets and Behaviors), and outcome data, interpreting scores accurately using reliability, validity, and percentile rank principles before setting the next cycle baseline.',
          textEquivalent: [
            'Analyze disaggregated school achievement, attendance, and discipline baselines alongside structured needs assessments to prioritize high-impact gaps.',
            'Write measurable annual student outcome goals specifying target student group, baseline rate, realistic target change, and end date.',
            'Build an executable action plan detailing aligned ASCA standards, lesson or group sequence, calendar dates, staffing, and midpoint decision points.',
            'Collect three distinct data types: participation data (who and how much), learning data (Mindsets and Behaviors shift), and outcome data (behavior or academic change).',
            'Interpret surveys and standardized scores accurately by checking reliability, construct validity, standard error, and the true meaning of percentile ranks.',
          ],
          readingOrder: [
            'needs-baseline-audit',
            'annual-outcome-goal',
            'executable-action-plan',
            'three-data-types',
            'psychometric-interpretation',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'needs-baseline-audit',
              label: '1. Needs assessment and baseline audit',
              detail:
                'Review disaggregated school achievement, attendance, and discipline baselines alongside stakeholder needs data to identify priority student gaps.',
            },
            {
              id: 'annual-outcome-goal',
              label: '2. Annual student outcome goals',
              detail:
                'Formulate specific closing-the-gap goals naming the target cohort, verified baseline, expected improvement percentage or count, and target completion date.',
            },
            {
              id: 'executable-action-plan',
              label: '3. Executable action plan and decision points',
              detail:
                'Map lessons, small groups, indirect supports, ASCA standards, delivery schedules, and mid-course decision points so goals translate into weekly practice.',
            },
            {
              id: 'three-data-types',
              label: '4. Participation, learning, and outcome data',
              detail:
                'Distinguish who received services (participation), what mindsets or skills students gained (learning), and whether attendance, grades, or discipline shifted (outcome).',
            },
            {
              id: 'psychometric-interpretation',
              label: '5. Reliability, validity, and score precision',
              detail:
                'Avoid misreading percentile ranks as percent correct, verify instrument reliability and validity for the purpose, and communicate measurement limits accurately.',
            },
          ],
          edges: [
            {
              id: 'needs-to-goal',
              from: 'needs-baseline-audit',
              to: 'annual-outcome-goal',
              label: 'anchors targets in verified school baselines',
            },
            {
              id: 'goal-to-plan',
              from: 'annual-outcome-goal',
              to: 'executable-action-plan',
              label: 'operationalizes goals into scheduled actions',
            },
            {
              id: 'plan-to-data',
              from: 'executable-action-plan',
              to: 'three-data-types',
              label: 'specifies aligned evidence across three tiers',
            },
            {
              id: 'data-to-psychometrics',
              from: 'three-data-types',
              to: 'psychometric-interpretation',
              label: 'requires accurate score and validity checks',
            },
            {
              id: 'psychometrics-to-needs',
              from: 'psychometric-interpretation',
              to: 'needs-baseline-audit',
              label: 'updates verified baselines for next year',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'sc5422-diagram-10',
        chapterId: 'sc5422-ch-09',
        domainId: 'manage',
        title: 'Safe, Equitable Counseling Operations, Data Governance, and Communication',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Coordinate triage and caseload continuity, equitable resource allocation, privacy-first data governance, and language-accessible communication in daily counseling operations.',
        caption:
          'An original study flow linking triage and continuity planning, equitable resource reach, data minimization and access governance, and accessible communication.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.schoolcounselor.org/Standards-Positions/Standards/ASCA-Professional-Standards',
          'https://www.schoolcounselor.org/About-School-Counseling/Ethical-Responsibilities/ASCA-Ethical-Standards-for-School-Counselors-%281%29',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Operational management flow from triage and continuity through equitable resource allocation and data governance to accessible communication and professional learning.',
          longDescription:
            'Read from left to right. Daily counseling operations begin with clear triage protocols, manageable caseload planning, and continuity plans during counselor absence. Resource allocation checks service reach and equity across student subgroups. Digital platforms and student records follow data minimization, role-based access, and reidentification safeguards. Finally, a proactive communication plan ensures family language access while ongoing professional learning keeps practices ethical and current.',
          textEquivalent: [
            'Establish transparent triage criteria for urgent safety versus routine needs, protect sustainable caseload workflows, and maintain a continuity plan for absences or transitions.',
            'Allocate counseling time, funding, and Tier 1 through Tier 3 supports using equity and reach data so underserved groups receive proportional access.',
            'Govern counseling technology and student records through data minimization, role-based access permissions, secure storage, and small-cell reidentification safeguards.',
            'Maintain a proactive, language-accessible communication plan for families and staff alongside continuous professional learning aligned to evolving legal and ethical standards.',
          ],
          readingOrder: [
            'triage-caseload-continuity',
            'equitable-resource-reach',
            'tech-data-governance',
            'communication-learning',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'triage-caseload-continuity',
              label: '1. Triage, caseload, and continuity',
              detail:
                'Use clear urgency criteria to prioritize acute safety without derailing Tier 1 delivery, track caseload capacity, and maintain documented continuity plans for absences.',
            },
            {
              id: 'equitable-resource-reach',
              label: '2. Equitable resource and reach allocation',
              detail:
                'Audit who actually accesses advising, groups, and enrichment supports so time and materials close opportunity gaps rather than serving only the loudest requests.',
            },
            {
              id: 'tech-data-governance',
              label: '3. Technology and data governance',
              detail:
                'Apply data minimization, role-based permissions, FERPA-aligned record separation, and suppression of tiny subgroup cells to prevent unauthorized reidentification.',
            },
            {
              id: 'communication-learning',
              label: '4. Language access and professional learning',
              detail:
                'Share program calendars and updates through multilingual, accessible channels while pursuing targeted professional learning in ethics, technology, and equity.',
            },
          ],
          edges: [
            {
              id: 'triage-to-resource',
              from: 'triage-caseload-continuity',
              to: 'equitable-resource-reach',
              label: 'protects bandwidth for proactive equitable reach',
            },
            {
              id: 'resource-to-governance',
              from: 'equitable-resource-reach',
              to: 'tech-data-governance',
              label: 'tracks reach with privacy-first data safeguards',
            },
            {
              id: 'governance-to-comm',
              from: 'tech-data-governance',
              to: 'communication-learning',
              label: 'shares safe aggregate insights transparently',
            },
            {
              id: 'comm-to-triage',
              from: 'communication-learning',
              to: 'triage-caseload-continuity',
              label: 'improves referral clarity and team readiness',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'sc5422-diagram-11',
        chapterId: 'sc5422-ch-10',
        domainId: 'assess',
        title: 'Program Assessment, Competency Reflection, and Implementation Quality Loop',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Connect annual program and competency assessments to pre-delivery evaluation design, implementation fidelity and dosage tracking, and student-informed interpretation.',
        caption:
          'An original study flow linking program infrastructure audits, counselor competency reflection, pre-delivery evaluation alignment, fidelity tracking, and results interpretation.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.schoolcounselor.org/Standards-Positions/Standards/ASCA-Professional-Standards',
          'https://schoolcounselor.org/Standards-Positions/Position-Statements/ASCA-Position-Statements/The-School-Counselor-and-School-Counseling-Program',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Assessment quality loop from program and competency assessments through pre-delivery evaluation alignment and fidelity tracking to outcome explanation.',
          longDescription:
            'Read from left to right. Assessing quality starts with an honest program assessment showing which ASCA components are in place versus missing. Counselors pair this with a self-reflective competency assessment to set professional growth goals. Before interventions launch, teams design aligned baseline measures and preset decision rules. During delivery, logging implementation fidelity, dosage, and purposeful adaptations explains why results occurred, combining quantitative shifts with student voice to guide next priorities.',
          textEquivalent: [
            'Conduct a comprehensive program assessment to identify which counseling components are fully implemented, partial, or missing, and rank actionable priorities.',
            'Complete an annual counselor competency self-assessment to turn reflection into targeted professional growth goals.',
            'Design aligned evaluation before delivery begins by selecting baseline indicators, matched pre-post measures, and clear decision rules.',
            'Track implementation fidelity, session dosage, attendance, and documented adaptations so teams can distinguish delivery breakdown from design flaws.',
            'Interpret outcome patterns alongside implementation evidence and student voice to decide what to strengthen in the next annual assessment.',
          ],
          readingOrder: [
            'program-infrastructure-audit',
            'competency-growth-goals',
            'pre-delivery-eval-design',
            'fidelity-dosage-tracking',
            'explain-results-prioritize',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'program-infrastructure-audit',
              label: '1. Program assessment and gap priorities',
              detail:
                'Audit which ASCA program foundations, calendars, advisory councils, and delivery structures are actively in place to select realistic annual priorities.',
            },
            {
              id: 'competency-growth-goals',
              label: '2. Counselor competency self-reflection',
              detail:
                'Use the ASCA Professional Standards and Competencies assessment to pinpoint skill areas and set focused professional growth goals.',
            },
            {
              id: 'pre-delivery-eval-design',
              label: '3. Pre-delivery aligned evaluation plan',
              detail:
                'Lock in baseline metrics, directly aligned pre-post learning items, and explicit decision rules before lessons or groups begin rather than after.',
            },
            {
              id: 'fidelity-dosage-tracking',
              label: '4. Fidelity, dosage, and adaptation logs',
              detail:
                'Document whether planned sessions occurred at intended dosage and note cultural or accessibility adaptations so results are interpreted accurately.',
            },
            {
              id: 'explain-results-prioritize',
              label: '5. Explain results with student voice',
              detail:
                'Pair quantitative outcomes with implementation data and student feedback to separate strong models needing better delivery from strategies needing redesign.',
            },
          ],
          edges: [
            {
              id: 'audit-to-comp',
              from: 'program-infrastructure-audit',
              to: 'competency-growth-goals',
              label: 'aligns practitioner growth with program gaps',
            },
            {
              id: 'comp-to-design',
              from: 'competency-growth-goals',
              to: 'pre-delivery-eval-design',
              label: 'prepares rigorous baseline and measure selection',
            },
            {
              id: 'design-to-fidelity',
              from: 'pre-delivery-eval-design',
              to: 'fidelity-dosage-tracking',
              label: 'monitors whether planned delivery actually happened',
            },
            {
              id: 'fidelity-to-explain',
              from: 'fidelity-dosage-tracking',
              to: 'explain-results-prioritize',
              label: 'clarifies why target outcomes did or did not shift',
            },
            {
              id: 'explain-to-audit',
              from: 'explain-results-prioritize',
              to: 'program-infrastructure-audit',
              label: 'updates next-year program priorities',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
      {
        id: 'sc5422-diagram-12',
        chapterId: 'sc5422-ch-12',
        domainId: 'assess',
        title: 'Continuous Improvement, Transparent Reporting, and Sustainable Scaling Cycle',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Turn evaluation evidence into disciplined testable adaptations, credible transparent reporting, feasible data-based advocacy asks, and sustainable scaling.',
        caption:
          'An original study flow tracing disciplined continuous improvement, transparent stakeholder reporting, feasible data-based advocacy, and durability checks before scaling.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.schoolcounselor.org/Standards-Positions/Standards/ASCA-Professional-Standards',
          'https://ies.ed.gov/ncee/wwc/PracticeGuide/12',
        ],
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
        accessibility: {
          essentialVisualContent: false,
          shortAlt:
            'Continuous improvement cycle from decision rules and testable adaptations through transparent reporting and data-based advocacy to sustainable scaling.',
          longDescription:
            'Read from left to right. Continuous improvement uses preset decision rules to decide what to retain, stop, or test through focused adaptations. Counselors communicate both gains and unmet goals transparently without shifting goalposts, building credibility with families, staff, and advisory councils. Evidence of unmet student need fuels data-based advocacy framed around specific, feasible capacity requests. Before scaling an effective practice schoolwide, teams verify core components, local fit, and long-term sustainability.',
          textEquivalent: [
            'Apply explicit decision rules to evaluation results to decide whether to retain, discontinue, or run a small testable adaptation focused on root barriers.',
            'Report program outcomes transparently—preserving original goal definitions and explaining limitations clearly—to build stakeholder trust and shared learning.',
            'Translate disaggregated student need and outcome evidence into data-based advocacy with a concrete, feasible staffing, scheduling, or policy request.',
            'Check durability, essential core components, equity impact, and staffing sustainability before scaling a pilot across grades or campuses.',
          ],
          readingOrder: [
            'disciplined-improvement-cycle',
            'transparent-credible-reporting',
            'feasible-data-advocacy',
            'durable-sustainable-scaling',
          ],
          colorIndependent: true,
          shapeIndependentLabels: true,
          fallbackMode: 'ordered-text-equivalent',
          independentReviewStatus: 'pending',
        },
        spec: {
          format: 'alloflow-diagram-v1',
          layout: 'left-to-right',
          nodes: [
            {
              id: 'disciplined-improvement-cycle',
              label: '1. Decision rules and testable adaptations',
              detail:
                'Use agreed decision criteria to retain effective practices, stop low-yield activities, or test targeted modifications with clear success indicators.',
            },
            {
              id: 'transparent-credible-reporting',
              label: '2. Transparent reporting and goal integrity',
              detail:
                'Share both successes and shortfalls honestly with administrators, families, and advisory councils without retroactively altering targets or cherry-picking data.',
            },
            {
              id: 'feasible-data-advocacy',
              label: '3. Data-based advocacy with feasible asks',
              detail:
                'Pair compelling disaggregated equity data with realistic, capacity-aware requests for protected counseling time, training, or systemic policy changes.',
            },
            {
              id: 'durable-sustainable-scaling',
              label: '4. Verify durability and core fit before scaling',
              detail:
                'Confirm that gains hold across groups and terms, protect non-negotiable core components, and verify ongoing staffing capacity before expanding schoolwide.',
            },
          ],
          edges: [
            {
              id: 'cycle-to-reporting',
              from: 'disciplined-improvement-cycle',
              to: 'transparent-credible-reporting',
              label: 'documents honest outcomes and next steps',
            },
            {
              id: 'reporting-to-advocacy',
              from: 'transparent-credible-reporting',
              to: 'feasible-data-advocacy',
              label: 'earns stakeholder trust for resource requests',
            },
            {
              id: 'advocacy-to-scaling',
              from: 'feasible-data-advocacy',
              to: 'durable-sustainable-scaling',
              label: 'secures capacity to test durable expansion',
            },
            {
              id: 'scaling-to-cycle',
              from: 'durable-sustainable-scaling',
              to: 'disciplined-improvement-cycle',
              label: 'monitors sustained equity during ongoing cycles',
            },
          ],
          renderingHints: {
            connectorStyle: 'arrow',
            allowHorizontalScroll: true,
            minimumTextSize: 'user-scalable',
          },
        },
      },
    ],
    diagramPlacements: [
      {
        id: 'sc5422-diagram-placement-07',
        diagramId: 'sc5422-diagram-07',
        chapterId: 'sc5422-ch-02',
        sectionId: 'sc5422-ch-02-section-04',
        position: 'after-section-content',
        learnerPurpose:
          'Synthesize psychosocial stages, cognitive scaffolding, learning mechanisms, and family-ecological context as flexible lenses for designing developmentally responsive counseling supports.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-08',
        diagramId: 'sc5422-diagram-08',
        chapterId: 'sc5422-ch-05',
        sectionId: 'sc5422-ch-05-section-03',
        position: 'after-section-content',
        learnerPurpose:
          'Align universal classroom counseling lessons, screened small-group stages, power-aware bullying and risk responses, and coordinated trauma-informed crisis care.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-09',
        diagramId: 'sc5422-diagram-09',
        chapterId: 'sc5422-ch-08',
        sectionId: 'sc5422-ch-08-section-03',
        position: 'after-section-content',
        learnerPurpose:
          'Connect baseline needs assessment and annual student outcome goals to executable action plans, participation-learning-outcome evidence, and sound psychometric interpretation.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-10',
        diagramId: 'sc5422-diagram-10',
        chapterId: 'sc5422-ch-09',
        sectionId: 'sc5422-ch-09-section-03',
        position: 'after-section-content',
        learnerPurpose:
          'Coordinate triage and caseload continuity, equitable resource allocation, privacy-first data governance, and language-accessible communication in daily counseling operations.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-11',
        diagramId: 'sc5422-diagram-11',
        chapterId: 'sc5422-ch-10',
        sectionId: 'sc5422-ch-10-section-04',
        position: 'after-section-content',
        learnerPurpose:
          'Connect annual program and competency assessments to pre-delivery evaluation design, implementation fidelity and dosage tracking, and student-informed interpretation.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-12',
        diagramId: 'sc5422-diagram-12',
        chapterId: 'sc5422-ch-12',
        sectionId: 'sc5422-ch-12-section-03',
        position: 'after-section-content',
        learnerPurpose:
          'Turn evaluation evidence into disciplined testable adaptations, credible transparent reporting, feasible data-based advocacy asks, and sustainable scaling.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
    ],
  },
};
