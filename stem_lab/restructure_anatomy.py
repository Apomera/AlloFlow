import os

# Paths
source_path = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab\stem_tool_anatomy.js"

with open(source_path, "r", encoding="utf-8") as f:
    content = f.read()

# We want to replace the conditional tab section with the new global layout
# Let's locate the start of AI Tutor Tab: "// ── AI Tutor Tab ──"
ai_tutor_marker = "          // ── AI Tutor Tab ──"
ai_tutor_index = content.find(ai_tutor_marker)
if ai_tutor_index == -1:
    print("Error: Could not find AI Tutor Tab marker")
    exit(1)

# Let's locate the end of the return block, which ends with "          ) : null\n\n        );"
# We look for:
# "          ) : null\n\n        );"
end_marker = "          ) : null\n\n        );"
end_index = content.find(end_marker, ai_tutor_index)
if end_index == -1:
    print("Error: Could not find end marker")
    exit(1)

# The section to replace starts at ai_tutor_index and ends at end_index + len(end_marker)
target_chunk = content[ai_tutor_index:end_index + len(end_marker)]

# replacement is a raw string to avoid surrogate encoding issues in Python
replacement = r"""          // ── System tabs (Always visible) ──
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(SYSTEMS).map(function(key) {
              var s = SYSTEMS[key];
              return h('button', { key: key,
                onClick: function() {
                  upd('system', key); upd('selectedStructure', null); upd('quizMode', false); upd('search', '');
                  playSound('systemSelect');
                },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (sysKey === key ? 'text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-400'),
                style: sysKey === key ? { background: s.accent } : {}
              }, s.icon + ' ' + s.name);
            })
          ),

          // ── Fun fact banner (Always visible) ──
          currentFact ? h('div', { className: 'mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2' },
            h('span', { className: 'text-base flex-shrink-0' }, '\uD83D\uDCA1'),
            h('div', { className: 'flex-1' },
              h('span', { className: 'text-[11px] font-bold text-amber-700 uppercase' }, 'Did you know?'),
              h('p', { className: 'text-xs text-amber-900 leading-relaxed' }, currentFact)
            ),
            h('button', { 'aria-label': 'Next',
              onClick: function() { upd('_factIdx', (factIdx + 1) % sysFacts.length); playSound('funFact'); },
              className: 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-all flex-shrink-0'
            }, 'Next \u2192')
          ) : null,

          // ── Mnemonics section (Always visible) ──
          MNEMONICS[sysKey] && MNEMONICS[sysKey].length > 0 ? h('div', { className: 'mb-3' },
            h('button', { onClick: function() { upd('_showMnemonics', !d._showMnemonics); },
              className: 'w-full flex items-center justify-between px-3 py-2 rounded-lg bg-purple-50 border border-purple-600 hover:bg-purple-100 transition-all'
            },
              h('span', { className: 'text-[11px] font-bold text-purple-700 uppercase flex items-center gap-1' }, '\uD83E\uDDE0 Mnemonics (' + MNEMONICS[sysKey].length + ')'),
              h('span', { className: 'text-[11px] text-purple-500' }, d._showMnemonics ? '\u25B2' : '\u25BC')
            ),
            d._showMnemonics ? h('div', { className: 'mt-1 space-y-1.5' },
              MNEMONICS[sysKey].map(function(mn) {
                var isRevealed = mnemonicsViewed[mn.id];
                return h('div', { 
                  key: mn.id,
                  className: 'rounded-lg p-2.5 border transition-all ' + (isRevealed ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-white')
                },
                  h('p', { className: 'text-[11px] font-bold text-purple-800 mb-0.5' }, mn.title),
                  h('p', { className: 'text-xs font-black text-purple-600 mb-1 italic' }, '"' + mn.phrase + '"'),
                  isRevealed ? h('div', null,
                    h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, mn.meaning),
                    ttsBtn(mn.phrase + '. ' + mn.meaning)
                  ) : h('button', { 'aria-label': 'Reveal meaning',
                    onClick: function() {
                      var newMV = Object.assign({}, mnemonicsViewed);
                      newMV[mn.id] = true;
                      upd('_mnemonicsViewed', newMV);
                      playSound('mnemonicReveal');
                    },
                    className: 'text-[11px] font-bold text-purple-600 hover:text-purple-800 transition-all'
                  }, 'Reveal meaning \u2192')
                );
              })
            ) : null
          ) : null,

          // ── Progress tracker (Always visible) ──
          h('div', { className: 'mb-3 flex items-center gap-2' },
            h('span', { className: 'text-[11px] font-bold text-slate-600' }, sys.icon + ' ' + exploredInSystem + '/' + filtered.length + ' explored'),
            h('div', { className: 'flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden' },
              h('div', { className: 'h-full rounded-full transition-all', style: { width: progressPct + '%', background: sys.accent } })
            ),
            h('span', { className: 'text-[11px] font-bold', style: { color: sys.accent } }, progressPct + '%')
          ),

          // ── Layer toggle bar (Always visible) ──
          h('div', { className: 'flex items-center gap-1.5 mb-3 flex-wrap bg-slate-50 rounded-xl px-3 py-2 border border-slate-400' },
            h('span', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mr-1' }, '\uD83E\uDDE0 Layers'),
            LAYER_DEFS.map(function(ld) {
              var isOn = layers[ld.id] || ld.id === autoLayerId;
              return h('button', { 'aria-label': 'Toggle layer',
                key: ld.id,
                onClick: function() {
                  toggleLayer(ld.id);
                  var newLT = Object.assign({}, layersToggled);
                  newLT[ld.id] = true;
                  upd('_layersToggled', newLT);
                },
                title: (isOn ? 'Hide ' : 'Show ') + ld.name + ' layer',
                className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ' +
                  (isOn ? 'text-white shadow-sm border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100'),
                style: isOn ? { background: ld.accent, borderColor: ld.accent } : {}
              }, ld.icon + ' ' + ld.name);
            }),
            h('button', { 'aria-label': 'Reset',
              onClick: function() { upd('visibleLayers', { skin: true }); },
              title: 'Reset all layers to default (skin only)',
              className: 'ml-auto px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200'
            }, '\u21BA Reset')
          ),

          // ── Controls (Always visible) ──
          h('div', { className: 'flex items-center gap-2 mb-3 flex-wrap' },
            h('div', { className: 'flex rounded-lg border border-slate-400 overflow-hidden' },
              ['anterior', 'posterior'].map(function(v) {
                return h('button', {
                  key: v,
                  onClick: function() { upd('view', v); upd('selectedStructure', null); playSound('viewSwitch'); },
                  'aria-pressed': view === v,
                  className: 'px-3 py-1 text-xs font-bold transition-all ' + (view === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')
                }, v.charAt(0).toUpperCase() + v.slice(1));
              })
            ),
            h('input', {
              type: 'text', placeholder: '\uD83D\uDD0D Search structures...',
              'aria-label': 'Search anatomical structures',
              value: d.search || '',
              onChange: function(e) {
                upd('search', e.target.value);
                if (e.target.value && filtered.length > 0) { upd('_searchFinds', (d._searchFinds || 0) + 1); }
              },
              className: 'flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-slate-400 rounded-lg focus:ring-2 focus:ring-rose-300 outline-none'
            }),
            h('button', { onClick: function() { upd('quizMode', !d.quizMode); upd('quizIdx', 0); upd('quizScore', 0); upd('quizFeedback', null); },
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (d.quizMode ? 'bg-green-700 text-white' : 'bg-green-50 text-green-700 border border-green-600 hover:bg-green-100')
            }, d.quizMode ? '\u2705 Quiz On' : '\uD83E\uDDEA Quiz'),
            h('div', { className: 'flex rounded-lg border border-slate-400 overflow-hidden' },
              [{ v: 1, label: 'K\u20135', tip: 'Elementary' }, { v: 2, label: '6\u20138', tip: 'Middle' }, { v: 3, label: '9\u201312+', tip: 'Advanced' }].map(function(lv) {
                return h('button', { key: lv.v, title: lv.tip + ' level',
                  onClick: function() { upd('complexity', lv.v); upd('selectedStructure', null); },
                  className: 'px-2 py-1 text-[11px] font-bold transition-all ' + (complexity === lv.v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')
                }, lv.label);
              })
            ),
            h('span', { className: 'text-[11px] text-slate-600 font-bold' }, filtered.length + ' structures'),
            h('button', { 'aria-label': 'Regions',
              onClick: function() { upd('_showRegionLabels', !d._showRegionLabels); },
              title: 'Toggle body region labels',
              className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ' + (d._showRegionLabels ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')
            }, '\uD83C\uDFF7 Regions'),
            h('button', { 'aria-label': 'X-ray',
              onClick: function() { upd('_xrayMode', !xrayMode); },
              title: 'Toggle X-ray radiograph mode',
              className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ' + (xrayMode ? 'bg-cyan-800 text-cyan-200 border-cyan-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')
            }, '\u2622 X-ray'),
            // Skin tone selector (representation & inclusion)
            h('div', { className: 'flex items-center gap-1 ml-1', title: 'Skin tone (representation)' },
              h('span', { className: 'text-[11px] text-slate-200 font-bold' }, '\uD83C\uDFA8'),
              SKIN_TONES.map(function(tone) {
                return h('button', {
                  key: tone.id,
                  'aria-label': tone.label + ' skin tone',
                  onClick: function() { upd('_skinTone', tone.id); },
                  className: 'w-4 h-4 rounded-full border-2 transition-all ' + (skinToneId === tone.id ? 'border-indigo-500 ring-1 ring-indigo-300 scale-110' : 'border-slate-200 hover:border-slate-400'),
                  style: { backgroundColor: tone.base }
                });
              })
            ),
            // Male/Female toggle (reproductive system only)
            sysKey === 'reproductive' ? h('button', {
              'aria-label': 'Toggle male/female anatomy',
              onClick: function() { upd('_maleAnatomy', !d._maleAnatomy); },
              className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ml-1 ' + (d._maleAnatomy ? 'bg-violet-600 text-white border-violet-600' : 'bg-pink-50 text-pink-600 border-pink-600 hover:bg-pink-100'),
              title: 'Switch between male and female reproductive anatomy'
            }, d._maleAnatomy ? '\u2642 Male' : '\u2640 Female') : null
          ),

          // ── Main Content Area: Canvas (Left) + Tab Panel (Right) ──
          h('div', { className: 'flex gap-4', style: { alignItems: 'flex-start' } },
            // Canvas (Always visible)
            h('div', { className: 'flex-shrink-0' },
              h('canvas', { 'aria-label': 'Anatomy visualization',
                ref: canvasRef,
                onClick: handleClick,
                onMouseMove: handleMouseMove,
                onMouseLeave: function() { upd('_hoverStructure', null); },
                className: 'rounded-xl border-2 cursor-crosshair',
                style: {
                  borderColor: sys.accent + '50',
                  background: 'linear-gradient(135deg,#fdfaf3 0%,#f8f1e6 60%,#f4ebdb 100%)',
                  boxShadow: '0 4px 16px rgba(15,23,42,0.06), 0 0 18px ' + sys.accent + '14, inset 0 1px 0 rgba(255,255,255,0.7)'
                }
              })
            ),

            // Tab-specific Right Panel
            h('div', { className: 'flex-1 min-w-0' },
              activeTab === 'explore' ? (
                d.quizMode ? (
                  // Quiz panel (enhanced with 4 types)
                  quizQ ? h('div', { className: 'bg-white rounded-xl border-2 border-green-200 p-4 space-y-3' },
                    h('div', { className: 'flex items-center justify-between mb-2' },
                      h('h4', { className: 'font-bold text-green-800 text-sm' }, '\uD83E\uDDEA Anatomy Quiz'),
                      h('span', { className: 'text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700' }, '\u2B50 ' + (d.quizScore || 0) + '/' + Math.min((d.quizIdx || 0) + 1, quizPool.length))
                    ),
                    h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 mb-1' },
                      quizType === 0 ? 'Function \u2192 Structure' :
                      quizType === 1 ? 'True or False' :
                      quizType === 2 ? 'System ID' : 'Clinical Challenge'
                    ),
                    // Question text varies by type
                    quizType === 0 ? h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, 'Which structure has this function?'),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic' }, quizQ.fn.substring(0, 120) + (quizQ.fn.length > 120 ? '...' : ''))
                    ) : quizType === 1 ? h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, 'True or False:'),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic' }, 'The ' + quizQ.name + ' belongs to the ' + sys.name + ' system.')
                    ) : quizType === 2 ? h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, 'Which body system contains this structure?'),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed font-bold' }, quizQ.name)
                    ) : h('div', null,
                      h('p', { className: 'text-sm text-slate-800 font-bold leading-relaxed' }, 'Which structure is affected?'),
                      h('p', { className: 'text-xs text-slate-600 bg-slate-50 rounded-lg p-3 leading-relaxed italic' }, quizQ.clinical ? quizQ.clinical.substring(0, 120) + '...' : quizQ.fn.substring(0, 120) + '...')
                    ),
                    h('div', { className: 'grid grid-cols-1 gap-1.5' },
                      quizOptions.map(function(opt) {
                        var fb = d.quizFeedback;
                        var correctId = quizType === 1 ? 'true' : (quizType === 2 ? sysKey : quizQ.id);
                        var isCorrect = opt.id === correctId;
                        var wasChosen = fb && fb.chosen === opt.id;
                        var showResult = fb !== null && fb !== undefined;
                        return h('button', { key: opt.id,
                          disabled: showResult,
                          onClick: function() {
                            var correct = opt.id === correctId;
                            upd('quizFeedback', { chosen: opt.id, correct: correct });
                            if (correct) {
                              upd('quizScore', (d.quizScore || 0) + 1);
                              upd('_totalCorrect', (d._totalCorrect || 0) + 1);
                              upd('_streak', (d._streak || 0) + 1);
                              playSound('quizCorrect');
                            } else {
                              upd('_streak', 0);
                              playSound('quizWrong');
                            }
                          },
                          className: 'w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ' +
                            (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :
                              showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :
                                'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50')
                        }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + opt.name);
                      })
                    ),
                    d.quizFeedback && h('div', { className: 'rounded-lg p-3 text-xs leading-relaxed space-y-1.5 ' + (d.quizFeedback.correct ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                      h('p', { className: 'font-black ' + (d.quizFeedback.correct ? 'text-green-800' : 'text-amber-800') }, (d.quizFeedback.correct ? '\u2705 Correct! ' : '\u274C The answer was: ') + quizQ.name),
                      h('p', { className: 'text-slate-700' }, h('span', { className: 'font-bold text-slate-600' }, 'Function: '), quizQ.fn.substring(0, 150)),
                      quizQ.clinical && h('p', { className: 'text-slate-600 italic' }, h('span', { className: 'font-bold text-rose-500' }, '\u26A0 Clinical: '), quizQ.clinical.substring(0, 120))
                    ),
                    d.quizFeedback && h('button', { 'aria-label': 'Next Question',
                      onClick: function() { upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); },
                      className: 'w-full py-2 mt-2 rounded-lg text-xs font-bold bg-green-700 text-white hover:bg-green-700 transition-all'
                    }, 'Next Question \u2192')
                  ) : h('p', { className: 'text-sm text-slate-600 italic' }, 'No quiz questions available.')
                ) : (
                  sel ? (
                    // Detail panel — warm-anatomy gradient + system-color
                    // glow so each body system feels distinct without
                    // changing layout.
                    h('div', {
                      className: 'rounded-xl border-2 p-4 space-y-3',
                      style: {
                        borderColor: sys.accent + '50',
                        background: 'linear-gradient(135deg,#ffffff 0%,#fbf6ec 70%,#f5ebd9 100%)',
                        boxShadow: '0 4px 14px rgba(15,23,42,0.06), 0 0 16px ' + sys.accent + '14, inset 0 1px 0 rgba(255,255,255,0.7)'
                      }
                    },
                      h('div', { className: 'flex items-start justify-between' },
                        h('div', { className: 'flex-1' },
                          h('h4', { className: 'text-base font-black', style: { color: sys.accent } }, sel.name),
                          PRONUNCIATION[sel.id] ? h('p', { className: 'text-[11px] text-indigo-500 italic mt-0.5' }, '\uD83D\uDD0A ' + PRONUNCIATION[sel.id]) : null,
                          (gradeBand === 'k2' || gradeBand === 'g35') && SIMPLE_DESC[sel.id] && SIMPLE_DESC[sel.id][gradeBand] ? h('p', { className: 'text-xs text-sky-700 bg-sky-50 rounded-lg px-2 py-1.5 mt-1 border border-sky-200 leading-relaxed' }, SIMPLE_DESC[sel.id][gradeBand]) : null
                        ),
                        h('div', { className: 'flex gap-1' },
                          h('button', { onClick: function() {
                              if (compareStructureId === sel.id) { upd('_compareStructure', null); }
                              else { upd('_compareStructure', sel.id); upd('_comparisons', comparisons + 1); playSound('compareView'); }
                            },
                            title: compareStructureId === sel.id ? 'Remove from compare' : 'Set as compare target (B)',
                            className: 'p-1 rounded text-[11px] font-bold transition-all ' + (compareStructureId === sel.id ? 'bg-violet-100 text-violet-700' : 'hover:bg-violet-50 text-violet-400')
                          }, '\u2696'),
                          h('button', { 'aria-label': 'Function', onClick: function() { upd('selectedStructure', null); }, className: 'p-1 hover:bg-slate-100 rounded' }, h(X, { size: 14, className: 'text-slate-600' }))
                        )
                      ),
                      h('div', { className: 'space-y-2.5' },
                        h('div', null,
                          h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-0.5' }, 'Function', ttsBtn(sel.fn)),
                          h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, sel.fn)
                        ),
                        sel.origin && h('div', { className: 'grid grid-cols-2 gap-2' },
                          h('div', null,
                            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-0.5' }, 'Origin'),
                            h('p', { className: 'text-xs text-slate-600' }, sel.origin)
                          ),
                          h('div', null,
                            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-0.5' }, 'Insertion'),
                            h('p', { className: 'text-xs text-slate-600' }, sel.insertion)
                          )
                        ),
                        h('div', null,
                          h('p', { className: 'text-[11px] font-bold text-rose-500 uppercase mb-0.5' }, '\u26A0 Clinical Significance', ttsBtn(sel.clinical)),
                          h('p', { className: 'text-xs text-slate-600 leading-relaxed bg-rose-50 rounded-lg p-2' }, sel.clinical)
                        ),
                        sel.detail && h('div', null,
                          h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-0.5' }, 'Detail'),
                          h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, sel.detail)
                        ),
                        // Brain Waves Section
                        sel.brainWaves && h('div', { className: 'mt-3 pt-3 border-t border-slate-200' },
                          h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase mb-2' }, '\u26A1 Brain Wave Types (EEG)'),
                          h('div', { className: 'space-y-2' },
                            sel.brainWaves.map(function(w) {
                              return h('div', { key: w.type, className: 'rounded-lg p-2.5 border', style: { borderColor: w.color + '40', background: w.color + '08' } },
                                h('div', { className: 'flex items-center gap-2 mb-1' },
                                  h('span', { className: 'text-base' }, w.emoji),
                                  h('span', { className: 'text-xs font-black', style: { color: w.color } }, w.type),
                                  h('span', { className: 'ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full', style: { background: w.color + '18', color: w.color } }, w.freq)
                                ),
                                h('p', { className: 'text-[11px] font-bold text-slate-600 mb-0.5' }, 'State: ', h('span', { className: 'text-slate-700' }, w.state)),
                                h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mb-1' }, w.characteristics),
                                h('p', { className: 'text-[11px] text-rose-600 italic leading-relaxed' }, '\u26A0 ', w.clinical)
                              );
                            })
                          )
                        ),
                        // Sleep Stages Section
                        sel.sleepStages && h('div', { className: 'mt-3 pt-3 border-t border-slate-200' },
                          h('p', { className: 'text-[11px] font-bold text-indigo-600 uppercase mb-2' }, '\uD83D\uDCA4 Sleep Architecture'),
                          h('div', { className: 'space-y-2' },
                            sel.sleepStages.map(function(s) {
                              return h('div', { key: s.stage, className: 'rounded-lg p-2.5 border border-indigo-100 bg-indigo-50/30' },
                                h('div', { className: 'flex items-center gap-2 mb-1' },
                                  h('span', { className: 'text-base' }, s.emoji),
                                  h('span', { className: 'text-xs font-black text-indigo-700' }, s.stage),
                                  h('span', { className: 'ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600' }, s.pct + ' of night')
                                ),
                                h('div', { className: 'flex gap-3 mb-1' },
                                  h('span', { className: 'text-[11px] text-slate-600' }, '\\u23F1 ', h('span', { className: 'font-bold' }, s.duration)),
                                  h('span', { className: 'text-[11px] text-slate-600' }, '\uD83C\uDF0A ', h('span', { className: 'font-bold' }, s.waves))
                                ),
                                h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mb-1' }, s.desc),
                                h('p', { className: 'text-[11px] text-rose-600 italic leading-relaxed' }, '\u26A0 ', s.clinical)
                              );
                            })
                          )
                        )
                      ),
                      // ── Compare Panel ──
                      compareSel && compareSel.id !== sel.id ? h('div', { className: 'mt-3 pt-3 border-t-2 border-violet-200' },
                        h('div', { className: 'flex items-center justify-between mb-2' },
                          h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase' }, '\\u2696 Comparing with:'),
                          h('button', { 'aria-label': 'Clear',
                            onClick: function() { upd('_compareStructure', null); },
                            className: 'text-[11px] font-bold text-slate-600 hover:text-slate-600 px-1 py-0.5 rounded hover:bg-slate-100'
                          }, '\\u2715 Clear')
                        ),
                        h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200' },
                          h('h5', { className: 'text-sm font-black text-violet-800 mb-1' }, compareSel.name),
                          h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mb-1' }, compareSel.fn.substring(0, 200) + (compareSel.fn.length > 200 ? '...' : '')),
                          compareSel.clinical ? h('p', { className: 'text-[11px] text-rose-600 italic leading-relaxed' }, '\\u26A0 ' + compareSel.clinical.substring(0, 150) + (compareSel.clinical.length > 150 ? '...' : '')) : null
                        ),
                        h('table', { className: 'w-full mt-2 text-[11px]' },
                          h('caption', { className: 'sr-only' }, 'anatomy data table'), h('thead', null,
                            h('tr', { className: 'border-b border-violet-200' },
                              h('th', { scope: 'col', className: 'text-left py-1 text-violet-600 font-bold' }, ''),
                              h('th', { scope: 'col', className: 'text-left py-1 font-bold', style: { color: sys.accent } }, sel.name),
                              h('th', { scope: 'col', className: 'text-left py-1 text-violet-700 font-bold' }, compareSel.name)
                            )
                          ),
                          h('tbody', null,
                            h('tr', { className: 'border-b border-slate-100' },
                              h('td', { className: 'py-1 font-bold text-slate-600' }, 'System'),
                              h('td', { className: 'py-1 text-slate-600' }, sys.name),
                              h('td', { className: 'py-1 text-slate-600' }, sys.name)
                            ),
                            h('tr', { className: 'border-b border-slate-100' },
                              h('td', { className: 'py-1 font-bold text-slate-600' }, 'View'),
                              h('td', { className: 'py-1 text-slate-600' }, sel.v === 'b' ? 'Both' : sel.v === 'a' ? 'Anterior' : 'Posterior'),
                              h('td', { className: 'py-1 text-slate-600' }, compareSel.v === 'b' ? 'Both' : compareSel.v === 'a' ? 'Anterior' : 'Posterior')
                            ),
                            sel.origin && compareSel.origin ? h('tr', { className: 'border-b border-slate-100' },
                              h('td', { className: 'py-1 font-bold text-slate-600' }, 'Origin'),
                              h('td', { className: 'py-1 text-slate-600' }, sel.origin),
                              h('td', { className: 'py-1 text-slate-600' }, compareSel.origin)
                            ) : null,
                            sel.insertion && compareSel.insertion ? h('tr', null,
                              h('td', { className: 'py-1 font-bold text-slate-600' }, 'Insertion'),
                              h('td', { className: 'py-1 text-slate-600' }, sel.insertion),
                              h('td', { className: 'py-1 text-slate-600' }, compareSel.insertion)
                            ) : null
                          )
                        )
                      ) : null
                    )
                  ) : (
                    // Structure list
                    h('div', { className: 'space-y-1 max-h-[460px] overflow-y-auto pr-1' },
                      filtered.length === 0 && h('p', { className: 'text-xs text-slate-600 italic py-4 text-center' }, 'No structures match your search.'),
                      filtered.map(function(st) {
                        return h('button', { key: st.id,
                          onClick: function() { upd('selectedStructure', st.id); playSound('structureClick'); },
                          className: 'w-full text-left px-3 py-2 rounded-lg text-xs transition-all hover:shadow-sm ' +
                            (d.selectedStructure === st.id ? 'font-bold border-2' : 'bg-slate-50 hover:bg-white border border-slate-400'),
                          style: d.selectedStructure === st.id ? { borderColor: sys.accent, background: sys.color } : {}
                        },
                          h('div', { className: 'font-bold text-slate-800' }, st.name),
                          h('div', { className: 'text-[11px] text-slate-600 mt-0.5 line-clamp-1' }, st.fn.substring(0, 80) + (st.fn.length > 80 ? '...' : ''))
                        );
                      })
                    )
                  )
                )
              ) : activeTab === 'aiTutor' ? (
                // AI Tutor Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-violet-200 p-4 space-y-3' },
                  h('h4', { className: 'font-bold text-violet-800 text-sm mb-2' }, '\uD83E\uDD16 AI Anatomy Tutor'),
                  h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Currently studying: ' + sys.icon + ' ' + sys.name + (sel ? ' > ' + sel.name : '')),
                  h('div', { className: 'space-y-2 max-h-[340px] overflow-y-auto mb-3' },
                    aiMessages.length === 0 && h('p', { className: 'text-xs text-slate-600 italic text-center py-4' }, 'Ask a question about anatomy to get started!'),
                    aiMessages.map(function(msg, idx) {
                      return h('div', { key: idx, className: 'rounded-lg px-3 py-2 text-xs leading-relaxed ' + (msg.role === 'user' ? 'bg-violet-50 text-violet-800 ml-8' : 'bg-slate-50 text-slate-700 mr-8') },
                        h('span', { className: 'font-bold' }, msg.role === 'user' ? 'You: ' : 'AI: '),
                        msg.text,
                        msg.role === 'ai' ? ttsBtn(msg.text) : null
                      );
                    }),
                    aiLoading && h('div', { className: 'text-xs text-violet-500 italic text-center' }, 'Thinking...')
                  ),
                  h('div', { className: 'flex flex-wrap gap-1 mb-2' },
                    [
                      'What does the ' + sys.name + ' system do?',
                      sel ? 'Tell me about the ' + sel.name : 'What is the most important structure in this system?',
                      'What clinical conditions affect this system?'
                    ].map(function(q, qi) {
                      return h('button', { 'aria-label': 'Ask question',
                        key: qi,
                        onClick: function() { sendAiQuestion(q); },
                        className: 'px-2 py-1 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-600 transition-all'
                      }, q);
                    })
                  ),
                  h('div', { className: 'flex gap-2' },
                    h('input', {
                      type: 'text', placeholder: 'Ask a question...',
                      'aria-label': 'Ask the anatomy AI tutor a question',
                      value: d._aiInput || '',
                      onChange: function(e) { upd('_aiInput', e.target.value); },
                      onKeyDown: function(e) { if (e.key === 'Enter') { sendAiQuestion(d._aiInput || ''); upd('_aiInput', ''); } },
                      className: 'flex-1 px-3 py-1.5 text-xs border border-violet-600 rounded-lg focus:ring-2 focus:ring-violet-300 outline-none'
                    }),
                    h('button', { 'aria-label': 'Ask',
                      onClick: function() { sendAiQuestion(d._aiInput || ''); upd('_aiInput', ''); },
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all'
                    }, 'Ask')
                  )
                )
              ) : activeTab === 'tour' ? (
                // Guided Tour Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-4 space-y-3' },
                  h('h4', { className: 'font-bold text-emerald-800 text-sm mb-2' }, '\uD83E\uDDED Guided Tour: ' + sys.icon + ' ' + sys.name),
                  tourSteps.length > 0 ? h('div', { className: 'space-y-3' },
                    h('div', { className: 'flex items-center justify-between mb-2' },
                      h('span', { className: 'text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700' }, 'Step ' + (tourStepIdx + 1) + ' of ' + tourSteps.length),
                      h('div', { className: 'flex-1 mx-3 h-1.5 rounded-full bg-emerald-100 overflow-hidden' },
                        h('div', { className: 'h-full rounded-full bg-emerald-500 transition-all', style: { width: (((tourStepIdx + 1) / tourSteps.length) * 100) + '%' } })
                      )
                    ),
                    currentTourStep ? h('div', { className: 'bg-emerald-50 rounded-lg p-4 border border-emerald-200' },
                      h('h5', { className: 'font-bold text-emerald-900 text-sm mb-2' }, currentTourStep.title),
                      h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, currentTourStep.narration),
                      ttsBtn(currentTourStep.narration)
                    ) : null,
                    h('div', { className: 'flex gap-2 justify-between' },
                      h('button', { 'aria-label': 'Previous',
                        onClick: function() {
                          var prev = tourStepIdx - 1;
                          if (prev >= 0) { upd('_tourStepIdx', prev); upd('selectedStructure', tourSteps[prev].structureId); playSound('guidedStep'); }
                        },
                        disabled: tourStepIdx === 0,
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (tourStepIdx === 0 ? 'bg-slate-100 text-slate-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200')
                      }, '\u2190 Previous'),
                      tourStepIdx < tourSteps.length - 1 ? h('button', { 'aria-label': 'Next',
                        onClick: function() {
                          var next = tourStepIdx + 1;
                          upd('_tourStepIdx', next); upd('selectedStructure', tourSteps[next].structureId); playSound('guidedStep');
                        },
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-700 transition-all'
                      }, 'Next \u2192') : h('button', { 'aria-label': 'Complete Tour!',
                        onClick: function() { upd('_tourCompleted', true); upd('_tourActive', false); upd('_activeTab', 'explore'); playSound('badge'); },
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 transition-all'
                      }, '\uD83C\uDFC6 Complete Tour!')
                    )
                  ) : h('p', { className: 'text-xs text-slate-600 italic' }, 'No tour available for this system.')
                )
              ) : activeTab === 'spotter' ? (
                // Spotter Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4 space-y-3' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('h4', { className: 'font-bold text-amber-800 text-sm' }, '\uD83C\uDFAF Anatomy Spotter Test'),
                    h('div', { className: 'flex gap-2' },
                      h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700' }, '\u2705 ' + spotterScore + '/' + spotterTotal),
                      spotterBestTime < 999 ? h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700' }, '\u26A1 Best: ' + spotterBestTime.toFixed(1) + 's') : null
                    )
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-3' }, 'A pin is placed on the anatomical figure. Identify the structure as quickly as you can! Look for the pulsing crosshair on the canvas.'),
                  !spotterActive ? h('div', { className: 'text-center py-4' },
                    h('button', { 'aria-label': 'Start Spotter Test',
                      onClick: function() {
                        var pool = filtered.filter(function(s) { return s.fn; });
                        if (pool.length < 4) return;
                        var target = pool[Math.floor(Math.random() * pool.length)];
                        var wrong = pool.filter(function(s) { return s.id !== target.id; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
                        var opts = wrong.concat([target]).sort(function() { return Math.random() - 0.5; });
                        updMulti({ _spotterActive: true, _spotterTarget: target.id, _spotterFeedback: null, _spotterOpts: opts, _spotterStartTime: Date.now() });
                      },
                      className: 'px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-700 text-white hover:bg-amber-600 transition-all shadow-sm'
                    }, '\uD83C\uDFAF Start Spotter Test'),
                    spotterTotal > 0 ? h('p', { className: 'text-[11px] text-slate-600 mt-2' }, 'Score: ' + spotterScore + ' correct out of ' + spotterTotal + ' attempts') : null
                  ) : h('div', { className: 'space-y-3' },
                    h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200 text-center' },
                      h('p', { className: 'text-sm font-bold text-amber-900 mb-1' }, 'What structure is marked on the figure?'),
                      h('p', { className: 'text-[11px] text-amber-600' }, 'Look for the pulsing amber crosshair on the canvas')
                    ),
                    h('div', { className: 'grid grid-cols-2 gap-2' },
                      spotterOptions.map(function(opt) {
                        var isCorrect = opt.id === spotterTarget;
                        var showResult = spotterFeedback !== null;
                        var wasChosen = showResult && spotterFeedback === opt.id;
                        return h('button', { key: opt.id,
                          disabled: showResult,
                          onClick: function() {
                            var elapsed = (Date.now() - spotterStartTime) / 1000;
                            upd('_spotterFeedback', opt.id);
                            upd('_spotterTotal', spotterTotal + 1);
                            if (opt.id === spotterTarget) {
                              upd('_spotterScore', spotterScore + 1);
                              if (elapsed < spotterBestTime) upd('_spotterBestTime', elapsed);
                              playSound('spotterCorrect');
                            } else {
                              playSound('spotterWrong');
                            }
                          },
                          className: 'px-3 py-2.5 rounded-xl text-xs font-bold transition-all border-2 text-left ' +
                            (showResult && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :
                              showResult && wasChosen && !isCorrect ? 'border-red-400 bg-red-50 text-red-700' :
                                'border-slate-200 hover:border-amber-600 text-slate-700 hover:bg-amber-50')
                        }, (showResult && isCorrect ? '\u2705 ' : showResult && wasChosen ? '\u274C ' : '') + opt.name);
                      })
                    ),
                    spotterFeedback && h('div', { className: 'space-y-2' },
                      h('div', { className: 'rounded-lg p-3 text-xs leading-relaxed ' + (spotterFeedback === spotterTarget ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                        h('p', { className: 'font-bold ' + (spotterFeedback === spotterTarget ? 'text-green-800' : 'text-amber-800') },
                          spotterFeedback === spotterTarget ? '\u2705 Correct! (' + ((Date.now() - spotterStartTime) / 1000).toFixed(1) + 's)' : '\u274C The answer was: ' + (function() { for (var si3 = 0; si3 < filtered.length; si3++) { if (filtered[si3].id === spotterTarget) return filtered[si3].name; } return ''; })()
                        )
                      ),
                      h('button', { 'aria-label': 'Next Structure',
                        onClick: function() {
                          var pool = filtered.filter(function(s) { return s.fn; });
                          if (pool.length < 4) return;
                          var target = pool[Math.floor(Math.random() * pool.length)];
                          var wrong = pool.filter(function(s) { return s.id !== target.id; }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
                          var opts = wrong.concat([target]).sort(function() { return Math.random() - 0.5; });
                          updMulti({ _spotterTarget: target.id, _spotterFeedback: null, _spotterOpts: opts, _spotterStartTime: Date.now() });
                        },
                        className: 'w-full py-2 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-600 transition-all'
                      }, 'Next Structure \u2192'),
                      h('button', { 'aria-label': 'End Test',
                        onClick: function() { updMulti({ _spotterActive: false, _spotterTarget: null, _spotterFeedback: null }); },
                        className: 'w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-all'
                      }, 'End Test')
                    )
                  )
                )
              ) : activeTab === 'pathways' ? (
                // Pathways Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4 space-y-3' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('h4', { className: 'font-bold text-rose-800 text-sm' }, '\uD83D\uDEE4 Physiological Pathways'),
                    h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600' }, Object.keys(pathwaysCompleted).length + '/' + PATHWAYS.length + ' completed')
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-3' }, 'Trace step-by-step how blood flows, air moves, food digests, or nerve signals travel through the body.'),
                  !activePathwayId ? h('div', { className: 'grid grid-cols-2 gap-2' },
                    PATHWAYS.map(function(pw) {
                      var isDone = pathwaysCompleted[pw.id];
                      return h('button', { key: pw.id,
                        onClick: function() { updMulti({ _activePathway: pw.id, _pathwayStep: 0 }); upd('selectedStructure', pw.steps[0].structure); playSound('pathwayStep'); },
                        className: 'text-left rounded-xl p-3 border-2 transition-all ' + (isDone ? 'border-rose-600 bg-rose-50' : 'border-slate-200 hover:border-rose-200 hover:bg-rose-50/50')
                      },
                        h('div', { className: 'flex items-center gap-2 mb-1' },
                          h('span', { className: 'text-lg' }, pw.icon),
                          h('span', { className: 'text-xs font-black', style: { color: pw.color } }, pw.title),
                          isDone ? h('span', { className: 'ml-auto text-[11px] text-emerald-500 font-bold' }, '\u2713') : null
                        ),
                        h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, pw.desc)
                      );
                    })
                  ) : (function() {
                    var pw = null;
                    for (var pwi = 0; pwi < PATHWAYS.length; pwi++) { if (PATHWAYS[pwi].id === activePathwayId) { pw = PATHWAYS[pwi]; break; } }
                    if (!pw) return null;
                    var step = pw.steps[pathwayStepIdx];
                    return h('div', { className: 'space-y-3' },
                      h('div', { className: 'flex items-center gap-2 mb-2' },
                        h('span', { className: 'text-lg' }, pw.icon),
                        h('span', { className: 'text-sm font-black', style: { color: pw.color } }, pw.title),
                        h('button', { 'aria-label': 'Back',
                          onClick: function() { updMulti({ _activePathway: null, _pathwayStep: 0 }); },
                          className: 'ml-auto text-[11px] font-bold text-slate-600 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100'
                        }, '\u2190 Back')
                      ),
                      h('div', { className: 'flex items-center justify-between mb-2' },
                        h('span', { className: 'text-xs font-bold px-2 py-0.5 rounded-full', style: { background: pw.color + '18', color: pw.color } }, 'Step ' + (pathwayStepIdx + 1) + ' of ' + pw.steps.length),
                        h('div', { className: 'flex-1 mx-3 h-1.5 rounded-full bg-slate-100 overflow-hidden' },
                          h('div', { className: 'h-full rounded-full transition-all', style: { width: (((pathwayStepIdx + 1) / pw.steps.length) * 100) + '%', background: pw.color } })
                        )
                      ),
                      step ? h('div', { className: 'rounded-xl p-4 border-2', style: { borderColor: pw.color + '40', background: pw.color + '08' } },
                        h('h5', { className: 'font-bold text-sm mb-2', style: { color: pw.color } }, (pathwayStepIdx + 1) + '. ' + step.label),
                        h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, step.detail),
                        ttsBtn(step.detail)
                      ) : null,
                      h('div', { className: 'flex gap-2 justify-between' },
                        h('button', { 'aria-label': 'Previous',
                          onClick: function() {
                            if (pathwayStepIdx > 0) {
                              var prev = pathwayStepIdx - 1;
                              upd('_pathwayStep', prev); upd('selectedStructure', pw.steps[prev].structure); playSound('pathwayStep');
                            }
                          },
                          disabled: pathwayStepIdx === 0,
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (pathwayStepIdx === 0 ? 'bg-slate-100 text-slate-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200')
                        }, '\u2190 Previous'),
                        pathwayStepIdx < pw.steps.length - 1 ? h('button', { 'aria-label': 'Next',
                          onClick: function() {
                            var next = pathwayStepIdx + 1;
                            upd('_pathwayStep', next); upd('selectedStructure', pw.steps[next].structure); playSound('pathwayStep');
                          },
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition-all',
                          style: { background: pw.color }
                        }, 'Next \u2192') : h('button', { 'aria-label': 'Complete Pathway!',
                          onClick: function() {
                            var newPC = Object.assign({}, pathwaysCompleted);
                            newPC[pw.id] = true;
                            updMulti({ _pathwaysCompleted: newPC, _activePathway: null, _pathwayStep: 0 });
                            playSound('badge');
                            if (addToast) addToast('\uD83D\uDEE4 Pathway complete: ' + pw.title + '!');
                          },
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-600 transition-all'
                        }, '\uD83C\uDFC6 Complete Pathway!')
                      )
                    );
                  })()
                )
              ) : activeTab === 'connections' ? (
                // Connections Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-sky-200 p-4 space-y-3' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('h4', { className: 'font-bold text-sky-800 text-sm' }, '\\uD83D\\uDD17 How Body Systems Connect'),
                    h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-600' }, Object.keys(connectionsViewed).length + '/' + CONNECTIONS.length + ' explored')
                  ),
                  h('div', { className: 'space-y-2 max-h-[500px] overflow-y-auto' },
                    CONNECTIONS.map(function(conn) {
                      var isViewed = connectionsViewed[conn.id];
                      return h('button', { 'aria-label': 'Play sound',
                        key: conn.id,
                        onClick: function() {
                          playSound('connectionView');
                          if (!connectionsViewed[conn.id]) {
                            var newCV = Object.assign({}, connectionsViewed);
                            newCV[conn.id] = true;
                            upd('_connectionsViewed', newCV);
                          }
                          upd('_expandedConn', d._expandedConn === conn.id ? null : conn.id);
                        },
                        className: 'w-full text-left rounded-xl p-3 border-2 transition-all ' + (isViewed ? 'border-sky-600 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/50')
                      },
                        h('div', { className: 'flex items-center gap-2 mb-1' },
                          h('span', { className: 'text-base' }, conn.icon),
                          h('span', { className: 'text-xs font-black text-sky-800' }, conn.title),
                          h('span', { className: 'ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600' },
                            SYSTEMS[conn.systems[0]].icon + ' + ' + SYSTEMS[conn.systems[1]].icon
                          ),
                          isViewed ? h('span', { className: 'text-[11px] text-emerald-500 font-bold' }, '\u2713') : null
                        ),
                        h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, conn.desc),
                        d._expandedConn === conn.id ? h('div', { className: 'mt-2 pt-2 border-t border-sky-200' },
                          h('p', { className: 'text-[11px] text-sky-700 italic leading-relaxed' }, '\\uD83D\uDCA1 Example: ' + conn.example)
                        ) : null
                      );
                    })
                  )
                )
              ) : activeTab === 'flashcards' ? (
                // Flashcards Panel
                h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-4 space-y-3' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('h4', { className: 'font-bold text-teal-800 text-sm' }, '\\uD83C\uDCCF Anatomy Flashcards'),
                    h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700' }, (flashcardIdx + 1) + '/' + flashcardPool.length)
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Click the card to flip. Study ' + sys.name + ' structures.'),
                  flashcardPool.length > 0 ? h('div', { className: 'space-y-3' },
                    h('button', { 'aria-label': 'STRUCTURE NAME',
                      onClick: function() { upd('_flashcardFlipped', !flashcardFlipped); },
                      className: 'w-full min-h-[180px] rounded-xl p-5 border-2 transition-all text-left cursor-pointer hover:shadow-md ' +
                        (flashcardFlipped ? 'border-teal-400 bg-teal-50' : 'border-slate-300 bg-gradient-to-br from-white to-slate-50')
                    },
                      !flashcardFlipped ? h('div', null,
                        h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-3' }, 'STRUCTURE NAME'),
                        h('h3', { className: 'text-xl font-black text-slate-800 mb-2' }, flashcardPool[flashcardIdx % flashcardPool.length].name),
                        PRONUNCIATION[flashcardPool[flashcardIdx % flashcardPool.length].id] ? h('p', { className: 'text-xs text-indigo-500 italic' }, '\\uD83D\uDD0A ' + PRONUNCIATION[flashcardPool[flashcardIdx % flashcardPool.length].id]) : null,
                        h('p', { className: 'text-[11px] text-slate-600 mt-4' }, 'Tap to reveal function \\u2192')
                      ) : h('div', null,
                        h('p', { className: 'text-[11px] font-bold text-teal-600 uppercase mb-2' }, 'FUNCTION'),
                        h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, flashcardPool[flashcardIdx % flashcardPool.length].fn),
                        flashcardPool[flashcardIdx % flashcardPool.length].clinical ? h('div', { className: 'mt-2 pt-2 border-t border-teal-200' },
                          h('p', { className: 'text-[11px] font-bold text-rose-500 uppercase mb-0.5' }, '\\u26A0 Clinical'),
                          h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, flashcardPool[flashcardIdx % flashcardPool.length].clinical.substring(0, 200))
                        ) : null,
                        ttsBtn(flashcardPool[flashcardIdx % flashcardPool.length].fn)
                      )
                    ),
                    h('div', { className: 'flex gap-2 justify-between' },
                      h('button', { 'aria-label': 'Previous',
                        onClick: function() { var pi = flashcardIdx > 0 ? flashcardIdx - 1 : flashcardPool.length - 1; upd('_flashcardIdx', pi); upd('_flashcardFlipped', false); upd('selectedStructure', flashcardPool[pi].id); },
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-100 text-teal-700 hover:bg-teal-200 transition-all'
                      }, '\\u2190 Previous'),
                      h('button', { 'aria-label': 'Random',
                        onClick: function() {
                          var randIdx = Math.floor(Math.random() * flashcardPool.length);
                          upd('_flashcardIdx', randIdx); upd('_flashcardFlipped', false);
                          upd('selectedStructure', flashcardPool[randIdx].id);
                        },
                        className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all'
                      }, '\\uD83C\\uDFB2 Random'),
                      h('button', { 'aria-label': 'Next',
                        onClick: function() { var ni = (flashcardIdx + 1) % flashcardPool.length; upd('_flashcardIdx', ni); upd('_flashcardFlipped', false); upd('selectedStructure', flashcardPool[ni].id); },
                        className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-700 text-white hover:bg-teal-700 transition-all'
                      }, 'Next \\u2192')
                    )
                  ) : h('p', { className: 'text-xs text-slate-600 italic' }, 'No flashcards available for this complexity level.')
                )
              ) : null
            )
          ),

          // ── Clinical Cases section (advanced only) ──
          complexity >= 3 ? h('div', { className: 'mt-4 bg-rose-50 rounded-xl border border-rose-200 p-3' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-[11px] font-bold text-rose-600 uppercase tracking-wider' }, '\\uD83E\\uDE7A Clinical Cases (' + (d._clinicalSolved || 0) + ' solved)'),
              h('button', { onClick: function() { upd('_showClinical', !d._showClinical); },
                className: 'text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 transition-all'
              }, d._showClinical ? 'Hide' : 'Show Cases')
            ),
            d._showClinical ? h('div', { className: 'space-y-2' },
              CLINICAL_CASES.filter(function(c) { return !sysKey || c.system === sysKey || sysKey === 'skeletal'; }).slice(0, 3).map(function(cs, ci) {
                var isActive = activeCaseIdx === ci;
                return h('div', { key: cs.id, className: 'bg-white rounded-lg p-3 border border-rose-200' },
                  h('p', { className: 'text-xs font-bold text-rose-800 mb-1' }, cs.title + ' (' + cs.difficulty + ')'),
                  h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mb-2' }, cs.presentation),
                  h('p', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, cs.question),
                  isActive && activeCaseFeedback ? h('div', { className: 'mt-2 rounded-lg p-2 ' + (activeCaseFeedback === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200') },
                    h('p', { className: 'text-[11px] font-bold ' + (activeCaseFeedback === 'correct' ? 'text-green-800' : 'text-amber-800') }, activeCaseFeedback === 'correct' ? '\\u2705 Correct!' : '\\u274C Answer: ' + cs.answer),
                    h('p', { className: 'text-[11px] text-slate-600 leading-relaxed mt-1' }, cs.explanation)
                  ) : h('div', { className: 'flex gap-1 flex-wrap' },
                    h('button', { 'aria-label': 'I got it!',
                      onClick: function() {
                        upd('_activeCaseIdx', ci);
                        upd('_activeCaseFeedback', 'correct');
                        upd('_clinicalSolved', (d._clinicalSolved || 0) + 1);
                        playSound('clinicalCase');
                      },
                      className: 'px-2 py-1 rounded text-[11px] font-bold bg-green-50 text-green-700 border border-green-600 hover:bg-green-100 transition-all'
                    }, '\\u2705 I got it!'),
                    h('button', { 'aria-label': 'Reveal Answer',
                      onClick: function() {
                        upd('_activeCaseIdx', ci);
                        upd('_activeCaseFeedback', 'reveal');
                      },
                      className: 'px-2 py-1 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-600 hover:bg-amber-100 transition-all'
                    }, '\\uD83D\\uDC41 Reveal Answer')
                  )
                );
              })
            ) : null
          ) : null,

          // ── Badge section ──
          h('div', { className: 'mt-4 bg-slate-50 rounded-xl border border-slate-400 p-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\\uD83C\\uDFC5 Badges (' + Object.keys(badges).length + '/' + BADGE_DEFS.length + ')'),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              BADGE_DEFS.map(function(bd) {
                var earned = badges[bd.id];
                return h('div', {
                  key: bd.id,
                  title: bd.name + ': ' + bd.desc + ' (' + bd.xp + ' XP)',
                  className: 'px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ' +
                    (earned ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-200')
                }, bd.icon + ' ' + bd.name);
              })
            )
          ),

          // ── Stats Dashboard ──
          h('div', { className: 'mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-3' },
            h('p', { className: 'text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2' }, '\\uD83D\\uDCCA Exploration Stats'),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              // Structures Viewed
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-indigo-700' }, String(Object.keys(structuresViewed).length)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, 'Structures')
              ),
              // Systems Explored
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-emerald-600' }, String(Object.keys(systemsExplored).length) + '/10'),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, 'Systems')
              ),
              // Quiz Score
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-amber-600' }, String(totalCorrect)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, 'Quiz Correct')
              ),
              // Spotter Score
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-rose-600' }, String(spotterScore)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, 'Spotter IDs')
              ),
              // Pathways Completed
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-teal-600' }, String(Object.keys(pathwaysCompleted).length)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, 'Pathways')
              ),
              // Comparisons
              h('div', { className: 'bg-white rounded-lg p-2 text-center border border-indigo-100' },
                h('p', { className: 'text-lg font-black text-purple-600' }, String(comparisons)),
                h('p', { className: 'text-[11px] text-slate-600 font-semibold' }, 'Comparisons')
              )
            ),
            // Secondary stats row
            h('div', { className: 'mt-2 flex flex-wrap gap-2' },
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\\uD83D\\uDD25 Streak: ' + streak
              ),
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\\uD83E\\uDD16 AI Questions: ' + aiQuestions
              ),
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\\uD83E\\uDDE0 Mnemonics: ' + Object.keys(mnemonicsViewed).length
              ),
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\\uD83D\\uDD0D Searches: ' + searchFinds
              ),
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-slate-600 font-semibold' },
                '\\uD83E\\uDE7A Clinical Cases: ' + clinicalSolved
              ),
              spotterBestTime < 999 ? h('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold' },
                '\\u26A1 Best Spotter: ' + spotterBestTime.toFixed(1) + 's'
              ) : null
            ),
            // XP total
            getStemXP ? h('div', { className: 'mt-2 text-center' },
              h('span', { className: 'text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-300 text-amber-800' },
                '\\u2B50 Total XP: ' + (getStemXP() || 0)
              )
            ) : null,
            // Progress bar
            h('div', { className: 'mt-2' },
              h('div', { className: 'flex justify-between mb-1' },
                h('span', { className: 'text-[11px] text-slate-600 font-semibold' }, 'System Progress'),
                h('span', { className: 'text-[11px] font-bold text-indigo-600' }, progressPct + '%')
              ),
              h('div', { className: 'w-full bg-slate-200 rounded-full h-1.5' },
                h('div', {
                  className: 'h-1.5 rounded-full transition-all duration-500',
                  style: { width: progressPct + '%', background: 'linear-gradient(90deg, ' + sys.accent + ', #6366f1)' }
                })
              )
            )
          )

        );"""

# Apply restructure
restructured = content[:ai_tutor_index] + replacement + content[end_index + len(end_marker):]

with open(source_path, "w", encoding="utf-8") as f:
    f.write(restructured)

print("Restructured stem_tool_anatomy.js successfully!")
