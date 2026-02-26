"""Fix labels rendering as plain flow text instead of positioned overlays.
Root cause: CSS position:absolute on .visual-label isn't being applied.
Fix: Add position:'absolute' directly into inline style props, which guarantees it.
Also fix the large empty space below images (caption/labels flowing outside figure).
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# Fix 1: Add position:'absolute' to LABEL_POSITIONS entries
# Currently they only have top/left/bottom/right but not position itself
old_positions = """const LABEL_POSITIONS = {
    'top-left': { top: '10%', left: '10%' },
    'top-center': { top: '8%', left: '50%', transform: 'translateX(-50%)' },
    'top-right': { top: '8%', right: '8%' },
    'center-left': { top: '50%', left: '8%', transform: 'translateY(-50%)' },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'center-right': { top: '50%', right: '8%', transform: 'translateY(-50%)' },
    'bottom-left': { bottom: '12%', left: '8%' },
    'bottom-center': { bottom: '12%', left: '50%', transform: 'translateX(-50%)' },
    'bottom-right': { bottom: '12%', right: '8%' },
};"""

new_positions = """const LABEL_POSITIONS = {
    'top-left': { position: 'absolute', top: '10%', left: '10%', zIndex: 4 },
    'top-center': { position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 },
    'top-right': { position: 'absolute', top: '8%', right: '8%', zIndex: 4 },
    'center-left': { position: 'absolute', top: '50%', left: '8%', transform: 'translateY(-50%)', zIndex: 4 },
    'center': { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 4 },
    'center-right': { position: 'absolute', top: '50%', right: '8%', transform: 'translateY(-50%)', zIndex: 4 },
    'bottom-left': { position: 'absolute', bottom: '12%', left: '8%', zIndex: 4 },
    'bottom-center': { position: 'absolute', bottom: '12%', left: '50%', transform: 'translateX(-50%)', zIndex: 4 },
    'bottom-right': { position: 'absolute', bottom: '12%', right: '8%', zIndex: 4 },
};"""

if old_positions in content:
    content = content.replace(old_positions, new_positions)
    fixed += 1
    print("[OK] Added position:'absolute' and zIndex:4 to all LABEL_POSITIONS entries")

# Fix 2: Also add inline styles to user-created labels (they use style={{ left, top }})
# At line ~1784: style={{ left: `${uLabel.x}%`, top: `${uLabel.y}%`, cursor: ...
old_user_label = "style={{ left: `${uLabel.x}%`, top: `${uLabel.y}%`, cursor: draggingLabel ? 'grabbing' : 'grab', borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)' }}"
new_user_label = "style={{ position: 'absolute', left: `${uLabel.x}%`, top: `${uLabel.y}%`, cursor: draggingLabel ? 'grabbing' : 'grab', borderColor: '#8b5cf6', background: 'rgba(245,243,255,0.95)', zIndex: 4 }}"
if old_user_label in content:
    content = content.replace(old_user_label, new_user_label)
    fixed += 1
    print("[OK] Added position:'absolute' to user-created label inline styles")

# Fix 3: Ensure figure element has position:relative in inline style too  
# (belt and suspenders - CSS has it but let's guarantee it)
old_figure = '<figure className="visual-panel">'
new_figure = '<figure className="visual-panel" style={{ position: "relative" }}>'
if old_figure in content:
    content = content.replace(old_figure, new_figure)
    fixed += 1
    print("[OK] Added inline position:'relative' to figure element")

# Fix 4: Add inline styles to the visual-label CSS class
# to add a visible background since the gradient might not render
old_label_css = ".visual-label { position: absolute; background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.12) 100%); backdrop-filter: blur(12px); padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 800; color: #1e1b4b; border: 2px solid rgba(99,102,241,0.4); box-shadow: 0 4px 16px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.5); pointer-events: auto; cursor: pointer; transition: opacity 0.3s, transform 0.2s, box-shadow 0.2s; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.02em; z-index: 4; }"
new_label_css = ".visual-label { position: absolute !important; background: linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 100%), rgba(255,255,255,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 800; color: #1e1b4b; border: 2px solid rgba(99,102,241,0.5); box-shadow: 0 4px 16px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.6); pointer-events: auto; cursor: pointer; transition: opacity 0.3s, transform 0.2s, box-shadow 0.2s; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.02em; z-index: 4; }"
if old_label_css in content:
    content = content.replace(old_label_css, new_label_css)
    fixed += 1
    print("[OK] Added !important to position:absolute and improved label background")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
