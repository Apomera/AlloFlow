import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find AlloFlowContent
comp_start = None
for i, l in enumerate(lines):
    if 'const AlloFlowContent' in l:
        comp_start = i
        break

# Scan for adventure/story-related useState hooks
adv_hooks = []
for i in range(comp_start, min(comp_start + 5000, len(lines))):
    l = lines[i]
    m = re.search(r'const \[(\w+),\s*(set\w+)\]\s*=\s*useState\((.+)\);\s*$', l.rstrip())
    if not m:
        continue
    var = m.group(1)
    setter = m.group(2)
    init = m.group(3).strip()
    v = var.lower()
    if any(x in v for x in ['adventure', 'story', 'narrative', 'quest', 'chapter']):
        # Check for lazy initializer (function in useState)
        is_lazy = init.startswith('() =>')
        adv_hooks.append({
            'line': i+1,
            'var': var,
            'setter': setter,
            'init': init,
            'lazy': is_lazy,
            'ctx': l.strip()[:120]
        })

print(f"Adventure hooks found: {len(adv_hooks)}")
print(f"Simple init: {sum(1 for h in adv_hooks if not h['lazy'])}")
print(f"Lazy init: {sum(1 for h in adv_hooks if h['lazy'])}")
print()
for h in adv_hooks:
    tag = '[LAZY]' if h['lazy'] else '[SIMPLE]'
    print(f"  L{h['line']} {tag}: {h['var']} = useState({h['init'][:50]})")
