"""
reskin_final.py — Final, definitive re-application.
File is 100% CRLF. All anchors use \r\n. No line ending conversion.
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    raw = SRC.read_bytes()
    print(f"File: {len(raw)} bytes, {raw.count(b'\\n')} lines")
    c = raw.decode('utf-8')
    changes = 0

    # === 1. Add props to StudentAnalyticsPanel signature ===
    old_sig = b"const StudentAnalyticsPanel = React.memo(({ isOpen, onClose, t, rosterKey, setRosterKey, latestProbeResult, setLatestProbeResult, rosterQueue, setRosterQueue, screenerSession, setScreenerSession, onLaunchORF, probeHistory, interventionLogs, addToast, probeGradeLevel, setProbeGradeLevel, probeActivity, setProbeActivity, probeForm, setProbeForm, isProbeMode, setIsProbeMode, probeTargetStudent, setProbeTargetStudent, saveProbeResult, setWsPreloadedWords, setWordSoundsActivity, setIsWordSoundsMode, setActiveView, setGeneratedContent, setIsFluencyMode, setFluencyStatus, setFluencyResult }) => {"
    new_sig = b"const StudentAnalyticsPanel = React.memo(({ isOpen, onClose, t, rosterKey, setRosterKey, latestProbeResult, setLatestProbeResult, rosterQueue, setRosterQueue, screenerSession, setScreenerSession, onLaunchORF, probeHistory, interventionLogs, addToast, probeGradeLevel, setProbeGradeLevel, probeActivity, setProbeActivity, probeForm, setProbeForm, isProbeMode, setIsProbeMode, probeTargetStudent, setProbeTargetStudent, saveProbeResult, setWsPreloadedWords, setWordSoundsActivity, setIsWordSoundsMode, setActiveView, setGeneratedContent, setIsFluencyMode, setFluencyStatus, setFluencyResult, isIndependentMode = false, globalPoints = 0, globalLevel = 1, history = [], wordSoundsHistory = [], phonemeMastery = {}, wordSoundsBadges = {}, gameCompletions = [] }) => {"
    if old_sig in raw:
        raw = raw.replace(old_sig, new_sig, 1)
        changes += 1
        print("1. Added props to signature")
    else:
        print("1. FAIL - signature not found")

    # === 2. Insert report function before return ===
    report_func = b"""
    const generateStudentFriendlyReport = (sessionData) => {
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const totalActivities = (sessionData?.history || []).length;
        const quizzes = (sessionData?.history || []).filter(h => h.type === 'quiz');
        const avgQuizScore = quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length) : null;
        const wsHistory = sessionData?.wordSoundsHistory || [];
        const wsCorrect = wsHistory.filter(h => h.correct).length;
        const wsAccuracy = wsHistory.length > 0 ? Math.round((wsCorrect / wsHistory.length) * 100) : null;
        const xp = sessionData?.globalPoints || 0;
        const level = sessionData?.globalLevel || 1;
        const badges = sessionData?.wordSoundsBadges || {};
        const badgeCount = Object.keys(badges).length;
        const masteredPhonemes = Object.entries(sessionData?.phonemeMastery || {}).filter(([_, v]) => v.accuracy >= 80);
        const gameCompletions = sessionData?.gameCompletions || [];
        const getEncouragement = (score) => {
            if (score >= 90) return { emoji: '\\u{1F31F}', msg: 'Amazing work! You are a superstar!' };
            if (score >= 70) return { emoji: '\\u{1F4AA}', msg: 'Great progress! Keep it up!' };
            if (score >= 50) return { emoji: '\\u{1F331}', msg: 'You are growing! Every practice session helps!' };
            return { emoji: '\\u{1F680}', msg: 'Keep practicing \\u2014 you are on your way!' };
        };
        const statCard = (icon, label, value, color) => '<div style="background:white;border-radius:16px;padding:20px;text-align:center;border:2px solid ' + color + '20;box-shadow:0 2px 8px rgba(0,0,0,0.04)"><div style="font-size:32px;margin-bottom:8px">' + icon + '</div><div style="font-size:28px;font-weight:800;color:' + color + '">' + value + '</div><div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">' + label + '</div></div>';
        const quizEnc = avgQuizScore !== null ? getEncouragement(avgQuizScore) : { emoji: '\\u{1F4DD}', msg: 'Try a quiz to see your score!' };
        const badgeHtml = badgeCount > 0 ? '<div style="margin-top:24px;padding:20px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:16px;border:2px solid #f59e0b40"><h3 style="font-size:18px;font-weight:800;color:#92400e;margin:0 0 12px">\\u{1F3C5} My Badges (' + badgeCount + ')</h3><div style="display:flex;flex-wrap:wrap;gap:8px">' + Object.entries(badges).map(([name]) => '<span style="background:white;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;color:#92400e;border:1px solid #f59e0b60">\\u{1F396}\\u{FE0F} ' + name + '</span>').join('') + '</div></div>' : '';
        const strengthsHtml = masteredPhonemes.length > 0 ? '<div style="margin-top:20px;padding:20px;background:#f0fdf4;border-radius:16px;border:2px solid #86efac"><h3 style="font-size:18px;font-weight:800;color:#166534;margin:0 0 12px">\\u{1F4AA} My Strengths</h3><div style="display:flex;flex-wrap:wrap;gap:8px">' + masteredPhonemes.slice(0, 12).map(([phoneme]) => '<span style="background:white;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;color:#166534;border:1px solid #86efac">\\u2705 ' + phoneme + '</span>').join('') + '</div></div>' : '';
        const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>My Learning Journey</title><style>@import url(https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap);*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,sans-serif;background:linear-gradient(180deg,#dbeafe 0%,#ede9fe 50%,#fce7f3 100%);min-height:100vh;padding:32px}@media print{body{background:white;padding:16px}}</style></head><body><div style="max-width:700px;margin:0 auto"><div style="text-align:center;margin-bottom:32px"><div style="font-size:48px;margin-bottom:8px">\\u{1F31F}</div><h1 style="font-size:32px;font-weight:800;color:#1e293b;margin-bottom:4px">My Learning Journey</h1><p style="color:#64748b;font-size:14px">' + date + '</p></div><div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:20px;padding:24px;text-align:center;margin-bottom:24px;box-shadow:0 8px 32px rgba(99,102,241,0.3)"><div style="font-size:14px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.8;margin-bottom:8px">Level</div><div style="font-size:48px;font-weight:800">' + level + '</div><div style="font-size:16px;font-weight:600;margin-top:4px">' + xp + ' XP earned ' + quizEnc.emoji + '</div><div style="margin-top:12px;font-size:14px;opacity:0.9">' + quizEnc.msg + '</div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">' + statCard('\\u{1F4DA}', 'Activities', totalActivities, '#6366f1') + statCard('\\u2705', 'Quiz Avg', avgQuizScore !== null ? avgQuizScore + '%' : '\\u2014', '#16a34a') + statCard('\\u{1F524}', 'Word Accuracy', wsAccuracy !== null ? wsAccuracy + '%' : '\\u2014', '#0891b2') + '</div>' + badgeHtml + strengthsHtml + '<div style="margin-top:32px;text-align:center;color:#94a3b8;font-size:12px">Generated ' + date + ' \\u2022 Created with AlloFlow \\u2022 Keep learning! \\u{1F680}</div></div></body></html>';
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my_learning_journey_' + new Date().toISOString().split('T')[0] + '.html';
        a.click();
        URL.revokeObjectURL(url);
        if (addToast) addToast('\\u{1F4CA} Your progress report has been downloaded!', 'success');
    };
""".replace(b'\n', b'\r\n')

    old_return = b"    if (!isOpen) return null;\r\n    return ReactDOM.createPortal("
    if old_return in raw:
        raw = raw.replace(old_return, report_func + b"\r\n    if (!isOpen) return null;\r\n    return ReactDOM.createPortal(", 1)
        changes += 1
        print("2. Added report function")
    else:
        print("2. FAIL")

    # === 3. Adaptive header icon ===
    old_icon = b'<div className="bg-indigo-100 p-2 rounded-xl">\r\n                            <Users size={24} className="text-indigo-600" />'
    new_icon = b'<div className={isIndependentMode ? "bg-amber-100 p-2 rounded-xl" : "bg-indigo-100 p-2 rounded-xl"}>\r\n                            {isIndependentMode ? <BarChart3 size={24} className="text-amber-600" /> : <Users size={24} className="text-indigo-600" />}'
    if old_icon in raw:
        raw = raw.replace(old_icon, new_icon, 1)
        changes += 1
        print("3. Adaptive icon")
    else:
        print("3. FAIL")

    # === 3b. Adaptive title ===
    old_title = b"""<h2 className="text-xl font-bold text-slate-800">{t('class_analytics.title')}</h2>"""
    new_title = b"""<h2 className="text-xl font-bold text-slate-800">{isIndependentMode ? '\\u{1F4CA} My Learning Journey' : t('class_analytics.title')}</h2>"""
    if old_title in raw:
        raw = raw.replace(old_title, new_title, 1)
        changes += 1
        print("3b. Adaptive title")
    else:
        print("3b. FAIL")

    # === 4. Gate search bar ===
    old_search = b"""{importedStudents.length > 0 && (\r\n                        <div className="mb-3">\r\n                            <input\r\n                                type="text"\r\n                                placeholder={t('class_analytics.search_placeholder')"""
    new_search = b"""{!isIndependentMode && importedStudents.length > 0 && (\r\n                        <div className="mb-3">\r\n                            <input\r\n                                type="text"\r\n                                placeholder={t('class_analytics.search_placeholder')"""
    if old_search in raw:
        raw = raw.replace(old_search, new_search, 1)
        changes += 1
        print("4. Gated search")
    else:
        print("4. FAIL")

    # === 5. Add indie UI + gate import ===
    indie_ui = b"""                    {isIndependentMode && (\r
                        <div className="mb-6 space-y-4">\r
                            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-2xl border border-indigo-100">\r
                                <div className="text-center mb-4">\r
                                    <span className="text-4xl">&#x1F31F;</span>\r
                                    <h3 className="text-lg font-bold text-slate-800 mt-2">Welcome to Your Learning Journey!</h3>\r
                                    <p className="text-sm text-slate-500 mt-1">Track your progress and celebrate your growth</p>\r
                                </div>\r
                                <div className="grid grid-cols-3 gap-3 mb-4">\r
                                    <div className="bg-white rounded-xl p-3 text-center border border-indigo-100">\r
                                        <div className="text-2xl font-bold text-indigo-600">{globalLevel}</div>\r
                                        <div className="text-xs text-slate-500 font-semibold">Level</div>\r
                                    </div>\r
                                    <div className="bg-white rounded-xl p-3 text-center border border-purple-100">\r
                                        <div className="text-2xl font-bold text-purple-600">{globalPoints}</div>\r
                                        <div className="text-xs text-slate-500 font-semibold">XP</div>\r
                                    </div>\r
                                    <div className="bg-white rounded-xl p-3 text-center border border-pink-100">\r
                                        <div className="text-2xl font-bold text-pink-600">{history.length}</div>\r
                                        <div className="text-xs text-slate-500 font-semibold">Activities</div>\r
                                    </div>\r
                                </div>\r
                                <button\r
                                    onClick={() => generateStudentFriendlyReport({ history, wordSoundsHistory, phonemeMastery, wordSoundsBadges, gameCompletions, globalPoints, globalLevel })}\r
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-200"\r
                                >\r
                                    <Download size={18} /> Download My Progress Report\r
                                </button>\r
                            </div>\r
                        </div>\r
                    )}\r
""".replace(b'\r\n', b'\r\n').replace(b'\r\r\n', b'\r\n')
    # Normalize the indie_ui to proper CRLF
    indie_ui = indie_ui.replace(b'\n', b'').replace(b'\r', b'\r\n')

    old_import = b'                    {/* Import & Export Controls */}\r\n                    <div className="flex flex-wrap gap-3 mb-4">'
    new_import = b'                    {/* Import & Export Controls */}\r\n' + indie_ui + b'                    {!isIndependentMode && (<div className="flex flex-wrap gap-3 mb-4">'
    if old_import in raw:
        raw = raw.replace(old_import, new_import, 1)
        changes += 1
        print("5. Added indie UI + gated import")
    else:
        print("5. FAIL")

    # === 5b. Close gate ===
    old_close = b'                    </div>\r\n                    {/* Class Summary Cards */}'
    new_close = b'                    </div>)}\r\n                    {/* Class Summary Cards */}'
    if old_close in raw:
        raw = raw.replace(old_close, new_close, 1)
        changes += 1
        print("5b. Closed gate")
    else:
        print("5b. FAIL")

    # === 6. Mount props ===
    # Find t={t} in the mount area and insert after it
    mount_anchor = b'<StudentAnalyticsPanel'
    idx = raw.find(mount_anchor)
    if idx >= 0:
        t_anchor = b't={t}'
        t_idx = raw.find(t_anchor, idx)
        if t_idx >= 0 and b'isIndependentMode' not in raw[t_idx:t_idx+500]:
            end_t = t_idx + len(t_anchor)
            # Determine spacing from the file
            new_props = (
                b'\r\n\r\n              isIndependentMode={isIndependentMode}'
                b'\r\n\r\n              globalPoints={globalPoints}'
                b'\r\n\r\n              globalLevel={globalLevel}'
                b'\r\n\r\n              history={history}'
                b'\r\n\r\n              wordSoundsHistory={wordSoundsHistory}'
                b'\r\n\r\n              phonemeMastery={phonemeMastery}'
                b'\r\n\r\n              wordSoundsBadges={wordSoundsBadges}'
                b'\r\n\r\n              gameCompletions={gameCompletions}'
            )
            raw = raw[:end_t] + new_props + raw[end_t:]
            changes += 1
            print("6. Mount props added")
        else:
            print("6. SKIP - already present or t={t} not found")
    else:
        print("6. FAIL - mount not found")

    SRC.write_bytes(raw)
    
    # Final verification
    final = SRC.read_bytes()
    final_lines = final.count(b'\n')
    crlf = final.count(b'\r\n')
    print(f"\nDone! {changes}/8 changes. File: {len(final)} bytes, {final_lines} lines, {crlf} CRLF")
    
    # Verify key markers
    markers = [
        (b'isIndependentMode = false', 'Prop in sig'),
        (b'generateStudentFriendlyReport', 'Report fn'),
        (b'isIndependentMode ?', 'Adaptive UI'),
        (b'!isIndependentMode &&', 'Gates'),
        (b'isIndependentMode={isIndependentMode}', 'Mount prop'),
        (b'Download My Progress Report', 'Indie button'),
    ]
    for pattern, label in markers:
        ct = final.count(pattern)
        print(f"  {'OK' if ct > 0 else 'MISSING'} ({ct}): {label}")

if __name__ == "__main__":
    main()
