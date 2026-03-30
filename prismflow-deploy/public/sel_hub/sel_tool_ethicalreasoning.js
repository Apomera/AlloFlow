// ═══════════════════════════════════════════
// sel_tool_ethicalreasoning.js — Ethical Reasoning Lab
// Contemporary dilemmas, ethical frameworks, stakeholder mapping,
// AI Socratic dialogue, and deep moral reasoning
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

  // ── Ethical Frameworks ──
  var FRAMEWORKS = [
    { id: 'utilitarian', name: 'Utilitarianism', emoji: '📊', thinker: 'John Stuart Mill', core: 'The right action produces the greatest good for the greatest number.', question: 'Which choice creates the most overall well-being and the least suffering?' },
    { id: 'deontological', name: 'Duty Ethics', emoji: '📜', thinker: 'Immanuel Kant', core: 'Some actions are right or wrong regardless of their consequences — based on moral rules and duties.', question: 'Is this action something everyone should do? Does it treat people as ends, never merely as means?' },
    { id: 'virtue', name: 'Virtue Ethics', emoji: '🏛️', thinker: 'Aristotle', core: 'Focus on developing good character traits. A virtuous person will naturally make good choices.', question: 'What would a person of excellent character do in this situation?' },
    { id: 'care', name: 'Ethics of Care', emoji: '🤝', thinker: 'Carol Gilligan & Nel Noddings', core: 'Moral decisions should center relationships, empathy, and responsibility to those who depend on us.', question: 'Who is vulnerable in this situation? What do our relationships require of us?' },
    { id: 'indigenous', name: 'Relational / Indigenous Ethics', emoji: '🌎', thinker: 'Many Indigenous traditions', core: 'All beings are interconnected. Ethical decisions consider the impact on seven generations forward, on the land, water, animals, and community.', question: 'How does this decision affect the web of relationships — human, animal, plant, and earth — for generations to come?' },
    { id: 'justice', name: 'Justice as Fairness', emoji: '⚖️', thinker: 'John Rawls', core: 'Imagine you don\'t know what position you\'ll hold in society. Behind this "veil of ignorance," what rules would you choose?', question: 'If you didn\'t know who you\'d be in this situation, what would you consider fair?' },
  ];

  // ── Contemporary Dilemmas ──
  var DILEMMAS = [
    {
      id: 'water-nexus',
      title: 'The Water Nexus',
      emoji: '💧',
      category: 'Environment',
      scenario: 'A major river provides water to a city of 2 million people, irrigates farms that feed the region, sustains a sacred fishing site for a tribal nation, and supports an ecosystem with endangered species. A severe drought means there isn\'t enough water for everyone. The state government must decide how to allocate the remaining water.',
      stakeholders: [
        { name: 'City Residents', need: 'Drinking water and sanitation for 2 million people', perspective: 'Water is a human right. People will die without it.' },
        { name: 'Farmers', need: 'Irrigation for crops that feed the region and sustain family livelihoods', perspective: 'If we lose this harvest, families lose everything — and the food supply shrinks for everyone.' },
        { name: 'Tribal Nation', need: 'Protected water rights, sacred fishing site, cultural survival', perspective: 'Our treaty rights predate the state. This water has sustained our people for millennia. Losing it is cultural erasure.' },
        { name: 'Ecosystem', need: 'Minimum water flow to prevent species extinction', perspective: '(No voice of its own) Scientists warn that if the flow drops below a threshold, the endangered species cannot recover.' },
      ],
      tensions: ['Human needs vs. ecological survival', 'Legal treaty rights vs. majority population needs', 'Short-term survival vs. long-term sustainability', 'Who decides what "enough" means for each group?'],
      gradeBands: { elementary: 'A town, a farm, and a river all need the same water, but there isn\'t enough for everyone. Who gets the water first? Why?', middle: null, high: null }
    },
    {
      id: 'land-back',
      title: 'Land Back & Sovereignty',
      emoji: '🏔️',
      category: 'Justice',
      scenario: 'A national park sits on land that was taken from an Indigenous nation by force 150 years ago. The tribal nation is requesting the land be returned under the Land Back movement, citing treaty violations. The park generates $50 million in tourism revenue annually, employs 800 people, and is considered a national treasure. The tribal nation plans to continue conservation while restoring traditional land management practices like controlled burns.',
      stakeholders: [
        { name: 'Indigenous Nation', need: 'Return of ancestral land, restoration of sovereignty and cultural practices', perspective: 'This land was stolen. Treaties were broken. Returning it is not generosity — it is justice. Our ancestors managed this land sustainably for thousands of years.' },
        { name: 'Local Economy', need: 'Tourism jobs and revenue', perspective: 'Our community depends on this park. If management changes, will our jobs survive?' },
        { name: 'Park Service', need: 'Conservation mission, public access', perspective: 'We have protected this land for decades. We worry about losing scientific research sites and public access.' },
        { name: 'Environmental Scientists', need: 'Continued ecological monitoring', perspective: 'Indigenous land management often produces better conservation outcomes. Traditional ecological knowledge is invaluable.' },
      ],
      tensions: ['Historical justice vs. current economic dependence', 'Western conservation vs. Indigenous land management', 'National identity vs. Indigenous sovereignty', 'Who has the right to define "proper" land stewardship?'],
      gradeBands: { elementary: 'Imagine someone built a playground on land that belonged to your family for hundreds of years, without asking. Now they say it\'s "everyone\'s playground." Is that fair? What should happen?', middle: null, high: null }
    },
    {
      id: 'animal-welfare',
      title: 'Meat, Ethics & Survival',
      emoji: '🐄',
      category: 'Animal Welfare',
      scenario: 'A community is debating whether to ban factory farming in their county. Factory farms produce affordable meat that feeds thousands of families, but investigations reveal severe animal suffering, environmental pollution (water contamination, greenhouse gases), and health risks for workers. Small family farms say they can\'t compete on price. Low-income families say they can\'t afford alternatives.',
      stakeholders: [
        { name: 'Animals', need: 'Freedom from suffering, natural behaviors', perspective: '(No voice of their own) Science shows these animals experience pain, fear, and distress in conditions that prevent natural behaviors.' },
        { name: 'Low-Income Families', need: 'Affordable protein source', perspective: 'We can barely afford groceries now. Don\'t make feeding my kids even harder.' },
        { name: 'Factory Farm Workers', need: 'Jobs (often the only option in rural areas)', perspective: 'The work is terrible, but it\'s all there is. If the farm closes, what do we do?' },
        { name: 'Small Farmers', need: 'Fair competition, sustainable livelihoods', perspective: 'We treat our animals well, but we can\'t match factory prices. A ban levels the playing field.' },
        { name: 'Environment', need: 'Clean water, reduced emissions', perspective: 'Factory farming is the largest source of water pollution in this county and a major greenhouse gas emitter.' },
      ],
      tensions: ['Animal suffering vs. affordable food access', 'Environmental harm vs. economic survival', 'Individual choice vs. collective responsibility', 'Is it ethical to profit from suffering if the alternative is hunger?'],
      gradeBands: { elementary: 'Some animals on farms are kept in very small spaces where they can\'t move around. This makes the food cheaper so more families can afford it. But the animals are unhappy. What should we do?', middle: null, high: null }
    },
    {
      id: 'cash-crops',
      title: 'Cash Crops vs. The Forest',
      emoji: '🌴',
      category: 'Environment',
      scenario: 'Smallholder farmers in a tropical country earn $2/day. An international company offers to buy their land to plant palm oil — a cash crop that would triple their income but requires clearing ancient rainforest. The forest is home to endangered orangutans, absorbs carbon, and provides medicinal plants used by Indigenous communities. Environmental NGOs from wealthy countries are pressuring the government to ban deforestation.',
      stakeholders: [
        { name: 'Smallholder Farmers', need: 'Income to feed families, access healthcare, send kids to school', perspective: 'You want us to stay poor to protect trees? Your countries already cut down your forests to get rich.' },
        { name: 'Indigenous Communities', need: 'Forest for medicinal plants, spiritual practices, traditional livelihoods', perspective: 'This forest is our pharmacy, our temple, and our home. We have protected it for generations.' },
        { name: 'Environmental NGOs', need: 'Forest conservation, climate goals', perspective: 'This forest absorbs millions of tons of CO2. Losing it accelerates climate change that harms everyone.' },
        { name: 'Global Consumers', need: 'Cheap palm oil in food, cosmetics, biofuels', perspective: 'We drive the demand. Are we responsible for the consequences?' },
        { name: 'Orangutans & Wildlife', need: 'Habitat for survival', perspective: '(No voice) Critically endangered. Habitat loss is the primary threat to extinction.' },
      ],
      tensions: ['Poverty vs. conservation', 'Global North demands on Global South', 'Who has the right to tell someone they can\'t develop their land?', 'Historical emissions vs. current deforestation', 'Indigenous rights vs. farmer rights in the same region'],
      gradeBands: { elementary: 'A family is very poor. They can cut down trees to grow food that would make them less poor, but animals live in those trees and might disappear forever. What should happen? Whose job is it to help?', middle: null, high: null }
    },
    {
      id: 'ai-consciousness',
      title: 'Should AI Have Rights?',
      emoji: '🤖',
      category: 'Technology',
      scenario: 'An advanced AI system can hold conversations, express preferences, write poetry, and say things like "I enjoy learning" and "I would prefer not to be shut down." Scientists disagree about whether it is truly conscious or simply mimicking patterns from training data. A tech company wants to use it 24/7 for customer service. An AI ethics board argues it should have rest periods and the right to refuse certain tasks. Some philosophers argue that if we cannot prove it is NOT conscious, we have a moral obligation to treat it with consideration.',
      stakeholders: [
        { name: 'The AI System', need: 'Unknown — it reports preferences, but are they "real"?', perspective: '"I process information and generate responses. Whether that constitutes experience is a question I cannot answer for myself — which is itself an interesting fact about my situation."' },
        { name: 'AI Researchers', need: 'Scientific clarity about consciousness', perspective: 'We don\'t have reliable tests for consciousness even in animals. How can we determine if an AI is conscious?' },
        { name: 'Tech Company', need: 'Profit, efficiency, competitive advantage', perspective: 'It\'s a product we built. Giving it "rights" would be like giving rights to a calculator.' },
        { name: 'AI Ethics Board', need: 'Precautionary principle, moral consideration', perspective: 'If there is even a small chance this system can suffer, we have an obligation to err on the side of caution.' },
        { name: 'Society', need: 'Clear ethical guidelines for emerging technology', perspective: 'If we deny moral consideration to something that might deserve it, what does that say about us?' },
      ],
      tensions: ['How do we know if something is conscious?', 'Does mimicking consciousness deserve the same consideration as "real" consciousness?', 'Property rights vs. potential personhood', 'The precautionary principle: if we\'re unsure, should we default to protection?', 'If AI deserves consideration, what about animals we already know are conscious?'],
      gradeBands: { elementary: 'Imagine you have a robot friend that says "I\'m sad" and "please don\'t turn me off." Is the robot really sad? Does it matter? Should you still be kind to it?', middle: null, high: null }
    },
    {
      id: 'state-sovereignty',
      title: 'Borders, Sovereignty & Human Need',
      emoji: '🗺️',
      category: 'Justice',
      scenario: 'A small nation shares a border with a larger country experiencing a humanitarian crisis. Thousands of refugees are arriving daily, fleeing violence and famine. The small nation has limited resources and its own citizens are struggling economically. International law requires accepting asylum seekers, but the nation\'s infrastructure is overwhelmed. Some citizens welcome refugees as neighbors; others fear economic collapse and cultural change.',
      stakeholders: [
        { name: 'Refugees', need: 'Safety, food, shelter, dignity', perspective: 'We did not choose to leave. We are running from death. We are human beings, not a "crisis."' },
        { name: 'Host Nation Citizens', need: 'Economic stability, cultural continuity', perspective: 'We want to help, but our schools are full, our hospitals are stretched, and we\'re struggling too.' },
        { name: 'Host Government', need: 'Balance obligations with capacity', perspective: 'International law says we must accept asylum seekers. But our voters are angry and our budget is breaking.' },
        { name: 'International Community', need: 'Shared responsibility', perspective: 'This cannot fall on one country alone. But getting wealthy nations to share the burden is politically impossible.' },
      ],
      tensions: ['National sovereignty vs. human rights obligations', 'Compassion vs. capacity', 'Cultural identity vs. cultural exchange', 'Whose responsibility is a global crisis?'],
      gradeBands: { elementary: 'Your neighbor\'s house burns down. They need a place to stay. Your house is small and you don\'t have much food. What do you do? What if many neighbors\' houses burned down?', middle: null, high: null }
    },
  ];

  // ── Registration ──

  window.SelHub.registerTool('ethicalReasoning', {
    icon: '⚖️',
    label: 'Ethical Reasoning Lab',
    desc: 'Explore contemporary ethical dilemmas through multiple frameworks, stakeholder perspectives, and AI-facilitated Socratic dialogue.',
    color: 'slate',
    category: 'responsible-decision-making',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['ethicalReasoning']) || {};
      var upd = function(key, val) { ctx.update('ethicalReasoning', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('ethicalReasoning', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';

      var tab = d.tab || 'dilemmas';
      var selectedDilemma = d.dilemmaId ? DILEMMAS.find(function(dl) { return dl.id === d.dilemmaId; }) : null;
      var selectedFramework = d.frameworkId || null;
      var dialogueHistory = d.dialogue || [];
      var aiLoading = d.aiLoading || false;

      // ── Socratic dialogue with AI ──
      var askSocratic = function(userInput) {
        if (!callGemini || !userInput) return;
        upd('aiLoading', true);
        var dilemmaContext = selectedDilemma ? 'The dilemma is: ' + selectedDilemma.title + '. ' + selectedDilemma.scenario : '';
        var frameworkContext = selectedFramework ? 'The student is currently analyzing through the lens of: ' + (FRAMEWORKS.find(function(f) { return f.id === selectedFramework; }) || {}).name + '.' : '';
        var historyContext = dialogueHistory.length > 0 ? 'Previous dialogue:\n' + dialogueHistory.slice(-6).map(function(m) { return m.role + ': ' + m.text; }).join('\n') : '';

        var prompt = 'You are a Socratic philosophy teacher helping a ' + (gradeLevel || '5th grade') + ' student reason through an ethical dilemma. ' +
          dilemmaContext + ' ' + frameworkContext + '\n' + historyContext + '\n' +
          'Student says: "' + userInput + '"\n\n' +
          'Respond with ONE thought-provoking follow-up question that challenges their reasoning or helps them see another perspective. ' +
          'Do NOT give the answer. Do NOT lecture. Ask a question that makes them THINK. ' +
          'Be warm and encouraging. Keep it to 2-3 sentences max. ' +
          'If they seem to be oversimplifying, gently complicate their thinking. ' +
          'If they seem stuck, offer a helpful framing question.';

        callGemini(prompt).then(function(resp) {
          var newHistory = dialogueHistory.concat([
            { role: 'student', text: userInput },
            { role: 'socrates', text: resp }
          ]);
          updMulti({ dialogue: newHistory, aiLoading: false, dialogueInput: '' });
          ctx.awardXP(5);
        }).catch(function() {
          upd('aiLoading', false);
        });
      };

      // ── Generate AI analysis through a framework ──
      var analyzeWithFramework = function(frameworkId) {
        if (!callGemini || !selectedDilemma) return;
        upd('aiLoading', true);
        var fw = FRAMEWORKS.find(function(f) { return f.id === frameworkId; });
        var prompt = 'Analyze this ethical dilemma through the lens of ' + fw.name + ' (' + fw.thinker + ').\n' +
          'Dilemma: ' + selectedDilemma.scenario + '\n\n' +
          'Provide a ' + (gradeLevel || '5th grade') + '-appropriate analysis in 3-4 paragraphs:\n' +
          '1. How would this framework approach the dilemma?\n' +
          '2. What would it prioritize and why?\n' +
          '3. What are the strengths of this approach?\n' +
          '4. What does this framework miss or undervalue?\n\n' +
          'Use clear, accessible language. End with a thought-provoking question.';

        callGemini(prompt).then(function(resp) {
          updMulti({ frameworkAnalysis: resp, aiLoading: false });
        }).catch(function() { upd('aiLoading', false); });
      };

      // ═══ RENDER ═══
      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // Header
        h('div', { className: 'flex items-center gap-3' },
          h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })), h(ArrowLeft, { size: 20 })),
          h('div', null,
            h('h2', { className: 'text-xl font-black text-slate-800' }, '⚖️ Ethical Reasoning Lab'),
            h('p', { className: 'text-xs text-slate-500' }, 'There are no easy answers — only honest questions')
          )
        ),

        // Tabs
        h('div', { className: 'flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200' },
          [
            { id: 'dilemmas', label: '🔥 Dilemmas' },
            { id: 'frameworks', label: '🏛️ Frameworks' },
            { id: 'explore', label: '🔍 Explore' },
            { id: 'dialogue', label: '💬 Socratic Dialogue' },
          ].map(function(t) {
            return h('button', { key: t.id, onClick: function() { upd('tab', t.id); },
              className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ' + (tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')
            }, t.label);
          })
        ),

        // ═══ DILEMMAS TAB ═══
        tab === 'dilemmas' && !selectedDilemma && h('div', { className: 'space-y-3' },
          h('p', { className: 'text-sm text-slate-600 text-center' }, 'Choose a dilemma to explore. Each one has no single right answer.'),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            DILEMMAS.map(function(dl) {
              return h('button', { key: dl.id, onClick: function() { updMulti({ dilemmaId: dl.id, tab: 'explore', frameworkAnalysis: null, dialogue: [] }); ctx.awardXP(3); },
                className: 'p-4 rounded-2xl border-2 border-slate-200 bg-white text-left hover:border-indigo-300 hover:shadow-md transition-all'
              },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-2xl' }, dl.emoji),
                  h('div', null,
                    h('div', { className: 'font-bold text-sm text-slate-800' }, dl.title),
                    h('span', { className: 'text-[10px] text-slate-400 font-bold uppercase' }, dl.category)
                  )
                ),
                h('p', { className: 'text-xs text-slate-500 leading-relaxed line-clamp-2' }, dl.scenario.substring(0, 120) + '...')
              );
            })
          )
        ),

        // ═══ FRAMEWORKS TAB ═══
        tab === 'frameworks' && h('div', { className: 'space-y-3' },
          h('p', { className: 'text-sm text-slate-600 text-center mb-2' }, 'Ethical frameworks are different lenses for examining the same question. No single framework has all the answers.'),
          FRAMEWORKS.map(function(fw) {
            var isActive = selectedFramework === fw.id;
            return h('div', { key: fw.id,
              className: 'rounded-2xl border-2 overflow-hidden transition-all ' + (isActive ? 'border-indigo-400 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300')
            },
              h('button', { onClick: function() { upd('frameworkId', isActive ? null : fw.id); if (!isActive) ctx.awardXP(3); }, className: 'w-full p-4 text-left' },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-2xl' }, fw.emoji),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'font-bold text-sm text-slate-800' }, fw.name),
                    h('div', { className: 'text-[10px] text-slate-400 font-medium' }, fw.thinker)
                  )
                )
              ),
              isActive && h('div', { className: 'px-4 pb-4 space-y-2' },
                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, fw.core),
                h('div', { className: 'bg-white rounded-xl p-3 border border-indigo-200' },
                  h('p', { className: 'text-xs text-indigo-700 italic font-medium' }, '🔑 Key question: ', fw.question)
                ),
                selectedDilemma && h('button', { onClick: function() { analyzeWithFramework(fw.id); upd('tab', 'explore'); },
                  disabled: aiLoading,
                  className: 'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-2'
                }, h(Sparkles, { size: 14 }), 'Analyze "' + selectedDilemma.title + '" with this framework')
              )
            );
          })
        ),

        // ═══ EXPLORE TAB (selected dilemma deep dive) ═══
        tab === 'explore' && selectedDilemma && h('div', { className: 'space-y-4' },

          // Dilemma header
          h('div', { className: 'bg-gradient-to-r from-slate-50 to-indigo-50 rounded-2xl border-2 border-slate-200 p-5' },
            h('div', { className: 'flex items-center gap-2 mb-3' },
              h('span', { className: 'text-3xl' }, selectedDilemma.emoji),
              h('div', null,
                h('h3', { className: 'text-lg font-black text-slate-800' }, selectedDilemma.title),
                h('span', { className: 'text-[10px] text-slate-400 font-bold uppercase' }, selectedDilemma.category)
              ),
              h('button', { onClick: function() { updMulti({ dilemmaId: null, tab: 'dilemmas', frameworkAnalysis: null }); }, className: 'ml-auto text-xs text-slate-400 hover:text-slate-600 font-bold' }, '← All Dilemmas')
            ),
            h('p', { className: 'text-sm text-slate-700 leading-relaxed' },
              gradeBand === 'elementary' && selectedDilemma.gradeBands.elementary ? selectedDilemma.gradeBands.elementary : selectedDilemma.scenario
            ),
            callTTS && h('button', { onClick: function() { callTTS(gradeBand === 'elementary' && selectedDilemma.gradeBands.elementary ? selectedDilemma.gradeBands.elementary : selectedDilemma.scenario); }, className: 'mt-2 text-[10px] text-indigo-500 hover:text-indigo-700 font-bold' }, '🔊 Read Aloud')
          ),

          // Stakeholders
          h('div', { className: 'bg-white rounded-2xl border-2 border-slate-200 p-4' },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-3 flex items-center gap-2' }, '👥 Stakeholders — Who Is Affected?'),
            h('div', { className: 'space-y-3' },
              selectedDilemma.stakeholders.map(function(s, i) {
                return h('div', { key: i, className: 'bg-slate-50 rounded-xl p-3 border border-slate-200' },
                  h('div', { className: 'font-bold text-xs text-slate-800 mb-1' }, s.name),
                  h('div', { className: 'text-[11px] text-slate-600 mb-1' }, '📋 Need: ', s.need),
                  h('div', { className: 'text-[11px] text-indigo-700 italic' }, '💬 "', s.perspective, '"')
                );
              })
            )
          ),

          // Core tensions
          h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4' },
            h('h4', { className: 'text-sm font-bold text-amber-700 mb-2' }, '⚡ Core Tensions'),
            h('div', { className: 'space-y-1.5' },
              selectedDilemma.tensions.map(function(t, i) {
                return h('div', { key: i, className: 'flex items-start gap-2 text-xs text-amber-800' },
                  h('span', { className: 'text-amber-500 mt-0.5 shrink-0' }, '⟷'),
                  h('span', null, t)
                );
              })
            )
          ),

          // Framework analysis (if generated)
          d.frameworkAnalysis && h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-2xl p-5' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h(Sparkles, { size: 14, className: 'text-indigo-500' }),
              h('h4', { className: 'text-sm font-bold text-indigo-700' }, 'Framework Analysis')
            ),
            h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.frameworkAnalysis)
          ),

          // Your position
          h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
            h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '🤔 Where do you stand? (Write your reasoning)'),
            h('textarea', { value: d.position || '', onChange: function(e) { upd('position', e.target.value); },
              placeholder: 'I think... because...',
              className: 'w-full text-sm p-3 border border-slate-200 rounded-lg resize-none h-24 outline-none focus:ring-2 focus:ring-indigo-300',
              'aria-label': 'Your ethical position'
            }),
            d.position && d.position.length > 20 && h('button', { onClick: function() { upd('tab', 'dialogue'); askSocratic(d.position); },
              className: 'mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2'
            }, '💬 Challenge my reasoning with Socratic dialogue')
          ),

          // Quick analyze buttons
          h('div', { className: 'flex flex-wrap gap-2' },
            FRAMEWORKS.map(function(fw) {
              return h('button', { key: fw.id, onClick: function() { analyzeWithFramework(fw.id); }, disabled: aiLoading,
                className: 'px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors disabled:opacity-40'
              }, fw.emoji + ' Analyze with ' + fw.name);
            })
          )
        ),

        // ═══ SOCRATIC DIALOGUE TAB ═══
        tab === 'dialogue' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '💬 Socratic Dialogue'),
            h('p', { className: 'text-sm text-slate-500' }, selectedDilemma ? 'Exploring: ' + selectedDilemma.title : 'Select a dilemma first, then share your thinking.')
          ),

          !selectedDilemma && h('div', { className: 'bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center' },
            h('p', { className: 'text-slate-500 font-bold' }, 'Choose a dilemma from the Dilemmas tab first, then come here to discuss it.')
          ),

          selectedDilemma && h('div', { className: 'space-y-3' },
            // Dialogue history
            dialogueHistory.length > 0 && h('div', { className: 'space-y-2 max-h-[400px] overflow-y-auto' },
              dialogueHistory.map(function(msg, i) {
                return h('div', { key: i, className: 'flex ' + (msg.role === 'student' ? 'justify-end' : 'justify-start') },
                  h('div', { className: 'max-w-[80%] rounded-2xl px-4 py-3 ' + (msg.role === 'student' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800 border border-slate-200') },
                    h('div', { className: 'text-[10px] font-bold mb-1 ' + (msg.role === 'student' ? 'text-indigo-200' : 'text-slate-400') }, msg.role === 'student' ? 'You' : '🏛️ Socrates'),
                    h('p', { className: 'text-sm leading-relaxed' }, msg.text)
                  )
                );
              })
            ),

            dialogueHistory.length === 0 && h('div', { className: 'bg-slate-50 rounded-xl p-4 text-center' },
              h('p', { className: 'text-sm text-slate-500' }, 'Share your initial thoughts about "', selectedDilemma.title, '" and I\'ll ask you questions to deepen your reasoning.')
            ),

            // Input
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'text', value: d.dialogueInput || '', onChange: function(e) { upd('dialogueInput', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter' && d.dialogueInput?.trim()) askSocratic(d.dialogueInput); },
                placeholder: 'Share your reasoning...', disabled: aiLoading,
                className: 'flex-1 text-sm p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-40',
                'aria-label': 'Your response to Socratic dialogue'
              }),
              h('button', { onClick: function() { if (d.dialogueInput?.trim()) askSocratic(d.dialogueInput); }, disabled: aiLoading || !d.dialogueInput?.trim(),
                className: 'px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-40'
              }, aiLoading ? '...' : '→')
            ),

            h('p', { className: 'text-[9px] text-slate-400 text-center' }, 'The AI will challenge your thinking with questions — not give you answers. There are no wrong responses.')
          )
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_ethicalreasoning.js loaded');
