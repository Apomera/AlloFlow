"""Fix duplicate style attribute on drawing overlay SVG.
Merge the position styles into the existing style prop.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# The drawing overlay SVG now has TWO style props:
# style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3 }}
# style={{ pointerEvents: drawingMode ? 'auto' : 'none' }}
# Need to merge them into one.

old_draw = "style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3 }}"
# Remove the inline style I added - the CSS already handles position for this one
# Instead, merge into the existing pointerEvents style

if old_draw in content:
    content = content.replace(old_draw, "")
    fixed += 1
    print("[OK] Removed duplicate style from drawing overlay SVG")

# Now fix the remaining style prop to include position:absolute
old_ptr = "style={{ pointerEvents: drawingMode ? 'auto' : 'none' }}"
new_ptr = "style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: drawingMode ? 'auto' : 'none' }}"
if old_ptr in content:
    content = content.replace(old_ptr, new_ptr)
    fixed += 1
    print("[OK] Merged position styles into drawing overlay's pointerEvents style prop")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
