// ═══════════════════════════════════════════
// sel_tool_restorativecircle.js — Restorative Circle Process
// Restorative justice circles, proactive community circles,
// talking piece tradition, and honoring Indigenous roots
// ═══════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[SelHub] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[SelHub] Error rendering ' + id, e); return null; } }
};

(function() {
  'use strict';

  // ── Circle process data ──

  var CIRCLE_TYPES = [
    { id: 'community', label: 'Community Building', emoji: '🌱', color: '#22c55e', desc: 'Strengthen relationships, build trust, and create belonging in your group.' },
    { id: 'restorative', label: 'Repairing Harm', emoji: '💛', color: '#eab308', desc: 'Address conflict or harm with empathy, accountability, and healing.' },
    { id: 'celebration', label: 'Celebration & Gratitude', emoji: '🎉', color: '#a855f7', desc: 'Honor achievements, express gratitude, and celebrate each other.' },
    { id: 'academic', label: 'Academic Discussion', emoji: '📚', color: '#3b82f6', desc: 'Explore ideas together with equal voice and deep listening.' },
    { id: 'check-in', label: 'Daily Check-In', emoji: '☀️', color: '#f97316', desc: 'Start the day by connecting, sharing, and setting intentions.' },
  ];

  var TALKING_PIECES = [
    { id: 'feather', name: 'Eagle Feather', emoji: '🪶', origin: 'Many First Nations / Native American traditions', significance: 'The eagle feather is sacred in many Indigenous cultures. It represents truth, honor, and the connection between the holder and the Creator. When you hold the feather, you carry the responsibility to speak from the heart.' },
    { id: 'stone', name: 'Talking Stone', emoji: '🪨', origin: 'Various Indigenous cultures worldwide', significance: 'Stones connect us to the Earth. A smooth river stone represents patience — shaped by water over thousands of years. Holding it reminds us that understanding takes time, and every voice matters.' },
    { id: 'shell', name: 'Conch Shell', emoji: '🐚', origin: 'Pacific Islander and Caribbean traditions', significance: 'The conch shell carries the sound of the ocean — a reminder that we are all connected. In many island cultures, the conch called communities together for important gatherings.' },
    { id: 'stick', name: 'Talking Stick', emoji: '🪵', origin: 'Many First Nations / Native American traditions', significance: 'The talking stick is often decorated with meaningful symbols. Holding it gives you the right and responsibility to speak while others listen with respect. It teaches that listening is as important as speaking.' },
    { id: 'heart', name: 'Heart Object', emoji: '❤️', origin: 'Modern circle practice', significance: 'A heart-shaped object reminds us to speak from the heart and listen with compassion. It represents the courage it takes to be vulnerable and honest.' },
    { id: 'yarn', name: 'Ball of Yarn', emoji: '🧶', origin: 'Community weaving traditions', significance: 'As the yarn passes around the circle, it creates a visible web of connection. This shows how our stories and experiences are woven together — we are stronger connected.' },
  ];

  var INDIGENOUS_ROOTS = {
    title: 'Honoring the Roots of Circle Practice',
    paragraphs: [
      'Circle processes have been practiced by Indigenous peoples around the world for thousands of years — long before Western institutions adopted them. Many First Nations, Native American, Aboriginal Australian, Māori, and African communities have used circles as the foundation of governance, conflict resolution, and community life.',
      'In many Native American traditions, the circle represents the interconnectedness of all living things. The Medicine Wheel teaches that all directions, seasons, and aspects of life are connected. When we sit in circle, we honor this teaching — every person is equal, every voice matters, and we are all part of something larger.',
      'The Navajo (Diné) practice of Peacemaking, the Haudenosaunee (Iroquois) tradition of consensus, and the Māori concept of hui all use circle-based processes to resolve conflict and make decisions. These practices center relationships over punishment, healing over blame, and community over individuals.',
      'When we use circles in schools today, we are guests of these traditions. We have a responsibility to honor their origins, practice them with respect, and acknowledge that we are building on wisdom that Indigenous communities developed and maintained for millennia.',
      'It is important to note that these practices were actively suppressed during colonization. Using them today is also an act of recognizing that Indigenous knowledge systems hold profound wisdom for how humans can live, learn, and resolve conflict together.',
    ],
    reflection: 'What does it mean to you to practice something rooted in traditions that are thousands of years old? How can you honor those roots?',
  };

  var CIRCLE_PROMPTS = {
    'community': {
      elementary: [
        'What is something that made you smile this week?',
        'If you could have any superpower to help others, what would it be?',
        'What is one thing you like about the person sitting next to you?',
        'What is something you are really good at?',
        'If our class was a team of superheroes, what would our team name be?',
        'What makes you feel safe and welcome in our classroom?',
        'Tell us about someone who is kind to you.',
        'What is one wish you have for our class this week?',
      ],
      middle: [
        'What is one thing people might not know about you that you would like to share?',
        'Describe a time when someone showed you unexpected kindness.',
        'What does "belonging" mean to you? Where do you feel you belong?',
        'If you could change one thing about how people treat each other, what would it be?',
        'What is something you are struggling with that you would like support with?',
        'What does respect look like in our community?',
        'Share a tradition from your family or culture that is meaningful to you.',
        'What is one thing our class could do to make everyone feel more included?',
      ],
      high: [
        'What is a value you hold that shapes how you treat people?',
        'Describe a moment when you felt truly heard by someone.',
        'What does justice mean to you? Is it different from fairness?',
        'How has your understanding of yourself changed in the past year?',
        'What is something you want to unlearn? Why?',
        'When have you been an ally to someone? When has someone been an ally to you?',
        'What does vulnerability look like in a community that feels safe?',
        'What is one thing our generation can teach older generations?',
      ],
    },
    'restorative': {
      elementary: [
        'What happened? Tell us in your own words.',
        'How did you feel when this happened?',
        'Who was affected by what happened?',
        'What do you need right now to feel better?',
        'What can we do to make things right?',
        'How can we make sure this does not happen again?',
      ],
      middle: [
        'What happened from your perspective?',
        'What were you thinking at the time? What are you thinking now?',
        'How has this affected you and others?',
        'What has been the hardest thing for you about this situation?',
        'What do you think needs to happen to make things right?',
        'What would it take for you to move forward?',
      ],
      high: [
        'Share what happened from your perspective — speak from "I" statements.',
        'What were the thoughts and feelings driving your actions?',
        'Who has been affected, and in what ways?',
        'What obligations or responsibilities do you see arising from this?',
        'What would accountability look like in this situation?',
        'What would healing look like for everyone involved?',
        'How can our community support the repair process?',
      ],
    },
    'celebration': {
      elementary: [
        'What is something you are proud of this week?',
        'Who helped you learn something new? What did they do?',
        'What is one kind thing you saw someone do?',
        'What is your favorite memory from this month?',
      ],
      middle: [
        'Share an accomplishment — big or small — that matters to you.',
        'Who in this circle has inspired you, and how?',
        'What is something our class did together that made you proud?',
        'What is one thing you are grateful for right now?',
      ],
      high: [
        'Share a moment of growth you have experienced recently.',
        'Acknowledge someone in this circle and the impact they have had on you.',
        'What is something our community has overcome together?',
        'What are you looking forward to, and why does it matter to you?',
      ],
    },
    'check-in': {
      elementary: [
        'On a scale of 1-5, how are you feeling today? Show with your fingers.',
        'What is one word that describes how you feel right now?',
        'What are you looking forward to today?',
        'What do you need from our class today to have a good day?',
      ],
      middle: [
        'Check in with one word or phrase — how are you arriving today?',
        'What is on your mind right now? (You can pass if you prefer.)',
        'What is one intention you have for today?',
        'Is there anything you need the group to know?',
      ],
      high: [
        'How are you showing up today — mentally, emotionally, physically?',
        'What is something you are carrying that you would like to set down?',
        'What do you need from this space today?',
        'One word: what energy are you bringing to the circle?',
      ],
    },
    'academic': {
      elementary: [
        'What is one new thing you learned this week that surprised you?',
        'What question do you still have about what we are learning?',
        'How would you explain what we are studying to a friend?',
      ],
      middle: [
        'What connection can you make between what we are learning and your life?',
        'What is the most important idea from today, and why?',
        'What is a question you want to explore further?',
        'Do you agree or disagree with [topic]? Why?',
      ],
      high: [
        'How does today\'s content challenge or confirm something you already believed?',
        'What perspectives are missing from what we studied?',
        'How would you apply this knowledge to solve a real-world problem?',
        'What is the most important question this topic raises?',
      ],
    },
  };

  var CIRCLE_AGREEMENTS = [
    { text: 'Speak from the heart — use "I" statements', icon: '❤️' },
    { text: 'Listen from the heart — give your full attention', icon: '👂' },
    { text: 'Speak lean — be thoughtful and concise', icon: '🎯' },
    { text: 'Be spontaneous — respond in the moment, not rehearsed', icon: '✨' },
    { text: 'What is shared in circle stays in circle (confidentiality)', icon: '🔒' },
    { text: 'It is OK to pass — you always have the right to not speak', icon: '🤝' },
    { text: 'Respect the talking piece — only the holder speaks', icon: '🪶' },
  ];

  // ── Registration ──

  window.SelHub.registerTool('restorativeCircle', {
    icon: '🪶',
    label: 'Restorative Circle',
    desc: 'Facilitate restorative and community-building circles. Explore talking pieces, Indigenous roots, and the power of sitting in circle.',
    color: 'amber',
    category: 'relationship-skills',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['restorativeCircle']) || {};
      var upd = function(key, val) { ctx.update('restorativeCircle', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('restorativeCircle', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var X = ctx.icons.X;
      var Sparkles = ctx.icons.Sparkles;
      var Heart = ctx.icons.Heart;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';
      var theme = ctx.theme || {};

      var tab = d.tab || 'home';
      var selectedCircleType = d.circleType || null;
      var selectedPiece = d.talkingPiece || null;
      var currentPromptIdx = d.promptIdx || 0;
      var isCircleActive = d.circleActive || false;
      var reflections = d.reflections || [];
      var aiResponse = d.aiResponse || null;
      var aiLoading = d.aiLoading || false;

      // ── Get grade-appropriate prompts ──
      var getPrompts = function(circleType) {
        var bank = CIRCLE_PROMPTS[circleType] || CIRCLE_PROMPTS['community'];
        if (gradeBand === 'high') return bank.high || bank.middle;
        if (gradeBand === 'middle') return bank.middle || bank.elementary;
        return bank.elementary;
      };

      // ── AI circle facilitator ──
      var askCircleFacilitator = function(question) {
        if (!callGemini) return;
        upd('aiLoading', true);
        var prompt = 'You are a warm, experienced circle facilitator helping a ' + (gradeLevel || '5th grade') + ' group. ' +
          'The circle type is: ' + (selectedCircleType || 'community building') + '. ' +
          'A participant asks: "' + question + '"\n\n' +
          'Respond with empathy and practical guidance. Keep it brief (2-3 sentences). ' +
          'If the question is about a conflict, center healing and accountability over punishment.';
        callGemini(prompt).then(function(resp) {
          updMulti({ aiResponse: resp, aiLoading: false });
        }).catch(function() {
          updMulti({ aiResponse: 'I\'m here to help. Let\'s take a breath and try again.', aiLoading: false });
        });
      };

      // ── Generate custom prompts with AI ──
      var generateCustomPrompts = function() {
        if (!callGemini) return;
        upd('aiLoading', true);
        var circleLabel = CIRCLE_TYPES.find(function(c) { return c.id === selectedCircleType; })?.label || 'community building';
        var prompt = 'Generate 5 circle process discussion prompts for a ' + (gradeLevel || '5th grade') + ' group doing a ' + circleLabel + ' circle. ' +
          'The prompts should be open-ended, invite vulnerability and honesty, and be age-appropriate. ' +
          'Return ONLY a JSON array of strings: ["prompt 1", "prompt 2", ...]';
        callGemini(prompt, true).then(function(resp) {
          try {
            var cleaned = resp.trim();
            if (cleaned.indexOf('```') !== -1) {
              cleaned = cleaned.split('```')[1] || cleaned;
              if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n');
            }
            var prompts = JSON.parse(cleaned);
            if (Array.isArray(prompts)) {
              updMulti({ customPrompts: prompts, aiLoading: false });
              addToast('Custom prompts generated!', 'success');
            }
          } catch(e) {
            upd('aiLoading', false);
          }
        }).catch(function() { upd('aiLoading', false); });
      };

      var prompts = d.customPrompts || getPrompts(selectedCircleType);

      // ═══════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════

      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // ── Header ──
        h('div', { className: 'flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-3' },
            h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-amber-100 text-amber-600 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })),
              h(ArrowLeft, { size: 20 })
            ),
            h('div', null,
              h('h2', { className: 'text-xl font-black text-slate-800' }, '🪶 Restorative Circle'),
              h('p', { className: 'text-xs text-slate-500' }, 'Community building, repair, and the wisdom of sitting in circle')
            )
          )
        ),

        // ── Tab Navigation ──
        h('div', { className: 'flex gap-1 bg-amber-50 rounded-xl p-1 border border-amber-200' },
          ['home', 'circle', 'talking-piece', 'roots'].map(function(t) {
            var labels = { 'home': '🏠 Circle Types', 'circle': '⭕ Active Circle', 'talking-piece': '🪶 Talking Piece', 'roots': '🌍 Indigenous Roots' };
            return h('button', {
              key: t,
              onClick: function() { upd('tab', t); },
              className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ' +
                (tab === t ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600/60 hover:text-amber-700')
            }, labels[t]);
          })
        ),

        // ═══ HOME — Circle Types ═══
        tab === 'home' && h('div', { className: 'space-y-3' },
          h('p', { className: 'text-sm text-slate-600 text-center' }, 'Choose the type of circle you want to facilitate today.'),

          // Circle type cards
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            CIRCLE_TYPES.map(function(ct) {
              return h('button', {
                key: ct.id,
                onClick: function() { updMulti({ circleType: ct.id, tab: 'circle', promptIdx: 0, circleActive: true, customPrompts: null }); ctx.awardXP(5); },
                className: 'p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] hover:shadow-md ' +
                  (selectedCircleType === ct.id ? 'border-amber-400 bg-amber-50 shadow-md' : 'border-slate-200 bg-white hover:border-amber-300')
              },
                h('div', { className: 'text-2xl mb-2' }, ct.emoji),
                h('div', { className: 'font-bold text-sm text-slate-800' }, ct.label),
                h('p', { className: 'text-xs text-slate-500 mt-1 leading-relaxed' }, ct.desc)
              );
            })
          ),

          // Circle Agreements
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-4 mt-4' },
            h('h3', { className: 'text-sm font-bold text-amber-700 mb-3 flex items-center gap-2' }, '📜 Circle Agreements'),
            h('div', { className: 'space-y-2' },
              CIRCLE_AGREEMENTS.map(function(a, i) {
                return h('div', { key: i, className: 'flex items-center gap-2 text-xs text-slate-700' },
                  h('span', { className: 'text-base' }, a.icon),
                  h('span', null, a.text)
                );
              })
            )
          )
        ),

        // ═══ ACTIVE CIRCLE ═══
        tab === 'circle' && selectedCircleType && h('div', { className: 'space-y-4' },

          // Circle type badge
          h('div', { className: 'text-center' },
            h('span', { className: 'inline-block px-4 py-1.5 rounded-full text-xs font-bold text-white', style: { background: (CIRCLE_TYPES.find(function(c) { return c.id === selectedCircleType; }) || {}).color || '#eab308' } },
              (CIRCLE_TYPES.find(function(c) { return c.id === selectedCircleType; }) || {}).emoji + ' ' +
              (CIRCLE_TYPES.find(function(c) { return c.id === selectedCircleType; }) || {}).label + ' Circle'
            )
          ),

          // Talking piece reminder
          selectedPiece && h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 text-center' },
            h('p', { className: 'text-xs text-amber-700' },
              'Talking piece: ', h('strong', null, (TALKING_PIECES.find(function(p) { return p.id === selectedPiece; }) || {}).emoji + ' ' + (TALKING_PIECES.find(function(p) { return p.id === selectedPiece; }) || {}).name),
              ' — Only the holder speaks.'
            )
          ),

          // Current prompt
          h('div', { className: 'bg-white rounded-2xl border-2 border-amber-200 p-6 text-center shadow-lg' },
            h('div', { className: 'text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2' }, 'Round ' + (currentPromptIdx + 1) + ' of ' + prompts.length),
            h('p', { className: 'text-lg font-bold text-slate-800 leading-relaxed' }, prompts[currentPromptIdx] || 'Circle complete — thank you for sharing.'),

            // Navigation
            h('div', { className: 'flex gap-2 justify-center mt-4' },
              h('button', {
                onClick: function() { upd('promptIdx', Math.max(0, currentPromptIdx - 1)); },
                disabled: currentPromptIdx === 0,
                className: 'px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors'
              }, '← Previous'),
              h('button', {
                onClick: function() {
                  if (currentPromptIdx < prompts.length - 1) {
                    upd('promptIdx', currentPromptIdx + 1);
                  } else {
                    updMulti({ circleActive: false, tab: 'home' });
                    addToast('Circle complete — well done! 🪶', 'success');
                    ctx.awardXP(15);
                    ctx.celebrate();
                  }
                },
                className: 'px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors'
              }, currentPromptIdx < prompts.length - 1 ? 'Next Round →' : '✅ Close Circle')
            ),

            // Speak prompt aloud
            callTTS && h('button', {
              onClick: function() { callTTS(prompts[currentPromptIdx] || ''); },
              className: 'mt-3 text-[10px] text-amber-500 hover:text-amber-700 font-bold'
            }, '🔊 Read Aloud')
          ),

          // Reflection journal
          h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4' },
            h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '📝 Your Reflection (private)'),
            h('textarea', {
              value: d.currentReflection || '',
              onChange: function(e) { upd('currentReflection', e.target.value); },
              placeholder: 'What came up for you during this round? What did you notice?',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-amber-300',
              'aria-label': 'Circle reflection'
            }),
            d.currentReflection && h('button', {
              onClick: function() {
                var newReflections = reflections.concat([{ text: d.currentReflection, prompt: prompts[currentPromptIdx], time: new Date().toLocaleTimeString() }]);
                updMulti({ reflections: newReflections, currentReflection: '' });
                addToast('Reflection saved', 'success');
              },
              className: 'mt-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors'
            }, 'Save Reflection')
          ),

          // Generate custom prompts
          h('button', {
            onClick: generateCustomPrompts,
            disabled: aiLoading,
            className: 'w-full px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2'
          }, h(Sparkles, { size: 14 }), aiLoading ? 'Generating...' : '✨ Generate Custom Prompts with AI')
        ),

        // ═══ TALKING PIECE ═══
        tab === 'talking-piece' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '🪶 The Talking Piece'),
            h('p', { className: 'text-sm text-slate-500 leading-relaxed max-w-lg mx-auto' },
              'The talking piece is a sacred object passed around the circle. Only the person holding it may speak. This practice teaches us that listening is just as powerful as speaking.'
            )
          ),

          // Talking piece cards
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            TALKING_PIECES.map(function(piece) {
              var isSelected = selectedPiece === piece.id;
              return h('div', {
                key: piece.id,
                className: 'rounded-2xl border-2 p-4 transition-all cursor-pointer hover:shadow-md ' +
                  (isSelected ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200' : 'border-slate-200 bg-white hover:border-amber-300'),
                onClick: function() { upd('talkingPiece', piece.id); ctx.awardXP(3); }
              },
                h('div', { className: 'flex items-center gap-3 mb-2' },
                  h('span', { className: 'text-3xl' }, piece.emoji),
                  h('div', null,
                    h('div', { className: 'font-bold text-sm text-slate-800' }, piece.name),
                    h('div', { className: 'text-[10px] text-amber-600 font-medium' }, piece.origin)
                  )
                ),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, piece.significance),
                isSelected && h('div', { className: 'mt-2 text-[10px] font-bold text-amber-600 flex items-center gap-1' }, '✓ Selected as your talking piece')
              );
            })
          ),

          // Reflection question
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 text-center' },
            h('p', { className: 'text-sm text-amber-800 italic leading-relaxed' },
              '"What object would you choose as your own talking piece? What would it represent about how you want to show up in the world?"'
            )
          )
        ),

        // ═══ INDIGENOUS ROOTS ═══
        tab === 'roots' && h('div', { className: 'space-y-4' },
          h('div', { className: 'bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 p-6' },
            h('h3', { className: 'text-lg font-black text-amber-900 mb-4 flex items-center gap-2' }, '🌍 ', INDIGENOUS_ROOTS.title),

            h('div', { className: 'space-y-4' },
              INDIGENOUS_ROOTS.paragraphs.map(function(para, i) {
                return h('p', { key: i, className: 'text-sm text-slate-700 leading-relaxed' }, para);
              })
            ),

            h('div', { className: 'mt-6 bg-white rounded-xl border border-amber-200 p-4' },
              h('h4', { className: 'text-xs font-bold text-amber-600 uppercase tracking-widest mb-2' }, '💭 Reflection'),
              h('p', { className: 'text-sm text-amber-800 italic mb-3' }, INDIGENOUS_ROOTS.reflection),
              h('textarea', {
                value: d.rootsReflection || '',
                onChange: function(e) { upd('rootsReflection', e.target.value); },
                placeholder: 'Write your reflection here...',
                className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-amber-300',
                'aria-label': 'Indigenous roots reflection'
              })
            ),

            // Key terms
            h('div', { className: 'mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3' },
              [
                { term: 'Peacemaking (Diné/Navajo)', desc: 'A holistic process focused on restoring harmony (hózhó) — balance in relationships, community, and the natural world.' },
                { term: 'Hui (Māori)', desc: 'A gathering on the marae (meeting ground) where issues are discussed collectively, with protocols for speaking and listening.' },
                { term: 'Haudenosaunee Consensus', desc: 'Decision-making in the Iroquois Confederacy required consensus among all nations — a model that influenced democratic governance worldwide.' },
                { term: 'Ubuntu (Southern Africa)', desc: '"I am because we are." A philosophy that emphasizes interconnectedness — harm to one is harm to all, healing for one is healing for all.' },
              ].map(function(item, i) {
                return h('div', { key: i, className: 'bg-white rounded-xl border border-amber-200 p-3' },
                  h('div', { className: 'font-bold text-xs text-amber-800 mb-1' }, item.term),
                  h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, item.desc)
                );
              })
            )
          ),

          // Land acknowledgment prompt
          h('div', { className: 'bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center' },
            h('p', { className: 'text-xs text-emerald-700 leading-relaxed' },
              '🌱 Consider beginning your circle with a land acknowledgment — recognizing the Indigenous peoples whose traditional territory you are on. ',
              h('a', { href: 'https://native-land.ca/', target: '_blank', rel: 'noopener noreferrer', className: 'underline font-bold hover:text-emerald-900' }, 'native-land.ca'),
              ' can help you learn whose land you are on.'
            )
          ),

          h('button', {
            onClick: function() { ctx.awardXP(10); addToast('Thank you for learning about these roots 🌍', 'success'); },
            className: 'w-full px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors'
          }, '✅ I have read and reflected on these roots')
        ),

        // ── AI Response ──
        aiResponse && h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-4' },
          h('div', { className: 'flex items-start gap-2' },
            h(Sparkles, { size: 14, className: 'text-indigo-500 mt-0.5 shrink-0' }),
            h('div', null,
              h('div', { className: 'text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1' }, 'Circle Facilitator'),
              h('p', { className: 'text-sm text-indigo-800 leading-relaxed' }, aiResponse)
            )
          ),
          h('button', { onClick: function() { upd('aiResponse', null); }, className: 'mt-2 text-[10px] text-indigo-400 hover:text-indigo-600 font-bold' }, 'Dismiss')
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_restorativecircle.js loaded');
