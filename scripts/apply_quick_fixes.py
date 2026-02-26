"""
Quick Improvements Script — 3 Fixes
1. Replace prompt() with a styled inline input for Live Sync session code
2. Persist RTI thresholds to localStorage  
3. Add live badge (📡) to live-synced students in the table
"""
import sys, os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Add liveSyncCode state + replace prompt() with inline input
    # ============================================================
    target_1a = """    const [isLiveListening, setIsLiveListening] = React.useState(false);"""
    replacement_1a = """    const [isLiveListening, setIsLiveListening] = React.useState(false);
    const [liveSyncCode, setLiveSyncCode] = React.useState('');
    const [showLiveSyncInput, setShowLiveSyncInput] = React.useState(false);"""
    
    if target_1a in content:
        content = content.replace(target_1a, replacement_1a, 1)
        edits_applied += 1
        print("✅ EDIT1a: Added liveSyncCode state")
    else:
        print("❌ EDIT1a: Could not find isLiveListening state")

    # Replace the prompt()-based button with inline input flow
    target_1b = """                                <button
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
                                </button>"""

    replacement_1b = """                                {showLiveSyncInput && !isLiveListening ? (
                                    <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 animate-in fade-in">
                                        <Cloud size={14} className="text-blue-500 shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Session code"
                                            value={liveSyncCode}
                                            onChange={e => setLiveSyncCode(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && liveSyncCode.trim()) {
                                                    setIsLiveListening(true);
                                                    setShowLiveSyncInput(false);
                                                    const progressCollRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions', liveSyncCode.trim(), 'studentProgress');
                                                    const unsubscribe = onSnapshot(progressCollRef, (snapshot) => {
                                                        const data = {};
                                                        snapshot.forEach(docSnap => { data[docSnap.id] = docSnap.data(); });
                                                        setLiveProgressData(data);
                                                        const liveStudents = Object.entries(data).map(([id, d]) => ({
                                                            id: `live-${id}`, name: d.studentNickname || id,
                                                            filename: `live:${id}`, data: d, stats: d.stats || {},
                                                            safetyFlags: [], lastSession: d.lastSynced || new Date().toISOString(), isLive: true
                                                        }));
                                                        setImportedStudents(prev => [...prev.filter(s => !s.isLive), ...liveStudents]);
                                                    }, (err) => { warnLog('[LiveSync] Error:', err); setIsLiveListening(false); });
                                                    window._progressUnsub = unsubscribe;
                                                }
                                                if (e.key === 'Escape') { setShowLiveSyncInput(false); setLiveSyncCode(''); }
                                            }}
                                            className="w-28 px-2 py-1 text-xs border-none bg-transparent outline-none placeholder-blue-300"
                                            autoFocus
                                            aria-label="Session code for live sync"
                                        />
                                        <button onClick={() => { setShowLiveSyncInput(false); setLiveSyncCode(''); }}
                                            className="text-blue-400 hover:text-blue-600 p-0.5" aria-label="Cancel"><X size={12} /></button>
                                    </div>
                                ) : (
                                    <button
                                        aria-label="Live Sync"
                                        data-help-key="dashboard_live_sync"
                                        onClick={() => {
                                            if (isLiveListening) {
                                                if (window._progressUnsub) window._progressUnsub();
                                                setIsLiveListening(false);
                                                setLiveProgressData({});
                                                return;
                                            }
                                            setShowLiveSyncInput(true);
                                        }}
                                        className={`${isLiveListening ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-300' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors`}
                                    >
                                        {isLiveListening ? <><Wifi size={16} className="animate-pulse" /> Live ({Object.keys(liveProgressData).length})</> : <><Cloud size={16} /> Live Sync</>}
                                    </button>
                                )}"""

    if target_1b in content:
        content = content.replace(target_1b, replacement_1b, 1)
        edits_applied += 1
        print("✅ EDIT1b: Replaced prompt() with styled inline input")
    else:
        print("❌ EDIT1b: Could not find Live Sync button block")

    # ============================================================
    # EDIT 2: Persist RTI thresholds to localStorage
    # ============================================================
    target_2 = """    const [rtiThresholds, setRtiThresholds] = React.useState({
        quizTier3: 50, quizTier2: 80,
        wsTier3: 50, wsTier2: 75,
        engagementMin: 2, fluencyMin: 60,
        labelChallengeMin: 50
    });"""

    replacement_2 = """    const [rtiThresholds, setRtiThresholds] = React.useState(() => {
        try {
            const saved = localStorage.getItem('alloflow_rti_thresholds');
            if (saved) return JSON.parse(saved);
        } catch (e) { /* localStorage unavailable */ }
        return { quizTier3: 50, quizTier2: 80, wsTier3: 50, wsTier2: 75, engagementMin: 2, fluencyMin: 60, labelChallengeMin: 50 };
    });
    // Persist RTI thresholds to localStorage on change
    React.useEffect(() => {
        try { localStorage.setItem('alloflow_rti_thresholds', JSON.stringify(rtiThresholds)); } catch (e) { /* ignore */ }
    }, [rtiThresholds]);"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: RTI thresholds now persist to localStorage")
    else:
        print("❌ EDIT2: Could not find rtiThresholds state")

    # ============================================================
    # EDIT 3: Add live badge to live-synced students
    # ============================================================
    target_3 = """                                            <td className="p-2 font-medium">{student.name}</td>"""
    replacement_3 = """                                            <td className="p-2 font-medium">
                                                {student.isLive && <span title="Live sync" style={{ fontSize: '10px', marginRight: '4px', verticalAlign: 'middle' }}>📡</span>}
                                                {student.name}
                                            </td>"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Added 📡 badge for live-synced students")
    else:
        print("❌ EDIT3: Could not find student name cell")

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
