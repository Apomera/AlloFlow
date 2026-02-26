"""
Apply Label Challenge enhancements:
1. Semantic scoring prompt (concept-match vs exact-word match)
2. Result schema enrichment (totalClose, resourceTitle, panelCount, challengeType)
3. Dual challenge modes (scratch + fill-in-blank)
4. Dashboard detail view updates for new schema fields
"""
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: Add challengeType state and persist it
    # ============================================================
    target_1 = """    // === Label Challenge State ===
    const [challengeMode, setChallengeMode] = React.useState(initialAnnotations?.challengeActive || false);
    const [challengeSubmitted, setChallengeSubmitted] = React.useState(false);
    const [challengeResult, setChallengeResult] = React.useState(null);
    const [studentLabels, setStudentLabels] = React.useState({});
    const [showComparison, setShowComparison] = React.useState(false);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const isStudentChallenge = !isTeacherMode && challengeMode;"""

    replacement_1 = """    // === Label Challenge State ===
    const [challengeMode, setChallengeMode] = React.useState(initialAnnotations?.challengeActive || false);
    const [challengeType, setChallengeType] = React.useState(initialAnnotations?.challengeType || 'fill-blank'); // 'fill-blank' | 'scratch'
    const [challengeSubmitted, setChallengeSubmitted] = React.useState(false);
    const [challengeResult, setChallengeResult] = React.useState(null);
    const [studentLabels, setStudentLabels] = React.useState({});
    const [fillBlankAnswers, setFillBlankAnswers] = React.useState({}); // { 'panelIdx-labelIdx': 'student text' }
    const [showComparison, setShowComparison] = React.useState(false);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const isStudentChallenge = !isTeacherMode && challengeMode;
    const isFillBlank = challengeType === 'fill-blank';"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: Added challengeType + fillBlankAnswers state")
    else:
        print("❌ EDIT1: Could not find challenge state target")

    # ============================================================
    # EDIT 2: Persist challengeType in onAnnotationsChange
    # ============================================================
    target_2 = """            onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, panelOrder, challengeActive: challengeMode });"""

    replacement_2 = """            onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, panelOrder, challengeActive: challengeMode, challengeType });"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: Persisted challengeType in annotations")
    else:
        print("❌ EDIT2: Could not find onAnnotationsChange target")

    # ============================================================
    # EDIT 3: Replace the Gemini scoring prompt with semantic version
    # and update handleChallengeSubmit to support fill-in-blank
    # ============================================================
    target_3 = """    const handleChallengeSubmit = async () => {
        if (!callGemini || isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const teacherLabelsList = [
                ...visualPlan.panels.flatMap((p, i) => (p.labels || []).map((l, li) => ({ panel: i, text: l, type: "ai" }))),
                ...Object.entries(userLabels).flatMap(([i, labels]) => labels.map(l => ({ panel: parseInt(i), text: l.text, x: l.x, y: l.y, type: "teacher" })))
            ];
            const studentLabelsList = Object.entries(studentLabels).flatMap(([i, labels]) =>
                labels.map(l => ({ panel: parseInt(i), text: l.text, x: l.x, y: l.y }))
            );
            const panelDescriptions = visualPlan.panels.map((p, i) => ({ panel: i, caption: p.caption || "", role: p.role || "" }));
            const analysisPrompt = `You are an educational assessment evaluator reviewing a student diagram labeling exercise.
Concept: "${visualPlan.title || "diagram"}"
Panel descriptions: ${JSON.stringify(panelDescriptions)}
Teacher answer key (correct labels): ${JSON.stringify(teacherLabelsList)}
Student submitted labels: ${JSON.stringify(studentLabelsList)}

Evaluate each student label for accuracy. A label is "correct" if it identifies the right concept and is placed in approximately the right area. A label is "close" if the concept is right but placement is significantly off, or if the text is a reasonable synonym. A label is "incorrect" if the concept is wrong.

Return ONLY valid JSON:
{
  "score": 0-100,
  "totalCorrect": N,
  "totalExpected": N,
  "feedback": "2-3 sentence encouraging summary for a student",
  "labelResults": [{"studentLabel": "...", "verdict": "correct|close|incorrect", "note": "brief explanation"}]
}`;"""

    replacement_3 = """    const handleChallengeSubmit = async () => {
        if (!callGemini || isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const teacherLabelsList = [
                ...visualPlan.panels.flatMap((p, i) => (p.labels || []).map((l, li) => ({ panel: i, text: l, type: "ai", labelIdx: li }))),
                ...Object.entries(userLabels).flatMap(([i, labels]) => labels.map(l => ({ panel: parseInt(i), text: l.text, x: l.x, y: l.y, type: "teacher" })))
            ];
            // Collect student answers based on challenge type
            let studentLabelsList;
            if (isFillBlank) {
                // Fill-in-blank: collect from fillBlankAnswers keyed by panel-labelIdx
                studentLabelsList = Object.entries(fillBlankAnswers)
                    .filter(([, text]) => text && text.trim())
                    .map(([key, text]) => {
                        const [panelStr, labelIdxStr] = key.split('-');
                        const panel = parseInt(panelStr);
                        const teacherLabel = teacherLabelsList.find(t => t.panel === panel && t.labelIdx === parseInt(labelIdxStr));
                        return { panel, text: text.trim(), position: teacherLabel?.text ? 'at: ' + teacherLabel.text : '' };
                    });
            } else {
                // Scratch mode: collect from studentLabels state
                studentLabelsList = Object.entries(studentLabels).flatMap(([i, labels]) =>
                    labels.map(l => ({ panel: parseInt(i), text: l.text, x: l.x, y: l.y }))
                );
            }
            const panelDescriptions = visualPlan.panels.map((p, i) => ({ panel: i, caption: p.caption || "", role: p.role || "" }));
            const modeNote = isFillBlank
                ? "The student was given blank spaces at each label position and typed their answers."
                : "The student placed labels from scratch on the diagram.";
            const analysisPrompt = `You are an educational assessment evaluator reviewing a student diagram labeling exercise.
Concept: "${visualPlan.title || "diagram"}"
Panel descriptions: ${JSON.stringify(panelDescriptions)}
Teacher answer key (correct labels): ${JSON.stringify(teacherLabelsList)}
Student submitted labels: ${JSON.stringify(studentLabelsList)}
Mode: ${modeNote}

Evaluate each student label for CONCEPTUAL accuracy. Be generous with credit:
- "correct": The student captures the same main idea or concept as the teacher's answer, even if wording differs. Synonyms, paraphrases, abbreviations, or simplified language are all acceptable. Example: "heart pump" for "cardiac muscle" = correct.
- "close": The student shows partial understanding — a related but not identical concept, a reasonable attempt, or the right idea with significant inaccuracy. Example: "blood tube" for "artery" = close.
- "incorrect": The concept is fundamentally wrong or completely unrelated.

Award credit generously for conceptual understanding over exact wording.

Return ONLY valid JSON:
{
  "score": 0-100,
  "totalCorrect": N,
  "totalClose": N,
  "totalExpected": N,
  "feedback": "2-3 sentence encouraging summary for a student",
  "labelResults": [{"studentLabel": "...", "matchedTeacherLabel": "...", "verdict": "correct|close|incorrect", "note": "brief explanation"}]
}`;"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: Semantic scoring prompt + fill-blank support in handleChallengeSubmit")
    else:
        print("❌ EDIT3: Could not find handleChallengeSubmit target")

    # ============================================================
    # EDIT 4: Update toggle challenge to reset fillBlankAnswers too
    # ============================================================
    target_4 = """    const handleToggleChallenge = () => {
        const newVal = !challengeMode;
        setChallengeMode(newVal);
        if (!newVal) {
            setChallengeSubmitted(false);
            setChallengeResult(null);
            setStudentLabels({});
            setShowComparison(false);
        }
    };

    const handleResetChallenge = () => {
        setStudentLabels({});
        setChallengeSubmitted(false);
        setChallengeResult(null);
        setShowComparison(false);
    };"""

    replacement_4 = """    const handleToggleChallenge = (type) => {
        const newVal = !challengeMode;
        setChallengeMode(newVal);
        if (type) setChallengeType(type);
        if (!newVal) {
            setChallengeSubmitted(false);
            setChallengeResult(null);
            setStudentLabels({});
            setFillBlankAnswers({});
            setShowComparison(false);
        }
    };

    const handleResetChallenge = () => {
        setStudentLabels({});
        setFillBlankAnswers({});
        setChallengeSubmitted(false);
        setChallengeResult(null);
        setShowComparison(false);
    };"""

    if target_4 in content:
        content = content.replace(target_4, replacement_4, 1)
        edits_applied += 1
        print("✅ EDIT4: Updated toggle/reset to support challengeType + fillBlankAnswers")
    else:
        print("❌ EDIT4: Could not find handleToggleChallenge target")

    # ============================================================
    # EDIT 5: Replace teacher challenge toggle button with mode selector
    # ============================================================
    target_5 = """                {isTeacherMode && !isStudentChallenge && (
                    <button
                        onClick={handleToggleChallenge}
                        title={challengeMode ? "Deactivate Label Challenge" : "Set Label Challenge — students will label this diagram"}
                        style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: challengeMode ? "1px solid #16a34a" : "1px solid #86efac", background: challengeMode ? "#16a34a" : "#f0fdf4", color: challengeMode ? "white" : "#15803d", fontSize: "12px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                    >
                        {challengeMode ? "🏆 Challenge Active ✓" : "🏆 Set Label Challenge"}
                    </button>
                )}"""

    replacement_5 = """                {isTeacherMode && !isStudentChallenge && (
                    challengeMode ? (
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <button
                                onClick={() => handleToggleChallenge()}
                                title="Deactivate Label Challenge"
                                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #16a34a", background: "#16a34a", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                            >
                                🏆 {challengeType === 'fill-blank' ? 'Fill-in-Blank' : 'From Scratch'} ✓
                            </button>
                            <button
                                onClick={() => setChallengeType(challengeType === 'fill-blank' ? 'scratch' : 'fill-blank')}
                                title="Switch challenge mode"
                                style={{ display: "flex", alignItems: "center", gap: "3px", padding: "5px 10px", borderRadius: "6px", border: "1px solid #d1d5db", background: "white", color: "#475569", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            >
                                🔄 Switch
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <button
                                onClick={() => handleToggleChallenge('fill-blank')}
                                title="Students fill in blank labels at existing positions"
                                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #86efac", background: "#f0fdf4", color: "#15803d", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                            >
                                🔤 Fill-in-Blank
                            </button>
                            <button
                                onClick={() => handleToggleChallenge('scratch')}
                                title="Students place labels from scratch"
                                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #93c5fd", background: "#eff6ff", color: "#1d4ed8", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                            >
                                🎯 From Scratch
                            </button>
                        </div>
                    )
                )}"""

    if target_5 in content:
        content = content.replace(target_5, replacement_5, 1)
        edits_applied += 1
        print("✅ EDIT5: Teacher challenge mode selector (fill-blank / from-scratch)")
    else:
        print("❌ EDIT5: Could not find teacher challenge button target")

    # ============================================================
    # EDIT 6: Update student challenge UI instructions
    # ============================================================
    target_6 = """            {isStudentChallenge && !challengeSubmitted && (
                <div style={{ textAlign: "center", padding: "10px 16px", background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", borderRadius: "10px", border: "1px solid #93c5fd", marginBottom: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e40af" }}>🏆 Label Challenge Active</div>
                    <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "2px" }}>Click "➕ Add Label" then click on the diagram to place labels. Edit text by typing in the label.</div>
                </div>
            )}"""

    replacement_6 = """            {isStudentChallenge && !challengeSubmitted && (
                <div style={{ textAlign: "center", padding: "10px 16px", background: isFillBlank ? "linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)" : "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", borderRadius: "10px", border: isFillBlank ? "1px solid #86efac" : "1px solid #93c5fd", marginBottom: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: isFillBlank ? "#166534" : "#1e40af" }}>🏆 Label Challenge: {isFillBlank ? 'Fill in the Blanks' : 'Label from Scratch'}</div>
                    <div style={{ fontSize: "12px", color: isFillBlank ? "#16a34a" : "#3b82f6", marginTop: "2px" }}>
                        {isFillBlank
                            ? "Type the correct label in each blank field. Use your own words — synonyms and paraphrases are accepted!"
                            : 'Click "➕ Add Label" then click on the diagram to place labels. Edit text by typing in the label.'}
                    </div>
                </div>
            )}"""

    if target_6 in content:
        content = content.replace(target_6, replacement_6, 1)
        edits_applied += 1
        print("✅ EDIT6: Updated student challenge instructions for both modes")
    else:
        print("❌ EDIT6: Could not find student challenge instructions target")

    # ============================================================
    # EDIT 7: Update student controls (hide Add Label in fill-blank mode)
    # ============================================================
    target_7 = """                {isStudentChallenge && !challengeSubmitted && (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <button
                            onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : -1)}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: addingLabelPanel !== null ? "1px solid #4f46e5" : "1px solid #cbd5e1", background: addingLabelPanel !== null ? "#4f46e5" : "white", color: addingLabelPanel !== null ? "white" : "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                        >
                            ➕ Add Label
                        </button>
                        <button
                            onClick={handleChallengeSubmit}
                            disabled={isAnalyzing || Object.keys(studentLabels).length === 0}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #4f46e5", background: "#4f46e5", color: "white", fontSize: "12px", fontWeight: 700, cursor: isAnalyzing ? "wait" : "pointer", opacity: Object.keys(studentLabels).length === 0 ? 0.5 : 1 }}
                        >
                            {isAnalyzing ? "⏳ Analyzing..." : "✅ Submit Answers"}
                        </button>
                        <span style={{ fontSize: "11px", color: "#6366f1", fontWeight: 600 }}>
                            {Object.values(studentLabels).flat().length} label{Object.values(studentLabels).flat().length !== 1 ? "s" : ""} placed
                        </span>
                    </div>
                )}"""

    replacement_7 = """                {isStudentChallenge && !challengeSubmitted && (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        {!isFillBlank && (
                            <button
                                onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : -1)}
                                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: addingLabelPanel !== null ? "1px solid #4f46e5" : "1px solid #cbd5e1", background: addingLabelPanel !== null ? "#4f46e5" : "white", color: addingLabelPanel !== null ? "white" : "#475569", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                            >
                                ➕ Add Label
                            </button>
                        )}
                        <button
                            onClick={handleChallengeSubmit}
                            disabled={isAnalyzing || (isFillBlank ? Object.values(fillBlankAnswers).filter(v => v && v.trim()).length === 0 : Object.keys(studentLabels).length === 0)}
                            style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #4f46e5", background: "#4f46e5", color: "white", fontSize: "12px", fontWeight: 700, cursor: isAnalyzing ? "wait" : "pointer", opacity: (isFillBlank ? Object.values(fillBlankAnswers).filter(v => v && v.trim()).length === 0 : Object.keys(studentLabels).length === 0) ? 0.5 : 1 }}
                        >
                            {isAnalyzing ? "⏳ Analyzing..." : "✅ Submit Answers"}
                        </button>
                        <span style={{ fontSize: "11px", color: "#6366f1", fontWeight: 600 }}>
                            {isFillBlank
                                ? `${Object.values(fillBlankAnswers).filter(v => v && v.trim()).length} answer${Object.values(fillBlankAnswers).filter(v => v && v.trim()).length !== 1 ? 's' : ''} filled`
                                : `${Object.values(studentLabels).flat().length} label${Object.values(studentLabels).flat().length !== 1 ? 's' : ''} placed`}
                        </span>
                    </div>
                )}"""

    if target_7 in content:
        content = content.replace(target_7, replacement_7, 1)
        edits_applied += 1
        print("✅ EDIT7: Updated student controls for both challenge modes")
    else:
        print("❌ EDIT7: Could not find student controls target")

    # ============================================================
    # EDIT 8: In fill-blank mode, show labels as input fields instead of hidden
    # Modify the AI label rendering to show blanks when in fill-blank student mode
    # ============================================================
    target_8 = """                                    style={{...pos, display: (labelsHidden || isStudentChallenge) ? 'none' : 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '8px', border: '2px solid rgba(99,102,241,0.5)', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', fontWeight: 800, fontSize: '13px', color: '#1e1b4b', cursor: 'grab', userSelect: 'none', touchAction: 'none', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif"}}
                                        onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; handleAiLabelMouseDown(panelIdx, labelIdx, e); }}
                                        onDoubleClick={() => handleLabelClick(panelIdx, labelIdx)}
                                        onMouseEnter={() => setHoveredLabelKey(labelKey)}
                                        onMouseLeave={() => setHoveredLabelKey(null)}
                                        title="Drag to move • Double-click to edit"
                                    >
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                defaultValue={label.text}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onBlur={(e) => handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                            />
                                        ) : <span style={{ pointerEvents: 'none' }}>{label.text}</span>}"""

    replacement_8 = """                                    style={{...pos, display: (labelsHidden || (isStudentChallenge && !isFillBlank)) ? 'none' : 'flex', alignItems: 'center', gap: '4px', background: (isStudentChallenge && isFillBlank) ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '8px', border: (isStudentChallenge && isFillBlank) ? '2px solid #86efac' : '2px solid rgba(99,102,241,0.5)', boxShadow: (isStudentChallenge && isFillBlank) ? '0 2px 12px rgba(22,163,74,0.2)' : '0 2px 12px rgba(99,102,241,0.2)', fontWeight: 800, fontSize: '13px', color: '#1e1b4b', cursor: (isStudentChallenge && isFillBlank) ? 'text' : 'grab', userSelect: 'none', touchAction: 'none', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif"}}
                                        onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; if (!(isStudentChallenge && isFillBlank)) handleAiLabelMouseDown(panelIdx, labelIdx, e); }}
                                        onDoubleClick={() => { if (!(isStudentChallenge && isFillBlank)) handleLabelClick(panelIdx, labelIdx); }}
                                        onMouseEnter={() => setHoveredLabelKey(labelKey)}
                                        onMouseLeave={() => setHoveredLabelKey(null)}
                                        title={(isStudentChallenge && isFillBlank) ? "Type the correct label" : "Drag to move • Double-click to edit"}
                                    >
                                        {(isStudentChallenge && isFillBlank) ? (
                                            <input
                                                autoFocus={false}
                                                placeholder={"Label " + (labelIdx + 1) + "..."}
                                                value={fillBlankAnswers[panelIdx + '-' + labelIdx] || ''}
                                                onChange={(e) => setFillBlankAnswers(prev => ({...prev, [panelIdx + '-' + labelIdx]: e.target.value}))}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#166534', width: Math.max(80, (fillBlankAnswers[panelIdx + '-' + labelIdx] || '').length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                                disabled={challengeSubmitted}
                                            />
                                        ) : isEditing ? (
                                            <input
                                                autoFocus
                                                defaultValue={label.text}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onBlur={(e) => handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                            />
                                        ) : <span style={{ pointerEvents: 'none' }}>{label.text}</span>}"""

    if target_8 in content:
        content = content.replace(target_8, replacement_8, 1)
        edits_applied += 1
        print("✅ EDIT8: AI labels render as input fields in fill-blank mode")
    else:
        print("❌ EDIT8: Could not find AI label rendering target")

    # ============================================================
    # EDIT 9: Enrich the result schema in onChallengeSubmit callback
    # ============================================================
    target_9 = """                                        setLabelChallengeResults(prev => [...prev, {
                                            score: result.score || 0,
                                            totalCorrect: result.totalCorrect || 0,
                                            totalExpected: result.totalExpected || 0,
                                            feedback: result.feedback || '',
                                            labelResults: result.labelResults || [],
                                            resourceId: generatedContent?.id,
                                            timestamp: new Date().toISOString()
                                        }]);"""

    replacement_9 = """                                        setLabelChallengeResults(prev => [...prev, {
                                            score: result.score || 0,
                                            totalCorrect: result.totalCorrect || 0,
                                            totalClose: result.totalClose || 0,
                                            totalExpected: result.totalExpected || 0,
                                            feedback: result.feedback || '',
                                            labelResults: result.labelResults || [],
                                            resourceId: generatedContent?.id,
                                            resourceTitle: generatedContent?.data?.visualPlan?.title || '',
                                            panelCount: generatedContent?.data?.visualPlan?.panels?.length || 0,
                                            challengeType: generatedContent?.data?.annotations?.challengeType || 'scratch',
                                            timestamp: new Date().toISOString()
                                        }]);"""

    if target_9 in content:
        content = content.replace(target_9, replacement_9, 1)
        edits_applied += 1
        print("✅ EDIT9: Enriched result schema with totalClose, resourceTitle, panelCount, challengeType")
    else:
        print("❌ EDIT9: Could not find onChallengeSubmit result target")

    # ============================================================
    # EDIT 10: Update comparison view to show totalClose
    # ============================================================
    target_10 = """                        <div style={{ textAlign: "center", padding: "10px 20px", background: "white", borderRadius: "10px", border: "1px solid #d1d5db" }}>
                            <div style={{ fontSize: "28px", fontWeight: 900, color: "#4f46e5" }}>{challengeResult.totalCorrect || 0}/{challengeResult.totalExpected || 0}</div>
                            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Correct</div>
                        </div>
                    </div>"""

    replacement_10 = """                        <div style={{ textAlign: "center", padding: "10px 20px", background: "white", borderRadius: "10px", border: "1px solid #d1d5db" }}>
                            <div style={{ fontSize: "28px", fontWeight: 900, color: "#4f46e5" }}>{challengeResult.totalCorrect || 0}/{challengeResult.totalExpected || 0}</div>
                            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Correct</div>
                        </div>
                        {(challengeResult.totalClose || 0) > 0 && (
                            <div style={{ textAlign: "center", padding: "10px 20px", background: "white", borderRadius: "10px", border: "1px solid #fde68a" }}>
                                <div style={{ fontSize: "28px", fontWeight: 900, color: "#f59e0b" }}>{challengeResult.totalClose}</div>
                                <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>Close</div>
                            </div>
                        )}
                    </div>"""

    if target_10 in content:
        content = content.replace(target_10, replacement_10, 1)
        edits_applied += 1
        print("✅ EDIT10: Added totalClose display in comparison view")
    else:
        print("❌ EDIT10: Could not find comparison view target")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/10 edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
