"""Complete rewrite of label drag using Pointer Events API,
plus center/bold step badges and hide ✕ unless editing.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
fixed = 0

# ============================================================
# FIX 1: Replace the drag system with a simple ref-based approach
# Instead of React state + useEffect + window listeners,
# use a ref + direct DOM event listeners attached synchronously during pointerdown
# ============================================================

# First, find the handleLabelDrag useCallback, handleLabelDragEnd, and useEffect
# and replace them with a simpler ref-based approach

# Find and replace handleLabelDragStart through the useEffect block
drag_start_line = None
drag_effect_end = None

for i, line in enumerate(lines):
    if 'const handleLabelDragStart = (panelIdx, labelId, e) =>' in line:
        drag_start_line = i
    if drag_start_line and i > drag_start_line and 'const handlePanelDragStart' in line:
        drag_effect_end = i
        break

if drag_start_line and drag_effect_end:
    # Replace the entire drag system (handleLabelDragStart through useEffect)
    new_drag_code = """    // Pointer-capture drag system for labels (no React state needed during drag)
    const dragRef = React.useRef(null);
    const handleLabelPointerDown = (panelIdx, labelId, e) => {
        e.preventDefault();
        e.stopPropagation();
        const el = e.currentTarget;
        const container = el.parentElement;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        el.setPointerCapture(e.pointerId);
        const startX = e.clientX;
        const startY = e.clientY;
        const startLabel = (userLabels[panelIdx] || []).find(l => l.id === labelId);
        if (!startLabel) return;
        const origX = startLabel.x;
        const origY = startLabel.y;
        el.style.cursor = 'grabbing';
        
        const onMove = (ev) => {
            const dx = (ev.clientX - startX) / containerRect.width * 100;
            const dy = (ev.clientY - startY) / containerRect.height * 100;
            const newX = Math.max(0, Math.min(90, origX + dx));
            const newY = Math.max(0, Math.min(90, origY + dy));
            el.style.left = newX + '%';
            el.style.top = newY + '%';
            dragRef.current = { panelIdx, labelId, x: newX, y: newY };
        };
        const onUp = () => {
            el.style.cursor = 'grab';
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            el.removeEventListener('pointercancel', onUp);
            if (dragRef.current) {
                setUserLabels(prev => ({
                    ...prev,
                    [dragRef.current.panelIdx]: (prev[dragRef.current.panelIdx] || []).map(l =>
                        l.id === dragRef.current.labelId ? { ...l, x: dragRef.current.x, y: dragRef.current.y } : l
                    )
                }));
                dragRef.current = null;
            }
        };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
    };

"""
    lines[drag_start_line:drag_effect_end] = [new_drag_code]
    fixed += 1
    print(f"[OK] Replaced drag system with pointer-capture at L{drag_start_line+1}")

# Now update the user label onMouseDown to use the new handler
for i, line in enumerate(lines):
    if 'if (e.target.tagName === \'INPUT\') return; e.preventDefault(); e.stopPropagation(); const rect = e.currentTarget.parentElement.getBoundingClientRect()' in line:
        lines[i] = line.replace(
            "onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; e.preventDefault(); e.stopPropagation(); const rect = e.currentTarget.parentElement.getBoundingClientRect(); setDraggingLabel({ panelIdx, labelId: uLabel.id, offsetX: e.clientX, offsetY: e.clientY, rect }); }}",
            "onPointerDown={(e) => { if (e.target.tagName === 'INPUT' || e.target.dataset.action === 'delete' || e.target.dataset.action === 'edit') return; handleLabelPointerDown(panelIdx, uLabel.id, e); }}"
        )
        fixed += 1
        print(f"[OK] Updated user label to use onPointerDown at L{i+1}")
        break

# Also update the text span to use data-action and stopPropagation on pointer
for i, line in enumerate(lines):
    if i > 1700 and 'onMouseDown={(e) => e.stopPropagation()} onClick={() => setEditingLabel' in line:
        lines[i] = line.replace(
            "onMouseDown={(e) => e.stopPropagation()} onClick={() => setEditingLabel",
            "data-action=\"edit\" onPointerDown={(e) => e.stopPropagation()} onClick={() => setEditingLabel"
        )
        fixed += 1
        print(f"[OK] Added data-action to text span at L{i+1}")
        break

# Update delete button
for i, line in enumerate(lines):
    if i > 1700 and 'onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel' in line:
        lines[i] = line.replace(
            "onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel",
            "data-action=\"delete\" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleDeleteUserLabel"
        )
        fixed += 1
        print(f"[OK] Added data-action to delete button at L{i+1}")
        break

# Remove the old cursor: draggingLabel references since we no longer use that state for UI
for i, line in enumerate(lines):
    if i > 1700 and "cursor: draggingLabel ? 'grabbing' : 'grab', userSelect: 'none'" in line and 'visual-label' in lines[i-1]:
        lines[i] = line.replace("cursor: draggingLabel ? 'grabbing' : 'grab', userSelect: 'none'", "cursor: 'grab', userSelect: 'none', touchAction: 'none'")
        fixed += 1
        print(f"[OK] Simplified cursor style at L{i+1}")
        break

# ============================================================
# FIX 2: Center and bold Step badges
# ============================================================
for i, line in enumerate(lines):
    if "panel.role === 'step'" in line and 'Step ${panelIdx + 1}' in line:
        # The role badge is absolute-positioned at top-left. 
        # For "step" role, change to centered above panel.
        break

# Better approach: update the visual-panel-role CSS for step badges
# and change the JSX to make step badges centered
old_role_css = ".visual-panel-role { position: absolute; top: 4px; left: 4px; background: rgba(30,41,59,0.75); color: white; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.3px; backdrop-filter: blur(6px); z-index: 5; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }"
for i, line in enumerate(lines):
    if old_role_css in line:
        # Change from absolute positioned badge to centered static badge above the image
        lines[i] = line.replace(old_role_css,
            ".visual-panel-role { display: block; text-align: center; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; font-size: 12px; font-weight: 800; padding: 4px 0; text-transform: uppercase; letter-spacing: 0.8px; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }")
        fixed += 1
        print(f"[OK] Centered and bolded step badge CSS at L{i+1}")
        break

# ============================================================
# FIX 3: Hide ✕ delete button unless label is being edited/hovered
# Use CSS hover to show the delete button
# ============================================================

# For AI-generated labels: hide ✕ by default, show on hover
# Find the AI label delete span and add a className for CSS targeting
for i, line in enumerate(lines):
    if i > 1760 and i < 1795 and 'onUpdateLabel(panelIdx, labelIdx, null)' in line:
        # Add visibility:hidden by default, visible on parent hover
        if "visibility:" not in lines[i+1]:
            lines[i+1] = lines[i+1].replace(
                "style={{ cursor: 'pointer', fontSize: '12px',",
                "className='label-delete-btn' style={{ cursor: 'pointer', fontSize: '12px', visibility: 'hidden',"
            )
            fixed += 1
            print(f"[OK] Hid AI label delete button by default at L{i+2}")
        break

# For user-created labels: same approach
for i, line in enumerate(lines):
    if i > 1800 and i < 1830 and 'handleDeleteUserLabel' in line and 'data-action="delete"' in line:
        if "visibility:" not in line:
            lines[i] = line.replace(
                "style={{ cursor: 'pointer', fontSize: '14px', lineHeight: 1, color: '#ef4444', opacity: 0.7, padding: '0 2px'",
                "className='label-delete-btn' style={{ cursor: 'pointer', fontSize: '14px', lineHeight: 1, color: '#ef4444', opacity: 0.7, padding: '0 2px', visibility: 'hidden'"
            )
            fixed += 1
            print(f"[OK] Hid user label delete button by default at L{i+1}")
        break

# Add CSS rule: .visual-label:hover .label-delete-btn { visibility: visible }
css_anchor = ".visual-sequence-arrow {"
for i, line in enumerate(lines):
    if css_anchor in line:
        lines[i] = ".visual-label:hover .label-delete-btn { visibility: visible !important; }\n" + line
        fixed += 1
        print(f"[OK] Added hover CSS for delete button visibility at L{i+1}")
        break

open(filepath, 'w', encoding='utf-8').writelines(lines)
print(f"\nDone! {fixed} fixes applied.")
