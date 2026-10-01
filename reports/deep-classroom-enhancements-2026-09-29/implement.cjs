const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const files = [...hosts, 'teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js', 'tests/dashboard_close_routing.test.js'];
const inputs = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
if (!hosts.every(file => inputs[file] === inputs[hosts[0]])) throw Error('Inspect host destination-only differences before editing');
if (inputs['teacher_module.js'] !== inputs['desktop/web-app/public/teacher_module.js']) throw Error('Inspect teacher mirror differences before rebuilding');
if (fs.existsSync(path.join(__dirname, 'before.json'))) {
  const saved = JSON.parse(fs.readFileSync(path.join(__dirname, 'before.json'), 'utf8'));
  if (files.some(file => saved[file] !== sha(inputs[file]))) throw Error('Before-images differ; inspect before repeating');
}
fs.mkdirSync(path.join(__dirname, 'before'), { recursive: true });
for (const [file, text] of Object.entries(inputs)) fs.writeFileSync(path.join(__dirname, 'before', file.replaceAll('/', '__')), text);
fs.writeFileSync(path.join(__dirname, 'before.json'), JSON.stringify(Object.fromEntries(files.map(file => [file, sha(inputs[file])])), null, 2));
const replace = (text, from, to) => {
  if (text.split(from).length !== 2) throw Error('Non-unique anchor: ' + from.slice(0, 140));
  return text.replace(from, to);
};
let host = inputs[hosts[0]];
host = replace(host, '  const runAutoFixLoop = React.useCallback(async (maxRounds = 3) => {\n', `  const autoFixLoadRequestRef = useRef(0);
  const runAutoFixLoop = React.useCallback(async (maxRounds = 3) => {
    const request = ++autoFixLoadRequestRef.current;
    const generation = window.__alloPdfRunGen || 0;
    const result = pdfFixResultRef.current;
    const revision = pdfHtmlRevisionRef.current;
    const wasStopped = pdfAutoContinueAbortRef.current;
    await _alloAwaitModules([['MiscHandlersModule', 'MiscHandlers']], 'document auto-continue');
    if (request !== autoFixLoadRequestRef.current) return { started: false, reason: 'superseded' };
    if ((window.__alloPdfRunGen || 0) !== generation || pdfFixResultRef.current !== result || pdfHtmlRevisionRef.current !== revision) return { started: false, reason: 'document-changed' };
    if (!wasStopped && pdfAutoContinueAbortRef.current) return { started: false, reason: 'user-stopped' };
`);
host = replace(host, '  const handleCardAudioSequence = async (e) => {\n', `  const cardAudioLoadRequestRef = useRef(0);
  const cardAudioContextRef = useRef(null);
  cardAudioContextRef.current = [generatedContent, flashcardIndex, flashcardLang, flashcardMode, standardDeckLang, selectedVoice, activeView, isInteractiveFlashcards];
  React.useEffect(() => () => { ++cardAudioLoadRequestRef.current; ++autoFixLoadRequestRef.current; }, []);
  const handleCardAudioSequence = async (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    const request = ++cardAudioLoadRequestRef.current;
    const context = cardAudioContextRef.current;
    const session = playbackSessionRef.current;
    await _alloAwaitModules([['AudioHelpersModule', 'AudioHelpers']], 'flashcard audio');
    if (request !== cardAudioLoadRequestRef.current || playbackSessionRef.current !== session || !context.every((value, index) => value === cardAudioContextRef.current[index])) return;
`);
const start = host.indexOf("      {activeView === 'dashboard' && (!isTeacherMode || isIndependentMode || isParentMode) && (");
const end = host.indexOf('      <TeacherGate', start);
if (start < 0 || end < start) throw Error('Dashboard branch not found');
const learner = host.slice(start, end);
host = host.slice(0, start) + host.slice(end);
host = replace(host, '        {/* The header holds the page h1; Focus view hides it. */}', `        <div hidden={!(activeView === 'dashboard' && (!isTeacherMode || isIndependentMode || isParentMode))} className="w-full min-h-0 overflow-y-auto custom-scrollbar">
${learner}        </div>
        {(activeView !== 'dashboard' || (isTeacherMode && !isIndependentMode && !isParentMode)) && (<>
        {/* The header holds the page h1; Focus view hides it. */}`);
host = replace(host, '      </main>\n', '        </>)}\n      </main>\n');
let teacher = inputs['teacher_source.jsx'];
const componentStart = teacher.indexOf('const LearnerProgressView = React.memo((');
const componentEnd = teacher.indexOf('// @section TEACHER_DASHBOARD', componentStart);
let component = teacher.slice(componentStart, componentEnd);
component = replace(component, '    const [selectedChild, setSelectedChild] = useState(null);', `    const [selectedChild, setSelectedChild] = useState(null);
    const headingRef = useRef(null);
    const panelId = React.useId();
    const progressText = (key, fallback) => {
        const value = typeof t === 'function' ? t(key) : '';
        return typeof value === 'string' && value && value !== key ? value : fallback;
    };
    useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);`);
component = replace(component, "            lastSession: rosterKey?.progressHistory?.[name]?.slice(-1)?.[0]?.timestamp || null,\n            sessionCount: rosterKey?.progressHistory?.[name]?.length || 0", "            sessions: (Array.isArray(rosterKey?.progressHistory?.[name]) ? rosterKey.progressHistory[name] : []).filter(row => row && typeof row === 'object' && !Array.isArray(row))");
component = replace(component, '    const isPhonemeMastered = (value) => {', `    useEffect(() => {
        if (selectedChild && !childProfiles.some(child => child.name === selectedChild)) setSelectedChild(null);
    }, [childProfiles, selectedChild]);
    const savedSessions = childProfiles.flatMap(child => !selectedChild || selectedChild === child.name
        ? child.sessions.map(row => ({ child: child.name, row })) : [])
        .sort((a, b) => (Date.parse(b.row.timestamp) || 0) - (Date.parse(a.row.timestamp) || 0));
    const sessionValue = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : '—';
    const isPhonemeMastered = (value) => {`);
component = replace(component, `    const heading = isParentMode
        ? (selectedChild ? selectedChild + "'s Learning Journey" : "Your Child's Learning Journey")
        : "My Learning Progress";`, `    const heading = isParentMode
        ? progressText('parent_mode.dashboard_title', 'Family Dashboard')
        : progressText('learner.my_learning_journey', 'My Learning Journey');`);
component = replace(component, 'className="max-w-4xl mx-auto p-4 md:p-6 space-y-6', 'className="w-full max-w-4xl mx-auto p-3 sm:p-4 md:p-6 space-y-6');
component = replace(component, '<div className="flex items-center justify-between">', '<div className="flex flex-wrap items-start justify-between gap-3">');
component = replace(component, '<div>\n                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">', '<div className="min-w-0 flex-1 basis-56">\n                    <h2 ref={headingRef} tabIndex={-1} id={panelId + "-heading"} className="text-2xl md:text-3xl font-black text-slate-800 flex items-start gap-3 break-words">');
component = replace(component, 'w-10 h-10 bg-gradient-to-br', 'w-10 h-10 shrink-0 bg-gradient-to-br');
component = replace(component, "{isParentMode ? \"Track your family's learning growth\" : \"Track your learning growth over time\"}", "{isParentMode ? progressText('learner.device_activity_notice', 'Activity totals show work saved on this device. Choose a family member to view their saved sessions.') : progressText('learner.progress_intro', 'Track your learning growth over time')}");
component = replace(component, 'onClick={() => setShowDiagnostics(prev => !prev)}', 'onClick={() => setShowDiagnostics(prev => !prev)}\n                        aria-expanded={showDiagnostics}\n                        aria-controls={panelId + "-details"}');
component = replace(component, 'px-3 py-1.5 rounded-lg text-xs font-bold', 'min-h-11 px-3 py-1.5 rounded-lg text-xs font-bold');
component = replace(component, 'title={showDiagnostics ? "Hide detailed metrics" : "Show detailed metrics"}', "title={progressText('common.details', 'Details')}");
component = replace(component, "{showDiagnostics ? 'Details On' : 'Details'}", "{progressText('common.details', 'Details')}");
component = replace(component, 'className="p-2 rounded-lg bg-slate-100', 'className="min-h-11 min-w-11 p-2 rounded-lg bg-slate-100');
component = replace(component, '<Users size={14} /> Family Members', "<Users aria-hidden=\"true\" size={14} /> {progressText('learner.family_members', 'Family members')}");
component = replace(component, '<div className="flex flex-wrap gap-2">\n                        <button type="button"', '<div role="group" aria-label={progressText("learner.family_members", "Family members")} className="flex flex-wrap gap-2">\n                        <button type="button"');
component = replace(component, 'onClick={() => setSelectedChild(null)}', 'onClick={() => setSelectedChild(null)}\n                            aria-pressed={!selectedChild}');
component = replace(component, "                                !selectedChild ?", "                                !selectedChild ?");
component = component.replaceAll('px-4 py-2 rounded-xl font-bold text-sm', 'min-h-11 max-w-full break-words px-4 py-2 rounded-xl font-bold text-sm');
component = replace(component, '                            Everyone\n', "                            {progressText('common.all', 'Everyone')}\n");
component = replace(component, 'onClick={() => setSelectedChild(child.name)}', 'onClick={() => setSelectedChild(child.name)}\n                                aria-pressed={selectedChild === child.name}');
component = replace(component, '                                {child.name}\n', '                                <span className="min-w-0 break-words">{child.name}</span>\n');
component = replace(component, "aria-label={t('common.close_dashboard') || t('common.close') || 'Close progress dashboard'}", "aria-label={progressText('common.close_dashboard', progressText('common.close', 'Close progress dashboard'))}");
component = replace(component, '{child.sessionCount > 0 && (', '{child.sessions.length > 0 && (');
component = replace(component, '{child.sessionCount} sessions', "{child.sessions.length} {progressText('learner.sessions', 'Sessions')}");
component = replace(component, '                    </div>\n                </div>\n            )}\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">', `                    </div>
                    <section className="mt-4 rounded-xl bg-white p-3 text-slate-800" aria-labelledby={panelId + '-sessions'} data-help-key="learner_progress_saved_sessions">
                        <h4 id={panelId + '-sessions'} className="font-bold break-words">{selectedChild && <span>{selectedChild} · </span>}{progressText('learner.session_history', 'Session History')} ({savedSessions.length})</h4>
                        {savedSessions.length === 0 ? <p className="mt-2 text-sm">{progressText('learner.no_saved_sessions', 'No saved sessions for this family member yet.')}</p> : (
                            <ul className="mt-2 space-y-2">
                                {savedSessions.slice(0, 10).map(({ child, row }, index) => {
                                    const date = new Date(row.timestamp);
                                    const validDate = row.timestamp && Number.isFinite(date.getTime());
                                    return <li key={child + ':' + (row.sessionId || index)} className="rounded-lg border border-slate-300 p-2 text-sm break-words">
                                        {!selectedChild && <div className="font-bold">{child}</div>}
                                        <div>{validDate ? <time dateTime={date.toISOString()}>{date.toLocaleDateString()}</time> : '—'}</div>
                                        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                            <div><dt className="inline">{progressText('common.responses', 'Responses')}: </dt><dd className="inline font-bold">{sessionValue(row.responseCount)}</dd></div>
                                            <div><dt className="inline">{progressText('learner.resources_opened', 'Resources opened')}: </dt><dd className="inline font-bold">{sessionValue(row.resourcesOpened)}</dd></div>
                                        </dl>
                                    </li>;
                                })}
                            </ul>
                        )}
                    </section>
                </div>
            )}
            {isParentMode && <h3 className="font-bold text-slate-800">{progressText('learner.device_activity', 'Activity on this device')}</h3>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`);
component = replace(component, "                const weekWords = wordSoundsHistory.filter(h => h.timestamp && new Date(h.timestamp) >= weekAgo);", "                const weekWords = wordSoundsHistory.filter(h => h && h.timestamp && new Date(h.timestamp) >= weekAgo && new Date(h.timestamp) <= now);\n                const weekGradedWords = weekWords.filter(h => h.practiceOnly !== true && h.activity !== 'letter_tracing');");
component = replace(component, 'const weekAccuracy = weekWords.length > 0 ? Math.round(weekWords.filter(w => w.correct).length / weekWords.length * 100) : null;', 'const weekAccuracy = weekGradedWords.length > 0 ? Math.round(weekGradedWords.filter(w => w.correct).length / weekGradedWords.length * 100) : null;');
component = replace(component, '{weekWords.filter(w => w.correct).length}/{weekWords.length}', '{weekWords.length}');
component = replace(component, '<div className="text-[11px] font-bold text-emerald-700 uppercase">Accuracy</div>', '<div className="text-[11px] font-bold text-emerald-700 uppercase">{progressText("learner.ws_accuracy", "Word Sounds Accuracy")}</div>');
component = replace(component, '{showDiagnostics && (\n                <div className="bg-slate-50', '<>\n                <div id={panelId + "-details"} hidden={!showDiagnostics} className="bg-slate-50');
component = replace(component, '                </div>\n            )}\n            <div className="flex flex-wrap justify-center gap-3 pt-2">', '                </div>\n            </>\n            <div className="flex flex-wrap justify-center gap-3 pt-2">');
component = replace(component, '<Share2 size={16} /> Share Progress with Teacher', '<Download aria-hidden="true" size={16} /> {progressText("learner.download_progress_report", "Download progress report")}');
component = component.replaceAll('text-green-600', 'text-green-800').replaceAll('text-yellow-600', 'text-amber-800').replaceAll('text-orange-500', 'text-orange-800');
teacher = teacher.slice(0, componentStart) + component + teacher.slice(componentEnd);
const outputs = Object.fromEntries(hosts.map(file => [file, host]));
outputs['teacher_source.jsx'] = teacher;
for (const [file, text] of Object.entries(outputs)) {
  if (fs.readFileSync(path.join(root, file), 'utf8') !== inputs[file]) throw Error('Concurrent edit: ' + file);
  fs.writeFileSync(path.join(root, file), text);
  if (fs.readFileSync(path.join(root, file), 'utf8') !== text) throw Error('Readback mismatch: ' + file);
}
fs.writeFileSync(path.join(__dirname, 'implemented.json'), JSON.stringify(Object.fromEntries(Object.entries(outputs).map(([file, text]) => [file, { before: sha(inputs[file]), after: sha(text) }])), null, 2));
console.log('Updated dashboard placement, truthful family session scope, graded weekly accuracy, accessible controls and guarded action waits.');
