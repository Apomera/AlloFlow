"""
Firebase Progress Sync — District-Hosted Only (Canvas-Gated)
1. Add syncProgressToFirestore function (gated with !isCanvas)
2. Add useEffect to auto-sync every 60s when in a session (non-Canvas)
3. Add teacher-side onSnapshot listener for studentProgress subcollection
4. Add live indicator in teacher dashboard
"""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Add syncProgressToFirestore function after executeSaveFile
    # We place it right after the executeSaveFile closing brace, 
    # which ends the save modal flow
    # ============================================================
    target_1 = """    const blob = new Blob([dataStr], { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const link = document.createElement('a');
       link.href = url;
       link.download = filename;"""

    # Try alternate whitespace
    if target_1 not in content:
        # Search for the actual pattern
        import re
        pattern_match = re.search(r'(const blob = new Blob\(\[dataStr\].*?\n.*?const url = URL\.createObjectURL\(blob\);\n.*?const link = document\.createElement\(\'a\'\);\n.*?link\.href = url;\n.*?link\.download = filename;)', content, re.DOTALL)
        if pattern_match:
            target_1 = pattern_match.group(1)

    # ============================================================
    # EDIT 1 (alternate approach): Add sync function after lastJsonFileSave state
    #   since that's where save-related state lives
    # ============================================================
    target_1_alt = "    const [lastJsonFileSave, setLastJsonFileSave] = useState(Date.now());"
    replacement_1_alt = """    const [lastJsonFileSave, setLastJsonFileSave] = useState(Date.now());
    const progressSyncTimerRef = useRef(null);
    const [isProgressSyncing, setIsProgressSyncing] = useState(false);
    const [lastProgressSync, setLastProgressSync] = useState(null);
    const [liveStudentProgress, setLiveStudentProgress] = useState({});"""

    if target_1_alt in content:
        content = content.replace(target_1_alt, replacement_1_alt, 1)
        edits_applied += 1
        print("✅ EDIT1: Added sync state variables")
    else:
        print("❌ EDIT1: Could not find lastJsonFileSave state")

    # ============================================================
    # EDIT 2: Add syncProgressToFirestore function + auto-sync useEffect
    #   Place after the saveReminderIntervalRef
    # ============================================================
    target_2 = "    const saveReminderIntervalRef = useRef(null);"
    replacement_2 = """    const saveReminderIntervalRef = useRef(null);

    // ── Firebase Progress Sync (District-Hosted Only) ──
    // Writes student progress to Firestore subcollection when:
    //   1. NOT in Canvas mode (FERPA: Canvas uses manual JSON export)
    //   2. Student has an active session code
    //   3. Student has a nickname
    const syncProgressToFirestore = React.useCallback(async () => {
        // Canvas gate: NEVER sync from Canvas
        if (isCanvas) return;
        if (!activeSessionCode || !studentNickname) return;
        try {
            setIsProgressSyncing(true);
            const progressRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode, 'studentProgress', studentNickname.replace(/[^a-zA-Z0-9_-]/g, '_'));
            const progressData = {
                studentNickname,
                lastSynced: new Date().toISOString(),
                stats: {
                    quizAvg: (() => {
                        const quizItems = history.filter(h => h.type === 'quiz');
                        let total = 0, count = 0;
                        quizItems.forEach(quiz => {
                            const questions = quiz.data?.questions || [];
                            if (!questions.length) return;
                            let correct = 0;
                            const resps = studentResponses[quiz.id] || {};
                            questions.forEach((q, i) => {
                                const resp = resps[i];
                                if (resp !== undefined && resp !== null) {
                                    let val = resp;
                                    if (!isNaN(parseInt(resp)) && q.options && q.options[resp]) val = q.options[resp];
                                    if (String(val).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) correct++;
                                }
                            });
                            total += (correct / questions.length) * 100;
                            count++;
                        });
                        return count > 0 ? Math.round(total / count) : 0;
                    })(),
                    wsAccuracy: (() => {
                        if (!wordSoundsHistory || wordSoundsHistory.length === 0) return 0;
                        const correct = wordSoundsHistory.filter(h => h.correct).length;
                        return Math.round((correct / wordSoundsHistory.length) * 100);
                    })(),
                    fluencyWCPM: fluencyAssessments?.length > 0 ? fluencyAssessments[fluencyAssessments.length - 1]?.wcpm || 0 : 0,
                    gamesPlayed: gameCompletions?.length || 0,
                    totalActivities: (history?.length || 0) + (wordSoundsHistory?.length > 0 ? 1 : 0) + (gameCompletions?.length || 0),
                    labelChallengeAvg: (() => {
                        if (!labelChallengeResults || labelChallengeResults.length === 0) return 0;
                        return Math.round(labelChallengeResults.reduce((a, b) => a + (b.score || 0), 0) / labelChallengeResults.length);
                    })(),
                    globalPoints,
                    wsWordsCompleted: wordSoundsHistory?.filter(h => h.correct)?.length || 0
                },
                fluencyHistory: (fluencyAssessments || []).slice(-10).map(a => ({ wcpm: a.wcpm, date: a.timestamp || a.date })),
                gameScoreHistory: (gameCompletions || []).slice(-10).map(g => ({ score: g.score, game: g.game, date: g.timestamp || g.date }))
            };
            await setDoc(progressRef, progressData, { merge: true });
            setLastProgressSync(new Date());
            debugLog('[ProgressSync] Synced to Firestore for', studentNickname);
        } catch (err) {
            warnLog('[ProgressSync] Firestore sync failed:', err.message);
        } finally {
            setIsProgressSyncing(false);
        }
    }, [isCanvas, activeSessionCode, studentNickname, history, studentResponses, wordSoundsHistory, fluencyAssessments, gameCompletions, labelChallengeResults, globalPoints]);

    // Auto-sync every 60s when in a live session (non-Canvas only)
    React.useEffect(() => {
        if (isCanvas || !activeSessionCode || !studentNickname) {
            if (progressSyncTimerRef.current) clearInterval(progressSyncTimerRef.current);
            return;
        }
        // Initial sync
        syncProgressToFirestore();
        // Periodic sync
        progressSyncTimerRef.current = setInterval(syncProgressToFirestore, 60000);
        return () => {
            if (progressSyncTimerRef.current) clearInterval(progressSyncTimerRef.current);
        };
    }, [isCanvas, activeSessionCode, studentNickname, syncProgressToFirestore]);"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: Added syncProgressToFirestore + auto-sync useEffect")
    else:
        print("❌ EDIT2: Could not find saveReminderIntervalRef")

    # ============================================================
    # EDIT 3: Add teacher-side live listener in StudentAnalyticsPanel
    #   Add state + useEffect after the existing state declarations
    # ============================================================
    target_3 = """    const [showRTISettings, setShowRTISettings] = React.useState(false);"""
    replacement_3 = """    const [showRTISettings, setShowRTISettings] = React.useState(false);
    const [liveProgressData, setLiveProgressData] = React.useState({});
    const [isLiveListening, setIsLiveListening] = React.useState(false);"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Added teacher-side live progress state")
    else:
        print("❌ EDIT3: Could not find showRTISettings state")

    # ============================================================
    # EDIT 4: Add "📡 Live Sync" button next to the Export/Import buttons
    #   and the onSnapshot listener logic
    # ============================================================
    target_4 = """                                <button 
                                    aria-label="Delete"
                                    data-help-key="dashboard_clear_btn"
                                    onClick={() => setImportedStudents([])}"""

    replacement_4 = """                                <button
                                    aria-label="Live Sync"
                                    data-help-key="dashboard_live_sync"
                                    onClick={() => {
                                        if (isLiveListening) {
                                            setIsLiveListening(false);
                                            return;
                                        }
                                        const code = prompt('Enter session code for live progress sync:');
                                        if (!code || !code.trim()) return;
                                        setIsLiveListening(true);
                                        const progressCollRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions', code.trim(), 'studentProgress');
                                        const unsubscribe = onSnapshot(progressCollRef, (snapshot) => {
                                            const data = {};
                                            snapshot.forEach(docSnap => {
                                                data[docSnap.id] = docSnap.data();
                                            });
                                            setLiveProgressData(data);
                                            // Auto-add to imported students
                                            const liveStudents = Object.entries(data).map(([id, d]) => ({
                                                id: `live-${id}`,
                                                name: d.studentNickname || id,
                                                filename: `live:${id}`,
                                                data: d,
                                                stats: d.stats || {},
                                                safetyFlags: [],
                                                lastSession: d.lastSynced || new Date().toISOString(),
                                                isLive: true
                                            }));
                                            setImportedStudents(prev => {
                                                const manual = prev.filter(s => !s.isLive);
                                                return [...manual, ...liveStudents];
                                            });
                                        }, (err) => {
                                            warnLog('[LiveSync] Listener error:', err);
                                            setIsLiveListening(false);
                                        });
                                        // Store unsubscribe for cleanup
                                        window._progressUnsub = unsubscribe;
                                    }}
                                    className={`${isLiveListening ? 'bg-green-600 hover:bg-green-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors`}
                                >
                                    {isLiveListening ? <><Wifi size={16} /> Live ({Object.keys(liveProgressData).length})</> : <><Cloud size={16} /> Live Sync</>}
                                </button>
                                <button 
                                    aria-label="Delete"
                                    data-help-key="dashboard_clear_btn"
                                    onClick={() => { setImportedStudents([]); if (window._progressUnsub) { window._progressUnsub(); setIsLiveListening(false); } }}"""

    if target_4 in content:
        content = content.replace(target_4, replacement_4, 1)
        edits_applied += 1
        print("✅ EDIT4: Added Live Sync button + onSnapshot listener to teacher dashboard")
    else:
        print("❌ EDIT4: Could not find Clear Data button")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/4 edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
