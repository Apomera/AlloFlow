"""Map all audio bank references to understand the refactoring scope."""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
REPORT = os.path.join(os.path.dirname(__file__), 'audio_callers.txt')

with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

out = []

# Find all audio bank names and their definitions
banks = ['PHONEME_AUDIO_BANK', 'INSTRUCTION_AUDIO', 'LETTER_NAME_AUDIO', 'ISOLATION_AUDIO']

for bank in banks:
    out.append(f"\n{'='*60}")
    out.append(f"BANK: {bank}")
    out.append(f"{'='*60}")
    
    # Find definition
    for i, line in enumerate(lines):
        if f'const {bank}' in line or f'{bank} = {{' in line:
            out.append(f"  DEF at L{i+1}: {line.strip()[:80]}")
    
    # Find all references (excluding the definition block)
    refs = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        if bank in stripped:
            # Skip definition lines (those with data:audio)
            if 'data:audio' in stripped:
                continue
            # Skip comments
            if stripped.startswith('//'):
                continue
            refs.append((i+1, stripped[:100]))
    
    out.append(f"  Total references: {len(refs)}")
    for ln, ctx in refs:
        out.append(f"    L{ln}: {ctx}")

# Also find which components are NOT wrapped in React.memo
out.append(f"\n{'='*60}")
out.append(f"COMPONENTS WITHOUT React.memo")
out.append(f"{'='*60}")

components_no_memo = []
components_with_memo = []
for i, line in enumerate(lines):
    # Match: const ComponentName = ({ ... }) => {
    m = re.match(r'\s*const\s+([A-Z]\w+)\s*=\s*\(\{', line)
    if m:
        name = m.group(1)
        # Check if previous line or same line has React.memo
        context = lines[max(0,i-2):i+1]
        has_memo = any('React.memo' in c for c in context)
        if has_memo:
            components_with_memo.append((i+1, name))
        else:
            components_no_memo.append((i+1, name))
    
    # Also match: const ComponentName = React.memo(({ ... }) => {
    m2 = re.match(r'\s*const\s+([A-Z]\w+)\s*=\s*React\.memo\(', line)
    if m2:
        name = m2.group(1)
        if name not in [c[1] for c in components_with_memo]:
            components_with_memo.append((i+1, name))

out.append(f"\nWith React.memo ({len(components_with_memo)}):")
for ln, name in components_with_memo:
    out.append(f"  L{ln}: {name}")

out.append(f"\nWithout React.memo ({len(components_no_memo)}):")
for ln, name in components_no_memo:
    out.append(f"  L{ln}: {name}")

with open(REPORT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print(f"Done. Report: {REPORT}")
