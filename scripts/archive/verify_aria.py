"""Verify no corruptions from aria-label insertion"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')
lines = open('AlloFlowANTI.txt','r',encoding='utf-8-sig').readlines()
issues = 0

# Check 1: no '= aria-label' (arrow function corruption)
for i, l in enumerate(lines):
    if '= aria-label=' in l:
        print(f'CORRUPTION L{i+1}: arrow function broken')
        issues += 1

# Check 2: no unclosed aria-label={ expressions
for i, l in enumerate(lines):
    if 'aria-label={' in l:
        rest = l[l.index('aria-label={'):]
        d = 0
        ok = False
        for ch in rest:
            if ch == '{': d += 1
            elif ch == '}': d -= 1
            if d == 0:
                ok = True
                break
        if not ok:
            print(f'CORRUPTION L{i+1}: unclosed aria-label expression')
            issues += 1

# Check 3: every standalone aria-label line is well-formed
for i, l in enumerate(lines):
    stripped = l.strip()
    if stripped.startswith('aria-label="') and stripped.endswith('"'):
        if not re.match(r'^aria-label="[^"]+?"$', stripped):
            print(f'MALFORMED L{i+1}: {stripped[:80]}')
            issues += 1

# Check 4: duplicate aria-labels on same line
for i, l in enumerate(lines):
    if l.count('aria-label') > 1:
        print(f'DUPLICATE L{i+1}: multiple aria-labels')
        issues += 1

print(f'Issues found: {issues}')
if issues == 0:
    print('ALL CLEAR - no corruptions detected')
