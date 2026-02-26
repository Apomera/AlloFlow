filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

keys_to_check = ['immersive.speed', 'common.read_aloud', 'common.stop', 'common.resume', 'common.pause']
for key in keys_to_check:
    search = "'" + key + "'"
    count = content.count(search)
    if count > 0:
        print(f"  '{key}': found {count} references")
    else:
        print(f"  '{key}': MISSING")

# Check icon imports
for icon in ['Play,', ' Play ', ' Play}', 'Pause,', ' Pause ', ' Pause}', 'Square,', ' Square ', ' Square}']:
    if icon in content[:5000]:
        print(f"  Icon containing '{icon.strip()}': found in imports")
