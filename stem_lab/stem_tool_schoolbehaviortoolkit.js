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

      // Background — soft teal/slate panel without animal-conditioning
      // imagery. Quietly different from BehaviorLab's amber Skinner-box
      // palette so the visual frame says "this is school practice."
      var rootStyle = {
        background: 'linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #0f172a 100%)',
        borderRadius: 16,
        minHeight: '70vh',
        padding: 0,
        boxShadow: '0 0 40px rgba(20,184,166,0.15)',
        outline: 'none'
      };

      function renderHeader() {
        return h('div', { style: { padding: '20px 24px 16px', borderBottom: '1px solid rgba(20,184,166,0.20)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { if (setStemLabTool) setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab',
            style: { background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 16 } }, '←'),
          h('div', { style: { fontSize: 30 } }, '🏫'),
          h('div', { style: { flex: 1, minWidth: 240 } },
            h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#5eead4' } }, 'School Behavior Toolkit'),
            h('p', { style: { margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 600 } }, 'Applied K-12 practice. PBIS · BIPs · Cycle · Crisis · Restraint ethics.')
          )
        );
      }

      function renderTabs() {
        var tabs = [
          { id: 'pbis', label: 'PBIS Tiers', icon: '🏫' },
          { id: 'replacement', label: 'Replacement Behaviors', icon: '🔄' },
          { id: 'setting', label: 'Setting Events', icon: '🕰️' },
          { id: 'cycle', label: 'Acting-Out Cycle', icon: '🌀' },
          { id: 'restraint', label: 'Restraint & Seclusion', icon: '🛑' },
          { id: 'connect', label: 'Connect', icon: '🔗' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'School Behavior Toolkit sections',
          style: { display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', borderBottom: '1px solid rgba(20,184,166,0.15)' } },
          tabs.map(function(t) {
            var active = section === t.id;
            return h('button', {
              key: t.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
              onClick: function() { setSection(t.id); },
              style: {
                padding: '8px 14px', borderRadius: 999,
                border: '1px solid ' + (active ? '#14b8a6' : 'rgba(20,184,166,0.30)'),
                background: active ? 'rgba(20,184,166,0.16)' : 'rgba(255,255,255,0.02)',
                color: active ? '#5eead4' : '#94a3b8',
                fontSize: 12, fontWeight: active ? 800 : 600,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
              }
            }, t.icon + ' ' + t.label);
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
