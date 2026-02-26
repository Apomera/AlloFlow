"""
Fix raw localization strings and add visual support title.
1. Replace ts('common.apply') with direct English 'Apply'
2. Replace ts('visual_director.refine_placeholder') with direct English
3. Make edit button always visible (not just on hover)
4. Add title to visual supports (the visualPlan.title if available)
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Replace raw ts() calls with direct English
# ============================================================

old_apply = "{ts('common.apply') || 'Apply'}"
new_apply = "{'Apply'}"
if old_apply in content:
    content = content.replace(old_apply, new_apply)
    fixed += 1
    print("[OK] FIX 1a: Replaced ts('common.apply') with 'Apply'")

old_placeholder = "placeholder={ts('visual_director.refine_placeholder') || `Edit Panel ${refiningPanelIdx + 1}...`}"
new_placeholder = "placeholder={`Describe changes for Panel ${refiningPanelIdx + 1}...`}"
if old_placeholder in content:
    content = content.replace(old_placeholder, new_placeholder)
    fixed += 1
    print("[OK] FIX 1b: Replaced ts('visual_director.refine_placeholder') with English")

# ============================================================
# FIX 2: Make edit ✏️ button always visible (change opacity 0 to 1)
# ============================================================

old_actions_css = ".visual-panel-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }"
new_actions_css = ".visual-panel-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0.6; transition: opacity 0.2s; }"
if old_actions_css in content:
    content = content.replace(old_actions_css, new_actions_css)
    fixed += 1
    print("[OK] FIX 2: Made edit buttons visible (opacity 0.6, full on hover)")

# ============================================================
# FIX 3: Add title to visual support grid
# The grid starts at <div className={`visual-panel-grid...
# Add a title before it if visualPlan.title exists
# ============================================================

old_grid_start = """<div className={`visual-panel-grid layout-${visualPlan.layout || 'single'}`}>"""
new_grid_start = """{visualPlan.title && <h3 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>{visualPlan.title}</h3>}
            <div className={`visual-panel-grid layout-${visualPlan.layout || 'single'}`}>"""
if old_grid_start in content:
    content = content.replace(old_grid_start, new_grid_start, 1)
    fixed += 1
    print("[OK] FIX 3: Added optional title above visual panel grid")

# ============================================================
# Verify
# ============================================================
new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
