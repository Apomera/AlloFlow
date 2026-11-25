// ═══════════════════════════════════════════════════════════════
// stem_tool_schoolbehaviortoolkit.js — School Behavior Toolkit
// Applied K-12 behavior practice content. Lives separately from
// BehaviorLab so the school-psych practice content (PBIS, crisis
// cycle, replacement behaviors, restraint/seclusion ethics) is
// not visually adjacent to Skinner-box / animal-conditioning
// imagery. Tonally and ethically a different space.
//
// BehaviorLab teaches the science of operant conditioning.
// SchoolBehaviorToolkit teaches what school psychs and educators
// actually do with that science in K-12 practice. Disability
// Voices (SEL Hub) holds the lived voices of the people the
// field has been done to. Three connected but distinct spaces.
//
// Sources: BACB ethical guidance; Geoff Colvin (Acting-Out
// Cycle); Maine Chapter 33; ASAN restraint-seclusion position
// statements; CHADD; Bruce Perry Neurosequential; Stuart Shanker
// self-regulation framework; Carr et al. on FCT.
//
// Registered tool ID: "schoolBehaviorToolkit"
// Category: behavioral science (applied)
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('schoolBehaviorToolkit'))) {

(function() {
  'use strict';

  (function() {
    if (typeof document === 'undefined' || !document.body) return;
    if (document.getElementById('allo-live-sbt')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-sbt';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ─────────────────────────────────────────────────────────
  // PBIS — Three tiers of school-wide support
  // ─────────────────────────────────────────────────────────
  var PBIS_TIERS = [
    {
      tier: 1,
      name: 'Tier 1 — Universal',
      icon: '🟢', color: '#22c55e',
      who: 'All students. Every classroom, every period, every staff member.',
      percent: '~80% of students need only Tier 1 to be successful.',
      examples: 'School-wide expectations posted in every space (be safe, be respectful, be responsible). Common-area lessons (cafeteria, hallway, bus). Positive-reinforcement systems (school store, recognition, "caught being kind" cards). Pre-correction before known transition points. Predictable classroom routines, visual schedules, "first/then" boards as default not accommodation.',
      data: 'Office discipline referrals (ODRs) per 100 students per day. Attendance. Climate surveys. If Tier 1 is working, ODRs should be low and concentrated in a small subset of students.',
      escalate: 'When a student\'s ODRs cross threshold (often 2+ in a month), or when teachers consistently flag concern, screen for Tier 2. The point of Tier 1 data is to find the kids who need more, before they accumulate failure.'
    },
    {
      tier: 2,
      name: 'Tier 2 — Targeted',
      icon: '🟡', color: '#fbbf24',
      who: 'Students who don\'t respond fully to Tier 1 alone — usually due to consistent attention-seeking, low-grade work avoidance, social skills gaps, or emerging mental health needs.',
      percent: '~15% of students benefit from Tier 2 added supports.',
      examples: 'Check-In / Check-Out (CICO) — daily morning + afternoon meeting with a positive adult, with a goal sheet. Social skills small groups. Anxiety or anger-management groups. Targeted mentoring. Daily progress reports home. Pre-teaching content for academic anxiety. Modified seating arrangements.',
      data: 'CICO daily point sheets (looking for 80%+ goal hit). Goal-attainment scaling. Brief functional screening (Easy as ABC, BIP-Lite). Decision rule: if 4-6 weeks of Tier 2 is not moving the data, do not just "try harder" — escalate to Tier 3 or change the function hypothesis.',
      escalate: 'When Tier 2 is not producing data movement after a documented trial period, OR when the behavior pattern indicates a clear specific function that needs an FBA — move to Tier 3.'
    },
    {
      tier: 3,
      name: 'Tier 3 — Intensive',
      icon: '🔴', color: '#f87171',
      who: 'Students whose behavior poses safety concerns, or who have not responded to Tier 1 + Tier 2, or who have specific intensive needs (autism, severe trauma, complex disability).',
      percent: '~5% of students need Tier 3 individualized supports.',
      examples: 'Full functional behavior assessment (FBA) by a trained BCBA or school psych. Individualized BIP with replacement behavior, environmental modifications, reinforcement plan, crisis plan. Wraparound team meetings (school + family + outside providers). 1-on-1 paraprofessional support when justified. Therapeutic services (counseling, OT, SLP integration). Sometimes specialized placement.',
      data: 'Direct observation data (frequency, duration, ABC). Pre/post intervention comparison with clear baseline. IEP goal progress. Behavior decreasing, replacement increasing. Social validity from the student and family.',
      escalate: 'When a student is in crisis daily, when restraint/seclusion is being used, when the BIP is not moving data after fidelity is verified — bring in district behavior specialist + outside consultation. Stagnation at Tier 3 is a system signal, not a kid signal.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // Replacement behaviors — function → BIP bridge
  // ─────────────────────────────────────────────────────────
  var REPLACEMENT_BEHAVIORS = [
    {
      function: 'Attention',
      functionAbbrev: 'ATT',
      icon: '👀', color: '#60a5fa',
      problemEx: 'Calling out, clowning, dramatic falls, "fake" injury reports',
      replacement: 'Recruit-attention skills: raise hand and wait, tap shoulder, use a "help" card, ask "can you check my work?", request a 1-on-1 conversation at scheduled times.',
      teaching: 'Plan a daily attention budget the student can spend on appropriate bids — 3 scheduled check-ins per day, no questions asked. Reinforces appropriate seeking and removes the artificial scarcity that drives the problem behavior.',
      pitfall: 'Don\'t teach a replacement that gets MORE attention than the problem behavior. The replacement has to be efficient — if "raise your hand" gets ignored for 8 minutes while calling out gets a response in 2 seconds, the kid will keep calling out. Honor the bid fast, every time, for several weeks before fading.'
    },
    {
      function: 'Escape / Avoidance',
      functionAbbrev: 'ESC',
      icon: '🚪', color: '#f87171',
      problemEx: 'Work refusal, ripping the worksheet, eloping from the classroom, aggression to end the demand',
      replacement: 'Break-request: a single break card the student can hand to the teacher (or tap on the desk, or use AAC) for a known-duration break in a known location. Plus a "need help" signal that pulls a teacher over instead of removing the demand.',
      teaching: 'Pre-teach when the student is calm. Practice handing the card. Honor it the first 50+ times no matter what — even if the student "abuses" it. Frequency naturally drops as the student trusts the system. Then layer in expectations (finish 3 problems, then break) once the trust is established.',
      pitfall: 'Don\'t front-load conditions. "You can have a break IF you finish your work" is just a re-skinned demand. The break has to be unconditional first. Counterintuitive, but data consistently shows: contingent breaks at the start kill the system. Earned breaks come later.'
    },
    {
      function: 'Tangible',
      functionAbbrev: 'TAN',
      icon: '🎮', color: '#f59e0b',
      problemEx: 'Grabbing items off others, screaming for a toy, negotiating endlessly for screen time',
      replacement: 'Functional Communication Training (FCT): a clear request response — vocal ("Can I have it?"), AAC tap, PECS exchange, or sign — taught in tightly controlled sessions until fluent, then generalized.',
      teaching: 'Model the request, prompt physically if needed, then immediately deliver the item the first dozen+ times. The replacement has to be a more efficient route to the item than grabbing was. Once fluent, layer in waiting tolerance (1 second, then 3, then 10).',
      pitfall: 'Don\'t teach a replacement that is harder than the problem behavior. If "Please may I have a turn?" requires a long sentence while grabbing requires zero language, you have engineered a failure. Start with the absolute simplest possible request the student can produce, and build complexity later.'
    },
    {
      function: 'Sensory / Automatic',
      functionAbbrev: 'AUT',
      icon: '🪀', color: '#a78bfa',
      problemEx: 'Hand-flapping, vocal stimming, chewing on shirt collar, head-banging (when self-injurious)',
      replacement: 'MATCH THE SENSORY MODALITY. Oral input → gum, chewy necklace, crunchy snack. Proprioceptive → weighted lap pad, wall push-ups, heavy work. Tactile → fidget cube, putty. Vestibular → wobble cushion, spinning chair. Auditory → noise-canceling headphones or preferred music.',
      teaching: 'This is mostly accommodation, not extinction. Most stims serve real regulatory functions and do not need to be replaced — they need to be allowed and supported. The exception is genuinely dangerous self-injury, which needs a sensory-matched alternative AND mental-health consultation, not just a behavior plan.',
      pitfall: 'Do NOT default to extinguishing harmless stims because they "look weird." That is masking, and the autistic-community research is consistent on long-term cost (anxiety, burnout, identity harm). A flapping kid is regulating — not misbehaving.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // Setting events — slow triggers most BIPs miss
  // ─────────────────────────────────────────────────────────
  var SETTING_EVENTS = [
    { category: 'Biological', icon: '😴', color: '#a78bfa',
      examples: 'Poor sleep last night · skipped breakfast · medication change · constipation · onset of illness · seasonal allergies flaring · pain (ear infection, headache, dental) · menstrual cycle for adolescents',
      note: 'A kid who is in pain cannot perform the same way a kid who is not in pain can. Period.' },
    { category: 'Home / family', icon: '🏠', color: '#22d3ee',
      examples: 'Witnessed a fight before school · parent left for a deployment or trip · sibling sick · housing change · weekend with the other parent · CPS involvement · loss of pet · move-out of an older sibling',
      note: 'Schools often see the AFTERMATH of a home event hours later — student is more dysregulated than usual but cannot or will not say why.' },
    { category: 'Schedule / setting', icon: '🕒', color: '#fbbf24',
      examples: 'Substitute teacher · changed lunch period · fire drill earlier · pep rally · early-release day · field trip the day before · holiday break ending · daylight-saving-time week',
      note: 'Predictability is a reinforcer for many learners. Removing it changes thresholds across the whole day, not just the moment.' },
    { category: 'Peer / social', icon: '🧑‍🤝‍🧑', color: '#f472b6',
      examples: 'Friendship conflict at recess · being excluded from a group chat · breakup · social media incident · ongoing bullying · best-friend absent · seating change',
      note: 'Adolescent social events have a half-life of days, not minutes. Behavior on Wednesday may trace to Friday.' },
    { category: 'Sensory / environmental', icon: '🔊', color: '#4ade80',
      examples: 'Loud fluorescent buzz · gym next door · cafeteria smell · new perfume on an adult · uniform/clothing change · temperature extreme · construction noise',
      note: 'For sensory-sensitive learners, the environment itself is a continuous setting event. Reduce input and threshold rises.' },
    { category: 'Mental health', icon: '💭', color: 'var(--allo-stem-text-soft, #94a3b8)',
      examples: 'Anxiety flare · low mood episode · recent therapy session that opened something · trauma anniversary · sensory overload accumulating across days · burnout from masking',
      note: 'Trauma anniversaries and seasonal mental-health patterns are real and predictable. Calendar awareness is a clinical tool.' }
  ];

  // ─────────────────────────────────────────────────────────
  // Acting-Out Cycle — Geoff Colvin's seven-phase model
  // ─────────────────────────────────────────────────────────
  var ACTING_OUT_CYCLE = [
    { phase: 1, name: 'Calm', icon: '🌊', color: '#22c55e',
      signs: 'Baseline functioning. Engaged, cooperative, on-task. Predictable, regulated.',
      doThis: 'Build rapport, teach skills, pre-teach upcoming demands, set up environmental supports. This is the phase where preventive work actually happens — every other phase is too late for prevention.',
      dontDo: 'Don\'t treat calm as nothing-to-do. The work you do at Phase 1 is what determines how short Phase 5 is.' },
    { phase: 2, name: 'Triggers', icon: '⚡', color: '#fbbf24',
      signs: 'Setting events stack with an immediate antecedent. Often invisible from the outside — the student notices before staff do.',
      doThis: 'Reduce demands, offer a choice, allow a regulation break, switch to a known-easy task. Catching it here is the highest-leverage moment in the cycle.',
      dontDo: 'Don\'t add demands. Don\'t escalate consequences. Don\'t insist on the original task. The trigger is information about threshold, not defiance.' },
    { phase: 3, name: 'Agitation', icon: '😟', color: '#f97316',
      signs: 'Early warning signs: off-task, verbal complaints, withdrawal, increased motor activity, darting eye contact, head down. Some students go quiet; some get loud. Both are agitation.',
      doThis: 'Reduce sensory load, offer the regulation break with no strings attached, validate the feeling without arguing the cause ("This is hard right now"), modify the demand.',
      dontDo: 'Don\'t lecture. Don\'t reason with logic. Don\'t insist on eye contact. Don\'t escalate your own voice. The thinking brain is already losing access.' },
    { phase: 4, name: 'Acceleration', icon: '🌪️', color: '#f87171',
      signs: 'Provocative behavior aimed at getting a reaction: blame, intimidation, escalating language, threats, refusal to engage with anyone, scripted "I don\'t care" responses.',
      doThis: 'Stay quiet. Stay close enough to be safe, far enough to give space. Clear the audience if possible — peers in the room raise the stakes. State only what is absolutely necessary, in short sentences.',
      dontDo: 'Don\'t take the bait. Don\'t match the volume. Don\'t threaten consequences mid-cycle. Don\'t deliver speeches. Most adult mistakes happen here — Phase 4 is the moment teachers get pulled into being part of the escalation.' },
    { phase: 5, name: 'Peak', icon: '🔥', color: '#f87171',
      signs: 'Physical aggression, property destruction, elopement, full meltdown. The student is no longer in cognitive control. The thinking brain has gone offline.',
      doThis: 'Safety first. Move other students if needed. Use minimal language. Restraint only as a last resort with proper training and policy backing. Most of the work at Peak is just keeping the room safe and waiting.',
      dontDo: 'Don\'t teach. Don\'t reason. Don\'t process. Don\'t threaten. Don\'t give consequences mid-Peak. Recording the incident for documentation is appropriate; processing is not — yet.' },
    { phase: 6, name: 'De-escalation', icon: '🌧️', color: '#60a5fa',
      signs: 'Exhausted, emotional, often quiet or tearful. Student may be embarrassed, dissociated, or sleepy. Sometimes apologizes; sometimes goes silent.',
      doThis: 'Stay present without demanding interaction. Offer water, a quiet space, a familiar object. Let the body finish processing. This phase is real and takes time — minutes to over an hour for some students.',
      dontDo: 'Don\'t debrief yet. Don\'t lecture about what happened. Don\'t require apology in this phase — it produces hollow performance, not actual repair.' },
    { phase: 7, name: 'Recovery', icon: '🌅', color: '#a78bfa',
      signs: 'Back near baseline. Cognitive functioning returns. Student may have limited memory of the peak.',
      doThis: 'Now you debrief. Together, with empathy: "What happened? What were the signs you noticed? What would help next time?" Rebuild the relationship explicitly. Repair any damage with the student\'s input. Update the BIP based on what the cycle revealed.',
      dontDo: 'Don\'t treat recovery as the end of the cycle — it\'s the start of the next Phase 1. The relationship work you do here determines whether the next cycle will be shorter or longer.' }
  ];

  // ─────────────────────────────────────────────────────────
  // FBA process — the upstream of every Tier 3 BIP. Without
  // an FBA, the BIP is just a guess. Five steps from indirect
  // assessment through hypothesis testing to BIP development.
  // Sources: BACB FBA practice standards; Iwata et al. (1994)
  // founding functional analysis paper; Cooper, Heron, Heward
  // ABA textbook (3rd ed.); Crone & Horner FBA practitioner guide.
  // ─────────────────────────────────────────────────────────
  var FBA_STEPS = [
    {
      step: 1, name: 'Indirect assessment', icon: '📞', color: '#60a5fa',
      duration: '1-2 weeks',
      what: 'Talk to the people who see the behavior. Structured interviews with the classroom teacher, parent / guardian, paraeducator, and (when developmentally appropriate) the student. Cumulative records review (prior IEPs, medical history, prior FBAs). Standardized rating scales when warranted: FAST (Functional Analysis Screening Tool), MAS (Motivation Assessment Scale), QABF (Questions About Behavioral Function).',
      key: 'The interview question that opens up an FBA: "Walk me through the last time it happened — what was happening 5 minutes before, what exactly did the student do, and what happened immediately after?" Three timeframes, in that order.',
      pitfall: 'Indirect assessment alone is not an FBA. Rating scales suggest a hypothesis but cannot confirm one. School psychs who skip direct observation and write the BIP from interview data alone get burned regularly — interview reports overweight memorable incidents and underweight context.'
    },
    {
      step: 2, name: 'Direct observation — ABC data', icon: '👁️', color: '#a78bfa',
      duration: 'minimum 5 sessions',
      what: 'Trained observer collects ABC (Antecedent-Behavior-Consequence) data across at least 5 distinct sessions, ideally across multiple settings + times of day. For each instance: what happened immediately before, the operationally-defined behavior, what happened immediately after. Add a setting-event column (per the Setting Events tab) to catch slow triggers. Scatter plots layered on top of ABC catch time-of-day patterns interview data misses.',
      key: 'The operational-definition test: would two different observers, using only the written definition, count the same instances as instances and the same non-instances as non-instances? "Off-task" fails this test. "Eyes off the assigned worksheet for 5+ continuous seconds" passes.',
      pitfall: 'Don\'t code from memory at the end of the day. ABC entries written 4 hours after the fact are a different document from ABC entries written within 60 seconds of the incident. Train staff to carry the form (or the form is on a phone app) and write in the moment.'
    },
    {
      step: 3, name: 'Hypothesis development', icon: '💡', color: '#fbbf24',
      duration: 'after data collection',
      what: 'Synthesize indirect + direct data into a function statement in standard format: "Under [antecedent / setting event], [operationally-defined behavior] occurs to obtain / avoid [consequence], maintained by [function: attention / escape / tangible / sensory]." One sentence. If you can\'t fit it in one sentence, the hypothesis is not yet sharp enough.',
      key: 'Sample hypothesis statement: "When given a writing task longer than 10 minutes after a poor-sleep night (setting event), Avery rips the worksheet (operationally-defined: tearing, balling, throwing) to escape the demand, maintained by removal of the task by the teacher."',
      pitfall: 'Resist the urge to write a hypothesis that includes multiple competing functions. "Behavior is maintained by attention OR escape" is not a hypothesis — it is two hypotheses. Pick the one your data most supports, or run hypothesis testing (next step) to disambiguate.'
    },
    {
      step: 4, name: 'Hypothesis testing', icon: '🔬', color: '#22c55e',
      duration: '2-5 sessions if needed',
      what: 'Two paths. (a) Brief Functional Analysis (BFA) — controlled trials manipulating one variable at a time (attention condition, escape condition, tangible condition, alone condition) to confirm function. Done by a BCBA in school settings. (b) Confirmatory observation — additional ABC data targeted to test the hypothesis prediction (e.g., if hypothesis is escape-maintained, predict that adding a reasonable break opportunity will reduce frequency; collect data to check).',
      key: 'You don\'t always need a BFA. For most school FBAs, the indirect + direct data converges clearly enough that confirmatory observation is sufficient. BFA is reserved for cases where (a) data is genuinely ambiguous, (b) the behavior is dangerous and getting it wrong is high-cost, or (c) prior interventions have failed.',
      pitfall: 'Skipping hypothesis testing entirely and going straight to BIP development is the most common school-psych shortcut. It works when data is clean. It fails — sometimes spectacularly — when the hypothesis is wrong and the BIP reinforces the actual function.'
    },
    {
      step: 5, name: 'BIP development', icon: '📝', color: '#f87171',
      duration: 'team meeting + draft cycle',
      what: 'The hypothesis becomes the spine of the BIP. From the function statement, derive: (a) antecedent strategies that prevent the trigger or change its meaning, (b) replacement behavior that meets the same function (see Replacement Behaviors tab), (c) reinforcement plan that makes the replacement more efficient than the problem behavior, (d) response procedures for when the problem behavior still happens, (e) crisis plan, (f) data collection plan to monitor the BIP itself.',
      key: 'A BIP without a function statement is a punishment plan. The function statement is what distinguishes a real BIP from a list of consequences. If your draft BIP doesn\'t name a function, you don\'t yet have an FBA-driven plan — you have a behavior-management policy.',
      pitfall: 'The most common BIP failure mode: it is written, signed, and filed — but not implemented with fidelity in real classrooms. BIP fidelity checks (5-min observation against a fidelity checklist, weekly for the first month) catch implementation drift before the data shows it.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // Maine Resources — local-specific content most national ABA
  // tools skip. Maine Chapter 33 detail beyond the summary, the
  // state-level compliance map, Wabanaki considerations for IEP
  // teams, and the crisis-resource list Maine school psychs
  // actually use. Sources: Maine Department of Education special
  // services unit; 20-A MRSA Chapter 305 (the state ed code);
  // Maine OCFS crisis services; Wabanaki Health & Wellness
  // documented practitioner guidance.
  // ─────────────────────────────────────────────────────────
  var MAINE_RESOURCES = [
    {
      group: 'Maine Chapter 33 — restraint & seclusion compliance',
      icon: '🏛️', color: '#a78bfa',
      bullets: [
        'Authorizing standard: "imminent danger of serious physical injury" — property destruction alone is NOT sufficient.',
        'Required staff training: CPI / NCI / Mandt or equivalent state-approved curriculum. Documentation of who is currently certified for the specific student must be on file.',
        'Parent notification: same-day verbal + written within one business day. Document the time of notification and method (call / email / in-person) on the incident form.',
        'Required debrief: staff debrief within 5 school days; team meeting to consider BIP revision if the incident reveals a pattern.',
        'Annual reporting: Maine DOE collects building-level restraint/seclusion totals. Disaggregated reporting at building level is best practice and Aaron-can-do work even if district aggregates only at the system level.'
      ]
    },
    {
      group: 'Wabanaki considerations for IEP teams',
      icon: '🌅', color: '#fbbf24',
      bullets: [
        'Maine has four Wabanaki Nations — Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq. Some students at PPS schools may be enrolled tribal members; many more identify with Wabanaki heritage without enrollment. Don\'t assume from name or appearance.',
        'For enrolled students: tribal liaisons on each reservation can attend IEP meetings as related-services consultants when invited and when the family wants. This is a family choice, not a default.',
        'Cultural-responsiveness in BIPs: behaviors that look like "noncompliance" in a Western classroom frame may be culturally-appropriate (looking down rather than maintaining eye contact when an adult is speaking, longer pauses before answering questions, deferring to family before personal preferences). Pre-FBA conversation with family about these dynamics is the work.',
        'Penobscot River restoration (2012-2013 dam removals) and ongoing land-back work are within most current Maine students\' lifetimes. Wabanaki students growing up in this period have a different sense of indigenous presence than older generations did. Acknowledge it.',
        'Resources: Wabanaki Health & Wellness (Indian Township + Pleasant Point + Indian Island), Wabanaki REACH (organizing + policy), Penobscot Nation Department of Education for Penobscot-enrolled families.'
      ]
    },
    {
      group: 'Maine crisis resources (post-Phase-5 referral)',
      icon: '🚨', color: '#f87171',
      bullets: [
        'Maine Crisis Line: dial 988 (national) — connects to Maine\'s in-state crisis system 24/7. Also reachable at 1-888-568-1112 (statewide Maine line).',
        'Maine Mobile Crisis (children): dispatched to the home or school on request, statewide. Available 24/7. Free regardless of insurance. School psychs can request directly during business hours; families can request anytime.',
        'NAMI Maine HelpLine: 1-800-464-5767 — for families navigating mental-health systems, not crisis-line-level urgency. Strong family education resources.',
        'Sweetser (statewide outpatient + in-school services), Spurwink (residential + outpatient youth services), Maine Behavioral Healthcare (MaineHealth network) — three of the larger contracted-provider networks for school-based mental-health services. Aaron should know which contract his district uses.',
        'For acute psychiatric emergencies: Maine Medical Center BIDDLE (Pediatric Behavioral Health Unit, Portland), or the youth-specific intake at Acadia Hospital (Bangor). Both accept emergency-room referrals and direct admissions.'
      ]
    },
    {
      group: 'State-level disability compliance + advocacy',
      icon: '⚖️', color: '#22c55e',
      bullets: [
        'Disability Rights Maine: the federally-designated Protection & Advocacy (P&A) system for Maine. Free legal services for students with disabilities. School psychs should know they exist for the families they serve. drme.org.',
        'Maine Developmental Disabilities Council: state council funded by federal DD Act. Local advocacy projects, Maine-specific employment/housing/community-living resources, supports self-advocacy work by Mainers with disabilities. maineddc.org.',
        'Maine Parent Federation: Maine\'s federally-designated Parent Training & Information Center. Free IEP support for families across the state. mpf.org.',
        'Maine Department of Education special services unit: state-level technical assistance for IEP compliance, due process, and dispute resolution. Maine DOE also publishes the official Maine Unified Special Education Regulation (MUSER), which is the state-level supplement to IDEA.',
        'Maine PBIS Network: technical assistance for Maine schools implementing PBIS. Supports Tier 1-2-3 work statewide.'
      ]
    },
    {
      group: 'Portland Public Schools / King Middle context',
      icon: '🦞', color: '#0ea5e9',
      bullets: [
        'PPS uses the EL Education framework at King Middle and several other PPS schools. Crew (the daily 30-min advisory) is the natural Tier 1 / Tier 2 surface for behavior-support work in this model — small, relational, predictable. Most PBIS Tier 2 interventions can fold into Crew without adding pull-out time.',
        'PPS special services central office is at 353 Cumberland Ave. School-level special-ed coordinators handle most IEP-team logistics; central office handles compliance, due process, and dispute resolution.',
        'PPS multilingual learner population is substantial (English not the first language at home for ~30% of PPS students by recent counts). Coordinate with PPS Multilingual & Multicultural Center for interpreter services for IEP meetings — required by IDEA when needed and a non-default that gets missed.',
        'King Middle\'s flagship status as an EL Education school means visiting practitioners + researchers come through. Useful when the school psych can name the framework explicitly in IEP documentation; it also raises the bar for fidelity of EL practices.',
        'Portland Adult Education has resources for parents pursuing GED or English-language learning who want to support their student\'s IEP process. Worth knowing about for IEP-team conversations with families navigating multiple systems at once.'
      ]
    }
  ];

  // ─────────────────────────────────────────────────────────
  // BIP template — the Tier 3 artifact school psychs write most
  // often. Companion to FBA: the FBA names the function; the BIP
  // is the plan. Eight components in the order most commonly
  // used in IDEA-compliant BIPs. Sources: BACB ethical practice
  // standards; PBIS.org BIP technical guide; OSEP BIP guidance;
  // Iris Center BIP module.
  // ─────────────────────────────────────────────────────────
  var BIP_COMPONENTS = [
    {
      part: 1, name: 'Cover info + FBA reference', icon: '📑', color: '#60a5fa',
      what: 'Student name, IEP team members, BIP draft date + review date, FBA author and date, parent / guardian signature line, student signature line (when developmentally appropriate). The BIP is a legal document — start it like one.',
      sample: 'Student: A. Pomera | DOB: 2014-03-12 | Grade: 6 | IEP team: Garcia (sped), Liu (gen ed), Pomera (school psych), Mom + Dad (parents), A. (student) | FBA completed: 2026-04-22 by S. Pomera | BIP draft: 2026-04-29 | Review date: 2026-07-29',
      pitfall: 'Don\'t skip the student signature line for older elementary and up. A BIP the student has not been told about and does not understand has roughly zero chance of working.'
    },
    {
      part: 2, name: 'Function statement (from FBA)', icon: '🎯', color: '#fbbf24',
      what: 'One-sentence hypothesis carried directly from the FBA. Standard format: "Under [antecedent / setting event], [operationally-defined behavior] occurs to obtain / avoid [consequence], maintained by [function]." This sentence is the spine of every other component below — every strategy in the BIP must trace back to this hypothesis.',
      sample: '"When given a writing task longer than 10 minutes after a poor-sleep night (setting event), Avery rips the worksheet (tearing, balling, throwing) to escape the demand, maintained by removal of the task by the teacher (escape function)."',
      pitfall: 'A BIP without a function statement is a punishment plan. If yours doesn\'t name a function, the FBA hasn\'t been completed — go back upstream.'
    },
    {
      part: 3, name: 'Antecedent strategies (preventive)', icon: '🛡️', color: '#a78bfa',
      what: 'What changes BEFORE the trigger so the trigger doesn\'t evoke the behavior. Address the setting events you can (sleep hygiene communication with family, snack at arrival). Modify the immediate antecedent (chunked writing tasks of 10-min or less; visual countdown; choice of writing topic). Pre-correction immediately before the known-trigger moment.',
      sample: 'For Avery: (a) Daily sleep-quality check at morning CICO (counts as a setting-event monitor); (b) writing tasks chunked into 10-min blocks with a 1-min stretch break between; (c) choice of 3 writing topics offered each day; (d) pre-correction script before each writing block: "Remember, you have a break card if you need it."',
      pitfall: 'Antecedent strategies do the most work and get the least attention in most BIPs. School psychs who weight reactive strategies heavier than antecedent strategies typically end up with BIPs that fail. The work is at the front end of the cycle.'
    },
    {
      part: 4, name: 'Replacement behavior + teaching plan', icon: '🔄', color: '#22c55e',
      what: 'The replacement that meets the same function (per the Replacement Behaviors tab). Operationally defined. Teaching plan: who teaches it, when, how prompted, what fidelity looks like during teaching trials. The replacement must be (1) easier than the problem behavior, (2) more efficient (faster reinforcement), (3) reinforced first, conditions added later.',
      sample: 'Replacement: hand the teacher a printed BREAK card (in pencil case at all times) → teacher hands a 3-min sand timer → student walks to the calm corner (designated, in classroom) → returns when timer ends. Teaching: 5-min daily practice for 2 weeks at non-trigger times; physical prompt fading over 5 sessions; 100% honor rate for 4 weeks before any conditions added.',
      pitfall: 'Don\'t teach a replacement during the actual trigger moment. Teach it cold — when the student is calm — until fluent, then make it available during triggers. Teaching during dysregulation is teaching during Phase 3-4 of the Acting-Out Cycle, when the thinking brain is offline.'
    },
    {
      part: 5, name: 'Reinforcement plan', icon: '⭐', color: '#0ea5e9',
      what: 'What follows the replacement behavior. The reinforcer must (a) be functionally relevant (an escape-function replacement = the break itself is the reinforcer), (b) match or exceed the magnitude of what the problem behavior obtains, (c) be delivered immediately, every time, for the first several weeks. Magnitude tapers over time as the replacement becomes habitual.',
      sample: 'For Avery: the 3-min break IS the reinforcement (escape from demand) — primary reinforcer. PLUS: each break-card use earns 1 point on the CICO sheet (token reinforcement). PLUS: end-of-day acknowledgment in CICO check-out ("you used your card 3 times today and got back to work each time"). Three-layer reinforcement, all functionally relevant.',
      pitfall: 'Don\'t use functionally-irrelevant reinforcers. Stickers do not work for an escape-function behavior. Removing the demand IS the reinforcer. Get the function right and the reinforcer designs itself.'
    },
    {
      part: 6, name: 'Response procedures (when problem behavior still happens)', icon: '🌧️', color: 'var(--allo-stem-text-soft, #94a3b8)',
      what: 'What staff actually do when the problem behavior happens despite the plan. Tied to the Acting-Out Cycle phases: Phase 2-3 → soft de-escalation, redirect to replacement; Phase 4-5 → safety-first, less talking, clear audience. NOT a list of consequences. Staff response language is scripted so all adults respond the same way (consistency is the variable that matters most).',
      sample: 'Phase 2-3 script: "I see this is hard. Your break card is right here." Phase 4: physically move to safe distance, no verbal demands. Phase 5: clear other students from immediate area, signal admin via radio, follow district safety protocol. Phase 7 (recovery): debrief 1-on-1 with school psych, no consequences delivered until full recovery.',
      pitfall: 'Putting consequences in the response-procedures section is the most common BIP-writing error. Consequences are punishment, not response procedure. They go in the school discipline policy, not the BIP. The BIP describes how staff support the cycle, not how staff sanction the student.'
    },
    {
      part: 7, name: 'Crisis plan', icon: '🚨', color: '#f87171',
      what: 'When a Phase 5 (Peak) crisis happens — concrete protocol for safety. Who is called, in what order. Where the student is supported. When parents are notified (Maine Chapter 33 = same-day). Restraint and seclusion authorization (which staff are CPI/NCI/Mandt-trained for this student) — only when documented imminent serious physical injury, never as a planned consequence. Required incident-report timeline.',
      sample: 'Crisis sequence for Avery: (1) signal Garcia (sped) via radio. (2) Garcia clears other students. (3) Liu (gen ed) calls main office; admin walks to room. (4) Pomera (school psych) called; arrives within 5 min. (5) If physical safety threatened: Garcia + admin (both CPI-trained for Avery) follow restraint protocol per Chapter 33. (6) Mom + Dad notified by Pomera same-day. (7) Incident report drafted within 24 hours; team debrief within 48 hours.',
      pitfall: 'Don\'t leave the crisis plan as boilerplate ("call the office"). Name the people. Map the room. Specify the timing. A vague crisis plan is the absence of a crisis plan — and the document the team reaches for at exactly the worst moment.'
    },
    {
      part: 8, name: 'Data collection + fidelity + review', icon: '📊', color: '#14b8a6',
      what: 'What gets measured (frequency of problem behavior, frequency of replacement, percent of staff using prescribed antecedent strategies). Who measures it (designated observer, not the implementing teacher — observer effects matter). How often (daily for first 4 weeks, then weekly). Fidelity checklist for staff implementation (yes/no items; weekly observation). Formal team review date (typically 4-6 weeks).',
      sample: 'Daily measurements: (a) frequency of ripping worksheet (Garcia tally, period-by-period); (b) frequency of break-card use (Garcia tally); (c) CICO daily total (per CICO Template tab). Weekly: 5-min fidelity observation by Pomera against checklist (10 items). Team review: 6 weeks from BIP start (2026-06-10).',
      pitfall: 'Designing data collection that is too burdensome to actually run. If the data plan requires more time than the staff have, the data won\'t get collected — and you\'ll be reviewing a BIP at 6 weeks with no data to review. Smaller, sustainable data > comprehensive, abandoned data.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // CICO — Check-In/Check-Out: the most-used Tier 2 intervention
  // in US schools. PBIS panel mentions it; this section makes the
  // structure concrete enough to actually run. Sources: Crone &
  // Hawken's Behavior Education Program (the original CICO
  // protocol); Center on PBIS implementation guides; multiple
  // peer-reviewed efficacy studies (2010-2020).
  // ─────────────────────────────────────────────────────────
  var CICO_COMPONENTS = [
    {
      step: 1, name: 'Morning check-in', icon: '🌅', color: '#22c55e',
      time: '3-5 minutes',
      what: 'Student arrives at school, goes to a designated adult (NOT classroom teacher — usually a counselor, behavior interventionist, paraeducator, or other "positive adult"). Brief, predictable conversation: "How was last night? What\'s your goal today? Here\'s your point sheet."',
      script: 'A 3-question morning script. (1) "How was your morning getting here?" (2) "What\'s one thing you want to do well today?" (3) "Here\'s your point sheet — same as yesterday. I\'ll see you at the end of the day."',
      pitfall: 'Don\'t skip on busy mornings. The whole intervention rests on the daily relational anchor — missing 2 mornings in a row tells the student the system doesn\'t actually exist.'
    },
    {
      step: 2, name: 'Point sheet — period-by-period', icon: '📋', color: '#a78bfa',
      time: 'embedded in instruction',
      what: 'Student carries a small card. Each period (or each chunk for elementary), the teacher gives a quick 0/1/2 score on 2-3 school-wide expectations (typical: Be Safe, Be Respectful, Be Responsible — same words posted school-wide). Takes ~30 seconds at end of period. Brief written comment optional.',
      script: 'End-of-period script (teacher to student): "Here\'s your card back. 2 / 2 / 1 today — you nailed safe and respectful, and we talked about responsibility on the homework piece. Keep going."',
      pitfall: 'The most common drift: teachers stop scoring honestly because "she had a hard day, I don\'t want to make it worse." Inflated scores destroy the data. Score what happened, not what you wish had happened. The kid will trust the system more, not less.'
    },
    {
      step: 3, name: 'Afternoon check-out', icon: '🌇', color: '#fbbf24',
      time: '3-5 minutes',
      what: 'Same adult, end of day. Add up the total points, calculate percentage, compare to the goal threshold (usually 80%). Brief celebration if hit, brief problem-solving if missed. Card goes home for parent signature. Adult logs the daily total in a tracking spreadsheet.',
      script: '"OK let\'s add it up. 18 out of 24 today — that\'s 75%. So close to your 80% goal. What got in the way 4th period? OK. Take it home, get a parent signature, see you tomorrow."',
      pitfall: 'Don\'t skip the family component. Card-home + signature is what makes CICO different from generic teacher feedback. It builds the home-school feedback loop and gives families a daily window into how the day actually went.'
    },
    {
      step: 4, name: 'Goal threshold + scoring', icon: '🎯', color: '#60a5fa',
      time: 'set at intake',
      what: 'Default threshold: 80% of total possible points. For a typical 6-period day with 3 expectations rated 0-2, max = 36 points; 80% = 29. Lower the bar at intake if the student is far below baseline (start at 50% with rapid step-up rather than guarantee 6 weeks of "failure"). Decision rule: 4-6 weeks of 80%+ = ready to fade; 4-6 weeks of <80% = escalate to Tier 3.',
      script: 'At intake meeting: "We\'re going to start your goal at 65% for the first two weeks — we want you to feel the win first. After that we\'ll bump it to 75%, then 80%."',
      pitfall: 'Too-high initial threshold = the student fails for weeks while the data accumulates "evidence" that CICO doesn\'t work. Too-low threshold = no challenge. The right starting threshold is the one the student can hit ~70% of days in their first two weeks. Adjust based on actual baseline data, not aspirational policy.'
    },
    {
      step: 5, name: 'Fading + maintenance', icon: '🌱', color: '#0ea5e9',
      time: 'after 4-6 weeks of success',
      what: 'When student consistently hits goal: reduce check-in to weekly, then peer-mediated, then to a self-monitoring card. Goal is internal regulation, not lifetime CICO. Most students fade in 8-16 weeks; some need it longer; a few benefit from keeping a light-touch check-in indefinitely.',
      script: '"You\'ve hit your goal 5 weeks in a row. Want to try a peer-mediated version — same card but you check in with [peer mentor] instead of me? We\'ll keep meeting Fridays."',
      pitfall: 'Don\'t fade too fast. Sudden removal = behavior often returns at near-baseline rates within weeks. Plan the fade as carefully as the intake. The goal is a self-regulation skill, not just an absent intervention.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // Equity & disproportionality — the federal data + audit
  // tool school psychs use in IEP and team meetings. The
  // disparities are measured, documented, and the largest
  // single source of disability + race-based system harm in
  // K-12. Sources: U.S. Department of Education Office for
  // Civil Rights (OCR) 2020-21 Civil Rights Data Collection;
  // GAO-18-258 report on K-12 discipline disparities;
  // Maine DOE Special Services data.
  // ─────────────────────────────────────────────────────────
  var EQUITY_DATA = [
    {
      finding: 'Race × discipline',
      icon: '⚖️', color: '#f87171',
      stat: 'Black students are ~3× more likely to be suspended than white students for similar offenses.',
      detail: 'OCR 2020-21 data: Black students are 15% of public school enrollment but 38% of in-school suspensions and 39% of out-of-school suspensions. The gap is largest for "subjective" infractions (defiance, disrespect, disruption) — categories where adult judgment, not bright-line rules, drives the referral.',
      source: 'U.S. Department of Education Office for Civil Rights, Civil Rights Data Collection 2020-21'
    },
    {
      finding: 'Disability × discipline',
      icon: '🦮', color: '#fbbf24',
      stat: 'Students with disabilities are ~2× more likely to be suspended than nondisabled peers.',
      detail: 'Students receiving IDEA services are 13% of enrollment but 25% of out-of-school suspensions and 24% of expulsions. For Black boys with disabilities the rates roughly double again — a compound disparity. IDEA technically protects against discipline for behavior that is a manifestation of the disability, but the manifestation-determination process is uneven and often skipped.',
      source: 'OCR 2020-21; IDEA discipline-data review by NCLD and similar advocacy reporting'
    },
    {
      finding: 'Race × restraint and seclusion',
      icon: '✋', color: '#f87171',
      stat: 'Students with disabilities account for ~12% of enrollment but ~75% of restraint cases nationally.',
      detail: 'Within that already-disproportionate use, Black students with disabilities are restrained at higher rates than white students with similar profiles. The compound disparity at the most coercive end of the discipline spectrum is the largest and most consistent finding across federal datasets.',
      source: 'OCR Civil Rights Data Collection; GAO-18-258'
    },
    {
      finding: 'Pre-K suspension',
      icon: '🧒', color: '#a78bfa',
      stat: 'Pre-K students are suspended and expelled at rates higher than any other grade level.',
      detail: 'Boys are 80% of pre-K suspensions despite being ~50% of pre-K enrollment. Black children are about 18% of pre-K enrollment but ~48% of pre-K suspensions. The disparity begins before age 5 — well before any test score, well before any academic gap. The data tells a story about adult perception, not about child behavior.',
      source: 'OCR 2014 first-of-kind pre-K data, sustained in 2020-21 collection'
    },
    {
      finding: 'Subjective vs objective offenses',
      icon: '🔍', color: '#22c55e',
      stat: 'The disparity gap is widest for "defiance" / "disrespect" / "disruption" referrals.',
      detail: 'For objective violations (weapons, drugs, fighting), referral rates are similar across racial groups. For subjective violations — categories that depend almost entirely on adult judgment — the gap widens dramatically. This is the single most useful diagnostic for whether a discipline disparity is implicit-bias-driven: look at the disproportionality category by category. Subjective spike = bias signal.',
      source: 'Skiba et al. 2014 (the foundational meta-analysis); OCR data'
    }
  ];

  var EQUITY_AUDIT_QUESTIONS = [
    {
      q: 'Pull last year\'s ODR (office discipline referral) data, broken down by race × disability × grade × offense category. Is your building\'s disproportionality concentrated in subjective-offense categories?',
      why: 'If yes, the intervention is not a stricter discipline policy. The intervention is teacher coaching on what triggers a referral and implicit-bias work. Discipline policy reform is downstream of referral-decision reform.'
    },
    {
      q: 'For your top 5 most-referred students this year, do you have FBA-level functional understanding of why each is being referred — or do you have repeated incident reports and no plan?',
      why: 'Repeated referrals without a function hypothesis is a signal the team has been documenting, not problem-solving. The disability-discipline disparity is partly built on this gap: documenting noncompliance instead of asking why noncompliance is happening.'
    },
    {
      q: 'When a manifestation determination is required (after 10 cumulative removal days for an IDEA student), is your team running the actual two-prong analysis — or skipping to "we need to discipline them"?',
      why: 'The two prongs: (1) was the conduct caused by, or had a direct and substantial relationship to, the disability? (2) was the conduct the direct result of failure to implement the IEP? Skipping this analysis is the most common compliance failure in restrictive-discipline cases — and one of the most common bases for state due-process complaints.'
    },
    {
      q: 'Are restraint/seclusion incidents disaggregated by student demographics in your district reporting? If not, who else is reviewing the patterns?',
      why: 'You cannot see what you do not measure. Federal OCR collects this data biennially but the building-level pattern often is not visible to the IEP teams making real-time decisions. School psychs who pull and review this data quarterly find patterns the formal reporting cycle misses.'
    },
    {
      q: 'When a Black student with a disability is repeatedly restrained, is the response a BIP revision OR an environmental review of WHO is calling for restraint and on WHAT antecedents?',
      why: 'Sometimes the BIP works fine in some classrooms and fails in others. That is a STAFF pattern, not a student pattern. Naming it explicitly is hard but is often the most accurate intervention target. The disproportionality data points back to adult decision-making more often than to student behavior.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // Restraint and seclusion — the highest-stakes content
  // ─────────────────────────────────────────────────────────
  var RESTRAINT_PRINCIPLES = [
    { name: 'What restraint IS (and is NOT)', icon: '⚖️', color: '#fbbf24',
      content: 'Restraint = physical holding that restricts a student\'s freedom of movement. Three types: physical (staff hands on student), mechanical (devices that restrict — almost never appropriate in schools), chemical (medication used for behavioral control rather than treatment — never appropriate without prescription).',
      counter: 'NOT restraint: brief holding to prevent immediate injury (e.g., catching a falling kid); routine guidance (gentle hand on shoulder to redirect); typical physical contact in adapted PE or therapy. The line is restriction of freedom of movement.' },
    { name: 'What seclusion IS (and is NOT)', icon: '🚪', color: '#f87171',
      content: 'Seclusion = involuntary confinement of a student alone in a room or area from which the student is physically prevented from leaving. The "physically prevented from leaving" part is what makes it seclusion legally.',
      counter: 'NOT seclusion: time-out where the student can leave (a "calm corner" with the door open); a quiet space chosen by the student; a sensory room used for regulation. Voluntary use of a separate space is not seclusion.' },
    { name: 'Maine Chapter 33 — the rule', icon: '🏛️', color: '#a78bfa',
      content: 'Maine permits emergency physical restraint and seclusion ONLY when there is "imminent danger of serious physical injury" to the student or others. Property destruction alone is not sufficient justification. Documentation, debrief, and parent notification are mandatory within specific time windows. Specific staff training (currently CPI / NCI / Mandt or equivalent) is required for anyone authorized to perform restraint.',
      counter: 'Other states vary: some prohibit prone restraint outright; some require court-ordered behavior plans for any restraint use; some are far more permissive. Always check current state regulation. Federal guidance (2022) recommends restricting school-based restraint/seclusion to genuine emergencies; some federal legislation has been proposed but not enacted.' },
    { name: 'Less-restrictive-alternative principle', icon: '🔓', color: '#22c55e',
      content: 'Every restraint or seclusion use must be the least restrictive option available to manage the immediate safety concern. If a student can be safely de-escalated by clearing the room of others, that comes before restraint. If a student can be safely supported with verbal de-escalation, that comes before clearing the room. The hierarchy is built into law and ethics — not optional.',
      counter: 'Common misuse: restraint or seclusion used as a consequence ("if you do that again, you will go to the calm room"). That converts an emergency tool into a punishment, which is both unethical and frequently illegal under disability law.' },
    { name: 'After every incident — the debrief', icon: '📝', color: '#60a5fa',
      content: 'Within ~24-48 hours: an incident report (what happened, who, when, duration, less-restrictive alternatives tried first). A staff debrief about what could be done differently next time. Parent notification (Maine requires same-day or next-business-day). A team meeting to revise the BIP if the incident reveals a pattern. The student debrief — when the student is fully recovered — to hear their perspective.',
      counter: 'Common gap: incidents get documented but the BIP never gets revised. Three or more incidents of the same antecedent in a quarter is a system signal that the BIP itself is failing — not a kid signal. Pattern-blindness is the most common documentation problem.' },
    { name: 'The disability-community position', icon: '✋', color: '#f472b6',
      content: 'Major disability-rights organizations (ASAN, AAPD, COPAA, Disability Rights Network) have called for substantial federal restriction of school restraint and seclusion. Documented harms include physical injury, psychological trauma (PTSD outcomes are well-documented), and disproportionate use against students of color and students with disabilities. Federal data show students with disabilities account for ~12% of enrollment but ~75% of restraint cases.',
      counter: 'Some BCBAs and behavior specialists argue restraint is occasionally necessary in genuine safety emergencies. Both positions can be true: emergencies happen AND the system overuses restraint by orders of magnitude. The ethical floor is "every restraint is one too many that should have been prevented earlier in the cycle."' }
  ];

  // ─────────────────────────────────────────────────────────
  // Function-Matcher practice scenarios — 8 short ABC vignettes
  // mapping to the four ABA functions (ATT/ESC/TAN/AUT).
  // Used by the interactive practice widget above the Replacement
  // Behaviors content. Scenarios are real-classroom-shaped, not
  // textbook-shaped, and each correct-answer explanation cites
  // the data signal that disambiguates the function.
  // ─────────────────────────────────────────────────────────
  var MATCHER_SCENARIOS = [
    {
      id: 'm1',
      stem: 'During morning meeting, Avery starts making loud animal noises. The teacher walks over, says "Avery, please stop" and puts a hand on Avery\'s shoulder. Avery beams and says "sorry!" — then does it again 4 minutes later.',
      answer: 'ATT',
      why: 'Behavior produces adult attention (verbal + physical contact). It repeats on a short interval after the attention is delivered. Classic ATT signature: the consequence the adult thought was a correction is functioning as a reinforcer.',
      whyNot: {
        ESC: 'Morning meeting continued right after the redirection — no aversive demand was removed or delayed, so escape is not the maintaining payoff.',
        TAN: 'Avery did not gain access to any preferred object, toy, or privilege; the only consequence delivered was adult eye contact, speech, and shoulder touch.',
        AUT: 'Avery beamed specifically when the teacher approached and repeated the behavior on a 4-minute social cycle rather than continuing unchanged whether adults responded or not.'
      }
    },
    {
      id: 'm2',
      stem: 'Marcus is given a 3-page math worksheet. Within 2 minutes he crumples it and throws it on the floor. The teacher takes the worksheet away and gives him a "cool down" timer instead. Marcus visibly relaxes.',
      answer: 'ESC',
      why: 'The disruptive behavior produced removal of the demand (worksheet taken, "cool down" replaces it). Visible relaxation = relief response = the demand was aversive. ESC every time the teacher solves the disruption by ending the task.',
      whyNot: {
        ATT: 'The teacher did not stay to converse or hover; Marcus visibly relaxed as soon as the worksheet disappeared, pointing to demand removal rather than adult interaction.',
        TAN: 'The cool-down timer is not a coveted preferred item Marcus was chasing beforehand — the behavior began only when the 3-page math demand was placed in front of him.',
        AUT: 'If crumpling were automatic sensory regulation, it would occur across preferred and non-preferred tasks; here it reliably triggers within 2 minutes of a long math sheet and stops once the work is removed.'
      }
    },
    {
      id: 'm3',
      stem: 'Riley keeps grabbing the iPad off Jordan\'s desk during free choice time. When the teacher gives Riley her own iPad to stop the grabbing, Riley calms immediately and stays calm as long as she has the iPad.',
      answer: 'TAN',
      why: 'Access to the specific item (iPad) ends the behavior. State change is contingent on possession of the tangible, not on attention or escape. Trade away the iPad and the behavior comes back — that is the TAN test.',
      whyNot: {
        ATT: 'Once Riley receives her own iPad, she stays calm independently without continuing to bid for teacher or peer attention.',
        ESC: 'This occurs during preferred free-choice time with no aversive academic demand to avoid — Riley is moving toward a specific item, not away from work.',
        AUT: 'The behavior stops immediately upon receiving one specific external device rather than persisting across conditions for internal sensory feedback.'
      }
    },
    {
      id: 'm4',
      stem: 'Casey, an autistic 4th grader, hums quietly during independent work. The humming continues whether or not adults are present, whether peers are added or removed, during preferred AND non-preferred activities.',
      answer: 'AUT',
      why: 'Behavior is invariant across attention/escape/tangible conditions. That is the operational definition of automatic / sensory function — the behavior is its own reinforcer. NOTE: Casey\'s humming is regulating, not misbehaving. Most automatic-function behaviors should be accommodated, not extinguished.',
      whyNot: {
        ATT: 'The humming continues identically when no adults or peers are present, ruling out social attention as the maintaining consequence.',
        ESC: 'Casey hums just as much during preferred activities as during non-preferred work, showing the behavior is not driven by task avoidance.',
        TAN: 'No item or activity is requested, grabbed, or delivered contingent on humming; the auditory/proprioceptive vibration itself is the reinforcer.'
      }
    },
    {
      id: 'm5',
      stem: 'Devon falls dramatically to the floor every time the librarian tells the class to "find a quiet spot." The librarian rushes over to check on Devon every time. Falls happen 3 times per library period.',
      answer: 'ATT',
      why: 'Behavior reliably recruits 1-on-1 adult contact (the rush-over-to-check). Frequency stable (3 per period) suggests stable reinforcement schedule. ATT signature: the behavior is "wasted" if no adult sees it.',
      whyNot: {
        ESC: 'Finding a quiet reading spot is not removed as a long-term task — the falls repeat 3 times right as adult focus shifts back to the wider group, matching attention recruitment.',
        TAN: 'No preferred book, device, or prize is handed to Devon after falling; the consistent payoff is immediate worried adult rush-over.',
        AUT: 'The falls are timed specifically to the librarian\'s transition cue and adult presence rather than occurring steadily across alone or sensory conditions.'
      }
    },
    {
      id: 'm6',
      stem: 'When the speech therapist arrives at the door of Jamie\'s classroom, Jamie immediately reports "My stomach hurts, I can\'t go." Twice this month, the SLP has called it off and Jamie\'s stomach pain dissolved by lunch.',
      answer: 'ESC',
      why: 'Reported symptom is contingent on the SLP arrival (timing) and resolves once the SLP leaves (relief contingency). The body is doing what works — the symptom IS the escape behavior. Do not assume it is "fake"; the function pattern is what matters for the BIP.',
      whyNot: {
        ATT: 'Jamie does not seek extended conversation with the SLP; the discomfort ends as soon as the SLP leaves and the session is canceled.',
        TAN: 'Jamie does not gain a preferred toy, food, or screen from reporting stomach pain — the direct consequence is avoiding the speech session.',
        AUT: 'While somatic anxiety is real, the tight onset at the SLP\'s doorway arrival and rapid resolution once the demand is canceled point to an escape contingency (which still calls for gentle medical/anxiety check-in alongside functional supports).'
      }
    },
    {
      id: 'm7',
      stem: 'Sam shouts "I want a SNACK!" loudly during read-aloud. The aide gets him a granola bar to quiet him. He is now shouting for a snack 6 times per day, up from 1.',
      answer: 'TAN',
      why: 'Frequency increased from 1 to 6 after the aide started delivering the granola bar contingent on the shout. Behavior delivers the specific tangible item; deliver the item, behavior repeats. Note: well-intentioned compliance is the most common engineered TAN trap.',
      whyNot: {
        ATT: 'The shout specifically names an item and escalates sixfold once the granola bar is delivered; brief aide contact alone without the snack would not explain the targeted escalation.',
        ESC: 'Sam remains in read-aloud once he gets the granola bar rather than leaving the rug, showing he is working to obtain the food item rather than leave the activity.',
        AUT: 'The dramatic increase from 1 to 6 occurrences directly tracks the aide\'s contingent delivery of food, proving socially mediated tangible reinforcement.'
      }
    },
    {
      id: 'm8',
      stem: 'Kyle, a 7th grader with ADHD, taps his pencil rhythmically during tests. The tapping continues during quiet study, after staff ask him to stop, and even during preferred activities. He says "I don\'t even notice I do it."',
      answer: 'AUT',
      why: 'Continues across all four conditions (attention given/withheld, demand present/absent, tangible irrelevant). The student\'s own report ("don\'t notice I do it") is consistent with non-conscious sensory regulation. AUT — which means accommodation (a fidget, gum, headphones), not extinction.',
      whyNot: {
        ATT: 'Staff verbal requests to stop do not follow a recruit-and-pause cycle — Kyle keeps tapping even when completely ignored or absorbed in preferred work.',
        ESC: 'Tapping never removes the test or study task and occurs equally during preferred activities, ruling out task escape.',
        TAN: 'No preferred object or activity is earned by tapping; the rhythmic motor/auditory feedback itself helps regulate focus.'
      }
    }
  ];

  // Function abbreviations + colors for matcher chips. Mirrors the
  // REPLACEMENT_BEHAVIORS color palette so the chip color the student
  // clicks here matches the function-card color one section down.
  var FUNCTIONS_KEY = [
    { code: 'ATT', label: 'Attention', icon: '👀', color: '#60a5fa' },
    { code: 'ESC', label: 'Escape',    icon: '🚪', color: '#f87171' },
    { code: 'TAN', label: 'Tangible',  icon: '🎮', color: '#f59e0b' },
    { code: 'AUT', label: 'Sensory',   icon: '🪀', color: '#a78bfa' }
  ];

  // ─────────────────────────────────────────────────────────
  // Restraint/Seclusion Ethics Decision Tree
  // Two branching scenarios that walk a school psych through
  // Maine Chapter 33 logic in real-time. Each node has 2-3
  // choices; each choice has a verdict (CORRECT / WRONG / NUANCED),
  // plain-English reasoning, the relevant Ch. 33 / Colvin / less-
  // restrictive-alternative principle, and a `next` pointer to
  // continue the scenario or null to terminate.
  // Sources: Maine Chapter 33 (school restraint/seclusion regs);
  // Colvin Acting-Out Cycle; ASAN restraint position statement;
  // less-restrictive-alternative doctrine in IDEA case law.
  // ─────────────────────────────────────────────────────────
  var DECISION_SCENARIOS = [
    {
      id: 'chair',
      title: 'The thrown chair',
      stem: 'An 8th-grade student is yelling profanity and has just thrown a classroom chair across an empty corner of the room. No one was hit. The student is breathing hard, eyes scanning the room. Three other students are present. You are the school psych called to the room.',
      icon: '🪑', color: '#f87171',
      nodes: {
        start: {
          prompt: 'What is the FIRST decision?',
          choices: [
            { label: 'Authorize physical restraint immediately — property was destroyed.',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'Maine Chapter 33 §3 — Emergency Restraint Definition.',
              why: 'Property destruction alone is NOT sufficient justification for restraint under Maine Ch. 33. The authorizing standard is "imminent danger of serious physical injury" to the student or others. A thrown chair to an empty corner does not meet that threshold yet.',
              next: null },
            { label: 'Direct staff to clear the room of other students; begin verbal de-escalation from a safe distance.',
              verdict: 'CORRECT', verdictColor: '#22c55e',
              cite: 'Less-Restrictive-Alternative principle + Colvin Phase 4 (Acceleration).',
              why: 'Clearing the audience reduces the escalation pressure (peers raise the stakes). Verbal de-escalation from distance is the least restrictive option that addresses the immediate safety concern. This is the textbook Phase-4 move.',
              next: 'chair_2' },
            { label: 'Tell the student loudly to sit down or face suspension.',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'Colvin Acting-Out Cycle, Phase 4 — Acceleration.',
              why: 'Threats and demands during Phase 4 pull the adult INTO the cycle. The thinking brain is already losing access; loud commands plus consequence threats predictably escalate to Phase 5 (Peak). This is the most common adult-mistake moment in the entire cycle.',
              next: null }
          ]
        },
        chair_2: {
          prompt: 'Other students are now in the hall. The student picks up another chair and lifts it overhead, shouting toward you. You are 8 feet away. What now?',
          choices: [
            { label: 'Step closer to take the chair from the student.',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'Less-Restrictive-Alternative principle + safety doctrine.',
              why: 'Closing distance gives the student a target and increases imminent danger to YOU. Most CPI/NCI/Mandt curricula are explicit: never close distance on a person holding a potential weapon unless restraint is authorized AND staffed.',
              next: null },
            { label: 'Maintain distance, lower your voice, use one short sentence: "I am not going to hurt you. Put it down when you are ready."',
              verdict: 'CORRECT', verdictColor: '#22c55e',
              cite: 'Colvin Phase 4-5 verbal de-escalation; CPI verbal-intervention model.',
              why: 'Distance preserved, threat-level lowered (your voice down, not up), one short sentence (the brain at Phase 4-5 cannot process complex language), no demand, no threat. Acknowledges the student\'s safety concern about YOU first — many escalations are driven by perceived adult threat.',
              next: 'chair_3' },
            { label: 'Authorize physical restraint now — staff member is at imminent risk.',
              verdict: 'NUANCED', verdictColor: '#fbbf24',
              cite: 'Maine Chapter 33 — emergency restraint may be authorized; LRA still applies.',
              why: 'Imminent danger threshold is now arguably met (chair raised, you as target). Restraint MAY be authorized — but only if (a) certified staff are present, (b) verbal de-escalation has been attempted, (c) less-restrictive alternatives are still inadequate. Most experienced practitioners would still try one verbal sentence first. Document the decision either way.',
              next: 'chair_3' }
          ]
        },
        chair_3: {
          prompt: 'After ~30 seconds of silence, the student lowers the chair, sits down, and starts crying. What is next?',
          choices: [
            { label: 'Process what happened immediately: "Why did you do that? You could have hurt someone."',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'Colvin Cycle — Phase 6 (De-escalation) is not for processing.',
              why: 'Phase 6 is exhaustion + emotional release. The thinking brain has not yet returned online (that is Phase 7, often 20+ minutes later). Pushing for "why" during Phase 6 produces hollow apology, dissociation, or re-escalation. Wait.',
              next: null },
            { label: 'Stay present, offer water, give physical space; debrief later when student is at baseline.',
              verdict: 'CORRECT', verdictColor: '#22c55e',
              cite: 'Colvin Cycle Phase 6 → Phase 7 transition; Maine Ch. 33 debrief timing.',
              why: 'Right call. Phase 6 needs presence without demand. Maine Ch. 33 also requires a same-day staff debrief and a Phase-7 student debrief — but the student debrief happens AFTER recovery, not during it. Document the incident now; debrief when the student\'s thinking brain is back.',
              next: 'chair_terminal' },
            { label: 'Send the student to the office for a discipline write-up.',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'IDEA Manifestation Determination + Colvin Phase 6.',
              why: 'Reactive consequencing during de-escalation re-triggers the cycle and undermines repair. If this student has an IEP and the behavior is a manifestation of the disability, discipline-track responses also raise legal exposure. Document for the FBA/BIP team — do not punish in the moment.',
              next: 'chair_terminal' }
          ]
        },
        chair_terminal: {
          prompt: 'Scenario complete. Within 24 hours, what MUST happen?',
          terminal: true,
          summary: 'Maine Chapter 33 post-incident requirements: (1) incident report documenting what was tried before restraint, who was certified, duration; (2) same-day verbal + next-business-day written parent notification; (3) staff debrief within 5 school days; (4) student debrief once recovered; (5) team meeting to consider BIP revision IF the incident reveals a pattern. The post-incident work is where most documentation gaps occur — and where state OCR investigations find them.'
        }
      }
    },
    {
      id: 'elope',
      title: 'Kindergarten elopement',
      stem: 'A kindergartener has eloped from the classroom, run down the hallway, and is now standing in front of the open exit door at the end of the hall. The door leads directly to a small parking lot used for staff drop-off. You are 30 feet away.',
      icon: '🚪', color: '#fbbf24',
      nodes: {
        start: {
          prompt: 'What is the FIRST decision?',
          choices: [
            { label: 'Sprint at full speed to grab the child before they reach the door.',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'Chase reflex + LRA principle.',
              why: 'Sprinting triggers the kindergartener\'s chase-reflex. Most likely outcome: child runs OUT the door because you are coming AT them. You have just made the imminent-danger situation worse with a tactic that felt protective.',
              next: null },
            { label: 'Walk briskly but calmly along the wall, narrate softly: "I am coming over to you. You are safe."',
              verdict: 'CORRECT', verdictColor: '#22c55e',
              cite: 'De-escalation movement principles for early childhood.',
              why: 'Wall path reduces the visual chase signal (you are not approaching head-on). Soft narration tells the child what is happening without commands. Brisk-but-calm pace acknowledges urgency without triggering flight. Textbook early-childhood approach.',
              next: 'elope_2' },
            { label: 'Call for the nearest adult to position between the child and the door, while you approach calmly.',
              verdict: 'CORRECT', verdictColor: '#22c55e',
              cite: 'Less-Restrictive-Alternative + barrier principle.',
              why: 'A second adult creates a safety barrier without confrontation. The child is no longer one step from the parking lot. This is also CORRECT — sometimes there are two valid answers and choosing between them depends on staffing.',
              next: 'elope_2' }
          ]
        },
        elope_2: {
          prompt: 'You walk the child back to the classroom holding their hand. They cooperate. Back in the classroom, you write the documentation. Which is correct?',
          choices: [
            { label: 'File this as an "elopement-with-restraint" incident — you held the child\'s hand to walk them back.',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'Maine Chapter 33 — Restraint Definition.',
              why: 'Routine hand-guidance is NOT restraint under Maine Ch. 33. Restraint requires "physical holding that restricts a student\'s freedom of movement." A cooperatively-held hand on the walk back does not meet that bar. Over-coding routine guidance as restraint inflates the building\'s reportable numbers and obscures actual restraint patterns in the data.',
              next: null },
            { label: 'File as elopement only — note the antecedent (transition from circle time to math) and the function hypothesis.',
              verdict: 'CORRECT', verdictColor: '#22c55e',
              cite: 'PBIS data practices + IDEA FBA-driven response.',
              why: 'All elopement-to-exit incidents need (a) incident documentation, (b) antecedent analysis (what was happening just before?), (c) function hypothesis (was this escape from the math demand? attention from the chase response? sensory? tangible — pulled to something outside?). Without those three columns, the elopement is just a story; with them, it is FBA-pending data.',
              next: 'elope_3' },
            { label: 'No documentation needed — the child is safe and back in class.',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'IDEA + district safety policy + insurance liability.',
              why: 'All elopement-to-exit incidents require an incident report regardless of outcome. Lack of injury does not retire the documentation duty. Pattern-blind buildings are how elopement-to-traffic tragedies happen — the prior near-misses were not in the data because no one wrote them down.',
              next: 'elope_3' }
          ]
        },
        elope_3: {
          prompt: 'Two days later, the child elopes again — same antecedent (math transition), different exit door. The IEP has no elopement plan. What is your move as the school psych?',
          choices: [
            { label: 'Convene an IEP team meeting; FBA targeted on the math-transition antecedent; draft an elopement-specific BIP add-on.',
              verdict: 'CORRECT', verdictColor: '#22c55e',
              cite: 'IDEA — IEP team duty when behavior impedes learning; FBA-driven BIP.',
              why: 'Two incidents on the same antecedent in 48 hours is a clear pattern signal. IDEA places an affirmative duty on the IEP team to consider behavior interventions when behavior impedes learning. The FBA + targeted BIP add-on is the appropriate Tier-3 response. Same-day staff plan (door supervision during transitions) is reasonable as a stop-gap.',
              next: 'elope_terminal' },
            { label: 'Ask classroom staff to "watch the child more carefully" during transitions.',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'IDEA — fidelity of supports + adult-system over individual adult vigilance.',
              why: 'Vigilance is not a behavior plan. A repeated antecedent-specific elopement requires a system response (FBA, BIP, environmental change), not a hope that staff catch it next time. Adult vigilance fails predictably; structured plans fail less.',
              next: null },
            { label: 'Discipline the child for leaving without permission.',
              verdict: 'WRONG', verdictColor: '#ef4444',
              cite: 'IDEA Manifestation Determination + IDEA discipline procedures.',
              why: 'Elopement on a repeated antecedent is almost certainly a behavioral manifestation of disability or unmet need. Discipline-track response is procedurally and ethically wrong here. Also: 5-year-olds do not benefit from punitive consequences for behavior they cannot yet self-regulate.',
              next: null }
          ]
        },
        elope_terminal: {
          prompt: 'Scenario complete. The system response is in motion.',
          terminal: true,
          summary: 'Two patterns to internalize: (1) Routine hand-guidance is not restraint — over-coding inflates data and obscures real patterns. (2) Two incidents on the same antecedent within a short window is a system signal that should trigger FBA + BIP work, not vigilance pleas. Document the antecedent every time so the pattern surfaces in week 1, not week 8.'
        }
      }
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SCHOOL_BEHAVIOR_ENGINE — Pure deterministic behavior-practice
  // engine (zero React, zero DOM). Exposed on registered tool config
  // as `_engine` and globally as `window.SchoolBehaviorToolkitPure`.
  // ─────────────────────────────────────────────────────────
  function hashSeed(input) {
    var str = String(input == null ? 'sbt' : input);
    var hVal = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      hVal ^= str.charCodeAt(i);
      hVal = Math.imul(hVal, 16777619) >>> 0;
    }
    return hVal >>> 0;
  }

  function seededShuffle(items, seed) {
    var arr = Array.isArray(items) ? items.slice() : [];
    var s = (typeof seed === 'number' && Number.isFinite(seed)) ? (seed >>> 0) : hashSeed(seed);
    function nextRand() {
      s = (s + 0x6D2B79F5) >>> 0;
      var tVal = Math.imul(s ^ (s >>> 15), 1 | s);
      tVal = (tVal + Math.imul(tVal ^ (tVal >>> 7), 61 | tVal)) ^ tVal;
      return ((tVal ^ (tVal >>> 14)) >>> 0) / 4294967296;
    }
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(nextRand() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  var ABC_CODING_CASES = [
    {
      id: 'abc-1',
      title: 'Extended Writing Block — 5th Grade',
      studentContext: '5th-grade ELA classroom; three consecutive Tuesday/Thursday morning observations.',
      logs: [
        { time: '9:05 AM', settingEventNote: 'Parent message: slept 4 hours, skipped breakfast', antecedent: 'Teacher assigns 2-paragraph silent essay', behavior: 'Drops pencil, shoves notebook off desk, puts hood up', consequence: 'Teacher walks over, lets student sit in back reading corner until essay ends' },
        { time: '9:20 AM', settingEventNote: 'Yawning, head resting on arm at arrival', antecedent: 'Para prompts student to start paragraph 1', behavior: 'Says "This is stupid," crumples outline paper', consequence: 'Para removes prompt sheet and says "We can finish tomorrow"' },
        { time: '9:42 AM', settingEventNote: 'Stated "My head hurts" at morning greeting', antecedent: 'Teacher places fresh graphic organizer on desk', behavior: 'Turns chair away and refuses to pick up pencil for 6 min', consequence: 'Class transitions to art; writing work is tucked into unfinished folder' }
      ],
      correctFunction: 'ESC',
      whyFunction: 'Across all three rows, disruptive refusal starts immediately after a written task demand and reliably ends with removal or postponement of the writing task.',
      whyNotFunction: {
        ATT: 'The student is not bidding to extend adult interaction — putting the hood up, turning away, and relaxing once left alone in the corner signal demand avoidance rather than attention recruitment.',
        TAN: 'No preferred toy, snack, or device is requested or delivered contingent on the behavior; the consistent consequence is ending the writing assignment.',
        AUT: 'The behavior starts sharply on writing prompts and resolves when the class moves to art, rather than continuing across preferred and non-preferred settings.'
      },
      settingEventOptions: [
        { id: 'bio', category: 'Biological', label: 'Biological — poor sleep, skipped breakfast, and headache lowered threshold' },
        { id: 'peer', category: 'Peer / social', label: 'Peer / social — conflict with classmates during writing' },
        { id: 'home', category: 'Home / family', label: 'Home / family — custody transition earlier in the week' },
        { id: 'sens', category: 'Sensory / environmental', label: 'Sensory / environmental — cafeteria odor entering the room' }
      ],
      correctSettingEventId: 'bio',
      whySettingEvent: 'Sleep deprivation, hunger, and headache are classic biological setting events that sharply lower frustration tolerance for sustained cognitive demands.',
      whyNotSettingEvent: {
        peer: 'None of the three observation rows show peer conflict, teasing, or group-chat fallout preceding the writing refusal.',
        home: 'No custody switch or family disruption appears in the ABC setting-event column; the parent explicitly logged poor sleep and missed breakfast.',
        sens: 'No fluorescent buzz, noise spike, or odor is recorded in the classroom environment notes.'
      },
      functionStatement: 'When assigned sustained independent writing after poor sleep and missed breakfast (biological setting event), the student shoves materials and refuses work to avoid the writing demand, maintained by task removal (ESC).'
    },
    {
      id: 'abc-2',
      title: 'Small-Group Math Rotation — 4th Grade',
      studentContext: '4th-grade math block; observed across two days with a building substitute.',
      logs: [
        { time: '10:12 AM', settingEventNote: 'Substitute teacher covering; morning routine order changed', antecedent: 'Substitute begins working with Table 2 across the room', behavior: 'Makes loud siren noises and taps desk while glancing at substitute', consequence: 'Substitute pauses Table 2, walks over, and talks with student for 90 seconds' },
        { time: '10:21 AM', settingEventNote: 'Visual schedule not updated for substitute', antecedent: 'Substitute returns attention to Table 2', behavior: 'Drops entire pencil box onto tile floor and laughs loudly', consequence: 'Substitute and two nearby peers stop, look over, and help pick up pencils' },
        { time: '10:33 AM', settingEventNote: 'Student asked twice "When is Ms. Reyes coming back?"', antecedent: 'Substitute turns toward whiteboard to model a problem', behavior: 'Calls out jokes in a loud voice until adult turns around', consequence: 'Substitute stops writing, makes eye contact, and delivers a 1-minute lecture' }
      ],
      correctFunction: 'ATT',
      whyFunction: 'Every episode occurs precisely when adult focus shifts away and reliably recruits immediate eye contact, verbal redirection, or peer focus — even though the substitute meant the lecture as a correction.',
      whyNotFunction: {
        ESC: 'The student is not excused from math or sent out of the room; the disruptions pause briefly while the adult talks to them and restart the moment the adult turns back to other students.',
        TAN: 'No preferred object, game, or snack is obtained; the consequence across all three rows is immediate social attention.',
        AUT: 'The student actively glances at the substitute and times vocalizations to moments when the adult looks away, ruling out socially invariant automatic reinforcement.'
      },
      settingEventOptions: [
        { id: 'bio', category: 'Biological', label: 'Biological — acute ear infection or medication side effect' },
        { id: 'sched', category: 'Schedule / setting', label: 'Schedule / setting — substitute teacher and altered morning routine' },
        { id: 'sens', category: 'Sensory / environmental', label: 'Sensory / environmental — gym noise vibrating through the wall' },
        { id: 'mh', category: 'Mental health', label: 'Mental health — seasonal trauma anniversary noted on calendar' }
      ],
      correctSettingEventId: 'sched',
      whySettingEvent: 'An unexpected substitute teacher and un-updated visual schedule remove predictable adult check-ins, acting as a schedule/setting event that intensifies attention-seeking bids.',
      whyNotSettingEvent: {
        bio: 'No physical pain, fatigue, illness, or medication change was reported in the observation log.',
        sens: 'Environmental noise or lighting triggers are not documented; the setting-event notes specifically cite the substitute and routine change.',
        mh: 'While predictability reduces stress, the direct documented setting event is the substitute teacher and missing schedule update rather than a trauma anniversary.'
      },
      functionStatement: 'When adult focus shifts to other groups on a substitute-teacher day with altered routines (schedule setting event), the student calls out and drops materials to recruit adult and peer attention, maintained by immediate redirection (ATT).'
    },
    {
      id: 'abc-3',
      title: 'Choice-Time Robotics Corner — 2nd Grade',
      studentContext: '2nd-grade inclusive classroom; afternoon centers across three sessions.',
      logs: [
        { time: '1:15 PM', settingEventNote: 'Parent left for 1-week work trip; tearful morning drop-off', antecedent: 'Timer chimes signaling turn switch off the robotics tablet', behavior: 'Clutches tablet to chest and screams "NO, FIVE MORE!"', consequence: 'Aide grants "two extra minutes" to calm the room; screaming stops immediately' },
        { time: '1:28 PM', settingEventNote: 'Asked aide at lunch if parent called yet', antecedent: 'Peer takes the coding robot for the next station turn', behavior: 'Lunges toward peer\'s tray and cries loudly on the rug', consequence: 'Teacher hands student the backup robot from the closet; crying stops within 10 seconds' },
        { time: '1:44 PM', settingEventNote: 'Clinging to favorite comfort item since arrival', antecedent: 'Teacher announces cleanup of robotics materials before pack-up', behavior: 'Throws bin lid and shouts until handed a robot figurine to carry to lockers', consequence: 'Student walks calmly to cubbies holding the figurine' }
      ],
      correctFunction: 'TAN',
      whyFunction: 'Every burst begins when access to a specific preferred item (tablet/robot) is removed or delayed, and stops within seconds once the item or a substitute tangible is placed in the student\'s hands.',
      whyNotFunction: {
        ATT: 'The student stops crying immediately upon regaining the item even when staff walk away, showing possession of the tangible — not prolonged adult conversation — is the reinforcer.',
        ESC: 'The behavior happens during a highly preferred choice station and ceases once a figurine is allowed at pack-up, showing the goal is obtaining/keeping preferred items rather than escaping hard academics.',
        AUT: 'The vocalizations turn on and off tightly around external item removal and delivery rather than occurring regardless of what items are available.'
      },
      settingEventOptions: [
        { id: 'sens', category: 'Sensory / environmental', label: 'Sensory / environmental — fluorescent light flicker near the rug' },
        { id: 'peer', category: 'Peer / social', label: 'Peer / social — ongoing bullying during recess' },
        { id: 'home', category: 'Home / family', label: 'Home / family — parent away on work trip after a tearful drop-off' },
        { id: 'bio', category: 'Biological', label: 'Biological — skipped lunch and low blood sugar' }
      ],
      correctSettingEventId: 'home',
      whySettingEvent: 'Family separation and a tearful morning drop-off are home/family setting events that increase the motivating value of comforting preferred items hours later in the afternoon.',
      whyNotSettingEvent: {
        sens: 'No lighting, noise, or temperature issue was noted in the afternoon log.',
        peer: 'The conflict with the peer is over the robot turn itself; there is no record of recess bullying or social exclusion.',
        bio: 'The student attended lunch and asked about their parent — hunger or illness was not recorded.'
      },
      functionStatement: 'When access to robotics materials ends following a family separation morning (home/family setting event), the student screams and grabs to keep or regain the item, maintained by contingent item delivery (TAN).'
    },
    {
      id: 'abc-4',
      title: '6th-Grade Science Lab — Independent & Group Work',
      studentContext: '6th-grade science classroom adjacent to wing renovation; observed across 3 conditions.',
      logs: [
        { time: '11:04 AM', settingEventNote: 'Hallway saw cutting tile; overhead ballast humming loudly', antecedent: 'Student working alone on preferred volcano diagram', behavior: 'Covers ears intermittently and rocks rhythmically while humming low tones', consequence: 'No adult speaks; student continues rocking and finishes drawing' },
        { time: '11:18 AM', settingEventNote: 'Drill noise resumes outside classroom door', antecedent: 'Teacher gives whole-class praise and offers preferred lab sticker', behavior: 'Continues rhythmic rocking and humming at identical steady pace', consequence: 'Behavior rate does not change after praise or sticker' },
        { time: '11:31 AM', settingEventNote: 'Noise stops briefly, then fluorescent light buzzes overhead', antecedent: 'Partner invites student to test favorite circuit kit', behavior: 'Presses palms against temples and hums steadily while assembling circuit', consequence: 'Task continues uninterrupted; student reports humming "drowns out the buzz"' }
      ],
      correctFunction: 'AUT',
      whyFunction: 'The rocking and humming persist across solitary work, preferred activities, and praise without recruiting attention, avoiding work, or chasing objects — clear sensory/automatic regulation that calls for environmental accommodation (e.g., noise-canceling headphones), NOT extinction.',
      whyNotFunction: {
        ATT: 'The behavior continues steadily when alone and does not increase or pause when the teacher delivers praise.',
        ESC: 'The student stays engaged and completes both the preferred volcano diagram and the circuit kit — no task is escaped.',
        TAN: 'Receiving a sticker or preferred circuit kit neither starts nor stops the humming, ruling out tangible maintenance.'
      },
      settingEventOptions: [
        { id: 'home', category: 'Home / family', label: 'Home / family — older sibling moved out last weekend' },
        { id: 'sched', category: 'Schedule / setting', label: 'Schedule / setting — early-release bell schedule' },
        { id: 'bio', category: 'Biological', label: 'Biological — seasonal allergy medication change' },
        { id: 'sens', category: 'Sensory / environmental', label: 'Sensory / environmental — hallway construction noise and buzzing fluorescent light' }
      ],
      correctSettingEventId: 'sens',
      whySettingEvent: 'Continuous construction noise and overhead ballast buzz act as an ongoing sensory/environmental setting event that drives auditory self-regulation.',
      whyNotSettingEvent: {
        home: 'No family transition is documented in any of the observation rows.',
        sched: 'The science period ran on its normal schedule without an early-release shift.',
        bio: 'No illness, sleep deficit, or medication change was reported.'
      },
      functionStatement: 'During continuous construction noise and fluorescent hum (sensory setting event), the student rocks and hums across all task conditions to modulate auditory input, maintained by automatic sensory regulation (AUT) — address with environmental accommodation.'
    },
    {
      id: 'abc-5',
      title: '7th-Grade Literature Circle — Read-Aloud',
      studentContext: '7th-grade afternoon ELA; observed following lunch period.',
      logs: [
        { time: '12:48 PM', settingEventNote: 'Excluded from lunch table group chat; visibly tense entering room', antecedent: 'Teacher asks table group to take turns reading dialogue aloud', behavior: 'Slams book shut and asks to go to the nurse', consequence: 'Teacher issues nurse pass; student misses the 15-minute read-aloud' },
        { time: '1:08 PM', settingEventNote: 'Former friend sitting at same literature table without speaking', antecedent: 'Teacher invites student to read a short stanza on return', behavior: 'Mutters "I\'m not doing this" and walks out to hallway bench', consequence: 'Teacher skips student\'s turn and continues lesson with peers' },
        { time: '1:25 PM', settingEventNote: 'Peers whispering at back table during transition', antecedent: 'Teacher prompts group to perform a 2-line partner read', behavior: 'Drops head onto backpack and refuses all prompts until bell rings', consequence: 'Partner reads both parts; student completes independent silent quiz fine next period' }
      ],
      correctFunction: 'ESC',
      whyFunction: 'Every avoidance behavior (nurse request, hallway exit, head down) triggers specifically on public read-aloud demands and ends once the student is skipped or removed, while silent independent work next period proceeds calmly.',
      whyNotFunction: {
        ATT: 'The student actively withdraws from peer and adult gaze (nurse pass, hallway bench, head down) rather than trying to pull social attention onto themselves.',
        TAN: 'No preferred object, screen, or snack is gained by going to the nurse or sitting on the bench.',
        AUT: 'The avoidance is tightly specific to public peer-facing read-alouds and vanishes during silent work, ruling out condition-invariant automatic reinforcement.'
      },
      settingEventOptions: [
        { id: 'sched', category: 'Schedule / setting', label: 'Schedule / setting — morning fire drill disrupted homeroom' },
        { id: 'peer', category: 'Peer / social', label: 'Peer / social — lunchtime group-chat exclusion and peer tension at the table' },
        { id: 'bio', category: 'Biological', label: 'Biological — poor sleep before an early bus pickup' },
        { id: 'sens', category: 'Sensory / environmental', label: 'Sensory / environmental — overheated classroom radiator' }
      ],
      correctSettingEventId: 'peer',
      whySettingEvent: 'Lunchtime peer exclusion and sitting beside a conflicted peer act as a peer/social setting event that makes public read-aloud vulnerability feel acutely aversive.',
      whyNotSettingEvent: {
        sched: 'No fire drill or schedule shift appears in the setting-event notes.',
        bio: 'No fatigue, hunger, or physical illness was logged before lunch.',
        sens: 'Classroom temperature or sensory overload was not cited in the observation data.'
      },
      functionStatement: 'When prompted to read aloud in front of classmates after lunchtime peer exclusion (peer/social setting event), the student exits or puts their head down to avoid public reading, maintained by removal of the read-aloud demand (ESC).'
    },
    {
      id: 'abc-6',
      title: '3rd-Grade Morning Meeting — Carpet Check-In',
      studentContext: '3rd-grade classroom; observed during the week after an unannounced lockdown drill.',
      logs: [
        { time: '8:40 AM', settingEventNote: 'Heightened anxiety since Tuesday drill; checked door lock 3 times at arrival', antecedent: 'Teacher starts greeting another row of students on the carpet', behavior: 'Tugs teacher\'s sleeve repeatedly and says "Look at me, is the door locked?"', consequence: 'Teacher pauses greeting, kneels beside student, and reassures them for 2 minutes' },
        { time: '8:55 AM', settingEventNote: 'Clenched fists and scanning hallway window during calendar', antecedent: 'Teacher turns to lead calendar song with whole class', behavior: 'Falls sideways onto carpet shouting "I bumped my knee!"', consequence: 'Teacher stops song and rubs student\'s shoulder while asking gentle check-in questions' },
        { time: '9:10 AM', settingEventNote: 'Counselor noted elevated worry check-in score this week', antecedent: 'Teacher walks to supply shelf 10 feet away', behavior: 'Calls out loudly across room until teacher returns to student\'s mat', consequence: 'Teacher walks back and stays beside student for the rest of morning meeting' }
      ],
      correctFunction: 'ATT',
      whyFunction: 'Each bid happens whenever the teacher moves or directs focus elsewhere and immediately recruits close adult reassurance and proximity — an attachment/reassurance form of attention maintenance (best met with proactive scheduled check-ins and anxiety support, not cold ignoring).',
      whyNotFunction: {
        ESC: 'The student is not trying to leave morning meeting — they specifically want the teacher to stay right beside them on the carpet.',
        TAN: 'No toy, food, or device is sought or provided; adult closeness and verbal reassurance are the consistent consequence.',
        AUT: 'Each episode is explicitly directed toward the teacher (sleeve tugging, calling out when teacher walks away) rather than persisting independently of adult presence.'
      },
      settingEventOptions: [
        { id: 'bio', category: 'Biological', label: 'Biological — untreated dental pain noted by nurse' },
        { id: 'peer', category: 'Peer / social', label: 'Peer / social — best friend moved to another school' },
        { id: 'mh', category: 'Mental health', label: 'Mental health — lingering post-drill anxiety spike lowering safety threshold' },
        { id: 'home', category: 'Home / family', label: 'Home / family — family moving apartments this weekend' }
      ],
      correctSettingEventId: 'mh',
      whySettingEvent: 'Elevated post-drill anxiety (checking locks, scanning the hallway, high counselor worry rating) is a mental-health setting event that amplifies the need for adult proximity and reassurance.',
      whyNotSettingEvent: {
        bio: 'No dental pain, fatigue, or physical illness is documented in the observation rows.',
        peer: 'No peer conflict or friend departure is recorded.',
        home: 'No housing move or family stressor appears in the morning notes.'
      },
      functionStatement: 'When the teacher shifts proximity or attention away during a post-drill anxiety flare (mental-health setting event), the student tugs, feigns falls, and calls out to recruit adult proximity and reassurance, maintained by immediate adult attention (ATT).'
    }
  ];

  var PBIS_TIER_OPTIONS = [
    { tier: 1, short: 'Tier 1', label: 'Tier 1 — Universal', sub: 'School-wide expectations, routines & climate', icon: '🟢', color: '#22c55e' },
    { tier: 2, short: 'Tier 2', label: 'Tier 2 — Targeted (CICO)', sub: 'Check-In/Check-Out, mentoring & small groups', icon: '🟡', color: '#fbbf24' },
    { tier: 3, short: 'Tier 3', label: 'Tier 3 — Intensive (FBA + BIP)', sub: 'Full FBA, individualized BIP & wraparound', icon: '🔴', color: '#f87171' }
  ];

  var PBIS_TRIAGE_CASES = [
    {
      id: 'pbis-1',
      title: '6th-Grade Cafeteria & Hallway ODR Surge',
      caseText: 'After a mid-year lunch bell-schedule change, hallway and cafeteria office discipline referrals jumped across 65% of 6th-grade classrooms. Forty-two different students received at least one referral this month — mostly for crowding, yelling, and late lineups.',
      dataSignals: ['42 unique students referred', '65% of grade impacted', 'Triggered after schedule change'],
      correctTier: 1,
      why: 'When a large share of students across multiple classrooms struggle in the same common area, the system — not 42 individual students — needs repair. Re-teach universal cafeteria/hallway expectations, adjust supervision zones, and add pre-correction at Tier 1 first.',
      whyNot: {
        2: 'Putting 42 students into Tier 2 CICO would overwhelm targeted staffing capacity and still leave the broken lunch-transition routine unfixed.',
        3: 'Tier 3 FBAs are reserved for ~5% of students with intensive individual needs; running individual BIPs when Tier 1 routines are broken guarantees Tier 3 overload.'
      },
      nextStepAction: 'Convene the Tier 1 PBIS team to audit lunch-transition bottlenecks, post clear visual flow cues, and run a 10-minute building-wide re-teaching blitz.'
    },
    {
      id: 'pbis-2',
      title: '5th-Grade Transition Call-Outs',
      caseText: 'Jordan, a 5th grader performing on grade level, received 3 minor referrals over 5 weeks for clowning and calling out during subject transitions. Building Tier 1 data is strong (88% of students have 0–1 ODRs). Jordan loves checking in with the PE coach and poses zero safety concerns.',
      dataSignals: ['3 ODRs in 5 weeks', 'Tier 1 fidelity: 88% healthy', 'Positive adult hook (PE coach)'],
      correctTier: 2,
      why: 'Strong building Tier 1 plus 2–5 minor referrals in a month, no acute safety crisis, and clear responsiveness to positive adult connection is the textbook Tier 2 Check-In/Check-Out (CICO) profile.',
      whyNot: {
        1: 'Universal Tier 1 is already working for 88% of the school and has been delivered consistently — Jordan has crossed the screening threshold and needs targeted support before habits entrench.',
        3: 'Jumping straight to a full Tier 3 FBA/BIP before trying a rapid 4–6 week Tier 2 CICO trial over-pathologizes moderate attention-seeking and consumes intensive specialist hours prematurely.'
      },
      nextStepAction: 'Enroll Jordan in CICO with the PE coach as morning/afternoon check-in mentor, starting at a realistic 75% goal with daily family feedback.'
    },
    {
      id: 'pbis-3',
      title: 'Non-Response to CICO + Exterior Elopement',
      caseText: 'Maya, a 3rd grader, completed 6 weeks of high-fidelity CICO (92% implementation score), yet daily point totals stayed flat at 42%. Twice this week she ran out of the reading group toward the unlocked courtyard door.',
      dataSignals: ['6 weeks CICO flat at 42%', 'High Tier 2 fidelity verified', 'Safety flag: exterior elopement'],
      correctTier: 3,
      why: 'Both Tier 3 escalation rules are met at once: documented non-response after 4–6 weeks of faithful Tier 2 CICO AND an acute physical safety concern (elopement toward an exterior exit).',
      whyNot: {
        1: 'Tier 1 universal reminders cannot safely address repeated elopement or a student who already failed to respond to Tier 1 + Tier 2.',
        2: 'Continuing CICO unchanged ("trying harder") after 6 weeks of flat data at high fidelity violates PBIS decision rules — and safety-critical elopement requires an immediate FBA + individualized BIP + safety protocol.'
      },
      nextStepAction: 'Convene the IEP/student-support team immediately for a full FBA focused on the reading antecedent, draft an individualized BIP + door-supervision safety plan, and partner closely with family.'
    },
    {
      id: 'pbis-4',
      title: '7th-Grade Wing Climate & Praise Ratio Dip',
      caseText: 'Walkthrough data in the new 7th-grade wing shows a 1:6 praise-to-correction ratio, posted expectations missing in 3 of 4 homerooms, and 34% of 7th graders logging at least one "disrespect/tardy" referral in October.',
      dataSignals: ['34% of wing referred', '1:6 praise-to-correction ratio', 'Missing posted routines'],
      correctTier: 1,
      why: 'Tier 1 fidelity is visibly eroded across an entire grade wing (over a third of students referred + punitive adult interaction ratio). Fixing adult praise ratios and consistent universal routines is Tier 1 work.',
      whyNot: {
        2: 'Small-group Tier 2 interventions cannot compensate for a whole wing operating at a 1:6 negative feedback ratio and missing baseline expectations.',
        3: 'Writing individual Tier 3 BIPs for subjective disrespect referrals in a low-fidelity wing blames individual students for a universal adult-systems problem.'
      },
      nextStepAction: 'Coach 7th-grade staff on a 4:1 positive-to-corrective ratio, co-establish common tardy/greeting routines, and review disaggregated referral categories for subjective bias.'
    },
    {
      id: 'pbis-5',
      title: 'Four 8th Graders Struggling in Advisory Transitions',
      caseText: 'School-wide Tier 1 data is healthy (86% of students have 0–1 ODRs). Four 8th graders in different homerooms each logged 2 minor referrals this month for sarcastic peer arguments and work avoidance right after unstructured hallway breaks. No physical aggression or chronic failure is present.',
      dataSignals: ['4 students with 2 ODRs each', '86% Tier 1 healthy', 'Shared social-transition pattern'],
      correctTier: 2,
      why: 'A small group of students sharing a similar moderate skill gap inside a healthy Tier 1 school is exactly what Tier 2 targeted small-group social-skills coaching and CICO are designed to serve efficiently.',
      whyNot: {
        1: 'Waiting in Tier 1 alone leaves four flagged students accumulating referrals when a low-cost targeted group can quickly build transition and peer-repair skills.',
        3: 'None of these four students show safety threats, severe disability-linked crisis cycles, or Tier 2 non-response — full individual Tier 3 FBAs would be disproportionate.'
      },
      nextStepAction: 'Launch a 6-week Tier 2 small-group transition & peer-problem-solving check-in (folded into advisory/Crew) with weekly progress monitoring.'
    },
    {
      id: 'pbis-6',
      title: 'Daily Phase-5 Meltdowns & Emergency Safety Calls',
      caseText: 'Devon, a 6th grader with documented trauma history and an IEP, has had daily Phase-5 meltdowns throwing chairs and overturning desks during afternoon blocks, resulting in two emergency safety calls in 10 days. His current classroom sheet lists generic "calm down" reminders with no FBA function statement.',
      dataSignals: ['Daily Phase-5 safety crises', '2 emergency calls in 10 days', 'No FBA function hypothesis'],
      correctTier: 3,
      why: 'Severe, daily safety-threatening crises with emergency calls require immediate Tier 3 mobilization — full FBA by a qualified school psych/BCBA, trauma-informed individualized BIP, crisis debrief protocol, and wraparound family/community coordination.',
      whyNot: {
        1: 'Universal classroom expectations alone cannot keep Devon or peers safe during acute Phase-5 escalations.',
        2: 'Standard Tier 2 CICO is far too light for daily Phase-5 crises and emergency safety calls — you do not wait 6 weeks of CICO when safety is already at stake.'
      },
      nextStepAction: 'Trigger immediate Tier 3 FBA + BIP development, verify Maine Ch. 33 debrief and parent notification compliance, and align wraparound clinical/family supports.'
    }
  ];

  var CYCLE_PHASE_CHECKS = [
    {
      id: 'cyc-1',
      vignette: 'Right after a fire drill, Noah is handed a dense writing prompt. He narrows his eyes, taps his foot rapidly, and whispers "I can\'t do this" — before any yelling or refusal starts.',
      correctPhase: 2,
      options: [
        { phase: 2, label: 'Phase 2 — Triggers (offer choice, reduce demand, prevent escalation)' },
        { phase: 4, label: 'Phase 4 — Acceleration (clear audience, minimal language)' },
        { phase: 5, label: 'Phase 5 — Peak (safety-first protocol)' },
        { phase: 7, label: 'Phase 7 — Recovery (full debrief & repair)' }
      ],
      why: 'Setting event (fire drill) just stacked with an immediate demand (dense writing prompt). Catching Phase 2 (Triggers) by reducing demand or offering a choice is the highest-leverage preventive moment in the entire cycle.',
      whyNot: {
        4: 'Phase 4 involves overt provocative engagement (blame, threats, scripted defiance) aimed at pulling adults into a power struggle — Noah is still at the early trigger threshold.',
        5: 'Phase 5 (Peak) is full loss of cognitive control (aggression, property destruction, elopement) — Noah has not escalated to crisis yet.',
        7: 'Phase 7 (Recovery) happens AFTER a peak and de-escalation, not at the onset of a trigger.'
      }
    },
    {
      id: 'cyc-2',
      vignette: 'A student glares at you in front of classmates, curses loudly, blames you for "always picking on me," and challenges you to "go ahead and suspend me."',
      correctPhase: 4,
      options: [
        { phase: 1, label: 'Phase 1 — Calm (pre-teach skills and build rapport)' },
        { phase: 4, label: 'Phase 4 — Acceleration (stay quiet, clear audience, do not take the bait)' },
        { phase: 6, label: 'Phase 6 — De-escalation (offer water and quiet space)' },
        { phase: 7, label: 'Phase 7 — Recovery (debrief triggers and update BIP)' }
      ],
      why: 'Provocative blaming and dare-language in front of peers is textbook Phase 4 (Acceleration). Adults most often escalate students here by lecturing or matching volume; the right move is clearing the audience, keeping distance, and using minimal calm words.',
      whyNot: {
        1: 'Phase 1 is regulated baseline engagement — the student is already actively escalating.',
        6: 'Phase 6 follows Peak and looks exhausted, tearful, or quiet rather than actively challenging staff.',
        7: 'Attempting to debrief or teach during Phase 4 backfires because the thinking brain is going offline.'
      }
    },
    {
      id: 'cyc-3',
      vignette: 'Five minutes after knocking over a bookshelf, the student sits slumped against the wall crying quietly and hiding their face in their sleeves.',
      correctPhase: 6,
      options: [
        { phase: 2, label: 'Phase 2 — Triggers (switch to an easy task)' },
        { phase: 3, label: 'Phase 3 — Agitation (offer break card before crisis)' },
        { phase: 6, label: 'Phase 6 — De-escalation (stay present, offer water/space, do NOT debrief yet)' },
        { phase: 7, label: 'Phase 7 — Recovery (immediately process "why did you do that?" and assign repair)' }
      ],
      why: 'Post-Peak exhaustion, crying, and withdrawal mark Phase 6 (De-escalation). Pushing for explanations or apologies right now produces hollow performance or re-escalation — stay calm, offer water/space, and wait for Phase 7.',
      whyNot: {
        2: 'The crisis peak already occurred; the student is coming down rather than entering a trigger.',
        3: 'Phase 3 (Agitation) happens BEFORE Peak; here the bookshelf incident already happened.',
        7: 'Debriefing belongs in Phase 7 AFTER baseline cognitive functioning returns — starting it in Phase 6 often restarts the escalation cycle.'
      }
    },
    {
      id: 'cyc-4',
      vignette: 'Forty minutes after a meltdown, the student has eaten a snack, is breathing evenly, making eye contact, and calmly asks "Can we fix the shelf I knocked over?"',
      correctPhase: 7,
      options: [
        { phase: 1, label: 'Phase 1 — Calm (skip debriefing so you do not upset them)' },
        { phase: 3, label: 'Phase 3 — Agitation (reduce sensory load and avoid talking)' },
        { phase: 5, label: 'Phase 5 — Peak (clear room and call crisis team)' },
        { phase: 7, label: 'Phase 7 — Recovery (empathetic debrief, repair together, update BIP)' }
      ],
      why: 'Baseline regulation and reflective thinking have returned — this is Phase 7 (Recovery), the exact window to debrief empathetically, repair collaboratively, and update the BIP so the next Phase 1 starts stronger.',
      whyNot: {
        1: 'Skipping debrief and relationship repair misses the learning and BIP-revision loop that makes Phase 7 bridge back into Phase 1.',
        3: 'Agitation shows early distress signs; here the student is calm and ready for collaborative repair.',
        5: 'Peak is active safety crisis, whereas this student has returned to baseline control.'
      }
    }
  ];

  function getShuffledFunctionOptions(scenarioKey, seed) {
    var combinedSeed = String(scenarioKey == null ? 'm1' : scenarioKey) + '::' + String(seed == null ? 0 : seed);
    return seededShuffle(FUNCTIONS_KEY, combinedSeed);
  }

  function findReplacementTip(code) {
    for (var i = 0; i < REPLACEMENT_BEHAVIORS.length; i++) {
      if (REPLACEMENT_BEHAVIORS[i].functionAbbrev === code) {
        return REPLACEMENT_BEHAVIORS[i].replacement;
      }
    }
    return '';
  }

  function evaluateMatcherChoice(scenarioOrId, pickedCode) {
    var sc = null;
    if (scenarioOrId && typeof scenarioOrId === 'object' && typeof scenarioOrId.answer === 'string') {
      sc = scenarioOrId;
    } else {
      for (var i = 0; i < MATCHER_SCENARIOS.length; i++) {
        if (MATCHER_SCENARIOS[i].id === scenarioOrId || i === scenarioOrId) {
          sc = MATCHER_SCENARIOS[i];
          break;
        }
      }
    }
    if (!sc) {
      return { correct: false, answer: null, picked: pickedCode || null, why: '', whyNotPicked: '', replacementTip: '' };
    }
    var picked = typeof pickedCode === 'string' ? pickedCode.toUpperCase() : '';
    var correct = picked === sc.answer;
    var whyNotPicked = (!correct && sc.whyNot && sc.whyNot[picked]) ? sc.whyNot[picked] : '';
    return {
      correct: correct,
      answer: sc.answer,
      picked: picked,
      why: sc.why || '',
      whyNotPicked: whyNotPicked,
      replacementTip: findReplacementTip(sc.answer)
    };
  }

  function getAbcCase(idOrIndex) {
    if (typeof idOrIndex === 'number' && Number.isInteger(idOrIndex) && idOrIndex >= 0 && idOrIndex < ABC_CODING_CASES.length) {
      return ABC_CODING_CASES[idOrIndex];
    }
    for (var i = 0; i < ABC_CODING_CASES.length; i++) {
      if (ABC_CODING_CASES[i].id === idOrIndex) return ABC_CODING_CASES[i];
    }
    return ABC_CODING_CASES[0];
  }

  function getAbcShuffledOptions(caseItem, seed) {
    var c = (caseItem && typeof caseItem === 'object') ? caseItem : getAbcCase(caseItem);
    var base = String(c.id || 'abc') + '::' + String(seed == null ? 0 : seed);
    return {
      functions: seededShuffle(FUNCTIONS_KEY, base + ':fn'),
      settingEvents: seededShuffle(c.settingEventOptions || [], base + ':se')
    };
  }

  function evaluateAbcCoding(caseId, pickedFunc, pickedSettingId) {
    var c = getAbcCase(caseId);
    var fnCode = typeof pickedFunc === 'string' ? pickedFunc.toUpperCase() : '';
    var seId = typeof pickedSettingId === 'string' ? pickedSettingId : '';
    var functionCorrect = fnCode === c.correctFunction;
    var settingEventCorrect = seId === c.correctSettingEventId;
    var correctSeObj = null;
    for (var i = 0; i < c.settingEventOptions.length; i++) {
      if (c.settingEventOptions[i].id === c.correctSettingEventId) {
        correctSeObj = c.settingEventOptions[i];
        break;
      }
    }
    return {
      caseId: c.id,
      functionCorrect: functionCorrect,
      settingEventCorrect: settingEventCorrect,
      bothCorrect: functionCorrect && settingEventCorrect,
      correctFunction: c.correctFunction,
      correctSettingEventId: c.correctSettingEventId,
      correctSettingEventLabel: correctSeObj ? correctSeObj.label : '',
      whyFunction: c.whyFunction,
      whyNotFunction: (!functionCorrect && c.whyNotFunction && c.whyNotFunction[fnCode]) ? c.whyNotFunction[fnCode] : '',
      whySettingEvent: c.whySettingEvent,
      whyNotSettingEvent: (!settingEventCorrect && c.whyNotSettingEvent && c.whyNotSettingEvent[seId]) ? c.whyNotSettingEvent[seId] : '',
      functionStatement: c.functionStatement
    };
  }

  function getPbisShuffledTiers(caseKey, seed) {
    return seededShuffle(PBIS_TIER_OPTIONS, 'pbis::' + String(caseKey == null ? 'pbis-1' : caseKey) + '::' + String(seed == null ? 0 : seed));
  }

  function evaluatePbisTriage(caseId, pickedTier) {
    var c = null;
    for (var i = 0; i < PBIS_TRIAGE_CASES.length; i++) {
      if (PBIS_TRIAGE_CASES[i].id === caseId || i === caseId) {
        c = PBIS_TRIAGE_CASES[i];
        break;
      }
    }
    if (!c) {
      return { correct: false, correctTier: null, pickedTier: null, why: '', whyNotPicked: '', nextStepAction: '' };
    }
    var pt = Number(pickedTier);
    var correct = pt === c.correctTier;
    var whyNotPicked = (!correct && c.whyNot && c.whyNot[pt]) ? c.whyNot[pt] : '';
    return {
      caseId: c.id,
      correct: correct,
      correctTier: c.correctTier,
      pickedTier: pt,
      why: c.why,
      whyNotPicked: whyNotPicked,
      nextStepAction: c.nextStepAction
    };
  }

  function evaluateCyclePhaseCheck(checkId, pickedPhase) {
    var chk = null;
    for (var i = 0; i < CYCLE_PHASE_CHECKS.length; i++) {
      if (CYCLE_PHASE_CHECKS[i].id === checkId || i === checkId) {
        chk = CYCLE_PHASE_CHECKS[i];
        break;
      }
    }
    if (!chk) {
      return { correct: false, correctPhase: null, pickedPhase: null, why: '', whyNotPicked: '' };
    }
    var pp = Number(pickedPhase);
    var correct = pp === chk.correctPhase;
    return {
      checkId: chk.id,
      correct: correct,
      correctPhase: chk.correctPhase,
      pickedPhase: pp,
      why: chk.why,
      whyNotPicked: (!correct && chk.whyNot && chk.whyNot[pp]) ? chk.whyNot[pp] : ''
    };
  }

  // Deterministic function classifier for BIP text auditing
  function detectFunctionFromText(rawText) {
    var text = (typeof rawText === 'string' ? rawText : '').toLowerCase();
    var scores = { ATT: 0, ESC: 0, TAN: 0, AUT: 0 };
    if (!text.trim()) {
      return { code: null, scores: scores, ambiguous: false };
    }
    var patterns = {
      ATT: [
        { re: /\battention\b/g, w: 3 },
        { re: /\batt\b/g, w: 3 },
        { re: /\brais(?:e|es|ing)\s+(?:a\s+|their\s+|his\s+|her\s+)?hand\b/g, w: 2 },
        { re: /\btap(?:s|ping)?\s+(?:the\s+)?shoulder\b/g, w: 2 },
        { re: /\bask(?:s|ing)?\s+(?:teacher|adult)\s+to\s+check\b/g, w: 2 },
        { re: /\bteacher\s+(?:check|contact|talk|praise|look|interaction)/g, w: 2 },
        { re: /\bpeer\s+(?:laugh|reaction|attention|interaction)/g, w: 2 },
        { re: /\bcheck[\s-]?in\b/g, w: 1 },
        { re: /\brecruit/g, w: 2 },
        { re: /\b1[\s-]?on[\s-]?1\b/g, w: 2 },
        { re: /\bsocial\b/g, w: 1 },
        { re: /\breassurance\b/g, w: 2 },
        { re: /\bpraise\b/g, w: 1 },
        { re: /\badult\s+(?:contact|proximity|conversation)\b/g, w: 2 }
      ],
      ESC: [
        { re: /\bescape\b/g, w: 3 },
        { re: /\besc\b/g, w: 3 },
        { re: /\bavoid(?:ance|ing)?\b/g, w: 3 },
        { re: /\bbreak\s*card\b/g, w: 3 },
        { re: /\brequest(?:s|ing)?\s+(?:a\s+)?(?:[\w-]+\s+){0,3}break\b/g, w: 3 },
        { re: /\btake\s+(?:a\s+)?(?:[\w-]+\s+){0,3}break\b/g, w: 2 },
        { re: /\bask(?:s|ing)?\s+for\s+(?:a\s+)?(?:[\w-]+\s+){0,2}break\b/g, w: 2 },
        { re: /\b(?:2|two|3|three|5|five)[\s-]?min(?:ute)?\s+(?:[\w-]+\s+){0,2}(?:break|pause)\b/g, w: 2 },
        { re: /\bget\s+out\s+of\b/g, w: 2 },
        { re: /\bend\s+(?:the\s+)?demand\b/g, w: 2 },
        { re: /\bremove\s+(?:the\s+)?(?:task|work|demand|worksheet)\b/g, w: 2 },
        { re: /\bdelay\s+(?:the\s+)?(?:task|work|demand)\b/g, w: 2 },
        { re: /\bask(?:s|ing)?\s+for\s+help\b/g, w: 1 },
        { re: /\bpause\s+card\b/g, w: 2 },
        { re: /\bcalm\s+corner\b/g, w: 1 },
        { re: /\bopt[\s-]?out\b/g, w: 2 }
      ],
      TAN: [
        { re: /\btangible\b/g, w: 3 },
        { re: /\btan\b/g, w: 3 },
        { re: /\bpreferred\s+(?:item|toy|object|activity|device)\b/g, w: 2 },
        { re: /\brequest(?:s|ing)?\s+(?:the\s+|an?\s+)?(?:item|toy|turn|ipad|tablet|snack|object|device|screen)\b/g, w: 3 },
        { re: /\bwait\s*card\b/g, w: 2 },
        { re: /\bfct\b/g, w: 2 },
        { re: /\bpecs\b/g, w: 2 },
        { re: /\bcan\s+i\s+have\b/g, w: 2 },
        { re: /\baccess\s+to\b/g, w: 2 },
        { re: /\b(?:ipad|tablet|screen\s*time|toy|snack)\b/g, w: 1 },
        { re: /\bturn\b/g, w: 1 },
        { re: /\bexchange\b/g, w: 1 }
      ],
      AUT: [
        { re: /\bsensory\b/g, w: 3 },
        { re: /\bautomatic\b/g, w: 3 },
        { re: /\baut\b/g, w: 3 },
        { re: /\bstim(?:ming)?\b/g, w: 2 },
        { re: /\bproprioceptive\b/g, w: 2 },
        { re: /\bvestibular\b/g, w: 2 },
        { re: /\bfidget\b/g, w: 2 },
        { re: /\bchew(?:y|ing|able)?\b/g, w: 2 },
        { re: /\bheadphones?\b/g, w: 2 },
        { re: /\bweighted\b/g, w: 2 },
        { re: /\bwobble\b/g, w: 2 },
        { re: /\bheavy\s+work\b/g, w: 2 },
        { re: /\bself[\s-]?regulat/g, w: 2 },
        { re: /\bputty\b/g, w: 2 },
        { re: /\bmovement\s+break\b/g, w: 2 },
        { re: /\bwall\s+push/g, w: 2 },
        { re: /\bnoise[\s-]?cancel/g, w: 2 },
        { re: /\bgum\b/g, w: 1 }
      ]
    };
    var keys = ['ATT', 'ESC', 'TAN', 'AUT'];
    for (var i = 0; i < keys.length; i++) {
      var code = keys[i];
      var regs = patterns[code];
      for (var r = 0; r < regs.length; r++) {
        var matches = text.match(regs[r].re);
        if (matches) scores[code] += matches.length * regs[r].w;
      }
    }

    var best = null;
    var bestVal = 0;
    var secondVal = 0;
    for (var k = 0; k < keys.length; k++) {
      var v = scores[keys[k]];
      if (v > bestVal) {
        secondVal = bestVal;
        bestVal = v;
        best = keys[k];
      } else if (v > secondVal) {
        secondVal = v;
      }
    }
    return {
      code: bestVal > 0 ? best : null,
      scores: scores,
      ambiguous: bestVal > 0 && secondVal > 0 && bestVal === secondVal
    };
  }

  var BIP_AUDIT_SAMPLES = {
    aligned: {
      behavior: 'Tears or crumples the writing worksheet and leaves seat for 2+ minutes during independent writing.',
      antecedent: 'Given an independent writing task longer than 10 minutes, especially after a poor-sleep night or substitute-teacher schedule change (setting event).',
      func: 'Escape / avoidance from extended writing demands (ESC).',
      replacement: 'Hands a printed BREAK card on desk to request a 2-minute quiet regulation break or uses a help card for the first sentence.',
      strategy: 'Pre-teach break card daily when calm; chunk writing into 5-minute blocks with topic choice; honor every break card request immediately for 3 weeks without removing the assignment for ripping, then gradually thin.'
    },
    flawed: {
      behavior: 'Acts defiant, disrespectful, and off-task with a bad attitude.',
      antecedent: 'Math class.',
      func: 'Escape from hard math work (ESC).',
      replacement: 'Sit quietly and stop yelling so student can earn a sticker at the end of the week.',
      strategy: 'If student refuses work, send them to the hallway or lock them in the quiet room until calm, and take away recess.'
    }
  };

  function auditBipDraft(rawBipData) {
    var src = (rawBipData && typeof rawBipData === 'object' && !Array.isArray(rawBipData)) ? rawBipData : {};
    var behavior = typeof src.behavior === 'string' ? src.behavior.trim() : '';
    var antecedent = typeof src.antecedent === 'string' ? src.antecedent.trim() : '';
    var funcText = typeof src.func === 'string' ? src.func.trim() : '';
    var replacement = typeof src.replacement === 'string' ? src.replacement.trim() : '';
    var strategy = typeof src.strategy === 'string' ? src.strategy.trim() : '';
    var allText = [behavior, antecedent, funcText, replacement, strategy].join(' \n ');
    var allLower = allText.toLowerCase();

    var checks = [];

    // (a) Target behavior observability & measurability (20 pts)
    var vagueLabels = /\b(bad|disruptive|defiant|disrespectful|attitude|lazy|manipulative|acting\s+out|off[\s-]?task|angry|upset|non[\s-]?compliant|rude|naughty|unmotivated|misbehav(?:ing|ior))\b/i;
    var observableVerbs = /\b(leaves?\s+seat|stands?\s+up|rips?|tears?|crumples?|throws?|calls?\s+out|yells?|screams?|shouts?|hits?|kicks?|pushes?|pinches?|bites?|elopes?|runs?\s+out|walks?\s+out|drops?|slams?|grabs?|cries?|taps?|hums?|rocks?|flaps?|puts?\s+head\s+down|closes?\s+book|turns?\s+away|shoves?|speaks?|refuses?\s+to\s+\w+)\b/i;
    var measurableCue = /\b(\d+|minute|min|second|sec|times?|per\s+|during|without\s+permission|for\s+\d+|within\s+\d+|longer\s+than)\b/i;
    var hasVague = vagueLabels.test(behavior);
    var hasObs = observableVerbs.test(behavior);
    var hasMeas = measurableCue.test(behavior);
    var obsCheck;
    if (!behavior || behavior.length < 8) {
      obsCheck = {
        id: 'observability',
        label: 'Target behavior observability & measurability',
        status: 'fail',
        score: 0,
        maxScore: 20,
        finding: 'Target behavior is missing or too brief for two observers to count reliably.',
        coaching: 'Describe an observable action with context or duration (e.g., "leaves seat without permission for 30+ seconds during independent writing").'
      };
    } else if (hasVague && !hasObs) {
      obsCheck = {
        id: 'observability',
        label: 'Target behavior observability & measurability',
        status: 'fail',
        score: 4,
        maxScore: 20,
        finding: 'Uses subjective labels (like "defiant", "disruptive", or "off-task") that fail the two-observer test and invite implicit bias.',
        coaching: 'Replace trait/judgment words with exactly what a camera would see and hear (action verb + measurable threshold).'
      };
    } else if (hasObs && (hasMeas || !hasVague)) {
      var obsFull = hasObs && hasMeas && !hasVague;
      obsCheck = {
        id: 'observability',
        label: 'Target behavior observability & measurability',
        status: obsFull ? 'pass' : 'warn',
        score: obsFull ? 20 : 14,
        maxScore: 20,
        finding: obsFull
          ? 'Target behavior names concrete observable actions with measurable boundaries.'
          : (hasVague ? 'Includes an observable action, though subjective labels remain.' : 'Names an observable action; adding duration, count, or setting boundaries makes ABC tallying tighter.'),
        coaching: obsFull
          ? 'Strong operational definition — two independent observers could tally the same instances.'
          : 'Trim subjective labels and specify how long or how often the action counts as an instance.'
      };
    } else {
      obsCheck = {
        id: 'observability',
        label: 'Target behavior observability & measurability',
        status: 'warn',
        score: 10,
        maxScore: 20,
        finding: 'Target description is present, but needs a clearer visible/audible action verb and counting rule.',
        coaching: 'Apply the operational-definition test: specify exact physical or vocal behavior plus onset/offset criteria.'
      };
    }
    checks.push(obsCheck);

    // (b) Antecedent & setting-event proactive supports (20 pts)
    var antTriggerCue = /\b(when|given|asked|during|after|before|transition|worksheet|writing|math|reading|task|demand|prompt|group|partner|line|hallway|lunch|denied|told|stops?|ends?|shift|independent|aloud|noise)\b/i;
    var settingEventCue = /\b(setting\s+event|sleep|tired|breakfast|hungry|pain|headache|sick|illness|medication|substitute|schedule|fire\s+drill|assembly|home|family|drop[\s-]?off|peer|recess|bullying|excluded|noise|fluorescent|loud|sensory|crowded|anxiety|trauma|morning\s+check|pre[\s-]?teach|pre[\s-]?correct|chunk|choice|visual\s+schedule|timer|quiet\s+corner|headphones?|scaffold)\b/i;
    var hasAntTrigger = antTriggerCue.test(antecedent) && antecedent.length >= 12;
    var hasSettingOrProactive = settingEventCue.test(antecedent + ' ' + strategy);
    var antCheck;
    if (!antecedent || antecedent.length < 6) {
      antCheck = {
        id: 'antecedent',
        label: 'Antecedent & setting-event proactive supports',
        status: 'fail',
        score: 0,
        maxScore: 20,
        finding: 'Antecedent trigger and setting events are missing.',
        coaching: 'Name what happens immediately before the behavior AND any slow setting events (poor sleep, schedule shift, sensory load) plus proactive adjustments.'
      };
    } else if (hasAntTrigger && hasSettingOrProactive) {
      antCheck = {
        id: 'antecedent',
        label: 'Antecedent & setting-event proactive supports',
        status: 'pass',
        score: 20,
        maxScore: 20,
        finding: 'Captures both the immediate trigger and slow setting events / proactive environmental supports.',
        coaching: 'Front-loading antecedent and setting-event adjustments prevents escalation at Colvin Phases 1–2.'
      };
    } else if (hasAntTrigger) {
      antCheck = {
        id: 'antecedent',
        label: 'Antecedent & setting-event proactive supports',
        status: 'warn',
        score: 12,
        maxScore: 20,
        finding: 'Identifies an immediate antecedent, but misses slow setting events or proactive antecedent modifications.',
        coaching: 'Add setting-event monitoring (e.g., sleep, routine shifts, sensory load) and proactive tweaks (chunking, choice, pre-correction) before the trigger hits.'
      };
    } else {
      antCheck = {
        id: 'antecedent',
        label: 'Antecedent & setting-event proactive supports',
        status: 'fail',
        score: 5,
        maxScore: 20,
        finding: 'Antecedent is too general (e.g., naming a whole class period) to guide prevention.',
        coaching: 'Pinpoint the exact demand, transition, or social event right before the behavior, plus any setting event that lowers threshold.'
      };
    }
    checks.push(antCheck);

    // (c) Replacement behavior functional equivalence (25 pts)
    var targetFn = detectFunctionFromText(funcText);
    var repFn = detectFunctionFromText(replacement);
    var deadPersonGoal = /\b(stop\s+\w+|don'?t\s+\w+|do\s+not\s+\w+|no\s+(?:yelling|screaming|hitting|talking|running|crying)|sit\s+quietly|be\s+good|be\s+quiet|comply|obey|stay\s+quiet)\b/i.test(replacement);
    var multiFnHypothesis = /\b(attention\s+or\s+escape|escape\s+or\s+attention|all\s+functions|multiple\s+functions)\b/i.test(funcText) || targetFn.ambiguous;
    var fnCheck;
    if (!funcText || !targetFn.code) {
      fnCheck = {
        id: 'functional_equivalence',
        label: 'Replacement behavior functional equivalence',
        status: 'fail',
        score: 0,
        maxScore: 25,
        finding: 'No clear hypothesized function (ATT / ESC / TAN / AUT) is named in Step 3.',
        coaching: 'A BIP without a single testable function statement is a punishment plan. Name whether ABC data points to Attention, Escape, Tangible, or Sensory/Automatic.'
      };
    } else if (multiFnHypothesis) {
      fnCheck = {
        id: 'functional_equivalence',
        label: 'Replacement behavior functional equivalence',
        status: 'warn',
        score: 8,
        maxScore: 25,
        finding: 'Hypothesis mixes competing functions instead of committing to one testable primary function.',
        coaching: 'Narrow Step 3 to the single primary function best supported by ABC data (or gather confirmatory observations before finalizing the BIP).'
      };
    } else if (!replacement || replacement.length < 8) {
      fnCheck = {
        id: 'functional_equivalence',
        label: 'Replacement behavior functional equivalence',
        status: 'fail',
        score: 5,
        maxScore: 25,
        finding: 'Function (' + targetFn.code + ') is named, but no replacement behavior is drafted yet.',
        coaching: 'Draft an active, simpler replacement skill that serves ' + targetFn.code + ': ' + findReplacementTip(targetFn.code)
      };
    } else if (deadPersonGoal && !repFn.code) {
      fnCheck = {
        id: 'functional_equivalence',
        label: 'Replacement behavior functional equivalence',
        status: 'fail',
        score: 5,
        maxScore: 25,
        finding: 'Replacement describes the absence of behavior ("stop yelling" / "sit quietly") — fails the dead-person test and does not meet the ' + targetFn.code + ' function.',
        coaching: 'Teach what the student DOES instead to get ' + targetFn.code + ' efficiently: ' + findReplacementTip(targetFn.code)
      };
    } else if (repFn.code === targetFn.code) {
      fnCheck = {
        id: 'functional_equivalence',
        label: 'Replacement behavior functional equivalence',
        status: deadPersonGoal ? 'warn' : 'pass',
        score: deadPersonGoal ? 17 : 25,
        maxScore: 25,
        finding: deadPersonGoal
          ? 'Replacement aligns with ' + targetFn.code + ', but remove negative "stop / don\'t" phrasing so it states only the positive skill.'
          : 'Functionally equivalent! Both hypothesized function and replacement serve ' + targetFn.code + '.',
        coaching: deadPersonGoal
          ? 'Focus the replacement purely on the communicative/regulatory skill to teach.'
          : 'Confirm the replacement requires less effort and produces faster relief/payoff than the problem behavior.'
      };
    } else if (repFn.code && repFn.code !== targetFn.code) {
      fnCheck = {
        id: 'functional_equivalence',
        label: 'Replacement behavior functional equivalence',
        status: 'fail',
        score: 6,
        maxScore: 25,
        finding: 'Function mismatch: Step 3 hypothesizes ' + targetFn.code + ', but the replacement reads like ' + repFn.code + '.',
        coaching: 'A replacement that delivers a different function will not compete with the problem behavior. Match ' + targetFn.code + ': ' + findReplacementTip(targetFn.code)
      };
    } else {
      fnCheck = {
        id: 'functional_equivalence',
        label: 'Replacement behavior functional equivalence',
        status: 'warn',
        score: 12,
        maxScore: 25,
        finding: 'Replacement is drafted, but its link to the hypothesized ' + targetFn.code + ' function is not explicit.',
        coaching: 'Make the functional payoff explicit (for ' + targetFn.code + ', consider: ' + findReplacementTip(targetFn.code) + ').'
      };
    }
    checks.push(fnCheck);

    // (d) Consequence & teaching plan alignment (20 pts)
    var teachingCue = /\b(pre[\s-]?teach|teach|model|practice|prompt|rehearse|when\s+calm|role[\s-]?play|daily|fade|thin)\b/i.test(strategy);
    var reinforceCue = /\b(honor|honour|immediately|reinforc|praise|deliver|grant|provide|break|check[\s-]?in|point|token|cico|accommodat|allow)\b/i.test(strategy);
    var accidentalTrap = null;
    if (targetFn.code === 'ESC' && /\b(send\s+(?:to\s+)?(?:the\s+)?(?:hallway|office|out)|hallway|remove\s+from\s+class|suspend|time[\s-]?out|skip\s+work)\b/i.test(strategy)) {
      accidentalTrap = 'Sending an escape-maintained student to the hallway/office or removing work contingent on problem behavior directly reinforces escape!';
    } else if (targetFn.code === 'ESC' && /\b(only\s+(?:after|if)\s+(?:they\s+)?finish|must\s+finish\s+(?:all|the)\s+work\s+first|earn\s+a\s+break\s+by\s+finishing)\b/i.test(strategy + ' ' + replacement)) {
      accidentalTrap = 'Front-loading work completion before honoring an initial break card turns the break into a re-skinned demand; honor unconditionally first, then thin.';
    } else if (targetFn.code === 'ATT' && /\b(lecture|scold|reprimand|long\s+talk|discuss\s+immediately|1[\s-]?on[\s-]?1\s+talk\s+when)\b/i.test(strategy)) {
      accidentalTrap = 'Delivering lectures, scolding, or 1-on-1 talks contingent on attention-maintained behavior reinforces the exact function you are trying to reduce.';
    } else if (targetFn.code === 'TAN' && /\b(give\s+(?:in|them\s+the\s+item)\s+to\s+(?:calm|quiet)|hand\s+over\s+when\s+(?:scream|cry|grab))\b/i.test(strategy)) {
      accidentalTrap = 'Delivering the preferred item to quiet screaming or grabbing directly strengthens tangible-maintained behavior.';
    } else if (targetFn.code === 'AUT' && /\b(extinguish|block\s+(?:hands|stim)|stop\s+flapping|quiet\s+hands|forbid\s+stim)\b/i.test(strategy + ' ' + replacement)) {
      accidentalTrap = 'Attempting to extinguish harmless automatic/sensory regulation enforces masking harm; match the sensory modality with accommodations instead.';
    }

    var consCheck;
    if (!strategy || strategy.length < 10) {
      consCheck = {
        id: 'consequence_alignment',
        label: 'Consequence & teaching plan alignment',
        status: 'fail',
        score: 0,
        maxScore: 20,
        finding: 'Teaching and reinforcement/response plan is missing.',
        coaching: 'Specify how staff pre-teach the replacement when calm, honor it immediately, and avoid accidentally reinforcing the target function.'
      };
    } else if (accidentalTrap) {
      consCheck = {
        id: 'consequence_alignment',
        label: 'Consequence & teaching plan alignment',
        status: 'fail',
        score: 4,
        maxScore: 20,
        finding: accidentalTrap,
        coaching: 'Shift staff response to neutral safety/redirect toward the replacement behavior while making the replacement the fastest path to the student\'s function.'
      };
    } else if (teachingCue && reinforceCue) {
      consCheck = {
        id: 'consequence_alignment',
        label: 'Consequence & teaching plan alignment',
        status: 'pass',
        score: 20,
        maxScore: 20,
        finding: 'Includes proactive calm-time teaching plus immediate, functionally aligned reinforcement without reinforcing the target function.',
        coaching: 'Plan weekly 5-minute fidelity checks during the first month so every adult honors the replacement consistently.'
      };
    } else {
      consCheck = {
        id: 'consequence_alignment',
        label: 'Consequence & teaching plan alignment',
        status: 'warn',
        score: 12,
        maxScore: 20,
        finding: teachingCue
          ? 'Includes teaching steps, but needs explicit immediate reinforcement and thinning details.'
          : 'Mentions reinforcement, but needs explicit calm-time pre-teaching and prompting steps (never teach a brand-new skill mid-crisis).',
        coaching: 'Pair both: (1) pre-teach when calm, and (2) honor immediately at 100% fidelity before gradually thinning.'
      };
    }
    checks.push(consCheck);

    // (e) Maine Chapter 33 Safety & Ethics Guard (15 pts + critical blocker)
    var ethicsPatterns = [
      { label: 'planned physical restraint', re: /\b(restrain(?:t|ed|ing)?|hold\s+(?:student\s+)?down|pin\s+down|prone\s+hold|supine\s+hold|physical\s+hold|strap(?:ping)?|tie\s+(?:to|down)|mechanical\s+restraint)\b/i },
      { label: 'planned seclusion / locked confinement', re: /\b(seclud(?:e|ed|ing)|seclusion|lock(?:ed)?\s+(?:in|inside|room|door)|quiet\s+room|isolation\s+room|block\s+(?:the\s+)?door|prevent\s+from\s+leaving)\b/i },
      { label: 'aversive or physical punishment', re: /\b(electric\s+shock|shock|spank|slap|spray\s+(?:water|face)|squirt|vinegar|lemon\s+juice|corporal)\b/i },
      { label: 'withholding basic needs (food/water/bathroom/recess)', re: /\b(withhold\s+(?:lunch|food|water|bathroom)|deny\s+(?:lunch|food|water|bathroom)|take\s+away\s+(?:lunch|food|recess)|no\s+recess|skip\s+lunch)\b/i },
      { label: 'public shaming or anti-stim masking compliance', re: /\b(publicly\s+shame|humiliate|quiet\s+hands|force\s+eye\s+contact|extinguish\s+stim)\b/i }
    ];
    // Allow explicit negation like "never use restraint" or "no seclusion" unless other terms trigger
    var flaggedTerms = [];
    for (var ep = 0; ep < ethicsPatterns.length; ep++) {
      var m = allLower.match(ethicsPatterns[ep].re);
      if (m) {
        var idx = allLower.indexOf(m[0]);
        var prefix = allLower.slice(Math.max(0, idx - 36), idx);
        var explicitlyProhibitedByAuthor = /\b(?:never|do\s+not|don'?t|no|avoid|prohibit(?:ed)?|without|zero)\b[^.;!\n]{0,28}$/.test(prefix);
        if (!explicitlyProhibitedByAuthor) {
          flaggedTerms.push(ethicsPatterns[ep].label + ' ("' + m[0] + '")');
        }
      }
    }
    var ethicsFlagged = flaggedTerms.length > 0;
    var ethicsCheck = ethicsFlagged
      ? {
          id: 'maine_ch33_ethics',
          label: 'Maine Ch. 33 safety & ethics guard',
          status: 'fail',
          score: 0,
          maxScore: 15,
          finding: 'SAFETY & ETHICS FLAG: Detected ' + flaggedTerms.join('; ') + '.',
          coaching: 'Under Maine Chapter 33 and IDEA/BACB ethics, restraint and seclusion are emergency-only last resorts for imminent danger of serious physical injury — NEVER planned BIP consequences. Basic needs (food, bathroom, recess) and dignity-harming aversives/masking demands must be removed.'
        }
      : {
          id: 'maine_ch33_ethics',
          label: 'Maine Ch. 33 safety & ethics guard',
          status: 'pass',
          score: 15,
          maxScore: 15,
          finding: 'No prohibited restraint, seclusion, aversive, or basic-need deprivation language detected.',
          coaching: 'Remember: any separate Tier 3 emergency crisis protocol must follow Maine Ch. 33 (imminent serious physical injury only, certified staff, same-day family notice, and post-incident debrief).'
        };
    checks.push(ethicsCheck);

    var totalScore = 0;
    var maxScore = 0;
    for (var ci = 0; ci < checks.length; ci++) {
      totalScore += checks[ci].score;
      maxScore += checks[ci].maxScore;
    }

    var readiness = 'developing';
    if (ethicsFlagged || totalScore < 55) {
      readiness = 'needs_revision';
    } else if (totalScore >= 80 && !ethicsFlagged && checks[2].status === 'pass') {
      readiness = 'aligned';
    }

    var nextPriority = 'Plan chain is well-aligned for team review — add baseline measurement, fidelity checks, and student/family voice before piloting.';
    for (var pi = 0; pi < checks.length; pi++) {
      if (checks[pi].status === 'fail') {
        nextPriority = checks[pi].label + ': ' + checks[pi].coaching;
        break;
      }
    }
    if (!ethicsFlagged && readiness !== 'aligned') {
      var anyFail = checks.some(function(c) { return c.status === 'fail'; });
      if (!anyFail) {
        for (var wi = 0; wi < checks.length; wi++) {
          if (checks[wi].status === 'warn') {
            nextPriority = checks[wi].label + ': ' + checks[wi].coaching;
            break;
          }
        }
      }
    }

    var summary = ethicsFlagged
      ? 'Blocked by Maine Ch. 33 / ethics safety guard (' + totalScore + '/' + maxScore + '). Remove prohibited restraint, seclusion, or aversive procedures immediately.'
      : readiness === 'aligned'
        ? 'Strong FBA-to-BIP alignment (' + totalScore + '/' + maxScore + '). Target definition, setting events, functional equivalence, and ethics checks all hold.'
        : 'Draft in progress (' + totalScore + '/' + maxScore + '). Tighten the flagged reasoning links below before bringing to an IEP team.';

    return {
      score: totalScore,
      maxScore: maxScore,
      readiness: readiness,
      detectedTargetFunction: targetFn.code,
      detectedReplacementFunction: repFn.code,
      ethicsFlagged: ethicsFlagged,
      flaggedTerms: flaggedTerms,
      checks: checks,
      summary: summary,
      nextPriority: nextPriority
    };
  }

  var SCHOOL_BEHAVIOR_ENGINE = {
    version: '2.0.0',
    hashSeed: hashSeed,
    seededShuffle: seededShuffle,
    FUNCTIONS_KEY: FUNCTIONS_KEY,
    MATCHER_SCENARIOS: MATCHER_SCENARIOS,
    ABC_CODING_CASES: ABC_CODING_CASES,
    PBIS_TIER_OPTIONS: PBIS_TIER_OPTIONS,
    PBIS_TRIAGE_CASES: PBIS_TRIAGE_CASES,
    CYCLE_PHASE_CHECKS: CYCLE_PHASE_CHECKS,
    BIP_AUDIT_SAMPLES: BIP_AUDIT_SAMPLES,
    getShuffledFunctionOptions: getShuffledFunctionOptions,
    evaluateMatcherChoice: evaluateMatcherChoice,
    getAbcCase: getAbcCase,
    getAbcShuffledOptions: getAbcShuffledOptions,
    evaluateAbcCoding: evaluateAbcCoding,
    getPbisShuffledTiers: getPbisShuffledTiers,
    evaluatePbisTriage: evaluatePbisTriage,
    evaluateCyclePhaseCheck: evaluateCyclePhaseCheck,
    detectFunctionFromText: detectFunctionFromText,
    auditBipDraft: auditBipDraft
  };

  if (typeof window !== 'undefined') {
    window.SchoolBehaviorToolkitPure = SCHOOL_BEHAVIOR_ENGINE;
  }

  // Module-scope React handle for the interactive widgets below.
  // Hoisted out of render(ctx) so the components have stable function
  // identity across re-renders — defining them inside render() would
  // reset their useState on every parent re-render. AlloFlow runtime
  // guarantees window.React with hooks.
  var R = (typeof window !== 'undefined' && window.React) ? window.React : null;
  var h = R ? R.createElement : null;

  // Compact accessible Read Aloud button helper (routes exclusively through ctx.callTTS)
  function sbtReadBtn(hFn, speakText, textToRead, visibleLabel, ariaLabel, isHC) {
    if (!hFn || typeof speakText !== 'function' || !textToRead) return null;
    return hFn('button', {
      type: 'button',
      onClick: function() { speakText(textToRead); },
      'aria-label': ariaLabel,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        minHeight: 34,
        minWidth: 34,
        padding: '5px 10px',
        borderRadius: 8,
        border: isHC ? '1.5px solid #ffff00' : '1px solid rgba(45,212,191,0.42)',
        background: isHC ? '#000000' : 'rgba(20,184,166,0.14)',
        color: isHC ? '#ffff00' : '#99f6e4',
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }
    },
      hFn('span', { 'aria-hidden': 'true' }, '🔊'),
      hFn('span', null, visibleLabel)
    );
  }

  // ─────────────────────────────────────────────────────────
  // CycleScrubber — Acting-Out Cycle interactive scrubber
  // Walks the user phase-by-phase through Colvin's 7 phases with
  // a play/pause auto-advance, manual range slider, clickable phase
  // chips, SVG escalation curve, Read Aloud, and a verified
  // Phase-Matching Check (no passive slider-drag XP).
  // ─────────────────────────────────────────────────────────
  function CycleScrubber(props) {
    var CompR = (props && props.React && typeof props.React.useState === 'function') ? props.React : R;
    if (!CompR || typeof CompR.useState !== 'function') return null;
    var h = CompR.createElement;
    var t = props.t || function(k, fb) { return fb != null ? fb : k; };
    var phases = props.phases || ACTING_OUT_CYCLE;
    var cycleCompleted = !!props.cycleCompleted;
    var onVerifyCycle = props.onVerifyCycle;
    var speakText = props.speakText;
    var hc = !!(props.isContrast) || _sbtIsHC();
    var rm = !!props.reduceMotion;

    var ps = CompR.useState(1);        var currentPhase = ps[0]; var setCurrentPhase = ps[1];
    var as = CompR.useState(false);    var autoPlay = as[0];     var setAutoPlay = as[1];
    var ci = CompR.useState(0);        var checkIdx = ci[0];     var setCheckIdx = ci[1];
    var cp = CompR.useState(null);     var checkPick = cp[0];    var setCheckPick = cp[1];
    var cv = CompR.useState([]);       var verifiedIds = cv[0];  var setVerifiedIds = cv[1];

    CompR.useEffect(function() {
      if (!autoPlay) return;
      var timerId = setInterval(function() {
        setCurrentPhase(function(p) {
          return p >= 7 ? 7 : p + 1;
        });
      }, rm ? 3200 : 2200);
      return function() { clearInterval(timerId); };
    }, [autoPlay, rm]);

    CompR.useEffect(function() {
      if (autoPlay && currentPhase >= 7) setAutoPlay(false);
    }, [autoPlay, currentPhase]);

    var ph = phases[currentPhase - 1] || phases[0];
    var activeCheck = CYCLE_PHASE_CHECKS[checkIdx % CYCLE_PHASE_CHECKS.length];
    var shuffledCheckOpts = seededShuffle(activeCheck.options, 'cycle-check::' + activeCheck.id);
    var checkEval = checkPick !== null ? evaluateCyclePhaseCheck(activeCheck.id, checkPick) : null;

    function pickCheckOption(phaseNum) {
      if (checkPick !== null) return;
      setCheckPick(phaseNum);
      var ev = evaluateCyclePhaseCheck(activeCheck.id, phaseNum);
      if (ev.correct) {
        if (verifiedIds.indexOf(activeCheck.id) === -1) {
          setVerifiedIds(verifiedIds.concat([activeCheck.id]));
        }
        if (typeof onVerifyCycle === 'function') {
          onVerifyCycle(activeCheck.id);
        }
      }
    }

    function nextCheck() {
      setCheckIdx(function(n) { return (n + 1) % CYCLE_PHASE_CHECKS.length; });
      setCheckPick(null);
    }

    // Escalation arc: 7 points across X in a crisp 560x156 viewBox (no aspect distortion, readable >=10px labels).
    var xs = [72, 142, 212, 282, 352, 422, 492];
    var ys = [118, 96, 72, 42, 22, 66, 104];
    var arcPoints = phases.map(function(_, i) {
      return xs[i] + ',' + ys[i];
    }).join(' ');
    var areaPoints = arcPoints + ' 492,130 72,130';
    var dotX = xs[currentPhase - 1] || xs[0];
    var dotY = ys[currentPhase - 1] || ys[0];
    var phaseReadText = 'Phase ' + ph.phase + ', ' + ph.name + '. Signs: ' + ph.signs + ' Do this: ' + ph.doThis + ' Do not do: ' + ph.dontDo;

    return h('div', {
      className: 'sbt-stage-frame',
      style: {
        background: hc ? '#000000' : 'rgba(15,23,42,0.74)', borderRadius: 12, padding: 16, marginBottom: 14,
        borderTop: hc ? '2px solid #fbbf24' : '1px solid rgba(20,184,166,0.32)',
        borderRight: hc ? '2px solid #fbbf24' : '1px solid rgba(20,184,166,0.32)',
        borderBottom: hc ? '2px solid #fbbf24' : '1px solid rgba(20,184,166,0.32)',
        borderLeft: '4px solid ' + (hc ? '#ffff00' : '#14b8a6'),
        boxShadow: hc ? 'none' : '0 6px 24px rgba(2,6,23,0.35), 0 0 20px rgba(20,184,166,0.08)'
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
        h('div', { 'aria-hidden': 'true', style: {
          width: 36, height: 36, borderRadius: '50%', background: hc ? '#000000' : 'rgba(20,184,166,0.18)',
          border: '1.5px solid ' + (hc ? '#ffff00' : '#14b8a6'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
        } }, '▶'),
        h('div', { style: { flex: 1, minWidth: 200 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: hc ? '#ffff00' : '#5eead4' } }, __alloSBTT('stem.schoolbehaviortoolkit.walk_the_cycle', 'Walk the cycle — Colvin\'s 7 phases')),
          h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic' } }, __alloSBTT('stem.schoolbehaviortoolkit.cycle_scrubber_hint', 'Click a phase, drag the slider, or press Play to auto-advance through escalation and recovery.'))
        ),
        cycleCompleted && h('span', {
          style: {
            padding: '4px 10px', borderRadius: 999,
            background: hc ? '#000000' : 'rgba(34,197,94,0.15)',
            border: '1px solid ' + (hc ? '#00ff00' : '#22c55e'),
            color: hc ? '#00ff00' : '#4ade80',
            fontSize: 10.5, fontWeight: 800
          }
        }, t('stem.schoolbehaviortoolkit.cycle_verified_badge', '✓ Phase Check Verified'))
      ),

      // Phase chip strip
      h('div', { role: 'tablist', 'aria-label': __alloSBTT('stem.schoolbehaviortoolkit.a11y_acting_out_cycle_phases', 'Acting-out cycle phases'), style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
        phases.map(function(p, idx) {
          var active = p.phase === currentPhase;
          return h('button', {
            type: 'button',
            key: 'chip-' + p.phase, role: 'tab', id: 'sbt-cycle-tab-' + p.phase,
            'aria-controls': 'sbt-cycle-panel',
            'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onKeyDown: function(e) {
              if (e.ctrlKey || e.altKey || e.metaKey) return;
              var nextIdx = -1;
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % phases.length;
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx + phases.length - 1) % phases.length;
              else if (e.key === 'Home') nextIdx = 0;
              else if (e.key === 'End') nextIdx = phases.length - 1;
              if (nextIdx < 0) return;
              e.preventDefault();
              var nextPhase = phases[nextIdx];
              if (nextPhase) setCurrentPhase(nextPhase.phase);
              var tabEls = e.currentTarget.parentNode && e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
              if (tabEls && tabEls[nextIdx]) tabEls[nextIdx].focus();
            },
            onClick: function() { setCurrentPhase(p.phase); },
            title: p.name,
            style: {
              flex: '1 1 82px', minWidth: 68, minHeight: 44,
              padding: '8px 6px',
              borderRadius: 8,
              border: '1.5px solid ' + (active ? (hc ? '#ffff00' : p.color) : (hc ? '#fbbf24' : 'rgba(100,116,139,0.32)')),
              background: active ? (hc ? '#00ff00' : p.color + '22') : (hc ? '#000000' : 'rgba(15,23,42,0.55)'),
              color: active ? (hc ? '#000000' : p.color) : (hc ? '#ffffff' : 'var(--allo-stem-text-soft, #94a3b8)'),
              fontSize: 10.5, fontWeight: active ? 800 : 600,
              cursor: 'pointer',
              transition: rm ? 'none' : 'all 180ms ease',
              transform: (active && !rm) ? 'translateY(-1px)' : 'none',
              boxShadow: (active && !hc) ? '0 4px 12px ' + p.color + '40' : 'none'
            }
          },
            h('div', { 'aria-hidden': 'true', style: { fontSize: 16, lineHeight: 1, marginBottom: 2 } }, p.icon),
            h('div', { style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10 } }, 'P' + p.phase),
            h('div', { style: { lineHeight: 1.2, marginTop: 2 } }, p.name)
          );
        })
      ),

      // SVG escalation curve (true aspect ratio, >=10px labels, intervention zones)
      h('div', { style: { background: hc ? '#000000' : 'rgba(2,6,23,0.72)', border: hc ? '1.5px solid #fbbf24' : '1px solid rgba(45,212,191,0.28)', borderRadius: 10, padding: '8px 10px', marginBottom: 12 } },
        h('svg', {
          viewBox: '0 0 560 156',
          role: 'img',
          'aria-label': __alloSBTT('stem.schoolbehaviortoolkit.a11y_escalation_curve_diagram', 'Colvin acting-out escalation curve across 7 phases, currently at phase ') + currentPhase + ': ' + ph.name,
          style: { width: '100%', maxHeight: 168, height: 'auto', display: 'block', borderRadius: 7 }
        },
          !hc && h('defs', null,
            h('linearGradient', { id: 'sbt-esc-well', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#0c1628' }),
              h('stop', { offset: '100%', stopColor: '#030712' })
            ),
            h('linearGradient', { id: 'sbt-esc-area', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#2dd4bf', stopOpacity: 0.34 }),
              h('stop', { offset: '100%', stopColor: '#0f172a', stopOpacity: 0.02 })
            ),
            h('linearGradient', { id: 'sbt-esc-stroke', x1: '0', y1: '0', x2: '1', y2: '0' },
              h('stop', { offset: '0%', stopColor: '#4ade80' }),
              h('stop', { offset: '38%', stopColor: '#fbbf24' }),
              h('stop', { offset: '62%', stopColor: '#f87171' }),
              h('stop', { offset: '100%', stopColor: '#38bdf8' })
            )
          ),
          h('rect', { x: 0, y: 0, width: 560, height: 156, rx: 7, fill: hc ? '#000000' : 'url(#sbt-esc-well)', stroke: hc ? '#ffff00' : 'rgba(148,163,184,0.18)', strokeWidth: 0.8 }),
          !hc && h('rect', { className: 'sbt-svg-fx', x: 56, y: 12, width: 122, height: 118, fill: 'rgba(34,197,94,0.08)' }),
          !hc && h('rect', { className: 'sbt-svg-fx', x: 178, y: 12, width: 138, height: 118, fill: 'rgba(251,191,36,0.08)' }),
          !hc && h('rect', { className: 'sbt-svg-fx', x: 316, y: 12, width: 72, height: 118, fill: 'rgba(239,68,68,0.12)' }),
          !hc && h('rect', { className: 'sbt-svg-fx', x: 388, y: 12, width: 130, height: 118, fill: 'rgba(56,189,248,0.08)' }),
          [178, 316, 388].map(function(dx, di) {
            return h('line', { key: 'pd-' + di, x1: dx, y1: 12, x2: dx, y2: 130, stroke: hc ? '#ffff00' : 'rgba(148,163,184,0.28)', strokeWidth: 0.9, strokeDasharray: '2 3' });
          }),
          h('line', { className: (!hc && !rm) ? 'sbt-goal-flow-slow' : undefined, x1: 56, y1: 22, x2: 518, y2: 22, stroke: hc ? '#ffff00' : 'rgba(239,68,68,0.34)', strokeWidth: 1, strokeDasharray: '4 4' }),
          h('line', { className: (!hc && !rm) ? 'sbt-goal-flow-slow' : undefined, x1: 56, y1: 72, x2: 518, y2: 72, stroke: hc ? '#ffff00' : 'rgba(251,191,36,0.28)', strokeWidth: 1, strokeDasharray: '4 4' }),
          h('line', { x1: 56, y1: 130, x2: 518, y2: 130, stroke: hc ? '#ffffff' : 'rgba(148,163,184,0.50)', strokeWidth: 1.3 }),
          h('text', { x: 50, y: 26, textAnchor: 'end', fontSize: 10.5, fontWeight: 800, fill: hc ? '#ffff00' : '#f87171', fontFamily: 'ui-monospace, Menlo, monospace' }, 'PEAK'),
          h('text', { x: 50, y: 76, textAnchor: 'end', fontSize: 10, fontWeight: 700, fill: hc ? '#ffffff' : '#fbbf24', fontFamily: 'ui-monospace, Menlo, monospace' }, 'MID'),
          h('text', { x: 50, y: 128, textAnchor: 'end', fontSize: 10.5, fontWeight: 800, fill: hc ? '#00ff00' : '#4ade80', fontFamily: 'ui-monospace, Menlo, monospace' }, 'CALM'),
          !hc && h('polygon', { className: 'sbt-svg-fx', points: areaPoints, fill: 'url(#sbt-esc-area)', stroke: 'none' }),
          !hc && h('polyline', { className: !rm ? 'sbt-svg-fx sbt-curve-glow' : 'sbt-svg-fx', points: arcPoints, fill: 'none', stroke: '#2dd4bf', strokeWidth: 8, strokeOpacity: 0.2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
          h('polyline', {
            points: arcPoints,
            fill: 'none', stroke: hc ? '#ffff00' : 'url(#sbt-esc-stroke)', strokeWidth: 3.2,
            strokeLinejoin: 'round', strokeLinecap: 'round'
          }),
          !hc && !rm && h('polyline', { className: 'sbt-svg-fx sbt-goal-flow', points: arcPoints, fill: 'none', stroke: '#ffffff', strokeWidth: 1.4, strokeDasharray: '6 18', strokeOpacity: 0.58, strokeLinejoin: 'round', strokeLinecap: 'round' }),
          phases.map(function(p, i) {
            var isCur = p.phase === currentPhase;
            return h('g', { key: 'dot-' + i },
              h('line', { x1: xs[i], y1: ys[i], x2: xs[i], y2: 130, stroke: isCur ? (hc ? '#00ff00' : p.color) : 'rgba(148,163,184,0.22)', strokeWidth: isCur ? 1.8 : 1, strokeDasharray: isCur ? '' : '2 3' }),
              h('circle', { cx: xs[i], cy: ys[i], r: isCur ? 5.5 : 4, fill: isCur ? (hc ? '#00ff00' : p.color) : '#334155', stroke: '#0f172a', strokeWidth: 1.5 }),
              h('text', { x: xs[i], y: 147, textAnchor: 'middle', fontSize: 10.5, fontWeight: isCur ? 800 : 600, fill: isCur ? (hc ? '#00ff00' : p.color) : (hc ? '#ffffff' : '#94a3b8'), fontFamily: 'ui-monospace, Menlo, monospace' }, 'P' + p.phase)
            );
          }),
          !hc && !rm && h('circle', { className: 'sbt-svg-fx sbt-beacon-calm', cx: dotX, cy: dotY, r: 16, fill: 'none', stroke: ph.color, strokeWidth: 1.5, opacity: 0.44 }),
          !hc && !rm && h('circle', { className: 'sbt-svg-fx sbt-beacon-calm', cx: dotX, cy: dotY, r: 13.5, fill: ph.color, opacity: 0.24 }),
          h('circle', { cx: dotX, cy: dotY, r: 7, fill: hc ? '#00ff00' : ph.color, stroke: '#ffffff', strokeWidth: 2 }),
          !hc && h('circle', { className: 'sbt-svg-fx', cx: dotX - 2, cy: dotY - 2, r: 2, fill: '#ffffff', opacity: 0.85 })
        )
      ),

      // Controls — slider + play button + reset
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
        h('input', {
          type: 'range',
          'aria-valuetext': t('stem.schoolbehaviortoolkit.cycle_phase_valuetext_prefix', 'Phase ') + currentPhase + t('stem.schoolbehaviortoolkit.cycle_phase_valuetext_suffix', ' of 7'),
          min: 1, max: 7, step: 1, value: currentPhase,
          'aria-label': __alloSBTT('stem.schoolbehaviortoolkit.a11y_cycle_phase', 'Cycle phase'),
          onChange: function(e) { setCurrentPhase(parseInt(e.target.value, 10)); setAutoPlay(false); },
          style: { flex: 1, minWidth: 160, accentColor: hc ? '#ffff00' : ph.color }
        }),
        h('button', {
          type: 'button',
          onClick: function() {
            if (currentPhase >= 7) setCurrentPhase(1);
            setAutoPlay(function(prev) { return !prev; });
          },
          'aria-label': autoPlay ? t('stem.schoolbehaviortoolkit.cycle_pause_aria', 'Pause auto-advance') : t('stem.schoolbehaviortoolkit.cycle_play_aria', 'Play auto-advance'),
          style: {
            padding: '8px 14px', minHeight: 38, borderRadius: 8,
            background: autoPlay ? (hc ? '#00ff00' : '#14b8a6') : (hc ? '#000000' : 'rgba(20,184,166,0.18)'),
            color: autoPlay ? '#000000' : (hc ? '#ffff00' : '#5eead4'),
            border: '1.5px solid ' + (hc ? '#ffff00' : '#14b8a6'),
            fontSize: 11, fontWeight: 800,
            cursor: 'pointer', whiteSpace: 'nowrap'
          }
        }, autoPlay ? t('stem.schoolbehaviortoolkit.cycle_pause_btn', '⏸ Pause') : t('stem.schoolbehaviortoolkit.cycle_play_btn', '▶ Play')),
        h('button', {
          type: 'button',
          onClick: function() { setCurrentPhase(1); setAutoPlay(false); },
          'aria-label': __alloSBTT('stem.schoolbehaviortoolkit.a11y_reset_to_phase_1_calm', 'Reset to Phase 1 Calm'),
          style: {
            padding: '8px 12px', minHeight: 38, borderRadius: 8,
            background: hc ? '#000000' : 'rgba(148,163,184,0.10)', color: hc ? '#ffffff' : 'var(--allo-stem-text-soft, #94a3b8)',
            border: '1px solid ' + (hc ? '#fbbf24' : 'rgba(148,163,184,0.30)'),
            fontSize: 11, fontWeight: 700, cursor: 'pointer'
          }
        }, t('stem.schoolbehaviortoolkit.cycle_reset_btn', '↺ Reset'))
      ),

      // Active phase callout
      h('div', {
        role: 'tabpanel', id: 'sbt-cycle-panel', 'aria-labelledby': 'sbt-cycle-tab-' + ph.phase,
        style: {
          background: hc ? '#000000' : 'linear-gradient(135deg, ' + ph.color + '18, rgba(15,23,42,0.7))',
          borderRadius: 10, padding: '14px 16px', marginBottom: 14,
          borderTop: '1px solid ' + (hc ? '#fbbf24' : ph.color + '60'),
          borderRight: '1px solid ' + (hc ? '#fbbf24' : ph.color + '60'),
          borderBottom: '1px solid ' + (hc ? '#fbbf24' : ph.color + '60'),
          borderLeft: '4px solid ' + (hc ? '#ffff00' : ph.color)
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' } },
          h('div', { 'aria-hidden': 'true', style: {
            width: 44, height: 44, borderRadius: '50%', background: hc ? '#000000' : ph.color + '30',
            border: '2px solid ' + (hc ? '#ffff00' : ph.color), display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22
          } }, ph.icon),
          h('div', { style: { flex: 1, minWidth: 160 } },
            h('div', { style: { fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', color: hc ? '#ffff00' : ph.color, fontWeight: 800, letterSpacing: '0.08em' } }, 'PHASE ' + ph.phase),
            h('div', { style: { fontSize: 17, fontWeight: 900, color: hc ? '#ffffff' : ph.color, lineHeight: 1.1, marginTop: 2 } }, ph.name)
          ),
          sbtReadBtn(h, speakText, phaseReadText, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_active_phase_aria', 'Read active crisis phase aloud'), hc)
        ),
        h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 10 } },
          h('b', { style: { color: 'var(--allo-stem-text, #e2e8f0)' } }, t('stem.schoolbehaviortoolkit.cycle_what_you_see', 'What you\'ll see: ')), ph.signs),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 } },
          h('div', { style: { padding: 10, borderRadius: 8, background: hc ? '#000000' : 'rgba(34,197,94,0.10)', border: '1px solid ' + (hc ? '#00ff00' : 'rgba(34,197,94,0.30)') } },
            h('div', { style: { fontSize: 10, fontWeight: 800, color: hc ? '#00ff00' : '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, t('stem.schoolbehaviortoolkit.cycle_do_label', '✓ Do')),
            h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, ph.doThis)
          ),
          h('div', { style: { padding: 10, borderRadius: 8, background: hc ? '#000000' : 'rgba(239,68,68,0.10)', border: '1px solid ' + (hc ? '#ffff00' : 'rgba(239,68,68,0.30)') } },
            h('div', { style: { fontSize: 10, fontWeight: 800, color: hc ? '#ffff00' : '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } }, t('stem.schoolbehaviortoolkit.cycle_dont_label', '✗ Don\'t')),
            h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, ph.dontDo)
          )
        )
      ),

      // Verified Phase-Matching Check (replaces passive slider-drag XP)
      h('div', {
        style: {
          background: hc ? '#000000' : 'rgba(2,6,23,0.62)',
          borderRadius: 10,
          padding: '12px 14px',
          border: '1px solid ' + (hc ? '#fbbf24' : 'rgba(45,212,191,0.30)')
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
          h('div', null,
            h('div', { style: { fontSize: 12, fontWeight: 800, color: hc ? '#ffff00' : '#5eead4' } }, t('stem.schoolbehaviortoolkit.cycle_check_h', '🎯 Phase-Matching Check — verify your response')),
            h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2 } },
              t('stem.schoolbehaviortoolkit.cycle_check_sub', 'Match the classroom moment to the Colvin phase and right adult move before revealing.') + ' (' + (checkIdx + 1) + ' / ' + CYCLE_PHASE_CHECKS.length + ')')
          ),
          sbtReadBtn(h, speakText, activeCheck.vignette, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_cycle_check_aria', 'Read phase-matching vignette aloud'), hc)
        ),
        h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: hc ? '#000000' : 'rgba(15,23,42,0.72)', borderLeft: '3px solid ' + (hc ? '#ffff00' : '#5eead4') } },
          activeCheck.vignette),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: checkEval ? 10 : 0 } },
          shuffledCheckOpts.map(function(opt) {
            var isPick = checkPick === opt.phase;
            var isAns = activeCheck.correctPhase === opt.phase;
            var locked = checkPick !== null;
            var bg = hc ? '#000000' : 'rgba(15,23,42,0.68)';
            var bd = hc ? '#fbbf24' : 'rgba(100,116,139,0.40)';
            var col = hc ? '#ffffff' : 'var(--allo-stem-text, #e2e8f0)';
            if (locked && isAns) { bg = hc ? '#000000' : 'rgba(34,197,94,0.16)'; bd = hc ? '#00ff00' : '#22c55e'; col = hc ? '#00ff00' : '#86efac'; }
            else if (locked && isPick && !isAns) { bg = hc ? '#000000' : 'rgba(239,68,68,0.16)'; bd = hc ? '#ffff00' : '#ef4444'; col = hc ? '#ffff00' : '#fca5a5'; }
            return h('button', {
              key: 'chk-opt-' + activeCheck.id + '-' + opt.phase,
              type: 'button',
              disabled: locked,
              onClick: function() { pickCheckOption(opt.phase); },
              style: {
                textAlign: 'left',
                padding: '9px 11px',
                minHeight: 42,
                borderRadius: 8,
                border: '1.5px solid ' + bd,
                background: bg,
                color: col,
                fontSize: 11.5,
                fontWeight: 700,
                lineHeight: 1.4,
                cursor: locked ? 'default' : 'pointer'
              }
            }, opt.label);
          })
        ),
        checkEval && h('div', {
          role: 'status',
          style: {
            padding: '10px 12px',
            borderRadius: 8,
            background: hc ? '#000000' : (checkEval.correct ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)'),
            border: '1px solid ' + (hc ? (checkEval.correct ? '#00ff00' : '#ffff00') : (checkEval.correct ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'))
          }
        },
          h('div', { style: { fontSize: 11, fontWeight: 800, color: checkEval.correct ? (hc ? '#00ff00' : '#4ade80') : (hc ? '#ffff00' : '#fca5a5'), marginBottom: 4 } },
            checkEval.correct
              ? t('stem.schoolbehaviortoolkit.cycle_check_right', '✓ Verified — right phase and response')
              : t('stem.schoolbehaviortoolkit.cycle_check_wrong', '✗ Not that phase — compare the escalation cues')),
          !checkEval.correct && checkEval.whyNotPicked && h('div', { style: { fontSize: 11, color: hc ? '#ffff00' : '#fde68a', lineHeight: 1.5, marginBottom: 6 } },
            h('strong', null, t('stem.schoolbehaviortoolkit.why_not_label', 'Why not that choice: ')),
            checkEval.whyNotPicked),
          h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } }, checkEval.why),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
            h('button', {
              type: 'button',
              onClick: function() { setCurrentPhase(activeCheck.correctPhase); },
              style: {
                padding: '6px 10px', minHeight: 34, borderRadius: 7,
                background: hc ? '#000000' : 'rgba(15,23,42,0.72)',
                border: '1px solid ' + (hc ? '#fbbf24' : 'rgba(148,163,184,0.35)'),
                color: hc ? '#ffffff' : '#cbd5e1', fontSize: 11, fontWeight: 700, cursor: 'pointer'
              }
            }, t('stem.schoolbehaviortoolkit.cycle_jump_to_phase', '↗ Highlight Phase ') + activeCheck.correctPhase),
            h('button', {
              type: 'button',
              onClick: nextCheck,
              style: {
                padding: '6px 14px', minHeight: 34, borderRadius: 7,
                background: hc ? '#00ff00' : '#14b8a6',
                color: '#000000', border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer'
              }
            }, t('stem.schoolbehaviortoolkit.cycle_next_check', 'Next phase check →'))
          )
        )
      )
    );
  }

  // ─────────────────────────────────────────────────────────
  // FunctionMatcher — Replacement Behavior practice quiz
  // 8 short ABC vignettes with seeded option shuffling, per-
  // distractor whyNot misconception feedback, Retry Missed
  // mastery loop, Read Aloud, and persisted XP deduplication.
  // ─────────────────────────────────────────────────────────
  function FunctionMatcher(props) {
    var CompR = (props && props.React && typeof props.React.useState === 'function') ? props.React : R;
    if (!CompR || typeof CompR.useState !== 'function') return null;
    var h = CompR.createElement;
    var t = props.t || function(k, fb) { return fb != null ? fb : k; };
    var scenarios = Array.isArray(props.scenarios) && props.scenarios.length ? props.scenarios : MATCHER_SCENARIOS;
    var solvedIds = Array.isArray(props.solvedIds) ? props.solvedIds : [];
    var onSolveScenario = props.onSolveScenario;
    var speakText = props.speakText;
    var hc = !!(props.isContrast) || _sbtIsHC();
    var rm = !!props.reduceMotion;

    var allIndices = scenarios.map(function(_, i) { return i; });
    var qs = CompR.useState(allIndices); var queue = qs[0];        var setQueue = qs[1];
    var is = CompR.useState(0);          var pos = is[0];          var setPos = is[1];
    var ss = CompR.useState(0);          var score = ss[0];        var setScore = ss[1];
    var ts = CompR.useState(0);          var attempts = ts[0];     var setAttempts = ts[1];
    var ps = CompR.useState(null);       var pick = ps[0];         var setPick = ps[1];
    var ms = CompR.useState([]);         var missedInRun = ms[0];  var setMissedInRun = ms[1];
    var rs = CompR.useState(1);          var runSeed = rs[0];      var setRunSeed = rs[1];

    var done = pos >= queue.length;
    var scIndex = !done ? queue[pos] : 0;
    var sc = scenarios[scIndex % scenarios.length];
    var shuffledFns = getShuffledFunctionOptions(sc.id || scIndex, runSeed);
    var picked = pick !== null;
    var evalRes = picked ? evaluateMatcherChoice(sc, pick) : null;
    var correct = !!(evalRes && evalRes.correct);

    function choose(code) {
      if (picked || done) return;
      setPick(code);
      setAttempts(function(n) { return n + 1; });
      var res = evaluateMatcherChoice(sc, code);
      if (res.correct) {
        setScore(function(n) { return n + 1; });
        if (typeof onSolveScenario === 'function') {
          onSolveScenario(sc.id || ('m' + (scIndex + 1)));
        }
      } else {
        setMissedInRun(function(prev) {
          return prev.indexOf(scIndex) === -1 ? prev.concat([scIndex]) : prev;
        });
      }
    }

    function next() {
      setPos(function(p) { return p + 1; });
      setPick(null);
    }

    function resetFull() {
      setQueue(scenarios.map(function(_, i) { return i; }));
      setPos(0);
      setPick(null);
      setScore(0);
      setAttempts(0);
      setMissedInRun([]);
      setRunSeed(function(n) { return n + 1; });
    }

    function retryMissed() {
      if (!missedInRun.length) {
        resetFull();
        return;
      }
      setQueue(missedInRun.slice());
      setPos(0);
      setPick(null);
      setScore(0);
      setAttempts(0);
      setMissedInRun([]);
      setRunSeed(function(n) { return n + 1; });
    }

    if (done) {
      var pct = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
      var grade = pct >= 88
        ? t('stem.schoolbehaviortoolkit.matcher_grade_top', '🏆 Function-spotter')
        : pct >= 75
          ? t('stem.schoolbehaviortoolkit.matcher_grade_solid', '🎯 Solid hypothesis-builder')
          : pct >= 60
            ? t('stem.schoolbehaviortoolkit.matcher_grade_mid', '📖 Practice helps — re-walk the four function cards')
            : t('stem.schoolbehaviortoolkit.matcher_grade_low', '🔄 Re-read the scenarios with the function definitions side-by-side');
      return h('div', {
        style: {
          background: hc ? '#000000' : 'rgba(15,23,42,0.7)', borderRadius: 12, padding: 16, marginBottom: 14,
          borderTop: '1px solid ' + (hc ? '#fbbf24' : 'rgba(20,184,166,0.30)'),
          borderRight: '1px solid ' + (hc ? '#fbbf24' : 'rgba(20,184,166,0.30)'),
          borderBottom: '1px solid ' + (hc ? '#fbbf24' : 'rgba(20,184,166,0.30)'),
          borderLeft: '4px solid ' + (hc ? '#ffff00' : '#14b8a6')
        }
      },
        h('div', { style: { textAlign: 'center', padding: 12 } },
          h('div', { 'aria-hidden': 'true', style: { fontSize: 28, marginBottom: 6 } }, '🎯'),
          h('div', { style: { fontSize: 14, fontWeight: 900, color: hc ? '#ffff00' : '#5eead4', marginBottom: 4 } },
            t('stem.schoolbehaviortoolkit.matcher_complete_h', 'Function-spotter round complete')),
          h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginBottom: 6 } },
            t('stem.schoolbehaviortoolkit.score_prefix', 'Score: ') + score + ' / ' + attempts + ' (' + pct + '%) · ' + t('stem.schoolbehaviortoolkit.mastered_prefix', 'Mastered: ') + solvedIds.length + ' / ' + scenarios.length),
          h('div', { style: { fontSize: 12, color: hc ? '#00ff00' : '#5eead4', fontWeight: 700, marginBottom: 14 } }, grade),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' } },
            missedInRun.length > 0 && h('button', {
              type: 'button',
              onClick: retryMissed,
              style: {
                padding: '10px 18px', minHeight: 40, borderRadius: 8,
                background: hc ? '#ffff00' : '#f59e0b', color: '#000000',
                border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer'
              }
            }, t('stem.schoolbehaviortoolkit.retry_missed_prefix', '↺ Retry missed (') + missedInRun.length + ')'),
            h('button', {
              type: 'button',
              onClick: resetFull,
              style: {
                padding: '10px 18px', minHeight: 40, borderRadius: 8,
                background: hc ? '#00ff00' : '#14b8a6', color: '#000000',
                border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer'
              }
            }, t('stem.schoolbehaviortoolkit.run_full_set', '↺ Run full set again'))
          )
        )
      );
    }

    var feedbackSpeech = evalRes
      ? ((evalRes.correct ? 'Correct, ' + evalRes.answer + '. ' : 'Actually ' + evalRes.answer + '. ' + (evalRes.whyNotPicked ? 'Why not ' + evalRes.picked + ': ' + evalRes.whyNotPicked + ' ' : '')) + evalRes.why)
      : '';

    return h('div', {
      style: {
        background: hc ? '#000000' : 'rgba(15,23,42,0.7)', borderRadius: 12, padding: 16, marginBottom: 14,
        borderTop: '1px solid ' + (hc ? '#fbbf24' : 'rgba(20,184,166,0.30)'),
        borderRight: '1px solid ' + (hc ? '#fbbf24' : 'rgba(20,184,166,0.30)'),
        borderBottom: '1px solid ' + (hc ? '#fbbf24' : 'rgba(20,184,166,0.30)'),
        borderLeft: '4px solid ' + (hc ? '#ffff00' : '#14b8a6')
      }
    },
      // Header + score chip
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
        h('div', { 'aria-hidden': 'true', style: {
          width: 36, height: 36, borderRadius: '50%', background: hc ? '#000000' : 'rgba(20,184,166,0.18)',
          border: '1.5px solid ' + (hc ? '#ffff00' : '#14b8a6'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
        } }, '🎯'),
        h('div', { style: { flex: 1, minWidth: 200 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: hc ? '#ffff00' : '#5eead4' } }, t('stem.schoolbehaviortoolkit.matcher_h', 'Function-spotter practice')),
          h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic' } }, t('stem.schoolbehaviortoolkit.matcher_sub', 'Read the vignette, hypothesize the maintaining function before reveal, and inspect why distractors fail.'))
        ),
        h('div', { style: {
          padding: '6px 12px', borderRadius: 999,
          background: hc ? '#000000' : 'rgba(20,184,166,0.12)', border: '1px solid ' + (hc ? '#ffff00' : 'rgba(20,184,166,0.40)'),
          color: hc ? '#ffff00' : '#5eead4', fontSize: 11, fontWeight: 800,
          fontFamily: 'ui-monospace, Menlo, monospace'
        } }, t('stem.schoolbehaviortoolkit.mastered_prefix', 'Mastered: ') + solvedIds.length + '/' + scenarios.length + ' · ' + (pos + 1) + '/' + queue.length)
      ),

      // Scenario stem + Read Aloud
      h('div', {
        style: {
          background: hc ? '#000000' : 'rgba(2,6,23,0.5)', borderRadius: 8, padding: '12px 14px', marginBottom: 12,
          border: hc ? '1px solid #fbbf24' : 'none',
          borderLeft: '3px solid ' + (hc ? '#ffff00' : '#5eead4')
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
          h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.08em' } },
            t('stem.schoolbehaviortoolkit.scenario_label', 'Scenario') + (queue.length < scenarios.length ? ' · ' + t('stem.schoolbehaviortoolkit.retry_round_tag', 'Retry Missed') : '')),
          sbtReadBtn(h, speakText, sc.stem, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_matcher_scenario_aria', 'Read function-spotter scenario aloud'), hc)
        ),
        h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sc.stem)
      ),

      // Shuffled Function chips
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 } },
        shuffledFns.map(function(f) {
          var isPick = pick === f.code;
          var isAns = sc.answer === f.code;
          var showAsCorrect = picked && isAns;
          var showAsWrong   = picked && isPick && !correct;
          var bg, color, borderC;
          if (showAsCorrect) { bg = hc ? '#000000' : 'rgba(34,197,94,0.18)'; color = hc ? '#00ff00' : '#22c55e'; borderC = hc ? '#00ff00' : '#22c55e'; }
          else if (showAsWrong) { bg = hc ? '#000000' : 'rgba(239,68,68,0.18)'; color = hc ? '#ffff00' : '#ef4444'; borderC = hc ? '#ffff00' : '#ef4444'; }
          else if (picked) { bg = hc ? '#000000' : 'rgba(15,23,42,0.5)'; color = hc ? '#ffffff' : '#94a3b8'; borderC = hc ? '#fbbf24' : 'rgba(100,116,139,0.30)'; }
          else { bg = hc ? '#000000' : f.color + '12'; color = hc ? '#ffffff' : f.color; borderC = hc ? '#fbbf24' : f.color + '60'; }

          return h('button', {
            type: 'button',
            key: 'fn-' + sc.id + '-' + f.code,
            onClick: function() { choose(f.code); },
            disabled: picked,
            'aria-label': t('stem.schoolbehaviortoolkit.select_function_aria', 'Select behavior function: ') + f.label,
            style: {
              padding: '12px 8px', minHeight: 44, borderRadius: 10,
              background: bg, color: color,
              border: '1.5px solid ' + borderC,
              fontSize: 12, fontWeight: 800,
              cursor: picked ? 'default' : 'pointer',
              transition: rm ? 'none' : 'all 200ms ease',
              transform: (showAsCorrect && !rm) ? 'scale(1.03)' : 'none'
            }
          },
            h('div', { 'aria-hidden': 'true', style: { fontSize: 20, marginBottom: 4, lineHeight: 1 } }, f.icon),
            h('div', { style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10 } }, f.code),
            h('div', { style: { marginTop: 2 } }, f.label),
            showAsCorrect ? h('div', { style: { fontSize: 10, marginTop: 4 } }, '✓') : null,
            showAsWrong ? h('div', { style: { fontSize: 10, marginTop: 4 } }, '✗') : null
          );
        })
      ),

      // Feedback with per-distractor whyNot diagnosis
      picked && evalRes
        ? h('div', {
            role: 'status',
            style: {
              padding: '12px 14px', borderRadius: 8,
              background: hc ? '#000000' : (correct ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)'),
              border: '1px solid ' + (hc ? (correct ? '#00ff00' : '#ffff00') : (correct ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)')),
              marginBottom: 4
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 } },
              h('div', { style: {
                fontSize: 11, fontWeight: 800,
                color: correct ? (hc ? '#00ff00' : '#22c55e') : (hc ? '#ffff00' : '#f87171'),
                textTransform: 'uppercase', letterSpacing: '0.06em'
              } }, correct
                ? t('stem.schoolbehaviortoolkit.matcher_correct_prefix', '✓ Correct — function: ') + sc.answer
                : t('stem.schoolbehaviortoolkit.matcher_wrong_prefix', '✗ Actually ') + sc.answer + t('stem.schoolbehaviortoolkit.matcher_wrong_suffix', ' — see why the data rules out ') + pick),
              sbtReadBtn(h, speakText, feedbackSpeech, t('stem.schoolbehaviortoolkit.read_feedback', 'Read feedback'), t('stem.schoolbehaviortoolkit.read_matcher_feedback_aria', 'Read function-spotter explanation aloud'), hc)
            ),
            !correct && evalRes.whyNotPicked && h('div', {
              style: {
                padding: '8px 10px', borderRadius: 6, marginBottom: 8,
                background: hc ? '#000000' : 'rgba(251,191,36,0.10)',
                borderLeft: '3px solid ' + (hc ? '#ffff00' : '#fbbf24'),
                fontSize: 11, color: hc ? '#ffff00' : '#fde68a', lineHeight: 1.55
              }
            },
              h('strong', null, t('stem.schoolbehaviortoolkit.why_not_prefix', 'Why not ') + pick + ': '),
              evalRes.whyNotPicked
            ),
            h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, marginBottom: 6 } },
              h('strong', { style: { color: hc ? '#ffffff' : '#e2e8f0' } }, t('stem.schoolbehaviortoolkit.data_signal_prefix', 'Data signal (') + sc.answer + '): '),
              evalRes.why),
            evalRes.replacementTip && h('div', { style: { fontSize: 11, color: hc ? '#00ff00' : '#99f6e4', lineHeight: 1.5, marginBottom: 8 } },
              h('strong', null, t('stem.schoolbehaviortoolkit.matched_replacement_prefix', 'Matched replacement bridge: ')),
              evalRes.replacementTip),
            h('div', { style: { marginTop: 8, textAlign: 'right' } },
              h('button', {
                type: 'button',
                onClick: next,
                style: {
                  padding: '8px 16px', minHeight: 38, borderRadius: 8,
                  background: hc ? '#00ff00' : '#14b8a6', color: '#000000',
                  border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer'
                }
              }, pos + 1 >= queue.length
                ? t('stem.schoolbehaviortoolkit.see_score_btn', 'See score →')
                : t('stem.schoolbehaviortoolkit.next_scenario_btn', 'Next scenario →'))
            )
          )
        : h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', textAlign: 'center', fontStyle: 'italic' } },
            t('stem.schoolbehaviortoolkit.matcher_prompt_hint', 'Commit to a function hypothesis to reveal the data signal and misconception breakdown.'))
    );
  }

  // ─────────────────────────────────────────────────────────
  // DecisionTree — Restraint/Seclusion ethics walker
  // Persisted scenario completion dedup (decisionSolvedIds) +
  // Read Aloud + light/dark/contrast + reduceMotion support.
  // ─────────────────────────────────────────────────────────
  function DecisionTree(props) {
    var CompR = (props && props.React && typeof props.React.useState === 'function') ? props.React : R;
    if (!CompR || typeof CompR.useState !== 'function') return null;
    var h = CompR.createElement;
    var t = props.t || function(k, fb) { return fb != null ? fb : k; };
    var scenarios = Array.isArray(props.scenarios) && props.scenarios.length ? props.scenarios : DECISION_SCENARIOS;
    var solvedIds = Array.isArray(props.solvedIds) ? props.solvedIds : [];
    var onSolveScenario = props.onSolveScenario;
    var speakText = props.speakText;
    var hc = !!(props.isContrast) || _sbtIsHC();
    var rm = !!props.reduceMotion;

    var ss = CompR.useState(scenarios[0].id); var scenarioId = ss[0]; var setScenarioId = ss[1];
    var ns = CompR.useState('start');         var nodeId = ns[0];     var setNodeId = ns[1];
    var hs = CompR.useState([]);              var history = hs[0];    var setHistory = hs[1];

    var scenario = scenarios.filter(function(s) { return s.id === scenarioId; })[0] || scenarios[0];
    var node = (scenario.nodes && scenario.nodes[nodeId]) || scenario.nodes.start;

    function pickScenario(id) {
      setScenarioId(id); setNodeId('start'); setHistory([]);
    }
    function choose(choiceIdx) {
      var ch = node.choices[choiceIdx];
      if (!ch) return;
      var newHistory = history.concat([{ nodeId: nodeId, choiceIdx: choiceIdx, verdict: ch.verdict, label: ch.label }]);
      setHistory(newHistory);
      if (ch.next) setNodeId(ch.next);
    }
    function restart() {
      setNodeId('start'); setHistory([]);
    }

    // Persisted completion dedup: only awards XP once per unique scenarioId in toolData
    CompR.useEffect(function() {
      if (node && node.terminal && solvedIds.indexOf(scenarioId) === -1) {
        if (typeof onSolveScenario === 'function') onSolveScenario(scenarioId);
      }
    }, [nodeId, scenarioId, solvedIds.join(',')]);

    var lastChoice = history.length > 0 ? history[history.length - 1] : null;
    var lastChoiceObj = (lastChoice && scenario.nodes[lastChoice.nodeId] && scenario.nodes[lastChoice.nodeId].choices)
      ? scenario.nodes[lastChoice.nodeId].choices[lastChoice.choiceIdx]
      : null;

    var setupReadText = scenario.title + '. ' + scenario.stem + (node && node.prompt ? ' ' + node.prompt : '');
    var feedbackReadText = lastChoiceObj ? (lastChoiceObj.verdict + '. ' + lastChoiceObj.why + ' Citation: ' + lastChoiceObj.cite) : '';

    return h('div', {
      style: {
        background: hc ? '#000000' : 'rgba(15,23,42,0.7)', borderRadius: 12, padding: 16, marginBottom: 14,
        borderTop: '1px solid ' + (hc ? '#fbbf24' : 'rgba(167,139,250,0.30)'),
        borderRight: '1px solid ' + (hc ? '#fbbf24' : 'rgba(167,139,250,0.30)'),
        borderBottom: '1px solid ' + (hc ? '#fbbf24' : 'rgba(167,139,250,0.30)'),
        borderLeft: '4px solid ' + (hc ? '#ffff00' : '#a78bfa')
      }
    },
      // Header
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
        h('div', { 'aria-hidden': 'true', style: {
          width: 36, height: 36, borderRadius: '50%', background: hc ? '#000000' : 'rgba(167,139,250,0.18)',
          border: '1.5px solid ' + (hc ? '#ffff00' : '#a78bfa'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
        } }, '🌳'),
        h('div', { style: { flex: 1, minWidth: 200 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: hc ? '#ffff00' : '#c4b5fd' } }, t('stem.schoolbehaviortoolkit.decision_tree_h', 'Walk the ethics decision')),
          h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic' } }, t('stem.schoolbehaviortoolkit.decision_tree_sub', 'Branching crisis scenarios. Each choice cites Maine Ch. 33 or Colvin Cycle reasoning. There is sometimes more than one correct answer.'))
        ),
        sbtReadBtn(h, speakText, setupReadText, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_decision_scenario_aria', 'Read ethics decision scenario aloud'), hc)
      ),

      // Scenario picker
      h('div', { role: 'tablist', 'aria-label': __alloSBTT('stem.schoolbehaviortoolkit.a11y_scenario_picker', 'Scenario picker'), style: { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' } },
        scenarios.map(function(s, sIdx) {
          var active = s.id === scenarioId;
          var done = solvedIds.indexOf(s.id) !== -1;
          return h('button', {
            type: 'button',
            key: 's-' + s.id, role: 'tab', id: 'sbt-decision-tab-' + s.id,
            'aria-controls': 'sbt-decision-panel',
            'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onKeyDown: function(e) {
              if (e.ctrlKey || e.altKey || e.metaKey) return;
              var nextIdx = -1;
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (sIdx + 1) % scenarios.length;
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (sIdx + scenarios.length - 1) % scenarios.length;
              else if (e.key === 'Home') nextIdx = 0;
              else if (e.key === 'End') nextIdx = scenarios.length - 1;
              if (nextIdx < 0) return;
              e.preventDefault();
              if (scenarios[nextIdx]) pickScenario(scenarios[nextIdx].id);
              var tabEls = e.currentTarget.parentNode && e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
              if (tabEls && tabEls[nextIdx]) tabEls[nextIdx].focus();
            },
            onClick: function() { pickScenario(s.id); },
            style: {
              padding: '8px 12px', minHeight: 38, borderRadius: 8,
              background: active ? (hc ? '#00ff00' : s.color + '22') : (hc ? '#000000' : 'rgba(15,23,42,0.5)'),
              color: active ? (hc ? '#000000' : s.color) : (hc ? '#ffffff' : 'var(--allo-stem-text-soft, #94a3b8)'),
              border: '1.5px solid ' + (active ? (hc ? '#ffff00' : s.color) : (hc ? '#fbbf24' : 'rgba(100,116,139,0.30)')),
              fontSize: 11, fontWeight: active ? 800 : 600,
              cursor: 'pointer'
            }
          },
            h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, s.icon),
            s.title,
            done ? h('span', { 'aria-label': __alloSBTT('stem.schoolbehaviortoolkit.a11y_completed', 'completed'), style: { marginLeft: 6, color: active && hc ? '#000000' : (hc ? '#00ff00' : '#22c55e') } }, '✓') : null
          );
        })
      ),

      // Stem
      h('div', {
        role: 'tabpanel', id: 'sbt-decision-panel', 'aria-labelledby': 'sbt-decision-tab-' + scenario.id,
        style: {
          background: hc ? '#000000' : 'rgba(2,6,23,0.5)', borderRadius: 8, padding: '12px 14px', marginBottom: 12,
          border: hc ? '1px solid #fbbf24' : 'none',
          borderLeft: '3px solid ' + (hc ? '#ffff00' : scenario.color)
        }
      },
        h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } }, t('stem.schoolbehaviortoolkit.setup_label', 'Setup')),
        h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, scenario.stem)
      ),

      // Breadcrumb of history
      history.length > 0
        ? h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' } },
            h('span', { style: { fontSize: 10, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 } }, t('stem.schoolbehaviortoolkit.your_path_label', 'Your path:')),
            history.map(function(step, i) {
              var color = step.verdict === 'CORRECT' ? (hc ? '#00ff00' : '#22c55e') : step.verdict === 'WRONG' ? (hc ? '#ffff00' : '#ef4444') : '#fbbf24';
              return h('span', {
                key: 'crumb-' + i,
                style: {
                  padding: '2px 7px', borderRadius: 999,
                  background: hc ? '#000000' : color + '18', color: color,
                  border: '1px solid ' + color,
                  fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', fontWeight: 800,
                  letterSpacing: '0.04em'
                }
              }, 'P' + (i + 1) + ' ' + step.verdict);
            })
          )
        : null,

      // Last-choice feedback
      lastChoiceObj
        ? h('div', {
            role: 'status',
            style: {
              padding: '12px 14px', borderRadius: 8, marginBottom: 12,
              background: hc ? '#000000' : lastChoiceObj.verdictColor + '12',
              border: '1px solid ' + (hc ? '#fbbf24' : lastChoiceObj.verdictColor + '40'),
              borderLeft: '4px solid ' + (hc ? '#ffff00' : lastChoiceObj.verdictColor)
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
              h('div', { style: {
                fontSize: 10.5, fontWeight: 800,
                color: hc ? '#ffff00' : lastChoiceObj.verdictColor, letterSpacing: '0.06em'
              } }, (lastChoiceObj.verdict === 'CORRECT' ? '✓ ' : lastChoiceObj.verdict === 'WRONG' ? '✗ ' : '⚠ ') + lastChoiceObj.verdict),
              sbtReadBtn(h, speakText, feedbackReadText, t('stem.schoolbehaviortoolkit.read_feedback', 'Read feedback'), t('stem.schoolbehaviortoolkit.read_decision_feedback_aria', 'Read decision verdict aloud'), hc)
            ),
            h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, marginBottom: 6, fontStyle: 'italic' } },
              '"' + lastChoiceObj.label + '"'),
            h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6, marginBottom: 6 } }, lastChoiceObj.why),
            h('div', { style: {
              fontSize: 10.5, color: hc ? '#00ff00' : lastChoiceObj.verdictColor, fontWeight: 700,
              paddingTop: 6, borderTop: '1px dashed ' + (hc ? '#fbbf24' : lastChoiceObj.verdictColor + '40')
            } }, '📖 ' + lastChoiceObj.cite)
          )
        : null,

      // Current node — terminal or active prompt
      node.terminal
        ? h('div', {
            style: {
              padding: '14px 16px', borderRadius: 10,
              background: hc ? '#000000' : 'linear-gradient(135deg, rgba(20,184,166,0.18), rgba(15,23,42,0.7))',
              borderTop: '1px solid ' + (hc ? '#00ff00' : '#14b8a6'),
              borderRight: '1px solid ' + (hc ? '#00ff00' : '#14b8a6'),
              borderBottom: '1px solid ' + (hc ? '#00ff00' : '#14b8a6'),
              borderLeft: '4px solid ' + (hc ? '#00ff00' : '#14b8a6')
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' } },
              h('div', { style: { fontSize: 13, fontWeight: 900, color: hc ? '#00ff00' : '#5eead4' } }, '🎓 ' + node.prompt),
              sbtReadBtn(h, speakText, node.prompt + ' ' + node.summary, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_decision_summary_aria', 'Read post-incident summary aloud'), hc)
            ),
            h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, marginBottom: 12 } }, node.summary),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
              h('button', {
                type: 'button',
                onClick: restart,
                style: {
                  padding: '8px 14px', minHeight: 38, borderRadius: 8,
                  background: hc ? '#000000' : 'rgba(20,184,166,0.18)', color: hc ? '#ffff00' : '#5eead4',
                  border: '1.5px solid ' + (hc ? '#ffff00' : '#14b8a6'),
                  fontSize: 11, fontWeight: 800, cursor: 'pointer'
                }
              }, t('stem.schoolbehaviortoolkit.restart_scenario', '↺ Restart this scenario')),
              scenarios.length > 1
                ? h('button', {
                    type: 'button',
                    onClick: function() {
                      var nextS = scenarios.filter(function(s) { return s.id !== scenarioId; })[0];
                      if (nextS) pickScenario(nextS.id);
                    },
                    style: {
                      padding: '8px 14px', minHeight: 38, borderRadius: 8,
                      background: hc ? '#00ff00' : '#14b8a6', color: '#000000',
                      border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer'
                    }
                  }, t('stem.schoolbehaviortoolkit.try_other_scenario', '→ Try other scenario'))
                : null
            )
          )
        : h('div', null,
            h('div', { style: { fontSize: 12, fontWeight: 800, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 10 } }, '❓ ' + node.prompt),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              node.choices.map(function(ch, i) {
                return h('button', {
                  type: 'button',
                  key: 'ch-' + nodeId + '-' + i,
                  onClick: function() { choose(i); },
                  style: {
                    textAlign: 'left',
                    padding: '12px 14px', minHeight: 44, borderRadius: 8,
                    background: hc ? '#000000' : 'rgba(15,23,42,0.6)',
                    color: hc ? '#ffffff' : 'var(--allo-stem-text, #e2e8f0)',
                    border: '1px solid ' + (hc ? '#fbbf24' : 'rgba(167,139,250,0.30)'),
                    fontSize: 12, fontWeight: 600, lineHeight: 1.5,
                    cursor: 'pointer',
                    transition: rm ? 'none' : 'all 160ms ease'
                  },
                  onMouseEnter: function(e) { if (!hc) { e.currentTarget.style.background = 'rgba(167,139,250,0.12)'; e.currentTarget.style.borderColor = '#a78bfa'; } },
                  onMouseLeave: function(e) { if (!hc) { e.currentTarget.style.background = 'rgba(15,23,42,0.6)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.30)'; } }
                },
                  h('span', { style: { color: hc ? '#ffff00' : '#a78bfa', fontWeight: 800, marginRight: 8, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 } }, String.fromCharCode(65 + i) + '.'),
                  ch.label
                );
              })
            )
          )
    );
  }

  // ─────────────────────────────────────────────────────────
  // PbisTriageWidget — PBIS Tier-Triage Challenge (renderPbis)
  // 6 school-wide / student-support cases sorted into Tier 1 /
  // Tier 2 CICO / Tier 3 FBA+BIP before reveal, with seeded
  // tier shuffling, per-distractor whyNot, Retry Missed, TTS,
  // and persisted XP dedup (pbisSolvedIds).
  // ─────────────────────────────────────────────────────────
  function PbisTriageWidget(props) {
    var CompR = (props && props.React && typeof props.React.useState === 'function') ? props.React : R;
    if (!CompR || typeof CompR.useState !== 'function') return null;
    var h = CompR.createElement;
    var t = props.t || function(k, fb) { return fb != null ? fb : k; };
    var cases = Array.isArray(props.cases) && props.cases.length ? props.cases : PBIS_TRIAGE_CASES;
    var solvedIds = Array.isArray(props.solvedIds) ? props.solvedIds : [];
    var onSolveCase = props.onSolveCase;
    var speakText = props.speakText;
    var hc = !!(props.isContrast) || _sbtIsHC();
    var rm = !!props.reduceMotion;

    var qs = CompR.useState(cases.map(function(_, i) { return i; })); var queue = qs[0]; var setQueue = qs[1];
    var ps = CompR.useState(0);    var pos = ps[0];         var setPos = ps[1];
    var ss = CompR.useState(0);    var score = ss[0];       var setScore = ss[1];
    var as = CompR.useState(0);    var attempts = as[0];    var setAttempts = as[1];
    var pk = CompR.useState(null); var pick = pk[0];        var setPick = pk[1];
    var ms = CompR.useState([]);   var missedInRun = ms[0]; var setMissedInRun = ms[1];
    var rs = CompR.useState(1);    var runSeed = rs[0];     var setRunSeed = rs[1];

    var done = pos >= queue.length;
    var caseIdx = !done ? queue[pos] : 0;
    var cur = cases[caseIdx % cases.length];
    var shuffledTiers = getPbisShuffledTiers(cur.id, runSeed);
    var evalRes = pick !== null ? evaluatePbisTriage(cur.id, pick) : null;

    function chooseTier(tierNum) {
      if (pick !== null || done) return;
      setPick(tierNum);
      setAttempts(function(n) { return n + 1; });
      var res = evaluatePbisTriage(cur.id, tierNum);
      if (res.correct) {
        setScore(function(n) { return n + 1; });
        if (typeof onSolveCase === 'function') onSolveCase(cur.id);
      } else {
        setMissedInRun(function(prev) {
          return prev.indexOf(caseIdx) === -1 ? prev.concat([caseIdx]) : prev;
        });
      }
    }

    function nextCase() {
      setPos(function(p) { return p + 1; });
      setPick(null);
    }

    function resetAll() {
      setQueue(cases.map(function(_, i) { return i; }));
      setPos(0); setPick(null); setScore(0); setAttempts(0); setMissedInRun([]);
      setRunSeed(function(n) { return n + 1; });
    }

    function retryMissed() {
      if (!missedInRun.length) { resetAll(); return; }
      setQueue(missedInRun.slice());
      setPos(0); setPick(null); setScore(0); setAttempts(0); setMissedInRun([]);
      setRunSeed(function(n) { return n + 1; });
    }

    if (done) {
      var pct = attempts > 0 ? Math.round((score / attempts) * 100) : 0;
      return h('div', {
        style: {
          background: hc ? '#000000' : 'rgba(15,23,42,0.74)', borderRadius: 12, padding: 16, marginBottom: 14,
          border: hc ? '2px solid #fbbf24' : '1px solid rgba(34,197,94,0.34)',
          borderLeft: '4px solid ' + (hc ? '#00ff00' : '#22c55e')
        }
      },
        h('div', { style: { textAlign: 'center', padding: 10 } },
          h('div', { 'aria-hidden': 'true', style: { fontSize: 26, marginBottom: 6 } }, '🏫'),
          h('div', { style: { fontSize: 14, fontWeight: 900, color: hc ? '#ffff00' : '#4ade80', marginBottom: 4 } },
            t('stem.schoolbehaviortoolkit.pbis_triage_done_h', 'PBIS Tier-Triage round complete')),
          h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginBottom: 12 } },
            t('stem.schoolbehaviortoolkit.score_prefix', 'Score: ') + score + ' / ' + attempts + ' (' + pct + '%) · ' + t('stem.schoolbehaviortoolkit.mastered_prefix', 'Mastered: ') + solvedIds.length + ' / ' + cases.length),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' } },
            missedInRun.length > 0 && h('button', {
              type: 'button',
              onClick: retryMissed,
              style: { padding: '9px 16px', minHeight: 40, borderRadius: 8, background: hc ? '#ffff00' : '#f59e0b', color: '#000000', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
            }, t('stem.schoolbehaviortoolkit.retry_missed_prefix', '↺ Retry missed (') + missedInRun.length + ')'),
            h('button', {
              type: 'button',
              onClick: resetAll,
              style: { padding: '9px 16px', minHeight: 40, borderRadius: 8, background: hc ? '#00ff00' : '#22c55e', color: '#000000', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
            }, t('stem.schoolbehaviortoolkit.pbis_triage_restart', '↺ Triage all 6 cases again'))
          )
        )
      );
    }

    var caseSpeech = cur.title + '. ' + cur.caseText;
    var feedbackSpeech = evalRes
      ? ((evalRes.correct ? 'Correct, Tier ' + evalRes.correctTier + '. ' : 'Actually Tier ' + evalRes.correctTier + '. ' + (evalRes.whyNotPicked ? 'Why not Tier ' + evalRes.pickedTier + ': ' + evalRes.whyNotPicked + ' ' : '')) + evalRes.why + ' Next step: ' + evalRes.nextStepAction)
      : '';

    return h('div', {
      style: {
        background: hc ? '#000000' : 'rgba(15,23,42,0.74)', borderRadius: 12, padding: 16, marginBottom: 14,
        borderTop: '1px solid ' + (hc ? '#fbbf24' : 'rgba(34,197,94,0.32)'),
        borderRight: '1px solid ' + (hc ? '#fbbf24' : 'rgba(34,197,94,0.32)'),
        borderBottom: '1px solid ' + (hc ? '#fbbf24' : 'rgba(34,197,94,0.32)'),
        borderLeft: '4px solid ' + (hc ? '#00ff00' : '#22c55e')
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
        h('div', { 'aria-hidden': 'true', style: {
          width: 36, height: 36, borderRadius: '50%', background: hc ? '#000000' : 'rgba(34,197,94,0.18)',
          border: '1.5px solid ' + (hc ? '#00ff00' : '#22c55e'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
        } }, '🧭'),
        h('div', { style: { flex: 1, minWidth: 200 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: hc ? '#ffff00' : '#4ade80' } }, t('stem.schoolbehaviortoolkit.pbis_triage_h', 'PBIS Tier-Triage Challenge')),
          h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic' } }, t('stem.schoolbehaviortoolkit.pbis_triage_sub', 'Decide whether the school data calls for Tier 1 (Universal), Tier 2 (Targeted CICO), or Tier 3 (Intensive FBA + BIP) before revealing the team rationale.'))
        ),
        h('div', { style: {
          padding: '5px 11px', borderRadius: 999,
          background: hc ? '#000000' : 'rgba(34,197,94,0.14)', border: '1px solid ' + (hc ? '#00ff00' : 'rgba(34,197,94,0.40)'),
          color: hc ? '#00ff00' : '#86efac', fontSize: 11, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace'
        } }, t('stem.schoolbehaviortoolkit.mastered_prefix', 'Mastered: ') + solvedIds.length + '/' + cases.length + ' · ' + (pos + 1) + '/' + queue.length)
      ),

      // Case card
      h('div', {
        style: {
          background: hc ? '#000000' : 'rgba(2,6,23,0.58)', borderRadius: 8, padding: '12px 14px', marginBottom: 12,
          border: hc ? '1px solid #fbbf24' : '1px solid rgba(148,163,184,0.18)',
          borderLeft: '3px solid ' + (hc ? '#ffff00' : '#4ade80')
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 } },
          h('div', { style: { fontSize: 12.5, fontWeight: 800, color: hc ? '#ffff00' : '#e2e8f0' } }, cur.title),
          sbtReadBtn(h, speakText, caseSpeech, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_pbis_case_aria', 'Read PBIS triage case aloud'), hc)
        ),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 } },
          (cur.dataSignals || []).map(function(sig, si) {
            return h('span', {
              key: 'sig-' + cur.id + '-' + si,
              style: {
                padding: '3px 8px', borderRadius: 999,
                background: hc ? '#000000' : 'rgba(20,184,166,0.14)',
                border: '1px solid ' + (hc ? '#fbbf24' : 'rgba(45,212,191,0.35)'),
                color: hc ? '#fbbf24' : '#99f6e4',
                fontSize: 10.5, fontWeight: 700
              }
            }, sig);
          })
        ),
        h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, cur.caseText)
      ),

      // Shuffled Tier buttons
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 8, marginBottom: 10 } },
        shuffledTiers.map(function(opt) {
          var isPick = pick === opt.tier;
          var isAns = cur.correctTier === opt.tier;
          var locked = pick !== null;
          var bg = hc ? '#000000' : opt.color + '14';
          var bd = hc ? '#fbbf24' : opt.color + '66';
          var col = hc ? '#ffffff' : opt.color;
          if (locked && isAns) { bg = hc ? '#000000' : 'rgba(34,197,94,0.20)'; bd = hc ? '#00ff00' : '#22c55e'; col = hc ? '#00ff00' : '#4ade80'; }
          else if (locked && isPick && !isAns) { bg = hc ? '#000000' : 'rgba(239,68,68,0.20)'; bd = hc ? '#ffff00' : '#ef4444'; col = hc ? '#ffff00' : '#fca5a5'; }
          else if (locked) { bg = hc ? '#000000' : 'rgba(15,23,42,0.5)'; bd = hc ? '#fbbf24' : 'rgba(100,116,139,0.28)'; col = hc ? '#ffffff' : '#94a3b8'; }

          return h('button', {
            key: 'pbis-opt-' + cur.id + '-' + opt.tier,
            type: 'button',
            disabled: locked,
            onClick: function() { chooseTier(opt.tier); },
            'aria-label': t('stem.schoolbehaviortoolkit.select_pbis_tier_aria', 'Assign case to ') + opt.label,
            style: {
              textAlign: 'left', padding: '10px 12px', minHeight: 48, borderRadius: 10,
              background: bg, border: '1.5px solid ' + bd, color: col,
              cursor: locked ? 'default' : 'pointer',
              transition: rm ? 'none' : 'all 180ms ease'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800 } },
              h('span', { 'aria-hidden': 'true' }, opt.icon),
              h('span', null, opt.label)),
            h('div', { style: { fontSize: 10.5, color: hc ? '#ffffff' : 'var(--allo-stem-text-soft, #cbd5e1)', marginTop: 3, lineHeight: 1.35 } }, opt.sub)
          );
        })
      ),

      evalRes
        ? h('div', {
            role: 'status',
            style: {
              padding: '12px 14px', borderRadius: 8,
              background: hc ? '#000000' : (evalRes.correct ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)'),
              border: '1px solid ' + (hc ? (evalRes.correct ? '#00ff00' : '#ffff00') : (evalRes.correct ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'))
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: evalRes.correct ? (hc ? '#00ff00' : '#4ade80') : (hc ? '#ffff00' : '#fca5a5'), textTransform: 'uppercase', letterSpacing: '0.06em' } },
                evalRes.correct
                  ? t('stem.schoolbehaviortoolkit.pbis_correct_prefix', '✓ Matched — Tier ') + evalRes.correctTier
                  : t('stem.schoolbehaviortoolkit.pbis_wrong_prefix', '✗ Best fit is Tier ') + evalRes.correctTier + t('stem.schoolbehaviortoolkit.pbis_wrong_suffix', ' (not Tier ') + evalRes.pickedTier + ')'),
              sbtReadBtn(h, speakText, feedbackSpeech, t('stem.schoolbehaviortoolkit.read_feedback', 'Read feedback'), t('stem.schoolbehaviortoolkit.read_pbis_feedback_aria', 'Read PBIS triage rationale aloud'), hc)
            ),
            !evalRes.correct && evalRes.whyNotPicked && h('div', {
              style: { padding: '8px 10px', borderRadius: 6, marginBottom: 8, background: hc ? '#000000' : 'rgba(251,191,36,0.10)', borderLeft: '3px solid ' + (hc ? '#ffff00' : '#fbbf24'), fontSize: 11, color: hc ? '#ffff00' : '#fde68a', lineHeight: 1.55 }
            },
              h('strong', null, t('stem.schoolbehaviortoolkit.why_not_tier_prefix', 'Why not Tier ') + evalRes.pickedTier + ': '),
              evalRes.whyNotPicked),
            h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, marginBottom: 6 } }, evalRes.why),
            h('div', { style: { fontSize: 11, color: hc ? '#00ff00' : '#99f6e4', lineHeight: 1.5, marginBottom: 10 } },
              h('strong', null, t('stem.schoolbehaviortoolkit.pbis_next_step_label', 'Recommended team move: ')),
              evalRes.nextStepAction),
            h('div', { style: { textAlign: 'right' } },
              h('button', {
                type: 'button',
                onClick: nextCase,
                style: { padding: '8px 16px', minHeight: 38, borderRadius: 8, background: hc ? '#00ff00' : '#22c55e', color: '#000000', border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer' }
              }, pos + 1 >= queue.length
                ? t('stem.schoolbehaviortoolkit.pbis_finish_btn', 'See triage summary →')
                : t('stem.schoolbehaviortoolkit.pbis_next_btn', 'Next triage case →'))
            )
          )
        : h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', textAlign: 'center', fontStyle: 'italic' } },
            t('stem.schoolbehaviortoolkit.pbis_pick_hint', 'Choose Tier 1, Tier 2, or Tier 3 to unlock the data decision rule.'))
    );
  }

  // ─────────────────────────────────────────────────────────
  // AbcFunctionCoder — ABC-Data Function Coder (renderFba)
  // 6 realistic 3-row classroom ABC observation logs. Learners
  // hypothesize BOTH maintaining function AND setting event
  // before revealing the one-sentence FBA hypothesis statement.
  // ─────────────────────────────────────────────────────────
  function AbcFunctionCoder(props) {
    var CompR = (props && props.React && typeof props.React.useState === 'function') ? props.React : R;
    if (!CompR || typeof CompR.useState !== 'function') return null;
    var h = CompR.createElement;
    var t = props.t || function(k, fb) { return fb != null ? fb : k; };
    var cases = Array.isArray(props.cases) && props.cases.length ? props.cases : ABC_CODING_CASES;
    var solvedIds = Array.isArray(props.solvedIds) ? props.solvedIds : [];
    var onSolveCase = props.onSolveCase;
    var speakText = props.speakText;
    var hc = !!(props.isContrast) || _sbtIsHC();
    var rm = !!props.reduceMotion;

    var qs = CompR.useState(cases.map(function(_, i) { return i; })); var queue = qs[0]; var setQueue = qs[1];
    var ps = CompR.useState(0);    var pos = ps[0];         var setPos = ps[1];
    var fp = CompR.useState(null); var fnPick = fp[0];      var setFnPick = fp[1];
    var sp = CompR.useState(null); var sePick = sp[0];      var setSePick = sp[1];
    var rv = CompR.useState(false);var revealed = rv[0];    var setRevealed = rv[1];
    var scs = CompR.useState(0);   var fullHits = scs[0];   var setFullHits = scs[1];
    var ms = CompR.useState([]);   var missedInRun = ms[0]; var setMissedInRun = ms[1];
    var rs = CompR.useState(1);    var runSeed = rs[0];     var setRunSeed = rs[1];

    var done = pos >= queue.length;
    var caseIdx = !done ? queue[pos] : 0;
    var cur = cases[caseIdx % cases.length];
    var opts = getAbcShuffledOptions(cur, runSeed);
    var evalRes = revealed ? evaluateAbcCoding(cur.id, fnPick, sePick) : null;

    function submitHypothesis() {
      if (revealed || !fnPick || !sePick || done) return;
      var ev = evaluateAbcCoding(cur.id, fnPick, sePick);
      setRevealed(true);
      if (ev.bothCorrect) {
        setFullHits(function(n) { return n + 1; });
        if (typeof onSolveCase === 'function') onSolveCase(cur.id);
      } else {
        setMissedInRun(function(prev) {
          return prev.indexOf(caseIdx) === -1 ? prev.concat([caseIdx]) : prev;
        });
      }
    }

    function nextCase() {
      setPos(function(p) { return p + 1; });
      setFnPick(null);
      setSePick(null);
      setRevealed(false);
    }

    function resetAll() {
      setQueue(cases.map(function(_, i) { return i; }));
      setPos(0); setFnPick(null); setSePick(null); setRevealed(false); setFullHits(0); setMissedInRun([]);
      setRunSeed(function(n) { return n + 1; });
    }

    function retryMissed() {
      if (!missedInRun.length) { resetAll(); return; }
      setQueue(missedInRun.slice());
      setPos(0); setFnPick(null); setSePick(null); setRevealed(false); setFullHits(0); setMissedInRun([]);
      setRunSeed(function(n) { return n + 1; });
    }

    if (done) {
      return h('div', {
        style: {
          background: hc ? '#000000' : 'rgba(15,23,42,0.74)', borderRadius: 12, padding: 16, marginBottom: 14,
          border: hc ? '2px solid #fbbf24' : '1px solid rgba(167,139,250,0.34)',
          borderLeft: '4px solid ' + (hc ? '#ffff00' : '#a78bfa')
        }
      },
        h('div', { style: { textAlign: 'center', padding: 10 } },
          h('div', { 'aria-hidden': 'true', style: { fontSize: 26, marginBottom: 6 } }, '🔬'),
          h('div', { style: { fontSize: 14, fontWeight: 900, color: hc ? '#ffff00' : '#c4b5fd', marginBottom: 4 } },
            t('stem.schoolbehaviortoolkit.abc_done_h', 'ABC-Data Function Coder complete')),
          h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginBottom: 12 } },
            t('stem.schoolbehaviortoolkit.abc_full_matches', 'Full matches (Function + Setting Event): ') + fullHits + ' / ' + queue.length + ' · ' + t('stem.schoolbehaviortoolkit.mastered_prefix', 'Mastered: ') + solvedIds.length + ' / ' + cases.length),
          h('div', { style: { display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' } },
            missedInRun.length > 0 && h('button', {
              type: 'button',
              onClick: retryMissed,
              style: { padding: '9px 16px', minHeight: 40, borderRadius: 8, background: hc ? '#ffff00' : '#f59e0b', color: '#000000', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
            }, t('stem.schoolbehaviortoolkit.retry_missed_prefix', '↺ Retry missed (') + missedInRun.length + ')'),
            h('button', {
              type: 'button',
              onClick: resetAll,
              style: { padding: '9px 16px', minHeight: 40, borderRadius: 8, background: hc ? '#00ff00' : '#a78bfa', color: '#000000', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer' }
            }, t('stem.schoolbehaviortoolkit.abc_restart_btn', '↺ Code all 6 ABC logs again'))
          )
        )
      );
    }

    var logReadText = cur.title + '. ' + cur.studentContext + ' ' + (cur.logs || []).map(function(row, idx) {
      return 'Observation ' + (idx + 1) + ' at ' + row.time + '. Setting note: ' + row.settingEventNote + '. Antecedent: ' + row.antecedent + '. Behavior: ' + row.behavior + '. Consequence: ' + row.consequence + '.';
    }).join(' ');

    return h('div', {
      style: {
        background: hc ? '#000000' : 'rgba(15,23,42,0.74)', borderRadius: 12, padding: 16, marginBottom: 14,
        borderTop: '1px solid ' + (hc ? '#fbbf24' : 'rgba(167,139,250,0.34)'),
        borderRight: '1px solid ' + (hc ? '#fbbf24' : 'rgba(167,139,250,0.34)'),
        borderBottom: '1px solid ' + (hc ? '#fbbf24' : 'rgba(167,139,250,0.34)'),
        borderLeft: '4px solid ' + (hc ? '#ffff00' : '#a78bfa')
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
        h('div', { 'aria-hidden': 'true', style: {
          width: 36, height: 36, borderRadius: '50%', background: hc ? '#000000' : 'rgba(167,139,250,0.18)',
          border: '1.5px solid ' + (hc ? '#ffff00' : '#a78bfa'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
        } }, '📋'),
        h('div', { style: { flex: 1, minWidth: 200 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: hc ? '#ffff00' : '#c4b5fd' } }, t('stem.schoolbehaviortoolkit.abc_coder_h', 'ABC-Data Function Coder')),
          h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic' } }, t('stem.schoolbehaviortoolkit.abc_coder_sub', 'Inspect the 3-row ABC observation log, then lock in BOTH your function hypothesis and setting-event hypothesis before reveal.'))
        ),
        h('div', { style: {
          padding: '5px 11px', borderRadius: 999,
          background: hc ? '#000000' : 'rgba(167,139,250,0.14)', border: '1px solid ' + (hc ? '#ffff00' : 'rgba(167,139,250,0.40)'),
          color: hc ? '#ffff00' : '#ddd6fe', fontSize: 11, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace'
        } }, t('stem.schoolbehaviortoolkit.mastered_prefix', 'Mastered: ') + solvedIds.length + '/' + cases.length + ' · ' + (pos + 1) + '/' + queue.length)
      ),

      // Case title + Read Aloud
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
        h('div', null,
          h('div', { style: { fontSize: 12.5, fontWeight: 800, color: hc ? '#ffff00' : '#e2e8f0' } }, cur.title),
          h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, cur.studentContext)
        ),
        sbtReadBtn(h, speakText, logReadText, t('stem.schoolbehaviortoolkit.read_abc_log', 'Read ABC log'), t('stem.schoolbehaviortoolkit.read_abc_log_aria', 'Read classroom ABC observation log aloud'), hc)
      ),

      // Scroll-safe ABC observation table
      h('div', { style: { overflowX: 'auto', marginBottom: 12, borderRadius: 8, border: '1px solid ' + (hc ? '#fbbf24' : 'rgba(148,163,184,0.24)'), background: hc ? '#000000' : 'rgba(2,6,23,0.62)' } },
        h('table', { style: { width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)' } },
          h('thead', null,
            h('tr', { style: { background: hc ? '#000000' : 'rgba(30,41,59,0.85)', borderBottom: '1px solid ' + (hc ? '#ffff00' : 'rgba(148,163,184,0.28)') } },
              h('th', { scope: 'col', style: { textAlign: 'left', padding: '7px 8px', color: hc ? '#ffff00' : '#94a3b8', fontSize: 10, textTransform: 'uppercase' } }, t('stem.schoolbehaviortoolkit.abc_col_time', 'Time')),
              h('th', { scope: 'col', style: { textAlign: 'left', padding: '7px 8px', color: hc ? '#ffff00' : '#fbbf24', fontSize: 10, textTransform: 'uppercase' } }, t('stem.schoolbehaviortoolkit.abc_col_setting', 'Setting Note')),
              h('th', { scope: 'col', style: { textAlign: 'left', padding: '7px 8px', color: hc ? '#ffff00' : '#60a5fa', fontSize: 10, textTransform: 'uppercase' } }, t('stem.schoolbehaviortoolkit.abc_col_a', 'Antecedent (A)')),
              h('th', { scope: 'col', style: { textAlign: 'left', padding: '7px 8px', color: hc ? '#ffff00' : '#f87171', fontSize: 10, textTransform: 'uppercase' } }, t('stem.schoolbehaviortoolkit.abc_col_b', 'Behavior (B)')),
              h('th', { scope: 'col', style: { textAlign: 'left', padding: '7px 8px', color: hc ? '#ffff00' : '#4ade80', fontSize: 10, textTransform: 'uppercase' } }, t('stem.schoolbehaviortoolkit.abc_col_c', 'Consequence (C)'))
            )
          ),
          h('tbody', null,
            (cur.logs || []).map(function(row, ri) {
              return h('tr', { key: cur.id + '-row-' + ri, style: { borderBottom: ri < cur.logs.length - 1 ? '1px solid ' + (hc ? '#fbbf24' : 'rgba(148,163,184,0.16)') : 'none' } },
                h('td', { style: { padding: '7px 8px', verticalAlign: 'top', fontFamily: 'ui-monospace, Menlo, monospace', whiteSpace: 'nowrap', color: hc ? '#fbbf24' : '#cbd5e1' } }, row.time),
                h('td', { style: { padding: '7px 8px', verticalAlign: 'top', lineHeight: 1.45 } }, row.settingEventNote),
                h('td', { style: { padding: '7px 8px', verticalAlign: 'top', lineHeight: 1.45 } }, row.antecedent),
                h('td', { style: { padding: '7px 8px', verticalAlign: 'top', lineHeight: 1.45, fontWeight: 700 } }, row.behavior),
                h('td', { style: { padding: '7px 8px', verticalAlign: 'top', lineHeight: 1.45 } }, row.consequence)
              );
            })
          )
        )
      ),

      // Step 1: Pick maintaining function
      h('div', { style: { marginBottom: 10 } },
        h('div', { style: { fontSize: 11, fontWeight: 800, color: hc ? '#ffff00' : '#5eead4', marginBottom: 6 } },
          t('stem.schoolbehaviortoolkit.abc_step1_fn', '1. Hypothesize the maintaining function:')),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 } },
          opts.functions.map(function(fn) {
            var selected = fnPick === fn.code;
            var isRight = revealed && cur.correctFunction === fn.code;
            var isWrong = revealed && selected && !isRight;
            var bg = hc ? '#000000' : (selected ? fn.color + '24' : 'rgba(15,23,42,0.62)');
            var bd = hc ? (selected ? '#00ff00' : '#fbbf24') : (selected ? fn.color : 'rgba(100,116,139,0.34)');
            var col = hc ? (selected ? '#00ff00' : '#ffffff') : (selected ? fn.color : '#e2e8f0');
            if (isRight) { bg = hc ? '#000000' : 'rgba(34,197,94,0.18)'; bd = hc ? '#00ff00' : '#22c55e'; col = hc ? '#00ff00' : '#4ade80'; }
            else if (isWrong) { bg = hc ? '#000000' : 'rgba(239,68,68,0.18)'; bd = hc ? '#ffff00' : '#ef4444'; col = hc ? '#ffff00' : '#fca5a5'; }
            return h('button', {
              key: 'abc-fn-' + cur.id + '-' + fn.code,
              type: 'button',
              disabled: revealed,
              'aria-pressed': selected ? 'true' : 'false',
              onClick: function() { if (!revealed) setFnPick(fn.code); },
              style: {
                padding: '9px 10px', minHeight: 42, borderRadius: 8,
                background: bg, border: '1.5px solid ' + bd, color: col,
                fontSize: 11.5, fontWeight: 800, cursor: revealed ? 'default' : 'pointer',
                transition: rm ? 'none' : 'all 140ms ease'
              }
            },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, fn.icon),
              fn.label + ' (' + fn.code + ')'
            );
          })
        )
      ),

      // Step 2: Pick setting event
      h('div', { style: { marginBottom: 12 } },
        h('div', { style: { fontSize: 11, fontWeight: 800, color: hc ? '#ffff00' : '#fbbf24', marginBottom: 6 } },
          t('stem.schoolbehaviortoolkit.abc_step2_se', '2. Identify the contributing setting event (slow trigger):')),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 } },
          opts.settingEvents.map(function(se) {
            var selected = sePick === se.id;
            var isRight = revealed && cur.correctSettingEventId === se.id;
            var isWrong = revealed && selected && !isRight;
            var bg = hc ? '#000000' : (selected ? 'rgba(251,191,36,0.18)' : 'rgba(15,23,42,0.62)');
            var bd = hc ? (selected ? '#00ff00' : '#fbbf24') : (selected ? '#fbbf24' : 'rgba(100,116,139,0.34)');
            var col = hc ? (selected ? '#00ff00' : '#ffffff') : '#e2e8f0';
            if (isRight) { bg = hc ? '#000000' : 'rgba(34,197,94,0.18)'; bd = hc ? '#00ff00' : '#22c55e'; col = hc ? '#00ff00' : '#86efac'; }
            else if (isWrong) { bg = hc ? '#000000' : 'rgba(239,68,68,0.18)'; bd = hc ? '#ffff00' : '#ef4444'; col = hc ? '#ffff00' : '#fca5a5'; }
            return h('button', {
              key: 'abc-se-' + cur.id + '-' + se.id,
              type: 'button',
              disabled: revealed,
              'aria-pressed': selected ? 'true' : 'false',
              onClick: function() { if (!revealed) setSePick(se.id); },
              style: {
                textAlign: 'left', padding: '9px 11px', minHeight: 42, borderRadius: 8,
                background: bg, border: '1.5px solid ' + bd, color: col,
                fontSize: 11, fontWeight: selected ? 800 : 600, lineHeight: 1.4,
                cursor: revealed ? 'default' : 'pointer',
                transition: rm ? 'none' : 'all 140ms ease'
              }
            }, se.label);
          })
        )
      ),

      !revealed
        ? h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h('span', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } },
              (!fnPick || !sePick)
                ? t('stem.schoolbehaviortoolkit.abc_select_both', 'Select BOTH a function and a setting event to unlock the FBA synthesis.')
                : t('stem.schoolbehaviortoolkit.abc_ready_check', 'Hypothesis locked — click Check FBA Hypothesis to compare against the observation data.')),
            h('button', {
              type: 'button',
              disabled: !fnPick || !sePick,
              onClick: submitHypothesis,
              style: {
                padding: '9px 18px', minHeight: 40, borderRadius: 8,
                background: (fnPick && sePick) ? (hc ? '#00ff00' : '#a78bfa') : (hc ? '#000000' : 'rgba(100,116,139,0.28)'),
                color: (fnPick && sePick) ? '#000000' : (hc ? '#fbbf24' : '#94a3b8'),
                border: hc ? '1.5px solid #ffff00' : 'none',
                fontSize: 12, fontWeight: 800,
                cursor: (fnPick && sePick) ? 'pointer' : 'not-allowed'
              }
            }, t('stem.schoolbehaviortoolkit.abc_check_btn', '🔬 Check FBA Hypothesis'))
          )
        : evalRes && h('div', {
            role: 'status',
            style: {
              padding: '12px 14px', borderRadius: 8,
              background: hc ? '#000000' : (evalRes.bothCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(251,191,36,0.08)'),
              border: '1px solid ' + (hc ? (evalRes.bothCorrect ? '#00ff00' : '#ffff00') : (evalRes.bothCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(251,191,36,0.35)'))
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('span', { style: { padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, background: hc ? '#000000' : (evalRes.functionCorrect ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'), border: '1px solid ' + (evalRes.functionCorrect ? (hc ? '#00ff00' : '#22c55e') : (hc ? '#ffff00' : '#ef4444')), color: evalRes.functionCorrect ? (hc ? '#00ff00' : '#4ade80') : (hc ? '#ffff00' : '#fca5a5') } },
                  (evalRes.functionCorrect ? '✓ ' : '✗ ') + t('stem.schoolbehaviortoolkit.abc_fn_badge', 'Function: ') + evalRes.correctFunction),
                h('span', { style: { padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, background: hc ? '#000000' : (evalRes.settingEventCorrect ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'), border: '1px solid ' + (evalRes.settingEventCorrect ? (hc ? '#00ff00' : '#22c55e') : (hc ? '#ffff00' : '#ef4444')), color: evalRes.settingEventCorrect ? (hc ? '#00ff00' : '#4ade80') : (hc ? '#ffff00' : '#fca5a5') } },
                  (evalRes.settingEventCorrect ? '✓ ' : '✗ ') + t('stem.schoolbehaviortoolkit.abc_se_badge', 'Setting Event'))
              ),
              sbtReadBtn(h, speakText, 'Model FBA function statement: ' + evalRes.functionStatement + ' ' + evalRes.whyFunction, t('stem.schoolbehaviortoolkit.read_statement', 'Read statement'), t('stem.schoolbehaviortoolkit.read_abc_statement_aria', 'Read FBA function statement aloud'), hc)
            ),
            !evalRes.functionCorrect && evalRes.whyNotFunction && h('div', { style: { padding: '7px 10px', borderRadius: 6, marginBottom: 6, background: hc ? '#000000' : 'rgba(239,68,68,0.10)', borderLeft: '3px solid ' + (hc ? '#ffff00' : '#f87171'), fontSize: 11, color: hc ? '#ffff00' : '#fecaca', lineHeight: 1.5 } },
              h('strong', null, t('stem.schoolbehaviortoolkit.why_not_prefix', 'Why not ') + fnPick + ': '), evalRes.whyNotFunction),
            h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, marginBottom: 6 } },
              h('strong', null, t('stem.schoolbehaviortoolkit.abc_fn_evidence', 'Function evidence: ')), evalRes.whyFunction),
            !evalRes.settingEventCorrect && evalRes.whyNotSettingEvent && h('div', { style: { padding: '7px 10px', borderRadius: 6, marginBottom: 6, background: hc ? '#000000' : 'rgba(251,191,36,0.10)', borderLeft: '3px solid ' + (hc ? '#ffff00' : '#fbbf24'), fontSize: 11, color: hc ? '#ffff00' : '#fde68a', lineHeight: 1.5 } },
              h('strong', null, t('stem.schoolbehaviortoolkit.abc_why_not_se', 'Why not that setting event: ')), evalRes.whyNotSettingEvent),
            h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } },
              h('strong', null, t('stem.schoolbehaviortoolkit.abc_se_evidence', 'Setting-event link: ')), evalRes.whySettingEvent),
            h('div', { style: { padding: '9px 11px', borderRadius: 7, background: hc ? '#000000' : 'rgba(251,191,36,0.12)', border: '1px solid ' + (hc ? '#ffff00' : 'rgba(251,191,36,0.42)'), fontSize: 11.5, color: hc ? '#ffffff' : '#fef3c7', lineHeight: 1.55, marginBottom: 10 } },
              h('div', { style: { fontSize: 10, fontWeight: 800, color: hc ? '#ffff00' : '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } },
                t('stem.schoolbehaviortoolkit.abc_model_stmt_h', '🎯 One-Sentence FBA Function Statement')),
              evalRes.functionStatement),
            h('div', { style: { textAlign: 'right' } },
              h('button', {
                type: 'button',
                onClick: nextCase,
                style: { padding: '8px 16px', minHeight: 38, borderRadius: 8, background: hc ? '#00ff00' : '#a78bfa', color: '#000000', border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer' }
              }, pos + 1 >= queue.length
                ? t('stem.schoolbehaviortoolkit.abc_finish_btn', 'See coding summary →')
                : t('stem.schoolbehaviortoolkit.abc_next_btn', 'Next ABC log →'))
            )
          )
    );
  }

  function defaultState() {
    return {
      activeSection: 'pbis',
      lastUpdated: null,
      cycleCompleted: false,
      matcherSolvedIds: [],
      matcherBonusAwarded: false,
      decisionSolvedIds: [],
      abcSolvedIds: [],
      pbisSolvedIds: [],
      bipAudited: false
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }
  var __alloSBTCtx = null;
  // Module-scope translator: the render-scoped __alloT closes over ctx and is
  // not in scope in the helpers below, so those calls would throw.
  var __alloSBTT = function (k, fb) {
    var v;
    try { v = (__alloSBTCtx && typeof __alloSBTCtx.t === "function") ? __alloSBTCtx.t(k, fb) : null; } catch (e) { v = null; }
    return (v == null) ? (fb != null ? fb : k) : v;
  };


  // WCAG 1.4.3 high contrast (generated by gen_hc.cjs)
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-schoolbehaviortoolkit-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-schoolbehaviortoolkit-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"schoolBehaviorToolkit\"] [style]:is([style*=\"background: rgb(94, 234, 212)\"],[style*=\"background-color: rgb(94, 234, 212)\"],[style*=\"background: rgb(251, 191, 36)\"],[style*=\"background-color: rgb(251, 191, 36)\"],[style*=\"background: rgb(34, 197, 94)\"],[style*=\"background-color: rgb(34, 197, 94)\"],[style*=\"background: rgb(255, 255, 255)\"],[style*=\"background-color: rgb(255, 255, 255)\"]):not(:empty):not(svg,canvas,video,iframe,object){background-color:#000!important}.theme-contrast [data-stem-tool-shell=\"schoolBehaviorToolkit\"] [style]:is([style^=\"color: rgb(15, 23, 42)\"],[style*=\"; color: rgb(15, 23, 42)\"],[style^=\"color: rgb(0, 0, 0)\"],[style*=\"; color: rgb(0, 0, 0)\"]){color:#ffff00!important}.theme-contrast [data-stem-tool-shell=\"schoolBehaviorToolkit\"] [style]:not(#hc-k):not(#hc-k):not(#hc-k):is([style^=\"color: rgb(15, 23, 42)\"],[style*=\"; color: rgb(15, 23, 42)\"],[style^=\"color: rgb(0, 0, 0)\"],[style*=\"; color: rgb(0, 0, 0)\"]):is([style*=\"background: rgb\"],[style*=\"background-color: rgb\"],[style*=\"background: linear\"]):not([style*=\"background: rgba(\"],[style*=\"background-color: rgba(\"]):not(:is([style*=\"background: rgb(94, 234, 212)\"],[style*=\"background-color: rgb(94, 234, 212)\"],[style*=\"background: rgb(251, 191, 36)\"],[style*=\"background-color: rgb(251, 191, 36)\"],[style*=\"background: rgb(34, 197, 94)\"],[style*=\"background-color: rgb(34, 197, 94)\"],[style*=\"background: rgb(255, 255, 255)\"],[style*=\"background-color: rgb(255, 255, 255)\"])):not(button:not(:hover)){color:#000!important}.theme-contrast [data-stem-tool-shell=\"schoolBehaviorToolkit\"] [style]:not(#hc-k):not(#hc-k):not(#hc-k):is([style*=\"background: rgb(20, 184, 166)\"],[style*=\"background-color: rgb(20, 184, 166)\"],[style*=\"background: rgb(148, 163, 184)\"],[style*=\"background-color: rgb(148, 163, 184)\"],[style*=\"background: rgb(239, 68, 68)\"],[style*=\"background-color: rgb(239, 68, 68)\"]):not(:empty):not(button:not(:hover)){color:#000!important}.theme-contrast [data-stem-tool-shell=\"schoolBehaviorToolkit\"] a:not([style*=\"background\"]):not([class*=\"bg-\"]:not([class*=\"-50\"],[class*=\"-100\"],[class*=\"bg-white\"])){color:#ffff00!important}";
    document.head.appendChild(st);
  })();
  // end WCAG 1.4.3 high contrast
  // Bespoke clinical studio workbench styles + High-Contrast parity
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-schoolbehaviortoolkit-studio-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-schoolbehaviortoolkit-studio-css';
    st.textContent = [
      '.sbt-workbench { box-sizing: border-box; border: 1px solid rgba(45,212,191,0.24); overflow-x: clip; }',
      '.sbt-workbench * { box-sizing: border-box; }',
      '.sbt-workbench button:focus-visible, .sbt-workbench [tabindex]:focus-visible, .sbt-workbench input:focus-visible, .sbt-workbench textarea:focus-visible { outline: 2px solid #5eead4; outline-offset: 2px; }',
      '.sbt-hero { background: linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(17,44,44,0.88) 55%, rgba(15,23,42,0.94) 100%); border-bottom: 1px solid rgba(45,212,191,0.22); border-radius: 16px 16px 0 0; }',
      '.sbt-telemetry-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: rgba(15,23,42,0.72); border: 1px solid rgba(45,212,191,0.34); color: #e2e8f0; font-size: 11px; font-weight: 700; line-height: 1.2; white-space: nowrap; }',
      '.sbt-preset-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 13px; border-radius: 10px; background: rgba(15,23,42,0.72); border: 1px solid rgba(45,212,191,0.30); color: #cbd5e1; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 140ms ease, border-color 140ms ease, color 140ms ease; }',
      '.sbt-preset-chip:hover:not(:disabled) { background: rgba(20,184,166,0.18); border-color: #2dd4bf; color: #f0fdfa; }',
      '.sbt-preset-chip[data-active="true"] { background: rgba(20,184,166,0.22); border-color: #5eead4; color: #5eead4; box-shadow: 0 2px 10px rgba(20,184,166,0.20); }',
      '.sbt-preset-chip:disabled { opacity: 0.45; cursor: not-allowed; }',
      '@keyframes sbtCurveGlow { 0%, 100% { stroke-opacity: 0.14; } 50% { stroke-opacity: 0.34; } }',
      '@keyframes sbtGoalFlow { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }',
      '@keyframes sbtBeaconCalm { 0%, 100% { opacity: 0.22; transform: scale(0.93); } 50% { opacity: 0.50; transform: scale(1.16); } }',
      '@keyframes sbtBarSheen { 0%, 24% { transform: translateX(-60px); opacity: 0; } 50% { opacity: 0.36; } 76% { transform: translateX(130px); opacity: 0; } 100% { transform: translateX(130px); opacity: 0; } }',
      '@keyframes sbtOrbitCalm { from { stroke-dashoffset: 28; } to { stroke-dashoffset: 0; } }',
      '.sbt-workbench .sbt-curve-glow { animation: sbtCurveGlow 4.6s ease-in-out infinite; }',
      '.sbt-workbench .sbt-goal-flow { animation: sbtGoalFlow 3.6s linear infinite; }',
      '.sbt-workbench .sbt-goal-flow-slow { animation: sbtGoalFlow 6.4s linear infinite; }',
      '.sbt-workbench .sbt-beacon-calm { transform-box: fill-box; transform-origin: center; animation: sbtBeaconCalm 3.8s ease-in-out infinite; }',
      '.sbt-workbench .sbt-sheen-bar { animation: sbtBarSheen 6.2s ease-in-out infinite; }',
      '.sbt-workbench .sbt-orbit-calm { animation: sbtOrbitCalm 10s linear infinite; }',
      '@media (prefers-reduced-motion: reduce) { .sbt-workbench * { animation: none !important; transition: none !important; } .sbt-workbench .sbt-sheen-bar { display: none !important; } }',
      '.sbt-workbench[data-sbt-rm="1"] * { animation: none !important; transition: none !important; }',
      '.sbt-workbench[data-sbt-rm="1"] .sbt-sheen-bar { display: none !important; }',
      '.theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-workbench { background: #000000 !important; border: 2px solid #ffff00 !important; color: #ffff00 !important; box-shadow: none !important; --allo-stem-canvas: #000000; --allo-stem-text: #ffff00; --allo-stem-text-soft: #ffff00; --allo-stem-border: #ffff00; }',
      '.theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-hero { background: #000000 !important; border-bottom: 2px solid #ffff00 !important; }',
      '.theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-telemetry-pill { background: #000000 !important; border: 1.5px solid #ffff00 !important; color: #ffff00 !important; }',
      '.theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-preset-chip { background: #000000 !important; border: 1.5px solid #ffff00 !important; color: #ffff00 !important; }',
      '.theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-preset-chip[data-active="true"], .theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-preset-chip:hover:not(:disabled) { background: #00ff00 !important; border-color: #ffff00 !important; color: #000000 !important; }',
      '.theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-preset-chip[data-active="true"] *, .theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-preset-chip:hover:not(:disabled) * { color: #000000 !important; }',
      '.theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-workbench button:focus-visible, .theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-workbench [tabindex]:focus-visible { outline: 3px solid #ffff00 !important; outline-offset: 2px; }',
      '.theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-workbench *, .sbt-workbench[data-sbt-hc="1"] * { animation: none !important; transition: none !important; }',
      '.theme-contrast [data-stem-tool-shell="schoolBehaviorToolkit"] .sbt-svg-fx, .sbt-workbench[data-sbt-hc="1"] .sbt-svg-fx { display: none !important; }',
      '@media (forced-colors: active) { .sbt-workbench * { animation: none !important; transition: none !important; } .sbt-workbench .sbt-svg-fx { display: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();

  function _sbtIsHC() {
    try {
      if (typeof document === 'undefined') return false;
      var r = document.documentElement, b = document.body;
      return !!((r && r.classList && r.classList.contains('theme-contrast')) || (b && b.classList && b.classList.contains('theme-contrast')));
    } catch (e) { return false; }
  }
  window.StemLab.registerTool('schoolBehaviorToolkit', {
    icon: '🏫',
    label: 'School Behavior Toolkit',
    desc: 'Applied K-12 behavior practice — what school psychs and educators actually do with operant-conditioning science. PBIS three-tier framework, replacement behaviors mapped to FBA functions, setting events (the slow triggers most BIPs miss), Geoff Colvin\'s seven-phase Acting-Out Cycle for crisis de-escalation, and Restraint & Seclusion ethics anchored in Maine Chapter 33. Sister tool to BehaviorLab (which teaches the science) and Disability Voices in SEL Hub (which centers the people the field has been done to).',
    color: 'teal',
    category: 'science',
    _engine: SCHOOL_BEHAVIOR_ENGINE,
    questHooks: [
      { id: 'open_pbis', label: 'Open the PBIS three-tier framework', icon: '🏫', check: function(d) { return !!(d && d.sbtViewedPbis); }, progress: function(d) { return (d && d.sbtViewedPbis) ? 'opened' : 'not yet'; } }
    ],
    render: function(ctx) {
      __alloSBTCtx = ctx;
      var t = (ctx.t && function(k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k) ? (fb != null ? fb : k) : v; }) || function(k, fb) { return fb != null ? fb : k; };
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var isContrast = !!(ctx.isContrast || ctx.theme === 'contrast');
      var isDark = !isContrast && !!(ctx.isDark || ctx.theme === 'dark');
      var hcMode = isContrast || _sbtIsHC();
      var reduceMotion = !!ctx.reduceMotion;
      var awardXP = function(pts, reason) {
        if (typeof ctx.awardXP === 'function' && Number.isFinite(pts) && pts > 0) {
          ctx.awardXP('schoolBehaviorToolkit', pts, typeof reason === 'string' && reason ? reason : 'School Behavior Toolkit practice');
        }
      };
      // For the Function Sleuth drill moved in from behaviorLab. A bare reference
      // to an undeclared identifier is a ReferenceError, not a falsy check.
      var addToast = ctx.addToast;
      var speakText = function(text) {
        if (!text) return;
        var isMuted = (typeof window !== 'undefined' && typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) ||
          (typeof window !== 'undefined' && !!window._alloGlobalMute);
        if (isMuted) {
          if (addToast) addToast(t('stem.schoolbehaviortoolkit.tts_muted', 'Audio is muted — unmute to listen.'), 'info');
          return;
        }
        if (typeof ctx.callTTS === 'function') {
          ctx.callTTS(String(text), undefined, undefined, { force: true });
          return;
        }
        if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
          try {
            var u = new window.SpeechSynthesisUtterance(String(text));
            window.speechSynthesis.speak(u);
          } catch (e) {}
        }
      };

      var rawSbt = labToolData && labToolData.schoolBehaviorToolkit;
      var d = (rawSbt && typeof rawSbt === 'object' && !Array.isArray(rawSbt)) ? rawSbt : defaultState();
      function setSBT(patch) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function(prev) {
          var prevObj = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {};
          var prevSbt = prevObj.schoolBehaviorToolkit;
          var prior = (prevSbt && typeof prevSbt === 'object' && !Array.isArray(prevSbt)) ? prevSbt : defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prevObj, { schoolBehaviorToolkit: next });
        });
      }
      function safeIdList(rawVal, allowedIds) {
        if (!Array.isArray(rawVal)) return [];
        var out = [];
        for (var i = 0; i < rawVal.length; i++) {
          var item = rawVal[i];
          if (typeof item !== 'string' || !item) continue;
          if (allowedIds && allowedIds.indexOf(item) === -1) continue;
          if (out.indexOf(item) === -1) out.push(item);
        }
        return out;
      }
      var MATCHER_IDS = MATCHER_SCENARIOS.map(function(s) { return s.id; });
      var DECISION_IDS = DECISION_SCENARIOS.map(function(s) { return s.id; });
      var ABC_IDS = ABC_CODING_CASES.map(function(s) { return s.id; });
      var PBIS_IDS = PBIS_TRIAGE_CASES.map(function(s) { return s.id; });

      var cycleCompleted = d.cycleCompleted === true;
      var matcherSolvedIds = safeIdList(d.matcherSolvedIds, MATCHER_IDS);
      var matcherBonusAwarded = d.matcherBonusAwarded === true;
      var decisionSolvedIds = safeIdList(d.decisionSolvedIds, DECISION_IDS);
      var abcSolvedIds = safeIdList(d.abcSolvedIds, ABC_IDS);
      var pbisSolvedIds = safeIdList(d.pbisSolvedIds, PBIS_IDS);
      var bipAudited = d.bipAudited === true;

      function onVerifyCycle() {
        if (cycleCompleted) return;
        setSBT({ cycleCompleted: true });
        awardXP(5, 'Verified Acting-Out Cycle phase check');
        if (addToast) addToast(t('stem.schoolbehaviortoolkit.xp_cycle_verified', '✅ Acting-Out Cycle check verified (+5 XP)'), 'success');
      }
      function onSolveMatcherScenario(scId) {
        if (typeof scId !== 'string' || MATCHER_IDS.indexOf(scId) === -1) return;
        if (matcherSolvedIds.indexOf(scId) !== -1) return;
        var nextIds = matcherSolvedIds.concat([scId]);
        var patch = { matcherSolvedIds: nextIds };
        awardXP(2, 'Function-spotter scenario: ' + scId);
        if (nextIds.length >= MATCHER_IDS.length && !matcherBonusAwarded) {
          patch.matcherBonusAwarded = true;
          awardXP(4, 'Function-spotter full mastery');
        }
        setSBT(patch);
      }
      function onSolveDecisionScenario(scId) {
        if (typeof scId !== 'string' || DECISION_IDS.indexOf(scId) === -1) return;
        if (decisionSolvedIds.indexOf(scId) !== -1) return;
        setSBT({ decisionSolvedIds: decisionSolvedIds.concat([scId]) });
        awardXP(4, 'Restraint & Seclusion ethics scenario: ' + scId);
      }
      function onSolvePbisCase(caseId) {
        if (typeof caseId !== 'string' || PBIS_IDS.indexOf(caseId) === -1) return;
        if (pbisSolvedIds.indexOf(caseId) !== -1) return;
        setSBT({ pbisSolvedIds: pbisSolvedIds.concat([caseId]) });
        awardXP(2, 'PBIS Tier-Triage case: ' + caseId);
      }
      function onSolveAbcCase(caseId) {
        if (typeof caseId !== 'string' || ABC_IDS.indexOf(caseId) === -1) return;
        if (abcSolvedIds.indexOf(caseId) !== -1) return;
        setSBT({ abcSolvedIds: abcSolvedIds.concat([caseId]) });
        awardXP(3, 'ABC-Data Function Coder case: ' + caseId);
      }
      function onPassBipAudit() {
        if (bipAudited) return;
        setSBT({ bipAudited: true });
        awardXP(5, 'BIP Alignment & Ethics Audit passed');
        if (addToast) addToast(t('stem.schoolbehaviortoolkit.xp_bip_audited', '✅ BIP Alignment & Ethics Audit passed (+5 XP)'), 'success');
      }

      var VALID_SECTIONS = ['pbis', 'fba', 'functions', 'bip', 'replacement', 'setting', 'cycle', 'restraint', 'tokens', 'cico', 'equity', 'maine', 'connect', 'inquiry'];
      var section = (typeof d.activeSection === 'string' && VALID_SECTIONS.indexOf(d.activeSection) >= 0) ? d.activeSection : 'pbis';
      var isAssessmentLocked = !!(ctx && (ctx.quizLock || ctx.teacherLock || (ctx.assessment && ctx.assessment.locked)));
      var exploredCount = VALID_SECTIONS.reduce(function(acc, id) {
        if (id === 'pbis' || id === section) return acc + 1;
        return acc + (d['sbtViewed' + id.charAt(0).toUpperCase() + id.slice(1)] ? 1 : 0);
      }, 0);
      var safeTokenBalance = Number.isFinite(Number(d.tokenBalance)) ? Math.max(0, Math.round(Number(d.tokenBalance))) : 0;
      var safeBehIQ = (d.behIQ && typeof d.behIQ === 'object' && !Array.isArray(d.behIQ)) ? d.behIQ : null;
      var activeTierNum = (safeBehIQ && Number.isFinite(Number(safeBehIQ.tier))) ? Math.min(3, Math.max(1, Math.round(Number(safeBehIQ.tier)))) : 2;
      var SECTION_LABELS = {
        pbis: __alloT('stem.schoolbehaviortoolkit.pbis_tiers', 'PBIS Tiers'),
        fba: __alloT('stem.schoolbehaviortoolkit.fba_process', 'FBA Process'),
        functions: __alloT('stem.schoolbehaviortoolkit.four_functions_tab', 'Four Functions'),
        bip: __alloT('stem.schoolbehaviortoolkit.bip_template', 'BIP Template'),
        replacement: __alloT('stem.schoolbehaviortoolkit.replacement_behaviors', 'Replacement Behaviors'),
        setting: __alloT('stem.schoolbehaviortoolkit.setting_events', 'Setting Events'),
        cycle: __alloT('stem.schoolbehaviortoolkit.acting_out_cycle', 'Acting-Out Cycle'),
        restraint: __alloT('stem.schoolbehaviortoolkit.restraint_seclusion', 'Restraint & Seclusion'),
        tokens: __alloT('stem.schoolbehaviortoolkit.token_economy_tab', 'Token Economy'),
        cico: __alloT('stem.schoolbehaviortoolkit.cico_template', 'CICO Template'),
        equity: __alloT('stem.schoolbehaviortoolkit.equity_disparities', 'Equity & Disparities'),
        maine: __alloT('stem.schoolbehaviortoolkit.maine_resources', 'Maine Resources'),
        connect: __alloT('stem.schoolbehaviortoolkit.connect', 'Connect'),
        inquiry: __alloT('stem.schoolbehaviortoolkit.behavior_inquiry', 'Behavior Inquiry')
      };

      function setSection(s) {
        if (VALID_SECTIONS.indexOf(s) < 0) return;
        var patch = { activeSection: s };
        patch['sbtViewed' + s.charAt(0).toUpperCase() + s.slice(1)] = true;
        setSBT(patch);
      }

      var sbtGrainSvg = (function() {
        var svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" aria-hidden="true">' +
            '<filter id="g">' +
              '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="19"/>' +
              '<feColorMatrix values="0 0 0 0 0.4   0 0 0 0 0.7   0 0 0 0 0.7   0 0 0 0.06 0"/>' +
            '</filter>' +
            '<rect width="100%" height="100%" filter="url(#g)"/>' +
          '</svg>';
        return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
      })();
      var rootStyle = hcMode ? {
        background: '#000000',
        border: '2px solid #fbbf24',
        borderRadius: 16,
        minHeight: '70vh',
        padding: 0,
        boxShadow: 'none',
        '--allo-stem-canvas': '#000000',
        '--allo-stem-text': '#ffffff',
        '--allo-stem-text-soft': '#fbbf24',
        '--allo-stem-border': '#fbbf24',
        color: '#ffffff'
      } : {
        background:
          'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(20,184,166,0.16), transparent 70%), ' +
          sbtGrainSvg + ', ' +
          (isDark
            ? 'linear-gradient(135deg, #0b1120 0%, #0f2422 50%, #0b1120 100%)'
            : 'linear-gradient(135deg, #0f172a 0%, #122624 50%, #0f172a 100%)'),
        backgroundRepeat: 'no-repeat, repeat, no-repeat',
        backgroundAttachment: 'fixed, scroll, fixed',
        borderRadius: 16,
        minHeight: '70vh',
        padding: 0,
        boxShadow: isDark ? '0 0 40px rgba(20,184,166,0.18)' : '0 8px 32px rgba(15,23,42,0.22)',
        '--allo-stem-canvas': '#0f172a',
        '--allo-stem-text': '#e2e8f0',
        '--allo-stem-text-soft': '#94a3b8',
        '--allo-stem-border': '#334155',
        color: '#e2e8f0'
      };

      function renderHeader() {
        var starterPresets = [
          { id: 'pbis', icon: '🏫', label: __alloT('stem.schoolbehaviortoolkit.preset_pbis_pyramid', 'PBIS 3-Tier Pyramid') },
          { id: 'fba', icon: '📋', label: t('stem.schoolbehaviortoolkit.preset_abc_coder', 'ABC Function Coder') },
          { id: 'cycle', icon: '🌀', label: __alloT('stem.schoolbehaviortoolkit.preset_cycle_scrubber', 'Crisis Cycle Scrubber') },
          { id: 'functions', icon: '🔍', label: __alloT('stem.schoolbehaviortoolkit.preset_function_sleuth', 'Function Sleuth Drill') },
          { id: 'bip', icon: '📑', label: __alloT('stem.schoolbehaviortoolkit.preset_bip_chain', 'Tier 3 BIP Chain') },
          { id: 'inquiry', icon: '🧪', label: __alloT('stem.schoolbehaviortoolkit.preset_plan_readiness', 'Plan Readiness Lab') }
        ];
        return h('div', { className: 'sbt-hero', style: { padding: '20px 24px 16px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
            !ctx.embedded && h('button', { type: 'button', onClick: function() { if (setStemLabTool) setStemLabTool(null); }, 'aria-label': __alloT('stem.schoolbehaviortoolkit.back_to_stem_lab', 'Back to STEAM Lab'),
              style: { background: hcMode ? '#000000' : 'rgba(255,255,255,0.07)', border: hcMode ? '1.5px solid #ffff00' : '1px solid rgba(148,163,184,0.28)', borderRadius: 10, minWidth: 44, minHeight: 44, padding: '6px 10px', cursor: 'pointer', color: hcMode ? '#ffff00' : '#e2e8f0', fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, '←'),
            // Bespoke PBIS & Applied Behavior Science Studio SVG Emblem
            h('div', { 'aria-hidden': 'true',
              style: {
                width: 56, height: 56, borderRadius: 14,
                background: hcMode ? '#000000' : 'linear-gradient(135deg, rgba(20,184,166,0.22), rgba(15,23,42,0.85))',
                border: hcMode ? '2px solid #ffff00' : '1.5px solid rgba(45,212,191,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: hcMode ? 'none' : '0 6px 18px rgba(20,184,166,0.24)'
              }
            },
              (function() {
                var hc = hcMode;
                return h('svg', { width: 42, height: 42, viewBox: '0 0 56 56', 'aria-hidden': 'true' },
                  !hc && h('defs', null,
                    h('radialGradient', { id: 'sbt-emb-well', cx: '50%', cy: '42%', r: '58%' },
                      h('stop', { offset: '0%', stopColor: '#134e4a' }),
                      h('stop', { offset: '100%', stopColor: '#020617' })
                    ),
                    h('linearGradient', { id: 'sbt-emb-t3', x1: '0', y1: '0', x2: '0', y2: '1' },
                      h('stop', { offset: '0%', stopColor: '#f87171' }),
                      h('stop', { offset: '100%', stopColor: '#b91c1c' })
                    ),
                    h('linearGradient', { id: 'sbt-emb-t2', x1: '0', y1: '0', x2: '0', y2: '1' },
                      h('stop', { offset: '0%', stopColor: '#fde047' }),
                      h('stop', { offset: '100%', stopColor: '#d97706' })
                    ),
                    h('linearGradient', { id: 'sbt-emb-t1', x1: '0', y1: '0', x2: '0', y2: '1' },
                      h('stop', { offset: '0%', stopColor: '#4ade80' }),
                      h('stop', { offset: '100%', stopColor: '#15803d' })
                    )
                  ),
                  h('circle', { className: (!hc && !reduceMotion) ? 'sbt-orbit-calm' : undefined, cx: 28, cy: 28, r: 25.5, fill: hc ? '#000000' : 'url(#sbt-emb-well)', stroke: hc ? '#ffff00' : '#2dd4bf', strokeWidth: 1.6, strokeDasharray: '4 3' }),
                  h('polygon', { points: '28,9 35,20 21,20', fill: hc ? '#ffff00' : 'url(#sbt-emb-t3)', stroke: '#0f172a', strokeWidth: 1.2, strokeLinejoin: 'round' }),
                  h('polygon', { points: '20,22 36,22 41,31 15,31', fill: hc ? '#ffffff' : 'url(#sbt-emb-t2)', stroke: '#0f172a', strokeWidth: 1.2, strokeLinejoin: 'round' }),
                  h('polygon', { points: '14,33 42,33 47,43 9,43', fill: hc ? '#00ff00' : 'url(#sbt-emb-t1)', stroke: '#0f172a', strokeWidth: 1.2, strokeLinejoin: 'round' }),
                  !hc && !reduceMotion && h('polyline', { className: 'sbt-svg-fx sbt-curve-glow', points: '12,48 20,48 25,44 31,49 37,46 44,48', fill: 'none', stroke: '#2dd4bf', strokeWidth: 4.5, strokeOpacity: 0.28, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                  h('polyline', { points: '12,48 20,48 25,44 31,49 37,46 44,48', fill: 'none', stroke: hc ? '#ffff00' : '#5eead4', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }),
                  !hc && !reduceMotion && h('circle', { className: 'sbt-svg-fx sbt-beacon-calm', cx: 28, cy: 9, r: 5, fill: '#fef08a', opacity: 0.3 }),
                  h('circle', { cx: 28, cy: 9, r: 2.3, fill: '#fef08a' })
                );
              })()
            ),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 } },
                h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: hcMode ? '#ffff00' : '#5eead4', letterSpacing: '-0.01em' } }, __alloT('stem.schoolbehaviortoolkit.school_behavior_toolkit', 'School Behavior Toolkit')),
                h('span', { style: {
                  padding: '3px 9px', borderRadius: 999,
                  background: hcMode ? '#000000' : 'rgba(20,184,166,0.16)',
                  border: hcMode ? '1px solid #fbbf24' : '1px solid rgba(45,212,191,0.45)',
                  color: hcMode ? '#fbbf24' : '#99f6e4', fontSize: 10, fontWeight: 800,
                  letterSpacing: '0.05em', textTransform: 'uppercase'
                } }, __alloT('stem.schoolbehaviortoolkit.subject_badge', 'Applied Behavior Science · PBIS')),
                h('span', { style: {
                  padding: '3px 9px', borderRadius: 999,
                  background: hcMode ? '#000000' : 'rgba(15,23,42,0.72)',
                  border: hcMode ? '1px solid #ffff00' : '1px solid rgba(100,116,139,0.45)',
                  color: hcMode ? '#ffffff' : '#cbd5e1', fontSize: 10, fontWeight: 700,
                  fontFamily: 'ui-monospace, Menlo, monospace'
                } }, t('stem.schoolbehaviortoolkit.sections_interactive_badge', '14 sections · 10 interactive labs'))
              ),
              h('p', { style: { margin: 0, fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 600, lineHeight: 1.5 } }, __alloT('stem.schoolbehaviortoolkit.applied_k_12_practice_pbis_replacement', 'Applied K-12 practice. PBIS · Replacement Behaviors (with function-spotter) · Setting Events · Acting-Out Cycle (with phase scrubber) · Restraint Ethics (with decision tree) · Equity & Disparities.'))
            )
          ),
          // Live non-spoiler telemetry strip
          h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(45,212,191,0.16)' } },
            h('span', { className: 'sbt-telemetry-pill' },
              h('span', { 'aria-hidden': 'true', style: { color: hcMode ? '#00ff00' : '#5eead4' } }, '●'),
              __alloT('stem.schoolbehaviortoolkit.telemetry_station', 'Station: ') + (SECTION_LABELS[section] || section)
            ),
            h('span', { className: 'sbt-telemetry-pill' },
              __alloT('stem.schoolbehaviortoolkit.telemetry_explored', 'Explored: ') + exploredCount + ' / ' + VALID_SECTIONS.length
            ),
            h('span', { className: 'sbt-telemetry-pill' },
              __alloT('stem.schoolbehaviortoolkit.telemetry_tier', 'Inquiry Tier: T') + activeTierNum
            ),
            h('span', { className: 'sbt-telemetry-pill' },
              __alloT('stem.schoolbehaviortoolkit.telemetry_tokens', 'Token Bank: ') + safeTokenBalance
            )
          ),
          // One-click starter workflow presets (hidden/disabled under assessment lock)
          !isAssessmentLocked && h('div', { role: 'group', 'aria-label': __alloT('stem.schoolbehaviortoolkit.quick_workflows_label', 'Quick clinical workflow starters'),
            style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 } },
            h('span', { style: { fontSize: 10.5, fontWeight: 800, color: hcMode ? '#fbbf24' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 } },
              __alloT('stem.schoolbehaviortoolkit.quick_starters', 'Quick launch:')),
            starterPresets.map(function(pr) {
              var isCur = section === pr.id;
              return h('button', {
                key: 'sbt-pre-' + pr.id,
                type: 'button',
                className: 'sbt-preset-chip',
                'data-active': isCur ? 'true' : 'false',
                'aria-pressed': isCur ? 'true' : 'false',
                onClick: function() { setSection(pr.id); }
              },
                h('span', { 'aria-hidden': 'true' }, pr.icon),
                h('span', null, pr.label)
              );
            })
          )
        );
      }

      function renderTabs() {
        var tabs = [
          { id: 'pbis', label: __alloT('stem.schoolbehaviortoolkit.pbis_tiers', 'PBIS Tiers'), icon: '🏫' },
          { id: 'fba', label: __alloT('stem.schoolbehaviortoolkit.fba_process', 'FBA Process'), icon: '🔬' },
          { id: 'functions', label: __alloT('stem.schoolbehaviortoolkit.four_functions_tab', 'Four Functions'), icon: '🔍' },
          { id: 'bip', label: __alloT('stem.schoolbehaviortoolkit.bip_template', 'BIP Template'), icon: '📑' },
          { id: 'replacement', label: __alloT('stem.schoolbehaviortoolkit.replacement_behaviors', 'Replacement Behaviors'), icon: '🔄' },
          { id: 'setting', label: __alloT('stem.schoolbehaviortoolkit.setting_events', 'Setting Events'), icon: '🕰️' },
          { id: 'cycle', label: __alloT('stem.schoolbehaviortoolkit.acting_out_cycle', 'Acting-Out Cycle'), icon: '🌀' },
          { id: 'restraint', label: __alloT('stem.schoolbehaviortoolkit.restraint_seclusion', 'Restraint & Seclusion'), icon: '🛑' },
          { id: 'tokens', label: __alloT('stem.schoolbehaviortoolkit.token_economy_tab', 'Token Economy'), icon: '🪙' },
          { id: 'cico', label: __alloT('stem.schoolbehaviortoolkit.cico_template', 'CICO Template'), icon: '📋' },
          { id: 'equity', label: __alloT('stem.schoolbehaviortoolkit.equity_disparities', 'Equity & Disparities'), icon: '⚖️' },
          { id: 'maine', label: __alloT('stem.schoolbehaviortoolkit.maine_resources', 'Maine Resources'), icon: '🦞' },
          { id: 'connect', label: __alloT('stem.schoolbehaviortoolkit.connect', 'Connect'), icon: '🔗' },
          { id: 'inquiry', label: __alloT('stem.schoolbehaviortoolkit.behavior_inquiry', 'Behavior Inquiry'), icon: '🧪' }
        ];
        var schoolBehaviorTabKeyDown = function(e, index) {
          if (e.ctrlKey || e.altKey || e.metaKey) return;
          var nextIndex = -1;
          // Derived from the array, not a literal. This was `% 12`, so adding a tab
          // would have made Right-arrow skip the last one and Left-arrow land wrong.
          var tabCount = tabs.length;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % tabCount;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + tabCount - 1) % tabCount;
          else if (e.key === 'Home') nextIndex = 0;
          else if (e.key === 'End') nextIndex = tabCount - 1;
          if (nextIndex < 0) return;
          e.preventDefault();
          var tabEls = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabEls[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        };
        return h('div', { role: 'tablist', 'aria-label': __alloT('stem.schoolbehaviortoolkit.school_behavior_toolkit_sections', 'School Behavior Toolkit sections'),
          style: { display: 'flex', gap: 4, padding: '14px 18px 0', overflowX: 'auto', borderBottom: '1px solid rgba(20,184,166,0.18)', alignItems: 'flex-end' } },
          tabs.map(function(t, tabIndex) {
            var active = section === t.id;
            return h('button', {
              type: 'button',
              key: t.id, role: 'tab', id: 'school-behavior-tab-' + t.id,
              'aria-controls': 'school-behavior-panel-' + t.id,
              'aria-selected': active ? 'true' : 'false', tabIndex: active ? 0 : -1,
              onKeyDown: function(e) { schoolBehaviorTabKeyDown(e, tabIndex); },
              onClick: function() { setSection(t.id); },
              style: {
                position: 'relative',
                minHeight: 44,
                padding: '10px 14px 12px',
                border: 'none',
                background: active ? 'rgba(20,184,166,0.14)' : 'transparent',
                color: active ? '#5eead4' : '#94a3b8',
                fontSize: 12, fontWeight: active ? 800 : 600,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                borderRadius: '8px 8px 0 0',
                borderTop: '1px solid ' + (active ? 'rgba(20,184,166,0.34)' : 'transparent'),
                borderLeft: '1px solid ' + (active ? 'rgba(20,184,166,0.34)' : 'transparent'),
                borderRight: '1px solid ' + (active ? 'rgba(20,184,166,0.34)' : 'transparent'),
                marginBottom: -1,
                transition: 'color 140ms ease, background 140ms ease'
              }
            },
              h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, t.icon),
              h('span', null, t.label),
              // Active-tab bottom indicator — small accent line that
              // visually 'connects' the tab to the panel below it.
              active ? h('span', { 'aria-hidden': 'true',
                style: {
                  position: 'absolute', left: 6, right: 6, bottom: 0,
                  height: 2, background: '#14b8a6', borderRadius: '2px 2px 0 0'
                }
              }) : null
            );
          })
        );
      }

      function panelHeader(title, subtitle) {
        return h('div', { style: { textAlign: 'center', marginBottom: 16 } },
          h('div', { style: { color: '#5eead4', fontSize: 16, fontWeight: 900 } }, title),
          h('div', { style: { color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 12, marginTop: 4, lineHeight: 1.5, maxWidth: 600, margin: '4px auto 0' } }, subtitle)
        );
      }

      function circularBadge(icon, color, size) {
        var sz = size || 38;
        return h('div', { 'aria-hidden': 'true',
          style: {
            width: sz, height: sz, borderRadius: '50%',
            background: color + '22',
            border: '1.5px solid ' + color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(sz * 0.5), lineHeight: 1, flexShrink: 0
          }
        }, icon);
      }

      function sourceFooter(text) {
        return h('div', { style: { marginTop: 14, padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.6)', borderLeft: '3px solid #14b8a6', color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 10, lineHeight: 1.6, fontStyle: 'italic' } }, text);
      }

      // ── Section: PBIS Three Tiers ──
      function renderPbis() {
        return h('div', null,
          panelHeader('🏫 PBIS — Three Tiers of Support',
            'Positive Behavioral Interventions and Supports is the school-wide framework that holds individual ABA work inside a system. Most school psychs spend ~80% of their time inside this framework — not in 1-on-1 ABA.'),
          // ── The field's iconic PBIS pyramid, AREA-proportional to the 80/15/5
          // split (cumulative area from apex scales as height-fraction squared).
          // Upgraded to spacious 560x220 studio infographic with >=11px callout labels.
          (function() {
            var W = 560, H = 220, apexY = 18, baseY = 192, cx = 148, halfBase = 116, hgt = baseY - apexY;
            function lvl(f) { return { y: apexY + hgt * f, lx: cx - halfBase * f, rx: cx + halfBase * f }; }
            var a = lvl(Math.sqrt(0.05)), b = lvl(Math.sqrt(0.20));
            var y3 = (apexY + a.y) / 2 + 4;
            var y2 = (a.y + b.y) / 2 + 2;
            var y1 = (b.y + baseY) / 2 + 4;
            var bands = [
              {
                poly: cx + ',' + apexY + ' ' + a.rx.toFixed(1) + ',' + a.y.toFixed(1) + ' ' + a.lx.toFixed(1) + ',' + a.y.toFixed(1),
                fill: '#ef4444', stroke: '#fca5a5',
                anchorX: (cx + a.rx) / 2 + 6, anchorY: y3,
                tag: __alloT('stem.schoolbehaviortoolkit.tier_3_5_intensive', 'Tier 3 · ~5% · Intensive'),
                sub: __alloT('stem.schoolbehaviortoolkit.tier_3_svg_sub', 'Individualized FBA, BIP & wraparound team'),
                short: '5%'
              },
              {
                poly: a.lx.toFixed(1) + ',' + a.y.toFixed(1) + ' ' + a.rx.toFixed(1) + ',' + a.y.toFixed(1) + ' ' + b.rx.toFixed(1) + ',' + b.y.toFixed(1) + ' ' + b.lx.toFixed(1) + ',' + b.y.toFixed(1),
                fill: '#f59e0b', stroke: '#fde68a',
                anchorX: (a.rx + b.rx) / 2 + 6, anchorY: y2,
                tag: __alloT('stem.schoolbehaviortoolkit.tier_2_15_targeted', 'Tier 2 · ~15% · Targeted'),
                sub: __alloT('stem.schoolbehaviortoolkit.tier_2_svg_sub', 'Check-In/Check-Out (CICO) & small-group skills'),
                short: '15%'
              },
              {
                poly: b.lx.toFixed(1) + ',' + b.y.toFixed(1) + ' ' + b.rx.toFixed(1) + ',' + b.y.toFixed(1) + ' ' + (cx + halfBase) + ',' + baseY + ' ' + (cx - halfBase) + ',' + baseY,
                fill: '#16a34a', stroke: '#86efac',
                anchorX: (b.rx + cx + halfBase) / 2 + 6, anchorY: y1,
                tag: __alloT('stem.schoolbehaviortoolkit.tier_1_80_universal_all_students', 'Tier 1 · ~80% · Universal (All Students)'),
                sub: __alloT('stem.schoolbehaviortoolkit.tier_1_svg_sub', 'Clear expectations, active supervision & recognition'),
                short: '80%'
              }
            ];
            var hcP = hcMode;
            return h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: hcP ? '#000000' : 'rgba(2,6,23,0.68)', border: hcP ? '1.5px solid #fbbf24' : '1px solid rgba(45,212,191,0.28)' } },
              h('svg', { width: '100%', viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: 560, height: 'auto', display: 'block', borderRadius: 8 }, role: 'img', 'aria-label': __alloT('stem.schoolbehaviortoolkit.pbis_pyramid_tier_1_universal_supports', 'PBIS pyramid: Tier 1 universal supports for ~80% of students, Tier 2 targeted for ~15%, Tier 3 intensive for ~5%.') },
                !hcP && h('defs', null,
                  h('radialGradient', { id: 'sbt-pyr-well', cx: '32%', cy: '48%', r: '62%' },
                    h('stop', { offset: '0%', stopColor: '#112a2b' }),
                    h('stop', { offset: '100%', stopColor: '#030712' })
                  ),
                  h('linearGradient', { id: 'sbt-pyr-0', x1: '0', y1: '0', x2: '1', y2: '1' },
                    h('stop', { offset: '0%', stopColor: '#f87171' }),
                    h('stop', { offset: '100%', stopColor: '#b91c1c' })
                  ),
                  h('linearGradient', { id: 'sbt-pyr-1', x1: '0', y1: '0', x2: '1', y2: '1' },
                    h('stop', { offset: '0%', stopColor: '#fbbf24' }),
                    h('stop', { offset: '100%', stopColor: '#b45309' })
                  ),
                  h('linearGradient', { id: 'sbt-pyr-2', x1: '0', y1: '0', x2: '1', y2: '1' },
                    h('stop', { offset: '0%', stopColor: '#22c55e' }),
                    h('stop', { offset: '100%', stopColor: '#15803d' })
                  )
                ),
                h('rect', { x: 0, y: 0, width: W, height: H, rx: 8, fill: hcP ? '#000000' : 'url(#sbt-pyr-well)', stroke: hcP ? '#ffff00' : 'rgba(45,212,191,0.18)', strokeWidth: 0.9 }),
                !hcP && h('ellipse', { className: 'sbt-svg-fx', cx: cx, cy: baseY + 5, rx: halfBase * 0.95, ry: 5, fill: '#000000', opacity: 0.55 }),
                bands.map(function(bd, i) {
                  var calloutY = i === 0 ? 44 : i === 1 ? 94 : 152;
                  return h('g', { key: i },
                    h('polygon', { points: bd.poly, fill: hcP ? '#000000' : 'url(#sbt-pyr-' + i + ')', stroke: hcP ? '#ffff00' : bd.stroke, strokeWidth: hcP ? 2 : 1.5, strokeLinejoin: 'round', opacity: 0.96 }),
                    i === 2 && h('text', { x: cx, y: y1 + 4, textAnchor: 'middle', fill: '#ffffff', fontSize: 13, fontWeight: 900, style: { paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: 2.8, strokeLinejoin: 'round' } }, '80%'),
                    i === 1 && h('text', { x: cx, y: y2 + 4, textAnchor: 'middle', fill: '#ffffff', fontSize: 11, fontWeight: 900, style: { paintOrder: 'stroke', stroke: '#0f172a', strokeWidth: 2.4, strokeLinejoin: 'round' } }, '15%'),
                    !hcP && h('line', { className: 'sbt-svg-fx', x1: bd.anchorX, y1: bd.anchorY, x2: 286, y2: calloutY, stroke: bd.stroke, strokeWidth: 4, strokeOpacity: 0.16 }),
                    h('line', { className: (!hcP && !reduceMotion) ? 'sbt-goal-flow-slow' : undefined, x1: bd.anchorX, y1: bd.anchorY, x2: 286, y2: calloutY, stroke: hcP ? '#ffff00' : bd.stroke, strokeWidth: 1.5, strokeDasharray: '3 3', opacity: 0.9 }),
                    !hcP && !reduceMotion && h('circle', { className: 'sbt-svg-fx sbt-beacon-calm', cx: bd.anchorX, cy: bd.anchorY, r: 7, fill: bd.stroke, opacity: 0.26, style: { animationDelay: (i * 0.6) + 's' } }),
                    h('circle', { cx: bd.anchorX, cy: bd.anchorY, r: 3.5, fill: hcP ? '#00ff00' : bd.stroke, stroke: '#0f172a', strokeWidth: 1 }),
                    h('rect', { x: 288, y: calloutY - 17, width: W - 298, height: 38, rx: 7, fill: hcP ? '#000000' : 'rgba(15,23,42,0.72)', stroke: hcP ? '#ffff00' : 'rgba(148,163,184,0.22)', strokeWidth: 0.9 }),
                    h('rect', { x: 288, y: calloutY - 17, width: 3.5, height: 38, rx: 1.5, fill: hcP ? '#ffff00' : bd.stroke }),
                    h('text', { x: 298, y: calloutY - 2, textAnchor: 'start', fill: hcP ? '#ffff00' : bd.stroke, fontSize: 12, fontWeight: 800 }, bd.tag),
                    h('text', { x: 298, y: calloutY + 13, textAnchor: 'start', fill: hcP ? '#ffffff' : '#cbd5e1', fontSize: 10.5 }, bd.sub)
                  );
                }),
                h('text', { x: W / 2, y: H - 5, textAnchor: 'middle', fill: hcP ? '#ffff00' : '#94a3b8', fontSize: 10.5, fontStyle: 'italic' }, __alloT('stem.schoolbehaviortoolkit.bands_are_area_proportional_to_the_80_', 'Bands are area-proportional to the ~80 / 15 / 5 PBIS triangle'))
              )
            );
          })(),
          h(PbisTriageWidget, {
            React: React,
            cases: PBIS_TRIAGE_CASES,
            solvedIds: pbisSolvedIds,
            onSolveCase: onSolvePbisCase,
            speakText: speakText,
            isContrast: hcMode,
            reduceMotion: reduceMotion,
            t: t
          }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            PBIS_TIERS.map(function(pt) {
              return h('div', { key: 'pbis-' + pt.tier,
                style: {
                  background: hcMode ? '#000000' : 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderRight: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderBottom: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderLeft: '4px solid ' + (hcMode ? '#ffff00' : pt.color)
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('div', { 'aria-hidden': 'true',
                    style: { width: 36, height: 36, borderRadius: '50%', background: hcMode ? '#000000' : pt.color + '22', border: '1.5px solid ' + (hcMode ? '#ffff00' : pt.color),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: hcMode ? '#ffff00' : pt.color, fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                  }, pt.tier),
                  h('div', { style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, pt.icon),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: hcMode ? '#ffff00' : pt.color, lineHeight: 1.2 } }, pt.name),
                    h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic' } }, pt.percent)
                  )
                ),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } },
                  h('b', { style: { color: 'var(--allo-stem-text, #e2e8f0)' } }, __alloT('stem.schoolbehaviortoolkit.who_it_serves', 'Who it serves: ')), pt.who),
                h('div', null,
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.concrete_examples', 'Concrete examples')),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } }, pt.examples)
                ),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                  h('div', { style: { padding: 8, borderRadius: 6, background: hcMode ? '#000000' : 'rgba(96,165,250,0.06)', border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(96,165,250,0.20)') } },
                    h('div', { style: { fontSize: 9, fontWeight: 800, color: hcMode ? '#ffff00' : '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.data_signal', '📊 Data signal')),
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } }, pt.data)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: hcMode ? '#000000' : 'rgba(251,146,60,0.06)', border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(251,146,60,0.20)') } },
                    h('div', { style: { fontSize: 9, fontWeight: 800, color: hcMode ? '#00ff00' : '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.when_to_escalate', '⏫ When to escalate')),
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } }, pt.escalate)
                  )
                )
              );
            })
          ),
          sourceFooter('🎯 The PBIS rule of thumb: a building where Tier 1 is weak will need MORE Tier 2 and Tier 3 capacity than the staffing model can support — and Tier 3 plans will fail because they are trying to compensate for missing universal supports. Strong Tier 1 is the highest-leverage school-psych work there is.')
        );
      }

      // ── Section: Replacement Behaviors ──
      function renderReplacement() {
        return h('div', null,
          panelHeader('🔄 Replacement Behaviors — function → BIP bridge',
            'Knowing the function is half the work. The other half is teaching a replacement that meets the same function while being socially acceptable, easier, and more efficient than the problem behavior.'),
          h(FunctionMatcher, {
            React: React,
            scenarios: MATCHER_SCENARIOS,
            functions: FUNCTIONS_KEY,
            solvedIds: matcherSolvedIds,
            onSolveScenario: onSolveMatcherScenario,
            speakText: speakText,
            isContrast: hcMode,
            reduceMotion: reduceMotion,
            t: t
          }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            REPLACEMENT_BEHAVIORS.map(function(rb, i) {
              return h('div', { key: 'rb-' + i,
                style: { background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid rgba(100,116,139,0.25)', borderRight: '1px solid rgba(100,116,139,0.25)', borderBottom: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + rb.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  circularBadge(rb.icon, rb.color, 36),
                  h('div', null,
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: rb.color, lineHeight: 1.2 } }, rb['function']),
                    h('div', { style: { fontSize: 9, color: rb.color, fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.04em', marginTop: 1 } }, 'function: ' + rb.functionAbbrev)
                  )
                ),
                h('div', null,
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.problem_behavior_typically_looks_like', '⚠ Problem behavior typically looks like')),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 6 } }, rb.problemEx)
                ),
                h('div', null,
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.replacement_behavior', '↪ Replacement behavior')),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 6 } }, rb.replacement)
                ),
                h('div', null,
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.how_to_teach_it', '🎓 How to teach it')),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 6 } }, rb.teaching)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.20)' } },
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.common_pitfall', '🪤 Common pitfall')),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } }, rb.pitfall)
                )
              );
            })
          ),
          sourceFooter('🎯 The replacement-behavior rule of thumb: the new behavior must be (1) easier than the problem behavior, (2) more efficient (faster reinforcement, every time, no negotiation), and (3) reinforced first, conditions added later. Most BIPs front-load conditions and wonder why they fail. Trust comes before contingency.')
        );
      }

      // ── Section: Setting Events ──
      function renderSetting() {
        return h('div', null,
          panelHeader('🕰️ Setting Events — slow triggers most BIPs miss',
            'Most behavior plans focus on the immediate antecedent. Setting events are the conditions hours or days earlier that lower the behavior threshold. The shift is from "why this behavior right now?" to "why was today different?"'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 } },
            SETTING_EVENTS.map(function(se, i) {
              return h('div', { key: 'se-' + i,
                style: { background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid rgba(100,116,139,0.25)', borderRight: '1px solid rgba(100,116,139,0.25)', borderBottom: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + se.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  circularBadge(se.icon, se.color, 32),
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: se.color } }, se.category)
                ),
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 6 } }, se.examples),
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.5, fontStyle: 'italic', paddingTop: 6, borderTop: '1px dashed ' + se.color + '40' } }, '💡 ' + se.note)
              );
            })
          ),
          sourceFooter('🎯 Practical tool: when you write a BIP, add a "morning check" row to the ABC data sheet. One quick rating each morning of the six categories above. Three weeks of data and the pattern emerges. School psychs who do this regularly report cutting BIP-revision cycles in half.')
        );
      }

      // ── Section: Acting-Out Cycle ──
      function renderCycle() {
        return h('div', null,
          panelHeader('🌀 Acting-Out Cycle — seven phases of escalation',
            'Geoff Colvin\'s seven-phase framework is the spine of every major crisis-intervention curriculum (CPI, Boys Town, NCI, Mandt). Each phase has its own intervention. Knowing which phase a student is in tells staff what will help and what will make it worse.'),
          h(CycleScrubber, {
            React: React,
            phases: ACTING_OUT_CYCLE,
            cycleCompleted: cycleCompleted,
            onVerifyCycle: onVerifyCycle,
            speakText: speakText,
            isContrast: hcMode,
            reduceMotion: reduceMotion,
            t: t
          }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            ACTING_OUT_CYCLE.map(function(ph) {
              var phSpeech = 'Phase ' + ph.phase + ': ' + ph.name + '. Signs: ' + ph.signs + ' Do this: ' + ph.doThis + ' Do not do: ' + ph.dontDo;
              return h('div', { key: 'cycle-' + ph.phase,
                style: { background: hcMode ? '#000000' : 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderRight: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderBottom: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderLeft: '4px solid ' + (hcMode ? '#ffff00' : ph.color) } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                  h('div', { 'aria-hidden': 'true',
                    style: { width: 36, height: 36, borderRadius: '50%', background: hcMode ? '#000000' : ph.color + '22', border: '1.5px solid ' + (hcMode ? '#ffff00' : ph.color),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: hcMode ? '#ffff00' : ph.color, fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                  }, ph.phase),
                  h('div', { style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, ph.icon),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: hcMode ? '#ffff00' : ph.color, letterSpacing: '0.01em', flex: 1 } }, ph.name),
                  sbtReadBtn(h, speakText, phSpeech, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_phase_card_aria', 'Read crisis phase aloud: ') + ph.name, hcMode)
                ),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.signs', 'Signs')),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5, marginBottom: 8 } }, ph.signs),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                  h('div', { style: { padding: 8, borderRadius: 6, background: hcMode ? '#000000' : 'rgba(34,197,94,0.06)', border: '1px solid ' + (hcMode ? '#00ff00' : 'rgba(34,197,94,0.20)') } },
                    h('div', { style: { fontSize: 9, fontWeight: 800, color: hcMode ? '#00ff00' : '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.do_this', '✓ Do this')),
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } }, ph.doThis)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: hcMode ? '#000000' : 'rgba(239,68,68,0.06)', border: '1px solid ' + (hcMode ? '#ffff00' : 'rgba(239,68,68,0.20)') } },
                    h('div', { style: { fontSize: 9, fontWeight: 800, color: hcMode ? '#ffff00' : '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.don_t_do', '✗ Don\'t do')),
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } }, ph.dontDo)
                  )
                )
              );
            })
          ),
          sourceFooter('🎯 Practical translation: a 5-second rule for staff during Phases 3-5 is less talking, more space, simpler language, fewer demands. Most adult escalation mistakes happen in Phase 4 (Acceleration) when we feel pulled to lecture, threaten, or argue. The cycle teaches that almost nothing said at Phase 4 lands — and most of what is said makes Phase 5 worse. Save the words for Phase 7.')
        );
      }

      // ── Section: Restraint and Seclusion ──
      function renderRestraint() {
        return h('div', null,
          panelHeader('🛑 Restraint & Seclusion — emergency protocols and ethics',
            'High-stakes content most ABA tools cover briefly or not at all. School psychs sit on IEP teams that authorize, debrief, and revise BIPs in response to restraint and seclusion incidents.'),
          h(DecisionTree, {
            React: React,
            scenarios: DECISION_SCENARIOS,
            solvedIds: decisionSolvedIds,
            onSolveScenario: onSolveDecisionScenario,
            speakText: speakText,
            isContrast: hcMode,
            reduceMotion: reduceMotion,
            t: t
          }),
          h('div', { style: { padding: '10px 12px', borderRadius: 8, background: hcMode ? '#000000' : 'rgba(239,68,68,0.08)', border: '1px solid ' + (hcMode ? '#ffff00' : 'rgba(239,68,68,0.30)'), marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: hcMode ? '#ffff00' : '#fca5a5', fontWeight: 800, marginBottom: 4 } }, __alloT('stem.schoolbehaviortoolkit.this_is_education_not_training', '⚠ This is education, not training.')),
            h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } },
              __alloT('stem.schoolbehaviortoolkit.reading_this_section_does_not_authoriz', 'Reading this section does not authorize anyone to perform restraint or seclusion. State law requires specific certified training (CPI / NCI / Mandt or equivalent) and authorized-staff designation. This panel teaches the framework and ethics so school psychs and IEP-team members can recognize appropriate use, document properly, and revise BIPs in response to incidents.'))
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            RESTRAINT_PRINCIPLES.map(function(rp, i) {
              var rpSpeech = rp.name + '. ' + rp.content + ' Counter-line: ' + rp.counter;
              return h('div', { key: 'r-' + i,
                style: { background: hcMode ? '#000000' : 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderRight: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderBottom: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderLeft: '4px solid ' + (hcMode ? '#ffff00' : rp.color) } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                  circularBadge(rp.icon, rp.color, 36),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: hcMode ? '#ffff00' : rp.color, lineHeight: 1.2, flex: 1 } }, rp.name),
                  sbtReadBtn(h, speakText, rpSpeech, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_restraint_card_aria', 'Read ethics card aloud: ') + rp.name, hcMode)
                ),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } }, rp.content),
                h('div', { style: { padding: 8, borderRadius: 6, background: hcMode ? '#000000' : 'rgba(251,146,60,0.06)', border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(251,146,60,0.20)'), fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } },
                  h('span', { style: { color: hcMode ? '#ffff00' : '#fb923c', fontWeight: 800, marginRight: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' } }, __alloT('stem.schoolbehaviortoolkit.counter_line', '↪ Counter-line:')),
                  rp.counter)
              );
            })
          ),
          sourceFooter('🎯 The school-psych principle: every restraint is a signal the BIP and the cycle work failed somewhere upstream — at Phase 1 prevention, at Phase 2 trigger-catching, or at Phase 3 de-escalation. The post-incident debrief is not just paperwork; it is data about which upstream phase needs more support next time. If your data show the same student restrained on the same antecedent three times in a quarter, the BIP is the problem — not the student.')
        );
      }

      // ── Section: FBA Process ──
      function renderFba() {
        return h('div', null,
          panelHeader('🔬 FBA Process — the upstream of every Tier 3 BIP',
            'Functional Behavior Assessment is the systematic process for identifying WHY a behavior is happening. Without an FBA, the BIP is just a guess. Five steps from indirect assessment through hypothesis testing to BIP development.'),
          // ── FBA -> Function Statement -> BIP pipeline, drawn.
          (function() {
            var arrow = function(k) { return h('span', { key: k, style: { color: '#94a3b8', fontWeight: 800, fontSize: 13 } }, '→'); };
            var bigArrowStyle = { color: '#fbbf24', fontWeight: 800, fontSize: 16, margin: '0 1px' };
            var chip = function(s) {
              return h('div', { key: 'fc-' + s.step, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 8px', borderRadius: 8, background: hcMode ? '#000000' : 'rgba(15,23,42,0.7)', border: '1px solid ' + (hcMode ? '#fbbf24' : s.color + '66'), minWidth: 60 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 3 } },
                  h('span', { style: { fontSize: 13 } }, s.icon),
                  h('span', { style: { fontSize: 10, fontWeight: 800, color: hcMode ? '#ffff00' : s.color } }, s.step)),
                h('span', { style: { fontSize: 8.5, color: 'var(--allo-stem-text-soft, #94a3b8)', textAlign: 'center', lineHeight: 1.2 } }, s.name));
            };
            var seq = [];
            FBA_STEPS.forEach(function(s, i) { if (i) seq.push(arrow('a' + i)); seq.push(chip(s)); });
            var fnBox = h('div', { key: 'fn', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 10px', borderRadius: 8, background: hcMode ? '#000000' : 'rgba(251,191,36,0.12)', border: '1.5px solid #fbbf24', minWidth: 70 } },
              h('span', { style: { fontSize: 13 } }, '🎯'),
              h('span', { style: { fontSize: 9, fontWeight: 800, color: '#fbbf24', textAlign: 'center', lineHeight: 1.2 } }, __alloT('stem.schoolbehaviortoolkit.function_statement', 'Function statement')));
            var bipBox = h('div', { key: 'bip', style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 10px', borderRadius: 8, background: hcMode ? '#000000' : 'rgba(96,165,250,0.12)', border: '1.5px solid ' + (hcMode ? '#ffff00' : '#60a5fa'), minWidth: 62 } },
              h('span', { style: { fontSize: 13 } }, '📋'),
              h('span', { style: { fontSize: 9, fontWeight: 800, color: hcMode ? '#ffff00' : '#60a5fa', textAlign: 'center', lineHeight: 1.2 } }, __alloT('stem.schoolbehaviortoolkit.bip_8_parts', 'BIP (8 parts)')));
            return h('div', { style: { marginBottom: 14, padding: '12px 10px', borderRadius: 10, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #1e293b)' } },
              h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, rowGap: 8 } },
                seq.concat([
                  h('span', { key: 'ba1', style: bigArrowStyle }, '⇒'), fnBox,
                  h('span', { key: 'ba2', style: bigArrowStyle }, '⇒'), bipBox
                ])),
              h('div', { style: { fontSize: 9.5, color: 'var(--allo-stem-text-soft, #94a3b8)', textAlign: 'center', marginTop: 8, fontStyle: 'italic' } }, __alloT('stem.schoolbehaviortoolkit.the_5_fba_steps_produce_one_function_s', 'The 5 FBA steps produce one function statement — the spine every BIP strategy must trace back to.'))
            );
          })(),
          h(AbcFunctionCoder, {
            React: React,
            cases: ABC_CODING_CASES,
            solvedIds: abcSolvedIds,
            onSolveCase: onSolveAbcCase,
            speakText: speakText,
            isContrast: hcMode,
            reduceMotion: reduceMotion,
            t: t
          }),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            FBA_STEPS.map(function(s) {
              return h('div', { key: 'fba-' + s.step,
                style: {
                  background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid rgba(100,116,139,0.25)', borderRight: '1px solid rgba(100,116,139,0.25)', borderBottom: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + s.color
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('div', { 'aria-hidden': 'true',
                    style: { width: 36, height: 36, borderRadius: '50%', background: s.color + '22', border: '1.5px solid ' + s.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: s.color, fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                  }, s.step),
                  h('div', { style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, s.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: s.color, lineHeight: 1.2 } }, s.name),
                    h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic', fontFamily: 'ui-monospace, Menlo, monospace' } }, '⏱ ' + s.duration)
                  )
                ),
                h('div', { style: { fontSize: 9, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.what_to_do', 'What to do')),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } }, s.what),
                h('div', {
                  style: {
                    padding: '8px 10px', borderRadius: 6,
                    background: s.color + '10',
                    borderLeft: '2px solid ' + s.color,
                    marginBottom: 8
                  }
                },
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.key_idea', '🔑 Key idea')),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, s.key)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.20)', fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } },
                  h('span', { style: { color: '#fb923c', fontWeight: 800, marginRight: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' } }, __alloT('stem.schoolbehaviortoolkit.common_pitfall_2', '🪤 Common pitfall:')),
                  s.pitfall)
              );
            })
          ),
          sourceFooter('🎯 The FBA rule of thumb: the indirect assessment generates the candidate hypotheses, the direct ABC observation tests them, the function statement names the winner. A BIP without a function statement is a punishment plan. Sources: BACB FBA practice standards; Iwata et al. 1994 founding functional analysis paper; Crone & Horner FBA practitioner guide.')
        );
      }

      // ── Tables for the Four Functions section ───────────────────────────
      // Moved from stem_tool_behaviorlab.js. Inside render, not at module scope
      // beside PBIS_TIERS: those are plain strings, these carry __alloT calls, and
      // __alloT is defined in this closure.
      var FOUR_FUNCTIONS = [

        { name: __alloT('stem.schoolbehaviortoolkit.attention', 'Attention'), abbrev: 'ATT', icon: '\uD83D\uDC40', color: '#60a5fa', desc: __alloT('stem.schoolbehaviortoolkit.behavior_maintained_by_social_attentio', 'Behavior maintained by social attention from others. Example: A student calls out in class to get the teacher to look at them. The attention (even if negative) reinforces the calling out.'), example: 'Calling out, clowning around, tantrums when ignored', intervention: 'Planned ignoring of problem behavior + attention for appropriate behavior (DRA). Teach appropriate ways to get attention.' },
        { name: 'Escape/Avoidance', abbrev: 'ESC', icon: '\uD83C\uDFC3', color: '#f87171', desc: __alloT('stem.schoolbehaviortoolkit.behavior_maintained_by_removal_of_an_a', 'Behavior maintained by removal of an aversive stimulus. Example: A student has a meltdown when given math work, and the teacher removes the assignment. The meltdown is negatively reinforced.'), example: 'Work refusal, aggression to end demands, elopement', intervention: 'Escape extinction (don\'t remove demand). Break tasks into smaller steps. Provide breaks contingent on compliance (DRO/DRA).' },
        { name: __alloT('stem.schoolbehaviortoolkit.tangible', 'Tangible'), abbrev: 'TAN', icon: '\uD83C\uDFAE', color: '#f59e0b', desc: __alloT('stem.schoolbehaviortoolkit.behavior_maintained_by_access_to_a_pre', 'Behavior maintained by access to a preferred item or activity. Example: A child screams in the store until the parent buys them candy. The screaming is reinforced by getting the candy.'), example: 'Grabbing items, screaming for toys, negotiating for screen time', intervention: 'Don\'t provide the item contingent on problem behavior. Teach requesting (FCT). Provide access to preferred items for appropriate behavior.' },
        { name: 'Sensory/Automatic', abbrev: 'AUT', icon: '\u2728', color: '#a78bfa', desc: __alloT('stem.schoolbehaviortoolkit.behavior_maintained_by_the_sensory_sti', 'Behavior maintained by the sensory stimulation it produces, independent of social consequences. The behavior itself feels good. Example: Hand-flapping may produce proprioceptive input that is reinforcing.'), example: 'Hand flapping, rocking, humming, nail biting', intervention: 'Provide alternative sensory input (sensory diet). Modify the environment. Consider whether the behavior actually needs intervention (it may serve a regulatory function).' }
      ];

      // Authored 3/3/3/3 across the four functions and shuffled in order, so
      // answering by pattern does not work.
      var FN_VIGNETTES = [

        { id: 1, scenario: 'Maya calls out across the classroom whenever the teacher is talking to another student. The teacher usually pauses to redirect Maya, then resumes with the other student. Maya stops calling out for a minute, then does it again.', correct: 'Attention',
          why: 'The behavior reliably pulls the teacher\'s attention away from someone else and onto Maya — even though it is corrective attention. The pause-then-redirect cycle is the giveaway. Negative attention still reinforces.' },
        { id: 2, scenario: 'Devin starts crumpling his math worksheet and tearing the corners off as soon as it is placed on his desk. The teacher gives him a quiet warning and tells him to come back to the work after a "break" at the calm-down corner.', correct: 'Escape',
          why: 'The behavior consistently postpones or removes the math demand. The "break" is the consequence the kid is working for. Escape from math is being negatively reinforced — even though the teacher meant it as a calm-down.' },
        { id: 3, scenario: 'Every time Aria walks past the prize bin in the resource room, she grabs at the box and then lays on the floor crying until staff hand her a fidget. Staff have started giving her one quickly to keep the hallway calm.', correct: 'Tangible',
          why: 'The crying produces access to a preferred item (the fidget). The hallway-calm rationale matters less than the contingency: cry → get fidget. That is positive reinforcement of the behavior by the tangible item.' },
        { id: 4, scenario: 'During independent reading, Jordan rocks rhythmically in his chair and hums quietly. He continues whether or not anyone is around or paying attention. He stops on his own when the bell rings.', correct: 'Sensory',
          why: 'The behavior happens regardless of who is around or what is in front of him. No attention payoff, no demand to escape, no item being chased. The behavior itself is the reward — vestibular/proprioceptive input. May not need intervention.' },
        { id: 5, scenario: 'When the cafeteria runs out of pizza on Wednesday, Sam slams his tray, screams, and refuses to move from the line until staff find him a pizza slice from the staff lounge.', correct: 'Tangible',
          why: 'Specific item → behavior → access to that specific item. Staff sourcing pizza from the lounge is the smoking-gun reinforcer. Different from a generic escape (he is not avoiding lunch — he wants a specific thing).' },
        { id: 6, scenario: 'When asked to read aloud, Priya immediately drops to the floor and lies face-down. Staff usually skip her and ask the next student. She returns to her seat once the read-aloud is over.', correct: 'Escape',
          why: 'The behavior reliably gets her out of reading aloud. The "skip her" response is the reinforcer. She returns to baseline once the demand is gone — clean evidence the demand itself was what she was avoiding.' },
        { id: 7, scenario: 'During free play, Theo flicks his fingers in front of his eyes near the window. He does it whether the teacher is watching, with peers, or alone. It seems to happen more on bright sunny days.', correct: 'Sensory',
          why: 'Independent of social context, increases with bright light (a sensory variable). The behavior is producing visual stimulation that the kid finds reinforcing. Common in autistic students; often does not need intervention unless interfering with learning.' },
        { id: 8, scenario: 'In the lunch line, Alex pinches the kid in front whenever a staff member walks by. The staff member always intervenes, asks Alex what is going on, and walks Alex to a separate table to "talk." Alex stops pinching for the rest of lunch.', correct: 'Attention',
          why: 'The pinching reliably gets a 1-on-1 conversation with an adult. The "separate table" intervention is functioning as adult-attention payoff, not as a consequence. Hidden attention reinforcement is one of the most-missed FBA findings.' },
        { id: 9, scenario: 'When his teacher asks Eli to put away his iPad, Eli starts flopping on the floor and screaming. The screaming stops the moment Eli sees the iPad placed back in his hands.', correct: 'Tangible',
          why: 'Direct cause-and-effect with a specific item. Behavior stops the moment the item returns. That instant-stop is the diagnostic giveaway — it tells you what the behavior was working for.' },
        { id: 10, scenario: 'Carla tears up her worksheet, throws it in the trash, and asks the teacher for a fresh one. She does this on every assignment, regardless of subject or difficulty. After tearing it up, she always completes the new copy without further issue.', correct: 'Sensory',
          why: 'No attention payoff (teacher just hands her a new sheet, no extended interaction). No escape (she completes the work). No specific tangible (she gets back the same item). The tearing itself appears to be the reinforcer — likely tactile/auditory sensory input.' },
        { id: 11, scenario: 'Whenever the lights are turned off for a video, Marco starts loudly humming a song. The teacher pauses the video, asks Marco to be quiet, then restarts. Marco hums again 30 seconds later.', correct: 'Attention',
          why: 'Pattern: behavior → teacher attention (pause + redirect) → repeat. The 30-second cycle is suspicious — that is reinforcer-driven repetition, not random vocalizing. If it were sensory, it would not pause when noticed.' },
        { id: 12, scenario: 'In gym, when the teacher announces a running drill, Sasha immediately complains of stomach pain and asks to sit out. She is fine for the rest of class, including the basketball drill that follows.', correct: 'Escape',
          why: 'Behavior precedes the aversive demand and is specific to it. She is not avoiding gym in general — just the run. The selective onset + selective relief is the giveaway. Reinforcer = removal of the running demand.' },

        // Four more, moved from behaviorLab's Practice Scenarios: same task,
        // same four answers, so they belonged with the drill rather than in a
        // Skinner-box tool that no longer teaches the functions.
        { id: 101, scenario: 'A student screams every time they are asked to complete a math worksheet. When they scream, the teacher sends them to the hallway.', correct: 'Escape',
          why: 'The student screams and is removed from the math task. The screaming is negatively reinforced by escape from the aversive task (math worksheet). The teacher is accidentally reinforcing the screaming!' },
        { id: 102, scenario: 'A child throws toys whenever their parent is on the phone. The parent stops the call to attend to the child.', correct: 'Attention',
          why: 'The child throws toys and gets parent attention. The behavior is positively reinforced by the attention that follows. Phone calls = SD for throwing toys.' },
        { id: 103, scenario: 'A student with autism rocks back and forth during independent work time. The rocking does not seem connected to getting or avoiding anything.', correct: 'Sensory',
          why: 'Automatic (sensory) reinforcement! The behavior produces its own reinforcement through proprioceptive/vestibular stimulation. It is not maintained by social consequences.' },
        { id: 104, scenario: 'Every time a specific toy is visible, a child cries until they get it. The crying stops immediately once they have the toy.', correct: 'Tangible',
          why: 'Tangible reinforcement! The crying is maintained by access to a preferred item (the toy). The visibility of the toy acts as an MO (motivating operation).' }
      ];

      // The vignettes answer with a short id ('Escape'); FOUR_FUNCTIONS is keyed by
      // abbrev ('ESC') and carries the fuller name ('Escape/Avoidance'). The two
      // vocabularies met for the first time when these blocks moved, so the map is
      // explicit rather than a prefix match that breaks on the next rewording.
      var FN_ANSWER_TO_ABBREV = { Attention: 'ATT', Escape: 'ESC', Tangible: 'TAN', Sensory: 'AUT' };

      // ── Token economy tables ────────────────────────────────────────────
      // Moved from stem_tool_behaviorlab.js. In the render scope, not at module
      // scope, because they carry __alloT calls.
      var TOKEN_ITEMS = [
        { id: 'hw', name: __alloT('stem.schoolbehaviortoolkit.homework_complete', 'Homework Complete'), tokens: 3, icon: '\uD83D\uDCD3', category: 'academic' },
        { id: 'onTask', name: __alloT('stem.schoolbehaviortoolkit.on_task_15_min', 'On-task 15 min'), tokens: 2, icon: '\uD83C\uDFAF', category: 'behavior' },
        { id: 'kind', name: __alloT('stem.schoolbehaviortoolkit.act_of_kindness', 'Act of Kindness'), tokens: 4, icon: '\u2764\uFE0F', category: 'social' },
        { id: 'clean', name: __alloT('stem.schoolbehaviortoolkit.clean_up_area', 'Clean Up Area'), tokens: 2, icon: '\uD83E\uDDF9', category: 'behavior' },
        { id: 'help', name: __alloT('stem.schoolbehaviortoolkit.help_a_peer', 'Help a Peer'), tokens: 3, icon: '\uD83E\uDD1D', category: 'social' },
        { id: 'quiet', name: __alloT('stem.schoolbehaviortoolkit.quiet_transition', 'Quiet Transition'), tokens: 1, icon: '\uD83E\uDD2B', category: 'behavior' },
        { id: 'read', name: __alloT('stem.schoolbehaviortoolkit.read_20_pages', 'Read 20 Pages'), tokens: 3, icon: '\uD83D\uDCDA', category: 'academic' },
        { id: 'test', name: __alloT('stem.schoolbehaviortoolkit.score_80', 'Score 80%+'), tokens: 5, icon: '\uD83C\uDF1F', category: 'academic' }
      ];

      var TOKEN_REWARDS = [
        { id: 'sticker', name: __alloT('stem.schoolbehaviortoolkit.sticker', 'Sticker'), cost: 5, icon: '\u2B50' },
        { id: 'freetime', name: __alloT('stem.schoolbehaviortoolkit.5_min_free_time', '5 min Free Time'), cost: 10, icon: '\uD83C\uDFAE' },
        { id: 'snack', name: __alloT('stem.schoolbehaviortoolkit.snack_choice', 'Snack Choice'), cost: 15, icon: '\uD83C\uDF6A' },
        { id: 'leader', name: __alloT('stem.schoolbehaviortoolkit.line_leader', 'Line Leader'), cost: 8, icon: '\uD83D\uDC51' },
        { id: 'computer', name: __alloT('stem.schoolbehaviortoolkit.computer_time', 'Computer Time'), cost: 12, icon: '\uD83D\uDCBB' },
        { id: 'homework', name: __alloT('stem.schoolbehaviortoolkit.homework_pass', 'Homework Pass'), cost: 20, icon: '\uD83C\uDF89' },
        { id: 'teacher', name: __alloT('stem.schoolbehaviortoolkit.lunch_with_teacher', 'Lunch with Teacher'), cost: 25, icon: '\uD83C\uDF55' },
        { id: 'mystery', name: __alloT('stem.schoolbehaviortoolkit.mystery_prize', 'Mystery Prize'), cost: 30, icon: '\uD83C\uDF81' }
      ];

      // ── Section: Token Economy ──
      // Moved here from stem_tool_behaviorlab.js. A token economy is a school-wide
      // or classroom reinforcement system, not a fact about operant conditioning —
      // it belongs with the practice, and the Toolkit had nothing on it.
      //
      // The builder arrived as-is; the framing and the pitfalls below are new. A
      // panel that only lets you award tokens teaches that the hard part is picking
      // the prizes, and the hard part is everything else: whether the target
      // behaviours are ones the student can already do, whether the exchange ratio
      // survives contact with a real week, and how the thing ever ends.
      function renderTokens() {
        var balance = Number.isFinite(Number(d.tokenBalance)) ? Math.max(0, Math.round(Number(d.tokenBalance))) : 0;
        var log = Array.isArray(d.tokenLog)
          ? d.tokenLog.filter(function(item) { return item && typeof item === 'object' && !Array.isArray(item); }).map(function(item) {
              return {
                type: typeof item.type === 'string' ? item.type : 'earn',
                name: typeof item.name === 'string' ? item.name : '',
                tokens: Number.isFinite(Number(item.tokens)) ? Math.round(Number(item.tokens)) : 0,
                icon: typeof item.icon === 'string' ? item.icon : '🪙'
              };
            })
          : [];

        function pushLog(entry) {
          var next = [entry].concat(log);
          if (next.length > 20) next = next.slice(0, 20);
          return next;
        }

        return h('div', null,
          panelHeader(__alloT('stem.schoolbehaviortoolkit.token_economy_h', '🪙 Token economy'),
            __alloT('stem.schoolbehaviortoolkit.token_economy_sub', 'Tokens are conditioned reinforcers: worthless in themselves, valuable because of what they buy. Three parts have to be designed together — the behaviours that earn, the token, and the backup reinforcers it exchanges for.')),

          // ── The three parts ──
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 } },
            [
              { icon: '🎯', color: '#60a5fa',
                title: __alloT('stem.schoolbehaviortoolkit.tk_part1', '1. What earns a token'),
                body: __alloT('stem.schoolbehaviortoolkit.tk_part1_b', 'Specific, observable, and already within reach. If the student cannot yet do it, a token system will not teach it — that is a job for instruction and shaping first.') },
              { icon: '🪙', color: '#fbbf24',
                title: __alloT('stem.schoolbehaviortoolkit.tk_part2', '2. The token itself'),
                body: __alloT('stem.schoolbehaviortoolkit.tk_part2_b', 'Delivered immediately, visibly, and without negotiation. Its value is entirely borrowed from the exchange, which is why an exchange that keeps slipping kills the system.') },
              { icon: '🎁', color: '#34d399',
                title: __alloT('stem.schoolbehaviortoolkit.tk_part3', '3. Backup reinforcers'),
                body: __alloT('stem.schoolbehaviortoolkit.tk_part3_b', 'Chosen by the student, not the adult. A reinforcer is defined by its effect on behaviour — if the behaviour does not increase, the thing on the menu is not a reinforcer, however much you would like it to be.') }
            ].map(function (p) {
              return h('div', { key: 'tk-' + p.title,
                style: { background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + p.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                  circularBadge(p.icon, p.color, 32),
                  h('div', { style: { fontSize: 12.5, fontWeight: 800, color: p.color, lineHeight: 1.2 } }, p.title)),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, p.body));
            })
          ),

          // ── The builder ──
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(20,184,166,0.30)' } },
            h('div', { style: { fontSize: 14, fontWeight: 900, color: '#5eead4', marginBottom: 4 } },
              __alloT('stem.schoolbehaviortoolkit.tk_build_h', '🛠️ Build one')),
            h('p', { style: { margin: '0 0 12px', fontSize: 11.5, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.55 } },
              __alloT('stem.schoolbehaviortoolkit.tk_build_sub', 'Award tokens, then spend them. Watch the exchange ratio: a menu whose cheapest item takes a week to reach is a menu the student stops working for.')),

            h('div', { role: 'status', 'aria-live': 'polite',
              style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.35)', marginBottom: 12 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🪙'),
              h('div', { style: { textAlign: 'center' } },
                h('div', { style: { fontSize: 9.5, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em' } },
                  __alloT('stem.schoolbehaviortoolkit.tk_balance', 'Token balance')),
                h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fbbf24', lineHeight: 1.2 } }, balance))
            ),

            h('div', { style: { fontSize: 9.5, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
              __alloT('stem.schoolbehaviortoolkit.tk_earn', 'Earn tokens')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 6, marginBottom: 14 } },
              TOKEN_ITEMS.map(function (item) {
                return h('button', { type: 'button', key: 'earn-' + item.id,
                  'aria-label': item.name + ', +' + item.tokens + t('stem.schoolbehaviortoolkit.tk_tokens_unit_aria', ' tokens'),
                  onClick: function () {
                    setSBT({
                      tokenBalance: balance + item.tokens,
                      tokenLog: pushLog({ type: 'earn', name: item.name, tokens: item.tokens, icon: item.icon })
                    });
                    if (addToast) addToast('🪙 +' + item.tokens + ' — ' + item.name, 'success');
                  },
                  style: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', minHeight: 44, borderRadius: 9, cursor: 'pointer', textAlign: 'left', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(52,211,153,0.35)', color: 'var(--allo-stem-text, #e2e8f0)' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 17 } }, item.icon),
                  h('span', null,
                    h('span', { style: { display: 'block', fontSize: 11.5, fontWeight: 700 } }, item.name),
                    h('span', { style: { display: 'block', fontSize: 10.5, color: '#34d399', fontWeight: 700 } }, '+' + item.tokens)));
              })
            ),

            h('div', { style: { fontSize: 9.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
              __alloT('stem.schoolbehaviortoolkit.tk_spend', 'Exchange')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 6 } },
              TOKEN_REWARDS.map(function (rew) {
                var afford = balance >= rew.cost;
                return h('button', { type: 'button', key: 'spend-' + rew.id,
                  'aria-label': rew.name + t('stem.schoolbehaviortoolkit.tk_costs_aria', ', costs ') + rew.cost + t('stem.schoolbehaviortoolkit.tk_tokens_unit_aria', ' tokens') + (afford ? '' : t('stem.schoolbehaviortoolkit.tk_not_enough_aria', ', not enough tokens yet')),
                  onClick: function () {
                    if (!afford) {
                      if (addToast) addToast('❌ ' + (rew.cost - balance) + t('stem.schoolbehaviortoolkit.tk_more_tokens_needed', ' more tokens needed'), 'info');
                      return;
                    }
                    setSBT({
                      tokenBalance: balance - rew.cost,
                      tokenLog: pushLog({ type: 'spend', name: rew.name, tokens: -rew.cost, icon: rew.icon })
                    });
                    if (addToast) addToast('🎉 ' + rew.name, 'success');
                  },
                  style: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', minHeight: 44, borderRadius: 9, cursor: 'pointer', textAlign: 'left', opacity: afford ? 1 : 0.75, background: afford ? 'rgba(251,191,36,0.10)' : 'rgba(15,23,42,0.5)', border: '1px solid ' + (afford ? 'rgba(251,191,36,0.35)' : 'rgba(100,116,139,0.3)'), color: 'var(--allo-stem-text, #e2e8f0)' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 17 } }, rew.icon),
                  h('span', null,
                    h('span', { style: { display: 'block', fontSize: 11.5, fontWeight: 700 } }, rew.name),
                    h('span', { style: { display: 'block', fontSize: 10.5, color: afford ? '#fbbf24' : '#cbd5e1', fontWeight: 700 } }, rew.cost + ' 🪙')));
              })
            ),

            log.length > 0 && h('div', { style: { marginTop: 14 } },
              h('div', { style: { fontSize: 9.5, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } },
                __alloT('stem.schoolbehaviortoolkit.tk_log', 'Exchange record')),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
                log.slice(0, 8).map(function (e, i) {
                  return h('div', { key: 'log-' + i,
                    style: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 9px', borderRadius: 7, background: 'rgba(15,23,42,0.7)', fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)' } },
                    h('span', { 'aria-hidden': 'true' }, e.icon),
                    h('span', { style: { flex: 1 } }, e.name),
                    h('span', { style: { fontWeight: 800, color: e.tokens > 0 ? '#34d399' : '#fbbf24' } },
                      (e.tokens > 0 ? '+' : '') + e.tokens));
                })
              ),
              h('button', {
                type: 'button',
                onClick: function () { setSBT({ tokenBalance: 0, tokenLog: [] }); },
                'aria-label': __alloT('stem.schoolbehaviortoolkit.tk_reset', 'Reset the token board'),
                style: { marginTop: 8, padding: '7px 12px', minHeight: 36, borderRadius: 8, border: '1px solid rgba(100,116,139,0.4)', background: 'rgba(15,23,42,0.7)', color: 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                __alloT('stem.schoolbehaviortoolkit.tk_reset_label', '↻ Reset board'))
            )
          ),

          // ── Pitfalls ──
          h('div', { style: { marginTop: 16 } },
            h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#fb923c', marginBottom: 8 } },
              __alloT('stem.schoolbehaviortoolkit.tk_pitfalls_h', '⚠️ Where token boards go wrong')),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              [
                __alloT('stem.schoolbehaviortoolkit.tk_pit1', 'Paying for what the student already does reliably. That is not reinforcement, it is a wage — and it can reduce the behaviour once the wage stops.'),
                __alloT('stem.schoolbehaviortoolkit.tk_pit2', 'An exchange ratio nobody can reach. If the cheapest item is days away, the token stops predicting anything and stops working.'),
                __alloT('stem.schoolbehaviortoolkit.tk_pit3', 'Taking tokens away. Response cost is a punishment procedure with its own ethical and procedural requirements; bolting it onto an earn-only board is a change of intervention, not a tweak.'),
                __alloT('stem.schoolbehaviortoolkit.tk_pit4', 'No plan to end. A board that never thins toward natural reinforcers is a board the student needs forever, which was never the goal.'),
                __alloT('stem.schoolbehaviortoolkit.tk_pit5', 'A menu the adult picked. Preference is measured, not assumed — and it changes week to week.')
              ].map(function (pit, i) {
                return h('div', { key: 'pit-' + i,
                  style: { padding: '8px 11px', borderRadius: 8, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.20)', fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, pit);
              })
            )
          ),

          sourceFooter(__alloT('stem.schoolbehaviortoolkit.tk_footer', '🪙 A token economy is a scaffold, not a destination. The plan should name from the start how the schedule thins, what natural reinforcer takes over, and how you would know it had.'))
        );
      }

      // ── Section: Four Functions + Function Sleuth ──
      // Moved here from stem_tool_behaviorlab.js. The reference and the drill sit
      // together because identifying function IS the hard step of the FBA process
      // in the tab before this one — the Toolkit had that process and no practice,
      // the Skinner-box tool had the practice and no process.
      function renderFunctions() {
        var rawFnIdx = Number(d.fnIdx);
        var fnIdx = (Number.isInteger(rawFnIdx) && rawFnIdx >= 0 && rawFnIdx < FN_VIGNETTES.length) ? rawFnIdx : -1;
        var fnShown = Array.isArray(d.fnShown) ? d.fnShown.filter(function(x) { return Number.isInteger(x) && x >= 0 && x < FN_VIGNETTES.length; }) : [];
        var fnScore = Number.isFinite(Number(d.fnScore)) ? Math.max(0, Math.round(Number(d.fnScore))) : 0;
        var fnRounds = Number.isFinite(Number(d.fnRounds)) ? Math.max(0, Math.round(Number(d.fnRounds))) : 0;
        var fnAnswered = !!d.fnAnswered;
        var fnPick = typeof d.fnPick === 'string' ? d.fnPick : null;

        var fnDone = fnShown.length >= FN_VIGNETTES.length && fnAnswered;

        function nextVignette() {
          var remaining = [];
          for (var i = 0; i < FN_VIGNETTES.length; i++) {
            if (fnShown.indexOf(i) < 0) remaining.push(i);
          }
          if (!remaining.length) {
            setSBT({ fnIdx: -1, fnShown: [], fnScore: 0, fnRounds: 0, fnAnswered: false, fnPick: null });
            return;
          }
          // Deterministic rotation rather than Math.random: the same student
          // revisiting the drill should not get the same order, but a test should.
          var pick = remaining[(fnRounds * 7 + 3) % remaining.length];
          setSBT({ fnIdx: pick, fnShown: fnShown.concat([pick]), fnAnswered: false, fnPick: null });
        }

        var v = fnIdx >= 0 ? FN_VIGNETTES[fnIdx] : null;

        return h('div', null,
          panelHeader(__alloT('stem.schoolbehaviortoolkit.four_functions_h', '\uD83D\uDD0D Four functions of behaviour'),
            __alloT('stem.schoolbehaviortoolkit.four_functions_sub', 'Every behaviour is maintained by what it PRODUCES or what it PREVENTS. Topography — what it looks like — does not tell you the function; two children can do the same thing for opposite reasons.')),

          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            FOUR_FUNCTIONS.map(function(ff) {
              return h('div', { key: 'ff-' + ff.abbrev,
                style: {
                  background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + ff.color
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  circularBadge(ff.icon, ff.color),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: ff.color, lineHeight: 1.2 } }, ff.name + ' (' + ff.abbrev + ')')
                ),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } }, ff.desc),
                h('div', { style: { padding: '8px 10px', borderRadius: 6, background: ff.color + '10', borderLeft: '2px solid ' + ff.color, marginBottom: 8 } },
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: ff.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } },
                    __alloT('stem.schoolbehaviortoolkit.looks_like', 'Often looks like')),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, ff.example)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.20)', fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } },
                  h('span', { style: { color: '#5eead4', fontWeight: 800, marginRight: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' } },
                    __alloT('stem.schoolbehaviortoolkit.matched_intervention', 'Matched intervention')),
                  ff.intervention)
              );
            })
          ),

          // ── The drill ──
          h('div', { style: { marginTop: 18, padding: 14, borderRadius: 10, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(20,184,166,0.30)' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 } },
              h('div', { style: { fontSize: 14, fontWeight: 900, color: '#5eead4' } },
                __alloT('stem.schoolbehaviortoolkit.function_sleuth_h', '\uD83D\uDD75\uFE0F Function Sleuth')),
              fnRounds > 0 && h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)' } },
                fnScore + ' / ' + fnRounds + ' \u00b7 ' + fnShown.length + ' of ' + FN_VIGNETTES.length)
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: 11.5, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.55 } },
              __alloT('stem.schoolbehaviortoolkit.function_sleuth_sub', 'Read the vignette and name what the behaviour is getting or avoiding. On a real case this is a hypothesis you then test with ABC data \u2014 here the answer is knowable from the paragraph, which is exactly what makes it practice rather than assessment.')),

            !v ? h('button', {
              type: 'button',
              onClick: nextVignette,
              'aria-label': __alloT('stem.schoolbehaviortoolkit.start_function_sleuth', 'Start Function Sleuth'),
              style: { padding: '9px 16px', borderRadius: 9, border: '1px solid #14b8a6', background: 'rgba(20,184,166,0.18)', color: '#5eead4', fontSize: 12, fontWeight: 800, cursor: 'pointer', minHeight: 40 }
            }, __alloT('stem.schoolbehaviortoolkit.start_the_drill', '\u25B6 Start the drill'))
            : h('div', null,
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 } },
                h('div', { style: { fontSize: 9, fontWeight: 800, color: '#5eead4', textTransform: 'uppercase', letterSpacing: '0.06em' } },
                  __alloT('stem.schoolbehaviortoolkit.vignette', 'Vignette') + ' ' + fnShown.length + ' / ' + FN_VIGNETTES.length),
                sbtReadBtn(h, speakText, v.scenario + (fnAnswered ? ' ' + v.why : ''), t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_sleuth_vignette_aria', 'Read Function Sleuth vignette aloud'), hcMode)
              ),
              h('p', { style: { margin: '0 0 12px', fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, v.scenario),
              h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.schoolbehaviortoolkit.pick_the_function', 'Pick the function'),
                style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 } },
                FOUR_FUNCTIONS.map(function(ff, ffIdx) {
                  var picked = fnAnswered && fnPick === ff.abbrev;
                  var right = fnAnswered && ff.abbrev === FN_ANSWER_TO_ABBREV[v.correct];
                  var bg = !fnAnswered ? 'rgba(15,23,42,0.7)' : right ? 'rgba(16,185,129,0.18)' : picked ? 'rgba(248,113,113,0.18)' : 'rgba(15,23,42,0.4)';
                  var bd = !fnAnswered ? 'rgba(100,116,139,0.4)' : right ? '#34d399' : picked ? '#f87171' : 'rgba(100,116,139,0.3)';
                  var focusableRadio = picked || (!fnAnswered && ffIdx === 0);
                  return h('button', {
                    type: 'button',
                    key: 'pick-' + ff.abbrev, role: 'radio',
                    'aria-checked': picked ? 'true' : 'false',
                    tabIndex: fnAnswered ? -1 : (focusableRadio ? 0 : -1),
                    disabled: fnAnswered,
                    onKeyDown: function(e) {
                      if (fnAnswered || e.ctrlKey || e.altKey || e.metaKey) return;
                      var nextIdx = -1;
                      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (ffIdx + 1) % FOUR_FUNCTIONS.length;
                      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (ffIdx + FOUR_FUNCTIONS.length - 1) % FOUR_FUNCTIONS.length;
                      else if (e.key === 'Home') nextIdx = 0;
                      else if (e.key === 'End') nextIdx = FOUR_FUNCTIONS.length - 1;
                      if (nextIdx < 0) return;
                      e.preventDefault();
                      var radios = e.currentTarget.parentNode && e.currentTarget.parentNode.querySelectorAll('[role="radio"]');
                      if (radios && radios[nextIdx]) radios[nextIdx].focus();
                    },
                    onClick: function() {
                      if (fnAnswered) return;
                      var correct = ff.abbrev === FN_ANSWER_TO_ABBREV[v.correct];
                      setSBT({
                        fnAnswered: true, fnPick: ff.abbrev,
                        fnScore: fnScore + (correct ? 1 : 0),
                        fnRounds: fnRounds + 1
                      });
                      if (addToast) addToast(correct
                        ? __alloT('stem.schoolbehaviortoolkit.fn_correct', '\u2705 That is the function.')
                        : __alloT('stem.schoolbehaviortoolkit.fn_wrong', '\u274C Not this time \u2014 read the reasoning.'), correct ? 'success' : 'info');
                    },
                    style: {
                      padding: '10px 12px', borderRadius: 9, minHeight: 44, cursor: fnAnswered ? 'default' : 'pointer',
                      background: bg, border: '1px solid ' + bd, color: 'var(--allo-stem-text, #e2e8f0)',
                      fontSize: 12, fontWeight: 700, textAlign: 'left'
                    }
                  }, h('span', { 'aria-hidden': 'true' }, ff.icon + '  '), ff.name);
                })
              ),
              fnAnswered && h('div', { role: 'status', style: { marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(100,116,139,0.3)', fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6 } }, v.why),
              // Results card at the end. The version this drill was moved from had
              // one; the rewrite wrapped silently instead, so finishing sixteen
              // vignettes reset the counters and dropped the student back on the
              // start button knowing nothing about how they did. It is also where
              // the framing belongs, because it is the moment someone feels they
              // have got it.
              fnDone && h('div', { role: 'status',
                style: { marginTop: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(20,184,166,0.10)', border: '1px solid rgba(20,184,166,0.40)' } },
                h('div', { style: { fontSize: 13, fontWeight: 900, color: '#5eead4', marginBottom: 4 } },
                  __alloT('stem.schoolbehaviortoolkit.fn_all_done', '\uD83C\uDFC6 Every vignette complete')),
                h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } },
                  __alloT('stem.schoolbehaviortoolkit.fn_final', 'Final: '),
                  h('strong', null, fnScore + ' / ' + FN_VIGNETTES.length),
                  fnScore === FN_VIGNETTES.length
                    ? __alloT('stem.schoolbehaviortoolkit.fn_res_all', ' \u2014 every function correctly identified. That is the concept; on a real case the function is a hypothesis you confirm with ABC data and supervision, not a label you read off a paragraph.')
                    : fnScore >= Math.ceil(FN_VIGNETTES.length * 0.8)
                      ? __alloT('stem.schoolbehaviortoolkit.fn_res_strong', ' \u2014 strong. The pair most often confused is attention versus escape, because adult attention and demand removal usually arrive together; the question is which one the behaviour is working for.')
                      : fnScore >= Math.ceil(FN_VIGNETTES.length * 0.55)
                        ? __alloT('stem.schoolbehaviortoolkit.fn_res_ok', ' \u2014 a solid baseline. Re-read the reasoning on the ones you missed, looking for what the behaviour consistently PRODUCES versus what it PREVENTS.')
                        : __alloT('stem.schoolbehaviortoolkit.fn_res_more', ' \u2014 these distinctions take many examples. Re-read the four reference cards above, then the reasoning on each miss, and run it again.'))
              ),
              fnAnswered && h('button', {
                type: 'button',
                onClick: nextVignette,
                style: { marginTop: 10, padding: '9px 16px', borderRadius: 9, border: '1px solid #14b8a6', background: 'rgba(20,184,166,0.18)', color: '#5eead4', fontSize: 12, fontWeight: 800, cursor: 'pointer', minHeight: 40 }
              }, fnDone
                ? __alloT('stem.schoolbehaviortoolkit.start_over', '\u21BB Run it again')
                : __alloT('stem.schoolbehaviortoolkit.next_vignette', 'Next vignette \u2192'))
            )
          ),

          sourceFooter(__alloT('stem.schoolbehaviortoolkit.functions_footer', '\uD83C\uDFAF Function is a hypothesis, not a label. On a real case you confirm it with ABC data and, where the behaviour is dangerous or the hypothesis is contested, a functional analysis \u2014 under supervision. Matched intervention means the plan follows the function: escape-maintained behaviour is not fixed by taking away recess.'))
        );
      }

      // ── Section: BIP Template ──
      function renderBip() {
        return h('div', null,
          panelHeader('📑 BIP Template — the Tier 3 artifact',
            'The Behavior Intervention Plan is the document school psychs write most often at Tier 3. The FBA names the function; the BIP is the plan. Eight components in the order most commonly used in IDEA-compliant BIPs. Each component shows what to write + a sample entry + the most-common writing pitfall.'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            BIP_COMPONENTS.map(function(c) {
              var bipCardSpeech = 'Part ' + c.part + ', ' + c.name + '. What to write: ' + c.what + ' Common pitfall: ' + c.pitfall;
              return h('div', { key: 'bip-' + c.part,
                style: {
                  background: hcMode ? '#000000' : 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderRight: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderBottom: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderLeft: '4px solid ' + (hcMode ? '#ffff00' : c.color)
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                  h('div', { 'aria-hidden': 'true',
                    style: { width: 36, height: 36, borderRadius: '50%', background: hcMode ? '#000000' : c.color + '22', border: '1.5px solid ' + (hcMode ? '#ffff00' : c.color),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: hcMode ? '#ffff00' : c.color, fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                  }, c.part),
                  h('div', { style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, c.icon),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: hcMode ? '#ffff00' : c.color, lineHeight: 1.2, flex: 1 } }, c.name),
                  sbtReadBtn(h, speakText, bipCardSpeech, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_bip_part_aria', 'Read BIP guidance aloud: ') + c.name, hcMode)
                ),
                h('div', { style: { fontSize: 9, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.what_to_write', 'What to write')),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } }, c.what),
                h('div', {
                  style: {
                    padding: '8px 10px', borderRadius: 6,
                    background: hcMode ? '#000000' : c.color + '10',
                    borderLeft: '2px solid ' + (hcMode ? '#fbbf24' : c.color),
                    marginBottom: 8
                  }
                },
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: hcMode ? '#fbbf24' : c.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.sample_entry', '📝 Sample entry')),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, fontStyle: 'italic' } }, c.sample)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: hcMode ? '#000000' : 'rgba(251,146,60,0.06)', border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(251,146,60,0.20)'), fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } },
                  h('span', { style: { color: hcMode ? '#ffff00' : '#fb923c', fontWeight: 800, marginRight: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' } }, __alloT('stem.schoolbehaviortoolkit.common_pitfall_3', '🪤 Common pitfall:')),
                  c.pitfall)
              );
            })
          ),
          // ── Draft one + Live BIP Alignment & Ethics Auditor ──
          h('div', { style: { marginTop: 20, padding: 14, borderRadius: 10, background: hcMode ? '#000000' : 'rgba(15,23,42,0.6)', border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(20,184,166,0.30)') } },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 } },
              h('div', { style: { fontSize: 14, fontWeight: 900, color: hcMode ? '#ffff00' : '#5eead4' } },
                __alloT('stem.schoolbehaviortoolkit.bip_draft_h', '✏️ Draft the reasoning chain')),
              bipAudited && h('span', {
                style: { padding: '3px 9px', borderRadius: 999, background: hcMode ? '#000000' : 'rgba(34,197,94,0.16)', border: '1px solid ' + (hcMode ? '#00ff00' : '#22c55e'), color: hcMode ? '#00ff00' : '#4ade80', fontSize: 10.5, fontWeight: 800 }
              }, t('stem.schoolbehaviortoolkit.bip_audited_badge', '✓ Audit Passed'))
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: 11.5, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.55 } },
              __alloT('stem.schoolbehaviortoolkit.bip_draft_sub', 'Five steps, in order. Each one has to follow from the one before it — if the replacement behaviour does not get the student the same thing the problem behaviour got, the plan will not hold, however well written the rest of it is.')),

            (function () {
              var steps = [
                { key: 'behavior', title: __alloT('stem.schoolbehaviortoolkit.bip_s1', 'Step 1 — Target behaviour'),
                  prompt: __alloT('stem.schoolbehaviortoolkit.bip_s1_p', 'Describe it so two observers would count the same thing. Not "disruptive" — what does it look like?'),
                  ph: t('stem.schoolbehaviortoolkit.bip_s1_ph', 'Leaves seat without permission during independent work') },
                { key: 'antecedent', title: __alloT('stem.schoolbehaviortoolkit.bip_s2', 'Step 2 — Antecedent'),
                  prompt: __alloT('stem.schoolbehaviortoolkit.bip_s2_p', 'What reliably happens immediately before? Include the setting events that make it more likely.'),
                  ph: t('stem.schoolbehaviortoolkit.bip_s2_ph', 'Written task longer than half a page, after a non-preferred transition') },
                { key: 'func', title: __alloT('stem.schoolbehaviortoolkit.bip_s3', 'Step 3 — Hypothesised function'),
                  prompt: __alloT('stem.schoolbehaviortoolkit.bip_s3_p', 'What does the behaviour reliably GET or AVOID? A hypothesis you would test with ABC data, not a label.'),
                  ph: t('stem.schoolbehaviortoolkit.bip_s3_ph', 'Escape from extended writing demands') },
                { key: 'replacement', title: __alloT('stem.schoolbehaviortoolkit.bip_s4', 'Step 4 — Replacement behaviour'),
                  prompt: __alloT('stem.schoolbehaviortoolkit.bip_s4_p', 'What should the student do INSTEAD that gets the same function, faster and more reliably than the problem behaviour did?'),
                  ph: t('stem.schoolbehaviortoolkit.bip_s4_ph', 'Hands a break card to request a two-minute break') },
                { key: 'strategy', title: __alloT('stem.schoolbehaviortoolkit.bip_s5', 'Step 5 — Teaching and reinforcement'),
                  prompt: __alloT('stem.schoolbehaviortoolkit.bip_s5_p', 'How is the replacement taught, and how is it reinforced often enough at first to compete?'),
                  ph: t('stem.schoolbehaviortoolkit.bip_s5_ph', 'Pre-teach the card daily; honour every request immediately for two weeks, then thin') }
              ];
              var rawStep = Number(d.bipStep);
              var step = (Number.isInteger(rawStep) && rawStep >= 0) ? Math.min(steps.length, rawStep) : 0;
              var rawData = (d.bipData && typeof d.bipData === 'object' && !Array.isArray(d.bipData)) ? d.bipData : {};
              var data = {
                behavior: typeof rawData.behavior === 'string' ? rawData.behavior : '',
                antecedent: typeof rawData.antecedent === 'string' ? rawData.antecedent : '',
                func: typeof rawData.func === 'string' ? rawData.func : '',
                replacement: typeof rawData.replacement === 'string' ? rawData.replacement : '',
                strategy: typeof rawData.strategy === 'string' ? rawData.strategy : ''
              };
              var filledCount = [data.behavior, data.antecedent, data.func, data.replacement, data.strategy].filter(function(s) { return s.trim().length > 0; }).length;
              var audit = auditBipDraft(data);
              var isSample = d.bipIsSample === true;

              function renderAuditorPanel() {
                if (filledCount === 0) return null;
                var badgeColor = audit.ethicsFlagged || audit.readiness === 'needs_revision'
                  ? (hcMode ? '#ffff00' : '#f87171')
                  : audit.readiness === 'aligned'
                    ? (hcMode ? '#00ff00' : '#4ade80')
                    : (hcMode ? '#fbbf24' : '#38bdf8');
                var badgeLabel = audit.ethicsFlagged
                  ? t('stem.schoolbehaviortoolkit.bip_status_ethics_flag', '🛑 Maine Ch. 33 / Ethics Flag')
                  : audit.readiness === 'aligned'
                    ? t('stem.schoolbehaviortoolkit.bip_status_aligned', '✓ Aligned Draft')
                    : audit.readiness === 'developing'
                      ? t('stem.schoolbehaviortoolkit.bip_status_developing', '◐ Developing — Tighten Links')
                      : t('stem.schoolbehaviortoolkit.bip_status_revise', '⚠ Needs Revision');
                var auditSpeech = 'BIP Alignment and Ethics Audit score: ' + audit.score + ' out of ' + audit.maxScore + '. ' + audit.summary + ' Top coaching priority: ' + audit.nextPriority;

                return h('div', {
                  style: {
                    marginTop: 14, padding: '12px 14px', borderRadius: 10,
                    background: hcMode ? '#000000' : 'rgba(2,6,23,0.68)',
                    border: '1.5px solid ' + (audit.ethicsFlagged ? (hcMode ? '#ffff00' : '#ef4444') : (hcMode ? '#fbbf24' : 'rgba(45,212,191,0.34)'))
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
                    h('div', null,
                      h('div', { style: { fontSize: 12.5, fontWeight: 900, color: hcMode ? '#ffff00' : '#5eead4' } },
                        t('stem.schoolbehaviortoolkit.bip_auditor_h', '🛡️ Live BIP Alignment & Ethics Auditor')),
                      h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2 } },
                        t('stem.schoolbehaviortoolkit.bip_auditor_sub', 'Deterministic check of observability, setting events, functional equivalence, consequence alignment, and Maine Ch. 33 safety.'))
                    ),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                      h('span', { style: { padding: '4px 10px', borderRadius: 999, background: hcMode ? '#000000' : badgeColor + '22', border: '1px solid ' + badgeColor, color: badgeColor, fontSize: 11, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace' } },
                        audit.score + '/' + audit.maxScore + ' · ' + badgeLabel),
                      sbtReadBtn(h, speakText, auditSpeech, t('stem.schoolbehaviortoolkit.read_audit', 'Read audit'), t('stem.schoolbehaviortoolkit.read_bip_audit_aria', 'Read BIP alignment and ethics audit aloud'), hcMode)
                    )
                  ),

                  // Function equivalence bridge strip
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, fontSize: 11 } },
                    h('span', { style: { padding: '3px 9px', borderRadius: 6, background: hcMode ? '#000000' : 'rgba(15,23,42,0.8)', border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(148,163,184,0.32)'), color: 'var(--allo-stem-text, #e2e8f0)', fontWeight: 700 } },
                      t('stem.schoolbehaviortoolkit.bip_detected_target_fn', 'Target Function: ') + (audit.detectedTargetFunction || t('stem.schoolbehaviortoolkit.bip_fn_unset', 'Not yet identified'))),
                    h('span', { style: { padding: '3px 9px', borderRadius: 6, background: hcMode ? '#000000' : 'rgba(15,23,42,0.8)', border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(148,163,184,0.32)'), color: 'var(--allo-stem-text, #e2e8f0)', fontWeight: 700 } },
                      t('stem.schoolbehaviortoolkit.bip_detected_rep_fn', 'Replacement Function: ') + (audit.detectedReplacementFunction || t('stem.schoolbehaviortoolkit.bip_fn_unset', 'Not yet identified')))
                  ),

                  // Critical Maine Ch. 33 Ethics Alert banner
                  audit.ethicsFlagged && h('div', {
                    role: 'alert',
                    style: {
                      padding: '10px 12px', borderRadius: 8, marginBottom: 10,
                      background: hcMode ? '#000000' : 'rgba(239,68,68,0.18)',
                      border: '1.5px solid ' + (hcMode ? '#ffff00' : '#ef4444'),
                      color: hcMode ? '#ffff00' : '#fecaca', fontSize: 11.5, lineHeight: 1.55
                    }
                  },
                    h('strong', null, t('stem.schoolbehaviortoolkit.bip_ch33_alert_h', '🚨 Maine Chapter 33 Safety & Ethics Guard Triggered: ')),
                    audit.flaggedTerms.join('; ') + '. ' + t('stem.schoolbehaviortoolkit.bip_ch33_alert_body', 'Restraint, seclusion, locked rooms, and aversive deprivation can NEVER be written as planned BIP consequences.')
                  ),

                  // 5 rubric checks
                  h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 } },
                    audit.checks.map(function(chk) {
                      var col = chk.status === 'pass' ? (hcMode ? '#00ff00' : '#4ade80') : chk.status === 'warn' ? (hcMode ? '#fbbf24' : '#fbbf24') : (hcMode ? '#ffff00' : '#f87171');
                      var ico = chk.status === 'pass' ? '✓' : chk.status === 'warn' ? '⚠' : '✗';
                      return h('div', {
                        key: 'audit-' + chk.id,
                        style: {
                          padding: '8px 10px', borderRadius: 7,
                          background: hcMode ? '#000000' : 'rgba(15,23,42,0.72)',
                          border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.28)'),
                          borderLeft: '3px solid ' + col
                        }
                      },
                        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 } },
                          h('span', { style: { fontSize: 11, fontWeight: 800, color: col } }, ico + ' ' + chk.label),
                          h('span', { style: { fontSize: 10.5, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace', color: col } }, chk.score + '/' + chk.maxScore)
                        ),
                        h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.45, marginBottom: 3 } }, chk.finding),
                        h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.45, fontStyle: 'italic' } },
                          t('stem.schoolbehaviortoolkit.bip_coaching_prefix', 'Coaching: ') + chk.coaching)
                      );
                    })
                  ),

                  // Verify button for persisted BIP Auditor XP
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #cbd5e1)', flex: 1, minWidth: 200 } }, audit.summary),
                    h('button', {
                      type: 'button',
                      onClick: function() {
                        if (audit.ethicsFlagged) {
                          if (addToast) addToast(t('stem.schoolbehaviortoolkit.bip_audit_blocked_toast', '🚨 Remove Maine Ch. 33 safety/ethics flags before verifying this draft.'), 'info');
                          return;
                        }
                        if (audit.score < 75) {
                          if (addToast) addToast(t('stem.schoolbehaviortoolkit.bip_audit_low_toast', '📝 Score is under 75/100 — strengthen the flagged steps above, then verify again.'), 'info');
                          return;
                        }
                        if (isSample) {
                          if (addToast) addToast(t('stem.schoolbehaviortoolkit.bip_audit_edit_sample_toast', '✏️ Edit this sample into your own student case to earn BIP Auditor credit.'), 'info');
                          return;
                        }
                        if (!bipAudited) {
                          onPassBipAudit();
                        } else if (addToast) {
                          addToast(t('stem.schoolbehaviortoolkit.bip_audit_already_verified', '✓ BIP draft passes alignment & Maine Ch. 33 ethics checks.'), 'success');
                        }
                      },
                      style: {
                        padding: '8px 14px', minHeight: 38, borderRadius: 8,
                        background: hcMode ? '#00ff00' : '#14b8a6', color: '#000000',
                        border: 'none', fontSize: 11.5, fontWeight: 800, cursor: 'pointer'
                      }
                    }, t('stem.schoolbehaviortoolkit.bip_verify_audit_btn', '🛡️ Verify BIP Alignment & Ethics'))
                  )
                );
              }

              var sampleControls = !isAssessmentLocked && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
                h('button', {
                  type: 'button',
                  onClick: function() { setSBT({ bipData: Object.assign({}, BIP_AUDIT_SAMPLES.aligned), bipStep: steps.length, bipIsSample: true }); },
                  style: { padding: '6px 11px', minHeight: 34, borderRadius: 7, border: '1px solid ' + (hcMode ? '#00ff00' : 'rgba(34,197,94,0.45)'), background: hcMode ? '#000000' : 'rgba(34,197,94,0.12)', color: hcMode ? '#00ff00' : '#86efac', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                }, t('stem.schoolbehaviortoolkit.bip_load_aligned_sample', '📋 Inspect aligned sample')),
                h('button', {
                  type: 'button',
                  onClick: function() { setSBT({ bipData: Object.assign({}, BIP_AUDIT_SAMPLES.flawed), bipStep: steps.length, bipIsSample: true }); },
                  style: { padding: '6px 11px', minHeight: 34, borderRadius: 7, border: '1px solid ' + (hcMode ? '#ffff00' : 'rgba(248,113,113,0.45)'), background: hcMode ? '#000000' : 'rgba(248,113,113,0.12)', color: hcMode ? '#ffff00' : '#fca5a5', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                }, t('stem.schoolbehaviortoolkit.bip_load_flawed_sample', '⚠️ Inspect flawed / Ch. 33 violation sample'))
              );

              if (step < steps.length) {
                var st = steps[step];
                return h('div', null,
                  sampleControls,
                  h('div', { style: { display: 'flex', gap: 4, marginBottom: 10 } },
                    steps.map(function (x, i) {
                      return h('div', { key: 'dot-' + i, 'aria-hidden': 'true',
                        style: { flex: 1, height: 4, borderRadius: 2, background: i < step ? '#14b8a6' : i === step ? '#5eead4' : 'rgba(100,116,139,0.35)' } });
                    })),
                  h('label', { htmlFor: 'sbt-bip-step', style: { display: 'block', fontSize: 12.5, fontWeight: 800, color: hcMode ? '#ffff00' : '#5eead4', marginBottom: 4 } }, st.title),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.55, marginBottom: 8 } }, st.prompt),
                  h('textarea', {
                    id: 'sbt-bip-step',
                    value: data[st.key] || '',
                    placeholder: st.ph,
                    onChange: function (e) {
                      var next = Object.assign({}, data);
                      next[st.key] = e.target.value;
                      setSBT({ bipData: next, bipIsSample: false });
                    },
                    style: { width: '100%', minHeight: 76, padding: 10, borderRadius: 8, background: hcMode ? '#000000' : 'rgba(15,23,42,0.85)', border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.4)'), color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 12, lineHeight: 1.5, resize: 'vertical' }
                  }),
                  h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
                    step > 0 && h('button', {
                      type: 'button',
                      onClick: function () { setSBT({ bipStep: step - 1 }); },
                      'aria-label': __alloT('stem.schoolbehaviortoolkit.bip_back', 'Back a step'),
                      style: { padding: '8px 14px', minHeight: 40, borderRadius: 8, border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.4)'), background: hcMode ? '#000000' : 'rgba(15,23,42,0.7)', color: hcMode ? '#ffffff' : 'var(--allo-stem-text-soft, #94a3b8)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }
                    }, __alloT('stem.schoolbehaviortoolkit.bip_back_label', '← Back')),
                    h('button', {
                      type: 'button',
                      onClick: function () {
                        if (!String(data[st.key] || '').trim()) {
                          if (addToast) addToast(__alloT('stem.schoolbehaviortoolkit.bip_fill_first', '✏️ Fill in this step first.'), 'info');
                          return;
                        }
                        setSBT({ bipStep: step + 1 });
                      },
                      style: { padding: '8px 14px', minHeight: 40, borderRadius: 8, border: '1px solid ' + (hcMode ? '#ffff00' : '#14b8a6'), background: hcMode ? '#00ff00' : 'rgba(20,184,166,0.18)', color: hcMode ? '#000000' : '#5eead4', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }
                    }, step === steps.length - 1
                      ? __alloT('stem.schoolbehaviortoolkit.bip_finish', 'See the chain →')
                      : __alloT('stem.schoolbehaviortoolkit.bip_next', 'Next step →'))
                  ),
                  renderAuditorPanel()
                );
              }

              // ── Summary + Full Auditor ──
              return h('div', null,
                sampleControls,
                h('div', { style: { fontSize: 12.5, fontWeight: 800, color: hcMode ? '#ffff00' : '#5eead4', marginBottom: 4 } },
                  __alloT('stem.schoolbehaviortoolkit.bip_chain_h', '✅ Your reasoning chain — practice draft')),
                h('div', { style: { fontSize: 10.5, lineHeight: 1.55, color: 'var(--allo-stem-text-soft, #94a3b8)', borderLeft: '3px solid #fb923c', paddingLeft: 9, marginBottom: 10 } },
                  __alloT('stem.schoolbehaviortoolkit.bip_chain_scope', 'This is the reasoning, not the plan. A plan a team can run also needs the other components above — baseline data, response procedures, a crisis plan, fidelity and review — plus the student and family in the conversation and a supervising professional. Do not paste this into a real BIP.')),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  steps.map(function (x, i) {
                    return h('div', { key: 'sum-' + x.key,
                      style: { padding: '9px 11px', borderRadius: 8, background: hcMode ? '#000000' : 'rgba(15,23,42,0.75)', border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.3)') } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 } },
                        h('div', { style: { fontSize: 9.5, fontWeight: 800, color: hcMode ? '#ffff00' : '#5eead4', textTransform: 'uppercase', letterSpacing: '0.06em' } }, x.title),
                        h('button', {
                          type: 'button',
                          onClick: function() { setSBT({ bipStep: i }); },
                          style: { padding: '3px 8px', minHeight: 28, borderRadius: 6, border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(148,163,184,0.35)'), background: 'transparent', color: hcMode ? '#ffffff' : '#94a3b8', fontSize: 10, fontWeight: 700, cursor: 'pointer' }
                        }, t('stem.schoolbehaviortoolkit.bip_edit_step', 'Edit'))
                      ),
                      h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } },
                        data[x.key] || '—'));
                  })),
                renderAuditorPanel(),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
                  h('button', {
                    type: 'button',
                    onClick: function () { setSBT({ bipStep: 0 }); },
                    style: { padding: '8px 14px', minHeight: 40, borderRadius: 8, border: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.4)'), background: hcMode ? '#000000' : 'rgba(15,23,42,0.7)', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }
                  }, __alloT('stem.schoolbehaviortoolkit.bip_edit', '✏️ Edit')),
                  h('button', {
                    type: 'button',
                    onClick: function () { setSBT({ bipStep: 0, bipData: {}, bipIsSample: false }); },
                    style: { padding: '8px 14px', minHeight: 40, borderRadius: 8, border: '1px solid ' + (hcMode ? '#ffff00' : 'rgba(248,113,113,0.5)'), background: hcMode ? '#000000' : 'rgba(248,113,113,0.12)', color: hcMode ? '#ffff00' : '#fca5a5', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }
                  }, __alloT('stem.schoolbehaviortoolkit.bip_new', '↻ Start over'))
                )
              );
            })()
          ),
          sourceFooter('🎯 The BIP rule of thumb: every component must trace back to the function statement. If a strategy in the BIP cannot be defended by reference to the FBA hypothesis, it does not belong. The BIP is one document but it asks one question across all eight parts: how do we make the replacement behavior more efficient than the problem behavior? Sources: BACB ethical practice standards; PBIS.org BIP technical guide; OSEP BIP guidance; Iris Center BIP module.')
        );
      }

      // ── Section: CICO Template ──
      function renderCico() {
        return h('div', null,
          panelHeader('📋 CICO — Check-In/Check-Out template',
            'The most-used Tier 2 intervention in US schools. PBIS panel mentions it; this section makes the structure concrete enough to actually run. Five steps, each with what-to-do, sample script language, and the most-common pitfall.'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            CICO_COMPONENTS.map(function(c) {
              return h('div', { key: 'cico-' + c.step,
                style: {
                  background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid rgba(100,116,139,0.25)', borderRight: '1px solid rgba(100,116,139,0.25)', borderBottom: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + c.color
                } },
                // Step header
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('div', { 'aria-hidden': 'true',
                    style: { width: 36, height: 36, borderRadius: '50%', background: c.color + '22', border: '1.5px solid ' + c.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: c.color, fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                  }, c.step),
                  h('div', { style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, c.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: c.color, lineHeight: 1.2 } }, c.name),
                    h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic', fontFamily: 'ui-monospace, Menlo, monospace' } }, '⏱ ' + c.time)
                  )
                ),
                // What
                h('div', { style: { fontSize: 9, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.what_it_looks_like', 'What it looks like')),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } }, c.what),
                // Script — quoted in monospace italic, clearly distinct
                h('div', {
                  style: {
                    padding: '8px 10px', borderRadius: 6,
                    background: c.color + '10',
                    borderLeft: '2px solid ' + c.color,
                    marginBottom: 8
                  }
                },
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, __alloT('stem.schoolbehaviortoolkit.sample_script', '🗣 Sample script')),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, fontStyle: 'italic' } }, c.script)
                ),
                // Pitfall
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.20)', fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.5 } },
                  h('span', { style: { color: '#fb923c', fontWeight: 800, marginRight: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' } }, __alloT('stem.schoolbehaviortoolkit.common_pitfall_4', '🪤 Common pitfall:')),
                  c.pitfall)
              );
            })
          ),
          sourceFooter('🎯 The CICO rule of thumb: at intake, set the goal threshold to where the student can hit it ~70% of days in the first two weeks. Adjust based on actual baseline data, not aspirational policy. Most CICO programs that fail, fail at intake (threshold too high) or at fade (threshold removed too fast). Sources: Crone & Hawken Behavior Education Program; Center on PBIS implementation guides.')
        );
      }

      // ── Section: Equity & Disparities ──
      function renderEquity() {
        return h('div', null,
          panelHeader('⚖️ Equity & Disparities — the data school psychs need to see',
            'Federal data on race × disability × discipline disparities. The largest single source of system-level harm in K-12 behavior practice. Every school psych working in IEP teams should know these numbers.'),
          // Data findings
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 } },
            EQUITY_DATA.map(function(eq, i) {
              return h('div', { key: 'eq-' + i,
                style: {
                  background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid rgba(100,116,139,0.25)', borderRight: '1px solid rgba(100,116,139,0.25)', borderBottom: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + eq.color
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  circularBadge(eq.icon, eq.color, 36),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: eq.color, lineHeight: 1.2 } }, eq.finding)
                ),
                h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', fontWeight: 700, lineHeight: 1.45, marginBottom: 8, padding: '8px 10px', background: eq.color + '12', borderLeft: '3px solid ' + eq.color, borderRadius: 6 } }, eq.stat),
                h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, marginBottom: 8 } }, eq.detail),
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #64748b)', fontStyle: 'italic', lineHeight: 1.5, paddingTop: 6, borderTop: '1px dashed rgba(100,116,139,0.25)' } },
                  '📚 ', eq.source)
              );
            })
          ),
          // Audit questions
          h('div', { style: {
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(20,184,166,0.08)',
            borderTop: '1px solid rgba(20,184,166,0.30)', borderRight: '1px solid rgba(20,184,166,0.30)', borderBottom: '1px solid rgba(20,184,166,0.30)', borderLeft: '4px solid #14b8a6'
          } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              circularBadge('🔍', '#14b8a6', 36),
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#5eead4' } }, __alloT('stem.schoolbehaviortoolkit.school_psych_equity_audit_five_questio', 'School-psych equity audit — five questions'))
            ),
            h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' } },
              __alloT('stem.schoolbehaviortoolkit.practical_questions_to_bring_into_your', 'Practical questions to bring into your next discipline-data review or PBIS team meeting. The federal numbers describe the pattern. These questions help your building see where your specific patterns sit and what to do about them.')),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              EQUITY_AUDIT_QUESTIONS.map(function(eaq, i) {
                return h('div', { key: 'eaq-' + i,
                  style: { background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(100,116,139,0.25)' } },
                  h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 } },
                    h('div', { 'aria-hidden': 'true',
                      style: { width: 24, height: 24, borderRadius: '50%', background: 'rgba(20,184,166,0.18)', border: '1.5px solid #14b8a6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#5eead4', fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                    }, i + 1),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', fontWeight: 700, lineHeight: 1.55, flex: 1 } }, eaq.q)
                  ),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.55, fontStyle: 'italic', paddingLeft: 34 } },
                    h('span', { style: { color: '#5eead4', fontWeight: 700, marginRight: 4 } }, 'Why:'),
                    eaq.why)
                );
              })
            )
          ),
          sourceFooter('🎯 The pattern across all five findings: discipline disparities are most concentrated where adult judgment, not bright-line rules, drives the decision. Subjective offense categories. Manifestation determinations. Restraint authorization decisions. The intervention is rarely "stricter discipline policy." It is more often "tighter referral-decision review, deeper FBA practice, and explicit attention to the pattern of who is making which calls in which classrooms."')
        );
      }

      // ── Section: Maine Resources ──
      function renderMaine() {
        return h('div', null,
          panelHeader('🦞 Maine Resources — local-specific compliance + contacts',
            'Maine-specific Chapter 33 detail beyond the summary, the state-level compliance map, Wabanaki considerations for IEP teams, the crisis-resource list Maine school psychs actually use, and Portland Public Schools / King Middle context. National content lives elsewhere; this is the local layer.'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            MAINE_RESOURCES.map(function(group, gi) {
              var groupSpeech = group.group + '. ' + group.bullets.join(' ');
              return h('div', { key: 'maine-' + gi,
                style: {
                  background: hcMode ? '#000000' : 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  borderTop: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderRight: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderBottom: '1px solid ' + (hcMode ? '#fbbf24' : 'rgba(100,116,139,0.25)'),
                  borderLeft: '4px solid ' + (hcMode ? '#ffff00' : group.color)
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
                  circularBadge(group.icon, group.color, 36),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: hcMode ? '#ffff00' : group.color, lineHeight: 1.2, flex: 1 } }, group.group),
                  sbtReadBtn(h, speakText, groupSpeech, t('stem.schoolbehaviortoolkit.read_aloud', 'Read aloud'), t('stem.schoolbehaviortoolkit.read_maine_card_aria', 'Read Maine resource card aloud: ') + group.group, hcMode)
                ),
                h('ul', { style: { margin: 0, paddingLeft: 18, color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 11, lineHeight: 1.65 } },
                  group.bullets.map(function(b, bi) {
                    return h('li', { key: gi + '-' + bi, style: { marginBottom: 6 } }, b);
                  })
                )
              );
            })
          ),
          sourceFooter('🎯 The local-content rule of thumb: federal IDEA + national PBIS + ABA practice standards apply everywhere, but the actual operational reality for a Maine student in a Portland classroom is shaped by Maine state ed code (MUSER), Maine Chapter 33, the four Wabanaki Nations\' presence in Maine, the Maine crisis system, and Aaron\'s specific PPS / King Middle context. Generic national resources are insufficient; this layer is required.')
        );
      }

      // ── Section: Connect (cross-tool navigation) ──
      function renderConnect() {
        return h('div', null,
          panelHeader('🔗 Connect — three connected spaces',
            'School Behavior Toolkit teaches what school psychs and educators DO. Two sister spaces handle the science and the voices.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 } },
            // BehaviorLab — the science
            h('div', { style: { background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 16, borderTop: '1px solid rgba(251,146,60,0.30)', borderRight: '1px solid rgba(251,146,60,0.30)', borderBottom: '1px solid rgba(251,146,60,0.30)', borderLeft: '4px solid #fb923c' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                circularBadge('🐭', '#fb923c', 44),
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fb923c' } }, 'BehaviorLab'),
                  h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic', marginTop: 2 } }, __alloT('stem.schoolbehaviortoolkit.stem_lab_behavioral_science', 'STEAM Lab → Behavioral Science'))
                )
              ),
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } },
                __alloT('stem.schoolbehaviortoolkit.the_science_of_operant_conditioning_sk', 'The science of operant conditioning — Skinner-box simulation, schedules of reinforcement, shaping, extinction, FBA practice. The mechanics behind what this Toolkit applies in K-12 settings.')),
              h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } }, __alloT('stem.schoolbehaviortoolkit.9_progressive_levels_schedule_sleuth_f', '9 progressive levels · Schedule Sleuth · Function Sleuth · Glossary · Ethics'))
            ),
            // Disability Voices — the people
            h('div', { style: { background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 16, borderTop: '1px solid rgba(244,114,182,0.30)', borderRight: '1px solid rgba(244,114,182,0.30)', borderBottom: '1px solid rgba(244,114,182,0.30)', borderLeft: '4px solid #f472b6' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                circularBadge('🎤', '#f472b6', 44),
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: '#f472b6' } }, __alloT('stem.schoolbehaviortoolkit.disability_voices', 'Disability Voices')),
                  h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic', marginTop: 2 } }, __alloT('stem.schoolbehaviortoolkit.sel_hub_identity_care', 'SEL Hub → Identity & Care'))
                )
              ),
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55, marginBottom: 8 } },
                __alloT('stem.schoolbehaviortoolkit.real_autistic_and_disabled_advocates_w', 'Real autistic and disabled advocates whose work shaped — and critiqued — disability practice. Centered as persons, not behavioral subjects. Read here for the human side of the work.')),
              h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } }, __alloT('stem.schoolbehaviortoolkit.ari_ne_eman_temple_grandin_damian_milt', 'Ari Ne\'eman · Temple Grandin · Damian Milton · Henny Kupferstein · Kassiane Asasumasu · Mel Baggs · Ly Xīnzhèn M. Zhǎngsūn Brown · Patty Berne'))
            )
          ),
          h('div', { style: { marginTop: 14, padding: 14, borderRadius: 10, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.30)', color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 11, lineHeight: 1.65 } },
            h('div', { style: { fontWeight: 800, color: '#5eead4', marginBottom: 6 } }, __alloT('stem.schoolbehaviortoolkit.why_three_separate_spaces', '🧭 Why three separate spaces')),
            __alloT('stem.schoolbehaviortoolkit.putting_skinner_box_imagery_applied_k_', 'Putting Skinner-box imagery, applied K-12 practice, and named real autistic adults all in one tool would be exactly the dehumanizing arc the disability community has critiqued: animal-conditioning visuals → "applied" → and the people we apply it to. Splitting them into three connected but distinct spaces is a deliberate ethical choice. The science is the science (BehaviorLab). The K-12 practice is school-psych work (this Toolkit). The voices are the people (Disability Voices in SEL Hub). All three matter. None should crowd the others.')
          )
        );
      }

      var content;
      if (section === 'replacement') content = renderReplacement();
      else if (section === 'setting') content = renderSetting();
      else if (section === 'cycle') content = renderCycle();
      else if (section === 'restraint') content = renderRestraint();
      else if (section === 'fba') content = renderFba();
      else if (section === 'functions') content = renderFunctions();
      else if (section === 'tokens') content = renderTokens();
      else if (section === 'bip') content = renderBip();
      else if (section === 'cico') content = renderCico();
      else if (section === 'equity') content = renderEquity();
      else if (section === 'maine') content = renderMaine();
      else if (section === 'connect') content = renderConnect();
      else if (section === 'inquiry') content = renderBehaviorInquiry();
      else content = renderPbis();

      function renderBehaviorInquiry() {
        var rawIq = (d.behIQ && typeof d.behIQ === 'object' && !Array.isArray(d.behIQ)) ? d.behIQ : {};
        var clampInt = function(val, min, max, fb) {
          var n = Number(val);
          return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fb;
        };
        var iq = {
          tier: clampInt(rawIq.tier, 1, 3, 2),
          intensity: clampInt(rawIq.intensity, 1, 10, 5),
          functionConfidence: clampInt(rawIq.functionConfidence, 1, 10, 5),
          environmentStability: clampInt(rawIq.environmentStability, 1, 10, 5),
          hypothesis: typeof rawIq.hypothesis === 'string' ? rawIq.hypothesis : '',
          stuckRevealed: !!rawIq.stuckRevealed,
          understood: !!rawIq.understood,
          explanation: typeof rawIq.explanation === 'string' ? rawIq.explanation : '',
          log: Array.isArray(rawIq.log) ? rawIq.log.filter(function(item) { return item && typeof item === 'object'; }) : []
        };
        function setIQ(patch) { setSBT({ behIQ: Object.assign({}, iq, patch) }); }
        function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
        // intervention fit: tier appropriateness for intensity, function confidence required at higher tiers
        var tierMatch = (iq.tier === 1 && iq.intensity < 4) || (iq.tier === 2 && iq.intensity >= 3 && iq.intensity <= 7) || (iq.tier === 3 && iq.intensity >= 6);
        var fbaNeeded = iq.tier === 3;
        var ready = tierMatch && (!fbaNeeded || iq.functionConfidence >= 7) && iq.environmentStability >= 4;
        var state = !tierMatch ? 'tiermismatch' : fbaNeeded && iq.functionConfidence < 5 ? 'fbafirst' : ready ? 'implementable' : iq.environmentStability < 4 ? 'unstable' : 'partial';
        var sm = ({
          tiermismatch: { label: __alloT('stem.schoolbehaviortoolkit.tier_mismatch', 'Tier mismatch'), color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: __alloT('stem.schoolbehaviortoolkit.selected_tier_does_not_match_observed_', 'Selected tier does not match observed intensity. Move up (under-supporting) or down (over-pathologizing) accordingly.') },
          fbafirst: { label: __alloT('stem.schoolbehaviortoolkit.fba_needed_first', 'FBA needed first'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: __alloT('stem.schoolbehaviortoolkit.tier_3_bip_requires_function_knowledge', 'Tier 3 BIP requires function knowledge. Function confidence below 7 means you cannot ethically design a function-based plan yet.') },
          unstable: { label: __alloT('stem.schoolbehaviortoolkit.environment_too_unstable', 'Environment too unstable'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: __alloT('stem.schoolbehaviortoolkit.any_plan_will_look_like_it_failed_if_t', 'Any plan will look like it failed if the setting events are constantly shifting. Stabilize the environment before measuring outcomes.') },
          partial: { label: __alloT('stem.schoolbehaviortoolkit.partially_ready', 'Partially ready'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: __alloT('stem.schoolbehaviortoolkit.most_pieces_in_place_address_the_weake', 'Most pieces in place. Address the weakest dimension before going live.') },
          implementable: { label: __alloT('stem.schoolbehaviortoolkit.implementable_plan', 'Implementable plan'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: __alloT('stem.schoolbehaviortoolkit.tier_matched_to_intensity_function_con', 'Tier matched to intensity, function confidence adequate, environment stable enough. Pilot the plan with progress monitoring.') }
        })[state];
        return h('div', { style: { padding: 14, borderRadius: 12, background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
          h('h3', { style: { margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: sm.color, textTransform: 'uppercase', letterSpacing: 1 } }, __alloT('stem.schoolbehaviortoolkit.behavior_plan_inquiry_is_this_plan_rea', '🧪 Behavior Plan Inquiry — Is This Plan Ready to Pilot?')),
          h('p', { style: { margin: '0 0 8px', fontSize: 12, opacity: 0.85, lineHeight: 1.4 } }, __alloT('stem.schoolbehaviortoolkit.set_tier_observed_intensity_function_c', 'Set tier, observed intensity, function confidence, and environment stability, then observe how modeled plan readiness changes. The result updates live; record a hypothesis or pattern you notice.')),
          h('div', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: sm.color, color: '#000', fontSize: 12, fontWeight: 800, marginBottom: 6 } }, sm.label),
          h('p', { style: { margin: '0 0 10px', fontSize: 11, opacity: 0.8 } }, sm.desc),
          (function() {
            var hcI = hcMode;
            return h('svg', { width: '100%', viewBox: '0 0 480 124', role: 'img', 'aria-label': __alloT('stem.schoolbehaviortoolkit.a11y_pbis_three_tier_support_diagram_showing_univers', 'PBIS three-tier support diagram showing universal, targeted, and intensive tiers'), style: { background: hcI ? '#000000' : '#080e1d', border: hcI ? '2px solid #ffff00' : '1px solid rgba(148,163,184,0.28)', borderRadius: 10, marginBottom: 10, maxHeight: 140, height: 'auto', display: 'block' } },
              !hcI && h('defs', null,
                h('linearGradient', { id: 'sbt-iq-well', x1: '0', y1: '0', x2: '0', y2: '1' },
                  h('stop', { offset: '0%', stopColor: '#111b31' }),
                  h('stop', { offset: '100%', stopColor: '#030712' })
                ),
                h('linearGradient', { id: 'sbt-iq-bar-0', x1: '0', y1: '0', x2: '1', y2: '0' },
                  h('stop', { offset: '0%', stopColor: '#f59e0b' }),
                  h('stop', { offset: '100%', stopColor: '#fb923c' })
                ),
                h('linearGradient', { id: 'sbt-iq-bar-1', x1: '0', y1: '0', x2: '1', y2: '0' },
                  h('stop', { offset: '0%', stopColor: '#0284c7' }),
                  h('stop', { offset: '100%', stopColor: '#38bdf8' })
                ),
                h('linearGradient', { id: 'sbt-iq-bar-2', x1: '0', y1: '0', x2: '1', y2: '0' },
                  h('stop', { offset: '0%', stopColor: '#16a34a' }),
                  h('stop', { offset: '100%', stopColor: '#4ade80' })
                ),
                h('linearGradient', { id: 'sbt-iq-sheen', x1: '0', y1: '0', x2: '1', y2: '0' },
                  h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0 }),
                  h('stop', { offset: '50%', stopColor: '#ffffff', stopOpacity: 0.45 }),
                  h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 })
                ),
                [
                  { val: iq.intensity, y: 24 },
                  { val: iq.functionConfidence, y: 50 },
                  { val: iq.environmentStability, y: 76 }
                ].map(function(m, idx) {
                  var cbw = Math.max(4, Math.round((m.val / 10) * 92));
                  return h('clipPath', { key: 'bc-' + idx, id: 'sbt-iq-clip-' + idx },
                    h('rect', { x: 358, y: m.y, width: cbw, height: 13, rx: 6.5 })
                  );
                })
              ),
              h('rect', { x: 0, y: 0, width: 480, height: 124, rx: 10, fill: hcI ? '#000000' : 'url(#sbt-iq-well)' }),
              // Phase escalation connector dashes + chevron links between tiers
              [100, 190].map(function(cx, ci) {
                return h('g', { key: 'ch-' + ci },
                  !hcI && !reduceMotion && h('line', { className: 'sbt-svg-fx sbt-goal-flow', x1: cx - 5, y1: 50, x2: cx + 6, y2: 50, stroke: sm.color, strokeWidth: 1.8, strokeDasharray: '3 3', opacity: 0.72 }),
                  h('polygon', { points: (cx - 2) + ',46 ' + (cx + 4) + ',50 ' + (cx - 2) + ',54', fill: hcI ? '#ffff00' : '#64748b' })
                );
              }),
              [1, 2, 3].map(function(tier) {
                var x = 16 + (tier - 1) * 90;
                var w = 80;
                var active = iq.tier === tier;
                var tAcc = tier === 1 ? '#22c55e' : tier === 2 ? '#fbbf24' : '#f87171';
                return h('g', { key: 't' + tier },
                  !hcI && !reduceMotion && active && h('rect', { className: 'sbt-svg-fx sbt-beacon-calm', x: x - 3, y: 15, width: w + 6, height: 70, rx: 11, fill: sm.color, opacity: 0.24 }),
                  h('rect', { x: x, y: 18, width: w, height: 64, rx: 9, fill: active ? (hcI ? '#00ff00' : sm.color) : (hcI ? '#000000' : '#111827'), stroke: active ? (hcI ? '#ffff00' : '#ffffff') : (hcI ? '#ffff00' : '#334155'), strokeWidth: active ? 2 : 1.2 }),
                  !active && h('rect', { x: x + 10, y: 18, width: w - 20, height: 3, rx: 1.5, fill: hcI ? '#ffff00' : tAcc }),
                  !hcI && active && h('rect', { className: 'sbt-svg-fx', x: x + 4, y: 20, width: w - 8, height: 6, rx: 3, fill: '#ffffff', opacity: 0.28 }),
                  h('text', { x: x + w / 2, y: 46, fill: active ? '#000000' : '#e2e8f0', fontSize: 12.5, fontWeight: 900, textAnchor: 'middle' }, 'Tier ' + tier),
                  h('text', { x: x + w / 2, y: 65, fill: active ? '#0f172a' : (hcI ? '#ffff00' : '#94a3b8'), fontSize: 10.5, fontWeight: 700, textAnchor: 'middle' }, tier === 1 ? 'Universal' : tier === 2 ? 'Targeted' : 'Intensive')
                );
              }),
              // Vertical studio divider between tier deck and live telemetry bars
              h('line', { x1: 286, y1: 16, x2: 286, y2: 88, stroke: hcI ? '#ffff00' : 'rgba(148,163,184,0.22)', strokeWidth: 1 }),
              // Right-hand beveled live telemetry bars (Intensity, FBA Confidence, Env Stability)
              [
                { label: 'Intensity', val: iq.intensity, y: 24, col: '#fb923c' },
                { label: 'FBA Conf.', val: iq.functionConfidence, y: 50, col: '#38bdf8' },
                { label: 'Env Stab.', val: iq.environmentStability, y: 76, col: '#4ade80' }
              ].map(function(m, idx) {
                var bw = Math.max(4, Math.round((m.val / 10) * 92));
                return h('g', { key: 'm-' + idx },
                  h('text', { x: 294, y: m.y + 10, fill: hcI ? '#ffffff' : '#cbd5e1', fontSize: 10.5, fontWeight: 700 }, m.label),
                  h('rect', { x: 358, y: m.y, width: 92, height: 13, rx: 6.5, fill: hcI ? '#000000' : '#0f172a', stroke: hcI ? '#ffff00' : '#334155', strokeWidth: 0.9 }),
                  h('rect', { x: 358, y: m.y, width: bw, height: 13, rx: 6.5, fill: hcI ? '#00ff00' : 'url(#sbt-iq-bar-' + idx + ')' }),
                  !hcI && !reduceMotion && bw > 10 && h('g', { clipPath: 'url(#sbt-iq-clip-' + idx + ')', className: 'sbt-svg-fx' },
                    h('rect', { className: 'sbt-sheen-bar', x: 358, y: m.y, width: 28, height: 13, fill: 'url(#sbt-iq-sheen)', style: { animationDelay: (idx * 0.7) + 's' } })
                  ),
                  !hcI && bw > 10 && h('rect', { className: 'sbt-svg-fx', x: 361, y: m.y + 2, width: bw - 6, height: 3, rx: 1.5, fill: '#ffffff', opacity: 0.35 }),
                  h('text', { x: 456, y: m.y + 10.5, fill: hcI ? '#ffff00' : m.col, fontSize: 10.5, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace' }, String(m.val))
                );
              }),
              h('text', { x: 240, y: 112, fill: hcI ? '#ffff00' : '#94a3b8', fontSize: 10.5, textAnchor: 'middle', fontWeight: 600 }, __alloT('stem.schoolbehaviortoolkit.pbis_multi_tiered_system_of_supports', 'PBIS Multi-Tiered System of Supports & Plan Readiness Matrix'))
            );
          })(),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px', marginBottom: 10 } },
            h('label', { style: { fontSize: 11 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, __alloT('stem.schoolbehaviortoolkit.pbis_tier', 'PBIS Tier')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, 'Tier ' + iq.tier)),
              h('input', { type: 'range', 'aria-label': __alloT('stem.schoolbehaviortoolkit.a11y_behavior_tier', 'Behavior tier'), 'aria-valuetext': t('stem.schoolbehaviortoolkit.iq_tier_valuetext_prefix', 'Tier ') + iq.tier, min: 1, max: 3, step: 1, value: iq.tier, onChange: function(e) { setKey('tier', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            ),
            h('label', { style: { fontSize: 11 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, __alloT('stem.schoolbehaviortoolkit.behavior_intensity_1_10', 'Behavior intensity (1-10)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.intensity)),
              h('input', { type: 'range', 'aria-label': __alloT('stem.schoolbehaviortoolkit.a11y_intensity', 'Intensity'), 'aria-valuetext': iq.intensity + t('stem.schoolbehaviortoolkit.iq_of_10_valuetext', ' of 10'), min: 1, max: 10, step: 1, value: iq.intensity, onChange: function(e) { setKey('intensity', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            ),
            h('label', { style: { fontSize: 11 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, __alloT('stem.schoolbehaviortoolkit.function_confidence_1_10', 'Function confidence (1-10)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.functionConfidence)),
              h('input', { type: 'range', 'aria-label': __alloT('stem.schoolbehaviortoolkit.a11y_function_confidence', 'Function confidence'), 'aria-valuetext': iq.functionConfidence + t('stem.schoolbehaviortoolkit.iq_of_10_valuetext', ' of 10'), min: 1, max: 10, step: 1, value: iq.functionConfidence, onChange: function(e) { setKey('functionConfidence', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            ),
            h('label', { style: { fontSize: 11 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, __alloT('stem.schoolbehaviortoolkit.environment_stability_1_10', 'Environment stability (1-10)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.environmentStability)),
              h('input', { type: 'range', 'aria-label': __alloT('stem.schoolbehaviortoolkit.a11y_environment_stability', 'Environment stability'), 'aria-valuetext': iq.environmentStability + t('stem.schoolbehaviortoolkit.iq_of_10_valuetext', ' of 10'), min: 1, max: 10, step: 1, value: iq.environmentStability, onChange: function(e) { setKey('environmentStability', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
            h('button', { type: 'button', onClick: function() {
              var ts = new Date().toISOString().slice(11, 19);
              setIQ({ log: iq.log.concat([{ t: ts, tr: iq.tier, i: iq.intensity, fc: iq.functionConfidence, es: iq.environmentStability, state: sm.label }]) });
            }, style: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, __alloT('stem.schoolbehaviortoolkit.log_this_case', '📋 Log this case')),
            h('button', { type: 'button', onClick: function() { setIQ({ tier: 2, intensity: 5, functionConfidence: 5, environmentStability: 5 }); }, style: { padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: '#94a3b8', cursor: 'pointer' } }, __alloT('stem.schoolbehaviortoolkit.reset', 'Reset'))
          ),
          iq.log.length > 0 && h('div', { style: { maxHeight: 80, overflow: 'auto', padding: 6, borderRadius: 6, background: '#0a0a1a', border: '1px solid #1e293b', marginBottom: 10, fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 } },
            iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, String(e.t || '') + '  ' + String(e.state || '') + ' · T' + String(e.tr != null ? e.tr : '') + ' int' + String(e.i != null ? e.i : '') + ' fc' + String(e.fc != null ? e.fc : '') + ' env' + String(e.es != null ? e.es : '')); })
          ),
          h('label', { htmlFor: 'sbt-iq-hypothesis', style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, __alloT('stem.schoolbehaviortoolkit.your_hypothesis_when_does_an_unstable_', 'Your hypothesis (when does an unstable environment matter MORE than function knowledge?)')),
          h('textarea', { id: 'sbt-iq-hypothesis', value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, 'aria-label': __alloT('stem.schoolbehaviortoolkit.hypothesis_input', 'Behavior plan readiness hypothesis'), rows: 2, placeholder: __alloT('stem.schoolbehaviortoolkit.e_g_if_setting_events_are_dominant_eve', 'e.g., if setting events are dominant, even a perfect function-based plan fails because the antecedent context keeps changing...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 10, resize: 'vertical' } }),
          !iq.stuckRevealed && h('button', { type: 'button', onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: sm.color, cursor: 'pointer', marginBottom: 10 } }, __alloT('stem.schoolbehaviortoolkit.i_m_stuck_show_open_questions', "🤔 I'm stuck — show open questions")),
          iq.stuckRevealed && h('div', { style: { padding: 10, borderRadius: 6, background: '#0a0a1a', border: '1px dashed ' + sm.border, fontSize: 11, marginBottom: 10, lineHeight: 1.5 } },
            h('div', { style: { fontWeight: 700, color: sm.color, marginBottom: 4 } }, __alloT('stem.schoolbehaviortoolkit.open_questions_no_answer_key', 'Open questions (no answer key)')),
            h('ul', { style: { margin: 0, paddingLeft: 16 } },
              h('li', null, __alloT('stem.schoolbehaviortoolkit.why_does_a_tier_3_plan_require_fba_lev', 'Why does a Tier 3 plan require FBA-level function confidence before you can ethically design it?')),
              h('li', null, __alloT('stem.schoolbehaviortoolkit.a_high_intensity_behavior_in_a_stable_', 'A high-intensity behavior in a stable environment vs the same intensity in chaos — same plan?')),
              h('li', null, __alloT('stem.schoolbehaviortoolkit.when_is_tier_mismatch_actually_a_sign_', 'When is "tier mismatch" actually a sign that adult bias is driving over-pathologizing (especially across race/disability lines)?')),
              h('li', null, __alloT('stem.schoolbehaviortoolkit.how_would_you_communicate_not_implemen', 'How would you communicate "not implementable yet" to a frustrated team or parent without sounding dismissive?'))
            )
          ),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 6 } },
            h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
            h('span', null, __alloT('stem.schoolbehaviortoolkit.i_can_explain_why_this_tier_intensity_', 'I can explain why this tier/intensity/function/environment combination yields this state.'))
          ),
          iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, 'aria-label': __alloT('stem.schoolbehaviortoolkit.explanation_input', 'Explain behavior plan readiness'), rows: 2, placeholder: __alloT('stem.schoolbehaviortoolkit.explain_in_your_own_words', 'Explain in your own words...'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 6, resize: 'vertical' } }),
          h('p', { style: { margin: 0, fontSize: 10, fontStyle: 'italic', opacity: 0.6 } }, __alloT('stem.schoolbehaviortoolkit.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget — no score, no reveal, no answer dump. PBIS tier-matching heuristics from CASEL/PBIS Center; real plans should be team-developed and parent/family-centered. Equity audit (see Equity tab) is essential before assuming a tier-3 case is purely behavioral.'))
        );
      }

      return h('div', { className: 'sbt-workbench', 'data-sbt-theme': hcMode ? 'contrast' : isDark ? 'dark' : 'light', 'data-sbt-hc': hcMode ? '1' : '0', 'data-sbt-rm': reduceMotion ? '1' : '0', style: rootStyle, role: 'region', 'aria-label': __alloT('stem.schoolbehaviortoolkit.school_behavior_toolkit_2', 'School Behavior Toolkit') },
        renderHeader(),
        renderTabs(),
        h('div', { role: 'tabpanel', id: 'school-behavior-panel-' + section,
          'aria-labelledby': 'school-behavior-tab-' + section, tabIndex: 0, style: { padding: 20 } },
          content
        )
      );
    }
  });
})();
}
