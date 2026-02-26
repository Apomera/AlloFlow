"""Simplify label interaction model:
- Single click + drag = move the label (entire label is draggable)
- Double click = edit text
- Remove the ⠿ handle, it's confusing
- Delete button hidden by default, shows on hover (add className inline)
- Also apply visibility:hidden and className to delete buttons properly
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# ============================================================
# REPLACE user label block entirely for clean state
# ============================================================

old_user_block = """                            {/* User-Created Draggable Labels */}
                            {(userLabels[panelIdx] || []).map((uLabel) => (
                                <div
                                    key={`user-${uLabel.id}`}
                                    className="visual-label"
                                    style={{ position: 'absolute', display: labelsHidden ? 'none' : 'flex', alignItems: 'center', gap: '4px', left: `${uLabel.x}%`, top: `${uLabel.y}%`, borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)', zIndex: 4, padding: '4px 8px', borderRadius: '8px', border: '2px solid rgba(139,92,246,0.5)', boxShadow: '0 2px 8px rgba(139,92,246,0.15)', fontSize: '13px', fontWeight: 700, color: '#1e1b4b', cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
                                    role="note" tabIndex={0} aria-label={uLabel.text}
                                    onPointerDown={(e) => { if (e.target.tagName === 'INPUT' || e.target.dataset.action === 'delete' || e.target.dataset.action === 'edit') return; handleLabelPointerDown(panelIdx, uLabel.id, e); }}
                                >
                                    <span
                                        
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
                                            data-action="edit" onPointerDown={(e) => e.stopPropagation()} onClick={() => setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` })}
                                            style={{ cursor: 'text', userSelect: 'none' }}
                                            title="Click to edit text"
                                        >{uLabel.text}</span>
                                    )}
                                    <span
                                        data-action="delete" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                        style={{ cursor: 'pointer', fontSize: '14px', lineHeight: 1, color: '#ef4444', opacity: 0.7, padding: '0 2px' }}
                                        title="Delete label"
                                    >\u2715</span>
                                </div>
                            ))}"""

new_user_block = """                            {/* User-Created Draggable Labels */}
                            {(userLabels[panelIdx] || []).map((uLabel) => (
                                <div
                                    key={`user-${uLabel.id}`}
                                    className="visual-label"
                                    onPointerDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelPointerDown(panelIdx, uLabel.id, e); }}
                                    onDoubleClick={() => setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` })}
                                    style={{ position: 'absolute', display: labelsHidden ? 'none' : 'flex', alignItems: 'center', gap: '4px', left: `${uLabel.x}%`, top: `${uLabel.y}%`, borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)', zIndex: 4, padding: '4px 8px', borderRadius: '8px', border: '2px solid rgba(139,92,246,0.5)', boxShadow: '0 2px 8px rgba(139,92,246,0.15)', fontSize: '13px', fontWeight: 700, color: '#1e1b4b', cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
                                    role="note" tabIndex={0} aria-label={uLabel.text}
                                    title="Drag to move \u2022 Double-click to edit"
                                >
                                    {editingLabel?.panelIdx === panelIdx && editingLabel?.labelIdx === `user-${uLabel.id}` ? (
                                        <input
                                            autoFocus
                                            defaultValue={uLabel.text}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onBlur={(e) => { handleUserLabelTextChange(panelIdx, uLabel.id, e.target.value); setEditingLabel(null); }}
                                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                            style={{ cursor: 'text', border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, fontSize: '13px', color: '#1e1b4b', width: Math.max(50, uLabel.text.length * 9) + 'px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}
                                        />
                                    ) : (
                                        <span style={{ pointerEvents: 'none' }}>{uLabel.text}</span>
                                    )}
                                    <span
                                        className="label-delete-btn"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                        style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', padding: '0 2px', marginLeft: '4px', visibility: 'hidden' }}
                                        title="Delete label"
                                    >\u2715</span>
                                </div>
                            ))}"""

if old_user_block in content:
    content = content.replace(old_user_block, new_user_block)
    fixed += 1
    print("[OK] Replaced user label block: entire label is draggable, double-click to edit")
else:
    print("[WARN] Exact user label block not found - trying line-by-line approach")
    # Fallback: do targeted replacements
    lines = content.split('\n')
    for i, line in enumerate(lines):
        # Remove the ⠿ span and its container
        if i > 1800 and i < 1820 and '\u2800\u2800\u2800' in line:
            # This is the braille dots line - remove the span
            # Find the span start (2 lines before) and end (this line)
            if '<span' in lines[i-2]:
                lines[i-2] = ''
                lines[i-1] = ''
                lines[i] = ''
                fixed += 1
                print(f"[OK] Removed ⠿ span block at L{i-1}")
    
    for i, line in enumerate(lines):
        # Change text span from click-to-edit to pointerEvents:none (let drag pass through)
        if i > 1800 and 'data-action="edit"' in line and 'onClick' in line:
            lines[i] = '                                        <span style={{ pointerEvents: \'none\' }}>{uLabel.text}</span>\n'
            fixed += 1
            print(f"[OK] Made text span pointer-transparent at L{i+1}")
            break
    
    for i, line in enumerate(lines):
        # Add double-click handler and simplify onPointerDown
        if i > 1800 and 'e.target.dataset.action' in line and 'handleLabelPointerDown' in line:
            lines[i] = "                                    onPointerDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelPointerDown(panelIdx, uLabel.id, e); }}\n"
            fixed += 1
            print(f"[OK] Simplified onPointerDown at L{i+1}")
            break

    for i, line in enumerate(lines):
        if i > 1800 and i < 1810 and 'role="note"' in line and 'onDoubleClick' not in line:
            lines[i] = line.rstrip() + '\n                                    onDoubleClick={() => setEditingLabel({ panelIdx, labelIdx: `user-${uLabel.id}` })}\n'
            fixed += 1
            print(f"[OK] Added onDoubleClick at L{i+1}")
            break

    content = '\n'.join(lines)

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
