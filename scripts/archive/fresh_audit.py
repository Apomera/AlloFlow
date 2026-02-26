"""Fresh audit of AlloFlowANTI.txt for remaining technical debt"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()
lines = content.split('\n')
print(f'Total lines: {len(lines)}')

# 1. Timer leaks in useEffect
print('\n=== TIMER LEAKS (useEffect w/o cleanup) ===')
tl = 0
for i, line in enumerate(lines):
    if re.search(r'set(Interval|Timeout)\s*\(', line):
        in_effect = any('useEffect' in lines[j] for j in range(max(0,i-20), i))
        if in_effect:
            has_cleanup = any('clearInterval' in lines[j] or 'clearTimeout' in lines[j] for j in range(i, min(len(lines), i+30)))
            if not has_cleanup:
                tl += 1
                print(f'  L{i+1}: {line.strip()[:120]}')
print(f'TOTAL: {tl}')

# 2. Missing key props
print('\n=== MAP CALLS MISSING key= ===')
mk = 0
for i, line in enumerate(lines):
    if '.map(' in line:
        has_key = any('key=' in lines[j] for j in range(i, min(len(lines), i+15)))
        if not has_key:
            mk += 1
            if mk <= 10:
                print(f'  L{i+1}: {line.strip()[:120]}')
if mk > 10:
    print(f'  ... and {mk-10} more')
print(f'TOTAL: {mk}')

# 3. Model references
print('\n=== GEMINI MODEL REFERENCES ===')
mr = 0
for i, line in enumerate(lines):
    ll = line.lower()
    if 'gemini' in ll and ('model' in ll or 'flash' in ll or 'tts' in ll or 'generativelanguage' in ll):
        mr += 1
        print(f'  L{i+1}: {line.strip()[:120]}')
print(f'TOTAL: {mr}')

# 4. Project cleanup - stale scripts
print('\n=== DONE ===')
