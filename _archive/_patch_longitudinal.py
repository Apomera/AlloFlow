"""
Patch: Longitudinal Data Tracking via Roster JSON
All changes are targeted line replacements/insertions in AlloFlowANTI.txt
"""
import sys

def main():
    with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    original_count = len(lines)
    print(f"Original line count: {original_count}")
    nl = "\r\n"
    
    # ============================================================
    # PATCH 1: Add rosterKey/setRosterKey props to StudentAnalyticsPanel
    # Target L12244: const StudentAnalyticsPanel = React.memo(({ isOpen, onClose, t }) => {
    # ============================================================
    idx = 12243  # 0-indexed for L12244
    old = lines[idx].rstrip()
    assert 'StudentAnalyticsPanel' in old and 'isOpen, onClose, t' in old, f"PATCH 1 failed: unexpected content at L12244: {old}"
    lines[idx] = "const StudentAnalyticsPanel = React.memo(({ isOpen, onClose, t, rosterKey, setRosterKey }) => {" + nl
    print("PATCH 1: Added rosterKey/setRosterKey props to StudentAnalyticsPanel ✓")

    # ============================================================
    # PATCH 2: Auto-append snapshots in handleFileImport
    # Insert after L12365 (setIsProcessing(false);)
    # ============================================================
    # Find the line "setIsProcessing(false);" in the import function
    target_idx = None
    for i in range(12350, 12380):
        if 'setIsProcessing(false)' in lines[i]:
            target_idx = i
            break
    assert target_idx is not None, "PATCH 2 failed: could not find setIsProcessing(false)"
    
    # Insert snapshot append logic + toast BEFORE setIsProcessing(false)
    snapshot_code = [
        "        // === LONGITUDINAL: Append snapshots to roster ===" + nl,
        "        if (rosterKey && rosterKey.students && Object.keys(rosterKey.students).length > 0) {" + nl,
        "            let appendedCount = 0;" + nl,
        "            setRosterKey(function(prev) {" + nl,
        "                var history = Object.assign({}, prev.progressHistory || {});" + nl,
        "                allNewStudents.forEach(function(student) {" + nl,
        "                    var codename = student.name;" + nl,
        "                    if (prev.students && prev.students[codename] !== undefined) {" + nl,
        "                        var snapshot = {" + nl,
        "                            date: new Date().toISOString().split('T')[0]," + nl,
        "                            quizAvg: student.stats.quizAvg || 0," + nl,
        "                            wsAccuracy: student.stats.wsAccuracy || 0," + nl,
        "                            wsBestStreak: student.stats.wsBestStreak || 0," + nl,
        "                            fluencyWCPM: student.stats.fluencyWCPM || 0," + nl,
        "                            adventureXP: student.stats.adventureXP || 0," + nl,
        "                            gamesPlayed: student.stats.gamesPlayed || 0," + nl,
        "                            totalActivities: student.stats.totalActivities || 0," + nl,
        "                            importedFrom: student.filename" + nl,
        "                        };" + nl,
        "                        var existing = history[codename] || [];" + nl,
        "                        var filtered = existing.filter(function(s) { return s.date !== snapshot.date; });" + nl,
        "                        filtered.push(snapshot);" + nl,
        "                        filtered.sort(function(a, b) { return a.date.localeCompare(b.date); });" + nl,
        "                        history[codename] = filtered;" + nl,
        "                        appendedCount++;" + nl,
        "                    }" + nl,
        "                });" + nl,
        "                return Object.assign({}, prev, { progressHistory: history });" + nl,
        "            });" + nl,
        "            if (appendedCount > 0 && alloBotRef.current) {" + nl,
        '                alloBotRef.current.speak("Progress snapshots saved for " + appendedCount + " student" + (appendedCount > 1 ? "s" : "") + " in your roster.");' + nl,
        "            }" + nl,
        "        } else if (!rosterKey || !rosterKey.students || Object.keys(rosterKey.students).length === 0) {" + nl,
        "            // Nudge: suggest creating a roster" + nl,
        '            if (alloBotRef.current) { alloBotRef.current.speak("Tip: Create a Class Roster to track student progress over time."); }' + nl,
        "        }" + nl,
    ]
    
    for j, line in enumerate(reversed(snapshot_code)):
        lines.insert(target_idx, line)
    
    print(f"PATCH 2: Inserted {len(snapshot_code)} lines of snapshot append logic ✓")

    # ============================================================
    # PATCH 3: Add longitudinal sparklines to the student detail view
    # Insert after the existing sparklines section
    # Find "                                        )}" after the game scores sparkline
    # Target: after L13730 "{/* Reasoning */}" section marker
    # After insert from PATCH 2, line numbers shifted by len(snapshot_code)
    # ============================================================
    shift = len(snapshot_code)
    
    # Find the line with "{/* Reasoning */}" which comes right after sparklines
    reasoning_idx = None
    for i in range(13725 + shift, 13760 + shift):
        if '{/* Reasoning */' in lines[i]:
            reasoning_idx = i
            break
    assert reasoning_idx is not None, f"PATCH 3 failed: could not find Reasoning marker"
    
    longitudinal_section = [
        "                                        {/* === LONGITUDINAL PROGRESS (from roster) === */}" + nl,
        "                                        {(() => {" + nl,
        "                                            var codename = selectedStudent.name;" + nl,
        "                                            var longData = rosterKey && rosterKey.progressHistory && rosterKey.progressHistory[codename];" + nl,
        "                                            if (!longData || longData.length < 2) return null;" + nl,
        "                                            var quizTrend = longData.map(function(s) { return s.quizAvg; }).filter(function(v) { return v > 0; });" + nl,
        "                                            var wsTrend = longData.map(function(s) { return s.wsAccuracy; }).filter(function(v) { return v > 0; });" + nl,
        "                                            var fluencyTrend = longData.map(function(s) { return s.fluencyWCPM; }).filter(function(v) { return v > 0; });" + nl,
        "                                            var hasAny = quizTrend.length >= 2 || wsTrend.length >= 2 || fluencyTrend.length >= 2;" + nl,
        "                                            if (!hasAny) return null;" + nl,
        '                                            return React.createElement("div", { className: "mb-4 p-3 rounded-xl border-2 border-purple-200", style: { background: "linear-gradient(135deg, #faf5ff 0%, white 100%)" } },' + nl,
        '                                                React.createElement("div", { style: { fontSize: "11px", fontWeight: 800, color: "#7c3aed", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" } },' + nl,
        '                                                    "📈 Longitudinal Progress (" + longData.length + " sessions)"' + nl,
        "                                                )," + nl,
        '                                                React.createElement("div", { className: "grid grid-cols-3 gap-2" },' + nl,
        '                                                    quizTrend.length >= 2 ? React.createElement("div", { className: "bg-white rounded-lg p-2 border border-purple-100" },' + nl,
        '                                                        React.createElement("div", { style: { fontSize: "10px", fontWeight: 700, color: "#64748b", marginBottom: "4px" } }, "📝 Quiz Avg"),' + nl,
        '                                                        renderSparkline(quizTrend, "#8b5cf6")' + nl,
        "                                                    ) : null," + nl,
        '                                                    wsTrend.length >= 2 ? React.createElement("div", { className: "bg-white rounded-lg p-2 border border-purple-100" },' + nl,
        '                                                        React.createElement("div", { style: { fontSize: "10px", fontWeight: 700, color: "#64748b", marginBottom: "4px" } }, "🔊 WS Accuracy"),' + nl,
        '                                                        renderSparkline(wsTrend, "#6366f1")' + nl,
        "                                                    ) : null," + nl,
        '                                                    fluencyTrend.length >= 2 ? React.createElement("div", { className: "bg-white rounded-lg p-2 border border-purple-100" },' + nl,
        '                                                        React.createElement("div", { style: { fontSize: "10px", fontWeight: 700, color: "#64748b", marginBottom: "4px" } }, "📖 Fluency WCPM"),' + nl,
        '                                                        renderSparkline(fluencyTrend, "#0ea5e9",' + nl,
        "                                                            rtiGoals[codename] ? { baseline: rtiGoals[codename].baseline, target: rtiGoals[codename].target } : null" + nl,
        "                                                        )" + nl,
        "                                                    ) : null" + nl,
        "                                                )," + nl,
        '                                                React.createElement("div", { style: { fontSize: "9px", color: "#94a3b8", marginTop: "6px", textAlign: "right" } },' + nl,
        '                                                    "First: " + longData[0].date + " → Latest: " + longData[longData.length - 1].date' + nl,
        "                                                )" + nl,
        "                                            );" + nl,
        "                                        })()}" + nl,
    ]
    
    for j, line in enumerate(longitudinal_section):
        lines.insert(reasoning_idx + j, line)
    
    print(f"PATCH 3: Inserted {len(longitudinal_section)} lines of longitudinal sparklines ✓")

    # ============================================================
    # PATCH 4: Pass rosterKey/setRosterKey to StudentAnalyticsPanel at render site
    # Original L76014-76018, shifted by both patches
    # ============================================================
    total_shift = len(snapshot_code) + len(longitudinal_section)
    
    # Find the render site
    render_idx = None
    for i in range(76010 + total_shift - 5, 76025 + total_shift + 5):
        if i < len(lines) and '<StudentAnalyticsPanel' in lines[i]:
            render_idx = i
            break
    assert render_idx is not None, f"PATCH 4 failed: could not find <StudentAnalyticsPanel render site"
    
    # Find the closing /> for this component (should be a few lines later)
    close_idx = None
    for i in range(render_idx, render_idx + 10):
        if '/>' in lines[i]:
            close_idx = i
            break
    assert close_idx is not None, f"PATCH 4 failed: could not find closing /> for StudentAnalyticsPanel"
    
    # Replace the component render
    old_render = [lines[j] for j in range(render_idx, close_idx + 1)]
    print(f"  Old render ({render_idx+1}-{close_idx+1}):")
    for l in old_render:
        print(f"    {l.rstrip()[:100]}")
    
    new_render = [
        "          <StudentAnalyticsPanel " + nl,
        "              isOpen={showClassAnalytics} " + nl,
        "              onClose={handleCloseClassAnalytics} " + nl,
        "              t={t} " + nl,
        "              rosterKey={rosterKey}" + nl,
        "              setRosterKey={setRosterKey}" + nl,
        "          />" + nl,
    ]
    
    lines[render_idx:close_idx + 1] = new_render
    print(f"PATCH 4: Updated StudentAnalyticsPanel render with roster props ✓")

    # ============================================================
    # Write output
    # ============================================================
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    final_count = len(lines)
    print(f"\nFinal line count: {final_count} (added {final_count - original_count} lines)")
    print("All patches applied successfully!")
    
    # Quick verification
    with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    checks = [
        ('rosterKey, setRosterKey', 'Component props'),
        ('progressHistory', 'Snapshot append'),
        ('Longitudinal Progress', 'Sparkline section'),
        ('rosterKey={rosterKey}', 'Render props'),
    ]
    print("\n=== Verification ===")
    for pattern, label in checks:
        found = pattern in content
        print(f"  {label}: {'✓' if found else '✗'} ({pattern})")

if __name__ == '__main__':
    main()
