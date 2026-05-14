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
      icon: '🔴', color: '#ef4444',
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
      icon: '👀', color: '#3b82f6',
      problemEx: 'Calling out, clowning, dramatic falls, "fake" injury reports',
      replacement: 'Recruit-attention skills: raise hand and wait, tap shoulder, use a "help" card, ask "can you check my work?", request a 1-on-1 conversation at scheduled times.',
      teaching: 'Plan a daily attention budget the student can spend on appropriate bids — 3 scheduled check-ins per day, no questions asked. Reinforces appropriate seeking and removes the artificial scarcity that drives the problem behavior.',
      pitfall: 'Don\'t teach a replacement that gets MORE attention than the problem behavior. The replacement has to be efficient — if "raise your hand" gets ignored for 8 minutes while calling out gets a response in 2 seconds, the kid will keep calling out. Honor the bid fast, every time, for several weeks before fading.'
    },
    {
      function: 'Escape / Avoidance',
      functionAbbrev: 'ESC',
      icon: '🚪', color: '#ef4444',
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
      icon: '🪀', color: '#8b5cf6',
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
    { category: 'Mental health', icon: '💭', color: '#94a3b8',
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
    { phase: 4, name: 'Acceleration', icon: '🌪️', color: '#ef4444',
      signs: 'Provocative behavior aimed at getting a reaction: blame, intimidation, escalating language, threats, refusal to engage with anyone, scripted "I don\'t care" responses.',
      doThis: 'Stay quiet. Stay close enough to be safe, far enough to give space. Clear the audience if possible — peers in the room raise the stakes. State only what is absolutely necessary, in short sentences.',
      dontDo: 'Don\'t take the bait. Don\'t match the volume. Don\'t threaten consequences mid-cycle. Don\'t deliver speeches. Most adult mistakes happen here — Phase 4 is the moment teachers get pulled into being part of the escalation.' },
    { phase: 5, name: 'Peak', icon: '🔥', color: '#dc2626',
      signs: 'Physical aggression, property destruction, elopement, full meltdown. The student is no longer in cognitive control. The thinking brain has gone offline.',
      doThis: 'Safety first. Move other students if needed. Use minimal language. Restraint only as a last resort with proper training and policy backing. Most of the work at Peak is just keeping the room safe and waiting.',
      dontDo: 'Don\'t teach. Don\'t reason. Don\'t process. Don\'t threaten. Don\'t give consequences mid-Peak. Recording the incident for documentation is appropriate; processing is not — yet.' },
    { phase: 6, name: 'De-escalation', icon: '🌧️', color: '#3b82f6',
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
      step: 1, name: 'Indirect assessment', icon: '📞', color: '#3b82f6',
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
      step: 5, name: 'BIP development', icon: '📝', color: '#ef4444',
      duration: 'team meeting + draft cycle',
      what: 'The hypothesis becomes the spine of the BIP. From the function statement, derive: (a) antecedent strategies that prevent the trigger or change its meaning, (b) replacement behavior that meets the same function (see Replacement Behaviors tab), (c) reinforcement plan that makes the replacement more efficient than the problem behavior, (d) response procedures for when the problem behavior still happens, (e) crisis plan, (f) data collection plan to monitor the BIP itself.',
      key: 'A BIP without a function statement is a punishment plan. The function statement is what distinguishes a real BIP from a list of consequences. If your draft BIP doesn\'t name a function, you don\'t yet have an FBA-driven plan — you have a behavior-management policy.',
      pitfall: 'The most common BIP failure mode: it is written, signed, and filed — but not implemented with fidelity in real classrooms. BIP fidelity checks (5-min observation against a fidelity checklist, weekly for the first month) catch implementation drift before the data shows it.'
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
      step: 4, name: 'Goal threshold + scoring', icon: '🎯', color: '#3b82f6',
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
      icon: '⚖️', color: '#ef4444',
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
      icon: '✋', color: '#dc2626',
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
    { name: 'What seclusion IS (and is NOT)', icon: '🚪', color: '#ef4444',
      content: 'Seclusion = involuntary confinement of a student alone in a room or area from which the student is physically prevented from leaving. The "physically prevented from leaving" part is what makes it seclusion legally.',
      counter: 'NOT seclusion: time-out where the student can leave (a "calm corner" with the door open); a quiet space chosen by the student; a sensory room used for regulation. Voluntary use of a separate space is not seclusion.' },
    { name: 'Maine Chapter 33 — the rule', icon: '🏛️', color: '#a78bfa',
      content: 'Maine permits emergency physical restraint and seclusion ONLY when there is "imminent danger of serious physical injury" to the student or others. Property destruction alone is not sufficient justification. Documentation, debrief, and parent notification are mandatory within specific time windows. Specific staff training (currently CPI / NCI / Mandt or equivalent) is required for anyone authorized to perform restraint.',
      counter: 'Other states vary: some prohibit prone restraint outright; some require court-ordered behavior plans for any restraint use; some are far more permissive. Always check current state regulation. Federal guidance (2022) recommends restricting school-based restraint/seclusion to genuine emergencies; some federal legislation has been proposed but not enacted.' },
    { name: 'Less-restrictive-alternative principle', icon: '🔓', color: '#22c55e',
      content: 'Every restraint or seclusion use must be the least restrictive option available to manage the immediate safety concern. If a student can be safely de-escalated by clearing the room of others, that comes before restraint. If a student can be safely supported with verbal de-escalation, that comes before clearing the room. The hierarchy is built into law and ethics — not optional.',
      counter: 'Common misuse: restraint or seclusion used as a consequence ("if you do that again, you will go to the calm room"). That converts an emergency tool into a punishment, which is both unethical and frequently illegal under disability law.' },
    { name: 'After every incident — the debrief', icon: '📝', color: '#3b82f6',
      content: 'Within ~24-48 hours: an incident report (what happened, who, when, duration, less-restrictive alternatives tried first). A staff debrief about what could be done differently next time. Parent notification (Maine requires same-day or next-business-day). A team meeting to revise the BIP if the incident reveals a pattern. The student debrief — when the student is fully recovered — to hear their perspective.',
      counter: 'Common gap: incidents get documented but the BIP never gets revised. Three or more incidents of the same antecedent in a quarter is a system signal that the BIP itself is failing — not a kid signal. Pattern-blindness is the most common documentation problem.' },
    { name: 'The disability-community position', icon: '✋', color: '#f472b6',
      content: 'Major disability-rights organizations (ASAN, AAPD, COPAA, Disability Rights Network) have called for substantial federal restriction of school restraint and seclusion. Documented harms include physical injury, psychological trauma (PTSD outcomes are well-documented), and disproportionate use against students of color and students with disabilities. Federal data show students with disabilities account for ~12% of enrollment but ~75% of restraint cases.',
      counter: 'Some BCBAs and behavior specialists argue restraint is occasionally necessary in genuine safety emergencies. Both positions can be true: emergencies happen AND the system overuses restraint by orders of magnitude. The ethical floor is "every restraint is one too many that should have been prevented earlier in the cycle."' }
  ];

  function defaultState() {
    return {
      activeSection: 'pbis',
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.StemLab.registerTool('schoolBehaviorToolkit', {
    icon: '🏫',
    label: 'School Behavior Toolkit',
    desc: 'Applied K-12 behavior practice — what school psychs and educators actually do with operant-conditioning science. PBIS three-tier framework, replacement behaviors mapped to FBA functions, setting events (the slow triggers most BIPs miss), Geoff Colvin\'s seven-phase Acting-Out Cycle for crisis de-escalation, and Restraint & Seclusion ethics anchored in Maine Chapter 33. Sister tool to BehaviorLab (which teaches the science) and Disability Voices in SEL Hub (which centers the people the field has been done to).',
    color: 'teal',
    category: 'science',
    questHooks: [
      { id: 'open_pbis', label: 'Open the PBIS three-tier framework', icon: '🏫', check: function(d) { return !!(d && d.sbtViewedPbis); }, progress: function(d) { return (d && d.sbtViewedPbis) ? 'opened' : 'not yet'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var awardXP = function(n) { if (ctx.awardXP) ctx.awardXP('schoolBehaviorToolkit', n); };

      var d = labToolData.schoolBehaviorToolkit || defaultState();
      function setSBT(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.schoolBehaviorToolkit) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { schoolBehaviorToolkit: next });
        });
      }
      var section = d.activeSection || 'pbis';

      function setSection(s) {
        setSBT({ activeSection: s, ['sbtViewed' + s.charAt(0).toUpperCase() + s.slice(1)]: true });
      }

      // Layered atmospheric background — same pattern shipped on
      // PrintingPress / ClimateExplorer / TypingPractice. Three layers:
      // (1) soft teal glow at top center (the 'reading lamp' for the
      //     tool's accent — picks up the school-psych palette)
      // (2) faint SVG paper-grain texture (220px tile @ ~6% opacity)
      //     so flat surfaces feel touched rather than rendered
      // (3) the original teal-to-navy diagonal as base
      // Background is calibrated to clinical-tool calm — both
      // overlay layers ~6% opacity. backgroundAttachment: fixed on
      // the radial keeps the lighting stable while content scrolls.
      var sbtGrainSvg = (function() {
        var svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
            '<filter id="g">' +
              '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="19"/>' +
              '<feColorMatrix values="0 0 0 0 0.4   0 0 0 0 0.7   0 0 0 0 0.7   0 0 0 0.06 0"/>' +
            '</filter>' +
            '<rect width="100%" height="100%" filter="url(#g)"/>' +
          '</svg>';
        return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
      })();
      var rootStyle = {
        background:
          'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(20,184,166,0.16), transparent 70%), ' +
          sbtGrainSvg + ', ' +
          'linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)',
        backgroundRepeat: 'no-repeat, repeat, no-repeat',
        backgroundAttachment: 'fixed, scroll, scroll',
        borderRadius: 16,
        minHeight: '70vh',
        padding: 0,
        boxShadow: '0 0 40px rgba(20,184,166,0.15)',
        outline: 'none'
      };

      function renderHeader() {
        return h('div', { style: { padding: '20px 24px 16px', borderBottom: '1px solid rgba(20,184,166,0.20)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
          h('button', { onClick: function() { if (setStemLabTool) setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab',
            style: { background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 16 } }, '←'),
          // Circular accent badge — same vocabulary as the rest of the
          // design system. 56px (large hero size).
          h('div', { 'aria-hidden': 'true',
            style: {
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(20,184,166,0.18)',
              border: '2px solid #14b8a6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, lineHeight: 1, flexShrink: 0,
              boxShadow: '0 4px 16px rgba(20,184,166,0.25)'
            }
          }, '🏫'),
          h('div', { style: { flex: 1, minWidth: 240 } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#5eead4', letterSpacing: '-0.01em' } }, 'School Behavior Toolkit'),
              // Meta-count chip — shows section count
              h('span', { style: {
                padding: '2px 8px', borderRadius: 999,
                background: 'rgba(20,184,166,0.12)',
                border: '1px solid rgba(20,184,166,0.40)',
                color: '#5eead4', fontSize: 10, fontWeight: 700,
                fontFamily: 'ui-monospace, Menlo, monospace'
              } }, '9 sections')
            ),
            h('p', { style: { margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 600, lineHeight: 1.5 } }, 'Applied K-12 practice. PBIS · Replacement Behaviors · Setting Events · Acting-Out Cycle · Restraint Ethics · Equity & Disparities.')
          )
        );
      }

      function renderTabs() {
        var tabs = [
          { id: 'pbis', label: 'PBIS Tiers', icon: '🏫' },
          { id: 'fba', label: 'FBA Process', icon: '🔬' },
          { id: 'replacement', label: 'Replacement Behaviors', icon: '🔄' },
          { id: 'setting', label: 'Setting Events', icon: '🕰️' },
          { id: 'cycle', label: 'Acting-Out Cycle', icon: '🌀' },
          { id: 'restraint', label: 'Restraint & Seclusion', icon: '🛑' },
          { id: 'cico', label: 'CICO Template', icon: '📋' },
          { id: 'equity', label: 'Equity & Disparities', icon: '⚖️' },
          { id: 'connect', label: 'Connect', icon: '🔗' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'School Behavior Toolkit sections',
          style: { display: 'flex', gap: 4, padding: '14px 18px 0', overflowX: 'auto', borderBottom: '1px solid rgba(20,184,166,0.15)', alignItems: 'flex-end' } },
          tabs.map(function(t) {
            var active = section === t.id;
            return h('button', {
              key: t.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
              onClick: function() { setSection(t.id); },
              style: {
                position: 'relative',
                padding: '10px 14px 12px',
                border: 'none',
                background: active ? 'rgba(20,184,166,0.10)' : 'transparent',
                color: active ? '#5eead4' : '#94a3b8',
                fontSize: 12, fontWeight: active ? 800 : 600,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                borderRadius: '8px 8px 0 0',
                borderTop: '1px solid ' + (active ? 'rgba(20,184,166,0.30)' : 'transparent'),
                borderLeft: '1px solid ' + (active ? 'rgba(20,184,166,0.30)' : 'transparent'),
                borderRight: '1px solid ' + (active ? 'rgba(20,184,166,0.30)' : 'transparent'),
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
          h('div', { style: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 1.5, maxWidth: 600, margin: '4px auto 0' } }, subtitle)
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
        return h('div', { style: { marginTop: 14, padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.6)', borderLeft: '3px solid #14b8a6', color: '#94a3b8', fontSize: 10, lineHeight: 1.6, fontStyle: 'italic' } }, text);
      }

      // ── Section: PBIS Three Tiers ──
      function renderPbis() {
        return h('div', null,
          panelHeader('🏫 PBIS — Three Tiers of Support',
            'Positive Behavioral Interventions and Supports is the school-wide framework that holds individual ABA work inside a system. Most school psychs spend ~80% of their time inside this framework — not in 1-on-1 ABA.'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            PBIS_TIERS.map(function(pt) {
              return h('div', { key: 'pbis-' + pt.tier,
                style: {
                  background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + pt.color
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('div', { 'aria-hidden': 'true',
                    style: { width: 36, height: 36, borderRadius: '50%', background: pt.color + '22', border: '1.5px solid ' + pt.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: pt.color, fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                  }, pt.tier),
                  h('div', { style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, pt.icon),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: pt.color, lineHeight: 1.2 } }, pt.name),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, pt.percent)
                  )
                ),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 8 } },
                  h('b', { style: { color: '#e2e8f0' } }, 'Who it serves: '), pt.who),
                h('div', null,
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, 'Concrete examples'),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 8 } }, pt.examples)
                ),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.20)' } },
                    h('div', { style: { fontSize: 9, fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '📊 Data signal'),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, pt.data)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.20)' } },
                    h('div', { style: { fontSize: 9, fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '⏫ When to escalate'),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, pt.escalate)
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
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            REPLACEMENT_BEHAVIORS.map(function(rb, i) {
              return h('div', { key: 'rb-' + i,
                style: { background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + rb.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  circularBadge(rb.icon, rb.color, 36),
                  h('div', null,
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: rb.color, lineHeight: 1.2 } }, rb['function']),
                    h('div', { style: { fontSize: 9, color: rb.color + 'cc', fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.04em', marginTop: 1 } }, 'function: ' + rb.functionAbbrev)
                  )
                ),
                h('div', null,
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '⚠ Problem behavior typically looks like'),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, rb.problemEx)
                ),
                h('div', null,
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '↪ Replacement behavior'),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, rb.replacement)
                ),
                h('div', null,
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '🎓 How to teach it'),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, rb.teaching)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.20)' } },
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '🪤 Common pitfall'),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, rb.pitfall)
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
                  border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + se.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  circularBadge(se.icon, se.color, 32),
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: se.color } }, se.category)
                ),
                h('div', { style: { fontSize: 10, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, se.examples),
                h('div', { style: { fontSize: 10, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic', paddingTop: 6, borderTop: '1px dashed ' + se.color + '40' } }, '💡 ' + se.note)
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
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            ACTING_OUT_CYCLE.map(function(ph) {
              return h('div', { key: 'cycle-' + ph.phase,
                style: { background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + ph.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('div', { 'aria-hidden': 'true',
                    style: { width: 36, height: 36, borderRadius: '50%', background: ph.color + '22', border: '1.5px solid ' + ph.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: ph.color, fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                  }, ph.phase),
                  h('div', { style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, ph.icon),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: ph.color, letterSpacing: '0.01em' } }, ph.name)
                ),
                h('div', { style: { fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, 'Signs'),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 8 } }, ph.signs),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.20)' } },
                    h('div', { style: { fontSize: 9, fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '✓ Do this'),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, ph.doThis)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' } },
                    h('div', { style: { fontSize: 9, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '✗ Don\'t do'),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, ph.dontDo)
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
          h('div', { style: { padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.30)', marginBottom: 12 } },
            h('div', { style: { fontSize: 11, color: '#fca5a5', fontWeight: 800, marginBottom: 4 } }, '⚠ This is education, not training.'),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
              'Reading this section does not authorize anyone to perform restraint or seclusion. State law requires specific certified training (CPI / NCI / Mandt or equivalent) and authorized-staff designation. This panel teaches the framework and ethics so school psychs and IEP-team members can recognize appropriate use, document properly, and revise BIPs in response to incidents.')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            RESTRAINT_PRINCIPLES.map(function(rp, i) {
              return h('div', { key: 'r-' + i,
                style: { background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + rp.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  circularBadge(rp.icon, rp.color, 36),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: rp.color, lineHeight: 1.2 } }, rp.name)
                ),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 8 } }, rp.content),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.20)', fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
                  h('span', { style: { color: '#fb923c', fontWeight: 800, marginRight: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' } }, '↪ Counter-line:'),
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
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            FBA_STEPS.map(function(s) {
              return h('div', { key: 'fba-' + s.step,
                style: {
                  background: 'rgba(15,23,42,0.6)', borderRadius: 10, padding: '12px 14px',
                  border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + s.color
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('div', { 'aria-hidden': 'true',
                    style: { width: 36, height: 36, borderRadius: '50%', background: s.color + '22', border: '1.5px solid ' + s.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: s.color, fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                  }, s.step),
                  h('div', { style: { fontSize: 18, lineHeight: 1, flexShrink: 0 } }, s.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: s.color, lineHeight: 1.2 } }, s.name),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic', fontFamily: 'ui-monospace, Menlo, monospace' } }, '⏱ ' + s.duration)
                  )
                ),
                h('div', { style: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, 'What to do'),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 8 } }, s.what),
                h('div', {
                  style: {
                    padding: '8px 10px', borderRadius: 6,
                    background: s.color + '10',
                    borderLeft: '2px solid ' + s.color,
                    marginBottom: 8
                  }
                },
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '🔑 Key idea'),
                  h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55 } }, s.key)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.20)', fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
                  h('span', { style: { color: '#fb923c', fontWeight: 800, marginRight: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' } }, '🪤 Common pitfall:'),
                  s.pitfall)
              );
            })
          ),
          sourceFooter('🎯 The FBA rule of thumb: the indirect assessment generates the candidate hypotheses, the direct ABC observation tests them, the function statement names the winner. A BIP without a function statement is a punishment plan. Sources: BACB FBA practice standards; Iwata et al. 1994 founding functional analysis paper; Crone & Horner FBA practitioner guide.')
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
                  border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + c.color
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
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic', fontFamily: 'ui-monospace, Menlo, monospace' } }, '⏱ ' + c.time)
                  )
                ),
                // What
                h('div', { style: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, 'What it looks like'),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 8 } }, c.what),
                // Script — quoted in monospace italic, clearly distinct
                h('div', {
                  style: {
                    padding: '8px 10px', borderRadius: 6,
                    background: c.color + '10',
                    borderLeft: '2px solid ' + c.color,
                    marginBottom: 8
                  }
                },
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 } }, '🗣 Sample script'),
                  h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55, fontStyle: 'italic' } }, c.script)
                ),
                // Pitfall
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.20)', fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
                  h('span', { style: { color: '#fb923c', fontWeight: 800, marginRight: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' } }, '🪤 Common pitfall:'),
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
                  border: '1px solid rgba(100,116,139,0.25)', borderLeft: '4px solid ' + eq.color
                } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  circularBadge(eq.icon, eq.color, 36),
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: eq.color, lineHeight: 1.2 } }, eq.finding)
                ),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', fontWeight: 700, lineHeight: 1.45, marginBottom: 8, padding: '8px 10px', background: eq.color + '12', borderLeft: '3px solid ' + eq.color, borderRadius: 6 } }, eq.stat),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8 } }, eq.detail),
                h('div', { style: { fontSize: 10, color: '#64748b', fontStyle: 'italic', lineHeight: 1.5, paddingTop: 6, borderTop: '1px dashed rgba(100,116,139,0.25)' } },
                  '📚 ', eq.source)
              );
            })
          ),
          // Audit questions
          h('div', { style: {
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(20,184,166,0.08)',
            border: '1px solid rgba(20,184,166,0.30)',
            borderLeft: '4px solid #14b8a6'
          } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              circularBadge('🔍', '#14b8a6', 36),
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#5eead4' } }, 'School-psych equity audit — five questions')
            ),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' } },
              'Practical questions to bring into your next discipline-data review or PBIS team meeting. The federal numbers describe the pattern. These questions help your building see where your specific patterns sit and what to do about them.'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              EQUITY_AUDIT_QUESTIONS.map(function(eaq, i) {
                return h('div', { key: 'eaq-' + i,
                  style: { background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(100,116,139,0.25)' } },
                  h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 } },
                    h('div', { 'aria-hidden': 'true',
                      style: { width: 24, height: 24, borderRadius: '50%', background: 'rgba(20,184,166,0.18)', border: '1.5px solid #14b8a6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#5eead4', fontFamily: 'ui-monospace, Menlo, monospace', flexShrink: 0 }
                    }, i + 1),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', fontWeight: 700, lineHeight: 1.55, flex: 1 } }, eaq.q)
                  ),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.55, fontStyle: 'italic', paddingLeft: 34 } },
                    h('span', { style: { color: '#5eead4', fontWeight: 700, marginRight: 4 } }, 'Why:'),
                    eaq.why)
                );
              })
            )
          ),
          sourceFooter('🎯 The pattern across all five findings: discipline disparities are most concentrated where adult judgment, not bright-line rules, drives the decision. Subjective offense categories. Manifestation determinations. Restraint authorization decisions. The intervention is rarely "stricter discipline policy." It is more often "tighter referral-decision review, deeper FBA practice, and explicit attention to the pattern of who is making which calls in which classrooms."')
        );
      }

      // ── Section: Connect (cross-tool navigation) ──
      function renderConnect() {
        return h('div', null,
          panelHeader('🔗 Connect — three connected spaces',
            'School Behavior Toolkit teaches what school psychs and educators DO. Two sister spaces handle the science and the voices.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 } },
            // BehaviorLab — the science
            h('div', { style: { background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 16, border: '1px solid rgba(251,146,60,0.30)', borderLeft: '4px solid #fb923c' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                circularBadge('🐭', '#fb923c', 44),
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fb923c' } }, 'BehaviorLab'),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 } }, 'STEM Lab → Behavioral Science')
                )
              ),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 8 } },
                'The science of operant conditioning — Skinner-box simulation, schedules of reinforcement, shaping, extinction, FBA practice. The mechanics behind what this Toolkit applies in K-12 settings.'),
              h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, '9 progressive levels · Schedule Sleuth · Function Sleuth · Glossary · Ethics')
            ),
            // Disability Voices — the people
            h('div', { style: { background: 'rgba(15,23,42,0.6)', borderRadius: 12, padding: 16, border: '1px solid rgba(244,114,182,0.30)', borderLeft: '4px solid #f472b6' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                circularBadge('🎤', '#f472b6', 44),
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: '#f472b6' } }, 'Disability Voices'),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 } }, 'SEL Hub → Identity & Care')
                )
              ),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 8 } },
                'Real autistic and disabled advocates whose work shaped — and critiqued — disability practice. Centered as persons, not behavioral subjects. Read here for the human side of the work.'),
              h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, 'Ari Ne\'eman · Temple Grandin · Damian Milton · Henny Kupferstein · Kassiane Asasumasu · Mel Baggs · Lydia X. Z. Brown · Patty Berne')
            )
          ),
          h('div', { style: { marginTop: 14, padding: 14, borderRadius: 10, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.30)', color: '#cbd5e1', fontSize: 11, lineHeight: 1.65 } },
            h('div', { style: { fontWeight: 800, color: '#5eead4', marginBottom: 6 } }, '🧭 Why three separate spaces'),
            'Putting Skinner-box imagery, applied K-12 practice, and named real autistic adults all in one tool would be exactly the dehumanizing arc the disability community has critiqued: animal-conditioning visuals → "applied" → and the people we apply it to. Splitting them into three connected but distinct spaces is a deliberate ethical choice. The science is the science (BehaviorLab). The K-12 practice is school-psych work (this Toolkit). The voices are the people (Disability Voices in SEL Hub). All three matter. None should crowd the others.'
          )
        );
      }

      var content;
      if (section === 'replacement') content = renderReplacement();
      else if (section === 'setting') content = renderSetting();
      else if (section === 'cycle') content = renderCycle();
      else if (section === 'restraint') content = renderRestraint();
      else if (section === 'fba') content = renderFba();
      else if (section === 'cico') content = renderCico();
      else if (section === 'equity') content = renderEquity();
      else if (section === 'connect') content = renderConnect();
      else content = renderPbis();

      return h('div', { style: rootStyle, role: 'region', 'aria-label': 'School Behavior Toolkit' },
        renderHeader(),
        renderTabs(),
        h('div', { style: { padding: 20 } },
          content
        )
      );
    }
  });
})();
}
