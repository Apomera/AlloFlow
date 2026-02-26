"""Fix content panel header ternary chain and add missing localization keys"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
changes = 0

# ===========================
# FIX 1: Content panel header missing cases
# ===========================
# The ternary chain ends with:
#   activeView === 'persona' ? ... : <ImageIcon> Visual Support
# Need to add: concept-sort, timeline, math, image before the default

old_header = """                activeView === 'persona' ? <><History className="text-yellow-600" size={20} /> {t('persona.title')}</> :
                <><ImageIcon className="text-purple-600" size={20} /> {t('visuals.title')}</>}"""

new_header = """                activeView === 'persona' ? <><History className="text-yellow-600" size={20} /> {t('persona.title')}</> :
                activeView === 'concept-sort' ? <><Filter className="text-amber-600" size={20} /> {t('concept_sort.title')}</> :
                activeView === 'timeline' ? <><ListOrdered className="text-rose-600" size={20} /> {t('timeline.title')}</> :
                activeView === 'math' ? <><Calculator className="text-blue-600" size={20} /> {t('math.title')}</> :
                activeView === 'image' ? <><ImageIcon className="text-purple-600" size={20} /> {t('visuals.title')}</> :
                activeView === 'gemini-bridge' ? <><Terminal className="text-slate-600" size={20} /> Gemini Bridge</> :
                <><ImageIcon className="text-purple-600" size={20} /> {t('visuals.title')}</>}"""

if old_header in content:
    content = content.replace(old_header, new_header)
    changes += 1
    print("✅ 1: Header ternary chain fixed (added concept-sort, timeline, math, image, gemini-bridge)")
else:
    # Try CRLF
    old_crlf = old_header.replace('\n', '\r\n')
    new_crlf = new_header.replace('\n', '\r\n')
    if old_crlf in content:
        content = content.replace(old_crlf, new_crlf)
        changes += 1
        print("✅ 1: Header ternary chain fixed (CRLF)")
    else:
        print("❌ 1: Header pattern not found")

# ===========================
# FIX 2: Add missing localization keys
# ===========================

# Check which keys are missing
missing_keys = {
    'common.discard': False,
    'escape_room.save_config': False,
    'escape_room.launch': False,
    'escape_room.preview_title': False,
    'escape_room.preview_desc': False,
}

for key in missing_keys:
    parts = key.split('.')
    if len(parts) == 2:
        # Search for the key in UI_STRINGS
        search = f'{parts[1]}:'
        if search in content:
            # Check if it's in the right namespace
            # Just flag as possibly present 
            pass
    missing_keys[key] = key.replace('.', '_delimiter_') not in content

# Find the common: { section and add discard
common_section = "common: {"
idx_common = content.find(common_section)
if idx_common >= 0:
    # Check if discard already exists
    common_end = content.find('},', idx_common)
    common_block = content[idx_common:common_end] if common_end > idx_common else ''
    if 'discard:' not in common_block and 'discard :' not in common_block:
        # Find the first key after 'common: {'
        insert_pos = content.find('\n', idx_common) + 1
        # Determine line ending
        eol = '\r\n' if content[insert_pos:insert_pos+5].count('\r') > 0 else '\n'
        insert_text = f'    discard: "Discard",{eol}'
        content = content[:insert_pos] + insert_text + content[insert_pos:]
        changes += 1
        print("✅ 2: Added common.discard key")
    else:
        print("ℹ️ 2: common.discard already exists")
else:
    print("❌ 2: common: { section not found")

# Find or create escape_room: { section
if 'escape_room:' in content and 'escape_room: {' not in content:
    # There might be escape_room keys but not as a namespace
    print("ℹ️ 3: escape_room exists but not as namespace object")
elif 'escape_room: {' in content:
    # Add missing keys
    er_idx = content.find('escape_room: {')
    er_end = content.find('},', er_idx)
    er_block = content[er_idx:er_end] if er_end > er_idx else ''
    keys_to_add = []
    if 'save_config:' not in er_block:
        keys_to_add.append('    save_config: "Save Configuration",')
    if 'launch:' not in er_block:
        keys_to_add.append('    launch: "Launch",')
    if 'preview_title:' not in er_block:
        keys_to_add.append('    preview_title: "Preview",')
    if 'preview_desc:' not in er_block:
        keys_to_add.append('    preview_desc: "Preview your escape room before launching.",')
    if keys_to_add:
        insert_pos = content.find('\n', er_idx) + 1
        eol = '\r\n' if '\r\n' in content[er_idx:er_idx+50] else '\n'
        insert_text = eol.join(keys_to_add) + eol
        content = content[:insert_pos] + insert_text + content[insert_pos:]
        changes += 1
        print(f"✅ 3: Added {len(keys_to_add)} missing escape_room keys")
    else:
        print("ℹ️ 3: All escape_room keys already exist")
else:
    # Need to create the entire escape_room namespace
    # Find a good place to insert (after common: { ... } or after another namespace)
    # Let's find the end of common section
    common_end_idx = content.find('common: {')
    if common_end_idx >= 0:
        # Navigate to the closing } of common
        brace_count = 0
        i = common_end_idx
        while i < len(content):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    break
            i += 1
        # Insert after the closing },
        insert_after = content.find(',', i) + 1
        if insert_after > 0:
            eol = '\r\n' if '\r\n' in content[i:i+20] else '\n'
            escape_room_block = f"""{eol}  escape_room: {{{eol}    save_config: "Save Configuration",{eol}    launch: "Launch",{eol}    preview_title: "Preview",{eol}    preview_desc: "Preview your escape room before launching.",{eol}  }},"""
            content = content[:insert_after] + escape_room_block + content[insert_after:]
            changes += 1
            print("✅ 3: Created escape_room namespace with 4 keys")
        else:
            print("❌ 3: Could not find insertion point for escape_room")
    else:
        print("❌ 3: Could not find common section to insert after")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
