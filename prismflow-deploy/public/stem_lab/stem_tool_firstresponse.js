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

  window.StemLab.registerTool('firstResponse', {
    name: 'First Response Lab',
    icon: '🚑',
    category: 'life-skills',
    description: 'Recognize and respond to medical emergencies. Hands-only CPR rhythm trainer, AED walkthrough, Stop the Bleed, choking, seizure, stroke, anaphylaxis. Disability-affirming peer response. Maine 911 + text-to-911. Educational only — get certified at redcross.org or heart.org.',
    tags: ['first-aid', 'cpr', 'aed', 'emergency', 'safety', 'life-skills', 'maine', 'disability-affirming'],

    render: function(ctx) {
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

      // ── State schema (defaults for first launch) ──
      var view = d.view || 'menu';
      var consentAccepted = !!d.consentAccepted;
      var modulesVisited = d.modulesVisited || {};
      var quizResults = d.quizResults || {};
      var badges = d.badges || {};
      var quizState = d.quizState || { idx: 0, score: 0, answered: false, lastChoice: null };

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
        bg: '#0f172a', card: '#1e293b', cardAlt: '#0b1426', border: '#334155',
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
          h('div', { role: 'region', 'aria-label': 'First Response Lab consent and educational scope',
            style: { background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 14, padding: 24 } },
            h('h2', { style: { margin: '0 0 12px', fontSize: 22, color: '#fde2e2' } },
              '🚑 First Response Lab is an EDUCATIONAL tool.'),
            h('p', { style: { margin: '0 0 12px', color: '#fde2e2', lineHeight: 1.55 } },
              'It teaches you to ',
              h('strong', null, 'recognize'),
              ' medical emergencies and ',
              h('strong', null, 'what to do'),
              '. It is ',
              h('strong', null, 'NOT'),
              ' a substitute for hands-on certification.'),
            h('p', { style: { margin: '0 0 12px', color: '#fde2e2', lineHeight: 1.55 } },
              'To get certified, take a course with the ',
              h('a', { href: 'https://www.redcross.org/take-a-class', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'American Red Cross'),
              ', the ',
              h('a', { href: 'https://cpr.heart.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'American Heart Association'),
              ', or your local ',
              h('a', { href: 'https://www.maine.gov/ems', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'Maine EMS'),
              ' chapter.'),
            h('p', { style: { margin: '0 0 16px', color: '#fde2e2', lineHeight: 1.55 } },
              h('strong', null, 'In a real emergency, call 911.'),
              ' In Maine, you can ',
              h('strong', null, 'text 911'),
              ' if you cannot speak.'),
            h('button', { 'data-fr-focusable': true,
              'aria-label': 'I understand. Show me the lab.',
              onClick: function() {
                updMulti({ consentAccepted: true, consentDate: new Date().toISOString(), view: 'menu' });
                awardBadge('first_responder_in_training', 'First Responder in Training');
                frAnnounceUrgent('Consent accepted. Welcome to First Response Lab.');
              },
              style: { padding: '12px 22px', borderRadius: 10, border: 'none', background: '#fff', color: '#7f1d1d', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
            }, 'I understand — show me the lab')
          ),
          h('p', { style: { marginTop: 14, fontSize: 12, color: T.dim, fontStyle: 'italic' } },
            'Acknowledging this screen is a one-time gate. Your acknowledgment is saved with your profile so you do not see it again.')
        );
      }

      // ─────────────────────────────────────────
      // PERSISTENT BANNER (shown above every clinical view)
      // ─────────────────────────────────────────
      function emergencyBanner() {
        return h('div', { role: 'region', 'aria-label': 'Emergency reminder',
          style: { margin: '0 0 14px', padding: '10px 14px', borderRadius: 10, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h('span', { 'aria-hidden': 'true' }, '🚑'),
          h('span', null,
            h('strong', null, 'In a real emergency: call 911'),
            ' — in Maine you can text 911. This tool is educational only.')
        );
      }

      // ─────────────────────────────────────────
      // DISCLAIMER FOOTER (renders below every clinical content view)
      // ─────────────────────────────────────────
      function disclaimerFooter() {
        return h('div', { role: 'contentinfo', 'aria-label': 'Educational disclaimer',
          style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55 } },
          'Educational only. Real emergencies → ',
          h('strong', { style: { color: T.accentHi } }, '911'),
          '. Get certified → ',
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
        { id: 'recognize', icon: '👁️', label: 'Recognize', desc: 'Visual signs of 12 emergencies. Quiz at the end.', ready: true },
        { id: 'call', icon: '📞', label: 'Call (911 + 988)', desc: 'What to say. Text-to-911. When 988 vs 911.', ready: true },
        { id: 'cprAed', icon: '❤️', label: 'CPR + AED', desc: 'Hands-only rhythm trainer. AED walkthrough.', ready: true },
        { id: 'bleed', icon: '🩸', label: 'Stop the Bleed', desc: 'Pressure → packing → tourniquet.', ready: true },
        { id: 'choking', icon: '😬', label: 'Choking', desc: 'Infant, child, adult, pregnant, alone.', ready: true },
        { id: 'disabilityAware', icon: '♾️', label: 'Disability-aware response', desc: 'Deaf/HoH, autistic, epilepsy, hidden disability.', ready: true },
        { id: 'scenarios', icon: '🎭', label: 'Scenario sim', desc: 'Multi-step branching emergency decisions.', ready: true },
        { id: 'aiPractice', icon: '🤖', label: 'AI Practice', desc: 'Novel scenes — you write the response, AI critiques.', ready: true },
        { id: 'resources', icon: '📚', label: 'Resources', desc: 'Every org cited in this tool. Tap to call or visit.', ready: true }
      ];

      function renderMenu() {
        var visitedCount = Object.keys(modulesVisited).length;
        return h('div', { style: { padding: 20, maxWidth: 960, margin: '0 auto', color: T.text } },
          emergencyBanner(),
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 } },
            h('h2', { style: { margin: 0, fontSize: 22 } }, '🚑 First Response Lab'),
            h('div', { style: { fontSize: 12, color: T.dim } },
              'Modules visited: ',
              h('strong', { style: { color: T.text } }, visitedCount + ' / 9'))
          ),
          h('p', { style: { margin: '0 0 16px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Pick a module. Start with ',
            h('strong', { style: { color: T.text } }, 'Recognize'),
            ' if you are new — every other module assumes you can spot the emergency first.'),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
            MENU_TILES.map(function(tile) {
              var visited = !!modulesVisited[tile.id];
              var isReady = tile.ready;
              return h('button', { key: tile.id, role: 'listitem',
                'data-fr-focusable': true,
                disabled: !isReady,
                'aria-label': tile.label + (visited ? ' (visited)' : '') + (!isReady ? ' (coming soon)' : ''),
                onClick: function() {
                  if (!isReady) return;
                  upd('view', tile.id);
                  markVisited(tile.id);
                  frAnnounce('Opening ' + tile.label);
                },
                style: btn({
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  padding: 14, minHeight: 110,
                  background: isReady ? T.card : T.cardAlt,
                  opacity: isReady ? 1 : 0.55, cursor: isReady ? 'pointer' : 'not-allowed',
                  borderColor: visited ? T.ok : T.border
                })
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, tile.icon),
                  h('span', { style: { fontWeight: 700, fontSize: 15, flex: 1 } }, tile.label),
                  visited && h('span', { 'aria-hidden': 'true', style: { color: T.ok, fontSize: 14 } }, '✓'),
                  !isReady && h('span', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic' } }, 'Soon')
                ),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.45 } }, tile.desc)
              );
            })
          ),
          // Badge tray
          Object.keys(badges).length > 0 && h('div', { style: { marginTop: 18, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 } }, '🏅 Badges earned'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(badges).map(function(bid) {
                return h('span', { key: bid,
                  style: { fontSize: 11, padding: '4px 10px', borderRadius: 999, background: '#1e3a8a', color: '#dbeafe', border: '1px solid #1e40af' } },
                  badges[bid].label || bid);
              })
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // BACK BUTTON (returns to menu)
      // ─────────────────────────────────────────
      function backBar(title) {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
          h('button', { 'data-fr-focusable': true,
            'aria-label': 'Back to First Response Lab menu',
            onClick: function() { upd('view', 'menu'); frAnnounce('Back to menu'); },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, '← Menu'),
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
              'These are the ',
              h('strong', { style: { color: T.text } }, 'recognition cues'),
              ' — what you would actually see. Tap a card for the first action at your grade band (',
              h('strong', { style: { color: T.text } }, gradeBand.toUpperCase()),
              '). Sources cited on each card.'),
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
                    h('strong', null, 'First action: '), firstText),
                  h('div', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic' } },
                    'Source: ', card.source)
                );
              })
            ),
            h('div', { style: { marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Start the 5-question recognition quiz',
                onClick: function() {
                  updMulti({ recognizeView: 'quiz', quizState: { idx: 0, score: 0, answered: false, lastChoice: null } });
                  frAnnounce('Quiz started. Question 1 of 5.');
                },
                style: btnPrimary()
              }, '🎯 Take the 5-question quiz'),
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Go to Resources tab',
                onClick: function() { upd('view', 'resources'); markVisited('resources'); },
                style: btn()
              }, '📚 Resources')
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
          return h('div', { role: 'region', 'aria-label': 'Quiz results',
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
                'aria-label': 'Retake the recognition quiz',
                onClick: function() {
                  updMulti({ quizState: { idx: 0, score: 0, answered: false, lastChoice: null }, lastQuizResult: null });
                  frAnnounce('Quiz restarted. Question 1 of 5.');
                },
                style: btn()
              }, '↺ Retake'),
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Back to recognize cards',
                onClick: function() { upd('recognizeView', 'cards'); frAnnounce('Back to recognize cards'); },
                style: btn()
              }, '← Back to cards'),
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Back to menu',
                onClick: function() { upd('view', 'menu'); frAnnounce('Back to menu'); },
                style: btnPrimary()
              }, '→ Menu')
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
            h('div', { style: { fontSize: 12, color: T.dim } }, 'Question ', (qs.idx + 1), ' of ', RECOGNIZE_QUIZ.length),
            h('div', { style: { fontSize: 12, color: T.muted } }, 'Score: ', qs.score)
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 30 } }, q.icon),
            h('p', { style: { margin: 0, color: T.text, fontSize: 14, lineHeight: 1.55 } }, q.stem)
          ),
          h('div', { role: 'group', 'aria-label': 'Answer choices',
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🤔 Which line do I call?'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Pick the situation that fits. Calling the wrong line is rarely a disaster — but knowing the right one helps.'),
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
              picked && h('div', { role: 'region', 'aria-label': 'Recommended line for selected situation',
                style: { marginTop: 12, padding: 12, borderRadius: 10, background: '#064e3b', border: '1px solid ' + T.ok, color: '#d1fae5' } },
                h('div', { style: { fontSize: 12, opacity: 0.8, marginBottom: 4 } }, 'Call'),
                h('div', { style: { fontSize: 22, fontWeight: 800 } }, picked.line),
                h('div', { style: { fontSize: 12, marginTop: 6, lineHeight: 1.5 } }, picked.why)
              )
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('div', { style: { fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 In Maine'),
              h('div', { style: { marginBottom: 4 } }, MAINE_EMS.text911),
              h('div', { style: { marginBottom: 4 } }, MAINE_EMS.crisisRoute),
              h('div', null, MAINE_EMS.ruralEta)
            )
          );
        }

        function callTapToCall() {
          var lines = [
            { num: '911', label: 'Emergency (police / fire / EMS)', tel: '911' },
            { num: '988', label: 'Suicide & Crisis Lifeline', tel: '988' },
            { num: '741741', label: 'Crisis Text Line — text HOME', tel: null, sms: '741741', body: 'HOME' },
            { num: '1-800-222-1222', label: 'Poison Control', tel: '+18002221222' },
            { num: '1-800-950-NAMI', label: 'NAMI HelpLine (mental health support)', tel: '+18009506264' },
            { num: '1-877-565-8860', label: 'Trans Lifeline', tel: '+18775658860' },
            { num: '1-800-422-4453', label: 'Childhelp National Child Abuse Hotline', tel: '+18004224453' }
          ];
          return h('div', null,
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              'On a phone, tap a number to call. Save the ones you might need ahead of time.'),
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '📞 What to say to the 911 dispatcher'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Say it in this order. Location FIRST so help can roll even if your call drops.'),
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '💬 Text-to-911 (Maine)'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Use text-to-911 if you’re deaf/HoH, can’t speak safely, or have a speech disability. Maine supports it statewide; check coverage at ',
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
                'aria-label': 'Mark Call module complete',
                onClick: function() { awardBadge('caller', 'Caller (knows what to say)'); },
                style: btnPrimary()
              }, '✓ I’ve practiced the script')
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📞 Call (911 + 988)'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': 'Call module sections',
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, '❤️ Hands-only CPR'),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, 'For untrained bystanders'),
                ': hands-only CPR (no breaths) is what AHA recommends for adults who collapse suddenly. It works.'),
              h('ol', { style: { margin: '0 0 0 18px', color: T.muted, fontSize: 13, lineHeight: 1.7 } },
                h('li', null, h('strong', { style: { color: T.text } }, 'Check'), ' — shake & shout. No response? Not breathing normally?'),
                h('li', null, h('strong', { style: { color: T.text } }, 'Call 911'), ' (or have someone else call). Send another person for an AED.'),
                h('li', null, h('strong', { style: { color: T.text } }, 'Push hard, push fast'), ' — center of chest, ',
                  h('span', { style: { color: T.accentHi } }, '2 inches deep'), ', at ',
                  h('span', { style: { color: T.accentHi } }, '100–120 bpm'), '.'),
                h('li', null, h('strong', { style: { color: T.text } }, 'Don’t stop'), ' until EMS takes over, AED tells you to clear, or person starts breathing.'),
                h('li', null, h('strong', { style: { color: T.text } }, 'Use the AED'), ' as soon as it arrives — it talks you through it.')
              ),
              h('div', { style: { marginTop: 10, padding: '8px 10px', borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                'Depth: 2 in (5 cm) adult, ~1.5 in (4 cm) child, ~1.5 in (4 cm) infant. Source: AHA 2020 Guidelines for CPR & ECC.')
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, '⚡ AED in one paragraph'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                'AEDs are designed for untrained people. Turn it on. ',
                h('strong', { style: { color: T.text } }, 'It will talk you through every step.'),
                ' It will not shock someone who doesn’t need it — it analyzes the heart rhythm first. ',
                h('strong', { style: { color: T.accentHi } }, 'Use it.'),
                ' Many AEDs also show visual prompts on a screen for deaf and hard-of-hearing rescuers.')
            ),
            h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Open CPR rhythm metronome',
                onClick: function() { upd('cprView', 'metronome'); frAnnounce('Metronome'); },
                style: btnPrimary()
              }, '🥁 Metronome (100–120 bpm)'),
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Practice CPR rhythm — 30 second window',
                onClick: function() { upd('cprView', 'practice'); frAnnounce('Practice mode'); },
                style: btn()
              }, '⏱️ Practice (30 sec)'),
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Walk through using an AED',
                onClick: function() { upd('cprView', 'aed'); frAnnounce('AED walkthrough'); },
                style: btn()
              }, '⚡ AED walkthrough')
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
                transform: 'scale(' + pulseScale().toFixed(3) + ')',
                transition: 'transform 80ms ease-out',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, color: '#fff', fontWeight: 800,
                boxShadow: '0 0 40px rgba(220,38,38,0.45)'
              } }, '❤'),
              h('div', { 'aria-live': 'off', style: { fontSize: 36, fontWeight: 800, color: T.text, marginBottom: 4 } }, bpm + ' bpm'),
              h('div', { style: { fontSize: 12, color: T.muted, marginBottom: 8 } }, 'Beats counted: ', beat),
              // Visual rhythm strip — last 16 beats as pulsing dots that fade.
              // Pairs with the audio metronome so deaf/hard-of-hearing rescuers
              // see the rhythm too.
              h('div', { 'aria-hidden': 'true',
                style: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 14, minHeight: 16 }
              },
                Array.from({ length: 16 }, function(_, i) {
                  // The freshest dot is the rightmost; index 0 is oldest.
                  var age = 15 - i; // 0 = newest
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
                  'aria-label': 'Reset bpm to 110',
                  onClick: function() { upd('cprBpm', 110); },
                  style: btn({ padding: '6px 12px', fontSize: 12 })
                }, 'Reset to 110')
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Tip:'),
              ' ',
              h('em', null, 'Stayin’ Alive'),
              ' is ~104 bpm. ',
              h('em', null, 'Baby Shark'),
              ' is ~115 bpm. ',
              h('em', null, 'Mr. Brightside'),
              ' is ~148 bpm — too fast. Audio is OFF by default; enable if it helps you keep time.')
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '⏱️ Practice (30-second window)'),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                'Tap the big button in rhythm — like you would push on someone’s chest. Aim for ',
                h('strong', { style: { color: T.accentHi } }, '100–120 bpm'),
                '. The metronome above gives you the target sound/visual.'),
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
                    boxShadow: practiceRunning ? '0 0 24px rgba(220,38,38,0.45)' : 'none'
                  }
                }, practiceRunning ? 'TAP' : '— off —')
              ),
              h('div', { style: { textAlign: 'center', fontSize: 14, color: T.muted, marginBottom: 8 } },
                practiceRunning
                  ? h('span', null,
                      h('strong', { style: { color: inRange ? T.ok : T.warn } }, currentBpm + ' bpm'),
                      ' • ', Math.round(elapsedSec), 's / 30s • taps: ', taps.length)
                  : (practiceBest
                      ? h('span', null, 'Best: ', h('strong', { style: { color: T.text } }, practiceBest.rate + ' bpm'))
                      : 'Press Start, then tap with the rhythm.')
              ),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                !practiceRunning && h('button', { 'data-fr-focusable': true,
                  'aria-label': 'Start 30 second practice',
                  onClick: startPractice, style: btnPrimary()
                }, '▶ Start 30s'),
                practiceRunning && h('button', { 'data-fr-focusable': true,
                  'aria-label': 'Stop practice early',
                  onClick: stopPractice, style: btn()
                }, '■ Stop')
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              'You’re practicing rhythm only — depth (2 inches on an adult) and chest recoil also matter, and you can’t practice those on a screen. Get hands-on at ',
              h('a', { href: 'https://www.redcross.org/take-a-class', target: '_blank', rel: 'noopener', style: { color: T.link } }, 'redcross.org'),
              '.')
          );
        }

        function cprAed() {
          var aedStep = d.aedStep || 0;
          var aedShockBranch = d.aedShockBranch || null; // 'shock' or 'noshock'

          var STEPS = [
            { icon: '🟢', title: 'Step 1 — Turn it on',
              say: '"AED ON. Apply pads to bare chest as shown."',
              tip: 'Open the case. Press the green/power button. The AED starts giving voice prompts immediately. Visual prompts on the screen mirror them for deaf/HoH rescuers.' },
            { icon: '👕', title: 'Step 2 — Expose the chest',
              say: '"Apply pads to bare chest."',
              tip: 'Cut or tear off the shirt. If chest is wet — wipe dry. If hairy — most AEDs include a razor in the case. Remove medication patches. The pads go skin-to-skin.' },
            { icon: '📍', title: 'Step 3 — Place the pads',
              say: '"Place one pad on upper-right chest, one on lower-left side."',
              tip: 'The pads have a picture showing where they go. Adult: upper-right + lower-left ribs. Child <8 or <55 lbs: use child pads if available, or place one on chest and one on the back.' },
            { icon: '✋', title: 'Step 4 — Stand clear',
              say: '"Analyzing. Do not touch the patient."',
              tip: 'Loudly say "CLEAR!" so no one is touching the person. The AED is reading the heart rhythm. Takes 5–15 seconds.' },
            { icon: '⚡', title: 'Step 5 — Shock or no shock',
              say: aedShockBranch === 'shock' ? '"Shock advised. Stand clear. Press the flashing button now."' : (aedShockBranch === 'noshock' ? '"No shock advised. Begin CPR."' : '"Analyzing..."'),
              tip: 'Pick a branch below to see what happens for each.' },
            { icon: '🔁', title: 'Step 6 — Continue compressions',
              say: '"Begin CPR. Continue chest compressions. AED will re-analyze in 2 minutes."',
              tip: 'Whether shock or no shock — the AED will tell you to do CPR for 2 minutes, then it re-analyzes. Do not remove the pads. Keep going until EMS arrives.' }
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
                }, '⚡ "Shock advised"'),
                h('button', { 'data-fr-focusable': true,
                  'aria-pressed': aedShockBranch === 'noshock' ? 'true' : 'false',
                  onClick: function() { upd('aedShockBranch', 'noshock'); frAnnounce('No shock advised branch.'); },
                  style: btn({ background: aedShockBranch === 'noshock' ? '#064e3b' : T.card, color: aedShockBranch === 'noshock' ? '#d1fae5' : T.text, padding: '6px 12px', fontSize: 12 })
                }, '🚫 "No shock advised"')
              )
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
              h('div', { style: { fontSize: 12, color: T.dim } },
                'Step ', (aedStep + 1), ' of ', STEPS.length),
              h('div', { style: { display: 'flex', gap: 6 } },
                aedStep > 0 && h('button', { 'data-fr-focusable': true, 'aria-label': 'Previous step', onClick: prev, style: btn({ padding: '6px 12px', fontSize: 12 }) }, '← Back'),
                h('button', { 'data-fr-focusable': true, 'aria-label': 'Reset to first step', onClick: reset, style: btn({ padding: '6px 12px', fontSize: 12 }) }, 'Reset'),
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
          h('div', { role: 'tablist', 'aria-label': 'CPR + AED sections',
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
          { num: 1, icon: '✋', name: 'Direct pressure',
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
          { num: 2, icon: '🧤', name: 'Wound packing',
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
          { num: 3, icon: '🩹', name: 'Tourniquet',
            short: 'Limbs only. 2–3" above wound. Note time.',
            detail: [
              h('strong', null, 'Limbs ONLY. NEVER on neck, head, torso, groin, or armpit.'),
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.text } }, '🩸 Life-threatening bleeding'),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, 'Recognize it: '),
                'spurting blood, blood pooling on the ground, blood that won’t stop after 5+ minutes of pressure, soaks through cloth fast. A person can bleed to death from a limb wound in ',
                h('strong', { style: { color: T.accentHi } }, 'as little as 3–5 minutes'),
                '.'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, 'The protocol: '),
                'Pressure → (if needed) Packing → (if needed) Tourniquet. Always start at step 1. Escalate only if the previous step isn’t working.')
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
                'aria-label': 'See detailed protocol with step-by-step instructions',
                onClick: function() { upd('bleedView', 'detail'); frAnnounce('Detailed protocol'); },
                style: btnPrimary()
              }, '📋 See detailed protocol'),
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'See where you can and cannot put a tourniquet',
                onClick: function() { upd('bleedView', 'tourniquet'); frAnnounce('Tourniquet placement'); },
                style: btn({ marginLeft: 8 })
              }, '🩹 Tourniquet placement')
            )
          );
        }

        function bleedDetail() {
          return h('div', null,
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              'Each step in detail. ',
              h('strong', { style: { color: T.text } }, 'Always start at step 1.'),
              ' Escalate only when the previous step isn’t working.'),
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
                  h('strong', { style: { color: T.text } }, 'Use when: '), s.when),
                h('div', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic' } }, 'Source: ', s.source)
              );
            }),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 13, lineHeight: 1.55, marginTop: 6 } },
              h('strong', null, '🌲 Maine reality: '),
              MAINE_EMS.ruralEta,
              ' That distance is why a tourniquet may be life-saving here where pressure alone might be enough in a city — EMS is closer there.'),
            h('div', { style: { marginTop: 12 } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Mark Stop the Bleed module complete',
                onClick: function() { awardBadge('bleed_stopped', 'Stop the Bleed (knows the protocol)'); },
                style: btnPrimary()
              }, '✓ I’ve learned the protocol'),
              h('a', { href: 'https://www.stopthebleed.org', target: '_blank', rel: 'noopener',
                'data-fr-focusable': true,
                style: Object.assign(btn({ marginLeft: 8, display: 'inline-block', textDecoration: 'none' }), { padding: '10px 16px' })
              }, 'Take a free course → stopthebleed.org')
            )
          );
        }

        function bleedTourniquet() {
          // Body-zone diagram: green = OK to tourniquet (limbs), red = NEVER.
          var ZONES = [
            { zone: 'Upper arm', ok: true, note: '2–3" above wound, between wound and shoulder.' },
            { zone: 'Forearm', ok: true, note: 'Above the elbow if wound is at/near elbow.' },
            { zone: 'Thigh', ok: true, note: '2–3" above wound, between wound and hip.' },
            { zone: 'Lower leg / shin', ok: true, note: 'Above the knee if wound is at/near knee.' },
            { zone: 'Neck', ok: false, note: 'NEVER. Pack the wound and apply pressure.' },
            { zone: 'Head / face', ok: false, note: 'NEVER. Direct pressure only.' },
            { zone: 'Chest / back / abdomen', ok: false, note: 'NEVER. Pack if you can; pressure; 911 fast.' },
            { zone: 'Armpit (axilla)', ok: false, note: 'Junctional — can’t tourniquet. Pack with gauze and apply pressure.' },
            { zone: 'Groin', ok: false, note: 'Junctional — can’t tourniquet. Pack with gauze and apply pressure with bodyweight.' }
          ];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🩹 Where can a tourniquet go?'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, 'Limbs only.'),
                ' Junctional wounds (neck, armpit, groin) and torso wounds need ',
                h('strong', { style: { color: T.text } }, 'wound packing'),
                ' instead — gauze deep into the wound, then heavy pressure.'),
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
              h('strong', { style: { color: T.text } }, 'Improvised tourniquet (no real one available): '),
              'a belt won’t tighten enough on its own — you need a windlass. Triangular bandage or a torn shirt strip wrapped around the limb, with a stick or pen as a windlass to twist tighter, then secure. Real tourniquets (CAT, SOFT-T) work better and are widely available — many schools and Stop the Bleed kits stock them.')
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🩸 Stop the Bleed'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': 'Stop the Bleed sections',
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
          { id: 'adult', icon: '🧑', label: 'Adult or child (1+ year)' },
          { id: 'child', icon: '🧒', label: 'Small child (1–8)' },
          { id: 'infant', icon: '👶', label: 'Infant (under 1 year)' },
          { id: 'pregnant', icon: '🤰', label: 'Pregnant person' },
          { id: 'alone', icon: '🆘', label: 'You — alone, choking' }
        ];

        var PROTOCOLS = {
          adult: {
            title: 'Adult or child (1+ year)',
            recognize: 'Universal sign: hands at throat, can’t cough, can’t speak, can’t breathe. Color may turn dusky/blue.',
            steps: [
              'Ask: "Are you choking?" If they nod or can’t answer — act.',
              'Stand behind them. Lean them slightly forward.',
              h('strong', null, '5 back blows '),
              'between the shoulder blades with the heel of your hand.',
              h('strong', null, '5 abdominal thrusts (Heimlich): '),
              'fist just above the navel, other hand over fist, quick inward + upward thrusts.',
              'Repeat 5+5 until the object comes out OR they go unconscious.',
              h('strong', null, 'If they go unconscious: '),
              'lower them safely to the ground, call 911, start CPR. Look in the mouth before each set of breaths and remove anything you see — do NOT do a blind finger sweep.'
            ],
            after: 'Even if the object comes out: they should see a doctor. Abdominal thrusts can cause internal injury.',
            source: 'Red Cross First Aid'
          },
          child: {
            title: 'Small child (1–8)',
            recognize: 'Same universal sign — hands at throat, silent, can’t breathe.',
            steps: [
              'Kneel behind them so you’re at their level.',
              h('strong', null, '5 back blows '),
              'between shoulder blades with the heel of your hand.',
              h('strong', null, '5 abdominal thrusts: '),
              'gentler than for an adult — fist just above the navel, brisk inward + upward.',
              'Repeat 5+5 until object dislodges or they’re unconscious.',
              'If unconscious: 911, start CPR.'
            ],
            after: 'See a doctor afterward — children’s organs are more vulnerable to thrust injury.',
            source: 'Red Cross First Aid'
          },
          infant: {
            title: 'Infant (under 1 year)',
            recognize: 'Can’t cry, can’t cough, weak/silent, color dusky. Different from a fussy baby — there is no sound.',
            steps: [
              h('strong', null, 'NEVER use abdominal thrusts on an infant.'),
              'Sit. Lay the baby face-DOWN along your forearm, head lower than body, supporting the jaw. Use your thigh as a brace.',
              h('strong', null, '5 back blows '),
              'between the shoulder blades with the heel of your hand. Firm but not violent.',
              'Flip the baby face-UP along your other forearm, head still low.',
              h('strong', null, '5 chest thrusts: '),
              'two fingers on the breastbone (just below the nipple line), 1.5 inches deep, slower than CPR (about 1 per second).',
              'Repeat 5+5 until object comes out or baby is unconscious.',
              'If unconscious: 911, start infant CPR.'
            ],
            after: 'Always seek medical care after a choking event in an infant.',
            source: 'Red Cross Pediatric First Aid'
          },
          pregnant: {
            title: 'Pregnant person',
            recognize: 'Same universal sign — hands at throat, can’t breathe.',
            steps: [
              h('strong', null, 'Use chest thrusts, NOT abdominal thrusts.'),
              'Stand behind them. Place your fist on the CENTER of the breastbone (sternum), not the abdomen.',
              h('strong', null, '5 chest thrusts: '),
              'pull straight back into the chest, sharp and quick.',
              'Same goes for anyone too large for you to wrap your arms around the abdomen.',
              'Repeat until object comes out or they’re unconscious.',
              'If unconscious: 911, start CPR.'
            ],
            after: 'Always see a doctor after — both for thrust injury risk and to check on the pregnancy.',
            source: 'Red Cross First Aid'
          },
          alone: {
            title: 'You — alone, choking',
            recognize: 'You can’t cough, can’t make sound. Don’t panic — you have a minute or so.',
            steps: [
              h('strong', null, 'Self abdominal thrusts. '),
              'Make a fist just above your navel. Other hand on top. Pull sharply inward and upward.',
              h('strong', null, 'OR use a chair back / counter / railing: '),
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '😬 Who is choking?'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                'The right technique depends on who. Pick one to see the protocol.'),
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
              'if the person is coughing forcefully, ',
              h('strong', { style: { color: T.text } }, 'don’t intervene'),
              ' — let them cough. Step in only when they ',
              h('em', null, 'can’t'),
              ' cough, can’t speak, or can’t breathe.')
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
                'aria-label': 'Pick a different person',
                onClick: function() { upd('chokeView', 'select'); frAnnounce('Pick someone else'); },
                style: btn()
              }, '← Pick someone else'),
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Mark choking module complete',
                onClick: function() { awardBadge('choking_responder', 'Choking Responder (knows all 5 cases)'); },
                style: btnPrimary()
              }, '✓ Got it')
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('😬 Choking'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': 'Choking module sections',
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 15 } }, '♾️ Why this module exists'),
              h('p', { style: { margin: '0 0 8px', fontSize: 13, lineHeight: 1.55 } },
                'Most first-aid courses don’t cover this: how disability shapes both ',
                h('strong', null, 'recognition'),
                ' (a peer’s seizure isn’t "weird behavior" — it’s a medical event) and ',
                h('strong', null, 'response'),
                ' (you can’t shout instructions to a Deaf patient).'),
              h('p', { style: { margin: 0, fontSize: 13, lineHeight: 1.55 } },
                'This module pulls from community-led orgs — ',
                h('a', { href: 'https://autisticadvocacy.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'ASAN'),
                ', ',
                h('a', { href: 'https://www.epilepsy.com', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'Epilepsy Foundation'),
                ', ',
                h('a', { href: 'https://www.hearingloss.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'HLAA'),
                ', ',
                h('a', { href: 'https://www.diabetes.org', target: '_blank', rel: 'noopener', style: { color: '#fff', fontWeight: 700 } }, 'ADA'),
                '. Where community preference is mixed (e.g. person-first vs identity-first language), this module follows the most common preference and notes it.')
            ),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              'Pick a section above. Each section is short — these are the things most adults don’t know either.')
          );
        }

        function daDeaf() {
          return card('👂 Communicating with a deaf or hard-of-hearing patient', [
            h('span', null, h('strong', null, 'Get their attention visually: '), 'wave in their line of sight, tap their shoulder. Don’t grab. Don’t shout — louder doesn’t help.'),
            h('span', null, h('strong', null, 'Face them directly'), ' so they can see your mouth and expressions. Good lighting on your face. Don’t cover your mouth.'),
            h('span', null, h('strong', null, 'Use the phone’s notes app'), ' to type questions. Most teens already do this.'),
            h('span', null, h('strong', null, 'Text-to-911 is the right call'), ' — Maine has it. Don’t call FOR them on a voice line if they want to text themselves.'),
            h('span', null, h('strong', null, 'Don’t assume ASL'), ' — many late-deafened or HoH people don’t sign. Ask their preferred way to communicate.'),
            h('span', null, h('strong', null, 'In a real emergency'), ', simple gestures + writing key words ("AMBULANCE COMING", "WHERE HURT?") often work faster than typing full sentences.'),
            h('span', null, h('strong', null, 'AEDs talk + show'), ' — modern AEDs display visual prompts on a screen for the rescuer. Use one even if no one in the room can hear the voice prompts.')
          ], 'Hearing Loss Association of America (hearingloss.org)', 'https://www.hearingloss.org');
        }

        function daAutism() {
          return h('div', null,
            card('♾️ Supporting an autistic peer in distress', [
              h('span', null, h('strong', null, 'Lower the sensory load: '), 'lights down if you can, fewer voices, fewer hands. A crowd of helpers can make a meltdown worse.'),
              h('span', null, h('strong', null, 'Predictable verbal warnings: '), '"I’m going to touch your wrist now" before you do. Touch without warning can escalate panic.'),
              h('span', null, h('strong', null, 'Short, literal sentences. '), 'Avoid figures of speech. "Sit down" is clearer than "take a load off."'),
              h('span', null, h('strong', null, 'Allow stims'), ' (rocking, hand-flapping, repeating words) — they’re self-regulation, NOT a symptom of the emergency.'),
              h('span', null, h('strong', null, 'Meltdown ≠ tantrum.'), ' A meltdown is involuntary nervous-system overload. Don’t threaten consequences. Reduce input and wait.'),
              h('span', null, h('strong', null, 'Look for a comm card / AAC device / scripted phrases'), ' the person may use. Many autistic people carry a card explaining their communication needs.'),
              h('span', null, h('strong', null, 'Don’t mistake autism for the medical emergency. '), 'A non-speaking autistic peer may be having a seizure or a panic attack — recognize THAT separately.')
            ], 'Autistic Self Advocacy Network (autisticadvocacy.org)', 'https://autisticadvocacy.org'),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Note: '),
              'this module uses identity-first language ("autistic person") because that is the majority preference in autistic-led communities. Some people and families prefer "person with autism." If you know someone’s preference, use it.')
          );
        }

        function daSeizure() {
          return card('⚡ Seizure first aid as epilepsy advocacy', [
            h('span', null, h('strong', null, 'A peer having a seizure is having a medical event'), ' — not "acting weird." Recognizing it as epilepsy (or another seizure cause) is the first thing.'),
            h('span', null, h('strong', null, 'TIME the seizure'), ' from when it starts. Most last under 2 minutes.'),
            h('span', null, h('strong', null, 'Move sharp things AWAY'), ' — chairs, desks, glasses. Don’t move the person unless they’re in immediate danger (water, road, fire).'),
            h('span', null, h('strong', null, 'Cushion the head '), '(jacket, backpack). Loosen anything around the neck.'),
            h('span', null, h('strong', null, 'DO NOT restrain'), ' — never hold them down or try to stop the movements.'),
            h('span', null, h('strong', null, 'DO NOT put anything in their mouth'), ' — old myth. They cannot swallow their tongue.'),
            h('span', null, h('strong', null, 'After: recovery position'), ' (on their side) so saliva can drain. They may be confused for several minutes — that’s normal. Stay with them.'),
            h('span', null, h('strong', null, 'Call 911 if: '), 'seizure is over 5 minutes, repeats without recovery in between, first-ever, in water, follows a head injury, or person is pregnant/diabetic/not breathing after.'),
            h('span', null, h('strong', null, 'Privacy after: '), 'a post-ictal person may be embarrassed. Clear gawkers. They get to choose what to share with classmates.')
          ], 'Epilepsy Foundation (epilepsy.com)', 'https://www.epilepsy.com/recognition');
        }

        function daDiabetes() {
          return card('🩺 Diabetic emergency — low vs high blood sugar', [
            h('span', null, h('strong', null, 'Low blood sugar (hypoglycemia) '), 'in a teen often looks like ',
              h('em', null, 'behavior change'),
              ' — irritable, confused, "off," shaky, sweaty, suddenly clumsy. Easy to mistake for being drunk or having an attitude.'),
            h('span', null, h('strong', null, 'If they CAN swallow safely: '),
              '15g fast carb — juice box, regular soda, glucose tab, a tablespoon of honey. Recheck in 15 minutes. Repeat if still low.'),
            h('span', null, h('strong', null, 'If they CANNOT swallow safely (slurring, confused, semi-conscious): '),
              'do NOT give food or liquid — choking risk. Glucagon if available. Call 911. Recovery position.'),
            h('span', null, h('strong', null, 'If unconscious: '),
              '911 immediately. Recovery position. NEVER pour juice into the mouth of an unconscious person.'),
            h('span', null, h('strong', null, 'High blood sugar (hyperglycemia / DKA) '),
              'in a peer with diabetes: extreme thirst, peeing constantly, fruity-acetone breath, deep rapid breathing, nausea/vomiting, confusion. ',
              h('strong', null, 'This is also a 911 emergency.'),
              ' Don’t give insulin unless they are managing it themselves and you’re just supporting.'),
            h('span', null, h('strong', null, 'Behavior changes in a peer you know has diabetes '),
              '— assume blood sugar first, attitude second. Ask "Have you checked? Can I get you juice?"')
          ], 'American Diabetes Association (diabetes.org)', 'https://www.diabetes.org');
        }

        function daHidden() {
          return card('👁️ Hidden disabilities + disclosure rights', [
            h('span', null, h('strong', null, 'You can’t see most disabilities'), ' — chronic illness, cardiac conditions, epilepsy, allergies, mental health, autism, ADHD, learning differences. A peer who looks "fine" may have a condition that matters in an emergency.'),
            h('span', null, h('strong', null, 'Look for medical ID jewelry'), ' (bracelet, necklace, dog tag, watch sticker, card in wallet). It often lists condition + emergency contact + critical med.'),
            h('span', null, h('strong', null, 'Phone medical ID: '),
              'iPhones and Androids both have a medical ID screen accessible from the lock screen — emergency responders can view condition + meds + emergency contacts without unlocking the phone. Look for "Emergency" or "SOS" on the lock screen.'),
            h('span', null, h('strong', null, 'Disclosure is THEIR choice. '),
              'Don’t tell other classmates / teachers / random adults a peer has a condition unless it’s necessary to keep them safe RIGHT NOW. To EMS, yes. To the lunchroom, no.'),
            h('span', null, h('strong', null, 'Ask, don’t assume: '),
              '"Is there anything I should know to help you?" gives them the chance to tell you if they want to. "Are you OK? You look weird" doesn’t.'),
            h('span', null, h('strong', null, 'Service dogs are working: '),
              'don’t pet, distract, or call to them. The handler is the only person who interacts with them in an emergency.')
          ], 'NAMI + American Diabetes Association', 'https://www.nami.org');
        }

        function daSelf() {
          return card('🤝 If YOU have a disability and want to help', [
            h('span', null, h('strong', null, 'You can do CPR with a limb difference'), ' — depth and rate matter most. You can use your hand differently, use your forearm, or partner up so someone else does compressions while you coach (you know the rate).'),
            h('span', null, h('strong', null, 'You can do CPR with low muscle tone or fatigue: '),
              'partner up. Switch every 2 minutes anyway — even adults without disabilities tire fast. The AHA recommends compressors swap every 2 minutes.'),
            h('span', null, h('strong', null, 'You can call 911 if you can’t speak: '),
              'use text-to-911 (Maine has it). You can leave a voice line open even silent — dispatchers can locate the call.'),
            h('span', null, h('strong', null, 'You can lead'), ' even if you can’t do compressions: assign tasks ("YOU call 911. YOU run for the AED in the gym. YOU clear people back."). Calm direction is real first aid.'),
            h('span', null, h('strong', null, 'Sensory overload during the emergency? '),
              'Step back, hands over ears, find a quieter spot. You don’t have to be the closest helper to be a helpful one. Coaching others through the protocol is a real role.'),
            h('span', null, h('strong', null, 'Practice ahead. '),
              'Knowing what you would do — your specific role, given what your body does — turns a freeze into a plan. That’s what this lab is for.')
          ], 'Synthesizes ASAN + AHA + Hartford Consensus guidance', null);
        }

        return h('div', { style: { padding: 20, maxWidth: 920, margin: '0 auto', color: T.text } },
          backBar('♾️ Disability-aware response'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': 'Disability-aware sections',
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
              'aria-label': 'Mark disability-aware module complete',
              onClick: function() { awardBadge('da_responder', 'Disability-Aware Responder'); },
              style: btnPrimary({ padding: '8px 14px', fontSize: 13 })
            }, '✓ I’ve read this module')
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
        { id: 'cafeteria', icon: '🍎', title: 'Cafeteria collapse',
          setup: 'Lunchtime. A student two tables over suddenly slumps forward, then slides off the bench onto the floor. They are not moving. People around them are screaming. You’re the closest peer who has First Response Lab training.',
          steps: [
            { situation: 'You reach them first. What do you do FIRST?',
              choices: [
                { text: 'Shake their shoulder firmly and shout "Are you OK?"', impact: 'help', feedback: 'Right. Check responsiveness before anything else. They might just have fainted and be coming around.', source: 'AHA BLS' },
                { text: 'Start chest compressions immediately.', impact: 'hurt', feedback: 'Compressions on someone whose heart is still beating can cause real injury. Always check first.', source: 'AHA BLS' },
                { text: 'Run to get a teacher.', impact: 'neutral', feedback: 'A teacher is needed soon, but leaving the patient alone wastes the most critical seconds. Send someone else.', source: 'AHA BLS' }
              ] },
            { situation: 'No response. They’re not breathing normally. Three other students are standing nearby looking at their phones.',
              choices: [
                { text: 'Yell "YOU — call 911. YOU — go to the front office for the AED. NOW."', impact: 'help', feedback: 'Pointing at specific people works — diffuse responsibility freezes a crowd. Now you can focus on the patient.', source: 'Hartford Consensus / bystander effect research' },
                { text: 'Yell "Someone call 911!" and start CPR.', impact: 'neutral', feedback: 'Better than nothing, but "someone" often means no one. Pointing at a specific person fixes that.', source: 'Hartford Consensus' },
                { text: 'Pull out your phone and call 911 yourself while standing up.', impact: 'hurt', feedback: 'You are the closest trained person. Delegate the call so you can start compressions in the next few seconds.', source: 'AHA BLS' }
              ] },
            { situation: 'You begin CPR. What rate?',
              choices: [
                { text: '100–120 compressions per minute, about the pace of "Stayin’ Alive."', impact: 'help', feedback: 'Exactly right. Push hard (2 inches deep on an adult), let the chest fully recoil between pushes.', source: 'AHA 2020 Guidelines' },
                { text: 'As fast as you can — speed saves lives.', impact: 'hurt', feedback: 'Too fast (>120 bpm) means shallow compressions and not enough time for the heart to refill between pushes. Aim for 100–120.', source: 'AHA 2020 Guidelines' },
                { text: 'Slow and steady, about 60 per minute.', impact: 'hurt', feedback: 'Too slow. The heart needs ~100–120 pushes per minute to circulate blood enough to keep the brain alive.', source: 'AHA 2020 Guidelines' }
              ] },
            { situation: 'The AED arrives. The student you sent says "I’ve never used one." What do you tell them?',
              choices: [
                { text: '"Turn it on. It will talk you through it. Listen and do exactly what it says."', impact: 'help', feedback: 'AEDs are designed for untrained users. Voice prompts (and visual prompts on most models) lead you through every step.', source: 'AHA / Red Cross AED training' },
                { text: '"Wait until I’m done with compressions, then I’ll do it."', impact: 'hurt', feedback: 'Every second without an AED on a shockable rhythm reduces survival. Have them set it up while you keep compressing.', source: 'AHA Chain of Survival' },
                { text: '"Forget it, just keep doing CPR."', impact: 'hurt', feedback: 'CPR alone has much lower survival than CPR + AED. Even an untrained person can run an AED — it talks them through it.', source: 'AHA Chain of Survival' }
              ] }
          ] },
        { id: 'hallway', icon: '🥪', title: 'Hallway choking',
          setup: 'Between classes, a friend takes a big bite of a sandwich and starts panicking. Their hands are at their throat. They’re not making noise. Their face is turning red.',
          steps: [
            { situation: 'What is the FIRST thing to confirm?',
              choices: [
                { text: 'Ask: "Are you choking?" Watch for a nod or thumbs-up.', impact: 'help', feedback: 'The universal sign is hands at the throat with no sound. Confirming gives them a chance to cough first if they still can.', source: 'Red Cross First Aid' },
                { text: 'Slap them hard on the back right away.', impact: 'neutral', feedback: 'Back blows ARE part of the protocol, but confirm they can’t cough first. If they’re coughing forcefully, let them cough.', source: 'Red Cross First Aid' },
                { text: 'Get them to drink water immediately.', impact: 'hurt', feedback: 'Don’t give a choking person water — it can go down the wrong way too. Don’t give anything by mouth.', source: 'Red Cross First Aid' }
              ] },
            { situation: 'They nod yes. Can’t cough, can’t breathe. What now?',
              choices: [
                { text: '5 back blows between the shoulder blades, then 5 abdominal thrusts. Repeat.', impact: 'help', feedback: 'Correct sequence. Lean them forward, heel of your hand between the shoulder blades.', source: 'Red Cross First Aid' },
                { text: '5 abdominal thrusts only.', impact: 'neutral', feedback: 'Abdominal thrusts work but pairing them with back blows is more effective. The current Red Cross protocol is 5 back blows + 5 thrusts.', source: 'Red Cross First Aid' },
                { text: 'Have them lie down on their back so you can do CPR.', impact: 'hurt', feedback: 'CPR is for unconscious patients. While they’re still conscious, do back blows + thrusts.', source: 'Red Cross First Aid' }
              ] },
            { situation: 'After two cycles, they go limp and fall to the floor.',
              choices: [
                { text: 'Lower them safely, call 911, start CPR. Look in the mouth before each set of breaths.', impact: 'help', feedback: 'Right. Once unconscious, CPR can dislodge the object on its own. Look in the mouth before breaths and remove anything you see — no blind finger sweeps.', source: 'AHA / Red Cross unconscious choking' },
                { text: 'Do a blind finger sweep down their throat.', impact: 'hurt', feedback: 'Never — you can push the object deeper. Look first, only remove what you can see.', source: 'AHA' },
                { text: 'Keep doing abdominal thrusts on them while they’re on the floor.', impact: 'hurt', feedback: 'Once unconscious, switch to CPR. Compressions can also help dislodge the object.', source: 'AHA' }
              ] }
          ] },
        { id: 'field', icon: '⚽', title: 'Sports field — severe bleeding',
          setup: 'During a soccer game, a player goes down hard after a collision with another player’s cleat. There’s a deep gash on their thigh and blood is spurting. The closest hospital is 20 minutes away.',
          steps: [
            { situation: 'You sprint over. What FIRST?',
              choices: [
                { text: 'Press both hands hard directly on the wound. Lean in with bodyweight.', impact: 'help', feedback: 'Direct pressure stops most bleeding. Your bodyweight gets the depth a hand alone can’t.', source: 'Stop the Bleed' },
                { text: 'Run to find the coach to grab the first-aid kit.', impact: 'hurt', feedback: 'Every second matters with arterial bleeding. Apply pressure NOW; have someone else run for the kit.', source: 'Stop the Bleed' },
                { text: 'Lift the leg up to "drain" the wound and check it.', impact: 'hurt', feedback: 'Don’t lift to peek. You break the clot you’re trying to form. Press and hold.', source: 'Stop the Bleed' }
              ] },
            { situation: 'Pressure helps but blood is still soaking through. The coach hands you a bleeding-control kit with a tourniquet.',
              choices: [
                { text: 'Place the tourniquet 2–3" ABOVE the wound on the thigh. Tighten until bleeding stops. Note the time.', impact: 'help', feedback: 'Limbs are the right place for a tourniquet. Above the wound, between wound and heart, not on a joint. Always note the time it was applied.', source: 'Stop the Bleed' },
                { text: 'Place the tourniquet ON the wound.', impact: 'hurt', feedback: 'Tourniquets go above the wound, between the wound and the heart. Putting it on the wound itself can damage tissue and won’t cut off the artery.', source: 'Stop the Bleed' },
                { text: 'Don’t use the tourniquet — just keep pressing harder.', impact: 'hurt', feedback: 'Pressure that isn’t controlling spurting bleeding from a limb is the textbook indication for a tourniquet. Use it.', source: 'Stop the Bleed / Hartford Consensus' }
              ] },
            { situation: 'EMS is 18 minutes out. Player is conscious but pale. What now?',
              choices: [
                { text: 'Stay with them. Keep them lying down, warm. Tell EMS the time the tourniquet went on.', impact: 'help', feedback: 'Right. Don’t loosen the tourniquet. Don’t let bystanders give them water. Time on tourniquet is the single most important fact for the ER.', source: 'Stop the Bleed' },
                { text: 'Loosen the tourniquet every couple minutes "to let blood flow."', impact: 'hurt', feedback: 'Never — once it’s on, it stays on until EMS or the ER takes over. Loosening can cause re-bleeding.', source: 'Stop the Bleed' },
                { text: 'Give them water and sit them up.', impact: 'hurt', feedback: 'Don’t give anything by mouth (they may need surgery). Keep them lying flat to maintain blood pressure to the brain.', source: 'Red Cross' }
              ] }
          ] },
        { id: 'classroom', icon: '⚡', title: 'Classroom seizure',
          setup: 'In second-period English, a classmate you know has epilepsy suddenly stiffens, falls out of their chair, and starts jerking on the floor. The teacher has stepped out of the room. People are filming on their phones.',
          steps: [
            { situation: 'You move toward them. What FIRST?',
              choices: [
                { text: 'Move sharp objects (chair legs, desk corners) away. Note the time it started.', impact: 'help', feedback: 'Right. Make the area safe and TIME the seizure. Most last under 2 minutes; over 5 is a 911 emergency.', source: 'Epilepsy Foundation' },
                { text: 'Hold their arms and legs down so they don’t hurt themselves.', impact: 'hurt', feedback: 'Never restrain someone having a seizure. You can cause serious injury. Move hazards away from THEM, not the other way.', source: 'Epilepsy Foundation' },
                { text: 'Try to put a pen in their mouth so they don’t bite their tongue.', impact: 'hurt', feedback: 'Old myth. Never put anything in someone’s mouth during a seizure. They cannot swallow their tongue. You can break their teeth or get bitten.', source: 'Epilepsy Foundation' }
              ] },
            { situation: 'About the kids filming on their phones:',
              choices: [
                { text: 'Tell them firmly to put the phones away — this is not for the internet.', impact: 'help', feedback: 'Right. Your classmate did not consent to being filmed during a medical event. Protect their dignity.', source: 'Epilepsy Foundation advocacy' },
                { text: 'Ignore them — focus on the seizure.', impact: 'neutral', feedback: 'Focus on the seizure first, but ask someone else to clear cameras. Their privacy matters too.', source: 'Epilepsy Foundation advocacy' },
                { text: 'Take a video yourself "for the doctor."', impact: 'hurt', feedback: 'Their family or doctor can request specific recordings if helpful — that’s their decision, not yours. Don’t add to the camera count.', source: 'Epilepsy Foundation advocacy' }
              ] },
            { situation: 'After about 90 seconds, the jerking stops. They’re breathing but groggy and confused.',
              choices: [
                { text: 'Roll them gently onto their side (recovery position). Stay with them. Speak calmly.', impact: 'help', feedback: 'Right. Recovery position lets saliva drain. The post-ictal phase can last 5–30 minutes — confusion is normal.', source: 'Epilepsy Foundation' },
                { text: 'Wake them up by splashing water on their face.', impact: 'hurt', feedback: 'Don’t. They’re recovering. Stay calm, talk softly, give them time.', source: 'Epilepsy Foundation' },
                { text: 'Walk away — the seizure is over.', impact: 'hurt', feedback: 'They need someone with them through the post-ictal phase. They may also need to know what just happened — they often don’t remember.', source: 'Epilepsy Foundation' }
              ] }
          ] },
        { id: 'busstop', icon: '🚌', title: 'Bus stop — diabetic emergency',
          setup: 'At the bus stop after school, a classmate you know has type 1 diabetes is acting strange. They’re sweating, slurring their words, and staring blankly. They look almost drunk. They tell you "I’m fine, leave me alone" but they’re shaky.',
          steps: [
            { situation: 'What do you suspect first?',
              choices: [
                { text: 'Low blood sugar (hypoglycemia). Check if they have juice or glucose tabs.', impact: 'help', feedback: 'In a peer with diabetes, behavior change + sweaty + shaky = low blood sugar until proven otherwise. They may not know how impaired they are.', source: 'American Diabetes Association' },
                { text: 'They’re drunk. Ignore them.', impact: 'hurt', feedback: 'Hypoglycemia in diabetics often LOOKS like being drunk. Mistaking it can be fatal. Always treat first when you’re not sure.', source: 'ADA' },
                { text: 'Call their parent first.', impact: 'neutral', feedback: 'A parent can help, but treating the low NOW matters more. Sugar first, phone call second.', source: 'ADA' }
              ] },
            { situation: 'They nod weakly. They have a juice box in their bag.',
              choices: [
                { text: 'Open it and help them sip it. Stay with them and recheck in 15 minutes.', impact: 'help', feedback: '15-15 rule: 15g fast carb (a juice box is ~15g), wait 15 min, recheck. Stay with them — they can crash again.', source: 'ADA' },
                { text: 'Make them eat a sandwich first — protein is better.', impact: 'hurt', feedback: 'When blood sugar is low, you need FAST carbs (juice, glucose tab, regular soda). Protein takes too long.', source: 'ADA' },
                { text: 'Give them their insulin pen.', impact: 'hurt', feedback: 'Never — insulin LOWERS blood sugar. They need sugar, not insulin.', source: 'ADA' }
              ] },
            { situation: '15 minutes later: still confused, can barely keep eyes open. Won’t reliably swallow.',
              choices: [
                { text: 'Call 911. Recovery position. Don’t put anything else in their mouth.', impact: 'help', feedback: 'Right. Choking risk is real if they can’t swallow safely. 911. They may need IV glucose or glucagon.', source: 'ADA' },
                { text: 'Pour more juice into their mouth — more sugar will help.', impact: 'hurt', feedback: 'Aspiration risk. Never pour liquid into the mouth of a barely-conscious person. 911.', source: 'ADA' },
                { text: 'Wait it out — give it more time.', impact: 'hurt', feedback: 'Severe hypoglycemia can lead to seizures, coma, brain damage. Don’t wait when they’re past the 15-minute mark and still impaired.', source: 'ADA' }
              ] }
          ] },
        { id: 'mh', icon: '💚', title: 'Mental health — peer in crisis',
          contentWarning: 'This scenario includes a peer expressing suicidal thoughts. If that is too heavy right now, you can skip it — pick another scenario or come back later. There is no penalty for sitting this one out.',
          setup: 'A friend texts you late at night: "I don’t know if I can keep doing this. I don’t want to be here anymore." They live across town. You’re alone in your room.',
          steps: [
            { situation: 'You read the text. What FIRST?',
              choices: [
                { text: 'Text back right now: "I’m here. I hear you. Tell me more."', impact: 'help', feedback: 'Showing up matters. Don’t lecture, don’t fix yet — just be present and listen. You can’t make someone more suicidal by asking.', source: '988 Lifeline / NAMI' },
                { text: 'Don’t respond — you don’t know what to say and you’re scared.', impact: 'hurt', feedback: 'Silence in this moment is the most dangerous thing. Even "I see you. I’m here." is a lifeline. You don’t need the right words.', source: 'QPR / NAMI' },
                { text: 'Screenshot it and post it to TikTok asking what to do.', impact: 'hurt', feedback: 'No. This is private. Posting it betrays trust and can escalate. Take the message to a trusted adult, not the internet.', source: 'NAMI peer support guidance' }
              ] },
            { situation: 'They text back: "I’ve been thinking about it for a while. I have a plan."',
              choices: [
                { text: 'Tell them you’re glad they trusted you. Ask if you can call 988 with them or if you can tell their parent / a trusted adult so they’re not alone tonight.', impact: 'help', feedback: 'A specific plan = high risk. Looping in an adult or 988 isn’t a betrayal — it’s the move. Ask their preference but make sure SOMEONE who can be physically present knows.', source: '988 Lifeline / NAMI' },
                { text: 'Promise you won’t tell anyone, ever, no matter what.', impact: 'hurt', feedback: 'Don’t promise this. Some things you can’t keep secret — a friend’s safety is one. You can promise to be there. You can’t promise silence.', source: 'NAMI peer support / school safe-messaging' },
                { text: 'Tell them to "just hang in there" and go to sleep.', impact: 'hurt', feedback: 'This dismisses the crisis. They told you because they need help RIGHT NOW. Stay engaged.', source: 'NAMI / SAMHSA' }
              ] },
            { situation: 'They’re scared their parents will be mad. What do you say?',
              choices: [
                { text: 'Tell them: "I know it feels that way. The grown-ups who matter will be relieved you said something. Want me to call with you, or call 988 first?"', impact: 'help', feedback: 'Acknowledge the fear. Offer to share the load. 988 counselors can help them figure out next steps and what to say to a parent.', source: '988 Lifeline' },
                { text: 'Tell them their parents won’t care.', impact: 'hurt', feedback: 'You don’t know that. Even if a relationship is hard, a crisis adult can step in (counselor, coach, aunt, neighbor). 988 helps figure out who.', source: 'NAMI' },
                { text: 'Wait until tomorrow to tell anyone — it’s late.', impact: 'hurt', feedback: 'A specific plan is a now problem, not a tomorrow problem. 988 is open 24/7. So is 911 if there’s immediate life threat.', source: '988 Lifeline' }
              ] },
            { situation: 'They agree to text 988 (HOME to 741741). What do YOU do next?',
              choices: [
                { text: 'Stay on the phone or text with them. Tell a trusted adult in your life what just happened — you need support too.', impact: 'help', feedback: 'Right. Don’t carry this alone. Hearing this from a friend is heavy — your own adult / counselor / parent can help you process. NAMI HelpLine: 1-800-950-NAMI.', source: 'NAMI peer support' },
                { text: 'Hang up and put your phone away — you handled it.', impact: 'hurt', feedback: 'You did show up — that matters. But staying connected and getting your own support afterward both matter. This is the kind of thing that lingers.', source: 'NAMI' },
                { text: 'Tell everyone at school tomorrow what happened.', impact: 'hurt', feedback: 'No. Their story is theirs. You can tell trusted adults who can help; you can’t tell the lunch table.', source: 'NAMI peer support' }
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
              'Each scenario is multiple steps. At each step, pick what you’d do — you’ll see whether it ',
              h('span', { style: { color: T.ok } }, 'helped'),
              ', was ',
              h('span', { style: { color: T.warn } }, 'neutral'),
              ', or ',
              h('span', { style: { color: T.danger } }, 'hurt'),
              ', and why. Sources cited per choice.'),
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
                  s.contentWarning && h('div', { style: { fontSize: 10, color: T.accentHi, fontStyle: 'italic' } }, '⚠️ content warning')
                );
              })
            )
          );
        }

        // ── Content warning dialog (mental-health scenario gate)
        function contentWarningDialog() {
          var cw = sc.contentWarning;
          return h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Content warning before mental health scenario',
            style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '2px solid ' + T.warn } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.warn } }, '⚠️ Content warning'),
            h('p', { style: { margin: '0 0 12px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, cw),
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'I understand. Start the scenario.',
                onClick: function() { upd('mhAcknowledged', true); pickScenario(sc.id); },
                style: btnPrimary()
              }, 'I understand — start'),
              h('button', { 'data-fr-focusable': true,
                'aria-label': 'Skip this scenario; pick a different one.',
                onClick: leaveScenario,
                style: btn()
              }, 'Skip — pick different')
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 18 } }, 'Scenario complete: ', sc.title),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 } },
                h('span', { style: { padding: '4px 10px', borderRadius: 999, background: '#064e3b', color: '#d1fae5', fontSize: 12, fontWeight: 700 } }, '✓ Helped: ' + (scenarioScore.help || 0)),
                h('span', { style: { padding: '4px 10px', borderRadius: 999, background: '#78350f', color: '#fde68a', fontSize: 12, fontWeight: 700 } }, '~ Neutral: ' + (scenarioScore.neutral || 0)),
                h('span', { style: { padding: '4px 10px', borderRadius: 999, background: '#7f1d1d', color: '#fde2e2', fontSize: 12, fontWeight: 700 } }, '✗ Hurt: ' + (scenarioScore.hurt || 0))
              ),
              h('p', { style: { color: T.muted, fontSize: 13, marginBottom: 14 } }, verdict),
              h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', { 'data-fr-focusable': true, onClick: function() { pickScenario(sc.id); }, style: btn() }, '↺ Retry'),
                h('button', { 'data-fr-focusable': true, onClick: leaveScenario, style: btnPrimary() }, '→ Pick another scenario')
              )
            );
          }
          var step = sc.steps[scenarioStep];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, sc.icon),
                h('strong', { style: { fontSize: 15 } }, sc.title),
                h('span', { style: { marginLeft: 'auto', fontSize: 11, color: T.dim } }, 'Step ', (scenarioStep + 1), ' / ', sc.steps.length)
              ),
              scenarioStep === 0 && h('p', { style: { margin: '6px 0 0', color: T.muted, fontSize: 13, lineHeight: 1.55, fontStyle: 'italic' } }, sc.setup)
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
              h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, step.situation),
              h('div', { role: 'group', 'aria-label': 'Choices',
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
                h('button', { 'data-fr-focusable': true, 'aria-label': 'Leave scenario',
                  onClick: leaveScenario, style: btn({ padding: '6px 12px', fontSize: 12 })
                }, '← Leave'),
                scenarioAnswered && h('button', { 'data-fr-focusable': true, 'aria-label': 'Next step',
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
          text: 'In study hall, a peer drops his soda and slumps face-first onto his desk. He does not respond when you say his name. You can see his chest is not moving normally.' },
        { id: 'fb2', difficulty: 'basic',
          text: 'On the school bus, a 1st-grader starts crying loudly that his throat itches and his lip looks swollen. He just shared a granola bar with another kid and his backpack has a "PEANUT ALLERGY" tag on it.' },
        { id: 'fb3', difficulty: 'intermediate',
          text: 'Your aunt is over for dinner. Mid-conversation she suddenly can’t lift her right arm to take a glass of water. Her smile is uneven on one side and she keeps trying to say "I’m fine" but it comes out garbled. Time is 7:14 PM.' },
        { id: 'fb4', difficulty: 'intermediate',
          text: 'At the skate park, a kid wipes out and lies on the ground bleeding heavily from a deep gash on her thigh. Blood is pooling on the concrete. The nearest hospital is 25 minutes away.' },
        { id: 'fb5', difficulty: 'advanced',
          text: 'You walk into a friend’s house unannounced. He’s on the bathroom floor, lips blue, breathing slowly and shallowly. There’s a small empty pill bottle and a vape pen near him. His phone is buzzing on the counter.' },
        { id: 'fb6', difficulty: 'advanced',
          text: 'At lunch, a classmate who is Deaf taps you and points at another student across the cafeteria who is alone, eyes wide, hands gripping the edge of the table, breathing fast and shallow. You don’t know if they’re having a heart attack or a panic attack.' }
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🤖 How AI Practice works'),
              h('ol', { style: { margin: '0 0 0 18px', color: T.muted, fontSize: 13, lineHeight: 1.7 } },
                h('li', null, 'Pick a difficulty. Generate a novel scene.'),
                h('li', null, 'Write your response in 2–3 sentences: what you’d do, in what order.'),
                h('li', null, 'Get critique. The AI grades your reasoning against the protocols hardcoded in this tool.'),
                h('li', null, h('strong', { style: { color: T.text } }, 'The AI never gives clinical decisions'),
                  ' — it only checks your reasoning. For "should I give X" questions, the answer is always "follow what’s prescribed + call 911."')
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Without an AI key: '),
              'the module still works — pre-written scenes are bundled, and a local keyword check stands in for AI critique.')
          );
        }

        function aiPractice() {
          var difficulties = [
            { id: 'basic', label: 'Basic — single emergency, clear cues' },
            { id: 'intermediate', label: 'Intermediate — needs recognition + decision' },
            { id: 'advanced', label: 'Advanced — ambiguity / multiple issues' }
          ];
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '⚙️ Pick difficulty'),
              h('div', { role: 'radiogroup', 'aria-label': 'Difficulty',
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
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '📖 The scene'),
              h('p', { style: { margin: 0, color: T.text, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' } }, aiScene.text),
              aiScene.id && aiScene.id.indexOf('fb') === 0 && h('div', { style: { marginTop: 6, fontSize: 10, color: T.dim, fontStyle: 'italic' } }, 'Bundled scene (no AI used).')
            ),
            aiScene && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('label', { htmlFor: 'fr-ai-response', style: { display: 'block', fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 } },
                '✏️ Your response (2–3 sentences)'),
              h('textarea', { id: 'fr-ai-response', 'data-fr-focusable': true,
                value: aiResponse,
                onChange: function(e) { upd('aiResponse', e.target.value); },
                placeholder: 'What do you do, and in what order? Be specific (call 911? CPR? AED? EpiPen? recovery position?).',
                'aria-label': 'Your emergency response, 2 to 3 sentences',
                rows: 4,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }
              }),
              h('div', { style: { marginTop: 8, fontSize: 11, color: T.dim, marginBottom: 8 } },
                aiResponse.length, ' characters. Aim for ~150–400.'),
              h('button', { 'data-fr-focusable': true,
                'aria-label': aiLoadingCritique ? 'Getting critique...' : 'Get AI critique of your response',
                'aria-busy': aiLoadingCritique ? 'true' : 'false',
                disabled: aiLoadingCritique || !aiResponse.trim(),
                onClick: getCritique,
                style: btnPrimary({ opacity: (aiLoadingCritique || !aiResponse.trim()) ? 0.6 : 1 })
              }, aiLoadingCritique ? '⏳ Critiquing...' : '🎓 Get critique')
            ),
            aiCritique && h('div', { style: { padding: 14, borderRadius: 10, background: '#1e3a8a', border: '1px solid #1e40af', color: '#dbeafe' } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15 } }, '🎓 Critique'),
              h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 } }, aiCritique.text),
              h('div', { style: { marginTop: 10, fontSize: 10, opacity: 0.75, fontStyle: 'italic' } },
                aiCritique.source === 'ai' ? 'Critique generated by AI; protocol references are checked against this tool’s hardcoded ground truth.' : 'Local keyword check (AI unavailable).')
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🤖 AI Practice'),
          emergencyBanner(),
          h('div', { role: 'tablist', 'aria-label': 'AI Practice sections',
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
            'Every org cited in this tool. On a phone, tap a phone number to call. ',
            h('strong', { style: { color: T.accentHi } }, 'Maine note: '), MAINE_EMS.text911),
          section('🚑 Emergency', RESOURCES.emergency),
          section('💚 Crisis & mental health', RESOURCES.crisis),
          section('✚ Get certified', RESOURCES.certification),
          section('⚡ Condition-specific', RESOURCES.conditions),
          section('♾️ Disability advocacy', RESOURCES.disabilityAdvocacy),
          h('div', { style: { marginTop: 8, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('div', { style: { fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
            h('div', { style: { marginBottom: 4 } }, MAINE_EMS.ruralEta),
            h('div', { style: { marginBottom: 4 } }, MAINE_EMS.heartAed),
            h('div', { style: { marginBottom: 4 } }, MAINE_EMS.crisisRoute),
            h('div', null, MAINE_EMS.poison)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // VIEW ROUTER
      // ─────────────────────────────────────────
      // Consent gate blocks every view EXCEPT 'resources' (emergencies always
      // need access to phone numbers, even from a fresh install).
      if (!consentAccepted && view !== 'resources') {
        return renderConsent();
      }
      switch (view) {
        case 'recognize':       return renderRecognize();
        case 'call':            return renderCall();
        case 'cprAed':          return renderCprAed();
        case 'bleed':           return renderBleed();
        case 'choking':         return renderChoking();
        case 'disabilityAware': return renderDisabilityAware();
        case 'scenarios':       return renderScenarios();
        case 'aiPractice':      return renderAiPractice();
        case 'resources':       return renderResources();
        case 'menu':
        default:
          return renderMenu();
      }
      } catch(e) {
        console.error('[FirstResponse] render error', e);
        return ctx.React.createElement('div', { style: { padding: 16, color: '#fde2e2', background: '#7f1d1d', borderRadius: 8 } },
          'First Response Lab failed to render. ' + (e && e.message ? e.message : ''));
      }
    }
  });

})();

}  // end isRegistered guard
