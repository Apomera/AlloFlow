"""Find exact locations of duplicate bracket assignment keys in PHONEME_AUDIO_BANK."""
import sys, os, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

MONOLITH = os.path.join(os.path.dirname(__file__), 'AlloFlowANTI.txt')
REPORT = os.path.join(os.path.dirname(__file__), 'inspect_result.txt')

with open(MONOLITH, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

out = []

out.append("=== PHONEME_AUDIO_BANK BRACKET ASSIGNMENTS ===")
assignments = {}
for i, line in enumerate(lines):
    m = re.search(r"PHONEME_AUDIO_BANK\['(\w+)'\]\s*=", line)
    if m:
        key = m.group(1)
        if key not in assignments:
            assignments[key] = []
        assignments[key].append(i+1)
        out.append(f"  L{i+1}: key='{key}' -> {line.strip()[:90]}")

out.append(f"\nTotal unique keys: {len(assignments)}")
dupes = {k: v for k, v in assignments.items() if len(v) > 1}
out.append(f"Duplicates: {dupes}")

out.append(f"\n=== useEffect WITHOUT DEPENDENCY ARRAYS ===")
for i in range(2500, min(10000, len(lines))):
    stripped = lines[i].strip()
    if 'React.useEffect(() =>' in stripped or 'React.useEffect(()=>' in stripped:
        has_deps = False
        end_line = i
        for j in range(i, min(i+100, len(lines))):
            if re.search(r'\},\s*\[', lines[j]):
                has_deps = True
                break
            if lines[j].strip() == '});' and j > i:
                end_line = j
                break
        if not has_deps:
            out.append(f"  L{i+1}: {stripped[:80]}")

out.append(f"\n=== PHONEME_STORAGE_KEY DEFINITIONS ===")
for i, line in enumerate(lines):
    if 'PHONEME_STORAGE_KEY' in line:
        out.append(f"  L{i+1}: {line.strip()[:120]}")

with open(REPORT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print(f"Done. Report: {REPORT}")
