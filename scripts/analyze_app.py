import sys, re
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt','r',encoding='utf-8',errors='replace').read()
lines = content.split('\n')

# 1. activeView tabs
views = set(re.findall(r"activeView\s*===\s*['\"]([\\w-]+)['\"]", content))
print(f"activeView tabs ({len(views)}):")
for v in sorted(views):
    print(f"  {v}")

print()
# 2. Wizard content types
types = set(re.findall(r"contentType\s*===\s*['\"]([\\w-]+)['\"]", content))
print(f"contentType values ({len(types)}):")
for t in sorted(types):
    print(f"  {t}")

print()
# 3. wordSoundsActivity values
activities = set(re.findall(r"wordSoundsActivity\s*===\s*['\"]([\\w-]+)['\"]", content))
print(f"wordSoundsActivity values ({len(activities)}):")
for a in sorted(activities):
    print(f"  {a}")

print()
# 4. Count major state vars
state_count = sum(1 for l in lines if 'useState(' in l and 'const [' in l)
effect_count = sum(1 for l in lines if 'useEffect(' in l)
callback_count = sum(1 for l in lines if 'useCallback(' in l)
memo_count = sum(1 for l in lines if 'useMemo(' in l)
ref_count = sum(1 for l in lines if 'useRef(' in l)
print(f"React hooks: useState={state_count}, useEffect={effect_count}, useCallback={callback_count}, useMemo={memo_count}, useRef={ref_count}")

print()
# 5. Major component sections (look for large comment banners)
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('// ===') or stripped.startswith('// ---') and len(stripped) > 30:
        if any(kw in stripped.upper() for kw in ['SECTION', 'MODULE', 'COMPONENT', 'MAIN', 'APP', 'RENDER', 'WIZARD', 'GAME', 'ADVENTURE', 'WORD SOUND', 'PARENTING', 'TOOL']):
            print(f"  L{i+1}: {stripped[:100]}")

print()
# 6. Error boundaries
eb = sum(1 for l in lines if 'ErrorBoundary' in l)
print(f"ErrorBoundary references: {eb}")

# 7. Accessibility features
aria = sum(1 for l in lines if 'aria-' in l)
role = sum(1 for l in lines if 'role=' in l)
tab = sum(1 for l in lines if 'tabIndex' in l or 'tabindex' in l)
print(f"Accessibility: aria-*={aria}, role={role}, tabIndex={tab}")

print()
print(f"Total lines: {len(lines)}")
