"""Scan for Quiz, Glossary, Concept Sort hooks"""
import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

comp_start = None
for i, l in enumerate(lines):
    if 'const AlloFlowContent' in l:
        comp_start = i
        break

categories = {
    'Quiz': ['quiz', 'question', 'assessment'],
    'Glossary': ['glossary', 'term', 'vocab', 'definition'],
    'ConceptSort': ['sort', 'bucket', 'concept', 'card', 'drag'],
    'UIChrome': ['sidebar', 'modal', 'collapsed', 'panel', 'toast', 'confetti', 'drawer', 'menu', 'toolbar'],
    'Settings': ['setting', 'config', 'pref', 'theme', 'lang', 'locale', 'dark'],
}

results = {cat: [] for cat in categories}

for i in range(comp_start, min(comp_start + 5000, len(lines))):
    l = lines[i]
    m = re.search(r'const \[(\w+),\s*(set\w+)\]\s*=\s*useState\((.+)\);\s*$', l.rstrip())
    if not m:
        continue
    if '// [PHASE 4 MIGRATED]' in l:
        continue
    var = m.group(1)
    setter = m.group(2)
    init = m.group(3).strip()
    v = var.lower()
    is_lazy = init.startswith('() =>')
    
    for cat, keywords in categories.items():
        if any(kw in v for kw in keywords):
            results[cat].append({
                'line': i+1, 'var': var, 'setter': setter,
                'init': init[:60], 'lazy': is_lazy
            })
            break

out = []
for cat in ['Quiz', 'Glossary', 'ConceptSort', 'UIChrome', 'Settings']:
    hooks = results[cat]
    simple = [h for h in hooks if not h['lazy']]
    lazy = [h for h in hooks if h['lazy']]
    out.append(f"\n=== {cat}: {len(hooks)} hooks ({len(simple)} simple, {len(lazy)} lazy) ===")
    for h in hooks:
        tag = '[LAZY]' if h['lazy'] else '[SIMPLE]'
        out.append(f"  L{h['line']} {tag}: {h['var']} = useState({h['init']})")

with open('phase4_tier34_scan.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('\n'.join(out))
