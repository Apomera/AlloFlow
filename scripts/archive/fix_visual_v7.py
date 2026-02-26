"""
Clean comprehensive fix - ONLY uses content.replace() to avoid line-ending issues.
No line injection, no readlines/writelines.

Changes:
1. Replace setPointerCapture drag with document.addEventListener
2. Swap onPointerDown to onMouseDown on labels  
3. Add inline centering to step badge
4. Add CSS for centered captions
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
original_len = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Replace pointer-capture drag with document.addEventListener
# This is an EXACT string-for-string replacement
# ============================================================

old_drag = """    // Pointer-capture drag system for labels (no React state needed during drag)
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
    };"""

new_drag = """    // Document-level drag system for labels (Gemini Canvas compatible)
    const handleLabelMouseDown = (panelIdx, labelId, e) => {
        e.preventDefault();
        e.stopPropagation();
        const el = e.currentTarget;
        const container = el.parentElement;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLabel = (userLabels[panelIdx] || []).find(l => l.id === labelId);
        if (!startLabel) return;
        const origX = startLabel.x;
        const origY = startLabel.y;
        let lastX = origX, lastY = origY;
        el.style.cursor = 'grabbing';
        el.style.zIndex = '10';
        const onMove = (ev) => {
            const dx = (ev.clientX - startX) / containerRect.width * 100;
            const dy = (ev.clientY - startY) / containerRect.height * 100;
            lastX = Math.max(0, Math.min(90, origX + dx));
            lastY = Math.max(0, Math.min(90, origY + dy));
            el.style.left = lastX + '%';
            el.style.top = lastY + '%';
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            el.style.cursor = 'grab';
            el.style.zIndex = '4';
            setUserLabels(prev => ({
                ...prev,
                [panelIdx]: (prev[panelIdx] || []).map(l =>
                    l.id === labelId ? { ...l, x: lastX, y: lastY } : l
                )
            }));
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };"""

if old_drag in content:
    content = content.replace(old_drag, new_drag)
    fixed += 1
    print("[OK] FIX 1: Replaced pointer-capture drag with document.addEventListener")
else:
    print("[WARN] FIX 1: Exact drag block not found - checking if already updated")
    if 'handleLabelMouseDown' in content:
        print("  -> Already updated to handleLabelMouseDown")
    elif 'setPointerCapture' in content:
        print("  -> setPointerCapture still present but exact match failed")

# ============================================================
# FIX 2: Update user label JSX from onPointerDown to onMouseDown
# ============================================================

old_handler_call = "onPointerDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelPointerDown(panelIdx, uLabel.id, e); }}"
new_handler_call = "onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelMouseDown(panelIdx, uLabel.id, e); }}"
if old_handler_call in content:
    content = content.replace(old_handler_call, new_handler_call)
    fixed += 1
    print("[OK] FIX 2: Updated onPointerDown to onMouseDown for user labels")
else:
    print("[WARN] FIX 2: onPointerDown handler call not found")
    if 'handleLabelMouseDown' in content:
        print("  -> Already using handleLabelMouseDown")

# Also swap onPointerDown stopPropagation on input and delete
old_stop = "onPointerDown={(e) => e.stopPropagation()}"
new_stop = "onMouseDown={(e) => e.stopPropagation()}"
if old_stop in content:
    content = content.replace(old_stop, new_stop)
    fixed += 1
    print("[OK] FIX 2b: Updated onPointerDown stopPropagation to onMouseDown")

# ============================================================
# FIX 3: Center step badge with inline styles
# ============================================================

old_badge = '<span className="visual-panel-role">'
new_badge = '<span className="visual-panel-role" style={{ display: "block", textAlign: "center", fontWeight: 800 }}>'
if old_badge in content:
    content = content.replace(old_badge, new_badge)
    fixed += 1
    print("[OK] FIX 3: Added inline centering to step badge")
else:
    print("[WARN] FIX 3: Step badge not found (may already be styled)")

# ============================================================
# FIX 4: Center captions via CSS
# ============================================================

# Add text-align:center to caption CSS if not already there
if '.visual-caption {' in content:
    if 'text-align: center' not in content.split('.visual-caption {')[1][:100]:
        content = content.replace(
            '.visual-caption {',
            '.visual-caption { text-align: center;'
        )
        fixed += 1
        print("[OK] FIX 4: Added text-align:center to .visual-caption CSS")
    else:
        print("[INFO] FIX 4: Caption CSS already has text-align:center")
else:
    # Add caption CSS before .visual-sequence-arrow
    if '.visual-sequence-arrow {' in content:
        content = content.replace(
            '.visual-sequence-arrow {',
            '.visual-caption { text-align: center; display: block; font-size: 13px; padding: 6px 4px; color: #334155; line-height: 1.4; }\n.visual-sequence-arrow {'
        )
        fixed += 1
        print("[OK] FIX 4: Added new .visual-caption CSS rule")
    else:
        print("[WARN] FIX 4: Could not find anchor for caption CSS")

# ============================================================
# FIX 5: Hide AI label delete button until hover (add visibility:hidden)
# ============================================================

# The AI label delete button at the original "Remove label" span
old_ai_delete_style = """style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', opacity: 0.6, marginLeft: '6px', padding: '0 2px' }}
                                            title="Remove label" """
new_ai_delete_style = """className="label-delete-btn" style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#ef4444', opacity: 0.6, marginLeft: '6px', padding: '0 2px', visibility: 'hidden' }}
                                            title="Remove label" """
if old_ai_delete_style in content:
    content = content.replace(old_ai_delete_style, new_ai_delete_style)
    fixed += 1
    print("[OK] FIX 5: Added visibility:hidden to AI label delete button")
else:
    print("[INFO] FIX 5: AI label delete button not found or already styled")

# ============================================================
# Verify line count didn't change significantly
# ============================================================
new_len = len(content.split('\n'))
diff = new_len - original_len
print(f"\nLine count: {original_len} -> {new_len} (diff: {diff:+d})")
if abs(diff) > 10:
    print("[WARNING] Line count changed significantly!")
else:
    print("[OK] Line count stable")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
