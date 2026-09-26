/* Solo orchestration keeps game rules, local persistence and AI narration separate. */
function createConceptQuestSoloSession(engine, generatedContent, translate) {
  return window.AlloModules.ConceptQuestSoloEngine.createSession(engine, generatedContent, translate);
}
function ConceptQuestSolo({ generatedContent, inputText = '', callGemini, user, appId, t, onClose }) {
  const tr = (key, fallback, params = {}) => {
    const fullKey = 'concept_quest.' + key;
    const translated = typeof t === 'function' ? t(fullKey, params) : '';
    const value = typeof translated === 'string' && translated && translated !== fullKey ? translated : fallback;
    return Object.keys(params).reduce((text,name) => text.split('{' + name + '}').join(String(params[name])),value);
  };
  const base = window.AlloModules.ConceptQuestEngine;
  const solo = window.AlloModules.ConceptQuestSoloEngine;
  const saves = window.AlloModules.ConceptQuestSoloStorage;
  const GM = window.AlloModules.ConceptQuestSoloGM;
  const userId = user?.uid || 'device-local';
  const context = { generatedContent, userId, appId: appId || 'alloflow-local' };
  const sourceSignature = JSON.stringify([userId, context.appId, generatedContent]);
  const items = React.useMemo(() => solo.normalizeItems(generatedContent), [sourceSignature]);
  const [run, setRun] = React.useState(null);
  const [setupRole, setSetupRole] = React.useState('analyst');
  const [setupAi, setSetupAi] = React.useState(typeof callGemini === 'function');
  const [saved, setSaved] = React.useState({status:'loading'});
  const [saveStatus, setSaveStatus] = React.useState({status:'idle'});
  const [confirmation, setConfirmation] = React.useState('');
  const [error, setError] = React.useState('');
  const headingRef = React.useRef(null);
  const actionLock = React.useRef(false);
  const revision = React.useRef(null);
  const saveBlocked = React.useRef(false);
  const latest = React.useRef(null);
  const latestByScope = React.useRef(new Map());
  const active = run?._scope === sourceSignature ? run : null;
  const quest = active?.quest;
  const currentRoom = quest ? base.getRoom(quest, quest.currentRoomId) : null;
  const item = quest ? solo.currentItem(quest) : null;
  const progress = quest ? solo.coverage(quest) : null;
  const terminal = quest && ['complete','defeat'].includes(quest.phase);
  const debrief = terminal ? solo.createDebrief(quest) : null;
  const buttonClass = 'min-h-11 rounded-xl px-4 py-2 font-bold focus-visible:ring-4 focus-visible:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed';
  const gameLabel = (entry,field = 'name') => tr(entry[field + 'Key'] || ('role_' + entry.id + '_' + field),entry[field] || '');
  const getLocalStorage = () => { try { return window.localStorage; } catch (_) { return null; } };
  function snapshotOf(value) {
    return {version:1,quest:value.quest,roleId:value.roleId,abilityId:value.abilityId,response:value.response,recapOpen:value.recapOpen,gmState:value.gmState,aiEnabled:value.aiEnabled};
  }
  function saveRun(value, explicit = false, quiet = false) {
    if (!value || value._scope !== sourceSignature || (saveBlocked.current && !explicit)) return null;
    const result = saves.save(getLocalStorage(),{...context,expectedRevision:revision.current},snapshotOf(value));
    if (result.status === 'saved') {
      revision.current = result.revision; saveBlocked.current = false;
      if (!quiet) { setSaved({...result,status:'saved'}); setSaveStatus({status:'saved',savedAt:result.snapshot?.savedAt || Date.now()}); }
    } else {
      if (result.status === 'conflict') saveBlocked.current = true;
      if (!quiet) setSaveStatus(result);
    }
    return result;
  }
  latest.current = {active,saveRun};
  if (active) latestByScope.current.set(sourceSignature, {active,saveRun});
  React.useEffect(() => {
    const result = saves.read(getLocalStorage(), context);
    revision.current = result.revision ?? null; saveBlocked.current = false;
    setRun(null); setSaved(result); setSaveStatus({status:'idle'}); setError(''); setConfirmation(''); actionLock.current = false;
  },[sourceSignature]);
  React.useEffect(() => {
    if (!active || saveBlocked.current) return;
    setSaveStatus({status:'saving'});
    const timer = setTimeout(() => saveRun(active),300);
    return () => clearTimeout(timer);
  },[active,sourceSignature]);
  React.useEffect(() => {
    const flush = () => { const value = latest.current; if (value?.active) value.saveRun(value.active); };
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const external = event => {
      if (event.key !== null && event.key !== saves.keyFor(context)) return;
      const result = saves.read(getLocalStorage(),context);
      if (result.revision === revision.current) return;
      if (latest.current?.active) { saveBlocked.current = true; setSaveStatus({status:'conflict'}); }
      else { revision.current = result.revision ?? null; setSaved(result); }
    };
    window.addEventListener('pagehide',flush); window.addEventListener('storage',external); document.addEventListener('visibilitychange',visibility);
    return () => {
      window.removeEventListener('pagehide',flush); window.removeEventListener('storage',external); document.removeEventListener('visibilitychange',visibility);
      // Preserve the last committed response even when the debounce has not
      // fired. A separate scope entry retains the departing learner/resource
      // snapshot after the next render has already hidden that adventure.
      const departing = latestByScope.current.get(sourceSignature);
      if (departing?.active) departing.saveRun(departing.active, false, true);
      latestByScope.current.delete(sourceSignature);
    };
  },[sourceSignature]);
  React.useEffect(() => { actionLock.current = false; headingRef.current?.focus(); },[quest?.sessionId,quest?.turn,quest?.currentRoomId,active?.recapOpen,confirmation]);
  function restoreSaved() {
    const result = saves.read(getLocalStorage(),context);
    setSaved(result); revision.current = result.revision ?? null;
    if (result.status !== 'saved') { setError(tr('solo_resume_unavailable','This saved adventure is no longer available. You can start a new adventure.')); return; }
    const value = result.snapshot;
    saveBlocked.current = false; setConfirmation(''); setError('');
    setRun({...value,_scope:sourceSignature});
    setSaveStatus({status:'saved',savedAt:value.savedAt});
  }
  function start() {
    try {
      const next = createConceptQuestSoloSession(base,generatedContent,tr);
      const roleId = active?.roleId || setupRole;
      const abilityId = base.ROLES.find(role => role.id === roleId)?.abilityId || 'analyze';
      const value = {_scope:sourceSignature,quest:next,roleId,abilityId,response:solo.initialResponse(solo.currentItem(next)),recapOpen:false,gmState:null,aiEnabled:active ? active.aiEnabled : setupAi};
      setRun(value); setError(''); setConfirmation(''); actionLock.current = false; saveRun(value);
    } catch (failure) { setError(failure.message || tr('launch_failed','Concept Quest could not launch.')); }
  }
  function updateRun(patch) {
    const expectedSession = quest?.sessionId;
    setRun(previous => previous?._scope === sourceSignature && previous.quest.sessionId === expectedSession ? {...previous,...patch} : previous);
  }
  function applyResult(result, recap = false, preserveResponse = false) {
    if (result.error) { setError(result.error); actionLock.current = false; return; }
    updateRun({quest:result.quest,response:preserveResponse?active.response:solo.initialResponse(solo.currentItem(result.quest)),recapOpen:recap}); setError('');
  }
  function travel(roomId) {
    if (!quest || active.recapOpen || actionLock.current || confirmation) return;
    actionLock.current = true; applyResult(solo.travel(base,quest,roomId));
  }
  function resolveTurn() {
    if (!quest || active.recapOpen || actionLock.current || confirmation) return;
    actionLock.current = true;
    applyResult(solo.resolveTurn(base,quest,{roleId:active.roleId,abilityId:active.abilityId,response:active.response}),true);
  }
  function close() { if(active)saveRun(active); onClose?.(); }
  function deleteSave() {
    const result = saves.clear(getLocalStorage(),{...context,expectedRevision:revision.current});
    if(result.status === 'cleared') { revision.current = null; setSaved({status:'empty',revision:null});setConfirmation(''); }
    else {setSaveStatus(result);if(result.status === 'conflict')saveBlocked.current = true;setError(tr('solo_delete_failed','The save could not be removed. Another tab may have changed it.'));}
  }
  const canResolve = item && solo.grade(item,active?.response || {}).complete;
  const saveMessage = saveStatus.status === 'saved' ? tr('solo_saved_device','Progress saved on this device.') : saveStatus.status === 'saving' ? tr('solo_saving','Saving progress...') : saveStatus.status === 'conflict' ? tr('solo_save_conflict','Another tab changed this saved adventure. Choose which progress to keep. Your current game is still open.') : ['unavailable','invalid'].includes(saveStatus.status) ? tr('solo_save_failed','Progress could not be saved on this device. Keep this adventure open and try saving again.') : '';
  return <section data-concept-quest-solo="true" aria-label={tr('solo_title','Concept Quest solo adventure')} className="overflow-hidden rounded-2xl border-2 border-indigo-200 bg-slate-50 text-slate-900">
    <header className="flex flex-wrap items-start justify-between gap-3 bg-indigo-950 p-5 text-white">
      <div className="min-w-0"><p className="text-sm font-bold text-indigo-200">{tr('solo_badge','Solo adventure. No live session needed.')}</p><h2 className="mt-1 text-2xl font-black">🗺️ {tr('title','Concept Quest')}</h2>{quest && <p className="mt-1 break-words text-sm text-indigo-100">{quest.title}</p>}</div>
      <div className="flex flex-wrap gap-2">{quest && <button type="button" onClick={() => setConfirmation('restart')} className={buttonClass + ' border border-indigo-300 bg-indigo-900 text-white'}>{tr('solo_restart','Restart adventure')}</button>}<button type="button" onClick={close} className={buttonClass + ' bg-white text-indigo-950'}>{tr('solo_close','Back to Assess')}</button></div>
    </header>
    <div className="space-y-5 p-4 md:p-6">
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-900">{error}</p>}
      {active && saveMessage && <section className={'rounded-lg border p-3 text-sm ' + (['conflict','unavailable','invalid'].includes(saveStatus.status) ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-200 bg-white text-slate-600')}><p role="status" aria-live="polite" data-solo-save-status>{saveMessage}</p>{['unavailable','invalid'].includes(saveStatus.status) && <button type="button" onClick={() => saveRun(active,true)} className={buttonClass + ' mt-2 border border-slate-300 bg-white'}>{tr('solo_retry_save','Retry saving')}</button>}{saveStatus.status === 'conflict' && <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={restoreSaved} className={buttonClass + ' border border-slate-300 bg-white'}>{tr('solo_load_saved_instead','Load saved progress instead')}</button><button type="button" onClick={() => { const result=saves.read(getLocalStorage(),context);revision.current=result.revision??null;saveRun(active,true); }} className={buttonClass + ' border border-amber-400 bg-white'}>{tr('solo_keep_current','Save this adventure instead')}</button></div>}</section>}
      {confirmation && <section className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4"><h3 ref={headingRef} tabIndex={-1} className="font-bold">{confirmation === 'delete' ? tr('solo_delete_prompt','Delete this saved adventure from this device?') : tr('solo_restart_prompt','Start a new adventure? This replaces the saved progress for this resource.')}</h3><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setConfirmation('')} className={buttonClass + ' border border-slate-300 bg-white'}>{tr('keep_playing','Keep playing')}</button><button type="button" onClick={confirmation === 'delete' ? deleteSave : start} className={buttonClass + ' bg-indigo-700 text-white'}>{confirmation === 'delete' ? tr('solo_delete_save','Delete saved adventure') : tr('solo_restart_confirm','Restart from the beginning')}</button></div></section>}
      {!active ? <div className="space-y-5">
        <h3 ref={headingRef} tabIndex={-1} className="text-xl font-black">{tr('solo_setup','Choose your adventurer')}</h3>
        <p className="max-w-3xl text-slate-700">{tr('solo_intro','Explore an adventure built from this assessment. Use abilities to overcome encounters, investigate clues, talk with your guide, and explain your ideas. Every assessment item stays in the learning path.')}</p>
        <p data-solo-source-count className="text-sm text-slate-600">{tr('solo_all_item_count','{count} assessment items are included. Written responses use answer-guide self-review.',{count:items.length})}</p>
        {saved.status === 'saved' && <section className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4" data-solo-resume><h4 className="font-bold text-emerald-950">{tr('solo_saved_adventure','Saved adventure')}</h4><p className="mt-1 text-sm text-emerald-950">{tr('solo_saved_progress','{done} of {total} assessment items explored.',{done:solo.coverage(saved.snapshot.quest).attempted,total:solo.coverage(saved.snapshot.quest).total})}</p><p className="mt-1 text-xs text-emerald-900">{new Date(saved.snapshot.savedAt).toLocaleString()}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={restoreSaved} className={buttonClass + ' bg-emerald-700 text-white'}>{tr('solo_resume','Resume adventure')}</button><button type="button" onClick={() => setConfirmation('delete')} className={buttonClass + ' border border-emerald-400 bg-white text-emerald-950'}>{tr('solo_delete_save','Delete saved adventure')}</button></div></section>}
        {['stale','expired','corrupt','unavailable'].includes(saved.status) && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{saved.status === 'stale' ? tr('solo_stale_save','The assessment changed, so its old adventure cannot be resumed. Start a new adventure with the current items.') : saved.status === 'expired' ? tr('solo_expired_save','The saved adventure expired. Start a new adventure.') : saved.status === 'corrupt' ? tr('solo_corrupt_save','The saved adventure could not be read. You can start a new one.') : tr('solo_storage_unavailable','Device storage is unavailable. You can play, but progress will only last while this adventure stays open.')}</p>}
        <div role="group" aria-label={tr('solo_role','Adventurer role')} className="grid grid-cols-1 gap-3 sm:grid-cols-2">{base.ROLES.map(role => <button type="button" key={role.id} aria-pressed={setupRole===role.id} onClick={() => setSetupRole(role.id)} className={buttonClass + ' border-2 p-4 text-left ' + (setupRole===role.id?'border-indigo-600 bg-indigo-50':'border-slate-300 bg-white')}><span className="block text-lg">{role.emoji} {gameLabel(role)}</span><span className="mt-1 block text-sm font-normal text-slate-700">{gameLabel(role,'description')}</span></button>)}</div>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-indigo-200 bg-white p-3 font-bold"><input type="checkbox" checked={setupAi} onChange={event=>setSetupAi(event.target.checked)} disabled={typeof callGemini!=='function'}/>{tr('solo_enable_ai','Use AI as the game master')}</label><p className="text-sm text-slate-600">{typeof callGemini==='function'?tr('solo_ai_setup_help','The AI narrates the adventure and responds to your investigations, conversations, and explanations using lesson context. Game rules and scores stay in the engine.'):tr('solo_scripted_setup_help','A scripted guide is available now. The adventure remains playable without an AI connection.')}</p>
        <p className="text-sm text-slate-700">{tr('solo_rules','Choose an ability and respond to each encounter. Correct answers power your ability. Review written answers against the guide. Explore every assessment item before completing the final boss.')}</p>
        <button type="button" disabled={!items.length||saved.status==='loading'||!!confirmation} onClick={() => saved.status==='saved'?setConfirmation('new'):start()} className={buttonClass+' bg-indigo-700 text-white'}>{saved.status==='saved'?tr('solo_start_new','Start a new adventure'):tr('solo_start','Start solo adventure')}</button>
        {!items.length&&<p className="text-sm text-amber-900">{tr('solo_items_required','Add at least one assessment question to start an adventure.')}</p>}
      </div> : <>
        <div role="group" className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={tr('solo_progress','Adventure progress')}>{[['solo_health','Health',quest.party.hp+'/'+quest.party.maxHp],['solo_shield','Shield',quest.party.shield],['solo_items_seen','Items explored',progress.attempted+'/'+progress.total],['solo_xp','Adventure XP',quest.party.xp]].map(([key,label,value])=><div key={key} className="rounded-xl border border-indigo-200 bg-white p-3"><p className="text-xs font-bold text-slate-600">{tr(key,label)}</p><p className="text-xl font-black text-indigo-950">{value}</p></div>)}</div>
        {!confirmation && <GM key={quest.sessionId} quest={quest} generatedContent={generatedContent} inputText={inputText} callGemini={callGemini} t={t} gmState={active.gmState} onChange={gmState=>updateRun({gmState})} enabled={active.aiEnabled} onEnabledChange={aiEnabled=>updateRun({aiEnabled})}/>}
        {!confirmation&&active.recapOpen&&quest.lastRound&&<section className="rounded-xl border-2 border-cyan-300 bg-cyan-50 p-4" aria-label={tr('solo_round_result','Turn result')}>
          <h3 ref={headingRef} tabIndex={-1} className="text-lg font-black">{quest.lastRound.gradable===false?tr('solo_review_recorded','Self-review recorded'):quest.lastRound.correct?tr('solo_correct','Correct. Your ability succeeded!'):quest.lastRound.status==='partially-correct'?tr('solo_partly_correct','Partly correct. Review the answer guide before your next turn.'):tr('solo_incorrect','Review the concept and try another turn.')}</h3>
          {quest.lastRound.gradable!==false&&<p className="mt-2 text-sm font-bold">{tr('solo_item_score','{score} / {maximum} for this item.',{score:quest.lastRound.score,maximum:quest.lastRound.maxScore})}</p>}
          <p className="mt-2 text-sm">{tr('solo_damage','You dealt {damage} damage and lost {incoming} health.',{damage:quest.lastRound.damage,incoming:quest.lastRound.incoming})}</p>
          {quest.lastRound.regrouped&&<p role="status" className="mt-3 rounded-lg bg-amber-100 p-3 text-sm text-amber-950">{tr('solo_regrouped','Your guide helped you regroup and restored your health so you can explore the remaining assessment items. This recovery does not change your answer results.')}</p>}
          <p className="mt-3 font-bold">{quest.lastRound.prompt}</p><p className="mt-2 whitespace-pre-wrap"><strong>{tr('solo_answer_guide','Answer guide')}: </strong>{quest.lastRound.answerGuide||quest.lastRound.correctAnswer}</p>{quest.lastRound.explanation&&<p className="mt-2 text-slate-700">{quest.lastRound.explanation}</p>}
          {quest.lastRound.gradable===false&&<p className="mt-3 text-sm text-cyan-950">{quest.lastRound.selfReview==='needs-practice'?tr('solo_flagged_practice','Added to your ideas for more practice.'):tr('solo_self_review_notice','Your own comparison was recorded. This item is excluded from automatic accuracy and correctness XP.')}</p>}
          <button type="button" onClick={()=>updateRun({recapOpen:false})} className={buttonClass+' mt-4 bg-indigo-700 text-white'}>{tr('solo_continue','Continue adventure')}</button>
        </section>}
        {!confirmation&&!active.recapOpen&&terminal&&<section className={'rounded-xl border-2 p-5 '+(quest.phase==='complete'?'border-emerald-400 bg-emerald-50':'border-amber-400 bg-amber-50')}>
          <h3 ref={headingRef} tabIndex={-1} className="text-2xl font-black">{quest.phase==='complete'?tr('gate_cleared','Mastery Gate cleared!'):tr('solo_regroup','Time to regroup')}</h3>
          <p className="mt-2">{tr('solo_coverage_summary','You explored {done} of {total} assessment items.',{done:progress.attempted,total:progress.total})}</p>
          <p className="mt-2 font-bold">{progress.accuracy==null?tr('solo_no_automatic_score','This adventure used self-review checkpoints. No automatic accuracy score was assigned.'):tr('solo_graded_accuracy','{accuracy}% correct on automatically scored responses.',{accuracy:progress.accuracy})}</p>
          {progress.firstAttemptAccuracy!=null&&<p className="mt-1 text-sm">{tr('solo_first_accuracy','{accuracy}% correct on first attempts. The score above uses your most recent attempt for each automatically scored item.',{accuracy:progress.firstAttemptAccuracy})}</p>}
          <p className="mt-1 text-sm">{tr('solo_review_count','{count} items were self-reviewed and excluded from that score.',{count:progress.selfReviewed})}</p>
          {progress.missedItems?.length>0&&<div className="mt-4"><h4 className="font-bold">{tr('solo_next_practice','Ideas for more practice')}</h4><ul className="mt-2 list-inside list-disc space-y-1">{progress.missedItems.map(entry=><li key={entry.sourceIndex}>{entry.concept||entry.prompt||entry.question||tr('solo_item_number','Question {number}',{number:entry.sourceIndex+1})}</li>)}</ul></div>}
          <details className="mt-4 rounded-xl border border-emerald-300 bg-white p-4" data-solo-debrief-items><summary className="cursor-pointer font-bold">{tr('solo_review_all_items','Review all {count} assessment items',{count:debrief.total})}</summary><ol className="mt-3 space-y-3">{debrief.items.map(entry=><li key={entry.sourceIndex}><details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer break-words font-semibold">{entry.sourceIndex+1}. {entry.prompt}</summary><p className="mt-2 text-sm">{!entry.attempted?tr('solo_not_reached','Not reached'):entry.selfReview?entry.selfReview==='needs-practice'?tr('solo_review_needs_practice','Self-reviewed: more practice requested'):tr('solo_review_understood','Self-reviewed: key ideas understood'):entry.lastCorrect?tr('solo_latest_correct','Correct on the most recent attempt'):tr('solo_latest_review','Review this idea again')}</p><p className="mt-2 whitespace-pre-wrap text-sm"><strong>{tr('solo_answer_guide','Answer guide')}: </strong>{solo.answerGuide(entry)}</p>{entry.explanation&&<p className="mt-2 text-sm text-slate-700">{entry.explanation}</p>}</details></li>)}</ol></details>
          <button type="button" onClick={()=>setConfirmation('restart')} className={buttonClass+' mt-4 bg-indigo-700 text-white'}>{tr('solo_play_again','Play again')}</button>
        </section>}
        {!confirmation&&!active.recapOpen&&!terminal&&<div className="grid grid-cols-1 gap-5 lg:grid-cols-3"><section className="space-y-4 lg:col-span-2" aria-label={tr('current_encounter_aria','Current encounter')}>
          <div><p className="text-xs font-bold uppercase text-indigo-700">{tr('solo_current_location','Current location')}</p><h3 ref={headingRef} tabIndex={-1} className="text-xl font-black">{currentRoom.emoji} {currentRoom.name}</h3></div>
          {quest.phase==='explore'?<div className="space-y-3"><p>{tr('solo_path_help','Choose a connected path. Encounters help you explore lesson ideas; treasure rooms hold useful items.')}</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{currentRoom.neighbors.map(id=>{const room=base.getRoom(quest,id);const locked=room.kind==='boss'&&quest.sigils.length<base.requiredSigils(quest);return <button type="button" key={id} data-solo-travel={id} disabled={locked} onClick={()=>travel(id)} className={buttonClass+' border-2 border-indigo-200 bg-white text-left'}><span className="block">{locked?'🔒':room.emoji} {room.name}</span><span className="mt-1 block text-xs font-normal text-slate-600">{locked?tr('solo_gate_locked','Collect {count} more sigils first.',{count:base.requiredSigils(quest)-quest.sigils.length}):quest.visited.includes(id)?tr('solo_revisit','Revisit location'):tr('solo_explore','Explore this location')}</span></button>;})}</div></div>:<>
            <div className="rounded-xl border border-fuchsia-200 bg-white p-4"><p className="text-lg font-black">{currentRoom.enemy.emoji} {currentRoom.enemy.name}</p><p className="mt-1 text-sm text-slate-600">{tr('solo_enemy_health','Encounter health: {current}/{maximum}',{current:currentRoom.enemy.hp,maximum:currentRoom.enemy.maxHp})}</p><div role="progressbar" aria-label={tr('solo_enemy_health_label','Encounter health')} aria-valuemin={0} aria-valuemax={currentRoom.enemy.maxHp} aria-valuenow={currentRoom.enemy.hp} className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-fuchsia-600" style={{width:(100*currentRoom.enemy.hp/currentRoom.enemy.maxHp)+'%'}}/></div></div>
            {quest.activeEvent&&<div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3"><strong>{quest.activeEvent.title}</strong><p className="mt-1">{quest.activeEvent.description}</p></div>}
            <fieldset className="space-y-3"><legend className="font-bold">{tr('solo_choose_ability','1. Choose an ability')}</legend><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{quest.abilities.map(ability=><button type="button" key={ability.id} onClick={()=>updateRun({abilityId:ability.id})} aria-pressed={active.abilityId===ability.id} className={buttonClass+' border-2 p-3 text-left '+(active.abilityId===ability.id?'border-indigo-600 bg-indigo-50':'border-slate-300 bg-white')}><span className="block">{ability.emoji} {gameLabel(ability)}</span><span className="mt-1 block text-xs font-normal text-slate-700">{gameLabel(ability,'description')}</span></button>)}</div></fieldset>
            <ConceptQuestSoloQuestion key={item.id} item={item} response={active.response} onChange={response=>updateRun({response})} guideOpen={!!active.response?.guideRevealed} onGuideOpen={()=>{}} t={t}/>
            <button type="button" disabled={!canResolve} onClick={resolveTurn} className={buttonClass+' w-full bg-indigo-700 text-white'}>{item.selfReviewRequired?tr('solo_finish_review','3. Record self-review and continue'):tr('solo_resolve','3. Resolve this turn')}</button>
          </>}
        </section><aside className="space-y-4"><details className="rounded-xl border border-slate-300 bg-white p-4" open={quest.phase==='explore'}><summary className="cursor-pointer font-bold">{tr('solo_map','Adventure map')}</summary><ol className="mt-3 space-y-2">{quest.rooms.map((room,index)=><li key={room.id} aria-current={room.id===quest.currentRoomId?'location':undefined} className={'rounded-lg p-2 text-sm '+(room.id===quest.currentRoomId?'bg-indigo-100 font-bold text-indigo-900':'')}>{index+1}. {room.emoji} {room.name}{room.enemy?.hp===0?' ✓':''}</li>)}</ol></details>
          <section className="rounded-xl border border-slate-300 bg-white p-4"><h4 className="font-bold">{tr('solo_inventory','Your inventory')}</h4>{quest.inventory.length?<ul className="mt-3 space-y-3">{quest.inventory.map((entry,index)=><li key={entry.id}><p className="font-bold">{entry.emoji} {entry.name}</p><p className="mt-1 text-xs text-slate-600">{entry.description}</p><button type="button" disabled={entry.effect?.type==='clue'&&quest.phase!=='battle'} onClick={()=>applyResult(base.useItem(quest,index),false,true)} className={buttonClass+' mt-2 border border-indigo-300 bg-indigo-50 text-indigo-800'}>{tr('solo_use_item','Use item')}</button></li>)}</ul>:<p className="mt-2 text-sm text-slate-600">{tr('solo_inventory_empty','Find items by exploring treasure rooms.')}</p>}</section>
        </aside></div>}
        <p className="text-xs text-slate-600">{tr('solo_local_notice','Independent practice. Progress and your guide conversation are saved on this device for this account or local profile. This adventure does not submit an assessment score.')}</p>
      </>}
    </div>
  </section>;
}
