"""
XP System Audit — Analyze every handleScoreUpdate/onScoreUpdate call site
Categorize: has resourceId (deduped) vs no resourceId (can double-award)
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

out = []
out.append("XP SYSTEM AUDIT")
out.append("=" * 70)

# Find all direct handleScoreUpdate calls (not the definition)
deduped = []
not_deduped = []

for i, line in enumerate(lines):
    ln = i + 1
    stripped = line.strip()
    
    # Skip definitions
    if 'const handleScoreUpdate' in stripped or 'const handleGameScoreUpdate' in stripped:
        continue
    if '// Removed XP' in stripped:
        continue
    if 'deps' in stripped or 'useCallback' in stripped:
        continue
    
    if 'handleScoreUpdate(' in stripped:
        # Extract the arguments 
        match = re.search(r'handleScoreUpdate\((.+)\)', stripped)
        if match:
            args = match.group(1)
            # Count commas to determine if resourceId is passed
            # handleScoreUpdate(score, name, resourceId)
            parts = args.split(',')
            has_resource_id = len(parts) >= 3 and parts[2].strip() not in ['null', 'undefined', '']
            
            entry = {
                'line': ln,
                'args': args.strip()[:100],
                'context': stripped[:120],
                'has_resource_id': has_resource_id,
                'resource_id': parts[2].strip() if len(parts) >= 3 else 'MISSING'
            }
            
            if has_resource_id:
                deduped.append(entry)
            else:
                not_deduped.append(entry)
    
    elif 'onScoreUpdate(' in stripped and 'onScoreUpdate={' not in stripped and 'prop' not in stripped.lower():
        match = re.search(r'onScoreUpdate\??\.?\((.+)\)', stripped)
        if match:
            args = match.group(1)
            # onScoreUpdate only passes (score, name) — resourceId is added by handleGameScoreUpdate wrapper
            entry = {
                'line': ln,
                'args': args.strip()[:100],
                'context': stripped[:120],
                'note': 'Goes through handleGameScoreUpdate which adds generatedContent?.id'
            }
            deduped.append(entry)

out.append(f"\n=== DEDUPED (have resourceId or use wrapper): {len(deduped)} ===")
for e in deduped:
    rid = e.get('resource_id', 'via wrapper')
    out.append(f"  L{e['line']}: {e['args'][:80]}")

out.append(f"\n=== NOT DEDUPED (no resourceId, can double-award): {len(not_deduped)} ===")
for e in not_deduped:
    out.append(f"  L{e['line']}: {e['args'][:80]} | resourceId={e['resource_id']}")

out.append(f"\n=== CROSSWORD awardedPoints ANALYSIS ===")
# Special check for crossword - does it call onScoreUpdate multiple times?
in_crossword = False
crossword_calls = []
for i, line in enumerate(lines):
    if 'CrosswordGame' in line and 'React.memo' in line:
        in_crossword = True
    if in_crossword and ('onScoreUpdate' in line and 'onScoreUpdate={' not in line and 'prop' not in line.lower()):
        crossword_calls.append((i+1, line.strip()[:100]))
    if in_crossword and line.strip().startswith('const ') and 'React.memo' in line and 'CrosswordGame' not in line:
        in_crossword = False

for ln, txt in crossword_calls:
    out.append(f"  L{ln}: {txt}")

result = '\n'.join(out)
with open('xp_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)

# Print summary
print(f"DEDUPED: {len(deduped)}")
print(f"NOT DEDUPED: {len(not_deduped)}")
for e in not_deduped:
    print(f"  L{e['line']}: {e['resource_id']}")
