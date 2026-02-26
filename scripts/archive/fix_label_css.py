"""Fix Visual Art Director label CSS: larger font, centered, better typography"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()

replacements = {
    # Labels: bigger font (12→15px), bolder, better font family, indigo accent border
    ".visual-label { position: absolute; background: rgba(255,255,255,0.9); backdrop-filter: blur(6px); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; color: #1e293b; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 2px 6px rgba(0,0,0,0.08); pointer-events: auto; cursor: pointer; transition: opacity 0.3s, transform 0.2s; }":
    ".visual-label { position: absolute; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); padding: 6px 16px; border-radius: 10px; font-size: 15px; font-weight: 700; color: #1e293b; border: 1.5px solid rgba(99,102,241,0.25); box-shadow: 0 3px 10px rgba(0,0,0,0.12); pointer-events: auto; cursor: pointer; transition: opacity 0.3s, transform 0.2s; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.01em; white-space: nowrap; }",

    # Captions: bigger font (13→15px), bolder, gradient bg, better font
    ".visual-caption { padding: 8px 12px; font-size: 13px; color: #475569; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0; font-weight: 500; }":
    ".visual-caption { padding: 12px 16px; font-size: 15px; color: #334155; text-align: center; background: linear-gradient(to bottom, #f8fafc, #f1f5f9); border-top: 1px solid #e2e8f0; font-weight: 600; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.01em; }",

    # Role badge: bigger (11→13px), darker bg, more padding
    ".visual-panel-role { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.6); color: white; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(4px); }":
    ".visual-panel-role { position: absolute; top: 10px; left: 10px; background: rgba(30,41,59,0.75); color: white; font-size: 13px; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; backdrop-filter: blur(6px); z-index: 2; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }",

    # Label input: bigger font to match label size
    ".visual-label input { border: none; background: transparent; font-size: 12px; font-weight: 600; color: #1e293b; outline: none; width: 100%; min-width: 40px; }":
    ".visual-label input { border: none; background: transparent; font-size: 15px; font-weight: 700; color: #1e293b; outline: none; width: 100%; min-width: 60px; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }",
}

fixed = 0
for i, l in enumerate(lines):
    for old, new in replacements.items():
        if old in l:
            lines[i] = l.replace(old, new)
            fixed += 1
            print(f"[OK] Updated CSS at L{i+1}")

# Also fix the label positions to be more centered - update LABEL_POSITIONS
# Make labels sit more naturally centered rather than hugging edges
old_positions = "'top-left': { top: '8%', left: '8%' }"
new_positions = "'top-left': { top: '10%', left: '10%' }"
for i, l in enumerate(lines):
    if old_positions in l:
        lines[i] = l.replace(
            "'top-left': { top: '8%', left: '8%' }",
            "'top-left': { top: '10%', left: '10%' }"
        ).replace(
            "'top-center': { top: '8%', left: '50%', transform: 'translateX(-50%)' }",
            "'top-center': { top: '10%', left: '50%', transform: 'translateX(-50%)' }"
        ).replace(
            "'top-right': { top: '8%', right: '8%' }",
            "'top-right': { top: '10%', right: '10%' }"
        ).replace(
            "'center-left': { top: '50%', left: '8%', transform: 'translateY(-50%)' }",
            "'center-left': { top: '50%', left: '10%', transform: 'translateY(-50%)' }"
        ).replace(
            "'center-right': { top: '50%', right: '8%', transform: 'translateY(-50%)' }",
            "'center-right': { top: '50%', right: '10%', transform: 'translateY(-50%)' }"
        ).replace(
            "'bottom-left': { bottom: '12%', left: '8%' }",
            "'bottom-left': { bottom: '14%', left: '10%' }"
        ).replace(
            "'bottom-center': { bottom: '12%', left: '50%', transform: 'translateX(-50%)' }",
            "'bottom-center': { bottom: '14%', left: '50%', transform: 'translateX(-50%)' }"
        ).replace(
            "'bottom-right': { bottom: '12%', right: '8%' }",
            "'bottom-right': { bottom: '14%', right: '10%' }"
        )
        fixed += 1
        print(f"[OK] Updated label positions at L{i+1}")
        break

open(filepath, 'w', encoding='utf-8').write(''.join(lines))
print(f"\nDone! {fixed} updates applied.")
