"""
Label Challenge Feature — Part 2: Toolbar + Comparison UI + Call Site
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)
fixed = 0

# ============================================================
# FIX 5: Add challenge toolbar buttons after the Clear drawings button
# ============================================================
for i in range(len(lines)):
    if "🗑️ Clear</button>" in lines[i] and i < 2100 and "Clear drawings" in lines[i]:
        print(f"  Found Clear drawings button at L{i+1}")
        # Insert challenge toolbar section after this line, before </div> closing
        challenge_toolbar = [
            '                {/* === Label Challenge Section === */}\r',
            '                <div style={{ width: "1px", height: "20px", background: "#e2e8f0" }} />\r',
            '                {isTeacherMode && !isStudentChallenge && (\r',
            '                    <button\r',
            '                        onClick={handleToggleChallenge}\r',
            '                        title={challengeMode ? "Deactivate Label Challenge" : "Set Label Challenge — students will label this diagram"}\r',
            '                        style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: challengeMode ? "1px solid #16a34a" : "1px solid #86efac", background: challengeMode ? "#16a34a" : "#f0fdf4", color: challengeMode ? "white" : "#15803d", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}\r',
            '                    >\r',
            '                        {challengeMode ? "🏆 Challenge Active ✓" : "🏆 Set Label Challenge"}\r',
            '                    </button>\r',
            '                )}\r',
            '                {isStudentChallenge && !challengeSubmitted && (\r',
            '                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>\r',
            '                        <button\r',
            '                            onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : -1)}\r',
            '                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: addingLabelPanel !== null ? "1px solid #4f46e5" : "1px solid #cbd5e1", background: addingLabelPanel !== null ? "#4f46e5" : "white", color: addingLabelPanel !== null ? "white" : "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}\r',
            '                        >\r',
            '                            ➕ Add Label\r',
            '                        </button>\r',
            '                        <button\r',
            '                            onClick={handleChallengeSubmit}\r',
            '                            disabled={isAnalyzing || Object.keys(studentLabels).length === 0}\r',
            '                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #4f46e5", background: "#4f46e5", color: "white", fontSize: "12px", fontWeight: 700, cursor: isAnalyzing ? "wait" : "pointer", opacity: Object.keys(studentLabels).length === 0 ? 0.5 : 1 }}\r',
            '                        >\r',
            '                            {isAnalyzing ? "⏳ Analyzing..." : "✅ Submit Answers"}\r',
            '                        </button>\r',
            '                        <span style={{ fontSize: "11px", color: "#6366f1", fontWeight: 600 }}>\r',
            '                            {Object.values(studentLabels).flat().length} label{Object.values(studentLabels).flat().length !== 1 ? "s" : ""} placed\r',
            '                        </span>\r',
            '                    </div>\r',
            '                )}\r',
            '                {challengeSubmitted && (\r',
            '                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>\r',
            '                        <button onClick={() => setShowComparison(!showComparison)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #6366f1", background: showComparison ? "#4f46e5" : "#eef2ff", color: showComparison ? "white" : "#4f46e5", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>\r',
            '                            {showComparison ? "📋 Hide Comparison" : "📋 Show Comparison"}\r',
            '                        </button>\r',
            '                        <button onClick={handleResetChallenge} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #f59e0b", background: "#fffbeb", color: "#b45309", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>\r',
            '                            🔄 Try Again\r',
            '                        </button>\r',
            '                        <span style={{ fontSize: "13px", fontWeight: 800, color: challengeResult?.score >= 80 ? "#16a34a" : challengeResult?.score >= 50 ? "#f59e0b" : "#ef4444" }}>\r',
            '                            Score: {challengeResult?.score || 0}%\r',
            '                        </span>\r',
            '                    </div>\r',
            '                )}\r',
        ]
        lines[i+1:i+1] = challenge_toolbar
        fixed += 1
        print(f"  [OK] FIX 5: Added challenge toolbar at L{i+2}")
        break

# Rebuild
content_tmp = '\n'.join(lines)
lines = content_tmp.split('\n')

# ============================================================
# FIX 6: Modify the panel click handler to use student label handler in challenge mode
# Find the onClick that calls handleAddUserLabel and make it conditional
# ============================================================
for i in range(len(lines)):
    if 'handleAddUserLabel(panelIdx, e)' in lines[i] and i < 2200:
        lines[i] = lines[i].replace(
            'handleAddUserLabel(panelIdx, e)',
            '(isStudentChallenge ? handleAddStudentLabel(panelIdx, e) : handleAddUserLabel(panelIdx, e))'
        )
        fixed += 1
        print(f"  [OK] FIX 6: Made label add conditional at L{i+1}")
        break

# ============================================================
# FIX 7: Hide teacher tools when in student challenge mode
# Wrap the main toolbar content with isStudentChallenge check
# The toolbar starts with Labels/Add Label buttons group
# We need to hide the first group (Labels toggle, Add Label) and drawing tools when in student mode
# Find the first <div with gap:4px after visual-grid-controls
# ============================================================
for i in range(len(lines)):
    if 'visual-grid-controls' in lines[i] and i < 2000:
        # Find the div with the Labels + Add Label buttons
        for j in range(i+1, min(i+5, len(lines))):
            if "display: 'flex', gap: '4px'" in lines[j] or "display: 'flex', gap: '4px'" in lines[j]:
                # Wrap this in a conditional
                indent = lines[j][:len(lines[j]) - len(lines[j].lstrip())]
                lines.insert(j, indent + '{!isStudentChallenge && (\r')
                # Now find where this group ends (the first </div> divider)
                # Continue from j+2 to find the matching close
                brace_count = 0
                for k in range(j+1, min(j+30, len(lines))):
                    if "width: '1px', height: '20px'" in lines[k] and "Label Challenge" not in lines[k]:
                        # Insert close before this divider
                        lines.insert(k, indent + ')}\r')
                        fixed += 1
                        print(f"  [OK] FIX 7: Wrapped teacher-only toolbar controls at L{j+1}-{k+1}")
                        break
                break
        break

# Rebuild
content_tmp = '\n'.join(lines)
lines = content_tmp.split('\n')

# ============================================================
# FIX 8: Add student labels rendering inside each panel
# Find where user labels are rendered and add student labels nearby
# Look for the user label section after AI labels
# ============================================================
for i in range(len(lines)):
    if "uLabel.x}%" in lines[i] and "position: 'absolute'" in lines[i] and i < 2200:
        print(f"  Found user label rendering at L{i+1}")
        # Find the end of the user label section - look for the closing of the map
        # We need to find the closing of the userLabels map
        for j in range(i+1, min(i+40, len(lines))):
            if ')))}' in lines[j] and j < 2200:
                print(f"  Found userLabels map close at L{j+1}")
                indent = ' ' * 28
                student_labels_jsx = [
                    '',
                    indent + '{/* Student Challenge Labels */}\r',
                    indent + '{isStudentChallenge && (studentLabels[panelIdx] || []).map((sLabel) => (\r',
                    indent + '    <div key={`student-${sLabel.id}`}\r',
                    indent + '        style={{ position: "absolute", display: "flex", alignItems: "center", gap: "4px", left: `${sLabel.x}%`, top: `${sLabel.y}%`, background: challengeSubmitted ? (challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "correct" ? "rgba(220,252,231,0.95)" : challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "close" ? "rgba(254,249,195,0.95)" : "rgba(254,226,226,0.95)") : "rgba(219,234,254,0.95)", border: challengeSubmitted ? (challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "correct" ? "2px solid #16a34a" : challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "close" ? "2px solid #f59e0b" : "2px solid #ef4444") : "2px solid #3b82f6", padding: "4px 10px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, color: "#1e1b4b", zIndex: 5 }}\r',
                    indent + '    >\r',
                    indent + '        {!challengeSubmitted && (\r',
                    indent + '            <button onClick={() => handleDeleteStudentLabel(panelIdx, sLabel.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: 0, color: "#94a3b8" }}>✕</button>\r',
                    indent + '        )}\r',
                    indent + '        {!challengeSubmitted ? (\r',
                    indent + '            <input type="text" value={sLabel.text} onChange={(e) => handleStudentLabelTextChange(panelIdx, sLabel.id, e.target.value)} style={{ background: "transparent", border: "none", outline: "none", fontWeight: 700, fontSize: "13px", color: "#1e1b4b", width: Math.max(60, sLabel.text.length * 9) + "px", textAlign: "center" }} />\r',
                    indent + '        ) : (\r',
                    indent + '            <span>{sLabel.text}</span>\r',
                    indent + '        )}\r',
                    indent + '        {challengeSubmitted && challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "correct" && <span>✅</span>}\r',
                    indent + '        {challengeSubmitted && challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "close" && <span>🟡</span>}\r',
                    indent + '        {challengeSubmitted && challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "incorrect" && <span>❌</span>}\r',
                    indent + '    </div>\r',
                    indent + '))}\r',
                ]
                lines[j+1:j+1] = student_labels_jsx
                fixed += 1
                print(f"  [OK] FIX 8: Added student labels rendering at L{j+2}")
                break
        break

# Rebuild
content_tmp = '\n'.join(lines)
lines = content_tmp.split('\n')

# ============================================================
# FIX 9: Add comparison view after the panel grid
# Find the closing </div> of the visual-panel-grid and add comparison after it
# ============================================================
for i in range(len(lines)):
    if "visual-panel-grid layout-" in lines[i] and i < 2200:
        print(f"  Found visual-panel-grid at L{i+1}")
        # Find the closing of orderedPanels.map — search for the closing </div> after the map
        # Look for the closing of the grid div
        for j in range(i+1, min(i+300, len(lines))):
            # The comparison view should go right before the final </div> of the component return
            if '</div>' in lines[j] and j > i + 50:
                # Check if this is the last </div> before the component's closing return
                next_line = lines[j+1].strip() if j+1 < len(lines) else ''
                # Look for the end of the return statement
                if next_line.startswith(');') or next_line.startswith('</div>'):
                    indent = ' ' * 12
                    comparison_jsx = [
                        '',
                        indent + '{/* === Label Challenge Comparison View === */}\r',
                        indent + '{showComparison && challengeResult && (\r',
                        indent + '    <div style={{ marginTop: "12px", padding: "16px", background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdf4 100%)", borderRadius: "12px", border: "1px solid #bbf7d0" }}>\r',
                        indent + '        <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 800, color: "#166534", textAlign: "center" }}>🏆 Label Challenge Results</h4>\r',
                        indent + '        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "12px" }}>\r',
                        indent + '            <div style={{ textAlign: "center", padding: "10px 20px", background: "white", borderRadius: "10px", border: "1px solid #d1d5db" }}>\r',
                        indent + '                <div style={{ fontSize: "28px", fontWeight: 900, color: challengeResult.score >= 80 ? "#16a34a" : challengeResult.score >= 50 ? "#f59e0b" : "#ef4444" }}>{challengeResult.score}%</div>\r',
                        indent + '                <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Score</div>\r',
                        indent + '            </div>\r',
                        indent + '            <div style={{ textAlign: "center", padding: "10px 20px", background: "white", borderRadius: "10px", border: "1px solid #d1d5db" }}>\r',
                        indent + '                <div style={{ fontSize: "28px", fontWeight: 900, color: "#4f46e5" }}>{challengeResult.totalCorrect || 0}/{challengeResult.totalExpected || 0}</div>\r',
                        indent + '                <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Correct</div>\r',
                        indent + '            </div>\r',
                        indent + '        </div>\r',
                        indent + '        <p style={{ textAlign: "center", fontSize: "14px", color: "#374151", fontWeight: 500, margin: "0 0 12px 0", fontStyle: "italic" }}>{challengeResult.feedback}</p>\r',
                        indent + '        {challengeResult.labelResults && challengeResult.labelResults.length > 0 && (\r',
                        indent + '            <div style={{ display: "grid", gap: "6px" }}>\r',
                        indent + '                {challengeResult.labelResults.map((r, ri) => (\r',
                        indent + '                    <div key={ri} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", background: r.verdict === "correct" ? "#f0fdf4" : r.verdict === "close" ? "#fffbeb" : "#fef2f2", borderRadius: "8px", border: `1px solid ${r.verdict === "correct" ? "#bbf7d0" : r.verdict === "close" ? "#fde68a" : "#fecaca"}`, fontSize: "13px" }}>\r',
                        indent + '                        <span style={{ fontSize: "16px" }}>{r.verdict === "correct" ? "✅" : r.verdict === "close" ? "🟡" : "❌"}</span>\r',
                        indent + '                        <strong>{r.studentLabel}</strong>\r',
                        indent + '                        <span style={{ color: "#6b7280" }}>— {r.note}</span>\r',
                        indent + '                    </div>\r',
                        indent + '                ))}\r',
                        indent + '            </div>\r',
                        indent + '        )}\r',
                        indent + '        <div style={{ textAlign: "center", marginTop: "12px" }}>\r',
                        indent + '            <button onClick={() => setLabelsHidden(false)} style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #6366f1", background: "#4f46e5", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>👁️ Show Answer Key</button>\r',
                        indent + '        </div>\r',
                        indent + '    </div>\r',
                        indent + ')}\r',
                    ]
                    lines[j:j] = comparison_jsx
                    fixed += 1
                    print(f"  [OK] FIX 9: Added comparison view at L{j+1}")
                    break
        break

# Rebuild
content_tmp = '\n'.join(lines)
lines = content_tmp.split('\n')

# ============================================================  
# FIX 10: Update call site to pass new props
# ============================================================
for i in range(len(lines)):
    if '<VisualPanelGrid' in lines[i] and i > 60000:
        print(f"  Found VisualPanelGrid call site at L{i+1}")
        # Find the t={t} prop line
        for j in range(i, min(i+15, len(lines))):
            if 't={t}' in lines[j]:
                indent = lines[j][:len(lines[j]) - len(lines[j].lstrip())]
                new_props = [
                    indent + 'isTeacherMode={isTeacherMode}\r',
                    indent + 'onChallengeSubmit={(result) => {\r',
                    indent + '    handleScoreUpdate(Math.round((result.score || 0) / 10), "Label Challenge", generatedContent?.id);\r',
                    indent + '}}\r',
                    indent + 'callGemini={callGemini}\r',
                ]
                lines[j+1:j+1] = new_props
                fixed += 1
                print(f"  [OK] FIX 10: Added new props at call site L{j+2}")
                break
        break

# Write final
content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied. Part 2 complete!")
