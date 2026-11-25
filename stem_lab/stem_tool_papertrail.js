// ═══════════════════════════════════════════════════════════════
// stem_tool_papertrail.js — PaperTrail: official documents, decoded
//
// Teaches a transition-age skill that decides real outcomes and is
// almost never taught directly: reading and completing the official
// documents adult life runs on. Job applications, tax withholding,
// leases, medical intake, permits — and the one most students meet
// first without preparation, their own IEP meeting invitation.
//
// WHY IT LOOKS LIKE THIS
//   1. ★★ NEVER REAL DATA. Every practice field is pre-loaded with a
//      FICTIONAL persona (Sam Rivera). The tool teaches, out loud and
//      early, that you do not type your real Social Security number,
//      bank number, or address into a practice tool — or into any form
//      you have not verified. A practice tool that trains students to
//      type real PII into unknown boxes would be teaching the exact
//      habit that gets them scammed.
//   2. Field-by-field DECODING first. Most form failure is not bad
//      handwriting, it is not knowing what a box is asking. Each field
//      carries a plain-language "what they are actually asking".
//   3. DANGER FIELDS are marked. Some boxes cost you something if you
//      fill them in wrongly or at all: SSN on an unverified form, a
//      signature (which is a contract), an initialed arbitration
//      clause, a blank left for someone else to fill in later.
//   4. ASKING FOR HELP is a taught skill, not a fallback. Scripts for
//      "I need a minute to read this" and "can I take this home?" are
//      part of the curriculum, because the pressure to sign now is
//      itself the risk.
//
//   Complements Life Skills Lab (which has a 3-decision Form Navigator
//   mini-game and a contracts reader) rather than duplicating it: this
//   is the full field-level trainer. Pairs with Parenting Lab M9 and
//   the Education Law Navigator on the IEP-invitation document.
//
// Registered tool ID: "paperTrail"
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('paperTrail'))) {

(function() {
  'use strict';

  // ── The fictional practice identity. Everything a student types over
  // is already fake. Deliberately unmistakable: an obviously invented
  // SSN pattern and a 555 phone number.
  var PERSONA = {
    name: 'Sam Rivera',
    dob: '04/12/2008',
    address: '18 Birch Lane, Apt 2, Anytown, ME 04000',
    phone: '(207) 555-0143',
    email: 'sam.rivera.practice@example.com',
    ssn: '000-00-0000',
    school: 'Anytown High School'
  };

  var DOCS = [
    {
      id: 'jobapp', icon: '💼', title: 'Job application',
      blurb: 'The first document most people meet. Half of it is testing whether you can follow instructions.',
      fields: [
        { id: 'j1', label: 'Position applied for', asking: 'Which specific job. "Anything" reads as "I did not read the posting" — name the job on the ad.', answer: PERSONA.name ? 'Grocery clerk (posted 8/2)' : '', kind: 'normal' },
        { id: 'j2', label: 'Legal name', asking: 'Your name exactly as it appears on your ID and Social Security card. Nicknames go in the "preferred name" box if there is one.', answer: 'Sam Rivera', kind: 'normal' },
        { id: 'j3', label: 'Are you legally authorized to work in the United States?', asking: 'A yes/no question about work authorization. It is NOT asking your citizenship status or where you were born — an employer may not ask that here.', answer: 'Yes', kind: 'watch' },
        { id: 'j4', label: 'Social Security Number', asking: 'Employers do need this eventually for payroll — but usually AFTER an offer, on tax paperwork. On a first application, it is reasonable to write "available upon offer".', answer: 'available upon offer', kind: 'danger' },
        { id: 'j5', label: 'Availability', asking: 'The hours you can actually work every week, not the hours you wish you could. Over-promising here is the most common reason a first job ends badly.', answer: 'Mon-Thu after 4pm; Sat all day', kind: 'normal' },
        { id: 'j6', label: 'May we contact your current employer?', asking: 'Whether they may call your boss — who may not know you are job-hunting. "No" is a normal answer and does not count against you.', answer: 'No', kind: 'watch' },
        { id: 'j7', label: 'Signature', asking: 'You are certifying everything above is true. A signature is a promise, and knowingly false statements are grounds for firing later.', answer: 'Sam Rivera', kind: 'danger' }
      ]
    },
    {
      id: 'w4', icon: '🧾', title: 'W-4 tax withholding',
      blurb: 'Not a bill. It tells your employer how much tax to hold back from each paycheck.',
      fields: [
        { id: 'w1', label: 'Step 1(a): Name and address', asking: 'Matches your Social Security card. A mismatch is the most common reason a first paycheck is delayed.', answer: 'Sam Rivera, 18 Birch Lane, Apt 2, Anytown, ME 04000', kind: 'normal' },
        { id: 'w2', label: 'Step 1(b): Social Security Number', asking: 'Here it IS required and appropriate — this is your employer\'s official tax form after you were hired, not a website. Context is what makes an SSN request normal or not.', answer: PERSONA.ssn, kind: 'watch' },
        { id: 'w3', label: 'Step 1(c): Filing status', asking: 'Usually "Single or married filing separately" for a first job. This changes how much is withheld, not how much tax you ultimately owe.', answer: 'Single or married filing separately', kind: 'normal' },
        { id: 'w4f', label: 'Step 2: Multiple jobs', asking: 'Only if you work more than one job at once. Skipping it when it applies is why some people owe money in April.', answer: 'Not applicable (one job)', kind: 'normal' },
        { id: 'w5', label: 'Step 5: Signature', asking: 'Under penalty of perjury. Fill in the form BEFORE signing — never sign a blank form for someone else to complete.', answer: 'Sam Rivera', kind: 'danger' }
      ]
    },
    {
      id: 'lease', icon: '🔑', title: 'Apartment lease',
      blurb: 'The longest thing most people sign before they are 25, and the one most often signed unread.',
      fields: [
        { id: 'l1', label: 'Term (start and end date)', asking: 'Exactly how long you are committed. "Month to month" and "12-month" are very different promises.', answer: '09/01 through 08/31 (12 months)', kind: 'normal' },
        { id: 'l2', label: 'Rent amount and due date', asking: 'The number AND the day. Also look for the late fee and its grace period, which are usually a few lines below.', answer: '$950, due the 1st', kind: 'normal' },
        { id: 'l3', label: 'Security deposit', asking: 'What you pay up front and, crucially, the conditions for getting it back. State law usually limits both the amount and the return deadline.', answer: '$950, returned within 30 days', kind: 'watch' },
        { id: 'l4', label: 'Who is responsible for utilities?', asking: 'Heat in particular. "Tenant pays heat" can be a larger monthly number than the rent difference that made this apartment look cheaper.', answer: 'Tenant pays heat and electric', kind: 'watch' },
        { id: 'l5', label: 'Blank lines in the document', asking: 'Never sign a lease with blanks. Anything empty can be filled in after you sign. Draw a line through unused blanks or write N/A.', answer: 'N/A written through all blanks', kind: 'danger' },
        { id: 'l6', label: 'Signature', asking: 'You are now responsible for the entire term, not just the months you live there. If you cannot explain a clause out loud, do not sign yet.', answer: 'Sam Rivera', kind: 'danger' }
      ]
    },
    {
      id: 'medical', icon: '🏥', title: 'Medical intake',
      blurb: 'Where honesty matters more than looking healthy — this one is protected information.',
      fields: [
        { id: 'm1', label: 'Reason for visit', asking: 'In your own words. "Stomach pain for 3 days, worse after eating" is more useful to a clinician than "sick".', answer: 'Headaches 3x/week for a month', kind: 'normal' },
        { id: 'm2', label: 'Current medications', asking: 'Everything, including things you might not count: birth control, inhalers, supplements, vitamins. Interactions are the reason they ask.', answer: 'None', kind: 'watch' },
        { id: 'm3', label: 'Allergies', asking: 'Medication allergies especially. This box exists to keep you from being given something dangerous.', answer: 'Penicillin', kind: 'watch' },
        { id: 'm4', label: 'Insurance / policy number', asking: 'From your insurance card. If you do not have one, ask about sliding-scale fees rather than skipping care.', answer: 'From card — ask if unsure', kind: 'normal' },
        { id: 'm5', label: 'Consent to release information', asking: 'WHO may be told about your visit. Read this one: it decides whether results go to a parent, a school, or nobody. At 18 this becomes fully your decision.', answer: 'Read before initialing', kind: 'danger' }
      ]
    },
    {
      id: 'permit', icon: '🚗', title: 'Driver permit application',
      blurb: 'A government form: the identity documents are the hard part, not the questions.',
      fields: [
        { id: 'p1', label: 'Proof of identity', asking: 'Usually a birth certificate or passport — the ORIGINAL or a certified copy. A photocopy is normally refused, which is why people get sent home.', answer: 'Certified birth certificate', kind: 'watch' },
        { id: 'p2', label: 'Proof of residency', asking: 'Two documents with your name and address, often a utility bill and a bank letter. Students without bills in their name can usually use a school residency letter — ask first.', answer: 'School residency letter + parent utility bill', kind: 'watch' },
        { id: 'p3', label: 'Parent/guardian signature (under 18)', asking: 'Required if you are a minor, and the adult usually must be present with their own ID. Check before making the trip.', answer: 'Guardian present with ID', kind: 'normal' },
        { id: 'p4', label: 'Medical/vision disclosure', asking: 'Honest answers here protect you. A condition disclosed is usually accommodated; a condition hidden can void the license later.', answer: 'Corrective lenses: yes', kind: 'watch' },
        { id: 'p5', label: 'Certification signature', asking: 'You are swearing the information is true to a government agency. Different weight than a club form.', answer: 'Sam Rivera', kind: 'danger' }
      ]
    },
    {
      id: 'iep', icon: '🏫', title: 'Your IEP meeting invitation',
      blurb: 'If you have an IEP, this arrives before every meeting — and by your teens the meeting is partly yours to run.',
      fields: [
        { id: 'i1', label: 'Date, time, and place', asking: 'Check it against your own schedule. You may ask for a different time; the team is required to try to find a mutually agreeable one.', answer: 'Note it and say if it does not work', kind: 'normal' },
        { id: 'i2', label: 'Purpose of the meeting', asking: 'Tells you what will be decided — annual review, reevaluation, or transition planning. Knowing which one tells you what to prepare.', answer: 'Annual review + transition planning', kind: 'watch' },
        { id: 'i3', label: 'Who is invited', asking: 'The list of people who will be in the room. If transition is on the agenda, YOU should be on this list — it is your plan for life after school.', answer: 'Student invited: yes', kind: 'watch' },
        { id: 'i4', label: 'You may bring someone', asking: 'You and your family may bring anyone with knowledge or expertise about you — a relative, an advocate, a coach. You do not need permission.', answer: 'Bringing: aunt', kind: 'normal' },
        { id: 'i5', label: 'What do you want to say?', asking: 'The part no form asks for. Your goals, what helps, what does not. Rehearsing two sentences beforehand changes these meetings more than anything else on this page.', answer: 'I want to work with animals after graduation', kind: 'watch' }
      ]
    }
  ];

  // Judgment scenarios: pressure, not paperwork. The right answer is
  // usually "slow down", which is exactly what pressure is designed to prevent.
  // Authored ok:true positions are evenly balanced across indices 0, 1, 2 (3 each)
  // and deterministically shuffled per attempt by PAPERTRAIL_ENGINE.shuffleScenarioChoices.
  var SCENARIOS = [
    { id: 's1', text: 'A manager hands you a job offer packet and says: "Just sign the last page, the rest is standard."',
      options: [
        { id: 'a', text: 'Sign it — he says it is standard.', ok: false, whyNot: '"Standard" does not mean harmless — pay rates, mandatory arbitration, or schedule rules often hide inside standard packets. Taking three minutes to read protects you before your signature locks it in.' },
        { id: 'b', text: '"Can I take a few minutes to read it? I want to understand what I am agreeing to."', ok: true },
        { id: 'c', text: 'Sign it and read it at home later.', ok: false, whyNot: 'Reading after signing flips the order that protects you. Once your signature is on paper, discovering a surprise clause at home usually means you already agreed to it.' }
      ],
      why: 'Reading time is always a reasonable ask, and an employer who refuses it has told you something important. Signing first and reading later reverses the only order that protects you: once signed, your leverage is gone.' },
    { id: 's2', text: 'An online job listing asks for your Social Security number and a photo of your ID before any interview.',
      options: [
        { id: 'a', text: 'Provide them — employers need this eventually.', ok: false, whyNot: 'Timing decides whether an SSN request is normal. Employers need an SSN AFTER hiring on official tax paperwork, not to screen applicants. Sending both SSN and photo ID early hands a scammer a complete identity-theft kit.' },
        { id: 'b', text: 'Send only the SSN, not the ID.', ok: false, whyNot: 'Your SSN alone is enough to open fraudulent credit accounts or file fake tax returns. Sending half of a suspicious pre-interview request still exposes your most sensitive number.' },
        { id: 'c', text: 'Ask why it is needed now and whether it can wait until after an offer.', ok: true }
      ],
      why: 'Legitimate employers collect an SSN on tax paperwork AFTER hiring, not to screen applicants. "Before any interview" is a classic identity-theft pattern. Asking why costs you nothing and a real employer will have an answer.' },
    { id: 's3', text: 'A landlord will not give you a copy of the lease until after you sign it.',
      options: [
        { id: 'a', text: 'Photograph every page before signing and ask for your copy in writing.', ok: true },
        { id: 'b', text: 'Sign — you can request a copy afterward.', ok: false, whyNot: 'Once a landlord holds the only signed copy, you have zero proof of what the page actually said if a fee, deposit condition, or repair rule gets disputed later.' },
        { id: 'c', text: 'Sign and trust the verbal terms you discussed.', ok: false, whyNot: 'Most leases include an "entire agreement" clause saying written terms override spoken promises. Verbal assurances are nearly impossible to enforce against conflicting fine print.' }
      ],
      why: 'You are entitled to know what you signed. Verbal promises are nearly impossible to enforce against a written document that says otherwise, and "I will send it later" too often does not happen.' },
    { id: 's4', text: 'A form has a blank line above the signature that nobody filled in.',
      options: [
        { id: 'a', text: 'Sign — the blank is probably nothing.', ok: false, whyNot: 'An empty line above your signature is an open invitation. Anything added afterward — extra fees, dates, or obligations — appears legally as something you agreed to.' },
        { id: 'b', text: 'Ask what belongs there, then fill it or strike it through before signing.', ok: true },
        { id: 'c', text: 'Fill in something reasonable yourself.', ok: false, whyNot: 'Guessing on an official form can lock in inaccurate or binding terms you did not intend. Always ask what belongs there first, then fill the verified answer or draw a line / write N/A.' }
      ],
      why: 'A blank above a signature can be completed after you sign, and then it is part of what you agreed to. Striking through unused blanks takes five seconds and closes the hole.' },
    { id: 's5', text: 'At your IEP meeting the team hands you a document and asks you to sign at the end.',
      options: [
        { id: 'a', text: 'Sign — everyone is waiting.', ok: false, whyNot: 'Social pressure from a full room is not a legal deadline. You and your family are equal members of the IEP team and have every right to read the full draft before signing.' },
        { id: 'b', text: 'Sign but say you disagree out loud.', ok: false, whyNot: 'Spoken disagreement disappears once the meeting ends, while your signature remains in the official record. If you disagree or want edits, put that in writing before signing.' },
        { id: 'c', text: '"I would like to take this home and read it before I sign."', ok: true }
      ],
      why: 'You may take time to read, and asking is normal — the room waiting is social pressure, not a rule. Saying you disagree while signing anyway leaves a signature on the record and your objection nowhere. If you disagree, that belongs in writing.' },
    { id: 's6', text: 'Your 12-month apartment lease says it automatically renews for another full year unless you send written notice 60 days before the end date. You plan to move out in 70 days.',
      options: [
        { id: 'a', text: 'Send written non-renewal notice right now (email plus dated letter) and save proof that you sent it.', ok: true },
        { id: 'b', text: 'Mention it out loud to the landlord next month when you pay rent.', ok: false, whyNot: 'Verbal notice rarely satisfies a written-notice clause, and waiting until next month misses the 60-day deadline. Without dated written proof, the lease can legally lock you into another full year.' },
        { id: 'c', text: 'Wait until the final week — you only agreed to 12 months.', ok: false, whyNot: 'An auto-renewal clause IS part of what you agreed to when signing. Missing the 60-day notice window can leave you owing months of extra rent or losing your security deposit.' }
      ],
      why: 'Notice deadlines in leases are strict calendars, not casual reminders. Sending dated written notice BEFORE the cutoff and keeping a copy is how you keep control of when your lease actually ends.' },
    { id: 's7', text: 'You just turned 18 and check in at a clinic. The clipboard has a blank "Release Medical Records To" line, and the desk worker says, "Just sign at the bottom so we can call you back faster."',
      options: [
        { id: 'a', text: 'Sign the bottom quickly so you do not lose your appointment slot.', ok: false, whyNot: 'Signing an unread or blank HIPAA release lets the clinic share private health details without you knowing who is authorized. Taking 30 seconds to read it will not cost you your visit.' },
        { id: 'b', text: 'Read the release section, list only the people you choose (or write "None"), and strike through empty lines before signing.', ok: true },
        { id: 'c', text: 'Write every family member on the release line just in case the clinic needs an emergency contact.', ok: false, whyNot: 'Emergency contact and HIPAA medical-record release are different sections. Listing everyone on a release authorizes the clinic to share private visit notes and test results with all of them.' }
      ],
      why: 'At age 18, your medical privacy belongs to you under HIPAA. You decide who—if anyone—receives your health information, and striking through blank release lines keeps that choice yours.' },
    { id: 's8', text: 'You receive a text from an unknown number claiming to be "HR Payroll" for a store where you applied last week, asking you to tap a link and enter your SSN and bank routing number for a "W-4 fast track" before your interview.',
      options: [
        { id: 'a', text: 'Fill out the link right away so they do not give the job to someone else.', ok: false, whyNot: 'Scammers weaponize urgency and fake "HR fast track" links to steal SSNs and bank details. Legitimate W-4 and direct-deposit forms happen AFTER a verified job offer, never by surprise text before an interview.' },
        { id: 'b', text: 'Enter only your bank routing number now and wait to share your SSN in person.', ok: false, whyNot: 'A bank routing and account number alone can be used for unauthorized withdrawals and fraud. Never type ANY financial or identity data into an unverified text link.' },
        { id: 'c', text: 'Do not tap the link — contact the store directly using its official phone number or career portal to verify.', ok: true }
      ],
      why: 'Context and verification protect you from payroll phishing. Real W-4 onboarding happens through verified HR channels AFTER you are hired—and checking through an official number you look up yourself always beats clicking a surprise link.' },
    { id: 's9', text: 'A new job onboarding packet includes a separate sheet titled "Mandatory Arbitration & Jury Waiver" with a small note: "To opt out, email HR within 30 days."',
      options: [
        { id: 'a', text: 'Ask for a copy to review with a trusted adult or advocate so you understand the rights you are waiving and how the 30-day opt-out works.', ok: true },
        { id: 'b', text: 'Initial it without reading — every job forces arbitration anyway.', ok: false, whyNot: 'The 30-day opt-out clause proves it is NOT mandatory without choice. Initialing unread can give up your right to bring wage theft or workplace rights claims in court.' },
        { id: 'c', text: 'Cross out the page silently without telling HR and slip it back into the folder.', ok: false, whyNot: 'Silently crossing out a clause rarely counts as following a written opt-out rule, and HR may reject the packet or treat the opt-out as invalid. Ask openly and follow the documented opt-out method if you choose to opt out.' }
      ],
      why: 'Arbitration clauses and short opt-out windows are easy to miss in onboarding stacks. Taking a copy home to understand your options—and keeping written proof if you opt out—protects your legal rights.' }
  ];

  // ─────────────────────────────────────────────────────────
  // Work rights & disclosure — the transition cliff.
  //
  // IDEA ends at graduation and ADA Title I replaces it, but the two work
  // nothing alike: no team identifies you, no plan follows you, and nothing
  // happens unless you ask. Every citation below is to 29 CFR 1630, which the
  // Law Navigator carries verbatim — this module teaches the shape, the
  // Navigator holds the text.
  //
  // Aaron's scientific-integrity rule applies with force here: disclosure is
  // a genuine tradeoff with no universally right answer, so this content
  // teaches the DECISION, never a recommendation.
  // ─────────────────────────────────────────────────────────
  var WORK_CARDS = [
    {
      id: 'cliff', title: 'The handoff nobody announces', cite: null,
      body: 'In school, a team identified you, wrote a plan, and the plan followed you from class to class. At work, none of that happens automatically. The Americans with Disabilities Act protects qualified workers with disabilities — but it is REQUEST-DRIVEN: an employer generally has no obligation until someone asks for what they need. That single difference catches more people at 18 than any other part of the transition, and it is why the skills in this section are worth practicing before you need them.'
    },
    {
      id: 'accommodation', title: 'What a reasonable accommodation actually is', cite: '29 CFR 1630.9',
      body: 'An adjustment to how a job gets done, so that a qualified person can do it: a written checklist instead of spoken instructions, a modified schedule, noise-cancelling headphones, a job coach during training, more frequent breaks. It is NOT a lowered standard — you still have to do the essential functions of the job. Employers may refuse only if an accommodation causes "undue hardship", a real legal test rather than an inconvenience, and they may pick among effective options rather than granting your exact preference.'
    },
    {
      id: 'timing', title: 'When they may ask, and when they may not', cite: '29 CFR 1630.13, 1630.14',
      body: 'Before a job offer, an employer generally may NOT ask whether you have a disability or require a medical exam. They MAY ask whether you can perform the job functions, and may ask you to describe or demonstrate how you would do them. After a conditional offer, medical questions are allowed if everyone in that job category gets the same questions. Knowing this changes how an application feels: a pre-offer question about your disability is usually not something you are obligated to answer.'
    },
    {
      id: 'decision', title: 'Disclosure is a decision, not a duty', cite: null,
      body: 'You are not required to disclose a disability at all — unless you want an accommodation, in which case someone at the employer has to know enough to provide it. Reasons people disclose: they need an adjustment to interview or work, the disability is visible anyway, or they would rather work somewhere that responds well. Reasons people wait: the protection against discrimination is real but proving discrimination is hard, and first impressions are sticky. Timing options are early (application), at interview, after an offer, or once on the job when a need appears. There is no universally right answer here, which is exactly why it should be YOUR answer rather than a default.'
    },
    {
      id: 'how', title: 'How to ask, in three sentences', cite: '29 CFR 1630.9',
      body: 'You do not need a diagnosis label, a doctor\'s note up front, or the phrase "reasonable accommodation" to start. What works: name the task, name the barrier, propose the adjustment. "I do great with detailed work. Spoken instructions are hard for me to hold onto. Could I get the task list in writing or take a photo of the board?" That is a complete accommodation request. Put it in writing afterward — even a short email — because a paper trail protects both sides.'
    },
    {
      id: 'systems', title: 'The help systems most people never hear about', cite: null,
      body: 'VOCATIONAL REHABILITATION (VR) is a state agency that helps people with disabilities prepare for and keep work — assessment, training, equipment, sometimes tuition. Every transition IEP is supposed to connect you to it, and you can also apply yourself. A JOB COACH is a person who trains alongside you at a real workplace and fades out as you get fluent. SUPPORTED EMPLOYMENT means a competitive, real-wage job with that ongoing support attached. Ask your transition coordinator or your state VR office; these are underused mostly because nobody mentions them.'
    },
    {
      id: 'subminimum', title: 'A wage rule worth knowing about', cite: null,
      body: 'A provision of federal labor law, Section 14(c), has historically let certain employers pay workers with disabilities BELOW the minimum wage under special certificates, often in sheltered settings. It is contested and has been narrowing — a number of states have ended the practice outright and federal rulemaking has moved toward phasing it out, with the details still shifting. Competitive integrated employment at full wage is the goal that transition planning is supposed to aim at. If anyone offers you a job paying less than minimum wage because of a disability, that is a moment to ask questions and call your state VR office — not a normal offer.'
    }
  ];

  // Disclosure scenarios. Deliberately NOT scored right/wrong: each option is
  // a defensible choice with a real consequence, which is what makes it a
  // decision skill instead of a quiz. Only the unlawful-question item has a
  // clear legal answer, and it is flagged as such.
  var WORK_SCENARIOS = [
    { id: 'w1', text: 'An online application asks, before any interview: "Do you have any disabilities or medical conditions?"',
      options: [
        { id: 'a', text: 'Answer honestly and in detail.' },
        { id: 'b', text: 'Leave it blank or select "prefer not to answer".' },
        { id: 'c', text: 'Answer only about ability to do the job.' }
      ],
      why: 'Pre-offer disability questions are generally NOT permitted (29 CFR 1630.13), so B and C are both reasonable and neither is dishonest. One nuance worth knowing: some applications include a SEPARATE voluntary self-identification form used for federal-contractor diversity reporting, which is confidential, kept away from the hiring manager, and genuinely optional. If the question sits in the main application, treating it as optional is well founded.' },
    { id: 'w2', text: 'You need extra time on a timed skills test that is part of the interview.',
      options: [
        { id: 'a', text: 'Ask for the extra time and explain why you need it.' },
        { id: 'b', text: 'Take the test as-is and hope for the best.' },
        { id: 'c', text: 'Ask whether the test can be given a different way.' }
      ],
      why: 'This is the clearest case for asking: an accommodation in the hiring process is explicitly contemplated, and tests must measure the skill rather than the disability (29 CFR 1630.11). Notice that A and C ask for different things — extra time versus a different format — and C is often easier for an employer to say yes to. Taking it as-is is a legitimate choice too, but it is a choice, not the only option.' },
    { id: 'w3', text: 'Three months into a job you are doing well at, a new manager changes the routine and you start struggling.',
      options: [
        { id: 'a', text: 'Say nothing and try to adapt.' },
        { id: 'b', text: 'Ask for the specific adjustment you need, in writing.' },
        { id: 'c', text: 'Disclose the disability and ask for a formal accommodation.' }
      ],
      why: 'There is no deadline on asking — the right to request does not expire because you did not disclose at hiring. B and C differ in how much you share: B names a task-level need, C opens a formal process with documentation. Many people start at B and escalate only if it is refused. Saying nothing is what most people do, and it is why good workers quietly lose jobs they could have kept.' },
    { id: 'w4', text: 'An interviewer asks: "That gap in your school record — was that a medical thing?"',
      options: [
        { id: 'a', text: 'Answer the medical question directly.' },
        { id: 'b', text: 'Redirect to what you can do now.' },
        { id: 'c', text: 'Say you would rather discuss your qualifications.' }
      ],
      why: 'This is the pre-offer line again, and the question is one an employer generally should not be asking. You are not obligated to answer it. A redirect ("I took some time out and I am in a strong place now — can I tell you what I have been doing since?") usually moves the conversation without confrontation, and it is a script worth rehearsing before you are in the chair.' }
  ];

  var HELP_SCRIPTS = [
    'I want to make sure I understand this before I sign. Can I have a few minutes?',
    'Can I take this home and bring it back tomorrow?',
    'What happens if I leave this box blank?',
    'Can you explain what this section means in plain words?',
    'I would like someone to look at this with me first.',
    'Is there a copy I can keep?'
  ];

  var SCRIPT_META = [
    { cat: 'Buy time', tag: 'Urgency shield', when: 'When handed a form and told to sign now' },
    { cat: 'Buy time', tag: 'Take-home ask', when: 'For long leases, offer packets, or IEPs' },
    { cat: 'Clarify blanks', tag: 'Blank-line guard', when: 'Before skipping or signing near empty boxes' },
    { cat: 'Clarify blanks', tag: 'Plain-language ask', when: 'When legal or HR wording feels dense' },
    { cat: 'Bring support', tag: 'Second eyes', when: 'When you want a family member or advocate to review' },
    { cat: 'Keep a record', tag: 'Paper trail', when: 'Before handing back any signed document' }
  ];

  var SCENARIO_TAGS = [
    'Rushed Signature', 'Pre-Interview SSN', 'Withheld Lease', 'Blank Line',
    'IEP Pressure', 'Auto-Renew Lease', 'Age-18 HIPAA', 'Payroll Text Scam', 'Arbitration Opt-Out'
  ];
  var WORK_TIMING_TAGS = ['Pre-Offer Form', 'Interview Test', 'On the Job', 'Interview Question'];

  // Per-field interactive risk-triage misconception feedback & safe-action audit checks.
  // Authored bestId indices are balanced across 0, 1, 2 (11 each across 33 fields)
  // and deterministically shuffled via PAPERTRAIL_ENGINE.shuffleChoices.
  var FIELD_PRACTICE = {
    j1: {
      triageWhy: {
        normal: 'Correct — naming the exact posted role is routine application info with no hidden legal trap.',
        watch: 'Over-flagged: this line is standard identifying info. Marking routine lines as warnings makes it harder to spot real traps like early SSN asks.',
        danger: 'Over-flagged: writing the job title cannot lock you into a contract or expose private identity data. Save High-Stakes for SSNs, blanks, and signatures.'
      },
      actionPrompt: 'What should Sam Rivera write on "Position applied for"?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Name the specific job from the posting ("Grocery clerk (posted 8/2)").', whyNot: '' },
        { id: 'b', text: 'Write "Anything available" to look flexible.', whyNot: '"Anything" signals you did not read the posting and often routes applications to the reject pile.' },
        { id: 'c', text: 'Leave it blank so the manager decides later.', whyNot: 'Leaving the position line blank forces someone else to guess — or skip your application.' }
      ]
    },
    j2: {
      triageWhy: {
        normal: 'Correct — your legal name is standard info required on every real job application.',
        watch: 'Over-flagged: matching your legal name to your ID is good hygiene, not a hidden risk line.',
        danger: 'Over-flagged: sharing your legal name on an application is routine. Refusing it would stop any real hiring process.'
      },
      actionPrompt: 'How should Sam enter "Legal name" on the application?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Use a casual nickname only so payroll stays informal.', whyNot: 'Using only a nickname causes mismatches with ID and payroll checks later. Put nicknames in a "preferred name" box if offered.' },
        { id: 'b', text: 'Write "Sam Rivera" exactly as it appears on official ID.', whyNot: '' },
        { id: 'c', text: 'Add Sam\'s full SSN next to the name to save HR time.', whyNot: 'Never volunteer an SSN where it is not legally required yet — especially before a job offer.' }
      ]
    },
    j3: {
      triageWhy: {
        normal: 'Under-flagged: this line deserves a Watch flag because applicants often overshare citizenship or birthplace details that employers may not ask here.',
        watch: 'Correct — read carefully so you answer only the yes/no work-authorization question without volunteering extra citizenship details.',
        danger: 'Over-flagged: answering Yes/No on work authorization is standard legal hiring language, not a trap — just do not overshare beyond the question.'
      },
      actionPrompt: 'How should Sam answer "Are you legally authorized to work in the United States?"',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Attach a photocopy of a passport and birth certificate to the first application.', whyNot: 'Proof documents belong on Form I-9 AFTER hiring, not attached to an unverified initial application.' },
        { id: 'b', text: 'Write out family immigration history and birthplace.', whyNot: 'Employers may not ask your citizenship status or birthplace here — stick strictly to the yes/no question.' },
        { id: 'c', text: 'Select or write "Yes" without adding extra citizenship details.', whyNot: '' }
      ]
    },
    j4: {
      triageWhy: {
        normal: 'Under-flagged (risky!): treating an SSN box on a first application as routine is how identity theft happens before any interview or offer.',
        watch: 'Close, but under-flagged: giving an SSN before a job offer is High-Stakes because a leaked SSN can never be easily reset.',
        danger: 'Correct — High-Stakes! Context matters: an SSN is needed AFTER hiring on tax forms, not on an initial application.'
      },
      actionPrompt: 'What should Sam write in the Social Security Number box on a first job application?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Write "available upon offer" and wait for verified post-hire tax forms.', whyNot: '' },
        { id: 'b', text: 'Enter the full SSN right away so the application looks complete.', whyNot: 'Handing over an SSN before a job offer exposes you to identity theft if the form is lost, shared, or a fake listing.' },
        { id: 'c', text: 'Invent a fake random SSN so the box is not empty.', whyNot: 'Inventing a fake number creates a false statement on a certified form — writing "available upon offer" is honest and safe.' }
      ]
    },
    j5: {
      triageWhy: {
        normal: 'Correct — availability is standard scheduling info, as long as you stay realistic about your actual hours.',
        watch: 'Slightly over-flagged: while honesty matters here, availability is a routine scheduling box rather than a legal or privacy trap.',
        danger: 'Over-flagged: listing weekly hours does not expose identity data or waive legal rights — just avoid over-promising.'
      },
      actionPrompt: 'How should Sam fill in "Availability" while attending school?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Write "Open 24/7" even though school runs until 3:30pm.', whyNot: 'Over-promising hours you cannot actually work leads directly to missed shifts and losing a first job.' },
        { id: 'b', text: 'List exact reliable windows ("Mon-Thu after 4pm; Sat all day").', whyNot: '' },
        { id: 'c', text: 'Leave it blank and hope they only schedule weekends.', whyNot: 'Unlisted constraints lead to schedule conflicts on day one.' }
      ]
    },
    j6: {
      triageWhy: {
        normal: 'Under-flagged: checking "Yes" without thinking can tip off a current boss before you are ready. Mark it Watch.',
        watch: 'Correct — read carefully! Checking "No" is completely normal and protects your current job while searching.',
        danger: 'Over-flagged: you have full control with a simple "No" — it is a pause-and-check Watch item, not an irreversible contract trap.'
      },
      actionPrompt: 'Sam\'s current supervisor does not know Sam is job-hunting. What should Sam pick?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Check "Yes" because saying "No" looks suspicious.', whyNot: '"No" is standard and expected by hiring managers — checking "Yes" can jeopardize your current job.' },
        { id: 'b', text: 'Erase the current job from the application altogether.', whyNot: 'Hiding valid work experience hurts your application when simply checking "No" solves the privacy issue.' },
        { id: 'c', text: 'Select "No" so the new employer does not call the current boss unannounced.', whyNot: '' }
      ]
    },
    j7: {
      triageWhy: {
        normal: 'Under-flagged (risky!): a signature is never routine — you are certifying everything above is true and accepting legal terms.',
        watch: 'Under-flagged: signatures are ALWAYS High-Stakes because they are the irreversible moment you certify the entire page.',
        danger: 'Correct — High-Stakes! Never sign until you have reviewed every line above and confirmed there are no blanks or falsehoods.'
      },
      actionPrompt: 'Before Sam signs the bottom of the job application, what is the protective step?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Re-read every line above for accuracy and blanks, then sign "Sam Rivera".', whyNot: '' },
        { id: 'b', text: 'Sign first and ask the clerk to fill in dates and availability later.', whyNot: 'Signing above blank boxes lets someone else add statements you certified as true.' },
        { id: 'c', text: 'Skip the signature so you cannot be held to anything.', whyNot: 'An unsigned application is typically discarded — review first, fix blanks, then sign accurately.' }
      ]
    },
    w1: {
      triageWhy: {
        normal: 'Correct — name and address on a W-4 are routine payroll fields (just make sure spelling matches your Social Security card).',
        watch: 'Slightly over-flagged: accuracy avoids paycheck delays, but this is standard identifying info on an official post-hire tax form.',
        danger: 'Over-flagged: on your verified employer\'s W-4 after hiring, your name and address are normal payroll basics.'
      },
      actionPrompt: 'How should Sam complete W-4 Step 1(a) Name and address?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Use a shortened nickname to save writing space.', whyNot: 'Name mismatches against Social Security records are the top cause of delayed first paychecks.' },
        { id: 'b', text: 'Match legal name and full street address exactly ("Sam Rivera, 18 Birch Lane, Apt 2, Anytown, ME 04000").', whyNot: '' },
        { id: 'c', text: 'Leave the address off because HR already saw the resume.', whyNot: 'Tax forms need the full address so your W-2 tax statement reaches you in January.' }
      ]
    },
    w2: {
      triageWhy: {
        normal: 'Under-flagged: even when an SSN request IS legitimate, you should still verify who handed you the W-4 — mark it Watch.',
        watch: 'Correct — Watch! Unlike a first application, an SSN IS legitimately required on a post-hire W-4, once you verify it is truly your employer\'s HR form.',
        danger: 'Nuance check: on an unverified job listing SSN is High-Stakes, but on an official W-4 AFTER hiring it IS required — still pause (Watch) to confirm the form is legitimate.'
      },
      actionPrompt: 'Sam has been officially hired and HR hands over a paper W-4. What is the right move for Step 1(b)?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Refuse to give an SSN on a W-4 under any circumstances.', whyNot: 'Employers are legally required to collect your SSN on a W-4 after hiring so taxes are credited to your name.' },
        { id: 'b', text: 'Text the SSN to an unverified personal phone number instead.', whyNot: 'Always submit tax forms through verified official HR channels, never casual unverified texts.' },
        { id: 'c', text: 'Verify it is the official employer tax form, then enter the SSN (practice value: 000-00-0000).', whyNot: '' }
      ]
    },
    w3: {
      triageWhy: {
        normal: 'Correct — filing status is a standard tax withholding selector (usually Single for a first job).',
        watch: 'Over-flagged: filing status only adjusts paycheck withholding; you can submit an updated W-4 anytime if your life changes.',
        danger: 'Over-flagged: choosing filing status is reversible and routine — not an irreversible High-Stakes trap.'
      },
      actionPrompt: 'Sam is unmarried and starting a first job. Which filing status fits W-4 Step 1(c)?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Check "Single or married filing separately".', whyNot: '' },
        { id: 'b', text: 'Check "Head of household" because it withholds less tax.', whyNot: 'Claiming a status you do not qualify for causes too little tax to be withheld and can leave you owing a surprise tax bill.' },
        { id: 'c', text: 'Check all three boxes so Payroll picks one.', whyNot: 'Checking multiple boxes makes the form invalid and delays payroll processing.' }
      ]
    },
    w4f: {
      triageWhy: {
        normal: 'Correct — Step 2 is a standard check box that only applies when you hold two or more jobs at the same time.',
        watch: 'Slightly over-flagged: good to double-check if you add a second job, but with one job this is a routine N/A step.',
        danger: 'Over-flagged: Step 2 adjusts withholding and can be updated anytime with a new W-4.'
      },
      actionPrompt: 'Sam works one part-time job right now. How should Sam handle W-4 Step 2 (Multiple jobs)?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Guess an extra dollar amount to add just in case.', whyNot: 'Guessing extra withholding shrinks your paycheck needlessly when Step 2 does not apply.' },
        { id: 'b', text: 'Skip Step 2 as not applicable (one job) and update a new W-4 if Sam adds a second job later.', whyNot: '' },
        { id: 'c', text: 'List every summer camp job from three years ago.', whyNot: 'Step 2 is only for multiple jobs worked AT THE SAME TIME, not past jobs.' }
      ]
    },
    w5: {
      triageWhy: {
        normal: 'Under-flagged (risky!): W-4 Step 5 is signed "under penalty of perjury" — never routine.',
        watch: 'Under-flagged: signing a federal tax form under penalty of perjury is always High-Stakes.',
        danger: 'Correct — High-Stakes! Never sign a blank W-4 or let someone else complete Steps 1–4 after your signature.'
      },
      actionPrompt: 'HR says "Just sign Step 5 now and we will finish the boxes above for you." What should Sam do?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Sign Step 5 quickly so payroll finishes faster.', whyNot: 'Signing a blank federal tax form violates the perjury certification and gives up control of your withholding.' },
        { id: 'b', text: 'Write "Exempt" everywhere to get bigger paychecks.', whyNot: 'Falsely claiming exempt under penalty of perjury can trigger IRS penalties and a large April tax bill.' },
        { id: 'c', text: 'Complete and review Steps 1–4 first, verify there are no unintended entries, then sign and date Step 5.', whyNot: '' }
      ]
    },
    l1: {
      triageWhy: {
        normal: 'Correct — start and end dates are standard headline facts on every lease (still read them carefully before committing!).',
        watch: 'Close — dates matter a lot, though the Term box itself is a clear standard line compared to hidden utility or blank-line traps.',
        danger: 'Over-flagged: the term dates are standard upfront info; the High-Stakes moments are blank lines and the final binding signature.'
      },
      actionPrompt: 'What should Sam check on the lease "Term (start and end date)" line?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Confirm exact start/end dates (09/01–08/31) and whether it is 12-month or month-to-month.', whyNot: '' },
        { id: 'b', text: 'Ignore the end date because you can leave anytime you give a week\'s notice.', whyNot: 'A 12-month lease binds you to pay for the entire term unless the lease or state law allows early release.' },
        { id: 'c', text: 'Leave the end date blank for flexibility.', whyNot: 'A blank end date lets someone fill in a longer commitment later.' }
      ]
    },
    l2: {
      triageWhy: {
        normal: 'Correct — rent amount and due date are standard core lease terms (and good practice is checking the late-fee line right below).',
        watch: 'Close — always verify the number matches the ad and check late fees, though rent amount itself is a standard top-line field.',
        danger: 'Over-flagged: verifying the monthly rent figure is standard reading — save High-Stakes for blanks and signing.'
      },
      actionPrompt: 'What should Sam verify on "Rent amount and due date"?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Check only the dollar number and skip the due date and late-fee paragraph.', whyNot: 'Missing the due date or grace period can trigger steep automatic late fees every month.' },
        { id: 'b', text: 'Confirm the exact monthly rent ($950), due day (the 1st), grace period, and late-fee rule.', whyNot: '' },
        { id: 'c', text: 'Assume verbal promises of a discount will apply even if the printed number is higher.', whyNot: 'The printed rent figure on the signed lease overrides casual verbal discounts.' }
      ]
    },
    l3: {
      triageWhy: {
        normal: 'Under-flagged: security deposits are where tenants lose hundreds of dollars if return timelines and move-in damage checklists are skipped.',
        watch: 'Correct — Watch! Know the exact deposit amount, state-law return deadline, and how to document move-in condition.',
        danger: 'Slightly over-flagged: a security deposit is normal in leases, so it is a Watch-closely term rather than an outright red-flag trap.'
      },
      actionPrompt: 'How should Sam protect the $950 security deposit before moving in?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Pay cash with no receipt so the landlord knows you trust them.', whyNot: 'Never pay a deposit without a written receipt showing the amount and purpose.' },
        { id: 'b', text: 'Skip move-in photos because the apartment looks mostly clean.', whyNot: 'Without dated move-in photos, you may be charged at move-out for pre-existing scratches or stains.' },
        { id: 'c', text: 'Confirm the 30-day return rule in writing, get a receipt, and photograph existing wear on move-in day.', whyNot: '' }
      ]
    },
    l4: {
      triageWhy: {
        normal: 'Under-flagged: "Tenant pays heat" in winter can add hundreds per month and erase a lower rent price. Mark it Watch!',
        watch: 'Correct — Watch! Always check who pays heat, water, trash, and electric before comparing two apartments.',
        danger: 'Slightly over-flagged: paying your own utilities is common — it is a crucial budget Watch line, not an illegal trap.'
      },
      actionPrompt: 'The lease says "Tenant pays heat and electric." What should Sam do before signing?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Ask for typical winter heating bills and add them into the monthly budget before agreeing.', whyNot: '' },
        { id: 'b', text: 'Assume heat is cheap because the ad called the apartment affordable.', whyNot: 'Winter heating bills can easily exceed $200/month and break a tight first-apartment budget.' },
        { id: 'c', text: 'Wait until November to find out whether heat is electric, oil, or gas.', whyNot: 'Learning the fuel cost after you are locked into a 12-month lease leaves you with no exit.' }
      ]
    },
    l5: {
      triageWhy: {
        normal: 'Under-flagged (risky!): empty lines in a contract can be filled in AFTER you sign, legally changing your deal.',
        watch: 'Under-flagged: blank lines above a signature are High-Stakes because they leave a contract open to alteration.',
        danger: 'Correct — High-Stakes! Never sign a lease with empty blanks — draw a neat line through unused spaces or write N/A.'
      },
      actionPrompt: 'Sam spots two empty blank lines in the "Additional Fees" section of the lease. What should Sam do?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Leave them blank since the landlord said there are no extra fees.', whyNot: 'Empty lines can be filled in later, turning a verbal "no fees" into a written charge above your signature.' },
        { id: 'b', text: 'Confirm no fees apply, then write "N/A" and draw a line through the blank spaces before signing.', whyNot: '' },
        { id: 'c', text: 'Sign first and email a reminder not to add anything to those lines.', whyNot: 'Striking through blanks BEFORE signing takes five seconds and prevents disputes completely.' }
      ]
    },
    l6: {
      triageWhy: {
        normal: 'Under-flagged (risky!): signing a lease binds you to thousands of dollars across the full term.',
        watch: 'Under-flagged: a lease signature is one of the highest-stakes legal commitments young adults make.',
        danger: 'Correct — High-Stakes! If you cannot explain a clause out loud in plain words, pause and ask before signing.'
      },
      actionPrompt: 'Sam does not understand a lease paragraph right above the signature line. What is the right action?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Sign now so another renter does not grab the apartment.', whyNot: 'Urgency pressure is how renters end up stuck with costly penalty clauses they never understood.' },
        { id: 'b', text: 'Cross out your own name after signing if you later dislike the clause.', whyNot: 'Once signed and delivered, you cannot unilaterally undo a lease.' },
        { id: 'c', text: 'Ask to take a copy home or have the clause explained in plain language before signing.', whyNot: '' }
      ]
    },
    m1: {
      triageWhy: {
        normal: 'Correct — describing why you came in is standard clinical intake info that helps your doctor help you.',
        watch: 'Over-flagged: sharing your symptoms clearly on a clinic intake form is routine and protected by medical privacy.',
        danger: 'Over-flagged: hiding symptoms on a clinic intake hurts your care rather than protecting you.'
      },
      actionPrompt: 'How should Sam write "Reason for visit" on a medical intake form?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Be specific in plain words ("Headaches 3x/week for a month").', whyNot: '' },
        { id: 'b', text: 'Write only "sick" so it stays short.', whyNot: 'Vague words give the clinician almost nothing to start with and slow down getting the right care.' },
        { id: 'c', text: 'Leave it blank so the doctor has to guess.', whyNot: 'Clear intake notes help the nurse and clinician prepare the right questions and checks.' }
      ]
    },
    m2: {
      triageWhy: {
        normal: 'Under-flagged: forgetting inhalers, birth control, or supplements can cause dangerous drug interactions. Mark it Watch!',
        watch: 'Correct — Watch! List every medication, inhaler, and supplement so clinicians catch unsafe interactions.',
        danger: 'Slightly over-flagged: this is a safety-critical Watch box to fill accurately, not a privacy trap to refuse.'
      },
      actionPrompt: 'Sam takes a daily vitamin and an occasional asthma inhaler. What belongs under "Current medications"?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Write "None" because vitamins and rescue inhalers do not count as prescriptions.', whyNot: 'Supplements and inhalers CAN interact with new prescriptions — clinicians need the full list.' },
        { id: 'b', text: 'List everything you take — prescriptions, inhalers, over-the-counter meds, and supplements.', whyNot: '' },
        { id: 'c', text: 'Wait to mention them only if the doctor asks twice.', whyNot: 'Clinicians rely on the intake sheet before choosing safe medications.' }
      ]
    },
    m3: {
      triageWhy: {
        normal: 'Under-flagged: missing a medication allergy like penicillin can lead to a serious reaction. Always flag Allergies as Watch!',
        watch: 'Correct — Watch! Double-check medication and severe food allergies carefully every single visit.',
        danger: 'Slightly over-flagged: it is a vital health-safety Watch box, not an irreversible financial/legal waiver.'
      },
      actionPrompt: 'Sam had a rash from penicillin as a child. What should Sam enter under "Allergies"?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Leave it blank because it happened years ago.', whyNot: 'Past antibiotic reactions can become much more severe on re-exposure.' },
        { id: 'b', text: 'Write "Normal" without naming the medication.', whyNot: 'The clinic needs the exact drug name ("Penicillin") flagged in your chart.' },
        { id: 'c', text: 'Write "Penicillin" (and mention the rash reaction when asked).', whyNot: '' }
      ]
    },
    m4: {
      triageWhy: {
        normal: 'Correct — insurance policy info is standard billing intake (and clinics have sliding-scale options if uninsured).',
        watch: 'Over-flagged: copying your policy ID from your insurance card is standard clinic intake, not a hidden risk.',
        danger: 'Over-flagged: sharing your health insurance card at a verified clinic is routine billing info.'
      },
      actionPrompt: 'Sam is not sure about the insurance policy number at check-in. What is the helpful move?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Show the insurance card (or ask the desk about sliding-scale / assistance if uninsured).', whyNot: '' },
        { id: 'b', text: 'Write Sam\'s Social Security number in the policy box instead.', whyNot: 'Never substitute your SSN when a form asks for an insurance member ID.' },
        { id: 'c', text: 'Walk out and skip medical care.', whyNot: 'Front desks help with coverage lookups and sliding-scale options every day — ask rather than skipping care.' }
      ]
    },
    m5: {
      triageWhy: {
        normal: 'Under-flagged (risky!): a HIPAA release decides who gets to see your private medical records — at 18, that choice is fully yours.',
        watch: 'Under-flagged: waiving medical privacy is High-Stakes because once private health notes are shared, they cannot be un-shared.',
        danger: 'Correct — High-Stakes! Read carefully before initialing so you choose exactly who (if anyone) may receive your health information.'
      },
      actionPrompt: 'On "Consent to release information" at age 18, what should Sam do?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Initial every box quickly so the visit starts sooner.', whyNot: 'Initialing unread can authorize the clinic to send private health results to people you did not intend.' },
        { id: 'b', text: 'Read carefully, name ONLY people you intentionally authorize (or write "None"), and strike empty lines.', whyNot: '' },
        { id: 'c', text: 'Assume clinics automatically have to tell your school or employer anyway.', whyNot: 'Under HIPAA, your clinic generally may NOT share your medical details without your signed authorization.' }
      ]
    },
    p1: {
      triageWhy: {
        normal: 'Under-flagged: bringing a photocopy instead of an original or certified copy is the #1 reason people get turned away at the DMV.',
        watch: 'Correct — Watch! Check whether you need an original passport or a state-certified birth certificate with a raised/official seal.',
        danger: 'Slightly over-flagged: the risk here is a wasted trip, not an irreversible legal trap — so Watch is the right level.'
      },
      actionPrompt: 'Which identity document should Sam bring to the DMV for a driver permit?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'A phone photo of a birth certificate.', whyNot: 'DMV offices reject phone photos and plain photocopies of identity records.' },
        { id: 'b', text: 'A handwritten note from a friend confirming Sam\'s name.', whyNot: 'Government agencies require official primary identity documents.' },
        { id: 'c', text: 'An original passport or certified birth certificate with an official seal.', whyNot: '' }
      ]
    },
    p2: {
      triageWhy: {
        normal: 'Under-flagged: many teens do not have utility bills in their own name and get sent home if they do not prepare a school residency letter.',
        watch: 'Correct — Watch! Plan ahead and check your state\'s list of accepted student residency proofs before making the trip.',
        danger: 'Slightly over-flagged: missing residency proof just delays the appointment — it is a prepare-ahead Watch line.'
      },
      actionPrompt: 'Sam lives at home and has no utility bills in Sam\'s name. How can Sam satisfy "Proof of residency"?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Check state DMV rules ahead and bring accepted alternatives like a school residency letter + parent utility bill.', whyNot: '' },
        { id: 'b', text: 'Write Sam\'s name over a parent\'s bill with a pen.', whyNot: 'Altering a bill is fraudulent and will get the application rejected immediately.' },
        { id: 'c', text: 'Show up with no address documents and explain verbally.', whyNot: 'Clerks cannot waive written residency documentation requirements.' }
      ]
    },
    p3: {
      triageWhy: {
        normal: 'Correct — guardian consent for applicants under 18 is a standard procedural requirement (just confirm they bring ID).',
        watch: 'Slightly over-flagged: good to coordinate schedules, though guardian sign-off for minors is a standard government rule.',
        danger: 'Over-flagged: this is a normal eligibility step for minors rather than a red-flag trap.'
      },
      actionPrompt: 'Sam is 17 and applying for a learner\'s permit. What should Sam plan for the guardian signature?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Sign the parent\'s name yourself to save them a trip.', whyNot: 'Signing someone else\'s name on a government form is forgery and voids the application.' },
        { id: 'b', text: 'Confirm whether the parent/guardian must attend in person with their own photo ID (or have the form notarized).', whyNot: '' },
        { id: 'c', text: 'Skip the line because Sam turns 18 next year.', whyNot: 'While under 18, the form cannot be processed without valid guardian authorization.' }
      ]
    },
    p4: {
      triageWhy: {
        normal: 'Under-flagged: hiding corrective lenses or a medical condition can void your license later. Mark it Watch!',
        watch: 'Correct — Watch! Honest disclosure protects both your safety and your legal coverage — eyeglasses are simply noted, not a ban.',
        danger: 'Slightly over-flagged: answering honestly protects you and is routinely accommodated, making it a careful Watch item.'
      },
      actionPrompt: 'Sam wears glasses to see road signs clearly. How should Sam answer "Medical/vision disclosure"?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Check "No" so there are no notes on the license.', whyNot: 'Hiding required vision correction puts you and others at risk and can invalidate coverage after a crash.' },
        { id: 'b', text: 'Skip the vision question completely.', whyNot: 'Incomplete disclosure lines halt the application.' },
        { id: 'c', text: 'Answer honestly ("Corrective lenses: yes") and bring glasses to the vision screening.', whyNot: '' }
      ]
    },
    p5: {
      triageWhy: {
        normal: 'Under-flagged (risky!): swearing accuracy to a state government agency carries real legal penalties.',
        watch: 'Under-flagged: government certification signatures are always High-Stakes.',
        danger: 'Correct — High-Stakes! Double-check every box above before signing a sworn government certification.'
      },
      actionPrompt: 'Before Sam signs the DMV "Certification signature", what should Sam double-check?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Verify legal name, address, date of birth, and disclosures are 100% truthful with no unintended blanks, then sign.', whyNot: '' },
        { id: 'b', text: 'Sign without checking because the clerk already typed it into the computer.', whyNot: 'Clerks make typos too — your signature certifies that the printed record is accurate.' },
        { id: 'c', text: 'Sign with a playful doodle instead of Sam\'s real signature.', whyNot: 'Your signature goes onto your official state ID and must match your real signing style.' }
      ]
    },
    i1: {
      triageWhy: {
        normal: 'Correct — date, time, and place are routine scheduling details (and you are allowed to ask for a mutually agreeable time!).',
        watch: 'Slightly over-flagged: definitely check your calendar, though scheduling info itself is a standard invitation field.',
        danger: 'Over-flagged: an IEP meeting time can always be rescheduled by request — it is not a binding High-Stakes trap.'
      },
      actionPrompt: 'The IEP meeting is scheduled during a class Sam cannot miss. What can Sam and family do?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Skip the meeting silently because the school already picked the time.', whyNot: 'You have a voice in scheduling — staying silent means missing decisions about your own plan.' },
        { id: 'b', text: 'Reply promptly and ask for a mutually agreeable time that works for you and your family.', whyNot: '' },
        { id: 'c', text: 'Assume the date cannot be changed once printed on the notice.', whyNot: 'Schools are required under IDEA to work toward a mutually agreeable meeting time.' }
      ]
    },
    i2: {
      triageWhy: {
        normal: 'Under-flagged: knowing whether the meeting is an annual review, reevaluation, or transition plan tells you what to prepare!',
        watch: 'Correct — Watch! Reading the meeting purpose ahead lets you bring the right questions and goals.',
        danger: 'Slightly over-flagged: the invitation purpose is informative rather than risky — mark it Watch so you prepare well.'
      },
      actionPrompt: 'The invite lists "Annual review + transition planning." How should Sam use that clue?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Ignore it — transition planning is only for adults to fill out.', whyNot: 'Transition planning is specifically about YOUR post-high-school job, college, and independent living goals.' },
        { id: 'b', text: 'Wait until graduation week to think about life after school.', whyNot: 'Starting transition planning in your teens connects you to Vocational Rehabilitation and job coaching early.' },
        { id: 'c', text: 'Jot down 2–3 goals for work, training, or school after graduation to share with the team.', whyNot: '' }
      ]
    },
    i3: {
      triageWhy: {
        normal: 'Under-flagged: if transition is on the agenda, YOU should be listed as an invited participant — check this box carefully!',
        watch: 'Correct — Watch! Verify who will be in the room and confirm that YOU are invited as a real participant.',
        danger: 'Slightly over-flagged: checking the attendee list is a smart Watch step — if someone is missing, you can ask before the meeting.'
      },
      actionPrompt: 'Sam checks "Who is invited" on a transition IEP invite and does not see Sam\'s own name. What should Sam do?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Speak up (with family or case manager) — when transition is discussed, the student should be invited.', whyNot: '' },
        { id: 'b', text: 'Stay out of the meeting because students are only observers.', whyNot: 'By your teens, your IEP transition plan is YOUR plan for life after school — you belong at the table.' },
        { id: 'c', text: 'Refuse to ever attend any school meeting again.', whyNot: 'Advocating to be included gets your own goals and accommodations written into the plan.' }
      ]
    },
    i4: {
      triageWhy: {
        normal: 'Correct — knowing you may bring a relative, advocate, or coach is a helpful standard right on the invitation.',
        watch: 'Slightly over-flagged: you do not need permission to bring someone with knowledge about you — it is a supportive standard option.',
        danger: 'Over-flagged: bringing a support person is a built-in protection, not a danger box.'
      },
      actionPrompt: 'Sam wants an aunt who knows Sam well to join the IEP meeting. What is true here?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Only lawyers are allowed to attend with families.', whyNot: 'Anyone with knowledge or special expertise about the student — relative, mentor, coach, advocate — may attend.' },
        { id: 'b', text: 'Sam and family may invite Sam\'s aunt without needing the school\'s permission (giving a quick heads-up is polite).', whyNot: '' },
        { id: 'c', text: 'An extra guest is forbidden unless everyone votes yes.', whyNot: 'IDEA gives families and students the right to bring support people with knowledge of the student.' }
      ]
    },
    i5: {
      triageWhy: {
        normal: 'Under-flagged: this is the most impactful part of the meeting — rehearsing even two sentences changes outcomes. Mark it Watch!',
        watch: 'Correct — Watch! Preparing what helps you, what gets in your way, and your post-school goals puts you in the driver\'s seat.',
        danger: 'Slightly over-flagged: speaking up at your IEP is empowering rather than dangerous — mark it Watch so you prepare ahead.'
      },
      actionPrompt: 'How can Sam prepare for "What do you want to say?" before the IEP meeting?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Wait to see if anyone remembers to ask at the last 30 seconds.', whyNot: 'Meetings move quickly — bringing a written note ensures your voice is heard.' },
        { id: 'b', text: 'Memorize a 10-page speech word for word.', whyNot: 'Two honest sentences on an index card or phone note work better than a stressful long speech.' },
        { id: 'c', text: 'Practice two plain sentences (e.g., "I want to work with animals after graduation, and written checklists help me most").', whyNot: '' }
      ]
    }
  };

  // Document-level interactive Blank-Line / Red-Flag Audit Checks (1 per doc; balanced bestId indices 0, 1, 2)
  var DOC_AUDIT_CHECKS = {
    jobapp: {
      id: 'audit_jobapp',
      docId: 'jobapp',
      title: 'Pre-Submit Red-Flag Check: Job Application',
      prompt: 'Sam finishes the paper job application, sees the Social Security Number box is still empty, and notices an unused "Previous Employer #3" section above the signature line. What is the safest check before signing?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Write "available upon offer" in the SSN box, write "N/A" across unused employer boxes, re-read every line, then sign.', whyNot: '' },
        { id: 'b', text: 'Fill in Sam\'s full SSN now and leave the unused employer boxes completely blank.', whyNot: 'Giving an SSN before an offer risks identity theft, and leaving empty boxes above a signature invites later edits.' },
        { id: 'c', text: 'Sign the bottom right now and hand it in with empty boxes so HR can fill in the rest.', whyNot: 'Never sign above empty boxes on a certified form.' }
      ],
      takeaway: 'Defer SSN until after a job offer, mark unused sections "N/A", and verify every line before signing.'
    },
    w4: {
      id: 'audit_w4',
      docId: 'w4',
      title: 'Pre-Submit Red-Flag Check: W-4 Tax Withholding',
      prompt: 'Before signing Step 5 of the W-4 at Sam\'s new job, Sam checks Steps 1–4 and sees Step 4(c) "Extra withholding" has a blank line next to a dollar sign ($___). Sam wants normal standard withholding. What should Sam do?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Write "$500" just to fill the blank space.', whyNot: 'Writing $500 takes an extra $500 out of EVERY paycheck!' },
        { id: 'b', text: 'Confirm Sam wants $0 extra withholding, write "0" or draw a neat line through the blank, check name/SSN accuracy, then sign and keep a copy.', whyNot: '' },
        { id: 'c', text: 'Leave Step 1(a) blank since Payroll already knows Sam\'s first name.', whyNot: 'Missing legal name or address delays paychecks and year-end W-2 delivery.' }
      ],
      takeaway: 'Check dollar boxes carefully ("0" or strike-through when none), verify exact legal name, and keep a photo/copy for your records.'
    },
    lease: {
      id: 'audit_lease',
      docId: 'lease',
      title: 'Blank-Line & Totals Audit: Apartment Lease',
      prompt: 'Sam reads the lease: Rent is $950/mo, Security Deposit is $950, and a "Pet / Parking / Other Monthly Fees: $____" line is left blank right above the signature. The landlord says "Don\'t worry, I\'ll email your copy next week." What must Sam do BEFORE signing?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Sign now — the landlord verbally promised $0 extra fees.', whyNot: 'Verbal promises do not override a blank fee line above your signature.' },
        { id: 'b', text: 'Sign now and ask for a copy after moving in.', whyNot: 'Without a copy or photos of every page at signing, you cannot prove what terms were originally written.' },
        { id: 'c', text: 'Verify total move-in cost ($1,900), write "$0 / N/A" and strike through blank fee lines, and photograph every page / get a signed copy immediately.', whyNot: '' }
      ],
      takeaway: 'Verify totals, close every blank line with "$0 / N/A" + strike-through, and never leave without a copy or photos of every page.'
    },
    medical: {
      id: 'audit_medical',
      docId: 'medical',
      title: 'Privacy & Safety Audit: Medical Intake',
      prompt: 'Sam (now 18) finishes listing medications and penicillin allergy. At the bottom is a blank "Authorized to Receive My Medical Records" box with 3 empty lines. Sam wants records kept private for now. What should Sam do?',
      bestId: 'a',
      choices: [
        { id: 'a', text: 'Write "None — keep records private to patient only" and draw a diagonal line through the remaining blank lines before signing.', whyNot: '' },
        { id: 'b', text: 'Leave all 3 lines blank and sign at the bottom.', whyNot: 'Blank authorization lines above your signature leave ambiguity about who could be added.' },
        { id: 'c', text: 'Skip the Allergies box to keep the visit private.', whyNot: 'Clinicians need your allergies to keep prescriptions safe; control privacy on the HIPAA release box instead.' }
      ],
      takeaway: 'Be thorough on medications/allergies for your own safety, and explicitly lock down the HIPAA release lines with "None" + strike-through.'
    },
    permit: {
      id: 'audit_permit',
      docId: 'permit',
      title: 'Document Readiness Audit: Driver Permit',
      prompt: 'Before heading to the DMV counter with the permit application, Sam checks the folder and sees: a plain photocopy of a birth certificate, a school residency letter, and an unsigned certification line. What needs fixing BEFORE going?',
      bestId: 'b',
      choices: [
        { id: 'a', text: 'Sign the certification line at home and still bring the photocopy.', whyNot: 'Photocopies of birth certificates are normally refused, wasting the trip.' },
        { id: 'b', text: 'Swap the photocopy for the certified original birth certificate, confirm the second residency proof + guardian ID if under 18, and verify every answer before signing.', whyNot: '' },
        { id: 'c', text: 'Leave the medical/vision box blank so the clerk checks "No".', whyNot: 'Never leave sworn government disclosures blank or inaccurate.' }
      ],
      takeaway: 'Originals/certified copies beat photocopies at government offices — check every required document and verify entries before signing.'
    },
    iep: {
      id: 'audit_iep',
      docId: 'iep',
      title: 'Participation & Copy Audit: IEP Meeting',
      prompt: 'Sam\'s IEP transition meeting wraps up and the coordinator asks Sam and Sam\'s parent to sign the new 14-page IEP right away so they can file it. Sam noticed one job-coaching accommodation was discussed out loud but might not be typed in yet. What is the right move?',
      bestId: 'c',
      choices: [
        { id: 'a', text: 'Sign immediately because everyone remembers talking about job coaching.', whyNot: 'If an accommodation is not written into the IEP document, it is not legally guaranteed to happen.' },
        { id: 'b', text: 'Sign and write a note in your own backpack later.', whyNot: 'A private note does not amend the signed official plan.' },
        { id: 'c', text: 'Ask for a full copy to take home, verify the accommodation is in writing, and request edits before signing.', whyNot: '' }
      ],
      takeaway: 'Ask for a take-home copy and make sure every agreed support is actually written into the plan before signing.'
    }
  };

  // Sam Rivera starter templates for the interactive ADA 3-Sentence Request Builder
  var ADA_TEMPLATES = [
    {
      id: 'written_list',
      label: 'Written task list',
      role: 'Grocery clerk shift',
      task: 'I do strong, accurate work when stocking shelves and setting up displays.',
      barrier: 'When several multi-step instructions are given out loud at once, it is hard for me to hold onto every step in order.',
      adjustment: 'Could I get my shift tasks as a short written checklist or take a photo of the task board?'
    },
    {
      id: 'quiet_focus',
      label: 'Noise reduction',
      role: 'Back-office / inventory',
      task: 'I catch inventory errors quickly when I can focus on count sheets.',
      barrier: 'Loud PA announcements and overlapping conversations near the front counter make it hard to track numbers accurately.',
      adjustment: 'Could I wear noise-reducing headphones during inventory counts or complete count sheets in the quiet back corner?'
    },
    {
      id: 'routine_steps',
      label: 'Step-by-step guide',
      role: 'Register closing',
      task: 'I handle customer checkouts reliably once I know the sequence.',
      barrier: 'Sudden changes to closing routines without a visual reference make it difficult to remember the new order of steps.',
      adjustment: 'Could we keep a laminated step-by-step closing card near the register whenever the routine changes?'
    },
    {
      id: 'paced_breaks',
      label: 'Scheduled short breaks',
      role: 'Warehouse / retail floor',
      task: 'I stay steady and accurate through long shifts when my pacing is clear.',
      barrier: 'Standing continuously for four hours without a short reset causes fatigue that slows down my sorting accuracy.',
      adjustment: 'Could I split my break time into two brief five-minute sit-down resets during long shifts?'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // Pure Deterministic Engine (zero React / DOM)
  // Exposed on window.PaperTrailPure and tool config _engine
  // ─────────────────────────────────────────────────────────
  function safeObj(val) {
    return (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};
  }
  function safeMap(val) {
    var src = safeObj(val);
    var out = {};
    var ks = Object.keys(src);
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i];
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = src[k];
    }
    return out;
  }
  function safeIndex(val, len) {
    var n = typeof val === 'number' && isFinite(val) ? Math.floor(val) : 0;
    if (len <= 0) return 0;
    return Math.max(0, Math.min(len - 1, n));
  }
  function countTruthyKeys(obj) {
    var o = safeMap(obj);
    var c = 0;
    var ks = Object.keys(o);
    for (var i = 0; i < ks.length; i++) if (o[ks[i]]) c++;
    return c;
  }

  function seededHash(str) {
    var s = String(str == null ? '' : str);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function shuffleChoices(items, seed) {
    if (!Array.isArray(items)) return [];
    var arr = items.slice();
    if (arr.length <= 1) return arr;
    var state = seededHash(seed || 'papertrail') || 1;
    for (var i = arr.length - 1; i > 0; i--) {
      state = (state + 0x6D2B79F5) >>> 0;
      var z = Math.imul(state ^ (state >>> 15), 1 | state);
      z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
      var rnd = ((z ^ (z >>> 14)) >>> 0) / 4294967296;
      var j = Math.floor(rnd * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function getDocumentById(docId) {
    if (typeof docId !== 'string') return null;
    for (var i = 0; i < DOCS.length; i++) {
      if (DOCS[i].id === docId) return DOCS[i];
    }
    return null;
  }

  function getFieldById(docId, fieldId) {
    var doc = getDocumentById(docId);
    if (!doc || typeof fieldId !== 'string') return null;
    for (var i = 0; i < doc.fields.length; i++) {
      if (doc.fields[i].id === fieldId) return doc.fields[i];
    }
    return null;
  }

  function riskRank(level) {
    if (level === 'normal') return 0;
    if (level === 'watch') return 1;
    if (level === 'danger') return 2;
    return -1;
  }

  function evaluateRiskTriage(docId, fieldId, chosenLevel) {
    var field = getFieldById(docId, fieldId);
    var rankChosen = riskRank(chosenLevel);
    if (!field || rankChosen < 0) {
      return {
        valid: false,
        isCorrect: false,
        expected: field ? field.kind : null,
        chosen: chosenLevel || null,
        direction: 'invalid',
        feedback: 'Select Standard, Watch, or High-Stakes to evaluate this field.',
        whyNot: 'Choose one of the three risk levels before checking.'
      };
    }
    var expected = field.kind;
    var isCorrect = chosenLevel === expected;
    var direction = isCorrect ? 'match' : (rankChosen < riskRank(expected) ? 'under' : 'over');
    var fp = Object.prototype.hasOwnProperty.call(FIELD_PRACTICE, field.id) ? FIELD_PRACTICE[field.id] : null;
    var specific = fp && fp.triageWhy && fp.triageWhy[chosenLevel];
    var fallback = isCorrect
      ? 'Matched — this field is properly tagged.'
      : (direction === 'under'
        ? 'Under-flagged: missing the risk on "' + field.label + '" can expose private info or lock you into unfair terms.'
        : 'Over-flagged: treating "' + field.label + '" as higher risk than it is can stall routine forms and hide real traps.');
    var msg = specific || fallback;
    return {
      valid: true,
      isCorrect: isCorrect,
      expected: expected,
      chosen: chosenLevel,
      direction: direction,
      fieldLabel: field.label,
      feedback: msg,
      whyNot: isCorrect ? '' : msg
    };
  }

  function getFieldAuditPrompt(docId, fieldId, seedSuffix) {
    var field = getFieldById(docId, fieldId);
    if (!field) return null;
    var fp = Object.prototype.hasOwnProperty.call(FIELD_PRACTICE, field.id) ? FIELD_PRACTICE[field.id] : null;
    if (!fp) return null;
    return {
      docId: docId,
      fieldId: field.id,
      fieldLabel: field.label,
      actionPrompt: fp.actionPrompt,
      bestId: fp.bestId,
      choices: shuffleChoices(fp.choices, docId + ':' + field.id + ':' + (seedSuffix || 0))
    };
  }

  function evaluateFieldAction(docId, fieldId, chosenId) {
    var field = getFieldById(docId, fieldId);
    var fp = (field && Object.prototype.hasOwnProperty.call(FIELD_PRACTICE, field.id)) ? FIELD_PRACTICE[field.id] : null;
    if (!field || !fp || typeof chosenId !== 'string') {
      return { valid: false, isCorrect: false, chosenId: chosenId || null, bestId: fp ? fp.bestId : null, feedback: 'Choose an action for Sam Rivera first.', whyNot: '' };
    }
    var picked = null;
    for (var i = 0; i < fp.choices.length; i++) {
      if (fp.choices[i].id === chosenId) { picked = fp.choices[i]; break; }
    }
    if (!picked) {
      return { valid: false, isCorrect: false, chosenId: chosenId, bestId: fp.bestId, feedback: 'Option not found for this field.', whyNot: '' };
    }
    var isCorrect = picked.id === fp.bestId;
    var whyNot = isCorrect ? '' : (picked.whyNot || 'That move leaves Sam exposed or slows down the form unnecessarily.');
    return {
      valid: true,
      isCorrect: isCorrect,
      chosenId: picked.id,
      bestId: fp.bestId,
      feedback: isCorrect ? ('Protective move! ' + field.asking) : whyNot,
      whyNot: whyNot
    };
  }

  function getDocAuditCheck(docId, seedSuffix) {
    if (typeof docId !== 'string' || !Object.prototype.hasOwnProperty.call(DOC_AUDIT_CHECKS, docId)) return null;
    var chk = DOC_AUDIT_CHECKS[docId];
    return {
      id: chk.id,
      docId: chk.docId,
      title: chk.title,
      prompt: chk.prompt,
      bestId: chk.bestId,
      takeaway: chk.takeaway,
      choices: shuffleChoices(chk.choices, chk.id + ':' + (seedSuffix || 0))
    };
  }

  function evaluateAuditCheck(checkId, chosenId) {
    var chk = null;
    var ks = Object.keys(DOC_AUDIT_CHECKS);
    for (var i = 0; i < ks.length; i++) {
      if (DOC_AUDIT_CHECKS[ks[i]].id === checkId || ks[i] === checkId) {
        chk = DOC_AUDIT_CHECKS[ks[i]];
        break;
      }
    }
    if (!chk || typeof chosenId !== 'string') {
      return { valid: false, isCorrect: false, feedback: 'Select an audit action first.', whyNot: '' };
    }
    var picked = null;
    for (var j = 0; j < chk.choices.length; j++) {
      if (chk.choices[j].id === chosenId) { picked = chk.choices[j]; break; }
    }
    if (!picked) return { valid: false, isCorrect: false, feedback: 'Audit choice not found.', whyNot: '' };
    var isCorrect = picked.id === chk.bestId;
    return {
      valid: true,
      isCorrect: isCorrect,
      checkId: chk.id,
      docId: chk.docId,
      chosenId: picked.id,
      bestId: chk.bestId,
      feedback: isCorrect ? ('Audit passed! ' + chk.takeaway) : (picked.whyNot || 'Re-check for blanks, totals, and copies before signing.'),
      whyNot: isCorrect ? '' : (picked.whyNot || ''),
      takeaway: chk.takeaway
    };
  }

  // Strict PII safety detector: catches real-looking SSN, non-555 phone, non-example email,
  // and bank/routing/card digit patterns while ignoring Sam Rivera's reserved fictional data.
  function detectPII(text) {
    var raw = String(text == null ? '' : text);
    if (!raw.trim()) {
      return { hasPII: false, flags: [], summary: '' };
    }
    var flags = [];
    // Strip known Sam Rivera reserved fictional values before scanning
    var scrubbed = raw
      .replace(/000[-\s]?00[-\s]?0000/g, ' ')
      .replace(/\(207\)\s*555-0143/g, ' ')
      .replace(/\b207[-.\s]?555[-.\s]?0143\b/g, ' ')
      .replace(/sam\.rivera\.practice@example\.com/gi, ' ');

    // 1. Real-looking SSN pattern (3-2-4 digits not starting with 000/666/9xx, not 00 middle, not 0000 end)
    var ssnRe = /\b(?!000|666|9\d\d)\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/;
    var ssnLabeledRe = /\b(?:ssn|social\s*security(?:\s*number)?)\s*[:#=-]?\s*(?!000[-\s]?00[-\s]?0000)\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/i;
    if (ssnRe.test(scrubbed) || ssnLabeledRe.test(scrubbed)) {
      flags.push({
        flagType: 'ssn',
        label: 'Possible Social Security Number detected',
        advice: 'Remove any real SSN immediately. Use Sam Rivera\'s fictional placeholder (000-00-0000) or leave numbers out.'
      });
    }

    // 2. Real-looking phone number (10-digit US phone not using 555 fiction exchange)
    var phoneRe = /(?:^|[^\d])(?:\+?1[-.\s]?)?(?:\(\d{3}\)\s*|\d{3}[-.\s]+)(?!555\b)\d{3}[-.\s]+\d{4}\b/;
    if (phoneRe.test(scrubbed)) {
      flags.push({
        flagType: 'phone',
        label: 'Real-looking phone number detected',
        advice: 'Keep personal phone numbers out of practice forms. Use Sam Rivera\'s fictional 555 number: (207) 555-0143.'
      });
    }

    // 3. Real-looking email (any email whose domain is NOT example.com/org/net)
    var emailMatches = scrubbed.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || [];
    var hasRealEmail = false;
    for (var ei = 0; ei < emailMatches.length; ei++) {
      if (!/@(?:example\.(?:com|org|net)|test\.local)$/i.test(emailMatches[ei])) {
        hasRealEmail = true;
        break;
      }
    }
    if (hasRealEmail) {
      flags.push({
        flagType: 'email',
        label: 'Real-looking email address detected',
        advice: 'Keep real emails out of practice drafts. Use sam.rivera.practice@example.com for practice.'
      });
    }

    // 4. Bank routing / account / card number patterns
    var cardOrAcctRe = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b(?:routing|account|acct|bank|iban|card)\s*(?:number|no\.?|#|:)?\s*[:#=-]?\s*\d{6,17}\b/i;
    var longDigitsRe = /\b(?!0{9,})\d{9,17}\b/;
    if (cardOrAcctRe.test(scrubbed) || longDigitsRe.test(scrubbed.replace(/\b(?:000-00-0000|04\/12\/2008)\b/g, ''))) {
      // Avoid double-flagging a 9-digit unlabeled SSN already caught above unless bank keyword or >=10 digits
      var onlyNineDigitSsn = flags.some(function(f) { return f.flagType === 'ssn'; }) && !cardOrAcctRe.test(scrubbed) && !/\b\d{10,17}\b/.test(scrubbed);
      if (!onlyNineDigitSsn) {
        flags.push({
          flagType: 'bank',
          label: 'Possible bank, routing, or card number detected',
          advice: 'Never enter real bank account, routing, or card numbers in practice exercises. Keep all drafts fictional with Sam Rivera.'
        });
      }
    }

    return {
      hasPII: flags.length > 0,
      flags: flags,
      summary: flags.length > 0
        ? 'Practice safety alert: remove real personal details (' + flags.map(function(f) { return f.flagType.toUpperCase(); }).join(', ') + ') and keep practice fictional with Sam Rivera.'
        : ''
    };
  }

  // Deterministic ADA 3-Sentence Request Validator (Task -> Barrier -> Adjustment, 29 CFR 1630.9)
  var DIAGNOSIS_RE = /\b(?:autis(?:m|tic)|asperger(?:'?s)?|adhd|add\b|dyslexi(?:a|c)|dyscalculia|dysgraphia|bipolar|depress(?:ion|ed)|anxiety\s+disorder|ptsd|ocd\b|schizophreni(?:a|c)|epileps(?:y|tic)|diabet(?:es|ic)|tourette(?:'?s)?|cerebral\s+palsy|down\s+syndrome|learning\s+disability|diagnosed\s+with|my\s+diagnosis|medical\s+condition|doctor\s+diagnosed)\b/i;
  var TASK_HINT_RE = /\b(?:work|job|task|shift|stock|register|clean|sort|count|read|write|check|deliver|serve|help|build|desk|team|customer|order|display|pack|computer|email|kitchen|office|warehouse|store|class|project|schedule|great|strong|good|reliable|accurate|handle|manage|do|finish|complete)\b/i;
  var BARRIER_HINT_RE = /\b(?:hard|difficult|challeng|struggle|barrier|overwhelm|distract|loud|noise|noisy|fast|rush|spoken|verbal|out\s+loud|remember|hold\s+onto|forget|bright|light|glare|stand|standing|fatigue|tired|pain|small\s+print|blur|change|shift|sudden|crowd|interrupt|multi-?step|without|slow|confus|trouble|can'?t|cannot|makes?\s+it)\b/i;
  var ADJUSTMENT_HINT_RE = /\b(?:could\s+i|can\s+i|could\s+we|can\s+we|would\s+it|request|ask|written|checklist|list|photo|picture|email|text|headphone|earplug|quiet|corner|break|breaks|rest|sit|stool|chair|timer|reminder|calendar|visual|card|guide|step-by-step|large\s+print|screen\s+reader|zoom|caption|extra\s+time|flexible|schedule|job\s+coach|mentor|adjust|accommodat|swap|move|use|have|get|keep|split)\b/i;

  function wordCount(str) {
    var s = String(str || '').trim();
    if (!s) return 0;
    return s.split(/\s+/).filter(Boolean).length;
  }

  function ensurePeriod(str, endMark) {
    var s = String(str || '').trim();
    if (!s) return '';
    if (/[.!?]$/.test(s)) return s;
    return s + (endMark || '.');
  }

  function evaluateAccommodationRequest(task, barrier, adjustment) {
    var tStr = String(task == null ? '' : task).trim();
    var bStr = String(barrier == null ? '' : barrier).trim();
    var aStr = String(adjustment == null ? '' : adjustment).trim();
    var combined = [tStr, bStr, aStr].filter(Boolean).join(' ');

    var pii = detectPII(combined);
    var hasDiagnosis = DIAGNOSIS_RE.test(combined);

    var taskPassed = tStr.length >= 12 && wordCount(tStr) >= 3 && TASK_HINT_RE.test(tStr);
    var barrierPassed = bStr.length >= 12 && wordCount(bStr) >= 3 && BARRIER_HINT_RE.test(bStr);
    var adjustmentPassed = aStr.length >= 12 && wordCount(aStr) >= 3 && ADJUSTMENT_HINT_RE.test(aStr);

    var taskTip = taskPassed
      ? 'Clear work task or strength named.'
      : (tStr.length === 0
        ? 'Sentence 1: Name the job task or strength (e.g., "I do accurate work stocking shelves").'
        : 'Add a concrete job task or role detail so the manager sees what you are doing well.');
    var barrierTip = barrierPassed
      ? 'Concrete workplace barrier described clearly.'
      : (bStr.length === 0
        ? 'Sentence 2: Name the work barrier (e.g., "Spoken multi-step directions are hard for me to hold onto").'
        : 'Describe the specific work condition that gets in the way (noise, spoken instructions, standing, fast routine shifts).');
    var adjustmentTip = adjustmentPassed
      ? 'Actionable, specific workplace adjustment proposed.'
      : (aStr.length === 0
        ? 'Sentence 3: Propose a practical adjustment (e.g., "Could I get a written checklist or photo of the board?").'
        : 'Propose a specific tool, format, or routine change you are asking to try (checklist, quiet spot, headphones, brief break).');
    var privacyTip = !hasDiagnosis
      ? 'No unprompted medical diagnosis shared — focused cleanly on job task, barrier, and adjustment.'
      : 'Privacy reminder: you included a medical/diagnosis term. Under 29 CFR 1630.9 you do NOT need to share a diagnosis to request an adjustment — focusing only on the work barrier keeps medical details private unless you choose to disclose.';
    var piiTip = !pii.hasPII
      ? 'PII safety check clear — no real SSN, phone, email, or bank numbers detected.'
      : pii.summary;

    var coreScore = (taskPassed ? 1 : 0) + (barrierPassed ? 1 : 0) + (adjustmentPassed ? 1 : 0);
    var allThreeParts = taskPassed && barrierPassed && adjustmentPassed;
    var readyToSend = allThreeParts && !pii.hasPII;
    var cleanPrivacyReady = readyToSend && !hasDiagnosis;

    var composedScript = [
      tStr ? ensurePeriod(tStr, '.') : '',
      bStr ? ensurePeriod(bStr, '.') : '',
      aStr ? ensurePeriod(aStr, '?') : ''
    ].filter(Boolean).join(' ');

    var emailTemplate = composedScript
      ? 'Subject: Quick request to support my work on shift\n\nHi [Supervisor Name],\n\n' + composedScript + '\n\nThank you — I am glad to talk briefly about what works best for the team.\n\nBest,\n' + PERSONA.name
      : '';

    var feedback = pii.hasPII
      ? pii.summary
      : (cleanPrivacyReady
        ? 'Strong 3-sentence ADA request! All three parts (Task, Barrier, Adjustment) are clear, practical, and keep your medical privacy protected.'
        : (readyToSend
          ? 'All 3 parts are complete and PII-safe! Note: you mentioned a diagnosis — remember you can edit it to describe only the work barrier if you prefer to keep your diagnosis private.'
          : 'Complete all three parts (Task, Barrier, Adjustment) to build a ready-to-use request.'));

    return {
      checks: {
        task: { passed: taskPassed, tip: taskTip },
        barrier: { passed: barrierPassed, tip: barrierTip },
        adjustment: { passed: adjustmentPassed, tip: adjustmentTip },
        privacyNoDiagnosis: { passed: !hasDiagnosis, tip: privacyTip },
        piiSafe: { passed: !pii.hasPII, flags: pii.flags, tip: piiTip }
      },
      pii: pii,
      hasDiagnosis: hasDiagnosis,
      score: coreScore,
      maxScore: 3,
      allThreeParts: allThreeParts,
      readyToSend: readyToSend,
      cleanPrivacyReady: cleanPrivacyReady,
      composedScript: composedScript,
      emailTemplate: emailTemplate,
      feedback: feedback
    };
  }

  function getDocumentMastery(docId, fieldTriage, fieldAction, auditDone) {
    var doc = getDocumentById(docId);
    if (!doc) return { totalFields: 0, triagedCount: 0, actionCount: 0, verifiedCount: 0, auditPassed: false, pct: 0, mastered: false };
    var ft = safeMap(fieldTriage);
    var fa = safeMap(fieldAction);
    var ad = safeMap(auditDone);
    var triagedCount = 0;
    var actionCount = 0;
    var verifiedCount = 0;
    for (var i = 0; i < doc.fields.length; i++) {
      var key = doc.id + ':' + doc.fields[i].id;
      var tRec = safeObj(ft[key]);
      var aRec = safeObj(fa[key]);
      if (tRec.isCorrect === true) triagedCount++;
      if (aRec.isCorrect === true) actionCount++;
      if (tRec.isCorrect === true && aRec.isCorrect === true) verifiedCount++;
    }
    var auditRec = safeObj(ad[doc.id]);
    var auditPassed = auditRec.isCorrect === true;
    var totalUnits = doc.fields.length + 1;
    var doneUnits = verifiedCount + (auditPassed ? 1 : 0);
    var pct = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;
    return {
      totalFields: doc.fields.length,
      triagedCount: triagedCount,
      actionCount: actionCount,
      verifiedCount: verifiedCount,
      auditPassed: auditPassed,
      pct: pct,
      mastered: verifiedCount === doc.fields.length && auditPassed
    };
  }

  function sanitizeState(raw) {
    var d = safeObj(raw);
    var rawView = typeof d.view === 'string' ? d.view : 'home';
    var view = (rawView === 'home' || rawView === 'doc' || rawView === 'scenarios' || rawView === 'scripts' || rawView === 'work') ? rawView : 'home';
    var doc = getDocumentById(d.docId) || DOCS[0];
    var docMode = d.docMode === 'practice' ? 'practice' : 'decode';
    var docFilter = d.docFilter === 'flagged' ? 'flagged' : 'all';
    var rawAda = safeObj(d.adaDraft);
    return {
      view: view,
      docId: doc.id,
      docMode: docMode,
      docFilter: docFilter,
      activeFieldId: typeof d.activeFieldId === 'string' ? d.activeFieldId : '',
      seenDocs: safeMap(d.seenDocs),
      revealed: safeMap(d.revealed),
      fieldTriage: safeMap(d.fieldTriage),
      fieldAction: safeMap(d.fieldAction),
      auditDone: safeMap(d.auditDone),
      scenCurrent: safeIndex(d.scenCurrent, SCENARIOS.length),
      scenDone: safeMap(d.scenDone),
      scenRetry: safeMap(d.scenRetry),
      workCurrent: safeIndex(d.workCurrent, WORK_SCENARIOS.length),
      workDone: safeMap(d.workDone),
      workOpen: safeMap(d.workOpen),
      rehearsed: safeMap(d.rehearsed),
      copiedIdx: typeof d.copiedIdx === 'number' && isFinite(d.copiedIdx) ? Math.floor(d.copiedIdx) : -1,
      adaDraft: {
        task: typeof rawAda.task === 'string' ? rawAda.task : '',
        barrier: typeof rawAda.barrier === 'string' ? rawAda.barrier : '',
        adjustment: typeof rawAda.adjustment === 'string' ? rawAda.adjustment : '',
        previewMode: rawAda.previewMode === 'email' ? 'email' : 'spoken',
        verified: !!rawAda.verified
      },
      _xpFields: safeMap(d._xpFields),
      _xpDocMastered: safeMap(d._xpDocMastered),
      _xpScen: safeMap(d._xpScen),
      _xpWork: safeMap(d._xpWork),
      _xpAda: !!d._xpAda
    };
  }

  function computeReadiness(rawState) {
    var st = sanitizeState(rawState);
    var totalFields = 0;
    var revealedCount = 0;
    var auditedFieldsCount = 0;
    var docsExplored = 0;
    var docsMastered = 0;
    for (var i = 0; i < DOCS.length; i++) {
      var doc = DOCS[i];
      if (st.seenDocs[doc.id]) docsExplored++;
      var m = getDocumentMastery(doc.id, st.fieldTriage, st.fieldAction, st.auditDone);
      totalFields += doc.fields.length;
      auditedFieldsCount += m.verifiedCount;
      if (m.mastered) docsMastered++;
      for (var j = 0; j < doc.fields.length; j++) {
        if (st.revealed[doc.id + ':' + doc.fields[j].id]) revealedCount++;
      }
    }
    var scenSolved = 0;
    var scenAttempted = 0;
    var scenMissed = 0;
    for (var si = 0; si < SCENARIOS.length; si++) {
      var rec = st.scenDone[SCENARIOS[si].id];
      if (rec && typeof rec === 'object' && !Array.isArray(rec)) {
        scenAttempted++;
        if (rec.ok) scenSolved++;
        else scenMissed++;
      }
    }
    var workConsidered = 0;
    for (var wi = 0; wi < WORK_SCENARIOS.length; wi++) {
      if (st.workDone[WORK_SCENARIOS[wi].id]) workConsidered++;
    }
    var adaEval = evaluateAccommodationRequest(st.adaDraft.task, st.adaDraft.barrier, st.adaDraft.adjustment);
    var adaComplete = !!(st.adaDraft.verified || st._xpAda || adaEval.readyToSend);
    var overallPct = Math.round((
      (DOCS.length ? (docsExplored / DOCS.length) : 0) +
      (totalFields ? (Math.max(revealedCount, auditedFieldsCount) / totalFields) : 0) +
      (SCENARIOS.length ? (scenSolved / SCENARIOS.length) : 0) +
      (WORK_SCENARIOS.length ? (workConsidered / WORK_SCENARIOS.length) : 0)
    ) / 4 * 100);
    return {
      totalDocs: DOCS.length,
      docsExplored: docsExplored,
      docsMastered: docsMastered,
      totalFields: totalFields,
      revealedCount: revealedCount,
      auditedFieldsCount: auditedFieldsCount,
      totalScenarios: SCENARIOS.length,
      scenAttempted: scenAttempted,
      scenSolved: scenSolved,
      scenMissed: scenMissed,
      totalWorkCases: WORK_SCENARIOS.length,
      workConsidered: workConsidered,
      adaComplete: adaComplete,
      overallPct: overallPct
    };
  }

  var PAPERTRAIL_ENGINE = {
    PERSONA: PERSONA,
    RISK_LEVELS: ['normal', 'watch', 'danger'],
    DOCS_COUNT: DOCS.length,
    SCENARIOS_COUNT: SCENARIOS.length,
    ADA_TEMPLATES: ADA_TEMPLATES,
    seededHash: seededHash,
    shuffleChoices: shuffleChoices,
    shuffleScenarioChoices: shuffleChoices,
    getDocumentById: getDocumentById,
    getFieldById: getFieldById,
    evaluateRiskTriage: evaluateRiskTriage,
    getFieldAuditPrompt: getFieldAuditPrompt,
    evaluateFieldAction: evaluateFieldAction,
    getDocAuditCheck: getDocAuditCheck,
    evaluateAuditCheck: evaluateAuditCheck,
    detectPII: detectPII,
    evaluateAccommodationRequest: evaluateAccommodationRequest,
    getDocumentMastery: getDocumentMastery,
    computeReadiness: computeReadiness,
    sanitizeState: sanitizeState
  };

  if (typeof window !== 'undefined') {
    window.PaperTrailPure = PAPERTRAIL_ENGINE;
  }

  // Scoped styling for focus rings, GPU-composited SVG live motion, reduced motion, responsive grids, and .theme-contrast parity
  (function injectPaperTrailStyles() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-papertrail-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-papertrail-css';
    st.textContent = [
      '@keyframes alloPtChainFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-24}}',
      '@keyframes alloPtNodeBeacon{0%,100%{opacity:0.16;transform:scale(0.88)}50%{opacity:0.46;transform:scale(1.24)}}',
      '@keyframes alloPtLoupeGlint{0%,100%{opacity:0.35;transform:rotate(-5deg) scale(0.96)}50%{opacity:0.96;transform:rotate(6deg) scale(1.05)}}',
      '@keyframes alloPtBarSheen{0%{transform:translateX(-90px);opacity:0}18%{opacity:0.44}82%{opacity:0.44}100%{transform:translateX(330px);opacity:0}}',
      '@keyframes alloPtAuraBreathe{0%,100%{opacity:0.14}50%{opacity:0.32}}',
      '.allo-pt-shell{box-sizing:border-box;min-width:0;overflow-wrap:anywhere;}',
      '.allo-pt-shell *,.allo-pt-shell *::before,.allo-pt-shell *::after{box-sizing:border-box;}',
      '.allo-pt-shell button:focus-visible,.allo-pt-shell textarea:focus-visible,.allo-pt-shell input:focus-visible,.allo-pt-shell [tabindex]:focus-visible{outline:3px solid #d97706;outline-offset:2px;}',
      '.allo-pt-textarea{width:100%;min-height:68px;resize:vertical;border-radius:10px;padding:9px 11px;font-family:inherit;font-size:13.5px;line-height:1.45;}',
      '.allo-pt-card{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
      '.allo-pt-card:hover{transform:translateY(-1px);}',
      '.allo-pt-tab[aria-selected="true"]{font-weight:900;}',
      '.allo-pt-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}',
      '.allo-pt-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}',
      '.allo-pt-shell .allo-pt-chain-flow{animation:alloPtChainFlow 2.6s linear infinite;will-change:stroke-dashoffset;}',
      '.allo-pt-shell .allo-pt-beacon{transform-box:fill-box;transform-origin:center;animation:alloPtNodeBeacon 3.0s ease-in-out infinite;will-change:transform,opacity;}',
      '.allo-pt-shell .allo-pt-loupe-glint{transform-box:fill-box;transform-origin:center;animation:alloPtLoupeGlint 4.2s ease-in-out infinite;will-change:transform,opacity;}',
      '.allo-pt-shell .allo-pt-bar-sheen{animation:alloPtBarSheen 5.2s cubic-bezier(0.4,0,0.2,1) infinite;will-change:transform,opacity;}',
      '.allo-pt-shell .allo-pt-aura{animation:alloPtAuraBreathe 3.8s ease-in-out infinite;will-change:opacity;}',
      '@media(max-width:700px){.allo-pt-grid-2,.allo-pt-grid-3{grid-template-columns:minmax(0,1fr);}}',
      '@media(prefers-reduced-motion:reduce){.allo-pt-card,.allo-pt-shell *{transition:none!important;animation:none!important;transform:none!important;}.allo-pt-shell .allo-pt-bar-sheen{display:none!important;}}',
      '.theme-contrast .allo-pt-shell{background:#000000!important;color:#ffff00!important;border-color:#ffff00!important;}',
      '.theme-contrast .allo-pt-shell button:focus-visible,.theme-contrast .allo-pt-shell textarea:focus-visible,.theme-contrast .allo-pt-shell input:focus-visible{outline:3px solid #ffffff!important;outline-offset:2px;}',
      '.theme-contrast .allo-pt-surface{background:#000000!important;border-color:#ffff00!important;color:#ffff00!important;}',
      '.theme-contrast .allo-pt-textarea{background:#000000!important;border:2px solid #ffff00!important;color:#ffffff!important;}',
      '.theme-contrast .allo-pt-btn-primary{background:#ffff00!important;color:#000000!important;border:2px solid #ffff00!important;}',
      '.theme-contrast .allo-pt-shell .allo-pt-bar-sheen,.theme-contrast .allo-pt-shell .allo-pt-loupe-glint,.theme-contrast .allo-pt-shell .allo-pt-aura{display:none!important;animation:none!important;}',
      '.theme-contrast .allo-pt-shell .allo-pt-chain-flow,.theme-contrast .allo-pt-shell .allo-pt-beacon{animation:none!important;}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  window.StemLab.registerTool('paperTrail', {
    icon: '\uD83D\uDDC4\uFE0F',
    label: 'PaperTrail: Official Documents',
    desc: 'Practice reading and completing the documents adult life runs on — job applications, W-4s, leases, medical intake, permits, and your own IEP meeting invitation. Every field is decoded in plain language, the boxes that can cost you are flagged, and all practice uses a fictional identity because you should never type real personal information into a practice tool.',
    color: 'amber',
    category: 'applied',
    _engine: PAPERTRAIL_ENGINE,
    questHooks: [
      { id: 'pt_decode', label: 'Decode fields across two different documents', icon: '📄', check: function(d) { return d && d.seenDocs && typeof d.seenDocs === 'object' && !Array.isArray(d.seenDocs) && Object.keys(d.seenDocs).length >= 2; }, progress: function(d) { return ((d && d.seenDocs && typeof d.seenDocs === 'object' && !Array.isArray(d.seenDocs) && Object.keys(d.seenDocs).length) || 0) + '/2 documents'; } },
      { id: 'pt_judgment', label: 'Work through 4 pressure scenarios', icon: '🛡️', check: function(d) { return d && d.scenDone && typeof d.scenDone === 'object' && !Array.isArray(d.scenDone) && Object.keys(d.scenDone).length >= 4; }, progress: function(d) { return ((d && d.scenDone && typeof d.scenDone === 'object' && !Array.isArray(d.scenDone) && Object.keys(d.scenDone).length) || 0) + '/4 scenarios'; } },
      { id: 'pt_work', label: 'Think through the disclosure decisions', icon: '⚖️', check: function(d) { return d && d.workDone && typeof d.workDone === 'object' && !Array.isArray(d.workDone) && Object.keys(d.workDone).length >= 3; }, progress: function(d) { return ((d && d.workDone && typeof d.workDone === 'object' && !Array.isArray(d.workDone) && Object.keys(d.workDone).length) || 0) + '/3 decisions'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var t = (ctx.t && function(k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k) ? (fb != null ? fb : k) : v; }) || function(k, fb) { return fb != null ? fb : k; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = safeObj(ctx.toolData);
      var setLabToolData = typeof ctx.setToolData === 'function' ? ctx.setToolData : function() {};
      var setStemLabTool = ctx.setStemLabTool;
      var announceToSR = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function() {};
      var awardXP = function(n, why) { if (ctx.awardXP) ctx.awardXP('paperTrail', n, why); };

      // Dark app chrome places plugin content on a light card; keep darkApp === light
      // (pinned by tests/paper_trail.test.js) and reserve dark surface for contrast theme.
      var isContrast = !!(ctx.isContrast || ctx.theme === 'contrast');
      var isDark = false;
      var isEmbedded = !!ctx.embedded;
      var reduceMotion = !!ctx.reduceMotion || isContrast;

      var st = PAPERTRAIL_ENGINE.sanitizeState(labToolData.paperTrail);
      var d = safeObj(labToolData.paperTrail);
      var xpSentRef = React.useRef({
        fields: Object.create(null),
        docMastered: Object.create(null),
        scen: Object.create(null),
        work: Object.create(null),
        ada: false
      });
      var copyTimerRef = React.useRef(null);
      var adaCopyTimerRef = React.useRef(null);
      var aliveRef = React.useRef(true);
      var adaCopiedState = React.useState(false);
      var adaCopied = adaCopiedState[0];
      var setAdaCopied = adaCopiedState[1];

      React.useEffect(function() {
        aliveRef.current = true;
        return function() {
          aliveRef.current = false;
          if (copyTimerRef.current) { clearTimeout(copyTimerRef.current); copyTimerRef.current = null; }
          if (adaCopyTimerRef.current) { clearTimeout(adaCopyTimerRef.current); adaCopyTimerRef.current = null; }
        };
      }, []);

      function setPT(patch) {
        setLabToolData(function(prev) {
          var prevSafe = safeObj(prev);
          var prior = safeObj(prevSafe.paperTrail);
          var nextPatch = typeof patch === 'function' ? patch(prior) : patch;
          if (!nextPatch || typeof nextPatch !== 'object') return prevSafe;
          return Object.assign({}, prevSafe, { paperTrail: Object.assign({}, prior, nextPatch) });
        });
      }

      function speakText(text) {
        var clean = String(text || '').trim();
        if (!clean) return;
        if ((typeof window !== 'undefined' && typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) || (typeof window !== 'undefined' && window._alloGlobalMute)) {
          return;
        }
        if (typeof ctx.callTTS === 'function') {
          try {
            ctx.callTTS(clean, undefined, undefined, { force: true });
          } catch (_) {}
        } else {
          announceToSR(clean);
        }
      }

      function fallbackCopy(text) {
        try {
          if (typeof document === 'undefined' || !document.body) return false;
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', 'true');
          ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          var copiedOk = false;
          try { copiedOk = !!document.execCommand('copy'); } catch (_) { copiedOk = false; }
          document.body.removeChild(ta);
          return copiedOk;
        } catch (_) { return false; }
      }

      function copyTextValue(text, onSuccess, onFailure) {
        try {
          if (typeof window !== 'undefined' && typeof window.alloCopyText === 'function') {
            Promise.resolve(window.alloCopyText(text)).then(function(res) {
              if (res !== false) onSuccess();
              else if (fallbackCopy(text)) onSuccess();
              else onFailure();
            }).catch(function() {
              if (fallbackCopy(text)) onSuccess();
              else onFailure();
            });
            return;
          }
          if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text).then(function() {
              onSuccess();
            }).catch(function() {
              if (fallbackCopy(text)) onSuccess();
              else onFailure();
            });
            return;
          }
        } catch (_) {}
        if (fallbackCopy(text)) onSuccess();
        else onFailure();
      }

      var view = st.view;
      var seenDocs = st.seenDocs;
      var revealed = st.revealed;
      var fieldTriage = st.fieldTriage;
      var fieldAction = st.fieldAction;
      var auditDone = st.auditDone;
      var scenDone = st.scenDone;
      var scenRetry = st.scenRetry;
      var workDone = st.workDone;
      var workOpen = st.workOpen;
      var rehearsed = st.rehearsed;
      var docMode = st.docMode;
      var docFilter = st.docFilter;
      var copiedIdx = st.copiedIdx;
      var adaDraft = st.adaDraft;

      var readiness = PAPERTRAIL_ENGINE.computeReadiness(st);
      var totalFields = readiness.totalFields;
      var decodedDocsCount = readiness.docsExplored;
      var revealedCount = readiness.revealedCount;
      var auditedFieldsCount = readiness.auditedFieldsCount;
      var scenDoneCount = readiness.scenAttempted;
      var scenGoodCount = readiness.scenSolved;
      var scenMissedCount = readiness.scenMissed;
      var workDoneCount = readiness.workConsidered;

      // Honest mastery XP: opening a document records seenDocs for quest/UI exploration
      // without granting free click-to-open XP. XP is earned by verified field audits,
      // solved pressure scenarios, disclosure reflection, and validated ADA requests.
      function openDoc(docId) {
        var preferredMode = arguments.length > 1 ? arguments[1] : null;
        var target = PAPERTRAIL_ENGINE.getDocumentById(docId) || DOCS[0];
        if (!target) return;
        setPT(function(prior) {
          var prevSeen = safeMap(prior.seenDocs);
          var nextSeen = prevSeen[target.id] ? prevSeen : Object.assign({}, prevSeen);
          nextSeen[target.id] = true;
          var patch = { view: 'doc', docId: target.id, seenDocs: nextSeen, copiedIdx: -1 };
          if (preferredMode === 'practice' || preferredMode === 'decode') patch.docMode = preferredMode;
          return patch;
        });
      }

      React.useEffect(function() {
        if (view !== 'doc') return;
        var target = PAPERTRAIL_ENGINE.getDocumentById(st.docId) || DOCS[0];
        if (!target || seenDocs[target.id]) return;
        setPT(function(prior) {
          var prevSeen = safeMap(prior.seenDocs);
          if (prevSeen[target.id]) return null;
          var nextSeen = Object.assign({}, prevSeen);
          nextSeen[target.id] = true;
          return { seenDocs: nextSeen };
        });
      }, [view, st.docId]);

      // Full Light / Dark / High-Contrast WCAG 2.2 AA palette
      var pal = isContrast ? {
        canvas: '#000000',
        heroBg: '#000000',
        panel: '#000000',
        panelAlt: '#000000',
        card: '#000000',
        border: '#ffff00',
        borderSoft: '#ffff00',
        text: '#ffff00',
        textStrong: '#ffffff',
        muted: '#ffff00',
        accent: '#ffff00',
        accentBg: '#000000',
        btnBg: '#ffff00',
        btnText: '#000000',
        watchText: '#ffff00',
        watchBg: '#000000',
        watchBorder: '#ffff00',
        dangerText: '#ffff00',
        dangerBg: '#000000',
        dangerBorder: '#ffff00',
        safeText: '#ffff00',
        safeBg: '#000000',
        safeBorder: '#ffff00',
        svgBg: '#000000',
        svgPaper: '#000000',
        svgInk: '#ffff00',
        svgMuted: '#ffffff',
        svgTrack: '#333333',
        shadow: 'none'
      } : isDark ? {
        canvas: '#0b1120',
        heroBg: 'linear-gradient(135deg, #172033 0%, #0f172a 62%, #1c1917 100%)',
        panel: '#151e31',
        panelAlt: '#0f172a',
        card: 'rgba(245,158,11,0.10)',
        border: 'rgba(251,191,36,0.34)',
        borderSoft: 'rgba(148,163,184,0.28)',
        text: '#f1f5f9',
        textStrong: '#ffffff',
        muted: '#cbd5e1',
        accent: '#fbbf24',
        accentBg: 'rgba(251,191,36,0.15)',
        btnBg: '#d97706',
        btnText: '#ffffff',
        watchText: '#fcd34d',
        watchBg: 'rgba(245,158,11,0.15)',
        watchBorder: 'rgba(251,191,36,0.45)',
        dangerText: '#fda4af',
        dangerBg: 'rgba(225,29,72,0.16)',
        dangerBorder: 'rgba(251,113,133,0.50)',
        safeText: '#6ee7b7',
        safeBg: 'rgba(16,185,129,0.16)',
        safeBorder: 'rgba(52,211,153,0.50)',
        svgBg: '#0f172a',
        svgPaper: '#1e293b',
        svgInk: '#f8fafc',
        svgMuted: '#cbd5e1',
        svgTrack: '#334155',
        shadow: '0 8px 24px rgba(2,6,23,0.42)'
      } : {
        canvas: '#fbf8f2',
        heroBg: 'linear-gradient(135deg, #ffffff 0%, #fef9ee 65%, #fdf2dc 100%)',
        panel: '#ffffff',
        panelAlt: '#f8f5ee',
        card: '#fffbeb',
        border: '#d6c3a3',
        borderSoft: '#e5dac7',
        text: '#1e293b',
        textStrong: '#0f172a',
        muted: '#475569',
        accent: '#92400e',
        accentBg: '#fef3c7',
        btnBg: '#92400e',
        btnText: '#ffffff',
        watchText: '#92400e',
        watchBg: '#fef3c7',
        watchBorder: '#d97706',
        dangerText: '#9f1239',
        dangerBg: '#fff1f2',
        dangerBorder: '#e11d48',
        safeText: '#065f46',
        safeBg: '#ecfdf5',
        safeBorder: '#059669',
        svgBg: '#f8f5ee',
        svgPaper: '#ffffff',
        svgInk: '#0f172a',
        svgMuted: '#475569',
        svgTrack: '#e2e8f0',
        shadow: '0 4px 16px rgba(15,23,42,0.06)'
      };

      var KIND = {
        normal: {
          label: __alloT('stem.paperTrail.kind_normal', 'Standard'),
          short: __alloT('stem.paperTrail.kind_normal_short', 'Standard'),
          color: pal.muted,
          bg: 'transparent',
          border: pal.borderSoft,
          bar: isContrast ? '#ffffff' : (isDark ? '#64748b' : '#94a3b8')
        },
        watch: {
          label: __alloT('stem.paperTrail.kind_watch', 'Read carefully'),
          short: __alloT('stem.paperTrail.kind_watch_short', 'Watch'),
          color: pal.watchText,
          bg: pal.watchBg,
          border: pal.watchBorder,
          bar: isContrast ? '#ffff00' : (isDark ? '#fbbf24' : '#d97706')
        },
        danger: {
          label: __alloT('stem.paperTrail.kind_danger', 'This one can cost you'),
          short: __alloT('stem.paperTrail.kind_danger_short', 'High-stakes'),
          color: pal.dangerText,
          bg: pal.dangerBg,
          border: pal.dangerBorder,
          bar: isContrast ? '#ffff00' : (isDark ? '#fb7185' : '#e11d48')
        }
      };

      function backBtn(target, label) {
        return h('button', {
          type: 'button',
          onClick: function() { if (target === null) { if (typeof setStemLabTool === 'function') setStemLabTool(null); } else setPT({ view: target }); },
          className: 'allo-pt-surface',
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10,
            padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', minHeight: 34,
            background: pal.panel, border: '1px solid ' + pal.border, color: pal.textStrong
          }
        }, '← ' + label);
      }

      function renderSpeakBtn(text, ariaText) {
        return h('button', {
          type: 'button',
          onClick: function() { speakText(text); },
          'aria-label': ariaText || t('stem.papertrail.read_aloud_aria', 'Read this section aloud'),
          className: 'allo-pt-surface',
          style: {
            display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 8,
            padding: '5px 10px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', minHeight: 30,
            background: pal.panel, border: '1px solid ' + pal.border, color: pal.textStrong
          }
        }, h('span', { 'aria-hidden': 'true' }, '🔊'), t('stem.papertrail.read_aloud', 'Read aloud'));
      }

      // Bespoke inline SVG emblem: Warm archival dossier sheet + risk ribbons + brass magnifying lens
      function renderHeroEmblem() {
        return h('svg', {
          width: 48, height: 48, viewBox: '0 0 48 48', role: 'img',
          'aria-label': __alloT('stem.paperTrail.emblem_alt', 'PaperTrail official document decoder emblem'),
          style: { flexShrink: 0, display: 'block' }
        },
          h('defs', null,
            h('linearGradient', { id: 'pt-emblem-plaque', x1: '0', y1: '0', x2: '1', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#fffbeb' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#fde68a' })
            ),
            h('linearGradient', { id: 'pt-emblem-sheet', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#ffffff' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#f8f5ee' })
            ),
            h('linearGradient', { id: 'pt-emblem-brass', x1: '0', y1: '0', x2: '1', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#ffff00' : '#d97706' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#ffff00' : '#78350f' })
            )
          ),
          h('rect', { x: 2, y: 2, width: 44, height: 44, rx: 12, fill: 'url(#pt-emblem-plaque)', stroke: pal.border, strokeWidth: 1.5 }),
          !isContrast && h('path', { d: 'M13 11h15l7 7v23a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2z', fill: '#78350f', opacity: 0.12 }),
          h('path', { d: 'M11.5 8.5h15.5l7 7v23.5a2 2 0 0 1-2 2H11.5a2 2 0 0 1-2-2V10.5a2 2 0 0 1 2-2z', fill: 'url(#pt-emblem-sheet)', stroke: pal.svgInk, strokeWidth: 1.5 }),
          h('path', { d: 'M27 8.5v7h7', fill: isContrast ? '#000000' : '#f3ead8', stroke: pal.svgInk, strokeWidth: 1.4, strokeLinejoin: 'round' }),
          // Left provenance chain dots + field risk ribbons
          h('circle', { cx: 13.5, cy: 18.2, r: 1.3, fill: pal.svgMuted }),
          h('rect', { x: 16.5, y: 17, width: 10.5, height: 2.4, rx: 1.2, fill: pal.svgMuted }),
          h('circle', { cx: 13.5, cy: 23.8, r: 1.4, fill: KIND.watch.bar }),
          h('rect', { x: 16.5, y: 22.3, width: 13.5, height: 3, rx: 1.4, fill: KIND.watch.bar }),
          h('circle', { cx: 13.5, cy: 29.8, r: 1.4, fill: KIND.danger.bar }),
          h('rect', { x: 16.5, y: 28.3, width: 11.5, height: 3, rx: 1.4, fill: KIND.danger.bar }),
          h('line', { x1: 13, y1: 35.5, x2: 24, y2: 35.5, stroke: pal.svgInk, strokeWidth: 1.3, strokeDasharray: '2 2', className: reduceMotion ? undefined : 'allo-pt-chain-flow' }),
          // Sculpted brass inspection loupe with active halo & animated archival specular glint
          !reduceMotion && h('circle', { cx: 33, cy: 32, r: 8.8, fill: '#f59e0b', opacity: 0.22, className: 'allo-pt-beacon' }),
          h('circle', { cx: 33, cy: 32, r: 6.8, fill: pal.svgPaper, stroke: 'url(#pt-emblem-brass)', strokeWidth: 2.3 }),
          !reduceMotion && h('path', { d: 'M29.4 28.5 A4.5 4.5 0 0 1 34.5 27.6', fill: 'none', stroke: '#ffffff', strokeWidth: 1.35, strokeLinecap: 'round', opacity: 0.88, className: 'allo-pt-loupe-glint' }),
          !reduceMotion && h('circle', { cx: 35.4, cy: 28.6, r: 1.05, fill: '#fef3c7', opacity: 0.85, className: 'allo-pt-loupe-glint' }),
          h('line', { x1: 38, y1: 37, x2: 42.4, y2: 41.4, stroke: 'url(#pt-emblem-brass)', strokeWidth: 2.8, strokeLinecap: 'round' }),
          h('path', { d: 'M30.5 32.1l1.8 1.8 3.3-3.5', fill: 'none', stroke: pal.safeText, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' })
        );
      }

      // Unified Hero Workbench Header + WAI-ARIA tablist across views
      function renderWorkbenchHeader(activeTab, subBack) {
        var tabs = [
          { id: 'home', label: __alloT('stem.paperTrail.tab_docs', 'Documents'), badge: decodedDocsCount + '/' + DOCS.length },
          { id: 'scenarios', label: __alloT('stem.paperTrail.tab_scenarios', 'Pressure'), badge: scenGoodCount + '/' + SCENARIOS.length },
          { id: 'scripts', label: __alloT('stem.paperTrail.tab_scripts', 'Scripts'), badge: HELP_SCRIPTS.length },
          { id: 'work', label: __alloT('stem.paperTrail.tab_work', 'Work Rights'), badge: workDoneCount + '/' + WORK_SCENARIOS.length }
        ];
        return h('header', {
          className: 'allo-pt-surface',
          style: {
            background: pal.heroBg, border: '1px solid ' + pal.border, borderRadius: 16,
            padding: '14px 16px', marginBottom: 14, boxShadow: pal.shadow
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 } },
              subBack ? subBack : (!isEmbedded ? backBtn(null, __alloT('stem.paperTrail.tools', 'Tools')) : null),
              h('span', {
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                  borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '0.03em',
                  background: pal.accentBg, color: pal.accent, border: '1px solid ' + pal.border
                }
              }, __alloT('stem.paperTrail.subject_badge', 'Civic & Adult Life · Document Studio'))
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
              h('span', {
                style: {
                  fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 999,
                  background: pal.panel, border: '1px solid ' + pal.borderSoft, color: pal.text
                }
              }, __alloT('stem.paperTrail.pill_docs', 'Docs') + ': ' + decodedDocsCount + '/' + DOCS.length),
              h('span', {
                style: {
                  fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 999,
                  background: pal.panel, border: '1px solid ' + pal.borderSoft, color: pal.text
                }
              }, t('stem.papertrail.pill_audited', 'Audited') + ': ' + auditedFieldsCount + '/' + totalFields),
              h('span', {
                style: {
                  fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 999,
                  background: pal.panel, border: '1px solid ' + pal.borderSoft, color: pal.text
                }
              }, __alloT('stem.paperTrail.pill_shield', 'Shield') + ': ' + scenGoodCount + '/' + SCENARIOS.length)
            )
          ),
          !isEmbedded ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 } },
            renderHeroEmblem(),
            h('div', { style: { flex: '1 1 240px', minWidth: 0 } },
              h('h2', { style: { margin: 0, fontSize: 20, fontWeight: 900, lineHeight: 1.2, color: pal.textStrong } },
                __alloT('stem.paperTrail.title', 'PaperTrail: Official Documents')),
              h('p', { style: { margin: '4px 0 0', fontSize: 13, lineHeight: 1.45, color: pal.muted } },
                __alloT('stem.paperTrail.intro', 'Adult life runs on documents nobody teaches you to read. Pick one and go field by field: what each box is really asking, which ones can cost you, and what to say when someone wants you to sign right now.'))
            )
          ) : null,
          h('div', {
            role: 'tablist',
            'aria-label': __alloT('stem.paperTrail.nav_label', 'PaperTrail sections'),
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 10, borderTop: '1px solid ' + pal.borderSoft },
            onKeyDown: function(e) {
              var key = e && e.key;
              if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
              var curIdx = tabs.findIndex(function(tItem) { return activeTab === tItem.id || (activeTab === 'doc' && tItem.id === 'home'); });
              if (curIdx < 0) curIdx = 0;
              var nextIdx = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 : (curIdx + (key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
              e.preventDefault();
              var nextTab = tabs[nextIdx];
              setPT({ view: nextTab.id, copiedIdx: -1 });
              try {
                var el = document.getElementById('allo-pt-tab-' + nextTab.id);
                if (el && typeof el.focus === 'function') el.focus();
              } catch (_) {}
            }
          },
            tabs.map(function(tb) {
              var selected = activeTab === tb.id || (activeTab === 'doc' && tb.id === 'home');
              return h('button', {
                key: tb.id,
                id: 'allo-pt-tab-' + tb.id,
                type: 'button',
                role: 'tab',
                'aria-selected': selected,
                'aria-controls': 'allo-pt-panel',
                tabIndex: selected ? 0 : -1,
                className: 'allo-pt-tab' + (selected ? ' allo-pt-btn-primary' : ' allo-pt-surface'),
                onClick: function() { setPT({ view: tb.id, copiedIdx: -1 }); },
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36,
                  padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: selected ? 900 : 700,
                  cursor: 'pointer',
                  background: selected ? pal.btnBg : pal.panel,
                  color: selected ? pal.btnText : pal.textStrong,
                  border: '1px solid ' + (selected ? pal.btnBg : pal.borderSoft)
                }
              },
                h('span', null, tb.label),
                h('span', {
                  style: {
                    fontSize: 11, fontWeight: 800, padding: '1px 6px', borderRadius: 999,
                    background: selected ? (isContrast ? '#000000' : 'rgba(0,0,0,0.24)') : pal.panelAlt,
                    color: selected ? (isContrast ? '#ffff00' : '#ffffff') : pal.muted,
                    border: isContrast ? '1px solid #ffff00' : 'none'
                  }
                }, String(tb.badge))
              );
            })
          )
        );
      }

      // The safety rule, stated wherever a student might be about to type or read forms.
      var safetyNote = h('div', {
        role: 'note',
        className: 'allo-pt-surface',
        style: {
          borderRadius: 12, padding: '10px 12px', marginBottom: 14,
          background: pal.dangerBg, border: '1px solid ' + pal.dangerBorder,
          color: pal.textStrong, fontSize: 12, lineHeight: 1.45,
          display: 'flex', alignItems: 'flex-start', gap: 8
        }
      },
        h('span', { 'aria-hidden': 'true', style: { fontSize: 15, lineHeight: 1.2, flexShrink: 0 } }, '🔒'),
        h('div', { style: { minWidth: 0 } },
          h('strong', { style: { color: pal.dangerText, marginRight: 6 } }, __alloT('stem.paperTrail.safety_head', 'Practice Identity Only:')),
          __alloT('stem.paperTrail.safety', 'Practice only. Every example here is filled in for a made-up person, Sam Rivera. Never type your real Social Security number, bank details, or passwords into a practice tool — including this one.')
        )
      );

      // Visual SVG: Warm Archival Readiness & Provenance Progress Dashboard
      function renderReadinessVisual() {
        var W = 540, H = 120;
        var docPct = DOCS.length ? (decodedDocsCount / DOCS.length) : 0;
        var fieldDone = Math.max(revealedCount, auditedFieldsCount);
        var fieldPct = totalFields ? (fieldDone / totalFields) : 0;
        var scenPct = SCENARIOS.length ? (scenGoodCount / SCENARIOS.length) : 0;
        var workPct = WORK_SCENARIOS.length ? (workDoneCount / WORK_SCENARIOS.length) : 0;
        var bars = [
          { id: 'doc', label: __alloT('stem.paperTrail.meter_docs', 'Documents Explored'), val: decodedDocsCount + '/' + DOCS.length, pct: docPct, color: pal.accent, hi: isContrast ? '#ffff00' : '#b45309' },
          { id: 'fld', label: __alloT('stem.paperTrail.meter_fields', 'Fields Decoded'), val: fieldDone + '/' + totalFields, pct: fieldPct, color: KIND.watch.bar, hi: isContrast ? '#ffff00' : '#f59e0b' },
          { id: 'scn', label: __alloT('stem.paperTrail.meter_pressure', 'Pressure Shields'), val: scenGoodCount + '/' + SCENARIOS.length, pct: scenPct, color: pal.safeText, hi: isContrast ? '#ffff00' : '#10b981' },
          { id: 'wrk', label: __alloT('stem.paperTrail.meter_work', 'Work Rights Cases'), val: workDoneCount + '/' + WORK_SCENARIOS.length, pct: workPct, color: KIND.danger.bar, hi: isContrast ? '#ffff00' : '#f43f5e' }
        ];
        var trackX = 152, trackW = 304;
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
          'aria-label': __alloT('stem.paperTrail.readiness_aria', 'PaperTrail readiness progress across documents, decoded fields, pressure scenarios, and work rights'),
          style: { display: 'block', maxWidth: 680, height: 'auto' }
        },
          h('defs', null,
            h('linearGradient', { id: 'pt-ready-bg', x1: '0', y1: '0', x2: '1', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#fdfbf6' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#f4efe3' })
            ),
            h('linearGradient', { id: 'pt-ready-well', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#111111' : '#dfd7c6' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#222222' : '#ece6d9' })
            ),
            h('linearGradient', { id: 'pt-bar-sheen', x1: '0', y1: '0', x2: '1', y2: '0' },
              h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0 }),
              h('stop', { offset: '50%', stopColor: '#ffffff', stopOpacity: 0.62 }),
              h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 })
            ),
            bars.map(function (b, bIdx) {
              var bY = 17 + bIdx * 25;
              var bW = Math.max(b.pct > 0 ? 12 : 0, Math.round(trackW * b.pct));
              return h('g', { key: b.id },
                h('linearGradient', { id: 'pt-bar-' + b.id, x1: '0', y1: '0', x2: '1', y2: '0' },
                  h('stop', { offset: '0%', stopColor: b.color }),
                  h('stop', { offset: '100%', stopColor: b.hi })
                ),
                bW > 0 && h('clipPath', { id: 'pt-bar-clip-' + b.id },
                  h('rect', { x: trackX, y: bY, width: bW, height: 13, rx: 6.5 })
                )
              );
            })
          ),
          h('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 11, fill: 'url(#pt-ready-bg)', stroke: pal.borderSoft, strokeWidth: 1.2 }),
          // Archival ledger gridlines at 25% / 50% / 75% / 100%
          [0.25, 0.5, 0.75, 1].map(function (f) {
            var gx = trackX + Math.round(trackW * f);
            return h('line', { key: 'g' + f, x1: gx, y1: 12, x2: gx, y2: H - 12, stroke: isContrast ? '#555500' : '#d6c3a3', strokeOpacity: isContrast ? 0.65 : 0.4, strokeWidth: 1, strokeDasharray: f === 1 ? 'none' : '2 3' });
          }),
          bars.map(function(b, idx) {
            var y = 17 + idx * 25;
            var fillW = Math.max(b.pct > 0 ? 12 : 0, Math.round(trackW * b.pct));
            var tipX = trackX + fillW;
            var dly = (idx * 0.55).toFixed(2) + 's';
            return h('g', { key: b.id },
              h('circle', { cx: 14, cy: y + 6.5, r: 3.2, fill: b.pct > 0 ? b.color : 'none', stroke: b.color, strokeWidth: 1.4 }),
              h('text', { x: 24, y: y + 10.5, fontSize: 11, fontWeight: 700, fill: pal.svgInk }, b.label),
              h('rect', { x: trackX, y: y, width: trackW, height: 13, rx: 6.5, fill: 'url(#pt-ready-well)', stroke: isContrast ? '#ffff00' : '#d6c3a3', strokeOpacity: isContrast ? 0.85 : 0.55, strokeWidth: 0.8 }),
              fillW > 0 ? h('g', null,
                !reduceMotion && h('rect', { x: trackX, y: y - 1, width: fillW, height: 15, rx: 7.5, fill: b.hi, opacity: 0.18, className: 'allo-pt-aura', style: { animationDelay: dly } }),
                h('rect', { x: trackX, y: y, width: fillW, height: 13, rx: 6.5, fill: 'url(#pt-bar-' + b.id + ')' }),
                !isContrast && h('rect', { x: trackX + 3, y: y + 1.5, width: Math.max(0, fillW - 6), height: 3.2, rx: 1.6, fill: '#ffffff', opacity: 0.28 }),
                !reduceMotion && fillW > 14 && h('g', { clipPath: 'url(#pt-bar-clip-' + b.id + ')' },
                  h('rect', { x: trackX, y: y, width: 64, height: 13, fill: 'url(#pt-bar-sheen)', className: 'allo-pt-bar-sheen', style: { animationDelay: dly } })
                ),
                !reduceMotion && h('circle', { cx: tipX - 5, cy: y + 6.5, r: 5.8, fill: b.hi, opacity: 0.3, className: 'allo-pt-beacon', style: { animationDelay: dly } }),
                h('circle', { cx: tipX - 5, cy: y + 6.5, r: 2.8, fill: isContrast ? '#000000' : '#ffffff', stroke: b.color, strokeWidth: 1.4 })
              ) : null,
              h('text', { x: W - 14, y: y + 10.5, textAnchor: 'end', fontSize: 11, fontWeight: 800, fill: pal.svgInk }, b.val)
            );
          })
        );
      }

      // Visual SVG: Decorative Archival Document Provenance Blueprint for `doc` view
      // (Kept aria-hidden="true" and paired with accessible interactive field controls below;
      // in practice mode, un-triaged fields hide their true risk badge so answers never leak.)
      function renderDocBlueprintSvg(doc, mode) {
        var fields = doc.fields;
        var rowH = 28;
        var headerH = 46;
        var footH = 26;
        var W = 540;
        var H = headerH + fields.length * rowH + footH;
        var chainX = 19;
        var firstY = headerH + (rowH - 6) / 2;
        var lastY = headerH + (fields.length - 1) * rowH + (rowH - 6) / 2;
        var isPractice = mode === 'practice';
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H, width: '100%', 'aria-hidden': 'true', focusable: 'false',
          style: { display: 'block', height: 'auto' }
        },
          h('defs', null,
            h('linearGradient', { id: 'pt-doc-stage', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#ffffff' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#faf6ed' })
            ),
            h('linearGradient', { id: 'pt-doc-header', x1: '0', y1: '0', x2: '1', y2: '0' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#fef3c7' }),
              h('stop', { offset: '65%', stopColor: isContrast ? '#000000' : '#fdf6e4' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#faecc8' })
            )
          ),
          h('rect', { x: 2, y: 2, width: W - 4, height: H - 4, rx: 12, fill: 'url(#pt-doc-stage)', stroke: pal.border, strokeWidth: 1.5 }),
          h('path', { d: 'M14 2 H' + (W - 14) + ' Q' + (W - 2) + ' 2 ' + (W - 2) + ' 14 V38 H2 V14 Q2 2 14 2 Z', fill: 'url(#pt-doc-header)' }),
          h('line', { x1: 2, y1: 38, x2: W - 2, y2: 38, stroke: pal.border, strokeWidth: 1.2 }),
          !reduceMotion && h('circle', { cx: 20, cy: 20, r: 10, fill: pal.accent, opacity: 0.16, className: 'allo-pt-beacon' }),
          h('circle', { cx: 20, cy: 20, r: 7.5, fill: isContrast ? '#000000' : '#ffffff', stroke: pal.accent, strokeWidth: 1.4 }),
          h('circle', { cx: 20, cy: 20, r: 4, fill: pal.accent }),
          h('text', { x: 34, y: 24, fontSize: 12, fontWeight: 900, fill: pal.svgInk }, doc.title.toUpperCase() + ' — ' + (isPractice ? t('stem.papertrail.blueprint_audit_tag', 'AUDIT MAP') : __alloT('stem.paperTrail.blueprint_tag', 'RISK MAP'))),
          h('rect', { x: W - 154, y: 10, width: 140, height: 20, rx: 10, fill: isContrast ? '#000000' : '#ffffff', stroke: pal.border, strokeWidth: 1 }),
          h('text', { x: W - 84, y: 23.5, textAnchor: 'middle', fontSize: 10, fontWeight: 800, fill: pal.svgMuted }, __alloT('stem.paperTrail.sample_stamp', 'SAMPLE: SAM RIVERA')),
          fields.length > 1 && !reduceMotion && h('line', { x1: chainX, y1: firstY, x2: chainX, y2: lastY, stroke: '#d97706', strokeOpacity: 0.22, strokeWidth: 5, strokeLinecap: 'round', className: 'allo-pt-aura' }),
          fields.length > 1 && h('line', { x1: chainX, y1: firstY, x2: chainX, y2: lastY, stroke: isContrast ? '#ffff00' : '#b45309', strokeOpacity: isContrast ? 1 : 0.72, strokeWidth: 1.7, strokeDasharray: '5 3', className: reduceMotion ? undefined : 'allo-pt-chain-flow' }),
          fields.map(function(f, idx) {
            var y = headerH + idx * rowH;
            var cy = y + (rowH - 6) / 2;
            var fKey = doc.id + ':' + f.id;
            var triRec = safeObj(fieldTriage[fKey]);
            var actRec = safeObj(fieldAction[fKey]);
            var triSolved = triRec.isCorrect === true;
            var verified = triSolved && actRec.isCorrect === true;
            var hideRisk = isPractice && !triSolved;
            var k = hideRisk ? KIND.normal : (KIND[f.kind] || KIND.normal);
            var open = isPractice ? verified : !!revealed[fKey];
            var lbl = f.label.length > 34 ? f.label.slice(0, 33) + '…' : f.label;
            var pillText = hideRisk ? t('stem.papertrail.untagged_short', 'FLAG IT') : k.short.toUpperCase();
            var statusText = isPractice
              ? (verified ? ('✓ ' + t('stem.papertrail.verified_short', 'DONE')) : (triSolved ? t('stem.papertrail.step2_short', 'STEP 2') : t('stem.papertrail.step1_short', 'STEP 1')))
              : (open ? ('✓ ' + __alloT('stem.paperTrail.open_short', 'OPEN')) : __alloT('stem.paperTrail.tap_short', 'TAP'));
            return h('g', { key: f.id },
              open && !reduceMotion && h('circle', { cx: chainX, cy: cy, r: 8, fill: k.bar, opacity: 0.26, className: 'allo-pt-beacon', style: { animationDelay: (idx * 0.35).toFixed(2) + 's' } }),
              h('circle', { cx: chainX, cy: cy, r: open ? 4.4 : 3.4, fill: open ? k.bar : pal.svgPaper, stroke: k.bar, strokeWidth: 1.6 }),
              open && !isContrast && h('rect', { x: 30, y: y - 1, width: W - 44, height: rowH - 4, rx: 7, fill: pal.accent, opacity: 0.12 }),
              h('rect', {
                x: 31, y: y, width: W - 46, height: rowH - 6, rx: 6.5,
                fill: open ? pal.accentBg : pal.svgBg,
                stroke: open ? pal.accent : ((hideRisk || f.kind === 'normal') ? pal.borderSoft : k.bar),
                strokeWidth: open ? 1.8 : 1.1
              }),
              h('rect', { x: 31, y: y, width: 6.5, height: rowH - 6, rx: 3.2, fill: k.bar }),
              h('text', { x: 45, y: y + 14.5, fontSize: 11, fontWeight: open ? 800 : 600, fill: pal.svgInk }, (idx + 1) + '. ' + lbl),
              h('rect', { x: W - 154, y: y + 3, width: 72, height: rowH - 12, rx: 8, fill: isContrast ? '#000000' : ((hideRisk || f.kind === 'normal') ? '#ffffff' : k.bg), stroke: (hideRisk || f.kind === 'normal') ? pal.borderSoft : k.bar, strokeWidth: 0.9 }),
              h('text', { x: W - 118, y: y + 14, textAnchor: 'middle', fontSize: 9.2, fontWeight: 800, fill: k.color }, pillText),
              h('text', { x: W - 24, y: y + 14.5, textAnchor: 'end', fontSize: 10.5, fontWeight: 800, fill: open ? pal.safeText : pal.svgMuted }, statusText)
            );
          }),
          h('text', { x: 16, y: H - 8, fontSize: 10, fontWeight: 600, fill: pal.svgMuted },
            isPractice
              ? t('stem.papertrail.blueprint_hint_practice', 'Visual audit map — use the interactive field selector or cards below to tag risk and choose Sam\'s safe move.')
              : t('stem.papertrail.blueprint_hint_rows', 'Visual risk map — use the interactive field selector buttons or rows below to decode what each box is asking.'))
        );
      }

      // Visual SVG: 4-Step Pressure Shield Protocol with Dual-Pass Luminous Chain Connectors
      function renderPressureProtocolSvg() {
        var W = 540, H = 104;
        var steps = [
          { n: '1', label: __alloT('stem.paperTrail.proto_1', 'PAUSE'), sub: __alloT('stem.paperTrail.proto_1s', 'Notice urgency'), col: isContrast ? '#ffff00' : '#d97706' },
          { n: '2', label: __alloT('stem.paperTrail.proto_2', 'READ'), sub: __alloT('stem.paperTrail.proto_2s', 'Check blanks'), col: isContrast ? '#ffff00' : '#b45309' },
          { n: '3', label: __alloT('stem.paperTrail.proto_3', 'ASK'), sub: __alloT('stem.paperTrail.proto_3s', 'Buy time / copy'), col: isContrast ? '#ffff00' : '#0f766e' },
          { n: '4', label: __alloT('stem.paperTrail.proto_4', 'DECIDE'), sub: __alloT('stem.paperTrail.proto_4s', 'Sign only ready'), col: isContrast ? '#ffff00' : '#059669' }
        ];
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
          'aria-label': __alloT('stem.paperTrail.proto_aria', 'Four-step document defense protocol: Pause, Read, Ask, Decide'),
          style: { display: 'block', height: 'auto' }
        },
          h('defs', null,
            h('linearGradient', { id: 'pt-proto-bg', x1: '0', y1: '0', x2: '1', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#fdfbf6' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#f3ede0' })
            ),
            h('linearGradient', { id: 'pt-proto-card', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#ffffff' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#faf6ec' })
            )
          ),
          h('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 12, fill: 'url(#pt-proto-bg)', stroke: pal.borderSoft, strokeWidth: 1.2 }),
          h('text', { x: 16, y: 21, fontSize: 10.8, fontWeight: 900, letterSpacing: '0.04em', fill: pal.accent }, __alloT('stem.paperTrail.proto_head', '4-STEP PRESSURE SHIELD PROTOCOL')),
          steps.map(function(stepItem, i) {
            var bx = 14 + i * 130;
            var dly = (i * 0.45).toFixed(2) + 's';
            return h('g', { key: stepItem.n },
              i > 0 ? h('g', null,
                !reduceMotion && h('path', { d: 'M' + (bx - 16) + ' 59 Q' + (bx - 8) + ' 51 ' + (bx - 3) + ' 59', fill: 'none', stroke: '#f59e0b', strokeOpacity: 0.32, strokeWidth: 5.5, strokeLinecap: 'round', className: 'allo-pt-aura', style: { animationDelay: dly } }),
                h('path', { d: 'M' + (bx - 16) + ' 59 Q' + (bx - 8) + ' 51 ' + (bx - 4) + ' 59', fill: 'none', stroke: pal.accent, strokeWidth: 1.9, strokeDasharray: isContrast ? undefined : '4 3', strokeLinecap: 'round', className: reduceMotion ? undefined : 'allo-pt-chain-flow' }),
                h('polygon', { points: (bx - 5) + ',55.5 ' + (bx - 0.5) + ',59 ' + (bx - 5) + ',62.5', fill: pal.accent })
              ) : null,
              !isContrast && h('rect', { x: bx + 1.5, y: 34.5, width: 114, height: 55, rx: 9, fill: '#78350f', opacity: 0.08 }),
              h('rect', { x: bx, y: 32, width: 114, height: 55, rx: 9, fill: 'url(#pt-proto-card)', stroke: pal.border, strokeWidth: 1.3 }),
              h('rect', { x: bx + 10, y: 32.8, width: 94, height: 2.8, rx: 1.4, fill: stepItem.col, opacity: isContrast ? 1 : 0.72 }),
              !reduceMotion && h('circle', { cx: bx + 19, cy: 52, r: 12.8, fill: stepItem.col, opacity: 0.18, className: 'allo-pt-beacon', style: { animationDelay: dly } }),
              h('circle', { cx: bx + 19, cy: 52, r: 9.8, fill: pal.accentBg, stroke: stepItem.col, strokeWidth: 1.5 }),
              h('text', { x: bx + 19, y: 55.8, textAnchor: 'middle', fontSize: 11, fontWeight: 900, fill: stepItem.col }, stepItem.n),
              h('text', { x: bx + 35, y: 55, fontSize: 11.2, fontWeight: 900, fill: pal.svgInk }, stepItem.label),
              h('text', { x: bx + 11, y: 76, fontSize: 9.8, fontWeight: 600, fill: pal.svgMuted }, stepItem.sub)
            );
          })
        );
      }

      // Visual SVG: IDEA -> ADA Transition Cliff Provenance Arc Diagram for `work` view
      function renderTransitionCliffSvg() {
        var W = 540, H = 142;
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
          'aria-label': __alloT('stem.paperTrail.cliff_aria', 'Comparison of School IDEA protections versus Workplace ADA Title I protections'),
          style: { display: 'block', height: 'auto' }
        },
          h('defs', null,
            h('linearGradient', { id: 'pt-cliff-bg', x1: '0', y1: '0', x2: '1', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#fdfbf6' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#f3ede0' })
            ),
            h('linearGradient', { id: 'pt-cliff-card', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : '#ffffff' }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : '#faf6ec' })
            )
          ),
          h('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 12, fill: 'url(#pt-cliff-bg)', stroke: pal.borderSoft, strokeWidth: 1.2 }),
          !isContrast && h('rect', { x: 16, y: 17, width: 218, height: 110, rx: 11, fill: '#78350f', opacity: 0.08 }),
          h('rect', { x: 14, y: 15, width: 218, height: 110, rx: 11, fill: 'url(#pt-cliff-card)', stroke: pal.border, strokeWidth: 1.3 }),
          h('path', { d: 'M24 15 H222 Q232 15 232 25 V40 H14 V25 Q14 15 24 15 Z', fill: isContrast ? '#000000' : '#f4efe3' }),
          h('line', { x1: 14, y1: 40, x2: 232, y2: 40, stroke: pal.borderSoft, strokeWidth: 1 }),
          h('circle', { cx: 26, cy: 27.5, r: 4, fill: pal.svgMuted }),
          h('text', { x: 36, y: 31.5, fontSize: 11.5, fontWeight: 900, fill: pal.svgInk }, __alloT('stem.paperTrail.cliff_school', 'SCHOOL · IDEA / IEP')),
          h('text', { x: 26, y: 58, fontSize: 11, fill: pal.svgMuted }, '• ' + __alloT('stem.paperTrail.cliff_s1', 'School team identifies needs')),
          h('text', { x: 26, y: 76, fontSize: 11, fill: pal.svgMuted }, '• ' + __alloT('stem.paperTrail.cliff_s2', 'Written plan follows you')),
          h('text', { x: 26, y: 94, fontSize: 11, fill: pal.svgMuted }, '• ' + __alloT('stem.paperTrail.cliff_s3', 'Automatic class-to-class')),
          h('text', { x: 26, y: 114, fontSize: 10, fontWeight: 800, fill: pal.accent }, __alloT('stem.paperTrail.cliff_s4', 'ENDS AT GRADUATION')),
          !reduceMotion && h('path', { d: 'M234 72 Q269 44 298 72', fill: 'none', stroke: '#f59e0b', strokeOpacity: 0.28, strokeWidth: 7, strokeLinecap: 'round', className: 'allo-pt-aura' }),
          h('path', { d: 'M234 72 Q269 44 297 72', fill: 'none', stroke: pal.accent, strokeWidth: 2.3, strokeDasharray: '5 3', strokeLinecap: 'round', className: reduceMotion ? undefined : 'allo-pt-chain-flow' }),
          h('polygon', { points: '295,66.5 305,72 295,77.5', fill: pal.accent }),
          !reduceMotion && h('circle', { cx: 269, cy: 56, r: 17, fill: '#f59e0b', opacity: 0.18, className: 'allo-pt-beacon' }),
          h('rect', { x: 245, y: 46, width: 48, height: 19, rx: 9.5, fill: pal.accentBg, stroke: pal.accent, strokeWidth: 1.3 }),
          h('text', { x: 269, y: 59, textAnchor: 'middle', fontSize: 9.5, fontWeight: 900, fill: pal.accent }, __alloT('stem.paperTrail.cliff_mid', 'AGE 18')),
          !isContrast && h('rect', { x: 310, y: 17, width: 216, height: 110, rx: 11, fill: '#92400e', opacity: 0.1 }),
          h('rect', { x: 308, y: 15, width: 216, height: 110, rx: 11, fill: 'url(#pt-cliff-card)', stroke: pal.accent, strokeWidth: 1.7 }),
          h('path', { d: 'M318 15 H514 Q524 15 524 25 V40 H308 V25 Q308 15 318 15 Z', fill: pal.accentBg }),
          h('line', { x1: 308, y1: 40, x2: 524, y2: 40, stroke: pal.border, strokeWidth: 1 }),
          !reduceMotion && h('circle', { cx: 320, cy: 27.5, r: 6.8, fill: pal.accent, opacity: 0.22, className: 'allo-pt-beacon', style: { animationDelay: '0.6s' } }),
          h('circle', { cx: 320, cy: 27.5, r: 4, fill: pal.accent }),
          h('text', { x: 330, y: 31.5, fontSize: 11.5, fontWeight: 900, fill: pal.accent }, __alloT('stem.paperTrail.cliff_work', 'WORK · ADA TITLE I')),
          h('text', { x: 320, y: 58, fontSize: 11, fill: pal.svgInk }, '• ' + __alloT('stem.paperTrail.cliff_w1', 'Request-driven (you ask)')),
          h('text', { x: 320, y: 76, fontSize: 11, fill: pal.svgInk }, '• ' + __alloT('stem.paperTrail.cliff_w2', 'Disclosure is YOUR choice')),
          h('text', { x: 320, y: 94, fontSize: 11, fill: pal.svgInk }, '• ' + __alloT('stem.paperTrail.cliff_w3', '29 CFR 1630 protections')),
          h('text', { x: 320, y: 114, fontSize: 10, fontWeight: 800, fill: pal.safeText }, __alloT('stem.paperTrail.cliff_w4', 'TASK → BARRIER → ADJUSTMENT'))
        );
      }

      var shellStyle = {
        color: pal.text,
        background: pal.canvas,
        borderRadius: 16,
        border: '1px solid ' + pal.borderSoft,
        padding: 16,
        maxWidth: 920,
        margin: '0 auto'
      };

      // ─────────── HOME ───────────
      if (view === 'home') {
        var starters = [
          { label: __alloT('stem.paperTrail.starter_job', 'First Job (Application)'), action: function() { openDoc('jobapp', 'decode'); } },
          { label: t('stem.papertrail.starter_audit_lease', 'Inspect & Flag Lease (Practice)'), action: function() { openDoc('lease', 'practice'); } },
          { label: __alloT('stem.paperTrail.starter_iep', 'My IEP Invitation'), action: function() { openDoc('iep', 'decode'); } },
          { label: __alloT('stem.paperTrail.starter_pressure', 'Practice Saying No to Pressure'), action: function() { setPT({ view: 'scenarios', copiedIdx: -1 }); } },
          { label: t('stem.papertrail.starter_ada_builder', 'Build ADA 3-Sentence Request'), action: function() { setPT({ view: 'work', copiedIdx: -1 }); } }
        ];
        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('home'),
          h('div', { id: 'allo-pt-panel', role: 'tabpanel', 'aria-labelledby': 'allo-pt-tab-home' },
          safetyNote,

          // Visual Stage: Readiness Meter + Fictional Persona Dossier
          h('section', {
            'aria-label': __alloT('stem.paperTrail.overview_aria', 'Practice persona and progress overview'),
            className: 'allo-pt-grid-2',
            style: { marginBottom: 14 }
          },
            h('div', {
              className: 'allo-pt-surface',
              style: { background: pal.panel, border: '1px solid ' + pal.borderSoft, borderRadius: 14, padding: 14, boxShadow: pal.shadow, minWidth: 0 }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 900, color: pal.textStrong } }, '📊 ' + __alloT('stem.paperTrail.readiness_title', 'PaperTrail Readiness')),
                h('span', { style: { fontSize: 11, fontWeight: 700, color: pal.muted } }, readiness.overallPct + '% ' + __alloT('stem.paperTrail.overall', 'overall'))
              ),
              renderReadinessVisual()
            ),
            h('div', {
              className: 'allo-pt-surface',
              style: { background: pal.panel, border: '1px solid ' + pal.borderSoft, borderRadius: 14, padding: 14, boxShadow: pal.shadow, minWidth: 0 }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 900, color: pal.textStrong } }, '🪪 ' + __alloT('stem.paperTrail.persona_title', 'Fictional Practice Identity')),
                h('span', { style: { fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 999, background: pal.accentBg, color: pal.accent, border: '1px solid ' + pal.border } }, __alloT('stem.paperTrail.persona_fake', 'FAKE DATA'))
              ),
              h('div', { style: { fontSize: 12, lineHeight: 1.55, color: pal.text } },
                h('div', null, h('strong', null, __alloT('stem.paperTrail.p_name', 'Name: ')), PERSONA.name + ' · DOB ' + PERSONA.dob),
                h('div', null, h('strong', null, __alloT('stem.paperTrail.p_addr', 'Address: ')), PERSONA.address),
                h('div', null, h('strong', null, __alloT('stem.paperTrail.p_contact', 'Phone / SSN: ')), PERSONA.phone + ' · ' + PERSONA.ssn)
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 8, borderTop: '1px solid ' + pal.borderSoft } },
                h('span', { style: { fontSize: 11, fontWeight: 800, color: KIND.normal.color } }, '● ' + KIND.normal.short),
                h('span', { style: { fontSize: 11, fontWeight: 800, color: KIND.watch.color } }, '▲ ' + KIND.watch.label),
                h('span', { style: { fontSize: 11, fontWeight: 800, color: KIND.danger.color } }, '◆ ' + KIND.danger.label)
              )
            )
          ),

          // Quick-Start Guided Chips
          h('div', {
            className: 'allo-pt-surface',
            style: {
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              padding: '10px 12px', borderRadius: 12, marginBottom: 14,
              background: pal.panelAlt, border: '1px solid ' + pal.borderSoft
            }
          },
            h('span', { style: { fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: pal.accent } },
              __alloT('stem.paperTrail.quick_start', 'Quick Start:')),
            starters.map(function(starter, i) {
              return h('button', {
                key: i, type: 'button', onClick: starter.action,
                className: 'allo-pt-surface',
                style: {
                  fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 999, minHeight: 32,
                  background: pal.panel, border: '1px solid ' + pal.border, color: pal.textStrong, cursor: 'pointer'
                }
              }, starter.label + ' →');
            })
          ),

          // Document Library Cards
          h('h3', { style: { margin: '0 0 8px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: pal.muted } },
            __alloT('stem.paperTrail.library_heading', '6 Real-World Document Decoders')),
          h('div', { className: 'allo-pt-grid-2', style: { marginBottom: 16 } },
            DOCS.map(function(doc) {
              var done = !!seenDocs[doc.id];
              var docMastery = PAPERTRAIL_ENGINE.getDocumentMastery(doc.id, fieldTriage, fieldAction, auditDone);
              var openCount = doc.fields.filter(function(f) { return !!revealed[doc.id + ':' + f.id]; }).length;
              var dangerCount = doc.fields.filter(function(f) { return f.kind === 'danger'; }).length;
              var watchCount = doc.fields.filter(function(f) { return f.kind === 'watch'; }).length;
              var progressCount = Math.max(openCount, docMastery.verifiedCount);
              var pct = doc.fields.length ? Math.round((progressCount / doc.fields.length) * 100) : 0;
              return h('button', {
                key: doc.id, type: 'button',
                onClick: function() { openDoc(doc.id); },
                className: 'allo-pt-card allo-pt-surface',
                style: {
                  textAlign: 'left', borderRadius: 14, padding: 14, cursor: 'pointer',
                  background: pal.panel, border: '1px solid ' + (docMastery.mastered ? pal.safeBorder : (done ? pal.accent : pal.border)),
                  color: pal.text, boxShadow: pal.shadow, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, width: '100%' } },
                  h('div', { style: { fontWeight: 900, fontSize: 15, color: pal.textStrong } }, doc.icon + ' ' + doc.title),
                  docMastery.mastered ? h('span', {
                    style: { fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pal.safeBg, color: pal.safeText, border: '1px solid ' + pal.safeBorder, flexShrink: 0 }
                  }, '★ ' + t('stem.papertrail.mastered_badge', 'Mastered')) : (done ? h('span', {
                    style: { fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pal.safeBg, color: pal.safeText, border: '1px solid ' + pal.safeBorder, flexShrink: 0 }
                  }, '✓ ' + __alloT('stem.paperTrail.opened_badge', 'Opened')) : null)
                ),
                h('div', { style: { fontSize: 12, lineHeight: 1.45, color: pal.muted } }, doc.blurb),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                  h('span', { style: { fontSize: 11, fontWeight: 800, color: pal.accent } }, doc.fields.length + ' ' + __alloT('stem.paperTrail.fields', 'fields')),
                  dangerCount > 0 ? h('span', { style: { fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: pal.dangerBg, color: pal.dangerText, border: '1px solid ' + pal.dangerBorder } }, dangerCount + ' ' + __alloT('stem.paperTrail.danger_short', 'high-stakes')) : null,
                  watchCount > 0 ? h('span', { style: { fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: pal.watchBg, color: pal.watchText, border: '1px solid ' + pal.watchBorder } }, watchCount + ' ' + __alloT('stem.paperTrail.watch_short', 'watch')) : null
                ),
                h('div', { style: { width: '100%', marginTop: 'auto' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: pal.muted, marginBottom: 4 } },
                    h('span', null, docMastery.verifiedCount > 0
                      ? (t('stem.papertrail.audited_count', 'Audited') + ': ' + docMastery.verifiedCount + '/' + doc.fields.length)
                      : (__alloT('stem.paperTrail.decoded_count', 'Decoded') + ': ' + openCount + '/' + doc.fields.length)),
                    h('span', null, pct + '%')
                  ),
                  h('div', { style: { height: 6, borderRadius: 999, background: pal.svgTrack, overflow: 'hidden' } },
                    h('div', { style: { width: pct + '%', height: 6, borderRadius: 999, background: docMastery.mastered ? pal.safeText : pal.accent } })
                  )
                )
              );
            })
          ),

          // Action Studio Cards (Pressure Scenarios, Scripts, Work Rights)
          h('h3', { style: { margin: '0 0 8px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: pal.muted } },
            __alloT('stem.paperTrail.skills_heading', 'Defense, Scripts & Workplace Rights')),
          h('div', { className: 'allo-pt-grid-3' },
            h('button', {
              type: 'button', onClick: function() { setPT({ view: 'scenarios' }); },
              className: 'allo-pt-card allo-pt-surface',
              style: { textAlign: 'left', borderRadius: 14, padding: 14, background: pal.card, border: '1px solid ' + pal.border, color: pal.text, cursor: 'pointer', boxShadow: pal.shadow }
            },
              h('div', { style: { fontWeight: 900, fontSize: 14, color: pal.textStrong, marginBottom: 4 } }, '🛡️ ' + __alloT('stem.paperTrail.pressure', 'Pressure scenarios')),
              h('div', { style: { fontSize: 12, lineHeight: 1.45, color: pal.muted, marginBottom: 8 } }, __alloT('stem.paperTrail.pressure_sub', 'What to do when someone wants you to sign now.')),
              h('div', { style: { fontSize: 11, fontWeight: 800, color: pal.accent } }, scenGoodCount + '/' + SCENARIOS.length + ' ' + __alloT('stem.paperTrail.completed', 'completed'))
            ),
            h('button', {
              type: 'button', onClick: function() { setPT({ view: 'scripts' }); },
              className: 'allo-pt-card allo-pt-surface',
              style: { textAlign: 'left', borderRadius: 14, padding: 14, background: pal.card, border: '1px solid ' + pal.border, color: pal.text, cursor: 'pointer', boxShadow: pal.shadow }
            },
              h('div', { style: { fontWeight: 900, fontSize: 14, color: pal.textStrong, marginBottom: 4 } }, '💬 ' + __alloT('stem.paperTrail.scripts', 'What to say')),
              h('div', { style: { fontSize: 12, lineHeight: 1.45, color: pal.muted, marginBottom: 8 } }, __alloT('stem.paperTrail.scripts_sub', 'Six sentences that buy you time. Asking is a skill.')),
              h('div', { style: { fontSize: 11, fontWeight: 800, color: pal.accent } }, countTruthyKeys(rehearsed) + '/' + HELP_SCRIPTS.length + ' ' + __alloT('stem.paperTrail.rehearsed_word', 'rehearsed'))
            ),
            h('button', {
              type: 'button', onClick: function() { setPT({ view: 'work' }); },
              className: 'allo-pt-card allo-pt-surface',
              style: { textAlign: 'left', borderRadius: 14, padding: 14, background: pal.card, border: '1px solid ' + pal.border, color: pal.text, cursor: 'pointer', boxShadow: pal.shadow }
            },
              h('div', { style: { fontWeight: 900, fontSize: 14, color: pal.textStrong, marginBottom: 4 } }, '⚖️ ' + __alloT('stem.paperTrail.work_title', 'Work rights & disclosure')),
              h('div', { style: { fontSize: 12, lineHeight: 1.45, color: pal.muted, marginBottom: 8 } }, __alloT('stem.paperTrail.work_sub', 'What replaces your school plan after graduation, how to ask for what you need, and whether to disclose at all.')),
              h('div', { style: { fontSize: 11, fontWeight: 800, color: pal.accent } }, workDoneCount + '/' + WORK_SCENARIOS.length + ' ' + __alloT('stem.paperTrail.cases_considered', 'cases considered'))
            )
          )
          )
        );
      }

      // ─────────── DOC (field decoder + Inspect & Flag First Practice Mode) ───────────
      if (view === 'doc') {
        var doc = PAPERTRAIL_ENGINE.getDocumentById(st.docId) || DOCS[0];
        var isPractice = docMode === 'practice';
        var docMastery = PAPERTRAIL_ENGINE.getDocumentMastery(doc.id, fieldTriage, fieldAction, auditDone);
        var visibleFields = (!isPractice && docFilter === 'flagged')
          ? doc.fields.filter(function(f) { return f.kind !== 'normal'; })
          : doc.fields;
        var docAuditRec = safeObj(auditDone[doc.id]);
        var docAuditRetry = typeof docAuditRec.retries === 'number' && isFinite(docAuditRec.retries) ? docAuditRec.retries : 0;
        var docAuditPrompt = PAPERTRAIL_ENGINE.getDocAuditCheck(doc.id, docAuditRetry);

        function setAllFields(openVal) {
          setPT(function(prior) {
            var nx = Object.assign({}, safeMap(prior.revealed));
            doc.fields.forEach(function(f) { nx[doc.id + ':' + f.id] = openVal; });
            return { revealed: nx };
          });
        }

        function checkDocMasteryBonus(nextTriage, nextAction, nextAudit) {
          if (st._xpDocMastered[doc.id] || xpSentRef.current.docMastered[doc.id]) return false;
          var m = PAPERTRAIL_ENGINE.getDocumentMastery(doc.id, nextTriage, nextAction, nextAudit);
          if (!m.mastered) return false;
          xpSentRef.current.docMastered[doc.id] = true;
          return true;
        }

        function handleTriageChoice(f, lvl) {
          var fKey = doc.id + ':' + f.id;
          var res = PAPERTRAIL_ENGINE.evaluateRiskTriage(doc.id, f.id, lvl);
          setPT(function(prior) {
            var prevT = safeMap(prior.fieldTriage);
            var nextT = Object.assign({}, prevT);
            nextT[fKey] = {
              chosen: lvl,
              isCorrect: res.isCorrect,
              direction: res.direction,
              feedback: res.feedback
            };
            return { fieldTriage: nextT, activeFieldId: f.id };
          });
          announceToSR(res.isCorrect
            ? (t('stem.papertrail.triage_correct_sr', 'Risk level matched.') + ' ' + res.feedback)
            : (t('stem.papertrail.triage_retry_sr', 'Check that risk level again.') + ' ' + res.feedback));
        }

        function handleFieldActionChoice(f, choiceId) {
          var fKey = doc.id + ':' + f.id;
          var res = PAPERTRAIL_ENGINE.evaluateFieldAction(doc.id, f.id, choiceId);
          var awardFieldXp = res.isCorrect && !st._xpFields[fKey] && !xpSentRef.current.fields[fKey];
          if (awardFieldXp) xpSentRef.current.fields[fKey] = true;
          var nextActionPreview = Object.assign({}, fieldAction);
          nextActionPreview[fKey] = { chosenId: choiceId, isCorrect: res.isCorrect, feedback: res.feedback, retries: safeObj(fieldAction[fKey]).retries || 0 };
          var awardDocBonus = res.isCorrect && checkDocMasteryBonus(fieldTriage, nextActionPreview, auditDone);

          setPT(function(prior) {
            var prevA = safeMap(prior.fieldAction);
            var prevRec = safeObj(prevA[fKey]);
            var nextA = Object.assign({}, prevA);
            nextA[fKey] = {
              chosenId: choiceId,
              isCorrect: res.isCorrect,
              feedback: res.feedback,
              retries: typeof prevRec.retries === 'number' ? prevRec.retries : 0
            };
            var patch = { fieldAction: nextA, activeFieldId: f.id };
            if (res.isCorrect) {
              var nextRev = Object.assign({}, safeMap(prior.revealed));
              nextRev[fKey] = true;
              patch.revealed = nextRev;
            }
            if (awardFieldXp) {
              var nextXpF = Object.assign({}, safeMap(prior._xpFields));
              nextXpF[fKey] = true;
              patch._xpFields = nextXpF;
            }
            if (awardDocBonus) {
              var nextXpD = Object.assign({}, safeMap(prior._xpDocMastered));
              nextXpD[doc.id] = true;
              patch._xpDocMastered = nextXpD;
            }
            return patch;
          });
          if (awardFieldXp) awardXP(4, 'Verified field audit: ' + f.label);
          if (awardDocBonus) awardXP(10, 'Mastered document audit: ' + doc.title);
          announceToSR(res.isCorrect
            ? (t('stem.papertrail.action_correct_sr', 'Safe move verified. Plain-language decode unlocked.') + ' ' + f.asking)
            : (t('stem.papertrail.action_retry_sr', 'Watch out — try another safe move.') + ' ' + res.feedback));
        }

        function handleDocAuditChoice(chkId, choiceId) {
          var res = PAPERTRAIL_ENGINE.evaluateAuditCheck(chkId, choiceId);
          var nextAuditPreview = Object.assign({}, auditDone);
          nextAuditPreview[doc.id] = { chosenId: choiceId, isCorrect: res.isCorrect, feedback: res.feedback, retries: docAuditRetry };
          var awardDocBonus = res.isCorrect && checkDocMasteryBonus(fieldTriage, fieldAction, nextAuditPreview);
          var awardCheckXp = res.isCorrect && !st._xpFields['audit:' + doc.id] && !xpSentRef.current.fields['audit:' + doc.id];
          if (awardCheckXp) xpSentRef.current.fields['audit:' + doc.id] = true;

          setPT(function(prior) {
            var prevAud = safeMap(prior.auditDone);
            var prevR = safeObj(prevAud[doc.id]);
            var nextAud = Object.assign({}, prevAud);
            nextAud[doc.id] = {
              chosenId: choiceId,
              isCorrect: res.isCorrect,
              feedback: res.feedback,
              retries: typeof prevR.retries === 'number' ? prevR.retries : 0
            };
            var patch = { auditDone: nextAud };
            if (awardCheckXp) {
              var nxF = Object.assign({}, safeMap(prior._xpFields));
              nxF['audit:' + doc.id] = true;
              patch._xpFields = nxF;
            }
            if (awardDocBonus) {
              var nxD = Object.assign({}, safeMap(prior._xpDocMastered));
              nxD[doc.id] = true;
              patch._xpDocMastered = nxD;
            }
            return patch;
          });
          if (awardCheckXp) awardXP(5, 'Document red-flag audit: ' + doc.title);
          if (awardDocBonus) awardXP(10, 'Mastered document audit: ' + doc.title);
          announceToSR(res.feedback);
        }

        function jumpToField(f) {
          var fKey = doc.id + ':' + f.id;
          if (!isPractice) {
            setPT(function(prior) {
              var nx = Object.assign({}, safeMap(prior.revealed));
              nx[fKey] = true;
              return { revealed: nx, activeFieldId: f.id };
            });
          } else {
            setPT({ activeFieldId: f.id });
          }
          try {
            var el = document.getElementById('allo-pt-field-' + doc.id + '-' + f.id);
            if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
            if (el && typeof el.focus === 'function') el.focus();
          } catch (_) {}
        }

        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('doc', backBtn('home', __alloT('stem.paperTrail.documents', 'Documents'))),
          h('div', { id: 'allo-pt-panel', role: 'tabpanel', 'aria-labelledby': 'allo-pt-tab-home' },
          safetyNote,

          // Document Switcher Strip
          h('div', {
            style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
            role: 'group', 'aria-label': __alloT('stem.paperTrail.switch_doc', 'Switch document')
          },
            DOCS.map(function(item) {
              var active = item.id === doc.id;
              return h('button', {
                key: item.id, type: 'button',
                'aria-pressed': active,
                className: active ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                onClick: function() { openDoc(item.id); },
                style: {
                  fontSize: 12, fontWeight: active ? 900 : 700, padding: '6px 10px', borderRadius: 999, cursor: 'pointer', minHeight: 34,
                  background: active ? pal.btnBg : pal.panel,
                  color: active ? pal.btnText : pal.text,
                  border: '1px solid ' + (active ? pal.btnBg : pal.borderSoft)
                }
              }, item.icon + ' ' + item.title);
            })
          ),

          // Annotated Document Visual Stage + Mode Switcher + Accessible Field Quick-Jump Bar
          h('section', {
            className: 'allo-pt-surface',
            style: { background: pal.panel, border: '1px solid ' + pal.border, borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: pal.shadow }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 } },
              h('div', { style: { minWidth: 0, flex: '1 1 240px' } },
                h('h3', { style: { margin: 0, fontSize: 17, fontWeight: 900, color: pal.textStrong } }, doc.icon + ' ' + doc.title),
                h('p', { style: { margin: '2px 0 0', fontSize: 12, color: pal.muted } }, doc.blurb)
              ),
              // Practice vs Browse/Decode Mode Switcher
              h('div', {
                role: 'group',
                'aria-label': t('stem.papertrail.doc_mode_aria', 'Document study mode'),
                style: { display: 'flex', gap: 6, flexWrap: 'wrap' }
              },
                h('button', {
                  type: 'button', 'aria-pressed': !isPractice,
                  onClick: function() { setPT({ docMode: 'decode' }); },
                  className: !isPractice ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                  style: {
                    fontSize: 12, fontWeight: 800, padding: '6px 11px', borderRadius: 9, cursor: 'pointer', minHeight: 34,
                    background: !isPractice ? pal.btnBg : pal.panelAlt,
                    color: !isPractice ? pal.btnText : pal.textStrong,
                    border: '1px solid ' + (!isPractice ? pal.btnBg : pal.border)
                  }
                }, '📖 ' + t('stem.papertrail.mode_decode', 'Browse & Decode')),
                h('button', {
                  type: 'button', 'aria-pressed': isPractice,
                  onClick: function() { setPT({ docMode: 'practice' }); },
                  className: isPractice ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                  style: {
                    fontSize: 12, fontWeight: 800, padding: '6px 11px', borderRadius: 9, cursor: 'pointer', minHeight: 34,
                    background: isPractice ? pal.btnBg : pal.panelAlt,
                    color: isPractice ? pal.btnText : pal.textStrong,
                    border: '1px solid ' + (isPractice ? pal.btnBg : pal.border)
                  }
                }, '🔍 ' + t('stem.papertrail.mode_practice', 'Inspect & Flag First'))
              )
            ),

            // Mode-specific controls & live progress bar
            isPractice
              ? h('div', {
                className: 'allo-pt-surface',
                style: {
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                  padding: '9px 12px', borderRadius: 10, marginBottom: 10,
                  background: pal.card, border: '1px solid ' + pal.border
                }
              },
                h('div', { style: { fontSize: 12.5, fontWeight: 700, color: pal.textStrong } },
                  '🎯 ' + t('stem.papertrail.practice_progress', 'Audit Mastery') + ': ' + docMastery.verifiedCount + '/' + doc.fields.length + ' ' + t('stem.papertrail.fields_verified', 'fields verified') + (docMastery.auditPassed ? ' · ✓ ' + t('stem.papertrail.presubmit_done', 'Pre-submit check passed') : '')),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', { style: { fontSize: 12, fontWeight: 900, color: docMastery.mastered ? pal.safeText : pal.accent } }, docMastery.pct + '%'),
                  h('div', { style: { width: 96, height: 8, borderRadius: 999, background: pal.svgTrack, overflow: 'hidden' } },
                    h('div', { style: { width: docMastery.pct + '%', height: 8, borderRadius: 999, background: docMastery.mastered ? pal.safeText : pal.accent } })
                  )
                )
              )
              : h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
                h('button', {
                  type: 'button', 'aria-pressed': docFilter === 'all',
                  onClick: function() { setPT({ docFilter: 'all' }); },
                  className: docFilter === 'all' ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                  style: { fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', minHeight: 30, background: docFilter === 'all' ? pal.btnBg : pal.panelAlt, color: docFilter === 'all' ? pal.btnText : pal.text, border: '1px solid ' + pal.borderSoft }
                }, __alloT('stem.paperTrail.filter_all', 'All') + ' (' + doc.fields.length + ')'),
                h('button', {
                  type: 'button', 'aria-pressed': docFilter === 'flagged',
                  onClick: function() { setPT({ docFilter: 'flagged' }); },
                  className: docFilter === 'flagged' ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                  style: { fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', minHeight: 30, background: docFilter === 'flagged' ? pal.btnBg : pal.panelAlt, color: docFilter === 'flagged' ? pal.btnText : pal.text, border: '1px solid ' + pal.borderSoft }
                }, __alloT('stem.paperTrail.filter_flagged', 'Flagged only')),
                h('button', {
                  type: 'button', onClick: function() { setAllFields(true); },
                  className: 'allo-pt-surface',
                  style: { fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', minHeight: 30, background: pal.panelAlt, color: pal.text, border: '1px solid ' + pal.borderSoft }
                }, __alloT('stem.paperTrail.expand_all', 'Expand all')),
                h('button', {
                  type: 'button', onClick: function() { setAllFields(false); },
                  className: 'allo-pt-surface',
                  style: { fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', minHeight: 30, background: pal.panelAlt, color: pal.text, border: '1px solid ' + pal.borderSoft }
                }, __alloT('stem.paperTrail.collapse_all', 'Collapse'))
              ),

            renderDocBlueprintSvg(doc, docMode),

            // Accessible Interactive Field Selector Pills mirroring the visual blueprint strips
            h('div', {
              role: 'group',
              'aria-label': t('stem.papertrail.field_jump_aria', 'Select a document field to inspect'),
              style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + pal.borderSoft }
            },
              doc.fields.map(function(f, fi) {
                var fKey = doc.id + ':' + f.id;
                var triRec = safeObj(fieldTriage[fKey]);
                var actRec = safeObj(fieldAction[fKey]);
                var verified = triRec.isCorrect === true && actRec.isCorrect === true;
                var isSelected = st.activeFieldId === f.id || (!isPractice && !!revealed[fKey]);
                return h('button', {
                  key: f.id,
                  type: 'button',
                  onClick: function() { jumpToField(f); },
                  'aria-label': t('stem.papertrail.jump_field_prefix', 'Inspect field') + ' ' + (fi + 1) + ': ' + f.label,
                  className: 'allo-pt-surface',
                  style: {
                    fontSize: 11.5, fontWeight: isSelected ? 800 : 700, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', minHeight: 30,
                    background: verified ? pal.safeBg : (isSelected ? pal.accentBg : pal.panelAlt),
                    color: verified ? pal.safeText : pal.textStrong,
                    border: '1px solid ' + (verified ? pal.safeBorder : (isSelected ? pal.accent : pal.borderSoft))
                  }
                }, (verified ? '✓ ' : ((fi + 1) + '. ')) + (f.label.length > 26 ? f.label.slice(0, 25) + '…' : f.label));
              })
            )
          ),

          h('p', { style: { fontSize: 12.5, color: pal.muted, margin: '0 0 10px', lineHeight: 1.45 } },
            isPractice
              ? t('stem.papertrail.practice_sub', 'Inspect & Flag First: classify each field as Standard, Watch, or High-Stakes, then pick Sam Rivera\'s safe next move to unlock the plain-language decode and earn mastery XP.')
              : __alloT('stem.paperTrail.doc_sub', 'Each row is a field on the real document. Open one to see what it is actually asking and how Sam filled it in.')),

          // Field Rows (Practice Predict-Before-Reveal OR Browse & Decode Accordion)
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            visibleFields.map(function(f, fi) {
              var fKey = doc.id + ':' + f.id;
              var k = KIND[f.kind] || KIND.normal;

              if (isPractice) {
                var triRec = safeObj(fieldTriage[fKey]);
                var actRec = safeObj(fieldAction[fKey]);
                var triSolved = triRec.isCorrect === true;
                var actSolved = actRec.isCorrect === true;
                var verified = triSolved && actSolved;
                var actPrompt = PAPERTRAIL_ENGINE.getFieldAuditPrompt(doc.id, f.id, typeof actRec.retries === 'number' ? actRec.retries : 0);
                var borderAccent = verified ? pal.safeBorder : (triSolved ? k.bar : pal.border);

                return h('section', {
                  key: f.id,
                  id: 'allo-pt-field-' + doc.id + '-' + f.id,
                  tabIndex: -1,
                  className: 'allo-pt-surface',
                  style: {
                    borderRadius: 12, padding: 14, background: pal.panel,
                    border: '1px solid ' + borderAccent, borderLeft: '4px solid ' + borderAccent
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 } },
                    h('div', { style: { fontWeight: 900, fontSize: 14.5, color: pal.textStrong } }, (fi + 1) + '. ' + f.label),
                    verified
                      ? h('span', { style: { fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: pal.safeBg, color: pal.safeText, border: '1px solid ' + pal.safeBorder } }, '✓ ' + t('stem.papertrail.field_verified_badge', 'Verified') + ' · ' + k.short)
                      : (triSolved
                        ? h('span', { style: { fontSize: 11, fontWeight: 900, padding: '2px 8px', borderRadius: 999, background: k.bg === 'transparent' ? pal.panelAlt : k.bg, color: k.color, border: '1px solid ' + k.border } }, '✓ ' + k.label)
                        : h('span', { style: { fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pal.panelAlt, color: pal.muted, border: '1px solid ' + pal.borderSoft } }, t('stem.papertrail.step1_tag', 'Step 1: Tag Risk')))
                  ),

                  // Step 1: Risk-Triage Selector
                  h('div', { style: { marginBottom: triSolved ? 12 : 4 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: pal.accent, marginBottom: 6 } },
                      t('stem.papertrail.triage_prompt', 'How risky is this line for Sam Rivera?')),
                    h('div', {
                      role: 'group',
                      'aria-label': t('stem.papertrail.triage_group_aria', 'Select risk level for field') + ': ' + f.label,
                      style: { display: 'flex', gap: 6, flexWrap: 'wrap' }
                    },
                      PAPERTRAIL_ENGINE.RISK_LEVELS.map(function(lvl) {
                        var lk = KIND[lvl];
                        var isPicked = triRec.chosen === lvl;
                        var isGood = triSolved && lvl === f.kind;
                        return h('button', {
                          key: lvl,
                          type: 'button',
                          disabled: triSolved,
                          'aria-pressed': isPicked,
                          onClick: function() { handleTriageChoice(f, lvl); },
                          className: isGood ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                          style: {
                            fontSize: 12, fontWeight: 800, padding: '7px 12px', borderRadius: 9, minHeight: 34,
                            cursor: triSolved ? 'default' : 'pointer',
                            background: isGood ? pal.safeBg : (isPicked && !triSolved ? pal.dangerBg : pal.panelAlt),
                            color: isGood ? pal.safeText : (isPicked && !triSolved ? pal.dangerText : pal.textStrong),
                            border: '2px solid ' + (isGood ? pal.safeBorder : (isPicked && !triSolved ? pal.dangerBorder : pal.borderSoft))
                          }
                        }, (isGood ? '✓ ' : (isPicked && !triSolved ? '✗ ' : '')) + (lk.short === lk.label ? lk.short : (lk.short + ' (' + lk.label + ')')));
                      })
                    ),
                    triRec.feedback ? h('div', {
                      'aria-live': 'polite',
                      className: 'allo-pt-surface',
                      style: {
                        marginTop: 8, padding: '8px 10px', borderRadius: 9, fontSize: 12.5, lineHeight: 1.45,
                        background: triSolved ? pal.safeBg : pal.card,
                        border: '1px solid ' + (triSolved ? pal.safeBorder : pal.watchBorder),
                        color: pal.textStrong
                      }
                    }, triRec.feedback) : null
                  ),

                  // Step 2: Safe Action Check (unlocked once Step 1 matches)
                  triSolved && actPrompt ? h('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + pal.borderSoft } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: pal.accent, marginBottom: 6 } },
                      t('stem.papertrail.step2_prompt', 'Step 2: Choose Sam\'s safe next action') + ' — ' + actPrompt.actionPrompt),
                    h('div', {
                      role: 'group',
                      'aria-label': t('stem.papertrail.action_group_aria', 'Choose Sam Rivera\'s action for field') + ': ' + f.label,
                      style: { display: 'flex', flexDirection: 'column', gap: 6 }
                    },
                      actPrompt.choices.map(function(ch, ci) {
                        var isPicked = actRec.chosenId === ch.id;
                        var isRight = actSolved && ch.id === actPrompt.bestId;
                        return h('button', {
                          key: ch.id,
                          type: 'button',
                          disabled: actSolved,
                          onClick: function() { handleFieldActionChoice(f, ch.id); },
                          className: 'allo-pt-surface',
                          style: {
                            textAlign: 'left', fontSize: 12.5, fontWeight: 600, padding: '9px 12px', borderRadius: 10, lineHeight: 1.4, minHeight: 36,
                            cursor: actSolved ? 'default' : 'pointer',
                            background: isRight ? pal.safeBg : (isPicked && !actSolved ? pal.dangerBg : pal.panel),
                            color: pal.textStrong,
                            border: '2px solid ' + (isRight ? pal.safeBorder : (isPicked && !actSolved ? pal.dangerBorder : pal.borderSoft))
                          }
                        }, (isRight ? '✓ ' : (isPicked && !actSolved ? '✗ ' : (String.fromCharCode(65 + ci) + '. '))) + ch.text);
                      })
                    ),
                    actRec.feedback && !actSolved ? h('div', {
                      'aria-live': 'polite',
                      className: 'allo-pt-surface',
                      style: {
                        marginTop: 8, padding: '8px 10px', borderRadius: 9, fontSize: 12.5, lineHeight: 1.45,
                        background: pal.dangerBg, border: '1px solid ' + pal.dangerBorder, color: pal.textStrong
                      }
                    }, h('strong', { style: { color: pal.dangerText, marginRight: 4 } }, t('stem.papertrail.why_not_head', 'Why that hurts:')), actRec.feedback) : null
                  ) : null,

                  // Revealed Decode after verification
                  verified ? h('div', {
                    'aria-live': 'polite',
                    style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid ' + pal.borderSoft }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 } },
                      h('p', { style: { margin: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: pal.safeText } },
                        '✓ ' + __alloT('stem.paperTrail.asking', 'What they are actually asking')),
                      renderSpeakBtn(f.label + '. ' + f.asking + ' Sam wrote: ' + f.answer, t('stem.papertrail.read_field_aria', 'Read field explanation aloud') + ': ' + f.label)
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13.5, lineHeight: 1.55, color: pal.text } }, f.asking),
                    h('div', {
                      className: 'allo-pt-surface',
                      style: {
                        borderRadius: 10, padding: '9px 12px', fontSize: 12.5,
                        background: pal.card, border: '1px dashed ' + pal.border, color: pal.textStrong
                      }
                    },
                      h('strong', { style: { color: pal.accent } }, __alloT('stem.paperTrail.sam_wrote', 'Sam wrote: ')),
                      f.answer
                    )
                  ) : null
                );
              }

              // Standard Browse & Decode Accordion Row
              var open = !!revealed[fKey];
              return h('div', {
                key: f.id,
                id: 'allo-pt-field-' + doc.id + '-' + f.id,
                className: 'allo-pt-surface',
                style: {
                  borderRadius: 12, overflow: 'hidden', background: pal.panel,
                  border: '1px solid ' + (f.kind === 'normal' ? pal.borderSoft : k.border),
                  borderLeft: '4px solid ' + k.bar
                }
              },
                h('button', {
                  type: 'button',
                  onClick: function() {
                    var nx = Object.assign({}, revealed); nx[fKey] = !open;
                    setPT({ revealed: nx, activeFieldId: f.id });
                    if (!open) announceToSR(f.label + '. ' + f.asking);
                  },
                  'aria-expanded': open,
                  style: {
                    width: '100%', textAlign: 'left', padding: '11px 14px', minHeight: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                    color: pal.textStrong, background: f.kind === 'normal' ? 'transparent' : k.bg,
                    border: 'none', cursor: 'pointer'
                  }
                },
                  h('span', { style: { fontWeight: 800, fontSize: 14 } }, (open ? '▾ ' : '▸ ') + f.label),
                  f.kind !== 'normal' ? h('span', {
                    style: {
                      fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em',
                      color: k.color, padding: '2px 8px', borderRadius: 999,
                      border: '1px solid ' + k.border, background: pal.panel
                    }
                  }, k.label) : h('span', { style: { fontSize: 11, fontWeight: 700, color: pal.muted } }, k.label)
                ),
                open ? h('div', { style: { padding: '10px 14px 14px', borderTop: '1px solid ' + pal.borderSoft } },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 } },
                    h('p', { style: { margin: 0, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: pal.accent } },
                      __alloT('stem.paperTrail.asking', 'What they are actually asking')),
                    h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                      renderSpeakBtn(f.label + '. ' + f.asking + ' Sam wrote: ' + f.answer, t('stem.papertrail.read_field_aria', 'Read field explanation aloud') + ': ' + f.label),
                      h('button', {
                        type: 'button',
                        onClick: function() { setPT({ docMode: 'practice', activeFieldId: f.id }); },
                        className: 'allo-pt-surface',
                        style: {
                          fontSize: 11.5, fontWeight: 800, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', minHeight: 30,
                          background: pal.accentBg, color: pal.accent, border: '1px solid ' + pal.border
                        }
                      }, '🔍 ' + t('stem.papertrail.try_flag_btn', 'Practice flagging'))
                    )
                  ),
                  h('p', { style: { margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.55, color: pal.text } }, f.asking),
                  h('div', {
                    className: 'allo-pt-surface',
                    style: {
                      borderRadius: 10, padding: '9px 12px', fontSize: 12.5,
                      background: pal.card, border: '1px dashed ' + pal.border, color: pal.textStrong
                    }
                  },
                    h('strong', { style: { color: pal.accent } }, __alloT('stem.paperTrail.sam_wrote', 'Sam wrote: ')),
                    f.answer
                  )
                ) : null
              );
            })
          ),

          // Document Blank-Line & Red-Flag Pre-Submit Audit Check
          docAuditPrompt ? h('section', {
            className: 'allo-pt-surface',
            style: {
              marginTop: 16, borderRadius: 14, padding: 15,
              background: pal.card, border: '2px solid ' + (docAuditRec.isCorrect ? pal.safeBorder : pal.border),
              boxShadow: pal.shadow
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
              h('h4', { style: { margin: 0, fontSize: 14.5, fontWeight: 900, color: pal.textStrong } }, '✍️ ' + docAuditPrompt.title),
              renderSpeakBtn(docAuditPrompt.title + '. ' + docAuditPrompt.prompt, t('stem.papertrail.read_audit_aria', 'Read document audit check aloud'))
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.5, color: pal.text } }, docAuditPrompt.prompt),
            h('div', {
              role: 'group',
              'aria-label': t('stem.papertrail.audit_choices_aria', 'Choose the safest pre-submit document check'),
              style: { display: 'flex', flexDirection: 'column', gap: 7 }
            },
              docAuditPrompt.choices.map(function(ch, ci) {
                var picked = docAuditRec.chosenId === ch.id;
                var passed = docAuditRec.isCorrect === true && ch.id === docAuditPrompt.bestId;
                return h('button', {
                  key: ch.id,
                  type: 'button',
                  disabled: docAuditRec.isCorrect === true,
                  onClick: function() { handleDocAuditChoice(docAuditPrompt.id, ch.id); },
                  className: 'allo-pt-surface',
                  style: {
                    textAlign: 'left', fontSize: 13, fontWeight: 600, padding: '10px 12px', borderRadius: 10, lineHeight: 1.45, minHeight: 40,
                    cursor: docAuditRec.isCorrect === true ? 'default' : 'pointer',
                    background: passed ? pal.safeBg : (picked && !docAuditRec.isCorrect ? pal.dangerBg : pal.panel),
                    color: pal.textStrong,
                    border: '2px solid ' + (passed ? pal.safeBorder : (picked && !docAuditRec.isCorrect ? pal.dangerBorder : pal.borderSoft))
                  }
                }, (passed ? '✓ ' : (picked && !docAuditRec.isCorrect ? '✗ ' : (String.fromCharCode(65 + ci) + '. '))) + ch.text);
              })
            ),
            docAuditRec.feedback ? h('div', {
              'aria-live': 'polite',
              className: 'allo-pt-surface',
              style: {
                marginTop: 10, padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                background: docAuditRec.isCorrect ? pal.safeBg : pal.dangerBg,
                border: '1px solid ' + (docAuditRec.isCorrect ? pal.safeBorder : pal.dangerBorder),
                color: pal.textStrong
              }
            },
              h('strong', { style: { display: 'block', marginBottom: 3, color: docAuditRec.isCorrect ? pal.safeText : pal.dangerText } },
                docAuditRec.isCorrect
                  ? ('✓ ' + t('stem.papertrail.audit_passed_head', 'Pre-Submit Audit Passed'))
                  : ('⚠ ' + t('stem.papertrail.audit_missed_head', 'Red Flag Missed — Try Again'))),
              docAuditRec.feedback
            ) : null
          ) : null,

          h('p', { style: { fontSize: 12, marginTop: 12, marginBottom: 0, color: pal.muted } },
            __alloT('stem.paperTrail.doc_foot', 'Real versions of these documents differ by employer, landlord, and state. The questions they ask are remarkably consistent.'))
          )
        );
      }

      // ─────────── SCENARIOS (9 cases, seeded shuffle, per-option whyNot, retry missed loop) ───────────
      if (view === 'scenarios') {
        var idx = st.scenCurrent;
        var sc = SCENARIOS[idx];
        var rawDone = sc ? scenDone[sc.id] : null;
        var done = (rawDone && typeof rawDone === 'object' && !Array.isArray(rawDone)) ? rawDone : null;
        var retryCount = (sc && typeof scenRetry[sc.id] === 'number' && isFinite(scenRetry[sc.id])) ? Math.max(0, Math.floor(scenRetry[sc.id])) : 0;
        var shuffledOptions = sc ? PAPERTRAIL_ENGINE.shuffleScenarioChoices(sc.options, sc.id + ':r' + retryCount) : [];
        var pickedOpt = (done && sc) ? sc.options.find(function(o) { return o.id === done.pick; }) : null;

        function pick(optId) {
          if (!sc || done) return;
          var opt = sc.options.find(function(o) { return o.id === optId; });
          if (!opt) return;
          var isProtective = Boolean(opt.ok);
          var willAward = isProtective && !st._xpScen[sc.id] && !xpSentRef.current.scen[sc.id];
          if (willAward) xpSentRef.current.scen[sc.id] = true;
          setPT(function(prior) {
            var priorScen = safeMap(prior.scenDone);
            var nx = Object.assign({}, priorScen);
            nx[sc.id] = { pick: optId, ok: isProtective, attempts: retryCount + 1 };
            var patch = { scenDone: nx };
            if (willAward) {
              var nxXp = Object.assign({}, safeMap(prior._xpScen));
              nxXp[sc.id] = true;
              patch._xpScen = nxXp;
            }
            return patch;
          });
          if (willAward) awardXP(6, 'Pressure scenario: ' + sc.id);
          announceToSR(isProtective
            ? __alloT('stem.paperTrail.good_sr', 'That is the protective choice. Explanation below.')
            : __alloT('stem.paperTrail.risky_sr', 'That one carries risk. Explanation below.'));
        }

        function retryScenario(targetId, targetIdx) {
          setPT(function(prior) {
            var nextDone = Object.assign({}, safeMap(prior.scenDone));
            delete nextDone[targetId];
            var nextRetry = Object.assign({}, safeMap(prior.scenRetry));
            var cur = typeof nextRetry[targetId] === 'number' && isFinite(nextRetry[targetId]) ? nextRetry[targetId] : 0;
            nextRetry[targetId] = cur + 1;
            var patch = { scenDone: nextDone, scenRetry: nextRetry };
            if (typeof targetIdx === 'number') patch.scenCurrent = targetIdx;
            return patch;
          });
          announceToSR(t('stem.papertrail.scen_retry_sr', 'Scenario reset with shuffled choices. Try picking the protective move.'));
        }

        function jumpToNextMissed() {
          for (var mi = 0; mi < SCENARIOS.length; mi++) {
            var mRec = scenDone[SCENARIOS[mi].id];
            if (mRec && typeof mRec === 'object' && !mRec.ok) {
              retryScenario(SCENARIOS[mi].id, mi);
              return;
            }
          }
        }

        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('scenarios', backBtn('home', __alloT('stem.paperTrail.back_home', 'PaperTrail'))),
          h('div', { id: 'allo-pt-panel', role: 'tabpanel', 'aria-labelledby': 'allo-pt-tab-scenarios' },

          // Visual Protocol Diagram
          h('div', { style: { marginBottom: 14 } }, renderPressureProtocolSvg()),

          // Mastery Summary & Retry Missed Banner
          scenMissedCount > 0 ? h('div', {
            className: 'allo-pt-surface',
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
              padding: '9px 12px', borderRadius: 12, marginBottom: 12,
              background: pal.watchBg, border: '1px solid ' + pal.watchBorder, color: pal.textStrong
            }
          },
            h('span', { style: { fontSize: 12.5, fontWeight: 800 } },
              '🔁 ' + t('stem.papertrail.missed_summary', 'You caught traps on') + ' ' + scenGoodCount + '/' + SCENARIOS.length + ' · ' + scenMissedCount + ' ' + t('stem.papertrail.missed_ready', 'ready to retry for mastery')),
            h('button', {
              type: 'button',
              onClick: jumpToNextMissed,
              className: 'allo-pt-btn-primary',
              style: {
                fontSize: 12, fontWeight: 900, padding: '6px 12px', borderRadius: 9, cursor: 'pointer', minHeight: 32,
                background: pal.btnBg, color: pal.btnText, border: 'none'
              }
            }, '↻ ' + t('stem.papertrail.retry_missed_btn', 'Retry missed scenario'))
          ) : null,

          // Clickable Scenario Step Pills
          h('div', {
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
            role: 'group', 'aria-label': __alloT('stem.paperTrail.scenario_picker', 'Choose scenario')
          },
            SCENARIOS.map(function(item, i) {
              var sRec = (scenDone[item.id] && typeof scenDone[item.id] === 'object' && !Array.isArray(scenDone[item.id])) ? scenDone[item.id] : null;
              var active = i === idx;
              var mark = sRec ? (sRec.ok ? '✓ ' : '! ') : ((i + 1) + '. ');
              return h('button', {
                key: item.id, type: 'button', 'aria-pressed': active,
                onClick: function() { setPT({ scenCurrent: i }); },
                className: active ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                style: {
                  fontSize: 12, fontWeight: active ? 900 : 700, padding: '6px 10px', borderRadius: 10, cursor: 'pointer', minHeight: 34,
                  background: active ? pal.btnBg : (sRec ? (sRec.ok ? pal.safeBg : pal.dangerBg) : pal.panel),
                  color: active ? pal.btnText : (sRec ? (sRec.ok ? pal.safeText : pal.dangerText) : pal.text),
                  border: '1px solid ' + (active ? pal.btnBg : (sRec ? (sRec.ok ? pal.safeBorder : pal.dangerBorder) : pal.borderSoft))
                }
              }, mark + (SCENARIO_TAGS[i] || ('Case ' + (i + 1))));
            })
          ),

          sc ? h('section', {
            className: 'allo-pt-surface',
            style: { background: pal.panel, border: '1px solid ' + pal.border, borderRadius: 14, padding: 16, boxShadow: pal.shadow }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 } },
              h('span', { style: { fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: pal.accent } },
                '🛡️ ' + __alloT('stem.paperTrail.pressure', 'Pressure scenarios') + ' · ' + (SCENARIO_TAGS[idx] || '')),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                renderSpeakBtn(sc.text + ' ' + shuffledOptions.map(function(o, oi) { return 'Option ' + String.fromCharCode(65 + oi) + ': ' + o.text; }).join(' '), t('stem.papertrail.read_scenario_aria', 'Read scenario and choices aloud')),
                h('span', { style: { fontSize: 12, fontWeight: 800, color: pal.muted } }, (idx + 1) + ' / ' + SCENARIOS.length)
              )
            ),
            h('div', {
              className: 'allo-pt-surface',
              style: { borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 15, fontWeight: 700, lineHeight: 1.5, background: pal.panelAlt, border: '1px solid ' + pal.borderSoft, color: pal.textStrong }
            }, sc.text),
            h('div', { role: 'group', 'aria-label': __alloT('stem.paperTrail.choose', 'Choose a response'), style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
              shuffledOptions.map(function(o, oi) {
                var picked = done && done.pick === o.id;
                var showRight = done && done.ok && o.ok;
                var stObj = done
                  ? (showRight
                    ? { background: pal.safeBg, borderColor: pal.safeBorder, color: pal.textStrong }
                    : (picked ? { background: pal.dangerBg, borderColor: pal.dangerBorder, color: pal.textStrong } : { background: pal.panel, borderColor: pal.borderSoft, color: pal.muted }))
                  : { background: pal.panel, borderColor: pal.border, color: pal.textStrong };
                return h('button', {
                  key: o.id, type: 'button', disabled: !!done,
                  onClick: function() { pick(o.id); },
                  className: 'allo-pt-surface',
                  style: Object.assign({
                    textAlign: 'left', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, fontWeight: 600, minHeight: 44,
                    borderWidth: 2, borderStyle: 'solid', cursor: done ? 'default' : 'pointer', lineHeight: 1.45
                  }, stObj)
                }, (showRight ? '✓ ' : (done && picked && !done.ok ? '✗ ' : (String.fromCharCode(65 + oi) + '. '))) + o.text);
              })
            ),
            done ? h('div', { 'aria-live': 'polite' },
              h('div', {
                className: 'allo-pt-surface',
                style: {
                  borderRadius: 12, padding: 13, fontSize: 13, lineHeight: 1.55, marginBottom: 12,
                  background: done.ok ? pal.safeBg : pal.card,
                  border: '1px solid ' + (done.ok ? pal.safeBorder : pal.dangerBorder),
                  color: pal.textStrong
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 } },
                  h('strong', { style: { color: done.ok ? pal.safeText : pal.dangerText } },
                    done.ok ? __alloT('stem.paperTrail.protective_head', '✓ Protective Move') : __alloT('stem.paperTrail.risky_head', '⚠ Watch Out for the Pressure Trap')),
                  renderSpeakBtn((!done.ok && pickedOpt && pickedOpt.whyNot ? pickedOpt.whyNot + ' ' : '') + sc.why, t('stem.papertrail.read_feedback_aria', 'Read scenario explanation aloud'))
                ),
                !done.ok && pickedOpt && pickedOpt.whyNot ? h('p', {
                  style: { margin: '0 0 8px', padding: '8px 10px', borderRadius: 8, background: pal.dangerBg, border: '1px solid ' + pal.dangerBorder, color: pal.textStrong, fontWeight: 600 }
                }, h('strong', { style: { color: pal.dangerText, marginRight: 5 } }, t('stem.papertrail.why_option_risky', 'Why that choice backfires:')), pickedOpt.whyNot) : null,
                h('p', { style: { margin: 0 } }, sc.why)
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  idx > 0 ? h('button', {
                    type: 'button', onClick: function() { setPT({ scenCurrent: idx - 1 }); },
                    className: 'allo-pt-surface',
                    style: { borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800, minHeight: 36, background: pal.panelAlt, color: pal.textStrong, border: '1px solid ' + pal.border, cursor: 'pointer' }
                  }, '← ' + __alloT('stem.paperTrail.prev', 'Previous')) : null,
                  !done.ok ? h('button', {
                    type: 'button', onClick: function() { retryScenario(sc.id, idx); },
                    className: 'allo-pt-btn-primary',
                    style: { borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 900, minHeight: 36, background: pal.btnBg, color: pal.btnText, border: 'none', cursor: 'pointer' }
                  }, '↻ ' + t('stem.papertrail.try_again_shuffled', 'Try again (shuffled choices)')) : null
                ),
                idx < SCENARIOS.length - 1
                  ? h('button', {
                    type: 'button', onClick: function() { setPT({ scenCurrent: idx + 1 }); },
                    className: done.ok ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                    style: {
                      borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 900, minHeight: 36, cursor: 'pointer',
                      background: done.ok ? pal.btnBg : pal.panelAlt,
                      color: done.ok ? pal.btnText : pal.textStrong,
                      border: done.ok ? 'none' : ('1px solid ' + pal.border)
                    }
                  }, __alloT('stem.paperTrail.next', 'Next scenario →'))
                  : h('p', { style: { margin: 0, fontSize: 12, fontWeight: 800, color: pal.accent } },
                    scenGoodCount === SCENARIOS.length
                      ? __alloT('stem.paperTrail.scen_done', 'All scenarios done. The pattern: the pressure to decide now is itself the warning sign, and asking for time is always allowed.')
                      : (t('stem.papertrail.scen_end_retry', 'Last scenario reached. Retry any missed case above to lock in all') + ' ' + SCENARIOS.length + ' ' + t('stem.papertrail.shields_word', 'shields.')))
              )
            ) : null
          ) : null
          )
        );
      }

      // ─────────── WORK RIGHTS & DISCLOSURE + ADA 3-SENTENCE BUILDER ───────────
      if (view === 'work') {
        var wIdx = st.workCurrent;
        var ws = WORK_SCENARIOS[wIdx];
        var rawWsPicked = ws ? workDone[ws.id] : null;
        var wsPicked = (rawWsPicked && typeof rawWsPicked === 'object' && !Array.isArray(rawWsPicked)) ? rawWsPicked : null;
        var adaEval = PAPERTRAIL_ENGINE.evaluateAccommodationRequest(adaDraft.task, adaDraft.barrier, adaDraft.adjustment);
        var adaPreviewText = adaDraft.previewMode === 'email' ? adaEval.emailTemplate : adaEval.composedScript;

        function updateAdaField(fieldName, val) {
          setPT(function(prior) {
            var cur = safeObj(prior.adaDraft);
            var nextAda = Object.assign({ task: '', barrier: '', adjustment: '', previewMode: 'spoken', verified: false }, cur);
            nextAda[fieldName] = val;
            return { adaDraft: nextAda };
          });
        }

        function applyAdaTemplate(tpl) {
          setPT(function(prior) {
            var cur = safeObj(prior.adaDraft);
            return {
              adaDraft: {
                task: tpl.task,
                barrier: tpl.barrier,
                adjustment: tpl.adjustment,
                previewMode: cur.previewMode === 'email' ? 'email' : 'spoken',
                verified: !!cur.verified
              }
            };
          });
          announceToSR(t('stem.papertrail.ada_template_sr', 'Loaded Sam Rivera practice template. Customize any sentence below.'));
        }

        function verifyAdaDraft() {
          if (!adaEval.readyToSend) {
            announceToSR(adaEval.feedback);
            return;
          }
          var willAward = !st._xpAda && !xpSentRef.current.ada;
          if (willAward) xpSentRef.current.ada = true;
          setPT(function(prior) {
            var cur = safeObj(prior.adaDraft);
            var nextAda = Object.assign({ task: '', barrier: '', adjustment: '', previewMode: 'spoken' }, cur, { verified: true });
            var patch = { adaDraft: nextAda };
            if (willAward) patch._xpAda = true;
            return patch;
          });
          if (willAward) awardXP(10, 'Validated ADA 3-sentence request');
          announceToSR(t('stem.papertrail.ada_verified_sr', 'ADA three-sentence request verified and saved for practice.'));
        }

        function copyAdaDraft() {
          if (!adaPreviewText || adaEval.pii.hasPII) {
            announceToSR(t('stem.papertrail.ada_copy_blocked_sr', 'Complete all parts and remove real personal details before copying.'));
            return;
          }
          copyTextValue(adaPreviewText, function() {
            if (!aliveRef.current) return;
            setAdaCopied(true);
            announceToSR(t('stem.papertrail.ada_copied_sr', 'Accommodation draft copied to clipboard.'));
            if (adaCopyTimerRef.current) clearTimeout(adaCopyTimerRef.current);
            adaCopyTimerRef.current = setTimeout(function() {
              adaCopyTimerRef.current = null;
              if (aliveRef.current) setAdaCopied(false);
            }, 2500);
          }, function() {
            if (aliveRef.current) announceToSR(__alloT('stem.paperTrail.copy_failed_sr', 'Could not copy automatically. Select the phrase text to copy.'));
          });
        }

        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('work', backBtn('home', __alloT('stem.paperTrail.back_home', 'PaperTrail'))),
          h('div', { id: 'allo-pt-panel', role: 'tabpanel', 'aria-labelledby': 'allo-pt-tab-work' },

          // Visual Stage: IDEA -> ADA Transition Cliff SVG
          h('div', { style: { marginBottom: 14 } }, renderTransitionCliffSvg()),

          h('p', { style: { fontSize: 13.5, lineHeight: 1.5, margin: '0 0 12px', color: pal.muted } },
            __alloT('stem.paperTrail.work_intro', 'School protections do not follow you to work. What replaces them is request-driven, which means knowing what to ask for is the whole skill.')),

          // Knowledge Cards (with Read Aloud buttons)
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 } },
            WORK_CARDS.map(function(c) {
              var open = !!workOpen[c.id];
              return h('div', {
                key: c.id, className: 'allo-pt-surface',
                style: { borderRadius: 12, overflow: 'hidden', background: pal.panel, border: '1px solid ' + (open ? pal.border : pal.borderSoft) }
              },
                h('button', {
                  type: 'button',
                  onClick: function() { var nx = Object.assign({}, workOpen); nx[c.id] = !open; setPT({ workOpen: nx }); },
                  'aria-expanded': open,
                  style: {
                    width: '100%', textAlign: 'left', padding: '11px 14px', minHeight: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                    color: pal.textStrong, background: open ? pal.panelAlt : 'transparent', border: 'none', cursor: 'pointer'
                  }
                },
                  h('span', { style: { fontWeight: 800, fontSize: 14 } }, (open ? '▾ ' : '▸ ') + c.title),
                  c.cite ? h('span', {
                    style: { fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: pal.accent, padding: '2px 8px', borderRadius: 999, background: pal.accentBg, border: '1px solid ' + pal.border }
                  }, c.cite) : null
                ),
                open ? h('div', { style: { padding: '10px 14px 14px', borderTop: '1px solid ' + pal.borderSoft } },
                  h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 6 } },
                    renderSpeakBtn(c.title + '. ' + c.body, t('stem.papertrail.read_card_aria', 'Read work rights card aloud') + ': ' + c.title)
                  ),
                  h('p', { style: { margin: 0, fontSize: 13.5, lineHeight: 1.6, color: pal.text } }, c.body),
                  c.cite ? h('p', { style: { fontSize: 12, marginTop: 8, marginBottom: 0, color: pal.muted, fontStyle: 'italic' } },
                    __alloT('stem.paperTrail.read_law', 'Read the actual text of ') + c.cite + __alloT('stem.paperTrail.read_law2', ' in the Education Law Navigator — nothing there is paraphrased.')) : null
                ) : null
              );
            })
          ),

          // Interactive ADA 3-Sentence Request Builder (Task -> Barrier -> Adjustment)
          h('section', {
            className: 'allo-pt-surface',
            'aria-label': t('stem.papertrail.ada_builder_aria', 'Interactive ADA three-sentence accommodation request builder'),
            style: { borderRadius: 16, padding: 16, marginBottom: 18, background: pal.panel, border: '2px solid ' + pal.accent, boxShadow: pal.shadow }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 } },
              h('h3', { style: { margin: 0, fontSize: 15.5, fontWeight: 900, color: pal.textStrong } },
                '✍️ ' + t('stem.papertrail.ada_builder_title', 'ADA 3-Sentence Request Builder (Task → Barrier → Adjustment)')),
              h('span', {
                style: {
                  fontSize: 11, fontWeight: 900, padding: '3px 9px', borderRadius: 999,
                  background: adaEval.readyToSend ? pal.safeBg : pal.accentBg,
                  color: adaEval.readyToSend ? pal.safeText : pal.accent,
                  border: '1px solid ' + (adaEval.readyToSend ? pal.safeBorder : pal.border)
                }
              }, adaEval.score + '/3 ' + t('stem.papertrail.parts_ready', 'parts ready'))
            ),
            h('p', { style: { fontSize: 12.5, lineHeight: 1.5, margin: '0 0 10px', color: pal.muted } },
              t('stem.papertrail.ada_builder_sub', 'Practice writing a clear workplace accommodation request using Sam Rivera\'s fictional identity. You do not need a medical diagnosis or legal jargon to ask (29 CFR 1630.9). Never type real SSNs, phone numbers, emails, or bank info.')),

            // Sam Rivera Starter Template Chips
            h('div', {
              role: 'group',
              'aria-label': t('stem.papertrail.ada_templates_aria', 'Sam Rivera starter templates'),
              style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }
            },
              h('span', { style: { fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: pal.accent } },
                t('stem.papertrail.sam_starters', 'Sam Rivera starters:')),
              ADA_TEMPLATES.map(function(tpl) {
                return h('button', {
                  key: tpl.id, type: 'button',
                  onClick: function() { applyAdaTemplate(tpl); },
                  className: 'allo-pt-surface',
                  style: {
                    fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', minHeight: 30,
                    background: pal.panelAlt, color: pal.textStrong, border: '1px solid ' + pal.border
                  }
                }, tpl.label);
              }),
              h('button', {
                type: 'button',
                onClick: function() { setPT({ adaDraft: { task: '', barrier: '', adjustment: '', previewMode: adaDraft.previewMode, verified: false } }); },
                className: 'allo-pt-surface',
                style: {
                  fontSize: 11.5, fontWeight: 700, padding: '5px 9px', borderRadius: 999, cursor: 'pointer', minHeight: 30,
                  background: pal.panel, color: pal.muted, border: '1px solid ' + pal.borderSoft
                }
              }, t('stem.papertrail.clear_draft', 'Clear'))
            ),

            // Guided 3-part inputs
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 } },
              h('div', null,
                h('label', { htmlFor: 'allo-pt-ada-task', style: { display: 'block', fontSize: 12.5, fontWeight: 800, color: pal.textStrong, marginBottom: 4 } },
                  '1. ' + t('stem.papertrail.ada_label_task', 'Task — What job duty or strength are you talking about?')),
                h('textarea', {
                  id: 'allo-pt-ada-task',
                  className: 'allo-pt-textarea',
                  value: adaDraft.task,
                  onChange: function(e) { updateAdaField('task', e && e.target ? e.target.value : ''); },
                  placeholder: t('stem.papertrail.ada_ph_task', 'Example: I do accurate work stocking shelves and organizing displays on shift.'),
                  style: { background: pal.panelAlt, border: '1px solid ' + (adaEval.checks.task.passed ? pal.safeBorder : pal.border), color: pal.textStrong }
                })
              ),
              h('div', null,
                h('label', { htmlFor: 'allo-pt-ada-barrier', style: { display: 'block', fontSize: 12.5, fontWeight: 800, color: pal.textStrong, marginBottom: 4 } },
                  '2. ' + t('stem.papertrail.ada_label_barrier', 'Barrier — What work condition gets in the way (no diagnosis needed)?')),
                h('textarea', {
                  id: 'allo-pt-ada-barrier',
                  className: 'allo-pt-textarea',
                  value: adaDraft.barrier,
                  onChange: function(e) { updateAdaField('barrier', e && e.target ? e.target.value : ''); },
                  placeholder: t('stem.papertrail.ada_ph_barrier', 'Example: Spoken multi-step instructions given all at once are hard for me to hold onto.'),
                  style: { background: pal.panelAlt, border: '1px solid ' + (adaEval.checks.barrier.passed ? pal.safeBorder : pal.border), color: pal.textStrong }
                })
              ),
              h('div', null,
                h('label', { htmlFor: 'allo-pt-ada-adjustment', style: { display: 'block', fontSize: 12.5, fontWeight: 800, color: pal.textStrong, marginBottom: 4 } },
                  '3. ' + t('stem.papertrail.ada_label_adjustment', 'Adjustment — What practical change would help you do the job?')),
                h('textarea', {
                  id: 'allo-pt-ada-adjustment',
                  className: 'allo-pt-textarea',
                  value: adaDraft.adjustment,
                  onChange: function(e) { updateAdaField('adjustment', e && e.target ? e.target.value : ''); },
                  placeholder: t('stem.papertrail.ada_ph_adjustment', 'Example: Could I get my task list in writing or take a photo of the shift board?'),
                  style: { background: pal.panelAlt, border: '1px solid ' + (adaEval.checks.adjustment.passed ? pal.safeBorder : pal.border), color: pal.textStrong }
                })
              )
            ),

            // Strict PII Alert Banner (whenever real-looking SSN/phone/email/bank detected)
            adaEval.pii.hasPII ? h('div', {
              role: 'alert',
              className: 'allo-pt-surface',
              style: {
                borderRadius: 11, padding: '10px 12px', marginBottom: 12,
                background: pal.dangerBg, border: '2px solid ' + pal.dangerBorder, color: pal.textStrong
              }
            },
              h('strong', { style: { display: 'block', color: pal.dangerText, fontSize: 13, marginBottom: 4 } },
                '🛑 ' + t('stem.papertrail.pii_alert_head', 'Personal Data Safety Alert — Keep Practice Fictional')),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.45 } },
                adaEval.pii.flags.map(function(flg, fi) {
                  return h('li', { key: flg.flagType + '_' + fi }, h('strong', null, flg.label + ': '), flg.advice);
                })
              )
            ) : null,

            // Live 5-Part Deterministic Rubric Checklist
            h('div', {
              'aria-live': 'polite',
              className: 'allo-pt-surface',
              style: { borderRadius: 12, padding: 12, marginBottom: 12, background: pal.panelAlt, border: '1px solid ' + pal.borderSoft }
            },
              h('div', { style: { fontSize: 11.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: pal.accent, marginBottom: 6 } },
                t('stem.papertrail.ada_checklist_head', 'Live 3-Sentence Request Checklist')),
              h('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12.5 } },
                [
                  { id: 'task', label: t('stem.papertrail.chk_task', 'Task'), rec: adaEval.checks.task, warnOnly: false },
                  { id: 'barrier', label: t('stem.papertrail.chk_barrier', 'Barrier'), rec: adaEval.checks.barrier, warnOnly: false },
                  { id: 'adjustment', label: t('stem.papertrail.chk_adjustment', 'Adjustment'), rec: adaEval.checks.adjustment, warnOnly: false },
                  { id: 'privacy', label: t('stem.papertrail.chk_privacy', 'Privacy (No diagnosis required)'), rec: adaEval.checks.privacyNoDiagnosis, warnOnly: true },
                  { id: 'pii', label: t('stem.papertrail.chk_pii', 'PII Safety Guard'), rec: adaEval.checks.piiSafe, warnOnly: false }
                ].map(function(row) {
                  var icon = row.rec.passed ? '✓' : (row.warnOnly ? 'ℹ' : '○');
                  var col = row.rec.passed ? pal.safeText : (row.id === 'pii' ? pal.dangerText : (row.warnOnly ? pal.watchText : pal.muted));
                  return h('li', { key: row.id, style: { display: 'flex', alignItems: 'flex-start', gap: 7, lineHeight: 1.4 } },
                    h('span', { style: { fontWeight: 900, color: col, flexShrink: 0 } }, icon),
                    h('span', { style: { color: pal.text } }, h('strong', { style: { color: pal.textStrong } }, row.label + ': '), row.rec.tip)
                  );
                })
              )
            ),

            // Live Composed Preview (Spoken Script vs Follow-Up Email) + Read Aloud / Copy / Verify XP
            h('div', {
              className: 'allo-pt-surface',
              style: { borderRadius: 12, padding: 12, background: pal.card, border: '1px dashed ' + pal.border }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
                h('div', {
                  role: 'group',
                  'aria-label': t('stem.papertrail.ada_format_aria', 'Preview format'),
                  style: { display: 'flex', gap: 6 }
                },
                  h('button', {
                    type: 'button', 'aria-pressed': adaDraft.previewMode !== 'email',
                    onClick: function() { updateAdaField('previewMode', 'spoken'); },
                    className: adaDraft.previewMode !== 'email' ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                    style: { fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', minHeight: 30, background: adaDraft.previewMode !== 'email' ? pal.btnBg : pal.panel, color: adaDraft.previewMode !== 'email' ? pal.btnText : pal.textStrong, border: '1px solid ' + pal.border }
                  }, t('stem.papertrail.format_spoken', 'Spoken script')),
                  h('button', {
                    type: 'button', 'aria-pressed': adaDraft.previewMode === 'email',
                    onClick: function() { updateAdaField('previewMode', 'email'); },
                    className: adaDraft.previewMode === 'email' ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                    style: { fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8, cursor: 'pointer', minHeight: 30, background: adaDraft.previewMode === 'email' ? pal.btnBg : pal.panel, color: adaDraft.previewMode === 'email' ? pal.btnText : pal.textStrong, border: '1px solid ' + pal.border }
                  }, t('stem.papertrail.format_email', 'Follow-up email'))
                ),
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                  adaPreviewText ? renderSpeakBtn(adaPreviewText, t('stem.papertrail.read_ada_aria', 'Read accommodation request draft aloud')) : null,
                  h('button', {
                    type: 'button',
                    disabled: !adaPreviewText || adaEval.pii.hasPII,
                    onClick: copyAdaDraft,
                    className: 'allo-pt-surface',
                    style: {
                      fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8, minHeight: 30,
                      cursor: (!adaPreviewText || adaEval.pii.hasPII) ? 'not-allowed' : 'pointer',
                      opacity: (!adaPreviewText || adaEval.pii.hasPII) ? 0.55 : 1,
                      background: pal.panel, color: pal.textStrong, border: '1px solid ' + pal.border
                    }
                  }, adaCopied ? ('✓ ' + __alloT('stem.paperTrail.copied', 'Copied')) : ('📋 ' + t('stem.papertrail.copy_draft', 'Copy draft'))),
                  h('button', {
                    type: 'button',
                    disabled: !adaEval.readyToSend,
                    onClick: verifyAdaDraft,
                    className: adaEval.readyToSend ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                    style: {
                      fontSize: 11.5, fontWeight: 900, padding: '5px 11px', borderRadius: 8, minHeight: 30,
                      cursor: adaEval.readyToSend ? 'pointer' : 'not-allowed',
                      opacity: adaEval.readyToSend ? 1 : 0.6,
                      background: adaEval.readyToSend ? pal.btnBg : pal.panelAlt,
                      color: adaEval.readyToSend ? pal.btnText : pal.muted,
                      border: '1px solid ' + (adaEval.readyToSend ? pal.btnBg : pal.borderSoft)
                    }
                  }, (adaDraft.verified || st._xpAda) ? ('✓ ' + t('stem.papertrail.ada_saved_btn', 'Request Verified')) : ('✓ ' + t('stem.papertrail.ada_verify_btn', 'Verify Practice Request')))
                )
              ),
              h('div', {
                style: {
                  whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.55,
                  color: adaPreviewText ? pal.textStrong : pal.muted,
                  fontStyle: adaPreviewText ? 'normal' : 'italic'
                }
              }, adaPreviewText || t('stem.papertrail.ada_empty_preview', 'Pick a Sam Rivera starter above or type your three sentences to preview your spoken script and follow-up email.'))
            )
          ),

          // Disclosure Decisions Interactive Panel (unscored — scientific-integrity rule)
          h('section', {
            className: 'allo-pt-surface',
            style: { borderRadius: 16, padding: 16, background: pal.card, border: '2px solid ' + pal.border, boxShadow: pal.shadow }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
              h('h3', { style: { margin: 0, fontSize: 15, fontWeight: 900, color: pal.textStrong } }, '⚖️ ' + __alloT('stem.paperTrail.disclosure_title', 'Disclosure decisions')),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                ws ? renderSpeakBtn(ws.text + (wsPicked ? (' ' + ws.why) : ''), t('stem.papertrail.read_disclosure_aria', 'Read disclosure situation aloud')) : null,
                h('span', { style: { fontSize: 12, fontWeight: 800, color: pal.muted } }, (wIdx + 1) + ' / ' + WORK_SCENARIOS.length)
              )
            ),
            h('p', { style: { fontSize: 12.5, lineHeight: 1.5, margin: '0 0 12px', color: pal.muted } },
              __alloT('stem.paperTrail.disclosure_sub', 'These are not scored. Every option below is a real choice someone might make, with a real consequence — pick the one you would actually make, then read what follows from it.')),
            // Case switcher pills
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }, role: 'group', 'aria-label': __alloT('stem.paperTrail.work_cases_aria', 'Select disclosure situation') },
              WORK_SCENARIOS.map(function(item, i) {
                var active = i === wIdx;
                var doneItem = !!workDone[item.id];
                return h('button', {
                  key: item.id, type: 'button', 'aria-pressed': active,
                  onClick: function() { setPT({ workCurrent: i }); },
                  className: active ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                  style: {
                    fontSize: 11.5, fontWeight: active ? 900 : 700, padding: '5px 10px', borderRadius: 999, cursor: 'pointer', minHeight: 32,
                    background: active ? pal.btnBg : (doneItem ? pal.safeBg : pal.panel),
                    color: active ? pal.btnText : (doneItem ? pal.safeText : pal.text),
                    border: '1px solid ' + (active ? pal.btnBg : (doneItem ? pal.safeBorder : pal.borderSoft))
                  }
                }, (doneItem ? '✓ ' : ((i + 1) + '. ')) + (WORK_TIMING_TAGS[i] || ('Case ' + (i + 1))));
              })
            ),
            ws ? h('div', {
              className: 'allo-pt-surface',
              style: { borderRadius: 12, padding: 13, marginBottom: 12, fontSize: 14, fontWeight: 700, lineHeight: 1.5, background: pal.panel, border: '1px solid ' + pal.border, color: pal.textStrong }
            }, ws.text) : null,
            ws ? h('div', { role: 'group', 'aria-label': __alloT('stem.paperTrail.choose', 'Choose a response'), style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 } },
              ws.options.map(function(o) {
                var picked = wsPicked && wsPicked.pick === o.id;
                return h('button', {
                  key: o.id, type: 'button', disabled: !!wsPicked,
                  onClick: function() {
                    if (wsPicked) return;
                    var willAward = !st._xpWork[ws.id] && !xpSentRef.current.work[ws.id];
                    if (willAward) xpSentRef.current.work[ws.id] = true;
                    setPT(function(prior) {
                      var priorWork = safeMap(prior.workDone);
                      if (priorWork[ws.id]) return null;
                      var nx = Object.assign({}, priorWork);
                      nx[ws.id] = { pick: o.id };
                      var patch = { workDone: nx };
                      if (willAward) {
                        var nxXpW = Object.assign({}, safeMap(prior._xpWork));
                        nxXpW[ws.id] = true;
                        patch._xpWork = nxXpW;
                      }
                      return patch;
                    });
                    if (willAward) awardXP(4, 'Disclosure decision considered');
                    announceToSR(__alloT('stem.paperTrail.considered_sr', 'Choice recorded. What follows from it is shown below.'));
                  },
                  className: 'allo-pt-surface',
                  style: picked
                    ? { textAlign: 'left', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 700, minHeight: 42, background: pal.accentBg, border: '2px solid ' + pal.accent, color: pal.textStrong, cursor: 'default' }
                    : { textAlign: 'left', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, minHeight: 42, background: pal.panel, border: '2px solid ' + pal.borderSoft, color: wsPicked ? pal.muted : pal.textStrong, cursor: wsPicked ? 'default' : 'pointer' }
                }, (picked ? '● ' : '') + o.text);
              })
            ) : null,
            ws && wsPicked ? h('div', { 'aria-live': 'polite' },
              h('div', {
                className: 'allo-pt-surface',
                style: { borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.55, marginBottom: 12, background: pal.panel, border: '1px solid ' + pal.border, color: pal.text }
              }, ws.why),
              wIdx < WORK_SCENARIOS.length - 1
                ? h('button', {
                  type: 'button', onClick: function() { setPT({ workCurrent: wIdx + 1 }); },
                  className: 'allo-pt-btn-primary',
                  style: { borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 900, minHeight: 36, background: pal.btnBg, color: pal.btnText, border: 'none', cursor: 'pointer' }
                }, __alloT('stem.paperTrail.next_case', 'Next situation →'))
                : h('p', { style: { margin: 0, fontSize: 12.5, fontWeight: 800, color: pal.accent } },
                  __alloT('stem.paperTrail.work_done', 'All four considered. The through-line: nothing is automatic after school, and asking early is usually cheaper than recovering later.'))
            ) : null
          )
          )
        );
      }

      // ─────────── SCRIPTS (with Read Aloud on every card) ───────────
      if (view === 'scripts') {
        function markCopied(i) {
          if (!aliveRef.current) return;
          setPT({ copiedIdx: i });
          announceToSR(__alloT('stem.paperTrail.copied_sr', 'Phrase copied for practice.'));
          if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
          copyTimerRef.current = setTimeout(function() {
            copyTimerRef.current = null;
            if (aliveRef.current) setPT({ copiedIdx: -1 });
          }, 2500);
        }
        function copyPhrase(text, i) {
          copyTextValue(text, function() {
            markCopied(i);
          }, function() {
            if (aliveRef.current) announceToSR(__alloT('stem.paperTrail.copy_failed_sr', 'Could not copy automatically. Select the phrase text to copy.'));
          });
        }
        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('scripts', backBtn('home', __alloT('stem.paperTrail.back_home', 'PaperTrail'))),
          h('div', { id: 'allo-pt-panel', role: 'tabpanel', 'aria-labelledby': 'allo-pt-tab-scripts' },
          h('p', { style: { fontSize: 13.5, lineHeight: 1.5, margin: '0 0 14px', color: pal.muted } },
            __alloT('stem.paperTrail.scripts_intro', 'Asking for time is a skill, not an admission that you cannot read. These six sentences work in almost every room. Say them plainly; you do not need to apologize.')),
          h('ul', { className: 'allo-pt-grid-2', style: { listStyle: 'none', padding: 0, margin: 0 } },
            HELP_SCRIPTS.map(function(s, i) {
              var meta = SCRIPT_META[i] || { cat: 'Boundary', tag: 'Phrase', when: '' };
              var practiced = !!rehearsed[String(i)];
              return h('li', {
                key: i, className: 'allo-pt-surface',
                style: {
                  borderRadius: 14, padding: 14, background: pal.panel,
                  border: '1px solid ' + (practiced ? pal.safeBorder : pal.border),
                  display: 'flex', flexDirection: 'column', gap: 8, boxShadow: pal.shadow
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' } },
                  h('span', { style: { fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: pal.accent } }, meta.cat + ' · ' + meta.tag),
                  practiced ? h('span', { style: { fontSize: 11, fontWeight: 800, color: pal.safeText } }, '✓ ' + __alloT('stem.paperTrail.rehearsed_tag', 'Rehearsed')) : null
                ),
                h('div', { style: { fontSize: 15, fontWeight: 800, lineHeight: 1.45, color: pal.textStrong } }, '“' + s + '”'),
                meta.when ? h('div', { style: { fontSize: 12, color: pal.muted } }, meta.when) : null,
                h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 6 } },
                  renderSpeakBtn(s, t('stem.papertrail.read_script_aria', 'Read script phrase aloud') + ' ' + (i + 1)),
                  h('button', {
                    type: 'button', 'aria-pressed': practiced,
                    onClick: function() {
                      var nx = Object.assign({}, rehearsed);
                      nx[String(i)] = !practiced;
                      setPT({ rehearsed: nx });
                    },
                    className: practiced ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                    style: {
                      fontSize: 11.5, fontWeight: 800, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', minHeight: 30,
                      background: practiced ? pal.btnBg : pal.panelAlt,
                      color: practiced ? pal.btnText : pal.textStrong,
                      border: '1px solid ' + (practiced ? pal.btnBg : pal.borderSoft)
                    }
                  }, practiced ? '✓ ' + __alloT('stem.paperTrail.practiced_btn', 'Practiced') : __alloT('stem.paperTrail.mark_practiced', 'Mark rehearsed')),
                  h('button', {
                    type: 'button', onClick: function() { copyPhrase(s, i); },
                    className: 'allo-pt-surface',
                    style: {
                      fontSize: 11.5, fontWeight: 700, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', minHeight: 30,
                      background: pal.panel, color: pal.text, border: '1px solid ' + pal.borderSoft
                    }
                  }, copiedIdx === i ? '✓ ' + __alloT('stem.paperTrail.copied', 'Copied') : __alloT('stem.paperTrail.copy', 'Copy phrase'))
                )
              );
            })
          ),
          h('p', { style: { fontSize: 12.5, marginTop: 14, marginBottom: 0, lineHeight: 1.5, color: pal.muted } },
            __alloT('stem.paperTrail.scripts_foot', 'If someone refuses all six, that refusal is information about them, not about you.'))
          )
        );
      }

      return null;
    }
  });

})();

}
