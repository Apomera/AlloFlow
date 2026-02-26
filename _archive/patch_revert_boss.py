filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 26251 (0-indexed: 26250) was incorrectly changed from `)}` to `))}` 
# Revert it back
line_26251 = lines[26250]
print(f"Line 26251 before: {line_26251.rstrip()}")

if '))}' in line_26251:
    lines[26250] = line_26251.replace('))}', ')}', 1)
    print(f"Line 26251 after:  {lines[26250].rstrip()}")
    print("✅ Reverted quiz Boss Battle line back to `)}` ")
else:
    print("⚠️ Line 26251 doesn't contain `))}`, skipping")

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ Done.")
