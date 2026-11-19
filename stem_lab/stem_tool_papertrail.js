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
  var SCENARIOS = [
    { id: 's1', text: 'A manager hands you a job offer packet and says: "Just sign the last page, the rest is standard."',
      options: [
        { id: 'a', text: 'Sign it — he says it is standard.', ok: false },
        { id: 'b', text: '"Can I take a few minutes to read it? I want to understand what I am agreeing to."', ok: true },
        { id: 'c', text: 'Sign it and read it at home later.', ok: false }
      ],
      why: 'Reading time is always a reasonable ask, and an employer who refuses it has told you something important. Signing first and reading later reverses the only order that protects you: once signed, your leverage is gone.' },
    { id: 's2', text: 'An online job listing asks for your Social Security number and a photo of your ID before any interview.',
      options: [
        { id: 'a', text: 'Provide them — employers need this eventually.', ok: false },
        { id: 'b', text: 'Send only the SSN, not the ID.', ok: false },
        { id: 'c', text: 'Ask why it is needed now and whether it can wait until after an offer.', ok: true }
      ],
      why: 'Legitimate employers collect an SSN on tax paperwork AFTER hiring, not to screen applicants. "Before any interview" is a classic identity-theft pattern. Asking why costs you nothing and a real employer will have an answer.' },
    { id: 's3', text: 'A landlord will not give you a copy of the lease until after you sign it.',
      options: [
        { id: 'a', text: 'Photograph every page before signing and ask for your copy in writing.', ok: true },
        { id: 'b', text: 'Sign — you can request a copy afterward.', ok: false },
        { id: 'c', text: 'Sign and trust the verbal terms you discussed.', ok: false }
      ],
      why: 'You are entitled to know what you signed. Verbal promises are nearly impossible to enforce against a written document that says otherwise, and "I will send it later" too often does not happen.' },
    { id: 's4', text: 'A form has a blank line above the signature that nobody filled in.',
      options: [
        { id: 'a', text: 'Sign — the blank is probably nothing.', ok: false },
        { id: 'b', text: 'Ask what belongs there, then fill it or strike it through before signing.', ok: true },
        { id: 'c', text: 'Fill in something reasonable yourself.', ok: false }
      ],
      why: 'A blank above a signature can be completed after you sign, and then it is part of what you agreed to. Striking through unused blanks takes five seconds and closes the hole.' },
    { id: 's5', text: 'At your IEP meeting the team hands you a document and asks you to sign at the end.',
      options: [
        { id: 'a', text: 'Sign — everyone is waiting.', ok: false },
        { id: 'b', text: 'Sign but say you disagree out loud.', ok: false },
        { id: 'c', text: '"I would like to take this home and read it before I sign."', ok: true }
      ],
      why: 'You may take time to read, and asking is normal — the room waiting is social pressure, not a rule. Saying you disagree while signing anyway leaves a signature on the record and your objection nowhere. If you disagree, that belongs in writing.' }
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

  var SCENARIO_TAGS = ['Rushed Signature', 'Pre-Interview SSN', 'Withheld Lease', 'Blank Line', 'IEP Pressure'];
  var WORK_TIMING_TAGS = ['Pre-Offer Form', 'Interview Test', 'On the Job', 'Interview Question'];

  // Scoped styling for focus rings, reduced motion, responsive grids, and .theme-contrast parity
  (function injectPaperTrailStyles() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-papertrail-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-papertrail-css';
    st.textContent = [
      '.allo-pt-shell{box-sizing:border-box;min-width:0;overflow-wrap:anywhere;}',
      '.allo-pt-shell *,.allo-pt-shell *::before,.allo-pt-shell *::after{box-sizing:border-box;}',
      '.allo-pt-shell button:focus-visible,.allo-pt-shell [tabindex]:focus-visible{outline:3px solid #d97706;outline-offset:2px;}',
      '.allo-pt-card{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;}',
      '.allo-pt-card:hover{transform:translateY(-1px);}',
      '.allo-pt-tab[aria-selected="true"]{font-weight:900;}',
      '.allo-pt-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}',
      '.allo-pt-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}',
      '@media(max-width:700px){.allo-pt-grid-2,.allo-pt-grid-3{grid-template-columns:minmax(0,1fr);}}',
      '@media(prefers-reduced-motion:reduce){.allo-pt-card,.allo-pt-shell *{transition:none!important;animation:none!important;transform:none!important;}}',
      '.theme-contrast .allo-pt-shell{background:#000000!important;color:#ffff00!important;border-color:#ffff00!important;}',
      '.theme-contrast .allo-pt-shell button:focus-visible{outline:3px solid #ffffff!important;outline-offset:2px;}',
      '.theme-contrast .allo-pt-surface{background:#000000!important;border-color:#ffff00!important;color:#ffff00!important;}',
      '.theme-contrast .allo-pt-btn-primary{background:#ffff00!important;color:#000000!important;border:2px solid #ffff00!important;}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  function safeObj(val) {
    return (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};
  }
  function safeIndex(val, len) {
    var n = typeof val === 'number' && isFinite(val) ? Math.floor(val) : 0;
    if (len <= 0) return 0;
    return Math.max(0, Math.min(len - 1, n));
  }
  function countTruthyKeys(obj) {
    var o = safeObj(obj);
    var c = 0;
    var ks = Object.keys(o);
    for (var i = 0; i < ks.length; i++) if (o[ks[i]]) c++;
    return c;
  }

  window.StemLab.registerTool('paperTrail', {
    icon: '\uD83D\uDDC4\uFE0F',
    label: 'PaperTrail: Official Documents',
    desc: 'Practice reading and completing the documents adult life runs on — job applications, W-4s, leases, medical intake, permits, and your own IEP meeting invitation. Every field is decoded in plain language, the boxes that can cost you are flagged, and all practice uses a fictional identity because you should never type real personal information into a practice tool.',
    color: 'amber',
    category: 'applied',
    questHooks: [
      { id: 'pt_decode', label: 'Decode fields across two different documents', icon: '📄', check: function(d) { return d && d.seenDocs && typeof d.seenDocs === 'object' && !Array.isArray(d.seenDocs) && Object.keys(d.seenDocs).length >= 2; }, progress: function(d) { return ((d && d.seenDocs && typeof d.seenDocs === 'object' && !Array.isArray(d.seenDocs) && Object.keys(d.seenDocs).length) || 0) + '/2 documents'; } },
      { id: 'pt_judgment', label: 'Work through 4 pressure scenarios', icon: '🛡️', check: function(d) { return d && d.scenDone && typeof d.scenDone === 'object' && !Array.isArray(d.scenDone) && Object.keys(d.scenDone).length >= 4; }, progress: function(d) { return ((d && d.scenDone && typeof d.scenDone === 'object' && !Array.isArray(d.scenDone) && Object.keys(d.scenDone).length) || 0) + '/4 scenarios'; } },
      { id: 'pt_work', label: 'Think through the disclosure decisions', icon: '⚖️', check: function(d) { return d && d.workDone && typeof d.workDone === 'object' && !Array.isArray(d.workDone) && Object.keys(d.workDone).length >= 3; }, progress: function(d) { return ((d && d.workDone && typeof d.workDone === 'object' && !Array.isArray(d.workDone) && Object.keys(d.workDone).length) || 0) + '/3 decisions'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = safeObj(ctx.toolData);
      var setLabToolData = typeof ctx.setToolData === 'function' ? ctx.setToolData : function() {};
      var setStemLabTool = ctx.setStemLabTool;
      var announceToSR = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function() {};
      var awardXP = function(n, why) { if (ctx.awardXP) ctx.awardXP('paperTrail', n, why); };

      // Dark app chrome places plugin content on a light card; keep darkApp === light
      // (pinned by tests/paper_trail.test.js) and reserve dark surface for contrast theme.
      var isContrast = !!ctx.isContrast || ctx.theme === 'contrast';
      var isDark = false;

      var d = safeObj(labToolData.paperTrail);
      function setPT(patch) {
        setLabToolData(function(prev) {
          var prevSafe = safeObj(prev);
          var prior = safeObj(prevSafe.paperTrail);
          return Object.assign({}, prevSafe, { paperTrail: Object.assign({}, prior, patch) });
        });
      }

      var rawView = typeof d.view === 'string' ? d.view : 'home';
      var view = (rawView === 'home' || rawView === 'doc' || rawView === 'scenarios' || rawView === 'scripts' || rawView === 'work') ? rawView : 'home';
      var seenDocs = safeObj(d.seenDocs);
      var revealed = safeObj(d.revealed);
      var scenDone = safeObj(d.scenDone);
      var workDone = safeObj(d.workDone);
      var workOpen = safeObj(d.workOpen);
      var rehearsed = safeObj(d.rehearsed);
      var docFilter = d.docFilter === 'flagged' ? 'flagged' : 'all';
      var copiedIdx = typeof d.copiedIdx === 'number' ? d.copiedIdx : -1;

      var totalFields = DOCS.reduce(function(sum, doc) { return sum + doc.fields.length; }, 0);
      var decodedDocsCount = DOCS.filter(function(doc) { return !!seenDocs[doc.id]; }).length;
      var revealedCount = 0;
      DOCS.forEach(function(doc) {
        doc.fields.forEach(function(f) { if (revealed[doc.id + ':' + f.id]) revealedCount++; });
      });
      var scenDoneCount = SCENARIOS.filter(function(s) { return !!scenDone[s.id]; }).length;
      var scenGoodCount = SCENARIOS.filter(function(s) { return scenDone[s.id] && scenDone[s.id].ok; }).length;
      var workDoneCount = WORK_SCENARIOS.filter(function(w) { return !!workDone[w.id]; }).length;

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
            padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            background: pal.panel, border: '1px solid ' + pal.border, color: pal.textStrong
          }
        }, '← ' + label);
      }

      // Bespoke inline SVG emblem: Dossier sheet + highlighted danger ribbon + magnifying glass
      function renderHeroEmblem() {
        return h('svg', {
          width: 48, height: 48, viewBox: '0 0 48 48', role: 'img',
          'aria-label': __alloT('stem.paperTrail.emblem_alt', 'PaperTrail official document decoder emblem'),
          style: { flexShrink: 0, display: 'block' }
        },
          h('rect', { x: 2, y: 2, width: 44, height: 44, rx: 12, fill: pal.accentBg, stroke: pal.border, strokeWidth: 1.5 }),
          h('path', { d: 'M12 9h15l7 7v23a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z', fill: pal.svgPaper, stroke: pal.svgInk, strokeWidth: 1.5 }),
          h('path', { d: 'M27 9v7h7', fill: 'none', stroke: pal.svgInk, strokeWidth: 1.5, strokeLinejoin: 'round' }),
          h('rect', { x: 14, y: 17, width: 12, height: 2.5, rx: 1, fill: pal.svgMuted }),
          h('rect', { x: 14, y: 22.5, width: 16, height: 3, rx: 1, fill: KIND.watch.bar }),
          h('rect', { x: 14, y: 28.5, width: 14, height: 3, rx: 1, fill: KIND.danger.bar }),
          h('line', { x1: 14, y1: 35.5, x2: 24, y2: 35.5, stroke: pal.svgInk, strokeWidth: 1.4, strokeDasharray: '2 2' }),
          h('circle', { cx: 33, cy: 32, r: 6.5, fill: pal.svgPaper, stroke: pal.accent, strokeWidth: 2.2 }),
          h('line', { x1: 37.8, y1: 36.8, x2: 42, y2: 41, stroke: pal.accent, strokeWidth: 2.6, strokeLinecap: 'round' }),
          h('path', { d: 'M30.6 32.1l1.7 1.7 3.2-3.4', fill: 'none', stroke: pal.safeText, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' })
        );
      }

      // Unified Hero Workbench Header + WAI-ARIA tablist across views
      function renderWorkbenchHeader(activeTab, subBack) {
        var tabs = [
          { id: 'home', label: __alloT('stem.paperTrail.tab_docs', 'Documents'), badge: decodedDocsCount + '/' + DOCS.length },
          { id: 'scenarios', label: __alloT('stem.paperTrail.tab_scenarios', 'Pressure'), badge: scenDoneCount + '/' + SCENARIOS.length },
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
              subBack ? subBack : backBtn(null, __alloT('stem.paperTrail.tools', 'Tools')),
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
              }, __alloT('stem.paperTrail.pill_fields', 'Fields') + ': ' + revealedCount + '/' + totalFields),
              h('span', {
                style: {
                  fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 999,
                  background: pal.panel, border: '1px solid ' + pal.borderSoft, color: pal.text
                }
              }, __alloT('stem.paperTrail.pill_shield', 'Shield') + ': ' + scenGoodCount + '/' + SCENARIOS.length)
            )
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 } },
            renderHeroEmblem(),
            h('div', { style: { flex: '1 1 240px', minWidth: 0 } },
              h('h2', { style: { margin: 0, fontSize: 20, fontWeight: 900, lineHeight: 1.2, color: pal.textStrong } },
                __alloT('stem.paperTrail.title', 'PaperTrail: Official Documents')),
              h('p', { style: { margin: '4px 0 0', fontSize: 13, lineHeight: 1.45, color: pal.muted } },
                __alloT('stem.paperTrail.intro', 'Adult life runs on documents nobody teaches you to read. Pick one and go field by field: what each box is really asking, which ones can cost you, and what to say when someone wants you to sign right now.'))
            )
          ),
          h('div', {
            role: 'tablist',
            'aria-label': __alloT('stem.paperTrail.nav_label', 'PaperTrail sections'),
            style: { display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 10, borderTop: '1px solid ' + pal.borderSoft }
          },
            tabs.map(function(tb) {
              var selected = activeTab === tb.id || (activeTab === 'doc' && tb.id === 'home');
              return h('button', {
                key: tb.id,
                type: 'button',
                role: 'tab',
                'aria-selected': selected,
                className: 'allo-pt-tab' + (selected ? ' allo-pt-btn-primary' : ' allo-pt-surface'),
                onClick: function() { setPT({ view: tb.id }); },
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: 6,
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
                    background: selected ? (isContrast ? '#000000' : 'rgba(255,255,255,0.22)') : pal.panelAlt,
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

      // Visual SVG: Home Readiness & Risk Anatomy Dashboard
      function renderReadinessVisual() {
        var W = 540, H = 112;
        var docPct = DOCS.length ? (decodedDocsCount / DOCS.length) : 0;
        var fieldPct = totalFields ? (revealedCount / totalFields) : 0;
        var scenPct = SCENARIOS.length ? (scenDoneCount / SCENARIOS.length) : 0;
        var workPct = WORK_SCENARIOS.length ? (workDoneCount / WORK_SCENARIOS.length) : 0;
        var bars = [
          { label: __alloT('stem.paperTrail.meter_docs', 'Documents Explored'), val: decodedDocsCount + '/' + DOCS.length, pct: docPct, color: pal.accent },
          { label: __alloT('stem.paperTrail.meter_fields', 'Fields Decoded'), val: revealedCount + '/' + totalFields, pct: fieldPct, color: KIND.watch.bar },
          { label: __alloT('stem.paperTrail.meter_pressure', 'Pressure Shields'), val: scenDoneCount + '/' + SCENARIOS.length, pct: scenPct, color: pal.safeText },
          { label: __alloT('stem.paperTrail.meter_work', 'Work Rights Cases'), val: workDoneCount + '/' + WORK_SCENARIOS.length, pct: workPct, color: KIND.danger.bar }
        ];
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
          'aria-label': __alloT('stem.paperTrail.readiness_aria', 'PaperTrail readiness progress across documents, decoded fields, pressure scenarios, and work rights'),
          style: { display: 'block', maxWidth: 680, height: 'auto' }
        },
          h('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 10, fill: pal.svgBg, stroke: pal.borderSoft, strokeWidth: 1 }),
          bars.map(function(b, idx) {
            var y = 16 + idx * 24;
            var trackX = 148, trackW = 312;
            var fillW = Math.max(b.pct > 0 ? 10 : 0, Math.round(trackW * b.pct));
            return h('g', { key: idx },
              h('text', { x: 14, y: y + 10, fontSize: 11, fontWeight: 700, fill: pal.svgInk }, b.label),
              h('rect', { x: trackX, y: y, width: trackW, height: 12, rx: 6, fill: pal.svgTrack }),
              fillW > 0 ? h('rect', { x: trackX, y: y, width: fillW, height: 12, rx: 6, fill: b.color }) : null,
              h('text', { x: W - 14, y: y + 10, textAnchor: 'end', fontSize: 11, fontWeight: 800, fill: pal.svgInk }, b.val)
            );
          })
        );
      }

      // Visual SVG: Interactive Annotated Document Facsimile for `doc` view
      function renderDocBlueprintSvg(doc) {
        var fields = doc.fields;
        var rowH = 26;
        var headerH = 42;
        var footH = 24;
        var W = 540;
        var H = headerH + fields.length * rowH + footH;
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
          'aria-label': doc.title + ' — ' + __alloT('stem.paperTrail.blueprint_aria', 'interactive field risk map showing standard, read-carefully, and high-stakes fields'),
          style: { display: 'block', height: 'auto' }
        },
          h('rect', { x: 2, y: 2, width: W - 4, height: H - 4, rx: 12, fill: pal.svgPaper, stroke: pal.border, strokeWidth: 1.5 }),
          h('rect', { x: 2, y: 2, width: W - 4, height: 34, rx: 10, fill: pal.accentBg }),
          h('line', { x1: 2, y1: 36, x2: W - 2, y2: 36, stroke: pal.border, strokeWidth: 1 }),
          h('text', { x: 16, y: 23, fontSize: 12, fontWeight: 800, fill: pal.svgInk }, doc.title.toUpperCase() + ' — ' + __alloT('stem.paperTrail.blueprint_tag', 'RISK MAP')),
          h('text', { x: W - 16, y: 23, textAnchor: 'end', fontSize: 11, fontWeight: 700, fill: pal.svgMuted }, __alloT('stem.paperTrail.sample_stamp', 'SAMPLE: SAM RIVERA')),
          fields.map(function(f, idx) {
            var y = headerH + idx * rowH;
            var k = KIND[f.kind] || KIND.normal;
            var open = !!revealed[doc.id + ':' + f.id];
            var lbl = f.label.length > 36 ? f.label.slice(0, 35) + '…' : f.label;
            return h('g', {
              key: f.id,
              style: { cursor: 'pointer' },
              onClick: function() {
                var nx = Object.assign({}, revealed);
                nx[doc.id + ':' + f.id] = !open;
                setPT({ revealed: nx });
                if (!open) announceToSR(f.label + '. ' + f.asking);
              }
            },
              h('rect', {
                x: 14, y: y, width: W - 28, height: rowH - 5, rx: 6,
                fill: open ? pal.accentBg : pal.svgBg,
                stroke: open ? pal.accent : (f.kind === 'normal' ? pal.borderSoft : k.bar),
                strokeWidth: open ? 1.8 : 1
              }),
              h('rect', { x: 14, y: y, width: 6, height: rowH - 5, rx: 3, fill: k.bar }),
              h('text', { x: 28, y: y + 14, fontSize: 11, fontWeight: open ? 800 : 600, fill: pal.svgInk }, (idx + 1) + '. ' + lbl),
              h('text', { x: W - 96, y: y + 14, textAnchor: 'end', fontSize: 10, fontWeight: 800, fill: k.color }, k.short.toUpperCase()),
              h('text', { x: W - 24, y: y + 14, textAnchor: 'end', fontSize: 11, fontWeight: 800, fill: open ? pal.safeText : pal.svgMuted }, open ? '✓ ' + __alloT('stem.paperTrail.open_short', 'OPEN') : __alloT('stem.paperTrail.tap_short', 'TAP'))
            );
          }),
          h('text', { x: 16, y: H - 8, fontSize: 10, fontWeight: 600, fill: pal.svgMuted },
            __alloT('stem.paperTrail.blueprint_hint', 'Click any highlighted field strip above or row below to decode what the box is really asking.'))
        );
      }

      // Visual SVG: 4-Step Pressure Shield Protocol for `scenarios` view
      function renderPressureProtocolSvg() {
        var W = 540, H = 96;
        var steps = [
          { n: '1', t: __alloT('stem.paperTrail.proto_1', 'PAUSE'), sub: __alloT('stem.paperTrail.proto_1s', 'Notice urgency') },
          { n: '2', t: __alloT('stem.paperTrail.proto_2', 'READ'), sub: __alloT('stem.paperTrail.proto_2s', 'Check blanks') },
          { n: '3', t: __alloT('stem.paperTrail.proto_3', 'ASK'), sub: __alloT('stem.paperTrail.proto_3s', 'Buy time / copy') },
          { n: '4', t: __alloT('stem.paperTrail.proto_4', 'DECIDE'), sub: __alloT('stem.paperTrail.proto_4s', 'Sign only ready') }
        ];
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
          'aria-label': __alloT('stem.paperTrail.proto_aria', 'Four-step document defense protocol: Pause, Read, Ask, Decide'),
          style: { display: 'block', height: 'auto' }
        },
          h('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 12, fill: pal.svgBg, stroke: pal.borderSoft, strokeWidth: 1 }),
          h('text', { x: 16, y: 20, fontSize: 11, fontWeight: 800, fill: pal.accent }, __alloT('stem.paperTrail.proto_head', '4-STEP PRESSURE SHIELD PROTOCOL')),
          steps.map(function(st, i) {
            var bx = 14 + i * 130;
            return h('g', { key: i },
              i > 0 ? h('line', { x1: bx - 14, y1: 56, x2: bx - 2, y2: 56, stroke: pal.accent, strokeWidth: 2 }) : null,
              h('rect', { x: bx, y: 30, width: 116, height: 52, rx: 8, fill: pal.svgPaper, stroke: pal.border, strokeWidth: 1.2 }),
              h('circle', { cx: bx + 18, cy: 48, r: 10, fill: pal.accentBg, stroke: pal.accent, strokeWidth: 1.2 }),
              h('text', { x: bx + 18, y: 52, textAnchor: 'middle', fontSize: 11, fontWeight: 900, fill: pal.accent }, st.n),
              h('text', { x: bx + 34, y: 51, fontSize: 11, fontWeight: 900, fill: pal.svgInk }, st.t),
              h('text', { x: bx + 10, y: 71, fontSize: 10, fontWeight: 600, fill: pal.svgMuted }, st.sub)
            );
          })
        );
      }

      // Visual SVG: IDEA -> ADA Transition Cliff Diagram for `work` view
      function renderTransitionCliffSvg() {
        var W = 540, H = 132;
        return h('svg', {
          viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
          'aria-label': __alloT('stem.paperTrail.cliff_aria', 'Comparison of School IDEA protections versus Workplace ADA Title I protections'),
          style: { display: 'block', height: 'auto' }
        },
          h('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 12, fill: pal.svgBg, stroke: pal.borderSoft, strokeWidth: 1 }),
          // Left card: School (IDEA)
          h('rect', { x: 14, y: 14, width: 222, height: 104, rx: 10, fill: pal.svgPaper, stroke: pal.border, strokeWidth: 1.2 }),
          h('text', { x: 26, y: 34, fontSize: 12, fontWeight: 900, fill: pal.svgInk }, __alloT('stem.paperTrail.cliff_school', 'SCHOOL · IDEA / IEP')),
          h('text', { x: 26, y: 54, fontSize: 11, fill: pal.svgMuted }, '• ' + __alloT('stem.paperTrail.cliff_s1', 'School team identifies needs')),
          h('text', { x: 26, y: 72, fontSize: 11, fill: pal.svgMuted }, '• ' + __alloT('stem.paperTrail.cliff_s2', 'Written plan follows you')),
          h('text', { x: 26, y: 90, fontSize: 11, fill: pal.svgMuted }, '• ' + __alloT('stem.paperTrail.cliff_s3', 'Automatic class-to-class')),
          h('text', { x: 26, y: 108, fontSize: 10, fontWeight: 800, fill: pal.accent }, __alloT('stem.paperTrail.cliff_s4', 'ENDS AT GRADUATION')),
          // Center transition bridge
          h('line', { x1: 242, y1: 66, x2: 294, y2: 66, stroke: pal.accent, strokeWidth: 2.5, strokeDasharray: '4 3' }),
          h('polygon', { points: '294,61 304,66 294,71', fill: pal.accent }),
          h('text', { x: 270, y: 54, textAnchor: 'middle', fontSize: 10, fontWeight: 900, fill: pal.accent }, __alloT('stem.paperTrail.cliff_mid', 'AGE 18')),
          // Right card: Work (ADA Title I)
          h('rect', { x: 306, y: 14, width: 220, height: 104, rx: 10, fill: pal.svgPaper, stroke: pal.accent, strokeWidth: 1.6 }),
          h('text', { x: 318, y: 34, fontSize: 12, fontWeight: 900, fill: pal.accent }, __alloT('stem.paperTrail.cliff_work', 'WORK · ADA TITLE I')),
          h('text', { x: 318, y: 54, fontSize: 11, fill: pal.svgInk }, '• ' + __alloT('stem.paperTrail.cliff_w1', 'Request-driven (you ask)')),
          h('text', { x: 318, y: 72, fontSize: 11, fill: pal.svgInk }, '• ' + __alloT('stem.paperTrail.cliff_w2', 'Disclosure is YOUR choice')),
          h('text', { x: 318, y: 90, fontSize: 11, fill: pal.svgInk }, '• ' + __alloT('stem.paperTrail.cliff_w3', '29 CFR 1630 protections')),
          h('text', { x: 318, y: 108, fontSize: 10, fontWeight: 800, fill: pal.safeText }, __alloT('stem.paperTrail.cliff_w4', 'TASK → BARRIER → ADJUSTMENT'))
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
          { label: __alloT('stem.paperTrail.starter_job', 'First Job (Application)'), action: function() { setPT({ view: 'doc', docId: 'jobapp' }); } },
          { label: __alloT('stem.paperTrail.starter_lease', 'First Apartment Lease'), action: function() { setPT({ view: 'doc', docId: 'lease' }); } },
          { label: __alloT('stem.paperTrail.starter_iep', 'My IEP Invitation'), action: function() { setPT({ view: 'doc', docId: 'iep' }); } },
          { label: __alloT('stem.paperTrail.starter_pressure', 'Practice Saying No to Pressure'), action: function() { setPT({ view: 'scenarios' }); } }
        ];
        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('home'),
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
                h('span', { style: { fontSize: 11, fontWeight: 700, color: pal.muted } }, Math.round(((decodedDocsCount / DOCS.length) + (scenDoneCount / SCENARIOS.length) + (workDoneCount / WORK_SCENARIOS.length)) / 3 * 100) + '% ' + __alloT('stem.paperTrail.overall', 'overall'))
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
            starters.map(function(st, i) {
              return h('button', {
                key: i, type: 'button', onClick: st.action,
                className: 'allo-pt-surface',
                style: {
                  fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 999,
                  background: pal.panel, border: '1px solid ' + pal.border, color: pal.textStrong, cursor: 'pointer'
                }
              }, st.label + ' →');
            })
          ),

          // Document Library Cards
          h('h3', { style: { margin: '0 0 8px', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: pal.muted } },
            __alloT('stem.paperTrail.library_heading', '6 Real-World Document Decoders')),
          h('div', { className: 'allo-pt-grid-2', style: { marginBottom: 16 } },
            DOCS.map(function(doc) {
              var done = !!seenDocs[doc.id];
              var openCount = doc.fields.filter(function(f) { return !!revealed[doc.id + ':' + f.id]; }).length;
              var dangerCount = doc.fields.filter(function(f) { return f.kind === 'danger'; }).length;
              var watchCount = doc.fields.filter(function(f) { return f.kind === 'watch'; }).length;
              var pct = doc.fields.length ? Math.round((openCount / doc.fields.length) * 100) : 0;
              return h('button', {
                key: doc.id, type: 'button',
                onClick: function() { setPT({ view: 'doc', docId: doc.id }); },
                className: 'allo-pt-card allo-pt-surface',
                style: {
                  textAlign: 'left', borderRadius: 14, padding: 14, cursor: 'pointer',
                  background: pal.panel, border: '1px solid ' + (done ? pal.safeBorder : pal.border),
                  color: pal.text, boxShadow: pal.shadow, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, width: '100%' } },
                  h('div', { style: { fontWeight: 900, fontSize: 15, color: pal.textStrong } }, doc.icon + ' ' + doc.title),
                  done ? h('span', {
                    style: { fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pal.safeBg, color: pal.safeText, border: '1px solid ' + pal.safeBorder, flexShrink: 0 }
                  }, '✓ ' + __alloT('stem.paperTrail.opened_badge', 'Opened')) : null
                ),
                h('div', { style: { fontSize: 12, lineHeight: 1.45, color: pal.muted } }, doc.blurb),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
                  h('span', { style: { fontSize: 11, fontWeight: 800, color: pal.accent } }, doc.fields.length + ' ' + __alloT('stem.paperTrail.fields', 'fields')),
                  dangerCount > 0 ? h('span', { style: { fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: pal.dangerBg, color: pal.dangerText, border: '1px solid ' + pal.dangerBorder } }, dangerCount + ' ' + __alloT('stem.paperTrail.danger_short', 'high-stakes')) : null,
                  watchCount > 0 ? h('span', { style: { fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: pal.watchBg, color: pal.watchText, border: '1px solid ' + pal.watchBorder } }, watchCount + ' ' + __alloT('stem.paperTrail.watch_short', 'watch')) : null
                ),
                h('div', { style: { width: '100%', marginTop: 'auto' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: pal.muted, marginBottom: 4 } },
                    h('span', null, __alloT('stem.paperTrail.decoded_count', 'Decoded') + ': ' + openCount + '/' + doc.fields.length),
                    h('span', null, pct + '%')
                  ),
                  h('div', { style: { height: 6, borderRadius: 999, background: pal.svgTrack, overflow: 'hidden' } },
                    h('div', { style: { width: pct + '%', height: 6, borderRadius: 999, background: done ? pal.safeText : pal.accent } })
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
              h('div', { style: { fontSize: 11, fontWeight: 800, color: pal.accent } }, scenDoneCount + '/' + SCENARIOS.length + ' ' + __alloT('stem.paperTrail.completed', 'completed'))
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
        );
      }

      // ─────────── DOC (field decoder) ───────────
      if (view === 'doc') {
        var doc = DOCS.find(function(x) { return x.id === d.docId; }) || DOCS[0];
        if (!seenDocs[doc.id]) {
          var nextSeen = Object.assign({}, seenDocs); nextSeen[doc.id] = true;
          Promise.resolve().then(function() { setPT({ seenDocs: nextSeen }); });
          if (Object.keys(nextSeen).length === 2) awardXP(10, 'Decoded two documents');
        }
        var visibleFields = docFilter === 'flagged'
          ? doc.fields.filter(function(f) { return f.kind !== 'normal'; })
          : doc.fields;

        function setAllFields(openVal) {
          var nx = Object.assign({}, revealed);
          doc.fields.forEach(function(f) { nx[doc.id + ':' + f.id] = openVal; });
          setPT({ revealed: nx });
        }

        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('doc', backBtn('home', __alloT('stem.paperTrail.documents', 'Documents'))),
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
                onClick: function() { setPT({ docId: item.id }); },
                style: {
                  fontSize: 12, fontWeight: active ? 900 : 700, padding: '6px 10px', borderRadius: 999, cursor: 'pointer',
                  background: active ? pal.btnBg : pal.panel,
                  color: active ? pal.btnText : pal.text,
                  border: '1px solid ' + (active ? pal.btnBg : pal.borderSoft)
                }
              }, item.icon + ' ' + item.title);
            })
          ),

          // Annotated Document Visual Stage
          h('section', {
            className: 'allo-pt-surface',
            style: { background: pal.panel, border: '1px solid ' + pal.border, borderRadius: 14, padding: 14, marginBottom: 14, boxShadow: pal.shadow }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 } },
              h('div', { style: { minWidth: 0 } },
                h('h3', { style: { margin: 0, fontSize: 17, fontWeight: 900, color: pal.textStrong } }, doc.icon + ' ' + doc.title),
                h('p', { style: { margin: '2px 0 0', fontSize: 12, color: pal.muted } }, doc.blurb)
              ),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                h('button', {
                  type: 'button', 'aria-pressed': docFilter === 'all',
                  onClick: function() { setPT({ docFilter: 'all' }); },
                  className: docFilter === 'all' ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                  style: { fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', background: docFilter === 'all' ? pal.btnBg : pal.panelAlt, color: docFilter === 'all' ? pal.btnText : pal.text, border: '1px solid ' + pal.borderSoft }
                }, __alloT('stem.paperTrail.filter_all', 'All') + ' (' + doc.fields.length + ')'),
                h('button', {
                  type: 'button', 'aria-pressed': docFilter === 'flagged',
                  onClick: function() { setPT({ docFilter: 'flagged' }); },
                  className: docFilter === 'flagged' ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                  style: { fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', background: docFilter === 'flagged' ? pal.btnBg : pal.panelAlt, color: docFilter === 'flagged' ? pal.btnText : pal.text, border: '1px solid ' + pal.borderSoft }
                }, __alloT('stem.paperTrail.filter_flagged', 'Flagged only')),
                h('button', {
                  type: 'button', onClick: function() { setAllFields(true); },
                  className: 'allo-pt-surface',
                  style: { fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', background: pal.panelAlt, color: pal.text, border: '1px solid ' + pal.borderSoft }
                }, __alloT('stem.paperTrail.expand_all', 'Expand all')),
                h('button', {
                  type: 'button', onClick: function() { setAllFields(false); },
                  className: 'allo-pt-surface',
                  style: { fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', background: pal.panelAlt, color: pal.text, border: '1px solid ' + pal.borderSoft }
                }, __alloT('stem.paperTrail.collapse_all', 'Collapse'))
              )
            ),
            renderDocBlueprintSvg(doc)
          ),

          h('p', { style: { fontSize: 12, color: pal.muted, margin: '0 0 10px' } },
            __alloT('stem.paperTrail.doc_sub', 'Each row is a field on the real document. Open one to see what it is actually asking and how Sam filled it in.')),

          // Field Accordion Rows
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            visibleFields.map(function(f) {
              var k = KIND[f.kind] || KIND.normal;
              var open = !!revealed[doc.id + ':' + f.id];
              return h('div', {
                key: f.id, className: 'allo-pt-surface',
                style: {
                  borderRadius: 12, overflow: 'hidden', background: pal.panel,
                  border: '1px solid ' + (f.kind === 'normal' ? pal.borderSoft : k.border),
                  borderLeft: '4px solid ' + k.bar
                }
              },
                h('button', {
                  type: 'button',
                  onClick: function() {
                    var nx = Object.assign({}, revealed); nx[doc.id + ':' + f.id] = !open;
                    setPT({ revealed: nx });
                    if (!open) announceToSR(f.label + '. ' + f.asking);
                  },
                  'aria-expanded': open,
                  style: {
                    width: '100%', textAlign: 'left', padding: '11px 14px',
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
                  h('p', { style: { margin: '0 0 4px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: pal.accent } },
                    __alloT('stem.paperTrail.asking', 'What they are actually asking')),
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
          h('p', { style: { fontSize: 12, marginTop: 12, marginBottom: 0, color: pal.muted } },
            __alloT('stem.paperTrail.doc_foot', 'Real versions of these documents differ by employer, landlord, and state. The questions they ask are remarkably consistent.'))
        );
      }

      // ─────────── SCENARIOS ───────────
      if (view === 'scenarios') {
        var idx = safeIndex(d.scenCurrent, SCENARIOS.length);
        var sc = SCENARIOS[idx];
        var done = sc && scenDone[sc.id];
        function pick(optId) {
          if (!sc || done) return;
          var opt = sc.options.find(function(o) { return o.id === optId; });
          if (!opt) return;
          var nx = Object.assign({}, scenDone); nx[sc.id] = { pick: optId, ok: opt.ok };
          setPT({ scenDone: nx });
          if (opt.ok) awardXP(5, 'Pressure scenario');
          announceToSR(opt.ok ? __alloT('stem.paperTrail.good_sr', 'That is the protective choice. Explanation below.') : __alloT('stem.paperTrail.risky_sr', 'That one carries risk. Explanation below.'));
        }
        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('scenarios', backBtn('home', __alloT('stem.paperTrail.back_home', 'PaperTrail'))),

          // Visual Protocol Diagram
          h('div', { style: { marginBottom: 14 } }, renderPressureProtocolSvg()),

          // Clickable Scenario Step Pills
          h('div', {
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
            role: 'group', 'aria-label': __alloT('stem.paperTrail.scenario_picker', 'Choose scenario')
          },
            SCENARIOS.map(function(item, i) {
              var st = scenDone[item.id];
              var active = i === idx;
              var mark = st ? (st.ok ? '✓ ' : '! ') : ((i + 1) + '. ');
              return h('button', {
                key: item.id, type: 'button', 'aria-pressed': active,
                onClick: function() { setPT({ scenCurrent: i }); },
                className: active ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                style: {
                  fontSize: 12, fontWeight: active ? 900 : 700, padding: '6px 10px', borderRadius: 10, cursor: 'pointer',
                  background: active ? pal.btnBg : (st ? (st.ok ? pal.safeBg : pal.dangerBg) : pal.panel),
                  color: active ? pal.btnText : (st ? (st.ok ? pal.safeText : pal.dangerText) : pal.text),
                  border: '1px solid ' + (active ? pal.btnBg : (st ? (st.ok ? pal.safeBorder : pal.dangerBorder) : pal.borderSoft))
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
              h('span', { style: { fontSize: 12, fontWeight: 800, color: pal.muted } }, (idx + 1) + ' / ' + SCENARIOS.length)
            ),
            h('div', {
              className: 'allo-pt-surface',
              style: { borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 15, fontWeight: 700, lineHeight: 1.5, background: pal.panelAlt, border: '1px solid ' + pal.borderSoft, color: pal.textStrong }
            }, sc.text),
            h('div', { role: 'group', 'aria-label': __alloT('stem.paperTrail.choose', 'Choose a response'), style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
              sc.options.map(function(o, oi) {
                var picked = done && done.pick === o.id;
                var stObj = done
                  ? (o.ok
                    ? { background: pal.safeBg, borderColor: pal.safeBorder, color: pal.textStrong }
                    : (picked ? { background: pal.dangerBg, borderColor: pal.dangerBorder, color: pal.textStrong } : { background: pal.panel, borderColor: pal.borderSoft, color: pal.muted }))
                  : { background: pal.panel, borderColor: pal.border, color: pal.textStrong };
                return h('button', {
                  key: o.id, type: 'button', disabled: !!done,
                  onClick: function() { pick(o.id); },
                  className: 'allo-pt-surface',
                  style: Object.assign({
                    textAlign: 'left', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, fontWeight: 600,
                    borderWidth: 2, borderStyle: 'solid', cursor: done ? 'default' : 'pointer', lineHeight: 1.45
                  }, stObj)
                }, (done && o.ok ? '✓ ' : (done && picked ? '✗ ' : (String.fromCharCode(65 + oi) + '. '))) + o.text);
              })
            ),
            done ? h('div', { 'aria-live': 'polite' },
              h('div', {
                className: 'allo-pt-surface',
                style: {
                  borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.55, marginBottom: 12,
                  background: done.ok ? pal.safeBg : pal.card,
                  border: '1px solid ' + (done.ok ? pal.safeBorder : pal.border),
                  color: pal.textStrong
                }
              },
                h('strong', { style: { display: 'block', marginBottom: 4, color: done.ok ? pal.safeText : pal.dangerText } },
                  done.ok ? __alloT('stem.paperTrail.protective_head', '✓ Protective Move') : __alloT('stem.paperTrail.risky_head', '⚠ Watch Out for the Pressure Trap')),
                sc.why
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
                idx > 0 ? h('button', {
                  type: 'button', onClick: function() { setPT({ scenCurrent: idx - 1 }); },
                  className: 'allo-pt-surface',
                  style: { borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800, background: pal.panelAlt, color: pal.textStrong, border: '1px solid ' + pal.border, cursor: 'pointer' }
                }, '← ' + __alloT('stem.paperTrail.prev', 'Previous')) : h('span', null),
                idx < SCENARIOS.length - 1
                  ? h('button', {
                    type: 'button', onClick: function() { setPT({ scenCurrent: idx + 1 }); },
                    className: 'allo-pt-btn-primary',
                    style: { borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 900, background: pal.btnBg, color: pal.btnText, border: 'none', cursor: 'pointer' }
                  }, __alloT('stem.paperTrail.next', 'Next scenario →'))
                  : h('p', { style: { margin: 0, fontSize: 12, fontWeight: 800, color: pal.accent } },
                    __alloT('stem.paperTrail.scen_done', 'All scenarios done. The pattern: the pressure to decide now is itself the warning sign, and asking for time is always allowed.'))
              )
            ) : null
          ) : null
        );
      }

      // ─────────── WORK RIGHTS & DISCLOSURE ───────────
      if (view === 'work') {
        var wIdx = safeIndex(d.workCurrent, WORK_SCENARIOS.length);
        var ws = WORK_SCENARIOS[wIdx];
        var wsPicked = ws && workDone[ws.id];
        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('work', backBtn('home', __alloT('stem.paperTrail.back_home', 'PaperTrail'))),

          // Visual Stage: IDEA -> ADA Transition Cliff SVG
          h('div', { style: { marginBottom: 14 } }, renderTransitionCliffSvg()),

          h('p', { style: { fontSize: 13.5, lineHeight: 1.5, margin: '0 0 12px', color: pal.muted } },
            __alloT('stem.paperTrail.work_intro', 'School protections do not follow you to work. What replaces them is request-driven, which means knowing what to ask for is the whole skill.')),

          // Knowledge Cards
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
                    width: '100%', textAlign: 'left', padding: '11px 14px',
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
                  h('p', { style: { margin: 0, fontSize: 13.5, lineHeight: 1.6, color: pal.text } }, c.body),
                  c.cite ? h('p', { style: { fontSize: 12, marginTop: 8, marginBottom: 0, color: pal.muted, fontStyle: 'italic' } },
                    __alloT('stem.paperTrail.read_law', 'Read the actual text of ') + c.cite + __alloT('stem.paperTrail.read_law2', ' in the Education Law Navigator — nothing there is paraphrased.')) : null
                ) : null
              );
            })
          ),

          // Disclosure Decisions Interactive Panel
          h('section', {
            className: 'allo-pt-surface',
            style: { borderRadius: 16, padding: 16, background: pal.card, border: '2px solid ' + pal.border, boxShadow: pal.shadow }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
              h('h3', { style: { margin: 0, fontSize: 15, fontWeight: 900, color: pal.textStrong } }, '⚖️ ' + __alloT('stem.paperTrail.disclosure_title', 'Disclosure decisions')),
              h('span', { style: { fontSize: 12, fontWeight: 800, color: pal.muted } }, (wIdx + 1) + ' / ' + WORK_SCENARIOS.length)
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
                    fontSize: 11.5, fontWeight: active ? 900 : 700, padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
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
                    var nx = Object.assign({}, workDone); nx[ws.id] = { pick: o.id };
                    setPT({ workDone: nx });
                    awardXP(4, 'Disclosure decision considered');
                    announceToSR(__alloT('stem.paperTrail.considered_sr', 'Choice recorded. What follows from it is shown below.'));
                  },
                  className: 'allo-pt-surface',
                  style: picked
                    ? { textAlign: 'left', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 700, background: pal.accentBg, border: '2px solid ' + pal.accent, color: pal.textStrong, cursor: 'default' }
                    : { textAlign: 'left', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, background: pal.panel, border: '2px solid ' + pal.borderSoft, color: wsPicked ? pal.muted : pal.textStrong, cursor: wsPicked ? 'default' : 'pointer' }
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
                  style: { borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 900, background: pal.btnBg, color: pal.btnText, border: 'none', cursor: 'pointer' }
                }, __alloT('stem.paperTrail.next_case', 'Next situation →'))
                : h('p', { style: { margin: 0, fontSize: 12.5, fontWeight: 800, color: pal.accent } },
                  __alloT('stem.paperTrail.work_done', 'All four considered. The through-line: nothing is automatic after school, and asking early is usually cheaper than recovering later.'))
            ) : null
          )
        );
      }

      // ─────────── SCRIPTS ───────────
      if (view === 'scripts') {
        function copyPhrase(text, i) {
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).catch(function() {});
            }
          } catch (e) {}
          setPT({ copiedIdx: i });
          announceToSR(__alloT('stem.paperTrail.copied_sr', 'Phrase copied for practice.'));
        }
        return h('div', { className: 'allo-pt-shell animate-in fade-in duration-200', style: shellStyle },
          renderWorkbenchHeader('scripts', backBtn('home', __alloT('stem.paperTrail.back_home', 'PaperTrail'))),
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
                  h('button', {
                    type: 'button', 'aria-pressed': practiced,
                    onClick: function() {
                      var nx = Object.assign({}, rehearsed);
                      nx[String(i)] = !practiced;
                      setPT({ rehearsed: nx });
                    },
                    className: practiced ? 'allo-pt-btn-primary' : 'allo-pt-surface',
                    style: {
                      fontSize: 11.5, fontWeight: 800, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                      background: practiced ? pal.btnBg : pal.panelAlt,
                      color: practiced ? pal.btnText : pal.textStrong,
                      border: '1px solid ' + (practiced ? pal.btnBg : pal.borderSoft)
                    }
                  }, practiced ? '✓ ' + __alloT('stem.paperTrail.practiced_btn', 'Practiced') : __alloT('stem.paperTrail.mark_practiced', 'Mark rehearsed')),
                  h('button', {
                    type: 'button', onClick: function() { copyPhrase(s, i); },
                    className: 'allo-pt-surface',
                    style: {
                      fontSize: 11.5, fontWeight: 700, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                      background: pal.panel, color: pal.text, border: '1px solid ' + pal.borderSoft
                    }
                  }, copiedIdx === i ? '✓ ' + __alloT('stem.paperTrail.copied', 'Copied') : __alloT('stem.paperTrail.copy', 'Copy phrase'))
                )
              );
            })
          ),
          h('p', { style: { fontSize: 12.5, marginTop: 14, marginBottom: 0, lineHeight: 1.5, color: pal.muted } },
            __alloT('stem.paperTrail.scripts_foot', 'If someone refuses all six, that refusal is information about them, not about you.'))
        );
      }

      return null;
    }
  });

})();

}
