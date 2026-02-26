"""Exhaustive search for student profiles / config presets feature."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()

out = []

# Method 1: Find ALL <select elements and nearby context
out.append("=== ALL <select elements (line + 2 lines context) ===")
for i, l in enumerate(lines):
    if '<select' in l and i > 50000:
        out.append(f"L{i+1}: {l.strip()[:160]}")
        if i+1 < len(lines): out.append(f"L{i+2}: {lines[i+1].strip()[:160]}")

# Method 2: Find anything with "profile" in render area
out.append("\n=== 'profile' in JSX (>50000) ===")
for i, l in enumerate(lines):
    if 'profile' in l.lower() and i > 50000:
        out.append(f"L{i+1}: {l.strip()[:160]}")

# Method 3: Look for "save" + "current" near each other
out.append("\n=== save + current (anywhere) ===")
for i, l in enumerate(lines):
    ll = l.lower()
    if 'save' in ll and 'current' in ll:
        out.append(f"L{i+1}: {l.strip()[:160]}")

# Method 4: Look for "import" + "json" near each other (not import JS module)
out.append("\n=== import + json (non-module, >40000) ===")
for i, l in enumerate(lines):
    ll = l.lower()
    if 'import' in ll and 'json' in ll and i > 40000 and 'from' not in ll:
        out.append(f"L{i+1}: {l.strip()[:160]}")

# Method 5: Look for savedConfigs, presetConfig, configPresets state
out.append("\n=== Config/Preset state patterns ===")
for kw in ['useState', 'useRef']:
    for i, l in enumerate(lines):
        if kw in l and ('config' in l.lower() or 'preset' in l.lower() or 'profile' in l.lower()):
            if 'override' not in l.lower() and 'firebase' not in l.lower():
                out.append(f"L{i+1}: {l.strip()[:160]}")

result = '\n'.join(out)
open('scripts/archive/profile_exhaustive.txt', 'w', encoding='utf-8').write(result)
print(f"Done! {len(out)} lines in profile_exhaustive.txt")
