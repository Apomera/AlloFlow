// ═══════════════════════════════════════════════════════════════
// sel_tool_identitysupport.js — Identity Support (LGBTQ+ inclusive)
// A supportive space for adolescents exploring gender identity,
// sexual orientation, romantic orientation, and broader identity
// questions. Built on Trevor Project, GLSEN, and PFLAG frameworks.
//
// Inclusive: not just for LGBTQ+ students. Cis and straight
// students benefit from the vocabulary and the ally section.
// Strong safety framing for trans youth specifically (the
// population with the highest crisis risk).
//
// For ALL students: identity exploration is normal adolescent
// development. This tool gives vocabulary, models, and resources
// without prescribing any particular identity.
//
// Sources: The Trevor Project (primary), GLSEN, PFLAG, Gender
// Spectrum, It Gets Better, Human Rights Campaign youth resources,
// Cass identity development model (with critique).
//
// Registered tool ID: "identitySupport"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('identitySupport'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-identity')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-identity';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Vocabulary items
  var GENDER_TERMS = [
    { term: 'Cisgender (cis)', def: 'A person whose gender matches the sex they were assigned at birth.' },
    { term: 'Transgender (trans)', def: 'A person whose gender does not match the sex they were assigned at birth. Includes trans men, trans women, and non-binary people.' },
    { term: 'Non-binary', def: 'A person whose gender is not exclusively man or woman. May be both, neither, or somewhere else entirely.' },
    { term: 'Gender-fluid', def: 'A person whose gender shifts over time. Sometimes a man, sometimes a woman, sometimes neither, sometimes both.' },
    { term: 'Agender', def: 'A person who does not experience gender as part of who they are.' },
    { term: 'Gender expression', def: 'How you present gender outwardly — clothes, hair, voice, body language. Different from gender identity (how you feel inside).' },
    { term: 'Pronouns', def: 'The words used to refer to you in third person. Common: he/him, she/her, they/them. Some people use neopronouns (e.g., xe/xem, ze/zir). Using someone\'s correct pronouns is basic respect.' },
    { term: 'Deadname', def: 'A name a trans person was given but no longer uses (often a birth name). Using someone\'s deadname when you know their current name is a form of harm called "deadnaming."' },
    { term: 'Dysphoria', def: 'Distress caused by misalignment between your body or how you\'re perceived and your gender identity. Real, treatable, often relieved by social and/or medical transition.' },
    { term: 'Euphoria', def: 'The flip side of dysphoria. The relief, joy, and rightness that comes when you\'re seen and treated as your real gender.' }
  ];

  var ORIENTATION_TERMS = [
    { term: 'Sexual orientation', def: 'Who you\'re sexually attracted to. (Some people experience little or no sexual attraction; that\'s also an orientation.)' },
    { term: 'Romantic orientation', def: 'Who you\'re romantically drawn to. Often but not always the same as sexual orientation.' },
    { term: 'Straight (heterosexual)', def: 'Attracted to people of a different gender from yours.' },
    { term: 'Gay / Lesbian (homosexual)', def: '"Gay" is used for men attracted to men and as a general term. "Lesbian" specifically for women attracted to women. Both attracted to people of the same gender.' },
    { term: 'Bisexual (bi)', def: 'Attracted to multiple genders. Often described as "attracted to people of my gender and other genders."' },
    { term: 'Pansexual (pan)', def: 'Attracted regardless of gender. Some bi+ people use "pan" because it more clearly includes non-binary attraction.' },
    { term: 'Asexual (ace)', def: 'Experiences little or no sexual attraction. Can still have romantic attraction, intimate relationships, and a rich sex life if they choose. The ace spectrum includes gray-ace and demisexual.' },
    { term: 'Aromantic (aro)', def: 'Experiences little or no romantic attraction. Can still have deep platonic relationships, sexual relationships, and a fulfilling life. Often misunderstood; aro people are not broken.' },
    { term: 'Queer', def: 'An umbrella term for non-straight and/or non-cis. Some people use it instead of more specific labels. Was historically a slur and has been reclaimed; some people use it freely, some don\'t — both are valid.' },
    { term: 'Questioning', def: 'Currently exploring or unsure of orientation/gender. Completely valid. Many people are questioning for years; some always.' }
  ];

  function defaultState() {
    return {
      view: 'home',
      // Private reflection
      privateNotes: '',
      whatINeed: '',
      myAllies: [],
      myCommunity: '',
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('identitySupport', {
    icon: '🌈',
    label: 'Identity Support',
    desc: 'A supportive, inclusive space for exploring gender identity, sexual and romantic orientation, and broader identity questions. Vocabulary, identity-development frameworks, finding community, safety for trans youth, ally guidance. Built on Trevor Project, GLSEN, PFLAG.',
    color: 'pink',
    category: 'care-of-self',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;

      var d = labToolData.identitySupport || defaultState();
      function setI(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.identitySupport) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { identitySupport: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setI({ view: v }); }

      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#f9a8d4', fontSize: 22, fontWeight: 900 } }, '🌈 Identity Support'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'You are welcome here, however you are.')
          )
        );
      }

      function printNow() { try { window.print(); } catch (e) {} }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Welcome', icon: '🌈' },
          { id: 'vocab', label: 'Vocabulary', icon: '📖' },
          { id: 'identity', label: 'Exploring identity', icon: '🪞' },
          { id: 'community', label: 'Finding community', icon: '🤝' },
          { id: 'safety', label: 'Safety + crisis', icon: '🆘' },
          { id: 'allies', label: 'For allies', icon: '💜' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'Identity Support sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#ec4899' : '#334155'),
                background: active ? 'rgba(236,72,153,0.18)' : '#1e293b',
                color: active ? '#fbcfe8' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function safetyBanner() {
        return h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(236,72,153,0.10)', borderTop: '1px solid rgba(236,72,153,0.4)', borderRight: '1px solid rgba(236,72,153,0.4)', borderBottom: '1px solid rgba(236,72,153,0.4)', borderLeft: '3px solid #ec4899', marginBottom: 12, fontSize: 12.5, color: '#fbcfe8', lineHeight: 1.65 } },
          h('strong', null, '💜 Crisis or just need someone? '),
          h('a', { href: 'https://www.thetrevorproject.org/', target: '_blank', rel: 'noopener noreferrer',
            style: { color: '#f9a8d4', textDecoration: 'underline', fontWeight: 800 } }, 'The Trevor Project ↗'),
          ' is for LGBTQ+ youth, 24/7, free, confidential. Call 1-866-488-7386, text START to 678-678, or chat at thetrevorproject.org. Crisis Text Line: text HOME to 741741. 988 Suicide and Crisis Lifeline (call or text).'
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Identity exploration is a private process. This tool is yours; nothing here is shared with anyone. For specific help: The Trevor Project, GLSEN, PFLAG, your school counselor.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — welcome
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(236,72,153,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(236,72,153,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fbcfe8', marginBottom: 4 } }, 'You are welcome here.'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Adolescence is when most people form, question, and shape their sense of who they are — their gender, who they\'re drawn to, what kind of person they want to be in the world. For some students this process is straightforward. For others it is complicated, confusing, exciting, scary, lonely, or all of those at once.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool is a private, supportive space for any of that. It uses LGBTQ+ vocabulary as a default because that vocabulary has done a lot of useful work, but the tool is for ALL students — including cis and straight students who want to understand themselves, the words, and how to be in solidarity with others.'
            )
          ),

          // Core truths
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ec4899', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbcfe8', marginBottom: 10 } }, '✨ Things that are true'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'You are not broken. You are not a phase. You are not too much.'),
              h('li', null, 'You do not have to "know for sure" before you talk about it.'),
              h('li', null, 'You do not owe anyone information about your identity. Coming out is yours to choose, your timing, your terms.'),
              h('li', null, 'You can use one label this year and a different one next year. Identity is not a contract.'),
              h('li', null, 'People who reject you are wrong. That is true even when they\'re your family.'),
              h('li', null, 'You deserve to be safe, loved, and respected. Always. This is not negotiable.')
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'Sections'),
          stepCard('📖 Vocabulary', 'Gender terms, orientation terms, what they mean. Use what fits; ignore what doesn\'t.', function() { goto('vocab'); }, '#a855f7'),
          stepCard('🪞 Exploring your identity', 'Private space to sit with questions. Identity-development frameworks. What "knowing" actually looks like.', function() { goto('identity'); }, '#0ea5e9'),
          stepCard('🤝 Finding community', 'How to find people like you. Online + in person. The reality that community changes everything.', function() { goto('community'); }, '#22c55e'),
          stepCard('🆘 Safety + crisis', 'Trevor Project. Specific safety considerations for trans youth, students in unsupportive homes, students in unsafe schools.', function() { goto('safety'); }, '#ef4444'),
          stepCard('💜 For allies', 'For cis and straight students who want to support friends, family, and classmates. The actual moves.', function() { goto('allies'); }, '#8b5cf6'),

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
      // VOCAB
      // ═══════════════════════════════════════════════════════════
      function renderVocab() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.7 } },
            h('strong', null, '📖 Vocabulary is a tool, not a test. '),
            'Knowing the words is useful for naming what you experience. Not knowing them is fine too. Many people figure out who they are without ever picking a label, and that\'s legitimate. The vocabulary below is a working starting point; it\'s not the whole map.'
          ),

          // Gender terms
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, 'Gender vocabulary'),
            GENDER_TERMS.map(function(t, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', marginBottom: 6 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 2 } }, t.term),
                h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.65 } }, t.def)
              );
            })
          ),

          // Orientation terms
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ec4899', marginBottom: 10 } },
            h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbcfe8', marginBottom: 10 } }, 'Sexual and romantic orientation vocabulary'),
            ORIENTATION_TERMS.map(function(t, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', marginBottom: 6 } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbcfe8', marginBottom: 2 } }, t.term),
                h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.65 } }, t.def)
              );
            })
          ),

          // Important framing
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', fontSize: 13, color: '#e9d5ff', lineHeight: 1.7 } },
            h('strong', null, '🌐 Important framing: '),
            'gender, sexual orientation, romantic orientation, and gender expression are FOUR DIFFERENT things. You can be a trans woman who is bisexual, romantically asexual, and presents in masculine clothes. You can be a cis man who is straight and presents in pink eyeliner. You can be non-binary and lesbian and aromantic. The combinations are real. The labels are tools for being seen, not boxes to fit inside.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // IDENTITY — exploration space
      // ═══════════════════════════════════════════════════════════
      function renderIdentity() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(14,165,233,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(14,165,233,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, 'You don\'t have to know yet.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Identity unfolds. For some people it\'s clear early. For others it takes years. For some it shifts across a lifetime. All of those are normal. The work of adolescence is paying attention to your own experience: who you\'re drawn to, who you feel like inside, what feels right and what feels off.'
            )
          ),

          // What "knowing" actually looks like
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 10 } }, '🪞 Signs you\'re working through something'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'You feel a relief when you imagine being a different gender. (Especially: trying out different pronouns and one set feels like home.)'),
              h('li', null, 'You feel discomfort when you\'re called by your birth name + birth pronouns, even when you can\'t name why.'),
              h('li', null, 'You\'ve been drawn to people of the same gender as you for years and have been telling yourself "just admiration."'),
              h('li', null, 'You\'ve read or watched something with an LGBTQ+ character and recognized yourself.'),
              h('li', null, 'You feel completely different when you\'re around LGBTQ+ adults than around straight cis ones — like you can breathe.'),
              h('li', null, 'You feel like you\'re performing in ways that exhaust you. (Hiding parts of yourself takes enormous energy.)'),
              h('li', null, 'You\'ve been "questioning" for a while and the questioning is itself information.')
            )
          ),

          // Cass model with critique
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 10 } }, '📈 Identity development (Cass model, with caveats)'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Vivienne Cass\'s 1979 model of gay/lesbian identity development is widely taught. It has 6 stages but should not be taken as a strict order — many people move back and forth, skip stages, or never feel them at all:'),
            h('ol', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'Identity Confusion. '), '"Could I be...?" Awareness of difference without clear understanding.'),
              h('li', null, h('strong', null, 'Identity Comparison. '), '"Maybe I am..." Trying on the possibility. Comparing yourself to others.'),
              h('li', null, h('strong', null, 'Identity Tolerance. '), '"I probably am." Reaching out tentatively to community.'),
              h('li', null, h('strong', null, 'Identity Acceptance. '), '"I am." Solidifying. Increased connection to LGBTQ+ community.'),
              h('li', null, h('strong', null, 'Identity Pride. '), '"I am proud." Sometimes anger at how the world has treated this. Strong commitment.'),
              h('li', null, h('strong', null, 'Identity Synthesis. '), '"This is one part of who I am." Integrated with other identities; not the only thing.')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#94a3b8', fontSize: 12, lineHeight: 1.65, fontStyle: 'italic' } },
              'Critique: this model is dated (1979), was developed for white middle-class adults, may not fit non-binary, asexual, or many BIPOC experiences. It\'s a starting framework, not a destination.'
            )
          ),

          // Private notes
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ec4899', marginBottom: 10 } },
            h('label', { htmlFor: 'i-notes', style: { display: 'block', fontSize: 12, color: '#fbcfe8', fontWeight: 800, marginBottom: 6 } }, '🌱 Private reflection space'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Just for you. Stays on your device. What\'s on your mind?'),
            h('textarea', { id: 'i-notes', value: d.privateNotes || '',
              placeholder: '',
              onChange: function(e) { setI({ privateNotes: e.target.value }); },
              style: { width: '100%', minHeight: 160, padding: 12, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.8, resize: 'vertical' } })
          ),

          // What I need
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e' } },
            h('label', { htmlFor: 'i-need', style: { display: 'block', fontSize: 12, color: '#bbf7d0', fontWeight: 800, marginBottom: 6 } }, '🌱 What I need right now'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Could be: information, community, an adult ally, time alone, time off from this question, gender-affirming care info, a binder, anything.'),
            h('textarea', { id: 'i-need', value: d.whatINeed || '',
              placeholder: 'What I need...',
              onChange: function(e) { setI({ whatINeed: e.target.value }); },
              style: { width: '100%', minHeight: 80, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // COMMUNITY
      // ═══════════════════════════════════════════════════════════
      function renderCommunity() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.10)', borderTop: '1px solid rgba(34,197,94,0.3)', borderRight: '1px solid rgba(34,197,94,0.3)', borderBottom: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 14, fontSize: 13, color: '#bbf7d0', lineHeight: 1.7 } },
            h('strong', null, '🤝 Community changes everything. '),
            'The single most reliable finding in LGBTQ+ youth mental health research: having even ONE accepting adult in their life dramatically reduces suicide attempts in queer youth (Trevor Project research). Community matters. You are not meant to do this alone.'
          ),

          // Where to find community
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 10 } }, '🌐 Online community (often the first step)'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'For many adolescents, especially those in unsupportive homes or small towns, online community is where you find people first. It works.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
              communityCard('The Trevor Project — TrevorSpace', 'A safe online community for LGBTQ+ youth ages 13-24. Free, moderated. trevorspace.org', 'https://www.trevorspace.org/'),
              communityCard('Q Chat Space', 'Online discussion groups for LGBTQ+ teens. Specific topic groups (trans, ace, BIPOC LGBTQ+, etc.). qchatspace.org', 'https://www.qchatspace.org/'),
              communityCard('It Gets Better Project', 'Stories from LGBTQ+ adults sharing their experiences. Mostly video. itgetsbetter.org', 'https://itgetsbetter.org/'),
              communityCard('Gender Spectrum', 'Online support groups for trans and gender-expansive teens, plus their families. genderspectrum.org', 'https://genderspectrum.org/')
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 10 } }, '🏫 In-person community'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'In-person community varies hugely by where you live. Some places have rich LGBTQ+ youth scenes; some have very little. What might exist:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'GSA / Pride Club at your school. '), 'Gender-Sexuality Alliance. Many US schools have them. Ask your school counselor if you can\'t find it.'),
              h('li', null, h('strong', null, 'Affirming faith communities. '), 'Some churches, synagogues, mosques, and other spiritual communities are deeply affirming. PFLAG can help you find one.'),
              h('li', null, h('strong', null, 'Local LGBTQ+ youth centers. '), 'Many cities have these. Look up "[your city] LGBTQ+ youth center."'),
              h('li', null, h('strong', null, 'Pride events. '), 'Many cities have annual Pride events with youth-specific programming.'),
              h('li', null, h('strong', null, 'PFLAG family chapters. '), 'Local PFLAG (parents/families/friends of LGBTQ+) chapters often have youth-friendly events.')
            )
          ),

          // Notes
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e' } },
            h('label', { htmlFor: 'i-comm', style: { display: 'block', fontSize: 12, color: '#bbf7d0', fontWeight: 800, marginBottom: 6 } }, 'My community plan'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'What\'s ONE community thing you could try this month? An online group, a club, a local center, reaching out to one specific person?'),
            h('textarea', { id: 'i-comm', value: d.myCommunity || '',
              placeholder: 'This month I want to try...',
              onChange: function(e) { setI({ myCommunity: e.target.value }); },
              style: { width: '100%', minHeight: 80, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      function communityCard(name, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b' } },
          h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
            style: { fontSize: 12.5, color: '#bbf7d0', fontWeight: 800, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, name + ' ↗'),
          h('div', { style: { fontSize: 12, color: '#dcfce7', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SAFETY
      // ═══════════════════════════════════════════════════════════
      function renderSafety() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(239,68,68,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(239,68,68,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#fecaca', marginBottom: 4 } }, 'Real talk about safety.'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'LGBTQ+ youth — especially trans youth — face elevated risks. Trevor Project research finds about 41% of LGBTQ+ youth seriously considered suicide in the past year; more than half of trans and non-binary youth did. These rates are NOT because of being LGBTQ+. They are because of how the world treats LGBTQ+ youth.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'The good news: having ONE accepting adult cuts the risk dramatically. Community matters. Specific resources matter. You are NOT alone, and help works.'
            )
          ),

          // Crisis resources
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 10 } }, '🆘 Crisis resources (free, 24/7, confidential)'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 } },
              communityCard('The Trevor Project', 'For LGBTQ+ youth. Call 1-866-488-7386, text START to 678-678, chat at thetrevorproject.org. 24/7.', 'https://www.thetrevorproject.org/'),
              communityCard('Trans Lifeline', 'Trans peers staffing the line. Call 877-565-8860. Available 24/7.', 'https://translifeline.org/'),
              communityCard('988 Suicide and Crisis Lifeline', 'Call or text 988. LGBTQ+ option available; press 3 or text PRIDE.', 'https://988lifeline.org/'),
              communityCard('Crisis Text Line', 'Text HOME to 741741. Free, anonymous, 24/7.', 'https://www.crisistextline.org/'),
              communityCard('LGBT National Help Center', 'Talk lines, online chat. 1-888-843-4564.', 'https://www.lgbthotline.org/')
            )
          ),

          // If your home is unsupportive
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', marginBottom: 10 } }, '🏠 If your home is unsupportive'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'About 40% of homeless youth in the US are LGBTQ+, often because of family rejection. If you are NOT safe at home — physical or emotional abuse, threats of conversion therapy, kicking out — please:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'Do not come out to abusive family. '), 'There is no obligation. Your safety comes first. You can be out at school, with friends, online, and not at home. That is a legitimate strategy.'),
              h('li', null, h('strong', null, 'Identify a safer adult. '), 'A relative, neighbor, friend\'s parent, teacher, counselor. Just having one identified is protective.'),
              h('li', null, h('strong', null, 'Know runaway/homeless resources. '),
                h('a', { href: 'https://www.1800runaway.org/', target: '_blank', rel: 'noopener noreferrer', style: { color: '#fde68a', textDecoration: 'underline' } }, 'National Runaway Safeline ↗'),
                ': 1-800-RUNAWAY. Free, confidential.'),
              h('li', null, h('strong', null, 'For trans youth in unsupportive homes: '),
                h('a', { href: 'https://www.pointofpride.org/', target: '_blank', rel: 'noopener noreferrer', style: { color: '#fde68a', textDecoration: 'underline' } }, 'Point of Pride ↗'),
                ' provides free chest binders, femme shapewear, and other essentials by mail in plain packaging.'),
              h('li', null, h('strong', null, 'Conversion therapy is harmful and ineffective. '), 'If a family member is pressuring you toward "therapy" to change your identity, that is a recognized form of psychological abuse. The Trevor Project can help you think through how to respond safely.')
            )
          ),

          // Specifically for trans youth
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, '🏳️‍⚧️ Specifically for trans and gender-diverse youth'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Trans youth face additional layers of risk in current US political climate. Affirming care, social support, and informed self-advocacy all matter.'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('a', { href: 'https://transyouthequality.org/', target: '_blank', rel: 'noopener noreferrer', style: { color: '#e9d5ff', textDecoration: 'underline' } }, 'Trans Youth Equality Foundation ↗'),
                ' — based in Maine; runs camps, family conferences, resource directory.'),
              h('li', null, h('a', { href: 'https://genderspectrum.org/', target: '_blank', rel: 'noopener noreferrer', style: { color: '#e9d5ff', textDecoration: 'underline' } }, 'Gender Spectrum ↗'),
                ' — comprehensive resources for trans and gender-expansive youth and families.'),
              h('li', null, h('a', { href: 'https://www.glsen.org/', target: '_blank', rel: 'noopener noreferrer', style: { color: '#e9d5ff', textDecoration: 'underline' } }, 'GLSEN ↗'),
                ' — school-focused. Model trans student support policy, "Safe Space" kits.'),
              h('li', null, h('a', { href: 'https://transequality.org/', target: '_blank', rel: 'noopener noreferrer', style: { color: '#e9d5ff', textDecoration: 'underline' } }, 'National Center for Transgender Equality ↗'),
                ' — policy, ID document name/gender change information, know-your-rights.'),
              h('li', null, h('a', { href: 'https://www.pointofpride.org/', target: '_blank', rel: 'noopener noreferrer', style: { color: '#e9d5ff', textDecoration: 'underline' } }, 'Point of Pride ↗'),
                ' — free chest binders, breast forms, surgery aid grants, gender-affirming products.')
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ALLIES
      // ═══════════════════════════════════════════════════════════
      function renderAllies() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(139,92,246,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(139,92,246,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#c4b5fd', marginBottom: 4 } }, 'Being an ally is concrete.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              '"Ally" is an action, not an identity. The work is specific behavior: how you use language, how you respond when someone comes out to you, what you do when someone says something harmful, how you treat trans classmates. Below are the actual moves.'
            )
          ),

          // The basics
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #8b5cf6', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, '✅ The basic moves'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'Use the name and pronouns people give you. '), 'No questions. If you mess up: correct yourself briefly and move on. Don\'t make a thing of it.'),
              h('li', null, h('strong', null, 'Don\'t out anyone. '), 'If someone tells you they\'re queer or trans, that is their private information. You do not tell anyone else without explicit permission. Outing someone can be dangerous for them.'),
              h('li', null, h('strong', null, 'Believe people about their experience. '), 'If they say something feels homophobic / transphobic, do not argue. Listen.'),
              h('li', null, h('strong', null, 'Speak up when you hear harmful language. '), '"Hey, that\'s not cool." "We don\'t use that word here." You don\'t need a speech; you need a refusal.'),
              h('li', null, h('strong', null, 'Don\'t ask invasive questions. '), 'Genitals, sex, history. The same questions you would not ask a cis person, you do not ask a trans person.'),
              h('li', null, h('strong', null, 'Don\'t make it about you. '), 'When a friend comes out to you, it\'s about them. Your support is "thanks for telling me, I love you," not "let me tell you my journey of understanding."'),
              h('li', null, h('strong', null, 'Center LGBTQ+ voices. '), 'When you\'re learning, learn from LGBTQ+ people. Not just allies talking about LGBTQ+ people.')
            )
          ),

          // When someone comes out to you
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #8b5cf6', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, '💬 When someone comes out to you'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'They have trusted you. The most important thing is your immediate response. Suggested moves:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, '"Thank you for telling me." (Not "thank you for trusting me" — slightly less burdensome.)'),
              h('li', null, '"I love you / I care about you / you\'re my friend. None of that changes."'),
              h('li', null, '"Who else knows? I want to follow your lead."'),
              h('li', null, '"How can I support you?" (Open question; they may not know yet.)'),
              h('li', null, 'AVOID: "I knew it!" "Are you sure?" "It\'s just a phase." "What about [conservative family member]?" "What does this mean for [partner]?"'),
              h('li', null, 'If they\'re crying, sit with them. You don\'t need to fix it.'),
              h('li', null, 'Follow up later, casually. Don\'t make the next conversation also about The Big Thing.')
            )
          ),

          // When you mess up
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', marginBottom: 10 } }, '🙏 When you mess up (you will, everyone does)'),
            h('ol', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'Correct yourself briefly. ("She — sorry, he — was saying...")'),
              h('li', null, 'Move on. Don\'t make a five-minute apology that makes them comfort YOU.'),
              h('li', null, 'Don\'t do it the same way next time. Practice in your head when alone.'),
              h('li', null, 'If you mess up repeatedly: that\'s when a real conversation with them is useful, not in the moment.')
            )
          ),

          // Allies in unsupportive contexts
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 10 } }, '🛡 Showing up when it counts'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'In hostile environments, ally behavior is a real shield. Specific moves:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'Sit with LGBTQ+ kids at lunch. Visibility matters.'),
              h('li', null, 'Use inclusive language without making a thing of it.'),
              h('li', null, 'Report harmful incidents to teachers/counselors when asked or when safe.'),
              h('li', null, 'In families: if a relative says something homophobic/transphobic, push back. Even if no LGBTQ+ family member is out, someone is listening.'),
              h('li', null, 'Wear/visibly support Pride at school. "Safe space" is signaled, not declared.'),
              h('li', null, 'Vote and advocate when you can. Anti-trans legislation directly affects students at your school.')
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('identitySupport', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fbcfe8', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A supportive, inclusive psychoeducation and resource tool for adolescents around gender identity, sexual orientation, and broader identity questions. Built primarily on Trevor Project, GLSEN, and PFLAG frameworks, which are the most-evidence-based youth LGBTQ+ support organizations in the US.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool is for ALL students — including cis and straight students who want to understand vocabulary, support friends, or be allies. The framing is affirming throughout; there is no "are you sure?" or pressure toward any particular identity.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fbcfe8', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('The Trevor Project', 'thetrevorproject.org', 'Primary source for LGBTQ+ youth mental health and crisis support. The Trevor Project Annual Survey is the largest research on LGBTQ+ youth mental health.', 'https://www.thetrevorproject.org/'),
            sourceCard('GLSEN', 'glsen.org', 'School-focused. Annual National School Climate Survey, model policy, educator training.', 'https://www.glsen.org/'),
            sourceCard('PFLAG', 'pflag.org', 'Parents, families, friends of LGBTQ+ people. 400+ local chapters across the US.', 'https://pflag.org/'),
            sourceCard('Gender Spectrum', 'genderspectrum.org', 'Resources, support groups, training for gender-expansive children, teens, and families.', 'https://genderspectrum.org/'),
            sourceCard('It Gets Better Project', 'itgetsbetter.org', 'Storytelling project; thousands of videos from LGBTQ+ adults to youth.', 'https://itgetsbetter.org/'),
            sourceCard('Human Rights Campaign — Welcoming Schools', 'welcomingschools.org', 'HRC\'s school-focused program for K-12. Free lesson plans.', 'https://welcomingschools.org/'),
            sourceCard('Cass, V. C. (1979)', '"Homosexual identity formation: A theoretical model," Journal of Homosexuality, 4(3), 219-235', 'The classic identity development model. Dated but still widely referenced.', null),
            sourceCard('Kenny, L. et al. (2016)', '"Which terms should be used to describe autism? Perspectives from the UK autism community," Autism, 20(4)', 'Foundation for identity-first language preference research.', null),
            sourceCard('Trevor Project Research', 'thetrevorproject.org/research-briefs', 'Free research briefs on LGBTQ+ youth mental health, supportive practices.', 'https://www.thetrevorproject.org/research-briefs/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'This tool is a starting point. The Trevor Project, GLSEN, and PFLAG have far deeper resources for specific situations.'),
              h('li', null, 'Vocabulary evolves. The terms here are current as of 2024-2026; some may shift. Use what fits.'),
              h('li', null, 'Identity development is non-linear. The Cass model is one framework; many other models exist (D\'Augelli, Fassinger, Devor for trans identity, etc.). No single model fits everyone.'),
              h('li', null, 'Race, class, religion, disability all interact with LGBTQ+ identity in important ways. A queer Black trans teen has different specific needs than a white cis lesbian teen. This tool is general; identity-specific organizations exist (e.g., the National Black Justice Coalition for Black LGBTQ+).'),
              h('li', null, 'In current US political climate, anti-trans legislation is creating specific risks for trans youth that this tool cannot fully address. Trans Youth Equality, ACLU, and Lambda Legal track legal landscape.'),
              h('li', null, 'For students at risk of conversion therapy or rejection by family: please use The Trevor Project. They have trained advocates who can help safely. This tool is not a substitute.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(236,72,153,0.10)', borderTop: '1px solid rgba(236,72,153,0.3)', borderRight: '1px solid rgba(236,72,153,0.3)', borderBottom: '1px solid rgba(236,72,153,0.3)', borderLeft: '3px solid #ec4899', fontSize: 12.5, color: '#fbcfe8', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'For educators in supportive states: GLSEN\'s Safe Space Kit (free) is the standard educator training. Visibly use pronouns in your name (in email signatures, Zoom, on the board); this signals safety to students without putting any individual on the spot. The Trevor Project research is clear: even ONE accepting adult dramatically reduces LGBTQ+ youth suicide risk. You can be that adult.'
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.3)', borderRight: '1px solid rgba(239,68,68,0.3)', borderBottom: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', fontSize: 12.5, color: '#fecaca', lineHeight: 1.6, marginTop: 10 } },
            h('strong', null, '⚠️ For educators in states with restrictions: '),
            'Anti-LGBTQ+ legislation in some US states has restricted educator speech and curriculum. Know your state\'s specific laws. The ACLU and Lambda Legal track this. Even where curriculum is restricted, individual student support — listening, referring to resources, respecting pronouns when shared — typically remains within professional discretion.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#f9a8d4', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#fbcfe8', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#fbcfe8', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      function renderPrintView() {
        var people = d.affirmingPeople || [];
        var spaces = d.affirmingSpaces || [];
        var notes = d.notes || '';

        return h('div', null,
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(236,72,153,0.10)', borderTop: '1px solid rgba(236,72,153,0.4)', borderRight: '1px solid rgba(236,72,153,0.4)', borderBottom: '1px solid rgba(236,72,153,0.4)', borderLeft: '3px solid #ec4899', marginBottom: 12, fontSize: 12.5, color: '#fbcfe8', lineHeight: 1.65 } },
            h('strong', null, '🖨 Print my affirming-circle reference. '),
            'A private one-page reference: people in your life who affirm you, places where you feel like yourself, crisis lines you can call, and rights you have. Print only for yourself or a clinician/trusted adult you choose. Nothing is shared anywhere.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#identity-print-region, #identity-print-region * { visibility: visible !important; } ' +
            '#identity-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#identity-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),
          h('div', { id: 'identity-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, 'My Affirming Circle'),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'Trevor Project · GLSEN · PFLAG')
            ),

            h('div', { style: { padding: 10, background: '#fdf2f8', border: '1px solid #f9a8d4', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: '#831843' } },
              h('strong', null, 'Private artifact. '),
              'This is for you. The point of writing it down is to have it before you need it. If a moment ever comes where you feel alone, this page reminds you that you are not.'
            ),

            people && people.length > 0 ? h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'People who affirm me'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: '#0f172a', lineHeight: 1.7 } },
                people.map(function(p, i) { return h('li', { key: i }, (p.name || p) + (p.role ? ' · ' + p.role : '')); })
              )
            ) : h('div', { style: { padding: 12, border: '2px dashed #cbd5e1', borderRadius: 10, marginBottom: 12, fontSize: 12.5, color: '#475569', fontStyle: 'italic' } },
              'People who affirm me: (open the Finding community tab to add them)'
            ),

            spaces && spaces.length > 0 ? h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Spaces where I feel like myself'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: '#0f172a', lineHeight: 1.7 } },
                spaces.map(function(s, i) { return h('li', { key: i }, s.name || s); })
              )
            ) : null,

            notes ? h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'My notes'),
              h('div', { style: { fontSize: 12.5, color: '#0f172a', whiteSpace: 'pre-wrap', lineHeight: 1.55 } }, notes)
            ) : null,

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'Crisis lines that affirm me — 24/7, free, confidential'),
              h('div', { style: { fontSize: 12, color: '#0f172a', lineHeight: 1.75 } },
                'The Trevor Project (LGBTQ+ youth): 1-866-488-7386 · text START to 678-678 · thetrevorproject.org', h('br'),
                'Trans Lifeline (by and for trans people, no active rescue policy): 1-877-565-8860', h('br'),
                'LGBT National Youth Talkline: 1-800-246-7743', h('br'),
                '988 Suicide & Crisis Lifeline (call or text 988): trained on LGBTQ+ youth needs', h('br'),
                'Crisis Text Line: text HOME to 741741', h('br'),
                'PFLAG (for family + ally support): 1-202-467-8180 · pflag.org'
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 12, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, 'Some rights I have at school (US)'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 11.5, color: '#0f172a', lineHeight: 1.65 } },
                h('li', { style: { marginBottom: 3 } }, 'To be called by my chosen name and pronouns (most states; check GLSEN state map for specifics).'),
                h('li', { style: { marginBottom: 3 } }, 'To use the restroom and locker room that aligns with my gender identity (Title IX, currently being litigated).'),
                h('li', { style: { marginBottom: 3 } }, 'To form or join a GSA (Equal Access Act, 1984).'),
                h('li', { style: { marginBottom: 3 } }, 'To be protected from bullying and harassment on the basis of sexual orientation or gender identity (Title IX + most state laws).'),
                h('li', null, 'To dress consistent with my gender identity (most jurisdictions).')
              ),
              h('div', { style: { marginTop: 8, fontSize: 11, color: '#475569', fontStyle: 'italic', lineHeight: 1.55 } }, 'Rights vary by state and are actively being legislated. ACLU LGBTQ Youth Rights project (aclu.org/issues/lgbtq-rights) is the most current reference.')
            ),

            h('div', { style: { padding: 10, background: '#fdf2f8', border: '1px solid #f9a8d4', borderRadius: 8, marginBottom: 12, fontSize: 11.5, color: '#831843', lineHeight: 1.6, textAlign: 'center', fontWeight: 700 } },
              'You are not alone. You are not a problem. You are loved.'
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5 } },
              'Sources: The Trevor Project (thetrevorproject.org) · GLSEN (glsen.org) · PFLAG (pflag.org) · Trans Lifeline (translifeline.org) · ACLU LGBTQ Youth Rights project. Printed from AlloFlow SEL Hub.'
            )
          )
        );
      }

      if (view === 'vocab') body = renderVocab();
      else if (view === 'identity') body = renderIdentity();
      else if (view === 'community') body = renderCommunity();
      else if (view === 'safety') body = renderSafety();
      else if (view === 'allies') body = renderAllies();
      else if (view === 'about') body = renderAbout();
      else if (view === 'print') body = renderPrintView();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Identity Support' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
