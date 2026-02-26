filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Print context to verify
print("=== Lines 66286-66296 (1-indexed) ===")
for i in range(66285, min(66296, len(lines))):
    print(f"  {i+1}: {lines[i].rstrip()}")

fixes = 0

# Check for stray `)}` on line 66291 (0-indexed 66290)
if len(lines) > 66290 and lines[66290].strip() == ')}':
    lines[66290] = ''
    fixes += 1
    print("\n✅ Removed stray ')}' on line 66291")

# Check for broken `{adventureState.history) : null}` on line 66293 (0-indexed 66292)
if len(lines) > 66292 and 'adventureState.history) : null}' in lines[66292]:
    lines[66292] = ''
    fixes += 1
    print("✅ Removed broken line 66293")

if fixes > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"\n✅ Applied {fixes} fix(es).")
else:
    print("\n⚠️ Expected patterns not found at those lines. Searching whole file...")
    for i, line in enumerate(lines):
        if 'adventureState.history) : null}' in line:
            print(f"  Found broken line at {i+1}: {line.rstrip()}")
            lines[i] = ''
            fixes += 1
    # Also look for stray )} before the history.map
    for i, line in enumerate(lines):
        if i > 0 and lines[i].strip() == ')}' and i+1 < len(lines) and lines[i+1].strip() == '':
            if i+2 < len(lines) and 'adventureState.history.map' in lines[i+2]:
                print(f"  Found stray ')}}' at {i+1}: {line.rstrip()}")
                lines[i] = ''
                fixes += 1
    if fixes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"✅ Applied {fixes} fix(es) via search.")
    else:
        print("❌ Could not locate the broken lines.")
