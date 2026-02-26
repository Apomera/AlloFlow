"""Deep analysis - write to file for clean reading"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []
risky_effects = []
safe_effects = 0

for i, line in enumerate(lines, 1):
    if ('React.useEffect(' in line or 'useEffect(' in line) and not line.strip().startswith('//'):
        has_risky = False
        risky_patterns = []
        has_cleanup = False
        brace_depth = 0
        
        for j in range(i-1, min(i+30, len(lines))):
            text = lines[j]
            brace_depth += text.count('{') - text.count('}')
            
            if 'addEventListener' in text:
                risky_patterns.append('addEventListener')
                has_risky = True
            if 'setInterval' in text:
                risky_patterns.append('setInterval')
                has_risky = True
            if 'setTimeout' in text and 'clearTimeout' not in text:
                risky_patterns.append('setTimeout')
                has_risky = True
            if 'new Audio' in text:
                risky_patterns.append('new Audio')
                has_risky = True
            if 'createObjectURL' in text:
                risky_patterns.append('createObjectURL')
                has_risky = True
            if 'return' in text and ('() =>' in text or 'clearTimeout' in text or 'clearInterval' in text or 'removeEventListener' in text):
                has_cleanup = True
            if brace_depth <= 0 and j > i:
                break
        
        if has_risky and not has_cleanup:
            risky_effects.append((i, risky_patterns, lines[i-1].strip()[:120]))
        elif not has_risky:
            safe_effects += 1

results.append(f"Safe useEffects (state-sync, no cleanup needed): {safe_effects}")
results.append(f"Risky useEffects without cleanup: {len(risky_effects)}")
for ln, patterns, text in risky_effects:
    results.append(f"  L{ln} [{', '.join(set(patterns))}]: {text}")

with open('pass3_deep_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Done.")
