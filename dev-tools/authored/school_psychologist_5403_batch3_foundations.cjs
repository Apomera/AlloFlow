'use strict';

const draft = require('./school_psychologist_5403_batch3_foundations_draft.cjs');

const replacements = new Map([
  [0, {
    skillId: 'equitable-diverse-practice',
    prompt: 'A family returns a signed evaluation notice that was machine-translated into its home language. A community liaison explains that two translated disability terms carry stigmatizing meanings that differ from the district’s intended message. What should the school psychologist do?',
    correct: 'Pause reliance on the notice, obtain qualified linguistic and cultural review, provide a corrected version, verify family understanding, and document which version was used.',
    distractors: [
      {
        text: 'Retain the signed notice because the machine translation conveyed the general topic, then explain the disputed terms orally when the family attends the eligibility meeting.',
        reason: 'A signature on materially misleading information does not establish informed understanding, and a later oral correction leaves the flawed notice in the decision record.',
      },
      {
        text: 'Ask the community liaison to replace the two terms in the existing document and return it to the family without recording the revision.',
        reason: 'The liaison’s concern is valuable, but an undocumented informal edit does not establish qualified translation review or preserve an accurate version history.',
      },
      {
        text: 'Use the district’s English notice as the controlling version because technical terminology has an official meaning even when the translated wording communicates something different.',
        reason: 'The official English text does not provide meaningful language access when the family receives a translated version whose key terms alter the intended message.',
      },
    ],
    rationale: 'Meaningful notice depends on understandable and accurate communication, not the presence of a signature alone. Qualified review, comprehension verification, and version documentation correct the access problem while preserving a transparent record of what the family received.',
    difficulty: 'advanced',
    cognitiveLevel: 'evaluation',
  }],
  [4, {
    skillId: 'equitable-diverse-practice',
    prompt: 'A district report shows similar extracurricular participation for students with and without disabilities overall. Student advocates report that Black girls with disabilities rarely gain access to advanced STEM clubs. What should the school psychologist recommend?',
    correct: 'Conduct a privacy-protected intersectional analysis, gather affected students’ perspectives, identify decision-point barriers, and test access changes while monitoring outcomes.',
    distractors: [
      {
        text: 'Continue using the disability-only participation rate because adding race and gender would make the analysis less comparable with the district’s original public report.',
        reason: 'A broad disability average can conceal an intersectional access gap; comparability does not justify ignoring the specific pattern raised by students.',
      },
      {
        text: 'Reserve a fixed number of club seats for the reported subgroup before examining recruitment, prerequisites, selection decisions, scheduling, or student preferences.',
        reason: 'Immediate seat allocation may not address the barriers producing the gap and bypasses evidence about where access is lost and what affected students want.',
      },
      {
        text: 'Publish student-level participation records so families can verify whether individual club sponsors apply membership requirements consistently across demographic groups.',
        reason: 'Public student-level disclosure creates privacy harms and is unnecessary for a careful internal analysis of selection points, access barriers, and outcomes.',
      },
    ],
    rationale: 'Aggregate parity can mask barriers experienced at the intersection of disability, race, and gender. Protected disaggregation, student voice, and analysis of recruitment and selection processes can locate the barrier and support a measurable remedy without exposing individuals.',
    difficulty: 'advanced',
    cognitiveLevel: 'analysis',
  }],
  [5, {
    skillId: 'equitable-diverse-practice',
    prompt: 'A school participation policy bars all head coverings during assemblies. Discipline records show that it disproportionately excludes students who wear religious or culturally significant head coverings. What should the school psychologist recommend?',
    correct: 'Operationalize where exclusion occurs, consult affected students and families, examine the policy’s purpose and impact, revise unnecessary barriers, and monitor participation.',
    distractors: [
      {
        text: 'Keep the rule unchanged because identical written expectations establish fairness even when one group experiences a substantially different participation consequence.',
        reason: 'Identical wording does not establish equitable impact, and the observed exclusion warrants examination of whether the rule is necessary and appropriately applied.',
      },
      {
        text: 'Create a broad exception for any student who objects to a dress expectation, without defining the policy purpose or tracking how decisions are made.',
        reason: 'An undefined exception may be applied inconsistently and does not create a transparent, evidence-informed process for removing the identified barrier.',
      },
      {
        text: 'Offer excluded students a separate livestream of assemblies so the school can preserve the original rule while documenting that instructional content remains available.',
        reason: 'A separate feed may preserve information access but continues exclusion from the shared school experience and does not address the policy’s disparate effect.',
      },
    ],
    rationale: 'A neutral-looking policy can create inequitable participation when its design or implementation disregards religious and cultural practices. Defining decision points, listening to affected communities, and monitoring a revised process support access without assuming that every policy purpose is invalid.',
    difficulty: 'application',
    cognitiveLevel: 'evaluation',
  }],
  [8, {
    skillId: 'equitable-diverse-practice',
    prompt: 'A district needs demographic data to evaluate service access, but its form requires each family to choose exactly one race and one home language. Multiracial and multilingual families report selecting inaccurate categories. What should the school psychologist recommend?',
    correct: 'Use inclusive self-identification options, explain purpose and privacy, permit multiple selections or self-description, and plan analyses that do not erase smaller groups.',
    distractors: [
      {
        text: 'Retain one required category for each variable because mutually exclusive data are easier to summarize and compare across reporting periods.',
        reason: 'Administrative convenience does not justify forcing inaccurate identities, and the resulting categories may distort the access patterns the district intends to study.',
      },
      {
        text: 'Ask school staff to assign categories from enrollment records when families select more than one option so the dataset remains internally consistent.',
        reason: 'Staff assignment overrides self-identification, can introduce error and bias, and does not make a forced single-category model more valid.',
      },
      {
        text: 'Remove demographic questions from the form because collecting identity information creates privacy concerns and cannot contribute to individual services.',
        reason: 'Eliminating identity data can hide inequitable access; transparent purpose, privacy protections, and respectful collection provide a more balanced solution.',
      },
    ],
    rationale: 'Equity analysis depends on categories that reflect how people identify rather than a convenient forced choice. Inclusive collection, clear governance, and analysis rules for multiple and small groups improve data validity while respecting dignity and privacy.',
    difficulty: 'advanced',
    cognitiveLevel: 'evaluation',
  }],
  [18, {
    skillId: 'legal-ethical-professional',
    prompt: 'A school psychologist is scheduled to assess a student remotely. The available consumer video platform is not district approved, and the student would connect from a busy family room where conversations can be overheard. What should the psychologist do?',
    correct: 'Pause the session until approved secure technology, a suitable private setting, access checks, and contingency and emergency procedures can be arranged and documented.',
    distractors: [
      {
        text: 'Proceed on the consumer platform after asking everyone in the room to avoid listening, then place a note in the report that privacy could not be guaranteed.',
        reason: 'A warning does not cure foreseeable confidentiality, security, standardization, and emergency-response problems when safer arrangements have not been established.',
      },
      {
        text: 'Proceed with interview questions but omit performance tasks because conversational information is not sensitive and requires fewer administration controls.',
        reason: 'Interviews can contain highly sensitive information, and changing the assessment plan does not resolve platform security, privacy, access, or contingency concerns.',
      },
      {
        text: 'Cancel remote assessment as a service option for the student because in-person administration is the only format that can produce useful school data.',
        reason: 'Remote methods may be appropriate when secure technology, access, privacy, suitability, procedures, and interpretive limits are responsibly addressed.',
      },
    ],
    rationale: 'Remote assessment does not reduce the psychologist’s responsibility for confidentiality, suitability, access, standardized conditions, and foreseeable emergencies. The session should wait until an approved environment and explicit contingency plan support defensible service.',
    difficulty: 'advanced',
    cognitiveLevel: 'evaluation',
  }],
  [21, {
    skillId: 'legal-ethical-professional',
    prompt: 'After a family questions an intern’s evaluation report, the supervisor discovers that the intern omitted classroom data that conflict with the report’s main conclusion. What should the supervising school psychologist do first?',
    correct: 'Pause release, review all source data with the intern, correct the report and decision record, address the intern’s competence, and ensure a fair response to the family.',
    distractors: [
      {
        text: 'Release the report under the supervisor’s signature because the omitted information can be discussed verbally at the meeting without changing the written conclusion.',
        reason: 'A signature does not repair a materially incomplete report, and verbal disclosure cannot substitute for an accurate record available to the team and family.',
      },
      {
        text: 'Remove the intern from the case and finish the report privately so the family receives a prompt answer without details about the correction process.',
        reason: 'Reassignment may be needed, but secrecy bypasses correction of the record, the family’s concern, the intern’s supervision needs, and procedural fairness.',
      },
      {
        text: 'Ask the intern to add the missing classroom data as an appendix while leaving the original conclusion and recommendations unchanged.',
        reason: 'Appending contradictory evidence without reconsidering the inference preserves the central error and fails to integrate all relevant evaluation data.',
      },
    ],
    rationale: 'Supervision requires active protection of service quality, accurate records, trainee development, and fair treatment of families. Pausing release and reintegrating the contradictory evidence prevents an incomplete conclusion from driving decisions while allowing transparent correction and remediation.',
    difficulty: 'advanced',
    cognitiveLevel: 'evaluation',
  }],
]);

module.exports = draft.map((spec, index) => {
  if (replacements.has(index)) return replacements.get(index);
  if (index === 7) {
    const distractors = spec.distractors.map((entry) => ({ ...entry }));
    distractors[1] = {
      text: 'Exclude the scale entirely and rely only on interviews and classroom observations because limited population evidence prevents any defensible use of its scores.',
      reason: 'Limited population evidence warrants qualified use and triangulation, not automatic rejection of every potentially informative score from the structured rating source.',
    };
    return { ...spec, distractors };
  }
  if (index === 10) {
    return {
      ...spec,
      correct: 'Selective attrition may make completers unlike those who left, so the reported outcome can overstate the program’s effect for enrolled students.',
    };
  }
  if (index === 15) {
    const distractors = spec.distractors.map((entry) => ({ ...entry }));
    distractors[0] = {
      text: 'Treat the additional staff supports as parts of one fidelity index, then conclude that the combined implementation package caused the stronger outcomes.',
      reason: 'Relabeling correlated supports as fidelity does not create experimental control; baseline site differences, selection, and other confounds still prevent that causal conclusion.',
    };
    return { ...spec, distractors };
  }
  if (index === 23) {
    return {
      ...spec,
      correct: spec.correct.replace(
        'disclose relevant interests',
        'disclose any relevant interests',
      ),
    };
  }
  return spec;
});
