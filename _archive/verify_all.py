"""Verify all fixes - write to file"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_verify_all.txt', 'w', encoding='utf-8')

# 1. isMountedRef
out.write("=== FIX 1: isMountedRef ===\n")
for i, line in enumerate(lines):
    if 'isMountedRef' in line:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")

# 2. Fallbacks
out.write("\n=== FIX 2: setPreloadedWords fallbacks ===\n")
for i, line in enumerate(lines):
    if 'Using local fallback' in line or 'local fallback' in line.lower():
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")

# 3. Remaining errors
out.write("\n=== Remaining error-only branches ===\n")
for i, line in enumerate(lines):
    if 'REORDER FAILED' in line or 'UPDATE FAILED' in line or 'DELETE FAILED' in line:
        out.write(f"  L{i+1}: {line.strip()[:150]}\n")

out.close()
print("Done -> _verify_all.txt")
