'use strict';

// Authored shard A for the distractor-halving campaign. This file is data-only:
// it does not mutate the source bank or deploy mirror. The campaign applier must
// preserve answer indexes, keyed-choice wording, and all existing review-marker
// metadata while applying only the replacement fields exported below.

const nativeItems = require('../test_prep/eppp_native_items.json');
const {
  CAMPAIGN_ID,
  CAMPAIGN_ITEMS,
  DOMAIN_ID_SHARDS,
} = require('./eppp_distractor_halving_campaign_manifest.cjs');

const SHARD_ID = 'eppp-distractor-halving-revisions-a';
const REVIEWED_AT = '2026-07-25';
const ASSIGNED_DOMAINS = Object.freeze(['professional', 'lifespan', 'research']);
const ASSIGNED_IDS = Object.freeze(ASSIGNED_DOMAINS.flatMap((domainId) => DOMAIN_ID_SHARDS[domainId]));
const campaignById = new Map(CAMPAIGN_ITEMS.map((item) => [item.id, item]));
const liveById = new Map(nativeItems.map((item) => [item.id, item]));

function invariant(condition, message) {
  if (!condition) throw new Error(SHARD_ID + ': ' + message);
}

function words(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean);
}

function contrast(issue, distinction) {
  const text = `${issue}. ${distinction}.`;
  invariant(text.length >= 100 && words(text).length >= 16, `feedback is too short: ${text}`);
  return text;
}

function revision(id, replacement) {
  const campaign = campaignById.get(id);
  const live = liveById.get(id);
  invariant(campaign, `unknown campaign ID ${id}`);
  invariant(live, `missing live item ${id}`);
  invariant(live.answerIndex === campaign.expectedAnswerIndex, `${id} answer index drifted`);

  const next = {
    expectedAnswerIndex: campaign.expectedAnswerIndex,
    contentSha256: campaign.contentSha256,
    expectedWarningFamilies: [...campaign.expectedWarningFamilies],
    ...replacement,
  };

  const liveWaveNumber = Number(String(live.wordingReviewWave || '').match(/wave-(\d+)$/)?.[1] || 0);
  const laterNativeWave = liveWaveNumber > 23;

  invariant(typeof next.editorialNote === 'string' && words(next.editorialNote).length >= 14, `${id} needs a substantive editorial note`);
  invariant(Array.isArray(next.distractorDesign) && next.distractorDesign.length === 3, `${id} needs three distractor-design labels`);
  invariant(new Set(next.distractorDesign).size === 3, `${id} distractor-design labels must be distinct`);

  if (next.choices) {
    invariant(Array.isArray(next.choices) && next.choices.length === 4, `${id} choices must contain four options`);
    const comparableKey = (value) => String(value).normalize('NFKD').replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, '-').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
    invariant(laterNativeWave || comparableKey(next.choices[live.answerIndex]) === comparableKey(live.choices[live.answerIndex]), id + ' keyed-choice meaning or position changed');
    next.choices = [...next.choices];
    next.choices[live.answerIndex] = live.choices[live.answerIndex];
    invariant(Array.isArray(next.wrongFeedback) && next.wrongFeedback.length === 3, `${id} needs three wrong-option explanations`);
    const choiceRationales = [];
    let wrongCursor = 0;
    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      choiceRationales.push(optionIndex === live.answerIndex ? (next.rationale || live.rationale) : next.wrongFeedback[wrongCursor++]);
    }
    invariant(choiceRationales.every((text) => text.length >= 100 && words(text).length >= 16), `${id} choice feedback misses the detail floor`);
    invariant(choiceRationales[live.answerIndex] === (next.rationale || live.rationale), `${id} key feedback must equal the rationale`);
    next.choiceRationales = choiceRationales;
    delete next.wrongFeedback;
  }

  return Object.freeze(next);
}

const authored = {
  'eppp-v3-professional-075': revision('eppp-v3-professional-075', {
    prompt: 'A psychologist is choosing among a vendor promotion, a popular online explanation, and methods supported by well-vetted disciplinary evidence. Which basis satisfies the ethical requirement?',
    editorialNote: 'The scenario removes the stem-to-key repetition while requiring the learner to compare evidence sources rather than retrieve a repeated phrase.',
    distractorDesign: ['interested-vendor-source', 'popularity-as-evidence', 'confirmation-by-anecdote'],
  }),
  'eppp-b005-professional-1': revision('eppp-b005-professional-1', {
    prompt: 'A psychologist advertises credentials that the psychologist knows were never earned. Which Ethics Code provision most directly governs the advertisement?',
    editorialNote: 'The revised conduct description removes the repeated deceptive cue and asks learners to distinguish advertising misconduct from delegation, records, and assessment duties.',
    distractorDesign: ['delegation-standard-neighbor', 'records-standard-neighbor', 'assessment-feedback-neighbor'],
  }),
  'eppp-b011-professional-2': revision('eppp-b011-professional-2', {
    prompt: 'A court permits a psychologist to send part of a clinical file for a narrowly defined legal task. Which disclosure scope best follows confidentiality principles?',
    editorialNote: 'The prompt now asks for a proportional disclosure decision without echoing necessary, while retaining meaningful authorization and legal-basis boundaries.',
    distractorDesign: ['whole-record-overdisclosure', 'self-protective-selection', 'confidentiality-as-total-bar'],
  }),
  'eppp-b017-professional-2': revision('eppp-b017-professional-2', {
    prompt: 'Which cluster of commitments is most characteristic of APA General Principle B rather than the other aspirational principles?',
    editorialNote: 'Removing the principle title from the stem eliminates the direct responsibility echo and shifts the task to discriminating its commitments.',
    distractorDesign: ['financial-self-interest', 'interprofessional-isolation', 'confidentiality-instrumentalization'],
  }),
  'eppp-b021-professional-4': revision('eppp-b021-professional-4', {
    prompt: 'A colleague may be impaired in a way that creates risk for clients, although the available information is incomplete. Which initial orientation is most defensible?',
    editorialNote: 'The scenario removes the affect/affected lexical match and retains the source-supported balance among welfare, evidence, consultation, and reporting duties.',
    distractorDesign: ['public-diagnosis-overreach', 'wait-for-proven-injury', 'confidentiality-as-consultation-bar'],
  }),
  'eppp-v3-professional-001': revision('eppp-v3-professional-001', {
    prompt: 'During exposure treatment, temporary anxiety is expected, but one exercise adds a predictable medical risk that a safer exercise prevents. What response best fits the ethical duty?',
    rationale: 'Standard 3.04 requires reasonable steps to prevent foreseeable injury and to reduce unavoidable injury. Expected therapeutic discomfort is not itself prohibited, but a clinician should select the safer exercise when it serves the treatment purpose and should monitor risk proportionately.',
    editorialNote: 'This application scenario distinguishes avoidable medical risk from expected exposure discomfort, separating it from other bank items that merely recite Standard 3.04.',
    distractorDesign: ['outcome-guarantee-error', 'risk-free-client-selection', 'therapeutic-discomfort-ban'],
  }),
  'eppp-v2-professional-024': revision('eppp-v2-professional-024', {
    prompt: 'A practitioner whose work is limited to adult insomnia accepts a pediatric presurgical neuropsychological capacity evaluation after a hospital offers a rush fee. The battery requires developmental norms, anesthesia knowledge, medication analysis, and same-day coordination with a surgical team. Which option most directly addresses accepting this assignment?',
    rationale: 'Standard 2.01 ties the scope of practice to education, training, supervised experience, consultation, study, and professional experience. The specialized evaluation exceeds the clinician’s established preparation, so the boundaries provision is the closest fit.',
    editorialNote: 'The item now tests a concrete scope-of-practice decision rather than completing a definition that duplicates the testimony item.',
    distractorDesign: ['justice-principle-neighbor', 'advertising-standard-neighbor', 'fidelity-principle-neighbor'],
  }),
  'eppp-v3-professional-003': revision('eppp-v3-professional-003', {
    prompt: 'Counsel asks a clinical witness to interpret an unfamiliar bridge-failure calculation for a jury because the witness holds a doctorate. The calculation uses steel fatigue, wind shear, soil loading, inspection photographs, and municipal engineering codes. Counsel plans to present the witness as an engineering expert at trial. Which listed rule is most relevant to giving that testimony?',
    rationale: 'Standard 2.01 requires psychologists to work within boundaries established by education, training, supervised experience, consultation, study, or professional experience. Clinical expertise does not establish expertise in accident reconstruction, so the psychologist should not offer that specialized opinion without an adequate basis.',
    editorialNote: 'This forensic boundary scenario is distinct from the pediatric service item and tests whether expertise transfers across subject matters.',
    distractorDesign: ['institutional-approval-neighbor', 'misuse-of-work-neighbor', 'public-statement-neighbor'],
  }),
  'eppp-v3-professional-065': revision('eppp-v3-professional-065', {
    prompt: 'A new virtual-reality protocol provokes migraines in a client with a neurologic history, while a conventional in-vivo task reaches the same exposure goal. Which Ethics Code provision most directly guides selection?',
    rationale: 'Standard 3.04 requires reasonable efforts to prevent foreseeable injury and to reduce injury that cannot be avoided. Comparing a preventable complication with a comparably effective safer alternative is an applied risk-selection decision, not a testimonials, records, or student-evaluation question.',
    editorialNote: 'The revision tests intervention selection under preventable risk and no longer repeats the broad wording of other Standard 3.04 questions.',
    distractorDesign: ['testimonial-solicitation-neighbor', 'documentation-neighbor', 'student-evaluation-neighbor'],
  }),
  'eppp-v2-professional-010': revision('eppp-v2-professional-010', {
    prompt: 'A privately retained custody evaluator is pressured to frame findings as advocacy for the paying parent. Which guiding consideration should organize the evaluation?',
    rationale: 'Custody evaluation is intended to provide impartial psychological information relevant to the child’s welfare and the authorized referral. Payment by one parent does not make that parent or counsel the evaluator’s advocacy beneficiary, and reporting to a court does not displace the child-centered purpose.',
    editorialNote: 'The applied payer-pressure context distinguishes this item from direct questions about custody purpose while removing the stem-to-key child echo.',
    distractorDesign: ['payer-as-beneficiary', 'counsel-as-beneficiary', 'court-exclusivity'],
  }),
  'eppp-b019-professional-2': revision('eppp-b019-professional-2', {
    prompt: 'A policy is convenient for an institution but restricts personal control over sensitive records and overlooks cultural and role differences. Which cluster reflects the aspirational principle most directly challenged?',
    rationale: 'Principle E emphasizes human worth, privacy, confidentiality, and self-determination while calling for awareness of cultural, individual, and role differences and efforts to reduce bias. It is aspirational and does not itself function as an enforceable rule.',
    editorialNote: 'The policy scenario applies Principle E to competing institutional convenience without repeating dignity from stem to key or duplicating an autonomy definition.',
    distractorDesign: ['institutional-convenience-priority', 'formal-equality-without-differences', 'professional-curiosity-disclosure'],
  }),
  'eppp-b024-professional-4': revision('eppp-b024-professional-4', {
    prompt: 'After an ethics complaint is filed against an APA-affiliated psychologist who also holds a state license, which description best distinguishes the bodies that may act?',
    choices: [
      'A criminal court is the primary professional-review forum, while association and licensing processes await its outcome',
      'Filing establishes an interim licensing violation unless the respondent disproves the allegation',
      'APA review preempts a licensing board when both matters arise from the same professional conduct',
      'APA may enforce the Code for members, while licensing boards have separate legal authority',
    ],
    rationale: 'APA can use its association processes within its authority over members, while licensing boards exercise separate statutory authority over licenses. Courts, employers, and institutions may also have roles. A filed allegation is not a finding, and one forum does not inherently preempt the others.',
    wrongFeedback: [
      contrast('Criminal proceedings address violations of criminal law and are not the default forum for every allegation of unethical professional conduct', 'Association and licensing processes can proceed under their own authority even when no criminal charge exists'),
      contrast('A complaint initiates review but does not itself establish that a licensing violation occurred or shift the burden of proof to the respondent', 'Interim action depends on the governing board’s law, evidence, and procedures rather than the mere filing'),
      contrast('Association discipline and licensure regulation arise from different grants of authority, even when they examine the same underlying events', 'An APA process therefore does not displace a state or provincial board’s independent jurisdiction'),
    ],
    editorialNote: 'The revised procedural scenario replaces conspicuous absolutes with plausible jurisdictional errors and preserves the distinction between association and licensing authority.',
    distractorDesign: ['criminal-forum-priority', 'complaint-as-presumptive-finding', 'association-preemption'],
  }),
  'eppp-v2-professional-054': revision('eppp-v2-professional-054', {
    prompt: 'A client has limited English proficiency and requests language access for psychotherapy. Which arrangement best supports accuracy, role clarity, and privacy?',
    choices: [
      'Use an available bilingual staff member before assessing interpreting competence or defining the person\u2019s role',
      'Postpone clinically indicated care until the client can participate fluently in English',
      'Invite a relative to interpret as the routine first choice because the relative knows the client\u2019s history',
      'Use trained interpreters and protect confidentiality',
    ],
    wrongFeedback: [
      contrast('Bilingual ability by itself does not establish skill in accurate clinical interpretation, boundaries, or mental-health terminology', 'The psychologist should assess qualifications, clarify the interpreter\u2019s role, and address confidentiality before relying on a staff member'),
      contrast('Delaying indicated care solely for English fluency can create access barriers and leaves the client\u2019s current clinical needs unaddressed', 'Qualified language assistance can support meaningful participation while the psychologist remains responsible for competent service delivery'),
      contrast('A relative may introduce privacy, role, accuracy, and power concerns even when the relative knows the client well', 'Family interpretation requires careful case-specific justification rather than serving as the routine default when trained assistance is available'),
    ],
    editorialNote: 'The access scenario removes the interpreter echo and replaces absolute distractors with realistic but ethically incomplete language-assistance arrangements.',
    distractorDesign: ['unvetted-bilingual-staff', 'english-fluency-delay', 'family-interpreter-default'],
  }),
  'eppp-v2-professional-062': revision('eppp-v2-professional-062', {
    prompt: 'A statutory requirement appears inconsistent with a professional ethical obligation. What is the appropriate initial response?',
    choices: [
      'Apply the ethics provision before examining the governing requirement or seeking clarification',
      'Apply the statutory requirement before identifying the ethical concern or considering resolution',
      'Rely on personal preference because neither source offers useful professional guidance',
      'Attempt to resolve the conflict in a way consistent with both',
    ],
    wrongFeedback: [
      contrast('Treating the ethics provision as self-executing overlooks the need to determine what governing law actually requires in the situation', 'Standard 1.02 begins with clarification, an expressed commitment to the Code, and reasonable efforts toward responsible resolution'),
      contrast('Immediate unexamined legal compliance fails to acknowledge the ethical obligation or explore whether the apparent inconsistency can be reconciled', 'The standard directs psychologists to clarify and seek a responsible resolution before assuming the duties cannot coexist'),
      contrast('Personal preference is not a substitute for analyzing the Ethics Code, governing authority, and relevant human-rights limits', 'Consultation and documented reasoning are more defensible when the interaction between law and ethics is uncertain'),
    ],
    editorialNote: 'The item now asks for the first response to an apparent inconsistency and uses plausible sequencing errors rather than visible always cues.',
    distractorDesign: ['ethics-without-legal-analysis', 'law-without-resolution-effort', 'personal-preference-substitution'],
  }),
  'eppp-v3-professional-060': revision('eppp-v3-professional-060', {
    prompt: 'A training director is preparing a course on the enforceable ethics document available on APA\u2019s website. Which publication history should the syllabus report?',
    choices: [
      'The 1953 document remains the operative edition, supplemented informally by later commentary',
      'A replacement enforceable edition took effect after the 2025 public-comment process',
      'The 1992 edition remains operative, with later material functioning as nonbinding guidance',
      'The 2002 code remains published with amendments effective in 2010 and 2017',
    ],
    wrongFeedback: [
      contrast('APA adopted an early ethics code in the 1950s, but later revisions replaced that historical document rather than merely commenting on it', 'Course materials should distinguish the origin of the code from the edition and amendments currently published by APA'),
      contrast('A revision project or public-comment draft is not equivalent to adoption of a replacement enforceable ethics code', 'The training director should use the currently published code until APA formally adopts and makes another edition effective'),
      contrast('The 1992 edition is historically important but is not the edition APA currently presents as its operative Ethics Code', 'Later formal revision and amendment dates must be identified rather than treating subsequent materials as guidance alone'),
    ],
    editorialNote: 'The syllabus scenario removes the published/published lexical echo and replaces implausible absolutes with credible chronology confusions.',
    distractorDesign: ['origin-edition-confusion', 'draft-as-effective-code', 'prior-edition-still-operative'],
  }),
  'eppp-v3-professional-070': revision('eppp-v3-professional-070', {
    prompt: 'A hospital contracts with a psychologist to evaluate employees for a return-to-work program. Before services begin, what should the employees be told?',
    choices: [
      'That agreeing to organizational services waives the ordinary need to clarify roles and uses of information',
      'The service\u2019s nature, objectives, recipients, roles, information uses, access, and confidentiality limits.',
      'The billing arrangement and referral date, with clinical information policies provided after the evaluation',
      'That reports ordinarily go to the organization while confidentiality details are decided after results are available',
    ],
    wrongFeedback: [
      contrast('Organizational referral does not eliminate the psychologist\u2019s obligation to explain the nature of the service and the relationships among the parties', 'Affected people need advance role and information-use clarification so participation is informed rather than inferred from attendance'),
      contrast('Fees can be relevant, but billing information alone omits the evaluation\u2019s objectives, intended recipients, professional roles, and limits on privacy', 'Those service conditions should be disclosed before the employee supplies sensitive information, not deferred until afterward'),
      contrast('An organization may be an authorized report recipient, yet that fact does not make confidentiality limits indeterminate at intake', 'The psychologist should explain anticipated access and uses in advance and communicate results consistently with the disclosed arrangement'),
    ],
    editorialNote: 'The return-to-work scenario removes the service echo and uses incomplete organizational consent practices as plausible distractors.',
    distractorDesign: ['organizational-waiver-assumption', 'billing-only-disclosure', 'deferred-confidentiality-clarification'],
  }),
  'eppp-b007-professional-1': revision('eppp-b007-professional-1', {
    choices: [
      'A federal evidentiary preference that makes treatment records presumptively discoverable after a civil claim',
      'A federal psychotherapist\u2013patient privilege protecting confidential treatment communications',
      'A broad health-services privilege extending to routine conversations outside diagnosis or treatment',
      'A constitutional exclusion of compelled mental-health examinations in federal and state proceedings',
    ],
    wrongFeedback: [
      contrast('Jaffee moved in the opposite direction by recognizing protection for confidential treatment communications under federal common law', 'The decision did not create a presumption that filing a civil claim makes the complete therapy record discoverable'),
      contrast('The recognized privilege is tied to confidential communications made for diagnosis or treatment with covered psychotherapists', 'It does not transform ordinary conversations with any health worker into privileged psychotherapy communications'),
      contrast('The Court addressed an evidentiary privilege for treatment communications rather than a constitutional prohibition on compelled evaluations', 'Court-ordered examinations raise separate authority, consent, notice, and scope questions not resolved by this holding'),
    ],
    editorialNote: 'The choices now contrast neighboring evidentiary and constitutional claims without relying on all, every, or unlimited wording.',
    distractorDesign: ['discoverability-presumption', 'health-worker-overbreadth', 'constitutional-examination-ban'],
  }),
  'eppp-b009-professional-2': revision('eppp-b009-professional-2', {
    choices: [
      'They become permissible after termination when both people sign a written acknowledgment of the former treatment',
      'They may begin during the two-year period when the former client initiates contact and reports no current distress',
      'They are regulated chiefly through the active-treatment prohibition, with posttermination conduct left to clinical judgment',
      'They are barred for two years and remain exceptional afterward under strict safeguards',
    ],
    wrongFeedback: [
      contrast('Termination and a written acknowledgment do not satisfy the two-year prohibition or resolve the former client\u2019s vulnerability and treatment history', 'After the waiting period, the psychologist still bears a demanding burden concerning exploitation and other specified factors'),
      contrast('Former-client initiation and a report of comfort do not remove the categorical two-year bar in Standard 10.08', 'Power differences, treatment dynamics, termination circumstances, and foreseeable adverse effects remain relevant beyond the client\u2019s stated preference'),
      contrast('Standard 10.08 expressly extends regulation beyond the active therapy relationship and specifies a minimum waiting period', 'Posttermination sexual involvement is therefore not left to ordinary clinical judgment merely because treatment has ended'),
    ],
    editorialNote: 'The new distractors present plausible consent, initiation, and active-treatment misconceptions while removing conspicuous immediacy and universality cues.',
    distractorDesign: ['termination-plus-written-consent', 'former-client-initiation-exception', 'active-treatment-only-rule'],
  }),
  'eppp-b011-professional-1': revision('eppp-b011-professional-1', {
    choices: [
      'Notify the client that services have ended and provide referral information after the next scheduled billing cycle',
      'Planning continuity, providing reasonable notice, and facilitating appropriate alternatives',
      'Condition transition assistance on resolution of disputed charges when the client is clinically stable',
      'Keep the case nominally open while reducing availability until the client independently locates another provider',
    ],
    wrongFeedback: [
      contrast('A billing-cycle delay can leave the client without timely information or support during an unexpected interruption of care', 'Notice and transition steps should be guided by clinical need, urgency, and feasible continuity arrangements rather than administrative timing'),
      contrast('Fee disputes may be addressed through appropriate channels, but using transition assistance as leverage can expose a client to avoidable disruption', 'Continuity planning remains a welfare obligation even when the psychologist has a legitimate financial claim'),
      contrast('Nominally retaining a client while becoming functionally unavailable does not provide reliable care or a transparent termination process', 'Clear communication, interim risk planning, and suitable referral assistance better protect against abandonment'),
    ],
    editorialNote: 'Administrative-delay, fee-leverage, and passive-withdrawal alternatives create realistic boundary errors without obvious absolute wording or implausible claims.',
    distractorDesign: ['billing-cycle-delay', 'fee-conditioned-transition', 'passive-unavailability'],
  }),
  'eppp-b019-professional-3': revision('eppp-b019-professional-3', {
    choices: [
      'The diagnosis and proposed technique, with fees and information-sharing policies supplied if the client later asks',
      'A predicted outcome and tentative ending date presented as the treatment plan rather than as uncertain estimates',
      'A catalogue of remote hypothetical events, even when they have no material bearing on the proposed service',
      'The nature and anticipated course, fees, third parties, and confidentiality limits',
    ],
    wrongFeedback: [
      contrast('Diagnosis and technique can matter, but deferring fees and information-sharing terms prevents the client from evaluating core conditions of therapy at the outset', 'Early discussion must cover how therapy is expected to proceed, financial terms, other involved parties, and boundaries on private information'),
      contrast('Clinicians may discuss prognosis and expected duration, but presenting uncertain predictions as fixed commitments misstates what informed consent can establish', 'Consent should communicate anticipated course and material uncertainty while allowing questions and ongoing revision'),
      contrast('Consent should address reasonably material features and foreseeable risks of the proposed service, not exhaust every imaginable future event', 'An indiscriminate catalogue can obscure the information the client needs for a meaningful treatment decision'),
    ],
    editorialNote: 'The alternatives now represent incomplete, overconfident, and indiscriminate consent practices rather than cartoonishly absolute omissions.',
    distractorDesign: ['deferred-administrative-terms', 'prognosis-as-commitment', 'remote-risk-catalogue'],
  }),
  'eppp-b020-professional-1': revision('eppp-b020-professional-1', {
    prompt: 'A billing auditor reviews a split in which one psychologist conducted structured interviews and another integrated collateral data into a report. What evidence would make the allocation defensible?',
    choices: [
      'Based on the services each person provided rather than the referral itself',
      'Weighted toward the professional who originated the referral, with a smaller portion for subsequent clinical work',
      'Calculated as a standard referral percentage when both professionals disclose the arrangement to the client',
      'Recorded as an administrative expense even when neither party can identify corresponding professional services',
    ],
    wrongFeedback: [
      contrast('Originating a referral does not itself constitute the professional service basis required for dividing fees outside an employment relationship', 'Compensation should reflect work actually provided rather than the value of directing a client to another professional'),
      contrast('Disclosure can promote transparency but does not convert payment for a referral into payment for services rendered', 'Standard 6.07 focuses on the basis of the division, so a customary percentage remains problematic when detached from actual work'),
      contrast('An accounting label cannot supply a service basis that is absent from the underlying arrangement', 'Documentation should accurately reflect real administrative or clinical contributions rather than disguise compensation for obtaining the referral'),
    ],
    editorialNote: 'The fee arrangements now differ on service contribution, disclosure, and accounting treatment instead of using solely, entirely, and secrecy cues.',
    distractorDesign: ['referral-origin-weighting', 'disclosed-referral-percentage', 'administrative-relabeling'],
  }),
  'eppp-b020-professional-3': revision('eppp-b020-professional-3', {
    choices: [
      'Prevent a client from expressing hostility toward an identifiable person by conditioning continued treatment on emotional control',
      'Report violent imagery to law enforcement when it appears in treatment, before assessing seriousness, target, or context',
      'Preserve the ordinary confidentiality rule until a court specifically instructs the clinician to take protective action',
      'Use reasonable care to protect an identifiable person from a serious threatened danger',
    ],
    wrongFeedback: [
      contrast('Tarasoff concerned reasonable protective care in response to a serious threatened danger, not a duty to prevent the expression of anger in therapy', 'Clinical inquiry into target, intent, means, context, and governing law is more relevant than making emotional control a condition of care'),
      contrast('Violent imagery varies in meaning and does not by itself establish the threshold or protective response required in a jurisdiction', 'A competent threat assessment should precede a proportionate action selected under current law and policy'),
      contrast('Ordinary confidentiality remains important, but waiting passively for a court order may neglect a jurisdiction-specific duty when a serious threat meets its threshold', 'Consultation, documentation, and timely protective measures can be required before judicial involvement'),
    ],
    editorialNote: 'The distractors now model premature reporting, passive waiting, and emotion-control errors while preserving jurisdictional caution in the rationale.',
    distractorDesign: ['anger-suppression-duty', 'imagery-as-reporting-trigger', 'court-order-prerequisite'],
  }),
  'eppp-b021-professional-1': revision('eppp-b021-professional-1', {
    choices: [
      'Ordinarily continues, with disclosure governed by authorization, ethics, and applicable law',
      'Becomes subject to routine release to relatives once identity and relationship to the deceased are verified',
      'Passes to the employing organization, which may set disclosure terms independently of prior confidentiality arrangements',
      'Requires destruction at the earliest administratively convenient date so later disclosure questions do not arise',
    ],
    wrongFeedback: [
      contrast('Relationship to a deceased client does not by itself establish authorization to receive confidential clinical information', 'Estate authority, privilege, applicable law, and the purpose and scope of a request must be evaluated before disclosure'),
      contrast('An employer may hold records or have legal duties, but ownership or custody does not erase the psychologist\u2019s confidentiality obligations and prior arrangements', 'Disclosure authority remains governed by ethics, authorization, contracts, privilege, and applicable jurisdictional law'),
      contrast('Premature destruction can violate retention duties, obstruct authorized access, and undermine continuity or legal obligations', 'Records should be secured and retained or disposed of under governing policy and law, not eliminated to avoid future decisions'),
    ],
    editorialNote: 'The alternatives now present plausible errors about relatives, record custody, and retention rather than obvious automatic and every wording.',
    distractorDesign: ['relative-status-as-authorization', 'employer-custody-as-control', 'premature-destruction'],
  }),
  'eppp-b021-professional-3': revision('eppp-b021-professional-3', {
    choices: [
      'Courts are the principal disciplinary body, with professional organizations and licensing boards acting through referrals from the judiciary',
      'An employer has primary disciplinary jurisdiction whenever the alleged conduct occurred at the workplace',
      'APA administers association and licensing sanctions through a single national professional process',
      'APA and licensing boards have different jurisdictions and possible sanctions',
    ],
    wrongFeedback: [
      contrast('Courts can address legal disputes and sanctions, but professional association and licensure processes do not depend on judicial referral', 'Each body acts within its own authority and may examine overlapping conduct under different standards and procedures'),
      contrast('Employment context can give an employer authority over workplace consequences, but it does not displace association or licensing jurisdiction', 'A single event can therefore lead to distinct reviews with different purposes, evidence rules, and sanctions'),
      contrast('APA can govern membership and association matters, whereas state or provincial boards regulate licenses under law', 'Combining those functions into a national process obscures the separate authority and remedies of each body'),
    ],
    editorialNote: 'The jurisdictional distractors are now institutionally plausible and no longer advertise themselves through only, always, or every.',
    distractorDesign: ['judicial-referral-hierarchy', 'workplace-jurisdiction-preemption', 'national-unified-discipline'],
  }),
  'eppp-b023-professional-4': revision('eppp-b023-professional-4', {
    choices: [
      'Assign routine cases based on service demand, then review competence if a trainee encounters difficulty',
      'Use periodic outcome summaries as the main oversight method while allowing the trainee to set case procedures independently',
      'Treat the trainee as holding primary ethical responsibility once the supervisory agreement is signed',
      'Define roles, monitor performance, provide feedback, and protect client welfare',
    ],
    wrongFeedback: [
      contrast('Service demand is relevant, but assigning first and evaluating competence after difficulty exposes clients and trainees to preventable mismatch', 'Case delegation should consider the trainee\u2019s preparation, the client\u2019s needs, and available supervisory support before services begin'),
      contrast('Outcome summaries can inform supervision but may miss process errors, boundary problems, and emerging risk between reviews', 'Competent oversight includes ongoing monitoring, accessible consultation, direct feedback, and developmentally appropriate evaluation'),
      contrast('A supervisory agreement assigns responsibilities but does not transfer the supervisor\u2019s professional duties for delegation and oversight to the trainee', 'The supervisor remains accountable for a structure that protects clients while supporting the trainee\u2019s competence'),
    ],
    editorialNote: 'The new options model delayed competence review, outcome-only oversight, and responsibility transfer as plausible supervisory errors.',
    distractorDesign: ['post-hoc-competence-review', 'outcome-only-monitoring', 'responsibility-transfer'],
  }),
  'eppp-b024-professional-3': revision('eppp-b024-professional-3', {
    choices: [
      'They are coextensive because enforceable ethical duties enter practice through legal proceedings',
      'Ethical analysis becomes relevant chiefly in areas where legislation and licensing regulation are silent',
      'They overlap, but conduct can be legal yet ethically problematic or ethically defensible yet legally constrained',
      'Following a national professional code ordinarily establishes compliance across state and provincial jurisdictions',
    ],
    wrongFeedback: [
      contrast('Professional ethics and law can influence one another, but they arise from different authorities, purposes, and enforcement mechanisms', 'Conduct may satisfy a legal floor while still raising ethical concerns, so legal enforceability does not make the systems coextensive'),
      contrast('Ethical responsibilities do not disappear simply because a statute or regulation also addresses the subject matter', 'Psychologists must examine both frameworks and responsibly address tensions rather than treating ethics as a gap-filling device'),
      contrast('A national code cannot establish compliance with the varied statutes, regulations, and case law of each jurisdiction', 'Psychologists need current jurisdiction-specific legal analysis in addition to professional ethical reasoning'),
    ],
    editorialNote: 'The revision replaces obvious identical, only, and guarantee cues with credible misunderstandings about authority, legal floors, and jurisdiction.',
    distractorDesign: ['coextensive-authority-error', 'ethics-as-gap-filler', 'national-code-as-legal-safe-harbor'],
  }),
  'eppp-b025-professional-4': revision('eppp-b025-professional-4', {
    choices: [
      'Whether the platform\u2019s technical quality is adequate, with jurisdictional questions addressed if a complaint arises',
      'Whether the client accepts remote care, allowing emergency arrangements to develop if an urgent event occurs',
      'Whether electronic notes can be minimized, with retention duties handled under the psychologist\u2019s home jurisdiction',
      'Applicable authority-to-practice rules, competence, privacy, consent, and emergency arrangements',
    ],
    wrongFeedback: [
      contrast('Reliable technology matters, but it does not answer whether the psychologist has authority to practice where services are delivered', 'Jurisdiction, competence, privacy, consent, and emergency planning should be examined prospectively rather than after a complaint'),
      contrast('Client preference supports consent but does not replace a workable plan for emergencies, location verification, disruptions, or local resources', 'Those arrangements should be discussed before care begins because urgent circumstances may leave little time to improvise'),
      contrast('Using fewer electronic notes does not remove applicable record-retention, security, access, or disposal obligations', 'The psychologist must identify which jurisdictional and professional rules govern records rather than defaulting to the clinician\u2019s location'),
    ],
    editorialNote: 'The distractors now present realistic sequencing and jurisdiction mistakes without every, never, or regardless cues.',
    distractorDesign: ['technology-first-jurisdiction-later', 'reactive-emergency-planning', 'home-jurisdiction-record-default'],
  }),
  'eppp-b026-professional-2': revision('eppp-b026-professional-2', {
    choices: [
      'A general assurance that the selected platform has industry-standard security and a reliable connection',
      'The fee and cancellation policy, with remote-service risks addressed through the ordinary therapy consent form',
      'Technology, privacy limits, service disruptions, emergencies, and relevant alternatives',
      'A broad release assigning technology and privacy consequences to the client as a condition of remote care',
    ],
    wrongFeedback: [
      contrast('Platform security and connection quality are relevant but do not communicate how privacy, identity, interruptions, and emergencies will be managed', 'Telepsychology consent must prepare the client for service-specific risks and procedures rather than rely on a general assurance'),
      contrast('Fees matter, but an ordinary therapy form may omit material features unique to remote delivery and cross-jurisdiction practice', 'The client needs understandable information about technology, privacy, disruptions, emergency response, and available alternatives'),
      contrast('A release cannot shift the psychologist\u2019s professional responsibility for competent technology selection, privacy practices, and emergency planning to the client', 'Consent acknowledges material risks and choices; it is not a waiver of governing rights or clinician duties'),
    ],
    editorialNote: 'The revised options contrast security assurances, generic consent, and liability shifting with substantive telepsychology consent.',
    distractorDesign: ['security-assurance-only', 'generic-therapy-form-substitution', 'client-liability-transfer'],
  }),
  'eppp-b027-professional-1': revision('eppp-b027-professional-1', {
    choices: [
      'Notify clients after the final available session and direct urgent concerns to the office\u2019s general voicemail',
      'Transfer the caseload as a unit to a qualified colleague who can later assess each client\u2019s preference and fit',
      'Providing reasonable notice, interim planning, referrals, and continuity safeguards',
      'Maintain scheduled contacts remotely while illness prevents the psychologist from providing competent services',
    ],
    wrongFeedback: [
      contrast('Notice delivered at the final available session may leave insufficient time for referrals, records arrangements, emergency coverage, or clinical preparation', 'Timing should reflect foreseeable interruption, client risk, and the practical steps needed for a safe transition'),
      contrast('A qualified colleague may be an appropriate option, but transferring a whole caseload before considering consent, preference, and clinical fit is not individualized continuity planning', 'Clients should receive suitable choices and information whenever circumstances permit'),
      contrast('Preserving contact is not protective when illness prevents competent practice and can delay access to an available provider', 'The psychologist should limit affected work and arrange proportionate interim coverage or transfer instead of maintaining an impaired service'),
    ],
    editorialNote: 'The alternatives now test late notice, blanket transfer, and impaired continuation as credible abandonment-prevention errors.',
    distractorDesign: ['last-session-notice', 'blanket-caseload-transfer', 'impaired-service-continuation'],
  }),
  'eppp-b028-professional-3': revision('eppp-b028-professional-3', {
    choices: [
      'A treating clinician\u2019s established alliance supplies sufficient collateral context for a neutral opinion about the same client',
      'Separating the roles is useful chiefly when disclosing treatment records could affect a claim of legal privilege',
      'The therapist\u2019s duty to support treatment goals makes the clinician the preferred advocate for the client\u2019s forensic position',
      'The roles have conflicting purposes, loyalties, confidentiality, and objectivity demands',
    ],
    wrongFeedback: [
      contrast('A strong therapeutic alliance can improve treatment disclosure but does not create the neutrality required for an independent forensic opinion', 'Prior knowledge may instead intensify role conflict, selective attention, and competing expectations about confidentiality and loyalty'),
      contrast('Privilege and record disclosure are important, yet the central role problem extends to purpose, consent, audience, objectivity, and potential harm', 'Role separation remains relevant even when treatment information can be lawfully disclosed'),
      contrast('Treatment may involve support for client goals, whereas a neutral evaluator must answer an authorized legal referral with impartial methods and limits', 'Using the therapist as an advocate confuses those functions and can distort both care and forensic analysis'),
    ],
    editorialNote: 'The revised distractors are credible alliance, privilege, and advocacy confusions rather than extreme claims about testing or legal outcomes.',
    distractorDesign: ['alliance-as-neutrality', 'privilege-only-role-concern', 'therapist-as-forensic-advocate'],
  }),
  'eppp-v2-professional-003': revision('eppp-v2-professional-003', {
    choices: [
      'Clearly inform the client of the nature, purpose, and limits of confidentiality',
      'Decline the referral when involuntary status may reduce openness, unless the client independently requests therapy',
      'Use the ordinary voluntary-client intake and mention the referral source after a working alliance is established',
      'Offer enhanced confidentiality as a clinical incentive while reserving required disclosures for later discussion',
    ],
    wrongFeedback: [
      contrast('Mandated status can complicate alliance, but it is not by itself a reason to reject a referral the psychologist can competently perform', 'Transparent role and reporting information allows the client to participate with realistic expectations'),
      contrast('Postponing referral-source disclosure deprives the client of information needed to understand purpose, recipients, and consequences at the outset', 'The mandated arrangement should be clarified before sensitive information is collected'),
      contrast('Promising broader privacy than the arrangement permits creates misleading expectations and may damage trust when reporting duties arise', 'Candor about confidentiality limits is especially important when participation or information sharing is compelled'),
    ],
    editorialNote: 'The options now model avoidance, delayed disclosure, and strategic overpromising without using entirely, identical, or guarantee cues.',
    distractorDesign: ['mandate-as-refusal-ground', 'delayed-referral-disclosure', 'confidentiality-overpromise'],
  }),
  'eppp-v2-professional-005': revision('eppp-v2-professional-005', {
    choices: [
      'Accept a modest gift when the client intends gratitude, because benign intent resolves the boundary question',
      'Decline gifts as a standing clinic policy, treating cultural meaning as secondary to uniform administration',
      'Should be evaluated contextually; small culturally appropriate gifts may be acceptable',
      'Accept gifts tied to culturally significant occasions, using occasion rather than value or clinical meaning as the threshold',
    ],
    wrongFeedback: [
      contrast('A client\u2019s benign intent is relevant but does not resolve value, timing, vulnerability, reciprocity, treatment dynamics, or the effect of acceptance', 'The psychologist needs a contextual analysis rather than an intent-based safe harbor'),
      contrast('A consistent policy can support boundaries, yet rigid administration may create avoidable cultural harm or miss the clinical meaning of offering and refusal', 'Contextual judgment can preserve both fairness and cultural responsiveness'),
      contrast('A culturally significant occasion informs meaning but does not make every gift appropriate or remove concerns about value and influence', 'The decision should integrate occasion with relationship dynamics, boundaries, and foreseeable clinical consequences'),
    ],
    editorialNote: 'The contextual question now uses plausible intent, policy, and occasion heuristics rather than exaggerated universal acceptance or prohibition.',
    distractorDesign: ['benign-intent-safe-harbor', 'uniform-no-gift-policy', 'occasion-as-dispositive-threshold'],
  }),
  'eppp-v2-professional-009': revision('eppp-v2-professional-009', {
    choices: [
      'Dispose of older files at closing by applying the office\u2019s usual schedule before checking jurisdictional retention requirements',
      'Notify active clients after relocation so the psychologist can provide a confirmed new address and referral list',
      'Provide reasonable notice, ensure continuity of care through appropriate referrals, and arrange record storage',
      'Designate a successor clinician for the practice and allow clients to change providers after the initial transfer',
    ],
    wrongFeedback: [
      contrast('An office schedule cannot override legal, contractual, or clinical retention duties, and hurried disposal may impair later authorized access', 'Closure planning should identify governing requirements and secure custody before disposing of any record'),
      contrast('Waiting until after relocation can interrupt ongoing care and leave clients without timely emergency or transition information', 'Reasonable advance notice supports informed referral choices and continuity arrangements before the psychologist becomes unavailable'),
      contrast('A successor arrangement can help, but transferring first and seeking preference later overlooks consent, fit, privacy, and records authorization', 'Clients should participate in clinically appropriate transition decisions whenever circumstances permit'),
    ],
    editorialNote: 'The revision tests retention sequencing, late notice, and presumptive transfer rather than obvious destruction and abandonment extremes.',
    distractorDesign: ['retention-check-after-disposal', 'post-relocation-notice', 'successor-transfer-before-choice'],
  }),
  'eppp-v2-professional-013': revision('eppp-v2-professional-013', {
    choices: [
      'Select the intervention with the strongest average outcome even when a comparable option presents less risk for this client',
      'Accept low-probability harms as clinically irrelevant when an activity can also contribute to publishable knowledge',
      'Take care not to cause harm, including through omission, and to minimize unavoidable harm in professional activities',
      'Give research dissemination priority when delaying an individualized safeguard is unlikely to alter the aggregate study result',
    ],
    wrongFeedback: [
      contrast('Average efficacy does not settle an individualized risk decision when a comparably effective and safer option is available', 'Nonmaleficence requires attention to foreseeable harm as well as expected benefit for the person served'),
      contrast('Low probability can inform proportionality, but it does not make a foreseeable harm irrelevant or subordinate participant welfare to publication value', 'Risk should be minimized and justified in relation to benefit and available alternatives'),
      contrast('Scientific dissemination is valuable, yet postponing a needed safeguard for publication convenience reverses the priority of participant welfare', 'Ethical research planning protects individuals while pursuing knowledge rather than trading one against the other casually'),
    ],
    editorialNote: 'The distractors now present realistic efficacy, probability, and dissemination tradeoff errors instead of verbose extreme caricatures.',
    distractorDesign: ['average-efficacy-over-individual-risk', 'low-probability-dismissal', 'publication-over-safeguard'],
  }),
  'eppp-v2-professional-016': revision('eppp-v2-professional-016', {
    choices: [
      'Retain identifying details when they strengthen clinical coherence, then rely on journal peer review to protect privacy',
      'Sufficiently disguise the client\u2019s identity or obtain explicit written consent to protect confidentiality',
      'Use deceased cases as the preferred route because death ordinarily resolves confidentiality and authorization concerns',
      'Publish a composite case after altering each contributing client while skipping a separate check of whether a person remains identifiable',
    ],
    wrongFeedback: [
      contrast('Clinical coherence does not justify exposing identifying information, and peer review is not a substitute for consent or effective disguise', 'Privacy protection must occur before submission and account for the details that could permit recognition'),
      contrast('Death does not automatically make clinical material public or eliminate privilege, estate, ethical, and legal considerations', 'A deceased case still requires a valid disclosure basis and careful attention to identifiability'),
      contrast('Compositing and alteration can reduce identification risk but do not guarantee that each underlying person is protected', 'The psychologist must evaluate the combined contextual clues and obtain consent when adequate disguise cannot be assured'),
    ],
    editorialNote: 'The options now contrast peer review, deceased-case assumptions, and composite disguising without visible all, exclusively, or entirely cues.',
    distractorDesign: ['peer-review-as-privacy-control', 'death-as-confidentiality-end', 'composite-as-automatic-disguise'],
  }),
  'eppp-v2-professional-017': revision('eppp-v2-professional-017', {
    choices: [
      'Managing third-party billing and reimbursement because those financial duties define the forensic role',
      'Applying ordinary treatment confidentiality because the examinee is functionally the evaluator\u2019s therapy client',
      'Managing dual roles, maintaining objectivity, understanding legal context, and clarifying the client',
      'Selecting psychometric instruments because sound test construction resolves the evaluator\u2019s legal and role obligations',
    ],
    wrongFeedback: [
      contrast('Billing can raise ethical questions, but it does not define who authorized the evaluation, who receives findings, or what legal issue is addressed', 'Forensic work requires broader role, consent, objectivity, competence, and confidentiality analysis'),
      contrast('An examinee may not be the evaluator\u2019s therapy client, and the limits and recipients of information often differ from treatment', 'Applying the treatment frame without clarification can mislead the examinee and compromise the legal function'),
      contrast('Sound instruments support valid assessment, yet they cannot resolve role conflict, objectivity, authorized scope, or the distinction between clinical and legal standards', 'Forensic competence integrates methods with explicit role and context management'),
    ],
    editorialNote: 'The alternatives are neighboring forensic concerns whose incompleteness must be recognized, replacing three cue-heavy only responses.',
    distractorDesign: ['billing-defines-forensic-role', 'treatment-confidentiality-substitution', 'psychometrics-resolve-role-duties'],
  }),
  'eppp-v2-professional-021': revision('eppp-v2-professional-021', {
    choices: [
      'The payer or insurer, with the examinee directed to request an explanation from that organization',
      'The psychologist\u2019s clinical file, unless a court or licensing board later requests an interpretation',
      'Clients (or their legal representatives) in understandable language',
      'The referring professional, who determines whether and how the examinee receives an explanation',
    ],
    wrongFeedback: [
      contrast('A payer may be an authorized recipient, but third-party involvement does not by itself satisfy the psychologist\u2019s feedback responsibility to the examinee or representative', 'Any agreed exception should be clarified in advance rather than inferred from payment'),
      contrast('Retaining results in the file does not help the person understand findings, implications, or appropriate limitations', 'Standard 9.10 ordinarily calls for an understandable explanation, subject to defined exceptions and the assessment context'),
      contrast('A referrer can receive appropriate results and may help coordinate care, but the psychologist cannot simply delegate the examinee\u2019s feedback rights by default', 'The parties and any exception should be identified when roles and consent are established'),
    ],
    editorialNote: 'The options now test third-party payer, file-retention, and referrer-delegation errors without repeating only across distractors.',
    distractorDesign: ['payer-as-feedback-proxy', 'recording-instead-of-explaining', 'referrer-controls-feedback'],
  }),
  'eppp-v2-professional-026': revision('eppp-v2-professional-026', {
    choices: [
      'Decline release when proprietary material appears anywhere in the record, treating data and secure test materials as one category',
      'Release data through counsel or a court because a client request by itself does not identify an authorized recipient',
      'Remove the data after writing the report so later access cannot compromise the security of the instrument',
      'Psychologists generally provide test data to the client or their designee, consistent with law, unless release causes substantial harm',
    ],
    wrongFeedback: [
      contrast('Test data and protected test materials are related but distinct categories, so proprietary content does not justify withholding the entire responsive data set', 'The psychologist should separate releasable scores, responses, and notes from materials requiring security protection'),
      contrast('Counsel or judicial process may be involved in some matters, but Standard 9.04 recognizes requests from clients and their designees', 'The psychologist should assess identity, authority, law, and substantial-harm concerns rather than require a legal intermediary by default'),
      contrast('Completing a report does not erase retention or access duties, and destroying responsive information to avoid security questions can create additional ethical and legal problems', 'Secure storage and careful differentiation of data from test materials are the relevant controls'),
    ],
    editorialNote: 'The distractors now turn on data-versus-material distinctions, request authority, and retention rather than never, only, and automatic cues.',
    distractorDesign: ['data-material-conflation', 'legal-intermediary-default', 'post-report-destruction'],
  }),
  'eppp-v2-professional-037': revision('eppp-v2-professional-037', {
    choices: [
      'It can proceed when the doctoral student gives written permission and the psychologist documents the student\u2019s lack of objection',
      'It becomes problematic primarily if treatment later impairs the psychologist\u2019s evaluation of the student\u2019s performance',
      'Creates a problematic multiple relationship that should generally be avoided',
      'It can proceed when the spouse understands that the supervisory and treatment relationships will be managed separately',
    ],
    wrongFeedback: [
      contrast('The student\u2019s permission does not remove power imbalance, divided loyalties, privacy concerns, or effects on supervision and evaluation', 'Consent from one affected person is therefore not a sufficient safeguard for the overlapping relationship'),
      contrast('Poor evaluation outcomes are not required before a multiple relationship becomes concerning', 'The prospective question is whether the overlap could impair objectivity or competence, create exploitation, or risk harm'),
      contrast('Role explanation can reduce confusion but cannot by itself neutralize the psychologist\u2019s simultaneous obligations to the student and spouse', 'An independent therapist ordinarily provides cleaner boundaries when a reasonable alternative is available'),
    ],
    editorialNote: 'The revised options use consent, observed-harm, and role-clarification safeguards as plausible but incomplete responses.',
    distractorDesign: ['student-consent-safe-harbor', 'actual-impairment-threshold', 'role-clarification-as-cure'],
  }),
  'eppp-v2-professional-043': revision('eppp-v2-professional-043', {
    choices: [
      'Permitted when justified by scientific value, no non-deceptive alternatives exist, and no severe harm expected',
      'Permitted when participants sign a broad consent form mentioning that some study information may be incomplete',
      'Preferred when knowledge of the hypothesis could influence behavior, even if a feasible nondeceptive design is available',
      'Restricted to minimal-risk procedures, making prompt debriefing discretionary when withholding the explanation improves retention',
    ],
    wrongFeedback: [
      contrast('A general notice that information may be incomplete does not by itself satisfy the justification, alternative-design, distress, and debriefing conditions for deception', 'The investigator must evaluate the specific misleading procedure and its foreseeable effects'),
      contrast('Demand characteristics can support a scientific rationale, but deception is not preferred when a feasible nondeceptive method can answer the question', 'The ethical analysis requires necessity as well as prospective value and risk limits'),
      contrast('Risk limits matter, yet debriefing is part of the deception standard and ordinarily occurs as early as feasible', 'Withholding an explanation needs its own justified reason rather than a routine preference for retaining participants'),
    ],
    editorialNote: 'The new distractors are realistic overextensions involving broad consent, methodological convenience, and delayed debriefing.',
    distractorDesign: ['broad-consent-as-authorization', 'deception-as-methodological-preference', 'debriefing-as-discretionary'],
  }),
  'eppp-v2-professional-055': revision('eppp-v2-professional-055', {
    choices: [
      'Give notice and facilitate continuity of care',
      'Apply the routine record-disposal schedule before identifying a qualified custodian for retained files',
      'Stop scheduling new appointments and let current clients infer that the practice is winding down',
      'Refer the active caseload to the closest practice, allowing that provider to sort fit and consent after intake',
    ],
    wrongFeedback: [
      contrast('A routine disposal schedule may conflict with retention law and leave no secure custodian for records that must remain available', 'Closure planning should establish lawful storage, access, transfer, and eventual disposal arrangements before the office closes'),
      contrast('Passive scheduling changes do not provide clients with clear notice, emergency instructions, transition time, or meaningful referral choices', 'Direct communication and clinically appropriate continuity planning are needed to protect welfare'),
      contrast('Geographic proximity can be useful but does not establish clinical competence, availability, insurance fit, client preference, or authorized records transfer', 'Referrals should be suitable and allow informed client participation rather than operate as a blanket handoff'),
    ],
    editorialNote: 'The closure alternatives now test records sequencing, passive notice, and convenience-based referral instead of obvious abandonment extremes.',
    distractorDesign: ['disposal-before-custody-plan', 'passive-closure-notice', 'proximity-based-blanket-referral'],
  }),
  'eppp-v2-professional-066': revision('eppp-v2-professional-066', {
    choices: [
      'For psychotherapy, while assessment uses the referral authorization as its consent process',
      'For research participation, while clinical services rely on the professional\u2019s general duty of care',
      'For forensic evaluations, while treatment consent is ordinarily incorporated into the first session',
      'For professional services and research',
    ],
    wrongFeedback: [
      contrast('A referral authorizes a purpose but does not necessarily provide the examinee with understandable information about assessment procedures, roles, recipients, and limits', 'Assessment consent remains a distinct professional obligation subject to legal and Code-based exceptions'),
      contrast('Research consent is important, but the duty extends beyond research to therapy, assessment, consultation, and other professional activities', 'A general duty of care cannot substitute for the person\u2019s informed participation in a specific service'),
      contrast('Forensic evaluations require role and consent clarification, yet therapy also requires early informed discussion rather than consent inferred from attendance', 'The applicable content varies by context while the broader obligation spans both settings'),
    ],
    editorialNote: 'Each distractor now pairs one valid setting with a plausible but incorrect consent substitution in another setting.',
    distractorDesign: ['referral-as-assessment-consent', 'duty-of-care-as-clinical-consent', 'attendance-as-therapy-consent'],
  }),
  'eppp-v3-professional-025': revision('eppp-v3-professional-025', {
    choices: [
      'After considering treatment issues and discussing them with the client',
      'After the first psychologist confirms that concurrent care will not involve overlapping treatment goals',
      'After determining that the new service uses a different theoretical orientation from the existing treatment',
      'After the client pauses the other service while both professionals exchange records and coordinate a plan',
    ],
    wrongFeedback: [
      contrast('Professional consultation can be appropriate, but another psychologist does not hold a categorical veto over a competent client\u2019s care choices', 'The decision begins with client welfare, treatment issues, and discussion, with consultation used when appropriate and authorized'),
      contrast('Different orientations can still create contradictory plans, duplicated services, divided responsibilities, or confusion about crisis coverage', 'Functional coordination matters more than whether the clinicians use different theoretical labels'),
      contrast('A temporary pause may sometimes help coordination, but it is not a general prerequisite and could interrupt a beneficial service', 'The clinicians should consider the actual overlap, client preference, consent, and continuity needs'),
    ],
    editorialNote: 'The options now contrast professional veto, orientation difference, and mandatory pause with the contextual coordination required by Standard 10.04.',
    distractorDesign: ['other-clinician-veto', 'orientation-difference-safe-harbor', 'mandatory-service-pause'],
  }),
  'eppp-v3-professional-029': revision('eppp-v3-professional-029', {
    choices: [
      'The nature of treatment, expected benefits and risks, alternatives, limits of confidentiality, fees, and the client\'s right to withdraw at any time',
      'The office\u2019s billing workflow and attendance policy, with clinical risks discussed after a treatment method is selected',
      'The statutory exceptions to confidentiality, with the anticipated treatment course left for later collaborative planning',
      'The therapist\u2019s credentials and preferred orientation, with alternatives discussed if the initial approach proves ineffective',
    ],
    wrongFeedback: [
      contrast('Administrative policies are relevant but do not replace information about the service, foreseeable benefits and risks, alternatives, and privacy limits', 'Deferring clinical discussion until after method selection weakens the client\u2019s ability to choose meaningfully'),
      contrast('Confidentiality limits are essential, yet consent also includes the nature and anticipated course of therapy, fees, and third-party involvement', 'Collaborative planning can continue after intake without omitting these initial conditions'),
      contrast('Credentials and orientation help establish competence and expectations but do not describe material risks, alternatives, fees, or information sharing', 'Those conditions should be addressed before the client relies on the therapist\u2019s preferred approach'),
    ],
    editorialNote: 'The distractors now offer incomplete but credible consent packages rather than syntactically bloated extreme statements.',
    distractorDesign: ['administrative-package-only', 'confidentiality-package-only', 'credentials-package-only'],
  }),
  'eppp-v3-professional-043': revision('eppp-v3-professional-043', {
    choices: [
      'Patient preferences interpreted by the clinician when directly applicable comparative evidence is unavailable',
      'Randomized trials prioritized over other evidence and individualized context when their average effect is statistically significant',
      'Best research, clinical expertise, and patient characteristics and preferences',
      'Clinical experience supplemented by published guidance when patient collaboration would complicate treatment planning',
    ],
    wrongFeedback: [
      contrast('Patient preferences are one essential component, but interpretation by the clinician cannot substitute for relevant evidence and clinical expertise', 'EBPP integrates the components and considers culture, characteristics, and the available research together'),
      contrast('Randomized trials can provide strong evidence for some questions, but design quality, applicability, other research, expertise, and patient context also matter', 'A significant average effect does not determine the best decision for every individual'),
      contrast('Experience and guidance are incomplete when the patient\u2019s goals, culture, characteristics, and preferences are excluded from shared planning', 'Collaboration is part of evidence-based decision making rather than an optional complication'),
    ],
    editorialNote: 'The choices now vary how the three EBPP components are weighted instead of advertising omissions with repeated without wording.',
    distractorDesign: ['preference-mediated-by-clinician', 'rct-average-effect-dominance', 'expertise-without-collaboration'],
  }),
  'eppp-v3-professional-050': revision('eppp-v3-professional-050', {
    choices: [
      'Payment allocation, because the same clinician can manage role and privacy expectations informally across both formats',
      'Confidentiality expectations, role clarity, and informed consent for individual sessions',
      'Insurance coding, because separate procedure codes communicate the shift in alliance and information-sharing expectations',
      'Record organization, because placing notes in a shared chart gives both partners adequate notice of disclosure practices',
    ],
    wrongFeedback: [
      contrast('Payment should be clarified, but informal management does not resolve who the client is, what individual information may be shared, or how alliances may shift', 'Those role and privacy expectations require explicit agreement rather than assumption'),
      contrast('Accurate coding is necessary but does not communicate clinical roles, confidentiality policies, or the intended use of disclosures from an individual meeting', 'Administrative labels cannot replace informed consent and boundary clarification'),
      contrast('A shared chart can support documentation yet does not itself tell partners what information will be accessible or used in couple sessions', 'The psychologist should establish and explain a coherent policy before separate meetings occur'),
    ],
    editorialNote: 'The distractors now show how billing, coding, and charting fail to substitute for explicit couple-versus-individual role agreements.',
    distractorDesign: ['payment-as-role-management', 'coding-as-consent', 'shared-chart-as-privacy-policy'],
  }),
  'eppp-v3-professional-052': revision('eppp-v3-professional-052', {
    choices: [
      'Utilization review is administrative, so the psychologist can separate it from treatment selection and client communication',
      'Its ethical effects arise mainly in inpatient care, where authorization is more visible than in outpatient practice',
      'Cost controls improve consistency, making individualized exceptions a quality-management rather than welfare issue',
      'It may limit treatment options, create conflicts between cost containment and client welfare considerations',
    ],
    wrongFeedback: [
      contrast('Utilization decisions can shape duration, modality, disclosure, and access, so they cannot be treated as clinically neutral administration', 'Psychologists must recognize and address how payer requirements affect professional judgment and client welfare'),
      contrast('Outpatient care also involves session limits, network restrictions, diagnosis disclosure, and authorization decisions', 'The ethical tension depends on the payer arrangement and clinical need rather than the physical setting alone'),
      contrast('Consistency can be valuable, but cost controls may not fit an individual client\u2019s risk, response, preferences, or needed intensity', 'Quality management should not obscure conflicts between standardized authorization and welfare-based clinical judgment'),
    ],
    editorialNote: 'The alternatives now reflect administrative-neutrality, setting, and standardization misconceptions instead of exaggerated no-effect claims.',
    distractorDesign: ['utilization-as-clinically-neutral', 'inpatient-only-impact', 'standardization-over-individual-welfare'],
  }),
  'eppp-v3-professional-061': revision('eppp-v3-professional-061', {
    choices: [
      'Maintaining strong professional boundaries, potential dual relationships, core client privacy, and the impact of online self-disclosure',
      'Using privacy settings to separate professional conduct from personal posts, while addressing client contact if it occurs',
      'Following advertising rules as the central safeguard because boundary and privacy concerns arise chiefly in paid content',
      'Avoiding direct references to clients, which makes indirect recognition and online interaction clinically negligible',
    ],
    wrongFeedback: [
      contrast('Privacy settings reduce exposure but can change, fail, or be bypassed, and they do not resolve how online contact affects the therapeutic relationship', 'Psychologists need a broader plan for boundaries, discoverability, self-disclosure, and client privacy'),
      contrast('Advertising is one relevant area, but unpaid posts, searches, follows, reviews, and messaging can also create confidentiality and multiple-relationship concerns', 'Ethical social-media practice extends well beyond paid promotion'),
      contrast('Removing names is insufficient when combinations of context, timing, images, or interaction can permit recognition', 'The psychologist must consider indirect identification and the clinical meaning of online engagement, not merely explicit references'),
    ],
    editorialNote: 'The new options use privacy settings, advertising rules, and de-identification as plausible partial safeguards rather than nonsensical extremes.',
    distractorDesign: ['privacy-settings-as-boundary', 'advertising-only-frame', 'no-name-equals-no-identification'],
  }),
  'eppp-v3-professional-071': revision('eppp-v3-professional-071', {
    prompt: 'A psychologist anticipates that relocation may interrupt ongoing care. What does the governing planning provision emphasize?',
    choices: [
      'Send records to a designated colleague when relocation is announced, then seek client authorization for continued care',
      'Represent the planned transition as seamless so clients remain confident while operational details are finalized',
      'Make reasonable efforts to plan for continuity or appropriate resolution of services.',
      'Provide a general closing notice and wait for clients to request individualized transition assistance',
    ],
    wrongFeedback: [
      contrast('A colleague can support continuity, but sending records before authorization or another lawful basis can breach confidentiality and restrict client choice', 'Transfer planning should integrate consent, secure records handling, competence, and fit'),
      contrast('Reassurance can reduce anxiety, but promising seamless care misrepresents practical, legal, and clinical constraints that remain unresolved', 'Transparent planning should identify likely gaps, alternatives, and emergency arrangements'),
      contrast('A general announcement may not address the needs of clients with acute risk, specialized treatment, or limited referral options', 'Reasonable efforts require proportionate individualized planning rather than placing the whole burden on clients to ask'),
    ],
    editorialNote: 'The options now test unauthorized transfer, overpromising, and passive general notice rather than obvious every and without cues.',
    distractorDesign: ['record-transfer-before-authorization', 'seamless-transition-overpromise', 'general-notice-only'],
  }),
  'eppp-b006-professional-2': revision('eppp-b006-professional-2', {
    choices: [
      'Use evidence from a related population and describe the instrument as provisionally valid for the present population',
      'Proceed after the client acknowledges that the population-specific evidence is limited and accepts the uncertainty',
      'Describe the strengths and limitations of the results and interpretation',
      'Use published norms as the primary interpretive basis because commercial availability indicates adequate population review',
    ],
    wrongFeedback: [
      contrast('Evidence from a related population may be informative, but it does not establish validity for the present population merely by labeling the conclusion provisional', 'Interpretation should state what evidence transfers, what remains uncertain, and how those limits affect conclusions'),
      contrast('Client acknowledgment supports informed participation but does not create missing validity or reliability evidence', 'The psychologist remains responsible for appropriate method selection and for qualifying results when population evidence is not established'),
      contrast('Commercial publication and available norms do not guarantee that reliability and validity have been demonstrated for the population and purpose at issue', 'The psychologist must examine the supporting evidence rather than infer adequacy from market status'),
    ],
    editorialNote: 'The revised distractors are credible overextensions of related evidence, client acknowledgment, and commercial publication.',
    distractorDesign: ['provisional-label-as-validity', 'consent-as-psychometric-evidence', 'commercial-publication-as-validation'],
  }),
  'eppp-b012-professional-1': revision('eppp-b012-professional-1', {
    prompt: 'At intake, an adult client has limited health literacy and asks the psychologist to explain the consent form. Which communication approach is required?',
    choices: [
      'Read the standard clinic form aloud and document that the client had an opportunity to ask questions',
      'Language reasonably understandable to the person involved',
      'Use the clinic\u2019s simplified form when the same version has been approved for other adult clients',
      'Treat voluntary participation in the first session as agreement while revisiting written consent after rapport develops',
    ],
    rationale: 'Standard 3.10 requires informed consent in language the person can reasonably understand, with documentation when appropriate and attention to legal or Code-based exceptions. Health literacy calls for responsive explanation and comprehension checking rather than reliance on a standard form or attendance alone.',
    wrongFeedback: [
      contrast('Reading a form and inviting questions can help, but those steps do not establish that its vocabulary and concepts are understandable to this client', 'The psychologist should adapt the explanation and check comprehension rather than rely on delivery alone'),
      contrast('Prior approval and simplified wording may improve a form, yet understandability depends on the particular person, language, capacity, and context', 'A standardized version is a tool rather than proof of meaningful comprehension'),
      contrast('Voluntary attendance is not an adequate substitute for learning the nature, purpose, risks, roles, and limits of the service', 'Deferring consent until rapport develops collects sensitive information before the client has a sound basis for participation'),
    ],
    editorialNote: 'The health-literacy scenario separates this item from other Standard 3.10 definitions and replaces technical-language extremes with realistic process errors.',
    distractorDesign: ['read-aloud-as-comprehension', 'approved-form-as-individual-fit', 'attendance-as-interim-consent'],
  }),
  'eppp-b026-professional-4': revision('eppp-b026-professional-4', {
    prompt: 'During a telehealth visit, a patient located in an unfamiliar region describes a weapon, a named coworker, and a near-term plan. Local statutes list several authorized responses. Before choosing among them, what approach is safest?',
    choices: [
      'Apply the California case formulation as the national default unless local law expressly rejects it',
      'Warn the named person first, then assess whether other protective steps or confidentiality limits apply',
      'Treat discussion of violence as ending the clinical privacy relationship for the remainder of treatment',
      'Clinicians must assess threats and follow current jurisdiction-specific protection duties',
    ],
    rationale: 'Tarasoff is associated with reasonable protective care under specified circumstances, but statutes, cases, thresholds, protected persons, and permissible actions vary. A clinician should perform competent assessment, document reasoning, consult as needed, and follow current law and policy rather than assume one national warning rule.',
    wrongFeedback: [
      contrast('Tarasoff arose in California and influenced later law, but it did not create a uniform federal rule that automatically governs another jurisdiction', 'The clinician must identify the current local statute, cases, protected persons, thresholds, and permitted responses'),
      contrast('Warning may be one lawful protective action, yet some jurisdictions permit or require different combinations such as hospitalization, law-enforcement contact, or intensified care', 'Assessment and legal analysis should guide the response rather than a fixed warning-first sequence'),
      contrast('A threat can justify limited disclosure under specified conditions, but it does not erase confidentiality for unrelated information or the rest of treatment', 'Any disclosure should be proportionate to the protective purpose and governing authority'),
    ],
    editorialNote: 'This cross-jurisdiction transfer scenario differs from the historical Tarasoff item and uses national-default, warning-first, and total-waiver misconceptions.',
    distractorDesign: ['california-rule-as-national-default', 'warning-first-sequence', 'threat-as-total-privacy-waiver'],
  }),
  'eppp-v2-professional-032': revision('eppp-v2-professional-032', {
    prompt: 'Worsening health symptoms are causing a psychologist to miss details and follow through inconsistently with clients. Which response best addresses the functional concern?',
    choices: [
      'Maintain the current caseload while tracking whether clients report adverse effects from the symptoms',
      'Refrain from activities when personal problems might compromise competence and harm those they serve',
      'Take a predetermined leave whenever a health condition could become visible to clients or colleagues',
      'Limit work during scheduled breaks, then resume the regular caseload unless a licensing body directs otherwise',
    ],
    rationale: 'Standard 2.06 requires psychologists to respond when personal problems may interfere with work-related duties, including seeking assistance and determining whether activities should be limited, suspended, or terminated. Action is guided by functional impact and risk, not a client complaint, visibility, vacation calendar, or licensing directive.',
    wrongFeedback: [
      contrast('Waiting for a client report overlooks observable interference and allows preventable errors to continue before a proportionate response is considered', 'The psychologist should seek assistance and evaluate work-related duties when compromise becomes reasonably apparent'),
      contrast('A predetermined leave based on visibility treats diagnosis or appearance as the decision rule instead of actual professional functioning', 'Standard 2.06 calls for measures proportionate to interference, which may include consultation, limitation, suspension, or termination'),
      contrast('Scheduled breaks may provide rest but do not constitute a reasoned assessment of competence, continuity, or the duties affected by the condition', 'The psychologist need not await board direction before taking appropriate protective measures'),
    ],
    editorialNote: 'The functional-impairment scenario distinguishes this item from the consultation-sequencing duplicate and removes regardless, never, and only cues.',
    distractorDesign: ['complaint-before-action', 'visibility-based-leave', 'scheduled-break-substitution'],
  }),
  'eppp-b019-professional-1': revision('eppp-b019-professional-1', {
    prompt: 'An evaluator has a referral question about work capacity, one elevated screening score, conflicting collateral reports, and no validity indicators. What evidentiary basis is required before offering a firm opinion?',
    choices: [
      'Information and techniques sufficient to substantiate their findings',
      'The screening score, interpreted conservatively and paired with a disclaimer about the unresolved collateral discrepancy',
      'The retaining party\u2019s account when it directly addresses the referral question and comes from a documented interview',
      'A method selected after the evaluator develops a provisional conclusion, provided contradictory evidence is summarized in the report',
    ],
    rationale: 'Standard 9.01 requires opinions and recommendations to rest on information and techniques adequate to support the conclusion. A lone screening score, one interested account, or conclusion-driven method selection does not resolve validity and collateral conflicts for a firm work-capacity opinion; the evaluator should gather proportionate evidence and state limits.',
    wrongFeedback: [
      contrast('A conservative disclaimer does not make one screening score sufficient for a firm capacity opinion when validity and collateral discrepancies remain unresolved', 'The evaluator needs methods and information matched to the referral question and must limit conclusions when the basis remains incomplete'),
      contrast('A retaining party can provide useful history, but interest, perspective, and lack of corroboration affect the weight of that account', 'Substantiation requires integrating relevant sources and techniques rather than elevating the referring party by role'),
      contrast('Selecting methods to support a provisional conclusion invites confirmation bias even when contrary information is later acknowledged', 'Assessment procedures should test competing explanations and generate a defensible basis before the conclusion is fixed'),
    ],
    editorialNote: 'The applied work-capacity scenario separates this item from a definitional Standard 9.01 duplicate and replaces extreme shortcuts with plausible evidence errors.',
    distractorDesign: ['screen-plus-disclaimer', 'retaining-party-privilege', 'conclusion-driven-method-selection'],
  }),
  'eppp-v2-professional-051': revision('eppp-v2-professional-051', {
    prompt: 'A school evaluation combines teacher ratings, a brief cognitive screener, and records, but none address the referral concern about episodic absences. Which requirement should govern the sufficiency decision?',
    choices: [
      'Based on information and techniques sufficient to substantiate derived findings',
      'Include a broad standardized instrument and presume that multi-method status establishes referral fit',
      'Be administered by a licensed psychologist personally when a trainee collected any component of the information',
      'Use norms closely matched to the student\u2019s demographics, which by itself resolves whether the referral question was assessed',
    ],
    rationale: 'Standard 9.01 requires an adequate basis for assessment conclusions. Multiple sources do not establish sufficiency when they fail to address the referral question, and neither a broad test, examiner licensure, nor demographic norm matching substitutes for relevant information, appropriate techniques, and transparent limits.',
    wrongFeedback: [
      contrast('Adding an instrument increases method count but does not help if the instrument is not relevant to the episodic absence question', 'Sufficiency turns on the fit, quality, and integration of evidence rather than a generic multi-method label'),
      contrast('Qualified trainees may administer components under appropriate delegation and supervision; examiner status does not determine whether the evidence answers the referral', 'Competence and supervision matter alongside the substantive adequacy of the information'),
      contrast('Representative norms improve score interpretation but cannot supply missing observations or methods related to the referral concern', 'Population fit and referral-question coverage are distinct requirements that both need attention'),
    ],
    editorialNote: 'This referral-fit scenario is distinct from the firm-opinion item and removes strictly, without, and exclusively from the alternatives.',
    distractorDesign: ['method-count-over-relevance', 'personal-administration-requirement', 'norm-fit-as-referral-coverage'],
  }),
  'eppp-v3-professional-058': revision('eppp-v3-professional-058', {
    prompt: 'A client has reached agreed goals and continued sessions are adding no discernible benefit. Which recognized circumstance most directly supports ending treatment?',
    choices: [
      'A brief payment delay after the client requests clarification of a disputed invoice',
      'Services are no longer needed, are not beneficial, or are causing harm',
      'Respectful disagreement about the treatment rationale while the client remains engaged and improving',
      'The clinician\u2019s preference to open a slot for another client before discussing transition needs',
    ],
    rationale: 'Standard 10.10 recognizes termination when the client no longer needs the service, is unlikely to benefit, or is being harmed by continued service. It separately addresses threats and nonpayment and ordinarily requires appropriate pretermination counseling and alternatives, so a minor dispute, respectful question, or scheduling preference is insufficient.',
    wrongFeedback: [
      contrast('A brief disputed payment delay does not by itself establish the nonpayment circumstance or justify bypassing contractual review and clinical transition planning', 'The psychologist should clarify the account and consider welfare before using termination as a collection response'),
      contrast('A client\u2019s respectful challenge can support collaboration and informed consent rather than show that treatment is unnecessary or harmful', 'Continued engagement and improvement weigh against treating disagreement as a termination basis'),
      contrast('Practice-capacity preferences are real but do not transform a beneficial service into one the client no longer needs', 'If availability requires a transition, the clinician should communicate and plan continuity rather than invoke the clinical termination criteria'),
    ],
    editorialNote: 'The goal-attainment context separates this item from direct Standard 10.10 recall and substitutes realistic billing, collaboration, and capacity errors.',
    distractorDesign: ['minor-billing-dispute', 'client-question-as-termination', 'slot-management-as-clinical-criterion'],
  }),
  'eppp-b018-professional-3': revision('eppp-b018-professional-3', {
    prompt: 'After billing discrepancies, poor handoffs, and a sponsor request to reproduce an analysis, a clinic redesigns how staff capture professional decisions. Which listed purpose best guides that workflow?',
    choices: [
      'Reduce the information available to a future authorized reviewer so the clinician\u2019s informal reasoning remains private',
      'Use detailed notes as a substitute for discussing consent, privacy, and treatment expectations with clients',
      'Retain working impressions on a fixed schedule even when they are not part of the professional record and serve no identified purpose',
      'Facilitate services, replication, institutional requirements, accuracy, and legal compliance',
    ],
    rationale: 'Standard 6.01 identifies functional purposes for records, including facilitating later services, enabling replication, meeting institutional requirements, supporting accurate billing, and complying with law. Documentation complements rather than replaces consent, and scope and retention should reflect purpose, context, confidentiality, and governing requirements.',
    wrongFeedback: [
      contrast('Record design should permit appropriate continuity and accountability, not intentionally frustrate an authorized review of professional work', 'Confidentiality controls access while documentation preserves information needed for legitimate service, institutional, billing, research, and legal purposes'),
      contrast('Detailed notes can memorialize what was discussed, but they cannot give a client information, answer questions, or obtain meaningful agreement', 'Consent and confidentiality communication remain interactive professional duties alongside documentation'),
      contrast('A fixed retention practice detached from record status and purpose can preserve unnecessary sensitive material or conflict with governing requirements', 'The clinic should define what belongs in the record and retain it according to function, policy, and law'),
    ],
    editorialNote: 'The policy-design scenario distinguishes functional record purposes from privacy obstruction, documentation substitution, and purposeless retention.',
    distractorDesign: ['review-obstruction', 'documentation-as-consent-substitute', 'purpose-free-retention'],
  }),
  'eppp-v2-professional-069': revision('eppp-v2-professional-069', {
    prompt: 'A competent client prefers a lower-intensity treatment after receiving balanced details, while the psychologist favors a more intensive plan. Which ethical orientation most directly supports honoring the choice?',
    choices: [
      'The therapist choosing the plan whenever clinical expertise favors a different option',
      'The client deferring treatment choices to the clinician after signing the consent form',
      'Respecting clients\' right to self-determination and informed decision-making',
      'Treating legal compliance as sufficient ethical analysis',
    ],
    rationale: 'Autonomy supports a competent client\u2019s informed self-determination, including choosing among reasonable options or refusing a recommendation. The psychologist should communicate evidence, risks, benefits, and alternatives without replacing the client\u2019s decision merely because another clinically reasonable plan is preferred.',
    wrongFeedback: [
      contrast('Professional expertise supports recommendations but does not give the therapist unilateral authority over a competent client\u2019s reasonable informed choice', 'Shared decision making preserves clinical guidance while respecting the person\u2019s values and right to decline'),
      contrast('Excluding the client from treatment decisions prevents meaningful consent and ignores the person\u2019s goals, preferences, and authority over participation', 'The psychologist should support understanding and voluntary choice rather than equate expertise with control'),
      contrast('Legal compliance establishes important constraints but may not exhaust ethical duties involving information, collaboration, privacy, dignity, and self-determination', 'An autonomy analysis considers the person\u2019s informed preferences within the clinically and legally available options'),
    ],
    editorialNote: 'The treatment-intensity scenario tests self-determination in a concrete disagreement and separates it from the broader Principle E duplicate.',
    distractorDesign: ['expertise-as-unilateral-control', 'client-exclusion', 'legal-floor-only'],
  }),
  'eppp-b020-professional-4': revision('eppp-b020-professional-4', {
    prompt: 'A psychologist concludes that a workplace reporting rule may clash with a professional ethical duty. Before assuming the duties are irreconcilable, what should happen first?',
    choices: [
      'Treat the psychologist\u2019s personal moral conclusion as the controlling exception to the workplace rule',
      'Select the interpretation that creates the least administrative burden and record the choice as an operational decision',
      'Pause the affected professional service until an outside psychologist accepts responsibility for interpreting the competing duties',
      'Clarify the conflict, affirm commitment to the Code, and seek responsible resolution',
    ],
    rationale: 'Standard 1.02 directs psychologists to clarify an apparent conflict, make known their commitment to the Code, and take reasonable steps toward responsible resolution. It cannot justify human-rights violations. Personal preference, administrative convenience, or indefinite delegation does not replace analysis of the actual ethical and governing requirements.',
    wrongFeedback: [
      contrast('Personal moral judgment can alert a psychologist to a concern, but it does not establish an exception to a governing requirement', 'The response should identify the actual duties, communicate ethical commitment, and pursue a defensible resolution'),
      contrast('Administrative burden is not the criterion for choosing between competing ethical and legal interpretations', 'Documentation should capture substantive clarification and resolution efforts rather than convert convenience into authority'),
      contrast('Temporary limitation may sometimes protect people, but transferring interpretation to an outside psychologist avoids rather than resolves the professional\u2019s own obligations', 'Consultation can inform a decision while responsibility remains with the psychologist and relevant organization'),
    ],
    editorialNote: 'The workplace context differs from the general law-conflict item and replaces cue-heavy withdrawal and disregard options with credible process errors.',
    distractorDesign: ['personal-morality-as-exception', 'administrative-burden-rule', 'consultant-as-responsibility-transfer'],
  }),
  'eppp-v2-professional-041': revision('eppp-v2-professional-041', {
    prompt: 'A private psychologist transmits standard digital insurance claims for clinical services. Which federal privacy-rule category analysis is most relevant to whether the practice is directly regulated?',
    choices: [
      'Hospital-based provider status, because outpatient clinicians enter HIPAA chiefly through affiliation with an inpatient institution',
      'Any employer with a licensed clinician, because professional staffing makes the organization a health-care provider',
      'Health plans, health care clearinghouses, and electronic healthcare providers',
      'Receipt of public funds, because direct federal payment is the principal basis for covered-entity status',
    ],
    rationale: 'HIPAA covered entities include health plans, health care clearinghouses, and health care providers that conduct specified electronic transactions. A private psychologist who bills electronically may therefore qualify; hospital affiliation, employment of a clinician, or government funding alone is not the defining test.',
    wrongFeedback: [
      contrast('Outpatient providers can be covered when they conduct specified electronic transactions, so hospital affiliation is not the controlling category', 'The billing activity described is more relevant than whether services occur inside an inpatient institution'),
      contrast('Employing a clinician does not by itself make every business a HIPAA health care provider engaged in covered transactions', 'The organization\u2019s functions and electronic transaction activity must be examined rather than inferred from staff licensure'),
      contrast('Public funding can carry separate privacy obligations, but direct federal payment is not required for covered-entity status', 'Private health plans, clearinghouses, and qualifying providers can fall within HIPAA based on category and transactions'),
    ],
    editorialNote: 'The electronic-claims scenario distinguishes HIPAA category and transaction status from hospital, staffing, and funding misconceptions.',
    distractorDesign: ['hospital-affiliation-test', 'licensed-staff-test', 'public-funding-test'],
  }),
  'eppp-v2-professional-025': revision('eppp-v2-professional-025', {
    prompt: 'A client reports thoughts of suicide but has not yet described timing, purpose, access to means, prior behavior, or reasons for living. What should the psychologist do first?',
    choices: [
      'Complete a comprehensive liability-oriented note before asking additional questions so the initial disclosure is preserved verbatim',
      'Initiate an emergency involuntary process based on ideation, then obtain details after the client is in a controlled setting',
      'Assessing the level of risk \u2014 including plan, means, intent, risk factors, and protective factors \u2014 to determine the appropriate level of intervention',
      'Arrange transfer to a specialist before clarifying current risk so the eventual evaluator can conduct one complete assessment',
    ],
    rationale: 'The immediate task is a competent suicide risk assessment addressing ideation, plan, means, intent, history, acute and chronic risk factors, and protective factors. Findings guide proportionate safety planning, intensified care, emergency evaluation, consultation, documentation, and any lawful disclosure rather than presuming one intervention from ideation alone.',
    wrongFeedback: [
      contrast('Timely documentation is essential, but prioritizing a liability note delays the information needed to understand and respond to possible imminent danger', 'The clinician should assess current risk while recording the encounter contemporaneously and accurately'),
      contrast('Emergency evaluation may be necessary at higher risk, but ideation alone does not establish the legal or clinical threshold for a particular involuntary action', 'Plan, intent, means, history, protective factors, and jurisdictional criteria should inform the response'),
      contrast('Specialty consultation or transfer can improve care, yet sending the client away before clarifying immediate safety may create a dangerous gap', 'The current psychologist remains responsible for initial assessment and interim protection until a safe handoff occurs'),
    ],
    editorialNote: 'The applied incomplete-disclosure scenario separates this item from broad suicide-priority recall and replaces conspicuous immediate/automatic cues with sequencing errors.',
    distractorDesign: ['documentation-before-assessment', 'ideation-as-commitment-threshold', 'transfer-before-initial-safety-assessment'],
  }),
  'eppp-b028-professional-1': revision('eppp-b028-professional-1', {
    prompt: 'A legislative analyst compares enactments adopted across the country after a landmark California decision. They differ in trigger, covered person, and permitted response. What national significance should the analyst attribute to that case?',
    choices: [
      'Use the California warning formulation when it offers broader protection than the local statute',
      'Treat a client\u2019s expression of anger as consent to disclose the treatment record for public-safety review',
      'It influenced jurisdiction-specific duties to protect identifiable potential victims',
      'Rely on standardized violence prediction to determine whether the clinician will face liability for later conduct',
    ],
    rationale: 'Tarasoff influenced duties of reasonable care to protect potential victims, but it did not establish a single national rule. Thresholds, protected persons, and permissible actions vary, so clinicians should use competent assessment and current jurisdiction-specific law and policy rather than transplant California doctrine wholesale.',
    wrongFeedback: [
      contrast('A clinician cannot substitute California doctrine for the governing law of the state where the professional duty arises', 'Broader-seeming action may itself violate privacy or procedure when it is not authorized or proportionate under local law'),
      contrast('Anger does not function as consent to release a treatment record, and protective disclosures are ordinarily limited to what a valid duty or permission requires', 'Assessment must distinguish affective expression from a qualifying threat'),
      contrast('Risk instruments can contribute structured information but do not predict violence with certainty or decide legal liability', 'Clinical formulation, current facts, documentation, consultation, and jurisdictional requirements must be integrated'),
    ],
    editorialNote: 'The interstate-practice scenario distinguishes this item from the response-selection Tarasoff duplicate and uses transfer, consent, and prediction errors.',
    distractorDesign: ['california-doctrine-transplant', 'anger-as-disclosure-consent', 'risk-tool-as-liability-determinant'],
  }),
  'eppp-b003-professional-1': revision('eppp-b003-professional-1', {
    prompt: 'After a neurologic episode, a psychologist remains accurate when editing reports but becomes slow and error-prone during unexpected crisis calls. An occupational review recommends temporary removal from on-call work while recovery is monitored. What is the most proportionate response?',
    rationale: 'Standard 2.06(b) supports a proportionate functional response: obtain appropriate consultation or assistance, then limit, suspend, or terminate the duties that are compromised. The distinction between reliable documentation and affected rapid clinical decisions argues against either ignoring the problem or transferring the entire caseload without assessing specific functions.',
    editorialNote: 'The functional task-splitting scenario no longer duplicates the general consultation sequence and asks learners to calibrate limits to the affected duties.',
    distractorDesign: ['error-before-adjustment', 'whole-caseload-overcorrection', 'diagnosis-disclosure-as-safeguard'],
  }),
  'eppp-b005-professional-2': revision('eppp-b005-professional-2', {
    prompt: 'A psychologist explains a new service through an interpreter, but the client nods while giving answers that reveal misunderstanding. What communication requirement remains unmet?',
    rationale: 'Standard 3.10 requires consent information to be conveyed in language the person can reasonably understand, with appropriate documentation and attention to any legal or Code-based exception. Using an interpreter is a means, not proof of comprehension; the psychologist should clarify concepts and check understanding before proceeding.',
    editorialNote: 'The interpreter-and-comprehension scenario distinguishes this item from the health-literacy duplicate and tests outcome of communication rather than form wording alone.',
    distractorDesign: ['technical-language-as-precision', 'presence-as-assent', 'documentation-burden-exception'],
  }),
  'eppp-b010-professional-1': revision('eppp-b010-professional-1', {
    prompt: 'A court orders production of assessment information that includes protected test content. Before responding, which approach best balances material integrity with the legal demand?',
    rationale: 'Standard 9.11 calls for reasonable efforts to preserve the integrity and security of test materials consistent with law and contractual obligations. A psychologist should examine the order, seek a protective or limited-disclosure mechanism when appropriate, and avoid either casual publication or reflexive noncompliance.',
    editorialNote: 'The court-production scenario makes test security a balancing decision and separates it from direct recitation of the standard.',
    distractorDesign: ['client-request-as-publication', 'unrestricted-protocol-copying', 'reflexive-order-refusal'],
  }),
  'eppp-b017-professional-1': revision('eppp-b017-professional-1', {
    prompt: 'A study procedure has meaningful scientific value, but a small scheduling change would substantially reduce an anticipated burden while preserving the design. Which response is most appropriate?',
    rationale: 'Standard 3.04 calls for reasonable steps to avoid foreseeable harm and to minimize harm that is unavoidable. Because the scheduling change preserves scientific value while reducing the burden, adopting it is a proportionate application; the standard does not promise risk-free participation or require abandonment of valuable work.',
    editorialNote: 'The research-burden mitigation context is distinct from the intervention-risk items and tests a feasible design adjustment rather than defining harm avoidance.',
    distractorDesign: ['risk-free-guarantee', 'institutional-convenience-priority', 'continue-after-serious-harm'],
  }),
  'eppp-v2-professional-047': revision('eppp-v2-professional-047', {
    prompt: 'Two independent psychologists share revenue from a joint evaluation: one conducts testing and the other integrates records and writes the opinion. Which fee arrangement is most defensible?',
    rationale: 'Standard 6.07 permits division outside an employer\u2013employee relationship when the split reflects services actually provided rather than payment for the referral. Testing, records integration, and report preparation can support a documented service-based allocation; professional licensure or group overhead alone does not justify a referral fee.',
    editorialNote: 'The joint-evaluation allocation scenario distinguishes service-based division from the existing referral-definition item and makes learners identify compensable contributions.',
    distractorDesign: ['licensure-as-fee-basis', 'overhead-as-mandatory-split', 'jurisdictional-illegality-overgeneralization'],
  }),
  'eppp-v3-professional-020': revision('eppp-v3-professional-020', {
    prompt: 'A psychologist treats a student while also serving on the committee that decides the student\u2019s funding. Which feature makes this arrangement a potential Standard 3.05 concern?',
    rationale: 'The psychologist occupies a clinical role and a consequential institutional role with the same person. Standard 3.05 focuses on overlaps that could impair objectivity or competence, create exploitation, or cause harm; merely working in several settings, integrating methods, or treating many clients does not create that relational conflict.',
    editorialNote: 'The treatment-and-funding scenario applies the multiple-role concept and separates it from the neighboring direct definition in the bank.',
    distractorDesign: ['multiple-settings-confusion', 'integrative-treatment-confusion', 'large-caseload-confusion'],
  }),
  'eppp-b008-lifespan-1': revision('eppp-b008-lifespan-1', {
    prompt: 'After retirement, an older adult misses a work-based social network but has opportunities to join a community choir and volunteer program. Which prediction follows from the engagement account of later-life adjustment?',
    editorialNote: 'The transition scenario removes the stem-to-key activity echo and asks the learner to apply role replacement rather than recall a definition.',
    distractorDesign: ['global-role-withdrawal', 'postretirement-relationship-avoidance', 'engagement-reduction'],
  }),
  'eppp-b010-lifespan-1': revision('eppp-b010-lifespan-1', {
    prompt: 'Repeated comfort after a toddler seeks a caregiver shapes later beliefs about whether support will be available. Which account best describes what is being formed?',
    editorialNote: 'The caregiver-expectation scenario removes the repeated model cue and contrasts a representation with reflex, score, and explicit instruction explanations.',
    distractorDesign: ['locomotion-bound-reflex', 'strange-situation-score', 'explicit-caregiver-rule-list'],
  }),
  'eppp-b015-lifespan-1': revision('eppp-b015-lifespan-1', {
    choices: [
      'A low-demand environment that reduces exposure to challenge while allowing adults to manage difficult decisions',
      'Stable supportive relationships with caring adults plus broader contextual resources',
      'Strong cognitive ability paired with opportunities for independent problem solving rather than adult support',
      'Postponement of demanding developmental tasks until the child demonstrates consistent emotional regulation',
    ],
    wrongFeedback: [
      contrast('Reducing overwhelming risk can help, but shielding a child from ordinary challenge and agency does not by itself build adaptive capacity', 'Resilience is supported by manageable opportunities alongside reliable relationships and family, school, and community resources'),
      contrast('Cognitive strengths can contribute to adaptation, yet they operate within relational and contextual systems rather than replacing them', 'Stable caring adults and accessible resources remain prominent protective factors across levels of individual ability'),
      contrast('Developmental demands cannot generally be deferred until regulation is fully established, and avoidance can restrict learning and participation', 'Supported engagement with proportionate challenges better fits a dynamic resilience framework'),
    ],
    editorialNote: 'The distractors now represent overprotection, intelligence substitution, and developmental postponement without all, without, or every cues.',
    distractorDesign: ['overprotection-as-resilience', 'cognitive-strength-substitution', 'task-postponement'],
  }),
  'eppp-b020-lifespan-2': revision('eppp-b020-lifespan-2', {
    choices: [
      'Change produced predominantly by inherited tendencies or predominantly by learning opportunities',
      'Change that follows a broadly shared sequence or change whose expression differs across cultural settings',
      'Patterns that show rank-order stability or capacities that remain open to later modification',
      'Gradual quantitative change or qualitatively distinct stages and transitions',
    ],
    wrongFeedback: [
      contrast('Inherited and environmental influences frame the nature\u2013nurture question rather than whether developmental change is gradual or stage-like', 'Both influences can contribute to either continuous trends or qualitative transitions'),
      contrast('Shared sequences and cultural variation concern universality and context, which is conceptually separate from the form of change over time', 'A pattern can be continuous while culturally variable or discontinuous while broadly shared'),
      contrast('Stability and plasticity ask whether characteristics persist or can change, not whether change accumulates smoothly or occurs through qualitative reorganization', 'Those dimensions can intersect but are not interchangeable debates'),
    ],
    editorialNote: 'The revised alternatives contrast three neighboring developmental debates and remove entirely, every, and completely cueing.',
    distractorDesign: ['nature-nurture-substitution', 'universality-context-substitution', 'stability-plasticity-substitution'],
  }),
  'eppp-b025-lifespan-2': revision('eppp-b025-lifespan-2', {
    choices: [
      'Sets aside the existing schema and constructs a replacement before interpreting the unfamiliar event',
      'Interprets a new experience using an existing schema',
      'Demonstrates conservation through perceptual comparison rather than drawing on an established cognitive organization',
      'Acquires a formal-operational strategy when maturation makes the strategy available, with experience serving as practice',
    ],
    wrongFeedback: [
      contrast('Replacing or substantially modifying a schema to fit discrepant information describes accommodation more closely than assimilation', 'Assimilation begins by interpreting the new event through a cognitive organization already available to the child'),
      contrast('Conservation is a particular cognitive achievement, and perceptual comparison does not define the general process for incorporating experience into a schema', 'The question asks about adaptation of information, not successful performance on a conservation task'),
      contrast('Piaget treated maturation as relevant but did not reduce cognitive change to a strategy becoming biologically available', 'Assimilation concerns how present schemas organize experience, while adaptation also involves active accommodation and interaction'),
    ],
    editorialNote: 'The alternatives now contrast accommodation, conservation, and maturation accounts without every, without, or solely cues.',
    distractorDesign: ['accommodation-substitution', 'conservation-task-substitution', 'maturation-only-account'],
  }),
  'eppp-v2-lifespan-009': revision('eppp-v2-lifespan-009', {
    choices: [
      'A behavioral pattern established mainly by the contingencies caregivers apply during the first year',
      'A child\'s behavioral style present from birth, including activity level, regularity, and adaptability',
      'A style initially organized by parenting and later stabilized as a biologically based trait',
      'A common infant response pattern whose apparent differences reflect measurement timing and context',
    ],
    wrongFeedback: [
      contrast('Caregiving contingencies shape expression and development, but Thomas and Chess described early individual differences not reducible to learned reinforcement histories', 'Their dimensions concern characteristic style such as activity, rhythmicity, approach, and adaptability'),
      contrast('Parenting and temperament interact, yet the theory does not treat parenting as the source that first creates the child\u2019s style', 'Goodness of fit emphasizes the relation between an existing temperament pattern and environmental demands'),
      contrast('Context and measurement affect observed behavior, but stable individual differences in style are central to the temperament formulation', 'Variation across infants is theoretically meaningful rather than dismissed as timing artifact'),
    ],
    editorialNote: 'The distractors now represent reinforcement, parent-created style, and measurement-artifact accounts rather than extreme nature\u2013nurture claims.',
    distractorDesign: ['reinforcement-origin', 'parent-created-temperament', 'measurement-artifact-account'],
  }),
  'eppp-v2-lifespan-036': revision('eppp-v2-lifespan-036', {
    choices: [
      'The role of social interaction, culture, and language as primary drivers of cognitive development',
      'Maturational readiness as the main constraint, with social experience helping children display capacities already organized internally',
      'Inherited cognitive structures as the principal source of growth, with instruction adapting to those structures',
      'A fixed stage sequence whose timing can be accelerated through guidance from more knowledgeable partners',
    ],
    wrongFeedback: [
      contrast('Maturational readiness can constrain performance, but Vygotsky assigned a constitutive role to social interaction, language, and culturally organized activity', 'Guidance does more than reveal an internally completed capacity'),
      contrast('Biological factors matter to development, yet the sociocultural account emphasizes tools and meanings acquired through participation with others', 'Instruction and culture are sources of cognitive change rather than mere adaptations to inherited structures'),
      contrast('Guidance is central to Vygotsky, but his account does not depend on a universal invariant sequence of Piagetian stages', 'The zone of proximal development concerns supported potential within culturally situated learning'),
    ],
    editorialNote: 'The revised neighbors contrast maturational display, inherited structures, and guided stage acceleration without sole, only, or invariant-all cueing.',
    distractorDesign: ['maturation-as-latent-capacity', 'inherited-structure-priority', 'guidance-accelerates-fixed-stages'],
  }),
  'eppp-v3-lifespan-033': revision('eppp-v3-lifespan-033', {
    choices: [
      'How consistently a caregiver applies one parenting approach across the child\u2019s changing behavior',
      'How closely the child\u2019s behavior resembles age-based expectations used for the caregiving setting',
      'The match between a child\'s temperament and environmental demands/expectations',
      'How strongly the child\u2019s early temperament predicts later adjustment across caregiving environments',
    ],
    wrongFeedback: [
      contrast('Caregiver consistency can support predictability, but goodness of fit concerns whether environmental expectations suit the child\u2019s temperament', 'One consistently applied style may fit one child and clash with another'),
      contrast('Developmental expectations provide context, yet average age norms do not determine whether a particular environment accommodates a child\u2019s style', 'Fit is relational and can be improved by adapting demands and supports'),
      contrast('Temperament may show continuity, but the model does not treat it as a context-independent predictor of outcome', 'Adjustment emerges from interaction between the child\u2019s characteristics and surrounding expectations and resources'),
    ],
    editorialNote: 'The options now distinguish consistency, norm conformity, and trait prediction from the relational match central to goodness of fit.',
    distractorDesign: ['parenting-consistency', 'age-norm-conformity', 'temperament-as-context-free-predictor'],
  }),
  'eppp-b007-lifespan-2': revision('eppp-b007-lifespan-2', {
    choices: [
      'Represents a fixed age stage expected wherever secondary education extends into the early twenties',
      'Begins at pubertal maturation and closes when a person gains the legal rights associated with adulthood',
      'Provides the principal framework for adult development after adolescence, replacing role-transition accounts',
      'Allows identity exploration in the late teens and twenties where culture supports it',
    ],
    wrongFeedback: [
      contrast('Extended education can support exploration, but emerging adulthood is not a fixed age stage guaranteed by one institutional feature', 'Its expression depends on wider cultural and economic conditions and is not expected in identical form everywhere'),
      contrast('Puberty and legal majority mark important transitions, yet they do not define the proposed period\u2019s psychological and social boundaries', 'Arnett emphasized prolonged exploration under certain cultural conditions rather than a puberty-to-birthday interval'),
      contrast('Emerging adulthood is one framework for a particular context and age range, not a replacement for every account of roles, relationships, or life-span change', 'Other theories can address complementary processes before, during, and after this period'),
    ],
    editorialNote: 'The revised alternatives use schooling, legal status, and theory dominance errors instead of universal, every, and necessarily cues.',
    distractorDesign: ['education-defined-stage', 'puberty-to-legal-majority', 'framework-replacement'],
  }),
  'eppp-v2-lifespan-015': revision('eppp-v2-lifespan-015', {
    prompt: 'A child cannot solve a balance-scale problem independently but succeeds after a teacher asks strategic questions and then gradually withdraws help. What range does the performance illustrate?',
    choices: [
      'What a specific developing child can achieve independently after repeated practice with a familiar task',
      'What remains outside the learner\u2019s current reach even when instruction supplies prompts, models, and feedback',
      'The learner\u2019s current grade-equivalent standing on a standardized school achievement measure',
      'The gap between what a child can do alone and what they can do with targeted guidance',
    ],
    rationale: 'The zone of proximal development is the distance between independent performance and potential performance with effective guidance from a more knowledgeable other. The balance-scale success after strategic prompts demonstrates assisted potential, while withdrawal of help distinguishes scaffolding from a permanent score or an unreachable task.',
    wrongFeedback: [
      contrast('Independent mastery describes the learner\u2019s actual developmental level rather than the range revealed by successful assistance', 'The scenario\u2019s critical evidence is that strategic support changes performance on a task the child could not yet complete alone'),
      contrast('A task that remains unsuccessful despite suitable guidance lies beyond the demonstrated proximal range at that time', 'The child\u2019s improvement with prompts indicates reachable potential rather than current instructional inaccessibility'),
      contrast('A standardized grade equivalent summarizes comparison performance and does not represent the difference between independent and assisted problem solving', 'The teacher\u2019s contingent support, not a normative score, identifies the construct in the vignette'),
    ],
    editorialNote: 'The scaffolding-withdrawal scenario is distinct from the bank\u2019s definition duplicate and replaces bizarre perfectly and categorically never distractors.',
    distractorDesign: ['independent-level-substitution', 'beyond-reach-substitution', 'grade-equivalent-substitution'],
  }),
  'eppp-v2-lifespan-054': revision('eppp-v2-lifespan-054', {
    prompt: 'During the fourth prenatal week, imaging suggests that the embryonic structure destined to organize the central nervous system has not closed normally. Which developmental event is disrupted?',
    rationale: 'Neurulation occurs early in prenatal development as the neural plate folds and closes to form the neural tube, the precursor of the central nervous system. Failure of closure is associated with neural tube defects; the timing and structure distinguish it from hematopoiesis, cardiac development, and limb growth.',
    editorialNote: 'The clinical timing-and-structure vignette converts advanced recall into application and distinguishes the item from the bank\u2019s direct neurulation definition.',
    distractorDesign: ['hematopoiesis-timing-neighbor', 'cardiac-development-neighbor', 'limb-bud-development-neighbor'],
  }),
  'eppp-b001-research-2': revision('eppp-b001-research-2', {
    prompt: 'After assignment by chance, some participants cross over, miss sessions, or provide incomplete follow-up data. For the principal efficacy comparison, who remains in the target analysis population?',
    editorialNote: 'The trial-complication scenario removes the randomized echo and tests the population-and-assignment rule while retaining nuance about missing outcomes.',
    distractorDesign: ['completer-population', 'adherent-population', 'responder-population'],
  }),
  'eppp-b004-research-1': revision('eppp-b004-research-1', {
    prompt: 'Scores on a new measure correlate strongly with theoretically related variables, weakly with unrelated variables, and predict patterns specified by the underlying theory. What form of evidence is being assembled?',
    editorialNote: 'The nomological-pattern scenario removes the repeated construct cue and requires integration of convergent, discriminant, and predictive relationships.',
    distractorDesign: ['sampling-error-substitution', 'observer-agreement-substitution', 'statistical-power-substitution'],
  }),
  'eppp-b016-research-1': revision('eppp-b016-research-1', {
    prompt: 'In a medication trial, allocation codes are concealed from the people receiving capsules and from the clinicians who rate symptom change. Which description best captures the intended masking?',
    editorialNote: 'The role-specific masking scenario removes the treatment echo and distinguishes participant/assessor concealment from hypothesis, eligibility, and study-awareness errors.',
    distractorDesign: ['hypothesis-blinding', 'eligibility-blinding', 'research-awareness-blinding'],
  }),
  'eppp-v2-research-002': revision('eppp-v2-research-002', {
    prompt: 'A researcher has four independent groups and proposes six unadjusted pairwise t-tests, each at alpha .05, as the primary analysis. Why is an omnibus ANOVA preferred at the initial stage?',
    rationale: 'Conducting many unadjusted pairwise tests increases the probability of at least one false positive across the family. An omnibus ANOVA evaluates whether the group means differ while controlling the initial familywise Type I error, after which planned or adjusted comparisons can localize differences.',
    editorialNote: 'The four-group planning scenario distinguishes error control from the separate item about what an ANOVA tests and removes the stem/key multiple echo.',
    distractorDesign: ['uniform-power-advantage', 'two-group-only-misconception', 'mean-comparison-impossibility'],
  }),
  'eppp-b005-research-1': revision('eppp-b005-research-1', {
    prompt: 'For a covered human-subjects protocol involving identifiable biospecimens, what decision authority does an Institutional Review Board possess under the Common Rule?',
    choices: [
      'Approve, require modifications to, or disapprove the research',
      'Require the sponsor to make results publicly available as a condition of human-subjects approval',
      'Determine whether the hypotheses are scientifically correct before evaluating participant protections',
      'Assume operational control of data collection when the investigator has not yet resolved a consent concern',
    ],
    wrongFeedback: [
      contrast('Transparency and dissemination can matter, but the Common Rule does not make an IRB a guarantor of publication', 'Its covered-review authority centers on approval status and participant-protection criteria such as risk, selection, consent, privacy, and safeguards'),
      contrast('Scientific merit informs whether risks are reasonable, yet an IRB does not certify that a hypothesis is true before considering protections', 'Review evaluates the proposed design and ethical criteria rather than adjudicating future empirical findings'),
      contrast('An IRB can require changes or withhold approval, but it does not replace the investigator as the study\u2019s data-collection staff', 'Unresolved consent problems should be corrected through conditions, modification, suspension, or disapproval within governing authority'),
    ],
    editorialNote: 'The distractors now present publication, scientific-certification, and operational-control overextensions without guarantee, every, or all cueing.',
    distractorDesign: ['publication-enforcement-overreach', 'hypothesis-certification', 'irb-as-data-collector'],
  }),
  'eppp-b013-research-2': revision('eppp-b013-research-2', {
    choices: [
      'Establish that a predictor causes the outcome after measured covariates are entered into the equation',
      'Correct observed scores for measurement error when reliability estimates are supplied for each variable',
      'Model or predict an outcome from one or more predictors',
      'Evaluate mean equivalence across variables measured on different scales within the same participants',
    ],
    wrongFeedback: [
      contrast('Covariate adjustment can reduce selected alternative explanations but does not by itself establish temporal order, exchangeability, or causal identification', 'Causal interpretation requires a design and assumptions beyond fitting a regression equation'),
      contrast('Reliability information can inform measurement modeling, but ordinary regression does not automatically remove error from observed predictors or outcomes', 'Unmodeled error can still bias estimates and prediction'),
      contrast('Comparing means across differently scaled variables is not the ordinary target of regression and may be uninterpretable without transformation', 'Regression focuses on how an outcome relates to predictors rather than testing universal mean equality'),
    ],
    editorialNote: 'The alternatives are credible causal-adjustment, reliability-correction, and within-person mean misconceptions rather than obvious guarantees.',
    distractorDesign: ['covariate-adjustment-equals-causality', 'reliability-input-removes-error', 'cross-scale-mean-equivalence'],
  }),
  'eppp-v2-research-010': revision('eppp-v2-research-010', {
    choices: [
      'Estimate one experimental factor while treating measured participant characteristics as descriptive covariates',
      'Eliminate design confounds through crossing factors, reducing the need for randomization and control procedures',
      'Study multiple independent variables and their interactions',
      'Use separate participant samples for each factor so the effects can be interpreted independently',
    ],
    wrongFeedback: [
      contrast('A study with one manipulated factor and descriptive covariates is not factorial merely because several variables appear in the analysis', 'Factorial design crosses levels of two or more independent variables so both main and interaction effects can be examined'),
      contrast('Crossing factors reveals combinations and interactions but does not remove selection, history, measurement, or implementation confounds', 'Randomization and other controls remain important to the intended causal comparison'),
      contrast('Separate samples for each factor prevent observation of the crossed combinations needed to estimate an interaction within one design', 'Factorial structure examines how the effect of one variable changes across levels of another'),
    ],
    editorialNote: 'The options now distinguish covariate-rich, confound-free, and separate-experiment misconceptions without only or automatically cues.',
    distractorDesign: ['covariates-as-factors', 'factorial-design-removes-confounds', 'separate-samples-for-factors'],
  }),
  'eppp-v2-research-018': revision('eppp-v2-research-018', {
    choices: [
      'The average effect of each factor after combining its observations across the levels of the other factor',
      'The effect of one manipulated variable while a second variable is included as a statistical control',
      'Main effects and interactions',
      'Associations among measured variables after participants are classified into naturally occurring groups',
    ],
    wrongFeedback: [
      contrast('Averaging across the other factor describes a main-effect comparison but omits whether one factor\u2019s effect changes across levels of the other', 'A factorial analysis is informative because it can estimate both the averaged effects and their interaction'),
      contrast('Including a covariate does not create a factorial manipulation unless levels of the second independent variable are part of the crossed design', 'Statistical control and experimental interaction are different analytic structures'),
      contrast('Naturally occurring groups can appear in factorial or quasi-experimental work, but correlational association alone does not define the design\u2019s central capability', 'The question concerns estimation of main and conditional effects across crossed factors'),
    ],
    editorialNote: 'The distractors now contrast main-effect-only, covariate, and correlational structures while eliminating repeated only cues.',
    distractorDesign: ['marginal-main-effect-only', 'covariate-as-second-factor', 'correlational-grouping-substitution'],
  }),
  'eppp-v2-research-020': revision('eppp-v2-research-020', {
    prompt: 'A rehabilitation study randomizes participants to four programs and asks whether the average outcome differs somewhere among the programs before conducting adjusted follow-ups. Which analysis addresses that omnibus question?',
    choices: [
      'Jointly compare multiple group means',
      'Conduct a single contrast between the two programs with the largest observed sample means',
      'Estimate the strength of a linear relationship between program labels and individual outcome ranks',
      'Summarize interview themes within each program before deciding whether numerical outcomes should be compared',
    ],
    rationale: 'ANOVA uses an omnibus F test to evaluate whether population means differ across levels of a factor by comparing between-group and within-group variation. A significant result does not identify the differing pairs, so adjusted follow-up comparisons are needed for localization.',
    wrongFeedback: [
      contrast('Selecting the two largest observed means after looking at the data changes the planned question and introduces selection-related error', 'The initial omnibus analysis evaluates the four-program mean pattern before appropriately adjusted follow-ups'),
      contrast('Program assignment is categorical, and coding its labels as ranks imposes an arbitrary quantitative order that is not the research question', 'ANOVA directly compares outcome means across the program levels'),
      contrast('Qualitative themes can enrich interpretation but do not answer the prespecified numerical omnibus question about average outcomes', 'The quantitative comparison should be analyzed with the planned model rather than made contingent on thematic review'),
    ],
    editorialNote: 'The four-program applied scenario differs from the familywise-error item and replaces two-group and qualitative-only distractors with credible analytic detours.',
    distractorDesign: ['post-hoc-largest-means-contrast', 'arbitrary-ordinal-coding', 'qualitative-gate-before-quantitative-test'],
  }),
  'eppp-b012-research-2': revision('eppp-b012-research-2', {
    prompt: 'An omnibus F test comparing three supervision formats is nonsignificant. Which null claim has not been rejected?',
    rationale: 'A one-way ANOVA evaluates the null hypothesis that the population means are equal across the levels of one factor. A nonsignificant omnibus result is insufficient evidence that the means differ; it neither proves identical observations, establishes correlation, nor directly tests population normality.',
    editorialNote: 'The nonsignificant-result interpretation distinguishes this item from other ANOVA definitions and asks what the omnibus null actually claims.',
    distractorDesign: ['observation-level-variance-equality', 'perfect-correlation-null', 'normality-as-omnibus-null'],
  }),
  'eppp-pilot-research-1': revision('eppp-pilot-research-1', {
    prompt: 'In repeated studies of an intervention that truly has no effect, one sample yields p < .05 and the investigator declares an effect. Which event occurred in that sample?',
    rationale: 'Because the null hypothesis is true in the scenario, declaring an effect rejects a true null hypothesis and constitutes a Type I error, or false positive. Failing to detect a real effect would instead be a Type II error; sample size affects probabilities but does not define the realized error.',
    editorialNote: 'The repeated-study false-positive scenario separates this item from several direct Type I definitions by requiring the truth state and decision to be integrated.',
    distractorDesign: ['type-ii-reversal', 'correct-alternative-acceptance', 'sample-size-as-error-definition'],
  }),
  'eppp-v2-research-001': revision('eppp-v2-research-001', {
    prompt: 'A district compares a new curriculum with usual instruction by assigning intact schools according to administrator choice rather than allocating schools by chance. What feature makes causal inference weaker than in a true experiment?',
    rationale: 'The study lacks random assignment to conditions, so preexisting differences between schools can be confounded with curriculum effects. A comparison group and measured outcomes can still be present, and quasi-experiments are useful when random allocation is impractical; design and analysis must address selection threats.',
    editorialNote: 'The intact-school scenario distinguishes quasi-experimental assignment from the neighboring direct definition and makes the causal limitation concrete.',
    distractorDesign: ['control-group-absence-confusion', 'outcome-measurement-impossibility', 'psychology-use-prohibition'],
  }),
  'eppp-v2-research-023': revision('eppp-v2-research-023', {
    prompt: 'A clinic records treatment completion as yes or no and referral source as primary care, school, or self-referral. Which data pattern is suited to a test of independence?',
    rationale: 'Both variables are categorical, so a chi-square test of independence can compare observed cell frequencies with those expected if completion and referral source were unrelated. Means, continuous-variable correlations, and regression coefficients answer different questions and require different data structures.',
    editorialNote: 'The contingency-table vignette distinguishes this item from a direct chi-square definition and asks learners to recognize the two categorical variables in practice.',
    distractorDesign: ['continuous-means-substitution', 'continuous-correlation-substitution', 'coefficient-testing-substitution'],
  }),
  'eppp-v2-research-029': revision('eppp-v2-research-029', {
    prompt: 'Before collecting data, a researcher increases sample size so a test is more likely to detect the smallest effect considered meaningful when that effect truly exists. Which probability is the researcher trying to increase?',
    rationale: 'Statistical power is the probability of rejecting the null hypothesis when it is false. Larger samples can increase power for a specified effect and alpha, although actual power also depends on variability, design, and model assumptions; it is not estimation accuracy, allocation proportion, or a cap on detectable effects.',
    editorialNote: 'The prospective design scenario separates power from repeated direct definitions and connects the probability to a concrete sample-size decision.',
    distractorDesign: ['estimate-equals-population-probability', 'allocation-proportion-confusion', 'maximum-detectable-effect-confusion'],
  }),
};

const revisions = Object.freeze(Object.fromEntries(Object.entries(authored).map(([id, value]) => [id, value])));

invariant(Object.keys(revisions).length === 93, `expected exactly 93 revisions, found ${Object.keys(revisions).length}`);
invariant(new Set(Object.keys(revisions)).size === 93, 'revision IDs must be unique');
invariant(
  [...Object.keys(revisions)].sort().join('\n') === [...ASSIGNED_IDS].sort().join('\n'),
  'revision IDs must equal the professional, lifespan, and research assignment',
);

module.exports = Object.freeze({
  campaignId: CAMPAIGN_ID,
  shardId: SHARD_ID,
  reviewedAt: REVIEWED_AT,
  assignedDomains: ASSIGNED_DOMAINS,
  assignedIds: ASSIGNED_IDS,
  revisions,
});
