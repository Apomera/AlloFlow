filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Check icons
icons_needed = ['AlignLeft', 'ChevronLeft', 'ChevronRight', 'Play', 'Pause']
for icon in icons_needed:
    if icon in content[:5000]:
        print(f"  Icon '{icon}': imported")
    else:
        print(f"  Icon '{icon}': NOT imported, checking elsewhere...")
        if icon in content:
            print(f"    Used in file but may not be in import block")

# Check localization key
key = 'immersive.chunk_read'
if f"'{key}'" in content:
    print(f"\n  Key '{key}': found")
else:
    print(f"\n  Key '{key}': MISSING - searching for immersive section in UI_STRINGS to add it")
    # Find where immersive keys are defined
    idx = content.find("'immersive.title'")
    if idx < 0:
        idx = content.find('"immersive.title"')
    if idx > 0:
        line_num = content[:idx].count('\n') + 1
        print(f"    immersive.title found at line {line_num}")

# Check common.auto_play
key2 = 'common.auto_play'
if f"'{key2}'" in content:
    print(f"  Key '{key2}': found")
else:
    print(f"  Key '{key2}': MISSING")
