"""Fresh monolith analysis - component density, feature inventory, code quality metrics"""
import re

FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_fresh_analysis.txt', 'w', encoding='utf-8')
total = len(lines)
out.write(f"Total lines: {total}\n")
out.write(f"File size: {sum(len(l.encode('utf-8')) for l in lines[:1000]) * (total/1000) / 1048576:.1f} MB (estimated)\n\n")

# 1. Component inventory
out.write("=== 1. COMPONENT INVENTORY ===\n")
components = []
for i, line in enumerate(lines):
    if 'const ' in line and '=' in line and ('React.memo' in line or 'React.forwardRef' in line or 
        ('({' in line and '=>' in line and 'return (' not in line)):
        # Heuristic: component declarations
        name = line.strip().split('const ')[1].split('=')[0].strip() if 'const ' in line else ''
        if name and name[0].isupper() and len(name) > 3 and 'CSS' not in name and 'URL' not in name:
            components.append((i+1, name[:50]))
for ln, name in components:
    out.write(f"  L{ln}: {name}\n")
out.write(f"  Total component-like declarations: {len(components)}\n")

# 2. Feature flags and constants
out.write("\n=== 2. FEATURE FLAGS ===\n")
for i, line in enumerate(lines):
    if 'const ' in line and ('= true' in line or '= false' in line):
        stripped = line.strip()
        if stripped.startswith('const ') and ('DISABLE' in line or 'ENABLE' in line or 'FLAG' in line.upper() or 'FEATURE' in line.upper()):
            out.write(f"  L{i+1}: {stripped[:120]}\n")

# 3. API integrations
out.write("\n=== 3. API INTEGRATIONS ===\n")
apis = set()
for i, line in enumerate(lines):
    if 'generativelanguage.googleapis.com' in line or 'callGemini' in line and 'const' in line:
        apis.add(f"Gemini API (L{i+1})")
    if 'callImagen' in line and 'const' in line:
        apis.add(f"Imagen API (L{i+1})")
    if 'callTTS' in line and 'const' in line:
        apis.add(f"TTS API (L{i+1})")
    if 'speechSynthesis' in line and i < 50000:
        apis.add(f"Web Speech API")
    if 'SpeechRecognition' in line or 'webkitSpeechRecognition' in line:
        apis.add(f"Speech Recognition API")
    if 'IndexedDB' in line or 'idb-keyval' in line:
        apis.add(f"IndexedDB")
for a in sorted(apis):
    out.write(f"  {a}\n")

# 4. State hooks count
out.write("\n=== 4. STATE COMPLEXITY ===\n")
useState_count = sum(1 for l in lines if 'useState(' in l)
useRef_count = sum(1 for l in lines if 'useRef(' in l)
useEffect_count = sum(1 for l in lines if 'useEffect(' in l)
useCallback_count = sum(1 for l in lines if 'useCallback(' in l)
useMemo_count = sum(1 for l in lines if 'useMemo(' in l)
out.write(f"  useState:    {useState_count}\n")
out.write(f"  useRef:      {useRef_count}\n")
out.write(f"  useEffect:   {useEffect_count}\n")
out.write(f"  useCallback: {useCallback_count}\n")
out.write(f"  useMemo:     {useMemo_count}\n")

# 5. Educational activities/games
out.write("\n=== 5. ACTIVITY / GAME INVENTORY ===\n")
games = set()
for i, line in enumerate(lines):
    lower = line.lower()
    if 'game' in lower and ('const ' in line or 'function ' in line) and 'is' in lower:
        name = line.strip()[:100]
        if 'Game' in line or 'game' in line:
            games.add(f"L{i+1}: {name}")
for g in sorted(games):
    out.write(f"  {g}\n")

# 6. Audio asset size (base64 strings)
out.write("\n=== 6. AUDIO ASSET FOOTPRINT ===\n")
base64_lines = sum(1 for l in lines if len(l) > 500 and ('data:audio' in l or 'base64' in l.lower()))
long_lines = sum(1 for l in lines if len(l) > 1000)
out.write(f"  Lines > 500 chars with audio/base64: {base64_lines}\n")
out.write(f"  Lines > 1000 chars total: {long_lines}\n")

# 7. Error handling patterns
out.write("\n=== 7. ERROR HANDLING ===\n")
try_count = sum(1 for l in lines if l.strip().startswith('try'))
catch_count = sum(1 for l in lines if 'catch' in l and '(' in l)
console_error = sum(1 for l in lines if 'console.error' in l)
console_warn = sum(1 for l in lines if 'console.warn' in l)
error_boundary = sum(1 for l in lines if 'ErrorBoundary' in l)
out.write(f"  try blocks:       {try_count}\n")
out.write(f"  catch blocks:     {catch_count}\n")
out.write(f"  console.error:    {console_error}\n")
out.write(f"  console.warn:     {console_warn}\n")
out.write(f"  ErrorBoundary:    {error_boundary}\n")

# 8. Localization coverage
out.write("\n=== 8. LOCALIZATION ===\n")
t_calls = sum(1 for l in lines if "t('" in l or 't("' in l)
ts_calls = sum(1 for l in lines if "ts('" in l or 'ts("' in l)
out.write(f"  t() calls: {t_calls}\n")
out.write(f"  ts() calls: {ts_calls}\n")

# 9. Accessibility
out.write("\n=== 9. ACCESSIBILITY ===\n")
aria_count = sum(1 for l in lines if 'aria-' in l)
role_count = sum(1 for l in lines if 'role=' in l)
tabindex_count = sum(1 for l in lines if 'tabIndex' in l or 'tabindex' in l)
out.write(f"  aria-* attributes: {aria_count}\n")
out.write(f"  role attributes:   {role_count}\n")
out.write(f"  tabIndex:          {tabindex_count}\n")

# 10. Code density by region
out.write("\n=== 10. CODE DENSITY BY REGION (5K line blocks) ===\n")
for start in range(0, total, 5000):
    end = min(start + 5000, total)
    region_lines = lines[start:end]
    # Find most common keywords
    components_in_region = sum(1 for l in region_lines if 'const ' in l and '({' in l and '=>' in l)
    jsx_in_region = sum(1 for l in region_lines if '<div' in l or '<button' in l or '<span' in l)
    logic_in_region = sum(1 for l in region_lines if 'if (' in l or 'else' in l or 'switch' in l)
    out.write(f"  L{start+1}-{end}: Components:{components_in_region} JSX:{jsx_in_region} Logic:{logic_in_region}\n")

out.close()
print("Done -> _fresh_analysis.txt")
