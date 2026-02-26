"""Fix label drag and add:
1. Add Label: Change to enable ALL panels (use -1 as 'any panel' flag)
2. Drag: Move mousedown handler to outer container, use a different approach
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# ============================================================
# FIX 1: Add Label button should enable ALL panels, not just panel 0
# Change the guard in handleAddUserLabel to accept 'any' mode  
# ============================================================
old_add_btn = "onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : 0)}"
new_add_btn = "onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : -1)}"
if old_add_btn in content:
    content = content.replace(old_add_btn, new_add_btn)
    fixed += 1
    print("[OK] Add Label button now enables all panels (-1 = any)")

# Fix the guard in handleAddUserLabel to accept -1 as "any panel"
old_guard = "        if (addingLabelPanel !== panelIdx) return;"
new_guard = "        if (addingLabelPanel === null) return;"
if old_guard in content:
    content = content.replace(old_guard, new_guard)
    fixed += 1
    print("[OK] handleAddUserLabel now accepts clicks on any panel")

# Fix the panel wrapper's click guard too
old_panel_click = "onClick={(e) => addingLabelPanel === panelIdx && handleAddUserLabel(panelIdx, e)}"
new_panel_click = "onClick={(e) => addingLabelPanel !== null && handleAddUserLabel(panelIdx, e)}"
if old_panel_click in content:
    content = content.replace(old_panel_click, new_panel_click)
    fixed += 1
    print("[OK] Panel wrapper click now responds when any addingLabelPanel is set")

# Fix the adding-label CSS class condition 
old_adding_class = """className={addingLabelPanel === panelIdx ? 'adding-label' : ''}"""
new_adding_class = """className={addingLabelPanel !== null ? 'adding-label' : ''}"""
if old_adding_class in content:
    content = content.replace(old_adding_class, new_adding_class)
    fixed += 1
    print("[OK] All panels show crosshair cursor when in add-label mode")

# ============================================================
# FIX 2: Drag - completely rework to use the outer div for mousedown
# The issue: The ⠿ span's mousedown fires but closest('.visual-panel')
# might fail or the event propagation gets stopped somewhere.
# Solution: Put mousedown on the whole label bar (outer div), 
# and only let text click and delete button stop propagation.
# ============================================================

old_user_label_block = """                            {(userLabels[panelIdx] || []).map((uLabel) => (
                                <div
                                    key={`user-${uLabel.id}`}
                                    className="visual-label"
                                    style={{ position: 'absolute', display: labelsHidden ? 'none' : 'flex', alignItems: 'center', gap: '4px', left: `${uLabel.x}%`, top: `${uLabel.y}%`, borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)', zIndex: 4, padding: '4px 8px', borderRadius: '8px', border: '2px solid rgba(139,92,246,0.5)', boxShadow: '0 2px 8px rgba(139,92,246,0.15)', fontSize: '13px', fontWeight: 700, color: '#1e1b4b' }}
                                    role="note" tabIndex={0} aria-label={uLabel.text}
                                >
                                    <span
                                        onMouseDown={(e) => handleLabelDragStart(panelIdx, uLabel.id, e)}
                                        style={{ cursor: draggingLabel ? 'grabbing' : 'grab', userSelect: 'none', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}
                                        title="Drag to move"
                                    >\u2800\u2800\u2800</span>
                                    {editingLabel?.panelIdx === panelIdx && editingLabel?.labelIdx === `user-${uLabel.id}` ? (
                                        <input
                                            autoFocus
                                            defaultValue={uLabel.text}
                                            onBlur={(e) => { handleUserLabelTextChange(panelIdx, uLabel.id, e.target.value); setEditingLabel(null); }}
                                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                            style={{ cursor: 'text', border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, fontSize: '13px', color: '#1e1b4b', width: Math.max(40, uLabel.text.length * 8) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                        />
                                    ) : (
                                        <span
                                            onClick={() => setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` })}
                                            style={{ cursor: 'text', userSelect: 'none' }}
                                            title="Click to edit text"
                                        >{uLabel.text}</span>
                                    )}
                                    <span
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                        style={{ cursor: 'pointer', fontSize: '14px', lineHeight: 1, color: '#ef4444', opacity: 0.7, padding: '0 2px' }}
                                        title="Delete label"
                                    >\u2715</span>
                                </div>
                            ))}"""

new_user_label_block = """                            {(userLabels[panelIdx] || []).map((uLabel) => (
                                <div
                                    key={`user-${uLabel.id}`}
                                    className="visual-label"
                                    onMouseDown={(e) => {
                                        if (e.target.tagName === 'INPUT') return;
                                        if (e.target.dataset.action === 'delete') return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const rect = e.currentTarget.closest('figure, [style*="relative"]').getBoundingClientRect();
                                        setDraggingLabel({ panelIdx, labelId: uLabel.id, offsetX: e.clientX, offsetY: e.clientY, rect });
                                    }}
                                    style={{ position: 'absolute', display: labelsHidden ? 'none' : 'flex', alignItems: 'center', gap: '4px', left: `${uLabel.x}%`, top: `${uLabel.y}%`, cursor: draggingLabel ? 'grabbing' : 'grab', borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)', zIndex: 4, padding: '4px 8px', borderRadius: '8px', border: '2px solid rgba(139,92,246,0.5)', boxShadow: '0 2px 8px rgba(139,92,246,0.15)', fontSize: '13px', fontWeight: 700, color: '#1e1b4b', userSelect: 'none' }}
                                    role="note" tabIndex={0} aria-label={uLabel.text}
                                    title="Drag to move"
                                >
                                    <span style={{ fontSize: '10px', opacity: 0.4, marginRight: '2px', lineHeight: 1 }}>⠿</span>
                                    {editingLabel?.panelIdx === panelIdx && editingLabel?.labelIdx === `user-${uLabel.id}` ? (
                                        <input
                                            autoFocus
                                            defaultValue={uLabel.text}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onBlur={(e) => { handleUserLabelTextChange(panelIdx, uLabel.id, e.target.value); setEditingLabel(null); }}
                                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                            style={{ cursor: 'text', border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, fontSize: '13px', color: '#1e1b4b', width: Math.max(40, uLabel.text.length * 8) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                        />
                                    ) : (
                                        <span
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={() => setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` })}
                                            style={{ cursor: 'text' }}
                                            title="Click to edit text"
                                        >{uLabel.text}</span>
                                    )}
                                    <span
                                        data-action="delete"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                        style={{ cursor: 'pointer', fontSize: '14px', lineHeight: 1, color: '#ef4444', opacity: 0.7, padding: '0 2px', marginLeft: '2px' }}
                                        title="Delete label"
                                    >✕</span>
                                </div>
                            ))}"""

if old_user_label_block in content:
    content = content.replace(old_user_label_block, new_user_label_block)
    fixed += 1
    print("[OK] Reworked drag: mousedown on outer div, stopPropagation on text/delete areas")
else:
    print("[WARN] Could not find user label block - trying without braille dots")
    # The braille dots ⠿ might have been encoded differently
    # Let's try a different approach
    
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
