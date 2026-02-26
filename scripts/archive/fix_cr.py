"""
Post-patch cleanup:
1. Fix double CR line endings (\r\r\n -> \r\n)  
2. Fix state ordering: move orthoSessionGoal declaration before includeOrthographic derivation
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

# Read raw bytes to fix line endings
with open(FILE, 'rb') as f:
    raw = f.read()

# Count double CRs
dbl_count = raw.count(b'\r\r\n')
print(f"Double CR occurrences: {dbl_count}")

# Fix all double CRs
raw = raw.replace(b'\r\r\n', b'\r\n')

# Write back
with open(FILE, 'wb') as f:
    f.write(raw)

# Now fix state ordering
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print(f"Total lines after CR fix: {len(lines)}")

# Find the includeOrthographic derivation and orthoSessionGoal declaration
derivation_idx = None
declaration_idx = None
for i in range(1465, 1480):
    l = lines[i].strip()
    if 'includeOrthographic = orthoSessionGoal > 0' in l:
        derivation_idx = i
    if 'orthoSessionGoal' in l and 'useState(0)' in l:
        declaration_idx = i

print(f"Derivation at L{derivation_idx+1 if derivation_idx else '?'}, declaration at L{declaration_idx+1 if declaration_idx else '?'}")

if derivation_idx is not None and declaration_idx is not None and derivation_idx < declaration_idx:
    # Move derivation AFTER declaration
    derivation_line = lines.pop(derivation_idx)
    # declaration_idx shifted by -1 since we removed a line before it
    new_declaration_idx = declaration_idx - 1
    # Insert after the declaration
    lines.insert(new_declaration_idx + 1, derivation_line)
    print(f"[OK] Moved derivation after declaration")
    
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"State ordering fixed")
else:
    print("[SKIP] No ordering fix needed")

# Final verification
with open(FILE, 'rb') as f:
    final = f.read()
remaining_dbl = final.count(b'\r\r\n')
print(f"Remaining double CRs: {remaining_dbl}")
