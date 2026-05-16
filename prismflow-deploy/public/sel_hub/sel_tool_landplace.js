// ═══════════════════════════════════════════════════════════════
// sel_tool_landplace.js — Land & Place: Stewardship Studio
// A practice tool for building ongoing relationship with the land
// you live on. Frames land acknowledgment as PRACTICE, not
// PERFORMANCE, with critical-reflection steps and explicit pointers
// to Wabanaki-led organizations as the authoritative voices.
// Registered tool ID: "landPlace"
// Category: stewardship
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('landPlace'))) {
(function() {
  'use strict';

  // ── WCAG 4.1.3: live region ──
  (function() {
    if (document.getElementById('allo-live-landplace')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-landplace';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // ═══════════════════════════════════════════════════════════
  // WABANAKI CONFEDERACY DATA
  // ═══════════════════════════════════════════════════════════
  // The Wabanaki Confederacy is five distinct nations with their
  // own languages, governments, and cultural offices. This block
  // is descriptive only; for authoritative voice on any specific
  // nation, the in-tool guidance points students to that nation's
  // own cultural office or learning programs.
  var WABANAKI_NATIONS = [
    {
      id: 'penobscot', name: 'Penobscot Nation',
      territory: 'Penobscot River watershed (central + northern Maine)',
      languageNote: 'Penobscot language, in active revitalization through the Penobscot Cultural and Historic Preservation Department',
      learnFrom: ['Penobscot Cultural and Historic Preservation Department', 'Penobscot Nation website (penobscotnation.org)', 'Maulian Bryant\'s public scholarship'],
      knownFor: 'Led the Penobscot River Restoration Project (Veazie Dam removal 2012, Great Works Dam removal 2013). Indian Island is the seat of government.'
    },
    {
      id: 'passamaquoddy', name: 'Passamaquoddy Tribe',
      territory: 'Eastern Maine coast and St. Croix watershed; two reservations: Sipayik (Pleasant Point) and Indian Township',
      languageNote: 'Passamaquoddy-Maliseet language (closely related to Maliseet), active revitalization at both reservations',
      learnFrom: ['Sipayik Environmental Department', 'Passamaquoddy Cultural Heritage Museum', 'passamaquoddy.com'],
      knownFor: 'Long history of marine and freshwater stewardship. Sipayik faces acute sea-level and erosion risks under climate change.'
    },
    {
      id: 'maliseet', name: 'Houlton Band of Maliseet Indians',
      territory: 'Meduxnekeag River watershed (Aroostook County) and historic St. John River territory',
      languageNote: 'Passamaquoddy-Maliseet language',
      learnFrom: ['Maliseet Nation Conservation Department', 'maliseets.com'],
      knownFor: 'Stewardship of the Meduxnekeag, ongoing river restoration work, and brown ash conservation efforts.'
    },
    {
      id: 'mikmaq', name: 'Aroostook Band of Micmacs (Mi\'kmaq Nation)',
      territory: 'Aroostook County and historic Mi\'kma\'ki (extending across Maritime Canada)',
      languageNote: 'Mi\'kmaq language',
      learnFrom: ['Aroostook Band of Micmacs cultural and natural resources programs', 'micmac-nsn.gov'],
      knownFor: 'Federally recognized 1991. Strong basketry tradition with the Maine Indian Basketmakers Alliance.'
    },
    {
      id: 'abenaki', name: 'Abenaki',
      territory: 'Historic territory across western Maine, New Hampshire, Vermont, and southern Québec',
      languageNote: 'Abenaki language, taught in some community programs',
      learnFrom: ['Abenaki Helping Abenaki', 'Cowasuck Band of the Pennacook-Abenaki People', 'Vermont Abenaki Artists Association (vt-aaa.org)'],
      knownFor: 'Currently working to advance state and federal recognition. Active in cultural revitalization and storytelling traditions.'
    }
  ];

  // ── Worked example acknowledgment (clearly labeled as example, not script) ──
  var EXAMPLE_ACKNOWLEDGMENT = (
    'I am writing this from Portland, Maine, on the unceded ancestral homelands of the Wabanaki Confederacy, ' +
    'and most directly the Abenaki. The Penobscot and Passamaquoddy nations also have deep historic ties to this region. ' +
    'I want to be honest that an acknowledgment by itself does not return land or honor treaties. ' +
    'I am committing to follow Wabanaki Public Health and Wellness on social media, attend one Wabanaki-led public event ' +
    'this year, and learn the actual treaty history that connects me to this place.'
  );

  // ── Wabanaki-led and Wabanaki-supporting organizations in Maine ──
  var WABANAKI_ORGS = [
    { name: 'Wabanaki Public Health and Wellness', url: 'wabanakipublichealth.org', focus: 'Community health, food sovereignty, weatherization, heat pumps, EV chargers, climate work serving all Wabanaki communities.' },
    { name: 'Maine Indian Basketmakers Alliance', url: 'maineindianbaskets.org', focus: 'Brown ash basketry tradition + emerald ash borer response. Annual Native American Festival.' },
    { name: 'Penobscot Cultural and Historic Preservation Department', url: 'penobscotnation.org', focus: 'Penobscot Nation language, archaeology, repatriation, river restoration.' },
    { name: 'Passamaquoddy Cultural Heritage Museum', url: 'passamaquoddy.com', focus: 'Passamaquoddy history, language, art, and contemporary life.' },
    { name: 'Sipayik Environmental Department', url: 'wabanaki-environment.org', focus: 'Coastal and watershed stewardship at Sipayik (Pleasant Point), water quality work in eastern Maine.' },
    { name: 'University of Maine Wabanaki Center', url: 'umaine.edu/nativeamericanprograms', focus: 'Wabanaki Studies academic programs and resources for Maine educators.' },
    { name: 'First Light Learning Journey', url: 'firstlightlearningjourney.net', focus: 'Cross-cultural learning between Wabanaki and non-Wabanaki Mainers. Workshops, books, study guides.' },
    { name: 'Wabanaki REACH', url: 'wabanakireach.org', focus: 'Truth, healing, and change work emerging from the Maine Wabanaki-State Child Welfare Truth and Reconciliation Commission.' },
    { name: 'Maine Wabanaki-State Child Welfare TRC report (2015)', url: 'mainewabanakitrc.org', focus: 'The truth and reconciliation report on the Indian Child Welfare Act in Maine. Required reading for serious learning.' }
  ];

  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════
  function defaultState() {
    return {
      view: 'overview',                  // 'overview' | 'threads' | 'build' | 'beyond' | 'journal'
      threadNotes: { history: '', ecology: '', present: '' },
      ack: { where: '', whose: '', honesty: '', commit: '' },
      journal: [],                       // [{ date, text }]
      reflectionAnswers: {}              // critical-reflection responses
    };
  }

  // ─── Tool registration ───
  window.SelHub.registerTool('landPlace', {
    icon: '🌱',
    label: 'Land & Place',
    desc: 'Stewardship Studio: build ongoing relationship with the land you live on. Three threads (history, ecology, present), critical reflection on land acknowledgment as practice rather than performance, and Wabanaki-led organizations as authoritative voices.',
    color: 'emerald',
    category: 'stewardship',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.landPlace || defaultState();
      function setLP(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.landPlace) || defaultState();
          return Object.assign({}, prev, { landPlace: Object.assign({}, prior, patch) });
        });
      }

      var view = d.view || 'overview';
      function goto(v) { setLP({ view: v }); }

      // ─── Header + nav ───
      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#86efac', fontSize: 22, fontWeight: 900 } }, '🌱 Land & Place: Stewardship Studio'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A practice for ongoing relationship with the land you live on. Not a template to recite.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'overview', label: 'What is this place?', icon: '🌍' },
          { id: 'threads', label: 'Three threads', icon: '🧵' },
          { id: 'build', label: 'Build acknowledgment', icon: '✏️' },
          { id: 'beyond', label: 'Beyond acknowledgment', icon: '🚶' },
          { id: 'journal', label: 'Reflection journal', icon: '📓' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'Land & Place sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#86efac' : '#334155'),
                background: active ? 'rgba(134,239,172,0.18)' : '#1e293b',
                color: active ? '#bbf7d0' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      // ─── Soft pointer at the bottom of every view ───
      function authoritativeVoicePointer() {
        return h('div', {
          style: { marginTop: 18, padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.08)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', fontSize: 12.5, color: '#e9d5ff', lineHeight: 1.55 }
        },
          h('strong', { style: { color: '#a855f7' } }, '🪶 This tool is a learning scaffold, not an authoritative voice. '),
          'For real understanding of Wabanaki nations, follow and learn directly from Wabanaki Public Health and Wellness, Maine Indian Basketmakers Alliance, the Penobscot Nation Cultural and Historic Preservation Department, the Passamaquoddy Cultural Heritage Museum, First Light Learning Journey, and the University of Maine Wabanaki Center.'
        );
      }

      // ═══════════════════════════════════════════════════════
      // VIEW 1: OVERVIEW — "What is this place?"
      // ═══════════════════════════════════════════════════════
      function renderOverview() {
        return h('div', null,
          // Framing
          h('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(134,239,172,0.16) 0%, rgba(56,189,248,0.06) 100%)', borderTop: '1px solid rgba(134,239,172,0.4)', borderRight: '1px solid rgba(134,239,172,0.4)', borderBottom: '1px solid rgba(134,239,172,0.4)', borderLeft: '4px solid #86efac', marginBottom: 14, fontSize: 14, color: '#e2e8f0', lineHeight: 1.65 } },
            h('strong', { style: { color: '#bbf7d0' } }, 'You are reading this from somewhere. '),
            'Whose land is it? Who lived here before, and who lives here now? What grew here, what was taken, what is recovering? These are not abstract questions. They have specific answers in specific places.'
          ),

          // Self-locate prompt
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, '🧭 Self-locate'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.6 } },
              'Right now, in this moment, you are reading this from a specific place. ',
              h('strong', { style: { color: '#fbbf24' } }, 'What town, neighborhood, building, or room is it?'),
              ' If you do not know the specific Indigenous name for the land you are on, ',
              h('a', { href: 'https://native-land.ca', target: '_blank', rel: 'noopener noreferrer', style: { color: '#7dd3fc' } }, 'native-land.ca'),
              ' is a good starting point. It is a tool built by Indigenous people. Treat its data as starting place, not final answer.'
            )
          ),

          // Wabanaki Confederacy: 5 nations
          h('div', { style: { marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, '🪶 The Wabanaki Confederacy'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.6 } },
              'If you are in what is currently called Maine, you are on Wabanaki land. The Wabanaki Confederacy is ',
              h('strong', null, 'five distinct nations'),
              ', each with its own language, government, treaties, and cultural offices. They are not one group with one voice.'
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 } },
              WABANAKI_NATIONS.map(function(n) {
                return h('div', { key: n.id, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
                  h('div', { style: { fontWeight: 700, color: '#86efac', fontSize: 13, marginBottom: 4 } }, n.name),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 } }, n.territory),
                  h('div', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, n.languageNote),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.5 } }, n.knownFor)
                );
              })
            )
          ),

          // Maine LD 291 context
          h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', fontSize: 12.5, color: '#fde68a', lineHeight: 1.55, marginBottom: 14 } },
            h('strong', null, '📜 Maine LD 291 (2001): '),
            'Maine state law requires that Wabanaki history, culture, and government be taught in K-12 public schools. This tool can support that work, but it cannot replace the Wabanaki Studies curriculum and the Wabanaki educators who teach it. If your school does not have a Wabanaki Studies program, ask why.'
          ),

          authoritativeVoicePointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // VIEW 2: THREE THREADS — history, ecology, present
      // ═══════════════════════════════════════════════════════
      function renderThreads() {
        var threads = [
          {
            id: 'history', icon: '📜', color: '#fbbf24', label: 'History',
            framing: 'What has happened in this specific place? Indigenous nations have lived here for at least 11,000 years. Colonization arrived in the 1600s with disease, war, and dispossession. Treaties were signed and violated. Boarding schools and the Indian Child Welfare crisis happened in living memory. Look up the specific history of YOUR town or watershed.',
            prompts: [
              'What is the Indigenous name for this place? If you can not find one quickly, what does that absence tell you?',
              'What treaty applies to this land? When was it signed? Was it honored?',
              'What happened to the Indigenous people who lived here? Where are they now?',
              'What does your school or town acknowledge about this history? What does it leave out?'
            ]
          },
          {
            id: 'ecology', icon: '🌲', color: '#16a34a', label: 'Ecology',
            framing: 'What grows, swims, walks, and flies in this place? What used to live here that no longer does? What is recovering? The land you are on is a living community. Indigenous stewardship shaped it for millennia before European arrival; modern conservation is often re-learning what was already known.',
            prompts: [
              'What tree species dominate the forest where you live? Which are native, which are introduced?',
              'What animals lived here before colonization that are gone or returning? (Wolves, lynx, salmon, alewife, eel, sturgeon, beaver, mountain lion?)',
              'What plants and animals does the Wabanaki Cultural Mosaic, Conservation Manager, or Watershed Steward campaign in this app teach you about?',
              'What changed in the local ecology in the last 100 years? In the last 30?'
            ]
          },
          {
            id: 'present', icon: '🏘️', color: '#0ea5e9', label: 'Present',
            framing: 'Who lives here now? What communities, organizations, and leaders shape this place today? Wabanaki nations are not historic; they are present, sovereign, and active. Other communities (immigrant, Black, working-class, queer, disabled) also shape this place. Recognize the full present.',
            prompts: [
              'Who are the Wabanaki nations and communities active in your watershed today?',
              'What community organizations (Wabanaki and other) do you know about? What do they do?',
              'Who in your school, neighborhood, or town would you call a steward of this place? What makes them one?',
              'If you have lived here a long time, what do you notice changing? If you are new, what do you want to learn?'
            ]
          }
        ];

        function updateNote(threadId, text) {
          var notes = Object.assign({}, d.threadNotes || {}, { [threadId]: text });
          setLP({ threadNotes: notes });
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(134,239,172,0.10)', borderTop: '1px solid rgba(134,239,172,0.3)', borderRight: '1px solid rgba(134,239,172,0.3)', borderBottom: '1px solid rgba(134,239,172,0.3)', borderLeft: '3px solid #86efac', marginBottom: 14, fontSize: 13, color: '#bbf7d0', lineHeight: 1.55 } },
            '🧵 Three threads of relationship with place. Work through them at your own pace. None of these has a quick answer; that is the point.'
          ),
          threads.map(function(t) {
            return h('div', { key: t.id, style: { padding: 14, borderRadius: 10, background: '#0f172a', borderLeft: '3px solid ' + t.color, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h('span', { style: { fontSize: 24 } }, t.icon),
                h('div', null,
                  h('strong', { style: { color: t.color, fontSize: 15 } }, t.label),
                  h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.5, marginTop: 2 } }, t.framing)
                )
              ),
              h('div', { style: { marginTop: 10, paddingLeft: 12, borderLeft: '2px dashed ' + t.color + '66' } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontWeight: 700 } }, 'Prompts'),
                t.prompts.map(function(p, i) {
                  return h('div', { key: i, style: { fontSize: 12.5, color: '#cbd5e1', marginBottom: 4, lineHeight: 1.5 } }, '· ' + p);
                })
              ),
              h('label', { style: { display: 'block', marginTop: 10, marginBottom: 4, fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Your notes on ' + t.label.toLowerCase()),
              h('textarea', {
                value: (d.threadNotes || {})[t.id] || '',
                onChange: function(e) { updateNote(t.id, e.target.value); },
                placeholder: 'Write what you have learned, what you do not know yet, what you want to keep finding out.',
                style: { width: '100%', minHeight: 80, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }
              })
            );
          }),
          authoritativeVoicePointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // VIEW 3: BUILD ACKNOWLEDGMENT — with critical framing
      // ═══════════════════════════════════════════════════════
      function renderBuild() {
        var ack = d.ack || { where: '', whose: '', honesty: '', commit: '' };
        function updateAck(field, value) {
          setLP({ ack: Object.assign({}, ack, { [field]: value }) });
        }
        var composed = (ack.where || '[where you are]') + '. ' +
          (ack.whose ? 'This is the ancestral homeland of ' + ack.whose + '. ' : '') +
          (ack.honesty || '') + ' ' +
          (ack.commit || '');

        return h('div', null,
          // The critique up front
          h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.4)', borderRight: '1px solid rgba(239,68,68,0.4)', borderBottom: '1px solid rgba(239,68,68,0.4)', borderLeft: '4px solid #ef4444', marginBottom: 14 } },
            h('strong', { style: { color: '#fca5a5', fontSize: 14, display: 'block', marginBottom: 6 } }, '⚠ The critique to take seriously'),
            h('p', { style: { margin: 0, color: '#fecaca', fontSize: 13, lineHeight: 1.65 } },
              'Many Indigenous people and scholars have argued that land acknowledgments without action are worse than useless: they let non-Indigenous people perform care without doing the work. ',
              h('strong', null, 'A land acknowledgment is not an ending. It is a starting line for a commitment.'),
              ' If yours does not commit you to anything, it is not yet finished.'
            )
          ),

          // Four-part scaffold
          h('div', { style: { marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Build it in four parts'),

            // Part 1: Where
            h('div', { style: { marginBottom: 10, padding: 10, background: '#0f172a', borderRadius: 8, borderLeft: '3px solid #0ea5e9' } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#7dd3fc', marginBottom: 4 } }, '1. Where you are'),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, 'Be specific. A town, a neighborhood, a building, a watershed.'),
              h('textarea', { value: ack.where, onChange: function(e) { updateAck('where', e.target.value); },
                placeholder: 'I am writing this from...',
                style: { width: '100%', minHeight: 40, padding: 6, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }
              })
            ),

            // Part 2: Whose land
            h('div', { style: { marginBottom: 10, padding: 10, background: '#0f172a', borderRadius: 8, borderLeft: '3px solid #16a34a' } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#86efac', marginBottom: 4 } }, '2. Whose land it is'),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, 'Name the nation(s). For Maine: the Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq, or Abenaki, depending on where you specifically are. Multiple nations may have ties to the same place.'),
              h('textarea', { value: ack.whose, onChange: function(e) { updateAck('whose', e.target.value); },
                placeholder: 'This is the ancestral homeland of...',
                style: { width: '100%', minHeight: 40, padding: 6, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }
              })
            ),

            // Part 3: Honesty
            h('div', { style: { marginBottom: 10, padding: 10, background: '#0f172a', borderRadius: 8, borderLeft: '3px solid #f59e0b' } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 4 } }, '3. Honesty about what acknowledgment is'),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, 'Name that an acknowledgment is not the same as returning land or honoring treaties. Refuse to use this moment to feel good without committing to anything.'),
              h('textarea', { value: ack.honesty, onChange: function(e) { updateAck('honesty', e.target.value); },
                placeholder: 'I want to be honest that an acknowledgment by itself...',
                style: { width: '100%', minHeight: 50, padding: 6, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }
              })
            ),

            // Part 4: Commitment
            h('div', { style: { marginBottom: 10, padding: 10, background: '#0f172a', borderRadius: 8, borderLeft: '3px solid #a855f7' } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#c4b5fd', marginBottom: 4 } }, '4. A specific commitment you can keep'),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, 'One concrete action. Follow a Wabanaki-led organization, donate, attend an event, support a policy, learn the treaty history. Specific is better than grand.'),
              h('textarea', { value: ack.commit, onChange: function(e) { updateAck('commit', e.target.value); },
                placeholder: 'I am committing to...',
                style: { width: '100%', minHeight: 50, padding: 6, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }
              })
            )
          ),

          // Composed preview
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', marginBottom: 14 } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, '✏ Your acknowledgment, drafted'),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.7, fontStyle: ack.where || ack.whose || ack.honesty || ack.commit ? 'normal' : 'italic' } },
              ack.where || ack.whose || ack.honesty || ack.commit
                ? composed.replace(/\s+/g, ' ').trim()
                : 'Fill the four parts above to see your acknowledgment compose itself here.'
            )
          ),

          // Worked example, collapsible
          h('details', { style: { padding: 10, background: 'rgba(15,23,42,0.5)', border: '1px solid #1e293b', borderRadius: 8, marginBottom: 14 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#94a3b8' } }, '📖 See a worked example (do not copy)'),
            h('p', { style: { margin: '8px 0 0', color: '#cbd5e1', fontSize: 12.5, lineHeight: 1.7 } }, EXAMPLE_ACKNOWLEDGMENT),
            h('div', { style: { marginTop: 8, fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } },
              'Note: this is an example of FORM, not of CONTENT. Yours should be different because you are different and your place is different.'
            )
          ),

          authoritativeVoicePointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // VIEW 4: BEYOND ACKNOWLEDGMENT — relationship-building actions
      // ═══════════════════════════════════════════════════════
      function renderBeyond() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(167,139,250,0.10)', borderTop: '1px solid rgba(167,139,250,0.4)', borderRight: '1px solid rgba(167,139,250,0.4)', borderBottom: '1px solid rgba(167,139,250,0.4)', borderLeft: '4px solid #a78bfa', marginBottom: 14, fontSize: 14, color: '#e9d5ff', lineHeight: 1.65 } },
            h('strong', { style: { color: '#c4b5fd' } }, '🚶 Acknowledgment is not the work. '),
            'These are the people, organizations, and actions through which the actual work happens. Pick one or two to start.'
          ),

          h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Wabanaki-led and Wabanaki-supporting organizations'),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 10, marginBottom: 14 } },
            WABANAKI_ORGS.map(function(org, i) {
              return h('div', { key: i, style: { padding: 12, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid #86efac' } },
                h('div', { style: { fontWeight: 800, color: '#bbf7d0', fontSize: 13, marginBottom: 4 } }, org.name),
                h('div', { style: { fontSize: 11, color: '#fbbf24', fontFamily: 'ui-monospace, monospace', marginBottom: 6 } }, org.url),
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 } }, org.focus)
              );
            })
          ),

          // Action menu
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, '✦ Concrete actions, in roughly increasing order of commitment'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 12.5, lineHeight: 1.8 } },
              h('li', null, 'Follow one of these organizations on social media. Listen for six months before forming opinions.'),
              h('li', null, 'Attend a Wabanaki-led public event: Indian Island Powwow, Native American Festival (Hudson Museum, August), a Wabanaki cultural program at your library.'),
              h('li', null, 'Read the 2015 Maine Wabanaki-State Child Welfare Truth and Reconciliation Commission report. Slowly.'),
              h('li', null, 'Visit the Abbe Museum in Bar Harbor (Wabanaki-curated, the only Smithsonian-affiliated tribal museum in the Northeast).'),
              h('li', null, 'Donate to a Wabanaki-led organization on a recurring basis. Recurring matters more than amount.'),
              h('li', null, 'Learn one specific Wabanaki language word and what it means in context. Welimanal (sweetgrass). Wikp (brown ash). Sata (blueberry).'),
              h('li', null, 'Advocate for full tribal sovereignty in Maine state law. Maine is the only state where federally recognized tribes still operate under restricted sovereignty.'),
              h('li', null, 'Support land-back work and treaty rights, including in your professional and civic capacity.'),
              h('li', null, 'If you are an educator: champion Wabanaki Studies (LD 291) being actually taught at your school, not just nominally on the books.')
            )
          ),

          // The critical-reflection step
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.06)', borderTop: '1px solid rgba(239,68,68,0.25)', borderRight: '1px solid rgba(239,68,68,0.25)', borderBottom: '1px solid rgba(239,68,68,0.25)', borderLeft: '3px solid #ef4444', marginBottom: 14 } },
            h('strong', { style: { color: '#fca5a5', fontSize: 13 } }, '🔍 Honest self-check'),
            h('p', { style: { margin: '6px 0 0', color: '#fecaca', fontSize: 12.5, lineHeight: 1.6 } },
              'Of the actions above, which one have you actually done in the past 12 months? Which one will you actually do in the next 30 days? If your answer is "none and none," your land acknowledgment is not finished.'
            )
          ),

          authoritativeVoicePointer()
        );
      }

      // ═══════════════════════════════════════════════════════
      // VIEW 5: REFLECTION JOURNAL — ongoing personal reflection
      // ═══════════════════════════════════════════════════════
      function renderJournal() {
        var journal = d.journal || [];
        function addEntry() {
          var text = document.getElementById('landplace-new-entry');
          if (!text || !text.value.trim()) return;
          var entry = { date: new Date().toISOString().split('T')[0], text: text.value.trim() };
          setLP({ journal: journal.concat([entry]) });
          text.value = '';
          if (announceToSR) announceToSR('Journal entry saved.');
          if (addToast) addToast('Saved.', 'success');
        }
        function deleteEntry(index) {
          var newJournal = journal.slice();
          newJournal.splice(index, 1);
          setLP({ journal: newJournal });
        }

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(56,189,248,0.10)', borderTop: '1px solid rgba(56,189,248,0.3)', borderRight: '1px solid rgba(56,189,248,0.3)', borderBottom: '1px solid rgba(56,189,248,0.3)', borderLeft: '3px solid #38bdf8', marginBottom: 14, fontSize: 13, color: '#bae6fd', lineHeight: 1.55 } },
            '📓 An ongoing journal for what you are noticing, learning, getting confused about. Date-stamped. Private to you.'
          ),

          // New entry
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 14 } },
            h('label', { style: { display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 6 } }, 'New entry'),
            h('textarea', { id: 'landplace-new-entry',
              placeholder: 'What did you notice this week about the place you live? What did you learn? What are you still confused about?',
              style: { width: '100%', minHeight: 100, padding: 8, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', marginBottom: 8 }
            }),
            h('button', { onClick: addEntry, 'aria-label': 'Save journal entry',
              style: { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 12 } }, '+ Save entry')
          ),

          // Existing entries (newest first)
          journal.length > 0 ? h('div', null,
            h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, journal.length + ' entries'),
            journal.slice().reverse().map(function(entry, ri) {
              var realIdx = journal.length - 1 - ri;
              return h('div', { key: realIdx, style: { padding: 12, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('div', { style: { fontSize: 11, color: '#38bdf8', fontWeight: 700, fontFamily: 'ui-monospace, monospace' } }, entry.date),
                  h('button', { onClick: function() { deleteEntry(realIdx); }, 'aria-label': 'Delete entry from ' + entry.date,
                    style: { marginLeft: 'auto', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
                ),
                h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' } }, entry.text)
              );
            })
          ) : h('div', { style: { padding: 18, borderRadius: 10, background: '#0f172a', textAlign: 'center', color: '#64748b', fontSize: 13 } },
            'No entries yet. Save one above to start the practice.'
          ),

          authoritativeVoicePointer()
        );
      }

      // ── Root ──
      var body;
      if (view === 'threads') body = renderThreads();
      else if (view === 'build') body = renderBuild();
      else if (view === 'beyond') body = renderBeyond();
      else if (view === 'journal') body = renderJournal();
      else body = renderOverview();

      return h('div', { style: { maxWidth: 840, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Land and Place Stewardship Studio' },
        header(),
        (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('landPlace', h, ctx) : null),
        navTabs(),
        body
      );
    }
  });

})();
}
