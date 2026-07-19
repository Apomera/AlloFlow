'use strict';

const q = (skillId, prompt, correct, distractors, rationale, difficulty, cognitiveLevel) => ({
  skillId,
  prompt,
  correct,
  distractors,
  rationale,
  difficulty,
  cognitiveLevel,
});

const skill = 'professional-ethical-evidence-practice';

module.exports = [
  q(
    skill,
    'Before an optional vestibular procedure, an adult asks what discomfort may occur and whether testing can stop once it begins. Which response best supports valid informed consent?',
    'Explain the purpose, reasonably expected benefits and risks, alternatives, limits, and right to pause or decline, then confirm understanding and voluntary agreement.',
    [
      ['Obtain the signed form before discussion and reserve detailed risk information for a later visit unless the patient specifically requests it.', 'A signature without timely, understandable disclosure and a voluntary decision does not establish an adequate consent process.'],
      ['Describe the expected benefit and likely sensations, but omit alternatives and the option to decline so the scheduled procedure remains efficient.', 'Withholding material risks or alternatives prevents the person from weighing the procedure in an informed manner.'],
      ['Treat the appointment request as authorization for this procedure, then document consent after testing if the adult completes the task.', 'Scheduling a visit does not create blanket consent for procedures whose nature, risks, or alternatives have not been discussed.'],
    ],
    'Informed consent is an accessible, ongoing communication process rather than a form alone. The clinician should disclose material information, invite questions, assess understanding and decision-making needs, avoid coercion, document the discussion, and honor withdrawal subject to emergency and jurisdictional rules.',
    'application',
    'analysis',
  ),
  q(
    skill,
    'A university clinic receives a request for a student’s audiology report from the student’s school disability office. What should the audiologist establish before transmitting the record?',
    'Identify who holds the record, which privacy rules apply, the student’s authorization or other lawful basis, the requested scope, and a secure delivery method.',
    [
      ['Send the complete clinic chart because educational personnel automatically have unrestricted access to health records.', 'A school role does not by itself authorize unrestricted disclosure of a clinic record or information beyond the supported purpose.'],
      ['Refuse every disclosure because FERPA and HIPAA prohibit records from moving between educational and health settings.', 'Privacy laws permit appropriately authorized or otherwise lawful disclosures; they do not impose a universal ban on information exchange.'],
      ['Ask the requesting employee to select whichever privacy law produces the fastest transfer.', 'The record holder must determine applicable obligations and authority rather than delegate the legal classification to the requester.'],
    ],
    'Privacy analysis depends on the setting, record holder, law, policy, consent, and purpose. The audiologist should verify identity and authority, share only the supported information, use secure channels, document the disclosure, and consult current organizational or legal guidance when FERPA, HIPAA, or state requirements are uncertain.',
    'advanced',
    'analysis',
  ),
  q(
    skill,
    'A clinic purchases video head-impulse equipment, but the assigned audiologist has observed only one demonstration and has never interpreted a recording. What is the most ethical next step?',
    'Obtain documented training and supervised competency or refer the testing until the audiologist can perform and interpret it safely.',
    [
      ['Begin independent testing because automated software removes the need to recognize artifact or clinical limitations.', 'Automated metrics can contain calibration, goggle, movement, and interpretation errors that still require qualified professional judgment.'],
      ['Delegate interpretation to an assistant whose training is also limited to the equipment demonstration.', 'Delegation cannot create competence that neither the supervising audiologist nor the assistant has demonstrated.'],
      ['Use the first patient’s result as the competency examination without disclosing the clinician’s limited preparation.', 'Undisclosed practice beyond current competence exposes the patient to invalid conclusions and does not constitute appropriate supervision.'],
    ],
    'Professional scope does not mean automatic personal competence for every procedure. Current education, supervised practice, artifact recognition, interpretation skill, emergency readiness, and jurisdictional requirements must support the service; otherwise the audiologist should obtain qualified support or arrange referral.',
    'advanced',
    'analysis',
  ),
  q(
    skill,
    'An audiology assistant completes a delegated screening task and obtains an unexpected refer result. Which supervisory plan is most appropriate?',
    'Use the escalation protocol; the supervising audiologist reviews quality, communicates results, and remains accountable.',
    [
      ['Permit the assistant to diagnose the type of loss and independently prescribe amplification from the screening result.', 'Screening does not establish diagnosis, and diagnostic interpretation and device prescription are not created by task delegation.'],
      ['Treat the assistant as independently responsible for interpreting and communicating the refer result after delegation.', 'Delegation does not transfer the audiologist’s accountability for quality review, communication, and follow-up.'],
      ['Repeat screening indefinitely without notifying the supervisor until a passing response is obtained.', 'Repeating until a pass can conceal a meaningful referral and bypasses the approved supervision and tracking process.'],
    ],
    'Delegation must match the assistant’s verified competence, authorized role, and level of supervision. A result outside the expected pathway should trigger the established escalation process; the audiologist reviews validity, protects screening limits, communicates appropriately, and ensures documented referral or follow-up.',
    'application',
    'analysis',
  ),
  q(
    skill,
    'An audiologist licensed in one state plans a teleaudiology follow-up while the client is temporarily located in another state. What must be resolved before the session?',
    'Verify authority where the client will be located and confirm consent, privacy, technology validity, accessibility, local support, and emergency procedures.',
    [
      ['Rely only on the clinician’s home-state license because remote services occur wherever the computer is registered.', 'Telepractice authority commonly turns on the client’s physical location, and current jurisdiction-specific requirements must be checked.'],
      ['Proceed if the video connection is clear because technical quality replaces licensure and emergency planning.', 'A stable connection does not establish legal authority, clinical validity, privacy protection, or a safe response to urgent needs.'],
      ['Ask the client to select a different state in the software so the jurisdiction question no longer appears.', 'Changing a software field does not alter physical location or the professional obligations attached to the service.'],
    ],
    'Teleaudiology remains audiologic practice. Before providing it, the clinician should confirm current jurisdictional authority, identity and consent, secure accessible technology, procedure validity, contingency and local-referral arrangements, emergency response, documentation, and whether remote care can answer the clinical question.',
    'advanced',
    'analysis',
  ),
  q(
    skill,
    'Daily listening checks reveal intermittent distortion from an insert earphone even though its annual calibration date is current. How should the clinic respond?',
    'Remove the transducer from clinical use, document and investigate the fault, and restore verified performance before collecting patient data.',
    [
      ['Continue testing until the next annual calibration because a current sticker overrides daily quality-control findings.', 'Scheduled calibration does not invalidate evidence that equipment performance has changed between calibration dates.'],
      ['Average results from the distorted earphone with results from another transducer and label the average calibrated.', 'Combining data from a suspect transducer does not repair the equipment or establish valid measurement conditions.'],
      ['Increase presentation levels until the distortion is no longer noticed during the listening check.', 'Higher levels may alter or worsen the problem and can expose patients to invalid or excessive signals.'],
    ],
    'Calibration is one layer of measurement quality. Biological or listening checks, visual inspection, cleaning, electroacoustic checks, infection-control procedures, and fault documentation can reveal interim problems; suspect equipment should be quarantined until qualified service and verification support safe, valid reuse.',
    'application',
    'analysis',
  ),
  q(
    skill,
    'Two reasonable tinnitus-management approaches are available, but the research evidence and the client’s priorities differ across outcomes. How should the audiologist choose between them?',
    'Integrate critical appraisal of the evidence with clinical data and expertise, then use shared decision making to align benefits, burdens, uncertainty, and client goals.',
    [
      ['Select the newest marketed product because recency is a sufficient substitute for comparative evidence.', 'A product’s release date or marketing does not establish effectiveness, applicability, safety, or fit with the client’s priorities.'],
      ['Follow the clinician’s customary approach without discussing alternatives or measuring the outcomes important to the client.', 'Habit alone omits research appraisal, individual evidence, informed choice, and outcome evaluation.'],
      ['Use the group-average research result as a guaranteed prediction for this individual and suppress uncertainty.', 'Population evidence informs but does not guarantee an individual response, so uncertainty and preferences remain part of the decision.'],
    ],
    'Evidence-based practice combines relevant research, clinical expertise and measurements, and the person’s values, culture, circumstances, and goals. Transparent discussion of evidence quality, expected effects, uncertainty, feasibility, and meaningful outcomes supports an informed choice and planned reassessment.',
    'advanced',
    'analysis',
  ),
  q(
    skill,
    'A clinician is asked to copy yesterday’s hearing-aid note and bill the same service code even though today’s visit addressed a different problem. What is the appropriate response?',
    'Document the service actually performed, findings, decisions, time and code requirements accurately, and correct any unsupported billing before submission.',
    [
      ['Reuse the prior note unchanged because continuity is more important than whether the record describes today’s work.', 'A cloned note can misstate the encounter, weaken continuity, and create ethical, legal, and reimbursement risk.'],
      ['Choose the highest-paying code and add standard language later if the payer requests evidence.', 'Payment level cannot justify a code that is not supported by the documented service and applicable rules.'],
      ['Omit an unsuccessful measure so the chart contains only findings that support reimbursement.', 'Records should accurately represent relevant attempts, limitations, results, decisions, and follow-up rather than selectively conceal evidence.'],
    ],
    'Clinical records and claims must truthfully represent the encounter and satisfy current payer, legal, and organizational requirements. Accurate individualized documentation supports care continuity and accountability; suspected errors should be corrected through the authorized process rather than copied, upcoded, or concealed.',
    'application',
    'analysis',
  ),
  q(
    skill,
    'An audiologist receives a substantial manufacturer incentive for recommending one device line when several products could meet a client’s needs. What should the audiologist do?',
    'Disclose the relevant financial relationship, present reasonable alternatives objectively, and base the recommendation on evidence and the client’s informed priorities.',
    [
      ['Keep the incentive private because product availability makes financial interests irrelevant to informed choice.', 'A material financial relationship can influence or appear to influence judgment and should not be hidden from the client.'],
      ['Recommend the incentivized model automatically and describe competing options only after the sale is final.', 'Automatic selection based on personal gain conflicts with objective, person-centered evaluation and meaningful informed choice.'],
      ['Use the manufacturer representative’s product comparison as the sole basis for selecting among otherwise suitable devices.', 'Manufacturer information can be considered, but it cannot replace independent appraisal, disclosure, and person-centered professional judgment.'],
    ],
    'Conflicts should be managed transparently so personal benefit does not override professional judgment. Disclosure, balanced alternatives, evidence-based matching, accurate cost information, freedom from pressure, documentation, and compliance with ethics and organizational policy protect the client’s autonomy.',
    'advanced',
    'analysis',
  ),
  q(
    skill,
    'During a routine evaluation, a client reports hearing that dropped suddenly in one ear yesterday and now has marked unilateral tinnitus. What is the audiologist’s immediate priority?',
    'Recognize the time-sensitive red flag, arrange urgent medical evaluation under current protocol, and document and communicate findings without delaying for a routine battery.',
    [
      ['Complete every optional test and schedule ordinary follow-up several months later before discussing medical referral.', 'A time-sensitive hearing change should not be delayed by completion of nonessential testing or routine scheduling.'],
      ['Provide medication advice independently because an audiogram is sufficient to determine the medical treatment.', 'Medication selection and treatment require authorized medical evaluation; the audiologist should recognize, document, and refer.'],
      ['Reassure the client that unilateral tinnitus establishes a benign chronic condition and needs no prompt assessment.', 'The combined sudden change and unilateral tinnitus warrant timely evaluation and do not establish a benign cause.'],
    ],
    'Sudden unilateral sensorineural change is a time-sensitive medical concern. The audiologist should stop or streamline routine procedures as appropriate, obtain valid essential evidence without causing delay, activate the current referral pathway, explain urgency, document communication, and support follow-through.',
    'advanced',
    'analysis',
  ),
];
