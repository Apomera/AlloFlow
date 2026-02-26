"""
Fix 'or' phoneme issues:
1. Add r-controlled vowels to estimatePhonemesBasic digraphs list
2. Report on the missing 'or' audio entry in PHONEME_AUDIO_BANK
"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

changes = []

# ===== FIX 1: Add r-controlled vowels to digraphs list =====
old_digraphs = "const digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck', 'qu', 'wr', 'kn', 'gn', 'gh', 'mb'];"
new_digraphs = "const digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck', 'qu', 'wr', 'kn', 'gn', 'gh', 'mb', 'ar', 'er', 'ir', 'or', 'ur'];"

if old_digraphs in content:
    content = content.replace(old_digraphs, new_digraphs)
    changes.append("FIX 1: Added 'ar', 'er', 'ir', 'or', 'ur' to estimatePhonemesBasic digraphs list")
else:
    print("WARNING: Could not find digraphs line to patch!")
    print("Searching for partial match...")
    idx = content.find("const digraphs = ['sh',")
    if idx >= 0:
        # Get the line
        line_end = content.find(';', idx)
        old_line = content[idx:line_end+1]
        print(f"Found: {old_line}")
    else:
        print("No digraphs line found at all!")

# ===== FIX 2: Check for 'or' audio and find insertion point =====
# Find the 'ur' entry and get the next line (insertion point)
lines = content.split('\n')
ur_line_idx = None
ir_line_idx = None
air_line_idx = None

for i, line in enumerate(lines):
    s = line.strip()
    if s.startswith("'ur':") and 'data:audio' in s:
        ur_line_idx = i
    if s.startswith("'ir':") and 'data:audio' in s:
        ir_line_idx = i
    if s.startswith("'air':") and 'data:audio' in s:
        air_line_idx = i

print(f"\nPHONEME_AUDIO_BANK positions:")
print(f"  'ir' at line {ir_line_idx+1 if ir_line_idx else 'NOT FOUND'}")
print(f"  'ur' at line {ur_line_idx+1 if ur_line_idx else 'NOT FOUND'}")
print(f"  'air' at line {air_line_idx+1 if air_line_idx else 'NOT FOUND'}")

# Check if 'or' already exists
or_exists = any(line.strip().startswith("'or':") and 'data:audio' in line for line in lines)
print(f"  'or' exists: {or_exists}")

if not or_exists:
    print("\n  >>> 'or' audio is MISSING - needs to be generated via Phoneme app tool")
    print("  >>> After generating, inject between 'ur' and 'air' entries")
    changes.append("FIX 2 PENDING: 'or' audio entry needs to be generated and injected into PHONEME_AUDIO_BANK")

# Write the changes
f = open(FILE, 'w', encoding='utf-8')
f.write(content)
f.close()

print("\n=== CHANGES APPLIED ===")
for c in changes:
    print(f"  ✓ {c}")

# Verify the fix
f = open(FILE, 'r', encoding='utf-8-sig')
verify_content = f.read()
f.close()

if new_digraphs in verify_content:
    print("\n✅ Digraphs fix VERIFIED - r-controlled vowels are now in the list")
else:
    print("\n❌ Digraphs fix FAILED - could not verify")

# Test decomposition logic mentally
print("\n=== DECOMPOSITION EXAMPLES (expected after fix) ===")
print("  'orbit'  -> should decompose as: or, b, i, t")
print("  'cart'   -> should decompose as: c, ar, t")
print("  'bird'   -> should decompose as: b, ir, d")
print("  'burn'   -> should decompose as: b, ur, n")
print("  'fern'   -> should decompose as: f, er, n")
