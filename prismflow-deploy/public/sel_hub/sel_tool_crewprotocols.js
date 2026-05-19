// ═══════════════════════════════════════════════════════════════
// sel_tool_crewprotocols.js — Crew Protocols Library
// A library of structured group formats for Crew time, advisory,
// homeroom, or any small-group community-building context. Each
// protocol has a clear purpose, time, group size, materials,
// step-by-step script, and norms.
//
// Sources:
//   - EL Education Crew protocols (the foundational practice for
//     EL schools including King Middle School in Portland ME)
//   - Restorative Practices / IIRP circle formats
//   - Tribes Learning Communities (Gibbs)
//   - Responsive Classroom (Northeast Foundation for Children)
//   - Many of the Crew prompts come from other AlloFlow SEL Hub
//     tools (consolidated via the standards alignment registry).
//
// Registered tool ID: "crewProtocols"
// Category: relationship-skills
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('crewProtocols'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-crewprotocols')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-crewprotocols';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Categories of protocols
  var CATEGORIES = {
    community: { label: 'Community builders', icon: '🤝', color: '#22c55e',
      blurb: 'For the start of the year, after a hard week, or any time the group needs to remember it is a group.' },
    opening:   { label: 'Daily / weekly openings', icon: '🌅', color: '#f59e0b',
      blurb: 'Quick rituals to start Crew time and bring people present.' },
    closing:   { label: 'Closing connections', icon: '🌙', color: '#a855f7',
      blurb: 'To end Crew time, a class, a unit, a week. The bookend matters as much as the opening.' },
    reflection: { label: 'Reflection & inquiry', icon: '💭', color: '#0ea5e9',
      blurb: 'Slower formats for sitting with a question, a piece of writing, or a shared experience.' },
    restorative: { label: 'Restorative & repair', icon: '⚖️', color: '#3b82f6',
      blurb: 'When something has gone wrong in the group and you need to address it together.' },
    celebration: { label: 'Celebration & affirmation', icon: '🎉', color: '#ec4899',
      blurb: 'For wins, milestones, transitions, or just naming what is good.' },
    hard:       { label: 'Hard conversations', icon: '🪨', color: '#dc2626',
      blurb: 'When the topic is heavy: world events, loss, identity, conflict. Use with care.' }
  };

  // The protocols
  var PROTOCOLS = [

    // === COMMUNITY BUILDERS ===
    {
      id: 'rose_thorn_bud',
      category: 'community',
      title: 'Rose, Thorn, Bud',
      time: '10-20 min',
      groupSize: '3-15',
      materials: 'None',
      purpose: 'Quick, repeatable check-in. Each person names a high (rose), a low (thorn), and something they\'re looking forward to (bud). Works across age groups.',
      steps: [
        'Facilitator briefly reviews what each part means.',
        'Set a norm: pass option always available; no advice or fixing during shares.',
        'Each person shares in turn — rose, thorn, bud. ~1 minute each.',
        'Facilitator (or volunteer) closes by noting a thread or a theme they heard.'
      ],
      tips: 'For a quick version, just rose + thorn. For a heavier version, allow follow-up reflections at the end.',
      source: 'Origin uncertain — widely used in education, scouting, and family dinners since at least the 1990s.'
    },
    {
      id: 'four_corners',
      category: 'community',
      title: 'Four Corners',
      time: '15-30 min',
      groupSize: '6-30',
      materials: '4 signs (Strongly Agree, Agree, Disagree, Strongly Disagree) posted in 4 corners',
      purpose: 'Physically move to express a position; surfaces diversity of perspective without putting anyone on the spot to defend it.',
      steps: [
        'Post 4 signs in 4 corners of the room.',
        'Facilitator reads a statement.',
        'Students walk to the corner that matches their position.',
        'Briefly, 1-2 people from each corner can share why they\'re standing where they are. NOT mandatory.',
        'Read the next statement. Repeat.',
        'Use 3-5 statements per session.'
      ],
      tips: 'Pick statements that surface real differences but are not too charged. Examples: "Failure is the best teacher." "I learn better alone than with others." "Friends should always tell you the truth."',
      source: 'Tribes Learning Community (Gibbs); also Responsive Classroom.'
    },
    {
      id: 'two_truths_lie',
      category: 'community',
      title: 'Two Truths and a Story',
      time: '10-20 min',
      groupSize: '4-15',
      materials: 'None',
      purpose: 'Get to know each other through curiosity. Variation on the classic with a kinder name — "story" instead of "lie."',
      steps: [
        'Each person prepares two true things about themselves plus one made-up "story" (something that could plausibly be true).',
        'In turn, each person shares all three; the group guesses which is the story.',
        'Person reveals which was the story and tells the actual true thing.',
        'Optional: each person shares why they made up the story they did.'
      ],
      tips: 'Avoid this protocol with new groups that don\'t yet have trust. The made-up element can feel unsafe if relationships are thin.',
      source: 'Widely used; "Story" framing is recent and gentler than "Lie."'
    },

    // === DAILY / WEEKLY OPENINGS ===
    {
      id: 'one_word_check_in',
      category: 'opening',
      title: 'One-Word Check-in',
      time: '3-5 min',
      groupSize: '5-30',
      materials: 'None',
      purpose: 'Bring everyone present quickly. Useful at the start of a class or Crew, especially when time is short.',
      steps: [
        'Facilitator: "In one word, how are you arriving today?"',
        'Each person says one word in turn.',
        'No comments, no responses, no questions. Just one word each.',
        'Facilitator may close with: "Thank you for arriving."'
      ],
      tips: 'The "no responses" rule matters. It keeps the format fast and protects the quieter words. Variations: one-word weather, color, animal, or texture.',
      source: 'Generic mindfulness practice; widely adopted in EL Education Crew.'
    },
    {
      id: 'zone_check',
      category: 'opening',
      title: 'Zone Check (Emotion Zones)',
      time: '5-10 min',
      groupSize: '5-25',
      materials: 'Optional: zones poster (Blue / Green / Yellow / Red)',
      purpose: 'Quick emotional inventory and pulse-check, normalized for the whole group.',
      steps: [
        'Facilitator: "What zone are you in right now? Blue (low energy), Green (regulated), Yellow (activated), Red (overwhelmed)?"',
        'Each student names their zone. Optional: one word about why.',
        'No advice, no fixing. The point is being seen, not being adjusted.',
        'Facilitator can close with: "If you\'re yellow or red, you can take a 2-minute break or use a tool from the SEL Hub. Nobody needs to be green to be here."'
      ],
      tips: 'Pairs with the Emotion Zones tool in this SEL Hub. Use weekly for a few weeks until students have the vocabulary.',
      source: 'Adapted from Kuypers\' Zones of Regulation framework.'
    },
    {
      id: 'gratitude_witness',
      category: 'opening',
      title: 'Gratitude Witness',
      time: '5-8 min',
      groupSize: '5-20',
      materials: 'None',
      purpose: 'Name something or someone you\'re grateful for, with specificity. Builds a culture of noticing.',
      steps: [
        'Facilitator: "Name one specific person, place, thing, or moment you\'re grateful for from the past 24 hours. Be specific — not \'my family,\' but \'my grandma making dinner last night.\'"',
        'Each person shares in turn.',
        'Optional: after each share, the rest of the group says together "Witnessed."',
        'Pass option is always available.'
      ],
      tips: 'Specificity is the key. Vague gratitude ("I\'m grateful for everything") doesn\'t do the work that specific gratitude does. Avoid making this mandatory; it can feel forced.',
      source: 'Synthesis of positive-psychology research (Emmons, Lyubomirsky) and contemplative traditions.'
    },

    // === CLOSING CONNECTIONS ===
    {
      id: 'one_word_close',
      category: 'closing',
      title: 'One-Word Close',
      time: '3-5 min',
      groupSize: '5-30',
      materials: 'None',
      purpose: 'Mirror to the opening one-word check-in; closes the time intentionally.',
      steps: [
        'Facilitator: "In one word, how are you leaving today?"',
        'Each person says one word in turn.',
        'Facilitator closes with a brief acknowledgment of the work the group did.'
      ],
      tips: 'A simple ritual that signals "we are done here together" works better than just letting the time end.',
      source: 'Widely used.'
    },
    {
      id: 'appreciations_circle',
      category: 'closing',
      title: 'Appreciation Circle',
      time: '10-15 min',
      groupSize: '4-15',
      materials: 'None',
      purpose: 'Each person appreciates someone specific in the group, with specificity.',
      steps: [
        'Facilitator: "Think of one specific thing someone in this group did or said that you appreciate. Not generic — specific."',
        'In turn, each person names one person and what they appreciate. ("Maya, the way you asked the follow-up question when Jordan was speaking — that mattered.")',
        'No back-and-forth, no responses from the named person beyond a nod or "thank you."',
        'Goal: by the end, ideally everyone has been named at least once.'
      ],
      tips: 'For larger groups, have students appreciate someone specific by name without going around the full circle. Facilitator should track who has been named and gently ensure no one is left out.',
      source: 'Restorative Practices, Tribes, EL Education Crew.'
    },
    {
      id: 'commitment_close',
      category: 'closing',
      title: 'Commitment Close',
      time: '5-10 min',
      groupSize: '5-20',
      materials: 'None',
      purpose: 'Each person names one small thing they\'ll do before next Crew. Makes the group accountable to each other.',
      steps: [
        'Facilitator: "Before we meet again, what is one small thing you will do? Specific and doable."',
        'Each person names their commitment.',
        'Facilitator notes the commitments somehow (chart, journal, memory). At next Crew, opens with "Last week you committed to ___."'
      ],
      tips: 'The follow-through is what makes this work. If commitments are named and then never checked back on, students learn the format is theater. Keep a list.',
      source: 'ACT (Hayes); EL Education Crew; widely used in coaching practice.'
    },

    // === REFLECTION & INQUIRY ===
    {
      id: 'quiet_question',
      category: 'reflection',
      title: 'Quiet Question (Quaker query)',
      time: '15-25 min',
      groupSize: '4-15',
      materials: 'A prepared question that\'s open-ended and meaningful',
      purpose: 'Sit with a single question. Not for answering quickly; for letting the question work on you.',
      steps: [
        'Facilitator reads the question aloud, twice.',
        '3 minutes of silence. Sit with the question; no writing required.',
        'Optional: 90-second pair-share, with the partner just listening.',
        'Open to the full group: "What rose for you? You can pass."',
        'No responses to other people\'s answers. Each person\'s response is their own.',
        'Facilitator may close by reading the question one more time, slowly.'
      ],
      tips: 'The 3 minutes of silence is the work. Resist the urge to fill it. Good questions: "What have I been pretending not to know?" "Where in my life am I tired? Tired of what?" "What is one small kindness I could offer this week?"',
      source: 'Religious Society of Friends (Quaker) query tradition; adapted secularly. Pairs with the Quiet Questions tool in this SEL Hub.'
    },
    {
      id: 'text_to_self',
      category: 'reflection',
      title: 'Text-to-Self Connection',
      time: '15-30 min',
      groupSize: '6-25',
      materials: 'A short shared text (paragraph, poem, news article, ~150 words)',
      purpose: 'Group reads a short text, each person finds where it connects to their own life. Useful in advisory or content classes.',
      steps: [
        'Read the text aloud. Read it again silently.',
        '3 minutes of silent annotation: each person marks a sentence or phrase that connected to them somehow.',
        'In turn, each person reads their chosen sentence (just the words from the text) and says one sentence about why it landed.',
        'No discussion, debate, or evaluation of others\' choices. Each person\'s connection is valid.'
      ],
      tips: 'Choose texts that have multiple entry points. Avoid texts with a single "correct" interpretation.',
      source: 'School Reform Initiative (formerly NSRF) text-based protocol.'
    },

    // === RESTORATIVE & REPAIR ===
    {
      id: 'restorative_circle',
      category: 'restorative',
      title: 'Restorative Circle (after harm)',
      time: '30-60 min',
      groupSize: '4-12',
      materials: 'A talking piece; chairs in a circle; tissues',
      purpose: 'When something has gone wrong in the community (conflict, harm, hurt). NOT for finding fault; for repair.',
      steps: [
        'Facilitator (a trained adult) opens with norms: speak only when holding the talking piece, listen with curiosity, what is said in circle stays in circle.',
        'Round 1: "What happened, from your perspective?" — talking piece goes around. No interruption.',
        'Round 2: "How did this affect you? What feelings are you carrying?" — talking piece around.',
        'Round 3: "What do you need now? What would help repair this?" — talking piece around.',
        'Round 4: "What can you commit to going forward?" — talking piece around.',
        'Facilitator summarizes commitments and closes the circle with an intentional moment (a breath, a brief reading, a thank-you).'
      ],
      tips: 'This format requires a trained facilitator. Do NOT improvise it the first time. If your school does not have someone trained, use the Restorative Circle tool in this SEL Hub for an intro, and bring in a trainer.',
      source: 'Indigenous lineage (peacemaking traditions); formalized in modern restorative practice by Howard Zehr, IIRP, Belinda Hopkins.'
    },
    {
      id: 'community_agreement',
      category: 'restorative',
      title: 'Community Agreement / Re-norming',
      time: '20-40 min',
      groupSize: '6-25',
      materials: 'Chart paper or whiteboard',
      purpose: 'Set or reset group norms. Especially after harm, but also at the start of a year, semester, or unit.',
      steps: [
        'Facilitator: "What do you need from this group to be able to do your best work and be your full self here?"',
        'Each person shares (or writes on a sticky note for larger groups).',
        'Group clusters similar needs into 4-6 agreements ("We listen with curiosity, not to respond." "We protect each other\'s privacy outside this room.")',
        'Each person signs or initials the agreement.',
        'Post visibly. Reference at every Crew for the first month, then weekly.'
      ],
      tips: 'Agreements work only if everyone participates in building them AND if the adult enforces them when violated. Posted norms that aren\'t referenced are decoration.',
      source: 'Responsive Classroom; Tribes; EL Education Crew.'
    },

    // === CELEBRATION & AFFIRMATION ===
    {
      id: 'shout_out',
      category: 'celebration',
      title: 'Shout-out Round',
      time: '5-10 min',
      groupSize: '5-20',
      materials: 'None',
      purpose: 'Quickly name people in the group (or outside) who did something worth naming this week.',
      steps: [
        'Facilitator: "Who do you want to shout out from this week, and why? Inside or outside the group."',
        'Pop-corn style: people share when ready, no set order.',
        'Goal: 3-5 minutes of shout-outs.',
        'Facilitator may close by adding one shout-out of their own.'
      ],
      tips: 'Faster and looser than the Appreciation Circle. Best for closing a week or unit.',
      source: 'Restorative Practices; common in youth-development programs.'
    },
    {
      id: 'celebration_circle',
      category: 'celebration',
      title: 'Celebration Circle',
      time: '20-30 min',
      groupSize: '4-15',
      materials: 'None',
      purpose: 'A whole Crew time dedicated to celebrating: a milestone, a finished unit, an end-of-year, a graduating senior.',
      steps: [
        'Facilitator names what is being celebrated.',
        'Round 1: "What did this group / person / project mean to you?"',
        'Round 2: "What will you carry forward?"',
        'Optional: a shared symbol or ritual (cake, music, a small gift, a group photo).',
        'Facilitator closes by naming the work and the people.'
      ],
      tips: 'Western schools tend to skip celebration. It matters. The body knows what is over and what is beginning when celebrations are real.',
      source: 'EL Education end-of-year practices; Indigenous traditions of marking transitions.'
    },

    // === HARD CONVERSATIONS ===
    {
      id: 'world_events',
      category: 'hard',
      title: 'Heavy News Day Crew',
      time: '20-40 min',
      groupSize: '5-25',
      materials: 'None',
      purpose: 'When something heavy has happened in the world (a school shooting, a war, a hate crime, a death in the community) and the group needs to be together with it.',
      steps: [
        'Facilitator names what happened, briefly and factually.',
        'Acknowledges that different students will respond differently, and that any feeling is valid (sad, angry, numb, confused, scared, helpless, disconnected).',
        'Round 1: "What feelings are you holding right now? You can pass."',
        'Round 2: "What do you need from this group today? Quiet? Conversation? A change of subject? Information?"',
        'Group adjusts based on what students name.',
        'Facilitator closes by naming what comes next and reminding students of supports (counselor, school psych, trusted adults).'
      ],
      tips: 'Adults should NOT pretend nothing happened. They should also NOT force discussion if students are not ready. The format gives students a choice. Pair with the Crisis Companion tool for any student showing acute distress.',
      source: 'Adapted from trauma-informed practice; NCTSN guidance for after community events.'
    },
    {
      id: 'identity_conversation',
      category: 'hard',
      title: 'Identity Conversation (when something has been said)',
      time: '30-45 min',
      groupSize: '6-20',
      materials: 'Community agreement posted (see Community Agreement protocol)',
      purpose: 'When a slur, a stereotype, or an exclusionary moment has happened in or near the group and needs to be addressed.',
      steps: [
        'Facilitator (adult, trained) names what was said or done, without naming the speaker.',
        'Names that the words have a history and an impact regardless of intent.',
        'Round 1: "How did hearing that land for you?" — invite responses from anyone who is willing. Some students may be carrying more of the weight; pass is always honored.',
        'Round 2: "What do we need to do, as a group, so this doesn\'t happen again?"',
        'If the speaker is identified and present, they may be invited to respond — NOT to defend, but to listen and respond to what they heard.',
        'Facilitator closes by restating commitments.'
      ],
      tips: 'This is high-stakes. The students most affected (the students whose identity is being slurred) should NEVER be made to educate the rest of the group. They can speak if they want, but the WORK of explaining is on the adults. For more on this, see the Self-Advocacy and Rights tools in this SEL Hub.',
      source: 'Restorative Practices; Glenn Singleton (Courageous Conversations About Race); GLSEN guidance for LGBTQ+ contexts.'
    }
  ];

  function defaultState() {
    return {
      view: 'home',
      filter: null,           // category filter
      planned: [],            // [{protocolId, date, notes}]
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // Pull crewPrompt entries from the standards alignment registry
  function gatherCrewPrompts() {
    if (!window.SelHubStandards || !window.SelHubStandards.alignments) return [];
    var prompts = [];
    Object.keys(window.SelHubStandards.alignments).forEach(function(toolId) {
      var align = window.SelHubStandards.alignments[toolId];
      if (align && align.crewPrompt) {
        prompts.push({ toolId: toolId, construct: align.construct, prompt: align.crewPrompt });
      }
    });
    return prompts;
  }

  window.SelHub.registerTool('crewProtocols', {
    icon: '🪑',
    label: 'Crew Protocols',
    desc: 'A library of structured group formats for Crew time, advisory, or homeroom: community builders, opening and closing rituals, restorative circles, reflection protocols, celebration formats, and hard-conversation guides. Plus a roll-up of Crew prompts from the rest of the SEL Hub. Built on EL Education Crew, Restorative Practices, Tribes, and Responsive Classroom.',
    color: 'sky',
    category: 'relationship-skills',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.crewProtocols || defaultState();
      function setCP(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.crewProtocols) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { crewProtocols: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setCP({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#7dd3fc', fontSize: 22, fontWeight: 900 } }, '🪑 Crew Protocols'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'A library of structured group formats for Crew, advisory, and homeroom.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Overview', icon: '🪑' },
          { id: 'browse', label: 'Browse', icon: '📚' },
          { id: 'crewprompts', label: 'Crew prompts', icon: '💬' },
          { id: 'planner', label: 'My Crew plan', icon: '📅' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Crew Protocols sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#0ea5e9' : '#334155'),
                background: active ? 'rgba(14,165,233,0.18)' : '#1e293b',
                color: active ? '#bae6fd' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'Crew protocols are facilitator tools. Restorative circles and hard-conversation formats require training or a trained adult; do not improvise these.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(14,165,233,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(14,165,233,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#bae6fd', marginBottom: 4 } }, 'Crew is built. It is not assumed.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
              'A class that meets for an hour every day is not automatically a community. Community is built through specific rituals practiced over time. These protocols are the rituals.'
            )
          ),

          // Category cards
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 } },
            Object.keys(CATEGORIES).map(function(catId) {
              var cat = CATEGORIES[catId];
              var count = PROTOCOLS.filter(function(p) { return p.category === catId; }).length;
              return h('button', { key: catId,
                onClick: function() { setCP({ filter: catId, view: 'browse' }); },
                'aria-label': 'Browse ' + cat.label,
                style: { textAlign: 'left', padding: 14, borderRadius: 10, border: '1px solid ' + cat.color + '66', borderLeft: '4px solid ' + cat.color, background: '#0f172a', cursor: 'pointer', color: '#e2e8f0' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                  h('span', { style: { fontSize: 22 } }, cat.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 800, color: cat.color, flex: 1 } }, cat.label),
                  h('span', { style: { fontSize: 10, color: cat.color, fontWeight: 700 } }, count + ' format' + (count === 1 ? '' : 's'))
                ),
                h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, cat.blurb)
              );
            })
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', fontSize: 12.5, color: '#bae6fd', lineHeight: 1.65, marginBottom: 10 } },
            h('strong', null, '💬 Plus: '),
            'the "Crew prompts" tab pulls ALL the Crew-time prompts from across the SEL Hub — each one is a 5-15 minute Crew that points to a specific evidence-based tool. ',
            gatherCrewPrompts().length + ' prompts collected so far.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // BROWSE — protocols, optionally filtered
      // ═══════════════════════════════════════════════════════════
      function renderBrowse() {
        var protocols = d.filter ? PROTOCOLS.filter(function(p) { return p.category === d.filter; }) : PROTOCOLS;

        return h('div', null,
          // Filter chips
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 } },
            h('button', { onClick: function() { setCP({ filter: null }); }, 'aria-label': 'Show all',
              style: { padding: '4px 12px', borderRadius: 14, border: '1px solid ' + (d.filter === null ? '#0ea5e9' : '#334155'), background: d.filter === null ? 'rgba(14,165,233,0.18)' : '#1e293b', color: d.filter === null ? '#bae6fd' : '#cbd5e1', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, 'All (' + PROTOCOLS.length + ')'),
            Object.keys(CATEGORIES).map(function(catId) {
              var cat = CATEGORIES[catId];
              var count = PROTOCOLS.filter(function(p) { return p.category === catId; }).length;
              var active = d.filter === catId;
              return h('button', { key: catId, onClick: function() { setCP({ filter: catId }); }, 'aria-label': 'Filter by ' + cat.label, 'aria-pressed': active,
                style: { padding: '4px 12px', borderRadius: 14, border: '1px solid ' + (active ? cat.color : '#334155'), background: active ? cat.color + '22' : '#1e293b', color: active ? cat.color : '#cbd5e1', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, cat.icon + ' ' + cat.label + ' (' + count + ')');
            })
          ),

          // Protocol cards
          protocols.map(function(p) {
            var cat = CATEGORIES[p.category];
            var isPlanned = (d.planned || []).some(function(x) { return x.protocolId === p.id; });
            return h('div', { key: p.id, style: { padding: 16, borderRadius: 12, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + cat.color, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 22 } }, cat.icon),
                h('span', { style: { fontSize: 16, fontWeight: 800, color: '#e2e8f0', flex: 1 } }, p.title),
                h('span', { style: { fontSize: 10, color: cat.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, cat.label)
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10, fontSize: 11, color: '#94a3b8' } },
                h('span', null, '⏱ ' + p.time),
                h('span', null, '👥 ' + p.groupSize),
                h('span', null, '📦 ' + p.materials)
              ),
              h('div', { style: { padding: 10, borderRadius: 6, background: '#1e293b', marginBottom: 10 } },
                h('div', { style: { fontSize: 11, color: cat.color, fontWeight: 700, marginBottom: 4 } }, 'Purpose'),
                h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.65 } }, p.purpose)
              ),
              h('div', { style: { marginBottom: 10 } },
                h('div', { style: { fontSize: 11, color: cat.color, fontWeight: 700, marginBottom: 4 } }, 'Steps'),
                h('ol', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
                  p.steps.map(function(s, i) { return h('li', { key: i, style: { marginBottom: 4 } }, s); })
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 6, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', marginBottom: 8, fontSize: 12, color: '#e9d5ff', lineHeight: 1.6 } },
                h('strong', null, '💡 Tip: '), p.tips
              ),
              h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 } },
                h('strong', null, 'Source: '), p.source
              ),
              h('button', { onClick: function() {
                var planned = (d.planned || []).slice();
                if (isPlanned) {
                  planned = planned.filter(function(x) { return x.protocolId !== p.id; });
                } else {
                  planned.push({ protocolId: p.id, date: '', notes: '' });
                }
                setCP({ planned: planned });
                if (addToast) addToast(isPlanned ? 'Removed from plan.' : 'Added to plan.', 'info');
              }, 'aria-label': isPlanned ? 'Remove from plan' : 'Add to plan', 'aria-pressed': isPlanned,
                style: { padding: '6px 14px', borderRadius: 6, border: '1px solid ' + cat.color, background: isPlanned ? cat.color : 'transparent', color: isPlanned ? '#fff' : cat.color, cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
                isPlanned ? '✓ Saved to plan' : '+ Save to my Crew plan')
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CREW PROMPTS — pulled from standards alignment registry
      // ═══════════════════════════════════════════════════════════
      function renderCrewPrompts() {
        var prompts = gatherCrewPrompts();

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 12.5, color: '#bae6fd', lineHeight: 1.65 } },
            h('strong', null, '💬 ' + prompts.length + ' Crew prompts '),
            'collected from across the SEL Hub. Each one points to a specific evidence-based tool and gives you a 5-15 minute Crew format you can run with little prep. Tap a prompt to open the underlying tool.'
          ),

          prompts.length > 0
            ? prompts.map(function(p, i) {
                return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #10b981', marginBottom: 8 } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
                    h('span', { style: { fontSize: 11, color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, p.toolId)
                  ),
                  h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.55 } }, p.construct),
                  h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } }, p.prompt)
                );
              })
            : h('div', { style: { padding: 14, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'No Crew prompts available yet.'),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PLANNER — my Crew plan
      // ═══════════════════════════════════════════════════════════
      function renderPlanner() {
        var planned = d.planned || [];

        if (planned.length === 0) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '📅'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'Your Crew plan is empty'),
              h('div', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Browse protocols and tap "Save to my Crew plan" to build your week.'),
              h('button', { onClick: function() { goto('browse'); }, 'aria-label': 'Browse protocols',
                style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #0ea5e9', background: 'rgba(14,165,233,0.18)', color: '#bae6fd', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Browse protocols')
            )
          );
        }

        function setEntry(idx, patch) {
          var nx = planned.slice();
          nx[idx] = Object.assign({}, nx[idx], patch);
          setCP({ planned: nx });
        }
        function remove(idx) {
          var nx = planned.slice();
          nx.splice(idx, 1);
          setCP({ planned: nx });
        }

        return h('div', null,
          h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 10 } }, planned.length + ' protocol' + (planned.length === 1 ? '' : 's') + ' in your plan'),

          planned.map(function(entry, i) {
            var p = PROTOCOLS.find(function(pr) { return pr.id === entry.protocolId; });
            if (!p) return null;
            var cat = CATEGORIES[p.category];
            return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid ' + cat.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 18 } }, cat.icon),
                h('span', { style: { fontSize: 14, fontWeight: 700, color: '#e2e8f0', flex: 1 } }, p.title),
                h('span', { style: { fontSize: 10, color: '#94a3b8' } }, '⏱ ' + p.time),
                h('button', { onClick: function() { remove(i); }, 'aria-label': 'Remove from plan',
                  style: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 } }, '✕')
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 } },
                h('div', null,
                  h('label', { htmlFor: 'cp-date-' + i, style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'When'),
                  h('input', { id: 'cp-date-' + i, type: 'text', value: entry.date || '',
                    placeholder: 'e.g. Mon Sep 15',
                    onChange: function(e) { setEntry(i, { date: e.target.value }); },
                    style: { width: '100%', padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 } })
                ),
                h('div', null,
                  h('label', { htmlFor: 'cp-notes-' + i, style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, 'Notes'),
                  h('input', { id: 'cp-notes-' + i, type: 'text', value: entry.notes || '',
                    placeholder: 'Specific framing, who to focus on, etc.',
                    onChange: function(e) { setEntry(i, { notes: e.target.value }); },
                    style: { width: '100%', padding: 6, borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12 } })
                )
              )
            );
          }),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print my plan',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '🖨 Print my plan')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var planned = d.planned || [];
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(14,165,233,0.10)', borderRadius: 8, border: '1px solid rgba(14,165,233,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#bae6fd', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print my Crew plan.')),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('planner'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'crew-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#crew-print-region, #crew-print-region * { visibility: visible !important; } ' +
              '#crew-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #0284c7' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Crew Protocols · Plan'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My Crew plan'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            planned.length > 0
              ? planned.map(function(entry, i) {
                  var p = PROTOCOLS.find(function(pr) { return pr.id === entry.protocolId; });
                  if (!p) return null;
                  return h('div', { key: i, style: { marginBottom: 16, pageBreakInside: 'avoid' } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
                      h('strong', { style: { fontSize: 13 } }, p.title),
                      h('span', { style: { fontSize: 10, color: '#64748b' } }, '·  ' + p.time + '  ·  ' + p.groupSize)
                    ),
                    entry.date ? h('div', { style: { fontSize: 11, color: '#475569', marginBottom: 4 } }, 'When: ' + entry.date) : null,
                    entry.notes ? h('div', { style: { fontSize: 11, color: '#475569', marginBottom: 4, fontStyle: 'italic' } }, 'Notes: ' + entry.notes) : null,
                    h('div', { style: { fontSize: 12, color: '#0f172a', marginTop: 4 } }, p.purpose),
                    h('ol', { style: { margin: '6px 0 0', padding: '0 0 0 24px', color: '#0f172a', fontSize: 12, lineHeight: 1.65 } },
                      p.steps.map(function(s, si) { return h('li', { key: si, style: { marginBottom: 2 } }, s); })
                    )
                  );
                })
              : h('div', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'No protocols in plan yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Crew protocols drawn from EL Education, Restorative Practices (IIRP), Tribes Learning Communities, Responsive Classroom. ',
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
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('crewProtocols', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#7dd3fc', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'A working library of structured group formats. Each protocol is a specific recipe with a purpose, time, group size, materials, and step-by-step script. The protocols come from established frameworks: EL Education Crew, Restorative Practices, Tribes Learning Communities, Responsive Classroom, and a few other lineages.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The Crew Prompts tab consolidates all the Crew-time prompts from the rest of the SEL Hub — each one tied to a specific evidence-based tool. Use them as 5-15 minute Crews when you want a structured activity that points students toward a tool.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#7dd3fc', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('EL Education', 'eleducation.org', 'The foundational source for Crew as a school structure. Free protocols and guidance.', 'https://eleducation.org/'),
            sourceCard('International Institute for Restorative Practices (IIRP)', 'iirp.edu', 'Standards body for restorative circles and conferences in schools.', 'https://www.iirp.edu/'),
            sourceCard('Gibbs, J. (2014)', 'Reaching All by Creating Tribes Learning Communities (4th ed.)', 'The Tribes framework. Long-running source for community-building protocols.', null),
            sourceCard('Northeast Foundation for Children (Responsive Classroom)', 'responsiveclassroom.org', 'Responsive Classroom\'s Morning Meeting structure is the foundation of much US elementary practice.', 'https://www.responsiveclassroom.org/'),
            sourceCard('School Reform Initiative', 'schoolreforminitiative.org', 'Library of facilitation protocols for educator and student use.', 'https://www.schoolreforminitiative.org/'),
            sourceCard('Zehr, H. (2015)', 'The Little Book of Restorative Justice (revised)', 'Foundational text on restorative practice; clear and short.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Protocols are scaffolding, not magic. A protocol run by an adult who has not built trust with the group will feel performative.'),
              h('li', null, 'Restorative circles and hard-conversation formats require training. Do NOT improvise these the first time. If your school does not have someone trained, bring in a trainer from IIRP or a local restorative-justice organization.'),
              h('li', null, 'These protocols are largely from Western and US educational lineages. Many cultural traditions have their own deep practices for community-building and repair (Indigenous talking circles, African palaver, etc.). Honor the lineage you are working in.'),
              h('li', null, 'Daily repetition matters more than one good protocol. A consistent rough one-word check-in done every day beats a beautifully-designed circle done once a semester.'),
              h('li', null, 'For students whose home or peer culture has not built trust around group rituals, these formats can initially feel weird or unsafe. Pace it; offer pass options; do not force participation.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', fontSize: 12.5, color: '#bae6fd', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'For a new Crew, start with: Community Agreement (Week 1), then daily One-Word Check-in for two weeks until students have the rhythm. Add a weekly Rose/Thorn/Bud or Appreciation Circle. Only after 4-6 weeks of established Crew should you attempt deeper formats. Rushing depth before community is built is the most common failure mode.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#bae6fd', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#bae6fd', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'browse') body = renderBrowse();
      else if (view === 'crewprompts') body = renderCrewPrompts();
      else if (view === 'planner') body = renderPlanner();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Crew Protocols Library' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
