"""
Comprehensive fix - all content.replace(), no line injection:
1. Hide ✕ on AI labels (add visibility:hidden + className)
2. Polish header toolbar with proper styled buttons
3. Ensure drag works (add console.log for debugging)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Hide ✕ on AI-generated labels until hover
# Add className="label-delete-btn" and visibility: 'hidden' 
# ============================================================

old_ai_delete = """<span
                                            onClick={(e) => { e.stopPropagation(); onUpdateLabel(panelIdx, labelIdx, null); }}
                                            style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', opacity: 0.6, marginLeft: '6px', padding: '0 2px' }}
                                            title="Remove label"
                                        >\u2715</span>"""

new_ai_delete = """<span
                                            className="label-delete-btn"
                                            onClick={(e) => { e.stopPropagation(); onUpdateLabel(panelIdx, labelIdx, null); }}
                                            style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', marginLeft: '6px', padding: '0 2px', visibility: 'hidden' }}
                                            title="Remove label"
                                        >\u2715</span>"""

if old_ai_delete in content:
    content = content.replace(old_ai_delete, new_ai_delete)
    fixed += 1
    print("[OK] FIX 1: Hidden AI label delete button, added label-delete-btn class")
else:
    print("[WARN] FIX 1: AI delete button exact match not found")
    # Try a simpler match
    simple_old = "style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', opacity: 0.6, marginLeft: '6px', padding: '0 2px' }}"
    simple_new = "className=\"label-delete-btn\" style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', marginLeft: '6px', padding: '0 2px', visibility: 'hidden' }}"
    if simple_old in content:
        content = content.replace(simple_old, simple_new, 1)
        fixed += 1
        print("[OK] FIX 1 (fallback): Hidden AI label delete button")
    else:
        print("[ERROR] FIX 1: Could not find AI delete button style")

# ============================================================
# FIX 2: Polish header toolbar
# Replace plain emoji buttons with styled, grouped toolbar
# ============================================================

old_header = """<div className="visual-grid-controls">
                <button
                    aria-label="Toggle labels"
                    onClick={() => setLabelsHidden(!labelsHidden)}
                    className={labelsHidden ? 'active' : ''}
                    title={labelsHidden ? 'Show Labels' : 'Hide Labels (Self-Test)'}
                >
                    {labelsHidden ? '\U0001f441\ufe0f' : '\U0001f3f7\ufe0f'} {labelsHidden ? 'Show Labels' : 'Hide Labels'}
                </button>
                <button
                    aria-label="Add label"
                    onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : -1)}
                    className={addingLabelPanel !== null ? 'active' : ''}
                    title="Click, then click on a panel to place a label"
                >
                    \u2795 Add Label
                </button>
                <div className="visual-undo-redo">
                    <button onClick={handleUndo} disabled={labelHistoryIndex <= 0} title="Undo label change" aria-label="Undo">\u21a9\ufe0f</button>
                    <button onClick={handleRedo} disabled={labelHistoryIndex >= labelHistory.length - 1} title="Redo label change" aria-label="Redo">\u21aa\ufe0f</button>
                </div>
                <div className="drawing-toolbar">
                    <button onClick={() => setDrawingMode(drawingMode === 'freehand' ? null : 'freehand')} className={drawingMode === 'freehand' ? 'active' : ''} title="Freehand draw" aria-label="Freehand draw">\u270f\ufe0f</button>
                    <button onClick={() => setDrawingMode(drawingMode === 'arrow' ? null : 'arrow')} className={drawingMode === 'arrow' ? 'active' : ''} title="Draw arrow" aria-label="Draw arrow">\u27a1\ufe0f</button>
                    <button onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')} className={drawingMode === 'circle' ? 'active' : ''} title="Draw circle" aria-label="Draw circle">\u2b55</button>
                    <button onClick={() => setDrawingMode(drawingMode === 'highlight' ? null : 'highlight')} className={drawingMode === 'highlight' ? 'active' : ''} title="Highlighter" aria-label="Highlighter">\U0001f58d\ufe0f</button>
                    {['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#1e293b'].map(c => (
                        <div key={c} className={`color-dot ${drawingColor === c ? 'selected' : ''}`} style={{background: c}} onClick={() => setDrawingColor(c)} title={c} />
                    ))}
                    <button onClick={() => { setDrawings({}); }} title="Clear all drawings" aria-label="Clear all drawings" style={{ marginLeft: 4, color: '#ef4444' }}>\U0001f5d1\ufe0f</button>
                </div>
            </div>"""

new_header = """<div className="visual-grid-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 12px', background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                        aria-label="Toggle labels"
                        onClick={() => setLabelsHidden(!labelsHidden)}
                        className={labelsHidden ? 'active' : ''}
                        title={labelsHidden ? 'Show Labels' : 'Hide Labels (Self-Test)'}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: labelsHidden ? '#4f46e5' : 'white', color: labelsHidden ? 'white' : '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        {labelsHidden ? '\U0001f441\ufe0f Show' : '\U0001f3f7\ufe0f Labels'}
                    </button>
                    <button
                        aria-label="Add label"
                        onClick={() => setAddingLabelPanel(addingLabelPanel !== null ? null : -1)}
                        className={addingLabelPanel !== null ? 'active' : ''}
                        title="Click, then click on a panel to place a label"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: addingLabelPanel !== null ? '#4f46e5' : 'white', color: addingLabelPanel !== null ? 'white' : '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        \u2795 Add Label
                    </button>
                </div>
                <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <button onClick={handleUndo} disabled={labelHistoryIndex <= 0} title="Undo" aria-label="Undo" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '14px', opacity: labelHistoryIndex <= 0 ? 0.4 : 1 }}>\u21a9\ufe0f</button>
                    <button onClick={handleRedo} disabled={labelHistoryIndex >= labelHistory.length - 1} title="Redo" aria-label="Redo" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '14px', opacity: labelHistoryIndex >= labelHistory.length - 1 ? 0.4 : 1 }}>\u21aa\ufe0f</button>
                </div>
                <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <button onClick={() => setDrawingMode(drawingMode === 'freehand' ? null : 'freehand')} className={drawingMode === 'freehand' ? 'active' : ''} title="Freehand draw" aria-label="Freehand draw" style={{ padding: '4px 8px', borderRadius: '6px', border: drawingMode === 'freehand' ? '1px solid #4f46e5' : '1px solid #e2e8f0', background: drawingMode === 'freehand' ? '#eef2ff' : 'white', cursor: 'pointer', fontSize: '14px' }}>\u270f\ufe0f</button>
                    <button onClick={() => setDrawingMode(drawingMode === 'arrow' ? null : 'arrow')} className={drawingMode === 'arrow' ? 'active' : ''} title="Draw arrow" aria-label="Draw arrow" style={{ padding: '4px 8px', borderRadius: '6px', border: drawingMode === 'arrow' ? '1px solid #4f46e5' : '1px solid #e2e8f0', background: drawingMode === 'arrow' ? '#eef2ff' : 'white', cursor: 'pointer', fontSize: '14px' }}>\u27a1\ufe0f</button>
                    <button onClick={() => setDrawingMode(drawingMode === 'circle' ? null : 'circle')} className={drawingMode === 'circle' ? 'active' : ''} title="Draw circle" aria-label="Draw circle" style={{ padding: '4px 8px', borderRadius: '6px', border: drawingMode === 'circle' ? '1px solid #4f46e5' : '1px solid #e2e8f0', background: drawingMode === 'circle' ? '#eef2ff' : 'white', cursor: 'pointer', fontSize: '14px' }}>\u2b55</button>
                    <button onClick={() => setDrawingMode(drawingMode === 'highlight' ? null : 'highlight')} className={drawingMode === 'highlight' ? 'active' : ''} title="Highlighter" aria-label="Highlighter" style={{ padding: '4px 8px', borderRadius: '6px', border: drawingMode === 'highlight' ? '1px solid #4f46e5' : '1px solid #e2e8f0', background: drawingMode === 'highlight' ? '#eef2ff' : 'white', cursor: 'pointer', fontSize: '14px' }}>\U0001f58d\ufe0f</button>
                </div>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    {['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#1e293b'].map(c => (
                        <div key={c} onClick={() => setDrawingColor(c)} title={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: drawingColor === c ? '2px solid #1e293b' : '2px solid transparent', cursor: 'pointer', transition: 'transform 0.15s', transform: drawingColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                    ))}
                </div>
                <button onClick={() => { setDrawings({}); }} title="Clear drawings" aria-label="Clear all drawings" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff1f2', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600, marginLeft: 'auto' }}>\U0001f5d1\ufe0f Clear</button>
            </div>"""

if old_header in content:
    content = content.replace(old_header, new_header)
    fixed += 1
    print("[OK] FIX 2: Polished header toolbar with grouped buttons and dividers")
else:
    print("[WARN] FIX 2: Header toolbar exact match not found")

# ============================================================
# Verify
# ============================================================
new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
