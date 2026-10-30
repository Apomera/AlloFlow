
function LessonSpokenDirections({ planId, version, draft, onBack, createAudio, t, audioVoice, audioSpeed, audioLanguage, onOpenVoiceSettings, initialStepIndex = 0, onStepChange }) {
  const tr = (key, fallback) => { const value = t?.('lesson_script.' + key); return value && value !== 'lesson_script.' + key ? value : fallback; };
  const runtime = window.AlloModules?.LessonTeachingScript;
  const segments = runtime?.spokenSegments?.(version) || [];
  const [stepIndex, setStepIndex] = React.useState(() => Math.max(0, Math.min(version.steps.length - 1, Number.isInteger(initialStepIndex) ? initialStepIndex : 0))), [large, setLarge] = React.useState(false);
  const [exportScope, setExportScope] = React.useState('all');
  const exportSegments = segments.filter(segment => exportScope === 'all' || segment.stepIndex === stepIndex);
  const downloads = React.useRef(new Map());
  const playbackRevision = React.useRef(0);
  const [status, setStatus] = React.useState(''), [working, setWorking] = React.useState(''), [active, setActive] = React.useState('');
  const [summary, setSummary] = React.useState(null), [progress, setProgress] = React.useState(null);
  const audioController = React.useRef(null), request = React.useRef(null), player = React.useRef(null), surface = React.useRef(null), back = React.useRef(null);
  const alive = React.useRef(true);
  const ownsFullscreen = React.useRef(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const stop = () => {
    playbackRevision.current += 1;
    request.current?.abort(); request.current = null;
    if (player.current) { player.current.onended = null; player.current.onerror = null; player.current.pause(); player.current = null; }
    if (alive.current) { setWorking(''); setActive(''); }
  };
  const controller = () => {
    if (draft) throw new Error(tr('audio_save_edits', 'Save script edits before preparing audio.'));
    if (!audioController.current) {
      if (typeof createAudio !== 'function') throw new Error(tr('audio_loading', 'Audio tools are still loading. Try again.'));
      audioController.current = createAudio(planId, version.id);
    }
    return audioController.current;
  };
  const refresh = () => { try { setSummary(controller().summary()); } catch (_) {} };
  React.useEffect(() => {
    alive.current = true;
    if (typeof surface.current?.showModal === 'function') surface.current.showModal(); else surface.current?.setAttribute('open', '');
    back.current?.focus(); refresh();
    const changed = () => { setFullscreen(!!document.fullscreenElement); if (!document.fullscreenElement) ownsFullscreen.current = false; };
    document.addEventListener('fullscreenchange', changed);
    return () => { alive.current = false; downloads.current.forEach((timer, url) => { clearTimeout(timer); URL.revokeObjectURL(url); }); downloads.current.clear(); document.removeEventListener('fullscreenchange', changed); if (ownsFullscreen.current && document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); stop(); audioController.current?.dispose?.(); audioController.current = null; };
  }, []);
  const play = async segment => {
    stop(); const pending = new AbortController(); request.current = pending;
    setWorking('play'); setActive(segment.id); setStatus(tr('audio_preparing', 'Preparing audio…'));
    try {
      const url = await controller().resolve(segment.id, { signal: pending.signal });
      if (!alive.current || request.current !== pending) return;
      const audio = new Audio(url); player.current = audio;
      audio.onended = () => { if (request.current === pending) { stop(); setStatus(tr('audio_paused', 'Paused for student participation. Choose the next spoken block when ready.')); } };
      audio.onerror = async () => { if (request.current === pending) { stop(); const revision = playbackRevision.current;
        try { await controller().quarantine(segment.id, { reason: 'The saved spoken clip could not be decoded or loaded.' }); } catch (_) {}
        if (alive.current && playbackRevision.current === revision) { refresh(); setStatus(tr('audio_play_failed', 'Audio could not play. Use Save TTS to rebuild missing audio, then try again.')); }
      } };
      await audio.play();
      if (!alive.current || request.current !== pending) { audio.pause(); return; }
      setStatus(tr('audio_playing', 'Playing the highlighted spoken block.'));
    } catch (error) { if (alive.current && request.current === pending) { stop(); setStatus(_ltsText(error?.message || error) || tr('audio_failed', 'Audio could not be prepared. Try again.')); } }
  };
  const saveAudio = async () => {
    stop(); const pending = new AbortController(); request.current = pending;
    setWorking('save'); setProgress(null); setStatus(tr('audio_saving', 'Saving spoken audio…'));
    try {
      const result = await controller().prepareAll({ signal: pending.signal, onProgress: value => { if (alive.current && request.current === pending) setProgress(value); } });
      if (!alive.current || request.current !== pending) return;
      setStatus(result.failed ? tr('audio_partial', 'Some audio could not be saved. Save TTS again to retry missing clips.') : tr('audio_saved', 'Spoken audio is saved with this lesson plan.'));
    } catch (error) { if (alive.current && request.current === pending) setStatus(_ltsText(error?.message || error) || tr('audio_failed', 'Audio could not be prepared. Try again.')); }
    finally { if (alive.current && request.current === pending) { request.current = null; setWorking(''); refresh(); } }
  };
  const exportSpeech = async kind => {
    if (!exportSegments.length) return;
    const draftLabel = tr('draft_export_label', 'UNSAVED DRAFT — not validated');
    const draftHint = tr('draft_export_hint', 'This text includes unfinished edits. It does not update the saved script.');
    const content = (draft ? [draftLabel, draftHint, ''] : []).concat(exportSegments.map(segment => segment.spokenText)).join('\n\n');
    try {
      if (kind === 'copy') {
        if (typeof navigator.clipboard?.writeText !== 'function') throw new Error(tr('copy_unavailable', 'Copy is unavailable here. Download the text instead.'));
        await navigator.clipboard.writeText(content);
        if (alive.current) setStatus(tr('spoken_copied', 'Spoken directions copied.'));
        return;
      }
      if (kind === 'download') {
        const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
        const timer = setTimeout(() => { URL.revokeObjectURL(url); downloads.current.delete(url); }, 1000);
        downloads.current.set(url, timer);
        const link = document.createElement('a');
        const title = _ltsText(version.title).replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 100).trim() || 'teaching-script';
        link.href = url; link.download = title + '-spoken' + (exportScope === 'step' ? '-step-' + (stepIndex + 1) : '') + (draft ? '-draft' : '') + '.txt';
        document.body.appendChild(link);
        try { link.click(); } finally { link.remove(); }
        setStatus(tr('downloaded', 'Script text downloaded.'));
        return;
      }
      const popup = window.open('', '_blank', 'width=800,height=700');
      if (!popup) throw new Error(tr('print_blocked', 'Allow the print window, then try again.'));
      const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
      popup.opener = null;
      const sections = version.steps.map((step, index) => {
        const spoken = exportSegments.filter(segment => segment.stepIndex === index);
        return spoken.length ? '<section><h2 dir="auto">' + escape((index + 1) + '. ' + step.title) + '</h2>' + spoken.map(segment => '<p dir="auto">' + escape(segment.spokenText) + '</p>').join('') + '</section>' : '';
      }).join('');
      popup.document.write('<!doctype html><html lang="' + escape(document.documentElement.lang || 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escape(version.title) + '</title><style>*{box-sizing:border-box}body{font:18px/1.6 system-ui;color:#111;background:#fff;margin:0;padding:24px}main{max-width:48rem;margin:auto}p{white-space:pre-wrap;overflow-wrap:anywhere}section{break-inside:avoid}h1,h2{overflow-wrap:anywhere}h1{font-size:24px}h2{font-size:20px}@page{margin:18mm}@media print{body{padding:0}main{max-width:none}}</style></head><body><main><h1 dir="auto">' + escape(version.title) + '</h1>' + (draft ? '<p><strong>' + escape(draftLabel) + '</strong><br>' + escape(draftHint) + '</p>' : '') + sections + '</main></body></html>');
      popup.document.close(); popup.focus(); popup.print();
      if (alive.current) setStatus(tr('print_opened', 'The script print view is open.'));
    } catch (error) { if (alive.current) setStatus(_ltsText(error?.message || error) || tr('export_failed', 'The script could not be exported. Please try again.')); }
  };
  const button = 'min-h-11 rounded-lg border border-indigo-600 bg-white px-3 py-2 text-sm font-bold text-indigo-900 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50';
  const step = version.steps[stepIndex];
  const move = next => { if (!Number.isInteger(next) || next < 0 || next >= version.steps.length) return; stop(); setStatus(''); setStepIndex(next); onStepChange?.(next); refresh(); };
  return <dialog ref={surface} data-spoken-directions aria-modal="true" onCancel={event => { event.preventDefault(); onBack(); }} style={{ position: 'fixed', inset: 0, margin: 0, width: '100vw', maxWidth: 'none', height: '100dvh', maxHeight: 'none', overflowY: 'auto' }} className="min-w-0 space-y-4 border-0 bg-white p-4 text-slate-900 sm:p-6" aria-label={tr('spoken_view', 'Spoken directions')}>
    <div className="flex flex-wrap gap-2">
      <button ref={back} type="button" className={button} onClick={onBack}>{tr('full_script', 'Full script')}</button>
      <button type="button" className={button} aria-pressed={large} onClick={() => setLarge(value => !value)}>{tr('larger_text', 'Larger text')}</button>
      <button type="button" className={button} aria-pressed={fullscreen} onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); if (!alive.current) { await document.exitFullscreen(); return; } ownsFullscreen.current = true; } else throw new Error(tr('fullscreen_unavailable', 'Full screen is unavailable in this browser.')); } catch (error) { if (alive.current) setStatus(error.message); } }}>{fullscreen ? tr('exit_fullscreen', 'Exit full screen') : tr('fullscreen', 'Full screen')}</button>
    </div>
    <h3 className="break-words text-xl font-black">{version.title}</h3>
    <p className="text-sm text-slate-700">{tr('spoken_hint', 'Only wording addressed to students is shown. Playback stops after each spoken block. Review older scripts for delivery notes before playing.')}</p>
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
      <span>{tr('voice_summary', 'Voice:')} {audioVoice || tr('voice_default', 'App default')} · {tr('language', 'Script language:')} {audioLanguage || 'English'} · {audioSpeed || 1}×</span>
      {typeof onOpenVoiceSettings === 'function' && <button type="button" className={button} onClick={() => { stop(); onBack(); onOpenVoiceSettings(); }}>{tr('voice_settings', 'Voice settings')}</button>}
    </div>
    <details className="space-y-2">
      <summary className={button + ' cursor-pointer'}>{tr('spoken_export_menu', 'Export directions')}</summary>
      <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 text-sm font-bold">{tr('spoken_export_scope', 'Directions to export')}
        <select aria-label={tr('spoken_export_scope', 'Directions to export')} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600" value={exportScope} onChange={event => setExportScope(event.target.value)}>
          <option value="all">{tr('spoken_export_all', 'All steps')}</option><option value="step">{tr('spoken_export_step', 'Current step')}</option>
        </select>
      </label>
      <button type="button" className={button} disabled={!exportSegments.length} onClick={() => exportSpeech('copy')}>{tr('copy_spoken', 'Copy spoken directions')}</button>
      <button type="button" className={button} disabled={!exportSegments.length} onClick={() => exportSpeech('download')}>{tr('download_spoken', 'Download spoken directions')}</button>
      <button type="button" className={button} disabled={!exportSegments.length} onClick={() => exportSpeech('print')}>{tr('print_spoken', 'Print spoken directions')}</button>
      </div>
    </details>
    {draft && <p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-950">{tr('audio_save_edits', 'Save script edits before preparing audio.')}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={button} disabled={!!draft || !!working || !segments.length} onClick={saveAudio}>{tr('save_tts', 'Save TTS')}</button>
      {working && <button type="button" className={button} onClick={() => { stop(); refresh(); setStatus(tr('audio_stopped', 'Stopped. Saved clips are kept; Save TTS resumes missing clips.')); }}>{tr('stop_audio', 'Stop audio')}</button>}
      {summary && <span className="text-sm">{summary.ready}/{summary.total} {tr('audio_clips_saved', 'spoken clips saved')}</span>}
      {working === 'save' && progress && <span role="status">{progress.completed}/{progress.total}</span>}
    </div>
    <p role="status" className="text-sm text-indigo-950">{status}</p>
    <nav className="flex flex-wrap items-center justify-between gap-2" aria-label={tr('spoken_steps', 'Spoken step navigation')}>
      <button type="button" className={button} disabled={stepIndex === 0} onClick={() => move(stepIndex - 1)}>{tr('previous_step', 'Previous step')}</button>
      <span className="font-bold">{stepIndex + 1} / {version.steps.length}</span>
      <button type="button" className={button} disabled={stepIndex >= version.steps.length - 1} onClick={() => move(stepIndex + 1)}>{tr('next_step', 'Next step')}</button>
    </nav>
    <label className="block text-sm font-bold">{tr('jump_step', 'Go to step')}
      <select aria-label={tr('jump_step', 'Go to step')} className="mt-1 block min-h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-400 bg-white p-2 text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600" value={stepIndex} onChange={event => move(Number(event.target.value))}>
        {version.steps.map((item, index) => <option key={item.id || index} value={index}>{index + 1}. {item.title}</option>)}
      </select>
    </label>
    <h4 aria-live="polite" aria-atomic="true" className="break-words text-lg font-bold">{stepIndex + 1}. {step?.title}</h4>
    {!segments.some(segment => segment.stepIndex === stepIndex) && <p className="rounded-lg bg-slate-100 p-3 text-slate-700">{tr('spoken_step_empty', 'This step has no spoken directions. Choose another step or edit the full script.')}</p>}
    {segments.filter(segment => segment.stepIndex === stepIndex).map(segment => <div key={segment.id} data-spoken-block={segment.field} className={'space-y-3 rounded-xl border-2 p-4 ' + (active === segment.id ? 'border-indigo-700 bg-indigo-100' : 'border-indigo-300 bg-indigo-50')}>
      <p className="text-sm font-bold"><span aria-hidden="true">❝ </span>{segment.field === 'checkQuestion' ? tr('ask_aloud', 'Ask aloud') : tr('say_aloud', 'Say aloud')}</p>
      <p dir="auto" className={'whitespace-pre-wrap break-words leading-relaxed ' + (large ? 'text-2xl' : 'text-xl')}>{segment.spokenText}</p>
      <button type="button" className={button} disabled={!!draft || working === 'save'} onClick={() => play(segment)} aria-label={tr('play_block', 'Play spoken block') + ': ' + (segment.field === 'checkQuestion' ? tr('ask_aloud', 'Ask aloud') : tr('say_aloud', 'Say aloud'))}>{tr('play_block', 'Play spoken block')}</button>
    </div>)}
  </dialog>;
}

// Teacher-only, lesson-aware teaching script attached to a saved lesson plan. Generation and persistence belong to the host.
const _LTS_GRADES = ['Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade', 'College', 'Graduate Level'];
const _LTS_SUBJECTS = [['mathematics', 'Mathematics'], ['reading', 'Reading and literacy'], ['writing', 'Writing'], ['science', 'Science'], ['social-studies', 'Social studies and history'], ['world-languages', 'World languages'], ['arts', 'Arts and music'], ['health-pe', 'Health and physical education'], ['technology', 'Technology and computer science'], ['other', 'Other or interdisciplinary']];
const _LTS_SCOPES = { segment: { minSteps: 3, maxSteps: 8, minMinutes: 5, maxMinutes: 60, maxStepMinutes: 30 }, lesson: { minSteps: 4, maxSteps: 24, minMinutes: 15, maxMinutes: 240, maxStepMinutes: 60 } };
const _LTS_PHASES = { hook: 'Hook', directInstruction: 'Direct instruction', guidedPractice: 'Guided practice', independentPractice: 'Independent practice', closure: 'Closure' };
function _ltsText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') return _ltsText(value.en || value.text || value.title);
  return '';
}
// Plans saved before 2026-10-29 carry "; retrieved page text offset N", a line index into the reader's copy that no teacher can look up.
function _ltsLocator(value) {
  return _ltsText(value).replace(/;\s*retrieved page text offset \d+/i, '').trim();
}
function _ltsReadableDate(value) {
  const text = _ltsText(value);
  const date = new Date(text);
  return text && Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : text;
}
function _ltsSafeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch (_) { return ''; }
}
function _ltsGradeLabel(value) {
  // Pilot versions stored a bare number; show it in the app's grade vocabulary.
  const n = typeof value === 'number' ? value : /^\d{1,2}$/.test(String(value || '').trim()) ? Number(value) : NaN;
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] && !(n >= 11 && n <= 13) ? { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] : 'th') + ' Grade';
  return _ltsText(value);
}
function _ltsRules(version) {
  if (!version) return _LTS_SCOPES.segment;
  if (version.schemaVersion === 1) return { minSteps: 3, maxSteps: 6, maxStepMinutes: 20 };
  return _LTS_SCOPES[version.scope === 'lesson' ? 'lesson' : 'segment'];
}
// Recovery is limited to this tab, teacher/workspace scope, and saved plan.
const _LTS_SESSION_LIMIT = 800000;
const _LTS_TEXT_FIELDS = ['teacherSays', 'studentDoes', 'checkQuestion', 'possibleResponse', 'ifStruggling', 'ifReady'];
const _ltsRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
const _ltsBoundedString = (value, limit) => typeof value === 'string' && value.length <= limit;
function _ltsSessionKey(scope, planId) {
  return _ltsBoundedString(scope, 2048) && scope.trim() && _ltsBoundedString(planId, 160) && planId ? 'alloflow:lesson-script-session:v1:' + encodeURIComponent(scope) + ':' + encodeURIComponent(planId) : '';
}
function _ltsSessionSettings(value) {
  return _ltsRecord(value) && [['goal', 1200], ['grade', 200], ['subject', 80], ['topic', 200], ['priorKnowledge', 2000], ['standard', 4000]].every(([key, limit]) => _ltsBoundedString(value[key], limit))
    && (value.inferContext == null || _ltsRecord(value.inferContext) && ['subject', 'topic'].every(key => typeof value.inferContext[key] === 'boolean'))
    && ['segment', 'lesson'].includes(value.scope) && typeof value.researchEnabled === 'boolean'
    && (value.durationMinutes === '' || typeof value.durationMinutes === 'number' && Number.isFinite(value.durationMinutes) && Math.abs(value.durationMinutes) <= 1000000)
    && Array.isArray(value.materialIds) && value.materialIds.length <= 500 && value.materialIds.every(id => _ltsBoundedString(id, 160));
}
function _ltsSessionSteps(steps) {
  return Array.isArray(steps) && steps.length > 0 && steps.length <= 24 && steps.every(step => _ltsRecord(step)
    && _ltsBoundedString(step.id, 160) && _ltsBoundedString(step.title, 1000) && (step.phase == null || _ltsBoundedString(step.phase, 100))
    && (step.minutes === '' || ['string', 'number'].includes(typeof step.minutes) && String(step.minutes).length <= 32 && Number.isFinite(Number(step.minutes)))
    && _LTS_TEXT_FIELDS.every(key => _ltsBoundedString(step[key], 20000))
    && ['resourceIds', 'recommendationIds'].every(key => Array.isArray(step[key]) && step[key].length <= 500 && step[key].every(id => _ltsBoundedString(id, 160))));
}
function _ltsSessionStepUndo(entries, steps) {
  return entries == null || Array.isArray(entries) && entries.length <= 24 && Array.isArray(steps)
    && new Set(entries.map(entry => entry?.stepId)).size === entries.length
    && entries.every(entry => {
      if (!_ltsRecord(entry) || !_ltsBoundedString(entry.stepId, 160) || !entry.stepId || !_ltsSessionSteps([entry.previous]) || entry.kind != null && !['replacement', 'restore'].includes(entry.kind)) return false;
      const matches = steps.filter(step => step?.id === entry.stepId), current = matches[0];
      return matches.length === 1 && entry.previous.id === entry.stepId && (entry.previous.phase || '') === (current.phase || '')
        && (entry.kind === 'restore' || Number(entry.previous.minutes) === Number(current.minutes));
    });
}
const _ltsOptionalStrings = (value, keys, limit) => keys.every(key => value[key] == null || _ltsBoundedString(value[key], limit));
function _ltsSessionSource(source) {
  return _ltsRecord(source) && _ltsOptionalStrings(source, ['id', 'title', 'url', 'author', 'publishedAt', 'evidenceKind', 'scope', 'evidenceLevel', 'retrievedAt'], 4000)
    && (source.recommendations == null || Array.isArray(source.recommendations) && source.recommendations.length <= 100 && source.recommendations.every(item => _ltsRecord(item) && _ltsOptionalStrings(item, ['id', 'text', 'locator', 'evidenceLevel'], 20000)));
}
function _ltsSessionVersion(version) {
  const snapshot = version?.inputSnapshot, settings = snapshot?.settings;
  return _ltsRecord(version) && _ltsBoundedString(version.id, 160) && version.id && [1, 2].includes(version.schemaVersion)
    && _ltsBoundedString(version.title, 1000) && Number.isFinite(version.durationMinutes) && version.durationMinutes > 0 && version.durationMinutes <= 240
    && _ltsOptionalStrings(version, ['createdAt', 'researchStatus'], 100) && (!version.scope || ['segment', 'lesson'].includes(version.scope))
    && (version.sources == null || Array.isArray(version.sources) && version.sources.length <= 100 && version.sources.every(_ltsSessionSource))
    && (version.warnings == null || Array.isArray(version.warnings) && version.warnings.length <= 100 && version.warnings.every(item => _ltsBoundedString(item, 20000)))
    && (snapshot == null || _ltsRecord(snapshot) && _ltsOptionalStrings(snapshot, ['planFingerprint'], 1000)
      && (settings == null || _ltsRecord(settings) && _ltsOptionalStrings(settings, ['subject'], 200)
        && (settings.grade == null || _ltsBoundedString(settings.grade, 200) || typeof settings.grade === 'number' && Number.isFinite(settings.grade))))
    && _ltsSessionSteps(version.steps);
}
function _ltsSessionValue(value) {
  return _ltsRecord(value) && value.schemaVersion === 1 && _ltsBoundedString(value.scope, 2048) && _ltsBoundedString(value.planId, 160) && _ltsSessionSettings(value.settings)
    && _ltsRecord(value.defaults) && ['goal', 'grade', 'subject', 'topic', 'standard'].every(key => _ltsBoundedString(value.defaults[key], 4000))
    && _ltsBoundedString(value.selectedId, 160)
    && (value.draft == null || _ltsRecord(value.draft) && _ltsSessionVersion(value.draft.version) && _ltsBoundedString(value.draft.baseline, _LTS_SESSION_LIMIT)
      && _ltsSessionSteps(JSON.parse(value.draft.baseline)) && _ltsSessionSteps(value.draft.steps) && _ltsSessionStepUndo(value.draft.stepUndo, value.draft.steps));
}
function _ltsReadSession(key, scope, planId) {
  if (!key) return { value: null, status: 'unavailable' };
  let raw;
  try { raw = window.sessionStorage.getItem(key); } catch (_) { return { value: null, status: 'unavailable' }; }
  if (!raw) return { value: null, status: '' };
  try {
    if (raw.length > _LTS_SESSION_LIMIT) throw new Error('Oversized recovery data');
    const value = JSON.parse(raw);
    // Optional undo history must not prevent recovery of the teacher's main draft.
    if (_ltsRecord(value?.draft) && !_ltsSessionStepUndo(value.draft.stepUndo, value.draft.steps)) value.draft.stepUndo = [];
    if (!_ltsSessionValue(value) || value.scope !== scope || value.planId !== planId) throw new Error('Invalid recovery data');
    return { value, status: 'restored' };
  } catch (_) { return { value: null, status: 'invalid' }; }
}
function _ltsWriteSession(key, value) {
  if (!key) return 'unavailable';
  try {
    if (!_ltsSessionValue(value)) return 'large';
    let raw = JSON.stringify(value);
    // The current draft takes priority over optional undo snapshots near the tab limit.
    if (raw.length > _LTS_SESSION_LIMIT && value.draft?.stepUndo?.length) raw = JSON.stringify({ ...value, draft: { ...value.draft, stepUndo: [] } });
    if (raw.length > _LTS_SESSION_LIMIT) return 'large';
    window.sessionStorage.setItem(key, raw);
    return '';
  } catch (_) { return 'unavailable'; }
}
// A save may finish after navigation. Clear only the submitted recovery draft,
// never edits made by a newly mounted view while the request was pending.
function _ltsClearSubmittedDraft(key, scope, planId, submitted) {
  const stored = _ltsReadSession(key, scope, planId).value;
  if (!stored?.draft || JSON.stringify(stored.draft.steps) !== JSON.stringify(submitted.steps) || stored.draft.baseline !== submitted.baseline || stored.draft.version.id !== submitted.version.id) return '';
  return _ltsWriteSession(key, { ...stored, draft: null });
}
function LessonTeachingScriptView(props) {
  if (!props.isTeacherMode || props.isParentMode || props.isIndependentMode || !props.generatedContent?.id || props.generatedContent.type !== 'lesson-plan') return null;
  return <LessonTeachingScriptPanel key={JSON.stringify([props.draftScope || '', String(props.generatedContent.id)])} {...props} />;
}
function LessonTeachingScriptPanel(props) {
  const { generatedContent: plan, history = [], capabilities = {}, defaultSettings = {}, scriptRun = {}, onGenerateTeachingScript, onCancelTeachingScript, onUpdateTeachingScript, onOpenTeachingMaterial, onGetTeachingScriptRecovery, onDiscardTeachingScriptRecovery, onRegenerateTeachingStep } = props;
  const tr = (key, fallback) => { const value = props.t?.('lesson_script.' + key); return value && value !== 'lesson_script.' + key ? value : fallback; };
  const id = React.useId();
  const planId = String(plan.id);
  const draftScope = typeof props.draftScope === 'string' ? props.draftScope : '';
  const recoveryKey = _ltsSessionKey(draftScope, planId);
  const [recovery] = React.useState(() => _ltsReadSession(recoveryKey, draftScope, planId));
  const restored = recovery.value;
  const [recoveryStatus, setRecoveryStatus] = React.useState(recovery.status);
  const [showRecoveryNotice, setShowRecoveryNotice] = React.useState(!!restored);
  const savedVersions = Array.isArray(plan.data?.teachingScripts) ? plan.data.teachingScripts : [];
  const versions = savedVersions.filter(version => version && version.id && Array.isArray(version.steps) && version.steps.length && version.steps.every(step => step && typeof step === 'object' && !Array.isArray(step)));
  const hasIncompleteVersions = versions.length !== savedVersions.length;
  const runtime = window.AlloModules?.LessonTeachingScript;
  const materials = (Array.isArray(history) ? history : []).filter(item => item && item.id != null && String(item.id) !== planId);
  const materialAvailable = material => materials.filter(item => String(item.id) === String(material.id)).length === 1 && (typeof runtime?.hasTeachingMaterialText !== 'function' || runtime.hasTeachingMaterialText(material));
  const gradeOptions = Array.isArray(defaultSettings.gradeOptions) && defaultSettings.gradeOptions.length ? defaultSettings.gradeOptions.map(_ltsText) : _LTS_GRADES;
  const subjectOptions = Array.isArray(defaultSettings.subjectOptions) && defaultSettings.subjectOptions.length ? defaultSettings.subjectOptions.map(item => [String(item.id), _ltsText(item.label)]) : _LTS_SUBJECTS;
  const scopes = defaultSettings.scopes && defaultSettings.scopes.segment && defaultSettings.scopes.lesson ? defaultSettings.scopes : _LTS_SCOPES;
  const initialGrade = _ltsText(defaultSettings.grade);
  const suggested = defaultSettings.suggestedDuration || {};
  const detectedDefaults = {
    goal: ((Array.isArray(plan.data?.objectives) ? plan.data.objectives.map(_ltsText).filter(Boolean).join('; ') : _ltsText(plan.data?.objectives)) || _ltsText(plan.data?.essentialQuestion)).slice(0, 1200),
    grade: initialGrade, subject: subjectOptions.some(([value]) => value === defaultSettings.subject) ? defaultSettings.subject : 'other',
    topic: _ltsText(defaultSettings.topic).slice(0, 200), standard: _ltsText(defaultSettings.standard)
  };
  const [spokenOnly, setSpokenOnly] = React.useState(false);
  const [spokenPosition, setSpokenPosition] = React.useState(null);
  const [deleteCandidate, setDeleteCandidate] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const discardToggle = React.useRef(null);
  const deleteToggle = React.useRef(null);
  const versionSelect = React.useRef(null);
  const restoreDeleteFocus = React.useRef(false);
  const deletingRequest = React.useRef(false);
  const editActions = React.useRef(null);
  const focusNewDraft = React.useRef(false);
  const spokenToggle = React.useRef(null);
  const [expanded, setExpanded] = React.useState(!!restored);
  const [settingsExpanded, setSettingsExpanded] = React.useState(() => restored ? !restored.draft : versions.length === 0);
  const settingsToggle = React.useRef(null);
  const panelToggle = React.useRef(null);
  const editToggle = React.useRef(null);
  const restoreEditFocus = React.useRef(false);
  const previousDefaults = React.useRef(restored?.defaults || detectedDefaults);
  const [defaultsChanged, setDefaultsChanged] = React.useState(false);
  const [, refreshDefaultsRecord] = React.useState(0);
  const [goal, setGoal] = React.useState(restored?.settings.goal ?? detectedDefaults.goal);
  const [grade, setGrade] = React.useState(restored?.settings.grade ?? initialGrade);
  const [subject, setSubject] = React.useState(() => restored?.settings.subject ?? detectedDefaults.subject);
  const [topic, setTopic] = React.useState(restored?.settings.topic ?? detectedDefaults.topic);
  // Older recovery copies predate explicit overrides. Treat their unchanged detected
  // defaults as automatic, while retaining any teacher-edited subject or topic.
  const [inferContext, setInferContext] = React.useState(() => restored?.settings.inferContext || {
    subject: !restored || restored.settings.subject === restored.defaults.subject,
    topic: !restored || restored.settings.topic === restored.defaults.topic
  });
  const [scope, setScope] = React.useState(restored?.settings.scope || 'segment');
  const [durationMinutes, setDurationMinutes] = React.useState(() => restored?.settings.durationMinutes ?? (Number(suggested.segment) || 15));
  const [priorKnowledge, setPriorKnowledge] = React.useState(restored?.settings.priorKnowledge || '');
  const [standard, setStandard] = React.useState(restored?.settings.standard ?? detectedDefaults.standard);
  const [researchEnabled, setResearchEnabled] = React.useState(restored?.settings.researchEnabled ?? true);
  const [materialIds, setMaterialIds] = React.useState(() => restored?.settings.materialIds || materials.filter(materialAvailable).slice(0,3).map(item => String(item.id)));
  const [selectedId, setSelectedId] = React.useState(() => restored?.draft?.version.id || restored?.selectedId || String(versions[versions.length - 1]?.id || ''));
  const [draft, setDraft] = React.useState(restored?.draft?.steps || null);
  const [stepUndo, setStepUndo] = React.useState(restored?.draft?.stepUndo || []);
  const [draftSnapshot, setDraftSnapshot] = React.useState(restored?.draft?.version || null);
  const [draftBase, setDraftBase] = React.useState(restored?.draft?.baseline || '');
  const [draftVersionId, setDraftVersionId] = React.useState(restored?.draft?.version.id || '');
  const [localBusy, setLocalBusy] = React.useState(false);
  const [, refreshGenerationRecovery] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [localError, setLocalError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [regenerateIndex, setRegenerateIndex] = React.useState(null);
  const [regenerateInstruction, setRegenerateInstruction] = React.useState('');
  const [regeneratingStep, setRegeneratingStep] = React.useState(null);
  const regenerateFocus = React.useRef(null);
  const latestVersion = React.useRef(null);
  const mounted = React.useRef(true);
  const requestOwner = React.useRef(0);
  const generatingRequest = React.useRef(false);
  const savingRequest = React.useRef(false);
  const downloads = React.useRef(new Map());
  const previousVersions = React.useRef(versions.map(version => String(version.id)));
  const canonicalVersion = versions.find(item => String(item.id) === (draft ? draftVersionId : selectedId)) || (!draft ? versions[versions.length - 1] : null) || null;
  const version = canonicalVersion || (draft ? draftSnapshot : null);
  const hostRun = String(scriptRun.planId || '') === planId ? scriptRun : {};
  const busy = !!hostRun.busy || localBusy;
  const error = localError || _ltsText(hostRun.error?.message || hostRun.error);
  const canGenerate = capabilities.canGenerate === true && typeof onGenerateTeachingScript === 'function';
  const canResearch = capabilities.canResearch === true;
  const rules = scopes[scope] || _LTS_SCOPES.segment;
  const durationValid = Number.isInteger(Number(durationMinutes)) && Number(durationMinutes) >= rules.minMinutes && Number(durationMinutes) <= rules.maxMinutes;
  const sourceSteps = canonicalVersion?.steps || [];
  const steps = draft || sourceSteps;
  const versionRules = _ltsRules(version);
  const timings = steps.reduce((sum, step) => sum + Number(step.minutes || 0), 0);
  const invalidStepTiming = !!draft && draft.some(step => !Number.isInteger(Number(step.minutes)) || Number(step.minutes) < 1 || Number(step.minutes) > versionRules.maxStepMinutes);
  const invalidTiming = !!draft && (invalidStepTiming || timings !== Number(version?.durationMinutes));
  const draftTextProblems = (draft || []).map(step => ({
    incomplete: _ltsText(step.title).trim().length < 2 || _ltsText(step.title).trim().length > 240 || _LTS_TEXT_FIELDS.some(key => _ltsText(step[key]).trim().length < (key === 'teacherSays' ? 60 : 12)),
    oversized: _LTS_TEXT_FIELDS.some(key => _ltsText(step[key]).trim().length > 16000)
  }));
  const invalidDraftText = draftTextProblems.some(problem => problem.incomplete);
  const invalidDraftLength = draftTextProblems.some(problem => problem.oversized);
  const timingDifference = Number(version?.durationMinutes) - timings;
  const timingAdjustment = invalidTiming && !invalidStepTiming ? (timingDifference > 0
    ? timingDifference === 1 ? tr('timing_add_one', 'Add 1 minute across steps to meet the saved teaching time.') : tr('timing_add', 'Add {count} minutes across steps to meet the saved teaching time.')
    : timingDifference === -1 ? tr('timing_remove_one', 'Remove 1 minute across steps to meet the saved teaching time.') : tr('timing_remove', 'Remove {count} minutes across steps to meet the saved teaching time.')).replace('{count}', String(Math.abs(timingDifference))) : '';
  const regenerationIssue = index => {
    if (invalidTiming) return timingAdjustment || tr('step_timing_blocker', 'Use positive whole minutes within the allowed range for every step before regenerating.');
    // The replacement can repair this step's wording; every untouched step must stay valid.
    const otherIssue = draftTextProblems.findIndex((problem, offset) => offset !== index && (problem.incomplete || problem.oversized));
    return otherIssue >= 0 ? tr('step_other_blocker', 'Complete the highlighted fields in step {number} before regenerating this step.').replace('{number}', String(otherIssue + 1)) : '';
  };
  const draftChanged = !!draft && JSON.stringify(draft.map(step => ({ ...step, minutes: Number(step.minutes) }))) !== draftBase;
  const stepChanged = index => !!draft && !!sourceSteps[index] && steps[index]?.id === sourceSteps[index].id
    && JSON.stringify({ ...steps[index], minutes: Number(steps[index].minutes) }) !== JSON.stringify(sourceSteps[index]);
  const staleDraft = !!draft && (!canonicalVersion || String(canonicalVersion.id) !== draftVersionId || JSON.stringify(sourceSteps) !== draftBase);
  latestVersion.current = { id: String(version?.id || ''), baseline: JSON.stringify(sourceSteps) };
  const selectedMaterials = materials.filter(item => materialIds.includes(String(item.id)) && materialAvailable(item));
  const unavailableMaterialIds = materialIds.filter(id => !selectedMaterials.some(item => String(item.id) === id));
  const generationSettings = {
    goal: goal.trim(), grade, subject, topic: topic.trim(), inferContext: { ...inferContext }, scope, durationMinutes: Number(durationMinutes),
    priorKnowledge: priorKnowledge.trim(), researchEnabled, materialIds: selectedMaterials.map(item => item.id),
    language: _ltsText(defaultSettings.language) || 'English', standard: standard.trim()
  };
  let generationRecovery = null;
  try {
    const saved = onGetTeachingScriptRecovery?.(generationSettings);
    if (saved && Number.isInteger(saved.completedChunks) && Number.isInteger(saved.totalChunks) && saved.totalChunks > 0 && saved.completedChunks >= 0 && saved.completedChunks <= saved.totalChunks
      && (saved.completedChunks > 0 || ['generating', 'chunking'].includes(saved.stage))) generationRecovery = saved;
  } catch (_) { /* A missing checkpoint must not prevent reading or generating a script. */ }
  const canFinishSaving = generationRecovery?.stage === 'ready' && generationRecovery.completedChunks === generationRecovery.totalChunks && typeof onGenerateTeachingScript === 'function';
  const canReuseResearch = !!generationRecovery && ['generating', 'chunking', 'ready'].includes(generationRecovery.stage);
  const canContinueGeneration = canFinishSaving || canGenerate && (!researchEnabled || canResearch || canReuseResearch);
  // A settings mismatch hides Resume, but must not hide generated work that a reload would lose.
  let pendingGenerationRecovery = generationRecovery;
  if (!pendingGenerationRecovery) {
    try { pendingGenerationRecovery = onGetTeachingScriptRecovery?.() || null; } catch (_) { /* Optional recovery status. */ }
  }
  const memoryOnlyGeneration = pendingGenerationRecovery?.persistence === 'memory'
    && Number.isInteger(pendingGenerationRecovery.completedChunks) && Number.isInteger(pendingGenerationRecovery.totalChunks)
    && pendingGenerationRecovery.totalChunks > 0 && pendingGenerationRecovery.completedChunks >= 0
    && pendingGenerationRecovery.completedChunks <= pendingGenerationRecovery.totalChunks
    && ['generating', 'chunking', 'ready'].includes(pendingGenerationRecovery.stage);
  let inputWarnings = [], planChangedSinceScript = false, materialStatus = null;
  try {
    if (version && typeof runtime?.getMaterialStatus === 'function') materialStatus = runtime.getMaterialStatus(version, materials);
    if (typeof runtime?.captureInputs === 'function') {
      const preview = runtime.captureInputs(plan, { goal, grade, subject, topic, scope, durationMinutes, standard }, selectedMaterials);
      if (typeof runtime.getInputWarnings === 'function') inputWarnings = runtime.getInputWarnings(preview);
      planChangedSinceScript = !!version?.inputSnapshot?.planFingerprint && preview.planFingerprint !== version.inputSnapshot.planFingerprint;
    }
  } catch (_) { /* Optional input previews must not prevent reading saved scripts while dependencies load. */ }
  const sources = Array.isArray(version?.sources) ? version.sources.filter(source => source && typeof source === 'object') : [];
  const recommendationById = new Map();
  sources.forEach(source => (Array.isArray(source.recommendations) ? source.recommendations : []).filter(recommendation => recommendation && typeof recommendation === 'object').forEach(recommendation => recommendationById.set(String(recommendation.id), { source, recommendation })));
  const subjectLabel = value => (subjectOptions.find(([key]) => key === value) || [])[1] || _ltsText(value);
  const scopeLabel = item => item && item.schemaVersion !== 1 && item.scope === 'lesson' ? tr('scope_lesson', 'Whole lesson') : tr('scope_segment', 'Direct-instruction segment');
  const formReady = !!goal.trim() && !!grade && (inferContext.subject || !!subject) && (inferContext.topic || subject !== 'other' || !!topic.trim()) && durationValid && selectedMaterials.length > 0 && unavailableMaterialIds.length === 0;
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestOwner.current += 1;
      downloads.current.forEach((timer, url) => { clearTimeout(timer); URL.revokeObjectURL(url); });
      downloads.current.clear();
    };
  }, []);
  React.useEffect(() => {
    if (regenerateFocus.current === null || regeneratingStep !== null) return;
    const index = regenerateFocus.current; regenerateFocus.current = null;
    (document.getElementById(id + '-edit-' + index + '-title') || document.getElementById(id + '-regenerate-' + index))?.focus();
  }, [draft, regeneratingStep, regenerateIndex]);
  const defaultsKey = JSON.stringify(detectedDefaults);
  React.useEffect(() => {
    if (busy || saving || JSON.stringify(previousDefaults.current) === defaultsKey) return;
    const previous = previousDefaults.current;
    [[setGoal, 'goal'], [setGrade, 'grade'], [setStandard, 'standard']].forEach(([setValue, key]) => setValue(current => current === previous[key] ? detectedDefaults[key] : current));
    if (inferContext.subject) setSubject(detectedDefaults.subject);
    if (inferContext.topic) setTopic(detectedDefaults.topic);
    previousDefaults.current = detectedDefaults;
    setDefaultsChanged(true);
    refreshDefaultsRecord(revision => revision + 1);
  }, [defaultsKey, busy, saving]);
  React.useEffect(() => {
    if (!draft && restoreEditFocus.current) { restoreEditFocus.current = false; (editToggle.current || settingsToggle.current || panelToggle.current)?.focus(); }
  }, [draft]);
  React.useEffect(() => {
    if (draft && focusNewDraft.current && !spokenOnly) {
      focusNewDraft.current = false;
      document.getElementById(id + '-edit-0-title')?.focus();
    }
  }, [!!draft, spokenOnly]);
  React.useEffect(() => {
    if (!deleteCandidate && !deleting && restoreDeleteFocus.current) {
      restoreDeleteFocus.current = false;
      (versionSelect.current || settingsToggle.current || panelToggle.current)?.focus();
    }
  }, [deleteCandidate, deleting]);
  const useCurrentDefaults = () => {
    setGoal(detectedDefaults.goal); setGrade(detectedDefaults.grade); setSubject(detectedDefaults.subject);
    setTopic(detectedDefaults.topic); setInferContext({ subject: true, topic: true }); setStandard(detectedDefaults.standard); setDefaultsChanged(false);
  };
  const recoveryValue = {
    schemaVersion: 1, scope: draftScope, planId,
    settings: { goal, grade, subject, topic, inferContext, scope, durationMinutes, priorKnowledge, standard, researchEnabled, materialIds },
    defaults: previousDefaults.current, selectedId,
    draft: draft ? { version: draftSnapshot, baseline: draftBase, steps: draft, stepUndo } : null
  };
  const recoveryPayload = JSON.stringify(recoveryValue);
  const initialPayload = React.useRef(recoveryPayload);
  const lastWrittenPayload = React.useRef(restored ? recoveryPayload : '');
  const hasSessionWork = !!restored || !!lastWrittenPayload.current || recoveryPayload !== initialPayload.current;
  React.useLayoutEffect(() => {
    if (!hasSessionWork || recoveryPayload === lastWrittenPayload.current) return;
    const status = _ltsWriteSession(recoveryKey, recoveryValue);
    if (!status) lastWrittenPayload.current = recoveryPayload;
    setRecoveryStatus(status);
  }, [recoveryPayload, hasSessionWork, recoveryKey]);
  React.useEffect(() => {
    if (!memoryOnlyGeneration && (!draft || !['unavailable', 'large'].includes(recoveryStatus))) return;
    const protectUnrecoverableWork = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protectUnrecoverableWork);
    return () => window.removeEventListener('beforeunload', protectUnrecoverableWork);
  }, [!!draft, recoveryStatus, memoryOnlyGeneration]);
  const versionIds = versions.map(item => String(item.id)).join('|');
  React.useEffect(() => {
    const added = versions.filter(item => !previousVersions.current.includes(String(item.id)));
    previousVersions.current = versions.map(item => String(item.id));
    if (added.length && !draft) {
      setSelectedId(String(added[added.length - 1].id));
      setNotice(tr('added', 'Script added to this plan.'));
      setSettingsExpanded(false);
      // Keep keyboard focus visible when the generation form closes after success.
      settingsToggle.current?.focus();
    }
  }, [versionIds]);
  const toggleMaterial = resourceId => setMaterialIds(previous => previous.includes(resourceId) ? previous.filter(item => item !== resourceId) : previous.concat(resourceId));
  const chooseScope = next => {
    if (next === scope) return;
    setScope(next);
    // Each scope has its own realistic default; the teacher can still edit the minutes afterwards.
    setDurationMinutes(Number(suggested[next]) || (next === 'lesson' ? 45 : 15));
  };
  const generate = async (event, startOver = false) => {
    event?.preventDefault();
    const available = startOver ? canGenerate && (!researchEnabled || canResearch) : canContinueGeneration;
    if (generatingRequest.current || deletingRequest.current || deleting || busy || saving || draft || !available || !formReady) return;
    const owner = ++requestOwner.current;
    generatingRequest.current = true;
    setLocalBusy(true); setLocalError(''); setNotice('');
    try {
      if (startOver) {
        const cleared = await onDiscardTeachingScriptRecovery?.();
        if (cleared?.ok !== true) throw new Error(_ltsText(cleared?.error?.message || cleared?.error) || tr('restart_failed', 'The saved progress could not be cleared. Try again.'));
        if (!mounted.current || owner !== requestOwner.current) return;
      }
      const result = await onGenerateTeachingScript(generationSettings);
      if (result?.ok && mounted.current && owner === requestOwner.current) {
        const resolved = result.version?.inputSnapshot?.settings;
        if (inferContext.subject && subjectOptions.some(([value]) => value === resolved?.subject)) setSubject(resolved.subject);
        if (inferContext.topic && typeof resolved?.topic === 'string') setTopic(resolved.topic);
      }
      if (result?.ok === false && mounted.current && owner === requestOwner.current) setLocalError(_ltsText(result.error?.message || result.error) || tr('generate_failed', 'The script could not be generated. Your lesson plan is still available.'));
    } catch (failure) {
      if (mounted.current && owner === requestOwner.current) setLocalError(_ltsText(failure?.message) || tr('generate_failed', 'The script could not be generated. Your lesson plan is still available.'));
    } finally { if (mounted.current && owner === requestOwner.current) { generatingRequest.current = false; setLocalBusy(false); refreshGenerationRecovery(revision => revision + 1); } }
  };
  const cancel = () => {
    requestOwner.current += 1;
    generatingRequest.current = false;
    setLocalBusy(false); setRegeneratingStep(null); setLocalError('');
    if (typeof onCancelTeachingScript === 'function') onCancelTeachingScript(plan.id);
    setNotice(regeneratingStep !== null ? tr('step_cancelled', 'Step regeneration cancelled. Your script is unchanged.') : tr('cancelled', 'Generation cancelled. Completed sections are kept so you can resume.'));
    if (regeneratingStep !== null) { regenerateFocus.current = regeneratingStep; return; }
    (expanded ? settingsToggle.current : panelToggle.current)?.focus();
  };
  const regenerateStep = async index => {
    if (generatingRequest.current || savingRequest.current || deletingRequest.current || !version || !canonicalVersion || !steps[index] || busy || saving || deleting || regenerationIssue(index) || staleDraft || !canGenerate || typeof onRegenerateTeachingStep !== 'function') return;
    const owner = ++requestOwner.current, baseline = draft ? draftBase : JSON.stringify(sourceSteps), versionId = String(version.id);
    const currentSteps = JSON.parse(JSON.stringify(steps)), target = currentSteps[index];
    const snapshot = JSON.parse(JSON.stringify(draftSnapshot || version));
    generatingRequest.current = true; setLocalBusy(true); setRegeneratingStep(index);
    setConfirmDiscard(false); setDeleteCandidate(null); setLocalError(''); setNotice('');
    try {
      const result = await onRegenerateTeachingStep(plan.id, version.id, target.id, {
        steps: currentSteps.map(step => ({ ...step, minutes: Number(step.minutes) })),
        instruction: regenerateInstruction.trim().slice(0, 2000), expectedSteps: JSON.parse(baseline)
      });
      if (!mounted.current || owner !== requestOwner.current) return;
      if (latestVersion.current.id !== versionId || latestVersion.current.baseline !== baseline) throw new Error(tr('step_stale', 'This saved version changed while the step was being generated. Your existing edits are still here.'));
      if (result?.ok !== true) throw new Error(_ltsText(result?.error?.message || result?.error) || tr('step_failed', 'This step could not be regenerated. Your existing wording is still here.'));
      const replacement = result.step;
      if (!_ltsSessionSteps([replacement]) || replacement.id !== target.id || replacement.phase !== (target.phase || '') || Number(replacement.minutes) !== Number(target.minutes)
        || replacement.title.trim().length < 2 || replacement.title.trim().length > 240
        || _LTS_TEXT_FIELDS.some(key => replacement[key].trim().length < (key === 'teacherSays' ? 60 : 12) || replacement[key].length > 16000)) {
        throw new Error(tr('step_invalid', 'The replacement step was incomplete. Your existing wording is still here.'));
      }
      setDraft(currentSteps.map((step, offset) => offset === index ? { ...replacement, minutes: Number(target.minutes) } : step));
      setStepUndo(previous => previous.filter(entry => entry.stepId !== target.id).concat({ stepId: target.id, previous: target }));
      setDraftSnapshot(snapshot); setDraftBase(baseline); setDraftVersionId(versionId);
      setRegenerateIndex(null); setRegenerateInstruction(''); setShowRecoveryNotice(false); regenerateFocus.current = index;
      setNotice(tr('step_ready', 'Replacement step added to your unsaved draft. Review it, then save or discard your edits.'));
    } catch (failure) {
      if (mounted.current && owner === requestOwner.current) setLocalError(_ltsText(failure?.message) || tr('step_failed', 'This step could not be regenerated. Your existing wording is still here.'));
    } finally {
      if (mounted.current && owner === requestOwner.current) { generatingRequest.current = false; setLocalBusy(false); setRegeneratingStep(null); }
    }
  };
  // quiet === true: opened by the lesson plan's Edit toggle, so focus stays on that button.
  const edit = quiet => {
    if (!version || busy || saving || deleting) return;
    setConfirmDiscard(false); setDeleteCandidate(null); focusNewDraft.current = quiet !== true;
    setDraft(JSON.parse(JSON.stringify(sourceSteps)));
    setStepUndo([]);
    setDraftSnapshot(JSON.parse(JSON.stringify(version)));
    setDraftBase(JSON.stringify(sourceSteps)); setDraftVersionId(String(version.id)); setShowRecoveryNotice(false); setLocalError(''); setNotice('');
  };
  const updateStep = (index, key, value) => {
    if (generatingRequest.current || savingRequest.current) return;
    setConfirmDiscard(false);
    // Editing this step accepts its last change, so Undo never erases newer teacher wording.
    setStepUndo(previous => previous.filter(entry => entry.stepId !== steps[index]?.id));
    setDraft(previous => previous.map((step, offset) => offset === index ? { ...step, [key]: value } : step));
  };
  const restoreSavedStep = index => {
    if (generatingRequest.current || savingRequest.current || deletingRequest.current || busy || saving || deleting || staleDraft || !draft || !canonicalVersion || !stepChanged(index)) return;
    const target = steps[index], saved = sourceSteps[index];
    if (!_ltsSessionSteps([target]) || !_ltsSessionSteps([saved]) || (target.phase || '') !== (saved.phase || '')) return;
    setDraft(previous => previous.map((step, offset) => offset === index ? JSON.parse(JSON.stringify(saved)) : step));
    setStepUndo(previous => previous.filter(entry => entry.stepId !== target.id).concat({ stepId: target.id, kind: 'restore', previous: JSON.parse(JSON.stringify(target)) }));
    setRegenerateIndex(null); setRegenerateInstruction(''); setConfirmDiscard(false); setLocalError('');
    regenerateFocus.current = index;
    setNotice(tr('step_restored', 'Restored this step to its saved wording and minutes in your draft. Your other edits are still here. Review the timing before saving.'));
  };
  const undoStepChange = index => {
    if (generatingRequest.current || savingRequest.current || deletingRequest.current || busy || saving || deleting || staleDraft || !draft || !canonicalVersion) return;
    const target = steps[index], entry = stepUndo.find(item => item.stepId === target?.id);
    if (!entry || !_ltsSessionStepUndo([entry], steps)) return;
    setDraft(previous => previous.map((step, offset) => offset === index ? JSON.parse(JSON.stringify(entry.previous)) : step));
    setStepUndo(previous => previous.filter(item => item.stepId !== target.id));
    setRegenerateIndex(null); setRegenerateInstruction(''); setConfirmDiscard(false); setLocalError('');
    regenerateFocus.current = index;
    setNotice(entry.kind === 'restore' ? tr('step_restore_undone', 'Undid the step restore. Your previous wording and minutes are back, and your other edits are still here.') : tr('step_undone', 'Restored this step to its wording before the replacement. Your other edits are still here.'));
  };
  const discardEdits = quiet => {
    if (saving || busy || generatingRequest.current) return;
    setRegenerateIndex(null); setRegenerateInstruction('');
    setStepUndo([]);
    setConfirmDiscard(false); restoreEditFocus.current = quiet !== true;
    setDraft(null); setDraftSnapshot(null); setDraftBase(''); setDraftVersionId(''); setShowRecoveryNotice(false); setLocalError('');
  };
  const keepEditing = () => { setConfirmDiscard(false); setTimeout(() => discardToggle.current?.focus(), 0); };
  // Resolves true once the edits are in the plan; quiet keeps focus on the plan's Done button.
  const saveEdits = async quiet => {
    if (generatingRequest.current || busy || savingRequest.current || !draft || !version || saving || staleDraft || invalidTiming || invalidDraftText || invalidDraftLength || typeof onUpdateTeachingScript !== 'function') return false;
    const owner = ++requestOwner.current;
    savingRequest.current = true;
    setConfirmDiscard(false);
    setSaving(true); setLocalError(''); setNotice('');
    const submittedDraft = { version: draftSnapshot, baseline: draftBase, steps: draft };
    try {
      const result = await onUpdateTeachingScript(plan.id, version.id, draft.map(step => ({ ...step, minutes: Number(step.minutes) })), JSON.parse(draftBase));
      if (result?.ok === true) {
        const clearStatus = _ltsClearSubmittedDraft(recoveryKey, draftScope, planId, submittedDraft);
        if (mounted.current && clearStatus) setRecoveryStatus(clearStatus);
      }
      if (!mounted.current || owner !== requestOwner.current) return result?.ok === true;
      if (result?.ok !== true) {
        setLocalError(_ltsText(result?.error?.message || result?.error) || (result === false || result?.ok === false
          ? tr('save_failed', 'Edits could not be added to the plan. Your draft is still here.')
          : tr('save_unconfirmed', 'Saving could not be confirmed. Your draft is still here. Try saving again.')));
        return false;
      }
      restoreEditFocus.current = quiet !== true;
      setStepUndo([]);
      setDraft(null); setDraftSnapshot(null); setDraftBase(''); setDraftVersionId(''); setShowRecoveryNotice(false);
      setNotice(tr('edits_added', 'Script edits added to this plan.'));
      return true;
    } catch (failure) {
      if (mounted.current && owner === requestOwner.current) setLocalError(_ltsText(failure?.message) || tr('save_failed', 'Edits could not be added to the plan. Your draft is still here.'));
      return false;
    } finally { if (mounted.current && owner === requestOwner.current) { savingRequest.current = false; setSaving(false); } }
  };
  // Inside a lesson plan, the plan's Edit/Done toggle drives the script: Edit opens a draft
  // (no focus jump), Done saves a changed draft or drops an unchanged one.
  const planBridged = typeof props.planEditing === 'boolean';
  React.useEffect(() => {
    if (!planBridged) return;
    if (props.planEditing) {
      if (!draft && version && !busy && !saving && !deleting && typeof onUpdateTeachingScript === 'function') { setExpanded(true); edit(true); }
    } else if (draft && !draftChanged && !saving) discardEdits(true);
  }, [planBridged, props.planEditing, version?.id, busy]);
  React.useEffect(() => {
    const bridge = props.planEditBridge;
    if (!planBridged || !bridge) return undefined;
    const finish = async () => {
      if (!draft) return true;
      if (!draftChanged && !staleDraft) { discardEdits(true); return true; }
      if (!(staleDraft || invalidTiming || invalidDraftText || invalidDraftLength)) return saveEdits(true);
      setExpanded(true);
      setNotice(tr('finish_blocked', 'Your teaching script edits need attention before you finish editing.'));
      setTimeout(() => { editActions.current?.scrollIntoView?.({ block: 'start' }); editActions.current?.focus(); }, 0);
      return false;
    };
    bridge.current = finish;
    return () => { if (bridge.current === finish) bridge.current = null; };
  });
  const exportText = async kind => {
    const runtime = window.AlloModules?.LessonTeachingScript;
    if (!version || (!draft && typeof runtime?.toPlainText !== 'function')) { setLocalError(tr('export_unavailable', 'Text export is still loading. Please try again.')); return; }
    const exportVersion = draft ? { ...version, steps: draft } : version;
    try {
      const text = draft ? draftText() : runtime.toPlainText(exportVersion);
      if (typeof text !== 'string' || !text.trim()) throw new Error(tr('export_incomplete', 'This script could not be exported because its saved data or draft is incomplete. Review the script fields and try again.'));
      if (kind === 'copy') {
        if (typeof navigator.clipboard?.writeText !== 'function') throw new Error(tr('copy_unavailable', 'Copy is unavailable here. Download the text instead.'));
        await navigator.clipboard.writeText(text);
        if (mounted.current) setNotice(tr('copied', 'Script text copied.'));
      } else if (kind === 'print') {
        const popup = window.open('', '_blank', 'width=850,height=800');
        if (!popup) throw new Error(tr('print_blocked', 'Allow the print window, then try again.'));
        const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        popup.opener = null;
        popup.document.write('<!doctype html><html lang="' + escape(document.documentElement.lang || 'en') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + escape(version.title) + '</title><style>*{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;color:#111;background:#fff;margin:0;padding:24px}main{max-width:50rem;margin:auto}h1{font-size:24px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}@page{margin:18mm}@media print{body{padding:0}main{max-width:none}}</style></head><body><main><h1>' + escape(tr('print_title', 'Full teaching script')) + '</h1><pre dir="auto">' + escape(text) + '</pre></main></body></html>');
        popup.document.close(); popup.focus(); popup.print();
        if (mounted.current) setNotice(tr('print_opened', 'The script print view is open.'));
      } else {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        const timer = setTimeout(() => { URL.revokeObjectURL(url); downloads.current.delete(url); }, 1000);
        downloads.current.set(url, timer);
        const link = document.createElement('a');
        link.href = url; link.download = (_ltsText(version.title) || 'teaching-script').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 100) + (draft ? '-draft' : '') + '.txt';
        document.body.appendChild(link);
        try { link.click(); } finally { link.remove(); }
        setNotice(tr('downloaded', 'Script text downloaded.'));
      }
      if (mounted.current) setLocalError('');
    } catch (failure) { if (mounted.current) setLocalError(_ltsText(failure?.message) || tr('export_failed', 'The script could not be exported. Please try again.')); }
  };
  const keepVersion = () => {
    if (deletingRequest.current) return;
    setDeleteCandidate(null);
    setTimeout(() => deleteToggle.current?.focus(), 0);
  };
  const deleteScript = async () => {
    if (deletingRequest.current || !deleteCandidate || deleting || draft || busy || saving || typeof props.onDeleteTeachingScript !== 'function') return;
    deletingRequest.current = true;
    setDeleting(true); setLocalError(''); setNotice('');
    try {
      const result = await props.onDeleteTeachingScript(plan.id, deleteCandidate.id, deleteCandidate);
      if (!mounted.current) return;
      if (result?.ok !== true) {
        setLocalError(_ltsText(result?.error?.message || result?.error) || (result === false || result?.ok === false
          ? tr('delete_failed', 'The version could not be deleted. Try again.')
          : tr('delete_unconfirmed', 'Deletion could not be confirmed. Review this version and try again.')));
        return;
      }
      restoreDeleteFocus.current = true;
      setDeleteCandidate(null); setNotice(tr('version_deleted', 'Script version and its saved audio deleted.'));
    } catch (error) { if (mounted.current) setLocalError(_ltsText(error?.message || error) || tr('delete_failed', 'The version could not be deleted. Try again.')); }
    finally { deletingRequest.current = false; if (mounted.current) setDeleting(false); }
  };
  const fieldClass = 'w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:bg-slate-100';
  const buttonClass = 'min-h-11 rounded-lg border border-indigo-600 px-3 py-2 text-sm font-bold text-indigo-900 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50';
  const stepFields = [
    ['teacherSays', tr('teacher_says', 'Teacher says')],
    ['studentDoes', tr('student_does', 'Learners do')],
    ['checkQuestion', tr('check_question', 'Check for understanding')],
    ['possibleResponse', tr('possible_response', 'Possible learner response')],
    ['ifStruggling', tr('if_struggling', 'If learners need support (likely misconception)')],
    ['ifReady', tr('if_ready', 'If learners are ready to go further')]
  ];
  const fieldIssue = (step, key) => {
    if (key === 'minutes') return Number.isInteger(Number(step.minutes)) && Number(step.minutes) >= 1 && Number(step.minutes) <= versionRules.maxStepMinutes ? '' : tr('field_minutes', 'Use whole minutes from 1 to {max}.').replace('{max}', String(versionRules.maxStepMinutes));
    const length = _ltsText(step[key]).trim().length;
    const min = key === 'title' ? 2 : key === 'teacherSays' ? 60 : 12, max = key === 'title' ? 240 : 16000;
    return length < min || length > max ? tr('field_length', 'Use {min}–{max} characters; currently {count}.').replace('{min}', String(min)).replace('{max}', String(max)).replace('{count}', String(length)) : '';
  };
  const editFieldProps = (step, index, key) => ({ id: id + '-edit-' + index + '-' + key, 'aria-invalid': !!fieldIssue(step, key), 'aria-describedby': fieldIssue(step, key) ? id + '-edit-' + index + '-' + key + '-error' : undefined });
  const editFieldError = (step, index, key) => fieldIssue(step, key) ? <span id={id + '-edit-' + index + '-' + key + '-error'} className="mt-1 block text-sm font-normal text-red-900">{fieldIssue(step, key)}</span> : null;
  const focusEditIssue = () => {
    const list = document.getElementById(id + '-steps');
    (list?.querySelector('[aria-invalid="true"]') || document.getElementById(id + '-edit-0-minutes'))?.focus();
  };
  const jumpToStep = value => {
    if (value === '') return;
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) return;
    const target = document.getElementById(id + '-script-step-' + index);
    target?.scrollIntoView?.({ block: 'start' });
    target?.querySelector('[data-script-step-heading], input')?.focus();
  };
  const materialName = resourceId => {
    const recorded = version?.inputSnapshot?.materialTitles?.find?.(item => String(item?.id) === String(resourceId));
    const current = materials.filter(item => String(item.id) === String(resourceId));
    return _ltsText(recorded?.title) || (current.length === 1 ? _ltsText(current[0].title || current[0].data?.title) : '') || String(resourceId);
  };
  const draftText = () => {
    const snapshot = draftSnapshot || version;
    const settings = snapshot?.inputSnapshot?.settings || {};
    const lines = [tr('draft_export_label', 'UNSAVED DRAFT — not validated'), tr('draft_export_hint', 'This text includes unfinished edits. It does not update the saved script.'), _ltsText(snapshot?.title), scopeLabel(snapshot) + ' · ' + _ltsText(snapshot?.durationMinutes) + ' ' + tr('minutes', 'minutes')];
    [['goal', tr('goal', 'Learning goal')], ['priorKnowledge', tr('prior', 'Relevant prior learning')], ['standard', tr('standard', 'Standard or target')], ['language', tr('language', 'Script language:').replace(/[:：]\s*$/, '')]].forEach(([key, label]) => { if (_ltsText(settings[key])) lines.push(label + ': ' + _ltsText(settings[key])); });
    (draft || []).forEach((step, index) => {
      lines.push('', (index + 1) + '. ' + _ltsText(step.title) + (step.phase ? ' · ' + (phaseLabel(step.phase) || _ltsText(step.phase)) : ''), tr('step_minutes', 'Minutes') + ': ' + _ltsText(step.minutes));
      stepFields.forEach(([key, label]) => lines.push(label + ': ' + _ltsText(step[key])));
      if (Array.isArray(step.resourceIds) && step.resourceIds.length) lines.push(tr('step_materials', 'Lesson resources:') + ' ' + step.resourceIds.map(resourceId => { const recorded = snapshot?.inputSnapshot?.materialTitles?.find?.(item => String(item?.id) === String(resourceId)); return _ltsText(recorded?.title) || String(resourceId); }).join('; '));
      if (Array.isArray(step.recommendationIds) && step.recommendationIds.length) lines.push(tr('draft_recommendations', 'Teaching guidance IDs:') + ' ' + step.recommendationIds.map(String).join('; '));
    });
    lines.push('', tr('sources', 'Teaching sources and evidence'));
    (Array.isArray(snapshot?.sources) ? snapshot.sources : []).forEach(source => { if (!source || typeof source !== 'object') return; lines.push([_ltsText(source.id), _ltsText(source.title), _ltsSafeUrl(source.url), _ltsText(source.author), _ltsText(source.scope)].filter(Boolean).join(' · ')); (Array.isArray(source.recommendations) ? source.recommendations : []).forEach(rec => { if (rec && typeof rec === 'object') lines.push([_ltsText(rec.id), _ltsText(rec.text), _ltsLocator(rec.locator)].filter(Boolean).join(' · ')); }); });
    (Array.isArray(snapshot?.warnings) ? snapshot.warnings : []).forEach(warning => lines.push(_ltsText(warning)));
    return lines.join('\n');
  };
  const researchLabels = {
    off: tr('research_off', 'Research turned off'), disabled: tr('research_off', 'Research turned off'),
    unavailable: tr('research_unavailable_status', 'Live research unavailable'),
    curated: tr('research_curated', 'Curated teaching guidance'),
    fresh: tr('research_fresh', 'Research sources retrieved'),
    completed: tr('research_fresh', 'Research sources retrieved'),
    researched: tr('research_fresh', 'Research sources retrieved'),
    retrieved: tr('research_fresh', 'Research sources retrieved')
  };
  const phaseLabel = phase => phase && _LTS_PHASES[phase] ? tr('phase_' + phase, _LTS_PHASES[phase]) : '';
  const detectedNote = [
    defaultSettings.subjectDetected ? tr('context_subject_detected', 'Subject detected from the saved plan') : tr('context_subject_ai', 'Subject could not be detected yet; AI will identify it when you generate'),
    defaultSettings.gradeSource === 'plan' ? tr('context_grade_plan', 'Grade from the saved plan') : tr('context_grade_missing', 'The saved plan has no grade; choose one below'),
    Array.isArray(defaultSettings.phases) && defaultSettings.phases.length ? tr('context_phases', 'Plan phases:') + ' ' + defaultSettings.phases.map(phaseLabel).filter(Boolean).join(', ') : ''
  ].filter(Boolean);
  const progressLabel = ({
    context: tr('progress_context', 'Identifying the lesson subject and topic…'),
    research: tr('progress_research', 'Finding research for this lesson…'),
    generating: tr('progress_generating', 'Writing the teaching script…'),
    validating: tr('progress_validating', 'Checking and improving the script…'),
    ready: tr('progress_saving', 'Adding the completed script to this lesson…'),
    regeneratingStep: tr('progress_step', 'Writing the replacement step…'),
    chunking: tr('progress_chunking', 'Writing the script in smaller sections…') + (Number.isInteger(hostRun.totalChunks) && hostRun.totalChunks > 0 ? ' ' + Math.min(hostRun.totalChunks, Math.max(0, Number(hostRun.completedChunks) || 0)) + '/' + hostRun.totalChunks : ''),
  })[regeneratingStep !== null ? 'regeneratingStep' : hostRun.stage] || _ltsText(hostRun.stage) || tr('generating', 'Preparing the teaching script…');
  if (spokenOnly && version) return <LessonSpokenDirections key={JSON.stringify([version.id, runtime?.spokenSegments?.({ ...version, steps }), !!draft, props.audioProfile, version.inputSnapshot?.settings?.language, plan.config?.language])} initialStepIndex={spokenPosition?.versionId === String(version.id) ? spokenPosition.index : 0} onStepChange={index => setSpokenPosition({ versionId: String(version.id), index })} planId={planId} version={{ ...version, steps }} draft={!!draft} createAudio={props.createTeachingScriptAudio} t={props.t} audioVoice={props.audioVoice} audioSpeed={props.audioSpeed} audioLanguage={version.inputSnapshot?.settings?.language || plan.config?.language || defaultSettings.language} onOpenVoiceSettings={props.onOpenVoiceSettings} onBack={() => { setSpokenOnly(false); setTimeout(() => spokenToggle.current?.focus(), 0); }} />;
  return (
    <section className="rounded-xl border border-indigo-200 bg-white shadow-sm" aria-labelledby={id + '-title'} data-teaching-script-plan={planId}>
      <div className="p-4 sm:p-5">
        <h3 id={id + '-title'} className="text-lg font-black text-indigo-950">
          <button ref={panelToggle} type="button" className="flex min-h-11 w-full items-center justify-between gap-3 text-left focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg" aria-expanded={expanded} aria-controls={id + '-panel'} onClick={() => setExpanded(!expanded)}>
            <span>{tr('title', 'Teaching script')}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span>
          </button>
        </h3>
        <p className="text-sm text-slate-700">{tr('tagline', 'Word-for-word teacher wording for this lesson · any subject and grade · a teaching segment or the whole lesson')}</p>
        {showRecoveryNotice && <p role="status" className="mt-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-950">{draft ? tr('recovered_draft', 'Recovered unsaved script edits and settings from this tab. Save edits to add them to the lesson plan.') : tr('recovered_settings', 'Recovered your script settings from this tab.')}</p>}
        {memoryOnlyGeneration && <p role="status" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{tr('generation_recovery_unavailable', 'This app could not keep a recovery copy of the latest generated work. Keep it open and resume or finish saving before reloading, closing, or switching workspaces.')}</p>}
        {(recoveryStatus === 'invalid' || hasSessionWork && ['unavailable', 'large'].includes(recoveryStatus)) && <p role="status" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{recoveryStatus === 'invalid' ? tr('recovery_invalid', 'A recovery copy could not be restored. Your saved lesson and script versions are still available.') : tr('recovery_unavailable', 'This tab could not keep a recovery copy of the latest changes. Save script edits before leaving this lesson; your current edits are still on this page.')}</p>}
        {hasIncompleteVersions && <p role="status" className="mt-2 text-sm text-amber-950">{tr('incomplete_saved', 'A saved script has incomplete data and could not be displayed. Your lesson plan and other script versions are still available.')}</p>}
        {version && <p className="mt-2 break-words text-sm font-semibold text-indigo-900">{tr('saved_script', 'Saved script:')} {_ltsText(version.title) || tr('title', 'Teaching script')} · {version.durationMinutes} {tr('minutes', 'minutes')}</p>}
        {busy && !expanded && <p role="status" className="mt-2 text-sm text-indigo-900">{progressLabel}</p>}
        {busy && !expanded && typeof onCancelTeachingScript === 'function' && <button type="button" className={buttonClass + ' mt-2 no-print'} onClick={cancel}>{tr('cancel', 'Cancel generation')}</button>}
        {error && !expanded && <p role="alert" className="mt-2 text-sm text-red-900">{error}</p>}
      </div>
      {expanded && <div id={id + '-panel'} className="space-y-5 border-t border-indigo-100 p-4 sm:p-5">
        {!version && <p className="text-sm text-slate-700">{tr('intro', 'Review the detected lesson context, then build a scripted teaching sequence from the resources you select. Each generated version is attached to this plan.')}</p>}
        <div className="no-print">
          <button ref={settingsToggle} type="button" className={buttonClass + ' flex w-full items-center justify-between gap-3 text-left'} aria-expanded={settingsExpanded} aria-controls={id + '-settings'} onClick={() => setSettingsExpanded(previous => !previous)}>
            <span>{version ? tr('create_another', 'Create another script') : tr('generation_settings', 'Script settings')}</span><span aria-hidden="true">{settingsExpanded ? '−' : '+'}</span>
          </button>
          <div id={id + '-settings'} hidden={!settingsExpanded} className="mt-4">
        <form onSubmit={generate} className="space-y-4">
          {defaultsChanged && <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
            <p role="status">{tr('defaults_updated', 'The saved lesson changed. Unedited script settings were refreshed; your custom settings were kept.')}</p>
            <button type="button" className={buttonClass + ' mt-2'} disabled={busy || saving} onClick={useCurrentDefaults}>{tr('use_current_defaults', 'Use current lesson defaults')}</button>
          </div>}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-indigo-950" data-teaching-context>
            <p className="font-bold">{tr('context_title', 'Detected lesson context')}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">{detectedNote.map((line, index) => <li key={index}>{line}</li>)}</ul>
            <p className="mt-2">{tr('context_ai_hint', 'AI determines the subject and topic from this lesson when you generate. Edit either field below to keep your own choice.')}</p>
            {(!inferContext.subject || !inferContext.topic) && <button type="button" className={buttonClass + ' mt-2'} disabled={busy || saving} onClick={() => { setInferContext({ subject: true, topic: true }); setSubject(detectedDefaults.subject); setTopic(detectedDefaults.topic); }}>{tr('context_use_ai', 'Use AI for subject and topic')}</button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={id + '-subject'} className="mb-1 block text-sm font-bold text-slate-900">{tr('subject', 'Subject area')}</label>
              <select id={id + '-subject'} required className={fieldClass} value={subject} disabled={busy || saving} onChange={event => { setSubject(event.target.value); setInferContext(previous => ({ ...previous, subject: false })); }}>
                {subjectOptions.map(([value, label]) => <option key={value} value={value}>{tr('subject_' + value.replace(/-/g, '_'), label)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={id + '-topic'} className="mb-1 block text-sm font-bold text-slate-900">{tr('topic', 'Lesson topic')}</label>
              <input id={id + '-topic'} maxLength={200} className={fieldClass} value={topic} disabled={busy || saving} required={subject === 'other' && !inferContext.topic} onChange={event => { setTopic(event.target.value); setInferContext(previous => ({ ...previous, topic: false })); }} placeholder={tr('topic_hint', 'For example: blending CVC words, photosynthesis, causes of the French Revolution')} />
            </div>
          </div>
          <div>
            <label htmlFor={id + '-goal'} className="mb-1 block text-sm font-bold text-slate-900">{tr('goal', 'Learning goal')}</label>
            <textarea id={id + '-goal'} required maxLength={1200} rows={2} className={fieldClass} value={goal} disabled={busy || saving} onChange={event => setGoal(event.target.value)} />
          </div>
          <fieldset className="space-y-2" disabled={busy || saving}>
            <legend className="mb-1 text-sm font-bold text-slate-900">{tr('scope', 'What to script')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[['segment', tr('scope_segment', 'Direct-instruction segment'), tr('scope_segment_hint', 'One modelling or explanation segment inside this lesson.')], ['lesson', tr('scope_lesson', 'Whole lesson'), tr('scope_lesson_hint', 'Every phase of the saved plan, from hook to closure.')]].map(([value, label, hint]) => <label key={value} className={'flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-2 ' + (scope === value ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300')}>
                <input type="radio" name={id + '-scope'} className="mt-1 h-4 w-4" value={value} checked={scope === value} onChange={() => chooseScope(value)} />
                <span className="text-sm text-slate-900"><span className="font-bold">{label}</span><br /><span className="text-xs text-slate-700">{hint}</span></span>
              </label>)}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={id + '-grade'} className="mb-1 block text-sm font-bold text-slate-900">{tr('grade', 'Grade or age group')}</label>
              <select id={id + '-grade'} required className={fieldClass} value={grade} disabled={busy || saving} onChange={event => setGrade(event.target.value)}>
                <option value="">{tr('choose_grade', 'Choose grade or age group')}</option>
                {(gradeOptions.includes(grade) || !grade ? gradeOptions : gradeOptions.concat(grade)).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={id + '-duration'} className="mb-1 block text-sm font-bold text-slate-900">{tr('duration', 'Teaching time')} ({tr('minutes', 'minutes')})</label>
              <input id={id + '-duration'} type="number" inputMode="numeric" min={rules.minMinutes} max={rules.maxMinutes} step={1} required className={fieldClass} value={durationMinutes} disabled={busy || saving} onChange={event => setDurationMinutes(event.target.value === '' ? '' : Number(event.target.value))} />
              <p className="mt-1 text-xs text-slate-600">{tr('duration_hint', 'Whole minutes between')} {rules.minMinutes} {tr('and', 'and')} {rules.maxMinutes}.</p>
            </div>
          </div>
          <div>
            <label htmlFor={id + '-prior'} className="mb-1 block text-sm font-bold text-slate-900">{tr('prior', 'Relevant prior learning')}</label>
            <textarea id={id + '-prior'} maxLength={2000} rows={2} className={fieldClass} value={priorKnowledge} disabled={busy || saving} onChange={event => setPriorKnowledge(event.target.value)} placeholder={tr('prior_hint', 'For example: learners can already name the parts, but confuse the two key terms.')} />
          </div>
          <div>
            <label htmlFor={id + '-standard'} className="mb-1 block text-sm font-bold text-slate-900">{tr('standard', 'Target standard (optional)')}</label>
            <input id={id + '-standard'} maxLength={1000} className={fieldClass} value={standard} disabled={busy || saving} onChange={event => setStandard(event.target.value)} />
            <p className="mt-1 text-xs text-slate-600">{tr('standard_hint', 'Your standard provides context for the script. Retrieved research is matched to the subject and grade, not verified against this standard.')}</p>
          </div>
          <p className="text-sm text-slate-700">{tr('language', 'Script language:')} {_ltsText(defaultSettings.language) || 'English'}</p>
          <fieldset className="space-y-2 rounded-lg border border-slate-300 p-3" disabled={busy || saving}>
            <legend className="px-1 text-sm font-bold text-slate-900">{tr('materials', 'Use lesson resources')}</legend>
            {materials.length ? materials.map((material, index) => <label key={String(material.id) + ':' + index} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-indigo-50">
              <input type="checkbox" className="mt-1 h-4 w-4" disabled={!materialAvailable(material)} checked={materialIds.includes(String(material.id))} onChange={() => toggleMaterial(String(material.id))} />
              <span className="text-sm text-slate-800">{_ltsText(material.title || material.data?.title) || tr('untitled_resource', 'Lesson resource') + ' ' + (index + 1)} <span className="text-xs text-slate-600">({_ltsText(material.type).replace(/-/g, ' ')})</span>{!materialAvailable(material) && <span className="block text-xs text-amber-950">{tr('material_unusable', 'This resource has no readable teaching content or its ID is duplicated.')}</span>}</span>
            </label>) : <p className="text-sm text-slate-600">{tr('no_materials', 'No matching resources are available for this lesson. Add a relevant lesson resource before creating a script.')}</p>}
          </fieldset>
          {unavailableMaterialIds.length > 0 && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p role="status">{tr('selected_material_unavailable', 'A selected resource was removed, changed lessons, or no longer has readable content. Review the available resources before generating.')}</p>
            <button type="button" className={buttonClass + ' mt-2'} disabled={busy || saving} onClick={() => setMaterialIds(selectedMaterials.map(item => String(item.id)))}>{tr('remove_unavailable', 'Remove unavailable selections')}</button>
          </div>}
          {inputWarnings.length > 0 && <ul className="list-disc rounded-lg bg-amber-50 py-3 pl-7 pr-3 text-sm text-amber-950" aria-label={tr('input_limits', 'Content supplied to the script')} >{inputWarnings.map((warning, index) => <li key={index}>{_ltsText(warning)}</li>)}</ul>}
          {!selectedMaterials.length && materials.length > 0 && <p className="text-sm text-amber-950">{tr('choose_material', 'Choose at least one lesson resource for the script.')}</p>}
          <div>
            <label className="flex min-h-11 items-center gap-3 text-sm font-bold text-slate-900">
              <input type="checkbox" className="h-4 w-4" checked={researchEnabled} disabled={busy || saving} onChange={event => setResearchEnabled(event.target.checked)} />
              {tr('research', 'Use research to inform teaching choices')}
            </label>
            <p className="text-xs text-slate-600">{tr('research_hint', 'Public practice guides are matched to the subject, topic and grade above and read in full; if none can be verified, generation stops so you can decide.')}</p>
            {!researchEnabled && <p className="mt-1 text-sm text-slate-700">{tr('resources_only', 'The script will use your saved lesson and selected resources without retrieved research.')}</p>}
            {researchEnabled && !canResearch && !canReuseResearch && <p className="text-sm text-slate-700">{tr('research_unavailable', 'Live research is unavailable here. Turn off research to generate from the lesson, or try again when research is available.')}</p>}
            {researchEnabled && !canResearch && canReuseResearch && !canFinishSaving && <p className="text-sm text-slate-700">{tr('research_reused', 'Resume will reuse this run’s saved research. Starting over with research requires live research access.')}</p>}
          </div>
          {!canGenerate && !canFinishSaving && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{tr('ai_unavailable', 'Script generation needs an available AI connection. Saved versions remain available to read, edit and export.')}</p>}
          {!!draft && <p className="text-sm text-indigo-900">{tr('finish_edits', 'Save or discard your script edits before generating another version.')}</p>}
          <p className="text-xs text-slate-600">{tr('history_retention', 'Script versions are kept until you delete them. Deleting a version also removes its saved audio.')}</p>
          {generationRecovery && <p role="status" className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-950">{generationRecovery.completedChunks === generationRecovery.totalChunks ? tr('resume_save_progress', 'All sections are ready. Finish saving to add the completed script to this lesson.') : generationRecovery.completedChunks === 0 ? tr('resume_setup_progress', 'Your lesson setup is ready. Resume to write the script.') : tr('resume_progress', '{completed} of {total} sections are ready. Resume to finish the remaining sections.').replace('{completed}', String(generationRecovery.completedChunks)).replace('{total}', String(generationRecovery.totalChunks))}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={buttonClass + ' bg-indigo-50'} disabled={!canContinueGeneration || busy || saving || deleting || !!draft || !formReady}>{generationRecovery ? generationRecovery.completedChunks === generationRecovery.totalChunks ? tr('finish_saving', 'Finish saving') : tr('resume', 'Resume script') : error ? tr('retry', 'Try generating again') : tr('generate', 'Generate script')}</button>
            {generationRecovery && typeof onDiscardTeachingScriptRecovery === 'function' && <button type="button" className={buttonClass} disabled={!canGenerate || (researchEnabled && !canResearch) || busy || saving || deleting || !!draft || !formReady} onClick={event => generate(event, true)}>{tr('start_over', 'Start over')}</button>}
          </div>
        </form>
          </div>
        </div>
        <div role="status" aria-live="polite" className="text-sm font-bold text-indigo-950">{busy ? progressLabel : notice}</div>
        {busy && typeof onCancelTeachingScript === 'function' && <button type="button" className={buttonClass + ' no-print'} onClick={cancel}>{tr('cancel', 'Cancel generation')}</button>}
        {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        {version && <div className="space-y-5 border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-end gap-3 no-print">
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <label htmlFor={id + '-version'} className="mb-1 block text-sm font-bold text-slate-900">{tr('version', 'Script version')}</label>
              <select ref={versionSelect} id={id + '-version'} className={fieldClass} value={String(version.id)} disabled={!!draft || saving || busy || deleting} onChange={event => { setDeleteCandidate(null); setSelectedId(event.target.value); setRegenerateIndex(null); setRegenerateInstruction(''); setNotice(''); setLocalError(''); }}>
                {!canonicalVersion && draftSnapshot && <option value={String(draftSnapshot.id)}>{tr('recovered_version', 'Recovered draft version')}</option>}
                {versions.map((item, index) => <option key={item.id} value={String(item.id)}>{[tr('version_number', 'Version') + ' ' + (index + 1), _ltsText(item.title) || tr('title', 'Teaching script'), scopeLabel(item), Number(item.durationMinutes) > 0 ? item.durationMinutes + ' ' + tr('minutes', 'minutes') : ''].filter(Boolean).join(' · ')}</option>)}
              </select>
            </div>
            {!draft && typeof onUpdateTeachingScript === 'function' && (!planBridged || props.planEditing) && <button ref={editToggle} type="button" className={buttonClass} disabled={busy || saving || deleting} onClick={edit}>{tr('edit', 'Edit script')}</button>}
            {!draft && typeof onUpdateTeachingScript === 'function' && planBridged && !props.planEditing && <p className="w-full text-sm text-slate-700" data-script-edit-with-plan>{tr('edit_with_plan', 'To change this script, press Edit at the top of the lesson plan.')}</p>}
            <button ref={spokenToggle} type="button" className={buttonClass} disabled={saving || busy || deleting} onClick={() => setSpokenOnly(true)}>{tr('spoken_view', 'Spoken directions')}</button>
            <button type="button" className={buttonClass} disabled={saving || busy} onClick={() => exportText('copy')}>{tr('copy', 'Copy text')}</button>
            <button type="button" className={buttonClass} disabled={saving || busy} onClick={() => exportText('download')}>{tr('download', 'Download text')}</button>
            <button type="button" className={buttonClass} disabled={saving || busy} onClick={() => exportText('print')}>{tr('print_script', 'Print script')}</button>
          </div>
          <p className="text-sm text-slate-700">{tr('history_retention', 'Script versions are kept until you delete them. Deleting a version also removes its saved audio.')}</p>
          {!draft && typeof props.onDeleteTeachingScript === 'function' && <div className="no-print space-y-2">
            {deleteCandidate ? <div role="group" aria-label={tr('delete_confirm', 'Delete this script version and its saved audio?')} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); keepVersion(); } }}>
              <p>{tr('delete_confirm', 'Delete this script version and its saved audio?')} {_ltsText(deleteCandidate.title)}</p>
              <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={deleting || busy} onClick={deleteScript}>{tr('confirm_delete', 'Delete version and audio')}</button><button autoFocus type="button" className={buttonClass} disabled={deleting} onClick={keepVersion}>{tr('keep_version', 'Keep version')}</button></div>
            </div> : <button ref={deleteToggle} type="button" className={buttonClass} disabled={saving || busy || deleting} onClick={() => { setLocalError(''); setNotice(''); setDeleteCandidate(JSON.parse(JSON.stringify(version))); }}>{tr('delete_version', 'Delete this version')}</button>}
          </div>}
          <div>
            <h4 className="text-lg font-black text-slate-900">{_ltsText(version.title) || tr('title', 'Teaching script')}</h4>
            <p className="text-sm text-slate-700">{scopeLabel(version)} · {version.durationMinutes} {tr('minutes', 'minutes')}{version.inputSnapshot?.settings?.grade ? ' · ' + _ltsGradeLabel(version.inputSnapshot.settings.grade) : ''}{version.inputSnapshot?.settings?.subject ? ' · ' + subjectLabel(version.inputSnapshot.settings.subject) : ''} · {researchLabels[version.researchStatus] || _ltsText(version.researchStatus).replace(/[-_]/g, ' ') || tr('research_unspecified', 'Research status not recorded')}</p>
            {version.editedAt && <p className="text-xs text-slate-600">{tr('last_edited', 'Last edited:')} <time dateTime={_ltsText(version.editedAt)}>{_ltsText(version.editedAt).replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}</time></p>}
            {version.createdAt && <p className="text-xs text-slate-600"><time dateTime={_ltsText(version.createdAt)}>{_ltsText(version.createdAt).replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}</time></p>}
          </div>
          {materialStatus && (materialStatus.changed.length > 0 || materialStatus.missing.length > 0 || materialStatus.ambiguous.length > 0) && <div role="status" className="space-y-2 break-words rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" data-script-material-warning>
            <p>{tr('materials_changed', 'Materials used for this script have changed, are missing, or have duplicate IDs. Review the current resources and script before teaching, or create a new version.')}</p>
            <ul className="list-disc space-y-1 pl-5">{[['changed', tr('source_changed', 'Content changed')], ['missing', tr('source_missing', 'Not available')], ['ambiguous', tr('source_ambiguous', 'Duplicate resource ID')]].flatMap(([kind, label]) => materialStatus[kind].map(resourceId => <li key={kind + ':' + resourceId}>{label}: {materialName(resourceId)}</li>))}</ul>
          </div>}
          {materialStatus?.untracked && <p className="text-sm text-slate-700">{tr('materials_untracked', 'This older script has no recorded content versions for some source materials. Review those resources before teaching.')}</p>}
          {planChangedSinceScript && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{tr('plan_changed', 'The saved lesson differs from the lesson content captured for this script. Review the script against the current plan, or create a new version.')}</p>}
          {Array.isArray(version.warnings) && version.warnings.length > 0 && <ul className="list-disc space-y-1 rounded-lg bg-amber-50 py-3 pl-7 pr-3 text-sm text-amber-950">{version.warnings.map((warning, index) => <li key={index}>{_ltsText(warning)}</li>)}</ul>}
          {draft && <div className="space-y-2 rounded-lg border border-indigo-300 bg-indigo-50 p-3 no-print">
            <p className="text-sm font-bold text-indigo-950">{tr('unsaved_edits', 'Unsaved script edits')}</p>
            {planBridged && props.planEditing && <p className="text-sm text-indigo-950">{tr('saved_on_done', 'Script changes are saved when you press Done at the top of the lesson plan.')}</p>}
            <p className="text-sm text-slate-700">{tr('draft_export_available', 'Copy, download or print your draft text at any point, even before all fields are complete. Exports are labeled as unsaved drafts.')}</p>
            <button type="button" className={buttonClass} onClick={() => { editActions.current?.scrollIntoView?.({ block: 'start' }); editActions.current?.focus(); }}>{tr('review_save', 'Go to save and discard controls')}</button>
            <p className="text-sm text-slate-800">{tr('edit_timing', 'Step total:')} {Number.isFinite(timings) ? timings : '—'} / {version.durationMinutes} {tr('minutes', 'minutes')}</p>
            <p role="status" aria-live="polite" className={'text-sm ' + (timingAdjustment ? 'text-red-900' : 'text-slate-700')}>{timingAdjustment || tr('edit_timing_hint', 'Redistribute minutes between steps while keeping the saved teaching time. Regenerating a step keeps its current minutes.')}</p>
            {(invalidTiming || invalidDraftText || invalidDraftLength) && <><p className="text-sm text-red-900">{tr('review_fields', 'Review the highlighted fields and step timing before saving.')}</p><button type="button" className={buttonClass} onClick={focusEditIssue}>{tr('first_issue', 'Go to first issue')}</button></>}
          </div>}
          {steps.length > 1 && <nav className="no-print" aria-label={tr('script_navigation', 'Script step navigation')}><label className="block text-sm font-bold text-slate-900">{tr('jump_script_step', 'Go to script step')}<select aria-label={tr('jump_script_step', 'Go to script step')} className={fieldClass + ' mt-1 min-h-11 min-w-0 max-w-full'} value="" onChange={event => jumpToStep(event.target.value)}><option value="">{tr('choose_step', 'Choose a step…')}</option>{steps.map((step, index) => <option key={step.id || index} value={index}>{index + 1}. {_ltsText(step.title)}</option>)}</select></label></nav>}
          <ol id={id + '-steps'} className="space-y-4">
            {steps.map((step, index) => <li key={step.id || index} className="min-w-0 space-y-3 break-words rounded-xl border border-slate-300 p-3 sm:p-4" data-teaching-step={step.id || index} id={id + '-script-step-' + index}>
              {draft ? <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <label className="block text-sm font-bold">{tr('step_title', 'Step title')} {index + 1}<input {...editFieldProps(step, index, "title")} aria-label={tr("step_title", "Step title") + " " + (index + 1)} className={fieldClass + ' mt-1'} value={step.title || ''} maxLength={240} disabled={saving || busy} onChange={event => updateStep(index, 'title', event.target.value)} />{editFieldError(step, index, 'title')}</label>
                <label className="block text-sm font-bold">{tr('step_minutes', 'Minutes')} {index + 1}<input {...editFieldProps(step, index, "minutes")} aria-label={tr("step_minutes", "Minutes") + " " + (index + 1)} className={fieldClass + ' mt-1'} type="number" min={1} max={versionRules.maxStepMinutes} step={1} value={step.minutes} disabled={saving || busy} onChange={event => updateStep(index, 'minutes', event.target.value)} />{editFieldError(step, index, 'minutes')}</label>
              </div> : <h5 data-script-step-heading tabIndex={-1} className="rounded font-black text-indigo-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">{index + 1}. {_ltsText(step.title)} <span className="font-normal">· {step.minutes} {tr('minutes', 'minutes')}{phaseLabel(step.phase) ? ' · ' + phaseLabel(step.phase) : ''}</span></h5>}
              {canGenerate && typeof onRegenerateTeachingStep === 'function' && typeof onUpdateTeachingScript === 'function' && <div className="space-y-2 no-print">
                {regenerateIndex === index ? <div role="group" aria-label={tr('regenerate_step', 'Regenerate step') + ' ' + (index + 1)} className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                  <label className="block text-sm font-bold">{tr('step_instruction', 'What should change? (optional)')} · {index + 1}<textarea autoFocus aria-label={tr('step_instruction', 'What should change? (optional)') + ' · ' + (index + 1)} rows={2} maxLength={2000} className={fieldClass + ' mt-1'} value={regenerateInstruction} disabled={busy || saving || deleting} onChange={event => setRegenerateInstruction(event.target.value)} /></label>
                  <p className="text-xs text-slate-700">{tr('step_regenerate_hint', 'Only this step will change. Review the replacement in your draft before saving.')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={buttonClass} aria-describedby={regenerationIssue(index) ? id + '-regenerate-issue-' + index : undefined} disabled={busy || saving || deleting || !!regenerationIssue(index) || staleDraft} onClick={() => regenerateStep(index)}>{tr('generate_replacement', 'Generate replacement')}</button>
                    <button type="button" className={buttonClass} disabled={busy || saving || deleting} onClick={() => { regenerateFocus.current = index; setRegenerateIndex(null); setRegenerateInstruction(''); }}>{tr('keep_step', 'Keep current step')}</button>
                  </div>
                </div> : <button id={id + '-regenerate-' + index} type="button" className={buttonClass} aria-label={tr('regenerate_step', 'Regenerate step') + ' ' + (index + 1)} aria-describedby={regenerationIssue(index) ? id + '-regenerate-issue-' + index : undefined} disabled={busy || saving || deleting || !!regenerationIssue(index) || staleDraft} onClick={() => { setRegenerateIndex(index); setRegenerateInstruction(''); setLocalError(''); setNotice(''); }}>{tr('regenerate_step', 'Regenerate step')}</button>}
                {regenerationIssue(index) && <p id={id + '-regenerate-issue-' + index} className="text-xs text-red-900">{regenerationIssue(index)}</p>}
              </div>}
              {draft && stepChanged(index) && <div className="space-y-1 no-print">
                <button type="button" className={buttonClass} aria-label={tr('restore_saved_step', 'Restore saved step') + ' ' + (index + 1)} disabled={busy || saving || deleting || staleDraft} onClick={() => restoreSavedStep(index)}>{tr('restore_saved_step', 'Restore saved step')}</button>
                <p className="text-xs text-slate-600">{tr('restore_saved_step_hint', 'Restore this step’s saved wording and minutes. Other steps stay as edited; check the total time before saving. You can undo this restore.')}</p>
              </div>}
              {draft && stepUndo.filter(entry => entry.stepId === step.id).map(entry => <div key={entry.stepId} className="space-y-1 no-print">
                <button type="button" className={buttonClass} aria-label={(entry.kind === 'restore' ? tr('undo_step_restore', 'Undo step restore') : tr('undo_step_replacement', 'Undo step replacement')) + ' ' + (index + 1)} disabled={busy || saving || deleting || staleDraft} onClick={() => undoStepChange(index)}>{entry.kind === 'restore' ? tr('undo_step_restore', 'Undo step restore') : tr('undo_step_replacement', 'Undo step replacement')}</button>
                <p className="text-xs text-slate-600">{entry.kind === 'restore' ? tr('undo_step_restore_hint', 'Bring back the wording and minutes from before this restore. Editing this step will clear its undo option.') : tr('undo_step_hint', 'Restore the wording from before this replacement. Editing this step will clear its undo option.')}</p>
              </div>)}
              <div className="grid gap-3 sm:grid-cols-2">
                {stepFields.map(([key, label]) => <div key={key} className={(key === 'teacherSays' ? 'sm:col-span-2 ' : '') + (['teacherSays', 'checkQuestion'].includes(key) ? 'rounded-lg border-l-4 border-indigo-600 bg-indigo-50 p-3' : '')}>
                  {['teacherSays', 'checkQuestion'].includes(key) && <p className="mb-1 text-xs font-bold text-indigo-900"><span aria-hidden="true">❝ </span>{key === 'teacherSays' ? tr('say_aloud', 'Say aloud') : tr('ask_aloud', 'Ask aloud')}</p>}
                  {draft ? <label className="block text-sm font-bold text-slate-900">{label} · {index + 1}<textarea {...editFieldProps(step, index, key)} aria-label={label + " · " + (index + 1)} className={fieldClass + ' mt-1'} rows={3} value={step[key] || ''} maxLength={16000} disabled={saving || busy} onChange={event => updateStep(index, key, event.target.value)} />{editFieldError(step, index, key)}</label> : <><h6 className="text-xs font-black uppercase tracking-wide text-slate-600">{label}</h6><p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{_ltsText(step[key]) || '—'}</p></>}
                </div>)}
              </div>
              {Array.isArray(step.resourceIds) && step.resourceIds.length > 0 && <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">{tr('step_materials', 'Lesson resources:')}</span>
                {step.resourceIds.map(resourceId => {
                  const matches = materials.filter(item => String(item.id) === String(resourceId));
                  const material = matches.length === 1 ? matches[0] : null;
                  return material && typeof onOpenTeachingMaterial === 'function' ? <button type="button" key={resourceId} className={buttonClass + ' no-print'} disabled={!!draft || saving || busy} onClick={() => onOpenTeachingMaterial(material.id)}>{_ltsText(material.title || material.data?.title) || _ltsText(material.type)}</button> : <span key={resourceId} className="text-sm text-slate-700">{material ? (_ltsText(material.title || material.data?.title) || _ltsText(material.type)) : matches.length > 1 ? tr('source_ambiguous', 'Duplicate resource ID') + ': ' + materialName(resourceId) : tr('missing_material', 'Resource no longer available in this lesson') + ': ' + materialName(resourceId)}</span>;
                })}
              </div>}
              {Array.isArray(step.recommendationIds) && step.recommendationIds.length > 0 && <ul className="space-y-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-950" aria-label={tr('step_evidence', 'Teaching guidance used in this step')}>
                {step.recommendationIds.map(recommendationId => {
                  const entry = recommendationById.get(String(recommendationId));
                  if (!entry) return <li key={recommendationId}>{tr('missing_recommendation', 'The cited teaching guidance is unavailable. Review this step.')}</li>;
                  const href = _ltsSafeUrl(entry.source.url);
                  return <li key={recommendationId}><p>{_ltsText(entry.recommendation.text)}</p><p className="mt-1 text-xs">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold underline">{_ltsText(entry.source.title)}</a> : _ltsText(entry.source.title)}{_ltsLocator(entry.recommendation.locator) ? ' · ' + _ltsLocator(entry.recommendation.locator) : ''}{entry.recommendation.evidenceLevel ? ' · ' + _ltsText(entry.recommendation.evidenceLevel) : ''}</p></li>;
                })}
              </ul>}
            </li>)}
          </ol>
          {draft && <div ref={editActions} tabIndex={-1} role="region" aria-label={tr('edit_actions', 'Save or discard script edits')} className="space-y-3 rounded-lg border border-indigo-300 bg-indigo-50 p-3 no-print focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
            {invalidTiming && <p role="alert" className="text-sm text-red-900">{tr('timing_error', 'Step times must be positive whole minutes and add up to the version’s teaching time.')} ({timings} / {version.durationMinutes} {tr('minutes', 'minutes')})</p>}
            {invalidDraftText && <p role="alert" className="text-sm text-red-900">{tr('text_error', 'Give each step a title and complete every teaching field. Expand each teacher prompt into the words you will say (at least 60 characters).')}</p>}
            {invalidDraftLength && <p role="alert" className="text-sm text-red-900">{tr('step_too_long', 'Keep each teaching field within 16,000 characters before saving.')}</p>}
            {staleDraft && <p role="alert" className="text-sm text-red-900">{tr('stale_edits', 'This saved version changed while you were editing. Copy your draft if needed, then discard edits to review the current version.')}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonClass} disabled={saving || busy || invalidTiming || invalidDraftText || invalidDraftLength || staleDraft} onClick={saveEdits}>{saving ? tr('saving', 'Adding edits…') : tr('save', 'Save edits')}</button>
              {!confirmDiscard && <button ref={discardToggle} type="button" className={buttonClass} disabled={saving || busy} onClick={() => draftChanged ? setConfirmDiscard(true) : discardEdits()}>{tr('discard', 'Discard edits')}</button>}
              {confirmDiscard && <div role="group" aria-label={tr('discard_question', 'Discard your unsaved script changes?')} className="w-full space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); keepEditing(); } }}>
                <p className="text-sm">{tr('discard_question', 'Discard your unsaved script changes?')}</p>
                <div className="flex flex-wrap gap-2"><button autoFocus type="button" className={buttonClass} disabled={saving || busy} onClick={keepEditing}>{tr('keep_editing', 'Keep editing')}</button><button type="button" className={buttonClass} disabled={saving || busy} onClick={discardEdits}>{tr('discard_confirm', 'Discard changes')}</button></div>
              </div>}
            </div>
          </div>}
          {/* Reference material: collapsed so the steps stay the focus; each step already cites the guidance it used. */}
          <details className="border-t border-slate-200 pt-4" data-script-sources>
            <summary className="min-h-11 cursor-pointer rounded py-2.5 font-black text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"><h5 className="inline">{tr('sources', 'Teaching sources and evidence')}</h5>{sources.length ? ' (' + sources.length + ')' : ''}</summary>
            <div className="mt-3 space-y-3">
            {sources.length ? <ul className="space-y-3">{sources.map((source, index) => {
              const href = _ltsSafeUrl(source.url);
              return <li key={source.id || index} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-800">
                <p className="font-bold">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-800 underline">{_ltsText(source.title) || href}</a> : _ltsText(source.title) || tr('source_unavailable', 'Source link unavailable')}</p>
                <p>{[_ltsText(source.author), _ltsText(source.publishedAt), source.evidenceKind === 'general-practice' ? tr('evidence_general', 'General instructional practice') : source.evidenceKind === 'content-specific' ? tr('evidence_content', 'Content-specific guidance') : ''].filter(Boolean).join(' · ')}</p>
                {Array.isArray(source.recommendations) && source.recommendations.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{source.recommendations.filter(recommendation => recommendation && typeof recommendation === 'object').map((recommendation, offset) => <li key={recommendation.id || offset}>{_ltsText(recommendation.text)}{_ltsLocator(recommendation.locator) ? ' (' + _ltsLocator(recommendation.locator) + ')' : ''}</li>)}</ul>}
                {(source.scope || source.evidenceLevel || source.retrievedAt) && <details className="mt-2">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm leading-5 font-bold text-indigo-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">{tr('about_source', 'About this source')}</summary>
                  {source.scope && <p className="mt-1">{tr('scope_label', 'Scope:')} {_ltsText(source.scope)}</p>}
                  {source.evidenceLevel && <p>{tr('evidence_level', 'Evidence level:')} {_ltsText(source.evidenceLevel)}</p>}
                  {source.retrievedAt && <p className="text-xs text-slate-600">{tr('retrieved', 'Retrieved:')} <time dateTime={_ltsText(source.retrievedAt)}>{_ltsReadableDate(source.retrievedAt)}</time></p>}
                </details>}
              </li>;
            })}</ul> : <p className="text-sm text-slate-700">{tr('no_sources', 'No research sources are attached to this version. Review the teaching choices against your lesson and learners.')}</p>}
            </div>
          </details>
        </div>}
      </div>}
    </section>
  );
}
