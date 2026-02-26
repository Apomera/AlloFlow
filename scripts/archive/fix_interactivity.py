"""Comprehensive Visual Panel interactivity enhancements:
1. Fix hide labels - use inline style for reliability  
2. Parse **bold** in captions  
3. Add clear-all + eraser for drawing tools
4. Add "Add Label" button to toolbar
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# ============================================================
# FIX 1: Hide labels - make hidden-label use inline display:none
# The CSS opacity:0 might not be applying. Use inline style instead.
# ============================================================
old_label_class = "className={`visual-label ${labelsHidden ? 'hidden-label' : ''}`}"

# For AI-generated labels - add inline display
old_ai_label = """                                    <div
                                        key={labelIdx}
                                        className={`visual-label ${labelsHidden ? 'hidden-label' : ''}`}
                                        style={{...pos, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '8px', border: '2px solid rgba(99,102,241,0.5)', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', fontWeight: 800, fontSize: '13px', color: '#1e1b4b', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif"}}"""

new_ai_label = """                                    <div
                                        key={labelIdx}
                                        className="visual-label"
                                        style={{...pos, display: labelsHidden ? 'none' : 'block', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: '8px', border: '2px solid rgba(99,102,241,0.5)', boxShadow: '0 2px 12px rgba(99,102,241,0.2)', fontWeight: 800, fontSize: '13px', color: '#1e1b4b', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif"}}"""
if old_ai_label in content:
    content = content.replace(old_ai_label, new_ai_label)
    fixed += 1
    print("[OK] Fixed AI label: use inline display:none when hidden")

# For user-created labels - same fix
old_user_hidden = """className={`visual-label ${labelsHidden ? 'hidden-label' : ''}`}
                                    style={{ position: 'absolute', left: `${uLabel.x}%`, top: `${uLabel.y}%`"""
new_user_hidden = """className="visual-label"
                                    style={{ position: 'absolute', display: labelsHidden ? 'none' : 'block', left: `${uLabel.x}%`, top: `${uLabel.y}%`"""
if old_user_hidden in content:
    content = content.replace(old_user_hidden, new_user_hidden)
    fixed += 1
    print("[OK] Fixed user label: use inline display:none when hidden")

# ============================================================
# FIX 2: Parse **bold** in captions
# Replace the figcaption rendering to parse markdown bold
# ============================================================
old_caption = "{panel.caption && <figcaption className=\"visual-caption\">{panel.caption}</figcaption>}"
new_caption = """{panel.caption && <figcaption className="visual-caption" dangerouslySetInnerHTML={{ __html: panel.caption.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>') }} />}"""
if old_caption in content:
    content = content.replace(old_caption, new_caption)
    fixed += 1
    print("[OK] Added **bold** markdown parsing in captions")

# ============================================================
# FIX 3: Add clear-all + eraser buttons to drawing toolbar
# ============================================================
old_toolbar_end = """                    {['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#1e293b'].map(c => (
                        <div key={c} className={`color-dot ${drawingColor === c ? 'selected' : ''}`} style={{background: c}} onClick={() => setDrawingColor(c)} title={c} />
                    ))}
                </div>"""
new_toolbar_end = """                    {['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#1e293b'].map(c => (
                        <div key={c} className={`color-dot ${drawingColor === c ? 'selected' : ''}`} style={{background: c}} onClick={() => setDrawingColor(c)} title={c} />
                    ))}
                    <button onClick={() => { setDrawings({}); }} title="Clear all drawings" aria-label="Clear all drawings" style={{ marginLeft: 4, color: '#ef4444' }}>🗑️</button>
                </div>"""
if old_toolbar_end in content:
    content = content.replace(old_toolbar_end, new_toolbar_end)
    fixed += 1
    print("[OK] Added clear-all button to drawing toolbar")

# ============================================================
# FIX 4: Add "Add Label" button to the controls toolbar
# Between hide labels and undo/redo
# ============================================================
old_undo = """                <div className="visual-undo-redo">
                    <button onClick={handleUndo} disabled={labelHistoryIndex <= 0} title="Undo label change" aria-label="Undo">↩️</button>
                    <button onClick={handleRedo} disabled={labelHistoryIndex >= labelHistory.length - 1} title="Redo label change" aria-label="Redo">↪️</button>
                </div>"""
new_undo = """                <button
                    aria-label="Add label"
                    onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : 0)}
                    className={addingLabelPanel !== null ? 'active' : ''}
                    title="Click, then click on a panel to place a label"
                >
                    ➕ Add Label
                </button>
                <div className="visual-undo-redo">
                    <button onClick={handleUndo} disabled={labelHistoryIndex <= 0} title="Undo label change" aria-label="Undo">↩️</button>
                    <button onClick={handleRedo} disabled={labelHistoryIndex >= labelHistory.length - 1} title="Redo label change" aria-label="Redo">↪️</button>
                </div>"""
if old_undo in content:
    content = content.replace(old_undo, new_undo)
    fixed += 1
    print("[OK] Added 'Add Label' button to toolbar")

# ============================================================
# FIX 5: Make the panel clickable for adding labels
# The addingLabelPanel state is set but we need to wire up the click handler
# Check if the panel has onClick for add label
# ============================================================
old_panel_wrapper = """<div style={{ position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>"""
new_panel_wrapper = """<div style={{ position: 'relative', overflow: 'hidden', background: '#f1f5f9' }} onClick={(e) => addingLabelPanel === panelIdx && handleAddUserLabel(panelIdx, e)} className={addingLabelPanel === panelIdx ? 'adding-label' : ''}>"""
if old_panel_wrapper in content:
    content = content.replace(old_panel_wrapper, new_panel_wrapper)
    fixed += 1
    print("[OK] Wired up panel click handler for adding labels")

# ============================================================  
# FIX 6: Fix the grid controls wrapping on small screens
# ============================================================
old_controls_css = ".visual-grid-controls { display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-bottom: 8px; }"
new_controls_css = ".visual-grid-controls { display: flex; gap: 6px; align-items: center; justify-content: flex-start; flex-wrap: wrap; margin-bottom: 6px; }"
if old_controls_css in content:
    content = content.replace(old_controls_css, new_controls_css)
    fixed += 1
    print("[OK] Fixed grid controls to wrap on small screens")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
