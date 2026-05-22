// ═══════════════════════════════════════════════════════════════
// sel_tool_sensoryregulation.js — Sensory Regulation
// A neurodiversity-affirming tool for understanding your own
// sensory processing. Built on Ayres' original framework and
// Dunn's quadrants, with explicit honoring of autistic-led
// scholarship (Bogdashina, Endow, Milton) that frames sensory
// difference as identity, not deficit.
//
// Maps the 8 sensory systems, builds a personal sensory profile
// (seeking / avoiding by system), supports a sensory diet (planned
// regulating activities), and suggests common school accommodations.
//
// Identity-first language by default ("autistic peer," not "peer
// with autism") per established autistic-community preference.
//
// Registered tool ID: "sensoryRegulation"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('sensoryRegulation'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-sensory')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-sensory';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // The 8 sensory systems
  var SYSTEMS = [
    { id: 'visual', label: 'Visual',       icon: '👁️', color: '#0ea5e9',
      what: 'How your eyes and brain process light, color, movement, faces, patterns.',
      seeking: ['You love bright colors, screens, busy visual environments', 'You stim by watching things spin or sparkle', 'You notice tiny visual details others miss'],
      avoiding: ['Fluorescent lights physically hurt', 'Busy patterns make you nauseous or shut down', 'You need dim lighting to think', 'Direct eye contact feels overwhelming'] },
    { id: 'auditory', label: 'Auditory',     icon: '👂', color: '#a855f7',
      what: 'How your ears and brain process sound: volume, pitch, distinguishing voices in noise, processing speed.',
      seeking: ['You like loud music, humming, white noise', 'You play the same song on repeat', 'You stim with sound (humming, beat-making, vocalizations)'],
      avoiding: ['Hand dryers, vacuum cleaners, fire alarms are physically painful', 'You can\'t hear in a crowded room', 'Background music makes it impossible to focus', 'You need quiet to recover after social time'] },
    { id: 'tactile', label: 'Tactile (touch)', icon: '✋', color: '#22c55e',
      what: 'How skin and pressure receptors process touch: textures, temperature, pressure, pain.',
      seeking: ['You love deep pressure (tight hugs, weighted blankets, swaddling)', 'You like specific textures (soft fleece, smooth stones, fidgets)', 'You touch and feel things constantly'],
      avoiding: ['Tags and seams in clothing are unbearable', 'Certain food textures make you gag', 'Light touch (a hand on your shoulder) feels like sandpaper', 'You hate getting your hair washed, brushed, or cut'] },
    { id: 'olfactory', label: 'Olfactory (smell)', icon: '👃', color: '#f59e0b',
      what: 'How your nose and brain process smell. Often more intense than typical for many autistic people.',
      seeking: ['You love specific smells (laundry, gasoline, books, a specific person)', 'You smell things others don\'t notice', 'You smell food before eating it'],
      avoiding: ['Perfume, cologne, scented products give you a headache', 'School smells (cafeteria, bathrooms, certain rooms) are intolerable', 'Some smells trigger nausea'] },
    { id: 'gustatory', label: 'Gustatory (taste)', icon: '👅', color: '#ec4899',
      what: 'How your tongue and brain process taste. Often paired with texture (gustatory + tactile).',
      seeking: ['You have specific favorite foods you would eat every day', 'You love intense flavors (spicy, sour, very sweet)', 'You crave specific tastes when stressed'],
      avoiding: ['Mixed textures (like soup with chunks, yogurt with fruit) are unbearable', 'Many foods cause real distress', 'You have a small "safe foods" list and that\'s okay'] },
    { id: 'proprioceptive', label: 'Proprioceptive (body in space)', icon: '🤸', color: '#6366f1',
      what: 'How muscles and joints sense where your body is. The "heavy work" system. Crucial for regulation.',
      seeking: ['You love jumping, climbing, crashing into things, deep pressure', 'You chew on things (pens, hoodie strings, gum)', 'You feel calm after sports or movement', 'You hug very tightly'],
      avoiding: ['You\'re clumsy, bump into things', 'You don\'t know how hard you\'re pressing', 'You don\'t notice when you\'re hungry, tired, or hurt until late'] },
    { id: 'vestibular', label: 'Vestibular (movement/balance)', icon: '🎢', color: '#dc2626',
      what: 'How your inner ear senses head position and movement. The "spinning, swinging, tilting" system.',
      seeking: ['You love swings, spinning, roller coasters, being upside down', 'You rock or sway when seated', 'You need to move to think'],
      avoiding: ['Carsick easily', 'Escalators and elevators make you queasy', 'You hate being upside down or having your head tilted back', 'Sports with sudden direction changes are hard'] },
    { id: 'interoceptive', label: 'Interoceptive (inside-body signals)', icon: '🫀', color: '#10b981',
      what: 'How your brain reads signals from inside your body: hunger, thirst, fullness, needing the bathroom, heart rate, breath, emotions. The MOST UNDER-RATED system, especially for autistic and ADHD people.',
      seeking: ['You like intense interoceptive input (hot showers, spicy food, intense exercise)'],
      avoiding: ['You don\'t notice you\'re hungry until you\'re starving', 'You don\'t notice you have to pee until urgent', 'You can\'t tell if you\'re anxious until you\'re panicking', 'You don\'t know if you\'re hot or cold until you\'re shivering or sweating'] }
  ];

  function defaultState() {
    return {
      view: 'home',
      // Profile: per system, seeker / avoider / mixed / typical
      profile: {},        // systemId -> 'seek' | 'avoid' | 'mixed' | 'typical'
      profileNotes: {},   // systemId -> notes
      // Sensory diet
      regulatingActivities: [],   // [{label, system, when}]
      // Accommodations
      myAccommodations: [],       // [string]
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // Common school accommodations that follow from sensory needs
  var ACCOMMODATION_STARTERS = [
    'Noise-canceling headphones or earplugs in class',
    'Sunglasses or a brimmed hat indoors',
    'Permission to leave the cafeteria for a quieter lunch space',
    'A "quiet pass" to step out for 5 minutes when overwhelmed',
    'Permission to chew gum, suck candy, or use a chewable necklace',
    'Permission to fidget (specific tools)',
    'Permission to stand or move during class',
    'Wobble cushion or alternative seating',
    'Heavy work breaks (push wall, carry books, errand to office)',
    'Weighted lap pad',
    'A specific safe space to access when overwhelmed',
    'Preferential seating (away from doors, windows, hallway noise)',
    'Written instructions in addition to verbal',
    'Extra time on transitions',
    'No surprise fire drills (advance warning)',
    'Bathroom breaks without permission (interoceptive)',
    'Snack/water access anytime (interoceptive)',
    'Flexible deadlines on days after big sensory load'
  ];

  window.SelHub.registerTool('sensoryRegulation', {
    icon: '🌈',
    label: 'Sensory Regulation',
    desc: 'A neurodiversity-affirming tool for understanding your own sensory processing across the 8 sensory systems. Build a personal sensory profile, plan a sensory diet, and identify school accommodations that fit your needs. Built on Ayres and Dunn, honoring autistic-led scholarship. Identity-first language.',
    color: 'orange',
    category: 'self-regulation',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;

      var d = labToolData.sensoryRegulation || defaultState();
      function setSens(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.sensoryRegulation) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { sensoryRegulation: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setSens({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fdba74', fontSize: 22, fontWeight: 900 } }, '🌈 Sensory Regulation'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Understanding your sensory processing. Identity-first, neurodiversity-affirming.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'What is sensory?', icon: '🌈' },
          { id: 'profile', label: 'My profile', icon: '🗺️' },
          { id: 'diet', label: 'Sensory diet', icon: '🥗' },
          { id: 'accommodations', label: 'Accommodations', icon: '📝' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Sensory Regulation sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#f97316' : '#334155'),
                background: active ? 'rgba(249,115,22,0.18)' : '#1e293b',
                color: active ? '#fed7aa' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This is descriptive self-understanding, not diagnostic assessment. For formal sensory evaluation, an occupational therapist (OT) is the right professional. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — psychoeducation
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(249,115,22,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(249,115,22,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fed7aa', marginBottom: 4 } }, 'Sensory difference is identity, not deficit.'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Every brain processes sensory information differently. For some people, the differences are subtle. For autistic people, ADHD people, sensory processing disorder people, and many others, the differences are dramatic — and they shape every part of daily life: school, food, clothes, friendships, sleep, focus, regulation.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool helps you map your own sensory landscape so you can advocate for what you need, plan a sensory diet that regulates you, and understand WHY school sometimes feels impossible. It is descriptive (this is how I am), not pathological (something is wrong with me).'
            )
          ),

          // Seeker vs avoider basics
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f97316', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fdba74', marginBottom: 10 } }, '🔍 The basic vocabulary'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Seeking'), ': you want MORE of this input. Heavy hugs. Loud music. Spicy food. Spinning. You feel BETTER when you get enough of it.'),
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Avoiding'), ': you want LESS of this input. Fluorescents hurt. Tags itch. Smells are too much. You shut down when you get too much.'),
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Mixed'), ': you seek some kinds and avoid others within the same system (loves heavy hugs, hates light touch).'),
              h('li', null, h('strong', { style: { color: '#fdba74' } }, 'Most people'), ' are seekers in some systems and avoiders in others. There is no "right" profile.')
            )
          ),

          // The 8 systems overview
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f97316', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fdba74', marginBottom: 10 } }, '🧠 The 8 sensory systems'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } },
              'Most people know 5 senses. There are actually 8 sensory systems, and the three less-known ones (proprioceptive, vestibular, interoceptive) are often the most important for regulation.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6 } },
              SYSTEMS.map(function(s) {
                return h('div', { key: s.id, style: { padding: 8, borderRadius: 6, background: '#1e293b', borderLeft: '2px solid ' + s.color } },
                  h('div', { style: { fontSize: 12.5, fontWeight: 700, color: s.color, marginBottom: 2 } }, s.icon + ' ' + s.label),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } }, s.what)
                );
              })
            )
          ),

          // Roadmap
          stepCard('🗺️ Build my sensory profile', 'Go through each of the 8 systems and mark whether you tend to seek, avoid, both, or fall in the typical range.', function() { goto('profile'); }, '#f97316'),
          stepCard('🥗 Plan a sensory diet', 'Sensory diet = planned regulating activities throughout the day. Especially helpful for autistic and ADHD people.', function() { goto('diet'); }, '#22c55e'),
          stepCard('📝 Identify school accommodations', 'Concrete accommodations that follow from your sensory profile. Useful for IEP/504 meetings or for self-advocacy conversations.', function() { goto('accommodations'); }, '#6366f1'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 8, color: '#e2e8f0' } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PROFILE — per-system seeker/avoider mapping
      // ═══════════════════════════════════════════════════════════
      function renderProfile() {
        function setSystem(systemId, value) {
          var prof = Object.assign({}, (d.profile || {}));
          prof[systemId] = value;
          setSens({ profile: prof });
        }
        function setNotes(systemId, value) {
          var notes = Object.assign({}, (d.profileNotes || {}));
          notes[systemId] = value;
          setSens({ profileNotes: notes });
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(249,115,22,0.10)', borderTop: '1px solid rgba(249,115,22,0.3)', borderRight: '1px solid rgba(249,115,22,0.3)', borderBottom: '1px solid rgba(249,115,22,0.3)', borderLeft: '3px solid #f97316', marginBottom: 14, fontSize: 12.5, color: '#fed7aa', lineHeight: 1.65 } },
            h('strong', null, '🗺️ Map your profile, one system at a time. '),
            'Don\'t overthink. Pick the answer that fits MOST of the time. You can add notes for the details.'
          ),

          SYSTEMS.map(function(s) {
            var current = (d.profile || {})[s.id];
            var notes = (d.profileNotes || {})[s.id] || '';
            return h('div', { key: s.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + s.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontSize: 22 } }, s.icon),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: s.color } }, s.label)
              ),
              h('div', { style: { fontSize: 11.5, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, s.what),

              // Seeker vs Avoider example panels
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 10 } },
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)' } },
                  h('div', { style: { fontSize: 11, color: '#bbf7d0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '+ Seeking signs'),
                  h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: '#dcfce7', fontSize: 11.5, lineHeight: 1.6 } },
                    s.seeking.map(function(item, i) { return h('li', { key: i }, item); }))
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)' } },
                  h('div', { style: { fontSize: 11, color: '#fecaca', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '✕ Avoiding signs'),
                  h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: '#fee2e2', fontSize: 11.5, lineHeight: 1.6 } },
                    s.avoiding.map(function(item, i) { return h('li', { key: i }, item); }))
                )
              ),

              // Mode picker
              h('div', { style: { display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }, role: 'radiogroup', 'aria-label': s.label + ' profile' },
                h('button', { onClick: function() { setSystem(s.id, 'seek'); }, role: 'radio', 'aria-checked': current === 'seek',
                  style: { flex: 1, minWidth: 100, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + (current === 'seek' ? '#22c55e' : '#475569'), background: current === 'seek' ? 'rgba(34,197,94,0.18)' : 'transparent', color: current === 'seek' ? '#bbf7d0' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '+ Seeker'),
                h('button', { onClick: function() { setSystem(s.id, 'avoid'); }, role: 'radio', 'aria-checked': current === 'avoid',
                  style: { flex: 1, minWidth: 100, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + (current === 'avoid' ? '#ef4444' : '#475569'), background: current === 'avoid' ? 'rgba(239,68,68,0.18)' : 'transparent', color: current === 'avoid' ? '#fecaca' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '✕ Avoider'),
                h('button', { onClick: function() { setSystem(s.id, 'mixed'); }, role: 'radio', 'aria-checked': current === 'mixed',
                  style: { flex: 1, minWidth: 100, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + (current === 'mixed' ? '#a855f7' : '#475569'), background: current === 'mixed' ? 'rgba(168,85,247,0.18)' : 'transparent', color: current === 'mixed' ? '#e9d5ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '↕ Mixed'),
                h('button', { onClick: function() { setSystem(s.id, 'typical'); }, role: 'radio', 'aria-checked': current === 'typical',
                  style: { flex: 1, minWidth: 100, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + (current === 'typical' ? '#94a3b8' : '#475569'), background: current === 'typical' ? '#475569' : 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } }, '~ Typical')
              ),

              h('label', { htmlFor: 'sens-notes-' + s.id, style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'My specific notes (optional)'),
              h('textarea', { id: 'sens-notes-' + s.id, value: notes,
                placeholder: 'Be specific. What helps, what hurts, what you need.',
                onChange: function(e) { setNotes(s.id, e.target.value); },
                style: { width: '100%', minHeight: 50, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' } })
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // DIET — planned regulating activities
      // ═══════════════════════════════════════════════════════════
      function renderDiet() {
        function addActivity() {
          var label = document.getElementById('sens-act-label').value;
          var system = document.getElementById('sens-act-system').value;
          var when = document.getElementById('sens-act-when').value;
          if (!label || !label.trim()) return;
          var entry = { label: label.trim(), system: system, when: when || 'as needed' };
          setSens({ regulatingActivities: (d.regulatingActivities || []).concat([entry]) });
          document.getElementById('sens-act-label').value = '';
          document.getElementById('sens-act-when').value = '';
        }
        function removeActivity(i) {
          var nx = (d.regulatingActivities || []).slice();
          nx.splice(i, 1);
          setSens({ regulatingActivities: nx });
        }

        var activities = d.regulatingActivities || [];

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 13, color: '#bbf7d0', lineHeight: 1.7 } },
            h('strong', null, '🥗 A "sensory diet" '),
            'is a planned schedule of regulating sensory activities throughout the day — not food. The term was coined by OT Patricia Wilbarger. The idea: for many sensory-different people, regulation is not automatic. You PLAN regulating input the way some people plan meals.'
          ),

          // Suggestions by system based on profile
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#bbf7d0', fontWeight: 800, marginBottom: 8 } }, '💡 Common regulating activities by system'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
              h('div', { style: { padding: 8, borderRadius: 6, background: '#1e293b', borderLeft: '2px solid #6366f1' } },
                h('div', { style: { fontSize: 12, color: '#a5b4fc', fontWeight: 700, marginBottom: 4 } }, '🤸 Proprioceptive (heavy work, calming)'),
                h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.6 } }, 'Pushing against a wall · carrying a heavy backpack · weighted blanket · deep pressure hugs · chewing gum · jumping · climbing')
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: '#1e293b', borderLeft: '2px solid #dc2626' } },
                h('div', { style: { fontSize: 12, color: '#fca5a5', fontWeight: 700, marginBottom: 4 } }, '🎢 Vestibular (movement, alerting or calming)'),
                h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.6 } }, 'Swinging · spinning · rocking · jumping on a trampoline · doing a cartwheel · being upside down')
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: '#1e293b', borderLeft: '2px solid #22c55e' } },
                h('div', { style: { fontSize: 12, color: '#86efac', fontWeight: 700, marginBottom: 4 } }, '✋ Tactile (calming if right kind)'),
                h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.6 } }, 'Fidget cube · stress ball · soft blanket · play-doh · sensory bins · warm bath · cool water on hands')
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: '#1e293b', borderLeft: '2px solid #10b981' } },
                h('div', { style: { fontSize: 12, color: '#6ee7b7', fontWeight: 700, marginBottom: 4 } }, '🫀 Interoceptive (body-awareness)'),
                h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.6 } }, 'Set water/food alarms · paced breathing · body scan · scheduled bathroom breaks · check in on physical state on the hour')
              )
            )
          ),

          // Add activity
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 10 } }, '+ Add a regulating activity to my plan'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 8 } },
              h('div', null,
                h('label', { htmlFor: 'sens-act-label', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'What'),
                h('input', { id: 'sens-act-label', type: 'text', placeholder: 'e.g. Push against wall for 30 sec',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              ),
              h('div', null,
                h('label', { htmlFor: 'sens-act-system', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'System'),
                h('select', { id: 'sens-act-system',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } },
                  SYSTEMS.map(function(s) { return h('option', { key: s.id, value: s.id }, s.icon + ' ' + s.label); }))
              ),
              h('div', null,
                h('label', { htmlFor: 'sens-act-when', style: { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'When'),
                h('input', { id: 'sens-act-when', type: 'text', placeholder: 'e.g. Between classes',
                  style: { width: '100%', padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } })
              )
            ),
            h('button', { onClick: addActivity, 'aria-label': 'Add to sensory diet',
              style: { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 13 } }, '+ Add')
          ),

          activities.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 12, color: '#bbf7d0', fontWeight: 800, marginBottom: 8 } }, 'My sensory diet (' + activities.length + ')'),
            activities.map(function(a, i) {
              var sys = SYSTEMS.find(function(s) { return s.id === a.system; });
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, borderLeft: '3px solid ' + (sys ? sys.color : '#64748b') } },
                h('span', { style: { fontSize: 16 } }, sys ? sys.icon : '◆'),
                h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, a.label,
                  h('span', { style: { fontSize: 11, color: '#94a3b8', marginLeft: 6 } }, '· ' + a.when)),
                h('button', { onClick: function() { removeActivity(i); }, 'aria-label': 'Remove activity',
                  style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              );
            })
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ACCOMMODATIONS
      // ═══════════════════════════════════════════════════════════
      function renderAccommodations() {
        function addAccommodation(value) {
          if (!value || !value.trim()) return;
          var list = (d.myAccommodations || []).slice();
          if (list.indexOf(value.trim()) === -1) list.push(value.trim());
          setSens({ myAccommodations: list });
        }
        function removeAccommodation(i) {
          var list = (d.myAccommodations || []).slice();
          list.splice(i, 1);
          setSens({ myAccommodations: list });
        }
        function submitInput() {
          var el = document.getElementById('sens-acc-input');
          if (!el || !el.value.trim()) return;
          addAccommodation(el.value);
          el.value = '';
        }

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(99,102,241,0.10)', borderTop: '1px solid rgba(99,102,241,0.3)', borderRight: '1px solid rgba(99,102,241,0.3)', borderBottom: '1px solid rgba(99,102,241,0.3)', borderLeft: '3px solid #6366f1', marginBottom: 14, fontSize: 13, color: '#c7d2fe', lineHeight: 1.7 } },
            h('strong', null, '📝 Concrete accommodations '),
            'follow from your sensory profile. Build this list before your next IEP meeting, 504 conversation, or self-advocacy chat with a teacher. The Self-Advocacy and DEAR MAN tools in this SEL Hub help you actually ASK for these.'
          ),

          // Selected accommodations
          (d.myAccommodations || []).length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #6366f1', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#c7d2fe', fontWeight: 800, marginBottom: 8 } }, 'My accommodations list (' + d.myAccommodations.length + ')'),
            d.myAccommodations.map(function(a, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { flex: 1, fontSize: 13, color: '#e2e8f0' } }, '✓ ' + a),
                h('button', { onClick: function() { removeAccommodation(i); }, 'aria-label': 'Remove accommodation',
                  style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              );
            })
          ) : null,

          // Add
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #6366f1', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c7d2fe', marginBottom: 8 } }, '+ Add an accommodation'),
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'sens-acc-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add accommodation'),
              h('input', { id: 'sens-acc-input', type: 'text', placeholder: 'A specific accommodation you need',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); submitInput(); } },
                style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('button', { onClick: submitInput, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            )
          ),

          // Starters
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 10 } }, 'Common school accommodations (tap to add)'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              ACCOMMODATION_STARTERS.map(function(a, i) {
                var already = (d.myAccommodations || []).indexOf(a) !== -1;
                return h('button', { key: i, onClick: function() { addAccommodation(a); }, disabled: already, 'aria-label': 'Add: ' + a,
                  style: { padding: '4px 10px', borderRadius: 14, border: '1px solid #6366f166', background: already ? '#1e293b' : 'rgba(15,23,42,0.6)', color: already ? '#64748b' : '#cbd5e1', cursor: already ? 'not-allowed' : 'pointer', fontSize: 11, opacity: already ? 0.5 : 1 } },
                  (already ? '✓ ' : '+ ') + a);
              })
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(249,115,22,0.10)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fed7aa', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print my sensory profile + accommodations. '),
              'Useful for IEP/504 meetings or self-advocacy conversations.'
            ),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'sens-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#sens-print-region, #sens-print-region * { visibility: visible !important; } ' +
              '#sens-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #ea580c' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Sensory Profile + Accommodations'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My sensory profile'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            // Profile by system
            SYSTEMS.map(function(s) {
              var prof = (d.profile || {})[s.id];
              var notes = (d.profileNotes || {})[s.id];
              if (!prof) return null;
              var profLabel = prof === 'seek' ? 'Seeker' : prof === 'avoid' ? 'Avoider' : prof === 'mixed' ? 'Mixed' : 'Typical';
              return h('div', { key: s.id, style: { marginBottom: 12, pageBreakInside: 'avoid', padding: 10, borderLeft: '3px solid ' + s.color, background: '#f8fafc' } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
                  h('strong', { style: { fontSize: 13, color: '#0f172a' } }, s.icon + ' ' + s.label),
                  h('span', { style: { fontSize: 12, fontWeight: 800, color: s.color } }, profLabel)
                ),
                notes ? h('div', { style: { fontSize: 12, color: '#0f172a', fontStyle: 'italic', lineHeight: 1.6 } }, notes) : null
              );
            }),

            // Accommodations
            (d.myAccommodations || []).length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#4f46e5', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📝 Accommodations I need'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.85 } },
                d.myAccommodations.map(function(a, i) { return h('li', { key: i }, a); })
              )
            ) : null,

            // Sensory diet
            (d.regulatingActivities || []).length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#15803d', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🥗 My sensory diet'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 13, lineHeight: 1.85 } },
                d.regulatingActivities.map(function(a, i) {
                  var sys = SYSTEMS.find(function(s) { return s.id === a.system; });
                  return h('li', { key: i }, a.label + (a.when ? ' (' + a.when + ')' : '') + (sys ? ' — ' + sys.label : ''));
                })
              )
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Sensory framework: Ayres (1972), Dunn (1997). For formal sensory evaluation, see an occupational therapist (OT). ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('sensoryRegulation', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fdba74', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A descriptive tool for mapping your own sensory processing. It is NOT a diagnostic instrument; it is a structured way to put words to experiences that many sensory-different people have always had but never had vocabulary for. The hope is that naming the pattern lets you advocate for what you need, plan a sensory diet that regulates you, and stop blaming yourself for the things that overwhelm you.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool deliberately uses identity-first language ("autistic peer," not "peer with autism") because that is what most autistic adults prefer (Kenny et al. 2016; Bury et al. 2020). When students or families have a different preference, honor it; when you do not know, identity-first is the more autistic-affirming default.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fdba74', fontSize: 16 } }, 'Where the framework comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The 8-systems sensory model comes from occupational therapy, originally A. Jean Ayres\' work in the 1960s-70s on Sensory Integration. Winnie Dunn formalized the seeker/avoider/sensitive/registration model in the 1990s. The neurodiversity movement (Judy Singer, Nick Walker, others) has reframed these differences as identity rather than disorder. Autistic-led scholars like Olga Bogdashina, Judy Endow, and Damian Milton have deepened the conversation: sensory difference is real and shapes life, AND the disabling part is usually the environment\'s failure to accommodate, not the sensory profile itself.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fdba74', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Ayres, A. J. (1972)', 'Sensory Integration and Learning Disorders, Western Psychological Services', 'Foundational text. Established the field of sensory integration therapy in OT.', null),
            sourceCard('Dunn, W. (2007)', '"Supporting Children to Participate Successfully in Everyday Life by Using Sensory Processing Knowledge," Infants & Young Children, 20(2)', 'Dunn\'s framework: seeker, avoider, sensitive, registration.', null),
            sourceCard('Bogdashina, O. (2016)', 'Sensory Perceptual Issues in Autism and Asperger Syndrome (2nd ed.), Jessica Kingsley', 'Autistic-led scholarship on sensory differences. Highly recommended.', null),
            sourceCard('Endow, J.', 'judyendow.com', 'Autistic author and educator. Practical writing on sensory regulation from inside the experience.', 'https://www.judyendow.com/'),
            sourceCard('Singer, J. (2017)', 'NeuroDiversity: The Birth of an Idea', 'Origin of the neurodiversity framework.', null),
            sourceCard('Autistic Self Advocacy Network (ASAN)', 'autisticadvocacy.org', '"Nothing about us without us." Autistic-led organization with extensive free resources.', 'https://autisticadvocacy.org/'),
            sourceCard('STAR Institute for Sensory Processing', 'sensoryhealth.org', 'OT-led research and education on sensory processing.', 'https://www.sensoryhealth.org/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Sensory Processing Disorder (SPD) as a standalone diagnosis is contested. It is in the OT framework but not in the DSM-5. This does not mean sensory differences are not real; it means clinical categories are still being worked out.'),
              h('li', null, 'Sensory differences exist across many neurotypes, not just autism. ADHD people, traumatized people, anxious people, and many "neurotypical" people have sensory profiles. This tool is useful for anyone.'),
              h('li', null, 'A formal sensory evaluation by an OT is the right next step if you want to pursue clinical accommodations (in an IEP, 504, or workplace). This self-tool is a starting point.'),
              h('li', null, 'The "diet" metaphor is OT lineage. It has been critiqued by some autistic adults as paternalistic; "regulating activities" or "sensory practices" can be alternative framings. Use whatever language fits you.'),
              h('li', null, 'Many "interventions" historically marketed to autistic children (ABA-style sensory work, "tolerance training," forced eye contact) are now considered harmful by the autistic community. Affirming sensory work is about HONORING the profile, not changing it.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(249,115,22,0.10)', borderTop: '1px solid rgba(249,115,22,0.3)', borderRight: '1px solid rgba(249,115,22,0.3)', borderBottom: '1px solid rgba(249,115,22,0.3)', borderLeft: '3px solid #f97316', fontSize: 12.5, color: '#fed7aa', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Pair with Self-Advocacy and One-Page Profile for the IEP / 504 use case. For a class introduction (not a screening), simply teaching the 8 systems and the seeker/avoider vocabulary is enormously useful — many students discover language for experiences they have always had. Listen to autistic-led voices on what affirming practice looks like; ASAN is the best entry point.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#fdba74', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fed7aa', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fed7aa', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'profile') body = renderProfile();
      else if (view === 'diet') body = renderDiet();
      else if (view === 'accommodations') body = renderAccommodations();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Sensory Regulation' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
