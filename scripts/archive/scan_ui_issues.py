"""Scan for slider locations, raw strings, and AlloBot wizard state - output to file."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').readlines()
out = []

out.append("=== Raw string t() calls ===")
raw_keys = ['phono_activity_length', 'phono_activity_length_hint', 
            'ortho_activity_length', 'ortho_activity_hint_off', 'ortho_activity_hint']
for key in raw_keys:
    found = False
    for i, l in enumerate(lines):
        if key in l and ("t('" in l or 't("' in l or 't(`' in l):
            out.append(f"  {key} -> L{i+1}: {l.strip()[:200]}")
            found = True
    if not found:
        out.append(f"  {key} -> NO t() USAGE FOUND")

out.append("")
out.append("=== UI_STRINGS word_sounds block ===")
for i, l in enumerate(lines):
    if 'word_sounds:' in l and '{' in l and i < 15000:
        out.append(f"  block starts L{i+1}")
        for j in range(i, min(len(lines), i + 300)):
            for key in raw_keys:
                if key + ':' in lines[j]:
                    out.append(f"    FOUND {key} at L{j+1}: {lines[j].strip()[:150]}")
        break

out.append("")
out.append("=== Slider rendering (wordSoundsSessionGoal / orthoSessionGoal) ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('wordSoundsSessionGoal' in s or 'orthoSessionGoal' in s) and ('range' in s.lower() or 'onChange' in s or 'value=' in s):
        out.append(f"  L{i+1}: {s[:200]}")

out.append("")
out.append("=== QuickStartWizard render ===")
for i, l in enumerate(lines):
    if '<QuickStartWizard' in l:
        out.append(f"  L{i+1}: {l.strip()[:200]}")

out.append("")
out.append("=== AlloBot showQuickStart state ===")
for i, l in enumerate(lines):
    s = l.strip()
    if 'showQuickStart' in s and ('useState' in s or 'setShowQuickStart' in s):
        out.append(f"  L{i+1}: {s[:200]}")

result = '\n'.join(out)
with open('scan_results.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print(result)
