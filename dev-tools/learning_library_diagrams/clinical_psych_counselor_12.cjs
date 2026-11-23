'use strict';

module.exports = {
  school_psychologist_5403: {
    diagrams: [
      {
        id: 'spsych5403-diagram-01',
        chapterId: 'sp5403-ch-07',
        domainId: 'systems-level-services',
        title: 'NASP Practice Model and MTSS Data-Based Decision-Making Loop',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Trace how schoolwide universal screening connects to tiered intervention fidelity, progress monitoring, and explicit decision rules within an integrated MTSS.',
        caption:
          'An original study flow illustrating NASP data-based decision making across universal screening, tiered supports, fidelity checks, and intensification or fading.',
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
            'Concept flow of the MTSS data-based decision-making loop from universal screening through tiered supports to decision rules.',
          longDescription:
            'Read from left to right. Universal screening identifies academic and behavioral needs and verifies core Tier 1 health. Teams align evidence-based Tier 1, Tier 2, and Tier 3 supports while checking treatment fidelity. Frequent progress monitoring tracks student growth rate and level against clear goals. Finally, teams apply data decision rules to intensify, fade, or refer for evaluation, feeding results back to system planning.',
          textEquivalent: [
            'Universal screening collects reliable academic, behavioral, and social-emotional benchmarks for all students to detect risk early and audit Tier 1 effectiveness.',
            'Tiered intervention alignment matches students to core Tier 1 instruction plus supplemental Tier 2 or intensive Tier 3 supports without removing core access.',
            'Treatment fidelity verification confirms that instruction and interventions are delivered as designed before interpreting student nonresponse.',
            'Progress monitoring graphs repeated curriculum-based or behavioral data points to evaluate rate of improvement and performance level against mastery criteria.',
            'Data-based decision rules guide teams to fade supports, modify or intensify intervention, or initiate a comprehensive evaluation when warranted.',
          ],
          readingOrder: [
            'universal-screening',
            'tiered-supports',
            'fidelity-check',
            'progress-monitoring',
            'decision-rules',
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
              id: 'universal-screening',
              label: '1. Universal screening and Tier 1 audit',
              detail:
                'Administer psychometrically sound academic and behavioral screeners schoolwide to flag risk early and verify whether core Tier 1 instruction meets most learners’ needs.',
            },
            {
              id: 'tiered-supports',
              label: '2. Tier 1, 2, and 3 support alignment',
              detail:
                'Layer targeted Tier 2 small-group interventions and intensive Tier 3 individualized supports onto strong Tier 1 core instruction rather than replacing general access.',
            },
            {
              id: 'fidelity-check',
              label: '3. Treatment integrity verification',
              detail:
                'Document dosage, adherence, and instructional quality using direct checks or checklists so poor outcomes are not misattributed to student deficits.',
            },
            {
              id: 'progress-monitoring',
              label: '4. Frequent progress monitoring',
              detail:
                'Collect sensitive, repeated curriculum-based or behavioral measures at regular intervals to chart trend slope and current level against individualized benchmarks.',
            },
            {
              id: 'decision-rules',
              label: '5. Intensify, fade, or refer decisions',
              detail:
                'Apply preset team decision rules to maintain or fade effective supports, intensify or alter nonworking plans, or pursue comprehensive evaluation without delaying parent rights.',
            },
          ],
          edges: [
            {
              id: 'screen-to-tiers',
              from: 'universal-screening',
              to: 'tiered-supports',
              label: 'flags risk and informs tiered placement',
            },
            {
              id: 'tiers-to-fidelity',
              from: 'tiered-supports',
              to: 'fidelity-check',
              label: 'requires verified implementation integrity',
            },
            {
              id: 'fidelity-to-pm',
              from: 'fidelity-check',
              to: 'progress-monitoring',
              label: 'validates ongoing growth data collection',
            },
            {
              id: 'pm-to-decisions',
              from: 'progress-monitoring',
              to: 'decision-rules',
              label: 'supplies slope and level evidence for rules',
            },
            {
              id: 'decisions-to-screen',
              from: 'decision-rules',
              to: 'universal-screening',
              label: 'feeds outcome data back to system review',
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
        id: 'spsych5403-diagram-02',
        chapterId: 'sp5403-ch-02',
        domainId: 'permeating-practices',
        title: 'Psychoeducational Assessment Validity, Reliability, and Cross-Battery Flow',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Follow how school psychologists move from a clear referral question and cultural-linguistic review through multimethod evidence and psychometric checks to actionable recommendations.',
        caption:
          'An original study flow linking referral framing, cultural-linguistic safeguards, RIOT multimethod data, psychometric precision, and instructional synthesis.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://sites.ed.gov/idea/regs/b/d/300.304',
          'https://www.nasponline.org/x55315.xml',
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
            'Flow from referral question and cultural-linguistic screening through multimethod data and psychometric checks to recommendations.',
          longDescription:
            'Read from left to right. Assessment begins by sharpening the referral question and screening cultural, linguistic, and sensory factors. The team gathers multimethod, multi-informant RIOT data across settings. Next, the psychologist evaluates reliability, standard error of measurement, norm fit, and cross-battery convergence. Finally, converged evidence translates into clear, instructionally actionable recommendations.',
          textEquivalent: [
            'Clarify the referral question and screen language proficiency, cultural context, sensory status, and opportunity to learn before selecting any instrument.',
            'Collect multimethod, multi-informant evidence via record review, interviews, observations, and targeted testing across natural school and home settings.',
            'Audit psychometric quality by checking reliability, confidence intervals around standard error of measurement, norm representativeness, and construct validity.',
            'Synthesize cross-battery patterns by weighing convergence across cognitive, academic, and functional data while rejecting overinterpretation of isolated subtest scatter.',
            'Translate integrated findings into plain-language, instructionally relevant goals, accommodations, and progress indicators linked directly to learner needs.',
          ],
          readingOrder: [
            'referral-linguistic-screen',
            'multimethod-data',
            'psychometric-audit',
            'cross-battery-synthesis',
            'actionable-recommendations',
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
              id: 'referral-linguistic-screen',
              label: '1. Referral framing and cultural-linguistic review',
              detail:
                'Define specific assessment questions and examine home language, English acquisition, cultural experience, health, and prior instruction to prevent construct-irrelevant bias.',
            },
            {
              id: 'multimethod-data',
              label: '2. Multimethod, multi-informant RIOT data',
              detail:
                'Combine records, caregiver and teacher interviews, structured classroom observations, curriculum-based measures, and targeted standardized tests across contexts.',
            },
            {
              id: 'psychometric-audit',
              label: '3. Validity, reliability, and SEM checks',
              detail:
                'Interpret scores using confidence intervals built from the standard error of measurement, verify norm fit and floor or ceiling limits, and confirm validity for the intended use.',
            },
            {
              id: 'cross-battery-synthesis',
              label: '4. Cross-battery convergence analysis',
              detail:
                'Test hypotheses across broad cognitive and achievement clusters alongside ecological evidence rather than drawing conclusions from single subtest fluctuations.',
            },
            {
              id: 'actionable-recommendations',
              label: '5. Instructionally actionable recommendations',
              detail:
                'Link confirmed strengths and learning barriers directly to measurable instructional strategies, classroom access supports, and follow-up monitoring criteria.',
            },
          ],
          edges: [
            {
              id: 'referral-to-riot',
              from: 'referral-linguistic-screen',
              to: 'multimethod-data',
              label: 'guides nondiscriminatory tool selection',
            },
            {
              id: 'riot-to-psychometric',
              from: 'multimethod-data',
              to: 'psychometric-audit',
              label: 'undergoes precision and norm verification',
            },
            {
              id: 'psychometric-to-crossbattery',
              from: 'psychometric-audit',
              to: 'cross-battery-synthesis',
              label: 'grounds defensible pattern integration',
            },
            {
              id: 'crossbattery-to-recs',
              from: 'cross-battery-synthesis',
              to: 'actionable-recommendations',
              label: 'informs targeted educational planning',
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
        id: 'spsych5403-diagram-03',
        chapterId: 'sp5403-ch-06',
        domainId: 'student-level-services',
        title: 'Functional Behavior Assessment (FBA) to Function-Based BIP Pathway',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Connect observable target behavior definitions and ABC data to a testable function hypothesis and a matching three-part behavior intervention plan.',
        caption:
          'An original study flow showing how functional behavior assessment evidence translates into antecedent, replacement-skill, and consequence components of a BIP.',
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
            'Pathway from operational behavior definition and ABC data to hypothesized function and a function-matched BIP.',
          longDescription:
            'Read left to right. The FBA defines the target behavior operationally, then gathers indirect and direct ABC data across routines. Converging patterns identify a hypothesized function (escape, attention, tangible, or sensory). That function drives a BIP combining antecedent supports, replacement skill teaching, and aligned consequences, followed by progress and fidelity monitoring.',
          textEquivalent: [
            'Define the target behavior operationally in observable, measurable terms so all observers agree on when the behavior begins and ends.',
            'Collect converging indirect records and interviews plus direct antecedent-behavior-consequence observations across settings and routines.',
            'Formulate a testable function hypothesis identifying what maintains the behavior: escape or avoidance, social attention, tangible access, or automatic sensory regulation.',
            'Build a function-matched BIP that modifies antecedents, explicitly teaches an efficient replacement behavior, reinforces the replacement, and stops reinforcing the problem behavior.',
            'Monitor replacement skill mastery, target behavior reduction, and staff implementation fidelity to refine the plan over time.',
          ],
          readingOrder: [
            'operational-definition',
            'abc-data-collection',
            'function-hypothesis',
            'function-matched-bip',
            'bip-fidelity-monitoring',
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
              id: 'operational-definition',
              label: '1. Operational target definition',
              detail:
                'Replace vague labels like defiance with objective, observable, and measurable topography, frequency, duration, or intensity criteria agreed upon by the team.',
            },
            {
              id: 'abc-data-collection',
              label: '2. Indirect and direct ABC evidence',
              detail:
                'Triangulate record reviews, caregiver and teacher interviews, and direct antecedent-behavior-consequence observations to map setting events, triggers, and maintaining outcomes.',
            },
            {
              id: 'function-hypothesis',
              label: '3. Hypothesized maintaining function',
              detail:
                'Synthesize patterns into a testable statement specifying whether behavior primarily serves escape or avoidance, peer or adult attention, tangible access, or sensory regulation.',
            },
            {
              id: 'function-matched-bip',
              label: '4. Antecedent, replacement, and consequence BIP',
              detail:
                'Prevent predictable triggers, teach and prompt a functionally equivalent replacement skill, reinforce that replacement immediately, and eliminate inadvertent reinforcement of target behavior.',
            },
            {
              id: 'bip-fidelity-monitoring',
              label: '5. Progress and fidelity review',
              detail:
                'Track both replacement behavior gains and problem behavior reduction alongside adult implementation fidelity to adjust supports or generalize skills across settings.',
            },
          ],
          edges: [
            {
              id: 'def-to-abc',
              from: 'operational-definition',
              to: 'abc-data-collection',
              label: 'enables reliable multi-setting observation',
            },
            {
              id: 'abc-to-function',
              from: 'abc-data-collection',
              to: 'function-hypothesis',
              label: 'reveals recurring trigger-consequence links',
            },
            {
              id: 'function-to-bip',
              from: 'function-hypothesis',
              to: 'function-matched-bip',
              label: 'dictates matched preventive and teaching steps',
            },
            {
              id: 'bip-to-monitor',
              from: 'function-matched-bip',
              to: 'bip-fidelity-monitoring',
              label: 'requires ongoing outcome and integrity data',
            },
            {
              id: 'monitor-to-function',
              from: 'bip-fidelity-monitoring',
              to: 'function-hypothesis',
              label: 'retests hypothesis if response stalls',
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
        id: 'spsych5403-diagram-04',
        chapterId: 'sp5403-ch-08',
        domainId: 'systems-level-services',
        title: 'School Crisis Prevention, PREPaRE Triage, and Suicide Risk Protocol',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Sequence proactive crisis mitigation, immediate psychological triage and safety handoffs, caregiver notification, and structured recovery monitoring.',
        caption:
          'An original study flow outlining PREPaRE-aligned school crisis readiness, immediate risk triage, caregiver communication, and post-crisis recovery monitoring.',
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
            'Crisis protocol flow from prevention and preparedness through triage and safety handoff to caregiver notification and recovery.',
          longDescription:
            'Read left to right. Crisis systems begin with prevention, mitigation, and multidisciplinary readiness. When a crisis or suicide concern arises, teams conduct psychological triage, ensure continuous supervision, and complete a warm handoff to crisis supports. Staff then notify caregivers promptly and document facts objectively, followed by structured recovery and re-entry monitoring.',
          textEquivalent: [
            'Prevention and preparedness build positive school climate, clear incident command roles, accessible safety protocols, and staff training before an emergency occurs.',
            'Psychological triage and immediate safety screening evaluate exposure, distress, and imminent suicide or harm risk while maintaining continuous adult supervision.',
            'Warm handoff and emergency coordination connect high-risk students directly to school crisis clinicians, mobile crisis teams, or emergency medical services without gaps.',
            'Caregiver notification and objective documentation inform guardians promptly, support lethal-means safety planning, and record factual actions per policy and law.',
            'Structured recovery monitoring supports gradual re-entry, monitors delayed trauma reactions, connects families to ongoing care, and conducts after-action review.',
          ],
          readingOrder: [
            'mitigation-preparedness',
            'psychological-triage',
            'safety-warm-handoff',
            'caregiver-documentation',
            'recovery-monitoring',
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
              id: 'mitigation-preparedness',
              label: '1. Prevention, mitigation, and readiness',
              detail:
                'Establish safe school climate, trained multidisciplinary crisis teams, clear role assignments, accessible reunification procedures, and practiced suicide screening protocols.',
            },
            {
              id: 'psychological-triage',
              label: '2. Psychological triage and risk screening',
              detail:
                'Evaluate physical proximity, emotional proximity, crisis reactions, and immediate suicide ideation, plan, or intent while keeping an at-risk student continuously supervised.',
            },
            {
              id: 'safety-warm-handoff',
              label: '3. Immediate safety and warm handoff',
              detail:
                'Match intervention intensity to triage level, avoid premature debriefing for low-risk peers, and complete direct warm handoffs to emergency or clinical crisis services when risk is acute.',
            },
            {
              id: 'caregiver-documentation',
              label: '4. Caregiver notification and documentation',
              detail:
                'Notify caregivers promptly with actionable safety and lethal-means counseling, coordinate community referrals, and record objective risk factors and protective steps taken.',
            },
            {
              id: 'recovery-monitoring',
              label: '5. Re-entry and recovery monitoring',
              detail:
                'Implement structured return-to-school check-ins, track persistent distress or functional decline for referral, support staff recovery, and update protocols via after-action review.',
            },
          ],
          edges: [
            {
              id: 'prep-to-triage',
              from: 'mitigation-preparedness',
              to: 'psychological-triage',
              label: 'activates rapid risk and exposure sorting',
            },
            {
              id: 'triage-to-handoff',
              from: 'psychological-triage',
              to: 'safety-warm-handoff',
              label: 'matches protective level to assessed risk',
            },
            {
              id: 'handoff-to-caregiver',
              from: 'safety-warm-handoff',
              to: 'caregiver-documentation',
              label: 'requires guardian notice and clear records',
            },
            {
              id: 'caregiver-to-recovery',
              from: 'caregiver-documentation',
              to: 'recovery-monitoring',
              label: 'anchors continuity and re-entry follow-up',
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
        id: 'spsych5403-diagram-05',
        chapterId: 'sp5403-ch-12',
        domainId: 'foundations',
        title: 'IDEA Special Education Eligibility vs. Section 504 Accommodations Flow',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Distinguish the statutory criteria for IDEA special education eligibility from Section 504 nondiscrimination accommodations during multidisciplinary team decisions.',
        caption:
          'An original study flow comparing exclusionary screening, multidisciplinary evaluation, the three-prong IDEA test, and Section 504 access criteria.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://sites.ed.gov/idea/regs/b/d/300.304',
          'https://www.ed.gov/laws-and-policy/individuals-disabilities/section-504',
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
            'Decision flow comparing IDEA special education eligibility criteria with Section 504 accommodation eligibility.',
          longDescription:
            'Read left to right. Teams first rule out exclusionary factors such as inadequate instruction or limited English proficiency, then obtain parent consent for a multidisciplinary evaluation. If an IDEA disability causes adverse educational impact and requires specially designed instruction, the team writes an IEP; otherwise, a substantial limitation in a major life activity points to a Section 504 plan.',
          textEquivalent: [
            'Review exclusionary factors first to verify that difficulties are not primarily caused by lack of appropriate reading or math instruction or limited English proficiency.',
            'Obtain informed written parent consent and complete a comprehensive, nondiscriminatory multidisciplinary evaluation drawing on varied tools and caregiver input.',
            'Apply the three-prong IDEA test: qualifying disability category, adverse effect on educational performance, and demonstrated need for specially designed instruction.',
            'Develop an Individualized Education Program (IEP) with measurable goals, services, and least restrictive environment placement when all three IDEA prongs are met.',
            'Evaluate Section 504 eligibility when a physical or mental impairment substantially limits a major life activity and requires individualized accommodations for equal access.',
          ],
          readingOrder: [
            'exclusionary-opportunity-check',
            'multidisciplinary-evaluation',
            'idea-three-prong-test',
            'iep-sdi-pathway',
            'section-504-access-pathway',
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
              id: 'exclusionary-opportunity-check',
              label: '1. Exclusionary factors and opportunity to learn',
              detail:
                'Verify core instruction quality, attendance, cultural-linguistic background, and prior supports so inadequate instruction or English acquisition is not mislabeled as disability.',
            },
            {
              id: 'multidisciplinary-evaluation',
              label: '2. Consent and multidisciplinary evaluation',
              detail:
                'Provide prior written notice, secure informed caregiver consent, and assess all areas of suspected disability using technically sound, nondiscriminatory multiple measures.',
            },
            {
              id: 'idea-three-prong-test',
              label: '3. IDEA three-prong eligibility review',
              detail:
                'Determine as a team whether the student has an IDEA disability category that adversely affects educational performance and requires specially designed instruction (SDI).',
            },
            {
              id: 'iep-sdi-pathway',
              label: '4a. IDEA eligible: IEP and SDI',
              detail:
                'When all three IDEA prongs are satisfied and caregivers consent to services, craft an IEP specifying present levels, measurable annual goals, SDI, related services, and LRE.',
            },
            {
              id: 'section-504-access-pathway',
              label: '4b. Section 504: substantial limitation access',
              detail:
                'When SDI is not needed but an impairment substantially limits a major life activity, design individualized 504 accommodations and aids to ensure nondiscriminatory FAPE.',
            },
          ],
          edges: [
            {
              id: 'excl-to-eval',
              from: 'exclusionary-opportunity-check',
              to: 'multidisciplinary-evaluation',
              label: 'frames fair evaluation scope after consent',
            },
            {
              id: 'eval-to-idea',
              from: 'multidisciplinary-evaluation',
              to: 'idea-three-prong-test',
              label: 'supplies team data for statutory criteria',
            },
            {
              id: 'idea-to-iep',
              from: 'idea-three-prong-test',
              to: 'iep-sdi-pathway',
              label: 'meets disability, impact, and SDI need',
            },
            {
              id: 'idea-to-504',
              from: 'idea-three-prong-test',
              to: 'section-504-access-pathway',
              label: 'no SDI need but substantial life limitation',
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
        id: 'spsych5403-diagram-06',
        chapterId: 'sp5403-ch-03',
        domainId: 'permeating-practices',
        title: 'Ecological Consultation and Ethical-Legal Safeguards Pathway',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Organize the four core stages of behavioral and conjoint ecological consultation while upholding NASP ethics, FERPA privacy, and informed consent throughout.',
        caption:
          'An original study flow integrating problem-solving consultation stages with treatment integrity and NASP ethical-legal boundaries.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.nasponline.org/standards-and-certification/nasp-2020-professional-standards-adopted/nasp-2020-domains-of-practice',
          'https://www.nasponline.org/x55315.xml',
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
            'Consultation pathway from problem identification and analysis through fidelity-monitored implementation to ethical-legal evaluation.',
          longDescription:
            'Read left to right. Ecological consultation opens with collaborative problem identification, clear consent boundaries, and baseline data. Partners conduct ecological problem analysis to test instructional and environmental hypotheses, then implement a feasible strategy with treatment integrity coaching. Finally, teams evaluate goal progress within NASP ethics and FERPA privacy safeguards, revisiting hypotheses if needed.',
          textEquivalent: [
            'Problem identification builds a nonhierarchical partnership, clarifies roles and consent boundaries, defines the concern measurably, and collects baseline data.',
            'Ecological problem analysis examines curriculum, instruction, classroom environment, and learner strengths to identify modifiable maintaining conditions.',
            'Plan implementation with treatment integrity pairs a socially acceptable, evidence-based strategy with coaching, materials, and routine fidelity checks.',
            'Plan evaluation compares outcome data against baseline and goal criteria while upholding NASP ethics, FERPA record privacy, and caregiver participation.',
          ],
          readingOrder: [
            'problem-identification',
            'ecological-problem-analysis',
            'plan-implementation-integrity',
            'ethical-outcome-evaluation',
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
              id: 'problem-identification',
              label: '1. Problem identification and consent clarity',
              detail:
                'Establish a collaborative alliance with teachers and caregivers, clarify confidentiality limits and informed consent, define the concern operationally, and collect baseline data.',
            },
            {
              id: 'ecological-problem-analysis',
              label: '2. Ecological problem analysis',
              detail:
                'Analyze instructional fit, classroom routines, cultural context, and student assets to pinpoint modifiable antecedents, skill gaps, or reinforcement contingencies.',
            },
            {
              id: 'plan-implementation-integrity',
              label: '3. Implementation with treatment integrity',
              detail:
                'Select a feasible, culturally acceptable intervention, assign clear adult roles, coach implementers through barriers, and verify fidelity alongside student response.',
            },
            {
              id: 'ethical-outcome-evaluation',
              label: '4. Evaluation within NASP and FERPA safeguards',
              detail:
                'Compare post-plan progress against measurable goals, protect FERPA record privacy and student welfare, and decide whether to generalize, fade, or revise the plan.',
            },
          ],
          edges: [
            {
              id: 'ident-to-analysis',
              from: 'problem-identification',
              to: 'ecological-problem-analysis',
              label: 'defines measurable baseline for root inquiry',
            },
            {
              id: 'analysis-to-impl',
              from: 'ecological-problem-analysis',
              to: 'plan-implementation-integrity',
              label: 'selects feasible function-matched strategy',
            },
            {
              id: 'impl-to-eval',
              from: 'plan-implementation-integrity',
              to: 'ethical-outcome-evaluation',
              label: 'pairs fidelity checks with progress review',
            },
            {
              id: 'eval-to-analysis',
              from: 'ethical-outcome-evaluation',
              to: 'ecological-problem-analysis',
              label: 'revisits hypotheses when goals are unmet',
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
        id: 'spsych5403-diagram-placement-01',
        diagramId: 'spsych5403-diagram-01',
        chapterId: 'sp5403-ch-07',
        sectionId: 'sp5403-ch-07-section-02',
        position: 'after-section-content',
        learnerPurpose:
          'Trace how schoolwide universal screening connects to tiered intervention fidelity, progress monitoring, and explicit decision rules within an integrated MTSS.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-02',
        diagramId: 'spsych5403-diagram-02',
        chapterId: 'sp5403-ch-02',
        sectionId: 'sp5403-ch-02-section-03',
        position: 'after-section-content',
        learnerPurpose:
          'Follow how school psychologists move from a clear referral question and cultural-linguistic review through multimethod evidence and psychometric checks to actionable recommendations.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-03',
        diagramId: 'spsych5403-diagram-03',
        chapterId: 'sp5403-ch-06',
        sectionId: 'sp5403-ch-06-section-02',
        position: 'after-section-content',
        learnerPurpose:
          'Connect observable target behavior definitions and ABC data to a testable function hypothesis and a matching three-part behavior intervention plan.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-04',
        diagramId: 'spsych5403-diagram-04',
        chapterId: 'sp5403-ch-08',
        sectionId: 'sp5403-ch-08-section-04',
        position: 'after-section-content',
        learnerPurpose:
          'Sequence proactive crisis mitigation, immediate psychological triage and safety handoffs, caregiver notification, and structured recovery monitoring.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-05',
        diagramId: 'spsych5403-diagram-05',
        chapterId: 'sp5403-ch-12',
        sectionId: 'sp5403-ch-12-section-02',
        position: 'after-section-content',
        learnerPurpose:
          'Distinguish the statutory criteria for IDEA special education eligibility from Section 504 nondiscrimination accommodations during multidisciplinary team decisions.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'spsych5403-diagram-placement-06',
        diagramId: 'spsych5403-diagram-06',
        chapterId: 'sp5403-ch-03',
        sectionId: 'sp5403-ch-03-section-01',
        position: 'after-section-content',
        learnerPurpose:
          'Organize the four core stages of behavioral and conjoint ecological consultation while upholding NASP ethics, FERPA privacy, and informed consent throughout.',
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
        id: 'sc5422-diagram-01',
        chapterId: 'sc5422-ch-07',
        domainId: 'manage',
        title: 'ASCA National Model Four-Component Program Cycle',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Connect the Define, Manage, Deliver, and Assess components of the ASCA National Model as a continuous school counseling improvement cycle.',
        caption:
          'An original study flow showing how standards, program management, student service delivery, and outcome assessment reinforce one another.',
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
            'Continuous four-component ASCA National Model cycle moving from Define to Manage, Deliver, and Assess.',
          longDescription:
            'Read left to right. Define anchors the program in ASCA student, professional, and ethical standards. Manage aligns vision, mission, data-based goals, action plans, and the annual administrative conference. Deliver provides direct and indirect student services. Assess reviews participation, Mindsets and Behaviors, and outcome data to refine next year’s plan.',
          textEquivalent: [
            'Define establishes the foundation using ASCA Student Standards, School Counselor Professional Standards and Competencies, and ASCA Ethical Standards.',
            'Manage builds program focus, data-informed annual student outcome goals, action plans, advisory council input, and the annual administrative conference.',
            'Deliver executes developmentally appropriate direct student services and indirect consultation, collaboration, and referral supports for every learner.',
            'Assess analyzes participation, Mindsets and Behaviors, and achievement, attendance, or discipline outcome data to report results and revise program priorities.',
          ],
          readingOrder: ['define', 'manage', 'deliver', 'assess'],
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
              id: 'define',
              label: '1. Define: standards and ethics',
              detail:
                'Anchor the program in ASCA Student Standards for academic, career, and social-emotional growth alongside professional competencies and ethical responsibilities.',
            },
            {
              id: 'manage',
              label: '2. Manage: focus and planning tools',
              detail:
                'Align vision and mission, analyze school data to set annual outcome goals, create action plans and calendars, and hold the annual administrative conference.',
            },
            {
              id: 'deliver',
              label: '3. Deliver: direct and indirect services',
              detail:
                'Provide classroom instruction, appraisal and advisement, and short-term counseling directly while coordinating consultation, collaboration, and referrals indirectly.',
            },
            {
              id: 'assess',
              label: '4. Assess: program and student results',
              detail:
                'Evaluate participation, Mindsets and Behaviors learning gains, and disaggregated outcome data alongside counselor appraisal to guide continuous improvement.',
            },
          ],
          edges: [
            {
              id: 'define-to-manage',
              from: 'define',
              to: 'manage',
              label: 'sets standards for program goals and plans',
            },
            {
              id: 'manage-to-deliver',
              from: 'manage',
              to: 'deliver',
              label: 'organizes calendars, time, and targeted tiers',
            },
            {
              id: 'deliver-to-assess',
              from: 'deliver',
              to: 'assess',
              label: 'generates participation and outcome evidence',
            },
            {
              id: 'assess-to-manage',
              from: 'assess',
              to: 'manage',
              label: 'informs annual revisions and resource advocacy',
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
        id: 'sc5422-diagram-02',
        chapterId: 'sc5422-ch-01',
        domainId: 'define',
        title: 'Direct vs. Indirect Student Services and Counselor Role Boundaries',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Differentiate appropriate direct and indirect student services from inappropriate non-counseling duties when prioritizing counselor time and advocating with administrators.',
        caption:
          'An original study flow clarifying how counselor time balances direct student services, indirect student supports, and data-backed role advocacy.',
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
            'Role boundary flow distinguishing direct student services and indirect supports from non-counseling duties via advocacy.',
          longDescription:
            'Read left to right. Counselors align at least 80 percent of time to direct services (instruction, appraisal and advisement, short-term counseling) and indirect services (consultation, collaboration, referrals). Distinguishing these core duties from inappropriate clerical or disciplinary tasks equips counselors for data-based role advocacy with administrators.',
          textEquivalent: [
            'Use-of-time alignment prioritizes at least 80 percent of school counselor time for direct and indirect services directly benefiting students.',
            'Direct student services involve face-to-face delivery through school counseling instruction, individual or small-group appraisal and advisement, and short-term counseling.',
            'Indirect student services occur on behalf of students via parent and teacher consultation, multidisciplinary collaboration, and community referrals.',
            'Inappropriate duties such as routine discipline enforcement, master scheduling clerking, or primary testing coordination undermine student access and counselor neutrality.',
            'Data-based role advocacy uses time-use logs and student outcome evidence in the annual administrative conference to reassign non-counseling tasks.',
          ],
          readingOrder: [
            'time-allocation-target',
            'direct-student-services',
            'indirect-student-services',
            'inappropriate-duty-boundary',
            'role-advocacy-conference',
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
              id: 'time-allocation-target',
              label: '1. Student-centered time alignment',
              detail:
                'Structure weekly schedules so roughly 80 percent or more of counselor time delivers direct and indirect student services rather than building operations.',
            },
            {
              id: 'direct-student-services',
              label: '2. Direct services with students',
              detail:
                'Deliver proactive classroom lessons, individualized academic and career appraisal and advisement, and brief solution-focused or skill-building counseling.',
            },
            {
              id: 'indirect-student-services',
              label: '3. Indirect services on students’ behalf',
              detail:
                'Consult with families and teachers, collaborate on MTSS, IEP, and 504 teams, and connect students to vetted community clinical or basic-needs providers.',
            },
            {
              id: 'inappropriate-duty-boundary',
              label: '4. Non-counseling duty boundary',
              detail:
                'Identify tasks that conflict with counseling ethics or access, including administering discipline, supervising lunch duty, primary test coordination, or clerical data entry.',
            },
            {
              id: 'role-advocacy-conference',
              label: '5. Data-backed role advocacy',
              detail:
                'Present time-use audits and student outcome gains during the annual administrative conference to negotiate realistic reassignment of non-counseling duties.',
            },
          ],
          edges: [
            {
              id: 'target-to-direct',
              from: 'time-allocation-target',
              to: 'direct-student-services',
              label: 'anchors face-to-face student delivery',
            },
            {
              id: 'direct-to-indirect',
              from: 'direct-student-services',
              to: 'indirect-student-services',
              label: 'pairs with systemic team and family support',
            },
            {
              id: 'indirect-to-boundary',
              from: 'indirect-student-services',
              to: 'inappropriate-duty-boundary',
              label: 'contrasts core roles against clerical duties',
            },
            {
              id: 'boundary-to-advocacy',
              from: 'inappropriate-duty-boundary',
              to: 'role-advocacy-conference',
              label: 'triggers evidence-based role realignment',
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
        id: 'sc5422-diagram-03',
        chapterId: 'sc5422-ch-11',
        domainId: 'assess',
        title: 'Data-Driven Closing-the-Gap Action Plan Workflow',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Follow how disaggregated school data reveal an equity gap, shape a Mindsets and Behaviors intervention plan, and guide pre-post outcome evaluation.',
        caption:
          'An original study flow tracking disaggregated data analysis through equity-barrier identification, standards-aligned intervention, and pre-post gap evaluation.',
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
            'Closing-the-gap workflow from disaggregated school data and equity barrier analysis to Mindsets and Behaviors intervention and pre-post evaluation.',
          longDescription:
            'Read left to right. Counselors disaggregate attendance, achievement, and discipline data to reveal hidden gaps, then identify systemic equity barriers with stakeholders. Next, they target ASCA Mindsets and Behaviors standards with a measurable goal, deliver tiered interventions, and evaluate pre-post outcome change to check whether the gap narrowed.',
          textEquivalent: [
            'Disaggregate attendance, achievement, course access, and discipline data across relevant student groups to uncover disparities hidden by schoolwide averages.',
            'Analyze root equity barriers with students, families, and staff so action plans address systemic opportunity gaps rather than blaming learners.',
            'Select aligned ASCA Mindsets and Behaviors standards and draft a specific, measurable annual student outcome goal with baseline and target dates.',
            'Deliver targeted tiered classroom, small-group, or advising interventions while tracking participation reach, dosage, and implementation fidelity.',
            'Evaluate pre-post Mindsets and Behaviors surveys alongside attendance, achievement, or discipline outcomes to report impact and plan next steps.',
          ],
          readingOrder: [
            'disaggregate-data',
            'identify-equity-barrier',
            'target-standards-goal',
            'deliver-tiered-plan',
            'evaluate-pre-post-outcomes',
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
              id: 'disaggregate-data',
              label: '1. Disaggregate school outcome data',
              detail:
                'Break down achievement, attendance, graduation, course-taking, and discipline rates by relevant student groups while checking subgroup size and data accuracy.',
            },
            {
              id: 'identify-equity-barrier',
              label: '2. Pinpoint systemic equity barriers',
              detail:
                'Combine quantitative gaps with student and family voice to uncover opportunity, policy, scheduling, language, or belonging barriers driving unequal outcomes.',
            },
            {
              id: 'target-standards-goal',
              label: '3. Align Mindsets and Behaviors goal',
              detail:
                'Select one to two relevant ASCA Mindsets and Behaviors standards and write a measurable closing-the-gap outcome goal naming population, baseline, target, and timeline.',
            },
            {
              id: 'deliver-tiered-plan',
              label: '4. Deliver tiered closing-the-gap supports',
              detail:
                'Implement coordinated classroom lessons, targeted small groups, individual advising, and systemic advocacy while logging participation reach and dosage.',
            },
            {
              id: 'evaluate-pre-post-outcomes',
              label: '5. Evaluate pre-post learning and results',
              detail:
                'Compare pre-post Mindsets and Behaviors checks with actual attendance, achievement, or discipline change, acknowledging design limits before scaling or revising.',
            },
          ],
          edges: [
            {
              id: 'disagg-to-barrier',
              from: 'disaggregate-data',
              to: 'identify-equity-barrier',
              label: 'exposes disparities masked by averages',
            },
            {
              id: 'barrier-to-goal',
              from: 'identify-equity-barrier',
              to: 'target-standards-goal',
              label: 'focuses standards and measurable targets',
            },
            {
              id: 'goal-to-deliver',
              from: 'target-standards-goal',
              to: 'deliver-tiered-plan',
              label: 'translates goals into executable action steps',
            },
            {
              id: 'deliver-to-eval',
              from: 'deliver-tiered-plan',
              to: 'evaluate-pre-post-outcomes',
              label: 'tests whether learning shifted real outcomes',
            },
            {
              id: 'eval-to-disagg',
              from: 'evaluate-pre-post-outcomes',
              to: 'disaggregate-data',
              label: 'checks whether the equity gap narrowed',
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
        id: 'sc5422-diagram-04',
        chapterId: 'sc5422-ch-03',
        domainId: 'define',
        title: 'Confidentiality, Informed Consent, and Duty-to-Warn / Reporting Flow',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Apply ASCA ethical standards and statutory duties when explaining confidentiality limits, assessing imminent harm or abuse, and executing protective reporting.',
        caption:
          'An original study flow tracing upfront confidentiality disclosure, imminent-risk or abuse triage, statutory reporting and warm handoff, and objective documentation.',
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        references: [
          'https://www.schoolcounselor.org/About-School-Counseling/Ethical-Responsibilities/ASCA-Ethical-Standards-for-School-Counselors-%281%29',
          'https://studentprivacy.ed.gov/ferpa',
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
            'Ethical decision flow from upfront confidentiality limits through harm or abuse evaluation to statutory reporting and documentation.',
          longDescription:
            'Read left to right. Counselors explain confidentiality and its safety limits upfront without promising secrecy. When risk arises, they evaluate imminent harm to self or others or suspected abuse/neglect, then activate statutory reporting, supervision, and warm handoffs. Sharing stays limited to safety-essential facts, followed by objective FERPA-compliant documentation.',
          textEquivalent: [
            'Explain confidentiality and its legal and ethical limits upfront in student-friendly language, never promising secrecy about danger or abuse.',
            'Screen disclosures promptly for foreseeable serious harm to self or others, suspected child abuse or neglect, or court-ordered exceptions.',
            'When safety thresholds are triggered, maintain supervision, complete mandated child-protective reports without investigating, and execute warm handoffs and caregiver notice as safe.',
            'Limit disclosure strictly to authorized individuals who need to know to protect student safety while honoring student dignity and FERPA privacy.',
            'Record factual observations, timestamps, consultations, notifications, and follow-up plans objectively in appropriate district records.',
          ],
          readingOrder: [
            'upfront-confidentiality-limits',
            'evaluate-harm-or-abuse',
            'statutory-report-handoff',
            'minimum-necessary-sharing',
            'objective-documentation',
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
              id: 'upfront-confidentiality-limits',
              label: '1. Informed consent and limits upfront',
              detail:
                'Explain counseling purpose, privacy expectations, and clear exceptions for self-harm, harm to others, or suspected abuse in developmentally accessible terms before disclosure.',
            },
            {
              id: 'evaluate-harm-or-abuse',
              label: '2. Evaluate imminent harm or abuse',
              detail:
                'Assess suicide risk, credible threat of serious harm to others, or reasonable suspicion of child abuse or neglect without conducting a forensic abuse investigation.',
            },
            {
              id: 'statutory-report-handoff',
              label: '3. Statutory reporting and warm handoff',
              detail:
                'Keep the student safely supervised, file required child-welfare reports directly within statutory timelines, and activate emergency or caregiver safety handoffs per protocol.',
            },
            {
              id: 'minimum-necessary-sharing',
              label: '4. Minimum-necessary consultation and privacy',
              detail:
                'Consult supervisors or crisis teams as needed while limiting disclosed details strictly to safety-relevant facts so student trust and FERPA boundaries remain protected.',
            },
            {
              id: 'objective-documentation',
              label: '5. Objective factual documentation',
              detail:
                'Document observable statements, risk indicators, report confirmation numbers, notifications, and follow-up safety steps accurately, separating sole-possession notes from education records.',
            },
          ],
          edges: [
            {
              id: 'limits-to-eval',
              from: 'upfront-confidentiality-limits',
              to: 'evaluate-harm-or-abuse',
              label: 'establishes transparent trust before screening',
            },
            {
              id: 'eval-to-report',
              from: 'evaluate-harm-or-abuse',
              to: 'statutory-report-handoff',
              label: 'triggers protective action on risk or abuse',
            },
            {
              id: 'report-to-sharing',
              from: 'statutory-report-handoff',
              to: 'minimum-necessary-sharing',
              label: 'shares only safety-critical details lawfully',
            },
            {
              id: 'sharing-to-doc',
              from: 'minimum-necessary-sharing',
              to: 'objective-documentation',
              label: 'creates accurate, FERPA-compliant records',
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
        id: 'sc5422-diagram-05',
        chapterId: 'sc5422-ch-04',
        domainId: 'deliver',
        title: 'Postsecondary, Career, and Academic Planning Progression',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Map how equitable K-12 counseling connects early self-knowledge and career exploration to rigorous course alignment, pathway navigation, and postsecondary transition.',
        caption:
          'An original study flow linking developmental self-exploration, academic course alignment, financial and pathway navigation, and equitable postsecondary transitions.',
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
            'K-12 progression from career self-knowledge and academic course alignment to financial-aid navigation and equitable transition support.',
          longDescription:
            'Read left to right. Planning begins with stereotype-free career awareness, strengths discovery, and interest exploration. Counselors then align coursework, credit audits, and graduation pathways with student goals, guide financial-aid, CTE, apprenticeship, and college navigation, and deliver equitable transition supports to prevent summer melt.',
          textEquivalent: [
            'Self-knowledge and career exploration help students examine strengths, values, and interests across broad, stereotype-free occupations beginning in elementary and middle grades.',
            'Academic course alignment connects graduation requirements, credit audits, and open access to rigorous or dual-enrollment courses with each learner’s evolving goals.',
            'Pathway and financial navigation demystifies two- and four-year colleges, career-technical credentials, apprenticeships, military service, scholarships, and FAFSA steps.',
            'Equitable transition support bridges final deadlines, disability or first-generation accommodations, family language access, and post-graduation warm handoffs.',
          ],
          readingOrder: [
            'self-knowledge-exploration',
            'course-graduation-alignment',
            'pathway-financial-navigation',
            'equitable-transition-support',
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
              id: 'self-knowledge-exploration',
              label: '1. Self-knowledge and interest exploration',
              detail:
                'Guide stereotype-free career awareness, strengths inventories, work-values reflection, and experiential exposure so students link school learning to future possibilities.',
            },
            {
              id: 'course-graduation-alignment',
              label: '2. Course alignment and graduation planning',
              detail:
                'Conduct regular credit audits and individualized academic plans that keep doors open to rigorous coursework, dual enrollment, or career-technical sequences without tracking bias.',
            },
            {
              id: 'pathway-financial-navigation',
              label: '3. College, CTE, and financial-aid navigation',
              detail:
                'Coach students and families through multiple viable pathways—college admissions, apprenticeships, CTE credentials, or military—paired with FAFSA, grants, and fee-waiver support.',
            },
            {
              id: 'equitable-transition-support',
              label: '4. Equitable transition and follow-through',
              detail:
                'Coordinate transcripts, disability self-advocacy transfer, language-accessible family workshops, and bridge check-ins to reduce summer melt for first-generation and underserved youth.',
            },
          ],
          edges: [
            {
              id: 'explore-to-course',
              from: 'self-knowledge-exploration',
              to: 'course-graduation-alignment',
              label: 'translates aspirations into aligned course plans',
            },
            {
              id: 'course-to-pathway',
              from: 'course-graduation-alignment',
              to: 'pathway-financial-navigation',
              label: 'prepares eligibility for diverse postsecondary options',
            },
            {
              id: 'pathway-to-transition',
              from: 'pathway-financial-navigation',
              to: 'equitable-transition-support',
              label: 'removes financial and logistical launch barriers',
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
        id: 'sc5422-diagram-06',
        chapterId: 'sc5422-ch-06',
        domainId: 'deliver',
        title: 'Systemic Consultation, Family Partnership, and Referral Pathway',
        diagramType: 'directed-concept-flow',
        learnerPurpose:
          'Coordinate strengths-based consultation, culturally responsive family partnership, school versus community referral boundaries, and follow-through monitoring.',
        caption:
          'An original study flow depicting how school counselors partner with families and multidisciplinary teams while maintaining ethical external referral boundaries.',
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
            'Consultation and referral flow from strengths gathering and family partnership to school-versus-clinical boundaries and follow-up.',
          longDescription:
            'Read left to right. Counselors gather multi-source student strengths and barriers, then partner with caregivers and staff using qualified interpreters and culturally responsive communication. Teams distinguish brief in-school supports and IEP/504 input from external clinical therapy requiring neutral multi-option referrals, then monitor follow-through.',
          textEquivalent: [
            'Gather multi-source academic, attendance, behavioral, and environmental strengths alongside barriers before proposing any support plan.',
            'Partner respectfully with caregivers and educators using accessible language, qualified interpreters rather than students, and reciprocal goal setting.',
            'Clarify scope boundaries by coordinating brief in-school supports and multidisciplinary team input while referring long-term clinical therapy to vetted external providers.',
            'Offer multiple neutral community referral options without conflicts of interest and obtain written caregiver consent before exchanging confidential clinical information.',
            'Monitor student school functioning and follow-through so classroom supports remain aligned as family or community care progresses.',
          ],
          readingOrder: [
            'multi-source-strengths',
            'culturally-responsive-partnership',
            'in-school-vs-external-scope',
            'ethical-referral-handoff',
            'follow-through-monitoring',
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
              id: 'multi-source-strengths',
              label: '1. Multi-source strengths and barriers review',
              detail:
                'Integrate attendance, grades, classroom observations, and student voice to understand ecological context and protective strengths before framing interventions.',
            },
            {
              id: 'culturally-responsive-partnership',
              label: '2. Culturally responsive family-staff partnership',
              detail:
                'Engage caregivers as co-experts using plain language, qualified interpreters instead of children, flexible scheduling, and respectful cross-cultural collaboration.',
            },
            {
              id: 'in-school-vs-external-scope',
              label: '3. In-school supports vs. clinical referral scope',
              detail:
                'Coordinate brief school counseling, MTSS strategies, and IEP or 504 team contributions in-house while recognizing when ongoing clinical therapy exceeds school scope.',
            },
            {
              id: 'ethical-referral-handoff',
              label: '4. Neutral multi-option community referral',
              detail:
                'Provide families with multiple vetted, accessible community providers free of financial conflict, and obtain signed releases before coordinating with outside clinicians.',
            },
            {
              id: 'follow-through-monitoring',
              label: '5. Follow-through and school alignment',
              detail:
                'Check in with families, teachers, and students to confirm access barriers were resolved and adjust classroom or counseling supports based on school progress.',
            },
          ],
          edges: [
            {
              id: 'strengths-to-partner',
              from: 'multi-source-strengths',
              to: 'culturally-responsive-partnership',
              label: 'grounds shared problem solving with families',
            },
            {
              id: 'partner-to-scope',
              from: 'culturally-responsive-partnership',
              to: 'in-school-vs-external-scope',
              label: 'matches student needs to appropriate service tier',
            },
            {
              id: 'scope-to-referral',
              from: 'in-school-vs-external-scope',
              to: 'ethical-referral-handoff',
              label: 'bridges long-term clinical needs ethically',
            },
            {
              id: 'referral-to-follow',
              from: 'ethical-referral-handoff',
              to: 'follow-through-monitoring',
              label: 'sustains continuity and school-based progress',
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
        id: 'sc5422-diagram-placement-01',
        diagramId: 'sc5422-diagram-01',
        chapterId: 'sc5422-ch-07',
        sectionId: 'sc5422-ch-07-section-02',
        position: 'after-section-content',
        learnerPurpose:
          'Connect the Define, Manage, Deliver, and Assess components of the ASCA National Model as a continuous school counseling improvement cycle.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-02',
        diagramId: 'sc5422-diagram-02',
        chapterId: 'sc5422-ch-01',
        sectionId: 'sc5422-ch-01-section-03',
        position: 'after-section-content',
        learnerPurpose:
          'Differentiate appropriate direct and indirect student services from inappropriate non-counseling duties when prioritizing counselor time and advocating with administrators.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-03',
        diagramId: 'sc5422-diagram-03',
        chapterId: 'sc5422-ch-11',
        sectionId: 'sc5422-ch-11-section-01',
        position: 'after-section-content',
        learnerPurpose:
          'Follow how disaggregated school data reveal an equity gap, shape a Mindsets and Behaviors intervention plan, and guide pre-post outcome evaluation.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-04',
        diagramId: 'sc5422-diagram-04',
        chapterId: 'sc5422-ch-03',
        sectionId: 'sc5422-ch-03-section-02',
        position: 'after-section-content',
        learnerPurpose:
          'Apply ASCA ethical standards and statutory duties when explaining confidentiality limits, assessing imminent harm or abuse, and executing protective reporting.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-05',
        diagramId: 'sc5422-diagram-05',
        chapterId: 'sc5422-ch-04',
        sectionId: 'sc5422-ch-04-section-04',
        position: 'after-section-content',
        learnerPurpose:
          'Map how equitable K-12 counseling connects early self-knowledge and career exploration to rigorous course alignment, pathway navigation, and postsecondary transition.',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        reviewStatus: 'source-reviewed-editorial-pass',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      },
      {
        id: 'sc5422-diagram-placement-06',
        diagramId: 'sc5422-diagram-06',
        chapterId: 'sc5422-ch-06',
        sectionId: 'sc5422-ch-06-section-04',
        position: 'after-section-content',
        learnerPurpose:
          'Coordinate strengths-based consultation, culturally responsive family partnership, school versus community referral boundaries, and follow-through monitoring.',
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
