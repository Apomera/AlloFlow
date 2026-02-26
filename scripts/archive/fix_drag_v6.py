"""Comprehensive fix:
1. Replace setPointerCapture drag with document.addEventListener (Gemini Canvas compatible)  
2. Center step badges (already CSS-centered, verify inline styles don't override)
3. Center bottom labels (they're already centered via LABEL_POSITIONS transform)
4. Fix add label clicking
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
fixed = 0

# ============================================================
# FIX 1: Replace entire drag handler with document.addEventListener approach
# Find the pointer-capture drag block and replace it
# ============================================================
drag_start = None
drag_end = None
for i, line in enumerate(lines):
    if '// Pointer-capture drag system for labels' in line:
        drag_start = i
    if drag_start and i > drag_start and 'const handlePanelDragStart' in line:
        drag_end = i
        break

if drag_start is not None and drag_end is not None:
    new_drag = [
        '    // Document-level drag system for labels (Gemini Canvas compatible)\r\n',
        '    const handleLabelMouseDown = (panelIdx, labelId, e) => {\r\n',
        '        e.preventDefault();\r\n',
        '        e.stopPropagation();\r\n',
        '        const el = e.currentTarget;\r\n',
        '        const container = el.parentElement;\r\n',
        '        if (!container) return;\r\n',
        '        const containerRect = container.getBoundingClientRect();\r\n',
        '        const startX = e.clientX;\r\n',
        '        const startY = e.clientY;\r\n',
        '        const startLabel = (userLabels[panelIdx] || []).find(l => l.id === labelId);\r\n',
        '        if (!startLabel) return;\r\n',
        '        const origX = startLabel.x;\r\n',
        '        const origY = startLabel.y;\r\n',
        '        let lastX = origX, lastY = origY;\r\n',
        '        el.style.cursor = "grabbing";\r\n',
        '        el.style.zIndex = "10";\r\n',
        '        const onMove = (ev) => {\r\n',
        '            const dx = (ev.clientX - startX) / containerRect.width * 100;\r\n',
        '            const dy = (ev.clientY - startY) / containerRect.height * 100;\r\n',
        '            lastX = Math.max(0, Math.min(90, origX + dx));\r\n',
        '            lastY = Math.max(0, Math.min(90, origY + dy));\r\n',
        '            el.style.left = lastX + "%";\r\n',
        '            el.style.top = lastY + "%";\r\n',
        '        };\r\n',
        '        const onUp = () => {\r\n',
        '            document.removeEventListener("mousemove", onMove);\r\n',
        '            document.removeEventListener("mouseup", onUp);\r\n',
        '            el.style.cursor = "grab";\r\n',
        '            el.style.zIndex = "4";\r\n',
        '            setUserLabels(prev => ({\r\n',
        '                ...prev,\r\n',
        '                [panelIdx]: (prev[panelIdx] || []).map(l =>\r\n',
        '                    l.id === labelId ? { ...l, x: lastX, y: lastY } : l\r\n',
        '                )\r\n',
        '            }));\r\n',
        '        };\r\n',
        '        document.addEventListener("mousemove", onMove);\r\n',
        '        document.addEventListener("mouseup", onUp);\r\n',
        '    };\r\n',
        '\r\n',
    ]
    lines[drag_start:drag_end] = new_drag
    fixed += 1
    print(f"[OK] Replaced pointer-capture drag with document.addEventListener at L{drag_start+1}")
else:
    print(f"[ERROR] Could not find drag block: start={drag_start}, end={drag_end}")

# ============================================================
# FIX 2: Update user label to use onMouseDown instead of onPointerDown
# and call the new handleLabelMouseDown
# ============================================================
content = ''.join(lines)

old_pointer = "onPointerDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelPointerDown(panelIdx, uLabel.id, e); }}"
new_pointer = "onMouseDown={(e) => { if (e.target.tagName === 'INPUT') return; handleLabelMouseDown(panelIdx, uLabel.id, e); }}"
if old_pointer in content:
    content = content.replace(old_pointer, new_pointer)
    fixed += 1
    print("[OK] Updated user label from onPointerDown to onMouseDown")

# Also update the input stopPropagation from onPointerDown to onMouseDown
old_input_stop = "onPointerDown={(e) => e.stopPropagation()}"
new_input_stop = "onMouseDown={(e) => e.stopPropagation()}"
count = content.count(old_input_stop)
if count > 0:
    content = content.replace(old_input_stop, new_input_stop)
    fixed += 1
    print(f"[OK] Updated {count} onPointerDown stopPropagation to onMouseDown")

# ============================================================
# FIX 3: Center step badge - make it NOT absolute positioned
# The CSS already has text-align:center but the span might still be
# inside the figure which is position:relative. Let's move the badge
# ABOVE the containment wrapper.
# ============================================================
# Actually, the CSS already centers the badge. Let me check if there's 
# an inline style overriding it.
old_role_badge = "<span className=\"visual-panel-role\">"
if old_role_badge in content:
    # Add inline style to ensure centering
    content = content.replace(
        old_role_badge,
        '<span className="visual-panel-role" style={{ display: "block", textAlign: "center", fontWeight: 800 }}>'
    )
    fixed += 1
    print("[OK] Added inline centering to step badge")

# ============================================================
# FIX 4: Center labels below pictures
# The figcaption (caption text below image) should be centered
# ============================================================
old_caption_css = '.visual-caption'
# Check if there's existing caption CSS
if '.visual-caption {' in content:
    content = content.replace(
        '.visual-caption {',
        '.visual-caption { text-align: center; display: block;'
    )
    fixed += 1
    print("[OK] Centered captions")
else:
    # Add caption CSS before the sequence arrow CSS
    anchor = '.visual-sequence-arrow {'
    if anchor in content:
        content = content.replace(
            anchor,
            '.visual-caption { text-align: center; display: block; font-size: 13px; padding: 6px 4px; color: #334155; line-height: 1.4; }\n' + anchor
        )
        fixed += 1
        print("[OK] Added centered caption CSS")

# ============================================================
# FIX 5: Make sure the "Add Label" click handler works
# Check that handleAddUserLabel exists and the onClick is wired
# ============================================================
# Check the onClick on the panel wrapper
wrapper_click = "onClick={(e) => addingLabelPanel !== null && handleAddUserLabel(panelIdx, e)}"
if wrapper_click in content:
    print("[INFO] Add label wrapper click is present")
else:
    # Find the wrapper div and add the onClick
    old_wrapper = """<div style={{ position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}"""
    if old_wrapper in content:
        # Check if it already has onClick
        idx = content.find(old_wrapper)
        snippet = content[idx:idx+300]
        if 'addingLabelPanel' not in snippet:
            content = content.replace(
                old_wrapper,
                old_wrapper + """ onClick={(e) => { if (addingLabelPanel !== null) handleAddUserLabel(panelIdx, e); }}"""
            )
            fixed += 1
            print("[OK] Added onClick for add label to wrapper")
        else:
            print("[INFO] Wrapper already has addingLabelPanel check")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
