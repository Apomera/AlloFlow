// ═══════════════════════════════════════════════════════════════
// sel_tool_crisiscompanion.js — Crisis Companion (v1.0)
//
// PEER SUPPORT + SUICIDE PREVENTION for adolescents (~12-18).
// Built from a school-psych voice. Aligns with safe-messaging guidelines
// from AFSP (afsp.org), SAMHSA, Reporting on Suicide media guidelines
// (reportingonsuicide.org), Sources of Strength, QPR Institute, NIMH,
// and AAP adolescent guidance. Reuses sel_safety_layer.js infrastructure
// for crisis resources rendering.
//
// ─── SAFETY GUARDRAILS (audited line by line) ───
//   ✓ Mandatory content-warning gate at module entry
//   ✓ Zero descriptions of methods (NEVER name how someone might harm)
//   ✓ Zero specific "warning signs" that function as a how-to checklist
//   ✓ Safe-messaging language throughout (no "committed," "successful,"
//     "failed" — uses "died by suicide," "lost to suicide," "attempt")
//   ✓ Crisis resources at TOP and BOTTOM of every section after gate
//   ✓ "Asking does NOT plant the idea" explicitly debunked
//   ✓ "Safety overrides secrecy is loyalty, not betrayal" throughout
//   ✓ "You are not the therapist" — peer's job is presence + escalation
//   ✓ LGBTQ+ disproportionate-risk note + Trevor Project named explicitly
//   ✓ Recovery / hope framing in closing module
//   ✓ Maine resources (Maine Crisis Line, NAMI Maine, school counselor)
//   ✓ Reuses sel_safety_layer's renderCrisisResources — does NOT duplicate
//   ✓ School-psych editorial review REQUIRED before opening to students
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // Reduced-motion CSS (WCAG 2.3.3) + focus-visible rings (WCAG 2.4.7) — scope to this tool's class
  (function() {
    if (document.getElementById('allo-crisiscompanion-a11y-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-crisiscompanion-a11y-css';
    st.textContent = [
      '@media (prefers-reduced-motion: reduce) {',
      '  .selh-crisiscompanion *, .selh-crisiscompanion *::before, .selh-crisiscompanion *::after {',
      '    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;',
      '    transition-duration: 0.01ms !important; scroll-behavior: auto !important;',
      '  }',
      '  .selh-crisiscompanion .cc-breath-circle { transform: scale(1) !important; transition: none !important; }',
      '}',
      '.selh-crisiscompanion button:focus-visible,',
      '.selh-crisiscompanion input:focus-visible,',
      '.selh-crisiscompanion textarea:focus-visible,',
      '.selh-crisiscompanion select:focus-visible,',
      '.selh-crisiscompanion [tabindex]:focus-visible {',
      '  outline: 3px solid #0d9488 !important;',
      '  outline-offset: 2px !important;',
      '  box-shadow: 0 0 0 3px rgba(13,148,136,0.20) !important;',
      '}',
      '.selh-crisiscompanion .cc-breath-circle {',
      '  transition: transform 4s ease-in-out, background 4s ease-in-out;',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // Live region (WCAG 4.1.3)
  (function() {
    if (document.getElementById('allo-live-crisiscompanion')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-crisiscompanion';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  var announce = function(msg) {
    try { var lr = document.getElementById('allo-live-crisiscompanion'); if (lr) lr.textContent = String(msg || ''); } catch(e) {}
  };

  // localStorage helpers
  function lsGet(key, fallback) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } }
  function lsSet(key, val)      { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

  // Theme palette — calming teal / emerald, NOT alarming reds for this tool
  var TEAL        = '#0d9488';   // teal-600
  var TEAL_DARK   = '#115e59';   // teal-800
  var TEAL_LIGHT  = '#f0fdfa';   // teal-50
  var TEAL_BORDER = '#99f6e4';   // teal-200
  var EMERALD     = '#10b981';   // emerald-500
  var EMERALD_DARK = '#065f46';  // emerald-800
  var AMBER       = '#f59e0b';   // amber-500
  var AMBER_LIGHT = '#fffbeb';   // amber-50
  var ROSE        = '#e11d48';   // rose-600 (for "what NOT to say")
  var ROSE_LIGHT  = '#fff1f2';   // rose-50
  var SLATE_TEXT  = '#1e293b';   // slate-800 — primary text
  var SLATE_MID   = '#334155';   // slate-700 — secondary text (passes AA on white)
  var SLATE_BG    = '#f8fafc';   // slate-50

  // ══════════════════════════════════════════════════════════════
  // ── CONTENT DATA ──
  // ══════════════════════════════════════════════════════════════

  // Crisis resources used in this module's persistent bar AND in the
  // Resources sub-module. Each entry has a `group` field so the resources
  // section can render them grouped: National (US-wide) → Find local
  // (US directory lookups) → International → Maine partners → School-based.
  // Numbers verified as of 2026-04-30.
  var CRISIS_RESOURCES = [
    // ── NATIONAL (US-wide, works anywhere in the US) ──
    {
      id: '988', group: 'national',
      label: '988 Suicide & Crisis Lifeline',
      contact: 'Call or text 988',
      url: 'https://988lifeline.org',
      who: 'Anyone in the U.S. — including kids worried about a friend',
      what: 'Free, confidential, 24/7. Trained crisis counselors. Connects to local services if needed.',
      script: 'You can say: "I\'m worried about my friend." That is enough. They will guide the conversation from there.'
    },
    {
      id: 'crisistext', group: 'national',
      label: 'Crisis Text Line',
      contact: 'Text HOME to 741741',
      url: 'https://crisistextline.org',
      who: 'Anyone in the U.S., Canada, UK, or Ireland (codes vary by country) — text-only is good if you don\'t want to talk',
      what: 'Free, confidential, 24/7. A real human counselor texts back. Average wait under 5 minutes.',
      script: 'You can text: "My friend is talking about hurting themselves and I don\'t know what to do." That works.'
    },
    {
      id: 'trevor', group: 'national',
      label: 'The Trevor Project',
      contact: 'Call 1-866-488-7386 · Text START to 678-678',
      url: 'https://thetrevorproject.org',
      who: 'LGBTQ+ youth and friends supporting them (US)',
      what: 'Free, confidential, 24/7. Specifically trained for LGBTQ+ youth crisis. LGBTQ+ kids face higher rates of suicidal thoughts; this resource is built for that reality.',
      script: 'You can call or text: "I have a friend who\'s LGBTQ+ and going through a really hard time."'
    },
    {
      id: '911', group: 'national',
      label: '911 Emergency',
      contact: 'Call 911',
      url: null,
      who: 'When someone is in immediate physical danger right now (US)',
      what: 'For active emergencies: someone is hurting themselves, has taken something, or is unsafe right now. Police, fire, and EMS dispatch.',
      script: 'You can say: "My friend is in danger and I don\'t know what to do." They will help.'
    },

    // ── FIND LOCAL (US directory lookups — type your zip, find your area) ──
    {
      id: '211', group: 'lookup',
      label: '211 — community resource line',
      contact: 'Call 211 · or visit 211.org',
      url: 'https://www.211.org',
      who: 'Anyone in the U.S. or Canada — automatically routes to your local services by area code',
      what: 'Free, confidential, 24/7. Connects you to local mental-health crisis services, food assistance, housing, family support, and hundreds of other community programs. Run by United Way + local nonprofits. Different from 988 — 211 is the broader community-services line.',
      script: 'You can say: "I\'m looking for mental-health crisis services in my area for a friend." They\'ll route you to the right local agency.'
    },
    {
      id: 'namilocator', group: 'lookup',
      label: 'NAMI Affiliate Locator (national directory)',
      contact: 'Visit nami.org/findsupport',
      url: 'https://www.nami.org/findsupport',
      who: 'Anyone in the U.S. — type your zip code, see your local NAMI chapter',
      what: 'Every state has at least one NAMI affiliate; many have several. Local chapters offer free family support groups, peer-led recovery programs, education classes (Family-to-Family, Ending the Silence in schools), and warmlines. NAMI HelpLine: 1-800-950-6264.',
      script: 'On the site: enter zip → "Find My Local NAMI" → see contact info, programs, and helpline number for your area.'
    },
    {
      id: 'samhsa', group: 'lookup',
      label: 'SAMHSA FindTreatment.gov (federal directory)',
      contact: 'Visit findtreatment.gov · or 1-800-662-HELP (4357)',
      url: 'https://findtreatment.gov',
      who: 'Anyone in the U.S. looking for ongoing mental-health or substance-use care',
      what: 'Federal database of ~13,000 treatment facilities — therapy, psychiatry, intensive outpatient, residential, dual-diagnosis. Filter by zip, by what insurance you have, by language, by services offered. SAMHSA also has a 24/7 National Helpline (1-800-662-4357) that gives free referrals.',
      script: 'On the site: enter zip → filter for "Mental Health Services" → narrow by what you can pay or insurance. The phone helpline is good if the website is overwhelming.'
    },

    // ── INTERNATIONAL (outside the US) ──
    {
      id: 'befrienders', group: 'international',
      label: 'Befrienders Worldwide',
      contact: 'Visit befrienders.org',
      url: 'https://www.befrienders.org',
      who: 'Anyone outside the U.S. looking for crisis support in their country',
      what: 'A global network of emotional-support volunteer centers in over 30 countries. Type your country into the site and you\'ll get the helpline numbers and chat options for your area. Most affiliates are free, confidential, and 24/7.',
      script: 'On the site: select your country → see local helpline numbers, opening hours, languages supported, and contact methods.'
    },
    {
      id: 'iasp', group: 'international',
      label: 'IASP — International Association for Suicide Prevention',
      contact: 'Visit iasp.info/resources/Crisis_Centres',
      url: 'https://www.iasp.info/resources/Crisis_Centres',
      who: 'Anyone outside the U.S. — comprehensive global crisis-line directory',
      what: 'IASP maintains the most complete international list of suicide-prevention crisis lines. Searchable by country, with phone, text, and online chat options. Often the best starting point if Befrienders does not have your country listed.',
      script: 'On the site: select your country → see crisis lines with contact methods and hours.'
    },

    // ── MAINE PARTNERS (named local agencies) ──
    {
      id: 'mainecrisis', group: 'maine',
      label: 'Maine Crisis Line',
      contact: 'Call 1-888-568-1112',
      url: 'https://www.maine.gov/dhhs/obh',
      who: 'Anyone in Maine — connects to statewide crisis services',
      what: 'Free, confidential, 24/7. Maine-based counselors. Operated by The Opportunity Alliance for southern Maine and other regional providers statewide. Can dispatch local mobile crisis teams when needed.',
      script: 'Identify your county or town if you can. They will route you to the right local team.'
    },
    {
      id: 'opportunityalliance', group: 'maine',
      label: 'The Opportunity Alliance (Cumberland County + statewide)',
      contact: 'Main: 207-553-5800 · Crisis: 1-888-568-1112',
      url: 'https://www.opportunityalliance.org',
      who: 'Children, teens, families, and adults in Cumberland County and across Maine',
      what: 'Runs the Cumberland County Crisis Mobile Response team — the people who actually come to you when 1-888-568-1112 dispatches in Portland and surrounding communities. Also provides Children\'s Behavioral Health Services, in-home behavioral health, family support, and the 211 Maine backbone for southern Maine.',
      script: 'For a friend in active crisis in Cumberland County: call 1-888-568-1112 and ask whether mobile crisis can come to your friend\'s location. For non-crisis support / connecting a family to ongoing services: call the main line during business hours.'
    },
    {
      id: 'namimaine', group: 'maine',
      label: 'NAMI Maine HelpLine',
      contact: 'Call 1-800-464-5767',
      url: 'https://namimaine.org',
      who: 'Anyone in Maine seeking mental-health information, support, or referrals',
      what: 'Not a crisis line, but a great daytime resource for navigating mental-health systems, peer support, and local programs. Also runs the Ending the Silence school program — student-aged presenters who teach about mental illness directly in middle and high school classrooms.',
      script: 'Good for non-immediate questions: "How do I help my friend find a therapist?" or "Where do families go for support?" Also: "Does our school host Ending the Silence?"'
    },

    // ── SCHOOL-BASED (works at every public school in the US) ──
    {
      id: 'school', group: 'school',
      label: 'Your school counselor or school psychologist',
      contact: 'Walk in, send a note, or ask any teacher to take you',
      url: null,
      who: 'Every public school in the U.S. has trained counselors; most middle and high schools also have a school psychologist',
      what: 'They are trained for this. They are bound by confidentiality except for safety. They can connect to outside care, talk to parents with you, and stay with you through it.',
      script: 'You can say: "I\'m worried about my friend." If you can\'t say it out loud, write it on a sticky note and hand it to them.'
    }
  ];

  // Resource group display order + headers used by the Resources section.
  var RESOURCE_GROUPS = [
    { id: 'national',      label: 'Works anywhere in the U.S.', desc: 'These four are the universal backbone. Memorize 988.' },
    { id: 'lookup',        label: 'Find your local help (U.S.)', desc: 'Directory lookups that route you to your specific area\'s services. Useful for ongoing care beyond the crisis call.' },
    { id: 'international', label: 'Outside the U.S.?', desc: '988, 211, Trevor, and SAMHSA are U.S.-only. These directories cover the rest of the world.' },
    { id: 'maine',         label: 'Maine partners (named local agencies)', desc: 'Specifically named because King Middle and Portland Public Schools are this tool\'s pilot context. If you\'re elsewhere, use the directory lookups above to find your equivalents.' },
    { id: 'school',        label: 'School-based help', desc: 'Often the easiest adult to reach during the school day. Available in every U.S. public school.' }
  ];

  // Module 2 — Recognizing depression. Pattern-of-change framing, NOT a
  // checklist that could function as a self-diagnosis tool. AAP-aligned.
  var DEPRESSION_PATTERNS = [
    { id: 'mood',     icon: '🌧️', label: 'Persistent low mood',
      desc: 'Sadness, emptiness, or a flat / numb feeling that lasts most of the day, nearly every day, for weeks. Different from normal sad days that come and go.' },
    { id: 'irritability', icon: '⚡', label: 'Increased irritability',
      desc: 'In adolescents especially, depression often shows up as irritability or anger more than sadness. Snapping at small things, feeling raw all the time.' },
    { id: 'withdrawal', icon: '🚪', label: 'Withdrawal from activities',
      desc: 'Pulling away from hobbies, sports, friends, and things they used to enjoy. Cancelling plans repeatedly. Spending much more time alone than they used to.' },
    { id: 'sleep',    icon: '😴', label: 'Sleep changes',
      desc: 'Sleeping much more than usual, or barely sleeping. Trouble falling asleep, waking up exhausted, sleeping through the day.' },
    { id: 'appetite', icon: '🍽️', label: 'Appetite changes',
      desc: 'Eating much more or much less than usual. Skipping meals, or eating constantly without enjoyment. Notable weight changes over a few weeks.' },
    { id: 'energy',   icon: '🔋', label: 'Low energy / fatigue',
      desc: 'Everything feels heavy. Even small tasks feel impossible. They might describe feeling tired all the time even after sleeping.' },
    { id: 'school',   icon: '📚', label: 'Drop in school engagement',
      desc: 'Grades sliding, missing assignments, falling behind in classes that used to be no problem. Often accompanied by missed school days.' },
    { id: 'selfcare', icon: '🪥', label: 'Decline in self-care',
      desc: 'Less attention to hygiene, appearance, or daily routines they used to keep up with. Not a fashion change — a sense that they\'ve stopped caring.' },
    { id: 'hopeless', icon: '🌫️', label: 'Hopeless or self-critical statements',
      desc: 'Frequent comments like "what\'s the point," "nothing matters," "I\'m worthless," "I\'m a burden." These are language patterns worth taking seriously, even when said casually.' }
  ];

  // Module 3 — Crisis warning signs (TALK / MOOD / BEHAVIOR framework from
  // AFSP). DELIBERATELY high-level. We do NOT enumerate specific behaviors
  // that could function as a how-to.
  var CRISIS_SIGNS = {
    talk: {
      icon: '🗣️',
      title: 'TALK — what they\'re saying',
      desc: 'Direct or indirect language about wanting to die, ending pain, being a burden, or having no future. Sometimes said casually or as a joke. Take it seriously regardless of how it\'s framed.',
      examples: [
        '"I want to die" or "I wish I weren\'t here"',
        '"Everyone would be better off without me"',
        '"I can\'t do this anymore"',
        '"I just want it to stop"',
        '"You won\'t have to worry about me much longer"',
        'Saying goodbye in a way that feels final, even if subtle'
      ],
      note: 'A friend joking about wanting to die is still a moment to gently check in. Most people who later attempt have told someone — sometimes in a casual or seemingly throwaway way.'
    },
    mood: {
      icon: '🌫️',
      title: 'MOOD — what you\'re seeing',
      desc: 'Significant shifts in mood, especially over short periods. Sudden calm or relief AFTER a period of distress can be a serious sign — sometimes a person at risk decides on a plan and feels temporarily peaceful about it.',
      examples: [
        'Persistent depression or anxiety that isn\'t lifting',
        'A sudden sense of calm or "everything is fine now" after a long hard period',
        'Hopelessness about the future',
        'Rage or vengeful talk',
        'Loss of interest in things they used to care about'
      ],
      note: 'Sudden improvement after a long hard time is good when it follows treatment, support, and rest. It\'s a warning sign when it follows nothing — when calm appears out of nowhere after weeks of struggle.'
    },
    behavior: {
      icon: '🪶',
      title: 'BEHAVIOR — what they\'re doing',
      desc: 'Patterns of action, especially preparation patterns. We deliberately do NOT enumerate specifics here that could function as a how-to. The general categories are enough for a friend to recognize that something is wrong.',
      examples: [
        'Withdrawing from friends, family, or activities they used to love',
        'Increased substance use (alcohol, weed, pills, vaping more than usual)',
        'Giving away meaningful possessions',
        'Saying goodbye to people in a way that feels final',
        'Acting recklessly, taking risks they normally wouldn\'t',
        'Searching for ways to harm themselves online (you might see screen-time spike at strange hours, or notice they have searches they hide)'
      ],
      note: 'You don\'t have to be sure. If a cluster of these is showing up, that\'s the moment to gently check in AND tell a trusted adult. You don\'t need certainty — concern is enough.'
    }
  };

  // Module 5 — What to say (and what not to say) — paired ✓/× cards.
  var SAY_DO = [
    { say: '"I\'ve noticed you seem really down lately. I care about you. How are you really doing?"',
      why: 'Specific, caring, gives them an opening. "Really doing" signals you want past the usual "I\'m fine."' },
    { say: '"Are you thinking about hurting yourself? Are you thinking about suicide?"',
      why: 'Directly asking does NOT plant the idea — research is clear on this. It often comes as a relief. They were probably waiting for someone to notice.' },
    { say: '"I\'m glad you told me. That took courage."',
      why: 'Affirms the disclosure. Don\'t skip ahead to fixing — first thank them for trusting you.' },
    { say: '"This is more than I can handle alone, and I want to make sure you\'re safe. Can we tell someone together?"',
      why: 'Honest about your limits. Frames adult-telling as an act of love, not betrayal. The "together" matters — you\'re not bailing.' },
    { say: '"I\'m here. I\'m not going anywhere. We can sit in silence if you want."',
      why: 'Presence is the medicine. You don\'t have to have answers. You just have to stay.' },
    { say: '"Is there someone you trust I can help you talk to right now?"',
      why: 'Names that adult-help is the next step, but lets them have agency in choosing who.' },
    { say: '"I love you. I\'m scared for you. Please let me help."',
      why: 'Direct emotional honesty. "Scared" is OK — it\'s how you actually feel, and it tells them this matters to you.' }
  ];

  var SAY_DONT = [
    { say: '"You shouldn\'t feel that way."',
      why: 'Tells them their feelings are wrong. They will stop telling you anything if their feelings get judged.' },
    { say: '"Other people have it worse than you."',
      why: 'Pain isn\'t a comparison. This shuts down disclosure and adds shame.' },
    { say: '"Don\'t tell anyone. I won\'t tell either."',
      why: 'Promising secrecy in a safety situation is the opposite of help. Safety overrides secrecy. Loyalty here means telling.' },
    { say: '"Promise me you won\'t do anything."',
      why: 'Asks them to make a promise that may not be in their power to keep — and adds a feeling of having let you down if they can\'t. Replace with: "I want you to be safe. Let\'s find help together."' },
    { say: '"You have so much to live for."',
      why: 'Well-meant, but in a deeply low moment a person genuinely cannot feel this. It can land as "you should be grateful" — which adds shame to the pain.' },
    { say: '"Just snap out of it / cheer up / try harder."',
      why: 'Depression is not a choice. Telling someone to choose otherwise tells them you don\'t understand what they\'re experiencing.' },
    { say: '"Why would you think that?" (in a frustrated tone)',
      why: 'Frustration reads as judgment. If you genuinely want to understand, ask gently — "Can you help me understand what you\'re feeling right now?" — and stay open to whatever they say.' }
  ];

  // Module 6 — Telling a trusted adult: list of adult options.
  var TRUSTED_ADULTS = [
    { icon: '🍎', label: 'School counselor or school psychologist',
      pro: 'Trained for this. Often the easiest one to access during a school day. Bound by confidentiality except for safety. Can help you tell parents and connect to outside care.',
      how: 'Walk in. Send a note. Ask any teacher to take you. You can write it down if you can\'t say it.' },
    { icon: '🏫', label: 'Teacher you trust',
      pro: 'Sees you regularly, knows your friend group. Mandated reporter — they know what to do.',
      how: 'After class, in office hours, or by note. "I need to talk to you about something serious about a friend."' },
    { icon: '🩺', label: 'School nurse',
      pro: 'Confidential medical / mental-health resource at school. Often easier to access than the counselor.',
      how: 'Walk into the nurse\'s office. They\'ll make space.' },
    { icon: '👨‍👩‍👧', label: 'Parent, guardian, or older sibling',
      pro: 'They love you. They want to help. Even if they don\'t know what to do, they can take the next step with you.',
      how: 'Pick a calm moment. Start with: "I need help with something serious about a friend." Ask if you can sit down together.' },
    { icon: '⚕️', label: 'Family doctor or pediatrician',
      pro: 'Confidential medical professional. Can refer to mental-health care, talk to your friend\'s family, or coordinate with school.',
      how: 'You can call the office and say you need to talk to the doctor. Many offer adolescent confidentiality.' },
    { icon: '🏟️', label: 'Coach or club advisor',
      pro: 'Adults who already know you and your friend through activities. Often have school-counselor connections.',
      how: 'After practice or a meeting. "I need to talk to you about something I\'m worried about."' },
    { icon: '🕊️', label: 'Religious leader (if your family is part of a faith community)',
      pro: 'For families where this is a trusted relationship, faith leaders can be a meaningful first stop.',
      how: 'Most welcome these conversations. Many have trauma-informed training.' },
    { icon: '🧑‍⚕️', label: 'A therapist (yours or theirs, if either of you has one)',
      pro: 'Already trained for this exact conversation. If you or your friend already see a therapist, this is the most direct route.',
      how: 'Call the office. "I have a safety concern I need to talk about today."' }
  ];

  // Module 7 — Suicide myths debunked
  var MYTHS = [
    {
      claim: 'Asking someone if they\'re thinking about suicide will plant the idea.',
      truth: 'False. Research is consistent and clear: asking does NOT increase risk. It often comes as a relief — the person was waiting for someone to notice. Asking is one of the most protective things a friend can do.',
      cite: 'Dazzi et al., Psychological Medicine (2014) meta-analysis · AFSP · QPR Institute · NIMH'
    },
    {
      claim: 'People who talk about suicide are just looking for attention. They wouldn\'t actually do anything.',
      truth: 'Dangerous myth. Most people who later attempt have told someone first — sometimes casually, sometimes as a joke. Every disclosure deserves a real response. "Attention-seeking" is often code for "in distress with no other way to ask for help."',
      cite: 'AFSP · CDC · National Action Alliance for Suicide Prevention'
    },
    {
      claim: 'If someone really wanted to die, they wouldn\'t tell anyone.',
      truth: 'False. The opposite is true. Many people who attempt have given direct or indirect warning signs to people around them. Telling someone is often a sign of ambivalence — part of them wants to live and is reaching out.',
      cite: 'Reporting on Suicide guidelines · AFSP · Sources of Strength'
    },
    {
      claim: 'There\'s nothing a friend can do — only a doctor or therapist can help.',
      truth: 'Peer presence is documented as protective. You don\'t have to fix anything. Listening, taking it seriously, and helping connect them to a trusted adult is genuine help. Programs like Sources of Strength are built around the fact that friends matter.',
      cite: 'Sources of Strength research · Wyman et al., American Journal of Public Health (2010)'
    },
    {
      claim: 'Talking about suicide will make it worse.',
      truth: 'Only true with UNSAFE messaging — glamorizing it, describing methods, sensationalizing. Talking with care, using safe-messaging language, and connecting to help is protective. Every major suicide-prevention organization recommends honest conversation.',
      cite: 'Reporting on Suicide guidelines (reportingonsuicide.org) · AFSP · WHO'
    },
    {
      claim: 'Suicide happens without warning.',
      truth: 'False. Research consistently shows warning signs are present in the majority of cases — though they\'re sometimes only obvious in hindsight. That\'s why peer-support training matters: it teaches you what to notice in real time.',
      cite: 'AFSP · CDC YRBSS · NIMH research summaries'
    }
  ];

  // Module 10 — Practice scenarios. Three scripted conversations with three
  // possible responses each (helpful / neutral / harmful) and feedback.
  // Modeled on Sources of Strength practice protocols. Intentionally NOT
  // detailed enough to function as a script for someone in crisis to mimic.
  var PRACTICE_SCENARIOS = [
    {
      id: 'sc1',
      title: 'A friend opens up at lunch',
      setting: 'You and Maya are sitting together at lunch. She\'s been quieter than usual lately. She picks at her food and says, almost casually: "Honestly, sometimes I just don\'t see the point of any of this anymore."',
      responses: [
        {
          text: '"What do you mean? Don\'t talk like that."',
          rating: 'harmful',
          why: 'This shuts down the disclosure. Telling someone "don\'t talk like that" tells them their feelings are wrong, AND that you\'re not safe to be honest with. They will likely retreat.'
        },
        {
          text: '"That sounds really heavy. Can you tell me more about what\'s been going on? I care about you."',
          rating: 'helpful',
          why: 'Validates the feeling without judgment. Invites more without forcing. "I care about you" makes it safe to keep talking. This opens the door for the harder question to come next: "Are you having thoughts of hurting yourself?"'
        },
        {
          text: '"Yeah, school is so stressful right now."',
          rating: 'neutral',
          why: 'Not harmful, but misses what she actually said. "Don\'t see the point of any of this" is more than school stress. A neutral response can leave her feeling unheard. Ask one follow-up question to be sure.'
        }
      ]
    },
    {
      id: 'sc2',
      title: 'A direct disclosure over text',
      setting: 'It\'s 11pm on a Tuesday. Your friend Jamie texts: "I keep thinking about how everyone would be fine without me." You read it and your heart stops.',
      responses: [
        {
          text: '"I\'m here. Don\'t do anything. I\'m calling my mom right now to come help."',
          rating: 'helpful',
          why: 'Direct, present, taking it seriously, getting an adult involved fast. "Calling my mom" names the move. If you can also stay on text or call them while waiting, do that. If you can get to them in person safely, do that.'
        },
        {
          text: '"omg are you okay?? you have so much to live for!!"',
          rating: 'neutral',
          why: 'Heart in the right place but lands wrong. "You have so much to live for" can feel like a guilt trip in a deeply low moment. Better: name your fear, tell them you love them, and get an adult involved.'
        },
        {
          text: '"I won\'t tell anyone, but please don\'t do anything tonight, okay?"',
          rating: 'harmful',
          why: 'Promising secrecy in a safety situation makes things worse. The most loyal thing here is telling an adult — even if Jamie asks you not to. Safety overrides secrecy. Tonight, you tell someone.'
        }
      ]
    },
    {
      id: 'sc3',
      title: 'The aftermath — your friend is now in care',
      setting: 'Last week your friend was hospitalized after a really hard night. You were the one who told an adult. They\'re back at school today, looking exhausted. They don\'t look at you in the hallway. You\'re scared they\'re mad at you.',
      responses: [
        {
          text: 'You walk up: "Hey. I\'ve been thinking about you. I\'m glad you\'re here today. Whenever you want to talk — about any of it, or nothing at all — I\'m around."',
          rating: 'helpful',
          why: 'Lets them know you\'re still there without making it about you. Doesn\'t demand anything. The "any of it, or nothing at all" gives them permission to choose pace. This is what loyalty looks like AFTER you\'ve told.'
        },
        {
          text: 'You avoid them so they don\'t feel weird seeing you.',
          rating: 'harmful',
          why: 'Understandable instinct, but absence reads as rejection — exactly the opposite of what they need right now. Even a small "Hey, glad you\'re here" matters. You don\'t have to know what to say.'
        },
        {
          text: 'You text them later: "I told because I love you and I was scared. Are you mad at me?"',
          rating: 'neutral',
          why: 'Honest, but puts them in the position of comforting YOU about your decision. You can name those feelings later, with a trusted adult or therapist. With your friend, lead with: "I\'m glad you\'re here. I\'m around when you want me."'
        }
      ]
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── REUSABLE: persistent crisis bar at top + bottom of every section ──
  // ══════════════════════════════════════════════════════════════
  function CrisisBar(h, band) {
    // If safety layer is loaded, use its renderCrisisResources for consistency.
    if (window.SelHub && window.SelHub.renderCrisisResources) {
      return window.SelHub.renderCrisisResources(h, band || 'middle');
    }
    // Fallback if safety layer didn't load
    return h('div', { role: 'alert', 'aria-live': 'assertive', style: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '12px', padding: '12px', marginBottom: '12px' } },
      h('div', { style: { fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '6px' } }, 'Help is available right now'),
      h('div', { style: { fontSize: '12px', color: '#7f1d1d', lineHeight: 1.6 } },
        h('div', null, '☎ 988 Suicide & Crisis Lifeline · call or text 988'),
        h('div', null, '✉ Crisis Text Line · text HOME to 741741'),
        h('div', null, '🏫 Tell a school counselor, teacher, parent, or trusted adult')
      )
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── INTERACTIVE COPING TOOLS (clinically-respectful) ──
  // Box-breathing pacer, 5-4-3-2-1 grounding, Stanley-Brown safety plan,
  // and a coping-toolkit builder. All evidence-based; none gamified.
  // ══════════════════════════════════════════════════════════════

  // Coping strategies — pre-loaded, evidence-based, age-appropriate.
  // Categories drawn from CBT/DBT distress-tolerance and adolescent
  // self-regulation literature (Linehan, AAP guidance, Sources of Strength).
  var COPING_STRATEGIES = [
    { id: 'walk_outside', cat: 'Movement', label: 'Take a 5-minute walk outside' },
    { id: 'stretch', cat: 'Movement', label: 'Slow stretching for 5 minutes' },
    { id: 'pushwall', cat: 'Movement', label: 'Push against a wall (release tension)' },
    { id: 'run_stairs', cat: 'Movement', label: 'Run up and down the stairs once' },
    { id: 'cold_water', cat: 'Sensory', label: 'Splash cold water on your face or wrists' },
    { id: 'ice_cube', cat: 'Sensory', label: 'Hold an ice cube in your hand' },
    { id: 'heavy_blanket', cat: 'Sensory', label: 'Wrap up in a heavy blanket' },
    { id: 'rain_sounds', cat: 'Sensory', label: 'Listen to rain or ocean sounds' },
    { id: 'safe_smell', cat: 'Sensory', label: 'Smell something you like (lotion, food, candle)' },
    { id: 'text_friend', cat: 'Connection', label: 'Text a trusted friend "thinking of you"' },
    { id: 'hug_pet', cat: 'Connection', label: 'Hug a pet or stuffed animal' },
    { id: 'call_family', cat: 'Connection', label: 'Call a family member who feels safe' },
    { id: 'with_someone', cat: 'Connection', label: 'Sit with someone safe (no need to talk)' },
    { id: 'playlist', cat: 'Creative', label: 'Listen to a calming playlist you trust' },
    { id: 'doodle', cat: 'Creative', label: 'Draw or doodle (no goal, no rules)' },
    { id: 'journal', cat: 'Creative', label: 'Write whatever\'s in your head, even one sentence' },
    { id: 'make', cat: 'Creative', label: 'Make something with your hands (origami, baking, building)' },
    { id: 'three_okay', cat: 'Cognitive', label: 'Write down 3 small things that are OK right now' },
    { id: 'five_breaths', cat: 'Cognitive', label: 'Take 5 slow breaths (count to 4 in, 4 out)' },
    { id: 'will_pass', cat: 'Cognitive', label: 'Remind yourself: "this feeling will pass"' },
    { id: 'one_step', cat: 'Cognitive', label: 'Pick one small thing to do next (just one)' }
  ];

  // ── Box-breathing pacer (4-4-4-4) ──
  // The phase is computed from a stored start timestamp. The CSS transition
  // (4s on transform + background) does the visual smoothing — we just set
  // discrete per-phase target values. A 1-second tick triggers re-renders so
  // the phase label updates as the cycle advances.
  function _BreathingPacer(h, d, upd) {
    var phaseLen = 4000;  // 4 seconds per phase
    var totalCycle = phaseLen * 4;
    var running = !!d.breathRunning;
    var startedAt = d.breathStartedAt || 0;
    var phaseIndex = 0;  // 0=in, 1=hold, 2=out, 3=hold
    var elapsed = 0;
    if (running && startedAt) {
      elapsed = Date.now() - startedAt;
      var inCycle = elapsed % totalCycle;
      phaseIndex = Math.floor(inCycle / phaseLen);
    }
    var phaseLabel = ['Breathe in', 'Hold', 'Breathe out', 'Hold'][phaseIndex];
    var phaseColor = ['#10b981', '#0d9488', '#0891b2', '#0d9488'][phaseIndex];
    // Discrete target scale per phase — CSS transition smooths between values.
    var targetScale = (phaseIndex === 0 || phaseIndex === 1) ? 1.0 : 0.55;
    function start() {
      upd({ breathRunning: true, breathStartedAt: Date.now() });
      announce('Box breathing started. 4 seconds in, 4 hold, 4 out, 4 hold.');
    }
    function stop() {
      upd({ breathRunning: false, breathStartedAt: 0 });
      announce('Box breathing paused.');
    }
    // Tick every 1s while running so the phase label updates each phase change.
    // We bump a state value via upd, which triggers a parent re-render. Idempotent.
    if (running && typeof window !== 'undefined') {
      if (!window._ccBreathTimer) {
        window._ccBreathTimer = setInterval(function() {
          upd('_breathTick', Date.now());
        }, 1000);
      }
    } else if (!running && typeof window !== 'undefined' && window._ccBreathTimer) {
      clearInterval(window._ccBreathTimer);
      window._ccBreathTimer = null;
    }
    var cyclesDone = running && totalCycle ? Math.floor(elapsed / totalCycle) : 0;
    return h('div', { style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderRadius: '14px', padding: '20px', marginBottom: '14px', textAlign: 'center' } },
      h('h2', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 6px' } }, '🌬️ Box-breathing pacer'),
      h('p', { style: { fontSize: '13px', color: SLATE_MID, lineHeight: 1.6, margin: '0 0 16px' } },
        'A 4-4-4-4 rhythm: breathe in for 4, hold for 4, breathe out for 4, hold for 4. Used by clinicians and first responders to calm the nervous system. The circle expands when you breathe in, contracts when you breathe out.'
      ),
      h('div', { style: { position: 'relative', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' } },
        h('div', {
          className: 'cc-breath-circle',
          'aria-label': running ? phaseLabel + ', cycle ' + cyclesDone : 'Breathing pacer ready',
          style: {
            width: '160px', height: '160px', borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, ' + phaseColor + ', ' + TEAL_DARK + ')',
            transform: 'scale(' + targetScale + ')',
            boxShadow: '0 8px 30px rgba(13,148,136,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '17px'
          }
        }, running ? phaseLabel : 'Ready'),
        running && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', bottom: '-6px', fontSize: '12px', color: TEAL_DARK, fontWeight: 700 } }, 'Cycle ' + cyclesDone)
      ),
      h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' } },
        !running && h('button', {
          onClick: start,
          'aria-label': 'Start box-breathing pacer',
          style: { padding: '10px 22px', background: TEAL, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }
        }, '▶ Start'),
        running && h('button', {
          onClick: stop,
          'aria-label': 'Pause box-breathing pacer',
          style: { padding: '10px 22px', background: '#fff', color: TEAL_DARK, border: '2px solid ' + TEAL, borderRadius: '10px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }
        }, '⏸ Pause')
      ),
      h('p', { style: { fontSize: '11px', color: SLATE_MID, fontStyle: 'italic', margin: '14px 0 0', lineHeight: 1.55 } },
        'If breathing exercises feel uncomfortable or make you more anxious, that\'s actually common — stop and try grounding instead. Reduced-motion settings will hold the circle still and rely on the phase label.'
      )
    );
  }

  // ── 5-4-3-2-1 sensory grounding ──
  function _GroundingExercise(h, d, upd) {
    var GROUND_STEPS = [
      { n: 5, sense: 'see',   prompt: 'Name 5 things you can SEE around you right now.', helper: 'Anything counts. The lamp. The corner of a desk. A cloud.' },
      { n: 4, sense: 'feel',  prompt: 'Name 4 things you can FEEL.', helper: 'Your feet on the floor. Fabric of your shirt. Air on your skin.' },
      { n: 3, sense: 'hear',  prompt: 'Name 3 things you can HEAR.', helper: 'A clock. Traffic. Your own breathing.' },
      { n: 2, sense: 'smell', prompt: 'Name 2 things you can SMELL.', helper: '(Or things you remember the smell of, if nothing\'s nearby.)' },
      { n: 1, sense: 'taste', prompt: 'Name 1 thing you can TASTE.', helper: '(Or your last sip of water, or a favorite food.)' }
    ];
    var stepIdx = d.groundStep != null ? d.groundStep : 0;
    var entries = d.groundEntries || {};
    function setEntry(stepKey, val) {
      var ne = Object.assign({}, entries); ne[stepKey] = val;
      upd('groundEntries', ne);
    }
    function next() {
      if (stepIdx < GROUND_STEPS.length - 1) {
        upd('groundStep', stepIdx + 1);
        announce(GROUND_STEPS[stepIdx + 1].prompt);
      } else {
        upd({ groundStep: GROUND_STEPS.length, groundCompleted: (d.groundCompleted || 0) + 1 });
        announce('Grounding complete. You\'ve returned to the present moment.');
      }
    }
    function reset() {
      upd({ groundStep: 0, groundEntries: {} });
      announce('Grounding reset.');
    }
    var atEnd = stepIdx >= GROUND_STEPS.length;
    var current = atEnd ? null : GROUND_STEPS[stepIdx];
    return h('div', { style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderRadius: '14px', padding: '20px', marginBottom: '14px' } },
      h('h2', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 6px' } }, '👁️ 5-4-3-2-1 Grounding'),
      h('p', { style: { fontSize: '13px', color: SLATE_MID, lineHeight: 1.6, margin: '0 0 14px' } },
        'A sensory anchor when your thoughts are racing or you feel disconnected. Move through the senses one at a time. You don\'t have to write anything — just notice.'
      ),
      // Progress dots
      h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '14px' }, 'aria-hidden': 'true' },
        GROUND_STEPS.map(function(_step, i) {
          var done = i < stepIdx || atEnd;
          var active = i === stepIdx && !atEnd;
          return h('div', { key: i, style: {
            width: '36px', height: '6px', borderRadius: '3px',
            background: done ? EMERALD : (active ? TEAL : '#e5e7eb')
          } });
        })
      ),
      atEnd ? h('div', { style: { textAlign: 'center', padding: '20px 12px' }, 'aria-live': 'polite' },
        h('div', { style: { fontSize: '32px', marginBottom: '8px' }, 'aria-hidden': 'true' }, '🌿'),
        h('h3', { style: { fontSize: '17px', color: EMERALD_DARK, margin: '0 0 8px', fontWeight: 800 } }, 'You\'ve come back to the present.'),
        h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 16px' } },
          'Grounding doesn\'t make hard feelings disappear. It just gives them a smaller place to live for a moment, so the wave can pass.'
        ),
        h('button', {
          onClick: reset,
          'aria-label': 'Restart grounding exercise',
          style: { padding: '10px 20px', background: TEAL, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
        }, '↻ Do it again')
      ) : h('div', null,
        h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '10px', padding: '16px', marginBottom: '12px' } },
          h('div', { style: { fontSize: '13px', fontWeight: 700, color: TEAL_DARK, marginBottom: '6px' } }, 'Step ' + (stepIdx + 1) + ' of ' + GROUND_STEPS.length),
          h('p', { style: { fontSize: '17px', fontWeight: 700, color: SLATE_TEXT, lineHeight: 1.5, margin: '0 0 6px' } }, current.prompt),
          h('p', { style: { fontSize: '12px', fontStyle: 'italic', color: SLATE_MID, margin: 0, lineHeight: 1.55 } }, current.helper)
        ),
        h('label', { htmlFor: 'cc-ground-' + stepIdx, style: { fontSize: '11px', color: SLATE_MID, display: 'block', marginBottom: '4px' } }, 'Optional: jot what you notice (private, not saved).'),
        h('textarea', {
          id: 'cc-ground-' + stepIdx,
          value: entries[stepIdx] || '',
          onChange: function(e) { setEntry(stepIdx, e.target.value); },
          rows: 2,
          'aria-label': 'Notes for step ' + (stepIdx + 1),
          placeholder: current.n + ' things you can ' + current.sense + '...',
          style: { width: '100%', padding: '10px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: '12px' }
        }),
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'space-between' } },
          h('button', {
            onClick: reset,
            'aria-label': 'Reset grounding to first step',
            style: { padding: '8px 16px', background: '#fff', color: SLATE_TEXT, border: '2px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }
          }, '↻ Reset'),
          h('button', {
            onClick: next,
            'aria-label': stepIdx < GROUND_STEPS.length - 1 ? 'Next step' : 'Finish grounding exercise',
            style: { padding: '10px 22px', background: TEAL, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }
          }, stepIdx < GROUND_STEPS.length - 1 ? 'Next →' : 'Finish ✓')
        )
      )
    );
  }

  // ── Coping toolkit builder ──
  // Tap any strategy to add it to your personal "toolkit". Persisted in
  // localStorage. Toolkit shows highlighted strategies first as a "go-to" list.
  function _CopingToolkit(h, d, upd) {
    var saved = d.toolkitIds || lsGet('crisisCompanion.toolkit.v1', []) || [];
    function toggle(id) {
      var next = saved.indexOf(id) === -1 ? saved.concat([id]) : saved.filter(function(x) { return x !== id; });
      upd('toolkitIds', next);
      lsSet('crisisCompanion.toolkit.v1', next);
      announce(saved.indexOf(id) === -1 ? 'Added to your toolkit' : 'Removed from your toolkit');
    }
    var byCategory = {};
    COPING_STRATEGIES.forEach(function(s) {
      if (!byCategory[s.cat]) byCategory[s.cat] = [];
      byCategory[s.cat].push(s);
    });
    var savedSet = {};
    saved.forEach(function(id) { savedSet[id] = true; });
    return h('div', { style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderRadius: '14px', padding: '20px', marginBottom: '14px' } },
      h('h2', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 6px' } }, '🧰 My coping toolkit'),
      h('p', { style: { fontSize: '13px', color: SLATE_MID, lineHeight: 1.6, margin: '0 0 14px' } },
        'Tap any strategy to add it to your personal toolkit. Saved on your device only — nothing is uploaded. Build a list of 5-7 things that have actually worked for you in the past, so when a hard moment comes you don\'t have to think from scratch.'
      ),
      // "My toolkit" summary at top
      saved.length > 0 && h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' } },
        h('div', { style: { fontSize: '11px', fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, '✓ My toolkit (' + saved.length + ')'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
          saved.map(function(id) {
            var s = COPING_STRATEGIES.filter(function(x) { return x.id === id; })[0];
            if (!s) return null;
            return h('button', {
              key: id,
              onClick: function() { toggle(id); },
              'aria-label': 'Remove "' + s.label + '" from toolkit',
              style: { padding: '4px 10px', background: TEAL, color: '#fff', border: 'none', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
            }, s.label + ' ✕');
          })
        )
      ),
      // All strategies grouped by category
      Object.keys(byCategory).map(function(cat) {
        return h('div', { key: cat, style: { marginBottom: '14px' } },
          h('div', { style: { fontSize: '12px', fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, cat),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
            byCategory[cat].map(function(s) {
              var on = !!savedSet[s.id];
              return h('button', {
                key: s.id,
                onClick: function() { toggle(s.id); },
                'aria-pressed': on ? 'true' : 'false',
                'aria-label': (on ? 'Remove from toolkit: ' : 'Add to toolkit: ') + s.label,
                style: {
                  padding: '6px 12px',
                  background: on ? TEAL : '#fff',
                  color: on ? '#fff' : SLATE_TEXT,
                  border: '2px solid ' + (on ? TEAL_DARK : '#cbd5e1'),
                  borderRadius: '999px', fontSize: '12px', fontWeight: on ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left'
                }
              }, (on ? '✓ ' : '+ ') + s.label);
            })
          )
        );
      }),
      h('p', { style: { fontSize: '11px', color: SLATE_MID, fontStyle: 'italic', margin: '8px 0 0', lineHeight: 1.55 } },
        'Note: this toolkit is a complement to, not a replacement for, professional support. If you\'re in crisis, call/text 988.'
      )
    );
  }

  // ── Stanley-Brown Safety Plan worksheet ──
  // Six steps, evidence-based intervention (Stanley & Brown, 2012). Saved
  // locally only. Includes a print-friendly view. The tool strongly encourages
  // building it WITH a clinician — which is the actual evidence-based use.
  function _SafetyPlan(h, d, upd) {
    var STEPS = [
      { id: 'warningSigns', label: '1. Warning signs', sub: 'What thoughts, feelings, or situations tell me a tough wave is coming?', placeholder: 'e.g., "When I haven\'t slept and I\'ve been alone all weekend"' },
      { id: 'internal', label: '2. Things I can do alone (internal coping)', sub: 'Things that have helped me feel even slightly better, that I can do without anyone else.', placeholder: 'e.g., "Listen to a calming playlist, take a walk, splash cold water on my face"' },
      { id: 'distract', label: '3. People + places that distract me (in a good way)', sub: 'Friends to text, places where I feel okay just being there. NOT for crisis support — just for taking my mind off it.', placeholder: 'e.g., "Library after school, my friend Maya, the coffee shop"' },
      { id: 'helpers', label: '4. People I can ask for help directly', sub: 'Friends or family who know what\'s going on, or who I trust enough to tell. List names + how to reach them.', placeholder: 'e.g., "Mom (cell ____), Aunt Liz (cell ____), Counselor Mr. K (room 204)"' },
      { id: 'professionals', label: '5. Professionals + crisis lines', sub: 'My therapist (if I have one), psychiatrist, doctor, school counselor, plus 24/7 crisis lines.', placeholder: 'e.g., "988 Lifeline (call or text), Crisis Text Line (text HOME to 741741), Dr. ____ at clinic ____, school counselor"' },
      { id: 'environment', label: '6. Making my environment safer', sub: 'What can I (or someone I trust) do to put distance between me and anything I might use to hurt myself? This is the single most evidence-based step.', placeholder: 'e.g., "Give my medications to mom to lock up. Stay out of the basement. Stay with someone overnight if it\'s really bad."' }
    ];
    var entries = d.safetyPlan || lsGet('crisisCompanion.safetyPlan.v1', null) || {};
    function setStep(id, val) {
      var ne = Object.assign({}, entries); ne[id] = val;
      upd('safetyPlan', ne);
      lsSet('crisisCompanion.safetyPlan.v1', ne);
    }
    function clearAll() {
      if (typeof window !== 'undefined' && !window.confirm('Clear your saved safety plan? This cannot be undone.')) return;
      upd('safetyPlan', {});
      lsSet('crisisCompanion.safetyPlan.v1', {});
      announce('Safety plan cleared.');
    }
    function printPlan() {
      try {
        var win = window.open('', '_blank', 'width=720,height=900');
        if (!win) { announce('Could not open print window — your browser may have blocked it.'); return; }
        var safeText = function(t) { return String(t || '').replace(/[<>&]/g, function(c) { return { '<':'&lt;', '>':'&gt;', '&':'&amp;' }[c]; }); };
        var html = '<!doctype html><html><head><title>My Safety Plan</title>' +
          '<style>body{font-family:Georgia,serif;max-width:720px;margin:24px auto;padding:0 20px;color:#1e293b;line-height:1.6}' +
          'h1{color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:6px}' +
          'h2{color:#115e59;font-size:15px;margin-top:24px}' +
          '.subhint{font-style:italic;color:#475569;font-size:13px;margin:0 0 8px}' +
          '.entry{background:#f8fafc;border-left:3px solid #0d9488;padding:10px 12px;border-radius:4px;white-space:pre-wrap;font-size:14px}' +
          '.meta{font-size:11px;color:#64748b;margin-top:4px}' +
          '.crisis{background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:14px;margin-top:24px}' +
          '.crisis strong{color:#991b1b}</style></head><body>' +
          '<h1>My Safety Plan</h1>' +
          '<p style="font-size:13px;color:#334155">Built using the Stanley-Brown Safety Planning Intervention. Most useful when reviewed with a counselor or therapist.</p>';
        STEPS.forEach(function(s) {
          html += '<h2>' + safeText(s.label) + '</h2>';
          html += '<p class="subhint">' + safeText(s.sub) + '</p>';
          var content = entries[s.id];
          if (content && content.trim()) {
            html += '<div class="entry">' + safeText(content) + '</div>';
          } else {
            html += '<div class="entry" style="color:#94a3b8;font-style:italic">(not yet filled in)</div>';
          }
        });
        html += '<div class="crisis"><strong>If you are in crisis right now:</strong><br>' +
          'Call or text <strong>988</strong> (24/7). Text <strong>HOME to 741741</strong>. Tell a trusted adult.</div>';
        html += '<p class="meta">Created ' + new Date().toLocaleDateString() + '</p>';
        html += '<script>window.print();</' + 'script></body></html>';
        win.document.write(html);
        win.document.close();
        announce('Print preview opened.');
      } catch (e) {
        announce('Print could not be opened.');
      }
    }
    var filledCount = STEPS.filter(function(s) { return (entries[s.id] || '').trim().length > 0; }).length;
    return h('div', { style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderRadius: '14px', padding: '20px', marginBottom: '14px' } },
      h('h2', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 6px' } }, '📋 My safety plan (Stanley-Brown)'),
      h('div', { style: { background: AMBER_LIGHT, border: '1px solid #fcd34d', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' } },
        h('p', { style: { fontSize: '12px', color: '#78350f', lineHeight: 1.6, margin: 0 } },
          h('strong', null, 'Best built WITH a counselor or therapist. '),
          'A safety plan is most effective when an adult who knows you helps you fill it in — they think of things you\'d miss, and they\'re a person you\'ve already practiced reaching out to. You can start it here, save it, and finish it together. Saved on this device only.'
        )
      ),
      // Progress
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' } },
        h('div', { style: { flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }, 'aria-hidden': 'true' },
          h('div', { style: { width: (filledCount / STEPS.length * 100).toFixed(0) + '%', height: '100%', background: EMERALD, transition: 'width 0.3s' } })
        ),
        h('span', { style: { fontSize: '11px', color: SLATE_MID, fontWeight: 700 } }, filledCount + ' / ' + STEPS.length + ' filled')
      ),
      // Steps
      STEPS.map(function(s) {
        var val = entries[s.id] || '';
        var done = val.trim().length > 0;
        return h('div', { key: s.id, style: { marginBottom: '16px', borderLeft: '4px solid ' + (done ? EMERALD : '#cbd5e1'), paddingLeft: '12px' } },
          h('label', { htmlFor: 'cc-sp-' + s.id, style: { display: 'block', fontSize: '14px', fontWeight: 700, color: TEAL_DARK, marginBottom: '4px' } }, s.label, done && h('span', { style: { color: EMERALD, marginLeft: '6px' } }, '✓')),
          h('p', { style: { fontSize: '12px', color: SLATE_MID, fontStyle: 'italic', margin: '0 0 8px', lineHeight: 1.55 } }, s.sub),
          h('textarea', {
            id: 'cc-sp-' + s.id,
            value: val,
            onChange: function(e) { setStep(s.id, e.target.value); },
            placeholder: s.placeholder,
            'aria-label': s.label,
            rows: 3,
            style: { width: '100%', padding: '10px', border: '2px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
          })
        );
      }),
      // Action buttons
      h('div', { style: { display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' } },
        h('button', {
          onClick: printPlan,
          'aria-label': 'Print or save my safety plan',
          style: { padding: '10px 16px', background: TEAL, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }
        }, '🖨 Print / save as PDF'),
        h('button', {
          onClick: clearAll,
          'aria-label': 'Clear my saved safety plan',
          style: { padding: '10px 16px', background: '#fff', color: '#9f1239', border: '2px solid ' + ROSE, borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }
        }, '✕ Clear plan')
      ),
      h('p', { style: { fontSize: '11px', color: SLATE_MID, fontStyle: 'italic', margin: '14px 0 0', lineHeight: 1.55 } },
        'Stanley-Brown Safety Planning Intervention is endorsed by the Suicide Prevention Resource Center and is one of the most-studied evidence-based safety plans. The full clinical version walks through it with a trained provider.'
      )
    );
  }

  // ── Static reading content for the self-care Read sub-tab ──
  function _renderSelfCareReadingExtras(h) {
    function _card(title, body, accentColor) {
      var c = accentColor || TEAL;
      return h('div', { style: { background: '#fff', border: '2px solid ' + (c === TEAL ? TEAL_BORDER : '#e5e7eb'), borderLeft: '6px solid ' + c, borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' } },
        h('h3', { style: { fontSize: '14px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' } }, title),
        body
      );
    }
    return h('div', null,
      _card('You are not the therapist',
        h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } },
          'Your job ended when you connected your friend to an adult. From here, your role shrinks back down to being a friend — and that\'s the right size. Treatment, safety planning, ongoing follow-up — those are jobs for trained professionals. Your job is presence, friendship, and not disappearing.'),
        EMERALD
      ),
      _card('If your friend goes to treatment, that is success — not abandonment',
        h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } },
          'When a friend gets professional help — therapy, medication, intensive programs, sometimes hospitalization — it can feel like the friendship has been put on pause. It hasn\'t. Treatment is what you helped make possible. Your friend is doing the hard work that keeps them here. Send a text. Save them a seat at lunch. Be there when they come back.'),
        EMERALD
      ),
      _card('Concrete moves that help',
        h('ul', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0, paddingLeft: '22px' } },
          h('li', null, h('strong', null, 'Tell another adult you trust. '), 'Even if the situation has been "handled," YOU went through something. A parent, counselor, or therapist can help you process it.'),
          h('li', null, h('strong', null, 'Pause platforms that are amplifying it. '), 'If social media is making your worry worse, take a break. Mute, unfollow, or close the app for a day.'),
          h('li', null, h('strong', null, 'Keep your own routines. '), 'Sleep, food, school, hobbies. These are the floorboards that keep you steady — don\'t let them slip while you\'re carrying this.'),
          h('li', null, h('strong', null, 'Ask for breaks when you need them. '), 'You are allowed to not text back immediately. You are allowed to be unavailable for a few hours. Your friend\'s recovery doesn\'t require you to be on-call.'),
          h('li', null, h('strong', null, 'Notice your own feelings. '), 'Sadness, anger, fear, exhaustion are normal. Numbness is also normal. If feelings stay heavy for more than a couple weeks, that\'s a moment to talk with a counselor.'),
          h('li', null, h('strong', null, 'Keep your other friendships. '), 'Don\'t let supporting one friend isolate you from everyone else. Your full social fabric is what holds you up.')
        )
      ),
      h('div', { style: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '14px', marginBottom: '12px' } },
        h('div', { style: { fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '6px' } }, 'When supporting a friend has hit YOU hard'),
        h('p', { style: { fontSize: '13px', color: '#7f1d1d', lineHeight: 1.7, margin: 0 } },
          'If you\'re losing sleep, having intrusive thoughts, feeling numb, or starting to have your own thoughts of self-harm — those are signs that you need support too. Call 988, text HOME to 741741, or talk to a school counselor. Helpers need help too. There is no shame in needing it.')
      ),
      h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '10px', padding: '14px' } },
        h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0, fontWeight: 600 } },
          'You showed up. You noticed. You said something. You told someone. That is enough. That is everything.')
      )
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── TOOL REGISTRATION ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.registerTool('crisiscompanion', {
    icon: '🫂',
    label: 'Crisis Companion',
    desc: 'Peer support and suicide-prevention skills. What to do if a friend seems depressed, in crisis, or thinking about hurting themselves. Recognizing signs, what to say (and not say), how to tell a trusted adult. NEDA + AFSP + Sources of Strength + 988 aligned. Content-warning gated.',
    color: 'teal',
    category: 'peer-support',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var addToast = ctx.addToast || function(){};
      var band = ctx.gradeBand || 'middle';

      var d = (ctx.toolData && ctx.toolData.crisiscompanion) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('crisiscompanion', key); else { Object.keys(key).forEach(function(k) { ctx.update && ctx.update('crisiscompanion', k, key[k]); }); } }
        else { ctx.update && ctx.update('crisiscompanion', key, val); }
      };

      // Hydrate persisted badges
      if (!d._hydrated) {
        var savedBadges = lsGet('crisisCompanion.badges.v1', null);
        if (savedBadges && d.badges === undefined) upd({ badges: savedBadges, _hydrated: true });
        else upd('_hydrated', true);
      }

      var consented = !!d.consented;
      var section   = d.section || 'whyMatters';

      var SECTIONS = [
        { id: 'whyMatters',          icon: '🫂', label: 'Why this matters' },
        { id: 'recognizeDepression', icon: '🌧️', label: 'Recognizing depression' },
        { id: 'crisisSigns',         icon: '🚨', label: 'Crisis warning signs' },
        { id: 'qpr',                 icon: '🧭', label: 'Question · Persuade · Refer' },
        { id: 'whatToSay',           icon: '💬', label: 'What to say' },
        { id: 'tellingAdult',        icon: '🍎', label: 'Telling a trusted adult' },
        { id: 'myths',               icon: '🔍', label: 'Myths debunked' },
        { id: 'resources',           icon: '☎️', label: 'Crisis resources' },
        { id: 'selfCare',            icon: '💚', label: 'Caring for yourself' },
        { id: 'practice',            icon: '🎭', label: 'Practice' }
      ];

      // Track which sections have been visited (for progress badge persistence)
      var badges = d.badges || {};
      function markVisited(id) {
        if (!badges[id]) {
          var nb = Object.assign({}, badges); nb[id] = true;
          upd('badges', nb);
          lsSet('crisisCompanion.badges.v1', nb);
        }
      }

      function setSection(id) {
        upd('section', id);
        markVisited(id);
        announce('Now viewing: ' + (SECTIONS.filter(function(s){return s.id===id;})[0] || {}).label);
      }

      // ══════════════════════════════════════════════════════════════
      // ── CONTENT WARNING GATE ──
      // ══════════════════════════════════════════════════════════════
      if (!consented) {
        return h('div', { className: 'selh-crisiscompanion', style: { padding: '24px', maxWidth: '640px', margin: '0 auto', color: SLATE_TEXT } },
          h('div', { style: { background: '#fff', border: '3px solid ' + AMBER, borderRadius: '16px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid #e5e7eb', marginBottom: '14px' } },
              h('span', { style: { fontSize: '38px' }, 'aria-hidden': 'true' }, '⚠️'),
              h('h1', { style: { fontSize: '20px', fontWeight: 800, color: '#92400e', margin: 0 } }, 'Content note before you continue')
            ),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 12px' } },
              'This module is about what to do if a friend is depressed, in crisis, or thinking about hurting themselves — including suicide. It covers:'),
            h('ul', { style: { fontSize: '13px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 14px', paddingLeft: '22px' } },
              h('li', null, 'Recognizing signs of depression in a friend'),
              h('li', null, 'Crisis warning signs — at a general level, not detailed instructions'),
              h('li', null, 'How to ask, listen, and respond'),
              h('li', null, 'How and when to tell a trusted adult'),
              h('li', null, 'Crisis helplines and what to say when you call'),
              h('li', null, 'How to take care of yourself when you\'ve supported a friend')
            ),
            h('div', { style: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', marginBottom: '14px' } },
              h('p', { style: { fontSize: '13px', lineHeight: 1.6, color: SLATE_TEXT, margin: 0 } },
                h('strong', { style: { color: '#1e40af' } }, 'What this module does NOT include: '),
                'specific methods of self-harm, descriptions of suicide attempts, "before/after" stories, or any content that could function as a how-to. The information is intentionally general — focused on awareness, support, and connecting people to help.')
            ),
            h('div', { style: { background: AMBER_LIGHT, border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px', marginBottom: '18px' } },
              h('p', { style: { fontSize: '13px', lineHeight: 1.6, color: '#78350f', margin: '0 0 8px' } },
                h('strong', null, 'If reading about these topics is hard for you right now, '),
                'please consider one of these instead:'),
              h('ul', { style: { fontSize: '13px', color: '#78350f', margin: 0, paddingLeft: '22px', lineHeight: 1.7 } },
                h('li', null, 'Talk with a trusted adult before continuing — a school counselor, parent, or teacher'),
                h('li', null, 'Skip this module and explore other SEL Hub tools'),
                h('li', null, 'Call or text ', h('strong', { style: { fontFamily: 'monospace' } }, '988'), ' — the 988 Suicide & Crisis Lifeline (free, confidential, 24/7)'),
                h('li', null, 'Text ', h('strong', { style: { fontFamily: 'monospace' } }, 'HOME to 741741'), ' — Crisis Text Line (free, confidential, 24/7)')
              )
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
              h('button', {
                onClick: function() { upd('consented', true); markVisited('whyMatters'); announce('Continuing into Crisis Companion'); },
                'aria-label': 'I understand the content note and want to continue into Crisis Companion',
                style: { padding: '14px 18px', background: TEAL, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 3px 10px rgba(13,148,136,0.3)' }
              }, '✓ I understand — continue'),
              h('button', {
                onClick: function() { addToast('Returning to SEL Hub menu'); if (ctx.setSelHubTool) ctx.setSelHubTool(null); },
                'aria-label': 'Take me back to the SEL Hub menu without continuing',
                style: { padding: '12px 18px', background: '#f1f5f9', color: SLATE_TEXT, border: '2px solid #cbd5e1', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }
              }, '← Take me back to the menu')
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // ── SHARED COMPONENTS (post-gate) ──
      // ══════════════════════════════════════════════════════════════

      // Section navigation strip — like a tab bar with progress
      var visitedCount = SECTIONS.filter(function(s) { return badges[s.id]; }).length;

      function navStrip() {
        return h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '12px', padding: '10px 12px', marginBottom: '14px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Crisis Companion'),
            h('div', { style: { fontSize: '11px', color: TEAL_DARK, fontWeight: 600 } }, visitedCount + ' / ' + SECTIONS.length + ' sections visited')
          ),
          h('div', { 'role': 'tablist', 'aria-label': 'Crisis Companion sections', style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
            SECTIONS.map(function(s) {
              var sel = (section === s.id);
              var visited = !!badges[s.id];
              return h('button', {
                key: s.id,
                role: 'tab',
                'aria-selected': sel ? 'true' : 'false',
                'aria-label': s.label + (visited ? ' (visited)' : ''),
                onClick: function() { setSection(s.id); },
                style: {
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '2px solid ' + (sel ? TEAL_DARK : (visited ? TEAL : '#e2e8f0')),
                  background: sel ? TEAL : (visited ? '#fff' : '#f8fafc'),
                  color: sel ? '#fff' : (visited ? TEAL_DARK : SLATE_MID),
                  fontSize: '12px',
                  fontWeight: sel ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }
              },
                h('span', { 'aria-hidden': 'true' }, s.icon),
                h('span', null, s.label)
              );
            })
          )
        );
      }

      // Hero banner per section
      function sectionHero(s) {
        return h('div', { style: { background: 'linear-gradient(135deg, ' + TEAL + ', ' + EMERALD_DARK + ')', color: '#fff', borderRadius: '14px', padding: '18px 20px', marginBottom: '14px', boxShadow: '0 4px 14px rgba(13,148,136,0.25)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
            h('span', { style: { fontSize: '36px' }, 'aria-hidden': 'true' }, s.icon),
            h('h1', { style: { fontSize: '22px', fontWeight: 800, margin: 0 } }, s.label)
          )
        );
      }

      // Reusable next-section button at bottom of each module
      function nextButton() {
        var idx = SECTIONS.findIndex(function(s) { return s.id === section; });
        if (idx < 0 || idx === SECTIONS.length - 1) return null;
        var nextSec = SECTIONS[idx + 1];
        return h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '12px' } },
          h('button', {
            onClick: function() { setSection(nextSec.id); },
            style: { padding: '10px 18px', background: TEAL, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }
          }, 'Next: ' + nextSec.label + ' →')
        );
      }

      // Reusable card component for content sections
      function card(title, body, accentColor) {
        var c = accentColor || TEAL;
        return h('div', { style: { background: '#fff', border: '2px solid ' + (c === TEAL ? TEAL_BORDER : '#e5e7eb'), borderLeft: '6px solid ' + c, borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' } },
          h('h3', { style: { fontSize: '14px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' } }, title),
          body
        );
      }

      // Wrapper that always includes the crisis bar at top and bottom
      function withCrisisBars(content) {
        return h('div', null,
          CrisisBar(h, band),
          content,
          h('div', { style: { marginTop: '16px' } }, CrisisBar(h, band))
        );
      }

      // ══════════════════════════════════════════════════════════════
      // ── SECTION CONTENT ──
      // ══════════════════════════════════════════════════════════════

      var content = null;

      // ─── Section 1: Why this matters ───
      if (section === 'whyMatters') {
        content = h('div', null,
          sectionHero({ icon: '🫂', label: 'Why this matters' }),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 12px' } },
              'You don\'t have to be a counselor. You don\'t have to know what to say. You don\'t have to fix anything.'),
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 12px' } },
              h('strong', null, 'You have to be a person who notices, '),
              'and a person who tells an adult. That\'s it. Both of those skills can be learned, and both of them save lives.'),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: SLATE_MID, margin: 0 } },
              'Friends are usually the first to notice when something is wrong. Adults often miss the early signs because adolescents share more openly with friends than with parents or teachers. That\'s not a problem — that\'s the natural shape of friendship at your age. It just means your role matters.')
          ),
          card('What this module teaches',
            h('ul', { style: { fontSize: '14px', lineHeight: 1.7, color: SLATE_TEXT, margin: 0, paddingLeft: '22px' } },
              h('li', null, 'How to recognize when a friend\'s mood or behavior pattern is moving toward depression'),
              h('li', null, 'How to recognize warning signs of crisis — including thoughts of suicide'),
              h('li', null, 'How to ask, listen, and respond — including the words that help and the words that don\'t'),
              h('li', null, 'How to tell a trusted adult — when, who, and how'),
              h('li', null, 'Crisis resources you can call or text any time — for your friend or for yourself'),
              h('li', null, 'How to take care of yourself when you\'ve supported a friend through something heavy')
            )
          ),
          card('What this module does NOT do',
            h('ul', { style: { fontSize: '13px', lineHeight: 1.7, color: SLATE_MID, margin: 0, paddingLeft: '22px' } },
              h('li', null, 'It does not turn you into a therapist. Your role is presence and connecting them to help.'),
              h('li', null, 'It does not require you to keep secrets. If safety is involved, telling an adult is loyalty, not betrayal.'),
              h('li', null, 'It does not describe specific methods of self-harm. We are deliberately general about warning behaviors.'),
              h('li', null, 'It does not replace professional help. It teaches you to be a bridge to professional help.')
            ),
            EMERALD
          ),
          h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '10px', padding: '14px' } },
            h('div', { style: { fontSize: '12px', fontWeight: 700, color: TEAL_DARK, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' } }, 'Sources & framework'),
            h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } },
              'This module aligns with safe-messaging guidelines from AFSP (afsp.org), SAMHSA, the Reporting on Suicide media guidelines (reportingonsuicide.org), Sources of Strength (sourcesofstrength.org), the QPR Institute, NIMH, and AAP adolescent health guidance. It was designed by a school psychologist for use with middle- and high-school students, with editorial review against safe-messaging guidelines.')
          ),
          nextButton()
        );
      }

      // ─── Section 2: Recognizing depression ───
      else if (section === 'recognizeDepression') {
        content = h('div', null,
          sectionHero({ icon: '🌧️', label: 'Recognizing depression in a friend' }),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
              'Every kid has bad days. Every kid has a hard week now and then. That\'s being human, not depression.'),
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
              h('strong', null, 'Depression is a PATTERN. '),
              'It\'s a cluster of changes that lasts for weeks, not a single bad day. The signs below are worth taking seriously when SEVERAL of them are happening together AND when they\'ve persisted longer than a normal rough patch.'),
            h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: SLATE_MID, margin: 0, fontStyle: 'italic' } },
              'A useful question to keep in mind: "Is this pattern of changes lasting longer, getting worse, or getting in the way of their daily life?"')
          ),
          h('div', { style: { fontSize: '12px', fontWeight: 700, color: SLATE_MID, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, 'Patterns to notice (over weeks, not days)'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginBottom: '14px' } },
            DEPRESSION_PATTERNS.map(function(p) {
              return h('div', { key: p.id, style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderRadius: '12px', padding: '12px 14px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
                  h('span', { style: { fontSize: '24px' }, 'aria-hidden': 'true' }, p.icon),
                  h('h3', { style: { fontSize: '14px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, p.label)
                ),
                h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.6, margin: 0 } }, p.desc)
              );
            })
          ),
          h('div', { style: { background: AMBER_LIGHT, border: '2px solid #fcd34d', borderRadius: '12px', padding: '14px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '10px' } },
              h('span', { style: { fontSize: '24px', flexShrink: 0 }, 'aria-hidden': 'true' }, '⚠️'),
              h('div', null,
                h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#78350f', marginBottom: '6px' } }, 'Important nuance'),
                h('p', { style: { fontSize: '13px', color: '#78350f', lineHeight: 1.7, margin: '0 0 8px' } },
                  'In adolescents especially, depression often shows up as IRRITABILITY rather than sadness. A friend who\'s been snappy for weeks, raw at small things, or looking like they\'re burning at low temperature could be struggling more than someone who\'s visibly sad.'),
                h('p', { style: { fontSize: '13px', color: '#78350f', lineHeight: 1.7, margin: 0 } },
                  'Boys, athletes, kids of color, larger-bodied kids, and high-achievers are often missed because they don\'t match the stereotype of "depressed teenager." Take the cluster of changes seriously regardless of how the friend looks.')
              )
            )
          ),
          card('What to do if you\'re seeing the pattern',
            h('ul', { style: { fontSize: '14px', lineHeight: 1.7, color: SLATE_TEXT, margin: 0, paddingLeft: '22px' } },
              h('li', null, 'Reach out. Send a text. Sit next to them at lunch. The signal you\'re paying attention matters.'),
              h('li', null, 'Ask gently and specifically: "I\'ve noticed you\'ve seemed really tired and quiet lately. How are you really doing?"'),
              h('li', null, 'Listen. Don\'t fix. Most people don\'t want a solution; they want to feel less alone.'),
              h('li', null, 'If they share something heavy, that\'s a moment to ask the harder question (next section: crisis warning signs).'),
              h('li', null, 'If you\'re worried about them, tell a trusted adult. You don\'t need certainty. Concern is enough.')
            )
          ),
          nextButton()
        );
      }

      // ─── Section 3: Crisis warning signs (most safety-sensitive) ───
      else if (section === 'crisisSigns') {
        content = h('div', null,
          sectionHero({ icon: '🚨', label: 'Crisis warning signs' }),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
              'When depression deepens into crisis — including thoughts of suicide — there are usually warning signs. The American Foundation for Suicide Prevention (AFSP) groups these into three buckets: ',
              h('strong', { style: { color: TEAL_DARK } }, 'TALK'), ', ',
              h('strong', { style: { color: TEAL_DARK } }, 'MOOD'), ', and ',
              h('strong', { style: { color: TEAL_DARK } }, 'BEHAVIOR'), '.'),
            h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: SLATE_MID, margin: '0 0 8px', fontStyle: 'italic' } },
              'A note about how this section is written: we deliberately do NOT list specific behaviors that could function as a how-to checklist. The general categories are enough for a friend to recognize that something is wrong. If you see a cluster of these, that\'s the moment to act — not the moment to investigate further on your own.')
          ),
          ['talk', 'mood', 'behavior'].map(function(k) {
            var sg = CRISIS_SIGNS[k];
            return h('div', { key: k, style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderLeft: '6px solid ' + TEAL, borderRadius: '12px', padding: '16px', marginBottom: '12px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
                h('span', { style: { fontSize: '30px' }, 'aria-hidden': 'true' }, sg.icon),
                h('h3', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, sg.title)
              ),
              h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 10px' } }, sg.desc),
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: SLATE_MID, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' } }, 'Examples'),
              h('ul', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 10px', paddingLeft: '20px' } },
                sg.examples.map(function(ex, i) { return h('li', { key: i }, ex); })
              ),
              h('div', { style: { background: TEAL_LIGHT, padding: '10px 12px', borderRadius: '8px', fontSize: '13px', color: TEAL_DARK, lineHeight: 1.7 } },
                h('strong', null, 'Note: '), sg.note)
            );
          }),
          h('div', { style: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '12px', padding: '14px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '10px' } },
              h('span', { style: { fontSize: '24px', flexShrink: 0 }, 'aria-hidden': 'true' }, '⚠️'),
              h('div', null,
                h('div', { style: { fontSize: '14px', fontWeight: 800, color: '#991b1b', marginBottom: '6px' } }, 'If you see ANY of these signs, the next moves are:'),
                h('ol', { style: { fontSize: '13px', color: '#7f1d1d', lineHeight: 1.7, margin: 0, paddingLeft: '22px' } },
                  h('li', null, h('strong', null, 'Stay with them if you can. '), 'Don\'t leave them alone if they\'re in immediate distress.'),
                  h('li', null, h('strong', null, 'Ask directly. '), '"Are you thinking about hurting yourself?" Asking does NOT plant the idea (next section explains the research).'),
                  h('li', null, h('strong', null, 'Tell a trusted adult — today. '), 'Not next week. Today.'),
                  h('li', null, h('strong', null, 'Call or text 988 '), 'if you\'re unsure what to do — they\'ll guide YOU through helping your friend.'),
                  h('li', null, h('strong', null, 'Call 911 '), 'if your friend is in immediate physical danger right now.')
                )
              )
            )
          ),
          nextButton()
        );
      }

      // ─── Section 4: QPR (Question · Persuade · Refer) ───
      else if (section === 'qpr') {
        content = h('div', null,
          sectionHero({ icon: '🧭', label: 'Question · Persuade · Refer' }),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
              'QPR (',
              h('strong', null, 'Question, Persuade, Refer'),
              ') is the most widely-taught suicide-prevention framework for non-professionals. It\'s used in schools, hospitals, and community programs around the world. The framework is simple on purpose: three steps, and each one is something a friend can do.'),
            h('p', { style: { fontSize: '13px', color: SLATE_MID, lineHeight: 1.7, margin: 0, fontStyle: 'italic' } },
              'You\'re not the therapist. You\'re the link between someone struggling and the people trained to help. That link is exactly what saves lives.')
          ),
          // Q
          h('div', { style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderLeft: '6px solid ' + TEAL, borderRadius: '12px', padding: '16px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
              h('div', { style: { width: '42px', height: '42px', borderRadius: '50%', background: TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 } }, 'Q'),
              h('h3', { style: { fontSize: '17px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, 'Question — ask directly')
            ),
            h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 8px' } },
              'If you suspect your friend is thinking about suicide, ask. Directly and gently. The exact words matter less than the willingness to ask.'),
            h('div', { style: { background: TEAL_LIGHT, padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: TEAL_DARK, lineHeight: 1.7, marginBottom: '8px' } },
              h('strong', null, 'Examples: '),
              '"Are you thinking about hurting yourself?" · "Are you having thoughts of suicide?" · "Are you thinking about ending your life?"'),
            h('div', { style: { background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', color: '#1e40af', lineHeight: 1.7 } },
              h('strong', null, '🔬 The most-cited barrier to asking is wrong: '),
              'Asking does NOT plant the idea. Multiple meta-analyses (Dazzi et al., 2014, Psychological Medicine) and decades of research from AFSP, NIMH, and QPR Institute confirm: asking directly is protective. It often comes as a relief — the person was waiting for someone to notice.')
          ),
          // P
          h('div', { style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderLeft: '6px solid ' + TEAL, borderRadius: '12px', padding: '16px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
              h('div', { style: { width: '42px', height: '42px', borderRadius: '50%', background: TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 } }, 'P'),
              h('h3', { style: { fontSize: '17px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, 'Persuade — listen and stay')
            ),
            h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 8px' } },
              '"Persuade" doesn\'t mean talking them out of how they feel. It means listening fully, validating that this is hard, and helping them say YES to getting help.'),
            h('ul', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 8px', paddingLeft: '22px' } },
              h('li', null, h('strong', null, 'Listen without judgment. '), 'Don\'t debate. Don\'t minimize. Don\'t one-up with your own story.'),
              h('li', null, h('strong', null, 'Reflect. '), '"It sounds like you\'ve been carrying so much, and you\'re exhausted." Letting them feel heard is the medicine.'),
              h('li', null, h('strong', null, 'Don\'t promise secrecy. '), 'You can say: "I care about you too much to keep this to myself. I want us to talk to someone who can really help."'),
              h('li', null, h('strong', null, 'Stay with them. '), 'Don\'t leave them alone if they\'re in immediate distress. Sit. Walk. Just be present.')
            ),
            h('div', { style: { background: '#fff7ed', border: '1px solid #fdba74', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', color: '#9a3412', lineHeight: 1.7 } },
              h('strong', null, '⚠ Skip the "promise me" trap: '),
              'Don\'t ask them to "promise" they won\'t do anything. It puts them in the position of making a promise they may not be able to keep, which adds shame. Instead: "I want you to be safe. Let\'s find help right now, together."')
          ),
          // R
          h('div', { style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderLeft: '6px solid ' + TEAL, borderRadius: '12px', padding: '16px', marginBottom: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
              h('div', { style: { width: '42px', height: '42px', borderRadius: '50%', background: TEAL, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800 } }, 'R'),
              h('h3', { style: { fontSize: '17px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, 'Refer — connect them to help')
            ),
            h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 8px' } },
              '"Refer" means getting them to someone who can do more than you can. This is the part where YOU are not alone either.'),
            h('ul', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 8px', paddingLeft: '22px' } },
              h('li', null, 'Best: walk with them to a school counselor, school psychologist, or trusted adult. Right now.'),
              h('li', null, 'If that\'s not possible: call 988 together (or sit with them while they call/text). 988 is for the person at risk AND for the friend who\'s helping.'),
              h('li', null, 'If they refuse to tell anyone: ',
                h('strong', null, 'tell an adult yourself. '),
                'You\'re not breaking trust — you\'re acting on the loyalty their crisis deserves. They will probably be relieved later.'),
              h('li', null, 'If immediate physical danger: 911. Not next week. Now.')
            )
          ),
          h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '10px', padding: '14px' } },
            h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } },
              h('strong', { style: { color: TEAL_DARK } }, 'The whole framework in one sentence: '),
              'Ask directly, listen fully, and bring in an adult who can help.')
          ),
          nextButton()
        );
      }

      // ─── Section 5: What to say (and what NOT to say) ───
      else if (section === 'whatToSay') {
        content = h('div', null,
          sectionHero({ icon: '💬', label: 'What to say (and what not to say)' }),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
              'You don\'t need a perfect script. You don\'t need to be wise. You need to be present, honest, and willing to bring an adult in. The wording below is example-level — your real conversation will be your own words.'),
            h('p', { style: { fontSize: '13px', color: SLATE_MID, lineHeight: 1.7, margin: 0, fontStyle: 'italic' } },
              'A useful frame: would what I\'m about to say make my friend feel MORE safe to keep talking, or LESS?')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px', marginBottom: '12px' } },
            // ✓ Things that help
            h('div', null,
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' } },
                h('span', { style: { fontSize: '22px', color: EMERALD }, 'aria-hidden': 'true' }, '✓'),
                h('h2', { style: { fontSize: '15px', fontWeight: 800, color: EMERALD_DARK, margin: 0 } }, 'These help')
              ),
              SAY_DO.map(function(it, i) {
                return h('div', { key: i, style: { background: '#f0fdf4', border: '2px solid ' + EMERALD, borderRadius: '10px', padding: '12px', marginBottom: '8px' } },
                  h('div', { style: { fontSize: '13px', fontWeight: 700, color: EMERALD_DARK, marginBottom: '6px' } }, it.say),
                  h('p', { style: { fontSize: '12px', color: SLATE_TEXT, lineHeight: 1.6, margin: 0 } }, h('strong', null, 'Why: '), it.why)
                );
              })
            ),
            // × Things that don't help
            h('div', null,
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' } },
                h('span', { style: { fontSize: '22px', color: ROSE }, 'aria-hidden': 'true' }, '×'),
                h('h2', { style: { fontSize: '15px', fontWeight: 800, color: '#9f1239', margin: 0 } }, 'These don\'t help (even when well-meant)')
              ),
              SAY_DONT.map(function(it, i) {
                return h('div', { key: i, style: { background: ROSE_LIGHT, border: '2px solid ' + ROSE, borderRadius: '10px', padding: '12px', marginBottom: '8px' } },
                  h('div', { style: { fontSize: '13px', fontWeight: 700, color: '#9f1239', marginBottom: '6px' } }, it.say),
                  h('p', { style: { fontSize: '12px', color: SLATE_TEXT, lineHeight: 1.6, margin: 0 } }, h('strong', null, 'Why: '), it.why)
                );
              })
            )
          ),
          h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '10px', padding: '14px' } },
            h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } },
              h('strong', { style: { color: TEAL_DARK } }, 'If you said one of the "don\'t" things in the past — '),
              'that\'s OK. You didn\'t know. None of us were born knowing this. Now you have other words. The next conversation can be different.')
          ),
          nextButton()
        );
      }

      // ─── Section 6: Telling a trusted adult (load-bearing skill) ───
      else if (section === 'tellingAdult') {
        content = h('div', null,
          sectionHero({ icon: '🍎', label: 'Telling a trusted adult' }),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
              h('strong', null, 'This is the most important skill in the whole module. '),
              'Telling an adult is what turns your concern into help that actually changes the outcome. It is the load-bearing move — the moment that lets professionals do what they\'re trained to do.')
          ),
          h('div', { style: { background: '#f0fdf4', border: '2px solid ' + EMERALD, borderRadius: '12px', padding: '16px', marginBottom: '12px' } },
            h('h2', { style: { fontSize: '16px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 8px' } }, 'Loyalty, not betrayal'),
            h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 8px' } },
              'A friend in crisis may ask you not to tell anyone. They may make you promise. They may be scared, ashamed, or convinced it will make things worse.'),
            h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } },
              h('strong', null, 'Tell anyway. '),
              'Safety overrides secrecy. Telling an adult when a friend\'s life or wellbeing is at risk is the most loyal thing a friend can do. Most people who are protected this way are GRATEFUL afterward — even when they were upset in the moment. The friendship can survive a hard conversation; it cannot survive losing the friend.')
          ),
          h('div', { style: { fontSize: '13px', fontWeight: 700, color: SLATE_MID, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, 'When to tell — every time'),
          h('div', { style: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '14px', marginBottom: '12px' } },
            h('ul', { style: { fontSize: '14px', color: '#7f1d1d', lineHeight: 1.7, margin: 0, paddingLeft: '22px' } },
              h('li', null, 'Your friend mentioned wanting to die, hurt themselves, or end their life — even casually'),
              h('li', null, 'You\'re seeing a cluster of crisis warning signs (TALK / MOOD / BEHAVIOR)'),
              h('li', null, 'Your friend has a plan, a means, or a timeline — even if vague'),
              h('li', null, 'Your friend has hurt themselves, even slightly'),
              h('li', null, 'You\'re scared and you don\'t know what to do — that itself is enough reason to tell')
            )
          ),
          h('div', { style: { fontSize: '13px', fontWeight: 700, color: SLATE_MID, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, 'Who to tell — pick whoever you can reach fastest'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px', marginBottom: '14px' } },
            TRUSTED_ADULTS.map(function(a, i) {
              return h('div', { key: i, style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderRadius: '12px', padding: '12px 14px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
                  h('span', { style: { fontSize: '22px' }, 'aria-hidden': 'true' }, a.icon),
                  h('h3', { style: { fontSize: '14px', fontWeight: 800, color: TEAL_DARK, margin: 0 } }, a.label)
                ),
                h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.6, margin: '0 0 6px' } }, h('strong', null, 'Why: '), a.pro),
                h('p', { style: { fontSize: '12px', color: SLATE_MID, lineHeight: 1.6, margin: 0, fontStyle: 'italic' } }, h('strong', null, 'How: '), a.how)
              );
            })
          ),
          card('How to tell — practical moves',
            h('ul', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0, paddingLeft: '22px' } },
              h('li', null, 'You don\'t need a script. "I need help with something serious about a friend" is enough.'),
              h('li', null, 'You can write it down if you can\'t say it out loud. A note, a text, an email all work.'),
              h('li', null, 'You can ask another friend to come with you to the counselor\'s office.'),
              h('li', null, 'You can leave class to do this. Tell the teacher: "I need to see the counselor — it\'s urgent." Most teachers will let you go without questions.'),
              h('li', null, 'If the first adult doesn\'t take you seriously — and that does happen — try another. Keep going until someone listens.'),
              h('li', null, 'If it\'s outside school hours, call 988. They\'ll help you figure out what to do.')
            ),
            EMERALD
          ),
          h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '10px', padding: '14px' } },
            h('div', { style: { fontSize: '13px', fontWeight: 700, color: TEAL_DARK, marginBottom: '4px' } }, '🍎 In Maine schools'),
            h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } },
              'School counselors and school psychologists are mandated reporters — they are legally required to act on safety concerns. They will NOT just tell your parents and walk away. They will follow a protocol that includes assessing your friend, contacting their family safely, and connecting them to ongoing care. Mandated reporting is a guard rail, not a punishment.')
          ),
          nextButton()
        );
      }

      // ─── Section 7: Myths debunked ───
      else if (section === 'myths') {
        var picks = d.mythPicks || {};

        function pickMyth(idx, choice) {
          if (picks[idx] != null) return;
          var nm = Object.assign({}, picks); nm[idx] = choice;
          upd('mythPicks', nm);
          announce(choice === 0 ? 'Marked as myth — correct' : 'Marked as truth — but research says this is a myth');
        }

        var totalAnswered = Object.keys(picks).length;
        var correctCount = Object.keys(picks).filter(function(k) { return picks[k] === 0; }).length;

        content = h('div', null,
          sectionHero({ icon: '🔍', label: 'Myths debunked' }),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
              'Six of the most-cited myths that prevent people from helping a friend in crisis. For each one, decide: is the claim a MYTH or a TRUTH? Then read the evidence-based answer with citations.'),
            h('p', { style: { fontSize: '13px', color: SLATE_MID, lineHeight: 1.7, margin: 0, fontStyle: 'italic' } },
              'Score so far: ' + correctCount + ' / ' + totalAnswered + ' answered correctly.')
          ),
          MYTHS.map(function(m, i) {
            var picked = picks[i];
            var revealed = picked != null;
            return h('div', { key: i, style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderRadius: '12px', padding: '16px', marginBottom: '12px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: SLATE_MID, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' } }, 'Myth ' + (i + 1) + ' of ' + MYTHS.length),
              h('div', { style: { background: '#f1f5f9', borderLeft: '4px solid #94a3b8', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px' } },
                h('p', { style: { fontSize: '14px', fontStyle: 'italic', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } }, '"' + m.claim + '"')
              ),
              !revealed && h('div', { 'role': 'radiogroup', 'aria-label': m.claim, style: { display: 'flex', gap: '8px', marginBottom: '10px' } },
                h('button', {
                  onClick: function() { pickMyth(i, 0); },
                  role: 'radio', 'aria-checked': 'false',
                  style: { flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb', background: '#fff', color: SLATE_TEXT, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
                }, 'This is a MYTH'),
                h('button', {
                  onClick: function() { pickMyth(i, 1); },
                  role: 'radio', 'aria-checked': 'false',
                  style: { flex: 1, padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb', background: '#fff', color: SLATE_TEXT, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }
                }, 'This is TRUE')
              ),
              revealed && h('div', { 'aria-live': 'polite' },
                h('div', { style: { padding: '10px 12px', background: picked === 0 ? '#f0fdf4' : '#fff7ed', border: '1px solid ' + (picked === 0 ? EMERALD : '#fdba74'), borderRadius: '8px', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: picked === 0 ? EMERALD_DARK : '#9a3412' } },
                  picked === 0 ? '✓ Correct — this is a myth.' : '⚠ Common misconception — this is actually a myth.'),
                h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 8px' } },
                  h('strong', { style: { color: TEAL_DARK } }, 'What the evidence says: '),
                  m.truth),
                h('p', { style: { fontSize: '11px', color: SLATE_MID, fontStyle: 'italic', margin: 0, fontFamily: 'monospace' } },
                  'Sources: ' + m.cite)
              )
            );
          }),
          nextButton()
        );
      }

      // ─── Section 8: Crisis resources ───
      else if (section === 'resources') {
        // Render one resource card
        function resourceCard(r) {
          return h('div', { key: r.id, style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderLeft: '6px solid ' + TEAL, borderRadius: '12px', padding: '14px 16px', marginBottom: '10px' } },
            h('div', { style: { fontSize: '15px', fontWeight: 800, color: TEAL_DARK, marginBottom: '4px' } }, r.label),
            h('div', { style: { fontSize: '14px', color: SLATE_TEXT, fontFamily: 'monospace', fontWeight: 700, marginBottom: '8px' } }, r.contact),
            h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.6, margin: '0 0 6px' } }, h('strong', null, 'Who: '), r.who),
            h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.6, margin: '0 0 6px' } }, h('strong', null, 'What: '), r.what),
            h('p', { style: { fontSize: '13px', color: TEAL_DARK, lineHeight: 1.6, margin: '0 0 6px', background: TEAL_LIGHT, padding: '8px 10px', borderRadius: '6px' } },
              h('strong', null, 'What to say: '), r.script),
            r.url && h('div', { style: { fontSize: '12px', color: '#0369a1', fontFamily: 'monospace' } }, '🔗 ', r.url)
          );
        }

        // Render one group header + its resources
        function resourceGroupBlock(g) {
          var resources = CRISIS_RESOURCES.filter(function(r) { return r.group === g.id; });
          if (resources.length === 0) return null;
          return h('div', { key: g.id, style: { marginBottom: '18px' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', borderBottom: '2px solid ' + TEAL_BORDER, paddingBottom: '6px', marginBottom: '12px' } },
              h('h2', { style: { fontSize: '16px', fontWeight: 800, color: TEAL_DARK, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' } }, g.label),
              h('span', { style: { fontSize: '12px', color: SLATE_MID, fontStyle: 'italic' } }, g.desc)
            ),
            resources.map(resourceCard)
          );
        }

        content = h('div', null,
          sectionHero({ icon: '☎️', label: 'Crisis resources' }),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
              'Every resource here is free, confidential, and trained. You can call FOR your friend, WITH your friend, or for yourself. Helplines are not just for the person in crisis — they are also for the friend, parent, or supporter trying to figure out what to do.'),
            h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: '0 0 10px' } },
              'Below: ',
              h('strong', null, 'National'), ' (works anywhere in the U.S.) → ',
              h('strong', null, 'Find your local help'), ' (directory lookups by zip) → ',
              h('strong', null, 'Outside the U.S.?'), ' → ',
              h('strong', null, 'Maine partners'), ' (named local agencies) → ',
              h('strong', null, 'School-based'), '.'),
            h('p', { style: { fontSize: '13px', color: SLATE_MID, lineHeight: 1.7, margin: 0, fontStyle: 'italic' } },
              'You don\'t need to know what to say. They are trained to start the conversation. You can call back. You can hang up. You can\'t do it wrong.')
          ),
          // Render each group in order
          RESOURCE_GROUPS.map(resourceGroupBlock),
          // LGBTQ+ closing note
          h('div', { style: { background: '#f0fdf4', border: '2px solid ' + EMERALD, borderRadius: '12px', padding: '14px' } },
            h('h2', { style: { fontSize: '14px', fontWeight: 800, color: EMERALD_DARK, margin: '0 0 6px' } }, 'A note about LGBTQ+ youth'),
            h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } },
              'Research consistently shows LGBTQ+ youth — and especially transgender youth — face significantly higher rates of suicidal thoughts and attempts than their non-LGBTQ+ peers. The reasons are well-documented: family rejection, school harassment, lack of affirming care, and minority stress. The Trevor Project (1-866-488-7386 / text START to 678-678) is staffed by people specifically trained for these realities. If your friend is LGBTQ+, this resource is built for them.')
          ),
          nextButton()
        );
      }

      // ─── Section 9: Caring for yourself ───
      else if (section === 'selfCare') {
        var careSubtab = d.careSubtab || 'read';
        var SUB_TABS = [
          { id: 'read',     icon: '📖', label: 'Read' },
          { id: 'breath',   icon: '🌬️', label: 'Breathing pacer' },
          { id: 'ground',   icon: '👁️', label: '5-4-3-2-1 grounding' },
          { id: 'toolkit',  icon: '🧰', label: 'My toolkit' },
          { id: 'safety',   icon: '📋', label: 'Safety plan' }
        ];
        function setSub(id) { upd('careSubtab', id); announce('Now viewing: ' + (SUB_TABS.filter(function(t) { return t.id === id; })[0] || {}).label); }
        // Sub-nav strip
        var subNav = h('div', { role: 'tablist', 'aria-label': 'Self-care sub-sections', style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' } },
          SUB_TABS.map(function(t) {
            var sel = (careSubtab === t.id);
            return h('button', {
              key: t.id,
              role: 'tab',
              'aria-selected': sel ? 'true' : 'false',
              'aria-label': t.label,
              onClick: function() { setSub(t.id); },
              style: {
                padding: '8px 14px',
                background: sel ? TEAL : '#fff',
                color: sel ? '#fff' : TEAL_DARK,
                border: '2px solid ' + (sel ? TEAL_DARK : TEAL_BORDER),
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: sel ? 800 : 600,
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }
            }, h('span', { 'aria-hidden': 'true' }, t.icon), h('span', null, t.label));
          })
        );
        // Sub-tab content
        var subContent;
        if (careSubtab === 'breath') {
          subContent = _BreathingPacer(h, d, upd);
        } else if (careSubtab === 'ground') {
          subContent = _GroundingExercise(h, d, upd);
        } else if (careSubtab === 'toolkit') {
          subContent = _CopingToolkit(h, d, upd);
        } else if (careSubtab === 'safety') {
          subContent = _SafetyPlan(h, d, upd);
        } else {
          // Default: Read — the existing static content
          subContent = h('div', null,
            h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
              h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
                'Supporting a friend through a mental-health crisis is heavy. It changes you. Researchers call this ',
                h('em', null, 'secondary stress'),
                ' — the way that being close to someone else\'s pain affects your own well-being. It\'s real, and it deserves attention.'),
              h('p', { style: { fontSize: '13px', color: SLATE_MID, lineHeight: 1.7, margin: 0, fontStyle: 'italic' } },
                'Taking care of yourself is not selfish. It\'s how you stay able to keep showing up.')
            ),
            // Pointer to the interactive tools
            h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' } },
              h('div', { style: { fontSize: '12px', fontWeight: 700, color: TEAL_DARK, marginBottom: '4px' } }, '🧰 Interactive tools above'),
              h('p', { style: { fontSize: '12px', color: SLATE_TEXT, lineHeight: 1.6, margin: 0 } },
                'The tabs at the top of this section have practical tools you can use right now: a guided ',
                h('strong', null, 'breathing pacer'), ', a sensory ',
                h('strong', null, 'grounding exercise'), ', a personal ',
                h('strong', null, 'coping toolkit'), ' you can build, and the evidence-based ',
                h('strong', null, 'Stanley-Brown safety plan'), '. They\'re for you AND for sharing with a friend who\'s struggling.'
              )
            ),
            null  // sentinel, so the comma is harmless before the static cards below
          );
        }
        content = h('div', null,
          sectionHero({ icon: '💚', label: 'Caring for yourself when you\'ve supported a friend' }),
          subNav,
          subContent,
          // Always-visible static support content below the sub-tab area
          careSubtab === 'read' && h('div', null, _renderSelfCareReadingExtras(h)),
          nextButton()
        );
      }

      // ─── Section 10: Practice scenarios ───
      else if (section === 'practice') {
        var practiceIdx = d.practiceIdx != null ? d.practiceIdx : 0;
        var responses = d.practiceResponses || {};

        function chooseResponse(scIdx, rIdx) {
          var key = scIdx;
          if (responses[key] != null) return;
          var nr = Object.assign({}, responses); nr[key] = rIdx;
          upd('practiceResponses', nr);
          var rating = PRACTICE_SCENARIOS[scIdx].responses[rIdx].rating;
          announce(rating === 'helpful' ? 'Helpful response' : rating === 'harmful' ? 'This response could harm — see explanation' : 'Neutral response — see explanation');
        }

        var sc = PRACTICE_SCENARIOS[practiceIdx];
        var picked = responses[practiceIdx];

        content = h('div', null,
          sectionHero({ icon: '🎭', label: 'Practice — three scenarios' }),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('p', { style: { fontSize: '15px', lineHeight: 1.7, color: SLATE_TEXT, margin: '0 0 10px' } },
              'Three short scenarios drawn from typical adolescent experience. For each, pick the response you think would help most. There\'s no perfect answer — just answers that are more or less helpful in context. Modeled on Sources of Strength practice protocols.')
          ),
          // Scenario picker
          h('div', { style: { display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' } },
            PRACTICE_SCENARIOS.map(function(s, i) {
              var sel = (practiceIdx === i);
              var done = responses[i] != null;
              return h('button', {
                key: s.id,
                onClick: function() { upd('practiceIdx', i); announce('Loaded scenario: ' + s.title); },
                'aria-pressed': sel ? 'true' : 'false',
                style: { padding: '8px 14px', borderRadius: '10px', border: '2px solid ' + (sel ? TEAL_DARK : TEAL_BORDER), background: sel ? TEAL : '#fff', color: sel ? '#fff' : TEAL_DARK, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
              }, 'Scenario ' + (i + 1), done ? ' ✓' : '');
            })
          ),
          // Scenario card
          h('div', { style: { background: '#fff', border: '2px solid ' + TEAL_BORDER, borderRadius: '12px', padding: '18px', marginBottom: '12px' } },
            h('h2', { style: { fontSize: '17px', fontWeight: 800, color: TEAL_DARK, margin: '0 0 8px' } }, sc.title),
            h('div', { style: { background: SLATE_BG, borderLeft: '4px solid ' + TEAL, padding: '12px 14px', borderRadius: '6px', marginBottom: '14px' } },
              h('p', { style: { fontSize: '14px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } }, sc.setting)
            ),
            h('div', { style: { fontSize: '13px', fontWeight: 700, color: SLATE_MID, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } }, 'How would you respond?'),
            h('div', { 'role': 'radiogroup', 'aria-label': sc.title, style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              sc.responses.map(function(r, ri) {
                var sel = (picked === ri);
                var revealed = picked != null;
                var bg = '#fff'; var border = '#e5e7eb'; var text = SLATE_TEXT;
                if (revealed) {
                  if (r.rating === 'helpful') { bg = '#f0fdf4'; border = EMERALD; text = EMERALD_DARK; }
                  else if (r.rating === 'harmful') { bg = ROSE_LIGHT; border = ROSE; text = '#9f1239'; }
                  else { bg = '#fff7ed'; border = '#fdba74'; text = '#9a3412'; }
                }
                return h('button', {
                  key: ri,
                  onClick: function() { chooseResponse(practiceIdx, ri); },
                  role: 'radio', 'aria-checked': sel ? 'true' : 'false',
                  'aria-disabled': revealed ? 'true' : 'false',
                  style: { textAlign: 'left', padding: '12px 14px', background: bg, border: '2px solid ' + border, borderRadius: '10px', cursor: revealed ? 'default' : 'pointer', color: text, fontSize: '13px', lineHeight: 1.6 }
                },
                  h('div', { style: { fontWeight: 700, marginBottom: revealed ? '8px' : 0 } }, r.text),
                  revealed && h('div', { style: { fontSize: '12px', lineHeight: 1.6, fontWeight: 400, fontStyle: 'italic' } },
                    r.rating === 'helpful' ? '✓ Helpful — ' : r.rating === 'harmful' ? '× Harmful — ' : '~ Neutral — ',
                    r.why
                  )
                );
              })
            )
          ),
          h('div', { style: { background: TEAL_LIGHT, border: '1px solid ' + TEAL_BORDER, borderRadius: '10px', padding: '14px' } },
            h('p', { style: { fontSize: '13px', color: SLATE_TEXT, lineHeight: 1.7, margin: 0 } },
              h('strong', { style: { color: TEAL_DARK } }, 'A note on practice: '),
              'Real conversations are messier than scripted scenarios. The point of practice isn\'t to memorize lines — it\'s to develop the INSTINCT to ask, listen, stay, and tell. With practice, that instinct gets faster.')
            )
        );
      }

      // ── Final view: wrap content with crisis bars + nav strip ──
      return h('div', { className: 'selh-crisiscompanion', style: { padding: '16px', maxWidth: '900px', margin: '0 auto', color: SLATE_TEXT, fontFamily: 'system-ui, -apple-system, sans-serif' } },
        navStrip(),
        withCrisisBars(content || h('div', null, 'Loading…'))
      );
    }
  });

})();
