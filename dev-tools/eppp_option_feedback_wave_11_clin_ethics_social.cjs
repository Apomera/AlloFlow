'use strict';

const revisions = {
  'eppp-v3-intervention-043': {
    expectedAnswerIndex: 2,
    incorrectFeedback: {
      0: 'Traditional behavior therapy changes behavior through learning principles such as reinforcement and exposure. It need not dispute rigid demands, which is the cognitive-philosophical target signaled by this terminology.',
      1: 'An empathic, nondirective stance emphasizes congruence and unconditional positive regard rather than actively labeling and disputing a client?s absolutistic beliefs as irrational.',
      3: 'Interpreting unconscious conflict, defenses, and transference belongs to a psychoanalytic framework. The named pattern of rigid demands comes from a different therapeutic vocabulary.',
    },
    feedbackDesign: ['behavioral-technique substitution', 'person-centered-stance substitution', 'psychoanalytic-vocabulary substitution'],
    sourceCheck: 'The APA Dictionary attributes “musturbation” to Albert Ellis, defines it as unrealistic rigid demands expressed through musts or shoulds, and explicitly cross-references rational emotive behavior therapy.',
    references: ['https://dictionary.apa.org/musturbation'],
    sourceDetails: [{
      url: 'https://dictionary.apa.org/musturbation',
      title: 'APA Dictionary of Psychology Entry: Musturbation',
      organization: 'American Psychological Association',
      summary: 'The entry defines Albert Ellis’s term for rigid and unrealistic must or should demands and links the construct directly to rational emotive behavior therapy.',
      credibility: 'The American Psychological Association publishes and editorially maintains this professional psychology dictionary; the entry directly defines the named term and attributes it to the theorist in the keyed therapy.',
    }],
  },
  'eppp-v3-intervention-042': {
    expectedAnswerIndex: 1,
    incorrectFeedback: {
      0: 'Dream interpretation examines symbolic or unconscious meaning within a psychoanalytic framework. FAP instead uses functionally assessed behavior occurring between client and therapist as material for change.',
      2: 'Between-session assignments are common in many cognitive-behavioral treatments, but they are not FAP’s defining focus. FAP emphasizes therapist responses to clinically relevant behavior as it occurs in session.',
      3: 'Structural family therapy targets family organization, boundaries, alliances, and interaction patterns across the system. FAP analyzes and shapes an individual client’s in-session behavior through the therapeutic relationship.',
    },
    feedbackDesign: ['psychoanalytic-method substitution', 'homework-focus substitution', 'family-systems substitution'],
    sourceCheck: 'Peer-reviewed descriptions of FAP identify the therapeutic relationship as an agent of change and define CRB1 and CRB2 as problematic and improved client behaviors occurring in session.',
    references: ['https://pmc.ncbi.nlm.nih.gov/articles/PMC2686982/'],
    sourceDetails: [{
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2686982/',
      title: 'The Challenge of Understanding Process in Clinical Behavior Analysis: The Case of Functional Analytic Psychotherapy',
      organization: 'PubMed Central, U.S. National Library of Medicine',
      summary: 'This peer-reviewed article explains FAP’s behavior-analytic use of the therapeutic relationship and describes clinically relevant in-session problem behaviors and improvements as treatment targets.',
      credibility: 'PubMed Central provides the complete peer-reviewed journal article through the U.S. National Library of Medicine; the article directly explains FAP mechanisms and clinically relevant behaviors.',
    }],
  },
  'eppp-v3-professional-065': {
    expectedAnswerIndex: 0,
    incorrectFeedback: {
      1: 'The testimonials standard regulates solicitation from people vulnerable to undue influence, such as current clients. It does not govern the clinical comparison of foreseeable treatment risks and safer alternatives.',
      2: 'The records standard concerns creating, storing, transferring, and disposing of professional documentation. Adequate records may document a risk decision, but recordkeeping is not the ethical principle driving it.',
      3: 'The student-performance standard requires timely, specific evaluation processes grounded in program requirements. It has no direct application to choosing among interventions based on expected harm.',
    },
    feedbackDesign: ['testimonial-rule substitution', 'recordkeeping-rule substitution', 'student-evaluation-rule substitution'],
    sourceCheck: 'APA Ethics Code Standard 3.04 addresses reasonable steps to avoid harm and to minimize foreseeable and unavoidable harm; the other named standards regulate distinct professional activities.',
  },
  'eppp-b004-professional-1': {
    expectedAnswerIndex: 1,
    incorrectFeedback: {
      0: 'Interest and confidence may motivate professional development, but neither demonstrates competence. Accepting work without the relevant preparation can create risk even when the psychologist is willing and well intentioned.',
      2: 'A client may consent to a proposed service, but consent cannot waive the psychologist’s duty to practice within professional competence. The obligation concerns the provider’s preparation, not the client’s preference.',
      3: 'Coverage and availability affect access and payment, not whether a psychologist is qualified to provide a service. Administrative approval cannot substitute for relevant professional preparation.',
    },
    feedbackDesign: ['confidence-for-competence substitution', 'consent-as-waiver error', 'administrative-authorization substitution'],
    sourceCheck: 'APA Ethics Code Standard 2.01 explicitly grounds competence in relevant education, training, supervised experience, consultation, study, or professional experience, not confidence, consent, or reimbursement.',
  },
  'eppp-b008-social-1': {
    expectedAnswerIndex: 0,
    incorrectFeedback: {
      1: 'Positive stereotypes may sometimes produce stereotype-lift effects, but performance is not guaranteed for each individual. The defining phenomenon concerns pressure created by a negative identity-relevant stereotype.',
      2: 'A person does not have to endorse a stereotype for it to become situationally relevant. Awareness that others may judge performance through that stereotype can itself create evaluative pressure.',
      3: 'Collecting demographic information does not automatically invalidate a test. Such cues can sometimes increase stereotype salience, but validity depends on evidence supporting the intended interpretation and use of scores.',
    },
    feedbackDesign: ['positive-stereotype overgeneralization', 'endorsement requirement error', 'automatic-invalidity error'],
    sourceCheck: 'Steele and Aronson experimentally varied whether a difficult test was framed as ability-diagnostic and showed that identity-relevant stereotype vulnerability can impair performance without requiring stereotype endorsement.',
  },
  'eppp-b009-social-1': {
    expectedAnswerIndex: 0,
    incorrectFeedback: {
      1: 'Brief sensory storage is addressed by information-processing models of iconic and echoic memory. Attribution theories begin after an event is noticed and concern the causes assigned to it.',
      2: 'People’s causal judgments are interpretive and can be systematically biased; attribution theory does not assume calculation of objective probabilities. Formal probability belongs to statistical decision models.',
      3: 'Reinforcement-based language acquisition is a learning-theory proposal about how verbal behavior develops. Attribution models instead examine explanations for why actions and outcomes occurred.',
    },
    feedbackDesign: ['sensory-memory substitution', 'formal-probability substitution', 'language-learning substitution'],
    sourceCheck: 'Weiner’s attributional theory organizes causal explanations along locus, stability, and controllability and links those dimensions to emotion and motivation, directly supporting the keyed domain of causal explanation.',
  },
};

module.exports = { revisions };
