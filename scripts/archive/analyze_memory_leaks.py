"""
Pass 3: Memory Leak Analysis
Scan for:
1. addEventListener without removeEventListener
2. URL.createObjectURL without revokeObjectURL  
3. Audio/Media resources without cleanup
4. useEffect without cleanup return
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# === ANALYSIS 1: addEventListener vs removeEventListener ===
results.append("=" * 70)
results.append("ANALYSIS 1: Event Listener Cleanup")
results.append("=" * 70)

add_listeners = []
remove_listeners = []
for i, line in enumerate(lines, 1):
    if 'addEventListener(' in line and not line.strip().startswith('//'):
        add_listeners.append((i, line.strip()[:120]))
    if 'removeEventListener(' in line and not line.strip().startswith('//'):
        remove_listeners.append((i, line.strip()[:120]))

results.append(f"addEventListener calls: {len(add_listeners)}")
results.append(f"removeEventListener calls: {len(remove_listeners)}")
results.append(f"Ratio: {len(remove_listeners)}/{len(add_listeners)}")

# Check for add without matching remove (by event name)
add_events = {}
for ln, text in add_listeners:
    match = re.search(r"addEventListener\('(\w+)'", text)
    if match:
        event = match.group(1)
        add_events.setdefault(event, []).append(ln)

remove_events = {}
for ln, text in remove_listeners:
    match = re.search(r"removeEventListener\('(\w+)'", text)
    if match:
        event = match.group(1)
        remove_events.setdefault(event, []).append(ln)

results.append("")
results.append("Event type breakdown:")
all_events = set(list(add_events.keys()) + list(remove_events.keys()))
for event in sorted(all_events):
    adds = len(add_events.get(event, []))
    removes = len(remove_events.get(event, []))
    status = "OK" if removes >= adds else "WARN"
    results.append(f"  [{status}] '{event}': add={adds}, remove={removes}")
    if status == "WARN":
        for ln in add_events.get(event, []):
            results.append(f"    Unmatched add at L{ln}")

# === ANALYSIS 2: URL.createObjectURL vs revokeObjectURL ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 2: Object URL Cleanup")
results.append("=" * 70)

creates = []
revokes = []
for i, line in enumerate(lines, 1):
    if 'createObjectURL(' in line and not line.strip().startswith('//'):
        creates.append((i, line.strip()[:120]))
    if 'revokeObjectURL(' in line and not line.strip().startswith('//'):
        revokes.append((i, line.strip()[:120]))

results.append(f"createObjectURL calls: {len(creates)}")
results.append(f"revokeObjectURL calls: {len(revokes)}")
for ln, text in creates:
    results.append(f"  CREATE L{ln}: {text}")
for ln, text in revokes:
    results.append(f"  REVOKE L{ln}: {text}")

# === ANALYSIS 3: Audio/Media resources ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 3: Audio/Media Resources")
results.append("=" * 70)

new_audio = []
audio_src = []
for i, line in enumerate(lines, 1):
    if 'new Audio(' in line and not line.strip().startswith('//'):
        new_audio.append((i, line.strip()[:120]))
    if '.src =' in line and 'audio' in line.lower() and not line.strip().startswith('//'):
        audio_src.append((i, line.strip()[:120]))

results.append(f"new Audio() calls: {len(new_audio)}")
for ln, text in new_audio:
    results.append(f"  L{ln}: {text}")
results.append(f"audio.src assignments: {len(audio_src)}")

# === ANALYSIS 4: useEffect cleanup returns ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 4: useEffect Cleanup Returns")
results.append("=" * 70)

use_effects = 0
with_cleanup = 0
without_cleanup = []
for i, line in enumerate(lines, 1):
    if 'React.useEffect(' in line or 'useEffect(' in line:
        if line.strip().startswith('//'):
            continue
        use_effects += 1
        # Search forward for 'return' within the effect body (crude but effective)
        has_return = False
        brace_depth = 0
        for j in range(i-1, min(i+50, len(lines))):
            brace_depth += lines[j].count('{') - lines[j].count('}')
            if 'return' in lines[j] and ('() =>' in lines[j] or 'function' in lines[j] or 'clearTimeout' in lines[j] or 'clearInterval' in lines[j] or 'removeEventListener' in lines[j]):
                has_return = True
                break
            if brace_depth <= 0 and j > i:
                break
        if has_return:
            with_cleanup += 1
        else:
            without_cleanup.append(i)

results.append(f"Total useEffect calls: {use_effects}")
results.append(f"With cleanup return: {with_cleanup}")
results.append(f"Without cleanup return: {len(without_cleanup)}")
if without_cleanup:
    results.append("Effects without cleanup (first 20):")
    for ln in without_cleanup[:20]:
        results.append(f"  L{ln}: {lines[ln-1].strip()[:120]}")

with open('pass3_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print(f"Results written to pass3_results.txt ({len(results)} lines)")
