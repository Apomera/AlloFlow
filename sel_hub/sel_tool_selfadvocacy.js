// ═══════════════════════════════════════════════════════════════
// sel_tool_selfadvocacy.js — Self-Advocacy Studio
// Student-facing companion to Assessment Literacy Lab's school-psych module.
// Where sel_tool_advocacy.js teaches the CRAFT of advocacy (scripts, assertiveness),
// this tool teaches the SUBSTANCE: your rights, your IEP/504, how to request
// accommodations, disclosure decisions, escalation paths, transition to adulthood,
// and AI-powered practice scenarios.
// Registered tool ID: "selfAdvocacy"
// Category: self-management / responsible decision-making (CASEL)
// Grade-adaptive: uses ctx.gradeBand for vocabulary and depth
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('selfAdvocacy'))) {

(function() {
  'use strict';

  // ── A11y live region ──
  (function() {
    if (document.getElementById('allo-live-selfadvocacy')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-selfadvocacy';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function announceSR(msg) {
    var el = document.getElementById('allo-live-selfadvocacy');
    if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); }
  }

  // Print-friendly CSS + accessibility CSS (reduced motion, skip link, focus, contrast)
  (function() {
    if (document.getElementById('allo-selfadvocacy-print-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-selfadvocacy-print-css';
    st.textContent = [
      // Print
      '@media print { .no-print, .no-print * { display: none !important; } body { background: white !important; color: black !important; } }',
      // Reduced motion (WCAG 2.3.3)
      '@media (prefers-reduced-motion: reduce) { .selfadv-tool *, .selfadv-tool *::before, .selfadv-tool *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }',
      // Skip link (WCAG 2.4.1)
      '.selfadv-skip-link { position: absolute; left: -9999px; top: 0; z-index: 999; padding: 0.5rem 1rem; background: #1e293b; color: white; font-weight: 700; text-decoration: none; border: 2px solid #6366f1; border-radius: 0 0 0.5rem 0; }',
      '.selfadv-skip-link:focus { left: 0; outline: 3px solid #facc15; outline-offset: 2px; }',
      // Visible focus styles (WCAG 2.4.7) — supplement Tailwind focus rings on browsers that strip them
      '.selfadv-tool button:focus-visible, .selfadv-tool a:focus-visible, .selfadv-tool input:focus-visible, .selfadv-tool textarea:focus-visible, .selfadv-tool select:focus-visible { outline: 2px solid #fbbf24 !important; outline-offset: 2px !important; }',
      // sr-only fallback
      '.selfadv-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // Detect reduced motion preference
  var prefersReducedMotion = (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // ═══════════════════════════════════════════════════════════════
  // MODULE 1: KNOW YOUR RIGHTS (age-banded)
  // ═══════════════════════════════════════════════════════════════
  var RIGHTS = {
    middle: [
      {
        id: 'idea',
        name: 'IDEA — the Individuals with Disabilities Education Act',
        plain: 'A federal law that says if you have a disability that affects your learning, you have the right to special education and related services designed for you.',
        why: 'Before IDEA (passed 1975, updated 2004), many students with disabilities were excluded from public school or placed in separate programs without any plan for their needs. IDEA changed that.',
        covers: 'Special education services, related services (speech therapy, OT, counseling, etc.), an Individualized Education Program (IEP) tailored to you, the right to be educated with non-disabled peers as much as possible (least restrictive environment).',
        doesntCover: 'Accommodations alone without specialized instruction — those fall under Section 504. Services beyond the school day unless they are part of your IEP. Transportation is covered only when needed to access your education.',
        example: 'If you have dyslexia and need specialized reading instruction that your general-ed teacher can\'t provide alone, IDEA is how you get a reading specialist, an individualized reading goal, and progress monitoring.'
      },
      {
        id: 'fapp',
        name: 'FAPE — Free Appropriate Public Education',
        plain: 'Your school must give you an education that meets your individual needs, at no cost to your family.',
        why: 'Every student with a disability is entitled to a real education that actually works for them, not just a seat in a classroom.',
        covers: 'Special education services, accommodations, specialized instruction, and any related services you need in order to benefit from your education.',
        doesntCover: 'Not the best possible education. Courts have said schools must provide education that gives students the opportunity to make progress appropriate for their circumstances, not the absolute best program money could buy.',
        example: 'If you need a reader during tests, the school provides that at no cost. Your family does not have to pay for accommodations.'
      },
      {
        id: 'lre',
        name: 'LRE — Least Restrictive Environment',
        plain: 'The school should educate you with students without disabilities as much as possible, and only pull you out of general classes when you truly need more support.',
        why: 'Separation causes stigma, limits friendships, and often means lower expectations. LRE tries to push schools toward inclusion, not just for equity but because it generally produces better outcomes.',
        covers: 'Your right to be in general-education classes with supports first, before moving to pull-out or separate classroom settings. The team has to justify any removal from the general-ed classroom.',
        doesntCover: 'LRE does not force full inclusion if you actually need a more specialized setting. Some students thrive in separate programs. The law asks what is LEAST restrictive for YOU.',
        example: 'If you need help with writing, the first try should be supports in your English class, not pulling you out into a separate class. If in-class supports don\'t work, then discuss pull-out.'
      },
      {
        id: 'fiveO4',
        name: 'Section 504 Plan',
        plain: 'If you have a disability that affects a major life activity like learning, concentrating, reading, or walking, but you don\'t need specialized instruction, you might get a 504 Plan with accommodations.',
        why: 'Section 504 is a civil rights law that predates IDEA. It is broader than IDEA: more conditions qualify, but it provides accommodations only, not specialized instruction.',
        covers: 'Accommodations like extended time on tests, preferential seating, frequent breaks, access to water or snacks, use of assistive technology, modified assignments.',
        doesntCover: 'No specialized instruction. No IEP goals tracked with progress monitoring. Fewer formal procedural protections than IDEA, though you still have rights.',
        example: 'A student with diabetes who needs snack breaks and blood-sugar checks might have a 504 plan, not an IEP. A student with ADHD who can succeed with accommodations but doesn\'t need pull-out instruction might also have a 504.'
      },
      {
        id: 'safe',
        name: 'Your right to a safe learning environment',
        plain: 'You have the right to attend school without being bullied, harassed, or discriminated against because of who you are.',
        why: 'Students can\'t learn when they don\'t feel safe. Multiple federal laws — Title VI (race, color, national origin), Title IX (sex, including gender identity and sexual orientation in many interpretations), Section 504 (disability), ADA (disability) — protect students from discrimination and require schools to respond to harassment.',
        covers: 'Protection from discrimination based on race, color, national origin, sex, gender identity, sexual orientation, disability, and often religion. Schools must investigate complaints and take action.',
        doesntCover: 'These protections require the school to be notified. If you don\'t tell a trusted adult, the school often doesn\'t know to respond.',
        example: 'If you are being harassed because of a disability (imitating your speech, mocking your accommodations, calling you slurs), the school has a legal obligation to address it, not to tell you to ignore it.'
      },
      {
        id: 'records',
        name: 'FERPA — access to your own educational records',
        plain: 'When you turn 18, you have the right to see everything in your educational file and to control who else sees it. Before 18, your parents have this right on your behalf.',
        why: 'You deserve to know what\'s in your own records. This includes grades, evaluations, IEPs, discipline records, and any notes schools are keeping.',
        covers: 'The right to review your records within 45 days of requesting them. The right to request corrections if something is wrong. The right to limit who else can see your records.',
        doesntCover: 'Teachers\' private notes that aren\'t shared with anyone else. Law enforcement records kept separately.',
        example: 'At 18, if you want to know what\'s in your psych eval report or your IEP history, you can request your own records. Before 18, your parent can request them on your behalf.'
      }
    ],
    high: [
      {
        id: 'ada',
        name: 'ADA Title II (schools) and Title III (private entities)',
        plain: 'The Americans with Disabilities Act gives you the right to reasonable accommodations in most public and private places, including colleges and workplaces.',
        why: 'IDEA ends when you graduate or turn 21 (whichever is first). ADA does not end. It follows you into college, work, and public life.',
        covers: 'Reasonable accommodations in college (if you register with disability services), in hiring and employment (for qualifying employers), in places of public accommodation (stores, restaurants, theaters, most businesses with 15+ employees).',
        doesntCover: 'You must self-identify and request accommodations in college and work. Nobody automatically gives you accommodations the way K-12 schools did. And the accommodations must be "reasonable" — the employer or college can argue certain accommodations create undue hardship.',
        example: 'You get into college. If you want extended time on exams, you register with the disability services office, submit documentation, and they send accommodation letters to your professors. Without this step, no accommodations happen.'
      },
      {
        id: 'safeguards',
        name: 'IDEA Procedural Safeguards (the protections you have)',
        plain: 'If you and the school disagree about your IEP, eligibility, or services, you have specific legal rights to resolve the dispute.',
        why: 'Rights without enforcement are not rights. IDEA built in procedures to protect students and families when they disagree with the school.',
        covers: 'Prior Written Notice before any change; informed consent for evaluations and services; right to an Independent Educational Evaluation (IEE) at school expense if you disagree with the school\'s evaluation; right to file a state complaint or due process hearing; right to stay in current placement during a dispute; right to mediation.',
        doesntCover: 'Procedural safeguards don\'t cover general unfairness. They cover specific special-education disputes.',
        example: 'If the school reduces your services and you disagree, they must give you Prior Written Notice explaining why. If you still disagree, you can file a complaint. The school can\'t just change things without notice.'
      },
      {
        id: 'majority',
        name: 'Age of Majority — rights transfer at 18',
        plain: 'When you turn 18 (in most states), educational rights that were your parents\' now become yours.',
        why: 'At the legal age of adulthood, you are the decision-maker for your own life, including your education. This can feel sudden. Planning matters.',
        covers: 'You sign your own IEP. You access your own records. You decide whether to continue services. You can invite your parents to meetings, or not. You decide who gets information about you.',
        doesntCover: 'If you have a significant cognitive disability that affects your ability to make educational decisions, options like supported decision-making agreements or guardianship may apply. These are legal processes, not automatic.',
        example: 'The school must send you (not just your parents) the Prior Written Notice at 18. Your parents can still be involved if you want, but you\'re the official decision-maker.'
      },
      {
        id: 'iee',
        name: 'IEE — Independent Educational Evaluation',
        plain: 'If you disagree with the school\'s evaluation of your needs, you can request an independent evaluation, often at the school\'s expense.',
        why: 'Schools aren\'t always right. An IEE gives you a second opinion from someone who doesn\'t work for the school.',
        covers: 'Evaluation by a qualified professional outside the district. Often at school expense, though the district can request a due process hearing to defend their eval.',
        doesntCover: 'Not automatic. You have to request it and state that you disagree with the school\'s eval. The school can choose its own list of qualified evaluators or accept yours.',
        example: 'School says you don\'t qualify for services. You can request an IEE, they either agree to pay or challenge the request, and you get a fresh evaluation from an outside professional.'
      }
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // MODULE 2: UNDERSTAND YOUR IEP / 504
  // ═══════════════════════════════════════════════════════════════
  var IEP_SECTIONS = [
    { section: 'Present Levels of Performance (PLOP)', what: 'A description of where you are right now in academic skills, behavior, social-emotional functioning, motor skills, and life skills.', lookFor: 'Does this description sound like you? What\'s missing? What strengths did they include or skip?' },
    { section: 'Annual Goals', what: 'What the team expects you to be able to do by the end of the IEP year. Each goal should be specific and measurable.', lookFor: 'Are these goals YOURS? Do they match what you want to work on? Are they ambitious enough? Are they realistic? A good goal has a specific skill, a measurable criterion (like "80% accuracy"), and a timeline.' },
    { section: 'Short-term Objectives (sometimes)', what: 'Smaller milestones on the way to annual goals. Not required for all students; more common for those working on alternate assessments.', lookFor: 'If included, do they break the big goal into manageable steps?' },
    { section: 'Special Education and Related Services', what: 'The specific services you receive — how often, for how long, from whom, in what setting. For example: "30 min/day of direct reading instruction from a special education teacher, 5 days/week in the resource room."', lookFor: 'Is the dosage right? Is the location right? Is it a qualified person providing it? Is it happening consistently?' },
    { section: 'Accommodations and Modifications', what: 'Changes to HOW you learn or HOW you are assessed. Accommodations level the playing field. Modifications change what\'s expected.', lookFor: 'Are the accommodations actually happening? Do you use them? Are any missing? Is anything in the plan outdated or unhelpful?' },
    { section: 'Program Modifications for Staff', what: 'What school staff need to do or know in order to implement your plan. Training, materials, consultation.', lookFor: 'Is the plan realistic given what staff can actually do? If staff say they don\'t know how to do something, is the support they need written in?' },
    { section: 'Participation in Assessments', what: 'What state/district tests you take, with what accommodations, or whether you take an alternate assessment.', lookFor: 'Are the test accommodations the same as your daily accommodations?' },
    { section: 'LRE Statement', what: 'Where you are educated and how much of your day is with non-disabled peers. Justification for any removal from general ed.', lookFor: 'Are you in the least restrictive environment that works for you? Is the justification for any removal still valid?' },
    { section: 'Transition Services (age 16+)', what: 'Your postsecondary goals and the services that will help you achieve them. Required by federal law at 16, earlier in some states.', lookFor: 'Do the postsecondary goals come from YOU or from the adults? Are the transition services connected to what YOU want to do?' }
  ];

  var IEP_SELF_QUESTIONS = [
    'Which goals feel most important to me this year?',
    'Which goals don\'t feel like mine — they sound like what adults want for me?',
    'What accommodations do I actually use? Which ones are on paper but I never use?',
    'What supports are missing? What would help that isn\'t in here?',
    'Is there anything in the PLOP that feels wrong, outdated, or only partly true?',
    'What do I want to be able to do by the end of this year that isn\'t in the plan?',
    'For transition-age: what do I actually want to do after high school? Does the plan support that?'
  ];

  var NO_PLAN_YET = [
    { step: 'Talk to a trusted adult at school', body: 'A teacher who knows you well, the school counselor, a school psychologist, the school nurse, or a specific administrator. Say: "I\'ve been struggling with [specific area] and I think I might need some extra support. How do I find out if I qualify?"' },
    { step: 'Ask your parent or guardian to request an evaluation in writing', body: 'This is the formal step. Your parent writes a letter or email to the special education director (or whoever your district designates) saying: "We request a special education evaluation for [student name] to determine if they qualify for services under IDEA." The date of this request starts legal timelines.' },
    { step: 'The school has about 60 days to evaluate', body: 'The exact number varies by state. During this time, they should gather data, observe you, test you in relevant areas, and talk with your family. You can participate and ask questions.' },
    { step: 'An eligibility meeting is held', body: 'You, your parents, teachers, and school staff meet to review the evaluation results. The team decides whether you meet eligibility criteria for an IEP.' },
    { step: 'If you qualify, an IEP is developed', body: 'Within 30 days of eligibility determination, the team meets again to write your IEP. This is the plan document with goals, services, and accommodations.' },
    { step: 'If you don\'t qualify for an IEP, ask about a 504 plan', body: '504 has broader eligibility. If your disability affects a major life activity but you don\'t need specialized instruction, a 504 plan may be appropriate.' },
    { step: 'If the school refuses to evaluate or denies eligibility, you have options', body: 'You can request an Independent Educational Evaluation (IEE), file a state complaint, or request mediation or a due process hearing. Module 5 covers escalation in depth.' }
  ];

  var IEP_MEETING_PREP = [
    { question: 'What are my goals?', prep: 'Write down 2-3 things you want to accomplish this year. These can become IEP goals or inform how existing goals are written.' },
    { question: 'What\'s working in my current plan?', prep: 'Think about specific examples. "The extended time on math tests actually helps me." Concrete examples are more convincing than general claims.' },
    { question: 'What\'s NOT working?', prep: 'Also think specifically. "The pull-out social skills group feels babyish and my friends aren\'t there." Name the actual problem.' },
    { question: 'What do I want to try?', prep: 'Come with proposals, not just complaints. "Instead of pull-out, can I check in with my advisor 15 minutes a day?"' },
    { question: 'Who do I want at the meeting?', prep: 'Parents, yes. A supportive teacher or advisor? A community advocate? A family friend? You can invite people who know and support you.' },
    { question: 'What am I nervous to say?', prep: 'Writing it down helps. You can read from your notes at the meeting if speaking up feels hard. Practicing with a supportive adult beforehand helps even more.' },
    { question: 'What questions do I have?', prep: 'Always ask questions. "Why did you choose that goal?" "How will we know if this is working?" "What happens if I still struggle?"' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 3: REQUESTING ACCOMMODATIONS
  // ═══════════════════════════════════════════════════════════════
  var ACCOMMODATION_DECISION = [
    { question: 'Is this a one-time request or an ongoing need?', body: 'One-time: just ask. "Can I have five extra minutes on this quiz because I had a headache?" Ongoing: better to formalize through a 504 or IEP so every teacher knows.' },
    { question: 'Does this connect to a documented disability?', body: 'Accommodations in school settings are tied to disabilities. If you have a diagnosed condition (dyslexia, ADHD, anxiety disorder, diabetes, chronic pain, etc.), accommodations follow from that. If you don\'t have a diagnosis but you know you need help, talk to your counselor about next steps, including the evaluation process.' },
    { question: 'Who has authority to grant this?', body: 'Classroom-level: the teacher can grant short-term accommodations. Testing format or pull-out support: usually requires 504 or IEP. Policy-level (like attendance): often the administrator. Knowing the right person to ask saves time.' },
    { question: 'Will this accommodation affect how your work is evaluated?', body: 'Accommodations (extended time, different format, breaks) don\'t change what\'s being measured. Modifications (simpler assignments, different grading) do. Modifications can have long-term implications for grades, credits, and college admissions. Think about what you\'re asking for.' }
  ];

  var ACCOMMODATION_SCRIPTS = {
    middle: [
      { need: 'Extended time on a test', to: 'Your teacher', script: '"I have an IEP/504 that gives me extended time. Can we talk about when I\'ll finish the test? I was thinking I could use study hall or come back after school." Bring your plan document or a copy of your accommodations sheet.' },
      { need: 'Quiet testing environment', to: 'Your teacher or counselor', script: '"I have extended time AND a quieter space as part of my plan. Where should I take this test? I know some kids go to the library, but I wanted to ask first."' },
      { need: 'Preferential seating', to: 'Your teacher at the start of a semester', script: '"I learn better near the front of the room. Could I sit up there? I wanted to ask before you do a seating chart."' },
      { need: 'Break during class', to: 'Your teacher', script: '"I have a break accommodation. Can I use it now? I just need five minutes." Have a break pass if your school uses one.' },
      { need: 'Using a laptop for notes', to: 'Your teacher', script: '"I handwrite really slowly, and it\'s hard to keep up. My plan says I can use a laptop. Is that okay for this class?"' },
      { need: 'Different assignment format', to: 'Your teacher, usually with parent or advisor help', script: '"I struggle with long written assignments. Is there a way I could show I understand this in a different way, like a presentation or a diagram?"' },
      { need: 'Make-up work after absence', to: 'Your teacher', script: '"I missed class yesterday because of my condition. Can you tell me what I missed and how long I have to make it up?" Plans often include flexibility for disability-related absences.' }
    ],
    high: [
      { need: 'Extended test time', to: 'Your teacher or testing coordinator', script: '"I\'m registered with [504 coordinator/counselor]. My accommodations include time-and-a-half on tests. I\'d like to use that for the unit test. What\'s the best way to schedule it?"' },
      { need: 'Quiet or alternate testing location', to: 'Your testing coordinator', script: '"For the midterm, I\'d like to use my accommodation for a quieter space. Can we look at the testing calendar and find a room?"' },
      { need: 'Note-taking support', to: 'Your counselor or 504 coordinator', script: '"Taking notes and listening at the same time is genuinely hard for me. Can we talk about options like a note-taker, shared notes from another student, or using my laptop?"' },
      { need: 'Assistive technology', to: 'Your IEP team or district AT specialist', script: '"I\'m wondering if text-to-speech or speech-to-text would help me keep up with reading and writing. Can we do a trial?"' },
      { need: 'Attendance flexibility', to: 'Your counselor', script: '"My condition sometimes requires absences that aren\'t predictable. What does my plan say about that, and how do we document it so I don\'t get penalized?"' },
      { need: 'Extended deadlines', to: 'Your teacher, usually approved through counselor', script: '"I\'ve had a flare-up this week and I\'m going to need an extra 48 hours on the project. My plan allows for this, and here\'s the form my counselor gave me."' },
      { need: 'Modified homework load', to: 'IEP team or counselor', script: '"The homework load is affecting my health and sleep. I\'d like to talk about either modified assignments or different pacing. This needs to be a team conversation."' }
    ]
  };

  var DOCUMENTATION_HABITS = [
    { habit: 'Keep a running log', body: 'Simple notes app or notebook. Each entry: date, what happened, who was involved, what was said, what happened next. You don\'t need to write a lot — just enough to jog your memory later.' },
    { habit: 'Save copies of everything', body: 'Email accommodation requests so there\'s a record. If you ask in person, follow up with an email: "Thanks for talking with me today. To summarize, we agreed that..." This creates a paper trail without being confrontational.' },
    { habit: 'Keep your plan document accessible', body: 'Save a copy on your phone or in a cloud folder so you can reference it when you need to remind someone what you\'re entitled to.' },
    { habit: 'Track what you actually receive', body: 'Are you getting the services listed in your plan? If your IEP says 30 min/day of reading intervention and you\'ve only gone three times this month, that\'s data. Note it without drama.' },
    { habit: 'Document denied requests', body: 'If an accommodation is denied or delayed, write down: what you asked for, when, from whom, what they said, and when. This matters if you need to escalate.' },
    { habit: 'Don\'t wait until there\'s a big problem', body: 'A few minutes a week of documentation is way easier than trying to reconstruct six months of memory when something goes wrong.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 4: DISCLOSURE DECISIONS
  // ═══════════════════════════════════════════════════════════════
  var DISCLOSURE_CORE_IDEA = 'Disclosure is different from asking for an accommodation. You never have to share your specific diagnosis with anyone. You get to decide what to share, with whom, and when. The key question is always: what does this person need to know to help me, and what do they NOT need to know? Your story, your narrative, your choice.';

  var DISCLOSURE_AUDIENCES = [
    {
      audience: 'A peer or friend',
      whatTheyNeed: 'Almost nothing. Peers don\'t grant accommodations. If you\'re close friends, sharing may deepen the friendship. If you\'re not sure about them yet, keep it general.',
      whatNotToShare: 'Your diagnosis, medical history, or clinical details — unless you want to.',
      scripts: [
        { level: 'Low disclosure', text: '"I sometimes need extra time on tests. It\'s just how I work."' },
        { level: 'Medium', text: '"I have a learning difference that affects reading. I use some supports at school to help."' },
        { level: 'High', text: '"I have dyslexia. It makes reading harder for me, but I\'ve got strategies. Sometimes I\'ll ask you to help me proofread something."' }
      ]
    },
    {
      audience: 'A teacher',
      whatTheyNeed: 'Enough to help them follow your plan and support you effectively. They don\'t need a clinical label; they need to know what you need.',
      whatNotToShare: 'Detailed medical history, specific diagnoses (unless you want to), family context beyond what\'s relevant. Your 504 or IEP already gives them what they legally need.',
      scripts: [
        { level: 'Low disclosure', text: '"I have a 504 plan. The accommodations sheet is in your folder."' },
        { level: 'Medium', text: '"I have some learning differences that mean I need extended time and a quiet space for tests. My plan covers this."' },
        { level: 'High', text: '"I have ADHD combined with an anxiety disorder. Both affect my focus in different ways. My accommodations include breaks and extended time. I\'m happy to talk about what\'s working."' }
      ]
    },
    {
      audience: 'A school counselor or school psychologist',
      whatTheyNeed: 'Usually more context, because they are there to support you with the system. They\'re bound by confidentiality for most disclosures (with safety exceptions). Being honest with them usually serves you best.',
      whatNotToShare: 'If you\'re talking to a trusted counselor, most things are okay to share. Be aware of mandated reporting for safety concerns.',
      scripts: [
        { level: 'Low disclosure', text: '"I\'ve been struggling at school and want to talk about what might help."' },
        { level: 'Medium', text: '"I have ADHD and the accommodations aren\'t working as well as they used to. I want to rethink my plan."' },
        { level: 'High', text: '"I have anxiety that\'s getting worse, and my IEP doesn\'t address it. I want to talk about adding counseling and accommodations around test-taking stress."' }
      ]
    },
    {
      audience: 'A college admissions application',
      whatTheyNeed: 'Colleges cannot ask about disability in admissions. You don\'t have to disclose to get in. But you CAN disclose if it adds context to your application (like explaining a gap year, a GPA dip, or a notable achievement despite a disability).',
      whatNotToShare: 'Medical or clinical detail. Nothing that\'s asked for by the application.',
      scripts: [
        { level: 'Low disclosure', text: 'Don\'t disclose at all. Application stays focused on academic and extracurricular accomplishments. This is fine and common.' },
        { level: 'Medium', text: 'In your personal essay, mention "a learning difference that shaped how I learn" if it\'s relevant to the story you\'re telling. Keep it strengths-focused.' },
        { level: 'High', text: 'If your narrative specifically involves navigating disability, you can name it. Works best when the essay focuses on your agency and insight, not on the diagnosis itself.' }
      ]
    },
    {
      audience: 'College disability services office',
      whatTheyNeed: 'Documentation of your disability (usually your IEP, 504, or a professional evaluation) plus a request for specific accommodations. This is where you ABSOLUTELY want to disclose — they can\'t help otherwise.',
      whatNotToShare: 'More than what\'s in your documentation. They don\'t need your life story.',
      scripts: [
        { level: 'Step 1', text: 'Register during orientation or in the first few weeks. "I have a documented disability and I\'d like to register for accommodations."' },
        { level: 'Step 2', text: 'Submit your documentation. If your high school eval is older than 3 years, they may want a more recent one.' },
        { level: 'Step 3', text: 'Meet to determine specific accommodations. "In high school I had extended time, quiet testing, and note-taking support. I\'d like to continue with similar supports."' }
      ]
    },
    {
      audience: 'An employer or potential employer',
      whatTheyNeed: 'Generally nothing until after you have a job offer. ADA protects you from being required to disclose before an offer. After an offer, if you need accommodations, you\'d disclose enough to get them.',
      whatNotToShare: 'In a job interview: nothing about disability unless the employer has asked about your ability to do a specific job function, and even then you can keep it functional ("Yes, I can handle that task with X accommodation").',
      scripts: [
        { level: 'Pre-offer (interview)', text: 'Don\'t disclose. Discuss your skills and your fit. You\'re under no obligation to share.' },
        { level: 'Post-offer, if needed', text: '"I\'m accepting the offer. Before I start, I\'d like to discuss a reasonable accommodation I may need: [specific thing]. Who\'s the right person to set this up?"' },
        { level: 'On the job, if needed', text: '"I have a condition that affects [specific function]. I\'d like to request [specific accommodation]. My doctor can provide documentation. Who handles this process?"' }
      ]
    }
  ];

  var DISCLOSURE_TIMING = [
    { timing: 'Preemptive', when: 'Before a problem arises — at start of semester, new job, new relationship.', pros: 'Sets expectations. Avoids confusion later. Teacher/employer can plan.', cons: 'Some will judge or make assumptions before they know you. You\'re lead with a label instead of yourself.' },
    { timing: 'Reactive', when: 'When a problem has come up and disclosure is needed to fix it.', pros: 'Natural timing. The issue makes the accommodation concrete.', cons: 'You may feel pressured or on the spot. The other person may feel blindsided.' },
    { timing: 'Situational', when: 'Only when a specific situation requires it.', pros: 'Maintains your privacy. Disclosure is strategic, not default.', cons: 'Requires ongoing decision-making. You may miss supports you would have gotten by disclosing earlier.' },
    { timing: 'Never', when: 'You choose not to disclose and manage on your own.', pros: 'Maximum privacy and control. Some people thrive without disclosing in specific contexts.', cons: 'You don\'t get accommodations. If you genuinely need them, this is the costliest choice. Works best for minor needs or when you can self-accommodate fully.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 5: WHEN THINGS GO WRONG (escalation paths)
  // ═══════════════════════════════════════════════════════════════
  var ESCALATION_LEVELS = [
    {
      level: 1,
      name: 'Talk to the person directly involved',
      who: 'The teacher, aide, or staff member',
      when: 'Most issues, most of the time. Start here unless there\'s a safety concern.',
      how: '"I\'ve noticed that [specific thing] hasn\'t been happening. My plan says [X]. Can we talk about what\'s going on?" Stay calm. Assume good faith. Listen to their perspective. Many issues resolve here.',
      timeline: 'Give it a week or two to see if things change. Document in the meantime.',
      nextIfStuck: 'If the person is unresponsive, hostile, or unable to fix the issue, move up.'
    },
    {
      level: 2,
      name: 'Involve your parent or guardian',
      who: 'Parent, guardian, or a trusted family advocate',
      when: 'When a direct conversation didn\'t resolve it, or when the issue is bigger than one person.',
      how: 'Share what you\'ve documented. Let your parent contact the teacher or move to the next level. Many students find their parent can push harder than they can.',
      timeline: 'Conversations within days; formal follow-ups may take weeks.',
      nextIfStuck: 'If the parent-teacher conversation doesn\'t resolve it, escalate to the team.'
    },
    {
      level: 3,
      name: 'Contact the case manager or 504 coordinator',
      who: 'Your case manager (if you have an IEP) or 504 coordinator (if you have a 504)',
      when: 'When a teacher isn\'t implementing your plan, or when the plan itself needs to change.',
      how: '"I\'d like to talk about how my plan is working. Can we schedule a meeting?" Bring documentation.',
      timeline: 'Meetings typically scheduled within 1-2 weeks.',
      nextIfStuck: 'Request an IEP team meeting to formally discuss and document changes.'
    },
    {
      level: 4,
      name: 'Request an IEP / 504 team meeting',
      who: 'All team members including parent, special educator, general educator, administrator',
      when: 'When the issue affects your plan itself, not just one teacher. A team meeting can formally change your plan.',
      how: 'Parent writes to the case manager: "We request a team meeting to discuss [specific issues] with [student\'s] IEP." The school must schedule one, usually within 10 days.',
      timeline: 'Meeting within 10 days. Outcome documented in a new IEP or amendment.',
      nextIfStuck: 'If the meeting doesn\'t resolve things, use the procedural safeguards.'
    },
    {
      level: 5,
      name: 'Contact the special education director',
      who: 'District-level special education director or supervisor',
      when: 'When school-level staff are unable or unwilling to fix the issue.',
      how: 'Email or letter summarizing: the issue, what you\'ve tried, what resolution you want. Include dates and documentation.',
      timeline: 'Response typically within a week or two.',
      nextIfStuck: 'Move to formal complaint or dispute resolution process.'
    },
    {
      level: 6,
      name: 'File a state complaint',
      who: 'Your state department of education',
      when: 'When there\'s a violation of IDEA or Section 504 (plan not implemented, services not provided, procedural safeguards violated) and local channels haven\'t resolved it.',
      how: 'Written complaint to the state special education office. Most states have a form. States must investigate within 60 days and issue a written decision.',
      timeline: 'Decision within 60 days of filing.',
      nextIfStuck: 'If the state decision doesn\'t help, you can also pursue due process or OCR complaint.'
    },
    {
      level: 7,
      name: 'Request mediation',
      who: 'State-provided neutral mediator',
      when: 'When you want to resolve a dispute without a hearing, but direct negotiation hasn\'t worked. Voluntary for both sides.',
      how: 'Request through state department of education. Mediator facilitates a meeting. If you reach agreement, it becomes a legally binding document.',
      timeline: 'Mediation scheduled within days or weeks. Sessions typically 1-3 hours.',
      nextIfStuck: 'If mediation doesn\'t resolve it, due process is the next step.'
    },
    {
      level: 8,
      name: 'File for due process hearing',
      who: 'State-level hearing officer',
      when: 'Formal legal proceeding for unresolved disputes. Usually used for significant disagreements about eligibility, FAPE, or placement.',
      how: 'File a due process complaint. A hearing is scheduled. Both sides present evidence. Usually involves attorneys.',
      timeline: '30-45 day resolution timeline. Can be appealed to federal court.',
      nextIfStuck: 'Appeal through court system.'
    },
    {
      level: 9,
      name: 'File an OCR (Office for Civil Rights) complaint',
      who: 'U.S. Department of Education, Office for Civil Rights',
      when: 'When there\'s discrimination based on disability (Section 504, ADA Title II), race (Title VI), or sex (Title IX). Good for retaliation, harassment, and systemic discrimination claims.',
      how: 'Online complaint form at ed.gov/ocr. Must be filed within 180 days of the incident (some exceptions).',
      timeline: 'OCR investigates; resolution timelines vary.',
      nextIfStuck: 'OCR decisions can be appealed; additional legal action possible.'
    }
  ];

  var ESCALATION_TIPS = [
    { tip: 'Keep escalating only as far as needed', body: 'Most issues resolve at levels 1-3. Formal complaints are stressful, time-consuming, and can damage relationships. They\'re real tools, but not first tools.' },
    { tip: 'Document at every level', body: 'Dates, names, what was said, what happened next. Save emails. This is your record if you need to escalate further.' },
    { tip: 'Stay professional in writing', body: 'Every email, letter, and complaint may be read by many people. Even when you\'re frustrated, stay factual. Opinions and emotions can be shared verbally; written records should be specific and restrained.' },
    { tip: 'Know about retaliation protections', body: 'It is illegal for a school to retaliate against you or your family for filing a complaint or exercising your rights. If you experience retaliation, that itself is a basis for an OCR complaint.' },
    { tip: 'Get help', body: 'You don\'t have to navigate this alone. Parent Training and Information Centers (PTIs — every state has one), Council of Parent Attorneys and Advocates (COPAA), state Protection and Advocacy agencies, Wrightslaw online resources, and your state\'s disability rights organization can all help.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 6: TRANSITION TO ADULTHOOD
  // ═══════════════════════════════════════════════════════════════
  var TRANSITION_MILESTONES = [
    { age: '14-15', event: 'Transition discussions begin', prep: 'Start thinking about your interests, what you\'re good at, and what you might want to do after high school. You don\'t need an answer; you need to start exploring.', rights: 'Your IEP should begin including transition-related goals around this age.' },
    { age: '16', event: 'Formal transition planning required', prep: 'Your IEP must now include measurable postsecondary goals and transition services. This is required by federal law.', rights: 'Transition services cover education/training, employment, and independent living. Agency representatives (VR, DD services) can be invited with your consent.' },
    { age: '17', event: 'Prepare for rights transfer', prep: 'One year before age of majority: the school must tell you that rights transfer at 18. Start thinking about what that means for you and how you want to handle it.', rights: 'You have the right to know about the rights transfer in advance.' },
    { age: '18', event: 'Age of majority — rights transfer', prep: 'You sign your own IEP now. You decide who comes to meetings. You access your own records. If this is overwhelming, supported decision-making agreements are an alternative to guardianship.', rights: 'All IDEA rights that were your parents\' now become yours.' },
    { age: 'Before graduation', event: 'Get a Summary of Performance (SOP)', prep: 'Request your Summary of Performance document. It describes your academic achievement and functional performance plus recommendations for meeting postsecondary goals. You\'ll use this for college disability services and workplace accommodations.', rights: 'SOP is required by IDEA for students exiting with a regular diploma or aging out.' },
    { age: 'Graduation', event: 'IEP ends', prep: 'Special education services end with a regular diploma or at age 21-22 (varies by state). Know what\'s next: college? VR? Work? Have a plan.', rights: 'No more IEP. But ADA and 504 follow you into college and work.' }
  ];

  var COLLEGE_VS_HS = [
    { dimension: 'Who initiates accommodations', hs: 'The school identifies needs, evaluates, and develops a plan. You and your family participate but the system is proactive.', college: 'You must self-identify by registering with Disability Services. No one reaches out to you. You must have documentation and request specific accommodations.' },
    { dimension: 'Documentation required', hs: 'School evaluations done by school staff, paid for by the district.', college: 'You may need a recent professional evaluation (within the last 3 years is common). If your high school eval is older, you might need to get a new one (often at your expense).' },
    { dimension: 'Services available', hs: 'Specialized instruction (IEP), accommodations (504 or IEP), related services, case management.', college: 'Accommodations only. No specialized instruction. No case manager. You\'re expected to manage your learning independently.' },
    { dimension: 'Communication with family', hs: 'Parents are central. Meetings, notices, decisions include them by default.', college: 'FERPA protects your records. Disability Services typically won\'t talk to your parents without your written consent.' },
    { dimension: 'Problem-solving', hs: 'Team-based. Case manager coordinates.', college: 'You\'re responsible. If an accommodation isn\'t working, you contact Disability Services. If a professor won\'t implement, you escalate.' },
    { dimension: 'Modifications', hs: 'Modifications (simplified content, different grading) are possible.', college: 'Modifications that fundamentally alter course requirements are not required by law. Accommodations are required; substantially changing what\'s taught is not.' }
  ];

  var WORKPLACE_RIGHTS = [
    { topic: 'Pre-offer (applying and interviewing)', body: 'Employers CANNOT ask if you have a disability, ask about medical history, or require you to disclose. You don\'t need to mention anything. Focus on your qualifications.' },
    { topic: 'Post-offer, pre-hire', body: 'Some employers do medical exams or ask medical questions AFTER a conditional job offer. This is legal if they do it for all employees in that role. If they revoke the offer based on the medical info, they must show it\'s job-related and necessary.' },
    { topic: 'Requesting accommodations', body: 'You can request accommodations at any point — during the application, post-offer, or while employed. The "interactive process" is required: you and the employer work together to figure out what will work. You don\'t have to name your diagnosis; you describe the functional need.' },
    { topic: '"Reasonable" accommodations', body: 'The law requires reasonable accommodations that don\'t cause "undue hardship." Examples: flexible schedule, assistive technology, modified workstation, light duty temporarily, telework, job restructuring. Usually inexpensive.' },
    { topic: 'Disclosure strategy', body: 'General principle: disclose on a need-to-know basis. Your direct supervisor and HR may need to know enough to implement accommodations. Coworkers generally don\'t. You control the narrative.' },
    { topic: 'Retaliation protection', body: 'It is illegal to fire, demote, or punish you for requesting accommodations or filing a complaint. If it happens, document everything and contact the EEOC.' },
    { topic: 'Where to get help', body: 'EEOC (eeoc.gov) handles federal employment discrimination claims. Job Accommodation Network (askJAN.org) is a FREE federal resource that helps workers and employers figure out accommodations. State disability rights organizations offer legal help.' }
  ];

  var TELLING_YOUR_STORY = [
    { principle: 'Lead with strengths and agency', body: 'Your narrative should showcase what you\'ve learned, built, or contributed — not a deficit list. "I\'ve learned to advocate for myself, organize complex information, and work through challenges" is better than "I have dyslexia."' },
    { principle: 'Frame the challenge, then the response', body: 'If you name a disability, follow with what you did about it. "Anxiety made freshman year hard. I worked with my counselor, built a toolkit of strategies, and made the honor roll junior year."' },
    { principle: 'Choose the audience', body: 'A college admissions essay, a scholarship application, a job interview, and a peer conversation all call for different levels of disclosure. Craft your story to fit.' },
    { principle: 'Practice it out loud', body: 'Written narratives sound different spoken. Practice telling your story to someone you trust. Refine until it feels natural.' },
    { principle: 'It\'s okay to change your mind', body: 'You can choose to share today and not tomorrow, or vice versa. Your story is yours. You\'re allowed to update it as you grow.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 7: PRACTICE SCENARIOS (AI-critiqued)
  // ═══════════════════════════════════════════════════════════════
  var PRACTICE_SCENARIOS = {
    middle: [
      { id: 'm1', title: 'New teacher, new year', situation: 'It\'s the second week of a new school year. You have a 504 plan for ADHD with accommodations for extended time, break access, and preferential seating. Your new math teacher has not mentioned your plan yet, and you\'re not sure she\'s read it.', goal: 'Politely and confidently make sure your teacher knows about your accommodations.' },
      { id: 'm2', title: 'Asking to retake a test', situation: 'You had a really anxious day and bombed a test. Your plan doesn\'t technically include retakes, but you feel you could have done much better. How do you ask?', goal: 'Make a professional, respectful case for a retake without over-explaining or apologizing excessively.' },
      { id: 'm3', title: 'Seat change request', situation: 'You need to be near the front, but the teacher already did a seating chart and you\'re in the back. You have a 504 accommodation for preferential seating. How do you bring it up without making it a big deal?', goal: 'Advocate for a seat change that you\'re entitled to, without embarrassment.' },
      { id: 'm4', title: 'Friend asks about your accommodations', situation: 'A friend in your class noticed you get extra time on tests and goes to a different room for some things. They ask directly: "So what\'s up with that? Are you like, special ed or something?" How do you respond?', goal: 'Talk about your needs in a way that feels authentic to you, without pressure to over- or under-disclose.' },
      { id: 'm5', title: 'Your IEP meeting is next week', situation: 'Your annual IEP meeting is scheduled for next week. Your case manager asked if you want to share anything. Normally your mom does most of the talking. This year you want to speak up about one thing: you don\'t want to be pulled out of science anymore because your friends are in that class and it\'s your best subject anyway.', goal: 'Plan how you\'ll make this ask at the meeting.' },
      { id: 'm6', title: 'Substitute teacher confusion', situation: 'There\'s a substitute today. The sub announced a pop quiz and said "no exceptions on time — finish or don\'t." You have extended time as an accommodation. Other kids don\'t know about your plan. How do you handle this?', goal: 'Advocate for your accommodation without drawing unwanted attention or causing a scene with the sub.' }
    ],
    high: [
      { id: 'h1', title: 'College visit — disability services office', situation: 'You\'re on a college visit with your family. You want to visit the Disability Services office to ask about registering. Your parents aren\'t sure it\'s necessary. You have an IEP now and want to understand how it will work in college.', goal: 'Plan what you\'ll say at Disability Services and what questions you\'ll ask.' },
      { id: 'h2', title: 'Teacher refusing to follow IEP', situation: 'Your calculus teacher has told you that his classroom policy is "no extended time for anyone, period" and he won\'t give you your documented accommodation. You know your IEP entitles you to this.', goal: 'Plan how to escalate this — starting with the teacher, then moving up if needed.' },
      { id: 'h3', title: 'Job interview — no disclosure', situation: 'You\'re interviewing for a summer internship. The interviewer asks a broad question like "Tell me about yourself." You have ADHD and sometimes feel pressure to explain it. The job doesn\'t require disclosure.', goal: 'Present yourself powerfully without feeling pressured to disclose, and feel confident about that choice.' },
      { id: 'h4', title: 'Asking your doctor for updated documentation', situation: 'You\'re going to college next year. Disability Services at your college wants documentation "within the past three years" and your most recent eval is four years old. You need to ask your pediatrician or a specialist for an updated evaluation. How do you frame this request?', goal: 'Advocate for what you need for college even though your current doctor hasn\'t brought it up.' },
      { id: 'h5', title: 'Transition planning pushback', situation: 'Your IEP team has scheduled your transition planning meeting. The school counselor is pushing you toward a specific community college program that you don\'t want. You want to apply to four-year schools. Your parents are unsure.', goal: 'Advocate for your own goals when adults are pushing a different path.' },
      { id: 'h6', title: 'Disclosure to a new romantic partner', situation: 'You\'ve been dating someone for a couple of months. You\'re getting more serious. You have a chronic health condition that affects your schedule, energy, and sometimes your mood. They don\'t know. You\'re thinking it\'s time to share.', goal: 'Plan how, when, and how much to disclose in a way that\'s authentic and keeps your sense of self intact.' }
    ]
  };

  function buildPracticeCritiquePrompt(scenarioObj, userResponse, band) {
    return 'You are a self-advocacy coach reviewing a student\'s response to a realistic advocacy scenario. Give warm, specific, concrete feedback.\n\n' +
      'GRADE BAND: ' + (band === 'high' ? 'High school' : (band === 'middle' ? 'Middle school' : 'Elementary')) + '\n\n' +
      'SCENARIO: ' + scenarioObj.title + '\n' +
      'SITUATION: ' + scenarioObj.situation + '\n' +
      'GOAL: ' + scenarioObj.goal + '\n\n' +
      'STUDENT\'S RESPONSE:\n"' + userResponse + '"\n\n' +
      'Provide feedback in plain text (no markdown), about 250-350 words:\n\n' +
      '1. What\'s strong in their response: Name 1-2 specific things they did well. Concrete, not generic.\n\n' +
      '2. Where it could be stronger: 1-2 specific suggestions. Not a rewrite, but a nudge — where could they add specificity, reduce apologizing, claim more agency, be clearer about what they need?\n\n' +
      '3. Self-advocacy principle this illustrates: What\'s the broader lesson? (E.g., "You never have to disclose more than you want to," or "Requesting what\'s in your plan is not asking for a favor.")\n\n' +
      '4. One try for strengthening: If you had to rewrite one sentence, which one and how?\n\n' +
      'Rules:\n- Be warm and supportive but honest. Over-validation is not helpful.\n- Avoid em dashes and en dashes; use commas, periods, colons, semicolons, parentheses instead.\n- Tailor tone to the grade band. Middle schoolers hear "way to go" differently than high schoolers.\n- Do not pressure the student to disclose more than they chose to. Disclosure choices are theirs.\n- Do not give legal advice. Self-advocacy is about communication, not litigation.';
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 8: MY LEARNING PROFILE (self-knowledge + printable one-pager)
  // ═══════════════════════════════════════════════════════════════
  // Students build a one-page summary of how they learn, what helps,
  // what gets in the way, their strengths, and what they want teachers
  // to know. Printable / shareable.

  var LP_STRENGTHS = [
    'Creative problem-solving', 'Memorizing things I care about', 'Making people laugh', 'Noticing patterns',
    'Reading body language', 'Helping friends through tough stuff', 'Working with my hands',
    'Learning by doing', 'Visual thinking / drawing', 'Writing', 'Speaking up in discussions',
    'Finding bugs or errors', 'Explaining things to others', 'Building or making things',
    'Physical activity / sports', 'Music / rhythm', 'Persistence on hard problems',
    'Asking good questions', 'Learning languages', 'Deep focus on things I love',
    'Taking care of people or animals', 'Leading groups', 'Quiet observation',
    'Remembering details others miss', 'Researching / going deep on a topic',
    'Fairness and fighting for what\'s right'
  ];

  var LP_HELPS = [
    'Seeing examples before I try', 'Hearing things explained out loud',
    'Doing before being told rules', 'Quiet space to focus', 'Background music',
    'Breaking big tasks into small steps', 'Checklists', 'Visual schedules or timers',
    'Movement breaks', 'Working with a partner', 'Working alone',
    'Being able to stand or pace', 'Fidget tools', 'Extra time',
    'Extra reading time', 'Knowing what\'s coming', 'Room to ask questions',
    'Clear rubrics', 'Writing notes by hand', 'Typing on a laptop',
    'Text-to-speech', 'Speech-to-text', 'Reading aloud', 'Re-reading in my head',
    'Connecting new stuff to what I already know', 'Concrete real-world examples',
    'Drawing or diagramming', 'Starting with the big picture then details',
    'Starting with details then building to the big picture'
  ];

  var LP_GETS_IN_WAY = [
    'Loud or chaotic environments', 'Fluorescent lighting', 'Unpredictable changes',
    'Strong smells', 'Long lectures with no breaks', 'Unclear directions',
    'Pop quizzes', 'Being called on without warning', 'Time pressure',
    'Reading long passages silently', 'Copying from the board', 'Handwriting for a long time',
    'Group work with strangers', 'Being the center of attention',
    'Working when I\'m hungry or tired', 'Transitions between activities',
    'Open-ended "figure it out" problems', 'Too much information at once',
    'Rules that change without explanation', 'Feeling rushed', 'Being corrected publicly',
    'Not knowing why we\'re learning something', 'Teacher sarcasm',
    'Other students distracting me', 'Feeling I\'m being watched'
  ];

  var LP_PROMPTS = {
    middle: {
      intro: 'Something I want teachers to know about me right away:',
      teachers: 'What I want teachers to do or not do when I\'m struggling:',
      hidden: 'Something about me adults don\'t always notice:',
      wish: 'One thing I wish my teachers understood about me:'
    },
    high: {
      intro: 'A brief introduction: who you are as a learner, in your own voice.',
      teachers: 'What you want teachers to know about how to work with you effectively.',
      hidden: 'Strengths or challenges that aren\'t visible on paper and that shape your experience of school.',
      wish: 'One thing you wish adults understood about your learning or experience.'
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // MODULE 9: MEETING PREP WORKSHEET (printable before IEP / conference)
  // ═══════════════════════════════════════════════════════════════
  var MEETING_TYPES = [
    { id: 'iepAnnual', name: 'IEP Annual Review' },
    { id: 'iepAmend', name: 'IEP Amendment / Team Meeting' },
    { id: 'eval', name: 'Evaluation / Eligibility Meeting' },
    { id: 'fiveO4', name: '504 Plan Review' },
    { id: 'ptConf', name: 'Parent-Teacher Conference' },
    { id: 'manifest', name: 'Manifestation Determination / Discipline' },
    { id: 'transition', name: 'Transition Planning Meeting' },
    { id: 'other', name: 'Other' }
  ];

  var CONVERSATION_STARTERS = [
    'Before we go on, I want to share something I\'ve been thinking about.',
    'Can I ask a question about that?',
    'I\'d like to be more involved in this decision.',
    'That doesn\'t feel right to me. Can we talk about why?',
    'Thank you for explaining that. I still have a concern.',
    'Can we write that down so I remember what we agreed?',
    'Can we come back to that in a minute? I want to think about it first.',
    'I\'m not sure what that term means. Can you explain it in plain words?',
    'What would it look like if we tried it my way first?',
    'Who\'s responsible for making sure that happens?'
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 10: LETTER / EMAIL BUILDER
  // ═══════════════════════════════════════════════════════════════
  // Templates for formal requests that students and families commonly need
  // to make in writing. Each template has specific fields plus generated text.

  var LETTER_TEMPLATES = [
    {
      id: 'requestEval',
      name: 'Request a Special Education Evaluation',
      whoWrites: 'Parent (or student 18+)',
      purpose: 'Formally ask the school to evaluate your child for special education eligibility. This starts legal timelines.',
      fields: [
        { id: 'date', label: 'Date', placeholder: 'April 28, 2026' },
        { id: 'recipient', label: 'Recipient (title + name)', placeholder: 'Dr. Jane Smith, Director of Special Education' },
        { id: 'school', label: 'School or district', placeholder: 'Portland Public Schools' },
        { id: 'studentName', label: 'Student full name', placeholder: 'Alex Rivera' },
        { id: 'studentDOB', label: 'Student date of birth', placeholder: '2013-06-15' },
        { id: 'gradeSchool', label: 'Current grade and school', placeholder: '6th grade, King Middle School' },
        { id: 'concerns', label: 'Specific concerns prompting the request', placeholder: 'Alex has been falling behind in reading for the past year. We\'ve tried Tier 2 interventions but progress is slower than expected. We are concerned about a possible specific learning disability.' },
        { id: 'senderName', label: 'Your name', placeholder: 'Pat Rivera' },
        { id: 'senderContact', label: 'Your email and/or phone', placeholder: 'pat.rivera@example.com / (207) 555-0123' }
      ],
      generate: function(v) {
        return (v.date || '') + '\n\n' +
          (v.recipient || '[Recipient]') + '\n' +
          (v.school || '[School / District]') + '\n\n' +
          'Re: Request for Special Education Evaluation — ' + (v.studentName || '[Student]') + '\n\n' +
          'Dear ' + ((v.recipient || '').split(',')[0] || '[Recipient]') + ',\n\n' +
          'I am writing to formally request a comprehensive special education evaluation for my child, ' + (v.studentName || '[Student]') + ' (DOB ' + (v.studentDOB || '[DOB]') + '), currently enrolled in ' + (v.gradeSchool || '[grade / school]') + '.\n\n' +
          'Our specific concerns are as follows: ' + (v.concerns || '[Describe specific concerns]') + '\n\n' +
          'We request evaluation in all areas of suspected need, which may include cognitive, academic, behavioral, adaptive, and any other areas the team identifies as relevant. We would like to be active participants in the evaluation planning and review processes. Please provide the procedural safeguards notice and any consent forms we need to sign.\n\n' +
          'I understand that under IDEA, the district has 60 days (or as specified by state law) from receipt of parental consent to complete the evaluation. Please confirm receipt of this request and share the proposed evaluation plan at your earliest convenience.\n\n' +
          'Thank you for your attention to this request. Please contact me if you need any additional information.\n\n' +
          'Sincerely,\n\n' +
          (v.senderName || '[Your name]') + '\n' +
          (v.senderContact || '[Contact information]');
      }
    },
    {
      id: 'requestMeeting',
      name: 'Request an IEP Team Meeting',
      whoWrites: 'Parent (or student 18+)',
      purpose: 'Request a meeting to discuss concerns, propose changes, or revisit services. The school must schedule one within a reasonable time (often 10 days).',
      fields: [
        { id: 'date', label: 'Date', placeholder: 'April 28, 2026' },
        { id: 'recipient', label: 'Recipient (case manager or director)', placeholder: 'Ms. Kelly Chen, Case Manager' },
        { id: 'studentName', label: 'Student name', placeholder: 'Alex Rivera' },
        { id: 'topics', label: 'Specific topics you want to address', placeholder: 'Review of current reading goals; concerns about implementation of extended-time accommodation; discussion of a possible schedule change.' },
        { id: 'attendees', label: 'People you want at the meeting', placeholder: 'Ms. Chen, Mr. Patel (principal), Ms. Jones (reading specialist), Alex, and both parents.' },
        { id: 'availability', label: 'Your availability', placeholder: 'Weekdays after 3pm or mornings before 8:30am work best.' },
        { id: 'senderName', label: 'Your name', placeholder: 'Pat Rivera' },
        { id: 'senderContact', label: 'Your contact', placeholder: 'pat.rivera@example.com' }
      ],
      generate: function(v) {
        return (v.date || '') + '\n\n' +
          (v.recipient || '[Recipient]') + '\n\n' +
          'Re: Request for IEP Team Meeting — ' + (v.studentName || '[Student]') + '\n\n' +
          'Dear ' + ((v.recipient || '').split(',')[0] || '[Recipient]') + ',\n\n' +
          'I am writing to request an IEP team meeting for ' + (v.studentName || '[Student]') + '. I would like the team to address the following:\n\n' +
          (v.topics || '[Topics to discuss]') + '\n\n' +
          'I would like the following people to attend if possible: ' + (v.attendees || '[Attendees]') + '\n\n' +
          'My availability is: ' + (v.availability || '[Your availability]') + '\n\n' +
          'Please propose a few meeting times that work for the team and let me know which specialists will be present. If you need any materials from me in advance, please let me know.\n\n' +
          'Thank you for coordinating this.\n\n' +
          'Sincerely,\n\n' +
          (v.senderName || '[Your name]') + '\n' +
          (v.senderContact || '[Contact]');
      }
    },
    {
      id: 'requestIEE',
      name: 'Request an Independent Educational Evaluation (IEE) at Public Expense',
      whoWrites: 'Parent (or student 18+)',
      purpose: 'When you disagree with the school\'s evaluation, request an independent one at public expense. The school must either agree to pay or file due process to defend their eval.',
      fields: [
        { id: 'date', label: 'Date', placeholder: 'April 28, 2026' },
        { id: 'recipient', label: 'Recipient (special ed director)', placeholder: 'Dr. Jane Smith, Director of Special Education' },
        { id: 'studentName', label: 'Student name', placeholder: 'Alex Rivera' },
        { id: 'districtEvalDate', label: 'Date of the district evaluation you disagree with', placeholder: 'March 10, 2026' },
        { id: 'disagreement', label: 'What specifically you disagree with', placeholder: 'The cognitive assessment did not include a measure of processing speed, and the behavioral findings did not include input from the home context.' },
        { id: 'areas', label: 'Areas for the IEE to cover', placeholder: 'Comprehensive cognitive assessment including processing speed; behavioral/social-emotional assessment with home input; phonological processing measure.' },
        { id: 'senderName', label: 'Your name', placeholder: 'Pat Rivera' },
        { id: 'senderContact', label: 'Your contact', placeholder: 'pat.rivera@example.com' }
      ],
      generate: function(v) {
        return (v.date || '') + '\n\n' +
          (v.recipient || '[Recipient]') + '\n\n' +
          'Re: Request for Independent Educational Evaluation — ' + (v.studentName || '[Student]') + '\n\n' +
          'Dear ' + ((v.recipient || '').split(',')[0] || '[Recipient]') + ',\n\n' +
          'I am writing to formally request an Independent Educational Evaluation (IEE) at public expense for my child, ' + (v.studentName || '[Student]') + '. I disagree with the district\'s evaluation completed on ' + (v.districtEvalDate || '[date]') + '.\n\n' +
          'Specifically, I disagree with the following: ' + (v.disagreement || '[Specific concerns]') + '\n\n' +
          'I am requesting that the IEE cover: ' + (v.areas || '[Areas requested]') + '\n\n' +
          'Under IDEA (34 CFR 300.502), the district must either agree to fund the IEE or file for a due process hearing to defend its evaluation. Please let me know which option the district is pursuing within a reasonable time. If the district will fund the IEE, please provide your list of qualified examiners and the agency criteria we need to meet.\n\n' +
          'Thank you for your prompt attention to this request.\n\n' +
          'Sincerely,\n\n' +
          (v.senderName || '[Your name]') + '\n' +
          (v.senderContact || '[Contact]');
      }
    },
    {
      id: 'followupAccom',
      name: 'Follow Up on Unimplemented Accommodation',
      whoWrites: 'Parent or student',
      purpose: 'When an accommodation or service in the IEP/504 isn\'t being delivered. Puts the issue in writing so there\'s a record.',
      fields: [
        { id: 'date', label: 'Date', placeholder: 'April 28, 2026' },
        { id: 'recipient', label: 'Recipient (case manager, teacher, or coordinator)', placeholder: 'Ms. Kelly Chen, Case Manager' },
        { id: 'studentName', label: 'Student name', placeholder: 'Alex Rivera' },
        { id: 'accommodation', label: 'The accommodation or service not being delivered', placeholder: 'Extended time (time and a half) on tests in general-ed classes.' },
        { id: 'examples', label: 'Specific examples of when this has been a problem', placeholder: 'March 15 math test: only 45 minutes given instead of 67. April 5 science test: teacher said there wasn\'t time. April 22 social studies test: same.' },
        { id: 'impact', label: 'Impact on the student', placeholder: 'Alex has been unable to complete tests, which is affecting grades. They came home in tears after the April 22 test saying they didn\'t know what to do.' },
        { id: 'request', label: 'What you\'re asking for', placeholder: 'I would like to discuss how we ensure this accommodation is consistently implemented across all of Alex\'s classes, and whether the April tests need to be re-administered.' },
        { id: 'senderName', label: 'Your name', placeholder: 'Pat Rivera' },
        { id: 'senderContact', label: 'Your contact', placeholder: 'pat.rivera@example.com' }
      ],
      generate: function(v) {
        return (v.date || '') + '\n\n' +
          (v.recipient || '[Recipient]') + '\n\n' +
          'Re: Implementation of Accommodations — ' + (v.studentName || '[Student]') + '\n\n' +
          'Dear ' + ((v.recipient || '').split(',')[0] || '[Recipient]') + ',\n\n' +
          'I am writing with concerns about the implementation of an accommodation in ' + (v.studentName || '[Student]') + '\'s IEP/504 plan.\n\n' +
          'Accommodation: ' + (v.accommodation || '[Accommodation]') + '\n\n' +
          'Specific examples of when this has not been implemented: ' + (v.examples || '[Examples]') + '\n\n' +
          'Impact: ' + (v.impact || '[Impact on student]') + '\n\n' +
          'What I\'m asking: ' + (v.request || '[Your request]') + '\n\n' +
          'I\'m raising this now so we can resolve it without it escalating. I appreciate your attention. Please let me know when we can discuss.\n\n' +
          'Sincerely,\n\n' +
          (v.senderName || '[Your name]') + '\n' +
          (v.senderContact || '[Contact]');
      }
    },
    {
      id: 'studentIntro',
      name: 'Student Introduction to a New Teacher',
      whoWrites: 'Student',
      purpose: 'A short, proactive introduction from student to teacher at the start of a semester or when starting with a new teacher.',
      fields: [
        { id: 'date', label: 'Date', placeholder: 'September 1, 2026' },
        { id: 'recipient', label: 'Teacher name', placeholder: 'Mr. Thompson' },
        { id: 'myName', label: 'Your first name (or what you go by)', placeholder: 'Alex' },
        { id: 'className', label: 'The class', placeholder: 'Period 3 Math' },
        { id: 'strengths', label: 'One or two things you want them to know you\'re good at', placeholder: 'I\'m a visual learner and I\'m good at seeing patterns.' },
        { id: 'helps', label: 'One or two things that help you', placeholder: 'Having an example before I try a new kind of problem, and being able to take a break if I\'m getting frustrated.' },
        { id: 'plan', label: 'Your accommodation plan (504 or IEP) and what it says', placeholder: 'I have a 504 with extended time, preferential seating (near the front), and break access.' },
        { id: 'question', label: 'An opening to continue the conversation', placeholder: 'Could we meet for 5 minutes in the first week to check in about how things are going?' }
      ],
      generate: function(v) {
        return 'Dear ' + (v.recipient || '[Teacher]') + ',\n\n' +
          'I\'m ' + (v.myName || '[Your name]') + ', and I\'m in your ' + (v.className || '[class]') + '. I wanted to introduce myself and share a few things that help me learn.\n\n' +
          'What I\'m good at: ' + (v.strengths || '[Strengths]') + '\n\n' +
          'What helps me: ' + (v.helps || '[What helps]') + '\n\n' +
          'About my accommodations: ' + (v.plan || '[Your 504/IEP]') + '\n\n' +
          (v.question || 'I\'m looking forward to being in your class this year.') + '\n\n' +
          'Thank you,\n' +
          (v.myName || '[Your name]');
      }
    },
    {
      id: 'thankYou',
      name: 'Thank-You After a Meeting (with agreement summary)',
      whoWrites: 'Parent or student',
      purpose: 'After a productive meeting, send a thank-you that also creates a record of what was agreed. Reduces confusion later.',
      fields: [
        { id: 'date', label: 'Date', placeholder: 'April 29, 2026' },
        { id: 'recipient', label: 'Recipient (case manager, team)', placeholder: 'Ms. Kelly Chen and the IEP team' },
        { id: 'studentName', label: 'Student name', placeholder: 'Alex Rivera' },
        { id: 'meetingDate', label: 'When the meeting was', placeholder: 'Tuesday April 27, 2026' },
        { id: 'agreed1', label: 'Agreement 1 (what and by whom)', placeholder: 'Ms. Chen will share the updated IEP draft by Friday May 2.' },
        { id: 'agreed2', label: 'Agreement 2', placeholder: 'Mr. Thompson will reintroduce the extended-time accommodation starting with the next unit test.' },
        { id: 'agreed3', label: 'Agreement 3 (optional)', placeholder: 'We will reconvene in 6 weeks to review progress.' },
        { id: 'questions', label: 'Any open questions', placeholder: 'I wasn\'t sure whether the reading services will start this semester or next. Could you confirm?' },
        { id: 'senderName', label: 'Your name', placeholder: 'Pat Rivera' },
        { id: 'senderContact', label: 'Your contact', placeholder: 'pat.rivera@example.com' }
      ],
      generate: function(v) {
        var ag = [v.agreed1, v.agreed2, v.agreed3].filter(function(x) { return x && x.trim(); });
        return (v.date || '') + '\n\n' +
          (v.recipient || '[Recipient]') + '\n\n' +
          'Re: Follow-up from ' + (v.studentName || '[Student]') + '\'s meeting on ' + (v.meetingDate || '[date]') + '\n\n' +
          'Dear ' + ((v.recipient || '').split(' and ')[0] || '[Recipient]') + ',\n\n' +
          'Thank you for the thoughtful meeting about ' + (v.studentName || '[Student]') + ' on ' + (v.meetingDate || '[date]') + '. I appreciated everyone\'s time and the collaborative tone.\n\n' +
          'To make sure we\'re on the same page, here\'s my summary of what we agreed:\n\n' +
          (ag.length ? ag.map(function(a, i) { return (i + 1) + '. ' + a; }).join('\n') : '[Agreements]') + '\n\n' +
          (v.questions ? 'A few open questions from my notes: ' + v.questions + '\n\n' : '') +
          'Please let me know if I\'ve misunderstood or omitted anything. I want to make sure our shared understanding is accurate.\n\n' +
          'Thank you again.\n\n' +
          'Sincerely,\n\n' +
          (v.senderName || '[Your name]') + '\n' +
          (v.senderContact || '[Contact]');
      }
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 11: RESOURCE LIBRARY
  // ═══════════════════════════════════════════════════════════════
  var RESOURCE_CATEGORIES = [
    {
      id: 'crisis',
      name: 'Crisis and immediate help',
      urgent: true,
      resources: [
        { name: '988 Suicide and Crisis Lifeline', detail: 'Call or text 988. Free, confidential, 24/7. For any emotional crisis, not just suicidal thoughts.' },
        { name: 'Crisis Text Line', detail: 'Text HOME to 741741. Free, 24/7, any crisis.' },
        { name: 'The Trevor Project', detail: 'For LGBTQ+ youth ages 13-24. Call 1-866-488-7386, text START to 678-678, or chat online. 24/7.' },
        { name: 'Childhelp National Child Abuse Hotline', detail: '1-800-422-4453 or 1-800-4-A-CHILD. For reporting abuse or getting help.' },
        { name: 'RAINN Sexual Assault Hotline', detail: '1-800-656-4673. For sexual assault survivors.' }
      ]
    },
    {
      id: 'national',
      name: 'National disability rights and advocacy',
      resources: [
        { name: 'COPAA — Council of Parent Attorneys and Advocates', url: 'copaa.org', detail: 'Directory of special education attorneys and advocates. Training and resources for parents.' },
        { name: 'Wrightslaw', url: 'wrightslaw.com', detail: 'Accessible legal resources on special education law. Frequently updated. "From Emotions to Advocacy" is a classic book.' },
        { name: 'National Disability Rights Network (NDRN)', url: 'ndrn.org', detail: 'Directory of state Protection and Advocacy (P&A) agencies. Every state has one, often a primary source of free legal support.' },
        { name: 'Autistic Self Advocacy Network (ASAN)', url: 'autisticadvocacy.org', detail: 'Autistic-led disability rights organization. Position statements, policy work, self-advocacy tools.' },
        { name: 'NAGC — National Association for Gifted Children', url: 'nagc.org', detail: 'Resources for twice-exceptional students and families. Position paper on 2E identification.' },
        { name: 'CHADD', url: 'chadd.org', detail: 'Children and Adults with ADHD. Parent resources, professional directory, advocacy.' },
        { name: 'International Dyslexia Association', url: 'dyslexiaida.org', detail: 'Research, practical resources, referral network for dyslexia.' },
        { name: 'Learning Disabilities Association of America', url: 'ldaamerica.org', detail: 'Advocacy, resources, state affiliates for all learning disabilities.' }
      ]
    },
    {
      id: 'federal',
      name: 'Federal agencies (file complaints here)',
      resources: [
        { name: 'U.S. Department of Education Office for Civil Rights (OCR)', url: 'ed.gov/ocr', detail: 'File complaints about disability discrimination (Section 504, ADA Title II), race (Title VI), or sex (Title IX) in schools. Must be filed within 180 days of the incident.' },
        { name: 'EEOC — Equal Employment Opportunity Commission', url: 'eeoc.gov', detail: 'For employment discrimination, including disability discrimination in hiring and at work. ADA enforcement.' },
        { name: 'Job Accommodation Network (JAN)', url: 'askjan.org', detail: 'Free federal resource. Helps employees and employers figure out workplace accommodations. Call or chat online. No charge, no login.' },
        { name: 'U.S. Department of Justice ADA Information Line', url: 'ada.gov', detail: '1-800-514-0301. Questions about ADA Title II (government services) and Title III (public accommodations).' }
      ]
    },
    {
      id: 'maine',
      name: 'Maine-specific (Aaron\'s state)',
      resources: [
        { name: 'Disability Rights Maine', url: 'drme.org', detail: 'Maine\'s Protection and Advocacy agency. Free legal support on disability rights. Handles education, employment, housing, and other civil rights issues.' },
        { name: 'Maine Parent Federation', url: 'mpf.org', detail: 'Parent Training and Information Center for Maine. Free support, training, and advocacy help for families of children with disabilities.' },
        { name: 'Maine Department of Education — Office of Special Services', url: 'maine.gov/doe/learning/specialed', detail: 'State-level special education office. File state complaints, access procedural safeguards, see Maine-specific guidance.' },
        { name: 'Maine CITE (Consumer Information Technology Education)', url: 'mainecite.org', detail: 'Assistive technology resources and lending library.' },
        { name: 'SUFU — Speaking Up For Us of Maine', url: 'sufumaine.org', detail: 'Maine self-advocacy organization led by adults with developmental disabilities.' },
        { name: 'Maine Office of Child and Family Services — Crisis lines', detail: 'Statewide children\'s crisis services available 24/7. Call 1-888-568-1112.' }
      ]
    },
    {
      id: 'selfadv',
      name: 'Self-advocacy skill-building',
      resources: [
        { name: 'I\'m Determined (University of Virginia)', url: 'imdetermined.org', detail: 'Free tools and templates for self-determination and self-advocacy, K-12. Includes "Good Day Plan" and "One-Pager" templates used in schools.' },
        { name: 'Think College', url: 'thinkcollege.net', detail: 'Resources for students with intellectual and developmental disabilities considering college. Program directory.' },
        { name: 'Going-to-College website', url: 'going-to-college.org', detail: 'Self-paced guide for high school students with disabilities preparing for college.' },
        { name: 'Youth M.O.V.E. National', url: 'youthmovenational.org', detail: 'Youth-led organization for mental health advocacy. Peer support and leadership development for young people.' }
      ]
    },
    {
      id: 'transition',
      name: 'College and workplace transition',
      resources: [
        { name: 'AHEAD — Association on Higher Education and Disability', url: 'ahead.org', detail: 'Professional org for college disability services. Useful for understanding what college accommodations should look like.' },
        { name: 'NCDE — National Center on Disability and Access to Education', url: 'ncdae.org', detail: 'Resources on digital accessibility and access in higher ed.' },
        { name: 'Workforce Recruitment Program (WRP)', url: 'wrp.gov', detail: 'Federal program connecting college students and recent graduates with disabilities to federal employers.' },
        { name: 'Social Security Administration — Work Incentives', url: 'ssa.gov/work', detail: 'If you receive SSI or SSDI, learn about programs that let you try working without losing benefits immediately (Ticket to Work, etc.).' }
      ]
    },
    {
      id: 'reading',
      name: 'Reading for students and families',
      resources: [
        { name: 'Wrightslaw: From Emotions to Advocacy (Wright & Wright)', detail: 'Accessible primer on special education law and how to use it as a parent.' },
        { name: 'Smart but Scattered (Dawson & Guare)', detail: 'Executive function skill-building for kids and teens.' },
        { name: 'Unbroken Brain (Maia Szalavitz)', detail: 'Accessible framing of addiction through a developmental, disability-adjacent lens. For older teens.' },
        { name: 'NeuroTribes (Steve Silberman)', detail: 'History of autism and the neurodiversity movement.' },
        { name: 'Disability Visibility (Alice Wong, editor)', detail: 'First-person essays by disabled writers. Great for understanding disability from the inside.' },
        { name: 'The Self-Advocacy Strategy (Van Reusen, Bos, Schumaker, Deshler)', detail: 'Research-based curriculum for teaching self-advocacy. Used in many schools.' }
      ]
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 12: RIGHTS QUICK-CHECK QUIZ
  // ═══════════════════════════════════════════════════════════════
  var QUIZ_QUESTIONS = [
    {
      q: 'If you have a disability that affects your learning, which federal law gives you the right to specialized instruction through an IEP?',
      options: ['ADA', 'IDEA', 'FERPA', 'Section 504'],
      correct: 1,
      why: 'IDEA (Individuals with Disabilities Education Act) is the federal law that provides specialized instruction + related services through an IEP. Section 504 provides accommodations only; ADA covers broader civil rights but not specialized instruction.'
    },
    {
      q: 'A 504 plan is different from an IEP in which way?',
      options: [
        'A 504 is only for high school students',
        'A 504 provides accommodations but not specialized instruction',
        'A 504 requires a medical diagnosis; an IEP doesn\'t',
        'A 504 covers only physical disabilities'
      ],
      correct: 1,
      why: '504 plans provide accommodations without specialized instruction. IEPs include specialized instruction plus accommodations. Both serve K-12, and both can cover mental or physical conditions. The big difference is the level of support.'
    },
    {
      q: 'What does LRE (Least Restrictive Environment) mean?',
      options: [
        'You have to be in general education classes at all times',
        'Schools should educate you with non-disabled peers to the maximum extent appropriate',
        'Your teachers can\'t remove you from a classroom for any reason',
        'You don\'t have to take hard classes if you have an IEP'
      ],
      correct: 1,
      why: 'LRE is a principle, not a rule about full inclusion. It asks schools to justify ANY removal from general ed. For some students, general ed is the right fit; for others with intensive needs, a more specialized setting might actually be less restrictive of their learning. The law asks: what\'s LEAST restrictive for THIS student?'
    },
    {
      q: 'Under FAPE, your school must provide:',
      options: [
        'The absolute best education they can',
        'Whatever you and your parents want',
        'An education that meets your individual needs at no cost to your family',
        'Private school placement if public school isn\'t working'
      ],
      correct: 2,
      why: 'FAPE (Free Appropriate Public Education) is meaningful progress based on your needs, at no cost. Courts have said "appropriate," not "best." Private placement is rare and requires specific evidence that public school cannot meet your needs.'
    },
    {
      q: 'If you disagree with your school\'s evaluation, you can:',
      options: [
        'Refuse to participate in the meeting',
        'Request an Independent Educational Evaluation (IEE) at public expense',
        'Ask your parent to pick a new school',
        'Nothing. The school\'s eval is final.'
      ],
      correct: 1,
      why: 'IEE requests are a major procedural safeguard. You (or your parent) can request an IEE at public expense. The school must either agree to pay or file due process to defend their eval.'
    },
    {
      q: 'When do educational rights transfer from your parents to you?',
      options: [
        'When you graduate',
        'When you turn 16',
        'When you turn 18 (age of majority in most states)',
        'Never. Your parents always have rights over your education.'
      ],
      correct: 2,
      why: 'At age 18 in most states, rights transfer. You become the official decision-maker for your education. Your parents can still be involved if you invite them, but YOU sign your IEP. The school must inform you in writing at least a year in advance.'
    },
    {
      q: 'FERPA gives you (or your parents if you\'re under 18) the right to:',
      options: [
        'Access your educational records',
        'Delete anything you don\'t like from your records',
        'See other students\' records if they\'re your friends',
        'Prevent teachers from talking to each other about your progress'
      ],
      correct: 0,
      why: 'FERPA gives you (or your parents) the right to review and request corrections to your own records. It doesn\'t let you delete accurate information or see other students\' records. Schools can still coordinate with authorized staff about your education.'
    },
    {
      q: 'Your school hasn\'t been implementing an accommodation in your IEP for three months. What\'s the right first step?',
      options: [
        'File an OCR complaint immediately',
        'Go to the news',
        'Talk with the person most directly involved (teacher, case manager) in writing',
        'Refuse to go to school until it\'s fixed'
      ],
      correct: 2,
      why: 'Most issues resolve at level 1 — a direct, written conversation with the person most proximal to the problem. Escalating immediately to formal complaints skips steps that usually work. OCR complaints are a real tool, but not a first tool.'
    },
    {
      q: 'In a job interview, if an employer asks if you have a disability:',
      options: [
        'You must answer truthfully',
        'You can decline to answer — ADA generally prohibits pre-offer disability questions',
        'You must provide medical documentation',
        'You can sue them right away'
      ],
      correct: 1,
      why: 'ADA generally prohibits pre-offer disability questions. You don\'t have to answer, and employers who ask are on shaky legal ground. Once you have a job offer, you can disclose and request accommodations through the interactive process.'
    },
    {
      q: 'Disclosing your disability to a teacher is:',
      options: [
        'Required if you have an IEP',
        'A choice you make about what to share — your 504/IEP gives them the legal info they need; you decide about more',
        'Something you should avoid at all costs',
        'Illegal without a doctor\'s note'
      ],
      correct: 1,
      why: 'Disclosure is your choice. Your IEP/504 plan already gives teachers the information they legally need about your accommodations. Beyond that, what you share about your diagnosis, history, or clinical details is up to you.'
    },
    {
      q: 'In college, who makes sure you get accommodations?',
      options: [
        'Your college does it automatically like high school',
        'Your parents register for you',
        'You register with Disability Services and request specific accommodations',
        'Your IEP follows you and applies automatically'
      ],
      correct: 2,
      why: 'College is self-identify-only. Nobody will reach out to you about accommodations. You contact Disability Services, submit documentation, and request specific accommodations. Your high school IEP does NOT automatically transfer.'
    },
    {
      q: 'If you feel unsafe at school because of bullying or discrimination:',
      options: [
        'You just have to cope',
        'You have the right to a safe learning environment, and the school must respond if notified',
        'You have to move to another school',
        'Only the police can help'
      ],
      correct: 1,
      why: 'You have legal rights to a safe learning environment. Multiple federal laws (Section 504, Title VI, Title IX, ADA) require schools to investigate and respond to harassment once they\'re notified. Telling a trusted adult activates the school\'s legal obligation.'
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 13: HELPING A FRIEND (peer advocacy)
  // ═══════════════════════════════════════════════════════════════
  var FRIEND_SCENARIOS = [
    {
      id: 'f1',
      title: 'A friend\'s accommodation isn\'t being followed',
      situation: 'Your friend tells you their teacher refused to give them extended time on a test, even though they have a 504 plan. They\'re upset and embarrassed. They\'re not sure what to do.',
      options: [
        { label: 'Tell them it\'s no big deal and they should just let it go.', rating: 'dismissive', coaching: 'Minimizing the problem doesn\'t help. Their accommodation was denied, and that matters. Listening without minimizing is step one.' },
        { label: 'Tell them they should confront the teacher right now with you backing them up.', rating: 'reactive', coaching: 'Good loyalty, but calls to confront the teacher in the moment can backfire and make things harder for your friend. Better: help them plan a calmer response.' },
        { label: 'Listen first, then remind them their plan is legally binding and suggest they talk to their case manager or counselor.', rating: 'supportive', coaching: 'This works. You validated the feeling, then connected them to the right resource. You didn\'t try to fix it for them; you helped them know their next step.' },
        { label: 'Tell them you\'ll go with them to the office and make a big deal about it.', rating: 'overfunctioning', coaching: 'Supportive intent but may overstep. Ask what they want from you, not what you think they need. Maybe they want support; maybe they want to handle it themselves.' }
      ]
    },
    {
      id: 'f2',
      title: 'A friend who\'s being teased about an accommodation',
      situation: 'Other kids have started making fun of your friend for taking tests in a separate room. Your friend is thinking about giving up the accommodation so the teasing will stop.',
      options: [
        { label: 'Tell them to just ignore it.', rating: 'dismissive', coaching: '"Just ignore it" erases what they\'re experiencing. The teasing is real and affecting their learning. Better to acknowledge the bind they\'re in.' },
        { label: 'Agree they should give up the accommodation so they fit in.', rating: 'wrong', coaching: 'This means they lose support they\'re entitled to because of bullies. The teasing is the problem, not the accommodation. Worth telling a trusted adult about the teasing.' },
        { label: 'Listen, validate how hard that is, and encourage them to tell a counselor about the teasing while keeping the accommodation.', rating: 'supportive', coaching: 'This addresses the real problem (teasing = a rights issue) rather than the surface problem (accommodation visibility). You helped them see the choice more clearly.' },
        { label: 'Offer to confront the kids who are teasing.', rating: 'reactive', coaching: 'Loyalty is great, but direct confrontation often escalates. Better: help your friend bring it to an adult who can respond systematically.' }
      ]
    },
    {
      id: 'f3',
      title: 'A friend who\'s struggling but hasn\'t asked for help',
      situation: 'You\'ve noticed your friend is falling behind in school and seems stressed. They haven\'t mentioned anything. You wonder if they might benefit from accommodations or support, but you don\'t want to overstep.',
      options: [
        { label: 'Ignore it. It\'s not your business.', rating: 'dismissive', coaching: 'Caring without acting might be the kind move, but sometimes a friend\'s observation is exactly what someone needs. The trick is gentle, not intrusive.' },
        { label: 'Tell them they definitely need an IEP.', rating: 'overfunctioning', coaching: 'You\'re diagnosing them. You don\'t know what they need. Offer information, not conclusions.' },
        { label: 'Share that you\'ve noticed they seem stressed and ask if they want to talk. Mention there are supports if ever useful.', rating: 'supportive', coaching: 'This is it. You noticed, you checked in, you opened a door without pushing them through it. Respects autonomy while showing care.' },
        { label: 'Tell the teacher you\'re worried about them.', rating: 'protective-but-risky', coaching: 'Sometimes the right move, especially for safety concerns. But for general stress, going to an adult without your friend\'s knowledge can damage trust. Ask first: "Would it help if I talked to someone with you?"' }
      ]
    },
    {
      id: 'f4',
      title: 'A friend who just left a hard IEP meeting',
      situation: 'Your friend just came out of an IEP meeting. They\'re upset. They say the school denied a request they cared about. They feel like nobody listened.',
      options: [
        { label: 'Tell them the adults know best and they should trust the process.', rating: 'dismissive', coaching: 'Adults aren\'t always right. The process sometimes fails students. Your friend\'s feelings are data.' },
        { label: 'Validate how hard that is, then ask: "What did they say? What happens next?"', rating: 'supportive', coaching: 'You made space for feelings AND asked questions that help your friend process. They can decide if they want to appeal, request another meeting, or let it sit. You didn\'t decide for them.' },
        { label: 'Tell them they should file a complaint immediately.', rating: 'reactive', coaching: 'Maybe eventually. Not in the first five minutes after a hard meeting. They need to process first. Leaping to formal complaints can feel like pressure on top of pressure.' },
        { label: 'Change the subject to cheer them up.', rating: 'avoidant', coaching: 'Understandable instinct, but it teaches your friend that their hard stuff isn\'t okay to share. Sit with them in it for a minute before moving on.' }
      ]
    },
    {
      id: 'f5',
      title: 'A friend who\'s worried about disclosing to a new partner',
      situation: 'Your friend has a chronic health condition. They\'re dating someone new and don\'t know whether or when to tell them. They ask your advice.',
      options: [
        { label: 'Tell them they have to disclose right away.', rating: 'prescriptive', coaching: 'Nobody has to disclose anything on a schedule. That\'s their call. Your advice shouldn\'t pressure them.' },
        { label: 'Tell them they should never disclose.', rating: 'prescriptive', coaching: 'Also not your call. For many relationships, disclosure at some point serves both people. They should weigh it for themselves.' },
        { label: 'Ask them what THEY want — what would feel right, what they\'re hoping will happen, what they\'re afraid of.', rating: 'supportive', coaching: 'You reflected the question back to them. Self-advocacy is about their agency, not yours. They\'ll reach a decision that\'s theirs, not borrowed from you.' },
        { label: 'Share a story from another friend who disclosed and it went well.', rating: 'somewhat-helpful', coaching: 'Stories help normalize. But be careful: every relationship is different. Share the story, then return to THEIR specific situation.' }
      ]
    },
    {
      id: 'f6',
      title: 'A friend who\'s afraid to go to a meeting',
      situation: 'Your friend has an important meeting next week — maybe an IEP meeting, maybe a disciplinary hearing. They\'re terrified and telling you they might just not show up.',
      options: [
        { label: 'Tell them they\'ll be fine and not to worry.', rating: 'dismissive', coaching: 'Dismissing the fear makes them feel unseen. The fear is real. Name it.' },
        { label: 'Tell them if they don\'t go, it shows they don\'t care.', rating: 'shaming', coaching: 'Shaming a scared person makes them MORE likely to avoid. And not going isn\'t always about caring — it\'s often about being overwhelmed.' },
        { label: 'Acknowledge the fear, ask what specifically is scary, and help them prepare or find an adult to help them prepare.', rating: 'supportive', coaching: 'You took the fear seriously, broke it into specific pieces, and pointed them toward prep help (like the Meeting Prep Worksheet). Fear often shrinks with preparation.' },
        { label: 'Offer to go with them.', rating: 'generous-but-limited', coaching: 'Kind, and sometimes welcome. But often students have to go to their own meetings. Better: help them think about who CAN go with them (a parent, advocate, counselor).' }
      ]
    }
  ];

  var FRIEND_PRINCIPLES = [
    { principle: 'Listen first', body: 'Before giving advice, acknowledge what they\'re feeling. "That sounds hard." Validation reduces defensiveness and builds trust.' },
    { principle: 'Don\'t diagnose', body: 'You\'re not the doctor, lawyer, or counselor. Don\'t tell your friend they "definitely have ADHD" or "should get a lawyer." Share information, not conclusions.' },
    { principle: 'Respect their autonomy', body: 'They\'re the one living this. They get to decide what to do. Your job is to help them see options, not to decide for them.' },
    { principle: 'Ask before acting', body: 'Before going to an adult on their behalf, ask: "Would it help if I talked to someone? Or would you rather I just listen?" Taking action without permission, even when well-intended, can damage trust.' },
    { principle: 'Connect them to resources', body: 'You don\'t need all the answers. Pointing to a counselor, advocate, a website, or a specific tool is often the best thing you can do.' },
    { principle: 'Know your limits', body: 'If a friend shares something that suggests they\'re unsafe (self-harm, abuse, crisis), that\'s beyond peer support. Tell a trusted adult, even if your friend asks you not to. Keeping them alive beats keeping a promise of silence.' },
    { principle: 'Hold the long view', body: 'Self-advocacy is a lifelong skill. If your friend stumbles today, they\'ll get another chance. Your consistent, non-judgmental presence matters more than any single piece of advice.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 14: MY ADVOCACY JOURNEY (milestones + journal)
  // ═══════════════════════════════════════════════════════════════
  // Developmental milestones across 5 stages plus journal entries for
  // logging real attempts. Gives the tool a personal, longitudinal space.

  var JOURNEY_STAGES = [
    {
      stage: 'Knowing myself',
      color: 'violet',
      milestones: [
        { id: 's1', text: 'I can name something I\'m good at in school.' },
        { id: 's2', text: 'I can name something that\'s hard for me in school.' },
        { id: 's3', text: 'I know whether I have an IEP, a 504, or neither (and what each is).' },
        { id: 's4', text: 'I can describe what helps me learn best.' },
        { id: 's5', text: 'I can describe one thing in the classroom that gets in my way.' }
      ]
    },
    {
      stage: 'Speaking up in the moment',
      color: 'sky',
      milestones: [
        { id: 'a1', text: 'I\'ve asked a teacher for help with something I didn\'t understand.' },
        { id: 'a2', text: 'I\'ve asked for a break or accommodation at least once.' },
        { id: 'a3', text: 'I can name the specific accommodations in my plan (if I have one).' },
        { id: 'a4', text: 'I\'ve explained what I need to a teacher who didn\'t know me well.' }
      ]
    },
    {
      stage: 'Preparing and planning',
      color: 'emerald',
      milestones: [
        { id: 'p1', text: 'I\'ve filled out a Learning Profile or similar introduction.' },
        { id: 'p2', text: 'I\'ve attended an IEP or 504 meeting.' },
        { id: 'p3', text: 'I\'ve prepared for a meeting before going in (notes, questions, goals).' },
        { id: 'p4', text: 'I\'ve written a formal request (email or letter) for something I needed.' }
      ]
    },
    {
      stage: 'Leading and owning',
      color: 'amber',
      milestones: [
        { id: 'l1', text: 'I\'ve spoken up in my own IEP or 504 meeting about something I wanted changed.' },
        { id: 'l2', text: 'I\'ve led part of an IEP or 504 meeting (introduction, goal update, or priorities).' },
        { id: 'l3', text: 'I\'ve followed up when an accommodation or service didn\'t happen.' },
        { id: 'l4', text: 'I\'ve used the escalation path beyond the first level of talking directly with the teacher.' }
      ]
    },
    {
      stage: 'Extending outward',
      color: 'rose',
      milestones: [
        { id: 'e1', text: 'I\'ve explained one of my rights to someone else (a peer or sibling).' },
        { id: 'e2', text: 'I\'ve helped a friend advocate for themselves.' },
        { id: 'e3', text: 'I\'ve thought about what I want after high school and how my disability/needs fit into that.' },
        { id: 'e4', text: 'I\'ve signed my own IEP (18+) or signed a supported decision-making agreement.' }
      ]
    }
  ];

  var JOURNAL_PROMPT_TEMPLATES = [
    { id: 'celebrate', label: '\u2728 Celebrate something', fields: [
      { id: 'what', label: 'What I did', placeholder: 'I asked Ms. Rivera if I could take the math quiz in the library tomorrow instead of during class.' },
      { id: 'how', label: 'How it went', placeholder: 'She said yes right away. I thanked her and told her I\'d be there after homeroom.' },
      { id: 'feel', label: 'How I feel about it', placeholder: 'Proud. It was scary but easier than I expected.' }
    ]},
    { id: 'learn', label: '\uD83E\uDDF5 Something I learned', fields: [
      { id: 'what', label: 'What happened', placeholder: 'I tried to ask the sub about my extended time accommodation and they didn\'t know about my plan. It got awkward.' },
      { id: 'how', label: 'What I did', placeholder: 'I ended up just doing my best in the regular time. I felt frustrated and didn\'t do my best work.' },
      { id: 'feel', label: 'What I\'ll try next time', placeholder: 'Next time with a sub, I\'ll have my accommodation card in my backpack and show it instead of just saying it.' }
    ]},
    { id: 'plan', label: '\uD83D\uDCDD Planning for something coming up', fields: [
      { id: 'what', label: 'What\'s coming up', placeholder: 'IEP meeting next week.' },
      { id: 'how', label: 'What I want to do', placeholder: 'I want to say I don\'t want to be pulled out of science anymore.' },
      { id: 'feel', label: 'What I\'m worried about', placeholder: 'My mom might disagree. Ms. Chen might say my grades don\'t support it.' }
    ]}
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 15: ACCOMMODATION CARD (wallet-sized printable)
  // ═══════════════════════════════════════════════════════════════
  // Pocket reference listing a student's key accommodations. They keep it
  // in their wallet or backpack and pull it out when a sub teacher,
  // testing coordinator, or other adult doesn't know about their plan.

  var CARD_USE_TIPS = [
    { title: 'When to use it', body: 'Subs who don\'t know your plan. Testing situations where the accommodation person forgot. A teacher insisting their "class policy" overrides your plan. Anyone who asks "what accommodations do you have?" and you want to show them instead of explaining from memory.' },
    { title: 'How to use it', body: 'Print, trim to size, and keep it in your wallet, phone case, or the front of your binder. When needed, hand it to the adult. Let them read it silently. You don\'t have to explain or apologize.' },
    { title: 'What it is not', body: 'Not a substitute for your full IEP or 504 document. Schools can ask for the full plan if they need proof. The card is a quick-reference. It\'s also not a free pass — it\'s a reminder of what you\'re entitled to.' },
    { title: 'Keep it updated', body: 'If your plan changes, reprint the card. Old accommodations listed on a current card can cause confusion.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 16: IDENTITY & LANGUAGE
  // ═══════════════════════════════════════════════════════════════
  // Disability identity, neurodiversity, language choices, intersectionality.
  // Content shaped by disability community / autistic self-advocacy perspectives.

  var DISABILITY_MODELS = [
    {
      name: 'Medical model',
      frame: 'Disability is a problem inside an individual that needs to be fixed, treated, or cured.',
      example: '"Alex has dyslexia. We need to remediate the deficits."',
      strengths: 'Sometimes accurate (chronic medical conditions exist; treatments help). Underwrites medical research and care.',
      limits: 'Locates the problem in the person, not in environments that fail them. Centers cure as the goal even when no cure exists or is wanted. Ignores how social structures shape what counts as disability.'
    },
    {
      name: 'Social model',
      frame: 'Disability is created by environments and societies that aren\'t built for the full range of bodies and minds. Impairment is real; disability is how society responds to it.',
      example: '"Alex has dyslexia (the impairment). The disability is that the school taught reading in only one way."',
      strengths: 'Shifts focus from "what\'s wrong with you" to "what\'s wrong with the environment." Drives accessibility, accommodation, and design improvements. Empowering for many disabled people.',
      limits: 'Critics point out that some impairments cause genuine difficulty regardless of environment (chronic pain, severe cognitive impairment). Pure social-model framing can minimize real medical needs.'
    },
    {
      name: 'Neurodiversity paradigm',
      frame: 'The full range of neurological and cognitive variation in human beings is natural diversity, not a set of disorders. ADHD, autism, dyslexia, Tourette\'s, and others are different ways of being, not deficits.',
      example: '"Alex\'s brain processes language differently. Some of those differences are challenges in some contexts; some are strengths in others."',
      strengths: 'Centers self-determination and dignity. Originated in autistic self-advocacy; explicit ethic of "nothing about us without us." Aligns with research showing many neurodivergent traits exist on continua throughout the population.',
      limits: 'Doesn\'t mean accommodations and supports aren\'t needed — many neurodivergent people need substantial support. Doesn\'t replace medical care for co-occurring physical or mental health conditions.'
    },
    {
      name: 'Disability justice framework',
      frame: 'Disability is an aspect of identity that intersects with race, class, gender, sexuality, and other identities. Liberation requires solidarity across difference. Movement-based, not just rights-based.',
      example: 'Disability justice asks: "Whose experience of disability gets centered? Black disabled women? Indigenous disabled people? Or the most resourced disabled people whose accommodations get noticed first?"',
      strengths: 'Explicitly intersectional. Rooted in collective liberation. Originated in Sins Invalid and other disabled queer and trans BIPOC organizing. Sees disability rights as connected to anti-racist and anti-capitalist movements.',
      limits: 'Newer and less institutionally absorbed. Sometimes feels conceptually distant from individual school/clinical decisions. Best understood as a frame and a movement, not a single set of policies.'
    }
  ];

  var LANGUAGE_GUIDE = [
    {
      term: 'Person-first language',
      example: '"person with autism," "student with a learning disability"',
      preferredBy: 'Many disability rights movements and organizations historically. Many parents of disabled children. Some specific communities (intellectual disability advocacy, for example).',
      rationale: 'Asserts that the person comes before the disability. Pushes back against being defined solely by impairment.'
    },
    {
      term: 'Identity-first language',
      example: '"autistic person," "disabled student," "Deaf person"',
      preferredBy: 'Most autistic self-advocates. Most Deaf community members. Many disability scholars and activists. Increasingly common among disabled adults.',
      rationale: 'Frames disability as a meaningful part of identity, not separate from the person. Resists the implication that disability is shameful and must be linguistically distanced. Parallels other identity claims like "Black person" rather than "person with Blackness."'
    },
    {
      term: 'Mixed / context-dependent',
      example: 'Asking which the person prefers; using both in writing.',
      preferredBy: 'Many individual disabled people. Many style guides now recommend asking.',
      rationale: 'Different communities, generations, and individuals have different preferences. Asking respects autonomy. There\'s no single right answer for everyone.'
    },
    {
      term: 'Avoid',
      example: '"Special needs," "differently abled," "handi-capable," "wheelchair-bound"',
      preferredBy: 'These are mostly preferred BY non-disabled people, often as ways to soften disability. Most disabled adults find them euphemistic, infantilizing, or inaccurate.',
      rationale: '"Special needs" mostly applies to children and erases adult disability. "Differently abled" implies disability is shameful and needs softening. "Wheelchair-bound" is factually wrong (people use wheelchairs to access mobility, they\'re not bound to them).'
    }
  ];

  var INTERSECTION_EXAMPLES = [
    { lens: 'Race + disability', body: 'Black disabled students experience compounded barriers: under-identification for gifted, over-identification for behavior, more frequent discipline, less access to specialized services. Disabled students of color\'s experiences cannot be fully understood through race-only or disability-only frameworks.' },
    { lens: 'Gender + disability', body: 'Girls with autism, ADHD, and other neurodivergence are systematically under-diagnosed because diagnostic criteria were built on male presentations. Women with disabilities face higher rates of intimate partner violence and lower employment.' },
    { lens: 'LGBTQ+ + disability', body: 'LGBTQ+ disabled people exist in significant numbers. Each identity can amplify isolation if either community doesn\'t make space for the other. Self-advocacy in LGBTQ+ disabled lives often requires navigating multiple systems that weren\'t built with you in mind.' },
    { lens: 'Class + disability', body: 'Access to evaluations, private therapy, college disability services, and assistive technology is shaped by income. Two students with the same diagnosis may have very different experiences depending on their family\'s resources.' },
    { lens: 'Immigration status + disability', body: 'Mixed-status families face additional barriers in accessing services and exercising rights. Documentation requirements can be exclusionary. Cultural framings of disability differ across communities.' },
    { lens: 'Religion + disability', body: 'Different religious traditions frame disability differently. Some emphasize community care; some carry historical baggage about disability as moral failing or punishment. Self-advocacy may include navigating family or community frameworks that conflict with your own.' }
  ];

  var IDENTITY_REFLECTIONS = [
    'When did you first realize you had a disability or learning difference? What did that feel like?',
    'Who in your life has shaped how you think about your disability? In good ways or hard ways?',
    'Is there language you wish people used about you? Language you wish they wouldn\'t?',
    'Have you ever met or read about an adult who shares your disability? What did seeing them mean to you?',
    'What\'s one thing about your disability you wouldn\'t change, even if you could?',
    'What\'s one thing about how the world treats your disability that you wish were different?',
    'How do your other identities (race, gender, family, faith, language) shape your experience of disability?'
  ];

  var FINDING_COMMUNITY = [
    { topic: 'Online disability community', body: 'Twitter/X (#ActuallyAutistic, #DisabilityTwitter), Tumblr disability blogs, Reddit communities (r/Autism, r/ADHD, etc.), YouTube creators, podcasts (Disability After Dark, The Accessible Stall, etc.). Pros: low barrier, find people fast. Cons: variable quality, can be parasocial.' },
    { topic: 'In-person community', body: 'Local disability advocacy organizations (state P&A, Disability Rights Maine, etc.). College disability services run social and advocacy programs. Self-advocacy groups (SUFU in Maine for adults with developmental disabilities). Conferences and meetups (Disability Pride events, autism community gatherings).' },
    { topic: 'Disabled creators and authors', body: 'Writers like Alice Wong, Imani Barbarin, Devon Price, Eric Garcia, Haben Girma, Judy Heumann. Films and shows by disabled creators. Reading and watching disabled voices changes how you understand your own experience.' },
    { topic: 'When community is hard to find', body: 'Some disabilities are more visible in community spaces than others. Rural areas have fewer in-person options. Family beliefs may not align. Building community can take years and require patience. Online community helped many disabled people find themselves before in-person community was available; that path is real.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 17: QUICK GLOSSARY
  // ═══════════════════════════════════════════════════════════════
  // Plain-language definitions of terms used throughout the tool.
  // Tailored to the student audience. Filter as you type.

  var GLOSSARY = [
    { term: '504 Plan', def: 'A plan with accommodations under Section 504. Broader eligibility than an IEP, but doesn\'t include specialized instruction. Examples: extended time, breaks, preferential seating.' },
    { term: 'Accommodation', def: 'A change in HOW you learn or are tested that levels the playing field without changing what\'s being measured. Different from a modification, which changes what you\'re expected to do.' },
    { term: 'Adaptive functioning', def: 'How well you do age-expected daily tasks: communication, self-care, socializing, getting around. Measured by tools like Vineland-3 or ABAS-3, mostly relevant for Intellectual Disability eligibility.' },
    { term: 'ADA', def: 'Americans with Disabilities Act. Federal civil rights law that protects you from disability discrimination in employment, public services, and most businesses. Follows you into adulthood (unlike IDEA, which ends).' },
    { term: 'Age of Majority', def: 'The legal age of adulthood, 18 in most states. When educational rights transfer from your parents to you. The school must give you 1 year\'s notice before this happens.' },
    { term: 'Annual review', def: 'A meeting held at least once per year for every student with an IEP. The team reviews progress on goals, decides on services for the next year, and updates the plan.' },
    { term: 'Case manager', def: 'The school staff member (often a special ed teacher) who coordinates your IEP. They\'re the person to contact when you have questions or concerns about your plan.' },
    { term: 'Disclosure', def: 'Telling someone about your disability, beyond what they need to know to grant accommodations. Always your choice; never required.' },
    { term: 'Due Process', def: 'A formal legal proceeding to resolve disagreements between you and your school about special education. State-level. Can be appealed to court. Usually involves attorneys.' },
    { term: 'FAPE', def: 'Free Appropriate Public Education. Your right to an education that meets your individual needs, at no cost to your family. "Appropriate" means meeting your needs, not necessarily the absolute best.' },
    { term: 'FBA', def: 'Functional Behavior Assessment. A process to figure out WHY a problem behavior happens (attention? escape? sensory? access to something?), so a Behavior Intervention Plan can address the same function.' },
    { term: 'FERPA', def: 'Family Educational Rights and Privacy Act. Federal law that gives you (or your parents) the right to see and request corrections to your educational records.' },
    { term: 'IDEA', def: 'Individuals with Disabilities Education Act. Federal law that gives you the right to special education and related services if you qualify under one of 13 disability categories.' },
    { term: 'IEE', def: 'Independent Educational Evaluation. If you disagree with the school\'s evaluation, you can request an evaluation by an outside expert, often at the school\'s expense.' },
    { term: 'IEP', def: 'Individualized Education Program. A legally binding document that describes specialized instruction, services, accommodations, and goals for a student with a disability.' },
    { term: 'Interactive process', def: 'The back-and-forth conversation between an employer and an employee about accommodations under ADA. The employer doesn\'t just say yes or no; they work with you to figure out what will work.' },
    { term: 'LRE', def: 'Least Restrictive Environment. The principle that you should be educated with non-disabled peers as much as appropriate. Removal from general ed has to be justified.' },
    { term: 'Mediation', def: 'A way to resolve special education disputes with help from a neutral mediator. Voluntary for both sides. Less formal than due process. Agreements are legally binding.' },
    { term: 'Modification', def: 'A change in WHAT is expected of you, not just how. Different from an accommodation. Modifications can affect grades, credits, and college admissions, so they\'re a bigger deal.' },
    { term: 'OCR', def: 'Office for Civil Rights at the U.S. Department of Education. Where you file complaints about disability discrimination, race, or sex discrimination at school.' },
    { term: 'OHI', def: 'Other Health Impairment. The IDEA eligibility category that often covers ADHD, chronic illnesses, and conditions affecting alertness or attention.' },
    { term: 'Para / Paraprofessional', def: 'A school staff member who provides direct support to students, often working alongside teachers in classrooms or one-on-one with specific students.' },
    { term: 'PLOP / PLAFP', def: 'Present Levels of Performance / Present Levels of Academic and Functional Performance. The section of an IEP that describes where you are right now in academic skills, behavior, social-emotional functioning, and motor skills.' },
    { term: 'Procedural safeguards', def: 'Your legal rights and protections under IDEA when you and the school disagree about your services. Includes Prior Written Notice, IEE rights, mediation, due process.' },
    { term: 'PWN', def: 'Prior Written Notice. Required document the school must give you before they propose or refuse changes to your IEP, evaluation, placement, or services. Creates a paper trail.' },
    { term: 'Related services', def: 'Things like speech therapy, occupational therapy, physical therapy, counseling, or transportation that help you benefit from special education. Listed in your IEP.' },
    { term: 'RTI / MTSS', def: 'Response to Intervention / Multi-Tiered System of Supports. The pre-referral system schools use to provide academic and behavioral support before considering special ed evaluation.' },
    { term: 'Self-determination', def: 'Acting as the primary causal agent in your own life, free from undue external influence. The umbrella concept that includes self-advocacy, choice-making, problem-solving, and self-awareness.' },
    { term: 'Service hours', def: 'How many minutes per day or week you receive a particular service (e.g., 30 min/day of reading intervention). Listed in your IEP.' },
    { term: 'SLD', def: 'Specific Learning Disability. The IDEA eligibility category that covers conditions like dyslexia, dysgraphia, and dyscalculia. The most common IEP eligibility category.' },
    { term: 'SOP', def: 'Summary of Performance. A document the school provides when you graduate or age out, summarizing your achievements and recommendations for postsecondary supports. Required by IDEA.' },
    { term: 'Stay-put', def: 'During a due process complaint, the student stays in their current placement until the dispute is resolved. Prevents schools from making unilateral changes mid-dispute.' },
    { term: 'Transition services', def: 'A coordinated set of activities to help you reach your postsecondary goals. Required in IEPs by age 16 (earlier in some states).' },
    { term: 'Vocational Rehabilitation (VR)', def: 'A state agency that helps qualifying adults with disabilities access training, education, and employment supports. You can apply during high school for help with the transition.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 18: ACTION PLAN BUILDER (one focused goal at a time)
  // ═══════════════════════════════════════════════════════════════
  var ACTION_PROMPTS = {
    goal: 'What\'s the ONE thing you want to advocate for right now?',
    goalPlaceholder: 'e.g., "Get extended time consistently in all my classes" or "Have my IEP changed so I\'m not pulled out during art."',
    why: 'Why does this matter to you?',
    whyPlaceholder: 'What would change for you if this happened? Connect it to your real life.',
    step1: 'First step (do in the next 2 days)',
    step1Placeholder: 'Small. Concrete. e.g., "Write down each time I don\'t get extended time this week."',
    step2: 'Second step (this week)',
    step2Placeholder: 'e.g., "Email Ms. Chen with the specific examples I collected."',
    step3: 'Third step (within 2 weeks)',
    step3Placeholder: 'e.g., "Request a team meeting if needed."',
    obstacle: 'What might get in the way?',
    obstaclePlaceholder: 'Be honest. e.g., "I\'ll feel embarrassed asking. The teacher might be defensive."',
    support: 'Who can help you?',
    supportPlaceholder: 'e.g., "My mom can help me draft the email. Mr. Patel said I can come to him if it doesn\'t work."',
    checkin: 'Check-in date',
    checkinPlaceholder: 'e.g., "Friday next week"',
    success: 'How will you know it\'s working?',
    successPlaceholder: 'A concrete sign. e.g., "Three weeks in a row of getting full extended time on tests."'
  };

  // ═══════════════════════════════════════════════════════════════
  // MODULE 19: STEADY YOURSELF (emotional regulation around advocacy)
  // ═══════════════════════════════════════════════════════════════
  // The work of self-advocacy is partly emotional. Anxiety before a
  // meeting, freezing mid-conversation, replaying a hard moment, doubting
  // your own perception when adults dismiss you. This module names that
  // work and offers concrete tools.

  var BEFORE_TOOLS = [
    {
      name: 'Box breathing (4-4-4-4)',
      time: '1-3 minutes',
      how: 'Breathe IN for 4 counts. HOLD for 4. Breathe OUT for 4. HOLD for 4. Repeat for at least four cycles. Used by Navy SEALs, ER doctors, and middle schoolers about to walk into hard meetings.',
      whenItHelps: 'Heart racing. Mind going too fast. About 10 minutes before a meeting starts. In the bathroom right beforehand.'
    },
    {
      name: '5-4-3-2-1 grounding',
      time: '2-3 minutes',
      how: 'Look around. Name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell (or two smells you remember), 1 thing you can taste. Bring yourself into the room.',
      whenItHelps: 'You\'re spiraling about what could go wrong. Your thoughts are racing ahead. You feel disconnected from where you actually are right now.'
    },
    {
      name: 'Body scan (head to toes)',
      time: '3-5 minutes',
      how: 'Slowly scan your body from the top of your head to your toes. Notice where there\'s tension. Don\'t try to change it; just notice. Sometimes the noticing itself releases some of the tightness.',
      whenItHelps: 'You\'re carrying anxiety as physical tension (jaw, shoulders, stomach). Useful before meetings where you\'ll be sitting still.'
    },
    {
      name: 'Name the worry, name the truth',
      time: '2 minutes',
      how: 'Write down: "I\'m worried that..." (worst-case fear). Then write: "What\'s actually true is..." (realistic view). Worries shrink when written. The realistic view often sounds calmer than the spiral.',
      whenItHelps: 'You\'re catastrophizing. You\'re imagining the worst scenarios. Putting words on paper externalizes them.'
    },
    {
      name: 'Pre-rehearse one specific thing',
      time: '5-10 minutes',
      how: 'Pick one specific thing you plan to say. Practice saying it out loud. Keep practicing until it feels less weird in your mouth.',
      whenItHelps: 'You\'re anxious you won\'t know what to say. Practicing one anchor sentence gives you a starting point. The first sentence is the hardest; once you start, the rest comes.'
    }
  ];

  var DURING_TOOLS = [
    {
      name: 'Slow your speaking rate',
      how: 'When anxiety spikes, we talk faster, which spikes anxiety more. Consciously slow down by half. Use shorter sentences. Pause between thoughts.',
      cue: 'Your heart is racing. You\'re tripping over words. People are leaning forward to hear you.'
    },
    {
      name: 'Take a sip of water',
      how: 'Bring water to a meeting. When you feel rushed or panicked, take a sip. It\'s a 5-second pause that nobody questions.',
      cue: 'You feel like you have to keep talking but you don\'t know what to say next.'
    },
    {
      name: 'Ask for a moment',
      how: '"Can I have a minute to think about that?" or "I want to make sure I answer carefully. Give me a sec." Adults respect this far more than rushed answers.',
      cue: 'A question caught you off guard. You feel pressure to answer immediately. You don\'t actually know your answer yet.'
    },
    {
      name: 'Look at one supportive person',
      how: 'If a supportive person is in the room (parent, advocate, advisor), make eye contact briefly. Their face reminds you you\'re not alone.',
      cue: 'You\'re feeling outnumbered or attacked. You\'re losing your sense of footing.'
    },
    {
      name: 'Ground through your feet',
      how: 'Plant both feet flat on the floor. Press down slightly. Feel the floor pushing back. You\'re here, in this room, in this body.',
      cue: 'You\'re dissociating. You feel like you\'re watching from outside yourself. You can\'t feel your hands.'
    },
    {
      name: 'Name the request again',
      how: 'If a conversation has drifted, gently bring it back: "Going back to what I\'m asking for, which is..." Restating clarifies AND gives you a moment to breathe.',
      cue: 'The conversation is going in circles. You\'re losing track of what you came to say.'
    },
    {
      name: 'Pause and step out if needed',
      how: 'You\'re allowed to ask for a break. "Can we pause for a few minutes?" Walk to the bathroom. Breathe. Come back. Even adults do this.',
      cue: 'You\'re close to crying when you don\'t want to. You\'re close to saying something you\'ll regret. Your body is too dysregulated to think.'
    }
  ];

  var AFTER_TOOLS = [
    {
      name: 'Move first, think second',
      how: 'After a hard meeting, your body needs to discharge. Walk. Run a few stairs. Shake out your arms. Cry if you need to. Don\'t expect to think clearly until your body has come down.',
      whenItHelps: 'Right after a hard meeting. Your nervous system is still firing. Trying to "process" before you discharge often just spins.'
    },
    {
      name: 'Talk it through with a safe person',
      how: 'Tell someone what happened. Parent, friend, advisor, sibling, therapist. Out loud, not just in your head. They don\'t need to fix it; they need to listen.',
      whenItHelps: 'You\'re replaying. You\'re second-guessing. You\'re unsure if your reaction was reasonable. Someone else\'s perspective is calibrating.'
    },
    {
      name: 'Write it down',
      how: 'Use the Journey journal. What happened? How did you handle it? What worked? What would you do differently? This becomes part of your record AND processes the emotion.',
      whenItHelps: 'You don\'t have a person to talk to right now. Or you want a record. Or talking it through hasn\'t fully landed it.'
    },
    {
      name: 'Self-compassion check',
      how: 'Ask yourself: "If a friend went through this, what would I say to them?" Now say that to yourself. We\'re harsher with ourselves than we\'d ever be with someone else.',
      whenItHelps: 'You\'re beating yourself up. You\'re ashamed of how you handled something. You think you should have done better.'
    },
    {
      name: 'Sleep on it before deciding next steps',
      how: 'Don\'t fire off the response email or schedule the next confrontation tonight. Tomorrow\'s decisions are usually wiser than tonight\'s. Tomorrow always comes.',
      whenItHelps: 'You\'re tempted to react in anger or panic. Slowing down isn\'t weakness; it\'s strategy.'
    },
    {
      name: 'Note one thing you handled well',
      how: 'Even a "bad" meeting probably had moments you handled okay. Find one. Write it down. Build a record of competence over time.',
      whenItHelps: 'You\'re only seeing what went wrong. Cognitively expanding to include what worked is part of growing.'
    }
  ];

  var TRUSTING_YOURSELF = [
    {
      situation: 'An adult tells you something didn\'t happen the way you remember',
      truth: 'You can hold what you remember without needing to convince anyone. Your perception is data. Other people\'s perceptions are also data. Different people can witness different parts of the same event.',
      ifPushed: 'You don\'t have to argue. "I hear you. I experienced it differently. We may need to find a way to move forward without agreeing on the details."'
    },
    {
      situation: 'You\'re told you\'re "being too sensitive" or "blowing this out of proportion"',
      truth: 'That phrase is often used to dismiss a valid reaction. Your reaction is information about how something landed for you. Adults sometimes tell young people to feel less because the adult is uncomfortable, not because the feeling is wrong.',
      ifPushed: 'You don\'t have to defend your feelings. "This is how it landed for me. I can\'t change that by arguing about it."'
    },
    {
      situation: 'A teacher dismisses your accommodation as unnecessary',
      truth: 'Your plan exists because qualified people determined you need it. Their professional opinion is on paper. A single teacher\'s skepticism doesn\'t override that. Their dismissal is data — it\'s a problem with their understanding, not your needs.',
      ifPushed: '"My plan is in place because the team decided I need it. Can we talk about how we make sure it\'s implemented?"'
    },
    {
      situation: 'You start to wonder if you\'re making it all up',
      truth: 'Doubt is normal, especially when adults disagree with you. But the question "am I making this up?" is actually itself evidence that you\'re reflective and trying to be fair. People who actually make things up rarely ask themselves that question.',
      ifPushed: 'Talk to a trusted person who knows you. Read your Journey entries to see your own patterns. Trust your accumulated experience over any single moment of doubt.'
    },
    {
      situation: 'You\'re told to "just let it go" or "move on"',
      truth: 'Sometimes that\'s good advice (low-stakes annoyances). Sometimes it\'s pressure to suppress legitimate concerns. The difference: are YOU ready to let it go, or are you being pressured to seem ready?',
      ifPushed: '"I need a little more time with this. I\'ll know when I\'m ready to move forward." Your timeline is yours.'
    },
    {
      situation: 'Multiple adults seem to be on the same page against your perspective',
      truth: 'Authority can feel like truth, but they\'re different. Adults can be wrong. Adults can be defensive. Adults can be protecting each other. That doesn\'t mean you\'re wrong. Bring in another perspective: a parent, an advocate, a separate counselor, an outside professional.',
      ifPushed: 'Don\'t take on a fight alone. Get someone else who doesn\'t work for the school in your corner. Their job is to be ON YOUR SIDE.'
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // MODULE 20: FOR TEACHERS (educator quick-start guide)
  // ═══════════════════════════════════════════════════════════════
  // For teachers, advisors, school psychologists, and counselors using
  // this tool with students. King Middle / EL Education / HOWL-aligned.

  var TEACHER_PRINCIPLES = [
    { title: 'Self-advocacy is taught, not transmitted', body: 'Knowing your rights doesn\'t happen by being told once. It happens through repeated practice, reflection, and real-stakes use. Treat this tool as a multi-week curriculum, not a one-shot lesson.' },
    { title: 'Privacy is part of the lesson', body: 'Some modules contain personal student data (Learning Profile, Journey journal, Accommodation Card). Those are private to the student. Don\'t require students to share their journal entries or display them on a class screen. The privacy IS modeling self-determination.' },
    { title: 'Disability framing is in the room whether you address it or not', body: 'If you don\'t name disability and identity directly, students will fill in with whatever messages they\'ve absorbed elsewhere. Naming it explicitly, with care, is more protective than avoiding it.' },
    { title: 'You don\'t have to be the expert', body: 'You don\'t need to know every IDEA citation. The tool teaches the content. Your job is to facilitate, not to lecture. "I don\'t know, let\'s look it up together" is a strong move.' },
    { title: 'Center student voice', body: 'When students share, listen first. Resist the urge to correct, complete their sentences, or speak for them. The goal is THEM finding their voice, not them performing your version of it.' },
    { title: 'Some students will be ahead of you', body: 'Disabled students who\'ve been navigating systems for years often know things you don\'t. Be ready to learn. They\'re not your teaching subjects; they\'re your collaborators.' }
  ];

  var SUGGESTED_CURRICULUM = [
    {
      week: 'Week 1 — Knowing yourself',
      goal: 'Students articulate their learning profile and begin to see themselves as informed about their own learning.',
      modules: 'My Learning Profile, Identity & Language',
      activities: 'Whole class: review the Learning Profile structure. Individual: students complete their own (private). Class share: optional — students who choose to can share one strength they listed. Whole class: read sections of Identity & Language; discuss the language stances (person-first vs identity-first) and ask students to consider their own preference.',
      crew: 'Strong fit for Crew. The Learning Profile becomes a personal artifact for the year.'
    },
    {
      week: 'Week 2 — Knowing your rights',
      goal: 'Students can describe IDEA, Section 504, and FAPE in plain language and identify where their own life intersects with these laws.',
      modules: 'Know Your Rights, Glossary, Rights Quiz',
      activities: 'Whole class: walk through the Rights module. Individual: complete the Glossary at their own pace. Pair: take the Rights Quiz together, discuss disagreements before revealing answers. Whole class: review the few questions most pairs got wrong.',
      crew: 'Quiz format works well as a Crew check-in. Glossary is a reference, not a unit.'
    },
    {
      week: 'Week 3 — Asking for what you need',
      goal: 'Students practice the moves of requesting accommodations and navigate disclosure choices.',
      modules: 'Request Accommodations, Disclosure Decisions',
      activities: 'Whole class: review the audience-by-audience disclosure framework. Pair role-play: students practice the accommodation request scripts with each other. Individual: students draft a real request they want to make, using the Letter Builder if it\'s formal.',
      crew: 'Pair role-plays work well in Crew. Don\'t make the disclosure activity public — it\'s personal.'
    },
    {
      week: 'Week 4 — When things get hard',
      goal: 'Students build emotional regulation tools and know what to do when accommodations are denied.',
      modules: 'Steady Yourself, When Things Go Wrong',
      activities: 'Whole class: practice box breathing and 5-4-3-2-1 grounding (everyone in the room together — normalize). Discuss the 9 escalation levels. Individual: students identify one tool from Steady Yourself they want to try this week.',
      crew: 'Box breathing as a routine Crew opener works well. Naming "Steady Yourself" gives students permission to use these tools.'
    },
    {
      week: 'Week 5 — Practice and peer support',
      goal: 'Students build skill through realistic practice and learn to support peers.',
      modules: 'Practice Scenarios (AI), Helping a Friend',
      activities: 'Individual: students work through Practice Scenarios with AI feedback. Pair: students discuss the Helping a Friend scenarios, considering how to support each other in real situations.',
      crew: 'The "Helping a Friend" content models Crew norms directly — supporting each other without overstepping.'
    },
    {
      week: 'Week 6 — Putting it together',
      goal: 'Students take ownership of one specific advocacy task and create artifacts that support real-world use.',
      modules: 'Action Plan, Meeting Prep, Accommodation Card',
      activities: 'Individual: each student creates an Action Plan for one thing they\'re working on. Students with upcoming IEPs use Meeting Prep. All students create their Accommodation Card. Plans, profiles, and cards stay with the student.',
      crew: 'End-of-unit Crew share: students share their Action Plan goal (not the details, just the headline) and what supports they need from peers.'
    }
  ];

  var HOWL_MAPPING = [
    {
      howl: 'Responsibility',
      modules: 'Action Plan Builder, Meeting Prep, My Journey (milestones)',
      rationale: 'Self-advocacy is the act of taking responsibility for your own educational experience. The Action Plan and Meeting Prep ask students to commit to specific actions and follow through.'
    },
    {
      howl: 'Self-awareness',
      modules: 'My Learning Profile, Identity & Language, Steady Yourself',
      rationale: 'The Learning Profile asks students to articulate strengths and challenges. Identity & Language deepens self-understanding. Steady Yourself names emotional patterns and offers tools.'
    },
    {
      howl: 'Self-management',
      modules: 'Steady Yourself, Action Plan Builder, Request Accommodations',
      rationale: 'Regulating emotions during hard conversations, planning toward goals, and making strategic asks are all self-management in action.'
    },
    {
      howl: 'Engagement / Active participation',
      modules: 'Meeting Prep, Practice Scenarios, Rights Quiz',
      rationale: 'Active participation in your own IEP/504 meeting is a significant act of engagement. Practice scenarios build the muscle. The quiz invites engagement with content.'
    },
    {
      howl: 'Perseverance',
      modules: 'When Things Go Wrong (escalation), Steady Yourself, My Journey',
      rationale: 'Self-advocacy often requires returning to a request that was denied or postponed. The escalation paths and the journal cycle of try-reflect-try-again build perseverance.'
    },
    {
      howl: 'Collaboration',
      modules: 'Helping a Friend, Letter Builder (thank-you with agreement summary), Meeting Prep (planning who attends)',
      rationale: 'Self-advocacy is collaborative when done well. Knowing how to support peers, how to coordinate with parents and staff, and how to include the right people in conversations are all collaborative skills.'
    },
    {
      howl: 'Compassion / Care for others',
      modules: 'Helping a Friend, Identity & Language (intersectionality), Disclosure Decisions',
      rationale: 'Compassion for self and others shows up in respecting peers\' autonomy when supporting them, in recognizing how others\' identities shape their experience, and in thoughtfully managing what to share.'
    }
  ];

  var TEACHER_PITFALLS = [
    { pitfall: 'Reading the journal entries', fix: 'Don\'t. Even briefly. Even with good intent. The privacy of the journal is the lesson. If students share an entry, they share by choice. If you have a safety concern, address that directly with the student, not by reading the journal.' },
    { pitfall: 'Telling a student what their accommodations should be', fix: 'Their plan is their plan. You can ask "what would help you?" or "have you tried using your accommodation in this situation?" but you don\'t prescribe new accommodations from the front of the classroom.' },
    { pitfall: 'Treating the AI practice as graded', fix: 'The AI coach is a sounding board, not a grader. Don\'t collect or score the AI responses. Students should feel free to write awkward, unfinished, or imperfect first drafts.' },
    { pitfall: 'Disclosing a student\'s disability to the class', fix: 'Even with good intent ("everyone, X has accommodations because of Y") this violates privacy and pressures other disabled students. Students disclose by their own choice.' },
    { pitfall: 'Skipping Identity & Language because it feels political', fix: 'It\'s not political. It\'s student development. Avoiding it doesn\'t make it neutral; it just means students get their messaging from elsewhere. Engage with care, not avoidance.' },
    { pitfall: 'Using the Helping a Friend scenarios to "fix" social dynamics in the class', fix: 'Don\'t use a kid\'s real situation as the day\'s example. The scenarios are general by design. If a real classroom situation needs addressing, address it separately.' }
  ];

  var TEACHER_SELF_REFLECTION = [
    'When a student in my class asks for an accommodation, what\'s my first response, in my body and in my words? If I were the student, would I feel safe asking again?',
    'Have I assumed I know what a disabled student needs without asking them?',
    'Is my classroom set up so that using accommodations is private (a student doesn\'t have to publicly request them every time)?',
    'When a student\'s behavior frustrates me, do I check whether the behavior might be a disability-related response to an environment that doesn\'t fit them?',
    'Whose disabled voices have I read or listened to recently, beyond what\'s in school documents?',
    'Am I willing to be wrong about a student\'s disability and to update when they share something I didn\'t know?'
  ];

  // ═══════════════════════════════════════════════════════════════
  // REGISTER TOOL
  // ═══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('selfAdvocacy', {
    icon: '\uD83D\uDDE3\uFE0F',
    label: 'Self-Advocacy Studio',
    desc: 'Know your rights, understand your IEP or 504, request accommodations, navigate disclosure decisions, escalate when things go wrong, prepare for adulthood, practice with AI.',
    color: 'indigo',
    category: 'self-management',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var addToast = ctx.addToast || function() {};
      var callGemini = ctx.callGemini;
      var band = ctx.gradeBand === 'elementary' ? 'middle' : (ctx.gradeBand || 'middle');
      if (band !== 'middle' && band !== 'high') band = 'middle';

      var d = (ctx.toolData && ctx.toolData.selfAdvocacy) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('selfAdvocacy', key); }
        else { if (ctx.update) ctx.update('selfAdvocacy', key, val); }
      };

      var activeTab = d.activeTab || 'menu';
      var viewBand = d.viewBand || band;

      // Practice state
      var pScenarioId = d.pScenarioId || null;
      var pResponse = d.pResponse || '';
      var pCritique = d.pCritique || '';
      var pLoading = !!d.pLoading;

      // ── Switch tab with focus + SR announcement ──
      function switchTab(tabId, label) {
        upd('activeTab', tabId);
        announceSR('Now viewing: ' + (label || tabId));
        // Move focus to main content region after re-render
        setTimeout(function() {
          var main = document.getElementById('selfadv-main-content');
          if (main && main.focus) {
            try { main.focus({ preventScroll: false }); } catch(e) { try { main.focus(); } catch(e2) {} }
          }
        }, 50);
      }

      // ── Tab selector ──
      function renderTabs() {
        var tabs = [
          { id: 'menu', label: 'Home', icon: '\uD83C\uDFE0' },
          { id: 'profile', label: 'My Learning Profile', icon: '\uD83D\uDC64' },
          { id: 'rights', label: 'Know Your Rights', icon: '\u2696\uFE0F' },
          { id: 'iep', label: 'Your IEP / 504', icon: '\uD83D\uDCC4' },
          { id: 'request', label: 'Request Accommodations', icon: '\uD83D\uDD28' },
          { id: 'disclose', label: 'Disclosure Decisions', icon: '\uD83D\uDD11' },
          { id: 'escalate', label: 'When Things Go Wrong', icon: '\uD83D\uDEA8' },
          { id: 'transition', label: 'Adulthood', icon: '\uD83C\uDF9F\uFE0F' },
          { id: 'practice', label: 'Practice', icon: '\uD83C\uDFAF' },
          { id: 'meeting', label: 'Meeting Prep', icon: '\uD83D\uDCDD' },
          { id: 'letter', label: 'Letter Builder', icon: '\u270F\uFE0F' },
          { id: 'resources', label: 'Resources', icon: '\uD83D\uDCDA' },
          { id: 'quiz', label: 'Rights Quiz', icon: '\uD83E\uDDE0' },
          { id: 'friend', label: 'Helping a Friend', icon: '\uD83E\uDD1D' },
          { id: 'journey', label: 'My Journey', icon: '\uD83D\uDDFA\uFE0F' },
          { id: 'card', label: 'Accom Card', icon: '\uD83D\uDCB3' },
          { id: 'identity', label: 'Identity & Language', icon: '\uD83C\uDF08' },
          { id: 'glossary', label: 'Glossary', icon: '\uD83D\uDCD6' },
          { id: 'plan', label: 'Action Plan', icon: '\uD83C\uDFAF' },
          { id: 'steady', label: 'Steady Yourself', icon: '\uD83E\uDDD8' },
          { id: 'teacher', label: 'For Teachers', icon: '\uD83C\uDF93' },
          { id: 'packet', label: 'Print Packet', icon: '\uD83D\uDCE6' },
          { id: 'data', label: 'My Data', icon: '\uD83D\uDD12' }
        ];
        return h('nav', { className: 'flex flex-wrap gap-1 p-2 no-print', role: 'navigation', 'aria-label': 'Self-Advocacy Studio sections' },
          tabs.map(function(t) {
            var sel = activeTab === t.id;
            return h('button', {
              key: t.id,
              onClick: function() { switchTab(t.id, t.label); },
              'aria-current': sel ? 'page' : undefined,
              'aria-label': t.label + (sel ? ' (current section)' : ''),
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (sel ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700')
            }, h('span', { 'aria-hidden': 'true' }, t.icon + ' '), t.label);
          })
        );
      }

      // ── Grade band selector ──
      function renderBandSelector() {
        return h('div', { className: 'flex items-center gap-2 text-xs no-print' },
          h('span', { className: 'text-slate-400' }, 'Show:'),
          ['middle', 'high'].map(function(b) {
            var sel = viewBand === b;
            return h('button', {
              key: b,
              onClick: function() { upd('viewBand', b); },
              className: 'px-2 py-1 rounded font-bold ' + (sel ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600')
            }, b === 'middle' ? 'Middle school' : 'High school');
          })
        );
      }

      // ── Home dashboard stats helpers ──
      function dashboardStats() {
        var profile = d.profile || {};
        var profileTouched = !!(profile.name || profile.intro || (profile.strengths || []).length || (profile.helps || []).length || profile.teachers || profile.wish);
        var milestones = d.milestones || {};
        var totalMilestones = JOURNEY_STAGES.reduce(function(acc, st) { return acc + st.milestones.length; }, 0);
        var doneMilestones = Object.keys(milestones).length;
        var pctDone = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;
        var entries = d.journalEntries || [];
        var card = d.card || {};
        var cardTouched = !!(card.name || card.accommodations);
        var letterFields = d.letterFields || {};
        var letterDrafted = Object.keys(letterFields).length > 0;
        var meeting = d.meeting || {};
        var meetingTouched = !!(meeting.meetingType || meeting.goals || meeting.attendees);
        return {
          profileTouched: profileTouched,
          pctDone: pctDone,
          doneMilestones: doneMilestones,
          totalMilestones: totalMilestones,
          entryCount: entries.length,
          latestEntry: entries[0] || null,
          cardTouched: cardTouched,
          letterDrafted: letterDrafted,
          meetingTouched: meetingTouched
        };
      }

      function smartSuggestion(stats) {
        if (!stats.profileTouched) return { cta: 'Start with your Learning Profile', tab: 'profile', why: 'Knowing yourself is the first step. Fill in a few fields and print a page you can share with a new teacher.' };
        if (stats.doneMilestones === 0 && stats.entryCount === 0) return { cta: 'Explore My Journey and check your first milestone', tab: 'journey', why: 'You\'ve already built a learning profile. Mark off some milestones you\'ve reached. You\'re probably further along than you think.' };
        if (!stats.cardTouched) return { cta: 'Make your Accommodation Card', tab: 'card', why: 'A wallet-sized card listing your accommodations. Pull it out when a sub teacher doesn\'t know your plan.' };
        if (stats.entryCount < 3) return { cta: 'Log a journal entry', tab: 'journey', why: 'Something advocacy-related happened recently? A few sentences now become a record of your growth later.' };
        if (!stats.meetingTouched) return { cta: 'Try Meeting Prep before your next IEP or conference', tab: 'meeting', why: 'Fill in the worksheet before the meeting. Walk in with a plan.' };
        return { cta: 'Check your Rights knowledge with the quiz', tab: 'quiz', why: '12 questions. Instant feedback. Takes about 5 minutes.' };
      }

      // ── Home / menu view ──
      function renderMenu() {
        var cards = [
          { id: 'profile', icon: '\uD83D\uDC64', title: 'My Learning Profile', body: 'Build a one-page summary of who you are as a learner — your strengths, what helps you, what gets in the way, and what you want teachers to know. Print it and share it with new teachers. Start here.', color: 'from-violet-600 to-indigo-600' },
          { id: 'rights', icon: '\u2696\uFE0F', title: 'Know Your Rights', body: 'The laws that protect you: IDEA, Section 504, FAPE, LRE, FERPA. Plain-language explanations of what they mean for how school works for you.', color: 'from-blue-600 to-cyan-600' },
          { id: 'iep', icon: '\uD83D\uDCC4', title: 'Your IEP or 504', body: 'Learn to read your own plan document. What each section means, whose goals are really in there, how to prepare for your meeting, what to do if you don\'t have a plan but think you need one.', color: 'from-purple-600 to-pink-600' },
          { id: 'request', icon: '\uD83D\uDD28', title: 'Request Accommodations', body: 'When and how to ask for what you need. Scripts for common situations. How to document requests so your asks don\'t disappear.', color: 'from-emerald-600 to-teal-600' },
          { id: 'disclose', icon: '\uD83D\uDD11', title: 'Disclosure Decisions', body: 'You never have to share your diagnosis with anyone. Decide what to share, with whom, and when. Audience-specific scripts at different disclosure depths.', color: 'from-amber-600 to-orange-600' },
          { id: 'escalate', icon: '\uD83D\uDEA8', title: 'When Things Go Wrong', body: 'What to do when accommodations are denied, delayed, or not implemented. Escalation levels from a direct conversation through OCR complaints. Know what each level costs and what it gets you.', color: 'from-rose-600 to-red-600' },
          { id: 'transition', icon: '\uD83C\uDF9F\uFE0F', title: 'Transition to Adulthood', body: 'Age of majority, college disability services, workplace ADA rights. Planning for the moment when rights transfer and you\'re driving.', color: 'from-sky-600 to-blue-700' },
          { id: 'practice', icon: '\uD83C\uDFAF', title: 'Practice Scenarios', body: 'Realistic scenarios to practice self-advocacy. Pick a situation, write your response, and get AI coaching feedback.', color: 'from-fuchsia-600 to-rose-600' },
          { id: 'meeting', icon: '\uD83D\uDCDD', title: 'Meeting Prep', body: 'Fill in a worksheet before your IEP, 504, or parent-teacher meeting. Print it and bring it with you. Includes conversation starters for when you need them.', color: 'from-teal-600 to-cyan-600' },
          { id: 'letter', icon: '\u270F\uFE0F', title: 'Letter & Email Builder', body: '6 templates for common formal requests: asking for an evaluation, requesting a meeting, following up on accommodations, requesting an IEE, introducing yourself to a new teacher, sending a thank-you with an agreement summary.', color: 'from-amber-600 to-yellow-600' },
          { id: 'resources', icon: '\uD83D\uDCDA', title: 'Resource Library', body: 'Crisis lines, national advocacy orgs, federal agencies, Maine-specific resources, self-advocacy tools, transition prep, and recommended reading. All in one place.', color: 'from-slate-600 to-stone-600' },
          { id: 'quiz', icon: '\uD83E\uDDE0', title: 'Rights Quiz', body: '12 multiple-choice questions to check what you know. Get instant feedback with explanations. Test yourself or use as a classroom check-in.', color: 'from-cyan-600 to-blue-600' },
          { id: 'friend', icon: '\uD83E\uDD1D', title: 'Helping a Friend', body: '6 scenarios where a friend is facing something hard. Pick how you\'d respond. Learn what supportive peer advocacy looks like versus well-intended responses that overstep.', color: 'from-pink-600 to-rose-600' },
          { id: 'journey', icon: '\uD83D\uDDFA\uFE0F', title: 'My Advocacy Journey', body: 'Your personal space. Check off developmental milestones across 5 stages. Log what you tried, how it went, what you learned. Track your growth over months and years.', color: 'from-violet-600 to-fuchsia-600' },
          { id: 'card', icon: '\uD83D\uDCB3', title: 'Accommodation Card', body: 'A wallet-sized printable card listing your key accommodations. Keep it in your backpack. Hand it to a sub teacher or anyone who doesn\'t know your plan. Low drama, high clarity.', color: 'from-yellow-600 to-amber-600' },
          { id: 'identity', icon: '\uD83C\uDF08', title: 'Identity & Language', body: 'Disability identity, the neurodiversity paradigm, person-first vs identity-first language, intersectionality, and finding community. The bigger questions of who you are and how you talk about yourself.', color: 'from-purple-600 to-indigo-600' },
          { id: 'glossary', icon: '\uD83D\uDCD6', title: 'Quick Glossary', body: 'Plain-language definitions of the terms used throughout this tool. Filter as you type. For when you hit a word you don\'t know.', color: 'from-stone-600 to-zinc-700' },
          { id: 'plan', icon: '\uD83C\uDFAF', title: 'Action Plan Builder', body: 'Pick ONE thing you want to advocate for right now. Break it into 3 steps with a check-in date. Print the card and stick it somewhere you\'ll see it.', color: 'from-lime-600 to-green-700' },
          { id: 'steady', icon: '\uD83E\uDDD8', title: 'Steady Yourself', body: 'The emotional side of advocacy. Tools for nerves before a meeting, getting through it without freezing or crying, recovering after a hard conversation, and trusting your own perception when adults dismiss you.', color: 'from-teal-600 to-emerald-700' },
          { id: 'teacher', icon: '\uD83C\uDF93', title: 'For Teachers', body: 'For educators using this tool with students. Six teaching principles, a 6-week curriculum scaffold, mapping to EL Education HOWLs, common pitfalls, and self-reflection prompts for teachers.', color: 'from-blue-700 to-sky-600' },
          { id: 'packet', icon: '\uD83D\uDCE6', title: 'Print Packet', body: 'Combine everything you\'ve filled in — Learning Profile, Accommodation Card, Action Plan, Meeting Prep, Journey milestones and recent entries — into one print-ready document for an advisor check-in.', color: 'from-zinc-600 to-stone-700' },
          { id: 'data', icon: '\uD83D\uDD12', title: 'My Data', body: 'Your privacy controls. Export everything you\'ve filled in to a file you own. Import a previous backup. Reset everything if you want to start fresh. This is your data, on your device.', color: 'from-slate-600 to-gray-700' }
        ];
        var stats = dashboardStats();
        var suggestion = smartSuggestion(stats);
        var anyProgress = stats.profileTouched || stats.doneMilestones > 0 || stats.entryCount > 0 || stats.cardTouched || stats.letterDrafted || stats.meetingTouched;

        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6' },
          h('header', { className: 'mb-6' },
            h('h1', { className: 'text-2xl md:text-3xl font-black text-indigo-200 mb-2' }, '\uD83D\uDDE3\uFE0F Self-Advocacy Studio'),
            h('p', { className: 'text-sm text-slate-300 leading-relaxed' }, 'The skill of advocating for yourself is not optional for living a good life, especially if you have a disability, learn differently, or navigate systems that were not designed with you in mind. This tool teaches the substance of self-advocacy: the rights you have, how to use them, and the harder stuff like disclosure and escalation. For the CRAFT of advocacy (assertiveness, communication style, conversation management), see the Self-Advocacy Workshop tool.'),
            h('div', { className: 'mt-3 p-3 rounded-lg bg-indigo-900/30 border border-indigo-500/30 text-xs text-indigo-200' },
              h('strong', null, 'Your rights, your story, your choice. '), 'This tool is here to help you understand and exercise what you\'re entitled to. It is not legal advice, and it is not a substitute for a parent, teacher, advisor, or counselor who knows you.'
            )
          ),

          // Smart suggestion banner (always visible)
          h('section', { className: 'p-4 rounded-xl bg-gradient-to-r from-indigo-900/50 to-violet-900/50 border border-indigo-500/40 mb-4' },
            h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
              h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'text-xs font-bold text-indigo-300 mb-1' }, anyProgress ? 'Suggested next step' : 'Start here'),
                h('div', { className: 'text-sm font-bold text-indigo-100 mb-1' }, suggestion.cta),
                h('div', { className: 'text-xs text-slate-300' }, suggestion.why)
              ),
              h('button', {
                onClick: function() { switchTab(suggestion.tab, suggestion.cta); },
                className: 'px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400 shrink-0 no-print'
              }, 'Go \u2192')
            )
          ),

          // Dashboard if student has engaged with tool
          anyProgress && h('section', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2 mb-4' },
            h('div', { className: 'p-3 rounded-lg bg-slate-800/60 border border-violet-500/30' },
              h('div', { className: 'text-xs text-slate-400 mb-1' }, 'Profile'),
              h('div', { className: 'text-sm font-black text-violet-200' }, stats.profileTouched ? '\u2713 Started' : 'Not yet')
            ),
            h('div', { className: 'p-3 rounded-lg bg-slate-800/60 border border-fuchsia-500/30' },
              h('div', { className: 'text-xs text-slate-400 mb-1' }, 'Milestones'),
              h('div', { className: 'text-sm font-black text-fuchsia-200' }, stats.doneMilestones + ' / ' + stats.totalMilestones),
              h('div', { className: 'text-xs text-slate-300 mt-1' }, stats.pctDone + '%')
            ),
            h('div', { className: 'p-3 rounded-lg bg-slate-800/60 border border-sky-500/30' },
              h('div', { className: 'text-xs text-slate-400 mb-1' }, 'Journal entries'),
              h('div', { className: 'text-sm font-black text-sky-200' }, stats.entryCount)
            ),
            h('div', { className: 'p-3 rounded-lg bg-slate-800/60 border border-amber-500/30' },
              h('div', { className: 'text-xs text-slate-400 mb-1' }, 'Accom card'),
              h('div', { className: 'text-sm font-black text-amber-200' }, stats.cardTouched ? '\u2713 Ready' : 'Not yet')
            )
          ),

          // Recent entry preview
          stats.latestEntry && h('section', { className: 'p-3 rounded-lg bg-slate-800/40 border border-slate-600 mb-4 no-print' },
            h('div', { className: 'flex justify-between items-baseline mb-1' },
              h('span', { className: 'text-xs font-bold text-slate-300' }, 'Last journal entry'),
              h('span', { className: 'text-xs text-slate-300' }, stats.latestEntry.date)
            ),
            (function() {
              var tmpl = JOURNAL_PROMPT_TEMPLATES.find(function(t) { return t.id === stats.latestEntry.type; });
              var firstField = tmpl && tmpl.fields[0];
              var val = firstField && (stats.latestEntry.fields || {})[firstField.id];
              return h('div', { className: 'text-xs text-slate-200 italic line-clamp-2' }, val ? '\u201C' + val + '\u201D' : '(no content)');
            })(),
            h('button', {
              onClick: function() { switchTab('journey', 'My Journey'); },
              className: 'text-xs text-fuchsia-400 hover:text-fuchsia-300 mt-1'
            }, 'See all entries \u2192')
          ),

          // "I want to..." quick-action panel (curated question → tab map)
          (function() {
            var quickActions = [
              { q: 'know my rights as a student with a disability', tab: 'rights', label: 'Know Your Rights' },
              { q: 'get extended time on a test', tab: 'request', label: 'Request Accommodations' },
              { q: 'figure out what to say in a meeting', tab: 'meeting', label: 'Meeting Prep' },
              { q: 'write a formal request letter', tab: 'letter', label: 'Letter Builder' },
              { q: 'practice a hard conversation', tab: 'practice', label: 'Practice Scenarios' },
              { q: 'feel less anxious before a meeting', tab: 'steady', label: 'Steady Yourself' },
              { q: 'figure out whether to tell a teacher about my disability', tab: 'disclose', label: 'Disclosure Decisions' },
              { q: 'know what to do when an accommodation isn\'t followed', tab: 'escalate', label: 'When Things Go Wrong' },
              { q: 'help a friend who\'s struggling', tab: 'friend', label: 'Helping a Friend' },
              { q: 'understand a word from my IEP', tab: 'glossary', label: 'Glossary' },
              { q: 'pick one thing to work on this month', tab: 'plan', label: 'Action Plan' },
              { q: 'have a one-page summary teachers can read', tab: 'profile', label: 'Learning Profile' }
            ];
            return h('details', { className: 'mb-4 p-3 rounded-lg bg-indigo-900/20 border border-indigo-500/30 no-print' },
              h('summary', { className: 'text-sm font-bold text-indigo-200 cursor-pointer' }, '\uD83D\uDCAD I want to...'),
              h('div', { className: 'mt-3 grid grid-cols-1 md:grid-cols-2 gap-1' },
                quickActions.map(function(a, i) {
                  return h('button', {
                    key: i,
                    onClick: function() { switchTab(a.tab, a.label); },
                    className: 'text-left px-2 py-1.5 rounded text-xs text-slate-200 hover:bg-indigo-900/40 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition'
                  },
                    h('span', { className: 'text-indigo-400' }, '\u2192 '),
                    a.q,
                    h('span', { className: 'text-slate-400 ml-1' }, ' (' + a.label + ')')
                  );
                })
              )
            );
          })(),

          // Companion tool mention
          h('section', { className: 'p-3 rounded-lg bg-slate-800/40 border border-slate-700 mb-4 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-indigo-300' }, 'Companion tool: '),
            'The existing ',
            h('em', null, 'Self-Advocacy Workshop'),
            ' tool in the SEL Hub teaches the CRAFT of advocacy — assertiveness scripts, branching dialogue scenarios, AI voice practice. This tool teaches the SUBSTANCE — your rights, your IEP, disclosure choices, escalation paths. Use them together for the full picture.'
          ),

          // Accessibility info — collapsible details
          h('details', { className: 'mb-4 p-3 rounded-lg bg-slate-800/40 border border-slate-700 no-print' },
            h('summary', { className: 'text-xs font-bold text-slate-300 cursor-pointer' }, '\uD83C\uDF10 Accessibility & privacy notes'),
            h('div', { className: 'mt-3 text-xs text-slate-300 space-y-2' },
              h('p', null, 'This tool is built to WCAG 2.1 Level AA standards. Specifically:'),
              h('ul', { className: 'list-disc list-inside space-y-1 ml-2' },
                h('li', null, 'Skip-to-main-content link at the top of the page (press Tab on a fresh page).'),
                h('li', null, 'Keyboard-navigable throughout. Yellow focus outlines on all interactive elements.'),
                h('li', null, 'Screen-reader announcements when you change tabs, save entries, or get AI feedback. Tab navigation has proper ARIA roles.'),
                h('li', null, 'Reduced-motion preference is respected. Set "reduce motion" in your OS to suppress animations.'),
                h('li', null, 'Print versions of every reference page for low-vision and high-contrast preference.'),
                h('li', null, 'Live regions for dynamic content (loading states, results).')
              ),
              h('p', { className: 'mt-2' }, h('strong', null, 'Privacy: '), 'Everything you fill in (Profile, Journey journal, Plans, Cards, Letter drafts) lives on your own device. Nothing is sent to anyone unless you choose to share it. AI-feedback features send only the specific text you submit, with no identifying info.'),
              h('p', { className: 'mt-2' }, h('strong', null, 'Found a barrier? '), 'If something isn\'t working for you, tell your school psychologist or advisor. The tool can be improved. Your feedback matters.')
            )
          ),

          renderBandSelector(),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mt-4' },
            cards.map(function(c) {
              return h('button', {
                key: c.id,
                onClick: function() { switchTab(c.id, c.title); },
                className: 'text-left p-4 rounded-xl bg-gradient-to-br ' + c.color + ' hover:brightness-110 focus:ring-2 focus:ring-white focus:outline-none transition shadow-lg'
              },
                h('div', { className: 'text-3xl mb-2' }, c.icon),
                h('div', { className: 'text-base font-black text-white mb-1' }, c.title),
                h('div', { className: 'text-xs text-white/90 leading-snug' }, c.body)
              );
            })
          )
        );
      }

      // ── Learning Profile view ──
      function renderProfile() {
        var lp = d.profile || {};
        var prompts = LP_PROMPTS[viewBand] || LP_PROMPTS.middle;
        var updLP = function(patch) {
          upd({ profile: Object.assign({}, lp, patch) });
        };
        var toggleChecklist = function(field, item) {
          var cur = lp[field] || [];
          var next = cur.slice();
          var idx = next.indexOf(item);
          if (idx >= 0) next.splice(idx, 1); else next.push(item);
          updLP((function() { var o = {}; o[field] = next; return o; })());
        };
        var clearProfile = function() {
          if (typeof window !== 'undefined' && window.confirm && !window.confirm('Clear everything in your learning profile? This can\'t be undone.')) return;
          upd({ profile: {} });
        };

        var checklistSection = function(title, field, items, colorClass, helpText) {
          var sel = lp[field] || [];
          var groupId = 'lp-checklist-' + field;
          var helpId = groupId + '-help';
          var countId = groupId + '-count';
          return h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border ' + colorClass + ' no-print' },
            h('h3', { className: 'text-sm font-black mb-2', id: groupId + '-title' }, title),
            helpText && h('p', { className: 'text-xs text-slate-300 mb-2', id: helpId }, helpText),
            h('div', { className: 'flex flex-wrap gap-1', role: 'group', 'aria-labelledby': groupId + '-title', 'aria-describedby': (helpText ? helpId + ' ' : '') + countId },
              items.map(function(item, i) {
                var picked = sel.indexOf(item) >= 0;
                return h('button', {
                  key: i,
                  onClick: function() { toggleChecklist(field, item); },
                  role: 'checkbox',
                  'aria-checked': picked,
                  'aria-label': (picked ? 'Selected: ' : 'Not selected: ') + item,
                  className: 'px-2 py-1 rounded text-xs transition focus:ring-2 focus:ring-violet-400 focus:outline-none ' + (picked ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600')
                },
                  picked ? h('span', { 'aria-hidden': 'true' }, '\u2713 ') : null,
                  item
                );
              })
            ),
            h('div', { className: 'text-xs text-slate-300 mt-2', id: countId, 'aria-live': 'polite' }, sel.length + ' selected')
          );
        };

        var textAreaSection = function(title, field, placeholder, colorClass) {
          var taId = 'lp-textarea-' + field;
          return h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border ' + colorClass + ' no-print' },
            h('label', { className: 'text-sm font-black mb-2 block', htmlFor: taId }, title),
            h('textarea', {
              id: taId,
              value: lp[field] || '',
              onChange: function(e) { var o = {}; o[field] = e.target.value; updLP(o); },
              placeholder: placeholder,
              rows: 4,
              className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
            })
          );
        };

        // ── Printable one-pager ──
        var printableOnePager = h('div', { className: 'hidden print:block bg-white text-black p-8' },
          h('h1', { className: 'text-2xl font-bold mb-2' }, (lp.name || 'My') + '\'s Learning Profile'),
          lp.grade && h('div', { className: 'text-sm mb-4' }, lp.grade),
          lp.intro && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'Introduction'),
            h('p', { className: 'whitespace-pre-wrap' }, lp.intro)
          ),
          (lp.strengths || []).length > 0 && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'My Strengths'),
            h('ul', { className: 'list-disc list-inside' },
              (lp.strengths || []).map(function(s, i) { return h('li', { key: i }, s); })
            ),
            lp.strengthsNote && h('p', { className: 'mt-2 whitespace-pre-wrap italic' }, lp.strengthsNote)
          ),
          (lp.helps || []).length > 0 && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What Helps Me Learn'),
            h('ul', { className: 'list-disc list-inside' },
              (lp.helps || []).map(function(s, i) { return h('li', { key: i }, s); })
            ),
            lp.helpsNote && h('p', { className: 'mt-2 whitespace-pre-wrap italic' }, lp.helpsNote)
          ),
          (lp.barriers || []).length > 0 && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What Gets in the Way'),
            h('ul', { className: 'list-disc list-inside' },
              (lp.barriers || []).map(function(s, i) { return h('li', { key: i }, s); })
            ),
            lp.barriersNote && h('p', { className: 'mt-2 whitespace-pre-wrap italic' }, lp.barriersNote)
          ),
          lp.teachers && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What I Want Teachers to Know'),
            h('p', { className: 'whitespace-pre-wrap' }, lp.teachers)
          ),
          lp.hidden && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What Isn\'t Obvious About Me'),
            h('p', { className: 'whitespace-pre-wrap' }, lp.hidden)
          ),
          lp.wish && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'One Thing I Wish Teachers Understood'),
            h('p', { className: 'whitespace-pre-wrap' }, lp.wish)
          ),
          h('footer', { className: 'mt-8 text-xs text-gray-600 border-t pt-2' }, 'Shared by my choice. Please protect my privacy and check with me before sharing this with other people.')
        );

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          printableOnePager,
          h('div', { className: 'no-print' },
            h('h2', { className: 'text-2xl font-black text-indigo-200 mb-1' }, '\uD83D\uDC64 My Learning Profile'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, 'A one-page portrait of you as a learner. Fill what applies, skip what doesn\'t. When you\'re done, print it and share it with teachers, a counselor, or whoever needs to understand how to work with you. You control what goes in and who sees it.'),
            renderBandSelector(),
            h('div', { className: 'mt-3 p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 text-xs text-amber-100' },
              h('strong', null, 'Privacy first: '), 'This is your profile, kept in your own space. Nobody sees it unless you share it. Only include what you\'d be comfortable with a teacher reading.'
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-violet-500/30 grid grid-cols-1 md:grid-cols-2 gap-2 no-print' },
            h('div', null,
              h('label', { className: 'text-xs font-bold text-violet-300 mb-1 block', htmlFor: 'lp-name' }, 'My name (or nickname) for this profile'),
              h('input', {
                id: 'lp-name',
                type: 'text', value: lp.name || '',
                onChange: function(e) { updLP({ name: e.target.value }); },
                placeholder: 'First name or what you want to be called',
                'aria-describedby': 'lp-name-help',
                autoComplete: 'given-name',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              }),
              h('span', { id: 'lp-name-help', className: 'selfadv-sr-only' }, 'This name shows on the printed handout.')
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-violet-300 mb-1 block', htmlFor: 'lp-grade' }, 'Grade / age / school'),
              h('input', {
                id: 'lp-grade',
                type: 'text', value: lp.grade || '',
                onChange: function(e) { updLP({ grade: e.target.value }); },
                placeholder: 'e.g., "7th grade" or "14, King Middle"',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            )
          ),

          textAreaSection('Introduction', 'intro', prompts.intro, 'border-violet-500/30'),
          checklistSection('My strengths (tap to select)', 'strengths', LP_STRENGTHS, 'border-emerald-500/30', 'Pick the ones that feel like you. There\'s no right number.'),
          textAreaSection('Anything else about your strengths?', 'strengthsNote', 'Optional. Free space to add or explain.', 'border-emerald-500/30'),

          checklistSection('What helps me learn', 'helps', LP_HELPS, 'border-sky-500/30', 'How do you actually learn best? Tap what applies. You\'re the expert here.'),
          textAreaSection('More on what helps', 'helpsNote', 'Optional. Add anything specific that\'s not in the list.', 'border-sky-500/30'),

          checklistSection('What gets in the way', 'barriers', LP_GETS_IN_WAY, 'border-rose-500/30', 'Being honest here helps the teacher not accidentally make things harder. Tap what applies.'),
          textAreaSection('More on what gets in the way', 'barriersNote', 'Optional. Any specific triggers, situations, or needs.', 'border-rose-500/30'),

          textAreaSection('What I want teachers to know', 'teachers', prompts.teachers, 'border-indigo-500/30'),
          textAreaSection('What isn\'t obvious about me', 'hidden', prompts.hidden, 'border-indigo-500/30'),
          textAreaSection('One thing I wish teachers understood', 'wish', prompts.wish, 'border-indigo-500/30'),

          h('div', { className: 'flex flex-wrap gap-2 pt-2 no-print' },
            h('button', {
              onClick: function() { window.print && window.print(); },
              className: 'flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-500'
            }, '\uD83D\uDDA8 Print one-pager / Save as PDF'),
            h('button', {
              onClick: clearProfile,
              className: 'py-2 px-4 rounded-lg bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600'
            }, 'Clear everything')
          ),

          h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-violet-300' }, 'How to use this: '),
            'Print it. Bring it to your first meeting with a new teacher, counselor, or case manager. Or share it with your parent as a conversation starter before your IEP meeting. You can update it anytime — you\'re not locked in. Every year you\'re a different learner than you were the year before.'
          )
        );
      }

      // ── Rights view ──
      function renderRights() {
        var rightsList = RIGHTS[viewBand] || RIGHTS.middle;
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\u2696\uFE0F Know Your Rights'),
          renderBandSelector(),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, viewBand === 'high' ? 'At the high school level, these are the rights you\'ll need to know as you transition toward college, work, and adulthood. Some of them start to matter more NOW; others kick in at 18.' : 'These are the main laws that shape what school looks like for a student with a disability. You don\'t need to memorize the details, but knowing the names and what they cover gives you a starting point when you need to push for something.'),
          rightsList.map(function(r) {
            return h('section', { key: r.id, className: 'p-4 rounded-xl bg-slate-800/60 border border-indigo-500/30' },
              h('h3', { className: 'text-base font-black text-indigo-200 mb-2' }, r.name),
              h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-indigo-300' }, 'In plain words: '), r.plain),
              h('div', { className: 'text-xs text-slate-300 mb-2' }, h('strong', { className: 'text-indigo-300' }, 'Why it exists: '), r.why),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mt-2' },
                h('div', { className: 'p-2 rounded bg-emerald-900/20 border border-emerald-500/30' },
                  h('div', { className: 'text-xs font-black text-emerald-300 mb-1' }, 'What it covers'),
                  h('div', { className: 'text-xs text-slate-200' }, r.covers)
                ),
                h('div', { className: 'p-2 rounded bg-amber-900/20 border border-amber-500/30' },
                  h('div', { className: 'text-xs font-black text-amber-300 mb-1' }, 'What it doesn\'t cover'),
                  h('div', { className: 'text-xs text-slate-200' }, r.doesntCover)
                )
              ),
              h('div', { className: 'mt-2 p-2 rounded bg-slate-900/60 text-xs text-slate-300 italic' }, h('strong', { className: 'text-indigo-300 not-italic' }, 'Example: '), r.example)
            );
          }),
          h('section', { className: 'p-3 rounded-xl bg-slate-900/60 border border-indigo-500/20 text-xs text-slate-300' },
            h('strong', null, 'Want more depth? '), 'The Assessment Literacy Lab (STEM Lab) has a Parent Procedural Safeguards sub-view with the adult-side version of everything here. It covers the legal procedures your parents or guardians have, which become yours at 18.'
          ),
          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-indigo-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print rights primer')
          )
        );
      }

      // ── IEP / 504 view ──
      function renderIEP() {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83D\uDCC4 Understand Your IEP or 504'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'If you have a plan, reading it carefully once a year is a real act of self-advocacy. Know what\'s in it. Know what you\'d change. Bring that to your team meeting.'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Sections of a typical IEP'),
            h('div', { className: 'space-y-2' },
              IEP_SECTIONS.map(function(s, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, s.section),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-purple-300' }, 'What it is: '), s.what),
                  h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-emerald-300' }, 'Look for: '), s.lookFor)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-200 mb-3' }, 'Questions to ask yourself about your own plan'),
            h('ul', { className: 'space-y-2 text-xs text-slate-200 list-disc list-inside' },
              IEP_SELF_QUESTIONS.map(function(q, i) {
                return h('li', { key: i, className: 'leading-relaxed' }, q);
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
            h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, 'How to prepare for your IEP meeting'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Being at your own meeting is one of the most important self-advocacy moves you can make. Even if you don\'t lead, you can speak to specific things you know better than anyone in the room: your own experience.'),
            h('div', { className: 'space-y-2' },
              IEP_MEETING_PREP.map(function(q, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, q.question),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, q.prep)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
            h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, 'If you don\'t have a plan but think you might need one'),
            h('ol', { className: 'space-y-2' },
              NO_PLAN_YET.map(function(s, i) {
                return h('li', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-amber-200 mb-1' }, (i + 1) + '. ' + s.step),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, s.body)
                );
              })
            )
          ),

          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-purple-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print IEP / 504 guide')
          )
        );
      }

      // ── Request Accommodations view ──
      function renderRequest() {
        var scripts = ACCOMMODATION_SCRIPTS[viewBand] || ACCOMMODATION_SCRIPTS.middle;
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83D\uDD28 Request Accommodations'),
          renderBandSelector(),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Accommodations aren\'t favors. They\'re what\'s built into your plan so you can actually access your education on equal footing. The tricky part is communicating what you need clearly enough that the other person can help.'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
            h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, 'Before you ask: quick decision questions'),
            h('div', { className: 'space-y-2' },
              ACCOMMODATION_DECISION.map(function(q, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, q.question),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, q.body)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-indigo-500/30' },
            h('h3', { className: 'text-sm font-black text-indigo-300 mb-3' }, 'Scripts for common situations'),
            h('div', { className: 'space-y-2' },
              scripts.map(function(s, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'flex justify-between items-baseline mb-1' },
                    h('span', { className: 'text-xs font-black text-indigo-200' }, s.need),
                    h('span', { className: 'text-xs text-indigo-400 italic ml-2' }, 'to: ' + s.to)
                  ),
                  h('div', { className: 'text-xs text-slate-100 leading-relaxed italic' }, s.script)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
            h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, 'Documentation habits'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Boring, essential, and worth building young. If accommodations get denied or a dispute arises, your documentation is the evidence.'),
            h('div', { className: 'space-y-2' },
              DOCUMENTATION_HABITS.map(function(h2, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-amber-200 mb-1' }, h2.habit),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, h2.body)
                );
              })
            )
          ),

          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-indigo-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print accommodation scripts')
          )
        );
      }

      // ── Disclosure Decisions view ──
      function renderDisclose() {
        // \u2500\u2500 Disclosure Decision Wizard \u2500\u2500
        // Walks the user through 4 questions, then renders a personalized
        // recommendation. State stored on toolData so refresh keeps progress.
        var dwAns = d.dwAns || {};
        var dwStep = d.dwStep != null ? d.dwStep : 0;
        function setDw(patch) { upd('dwAns', Object.assign({}, dwAns, patch)); }
        function setDwStep(n) { upd('dwStep', n); }
        function resetWizard() { upd({ dwAns: {}, dwStep: 0 }); }
        var DW_STEPS = [
          { key: 'audience', label: 'Who is the audience?', opts: [
            { id: 'teacher', label: 'Teacher / professor', tone: 'support' },
            { id: 'boss',    label: 'Employer / supervisor / interviewer', tone: 'business' },
            { id: 'friend',  label: 'Friend / dating partner', tone: 'personal' },
            { id: 'family',  label: 'Family member who hasn\'t known', tone: 'personal' },
            { id: 'medical', label: 'Doctor / counselor / clinician', tone: 'medical' },
            { id: 'public',  label: 'A wider audience (social media, classroom presentation)', tone: 'public' }
          ]},
          { key: 'goal', label: 'What\'s your goal?', opts: [
            { id: 'access',     label: 'Get an accommodation or specific support I need' },
            { id: 'context',    label: 'Help them understand my behavior so they don\'t misread it' },
            { id: 'trust',      label: 'Build authentic connection / be fully known' },
            { id: 'safety',     label: 'Address a safety concern (medication, allergy, seizure, etc.)' },
            { id: 'inform',     label: 'Educate / advocate (representation, awareness)' }
          ]},
          { key: 'trust', label: 'How well do you know this person?', opts: [
            { id: 'high',   label: 'Very well \u2014 I trust them with hard things' },
            { id: 'med',    label: 'Some \u2014 friendly but new to this kind of conversation' },
            { id: 'low',    label: 'Barely \u2014 colleague, classmate, or someone I just met' }
          ]},
          { key: 'risk', label: 'What\'s the realistic downside if it goes badly?', opts: [
            { id: 'minimal', label: 'Minimal \u2014 they might just be awkward' },
            { id: 'social',  label: 'Social \u2014 could be gossiped about or treated differently' },
            { id: 'practical', label: 'Practical \u2014 could affect grade, job, or evaluation' },
            { id: 'unknown', label: 'I genuinely don\'t know yet' }
          ]}
        ];
        function recommendation() {
          // Build a recommendation from the 4 inputs.
          var aud = dwAns.audience, goal = dwAns.goal, trust = dwAns.trust, risk = dwAns.risk;
          var level, levelLabel, headline, share, skip, sampleStart, sampleFull, cautions = [];
          // Level: minimal / functional / contextual / full
          var levelScore = 0;
          if (goal === 'access' || goal === 'safety') levelScore += 2;
          if (goal === 'context' || goal === 'inform') levelScore += 1;
          if (goal === 'trust') levelScore += 3;
          if (trust === 'high') levelScore += 2;
          if (trust === 'med') levelScore += 1;
          if (risk === 'minimal') levelScore += 1;
          if (risk === 'practical') levelScore -= 1;
          if (risk === 'unknown') levelScore -= 1;
          if (aud === 'public') levelScore -= 1;
          if (aud === 'medical') levelScore += 2;
          if (levelScore <= 1) { level = 'minimal'; levelLabel = 'Minimal \u2014 function only, no labels'; }
          else if (levelScore <= 3) { level = 'functional'; levelLabel = 'Functional \u2014 what you need, no diagnosis'; }
          else if (levelScore <= 5) { level = 'contextual'; levelLabel = 'Contextual \u2014 name the condition + what helps'; }
          else { level = 'full'; levelLabel = 'Full \u2014 diagnosis, story, what you\'re working on'; }
          // Headline based on audience
          if (aud === 'teacher')      headline = 'For a teacher, lead with what you NEED, not what you ARE.';
          else if (aud === 'boss')    headline = 'For an employer, frame disclosure around accommodations + your work, not your life story.';
          else if (aud === 'friend')  headline = 'For a friend or partner, you choose the pace. Disclosure can be staged over weeks.';
          else if (aud === 'family')  headline = 'Family disclosure is rarely a one-shot conversation. Plan for follow-ups.';
          else if (aud === 'medical') headline = 'Medical providers need full information to help you safely.';
          else                        headline = 'Wider audiences amplify both support and judgment. Be intentional about what you share.';
          // Share + skip recommendations
          if (level === 'minimal') {
            share = 'A specific request only ("I need to take notes on my laptop", "I sometimes need a quiet break").';
            skip = 'Diagnosis, history, family details, what therapy you\'re in.';
            sampleStart = '"Hey, I\'ve found that ___ helps me focus. Would that be okay?"';
            sampleFull = '"Hey [name], I work best when I can ___. Is that something we could try?"';
          } else if (level === 'functional') {
            share = 'What you need + a brief functional reason ("I have a focus condition; extra time on tests really helps").';
            skip = 'Specific diagnoses, medications, deepest struggles.';
            sampleStart = '"I have a learning difference that affects ___. Can we set up ___?"';
            sampleFull = '"I wanted to let you know I have a learning difference that mostly shows up as [trouble with ___]. The accommodation that really helps is [extra time on tests / preferential seating / etc.]. Is that something we can put in place?"';
          } else if (level === 'contextual') {
            share = 'The name of your condition + what it looks like for you + what helps + what you\'re still figuring out.';
            skip = 'Diagnosis pursuit history, your family\'s reaction, anything you wouldn\'t put in writing.';
            sampleStart = '"I have ADHD. Here\'s how it shows up for me, and here\'s what helps."';
            sampleFull = '"I have [diagnosis]. For me, it shows up as [specific functional things]. What helps me is [accommodations / strategies]. I wanted you to know because [reason \u2014 so you don\'t misread me / so we can work better together / so I can ask for ___].";';
          } else {
            share = 'The full story you\'re comfortable telling \u2014 diagnosis, journey, current state, what you\'re working on, how you want this person to show up.';
            skip = 'Anything you don\'t fully consent to sharing in this moment. "Full" doesn\'t mean "everything."';
            sampleStart = '"There\'s something I\'ve been wanting to share with you..."';
            sampleFull = '"There\'s something I\'ve been wanting to share with you. I have [diagnosis]. It\'s been part of my life since [when], and it shapes [how I think / how I feel in groups / how I work]. I\'m sharing because [you matter to me / I want our friendship to be real / so you understand]. I\'m not asking you to fix anything. Mostly I just want you to know."';
          }
          // Cautions
          if (aud === 'boss' && level === 'full') cautions.push('Employers usually do not need diagnosis details. Stick to what helps you do the job.');
          if (aud === 'public') cautions.push('Public disclosure cannot be undone. If you wouldn\'t want a future employer or partner to read this, post it more privately.');
          if (risk === 'practical') cautions.push('Higher-stakes settings (grades, jobs) \u2014 request accommodations through formal channels (504/IEP coordinator, HR) rather than casual conversation.');
          if (trust === 'low' && level !== 'minimal') cautions.push('Lower-trust audiences often respond better to functional disclosure than to full disclosure.');
          if (goal === 'safety') cautions.push('For safety-relevant info (medication, seizure, allergy), most people you spend time with should know. This is not optional in the way other disclosure can be.');
          return { level: level, levelLabel: levelLabel, headline: headline, share: share, skip: skip, sampleStart: sampleStart, sampleFull: sampleFull, cautions: cautions };
        }
        var allAnswered = DW_STEPS.every(function(s) { return dwAns[s.key]; });
        var rec = allAnswered ? recommendation() : null;

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83D\uDD11 Disclosure Decisions'),
          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-500/30' },
            h('h3', { className: 'text-sm font-black text-amber-200 mb-2' }, 'Core idea'),
            h('p', { className: 'text-xs text-slate-100 leading-relaxed' }, DISCLOSURE_CORE_IDEA)
          ),

          // \u2500\u2500 Decision wizard \u2500\u2500
          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-2 border-indigo-500/50' },
            h('div', { className: 'flex items-center justify-between mb-3 flex-wrap gap-2' },
              h('h3', { className: 'text-sm font-black text-indigo-200' }, '\uD83E\uDDED Disclosure Wizard \u2014 get a personalized recommendation'),
              (allAnswered || dwStep > 0) && h('button', {
                onClick: resetWizard,
                className: 'text-xs px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700',
                'aria-label': 'Restart wizard'
              }, '\u21BB Restart')
            ),
            !allAnswered && h('div', null,
              // Progress dots
              h('div', { className: 'flex gap-2 mb-4', 'aria-hidden': 'true' },
                DW_STEPS.map(function(_step, i) {
                  var done = !!dwAns[DW_STEPS[i].key];
                  var active = i === dwStep && !done;
                  return h('div', { key: i, className: 'h-1.5 flex-1 rounded',
                    style: { background: done ? '#10b981' : (active ? '#6366f1' : '#334155') } });
                })
              ),
              (function() {
                // Find next unanswered step
                var nextUnanswered = DW_STEPS.findIndex(function(s) { return !dwAns[s.key]; });
                if (nextUnanswered === -1) return null;
                var step = DW_STEPS[nextUnanswered];
                return h('div', null,
                  h('div', { className: 'text-xs font-bold text-indigo-300 mb-1' }, 'Question ' + (nextUnanswered + 1) + ' of ' + DW_STEPS.length),
                  h('div', { className: 'text-base font-black text-indigo-100 mb-3' }, step.label),
                  h('div', { role: 'radiogroup', 'aria-label': step.label, className: 'space-y-2' },
                    step.opts.map(function(opt) {
                      return h('button', {
                        key: opt.id,
                        role: 'radio',
                        'aria-checked': 'false',
                        onClick: function() {
                          var patch = {}; patch[step.key] = opt.id;
                          setDw(patch);
                          setDwStep(nextUnanswered + 1);
                        },
                        className: 'block w-full text-left p-3 rounded-lg bg-slate-900/60 border-2 border-slate-700 hover:border-indigo-400 hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm text-slate-100'
                      }, opt.label);
                    })
                  ),
                  nextUnanswered > 0 && h('button', {
                    onClick: function() {
                      var prev = DW_STEPS[nextUnanswered - 1];
                      var patch = {}; patch[prev.key] = undefined;
                      var nextAns = Object.assign({}, dwAns); delete nextAns[prev.key];
                      upd('dwAns', nextAns);
                      setDwStep(nextUnanswered - 1);
                    },
                    className: 'mt-3 text-xs text-slate-400 hover:text-slate-200',
                    'aria-label': 'Back to previous question'
                  }, '\u2190 Change previous answer')
                );
              })()
            ),
            // Recommendation
            allAnswered && rec && h('div', { className: 'space-y-3', 'aria-live': 'polite' },
              h('div', { className: 'p-4 rounded-lg bg-emerald-900/30 border-2 border-emerald-500/50' },
                h('div', { className: 'text-xs font-bold text-emerald-300 mb-1 uppercase tracking-wider' }, '\uD83C\uDFAF Recommended disclosure level'),
                h('div', { className: 'text-lg font-black text-emerald-100 mb-2' }, rec.levelLabel),
                h('p', { className: 'text-xs text-slate-200 italic' }, rec.headline)
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                h('div', { className: 'p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/30' },
                  h('div', { className: 'text-xs font-bold text-emerald-300 mb-1' }, '\u2713 What to share'),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, rec.share)
                ),
                h('div', { className: 'p-3 rounded-lg bg-amber-900/20 border border-amber-500/30' },
                  h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, '\u2716 What to skip'),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, rec.skip)
                )
              ),
              h('div', { className: 'p-4 rounded-lg bg-slate-900/60 border border-indigo-500/30' },
                h('div', { className: 'text-xs font-bold text-indigo-300 mb-2' }, '\uD83D\uDDE3\uFE0F Sample script \u2014 pick one to start, expand if welcomed'),
                h('div', { className: 'space-y-2' },
                  h('div', { className: 'p-2 rounded bg-slate-800/60' },
                    h('div', { className: 'text-xs text-slate-400 mb-1' }, 'Brief opener:'),
                    h('div', { className: 'text-sm text-slate-100 italic font-mono' }, rec.sampleStart)
                  ),
                  h('div', { className: 'p-2 rounded bg-slate-800/60' },
                    h('div', { className: 'text-xs text-slate-400 mb-1' }, 'Fuller version (if the conversation goes well):'),
                    h('div', { className: 'text-sm text-slate-100 italic' }, rec.sampleFull)
                  )
                )
              ),
              rec.cautions.length > 0 && h('div', { className: 'p-3 rounded-lg bg-rose-900/20 border border-rose-500/40' },
                h('div', { className: 'text-xs font-bold text-rose-300 mb-2' }, '\u26A0 Things to consider'),
                h('ul', { className: 'space-y-1 text-xs text-slate-200 list-disc list-inside' },
                  rec.cautions.map(function(c, i) { return h('li', { key: i }, c); })
                )
              ),
              h('div', { className: 'text-xs text-slate-400 italic text-center pt-2' },
                'This is a starting point, not a verdict. You always get the final say. Many people change their disclosure choices over time.'
              )
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-indigo-500/30' },
            h('h3', { className: 'text-sm font-black text-indigo-300 mb-3' }, 'By audience'),
            h('div', { className: 'space-y-2' },
              DISCLOSURE_AUDIENCES.map(function(a, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-indigo-200 mb-1' }, a.audience),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-emerald-300' }, 'What they need: '), a.whatTheyNeed),
                  h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-amber-300' }, 'What to skip: '), a.whatNotToShare),
                  h('div', { className: 'space-y-1' },
                    a.scripts.map(function(s, j) {
                      return h('div', { key: j, className: 'p-2 rounded bg-slate-800/70 border-l-2 border-indigo-500/50' },
                        h('div', { className: 'text-xs font-bold text-indigo-300 mb-1' }, s.level),
                        h('div', { className: 'text-xs text-slate-200 italic' }, s.text)
                      );
                    })
                  )
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Timing choices'),
            h('div', { className: 'space-y-2' },
              DISCLOSURE_TIMING.map(function(t, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, t.timing),
                  h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-purple-300' }, 'When: '), t.when),
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-1 mt-1' },
                    h('div', { className: 'text-xs p-1 rounded bg-emerald-900/20 text-slate-200' }, h('strong', { className: 'text-emerald-300' }, 'Pros: '), t.pros),
                    h('div', { className: 'text-xs p-1 rounded bg-rose-900/20 text-slate-200' }, h('strong', { className: 'text-rose-300' }, 'Cons: '), t.cons)
                  )
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
            h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'A note about pressure'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Sometimes adults, peers, or the "culture" of a place can make you feel you SHOULD disclose more than you want to. You don\'t. Disclosure serves YOU. If it\'s not serving you, you don\'t have to do it. Coming back to this page when you\'re under pressure can be a useful check.')
          ),

          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-indigo-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print disclosure guide')
          )
        );
      }

      // ── Escalate view ──
      function renderEscalate() {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83D\uDEA8 When Things Go Wrong'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Most problems resolve at the first level: a direct conversation with the person involved. But if that doesn\'t work, you have more options. Knowing them matters, even if you never use them. The point isn\'t to start at level 9; the point is to know that level 9 exists.'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/30' },
            h('h3', { className: 'text-sm font-black text-rose-300 mb-3' }, 'Escalation levels'),
            h('div', { className: 'space-y-2' },
              ESCALATION_LEVELS.map(function(l) {
                return h('div', { key: l.level, className: 'p-3 rounded bg-slate-900/60 border-l-4 border-rose-500/50' },
                  h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, 'Level ' + l.level + ': ' + l.name),
                  h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-rose-300' }, 'Who: '), l.who),
                  h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-rose-300' }, 'When: '), l.when),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-rose-300' }, 'How: '), l.how),
                  h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-rose-300' }, 'Timeline: '), l.timeline),
                  h('div', { className: 'text-xs text-slate-300 italic' }, h('strong', { className: 'text-rose-300 not-italic' }, 'If stuck: '), l.nextIfStuck)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-emerald-900/40 to-sky-900/40 border border-emerald-500/30' },
            h('h3', { className: 'text-sm font-black text-emerald-200 mb-3' }, 'Escalation tips'),
            h('div', { className: 'space-y-2' },
              ESCALATION_TIPS.map(function(t, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, t.tip),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, t.body)
                );
              })
            )
          ),

          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-rose-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print escalation guide')
          )
        );
      }

      // ── Transition view ──
      function renderTransition() {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83C\uDF9F\uFE0F Transition to Adulthood'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'At 18 you become your own legal agent for education decisions. At graduation, IEP services end. At college or work, nobody reaches out; you self-identify. This shift is bigger than most 17-year-olds realize. Starting now is not too early.'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
            h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'Transition milestones'),
            h('div', { className: 'space-y-2' },
              TRANSITION_MILESTONES.map(function(m, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'flex justify-between items-baseline mb-1' },
                    h('span', { className: 'text-xs font-black text-sky-200' }, m.event),
                    h('span', { className: 'text-xs text-sky-400 italic ml-2' }, 'Age ' + m.age)
                  ),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-sky-300' }, 'Prep: '), m.prep),
                  h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-sky-300' }, 'Rights: '), m.rights)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'High school vs. college — the shift'),
            h('div', { className: 'space-y-2' },
              COLLEGE_VS_HS.map(function(c, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-purple-200 mb-2' }, c.dimension),
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                    h('div', { className: 'p-2 rounded bg-indigo-900/20 border border-indigo-500/30' },
                      h('div', { className: 'text-xs font-bold text-indigo-300 mb-1' }, 'High school'),
                      h('div', { className: 'text-xs text-slate-200' }, c.hs)
                    ),
                    h('div', { className: 'p-2 rounded bg-rose-900/20 border border-rose-500/30' },
                      h('div', { className: 'text-xs font-bold text-rose-300 mb-1' }, 'College'),
                      h('div', { className: 'text-xs text-slate-200' }, c.college)
                    )
                  )
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
            h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, 'Workplace rights'),
            h('div', { className: 'space-y-2' },
              WORKPLACE_RIGHTS.map(function(w, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, w.topic),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, w.body)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-500/30' },
            h('h3', { className: 'text-sm font-black text-sky-200 mb-3' }, 'Telling your story'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'One of the longest-running self-advocacy projects is the narrative you build about yourself: what happened, what you did about it, what you learned, where you\'re going. You\'ll use this story in applications, interviews, new relationships, sometimes with your own future self.'),
            h('div', { className: 'space-y-2' },
              TELLING_YOUR_STORY.map(function(p, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, p.principle),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
                );
              })
            )
          ),

          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-sky-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print transition guide')
          )
        );
      }

      // ── Practice view ──
      function renderPractice() {
        var scenarios = PRACTICE_SCENARIOS[viewBand] || PRACTICE_SCENARIOS.middle;
        var selected = pScenarioId ? scenarios.find(function(s) { return s.id === pScenarioId; }) : null;

        var selectScenario = function(id) {
          upd({ pScenarioId: id, pResponse: '', pCritique: '' });
        };
        var critique = function() {
          if (!callGemini) { addToast({ message: 'AI unavailable', type: 'error' }); return; }
          if (!selected) return;
          if (!pResponse || pResponse.length < 20) { addToast({ message: 'Write at least a sentence or two before asking for feedback.', type: 'warning' }); return; }
          upd({ pLoading: true, pCritique: '' });
          Promise.resolve(callGemini(buildPracticeCritiquePrompt(selected, pResponse, viewBand), false, false, 0.5, null))
            .then(function(resp) {
              var text = (typeof resp === 'string') ? resp : (resp && resp.text ? resp.text : String(resp));
              upd({ pLoading: false, pCritique: text });
              announceSR('Coaching feedback ready');
            })
            .catch(function(e) {
              upd({ pLoading: false, pCritique: 'Error: ' + (e && e.message ? e.message : 'unknown') });
            });
        };

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83C\uDFAF Practice Scenarios'),
          renderBandSelector(),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Pick a scenario. Read the situation. Write what you\'d actually say or do. Get AI coaching on what\'s strong and where it could be stronger. Not a test. The point is to build muscle for real conversations.'),

          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2', role: 'radiogroup', 'aria-label': 'Choose a practice scenario' },
            scenarios.map(function(s) {
              var sel = pScenarioId === s.id;
              return h('button', {
                key: s.id,
                onClick: function() { selectScenario(s.id); },
                role: 'radio',
                'aria-checked': sel,
                'aria-label': s.title + '. Goal: ' + s.goal,
                className: 'text-left p-3 rounded-lg border-2 transition focus:ring-2 focus:ring-fuchsia-400 focus:outline-none ' + (sel ? 'bg-fuchsia-900/40 border-fuchsia-400' : 'bg-slate-800/60 border-slate-600 hover:border-fuchsia-500/50')
              },
                h('div', { className: 'text-sm font-black ' + (sel ? 'text-fuchsia-100' : 'text-fuchsia-200') }, s.title),
                h('div', { className: 'text-xs text-slate-300 mt-1' }, s.goal)
              );
            })
          ),

          selected && h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-fuchsia-500/30', 'aria-labelledby': 'practice-title' },
            h('h3', { className: 'text-sm font-black text-fuchsia-300 mb-2', id: 'practice-title' }, selected.title),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, h('strong', { className: 'text-fuchsia-300' }, 'Situation: '), selected.situation),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-3', id: 'practice-goal' }, h('strong', { className: 'text-fuchsia-300' }, 'Goal: '), selected.goal),
            h('label', { className: 'text-xs font-bold text-fuchsia-300 mb-1 block', htmlFor: 'practice-response' }, 'Write what you\'d say or do:'),
            h('textarea', {
              id: 'practice-response',
              value: pResponse,
              onChange: function(e) { upd('pResponse', e.target.value); },
              placeholder: 'Type your response as if you\'re in the situation. Don\'t worry about perfect wording.',
              rows: 8,
              'aria-describedby': 'practice-goal',
              className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
            }),
            h('div', { className: 'flex justify-between items-center mt-2 text-xs text-slate-400' },
              h('span', { 'aria-live': 'polite', 'aria-atomic': 'true' }, (pResponse || '').length + ' characters'),
              h('button', {
                onClick: critique,
                disabled: pLoading || !pResponse || pResponse.length < 20,
                'aria-busy': pLoading ? 'true' : 'false',
                'aria-label': pLoading ? 'Coaching feedback loading' : 'Get coaching feedback on your response',
                className: 'px-4 py-2 rounded-lg text-xs font-bold no-print ' + (pLoading || !pResponse || pResponse.length < 20 ? 'bg-slate-700 text-slate-400' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-500')
              }, pLoading ? 'Coaching…' : '\u2728 Get coaching feedback')
            ),
            pCritique && h('div', { className: 'mt-4 p-3 rounded bg-slate-900/70 border border-emerald-500/30', role: 'region', 'aria-label': 'Coach feedback', 'aria-live': 'polite' },
              h('div', { className: 'text-xs font-bold text-emerald-300 mb-2' }, 'Coach feedback'),
              h('pre', { className: 'text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed' }, pCritique)
            )
          ),

          h('section', { className: 'p-3 rounded-xl bg-slate-900/60 border border-indigo-500/20 text-xs text-slate-300' },
            h('strong', null, 'No AI grades you. '), 'This is practice, not assessment. The AI coach is a sounding board. Your own sense of what feels right is the final call.'
          )
        );
      }

      // ── Meeting Prep view ──
      function renderMeeting() {
        var m = d.meeting || {};
        var updM = function(patch) {
          upd({ meeting: Object.assign({}, m, patch) });
        };
        var clearMeeting = function() {
          if (typeof window !== 'undefined' && window.confirm && !window.confirm('Clear the meeting worksheet? This can\'t be undone.')) return;
          upd({ meeting: {} });
        };
        var selectedType = MEETING_TYPES.find(function(t) { return t.id === m.meetingType; });
        var typeLabel = selectedType ? selectedType.name : (m.meetingType === 'other' && m.otherType ? m.otherType : 'meeting');

        var textField = function(field, label, placeholder, rows, color) {
          var fieldId = 'meeting-' + field;
          return h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-' + color + '-500/30 no-print' },
            h('label', { className: 'text-sm font-black text-' + color + '-300 mb-2 block', htmlFor: fieldId }, label),
            h('textarea', {
              id: fieldId,
              value: m[field] || '',
              onChange: function(e) { var o = {}; o[field] = e.target.value; updM(o); },
              placeholder: placeholder,
              rows: rows || 3,
              className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
            })
          );
        };

        var printable = h('div', { className: 'hidden print:block bg-white text-black p-8' },
          h('h1', { className: 'text-2xl font-bold mb-1' }, 'Meeting Prep: ' + typeLabel),
          m.meetingDate && h('div', { className: 'text-sm mb-1' }, 'Date: ' + m.meetingDate),
          m.studentName && h('div', { className: 'text-sm mb-4' }, 'Student: ' + m.studentName),
          m.attendees && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'Expected attendees'),
            h('p', { className: 'whitespace-pre-wrap' }, m.attendees)
          ),
          m.goals && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'My goals for this meeting'),
            h('p', { className: 'whitespace-pre-wrap' }, m.goals)
          ),
          m.working && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What has been working'),
            h('p', { className: 'whitespace-pre-wrap' }, m.working)
          ),
          m.notWorking && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What has not been working'),
            h('p', { className: 'whitespace-pre-wrap' }, m.notWorking)
          ),
          m.changes && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What I want to change'),
            h('p', { className: 'whitespace-pre-wrap' }, m.changes)
          ),
          m.keep && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What I want to keep the same'),
            h('p', { className: 'whitespace-pre-wrap' }, m.keep)
          ),
          m.nervous && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What I am nervous to say'),
            h('p', { className: 'whitespace-pre-wrap' }, m.nervous)
          ),
          m.questions && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'Questions I want to ask'),
            h('p', { className: 'whitespace-pre-wrap' }, m.questions)
          ),
          m.commitment && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'What I am committing to say'),
            h('p', { className: 'whitespace-pre-wrap' }, m.commitment)
          ),
          m.support && h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'Who I can talk to if things go sideways'),
            h('p', { className: 'whitespace-pre-wrap' }, m.support)
          ),
          h('section', { className: 'mb-4' },
            h('h2', { className: 'text-lg font-bold mb-1' }, 'Conversation starters (in your back pocket)'),
            h('ul', { className: 'list-disc list-inside text-sm' },
              CONVERSATION_STARTERS.map(function(s, i) { return h('li', { key: i }, s); })
            )
          ),
          h('footer', { className: 'mt-8 text-xs text-gray-600 border-t pt-2' }, 'This is my own preparation notes. It is not the formal record of the meeting.')
        );

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          printable,
          h('div', { className: 'no-print' },
            h('h2', { className: 'text-2xl font-black text-indigo-200 mb-1' }, '\uD83D\uDCDD Meeting Prep Worksheet'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, 'Fill in what applies. Skip what doesn\'t. When you\'re done, print it and bring it to the meeting. Even if you don\'t read from it out loud, having it in front of you can make a big difference.')
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-teal-500/30 grid grid-cols-1 md:grid-cols-2 gap-2 no-print', role: 'group', 'aria-label': 'Meeting basics' },
            h('div', null,
              h('label', { className: 'text-xs font-bold text-teal-300 mb-1 block', htmlFor: 'meeting-type' }, 'Meeting type'),
              h('select', {
                id: 'meeting-type',
                value: m.meetingType || '',
                onChange: function(e) { updM({ meetingType: e.target.value }); },
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              },
                h('option', { value: '' }, '-- choose --'),
                MEETING_TYPES.map(function(t) {
                  return h('option', { key: t.id, value: t.id }, t.name);
                })
              )
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-teal-300 mb-1 block', htmlFor: 'meeting-date' }, 'Meeting date'),
              h('input', {
                id: 'meeting-date',
                type: 'text', value: m.meetingDate || '',
                onChange: function(e) { updM({ meetingDate: e.target.value }); },
                placeholder: 'e.g., Friday Oct 15 at 2pm',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            ),
            m.meetingType === 'other' && h('div', { className: 'md:col-span-2' },
              h('label', { className: 'text-xs font-bold text-teal-300 mb-1 block', htmlFor: 'meeting-other' }, 'Other meeting type'),
              h('input', {
                id: 'meeting-other',
                type: 'text', value: m.otherType || '',
                onChange: function(e) { updM({ otherType: e.target.value }); },
                placeholder: 'Describe briefly',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            ),
            h('div', { className: 'md:col-span-2' },
              h('label', { className: 'text-xs font-bold text-teal-300 mb-1 block', htmlFor: 'meeting-student' }, 'Student name (if printing for someone else)'),
              h('input', {
                id: 'meeting-student',
                type: 'text', value: m.studentName || '',
                onChange: function(e) { updM({ studentName: e.target.value }); },
                placeholder: 'Your name, or leave blank',
                autoComplete: 'name',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            )
          ),

          textField('attendees', 'Who will be at the meeting?', 'Mom, Mrs. Smith (case manager), Ms. Jones (math teacher), Mr. Patel (principal), me. Anyone I want to invite but haven\'t yet?', 2, 'teal'),
          textField('goals', 'My goals for this meeting', 'What do I want to walk out with? One sentence is fine.', 3, 'emerald'),
          textField('working', 'What has been working since last meeting?', 'Be specific. Extended time on math tests is letting me finish. Break pass for social studies has helped.', 4, 'emerald'),
          textField('notWorking', 'What has not been working?', 'Be specific. Resource room pull-out during art is making me miss my favorite class. Sub teachers never know about my plan.', 4, 'amber'),
          textField('changes', 'What I want to change', 'What specifically? Fewer pull-outs? Different accommodations? Different goals? A different service time?', 3, 'amber'),
          textField('keep', 'What I want to keep the same', 'Sometimes meetings drift and important things get dropped. Name them first.', 2, 'sky'),
          textField('nervous', 'What I am nervous to say', 'Writing it down helps. Nobody else sees this unless you choose.', 3, 'rose'),
          textField('questions', 'Questions I want to ask', 'Why did the team pick that goal? How will we know if this is working? What happens if I still struggle? What if I change my mind later?', 3, 'indigo'),
          textField('commitment', 'What I am committing to say out loud', 'Even just one sentence you\'ll definitely say counts.', 2, 'violet'),
          textField('support', 'Who can I talk to if things go sideways during the meeting?', 'Advisor? Parent? Advocate? A teacher who knows you? Having a "call if needed" person makes the meeting less scary.', 2, 'slate'),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-violet-900/40 to-indigo-900/40 border border-violet-500/30 no-print' },
            h('h3', { className: 'text-sm font-black text-violet-200 mb-2' }, 'Conversation starters (practice before the meeting)'),
            h('p', { className: 'text-xs text-slate-300 mb-2' }, 'Memorize two or three. Having something prepared to say makes it way easier to say the next thing.'),
            h('ul', { className: 'space-y-1' },
              CONVERSATION_STARTERS.map(function(s, i) {
                return h('li', { key: i, className: 'p-2 rounded bg-slate-900/60 text-xs text-slate-100 italic' }, '\u201C' + s + '\u201D');
              })
            )
          ),

          h('div', { className: 'flex flex-wrap gap-2 pt-2 no-print' },
            h('button', {
              onClick: function() { window.print && window.print(); },
              className: 'flex-1 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-500'
            }, '\uD83D\uDDA8 Print worksheet / Save as PDF'),
            h('button', {
              onClick: clearMeeting,
              className: 'py-2 px-4 rounded-lg bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600'
            }, 'Clear worksheet')
          ),

          h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-teal-300' }, 'Before the meeting: '),
            'Show your completed worksheet to your parent or a trusted adult. They can help you figure out which parts to read aloud versus keep in your back pocket.'
          )
        );
      }

      // ── Letter Builder view ──
      function renderLetter() {
        var tid = d.letterTemplate || null;
        var template = tid ? LETTER_TEMPLATES.find(function(t) { return t.id === tid; }) : null;
        var fieldVals = (d.letterFields && d.letterFields[tid]) || {};
        var setField = function(fid, val) {
          var next = Object.assign({}, (d.letterFields || {}));
          next[tid] = Object.assign({}, next[tid] || {}, (function() { var o = {}; o[fid] = val; return o; })());
          upd('letterFields', next);
        };
        var output = template ? template.generate(fieldVals) : '';
        var copyOutput = function() {
          if (!output) return;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(output).then(function() {
              addToast({ message: 'Copied to clipboard', type: 'success' });
              announceSR('Letter copied to clipboard');
            }).catch(function() {
              addToast({ message: 'Couldn\'t copy. Select and copy manually.', type: 'warning' });
            });
          } else {
            addToast({ message: 'Copy not available. Select the text and copy manually.', type: 'warning' });
          }
        };

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200 no-print' }, '\u270F\uFE0F Letter & Email Builder'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed no-print' }, 'Pick a template. Fill in the fields for your specific situation. The generated letter appears below, ready to copy or print. Review it, edit as needed, and send.'),

          h('section', { className: 'p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 text-xs text-amber-100 no-print' },
            h('strong', null, 'A note on tone: '), 'Formal written requests should be calm, specific, and factual. Save opinions and emotions for verbal conversations. Written records get read by people you haven\'t met, including lawyers and judges if things escalate. Stay professional even when you\'re frustrated.'
          ),

          h('section', { className: 'no-print', role: 'radiogroup', 'aria-label': 'Choose a letter template' },
            h('div', { className: 'text-xs font-bold text-indigo-300 mb-2', id: 'letter-template-label' }, 'Choose a template'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
              LETTER_TEMPLATES.map(function(t) {
                var sel = tid === t.id;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd('letterTemplate', t.id); announceSR('Selected template: ' + t.name); },
                  role: 'radio',
                  'aria-checked': sel,
                  'aria-label': t.name + '. ' + t.whoWrites + '. ' + t.purpose,
                  className: 'text-left p-3 rounded-lg border-2 transition focus:ring-2 focus:ring-amber-400 focus:outline-none ' + (sel ? 'bg-amber-900/40 border-amber-400' : 'bg-slate-800/60 border-slate-600 hover:border-amber-500/50')
                },
                  h('div', { className: 'text-sm font-black ' + (sel ? 'text-amber-100' : 'text-amber-200') }, t.name),
                  h('div', { className: 'text-xs text-slate-300 mt-1' }, t.whoWrites + ' · ' + t.purpose)
                );
              })
            )
          ),

          template && h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30 no-print' },
            h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, 'Fill in the fields'),
            h('div', { className: 'space-y-2', role: 'group', 'aria-label': 'Letter fields for ' + template.name },
              template.fields.map(function(f) {
                var isLong = f.id === 'concerns' || f.id === 'topics' || f.id === 'disagreement' || f.id === 'areas' || f.id === 'examples' || f.id === 'impact' || f.id === 'request' || f.id === 'questions' || f.id === 'attendees';
                var fieldId = 'letter-' + tid + '-' + f.id;
                return h('div', { key: f.id },
                  h('label', { className: 'text-xs font-bold text-amber-200 mb-1 block', htmlFor: fieldId }, f.label),
                  isLong ? h('textarea', {
                    id: fieldId,
                    value: fieldVals[f.id] || '',
                    onChange: function(e) { setField(f.id, e.target.value); },
                    placeholder: f.placeholder,
                    rows: 3,
                    className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
                  }) : h('input', {
                    id: fieldId,
                    type: f.id === 'senderEmail' || f.id === 'senderContact' ? 'text' : 'text',
                    value: fieldVals[f.id] || '',
                    onChange: function(e) { setField(f.id, e.target.value); },
                    placeholder: f.placeholder,
                    className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
                  })
                );
              })
            )
          ),

          template && h('section', { className: 'p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30' },
            h('h3', { className: 'text-sm font-black text-emerald-300 mb-2 no-print' }, 'Generated letter'),
            h('pre', { className: 'text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed p-3 rounded bg-white text-black print:border-0 border border-slate-700' }, output),
            h('div', { className: 'flex flex-wrap gap-2 mt-3 no-print' },
              h('button', {
                onClick: copyOutput,
                className: 'flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500'
              }, '\uD83D\uDCCB Copy to clipboard'),
              h('button', {
                onClick: function() { window.print && window.print(); },
                className: 'flex-1 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-500'
              }, '\uD83D\uDDA8 Print / Save as PDF')
            )
          ),

          template && h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-amber-300' }, 'Before sending: '),
            'Read it aloud to make sure it sounds like you. Have a trusted adult or advocate review it if it\'s a high-stakes request. Make sure you\'ve included specific dates and specific concerns, not just general complaints. Keep a copy for your records.'
          )
        );
      }

      // ── Resource Library view ──
      function renderResources() {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83D\uDCDA Resource Library'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Curated resources organized by category. Crisis resources first. Everything here is free or has free tiers unless noted.'),
          RESOURCE_CATEGORIES.map(function(cat) {
            var colorClass = cat.urgent ? 'rose' : (cat.id === 'maine' ? 'emerald' : 'slate');
            return h('section', { key: cat.id, className: 'p-4 rounded-xl bg-slate-800/60 border border-' + colorClass + '-500/30' },
              h('h3', { className: 'text-sm font-black text-' + colorClass + '-200 mb-3' }, (cat.urgent ? '\uD83D\uDEA8 ' : '') + cat.name),
              h('div', { className: 'space-y-2' },
                cat.resources.map(function(r, i) {
                  return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                    h('div', { className: 'flex justify-between items-baseline mb-1 gap-2 flex-wrap' },
                      h('span', { className: 'text-sm font-bold text-' + colorClass + '-200' }, r.name),
                      r.url && h('span', { className: 'text-xs text-' + colorClass + '-400 italic' }, r.url)
                    ),
                    h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, r.detail)
                  );
                })
              )
            );
          }),
          h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-indigo-300' }, 'A note on resources: '),
            'This list is curated but not exhaustive. Organizations change, websites move, and programs come and go. Verify before relying on something important. If you find a broken link or know of a great resource that should be added, tell your school counselor or an advocate so others can benefit.'
          ),
          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-slate-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print resource list')
          )
        );
      }

      // ── Rights Quick-Check Quiz ──
      function renderQuiz() {
        var qIdx = d.quizIdx || 0;
        var qAnswers = d.quizAnswers || {};
        var qRevealed = d.quizRevealed || {};
        var total = QUIZ_QUESTIONS.length;
        var done = qIdx >= total;

        var pick = function(i) {
          if (qRevealed[qIdx]) return;
          var nextA = Object.assign({}, qAnswers); nextA[qIdx] = i;
          var nextR = Object.assign({}, qRevealed); nextR[qIdx] = true;
          upd({ quizAnswers: nextA, quizRevealed: nextR });
          var curQ = QUIZ_QUESTIONS[qIdx];
          announceSR(i === curQ.correct ? 'Correct. ' + curQ.why : 'Not correct. The correct answer is: ' + curQ.options[curQ.correct] + '. ' + curQ.why);
        };
        var next = function() { upd('quizIdx', qIdx + 1); };
        var reset = function() {
          upd({ quizIdx: 0, quizAnswers: {}, quizRevealed: {} });
        };

        if (done) {
          var correct = 0;
          QUIZ_QUESTIONS.forEach(function(q, i) {
            if (qAnswers[i] === q.correct) correct++;
          });
          var pct = Math.round((correct / total) * 100);
          var label, tone;
          if (pct >= 90) { label = 'Rights Expert'; tone = 'emerald'; }
          else if (pct >= 75) { label = 'Solid Understanding'; tone = 'sky'; }
          else if (pct >= 50) { label = 'Getting There'; tone = 'amber'; }
          else { label = 'Time for Another Pass Through the Content'; tone = 'rose'; }

          return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
            h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83E\uDDE0 Rights Quiz Complete'),
            h('section', { className: 'p-5 rounded-xl bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 text-center' },
              h('div', { className: 'text-5xl font-black text-cyan-200 mb-2' }, correct + ' / ' + total),
              h('div', { className: 'text-sm text-slate-300 mb-3' }, pct + '% correct'),
              h('div', { className: 'text-lg font-black text-' + tone + '-300' }, label)
            ),
            h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
              h('h3', { className: 'text-sm font-black text-slate-200 mb-3' }, 'Review'),
              h('div', { className: 'space-y-2' },
                QUIZ_QUESTIONS.map(function(q, i) {
                  var yours = qAnswers[i];
                  var ok = yours === q.correct;
                  return h('div', { key: i, className: 'p-3 rounded-lg ' + (ok ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-rose-900/20 border border-rose-500/30') },
                    h('div', { className: 'flex justify-between items-start mb-1' },
                      h('span', { className: 'text-xs font-bold ' + (ok ? 'text-emerald-300' : 'text-rose-300') }, (ok ? '\u2713' : '\u2717') + ' Q' + (i + 1)),
                      h('span', { className: 'text-xs text-slate-400' }, 'Correct: ' + q.options[q.correct])
                    ),
                    h('div', { className: 'text-xs text-slate-200' }, q.q)
                  );
                })
              )
            ),
            h('div', { className: 'flex gap-2 no-print' },
              h('button', { onClick: reset, className: 'flex-1 py-2 rounded-lg bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-500' }, '\uD83D\uDD04 Retake quiz'),
              h('button', { onClick: function() { switchTab('rights', 'Know Your Rights'); }, className: 'flex-1 py-2 rounded-lg bg-slate-700 text-white text-sm font-bold hover:bg-slate-600' }, 'Review Rights module')
            )
          );
        }

        var cur = QUIZ_QUESTIONS[qIdx];
        var revealed = !!qRevealed[qIdx];
        var yours = qAnswers[qIdx];
        var correctIdx = cur.correct;

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
          h('div', { className: 'flex items-center justify-between' },
            h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83E\uDDE0 Rights Quick-Check Quiz'),
            h('span', { className: 'text-xs font-bold text-slate-400' }, 'Q ' + (qIdx + 1) + ' / ' + total)
          ),
          h('p', { className: 'text-xs text-slate-300' }, 'Pick the best answer. Get the explanation after you commit. No pressure, no grading.'),

          h('section', { className: 'p-5 rounded-xl bg-slate-800/60 border border-cyan-500/30', role: 'region', 'aria-labelledby': 'quiz-question-text' },
            h('div', { id: 'quiz-question-text', className: 'text-sm font-bold text-cyan-200 mb-3' }, cur.q),
            h('div', { className: 'space-y-2', role: 'group', 'aria-label': 'Answer choices' },
              cur.options.map(function(opt, i) {
                var picked = yours === i;
                var showCorrect = revealed && i === correctIdx;
                var showWrong = revealed && picked && i !== correctIdx;
                return h('button', {
                  key: i,
                  disabled: revealed,
                  onClick: function() { pick(i); },
                  className: 'w-full text-left p-3 rounded-lg border-2 transition focus:ring-2 focus:ring-cyan-400 focus:outline-none ' +
                    (showCorrect ? 'bg-emerald-600 border-emerald-600 text-white' :
                     showWrong ? 'bg-rose-600 border-rose-600 text-white' :
                     picked ? 'bg-cyan-700 border-cyan-600 text-white' :
                     'bg-slate-900/60 border-slate-600 text-slate-100 hover:bg-slate-800/60')
                },
                  h('div', { className: 'text-sm' }, String.fromCharCode(65 + i) + '. ' + opt)
                );
              })
            )
          ),

          revealed && h('section', { className: 'p-4 rounded-xl ' + (yours === correctIdx ? 'bg-emerald-900/30 border border-emerald-500/40' : 'bg-rose-900/30 border border-rose-500/40'), role: 'region', 'aria-label': yours === correctIdx ? 'Correct answer feedback' : 'Incorrect answer feedback' },
            h('div', { className: 'text-sm font-bold mb-2 ' + (yours === correctIdx ? 'text-emerald-300' : 'text-rose-300') },
              h('span', { 'aria-hidden': 'true' }, yours === correctIdx ? '\u2713 ' : '\u2717 '),
              yours === correctIdx ? 'Correct' : 'Not quite'
            ),
            h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, cur.why)
          ),

          revealed && h('div', { className: 'flex justify-end no-print' },
            h('button', {
              onClick: next,
              className: 'px-5 py-2 rounded-xl font-bold text-sm bg-cyan-600 text-white hover:bg-cyan-500'
            }, qIdx + 1 >= total ? 'See results \u2192' : 'Next question \u2192')
          )
        );
      }

      // ── Helping a Friend ──
      function renderFriend() {
        var scid = d.friendScenario || null;
        var fAnswers = d.friendAnswers || {};
        var selected = scid ? FRIEND_SCENARIOS.find(function(s) { return s.id === scid; }) : null;

        var pickScenario = function(id) {
          upd({ friendScenario: id });
        };
        var pickOption = function(scenarioId, optIdx) {
          var nextA = Object.assign({}, fAnswers);
          nextA[scenarioId] = optIdx;
          upd('friendAnswers', nextA);
        };

        var ratingStyles = {
          supportive: { badge: 'Supportive', color: 'emerald', icon: '\u2713' },
          dismissive: { badge: 'Dismissive', color: 'rose', icon: '\u2717' },
          reactive: { badge: 'Reactive', color: 'amber', icon: '\u26A0' },
          overfunctioning: { badge: 'Overstepping', color: 'orange', icon: '\u26A0' },
          wrong: { badge: 'Not recommended', color: 'rose', icon: '\u2717' },
          shaming: { badge: 'Shaming', color: 'rose', icon: '\u2717' },
          avoidant: { badge: 'Avoidant', color: 'amber', icon: '\u26A0' },
          prescriptive: { badge: 'Too prescriptive', color: 'amber', icon: '\u26A0' },
          'somewhat-helpful': { badge: 'Somewhat helpful', color: 'sky', icon: '\u2192' },
          'protective-but-risky': { badge: 'Protective but risky', color: 'amber', icon: '\u26A0' },
          'generous-but-limited': { badge: 'Generous but limited', color: 'sky', icon: '\u2192' }
        };

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83E\uDD1D Helping a Friend'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Self-advocacy isn\'t only about yourself. Supporting peers is part of the skill. These scenarios flip the perspective: a friend is facing something hard. Pick how you\'d respond. Get coaching on the difference between helpful and well-intended-but-overstepping.'),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-pink-900/40 to-rose-900/40 border border-pink-500/30' },
            h('h3', { className: 'text-sm font-black text-pink-200 mb-3' }, '7 principles for supporting a friend'),
            h('div', { className: 'space-y-2' },
              FRIEND_PRINCIPLES.map(function(p, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-pink-200 mb-1' }, (i + 1) + '. ' + p.principle),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
                );
              })
            )
          ),

          h('section', null,
            h('h3', { className: 'text-sm font-black text-rose-300 mb-2', id: 'friend-scenario-pick-label' }, 'Scenarios'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2', role: 'radiogroup', 'aria-labelledby': 'friend-scenario-pick-label' },
              FRIEND_SCENARIOS.map(function(s) {
                var sel = scid === s.id;
                return h('button', {
                  key: s.id,
                  onClick: function() { pickScenario(s.id); announceSR('Selected scenario: ' + s.title); },
                  role: 'radio',
                  'aria-checked': sel,
                  className: 'text-left p-3 rounded-lg border-2 transition focus:ring-2 focus:ring-rose-400 focus:outline-none ' + (sel ? 'bg-rose-900/40 border-rose-400' : 'bg-slate-800/60 border-slate-600 hover:border-rose-500/50')
                },
                  h('div', { className: 'text-sm font-black ' + (sel ? 'text-rose-100' : 'text-rose-200') }, s.title)
                );
              })
            )
          ),

          selected && h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/30', 'aria-labelledby': 'friend-scenario-title' },
            h('h3', { className: 'text-sm font-black text-rose-200 mb-2', id: 'friend-scenario-title' }, selected.title),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-3' }, h('strong', { className: 'text-rose-300' }, 'Situation: '), selected.situation),
            h('div', { className: 'space-y-2', role: 'group', 'aria-label': 'Response options. Click any option to see coaching feedback.' },
              selected.options.map(function(opt, i) {
                var picked = fAnswers[selected.id] === i;
                var style = ratingStyles[opt.rating] || { badge: opt.rating, color: 'slate', icon: '\u2192' };
                return h('button', {
                  key: i,
                  onClick: function() { pickOption(selected.id, i); announceSR('You chose option ' + String.fromCharCode(65 + i) + ', rated as ' + style.badge + '. ' + opt.coaching); },
                  'aria-expanded': picked,
                  'aria-label': 'Option ' + String.fromCharCode(65 + i) + ': ' + opt.label,
                  className: 'w-full text-left p-3 rounded-lg border-2 transition focus:ring-2 focus:ring-rose-400 focus:outline-none ' + (picked ? 'bg-slate-900/80 border-' + style.color + '-400' : 'bg-slate-900/40 border-slate-600 hover:border-rose-500/40')
                },
                  h('div', { className: 'text-sm text-slate-100' }, String.fromCharCode(65 + i) + '. ' + opt.label),
                  picked && h('div', { className: 'mt-2 p-2 rounded bg-' + style.color + '-900/30 border border-' + style.color + '-500/40' },
                    h('span', { className: 'text-xs font-bold text-' + style.color + '-300' }, h('span', { 'aria-hidden': 'true' }, style.icon + ' '), style.badge + ': '),
                    h('span', { className: 'text-xs text-slate-200 italic' }, opt.coaching)
                  )
                );
              })
            )
          ),

          h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-pink-300' }, 'A note on limits: '),
            'If your friend shares something suggesting they\'re in immediate danger (self-harm, abuse, safety), that\'s beyond peer support. Tell a trusted adult even if your friend asks you not to. Keeping your friend alive beats keeping a promise of silence.'
          )
        );
      }

      // ── Journey (milestones + journal) ──
      function renderJourney() {
        var milestones = d.milestones || {};
        var entries = d.journalEntries || [];
        var draftType = d.journalDraftType || null;
        var draft = d.journalDraft || {};

        var toggleMilestone = function(id) {
          var next = Object.assign({}, milestones);
          if (next[id]) delete next[id]; else next[id] = new Date().toISOString().slice(0, 10);
          upd('milestones', next);
        };

        var startDraft = function(type) {
          upd({ journalDraftType: type, journalDraft: {} });
        };
        var cancelDraft = function() {
          upd({ journalDraftType: null, journalDraft: {} });
        };
        var setDraftField = function(fid, val) {
          var next = Object.assign({}, draft);
          next[fid] = val;
          upd('journalDraft', next);
        };
        var saveEntry = function() {
          if (!draftType) return;
          var tmpl = JOURNAL_PROMPT_TEMPLATES.find(function(t) { return t.id === draftType; });
          if (!tmpl) return;
          var hasContent = tmpl.fields.some(function(f) { return (draft[f.id] || '').trim(); });
          if (!hasContent) { addToast({ message: 'Write something before saving.', type: 'warning' }); return; }
          var entry = {
            id: 'e_' + Date.now(),
            date: new Date().toISOString().slice(0, 10),
            type: draftType,
            fields: Object.assign({}, draft)
          };
          var next = entries.slice();
          next.unshift(entry);
          upd({ journalEntries: next, journalDraftType: null, journalDraft: {} });
          announceSR('Entry saved');
        };
        var deleteEntry = function(id) {
          if (typeof window !== 'undefined' && window.confirm && !window.confirm('Delete this journal entry? Can\'t be undone.')) return;
          var next = entries.filter(function(e) { return e.id !== id; });
          upd('journalEntries', next);
        };

        // Count totals
        var totalMilestones = JOURNEY_STAGES.reduce(function(acc, st) { return acc + st.milestones.length; }, 0);
        var doneMilestones = Object.keys(milestones).length;
        var pctDone = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83D\uDDFA\uFE0F My Advocacy Journey'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Your personal space for tracking growth over time. Check off milestones as you reach them. Write short journal entries when something happens worth remembering. Nothing here is graded. You control what\'s in it, and you control who sees it.'),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-violet-900/40 to-fuchsia-900/40 border border-violet-500/30' },
            h('div', { className: 'flex justify-between items-baseline mb-2' },
              h('h3', { className: 'text-sm font-black text-violet-200' }, 'Milestones'),
              h('span', { className: 'text-xs text-violet-300' }, doneMilestones + ' / ' + totalMilestones + ' (' + pctDone + '%)')
            ),
            h('div', { className: 'h-2 rounded-full bg-slate-800 overflow-hidden mb-3' },
              h('div', { className: 'h-full bg-violet-500', style: { width: pctDone + '%' } })
            ),
            h('p', { className: 'text-xs text-slate-300 italic mb-3' }, 'These aren\'t a ranking or a race. Everyone moves through them in their own order at their own pace. "Expert" here just means you\'ve had more practice, not that you\'re better than someone earlier in the journey.'),
            h('div', { className: 'space-y-3' },
              JOURNEY_STAGES.map(function(stage) {
                var stageDone = stage.milestones.filter(function(m) { return milestones[m.id]; }).length;
                return h('div', { key: stage.stage, className: 'p-3 rounded bg-slate-900/60 border border-' + stage.color + '-500/30' },
                  h('div', { className: 'flex justify-between items-baseline mb-2' },
                    h('h4', { className: 'text-xs font-black text-' + stage.color + '-200' }, stage.stage),
                    h('span', { className: 'text-xs text-' + stage.color + '-400' }, stageDone + ' / ' + stage.milestones.length)
                  ),
                  h('div', { className: 'space-y-1' },
                    stage.milestones.map(function(m) {
                      var checked = !!milestones[m.id];
                      var dateLabel = (checked && typeof milestones[m.id] === 'string') ? ' (checked off on ' + milestones[m.id] + ')' : '';
                      return h('button', {
                        key: m.id,
                        onClick: function() { toggleMilestone(m.id); },
                        role: 'checkbox',
                        'aria-checked': checked,
                        'aria-label': (checked ? 'Checked: ' : 'Not checked: ') + m.text + dateLabel,
                        className: 'w-full text-left p-2 rounded text-xs transition flex items-start gap-2 focus:ring-2 focus:ring-' + stage.color + '-400 focus:outline-none ' + (checked ? 'bg-' + stage.color + '-900/40 border border-' + stage.color + '-500/40' : 'bg-slate-800/40 border border-slate-700 hover:bg-slate-800/70')
                      },
                        h('span', { className: 'text-sm ' + (checked ? 'text-' + stage.color + '-300' : 'text-slate-300'), 'aria-hidden': 'true' }, checked ? '\u2611' : '\u2610'),
                        h('span', { className: checked ? 'text-slate-100' : 'text-slate-300' }, m.text),
                        checked && milestones[m.id] && typeof milestones[m.id] === 'string' && h('span', { className: 'ml-auto text-xs text-' + stage.color + '-400' }, milestones[m.id])
                      );
                    })
                  )
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-fuchsia-500/30' },
            h('h3', { className: 'text-sm font-black text-fuchsia-300 mb-3' }, 'Journal'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'When something advocacy-related happens, come here. A few sentences is enough. Over time you\'ll see a record of your own growth.'),

            !draftType && h('div', { className: 'flex flex-wrap gap-2 mb-3 no-print' },
              JOURNAL_PROMPT_TEMPLATES.map(function(t) {
                return h('button', {
                  key: t.id,
                  onClick: function() { startDraft(t.id); },
                  className: 'flex-1 py-2 px-3 rounded-lg bg-fuchsia-700/50 border border-fuchsia-500/40 text-white text-xs font-bold hover:bg-fuchsia-600/60'
                }, '+ ' + t.label);
              })
            ),

            draftType && (function() {
              var tmpl = JOURNAL_PROMPT_TEMPLATES.find(function(t) { return t.id === draftType; });
              if (!tmpl) return null;
              return h('div', { className: 'p-3 rounded-lg bg-slate-900/60 border border-fuchsia-500/40 space-y-2 no-print', role: 'group', 'aria-label': 'New journal entry: ' + tmpl.label },
                h('div', { className: 'text-xs font-bold text-fuchsia-300 mb-2' }, 'New entry: ' + tmpl.label),
                tmpl.fields.map(function(f) {
                  var fid = 'journal-' + draftType + '-' + f.id;
                  return h('div', { key: f.id },
                    h('label', { className: 'text-xs font-bold text-slate-200 mb-1 block', htmlFor: fid }, f.label),
                    h('textarea', {
                      id: fid,
                      value: draft[f.id] || '',
                      onChange: function(e) { setDraftField(f.id, e.target.value); },
                      placeholder: f.placeholder,
                      rows: 3,
                      className: 'w-full p-2 rounded bg-slate-800/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
                    })
                  );
                }),
                h('div', { className: 'flex gap-2' },
                  h('button', {
                    onClick: saveEntry,
                    className: 'flex-1 py-2 rounded-lg bg-fuchsia-600 text-white text-xs font-bold hover:bg-fuchsia-500'
                  }, 'Save entry'),
                  h('button', {
                    onClick: cancelDraft,
                    className: 'py-2 px-4 rounded-lg bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600'
                  }, 'Cancel')
                )
              );
            })(),

            h('div', { className: 'mt-3' },
              entries.length === 0 ? h('div', { className: 'p-4 rounded bg-slate-900/40 text-center text-xs text-slate-400 italic' }, 'No entries yet. Your first one will live here.') :
              h('div', { className: 'space-y-2' },
                entries.map(function(entry) {
                  var tmpl = JOURNAL_PROMPT_TEMPLATES.find(function(t) { return t.id === entry.type; });
                  return h('div', { key: entry.id, className: 'p-3 rounded bg-slate-900/60 border border-slate-700' },
                    h('div', { className: 'flex justify-between items-baseline mb-1' },
                      h('span', { className: 'text-xs font-bold text-fuchsia-300' }, tmpl ? tmpl.label : entry.type),
                      h('span', { className: 'text-xs text-slate-400' }, entry.date)
                    ),
                    tmpl && tmpl.fields.map(function(f) {
                      var val = (entry.fields || {})[f.id];
                      if (!val || !val.trim()) return null;
                      return h('div', { key: f.id, className: 'text-xs mt-1' },
                        h('span', { className: 'text-slate-400' }, f.label + ': '),
                        h('span', { className: 'text-slate-100 whitespace-pre-wrap' }, val)
                      );
                    }),
                    h('button', {
                      onClick: function() { deleteEntry(entry.id); },
                      className: 'mt-2 text-xs text-rose-400 hover:text-rose-300 no-print'
                    }, 'Delete')
                  );
                })
              )
            )
          ),

          h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-violet-300' }, 'A reminder: '), 'This journal lives inside your tool. If you want to share an entry with a teacher, counselor, or parent, you choose when and how. Skim through old entries once in a while; you might be surprised how far you\'ve come.'
          )
        );
      }

      // ── Accommodation Card view ──
      function renderCard() {
        var c = d.card || {};
        var updC = function(patch) {
          upd({ card: Object.assign({}, c, patch) });
        };
        var clearCard = function() {
          if (typeof window !== 'undefined' && window.confirm && !window.confirm('Clear the card? This can\'t be undone.')) return;
          upd('card', {});
        };
        var accomList = (c.accommodations || '').split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });

        var printable = h('div', { className: 'hidden print:block' },
          h('div', { className: 'bg-white text-black p-4 mx-auto', style: { width: '3.5in', height: '2in', border: '2px solid black', boxSizing: 'border-box' } },
            h('div', { className: 'text-xs font-bold', style: { borderBottom: '1px solid #888', paddingBottom: '2px', marginBottom: '4px' } }, (c.name || 'Name') + ' — ' + (c.grade || 'Grade') + ' · ' + (c.school || 'School')),
            h('div', { className: 'text-xs font-bold mb-1' }, 'My Accommodations (' + (c.planType || 'Plan') + '):'),
            h('ul', { className: 'text-xs', style: { listStyle: 'disc', paddingLeft: '16px', margin: 0, lineHeight: '1.2' } },
              (accomList.length ? accomList : ['(Add accommodations)']).slice(0, 6).map(function(a, i) { return h('li', { key: i }, a); })
            ),
            h('div', { className: 'text-xs', style: { marginTop: '4px', fontStyle: 'italic', fontSize: '9px' } }, 'Contact: ' + (c.contact || 'Case manager') + (c.caseManagerEmail ? ' · ' + c.caseManagerEmail : ''))
          )
        );

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          printable,
          h('div', { className: 'no-print' },
            h('h2', { className: 'text-2xl font-black text-indigo-200 mb-1' }, '\uD83D\uDCB3 Accommodation Card'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, 'A wallet-sized reference. Fill in the fields, print, and trim to business-card size. Keep it in your backpack, wallet, or phone case. When a sub teacher or anyone else doesn\'t know your plan, you can hand it over. Low drama, high clarity.')
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30 grid grid-cols-1 md:grid-cols-2 gap-2 no-print', role: 'group', 'aria-label': 'Accommodation card details' },
            h('div', null,
              h('label', { className: 'text-xs font-bold text-amber-300 mb-1 block', htmlFor: 'card-name' }, 'My name (first + last initial)'),
              h('input', {
                id: 'card-name',
                type: 'text', value: c.name || '',
                onChange: function(e) { updC({ name: e.target.value }); },
                placeholder: 'e.g., Alex R.',
                autoComplete: 'name',
                'aria-describedby': 'card-name-help',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              }),
              h('span', { id: 'card-name-help', className: 'selfadv-sr-only' }, 'Use first name plus last initial to keep the card semi-private.')
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-amber-300 mb-1 block', htmlFor: 'card-grade' }, 'Grade'),
              h('input', {
                id: 'card-grade',
                type: 'text', value: c.grade || '',
                onChange: function(e) { updC({ grade: e.target.value }); },
                placeholder: '7th',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-amber-300 mb-1 block', htmlFor: 'card-school' }, 'School'),
              h('input', {
                id: 'card-school',
                type: 'text', value: c.school || '',
                onChange: function(e) { updC({ school: e.target.value }); },
                placeholder: 'King Middle',
                autoComplete: 'organization',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-amber-300 mb-1 block', htmlFor: 'card-plan' }, 'Plan type'),
              h('select', {
                id: 'card-plan',
                value: c.planType || '',
                onChange: function(e) { updC({ planType: e.target.value }); },
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              },
                h('option', { value: '' }, '-- choose --'),
                h('option', { value: 'IEP' }, 'IEP'),
                h('option', { value: '504' }, '504 Plan'),
                h('option', { value: 'Medical' }, 'Medical'),
                h('option', { value: 'Other' }, 'Other')
              )
            ),
            h('div', { className: 'md:col-span-2' },
              h('label', { className: 'text-xs font-bold text-amber-300 mb-1 block', htmlFor: 'card-accom' }, 'Key accommodations (one per line, up to 6)'),
              h('textarea', {
                id: 'card-accom',
                value: c.accommodations || '',
                onChange: function(e) { updC({ accommodations: e.target.value }); },
                placeholder: 'Extended time (1.5x)\nQuiet testing environment\nBreak access\nPreferential seating (front)\nLaptop for notes',
                rows: 5,
                'aria-describedby': 'card-accom-help',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
              }),
              h('div', { id: 'card-accom-help', className: 'text-xs text-slate-300 mt-1', 'aria-live': 'polite' }, (accomList.length) + ' accommodation(s). Keep it short. The back of the card can have more detail if needed.')
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-amber-300 mb-1 block', htmlFor: 'card-contact' }, 'Who to contact'),
              h('input', {
                id: 'card-contact',
                type: 'text', value: c.contact || '',
                onChange: function(e) { updC({ contact: e.target.value }); },
                placeholder: 'Case manager name, or "504 coordinator"',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-amber-300 mb-1 block', htmlFor: 'card-email' }, 'Contact email (optional)'),
              h('input', {
                id: 'card-email',
                type: 'email', value: c.caseManagerEmail || '',
                onChange: function(e) { updC({ caseManagerEmail: e.target.value }); },
                placeholder: 'case.manager@school.edu',
                autoComplete: 'email',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            )
          ),

          // On-screen preview (not the print one)
          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30 no-print' },
            h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Preview (this is what will print)'),
            h('div', { className: 'mx-auto bg-white text-black border-2 border-black p-3', style: { width: '3.5in', maxWidth: '100%', height: '2in', boxSizing: 'border-box', fontSize: '11px', lineHeight: '1.2' } },
              h('div', { className: 'font-bold', style: { borderBottom: '1px solid #888', paddingBottom: '2px', marginBottom: '4px' } }, (c.name || '[Name]') + ' — ' + (c.grade || '[Grade]') + ' · ' + (c.school || '[School]')),
              h('div', { className: 'font-bold' }, 'My Accommodations (' + (c.planType || '[Plan]') + '):'),
              h('ul', { style: { listStyle: 'disc', paddingLeft: '16px', margin: '2px 0' } },
                (accomList.length ? accomList : ['(Add accommodations above)']).slice(0, 6).map(function(a, i) { return h('li', { key: i }, a); })
              ),
              h('div', { style: { marginTop: '4px', fontStyle: 'italic', fontSize: '9px' } }, 'Contact: ' + (c.contact || '[Contact]') + (c.caseManagerEmail ? ' · ' + c.caseManagerEmail : ''))
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30 no-print' },
            h('h3', { className: 'text-sm font-black text-slate-200 mb-3' }, 'Using your card'),
            h('div', { className: 'space-y-2' },
              CARD_USE_TIPS.map(function(t, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-amber-300 mb-1' }, t.title),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, t.body)
                );
              })
            )
          ),

          h('div', { className: 'flex flex-wrap gap-2 pt-2 no-print' },
            h('button', {
              onClick: function() { window.print && window.print(); },
              className: 'flex-1 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-500'
            }, '\uD83D\uDDA8 Print card'),
            h('button', {
              onClick: clearCard,
              className: 'py-2 px-4 rounded-lg bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600'
            }, 'Clear')
          )
        );
      }

      // ── Identity & Language view ──
      function renderIdentity() {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83C\uDF08 Identity & Language'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Self-advocacy isn\'t just procedures and scripts. Underneath sits a bigger set of questions: How do I think about my disability? What language fits me? How does this part of me connect with other parts? Who else is out there? You don\'t have to answer these all at once. You don\'t have to answer them like anyone else does. They\'re yours.'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Models of disability'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'There are different ways to think about what disability IS. Each has strengths and limits. You can hold parts of multiple, and your view can change over time.'),
            h('div', { className: 'space-y-2' },
              DISABILITY_MODELS.map(function(m, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, m.name),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-purple-300' }, 'Frame: '), m.frame),
                  h('div', { className: 'text-xs text-slate-300 italic mb-2' }, h('strong', { className: 'text-purple-300 not-italic' }, 'Example: '), m.example),
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                    h('div', { className: 'p-2 rounded bg-emerald-900/20 border border-emerald-500/30 text-xs text-slate-200' }, h('strong', { className: 'text-emerald-300' }, 'Strengths: '), m.strengths),
                    h('div', { className: 'p-2 rounded bg-amber-900/20 border border-amber-500/30 text-xs text-slate-200' }, h('strong', { className: 'text-amber-300' }, 'Limits: '), m.limits)
                  )
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-indigo-500/30' },
            h('h3', { className: 'text-sm font-black text-indigo-300 mb-3' }, 'Language guide'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'How you talk about your disability is your call. Different communities prefer different language. Here\'s what\'s out there and why.'),
            h('div', { className: 'space-y-2' },
              LANGUAGE_GUIDE.map(function(l, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-indigo-200 mb-1' }, l.term),
                  h('div', { className: 'text-xs text-slate-300 italic mb-1' }, 'Examples: ' + l.example),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-indigo-300' }, 'Preferred by: '), l.preferredBy),
                  h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-indigo-300' }, 'Why: '), l.rationale)
                );
              })
            ),
            h('div', { className: 'mt-3 p-3 rounded bg-emerald-900/30 border border-emerald-500/40 text-xs text-slate-200' },
              h('strong', { className: 'text-emerald-300' }, 'A working rule: '),
              'Ask the person which they prefer. If you can\'t ask (writing about a community), default to identity-first for groups whose self-advocacy organizations explicitly use it (autistic, Deaf, blind), and ask or default to person-first for groups where no clear consensus exists. Update when you learn.'
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/30' },
            h('h3', { className: 'text-sm font-black text-rose-300 mb-3' }, 'Intersectionality'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Disability never exists alone. It interacts with race, gender, sexuality, class, immigration, religion, family. Understanding the intersections is part of understanding yourself.'),
            h('div', { className: 'space-y-2' },
              INTERSECTION_EXAMPLES.map(function(ix, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, ix.lens),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, ix.body)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-200 mb-3' }, 'Reflection prompts'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'These don\'t need answers. Sit with the ones that catch your attention. They might shape what you write in your Journey journal someday.'),
            h('ul', { className: 'space-y-1 text-xs text-slate-200 list-disc list-inside' },
              IDENTITY_REFLECTIONS.map(function(r, i) {
                return h('li', { key: i, className: 'leading-relaxed' }, r);
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
            h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, 'Finding community'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Disability community changes things. Not in a "you\'ll be cured" way. In a "you\'re not alone, and these issues aren\'t yours to figure out solo" way. Here\'s where to look.'),
            h('div', { className: 'space-y-2' },
              FINDING_COMMUNITY.map(function(c, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, c.topic),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, c.body)
                );
              })
            )
          ),

          h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-purple-300' }, 'A note on this content: '),
            'It is shaped by disabled writers and self-advocates including autistic, Deaf, and disability-justice movements, and by school-psychology and clinical perspectives. It centers disabled voices where possible. If you\'re reading something here and it doesn\'t fit your experience, trust your experience first. Your identity is yours.'
          ),

          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-purple-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print this section')
          )
        );
      }

      // ── Glossary view ──
      function renderGlossary() {
        var filter = (d.glossaryFilter || '').toLowerCase().trim();
        var sorted = GLOSSARY.slice().sort(function(a, b) { return a.term.localeCompare(b.term); });
        var filtered = filter ? sorted.filter(function(g) {
          return g.term.toLowerCase().indexOf(filter) >= 0 || g.def.toLowerCase().indexOf(filter) >= 0;
        }) : sorted;
        var byLetter = {};
        filtered.forEach(function(g) {
          var ch = g.term.charAt(0).toUpperCase();
          if (!byLetter[ch]) byLetter[ch] = [];
          byLetter[ch].push(g);
        });
        var letters = Object.keys(byLetter).sort();

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83D\uDCD6 Quick Glossary'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'When you hit a word you don\'t know, look it up here. These are the terms used most often in the rest of the tool. The definitions are plain-language.'),
          h('div', { className: 'sticky top-0 z-10 bg-slate-900/90 backdrop-blur py-2 no-print', role: 'search', 'aria-label': 'Filter glossary' },
            h('label', { className: 'selfadv-sr-only', htmlFor: 'glossary-search' }, 'Filter glossary terms'),
            h('input', {
              id: 'glossary-search',
              type: 'search',
              value: d.glossaryFilter || '',
              onChange: function(e) { upd('glossaryFilter', e.target.value); },
              placeholder: 'Filter (try "504" or "rights")',
              'aria-describedby': 'glossary-results-count',
              className: 'w-full p-2 rounded bg-slate-800/80 border border-stone-500 text-xs text-slate-100'
            }),
            h('div', { id: 'glossary-results-count', className: 'text-xs text-slate-300 mt-1', 'aria-live': 'polite', 'aria-atomic': 'true' },
              filter ? (filtered.length + ' of ' + GLOSSARY.length + ' terms matching "' + filter + '"') : ''
            )
          ),
          filtered.length === 0 ? h('div', { className: 'p-6 rounded bg-slate-800/40 text-center text-sm text-slate-400' }, 'No terms match. Try a different word.') :
          letters.map(function(letter) {
            return h('section', { key: letter, className: 'space-y-2' },
              h('h3', { className: 'text-lg font-black text-stone-300 border-b border-stone-500/30 pb-1' }, letter),
              byLetter[letter].map(function(g, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-800/60 border border-stone-500/20' },
                  h('div', { className: 'text-sm font-black text-stone-100 mb-1' }, g.term),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, g.def)
                );
              })
            );
          }),
          h('div', { className: 'pt-4 no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-stone-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print glossary')
          )
        );
      }

      // ── Action Plan Builder view ──
      function renderActionPlan() {
        var ap = d.actionPlan || {};
        var updAP = function(patch) {
          upd({ actionPlan: Object.assign({}, ap, patch) });
        };
        var clearAP = function() {
          if (typeof window !== 'undefined' && window.confirm && !window.confirm('Clear the action plan? This can\'t be undone.')) return;
          upd('actionPlan', {});
        };
        var hasContent = !!(ap.goal || ap.step1 || ap.step2 || ap.step3);

        var field = function(id, prompt, placeholder, rows) {
          var fieldId = 'plan-' + id;
          return h('div', { className: 'no-print' },
            h('label', { className: 'text-xs font-bold text-lime-300 mb-1 block', htmlFor: fieldId }, prompt),
            h('textarea', {
              id: fieldId,
              value: ap[id] || '',
              onChange: function(e) { var o = {}; o[id] = e.target.value; updAP(o); },
              placeholder: placeholder,
              rows: rows || 2,
              className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
            })
          );
        };

        // Print template (small card)
        var printable = h('div', { className: 'hidden print:block' },
          h('div', { className: 'bg-white text-black p-6 mx-auto', style: { width: '5.5in', border: '2px solid black', boxSizing: 'border-box' } },
            h('h1', { className: 'text-lg font-bold mb-2' }, 'My Action Plan'),
            ap.goal && h('div', { className: 'mb-3' },
              h('div', { className: 'text-sm font-bold' }, 'My goal:'),
              h('div', { className: 'text-sm' }, ap.goal)
            ),
            ap.why && h('div', { className: 'mb-3 text-sm', style: { fontStyle: 'italic' } }, 'Why it matters: ' + ap.why),
            h('div', { className: 'mb-3' },
              h('div', { className: 'text-sm font-bold' }, 'My steps:'),
              h('ol', { className: 'text-sm', style: { listStyle: 'decimal', paddingLeft: '20px', margin: 0 } },
                ap.step1 && h('li', null, ap.step1),
                ap.step2 && h('li', null, ap.step2),
                ap.step3 && h('li', null, ap.step3)
              )
            ),
            ap.obstacle && h('div', { className: 'mb-2 text-sm' }, h('strong', null, 'Obstacle: '), ap.obstacle),
            ap.support && h('div', { className: 'mb-2 text-sm' }, h('strong', null, 'Who helps: '), ap.support),
            ap.checkin && h('div', { className: 'mb-2 text-sm' }, h('strong', null, 'Check-in: '), ap.checkin),
            ap.success && h('div', { className: 'mb-2 text-sm' }, h('strong', null, 'I\'ll know it\'s working when: '), ap.success)
          )
        );

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          printable,
          h('div', { className: 'no-print' },
            h('h2', { className: 'text-2xl font-black text-indigo-200 mb-1' }, '\uD83C\uDFAF Action Plan Builder'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, 'Self-advocacy in the abstract is overwhelming. Self-advocacy with one specific thing to work on for the next two weeks is doable. Pick one. Break it down. Set a check-in. Print it. Tape it somewhere you\'ll see it.')
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-lime-500/30 space-y-3 no-print' },
            field('goal', ACTION_PROMPTS.goal, ACTION_PROMPTS.goalPlaceholder, 2),
            field('why', ACTION_PROMPTS.why, ACTION_PROMPTS.whyPlaceholder, 2),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
              field('step1', ACTION_PROMPTS.step1, ACTION_PROMPTS.step1Placeholder, 3),
              field('step2', ACTION_PROMPTS.step2, ACTION_PROMPTS.step2Placeholder, 3),
              field('step3', ACTION_PROMPTS.step3, ACTION_PROMPTS.step3Placeholder, 3)
            ),
            field('obstacle', ACTION_PROMPTS.obstacle, ACTION_PROMPTS.obstaclePlaceholder, 2),
            field('support', ACTION_PROMPTS.support, ACTION_PROMPTS.supportPlaceholder, 2),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
              h('div', null,
                h('label', { className: 'text-xs font-bold text-lime-300 mb-1 block', htmlFor: 'plan-checkin' }, ACTION_PROMPTS.checkin),
                h('input', {
                  id: 'plan-checkin',
                  type: 'text', value: ap.checkin || '',
                  onChange: function(e) { updAP({ checkin: e.target.value }); },
                  placeholder: ACTION_PROMPTS.checkinPlaceholder,
                  className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
                })
              ),
              field('success', ACTION_PROMPTS.success, ACTION_PROMPTS.successPlaceholder, 2)
            )
          ),

          hasContent && h('section', { className: 'p-4 rounded-xl bg-slate-900/80 border border-lime-500/30 no-print' },
            h('h3', { className: 'text-sm font-black text-lime-300 mb-2' }, 'Preview'),
            h('div', { className: 'bg-white text-black p-4 rounded text-sm space-y-2' },
              ap.goal && h('div', null, h('strong', null, 'My goal: '), ap.goal),
              ap.why && h('div', { className: 'italic' }, 'Why it matters: ' + ap.why),
              (ap.step1 || ap.step2 || ap.step3) && h('div', null,
                h('strong', null, 'Steps:'),
                h('ol', { className: 'list-decimal list-inside ml-2' },
                  ap.step1 && h('li', null, ap.step1),
                  ap.step2 && h('li', null, ap.step2),
                  ap.step3 && h('li', null, ap.step3)
                )
              ),
              ap.obstacle && h('div', null, h('strong', null, 'Obstacle: '), ap.obstacle),
              ap.support && h('div', null, h('strong', null, 'Who helps: '), ap.support),
              ap.checkin && h('div', null, h('strong', null, 'Check-in: '), ap.checkin),
              ap.success && h('div', null, h('strong', null, 'I\'ll know it\'s working when: '), ap.success)
            )
          ),

          h('div', { className: 'flex flex-wrap gap-2 pt-2 no-print' },
            h('button', {
              onClick: function() { window.print && window.print(); },
              className: 'flex-1 py-2 rounded-lg bg-lime-600 text-white text-sm font-bold hover:bg-lime-500'
            }, '\uD83D\uDDA8 Print plan'),
            h('button', {
              onClick: clearAP,
              className: 'py-2 px-4 rounded-lg bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600'
            }, 'Clear plan')
          ),

          h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-lime-300' }, 'After your check-in: '),
            'Open your Journey journal and log what happened. Whether it worked or not, you\'ll learn something. Then come back here and start a new plan with what you learned.'
          )
        );
      }

      // ── Steady Yourself view ──
      function renderSteady() {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83E\uDDD8 Steady Yourself'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Self-advocacy isn\'t only about knowing your rights or having the right words. It\'s also emotional work. Anxiety before a meeting. Wanting to disappear mid-conversation. Replaying a hard moment for hours afterward. Wondering if you\'re actually making something up. This module names that work and offers tools.'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-teal-500/30' },
            h('h3', { className: 'text-sm font-black text-teal-300 mb-3' }, 'Before — calming nerves'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'In the hour before a meeting, exam, or hard conversation. Pick one. Don\'t try to do all five.'),
            h('div', { className: 'space-y-2' },
              BEFORE_TOOLS.map(function(t, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'flex justify-between items-baseline mb-1' },
                    h('span', { className: 'text-xs font-black text-teal-200' }, t.name),
                    h('span', { className: 'text-xs text-teal-400 italic' }, t.time)
                  ),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-teal-300' }, 'How: '), t.how),
                  h('div', { className: 'text-xs text-slate-300 italic' }, h('strong', { className: 'text-teal-300 not-italic' }, 'When it helps: '), t.whenItHelps)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
            h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, 'During — staying present in the moment'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Tools for the meeting itself. None of these require leaving the room. Most are unnoticeable to others.'),
            h('div', { className: 'space-y-2' },
              DURING_TOOLS.map(function(t, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-amber-200 mb-1' }, t.name),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-amber-300' }, 'How: '), t.how),
                  h('div', { className: 'text-xs text-slate-300 italic' }, h('strong', { className: 'text-amber-300 not-italic' }, 'Cue: '), t.cue)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'After — processing without spiraling'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'After a hard conversation, your nervous system needs to come down before your brain can think clearly. Body first, thinking second.'),
            h('div', { className: 'space-y-2' },
              AFTER_TOOLS.map(function(t, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, t.name),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-purple-300' }, 'How: '), t.how),
                  h('div', { className: 'text-xs text-slate-300 italic' }, h('strong', { className: 'text-purple-300 not-italic' }, 'When it helps: '), t.whenItHelps)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-rose-900/40 to-orange-900/40 border border-rose-500/30' },
            h('h3', { className: 'text-sm font-black text-rose-200 mb-3' }, 'Trusting yourself when adults dismiss you'),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-3' }, 'The "self" in self-advocacy includes trusting your own perception. Sometimes the adults around you will tell you you\'re wrong about your own experience. That\'s where this section meets you.'),
            h('div', { className: 'space-y-2' },
              TRUSTING_YOURSELF.map(function(t, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, t.situation),
                  h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-rose-300' }, 'What\'s true: '), t.truth),
                  h('div', { className: 'text-xs text-slate-100 italic p-2 rounded bg-slate-800/70 border-l-2 border-emerald-500/40' }, h('strong', { className: 'text-emerald-300 not-italic' }, 'If pushed: '), t.ifPushed)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
            h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'When this isn\'t enough'),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'These are tools, not therapy. If anxiety is constant rather than situational, if processing meetings takes days, if you\'re avoiding things that matter to you because the dread is too big, that\'s worth talking to a counselor or therapist about. Persistent anxiety responds well to specific therapy techniques (CBT, exposure, mindfulness-based therapies). You don\'t have to white-knuckle through this alone.')
          ),

          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-teal-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print this section')
          )
        );
      }

      // ── For Teachers view ──
      function renderTeacher() {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83C\uDF93 For Teachers'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'A guide for educators, advisors, school psychologists, and counselors using Self-Advocacy Studio with students. Designed to align with EL Education\'s HOWL framework and Crew model. The principle throughout: this is THEIR tool. Your job is to facilitate, model, and protect the conditions for student voice.'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-blue-500/30' },
            h('h3', { className: 'text-sm font-black text-blue-300 mb-3' }, 'Six teaching principles'),
            h('div', { className: 'space-y-2' },
              TEACHER_PRINCIPLES.map(function(p, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-blue-200 mb-1' }, (i + 1) + '. ' + p.title),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
            h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, '6-week curriculum scaffold'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'A starting point, not a script. Adjust pacing for your students and your context. Each week stands alone if you only have a few sessions; the full sequence builds.'),
            h('div', { className: 'space-y-2' },
              SUGGESTED_CURRICULUM.map(function(w, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-sm font-black text-emerald-200 mb-2' }, w.week),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-emerald-300' }, 'Goal: '), w.goal),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-emerald-300' }, 'Modules: '), w.modules),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-emerald-300' }, 'Activities: '), w.activities),
                  h('div', { className: 'text-xs text-slate-300 italic' }, h('strong', { className: 'text-emerald-300 not-italic' }, 'Crew note: '), w.crew)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30' },
            h('h3', { className: 'text-sm font-black text-blue-200 mb-3' }, 'Mapping to EL Education HOWLs'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'For schools using Habits of Work and Learning (King Middle and other EL schools), here\'s which modules fit which HOWL categories. Useful for justifying time spent and for tying student work to existing rubrics.'),
            h('div', { className: 'space-y-2' },
              HOWL_MAPPING.map(function(m, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-blue-200 mb-1' }, m.howl),
                  h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-blue-300' }, 'Modules: '), m.modules),
                  h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-blue-300' }, 'Why: '), m.rationale)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
            h('h3', { className: 'text-sm font-black text-rose-300 mb-3' }, 'Common pitfalls'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'These come up regularly when teachers introduce self-advocacy curricula. Naming them upfront helps avoid them.'),
            h('div', { className: 'space-y-2' },
              TEACHER_PITFALLS.map(function(p, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, p.pitfall),
                  h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-emerald-300' }, 'Instead: '), p.fix)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Self-reflection prompts (for you, the teacher)'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Self-advocacy curricula land best when the adult teaching them is also reflecting. These prompts are for you, not your students.'),
            h('ul', { className: 'space-y-1 text-xs text-slate-200 list-disc list-inside' },
              TEACHER_SELF_REFLECTION.map(function(r, i) {
                return h('li', { key: i, className: 'leading-relaxed' }, r);
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
            h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'A note on co-teaching this with a school psychologist'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'If your school has a school psychologist, counselor, or special education coordinator, invite them to co-facilitate at least the Rights and IEP modules. Their expertise on the law and on individual student plans is genuinely useful, and modeling collaboration across roles is itself a HOWL lesson for students. The companion tool to this one is the Assessment Literacy Lab in the STEM Lab, which has the parent/teacher/clinician-facing version of much of this content.')
          ),

          h('div', { className: 'no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-blue-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print teacher guide')
          )
        );
      }

      // ── Print Packet view ──
      function renderPacket() {
        var profile = d.profile || {};
        var card = d.card || {};
        var ap = d.actionPlan || {};
        var meeting = d.meeting || {};
        var milestones = d.milestones || {};
        var entries = d.journalEntries || [];
        var totalMile = JOURNEY_STAGES.reduce(function(acc, st) { return acc + st.milestones.length; }, 0);
        var doneMile = Object.keys(milestones).length;
        var today = new Date().toISOString().slice(0, 10);
        var packetName = profile.name || card.name || 'My';
        var profileAccomList = (card.accommodations || '').split('\n').map(function(s) { return s.trim(); }).filter(function(s) { return s; });

        // Inventory of what's filled in
        var hasProfile = !!(profile.name || profile.intro || (profile.strengths || []).length || (profile.helps || []).length);
        var hasCard = !!(card.name || card.accommodations);
        var hasPlan = !!(ap.goal || ap.step1);
        var hasMeeting = !!(meeting.meetingType || meeting.goals);
        var hasJourney = doneMile > 0 || entries.length > 0;
        var anyContent = hasProfile || hasCard || hasPlan || hasMeeting || hasJourney;

        // Build print content
        var printContent = h('div', { className: 'hidden print:block bg-white text-black p-6' },
          h('div', { className: 'mb-6 pb-3', style: { borderBottom: '2px solid black' } },
            h('h1', { className: 'text-2xl font-bold' }, packetName + '\'s Self-Advocacy Packet'),
            h('div', { className: 'text-sm' }, 'Printed: ' + today)
          ),

          hasProfile && h('section', { className: 'mb-6' },
            h('h2', { className: 'text-lg font-bold mb-2', style: { borderBottom: '1px solid #ccc', paddingBottom: '2px' } }, 'My Learning Profile'),
            profile.grade && h('div', { className: 'text-sm mb-2' }, profile.grade),
            profile.intro && h('p', { className: 'text-sm whitespace-pre-wrap mb-2' }, profile.intro),
            (profile.strengths || []).length > 0 && h('div', { className: 'mb-2' },
              h('div', { className: 'font-bold text-sm' }, 'Strengths:'),
              h('div', { className: 'text-sm' }, (profile.strengths || []).join(', '))
            ),
            (profile.helps || []).length > 0 && h('div', { className: 'mb-2' },
              h('div', { className: 'font-bold text-sm' }, 'What helps me learn:'),
              h('div', { className: 'text-sm' }, (profile.helps || []).join(', '))
            ),
            (profile.barriers || []).length > 0 && h('div', { className: 'mb-2' },
              h('div', { className: 'font-bold text-sm' }, 'What gets in the way:'),
              h('div', { className: 'text-sm' }, (profile.barriers || []).join(', '))
            ),
            profile.teachers && h('div', { className: 'mb-2 text-sm' }, h('strong', null, 'What I want teachers to know: '), profile.teachers),
            profile.hidden && h('div', { className: 'mb-2 text-sm' }, h('strong', null, 'What isn\'t obvious about me: '), profile.hidden),
            profile.wish && h('div', { className: 'mb-2 text-sm' }, h('strong', null, 'One thing I wish teachers understood: '), profile.wish)
          ),

          hasCard && h('section', { className: 'mb-6' },
            h('h2', { className: 'text-lg font-bold mb-2', style: { borderBottom: '1px solid #ccc', paddingBottom: '2px' } }, 'Accommodation Card'),
            h('div', { className: 'text-sm' }, (card.name || '') + ' — ' + (card.grade || '') + (card.school ? ', ' + card.school : '')),
            card.planType && h('div', { className: 'text-sm font-bold mt-2' }, card.planType + ' accommodations:'),
            profileAccomList.length > 0 && h('ul', { className: 'text-sm', style: { listStyle: 'disc', paddingLeft: '20px' } },
              profileAccomList.map(function(a, i) { return h('li', { key: i }, a); })
            ),
            (card.contact || card.caseManagerEmail) && h('div', { className: 'text-sm mt-2', style: { fontStyle: 'italic' } },
              'Contact: ' + (card.contact || '') + (card.caseManagerEmail ? ' · ' + card.caseManagerEmail : '')
            )
          ),

          hasPlan && h('section', { className: 'mb-6' },
            h('h2', { className: 'text-lg font-bold mb-2', style: { borderBottom: '1px solid #ccc', paddingBottom: '2px' } }, 'Current Action Plan'),
            ap.goal && h('div', { className: 'text-sm mb-2' }, h('strong', null, 'Goal: '), ap.goal),
            ap.why && h('div', { className: 'text-sm mb-2', style: { fontStyle: 'italic' } }, 'Why it matters: ' + ap.why),
            (ap.step1 || ap.step2 || ap.step3) && h('div', { className: 'mb-2' },
              h('div', { className: 'font-bold text-sm' }, 'Steps:'),
              h('ol', { className: 'text-sm', style: { listStyle: 'decimal', paddingLeft: '20px' } },
                ap.step1 && h('li', null, ap.step1),
                ap.step2 && h('li', null, ap.step2),
                ap.step3 && h('li', null, ap.step3)
              )
            ),
            ap.checkin && h('div', { className: 'text-sm' }, h('strong', null, 'Check-in: '), ap.checkin),
            ap.success && h('div', { className: 'text-sm' }, h('strong', null, 'Success looks like: '), ap.success)
          ),

          hasMeeting && h('section', { className: 'mb-6' },
            h('h2', { className: 'text-lg font-bold mb-2', style: { borderBottom: '1px solid #ccc', paddingBottom: '2px' } }, 'Meeting Prep'),
            meeting.meetingType && h('div', { className: 'text-sm' }, h('strong', null, 'For: '), (function() { var t = MEETING_TYPES.find(function(x) { return x.id === meeting.meetingType; }); return t ? t.name : meeting.meetingType; })() + (meeting.meetingDate ? ' on ' + meeting.meetingDate : '')),
            meeting.goals && h('div', { className: 'text-sm mt-2' }, h('strong', null, 'My goals: '), meeting.goals),
            meeting.changes && h('div', { className: 'text-sm mt-2' }, h('strong', null, 'What I want to change: '), meeting.changes),
            meeting.questions && h('div', { className: 'text-sm mt-2' }, h('strong', null, 'Questions I want to ask: '), meeting.questions)
          ),

          hasJourney && h('section', { className: 'mb-6' },
            h('h2', { className: 'text-lg font-bold mb-2', style: { borderBottom: '1px solid #ccc', paddingBottom: '2px' } }, 'Journey'),
            doneMile > 0 && h('div', { className: 'text-sm mb-3' },
              h('strong', null, 'Milestones reached: '),
              doneMile + ' of ' + totalMile + ' (' + Math.round((doneMile / totalMile) * 100) + '%)'
            ),
            entries.length > 0 && h('div', { className: 'text-sm' },
              h('div', { className: 'font-bold mb-1' }, 'Recent journal entries (' + Math.min(entries.length, 3) + ' most recent):'),
              entries.slice(0, 3).map(function(entry) {
                var tmpl = JOURNAL_PROMPT_TEMPLATES.find(function(t) { return t.id === entry.type; });
                return h('div', { key: entry.id, className: 'mb-2 pl-2', style: { borderLeft: '2px solid #ccc' } },
                  h('div', { className: 'font-bold text-xs' }, (tmpl ? tmpl.label : entry.type) + ' — ' + entry.date),
                  tmpl && tmpl.fields.map(function(f) {
                    var val = (entry.fields || {})[f.id];
                    if (!val || !val.trim()) return null;
                    return h('div', { key: f.id, className: 'text-xs' }, f.label + ': ' + val);
                  })
                );
              })
            )
          ),

          h('footer', { className: 'mt-8 text-xs', style: { borderTop: '1px solid #ccc', paddingTop: '6px', color: '#666' } },
            'This packet was created by ' + packetName + ' for personal use. Please respect privacy. Self-advocacy is a process; this is a snapshot.'
          )
        );

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          printContent,
          h('div', { className: 'no-print' },
            h('h2', { className: 'text-2xl font-black text-indigo-200 mb-2' }, '\uD83D\uDCE6 Print Packet'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, 'A combined printout of everything you\'ve filled in across the tool. Useful when you\'re going to a meeting with an advisor, parent, counselor, or new teacher who wants to understand who you are as a learner. The packet only includes things YOU\'ve created. Nothing here is auto-generated.')
          ),

          !anyContent && h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40 text-xs text-amber-100 no-print' },
            h('strong', null, 'You haven\'t filled in any personal content yet. '),
            'Start with the ',
            h('button', { onClick: function() { switchTab('profile', 'My Learning Profile'); }, className: 'underline font-bold text-amber-300 hover:text-amber-200' }, 'Learning Profile'),
            ', and come back here once you have some content to print.'
          ),

          anyContent && h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-zinc-500/30 no-print' },
            h('h3', { className: 'text-sm font-black text-zinc-200 mb-3' }, 'What\'s in your packet'),
            h('ul', { className: 'space-y-1 text-xs text-slate-200' },
              h('li', null, h('span', { 'aria-hidden': 'true' }, hasProfile ? '\u2611 ' : '\u2610 '), h('strong', null, 'Learning Profile: '), hasProfile ? 'included' : 'not yet started'),
              h('li', null, h('span', { 'aria-hidden': 'true' }, hasCard ? '\u2611 ' : '\u2610 '), h('strong', null, 'Accommodation Card: '), hasCard ? 'included' : 'not yet started'),
              h('li', null, h('span', { 'aria-hidden': 'true' }, hasPlan ? '\u2611 ' : '\u2610 '), h('strong', null, 'Action Plan: '), hasPlan ? 'included' : 'not yet started'),
              h('li', null, h('span', { 'aria-hidden': 'true' }, hasMeeting ? '\u2611 ' : '\u2610 '), h('strong', null, 'Meeting Prep: '), hasMeeting ? 'included' : 'not yet started'),
              h('li', null, h('span', { 'aria-hidden': 'true' }, hasJourney ? '\u2611 ' : '\u2610 '), h('strong', null, 'Journey: '), hasJourney ? (doneMile + ' milestones reached, ' + entries.length + ' journal entries (3 most recent will print)') : 'not yet started')
            )
          ),

          anyContent && h('div', { className: 'flex flex-wrap gap-2 pt-2 no-print' },
            h('button', {
              onClick: function() { window.print && window.print(); },
              className: 'flex-1 py-2 rounded-lg bg-zinc-600 text-white text-sm font-bold hover:bg-zinc-500'
            }, '\uD83D\uDDA8 Print packet'),
            h('a', {
              href: 'javascript:void(0)',
              onClick: function(e) { e.preventDefault(); window.print && window.print(); },
              className: 'py-2 px-4 rounded-lg bg-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-600 inline-flex items-center'
            }, 'Save as PDF (browser print dialog → Save as PDF)')
          ),

          anyContent && h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300 no-print' },
            h('strong', { className: 'text-zinc-300' }, 'Privacy: '),
            'This packet contains content you\'ve typed yourself. Nobody sees it unless you share it. The print/PDF stays on your device.'
          )
        );
      }

      // ── My Data view (privacy / export / import / reset) ──
      function renderData() {
        // Personal data fields we treat as the student's content
        var PERSONAL_FIELDS = ['profile', 'card', 'actionPlan', 'meeting', 'milestones', 'journalEntries', 'letterFields', 'big5Answers', 'pScenarioId', 'pResponse', 'pCritique'];
        // Stable settings we preserve across reset
        var SETTINGS_FIELDS = ['viewBand'];

        var allData = {};
        PERSONAL_FIELDS.forEach(function(k) {
          if (d[k] !== undefined) allData[k] = d[k];
        });

        var hasAnyData = false;
        PERSONAL_FIELDS.forEach(function(k) {
          var v = d[k];
          if (v == null) return;
          if (typeof v === 'string' && v.trim()) hasAnyData = true;
          else if (Array.isArray(v) && v.length > 0) hasAnyData = true;
          else if (typeof v === 'object' && Object.keys(v).length > 0) hasAnyData = true;
        });

        var doExport = function() {
          var payload = {
            tool: 'selfAdvocacyStudio',
            version: 1,
            exportedAt: new Date().toISOString(),
            data: allData
          };
          try {
            var json = JSON.stringify(payload, null, 2);
            var blob = new Blob([json], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'self-advocacy-studio-' + (new Date().toISOString().slice(0, 10)) + '.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }, 100);
            addToast({ message: 'Exported. Save the file somewhere safe.', type: 'success' });
            announceSR('Your data has been exported as a JSON file.');
          } catch (e) {
            addToast({ message: 'Export failed: ' + (e && e.message ? e.message : 'unknown error'), type: 'error' });
          }
        };

        var doImport = function(event) {
          var file = event.target.files && event.target.files[0];
          if (!file) return;
          if (typeof window !== 'undefined' && window.confirm && !window.confirm('Importing will REPLACE your current data with the data from the file. Continue?')) {
            event.target.value = '';
            return;
          }
          var reader = new FileReader();
          reader.onload = function(ev) {
            try {
              var parsed = JSON.parse(ev.target.result);
              if (!parsed || parsed.tool !== 'selfAdvocacyStudio' || !parsed.data) {
                addToast({ message: 'That doesn\'t look like a Self-Advocacy Studio export file.', type: 'error' });
                event.target.value = '';
                return;
              }
              var patch = {};
              PERSONAL_FIELDS.forEach(function(k) {
                if (parsed.data[k] !== undefined) patch[k] = parsed.data[k];
              });
              upd(patch);
              addToast({ message: 'Imported. Your previous data has been replaced.', type: 'success' });
              announceSR('Data import complete. Previous content was replaced.');
            } catch (e) {
              addToast({ message: 'Import failed: ' + (e && e.message ? e.message : 'invalid JSON'), type: 'error' });
            }
            event.target.value = '';
          };
          reader.onerror = function() {
            addToast({ message: 'Could not read the file.', type: 'error' });
            event.target.value = '';
          };
          reader.readAsText(file);
        };

        var doReset = function() {
          if (typeof window !== 'undefined' && window.confirm) {
            if (!window.confirm('Reset ALL your data? This wipes Learning Profile, Card, Action Plan, Meeting Prep, Journey milestones and journal entries, Letter drafts, Big 5 answers, and Practice responses. Cannot be undone unless you exported first. Continue?')) return;
            if (!window.confirm('Are you SURE? Last chance.')) return;
          }
          var clearPatch = {};
          PERSONAL_FIELDS.forEach(function(k) {
            if (k === 'milestones' || k === 'profile' || k === 'card' || k === 'actionPlan' || k === 'meeting' || k === 'big5Answers' || k === 'letterFields') clearPatch[k] = {};
            else if (k === 'journalEntries') clearPatch[k] = [];
            else clearPatch[k] = '';
          });
          // Also clear cached results
          clearPatch.pCritique = '';
          clearPatch.pScenarioId = null;
          upd(clearPatch);
          addToast({ message: 'Everything has been reset.', type: 'success' });
          announceSR('All your personal data has been cleared.');
        };

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          h('h2', { className: 'text-2xl font-black text-indigo-200' }, '\uD83D\uDD12 My Data'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Self-advocacy includes deciding what happens to information about you. This page gives you direct control: see what\'s here, take it with you, restore from a backup, or wipe everything. Nothing on this page sends data to any server.'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
            h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'Where your data lives'),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, 'Everything you\'ve typed in this tool — Learning Profile, Accommodation Card, Action Plan, Meeting Prep, Journey milestones, journal entries, Letter drafts, Big 5 answers, Practice responses — lives in your browser on this device.'),
            h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
              h('li', null, 'Switching devices means starting fresh unless you export first.'),
              h('li', null, 'Clearing your browser data wipes this tool\'s data too.'),
              h('li', null, 'Other people who use this device under your login can see this content. Use the school\'s privacy norms.'),
              h('li', null, 'AI features (Practice coaching) send only the text you submit; nothing is identifying unless you typed it in.')
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
            h('h3', { className: 'text-sm font-black text-sky-300 mb-2' }, 'Export your data'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Download everything as a JSON file. Save it somewhere safe (your school folder, a USB drive, your email). You can use it to restore later, or just keep it as a backup.'),
            h('button', {
              onClick: doExport,
              disabled: !hasAnyData,
              'aria-label': hasAnyData ? 'Export all your data as a JSON file download' : 'No data to export yet',
              className: 'px-5 py-2 rounded-lg font-bold text-sm ' + (hasAnyData ? 'bg-sky-600 text-white hover:bg-sky-500' : 'bg-slate-700 text-slate-400 cursor-not-allowed')
            }, '\uD83D\uDCE5 Download my data (.json)'),
            !hasAnyData && h('div', { className: 'text-xs text-slate-300 mt-2 italic' }, 'Nothing to export yet. Fill in some content first.')
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
            h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Import a backup'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Have a previous export from this tool? Pick the JSON file to restore. Importing replaces whatever\'s in the tool right now.'),
            h('label', { htmlFor: 'data-import-file', className: 'inline-flex items-center px-5 py-2 rounded-lg font-bold text-sm bg-amber-600 text-white hover:bg-amber-500 cursor-pointer' }, '\uD83D\uDCE4 Choose a backup file'),
            h('input', {
              id: 'data-import-file',
              type: 'file',
              accept: '.json,application/json',
              onChange: doImport,
              className: 'sr-only'
            })
          ),

          h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
            h('h3', { className: 'text-sm font-black text-rose-300 mb-2' }, 'Reset everything'),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-3' }, 'Clear all your personal content from this tool. Useful if: you\'re finishing a school year and want a fresh start, you\'re using a shared device and want to remove your data before the next person uses it, or you want to retake an inventory without your old answers showing.'),
            h('p', { className: 'text-xs text-amber-200 mb-3' }, h('strong', null, 'Heads up: '), 'This cannot be undone unless you exported first. Two confirmation dialogs will protect you from accidents.'),
            h('button', {
              onClick: doReset,
              disabled: !hasAnyData,
              'aria-label': hasAnyData ? 'Reset all personal data, with two confirmation dialogs' : 'Nothing to reset',
              className: 'px-5 py-2 rounded-lg font-bold text-sm ' + (hasAnyData ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-slate-700 text-slate-400 cursor-not-allowed')
            }, '\uD83D\uDDD1\uFE0F Reset all my data'),
            !hasAnyData && h('div', { className: 'text-xs text-slate-300 mt-2 italic' }, 'Nothing to reset.')
          ),

          h('section', { className: 'p-3 rounded-lg bg-slate-900/60 border border-slate-600 text-xs text-slate-300' },
            h('strong', { className: 'text-indigo-300' }, 'On data ownership: '),
            'You should always be able to take your stuff with you. That\'s why this tool gives you a real export button, not a "your data is owned by us" arrangement. If you\'re going to college and want to start a learning profile there based on this one, export, then import on the new device.'
          )
        );
      }

      // ── Dispatcher ──
      var body;
      if (activeTab === 'profile') body = renderProfile();
      else if (activeTab === 'rights') body = renderRights();
      else if (activeTab === 'iep') body = renderIEP();
      else if (activeTab === 'request') body = renderRequest();
      else if (activeTab === 'disclose') body = renderDisclose();
      else if (activeTab === 'escalate') body = renderEscalate();
      else if (activeTab === 'transition') body = renderTransition();
      else if (activeTab === 'practice') body = renderPractice();
      else if (activeTab === 'meeting') body = renderMeeting();
      else if (activeTab === 'letter') body = renderLetter();
      else if (activeTab === 'resources') body = renderResources();
      else if (activeTab === 'quiz') body = renderQuiz();
      else if (activeTab === 'friend') body = renderFriend();
      else if (activeTab === 'journey') body = renderJourney();
      else if (activeTab === 'card') body = renderCard();
      else if (activeTab === 'identity') body = renderIdentity();
      else if (activeTab === 'glossary') body = renderGlossary();
      else if (activeTab === 'plan') body = renderActionPlan();
      else if (activeTab === 'steady') body = renderSteady();
      else if (activeTab === 'teacher') body = renderTeacher();
      else if (activeTab === 'packet') body = renderPacket();
      else if (activeTab === 'data') body = renderData();
      else body = renderMenu();

      return h('div', { className: 'selfadv-tool bg-slate-900 min-h-screen text-slate-100' },
        // Skip link for keyboard users (WCAG 2.4.1)
        h('a', {
          href: '#selfadv-main-content',
          className: 'selfadv-skip-link no-print',
          onClick: function(e) {
            e.preventDefault();
            var main = document.getElementById('selfadv-main-content');
            if (main && main.focus) { try { main.focus(); } catch(err) {} }
          }
        }, 'Skip to main content'),
        renderTabs(),
        h('main', {
          id: 'selfadv-main-content',
          tabIndex: -1,
          role: 'main',
          'aria-label': 'Self-Advocacy Studio main content',
          style: { outline: 'none' }
        }, body)
      );
    }
  });

  console.log('[SelHub Plugin] Loaded: sel_hub/sel_tool_selfadvocacy.js');
})();

} // end dedup guard
