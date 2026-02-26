"""
Identify hot-path inline style objects for useMemo conversion.
Focus on style={{}} inside:
1. Components with state-driven re-renders (timers, animations, drag)
2. .map() loops (each item creates style objects N times)
3. Components with many useState/useEffect hooks
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Find all style={{}} occurrences
style_objects = []
for i, line in enumerate(lines):
    if 'style={{' in line:
        stripped = line.strip()
        
        # Check if this is inside a .map() by scanning backwards
        in_map = False
        for j in range(i-1, max(0, i-30), -1):
            if '.map(' in lines[j]:
                in_map = True
                break
            if lines[j].strip().startswith('const ') or lines[j].strip().startswith('return'):
                break
        
        # Check if style contains dynamic values (variables, ternaries, template literals)
        style_content = stripped
        is_dynamic = any(k in style_content for k in ['${', '? ', '?:', 'px`', 'var(', '`'])
        has_vars = bool(re.search(r':\s*[a-zA-Z_]\w*[,}]', style_content))
        
        style_objects.append({
            'line': i + 1,
            'in_map': in_map,
            'is_dynamic': is_dynamic or has_vars,
            'text': stripped[:120]
        })

# Categorize  
in_map_dynamic = [s for s in style_objects if s['in_map'] and s['is_dynamic']]
in_map_static = [s for s in style_objects if s['in_map'] and not s['is_dynamic']]
standalone_dynamic = [s for s in style_objects if not s['in_map'] and s['is_dynamic']]
standalone_static = [s for s in style_objects if not s['in_map'] and not s['is_dynamic']]

out = []
out.append(f"=== STYLE OBJECTS IN .map() LOOPS (DYNAMIC — highest impact): {len(in_map_dynamic)} ===")
for s in in_map_dynamic[:15]:
    out.append(f"  L{s['line']}: {s['text']}")
if len(in_map_dynamic) > 15:
    out.append(f"  ... and {len(in_map_dynamic)-15} more")

out.append(f"\n=== STYLE OBJECTS IN .map() LOOPS (STATIC — move to CSS): {len(in_map_static)} ===")
for s in in_map_static[:10]:
    out.append(f"  L{s['line']}: {s['text']}")
if len(in_map_static) > 10:
    out.append(f"  ... and {len(in_map_static)-10} more")

out.append(f"\n=== STANDALONE DYNAMIC STYLES: {len(standalone_dynamic)} ===")
for s in standalone_dynamic[:10]:
    out.append(f"  L{s['line']}: {s['text']}")
if len(standalone_dynamic) > 10:
    out.append(f"  ... and {len(standalone_dynamic)-10} more")

out.append(f"\n=== STANDALONE STATIC STYLES (move to CSS class): {len(standalone_static)} ===")
for s in standalone_static[:10]:
    out.append(f"  L{s['line']}: {s['text']}")
if len(standalone_static) > 10:
    out.append(f"  ... and {len(standalone_static)-10} more")

out.append(f"\n=== SUMMARY ===")
out.append(f"  In .map() + dynamic: {len(in_map_dynamic)} (HIGHEST PERF IMPACT)")
out.append(f"  In .map() + static: {len(in_map_static)} (move to CSS)")
out.append(f"  Standalone dynamic: {len(standalone_dynamic)}")
out.append(f"  Standalone static: {len(standalone_static)} (move to CSS)")
out.append(f"  TOTAL: {len(style_objects)}")

result = '\n'.join(out)
with open('style_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Map+dynamic: {len(in_map_dynamic)}, Map+static: {len(in_map_static)}, Standalone dynamic: {len(standalone_dynamic)}, Static: {len(standalone_static)}")
