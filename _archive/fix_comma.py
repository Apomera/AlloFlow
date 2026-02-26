"""Fix missing comma on line 1038 of AlloFlowANTI.txt"""

filepath = 'AlloFlowANTI.txt'

# Read with BOM-aware encoding
with open(filepath, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Line 1038 (0-indexed: 1037)
line = lines[1037]
stripped = line.rstrip('\r\n')
print(f"BEFORE - Line 1038 last 30 chars: {repr(stripped[-30:])}")

# The line should end with  ...gdc="  but is missing a trailing comma
# All other lines in this object end with  ...gdc=",
if stripped.endswith('"') and not stripped.endswith('",'):
    stripped = stripped + ','
    lines[1037] = stripped + '\r\n'
    print(f"AFTER  - Line 1038 last 30 chars: {repr(lines[1037].rstrip()[-30:])}")
    
    # Write back
    with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
        f.writelines(lines)
    
    print("SUCCESS: Added missing comma to line 1038")
else:
    print(f"No fix needed - line already ends correctly or unexpected format")
    print(f"Actual ending: {repr(stripped[-10:])}")
