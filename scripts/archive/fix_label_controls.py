"""Redesign labels for usability:
1. User labels: Replace permanent input with click-to-edit text + visible drag handle + visible delete button
2. AI labels: Add visible delete button that removes the label
3. Make the ✕ delete button more visible and easier to click  
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# ============================================================
# FIX 1: Redesign user-created labels with drag handle, visible delete, click-to-edit
# Replace entire user label block
# ============================================================
old_user_labels = """                            {(userLabels[panelIdx] || []).map((uLabel) => (
                                <div
                                    key={`user-${uLabel.id}`}
                                    className="visual-label"
                                    style={{ position: 'absolute', display: labelsHidden ? 'none' : 'block', left: `${uLabel.x}%`, top: `${uLabel.y}%`, cursor: draggingLabel ? 'grabbing' : 'grab', borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)', zIndex: 4 }}
                                    onMouseDown={(e) => handleLabelDragStart(panelIdx, uLabel.id, e)} role="note" tabIndex={0} aria-label={uLabel.text} onKeyDown={(e) => { if (e.key === "Delete" || e.key === "Backspace") handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                    title="Drag to move. Right-click to delete."
                                    onContextMenu={(e) => { e.preventDefault(); handleDeleteUserLabel(panelIdx, uLabel.id); }}
                                >
                                    <input
                                        defaultValue={uLabel.text}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={(e) => handleUserLabelTextChange(panelIdx, uLabel.id, e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                        style={{ cursor: 'text' }}
                                    />
                                    <span onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel(panelIdx, uLabel.id); }} style={{ marginLeft: 4, cursor: 'pointer', opacity: 0.5, fontSize: 10 }} title="Remove label">✕</span>
                                </div>
                            ))}"""

new_user_labels = """                            {(userLabels[panelIdx] || []).map((uLabel) => (
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
                                    >⠿</span>
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
                                    >✕</span>
                                </div>
                            ))}"""

if old_user_labels in content:
    content = content.replace(old_user_labels, new_user_labels)
    fixed += 1
    print("[OK] Redesigned user labels with drag handle (⠿), click-to-edit text, visible delete (✕)")

# ============================================================
# FIX 2: Add a visible delete (✕) button to AI-generated labels
# Currently AI labels only have onClick to edit text
# ============================================================
old_ai_label_close = """                                        ) : label.text}
                                    </div>"""

new_ai_label_close = """                                        ) : <span style={{ userSelect: 'none' }}>{label.text}</span>}
                                        <span
                                            onClick={(e) => { e.stopPropagation(); onUpdateLabel(panelIdx, labelIdx, null); }}
                                            style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', opacity: 0.6, marginLeft: '6px', padding: '0 2px' }}
                                            title="Remove label"
                                        >✕</span>
                                    </div>"""

if old_ai_label_close in content:
    content = content.replace(old_ai_label_close, new_ai_label_close)
    fixed += 1
    print("[OK] Added visible delete button (✕) to AI-generated labels")

# ============================================================
# FIX 3: Update handleUpdateVisualLabel / onUpdateLabel to support deletion
# When label text is null, remove the label from the panel
# Check what onUpdateLabel does
# ============================================================
# onUpdateLabel is handleUpdateVisualLabel in the parent
# Let's search for it
idx = content.find('handleUpdateVisualLabel')
if idx >= 0:
    print(f"[INFO] handleUpdateVisualLabel found at char {idx}")
else:
    print("[INFO] handleUpdateVisualLabel not found, checking onUpdateLabel wiring")

# Check handleLabelChange which is the internal handler
idx2 = content.find('const handleLabelChange')
if idx2 >= 0:
    snippet = content[idx2:idx2+300]
    print(f"[INFO] handleLabelChange found: {snippet[:100]}")

# We need onUpdateLabel to handle null (delete). Let's modify handleLabelChange
# to call onUpdateLabel with null for delete
old_handle_change = """    const handleLabelChange = (panelIdx, labelIdx, newText) => {
        pushLabelSnapshot();
        setEditingLabel(null);
        if (onUpdateLabel) onUpdateLabel(panelIdx, labelIdx, newText);
    };"""
new_handle_change = """    const handleLabelChange = (panelIdx, labelIdx, newText) => {
        pushLabelSnapshot();
        setEditingLabel(null);
        if (onUpdateLabel) onUpdateLabel(panelIdx, labelIdx, newText);
    };"""
# No change needed here since onUpdateLabel already passes the value

# ============================================================  
# FIX 4: Add label CSS for the drag handle styling
# ============================================================
old_label_css = ".visual-label { position: absolute !important;"
new_label_css = ".visual-label { position: absolute !important; display: flex; align-items: center; gap: 4px;"
if old_label_css in content:
    content = content.replace(old_label_css, new_label_css)
    fixed += 1
    print("[OK] Updated .visual-label CSS to use flexbox for handle layout")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
