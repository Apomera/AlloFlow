"""Fix the leader lines SVG taking up flow space.
Add inline position:absolute so it doesn't create a huge block element.
Also fix the drawing overlay SVG for the same reason.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# Fix 1: Leader lines SVG - add inline absolute positioning
old_svg = '<svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none">'
new_svg = '<svg className="visual-leader-line" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: \'absolute\', top: 0, left: 0, width: \'100%\', height: \'100%\', pointerEvents: \'none\', zIndex: 1 }}>'
if old_svg in content:
    content = content.replace(old_svg, new_svg)
    fixed += 1
    print("[OK] Added inline absolute positioning to leader lines SVG")

# Fix 2: Drawing overlay SVG - same issue
old_draw = '<svg className="drawing-overlay" viewBox="0 0 100 100" preserveAspectRatio="none"'
new_draw = '<svg className="drawing-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: \'absolute\', top: 0, left: 0, width: \'100%\', height: \'100%\', zIndex: 3 }}'
if old_draw in content:
    content = content.replace(old_draw, new_draw)
    fixed += 1
    print("[OK] Added inline absolute positioning to drawing overlay SVG")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
