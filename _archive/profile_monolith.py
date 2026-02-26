"""
AlloFlow Monolith Profiler
===========================
Analyzes the composition of AlloFlowANTI.txt to identify:
  - Code vs inline data (base64) ratio
  - Component size distribution
  - CSS block sizes
  - Largest sections
  - Optimization opportunities
"""
import sys, os, re, json
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
REPORT = os.path.join(os.path.dirname(__file__), 'profile_report.txt')

out = []
def log(msg):
    out.append(msg)

with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

total_chars = sum(len(l) for l in lines)
log(f"MONOLITH PROFILE")
log(f"{'='*70}")
log(f"Total lines: {len(lines)}")
log(f"Total chars: {total_chars:,}")
log(f"Total bytes: {os.path.getsize(MONOLITH):,}")

# ============================================================
# 1. BASE64 DATA ANALYSIS
# ============================================================
log(f"\n{'='*70}")
log(f"1. INLINE BASE64 DATA")
log(f"{'='*70}")

b64_chars = 0
b64_lines = 0
b64_blocks = []
current_block_start = None
current_block_chars = 0

for i, line in enumerate(lines):
    # Count base64 data in data: URIs
    b64_matches = re.findall(r'data:[^;]+;base64,[A-Za-z0-9+/=]+', line)
    if b64_matches:
        line_b64 = sum(len(m) for m in b64_matches)
        b64_chars += line_b64
        b64_lines += 1
        if current_block_start is None:
            current_block_start = i
            current_block_chars = line_b64
        else:
            current_block_chars += line_b64
    else:
        if current_block_start is not None and current_block_chars > 1000:
            b64_blocks.append((current_block_start+1, i, current_block_chars))
        current_block_start = None
        current_block_chars = 0

b64_pct = b64_chars / total_chars * 100
log(f"  Base64 data: {b64_chars:,} chars ({b64_pct:.1f}% of file)")
log(f"  Lines with base64: {b64_lines}")
log(f"  Estimated raw audio size: ~{b64_chars * 3 // 4 // 1024:,} KB")
log(f"\n  Top base64 blocks (by size):")
b64_blocks.sort(key=lambda x: -x[2])
for start, end, chars in b64_blocks[:15]:
    # Try to identify what's at this location
    context = lines[max(0, start-3):start+1]
    label = ""
    for c in reversed(context):
        if '//' in c or 'const ' in c or 'PHONEME' in c or 'AUDIO' in c:
            label = c.strip()[:60]
            break
    log(f"    L{start}-L{end}: {chars:,} chars ({chars*3//4//1024}KB) | {label}")

# ============================================================
# 2. CSS ANALYSIS
# ============================================================
log(f"\n{'='*70}")
log(f"2. INLINE CSS")
log(f"{'='*70}")

css_chars = 0
in_style = False
style_blocks = []
style_start = None

for i, line in enumerate(lines):
    stripped = line.strip()
    if '<style' in stripped:
        in_style = True
        style_start = i
    if in_style:
        css_chars += len(line)
    if '</style>' in stripped and in_style:
        in_style = False
        style_blocks.append((style_start+1, i+1, sum(len(lines[j]) for j in range(style_start, i+1))))

css_pct = css_chars / total_chars * 100
log(f"  CSS data: {css_chars:,} chars ({css_pct:.1f}% of file)")
log(f"  Style blocks: {len(style_blocks)}")
for start, end, chars in style_blocks[:5]:
    log(f"    L{start}-L{end}: {chars:,} chars ({end-start+1} lines)")

# ============================================================
# 3. COMPONENT SIZE DISTRIBUTION
# ============================================================
log(f"\n{'='*70}")
log(f"3. COMPONENT SIZE DISTRIBUTION")
log(f"{'='*70}")

components = []
for i, line in enumerate(lines):
    # Match component definitions
    m = re.match(r'\s*const\s+(\w+)\s*=\s*(?:React\.memo\()?(?:\(\{|\(\(|\()\s*', line)
    if m and m.group(1)[0].isupper():
        components.append((i+1, m.group(1)))
    
    # Also match function component declarations
    m2 = re.match(r'\s*(?:const|function)\s+(\w+)\s*=?\s*\(', line)
    if m2 and m2.group(1)[0].isupper() and m2.group(1) not in [c[1] for c in components]:
        # Check if it looks like a component (returns JSX)
        if 'Component' in m2.group(1) or 'View' in m2.group(1) or 'Panel' in m2.group(1) or 'Modal' in m2.group(1):
            components.append((i+1, m2.group(1)))

# Estimate size of each component (from start to next component)
component_sizes = []
for idx, (start, name) in enumerate(components):
    if idx + 1 < len(components):
        end = components[idx + 1][0]
    else:
        end = len(lines)
    size = sum(len(lines[j]) for j in range(start-1, min(end-1, len(lines))))
    line_count = end - start
    component_sizes.append((name, start, end, size, line_count))

component_sizes.sort(key=lambda x: -x[3])
log(f"  Total components found: {len(component_sizes)}")
log(f"\n  {'Component':<35} {'Start':>6} {'Lines':>7} {'Size':>10}")
log(f"  {'-'*35} {'-'*6} {'-'*7} {'-'*10}")
for name, start, end, size, lc in component_sizes[:25]:
    log(f"  {name:<35} {start:>6} {lc:>7} {size//1024:>7} KB")

# ============================================================
# 4. SECTION ANALYSIS (by major landmarks)
# ============================================================
log(f"\n{'='*70}")
log(f"4. SECTION ANALYSIS")
log(f"{'='*70}")

sections = {
    'UI_STRINGS + Config': (1, 900),
    'PHONEME_AUDIO_BANK': (900, 1140),
    'State Declarations': (1140, 2500),
    'Word Sounds Views': (2500, 4300),
    'Phoneme Engine': (4300, 6500),
    'Word Sounds Modal': (6500, 10000),
    'Localization': (10000, 13000),
    'Games (Bingo/Scramble)': (13000, 18000),
    'Infrastructure Components': (18000, 28000),
    'AlloFlowContent Main': (28000, 57000),
    'LargeFileTranscriber+': (57000, 65000),
    'Final Renders': (65000, len(lines)),
}

for name, (start, end) in sections.items():
    actual_end = min(end, len(lines))
    chars = sum(len(lines[i]) for i in range(start-1, actual_end))
    # Count base64 in this section
    section_b64 = 0
    for i in range(start-1, actual_end):
        b64_m = re.findall(r'data:[^;]+;base64,[A-Za-z0-9+/=]+', lines[i])
        section_b64 += sum(len(m) for m in b64_m)
    code_chars = chars - section_b64
    log(f"  {name:<30} L{start:>5}-{actual_end:<5} {chars//1024:>5} KB ({code_chars//1024} code + {section_b64//1024} data)")

# ============================================================
# 5. REACT HOOK USAGE
# ============================================================
log(f"\n{'='*70}")
log(f"5. REACT HOOK USAGE")
log(f"{'='*70}")

hooks = defaultdict(int)
for line in lines:
    for hook in ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext']:
        hooks[hook] += line.count(f'React.{hook}')

for hook, count in sorted(hooks.items(), key=lambda x: -x[1]):
    log(f"  React.{hook}: {count}")

# ============================================================
# 6. MEMOIZATION ANALYSIS
# ============================================================
log(f"\n{'='*70}")
log(f"6. MEMOIZATION OPPORTUNITIES")
log(f"{'='*70}")

memo_count = sum(1 for l in lines if 'React.memo(' in l)
callback_count = hooks['useCallback']
memo_hook_count = hooks['useMemo']
log(f"  React.memo components: {memo_count}")
log(f"  useCallback: {callback_count}")
log(f"  useMemo: {memo_hook_count}")
log(f"  Total state variables (useState): {hooks['useState']}")
log(f"  Total effects (useEffect): {hooks['useEffect']}")
log(f"  Total refs (useRef): {hooks['useRef']}")

# ============================================================
# 7. RE-RENDER RISK ANALYSIS
# ============================================================
log(f"\n{'='*70}")
log(f"7. RE-RENDER RISK (inline object/array literals in JSX)")
log(f"{'='*70}")

inline_objects = 0
inline_arrays = 0
inline_functions = 0
for i, line in enumerate(lines):
    stripped = line.strip()
    # Inline objects in JSX props: style={{...}} or prop={{...}}
    if re.search(r'=\{\{', stripped) and ('style' in stripped or 'className' not in stripped):
        inline_objects += 1
    # Inline arrow functions in JSX: onClick={() => ...}
    if re.search(r'=\{(?:\(\)|[\w,\s]+)\s*=>', stripped):
        inline_functions += 1

log(f"  Inline style/object props: {inline_objects}")
log(f"  Inline arrow functions in JSX: {inline_functions}")
log(f"  (Each creates a new reference per render, defeating React.memo)")

# Write report
with open(REPORT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print(f"Done. Report: {REPORT}")
