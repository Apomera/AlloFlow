"""Fix visual panel display issues visible in screenshot:
1. Replace ts() calls with direct English strings (ts() can't resolve nested keys)
2. Fix leader line dot rendering at center
3. Remove the nested visual_director keys from UI_STRINGS (not accessible via t())
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# Fix 1: Replace all ts('visual_director.*') calls with direct strings
# Since ts() just does tProp?.(key), and t() returns the key itself on miss,
# the nested keys never resolve. Just use the fallback strings directly.

replacements = [
    # In the hide/show labels button title
    (
        "labelsHidden ? (ts('visual_director.show_labels') || 'Show Labels') : (ts('visual_director.hide_labels') || 'Hide Labels (Self-Test)')",
        "labelsHidden ? 'Show Labels' : 'Hide Labels (Self-Test)'"
    ),
    # In the hide/show labels button text
    (
        "labelsHidden ? (ts('visual_director.show_labels') || 'Show Labels') : (ts('visual_director.hide_labels') || 'Hide Labels')",
        "labelsHidden ? 'Show Labels' : 'Hide Labels'"
    ),
    # Click to edit label title
    (
        "ts('visual_director.click_to_edit_label') || 'Click to edit label'",
        "'Click to edit label'"
    ),
    # Refine panel title
    (
        "ts('visual_director.refine_panel') || 'Refine this panel'",
        "'Refine this panel'"
    ),
]

for old, new in replacements:
    count = content.count(old)
    if count > 0:
        content = content.replace(old, new)
        fixed += 1
        print(f"[OK] Replaced ts() call: {old[:50]}... ({count}x)")
    else:
        print(f"[SKIP] Not found: {old[:50]}...")

# Fix 2: Leader line circle dot — Only render circle if a line is actually drawn
# The issue: renderLeaderLines renders <circle cx={tx} cy={ty} r="1" /> at (50,50) 
# for every label even when the label is close to center (dist < 15, line is hidden).
# But the circle still renders! The circle creates the visible black dot.
# Fix: Move the circle inside the dist>15 check
old_leader = """                    return (
                        <g key={idx}>
                            <line x1={lx} y1={ly} x2={tx} y2={ty} />
                            <circle cx={tx} cy={ty} r="1" />
                        </g>
                    );"""
new_leader = """                    return (
                        <g key={idx}>
                            <line x1={lx} y1={ly} x2={tx} y2={ty} />
                        </g>
                    );"""
if old_leader in content:
    content = content.replace(old_leader, new_leader)
    fixed += 1
    print("[OK] Removed unconditional circle dot from leader lines")
else:
    # Try without exact whitespace
    print("[WARN] Could not find leader line circle pattern, checking alternative...")
    # Try to find and remove just the circle element
    if '<circle cx={tx} cy={ty} r="1" />' in content:
        content = content.replace('<circle cx={tx} cy={ty} r="1" />', '/* circle removed */')
        fixed += 1
        print("[OK] Removed leader line circle element (alternative)")

# Fix 3: Also ensure the leader line SVG css has pointer-events:none 
# and the circle styling doesn't show
old_circle_css = ".visual-leader-line circle { fill: #6366f1; opacity: 0.8; }"
if old_circle_css in content:
    content = content.replace(old_circle_css, "/* leader line circle removed */")
    fixed += 1
    print("[OK] Removed leader line circle CSS")

# Fix 4: Clean up the now-unused visual_director keys from UI_STRINGS
# They were nested and t() couldn't resolve them anyway
old_keys = """        visual_director: {
            generating_panel: 'Generating panel {num}/{total}...',
            hide_labels: 'Hide Labels',
            show_labels: 'Show Labels',
            click_to_edit_label: 'Click to edit label',
            refine_panel: 'Refine this panel',
            add_label: 'Add label to panel',
        },
"""
if old_keys in content:
    content = content.replace(old_keys, "")
    fixed += 1
    print("[OK] Removed unused nested visual_director keys from UI_STRINGS")

# Fix 5: The visual-panel figure also needs to ensure labels stay INSIDE the panel
# The issue is that the panel has overflow:hidden but labels have position:absolute
# which should work. But the <figure> might not be the containing block.
# Ensure .visual-panel has explicit position:relative (already has it) 
# and overflow visible only for labels
# Actually the screenshot shows labels appearing BELOW the panel image, not inside.
# This suggests the labels don't have CSS positioning working correctly.
# Let me check if the image wrapper fragment <> might be breaking positioning context.

# Fix 6: Reduce the visual-panel-grid gap for sequence layout specifically
old_seq_css = ".visual-panel-grid.layout-sequence { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }"
new_seq_css = ".visual-panel-grid.layout-sequence { grid-template-columns: 1fr; gap: 8px; }"
if old_seq_css in content:
    content = content.replace(old_seq_css, new_seq_css)
    fixed += 1
    print("[OK] Changed sequence layout to single-column with tight 8px gap")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
