"""
Enhancement 1: Anchor Points for teacher labels
 - handleAddUserLabel stores click position as anchor, offsets label text above
 - renderLeaderLines draws to anchor points instead of center
 - renderStudentLeaderLines updated similarly

Enhancement 2: Fill-in-Blank for teacher-added labels
 - userLabels render as blank input fields in fill-blank student mode
 - Collected in fillBlankAnswers with 'user-<panelIdx>-<labelId>' keys
 - handleChallengeSubmit includes teacher label blanks
"""
import sys
import os

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'AlloFlowANTI.txt')

def apply_edits():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    edits_applied = 0

    # ============================================================
    # EDIT 1: handleAddUserLabel - click = anchor, label offsets above
    # ============================================================
    target_1 = """    const handleAddUserLabel = (panelIdx, e) => {
        if (addingLabelPanel === null) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
        const newLabel = { id: Date.now(), text: 'New Label', x: parseFloat(x), y: parseFloat(y) };
        pushVisualSnapshot();
        setUserLabels(prev => ({
            ...prev,
            [panelIdx]: [...(prev[panelIdx] || []), newLabel]
        }));
        setAddingLabelPanel(null);
    };"""

    replacement_1 = """    const handleAddUserLabel = (panelIdx, e) => {
        if (addingLabelPanel === null) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const anchorX = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(1));
        const anchorY = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(1));
        // Label text appears offset above the anchor point for clarity
        const labelY = Math.max(2, anchorY - 12);
        const labelX = Math.max(2, Math.min(85, anchorX - 5));
        const newLabel = { id: Date.now(), text: 'New Label', x: labelX, y: labelY, anchorX, anchorY };
        pushVisualSnapshot();
        setUserLabels(prev => ({
            ...prev,
            [panelIdx]: [...(prev[panelIdx] || []), newLabel]
        }));
        setAddingLabelPanel(null);
    };"""

    if target_1 in content:
        content = content.replace(target_1, replacement_1, 1)
        edits_applied += 1
        print("✅ EDIT1: handleAddUserLabel now stores anchor points")
    else:
        print("❌ EDIT1: Could not find handleAddUserLabel")

    # ============================================================
    # EDIT 2: handleAddStudentLabel - same anchor pattern
    # ============================================================
    target_2 = """    const handleAddStudentLabel = (panelIdx, e) => {
        if (addingLabelPanel === null || !isStudentChallenge) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
        const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
        const newLabel = { id: Date.now(), text: "New Label", x: parseFloat(x), y: parseFloat(y) };
        setStudentLabels(prev => ({ ...prev, [panelIdx]: [...(prev[panelIdx] || []), newLabel] }));
        setAddingLabelPanel(null);
    };"""

    replacement_2 = """    const handleAddStudentLabel = (panelIdx, e) => {
        if (addingLabelPanel === null || !isStudentChallenge) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const anchorX = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(1));
        const anchorY = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(1));
        const labelY = Math.max(2, anchorY - 12);
        const labelX = Math.max(2, Math.min(85, anchorX - 5));
        const newLabel = { id: Date.now(), text: "New Label", x: labelX, y: labelY, anchorX, anchorY };
        setStudentLabels(prev => ({ ...prev, [panelIdx]: [...(prev[panelIdx] || []), newLabel] }));
        setAddingLabelPanel(null);
    };"""

    if target_2 in content:
        content = content.replace(target_2, replacement_2, 1)
        edits_applied += 1
        print("✅ EDIT2: handleAddStudentLabel now stores anchor points")
    else:
        print("❌ EDIT2: Could not find handleAddStudentLabel")

    # ============================================================
    # EDIT 3: renderLeaderLines - use anchor points when available
    # ============================================================
    target_3 = """        const teacherLabels = (userLabels[panelIdx] || []).map(l => ({ x: l.x, y: l.y }));
        const allPoints = [...aiLabels, ...teacherLabels];
        if (allPoints.length === 0) return null;
        return (
            <svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                {allPoints.map((pt, idx) => {
                    const tx = 50, ty = 50;
                    const dist = Math.sqrt((pt.x - tx) ** 2 + (pt.y - ty) ** 2);
                    if (dist < 10) return null;
                    return (
                        <line key={idx} x1={pt.x} y1={pt.y} x2={tx} y2={ty}
                              stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 1.5" opacity={0.6} />
                    );
                })}
            </svg>
        );
    };
    // Leader lines for student-placed labels during challenge
    const renderStudentLeaderLines = (panelIdx) => {
        const labels = studentLabels[panelIdx] || [];
        if (labels.length === 0) return null;
        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                 style={{ position: 'absolute', top: 0, left: 0,
                          width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                {labels.map((label, idx) => {
                    const dist = Math.sqrt((label.x - 50) ** 2 + (label.y - 50) ** 2);
                    if (dist < 10) return null;
                    return (
                        <line key={idx} x1={label.x} y1={label.y} x2={50} y2={50}
                              stroke="#8b5cf6" strokeWidth="0.4"
                              strokeDasharray="1.5 1" opacity={0.5} />
                    );
                })}
            </svg>
        );
    };"""

    replacement_3 = """        const teacherLabels = (userLabels[panelIdx] || []).map(l => ({
            x: l.x, y: l.y,
            anchorX: l.anchorX !== undefined ? l.anchorX : null,
            anchorY: l.anchorY !== undefined ? l.anchorY : null
        }));
        const allPoints = [...aiLabels, ...teacherLabels];
        if (allPoints.length === 0) return null;
        return (
            <svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                {allPoints.map((pt, idx) => {
                    // Use anchor point if available, otherwise fall back to image center
                    const tx = pt.anchorX !== null && pt.anchorX !== undefined ? pt.anchorX : 50;
                    const ty = pt.anchorY !== null && pt.anchorY !== undefined ? pt.anchorY : 50;
                    const dist = Math.sqrt((pt.x - tx) ** 2 + (pt.y - ty) ** 2);
                    if (dist < 5) return null;
                    return (
                        <g key={idx}>
                            <line x1={pt.x} y1={pt.y} x2={tx} y2={ty}
                                  stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 1.5" opacity={0.6} />
                            {pt.anchorX !== null && pt.anchorX !== undefined && (
                                <circle cx={tx} cy={ty} r="1.2" fill="#6366f1" opacity={0.7} />
                            )}
                        </g>
                    );
                })}
            </svg>
        );
    };
    // Leader lines for student-placed labels during challenge
    const renderStudentLeaderLines = (panelIdx) => {
        const labels = studentLabels[panelIdx] || [];
        if (labels.length === 0) return null;
        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                 style={{ position: 'absolute', top: 0, left: 0,
                          width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                {labels.map((label, idx) => {
                    const tx = label.anchorX !== undefined ? label.anchorX : 50;
                    const ty = label.anchorY !== undefined ? label.anchorY : 50;
                    const dist = Math.sqrt((label.x - tx) ** 2 + (label.y - ty) ** 2);
                    if (dist < 5) return null;
                    return (
                        <g key={idx}>
                            <line x1={label.x} y1={label.y} x2={tx} y2={ty}
                                  stroke="#8b5cf6" strokeWidth="0.4"
                                  strokeDasharray="1.5 1" opacity={0.5} />
                            <circle cx={tx} cy={ty} r="1" fill="#8b5cf6" opacity={0.6} />
                        </g>
                    );
                })}
            </svg>
        );
    };"""

    if target_3 in content:
        content = content.replace(target_3, replacement_3, 1)
        edits_applied += 1
        print("✅ EDIT3: renderLeaderLines + renderStudentLeaderLines use anchor points with dots")
    else:
        print("❌ EDIT3: Could not find renderLeaderLines")

    # ============================================================
    # EDIT 4: User-Created Labels - show as fill-in-blank in challenge
    # ============================================================
    target_4 = """                            {/* User-Created Draggable Labels */}
                            {(userLabels[panelIdx] || []).map((uLabel) => (
                                <div
                                    key={`user-${uLabel.id}`}
                                    className="visual-label"
                                    onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelMouseDown(panelIdx, uLabel.id, e); }}
                                    onDoubleClick={() => setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` })}
                                    onMouseEnter={() => setHoveredLabelKey('user-' + panelIdx + '-' + uLabel.id)}
                                    onMouseLeave={() => setHoveredLabelKey(null)}
                                    style={{ position: 'absolute', display: (labelsHidden || isStudentChallenge) ? 'none' : 'flex', alignItems: 'center', gap: '4px', left: `${uLabel.x}%`, top: `${uLabel.y}%`, borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)', zIndex: 4, padding: '4px 10px', borderRadius: '8px', border: '2px solid rgba(139,92,246,0.5)', boxShadow: '0 2px 8px rgba(139,92,246,0.15)', fontSize: '13px', fontWeight: 700, color: '#1e1b4b', cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
                                    role="note" tabIndex={0} aria-label={uLabel.text}
                                    title="Drag to move • Double-click to edit"
                                >
                                    {editingLabel?.panelIdx === panelIdx && editingLabel?.labelIdx === `user-${uLabel.id}` ? (
                                        <input
                                            autoFocus
                                            defaultValue={uLabel.text}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onBlur={(e) => { handleUserLabelTextChange(panelIdx, uLabel.id, e.target.value); setEditingLabel(null); }}
                                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                            style={{ cursor: 'text', border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, fontSize: '13px', color: '#1e1b4b', width: Math.max(50, uLabel.text.length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                        />
                                    ) : (
                                        <span style={{ pointerEvents: 'none' }}>{uLabel.text}</span>
                                    )}
                                    {hoveredLabelKey === ('user-' + panelIdx + '-' + uLabel.id) && <span
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                        style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', padding: '0 2px', marginLeft: '4px' }}
                                        title="Delete label"
                                    >✕</span>}
                                </div>
                            ))}"""

    replacement_4 = """                            {/* User-Created Draggable Labels */}
                            {(userLabels[panelIdx] || []).map((uLabel, uIdx) => {
                                const fillKey = 'user-' + panelIdx + '-' + uLabel.id;
                                const isUserFillBlank = isStudentChallenge && isFillBlank;
                                return (
                                <div
                                    key={`user-${uLabel.id}`}
                                    className="visual-label"
                                    onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; if (!isUserFillBlank) handleLabelMouseDown(panelIdx, uLabel.id, e); }}
                                    onDoubleClick={() => { if (!isUserFillBlank) setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` }); }}
                                    onMouseEnter={() => setHoveredLabelKey('user-' + panelIdx + '-' + uLabel.id)}
                                    onMouseLeave={() => setHoveredLabelKey(null)}
                                    style={{ position: 'absolute', display: (labelsHidden || (isStudentChallenge && !isFillBlank)) ? 'none' : 'flex', alignItems: 'center', gap: '4px', left: `${uLabel.x}%`, top: `${uLabel.y}%`, borderColor: isUserFillBlank ? '#86efac' : '#8b5cf6', background: isUserFillBlank ? 'rgba(255,255,255,0.95)' : 'rgba(245,243,255,0.95)', zIndex: 4, padding: '4px 10px', borderRadius: '8px', border: isUserFillBlank ? '2px solid #86efac' : '2px solid rgba(139,92,246,0.5)', boxShadow: isUserFillBlank ? '0 2px 12px rgba(22,163,74,0.2)' : '0 2px 8px rgba(139,92,246,0.15)', fontSize: '13px', fontWeight: 700, color: '#1e1b4b', cursor: isUserFillBlank ? 'text' : 'grab', userSelect: 'none', touchAction: 'none' }}
                                    role="note" tabIndex={0} aria-label={isUserFillBlank ? 'Fill in this label' : uLabel.text}
                                    title={isUserFillBlank ? "Type the correct label" : "Drag to move • Double-click to edit"}
                                >
                                    {isUserFillBlank ? (
                                        <input
                                            autoFocus={false}
                                            placeholder={"Label..."}
                                            value={fillBlankAnswers[fillKey] || ''}
                                            onChange={(e) => setFillBlankAnswers(prev => ({...prev, [fillKey]: e.target.value}))}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#166534', width: Math.max(80, (fillBlankAnswers[fillKey] || '').length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                            disabled={challengeSubmitted}
                                        />
                                    ) : editingLabel?.panelIdx === panelIdx && editingLabel?.labelIdx === `user-${uLabel.id}` ? (
                                        <input
                                            autoFocus
                                            defaultValue={uLabel.text}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onBlur={(e) => { handleUserLabelTextChange(panelIdx, uLabel.id, e.target.value); setEditingLabel(null); }}
                                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                            style={{ cursor: 'text', border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, fontSize: '13px', color: '#1e1b4b', width: Math.max(50, uLabel.text.length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                        />
                                    ) : (
                                        <span style={{ pointerEvents: 'none' }}>{uLabel.text}</span>
                                    )}
                                    {!isUserFillBlank && hoveredLabelKey === ('user-' + panelIdx + '-' + uLabel.id) && <span
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                        style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', padding: '0 2px', marginLeft: '4px' }}
                                        title="Delete label"
                                    >✕</span>}
                                </div>
                            ); })}"""

    if target_4 in content:
        content = content.replace(target_4, replacement_4, 1)
        edits_applied += 1
        print("✅ EDIT4: userLabels render as fill-in-blank inputs in student challenge mode")
    else:
        print("❌ EDIT4: Could not find userLabels rendering")

    # ============================================================
    # EDIT 5: handleChallengeSubmit - include teacher label blanks in fill-blank mode
    # ============================================================
    target_5 = """            // Collect student answers based on challenge type
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
                    });"""

    replacement_5 = """            // Collect student answers based on challenge type
            let studentLabelsList;
            if (isFillBlank) {
                // Fill-in-blank: collect from fillBlankAnswers keyed by panel-labelIdx (AI) or user-panel-labelId (teacher)
                studentLabelsList = Object.entries(fillBlankAnswers)
                    .filter(([, text]) => text && text.trim())
                    .map(([key, text]) => {
                        if (key.startsWith('user-')) {
                            // Teacher-added label: key is 'user-panelIdx-labelId'
                            const parts = key.split('-');
                            const panel = parseInt(parts[1]);
                            const labelId = parseInt(parts[2]);
                            const teacherLabel = (userLabels[panel] || []).find(l => l.id === labelId);
                            return { panel, text: text.trim(), position: teacherLabel?.text ? 'at: ' + teacherLabel.text : '', source: 'teacher-label' };
                        }
                        // AI label: key is 'panelIdx-labelIdx'
                        const [panelStr, labelIdxStr] = key.split('-');
                        const panel = parseInt(panelStr);
                        const teacherLabel = teacherLabelsList.find(t => t.panel === panel && t.labelIdx === parseInt(labelIdxStr));
                        return { panel, text: text.trim(), position: teacherLabel?.text ? 'at: ' + teacherLabel.text : '', source: 'ai-label' };
                    });"""

    if target_5 in content:
        content = content.replace(target_5, replacement_5, 1)
        edits_applied += 1
        print("✅ EDIT5: handleChallengeSubmit collects both AI and teacher label fill-in-blank answers")
    else:
        print("❌ EDIT5: Could not find fill-blank collection target")

    # ============================================================
    # EDIT 6: Also show leader lines in fill-blank student mode
    # The current condition hides leader lines during student challenge
    # ============================================================
    target_6 = """                            {!labelsHidden && !isStudentChallenge && renderLeaderLines(panel, panelIdx)}"""

    replacement_6 = """                            {!labelsHidden && (!isStudentChallenge || isFillBlank) && renderLeaderLines(panel, panelIdx)}"""

    if target_6 in content:
        content = content.replace(target_6, replacement_6, 1)
        edits_applied += 1
        print("✅ EDIT6: Leader lines visible in fill-blank mode")
    else:
        print("❌ EDIT6: Could not find leader lines visibility condition")

    # Write
    if edits_applied > 0:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n✅ Done! {edits_applied}/6 edit(s) applied.")
    else:
        print("\n❌ No edits applied.")
    return edits_applied

if __name__ == '__main__':
    edits = apply_edits()
    sys.exit(0 if edits > 0 else 1)
