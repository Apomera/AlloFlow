// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_firstresponse.js — First Response Lab
// Educational medical-emergency recognition + response training.
// Lane A spine: hands-only CPR / AED / Stop the Bleed / choking / stroke / seizure /
// anaphylaxis / diabetic + 911 / text-to-911 / mental-health crisis routing.
// Lane C threaded: disability-affirming peer response (deaf/HoH, autistic peer,
// epilepsy as identity, diabetic behavior changes, hidden-disability disclosure).
// All clinical numbers cite AHA / Red Cross / Stop the Bleed / Epilepsy Foundation /
// SAMHSA / NAMI / ASAN. Educational only — get certified at redcross.org or heart.org.
// In a real emergency: call 911 (or text 911 in Maine).
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('firstResponse'))) {

(function() {
  'use strict';

  // ── FirstResponse keyframes (mastery celebration) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('firstresponse-celeb-css')) return;
    var st = document.createElement('style');
    st.id = 'firstresponse-celeb-css';
    st.textContent = [
      '@keyframes firstresponse-celeb-rise {',
      '  0%   { transform: translate(-50%, -120%); opacity: 0; }',
      '  10%  { transform: translate(-50%, 0%);    opacity: 1; }',
      '  88%  { transform: translate(-50%, 0%);    opacity: 1; }',
      '  100% { transform: translate(-50%, -10%);  opacity: 0; }',
      '}',
      '@keyframes firstresponse-heartbeat {',
      '  0%   { transform: scale(1); }',
      '  15%  { transform: scale(1.22); }',
      '  40%  { transform: scale(1); }',
      '  100% { transform: scale(1); }',
      '}'
    ].join('');
    if (document.head) document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-firstresponse')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-firstresponse';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
    // Assertive channel for time-sensitive coaching ("Begin compressions now")
    if (!document.getElementById('allo-live-firstresponse-assert')) {
      var lr2 = document.createElement('div');
      lr2.id = 'allo-live-firstresponse-assert';
      lr2.setAttribute('aria-live', 'assertive');
      lr2.setAttribute('aria-atomic', 'true');
      lr2.setAttribute('role', 'alert');
      lr2.className = 'sr-only';
      lr2.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
      document.body.appendChild(lr2);
    }
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-fr-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-fr-focus-css';
    st.textContent = '[data-fr-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    if (document.head) document.head.appendChild(st);
  })();

  // ── Live-region announcers (rate-limited; mirror RoadReady pattern) ──
  var _frPoliteTimer = null, _frAssertTimer = null;
  function frAnnounce(text) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-firstresponse');
    if (!lr) return;
    if (_frPoliteTimer) clearTimeout(_frPoliteTimer);
    lr.textContent = '';
    _frPoliteTimer = setTimeout(function() { lr.textContent = String(text || ''); _frPoliteTimer = null; }, 25);
  }
  function frAnnounceUrgent(text) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-firstresponse-assert');
    if (!lr) return;
    if (_frAssertTimer) clearTimeout(_frAssertTimer);
    lr.textContent = '';
    _frAssertTimer = setTimeout(function() { lr.textContent = String(text || ''); _frAssertTimer = null; }, 25);
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 1: CONSTANTS — resources, Maine EMS, recognize cards
  // All clinical numbers from AHA 2020 / Red Cross / Stop the Bleed / Epilepsy
  // Foundation / SAMHSA published guidance as of 2024.
  // ─────────────────────────────────────────────────────────

  // External resource directory. Every clinical claim in this tool traces back
  // to one of these orgs. Phone numbers verified 2026-04. Disability-advocacy
  // section deliberately uses ASAN, NOT Autism Speaks (community-trust reasons).
  var RESOURCES = {
    emergency: [
      { name: '911', contact: 'Call 911', desc: 'Police, fire, EMS — anywhere in the US.', url: null, icon: '🚑' },
      { name: 'Text-to-911 (Maine)', contact: 'Text 911', desc: 'For deaf/HoH/speech-disabled or unsafe-to-speak. Maine has it; check coverage at maine.gov/dps/911.', url: 'https://www.maine.gov/dps/911', icon: '💬' },
      { name: 'Poison Control', contact: '1-800-222-1222', desc: 'Free 24/7. Ingestion, exposure, overdose questions.', url: 'https://www.poison.org', icon: '☠️' }
    ],
    crisis: [
      { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', desc: 'Free, confidential, 24/7. Maine routes to in-state counselors.', url: 'https://988lifeline.org', icon: '📞' },
      { name: 'Crisis Text Line', contact: 'Text HOME to 741741', desc: 'Free crisis counseling via text.', url: 'https://www.crisistextline.org', icon: '📱' },
      { name: 'Trans Lifeline', contact: '1-877-565-8860', desc: 'Peer support by and for trans people. No active rescue policy.', url: 'https://translifeline.org', icon: '🌈' },
      { name: 'NAMI HelpLine', contact: '1-800-950-NAMI (6264)', desc: 'Mental health info, support, referrals. Mon–Fri 10am–10pm ET.', url: 'https://www.nami.org/help', icon: '🧠' },
      { name: 'SAMHSA National Helpline', contact: '1-800-662-HELP (4357)', desc: 'Treatment referrals, mental health + substance use. Free, confidential, 24/7.', url: 'https://www.samhsa.gov/find-help/national-helpline', icon: '💚' }
    ],
    certification: [
      { name: 'American Heart Association', contact: 'cpr.heart.org', desc: 'Find a CPR/AED/First Aid course near you.', url: 'https://cpr.heart.org', icon: '❤️' },
      { name: 'American Red Cross', contact: 'redcross.org/take-a-class', desc: 'In-person and blended CPR, First Aid, BLS, lifeguard.', url: 'https://www.redcross.org/take-a-class', icon: '✚' },
      { name: 'Stop the Bleed', contact: 'stopthebleed.org', desc: 'Free bleeding-control training. Find a class or take the online module.', url: 'https://www.stopthebleed.org', icon: '🩸' },
      { name: 'FEMA Teen CERT', contact: 'community.fema.gov', desc: 'Community Emergency Response Team training for teens.', url: 'https://community.fema.gov', icon: '🛡️' },
      { name: 'Maine EMS', contact: 'maine.gov/ems', desc: 'State EMS office; EMR/EMT course listings.', url: 'https://www.maine.gov/ems', icon: '🌲' }
    ],
    conditions: [
      { name: 'Epilepsy Foundation', contact: 'epilepsy.com', desc: 'Seizure first aid, recognition, advocacy. Run by people with epilepsy.', url: 'https://www.epilepsy.com', icon: '⚡' },
      { name: 'American Diabetes Association', contact: 'diabetes.org', desc: 'Hypoglycemia + DKA recognition; school-staff guidance.', url: 'https://www.diabetes.org', icon: '🩺' },
      { name: 'FARE (Food Allergy Research & Education)', contact: 'foodallergy.org', desc: 'Anaphylaxis recognition + EpiPen guidance.', url: 'https://www.foodallergy.org', icon: '🦜' },
      { name: 'American Stroke Association', contact: 'stroke.org', desc: 'BE FAST stroke recognition.', url: 'https://www.stroke.org', icon: '🧠' }
    ],
    disabilityAdvocacy: [
      { name: 'Autistic Self Advocacy Network (ASAN)', contact: 'autisticadvocacy.org', desc: 'By and for autistic people. "Nothing about us without us."', url: 'https://autisticadvocacy.org', icon: '♾️' },
      { name: 'Hearing Loss Association of America', contact: 'hearingloss.org', desc: 'Communication-access guidance for emergencies.', url: 'https://www.hearingloss.org', icon: '👂' },
      { name: 'National Federation of the Blind', contact: 'nfb.org', desc: 'Accessibility advocacy + emergency-prep resources.', url: 'https://www.nfb.org', icon: '👁️' },
      { name: 'NAMI', contact: '1-800-950-NAMI', desc: 'Mental health peer support; Mental Health First Aid trainings.', url: 'https://www.nami.org', icon: '🧠' }
    ]
  };

  // Maine-specific reality (mirrors RoadReady's MAINE_RULES identity pattern).
  // Rural EMS response times shape the right-thing-to-do — direct pressure may
  // suffice in Portland, may not on a logging road in Aroostook.
  var MAINE_EMS = {
    text911: 'Maine has text-to-911 statewide. Use it if you cannot speak safely or are deaf/HoH. Send your location FIRST, then what is happening.',
    ruralEta: 'Rural Maine EMS response can be 15–45+ minutes. In remote areas you ARE the first responder until they arrive.',
    heartAed: 'Maine Heart Association tracks public AED locations. Many schools, town halls, gyms, and ferry terminals have one. Look for the green-and-white heart-with-lightning sign.',
    crisisRoute: 'In Maine, 988 routes to in-state Maine Crisis Line counselors. They know local resources.',
    poison: 'Maine Poison Center: 1-800-222-1222 (national line, Maine-staffed).'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 2: RECOGNIZE module data — grade-banded card grid + quiz
  // Each card: cue (2-3 word recognition tag) + visual emoji + first-action (1 line).
  // Grade band shifts depth, not core protocol — K-2 stops at "get an adult."
  // ─────────────────────────────────────────────────────────

  // 12 conditions covered. Card.bands = which grade bands see this card.
  // 'k2' = K-2, 'g35' = 3-5, 'g68' = 6-8, 'g912' = 9-12.
  // 'all' = visible to every band.
  var RECOGNIZE_CARDS = [
    { id: 'cardiac', icon: '💔', name: 'Cardiac arrest',
      cue: 'Not breathing, not responding',
      first: { k2: 'Yell for an adult. Call 911.', g35: 'Call 911. Start hands-only CPR if trained.', g68: 'Call 911. Start hands-only CPR (100–120 bpm). Send someone for AED.', g912: 'Call 911. Start CPR (push hard, push fast, 100–120 bpm, 2 inches deep). AED ASAP.' },
      bands: 'all', source: 'AHA 2020 Guidelines' },
    { id: 'choking', icon: '😬', name: 'Choking',
      cue: 'Hands at throat, can’t cough or speak',
      first: { k2: 'Yell for an adult.', g35: 'Yell for help. If they can’t cough, an adult does back blows + abdominal thrusts.', g68: 'If alone with them: 5 back blows then 5 abdominal thrusts. Call 911.', g912: 'Universal sign = silent + clutching throat. 5 back blows / 5 abdominal thrusts. Unconscious → CPR + 911.' },
      bands: 'all', source: 'Red Cross First Aid' },
    { id: 'stroke', icon: '🧠', name: 'Stroke (BE FAST)',
      cue: 'Face droops, arm drifts, slurred speech',
      first: { g35: 'Tell an adult right away. Note the time it started.', g68: 'BE FAST: Balance, Eyes, Face, Arms, Speech, Time. Call 911. Note the time.', g912: 'BE FAST. Call 911. Note exact onset time — eligibility for clot-busting drugs depends on it. Do NOT give food, water, or aspirin.' },
      bands: 'g35,g68,g912', source: 'American Stroke Association' },
    { id: 'seizure', icon: '⚡', name: 'Seizure',
      cue: 'Body stiffens or jerks; loses awareness',
      first: { k2: 'Get an adult. Don’t touch. Stay with them.', g35: 'Get an adult. Move sharp things away. Time it. Don’t hold them down.', g68: 'Time it. Move hazards away. Cushion head. Don’t restrain. Don’t put anything in mouth. 911 if >5 min or first-ever.', g912: 'Time it. Cushion head. Recovery position after. Don’t restrain or put anything in mouth (myth). 911 if >5 min, repeats, first-ever, in water, or injury.' },
      bands: 'all', source: 'Epilepsy Foundation' },
    { id: 'anaphylaxis', icon: '🦜', name: 'Anaphylaxis',
      cue: 'Hives, swelling, can’t breathe after exposure',
      first: { g35: 'Tell an adult NOW. They may have an EpiPen.', g68: 'EpiPen in outer thigh, hold 3 seconds. Call 911. Lay flat with legs up.', g912: 'EpiPen IM in outer thigh, hold 3 sec. Call 911 even if symptoms improve (biphasic reaction risk). Second dose at 5–15 min if no improvement.' },
      bands: 'g35,g68,g912', source: 'FARE / AAP' },
    { id: 'bleed', icon: '🩸', name: 'Severe bleeding',
      cue: 'Spurting, pooling, soaks through cloth',
      first: { g35: 'Get an adult. Press hard on the wound.', g68: 'Direct pressure with both hands. Call 911. Don’t lift to peek.', g912: 'Pressure → packing → tourniquet. Tourniquet 2–3" above wound on a limb (NEVER neck/torso). Note time applied.' },
      bands: 'g35,g68,g912', source: 'Stop the Bleed' },
    { id: 'hypoglycemia', icon: '🩺', name: 'Low blood sugar',
      cue: 'Shaky, sweaty, confused, behavior change',
      first: { g35: 'Tell an adult. They may need juice or sugar.', g68: '15g fast sugar (juice, glucose tab). Recheck in 15 min. If unconscious — 911, do NOT give food.', g912: '15-15 rule: 15g fast carb, wait 15 min, recheck. Unconscious → 911 + recovery position. Glucagon if available.' },
      bands: 'g35,g68,g912', source: 'American Diabetes Association' },
    { id: 'panic', icon: '😰', name: 'Panic attack',
      cue: 'Chest tight, breathing fast, fear',
      first: { g68: 'Stay with them. Calm voice. Slow breathing together (4 in, 6 out). Not heart attack — but if unsure, call 911.', g912: 'Co-regulate breath (4-in, 6-out box). Ground (5-4-3-2-1 senses). Distinguish from heart attack: panic peaks ~10 min, no left-arm pain, no diaphoresis. When in doubt — 911.' },
      bands: 'g68,g912', source: 'NAMI / SAMHSA' },
    { id: 'mh', icon: '💚', name: 'Mental health crisis',
      cue: 'Suicidal talk, self-harm, severe distress',
      first: { g68: 'Stay with them. Tell a trusted adult NOW. 988 calls or texts.', g912: 'Stay. Listen. No judgment. Move to a safer space. Loop in trusted adult. 988 for crisis line. 911 only if immediate life threat.' },
      bands: 'g68,g912', source: '988 / NAMI' },
    { id: 'overdose', icon: '💊', name: 'Overdose / unresponsive',
      cue: 'Won’t wake; slow or stopped breathing',
      first: { g912: 'Call 911. Naloxone (Narcan) nasal spray if available — 1 spray per nostril, repeat in 2–3 min if no response. Recovery position. Maine’s Good Samaritan law protects bystanders.' },
      bands: 'g912', source: 'SAMHSA / Maine Good Samaritan Law' },
    { id: 'heat', icon: '🌡️', name: 'Heat stroke',
      cue: 'Hot dry skin, confused, no sweat',
      first: { g35: 'Get them in shade. Tell an adult. Cool with water.', g68: '911. Move to shade. Cool aggressively (water, ice packs to neck/armpits/groin).', g912: '911 — heat stroke is life-threatening. Cool aggressively (cold-water immersion if possible). Don’t give fluids if confused.' },
      bands: 'g35,g68,g912', source: 'CDC / Red Cross' },
    { id: 'burn', icon: '🔥', name: 'Burn',
      cue: 'Red, blistered, or charred skin',
      first: { k2: 'Cool water on it. Tell an adult.', g35: 'Cool running water 10–20 min. No ice. Tell an adult.', g68: 'Cool water 10–20 min. No butter / ice / toothpaste. Loose covering. 911 for face, hands, joints, large area, or charred.', g912: 'Cool water 10–20 min. No ice/butter. Cling-film or clean dressing. 911 if 3rd-degree (charred/leathery), >palm-size, face/hands/joints/genitals, or chemical/electrical.' },
      bands: 'all', source: 'Red Cross First Aid' }
  ];

  // 5-question recognition quiz. Answers built from the same data set above so
  // there is exactly one right answer per question (no clinical ambiguity).
  // Questions written to land on the recognition cue, not the protocol.
  var RECOGNIZE_QUIZ = [
    { id: 'q1', icon: '💔',
      stem: 'A classmate in the cafeteria suddenly collapses. They are not breathing and do not respond when you shake their shoulder. What is this?',
      choices: ['Fainting', 'Cardiac arrest', 'Panic attack', 'Stroke'],
      correct: 1, why: 'Cardiac arrest = unresponsive + not breathing normally. Fainting people start breathing again quickly. Call 911 and start hands-only CPR.' },
    { id: 'q2', icon: '😬',
      stem: 'At lunch, a friend stands up, grabs their throat, can’t cough, and can’t make a sound. What is this?',
      choices: ['Asthma attack', 'Choking (universal sign)', 'Allergic reaction', 'Panic attack'],
      correct: 1, why: 'Hands at the throat + silent + can’t cough is the universal choking sign. They need back blows + abdominal thrusts immediately.' },
    { id: 'q3', icon: '🧠',
      stem: 'Your grandfather suddenly has a droopy face on one side, can’t lift his right arm, and his speech is slurred. What is this?',
      choices: ['Low blood sugar', 'Stroke', 'Heat stroke', 'Migraine'],
      correct: 1, why: 'Face-Arm-Speech together = stroke. Call 911 and note the EXACT time symptoms started — clot-busting medicine eligibility depends on it.' },
    { id: 'q4', icon: '🦜',
      stem: 'A peer who has a peanut allergy ate a cookie at a party. Within minutes she has hives all over, her lip is swelling, and she says her throat feels tight. What is this?',
      choices: ['Asthma attack', 'Anaphylaxis', 'Panic attack', 'Cold'],
      correct: 1, why: 'Hives + swelling + breathing trouble after a known allergen = anaphylaxis. EpiPen in the outer thigh, hold 3 seconds, then 911 — even if she gets better.' },
    { id: 'q5', icon: '⚡',
      stem: 'A classmate with epilepsy suddenly stiffens, falls, and his arms and legs jerk. He is not aware of you. What should you NOT do?',
      choices: ['Move sharp things away', 'Time how long it lasts', 'Put something in his mouth', 'Cushion his head'],
      correct: 2, why: 'NEVER put anything in someone’s mouth during a seizure (old myth). They cannot swallow their tongue. Time the seizure and stay calm. 911 if it lasts more than 5 minutes.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 2.5: CALL module data — when to call what + dispatcher script
  // 911 vs 988 vs 741741 vs 1-800-222-1222 routing matters: a kid mis-routing
  // a mental-health crisis to 911 can land a peer with police instead of a
  // counselor. The decision panel below is the differentiator from sel_safety.
  // ─────────────────────────────────────────────────────────

  // Decision panel: situation → which line to call. Order matters; first match
  // is shown when the user picks a tag.
  var CALL_DECISIONS = [
    { tag: 'cardiac', situation: 'Someone is unresponsive / not breathing / severe injury / can’t breathe / heavy bleeding',
      line: '911', why: 'Life-threatening medical or trauma — EMS dispatch needs to start now.' },
    { tag: 'fire', situation: 'Fire, smoke, gas leak, downed power line, vehicle crash with injury',
      line: '911', why: 'Fire, hazmat, or trauma — fire and EMS roll together.' },
    { tag: 'crime', situation: 'Crime in progress, weapon, immediate physical threat to anyone',
      line: '911', why: 'Police dispatch needs to be on the way as you’re talking.' },
    { tag: 'mh', situation: 'Suicidal thoughts, severe emotional crisis, panic attack with no medical signs',
      line: '988', why: 'Counselors trained in crisis de-escalation, NOT police. In Maine, 988 routes to in-state Maine Crisis Line counselors.' },
    { tag: 'mh-text', situation: 'You’re in crisis but can’t talk on the phone',
      line: '741741', why: 'Crisis Text Line — text HOME to 741741. Free, 24/7. Helpful when speaking aloud feels impossible.' },
    { tag: 'mh-trans', situation: 'Trans peer in crisis or wants peer support',
      line: '1-877-565-8860', why: 'Trans Lifeline — peer support by and for trans people. No active rescue / no police call without consent.' },
    { tag: 'poison', situation: 'Someone swallowed something, took too much medicine, splashed chemical in eye',
      line: '1-800-222-1222', why: 'Poison Control — free, 24/7, faster than 911 for non-life-threatening exposures. They tell you whether to go to ER.' },
    { tag: 'overdose', situation: 'Suspected overdose — slow breathing, blue lips, won’t wake',
      line: '911', why: 'Life threat. Maine’s Good Samaritan law protects bystanders calling for help during a drug overdose.' },
    { tag: 'abuse', situation: 'Child abuse you’re witnessing or suspect',
      line: '1-800-422-4453', why: 'Childhelp National Child Abuse Hotline — 24/7. They walk you through reporting. If a child is in immediate danger, call 911 first.' },
    { tag: 'unsure', situation: 'You don’t know if it’s an emergency',
      line: '911', why: 'When in doubt, call 911. Dispatchers are trained to route or de-escalate. You won’t get in trouble for calling.' }
  ];

  // What to say to a 911 dispatcher. Order is deliberate — location FIRST so
  // help can roll even if the call drops. Source: AHA / NENA dispatcher guidance.
  var DISPATCHER_SCRIPT = [
    { step: 1, label: 'Where',
      example: '"I’m at King Middle School, 92 Deering Avenue, Portland. We’re in the cafeteria on the first floor."',
      tip: 'Give address first. If you don’t know it: nearest cross streets, building name, what you can see (school, gas station, mile marker on a road).' },
    { step: 2, label: 'What',
      example: '"A student collapsed. He’s not breathing. He’s about 14, wearing a red hoodie."',
      tip: 'One sentence on what happened, then who is hurt. Age + appearance helps EMS find them when they arrive.' },
    { step: 3, label: 'Who you are',
      example: '"My name is Sam. I’m a student here. My phone number is 207-555-0142."',
      tip: 'They need a callback number in case the call drops.' },
    { step: 4, label: 'Stay on the line',
      example: '"Yes, I can stay with you. Tell me what to do."',
      tip: 'Don’t hang up. Dispatchers can coach you through CPR, choking, bleeding control. They will tell you when EMS is at the door.' },
    { step: 5, label: 'Listen for instructions',
      example: '"Yes, I’m starting compressions now. One. Two. Three..."',
      tip: 'Follow what they say even if it sounds different from what you learned. They’re looking at the case in real time.' }
  ];

  // Text-to-911 specifics (Maine has it; this is a deaf/HoH + speech-disabled
  // + unsafe-to-speak accommodation that few teens know about).
  var TEXT_911_SCRIPT = [
    { step: 1, label: 'First text: location',
      example: 'King Middle School cafeteria, 92 Deering Ave Portland',
      tip: 'Location FIRST. Texts can be slow or out-of-order — make sure the most important info goes first.' },
    { step: 2, label: 'Second text: what + who',
      example: 'Student collapsed not breathing 14yo red hoodie',
      tip: 'Short, clear, no abbreviations they might miss. Skip slang.' },
    { step: 3, label: 'Wait + reply',
      example: '(They reply with questions. Answer plainly.)',
      tip: 'Stay in the conversation until they tell you EMS has arrived. Don’t send a photo unless asked — it slows the system.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 3: TOOL REGISTRATION + RENDER
  // ─────────────────────────────────────────────────────────

  if (typeof document !== 'undefined' && !document.getElementById('firstresponse-readiness-css')) {
    var firstResponseStyle = document.createElement('style');
    firstResponseStyle.id = 'firstresponse-readiness-css';
    firstResponseStyle.textContent = [
      '.firstresponse-menu-shell{width:min(100%,1100px);margin:0 auto;padding:8px;color:#f8fafc;display:grid;gap:14px;}',
      '.firstresponse-menu-shell *{box-sizing:border-box;}',
      '.firstresponse-command{padding:20px;border:1px solid rgba(96,165,250,.4);border-radius:20px;background:radial-gradient(circle at 91% 9%,rgba(59,130,246,.22),transparent 34%),linear-gradient(135deg,rgba(30,58,138,.64),rgba(2,6,23,.98) 68%);box-shadow:0 18px 44px rgba(2,6,23,.28);}',
      '.firstresponse-command-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}',
      '.firstresponse-eyebrow{margin:0 0 7px;color:#93c5fd;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;}',
      '.firstresponse-title{margin:0;color:#fff;font-size:clamp(22px,3vw,31px);line-height:1.12;}',
      '.firstresponse-subtitle{max-width:740px;margin:8px 0 0;color:#dbeafe;font-size:13px;line-height:1.55;}',
      '.firstresponse-status{flex:0 0 auto;padding:8px 11px;border:1px solid rgba(147,197,253,.35);border-radius:999rem;background:rgba(2,6,23,.66);color:#bfdbfe;font-size:10px;font-weight:800;white-space:nowrap;}',
      '.firstresponse-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:17px;}',
      '.firstresponse-metric{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:rgba(15,23,42,.72);}',
      '.firstresponse-metric-label{display:block;color:#94a3b8;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;}',
      '.firstresponse-metric-value{display:block;margin-top:3px;color:#f8fafc;font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.firstresponse-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:15px;}',
      '.firstresponse-primary{min-height:44px;padding:10px 16px;border:1px solid rgba(219,234,254,.42);border-radius:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(37,99,235,.22);transition:transform .18s,box-shadow .18s;}',
      '.firstresponse-primary:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(37,99,235,.3);}',
      '.firstresponse-action-note{color:#bfdbfe;font-size:10px;line-height:1.4;}',
      '.firstresponse-section{padding:16px;border:1px solid #334155;border-radius:16px;background:rgba(15,23,42,.67);}',
      '.firstresponse-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px;}',
      '.firstresponse-section-head h3{margin:0;color:#f8fafc;font-size:15px;}',
      '.firstresponse-section-head p{margin:3px 0 0;color:#94a3b8;font-size:11px;line-height:1.45;}',
      '.firstresponse-core-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;}',
      '.firstresponse-tile-wrap{min-width:0;}',
      '.firstresponse-menu-tile{width:100%;height:100%;min-height:142px;transition:transform .18s,border-color .18s,box-shadow .18s;}',
      '.firstresponse-menu-tile:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(2,6,23,.25);}',
      '.firstresponse-menu-tile--compact{min-height:108px;}',
      '.firstresponse-catalog{border:1px solid #334155;border-radius:16px;background:rgba(15,23,42,.72);overflow:hidden;}',
      '.firstresponse-catalog summary{min-height:50px;padding:14px 16px;cursor:pointer;color:#dbeafe;font-size:12px;font-weight:900;}',
      '.firstresponse-catalog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:0 14px 14px;}',
      '.firstresponse-badges{padding:13px;border:1px solid #334155;border-radius:14px;background:#0f172a;}',
      '@media(max-width:980px){.firstresponse-core-grid{grid-template-columns:repeat(3,minmax(0,1fr));}.firstresponse-catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media(max-width:720px){.firstresponse-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.firstresponse-core-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media(max-width:520px){.firstresponse-menu-shell{padding:0;}.firstresponse-command{padding:14px;border-radius:16px;}.firstresponse-command-top{flex-direction:column;}.firstresponse-status{white-space:normal;}.firstresponse-core-grid,.firstresponse-catalog-grid{grid-template-columns:1fr;}.firstresponse-primary{width:100%;}.firstresponse-actions{align-items:stretch;}.firstresponse-action-note{width:100%;}.firstresponse-menu-tile{min-height:100px;}}',
      '@media(prefers-reduced-motion:reduce){.firstresponse-primary,.firstresponse-menu-tile{transition:none;}.firstresponse-primary:hover,.firstresponse-menu-tile:hover{transform:none;}}',
      '.theme-contrast .firstresponse-command,.theme-contrast .firstresponse-section,.theme-contrast .firstresponse-catalog,.theme-contrast .firstresponse-badges{box-shadow:none;border-width:2px;}'
    ].join('\n');
    if (document.head) document.head.appendChild(firstResponseStyle);
  }

  window.StemLab.registerTool('firstResponse', {
    name: 'First Response Lab',
    icon: '🚑',
    category: 'life-skills',
    description: 'Recognize and respond to medical emergencies. Hands-only CPR rhythm trainer, AED walkthrough, Stop the Bleed, choking, seizure, stroke, anaphylaxis. Disability-affirming peer response. Maine 911 + text-to-911. Educational only — get certified at redcross.org or heart.org.',
    tags: ['first-aid', 'cpr', 'aed', 'emergency', 'safety', 'life-skills', 'maine', 'disability-affirming'],

    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      try {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      // State persistence via ctx.toolData (system-managed; survives reload).
      var d = (ctx.toolData && ctx.toolData['firstResponse']) || {};
      var upd = function(key, val) { ctx.update('firstResponse', key, val); };
      var updMulti = function(obj) {
        if (ctx.updateMulti) ctx.updateMulti('firstResponse', obj);
        else Object.keys(obj).forEach(function(k) { upd(k, obj[k]); });
      };
      var addToast = ctx.addToast || function(msg) { console.log('[FirstResponse]', msg); };

      // Grade band drives content depth: k2 / g35 / g68 / g912.
      // Default to g68 if host hasn't set one — middle-band keeps the most users
      // on relevant content without exposing K-2 to OD/MH protocols.
      var gradeBand = (ctx.gradeBand || 'g68').toLowerCase();
      if (['k2','g35','g68','g912'].indexOf(gradeBand) === -1) gradeBand = 'g68';

      // ── First Action Sleuth shared data (hoisted so both the play view
      // and the Mastery view can reference the same canonical list) ──
      var FA_ACTIONS = [
        { id: 'callEMS',  label: __alloT('stem.firstresponse.call_911', 'Call 911'),                  color: '#dc2626', icon: '📞', def: 'Activate emergency services. In Maine you can text 911 too.' },
        { id: 'cpr',      label: __alloT('stem.firstresponse.start_cpr', 'Start CPR'),                 color: '#ef4444', icon: '❤️', def: 'Hands-only chest compressions, 2 inches deep, 100–120/min.' },
        { id: 'aed',      label: __alloT('stem.firstresponse.apply_aed', 'Apply AED'),                 color: '#f59e0b', icon: '⚡', def: 'Power on, attach pads, follow voice prompts. Continue compressions until shock.' },
        { id: 'pressure', label: __alloT('stem.firstresponse.direct_pressure', 'Direct pressure'),           color: '#7c3aed', icon: '🩹', def: 'Press hard on the wound with whatever cloth is at hand. Maintain pressure.' },
        { id: 'heimlich', label: __alloT('stem.firstresponse.abdominal_thrusts', 'Abdominal thrusts'),         color: '#0ea5e9', icon: '🫶', def: 'Inward and upward thrusts above the navel until object dislodges.' },
        { id: 'recovery', label: __alloT('stem.firstresponse.recovery_position', 'Recovery position'),         color: '#16a34a', icon: '🛌', def: 'Roll onto side; keeps airway open and prevents aspiration if they vomit.' }
      ];
      // Compact vignette index for Mastery view (full scenarios still live in
      // renderFirstActionSleuth's local block to keep this hoist small).
      var FA_VIGNETTE_INDEX = [
        { id: 1,  short: 'Coworker collapse — unresponsive, no pulse',           correct: 'callEMS' },
        { id: 2,  short: '7-year-old pulled from pool — alone',                  correct: 'cpr' },
        { id: 3,  short: 'Bright-red pulsing bleed — thigh',                     correct: 'pressure' },
        { id: 4,  short: 'Choking at dinner — universal sign',                   correct: 'heimlich' },
        { id: 5,  short: 'CPR in progress, AED arrives ready',                   correct: 'aed' },
        { id: 6,  short: 'Post-seizure, breathing normally',                     correct: 'recovery' },
        { id: 7,  short: 'Sudden FAST-positive (face droop, slurred speech)',    correct: 'callEMS' },
        { id: 8,  short: 'Crushing chest pain radiating to left arm',            correct: 'callEMS' },
        { id: 9,  short: 'Unresponsive adult, breathing normally',               correct: 'recovery' },
        { id: 10, short: 'Severe asthma attack, cannot speak in sentences',      correct: 'callEMS' }
      ];

      // ── State schema (defaults for first launch) ──
      var view = d.view || 'menu';
      var consentAccepted = !!d.consentAccepted;
      var modulesVisited = d.modulesVisited || {};
      var quizResults = d.quizResults || {};
      var badges = d.badges || {};
      var faMastery = d.faMastery || {};
      var quizState = d.quizState || { idx: 0, score: 0, answered: false, lastChoice: null };

      // ── Hydration + Canvas-survival persistence ──
      // The StemLab host's localStorage block does not include firstResponse,
      // so reloads wipe state by default. Layer our own: window slot →
      // localStorage → host state, plus project-JSON ride-along.
      var _frHydrated = useRef(false);
      if (!_frHydrated.current) {
        _frHydrated.current = true;
        try {
          var winState = (typeof window !== 'undefined' && window.__alloflowFirstResponse) || null;
          var lsState = null;
          try { lsState = JSON.parse(localStorage.getItem('firstResponse.state.v1') || 'null'); } catch (e) {}
          var seed = winState || lsState || null;
          if (seed && typeof seed === 'object') {
            var merge = {};
            if (seed.consentAccepted && d.consentAccepted === undefined) merge.consentAccepted = seed.consentAccepted;
            if (seed.badges && d.badges === undefined) merge.badges = seed.badges;
            if (seed.modulesVisited && d.modulesVisited === undefined) merge.modulesVisited = seed.modulesVisited;
            if (seed.faMastery && d.faMastery === undefined) merge.faMastery = seed.faMastery;
            if (Object.keys(merge).length > 0) updMulti(merge);
          }
        } catch (e) {}
      }

      // First-correct celebration state (auto-clears after 3.5s).
      var _frCeleb = useState(null);
      var frCeleb = _frCeleb[0];
      var setFrCeleb = _frCeleb[1];

      // Mirror persistent state to window slot + localStorage.
      useEffect(function () {
        try {
          var snapshot = {
            consentAccepted: !!d.consentAccepted,
            badges: d.badges || {},
            modulesVisited: d.modulesVisited || {},
            faMastery: d.faMastery || {},
            _ts: Date.now()
          };
          window.__alloflowFirstResponse = snapshot;
          try { localStorage.setItem('firstResponse.state.v1', JSON.stringify(snapshot)); } catch (e) {}
        } catch (e) {}
      }, [d.consentAccepted, d.badges, d.modulesVisited, d.faMastery]);

      // Hot-reload from project-JSON load mid-session.
      useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowFirstResponse || {};
            var patch = {};
            if (w.consentAccepted) patch.consentAccepted = w.consentAccepted;
            if (w.badges) patch.badges = w.badges;
            if (w.modulesVisited) patch.modulesVisited = w.modulesVisited;
            if (w.faMastery) patch.faMastery = w.faMastery;
            if (Object.keys(patch).length > 0) updMulti(patch);
          } catch (e) {}
        }
        window.addEventListener('alloflow-firstresponse-restored', onRestore);
        return function () { window.removeEventListener('alloflow-firstresponse-restored', onRestore); };
      }, []);

      // Award badge once (idempotent). frAnnounce + toast for SR + visual feedback.
      function awardBadge(id, label) {
        if (badges[id]) return;
        var nextBadges = Object.assign({}, badges);
        nextBadges[id] = { earned: new Date().toISOString(), label: label };
        upd('badges', nextBadges);
        addToast('🏅 Badge: ' + label);
        frAnnounce('Badge earned: ' + label);
      }

      function markVisited(modId) {
        if (modulesVisited[modId]) return;
        var nextVisited = Object.assign({}, modulesVisited);
        nextVisited[modId] = new Date().toISOString();
        upd('modulesVisited', nextVisited);
      }

      // Theme tokens — match RoadReady palette so the tool feels native.
      var T = {
        bg: '#0f172a', card: '#1e293b', cardAlt: '#0b1426', border: 'var(--allo-stem-border, #334155)',
        text: '#f1f5f9', muted: '#cbd5e1', dim: '#94a3b8',
        accent: '#dc2626', accentHi: '#fca5a5',
        ok: '#22c55e', warn: '#f59e0b', danger: '#ef4444',
        link: '#93c5fd'
      };

      // Shared button style helper (keeps focus-visible behavior consistent).
      function btn(extra) {
        return Object.assign({
          padding: '10px 16px', borderRadius: 10, border: '1px solid ' + T.border,
          background: T.card, color: T.text, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left'
        }, extra || {});
      }
      function btnPrimary(extra) {
        return Object.assign(btn({ background: T.accent, color: '#fff', border: '1px solid ' + T.accent }), extra || {});
      }

      // ─────────────────────────────────────────
      // CONSENT SCREEN — one-time gate
      // ─────────────────────────────────────────
      function renderConsent() {
        return h('div', { 'data-fr-focusable': true,
          style: { padding: 24, maxWidth: 720, margin: '0 auto', color: T.text } },
          h('div', { role: 'region', 'aria-label': __alloT('stem.firstresponse.first_response_lab_consent_and_educati', 'First Response Lab consent and educational scope'),
            style: { background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 14, padding: 24 } },
            h('h2', { style: { margin: '0 0 12px', fontSize: 22, color: '#fde2e2' } },
              __alloT('stem.firstresponse.first_response_lab_is_an_educational_t', '🚑 First Response Lab is an EDUCATIONAL tool.')),
            h('p', { style: { margin: '0 0 12px', color: '#fde2e2', lineHeight: 1.55 } },
              __alloT('stem.firstresponse.it_teaches_you_to', 'It teaches you to '),
              h('strong', null, 'recognize'),
              __alloT('stem.firstresponse.medical_emergencies_and', ' medical emergencies and '),
              h('strong', null, __alloT('stem.firstresponse.what_to_do', 'what to do')),
              __alloT('stem.firstresponse.it_is', '. It is '),
              h('strong', null, 'NOT'),
              __alloT('stem.firstresponse.a_substitute_for_hands_on_certificatio', ' a substitute for hands-on certification.')),
            h('p', { style: { margin: '0 0 12px', color: '#fde2e2', lineHeight: 1.55 } },
              __alloT('stem.firstresponse.to_get_certified_take_a_course_with_th', 'To get certified, take a course with the '),
              h('a', { href: 'https://www.redcross.org/take-a-class', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, __alloT('stem.firstresponse.american_red_cross', 'American Red Cross')),
              __alloT('stem.firstresponse.the', ', the '),
              h('a', { href: 'https://cpr.heart.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, __alloT('stem.firstresponse.american_heart_association', 'American Heart Association')),
              __alloT('stem.firstresponse.or_your_local', ', or your local '),
              h('a', { href: 'https://www.maine.gov/ems', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, __alloT('stem.firstresponse.maine_ems', 'Maine EMS')),
              ' chapter.'),
            h('p', { style: { margin: '0 0 16px', color: '#fde2e2', lineHeight: 1.55 } },
              h('strong', null, __alloT('stem.firstresponse.in_a_real_emergency_call_911', 'In a real emergency, call 911.')),
              __alloT('stem.firstresponse.in_maine_you_can', ' In Maine, you can '),
              h('strong', null, __alloT('stem.firstresponse.text_911', 'text 911')),
              __alloT('stem.firstresponse.if_you_cannot_speak', ' if you cannot speak.')),
            h('button', { 'data-fr-focusable': true,
              'aria-label': __alloT('stem.firstresponse.i_understand_show_me_the_lab', 'I understand. Show me the lab.'),
              onClick: function() {
                updMulti({ consentAccepted: true, consentDate: new Date().toISOString(), view: 'menu' });
                awardBadge('first_responder_in_training', 'First Responder in Training');
                frAnnounceUrgent('Consent accepted. Welcome to First Response Lab.');
              },
              style: { padding: '12px 22px', borderRadius: 10, border: 'none', background: '#fff', color: '#7f1d1d', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
            }, __alloT('stem.firstresponse.i_understand_show_me_the_lab_2', 'I understand — show me the lab'))
          ),
          h('p', { style: { marginTop: 14, fontSize: 12, color: T.dim, fontStyle: 'italic' } },
            __alloT('stem.firstresponse.acknowledging_this_screen_is_a_one_tim', 'Acknowledging this screen is a one-time gate. Your acknowledgment is saved with your profile so you do not see it again.'))
        );
      }

      // ─────────────────────────────────────────
      // PERSISTENT BANNER (shown above every clinical view)
      // ─────────────────────────────────────────
      function emergencyBanner() {
        return h('div', { role: 'region', 'aria-label': __alloT('stem.firstresponse.emergency_reminder', 'Emergency reminder'),
          style: { margin: '0 0 14px', padding: '10px 14px', borderRadius: 10, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h('span', { 'aria-hidden': 'true' }, '🚑'),
          h('span', null,
            h('strong', null, __alloT('stem.firstresponse.in_a_real_emergency_call_911_2', 'In a real emergency: call 911')),
            __alloT('stem.firstresponse.in_maine_you_can_text_911_this_tool_is', ' — in Maine you can text 911. This tool is educational only.'))
        );
      }

      // ─────────────────────────────────────────
      // DISCLAIMER FOOTER (renders below every clinical content view)
      // ─────────────────────────────────────────
      function disclaimerFooter() {
        return h('div', { role: 'contentinfo', 'aria-label': __alloT('stem.firstresponse.educational_disclaimer', 'Educational disclaimer'),
          style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55 } },
          __alloT('stem.firstresponse.educational_only_real_emergencies', 'Educational only. Real emergencies → '),
          h('strong', { style: { color: T.accentHi } }, '911'),
          __alloT('stem.firstresponse.get_certified', '. Get certified → '),
          h('a', { href: 'https://www.redcross.org/take-a-class', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'redcross.org'),
          ' · ',
          h('a', { href: 'https://cpr.heart.org', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'heart.org'),
          ' · ',
          h('a', { href: 'https://www.stopthebleed.org', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'stopthebleed.org')
        );
      }

      // ─────────────────────────────────────────
      // MENU — module router
      // ─────────────────────────────────────────
      // Tile metadata. order = top-down on the menu. status indicator shows
      // whether the user has visited that module (small green dot).
      var MENU_TILES = [
        { id: 'recognize', icon: '👁️', label: __alloT('stem.firstresponse.recognize', 'Recognize'), desc: __alloT('stem.firstresponse.visual_signs_of_12_emergencies_quiz_at', 'Visual signs of 12 emergencies. Quiz at the end.'), ready: true },
        { id: 'call', icon: '📞', label: __alloT('stem.firstresponse.call_911_988', 'Call (911 + 988)'), desc: __alloT('stem.firstresponse.what_to_say_text_to_911_when_988_vs_91', 'What to say. Text-to-911. When 988 vs 911.'), ready: true },
        { id: 'cprAed', icon: '❤️', label: __alloT('stem.firstresponse.cpr_aed', 'CPR + AED'), desc: __alloT('stem.firstresponse.hands_only_rhythm_trainer_aed_walkthro', 'Hands-only rhythm trainer. AED walkthrough.'), ready: true },
        { id: 'bleed', icon: '🩸', label: __alloT('stem.firstresponse.stop_the_bleed', 'Stop the Bleed'), desc: __alloT('stem.firstresponse.pressure_packing_tourniquet', 'Pressure → packing → tourniquet.'), ready: true },
        { id: 'choking', icon: '😬', label: __alloT('stem.firstresponse.choking', 'Choking'), desc: __alloT('stem.firstresponse.infant_child_adult_pregnant_alone', 'Infant, child, adult, pregnant, alone.'), ready: true },
        { id: 'disabilityAware', icon: '♾️', label: __alloT('stem.firstresponse.disability_aware_response', 'Disability-aware response'), desc: __alloT('stem.firstresponse.deaf_hoh_autistic_epilepsy_hidden_disa', 'Deaf/HoH, autistic, epilepsy, hidden disability.'), ready: true },
        { id: 'scenarios', icon: '🎭', label: __alloT('stem.firstresponse.scenario_sim', 'Scenario sim'), desc: __alloT('stem.firstresponse.multi_step_branching_emergency_decisio', 'Multi-step branching emergency decisions.'), ready: true },
        { id: 'firstAction', icon: '🎯', label: __alloT('stem.firstresponse.first_action_sleuth', 'First Action Sleuth'), desc: __alloT('stem.firstresponse.10_vignettes_pick_the_first_action_fro', '10 vignettes. Pick the FIRST action from 6 options (call EMS, CPR, AED, pressure, abdominal thrusts, recovery position). Builds the decision reflex.'), ready: true },
        { id: 'aiPractice', icon: '🤖', label: __alloT('stem.firstresponse.ai_practice', 'AI Practice'), desc: __alloT('stem.firstresponse.novel_scenes_you_write_the_response_ai', 'Novel scenes — you write the response, AI critiques.'), ready: true },
        { id: 'mastery', icon: '🏅', label: __alloT('stem.firstresponse.responder_mastery', 'Responder Mastery'), desc: __alloT('stem.firstresponse.cross_attempt_log_of_every_first_actio', 'Cross-attempt log of every First Action scenario you have nailed, plus per-action coverage.'), ready: true },
        { id: 'resources', icon: '📚', label: __alloT('stem.firstresponse.resources', 'Resources'), desc: __alloT('stem.firstresponse.every_org_cited_in_this_tool_tap_to_ca', 'Every org cited in this tool. Tap to call or visit.'), ready: true }
      ];

      function renderMenu() {
        var _mMastery = (d.faMastery && typeof d.faMastery === 'object') ? d.faMastery : {};
        var _mDoneCount = FA_VIGNETTE_INDEX.filter(function(v) { return !!_mMastery[v.id]; }).length;
        var _mTotal = FA_VIGNETTE_INDEX.length;
        var coreIds = ['recognize', 'call', 'cprAed', 'bleed', 'choking'];
        var coreTiles = coreIds.map(function(id) { return MENU_TILES.filter(function(tile) { return tile.id === id; })[0]; }).filter(Boolean);
        var catalogTiles = MENU_TILES.filter(function(tile) { return coreIds.indexOf(tile.id) < 0; });
        var learningTiles = MENU_TILES.filter(function(tile) { return tile.id !== 'resources'; });
        var visitedCount = learningTiles.filter(function(tile) { return !!modulesVisited[tile.id]; }).length;
        var coreCompleted = coreTiles.filter(function(tile) { return !!modulesVisited[tile.id]; }).length;
        var nextTile = coreTiles.filter(function(tile) { return !modulesVisited[tile.id]; })[0]
          || learningTiles.filter(function(tile) { return !modulesVisited[tile.id]; })[0]
          || MENU_TILES.filter(function(tile) { return tile.id === 'mastery'; })[0];

        function openTile(tile) {
          if (!tile || !tile.ready) return;
          upd('view', tile.id);
          markVisited(tile.id);
          frAnnounce('Opening ' + tile.label);
        }

        function metric(label, value) {
          return h('div', { className: 'firstresponse-metric', role: 'listitem' },
            h('span', { className: 'firstresponse-metric-label' }, label),
            h('strong', { className: 'firstresponse-metric-value' }, value));
        }

        function renderTile(tile, core, compact) {
          var visited = !!modulesVisited[tile.id];
          return h('div', { key: tile.id, role: 'listitem', className: 'firstresponse-tile-wrap' },
            h('button', {
              type: 'button',
              className: 'firstresponse-menu-tile' + (compact ? ' firstresponse-menu-tile--compact' : ''),
              'data-fr-focusable': true,
              disabled: !tile.ready,
              'aria-label': tile.label + (visited ? ' (visited)' : '') + (core ? ' - core response step' : ''),
              onClick: function() { openTile(tile); },
              style: btn({
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: 14, background: core ? '#101b3d' : T.card,
                borderColor: visited ? T.ok : (core ? '#3b82f6' : T.border),
                borderWidth: core ? 2 : 1, borderStyle: 'solid'
              })
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, tile.icon),
                h('span', { style: { fontWeight: 700, fontSize: compact ? 13 : 14, flex: 1 } }, tile.label),
                visited && h('span', { 'aria-hidden': 'true', style: { color: T.ok, fontSize: 14 } }, '\u2713')),
              h('div', { style: { fontSize: compact ? 11 : 12, color: T.muted, lineHeight: 1.45 } }, tile.desc)
            )
          );
        }

        return h('main', { className: 'firstresponse-menu-shell', 'data-firstresponse-readiness': 'true' },
          emergencyBanner(),
          h('header', { className: 'firstresponse-command' },
            h('div', { className: 'firstresponse-command-top' },
              h('div', null,
                h('p', { className: 'firstresponse-eyebrow' }, __alloT('stem.firstresponse.readiness_label', 'Emergency response readiness')),
                h('h2', { className: 'firstresponse-title' }, __alloT('stem.firstresponse.first_response_lab', 'First Response Lab')),
                h('p', { className: 'firstresponse-subtitle' }, __alloT('stem.firstresponse.readiness_blurb', 'Build the decision sequence: recognize the emergency, activate help, then choose the appropriate first action.'))),
              h('div', { className: 'firstresponse-status', role: 'status' }, __alloT('stem.firstresponse.education_status', 'Educational only - real emergencies: call 911'))),
            h('div', { className: 'firstresponse-metrics', role: 'list', 'aria-label': __alloT('stem.firstresponse.progress_label', 'First Response progress') },
              metric(__alloT('stem.firstresponse.core_readiness', 'Core readiness'), coreCompleted + ' / ' + coreTiles.length),
              metric(__alloT('stem.firstresponse.modules_explored', 'Modules explored'), visitedCount + ' / ' + learningTiles.length),
              metric(__alloT('stem.firstresponse.scenario_mastery', 'Scenario mastery'), _mDoneCount + ' / ' + _mTotal),
              metric(__alloT('stem.firstresponse.badges', 'Badges'), String(Object.keys(badges).length))),
            h('div', { className: 'firstresponse-actions' },
              h('button', { type: 'button', className: 'firstresponse-primary', onClick: function() { openTile(nextTile); } },
                coreCompleted < coreTiles.length ? __alloT('stem.firstresponse.continue_core', 'Continue core response path') : __alloT('stem.firstresponse.continue_practice', 'Continue practice')),
              h('span', { className: 'firstresponse-action-note' }, nextTile ? nextTile.label : __alloT('stem.firstresponse.review', 'Review mastery')))),

          h('section', { className: 'firstresponse-section', 'aria-labelledby': 'firstresponse-core-heading' },
            h('div', { className: 'firstresponse-section-head' },
              h('div', null,
                h('h3', { id: 'firstresponse-core-heading' }, __alloT('stem.firstresponse.core_path', 'Recognize - Call - Act')),
                h('p', null, __alloT('stem.firstresponse.core_path_blurb', 'Start with recognition and emergency activation, then learn the core response modules.'))),
              h('span', { className: 'firstresponse-action-note' }, coreCompleted + ' / ' + coreTiles.length)),
            h('div', { className: 'firstresponse-core-grid', role: 'list' },
              coreTiles.map(function(tile) { return renderTile(tile, true, false); }))),

          h('details', { className: 'firstresponse-catalog', open: coreCompleted === coreTiles.length },
            h('summary', null, __alloT('stem.firstresponse.more_practice', 'More practice, accessibility, mastery, and resources') + ' (' + catalogTiles.length + ')'),
            h('div', { className: 'firstresponse-catalog-grid', role: 'list' },
              catalogTiles.map(function(tile) { return renderTile(tile, false, true); }))),

          Object.keys(badges).length > 0 && h('section', { className: 'firstresponse-badges', 'aria-label': __alloT('stem.firstresponse.badges_earned', 'Badges earned') },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 } }, __alloT('stem.firstresponse.badges_earned', 'Badges earned')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(badges).map(function(bid) {
                return h('span', { key: bid, style: { fontSize: 11, padding: '4px 10px', borderRadius: '999rem', background: '#1e3a8a', color: '#dbeafe', border: '1px solid #1e40af' } }, badges[bid].label || bid);
              }))),
          disclaimerFooter()
        );
      }

      // Back button (returns to menu)
      function backBar(title) {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
          h('button', { 'data-fr-focusable': true,
            'aria-label': __alloT('stem.firstresponse.back_to_first_response_lab_menu', 'Back to First Response Lab menu'),
            onClick: function() { upd('view', 'menu'); frAnnounce('Back to menu'); },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, __alloT('stem.firstresponse.menu', '← Menu')),
          h('h2', { style: { margin: 0, fontSize: 18, color: T.text, flex: 1 } }, title)
        );
      }

      // ─────────────────────────────────────────
      // RECOGNIZE module — card grid + 5-Q quiz
      // ─────────────────────────────────────────
      function bandIncludes(card, band) {
        if (card.bands === 'all') return true;
        return card.bands.split(',').indexOf(band) !== -1;
      }

      function renderRecognize() {
        var visibleCards = RECOGNIZE_CARDS.filter(function(c) { return bandIncludes(c, gradeBand); });
        var showQuiz = (d.recognizeView === 'quiz');
        return h('div', { style: { padding: 20, maxWidth: 960, margin: '0 auto', color: T.text } },
          backBar('👁️ Recognize'),
          emergencyBanner(),
          !showQuiz && h('div', null,
            h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              __alloT('stem.firstresponse.these_are_the', 'These are the '),
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.recognition_cues', 'recognition cues')),
              __alloT('stem.firstresponse.what_you_would_actually_see_tap_a_card', ' — what you would actually see. Tap a card for the first action at your grade band ('),
              h('strong', { style: { color: T.text } }, gradeBand.toUpperCase()),
              __alloT('stem.firstresponse.sources_cited_on_each_card', '). Sources cited on each card.')),
            h('div', { role: 'list',
              style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 } },
              visibleCards.map(function(card) {
                var firstText = card.first[gradeBand] || card.first.g68 || card.first.g912 || '';
                return h('div', { key: card.id, role: 'listitem',
                  style: { padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, card.icon),
                    h('span', { style: { fontWeight: 700, fontSize: 14 } }, card.name)
                  ),
                  h('div', { style: { fontSize: 12, color: T.accentHi, fontStyle: 'italic', marginBottom: 6 } },
                    'Sign: ', card.cue),
                  h('div', { style: { fontSize: 13, color: T.text, lineHeight: 1.5, marginBottom: 6 } },
                    h('strong', null, __alloT('stem.firstresponse.first_action', 'First action: ')), firstText),
                  h('div', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic' } },
                    'Source: ', card.source)
                );
              })
            ),
            h('div', { style: { marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.start_the_5_question_recognition_quiz', 'Start the 5-question recognition quiz'),
                onClick: function() {
                  updMulti({ recognizeView: 'quiz', quizState: { idx: 0, score: 0, answered: false, lastChoice: null } });
                  frAnnounce('Quiz started. Question 1 of 5.');
                },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.take_the_5_question_quiz', '🎯 Take the 5-question quiz')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.go_to_resources_tab', 'Go to Resources tab'),
                onClick: function() { upd('view', 'resources'); markVisited('resources'); },
                style: btn()
              }, __alloT('stem.firstresponse.resources_2', '📚 Resources'))
            ),
            disclaimerFooter()
          ),
          showQuiz && renderRecognizeQuiz()
        );
      }

      function renderRecognizeQuiz() {
        var qs = quizState;
        // End screen
        if (qs.idx >= RECOGNIZE_QUIZ.length) {
          var pct = Math.round((qs.score / RECOGNIZE_QUIZ.length) * 100);
          // Persist result + award badge for any pass.
          // Side effect on render is intentional here — we want to award once
          // when the user lands on the end screen.
          if (!d.lastQuizResult || d.lastQuizResult.idx !== qs.idx || d.lastQuizResult.score !== qs.score) {
            updMulti({
              quizResults: Object.assign({}, quizResults, {
                recognize: { correct: qs.score, total: RECOGNIZE_QUIZ.length, dateISO: new Date().toISOString() }
              }),
              lastQuizResult: { idx: qs.idx, score: qs.score }
            });
            if (qs.score >= 4) awardBadge('recognizer', 'Recognizer (4+/5 on Recognize quiz)');
            if (qs.score === RECOGNIZE_QUIZ.length) awardBadge('recognizer_perfect', 'Sharp Eyes (perfect score)');
          }
          // Tier message scaling — uses the existing pct >= 80 threshold but offers
          // more granular feedback at the in-between band.
          var tier = qs.score === RECOGNIZE_QUIZ.length ? 'perfect'
                     : pct >= 80 ? 'strong'
                     : pct >= 50 ? 'learning'
                     : 'review';
          var tierColor = tier === 'perfect' ? '#fbbf24'
                          : tier === 'strong' ? T.ok
                          : tier === 'learning' ? '#f59e0b'
                          : T.danger;
          var tierIcon = tier === 'perfect' ? '🏆' : tier === 'strong' ? '🎉' : tier === 'learning' ? '📚' : '📖';
          var tierTitle = tier === 'perfect' ? 'Sharp Eyes — perfect score!'
                          : tier === 'strong' ? 'Solid recognition'
                          : tier === 'learning' ? 'Building the eye'
                          : 'Review the cards';
          var tierMsg = tier === 'perfect'
                        ? 'You can recognize every emergency in the deck. Move on to action modules — CPR + AED, Stop the Bleed, Choking.'
                        : tier === 'strong'
                          ? 'You have solid recognition. Move on to the action modules — Call, CPR + AED, Stop the Bleed.'
                          : tier === 'learning'
                            ? 'Halfway there. Re-read the cards for the emergencies that tripped you up — recognition is the gate to response.'
                            : 'Recognition is the most important step — you can’t respond to what you don’t see. Review the cards and try again.';
          var rad = 36, circ = 2 * Math.PI * rad;
          var dashOff = circ - (pct / 100) * circ;
          return h('div', { role: 'region', 'aria-label': __alloT('stem.firstresponse.quiz_results', 'Quiz results'),
            style: { padding: 0, borderRadius: 14, overflow: 'hidden', border: '2px solid ' + tierColor + 'aa', background: T.card } },
            h('div', {
              style: {
                padding: 18,
                background: 'linear-gradient(135deg, ' + tierColor + '22, transparent)',
                display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap'
              }
            },
              // Score donut
              h('div', { style: { position: 'relative', width: 96, height: 96, flexShrink: 0 } },
                h('svg', { viewBox: '0 0 100 100', width: 96, height: 96,
                  'aria-label': 'Score: ' + qs.score + ' out of ' + RECOGNIZE_QUIZ.length
                },
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                    strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
                ),
                h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                  h('div', { style: { fontSize: 22, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                  h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted } }, qs.score + ' / ' + RECOGNIZE_QUIZ.length)
                )
              ),
              // Tier headline + message
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('div', { style: { fontSize: 30, marginBottom: 4 }, 'aria-hidden': 'true' }, tierIcon),
                h('h3', { style: { margin: '0 0 6px', fontSize: 18, color: tierColor, fontWeight: 900, lineHeight: 1.15 } }, tierTitle),
                h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.55 } }, tierMsg)
              )
            ),
            h('div', { style: { padding: 14, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', borderTop: '1px solid ' + T.border } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.retake_the_recognition_quiz', 'Retake the recognition quiz'),
                onClick: function() {
                  updMulti({ quizState: { idx: 0, score: 0, answered: false, lastChoice: null }, lastQuizResult: null });
                  frAnnounce('Quiz restarted. Question 1 of 5.');
                },
                style: btn()
              }, __alloT('stem.firstresponse.retake', '↺ Retake')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.back_to_recognize_cards', 'Back to recognize cards'),
                onClick: function() { upd('recognizeView', 'cards'); frAnnounce('Back to recognize cards'); },
                style: btn()
              }, __alloT('stem.firstresponse.back_to_cards', '← Back to cards')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.back_to_menu', 'Back to menu'),
                onClick: function() { upd('view', 'menu'); frAnnounce('Back to menu'); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.menu_2', '→ Menu'))
            ),
            disclaimerFooter()
          );
        }
        // Question screen
        var q = RECOGNIZE_QUIZ[qs.idx];
        var answered = !!qs.answered;
        var lastChoice = qs.lastChoice;
        return h('div', { role: 'region', 'aria-label': 'Recognition quiz question ' + (qs.idx + 1),
          style: { padding: 18, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 } },
            h('div', { style: { fontSize: 12, color: T.dim } }, __alloT('stem.firstresponse.question', 'Question '), (qs.idx + 1), ' of ', RECOGNIZE_QUIZ.length),
            h('div', { style: { fontSize: 12, color: T.muted } }, 'Score: ', qs.score)
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 30 } }, q.icon),
            h('p', { style: { margin: 0, color: T.text, fontSize: 14, lineHeight: 1.55 } }, q.stem)
          ),
          h('div', { role: 'group', 'aria-label': __alloT('stem.firstresponse.answer_choices', 'Answer choices'),
            style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 } },
            q.choices.map(function(choice, i) {
              var isPicked = lastChoice === i;
              var isCorrect = i === q.correct;
              var bg = T.card, border = T.border, color = T.text;
              if (answered && isCorrect) { bg = '#064e3b'; border = T.ok; color = '#d1fae5'; }
              else if (answered && isPicked && !isCorrect) { bg = '#7f1d1d'; border = T.danger; color = '#fde2e2'; }
              return h('button', { key: i, 'data-fr-focusable': true,
                disabled: answered,
                'aria-label': 'Choice ' + (i + 1) + ': ' + choice + (answered && isCorrect ? ' (correct answer)' : '') + (answered && isPicked && !isCorrect ? ' (your choice, incorrect)' : ''),
                onClick: function() {
                  if (answered) return;
                  var correct = i === q.correct;
                  updMulti({ quizState: { idx: qs.idx, score: qs.score + (correct ? 1 : 0), answered: true, lastChoice: i } });
                  frAnnounceUrgent(correct ? 'Correct.' : 'Not quite. ' + q.why);
                },
                style: btn({ background: bg, borderColor: border, color: color, cursor: answered ? 'default' : 'pointer' })
              }, choice);
            })
          ),
          answered && h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 13, color: T.muted, lineHeight: 1.5 } },
            h('strong', { style: { color: T.text } }, 'Why: '), q.why),
          h('div', { style: { marginTop: 12, display: 'flex', justifyContent: 'flex-end' } },
            answered && h('button', { 'data-fr-focusable': true,
              'aria-label': qs.idx + 1 >= RECOGNIZE_QUIZ.length ? 'See results' : 'Next question',
              onClick: function() {
                updMulti({ quizState: { idx: qs.idx + 1, score: qs.score, answered: false, lastChoice: null } });
                frAnnounce(qs.idx + 1 >= RECOGNIZE_QUIZ.length ? 'Showing results.' : 'Question ' + (qs.idx + 2) + ' of ' + RECOGNIZE_QUIZ.length);
              },
              style: btnPrimary()
            }, qs.idx + 1 >= RECOGNIZE_QUIZ.length ? 'See results →' : 'Next →')
          )
        );
      }

      // ─────────────────────────────────────────
      // CALL module — when to call what + dispatcher script
      // Sub-views: 'overview' (default), 'tap-to-call', 'practice'
      // ─────────────────────────────────────────
      function renderCall() {
        var callView = d.callView || 'overview';
        var pickedTag = d.callDecisionTag || null;
        var picked = pickedTag ? CALL_DECISIONS.filter(function(c) { return c.tag === pickedTag; })[0] : null;

        function tabBtn(id, label) {
          var active = callView === id;
          return h('button', { 'data-fr-focusable': true, key: id,
            'aria-pressed': active ? 'true' : 'false',
            'aria-label': label + (active ? ' (current)' : ''),
            onClick: function() { upd('callView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        function callOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.which_line_do_i_call', '🤔 Which line do I call?')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                __alloT('stem.firstresponse.pick_the_situation_that_fits_calling_t', 'Pick the situation that fits. Calling the wrong line is rarely a disaster — but knowing the right one helps.')),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                CALL_DECISIONS.map(function(c) {
                  var active = pickedTag === c.tag;
                  return h('button', { key: c.tag, role: 'listitem', 'data-fr-focusable': true,
                    'aria-pressed': active ? 'true' : 'false',
                    onClick: function() { upd('callDecisionTag', c.tag); frAnnounce('Selected: ' + c.situation + '. Call ' + c.line + '.'); },
                    style: btn({
                      padding: '8px 12px', fontSize: 12, lineHeight: 1.45,
                      background: active ? '#1e3a8a' : T.cardAlt,
                      color: active ? '#dbeafe' : T.text,
                      borderColor: active ? '#1e40af' : T.border
                    })
                  }, c.situation);
                })
              ),
              picked && h('div', { role: 'region', 'aria-label': __alloT('stem.firstresponse.recommended_line_for_selected_situatio', 'Recommended line for selected situation'),
                style: { marginTop: 12, padding: 12, borderRadius: 10, background: '#064e3b', border: '1px solid ' + T.ok, color: '#d1fae5' } },
                h('div', { style: { fontSize: 12, opacity: 0.8, marginBottom: 4 } }, __alloT('stem.firstresponse.call', 'Call')),
                h('div', { style: { fontSize: 22, fontWeight: 800 } }, picked.line),
                h('div', { style: { fontSize: 12, marginTop: 6, lineHeight: 1.5 } }, picked.why)
              )
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('div', { style: { fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.firstresponse.in_maine', '🌲 In Maine')),
              h('div', { style: { marginBottom: 4 } }, MAINE_EMS.text911),
              h('div', { style: { marginBottom: 4 } }, MAINE_EMS.crisisRoute),
              h('div', null, MAINE_EMS.ruralEta)
            )
          );
        }

        function callTapToCall() {
          var lines = [
            { num: '911', label: __alloT('stem.firstresponse.emergency_police_fire_ems', 'Emergency (police / fire / EMS)'), tel: '911' },
            { num: '988', label: __alloT('stem.firstresponse.suicide_crisis_lifeline', 'Suicide & Crisis Lifeline'), tel: '988' },
            { num: '741741', label: __alloT('stem.firstresponse.crisis_text_line_text_home', 'Crisis Text Line — text HOME'), tel: null, sms: '741741', body: 'HOME' },
            { num: '1-800-222-1222', label: __alloT('stem.firstresponse.poison_control', 'Poison Control'), tel: '+18002221222' },
            { num: '1-800-950-NAMI', label: __alloT('stem.firstresponse.nami_helpline_mental_health_support', 'NAMI HelpLine (mental health support)'), tel: '+18009506264' },
            { num: '1-877-565-8860', label: __alloT('stem.firstresponse.trans_lifeline', 'Trans Lifeline'), tel: '+18775658860' },
            { num: '1-800-422-4453', label: __alloT('stem.firstresponse.childhelp_national_child_abuse_hotline', 'Childhelp National Child Abuse Hotline'), tel: '+18004224453' }
          ];
          return h('div', null,
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              __alloT('stem.firstresponse.on_a_phone_tap_a_number_to_call_save_t', 'On a phone, tap a number to call. Save the ones you might need ahead of time.')),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              lines.map(function(L) {
                var href = L.sms ? ('sms:' + L.sms + (L.body ? ('?body=' + encodeURIComponent(L.body)) : '')) : ('tel:' + L.tel);
                var verb = L.sms ? 'Text' : 'Call';
                return h('a', { key: L.num, role: 'listitem', href: href,
                  'data-fr-focusable': true,
                  'aria-label': verb + ' ' + L.num + ' — ' + L.label,
                  style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 10, background: T.card, border: '1px solid ' + T.border, color: T.text, textDecoration: 'none' } },
                  h('div', null,
                    h('div', { style: { fontWeight: 700, fontSize: 16, color: T.accentHi } }, L.num),
                    h('div', { style: { fontSize: 12, color: T.muted, marginTop: 2 } }, L.label)
                  ),
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 13, color: T.link, fontWeight: 700 } }, verb + ' →')
                );
              })
            )
          );
        }

        function callPractice() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.what_to_say_to_the_911_dispatcher', '📞 What to say to the 911 dispatcher')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                __alloT('stem.firstresponse.say_it_in_this_order_location_first_so', 'Say it in this order. Location FIRST so help can roll even if your call drops.')),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                DISPATCHER_SCRIPT.map(function(s) {
                  return h('div', { key: s.step, role: 'listitem',
                    style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                      h('span', { 'aria-hidden': 'true', style: { background: T.accent, color: '#fff', borderRadius: 999, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 } }, s.step),
                      h('strong', { style: { color: T.text, fontSize: 13 } }, s.label)
                    ),
                    h('div', { style: { fontSize: 13, color: T.text, fontStyle: 'italic', marginLeft: 30, marginBottom: 4 } }, s.example),
                    h('div', { style: { fontSize: 11, color: T.dim, marginLeft: 30, lineHeight: 1.5 } }, s.tip)
                  );
                })
              )
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.text_to_911_maine', '💬 Text-to-911 (Maine)')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                __alloT('stem.firstresponse.use_text_to_911_if_you_re_deaf_hoh_can', 'Use text-to-911 if you’re deaf/HoH, can’t speak safely, or have a speech disability. Maine supports it statewide; check coverage at '),
                h('a', { href: 'https://www.maine.gov/dps/911', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'maine.gov/dps/911'),
                '.'),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                TEXT_911_SCRIPT.map(function(s) {
                  return h('div', { key: s.step, role: 'listitem',
                    style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                      h('span', { 'aria-hidden': 'true', style: { background: '#1e40af', color: '#fff', borderRadius: 999, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 } }, s.step),
                      h('strong', { style: { color: T.text, fontSize: 13 } }, s.label)
                    ),
                    h('div', { style: { fontSize: 13, color: T.text, fontFamily: 'monospace', background: T.bg, padding: '4px 8px', borderRadius: 4, marginLeft: 30, marginBottom: 4 } }, s.example),
                    h('div', { style: { fontSize: 11, color: T.dim, marginLeft: 30, lineHeight: 1.5 } }, s.tip)
                  );
                })
              )
            ),
            h('div', { style: { marginTop: 14 } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.mark_call_module_complete', 'Mark Call module complete'),
                onClick: function() { awardBadge('caller', 'Caller (knows what to say)'); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.i_ve_practiced_the_script', '✓ I’ve practiced the script'))
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📞 Call (911 + 988)'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.call_module_sections', 'Call module sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Which line?'),
            tabBtn('tap-to-call', 'Tap to call'),
            tabBtn('practice', 'Practice script')
          ),
          callView === 'overview' && callOverview(),
          callView === 'tap-to-call' && callTapToCall(),
          callView === 'practice' && callPractice(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // CPR + AED module
      // - Rhythm trainer: visual metronome 100–120 bpm + optional audio click
      //   (audio OFF by default; sensory-aware default per accommodation guidance)
      // - Practice mode: 30-sec window, user taps in rhythm, tool reports avg bpm
      // - AED walkthrough: 6-step voice-prompt simulation with shock/no-shock branch
      // All clinical numbers from AHA 2020 Guidelines (Adult Basic Life Support).
      // ─────────────────────────────────────────
      function renderCprAed() {
        var cprView = d.cprView || 'overview';
        var bpm = typeof d.cprBpm === 'number' ? d.cprBpm : 110;
        if (bpm < 100) bpm = 100;
        if (bpm > 120) bpm = 120;
        var audioOn = !!d.cprAudio; // default OFF — sensory accommodation
        var practiceRunning = !!d.cprPracticeRunning;
        var practiceStart = d.cprPracticeStart || 0;
        var practiceTaps = d.cprPracticeTaps || [];
        var practiceBest = d.cprPracticeBest || null;

        // Visual metronome beat tracker — pulses a circle in time with bpm.
        // Use a state-driven beat counter (re-render on each tick) rather than
        // raw DOM mutation so the live region announcement works for SR users
        // when beat lands on certain milestones.
        var beatTuple = useState(0);
        var beat = beatTuple[0], setBeat = beatTuple[1];
        var audioCtxRef = useRef(null);
        var intervalRef = useRef(null);

        // Close the AudioContext on unmount. Browsers limit ~4-6 contexts
        // per tab; without this, a student who navigates in and out of
        // FirstResponse multiple times in a session can silently lose
        // metronome audio after a few visits.
        useEffect(function() {
          return function() {
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
              try { audioCtxRef.current.close(); } catch (e) {}
              audioCtxRef.current = null;
            }
          };
        }, []);

        // Drive the metronome only while user is on the metronome sub-view.
        // Tearing down on unmount or sub-view change prevents background audio.
        useEffect(function() {
          if (cprView !== 'metronome' && cprView !== 'practice') {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
            return;
          }
          var intervalMs = Math.round(60000 / bpm);
          intervalRef.current = setInterval(function() {
            setBeat(function(b) { return b + 1; });
            if (audioOn) {
              try {
                if (!audioCtxRef.current) {
                  var AC = window.AudioContext || window.webkitAudioContext;
                  if (AC) audioCtxRef.current = new AC();
                }
                var ac = audioCtxRef.current;
                if (ac) {
                  var osc = ac.createOscillator();
                  var gain = ac.createGain();
                  osc.frequency.value = 880;
                  gain.gain.setValueAtTime(0.0001, ac.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.005);
                  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06);
                  osc.connect(gain).connect(ac.destination);
                  osc.start();
                  osc.stop(ac.currentTime + 0.07);
                }
              } catch(e) { /* audio init can fail silently on autoplay-blocked tabs */ }
            }
          }, intervalMs);
          return function() {
            if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
          };
        }, [cprView, bpm, audioOn]);

        function tabBtn(id, label) {
          var active = cprView === id;
          return h('button', { 'data-fr-focusable': true, key: id,
            'aria-pressed': active ? 'true' : 'false',
            'aria-label': label + (active ? ' (current)' : ''),
            onClick: function() { upd('cprView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        function cprOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, __alloT('stem.firstresponse.hands_only_cpr', '❤️ Hands-only CPR')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.for_untrained_bystanders', 'For untrained bystanders')),
                __alloT('stem.firstresponse.hands_only_cpr_no_breaths_is_what_aha_', ': hands-only CPR (no breaths) is what AHA recommends for adults who collapse suddenly. It works.')),
              h('ol', { style: { margin: '0 0 0 18px', color: T.muted, fontSize: 13, lineHeight: 1.7 } },
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.check', 'Check')), __alloT('stem.firstresponse.shake_shout_no_response_not_breathing_', ' — shake & shout. No response? Not breathing normally?')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.call_911_2', 'Call 911')), __alloT('stem.firstresponse.or_have_someone_else_call_send_another', ' (or have someone else call). Send another person for an AED.')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.push_hard_push_fast', 'Push hard, push fast')), __alloT('stem.firstresponse.center_of_chest', ' — center of chest, '),
                  h('span', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.2_inches_deep', '2 inches deep')), __alloT('stem.firstresponse.at', ', at '),
                  h('span', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.100_120_bpm', '100–120 bpm')), '.'),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.don_t_stop', 'Don’t stop')), __alloT('stem.firstresponse.until_ems_takes_over_aed_tells_you_to_', ' until EMS takes over, AED tells you to clear, or person starts breathing.')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.use_the_aed', 'Use the AED')), __alloT('stem.firstresponse.as_soon_as_it_arrives_it_talks_you_thr', ' as soon as it arrives — it talks you through it.'))
              ),
              h('div', { style: { marginTop: 10, padding: '8px 10px', borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                __alloT('stem.firstresponse.depth_2_in_5_cm_adult_1_5_in_4_cm_chil', 'Depth: 2 in (5 cm) adult, ~1.5 in (4 cm) child, ~1.5 in (4 cm) infant. Source: AHA 2020 Guidelines for CPR & ECC.'))
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, __alloT('stem.firstresponse.aed_in_one_paragraph', '⚡ AED in one paragraph')),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.aeds_are_designed_for_untrained_people', 'AEDs are designed for untrained people. Turn it on. '),
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.it_will_talk_you_through_every_step', 'It will talk you through every step.')),
                __alloT('stem.firstresponse.it_will_not_shock_someone_who_doesn_t_', ' It will not shock someone who doesn’t need it — it analyzes the heart rhythm first. '),
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.use_it', 'Use it.')),
                __alloT('stem.firstresponse.many_aeds_also_show_visual_prompts_on_', ' Many AEDs also show visual prompts on a screen for deaf and hard-of-hearing rescuers.'))
            ),
            h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.open_cpr_rhythm_metronome', 'Open CPR rhythm metronome'),
                onClick: function() { upd('cprView', 'metronome'); frAnnounce('Metronome'); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.metronome_100_120_bpm', '🥁 Metronome (100–120 bpm)')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.practice_cpr_rhythm_30_second_window', 'Practice CPR rhythm — 30 second window'),
                onClick: function() { upd('cprView', 'practice'); frAnnounce('Practice mode'); },
                style: btn()
              }, __alloT('stem.firstresponse.practice_30_sec', '⏱️ Practice (30 sec)')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.walk_through_using_an_aed', 'Walk through using an AED'),
                onClick: function() { upd('cprView', 'aed'); frAnnounce('AED walkthrough'); },
                style: btn()
              }, __alloT('stem.firstresponse.aed_walkthrough', '⚡ AED walkthrough'))
            )
          );
        }

        function pulseScale() {
          // Respect prefers-reduced-motion (WCAG 2.3.3): hold scale at 1.0
          // so the heart doesn't pulse for users who opt out of motion.
          var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (reduce) return 1;
          // Phase: 0 = start of beat, 1 = next beat. Scale 1.0 → 1.25 → 1.0.
          var intervalMs = 60000 / bpm;
          var phase = (Date.now() % intervalMs) / intervalMs;
          // Quick attack, slow release feels more like a heartbeat than pure sin.
          var amp = phase < 0.2 ? (phase / 0.2) : (1 - (phase - 0.2) / 0.8);
          return 1 + 0.25 * amp;
        }

        function cprMetronome() {
          // Visible counter doubles as a re-render trigger; reading `beat` here
          // ensures the parent component re-renders each tick so the pulse
          // animation stays in sync even without a CSS animation.
          return h('div', null,
            h('div', { style: { padding: 16, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, textAlign: 'center' } },
              h('div', { 'aria-hidden': 'true', style: {
                width: 160, height: 160, borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, ' + T.accentHi + ', ' + T.accent + ')',
                margin: '20px auto',
                animation: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'none' : ('firstresponse-heartbeat ' + (60000 / bpm).toFixed(0) + 'ms ease-in-out infinite'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, color: '#fff', fontWeight: 800,
                boxShadow: '0 0 40px rgba(220,38,38,0.45)'
              } }, '❤'),
              h('div', { 'aria-live': 'off', style: { fontSize: 36, fontWeight: 800, color: T.text, marginBottom: 4 } }, bpm + ' bpm'),
              h('div', { style: { fontSize: 12, color: T.muted, marginBottom: 8 } }, __alloT('stem.firstresponse.beats_counted', 'Beats counted: '), beat),
              // Visual rhythm strip — last 16 beats as pulsing dots that fade.
              // Pairs with the audio metronome so deaf/hard-of-hearing rescuers
              // see the rhythm too.
              h('div', { 'aria-hidden': 'true',
                style: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 14, minHeight: 16 }
              },
                Array.from({ length: 16 }, function(_, i) {
                  // Trail fades behind the current beat: the dot that just
                  // pulsed is brightest; older beats dim with distance.
                  var age = ((beat % 16) - i + 16) % 16; // 0 = just pulsed
                  var isCurrent = (beat % 16) === i;
                  var opacity = isCurrent ? 1 : Math.max(0.15, 0.95 - age * 0.06);
                  var size = isCurrent ? 14 : 8;
                  return h('div', { key: i,
                    style: {
                      width: size, height: size, borderRadius: '50%',
                      background: isCurrent ? T.accentHi : T.accent,
                      opacity: opacity,
                      transition: 'all 80ms ease-out',
                      boxShadow: isCurrent ? ('0 0 8px ' + T.accentHi) : 'none'
                    }
                  });
                })
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 } },
                h('label', { htmlFor: 'fr-bpm-slider', style: { fontSize: 12, color: T.muted } }, 'BPM:'),
                h('input', { id: 'fr-bpm-slider', type: 'range', min: 100, max: 120, step: 1, value: bpm,
                  'aria-label': 'Beats per minute, currently ' + bpm,
                  onChange: function(e) { upd('cprBpm', parseInt(e.target.value, 10)); },
                  style: { width: 200 }, 'data-fr-focusable': true })
              ),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', { 'data-fr-focusable': true,
                  'aria-pressed': audioOn ? 'true' : 'false',
                  'aria-label': audioOn ? 'Audio on, click to mute' : 'Audio off, click to enable',
                  onClick: function() { upd('cprAudio', !audioOn); frAnnounce(audioOn ? 'Audio off' : 'Audio on'); },
                  style: btn({ padding: '6px 12px', fontSize: 12, background: audioOn ? '#1e3a8a' : T.card, color: audioOn ? '#dbeafe' : T.text })
                }, audioOn ? '🔊 Audio on' : '🔇 Audio off'),
                h('button', { 'data-fr-focusable': true,
                  'aria-label': __alloT('stem.firstresponse.reset_bpm_to_110', 'Reset bpm to 110'),
                  onClick: function() { upd('cprBpm', 110); },
                  style: btn({ padding: '6px 12px', fontSize: 12 })
                }, __alloT('stem.firstresponse.reset_to_110', 'Reset to 110'))
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Tip:'),
              ' ',
              h('em', null, __alloT('stem.firstresponse.stayin_alive', 'Stayin’ Alive')),
              __alloT('stem.firstresponse.is_104_bpm', ' is ~104 bpm. '),
              h('em', null, __alloT('stem.firstresponse.baby_shark', 'Baby Shark')),
              __alloT('stem.firstresponse.is_115_bpm', ' is ~115 bpm. '),
              h('em', null, __alloT('stem.firstresponse.mr_brightside', 'Mr. Brightside')),
              __alloT('stem.firstresponse.is_148_bpm_too_fast_audio_is_off_by_de', ' is ~148 bpm — too fast. Audio is OFF by default; enable if it helps you keep time.'))
          );
        }

        function cprPractice() {
          // Compute current avg bpm if running
          var nowMs = Date.now();
          var elapsedSec = practiceRunning ? Math.min(30, (nowMs - practiceStart) / 1000) : 0;
          var taps = practiceTaps || [];
          var currentBpm = (taps.length >= 2 && elapsedSec > 0)
            ? Math.round(60 * (taps.length - 1) / Math.max(0.1, (taps[taps.length - 1] - taps[0]) / 1000))
            : 0;
          var inRange = currentBpm >= 100 && currentBpm <= 120;
          var done = practiceRunning && elapsedSec >= 30;
          // Auto-finalize when 30 seconds elapsed
          if (done) {
            var finalBpm = currentBpm;
            var nextBest = (!practiceBest || Math.abs(finalBpm - 110) < Math.abs(practiceBest.rate - 110))
              ? { rate: finalBpm, durationSec: 30, dateISO: new Date().toISOString() }
              : practiceBest;
            updMulti({ cprPracticeRunning: false, cprPracticeBest: nextBest });
            if (finalBpm >= 100 && finalBpm <= 120) awardBadge('cpr_rhythm', 'CPR Rhythm (kept 100–120 bpm for 30s)');
            frAnnounceUrgent('Practice complete. Average: ' + finalBpm + ' beats per minute.');
          }

          function startPractice() {
            updMulti({ cprPracticeRunning: true, cprPracticeStart: Date.now(), cprPracticeTaps: [] });
            frAnnounceUrgent('Begin chest compressions now. 30 second timer started.');
          }
          function tapNow() {
            if (!practiceRunning) return;
            var t = Date.now();
            // Cap stored taps so we don't grow state without bound; keep last 200.
            var nextTaps = (practiceTaps || []).concat([t]);
            if (nextTaps.length > 200) nextTaps = nextTaps.slice(-200);
            upd('cprPracticeTaps', nextTaps);
          }
          function stopPractice() {
            updMulti({ cprPracticeRunning: false });
          }

          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.practice_30_second_window', '⏱️ Practice (30-second window)')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.tap_the_big_button_in_rhythm_like_you_', 'Tap the big button in rhythm — like you would push on someone’s chest. Aim for '),
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.100_120_bpm_2', '100–120 bpm')),
                __alloT('stem.firstresponse.the_metronome_above_gives_you_the_targ', '. The metronome above gives you the target sound/visual.')),
              h('div', { style: { textAlign: 'center', margin: '14px 0' } },
                h('button', { 'data-fr-focusable': true,
                  disabled: !practiceRunning,
                  'aria-label': practiceRunning ? 'Tap to record a compression' : 'Practice not running. Press Start.',
                  onClick: tapNow,
                  style: {
                    width: 180, height: 180, borderRadius: '50%',
                    border: 'none',
                    background: practiceRunning ? T.accent : T.cardAlt,
                    color: '#fff', fontSize: 18, fontWeight: 800, cursor: practiceRunning ? 'pointer' : 'not-allowed',
                    opacity: practiceRunning ? 1 : 0.5,
                    transform: practiceRunning && taps.length % 2 === 1 ? 'scale(0.93)' : 'scale(1)',
                    transition: 'transform 90ms ease-out, box-shadow 90ms ease-out',
                    boxShadow: practiceRunning ? (taps.length % 2 === 1 ? '0 0 34px rgba(220,38,38,0.6)' : '0 0 24px rgba(220,38,38,0.45)') : 'none'
                  }
                }, practiceRunning ? 'TAP' : '— off —')
              ),
              h('div', { style: { textAlign: 'center', fontSize: 14, color: T.muted, marginBottom: 8 } },
                practiceRunning
                  ? h('span', null,
                      h('strong', { style: { color: inRange ? T.ok : T.warn } }, currentBpm + ' bpm'),
                      ' • ', Math.round(elapsedSec), __alloT('stem.firstresponse.s_30s_taps', 's / 30s • taps: '), taps.length)
                  : (practiceBest
                      ? h('span', null, 'Best: ', h('strong', { style: { color: T.text } }, practiceBest.rate + ' bpm'))
                      : 'Press Start, then tap with the rhythm.')
              ),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                !practiceRunning && h('button', { 'data-fr-focusable': true,
                  'aria-label': __alloT('stem.firstresponse.start_30_second_practice', 'Start 30 second practice'),
                  onClick: startPractice, style: btnPrimary()
                }, __alloT('stem.firstresponse.start_30s', '▶ Start 30s')),
                practiceRunning && h('button', { 'data-fr-focusable': true,
                  'aria-label': __alloT('stem.firstresponse.stop_practice_early', 'Stop practice early'),
                  onClick: stopPractice, style: btn()
                }, __alloT('stem.firstresponse.stop', '■ Stop'))
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              __alloT('stem.firstresponse.you_re_practicing_rhythm_only_depth_2_', 'You’re practicing rhythm only — depth (2 inches on an adult) and chest recoil also matter, and you can’t practice those on a screen. Get hands-on at '),
              h('a', { href: 'https://www.redcross.org/take-a-class', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'redcross.org'),
              '.')
          );
        }

        function cprAed() {
          var aedStep = d.aedStep || 0;
          var aedShockBranch = d.aedShockBranch || null; // 'shock' or 'noshock'

          var STEPS = [
            { icon: '🟢', title: __alloT('stem.firstresponse.step_1_turn_it_on', 'Step 1 — Turn it on'),
              say: '"AED ON. Apply pads to bare chest as shown."',
              tip: __alloT('stem.firstresponse.open_the_case_press_the_green_power_bu', 'Open the case. Press the green/power button. The AED starts giving voice prompts immediately. Visual prompts on the screen mirror them for deaf/HoH rescuers.') },
            { icon: '👕', title: __alloT('stem.firstresponse.step_2_expose_the_chest', 'Step 2 — Expose the chest'),
              say: '"Apply pads to bare chest."',
              tip: __alloT('stem.firstresponse.cut_or_tear_off_the_shirt_if_chest_is_', 'Cut or tear off the shirt. If chest is wet — wipe dry. If hairy — most AEDs include a razor in the case. Remove medication patches. The pads go skin-to-skin.') },
            { icon: '📍', title: __alloT('stem.firstresponse.step_3_place_the_pads', 'Step 3 — Place the pads'),
              say: '"Place one pad on upper-right chest, one on lower-left side."',
              tip: __alloT('stem.firstresponse.the_pads_have_a_picture_showing_where_', 'The pads have a picture showing where they go. Adult: upper-right + lower-left ribs. Child <8 or <55 lbs: use child pads if available, or place one on chest and one on the back.') },
            { icon: '✋', title: __alloT('stem.firstresponse.step_4_stand_clear', 'Step 4 — Stand clear'),
              say: '"Analyzing. Do not touch the patient."',
              tip: __alloT('stem.firstresponse.loudly_say_clear_so_no_one_is_touching', 'Loudly say "CLEAR!" so no one is touching the person. The AED is reading the heart rhythm. Takes 5–15 seconds.') },
            { icon: '⚡', title: __alloT('stem.firstresponse.step_5_shock_or_no_shock', 'Step 5 — Shock or no shock'),
              say: aedShockBranch === 'shock' ? '"Shock advised. Stand clear. Press the flashing button now."' : (aedShockBranch === 'noshock' ? '"No shock advised. Begin CPR."' : '"Analyzing..."'),
              tip: __alloT('stem.firstresponse.pick_a_branch_below_to_see_what_happen', 'Pick a branch below to see what happens for each.') },
            { icon: '🔁', title: __alloT('stem.firstresponse.step_6_continue_compressions', 'Step 6 — Continue compressions'),
              say: '"Begin CPR. Continue chest compressions. AED will re-analyze in 2 minutes."',
              tip: __alloT('stem.firstresponse.whether_shock_or_no_shock_the_aed_will', 'Whether shock or no shock — the AED will tell you to do CPR for 2 minutes, then it re-analyzes. Do not remove the pads. Keep going until EMS arrives.') }
          ];

          function next() {
            if (aedStep < STEPS.length - 1) {
              upd('aedStep', aedStep + 1);
              frAnnounceUrgent('Step ' + (aedStep + 2) + ': ' + STEPS[aedStep + 1].title);
            } else {
              awardBadge('aed_walkthrough', 'AED Operator (walked the steps)');
              upd('aedStep', 0);
              upd('cprView', 'overview');
              frAnnounceUrgent('AED walkthrough complete.');
            }
          }
          function prev() {
            if (aedStep > 0) { upd('aedStep', aedStep - 1); }
          }
          function reset() {
            updMulti({ aedStep: 0, aedShockBranch: null });
            frAnnounce('Reset to step 1.');
          }

          var step = STEPS[aedStep];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 32 } }, step.icon),
                h('h3', { style: { margin: 0, fontSize: 16, color: T.text } }, step.title)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#0b1d2e', border: '1px solid #1e40af', color: '#dbeafe', fontSize: 13, fontStyle: 'italic', marginBottom: 10 } },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, '🔊'),
                step.say),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } }, step.tip),
              aedStep === 4 && h('div', { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
                h('button', { 'data-fr-focusable': true,
                  'aria-pressed': aedShockBranch === 'shock' ? 'true' : 'false',
                  onClick: function() { upd('aedShockBranch', 'shock'); frAnnounce('Shock advised branch.'); },
                  style: btn({ background: aedShockBranch === 'shock' ? '#7f1d1d' : T.card, color: aedShockBranch === 'shock' ? '#fde2e2' : T.text, padding: '6px 12px', fontSize: 12 })
                }, __alloT('stem.firstresponse.shock_advised', '⚡ "Shock advised"')),
                h('button', { 'data-fr-focusable': true,
                  'aria-pressed': aedShockBranch === 'noshock' ? 'true' : 'false',
                  onClick: function() { upd('aedShockBranch', 'noshock'); frAnnounce('No shock advised branch.'); },
                  style: btn({ background: aedShockBranch === 'noshock' ? '#064e3b' : T.card, color: aedShockBranch === 'noshock' ? '#d1fae5' : T.text, padding: '6px 12px', fontSize: 12 })
                }, __alloT('stem.firstresponse.no_shock_advised', '🚫 "No shock advised"'))
              )
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
              h('div', { style: { fontSize: 12, color: T.dim } },
                __alloT('stem.firstresponse.step', 'Step '), (aedStep + 1), ' of ', STEPS.length),
              h('div', { style: { display: 'flex', gap: 6 } },
                aedStep > 0 && h('button', { 'data-fr-focusable': true, 'aria-label': __alloT('stem.firstresponse.previous_step', 'Previous step'), onClick: prev, style: btn({ padding: '6px 12px', fontSize: 12 }) }, __alloT('stem.firstresponse.back', '← Back')),
                h('button', { 'data-fr-focusable': true, 'aria-label': __alloT('stem.firstresponse.reset_to_first_step', 'Reset to first step'), onClick: reset, style: btn({ padding: '6px 12px', fontSize: 12 }) }, __alloT('stem.firstresponse.reset', 'Reset')),
                h('button', { 'data-fr-focusable': true,
                  'aria-label': aedStep < STEPS.length - 1 ? 'Next step' : 'Finish walkthrough',
                  onClick: next,
                  style: btnPrimary({ padding: '6px 14px', fontSize: 12 })
                }, aedStep < STEPS.length - 1 ? 'Next →' : 'Finish ✓')
              )
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('❤️ CPR + AED'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.cpr_aed_sections', 'CPR + AED sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('metronome', 'Metronome'),
            tabBtn('practice', 'Practice'),
            tabBtn('aed', 'AED walkthrough')
          ),
          cprView === 'overview' && cprOverview(),
          cprView === 'metronome' && cprMetronome(),
          cprView === 'practice' && cprPractice(),
          cprView === 'aed' && cprAed(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // BLEED module — Stop the Bleed protocol (pressure → packing → tourniquet)
      // The decision is almost always "start with pressure, escalate if it fails."
      // The branching that matters is location (limb vs junctional/torso) because
      // tourniquets can ONLY be used on limbs.
      // Source: Stop the Bleed (American College of Surgeons / Hartford Consensus).
      // ─────────────────────────────────────────
      function renderBleed() {
        var bleedView = d.bleedView || 'overview';

        function tabBtn(id, label) {
          var active = bleedView === id;
          return h('button', { 'data-fr-focusable': true, key: id,
            'aria-pressed': active ? 'true' : 'false',
            onClick: function() { upd('bleedView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        var STEPS = [
          { num: 1, icon: '✋', name: __alloT('stem.firstresponse.direct_pressure_2', 'Direct pressure'),
            short: 'Press hard with both hands.',
            detail: [
              'Use both hands and your bodyweight. Lean in.',
              'Press directly ON the wound — not around it.',
              'If you have a clean cloth, use it. If not, bare hands are fine.',
              'Don’t lift to peek. Stay on it for at least 5 minutes (longer if it keeps bleeding).',
              'If blood soaks through — add another cloth ON TOP. Don’t remove the first.'
            ],
            when: 'ALWAYS start here. Most bleeding stops with pressure alone.',
            source: 'Stop the Bleed step 1' },
          { num: 2, icon: '🧤', name: __alloT('stem.firstresponse.wound_packing', 'Wound packing'),
            short: 'Pack gauze deep into the wound; keep pressure.',
            detail: [
              'For deep wounds on a limb, neck, armpit, or groin where pressure alone isn’t stopping it.',
              'Pack gauze (or any clean cloth strips) DEEP into the wound, all the way to the bone if needed.',
              'Keep packing until you can’t fit any more in.',
              'Then resume direct pressure on top, hard, for 3 more minutes.',
              'Hemostatic gauze (QuickClot, Celox) is in many bleeding-control kits and works faster — use it the same way.'
            ],
            when: 'Use when direct pressure isn’t controlling a DEEP wound, especially on the neck, armpit, or groin where you CAN’T tourniquet.',
            source: 'Stop the Bleed step 2' },
          { num: 3, icon: '🩹', name: __alloT('stem.firstresponse.tourniquet', 'Tourniquet'),
            short: 'Limbs only. 2–3" above wound. Note time.',
            detail: [
              h('strong', null, __alloT('stem.firstresponse.limbs_only_never_on_neck_head_torso_gr', 'Limbs ONLY. NEVER on neck, head, torso, groin, or armpit.')),
              'Place the tourniquet 2–3 inches ABOVE the wound, between wound and heart. Not on a joint — go above or below the elbow/knee.',
              'Tighten until the bleeding STOPS. It will hurt — that is correct.',
              'Note the TIME you applied it. Write it on the tourniquet, on the patient’s forehead with marker, or tell EMS.',
              'Do NOT remove it. EMS removes tourniquets in a hospital.',
              'A second tourniquet can be added 2–3 inches above the first if bleeding doesn’t stop.',
              'In a pinch (no real tourniquet): a belt + a stick to twist works. Triangular bandage + windlass. T-shirt strip.'
            ],
            when: 'Life-threatening bleeding from an arm or leg that pressure isn’t stopping. Or amputation. Or you have to leave them to call for help.',
            source: 'Stop the Bleed step 3' }
        ];

        function bleedOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, __alloT('stem.firstresponse.life_threatening_bleeding', '🩸 Life-threatening bleeding')),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.recognize_it', 'Recognize it: ')),
                __alloT('stem.firstresponse.spurting_blood_blood_pooling_on_the_gr', 'spurting blood, blood pooling on the ground, blood that won’t stop after 5+ minutes of pressure, soaks through cloth fast. A person can bleed to death from a limb wound in '),
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.as_little_as_3_5_minutes', 'as little as 3–5 minutes')),
                '.'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.the_protocol', 'The protocol: ')),
                __alloT('stem.firstresponse.pressure_if_needed_packing_if_needed_t', 'Pressure → (if needed) Packing → (if needed) Tourniquet. Always start at step 1. Escalate only if the previous step isn’t working.'))
            ),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              STEPS.map(function(s) {
                return h('div', { key: s.num, role: 'listitem',
                  style: { padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { background: T.accent, color: '#fff', borderRadius: 999, width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 } }, s.num),
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.icon),
                    h('strong', { style: { color: T.text, fontSize: 15 } }, s.name)
                  ),
                  h('div', { style: { fontSize: 13, color: T.text, marginBottom: 4 } }, s.short),
                  h('div', { style: { fontSize: 12, color: T.muted, fontStyle: 'italic' } }, 'When: ', s.when)
                );
              })
            ),
            h('div', { style: { marginTop: 14 } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.see_detailed_protocol_with_step_by_ste', 'See detailed protocol with step-by-step instructions'),
                onClick: function() { upd('bleedView', 'detail'); frAnnounce('Detailed protocol'); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.see_detailed_protocol', '📋 See detailed protocol')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.see_where_you_can_and_cannot_put_a_tou', 'See where you can and cannot put a tourniquet'),
                onClick: function() { upd('bleedView', 'tourniquet'); frAnnounce('Tourniquet placement'); },
                style: btn({ marginLeft: 8 })
              }, __alloT('stem.firstresponse.tourniquet_placement', '🩹 Tourniquet placement'))
            )
          );
        }

        function bleedDetail() {
          return h('div', null,
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              __alloT('stem.firstresponse.each_step_in_detail', 'Each step in detail. '),
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.always_start_at_step_1', 'Always start at step 1.')),
              __alloT('stem.firstresponse.escalate_only_when_the_previous_step_i', ' Escalate only when the previous step isn’t working.')),
            STEPS.map(function(s) {
              return h('div', { key: s.num,
                style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 10 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('span', { 'aria-hidden': 'true', style: { background: T.accent, color: '#fff', borderRadius: 999, width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 } }, s.num),
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.icon),
                  h('strong', { style: { color: T.text, fontSize: 15 } }, s.name)
                ),
                h('ul', { style: { margin: '0 0 8px 18px', padding: 0, color: T.muted, fontSize: 13, lineHeight: 1.7 } },
                  s.detail.map(function(item, i) { return h('li', { key: i }, item); })
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, marginBottom: 6 } },
                  h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.use_when', 'Use when: ')), s.when),
                h('div', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic' } }, 'Source: ', s.source)
              );
            }),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 13, lineHeight: 1.55, marginTop: 6 } },
              h('strong', null, __alloT('stem.firstresponse.maine_reality', '🌲 Maine reality: ')),
              MAINE_EMS.ruralEta,
              __alloT('stem.firstresponse.that_distance_is_why_a_tourniquet_may_', ' That distance is why a tourniquet may be life-saving here where pressure alone might be enough in a city — EMS is closer there.')),
            h('div', { style: { marginTop: 12 } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.mark_stop_the_bleed_module_complete', 'Mark Stop the Bleed module complete'),
                onClick: function() { awardBadge('bleed_stopped', 'Stop the Bleed (knows the protocol)'); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.i_ve_learned_the_protocol', '✓ I’ve learned the protocol')),
              h('a', { href: 'https://www.stopthebleed.org', target: '_blank', rel: 'noopener',
                'data-fr-focusable': true,
                style: Object.assign(btn({ marginLeft: 8, display: 'inline-block', textDecoration: 'none' }), { padding: '10px 16px' })
              }, __alloT('stem.firstresponse.take_a_free_course_stopthebleed_org', 'Take a free course → stopthebleed.org'))
            )
          );
        }

        function bleedTourniquet() {
          // Body-zone diagram: green = OK to tourniquet (limbs), red = NEVER.
          var ZONES = [
            { zone: 'Upper arm', ok: true, note: __alloT('stem.firstresponse.2_3_above_wound_between_wound_and_shou', '2–3" above wound, between wound and shoulder.') },
            { zone: 'Forearm', ok: true, note: __alloT('stem.firstresponse.above_the_elbow_if_wound_is_at_near_el', 'Above the elbow if wound is at/near elbow.') },
            { zone: 'Thigh', ok: true, note: __alloT('stem.firstresponse.2_3_above_wound_between_wound_and_hip', '2–3" above wound, between wound and hip.') },
            { zone: 'Lower leg / shin', ok: true, note: __alloT('stem.firstresponse.above_the_knee_if_wound_is_at_near_kne', 'Above the knee if wound is at/near knee.') },
            { zone: 'Neck', ok: false, note: __alloT('stem.firstresponse.never_pack_the_wound_and_apply_pressur', 'NEVER. Pack the wound and apply pressure.') },
            { zone: 'Head / face', ok: false, note: __alloT('stem.firstresponse.never_direct_pressure_only', 'NEVER. Direct pressure only.') },
            { zone: 'Chest / back / abdomen', ok: false, note: __alloT('stem.firstresponse.never_pack_if_you_can_pressure_911_fas', 'NEVER. Pack if you can; pressure; 911 fast.') },
            { zone: 'Armpit (axilla)', ok: false, note: __alloT('stem.firstresponse.junctional_can_t_tourniquet_pack_with_', 'Junctional — can’t tourniquet. Pack with gauze and apply pressure.') },
            { zone: 'Groin', ok: false, note: __alloT('stem.firstresponse.junctional_can_t_tourniquet_pack_with__2', 'Junctional — can’t tourniquet. Pack with gauze and apply pressure with bodyweight.') }
          ];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.where_can_a_tourniquet_go', '🩹 Where can a tourniquet go?')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.limbs_only', 'Limbs only.')),
                __alloT('stem.firstresponse.junctional_wounds_neck_armpit_groin_an', ' Junctional wounds (neck, armpit, groin) and torso wounds need '),
                h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.wound_packing_2', 'wound packing')),
                __alloT('stem.firstresponse.instead_gauze_deep_into_the_wound_then', ' instead — gauze deep into the wound, then heavy pressure.')),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                ZONES.map(function(z, i) {
                  return h('div', { key: i, role: 'listitem',
                    style: {
                      padding: '8px 12px', borderRadius: 8,
                      background: z.ok ? '#064e3b' : '#7f1d1d',
                      border: '1px solid ' + (z.ok ? T.ok : T.danger),
                      color: z.ok ? '#d1fae5' : '#fde2e2',
                      display: 'flex', alignItems: 'center', gap: 10
                    } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, z.ok ? '✓' : '✗'),
                    h('div', null,
                      h('div', { style: { fontWeight: 700, fontSize: 13 } },
                        z.zone, ' — ',
                        h('span', { style: { textTransform: 'uppercase', fontSize: 11 } }, z.ok ? 'OK to tourniquet' : 'NEVER tourniquet')),
                      h('div', { style: { fontSize: 12, marginTop: 2 } }, z.note)
                    )
                  );
                })
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.improvised_tourniquet_no_real_one_avai', 'Improvised tourniquet (no real one available): ')),
              __alloT('stem.firstresponse.a_belt_won_t_tighten_enough_on_its_own', 'a belt won’t tighten enough on its own — you need a windlass. Triangular bandage or a torn shirt strip wrapped around the limb, with a stick or pen as a windlass to twist tighter, then secure. Real tourniquets (CAT, SOFT-T) work better and are widely available — many schools and Stop the Bleed kits stock them.'))
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🩸 Stop the Bleed'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.stop_the_bleed_sections', 'Stop the Bleed sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('detail', 'Detailed protocol'),
            tabBtn('tourniquet', 'Tourniquet placement')
          ),
          bleedView === 'overview' && bleedOverview(),
          bleedView === 'detail' && bleedDetail(),
          bleedView === 'tourniquet' && bleedTourniquet(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // CHOKING module — age + situation specific decision flow
      // Infant (<1 yr): 5 back blows + 5 chest thrusts (NOT abdominal).
      // Child / adult: 5 back blows + 5 abdominal thrusts (Heimlich).
      // Pregnant or large person: chest thrusts (avoid abdomen).
      // Alone: self-administered abdominal thrust against chair back / counter.
      // Source: Red Cross Adult & Pediatric First Aid 2020.
      // ─────────────────────────────────────────
      function renderChoking() {
        var chokeView = d.chokeView || 'select';
        var who = d.chokeWho || null; // 'adult' | 'child' | 'infant' | 'pregnant' | 'alone'

        function tabBtn(id, label) {
          var active = chokeView === id;
          return h('button', { 'data-fr-focusable': true, key: id,
            'aria-pressed': active ? 'true' : 'false',
            onClick: function() { upd('chokeView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        var WHO = [
          { id: 'adult', icon: '🧑', label: __alloT('stem.firstresponse.adult_or_child_1_year', 'Adult or child (1+ year)') },
          { id: 'child', icon: '🧒', label: __alloT('stem.firstresponse.small_child_1_8', 'Small child (1–8)') },
          { id: 'infant', icon: '👶', label: __alloT('stem.firstresponse.infant_under_1_year', 'Infant (under 1 year)') },
          { id: 'pregnant', icon: '🤰', label: __alloT('stem.firstresponse.pregnant_person', 'Pregnant person') },
          { id: 'alone', icon: '🆘', label: __alloT('stem.firstresponse.you_alone_choking', 'You — alone, choking') }
        ];

        var PROTOCOLS = {
          adult: {
            title: __alloT('stem.firstresponse.adult_or_child_1_year_2', 'Adult or child (1+ year)'),
            recognize: 'Universal sign: hands at throat, can’t cough, can’t speak, can’t breathe. Color may turn dusky/blue.',
            steps: [
              'Ask: "Are you choking?" If they nod or can’t answer — act.',
              'Stand behind them. Lean them slightly forward.',
              h('strong', null, __alloT('stem.firstresponse.5_back_blows', '5 back blows ')),
              'between the shoulder blades with the heel of your hand.',
              h('strong', null, __alloT('stem.firstresponse.5_abdominal_thrusts_heimlich', '5 abdominal thrusts (Heimlich): ')),
              'fist just above the navel, other hand over fist, quick inward + upward thrusts.',
              'Repeat 5+5 until the object comes out OR they go unconscious.',
              h('strong', null, __alloT('stem.firstresponse.if_they_go_unconscious', 'If they go unconscious: ')),
              'lower them safely to the ground, call 911, start CPR. Look in the mouth before each set of breaths and remove anything you see — do NOT do a blind finger sweep.'
            ],
            after: 'Even if the object comes out: they should see a doctor. Abdominal thrusts can cause internal injury.',
            source: 'Red Cross First Aid'
          },
          child: {
            title: __alloT('stem.firstresponse.small_child_1_8_2', 'Small child (1–8)'),
            recognize: 'Same universal sign — hands at throat, silent, can’t breathe.',
            steps: [
              'Kneel behind them so you’re at their level.',
              h('strong', null, __alloT('stem.firstresponse.5_back_blows_2', '5 back blows ')),
              'between shoulder blades with the heel of your hand.',
              h('strong', null, __alloT('stem.firstresponse.5_abdominal_thrusts', '5 abdominal thrusts: ')),
              'gentler than for an adult — fist just above the navel, brisk inward + upward.',
              'Repeat 5+5 until object dislodges or they’re unconscious.',
              'If unconscious: 911, start CPR.'
            ],
            after: 'See a doctor afterward — children’s organs are more vulnerable to thrust injury.',
            source: 'Red Cross First Aid'
          },
          infant: {
            title: __alloT('stem.firstresponse.infant_under_1_year_2', 'Infant (under 1 year)'),
            recognize: 'Can’t cry, can’t cough, weak/silent, color dusky. Different from a fussy baby — there is no sound.',
            steps: [
              h('strong', null, __alloT('stem.firstresponse.never_use_abdominal_thrusts_on_an_infa', 'NEVER use abdominal thrusts on an infant.')),
              'Sit. Lay the baby face-DOWN along your forearm, head lower than body, supporting the jaw. Use your thigh as a brace.',
              h('strong', null, __alloT('stem.firstresponse.5_back_blows_3', '5 back blows ')),
              'between the shoulder blades with the heel of your hand. Firm but not violent.',
              'Flip the baby face-UP along your other forearm, head still low.',
              h('strong', null, __alloT('stem.firstresponse.5_chest_thrusts', '5 chest thrusts: ')),
              'two fingers on the breastbone (just below the nipple line), 1.5 inches deep, slower than CPR (about 1 per second).',
              'Repeat 5+5 until object comes out or baby is unconscious.',
              'If unconscious: 911, start infant CPR.'
            ],
            after: 'Always seek medical care after a choking event in an infant.',
            source: 'Red Cross Pediatric First Aid'
          },
          pregnant: {
            title: __alloT('stem.firstresponse.pregnant_person_2', 'Pregnant person'),
            recognize: 'Same universal sign — hands at throat, can’t breathe.',
            steps: [
              h('strong', null, __alloT('stem.firstresponse.use_chest_thrusts_not_abdominal_thrust', 'Use chest thrusts, NOT abdominal thrusts.')),
              'Stand behind them. Place your fist on the CENTER of the breastbone (sternum), not the abdomen.',
              h('strong', null, __alloT('stem.firstresponse.5_chest_thrusts_2', '5 chest thrusts: ')),
              'pull straight back into the chest, sharp and quick.',
              'Same goes for anyone too large for you to wrap your arms around the abdomen.',
              'Repeat until object comes out or they’re unconscious.',
              'If unconscious: 911, start CPR.'
            ],
            after: 'Always see a doctor after — both for thrust injury risk and to check on the pregnancy.',
            source: 'Red Cross First Aid'
          },
          alone: {
            title: __alloT('stem.firstresponse.you_alone_choking_2', 'You — alone, choking'),
            recognize: 'You can’t cough, can’t make sound. Don’t panic — you have a minute or so.',
            steps: [
              h('strong', null, __alloT('stem.firstresponse.self_abdominal_thrusts', 'Self abdominal thrusts. ')),
              'Make a fist just above your navel. Other hand on top. Pull sharply inward and upward.',
              h('strong', null, __alloT('stem.firstresponse.or_use_a_chair_back_counter_railing', 'OR use a chair back / counter / railing: ')),
              'lean over a hard horizontal edge (back of a chair, kitchen counter) and push your abdomen down onto it sharply.',
              'Repeat until the object dislodges.',
              'If you can dial — call 911 and leave the line open even if you can’t speak. Modern dispatchers can locate the call.'
            ],
            after: 'See a doctor afterward.',
            source: 'Red Cross First Aid'
          }
        };

        function chokeSelect() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.who_is_choking', '😬 Who is choking?')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.the_right_technique_depends_on_who_pic', 'The right technique depends on who. Pick one to see the protocol.')),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                WHO.map(function(w) {
                  var active = who === w.id;
                  return h('button', { key: w.id, role: 'listitem', 'data-fr-focusable': true,
                    'aria-pressed': active ? 'true' : 'false',
                    onClick: function() {
                      updMulti({ chokeWho: w.id, chokeView: 'protocol' });
                      frAnnounce(w.label);
                    },
                    style: btn({
                      padding: '12px 14px', fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: active ? '#1e3a8a' : T.cardAlt,
                      color: active ? '#dbeafe' : T.text,
                      borderColor: active ? '#1e40af' : T.border
                    })
                  },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, w.icon),
                    h('span', null, w.label)
                  );
                })
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Universal: '),
              __alloT('stem.firstresponse.if_the_person_is_coughing_forcefully', 'if the person is coughing forcefully, '),
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.don_t_intervene', 'don’t intervene')),
              __alloT('stem.firstresponse.let_them_cough_step_in_only_when_they', ' — let them cough. Step in only when they '),
              h('em', null, 'can’t'),
              __alloT('stem.firstresponse.cough_can_t_speak_or_can_t_breathe', ' cough, can’t speak, or can’t breathe.'))
          );
        }

        function chokeProtocol() {
          var p = who ? PROTOCOLS[who] : null;
          if (!p) return chokeSelect();
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, p.title),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 12, marginBottom: 10 } },
                h('strong', null, 'Recognize: '), p.recognize),
              h('ol', { style: { margin: '0 0 0 18px', padding: 0, color: T.text, fontSize: 13, lineHeight: 1.7 } },
                p.steps.map(function(s, i) { return h('li', { key: i, style: { marginBottom: 4 } }, s); })
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted } },
                h('strong', { style: { color: T.text } }, 'After: '), p.after),
              h('div', { style: { marginTop: 6, fontSize: 10, color: T.dim, fontStyle: 'italic' } }, 'Source: ', p.source)
            ),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.pick_a_different_person', 'Pick a different person'),
                onClick: function() { upd('chokeView', 'select'); frAnnounce('Pick someone else'); },
                style: btn()
              }, __alloT('stem.firstresponse.pick_someone_else', '← Pick someone else')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.mark_choking_module_complete', 'Mark choking module complete'),
                onClick: function() { awardBadge('choking_responder', 'Choking Responder (knows all 5 cases)'); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.got_it', '✓ Got it'))
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('😬 Choking'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.choking_module_sections', 'Choking module sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('select', 'Pick who'),
            tabBtn('protocol', 'Protocol')
          ),
          chokeView === 'select' && chokeSelect(),
          chokeView === 'protocol' && chokeProtocol(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // DISABILITY-AWARE module — the differentiator (Lane C content)
      // 6 sections, each cites a community-led org. Explicitly avoids Autism
      // Speaks; uses ASAN (autisticadvocacy.org) instead. Person-first vs
      // identity-first language follows community preference per condition:
      // autism = identity-first (autistic person), deafness = mixed (Deaf person
      // for cultural Deafness, deaf or HoH for medical), epilepsy = "person with
      // epilepsy" generally though community preference varies.
      // ─────────────────────────────────────────
      function renderDisabilityAware() {
        var daSection = d.daSection || 'overview';

        function tabBtn(id, label) {
          var active = daSection === id;
          return h('button', { 'data-fr-focusable': true, key: id,
            'aria-pressed': active ? 'true' : 'false',
            onClick: function() { upd('daSection', id); frAnnounce(label); },
            style: btn({
              padding: '6px 10px', fontSize: 11,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        function card(title, items, source, sourceUrl) {
          return h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, title),
            h('ul', { style: { margin: '0 0 8px 18px', padding: 0, color: T.muted, fontSize: 13, lineHeight: 1.7 } },
              items.map(function(item, i) { return h('li', { key: i, style: { marginBottom: 4 } }, item); })
            ),
            source && h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } },
              'Source: ',
              sourceUrl
                ? h('a', { href: sourceUrl, target: '_blank', rel: 'noopener', style: { color: T.link } }, source)
                : source)
          );
        }

        function daOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: '#1e3a8a', border: '1px solid #1e40af', marginBottom: 14, color: '#dbeafe' } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15 } }, __alloT('stem.firstresponse.why_this_module_exists', '♾️ Why this module exists')),
              h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.most_first_aid_courses_don_t_cover_thi', 'Most first-aid courses don’t cover this: how disability shapes both '),
                h('strong', null, 'recognition'),
                __alloT('stem.firstresponse.a_peer_s_seizure_isn_t_weird_behavior_', ' (a peer’s seizure isn’t "weird behavior" — it’s a medical event) and '),
                h('strong', null, 'response'),
                __alloT('stem.firstresponse.you_can_t_shout_instructions_to_a_deaf', ' (you can’t shout instructions to a Deaf patient).')),
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.this_module_pulls_from_community_led_o', 'This module pulls from community-led orgs — '),
                h('a', { href: 'https://autisticadvocacy.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'ASAN'),
                ', ',
                h('a', { href: 'https://www.epilepsy.com', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, __alloT('stem.firstresponse.epilepsy_foundation', 'Epilepsy Foundation')),
                ', ',
                h('a', { href: 'https://www.hearingloss.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'HLAA'),
                ', ',
                h('a', { href: 'https://www.diabetes.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'ADA'),
                __alloT('stem.firstresponse.where_community_preference_is_mixed_e_', '. Where community preference is mixed (e.g. person-first vs identity-first language), this module follows the most common preference and notes it.'))
            ),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              __alloT('stem.firstresponse.pick_a_section_above_each_section_is_s', 'Pick a section above. Each section is short — these are the things most adults don’t know either.'))
          );
        }

        function daDeaf() {
          return card('👂 Communicating with a deaf or hard-of-hearing patient', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.get_their_attention_visually', 'Get their attention visually: ')), __alloT('stem.firstresponse.wave_in_their_line_of_sight_tap_their_', 'wave in their line of sight, tap their shoulder. Don’t grab. Don’t shout — louder doesn’t help.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.face_them_directly', 'Face them directly')), __alloT('stem.firstresponse.so_they_can_see_your_mouth_and_express', ' so they can see your mouth and expressions. Good lighting on your face. Don’t cover your mouth.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.use_the_phone_s_notes_app', 'Use the phone’s notes app')), __alloT('stem.firstresponse.to_type_questions_most_teens_already_d', ' to type questions. Most teens already do this.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.text_to_911_is_the_right_call', 'Text-to-911 is the right call')), __alloT('stem.firstresponse.maine_has_it_don_t_call_for_them_on_a_', ' — Maine has it. Don’t call FOR them on a voice line if they want to text themselves.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.don_t_assume_asl', 'Don’t assume ASL')), __alloT('stem.firstresponse.many_late_deafened_or_hoh_people_don_t', ' — many late-deafened or HoH people don’t sign. Ask their preferred way to communicate.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.in_a_real_emergency', 'In a real emergency')), __alloT('stem.firstresponse.simple_gestures_writing_key_words_ambu', ', simple gestures + writing key words ("AMBULANCE COMING", "WHERE HURT?") often work faster than typing full sentences.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.aeds_talk_show', 'AEDs talk + show')), __alloT('stem.firstresponse.modern_aeds_display_visual_prompts_on_', ' — modern AEDs display visual prompts on a screen for the rescuer. Use one even if no one in the room can hear the voice prompts.'))
          ], 'Hearing Loss Association of America (hearingloss.org)', 'https://www.hearingloss.org');
        }

        function daAutism() {
          return h('div', null,
            card('♾️ Supporting an autistic peer in distress', [
              h('span', null, h('strong', null, __alloT('stem.firstresponse.lower_the_sensory_load', 'Lower the sensory load: ')), __alloT('stem.firstresponse.lights_down_if_you_can_fewer_voices_fe', 'lights down if you can, fewer voices, fewer hands. A crowd of helpers can make a meltdown worse.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.predictable_verbal_warnings', 'Predictable verbal warnings: ')), __alloT('stem.firstresponse.i_m_going_to_touch_your_wrist_now_befo', '"I’m going to touch your wrist now" before you do. Touch without warning can escalate panic.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.short_literal_sentences', 'Short, literal sentences. ')), __alloT('stem.firstresponse.avoid_figures_of_speech_sit_down_is_cl', 'Avoid figures of speech. "Sit down" is clearer than "take a load off."')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.allow_stims', 'Allow stims')), __alloT('stem.firstresponse.rocking_hand_flapping_repeating_words_', ' (rocking, hand-flapping, repeating words) — they’re self-regulation, NOT a symptom of the emergency.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.meltdown_tantrum', 'Meltdown ≠ tantrum.')), __alloT('stem.firstresponse.a_meltdown_is_involuntary_nervous_syst', ' A meltdown is involuntary nervous-system overload. Don’t threaten consequences. Reduce input and wait.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.look_for_a_comm_card_aac_device_script', 'Look for a comm card / AAC device / scripted phrases')), __alloT('stem.firstresponse.the_person_may_use_many_autistic_peopl', ' the person may use. Many autistic people carry a card explaining their communication needs.')),
              h('span', null, h('strong', null, __alloT('stem.firstresponse.don_t_mistake_autism_for_the_medical_e', 'Don’t mistake autism for the medical emergency. ')), __alloT('stem.firstresponse.a_non_speaking_autistic_peer_may_be_ha', 'A non-speaking autistic peer may be having a seizure or a panic attack — recognize THAT separately.'))
            ], 'Autistic Self Advocacy Network (autisticadvocacy.org)', 'https://autisticadvocacy.org'),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Note: '),
              __alloT('stem.firstresponse.this_module_uses_identity_first_langua', 'this module uses identity-first language ("autistic person") because that is the majority preference in autistic-led communities. Some people and families prefer "person with autism." If you know someone’s preference, use it.'))
          );
        }

        function daSeizure() {
          return card('⚡ Seizure first aid as epilepsy advocacy', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.a_peer_having_a_seizure_is_having_a_me', 'A peer having a seizure is having a medical event')), __alloT('stem.firstresponse.not_acting_weird_recognizing_it_as_epi', ' — not "acting weird." Recognizing it as epilepsy (or another seizure cause) is the first thing.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.time_the_seizure', 'TIME the seizure')), __alloT('stem.firstresponse.from_when_it_starts_most_last_under_2_', ' from when it starts. Most last under 2 minutes.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.move_sharp_things_away', 'Move sharp things AWAY')), __alloT('stem.firstresponse.chairs_desks_glasses_don_t_move_the_pe', ' — chairs, desks, glasses. Don’t move the person unless they’re in immediate danger (water, road, fire).')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.cushion_the_head', 'Cushion the head ')), __alloT('stem.firstresponse.jacket_backpack_loosen_anything_around', '(jacket, backpack). Loosen anything around the neck.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.do_not_restrain', 'DO NOT restrain')), __alloT('stem.firstresponse.never_hold_them_down_or_try_to_stop_th', ' — never hold them down or try to stop the movements.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.do_not_put_anything_in_their_mouth', 'DO NOT put anything in their mouth')), __alloT('stem.firstresponse.old_myth_they_cannot_swallow_their_ton', ' — old myth. They cannot swallow their tongue.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.after_recovery_position', 'After: recovery position')), __alloT('stem.firstresponse.on_their_side_so_saliva_can_drain_they', ' (on their side) so saliva can drain. They may be confused for several minutes — that’s normal. Stay with them.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.call_911_if', 'Call 911 if: ')), __alloT('stem.firstresponse.seizure_is_over_5_minutes_repeats_with', 'seizure is over 5 minutes, repeats without recovery in between, first-ever, in water, follows a head injury, or person is pregnant/diabetic/not breathing after.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.privacy_after', 'Privacy after: ')), __alloT('stem.firstresponse.a_post_ictal_person_may_be_embarrassed', 'a post-ictal person may be embarrassed. Clear gawkers. They get to choose what to share with classmates.'))
          ], 'Epilepsy Foundation (epilepsy.com)', 'https://www.epilepsy.com/recognition');
        }

        function daDiabetes() {
          return card('🩺 Diabetic emergency — low vs high blood sugar', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.low_blood_sugar_hypoglycemia', 'Low blood sugar (hypoglycemia) ')), __alloT('stem.firstresponse.in_a_teen_often_looks_like', 'in a teen often looks like '),
              h('em', null, __alloT('stem.firstresponse.behavior_change', 'behavior change')),
              __alloT('stem.firstresponse.irritable_confused_off_shaky_sweaty_su', ' — irritable, confused, "off," shaky, sweaty, suddenly clumsy. Easy to mistake for being drunk or having an attitude.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.if_they_can_swallow_safely', 'If they CAN swallow safely: ')),
              __alloT('stem.firstresponse.15g_fast_carb_juice_box_regular_soda_g', '15g fast carb — juice box, regular soda, glucose tab, a tablespoon of honey. Recheck in 15 minutes. Repeat if still low.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.if_they_cannot_swallow_safely_slurring', 'If they CANNOT swallow safely (slurring, confused, semi-conscious): ')),
              __alloT('stem.firstresponse.do_not_give_food_or_liquid_choking_ris', 'do NOT give food or liquid — choking risk. Glucagon if available. Call 911. Recovery position.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.if_unconscious', 'If unconscious: ')),
              __alloT('stem.firstresponse.911_immediately_recovery_position_neve', '911 immediately. Recovery position. NEVER pour juice into the mouth of an unconscious person.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.high_blood_sugar_hyperglycemia_dka', 'High blood sugar (hyperglycemia / DKA) ')),
              __alloT('stem.firstresponse.in_a_peer_with_diabetes_extreme_thirst', 'in a peer with diabetes: extreme thirst, peeing constantly, fruity-acetone breath, deep rapid breathing, nausea/vomiting, confusion. '),
              h('strong', null, __alloT('stem.firstresponse.this_is_also_a_911_emergency', 'This is also a 911 emergency.')),
              __alloT('stem.firstresponse.don_t_give_insulin_unless_they_are_man', ' Don’t give insulin unless they are managing it themselves and you’re just supporting.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.behavior_changes_in_a_peer_you_know_ha', 'Behavior changes in a peer you know has diabetes ')),
              __alloT('stem.firstresponse.assume_blood_sugar_first_attitude_seco', '— assume blood sugar first, attitude second. Ask "Have you checked? Can I get you juice?"'))
          ], 'American Diabetes Association (diabetes.org)', 'https://www.diabetes.org');
        }

        function daHidden() {
          return card('👁️ Hidden disabilities + disclosure rights', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_t_see_most_disabilities', 'You can’t see most disabilities')), __alloT('stem.firstresponse.chronic_illness_cardiac_conditions_epi', ' — chronic illness, cardiac conditions, epilepsy, allergies, mental health, autism, ADHD, learning differences. A peer who looks "fine" may have a condition that matters in an emergency.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.look_for_medical_id_jewelry', 'Look for medical ID jewelry')), __alloT('stem.firstresponse.bracelet_necklace_dog_tag_watch_sticke', ' (bracelet, necklace, dog tag, watch sticker, card in wallet). It often lists condition + emergency contact + critical med.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.phone_medical_id', 'Phone medical ID: ')),
              __alloT('stem.firstresponse.iphones_and_androids_both_have_a_medic', 'iPhones and Androids both have a medical ID screen accessible from the lock screen — emergency responders can view condition + meds + emergency contacts without unlocking the phone. Look for "Emergency" or "SOS" on the lock screen.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.disclosure_is_their_choice', 'Disclosure is THEIR choice. ')),
              __alloT('stem.firstresponse.don_t_tell_other_classmates_teachers_r', 'Don’t tell other classmates / teachers / random adults a peer has a condition unless it’s necessary to keep them safe RIGHT NOW. To EMS, yes. To the lunchroom, no.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.ask_don_t_assume', 'Ask, don’t assume: ')),
              __alloT('stem.firstresponse.is_there_anything_i_should_know_to_hel', '"Is there anything I should know to help you?" gives them the chance to tell you if they want to. "Are you OK? You look weird" doesn’t.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.service_dogs_are_working', 'Service dogs are working: ')),
              __alloT('stem.firstresponse.don_t_pet_distract_or_call_to_them_the', 'don’t pet, distract, or call to them. The handler is the only person who interacts with them in an emergency.'))
          ], 'NAMI + American Diabetes Association', 'https://www.nami.org');
        }

        function daSelf() {
          return card('🤝 If YOU have a disability and want to help', [
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_do_cpr_with_a_limb_difference', 'You can do CPR with a limb difference')), __alloT('stem.firstresponse.depth_and_rate_matter_most_you_can_use', ' — depth and rate matter most. You can use your hand differently, use your forearm, or partner up so someone else does compressions while you coach (you know the rate).')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_do_cpr_with_low_muscle_tone_or', 'You can do CPR with low muscle tone or fatigue: ')),
              __alloT('stem.firstresponse.partner_up_switch_every_2_minutes_anyw', 'partner up. Switch every 2 minutes anyway — even adults without disabilities tire fast. The AHA recommends compressors swap every 2 minutes.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_call_911_if_you_can_t_speak', 'You can call 911 if you can’t speak: ')),
              __alloT('stem.firstresponse.use_text_to_911_maine_has_it_you_can_l', 'use text-to-911 (Maine has it). You can leave a voice line open even silent — dispatchers can locate the call.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.you_can_lead', 'You can lead')), __alloT('stem.firstresponse.even_if_you_can_t_do_compressions_assi', ' even if you can’t do compressions: assign tasks ("YOU call 911. YOU run for the AED in the gym. YOU clear people back."). Calm direction is real first aid.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.sensory_overload_during_the_emergency', 'Sensory overload during the emergency? ')),
              __alloT('stem.firstresponse.step_back_hands_over_ears_find_a_quiet', 'Step back, hands over ears, find a quieter spot. You don’t have to be the closest helper to be a helpful one. Coaching others through the protocol is a real role.')),
            h('span', null, h('strong', null, __alloT('stem.firstresponse.practice_ahead', 'Practice ahead. ')),
              __alloT('stem.firstresponse.knowing_what_you_would_do_your_specifi', 'Knowing what you would do — your specific role, given what your body does — turns a freeze into a plan. That’s what this lab is for.'))
          ], 'Synthesizes ASAN + AHA + Hartford Consensus guidance', null);
        }

        return h('div', { style: { padding: 20, maxWidth: 920, margin: '0 auto', color: T.text } },
          backBar('♾️ Disability-aware response'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.disability_aware_sections', 'Disability-aware sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Why'),
            tabBtn('deaf', 'Deaf / HoH'),
            tabBtn('autism', 'Autistic peer'),
            tabBtn('seizure', 'Seizure / epilepsy'),
            tabBtn('diabetes', 'Diabetic emergency'),
            tabBtn('hidden', 'Hidden disabilities'),
            tabBtn('self', 'You as helper')
          ),
          daSection === 'overview' && daOverview(),
          daSection === 'deaf' && daDeaf(),
          daSection === 'autism' && daAutism(),
          daSection === 'seizure' && daSeizure(),
          daSection === 'diabetes' && daDiabetes(),
          daSection === 'hidden' && daHidden(),
          daSection === 'self' && daSelf(),
          h('div', { style: { marginTop: 12, textAlign: 'right' } },
            h('button', { 'data-fr-focusable': true,
              'aria-label': __alloT('stem.firstresponse.mark_disability_aware_module_complete', 'Mark disability-aware module complete'),
              onClick: function() { awardBadge('da_responder', 'Disability-Aware Responder'); },
              style: btnPrimary({ padding: '8px 14px', fontSize: 13 })
            }, __alloT('stem.firstresponse.i_ve_read_this_module', '✓ I’ve read this module'))
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // SCENARIO module — multi-step branching simulations
      // 6 scenarios spanning the modules. Each step: 3 choices labeled
      // help / neutral / hurt with feedback + source. End screen shows tally.
      // The mental-health scenario carries a content warning + opt-out.
      // ─────────────────────────────────────────
      var SCENARIOS = [
        { id: 'cafeteria', icon: '🍎', title: __alloT('stem.firstresponse.cafeteria_collapse', 'Cafeteria collapse'),
          setup: 'Lunchtime. A student two tables over suddenly slumps forward, then slides off the bench onto the floor. They are not moving. People around them are screaming. You’re the closest peer who has First Response Lab training.',
          steps: [
            { situation: 'You reach them first. What do you do FIRST?',
              choices: [
                { text: __alloT('stem.firstresponse.shake_their_shoulder_firmly_and_shout_', 'Shake their shoulder firmly and shout "Are you OK?"'), impact: 'help', feedback: __alloT('stem.firstresponse.right_check_responsiveness_before_anyt', 'Right. Check responsiveness before anything else. They might just have fainted and be coming around.'), source: 'AHA BLS' },
                { text: __alloT('stem.firstresponse.start_chest_compressions_immediately', 'Start chest compressions immediately.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.compressions_on_someone_whose_heart_is', 'Compressions on someone whose heart is still beating can cause real injury. Always check first.'), source: 'AHA BLS' },
                { text: __alloT('stem.firstresponse.run_to_get_a_teacher', 'Run to get a teacher.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.a_teacher_is_needed_soon_but_leaving_t', 'A teacher is needed soon, but leaving the patient alone wastes the most critical seconds. Send someone else.'), source: 'AHA BLS' }
              ] },
            { situation: 'No response. They’re not breathing normally. Three other students are standing nearby looking at their phones.',
              choices: [
                { text: __alloT('stem.firstresponse.yell_you_call_911_you_go_to_the_front_', 'Yell "YOU — call 911. YOU — go to the front office for the AED. NOW."'), impact: 'help', feedback: __alloT('stem.firstresponse.pointing_at_specific_people_works_diff', 'Pointing at specific people works — diffuse responsibility freezes a crowd. Now you can focus on the patient.'), source: 'Hartford Consensus / bystander effect research' },
                { text: __alloT('stem.firstresponse.yell_someone_call_911_and_start_cpr', 'Yell "Someone call 911!" and start CPR.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.better_than_nothing_but_someone_often_', 'Better than nothing, but "someone" often means no one. Pointing at a specific person fixes that.'), source: 'Hartford Consensus' },
                { text: __alloT('stem.firstresponse.pull_out_your_phone_and_call_911_yours', 'Pull out your phone and call 911 yourself while standing up.'), impact: 'hurt', feedback: 'You are the closest trained person. Delegate the call so you can start compressions in the next few seconds.', source: 'AHA BLS' }
              ] },
            { situation: 'You begin CPR. What rate?',
              choices: [
                { text: __alloT('stem.firstresponse.100_120_compressions_per_minute_about_', '100–120 compressions per minute, about the pace of "Stayin’ Alive."'), impact: 'help', feedback: __alloT('stem.firstresponse.exactly_right_push_hard_2_inches_deep_', 'Exactly right. Push hard (2 inches deep on an adult), let the chest fully recoil between pushes.'), source: 'AHA 2020 Guidelines' },
                { text: __alloT('stem.firstresponse.as_fast_as_you_can_speed_saves_lives', 'As fast as you can — speed saves lives.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.too_fast_120_bpm_means_shallow_compres', 'Too fast (>120 bpm) means shallow compressions and not enough time for the heart to refill between pushes. Aim for 100–120.'), source: 'AHA 2020 Guidelines' },
                { text: __alloT('stem.firstresponse.slow_and_steady_about_60_per_minute', 'Slow and steady, about 60 per minute.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.too_slow_the_heart_needs_100_120_pushe', 'Too slow. The heart needs ~100–120 pushes per minute to circulate blood enough to keep the brain alive.'), source: 'AHA 2020 Guidelines' }
              ] },
            { situation: 'The AED arrives. The student you sent says "I’ve never used one." What do you tell them?',
              choices: [
                { text: __alloT('stem.firstresponse.turn_it_on_it_will_talk_you_through_it', '"Turn it on. It will talk you through it. Listen and do exactly what it says."'), impact: 'help', feedback: __alloT('stem.firstresponse.aeds_are_designed_for_untrained_users_', 'AEDs are designed for untrained users. Voice prompts (and visual prompts on most models) lead you through every step.'), source: 'AHA / Red Cross AED training' },
                { text: __alloT('stem.firstresponse.wait_until_i_m_done_with_compressions_', '"Wait until I’m done with compressions, then I’ll do it."'), impact: 'hurt', feedback: __alloT('stem.firstresponse.every_second_without_an_aed_on_a_shock', 'Every second without an AED on a shockable rhythm reduces survival. Have them set it up while you keep compressing.'), source: 'AHA Chain of Survival' },
                { text: __alloT('stem.firstresponse.forget_it_just_keep_doing_cpr', '"Forget it, just keep doing CPR."'), impact: 'hurt', feedback: __alloT('stem.firstresponse.cpr_alone_has_much_lower_survival_than', 'CPR alone has much lower survival than CPR + AED. Even an untrained person can run an AED — it talks them through it.'), source: 'AHA Chain of Survival' }
              ] }
          ] },
        { id: 'hallway', icon: '🥪', title: __alloT('stem.firstresponse.hallway_choking', 'Hallway choking'),
          setup: 'Between classes, a friend takes a big bite of a sandwich and starts panicking. Their hands are at their throat. They’re not making noise. Their face is turning red.',
          steps: [
            { situation: 'What is the FIRST thing to confirm?',
              choices: [
                { text: __alloT('stem.firstresponse.ask_are_you_choking_watch_for_a_nod_or', 'Ask: "Are you choking?" Watch for a nod or thumbs-up.'), impact: 'help', feedback: __alloT('stem.firstresponse.the_universal_sign_is_hands_at_the_thr', 'The universal sign is hands at the throat with no sound. Confirming gives them a chance to cough first if they still can.'), source: 'Red Cross First Aid' },
                { text: __alloT('stem.firstresponse.slap_them_hard_on_the_back_right_away', 'Slap them hard on the back right away.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.back_blows_are_part_of_the_protocol_bu', 'Back blows ARE part of the protocol, but confirm they can’t cough first. If they’re coughing forcefully, let them cough.'), source: 'Red Cross First Aid' },
                { text: __alloT('stem.firstresponse.get_them_to_drink_water_immediately', 'Get them to drink water immediately.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_give_a_choking_person_water_it_c', 'Don’t give a choking person water — it can go down the wrong way too. Don’t give anything by mouth.'), source: 'Red Cross First Aid' }
              ] },
            { situation: 'They nod yes. Can’t cough, can’t breathe. What now?',
              choices: [
                { text: __alloT('stem.firstresponse.5_back_blows_between_the_shoulder_blad', '5 back blows between the shoulder blades, then 5 abdominal thrusts. Repeat.'), impact: 'help', feedback: __alloT('stem.firstresponse.correct_sequence_lean_them_forward_hee', 'Correct sequence. Lean them forward, heel of your hand between the shoulder blades.'), source: 'Red Cross First Aid' },
                { text: __alloT('stem.firstresponse.5_abdominal_thrusts_only', '5 abdominal thrusts only.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.abdominal_thrusts_work_but_pairing_the', 'Abdominal thrusts work but pairing them with back blows is more effective. The current Red Cross protocol is 5 back blows + 5 thrusts.'), source: 'Red Cross First Aid' },
                { text: __alloT('stem.firstresponse.have_them_lie_down_on_their_back_so_yo', 'Have them lie down on their back so you can do CPR.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.cpr_is_for_unconscious_patients_while_', 'CPR is for unconscious patients. While they’re still conscious, do back blows + thrusts.'), source: 'Red Cross First Aid' }
              ] },
            { situation: 'After two cycles, they go limp and fall to the floor.',
              choices: [
                { text: __alloT('stem.firstresponse.lower_them_safely_call_911_start_cpr_l', 'Lower them safely, call 911, start CPR. Look in the mouth before each set of breaths.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_once_unconscious_cpr_can_dislodg', 'Right. Once unconscious, CPR can dislodge the object on its own. Look in the mouth before breaths and remove anything you see — no blind finger sweeps.'), source: 'AHA / Red Cross unconscious choking' },
                { text: __alloT('stem.firstresponse.do_a_blind_finger_sweep_down_their_thr', 'Do a blind finger sweep down their throat.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.never_you_can_push_the_object_deeper_l', 'Never — you can push the object deeper. Look first, only remove what you can see.'), source: 'AHA' },
                { text: __alloT('stem.firstresponse.keep_doing_abdominal_thrusts_on_them_w', 'Keep doing abdominal thrusts on them while they’re on the floor.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.once_unconscious_switch_to_cpr_compres', 'Once unconscious, switch to CPR. Compressions can also help dislodge the object.'), source: 'AHA' }
              ] }
          ] },
        { id: 'field', icon: '⚽', title: __alloT('stem.firstresponse.sports_field_severe_bleeding', 'Sports field — severe bleeding'),
          setup: 'During a soccer game, a player goes down hard after a collision with another player’s cleat. There’s a deep gash on their thigh and blood is spurting. The closest hospital is 20 minutes away.',
          steps: [
            { situation: 'You sprint over. What FIRST?',
              choices: [
                { text: __alloT('stem.firstresponse.press_both_hands_hard_directly_on_the_', 'Press both hands hard directly on the wound. Lean in with bodyweight.'), impact: 'help', feedback: __alloT('stem.firstresponse.direct_pressure_stops_most_bleeding_yo', 'Direct pressure stops most bleeding. Your bodyweight gets the depth a hand alone can’t.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.run_to_find_the_coach_to_grab_the_firs', 'Run to find the coach to grab the first-aid kit.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.every_second_matters_with_arterial_ble', 'Every second matters with arterial bleeding. Apply pressure NOW; have someone else run for the kit.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.lift_the_leg_up_to_drain_the_wound_and', 'Lift the leg up to "drain" the wound and check it.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_lift_to_peek_you_break_the_clot_', 'Don’t lift to peek. You break the clot you’re trying to form. Press and hold.'), source: 'Stop the Bleed' }
              ] },
            { situation: 'Pressure helps but blood is still soaking through. The coach hands you a bleeding-control kit with a tourniquet.',
              choices: [
                { text: __alloT('stem.firstresponse.place_the_tourniquet_2_3_above_the_wou', 'Place the tourniquet 2–3" ABOVE the wound on the thigh. Tighten until bleeding stops. Note the time.'), impact: 'help', feedback: __alloT('stem.firstresponse.limbs_are_the_right_place_for_a_tourni', 'Limbs are the right place for a tourniquet. Above the wound, between wound and heart, not on a joint. Always note the time it was applied.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.place_the_tourniquet_on_the_wound', 'Place the tourniquet ON the wound.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.tourniquets_go_above_the_wound_between', 'Tourniquets go above the wound, between the wound and the heart. Putting it on the wound itself can damage tissue and won’t cut off the artery.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.don_t_use_the_tourniquet_just_keep_pre', 'Don’t use the tourniquet — just keep pressing harder.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.pressure_that_isn_t_controlling_spurti', 'Pressure that isn’t controlling spurting bleeding from a limb is the textbook indication for a tourniquet. Use it.'), source: 'Stop the Bleed / Hartford Consensus' }
              ] },
            { situation: 'EMS is 18 minutes out. Player is conscious but pale. What now?',
              choices: [
                { text: __alloT('stem.firstresponse.stay_with_them_keep_them_lying_down_wa', 'Stay with them. Keep them lying down, warm. Tell EMS the time the tourniquet went on.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_don_t_loosen_the_tourniquet_don_', 'Right. Don’t loosen the tourniquet. Don’t let bystanders give them water. Time on tourniquet is the single most important fact for the ER.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.loosen_the_tourniquet_every_couple_min', 'Loosen the tourniquet every couple minutes "to let blood flow."'), impact: 'hurt', feedback: __alloT('stem.firstresponse.never_once_it_s_on_it_stays_on_until_e', 'Never — once it’s on, it stays on until EMS or the ER takes over. Loosening can cause re-bleeding.'), source: 'Stop the Bleed' },
                { text: __alloT('stem.firstresponse.give_them_water_and_sit_them_up', 'Give them water and sit them up.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_give_anything_by_mouth_they_may_', 'Don’t give anything by mouth (they may need surgery). Keep them lying flat to maintain blood pressure to the brain.'), source: 'Red Cross' }
              ] }
          ] },
        { id: 'classroom', icon: '⚡', title: __alloT('stem.firstresponse.classroom_seizure', 'Classroom seizure'),
          setup: 'In second-period English, a classmate you know has epilepsy suddenly stiffens, falls out of their chair, and starts jerking on the floor. The teacher has stepped out of the room. People are filming on their phones.',
          steps: [
            { situation: 'You move toward them. What FIRST?',
              choices: [
                { text: __alloT('stem.firstresponse.move_sharp_objects_chair_legs_desk_cor', 'Move sharp objects (chair legs, desk corners) away. Note the time it started.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_make_the_area_safe_and_time_the_', 'Right. Make the area safe and TIME the seizure. Most last under 2 minutes; over 5 is a 911 emergency.'), source: 'Epilepsy Foundation' },
                { text: __alloT('stem.firstresponse.hold_their_arms_and_legs_down_so_they_', 'Hold their arms and legs down so they don’t hurt themselves.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.never_restrain_someone_having_a_seizur', 'Never restrain someone having a seizure. You can cause serious injury. Move hazards away from THEM, not the other way.'), source: 'Epilepsy Foundation' },
                { text: __alloT('stem.firstresponse.try_to_put_a_pen_in_their_mouth_so_the', 'Try to put a pen in their mouth so they don’t bite their tongue.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.old_myth_never_put_anything_in_someone', 'Old myth. Never put anything in someone’s mouth during a seizure. They cannot swallow their tongue. You can break their teeth or get bitten.'), source: 'Epilepsy Foundation' }
              ] },
            { situation: 'About the kids filming on their phones:',
              choices: [
                { text: __alloT('stem.firstresponse.tell_them_firmly_to_put_the_phones_awa', 'Tell them firmly to put the phones away — this is not for the internet.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_your_classmate_did_not_consent_t', 'Right. Your classmate did not consent to being filmed during a medical event. Protect their dignity.'), source: 'Epilepsy Foundation advocacy' },
                { text: __alloT('stem.firstresponse.ignore_them_focus_on_the_seizure', 'Ignore them — focus on the seizure.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.focus_on_the_seizure_first_but_ask_som', 'Focus on the seizure first, but ask someone else to clear cameras. Their privacy matters too.'), source: 'Epilepsy Foundation advocacy' },
                { text: __alloT('stem.firstresponse.take_a_video_yourself_for_the_doctor', 'Take a video yourself "for the doctor."'), impact: 'hurt', feedback: __alloT('stem.firstresponse.their_family_or_doctor_can_request_spe', 'Their family or doctor can request specific recordings if helpful — that’s their decision, not yours. Don’t add to the camera count.'), source: 'Epilepsy Foundation advocacy' }
              ] },
            { situation: 'After about 90 seconds, the jerking stops. They’re breathing but groggy and confused.',
              choices: [
                { text: __alloT('stem.firstresponse.roll_them_gently_onto_their_side_recov', 'Roll them gently onto their side (recovery position). Stay with them. Speak calmly.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_recovery_position_lets_saliva_dr', 'Right. Recovery position lets saliva drain. The post-ictal phase can last 5–30 minutes — confusion is normal.'), source: 'Epilepsy Foundation' },
                { text: __alloT('stem.firstresponse.wake_them_up_by_splashing_water_on_the', 'Wake them up by splashing water on their face.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_they_re_recovering_stay_calm_tal', 'Don’t. They’re recovering. Stay calm, talk softly, give them time.'), source: 'Epilepsy Foundation' },
                { text: __alloT('stem.firstresponse.walk_away_the_seizure_is_over', 'Walk away — the seizure is over.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.they_need_someone_with_them_through_th', 'They need someone with them through the post-ictal phase. They may also need to know what just happened — they often don’t remember.'), source: 'Epilepsy Foundation' }
              ] }
          ] },
        { id: 'busstop', icon: '🚌', title: __alloT('stem.firstresponse.bus_stop_diabetic_emergency', 'Bus stop — diabetic emergency'),
          setup: 'At the bus stop after school, a classmate you know has type 1 diabetes is acting strange. They’re sweating, slurring their words, and staring blankly. They look almost drunk. They tell you "I’m fine, leave me alone" but they’re shaky.',
          steps: [
            { situation: 'What do you suspect first?',
              choices: [
                { text: __alloT('stem.firstresponse.low_blood_sugar_hypoglycemia_check_if_', 'Low blood sugar (hypoglycemia). Check if they have juice or glucose tabs.'), impact: 'help', feedback: __alloT('stem.firstresponse.in_a_peer_with_diabetes_behavior_chang', 'In a peer with diabetes, behavior change + sweaty + shaky = low blood sugar until proven otherwise. They may not know how impaired they are.'), source: 'American Diabetes Association' },
                { text: __alloT('stem.firstresponse.they_re_drunk_ignore_them', 'They’re drunk. Ignore them.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.hypoglycemia_in_diabetics_often_looks_', 'Hypoglycemia in diabetics often LOOKS like being drunk. Mistaking it can be fatal. Always treat first when you’re not sure.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.call_their_parent_first', 'Call their parent first.'), impact: 'neutral', feedback: __alloT('stem.firstresponse.a_parent_can_help_but_treating_the_low', 'A parent can help, but treating the low NOW matters more. Sugar first, phone call second.'), source: 'ADA' }
              ] },
            { situation: 'They nod weakly. They have a juice box in their bag.',
              choices: [
                { text: __alloT('stem.firstresponse.open_it_and_help_them_sip_it_stay_with', 'Open it and help them sip it. Stay with them and recheck in 15 minutes.'), impact: 'help', feedback: __alloT('stem.firstresponse.15_15_rule_15g_fast_carb_a_juice_box_i', '15-15 rule: 15g fast carb (a juice box is ~15g), wait 15 min, recheck. Stay with them — they can crash again.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.make_them_eat_a_sandwich_first_protein', 'Make them eat a sandwich first — protein is better.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.when_blood_sugar_is_low_you_need_fast_', 'When blood sugar is low, you need FAST carbs (juice, glucose tab, regular soda). Protein takes too long.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.give_them_their_insulin_pen', 'Give them their insulin pen.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.never_insulin_lowers_blood_sugar_they_', 'Never — insulin LOWERS blood sugar. They need sugar, not insulin.'), source: 'ADA' }
              ] },
            { situation: '15 minutes later: still confused, can barely keep eyes open. Won’t reliably swallow.',
              choices: [
                { text: __alloT('stem.firstresponse.call_911_recovery_position_don_t_put_a', 'Call 911. Recovery position. Don’t put anything else in their mouth.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_choking_risk_is_real_if_they_can', 'Right. Choking risk is real if they can’t swallow safely. 911. They may need IV glucose or glucagon.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.pour_more_juice_into_their_mouth_more_', 'Pour more juice into their mouth — more sugar will help.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.aspiration_risk_never_pour_liquid_into', 'Aspiration risk. Never pour liquid into the mouth of a barely-conscious person. 911.'), source: 'ADA' },
                { text: __alloT('stem.firstresponse.wait_it_out_give_it_more_time', 'Wait it out — give it more time.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.severe_hypoglycemia_can_lead_to_seizur', 'Severe hypoglycemia can lead to seizures, coma, brain damage. Don’t wait when they’re past the 15-minute mark and still impaired.'), source: 'ADA' }
              ] }
          ] },
        { id: 'mh', icon: '💚', title: __alloT('stem.firstresponse.mental_health_peer_in_crisis', 'Mental health — peer in crisis'),
          contentWarning: 'This scenario includes a peer expressing suicidal thoughts. If that is too heavy right now, you can skip it — pick another scenario or come back later. There is no penalty for sitting this one out.',
          setup: 'A friend texts you late at night: "I don’t know if I can keep doing this. I don’t want to be here anymore." They live across town. You’re alone in your room.',
          steps: [
            { situation: 'You read the text. What FIRST?',
              choices: [
                { text: __alloT('stem.firstresponse.text_back_right_now_i_m_here_i_hear_yo', 'Text back right now: "I’m here. I hear you. Tell me more."'), impact: 'help', feedback: __alloT('stem.firstresponse.showing_up_matters_don_t_lecture_don_t', 'Showing up matters. Don’t lecture, don’t fix yet — just be present and listen. You can’t make someone more suicidal by asking.'), source: '988 Lifeline / NAMI' },
                { text: __alloT('stem.firstresponse.don_t_respond_you_don_t_know_what_to_s', 'Don’t respond — you don’t know what to say and you’re scared.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.silence_in_this_moment_is_the_most_dan', 'Silence in this moment is the most dangerous thing. Even "I see you. I’m here." is a lifeline. You don’t need the right words.'), source: 'QPR / NAMI' },
                { text: __alloT('stem.firstresponse.screenshot_it_and_post_it_to_tiktok_as', 'Screenshot it and post it to TikTok asking what to do.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.no_this_is_private_posting_it_betrays_', 'No. This is private. Posting it betrays trust and can escalate. Take the message to a trusted adult, not the internet.'), source: 'NAMI peer support guidance' }
              ] },
            { situation: 'They text back: "I’ve been thinking about it for a while. I have a plan."',
              choices: [
                { text: __alloT('stem.firstresponse.tell_them_you_re_glad_they_trusted_you', 'Tell them you’re glad they trusted you. Ask if you can call 988 with them or if you can tell their parent / a trusted adult so they’re not alone tonight.'), impact: 'help', feedback: __alloT('stem.firstresponse.a_specific_plan_high_risk_looping_in_a', 'A specific plan = high risk. Looping in an adult or 988 isn’t a betrayal — it’s the move. Ask their preference but make sure SOMEONE who can be physically present knows.'), source: '988 Lifeline / NAMI' },
                { text: __alloT('stem.firstresponse.promise_you_won_t_tell_anyone_ever_no_', 'Promise you won’t tell anyone, ever, no matter what.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.don_t_promise_this_some_things_you_can', 'Don’t promise this. Some things you can’t keep secret — a friend’s safety is one. You can promise to be there. You can’t promise silence.'), source: 'NAMI peer support / school safe-messaging' },
                { text: __alloT('stem.firstresponse.tell_them_to_just_hang_in_there_and_go', 'Tell them to "just hang in there" and go to sleep.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.this_dismisses_the_crisis_they_told_yo', 'This dismisses the crisis. They told you because they need help RIGHT NOW. Stay engaged.'), source: 'NAMI / SAMHSA' }
              ] },
            { situation: 'They’re scared their parents will be mad. What do you say?',
              choices: [
                { text: __alloT('stem.firstresponse.tell_them_i_know_it_feels_that_way_the', 'Tell them: "I know it feels that way. The grown-ups who matter will be relieved you said something. Want me to call with you, or call 988 first?"'), impact: 'help', feedback: __alloT('stem.firstresponse.acknowledge_the_fear_offer_to_share_th', 'Acknowledge the fear. Offer to share the load. 988 counselors can help them figure out next steps and what to say to a parent.'), source: '988 Lifeline' },
                { text: __alloT('stem.firstresponse.tell_them_their_parents_won_t_care', 'Tell them their parents won’t care.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.you_don_t_know_that_even_if_a_relation', 'You don’t know that. Even if a relationship is hard, a crisis adult can step in (counselor, coach, aunt, neighbor). 988 helps figure out who.'), source: 'NAMI' },
                { text: __alloT('stem.firstresponse.wait_until_tomorrow_to_tell_anyone_it_', 'Wait until tomorrow to tell anyone — it’s late.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.a_specific_plan_is_a_now_problem_not_a', 'A specific plan is a now problem, not a tomorrow problem. 988 is open 24/7. So is 911 if there’s immediate life threat.'), source: '988 Lifeline' }
              ] },
            { situation: 'They agree to text 988 (HOME to 741741). What do YOU do next?',
              choices: [
                { text: __alloT('stem.firstresponse.stay_on_the_phone_or_text_with_them_te', 'Stay on the phone or text with them. Tell a trusted adult in your life what just happened — you need support too.'), impact: 'help', feedback: __alloT('stem.firstresponse.right_don_t_carry_this_alone_hearing_t', 'Right. Don’t carry this alone. Hearing this from a friend is heavy — your own adult / counselor / parent can help you process. NAMI HelpLine: 1-800-950-NAMI.'), source: 'NAMI peer support' },
                { text: __alloT('stem.firstresponse.hang_up_and_put_your_phone_away_you_ha', 'Hang up and put your phone away — you handled it.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.you_did_show_up_that_matters_but_stayi', 'You did show up — that matters. But staying connected and getting your own support afterward both matter. This is the kind of thing that lingers.'), source: 'NAMI' },
                { text: __alloT('stem.firstresponse.tell_everyone_at_school_tomorrow_what_', 'Tell everyone at school tomorrow what happened.'), impact: 'hurt', feedback: __alloT('stem.firstresponse.no_their_story_is_theirs_you_can_tell_', 'No. Their story is theirs. You can tell trusted adults who can help; you can’t tell the lunch table.'), source: 'NAMI peer support' }
              ] }
          ] }
      ];

      function renderScenarios() {
        var scenarioPick = d.scenarioPick || null;
        var scenarioStep = d.scenarioStep || 0;
        var scenarioScore = d.scenarioScore || { help: 0, neutral: 0, hurt: 0 };
        var scenarioAnswered = !!d.scenarioAnswered;
        var scenarioLastChoice = (typeof d.scenarioLastChoice === 'number') ? d.scenarioLastChoice : null;
        var mhAcknowledged = !!d.mhAcknowledged;

        var sc = scenarioPick ? SCENARIOS.filter(function(s) { return s.id === scenarioPick; })[0] : null;

        function pickScenario(id) {
          updMulti({
            scenarioPick: id, scenarioStep: 0,
            scenarioScore: { help: 0, neutral: 0, hurt: 0 },
            scenarioAnswered: false, scenarioLastChoice: null
          });
          var picked = SCENARIOS.filter(function(s) { return s.id === id; })[0];
          if (picked) frAnnounce('Starting scenario: ' + picked.title);
        }

        function chooseAnswer(idx) {
          if (scenarioAnswered) return;
          var step = sc.steps[scenarioStep];
          var choice = step.choices[idx];
          var nextScore = Object.assign({}, scenarioScore);
          nextScore[choice.impact] = (nextScore[choice.impact] || 0) + 1;
          updMulti({
            scenarioScore: nextScore,
            scenarioAnswered: true,
            scenarioLastChoice: idx
          });
          frAnnounceUrgent(choice.impact === 'help' ? 'Helped.' : (choice.impact === 'hurt' ? 'Hurt. ' + choice.feedback : 'Neutral.'));
        }

        function nextStep() {
          if (scenarioStep + 1 >= sc.steps.length) {
            // End of scenario
            if ((scenarioScore.hurt || 0) === 0 && (scenarioScore.help || 0) >= sc.steps.length - 1) {
              awardBadge('scenario_clean_' + sc.id, 'Clean run: ' + sc.title);
            }
            updMulti({ scenarioStep: scenarioStep + 1, scenarioAnswered: false, scenarioLastChoice: null });
          } else {
            updMulti({ scenarioStep: scenarioStep + 1, scenarioAnswered: false, scenarioLastChoice: null });
            frAnnounce('Step ' + (scenarioStep + 2) + ' of ' + sc.steps.length);
          }
        }

        function leaveScenario() {
          updMulti({ scenarioPick: null, scenarioStep: 0, scenarioScore: { help: 0, neutral: 0, hurt: 0 }, scenarioAnswered: false, scenarioLastChoice: null });
          frAnnounce('Back to scenario list');
        }

        // ── Scenario picker
        function scenarioPicker() {
          return h('div', null,
            h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              __alloT('stem.firstresponse.each_scenario_is_multiple_steps_at_eac', 'Each scenario is multiple steps. At each step, pick what you’d do — you’ll see whether it '),
              h('span', { style: { color: T.ok } }, 'helped'),
              __alloT('stem.firstresponse.was', ', was '),
              h('span', { style: { color: T.warn } }, 'neutral'),
              __alloT('stem.firstresponse.or', ', or '),
              h('span', { style: { color: T.danger } }, 'hurt'),
              __alloT('stem.firstresponse.and_why_sources_cited_per_choice', ', and why. Sources cited per choice.')),
            h('div', { role: 'list',
              style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
              SCENARIOS.map(function(s) {
                return h('button', { key: s.id, role: 'listitem', 'data-fr-focusable': true,
                  'aria-label': 'Start scenario: ' + s.title + (s.contentWarning ? ' (content warning)' : ''),
                  onClick: function() {
                    if (s.contentWarning && !mhAcknowledged) {
                      // Stage the pick; show CW dialog inline before starting
                      upd('scenarioPick', s.id);
                      frAnnounce('Content warning shown.');
                    } else {
                      pickScenario(s.id);
                    }
                  },
                  style: btn({
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                    padding: 12, minHeight: 100
                  })
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, s.icon),
                    h('span', { style: { fontWeight: 700, fontSize: 14 } }, s.title)
                  ),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.45 } }, s.steps.length, ' steps'),
                  s.contentWarning && h('div', { style: { fontSize: 10, color: T.accentHi, fontStyle: 'italic' } }, __alloT('stem.firstresponse.content_warning', '⚠️ content warning'))
                );
              })
            )
          );
        }

        // ── Content warning dialog (mental-health scenario gate)
        function contentWarningDialog() {
          var cw = sc.contentWarning;
          return h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': __alloT('stem.firstresponse.content_warning_before_mental_health_s', 'Content warning before mental health scenario'),
            style: { padding: 16, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', border: '2px solid ' + T.warn } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.warn } }, __alloT('stem.firstresponse.content_warning_2', '⚠️ Content warning')),
            h('p', { style: { margin: '0 0 12px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, cw),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.i_understand_start_the_scenario', 'I understand. Start the scenario.'),
                onClick: function() { upd('mhAcknowledged', true); pickScenario(sc.id); },
                style: btnPrimary()
              }, __alloT('stem.firstresponse.i_understand_start', 'I understand — start')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': __alloT('stem.firstresponse.skip_this_scenario_pick_a_different_on', 'Skip this scenario; pick a different one.'),
                onClick: leaveScenario,
                style: btn()
              }, __alloT('stem.firstresponse.skip_pick_different', 'Skip — pick different'))
            )
          );
        }

        // ── Active scenario
        function scenarioBody() {
          // Done?
          if (scenarioStep >= sc.steps.length) {
            var total = sc.steps.length;
            var pctHelp = Math.round(((scenarioScore.help || 0) / total) * 100);
            var verdict = (scenarioScore.hurt || 0) === 0
              ? (pctHelp >= 75 ? 'You ran this clean.' : 'No hurts — good. Tighten the neutrals next round.')
              : 'Some hurts. Read the feedback and try again.';
            return h('div', { style: { padding: 16, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '🏁'),
              h('h3', { style: { margin: '0 0 8px', fontSize: 18 } }, __alloT('stem.firstresponse.scenario_complete', 'Scenario complete: '), sc.title),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 } },
                h('span', { style: { padding: '4px 10px', borderRadius: 999, background: '#064e3b', color: '#d1fae5', fontSize: 12, fontWeight: 700 } }, '✓ Helped: ' + (scenarioScore.help || 0)),
                h('span', { style: { padding: '4px 10px', borderRadius: 999, background: '#78350f', color: '#fde68a', fontSize: 12, fontWeight: 700 } }, '~ Neutral: ' + (scenarioScore.neutral || 0)),
                h('span', { style: { padding: '4px 10px', borderRadius: 999, background: '#7f1d1d', color: '#fde2e2', fontSize: 12, fontWeight: 700 } }, '✗ Hurt: ' + (scenarioScore.hurt || 0))
              ),
              h('p', { style: { color: T.muted, fontSize: 13, marginBottom: 14 } }, verdict),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', { 'data-fr-focusable': true, onClick: function() { pickScenario(sc.id); }, style: btn() }, __alloT('stem.firstresponse.retry', '↺ Retry')),
                h('button', { 'data-fr-focusable': true, onClick: leaveScenario, style: btnPrimary() }, __alloT('stem.firstresponse.pick_another_scenario', '→ Pick another scenario'))
              )
            );
          }
          var step = sc.steps[scenarioStep];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, sc.icon),
                h('strong', { style: { fontSize: 15 } }, sc.title),
                h('span', { style: { marginLeft: 'auto', fontSize: 11, color: T.dim } }, __alloT('stem.firstresponse.step_2', 'Step '), (scenarioStep + 1), ' / ', sc.steps.length)
              ),
              scenarioStep === 0 && h('p', { style: { margin: '6px 0 0', color: T.muted, fontSize: 13, lineHeight: 1.55, fontStyle: 'italic' } }, sc.setup)
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
              h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, step.situation),
              h('div', { role: 'group', 'aria-label': __alloT('stem.firstresponse.choices', 'Choices'),
                style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                step.choices.map(function(c, i) {
                  var picked = scenarioLastChoice === i;
                  var bg = T.cardAlt, border = T.border, color = T.text;
                  if (scenarioAnswered && picked) {
                    if (c.impact === 'help') { bg = '#064e3b'; border = T.ok; color = '#d1fae5'; }
                    else if (c.impact === 'hurt') { bg = '#7f1d1d'; border = T.danger; color = '#fde2e2'; }
                    else { bg = '#78350f'; border = T.warn; color = '#fde68a'; }
                  }
                  return h('button', { key: i, 'data-fr-focusable': true,
                    disabled: scenarioAnswered,
                    'aria-label': c.text + (scenarioAnswered && picked ? ' (your choice — ' + c.impact + ')' : ''),
                    onClick: function() { chooseAnswer(i); },
                    style: btn({ background: bg, borderColor: border, color: color, padding: '10px 12px', fontSize: 13, lineHeight: 1.5, cursor: scenarioAnswered ? 'default' : 'pointer' })
                  }, c.text);
                })
              ),
              scenarioAnswered && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, 'Why: '), step.choices[scenarioLastChoice].feedback,
                h('div', { style: { marginTop: 4, fontSize: 10, color: T.dim, fontStyle: 'italic' } }, 'Source: ', step.choices[scenarioLastChoice].source)
              ),
              h('div', { style: { marginTop: 10, display: 'flex', justifyContent: 'space-between' } },
                h('button', { 'data-fr-focusable': true, 'aria-label': __alloT('stem.firstresponse.leave_scenario', 'Leave scenario'),
                  onClick: leaveScenario, style: btn({ padding: '6px 12px', fontSize: 12 })
                }, __alloT('stem.firstresponse.leave', '← Leave')),
                scenarioAnswered && h('button', { 'data-fr-focusable': true, 'aria-label': __alloT('stem.firstresponse.next_step', 'Next step'),
                  onClick: nextStep, style: btnPrimary({ padding: '6px 14px', fontSize: 12 })
                }, scenarioStep + 1 >= sc.steps.length ? 'See result →' : 'Next →')
              )
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🎭 Scenario sim'),
          emergencyBanner(),
          !sc && scenarioPicker(),
          sc && sc.contentWarning && !mhAcknowledged && contentWarningDialog(),
          sc && (!sc.contentWarning || mhAcknowledged) && scenarioBody(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // AI PRACTICE module — callGemini generates novel scenes; AI critiques
      // student's response against HARDCODED protocols. The AI never answers
      // "what's the right clinical decision" — it only checks reasoning against
      // protocols already in this tool. Hardcoded fallback scenes ship with the
      // module so it works even if no API key / Gemini is unavailable.
      // ─────────────────────────────────────────
      var FALLBACK_SCENES = [
        { id: 'fb1', difficulty: 'basic',
          text: __alloT('stem.firstresponse.in_study_hall_a_peer_drops_his_soda_an', 'In study hall, a peer drops his soda and slumps face-first onto his desk. He does not respond when you say his name. You can see his chest is not moving normally.') },
        { id: 'fb2', difficulty: 'basic',
          text: __alloT('stem.firstresponse.on_the_school_bus_a_1st_grader_starts_', 'On the school bus, a 1st-grader starts crying loudly that his throat itches and his lip looks swollen. He just shared a granola bar with another kid and his backpack has a "PEANUT ALLERGY" tag on it.') },
        { id: 'fb3', difficulty: 'intermediate',
          text: __alloT('stem.firstresponse.your_aunt_is_over_for_dinner_mid_conve', 'Your aunt is over for dinner. Mid-conversation she suddenly can’t lift her right arm to take a glass of water. Her smile is uneven on one side and she keeps trying to say "I’m fine" but it comes out garbled. Time is 7:14 PM.') },
        { id: 'fb4', difficulty: 'intermediate',
          text: __alloT('stem.firstresponse.at_the_skate_park_a_kid_wipes_out_and_', 'At the skate park, a kid wipes out and lies on the ground bleeding heavily from a deep gash on her thigh. Blood is pooling on the concrete. The nearest hospital is 25 minutes away.') },
        { id: 'fb5', difficulty: 'advanced',
          text: __alloT('stem.firstresponse.you_walk_into_a_friend_s_house_unannou', 'You walk into a friend’s house unannounced. He’s on the bathroom floor, lips blue, breathing slowly and shallowly. There’s a small empty pill bottle and a vape pen near him. His phone is buzzing on the counter.') },
        { id: 'fb6', difficulty: 'advanced',
          text: __alloT('stem.firstresponse.at_lunch_a_classmate_who_is_deaf_taps_', 'At lunch, a classmate who is Deaf taps you and points at another student across the cafeteria who is alone, eyes wide, hands gripping the edge of the table, breathing fast and shallow. You don’t know if they’re having a heart attack or a panic attack.') }
      ];

      // Hardcoded ground-truth signal list. The AI critique prompt references
      // these so the model can't invent its own protocol numbers.
      var PROTOCOL_GROUND_TRUTH = [
        'Always call 911 (or text 911) for any unresponsive person, suspected stroke, severe bleeding, anaphylaxis, suspected overdose, suspected cardiac arrest, severe burn, or breathing emergency.',
        'Hands-only CPR: 100–120 bpm, push 2 inches deep on adult, 1.5 inches on child/infant. Continue until EMS or AED takes over.',
        'AED: turn it on, follow voice/visual prompts. AEDs will not shock someone who does not need it.',
        'Stop the Bleed: pressure → packing → tourniquet. Tourniquet on LIMBS only, 2–3" above wound, NEVER on neck/torso/groin/armpit. Note time applied.',
        'Choking adult/child: 5 back blows + 5 abdominal thrusts. Pregnant or large person: chest thrusts. Infant: 5 back blows + 5 chest thrusts (NEVER abdominal). Unconscious: lower, 911, CPR.',
        'Stroke recognition: BE FAST (Balance, Eyes, Face, Arms, Speech, Time). Note exact onset time. Do NOT give food, water, or aspirin.',
        'Anaphylaxis: EpiPen IM in outer thigh, hold 3 sec. Call 911 even if symptoms improve.',
        'Seizure: NEVER restrain. NEVER put anything in the mouth. Time it. Cushion head. Recovery position after. 911 if >5 min, repeats, first-ever, in water, or injury.',
        'Hypoglycemia: 15g fast carb if alert and able to swallow; 911 + recovery position if unconscious. Never pour liquid into the mouth of unconscious person.',
        'Suspected overdose: 911. Naloxone if available. Recovery position. Maine Good Samaritan law protects bystanders.',
        'Mental health crisis: 988 (call or text) for non-life-threat; 911 only if immediate life threat. Stay with the person. Tell a trusted adult.',
        'Deaf/HoH patients: text-to-911 (Maine has it). Face them. Don’t shout. Use phone-typing apps. AEDs show visual prompts.',
        'Autistic peer in distress: lower sensory load, predictable verbal warnings before touch, short literal sentences, allow stims, recognize meltdown ≠ tantrum.'
      ];

      function renderAiPractice() {
        var aiView = d.aiView || 'overview';
        var aiDifficulty = d.aiDifficulty || 'basic';
        var aiScene = d.aiScene || null; // { id, text, difficulty }
        var aiResponse = d.aiResponse || '';
        var aiCritique = d.aiCritique || null;
        var aiLoadingScene = !!d.aiLoadingScene;
        var aiLoadingCritique = !!d.aiLoadingCritique;
        var callGemini = ctx.callGemini || null;

        function tabBtn(id, label) {
          var active = aiView === id;
          return h('button', { 'data-fr-focusable': true, key: id,
            'aria-pressed': active ? 'true' : 'false',
            onClick: function() { upd('aiView', id); frAnnounce(label); },
            style: btn({
              padding: '6px 12px', fontSize: 12,
              background: active ? T.accent : T.card,
              color: active ? '#fff' : T.text,
              borderColor: active ? T.accent : T.border
            })
          }, label);
        }

        function pickFallback() {
          var pool = FALLBACK_SCENES.filter(function(s) { return s.difficulty === aiDifficulty; });
          if (pool.length === 0) pool = FALLBACK_SCENES;
          var prev = aiScene ? aiScene.id : null;
          // Prefer one that's different from the previous pick.
          var candidates = pool.filter(function(s) { return s.id !== prev; });
          if (candidates.length === 0) candidates = pool;
          return candidates[Math.floor(Math.random() * candidates.length)];
        }

        function generateScene() {
          // No callGemini available: serve a fallback scene.
          if (!callGemini) {
            var fb = pickFallback();
            updMulti({ aiScene: fb, aiResponse: '', aiCritique: null });
            frAnnounce('New scene loaded.');
            return;
          }
          upd('aiLoadingScene', true);
          frAnnounce('Generating scene...');
          var prompt = 'Write ONE realistic medical-emergency scene for a teen first-aid trainee. Length: 2–3 short sentences. Difficulty: ' + aiDifficulty + '.\n\n' +
            'Pick from these emergency types: cardiac arrest, anaphylaxis, choking, stroke, seizure, severe bleeding, hypoglycemia, overdose, panic attack, mental-health crisis. Vary across calls.\n\n' +
            'Set in a school, sports field, bus, home, or skate park. Include enough recognition cues that an alert trainee could identify the emergency. Do NOT include the diagnosis, do NOT name the protocol, do NOT include "what should you do?" — just describe the scene.\n\n' +
            'Output ONLY the scene text, no preamble, no markdown. Plain text only.';
          callGemini(prompt, { maxOutputTokens: 220 })
            .then(function(text) {
              var clean = String(text || '').trim();
              if (!clean) throw new Error('Empty response');
              var scene = { id: 'ai-' + Date.now(), text: clean, difficulty: aiDifficulty };
              updMulti({ aiScene: scene, aiResponse: '', aiCritique: null, aiLoadingScene: false });
              frAnnounce('Scene loaded.');
            })
            .catch(function(e) {
              console.warn('[FirstResponse] AI scene generation failed; falling back.', e);
              var fb = pickFallback();
              updMulti({ aiScene: fb, aiResponse: '', aiCritique: null, aiLoadingScene: false });
              addToast('AI unavailable — using a built-in scene.');
              frAnnounce('AI unavailable. Using a built-in scene.');
            });
        }

        function getCritique() {
          if (!aiScene || !aiResponse.trim()) return;
          if (!callGemini) {
            // Local fallback: keyword scaffold critique.
            var resp = aiResponse.toLowerCase();
            var checks = [
              { ok: /\b911\b|text\s*911|988\b/.test(resp), msg: 'Did you call 911 (or 988 / text-911)? Most life-threatening emergencies need EMS dispatch immediately.' },
              { ok: /(check|respond|shake|shout|are you ok|conscious)/i.test(resp), msg: 'Did you check responsiveness before doing anything else?' },
              { ok: /(stay|with|don.?t leave|next to)/i.test(resp), msg: 'Did you mention staying with the person until help arrives?' },
              { ok: /(direct\s*pressure|cpr|epipen|recovery\s*position|back\s*blows|abdominal|tourniquet|ae?d|sugar|juice|988)/i.test(resp), msg: 'Did you reference a specific protocol that matches the scene?' }
            ];
            var critiqueText = 'Local check (no AI available):\n\n' + checks.map(function(c) {
              return (c.ok ? '✓ ' : '✗ ') + c.msg;
            }).join('\n\n');
            updMulti({ aiCritique: { text: critiqueText, source: 'local' } });
            frAnnounce('Local critique ready.');
            return;
          }
          upd('aiLoadingCritique', true);
          frAnnounce('Getting critique...');
          var prompt = 'You are a first-aid instructor reviewing a student’s response to an emergency scene.\n\n' +
            'SCENE:\n' + aiScene.text + '\n\n' +
            'STUDENT RESPONSE:\n' + aiResponse + '\n\n' +
            'GROUND TRUTH PROTOCOLS (do not deviate from these — if the student response conflicts, flag it):\n' +
            PROTOCOL_GROUND_TRUTH.map(function(p, i) { return (i + 1) + '. ' + p; }).join('\n') + '\n\n' +
            'CRITIQUE the student’s response. Specifically:\n' +
            '1. Did they identify the emergency correctly? (If wrong, say what it actually is.)\n' +
            '2. Did they call 911 (or 988 for mental-health, or 1-800-222-1222 for poison)? If not, flag it.\n' +
            '3. Did they apply the right protocol step from the ground-truth list? Cite the protocol number.\n' +
            '4. What did they MISS or get WRONG?\n' +
            '5. What did they get RIGHT?\n\n' +
            'IMPORTANT: Do NOT make up clinical numbers, drug doses, or protocol steps not in the ground-truth list. ' +
            'Do NOT answer clinical decision questions ("should I give X medication") — instead say "follow what is prescribed and call 911." ' +
            'Do NOT diagnose for the student — your job is to grade their reasoning. ' +
            'End with: "Educational only. Real emergencies → 911. Get certified → redcross.org."\n\n' +
            'Tone: warm, direct, like a school-based mentor. 4–6 sentences total.';
          callGemini(prompt, { maxOutputTokens: 500 })
            .then(function(text) {
              var clean = String(text || '').trim();
              if (!clean) throw new Error('Empty response');
              updMulti({ aiCritique: { text: clean, source: 'ai' }, aiLoadingCritique: false });
              awardBadge('ai_practice', 'AI Practice (got a scene critiqued)');
              frAnnounce('Critique ready.');
            })
            .catch(function(e) {
              console.warn('[FirstResponse] AI critique failed; falling back.', e);
              upd('aiLoadingCritique', false);
              addToast('AI critique unavailable — try the local check.');
              // Recurse via local fallback:
              var resp = aiResponse.toLowerCase();
              var checks = [
                { ok: /\b911\b|text\s*911|988\b/.test(resp), msg: 'Did you call 911 (or 988 / text-911)?' },
                { ok: /(check|respond|shake|shout|are you ok)/i.test(resp), msg: 'Did you check responsiveness first?' },
                { ok: /(stay|with|don.?t leave)/i.test(resp), msg: 'Did you stay with the person?' },
                { ok: /(direct\s*pressure|cpr|epipen|recovery|back\s*blows|abdominal|tourniquet|ae?d|sugar|juice|988)/i.test(resp), msg: 'Did you reference a specific protocol?' }
              ];
              var critiqueText = 'AI was unavailable — here is a local check:\n\n' + checks.map(function(c) {
                return (c.ok ? '✓ ' : '✗ ') + c.msg;
              }).join('\n\n');
              updMulti({ aiCritique: { text: critiqueText, source: 'local' } });
            });
        }

        function aiOverview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.how_ai_practice_works', '🤖 How AI Practice works')),
              h('ol', { style: { margin: '0 0 0 18px', color: T.muted, fontSize: 13, lineHeight: 1.7 } },
                h('li', null, __alloT('stem.firstresponse.pick_a_difficulty_generate_a_novel_sce', 'Pick a difficulty. Generate a novel scene.')),
                h('li', null, __alloT('stem.firstresponse.write_your_response_in_2_3_sentences_w', 'Write your response in 2–3 sentences: what you’d do, in what order.')),
                h('li', null, __alloT('stem.firstresponse.get_critique_the_ai_grades_your_reason', 'Get critique. The AI grades your reasoning against the protocols hardcoded in this tool.')),
                h('li', null, h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.the_ai_never_gives_clinical_decisions', 'The AI never gives clinical decisions')),
                  __alloT('stem.firstresponse.it_only_checks_your_reasoning_for_shou', ' — it only checks your reasoning. For "should I give X" questions, the answer is always "follow what’s prescribed + call 911."'))
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, __alloT('stem.firstresponse.without_an_ai_key', 'Without an AI key: ')),
              __alloT('stem.firstresponse.the_module_still_works_pre_written_sce', 'the module still works — pre-written scenes are bundled, and a local keyword check stands in for AI critique.'))
          );
        }

        function aiPractice() {
          var difficulties = [
            { id: 'basic', label: __alloT('stem.firstresponse.basic_single_emergency_clear_cues', 'Basic — single emergency, clear cues') },
            { id: 'intermediate', label: __alloT('stem.firstresponse.intermediate_needs_recognition_decisio', 'Intermediate — needs recognition + decision') },
            { id: 'advanced', label: __alloT('stem.firstresponse.advanced_ambiguity_multiple_issues', 'Advanced — ambiguity / multiple issues') }
          ];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.pick_difficulty', '⚙️ Pick difficulty')),
              h('div', { role: 'radiogroup', 'aria-label': __alloT('stem.firstresponse.difficulty', 'Difficulty'),
                style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                difficulties.map(function(diff) {
                  var active = aiDifficulty === diff.id;
                  return h('button', { key: diff.id, 'data-fr-focusable': true,
                    role: 'radio', 'aria-checked': active ? 'true' : 'false',
                    onClick: function() { upd('aiDifficulty', diff.id); frAnnounce(diff.label); },
                    style: btn({
                      padding: '8px 12px', fontSize: 12,
                      background: active ? '#1e3a8a' : T.cardAlt,
                      color: active ? '#dbeafe' : T.text,
                      borderColor: active ? '#1e40af' : T.border
                    })
                  }, (active ? '◉ ' : '○ ') + diff.label);
                })
              ),
              h('div', { style: { marginTop: 12 } },
                h('button', { 'data-fr-focusable': true,
                  'aria-label': aiLoadingScene ? 'Generating scene...' : 'Generate a new scene',
                  'aria-busy': aiLoadingScene ? 'true' : 'false',
                  disabled: aiLoadingScene,
                  onClick: generateScene, style: btnPrimary({ opacity: aiLoadingScene ? 0.6 : 1 })
                }, aiLoadingScene ? '⏳ Generating...' : '🎲 Generate scene')
              )
            ),
            aiScene && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, __alloT('stem.firstresponse.the_scene', '📖 The scene')),
              h('p', { style: { margin: 0, color: T.text, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' } }, aiScene.text),
              aiScene.id && aiScene.id.indexOf('fb') === 0 && h('div', { style: { marginTop: 6, fontSize: 10, color: T.dim, fontStyle: 'italic' } }, __alloT('stem.firstresponse.bundled_scene_no_ai_used', 'Bundled scene (no AI used).'))
            ),
            aiScene && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('label', { htmlFor: 'fr-ai-response', style: { display: 'block', fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 } },
                __alloT('stem.firstresponse.your_response_2_3_sentences', '✏️ Your response (2–3 sentences)')),
              h('textarea', { id: 'fr-ai-response', 'data-fr-focusable': true,
                value: aiResponse,
                onChange: function(e) { upd('aiResponse', e.target.value); },
                placeholder: __alloT('stem.firstresponse.what_do_you_do_and_in_what_order_be_sp', 'What do you do, and in what order? Be specific (call 911? CPR? AED? EpiPen? recovery position?).'),
                'aria-label': __alloT('stem.firstresponse.your_emergency_response_2_to_3_sentenc', 'Your emergency response, 2 to 3 sentences'),
                rows: 4,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }
              }),
              h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, marginBottom: 8 } },
                aiResponse.length, __alloT('stem.firstresponse.characters_aim_for_150_400', ' characters. Aim for ~150–400.')),
              h('button', { 'data-fr-focusable': true,
                'aria-label': aiLoadingCritique ? 'Getting critique...' : 'Get AI critique of your response',
                'aria-busy': aiLoadingCritique ? 'true' : 'false',
                disabled: aiLoadingCritique || !aiResponse.trim(),
                onClick: getCritique,
                style: btnPrimary({ opacity: (aiLoadingCritique || !aiResponse.trim()) ? 0.6 : 1 })
              }, aiLoadingCritique ? '⏳ Critiquing...' : '🎓 Get critique')
            ),
            aiCritique && h('div', { style: { padding: 14, borderRadius: 10, background: '#1e3a8a', border: '1px solid #1e40af', color: '#dbeafe' } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15 } }, __alloT('stem.firstresponse.critique', '🎓 Critique')),
              h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 } }, aiCritique.text),
              h('div', { style: { marginTop: 10, fontSize: 10, opacity: 0.75, fontStyle: 'italic' } },
                aiCritique.source === 'ai' ? 'Critique generated by AI; protocol references are checked against this tool’s hardcoded ground truth.' : 'Local keyword check (AI unavailable).')
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🤖 AI Practice'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.firstresponse.ai_practice_sections', 'AI Practice sections'),
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'How it works'),
            tabBtn('practice', 'Practice')
          ),
          aiView === 'overview' && aiOverview(),
          aiView === 'practice' && aiPractice(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // RESOURCES tab — directory of every cited org
      // No consent gate; available even before consent for emergencies.
      // ─────────────────────────────────────────
      function renderResources() {
        function section(title, items) {
          return h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, title),
            items.map(function(r, i) {
              return h('div', { key: i, style: { padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid ' + T.border : 'none' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, r.icon),
                  h('span', { style: { fontWeight: 700, fontSize: 13, color: T.text } }, r.name)
                ),
                h('div', { style: { fontSize: 13, color: T.accentHi, fontWeight: 600, marginLeft: 24 } },
                  r.url
                    ? h('a', { href: r.url, target: '_blank', rel: 'noopener', style: { color: T.accentHi, textDecoration: 'underline' }, 'aria-label': r.name + ' — ' + r.contact + ' (opens in new tab)' }, r.contact)
                    : r.contact),
                h('div', { style: { fontSize: 11, color: T.dim, marginLeft: 24, lineHeight: 1.5 } }, r.desc)
              );
            })
          );
        }
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📚 Resources'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.firstresponse.every_org_cited_in_this_tool_on_a_phon', 'Every org cited in this tool. On a phone, tap a phone number to call. '),
            h('strong', { style: { color: T.accentHi } }, __alloT('stem.firstresponse.maine_note', 'Maine note: ')), MAINE_EMS.text911),
          section('🚑 Emergency', RESOURCES.emergency),
          section('💚 Crisis & mental health', RESOURCES.crisis),
          section('✚ Get certified', RESOURCES.certification),
          section('⚡ Condition-specific', RESOURCES.conditions),
          section('♾️ Disability advocacy', RESOURCES.disabilityAdvocacy),
          h('div', { style: { marginTop: 8, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('div', { style: { fontWeight: 700, color: T.text, marginBottom: 6 } }, __alloT('stem.firstresponse.maine_reality_2', '🌲 Maine reality')),
            h('div', { style: { marginBottom: 4 } }, MAINE_EMS.ruralEta),
            h('div', { style: { marginBottom: 4 } }, MAINE_EMS.heartAed),
            h('div', { style: { marginBottom: 4 } }, MAINE_EMS.crisisRoute),
            h('div', null, MAINE_EMS.poison)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // FIRST ACTION SLEUTH (net-new mini-game)
      // 10 vignettes. Player picks the FIRST action from 6 options. Frame is
      // explicitly "decision practice" — the consent gate already established
      // this is educational, not a substitute for certification. Coaching after
      // each answer cites why this is the first action and what NOT to do
      // first (the most-common confusion).
      // ─────────────────────────────────────────
      function renderFirstActionSleuth() {
        var ACTIONS = [
          { id: 'callEMS',  label: __alloT('stem.firstresponse.call_911_3', 'Call 911'),                  color: '#dc2626', icon: '📞', def: 'Activate emergency services. In Maine you can text 911 too.' },
          { id: 'cpr',      label: __alloT('stem.firstresponse.start_cpr_2', 'Start CPR'),                 color: '#ef4444', icon: '❤️', def: 'Hands-only chest compressions, 2 inches deep, 100–120/min.' },
          { id: 'aed',      label: __alloT('stem.firstresponse.apply_aed_2', 'Apply AED'),                 color: '#f59e0b', icon: '⚡', def: 'Power on, attach pads, follow voice prompts. Continue compressions until shock.' },
          { id: 'pressure', label: __alloT('stem.firstresponse.direct_pressure_3', 'Direct pressure'),           color: '#7c3aed', icon: '🩹', def: 'Press hard on the wound with whatever cloth is at hand. Maintain pressure.' },
          { id: 'heimlich', label: __alloT('stem.firstresponse.abdominal_thrusts_2', 'Abdominal thrusts'),         color: '#0ea5e9', icon: '🫶', def: 'Inward and upward thrusts above the navel until object dislodges.' },
          { id: 'recovery', label: __alloT('stem.firstresponse.recovery_position_2', 'Recovery position'),         color: '#16a34a', icon: '🛌', def: 'Roll onto side; keeps airway open and prevents aspiration if they vomit.' }
        ];
        var VIGNETTES = [
          { id: 1, scenario: 'A coworker collapses in the office. They are unresponsive, not breathing, and have no pulse. You are alone with them. Your phone is in your pocket.', correct: 'callEMS',
            why: 'Single-rescuer adult cardiac arrest: call 911 FIRST so EMS + AED are dispatched while you start CPR. Adult sudden cardiac arrest is usually a heart-rhythm problem; defibrillation is the highest-value intervention and needs EMS en route.' },
          { id: 2, scenario: 'A 7-year-old has just been pulled from a backyard pool. Not breathing, no pulse. You are alone — no one else is around to call.', correct: 'cpr',
            why: 'Pediatric drowning is a respiratory cause. AHA guidance: do 2 minutes of CPR FIRST, then call 911 if still alone. Restoring oxygenation matters more than EMS dispatch in the first 2 minutes for kids who arrested from drowning.' },
          { id: 3, scenario: 'Someone has a deep cut on their thigh. Bright red blood is gushing — visible pumping with their heartbeat. They are conscious.', correct: 'pressure',
            why: 'Pulsing bright red = arterial bleed. First action is direct pressure with whatever cloth is at hand. Tourniquet only if pressure cannot stop the bleed within ~5 minutes. Call 911 next, but pressure first to stop blood loss.' },
          { id: 4, scenario: 'A friend at dinner suddenly stands up, hands clutching their throat. They cannot speak, cough, or breathe. Eyes wide, panicked.', correct: 'heimlich',
            why: 'Universal choking sign + complete airway obstruction = abdominal thrusts immediately. Time matters — brain damage starts in 4–6 minutes without oxygen. Do not slap their back if they are conscious and standing — current AHA guidance is abdominal thrusts first for adults.' },
          { id: 5, scenario: 'You have been doing CPR on an adult cardiac arrest for 90 seconds. A bystander runs over with an AED, already unboxed, pads ready. The patient still has no pulse.', correct: 'aed',
            why: 'AED FIRST as soon as it is available and pads are ready. Defibrillation within the first 3–5 minutes after collapse is the single most powerful intervention for adult cardiac arrest. Pause compressions only as long as the AED needs to analyze + shock; resume immediately after.' },
          { id: 6, scenario: 'A student just had a 90-second seizure. The seizure has stopped. They are now breathing normally on their own but are still unconscious. No injuries from the fall.', correct: 'recovery',
            why: 'Post-seizure (postictal) phase. Breathing is normal — no CPR needed. Place in recovery position to keep airway open and prevent aspiration if they vomit. Stay with them, monitor breathing. Most seizures do NOT require 911 unless: lasts >5 min, second seizure, injury, first-ever, or pregnancy/diabetes.' },
          { id: 7, scenario: 'A neighbor is suddenly slurring their speech. The right side of their face is drooping. They cannot lift their right arm. Symptoms started 15 minutes ago.', correct: 'callEMS',
            why: 'FAST-positive (Face, Arm, Speech, Time) = stroke until proven otherwise. This is the most time-critical call in adult medicine — every minute of delay = ~2 million neurons lost. Get EMS dispatched NOW. Do not drive them yourself; ambulance can pre-notify the stroke team.' },
          { id: 8, scenario: 'An adult is clutching their chest, sweating, pale. They say they have crushing chest pain that has lasted 20 minutes and is radiating to their left arm.', correct: 'callEMS',
            why: 'Classic heart attack presentation. Call 911 FIRST. Aspirin (chewed, not swallowed) is appropriate next step if no allergy and EMS confirms — but EMS dispatch is first. Time = muscle for a heart in this state.' },
          { id: 9, scenario: 'You find an unresponsive adult slumped against a wall. Their breathing is regular and slow. No injuries you can see. No medication bottles around.', correct: 'recovery',
            why: 'Unresponsive but BREATHING normally. CPR is not needed. Recovery position protects the airway. Call 911 next — unresponsiveness in an otherwise healthy adult needs medical evaluation (overdose, stroke, hypoglycemia, post-seizure are all possibilities).' },
          { id: 10, scenario: 'An adult with known asthma is having a severe attack. They cannot speak in full sentences. Their inhaler is empty. They are still conscious, sitting forward, working hard to breathe.', correct: 'callEMS',
            why: 'Severe asthma + unable to speak full sentences + empty rescue inhaler = imminent respiratory failure. Call 911 first; EMS carries albuterol nebulizers and steroids. Help them sit upright, leaning slightly forward (the position they instinctively chose). Do not have them lie down.' }
        ];

        // State
        var faIdx = d.faIdx == null ? -1 : d.faIdx;
        var faSeed = d.faSeed || 1;
        var faAnswered = !!d.faAnswered;
        var faPick = d.faPick;
        var faScore = d.faScore || 0;
        var faRounds = d.faRounds || 0;
        var faStreak = d.faStreak || 0;
        var faBest = d.faBest || 0;
        var faShown = d.faShown || [];

        function nextRound() {
          var pool = [];
          for (var i = 0; i < VIGNETTES.length; i++) if (faShown.indexOf(i) < 0) pool.push(i);
          if (pool.length === 0) { pool = []; for (var j = 0; j < VIGNETTES.length; j++) pool.push(j); faShown = []; }
          var seedNext = ((faSeed * 16807 + 11) % 2147483647) || 7;
          var pick = pool[seedNext % pool.length];
          upd('faSeed', seedNext);
          upd('faIdx', pick);
          upd('faAnswered', false);
          upd('faPick', null);
          upd('faShown', faShown.concat([pick]));
        }
        function answer(actionId) {
          if (faAnswered) return;
          var v = VIGNETTES[faIdx];
          var correct = actionId === v.correct;
          var newScore = faScore + (correct ? 1 : 0);
          var newStreak = correct ? (faStreak + 1) : 0;
          var newBest = Math.max(faBest, newStreak);
          upd('faAnswered', true);
          upd('faPick', actionId);
          upd('faScore', newScore);
          upd('faRounds', faRounds + 1);
          upd('faStreak', newStreak);
          upd('faBest', newBest);
          // ── Mastery: per-vignette first-correct log ──
          // Per-attempt streak/score reset between sessions; mastery sticks.
          // First correct on a given vignette fires a celebration overlay.
          if (correct) {
            var prevMastery = (d.faMastery && typeof d.faMastery === 'object') ? d.faMastery : {};
            var existingEntry = prevMastery[v.id];
            var nowIso = new Date().toISOString();
            var nextMastery = Object.assign({}, prevMastery);
            if (existingEntry) {
              nextMastery[v.id] = Object.assign({}, existingEntry, {
                lastCorrectAt: nowIso,
                correctCount: (existingEntry.correctCount || 0) + 1
              });
            } else {
              var actionInfo = ACTIONS.filter(function (a) { return a.id === v.correct; })[0] || { label: v.correct, icon: '✓' };
              nextMastery[v.id] = {
                firstCorrectAt: nowIso,
                lastCorrectAt: nowIso,
                correctCount: 1,
                action: v.correct,
                actionLabel: actionInfo.label,
                actionIcon: actionInfo.icon
              };
              try {
                setFrCeleb({
                  vignetteId: v.id,
                  scenario: v.scenario,
                  action: v.correct,
                  actionLabel: actionInfo.label,
                  actionIcon: actionInfo.icon,
                  total: Object.keys(nextMastery).length,
                  at: Date.now()
                });
                setTimeout(function () { setFrCeleb(null); }, 3500);
              } catch (e) {}
              // Progressive scenario-mastery badges.
              var uniq = Object.keys(nextMastery).length;
              if (uniq >= 5) awardBadge('fr_first_responder', 'First Responder (5 scenarios)');
              if (uniq >= 10) awardBadge('fr_master_responder', 'Master Responder (all 10)');
            }
            upd('faMastery', nextMastery);
          }
          frAnnounce(correct ? 'Correct: ' + (ACTIONS.filter(function(x) { return x.id === v.correct; })[0]).label : 'Not quite');
        }

        // Intro
        if (faIdx < 0) {
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('🎯 First Action Sleuth'),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 16, color: T.text } }, __alloT('stem.firstresponse.pick_the_first_action_10_vignettes', '🎯 Pick the FIRST action — 10 vignettes')),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                __alloT('stem.firstresponse.you_will_see_10_brief_emergency_vignet', 'You will see 10 brief emergency vignettes. For each, pick the first action from six options. After you pick, a coaching block names why this is the first action and what NOT to do first (the most-common confusion). This is decision-reflex practice — it does not substitute for hands-on certification.')),
              h('p', { style: { margin: 0, color: T.dim, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } },
                __alloT('stem.firstresponse.in_a_real_emergency_call_911_in_maine_', 'In a real emergency, call 911. In Maine, you can text 911 if you cannot speak.'))
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('div', { style: { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }, __alloT('stem.firstresponse.the_six_first_actions', 'The six first actions')),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                ACTIONS.map(function(a) {
                  return h('div', { key: a.id,
                    style: { padding: '8px 10px', borderRadius: 8, background: a.color + '15', border: '1px solid ' + a.color + '55' }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
                      h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, a.icon),
                      h('span', { style: { color: a.color, fontWeight: 800, fontSize: 12 } }, a.label)
                    ),
                    h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.45 } }, a.def)
                  );
                })
              )
            ),
            h('button', { 'data-fr-focusable': true,
              onClick: nextRound,
              style: btnPrimary({ width: '100%', textAlign: 'center', padding: '12px 18px' })
            }, __alloT('stem.firstresponse.start_vignette_1_of_10', '🎯 Start — vignette 1 of 10'))
          );
        }

        var v = VIGNETTES[faIdx];
        var pickedCorrect = faAnswered && faPick === v.correct;
        var pct = faRounds > 0 ? Math.round((faScore / faRounds) * 100) : 0;
        var allDone = faShown.length >= VIGNETTES.length && faAnswered;
        var correctAction = ACTIONS.filter(function(x) { return x.id === v.correct; })[0];
        var pickedAction = faPick ? ACTIONS.filter(function(x) { return x.id === faPick; })[0] : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🎯 First Action Sleuth'),
          // Score header
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12, color: T.muted, marginBottom: 12 } },
            h('span', null, __alloT('stem.firstresponse.vignette', 'Vignette '), h('strong', { style: { color: T.text } }, faShown.length)),
            h('span', null, __alloT('stem.firstresponse.score', 'Score '), h('strong', { style: { color: T.ok } }, faScore + ' / ' + faRounds)),
            faRounds > 0 && h('span', null, __alloT('stem.firstresponse.accuracy', 'Accuracy '), h('strong', { style: { color: T.link } }, pct + '%')),
            h('span', null, __alloT('stem.firstresponse.streak', 'Streak '), h('strong', { style: { color: T.warn } }, faStreak)),
            h('span', null, __alloT('stem.firstresponse.best', 'Best '), h('strong', { style: { color: T.accentHi } }, faBest))
          ),
          // The vignette
          h('section', { style: { padding: 16, borderRadius: 12, background: T.card, border: '2px solid ' + T.accent + '88', marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: T.accentHi, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, 'Vignette ' + faShown.length + ' of ' + VIGNETTES.length),
            h('p', { style: { margin: 0, color: T.text, fontSize: 14, lineHeight: 1.55 } }, v.scenario)
          ),
          // 6 action picker buttons
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }, role: 'radiogroup', 'aria-label': __alloT('stem.firstresponse.pick_the_first_action', 'Pick the first action') },
            ACTIONS.map(function(a) {
              var picked = faAnswered && faPick === a.id;
              var isRight = faAnswered && a.id === v.correct;
              var bg, border, color;
              if (faAnswered) {
                if (isRight) { bg = 'rgba(34,197,94,0.18)'; border = T.ok; color = '#bbf7d0'; }
                else if (picked) { bg = 'rgba(239,68,68,0.18)'; border = T.danger; color = '#fecaca'; }
                else { bg = T.cardAlt; border = T.border; color = T.dim; }
              } else {
                bg = a.color + '15'; border = a.color + '60'; color = T.text;
              }
              return h('button', { key: a.id, 'data-fr-focusable': true,
                role: 'radio',
                'aria-checked': picked ? 'true' : 'false',
                disabled: faAnswered,
                onClick: function() { answer(a.id); },
                style: { padding: '12px 14px', borderRadius: 10, background: bg, color: color, border: '2px solid ' + border, cursor: faAnswered ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, minHeight: 64, transition: 'all 0.15s' }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
                  h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, a.icon),
                  h('span', { style: { color: faAnswered ? color : a.color, fontSize: 13, fontWeight: 800 } }, a.label)
                ),
                h('div', { style: { fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: faAnswered ? color : T.muted } }, a.def)
              );
            })
          ),
          // Feedback
          faAnswered && h('section', {
            style: {
              marginTop: 14,
              padding: 14,
              borderRadius: 12,
              background: pickedCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)',
              border: '1px solid ' + (pickedCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.40)')
            }
          },
            h('div', { style: { fontSize: 14, fontWeight: 800, marginBottom: 6, color: pickedCorrect ? '#86efac' : '#fca5a5' } },
              pickedCorrect
                ? '✅ Correct — ' + correctAction.label
                : '❌ The first action is ' + correctAction.label + (pickedAction ? ' (you picked ' + pickedAction.label + ')' : '')
            ),
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, v.why),
            allDone
              ? h('div', { style: { padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: T.accentHi, marginBottom: 4 } }, __alloT('stem.firstresponse.all_10_vignettes_complete', '🏆 All 10 vignettes complete')),
                  h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.5 } },
                    'Final: ', h('strong', null, faScore + ' / ' + VIGNETTES.length + ' (' + Math.round((faScore / VIGNETTES.length) * 100) + '%)'),
                    faScore === VIGNETTES.length ? ' — every first action correct. The next step is hands-on certification with Red Cross or AHA.' :
                    faScore >= 8 ? ' — strong decision reflex. The most-confused pair is usually adult cardiac arrest (call first) vs pediatric drowning (CPR first) — different protocols for different etiologies.' :
                    faScore >= 6 ? ' — solid baseline. Re-read the rationales on misses; the call-911-first vs start-CPR-first distinction is the main reflex to build.' :
                    ' — these decisions take practice. Re-read the six action defs + each vignette rationale, then retake. Real certification (Red Cross, AHA) drills this until it is automatic.'
                  ),
                  h('button', { 'data-fr-focusable': true,
                    onClick: function() { upd('faIdx', -1); upd('faShown', []); upd('faScore', 0); upd('faRounds', 0); upd('faStreak', 0); },
                    style: Object.assign(btnPrimary({ marginTop: 10, padding: '8px 14px', fontSize: 12 }), {})
                  }, __alloT('stem.firstresponse.restart', '🔄 Restart'))
                )
              : h('button', { 'data-fr-focusable': true,
                  onClick: nextRound,
                  style: btnPrimary({ marginTop: 4, padding: '10px 16px', fontSize: 13 })
                }, __alloT('stem.firstresponse.next_vignette', '➡️ Next vignette'))
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // VIEW ROUTER
      // ─────────────────────────────────────────
      // ─────────────────────────────────────────
      // RESPONDER MASTERY VIEW
      // Cross-attempt log of First Action Sleuth vignettes the student has
      // answered correctly at least once. Mirrors the BirdLab life list /
      // PetsLab decoder mastery / OpticsLab / WeldLab pattern.
      // ─────────────────────────────────────────
      function renderResponderMastery() {
        var mastery = (d.faMastery && typeof d.faMastery === 'object') ? d.faMastery : {};
        var total = FA_VIGNETTE_INDEX.length;
        var doneVignettes = FA_VIGNETTE_INDEX.filter(function (v) { return !!mastery[v.id]; });
        var doneCount = doneVignettes.length;
        var pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
        function fmtDate(iso) {
          if (!iso) return '';
          try {
            var dd = new Date(iso);
            return dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } catch (e) { return iso.substring(0, 10); }
        }
        // Per-action rollup: how many of each first-action have been demonstrated.
        var actionCounts = {};
        Object.keys(mastery).forEach(function (vid) {
          var entry = mastery[vid];
          if (entry && entry.action) actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
        });
        var actionTotals = {};
        FA_VIGNETTE_INDEX.forEach(function (v) { actionTotals[v.correct] = (actionTotals[v.correct] || 0) + 1; });
        return h('div', { style: { padding: 20, maxWidth: 920, margin: '0 auto', color: T.text } },
          backBar('🏅 Responder Mastery'),
          // Hero
          h('div', { style: { padding: 18, borderRadius: 14, marginBottom: 14,
                              background: 'linear-gradient(135deg, ' + T.cardAlt + ' 0%, ' + T.card + ' 100%)',
                              border: '2px solid ' + T.accent } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' } },
              h('div', { style: { textAlign: 'center', minWidth: 110 } },
                h('div', { style: { fontSize: 38, fontWeight: 900, color: T.accentHi, lineHeight: 1 } }, doneCount + ' / ' + total),
                h('div', { style: { fontSize: 9, fontWeight: 800, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 } }, __alloT('stem.firstresponse.scenarios_mastered', 'Scenarios mastered'))
              ),
              h('div', { style: { flex: 1, minWidth: 240 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🏅'),
                  h('h3', { style: { margin: 0, fontSize: 17, color: T.text, fontWeight: 800 } }, __alloT('stem.firstresponse.responder_mastery_2', "Responder Mastery"))
                ),
                h('p', { style: { margin: '0 0 8px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                  __alloT('stem.firstresponse.every_first_action_sleuth_scenario_you', 'Every First Action Sleuth scenario you answer correctly at least once locks in here. Per-attempt streak resets between sessions; mastery sticks. Build coverage across all 10 scenarios — and across all 6 first actions — before you trust your reflex.')),
                h('div', { style: { height: 8, background: T.cardAlt, borderRadius: 4, overflow: 'hidden' }, 'aria-hidden': 'true' },
                  h('div', { style: { width: pct + '%', height: '100%', background: T.accent, transition: 'width 0.3s' } })
                ),
                h('div', { style: { fontSize: 10, color: T.dim, marginTop: 4, fontWeight: 700 } },
                  pct === 100 ? '🏆 All 10 scenarios mastered'
                  : doneCount === 0 ? 'Open First Action Sleuth to start building mastery'
                  : pct + '% complete · ' + (total - doneCount) + ' to go'
                )
              )
            )
          ),
          // Per-action breakdown
          h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 } }, __alloT('stem.firstresponse.first_action_coverage', 'First-action coverage')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
              FA_ACTIONS.map(function (a) {
                var done = actionCounts[a.id] || 0;
                var avail = actionTotals[a.id] || 0;
                if (avail === 0) return null;
                var aPct = avail > 0 ? Math.round((done / avail) * 100) : 0;
                return h('div', { key: a.id,
                  style: { padding: '8px 10px', borderRadius: 8,
                           background: a.color + (done > 0 ? '20' : '08'),
                           border: '1px solid ' + a.color + (done > 0 ? '88' : '33') }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 14 } }, a.icon),
                    h('span', { style: { color: a.color, fontWeight: 800, fontSize: 12 } }, a.label),
                    h('span', { style: { fontSize: 11, color: T.dim, marginLeft: 'auto', fontWeight: 700 } }, done + ' / ' + avail)
                  ),
                  h('div', { style: { height: 4, background: T.cardAlt, borderRadius: 2, overflow: 'hidden' }, 'aria-hidden': 'true' },
                    h('div', { style: { width: aPct + '%', height: '100%', background: a.color } })
                  )
                );
              })
            )
          ),
          // Per-scenario list
          h('section', null,
            h('h3', { style: { fontSize: 13, fontWeight: 800, margin: '0 0 8px', color: T.text } }, __alloT('stem.firstresponse.scenarios', 'Scenarios')),
            h('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 } },
              FA_VIGNETTE_INDEX.map(function (v) {
                var entry = mastery[v.id];
                var done = !!entry;
                var actionInfo = FA_ACTIONS.filter(function (a) { return a.id === v.correct; })[0] || { label: v.correct, icon: '✓', color: T.dim };
                return h('li', { key: v.id,
                  style: { display: 'flex', alignItems: 'flex-start', gap: 10,
                           padding: '10px 12px', borderRadius: 10,
                           background: done ? T.cardAlt : T.cardAlt,
                           border: '1px solid ' + (done ? actionInfo.color + '88' : T.border),
                           opacity: done ? 1 : 0.7 }
                },
                  h('span', { 'aria-hidden': 'true', style: { color: done ? T.ok : T.dim, fontSize: 18, flexShrink: 0, marginTop: 1 } }, done ? '✓' : '○'),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: done ? T.text : T.muted, marginBottom: 2 } },
                      'Scenario ' + v.id + ': ' + v.short
                    ),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: done ? T.muted : T.dim } },
                      h('span', { 'aria-hidden': 'true' }, actionInfo.icon),
                      h('span', { style: { color: actionInfo.color, fontWeight: 700 } }, actionInfo.label),
                      done && entry.firstCorrectAt && h('span', { style: { color: T.dim, marginLeft: 'auto', fontStyle: 'italic' } }, fmtDate(entry.firstCorrectAt))
                    )
                  )
                );
              })
            )
          ),
          h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.accent } },
            h('button', { 'data-fr-focusable': true,
              onClick: function () { updMulti({ view: 'firstAction', faIdx: -1, faAnswered: false, faPick: null, faShown: [] }); },
              style: btnPrimary({ width: '100%', textAlign: 'center' })
            }, doneCount === 0 ? '🎯 Open First Action Sleuth to start'
              : doneCount === total ? '🏆 All mastered — re-attempt to reinforce reflex'
              : '🎯 Keep going — fill in the remaining scenarios')
          )
        );
      }

      // First-correct celebration overlay (renders on top of any view).
      function frCelebOverlay() {
        if (!frCeleb) return null;
        return h('div', {
          role: 'status', 'aria-live': 'assertive',
          style: { position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
                   zIndex: 9999, pointerEvents: 'none',
                   animation: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'none' : 'firstresponse-celeb-rise 3.5s ease-out forwards', maxWidth: 480 }
        },
          h('div', { style: { background: 'linear-gradient(135deg, #dc2626 0%, #f59e0b 50%, #16a34a 100%)',
                              color: '#fff', padding: '14px 22px', borderRadius: 16,
                              boxShadow: '0 10px 30px rgba(0,0,0,0.35)', border: '4px solid #fff',
                              display: 'flex', alignItems: 'center', gap: 12 } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, frCeleb.actionIcon || '🎯'),
            h('div', null,
              h('div', { style: { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.95 } }, __alloT('stem.firstresponse.first_action_locked_in', 'First action locked in')),
              h('div', { style: { fontSize: 13, fontWeight: 800, lineHeight: 1.3 } }, 'Scenario ' + frCeleb.vignetteId + ' — ' + (frCeleb.actionLabel || 'correct')),
              h('div', { style: { fontSize: 11, fontStyle: 'italic', opacity: 0.95, marginTop: 2 } }, frCeleb.total + ' / ' + FA_VIGNETTE_INDEX.length + ' scenarios mastered')
            )
          )
        );
      }

      // Consent gate blocks every view EXCEPT 'resources' (emergencies always
      // need access to phone numbers, even from a fresh install).
      if (!consentAccepted && view !== 'resources') {
        return renderConsent();
      }
      var viewBody;
      switch (view) {
        case 'recognize':       viewBody = renderRecognize(); break;
        case 'call':            viewBody = renderCall(); break;
        case 'cprAed':          viewBody = renderCprAed(); break;
        case 'bleed':           viewBody = renderBleed(); break;
        case 'choking':         viewBody = renderChoking(); break;
        case 'disabilityAware': viewBody = renderDisabilityAware(); break;
        case 'scenarios':       viewBody = renderScenarios(); break;
        case 'firstAction':     viewBody = renderFirstActionSleuth(); break;
        case 'aiPractice':      viewBody = renderAiPractice(); break;
        case 'resources':       viewBody = renderResources(); break;
        case 'mastery':         viewBody = renderResponderMastery(); break;
        case 'decisionHunt':    viewBody = (function() {
          var iq = d.decisionHunt || { speed: 50, accuracy: 50, consistency: 50, recall: 50, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
          function setIQ(patch) { upd('decisionHunt', Object.assign({}, iq, patch)); }
          var readiness = (iq.speed * 0.2 + iq.accuracy * 0.3 + iq.consistency * 0.25 + iq.recall * 0.25) / 100;
          var state;
          if (readiness < 0.3) state = 'novice';
          else if (readiness < 0.55) state = 'developing';
          else if (readiness < 0.8) state = 'competent';
          else state = 'expert';
          var sm = {
            novice:     { label: __alloT('stem.firstresponse.novice_responder', '🌱 Novice responder'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', desc: __alloT('stem.firstresponse.build_foundational_recognition_first', 'Build foundational recognition first.') },
            developing: { label: __alloT('stem.firstresponse.developing', '🟡 Developing'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: __alloT('stem.firstresponse.practice_scenarios_build_automaticity', 'Practice scenarios; build automaticity.') },
            competent:  { label: __alloT('stem.firstresponse.competent', '🟢 Competent'), color: '#059669', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.firstresponse.reliable_in_familiar_situations', 'Reliable in familiar situations.') },
            expert:     { label: __alloT('stem.firstresponse.expert', '🌟 Expert'), color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', desc: __alloT('stem.firstresponse.calibrated_across_diverse_vignettes', 'Calibrated across diverse vignettes.') }
          }[state];
          var H = function(t, p, c) { return ctx.React.createElement.apply(null, arguments); };
          return H('div', { style: { padding: 20, maxWidth: 900, margin: '0 auto' } },
            H('button', { onClick: function() { upd('view', 'menu'); }, style: { padding: '6px 12px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6, fontSize: 11, cursor: 'pointer', marginBottom: 12 } }, '← Menu'),
            H('div', { style: { padding: 16, background: T.card, borderRadius: 10, color: T.text, border: '1px solid ' + T.border } },
              H('h3', { style: { fontSize: 14, fontWeight: 800, color: T.accent, margin: '0 0 6px 0' } }, '🧭 Decision-calibration discovery'),
              H('p', { style: { fontSize: 12, color: T.muted, marginBottom: 12 } }, 'Four sliders self-rate response capabilities. Discrete 4-state readiness + SVG capability heatmap. No score, no reveal.'),
              H('div', { style: { padding: 12, borderRadius: 8, textAlign: 'center', background: sm.bg, border: '2px solid ' + sm.border, marginBottom: 12 } },
                H('div', { style: { fontSize: 14, fontWeight: 900, color: sm.color } }, sm.label),
                H('div', { style: { fontSize: 11, color: '#475569', marginTop: 4 } }, sm.desc),
                H('div', { style: { fontSize: 10, color: '#64748b', marginTop: 4, fontFamily: 'monospace' } }, 'Readiness ' + (readiness * 100).toFixed(0) + '%')
              ),
              // SVG capability heatmap
              H('div', { style: { padding: 10, background: 'rgba(15,23,42,0.4)', borderRadius: 8, marginBottom: 12 } },
                H('svg', { viewBox: '0 0 280 80', style: { width: '100%', height: 80 } },
                  ['speed', 'accuracy', 'consistency', 'recall'].map(function(k, i) {
                    var val = iq[k];
                    var color = val > 75 ? '#059669' : (val > 50 ? '#d97706' : (val > 25 ? '#ea580c' : '#dc2626'));
                    return H('g', { key: 'h' + i },
                      H('rect', { x: 20 + i * 65, y: 20, width: 50, height: 40, fill: color, rx: 4, opacity: 0.3 + val / 150 }),
                      H('text', { x: 45 + i * 65, y: 45, textAnchor: 'middle', fontSize: 12, fontWeight: 'bold', fill: '#fff' }, val + '%'),
                      H('text', { x: 45 + i * 65, y: 72, textAnchor: 'middle', fontSize: 9, fill: '#94a3b8' }, k)
                    );
                  })
                )
              ),
              H('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 } },
                [{ k: 'speed', l: 'Response speed (%)' },
                 { k: 'accuracy', l: 'Action accuracy (%)' },
                 { k: 'consistency', l: 'Scenario consistency (%)' },
                 { k: 'recall', l: 'Critical-action recall (%)' }].map(function(s) {
                  return H('div', { key: s.k },
                    H('label', { htmlFor: 'dc-' + s.k, style: { display: 'block', fontSize: 11, fontWeight: 'bold', color: T.muted, marginBottom: 4 } }, s.l + ': ', H('span', { style: { color: T.accent, fontFamily: 'monospace' } }, iq[s.k])),
                    H('input', { id: 'dc-' + s.k, type: 'range', min: 0, max: 100, step: 5, value: iq[s.k],
                      onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                      style: { width: '100%' }, 'aria-label': s.l }));
                })
              ),
              H('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 } },
                H('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ sp: iq.speed, a: iq.accuracy, c: iq.consistency, r: iq.recall, st: state }]).slice(-8) }); }, style: { padding: '4px 10px', background: T.bg2 || '#1e293b', color: T.text, border: '1px solid ' + T.border, borderRadius: 4, fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '📋 Log'),
                H('button', { onClick: function() { setIQ({ speed: 50, accuracy: 50, consistency: 50, recall: 50, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, style: { padding: '4px 10px', background: 'transparent', color: T.muted, border: '1px solid ' + T.border, borderRadius: 4, fontSize: 11, cursor: 'pointer' } }, '↺ Reset')
              ),
              H('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.firstresponse.hypothesis_which_capability_matters_mo', 'Hypothesis: which capability matters most for first-aid response?'),
                style: { width: '100%', minHeight: 50, padding: 6, background: T.bg2 || '#1e293b', color: T.text, border: '1px solid ' + T.border, borderRadius: 4, fontSize: 12, fontFamily: 'monospace', marginBottom: 8 }, rows: 2 }),
              !iq.stuckRevealed && H('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '4px 10px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)', borderRadius: 4, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', marginBottom: 8 } }, '🤔 Stuck — open prompts'),
              iq.stuckRevealed && H('div', { style: { padding: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, fontSize: 11, color: T.text, marginBottom: 8 } },
                H('ul', { style: { margin: 0, paddingLeft: 18 } },
                  H('li', null, 'In real emergencies, what matters more: speed or accuracy?'),
                  H('li', null, 'Real EMTs run drills until response is automatic. Why?'))),
              H('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 'bold', color: '#34d399', cursor: 'pointer' } },
                H('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }), 'I understand — explain'),
              iq.understood && H('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.firstresponse.explain_readiness_composition', 'Explain readiness composition.'),
                style: { width: '100%', minHeight: 60, padding: 6, background: T.bg2 || '#1e293b', color: T.text, border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', marginTop: 6 }, rows: 3 }),
              H('div', { style: { marginTop: 8, fontSize: 10, fontStyle: 'italic', color: T.muted } }, 'Design note: discrete 4-state readiness marker; SVG capability map; no certification score — by design.')
            )
          );
        })(); break;
        case 'menu':
        default:                viewBody = renderMenu(); break;
      }
      return React.createElement(React.Fragment, null, frCelebOverlay(), viewBody);
      } catch(e) {
        console.error('[FirstResponse] render error', e);
        return ctx.React.createElement('div', { style: { padding: 16, color: '#fde2e2', background: '#7f1d1d', borderRadius: 8 } },
          'First Response Lab failed to render. ' + (e && e.message ? e.message : ''));
      }
    }
  });

})();

}  // end isRegistered guard
