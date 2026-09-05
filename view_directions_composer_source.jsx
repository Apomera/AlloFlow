// Saved directions and actions remain in the host. Unsubmitted goal-entry state
// stays local so keystrokes do not rerender the full workspace.
function DirectionsComposerView({
  ArrowRight,
  ClipboardList,
  Sparkles,
  X,
  _alloDirectionsGoalResources,
  _alloGoalOptionsForResource,
  _alloStationStyle,
  _mbDirectionsChoiceDraftChoices,
  _mbDirectionsChoicePreviewItems,
  _mbDirectionsChoiceReady,
  _mbDirectionsChoiceStaleCount,
  addDirectionsToPack,
  deriveDirectionsDraft,
  directionsDeriving,
  generateUUID,
  mbDirectionsDraft,
  directionsGoalEditorState,
  mbDirectionsGoalRes: legacyGoalRes,
  mbDirectionsGoalText: legacyGoalText,
  setMbDirectionsDraft,
  setMbDirectionsGoalRes: legacySetGoalRes,
  setMbDirectionsGoalText: legacySetGoalText,
  setShowDirectionsChoicePreview,
  setShowDirectionsComposer,
  showDirectionsChoicePreview,
  t
}) {
  // The host ref retains unfinished input across close/reopen without root state
  // updates. Legacy props keep already-open older shells compatible with this module.
  const fallbackGoalState = React.useRef({ resource: legacyGoalRes || '', text: legacyGoalText || '' });
  const goalState = directionsGoalEditorState || fallbackGoalState;
  const [mbDirectionsGoalRes, updateGoalRes] = React.useState(() => goalState.current.resource);
  const [mbDirectionsGoalText, updateGoalText] = React.useState(() => goalState.current.text);
  const setMbDirectionsGoalRes = value => {
    goalState.current.resource = value;
    updateGoalRes(value);
    if (legacySetGoalRes) legacySetGoalRes(value);
  };
  const setMbDirectionsGoalText = value => {
    goalState.current.text = value;
    updateGoalText(value);
    if (legacySetGoalText) legacySetGoalText(value);
  };
  return (
<div className="fixed inset-0 z-[395] bg-black/40 flex items-center justify-center p-4" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setShowDirectionsComposer(false); } }}>
          <div data-help-key="directions_composer" role="dialog" aria-modal="true" aria-label={t('directions.title') || 'Assignment Directions'} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={18} className="text-amber-600" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-800 flex-1">{t('directions.title') || 'Assignment Directions'}</h2>
              <button onClick={() => setShowDirectionsComposer(false)} aria-label={t('common.close') || 'Close'} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-all"><X size={16} /></button>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">{t('directions.subtitle') || 'Student-facing. Students see this first — in class, on homework QRs, and on the take-home shelf.'}</p>
            <div className="space-y-2">
              <input data-help-key="directions_title" autoFocus value={mbDirectionsDraft?.title || ''} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), title: e.target.value }))} placeholder={t('directions.title_placeholder') || "Title (e.g. Tonight's homework)"} aria-label={t('directions.title_aria') || 'Directions title'} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" />
              <textarea data-help-key="directions_body" value={mbDirectionsDraft?.body || ''} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), body: e.target.value }))} placeholder={t('directions.body_placeholder') || 'Directions for students: the steps, and what finished work looks like.'} aria-label={t('directions.body_aria') || 'Directions for students'} rows={6} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" />
              <input data-help-key="directions_due" value={mbDirectionsDraft?.due || ''} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), due: e.target.value }))} placeholder={t('directions.due_placeholder') || 'Due (optional, e.g. Friday)'} aria-label={t('directions.due_aria') || 'Due date'} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800" />
              <div className="border-t border-indigo-100 pt-2">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mbDirectionsDraft?.choiceBoard?.enabled === true}
                    onChange={e => setMbDirectionsDraft(p => {
                      const next = { ...(p || {}) };
                      if (!e.target.checked) {
                        delete next.choiceBoard;
                        return next;
                      }
                      next.choiceBoard = {
                        enabled: true,
                        title: next.choiceBoard?.title || 'Choose an activity',
                        prompt: next.choiceBoard?.prompt || 'Pick one activity to work on first. You can return here and choose another later.',
                        choices: Array.isArray(next.choiceBoard?.choices) ? next.choiceBoard.choices : []
                      };
                      return next;
                    })}
                    aria-label="Offer an activity choice board"
                    className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
                  />
                  <span className="text-[11px] font-bold text-indigo-900">Offer an activity choice board</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-1 ml-6">Students will see these pack activities as large, selectable cards on the directions page.</p>
                {mbDirectionsDraft?.choiceBoard?.enabled === true && (
                  <div className="mt-2 ml-6 space-y-2">
                    <input
                      value={mbDirectionsDraft.choiceBoard.title || ''}
                      onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), choiceBoard: { ...(p?.choiceBoard || {}), enabled: true, title: e.target.value } }))}
                      aria-label="Activity choice board title"
                      placeholder="Choose an activity"
                      className="w-full text-[11px] border border-indigo-200 rounded p-1.5 bg-white text-slate-800"
                    />
                    <textarea
                      value={mbDirectionsDraft.choiceBoard.prompt || ''}
                      onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), choiceBoard: { ...(p?.choiceBoard || {}), enabled: true, prompt: e.target.value } }))}
                      aria-label="Activity choice board instructions"
                      placeholder="Pick one activity to work on first."
                      rows={2}
                      className="w-full text-[11px] border border-indigo-200 rounded p-1.5 bg-white text-slate-800"
                    />
                    <div role="group" aria-label="Activities to include in the choice board" className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {_alloDirectionsGoalResources.map(it => {
                        const choices = Array.isArray(mbDirectionsDraft.choiceBoard.choices) ? mbDirectionsDraft.choiceBoard.choices : [];
                        const included = choices.some(choice => choice.resourceRef === it.id);
                        const full = choices.length >= 6 && !included;
                        const station = _alloStationStyle(it.type);
                        return (
                          <label key={it.id} className={'flex items-start gap-2 rounded-lg border p-2 cursor-pointer transition-colors ' + (included ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300')}>
                            <input
                              type="checkbox"
                              checked={included}
                              disabled={full}
                              onChange={() => setMbDirectionsDraft(p => {
                                const next = { ...(p || {}) };
                                const board = { ...(next.choiceBoard || {}), enabled: true };
                                const current = Array.isArray(board.choices) ? board.choices : [];
                                board.choices = current.some(choice => choice.resourceRef === it.id)
                                  ? current.filter(choice => choice.resourceRef !== it.id)
                                  : current.length >= 6
                                    ? current
                                    : [...current, { resourceRef: it.id, label: it.title || station.label, icon: station.icon || '', description: '' }];
                                next.choiceBoard = board;
                                return next;
                              })}
                              aria-label={'Include ' + (it.title || station.label) + ' in activity choice board'}
                              className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0"
                            />
                            <span className="min-w-0">
                              <span className="block text-[11px] font-bold text-slate-800 truncate">{station.icon || '•'} {it.title || station.label}</span>
                              <span className="block text-[9px] text-slate-500">{station.label}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <p className="text-[10px] text-slate-500">Choose 2–6 activities. Students can return to the directions page and choose another card later.</p>
                      <button
                        type="button"
                        onClick={() => setShowDirectionsChoicePreview(true)}
                        disabled={!_mbDirectionsChoiceReady}
                        aria-label="Preview student choice board"
                        className={'min-h-9 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-colors ' + (_mbDirectionsChoiceReady ? 'border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400')}
                      >
                        Preview student board
                      </button>
                    </div>
                    {_mbDirectionsChoiceStaleCount > 0 && (
                      <p role="alert" className="text-[10px] font-bold text-rose-700">{_mbDirectionsChoiceStaleCount} selected activit{_mbDirectionsChoiceStaleCount === 1 ? 'y is' : 'ies are'} no longer available in this pack. Remove {_mbDirectionsChoiceStaleCount === 1 ? 'it' : 'them'} before saving.</p>
                    )}
                    {_mbDirectionsChoiceDraftChoices.length === 1 && _mbDirectionsChoiceStaleCount === 0 && (
                      <p role="alert" className="text-[10px] font-bold text-amber-700">Select one more activity to enable the choice board.</p>
                    )}
                    {_mbDirectionsChoiceDraftChoices.length === 0 && _alloDirectionsGoalResources.length > 0 && (
                      <p role="status" className="text-[10px] text-slate-500">Select at least two activities to preview or save this board.</p>
                    )}
                    {_mbDirectionsChoiceDraftChoices.length > 0 && (
                      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-[10px] font-bold text-slate-700">Optional card descriptions</p>
                        {_mbDirectionsChoiceDraftChoices.map(choice => (
                          <input
                            key={'description-' + choice.resourceRef}
                            value={choice.description || ''}
                            onChange={e => setMbDirectionsDraft(p => ({
                              ...(p || {}),
                              choiceBoard: {
                                ...(p?.choiceBoard || {}),
                                enabled: true,
                                choices: (Array.isArray(p?.choiceBoard?.choices) ? p.choiceBoard.choices : []).map(item => item.resourceRef === choice.resourceRef ? { ...item, description: e.target.value } : item)
                              }
                            }))}
                            aria-label={'Description for ' + choice.label}
                            placeholder="Optional: what students will do here"
                            className="w-full rounded border border-slate-300 bg-white p-1.5 text-[10px] text-slate-800"
                          />
                        ))}
                      </div>
                    )}
                    {showDirectionsChoicePreview && (
                      <div className="fixed inset-0 z-[410] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDirectionsChoicePreview(false)}>
                        <div role="dialog" aria-modal="true" aria-labelledby="directions-choice-preview-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-50 p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                          <div className="mb-3 flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Student preview</p>
                              <h3 id="directions-choice-preview-title" className="text-base font-black text-slate-900">{mbDirectionsDraft.choiceBoard.title || 'Choose an activity'}</h3>
                              <p className="mt-1 text-xs text-slate-600">{mbDirectionsDraft.choiceBoard.prompt || 'Pick one activity to work on first.'}</p>
                            </div>
                            <button type="button" onClick={() => setShowDirectionsChoicePreview(false)} aria-label="Close student choice board preview" className="min-h-10 min-w-10 rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-100"><X size={16} aria-hidden="true" /></button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {_mbDirectionsChoicePreviewItems.map(({ choice, resource }) => {
                              const station = _alloStationStyle(resource.type);
                              return (
                                <article key={'preview-' + choice.resourceRef} className="flex min-h-24 items-start gap-3 rounded-xl border-2 border-indigo-100 bg-white p-3 shadow-sm">
                                  <span aria-hidden="true" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white shadow-sm">{choice.icon || station.icon || '•'}</span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-black text-slate-800">{choice.label}</span>
                                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-indigo-700">{station.label}</span>
                                    {choice.description && <span className="mt-1 block text-xs leading-5 text-slate-600">{choice.description}</span>}
                                    <span className="mt-2 block text-[11px] font-bold text-indigo-700">Open activity <ArrowRight size={12} className="inline" aria-hidden="true" /></span>
                                  </span>
                                </article>
                              );
                            })}
                          </div>
                          <p className="mt-3 text-[10px] text-slate-500">This preview shows the cards students will see on the directions page.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 pt-2">
                <p className="text-[11px] font-bold text-slate-600 mb-1">{t('directions.objectives') || 'Goals (auto-check where possible)'}</p>
                {(mbDirectionsDraft?.objectives || []).map((o, oi) => (
                  <div key={o.id} className="flex items-center gap-1.5 mb-1">
                    <span className={'text-[9px] font-bold uppercase rounded px-1 py-0.5 flex-shrink-0 ' + (o.kind === 'xp' ? 'bg-indigo-50 text-indigo-700' : (o.kind === 'game' ? 'bg-emerald-50 text-emerald-700' : (o.kind === 'manual' ? 'bg-slate-100 text-slate-600' : 'bg-sky-50 text-sky-700')))}>{o.kind === 'manual' ? (t('directions.kind_manual') || 'self-check') : (o.kind === 'visited' ? (t('directions.kind_visited') || 'opened') : (o.kind === 'responded' ? (t('directions.kind_responded') || 'answered') : (o.kind === 'completed' ? (t('directions.kind_completed') || 'finished') : (o.kind === 'time' ? (t('directions.kind_time') || 'time') : o.kind))))}</span>
                    <input value={o.label} onChange={e => setMbDirectionsDraft(p => { const list = [...((p && p.objectives) || [])]; list[oi] = { ...list[oi], label: e.target.value }; return { ...(p || {}), objectives: list }; })} aria-label={t('directions.objective_label') || 'Goal label'} className="flex-1 min-w-0 text-[11px] border border-slate-200 rounded p-1 bg-white text-slate-800" />
                    {o.kind === 'xp' && <input type="number" min="1" max="1000" value={o.amount || 25} onChange={e => setMbDirectionsDraft(p => { const list = [...((p && p.objectives) || [])]; const amt = Math.max(1, Math.min(1000, Number(e.target.value) || 1)); list[oi] = { ...list[oi], amount: amt }; return { ...(p || {}), objectives: list }; })} aria-label={t('directions.xp_amount') || 'XP amount'} className="w-14 text-[11px] border border-slate-200 rounded p-1 bg-white text-slate-800 flex-shrink-0" />}
                    {o.kind === 'time' && <input type="number" min="1" max="240" value={o.minutes || 10} onChange={e => setMbDirectionsDraft(p => { const list = [...((p && p.objectives) || [])]; const mins = Math.max(1, Math.min(240, Number(e.target.value) || 1)); list[oi] = { ...list[oi], minutes: mins }; return { ...(p || {}), objectives: list }; })} aria-label={t('directions.time_minutes') || 'Minutes'} className="w-14 text-[11px] border border-slate-200 rounded p-1 bg-white text-slate-800 flex-shrink-0" />}
                    <button onClick={() => setMbDirectionsDraft(p => ({ ...(p || {}), objectives: ((p && p.objectives) || []).filter(x => x.id !== o.id) }))} aria-label={t('directions.remove_objective') || 'Remove goal'} className="text-slate-400 hover:text-rose-600 p-0.5 flex-shrink-0"><X size={12} /></button>
                  </div>
                ))}
                {/* Write-your-own comes FIRST: most goals a teacher actually wants
                    ("explain it in your own words") can never be auto-checked, and
                    burying that behind a row of game chips taught the opposite. */}
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    value={mbDirectionsGoalText}
                    onChange={e => setMbDirectionsGoalText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key !== 'Enter' || !mbDirectionsGoalText.trim()) return;
                      e.preventDefault();
                      setMbDirectionsDraft(p => ({ ...(p || {}), objectives: [...((p && p.objectives) || []), { id: generateUUID(), kind: 'manual', label: mbDirectionsGoalText.trim() }] }));
                      setMbDirectionsGoalText('');
                    }}
                    placeholder={t('directions.goal_write_placeholder') || 'Write a goal in your own words…'}
                    aria-label={t('directions.goal_write_label') || 'Write a goal'}
                    className="flex-1 min-w-0 text-[11px] border border-slate-300 rounded p-1.5 bg-white text-slate-800"
                  />
                  <button
                    onClick={() => {
                      if (!mbDirectionsGoalText.trim()) return;
                      setMbDirectionsDraft(p => ({ ...(p || {}), objectives: [...((p && p.objectives) || []), { id: generateUUID(), kind: 'manual', label: mbDirectionsGoalText.trim() }] }));
                      setMbDirectionsGoalText('');
                    }}
                    disabled={!mbDirectionsGoalText.trim()}
                    className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 hover:border-slate-400 rounded px-2 py-1 transition-all disabled:opacity-40 flex-shrink-0"
                  >+ {t('directions.goal_add') || 'Add'}</button>
                </div>
                {/* Auto-checking goals are DERIVED from the resource, never a fixed
                    chip row. A fixed row is how "+ Word Scramble" survived for weeks
                    pointing at a game that never reported a completion. */}
                <div className="mt-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1" htmlFor="dir-goal-res">{t('directions.goal_attach') || 'Auto-check against a resource'}</label>
                  <select
                    id="dir-goal-res"
                    value={mbDirectionsGoalRes}
                    onChange={e => setMbDirectionsGoalRes(e.target.value)}
                    className="w-full text-[11px] border border-slate-300 rounded p-1.5 bg-white text-slate-800"
                  >
                    <option value="">{_alloDirectionsGoalResources.length ? (t('directions.goal_pick_resource') || 'Pick something in this pack…') : (t('directions.goal_no_resources') || 'No pack resources yet')}</option>
                    {_alloDirectionsGoalResources.map(it => (
                      <option key={it.id} value={it.id}>{(_alloStationStyle(it.type).icon || '') + ' ' + (it.title || it.type)}</option>
                    ))}
                  </select>
                  {mbDirectionsGoalRes && (() => {
                    const _res = _alloDirectionsGoalResources.find(it => it.id === mbDirectionsGoalRes);
                    const _opts = _alloGoalOptionsForResource(_res);
                    if (!_opts.length) return null;
                    return (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {_opts.map(opt => (
                          <button
                            key={opt.kind + ':' + (opt.gameType || '')}
                            onClick={() => setMbDirectionsDraft(p => ({ ...(p || {}), objectives: [...((p && p.objectives) || []), {
                              id: generateUUID(),
                              kind: opt.kind,
                              label: t(opt.labelKey, { title: (_res && _res.title) || '' }) || opt.label,
                              ...(opt.gameType ? { gameType: opt.gameType } : {}),
                              ...(opt.minutes ? { minutes: opt.minutes } : {}),
                              ...(opt.kind === 'manual' ? {} : { resourceRef: mbDirectionsGoalRes })
                            }] }))}
                            className={'text-[10px] font-bold rounded-full px-2 py-0.5 border transition-all ' + (opt.kind === 'game' ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:border-emerald-400' : (opt.kind === 'manual' ? 'text-slate-600 bg-slate-50 border-slate-200 hover:border-slate-400' : 'text-sky-700 bg-sky-50 border-sky-200 hover:border-sky-400'))}
                          >+ {opt.label}</button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <button onClick={() => setMbDirectionsDraft(p => ({ ...(p || {}), objectives: [...((p && p.objectives) || []), { id: generateUUID(), kind: 'xp', amount: 25, label: 'Earn 25 XP' }] }))} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 rounded-full px-2 py-0.5 transition-all">+ XP</button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{t('directions.objectives_note') || "Goals check off on the student's device — a formative guide, not a grade, and nothing is ever locked."}</p>
                {(mbDirectionsDraft?.objectives || []).length > 0 && (
                  <label className="flex items-center gap-1.5 mt-1 cursor-pointer select-none">
                    <input type="checkbox" checked={mbDirectionsDraft?.softGate === true} onChange={e => setMbDirectionsDraft(p => ({ ...(p || {}), softGate: e.target.checked }))} className="w-3.5 h-3.5 accent-amber-600" />
                    <span className="text-[10px] text-slate-600">{t('directions.soft_gate_label') || 'Gently suggest finishing goals before the rest of the pack (a friendly tip — never a lock)'}</span>
                  </label>
                )}
              </div>
              <button data-help-key="directions_draft" onClick={deriveDirectionsDraft} disabled={directionsDeriving} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-indigo-800 hover:text-indigo-900 bg-indigo-50 border border-indigo-300 hover:border-indigo-400 rounded-lg p-2 transition-all disabled:opacity-60">
                <Sparkles size={13} /> {directionsDeriving ? (t('directions.drafting') || 'Drafting…') : (t('directions.draft_for_me') || 'Draft for me (from lesson plan + pack)')}
              </button>
              <div className="flex gap-2">
                <button data-help-key="directions_add_pack" onClick={addDirectionsToPack} className="flex-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 hover:border-emerald-400 rounded-lg p-2 transition-all">{t('directions.add') || 'Add to pack'}</button>
                <button onClick={() => setShowDirectionsComposer(false)} className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 transition-all">{t('common.cancel') || 'Cancel'}</button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">{t('directions.review_note') || 'AI drafts are a starting point — review before adding. You know your students; the AI does not.'}</p>
            </div>
          </div>
        </div>
  );
}
