"""
Comprehensive Write-Only State Audit — Deep Dive

For each state variable, this script:
1. Finds all `const [name, setName] = useState(...)` declarations
2. Searches for ALL references to `name` (getter) across the ENTIRE file
3. Categorizes each reference as: JSX render, style prop, condition, effect dep, prop pass,
   console.log, template literal, spread/destructure, type check, or other
4. Determines if the state is truly write-only (setter called but getter never read)
5. Also checks for performance hazards: state used ONLY in console.log, state read
   but never rendered (invisible work)

Output: detailed report per variable with verdict and line references.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()
    lines = content.split('\n')

out = []

# Find all useState declarations
useState_pattern = re.compile(
    r'const\s+\[(\w+),\s*(set\w+)\]\s*=\s*useState'
)

state_vars = []
for m in useState_pattern.finditer(content):
    getter = m.group(1)
    setter = m.group(2)
    line_num = content[:m.start()].count('\n') + 1
    state_vars.append((getter, setter, line_num))

out.append(f"TOTAL useState DECLARATIONS: {len(state_vars)}")
out.append("=" * 70)

# For each state var, analyze usage
write_only = []
read_only_debug = []  # read only in debug/console
perf_concerns = []

for getter, setter, decl_line in state_vars:
    # Find all SETTER uses
    setter_uses = [(i+1, l.strip()[:100]) for i, l in enumerate(lines) 
                   if setter in l and i+1 != decl_line]
    
    # Find all GETTER uses (exclude the declaration line itself and setter calls)
    getter_pattern = re.compile(r'(?<!\w)' + re.escape(getter) + r'(?!\w)')
    getter_uses = []
    for i, l in enumerate(lines):
        if i+1 == decl_line:
            continue
        # Skip lines where getter appears only inside a setter call
        if setter in l:
            # Check if getter appears outside of setter context on this line
            line_no_setter = l.replace(setter, '')
            if getter_pattern.search(line_no_setter):
                getter_uses.append((i+1, l.strip()[:120]))
        else:
            if getter_pattern.search(l):
                getter_uses.append((i+1, l.strip()[:120]))
    
    # Skip if getter name is too common (1-2 chars) — too many false positives
    if len(getter) <= 2:
        continue
    
    # Classify getter uses
    categories = {
        'jsx_render': [],
        'condition': [],
        'style': [],
        'effect_dep': [],
        'prop_pass': [],
        'console': [],
        'template': [],
        'spread': [],
        'callback': [],
        'other': []
    }
    
    for ln, txt in getter_uses:
        txt_lower = txt.lower()
        if 'console.' in txt or 'debugLog' in txt or 'warnLog' in txt:
            categories['console'].append(ln)
        elif f'{{{getter}}}' in txt or f'>{getter}<' in txt or f'{{{getter} ' in txt:
            categories['jsx_render'].append(ln)
        elif 'style=' in txt or 'className=' in txt:
            categories['style'].append(ln)
        elif f'if (' in txt or f'if(' in txt or '?' in txt or '&&' in txt or '||' in txt:
            categories['condition'].append(ln)
        elif f'[{getter}]' in txt and ('], [' in txt or '], ()' in txt):
            categories['effect_dep'].append(ln)
        elif f'{getter}=' in txt or f'{getter} =' in txt:
            categories['prop_pass'].append(ln)
        elif '`' in txt and getter in txt:
            categories['template'].append(ln)
        elif '...' in txt and getter in txt:
            categories['spread'].append(ln)
        elif 'useCallback' in txt or 'useMemo' in txt:
            categories['callback'].append(ln)
        else:
            categories['other'].append(ln)
    
    total_reads = len(getter_uses)
    write_count = len(setter_uses)
    
    # Determine verdict
    if total_reads == 0 and write_count > 0:
        verdict = "WRITE-ONLY (SAFE TO REMOVE)"
        write_only.append((getter, setter, decl_line, write_count))
    elif total_reads > 0 and all(ln in categories['console'] for ln, _ in getter_uses):
        verdict = "READ ONLY IN DEBUG (consider removing)"
        read_only_debug.append((getter, setter, decl_line, total_reads))
    elif total_reads == 0 and write_count == 0:
        verdict = "FULLY DEAD (declaration only, never used)"
        write_only.append((getter, setter, decl_line, 0))
    else:
        # Check for performance concerns: setter called many times but getter read rarely 
        if write_count > 5 and total_reads <= 2:
            perf_concerns.append((getter, setter, decl_line, write_count, total_reads))
            verdict = f"PERF CONCERN: {write_count} writes, {total_reads} reads"
        else:
            continue  # Normal usage, skip
    
    out.append(f"\n{'='*60}")
    out.append(f"  {getter} (L{decl_line}) — {verdict}")
    out.append(f"  Setter: {setter}, Writes: {write_count}, Reads: {total_reads}")
    if setter_uses:
        out.append(f"  SETTER CALLS:")
        for ln, txt in setter_uses[:5]:
            out.append(f"    L{ln}: {txt}")
        if len(setter_uses) > 5:
            out.append(f"    ... and {len(setter_uses)-5} more")
    if getter_uses:
        out.append(f"  GETTER READS:")
        for ln, txt in getter_uses[:5]:
            out.append(f"    L{ln}: {txt}")
        if len(getter_uses) > 5:
            out.append(f"    ... and {len(getter_uses)-5} more")
    
    # Show category breakdown
    active_cats = {k:v for k,v in categories.items() if v}
    if active_cats:
        out.append(f"  CATEGORIES: {', '.join(f'{k}({len(v)})' for k,v in active_cats.items())}")

# Summary
out.append(f"\n{'='*70}")
out.append(f"SUMMARY")
out.append(f"{'='*70}")
out.append(f"Write-only / fully dead: {len(write_only)}")
for g, s, ln, wc in write_only:
    out.append(f"  - {g} (L{ln}): {s} called {wc}x, getter NEVER read")
out.append(f"\nDebug-only reads: {len(read_only_debug)}")
for g, s, ln, rc in read_only_debug:
    out.append(f"  - {g} (L{ln}): read {rc}x but only in console/debug")
out.append(f"\nPerformance concerns (high write/low read): {len(perf_concerns)}")
for g, s, ln, wc, rc in perf_concerns:
    out.append(f"  - {g} (L{ln}): {wc} writes, {rc} reads")

result = '\n'.join(out)
with open('write_only_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)

# Print summary only
for line in out[out.index('SUMMARY')-1:]:
    print(line)
