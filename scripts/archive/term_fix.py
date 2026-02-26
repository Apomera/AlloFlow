"""Fix WordScrambleGame: useMemo inside useEffect + bare 'term' ReferenceError.
Also audit for other potential undefined references across the codebase.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
changes = 0

# --- FIX 1: Remove broken useMemo inside useEffect ---
old_line = "    const items = useMemo(() => data.filter(item => item.term && item.term.length > 2), [data, term]);"
new_line = "    const items = data.filter(item => item.term && item.term.length > 2);"

count = content.count(old_line)
if count != 1:
    print(f"ERROR: useMemo/term match count: {count}")
    sys.exit(1)
content = content.replace(old_line, new_line)
changes += 1
print(f"[OK] Fixed WordScrambleGame: removed useMemo inside useEffect, bare 'term' ref")

# Write
open(filepath, 'w', encoding='utf-8').write(content)
print(f"\n{changes} fix(es) applied.")

# --- AUDIT: Search for other potential undefined/ReferenceError patterns ---
print("\n=== BROADER AUDIT: Potential bare variable references ===")
lines = content.split('\n')

issues_found = []

# Check for useMemo/useCallback inside useEffect (invalid hook nesting)
in_useEffect = False
effect_start = 0
for i, l in enumerate(lines):
    stripped = l.strip()
    if 'useEffect(' in stripped:
        in_useEffect = True
        effect_start = i
    if in_useEffect:
        if 'useMemo(' in stripped or 'useCallback(' in stripped or 'useState(' in stripped:
            issues_found.append(f"L{i+1}: HOOK INSIDE EFFECT: {stripped[:100]}")
        # Rough end of useEffect - look for }, [
        if stripped.startswith('}, [') or stripped == '});':
            in_useEffect = False

# Check for undefined being explicitly set in history items
for i, l in enumerate(lines):
    if 'setHistory' in l and 'undefined' in l:
        issues_found.append(f"L{i+1}: UNDEFINED IN setHistory: {l.strip()[:100]}")

# Check for missing optional chaining on common patterns
for i, l in enumerate(lines):
    if i > 30000 and i < 70000:
        # Config properties that might be undefined
        if re.search(r'config\.standards(?!\?)', l) and 'config:' not in l and '//' not in l.split('config')[0]:
            if '||' not in l and '??' not in l and '?' not in l.split('config.standards')[0][-1:]:
                issues_found.append(f"L{i+1}: POSSIBLE UNDEF config.standards: {l.strip()[:100]}")

print(f"Found {len(issues_found)} potential issues:")
for issue in issues_found[:30]:
    print(f"  {issue}")
