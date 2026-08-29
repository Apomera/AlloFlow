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

  window.StemLab.registerTool('paperTrail', {
    icon: '\uD83D\uDDC4\uFE0F',
    label: 'PaperTrail: Official Documents',
    desc: 'Practice reading and completing the documents adult life runs on — job applications, W-4s, leases, medical intake, permits, and your own IEP meeting invitation. Every field is decoded in plain language, the boxes that can cost you are flagged, and all practice uses a fictional identity because you should never type real personal information into a practice tool.',
    color: 'amber',
    category: 'applied',
    questHooks: [
      { id: 'pt_decode', label: 'Decode fields across two different documents', icon: '📄', check: function(d) { return d && d.seenDocs && Object.keys(d.seenDocs).length >= 2; }, progress: function(d) { return ((d && d.seenDocs && Object.keys(d.seenDocs).length) || 0) + '/2 documents'; } },
      { id: 'pt_judgment', label: 'Work through 4 pressure scenarios', icon: '🛡️', check: function(d) { return d && d.scenDone && Object.keys(d.scenDone).length >= 4; }, progress: function(d) { return ((d && d.scenDone && Object.keys(d.scenDone).length) || 0) + '/4 scenarios'; } },
      { id: 'pt_work', label: 'Think through the disclosure decisions', icon: '⚖️', check: function(d) { return d && d.workDone && Object.keys(d.workDone).length >= 3; }, progress: function(d) { return ((d && d.workDone && Object.keys(d.workDone).length) || 0) + '/3 decisions'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var announceToSR = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function() {};
      var awardXP = function(n, why) { if (ctx.awardXP) ctx.awardXP('paperTrail', n, why); };
      // Dark app chrome still places plugin content on a white card. Palette
      // tokens therefore follow the content substrate, not the app chrome.
      var isDark = !!ctx.isContrast || ctx.theme === 'contrast';

      var d = labToolData.paperTrail || {};
      function setPT(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.paperTrail) || {};
          return Object.assign({}, prev, { paperTrail: Object.assign({}, prior, patch) });
        });
      }

      var view = d.view || 'home';
      var seenDocs = d.seenDocs || {};
      var revealed = d.revealed || {};
      var scenDone = d.scenDone || {};

      var pal = isDark
        ? { text: '#f1f5f9', muted: '#94a3b8', panel: 'rgba(15,23,42,0.7)', card: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.3)', accent: '#fbbf24', btn: '#b45309' }
        : { text: '#1e293b', muted: '#475569', panel: '#ffffff', card: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.35)', accent: '#b45309', btn: '#b45309' };

      var KIND = {
        normal: { label: __alloT('stem.paperTrail.kind_normal', 'Standard'), color: pal.muted, bg: 'transparent' },
        watch:  { label: __alloT('stem.paperTrail.kind_watch', 'Read carefully'), color: '#b45309', bg: 'rgba(245,158,11,0.12)' },
        danger: { label: __alloT('stem.paperTrail.kind_danger', 'This one can cost you'), color: '#be123c', bg: 'rgba(190,18,60,0.1)' }
      };

      function backBtn(target, label) {
        return h('button', {
          onClick: function() { if (target === null) { if (typeof setStemLabTool === 'function') setStemLabTool(null); } else setPT({ view: target }); },
          className: 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold border transition-colors',
          style: { background: pal.panel, borderColor: pal.border, color: pal.text }
        }, '← ' + label);
      }

      // The safety rule, stated wherever a student might be about to type.
      var safetyNote = h('div', { role: 'note', className: 'rounded-xl px-3 py-2 mb-3 text-[11px] leading-snug font-bold',
        style: { background: 'rgba(190,18,60,0.08)', border: '1px solid rgba(190,18,60,0.35)', color: pal.text } },
        '🔒 ' + __alloT('stem.paperTrail.safety', 'Practice only. Every example here is filled in for a made-up person, Sam Rivera. Never type your real Social Security number, bank details, or passwords into a practice tool — including this one.'));

      // ─────────── HOME ───────────
      if (view === 'home') {
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text, background: isDark ? '#0f172a' : 'transparent', borderRadius: 12 } },
          h('div', { className: 'flex items-center gap-3 flex-wrap mb-3' },
            backBtn(null, __alloT('stem.paperTrail.tools', 'Tools')),
            h('h2', { className: 'text-xl font-black' }, '📄 ' + __alloT('stem.paperTrail.title', 'PaperTrail: Official Documents'))
          ),
          h('p', { className: 'text-sm mb-3', style: { color: pal.muted } },
            __alloT('stem.paperTrail.intro', 'Adult life runs on documents nobody teaches you to read. Pick one and go field by field: what each box is really asking, which ones can cost you, and what to say when someone wants you to sign right now.')),
          safetyNote,
          h('div', { className: 'grid gap-2 sm:grid-cols-2 mb-4' },
            DOCS.map(function(doc) {
              var done = !!seenDocs[doc.id];
              return h('button', {
                key: doc.id,
                onClick: function() { setPT({ view: 'doc', docId: doc.id }); },
                className: 'text-left rounded-2xl p-3 transition-all hover:shadow-md',
                style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
              },
                h('div', { className: 'font-black text-sm' }, doc.icon + ' ' + doc.title + (done ? ' ✓' : '')),
                h('div', { className: 'text-[11px] mt-0.5', style: { color: pal.muted } }, doc.blurb),
                h('div', { className: 'text-[10px] mt-1 font-bold', style: { color: pal.accent } }, doc.fields.length + ' ' + __alloT('stem.paperTrail.fields', 'fields'))
              );
            })
          ),
          h('div', { className: 'grid gap-2 sm:grid-cols-2' },
            h('button', {
              onClick: function() { setPT({ view: 'scenarios' }); },
              className: 'text-left rounded-2xl p-3', style: { background: pal.card, border: '2px solid ' + pal.border, color: pal.text }
            },
              h('div', { className: 'font-black text-sm' }, '🛡️ ' + __alloT('stem.paperTrail.pressure', 'Pressure scenarios')),
              h('div', { className: 'text-[11px] mt-0.5', style: { color: pal.muted } }, __alloT('stem.paperTrail.pressure_sub', 'What to do when someone wants you to sign now.') + ' ' + Object.keys(scenDone).length + '/' + SCENARIOS.length)
            ),
            h('button', {
              onClick: function() { setPT({ view: 'scripts' }); },
              className: 'text-left rounded-2xl p-3', style: { background: pal.card, border: '2px solid ' + pal.border, color: pal.text }
            },
              h('div', { className: 'font-black text-sm' }, '💬 ' + __alloT('stem.paperTrail.scripts', 'What to say')),
              h('div', { className: 'text-[11px] mt-0.5', style: { color: pal.muted } }, __alloT('stem.paperTrail.scripts_sub', 'Six sentences that buy you time. Asking is a skill.'))
            ),
            h('button', {
              onClick: function() { setPT({ view: 'work' }); },
              className: 'text-left rounded-2xl p-3 sm:col-span-2', style: { background: pal.card, border: '2px solid ' + pal.border, color: pal.text }
            },
              h('div', { className: 'font-black text-sm' }, '⚖️ ' + __alloT('stem.paperTrail.work_title', 'Work rights & disclosure')),
              h('div', { className: 'text-[11px] mt-0.5', style: { color: pal.muted } },
                __alloT('stem.paperTrail.work_sub', 'What replaces your school plan after graduation, how to ask for what you need, and whether to disclose at all.') + ' ' + Object.keys(d.workDone || {}).length + '/' + WORK_SCENARIOS.length)
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
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text, background: isDark ? '#0f172a' : 'transparent', borderRadius: 12 } },
          h('div', { className: 'flex items-center gap-3 flex-wrap mb-3' },
            backBtn('home', __alloT('stem.paperTrail.documents', 'Documents')),
            h('h2', { className: 'text-lg font-black' }, doc.icon + ' ' + doc.title)
          ),
          safetyNote,
          h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
            __alloT('stem.paperTrail.doc_sub', 'Each row is a field on the real document. Open one to see what it is actually asking and how Sam filled it in.')),
          h('div', { className: 'space-y-2' },
            doc.fields.map(function(f) {
              var k = KIND[f.kind] || KIND.normal;
              var open = !!revealed[doc.id + ':' + f.id];
              return h('div', { key: f.id, className: 'rounded-xl overflow-hidden', style: { background: pal.panel, border: '1px solid ' + pal.border } },
                h('button', {
                  onClick: function() {
                    var nx = Object.assign({}, revealed); nx[doc.id + ':' + f.id] = !open;
                    setPT({ revealed: nx });
                    if (!open) announceToSR(f.label + '. ' + f.asking);
                  },
                  'aria-expanded': open,
                  className: 'w-full text-left px-3 py-2 flex items-center justify-between gap-2 flex-wrap',
                  style: { color: pal.text, background: f.kind === 'normal' ? 'transparent' : k.bg }
                },
                  h('span', { className: 'font-bold text-sm' }, (open ? '▾ ' : '▸ ') + f.label),
                  f.kind !== 'normal' ? h('span', { className: 'text-[10px] font-black uppercase tracking-wider', style: { color: k.color } }, k.label) : null
                ),
                open ? h('div', { className: 'px-3 pb-3' },
                  h('p', { className: 'text-[10px] font-black uppercase tracking-wider mb-1', style: { color: pal.accent } }, __alloT('stem.paperTrail.asking', 'What they are actually asking')),
                  h('p', { className: 'text-sm leading-relaxed mb-2', style: { color: pal.text } }, f.asking),
                  h('div', { className: 'rounded-lg px-2 py-1.5 text-xs', style: { background: pal.card, border: '1px dashed ' + pal.border, color: pal.text } },
                    h('span', { className: 'font-black', style: { color: pal.muted } }, __alloT('stem.paperTrail.sam_wrote', 'Sam wrote: ')), f.answer)
                ) : null
              );
            })
          ),
          h('p', { className: 'text-[11px] mt-3', style: { color: pal.muted } },
            __alloT('stem.paperTrail.doc_foot', 'Real versions of these documents differ by employer, landlord, and state. The questions they ask are remarkably consistent.'))
        );
      }

      // ─────────── SCENARIOS ───────────
      if (view === 'scenarios') {
        var idx = d.scenCurrent || 0;
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
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text, background: isDark ? '#0f172a' : 'transparent', borderRadius: 12 } },
          h('div', { className: 'flex items-center gap-3 flex-wrap mb-3' },
            backBtn('home', __alloT('stem.paperTrail.back_home', 'PaperTrail')),
            h('h2', { className: 'text-lg font-black' }, '🛡️ ' + __alloT('stem.paperTrail.pressure', 'Pressure scenarios')),
            h('span', { className: 'text-[11px] font-bold', style: { color: pal.muted } }, (idx + 1) + ' / ' + SCENARIOS.length)
          ),
          sc ? h('div', null,
            h('div', { className: 'rounded-xl p-3 mb-3 text-sm font-semibold', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, sc.text),
            h('div', { role: 'group', 'aria-label': __alloT('stem.paperTrail.choose', 'Choose a response'), className: 'flex flex-col gap-2 mb-3' },
              sc.options.map(function(o) {
                var picked = done && done.pick === o.id;
                var style = done
                  ? (o.ok ? { background: 'rgba(5,150,105,0.12)', borderColor: 'rgba(5,150,105,0.5)', color: pal.text }
                          : (picked ? { background: 'rgba(190,18,60,0.1)', borderColor: 'rgba(190,18,60,0.45)', color: pal.text } : { background: pal.panel, borderColor: pal.border, color: pal.muted }))
                  : { background: pal.panel, borderColor: pal.border, color: pal.text };
                return h('button', {
                  key: o.id, disabled: !!done,
                  onClick: function() { pick(o.id); },
                  className: 'text-left rounded-xl px-3 py-2 text-sm border-2 transition-colors disabled:cursor-default',
                  style: style
                }, (done && o.ok ? '✓ ' : '') + o.text);
              })
            ),
            done ? h('div', null,
              h('div', { className: 'rounded-xl p-3 text-xs leading-relaxed mb-3', style: { background: pal.card, border: '1px solid ' + pal.border, color: pal.text } }, sc.why),
              idx < SCENARIOS.length - 1
                ? h('button', { onClick: function() { setPT({ scenCurrent: idx + 1 }); }, className: 'rounded-lg px-4 py-2 text-xs font-black text-white', style: { background: pal.btn } }, __alloT('stem.paperTrail.next', 'Next scenario →'))
                : h('p', { className: 'text-xs font-bold', style: { color: pal.accent } }, __alloT('stem.paperTrail.scen_done', 'All scenarios done. The pattern: the pressure to decide now is itself the warning sign, and asking for time is always allowed.'))
            ) : null
          ) : null
        );
      }

      // ─────────── SCRIPTS ───────────
      // ─────────── WORK RIGHTS & DISCLOSURE ───────────
      if (view === 'work') {
        var wcOpen = d.workOpen || {};
        var wsDone = d.workDone || {};
        var wIdx = d.workCurrent || 0;
        var ws = WORK_SCENARIOS[wIdx];
        var wsPicked = ws && wsDone[ws.id];
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text, background: isDark ? '#0f172a' : 'transparent', borderRadius: 12 } },
          h('div', { className: 'flex items-center gap-3 flex-wrap mb-3' },
            backBtn('home', __alloT('stem.paperTrail.back_home', 'PaperTrail')),
            h('h2', { className: 'text-lg font-black' }, '⚖️ ' + __alloT('stem.paperTrail.work_title', 'Work rights & disclosure'))
          ),
          h('p', { className: 'text-sm mb-3', style: { color: pal.muted } },
            __alloT('stem.paperTrail.work_intro', 'School protections do not follow you to work. What replaces them is request-driven, which means knowing what to ask for is the whole skill.')),
          h('div', { className: 'space-y-2 mb-5' },
            WORK_CARDS.map(function(c) {
              var open = !!wcOpen[c.id];
              return h('div', { key: c.id, className: 'rounded-xl overflow-hidden', style: { background: pal.panel, border: '1px solid ' + pal.border } },
                h('button', {
                  onClick: function() { var nx = Object.assign({}, wcOpen); nx[c.id] = !open; setPT({ workOpen: nx }); },
                  'aria-expanded': open,
                  className: 'w-full text-left px-3 py-2 flex items-center justify-between gap-2 flex-wrap',
                  style: { color: pal.text }
                },
                  h('span', { className: 'font-bold text-sm' }, (open ? '▾ ' : '▸ ') + c.title),
                  c.cite ? h('span', { className: 'text-[10px] font-black uppercase tracking-wider', style: { color: pal.accent } }, c.cite) : null
                ),
                open ? h('div', { className: 'px-3 pb-3' },
                  h('p', { className: 'text-sm leading-relaxed', style: { color: pal.text } }, c.body),
                  c.cite ? h('p', { className: 'text-[11px] mt-2', style: { color: pal.muted } },
                    __alloT('stem.paperTrail.read_law', 'Read the actual text of ') + c.cite + __alloT('stem.paperTrail.read_law2', ' in the Education Law Navigator — nothing there is paraphrased.')) : null
                ) : null
              );
            })
          ),
          h('div', { className: 'rounded-2xl p-4', style: { background: pal.card, border: '2px solid ' + pal.border } },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-2' },
              h('h3', { className: 'text-sm font-black', style: { color: pal.text } }, '🤔 ' + __alloT('stem.paperTrail.disclosure_title', 'Disclosure decisions')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.muted } }, (wIdx + 1) + ' / ' + WORK_SCENARIOS.length)
            ),
            h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
              __alloT('stem.paperTrail.disclosure_sub', 'These are not scored. Every option below is a real choice someone might make, with a real consequence — pick the one you would actually make, then read what follows from it.')),
            ws ? h('div', { className: 'rounded-xl p-3 mb-3 text-sm font-semibold', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, ws.text) : null,
            ws ? h('div', { role: 'group', 'aria-label': __alloT('stem.paperTrail.choose', 'Choose a response'), className: 'flex flex-col gap-2 mb-3' },
              ws.options.map(function(o) {
                var picked = wsPicked && wsPicked.pick === o.id;
                return h('button', {
                  key: o.id, disabled: !!wsPicked,
                  onClick: function() {
                    var nx = Object.assign({}, wsDone); nx[ws.id] = { pick: o.id };
                    setPT({ workDone: nx });
                    awardXP(4, 'Disclosure decision considered');
                    announceToSR(__alloT('stem.paperTrail.considered_sr', 'Choice recorded. What follows from it is shown below.'));
                  },
                  className: 'text-left rounded-xl px-3 py-2 text-sm border-2 transition-colors disabled:cursor-default',
                  style: picked
                    ? { background: 'rgba(245,158,11,0.14)', borderColor: pal.accent, color: pal.text }
                    : { background: pal.panel, borderColor: pal.border, color: wsPicked ? pal.muted : pal.text }
                }, (picked ? '● ' : '') + o.text);
              })
            ) : null,
            ws && wsPicked ? h('div', null,
              h('div', { className: 'rounded-xl p-3 text-xs leading-relaxed mb-3', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, ws.why),
              wIdx < WORK_SCENARIOS.length - 1
                ? h('button', { onClick: function() { setPT({ workCurrent: wIdx + 1 }); }, className: 'rounded-lg px-4 py-2 text-xs font-black text-white', style: { background: pal.btn } }, __alloT('stem.paperTrail.next_case', 'Next situation →'))
                : h('p', { className: 'text-xs font-bold', style: { color: pal.accent } }, __alloT('stem.paperTrail.work_done', 'All four considered. The through-line: nothing is automatic after school, and asking early is usually cheaper than recovering later.'))
            ) : null
          )
        );
      }

      if (view === 'scripts') {
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text, background: isDark ? '#0f172a' : 'transparent', borderRadius: 12 } },
          h('div', { className: 'flex items-center gap-3 flex-wrap mb-3' },
            backBtn('home', __alloT('stem.paperTrail.back_home', 'PaperTrail')),
            h('h2', { className: 'text-lg font-black' }, '💬 ' + __alloT('stem.paperTrail.scripts', 'What to say'))
          ),
          h('p', { className: 'text-sm mb-3', style: { color: pal.muted } },
            __alloT('stem.paperTrail.scripts_intro', 'Asking for time is a skill, not an admission that you cannot read. These six sentences work in almost every room. Say them plainly; you do not need to apologize.')),
          h('ul', { className: 'space-y-2 list-none p-0 m-0' },
            HELP_SCRIPTS.map(function(s, i) {
              return h('li', { key: i, className: 'rounded-xl px-3 py-2 text-sm', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, '“' + s + '”');
            })
          ),
          h('p', { className: 'text-[11px] mt-3 leading-snug', style: { color: pal.muted } },
            __alloT('stem.paperTrail.scripts_foot', 'If someone refuses all six, that refusal is information about them, not about you.'))
        );
      }

      return null;
    }
  });

})();

}
