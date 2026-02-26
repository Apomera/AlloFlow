"""
Consolidate AI and user label behavior:
1. Add state for AI label position overrides
2. Make AI labels draggable via same handleLabelMouseDown pattern
3. Fix delete button: use React onMouseEnter/onMouseLeave instead of CSS hover
   (CSS :hover doesn't work in Gemini Canvas for visibility toggling)
4. Keep AI label text expansion (their styling)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Add aiLabelPositions state and hoveredLabel state
# Insert after the draggingLabel state line
# ============================================================

old_state = "const [draggingLabel, setDraggingLabel] = React.useState(null); // { panelIdx, labelId, startX, startY }"
new_state = """const [draggingLabel, setDraggingLabel] = React.useState(null); // { panelIdx, labelId, startX, startY }
    const [aiLabelPositions, setAiLabelPositions] = React.useState({}); // { 'panelIdx-labelIdx': { left, top } }
    const [hoveredLabelKey, setHoveredLabelKey] = React.useState(null); // key of currently hovered label"""

if old_state in content:
    content = content.replace(old_state, new_state)
    fixed += 1
    print("[OK] FIX 1: Added aiLabelPositions and hoveredLabelKey state")
else:
    print("[WARN] FIX 1: draggingLabel state not found")

# ============================================================
# FIX 2: Add handleAiLabelMouseDown function
# Insert right before the handlePanelDragStart function
# ============================================================

old_panel_drag = "    const handlePanelDragStart = (e, panelIdx) => {"
new_ai_drag = """    // Drag handler for AI-generated labels (stores position overrides)
    const handleAiLabelMouseDown = (panelIdx, labelIdx, e) => {
        e.preventDefault();
        e.stopPropagation();
        const el = e.currentTarget;
        const container = el.parentElement;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const rect = el.getBoundingClientRect();
        const origLeft = ((rect.left - containerRect.left) / containerRect.width) * 100;
        const origTop = ((rect.top - containerRect.top) / containerRect.height) * 100;
        let lastLeft = origLeft, lastTop = origTop;
        let moved = false;
        el.style.cursor = 'grabbing';
        el.style.zIndex = '10';
        el.style.transform = 'none';
        const onMove = (ev) => {
            moved = true;
            const dx = (ev.clientX - startX) / containerRect.width * 100;
            const dy = (ev.clientY - startY) / containerRect.height * 100;
            lastLeft = Math.max(0, Math.min(90, origLeft + dx));
            lastTop = Math.max(0, Math.min(90, origTop + dy));
            el.style.left = lastLeft + '%';
            el.style.top = lastTop + '%';
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            el.style.cursor = 'grab';
            el.style.zIndex = '4';
            if (moved) {
                setAiLabelPositions(prev => ({
                    ...prev,
                    [panelIdx + '-' + labelIdx]: { left: lastLeft + '%', top: lastTop + '%' }
                }));
            }
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const handlePanelDragStart = (e, panelIdx) => {"""

if old_panel_drag in content:
    content = content.replace(old_panel_drag, new_ai_drag, 1)
    fixed += 1
    print("[OK] FIX 2: Added handleAiLabelMouseDown function")
else:
    print("[WARN] FIX 2: handlePanelDragStart not found")

# ============================================================
# FIX 3: Replace AI label JSX to add drag + hover delete
# Replace the entire AI label block
# ============================================================

old_ai_label = """                            {panel.labels && panel.labels.map((label, labelIdx) => {
                                const pos = LABEL_POSITIONS[label.position] || LABEL_POSITIONS['bottom-center'];
                                const isEditing = editingLabel?.panelIdx === panelIdx && editingLabel?.labelIdx === labelIdx;
                                return (
                                    <div
                                        key={labelIdx}
                                        className="visual-label"
                                        style={{...pos, display: labelsHidden ? 'none' : 'block', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '8px', border: '2px solid rgba(99,102,241,0.5)', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', fontWeight: 800, fontSize: '13px', color: '#1e1b4b', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif"}}
                                        onClick={() => handleLabelClick(panelIdx, labelIdx)}
                                        title={'Click to edit label'}
                                    >
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                defaultValue={label.text}
                                                onBlur={(e) => handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                            />
                                        ) : <span style={{ userSelect: 'none' }}>{label.text}</span>}
                                        <span
                                            className="label-delete-btn"
                                            onClick={(e) => { e.stopPropagation(); onUpdateLabel(panelIdx, labelIdx, null); }}
                                            style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', marginLeft: '6px', padding: '0 2px', visibility: 'hidden' }}
                                            title="Remove label"
                                        >\u2715</span>
                                    </div>
                                );
                            })}"""

new_ai_label = """                            {panel.labels && panel.labels.map((label, labelIdx) => {
                                const defaultPos = LABEL_POSITIONS[label.position] || LABEL_POSITIONS['bottom-center'];
                                const overridePos = aiLabelPositions[panelIdx + '-' + labelIdx];
                                const pos = overridePos ? { position: 'absolute', left: overridePos.left, top: overridePos.top } : defaultPos;
                                const isEditing = editingLabel?.panelIdx === panelIdx && editingLabel?.labelIdx === labelIdx;
                                const labelKey = 'ai-' + panelIdx + '-' + labelIdx;
                                const isHovered = hoveredLabelKey === labelKey;
                                return (
                                    <div
                                        key={labelIdx}
                                        className="visual-label"
                                        style={{...pos, display: labelsHidden ? 'none' : 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '8px', border: '2px solid rgba(99,102,241,0.5)', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', fontWeight: 800, fontSize: '13px', color: '#1e1b4b', cursor: 'grab', userSelect: 'none', touchAction: 'none', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif"}}
                                        onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; handleAiLabelMouseDown(panelIdx, labelIdx, e); }}
                                        onDoubleClick={() => handleLabelClick(panelIdx, labelIdx)}
                                        onMouseEnter={() => setHoveredLabelKey(labelKey)}
                                        onMouseLeave={() => setHoveredLabelKey(null)}
                                        title="Drag to move \u2022 Double-click to edit"
                                    >
                                        {isEditing ? (
                                            <input
                                                autoFocus
                                                defaultValue={label.text}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onBlur={(e) => handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleLabelChange(panelIdx, labelIdx, e.target.value)}
                                            />
                                        ) : <span style={{ pointerEvents: 'none' }}>{label.text}</span>}
                                        {isHovered && <span
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => { e.stopPropagation(); onUpdateLabel(panelIdx, labelIdx, null); }}
                                            style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', marginLeft: '6px', padding: '0 2px' }}
                                            title="Remove label"
                                        >\u2715</span>}
                                    </div>
                                );
                            })}"""

if old_ai_label in content:
    content = content.replace(old_ai_label, new_ai_label)
    fixed += 1
    print("[OK] FIX 3: AI labels now draggable with hover delete")
else:
    print("[WARN] FIX 3: AI label block exact match not found")

# ============================================================
# FIX 4: Update user labels to also use React hover for delete
# ============================================================

# Replace user label delete button with conditional render
old_user_delete = """                                    <span
                                        className="label-delete-btn"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                        style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', padding: '0 2px', marginLeft: '4px', visibility: 'hidden' }}
                                        title="Delete label"
                                    >\u2715</span>"""

new_user_delete = """                                    {hoveredLabelKey === ('user-' + panelIdx + '-' + uLabel.id) && <span
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                        style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', padding: '0 2px', marginLeft: '4px' }}
                                        title="Delete label"
                                    >\u2715</span>}"""

if old_user_delete in content:
    content = content.replace(old_user_delete, new_user_delete)
    fixed += 1
    print("[OK] FIX 4a: User label delete now uses React hover")
else:
    print("[WARN] FIX 4a: User label delete block not found")

# Add onMouseEnter/onMouseLeave to user label div
old_user_div = """onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelMouseDown(panelIdx, uLabel.id, e); }}
                                    onDoubleClick={() => setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` })}"""

new_user_div = """onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelMouseDown(panelIdx, uLabel.id, e); }}
                                    onDoubleClick={() => setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` })}
                                    onMouseEnter={() => setHoveredLabelKey('user-' + panelIdx + '-' + uLabel.id)}
                                    onMouseLeave={() => setHoveredLabelKey(null)}"""

if old_user_div in content:
    content = content.replace(old_user_div, new_user_div)
    fixed += 1
    print("[OK] FIX 4b: User labels now use React hover events")
else:
    print("[WARN] FIX 4b: User label div not found")

# ============================================================
# Verify
# ============================================================
new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
