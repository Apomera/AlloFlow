'use strict';

// Hand-authored warning and length-parity remediations for the 20-item
// Unofficial Integrated EPPP 2027 Blueprint Preview pack
// (test_prep/eppp_2027_preview_pack.json).
//
// Invariants preserved for tests/eppp_2027_preview.test.js and
// dev-tools/qa_eppp_2027_preview.cjs:
//   - Keyed choices (choices[answerIndex]) and answerIndex are NEVER modified.
//   - eppp-2027-preview-ethical-02 distractors are untouched so its documented
//     categoricalDistractors QA exception remains active.
//   - All other 19 items have < 2 categorical-cue distractors and zero
//     warningCodes findings.
//   - Every non-key choiceRationale is >= 110 chars and >= 17 words.

module.exports = {
  'eppp-2027-preview-scientific-01': {
    choiceRationaleOverrides: {
      1: 'Expanding sample size or interview length under the same recruitment procedure does not eliminate dual-role pressure, nonresponse bias, or selective disclosure.',
      2: 'Discarding sharply negative accounts introduces systematic confirmation bias and weakens qualitative credibility rather than correcting clinician-interviewer influence.',
      3: 'Thematic saturation reflects informational adequacy for developing categories within a sampled group, not statistical generalizability to all involuntarily admitted patients.',
    },
  },
  'eppp-2027-preview-scientific-02': {
    choiceRationaleOverrides: {
      0: 'A small p value indicates strong evidence against a zero difference in a large sample, not that clients experience a clinically meaningful change.',
      2: 'A narrow confidence interval around a statistically significant difference reflects high statistical precision for a small effect rather than inadequate study power.',
      3: 'Comparing the point estimate and confidence interval against an a priori clinical threshold is a standard, informative method for judging practical importance.',
    },
  },
  'eppp-2027-preview-scientific-03': {
    distractorReplacements: {
      "Reducing daily use below two hours should lower an adolescent's probability of anxiety by approximately 40% across similar school populations.":
        "Based on the 1.4 odds ratio, reducing daily use below two hours should lower an adolescent's probability of anxiety by approximately 40% across similar schools.",
    },
    choiceRationaleOverrides: {
      1: 'An observational odds ratio does not estimate an intervention effect, and an odds ratio of 1.4 does not equate to a 40% reduction in absolute probability.',
      3: 'Statistical adjustment for measured demographics cannot make a convenience school sample representative of other adolescent populations or remove unmeasured confounding.',
    },
  },
  'eppp-2027-preview-assessment-01': {
    prompt:
      'A screening measure has 90% sensitivity and 90% specificity. It is administered in a setting where the target disorder occurs in 1% of clients. A client screens positive and has no other clinical information available. What is the most appropriate response?',
    choiceRationaleOverrides: {
      1: 'Low base-rate prevalence lowers positive predictive value and calls for clinical follow-up and confirmation rather than automatically discarding the screening result.',
    },
  },
  'eppp-2027-preview-assessment-02': {
    prompt:
      "An adult with a motor disability is referred for an evaluation of reasoning. The planned timed written-response test imposes a motor demand unrelated to reasoning, and its publisher provides neither an empirically supported accommodation nor norms for modified timing. What is the psychologist's best next step?",
    distractorReplacements: {
      'Omit standardized performance measures and base conclusions on interview and collateral data because any modification makes normed interpretation unusable.':
        'Omit standardized cognitive testing and base conclusions on clinical interviews and collateral records because modifying administration makes normed interpretation unusable.',
    },
    choiceRationaleOverrides: {
      2: 'Documenting an informal timing extension is necessary for transparency, but documentation alone does not make standard timed norms valid for an unstudied modification.',
    },
  },
  'eppp-2027-preview-assessment-03': {
    distractorReplacements: {
      'Subtract the estimated frozen interval from completion time and score using the usual remote norms.':
        "Estimate the total frozen interval, subtract it from the client's recorded completion time, and apply the standard remote norms.",
      'Prorate the completed responses and interpret them after confirming that the client understood the instructions.':
        'Prorate the completed subtest responses and interpret the resulting score after confirming that the client understood the task instructions.',
    },
    choiceRationaleOverrides: {
      2: 'Subtracting an estimated freeze duration is not a standardized procedure and creates an illusion of precision when actual working time is unknown.',
      3: 'Confirming that the client understood task instructions does not repair unobserved work time or restore standardized administration and scoring conditions.',
    },
  },
  'eppp-2027-preview-assessment-04': {
    distractorReplacements: {
      "Give the parent's rating priority because caregivers observe behavior across more hours than other informants.":
        "Give the parent's rating primary weight because caregivers observe the youth's behavior across more daily hours than other informants.",
      "Exclude the adolescent's report because low symptom endorsement is most likely deliberate underreporting.":
        "Set aside the adolescent's self-report because low symptom endorsement alongside high caregiver concern likely reflects deliberate underreporting.",
    },
    choiceRationaleOverrides: {
      0: 'Greater daily observation time does not make a caregiver rating universally more valid than teacher or youth input across distinct settings and contexts.',
      1: 'Mechanically averaging discrepant ratings obscures meaningful cross-setting behavioral differences and wrongly treats informants as interchangeable measures of the same context.',
      3: 'Deliberate underreporting is just one hypothesis for low youth endorsement and should not be assumed without corroborating clinical interviews or behavioral evidence.',
    },
  },
  'eppp-2027-preview-intervention-01': {
    prompt:
      'A clinic is considering a mental-health app whose vendor cites testimonials and one unpublished pre-post study. The app sends engagement data to a third party and has no documented emergency-escalation protocol. What should the clinic psychologist recommend?',
  },
  'eppp-2027-preview-intervention-03': {
    prompt:
      'An adult with hazardous alcohol use attends after an employer referral and says, "I do not think drinking is the main issue, but I hate how it is interfering with my job." There is no acute safety risk. Which initial response best supports engagement?',
  },
  'eppp-2027-preview-intervention-04': {
    prompt:
      'A rural school district reports increasing anxiety-related absence. A universal prevention program has strong research support from urban districts, while local students and caregivers identify transportation, discrimination, and work schedules as important barriers. Which plan best integrates the available information?',
  },
  'eppp-2027-preview-consultation-01': {
    distractorReplacements: {
      'Keep weekly supervision, add a standardized suicide-risk checklist, and require same-day email after any increase in ideation.':
        'Maintain weekly email supervision, add a standardized suicide-risk screening checklist, and require same-day email updates after any rise in ideation.',
      'Have the trainee follow agency crisis policy and arrange peer consultation between scheduled supervision sessions.':
        'Instruct the trainee to follow written agency crisis procedures and arrange regular peer consultation between scheduled weekly supervision reviews.',
    },
  },
  'eppp-2027-preview-consultation-02': {
    distractorReplacements: {
      'Report the program as provisionally effective because reach increased, while recommending later study of student functioning and referral patterns.':
        'Report the consultation program as provisionally effective because participation rose, while recommending a later study of student functioning and referral patterns.',
    },
    choiceRationaleOverrides: {
      1: 'Participation or attendance tracks program reach, but it cannot determine whether the service improved student functioning or reduced unnecessary referrals.',
    },
  },
  'eppp-2027-preview-interpersonal-02': {
    prompt:
      'A psychologist feels unusually protective of a client and repeatedly answers for the client in interdisciplinary meetings. A colleague notes that the client has asked to speak for themself. Which response is most appropriate?',
  },
  'eppp-2027-preview-ethical-01': {
    prompt:
      'A clinician wants to use an AI system that records sessions, drafts notes, and suggests diagnoses. The clinician has not examined the training data, error rate, storage policies, or accuracy across demographic groups. What is the most appropriate next step?',
    distractorReplacements: {
      'Use it only to draft notes, obtain a business-associate agreement, and require clinician sign-off; disable diagnostic suggestions until validation data are available.':
        'Restrict the system to drafting progress notes under a signed business-associate agreement with clinician review and sign-off, while disabling diagnostic suggestions until independent validation data become available.',
      'Run a small pilot with consenting low-risk clients, compare AI notes with clinician notes, and adopt it if agreement and client satisfaction are high.':
        'Conduct a small pilot with consenting low-risk outpatient clients, compare AI-drafted notes against clinician documentation, and adopt the tool if note agreement and client satisfaction ratings are high.',
      "Rely on the vendor's HIPAA and accuracy attestations, disclose AI use in the clinic's general consent, and monitor errors after implementation.":
        "Rely on the vendor's written HIPAA compliance and accuracy attestations, note AI assistance in the clinic's general intake consent form, and monitor documentation errors after rollout.",
    },
  },
  'eppp-2027-preview-ethical-02': {
    prompt:
      "In a United States outpatient practice covered by HIPAA, a psychologist receives an attorney-issued subpoena (not a judge-signed court order) demanding a client's entire therapy record. The client has not authorized release, and the psychologist does not know whether governing state privilege and procedural requirements have been satisfied. What should the psychologist do first?",
  },
  'eppp-2027-preview-ethical-03': {
    prompt:
      "Before a conference talk, a psychologist notices that a colleague's slides contain a client's rare occupation, exact age, clinic location, and detailed history. The colleague appears unaware that the combination may identify the client. The session has not yet begun, and addressing the issue privately would not violate confidentiality. What should the psychologist do first?",
    distractorReplacements: {
      'Ask the organizer to give a confidentiality reminder before the talk and let the colleague decide whether the details are sufficiently disguised.':
        'Ask the conference organizer to issue a general confidentiality reminder before the talk and let the colleague decide whether the case details are sufficiently disguised.',
    },
  },
};
