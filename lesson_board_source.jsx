import * as engine from './lesson_board_engine.js';
import { prepareSupport, hasSupport, readSupport, saveSupport, liveSupport } from './lesson_board_support.js';
import { BoardSupportSetup } from './lesson_board_support_ui.jsx';
import { writeBoardDocument } from './lesson_board_live.js';
import { assessmentCoverage, coverageSnapshot } from './lesson_board_coverage.js';
import { rolesConfig } from './lesson_board_roles.js';
import { CoveragePanel, ReportLibrary } from './lesson_board_followthrough.jsx';
import { readLibrary, saveBoard, removeBoard, replaceSavedBoard, restoreSolo, soloStorageKey, soloStatus, readSolo, saveSolo, soloWorkspace } from './lesson_board_storage.js';
import { useBoardEscape } from './lesson_board_accessibility.js';
import { BoardTransfer, BoardDownload } from './lesson_board_library.jsx';
import { BoardAuthoring } from './lesson_board_authoring.jsx';
import { BoardSetupGuide, BoardMissionPicker, BoardBlueprint } from './lesson_board_setup.jsx';
import { BoardView, Activity, Styles, tr } from './lesson_board_ui.jsx';
import { useRoomDialog } from './connected_escape_room_accessibility.jsx';
const React = window.React;
const { useState, useEffect, useRef } = React;
const runtime = { locks: new Set(), listeners: new Set(), errors: new Map(), emit() { this.listeners.forEach(fn => fn()); } };
const connection = (appId, code) => { const fb = window.__alloFirebase || {}, db = fb.db || window.__alloShared?.db; if (!db || !fb.doc || !fb.updateDoc || !appId || !code) throw Error('The live session connection is unavailable.'); return { fb, ref: fb.doc(db, 'artifacts', appId, 'public', 'data', 'sessions', code) }; };
const scopeOf = (appId, code, state) => [appId, code, state?.attemptId].join(':');
const runPatch = (state, patch) => Object.fromEntries(Object.entries(patch).map(([path, value]) => ['escapeRoomState.teamProgress.All.boardRuns.' + state.attemptId + '.' + path, value]));
const applyDocument = (data, patch) => engine.merge(data, patch);
const checkSize = data => { if (JSON.stringify(data).length > 76000) throw Error('This session is near its storage limit. End the board and start a fresh session before continuing.'); };
function useRuntime(scope) { const [, tick] = useState(0); useEffect(() => { const fn = () => tick(n => n + 1); runtime.listeners.add(fn); fn(); return () => runtime.listeners.delete(fn); }, []); return { busy: runtime.locks.has(scope), error: runtime.errors.get(scope) || '' }; }
function Confirmation({ title, message, confirm, onConfirm, onCancel, busy, t }) {
  const cancel = useRef(null), trigger = useRef(document.activeElement), group = useRef(null);
  useBoardEscape(group, () => { if (!busy) onCancel(); });
  useEffect(() => { cancel.current?.focus(); return () => { if (trigger.current?.isConnected) trigger.current.focus(); }; }, []);
  return <div ref={group} className="lb-notice" role="group" aria-label={title}><h3>{title}</h3><p>{message}</p><div className="lb-row"><button type="button" disabled={busy} onClick={onConfirm}>{confirm}</button><button type="button" ref={cancel} disabled={busy} onClick={onCancel}>{tr(t, 'cancel', 'Cancel')}</button></div></div>;
}
export function LessonBoardSolo({ board, user, appId, onBack, preview = false, source, language, coverage, support:providedSupport, t }) {
  const uid = user?.uid || 'local', storageKey = preview ? '' : soloStorageKey(board, appId, uid), scope = (preview ? 'preview:' : '') + soloStorageKey(board, appId, uid), scopeRef = useRef(scope);
  scopeRef.current = scope;
  const boardSupport = React.useMemo(() => { try { return providedSupport !== undefined ? prepareSupport(providedSupport,board) : readSupport(localStorage,board,appId,uid).support; } catch (_) { return null; } },[board,providedSupport,appId,uid]);
  const readCurrent = () => { let legacy; try { legacy = sessionStorage; } catch (_) {} try { return readSolo(localStorage, board, appId, uid, legacy); } catch (_) { return { status: 'unavailable', revision: undefined }; } };
  const initialState = () => {
    const saved = preview ? { status: 'memory', revision: null } : readCurrent(), run = saved.run || engine.emptyRun();
    return { ...saved, reportAttemptId: saved.reportAttemptId || engine.identity('learning'), scope, run, workspace: saved.workspace || soloWorkspace(board, run), issue: '', dirty: false };
  };
  const [state, setState] = useState(initialState), current = useRef(state), [error, setError] = useState(''), [confirm, setConfirm] = useState(null), [reset, setReset] = useState(0);
  if (state.scope === scope) current.current = state;
  const install = next => { current.current = next; setState(next); };
  useEffect(() => { if (current.current.scope !== scope) { install(initialState()); setError(''); setConfirm(null); setReset(n => n + 1); } }, [scope]);
  const persist = (next, options = {}) => {
    if (scopeRef.current !== scope || current.current.scope !== scope) return false;
    if (preview || current.current.status === 'memory') { install({ ...next, status: 'memory', dirty: false, issue: '' }); return true; }
    let saved;
    try { saved = saveSolo(localStorage, board, appId, uid, { run: next.run, workspace: next.workspace, reportAttemptId: next.reportAttemptId, expectedRevision: options.revision !== undefined ? options.revision : current.current.revision }); }
    catch (_) { saved = { status: 'unavailable' }; }
    if (saved.status === 'saved') { install({ ...next, ...saved, scope, dirty: false, issue: '' }); return true; }
    const kept = options.keepOnFailure ? current.current : next;
    install({ ...kept, status: saved.status === 'conflict' ? 'conflict' : 'unavailable', dirty: true, issue: options.keepOnFailure ? tr(t, 'solo_restart_unsaved', 'The restart could not be saved. Your current progress has been kept.') : saved.status === 'invalid' ? tr(t, 'solo_invalid_save', 'This progress could not be saved. Your current game is still open.') : '' });
    return false;
  };
  useEffect(() => { if (state.scope === scope && state.status === 'legacy') persist(current.current); }, [scope, state.status]);
  useEffect(() => {
    if (!storageKey) return;
    const changed = event => {
      if ((event.key !== storageKey && event.key !== null) || current.current.scope !== scope || current.current.status === 'memory') return;
      if (event.key === null || event.newValue !== current.current.revision) { install({ ...current.current, status: 'conflict', issue: '' }); setConfirm(null); }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [scope]);
  const action = fn => {
    if (confirm || ['corrupt', 'conflict'].includes(current.current.status)) return;
    try { setError(''); const run = fn(current.current.run), workspace = soloWorkspace(board, run, current.current.workspace); persist({ ...current.current, run, workspace }); }
    catch (failure) { setError(failure.message); }
  };
  const answer = value => action(run => {
    const requestId = engine.requestId ? engine.requestId(run, 'answer') : engine.identity('answer');
    const req = { attemptId: 'solo', turn: run.turn, requestId, kind: 'answer', targetId: engine.stepOf(run).targetId, value };
    const answered = engine.merge(run, engine.processAction(board, run, req, 'solo', { attemptId: 'solo', active: true }));
    return engine.merge(answered, engine.resolve(board, answered, { solo: {} }));
  });
  const resumeSaved = () => {
    const saved = readCurrent();
    if (['saved', 'legacy'].includes(saved.status)) { install({ ...saved, scope, issue: '', dirty: false }); setError(''); setReset(n => n + 1); }
    else if (saved.status === 'empty') { setConfirm({ kind: 'restart', revision: null }); }
    else install({ ...current.current, ...saved, issue: '', dirty: true });
  };
  const offerReplacement = () => {
    const saved = readCurrent();
    if (saved.status === 'unavailable') { install({ ...current.current, issue: tr(t, 'solo_check_failed', 'Saved progress could not be checked. Retry when browser storage is available.') }); return; }
    setConfirm({ kind: 'replace', revision: saved.revision });
  };
  const confirmAction = () => {
    const next = confirm.kind === 'restart' ? { ...current.current, reportAttemptId: engine.identity('learning'), run: engine.emptyRun(), workspace: soloWorkspace(board, engine.emptyRun()) } : current.current;
    const success = persist(next, { revision: confirm.revision, keepOnFailure: true });
    if (success) { setReset(n => n + 1); setError(''); }
    setConfirm(null);
  };
  if (state.scope !== scope) return <p role="status">{tr(t, 'opening_solo', 'Opening solo board…')}</p>;
  const blocked = ['corrupt', 'conflict'].includes(state.status), unsaved = ['unavailable', 'memory'].includes(state.status);
  return <>
    <div className="lb-row"><button type="button" onClick={onBack}>{tr(t, 'back_setup', 'Back to board setup')}</button><button type="button" onClick={() => setConfirm({ kind: 'restart', revision: state.revision })}>{preview ? tr(t, 'reset_preview', 'Reset preview') : tr(t, 'restart_solo', 'Restart solo board')}</button><span data-solo-save-status>{preview ? tr(t, 'preview_label', 'Practice preview') : state.status === 'saved' ? tr(t, 'solo_device_saved', 'Solo · saved on this device') : state.status === 'empty' ? tr(t, 'solo_device_ready', 'Solo · progress will save on this device as you play') : state.status === 'legacy' ? tr(t, 'solo_migrating', 'Moving this tab’s progress to this device…') : tr(t, 'solo_not_saved', 'Solo · current progress is not saved')}</span>{source && <BoardDownload support={boardSupport} board={board} source={source} language={language} t={t}/>}</div>
    {error && <p className="lb-notice" role="alert">{error}</p>}
    {!preview && (blocked || unsaved || state.issue) && <div className="lb-notice" data-solo-save-recovery role={blocked ? 'alert' : 'status'}>
      <p>{state.status === 'conflict' ? tr(t, 'solo_save_conflict', 'Another tab changed this saved game. Choose which progress to use before continuing.') : state.status === 'corrupt' ? tr(t, 'solo_corrupt_save', 'Your saved solo game could not be restored. The saved data has been kept.') : state.status === 'memory' ? tr(t, 'solo_memory_mode', 'Playing without saving. Keep this page open; closing it will lose this game’s progress.') : tr(t, 'solo_device_unavailable', 'Progress could not be saved on this device. Keep this page open and retry saving.')}</p>
      {state.issue && <p>{state.issue}</p>}
      <div className="lb-row">
        {state.status === 'conflict' && <><button type="button" disabled={!!confirm} onClick={resumeSaved}>{tr(t, 'solo_load_saved', 'Resume saved progress')}</button><button type="button" disabled={!!confirm} onClick={offerReplacement}>{tr(t, 'solo_replace_saved', 'Keep this game and replace save')}</button></>}
        {state.status === 'corrupt' && <button type="button" disabled={!!confirm} onClick={() => setConfirm({ kind: 'restart', revision: state.revision })}>{tr(t, 'new_local', 'Start a new local game')}</button>}
        {state.status === 'unavailable' && <button type="button" disabled={!!confirm} onClick={() => persist(current.current)}>{tr(t, 'solo_retry_save', 'Retry saving progress')}</button>}
        {state.status !== 'memory' && <button type="button" disabled={!!confirm} onClick={() => { install({ ...current.current, status: 'memory', dirty: false, issue: '' }); setError(''); }}>{tr(t, 'solo_without_save', 'Play without saving')}</button>}
      </div>
    </div>}
    {confirm && <Confirmation t={t} title={confirm.kind === 'replace' ? tr(t, 'solo_replace_title', 'Replace the saved progress?') : tr(t, 'restart_title', 'Restart this board?')} message={confirm.kind === 'replace' ? tr(t, 'solo_replace_notice', 'Save this open game over the other saved progress on this device? Other tabs will need to resume this version.') : tr(t, 'restart_solo_notice', 'This resets your local progress and unfinished settings. The board stays available.')} confirm={confirm.kind === 'replace' ? tr(t, 'solo_replace_confirm', 'Replace saved progress') : tr(t, 'reset_progress', 'Reset my progress')} onCancel={() => setConfirm(null)} onConfirm={confirmAction}/>}
    <BoardView support={boardSupport} key={scope + ':' + reset} board={board} run={state.run} busy={blocked || !!confirm} roster={{ solo: { name: user?.displayName || tr(t,'you','You') } }} reportContext={{ appId, owner: uid, preview, mode: 'solo', attemptId: state.reportAttemptId, coverage }} workspaceSnapshot={state.workspace} onWorkspaceChange={workspace => { if (scopeRef.current === scope && !confirm && !['corrupt', 'conflict'].includes(current.current.status)) persist({ ...current.current, workspace }); }} onMove={id => action(run => engine.merge(run, engine.begin(board, run, id)))} onAnswer={answer} onRetry={() => action(run => engine.merge(run, engine.retry(board, run)))} onAdvance={() => action(run => engine.merge(run, engine.advance(board, run)))} t={t}/>
  </>;
}

export function LessonBoardSetup({ inputText, generatedContent, language: requestedLanguage = 'English', callGemini, callImagen, history = [], user, appId, activeSessionCode, sessionData, allowLive = true, onClose, onLaunched, t }) {
  const [useClassRoles, setUseClassRoles] = useState(false);
  const [importContext, setImportContext] = useState(null), nativeSource = engine.sourceText(inputText, generatedContent), nativeScope = requestedLanguage + ':' + nativeSource, nativeScopeRef = useRef(nativeScope);
  const source = importContext?.source ?? nativeSource, language = importContext?.language ?? requestedLanguage, scope = JSON.stringify([language,source,appId || '',user?.uid || '',activeSessionCode || '']), dialog = useRef(null), closeRef = useRef(onClose), scopeRef = useRef(scope), request = useRef(0), generationBusy = useRef(null), mounted = useRef(true);
  closeRef.current = onClose; scopeRef.current = scope; useRoomDialog(dialog, closeRef);
  useEffect(() => { if (nativeScopeRef.current !== nativeScope) { nativeScopeRef.current = nativeScope; setImportContext(null); } }, [nativeScope]);
  const [board, setBoard] = useState(null), [library, setLibrary] = useState([]), [stage, setStage] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState(''), [theme, setTheme] = useState(''), [level, setLevel] = useState(''), [goal, setGoal] = useState('expedition'), [playing, setPlaying] = useState(''), [choice, setChoice] = useState(null);
  const [supportState,setSupportState] = useState(null),[supportBusy,setSupportBusy] = useState(false),[vocabularyState,setVocabulary] = useState(null), vocabulary=vocabularyState?.scope===scope?vocabularyState.terms:[], supportScope=scope+':'+JSON.stringify(board), support=supportState?.scope===supportScope?supportState.value:null;
  const receiveSupport=(value,revision)=>setSupportState(previous=>({scope:supportScope,value,revision:revision!==undefined?revision:previous?.scope===supportScope?previous.revision:undefined}));
  const keepSupport=valid=>{if(!support)return; if(!hasSupport(support)&&supportState?.revision===null)return;const saved=saveSupport(localStorage,valid,appId,user?.uid||'local',support,supportState?.revision);receiveSupport(saved.support,saved.revision);};
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current++; clearTimeout(generationBusy.current?.timer); generationBusy.current = null; }; }, []);
  useEffect(() => { clearTimeout(generationBusy.current?.timer); generationBusy.current = null; request.current++; setStage(''); setError(''); setNotice(''); setBoard(null); setLibrary([]); setPlaying(''); setChoice(null); try { const saved = readLibrary(localStorage, source, language); setLibrary(saved); setBoard(importContext?.board || saved[0] || null); } catch (error) { if (importContext?.board) setBoard(importContext.board); reportError(error); } }, [scope]);
  const reportError = error => { setError(error.message==='board-support-live-size'?tr(t,'support_live_size','This board has too much visual or vocabulary support for a shared session. Use shorter descriptions or fewer cues and terms before launching. Your board and pictures are kept.'):error.message); if (error.code === 'board-library-full') setTimeout(() => { const saved = dialog.current?.querySelector('[data-board-library]'); if (saved) { saved.open = true; saved.querySelector('[data-replace-saved]')?.focus(); } }, 0); };
  const cancelGeneration = () => { request.current++; clearTimeout(generationBusy.current?.timer); generationBusy.current = null; setStage(''); setNotice(tr(t,'generation_cancelled','Generation cancelled. Your current board is still available.')); };
  const editBoard = next => { if(support){let revision;try{revision=readSupport(localStorage,next,appId,user?.uid||'local').revision;}catch(error){reportError(error);}setSupportState({scope:scope+':'+JSON.stringify(next),value:prepareSupport(support,next),revision});}setBoard(next); };
  const chooseGoal = next => { try { if(board)editBoard(engine.prepareBoard({...board,goal:next},source)); setGoal(next);setError('');setNotice(''); } catch(error){reportError(error);} };
  const generate = async () => {
    if (stage || choice || supportBusy || generationBusy.current?.scope === scope) return;
    const id = ++request.current, started = scope, ticket = {id,scope,timer:null};generationBusy.current=ticket;setError('');setNotice('');
    const current = () => mounted.current && request.current===id && scopeRef.current===started;
    try {
      const provider = async (...args) => { if(!current())throw Error('Generation cancelled.');if(typeof callGemini!=='function')throw Error(tr(t,'provider_needed','Connect an AI provider to create a new board. You can still open saved boards or board files.'));const response=await callGemini(...args);if(!current())throw Error('Generation cancelled.');return response; };
      const timeout = new Promise((_,reject)=>{ticket.timer=setTimeout(()=>reject(Error(tr(t,'generation_timeout','The board took too long to generate. Your current board is kept. Try again when the AI connection is ready.'))),90000);});
      const next = await Promise.race([engine.generateBoard(provider,source,{language,theme,level,vocabulary,goal:board?(board.goal||'core'):goal,seed:engine.identity('variation')},value=>{if(current())setStage(value);}),timeout]);
      if(current())setBoard(next);
    } catch(error){if(current())reportError(error);} finally {clearTimeout(ticket.timer);if(generationBusy.current?.id===id)generationBusy.current=null;if(current()){request.current++;setStage('');}}
  };
  const keepInLibrary = valid => { try { setLibrary(saveBoard(localStorage,source,language,valid)); } catch(_){setNotice(tr(t,'play_without_library','This board could not be added to the saved library. You can keep playing. Download a board file to keep a reusable copy.'));return false;}try{keepSupport(valid);return true;}catch(_){setNotice(tr(t,'play_without_support_save','The board was saved, but its vocabulary and artwork could not be saved. You can keep playing with them now. Download a board file to keep a copy.'));return false;} };
  const save = () => { try { const next = saveBoard(localStorage, source, language, board); setLibrary(next); keepSupport(board); setNotice(tr(t, 'saved', 'Board saved in this browser.')); setError(''); } catch (error) { reportError(error); } };
  const play = type => { try { engine.prepareBoard(board, source); if (type === 'solo') keepInLibrary(board); setError(''); setPlaying(type); } catch (error) { reportError(error); } };
  const launch = async () => {
    if (stage || choice || supportBusy) return; setStage('launching'); setError(''); const id = ++request.current, started = scope;
    try { const mailboxVersion = window.__alloLessonBoardMailboxVersion?.(); if (mailboxVersion !== null && mailboxVersion !== undefined && mailboxVersion < 22) throw Error('Update your Class Mailbox script to version 22 or later in Live Sessions setup before launching a board.'); const valid = engine.prepareBoard(board, source), { fb, ref } = connection(appId, activeSessionCode), media=hasSupport(support)?await liveSupport(support,valid):null; await writeBoardDocument(fb, ref, latest => {
      if (!mounted.current || request.current !== id || scopeRef.current !== started) return;
      if (!latest) throw Error('The live session is no longer available.'); if (latest.escapeRoomState?.isActive || latest.quizState?.isActive) throw Error('End the current live activity before launching this board.');
      const next = engine.createSession(valid, user?.uid, latest.roster || {}); next.boardRoles = rolesConfig(useClassRoles, latest.roster || {}); if(media)next.boardSupport=media.support; const linked = coverageSnapshot(coverage); if (linked) next.assessmentCoverage = linked; checkSize({ ...latest, escapeRoomState: next }); return { escapeRoomState: next }; }); if (mounted.current && request.current === id && scopeRef.current === started) { keepInLibrary(valid); onLaunched?.(); onClose?.(); }
    } catch (error) { if (mounted.current && request.current === id) reportError(error); } finally { if (mounted.current && request.current === id) setStage(''); }
  };
  const coverage = React.useMemo(() => importContext ? null : assessmentCoverage(board,generatedContent), [board,generatedContent,importContext]);
  const resume = (() => { try { let legacy;try{legacy=sessionStorage;}catch(_){}return soloStatus(localStorage, board, appId, user?.uid || 'local',legacy); } catch (_) { return { status: 'unavailable' }; } })();
  const openFile = pack => { request.current++; setStage(''); setImportContext(pack); setSupportState(null);setBoard(pack.board); setPlaying(''); setChoice(null); setError(''); setNotice(tr(t, 'file_opened', 'Board opened for review. It has not been saved or launched.')); setTimeout(() => dialog.current?.querySelector('[data-board-play-solo]')?.focus(), 0); };
  return <div className="lb-backdrop"><section className="lb lb-dialog" data-theme={board?.theme} ref={dialog} role="dialog" aria-modal="true" aria-label={tr(t, 'title', 'Lesson board game')} tabIndex={-1}><Styles/><div className="lb-row lb-between"><h2>{tr(t, 'title', 'Lesson board game')}</h2><button type="button" onClick={()=>{request.current++;clearTimeout(generationBusy.current?.timer);generationBusy.current=null;onClose?.();}}>{tr(t, 'close', 'Close')}</button></div>{playing&&notice&&<p className="lb-notice" role="status">{notice}</p>}{playing && board ? <LessonBoardSolo key={JSON.stringify([appId,user?.uid||'local',board])} board={board} support={support} user={user} appId={appId} preview={playing === 'preview'} coverage={coverageSnapshot(coverage)} source={source} language={language} t={t} onBack={() => { setPlaying(''); setTimeout(() => dialog.current?.querySelector('[data-board-play-solo]')?.focus(), 0); }}/> : <>
    {importContext && <p className="lb-notice" role="status">{tr(t, 'imported_context', 'Using the lesson and language included in the imported board. Your main lesson is unchanged.')} <button type="button" disabled={!!stage || !!choice || supportBusy} onClick={() => setChoice({ kind: 'main' })}>{tr(t, 'return_main_lesson', 'Return to main lesson')}</button></p>}<BoardSetupGuide t={t}/><p>{tr(t, 'language', 'Board language: {language}', { language })}</p><details><summary>{tr(t, 'source', 'Lesson source')}</summary><blockquote>{source || tr(t, 'need_source', 'Add lesson text or generate a quiz first.')}</blockquote></details>
    {error && <p className="lb-notice" role="alert">{error}</p>}<p role="status">{stage === 'generating' ? tr(t, 'generating', 'Creating the board and lesson activities…') : stage === 'repairing' ? tr(t, 'repairing', 'Repairing paths, activities, or resource balance…') : stage === 'launching' ? tr(t, 'launching', 'Launching the shared board…') : notice}</p>
    <BoardSupportSetup Activity={Activity} board={board} source={source} language={language} history={importContext?[]:history} generatedContent={importContext?null:generatedContent} callImagen={callImagen} appId={appId} uid={user?.uid||'local'} scope={scope} support={support} loaded={supportState?.scope===supportScope} initialSupport={importContext?.board===board?importContext.support:null} onChange={receiveSupport} onVocabulary={terms=>setVocabulary({scope,terms})} onBusy={setSupportBusy} disabled={!!stage||!!choice} t={t}/><BoardMissionPicker board={board} source={source} value={board?(board.goal||'core'):goal} onChange={chooseGoal} disabled={!!stage||!!choice||supportBusy} t={t}/><details><summary>{tr(t,'generation_preferences','Setting and learner preferences')}</summary><div className="lb-form"><label>{tr(t, 'theme', 'Setting preference (optional)')}<input value={theme} maxLength={150} disabled={!!stage || !!choice || supportBusy} onChange={e => setTheme(e.target.value)}/></label><label>{tr(t, 'level', 'Learner level (optional)')}<input value={level} maxLength={80} disabled={!!stage || !!choice || supportBusy} onChange={e => setLevel(e.target.value)}/></label></div></details><div className="lb-row lb-generate-row"><button type="button" className="lb-primary" data-generate-board disabled={!!stage || !!choice || supportBusy || source.length < 40} onClick={generate}>{board ? tr(t, 'generate_another', 'Generate another board') : tr(t, 'generate', 'Generate lesson board')}</button>{['generating','repairing'].includes(stage)&&<button type="button" onClick={cancelGeneration}>{tr(t,'cancel_generation','Cancel generation')}</button>}</div>
    {library.length > 0 && <details data-board-library><summary>{tr(t, 'saved_boards', 'Saved boards for this lesson')} ({library.length}/4)</summary>{library.map((saved, index) => <div className="lb-row" key={index}><span>{saved.title}</span><button type="button" disabled={!!stage || !!choice || supportBusy} onClick={() => setChoice({ kind: 'open', index, board: saved })}>{tr(t, 'open_saved', 'Open saved board')}</button><button type="button" disabled={!!stage || !!choice || supportBusy} onClick={() => setChoice({ kind: 'remove', index, board: saved })}>{tr(t, 'remove_saved', 'Remove saved board')}</button>{board && JSON.stringify(board) !== JSON.stringify(saved) && <button type="button" disabled={!!stage || !!choice || supportBusy} data-replace-saved={index} onClick={() => setChoice({ kind: 'replace', index, board: saved })}>{tr(t, 'replace_saved', 'Replace this saved copy')}</button>}</div>)}</details>}
    {choice && <Confirmation t={t} title={choice.kind === 'main' ? tr(t, 'return_main_lesson', 'Return to main lesson') : choice.kind === 'replace' ? tr(t, 'replace_saved', 'Replace this saved copy') : choice.kind === 'open' ? tr(t, 'open_saved', 'Open saved board') : tr(t, 'remove_saved', 'Remove saved board')} message={choice.kind === 'main' ? tr(t, 'return_main_notice', 'Return to the main lesson and its saved boards? This replaces the imported preview and its unsaved edits.') : choice.kind === 'replace' ? tr(t, 'replace_saved_notice', 'Replace the saved board {old} with the current board {next}? Download a backup first if you want to keep both versions.', { old: choice.board?.title, next: board?.title }) : choice.kind === 'open' ? tr(t, 'replace_notice', 'Replace the current preview and any unsaved edits with {name}?', { name: choice.board?.title }) : tr(t, 'remove_notice', 'Remove {name} from this browser library? The current preview stays available.', { name: choice.board?.title })} confirm={choice.kind === 'main' ? tr(t, 'return_main_confirm', 'Use main lesson') : choice.kind === 'replace' ? tr(t, 'replace_copy', 'Replace saved copy') : choice.kind === 'open' ? tr(t, 'replace_preview', 'Replace preview') : tr(t, 'remove_saved', 'Remove saved board')} onCancel={() => setChoice(null)} onConfirm={() => { try { if (choice.kind === 'main') { const saved = readLibrary(localStorage, nativeSource, requestedLanguage); setImportContext(null); setLibrary(saved); setBoard(saved[0] || null); } else if (choice.kind === 'open') {setSupportState(null);setBoard(choice.board);} else if (choice.kind === 'replace') {setLibrary(replaceSavedBoard(localStorage, source, language, choice.board, board));keepSupport(board);} else setLibrary(removeBoard(localStorage, source, language, choice.index, choice.board)); setChoice(null); setError(''); } catch (error) { reportError(error); setChoice(null); try { setLibrary(readLibrary(localStorage, source, language)); } catch (_) {} } }}/>}
    <ReportLibrary key={JSON.stringify([appId,user?.uid])} appId={appId} owner={user?.uid || 'local'} t={t}/><BoardTransfer support={support} board={board} source={source} language={language} disabled={!!stage || !!choice || supportBusy} onImport={openFile} t={t}/>
    {board && <><section className="lb-panel lb-blueprint" style={{ marginTop: 18 }}><BoardBlueprint board={board} t={t}/><CoveragePanel coverage={coverage} t={t}/>{allowLive && activeSessionCode && <label className="lb-row"><input type="checkbox" style={{width:'auto'}} data-setup-board-roles checked={useClassRoles} onChange={event=>setUseClassRoles(event.target.checked)} disabled={!!stage}/>{tr(t,'roles_toggle','Use rotating classroom roles')}</label>}<div className="lb-row lb-setup-actions"><button type="button" disabled={!!stage || !!choice || supportBusy} onClick={() => play('preview')}>{tr(t, 'try_board', 'Try the board')}</button><button type="button" data-board-play-solo disabled={!!stage || !!choice || supportBusy} onClick={() => play('solo')}>{resume?.status === 'resume' ? tr(t, 'resume_solo', 'Resume solo board') : resume?.status === 'complete' ? tr(t, 'review_solo', 'Review completed solo board') : tr(t, 'play_solo', 'Play solo')}</button><button type="button" disabled={!!stage || !!choice || supportBusy} onClick={save}>{tr(t, 'save_board', 'Save board')}</button>{allowLive && activeSessionCode && <button type="button" className="lb-primary" data-launch-board disabled={!!stage || !!choice || supportBusy || sessionData?.escapeRoomState?.isActive || sessionData?.quizState?.isActive} onClick={launch}>{tr(t, 'launch', 'Launch for everyone')}</button>}</div>{resume && <p data-solo-resume>{resume.status === 'unavailable' ? tr(t, 'solo_resume_unavailable', 'A solo save could not be checked. Open solo play to review recovery options.') : tr(t, 'solo_resume_details', 'Saved on this device: move {turn} · Concepts explored: {concepts} · Projects built: {projects}.', resume)}</p>}<p className="lb-muted">{tr(t, 'review_guidance', 'Check the activities, solutions and constructions before play. Connection and balance checks do not establish factual accuracy.')}</p>{allowLive && activeSessionCode && <p className="lb-muted">{tr(t, 'host_required', 'Keep the teacher session open and connected during live play. The teacher chooses moves and resolves activities after learners respond.')}</p>}</section>
      <BoardAuthoring board={board} source={source} disabled={!!stage || !!choice || supportBusy} t={t} onChange={next => { setNotice(''); setError(''); editBoard(next); }}/>
    </>}
  </>}</section></div>;
}
export function LessonBoardHost({ sessionData, activeSessionCode, appId }) {
  const state = sessionData?.escapeRoomState, scope = scopeOf(appId, activeSessionCode, state), [retry, setRetry] = useState(0), current = useRef({ state, sessionData, scope }); current.current = { state, sessionData, scope };
  useRuntime(scope);
  useEffect(() => {
    if (state?.mode !== 'lesson-board' || !state.isActive || runtime.locks.has(scope) || engine.validateBoard(state.board).length) return;
    const plan = latest => {
      if (current.current.scope !== scope) return null;
      const fresh = latest?.escapeRoomState;
      if (fresh?.mode !== 'lesson-board' || !fresh.isActive || fresh.attemptId !== state.attemptId) return null;
      const run = engine.runOf(fresh), step = engine.stepOf(run), requests = Object.entries(fresh.teamProgress?.All?.boardActions || {}).filter(([uid, action]) => Object.prototype.hasOwnProperty.call(latest.roster || {}, uid) && fresh.teams?.[uid] === 'All' && engine.validAction(action, fresh.attemptId, run.turn, step.retryRound || 0) && step.seen?.[uid]?.requestId !== action.requestId).slice(0, 16);
      if (!requests.length) return null;
      let next = run, patch = {};
      for (const [uid, action] of requests) { const planned = engine.processAction(fresh.board, next, action, uid, { attemptId: fresh.attemptId, active: fresh.isActive, paused: fresh.isPaused }); next = engine.merge(next, planned); Object.assign(patch, planned); }
      if (!Object.keys(patch).length) return null;
      const update = runPatch(fresh, patch); checkSize(applyDocument(latest, update)); return update;
    };
    try { if (!plan(sessionData)) return; } catch (error) { runtime.errors.set(scope,error.message); runtime.emit(); return; }
    runtime.locks.add(scope); runtime.emit();
    (async () => {
      try {
        const { fb, ref } = connection(appId, activeSessionCode);
        if (ref.__alloMbRef || !ref.__alloLanRef && typeof fb.runTransaction === 'function') await writeBoardDocument(fb, ref, plan);
        else { const update = plan(current.current.sessionData); if (update) await fb.updateDoc(ref, update); }
        runtime.errors.delete(scope);
      } catch (error) { runtime.errors.set(scope, error.message || 'Actions are waiting for confirmation.'); }
      finally { runtime.locks.delete(scope); runtime.emit(); }
    })();
  }, [state, sessionData?.roster, retry, scope]);
  useEffect(() => { const timer = setInterval(() => setRetry(n => n + 1), 5000); return () => clearInterval(timer); }, [scope]);
  return null;
}
export function LessonBoardStudent({ sessionData, user, targetAppId, activeSessionCode, t }) {
  const state = sessionData?.escapeRoomState, run = engine.runOf(state), scope = scopeOf(targetAppId, activeSessionCode, state) + ':' + user?.uid, storageKey = 'allo-board-pending:' + scope;
  const [pending, setPending] = useState(null), pendingRef = useRef(null), sendRef = useRef(null), scopeRef = useRef(scope), mounted = useRef(true), [sending, setSending] = useState(false), [slow, setSlow] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [joining, setJoining] = useState(false), joinRef = useRef(null), [pendingSaved, setPendingSaved] = useState(true); scopeRef.current = scope;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { pendingRef.current = null; sendRef.current = null; if (joinRef.current?.scope !== scope) joinRef.current = null; setJoining(!!joinRef.current); setPendingSaved(true); setPending(null); setSending(false); setError(''); setNotice(''); try { const raw = sessionStorage.getItem(storageKey); if (raw && raw.length < 1000) { const action = JSON.parse(raw); if (engine.validAction(action, state.attemptId, run.turn, engine.stepOf(run).retryRound || 0)) { pendingRef.current = action; setPending(action); } else sessionStorage.removeItem(storageKey); } } catch (_) {} }, [scope]);
  const join = async () => { if (!user?.uid || joinRef.current?.scope === scope) return; const started = scope, ticket = { scope }; joinRef.current = ticket; setJoining(true); try { const { fb, ref } = connection(targetAppId, activeSessionCode); await fb.updateDoc(ref, { ['escapeRoomState.teams.' + user.uid]: 'All' }); } catch (_) { if (mounted.current && scopeRef.current === started) setError(tr(t, 'join_failed', 'Could not join the board. Retry when connected.')); } finally { if (joinRef.current === ticket) { joinRef.current = null; if (mounted.current && scopeRef.current === started) setJoining(false); } } };
  useEffect(() => { if (user?.uid && state?.mode === 'lesson-board' && state.isActive && state.teams?.[user.uid] !== 'All') join(); }, [scope, state?.isActive]);
  const clearPending = message => { pendingRef.current = null; sendRef.current = null; setPending(null); setSending(false); setNotice(message); setError(''); try { sessionStorage.removeItem(storageKey); } catch (_) {} };
  const receipt = engine.stepOf(run).seen?.[user?.uid];
  useEffect(() => { if (!pending) return; if (receipt?.requestId === pending.requestId) clearPending(receipt.code === 'vote-recorded' ? tr(t, 'proposal_recorded', 'Your proposal is confirmed.') : ['answer-recorded', 'already-answered'].includes(receipt.code) ? tr(t, 'answer_recorded', 'Your response is confirmed. Wait for the shared review.') : tr(t, 'window_closed', 'This action window has closed. Review the current move.')); else if (!engine.validAction(pending,state.attemptId,run.turn,engine.stepOf(run).retryRound||0) || pending.turn !== run.turn || (pending.kind === 'vote' ? engine.stepOf(run).phase !== 'choose' : engine.stepOf(run).phase !== 'answer' || pending.targetId !== engine.stepOf(run).targetId)) clearPending(tr(t, 'moved_on', 'The board opened a new response window. Review the current move before responding again.')); }, [pending, receipt, run.turn, engine.stepOf(run).phase, engine.stepOf(run).targetId, engine.stepOf(run).retryRound]);
  useEffect(() => { setSlow(false); if (!pending) return; const timer = setTimeout(() => setSlow(true), 10000); return () => clearTimeout(timer); }, [pending?.requestId]);
  const transmit = async action => { if (sendRef.current || pendingRef.current?.requestId !== action.requestId) return; const started = scope, ticket = {}; sendRef.current = ticket; setSending(true); setError(''); try { const { fb, ref } = connection(targetAppId, activeSessionCode); await fb.updateDoc(ref, { ['escapeRoomState.teamProgress.All.boardActions.' + user.uid]: action }); } catch (_) { if (mounted.current && scopeRef.current === started && pendingRef.current?.requestId === action.requestId) setError(tr(t, 'send_failed', 'The action could not be sent. Your response is kept; retry when connected.')); } finally { if (sendRef.current === ticket) { sendRef.current = null; if (mounted.current && scopeRef.current === started) setSending(false); } } };
  const action = (kind, targetId, value = '') => { if (!user?.uid || pendingRef.current || state.isPaused || !state.isActive || state.teams?.[user?.uid] !== 'All') return; const next = { attemptId: state.attemptId, turn: run.turn, requestId: engine.requestId(run,'move'), kind, targetId, value }; pendingRef.current = next; setPending(next); setNotice(''); try { sessionStorage.setItem(storageKey, JSON.stringify(next)); setPendingSaved(true); } catch (_) { setPendingSaved(false); } transmit(next); };
  if (state?.mode !== 'lesson-board' || !state.isActive) return null;
  if (!user?.uid) return <div className="lb lb-overlay"><Styles/><p role="status">{tr(t, 'waiting_identity', 'Waiting for your live session connection…')}</p></div>;
  if (engine.validateBoard(state.board).length) return <div className="lb lb-overlay"><Styles/><p role="alert">{tr(t, 'invalid', 'This board could not be opened. Ask the teacher to regenerate it.')}</p></div>;
  return <div className="lb lb-overlay" data-theme={state.board.theme} role="region" aria-label={tr(t, 'live_board', 'Cooperative lesson board')}><Styles/><div className="lb-shell">{state.teams?.[user?.uid] !== 'All' && <button type="button" disabled={joining} onClick={join}>{tr(t, 'join_board', 'Join shared board')}</button>}{error && <p className="lb-notice" role="alert">{error}</p>}{pending && <div className="lb-notice" data-board-pending role="status"><p>{sending ? tr(t, 'sending', 'Sending your action…') : tr(t, 'waiting', 'Waiting for teacher confirmation. Keep this page open.')}</p>{!pendingSaved && <p>{tr(t, 'pending_not_saved', 'Browser storage is unavailable. Keep this page open until confirmation; a reload may lose this pending action.')}</p>}{(slow || error || !sending) && <button type="button" aria-disabled={sending || state.isPaused} onClick={() => { if (!sending && !state.isPaused) transmit(pending); }}>{tr(t, 'retry_action', 'Retry this action')}</button>}</div>}<BoardView support={state.boardSupport} key={scope} board={state.board} run={run} role="student" uid={user.uid} roster={sessionData.roster} pending={pending} paused={state.isPaused} busy={state.teams?.[user?.uid] !== 'All'} classRoles={state.boardRoles} notice={notice} workspaceKey={'allo-board-draft:' + scope} t={t} onMove={id => action('vote', id)} onAnswer={value => action('answer', engine.stepOf(run).targetId, value)}/></div></div>;
}
export function LessonBoardTeacher({ sessionData, appId, activeSessionCode, user, t }) {
  const state = sessionData?.escapeRoomState, scope = scopeOf(appId, activeSessionCode, state), run = engine.runOf(state), { busy, error: hostError } = useRuntime(scope), [error, setError] = useState(''), [confirm, setConfirm] = useState(''), current = useRef({ state, run, sessionData, scope }), mounted = useRef(true); current.current = { state, run, sessionData, scope };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setError(''); setConfirm(''); }, [scope]);
  const commit = async kind => {
    if (runtime.locks.has(scope)) return; runtime.locks.add(scope); runtime.emit(); setError('');
    try { const { fb, ref } = connection(appId, activeSessionCode); await writeBoardDocument(fb,ref,latest => { const fresh = latest?.escapeRoomState;
      if(!mounted.current || current.current.scope!==scope)return;
      if (!fresh || fresh.mode !== 'lesson-board' || fresh.attemptId !== state.attemptId || !fresh.isActive) throw Error('This board has changed. Review the current session.');
      const freshRun = engine.runOf(fresh); if (freshRun.turn !== run.turn || engine.stepOf(freshRun).phase !== engine.stepOf(run).phase || engine.stepOf(freshRun).targetId !== engine.stepOf(run).targetId || (engine.stepOf(freshRun).retryRound||0)!==(engine.stepOf(run).retryRound||0)) throw Error('The teacher already advanced this move.');
      let patch;
      if (kind === 'roles') patch = { 'escapeRoomState.boardRoles': rolesConfig(!state.boardRoles?.enabled, latest.roster || {}) };
      else if (kind === 'pause') patch = { 'escapeRoomState.isPaused': !state.isPaused };
      else if (kind === 'end') patch = { 'escapeRoomState.isActive': false, 'escapeRoomState.isGameOver': true };
      else if (kind === 'restart') patch = { escapeRoomState: { ...engine.createSession(fresh.board, fresh.hostId, latest.roster), boardRoles: rolesConfig(fresh.boardRoles?.enabled,latest.roster), ...(fresh.assessmentCoverage ? {assessmentCoverage:fresh.assessmentCoverage} : {}), ...(fresh.boardSupport ? {boardSupport:fresh.boardSupport} : {}) } };
      else { if (fresh.isPaused) throw Error('Resume the board before choosing a move.'); const changes = kind === 'resolve' ? engine.resolve(fresh.board, freshRun, latest.roster) : kind === 'retry' ? engine.retry(fresh.board,freshRun) : kind === 'next' ? engine.advance(fresh.board, freshRun) : engine.begin(fresh.board, freshRun, kind.move); patch = runPatch(fresh, changes); if (kind === 'next' && fresh.boardRoles?.enabled) patch['escapeRoomState.boardRoles'] = rolesConfig(true,latest.roster || {}); }
      checkSize(applyDocument(latest, patch)); return patch; }); if (mounted.current && current.current.scope===scope && current.current.state?.attemptId === state.attemptId) setConfirm('');
    } catch (error) { if (mounted.current && current.current.scope===scope && current.current.state?.attemptId === state.attemptId) setError(error.message); } finally { runtime.locks.delete(scope); runtime.emit(); }
  };
  if (state?.mode !== 'lesson-board' || !state.isActive) return null;
  if (engine.validateBoard(state.board).length) return <p role="alert">{tr(t, 'invalid', 'This board could not be opened. Ask the teacher to regenerate it.')}</p>;
  return <section className="lb lb-panel" data-theme={state.board.theme} aria-label={tr(t, 'teacher_controls', 'Lesson board teacher controls')}><Styles/><LessonBoardHost sessionData={sessionData} appId={appId} activeSessionCode={activeSessionCode}/><div className="lb-row"><button type="button" disabled={busy || !!confirm} onClick={() => commit('pause')}>{state.isPaused ? tr(t, 'resume', 'Resume board') : tr(t, 'pause', 'Pause board')}</button><button type="button" disabled={busy || !!confirm} onClick={() => setConfirm('restart')}>{tr(t, 'restart', 'Restart shared board')}</button><button type="button" disabled={busy || !!confirm} onClick={() => setConfirm('end')}>{tr(t, 'end', 'End board')}</button></div><p className="lb-muted">{tr(t, 'host_required', 'Keep the teacher session open and connected during live play. The teacher chooses moves and resolves activities after learners respond.')}</p>{(error || hostError) && <p role="alert" className="lb-notice">{error || hostError}</p>}{confirm && <Confirmation busy={busy} t={t} title={confirm === 'restart' ? tr(t, 'restart_title', 'Restart this board?') : tr(t, 'end_title', 'End the shared board?')} message={confirm === 'restart' ? tr(t, 'restart_live_notice', 'Everyone starts again with no explored locations, constructed projects, or responses. The generated board stays the same.') : tr(t, 'end_notice', 'This closes the board for everyone. Review the learning before ending.')} confirm={confirm === 'restart' ? tr(t, 'restart_everyone', 'Restart for everyone') : tr(t, 'end_everyone', 'End for everyone')} onCancel={() => setConfirm('')} onConfirm={() => commit(confirm)}/>}<BoardView support={state.boardSupport} key={scope} board={state.board} run={run} role="teacher" roster={sessionData.roster || {}} workspaceKey={'allo-board-teacher-workspace:' + scope + ':' + (user?.uid || window.__alloFirebase?.auth?.currentUser?.uid || state.hostId || '')} classRoles={state.boardRoles} onToggleRoles={()=>commit('roles')} reportContext={{appId, owner:user?.uid || window.__alloFirebase?.auth?.currentUser?.uid || state.hostId, mode:'teacher', attemptId:state.attemptId, sessionCode:activeSessionCode, coverage:state.assessmentCoverage}} busy={busy || !!confirm} paused={state.isPaused} onMove={id => commit({ move: id })} onResolve={() => commit('resolve')} onRetry={()=>commit('retry')} onAdvance={() => commit('next')} t={t}/></section>;
}
window.AlloModules = window.AlloModules || {};
window.AlloModules.LessonBoardModule = true;
window.AlloModules.LessonBoardEngine = engine;
window.AlloModules.LessonBoardSetup = LessonBoardSetup;
window.AlloModules.LessonBoardSolo = LessonBoardSolo;
window.AlloModules.LessonBoardHost = LessonBoardHost;
window.AlloModules.LessonBoardStudent = LessonBoardStudent;
window.AlloModules.LessonBoardTeacher = LessonBoardTeacher;
