from pathlib import Path
p=Path('behavior_lens_module.js'); s=p.read_text(encoding='utf-8-sig')
def section(name,endname,fn):
 global s
 a=s.index('    const '+name+' ='); b=s.index('    const '+endname+' =',a)
 s=s[:a]+fn(s[a:b])+s[b:]
def rep(text,a,b):
 assert a in text,a[:100]
 return text.replace(a,b,1)
helper='''    // Shared overlay lifecycle. Nested confirmation dialogs retain their own trap.
    const useBehaviorLensModal = (dialogRef, onClose) => {
        const closeRef = useRef(onClose);
        closeRef.current = onClose;
        useEffect(() => {
            const dialog = dialogRef.current;
            if (!dialog) return undefined;
            const opener = document.activeElement;
            const host = dialog.closest('.bl-root');
            const siblings = host ? Array.from(host.children).filter(node => node !== dialog && !node.contains(dialog)) : [];
            const previous = siblings.map(node => ({ node, inert: node.hasAttribute('inert') }));
            previous.forEach(({ node }) => node.setAttribute('inert', ''));
            const focusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                .filter(node => !node.closest('[hidden], [inert], .hidden') && node.getAttribute('aria-hidden') !== 'true' && window.getComputedStyle(node).display !== 'none');
            const timer = window.setTimeout(() => (focusable()[0] || dialog).focus(), 0);
            const onKeyDown = event => {
                const activeDialog = event.target.closest?.('[role="dialog"], [role="alertdialog"]');
                if (activeDialog && activeDialog !== dialog) return;
                if (event.key === 'Escape') {
                    event.preventDefault(); event.stopPropagation(); closeRef.current(); return;
                }
                if (event.key !== 'Tab') return;
                const items = focusable(), first = items[0], last = items[items.length - 1];
                if (!first) { event.preventDefault(); dialog.focus(); return; }
                if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog || !dialog.contains(document.activeElement))) {
                    event.preventDefault(); last.focus();
                } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                    event.preventDefault(); first.focus();
                }
            };
            document.addEventListener('keydown', onKeyDown, true);
            return () => {
                window.clearTimeout(timer);
                document.removeEventListener('keydown', onKeyDown, true);
                previous.forEach(({ node, inert }) => { if (!inert) node.removeAttribute('inert'); });
                if (opener?.isConnected && typeof opener.focus === 'function') opener.focus();
            };
        }, []);
    };
    const observationDraftKey = (kind, identity) => 'behaviorLens_observation_draft_v1_' + kind + '_' + encodeURIComponent(identity || 'unselected');
    const readObservationDraft = (kind, identity) => {
        if (!identity) return null;
        try {
            const value = JSON.parse(sessionStorage.getItem(observationDraftKey(kind, identity)) || 'null');
            return value && value.version === 1 && Date.now() - value.savedAt < 7 * 86400000 && value.data && typeof value.data === 'object' ? value.data : null;
        } catch (_) { return null; }
    };
    const useObservationRecovery = ({ kind, identity, draft, hasData, onClose, addToast }) => {
        const latest = useRef({ draft, hasData });
        latest.current = { draft, hasData };
        const cleared = useRef(false);
        const key = observationDraftKey(kind, identity);
        const writeDraft = useCallback(() => {
            if (!identity || cleared.current) return true;
            try {
                if (latest.current.hasData) sessionStorage.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now(), data: latest.current.draft }));
                else sessionStorage.removeItem(key);
                return true;
            } catch (_) { return false; }
        }, [identity, key]);
        useEffect(() => { writeDraft(); }, [draft, hasData, writeDraft]);
        useEffect(() => {
            window.addEventListener('pagehide', writeDraft);
            return () => { window.removeEventListener('pagehide', writeDraft); writeDraft(); };
        }, [writeDraft]);
        const clearDraft = () => {
            cleared.current = true;
            try { sessionStorage.removeItem(key); } catch (_) {}
        };
        const requestClose = async () => {
            if (!latest.current.hasData) { onClose(); return; }
            if (!identity || !writeDraft()) {
                if (addToast) addToast('This browser could not keep the observation draft. Save the session or explicitly discard it before closing.', 'error');
                return;
            }
            if (await askBehaviorLensConfirmation('Keep this unfinished observation as a draft and close? Reopen this tool for the same student in this browser tab to resume. Recording will be paused.', { title: 'Keep observation draft', confirmText: 'Keep draft and close', cancelText: 'Continue recording' })) onClose();
        };
        const discardAndClose = async () => {
            if (!latest.current.hasData || await askBehaviorLensConfirmation('Discard this unfinished observation? Its unsaved measurements cannot be recovered.', { title: 'Discard observation draft', confirmText: 'Discard observation' })) { clearDraft(); onClose(); }
        };
        return { clearDraft, requestClose, discardAndClose };
    };

'''
s=s.replace('    const LiveObsOverlay =',helper+'    const LiveObsOverlay =',1)
def live(t):
 t=rep(t,"({ onClose, studentName, onSaveSession, t, addToast })", "({ onClose, studentName, studentDraftId, onSaveSession, t, addToast })")
 t=rep(t,"        const [method, setMethod] = useState('frequency');", "        const draftIdentity = studentDraftId || studentName;\n        const [recoveredDraft] = useState(() => readObservationDraft('live', draftIdentity));\n        const [method, setMethod] = useState(recoveredDraft?.method || 'frequency');")
 for a,b in [("useState(0);","useState(recoveredDraft?.timer || 0);"),("const [frequency, setFrequency] = useState(0);","const [frequency, setFrequency] = useState(recoveredDraft?.frequency || 0);"),("const [intervals, setIntervals] = useState([]);","const [intervals, setIntervals] = useState(recoveredDraft?.intervals || []);"),("const [intervalLength, setIntervalLength] = useState(15);","const [intervalLength, setIntervalLength] = useState(recoveredDraft?.intervalLength || 15);"),("const [durations, setDurations] = useState([]);","const [durations, setDurations] = useState(recoveredDraft?.durations || []);"),("const [latencyMs, setLatencyMs] = useState(null);","const [latencyMs, setLatencyMs] = useState(recoveredDraft?.latencyMs ?? null);"),("const [latencyEnd, setLatencyEnd] = useState(null);","const [latencyEnd, setLatencyEnd] = useState(recoveredDraft?.latencyMs != null ? Date.now() : null);"),("const [notes, setNotes] = useState('');","const [notes, setNotes] = useState(recoveredDraft?.notes || '');")]: t=rep(t,a,b)
 t=rep(t,"        useEffect(() => { try { dialogRef.current && dialogRef.current.focus(); } catch (e) {} }, []);", "")
 marker='        const handleSave = () => {'
 recovery="""        const recovery = useObservationRecovery({ kind: 'live', identity: draftIdentity, onClose, addToast,
            hasData: timer > 0 || frequency > 0 || durationsToSave.length > 0 || intervalsToSave.length > 0 || latencyMs !== null || !!notes,
            draft: { method, timer, frequency, intervalLength, intervals: intervalsToSave, durations: durationsToSave, latencyMs, notes } });
        useBehaviorLensModal(dialogRef, recovery.requestClose);
        useEffect(() => { if (recoveredDraft && addToast) addToast('Recovered observation draft. Recording is paused.', 'info'); }, []);

"""
 t=rep(t,marker,recovery+marker)
 t=rep(t,"            onSaveSession(sessionData);", "            onSaveSession(sessionData);\n            recovery.clearDraft();")
 t=rep(t,'h(\'button\', { "aria-label": "On Close",\n                        onClick: onClose,', "h('button', { 'aria-label': 'Close Live Observation',\n                        onClick: recovery.requestClose,")
 t=rep(t,"                    h('button', { onClick: handleSave,", "                    h('button', { onClick: recovery.discardAndClose, className: 'min-h-11 px-3 text-xs text-white underline' }, 'Discard draft'),\n                    h('button', { onClick: handleSave,")
 t=t.replace("className: 'flex items-center justify-between px-6 py-4 bg-black/30'", "className: 'flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-3 bg-black/30'")
 t=t.replace("className: 'flex items-center justify-center gap-2 py-3 bg-black/20'", "className: 'flex flex-wrap items-center justify-center gap-2 py-3 bg-black/20'")
 t=t.replace("className: 'flex-1 flex flex-col items-center justify-center gap-6'", "className: 'flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-4 py-4'")
 t=t.replace("h('button', { key: m,", "h('button', { key: m, 'aria-pressed': method === m,")
 t=t.replace("h('button', { onClick: () => {\n                            if (durationStart)", "h('button', { 'aria-label': durationStart ? 'End behavior episode' : 'Start behavior episode', onClick: () => {\n                            if (durationStart)")
 return t
section('LiveObsOverlay','OverviewPanel',live)
def freq(t):
 t=rep(t,"({ onClose, studentName, onSaveSession, t, addToast })", "({ onClose, studentName, studentDraftId, onSaveSession, t, addToast })")
 t=rep(t,"        const [counters, setCounters] = useState([{ id: uid(), label: '', count: 0 }]);", "        const draftIdentity = studentDraftId || studentName;\n        const [recoveredDraft] = useState(() => readObservationDraft('frequency', draftIdentity));\n        const [counters, setCounters] = useState(recoveredDraft?.counters || [{ id: uid(), label: '', count: 0 }]);")
 t=rep(t,"const [elapsed, setElapsed] = useState(0);", "const [elapsed, setElapsed] = useState(recoveredDraft?.elapsed || 0);")
 t=rep(t,"        useEffect(() => { try { dialogRef.current && dialogRef.current.focus(); } catch (e) {} }, []);", """        const recovery = useObservationRecovery({ kind: 'frequency', identity: draftIdentity, onClose, addToast,
            hasData: elapsed > 0 || counters.some(counter => counter.count > 0 || counter.label), draft: { counters, elapsed } });
        useBehaviorLensModal(dialogRef, recovery.requestClose);
        useEffect(() => { if (recoveredDraft && addToast) addToast('Recovered frequency draft. Recording is paused.', 'info'); }, []);""")
 t=rep(t,"            onClose();\n        };", "            recovery.clearDraft();\n            onClose();\n        };")
 t=rep(t,"h('button', { onClick: onClose, 'aria-label': 'Close'", "h('button', { onClick: recovery.requestClose, 'aria-label': 'Close Frequency Counter'")
 t=rep(t,"                h('button', { onClick: handleSave,", "                h('button', { onClick: recovery.discardAndClose, className: 'min-h-11 px-3 text-xs text-white underline' }, 'Discard draft'),\n                h('button', { onClick: handleSave,")
 t=t.replace("bg-slate-900 flex flex-col items-center justify-center text-white'", "bg-slate-900 flex flex-col items-center overflow-y-auto py-4 text-white'")
 t=t.replace("absolute top-0 left-0 right-0 flex items-center justify-between p-4", "w-full shrink-0 flex flex-wrap gap-2 items-center justify-between p-3 mb-4")
 t=t.replace("className: 'absolute bottom-8 text-center'", "className: 'mt-6 pb-4 text-center'")
 t=t.replace("className: 'flex-1 bg-transparent text-white text-xs", "className: 'min-w-0 w-full flex-1 bg-transparent text-white text-xs")
 return t
section('FrequencyCounter','IntervalGrid',freq)
def interval(t):
 t=rep(t,"({ onClose, studentName, onSaveSession, t, addToast })", "({ onClose, studentName, studentDraftId, onSaveSession, t, addToast })")
 t=rep(t,"const [mode, setMode] = useState('partial');", "const draftIdentity = studentDraftId || studentName;\n        const [recoveredDraft] = useState(() => readObservationDraft('interval', draftIdentity));\n        const [mode, setMode] = useState(recoveredDraft?.mode || 'partial');")
 for key,default in [('intervalSec','15'),('totalIntervals','20'),('currentInterval','0'),('grid','[]'),('elapsed','0')]:
  setter=key[0].upper()+key[1:]
  t=rep(t,f'const [{key}, set{setter}] = useState({default});',f'const [{key}, set{setter}] = useState(recoveredDraft?.{key} || {default});')
 t=rep(t,"        useEffect(() => { try { dialogRef.current && dialogRef.current.focus(); } catch (e) {} }, []);", """        const recovery = useObservationRecovery({ kind: 'interval', identity: draftIdentity, onClose, addToast,
            hasData: elapsed > 0 || grid.length > 0, draft: { mode, intervalSec, totalIntervals, currentInterval, grid, elapsed } });
        useBehaviorLensModal(dialogRef, recovery.requestClose);
        useEffect(() => { if (recoveredDraft && addToast) addToast('Recovered interval draft. Recording is paused.', 'info'); }, []);""")
 t=rep(t,"            onClose();\n        };", "            recovery.clearDraft();\n            onClose();\n        };")
 t=t.replace("onClick: onClose,", "onClick: recovery.requestClose,")
 t=rep(t,"h('button', { onClick: handleSave", "h('button', { onClick: recovery.discardAndClose, className: 'min-h-11 px-3 text-xs text-white underline' }, 'Discard draft'),\n                h('button', { onClick: handleSave")
 t=t.replace('h(\'button\', { "aria-label": "Toggle mode",', "h('button', { 'aria-label': modeLabels[m], 'aria-pressed': mode === m,")
 t=t.replace("role: 'progressbar',", "role: 'progressbar', 'aria-label': 'Completed observation intervals',")
 return t
section('IntervalGrid','TokenBoard',interval)
def choice(t):
 t=rep(t,"        const [choices, setChoices] = useState([", "        const dialogRef = useRef(null);\n        useBehaviorLensModal(dialogRef, onClose);\n        const [choices, setChoices] = useState([")
 t=t.replace("h('div', { role: 'dialog', 'aria-modal': 'true'", "h('div', { ref: dialogRef, tabIndex: -1, role: 'dialog', 'aria-modal': 'true'")
 return t
section('ChoiceBoard','EnvironmentAudit',choice)
s=s.replace("                if (e.key === 'Escape' && (showLiveObs || showFreqCounter || showIntervalGrid || showChoiceBoard || showWelcome || showRosterDropdown || showExportMenu)) {\n                    setShowLiveObs(false); setShowFreqCounter(false); setShowIntervalGrid(false); setShowChoiceBoard(false); setShowWelcome(false); setShowRosterDropdown(false); setShowExportMenu(false);", "                if (e.defaultPrevented) return;\n                if (e.key === 'Escape' && (showWelcome || showRosterDropdown || showExportMenu)) {\n                    setShowWelcome(false); setShowRosterDropdown(false); setShowExportMenu(false);")
for kind in ['showLiveObs','showFreqCounter','showIntervalGrid']:
 a=s.index('            '+kind+' && h('); b=s.index('            }),',a)
 chunk=s[a:b].replace('                studentName: selectedStudent,','                studentName: selectedStudent,\n                studentDraftId: activeStudentId || selectedStudent,')
 s=s[:a]+chunk+s[b:]
p.write_text(s,encoding='utf-8',newline='\n')
print('Applied shared observation modal lifecycle and per-student session drafts.')
