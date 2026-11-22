// ═══════════════════════════════════════════════════════════════
// stem_tool_eligibility.js - Diagnosis, Evaluation & School Eligibility
//
// The most consequential confusion in school psychology: a DSM
// diagnosis is NOT IDEA eligibility. A child with an ADHD
// diagnosis is not automatically eligible; a child can qualify
// under IDEA with no diagnosis at all. Parents arrive at meetings
// believing the doctor's letter settles it, and staff often
// believe the same.
//
// ★★ WHY THIS TOOL EXISTS AND NOT A "DSM NAVIGATOR" ★★
// DSM-5-TR is copyrighted by the American Psychiatric Association
// and sold commercially. There is no lawful way to reproduce its
// criteria here, so this tool never tries: it explains what a
// diagnostic manual is FOR in our own words, and quotes the
// EDUCATIONAL side verbatim from law_corpus/ (34 CFR § 300.8),
// which is public. See LAW_NAV_AND_DSM_SCOPING.md.
//
// ★★ NEVER DECIDES ELIGIBILITY ★★
// The interactive asks which QUESTION a team still has to answer.
// It never returns "eligible" or "not eligible" — that is a team
// determination about a real child, and a tool that simulated it
// would be wrong in exactly the cases that matter most.
// (Same discipline as the Dispro Analyzer never declaring a finding.)
//
// Registered tool ID: "diagnosisEligibility"
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('diagnosisEligibility'))) {

(function() {
  'use strict';

  var CDN_BASE = 'https://alloflow-cdn.pages.dev/';
  function corpusUrl(path) {
    try {
      var loc = window.location || {};
      var host = loc.hostname || '', pathname = loc.pathname || '';
      var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(host);
      var isDesktopBundled = !!window._isDesktopBundledApp || (isLocalHost && pathname.indexOf('/app/') === 0);
      var isAlloHosted = /^alloflow-cdn\.pages\.dev$/i.test(host) || /^(?:(?:www|app|cdn)\.)?alloflow\.org$/i.test(host);
      if (isDesktopBundled) return new URL(path, loc.href).toString();
      if (isLocalHost || isAlloHosted) return new URL('/' + String(path).replace(/^\/+/, ''), loc.origin).toString();
    } catch (_) {}
    return CDN_BASE + String(path).replace(/^\/+/, '');
  }

  // The educational half of the comparison is quoted from the corpus, never
  // restated from memory. Shared module-scope cache, like the Law Navigator.
  var _idea = null, _ideaPending = null, _ideaErr = '';
  function loadIdea() {
    if (_idea) return Promise.resolve(_idea);
    if (_ideaPending) return _ideaPending;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function() { ctrl.abort(); }, 12000) : null;
    var clearT = function() { if (timer !== null) { clearTimeout(timer); timer = null; } };
    _ideaPending = fetch(corpusUrl('law_corpus/idea-part-b.json'), ctrl ? { cache: 'no-cache', signal: ctrl.signal } : { cache: 'no-cache' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(j) { clearT(); _idea = j; return j; })
      .catch(function(e) { clearT(); _ideaPending = null; _ideaErr = String(e.message || e); throw e; });
    return _ideaPending;
  }
  function section(num) {
    if (!_idea) return null;
    for (var i = 0; i < _idea.sections.length; i++) if (_idea.sections[i].number === num) return _idea.sections[i];
    return null;
  }
  // Pull the 13 category definitions out of § 300.8(c) as PUBLISHED. Each
  // reads "(N) <Name> means ...", so the name is taken from the text itself
  // rather than from a hardcoded list that could drift from the law.
  function categoriesFromCorpus() {
    var s = section('300.8');
    if (!s) return [];
    var out = [], seen = {};
    s.paragraphs.forEach(function(p) {
      // Category paragraphs open with "(N)" — but the name does not always sit
      // immediately after it. Three of the thirteen carry sub-markers:
      //   "(1)(i) Autism means …"
      //   "(4)(i) Emotional disturbance means …"
      //   "(10) Specific learning disability—(i) General. Specific learning
      //    disability means …"
      // Requiring "(N) Name means" found only 10 of 13. So: take the number
      // from the opening marker, then find the first "<Name> means" phrase.
      var num = p.match(/^\((\d{1,2})\)/);
      if (!num || seen[num[1]]) return;
      var nm = p.slice(0, 220).match(/([A-Z][A-Za-z\-' ]{2,44}?)\s+means\b/);
      if (!nm) return;
      seen[num[1]] = true;
      out.push({ n: num[1], name: nm[1].trim(), text: p });
    });
    return out;
  }

  // Framing content: our own words about how the systems differ.
  // No DSM text, no criteria, no diagnostic guidance, and no student data.
  var SUPPORT_PATHS = [
    {
      title: 'Clinical diagnosis and care',
      question: 'Does a presentation fit a recognized clinical condition, and what care may help?',
      owner: 'A qualified clinician working within their professional scope.',
      result: 'A clinical formulation or diagnosis and treatment recommendations. It can inform a school evaluation; it does not establish IDEA or Section 504 eligibility.'
    },
    {
      title: 'General education and MTSS',
      question: 'What instruction or support should be tried, monitored, and adjusted now?',
      owner: 'Educators and an intervention or student-support team, with family and student input.',
      result: 'Instruction, intervention, progress monitoring, and classroom supports. MTSS is not an eligibility category and may not be used to delay an evaluation when disability is suspected.'
    },
    {
      title: 'Section 504',
      question: 'Does a physical or mental impairment substantially limit a major life activity, and what regular or special education, related aids, or services are needed for equal access and FAPE?',
      owner: 'A group knowledgeable about the student, the evaluation data, and placement options.',
      result: 'Individualized regular or special education and related aids or services, often documented in a 504 plan. A medical diagnosis is not an automatic yes, an automatic no, or a required precondition.'
    },
    {
      title: 'IDEA and an IEP',
      question: 'Does the student meet an IDEA disability definition and, by reason of it, need special education and related services?',
      owner: 'The parent and a group of qualified professionals, using a comprehensive evaluation and multiple sources.',
      result: 'If eligible, an IEP team separately designs special education, related services, goals, supports, and placement. Eligibility alone does not prescribe a program or setting.'
    }
  ];
  var FRAMING = [
    {
      id: 'two-questions',
      title: 'A diagnosis, IDEA, and Section 504 answer different questions',
      body: 'A clinician classifies and treats a health or developmental condition. IDEA asks whether an evaluated student meets an educational disability definition and, by reason of it, needs special education and related services. Section 504 asks whether an impairment substantially limits a major life activity and what aids or services are needed for equal access and FAPE. The systems overlap, but none of these answers automatically supplies either of the others.'
    },
    {
      id: 'two-prong',
      title: 'IDEA\'s federal definition joins two requirements',
      body: 'Under 34 CFR 300.8, the student must be evaluated as having one of the listed disabilities AND, "by reason thereof," need special education and related services. Both, not either. Many category definitions and state criteria also address adverse educational effect; that phrase should not be turned into an invented universal third prong. A student who needs only a related service and not special education generally is not eligible under IDEA, unless that service is treated as special education under state standards.'
    },
    {
      id: 'grades-mtss',
      title: 'Passing grades and MTSS do not close Child Find',
      body: 'IDEA Child Find expressly includes students suspected of disability and need even when they advance from grade to grade. Evaluation looks at functional, developmental, and academic information - not a report card alone. RTI, MTSS, screening, an attendance plan, or informal accommodations can provide valuable data, but none may be used to delay or deny an evaluation when the district suspects disability and possible need.'
    },
    {
      id: 'section-504',
      title: 'Section 504 is broader than an accommodations list',
      body: 'Section 504 is a civil-rights law with its own evaluation and FAPE requirements. It can require regular or special education and related aids and services designed to meet a student\'s individual educational needs as adequately as the needs of nondisabled students are met. A diagnosis does not automatically qualify a student, and federal guidance does not require a medical diagnosis as a precondition. If the school team determines that a medical assessment is necessary to complete its evaluation, the school must ensure that assessment at no cost to the family.'
    },
    {
      id: 'outside-evaluations',
      title: 'Outside reports, private evaluations, and IEEs',
      body: 'A diagnosis letter is evidence, not a school decision. Under IDEA, a parent-shared independent educational evaluation obtained at private expense and meeting agency criteria must be considered, but the team is not required to adopt its conclusions. If a parent disagrees with the district\'s evaluation and requests an IEE at public expense, the district must without unnecessary delay either fund it or file due process to defend its evaluation. Reports are most useful when they describe methods, limits, strengths, functioning across settings, and the evidence behind recommendations.'
    },
    {
      id: 'three-decisions',
      title: 'Eligibility, services, and placement are separate decisions',
      body: 'An eligibility category is not a service prescription, severity rank, identity, classroom placement, or diagnosis crosswalk. After an IDEA eligibility decision, the IEP team uses present levels and individual need to design goals, special education, related services, supplementary aids, and placement in the least restrictive environment. Section 504 services are likewise individualized. Start with need, not a label-to-program shortcut.'
    },
    {
      id: 'scope-review',
      title: 'Eligibility can change while a diagnosis remains',
      body: 'Schools review current educational need; clinicians may continue to use a diagnosis even when school impact, supports, or service needs change. IDEA reevaluation and Section 504 periodic reevaluation revisit the educational question rather than erasing a clinical history. This guide focuses on U.S. public elementary and secondary schools. IDEA Part C for children under three and postsecondary disability services use different rules and processes.'
    }
  ];

  var PROCESS_STEPS = [
    { title: '1. Concern and Child Find', body: 'Document the concern, strengths, settings, current supports, and why disability may be suspected. A parent may request an evaluation; the district also has an affirmative Child Find duty.' },
    { title: '2. Notice, consent, and an evaluation plan', body: 'For an IDEA initial evaluation, the district gives notice and seeks informed parental consent. The evaluation must be sufficiently comprehensive, use trained personnel and appropriate measures, cover all suspected areas, and not rely on one test or score. Federal IDEA generally uses 60 days after consent unless the state has its own timeframe or an exception applies.' },
    { title: '3. Gather information from multiple sources', body: 'Use parent and student input, records, observations, instruction and intervention data, work samples, assessments, health and sensory information, and functional, developmental, academic, adaptive, social, emotional, communication, and motor information as relevant.' },
    { title: '4. Interpret and document together', body: 'The team documents and carefully considers information from all sources, explains conflicting data, and applies IDEA or Section 504 criteria. Under IDEA, lack of appropriate reading or math instruction or limited English proficiency cannot be the determinant factor.' },
    { title: '5. Make a written determination', body: 'Under IDEA, the parent receives the evaluation report and eligibility documentation at no cost. Prior Written Notice explains proposals or refusals concerning identification, evaluation, placement, or FAPE. State and district procedures may add forms and timelines.' },
    { title: '6. Plan services separately and review them', body: 'If IDEA eligible, an IEP is developed; if Section 504 FAPE is needed, the knowledgeable group determines individualized aids or services. General education and MTSS may continue alongside either path. Reevaluation and periodic review ask whether needs and supports have changed.' }
  ];

  var EVIDENCE_GUIDE = [
    { id: 'strengths', text: 'Strengths, interests, student voice, and family priorities - not only deficits.' },
    { id: 'functioning', text: 'Functional, developmental, and academic performance across classes, tasks, settings, and times of day.' },
    { id: 'access', text: 'Access and participation: communication, social interaction, executive functioning, behavior, attendance, stamina, sensory or physical access, adaptive skills, and independence as relevant.' },
    { id: 'instruction', text: 'What instruction, intervention, accommodations, or health supports were provided; whether they were implemented as intended; and how the student responded.' },
    { id: 'direct_data', text: 'Direct observations, work samples, progress-monitoring trends, attendance or discipline context, and assessment results with confidence, validity, and limitations.' },
    { id: 'context', text: 'Language, culture, disability access, opportunity to learn, and the quality of prior reading and math instruction. Measures should be appropriate and administered in the student\'s native language or other mode when feasible.' },
    { id: 'conflicts', text: 'Areas where sources agree, where they conflict, what remains unknown, and what additional information would actually resolve the open question.' }
  ];
  // Scenarios reveal several questions the team may still owe,
  // never a correct/incorrect eligibility determination.
  var QUESTIONS = [
    { id: 'q_cat', label: 'What IDEA definition or Section 504 threshold is actually being considered?' },
    { id: 'q_function', label: 'What is the functional, developmental, or academic impact across settings?' },
    { id: 'q_sdi', label: 'Does the student need specially designed instruction, related services, or other individualized aids?' },
    { id: 'q_data', label: 'What evidence is missing, conflicting, or not yet carefully considered?' },
    { id: 'q_factors', label: 'Could instruction, language, culture, attendance, access, or another factor explain the pattern?' }
  ];
  var SCENARIOS = [
    {
      id: 's1',
      text: 'A seventh grader has a new ADHD diagnosis from her pediatrician. She earns As and Bs, has friends, and turns work in on time. Her parents bring the letter and ask for an IEP.',
      questions: ['q_cat', 'q_function', 'q_sdi', 'q_data'],
      why: 'The diagnosis is relevant but does not establish an IDEA category, educational impact, need for specially designed instruction, or Section 504 services. Good grades are one source, not the whole evaluation. The team would need information across tasks and settings and should not assume that either an IEP or a 504 plan is required from the facts given.'
    },
    {
      id: 's2',
      text: 'A second grader has no diagnosis of any kind. He is two years behind in reading, has had targeted intervention for a year, and is making little progress.',
      questions: ['q_cat', 'q_function', 'q_sdi', 'q_data', 'q_factors'],
      why: 'No clinical diagnosis is required before an IDEA evaluation. The team still needs a comprehensive evaluation, evidence about the instruction and intervention actually delivered, consideration of determinant factors, and a decision about educational definition and need. MTSS data are useful evidence; they are not a reason to wait indefinitely.'
    },
    {
      id: 's3',
      text: 'A family brings a private neuropsychological report recommending specific services. The district\'s own evaluation reached different conclusions.',
      questions: ['q_cat', 'q_function', 'q_sdi', 'q_data'],
      why: 'The team should document how it considered the outside report, whether it meets agency criteria for an IEE, where methods or findings differ, and why it gives evidence particular weight. Recommendations do not bind the team. If the parent disagrees with the district evaluation, the public-expense IEE process may be relevant; a bare disagreement should not be treated as an eligibility verdict.'
    },
    {
      id: 's4',
      text: 'A ninth grader with an autism diagnosis is passing every class but has not spoken to a peer all year and eats lunch alone in the library.',
      questions: ['q_cat', 'q_function', 'q_sdi', 'q_data'],
      why: 'Passing classes does not end Child Find or substitute for evaluation. The team should examine communication, participation, relationships, student voice, distress, and functioning across settings, then ask what instruction, aids, or services - if any - are needed. The diagnosis and the lunch pattern are important data, but neither determines the outcome alone.'
    },
    {
      id: 's5',
      text: 'A student with diabetes keeps up academically but needs glucose monitoring, access to food and water, trained staff, and a plan for field trips and emergencies.',
      questions: ['q_function', 'q_sdi', 'q_data'],
      why: 'This illustrates why Section 504 is not limited to testing accommodations and why IDEA is not the only school pathway. A knowledgeable group would evaluate the impairment, substantial limitation, and individualized aids or services needed for access and FAPE. The facts do not establish an IDEA need for specially designed instruction.'
    },
    {
      id: 's6',
      text: 'A multilingual fourth grader has reading difficulty after interrupted schooling. Classroom data show uneven access to explicit reading instruction, and results differ sharply by language and task.',
      questions: ['q_cat', 'q_function', 'q_sdi', 'q_data', 'q_factors'],
      why: 'The team must evaluate rather than assume either disability or language difference. Measures, observations, instruction history, language proficiency, opportunity to learn, and response to appropriate instruction all matter. Limited English proficiency or lack of appropriate reading instruction cannot be the determinant factor for IDEA eligibility.'
    }
  ];

  var MEETING_QUESTIONS = [
    { id: 'decision_scope', text: 'What exact IDEA or Section 504 question is the team answering today?' },
    { id: 'suspected_areas', text: 'Which areas are suspected, and did the evaluation address every one of them?' },
    { id: 'student_family_voice', text: 'What do the student and family identify as strengths, barriers, priorities, and successful supports?' },
    { id: 'across_settings', text: 'What evidence describes performance and access across settings - not just grades or one test session?' },
    { id: 'instruction_response', text: 'What instruction and interventions were provided, with what fidelity and response?' },
    { id: 'access_context', text: 'How were language, culture, sensory or physical access, attendance, and opportunity to learn considered?' },
    { id: 'conflicting_sources', text: 'Where do sources disagree, and how did the team explain the weight given to each source?' },
    { id: 'idea_two_part', text: 'If IDEA is being considered, what evidence addresses both the educational disability definition and need for special education?' },
    { id: 'section_504_need', text: 'If Section 504 is being considered, what major life activity and what individualized aids or services are at issue?' },
    { id: 'separate_decisions', text: 'How are eligibility, services, goals, and placement being kept as separate decisions?' },
    { id: 'proposal_record', text: 'What was proposed or refused, why, what alternatives were considered, and where is that documented?' },
    { id: 'review_plan', text: 'What is the review date, and which state or district timeline applies?' },
    { id: 'report_documents', text: 'Did the parent receive the evaluation report and separate eligibility documentation at no cost?' },
    { id: 'pwn_contents', text: 'Does the Prior Written Notice identify the action, reasons, evidence relied upon, options rejected, other relevant factors, safeguards, and assistance sources?' },
    { id: 'participation_records', text: 'Was the parent given a meaningful opportunity to participate, examine relevant records, and understand the documents?' },
    { id: 'section_504_safeguards', text: 'For Section 504, what notice, records-access, impartial-hearing, and review procedures apply?' },
    { id: 'controlling_timeline', text: 'Which specific federal, state, or local timeline governs this step, and what event starts the clock?' }
  ];

  var DOCUMENT_GUIDE = [
    {
      title: 'Evaluation report, eligibility documentation, and Prior Written Notice are different',
      body: 'Under IDEA, the evaluation report describes the evaluation results and the eligibility documentation records the group\'s determination; both are provided to the parent at no cost. Prior Written Notice is separate. A reasonable time before the agency proposes or refuses to initiate or change identification, evaluation, educational placement, or FAPE, the notice explains the action and its basis.'
    },
    {
      title: 'A complete Prior Written Notice explains the decision trail',
      body: 'It identifies the action proposed or refused; why; each evaluation procedure, assessment, record, or report relied upon; procedural-safeguard information; assistance sources; other options considered and why they were rejected; and other relevant factors. It must be understandable to the general public and provided in the parent\'s native language or other communication mode unless clearly not feasible.'
    },
    {
      title: 'The IDEA procedural-safeguards notice is not Prior Written Notice',
      body: 'The safeguards notice explains rights involving consent, records, independent educational evaluations, complaints, mediation, hearings, discipline, and related procedures. It is generally provided once each school year and also at specified events, including an initial referral or parent evaluation request and whenever a parent requests a copy.'
    },
    {
      title: 'Section 504 has its own procedural safeguards',
      body: 'For public elementary and secondary programs, Section 504 requires a system that includes notice, an opportunity to examine relevant records, an impartial hearing with parent or guardian participation and representation by counsel, and a review procedure.'
    },
    {
      title: 'Ask which timeline controls this step',
      body: 'For an IDEA initial evaluation, the federal baseline is 60 days after parental consent or the state-established timeframe, subject to federal exceptions. IDEA reevaluations generally occur at least every three years and not more than once a year unless the parent and agency agree otherwise. Section 504 has no numeric federal evaluation deadline; it requires periodic reevaluation and reevaluation before a significant change in placement. State and local rules may be more specific.'
    }
  ];

  var FOLLOW_UP_CHECKS = [
    { id: 'reports', text: 'Ask for the evaluation report and separate eligibility documentation at no cost.' },
    { id: 'pwn', text: 'Review Prior Written Notice for the proposed or refused action, reasons, evidence, options rejected, other factors, safeguards, and assistance sources.' },
    { id: 'safeguards_notice', text: 'Confirm how to obtain the current IDEA procedural-safeguards notice and whom to contact for help understanding it.' },
    { id: 'participation', text: 'Confirm meaningful participation, communication access, and an opportunity to examine relevant records.' },
    { id: 'section_504', text: 'For Section 504, identify the district\'s notice, records-access, impartial-hearing, and review procedures.' },
    { id: 'timeline', text: 'Write down the controlling federal, state, or local timeline, the event that starts it, and the next review date.' }
  ];

  var STATE_LOCAL_CHECKS = [
    'Confirm the state initial-evaluation and reevaluation timelines and any report-delivery rule.',
    'Locate the district\'s evaluation criteria, IEE policy, procedural-safeguards notice, and assistance contacts.',
    'Arrange interpretation, translation, accessible formats, or another communication mode when needed.',
    'Identify the local form or record that will document proposals, refusals, follow-up responsibilities, and dates.'
  ];

  var PREP_SOURCE_URLS = [
    'https://sites.ed.gov/idea/regs/b/a/300.8',
    'https://sites.ed.gov/idea/regs/b/d/300.304',
    'https://sites.ed.gov/idea/regs/b/d/300.306',
    'https://sites.ed.gov/idea/regs/b/e/300.503',
    'https://sites.ed.gov/idea/regs/b/e/300.504',
    'https://www.ecfr.gov/current/title-34/subtitle-B/chapter-I/part-104/subpart-D/section-104.35',
    'https://www.ecfr.gov/current/title-34/subtitle-B/chapter-I/part-104/subpart-D/section-104.36'
  ];

  var SOURCE_REVIEWED_DATE = '2026-08-09';
  var SOURCE_REVIEWED_LABEL = 'Federal source links checked August 9, 2026.';

  function allPrepItemsSelected(items) {
    var selected = {};
    items.forEach(function(item) { selected[item.id] = true; });
    return selected;
  }
  function selectedPrepIds(items, selected) {
    return items.filter(function(item) { return !!selected[item.id]; }).map(function(item) { return item.id; });
  }
  function prepItemsById(items, ids) {
    var allowed = {};
    items.forEach(function(item) { allowed[item.id] = item.text; });
    return (ids || []).filter(function(id) { return Object.prototype.hasOwnProperty.call(allowed, id); })
      .map(function(id) { return allowed[id]; });
  }
  function buildMeetingPrepText(questionIds, evidenceIds, followUpIds) {
    var questions = prepItemsById(MEETING_QUESTIONS, questionIds);
    var evidence = prepItemsById(EVIDENCE_GUIDE, evidenceIds);
    var followUp = prepItemsById(FOLLOW_UP_CHECKS, followUpIds);
    var lines = [
      'Diagnosis, Evaluation & School Eligibility - Meeting Preparation Guide',
      SOURCE_REVIEWED_LABEL,
      '',
      'Purpose and privacy',
      'Checked means included in this guide - not satisfied, compliant, or eligible. This guide requests and saves no student names, diagnoses, notes, reports, or documents.',
      ''
    ];
    function addSection(title, items) {
      if (!items.length) return;
      lines.push(title);
      items.forEach(function(item) { lines.push('[ ] ' + item); });
      lines.push('');
    }
    addSection('Questions for the team', questions);
    addSection('Evidence to review', evidence);
    addSection('Documents and follow-up', followUp);
    addSection('State and local items to confirm', STATE_LOCAL_CHECKS);
    lines.push('Federal sources');
    PREP_SOURCE_URLS.forEach(function(url) { lines.push('- ' + url); });
    lines.push('Confirm the current federal text, controlling state rules, and local procedures.');
    lines.push('');
    lines.push('Educational information, not legal or clinical advice. This guide never diagnoses a student or decides eligibility, services, goals, or placement.');
    return lines.join('\n');
  }

  function fallbackCopyMeetingPrep(text) {
    if (typeof document === 'undefined' || !document.body) return false;
    var previousFocus = document.activeElement;
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.tabIndex = -1;
    textarea.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0';
    document.body.appendChild(textarea);
    textarea.select();
    var copied = false;
    try { copied = !!document.execCommand('copy'); } catch (_) { copied = false; }
    document.body.removeChild(textarea);
    if (previousFocus && typeof previousFocus.focus === 'function') {
      try { previousFocus.focus(); } catch (_) {}
    }
    return copied;
  }

  function copyMeetingPrepText(text) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return Promise.resolve((window.StemLab && window.StemLab.writeClipboard || function (value) { return navigator.clipboard.writeText(value); })(text))
          .then(function() { return true; })
          .catch(function() { return fallbackCopyMeetingPrep(text); });
      }
    } catch (_) {}
    return Promise.resolve(fallbackCopyMeetingPrep(text));
  }

  var _activePrepPrintCleanup = null;
  function printMeetingPrepText(text) {
    if (typeof document === 'undefined' || typeof window === 'undefined' || typeof window.print !== 'function') return false;
    if (typeof _activePrepPrintCleanup === 'function') {
      try { _activePrepPrintCleanup(); } catch (_) {}
      _activePrepPrintCleanup = null;
    }
    var previous = document.getElementById('allo-eligibility-prep-print');
    if (previous && previous.parentNode) previous.parentNode.removeChild(previous);
    var sheet = document.createElement('section');
    sheet.id = 'allo-eligibility-prep-print';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.style.cssText = 'position:fixed;left:-10000px;top:0;width:7.5in;background:#fff;color:#111;padding:0;font:11pt/1.4 Arial,sans-serif;white-space:pre-wrap';
    var pre = document.createElement('pre');
    pre.style.cssText = 'white-space:pre-wrap;font:inherit;margin:0';
    pre.textContent = text;
    sheet.appendChild(pre);
    var style = document.createElement('style');
    style.setAttribute('data-eligibility-print-style', 'true');
    style.textContent = '@media print{body>*{display:none!important}body>#allo-eligibility-prep-print{display:block!important;position:static!important;width:auto!important;padding:0!important}#allo-eligibility-prep-print pre{white-space:pre-wrap!important}}';
    document.head.appendChild(style);
    document.body.appendChild(sheet);
    var previousFocus = document.activeElement;
    var cleaned = false;
    var timerId = null;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      if (_activePrepPrintCleanup === cleanup) _activePrepPrintCleanup = null;
      if (timerId != null) { try { window.clearTimeout(timerId); } catch (_) {} timerId = null; }
      try { window.removeEventListener('afterprint', cleanup); } catch (_) {}
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
      if (style.parentNode) style.parentNode.removeChild(style);
      if (previousFocus && typeof previousFocus.focus === 'function') {
        try { previousFocus.focus(); } catch (_) {}
      }
    }
    _activePrepPrintCleanup = cleanup;
    try {
      window.addEventListener('afterprint', cleanup);
      window.print();
      if (!cleaned) timerId = window.setTimeout(cleanup, 60000);
      return true;
    } catch (_) {
      cleanup();
      return false;
    }
  }
  var OFFICIAL_SOURCES = [
    { label: 'IDEA 300.8 - Child with a disability', href: 'https://sites.ed.gov/idea/regs/b/a/300.8' },
    { label: 'IDEA 300.111 - Child Find', href: 'https://sites.ed.gov/idea/regs/b/b/300.111' },
    { label: 'IDEA 300.301 - Initial evaluations', href: 'https://sites.ed.gov/idea/regs/b/d/300.301' },
    { label: 'IDEA 300.303 - Reevaluations', href: 'https://sites.ed.gov/idea/regs/b/d/300.303' },
    { label: 'IDEA 300.304 - Evaluation procedures', href: 'https://sites.ed.gov/idea/regs/b/d/300.304' },
    { label: 'IDEA 300.306 - Eligibility determination and documentation', href: 'https://sites.ed.gov/idea/regs/b/d/300.306' },
    { label: 'IDEA 300.501 - Parent participation and records', href: 'https://sites.ed.gov/idea/regs/b/e/300.501' },
    { label: 'IDEA 300.502 - Independent educational evaluation', href: 'https://sites.ed.gov/idea/regs/b/e/300.502' },
    { label: 'IDEA 300.503 - Prior Written Notice', href: 'https://sites.ed.gov/idea/regs/b/e/300.503' },
    { label: 'IDEA 300.504 - Procedural-safeguards notice', href: 'https://sites.ed.gov/idea/regs/b/e/300.504' },
    { label: 'Section 504 regulation 104.35 - Evaluation and placement', href: 'https://www.ecfr.gov/current/title-34/subtitle-B/chapter-I/part-104/subpart-D/section-104.35' },
    { label: 'Section 504 regulation 104.36 - Procedural safeguards', href: 'https://www.ecfr.gov/current/title-34/subtitle-B/chapter-I/part-104/subpart-D/section-104.36' },
    { label: 'U.S. Department of Education - Section 504 disability FAQ', href: 'https://www.ed.gov/laws-and-policy/civil-rights-laws/disability-discrimination/frequently-asked-questions-disability-discrimination' },
    { label: 'U.S. Department of Education - Section 504 FAPE FAQ', href: 'https://www.ed.gov/laws-and-policy/civil-rights-laws/disability-discrimination/frequently-asked-questions-section-504-free-appropriate-public-education-fape' }
  ];
  function srLive(msg) {
    try { var el = document.getElementById('allo-live-elig'); if (el) { el.textContent = ''; el.textContent = msg; } } catch (_) {}
  }
  (function() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('allo-live-elig') && document.body) {
      var lr = document.createElement('div');
      lr.id = 'allo-live-elig';
      lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status');
      lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
      document.body.appendChild(lr);
    }
    if (!document.getElementById('allo-eligibility-motion-css') && document.head) {
      var st = document.createElement('style');
      st.id = 'allo-eligibility-motion-css';
      st.textContent = [
        '@keyframes eligDashFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-16}}',
        '@keyframes eligRailFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-24}}',
        '@keyframes eligHaloBreath{0%,100%{transform:scale(.92);opacity:.14}50%{transform:scale(1.18);opacity:.34}}',
        '@keyframes eligCoreBreath{0%,100%{transform:scale(.95);opacity:.82}50%{transform:scale(1.08);opacity:1}}',
        '@keyframes eligChevronPulse{0%,100%{opacity:.45}50%{opacity:.95}}',
        '@keyframes eligRailSheen{0%,100%{transform:translateX(-72px);opacity:0}18%{opacity:.34}50%{transform:translateX(560px);opacity:.44}82%{opacity:0}}',
        '@keyframes eligCardSheen{0%,100%{opacity:.18}50%{opacity:.44}}',
        '.elig-conn-flow{animation:eligDashFlow 3.6s linear infinite;}',
        '.elig-rail-flow{animation:eligRailFlow 4.4s linear infinite;pointer-events:none;}',
        '.elig-node-halo,.elig-hub-aura,.elig-emblem-halo{transform-box:fill-box;transform-origin:center;animation:eligHaloBreath 4.2s ease-in-out infinite;pointer-events:none;}',
        '.elig-endpoint-dot{transform-box:fill-box;transform-origin:center;animation:eligCoreBreath 3.8s ease-in-out infinite;}',
        '.elig-chevron{animation:eligChevronPulse 3.6s ease-in-out infinite;pointer-events:none;}',
        '.elig-rail-sheen{animation:eligRailSheen 6.8s ease-in-out infinite;pointer-events:none;}',
        '.elig-card-sheen{animation:eligCardSheen 4.8s ease-in-out infinite;pointer-events:none;}',
        '@media(prefers-reduced-motion:reduce){.elig-conn-flow,.elig-rail-flow,.elig-node-halo,.elig-hub-aura,.elig-emblem-halo,.elig-endpoint-dot,.elig-chevron,.elig-rail-sheen,.elig-card-sheen{animation:none!important;}}',
        '.theme-contrast :is(.elig-node-halo,.elig-hub-aura,.elig-emblem-halo,.elig-rail-sheen,.elig-card-sheen){display:none!important;}',
        '.theme-contrast :is(.elig-conn-flow,.elig-rail-flow,.elig-endpoint-dot,.elig-chevron){animation:none!important;}',
        '@media(forced-colors:active){.elig-node-halo,.elig-hub-aura,.elig-emblem-halo,.elig-rail-sheen,.elig-card-sheen{display:none!important;}.elig-conn-flow,.elig-rail-flow,.elig-endpoint-dot,.elig-chevron{animation:none!important;}}'
      ].join('\n');
      document.head.appendChild(st);
    }
  })();

  window.StemLab.registerTool('diagnosisEligibility', {
    icon: '🧩',
    label: 'Diagnosis, Evaluation & School Eligibility',
    desc: 'Compare clinical diagnosis, IDEA, and Section 504; follow the evaluation path; review source-linked federal definitions and safeguards; explore open-question cases; and build a printable meeting-preparation guide without entering student data. Never decides eligibility, services, or placement.',
    color: 'violet',
    category: 'applied',
    buildMeetingPrepText: buildMeetingPrepText,
    questHooks: [
      { id: 'de_read', label: 'Read the framing cards', icon: '📖', check: function(d) { return d && d.read && Object.keys(d.read).length >= FRAMING.length; }, progress: function(d) { return ((d && d.read && Object.keys(d.read).length) || 0) + '/' + FRAMING.length; } },
      { id: 'de_cases', label: 'Explore all 6 case scenarios', icon: '🧩', check: function(d) { return d && d.done && Object.keys(d.done).length >= SCENARIOS.length; }, progress: function(d) { return ((d && d.done && Object.keys(d.done).length) || 0) + '/' + SCENARIOS.length; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React, h = React.createElement;
      var setStemLabTool = ctx.setStemLabTool;
      var announceToSR = (typeof ctx.announceToSR === 'function') ? ctx.announceToSR : srLive;
      var addToast = (typeof ctx.addToast === 'function') ? ctx.addToast : function() {};
      var isContrast = !!ctx.isContrast || (typeof ctx.theme === 'string' && ctx.theme.indexOf('contrast') !== -1) || (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('theme-contrast'));
      var isDark = !isContrast && (!!ctx.isDark || (typeof ctx.theme === 'string' && ctx.theme === 'dark'));
      var focusSection = ctx.focusSection;
      var setLabToolData = ctx.setToolData;
      var rawD = (ctx.toolData && typeof ctx.toolData === 'object') ? ctx.toolData.diagnosisEligibility : null;
      var d = (rawD && typeof rawD === 'object' && !Array.isArray(rawD)) ? rawD : {};
      var guideModeState = React.useState('detailed');
      var guideMode = guideModeState[0], setGuideMode = guideModeState[1];
      var isBrief = guideMode === 'brief';

      var tick = React.useState(0);
      var setTick = tick[1];
      // Prep selections are intentionally transient. They are generic prompt IDs,
      // never student data, and are not written to toolData, storage, or a network.
      var prepQuestionState = React.useState(function() { return allPrepItemsSelected(MEETING_QUESTIONS); });
      var prepQuestions = prepQuestionState[0], setPrepQuestions = prepQuestionState[1];
      var prepEvidenceState = React.useState(function() { return allPrepItemsSelected(EVIDENCE_GUIDE); });
      var prepEvidence = prepEvidenceState[0], setPrepEvidence = prepEvidenceState[1];
      var prepFollowUpState = React.useState(function() { return allPrepItemsSelected(FOLLOW_UP_CHECKS); });
      var prepFollowUp = prepFollowUpState[0], setPrepFollowUp = prepFollowUpState[1];
      var prepStatusState = React.useState('');
      var prepStatus = prepStatusState[0], setPrepStatus = prepStatusState[1];
      React.useEffect(function() {
        if (_idea) return;
        var cancelled = false;
        loadIdea().then(function() { if (!cancelled) setTick(function(n) { return n + 1; }); })
          .catch(function() { if (!cancelled) setTick(function(n) { return n + 1; }); });
        return function() { cancelled = true; };
      }, []);
      var lastFocusedSectionRef = React.useRef('');
      React.useEffect(function() {
        if (!focusSection) { lastFocusedSectionRef.current = ''; return undefined; }
        var targetId = String(focusSection).replace(/^#/, '');
        if (lastFocusedSectionRef.current === targetId) return undefined;
        if (guideMode === 'brief' && targetId === 'elig-cases-title') { setGuideMode('detailed'); return undefined; }
        var attempts = 0;
        var timer = null;
        function focusTarget() {
          var target = document.getElementById(targetId);
          if (target) {
            lastFocusedSectionRef.current = targetId;
            try { target.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) { try { target.scrollIntoView(); } catch (__) {} }
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            try { target.focus({ preventScroll: true }); } catch (_) { try { target.focus(); } catch (__) {} }
            return;
          }
          attempts += 1;
          if (attempts < 8) timer = setTimeout(focusTarget, 40);
        }
        timer = setTimeout(focusTarget, 0);
        return function() { if (timer) clearTimeout(timer); };
      }, [focusSection, guideMode]);

      function setDE(patch) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function(prev) {
          var safePrev = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {};
          var prior = (safePrev.diagnosisEligibility && typeof safePrev.diagnosisEligibility === 'object' && !Array.isArray(safePrev.diagnosisEligibility)) ? safePrev.diagnosisEligibility : {};
          return Object.assign({}, safePrev, { diagnosisEligibility: Object.assign({}, prior, patch) });
        });
      }
      var pal = isContrast
        ? {
            bg: '#000000', text: '#ffffff', muted: '#e5e7eb', panel: '#000000', card: '#0a0a0a',
            border: '#ffff00', accent: '#ffff00', btn: '#ffff00', btnText: '#000000',
            heroBg: '#000000', badgeBg: '#1a1a00', badgeText: '#ffff00', pillBg: '#000000', pillBorder: '#ffff00',
            okBg: '#001f0a', okBorder: '#00ff66', warnBg: '#1f1600', warnBorder: '#ffff00',
            svgSurface: '#000000', svgCard: '#0a0a0a', svgAccent1: '#ffff00', svgAccent2: '#00ffff', svgAccent3: '#00ff66', svgAccent4: '#ff80ff',
            shadow: 'none'
          }
        : isDark
          ? {
              bg: '#0f172a', text: '#f5f3ff', muted: '#cbd5e1', panel: 'rgba(15,23,42,0.88)', card: 'rgba(139,92,246,0.12)',
              border: 'rgba(167,139,250,0.34)', accent: '#c4b5fd', btn: '#6d28d9', btnText: '#ffffff',
              heroBg: 'linear-gradient(135deg, rgba(46,16,101,0.88) 0%, rgba(15,23,42,0.96) 100%)',
              badgeBg: 'rgba(139,92,246,0.22)', badgeText: '#ddd6fe', pillBg: 'rgba(15,23,42,0.78)', pillBorder: 'rgba(167,139,250,0.38)',
              okBg: 'rgba(5,150,105,0.18)', okBorder: 'rgba(52,211,153,0.55)', warnBg: 'rgba(245,158,11,0.18)', warnBorder: 'rgba(251,191,36,0.55)',
              svgSurface: '#0f172a', svgCard: '#1e293b', svgAccent1: '#c4b5fd', svgAccent2: '#38bdf8', svgAccent3: '#34d399', svgAccent4: '#fbbf24',
              shadow: '0 8px 24px rgba(0,0,0,0.28)'
            }
          : {
              bg: '#f8fafc', text: '#0f172a', muted: '#475569', panel: '#ffffff', card: 'rgba(109,40,217,0.05)',
              border: 'rgba(109,40,217,0.24)', accent: '#5b21b6', btn: '#5b21b6', btnText: '#ffffff',
              heroBg: 'linear-gradient(135deg, #f5f3ff 0%, #f8fafc 58%, #ffffff 100%)',
              badgeBg: 'rgba(91,33,182,0.11)', badgeText: '#4c1d95', pillBg: '#ffffff', pillBorder: 'rgba(91,33,182,0.22)',
              okBg: 'rgba(5,150,105,0.12)', okBorder: 'rgba(5,150,105,0.52)', warnBg: 'rgba(245,158,11,0.12)', warnBorder: 'rgba(217,119,6,0.5)',
              svgSurface: '#f8fafc', svgCard: '#ffffff', svgAccent1: '#6d28d9', svgAccent2: '#0369a1', svgAccent3: '#047857', svgAccent4: '#b45309',
              shadow: '0 6px 20px rgba(30,41,59,0.07)'
            };

      var read = (d.read && typeof d.read === 'object' && !Array.isArray(d.read)) ? d.read : {};
      var done = (d.done && typeof d.done === 'object' && !Array.isArray(d.done)) ? d.done : {};
      var rawCur = typeof d.cur === 'number' && isFinite(d.cur) ? Math.floor(d.cur) : 0;
      var cur = Math.max(0, Math.min(SCENARIOS.length - 1, rawCur));
      var readCount = Object.keys(read).length;
      var doneCount = Object.keys(done).length;
      var homeLabel = ctx.homeLabel || __alloT('stem.elig.tools', 'Tools');
      var backAria = ctx.backAria || __alloT('stem.elig.back', 'Back to tools');
      var backBtn = h('button', {
        type: 'button',
        onClick: function() {
          if (typeof ctx.onBack === 'function') ctx.onBack();
          else if (typeof setStemLabTool === 'function') setStemLabTool(null);
        },
        className: 'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        style: { background: pal.panel, borderColor: pal.border, color: pal.text, minHeight: 44 },
        'aria-label': backAria
      }, '<- ' + homeLabel);
      var cats = categoriesFromCorpus();
      var sc = SCENARIOS[cur];
      var scDone = sc && done[sc.id];
      var casePicks = (d.casePicks && typeof d.casePicks === 'object' && !Array.isArray(d.casePicks)) ? d.casePicks : {};
      var rawCurrentPicks = sc ? casePicks[sc.id] : null;
      var currentPicks = (rawCurrentPicks && typeof rawCurrentPicks === 'object' && !Array.isArray(rawCurrentPicks)) ? rawCurrentPicks : {};
      var prepQuestionIds = selectedPrepIds(MEETING_QUESTIONS, prepQuestions);
      var prepEvidenceIds = selectedPrepIds(EVIDENCE_GUIDE, prepEvidence);
      var prepFollowUpIds = selectedPrepIds(FOLLOW_UP_CHECKS, prepFollowUp);
      var prepCount = prepQuestionIds.length + prepEvidenceIds.length + prepFollowUpIds.length;
      var prepText = buildMeetingPrepText(prepQuestionIds, prepEvidenceIds, prepFollowUpIds);

      function applyPrepPreset(label, qIds, eIds, fIds) {
        var mk = function(list) { var o = {}; list.forEach(function(id) { o[id] = true; }); return o; };
        setPrepQuestions(mk(qIds));
        setPrepEvidence(mk(eIds));
        setPrepFollowUp(mk(fIds));
        var msg = label + ' preset applied.';
        setPrepStatus(msg);
        announceToSR(msg);
      }

      // ── Bespoke Domain Emblem: Sculpted Four Overlapping Non-Gatekeeping Pathways ──
      function eligEmblemSvg() {
        return h('svg', {
          width: 46, height: 46, viewBox: '0 0 48 48', 'aria-hidden': 'true',
          className: 'shrink-0',
          style: { borderRadius: 12, background: pal.badgeBg, border: '1px solid ' + pal.border }
        },
          h('defs', null,
            h('radialGradient', { id: 'elig-emb-aura', cx: '50%', cy: '45%', r: '56%' },
              h('stop', { offset: '0%', stopColor: pal.accent, stopOpacity: isContrast ? 0 : 0.24 }),
              h('stop', { offset: '100%', stopColor: pal.accent, stopOpacity: 0 })
            )
          ),
          h('rect', { x: 0, y: 0, width: 48, height: 48, rx: 12, fill: 'url(#elig-emb-aura)' }),
          // Dual-pass luminous overlapping pathway rings
          !isContrast && h('circle', { cx: 18.5, cy: 18.5, r: 9.5, fill: 'none', stroke: pal.svgAccent1, strokeOpacity: 0.22, strokeWidth: 5 }),
          h('circle', { cx: 18.5, cy: 18.5, r: 9.5, fill: 'none', stroke: pal.svgAccent1, strokeWidth: 2 }),
          !isContrast && h('circle', { cx: 29.5, cy: 18.5, r: 9.5, fill: 'none', stroke: pal.svgAccent2, strokeOpacity: 0.22, strokeWidth: 5 }),
          h('circle', { cx: 29.5, cy: 18.5, r: 9.5, fill: 'none', stroke: pal.svgAccent2, strokeWidth: 2 }),
          !isContrast && h('circle', { cx: 18.5, cy: 29.5, r: 9.5, fill: 'none', stroke: pal.svgAccent3, strokeOpacity: 0.22, strokeWidth: 5 }),
          h('circle', { cx: 18.5, cy: 29.5, r: 9.5, fill: 'none', stroke: pal.svgAccent3, strokeWidth: 2 }),
          !isContrast && h('circle', { cx: 29.5, cy: 29.5, r: 9.5, fill: 'none', stroke: pal.svgAccent4, strokeOpacity: 0.22, strokeWidth: 5 }),
          h('circle', { cx: 29.5, cy: 29.5, r: 9.5, fill: 'none', stroke: pal.svgAccent4, strokeWidth: 2 }),
          // Central glowing Student-Need core beacon
          !isContrast && h('circle', { className: 'elig-emblem-halo', cx: 24, cy: 24, r: 7.4, fill: pal.accent, opacity: 0.22 }),
          h('circle', { className: 'elig-endpoint-dot', cx: 24, cy: 24, r: 3.6, fill: pal.accent, stroke: pal.svgCard, strokeWidth: 1.2 })
        );
      }

      // ── Visual Stage 1: Sculpted Four-Pathway Architecture Diagram ──────
      function pathwaysDiagramSvg() {
        var cards = [
          { x: 16, y: 16, col: pal.svgAccent1, title: __alloT('stem.elig.svg_p1', 'Clinical Diagnosis'), sub: __alloT('stem.elig.svg_p1_sub', 'Clinician · Care & formulation'), side: 'L' },
          { x: 16, y: 86, col: pal.svgAccent3, title: __alloT('stem.elig.svg_p2', 'Gen Ed & MTSS'), sub: __alloT('stem.elig.svg_p2_sub', 'Educators · Instruction now'), side: 'L' },
          { x: 468, y: 16, col: pal.svgAccent2, title: __alloT('stem.elig.svg_p3', 'Section 504 (FAPE)'), sub: __alloT('stem.elig.svg_p3_sub', 'Access, aids & services'), side: 'R' },
          { x: 468, y: 86, col: pal.svgAccent4, title: __alloT('stem.elig.svg_p4', 'IDEA & IEP'), sub: __alloT('stem.elig.svg_p4_sub', 'Category + SDI needed'), side: 'R' }
        ];
        var connectors = [
          { d: 'M212 43 C238 43 242 64 263 68', col: pal.svgAccent1, tx: 263, ty: 68 },
          { d: 'M212 113 C238 113 242 92 263 88', col: pal.svgAccent3, tx: 263, ty: 88 },
          { d: 'M468 43 C442 43 438 64 417 68', col: pal.svgAccent2, tx: 417, ty: 68 },
          { d: 'M468 113 C442 113 438 92 417 88', col: pal.svgAccent4, tx: 417, ty: 88 }
        ];
        return h('svg', {
          viewBox: '0 0 680 156', width: '100%', role: 'img',
          'aria-label': __alloT('stem.elig.paths_svg_aria', 'Diagram showing Clinical Diagnosis, General Education and MTSS, Section 504, and IDEA as four distinct overlapping pathways centered on Student Need and Multi-Source Evidence'),
          style: { display: 'block', marginBottom: 12, maxHeight: 174 }
        },
          h('defs', null,
            h('linearGradient', { id: 'elig-stage-bg', x1: '0', y1: '0', x2: '1', y2: '1' },
              h('stop', { offset: '0%', stopColor: isContrast ? '#000000' : (isDark ? '#0b1220' : '#f5f3ff') }),
              h('stop', { offset: '100%', stopColor: isContrast ? '#000000' : (isDark ? '#111b2e' : '#f8fafc') })
            ),
            h('radialGradient', { id: 'elig-hub-aura', cx: '50%', cy: '50%', r: '50%' },
              h('stop', { offset: '0%', stopColor: pal.accent, stopOpacity: isContrast ? 0 : 0.2 }),
              h('stop', { offset: '100%', stopColor: pal.accent, stopOpacity: 0 })
            )
          ),
          // Recessed clinical/educational studio stage
          h('rect', { x: 2, y: 2, width: 676, height: 152, rx: 13, fill: 'url(#elig-stage-bg)', stroke: pal.border, strokeWidth: 1.5 }),
          !isContrast && h('ellipse', { className: 'elig-hub-aura', cx: 340, cy: 78, rx: 120, ry: 62, fill: 'url(#elig-hub-aura)' }),
          // Dual-pass luminous curved criterion-flow connectors
          connectors.map(function (cn, i) {
            return h('g', { key: 'cn' + i },
              !isContrast && h('path', { d: cn.d, fill: 'none', stroke: cn.col, strokeOpacity: 0.24, strokeWidth: 6.5, strokeLinecap: 'round' }),
              h('path', { className: 'elig-conn-flow', d: cn.d, fill: 'none', stroke: cn.col, strokeWidth: 2, strokeDasharray: '5 3', strokeLinecap: 'round', style: { animationDelay: (i * 0.45) + 's' } }),
              !isContrast && h('circle', { className: 'elig-node-halo', cx: cn.tx, cy: cn.ty, r: 6.2, fill: cn.col, opacity: 0.2, style: { animationDelay: (i * 0.5) + 's' } }),
              h('circle', { className: 'elig-endpoint-dot', cx: cn.tx, cy: cn.ty, r: 3.4, fill: cn.col, stroke: pal.svgCard, strokeWidth: 1.2, style: { animationDelay: (i * 0.5) + 's' } })
            );
          }),
          // Sculpted Central Student Need Hub
          !isContrast && h('rect', { className: 'elig-hub-aura', x: 263, y: 37, width: 156, height: 84, rx: 15, fill: pal.accent, opacity: 0.14 }),
          h('rect', { x: 261, y: 35, width: 158, height: 86, rx: 15, fill: pal.svgCard, stroke: pal.accent, strokeWidth: 2.1 }),
          h('rect', { x: 264, y: 38, width: 152, height: 80, rx: 12, fill: pal.badgeBg, stroke: pal.border, strokeWidth: 1 }),
          h('text', { x: 340, y: 63, fontSize: 12, fontWeight: 900, textAnchor: 'middle', fill: pal.badgeText }, __alloT('stem.elig.svg_hub1', 'Student Need &')),
          h('text', { x: 340, y: 79, fontSize: 12, fontWeight: 900, textAnchor: 'middle', fill: pal.badgeText }, __alloT('stem.elig.svg_hub2', 'Multi-Source Data')),
          h('text', { x: 340, y: 102, fontSize: 10, fontWeight: 700, textAnchor: 'middle', fill: pal.muted }, __alloT('stem.elig.svg_hub3', 'No path gates another')),
          // Beveled pathway gate cards
          cards.map(function (c, i) {
            return h('g', { key: 'pc' + i },
              !isContrast && h('rect', { x: c.x + 1.5, y: c.y + 2.5, width: 196, height: 54, rx: 11, fill: '#020617', opacity: isDark ? 0.34 : 0.08 }),
              h('rect', { x: c.x, y: c.y, width: 196, height: 54, rx: 11, fill: pal.svgCard, stroke: c.col, strokeWidth: 1.7 }),
              h('rect', { x: c.x + 1, y: c.y + 1, width: 7.5, height: 52, rx: 4, fill: c.col }),
              !isContrast && h('rect', { className: 'elig-card-sheen', x: c.x + 14, y: c.y + 2, width: 172, height: 3, rx: 1.5, fill: c.col, opacity: 0.25, style: { animationDelay: (i * 0.65) + 's' } }),
              h('circle', { className: 'elig-endpoint-dot', cx: c.side === 'L' ? c.x + 184 : c.x + 184, cy: c.y + 15, r: 3.2, fill: c.col, style: { animationDelay: (i * 0.6) + 's' } }),
              h('text', { x: c.x + 18, y: c.y + 23, fontSize: 11.5, fontWeight: 800, fill: c.col }, c.title),
              h('text', { x: c.x + 18, y: c.y + 41, fontSize: 10, fontWeight: 600, fill: pal.muted }, c.sub)
            );
          })
        );
      }

      // ── Visual Stage 2: 6-Step Sculpted Evaluation & Review Pipeline Strip ──────────
      function processPipelineSvg() {
        var nodes = [
          { n: '1', label: 'Concern', col: pal.svgAccent1 },
          { n: '2', label: 'Consent', col: pal.svgAccent2 },
          { n: '3', label: 'Sources', col: pal.svgAccent3 },
          { n: '4', label: 'Team', col: pal.svgAccent4 },
          { n: '5', label: 'Written', col: pal.svgAccent1 },
          { n: '6', label: 'Review', col: pal.svgAccent3 }
        ];
        return h('svg', {
          viewBox: '0 0 680 86', width: '100%', role: 'img',
          'aria-label': __alloT('stem.elig.pipe_svg_aria', 'Six-step evaluation sequence: 1 Concern, 2 Consent, 3 Sources, 4 Team, 5 Written determination, 6 Plan and Review'),
          style: { display: 'block', marginBottom: 12, maxHeight: 92 }
        },
          h('defs', null,
            h('linearGradient', { id: 'elig-pipe-rail', x1: '0', y1: '0', x2: '1', y2: '0' },
              h('stop', { offset: '0%', stopColor: pal.svgAccent1 }),
              h('stop', { offset: '40%', stopColor: pal.svgAccent2 }),
              h('stop', { offset: '75%', stopColor: pal.svgAccent4 }),
              h('stop', { offset: '100%', stopColor: pal.svgAccent3 })
            ),
            h('linearGradient', { id: 'elig-sheen-grad', x1: '0', y1: '0', x2: '1', y2: '0' },
              h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0 }),
              h('stop', { offset: '50%', stopColor: '#ffffff', stopOpacity: 0.9 }),
              h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 })
            ),
            h('clipPath', { id: 'elig-rail-clip' },
              h('rect', { x: 60, y: 28, width: 560, height: 8, rx: 4 })
            )
          ),
          h('rect', { x: 2, y: 2, width: 676, height: 82, rx: 13, fill: pal.svgSurface, stroke: pal.border, strokeWidth: 1.5 }),
          // Dual-pass luminous progression rail
          !isContrast && h('line', { x1: 60, y1: 32, x2: 620, y2: 32, stroke: 'url(#elig-pipe-rail)', strokeOpacity: 0.24, strokeWidth: 8, strokeLinecap: 'round' }),
          h('line', { x1: 60, y1: 32, x2: 620, y2: 32, stroke: 'url(#elig-pipe-rail)', strokeWidth: 2.6, strokeLinecap: 'round' }),
          h('line', { className: 'elig-rail-flow', x1: 60, y1: 32, x2: 620, y2: 32, stroke: isContrast ? '#ffff00' : '#ffffff', strokeOpacity: isContrast ? 0.5 : 0.45, strokeWidth: 1.3, strokeDasharray: '6 18', strokeLinecap: 'round' }),
          !isContrast && h('g', { clipPath: 'url(#elig-rail-clip)' },
            h('rect', { className: 'elig-rail-sheen', x: 60, y: 28, width: 78, height: 8, rx: 4, fill: 'url(#elig-sheen-grad)' })
          ),
          // Directional micro-chevrons between evaluation gates
          [0, 1, 2, 3, 4].map(function (i) {
            var mx = 116 + i * 112;
            return h('polygon', { key: 'ch' + i, className: 'elig-chevron', points: (mx - 3) + ',28.5 ' + (mx + 3.5) + ',32 ' + (mx - 3) + ',35.5', fill: pal.accent, style: { animationDelay: (i * 0.55) + 's' } });
          }),
          nodes.map(function(node, idx) {
            var cx = 60 + idx * 112;
            return h('g', { key: node.n },
              // Calibrated decision-gate beacon halo
              !isContrast && h('circle', { className: 'elig-node-halo', cx: cx, cy: 32, r: 19, fill: node.col, opacity: 0.16, style: { animationDelay: (idx * 0.55) + 's' } }),
              h('circle', { cx: cx, cy: 32, r: 15, fill: pal.svgCard, stroke: node.col, strokeWidth: 2 }),
              h('circle', { cx: cx, cy: 32, r: 11.5, fill: pal.btn }),
              h('text', { x: cx, y: 36, fontSize: 11.5, fontWeight: 900, textAnchor: 'middle', fill: pal.btnText }, node.n),
              h('text', { x: cx, y: 66, fontSize: 11, fontWeight: 800, textAnchor: 'middle', fill: pal.text }, node.label)
            );
          })
        );
      }

      function chooseGuideMode(next) {
        if (next !== 'brief' && next !== 'detailed') return;
        setGuideMode(next);
        announceToSR(next === 'brief' ? 'Quick Brief mode enabled.' : 'Detailed Guide mode enabled.');
      }

      function setPrepItem(setter, id, checked) {
        setter(function(previous) {
          var next = Object.assign({}, previous);
          if (checked) next[id] = true; else delete next[id];
          return next;
        });
        setPrepStatus('');
      }
      function setAllPrep(include) {
        setPrepQuestions(include ? allPrepItemsSelected(MEETING_QUESTIONS) : {});
        setPrepEvidence(include ? allPrepItemsSelected(EVIDENCE_GUIDE) : {});
        setPrepFollowUp(include ? allPrepItemsSelected(FOLLOW_UP_CHECKS) : {});
        setPrepStatus(include ? 'All generic prompts included.' : 'All prompts cleared. Select at least one prompt to copy or print.');
        announceToSR(include ? 'All meeting-preparation prompts included.' : 'All meeting-preparation prompts cleared.');
      }
      function finishPrepAction(message, toastType, focusTarget) {
        setPrepStatus(message);
        announceToSR(message);
        addToast(message, toastType);
        if (focusTarget && typeof focusTarget.focus === 'function') {
          try { focusTarget.focus(); } catch (_) {}
        }
      }
      function copyPrepGuide(event) {
        var focusTarget = event && event.currentTarget;
        copyMeetingPrepText(prepText).then(function(copied) {
          finishPrepAction(
            copied ? 'Meeting-preparation guide copied.' : 'Copy failed. Use Print / PDF or try again.',
            copied ? 'success' : 'error',
            focusTarget
          );
        });
      }
      function printPrepGuide(event) {
        var focusTarget = event && event.currentTarget;
        setPrepStatus('Opening the print dialog.');
        announceToSR(__alloT('stem.elig.sr_opening_the_print_dialog', 'Opening the print dialog.'));
        var opened = printMeetingPrepText(prepText);
        if (!opened) finishPrepAction('Print is unavailable in this view.', 'error', focusTarget);
      }
      function prepFieldset(legend, items, selected, setter, prefix) {
        return h('fieldset', { className: 'rounded-xl p-3', style: { background: pal.panel, border: '1px solid ' + pal.border } },
          h('legend', { className: 'px-1 text-xs font-black', style: { color: pal.accent } }, legend),
          h('div', { className: 'space-y-2 mt-1' },
            items.map(function(item) {
              var inputId = 'elig-prep-' + prefix + '-' + item.id;
              return h('div', { key: item.id, className: 'flex items-start gap-2' },
                h('input', {
                  id: inputId,
                  type: 'checkbox',
                  checked: !!selected[item.id],
                  onChange: function(event) { setPrepItem(setter, item.id, !!event.target.checked); },
                  className: 'mt-0.5 min-w-4 min-h-4 accent-violet-700',
                  'aria-describedby': 'elig-prep-privacy'
                }),
                h('label', { htmlFor: inputId, className: 'text-xs leading-relaxed cursor-pointer' }, item.text)
              );
            })
          )
        );
      }

      return h('div', { className: 'max-w-4xl mx-auto p-4 animate-in fade-in duration-200 motion-reduce:animate-none', style: { color: pal.text, background: pal.bg, borderRadius: 16 } },
        h('header', {
          className: 'rounded-2xl p-4 pr-12 mb-5',
          style: { background: pal.heroBg, border: '1px solid ' + pal.border, boxShadow: pal.shadow }
        },
          h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
            h('div', { className: 'flex items-center gap-3 min-w-0 flex-1' },
              backBtn,
              eligEmblemSvg(),
              h('div', { className: 'min-w-0' },
                h('div', { className: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold mb-1', style: { background: pal.badgeBg, color: pal.badgeText, border: '1px solid ' + pal.border } },
                  __alloT('stem.elig.subject_badge', 'Special Education · Evaluation & Safeguards · Non-Diagnostic')),
                h('h2', { id: 'diagnosis-eligibility-title', className: 'text-lg sm:text-xl font-black leading-tight break-words', style: { color: pal.text } },
                  __alloT('stem.elig.title', 'Diagnosis, Evaluation & School Eligibility'))
              )
            ),
            h('div', { className: 'flex items-center gap-1.5 flex-wrap', 'aria-label': __alloT('stem.elig.telemetry_label', 'Guide progress summary') },
              h('span', { className: 'inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold', style: { background: pal.pillBg, color: pal.accent, border: '1px solid ' + pal.pillBorder } },
                isBrief ? __alloT('stem.elig.pill_brief', 'Quick Brief') : __alloT('stem.elig.pill_detailed', 'Detailed Guide')),
              h('span', { className: 'inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold', style: { background: pal.pillBg, color: pal.text, border: '1px solid ' + pal.pillBorder } },
                readCount + '/' + FRAMING.length + ' ' + __alloT('stem.elig.pill_framing', 'framing')),
              h('span', { className: 'inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold', style: { background: pal.pillBg, color: pal.text, border: '1px solid ' + pal.pillBorder } },
                doneCount + '/' + SCENARIOS.length + ' ' + __alloT('stem.elig.pill_cases', 'cases')),
              h('span', { className: 'inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold', style: { background: pal.pillBg, color: pal.text, border: '1px solid ' + pal.pillBorder } },
                prepCount + ' ' + __alloT('stem.elig.pill_prompts', 'prep prompts'))
            )
          ),
          h('p', { id: 'diagnosis-eligibility-panel-description', className: 'text-xs sm:text-sm mt-2.5 leading-relaxed', style: { color: pal.muted } },
            __alloT('stem.elig.intro', 'Clinical diagnosis, IDEA, and Section 504 answer different questions. Compare the pathways, follow a source-linked evaluation process, and identify what evidence a team still needs - without diagnosing a student or deciding eligibility, services, or placement.'))
        ),

        h('section', { className: 'rounded-2xl p-3.5 mb-5', style: { background: pal.card, border: '1px solid ' + pal.border, boxShadow: pal.shadow }, 'aria-labelledby': 'elig-mode-title', 'aria-describedby': 'elig-mode-description' },
          h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
            h('div', { className: 'min-w-0' },
              h('h3', { id: 'elig-mode-title', className: 'text-sm font-black' }, 'Reading mode'),
              h('p', { id: 'elig-mode-description', className: 'text-xs mt-1', style: { color: pal.muted } },
                isBrief ? 'Quick Brief keeps the decision path, safeguards, meeting prep, and source trail in view.' : 'Detailed Guide adds framing, evidence, category text, IDEA details, and open-question cases.')
            ),
            h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': __alloT('stem.elig.a11y_guide_reading_mode', 'Guide reading mode') },
              h('button', {
                type: 'button',
                'aria-pressed': isBrief,
                onClick: function() { chooseGuideMode('brief'); },
                className: 'min-h-11 rounded-xl px-3.5 py-2 text-xs font-black border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                style: isBrief ? { background: pal.btn, color: pal.btnText, borderColor: pal.btn, minHeight: 44 } : { background: pal.panel, color: pal.text, borderColor: pal.border, minHeight: 44 }
              }, 'Quick Brief'),
              h('button', {
                type: 'button',
                'aria-pressed': !isBrief,
                onClick: function() { chooseGuideMode('detailed'); },
                className: 'min-h-11 rounded-xl px-3.5 py-2 text-xs font-black border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                style: !isBrief ? { background: pal.btn, color: pal.btnText, borderColor: pal.btn, minHeight: 44 } : { background: pal.panel, color: pal.text, borderColor: pal.border, minHeight: 44 }
              }, 'Detailed Guide')
            )
          )
        ),
        h('nav', { className: 'flex flex-wrap gap-2 mb-5', 'aria-label': __alloT('stem.elig.a11y_guide_sections', 'Guide sections') },
          (isBrief ? [
            ['#elig-process-title', 'Decision path'],
            ['#elig-documents-title', 'Documents and safeguards'],
            ['#elig-prep-title', 'Meeting prep'],
            ['#elig-sources-title', 'Federal sources']
          ] : [
            ['#elig-process-title', 'Decision path'],
            ['#elig-documents-title', 'Documents and safeguards'],
            ['#elig-prep-title', 'Meeting prep'],
            ['#elig-cases-title', 'Practice cases'],
            ['#elig-sources-title', 'Federal sources']
          ]).map(function(link) {
            return h('a', {
              key: link[0],
              href: link[0],
              className: 'inline-flex items-center min-h-11 rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors',
              style: { background: pal.panel, borderColor: pal.border, color: pal.accent, minHeight: 44 }
            }, link[1]);
          })
        ),
        // Four related pathways, compared without turning one into a gate for another.
        h('section', { className: 'rounded-2xl p-4 mb-5', style: { background: pal.card, border: '1px solid ' + pal.border, boxShadow: pal.shadow }, 'aria-labelledby': 'elig-paths-title' },
          h('h3', { id: 'elig-paths-title', className: 'text-sm font-black mb-1' }, __alloT('stem.elig.paths', 'Four pathways that can overlap')),
          h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
            __alloT('stem.elig.paths_sub', 'A student may receive general-education support, clinical care, Section 504 services, or IDEA services in different combinations. One pathway is not a prerequisite for another.')),
          pathwaysDiagramSvg(),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2.5' },
            SUPPORT_PATHS.map(function(path) {
              return h('article', { key: path.title, className: 'rounded-xl p-3.5 min-w-0', style: { background: pal.panel, border: '1px solid ' + pal.border } },
                h('h4', { className: 'text-sm font-black mb-1', style: { color: pal.accent } }, path.title),
                h('p', { className: 'text-xs leading-relaxed mb-1' }, h('strong', null, 'Question: '), path.question),
                h('p', { className: 'text-xs leading-relaxed mb-1' }, h('strong', null, 'Who decides: '), path.owner),
                h('p', { className: 'text-xs leading-relaxed' }, h('strong', null, 'What it can produce: '), path.result)
              );
            })
          )
        ),

        // Framing cards
        !isBrief && h('div', { className: 'space-y-2 mb-5' },
          FRAMING.map(function(c) {
            var open = !!read[c.id];
            return h('details', {
              key: c.id, open: open || undefined,
              className: 'rounded-2xl overflow-hidden', style: { background: pal.panel, border: '1px solid ' + pal.border, boxShadow: pal.shadow },
              onToggle: function(e) {
                if (!e.target.open || read[c.id]) return;
                var next = Object.assign({}, read); next[c.id] = true; setDE({ read: next });
              }
            },
              h('summary', { className: 'cursor-pointer px-4 py-3 font-bold text-sm', style: { color: pal.text, minHeight: 44 } }, (open ? '✓ ' : '') + c.title),
              h('div', { className: 'px-4 pb-4' }, h('p', { className: 'text-sm leading-relaxed' }, c.body))
            );
          })
        ),

        // Evaluation path and evidence guide.
        h('section', { className: 'rounded-2xl p-4 mb-5', style: { background: pal.card, border: '1px solid ' + pal.border, boxShadow: pal.shadow }, 'aria-labelledby': 'elig-process-title' },
          h('h3', { id: 'elig-process-title', className: 'text-sm font-black mb-1' }, __alloT('stem.elig.process', 'From concern to review: the decision path')),
          h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
            __alloT('stem.elig.process_sub', 'This is the federal baseline for public elementary and secondary schools. Confirm the controlling state timeline and local procedure.')),
          processPipelineSvg(),
          h('ol', { className: 'space-y-2' },
            PROCESS_STEPS.map(function(step) {
              return h('li', { key: step.title, className: 'rounded-xl p-3.5', style: { background: pal.panel, border: '1px solid ' + pal.border } },
                h('h4', { className: 'text-xs font-black mb-1', style: { color: pal.accent } }, step.title),
                h('p', { className: 'text-xs leading-relaxed' }, step.body)
              );
            })
          )
        ),

        h('section', { className: 'rounded-2xl p-4 mb-5 scroll-mt-4', style: { background: pal.card, border: '1px solid ' + pal.border, boxShadow: pal.shadow }, 'aria-labelledby': 'elig-documents-title' },
          h('h3', { id: 'elig-documents-title', className: 'text-sm font-black mb-1' }, __alloT('stem.elig.documents', 'Documents, safeguards, and timelines')),
          h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
            __alloT('stem.elig.documents_sub', 'These records serve different purposes. Ask which rule controls, what the document must explain, and what state or local procedure adds.')),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2.5' },
            DOCUMENT_GUIDE.map(function(item) {
              return h('article', { key: item.title, className: 'rounded-xl p-3.5 min-w-0', style: { background: pal.panel, border: '1px solid ' + pal.border } },
                h('h4', { className: 'text-xs font-black mb-1', style: { color: pal.accent } }, item.title),
                h('p', { className: 'text-xs leading-relaxed' }, item.body)
              );
            })
          )
        ),

        !isBrief && h('details', { className: 'rounded-2xl overflow-hidden mb-5', style: { background: pal.panel, border: '1px solid ' + pal.border, boxShadow: pal.shadow } },
          h('summary', { className: 'cursor-pointer px-4 py-3 font-bold text-sm', style: { minHeight: 44 } }, __alloT('stem.elig.evidence', 'Evidence that helps a team answer the right question')),
          h('div', { className: 'px-4 pb-4' },
            h('p', { className: 'text-xs mb-2', style: { color: pal.muted } },
              __alloT('stem.elig.evidence_sub', 'No single diagnosis letter, score, intervention graph, or report card can be the sole basis for an IDEA determination.')),
            h('ul', { className: 'list-disc pl-5 space-y-1.5' },
              EVIDENCE_GUIDE.map(function(item) { return h('li', { key: item.id, className: 'text-xs leading-relaxed' }, item.text); })
            )
          )
        ),

        h('section', { className: 'rounded-2xl p-4 mb-5 scroll-mt-4', style: { background: pal.card, border: '2px solid ' + pal.border, boxShadow: pal.shadow }, 'aria-labelledby': 'elig-prep-title', 'aria-describedby': 'elig-prep-privacy' },
          h('div', { className: 'flex items-start justify-between gap-3 flex-wrap mb-1' },
            h('div', { className: 'min-w-0' },
              h('h3', { id: 'elig-prep-title', className: 'text-sm font-black' }, __alloT('stem.elig.prep_title', 'Build a meeting-preparation guide')),
              h('p', { className: 'text-xs mt-1', style: { color: pal.muted } }, __alloT('stem.elig.prep_sub', 'Choose generic prompts, then copy or print the same plain-language guide.'))
            ),
            h('span', { className: 'rounded-full px-3 py-1 text-xs font-black', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.accent }, 'aria-live': 'polite' },
              prepCount + ' prompt' + (prepCount === 1 ? '' : 's') + ' included')
          ),
          h('p', { id: 'elig-prep-privacy', className: 'rounded-xl p-3 my-3 text-xs leading-relaxed', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } },
            h('strong', null, 'Privacy and meaning: '),
            'Checked means included in this guide - not satisfied, compliant, or eligible. This tool does not request or save student names, diagnoses, notes, reports, or documents. Selections reset when this panel closes.'
          ),
          h('div', { className: 'flex flex-wrap items-center gap-2 mb-3', role: 'group', 'aria-label': __alloT('stem.elig.a11y_meeting_preparation_selection_controls', 'Meeting-preparation selection controls') },
            h('button', {
              type: 'button',
              onClick: function() { setAllPrep(true); },
              className: 'min-h-11 rounded-xl px-3.5 py-2 text-xs font-bold border',
              style: { background: pal.panel, borderColor: pal.border, color: pal.text, minHeight: 44 }
            }, 'Select all'),
            h('button', {
              type: 'button',
              onClick: function() { setAllPrep(false); },
              className: 'min-h-11 rounded-xl px-3.5 py-2 text-xs font-bold border',
              style: { background: pal.panel, borderColor: pal.border, color: pal.text, minHeight: 44 }
            }, 'Clear all'),
            h('button', {
              type: 'button',
              onClick: function() {
                applyPrepPreset(
                  'Initial evaluation',
                  ['decision_scope', 'suspected_areas', 'student_family_voice', 'across_settings', 'instruction_response', 'idea_two_part', 'controlling_timeline'],
                  ['strengths', 'functioning', 'instruction', 'direct_data', 'context'],
                  ['reports', 'pwn', 'timeline']
                );
              },
              className: 'min-h-11 rounded-xl px-3.5 py-2 text-xs font-bold border',
              style: { background: pal.badgeBg, borderColor: pal.border, color: pal.badgeText, minHeight: 44 }
            }, __alloT('stem.elig.preset_initial', 'Starter: Initial evaluation')),
            h('button', {
              type: 'button',
              onClick: function() {
                applyPrepPreset(
                  'Section 504',
                  ['decision_scope', 'student_family_voice', 'across_settings', 'section_504_need', 'section_504_safeguards', 'review_plan'],
                  ['strengths', 'functioning', 'access', 'context'],
                  ['participation', 'section_504', 'timeline']
                );
              },
              className: 'min-h-11 rounded-xl px-3.5 py-2 text-xs font-bold border',
              style: { background: pal.badgeBg, borderColor: pal.border, color: pal.badgeText, minHeight: 44 }
            }, __alloT('stem.elig.preset_504', 'Starter: Section 504')),
            h('button', {
              type: 'button',
              onClick: function() {
                applyPrepPreset(
                  'Safeguards & PWN',
                  ['proposal_record', 'report_documents', 'pwn_contents', 'participation_records', 'controlling_timeline'],
                  ['conflicts'],
                  ['reports', 'pwn', 'safeguards_notice', 'participation', 'timeline']
                );
              },
              className: 'min-h-11 rounded-xl px-3.5 py-2 text-xs font-bold border',
              style: { background: pal.badgeBg, borderColor: pal.border, color: pal.badgeText, minHeight: 44 }
            }, __alloT('stem.elig.preset_pwn', 'Starter: Safeguards & PWN'))
          ),
          h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-3' },
            prepFieldset('Questions for the team', MEETING_QUESTIONS, prepQuestions, setPrepQuestions, 'q'),
            prepFieldset('Evidence to review', EVIDENCE_GUIDE, prepEvidence, setPrepEvidence, 'e'),
            h('div', { className: 'lg:col-span-2' }, prepFieldset('Documents and follow-up', FOLLOW_UP_CHECKS, prepFollowUp, setPrepFollowUp, 'd'))
          ),
          h('div', { className: 'flex flex-wrap items-center gap-2 mt-4' },
            h('button', {
              type: 'button',
              disabled: prepCount === 0,
              onClick: copyPrepGuide,
              className: 'min-h-11 rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed',
              style: { background: pal.btn, color: pal.btnText, minHeight: 44 },
              title: prepCount ? 'Copy the selected generic prompts' : 'Select at least one prompt first'
            }, 'Copy selected guide'),
            h('button', {
              type: 'button',
              disabled: prepCount === 0,
              onClick: printPrepGuide,
              className: 'min-h-11 rounded-xl px-4 py-2 text-xs font-black border disabled:opacity-50 disabled:cursor-not-allowed',
              style: { background: pal.panel, borderColor: pal.border, color: pal.text, minHeight: 44 },
              title: prepCount ? 'Open the print dialog; choose Save as PDF if preferred' : 'Select at least one prompt first'
            }, 'Print / PDF'),
            h('p', { className: 'text-xs', style: { color: pal.muted } }, prepCount ? 'Only the selected generic prompts are exported.' : 'Select at least one prompt to copy or print.')
          ),
          h('p', { className: 'min-h-5 mt-2 text-xs font-bold', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { color: pal.accent } }, prepStatus)
        ),
        // The 13 categories, quoted from the corpus
        !isBrief && h('div', { className: 'rounded-2xl p-4 mb-5', style: { background: pal.card, border: '1px solid ' + pal.border, boxShadow: pal.shadow } },
          h('h3', { className: 'text-sm font-black mb-1' }, '📜 ' + __alloT('stem.elig.cats', 'The eligibility categories, in the law\'s own words')),
          !_idea ? h('p', { className: 'text-xs', style: { color: pal.muted } },
            _ideaErr
              ? __alloT('stem.elig.cats_err', 'The official text could not be loaded, so no categories are shown. This tool quotes 34 CFR 300.8 rather than restating it from memory.')
              : __alloT('stem.elig.cats_loading', 'Loading the official text…'))
          : h('div', null,
            h('p', { className: 'text-[0.6875rem] mb-2', style: { color: pal.muted } },
              __alloT('stem.elig.cats_src', 'Quoted verbatim from') + ' 34 CFR § 300.8 — ' + (_idea.currentAsOf ? __alloT('stem.elig.current', 'current as of') + ' ' + _idea.currentAsOf : '') ),
            h('div', { className: 'flex flex-col gap-1.5' },
              cats.map(function(c) {
                var open = d.openCat === c.n;
                return h('div', { key: c.n },
                  h('button', {
                    type: 'button',
                    onClick: function() { setDE({ openCat: open ? null : c.n }); },
                    'aria-expanded': open,
                    className: 'w-full text-left rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors',
                    style: open
                      ? { background: pal.btn, color: pal.btnText, borderColor: pal.btn, minHeight: 44 }
                      : { background: pal.panel, color: pal.text, borderColor: pal.border, minHeight: 44 }
                  }, c.name),
                  open ? h('p', { className: 'text-[0.75rem] leading-relaxed px-3.5 py-2.5 mt-1 rounded-xl', style: { color: pal.text, background: pal.panel, border: '1px solid ' + pal.border } }, c.text) : null
                );
              })
            ),
            h('p', { className: 'text-[0.6875rem] mt-2', style: { color: pal.muted } },
              __alloT('stem.elig.cats_note', 'These are EDUCATIONAL definitions applied by a team — not clinical criteria, and not the same words a clinician uses.'))
          )
        ),
        h('aside', { className: 'rounded-2xl p-4 mb-5', style: { background: pal.panel, border: '1px solid ' + pal.border, boxShadow: pal.shadow }, 'aria-labelledby': 'elig-state-local-title' },
          h('h4', { id: 'elig-state-local-title', className: 'text-xs font-black mb-1', style: { color: pal.accent } }, 'State and local items to confirm'),
          h('ul', { className: 'list-disc pl-5 space-y-1.5' },
            STATE_LOCAL_CHECKS.map(function(item) { return h('li', { key: item, className: 'text-xs leading-relaxed' }, item); })
          )
        ),

        !isBrief && h('details', { className: 'rounded-2xl overflow-hidden mb-5', style: { background: pal.panel, border: '1px solid ' + pal.border, boxShadow: pal.shadow } },
          h('summary', { className: 'cursor-pointer px-4 py-3 font-bold text-sm', style: { minHeight: 44 } }, __alloT('stem.elig.idea_details', 'IDEA details that prevent label shortcuts')),
          h('div', { className: 'px-4 pb-4 space-y-2' },
            h('p', { className: 'text-xs leading-relaxed' }, h('strong', null, 'Developmental delay: '), 'A state may choose to use developmental delay for children ages 3 through 9, or a subset of that range. It is not a universal fourteenth category used the same way everywhere.'),
            h('p', { className: 'text-xs leading-relaxed' }, h('strong', null, 'Related-service-only need: '), 'A student who needs only a related service and not special education generally does not meet IDEA\'s federal definition, unless state standards treat that service as special education.'),
            h('p', { className: 'text-xs leading-relaxed' }, h('strong', null, 'Determinant factors: '), 'Lack of appropriate reading instruction, lack of appropriate math instruction, or limited English proficiency cannot be the determinant factor for IDEA eligibility.'),
            h('p', { className: 'text-xs leading-relaxed' }, h('strong', null, 'No diagnosis crosswalk: '), 'The same diagnosis may be relevant to more than one educational definition or none, and a student may meet an educational definition without a clinical diagnosis. Categories organize legal responsibility; they do not rank a student or dictate a service.' )
          )
        ),
        // Cases reveal several open questions; they never score eligibility.
        !isBrief && h('section', { className: 'rounded-2xl p-4 mb-5', style: { background: pal.card, border: '2px solid ' + pal.border, boxShadow: pal.shadow }, 'aria-labelledby': 'elig-cases-title' },
          h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-1' },
            h('h3', { id: 'elig-cases-title', className: 'text-sm font-black' }, __alloT('stem.elig.cases', 'What questions and evidence are still open?')),
            h('span', { className: 'text-[0.6875rem] font-bold rounded-full px-2.5 py-0.5', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.accent } }, (cur + 1) + ' / ' + SCENARIOS.length)),
          h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
            __alloT('stem.elig.cases_sub', 'Select every question you would carry into the team discussion, then reveal a suggested starting set. There is no eligibility score, and the suggestions are not exhaustive.')),
          sc ? h('div', { className: 'rounded-xl p-3.5 mb-3 text-sm leading-relaxed', style: { background: pal.panel, border: '1px solid ' + pal.border } }, sc.text) : null,
          sc ? h('div', { className: 'flex flex-col gap-2 mb-3', role: 'group', 'aria-label': __alloT('stem.elig.pick', 'Select questions that remain open') },
            QUESTIONS.map(function(q) {
              var picked = !!currentPicks[q.id];
              var suggested = !!scDone && sc.questions.indexOf(q.id) !== -1;
              var style = scDone
                ? (suggested ? { background: pal.okBg, borderColor: pal.okBorder, color: pal.text, minHeight: 44 }
                  : (picked ? { background: pal.warnBg, borderColor: pal.warnBorder, color: pal.text, minHeight: 44 } : { background: pal.panel, borderColor: pal.border, color: pal.muted, minHeight: 44 }))
                : (picked ? { background: pal.btn, borderColor: pal.btn, color: pal.btnText, minHeight: 44 } : { background: pal.panel, borderColor: pal.border, color: pal.text, minHeight: 44 });
              return h('button', {
                key: q.id,
                type: 'button',
                disabled: !!scDone,
                'aria-pressed': picked,
                onClick: function() {
                  if (scDone) return;
                  var nextPicks = Object.assign({}, currentPicks);
                  if (nextPicks[q.id]) delete nextPicks[q.id]; else nextPicks[q.id] = true;
                  var allPicks = Object.assign({}, casePicks); allPicks[sc.id] = nextPicks;
                  setDE({ casePicks: allPicks });
                },
                className: 'rounded-xl px-3.5 py-2 text-xs font-bold border-2 text-left disabled:cursor-default',
                style: style
              }, (scDone && suggested ? 'Suggested: ' : (picked ? 'Selected: ' : '')) + q.label);
            })
          ) : null,
          sc && !scDone ? h('button', {
            type: 'button',
            onClick: function() {
              var nextDone = Object.assign({}, done); nextDone[sc.id] = { explored: true, picks: Object.keys(currentPicks) };
              setDE({ done: nextDone });
              announceToSR(__alloT('stem.elig.revealed', 'Suggested questions and explanation shown below.'));
            },
            className: 'rounded-xl px-4 py-2 text-xs font-black',
            style: { background: pal.btn, color: pal.btnText, minHeight: 44 }
          }, __alloT('stem.elig.reveal', 'Reveal suggested questions')) : null,
          sc && scDone ? h('div', null,
            h('div', { className: 'rounded-xl p-3.5 text-xs leading-relaxed mb-3', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } },
              h('h4', { className: 'font-black mb-1' }, __alloT('stem.elig.suggested', 'Suggested starting questions')),
              h('ul', { className: 'list-disc pl-5 space-y-1 mb-2' },
                sc.questions.map(function(id) {
                  var q = QUESTIONS.filter(function(item) { return item.id === id; })[0];
                  return q ? h('li', { key: id }, q.label) : null;
                })
              ),
              h('p', null, sc.why)
            ),
            h('div', { className: 'flex gap-2 flex-wrap items-center' },
              cur > 0 ? h('button', { type: 'button', onClick: function() { setDE({ cur: cur - 1 }); }, className: 'rounded-xl px-4 py-2 text-xs font-bold border', style: { background: pal.panel, borderColor: pal.border, color: pal.text, minHeight: 44 } }, __alloT('stem.elig.previous', '<- Previous case')) : null,
              cur < SCENARIOS.length - 1
                ? h('button', { type: 'button', onClick: function() { setDE({ cur: cur + 1 }); }, className: 'rounded-xl px-4 py-2 text-xs font-black', style: { background: pal.btn, color: pal.btnText, minHeight: 44 } }, __alloT('stem.elig.next', 'Next case ->'))
                : h('p', { className: 'text-xs font-bold', style: { color: pal.accent } }, __alloT('stem.elig.done', 'All cases explored. Each one ends with questions and evidence, not a verdict.'))
            )
          ) : null
        ),

        h('section', { className: 'rounded-2xl p-4 scroll-mt-4', style: { background: pal.card, border: '1px solid ' + pal.border, boxShadow: pal.shadow }, 'aria-labelledby': 'elig-sources-title' },
          h('h3', { id: 'elig-sources-title', className: 'text-sm font-black mb-1' }, __alloT('stem.elig.sources', 'Federal source trail')),
          h('p', { className: 'text-xs mb-1', style: { color: pal.muted } },
            h('time', { dateTime: SOURCE_REVIEWED_DATE, className: 'font-bold' }, SOURCE_REVIEWED_LABEL),
            ' Regulations and official guidance can change; confirm the current federal text, controlling state rules, and local procedures.'
          ),
          _idea && (_idea.currentAsOf || _idea.retrievedAt) ? h('p', { className: 'text-[0.6875rem] mb-3', style: { color: pal.muted } },
            'Bundled IDEA corpus: ' +
            (_idea.currentAsOf ? 'currentAsOf ' + _idea.currentAsOf : '') +
            (_idea.currentAsOf && _idea.retrievedAt ? '; ' : '') +
            (_idea.retrievedAt ? 'retrievedAt ' + _idea.retrievedAt : '') +
            '. These corpus dates are distinct from the link-review date above.'
          ) : null,
          h('ul', { className: 'grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5' },
            OFFICIAL_SOURCES.map(function(source) {
              return h('li', { key: source.href }, h('a', {
                href: source.href,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'text-xs font-bold underline underline-offset-2',
                style: { color: pal.accent }
              }, source.label + ' (opens in a new tab)'));
            })
          )
        ),
        h('p', { className: 'text-[0.6875rem] mt-4 pt-3 leading-snug', style: { color: pal.muted, borderTop: '1px solid ' + pal.border } },
          __alloT('stem.elig.disclaimer', 'Educational information, not legal or clinical advice. This guide never diagnoses a student or decides eligibility, services, goals, or placement. Federal sources provide a baseline; state and district procedures vary. Do not enter student names or report text into this guide.'))
      );
    }
  });

})();

}

// Leadership Hub standalone host. The hidden StemLab registration remains for
// backward-compatible saved links, but the discoverable professional surface
// uses this dedicated dialog rather than the STEAM Lab shell.
(function exposeDiagnosisEligibilityPanel() {
  'use strict';
  window.AlloModules = window.AlloModules || {};
  if (window.AlloModules.DiagnosisEligibility) return;

  function getEligibilityConfig() {
    if (!window.StemLab) return null;
    if (window.StemLab._registry && window.StemLab._registry.diagnosisEligibility) {
      return window.StemLab._registry.diagnosisEligibility;
    }
    if (typeof window.StemLab.getRegisteredTools === 'function') {
      var tools = window.StemLab.getRegisteredTools();
      for (var i = 0; i < tools.length; i++) if (tools[i] && tools[i].id === 'diagnosisEligibility') return tools[i];
    }
    return null;
  }

  function standaloneSrLive(msg) {
    try {
      var element = document.getElementById('allo-live-elig');
      if (element) { element.textContent = ''; element.textContent = msg; }
    } catch (_) {}
  }

  function DiagnosisEligibilityPanel(props) {
    props = props || {};
    var React = window.React;
    var h = React.createElement;
    var localDataState = React.useState({});
    var useExternalData = props.labToolData && typeof props.setLabToolData === 'function';
    var toolData = useExternalData ? props.labToolData : localDataState[0];
    var setToolData = useExternalData ? props.setLabToolData : localDataState[1];
    var dialogRef = React.useRef(null);
    var closeRef = React.useRef(props.onClose);
    closeRef.current = props.onClose;

    React.useEffect(function() {
      var dialog = dialogRef.current;
      if (!dialog) return undefined;
      var previousFocus = document.activeElement;
      var trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
      var trap = { root: dialog };
      trapStack.push(trap);
      function isTopTrap() { return trapStack[trapStack.length - 1] === trap; }
      function focusable() {
        return Array.from(dialog.querySelectorAll(
          'button:not([disabled]), summary, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(function(element) {
          if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
          if (typeof window.getComputedStyle === 'function') {
            for (var node = element; node && node !== dialog; node = node.parentElement) {
              var style = window.getComputedStyle(node);
              if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
            }
          }
          return true;
        });
      }
      var first = focusable()[0];
      (first || dialog).focus();
      function onKeyDown(event) {
        if (!isTopTrap()) return;
        if (event.key === 'Escape') {
          if (event.isComposing || event.keyCode === 229) return;
          event.preventDefault(); event.stopPropagation();
          if (typeof closeRef.current === 'function') closeRef.current();
          return;
        }
        if (event.key !== 'Tab') return;
        var items = focusable();
        if (!items.length) { event.preventDefault(); dialog.focus(); return; }
        var firstItem = items[0], lastItem = items[items.length - 1];
        if (!dialog.contains(document.activeElement) || document.activeElement === dialog) { event.preventDefault(); (event.shiftKey ? lastItem : firstItem).focus(); }
        else if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
        else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
      }
      document.addEventListener('keydown', onKeyDown);
      return function() {
        document.removeEventListener('keydown', onKeyDown);
        var wasTop = isTopTrap();
        var index = trapStack.indexOf(trap);
        if (index !== -1) trapStack.splice(index, 1);
        if (wasTop && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
      };
    }, []);

    var cfg = getEligibilityConfig();
    var theme = String(props.theme || '').toLowerCase();
    var isContrast = theme === 'contrast';
    var isDark = theme === 'dark' || isContrast;
    var close = typeof props.onClose === 'function' ? props.onClose : function() {};
    var back = typeof props.onBack === 'function' ? props.onBack : close;
    var ctx = {
      React: React,
      toolData: toolData,
      setToolData: setToolData,
      t: props.t,
      isDark: isDark,
      isContrast: isContrast,
      theme: theme,
      focusSection: props.focusSection,
      announceToSR: typeof props.announceToSR === 'function' ? props.announceToSR : standaloneSrLive,
      addToast: typeof props.addToast === 'function' ? props.addToast : function() {},
      awardXP: function() {},
      onBack: back,
      homeLabel: 'Leadership Hub',
      backAria: 'Back to Leadership Hub'
    };

    return h('div', {
      className: 'fixed inset-0 z-[270] bg-black/40 flex items-center justify-center overflow-y-auto p-3 sm:p-4',
      style: { zIndex: 270 },
      role: 'presentation',
      onClick: close
    },
      h('div', {
        ref: dialogRef,
        tabIndex: -1,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'diagnosis-eligibility-title',
        'aria-describedby': 'diagnosis-eligibility-panel-description',
        'data-help-key': 'diagnosis_eligibility_panel',
        className: 'allo-docsuite relative rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-violet-500 ' + (isContrast ? 'bg-black' : (isDark ? 'bg-slate-950' : 'bg-white')),
        style: { maxHeight: '92vh', border: isContrast ? '2px solid #ffff00' : undefined },
        onClick: function(event) { event.stopPropagation(); }
      },
        h('button', {
          type: 'button',
          onClick: close,
          className: 'absolute top-3 right-3 z-10 min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-xl ' + (isContrast ? 'text-yellow-300 border border-yellow-300 bg-black' : (isDark ? 'text-slate-200 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')),
          'aria-label': 'Close Diagnosis, Evaluation and School Eligibility'
        }, '\u00d7'),
        cfg ? cfg.render(ctx) : h('div', { className: 'p-8', role: 'alert' }, 'Diagnosis and eligibility guidance could not be loaded.')
      )
    );
  }

  function exportedMeetingPrepText(questionIds, evidenceIds, followUpIds) {
    var config = getEligibilityConfig();
    return config && typeof config.buildMeetingPrepText === 'function'
      ? config.buildMeetingPrepText(questionIds, evidenceIds, followUpIds)
      : '';
  }

  window.AlloModules.DiagnosisEligibility = {
    DiagnosisEligibilityPanel: DiagnosisEligibilityPanel,
    buildMeetingPrepText: exportedMeetingPrepText
  };
})();