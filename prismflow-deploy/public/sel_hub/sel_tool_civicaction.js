// ═══════════════════════════════════════════
// sel_tool_civicaction.js — Civic Action & Hope Lab
// Grappling with injustice, anxiety about the future,
// building agency, civic engagement, and cultivating hope
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

  // ── Data ──

  var TABS = [
    { id: 'feelings', label: '💭 Name It', desc: 'Identify what you are feeling' },
    { id: 'understand', label: '🔍 Understand It', desc: 'Why does this matter to me?' },
    { id: 'cope', label: '🌿 Cope', desc: 'Healthy ways to hold hard feelings' },
    { id: 'act', label: '✊ Act', desc: 'Turn feelings into action' },
    { id: 'hope', label: '🌅 Hope', desc: 'Cultivate hope and vision' },
  ];

  var FEELINGS_MAP = [
    { id: 'anxious', label: 'Anxious about the future', emoji: '😰', color: '#f59e0b',
      validation: 'It makes sense to feel anxious when the future feels uncertain. This feeling means you care about what happens next — and that caring is actually a strength.',
      reframe: 'Anxiety is your mind\'s way of trying to protect you. You can acknowledge the fear without letting it control your choices.' },
    { id: 'angry', label: 'Angry about injustice', emoji: '😤', color: '#ef4444',
      validation: 'Anger at injustice is a healthy response. Throughout history, people who felt this anger chose to channel it into creating change. Your anger means your moral compass is working.',
      reframe: 'Anger can be fuel — but only if you choose where to direct it. Unfocused anger burns you. Focused anger lights the way.' },
    { id: 'sad', label: 'Sad about the state of things', emoji: '😢', color: '#3b82f6',
      validation: 'Sadness about the world shows that you have empathy and compassion. It is OK to grieve for things that are broken, even if you did not break them.',
      reframe: 'Sadness and hope can exist at the same time. You can hold grief for what is while working toward what could be.' },
    { id: 'helpless', label: 'Helpless or powerless', emoji: '😞', color: '#6b7280',
      validation: 'Feeling powerless is one of the hardest human experiences. But history shows us that almost every major change started with people who felt exactly like you do right now — and chose to act anyway.',
      reframe: 'You may not be able to change everything, but you can change something. Small actions ripple outward in ways you may never see.' },
    { id: 'overwhelmed', label: 'Overwhelmed by too much', emoji: '🤯', color: '#8b5cf6',
      validation: 'The world throws a lot at you — social media, news, school, relationships. Feeling overwhelmed is not a sign of weakness. It means you are paying attention.',
      reframe: 'You do not have to carry everything at once. Choose one thing. Focus there. The rest will wait.' },
    { id: 'numb', label: 'Numb or disconnected', emoji: '😶', color: '#94a3b8',
      validation: 'Numbness is often your mind protecting itself from too much pain. It is not apathy — it is a survival response. The fact that you are here, exploring this, means you have not given up.',
      reframe: 'Reconnecting starts small. One conversation. One walk outside. One moment of noticing something beautiful.' },
    { id: 'hopeful', label: 'Hopeful despite everything', emoji: '🌟', color: '#22c55e',
      validation: 'Hope in difficult times is radical. It is not naive or ignorant — it is a deliberate choice to believe that things can be better, and to work toward making them so.',
      reframe: 'Hope is not the absence of struggle. It is the decision to keep going because of what is possible.' },
  ];

  var COPING_STRATEGIES = [
    { id: 'ground', label: '🌳 Ground Yourself', category: 'body', steps: ['Name 5 things you can see right now.', 'Name 4 things you can touch.', 'Name 3 things you can hear.', 'Name 2 things you can smell.', 'Name 1 thing you can taste.', 'Take 3 slow breaths. You are here. You are safe.'] },
    { id: 'boundaries', label: '📵 Set Info Boundaries', category: 'mind', steps: ['Choose specific times to check the news (not all day).', 'Mute or unfollow accounts that increase your anxiety without adding value.', 'Before reading/watching, ask: "Do I have the capacity for this right now?"', 'It is OK to say "I can\'t take this in right now" — that is self-care, not ignorance.'] },
    { id: 'community', label: '🤝 Find Your People', category: 'connection', steps: ['Talk to someone you trust about how you are feeling.', 'Find a group — online or in person — that shares your values.', 'Volunteer for a cause you care about. Action reduces helplessness.', 'Remember: you are not alone in these feelings. Millions of people share them.'] },
    { id: 'create', label: '🎨 Create Something', category: 'expression', steps: ['Write a poem, letter, or journal entry about what you are feeling.', 'Draw, paint, or make music that expresses your emotions.', 'Create something that imagines the world you want to live in.', 'Share your creation with someone, or keep it private — both are valid.'] },
    { id: 'move', label: '🏃 Move Your Body', category: 'body', steps: ['Walk, run, dance, stretch — whatever feels right.', 'Notice the physical sensations of the emotion and let movement release them.', 'Even 5 minutes of movement can shift your nervous system out of fight-or-flight.', 'You cannot think your way out of anxiety. Sometimes you have to move your way out.'] },
    { id: 'perspective', label: '📖 Seek Perspective', category: 'mind', steps: ['Read about people who faced impossible odds and created change anyway.', 'Talk to someone older about times in their life when things felt hopeless.', 'Study history — not the highlights, but the long slow work of ordinary people.', 'Remember that the people who changed the world did not know they would succeed when they started.'] },
  ];

  var CIVIC_ACTIONS = {
    elementary: [
      { action: 'Write a letter to your principal about something you want to change at school', impact: 'Local', difficulty: '⭐' },
      { action: 'Start a kindness campaign in your classroom', impact: 'School', difficulty: '⭐' },
      { action: 'Create a poster about an issue you care about and share it', impact: 'School', difficulty: '⭐' },
      { action: 'Organize a clean-up of your school yard or neighborhood park', impact: 'Community', difficulty: '⭐⭐' },
      { action: 'Interview a family member about a time they stood up for what was right', impact: 'Personal', difficulty: '⭐' },
      { action: 'Start a book collection drive for a local shelter or community center', impact: 'Community', difficulty: '⭐⭐' },
    ],
    middle: [
      { action: 'Research a local issue and present your findings to your class', impact: 'School', difficulty: '⭐⭐' },
      { action: 'Write a letter to your city council about an issue in your community', impact: 'City', difficulty: '⭐⭐' },
      { action: 'Start or join a student club focused on a cause you care about', impact: 'School', difficulty: '⭐⭐' },
      { action: 'Organize a fundraiser or awareness event for a cause', impact: 'Community', difficulty: '⭐⭐⭐' },
      { action: 'Create a social media campaign (with adult guidance) about an issue', impact: 'Digital', difficulty: '⭐⭐' },
      { action: 'Attend a public town hall meeting and observe how decisions are made', impact: 'City', difficulty: '⭐⭐' },
      { action: 'Mentor a younger student who is struggling', impact: 'Personal', difficulty: '⭐' },
    ],
    high: [
      { action: 'Register to vote (if 18) or pre-register and help others do the same', impact: 'State/National', difficulty: '⭐⭐' },
      { action: 'Testify at a school board or city council meeting on an issue that matters to you', impact: 'City', difficulty: '⭐⭐⭐' },
      { action: 'Organize a peaceful demonstration or walkout (with planning and purpose)', impact: 'Community', difficulty: '⭐⭐⭐' },
      { action: 'Write an op-ed for your school or local newspaper', impact: 'Community', difficulty: '⭐⭐⭐' },
      { action: 'Start a mutual aid project in your school or neighborhood', impact: 'Community', difficulty: '⭐⭐⭐' },
      { action: 'Contact your state representative about legislation you care about', impact: 'State', difficulty: '⭐⭐' },
      { action: 'Volunteer for a political campaign or nonprofit organization', impact: 'State/National', difficulty: '⭐⭐' },
      { action: 'Create a documentary, podcast, or zine about an issue in your community', impact: 'Digital', difficulty: '⭐⭐⭐' },
    ],
  };

  var HOPE_ANCHORS = [
    { person: 'Malala Yousafzai', story: 'Shot by the Taliban at 15 for advocating girls\' education. Became the youngest Nobel Peace Prize laureate. "One child, one teacher, one book, one pen can change the world."', theme: 'Education' },
    { person: 'John Lewis', story: 'Beaten on the Edmund Pettus Bridge at 25. Spent 33 years in Congress fighting for civil rights. "Get in good trouble, necessary trouble."', theme: 'Civil Rights' },
    { person: 'Greta Thunberg', story: 'Started a solo school strike at 15. Inspired millions worldwide. Showed that one person\'s refusal to accept the status quo can ignite a movement.', theme: 'Climate' },
    { person: 'Dolores Huerta', story: 'Co-founded the United Farm Workers at 32. Fought for decades for the rights of migrant farmworkers. "Every moment is an organizing opportunity."', theme: 'Labor Rights' },
    { person: 'Bryan Stevenson', story: 'Founded the Equal Justice Initiative. Has helped free over 140 wrongly condemned people from death row. "Each of us is more than the worst thing we have ever done."', theme: 'Justice' },
    { person: 'Wangari Maathai', story: 'Started the Green Belt Movement in Kenya — planted over 51 million trees. Won the Nobel Peace Prize. "It\'s the little things citizens do. That\'s what will make the difference."', theme: 'Environment' },
    { person: 'Marley Dias', story: 'At 11 years old, launched #1000BlackGirlBooks to collect books with Black girl protagonists. "I didn\'t wait for someone else to do it."', theme: 'Representation' },
  ];

  // ── Registration ──

  window.SelHub.registerTool('civicAction', {
    icon: '✊',
    label: 'Civic Action & Hope',
    desc: 'Process hard feelings about injustice, build civic agency, and cultivate hope through action.',
    color: 'teal',
    category: 'responsible-decision-making',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['civicAction']) || {};
      var upd = function(key, val) { ctx.update('civicAction', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('civicAction', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var Heart = ctx.icons.Heart;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';

      var tab = d.tab || 'feelings';
      var selectedFeeling = d.feeling || null;
      var selectedCoping = d.coping || null;
      var aiResponse = d.aiResponse || null;
      var aiLoading = d.aiLoading || false;
      var actionPlan = d.actionPlan || null;

      var actions = CIVIC_ACTIONS[gradeBand] || CIVIC_ACTIONS.elementary;

      // ── AI counselor ──
      var askCounselor = function(question) {
        if (!callGemini) return;
        upd('aiLoading', true);
        var feeling = FEELINGS_MAP.find(function(f) { return f.id === selectedFeeling; });
        var prompt = 'You are a compassionate school counselor helping a ' + (gradeLevel || '5th grade') + ' student. ' +
          (feeling ? 'They are feeling ' + feeling.label.toLowerCase() + '. ' : '') +
          'They say: "' + question + '"\n\n' +
          'Respond with warmth and validation. Acknowledge their feelings without minimizing them. ' +
          'Offer 1-2 practical, age-appropriate suggestions. Keep it brief (3-4 sentences). ' +
          'Do NOT suggest they just "think positive." Validate the difficulty of what they are experiencing.';
        callGemini(prompt).then(function(resp) {
          updMulti({ aiResponse: resp, aiLoading: false });
        }).catch(function() {
          updMulti({ aiResponse: 'Your feelings are valid. Take a breath — we can work through this together.', aiLoading: false });
        });
      };

      // ── Generate personalized action plan ──
      var generateActionPlan = function() {
        if (!callGemini) return;
        upd('aiLoading', true);
        var feeling = FEELINGS_MAP.find(function(f) { return f.id === selectedFeeling; });
        var issue = d.issueText || '';
        var prompt = 'A ' + (gradeLevel || '5th grade') + ' student feels ' + (feeling ? feeling.label.toLowerCase() : 'concerned about the world') + '. ' +
          (issue ? 'They care about this issue: "' + issue + '". ' : '') +
          'Create a personalized, age-appropriate civic action plan with 3 concrete steps they can take this week. ' +
          'Each step should be specific, achievable, and empowering. ' +
          'Frame it as: "You have more power than you think." ' +
          'Return ONLY JSON: {"steps": [{"action": "what to do", "why": "why it matters", "how": "specific how-to"}]}';
        callGemini(prompt, true).then(function(resp) {
          try {
            var cleaned = resp.trim();
            if (cleaned.indexOf('```') !== -1) { cleaned = cleaned.split('```')[1] || cleaned; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); }
            var plan = JSON.parse(cleaned);
            updMulti({ actionPlan: plan, aiLoading: false });
            addToast('Your action plan is ready!', 'success');
            ctx.awardXP(10);
          } catch(e) { upd('aiLoading', false); }
        }).catch(function() { upd('aiLoading', false); });
      };

      // ═══════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════

      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // ── Header ──
        h('div', { className: 'flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-3' },
            h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-teal-100 text-teal-600 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })),
              h(ArrowLeft, { size: 20 })
            ),
            h('div', null,
              h('h2', { className: 'text-xl font-black text-slate-800' }, '✊ Civic Action & Hope'),
              h('p', { className: 'text-xs text-slate-500' }, 'Your feelings are valid. Your voice matters. Your actions count.')
            )
          )
        ),

        // ── Tab Navigation ──
        h('div', { className: 'flex gap-1 bg-teal-50 rounded-xl p-1 border border-teal-200 overflow-x-auto' },
          TABS.map(function(t) {
            return h('button', {
              key: t.id,
              onClick: function() { upd('tab', t.id); },
              className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ' +
                (tab === t.id ? 'bg-white text-teal-700 shadow-sm' : 'text-teal-600/60 hover:text-teal-700')
            }, t.label);
          })
        ),

        // ═══ NAME IT — Feelings ═══
        tab === 'feelings' && h('div', { className: 'space-y-4' },
          h('p', { className: 'text-sm text-slate-600 text-center' }, 'What are you feeling right now? There are no wrong answers.'),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            FEELINGS_MAP.map(function(f) {
              var isSelected = selectedFeeling === f.id;
              return h('button', {
                key: f.id,
                onClick: function() { upd('feeling', f.id); ctx.awardXP(3); },
                className: 'p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] ' +
                  (isSelected ? 'shadow-lg ring-2 ring-offset-1' : 'bg-white hover:shadow-md'),
                style: { borderColor: isSelected ? f.color : '#e2e8f0', background: isSelected ? f.color + '15' : 'white', '--tw-ring-color': f.color }
              },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-2xl' }, f.emoji),
                  h('span', { className: 'font-bold text-sm text-slate-800' }, f.label)
                )
              );
            })
          ),

          // Validation message
          selectedFeeling && h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 p-5' },
            (function() {
              var f = FEELINGS_MAP.find(function(ff) { return ff.id === selectedFeeling; });
              if (!f) return null;
              return h('div', { className: 'space-y-3' },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-2xl' }, f.emoji),
                  h('h4', { className: 'font-bold text-sm text-teal-800' }, 'Your feeling is valid')
                ),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, f.validation),
                h('div', { className: 'bg-white rounded-xl p-3 border border-teal-200' },
                  h('p', { className: 'text-xs text-teal-700 italic' }, '💡 ', f.reframe)
                ),
                callTTS && h('button', {
                  onClick: function() { callTTS(f.validation + ' ' + f.reframe); },
                  className: 'text-[10px] text-teal-500 hover:text-teal-700 font-bold'
                }, '🔊 Hear this read aloud')
              );
            })()
          ),

          // Free write
          h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4' },
            h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '📝 What is on your mind? (private)'),
            h('textarea', {
              value: d.freeWrite || '',
              onChange: function(e) { upd('freeWrite', e.target.value); },
              placeholder: 'Write freely about what you are thinking and feeling. Nobody will see this unless you choose to share it.',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-teal-300',
              'aria-label': 'Free write about your feelings'
            })
          ),

          // AI counselor
          d.freeWrite && d.freeWrite.length > 20 && h('button', {
            onClick: function() { askCounselor(d.freeWrite); },
            disabled: aiLoading,
            className: 'w-full px-4 py-2 bg-teal-50 border border-teal-200 rounded-lg text-xs font-bold text-teal-600 hover:bg-teal-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2'
          }, h(Sparkles, { size: 14 }), aiLoading ? 'Thinking...' : '💬 Talk to AI Counselor about this')
        ),

        // ═══ UNDERSTAND IT ═══
        tab === 'understand' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '🔍 Why Does This Matter to Me?'),
            h('p', { className: 'text-sm text-slate-500' }, 'Understanding why you care is the first step toward meaningful action.')
          ),

          h('div', { className: 'bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-4' },
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'What issue or injustice concerns you most right now?'),
              h('input', {
                type: 'text', value: d.issueText || '',
                onChange: function(e) { upd('issueText', e.target.value); },
                placeholder: 'e.g., climate change, inequality, bullying, gun violence, housing...',
                className: 'w-full text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-300',
                'aria-label': 'Issue you care about'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Why does this matter to you personally?'),
              h('textarea', {
                value: d.whyItMatters || '',
                onChange: function(e) { upd('whyItMatters', e.target.value); },
                placeholder: 'Connect this issue to your life, your values, or people you care about...',
                className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-20 outline-none focus:ring-2 focus:ring-teal-300',
                'aria-label': 'Why it matters to you'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Who is most affected by this issue?'),
              h('textarea', {
                value: d.whoAffected || '',
                onChange: function(e) { upd('whoAffected', e.target.value); },
                placeholder: 'Think about the people and communities most impacted...',
                className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-teal-300',
                'aria-label': 'Who is affected'
              })
            )
          ),

          h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4 text-center' },
            h('p', { className: 'text-sm text-amber-800 italic' },
              '"The world is not dangerous because of those who do harm, but because of those who look at it without doing anything." — Albert Einstein'
            )
          )
        ),

        // ═══ COPE ═══
        tab === 'cope' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '🌿 Healthy Ways to Hold Hard Feelings'),
            h('p', { className: 'text-sm text-slate-500' }, 'You do not have to fix the world to take care of yourself.')
          ),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            COPING_STRATEGIES.map(function(strategy) {
              var isExpanded = selectedCoping === strategy.id;
              return h('div', {
                key: strategy.id,
                className: 'rounded-2xl border-2 overflow-hidden transition-all ' +
                  (isExpanded ? 'border-teal-400 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-300')
              },
                h('button', {
                  onClick: function() { upd('coping', isExpanded ? null : strategy.id); if (!isExpanded) ctx.awardXP(3); },
                  className: 'w-full p-4 text-left'
                },
                  h('div', { className: 'font-bold text-sm text-slate-800' }, strategy.label),
                  h('div', { className: 'text-[10px] text-slate-400 mt-0.5 uppercase font-bold' }, strategy.category)
                ),
                isExpanded && h('div', { className: 'px-4 pb-4 space-y-2' },
                  strategy.steps.map(function(step, si) {
                    return h('div', { key: si, className: 'flex items-start gap-2 text-xs text-slate-700' },
                      h('span', { className: 'text-teal-500 font-bold mt-0.5 shrink-0' }, (si + 1) + '.'),
                      h('span', { className: 'leading-relaxed' }, step)
                    );
                  })
                )
              );
            })
          )
        ),

        // ═══ ACT ═══
        tab === 'act' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '✊ Turn Feelings Into Action'),
            h('p', { className: 'text-sm text-slate-500' }, 'You have more power than you think. Here are concrete steps you can take.')
          ),

          // Action cards
          h('div', { className: 'space-y-2' },
            actions.map(function(a, i) {
              return h('div', { key: i, className: 'bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 hover:border-teal-300 transition-colors' },
                h('div', { className: 'bg-teal-100 text-teal-700 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0' }, a.impact),
                h('div', { className: 'flex-1' },
                  h('p', { className: 'text-sm text-slate-800 font-medium' }, a.action),
                  h('span', { className: 'text-[10px] text-amber-500' }, a.difficulty)
                )
              );
            })
          ),

          // Personalized action plan
          h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 p-5' },
            h('h4', { className: 'text-sm font-bold text-teal-700 mb-2 flex items-center gap-2' }, h(Sparkles, { size: 14 }), 'Get a Personalized Action Plan'),
            d.issueText && h('p', { className: 'text-xs text-slate-500 mb-3' }, 'Based on your concern about: "' + d.issueText + '"'),
            h('button', {
              onClick: generateActionPlan,
              disabled: aiLoading,
              className: 'px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center gap-2'
            }, aiLoading ? 'Creating your plan...' : '✨ Generate My Action Plan'),

            // Display action plan
            actionPlan && actionPlan.steps && h('div', { className: 'mt-4 space-y-3' },
              actionPlan.steps.map(function(step, i) {
                return h('div', { key: i, className: 'bg-white rounded-xl border border-teal-200 p-3' },
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'bg-teal-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0' }, i + 1),
                    h('div', null,
                      h('p', { className: 'text-sm font-bold text-slate-800' }, step.action),
                      h('p', { className: 'text-xs text-slate-500 mt-1' }, step.why),
                      step.how && h('p', { className: 'text-xs text-teal-600 mt-1 font-medium' }, '📋 How: ' + step.how)
                    )
                  )
                );
              })
            )
          )
        ),

        // ═══ HOPE ═══
        tab === 'hope' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '🌅 Cultivating Hope'),
            h('p', { className: 'text-sm text-slate-500' }, 'Hope is not the belief that things will be easy. It is the belief that things can be better — and the courage to work toward it.')
          ),

          // Hope anchors — people who changed things
          h('div', { className: 'space-y-3' },
            h('h4', { className: 'text-xs font-bold text-teal-600 uppercase tracking-widest' }, '🌟 People Who Started Where You Are'),
            HOPE_ANCHORS.map(function(anchor, i) {
              return h('div', { key: i, className: 'bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-colors' },
                h('div', { className: 'flex items-start gap-3' },
                  h('div', { className: 'bg-teal-100 text-teal-700 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0' }, anchor.theme),
                  h('div', null,
                    h('div', { className: 'font-bold text-sm text-slate-800' }, anchor.person),
                    h('p', { className: 'text-xs text-slate-600 leading-relaxed mt-1' }, anchor.story)
                  )
                )
              );
            })
          ),

          // Vision exercise
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl border border-amber-200 p-5' },
            h('h4', { className: 'text-sm font-bold text-amber-700 mb-2' }, '🔮 Your Vision for the Future'),
            h('p', { className: 'text-xs text-slate-500 mb-3' }, 'Close your eyes for a moment. Imagine the world you want to live in 20 years from now. What does it look like?'),
            h('textarea', {
              value: d.visionText || '',
              onChange: function(e) { upd('visionText', e.target.value); },
              placeholder: 'Describe the world you want to help create...',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-amber-300',
              'aria-label': 'Your vision for the future'
            }),
            d.visionText && d.visionText.length > 20 && h('button', {
              onClick: function() { ctx.awardXP(15); addToast('Your vision matters. Hold onto it. 🌅', 'success'); ctx.celebrate(); },
              className: 'mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors'
            }, '💛 Save My Vision')
          ),

          // Closing quote
          h('div', { className: 'bg-teal-50 border border-teal-200 rounded-xl p-4 text-center' },
            h('p', { className: 'text-sm text-teal-800 italic leading-relaxed' },
              '"You are not obligated to complete the work, but neither are you free to abandon it."'
            ),
            h('p', { className: 'text-[10px] text-teal-500 mt-1 font-bold' }, '— Rabbi Tarfon, Pirkei Avot 2:16')
          )
        ),

        // ── AI Response ──
        aiResponse && h('div', { className: 'bg-teal-50 border border-teal-200 rounded-xl p-4' },
          h('div', { className: 'flex items-start gap-2' },
            h(Heart, { size: 14, className: 'text-teal-500 mt-0.5 shrink-0' }),
            h('div', null,
              h('div', { className: 'text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1' }, 'Counselor'),
              h('p', { className: 'text-sm text-teal-800 leading-relaxed' }, aiResponse)
            )
          ),
          h('button', { onClick: function() { upd('aiResponse', null); }, className: 'mt-2 text-[10px] text-teal-400 hover:text-teal-600 font-bold' }, 'Dismiss')
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_civicaction.js loaded');
