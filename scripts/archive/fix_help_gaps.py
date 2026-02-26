"""
Fix help coverage gaps:
1. Add missing HELP_STRINGS entry for ws_gen_ortho_slider
2. Add HELP_STRINGS aliases for 5 header DOM keys whose text exists under different orphan names
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# === TASK 1: Add ws_gen_ortho_slider ===
ws_ortho_entry = """    'ws_gen_ortho_slider': "Controls how many spelling (orthography) activities are included per session. Slide right to add spelling practice after phonics activities complete. When set to 0 (Off), no spelling activities are generated. When controlled by Lesson Plan mode, this slider is locked and managed automatically. Spelling activities reinforce the sound-to-letter mapping students learn during phonics, strengthening encoding skills alongside decoding.","""

anchor = "'ws_gen_review_btn':"
if anchor in content:
    idx = content.index(anchor)
    # Insert before this anchor
    content = content[:idx] + ws_ortho_entry.strip() + '\n    ' + content[idx:]
    changes += 1
    print("[1] Added ws_gen_ortho_slider HELP_STRINGS entry")
else:
    print("[1] ERROR: Could not find anchor ws_gen_review_btn")

# === TASK 2: Add alias entries for misnamed header orphans ===
# Map: orphan HELP_STRINGS key -> DOM's actual data-help-key
orphan_to_dom = {
    'header_theme_toggle': 'header_settings_theme',
    'header_overlay_toggle': 'header_settings_overlay',
    'header_animation_toggle': 'header_settings_anim',
    'header_sync_toggle': 'header_cloud_sync',
    'header_xp_modal': 'xp_modal_trigger',
}

for orphan_key, dom_key in orphan_to_dom.items():
    # Already exists?
    if f"'{dom_key}':" in content:
        print(f"[2] {dom_key} already exists, skipping")
        continue
    
    # Find the orphan's help text
    # Match: 'key': "text",
    pattern = f"'{orphan_key}':\\s*\"((?:[^\"\\\\]|\\\\.)*?)\""
    match = re.search(pattern, content)
    if match:
        help_text = match.group(1)
        # Insert the alias right after the orphan entry's line
        orphan_start = match.start()
        eol = content.index('\n', orphan_start)
        new_line = f"\n    '{dom_key}': \"{help_text}\","
        content = content[:eol] + new_line + content[eol:]
        changes += 1
        print(f"[2] Added alias {dom_key} (text from {orphan_key})")
    else:
        print(f"[2] WARNING: Could not find text for orphan {orphan_key}")

# Save
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
