'use strict';

const sourceRecords = {
  apaEthics: {
    url: 'https://www.apa.org/ethics/code',
    title: 'Ethical Principles of Psychologists and Code of Conduct',
    organization: 'American Psychological Association',
    summary: 'The current APA Ethics Code includes Standard 1.02 on conflicts between ethics and law and Standard 3.04 on avoiding harm.',
    credibility: 'The American Psychological Association publishes and maintains the operative text of its own Ethics Code, making this the primary professional source for the cited standards.',
  },
  apaTortureRevision: {
    url: 'https://www.apa.org/monitor/2016/10/apa-news',
    title: 'APA Council Revises Ethics Code Standard 3.04 to Prohibit Participation in Torture',
    organization: 'American Psychological Association Monitor on Psychology',
    summary: 'APA reports that the 2017 revision to Standard 3.04 prohibits psychologists from participating in torture and focuses on the psychologist\u2019s conduct rather than the setting.',
    credibility: 'This is the American Psychological Association\u2019s official report of the Council action that revised its Ethics Code, including the operative date and purpose of the amendment.',
  },
  iptReview: {
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1414693/',
    title: 'Interpersonal Psychotherapy for Depression: A Meta-Analysis',
    organization: 'PubMed Central, U.S. National Library of Medicine',
    summary: 'This peer-reviewed review describes IPT as a structured, time-limited treatment organized around beginning, middle, and termination phases and a current interpersonal focus.',
    credibility: 'PubMed Central preserves the complete peer-reviewed journal article with author, journal, citation, methods, and reference metadata through the U.S. National Library of Medicine.',
  },
  iptProblemAreas: {
    url: 'https://academic.oup.com/book/1328',
    title: 'Interpersonal Psychotherapy: A Global Reach',
    organization: 'Oxford University Press',
    summary: 'The clinical text describes the four IPT problem areas of grief, role disputes, role transitions, and interpersonal deficits and their use in treatment formulation.',
    credibility: 'Oxford University Press is an established academic publisher, and this clinician-authored volume provides a traceable treatment-specific account of IPT concepts and procedures.',
  },
  prolongedExposure: {
    url: 'https://www.ptsd.va.gov/disaster_events/for_providers/providers_pe_invivo.asp',
    title: 'For Mental Health Providers: In Vivo Exposures for Prolonged Exposure Therapy',
    organization: 'U.S. Department of Veterans Affairs, National Center for PTSD',
    summary: 'The provider guidance distinguishes imaginal from in vivo exposure, describes graded practice, and explains how exposure addresses avoidance and supports new learning.',
    credibility: 'The National Center for PTSD is a U.S. Department of Veterans Affairs research and education center; this provider resource directly describes evidence-based PE procedures and clinical rationale.',
  },
  transferAppropriateProcessing: {
    url: 'https://doi.org/10.1016/S0022-5371(77)80016-9',
    title: 'Levels of Processing Versus Transfer Appropriate Processing',
    organization: 'Journal of Verbal Learning and Verbal Behavior, Elsevier',
    summary: 'The original experiment found that semantic encoding aided a standard recognition test, while rhyme-oriented encoding produced better performance on a rhyming recognition test.',
    credibility: 'This DOI identifies the original peer-reviewed Morris, Bransford, and Franks experiment that established the tested transfer-appropriate-processing effect.',
  },
  rpasStudy: {
    url: 'https://pubmed.ncbi.nlm.nih.gov/31633395/',
    title: 'Does the Rorschach Performance Assessment System Differ from the Comprehensive System on Variables Relevant to Interpretation?',
    organization: 'Journal of Personality Assessment, indexed by PubMed',
    summary: 'The peer-reviewed comparison found that R-PAS administration yielded substantially more protocols in the intended response range and less response-count variability than Comprehensive System administration.',
    credibility: 'PubMed provides the complete bibliographic record and abstract for a peer-reviewed empirical comparison, including authors, journal, DOI, sample, and reported results.',
  },
  rpasOfficial: {
    url: 'https://r-pas.org/Home/About',
    title: 'About the Rorschach Performance Assessment System',
    organization: 'R-PAS, LLC',
    summary: 'The official system description explains that R-PAS uses detailed standardized administration procedures intended to optimize the number of responses and improve interpretive utility.',
    credibility: 'This is the system developer\u2019s official documentation and is therefore a primary source for R-PAS administration design; comparative claims are separately supported by peer-reviewed research.',
  },
};

function withSources(replacement, keys) {
  const sourceDetails = keys.map((key) => sourceRecords[key]);
  return { ...replacement, references: sourceDetails.map((source) => source.url), sourceDetails };
}

const replacements = {
  'eppp-v3-intervention-002': withSources({
    difficulty: 'advanced',
    prompt: 'A client\u2019s depressive symptoms began after retirement. She misses the structure and status of her former position and is struggling to develop satisfying routines and relationships in her new circumstances. If interpersonal psychotherapy is used, which focal problem area best fits this formulation?',
    choices: [
      'Grief, because the primary task is mourning the death of a significant person',
      'Role dispute, because the primary task is resolving incompatible expectations with another person',
      'Interpersonal deficits, because the primary task is addressing a longstanding pattern of sparse or unsatisfying relationships',
      'Role transition, because the primary task is adapting to the gains, losses, and demands of a changed social role',
    ],
    answerIndex: 3,
    rationale: 'IPT identifies a role transition when symptoms are linked to difficulty adapting to a major change in social role. Retirement can involve losses of status, structure, and relationships as well as opportunities for new roles. The vignette centers on adaptation to that change rather than bereavement, a specific interpersonal conflict, or a longstanding interpersonal pattern.',
    choiceRationales: [
      'IPT grief work addresses depressive symptoms associated with the death of a significant person. The client has experienced meaningful losses, but the vignette describes retirement and changed social circumstances rather than bereavement.',
      'A role dispute involves nonreciprocal expectations between the client and another person, often assessed as renegotiable, at an impasse, or dissolving. No central conflict with a specific person is described here.',
      'Interpersonal deficits are considered when a longstanding history of sparse, unstable, or unrewarding relationships is the central focus. This client\u2019s difficulty is temporally linked to a recent change in role.',
      'IPT role-transition work addresses adaptation to a changed social role, including associated losses, gains, expectations, and relationship patterns. Retirement is the organizing change in this case.',
    ],
    learningObjectiveId: 'intervention-ipt-role-transition-formulation',
    cognitiveProcess: 'analysis',
    distractorDesign: ['bereavement-versus-transition', 'role-dispute-versus-transition', 'traitlike-deficits-versus-recent-change'],
  }, ['iptProblemAreas']),

  'eppp-v3-intervention-066': withSources({
    difficulty: 'advanced',
    prompt: 'Near the planned end of a time-limited course of interpersonal psychotherapy, a client\u2019s depressive symptoms have improved and the agreed interpersonal focus has substantially resolved. Which therapist response is most consistent with the termination phase of IPT?',
    choices: [
      'Shift to an unrelated interpersonal problem so the remaining sessions contain a new active treatment target',
      'Interpret the client\u2019s reaction to ending primarily as evidence of unresolved early-childhood separation conflict',
      'Extend treatment on the existing schedule until the client reports no concern about ending the therapeutic relationship',
      'Review gains and effective strategies, discuss feelings about ending, and plan how the client will recognize and address future difficulties',
    ],
    answerIndex: 3,
    rationale: 'The IPT termination phase consolidates gains, reviews the client\u2019s improved interpersonal skills and strategies, explicitly addresses feelings about ending, and supports future problem solving and relapse awareness. A new focus or extended treatment may occasionally be clinically indicated, but neither follows automatically when the agreed focus has resolved and progress is stable.',
    choiceRationales: [
      'Introducing a new focus late in a successful time-limited treatment can undermine consolidation. A distinct unresolved problem would first require assessment and an explicit decision about further treatment rather than an automatic shift.',
      'IPT discusses feelings about termination, but it ordinarily retains its present-focused interpersonal formulation. Treating the reaction chiefly as proof of an early-childhood conflict substitutes a different theoretical explanation.',
      'Concern or sadness about ending can be expected and is discussed directly. It does not by itself require extending treatment until those feelings disappear; further care depends on clinical need and a renewed plan.',
      'Reviewing symptom and interpersonal gains, naming useful strategies, processing the ending, and anticipating future warning signs are core consolidation tasks in the termination phase of time-limited IPT.',
    ],
    learningObjectiveId: 'intervention-ipt-termination-phase',
    cognitiveProcess: 'application',
    distractorDesign: ['late-new-focus', 'theory-substitution', 'automatic-extension'],
  }, ['iptReview']),

  'eppp-v3-intervention-010': withSources({
    difficulty: 'advanced',
    prompt: 'A client with PTSD repeatedly avoids a safe grocery store because its floral display evokes the assault and also avoids discussing the trauma memory. Which plan most closely reflects the two exposure components of prolonged exposure therapy?',
    choices: [
      'Use relaxation whenever distress rises and postpone discussion of the trauma memory or visits to the safe store until anxiety is absent',
      'Assign repeated visits to crowded public settings without first determining what function the grocery-store avoidance serves',
      'Have the client recount the trauma in session while continuing to avoid the grocery store between sessions',
      'Use imaginal revisiting of the trauma memory and collaboratively graded visits to the safe store that address the reminder-based avoidance',
    ],
    answerIndex: 3,
    rationale: 'PE combines imaginal exposure, in which the trauma memory is revisited, with in vivo exposure to safe but avoided situations or reminders. The in vivo hierarchy should match the function of the avoidance. Both components reduce avoidance and create opportunities for new learning; treatment does not require waiting for distress to disappear before approaching safe reminders.',
    choiceRationales: [
      'Skills for tolerating arousal may support treatment, but using them to delay safe trauma reminders until anxiety is absent preserves avoidance and omits the planned imaginal and in vivo exposure work.',
      'In vivo work is collaborative and function based. Generic visits to crowded places may miss the floral reminder that maintains this client\u2019s avoidance and therefore may not target the relevant learning.',
      'Revisiting the memory is imaginal exposure, but continuing avoidance of a safe trauma reminder leaves the in vivo component and its opportunity for corrective learning unaddressed.',
      'This plan pairs imaginal revisiting with graded, function-matched in vivo practice. It directly targets both avoidance of the trauma memory and avoidance of a safe situational reminder.',
    ],
    learningObjectiveId: 'intervention-pe-components-and-avoidance-function',
    cognitiveProcess: 'analysis',
    distractorDesign: ['distress-elimination-before-exposure', 'function-mismatched-exposure', 'imaginal-only-plan'],
  }, ['prolongedExposure']),

  'eppp-v2-professional-050': withSources({
    difficulty: 'advanced',
    prompt: 'A psychologist is competently providing an indicated exposure-based treatment. The client gives informed consent and experiences expected temporary distress during carefully monitored exercises. Which interpretation of APA Ethics Code Standard 3.04 is most defensible?',
    choices: [
      'The psychologist must discontinue because foreseeable emotional distress is itself proof of unethical harm',
      'The psychologist may proceed without further monitoring because the client consented to the treatment risks',
      'The psychologist may treat clinical benefit as sufficient justification for whatever adverse effects occur',
      'The psychologist should use reasonable safeguards to avoid harm and minimize foreseeable harm that cannot be avoided',
    ],
    answerIndex: 3,
    rationale: 'Standard 3.04 requires reasonable steps to avoid harming people with whom psychologists work and to minimize foreseeable harm when it is unavoidable. Expected distress is not automatically equivalent to unethical harm, but indication and consent do not remove the duties of competent planning, monitoring, and risk minimization.',
    choiceRationales: [
      'A treatment can involve expected, time-limited distress without violating the avoiding-harm standard. The ethical question is whether the intervention is justified and foreseeable harm is competently minimized.',
      'Informed consent is important, but consent does not waive the psychologist\u2019s continuing responsibility to monitor the client, respond to emerging risk, and take reasonable harm-reduction steps.',
      'Potential benefit does not authorize unbounded adverse effects. The psychologist remains responsible for proportional clinical judgment, competent implementation, monitoring, and minimization of foreseeable harm.',
      'This response tracks Standard 3.04: take reasonable steps to avoid harm and minimize harm that is foreseeable and unavoidable. It also preserves ongoing clinical judgment rather than treating consent as a waiver.',
    ],
    learningObjectiveId: 'professional-avoiding-harm-risk-minimization',
    cognitiveProcess: 'analysis',
    distractorDesign: ['distress-equals-ethical-harm', 'consent-waives-monitoring', 'benefit-justifies-unbounded-risk'],
  }, ['apaEthics']),

  'eppp-v2-professional-045': withSources({
    difficulty: 'advanced',
    prompt: 'A psychologist is asked to advise an interrogation team on procedures intended to inflict severe mental suffering to obtain information. The psychologist would not administer the procedures personally. Under APA Ethics Code Standard 3.04(b), what is the best response?',
    choices: [
      'Participate because consultation is ethically distinct from carrying out the procedures',
      'Participate after obtaining written authorization from the responsible legal authority',
      'Refuse to participate, facilitate, or assist because the prohibition applies to the psychologist\u2019s conduct and includes torture',
      'Participate in order to make the team\u2019s proposed procedures less severe than originally planned',
    ],
    answerIndex: 2,
    rationale: 'Standard 3.04(b) prohibits psychologists from participating in, facilitating, assisting, or otherwise engaging in torture and in specified cruel, inhuman, or degrading behavior. The rule addresses conduct rather than job title or setting, so an advisory role and authorization from others do not create an exception.',
    choiceRationales: [
      'The standard expressly reaches facilitation and assistance, so limiting the psychologist\u2019s role to consultation does not place the conduct outside the prohibition when the advice supports torture.',
      'Authorization by a legal or organizational authority does not alter the conduct described. Standard 3.04(b) does not create an authorization exception for participating in or facilitating torture.',
      'Refusal is required because advising the planned conduct would facilitate or assist torture. The standard is framed around what the psychologist contributes, not whether the psychologist directly administers a procedure.',
      'A harm-reduction rationale does not permit participation in prohibited torture. The psychologist can oppose the conduct or support lawful humane alternatives without facilitating the planned procedures.',
    ],
    learningObjectiveId: 'professional-standard-3-04b-torture-facilitation',
    cognitiveProcess: 'application',
    distractorDesign: ['consultant-role-exception', 'authority-exception', 'harm-reduction-rationalization'],
  }, ['apaEthics', 'apaTortureRevision']),

  'eppp-b024-professional-1': withSources({
    difficulty: 'advanced',
    prompt: 'A new governing rule appears to conflict with a psychologist\u2019s obligations under the APA Ethics Code. Before acting, the psychologist confirms that the conflict is genuine. Which next course most closely follows Standard 1.02?',
    choices: [
      'Treat the governing rule as resolving the ethical issue and omit the conflict from professional discussions',
      'Treat the Ethics Code as legal authority and disregard the governing rule without further analysis',
      'Withdraw from the professional role because identifying a conflict ends the psychologist\u2019s ethical responsibilities',
      'Clarify the conflict, make known a commitment to the Ethics Code, and take reasonable steps toward a resolution consistent with the Code',
    ],
    answerIndex: 3,
    rationale: 'Standard 1.02 directs psychologists to clarify the nature of a conflict, make known their commitment to the Ethics Code, and take reasonable steps to resolve it consistently with the Code\u2019s principles and standards. It does not grant unilateral legal authority, and it cannot be invoked to justify or defend a violation of human rights.',
    choiceRationales: [
      'A governing requirement does not erase the ethical conflict. Standard 1.02 calls for the psychologist to identify the conflict openly and undertake reasonable resolution steps rather than silently treating it as settled.',
      'The Ethics Code is a professional code, not a substitute source of legal authority. Unilateral noncompliance may create additional consequences and bypasses the standard\u2019s conflict-resolution process.',
      'Withdrawal may become relevant in a particular situation, but it is not the automatic first consequence of identifying a conflict. The standard instead specifies clarification, commitment, and reasonable resolution efforts.',
      'This sequence follows Standard 1.02. The psychologist acknowledges both obligations, states commitment to the Code, and pursues reasonable steps consistent with its principles and standards.',
    ],
    learningObjectiveId: 'professional-standard-1-02-ethics-law-conflict',
    cognitiveProcess: 'application',
    distractorDesign: ['law-erases-ethics', 'code-as-legal-authority', 'automatic-withdrawal'],
  }, ['apaEthics']),

  'eppp-v2-cognitive-affective-031': withSources({
    difficulty: 'advanced',
    prompt: 'One group decides whether each study word fits meaningfully into a sentence. A second group decides whether each word rhymes with a cue. The later test asks which studied words rhyme with new cues. What does transfer-appropriate processing predict?',
    choices: [
      'The rhyme-judgment group can outperform the semantic group because its encoding operations better match the retrieval test',
      'The semantic group must outperform because semantic processing produces stronger memory on each kind of retrieval test',
      'The groups should perform similarly because both groups intentionally made judgments throughout the study list',
      'The rhyme-judgment group should benefit chiefly because rhyming cues reinstate the physical room in which encoding occurred',
    ],
    answerIndex: 0,
    rationale: 'Transfer-appropriate processing predicts that memory depends partly on the match between operations at encoding and retrieval. Although semantic encoding often supports strong performance on conventional recognition tests, rhyme-oriented encoding can confer an advantage when the retrieval test also requires phonological or rhyming processing.',
    choiceRationales: [
      'The rhyming test recapitulates the phonological operations used by the rhyme-judgment group. That processing match can outweigh the usual advantage of semantic encoding for a conventional recognition test.',
      'Semantic processing often yields durable memory, but transfer-appropriate processing rejects the claim that it has the same advantage on every test. Retrieval demands help determine which encoding operations transfer best.',
      'Both groups engage with the words, yet the kind of processing differs. Equating performance because each group made a judgment ignores the specific relation between encoding operations and retrieval demands.',
      'This explanation confuses processing match with environmental context reinstatement. The key overlap is phonological processing at study and test, not return to the same physical setting.',
    ],
    learningObjectiveId: 'cognitive-transfer-appropriate-processing-experiment',
    cognitiveProcess: 'analysis',
    distractorDesign: ['depth-always-dominates', 'generic-engagement-equivalence', 'context-reinstatement-confusion'],
  }, ['transferAppropriateProcessing']),

  'eppp-v2-assessment-059': withSources({
    difficulty: 'advanced',
    prompt: 'A trainee asks why R-PAS uses standardized prompts and response limits intended to optimize the number of responses across the ten cards. What is the best psychometric rationale for this administration feature?',
    choices: [
      'It encourages unrestricted responding so that longer protocols receive greater interpretive weight',
      'It makes reference values unnecessary by ensuring that examinees produce the same content themes',
      'It corrects response productivity after administration by replacing coded responses with qualitative impressions',
      'It reduces overly short or long protocols and response-count variability that can complicate interpretation',
    ],
    answerIndex: 3,
    rationale: 'R-PAS uses R-Optimized administration to bring response productivity into a more interpretable range through standardized prompting and limits. Empirical comparison found more R-PAS records in the intended response range and less response-count variability than Comprehensive System records. This improves control of protocol length; it does not standardize content or eliminate scoring and reference data.',
    choiceRationales: [
      'R-Optimized administration is not an invitation to produce an unrestricted number of responses. It uses procedures at both ends of the range to reduce unusually short and unusually long records.',
      'Optimizing response count does not force examinees to report identical perceptions or themes. R-PAS continues to rely on coded variables, reference values, and individual differences in performance.',
      'The feature operates during standardized administration, before scoring. It does not replace coding with impressionistic interpretation or retroactively repair productivity after the record is collected.',
      'Response count influences many Rorschach variables. Standardized prompts and limits aim to reduce extreme protocol lengths and productivity variability, supporting more stable interpretation.',
    ],
    learningObjectiveId: 'assessment-rpas-r-optimized-administration',
    cognitiveProcess: 'analysis',
    distractorDesign: ['unrestricted-more-is-better', 'content-standardization-confusion', 'posthoc-qualitative-correction'],
  }, ['rpasOfficial', 'rpasStudy']),
};

module.exports = { sourceRecords, replacements };
