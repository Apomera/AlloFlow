              ) : activeTab === 'pathways' ? (
                // Pathways Panel
                h('div', { className: 'anatomy-pathway-panel bg-white rounded-xl border-2 border-rose-200 p-4 space-y-3', 'data-anatomy-pathway-panel':true, 'data-anatomy-pathway-id':activePathwayId||'' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('h4', { className: 'font-bold text-rose-800 text-sm' }, t('stem.anatomy.physiological_pathways', '\uD83D\uDEE4 Physiological Pathways')),
                    h('span', { className: 'text-[0.6875rem] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700' }, Object.keys(pathwaysCompleted).length + '/' + PATHWAYS.length + ' ' + t('stem.anatomy.route_completed','completed'))
                  ),
                  h('p', { className: 'text-xs text-slate-600 mb-3', dir:'auto' }, t('stem.anatomy.trace_step_by_step_how_blood_flows_air', 'Trace step-by-step how blood flows, air moves, food digests, or nerve signals travel through the body.')),
                  !activePathwayId ? h('div', null,
                    h('h5',{id:'anatomy-pathway-menu-title',tabIndex:-1},t('stem.anatomy.pathway_flow_choose','Choose a pathway')),
                    h('div', { className: 'grid grid-cols-2 gap-2', 'data-anatomy-pathway-choices':true },
                      PATHWAYS.map(function(pw) {
                        var isDone = pathwaysCompleted[pw.id], saved = pathwaySessions[pw.id], summary = pathwayCheckSummary(pw.id);
                        var savedAnswered = saved && saved.recap ? Object.keys(saved.recap.answers).length : 0;
                        return h('button', { key: pw.id, type:'button', 'data-anatomy-pathway-choice':pw.id, 'data-session':saved?'resumed':'new',
                          onClick: function() { openPathway(pw.id); },
                          className: 'text-left rounded-xl p-3 border-2 transition-all ' + (isDone ? 'border-rose-600 bg-rose-50' : 'transition-colors border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 active:scale-[0.97]')
                        },
                          h('div', { className: 'flex items-center gap-2 mb-1' },
                            h('span', { className: 'text-lg', 'aria-hidden':true }, pw.icon),
                            h('span', { className: 'text-xs font-black', style: { color: ({ '#ef4444': '#b91c1c', '#3b82f6': '#1d4ed8', '#16a34a': '#166534', '#eab308': '#854d0e' })[pw.color] || pw.color } }, pw.title),
                            isDone ? h('span', { className: 'ml-auto text-[0.6875rem] text-emerald-500 font-bold' }, '\u2713') : null
                          ),
                          h('p', { className: 'text-[0.6875rem] text-slate-600 leading-relaxed', dir:'auto' }, pw.desc),
                          h('p',{className:'anatomy-pathway-session-label'},saved?t('stem.anatomy.pathway_flow_resume','Resume saved progress'):t('stem.anatomy.pathway_flow_start','Start pathway')),
                          saved && h('p',{className:'anatomy-pathway-session-help'},t('stem.anatomy.pathway_flow_bookmark','Step {step} of {total} · {answered}/{checks} checks answered').replace('{step}',String(saved.step+1)).replace('{total}',String(pw.steps.length)).replace('{answered}',String(savedAnswered)).replace('{checks}',String(pathwayQuestions(pw).length))),
                          summary ? h('p', {'data-anatomy-pathway-score':pw.id}, summary.correct+'/'+summary.total+' '+t('stem.anatomy.route_latest_score', 'correct on the latest completed concept check')) : null
                        );
                      })
                    )
                  ) : (function() {
                    var pw = activePathway;
                    if (!pw) return null;
                    var routeAccent = ({ '#ef4444': '#b91c1c', '#3b82f6': '#1d4ed8', '#16a34a': '#166534', '#eab308': '#854d0e' })[pw.color] || pw.color; var step = pw.steps[pathwayStepIdx];
                    var stepContext = step ? findStructureContext(step.structure, sysKey) : null;
                    var stepViewMatches = !stepContext || stepContext.structure.v === 'b' || (stepContext.structure.v === 'a' ? view === 'anterior' : view === 'posterior');
                    var diagramMatchesStep = !!stepContext && stepContext.systemId === sysKey && stepViewMatches && selectedStructureId === step.structure;
                    return h('div', { className: 'space-y-3' },
                      h('div', { className: 'flex items-center gap-2 mb-2' },
                        h('span', { className: 'text-lg', 'aria-hidden':true }, pw.icon),
                        h('span', { className: 'text-sm font-black', style: { color: routeAccent } }, pw.title),
                        h('button', { type:'button', 'data-anatomy-pathway-list-back':true,
                          onClick:closePathway,
                          className: 'transition-colors ml-auto text-[0.6875rem] font-bold text-slate-600 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 active:scale-[0.97]'
                        }, t('stem.anatomy.pathway_flow_back_list','Back to pathways'))
                      ),
                      h('div', { className: 'flex items-center justify-between mb-2' },
                        h('span', { className: 'anatomy-route-progress-label text-xs font-bold px-2 py-0.5 rounded-full', style: { background: pw.color + '18', color: routeAccent } }, t('stem.anatomy.route_step_number','Step {step} of {total}').replace('{step}',String(pathwayStepIdx + 1)).replace('{total}',String(pw.steps.length))),
                        h('div', { className: 'flex-1 mx-3 h-1.5 rounded-full bg-slate-100 overflow-hidden', role: 'progressbar', 'aria-label': pw.title + ': ' + t('stem.anatomy.route_progress','Pathway progress'), 'aria-valuemin': 0, 'aria-valuemax': pw.steps.length, 'aria-valuenow': pathwayStepIdx + 1 },
                          h('div', { className: 'h-full rounded-full transition-all', style: { width: (((pathwayStepIdx + 1) / pw.steps.length) * 100) + '%', background: routeAccent } })
                        )
                      ),
                      h('label', {className:'anatomy-route-jump',htmlFor:'anatomy-pathway-jump'}, t('stem.anatomy.route_jump', 'Go to step'), h('select',{id:'anatomy-pathway-jump',value:pathwayStepIdx,onChange:function(event){changePathwayStep(Number(event.target.value),false);}},pw.steps.map(function(item,index){return h('option',{key:index,value:index},(index+1)+'. '+item.label);}))),
                      pathwayCheckReturn && h('div',{className:'anatomy-pathway-check-return','data-anatomy-pathway-check-return':true},
                        h('p',null,t('stem.anatomy.pathway_flow_saved','Your answers are saved. Review this step, then return to the same question.')),
                        h('button',{type:'button','data-anatomy-pathway-check-resume':true,onClick:resumePathwayCheck},t('stem.anatomy.pathway_flow_return','Return to checks · Question {question}').replace('{question}',String(pathwayQuestions(pw).findIndex(function(question){return question.id===pathwayCheckReturn.questionId;})+1)))
                      ),
                      pathwayRecapActive ? renderPathwayRecap(pw) : step ? h('div', { className: 'rounded-xl p-4 border-2', 'data-anatomy-pathway-step':pathwayStepIdx, tabIndex:-1, role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', dir:'auto', style: { borderColor: pw.color + '40', background: pw.color + '08' } },
                        h('h5', { className: 'font-bold text-sm mb-2', style: { color: routeAccent } }, (pathwayStepIdx + 1) + '. ' + step.label),
                        h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
                          h('span', { className: 'text-[0.6875rem] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600' }, t('stem.anatomy.route_diagram_context','Diagram: {system} - {view}').replace('{system}',sys.name).replace('{view}',view === 'anterior' ? t('stem.anatomy.route_anterior','Anterior') : t('stem.anatomy.route_posterior','Posterior'))),
                          h('button', {type:'button',
                            'data-anatomy-pathway-diagram':true, onClick: function() { showPathwayDiagram(step); },
                            className: 'px-2 py-0.5 rounded text-[0.6875rem] font-bold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 active:scale-[0.97]'
                          }, diagramMatchesStep ? t('stem.anatomy.route_show_marker', 'Show marker on diagram') : t('stem.anatomy.route_focus_diagram','Focus diagram'))
                        ),
                        h('p', { className: 'text-xs text-slate-700 leading-relaxed mb-2' }, step.detail),
                        step.scope && h('p',{className:'anatomy-route-scope','data-anatomy-pathway-scope':step.structure},h('strong',null,t('stem.anatomy.route_marker_scope', 'What this marker shows: ')),step.scope),
                        h('a',{href:pw.reference,target:'_blank',rel:'noopener noreferrer',className:'anatomy-route-reference'},t('stem.anatomy.route_reference', 'Read about this pathway — OpenStax')),
                        ttsBtn(step.detail + (step.scope ? ' ' + step.scope : ''), t('stem.anatomy.read_step_aloud', 'Read this step aloud'))
                      ) : null,
                      pathwayRecapActive ? null : h('div', { className: 'flex gap-2 justify-between' },
                        h('button', { type:'button', 'aria-label': t('stem.anatomy.previous_3', 'Previous'),
                          onClick: function() { changePathwayStep(pathwayStepIdx-1,true); },
                          disabled: pathwayStepIdx === 0,
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold transition-all ' + (pathwayStepIdx === 0 ? 'bg-slate-100 text-slate-600' : 'transition-colors bg-rose-100 text-rose-800 hover:bg-rose-200 active:scale-[0.97]')
                        }, t('stem.anatomy.previous_4', '\u2190 Previous')),
                        pathwayStepIdx < pw.steps.length - 1 ? h('button', { type:'button', 'aria-label': t('stem.anatomy.next_pathway_step', 'Next pathway step'),
                          onClick: function() { changePathwayStep(pathwayStepIdx+1,true); },
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition-all',
                          style: { background: routeAccent }
                        }, t('stem.anatomy.next_6', 'Next \u2192')) : getPathwayRecapQuestions().length >= 2 ? h('button', { type:'button', 'aria-label': t('stem.anatomy.pathway_recap_open', 'Check what you traced'), 'data-anatomy-pathway-recap-open': 'true',
                          onClick: function() { openPathwayChecks(false); },
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-800 text-white hover:bg-rose-900 transition-all active:scale-[0.97]'
                        }, pathwayCheckReturn ? t('stem.anatomy.pathway_flow_return','Return to checks · Question {question}').replace('{question}',String(pathwayQuestions(pw).findIndex(function(question){return question.id===pathwayCheckReturn.questionId;})+1)) : t('stem.anatomy.pathway_recap_open_2', '\u2713 Check what you traced \u2192')) : h('button', { type:'button', 'aria-label': t('stem.anatomy.complete_pathway', 'Complete Pathway!'),
                          onClick: function() { completeActivePathway(pw,true); },
                          className: 'px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-all active:scale-[0.97]'
                        }, t('stem.anatomy.complete_pathway_2', '\uD83C\uDFC6 Complete Pathway!'))
                      )
                    );
                  })()
                )
