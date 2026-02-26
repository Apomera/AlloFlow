import re, sys, json
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find all component starts to determine boundaries
components = []
for i, l in enumerate(lines):
    m = re.match(r'(?:function|const)\s+([A-Z]\w+)\s*(?:\(|=\s*(?:React\.memo\()?(?:function|\())', l)
    if m:
        components.append((i, m.group(1)))

# Find the main component (the one with 300+ useState hooks)
# Search all components for the one with the most useState
best = None
best_count = 0
for idx, (start, name) in enumerate(components):
    end = components[idx+1][0] if idx+1 < len(components) else len(lines)
    count = sum(1 for i in range(start, min(start+5000, end)) if 'useState(' in lines[i])
    if count > best_count:
        best_count = count
        best = (start, name, end)

print(f"Main component: {best[1]} at L{best[0]+1} ({best_count} useState hooks)")
start, comp_name, comp_end = best

# Now extract ONLY Word Sounds related useState hooks
ws_hooks = []
for i in range(start, min(start+5000, comp_end)):
    l = lines[i]
    m = re.search(r'const \[(\w+),\s*(set\w+)\]\s*=\s*useState\((.+)\);\s*$', l.rstrip())
    if not m:
        continue
    var_name = m.group(1)
    setter_name = m.group(2)
    init_val = m.group(3).strip()
    
    v = var_name.lower()
    # Word Sounds related variables
    if any(x in v for x in ['ws', 'wordsound', 'phonem', 'preload', 'blend', 'segment',
                              'isolat', 'rhyme', 'syllable', 'mapping', 'counting',
                              'lettername', 'lettertracing', 'spelling']):
        ws_hooks.append({
            'line': i+1,
            'var': var_name,
            'setter': setter_name,
            'init': init_val,
            'full': l.rstrip()
        })

# Also find hooks with 'word' that are word-sounds specific (not generic)
for i in range(start, min(start+5000, comp_end)):
    l = lines[i]
    m = re.search(r'const \[(\w+),\s*(set\w+)\]\s*=\s*useState\((.+)\);\s*$', l.rstrip())
    if not m:
        continue
    var_name = m.group(1)
    setter_name = m.group(2)
    init_val = m.group(3).strip()
    v = var_name.lower()
    
    # Check if already added
    if any(h['var'] == var_name for h in ws_hooks):
        continue
    
    # Word-specific but not already caught
    if v.startswith('word') or v.startswith('currentword') or v.startswith('selectedword'):
        ws_hooks.append({
            'line': i+1,
            'var': var_name,
            'setter': setter_name,
            'init': init_val,
            'full': l.rstrip()
        })

# Sort by line number
ws_hooks.sort(key=lambda h: h['line'])

print(f"\nWord Sounds hooks: {len(ws_hooks)}")
for h in ws_hooks:
    print(f"  L{h['line']}: {h['var']} = useState({h['init'][:60]})")

# Save for use
with open('phase4_ws_hooks.json', 'w', encoding='utf-8') as f:
    json.dump(ws_hooks, f, indent=2)
print(f"\nSaved to phase4_ws_hooks.json")
