"""Verify medium priority fixes"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
lines = content.split('\n')
f.close()

print("=== Verification Results ===")
print()

# 1. isMountedRef declaration
count = content.count('isMountedRef')
print(f"1. isMountedRef total references: {count}")

# Find declaration
for i, line in enumerate(lines):
    if 'isMountedRef' in line and 'useRef(true)' in line:
        print(f"   Declaration at L{i+1}: {line.strip()[:100]}")

# 2. Cleanup useEffect
for i, line in enumerate(lines):
    if 'isMountedRef.current = false' in line:
        print(f"   Cleanup at L{i+1}: {line.strip()[:100]}")

# 3. Guards
guard_count = content.count('if (isMountedRef.current)')
no_return_count = content.count('if (!isMountedRef.current) return;')
print(f"\n2. setTimeout guards:")
print(f"   if (isMountedRef.current) calls: {guard_count}")
print(f"   if (!isMountedRef.current) return calls: {no_return_count}")

# 4. Fallbacks
fallback_count = content.count('Using local fallback')
print(f"\n3. setPreloadedWords fallbacks: {fallback_count}")

# Show the fallback lines
for i, line in enumerate(lines):
    if 'Using local fallback' in line:
        print(f"   L{i+1}: {line.strip()[:120]}")

# 5. Check no remaining error-only branches
remaining_errors = 0
for i, line in enumerate(lines):
    if '❌ REORDER FAILED' in line or '❌ UPDATE FAILED' in line or '❌ DELETE FAILED' in line:
        remaining_errors += 1
        print(f"\n   ⚠️ Remaining error-only at L{i+1}: {line.strip()[:120]}")

print(f"\n4. Error-only branches remaining: {remaining_errors}")
print(f"\n=== Summary ===")
print(f"✅ isMountedRef: {count} refs")
print(f"✅ Guards: {guard_count + no_return_count} guarded timeouts")
print(f"✅ Fallbacks: {fallback_count} local fallbacks")
print(f"{'✅' if remaining_errors == 0 else '⚠️'} Error-only branches: {remaining_errors}")
