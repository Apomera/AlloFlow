// ═══════════════════════════════════════════════════════════════
// sel_tool_bodystory.js — Body Story
// A body-acceptance and embodiment tool for adolescents. Built on
// Tylka's body appreciation framework, intuitive eating principles
// (Tribole & Resch), media literacy (Beauty Redefined), and
// inclusive body-neutrality work.
//
// Explicitly NOT weight-focused, NOT a screener, NOT diet-adjacent.
// Strong NEDA referral framing. Inclusive of all bodies, all
// genders, disability, race, size.
//
// Registered tool ID: "bodyStory"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('bodyStory'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-body')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-body';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  function defaultState() {
    return {
      view: 'home',
      // Things my body does for me
      bodyDoes: [],
      // Pressures I notice
      pressures: [],
      // Critical voices (where they come from, what they say)
      criticalVoices: '',
      // Functions I appreciate
      appreciation: '',
      // Media diet audit
      mediaInflows: [],
      mediaCuts: [],
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // What bodies DO (function-focused, not appearance-focused)
  var BODY_FUNCTIONS = [
    { id: 'breathe',  label: 'Breathing all day without my having to think about it', icon: '🫁' },
    { id: 'walk',     label: 'Walking, running, moving me through the world', icon: '🚶' },
    { id: 'see',      label: 'Letting me see colors, faces, the sky', icon: '👁️' },
    { id: 'hear',     label: 'Letting me hear music, voices I love, laughter', icon: '👂' },
    { id: 'touch',    label: 'Feeling textures, warmth, hugs', icon: '✋' },
    { id: 'eat',      label: 'Tasting food I enjoy', icon: '🍎' },
    { id: 'sleep',    label: 'Recovering during sleep', icon: '🌙' },
    { id: 'heal',     label: 'Healing from injuries and illness', icon: '🩹' },
    { id: 'speak',    label: 'Speaking, singing, expressing what I think', icon: '🗣️' },
    { id: 'create',   label: 'Creating things — art, music, writing, building', icon: '🎨' },
    { id: 'connect',  label: 'Connecting with people I love', icon: '🤝' },
    { id: 'play',     label: 'Playing — sports, dance, games, fun', icon: '⚽' },
    { id: 'learn',    label: 'Learning new things every day', icon: '🧠' },
    { id: 'feel',     label: 'Feeling emotions — joy, sadness, all of them', icon: '💛' },
    { id: 'rest',     label: 'Resting when I need it', icon: '🛋️' },
    { id: 'carry',    label: 'Carrying me through hard times', icon: '🌊' }
  ];

  var PRESSURE_STARTERS = [
    'Social media feeds I scroll',
    'Specific influencers / celebrities',
    'Diet culture / "wellness" content',
    'Comments from family',
    'Comments from peers',
    'Comparing myself to friends',
    'Sports / activity expectations',
    'Clothing not fitting / not available in my size',
    'Medical settings that focus on weight',
    'Photos / mirrors',
    'Performing on stage / video / camera',
    'Gendered expectations about how my body "should" look',
    'Racial / cultural beauty standards that exclude me',
    'Disability not represented in media'
  ];

  window.SelHub.registerTool('bodyStory', {
    icon: '🫂',
    label: 'Body Story',
    desc: 'A body-acceptance and embodiment tool. NOT weight-focused, NOT diet-adjacent, NOT a screener. Built on Tylka body appreciation, intuitive eating principles, and media literacy. Inclusive of all bodies, all genders, all sizes. Strong NEDA referral framing.',
    color: 'rose',
    category: 'care-of-self',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;

      var d = labToolData.bodyStory || defaultState();
      function setB(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.bodyStory) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { bodyStory: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setB({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#fda4af', fontSize: 22, fontWeight: 900 } }, '🫂 Body Story'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Your body is not a problem to be solved.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Frame', icon: '🫂' },
          { id: 'function', label: 'What my body does', icon: '🌊' },
          { id: 'pressures', label: 'Where the pressure comes from', icon: '🌪️' },
          { id: 'voices', label: 'The critical voice', icon: '💭' },
          { id: 'media', label: 'Media diet', icon: '📺' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Body Story sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#fb7185' : '#334155'),
                background: active ? 'rgba(251,113,133,0.18)' : '#1e293b',
                color: active ? '#fecdd3' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function safetyBanner() {
        return h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
          h('strong', null, '🆘 If you are restricting food, purging, exercising compulsively, or thinking constantly about food and your body — please get help. '),
          'These can be life-threatening. Call the NEDA helpline: ',
          h('a', { href: 'https://www.nationaleatingdisorders.org/', target: '_blank', rel: 'noopener noreferrer',
            style: { color: '#fca5a5', textDecoration: 'underline', fontWeight: 800 } }, 'nationaleatingdisorders.org ↗'),
          ' or text "NEDA" to 741741. Eating disorders are treatable, and the earlier you get help, the better. Tell a trusted adult today.'
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This tool is reflective practice, not therapy. Eating disorders and severe body distress need clinical care. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — the frame
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(251,113,133,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(251,113,133,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fecdd3', marginBottom: 4 } }, 'Your body is not a project.'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'You live in a culture that has spent billions of dollars convincing you that your body is wrong and that you should fix it. The "wrong" changes with the era — too thin, too thick, too curvy, too flat, too tall, too dark, too pale, too disabled. It is a moving target. It is meant to be a moving target. A body that is permanently insecure is a body that buys products.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool is built around a different frame: your body is not for looking at. Your body is for LIVING. It is the thing that gets you through your life. It is doing thousands of things right now to keep you alive. The work is not to make it look different. The work is to come back home to it.'
            )
          ),

          // The three traps
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fda4af', marginBottom: 10 } }, '🪤 Three traps to know about'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: '#fda4af' } }, 'Body positivity '), 'can become its own pressure: "I should love every part of my body all the time." Most people don\'t feel that way about ANYTHING. A neutral relationship with your body — "this is the body I live in; it is doing its job" — is more honest and more sustainable than forced positivity.'),
              h('li', null, h('strong', { style: { color: '#fda4af' } }, 'Wellness culture '), 'is often diet culture in different packaging. "Clean eating," "detox," "lifestyle," "wellness." When the underlying logic is "your body needs to be smaller / different / better," the diet industry has just put on a new outfit.'),
              h('li', null, h('strong', { style: { color: '#fda4af' } }, 'Body comparison '), 'is built into being on social media. Every scroll trains your brain to compare. The fix is rarely "compare differently"; the fix is often "spend less time in the comparison environment."')
            )
          ),

          // Inclusive frame
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, '🌐 Whose body? Inclusive frame'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
              'Body distress is shaped by who you are. Different bodies face different pressures:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.8 } },
              h('li', null, 'Fat bodies face fatphobia, both individual and structural (clothes, seats, medical care).'),
              h('li', null, 'Disabled bodies face ableism — being made invisible, made spectacle, or both.'),
              h('li', null, 'Black, brown, and Asian bodies face beauty standards that center whiteness.'),
              h('li', null, 'Trans and non-binary bodies face dysphoria and societal misgendering.'),
              h('li', null, 'Female-coded bodies face a lifetime of objectification from outside.'),
              h('li', null, 'Male-coded bodies face increasing muscle-and-leanness pressure (often invisible to the rest of the family).'),
              h('li', null, 'Athletic bodies face performance demands that can become eating disorder territory.')
            ),
            h('p', { style: { margin: '10px 0 0', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.7, fontStyle: 'italic' } },
              'The work is not the same for everyone. The frame ("body is for living, not for looking") applies; what makes that hard differs.'
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'Sections in this tool'),
          stepCard('🌊 What my body does (not how it looks)', 'List the functions your body performs that you actually appreciate. Tylka\'s framework: functional appreciation builds body acceptance.', function() { goto('function'); }, '#0ea5e9'),
          stepCard('🌪️ Where the pressure comes from', 'Inventory the specific sources of body pressure in your life. Naming them takes their power down.', function() { goto('pressures'); }, '#f59e0b'),
          stepCard('💭 The critical voice', 'Whose voice is the harshest in your head about your body? Where did you learn that voice?', function() { goto('voices'); }, '#a855f7'),
          stepCard('📺 Media diet audit', 'What feeds, accounts, content do you let into your eyes daily? What is doing harm? What could you cut?', function() { goto('media'); }, '#ec4899'),

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
      // FUNCTION — what my body does
      // ═══════════════════════════════════════════════════════════
      function renderFunction() {
        function toggleFunction(id) {
          var list = (d.bodyDoes || []).slice();
          var idx = list.indexOf(id);
          if (idx >= 0) list.splice(idx, 1); else list.push(id);
          setB({ bodyDoes: list });
        }

        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', border: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 13, color: '#bae6fd', lineHeight: 1.7 } },
            h('strong', null, '🌊 Tylka\'s functional appreciation framework. '),
            'Research shows that focusing on what your body DOES (function) builds a more durable relationship with your body than trying to feel positive about how it LOOKS. Mark every function your body performs that you actually appreciate, even a little.'
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
            BODY_FUNCTIONS.map(function(f) {
              var selected = (d.bodyDoes || []).indexOf(f.id) !== -1;
              return h('button', { key: f.id, onClick: function() { toggleFunction(f.id); }, 'aria-pressed': selected, 'aria-label': f.label,
                style: { textAlign: 'left', padding: 12, borderRadius: 8, border: '2px solid ' + (selected ? '#0ea5e9' : '#1e293b'), background: selected ? 'rgba(14,165,233,0.10)' : '#0f172a', cursor: 'pointer', color: '#e2e8f0' } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
                  h('span', { style: { fontSize: 18 } }, f.icon),
                  h('span', { style: { fontSize: 12, color: selected ? '#7dd3fc' : '#cbd5e1', lineHeight: 1.5 } }, f.label),
                  selected ? h('span', { style: { marginLeft: 'auto', fontSize: 12, color: '#0ea5e9' } }, '✓') : null
                )
              );
            })
          ),

          // Open reflection
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9' } },
            h('label', { htmlFor: 'b-appreciation', style: { display: 'block', fontSize: 12, color: '#7dd3fc', fontWeight: 800, marginBottom: 6 } }, 'What else does my body do that I want to name?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Be specific. Not vague positivity; concrete functions. "My hands held my friend\'s hand when they were scared." "My legs carried me through a really long bus ride."'),
            h('textarea', { id: 'b-appreciation', value: d.appreciation || '',
              placeholder: 'My body...',
              onChange: function(e) { setB({ appreciation: e.target.value }); },
              style: { width: '100%', minHeight: 130, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRESSURES
      // ═══════════════════════════════════════════════════════════
      function renderPressures() {
        function togglePressure(label) {
          var list = (d.pressures || []).slice();
          var idx = list.indexOf(label);
          if (idx >= 0) list.splice(idx, 1); else list.push(label);
          setB({ pressures: list });
        }
        function addCustom() {
          var el = document.getElementById('b-pressure-input');
          if (!el || !el.value.trim()) return;
          var list = (d.pressures || []).slice();
          if (list.indexOf(el.value.trim()) === -1) list.push(el.value.trim());
          setB({ pressures: list });
          el.value = '';
        }
        function remove(i) {
          var list = (d.pressures || []).slice();
          list.splice(i, 1);
          setB({ pressures: list });
        }

        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 13, color: '#fde68a', lineHeight: 1.7 } },
            h('strong', null, '🌪️ Naming the pressure sources. '),
            'Body distress is rarely random. It comes from specific places. Naming the specific sources is the first step toward deciding which ones you can change, which ones you can\'t, and which ones you can at least see for what they are.'
          ),

          // Selected pressures
          (d.pressures || []).length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#fde68a', fontWeight: 800, marginBottom: 8 } }, 'My pressure sources (' + d.pressures.length + ')'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              d.pressures.map(function(p, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 14, background: '#1e293b', border: '1px solid #f59e0b66', fontSize: 12, color: '#e2e8f0' } },
                  h('span', null, p),
                  h('button', { onClick: function() { remove(i); }, 'aria-label': 'Remove',
                    style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11 } }, '✕')
                );
              })
            )
          ) : null,

          // Add custom
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#fde68a', fontWeight: 800, marginBottom: 8 } }, '+ Add a pressure source'),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'b-pressure-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add pressure source'),
              h('input', { id: 'b-pressure-input', type: 'text', placeholder: 'Be specific...',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } },
                style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('button', { onClick: addCustom, 'aria-label': 'Add pressure',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            )
          ),

          // Starter list
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 10 } }, 'Common pressure sources (tap to select)'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              PRESSURE_STARTERS.map(function(p, i) {
                var selected = (d.pressures || []).indexOf(p) !== -1;
                return h('button', { key: i, onClick: function() { togglePressure(p); }, 'aria-pressed': selected, 'aria-label': 'Toggle: ' + p,
                  style: { padding: '4px 10px', borderRadius: 14, border: '1px solid #f59e0b66', background: selected ? 'rgba(245,158,11,0.18)' : 'rgba(15,23,42,0.6)', color: selected ? '#fde68a' : '#cbd5e1', cursor: 'pointer', fontSize: 11 } },
                  (selected ? '✓ ' : '+ ') + p);
              })
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // VOICES
      // ═══════════════════════════════════════════════════════════
      function renderVoices() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.7 } },
            h('strong', null, '💭 The critical voice in your head is not yours. '),
            'It was put there. By comments, by ads, by feeds, by a family member, by a coach, by years of cumulative exposure. The voice feels like yours because it lives in your head, but you can trace where it came from. That tracing is part of how it gets quieter.'
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #a855f7' } },
            h('label', { htmlFor: 'b-voices', style: { display: 'block', fontSize: 12, color: '#c4b5fd', fontWeight: 800, marginBottom: 6 } }, 'The critical voice about my body'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, lineHeight: 1.6, fontStyle: 'italic' } }, 'Try this structure: WHO does the voice sound like? (A specific person? A composite of media?) WHAT does it say? WHEN did you start hearing it? WHERE did it come from?'),
            h('textarea', { id: 'b-voices', value: d.criticalVoices || '',
              placeholder: 'The voice sounds like... It says... I started hearing it when... It came from...',
              onChange: function(e) { setB({ criticalVoices: e.target.value }); },
              style: { width: '100%', minHeight: 180, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginTop: 14, fontSize: 13, color: '#bbf7d0', lineHeight: 1.7 } },
            h('strong', null, '💡 What helps: '),
            'naming the voice externalizes it. ("That\'s the diet-culture voice." "That\'s my mom\'s voice from when I was 10." "That\'s the voice that started after the comment in 8th grade gym class.") When the voice fires, you can name it instead of obeying it. The Compassion & Self-Talk tool in this SEL Hub helps with the next step: building a kinder inner voice.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // MEDIA — diet audit
      // ═══════════════════════════════════════════════════════════
      function renderMedia() {
        function addInflow() {
          var el = document.getElementById('b-media-in');
          if (!el || !el.value.trim()) return;
          var list = (d.mediaInflows || []).slice();
          list.push(el.value.trim());
          setB({ mediaInflows: list });
          el.value = '';
        }
        function addCut() {
          var el = document.getElementById('b-media-cut');
          if (!el || !el.value.trim()) return;
          var list = (d.mediaCuts || []).slice();
          list.push(el.value.trim());
          setB({ mediaCuts: list });
          el.value = '';
        }
        function removeInflow(i) {
          var list = (d.mediaInflows || []).slice();
          list.splice(i, 1);
          setB({ mediaInflows: list });
        }
        function removeCut(i) {
          var list = (d.mediaCuts || []).slice();
          list.splice(i, 1);
          setB({ mediaCuts: list });
        }

        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(236,72,153,0.10)', border: '1px solid rgba(236,72,153,0.3)', borderLeft: '3px solid #ec4899', marginBottom: 14, fontSize: 13, color: '#fbcfe8', lineHeight: 1.7 } },
            h('strong', null, '📺 Your eyes have a diet. '),
            'Every account you follow, every show you watch, every feed you scroll is feeding you images and ideas about bodies. Some of it is neutral. Some of it is actively harming you. An audit makes the harm visible so you can decide what to cut.'
          ),

          // Inflows
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 6 } }, '📥 What I currently let in (be honest)'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, 'Apps, accounts, shows, magazines, specific influencers. The stuff you actually look at.'),
            (d.mediaInflows || []).length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              d.mediaInflows.map(function(item, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 14, background: '#1e293b', border: '1px solid rgba(239,68,68,0.4)', fontSize: 12, color: '#fecaca' } },
                  h('span', null, item),
                  h('button', { onClick: function() { removeInflow(i); }, 'aria-label': 'Remove',
                    style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11 } }, '✕'));
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'b-media-in', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add to inflows'),
              h('input', { id: 'b-media-in', type: 'text', placeholder: 'Specific account, show, app, person',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addInflow(); } },
                style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('button', { onClick: addInflow, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            )
          ),

          // Cuts
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 6 } }, '✂ What I will cut, mute, or unfollow'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, 'For each thing you let in, ask: is this helping me come home to my body, or is it telling me I am wrong? If it is telling you you are wrong: unfollow, mute, delete, leave. The relief comes within days.'),
            (d.mediaCuts || []).length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              d.mediaCuts.map(function(item, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 14, background: '#1e293b', border: '1px solid rgba(34,197,94,0.4)', fontSize: 12, color: '#bbf7d0' } },
                  h('span', null, '✂ ' + item),
                  h('button', { onClick: function() { removeCut(i); }, 'aria-label': 'Remove',
                    style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11 } }, '✕'));
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'b-media-cut', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add to cuts'),
              h('input', { id: 'b-media-cut', type: 'text', placeholder: 'What I will unfollow / mute / leave',
                onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); addCut(); } },
                style: { flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13 } }),
              h('button', { onClick: addCut, 'aria-label': 'Add',
                style: { padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Add')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.65 } },
            h('strong', null, '🌐 Replacement matters too: '),
            'cutting harmful content leaves an empty feed. Fill it with accounts that show varied bodies doing actual things: athletes of every size, disabled creators, transitioned folks who are at home in themselves, your own friends doing things they love. Beauty Redefined, NEDA, ASDAH, and individual creators like @nourishandeat, @bodyposipanda, @virgietovar, @sonyareneetaylor have all done this work publicly.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('bodyStory', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)', borderLeft: '4px solid #ef4444', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#fca5a5', fontSize: 16 } }, '🆘 If you are struggling with food and your body — please read this'),
            h('p', { style: { margin: '0 0 8px', color: '#fecaca', fontSize: 13.5, lineHeight: 1.7 } },
              'Eating disorders are serious mental illnesses with the second highest mortality rate of any psychiatric disorder. They are also TREATABLE — especially when caught early. Signs to take seriously:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#fecaca', fontSize: 13, lineHeight: 1.8 } },
              h('li', null, 'Restricting food intake, skipping meals systematically, severe calorie counting.'),
              h('li', null, 'Binge eating followed by guilt and shame.'),
              h('li', null, 'Purging (vomiting, laxatives, compulsive exercise).'),
              h('li', null, 'Thinking about food, weight, or your body for hours every day.'),
              h('li', null, 'Withdrawing from social eating, avoiding meals with family or friends.'),
              h('li', null, 'Significant weight change in either direction.'),
              h('li', null, 'Body checking constantly (mirrors, scales, photos).')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#fecaca', fontSize: 13.5, lineHeight: 1.7 } },
              h('strong', null, 'Eating disorders affect every body, every gender, every race, every size. '),
              'They are NOT just a "thin white girl" problem. Black, brown, fat, masculine, and disabled people often go undiagnosed BECAUSE of stereotypes. If you are struggling, you are not alone, and you deserve help.'),
            h('p', { style: { margin: '8px 0 0', color: '#fecaca', fontSize: 13.5, lineHeight: 1.7 } },
              h('strong', null, 'NEDA Helpline: '),
              h('a', { href: 'https://www.nationaleatingdisorders.org/help-support/contact-helpline', target: '_blank', rel: 'noopener noreferrer',
                style: { color: '#fca5a5', textDecoration: 'underline', fontWeight: 800 } }, 'nationaleatingdisorders.org ↗'),
              ' · Text "NEDA" to 741741 · Tell a school counselor today.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A reflective tool built on body appreciation and intuitive eating principles, NOT on weight loss or body change. The frame is: your body is not a problem to be solved; it is the thing that gets you through your life. The work is to come back home to it.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool deliberately does NOT include a body image screener, body satisfaction scale, or any quantitative body assessment. Surfacing body distress without offering treatment is not helpful. If you are in real distress about your body, the NEDA helpline is the right next step.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fda4af', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Tylka, T. L. and Wood-Barcalow, N. L. (2015)', '"The Body Appreciation Scale-2," Body Image, 12, 53-67', 'The validated measure of body appreciation. Tylka\'s framework underlies this tool.', null),
            sourceCard('Tribole, E. and Resch, E. (2020)', 'Intuitive Eating: A Revolutionary Anti-Diet Approach (4th ed.), St. Martin\'s Essentials', 'The intuitive eating framework. Anti-diet, pro-body. Widely used in eating disorder recovery.', null),
            sourceCard('NEDA (National Eating Disorders Association)', 'nationaleatingdisorders.org', 'US clearinghouse for eating disorder education, screening (clinical), and treatment referral.', 'https://www.nationaleatingdisorders.org/'),
            sourceCard('ASDAH (Association for Size Diversity and Health)', 'asdah.org', 'Home of the Health at Every Size (HAES) framework. Anti-fatphobia, weight-inclusive health.', 'https://asdah.org/'),
            sourceCard('Taylor, S. R. (2018)', 'The Body Is Not an Apology: The Power of Radical Self-Love, Berrett-Koehler', 'Foundational text in body justice, written by a Black queer disabled author. Wide reach.', null),
            sourceCard('Tovar, V. (2018)', 'You Have the Right to Remain Fat, The Feminist Press', 'Critical and personal text on fatphobia, intersectional approach.', null),
            sourceCard('Beauty Redefined', 'beautyredefined.org', 'Media literacy + body image research-based education. Excellent resources.', 'https://beautyredefined.org/'),
            sourceCard('Project HEAL', 'theprojectheal.org', 'Eating disorder treatment access for those who cannot afford care.', 'https://www.theprojectheal.org/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Body neutrality and appreciation work helps with everyday body distress and the cumulative effects of media. It is NOT a treatment for eating disorders or body dysmorphic disorder. Those need clinical care.'),
              h('li', null, 'You cannot solve fatphobia, ableism, transphobia, or racism by changing your individual relationship to your body. Those are systems and they require systemic responses. Individual body acceptance is part of the work, not all of it.'),
              h('li', null, 'For students with gender dysphoria, the relationship to the body is more complicated than this tool addresses. Affirming care from clinicians who specialize in trans youth is the right path.'),
              h('li', null, '"Just love yourself" is not advice. The pressure to "love your body" can become another form of pressure. This tool aims for neutrality and function-based appreciation, not forced positivity.'),
              h('li', null, 'The media diet audit assumes you have some control over what you consume. For students in shared family situations (everyone watching the same shows, scrolling near family who comments), the work is harder. Do what you can.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(251,113,133,0.10)', border: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', fontSize: 12.5, color: '#fecdd3', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Do NOT use this tool as a class activity that requires sharing. Body distress is intimate. Make the tool available; let students use it privately. For class content on body image, the media literacy angle (Beauty Redefined material) is the safest entry point. Be alert to signs of eating disorders in students; they are common, often hidden, and often missed in marginalized students (boys, athletes, fat students, students of color, trans students). Pair this tool with Compassion & Self-Talk and Sensory Regulation.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#fda4af', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fecdd3', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fecdd3', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — body story summary, useful for therapy / journaling
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var doneFunctions = (d.bodyDoes || []).map(function(id) {
          var f = BODY_FUNCTIONS.find(function(x) { return x.id === id; });
          return f ? f.label : null;
        }).filter(Boolean);
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(251,113,133,0.10)', borderRadius: 8, border: '1px solid rgba(251,113,133,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#fecdd3', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Body Story summary — private work; print only for yourself or a therapist conversation.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'body-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#body-print-region, #body-print-region * { visibility: visible !important; } ' +
              '#body-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #be123c' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Body Story'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My body story'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            doneFunctions.length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#0ea5e9', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🌊 What my body does (function appreciation)'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 12.5, lineHeight: 1.8 } },
                doneFunctions.map(function(label, i) { return h('li', { key: i }, label); })
              )
            ) : null,

            d.appreciation ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'My specific appreciations'),
              h('p', { style: { margin: '0 0 0 12px', color: '#0f172a', fontSize: 12.5, lineHeight: 1.75, whiteSpace: 'pre-wrap' } }, d.appreciation)
            ) : null,

            (d.pressures || []).length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#f59e0b', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🌪️ Pressure sources I have named'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: '#0f172a', fontSize: 12.5, lineHeight: 1.8 } },
                d.pressures.map(function(p, i) { return h('li', { key: i }, p); })
              )
            ) : null,

            d.criticalVoices ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#a855f7', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '💭 The critical voice'),
              h('p', { style: { margin: '0 0 0 12px', color: '#0f172a', fontSize: 12.5, lineHeight: 1.75, whiteSpace: 'pre-wrap' } }, d.criticalVoices)
            ) : null,

            ((d.mediaInflows || []).length > 0 || (d.mediaCuts || []).length > 0) ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: '#ec4899', color: '#fff', padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📺 Media diet'),
              (d.mediaInflows || []).length > 0 ? h('div', { style: { marginBottom: 8, padding: '0 12px' } },
                h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'Currently letting in'),
                h('div', { style: { fontSize: 12, color: '#0f172a', lineHeight: 1.7 } }, d.mediaInflows.join('  ·  '))
              ) : null,
              (d.mediaCuts || []).length > 0 ? h('div', { style: { padding: '0 12px' } },
                h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'Cutting / muting / unfollowing'),
                h('div', { style: { fontSize: 12, color: '#0f172a', lineHeight: 1.7 } }, d.mediaCuts.join('  ·  '))
              ) : null
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Tylka body appreciation framework · Intuitive Eating · NEDA helpline: 1-800-931-2237. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      var body;
      if (view === 'function') body = renderFunction();
      else if (view === 'pressures') body = renderPressures();
      else if (view === 'voices') body = renderVoices();
      else if (view === 'media') body = renderMedia();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Body Story' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
