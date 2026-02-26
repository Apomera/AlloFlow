import re

# Remove buildMode and gridRange from the source module props (they're local vars, not props)
f = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\stem_lab_module_clean.js', 'r', encoding='utf-8')
source = f.read()
f.close()

# Remove from destructuring: ,\n    buildMode,\n    gridRange
source = source.replace(',\n    buildMode,\n    gridRange', '')
# Also try comma-separated
source = source.replace(',\n    buildMode', '').replace(',\n    gridRange', '')

with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\stem_lab_module_clean.js', 'w', encoding='utf-8') as out:
    out.write(source)
print("Removed buildMode and gridRange from source props")

# Remove from main app props too
f2 = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'r', encoding='utf-8')
main = f2.read()
f2.close()

main = main.replace(', buildMode, gridRange', '')
main = main.replace(', buildMode', '').replace(', gridRange', '')

with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt', 'w', encoding='utf-8') as out:
    out.write(main)
print("Removed buildMode and gridRange from main app props")

# Verify destructuring is clean
f3 = open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\stem_lab_module_clean.js', 'r', encoding='utf-8')
source2 = f3.read()
f3.close()
match = re.search(r'const\s*\{([^}]+)\}\s*=\s*props', source2)
if match:
    props = [p.strip() for p in match.group(1).split(',') if p.strip()]
    print(f"\nFinal props count: {len(props)}")
    # Verify new props are there
    for p in ['areaChallenge', 'areaFeedback', 'areaAnswer', 'fracChallenge', 'fracFeedback', 'fracAnswer']:
        print(f"  {p}: {'YES' if p in props else 'NO'}")
    for p in ['buildMode', 'gridRange']:
        print(f"  {p}: {'REMOVED' if p not in props else 'STILL PRESENT - ERROR'}")
