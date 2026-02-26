"""
Accessibility fixes for Visual Supports / Label Challenge.

12 categories of fixes:
1. Fill-in-blank inputs: add aria-label with position context
2. AI labels: add role="note", tabIndex, aria-label in all modes
3. Color swatches: make keyboard accessible with role="radio", tabIndex, onKeyDown
4. SVG overlays: add aria-hidden="true" (decorative)
5. Challenge instructions: add role="status" for live announcements
6. Student Add Label button: add aria-label
7. Challenge mode buttons: add aria-label
8. Score display: add role="status" and aria-live
9. Export All button: add aria-label
10. Student labels: add role="note" and tabIndex
11. Comparison/Reset buttons: add aria-label
12. Figure elements: add aria-label with panel context
"""
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # FIX 1: Fill-in-blank AI label inputs - add aria-label
    # ============================================================
    target_1 = """                                            <input
                                                autoFocus={false}
                                                placeholder={"Label " + (labelIdx + 1) + "..."}
                                                value={fillBlankAnswers[panelIdx + '-' + labelIdx] || ''}
                                                onChange={(e) => setFillBlankAnswers(prev => ({...prev, [panelIdx + '-' + labelIdx]: e.target.value}))}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#166534', width: Math.max(80, (fillBlankAnswers[panelIdx + '-' + labelIdx] || '').length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                                disabled={challengeSubmitted}
                                            />"""

    replacement_1 = """                                            <input
                                                autoFocus={false}
                                                placeholder={"Label " + (labelIdx + 1) + "..."}
                                                value={fillBlankAnswers[panelIdx + '-' + labelIdx] || ''}
                                                onChange={(e) => setFillBlankAnswers(prev => ({...prev, [panelIdx + '-' + labelIdx]: e.target.value}))}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                aria-label={`Label ${labelIdx + 1} on panel ${panelIdx + 1} — type your answer`}
                                                style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#166534', width: Math.max(80, (fillBlankAnswers[panelIdx + '-' + labelIdx] || '').length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                                disabled={challengeSubmitted}
                                            />"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ FIX1: AI fill-in-blank inputs have aria-label")
    else:
        print("❌ FIX1: Could not find AI fill-in-blank input")

    # ============================================================
    # FIX 2: AI labels - add role="note" and tabIndex in normal mode
    # ============================================================
    target_2 = """                                        title={(isStudentChallenge && isFillBlank) ? "Type the correct label" : "Drag to move • Double-click to edit"}
                                    >"""

    replacement_2 = """                                        title={(isStudentChallenge && isFillBlank) ? "Type the correct label" : "Drag to move • Double-click to edit"}
                                        role="note"
                                        tabIndex={0}
                                        aria-label={(isStudentChallenge && isFillBlank) ? `Blank label ${labelIdx + 1} — type your answer` : `Label: ${label.text || label}`}
                                    >"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ FIX2: AI labels have role=note, tabIndex, aria-label")
    else:
        print("❌ FIX2: Could not find AI label title target")

    # ============================================================
    # FIX 3: Color swatches - keyboard accessible
    # ============================================================
    target_3 = """                    {['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#1e293b'].map(c => (
                        <div key={c} onClick={() => setDrawingColor(c)} title={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: drawingColor === c ? '2px solid #1e293b' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.15s', transform: drawingColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                    ))}"""

    color_names = {'#ef4444': 'Red', '#f59e0b': 'Amber', '#22c55e': 'Green', '#3b82f6': 'Blue', '#8b5cf6': 'Purple', '#1e293b': 'Dark'}
    replacement_3 = """                    {['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#1e293b'].map(c => {
                        const colorName = {'#ef4444':'Red','#f59e0b':'Amber','#22c55e':'Green','#3b82f6':'Blue','#8b5cf6':'Purple','#1e293b':'Dark'}[c] || c;
                        return (
                        <div key={c} onClick={() => setDrawingColor(c)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDrawingColor(c)}
                            role="radio" aria-checked={drawingColor === c} aria-label={`${colorName} drawing color`} tabIndex={0}
                            title={colorName} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: drawingColor === c ? '2px solid #1e293b' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.15s', transform: drawingColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                    ); })}"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ FIX3: Color swatches keyboard accessible with role=radio")
    else:
        print("❌ FIX3: Could not find color swatches")

    # ============================================================
    # FIX 4: SVG overlay containers - add aria-hidden
    # ============================================================
    target_4 = """            <svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>"""

    replacement_4 = """            <svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>"""

    if target_4 in content:
        content = content.replace(target_4, replacement_4, 1)
        edits_applied += 1
        print("✅ FIX4: Leader line SVG has aria-hidden")
    else:
        print("❌ FIX4: Could not find leader line SVG")

    # Student leader line SVG
    target_4b = """            <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                 style={{ position: 'absolute', top: 0, left: 0,
                          width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>"""

    replacement_4b = """            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"
                 style={{ position: 'absolute', top: 0, left: 0,
                          width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>"""

    if target_4b in content:
        content = content.replace(target_4b, replacement_4b, 1)
        edits_applied += 1
        print("✅ FIX4b: Student leader line SVG has aria-hidden")
    else:
        print("❌ FIX4b: Could not find student leader line SVG")

    # ============================================================
    # FIX 5: Challenge instructions - add role=status for announcements
    # ============================================================
    target_5 = """                    <div style={{ fontSize: "14px", fontWeight: 700, color: isFillBlank ? "#166534" : "#1e40af" }}>🏆 Label Challenge: {isFillBlank ? 'Fill in the Blanks' : 'Label from Scratch'}</div>"""

    replacement_5 = """                    <div role="status" aria-live="polite" style={{ fontSize: "14px", fontWeight: 700, color: isFillBlank ? "#166534" : "#1e40af" }}>🏆 Label Challenge: {isFillBlank ? 'Fill in the Blanks' : 'Label from Scratch'}</div>"""

    if target_5 in content:
        content = content.replace(target_5, replacement_5, 1)
        edits_applied += 1
        print("✅ FIX5: Challenge instructions have role=status")
    else:
        print("❌ FIX5: Could not find challenge instructions")

    # ============================================================
    # FIX 6: Student "Add Label" button - add aria-label
    # ============================================================
    target_6 = """                        {!isFillBlank && (
                            <button
                                onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : -1)}
                                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: addingLabelPanel !== null ? "1px solid #4f46e5" : "1px solid #cbd5e1", background: addingLabelPanel !== null ? "#4f46e5" : "white", color: addingLabelPanel !== null ? "white" : "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                            >
                                ➕ Add Label
                            </button>
                        )}"""

    replacement_6 = """                        {!isFillBlank && (
                            <button
                                onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : -1)}
                                aria-label={addingLabelPanel !== null ? "Cancel adding label" : "Add a label to the diagram"}
                                aria-pressed={addingLabelPanel !== null}
                                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: addingLabelPanel !== null ? "1px solid #4f46e5" : "1px solid #cbd5e1", background: addingLabelPanel !== null ? "#4f46e5" : "white", color: addingLabelPanel !== null ? "white" : "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                            >
                                ➕ Add Label
                            </button>
                        )}"""

    if target_6 in content:
        content = content.replace(target_6, replacement_6, 1)
        edits_applied += 1
        print("✅ FIX6: Student Add Label has aria-label + aria-pressed")
    else:
        print("❌ FIX6: Could not find student Add Label button")

    # ============================================================
    # FIX 7: Challenge mode buttons - aria-label
    # ============================================================
    target_7a = """                                🔤 Fill-in-Blank
                            </button>
                            <button
                                onClick={() => handleToggleChallenge('scratch')}
                                title="Students place labels from scratch"
                                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #93c5fd", background: "#eff6ff", color: "#1d4ed8", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                            >
                                🎯 From Scratch"""

    replacement_7a = """                                🔤 Fill-in-Blank
                            </button>
                            <button
                                onClick={() => handleToggleChallenge('scratch')}
                                title="Students place labels from scratch"
                                aria-label="Set label challenge mode: From Scratch"
                                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #93c5fd", background: "#eff6ff", color: "#1d4ed8", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                            >
                                🎯 From Scratch"""

    if target_7a in content:
        content = content.replace(target_7a, replacement_7a, 1)
        edits_applied += 1
        print("✅ FIX7a: From Scratch button has aria-label")
    else:
        print("❌ FIX7a: Could not find From Scratch button")

    # ============================================================
    # FIX 8: Score display - add role=status and aria-live
    # ============================================================
    target_8 = """                        <span style={{ fontSize: "13px", fontWeight: 800, color: challengeResult?.score >= 80 ? "#16a34a" : challengeResult?.score >= 50 ? "#f59e0b" : "#ef4444" }}>
                            Score: {challengeResult?.score || 0}%
                        </span>"""

    replacement_8 = """                        <span role="status" aria-live="polite" aria-label={`Your score is ${challengeResult?.score || 0} percent`} style={{ fontSize: "13px", fontWeight: 800, color: challengeResult?.score >= 80 ? "#16a34a" : challengeResult?.score >= 50 ? "#f59e0b" : "#ef4444" }}>
                            Score: {challengeResult?.score || 0}%
                        </span>"""

    if target_8 in content:
        content = content.replace(target_8, replacement_8, 1)
        edits_applied += 1
        print("✅ FIX8: Score display has role=status with aria-live")
    else:
        print("❌ FIX8: Could not find score display")

    # ============================================================
    # FIX 9: Export All button - add aria-label
    # ============================================================
    target_9 = """                        title="Download all panels as PNG images"
                        style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                        📸 Export All"""

    replacement_9 = """                        title="Download all panels as PNG images"
                        aria-label="Export all panels as PNG images"
                        style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                        📸 Export All"""

    if target_9 in content:
        content = content.replace(target_9, replacement_9, 1)
        edits_applied += 1
        print("✅ FIX9: Export All has aria-label")
    else:
        print("❌ FIX9: Could not find Export All button")

    # ============================================================
    # FIX 10: Comparison + Reset buttons - aria-label
    # ============================================================
    target_10 = """                        <button onClick={() => setShowComparison(!showComparison)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #6366f1", background: showComparison ? "#4f46e5" : "#eef2ff", color: showComparison ? "white" : "#4f46e5", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            {showComparison ? "📋 Hide Comparison" : "📋 Show Comparison"}
                        </button>
                        <button onClick={handleResetChallenge} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #f59e0b", background: "#fffbeb", color: "#b45309", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            🔄 Try Again
                        </button>"""

    replacement_10 = """                        <button onClick={() => setShowComparison(!showComparison)} aria-label={showComparison ? "Hide label comparison results" : "Show label comparison results"} aria-expanded={showComparison} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #6366f1", background: showComparison ? "#4f46e5" : "#eef2ff", color: showComparison ? "white" : "#4f46e5", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            {showComparison ? "📋 Hide Comparison" : "📋 Show Comparison"}
                        </button>
                        <button onClick={handleResetChallenge} aria-label="Reset the challenge and try again" style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #f59e0b", background: "#fffbeb", color: "#b45309", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                            🔄 Try Again
                        </button>"""

    if target_10 in content:
        content = content.replace(target_10, replacement_10, 1)
        edits_applied += 1
        print("✅ FIX10: Comparison/Reset buttons have aria-label + aria-expanded")
    else:
        print("❌ FIX10: Could not find comparison/reset buttons")

    # ============================================================
    # FIX 11: Figure elements - add aria-label
    # ============================================================
    target_11 = """                        <figure className="visual-panel" style={{ position: "relative" }}>"""

    replacement_11 = """                        <figure className="visual-panel" style={{ position: "relative" }} aria-label={`Diagram panel ${panelIdx + 1}${panel.role ? ': ' + panel.role : ''}`}>"""

    if target_11 in content:
        content = content.replace(target_11, replacement_11, 1)
        edits_applied += 1
        print("✅ FIX11: Figure elements have aria-label with panel context")
    else:
        print("❌ FIX11: Could not find figure element")

    # ============================================================
    # FIX 12: Fill-in-blank teacher label inputs - add aria-label
    # ============================================================
    target_12 = """                                        <input
                                            autoFocus={false}
                                            placeholder={"Label..."}
                                            value={fillBlankAnswers[fillKey] || ''}
                                            onChange={(e) => setFillBlankAnswers(prev => ({...prev, [fillKey]: e.target.value}))}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#166534', width: Math.max(80, (fillBlankAnswers[fillKey] || '').length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                            disabled={challengeSubmitted}
                                        />"""

    replacement_12 = """                                        <input
                                            autoFocus={false}
                                            placeholder={"Label..."}
                                            value={fillBlankAnswers[fillKey] || ''}
                                            onChange={(e) => setFillBlankAnswers(prev => ({...prev, [fillKey]: e.target.value}))}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            aria-label={`Teacher label ${uIdx + 1} on panel ${panelIdx + 1} — type your answer`}
                                            style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#166534', width: Math.max(80, (fillBlankAnswers[fillKey] || '').length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                            disabled={challengeSubmitted}
                                        />"""

    if target_12 in content:
        content = content.replace(target_12, replacement_12, 1)
        edits_applied += 1
        print("✅ FIX12: Teacher fill-in-blank inputs have aria-label")
    else:
        print("❌ FIX12: Could not find teacher fill-in-blank input")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/13 a11y fix(es) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
