// ═══════════════════════════════════════════════════════════════
// sel_tool_traumapsychoed.js — Trauma Psychoeducation
// A trauma-informed PSYCHOEDUCATION tool. Explains what trauma is,
// the neurobiology in plain English, common responses (reframed
// as adaptations not disorders), SAMHSA's 6 principles of trauma-
// informed care, pathways to healing, and where to find support.
//
// EXPLICITLY NOT A SCREENER. Does not include an ACEs questionnaire
// or any quantitative trauma assessment. Surfacing trauma without
// clinical follow-up is iatrogenic and unsafe.
//
// Sources: SAMHSA, NCTSN, van der Kolk, Bessel A. van der Kolk;
// Resmaa Menakem (somatic + racialized trauma); Judith Herman
// (Trauma and Recovery, the foundational text); Bonnie Burstow
// (critique of pathologizing frameworks).
//
// Registered tool ID: "traumaPsychoed"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('traumaPsychoed'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-trauma')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-trauma';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Types of trauma
  var TRAUMA_TYPES = [
    { id: 'acute', label: 'Acute trauma', icon: '⚡',
      what: 'A single, time-limited event: a car accident, a sudden death, an assault, a natural disaster, witnessing violence one time. The trauma is bounded in time even if its effects last.' },
    { id: 'chronic', label: 'Chronic trauma', icon: '🔁',
      what: 'Repeated, prolonged events: ongoing abuse, long-term bullying, repeated medical procedures, sustained violence in the community. The body learns to expect threat.' },
    { id: 'complex', label: 'Complex trauma (C-PTSD)', icon: '🪢',
      what: 'Multiple traumatic events, often beginning in childhood, often involving caregivers or trusted adults. Different from PTSD in important ways: more about disrupted attachment, identity, and emotional regulation than discrete flashbacks.' },
    { id: 'developmental', label: 'Developmental trauma', icon: '🌱',
      what: 'Trauma in early childhood that shapes brain development. Bessel van der Kolk and others have argued this deserves its own diagnostic category because adverse experiences in the first years of life affect the developing brain differently than later trauma.' },
    { id: 'intergenerational', label: 'Intergenerational trauma', icon: '🧬',
      what: 'Trauma that is passed across generations: families whose grandparents survived genocide, families with patterns of abuse, families navigating the long shadows of slavery, war, displacement. Research is increasingly showing epigenetic mechanisms in addition to learned patterns.' },
    { id: 'historical', label: 'Historical / collective trauma', icon: '🌍',
      what: 'Trauma carried by entire peoples through generations: the Indigenous experience of colonization, the African-American experience of slavery and its aftermath, the Holocaust, refugee experiences, the trauma of poverty across generations.' },
    { id: 'systemic', label: 'Systemic / racialized trauma', icon: '⚖️',
      what: 'The cumulative effect of living in systems that treat you as less than. Racial profiling. Disability discrimination. Anti-LGBTQ violence and erasure. The body keeps receiving signals of threat and devaluation. Resmaa Menakem\'s work in this area is essential.' },
    { id: 'witnessing', label: 'Vicarious / witnessing trauma', icon: '👁️',
      what: 'The trauma of witnessing harm done to others: a sibling abused, a friend assaulted, a community member killed by police, repeated exposure to news of mass violence. Real and clinically distinct.' }
  ];

  // SAMHSA's 6 principles of trauma-informed care
  var SAMHSA_PRINCIPLES = [
    { id: 'safety', label: 'Safety', icon: '🛡️', color: '#22c55e',
      what: 'Physical AND emotional safety. People feel safe in the building, with the staff, with the procedures. The environment is predictable. People are not made to feel like they could be punished or shamed unexpectedly.' },
    { id: 'trust', label: 'Trustworthiness & Transparency', icon: '🤝', color: '#0ea5e9',
      what: 'Decisions are made transparently. Rules are clear and consistent. Adults follow through on what they say. People know what is going to happen next.' },
    { id: 'peer', label: 'Peer Support', icon: '👥', color: '#a855f7',
      what: 'People who have lived through trauma and recovery are valuable sources of support. Their lived experience is treated as expertise, not as a deficit.' },
    { id: 'collab', label: 'Collaboration & Mutuality', icon: '🔗', color: '#f59e0b',
      what: 'Power differences are flattened where possible. Decisions are made WITH people, not FOR them. Even when authority is necessary, it is exercised respectfully.' },
    { id: 'empower', label: 'Empowerment, Voice & Choice', icon: '🗣️', color: '#ec4899',
      what: 'People have real choices, not fake ones. Their voice is heard and matters. Their strengths are named and built on. Their right to make decisions about their own lives is honored.' },
    { id: 'cultural', label: 'Cultural, Historical & Gender Issues', icon: '🌐', color: '#6366f1',
      what: 'The reality that race, ethnicity, language, gender, sexual orientation, disability, age, religion, immigration status — ALL of these affect what counts as safe, what trauma has been carried, and what healing looks like. Trauma-informed care does NOT treat people as interchangeable.' }
  ];

  function defaultState() {
    return {
      view: 'home',
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('traumaPsychoed', {
    icon: '🌿',
    label: 'Understanding Trauma',
    desc: 'Psychoeducation about trauma: what it is, what it is not, the neurobiology in plain English, common responses (framed as adaptations not disorders), SAMHSA\'s 6 principles of trauma-informed care, and pathways to healing. Explicitly NOT a screener; surfacing trauma without clinical follow-up is unsafe. For students AND educators.',
    color: 'emerald',
    category: 'care-of-self',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;

      var d = labToolData.traumaPsychoed || defaultState();
      function setT(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.traumaPsychoed) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { traumaPsychoed: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setT({ view: v }); }

      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#86efac', fontSize: 22, fontWeight: 900 } }, '🌿 Understanding Trauma'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Psychoeducation, not assessment.')
          )
        );
      }

      function printNow() { try { window.print(); } catch (e) {} }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'What trauma is', icon: '🌿' },
          { id: 'types', label: 'Types', icon: '📚' },
          { id: 'biology', label: 'Neurobiology', icon: '🧠' },
          { id: 'responses', label: 'Responses', icon: '⚡' },
          { id: 'samhsa', label: 'SAMHSA 6', icon: '🛡️' },
          { id: 'healing', label: 'Pathways to healing', icon: '🌱' },
          { id: 'print', label: 'Handout', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'Trauma Psychoeducation sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#10b981' : '#334155'),
                background: active ? 'rgba(16,185,129,0.18)' : '#1e293b',
                color: active ? '#a7f3d0' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      // Critical safety banner — always visible
      function safetyBanner() {
        return h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
          h('strong', null, '🛡️ Read this first: '),
          'This tool is psychoeducation only. It does NOT screen for trauma, does NOT ask about your trauma history, and is NOT therapy. Reading about trauma can sometimes surface memories or feelings. If reading any of this is hard, stop and talk to a school psych, counselor, or therapist. Crisis Text Line: text HOME to 741741. Crisis Companion is in this SEL Hub.'
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Trauma is one of the most heavily studied areas of mental health. There are excellent treatments. If you are carrying something heavy, please get a clinician on it with you.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(16,185,129,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#a7f3d0', marginBottom: 4 } }, 'Trauma is what your body did to survive.'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'A simple working definition: trauma is the response to an event (or series of events) that was too much, too soon, too fast — beyond what the nervous system could integrate at the time. The event matters, but what matters more clinically is the RESPONSE: how the nervous system, body, and brain coped, and what got carried forward.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool explains what trauma is, what it does to the body and brain, why people\'s responses are NOT signs of weakness or brokenness but signs of survival, and what healing looks like. It is for students who want to understand themselves and for educators who want to be trauma-informed.'
            )
          ),

          // Big-picture distinctions
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #10b981', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a7f3d0', marginBottom: 10 } }, '🔍 What trauma is NOT'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'Trauma is NOT the event itself; it is the response. Two people can go through the same event and one carries trauma, one does not. This is not about who is "stronger"; it is about a thousand factors at the time (support, age, prior history, nervous-system state).'),
              h('li', null, 'Trauma is NOT a moral failure or a weakness. It is a nervous-system adaptation. Your body did what it had to do.'),
              h('li', null, 'Trauma is NOT only "bad enough" experiences. Many things people would not call traumatic at the time turn out to have been traumatic, and many things people fear were traumatic turn out to be integrated and fine. The body knows.'),
              h('li', null, 'Trauma is NOT permanent. The brain is plastic. People heal. The work is real, but it works.'),
              h('li', null, 'Stress is NOT trauma. Stress is an everyday response to demand; trauma is the response when stress overwhelms the system\'s capacity to cope. The line is fuzzy, but the distinction is real.')
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'What\'s in this tool'),
          stepCard('📚 Types of trauma', '8 categories: acute, chronic, complex, developmental, intergenerational, historical, systemic, vicarious. Different types, different healing.', function() { goto('types'); }, '#0ea5e9'),
          stepCard('🧠 Neurobiology in plain English', 'What actually happens in the brain and body during and after trauma. Why your responses make sense.', function() { goto('biology'); }, '#a855f7'),
          stepCard('⚡ Common responses, reframed', 'What trauma responses look like — flashbacks, hypervigilance, avoidance, numbness — and why each is an adaptation.', function() { goto('responses'); }, '#f59e0b'),
          stepCard('🛡️ SAMHSA\'s 6 principles', 'The standard framework for trauma-informed care: Safety, Trust, Peer Support, Collaboration, Empowerment, Cultural/Historical/Gender awareness.', function() { goto('samhsa'); }, '#22c55e'),
          stepCard('🌱 Pathways to healing', 'Evidence-based treatments (TF-CBT, EMDR, somatic therapies, IFS, narrative approaches). What works, what to look for.', function() { goto('healing'); }, '#ec4899'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, border: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 8, color: '#e2e8f0' } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // TYPES
      // ═══════════════════════════════════════════════════════════
      function renderTypes() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', borderLeft: '3px solid #10b981', marginBottom: 14, fontSize: 12.5, color: '#a7f3d0', lineHeight: 1.65 } },
            h('strong', null, '📚 Trauma is not one thing. '),
            'Clinicians have come to recognize multiple distinct types. The treatment that helps acute trauma (like PTSD from a single event) is different from the treatment that helps complex trauma from chronic childhood abuse. Knowing which is which helps people find the right kind of help.'
          ),

          TRAUMA_TYPES.map(function(t) {
            return h('div', { key: t.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #10b981', marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                h('span', { style: { fontSize: 22 } }, t.icon),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: '#a7f3d0' } }, t.label)
              ),
              h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } }, t.what)
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // NEUROBIOLOGY
      // ═══════════════════════════════════════════════════════════
      function renderBiology() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.7 } },
            h('strong', null, '🧠 The brain part is the part nobody told you. '),
            'For decades, people who experienced trauma were told to "just get over it" or "stop being so dramatic." We now have the brain science to understand WHY that advice was never going to work. Trauma is a neurobiological response, not a willpower problem.'
          ),

          // The three brain parts
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, '🧠 The three players in a trauma response'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: '#c4b5fd' } }, 'Amygdala'), ': the brain\'s smoke alarm. Scans for threat. Fires fast. Does NOT think; it just sounds the alarm.'),
              h('li', null, h('strong', { style: { color: '#c4b5fd' } }, 'Hippocampus'), ': files memories with context — "this happened in 2019, at school, in the cafeteria, and I am safe now." After trauma, the hippocampus can stop filing properly, which is why traumatic memories often feel like they\'re happening NOW.'),
              h('li', null, h('strong', { style: { color: '#c4b5fd' } }, 'Prefrontal cortex'), ': the brain\'s CEO. Plans, decides, thinks calmly. When the amygdala is screaming, the prefrontal cortex goes OFFLINE. This is why "just think about it differently" does not work mid-flashback.')
            )
          ),

          // Fight flight freeze fawn
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, '⚡ The four (or five) trauma responses'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'When the amygdala sounds the alarm, the body goes into one of these survival modes. Which one depends on the threat, the person, and the moment. None of them are choices in the moment.'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: '#fca5a5' } }, 'Fight'), ': confront the threat. Adrenaline, anger, ready to throw down. Adaptive when fighting works.'),
              h('li', null, h('strong', { style: { color: '#fcd34d' } }, 'Flight'), ': flee the threat. Run, leave, disappear. Adaptive when fleeing works.'),
              h('li', null, h('strong', { style: { color: '#bae6fd' } }, 'Freeze'), ': hold still, play dead, dissociate. Adaptive when fighting and fleeing don\'t. Common in children who can\'t escape.'),
              h('li', null, h('strong', { style: { color: '#fbcfe8' } }, 'Fawn'), ': appease, please, comply, make the threat happy. Adaptive in situations of repeated relational abuse where defiance gets you hurt worse.'),
              h('li', null, h('strong', { style: { color: '#a7f3d0' } }, 'Flop'), ': complete collapse, total submission. Most extreme; appears when other responses are not options.')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' } },
              'If you have a freeze or fawn pattern, that is NOT cowardice. Your nervous system picked the strategy with the highest chance of survival in the moment. The problem is when the strategy keeps firing in situations that are not actually dangerous anymore.'
            )
          ),

          // Why memories are weird
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, '🔁 Why trauma memories are weird'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'When the hippocampus does not file a memory correctly (because the amygdala was too loud), the memory gets stored as fragments: a smell, a feeling in the body, a sound, an image. Those fragments are not tagged with time. So when a similar fragment shows up in the present, the body responds AS IF the trauma is happening now. This is what flashbacks, intrusive memories, and trauma triggers actually are. They are not malfunctions; they are the system trying to keep you safe based on incomplete information.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // RESPONSES — reframed as adaptations
      // ═══════════════════════════════════════════════════════════
      function renderResponses() {
        var RESPONSES = [
          { name: 'Hypervigilance', icon: '👁️', what: 'Always scanning for threat. Cannot relax in social spaces. Notices everything. Exhausting.', why: 'Your nervous system learned that danger could come from anywhere. Scanning kept you alive.' },
          { name: 'Avoidance', icon: '🚪', what: 'Avoiding places, people, conversations that remind you of the trauma. School, certain classrooms, certain people.', why: 'Avoidance reduces distress in the moment, even though it keeps the trauma alive longer-term. It\'s a coping move that worked.' },
          { name: 'Flashbacks / intrusive memories', icon: '🔁', what: 'Sudden return of the experience: visual, sensory, body-level. Feels like it\'s happening now.', why: 'The memory was filed wrong. Your brain is trying to integrate it. It is doing healing work, even though it feels like the opposite.' },
          { name: 'Numbness / dissociation', icon: '🌫️', what: 'Disconnection from feelings, from your body, from reality. Floaty. Behind glass.', why: 'When pain is too much, the system shuts down sensation. This is a survival skill, not a deficit.' },
          { name: 'Anger / irritability', icon: '🔥', what: 'Snapping at people, getting flooded with rage, fighting easily.', why: 'Anger is often unprocessed fear or grief that has nowhere else to go. Or it is healthy rage at what happened that has not been allowed expression.' },
          { name: 'Shame', icon: '⬇️', what: 'A pervasive sense of being bad, wrong, broken. Especially common in survivors of childhood and relational trauma.', why: 'Children make sense of bad things by assuming they themselves are bad ("I deserved it" feels more bearable than "I was helpless and someone harmed me"). Adults can still carry that child\'s logic.' },
          { name: 'People-pleasing / over-functioning', icon: '🎭', what: 'Constantly anticipating what others need, performing okay, never asking for anything.', why: 'In some environments, being useful and never a burden was how you stayed safe. The pattern persists past where it served you.' },
          { name: 'Sleep problems', icon: '🌙', what: 'Insomnia, nightmares, waking at the same time each night.', why: 'Sleep is when the brain processes the day. Trauma-related processing often happens at night and it can be intense.' },
          { name: 'Substance use / numbing', icon: '🍺', what: 'Using alcohol, weed, food, screens, or other things to not feel.', why: 'When the system is overwhelmed and you have no other tools, this works. It also has its own costs.' },
          { name: 'Physical symptoms', icon: '🤕', what: 'Chronic headaches, stomach problems, fatigue, unexplained pain, autoimmune issues.', why: 'The body keeps the score (van der Kolk). Unprocessed trauma often shows up somatically.' }
        ];

        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 13, color: '#fde68a', lineHeight: 1.7 } },
            h('strong', null, '⚡ Common trauma responses, reframed. '),
            'The medical model sometimes calls these "symptoms" — as if they\'re evidence of brokenness. The trauma-informed framing: they are ADAPTATIONS. Your nervous system did what it had to do. Healing is not about eliminating these responses; it is about updating them now that you\'re safer.'
          ),

          RESPONSES.map(function(r) {
            return h('div', { key: r.name, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                h('span', { style: { fontSize: 20 } }, r.icon),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: '#fde68a' } }, r.name)
              ),
              h('p', { style: { margin: '0 0 6px', color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.65 } }, h('strong', { style: { color: '#cbd5e1' } }, 'What it looks like: '), r.what),
              h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65, fontStyle: 'italic' } }, h('strong', { style: { color: '#fde68a' } }, 'Why it makes sense: '), r.why)
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SAMHSA 6
      // ═══════════════════════════════════════════════════════════
      function renderSamhsa() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 13, color: '#bbf7d0', lineHeight: 1.7 } },
            h('strong', null, '🛡️ SAMHSA\'s 6 Principles of Trauma-Informed Care '),
            'are the standard framework adopted across US mental health, healthcare, and education. "Trauma-informed" is not a personality trait or a feeling; it is six concrete commitments. A school is trauma-informed (or not) based on whether these principles actually show up in policies and daily practice.'
          ),

          SAMHSA_PRINCIPLES.map(function(p) {
            return h('div', { key: p.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '4px solid ' + p.color, marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                h('span', { style: { fontSize: 22 } }, p.icon),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: p.color } }, p.label)
              ),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } }, p.what)
            );
          }),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginTop: 14, fontSize: 12.5, color: '#bbf7d0', lineHeight: 1.7 } },
            h('strong', null, '💡 For educators: '),
            'these are not aspirational. They are testable. "Does the way I handle a behavioral incident respect SAFETY (does the student leave feeling safer), TRUST (is the response predictable), and EMPOWERMENT (does the student have voice and choice)?" That is the test.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HEALING
      // ═══════════════════════════════════════════════════════════
      function renderHealing() {
        var TREATMENTS = [
          { name: 'TF-CBT (Trauma-Focused CBT)', icon: '🧩', evidence: 'Strong evidence base for children and adolescents with PTSD. Manualized treatment, typically 8-16 sessions.',
            for: 'Children and adolescents who have experienced specific traumatic events.', from: 'Cohen, Mannarino, Deblinger.' },
          { name: 'EMDR (Eye Movement Desensitization and Reprocessing)', icon: '👁️', evidence: 'Strong evidence for adult PTSD; growing evidence for adolescents.',
            for: 'Single-incident PTSD, especially adults. The bilateral stimulation seems to help the hippocampus refile the memory.', from: 'Francine Shapiro.' },
          { name: 'Somatic / body-based therapies', icon: '🌊', evidence: 'Growing evidence for complex trauma where talk-based treatment has not been enough.',
            for: 'People for whom trauma lives in the body. Often complex trauma survivors. Includes Sensorimotor Psychotherapy (Pat Ogden), Somatic Experiencing (Peter Levine).', from: 'Ogden, Levine, van der Kolk.' },
          { name: 'IFS (Internal Family Systems)', icon: '👨‍👩‍👧', evidence: 'Newer evidence base; designated evidence-based by SAMHSA for depression and some trauma applications.',
            for: 'Complex trauma especially. Works with the "parts" of self that carry different aspects of the trauma.', from: 'Richard Schwartz.' },
          { name: 'Narrative therapy', icon: '📖', evidence: 'Less RCT-style evidence; strong tradition in family therapy and adolescent work.',
            for: 'People who need to externalize the problem ("the trauma" is not "me") and reauthor their story.', from: 'Michael White, David Epston.' },
          { name: 'Group therapy / peer support', icon: '👥', evidence: 'Strong evidence for many trauma populations; not appropriate for all.',
            for: 'Isolation is part of how trauma stays alive. Hearing others\' stories and being heard is healing.', from: 'Judith Herman emphasized this as the third stage of recovery.' }
        ];

        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(236,72,153,0.10)', border: '1px solid rgba(236,72,153,0.3)', borderLeft: '3px solid #ec4899', marginBottom: 14, fontSize: 13, color: '#fbcfe8', lineHeight: 1.7 } },
            h('strong', null, '🌱 Healing is real. '),
            'There are evidence-based treatments that work. Most people who carry trauma can heal substantially with good treatment. The work is real; it works. This section is for orientation only; finding the RIGHT treatment for YOU is a conversation with a clinician.'
          ),

          // Three stages of recovery (Herman)
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #ec4899', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbcfe8', marginBottom: 10 } }, '📋 Judith Herman\'s three stages of recovery'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65, fontStyle: 'italic' } },
              'From "Trauma and Recovery" (1992), still the standard text in trauma treatment. The work moves through these stages, sometimes circling back.'),
            h('ol', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: '#fbcfe8' } }, 'Safety + stabilization. '), 'Before any deep trauma processing: the basics. Are you in a stable living situation? Are you using substances heavily? Do you have ANY consistent caring relationship? Do you have basic self-regulation skills? This stage can take a long time, and that is okay. Skipping it leads to re-traumatization.'),
              h('li', null, h('strong', { style: { color: '#fbcfe8' } }, 'Remembrance + mourning. '), 'The trauma is approached, told, processed, mourned. Most "trauma therapy" people imagine is actually this stage. Should NOT be done without safety + stabilization in place.'),
              h('li', null, h('strong', { style: { color: '#fbcfe8' } }, 'Reconnection. '), 'Reconnection to self, to others, to meaning, to community. The trauma is integrated, not erased; the person rebuilds a life. This is where peer support, community, meaning-making work happens.')
            )
          ),

          // Treatments
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'Evidence-based treatment approaches'),
          TREATMENTS.map(function(t, i) {
            return h('div', { key: i, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #ec4899', marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                h('span', { style: { fontSize: 20 } }, t.icon),
                h('span', { style: { fontSize: 13.5, fontWeight: 800, color: '#fbcfe8' } }, t.name)
              ),
              h('p', { style: { margin: '0 0 4px', color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.65 } }, h('strong', null, 'Evidence: '), t.evidence),
              h('p', { style: { margin: '0 0 4px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.65 } }, h('strong', null, 'For: '), t.for),
              h('p', { style: { margin: 0, color: '#94a3b8', fontSize: 11.5, lineHeight: 1.55, fontStyle: 'italic' } }, h('strong', null, 'From: '), t.from)
            );
          }),

          // Body-first work
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', borderLeft: '3px solid #6366f1', marginTop: 14, fontSize: 12.5, color: '#c7d2fe', lineHeight: 1.7 } },
            h('strong', null, '💡 What you can do outside of formal treatment: '),
            'Sleep. Movement. Nature. Reliable relationships. Creative expression. Naming what happened with a safe person. Body-based practices (yoga, breathing, dance). Time in community with others who get it. NONE of these replace treatment for trauma, but ALL of them build the safety + stabilization foundation that makes treatment possible.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('traumaPsychoed', h, ctx) : null),

          // Big safety panel up front
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '4px solid #ef4444', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#fca5a5', fontSize: 16 } }, '🛡️ Why this tool does NOT include a screener'),
            h('p', { style: { margin: '0 0 8px', color: '#fecaca', fontSize: 13.5, lineHeight: 1.7 } },
              'The ACEs questionnaire (Adverse Childhood Experiences) is widely known but it was developed as a population-health research tool, NOT a screening or therapeutic tool for individual students. Surfacing trauma in a self-administered digital tool, without an adult who can hold the response, without clinical follow-up, and without specific consent for that conversation, can be ACTIVELY HARMFUL. The trauma-informed-care literature is clear on this: education and awareness are appropriate; screening without follow-up is not.'
            ),
            h('p', { style: { margin: 0, color: '#fecaca', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool is purely psychoeducational. If reading any of it surfaced something for you, please bring it to a counselor, school psych, or therapist. The Crisis Companion in this SEL Hub is also here.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#86efac', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Trauma psychoeducation: explanations, frameworks, and orientation. The point is to help students and educators understand what trauma actually is and is not, why people\'s responses make sense, and what the framework of trauma-informed care commits to.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'For students with specific trauma: this tool can help with understanding, but the WORK of healing happens with a clinician, not with a tool. For educators: this tool is a starting point; deeper trauma-informed practice requires training (NCTSN has free modules; many school districts contract for trauma-informed schools training).'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#86efac', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('SAMHSA (2014)', 'SAMHSA\'s Concept of Trauma and Guidance for a Trauma-Informed Approach', 'Where the 6 principles come from. Free US federal document.', 'https://store.samhsa.gov/product/SAMHSA-s-Concept-of-Trauma-and-Guidance-for-a-Trauma-Informed-Approach/SMA14-4884'),
            sourceCard('National Child Traumatic Stress Network (NCTSN)', 'nctsn.org', 'The leading clearinghouse for adolescent trauma resources, evidence-based treatments, and educator training.', 'https://www.nctsn.org/'),
            sourceCard('Herman, J. L. (1992, revised 2015)', 'Trauma and Recovery: The Aftermath of Violence — from Domestic Abuse to Political Terror, Basic Books', 'The foundational text in trauma treatment. Establishes the three-stage model.', null),
            sourceCard('van der Kolk, B. (2014)', 'The Body Keeps the Score: Brain, Mind, and Body in the Healing of Trauma, Viking', 'Accessible and influential book on trauma neurobiology and body-based treatment.', null),
            sourceCard('Menakem, R. (2017)', 'My Grandmother\'s Hands: Racialized Trauma and the Pathway to Mending Our Hearts and Bodies, Central Recovery Press', 'Essential text on racialized and intergenerational trauma; somatic abolitionist framing.', null),
            sourceCard('Maté, G. (2022)', 'The Myth of Normal: Trauma, Illness, and Healing in a Toxic Culture, Avery', 'Trauma in the context of societal causes; emphasizes systemic contributors to individual suffering.', null),
            sourceCard('Trauma-Informed Care Implementation Resource Center', 'traumainformedcare.chcs.org', 'Practical guidance on implementing trauma-informed practices in schools and healthcare.', 'https://www.traumainformedcare.chcs.org/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Trauma psychoeducation is helpful for orientation. It is NOT therapy. Reading about trauma does not heal trauma; a clinician does.'),
              h('li', null, '"Trauma-informed" has become a buzzword. Schools and organizations adopt the language without changing the practice. Look for SPECIFIC changes in policy, not slogans on the wall.'),
              h('li', null, 'The "everyone has trauma" framing has been critiqued by some clinicians: if EVERYTHING is trauma, then NOTHING is trauma in a useful clinical sense. This tool tries to use trauma in its meaningful clinical sense while honoring that many forms of adversity affect the nervous system similarly.'),
              h('li', null, 'For systemic trauma (racism, ableism, transphobia, etc.) — these are real, they are clinically significant, AND they require structural change, not just individual healing. Both/and.'),
              h('li', null, 'Cultural healing traditions (Indigenous practices, religious traditions, community rituals) have always done trauma work. Western clinical psychology is a recent and partial answer; honor what your community already knows.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', borderLeft: '3px solid #10b981', fontSize: 12.5, color: '#a7f3d0', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'For your own learning: NCTSN\'s free educator modules are excellent (nctsn.org/audiences/school-personnel). For class introduction (NOT screening): teach the neurobiology section and SAMHSA principles as conceptual content, similar to how you would teach any chapter on how brains work. Students will tell you what they need to discuss; you don\'t have to invite it via the curriculum. Trauma in students is best addressed through trusted-adult relationships and clinical referral, not through psychoeducation alone.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#86efac', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#a7f3d0', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#a7f3d0', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.4)', borderLeft: '3px solid #10b981', marginBottom: 12, fontSize: 12.5, color: '#a7f3d0', lineHeight: 1.65 } },
            h('strong', null, '🖨 Educator + family handout. '),
            'A one-page take-home: SAMHSA\'s 6 trauma-informed principles, common trauma responses framed as adaptations, and Herman\'s three stages of recovery. Useful as a staff PD handout, a family-conference resource, or a personal reference. Not a screener.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),

          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#trauma-print-region, #trauma-print-region * { visibility: visible !important; } ' +
            '#trauma-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#trauma-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),

          h('div', { id: 'trauma-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, 'Trauma-Informed Care · Handout'),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'SAMHSA · Herman · van der Kolk')
            ),

            h('div', { style: { padding: 10, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.6, color: '#065f46' } },
              h('strong', null, 'Trauma is not a diagnosis or a label. '),
              'It is what gets carried in the body when something overwhelming happens and there is no safety to process it. Trauma responses are adaptations, not disorders. Healing is real. This handout is for orientation, not assessment.'
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'SAMHSA\'s six principles of trauma-informed care'),
              SAMHSA_PRINCIPLES.map(function(p, i) {
                return h('div', { key: p.id, style: { marginBottom: 8, paddingBottom: 6, borderBottom: i < SAMHSA_PRINCIPLES.length - 1 ? '1px dashed #cbd5e1' : 'none' } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: '#065f46' } }, (i + 1) + '. ' + p.label),
                  h('div', { style: { fontSize: 11.5, color: '#0f172a', lineHeight: 1.55 } }, p.what)
                );
              })
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Herman\'s three stages of recovery'),
              h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.65 } },
                h('li', { style: { marginBottom: 6 } }, h('strong', null, 'Safety + stabilization. '), 'Stable living, basic regulation skills, at least one consistent caring relationship. This stage can take a long time; skipping it leads to re-traumatization.'),
                h('li', { style: { marginBottom: 6 } }, h('strong', null, 'Remembrance + mourning. '), 'The trauma is approached, told, processed, mourned. Should not be done without safety + stabilization in place.'),
                h('li', null, h('strong', null, 'Reconnection. '), 'Reconnection to self, to others, to meaning. The trauma is integrated, not erased; the person rebuilds a life.')
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Types of trauma'),
              h('ul', { style: { margin: 0, padding: '0 0 0 20px', fontSize: 11.5, color: '#0f172a', lineHeight: 1.6 } },
                TRAUMA_TYPES.map(function(t) { return h('li', { key: t.id, style: { marginBottom: 4 } }, h('strong', null, t.label + ': '), t.what); })
              )
            ),

            h('div', { style: { padding: 10, background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, marginBottom: 12, fontSize: 11.5, color: '#1e3a8a', lineHeight: 1.6 } },
              h('strong', null, 'What helps outside of formal treatment: '),
              'Sleep. Movement. Nature. Reliable relationships. Creative expression. Naming what happened with a safe person. Body-based practices. Time in community with others who get it. None of these replace treatment for trauma; all of them build the foundation that makes treatment possible.'
            ),

            h('div', { style: { padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 12, fontSize: 11.5, color: '#7f1d1d', lineHeight: 1.6 } },
              h('strong', null, 'Crisis support: '),
              '988 Suicide & Crisis Lifeline (call/text) · Crisis Text Line: text HOME to 741741 · SAMHSA Helpline 1-800-662-4357 (24/7, free, confidential) · National Sexual Assault Hotline (RAINN): 1-800-656-4673'
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5 } },
              'Sources: SAMHSA (2014), Concept of Trauma and Guidance for a Trauma-Informed Approach · Herman, J. L. (1992), Trauma and Recovery · van der Kolk, B. (2014), The Body Keeps the Score · Menakem, R. (2017), My Grandmother\'s Hands. Printed from AlloFlow SEL Hub.'
            )
          )
        );
      }

      var body;
      if (view === 'types') body = renderTypes();
      else if (view === 'biology') body = renderBiology();
      else if (view === 'responses') body = renderResponses();
      else if (view === 'samhsa') body = renderSamhsa();
      else if (view === 'healing') body = renderHealing();
      else if (view === 'about') body = renderAbout();
      else if (view === 'print') body = renderPrintView();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Understanding Trauma' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
