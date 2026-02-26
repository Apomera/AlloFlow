import re

base = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'

f = open(f'{base}\\AlloFlowANTI.txt', 'r', encoding='utf-8')
data = f.read()
f.close()

changes = 0

# === Fix 1: Add gridRange to StemLab render props ===
old_props = 'gridPoints, mathInput'
new_props = 'gridPoints, gridRange, mathInput'
if old_props in data and 'gridRange' not in data[data.find('StemLabComponent'):data.find('StemLabComponent')+3000]:
    # Only replace within the StemLabComponent render context
    render_start = data.find('return React.createElement(StemLabComponent')
    if render_start >= 0:
        render_end = data.find(');', render_start) + 2
        render_block = data[render_start:render_end]
        if 'gridRange' not in render_block:
            new_block = render_block.replace('gridPoints, mathInput', 'gridPoints, gridRange, mathInput')
            data = data[:render_start] + new_block + data[render_end:]
            changes += 1
            print("✅ Added gridRange to StemLab render props")
        else:
            print("gridRange already in render props")
    else:
        print("ERROR: Could not find StemLabComponent render")
else:
    print("gridRange may already be in render props or pattern not found")

# === Fix 2: Deduplicate loadPsychometricProbes() calls ===
# Keep only the FIRST call (L2645) and comment out the rest
lines = data.split('\n')
probe_count = 0
for i, line in enumerate(lines):
    if 'loadPsychometricProbes()' in line.strip() and not line.strip().startswith('//'):
        probe_count += 1
        if probe_count > 1:
            # Comment out duplicate calls
            lines[i] = line.replace('loadPsychometricProbes()', '/* loadPsychometricProbes() - deduplicated */')
            changes += 1

if probe_count > 1:
    data = '\n'.join(lines)
    print(f"✅ Deduplicated {probe_count - 1} extra loadPsychometricProbes() calls (kept 1)")
else:
    print(f"Only {probe_count} probe call found, no dedup needed")

# === Save ===
if changes > 0:
    with open(f'{base}\\AlloFlowANTI.txt', 'w', encoding='utf-8') as out:
        out.write(data)
    print(f"\n✅ Saved {changes} changes to AlloFlowANTI.txt")
else:
    print("\nNo changes needed")
