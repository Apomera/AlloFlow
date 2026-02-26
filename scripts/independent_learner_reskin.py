"""
independent_learner_reskin.py — Reskin the StudentAnalyticsPanel for independent learners
and add a student-friendly report generator.

Changes:
1. Add isIndependentMode prop to StudentAnalyticsPanel 
2. Swap header icon/title for independent mode
3. Hide class-management UI (search, import, export) in independent mode
4. Add self-progress summary section for independent mode
5. Create generateStudentFriendlyReport function
6. Pass isIndependentMode in the mount
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

STUDENT_FRIENDLY_REPORT = r"""
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
            if (score >= 90) return { emoji: '🌟', msg: 'Amazing work! You\'re a superstar!' };
            if (score >= 70) return { emoji: '💪', msg: 'Great progress! Keep it up!' };
            if (score >= 50) return { emoji: '🌱', msg: 'You\'re growing! Every practice session helps!' };
            return { emoji: '🚀', msg: 'Keep practicing — you\'re on your way!' };
        };

        const statCard = (icon, label, value, color) => `
            <div style="background: white; border-radius: 16px; padding: 20px; text-align: center; border: 2px solid ${color}20; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
                <div style="font-size: 28px; font-weight: 800; color: ${color};">${value}</div>
                <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${label}</div>
            </div>`;

        const badgeHtml = badgeCount > 0 ? `
            <div style="margin-top: 24px; padding: 20px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 16px; border: 2px solid #f59e0b40;">
                <h3 style="font-size: 18px; font-weight: 800; color: #92400e; margin: 0 0 12px 0;">🏅 My Badges (${badgeCount})</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${Object.entries(badges).map(([name, _]) => 
                        `<span style="background: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; color: #92400e; border: 1px solid #f59e0b60;">🎖️ ${name}</span>`
                    ).join('')}
                </div>
            </div>` : '';

        const strengthsHtml = masteredPhonemes.length > 0 ? `
            <div style="margin-top: 20px; padding: 20px; background: #f0fdf4; border-radius: 16px; border: 2px solid #86efac;">
                <h3 style="font-size: 18px; font-weight: 800; color: #166534; margin: 0 0 12px 0;">💪 My Strengths</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${masteredPhonemes.slice(0, 12).map(([phoneme, _]) => 
                        `<span style="background: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; color: #166534; border: 1px solid #86efac;">✅ ${phoneme}</span>`
                    ).join('')}
                </div>
            </div>` : '';

        const gamesHtml = gameCompletions.length > 0 ? `
            <div style="margin-top: 20px; padding: 20px; background: #eff6ff; border-radius: 16px; border: 2px solid #93c5fd;">
                <h3 style="font-size: 18px; font-weight: 800; color: #1e40af; margin: 0 0 12px 0;">🎮 Activities Completed</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${gameCompletions.slice(0, 10).map(g => 
                        `<span style="background: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; color: #1e40af; border: 1px solid #93c5fd;">🎯 ${g.activity || g.type || 'Activity'}</span>`
                    ).join('')}
                </div>
            </div>` : '';

        const quizEncouragement = avgQuizScore !== null ? getEncouragement(avgQuizScore) : { emoji: '📝', msg: 'Try a quiz to see your score!' };

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Learning Journey</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: linear-gradient(180deg, #dbeafe 0%, #ede9fe 50%, #fce7f3 100%); min-height: 100vh; padding: 32px; }
        @media print { body { background: white; padding: 16px; } }
    </style>
</head>
<body>
    <div style="max-width: 700px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px; margin-bottom: 8px;">🌟</div>
            <h1 style="font-size: 32px; font-weight: 800; color: #1e293b; margin-bottom: 4px;">My Learning Journey</h1>
            <p style="color: #64748b; font-size: 14px;">${date}</p>
        </div>

        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 20px; padding: 24px; text-align: center; margin-bottom: 24px; box-shadow: 0 8px 32px rgba(99,102,241,0.3);">
            <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; margin-bottom: 8px;">Level</div>
            <div style="font-size: 48px; font-weight: 800;">${level}</div>
            <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">${xp} XP earned ${quizEncouragement.emoji}</div>
            <div style="margin-top: 12px; font-size: 14px; opacity: 0.9;">${quizEncouragement.msg}</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
            ${statCard('📚', 'Activities', totalActivities, '#6366f1')}
            ${statCard('✅', 'Quiz Avg', avgQuizScore !== null ? avgQuizScore + '%' : '—', '#16a34a')}
            ${statCard('🔤', 'Word Accuracy', wsAccuracy !== null ? wsAccuracy + '%' : '—', '#0891b2')}
        </div>

        ${badgeHtml}
        ${strengthsHtml}
        ${gamesHtml}

        <div style="margin-top: 32px; text-align: center; color: #94a3b8; font-size: 12px;">
            Generated ${date} &bull; Created with AlloFlow &bull; Keep learning! 🚀
        </div>
    </div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my_learning_journey_${new Date().toISOString().split('T')[0]}.html`;
        a.click();
        URL.revokeObjectURL(url);
        if (addToast) addToast('📊 Your progress report has been downloaded!', 'success');
    };
"""

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # 1. Add isIndependentMode prop to StudentAnalyticsPanel signature
    old_sig = "const StudentAnalyticsPanel = React.memo(({ isOpen, onClose, t, rosterKey, setRosterKey, latestProbeResult, setLatestProbeResult, rosterQueue, setRosterQueue, screenerSession, setScreenerSession, onLaunchORF, probeHistory, interventionLogs, addToast, probeGradeLevel, setProbeGradeLevel, probeActivity, setProbeActivity, probeForm, setProbeForm, isProbeMode, setIsProbeMode, probeTargetStudent, setProbeTargetStudent, saveProbeResult, setWsPreloadedWords, setWordSoundsActivity, setIsWordSoundsMode, setActiveView, setGeneratedContent, setIsFluencyMode, setFluencyStatus, setFluencyResult }) => {"
    new_sig = "const StudentAnalyticsPanel = React.memo(({ isOpen, onClose, t, rosterKey, setRosterKey, latestProbeResult, setLatestProbeResult, rosterQueue, setRosterQueue, screenerSession, setScreenerSession, onLaunchORF, probeHistory, interventionLogs, addToast, probeGradeLevel, setProbeGradeLevel, probeActivity, setProbeActivity, probeForm, setProbeForm, isProbeMode, setIsProbeMode, probeTargetStudent, setProbeTargetStudent, saveProbeResult, setWsPreloadedWords, setWordSoundsActivity, setIsWordSoundsMode, setActiveView, setGeneratedContent, setIsFluencyMode, setFluencyStatus, setFluencyResult, isIndependentMode = false, globalPoints = 0, globalLevel = 1, history = [], wordSoundsHistory = [], phonemeMastery = {}, wordSoundsBadges = {}, gameCompletions = [] }) => {"
    if old_sig in content:
        content = content.replace(old_sig, new_sig, 1)
        changes += 1
        print("✅ 1. Added isIndependentMode + session data props to StudentAnalyticsPanel")
    else:
        print("❌ 1. Could not find signature anchor")
        return

    # 2. Add generateStudentFriendlyReport function after the state declarations (before return)
    old_return = "    if (!isOpen) return null;\n    return ReactDOM.createPortal("
    new_return = STUDENT_FRIENDLY_REPORT + "\n    if (!isOpen) return null;\n    return ReactDOM.createPortal("
    if old_return in content:
        content = content.replace(old_return, new_return, 1)
        changes += 1
        print("✅ 2. Added generateStudentFriendlyReport function")
    else:
        print("❌ 2. Could not find return anchor")
        return

    # 3. Make header icon and title adaptive for independent mode
    old_header = """<div className="bg-indigo-100 p-2 rounded-xl">
                            <Users size={24} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{t('class_analytics.title')}</h2>"""
    new_header = """<div className={isIndependentMode ? "bg-amber-100 p-2 rounded-xl" : "bg-indigo-100 p-2 rounded-xl"}>
                            {isIndependentMode ? <BarChart3 size={24} className="text-amber-600" /> : <Users size={24} className="text-indigo-600" />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{isIndependentMode ? '📊 My Learning Journey' : t('class_analytics.title')}</h2>"""
    if old_header in content:
        content = content.replace(old_header, new_header, 1)
        changes += 1
        print("✅ 3. Made header icon/title adaptive for independent mode")
    else:
        print("❌ 3. Could not find header anchor")
        return

    # 4. Gate search bar behind !isIndependentMode
    old_search = """{importedStudents.length > 0 && (
                        <div className="mb-3">
                            <input
                                type="text"
                                placeholder={t('class_analytics.search_placeholder') || 'Search students...'}"""
    new_search = """{!isIndependentMode && importedStudents.length > 0 && (
                        <div className="mb-3">
                            <input
                                type="text"
                                placeholder={t('class_analytics.search_placeholder') || 'Search students...'}"""
    if old_search in content:
        content = content.replace(old_search, new_search, 1)
        changes += 1
        print("✅ 4. Gated search bar behind !isIndependentMode")
    else:
        print("❌ 4. Could not find search anchor (non-critical)")

    # 5. Gate import/export controls behind !isIndependentMode
    old_import = """                    {/* Import & Export Controls */}
                    <div className="flex flex-wrap gap-3 mb-4">"""
    new_import = """                    {/* Import & Export Controls */}
                    {isIndependentMode && (
                        <div className="mb-6 space-y-4">
                            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-2xl border border-indigo-100">
                                <div className="text-center mb-4">
                                    <span className="text-4xl">🌟</span>
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
                    {!isIndependentMode && <div className="flex flex-wrap gap-3 mb-4">"""
    if old_import in content:
        content = content.replace(old_import, new_import, 1)
        changes += 1
        print("✅ 5. Added independent mode progress summary + gated import/export")
    else:
        print("❌ 5. Could not find import anchor")
        return

    # 6. Close the !isIndependentMode gate for the import/export section
    # Find the end of the import/export div section by looking for the next major section
    old_import_end = """                        </label>
                        {importedStudents.length > 0 && ("""
    new_import_end = """                        </label>}
                        {!isIndependentMode && importedStudents.length > 0 && ("""
    if old_import_end in content:
        content = content.replace(old_import_end, new_import_end, 1)
        changes += 1
        print("✅ 6. Closed independent mode gate on import section")
    else:
        print("❌ 6. Could not find import end anchor (non-critical)")

    # 7. Pass isIndependentMode in the render mount
    old_mount = """<StudentAnalyticsPanel

              isOpen={showClassAnalytics}

              onClose={handleCloseClassAnalytics}

              t={t}"""
    new_mount = """<StudentAnalyticsPanel

              isOpen={showClassAnalytics}

              onClose={handleCloseClassAnalytics}

              t={t}

              isIndependentMode={isIndependentMode}

              globalPoints={globalPoints}

              globalLevel={globalLevel}

              history={history}

              wordSoundsHistory={wordSoundsHistory}

              phonemeMastery={phonemeMastery}

              wordSoundsBadges={wordSoundsBadges}

              gameCompletions={gameCompletions}"""
    if old_mount in content:
        content = content.replace(old_mount, new_mount, 1)
        changes += 1
        print("✅ 7. Passed isIndependentMode + session data props in render mount")
    else:
        print("❌ 7. Could not find mount anchor")
        return

    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Done! {changes} changes applied.")

if __name__ == "__main__":
    main()
