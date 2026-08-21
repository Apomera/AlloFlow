const ConceptQuestTeacherControls = React.memo(function ConceptQuestTeacherControls(props) {
  const { sessionData, activeSessionCode, appId, addToast, callGemini, t } = props;
  const tr = (key, fallback, params = {}) => {
    const fullKey = `concept_quest.${key}`;
    const translated = typeof t === 'function' ? t(fullKey, params) : '';
    if (typeof translated === 'string' && translated && translated !== fullKey) return translated;
    return Object.keys(params).reduce((text, name) => text.replace(`{${name}}`, params[name]), fallback);
  };
  const gameLabel = (entry, type) => {
    if (!entry) return '';
    const key = entry.nameKey || entry.labelKey || (entry.id ? `${type}_${entry.id}_name` : '');
    return key ? tr(key, entry.name || '') : (entry.name || '');
  };
  const escapeState = sessionData?.escapeRoomState;
  const quest = escapeState?.conceptQuest;
  const engine = window.AlloModules?.ConceptQuestEngine;
  const progress = escapeState?.teamProgress?.All || {};
  const votes = progress.questVotes || {};
  const actions = progress.questActions || {};
  const roles = progress.questRoles || {};
  const currentRoom = engine?.getRoom?.(quest, quest?.currentRoomId);
  const [gmType, setGmType] = React.useState('narrative');
  const [gmItemEffect, setGmItemEffect] = React.useState('shield');
  const [gmRequest, setGmRequest] = React.useState('');
  const [gmDraft, setGmDraft] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  if (!quest || !engine) return null;

  const sessionRef = () => doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
  const sync = async updates => {
    try {
      await updateDoc(sessionRef(), updates);
      return true;
    } catch (error) {
      warnLog('Concept Quest sync failed:', error);
      addToast?.(tr('sync_failed', 'Concept Quest could not sync.'), 'error');
      return false;
    }
  };
  const syncQuest = (nextQuest, clearField) => {
    const updates = { 'escapeRoomState.conceptQuest': nextQuest };
    if (clearField) updates[`escapeRoomState.teamProgress.All.${clearField}`] = {};
    if (nextQuest.phase === 'complete') updates['escapeRoomState.teamProgress.All.isEscaped'] = true;
    return sync(updates);
  };
  const showEngineError = (result, tone) => {
    if (!result?.error) return false;
    const message = result.errorKey ? tr(result.errorKey, result.error, result.errorParams || {}) : result.error;
    addToast?.(message, tone);
    return true;
  };
  const resolveTravel = async roomId => {
    setBusy(true);
    const result = engine.resolveTravel(quest, votes, roomId);
    if (!showEngineError(result, 'warning')) await syncQuest(result.quest, 'questVotes');
    setBusy(false);
  };
  const resolveRound = async () => {
    setBusy(true);
    const result = engine.resolveBattle(quest, actions, roles);
    if (!showEngineError(result, 'warning')) {
      await syncQuest(result.quest, 'questActions');
      addToast?.(tr('checks_succeeded', '{correct}/{total} concept checks succeeded.', {
        correct: result.summary.correct,
        total: result.summary.total,
      }), result.summary.enemyDefeated ? 'success' : 'info');
    }
    setBusy(false);
  };
  const manualDraft = () => {
    const description = gmRequest.trim() || tr('manual_default_description', 'A new development asks the party to apply the current concept together.');
    const title = gmType === 'item'
      ? tr('draft_title_item', 'Concept Relic')
      : gmType === 'enemy'
        ? tr('draft_title_enemy', 'Misconception Appears')
        : gmType === 'challenge'
          ? tr('draft_title_challenge', 'GM Challenge')
          : tr('draft_title_story', 'Story Event');
    const base = { type: gmType, title, description };
    if (gmType === 'item') {
      base.item = { name: tr('draft_title_item', 'Concept Relic'), emoji: '🎁', description, effect: { type: gmItemEffect, amount: 2 } };
    }
    if (gmType === 'challenge') base.challenge = currentRoom?.challenge;
    if (gmType === 'enemy') {
      base.enemy = { name: tr('teacher_created_enemy', 'Teacher-Created Misconception'), emoji: '👾', hp: 8, attack: 2 };
      base.challenge = currentRoom?.challenge;
    }
    setGmDraft(engine.normalizeGmDraft(base, quest.localizedStrings));
  };
  const aiDraft = async () => {
    if (typeof callGemini !== 'function') {
      manualDraft();
      addToast?.(tr('ai_unavailable_manual', 'AI is unavailable, so an editable manual draft was created.'), 'info');
      return;
    }
    setBusy(true);
    try {
      const prompt = `You assist a teacher co-GMing a cooperative educational dungeon crawler. Draft ONE ${gmType} grounded in "${currentRoom?.concept}". Teacher direction: "${gmRequest || 'Make it engaging and instructionally useful.'}". Return only JSON with type, title, description. For item include item{name,emoji,description,effect{type:heal|shield|clue,amount:1-3}}. For challenge include challenge{prompt,options,correctIndex,explanation}. For enemy include enemy{name,emoji,hp:4-16,attack:1-3} and challenge. Do not determine student outcomes.`;
      const response = await callGemini(prompt, true);
      const jsonText = String(response || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      setGmDraft(engine.normalizeGmDraft(JSON.parse(jsonText), quest.localizedStrings));
    } catch (error) {
      warnLog('Concept Quest AI draft failed:', error);
      manualDraft();
      addToast?.(tr('ai_draft_failed', 'AI draft failed; an editable manual draft is ready.'), 'warning');
    } finally {
      setBusy(false);
    }
  };
  const publishDraft = async () => {
    const nextQuest = engine.publishGmDraft(quest, gmDraft);
    if (await syncQuest(nextQuest, gmDraft?.type === 'enemy' ? 'questActions' : null)) {
      setGmDraft(null);
      setGmRequest('');
      addToast?.(tr('event_published', 'GM event published to every student.'), 'success');
    }
  };
  const adjustEncounter = async (kind, amount) => {
    const result = engine.adjustEncounter(quest, kind, amount);
    if (!showEngineError(result, 'warning')) await syncQuest(result.quest);
  };
  const useSharedItem = async index => {
    const result = engine.useItem(quest, index);
    if (!showEngineError(result, 'warning') && await syncQuest(result.quest)) {
      addToast?.(tr('item_used', '{name} used.', { name: result.item.name }), 'success');
    }
  };
  const undoLastGmChange = async () => {
    const result = engine.undoLastGmChange(quest);
    if (!showEngineError(result, 'info') && await syncQuest(result.quest)) {
      addToast?.(tr('undo_success', 'Last GM change undone.'), 'success');
    }
  };
  const dismissGmEvent = async () => {
    await syncQuest(engine.dismissEvent(quest));
  };
  const participantCount = Object.keys(sessionData?.roster || {}).length;
  const voteCounts = (currentRoom?.neighbors || [])
    .map(id => ({ room: engine.getRoom(quest, id), count: Object.values(votes).filter(value => value === id).length }))
    .filter(entry => entry.room);
  const enemy = currentRoom?.enemy;
  const roleCounts = (quest.roles || engine.ROLES || []).map(role => ({
    ...role,
    count: Object.values(roles).filter(value => value === role.id).length,
  }));
  const debrief = engine.createDebrief(quest);
  const phaseLabel = tr(`phase_${quest.phase}`, quest.phase);

  return (
    <div className="mb-4 rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-indigo-950">{tr('teacher_heading', '🗺️ Concept Quest · Teacher co-GM')}</h3>
          <p className="text-sm text-indigo-700">{tr('turn_room_phase', 'Turn {turn} · {room} · {phase}', { turn: quest.turn, room: currentRoom?.name || '', phase: phaseLabel })}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => sync({ 'escapeRoomState.isPaused': !escapeState.isPaused })} className="min-h-11 rounded-lg bg-amber-100 px-3 text-sm font-bold text-amber-900">{escapeState.isPaused ? tr('resume', 'Resume') : tr('pause', 'Pause')}</button>
          <button type="button" onClick={() => sync({ 'escapeRoomState.isActive': false })} className="min-h-11 rounded-lg bg-red-600 px-3 text-sm font-bold text-white">{tr('end_quest', 'End quest')}</button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-indigo-200 bg-white p-3" aria-labelledby="cq-resolve-heading">
          <h4 id="cq-resolve-heading" className="font-black text-slate-900">{tr('resolve_turn', 'Resolve the cooperative turn')}</h4>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <div className="rounded-lg bg-emerald-50 p-2"><strong className="block text-lg text-emerald-700">{quest.party.hp}/{quest.party.maxHp}</strong>{tr('party_hp', 'Party HP')}</div>
            <div className="rounded-lg bg-blue-50 p-2"><strong className="block text-lg text-blue-700">{Object.keys(votes).length}/{participantCount}</strong>{tr('votes', 'Votes')}</div>
            <div className="rounded-lg bg-purple-50 p-2"><strong className="block text-lg text-purple-700">{Object.keys(actions).length}/{participantCount}</strong>{tr('actions', 'Actions')}</div>
            <div className="rounded-lg bg-cyan-50 p-2"><strong className="block text-lg text-cyan-700">{(quest.sigils || []).length}/{quest.sigilsRequired || 3}</strong>{tr('concept_sigils', 'Concept sigils')}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label={tr('role_distribution_aria', 'Party role distribution')}>
            {roleCounts.map(role => <span key={role.id} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{role.emoji} {gameLabel(role, 'role')}: <strong>{role.count}</strong></span>)}
          </div>
          {quest.lastRound && (
            <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-xs text-cyan-950">
              <strong>{tr('last_round', 'Last round:')}</strong>{' '}
              {tr('round_damage_summary', '{correct}/{total} correct · {damage} damage', { correct: quest.lastRound.correct, total: quest.lastRound.total, damage: quest.lastRound.damage })}
              {quest.lastRound.combo ? ` · ${tr('concept_combo', 'Concept Combo!')}` : ''}
              {quest.lastRound.synergyCount ? ` · ${tr('role_synergies_count', '{count} role synergies', { count: quest.lastRound.synergyCount })}` : ''}
              {quest.lastRound.assistedCount ? ` · ${tr('peer_assists_count', '{count} peer assists', { count: quest.lastRound.assistedCount })}` : ''}
              {quest.lastRound.encounterRule && <p className="mt-1">{quest.lastRound.encounterRule}</p>}
            </div>
          )}
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
            <p className="text-xs font-bold text-amber-900">{tr('pacing_controls', 'Quick pacing controls')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => adjustEncounter('heal', 3)} className="min-h-11 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white">{tr('rally_hp', 'Rally +3 HP')}</button>
              <button type="button" onClick={() => adjustEncounter('shield', 2)} className="min-h-11 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white">{tr('grant_shield', 'Grant +2 shield')}</button>
              {quest.phase === 'battle' && <>
                <button type="button" onClick={() => adjustEncounter('enemy', -3)} className="min-h-11 rounded-lg bg-purple-700 px-3 text-xs font-bold text-white">{tr('soften_enemy', 'Soften enemy −3')}</button>
                <button type="button" onClick={() => adjustEncounter('enemy', 3)} className="min-h-11 rounded-lg border border-purple-300 bg-white px-3 text-xs font-bold text-purple-800">{tr('harden_enemy', 'Harden enemy +3')}</button>
              </>}
            </div>
          </div>
          {quest.phase === 'explore' && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-600">{tr('select_connected_room', 'Select a connected room or honor the leading vote.')}</p>
              {voteCounts.map(({ room, count }) => <button key={room.id} type="button" disabled={busy} onClick={() => resolveTravel(room.id)} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-indigo-200 px-3 text-sm font-bold text-indigo-800 hover:bg-indigo-50"><span>{room.emoji} {room.name}</span><span>{tr(count === 1 ? 'vote_count_one' : 'vote_count_many', count === 1 ? '{count} vote' : '{count} votes', { count })}</span></button>)}
            </div>
          )}
          {quest.phase === 'battle' && (
            <div className="mt-3 rounded-lg bg-fuchsia-50 p-3">
              <p className="font-bold text-fuchsia-900">{enemy?.emoji} {enemy?.name}: {enemy?.hp}/{enemy?.maxHp} HP</p>
              <p className="mt-1 text-sm text-slate-700">{currentRoom?.challenge?.prompt}</p>
              {currentRoom?.kind === 'puzzle' && <p className="mt-1 text-xs font-bold text-cyan-800">{tr('reasoning_lock_teacher', 'Reasoning Lock: two-thirds accuracy unlocks bonus damage.')}</p>}
              {currentRoom?.kind === 'boss' && <p className="mt-1 text-xs font-bold text-amber-800">{tr('mastery_barrier_teacher', 'Mastery Barrier: 60% accuracy breaks the shield.')}</p>}
              <p className="mt-1 text-xs text-slate-600">{tr('planned_assists', '{count} planned peer assist(s)', { count: Object.values(actions).filter(action => action?.supportTargetUid).length })}</p>
              <button type="button" disabled={busy || !Object.keys(actions).length} onClick={resolveRound} className="mt-3 min-h-11 w-full rounded-lg bg-fuchsia-700 px-3 font-bold text-white disabled:opacity-50">{tr(Object.keys(actions).length === 1 ? 'resolve_action_one' : 'resolve_actions_many', Object.keys(actions).length === 1 ? 'Resolve {count} action' : 'Resolve {count} actions', { count: Object.keys(actions).length })}</button>
            </div>
          )}
          {(quest.phase === 'complete' || quest.phase === 'defeat') && <p className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{tr('story_reached', 'The story reached {phase}. You can still publish an epilogue, support item, or new encounter.', { phase: phaseLabel })}</p>}
        </section>

        <section className="rounded-xl border border-purple-200 bg-white p-3" aria-labelledby="cq-gm-heading">
          <h4 id="cq-gm-heading" className="font-black text-slate-900">{tr('co_gm_workshop', 'Co-GM workshop')}</h4>
          <p className="text-xs text-slate-600">{tr('ai_draft_notice', 'AI only drafts. You preview, edit, and publish every change.')}</p>
          {quest.activeEvent && <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs"><strong>{quest.activeEvent.title}</strong><p>{quest.activeEvent.description}</p><button type="button" onClick={dismissGmEvent} className="mt-2 min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-bold text-amber-900">{tr('dismiss_announcement', 'Dismiss announcement')}</button></div>}
          <div className="mt-2 flex justify-end"><button type="button" disabled={!quest.gmUndo} onClick={undoLastGmChange} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-40">{tr('undo_gm_change', 'Undo GM change')}{(quest.gmHistory || []).length > 1 ? ` ${tr('available_count', '({count} available)', { count: quest.gmHistory.length })}` : ''}</button></div>
          <label className="mt-3 block text-xs font-bold text-slate-700">{tr('type', 'Type')}<select value={gmType} onChange={event => setGmType(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-400 p-2"><option value="narrative">{tr('story_event', 'Story event')}</option><option value="challenge">{tr('challenge', 'Challenge')}</option><option value="item">{tr('item', 'Item')}</option><option value="enemy">{tr('enemy', 'Enemy')}</option></select></label>
          {gmType === 'item' && <label className="mt-2 block text-xs font-bold text-slate-700">{tr('item_effect', 'Item effect')}<select value={gmItemEffect} onChange={event => setGmItemEffect(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-400 p-2"><option value="heal">{tr('restore_party_hp', 'Restore party HP')}</option><option value="shield">{tr('grant_party_shield', 'Grant party shield')}</option><option value="clue">{tr('reveal_concept_clue', 'Reveal a concept clue')}</option></select></label>}
          <label className="mt-2 block text-xs font-bold text-slate-700">{tr('direction', 'Direction')}<textarea value={gmRequest} onChange={event => setGmRequest(event.target.value)} rows={3} placeholder={tr('direction_placeholder', 'Connect photosynthesis to energy transfer')} className="mt-1 w-full rounded-lg border border-slate-400 p-2 text-sm" /></label>
          <div className="mt-2 flex gap-2"><button type="button" onClick={manualDraft} className="min-h-11 flex-1 rounded-lg border border-indigo-300 px-3 text-sm font-bold text-indigo-800">{tr('manual_draft', 'Manual draft')}</button><button type="button" disabled={busy} onClick={aiDraft} className="min-h-11 flex-1 rounded-lg bg-indigo-700 px-3 text-sm font-bold text-white disabled:opacity-50">{busy ? tr('working', 'Working…') : tr('ai_draft', 'AI draft')}</button></div>
          {gmDraft && <div className="mt-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-3" aria-label={tr('draft_preview_aria', 'GM draft preview')}><p className="text-xs font-black uppercase text-amber-800">{tr('preview_not_live', 'Preview — not live')}</p><label className="mt-2 block text-xs font-bold">{tr('draft_title_label', 'Title')}<input value={gmDraft.title} onChange={event => setGmDraft({ ...gmDraft, title: event.target.value })} className="mt-1 min-h-11 w-full rounded border border-amber-300 p-2 text-sm" /></label><label className="mt-2 block text-xs font-bold">{tr('description', 'Description')}<textarea value={gmDraft.description} onChange={event => setGmDraft({ ...gmDraft, description: event.target.value })} rows={3} className="mt-1 w-full rounded border border-amber-300 p-2 text-sm" /></label><div className="mt-2 flex gap-2"><button type="button" onClick={() => setGmDraft(null)} className="min-h-11 flex-1 rounded-lg bg-slate-200 font-bold text-slate-700">{tr('discard', 'Discard')}</button><button type="button" onClick={publishDraft} className="min-h-11 flex-1 rounded-lg bg-emerald-700 font-bold text-white">{tr('publish_to_class', 'Publish to class')}</button></div></div>}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs sm:grid-cols-6" aria-label={tr('campaign_summary_aria', 'Campaign evidence summary')}>
        <span><strong className="block text-lg text-emerald-800">{debrief.accuracy}%</strong>{tr('accuracy', 'Accuracy')}</span><span><strong className="block text-lg text-emerald-800">{debrief.combos}</strong>{tr('combos', 'Combos')}</span><span><strong className="block text-lg text-emerald-800">{debrief.roleSynergies}</strong>{tr('role_synergies', 'Role synergies')}</span><span><strong className="block text-lg text-emerald-800">{debrief.peerAssists}</strong>{tr('peer_assists', 'Peer assists')}</span><span><strong className="block text-lg text-emerald-800">{debrief.puzzlesSolved}</strong>{tr('puzzles', 'Puzzles')}</span><span><strong className="block text-lg text-emerald-800">{debrief.rounds}</strong>{tr('rounds', 'Rounds')}</span>
      </div>
      {debrief.conceptBreakdown.length > 0 && <details className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3"><summary className="cursor-pointer font-bold text-cyan-950">{tr('mastery_evidence', 'Concept mastery evidence')}</summary>{debrief.needsReview ? <p className="mt-2 text-sm text-amber-900">{tr('suggested_review', 'Suggested review: {concept} ({accuracy}% across {rounds} rounds)', { concept: debrief.needsReview.concept, accuracy: debrief.needsReview.accuracy, rounds: debrief.needsReview.rounds })}</p> : <p className="mt-2 text-sm text-emerald-800">{tr('all_above_70', 'Every measured concept is currently at or above 70%.')}</p>}<ul className="mt-2 grid gap-2 text-xs sm:grid-cols-2">{debrief.conceptBreakdown.map(entry => <li key={entry.concept} className="rounded-lg bg-white p-2"><strong>{entry.concept}</strong><span className="float-right">{entry.accuracy}%</span><span className="mt-1 block text-slate-600">{tr('checks_rounds', '{correct}/{total} checks · {rounds} rounds', { correct: entry.correct, total: entry.total, rounds: entry.rounds })}</span></li>)}</ul></details>}
      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3"><summary className="cursor-pointer font-bold text-slate-800">{tr('quest_log_inventory', 'Quest log and shared inventory')}</summary><div className="mt-2 grid gap-3 md:grid-cols-2"><ol className="space-y-1 text-xs text-slate-600">{(quest.log || []).slice(-8).reverse().map(entry => <li key={entry.id}><strong>{tr('turn_label', 'Turn {turn}:', { turn: entry.turn })}</strong> {entry.text}</li>)}</ol><ul className="space-y-2 text-xs text-slate-600">{quest.inventory.length ? quest.inventory.map((item, index) => <li key={`${item.id}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2"><span>{item.emoji} <strong>{item.name}</strong> — {item.description}</span><button type="button" onClick={() => useSharedItem(index)} className="min-h-11 shrink-0 rounded-lg bg-indigo-700 px-3 font-bold text-white">{tr('use', 'Use')}</button></li>) : <li>{tr('no_items', 'No items yet.')}</li>}</ul></div></details>
    </div>
  );
});
