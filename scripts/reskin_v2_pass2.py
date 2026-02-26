"""reskin_v2_pass2.py — Apply remaining changes using LF line endings."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

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
    # Normalize to LF for matching
    c = content.replace('\r\n', '\n')
    changes = 0

    # 3. Icon
    old_icon = '<div className="bg-indigo-100 p-2 rounded-xl">\n                            <Users size={24} className="text-indigo-600" />'
    new_icon = '<div className={isIndependentMode ? "bg-amber-100 p-2 rounded-xl" : "bg-indigo-100 p-2 rounded-xl"}>\n                            {isIndependentMode ? <BarChart3 size={24} className="text-amber-600" /> : <Users size={24} className="text-indigo-600" />}'
    if old_icon in c:
        c = c.replace(old_icon, new_icon, 1)
        changes += 1
        print("3. Made header icon adaptive")
    else:
        print("3. SKIP")

    # 4. Search bar gate
    old_search = '{importedStudents.length > 0 && (\n                        <div className="mb-3">\n                            <input\n                                type="text"\n                                placeholder={t(\'class_analytics.search_placeholder\')'
    new_search = '{!isIndependentMode && importedStudents.length > 0 && (\n                        <div className="mb-3">\n                            <input\n                                type="text"\n                                placeholder={t(\'class_analytics.search_placeholder\')'
    if old_search in c:
        c = c.replace(old_search, new_search, 1)
        changes += 1
        print("4. Gated search bar")
    else:
        print("4. SKIP")

    # 5. Import section
    old_import = '{/* Import & Export Controls */}\n                    <div className="flex flex-wrap gap-3 mb-4">'
    gate_open = '{!isIndependentMode && (<div className="flex flex-wrap gap-3 mb-4">'
    new_import = '{/* Import & Export Controls */}\n' + INDIE_UI + '                    ' + gate_open
    if old_import in c:
        c = c.replace(old_import, new_import, 1)
        changes += 1
        print("5. Added indie UI + gated import")
    else:
        print("5. SKIP")

    # 5b. Close gate
    old_close = '                    </div>\n                    {/* Class Summary Cards */}'
    new_close = '                    </div>)}\n                    {/* Class Summary Cards */}'
    if old_close in c:
        c = c.replace(old_close, new_close, 1)
        changes += 1
        print("5b. Closed gate")
    else:
        print("5b. SKIP")

    # 6. Mount props
    old_mount = '              <StudentAnalyticsPanel\n\n              isOpen={showClassAnalytics}\n\n              onClose={handleCloseClassAnalytics}\n\n              t={t}'
    new_mount = old_mount + '\n\n              isIndependentMode={isIndependentMode}\n\n              globalPoints={globalPoints}\n\n              globalLevel={globalLevel}\n\n              history={history}\n\n              wordSoundsHistory={wordSoundsHistory}\n\n              phonemeMastery={phonemeMastery}\n\n              wordSoundsBadges={wordSoundsBadges}\n\n              gameCompletions={gameCompletions}'
    if old_mount in c:
        c = c.replace(old_mount, new_mount, 1)
        changes += 1
        print("6. Passed props in mount")
    else:
        print("6. SKIP")

    # Restore original line endings (CRLF)
    # The file originally had \r\n, so convert back
    c = c.replace('\n', '\r\n')
    SRC.write_text(c, encoding='utf-8')
    print(f"\nDone! {changes} additional changes applied.")

if __name__ == "__main__":
    main()
