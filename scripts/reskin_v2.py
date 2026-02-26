"""
reskin_v2.py — Clean re-application of independent learner dashboard reskin
and student-friendly report generator.

This script makes 7 targeted changes using EXACT string anchors.
NO broad regex replacements. Each change is atomic and reversible.
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

# The student-friendly report function (self-contained, inserted before return)
REPORT_FUNC = '''
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
'''

# Independent mode progress summary UI (replaces import section header for independent users)
INDIE_UI = '''                    {isIndependentMode && (
                        <div className="mb-6 space-y-4">
                            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-2xl border border-indigo-100">
                                <div className="text-center mb-4">
                                    <span className="text-4xl">\\u{1F31F}</span>
                                    <h3 className="text-lg font-bold text-slate-800 mt-2">Welcome to Your Learning Journey!</h3>
                                    <p className="text-sm text-slate-500 mt-1">Track your progress and celebrate your growth</p>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="bg-white rounded-xl p-3 text-center border border-indigo-100">
                                        <div className="text-2xl font-bold text-indigo-600">{globalLevel}</div>
                                        <div className="text-xs text-slate-500 font-semibold">Level</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 text-center border border-purple-100">
                                        <div className="text-2xl font-bold text-purple-600">{globalPoints}</div>
                                        <div className="text-xs text-slate-500 font-semibold">XP</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 text-center border border-pink-100">
                                        <div className="text-2xl font-bold text-pink-600">{history.length}</div>
                                        <div className="text-xs text-slate-500 font-semibold">Activities</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => generateStudentFriendlyReport({ history, wordSoundsHistory, phonemeMastery, wordSoundsBadges, gameCompletions, globalPoints, globalLevel })}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-200"
                                >
                                    <Download size={18} /> Download My Progress Report
                                </button>
                            </div>
                        </div>
                    )}
'''

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # === CHANGE 1: Add props to StudentAnalyticsPanel signature ===
    old_sig = "const StudentAnalyticsPanel = React.memo(({ isOpen, onClose, t, rosterKey, setRosterKey, latestProbeResult, setLatestProbeResult, rosterQueue, setRosterQueue, screenerSession, setScreenerSession, onLaunchORF, probeHistory, interventionLogs, addToast, probeGradeLevel, setProbeGradeLevel, probeActivity, setProbeActivity, probeForm, setProbeForm, isProbeMode, setIsProbeMode, probeTargetStudent, setProbeTargetStudent, saveProbeResult, setWsPreloadedWords, setWordSoundsActivity, setIsWordSoundsMode, setActiveView, setGeneratedContent, setIsFluencyMode, setFluencyStatus, setFluencyResult }) => {"
    new_sig = "const StudentAnalyticsPanel = React.memo(({ isOpen, onClose, t, rosterKey, setRosterKey, latestProbeResult, setLatestProbeResult, rosterQueue, setRosterQueue, screenerSession, setScreenerSession, onLaunchORF, probeHistory, interventionLogs, addToast, probeGradeLevel, setProbeGradeLevel, probeActivity, setProbeActivity, probeForm, setProbeForm, isProbeMode, setIsProbeMode, probeTargetStudent, setProbeTargetStudent, saveProbeResult, setWsPreloadedWords, setWordSoundsActivity, setIsWordSoundsMode, setActiveView, setGeneratedContent, setIsFluencyMode, setFluencyStatus, setFluencyResult, isIndependentMode = false, globalPoints = 0, globalLevel = 1, history = [], wordSoundsHistory = [], phonemeMastery = {}, wordSoundsBadges = {}, gameCompletions = [] }) => {"
    if old_sig in content:
        content = content.replace(old_sig, new_sig, 1)
        changes += 1
        print("1. Added isIndependentMode + session data props to signature")
    else:
        print("1. SKIP - signature not found (may already be modified)")

    # === CHANGE 2: Insert generateStudentFriendlyReport before return ===
    old_return = "    if (!isOpen) return null;\r\n    return ReactDOM.createPortal("
    new_return = REPORT_FUNC + "\r\n    if (!isOpen) return null;\r\n    return ReactDOM.createPortal("
    if old_return in content:
        content = content.replace(old_return, new_return, 1)
        changes += 1
        print("2. Added generateStudentFriendlyReport function")
    else:
        # Try without \r
        old_return2 = "    if (!isOpen) return null;\n    return ReactDOM.createPortal("
        new_return2 = REPORT_FUNC + "\n    if (!isOpen) return null;\n    return ReactDOM.createPortal("
        if old_return2 in content:
            content = content.replace(old_return2, new_return2, 1)
            changes += 1
            print("2. Added generateStudentFriendlyReport function (LF)")
        else:
            print("2. FAIL - return anchor not found")

    # === CHANGE 3: Adaptive header icon and title ===
    old_icon = '<div className="bg-indigo-100 p-2 rounded-xl">\r\n                            <Users size={24} className="text-indigo-600" />'
    new_icon = '<div className={isIndependentMode ? "bg-amber-100 p-2 rounded-xl" : "bg-indigo-100 p-2 rounded-xl"}>\r\n                            {isIndependentMode ? <BarChart3 size={24} className="text-amber-600" /> : <Users size={24} className="text-indigo-600" />}'
    if old_icon in content:
        content = content.replace(old_icon, new_icon, 1)
        changes += 1
        print("3. Made header icon adaptive")
    else:
        print("3. SKIP - icon anchor not found")

    old_title = "<h2 className=\"text-xl font-bold text-slate-800\">{t('class_analytics.title')}</h2>"
    new_title = "<h2 className=\"text-xl font-bold text-slate-800\">{isIndependentMode ? '\\u{1F4CA} My Learning Journey' : t('class_analytics.title')}</h2>"
    if old_title in content:
        content = content.replace(old_title, new_title, 1)
        changes += 1
        print("3b. Made title adaptive")
    else:
        print("3b. SKIP - title anchor not found")

    # === CHANGE 4: Gate search bar ===
    old_search = "                    {importedStudents.length > 0 && (\r\n                        <div className=\"mb-3\">\r\n                            <input\r\n                                type=\"text\"\r\n                                placeholder={t('class_analytics.search_placeholder')"
    new_search = "                    {!isIndependentMode && importedStudents.length > 0 && (\r\n                        <div className=\"mb-3\">\r\n                            <input\r\n                                type=\"text\"\r\n                                placeholder={t('class_analytics.search_placeholder')"
    if old_search in content:
        content = content.replace(old_search, new_search, 1)
        changes += 1
        print("4. Gated search bar")
    else:
        print("4. SKIP - search anchor not found")

    # === CHANGE 5: Add indie UI + gate import controls ===
    # Wrap the import section: add indie UI before, wrap import div in !isIndependentMode
    old_import = '                    {/* Import & Export Controls */}\r\n                    <div className="flex flex-wrap gap-3 mb-4">'
    gate_open = '                    {!isIndependentMode && (<div className="flex flex-wrap gap-3 mb-4">'
    new_import = '                    {/* Import & Export Controls */}\r\n' + INDIE_UI + gate_open
    if old_import in content:
        content = content.replace(old_import, new_import, 1)
        changes += 1
        print("5. Added indie UI + gated import section open")
    else:
        print("5. FAIL - import anchor not found")

    # === CHANGE 5b: Close the !isIndependentMode gate at the end of the import div ===
    # The import div closes somewhere around the processing spinner
    # Find: </div>\r\n                    {/* Class Summary Cards */}
    old_close = "                    </div>\r\n                    {/* Class Summary Cards */}"
    new_close = "                    </div>)}\r\n                    {/* Class Summary Cards */}"
    if old_close in content:
        content = content.replace(old_close, new_close, 1)
        changes += 1
        print("5b. Closed import section gate")
    else:
        print("5b. SKIP - close anchor not found")

    # === CHANGE 6: Pass props in the render mount ===
    old_mount = "              <StudentAnalyticsPanel\r\n\r\n              isOpen={showClassAnalytics}\r\n\r\n              onClose={handleCloseClassAnalytics}\r\n\r\n              t={t}"
    new_mount = "              <StudentAnalyticsPanel\r\n\r\n              isOpen={showClassAnalytics}\r\n\r\n              onClose={handleCloseClassAnalytics}\r\n\r\n              t={t}\r\n\r\n              isIndependentMode={isIndependentMode}\r\n\r\n              globalPoints={globalPoints}\r\n\r\n              globalLevel={globalLevel}\r\n\r\n              history={history}\r\n\r\n              wordSoundsHistory={wordSoundsHistory}\r\n\r\n              phonemeMastery={phonemeMastery}\r\n\r\n              wordSoundsBadges={wordSoundsBadges}\r\n\r\n              gameCompletions={gameCompletions}"
    if old_mount in content:
        content = content.replace(old_mount, new_mount, 1)
        changes += 1
        print("6. Passed isIndependentMode + session data in mount")
    else:
        print("6. FAIL - mount anchor not found")

    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes}/7 changes applied.")

if __name__ == "__main__":
    main()
