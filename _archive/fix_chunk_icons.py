filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Replace AlignLeft with an icon that's already imported
# Check which layout icons are imported
for icon in ['List', 'Layout', 'Rows', 'Layers', 'BookOpen', 'FileText', 'AlignJustify', 'Glasses']:
    if icon in content[:5000]:
        print(f"  '{icon}' is imported")

# Use Glasses (reading focus) or BookOpen (already imported for immersive)
# Actually, let's use BookOpen since it's used for immersive reader AND already imported
old_align = '<AlignLeft size={14} className="mr-1 inline"/>'
new_align = '<Glasses size={14} className="mr-1 inline"/>'

# Check if Glasses is imported
if 'Glasses' in content[:5000]:
    pass
else:
    # Use List instead
    if 'List,' in content[:5000] or ' List ' in content[:5000] or ' List}' in content[:5000]:
        new_align = '<List size={14} className="mr-1 inline"/>'
        print("Using List icon")
    else:
        # Fallback to BookOpen which we know is imported
        new_align = '<BookOpen size={14} className="mr-1 inline"/>'
        print("Using BookOpen icon")

if old_align in content:
    content = content.replace(old_align, new_align, 1)
    fixes += 1
    print(f"1. Replaced AlignLeft with working icon")
else:
    print("1. SKIP: AlignLeft not found")

# 2. Add fallbacks for missing localization keys
# Replace t('immersive.chunk_read') with t('immersive.chunk_read') || 'Chunk Read'
old_chunk_key = "t('immersive.chunk_read')"
new_chunk_key = "(t('immersive.chunk_read') || 'Chunk Read')"
content = content.replace(old_chunk_key, new_chunk_key)
count = content.count(new_chunk_key)
print(f"2. Added fallbacks for chunk_read key ({count} instances)")

# Replace t('common.auto_play') with fallback
old_auto = "t('common.auto_play')"
new_auto = "(t('common.auto_play') || 'Auto')"
content = content.replace(old_auto, new_auto)
print("3. Added fallback for auto_play key")

# Also add the localization keys to UI_STRINGS
# Find where immersive keys are defined
idx = content.find("'immersive.speed':")
if idx > 0:
    # Add chunk_read key after it
    # Find the end of the line
    eol = content.find('\n', idx)
    line = content[idx:eol]
    insert_after = line
    insert_text = line + "\n        'immersive.chunk_read': 'Chunk Read',"
    # Only do this if not already there
    if "'immersive.chunk_read'" not in content:
        content = content[:idx] + "'immersive.chunk_read': 'Chunk Read',\n        " + content[idx:]
        fixes += 1
        print("4. Added immersive.chunk_read to UI_STRINGS")
    else:
        print("4. SKIP: key already exists")

# Add common.auto_play
idx2 = content.find("'common.pause':")
if idx2 > 0 and "'common.auto_play'" not in content:
    content = content[:idx2] + "'common.auto_play': 'Auto',\n        " + content[idx2:]
    fixes += 1
    print("5. Added common.auto_play to UI_STRINGS")
else:
    print("5. SKIP: auto_play already exists or pause not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {fixes} fixes")
