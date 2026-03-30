// ═══════════════════════════════════════════
// sel_tool_cultureexplorer.js — Culture Explorer
// AI-powered deep dives into world cultures with
// Imagen illustrations, TTS pronunciations, and
// respectful engagement with cultural diversity
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

  var REGIONS = [
    { id: 'africa', label: 'Africa', emoji: '🌍', cultures: ['Maasai (Kenya/Tanzania)', 'Yoruba (Nigeria)', 'Zulu (South Africa)', 'Amazigh/Berber (North Africa)', 'Ashanti (Ghana)', 'Hausa (West Africa)', 'Swahili Coast', 'Ethiopian Highlands', 'San/Bushmen (Southern Africa)', 'Wolof (Senegal)'] },
    { id: 'asia', label: 'Asia', emoji: '🌏', cultures: ['Japanese', 'Korean', 'Han Chinese', 'Tamil (South India/Sri Lanka)', 'Balinese (Indonesia)', 'Hmong (Southeast Asia)', 'Mongolian', 'Tibetan', 'Filipino/Tagalog', 'Kurdish', 'Bengali', 'Vietnamese', 'Thai', 'Punjabi'] },
    { id: 'americas-indigenous', label: 'Indigenous Americas', emoji: '🦅', cultures: ['Navajo (Diné)', 'Lakota/Sioux', 'Cherokee', 'Maya (Mexico/Guatemala)', 'Quechua (Andes)', 'Inuit (Arctic)', 'Haudenosaunee (Iroquois)', 'Mapuche (Chile/Argentina)', 'Ojibwe/Anishinaabe', 'Haida (Pacific Northwest)', 'Guaraní (Paraguay)', 'Taíno (Caribbean)'] },
    { id: 'europe', label: 'Europe', emoji: '🏰', cultures: ['Sámi (Scandinavia)', 'Basque (Spain/France)', 'Romani', 'Irish/Celtic', 'Greek', 'Georgian', 'Sardinian', 'Slavic traditions', 'Norse/Viking heritage', 'Scottish Gaelic'] },
    { id: 'oceania', label: 'Oceania & Pacific', emoji: '🌊', cultures: ['Māori (New Zealand)', 'Aboriginal Australian', 'Hawaiian (Kanaka Maoli)', 'Samoan', 'Tongan', 'Fijian', 'Papua New Guinean', 'Torres Strait Islander'] },
    { id: 'middle-east', label: 'Middle East & Central Asia', emoji: '🕌', cultures: ['Persian/Iranian', 'Bedouin', 'Armenian', 'Afghan (Pashtun)', 'Uzbek', 'Druze', 'Assyrian', 'Yemeni'] },
    { id: 'diaspora', label: 'Diasporic Cultures', emoji: '🌐', cultures: ['African American', 'Afro-Caribbean', 'South Asian diaspora', 'Chinese diaspora', 'Jewish diaspora', 'Latinx', 'Deaf culture (ASL)', 'Cajun/Creole'] },
  ];

  var EXPLORE_ASPECTS = [
    { id: 'traditions', label: 'Traditions & Ceremonies', emoji: '🎭', prompt: 'important traditions, ceremonies, and celebrations' },
    { id: 'food', label: 'Food & Cuisine', emoji: '🍲', prompt: 'traditional foods, cooking methods, and the cultural significance of meals' },
    { id: 'art', label: 'Art & Music', emoji: '🎨', prompt: 'traditional art forms, music, dance, and creative expression' },
    { id: 'values', label: 'Values & Philosophy', emoji: '💡', prompt: 'core values, philosophical beliefs, and worldview' },
    { id: 'language', label: 'Language & Stories', emoji: '📖', prompt: 'language, oral traditions, proverbs, and storytelling' },
    { id: 'family', label: 'Family & Community', emoji: '👨‍👩‍👧‍👦', prompt: 'family structures, community relationships, and social bonds' },
    { id: 'nature', label: 'Relationship with Nature', emoji: '🌿', prompt: 'relationship with the natural world, land, animals, and seasons' },
    { id: 'resilience', label: 'Resilience & History', emoji: '💪', prompt: 'how this culture has survived challenges, adapted, and maintained identity through history' },
  ];

  // ── Registration ──

  window.SelHub.registerTool('cultureExplorer', {
    icon: '🌍',
    label: 'Culture Explorer',
    desc: 'Take AI-powered deep dives into world cultures. Discover traditions, art, values, and stories with illustrations and audio.',
    color: 'cyan',
    category: 'social-awareness',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['cultureExplorer']) || {};
      var upd = function(key, val) { ctx.update('cultureExplorer', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('cultureExplorer', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';

      var tab = d.tab || 'choose';
      var selectedCulture = d.culture || null;
      var selectedAspect = d.aspect || null;
      var cultureData = d.cultureData || null;
      var cultureImage = d.cultureImage || null;
      var aiLoading = d.aiLoading || false;
      var imageLoading = d.imageLoading || false;
      var exploredCultures = d.explored || [];
      var customCulture = d.customCulture || '';
      var greeting = d.greeting || null;
      var questionsAsked = d.questionsAsked || 0;

      // ── Explore a culture + aspect ──
      var exploreCulture = function(culture, aspect) {
        if (!callGemini) return;
        updMulti({ aiLoading: true, cultureData: null, cultureImage: null, greeting: null });

        var aspectInfo = EXPLORE_ASPECTS.find(function(a) { return a.id === aspect; }) || EXPLORE_ASPECTS[0];

        var prompt = 'You are a knowledgeable, respectful cultural educator teaching a ' + (gradeLevel || '5th grade') + ' student about ' + culture + '.\n\n' +
          'Focus on: ' + aspectInfo.prompt + '.\n\n' +
          'IMPORTANT GUIDELINES:\n' +
          '- Show diversity WITHIN this culture — avoid monolithic descriptions\n' +
          '- Distinguish between historical and contemporary practices\n' +
          '- Note when practices vary by region, family, or individual\n' +
          '- Use respectful, accurate terminology (use names people call themselves)\n' +
          '- Include voices and perspectives from people within this culture when possible\n' +
          '- Acknowledge if you are simplifying complex realities\n' +
          '- If the culture has experienced oppression, acknowledge it honestly without centering the oppressor\n\n' +
          'Return ONLY JSON:\n' +
          '{\n' +
          '  "title": "Culture Name — Aspect Title",\n' +
          '  "greeting": "A greeting in the culture\'s primary language with pronunciation guide",\n' +
          '  "overview": "2-3 paragraph overview of this aspect of the culture",\n' +
          '  "keyFacts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4", "Fact 5"],\n' +
          '  "voices": "A quote or saying from someone within this culture (attributed)",\n' +
          '  "reflection": "A thoughtful question connecting this culture to the student\'s own experience",\n' +
          '  "imagePrompt": "A respectful, detailed image prompt depicting a beautiful scene related to this cultural aspect. NO text, NO stereotypes, NO caricatures. Focus on art, landscape, architecture, or daily life.",\n' +
          '  "learnMore": "One book, film, or resource by someone from this culture that the student could explore"\n' +
          '}';

        callGemini(prompt, true).then(function(resp) {
          try {
            var cleaned = resp.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var data = JSON.parse(cleaned);
            var newExplored = exploredCultures.indexOf(culture) < 0 ? exploredCultures.concat([culture]) : exploredCultures;
            updMulti({ cultureData: data, aiLoading: false, explored: newExplored, greeting: data.greeting, questionsAsked: questionsAsked + 1 });
            ctx.awardXP(8);

            // Generate illustration
            if (callImagen && data.imagePrompt) {
              upd('imageLoading', true);
              var safePrompt = data.imagePrompt + ' Respectful, accurate, beautiful illustration. NO text, NO labels, NO stereotypes. Fine art quality, warm lighting.';
              callImagen(safePrompt, 400, 0.8).then(function(img) {
                updMulti({ cultureImage: img, imageLoading: false });
              }).catch(function() { upd('imageLoading', false); });
            }
          } catch(e) {
            console.warn('Culture data parse failed', e);
            upd('aiLoading', false);
            addToast('Could not load culture data — try again', 'error');
          }
        }).catch(function() { upd('aiLoading', false); });
      };

      // ── Ask a follow-up question ──
      var askFollowUp = function(question) {
        if (!callGemini || !question) return;
        upd('aiLoading', true);
        var prompt = 'A ' + (gradeLevel || '5th grade') + ' student is learning about ' + selectedCulture + '. They ask: "' + question + '"\n\n' +
          'Answer respectfully and accurately in 2-3 paragraphs. Acknowledge complexity. ' +
          'If the question touches on sensitive topics, address them honestly and age-appropriately. ' +
          'End with a follow-up question to deepen their thinking.';
        callGemini(prompt).then(function(resp) {
          updMulti({ followUpAnswer: resp, aiLoading: false, questionsAsked: questionsAsked + 1 });
          ctx.awardXP(5);
        }).catch(function() { upd('aiLoading', false); });
      };

      // ═══ RENDER ═══
      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // Header
        h('div', { className: 'flex items-center gap-3' },
          h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-cyan-100 text-cyan-600 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })), h(ArrowLeft, { size: 20 })),
          h('div', { className: 'flex-1' },
            h('h2', { className: 'text-xl font-black text-slate-800' }, '🌍 Culture Explorer'),
            h('p', { className: 'text-xs text-slate-500' }, 'Every culture holds wisdom. What will you discover?')
          ),
          exploredCultures.length > 0 && h('span', { className: 'bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold' }, exploredCultures.length + ' explored')
        ),

        // Tabs
        h('div', { className: 'flex gap-1 bg-cyan-50 rounded-xl p-1 border border-cyan-200' },
          [{ id: 'choose', label: '🗺️ Choose Culture' }, { id: 'explore', label: '🔍 Explore' }, { id: 'journal', label: '📝 Journal' }].map(function(t) {
            return h('button', { key: t.id, onClick: function() { upd('tab', t.id); },
              className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ' + (tab === t.id ? 'bg-white text-cyan-700 shadow-sm' : 'text-cyan-600/60 hover:text-cyan-700')
            }, t.label);
          })
        ),

        // ═══ CHOOSE CULTURE ═══
        tab === 'choose' && h('div', { className: 'space-y-4' },

          // Important framing
          h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 text-center' },
            h('p', { className: 'text-xs text-amber-800 leading-relaxed' },
              '🌱 Remember: Every culture is complex and diverse. What you learn here is an introduction, not a complete picture. ',
              'People within any culture are individuals with their own experiences and perspectives.'
            )
          ),

          // Custom culture search
          h('div', { className: 'bg-white rounded-xl border border-cyan-200 p-4' },
            h('label', { className: 'text-xs font-bold text-cyan-700 block mb-1' }, '🔍 Search any culture or community:'),
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'text', value: customCulture, onChange: function(e) { upd('customCulture', e.target.value); },
                placeholder: 'e.g., Hmong, Somali diaspora, Deaf culture, Cajun...',
                className: 'flex-1 text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-300',
                onKeyDown: function(e) { if (e.key === 'Enter' && customCulture.trim()) { updMulti({ culture: customCulture.trim(), tab: 'explore', aspect: 'traditions', cultureData: null, cultureImage: null }); exploreCulture(customCulture.trim(), 'traditions'); } },
                'aria-label': 'Search for a culture'
              }),
              h('button', { onClick: function() { if (customCulture.trim()) { updMulti({ culture: customCulture.trim(), tab: 'explore', aspect: 'traditions', cultureData: null, cultureImage: null }); exploreCulture(customCulture.trim(), 'traditions'); } },
                disabled: !customCulture.trim(),
                className: 'px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 disabled:opacity-40 transition-colors'
              }, 'Explore')
            )
          ),

          // Region grid
          REGIONS.map(function(region) {
            return h('div', { key: region.id, className: 'bg-white rounded-2xl border border-slate-200 overflow-hidden' },
              h('div', { className: 'px-4 py-3 bg-gradient-to-r from-cyan-50 to-teal-50 border-b border-slate-200' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, region.emoji, ' ', region.label)
              ),
              h('div', { className: 'p-3 flex flex-wrap gap-2' },
                region.cultures.map(function(culture) {
                  var isExplored = exploredCultures.indexOf(culture) >= 0;
                  return h('button', { key: culture,
                    onClick: function() { updMulti({ culture: culture, tab: 'explore', aspect: 'traditions', cultureData: null, cultureImage: null }); exploreCulture(culture, 'traditions'); },
                    className: 'px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 ' +
                      (isExplored ? 'bg-cyan-100 border-cyan-300 text-cyan-700' : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300 hover:bg-cyan-50')
                  }, (isExplored ? '✓ ' : '') + culture);
                })
              )
            );
          })
        ),

        // ═══ EXPLORE ═══
        tab === 'explore' && h('div', { className: 'space-y-4' },

          // Culture header + back
          h('div', { className: 'flex items-center gap-2' },
            h('button', { onClick: function() { upd('tab', 'choose'); }, className: 'text-xs text-cyan-500 hover:text-cyan-700 font-bold' }, '← All Cultures'),
            h('h3', { className: 'text-lg font-black text-slate-800' }, selectedCulture || 'Select a culture')
          ),

          // Aspect selector
          h('div', { className: 'flex flex-wrap gap-2' },
            EXPLORE_ASPECTS.map(function(aspect) {
              return h('button', { key: aspect.id,
                onClick: function() { updMulti({ aspect: aspect.id, cultureData: null, cultureImage: null, followUpAnswer: null }); exploreCulture(selectedCulture, aspect.id); },
                className: 'px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ' +
                  (selectedAspect === aspect.id ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300')
              }, aspect.emoji + ' ' + aspect.label);
            })
          ),

          // Loading
          aiLoading && !cultureData && h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-2xl p-12 text-center' },
            h('div', { className: 'text-4xl mb-3 animate-pulse' }, '🌍'),
            h('p', { className: 'text-cyan-700 font-bold' }, 'Discovering ' + selectedCulture + '...')
          ),

          // Culture data display
          cultureData && h('div', { className: 'space-y-4' },

            // Greeting
            greeting && h('div', { className: 'bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl border border-cyan-200 p-4 text-center' },
              h('div', { className: 'text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1' }, 'Greeting'),
              h('p', { className: 'text-lg font-black text-slate-800' }, greeting),
              callTTS && h('button', { onClick: function() { callTTS(greeting); }, className: 'mt-1 text-[10px] text-cyan-500 hover:text-cyan-700 font-bold' }, '🔊 Hear pronunciation')
            ),

            // Image + Overview
            h('div', { className: 'bg-white rounded-2xl border-2 border-cyan-200 overflow-hidden' },
              (cultureImage || imageLoading) && h('div', { className: 'w-full' },
                imageLoading ? h('div', { className: 'w-full h-48 bg-cyan-50 flex items-center justify-center' }, h('span', { className: 'text-2xl animate-pulse' }, '🎨'))
                : cultureImage && h('img', { src: cultureImage, alt: 'Illustration of ' + selectedCulture, className: 'w-full h-48 object-cover' })
              ),
              h('div', { className: 'p-5' },
                h('h4', { className: 'text-sm font-bold text-slate-800 mb-2' }, cultureData.title || selectedCulture),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, cultureData.overview)
              )
            ),

            // Key Facts
            cultureData.keyFacts && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
              h('h4', { className: 'text-xs font-bold text-slate-600 uppercase tracking-widest mb-2' }, '✨ Key Facts'),
              h('div', { className: 'space-y-2' },
                cultureData.keyFacts.map(function(fact, i) {
                  return h('div', { key: i, className: 'flex items-start gap-2 text-xs text-slate-700' },
                    h('span', { className: 'text-cyan-500 font-bold mt-0.5 shrink-0' }, '•'),
                    h('span', { className: 'leading-relaxed' }, fact)
                  );
                })
              )
            ),

            // Voice from the culture
            cultureData.voices && h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4' },
              h('p', { className: 'text-sm text-amber-800 italic leading-relaxed' }, '💬 ', cultureData.voices),
              callTTS && h('button', { onClick: function() { callTTS(cultureData.voices); }, className: 'mt-1 text-[10px] text-amber-500 hover:text-amber-700 font-bold' }, '🔊 Hear this')
            ),

            // Reflection
            cultureData.reflection && h('div', { className: 'bg-teal-50 border border-teal-200 rounded-xl p-4' },
              h('p', { className: 'text-xs font-bold text-teal-600 mb-1' }, '🤔 Reflect'),
              h('p', { className: 'text-sm text-teal-800 italic' }, cultureData.reflection),
              h('textarea', { value: d.reflectionText || '', onChange: function(e) { upd('reflectionText', e.target.value); },
                placeholder: 'Write your reflection...', className: 'mt-2 w-full text-sm p-3 border border-teal-200 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-teal-300', 'aria-label': 'Culture reflection' })
            ),

            // Learn more
            cultureData.learnMore && h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-3' },
              h('p', { className: 'text-xs text-indigo-700' }, '📚 Learn more: ', h('strong', null, cultureData.learnMore))
            ),

            // Follow-up question
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '❓ Ask a follow-up question:'),
              h('div', { className: 'flex gap-2' },
                h('input', { type: 'text', value: d.followUpQ || '', onChange: function(e) { upd('followUpQ', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && d.followUpQ?.trim()) { askFollowUp(d.followUpQ); upd('followUpQ', ''); } },
                  placeholder: 'What else would you like to know?',
                  className: 'flex-1 text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-300',
                  'aria-label': 'Follow-up question'
                }),
                h('button', { onClick: function() { if (d.followUpQ?.trim()) { askFollowUp(d.followUpQ); upd('followUpQ', ''); } },
                  disabled: aiLoading, className: 'px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 disabled:opacity-40 transition-colors'
                }, aiLoading ? '...' : 'Ask')
              )
            ),

            // Follow-up answer
            d.followUpAnswer && h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-4' },
              h('div', { className: 'flex items-start gap-2' },
                h(Sparkles, { size: 14, className: 'text-cyan-500 mt-0.5 shrink-0' }),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.followUpAnswer)
              )
            ),

            // Regenerate image
            callImagen && h('button', { onClick: function() {
              upd('imageLoading', true);
              var newPrompt = 'Beautiful illustration representing ' + selectedCulture + ' culture, ' + (EXPLORE_ASPECTS.find(function(a) { return a.id === selectedAspect; }) || {}).label + '. Respectful, accurate, fine art quality, warm lighting. NO text, NO stereotypes.';
              callImagen(newPrompt, 400, 0.8).then(function(img) { updMulti({ cultureImage: img, imageLoading: false }); }).catch(function() { upd('imageLoading', false); });
            }, disabled: imageLoading, className: 'text-[10px] text-cyan-500 hover:text-cyan-700 font-bold disabled:opacity-40' }, imageLoading ? '🎨 Generating...' : '🎨 Generate new illustration')
          )
        ),

        // ═══ JOURNAL ═══
        tab === 'journal' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '📝 Culture Journal'),
            h('p', { className: 'text-sm text-slate-500' }, 'Record what you have learned and what it means to you')
          ),

          // Stats
          h('div', { className: 'grid grid-cols-3 gap-3' },
            h('div', { className: 'bg-cyan-50 rounded-xl border border-cyan-200 p-3 text-center' },
              h('div', { className: 'text-2xl font-black text-cyan-600' }, exploredCultures.length),
              h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'Cultures Explored')
            ),
            h('div', { className: 'bg-teal-50 rounded-xl border border-teal-200 p-3 text-center' },
              h('div', { className: 'text-2xl font-black text-teal-600' }, questionsAsked),
              h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'Questions Asked')
            ),
            h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3 text-center' },
              h('div', { className: 'text-2xl font-black text-amber-600' }, exploredCultures.length >= 10 ? '🌟' : exploredCultures.length >= 5 ? '⭐' : '📖'),
              h('div', { className: 'text-[10px] text-slate-500 font-bold' }, exploredCultures.length >= 10 ? 'Global Citizen' : exploredCultures.length >= 5 ? 'World Learner' : 'Explorer')
            )
          ),

          // Explored cultures list
          exploredCultures.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
            h('h4', { className: 'text-xs font-bold text-slate-600 mb-2' }, 'Cultures You\'ve Explored:'),
            h('div', { className: 'flex flex-wrap gap-2' },
              exploredCultures.map(function(c) {
                return h('button', { key: c, onClick: function() { updMulti({ culture: c, tab: 'explore', aspect: 'traditions', cultureData: null, cultureImage: null }); exploreCulture(c, 'traditions'); },
                  className: 'px-3 py-1.5 bg-cyan-100 border border-cyan-300 rounded-full text-xs font-bold text-cyan-700 hover:bg-cyan-200 transition-colors'
                }, '✓ ' + c);
              })
            )
          ),

          // Big reflection
          h('div', { className: 'bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl border border-cyan-200 p-5' },
            h('h4', { className: 'text-sm font-bold text-cyan-700 mb-2' }, '🌍 What have you learned about the world — and about yourself?'),
            h('textarea', { value: d.journalEntry || '', onChange: function(e) { upd('journalEntry', e.target.value); },
              placeholder: 'What surprised you? What connections did you find between cultures? How does learning about others change how you see yourself?',
              className: 'w-full text-sm p-3 border border-cyan-200 rounded-lg resize-none h-32 outline-none focus:ring-2 focus:ring-cyan-300', 'aria-label': 'Culture journal entry'
            }),
            d.journalEntry && d.journalEntry.length > 30 && h('button', {
              onClick: function() { ctx.awardXP(10); addToast('Journal saved! 🌍', 'success'); ctx.celebrate(); },
              className: 'mt-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-colors'
            }, '💛 Save Journal Entry')
          ),

          // Closing thought
          h('div', { className: 'bg-slate-50 border border-slate-200 rounded-xl p-4 text-center' },
            h('p', { className: 'text-sm text-slate-600 italic leading-relaxed' },
              '"The beauty of the world lies in the diversity of its people." — Unknown'
            ),
            h('p', { className: 'text-[10px] text-slate-400 mt-1' },
              'Every culture on this list represents millions of unique individuals. Learning about cultures is a beginning, not an end.'
            )
          )
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_cultureexplorer.js loaded');
