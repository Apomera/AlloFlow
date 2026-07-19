'use strict';

const revisions = {
  'eppp-v3-intervention-067': {
    expectedAnswerIndex: 0,
    difficulty: 'advanced',
    sourceCheck: 'The U.S. Department of Veterans Affairs National Center for PTSD identifies repeated imaginal exposure, repeated in-vivo approach to objectively safe avoided reminders, and post-exposure processing as core Prolonged Exposure procedures. Craske and colleagues distinguish exposure learning from requiring a particular amount of within-session fear reduction.',
    feedbackDesign: ['habituation-as-required-endpoint', 'cognitive-therapy-sequencing-substitution', 'relaxation-as-safety-condition'],
    prompt: 'A client with PTSD avoids an objectively safe transit station associated with an assault and recounts the trauma only in broad summaries. Within Prolonged Exposure (PE), which plan most directly addresses the maintaining avoidance while preserving an exposure-learning focus?',
    choices: {
      0: 'Combine repeated imaginal revisiting with in-vivo exercises involving trauma reminders, then process what was learned',
      1: 'Continue each exposure until distress has fallen substantially, treating within-session habituation as the required learning test',
      2: 'Restructure trauma-related beliefs first and defer contact with avoided reminders until the client endorses safer appraisals',
      3: 'Pair reminders with relaxation and end an exercise when arousal increases, so exposure remains contingent on calm',
    },
    rationale: 'PE directly targets avoidance through repeated imaginal revisiting of the trauma memory and in-vivo approach to objectively safe situations, people, or objects that have become trauma reminders, followed by processing. Distress may decline during an exercise, but a prescribed amount of within-session habituation is not the sole test of learning; exposure can support new learning about danger, distress, and coping that is strengthened across repetitions and contexts.',
    references: [
      'https://www.ptsd.va.gov/professional/treat/txessentials/prolonged_exposure_pro.asp',
      'https://doi.org/10.1016/j.brat.2014.04.006',
    ],
    sourceDetails: [
      {
        url: 'https://www.ptsd.va.gov/professional/treat/txessentials/prolonged_exposure_pro.asp',
        title: 'Prolonged Exposure for PTSD',
        organization: 'National Center for PTSD, U.S. Department of Veterans Affairs',
        summary: 'This clinician resource describes PE as a manualized treatment and identifies psychoeducation, repeated in-vivo approach to avoided trauma reminders, repeated imaginal revisiting of the trauma memory, and processing as key procedures.',
        credibility: 'The National Center for PTSD is the U.S. Department of Veterans Affairs\' authoritative clinical and research center for PTSD. Its professional treatment page directly supports the protocol components tested here and summarizes the supporting treatment literature.',
      },
      {
        url: 'https://doi.org/10.1016/j.brat.2014.04.006',
        title: 'Maximizing Exposure Therapy: An Inhibitory Learning Approach',
        organization: 'Behaviour Research and Therapy, Elsevier',
        summary: 'Craske and colleagues review exposure mechanisms and clinical strategies that emphasize inhibitory learning and expectancy violation rather than treating within-session fear habituation as the necessary index of success.',
        credibility: 'This valid DOI identifies a peer-reviewed review by leading exposure researchers. It supports the item\'s learning-versus-habituation distinction, while the VA source establishes the PE-specific procedures.',
      },
    ],
    qualityFlags: [
      'Replaces a component-recognition item with a treatment-planning vignette that requires distinguishing PE from plausible cognitive and relaxation-based alternatives.',
      'Avoids implying that fear must decline by a fixed amount during every exposure for corrective learning to occur.',
      'Specifies objectively safe reminders so in-vivo exposure is not confused with exposure to actual danger.',
    ],
    incorrectFeedback: {
      1: 'Within-session distress reduction can occur and may be clinically useful information, but making a substantial drop the required endpoint narrows exposure to a habituation test. Learning can still occur when distress fluctuates, and PE relies on repeated imaginal and in-vivo approach plus processing rather than a fixed fear-reduction rule.',
      2: 'Examining trauma-related appraisals is central to cognitive therapies for PTSD and beliefs may also change during PE. PE does not require cognitive restructuring to succeed before contact with avoided memories and safe reminders; postponing that contact preserves the avoidance the protocol is designed to address.',
      3: 'Relaxation skills can be used for general coping, but requiring calm as the condition for remaining in exposure can turn relaxation into a safety signal. Ending whenever arousal rises prevents sustained contact with the memory or safe reminder and can reinforce the inference that distress itself is dangerous or intolerable.',
    },
  },
  'eppp-v2-intervention-025': {
    expectedAnswerIndex: 2,
    difficulty: 'intermediate',
    sourceCheck: 'Brenner, Schwartz, and Becker trace IFS from structural and strategic family-systems ideas to patterns of internal experience, while Schwartz\'s primary model account distinguishes proactive manager protection, reactive firefighter protection, exiled vulnerable experience, and Self-leadership. These sources establish what the model claims, not independent proof of its efficacy.',
    feedbackDesign: ['damaged-self-misattribution', 'exile-and-self-role-reversal', 'freudian-construct-equivalence'],
    prompt: 'A client alternates between rigidly controlling daily routines to keep grief out of awareness and impulsively numbing whenever grief breaks through. According to the Internal Family Systems (IFS) model, which formulation is most consistent?',
    choices: {
      0: 'Treat both reactions as evidence that the core Self has been damaged and must be rebuilt before vulnerable experience is approached',
      1: 'Classify rigid control as an exile carrying grief and numbing as Self-leadership restoring equilibrium after emotional flooding',
      2: 'View control as manager protection and numbing as firefighter protection around exiled pain, then foster Self-led contact',
      3: 'Map control to the superego and numbing to the id because IFS renames Freud\'s structural agencies within a systems vocabulary',
    },
    rationale: 'In IFS terminology, managers use anticipatory control to prevent vulnerable material from becoming activated, whereas firefighters react after activation with urgent strategies intended to contain or escape the distress. Exiles are parts understood to carry vulnerable memories and emotions, and treatment seeks less blended, Self-led relationships with parts. This is a test of the model\'s own formulation language, not a claim that these categories are diagnoses or independently established mental structures.',
    references: [
      'https://doi.org/10.1111/famp.12943',
      'https://ifs-institute.com/resources/articles/evolution-internal-family-systems-model-dr-richard-schwartz-ph-d',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1111/famp.12943',
        title: 'Development of the Internal Family Systems Model: Honoring Contributions From Family Systems Therapies',
        organization: 'Family Process, Wiley',
        summary: 'Brenner, Schwartz, and Becker describe the development of IFS and how Schwartz applied foundational family-systems concepts to interacting patterns of internal experience and the positive intentions attributed to protective responses.',
        credibility: 'This valid DOI identifies a peer-reviewed theoretical and historical article coauthored by IFS developer Richard Schwartz. It is authoritative for the model\'s lineage and intended constructs, but it is not independent validation of treatment efficacy.',
      },
      {
        url: 'https://ifs-institute.com/resources/articles/evolution-internal-family-systems-model-dr-richard-schwartz-ph-d',
        title: 'Evolution of the Internal Family Systems Model by Dr. Richard Schwartz, PhD',
        organization: 'IFS Institute',
        summary: 'Schwartz\'s first-person model account describes managers as proactive protectors, firefighters as reactive protectors, exiles as carriers of painful experience, and Self-leadership as a central treatment aim.',
        credibility: 'The article is a primary account by the model\'s developer on the organization that trains clinicians in IFS, making it authoritative for model-specific terminology. Because it is not an independent research review, it supports attribution of the constructs rather than claims of comparative efficacy.',
      },
    ],
    qualityFlags: [
      'Replaces an obvious definition item with a vignette requiring application of manager, firefighter, exile, and Self roles.',
      'Attributes all contested constructs explicitly to IFS and separates model literacy from empirical validation.',
      'Replaces a mismatched general-treatment textbook citation with a founder-coauthored peer-reviewed account and a primary model source.',
    ],
    incorrectFeedback: {
      0: 'IFS conceptualizes the controlling and numbing reactions as parts with protective intentions, not as proof that the core Self has been damaged. In the model, access to Self may be obscured when a person is blended with protective parts, so rebuilding a destroyed Self is not the proposed formulation.',
      1: 'The role assignments are reversed. IFS uses exile for vulnerable parts carrying painful memories or emotions, manager for anticipatory control, and firefighter for urgent protection after vulnerable material is activated; numbing would therefore not represent Self-leadership in this vignette.',
      3: 'IFS borrows systems concepts to describe relationships among internal parts, but managers, firefighters, exiles, and Self are not alternate names for Freud\'s id, ego, and superego. Treating the models as a one-to-one translation erases their different assumptions, roles, and therapeutic aims.',
    },
  },
  'eppp-b016-professional-2': {
    expectedAnswerIndex: 3,
    difficulty: 'advanced',
    sourceCheck: 'Gutheil and Gabbard\'s foundational article distinguishes harmful boundary violations from nonharmful boundary issues and emphasizes contextual risk analysis. APA Ethics Committee commentary applies Ethics Code Standard 3.05 by asking whether a multiple relationship could impair objectivity, competence, or effectiveness or risk harm or exploitation.',
    feedbackDesign: ['frame-departure-equals-violation', 'consent-as-complete-safeguard', 'single-event-isolation-error'],
    prompt: 'A current psychotherapy client asks the psychologist to attend a public graduation ceremony after a major treatment milestone. The psychologist believes attendance might be supportive. Which analysis best applies the boundary-crossing distinction and APA ethical standards?',
    choices: {
      0: 'Label it a violation based on the departure from the customary therapeutic frame, without separately analyzing its function',
      1: 'Accept once the client gives informed consent, because the client\'s preference resolves power and exploitation concerns',
      2: 'Evaluate it as a discrete nonsexual crossing, emphasizing anticipated clinical benefit and the client\'s stated preference',
      3: 'Treat it as a possible crossing and weigh clinical purpose, power, culture, alternatives, pattern, and foreseeable effects',
    },
    rationale: 'A boundary crossing is a departure from customary practice that is not inherently exploitative or harmful; a boundary violation involves exploitation or harm. The label does not decide whether attendance is advisable. The psychologist should prospectively assess clinical purpose, client meaning and culture, power, alternatives, confidentiality, cumulative boundary patterns, and foreseeable effects on objectivity, treatment, exploitation, or harm, then document and consult when useful.',
    references: [
      'https://doi.org/10.1176/ajp.150.2.188',
      'https://www.apa.org/monitor/oct04/dilemmas',
    ],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1176/ajp.150.2.188',
        title: 'The Concept of Boundaries in Clinical Practice: Theoretical and Risk-Management Dimensions',
        organization: 'American Journal of Psychiatry, American Psychiatric Association Publishing',
        summary: 'Gutheil and Gabbard analyze treatment boundaries, harmful versus nonharmful departures from the therapeutic frame, and the clinical and risk-management significance of context and boundary patterns.',
        credibility: 'This valid DOI identifies the foundational peer-reviewed article that developed the crossing-versus-violation distinction used in clinical ethics. It supplies a framework for analysis rather than declaring every particular departure acceptable or unacceptable.',
      },
      {
        url: 'https://www.apa.org/monitor/oct04/dilemmas',
        title: 'Approaching Ethical Dilemmas',
        organization: 'Monitor on Psychology, American Psychological Association',
        summary: 'APA Monitor staff reports Ethics Committee guidance for applying Standard 3.05 to multiple relationships: assess whether the additional role could impair objectivity, competence, or effectiveness or create a risk of harm or exploitation, then consult and document the decision-making process.',
        credibility: 'Monitor on Psychology is the American Psychological Association\'s official professional magazine, and this article reports guidance presented by current and former APA Ethics Committee members at APA\'s Annual Convention. It provides authoritative professional commentary on applying Standard 3.05, while the Ethics Code itself and applicable law remain controlling authorities.',
      },
    ],
    qualityFlags: [
      'Uses an ambiguous but realistic boundary request instead of asking for a memorized definition.',
      'Avoids treating either benign intent or client consent as a complete answer to power, exploitation, and clinical-effect questions.',
      'Preserves the distinction between a descriptive boundary category and the prospective ethical analysis of a particular act.',
    ],
    incorrectFeedback: {
      0: 'An out-of-office encounter is a departure from the usual frame and therefore warrants analysis, but location alone does not establish exploitation or harm. The crossing-versus-violation distinction depends on function, context, power, pattern, and consequences rather than on whether contact occurred outside the office.',
      1: 'The client\'s wishes and informed participation are important inputs, but consent does not erase the psychologist\'s power advantage or professional responsibility. A client may agree to an arrangement that still impairs treatment, creates confidentiality problems, or carries foreseeable exploitation or harm.',
      2: 'Anticipated benefit and the client\'s wishes are relevant, but analyzing the event as discrete underweights how it can change expectations and interact with later departures. Prospective review should also address confidentiality, dependency, objectivity, exploitation risk, and the meaning of precedent.',
    },
  },
  'eppp-b015-professional-2': {
    expectedAnswerIndex: 3,
    difficulty: 'intermediate',
    sourceCheck: 'The Supreme Court\'s per curiam opinion in Dusky v. United States states that orientation and some recollection are insufficient; the test concerns present ability to consult with counsel with a reasonable degree of rational understanding and rational as well as factual understanding of the proceedings.',
    feedbackDesign: ['memory-capacity-substitution', 'criminal-responsibility-timeframe', 'attorney-level-legal-knowledge'],
    prompt: 'A defendant accurately identifies the judge, charge, possible sentence, and major evidence, but a fixed delusion that appointed counsel is a covert prosecutor leads the defendant to withhold information and reject discussion of any defense. Which Dusky component is most directly implicated?',
    choices: {
      0: 'Ability to recall the alleged offense in enough autobiographical detail to support a retrospective mental-state opinion about the offense',
      1: 'Capacity to appreciate the wrongfulness of the conduct when the alleged offense occurred, despite present symptoms',
      2: 'Command of doctrine and strategy at a level that permits independent evaluation of counsel\'s legal recommendations',
      3: 'Present ability to consult with counsel with rational understanding, even though factual understanding appears preserved',
    },
    rationale: 'Dusky requires both sufficient present ability to consult with counsel with a reasonable degree of rational understanding and a rational as well as factual understanding of the proceedings. The defendant appears to possess factual knowledge, but the delusion may functionally impair rational collaboration with counsel. That identifies the capacity requiring evaluation; a diagnosis or unusual belief alone does not decide the ultimate competency finding.',
    references: ['https://www.govinfo.gov/app/details/USREPORTS-362/USREPORTS-362-402'],
    sourceDetails: [
      {
        url: 'https://www.govinfo.gov/app/details/USREPORTS-362/USREPORTS-362-402',
        title: 'Dusky v. United States, 362 U.S. 402 (1960)',
        organization: 'Supreme Court of the United States; U.S. Government Publishing Office',
        summary: 'The Court\'s per curiam opinion states the competency-to-stand-trial test and explains that orientation to time and place plus some recollection of events does not by itself establish competency.',
        credibility: 'GovInfo provides the authenticated United States Reports decision through the U.S. Government Publishing Office. The opinion is the primary legal authority for the federal constitutional competency standard tested in the item.',
      },
    ],
    qualityFlags: [
      'Converts a direct quotation prompt into a functional vignette that separates rational consultation from intact factual knowledge.',
      'Uses the primary United States Reports decision rather than a commercial case summary.',
      'Asks which capacity is implicated without treating a diagnosis or delusion as automatically dispositive of competency.',
    ],
    incorrectFeedback: {
      0: 'Memory for relevant events can affect a defendant\'s ability to assist counsel, but Dusky does not require complete autobiographical recall or define competency as fitness for a retrospective mental-state evaluation. The stem instead isolates a present inability to collaborate rationally despite substantial factual knowledge.',
      1: 'Appreciating wrongfulness at the time of the alleged conduct concerns criminal responsibility, such as an insanity analysis, rather than present adjudicative competence. Dusky asks about current rational consultation with counsel and rational and factual understanding of the proceedings.',
      2: 'A defendant need not possess an attorney\'s technical knowledge or independently master trial strategy. The relevant question is whether the defendant can understand the proceedings rationally and factually and participate in reasoned consultation with counsel.',
    },
  },
  'eppp-b011-social-1': {
    expectedAnswerIndex: 0,
    difficulty: 'intermediate',
    sourceCheck: 'Bandura, Barbaranelli, Caprara, and Pastorelli identify diffusion and displacement of responsibility as distinct ways of obscuring personal causal agency. Diffusion operates through division of labor, collective action, or group decision-making, whereas displacement attributes agency to an authority.',
    feedbackDesign: ['displacement-versus-diffusion', 'moral-justification-confusion', 'consequence-distortion-confusion'],
    prompt: 'After approving a punitive policy, a committee member says, "Everyone voted for it, so no individual can be responsible for the families harmed." Which moral-disengagement mechanism is most specifically illustrated?',
    choices: {
      0: 'Diffusion of responsibility, because collective decision-making obscures each member\'s personal agency',
      1: 'Displacement of responsibility, because the member acted as an instrument of a directing authority',
      2: 'Moral justification, because the member portrays the harmful policy as serving a worthy social purpose',
      3: 'Distortion of consequences, because the member minimizes the severity of the harm experienced by families',
    },
    rationale: 'The member acknowledges that harm occurred but disperses agency across the voting group, illustrating diffusion of responsibility. Displacement would shift agency to an authority who directed the act; moral justification would recast the conduct as serving a valued purpose; and distortion of consequences would minimize, ignore, or misrepresent the harm itself.',
    references: ['https://doi.org/10.1037/0022-3514.71.2.364'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/0022-3514.71.2.364',
        title: 'Mechanisms of Moral Disengagement in the Exercise of Moral Agency',
        organization: 'Journal of Personality and Social Psychology, American Psychological Association',
        summary: 'Bandura and colleagues develop and test a social-cognitive account in which moral self-sanctions can be disengaged by reconstrual of conduct, obscuring personal agency, minimizing consequences, and blaming or dehumanizing victims.',
        credibility: 'This valid DOI identifies the original peer-reviewed empirical article by the theorists who specified these mechanisms. It directly supports the distinctions among diffusion, displacement, moral justification, and distortion of consequences used in the vignette.',
      },
    ],
    qualityFlags: [
      'Replaces a broad definition item with a close discrimination among four mechanisms from the same theory.',
      'Uses the original mechanism article rather than a later generic overview.',
      'Makes the acknowledged harm and collective vote explicit so the answer turns on locus of agency rather than consequence minimization.',
    ],
    incorrectFeedback: {
      1: 'Displacement of responsibility occurs when a person treats an authority as the agent and the self as merely carrying out orders. No directing authority appears here; the speaker divides agency across peers who jointly voted, which is diffusion rather than displacement.',
      2: 'Moral justification converts harmful conduct into something portrayed as personally or socially worthy, such as necessary service to a valued cause. The statement offers no worthy purpose for the policy; it attempts to escape individual accountability through collective decision-making.',
      3: 'Distortion or disregard of consequences weakens self-sanctions by minimizing, ignoring, or misconstruing the injury. The member explicitly refers to families being harmed and instead denies individual responsibility, so the altered element is agency rather than perceived severity.',
    },
  },
  'eppp-b026-social-2': {
    expectedAnswerIndex: 1,
    difficulty: 'advanced',
    sourceCheck: 'Cialdini and colleagues\' three original experiments tested a rejection-then-moderation sequence in which an extreme request was refused before a smaller target request. Compliance exceeded a small-request-only condition, and additional controls supported the authors\' reciprocal-concessions account.',
    feedbackDesign: ['foot-in-door-consistency-reversal', 'low-ball-postcommitment-confusion', 'contrast-as-exhaustive-account'],
    prompt: 'A recruiter asks a student to mentor 10 hours each week for two years. After the student refuses, the same recruiter asks for help at one two-hour event; a comparison group receives only the event request. Compliance is higher after the two-request sequence. Which interpretation best matches the original door-in-the-face research?',
    choices: {
      0: 'The initial refusal creates commitment to keep refusing, so the increase reflects foot-in-the-door consistency pressure',
      1: 'The requester\'s retreat can invite a reciprocal concession; the original control conditions supported that account',
      2: 'The sequence changes the terms after an agreement, so increased compliance demonstrates the low-ball technique',
      3: 'The first request makes the target seem smaller, and the comparison eliminates a role for reciprocal concession',
    },
    rationale: 'Door-in-the-face is a rejection-then-moderation procedure: the requester retreats from an extreme request to a smaller target, and the recipient may reciprocate that apparent concession by moving from refusal toward compliance. Cialdini and colleagues found greater target-request compliance than in small-request-only conditions and used additional controls to support reciprocal concessions. The studies support that account; they do not make the technique universally effective or establish that no other process can contribute.',
    references: ['https://doi.org/10.1037/h0076284'],
    sourceDetails: [
      {
        url: 'https://doi.org/10.1037/h0076284',
        title: 'Reciprocal Concessions Procedure for Inducing Compliance: The Door-in-the-Face Technique',
        organization: 'Journal of Personality and Social Psychology, American Psychological Association',
        summary: 'Cialdini and colleagues report three experiments comparing an extreme-request-then-smaller-request sequence with a smaller-request-only procedure and additional control conditions designed to evaluate reciprocal concessions.',
        credibility: 'This valid DOI identifies the original peer-reviewed experiments that introduced the named technique and tested the authors\' mechanism account. It supports the historical finding and design distinction, not a guarantee of compliance in every setting or ethical approval of manipulation.',
      },
    ],
    qualityFlags: [
      'Moves beyond sequence recognition by asking what the original comparison and control logic supported.',
      'Distinguishes door-in-the-face from foot-in-the-door and low-ball using commitment timing rather than conspicuous wording.',
      'Qualifies the mechanism conclusion so a classic result is not presented as universal or exclusive.',
    ],
    incorrectFeedback: {
      0: 'Foot-in-the-door begins with agreement to a small request and then relies on consistency when a larger request follows. Here the first request is extreme and refused, so the relevant movement is the requester\'s moderation and the recipient\'s possible reciprocal concession, not consistency with prior compliance.',
      2: 'Low-ball obtains an initial commitment and then makes the agreed course less attractive by revealing costs or changing terms. In this sequence there is no accepted initial agreement; the large request is rejected before a separate, smaller target request is made.',
      3: 'Perceptual contrast could make the second request appear smaller, but the small-request-only comparison by itself does not eliminate reciprocal concession. The original program included further controls that the authors interpreted as supporting reciprocity, so contrast is not the most complete account of their findings.',
    },
  },
};

module.exports = { revisions };
