'use strict';

function sharedPltFixes(prefix, gradeOverride) {
  return {
    [`${prefix}-ch-01-check-04`]: {
      answer: 'Provide contingent support enabling success, track performance, and fade scaffolds as control grows.',
    },
    [`${prefix}-ch-04-check-02`]: {
      answer: 'Build choice, relevance, manageable challenge, strategy feedback, and visible growth as rewards fade.',
    },
    [`${prefix}-ch-04-check-04`]: {
      answer: 'Define and model the steps, guide rehearsal, give prompts and feedback, reinforce use, and reteach.',
    },
    [`${prefix}-ch-07-check-02`]: {
      answer: 'Use a brief convergent check to sample the prerequisite, then follow with open probing of reasoning.',
    },
    [`${prefix}-ch-08-check-04`]: {
      answer: 'An observed experiment scored on design, evidence, analysis, and explanation with access supports.',
    },
    [`${prefix}-ch-09-check-03`]: {
      answer: 'The score was as high as or higher than the scores of approximately 75 percent of the relevant peer group, not that 75 percent of items were correct.',
    },
    [`${prefix}-ch-09-check-04`]: {
      answer: `The raw score matched the typical performance of the referenced ${gradeOverride}, month-two group; it does not prove ${gradeOverride} mastery or readiness to advance.`,
    },
    [`${prefix}-ch-10-check-02`]: {
      answer: 'Link the strategy to student needs via modeling, co-planning, lesson use, feedback, and review.',
    },
    [`${prefix}-ch-10-check-03`]: {
      answer: 'Treat it as limited correlational data, weigh initial bias, and pair with stronger research locally.',
    },
    [`${prefix}-ch-11-check-02`]: {
      answer: 'Invite caregiver input and goals, ensure language access, share clear evidence, and co-plan next steps.',
    },
    [`${prefix}-ch-12-check-01`]: {
      answer: 'Review records only for a legitimate educational interest tied to professional responsibility and policy.',
    },
    [`${prefix}-ch-12-check-03`]: {
      answer: 'Protect safety, avoid promising secrecy, and promptly follow mandatory report laws and school procedures.',
    },
    [`${prefix}-ch-12-check-05`]: {
      answer: 'Apply viewpoint-neutral district policy, protect safety and nondiscrimination, and consult leadership.',
    },
  };
}

module.exports = {
  plt_5_9_5623: {
    ...sharedPltFixes('plt5623', 'ninth-grade'),
    'plt5623-ch-02-check-02': {
      answer: 'Link a context, ratio table, diagram, graph, and equation so students compare models and identify invariants.',
      distractorReplacements: {
        'Start with an unexplained formula and prohibit other representations.':
          'Introduce an unexplained cross-multiplication formula first and prohibit students from using tables or visual diagrams.',
        'Require memorization before students examine any examples.':
          'Require students to memorize isolated procedural steps before they examine concrete ratio examples or visual contexts.',
        'Use one numerical case and prevent students from testing whether the relationship generalizes.':
          'Present a single numerical case and prevent students from testing whether the ratio pattern generalizes across values.',
      },
    },
    'plt5623-ch-02-check-04': {
      answer: 'Offer safe exploration of roles and interests, meaningful contribution, and credible feedback without permanent labels.',
      distractorReplacements: {
        'Assign a fixed identity based on the student’s current highest score.':
          'Assign students a fixed academic label based on their current highest score so future expectations remain unchanging.',
        'Use public ranking as the primary source of belonging.':
          'Use public achievement rankings and competitive scoreboards as the primary source of peer status and class belonging.',
        'Remove opportunities to explore interests so choices cannot change.':
          'Eliminate structured opportunities to explore new interests or try different group roles so student choices cannot shift.',
      },
    },
  },

  plt_7_12_5624: {
    ...sharedPltFixes('plt5624', 'eleventh-grade'),
    'plt5624-ch-02-check-02': {
      answer: 'Connect authentic cases, visual models, domain terms, and formal notation so students compare examples and justify concepts.',
      distractorReplacements: {
        'Present formal notation without examples, purpose, or opportunities to reason.':
          'Present formal symbolic notation in isolation without concrete examples, real-world purpose, or opportunities for student reasoning.',
        'Require memorization before students examine any evidence or examples.':
          'Require rote memorization of formal rules before students examine any authentic evidence, models, or concrete disciplinary examples.',
        'Use one worked example and prevent students from testing whether the principle generalizes.':
          'Demonstrate a single worked example and prevent students from testing whether the underlying principle generalizes across new cases.',
      },
    },
    'plt5624-ch-02-check-04': {
      answer: 'Offer safe exploration of roles and interests, meaningful contribution, and credible feedback without permanent labels.',
      distractorReplacements: {
        'Assign a fixed identity based on the student’s current course performance.':
          'Assign students a fixed academic identity based on current course grades so future expectations remain unchanging.',
        'Use public ranking as the primary source of belonging.':
          'Use public achievement rankings and competitive scoreboards as the primary source of peer status and class belonging.',
        'Remove opportunities to explore interests, values, and future roles.':
          'Eliminate structured opportunities to explore personal interests, values, and future roles so student choices stay fixed.',
      },
    },
  },

  plt_early_childhood_5621: {
    ...sharedPltFixes('plt5621', 'third-grade'),
    'plt5621-ch-02-check-02': {
      answer: 'Have children sort familiar objects, discuss and revise sorting rules, and show groups with drawings or words.',
      distractorReplacements: {
        'Start with a long abstract definition only.':
          'Begin with a lengthy abstract verbal definition before introducing any familiar classroom objects or visual examples.',
        'Require silent memorization before children handle examples.':
          'Require silent rote memorization of category names before children have time to handle concrete examples or talk aloud.',
        'Use one fixed category and prevent reclassification.':
          'Assign a single fixed category for each item and prevent children from reclassifying objects using a different attribute.',
      },
    },
    'plt5621-ch-02-check-04': {
      answer: 'Offer safe choices, purposeful roles, supported attempts, encouragement, and ways to fix mistakes without shame.',
      distractorReplacements: {
        'Reserve every meaningful role for the fastest children.':
          'Reserve every meaningful classroom helper role for the fastest children so routines finish quickly without delays.',
        'Use public comparison as the primary motivator.':
          'Use public peer comparison and visible behavior charts as the primary motivator for completing classroom activities.',
        'Prevent children from proposing or trying their own plans.':
          'Prevent children from proposing or trying their own play plans so teacher-directed tasks stay tightly controlled.',
      },
    },
  },

  plt_k6_5622: {
    ...sharedPltFixes('plt5622', 'sixth-grade'),
  },

  reading_specialist_5302: {
    'read5302-ch-02-check-03': {
      answer: 'Sound substitution, such as changing /k/ in cat to /h/ to say hat, requiring a learner to alter an oral word.',
    },
    'read5302-ch-02-check-05': {
      answer: 'Understanding how written text works in books, including directionality, word boundaries, and book parts.',
    },
    'read5302-ch-07-check-01': {
      answer: 'It flags risk and the need for timely follow-up; targeted skill evidence then specifies what to teach.',
    },
    'read5302-ch-08-check-01': {
      answer: 'Explicit, supported speech-sound segmentation linked to letters once the oral task is understood.',
    },
    'read5302-ch-09-check-04': {
      answer: 'Weigh current level, growth rate, stability, time left, goal fit, fidelity, and diagnostic data.',
    },
    'read5302-ch-12-check-01': {
      prompt: "What is the reading specialist's role in MTSS leadership?",
      answer: 'Coordinate core instruction, screening, support, monitoring, and team decisions; tiered support must not delay or deny evaluation.',
    },
    'read5302-ch-12-check-05': {
      answer: 'Disclose the tie, follow ethics and purchasing rules, share objective data, and recuse if needed.',
    },
  },

  teaching_reading_5205: {
    'tr5205-ch-01-check-03': {
      answer: 'Oral-language evidence helps explain comprehension and expression and guides language-rich reading teaching.',
    },
    'tr5205-ch-02-check-03': {
      answer: 'Sound substitution, such as changing /k/ in cat to /h/ to say hat, requiring a learner to alter an oral word.',
    },
    'tr5205-ch-02-check-05': {
      answer: 'Understanding how written text works in books, including directionality, word boundaries, and book parts.',
    },
    'tr5205-ch-04-check-01': {
      answer: 'Explicit, supported speech-sound segmentation linked to letters once the oral task is understood.',
    },
    'tr5205-ch-04-check-03': {
      answer: 'Descriptive task data about accuracy, fluency, and comprehension, paired with more reliable measures.',
    },
    'tr5205-ch-06-check-03': {
      answer: 'Set a time-bound goal from baseline data, outcome expectations, measure norms, and team judgment.',
    },
    'tr5205-ch-06-check-04': {
      answer: 'Weigh current level, growth rate, stability, time left, goal fit, fidelity, and diagnostic data.',
    },
    'tr5205-ch-08-check-01': {
      answer: 'Pair achievable challenge, real choice, responsive texts, scaffolds, and feedback that builds agency.',
    },
    'tr5205-ch-08-check-03': {
      answer: 'Provide the access tool for content goals while continuing direct instruction and measurement of decoding.',
    },
    'tr5205-ch-08-check-04': {
      answer: 'Identify linguistic, cultural, and knowledge resources that support English growth while modeling new forms.',
    },
    'tr5205-ch-09-check-01': {
      answer: 'Plan aligned tasks, model and guide the routine, review student work, note access, and adjust steps.',
    },
    'tr5205-ch-09-check-03': {
      answer: 'Track student explanations and credibility choices over time, note access gaps, and plan reteaching.',
    },
    'tr5205-ch-10-check-01': {
      answer: 'Log implemented lessons, review group growth, note access barriers, collect input, and share limits.',
    },
    'tr5205-ch-10-check-03': {
      answer: 'Verify educational interest and policy, use an approved secure method, and send only what is needed.',
    },
    'tr5205-ch-10-check-04': {
      answer: 'Decline or disclose the offer, follow ethics and purchasing rules, share objective data, and step back.',
    },
    'tr5205-ch-11-check-05': {
      answer: 'Linked texts build vocabulary and knowledge while allowing comparison of claims, evidence, and perspectives.',
    },
    'tr5205-ch-12-check-01': {
      answer: 'It flags risk and the need for timely follow-up; targeted follow-up data then specify skills to teach.',
    },
    'tr5205-ch-12-check-04': {
      answer: 'Available data fail to support the intended interpretation and use of the scores for this purpose.',
    },
  },

  esol_5362: {
    'esol5362-ch-01-check-05': {
      answer: 'Use a timeline and meaningful retelling to link past forms with finished events, then elicit them in a new context.',
    },
    'esol5362-ch-02-check-01': {
      answer: 'Its literal form is an interrogative, whereas its pragmatic function here is an indirect request.',
    },
    'esol5362-ch-02-check-04': {
      answer: 'Teach how pronouns, lexical ties, substitution, and conjunctions link ideas across sentences into connected text.',
    },
    'esol5362-ch-03-check-03': {
      answer: 'Keep the grade-level concept while adding visuals, gestures, modeling, language frames, and comprehension checks.',
    },
    'esol5362-ch-03-check-05': {
      answer: 'Match response timing and explicitness to the objective, error pattern, and impact while preserving participation.',
    },
    'esol5362-ch-04-check-01': {
      answer: 'Teach strategic use of cognates while explicitly checking meaning, form, and false cognates in context.',
    },
    'esol5362-ch-04-check-04': {
      answer: 'Evaluate knowledge across languages and contexts, since distributed competence may not appear in isolation.',
    },
    'esol5362-ch-05-check-05': {
      answer: 'Elicit varied prior schemas, give concise multimodal context, link experiences, and revisit background.',
    },
    'esol5362-ch-06-check-02': {
      answer: 'Extended wait time, varied participation routines, probing queries, peer uptake, and prompts to explain.',
    },
    'esol5362-ch-06-check-04': {
      answer: 'Acknowledge the meaning, target one or two patterns, prompt self-correction, and allow redrafting.',
    },
    'esol5362-ch-07-check-02': {
      answer: 'The score may reflect irrelevant background knowledge rather than the target lexical construct assessed.',
    },
    'esol5362-ch-07-check-03': {
      answer: 'Inconsistent scoring lowers dependability, so raters need clear rubrics, exemplars, calibration, and checks.',
    },
    'esol5362-ch-07-check-04': {
      answer: 'Treat bands as broad evidence within a multidimensional profile and examine domain and task performance.',
    },
    'esol5362-ch-07-check-05': {
      answer: 'Norm-referenced results show relative standing; criterion-referenced results show progress toward targets.',
    },
    'esol5362-ch-08-check-04': {
      answer: 'Classify omissions by form, function, context, frequency, meaning impact, and development before teaching.',
    },
    'esol5362-ch-08-check-05': {
      answer: 'Review representation, language load, accessibility, and skill relevance, removing nonessential barriers.',
    },
    'esol5362-ch-11-check-01': {
      answer: 'Co-design content and language objectives, analyze discourse demands, align scaffolds, and review outcomes.',
    },
    'esol5362-ch-11-check-04': {
      answer: 'Share only what legitimate professional duty requires, through secure, approved confidential channels.',
    },
    'esol5362-ch-12-check-01': {
      answer: 'Provide an educationally sound, resourced language program with equitable access to core opportunities.',
    },
    'esol5362-ch-12-check-02': {
      answer: 'Document the barrier, center family voices, review policy and evidence, propose changes, and track access.',
    },
    'esol5362-ch-12-check-04': {
      answer: 'Review whether separation is justified, temporary, effective, and reevaluated while expanding integration.',
    },
  },
};
