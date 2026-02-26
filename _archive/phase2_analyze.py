"""Phase 2 analysis: check audio bank lazy-loading, timer leaks, missing keys, model refs."""
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

results = []

# 1. Audio bank lazy proxy status
results.append("=== AUDIO BANK LAZY PROXY STATUS ===")
audio_banks = ['PHONEME_AUDIO_BANK', 'INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'LETTER_AUDIO', 'LETTER_NAME_AUDIO']
for bank in audio_banks:
    proxy_match = re.search(rf'{bank}\s*=\s*new\s+Proxy', content)
    direct_match = re.search(rf'const\s+{bank}\s*=\s*\{{', content)
    load_raw = re.search(rf'_LOAD_{bank}_RAW', content)
    if proxy_match:
        results.append(f"  {bank}: ✅ Lazy Proxy (Proxy pattern found)")
    elif load_raw:
        results.append(f"  {bank}: ✅ Has raw loader but check if proxied")
    elif direct_match:
        line_num = content[:direct_match.start()].count('\n') + 1
        results.append(f"  {bank}: ❌ EAGER LOAD (direct const at L{line_num})")
    else:
        results.append(f"  {bank}: ❓ Not found")

# 2. Timer leak inventory
results.append("\n=== TIMER LEAK ANALYSIS ===")
setTimeout_count = len(re.findall(r'setTimeout\s*\(', content))
setInterval_count = len(re.findall(r'setInterval\s*\(', content))
clearTimeout_count = len(re.findall(r'clearTimeout\s*\(', content))
clearInterval_count = len(re.findall(r'clearInterval\s*\(', content))
results.append(f"  setTimeout calls: {setTimeout_count}")
results.append(f"  clearTimeout calls: {clearTimeout_count}")
results.append(f"  setInterval calls: {setInterval_count}")
results.append(f"  clearInterval calls: {clearInterval_count}")
results.append(f"  Potential timer leaks: ~{setTimeout_count - clearTimeout_count} setTimeout, ~{setInterval_count - clearInterval_count} setInterval")

# Find setTimeouts NOT inside useEffect (potential leaks)
results.append("\n  Sample timer locations (first 10 without clear):")
timer_locs = []
for i, line in enumerate(lines):
    if 'setTimeout(' in line and 'clearTimeout' not in line:
        timer_locs.append((i+1, line.strip()[:120]))
for ln, text in timer_locs[:10]:
    results.append(f"    L{ln}: {text}")
results.append(f"  Total setTimeout without matching clear on same line: {len(timer_locs)}")

# 3. Missing key props
results.append("\n=== MISSING KEY PROPS ===")
map_calls = re.finditer(r'\.map\s*\(\s*\(?\s*(\w+)', content)
no_key_count = 0
has_key_count = 0
samples = []
for m in map_calls:
    # Check if the following 300 chars contain 'key='
    after = content[m.end():m.end()+400]
    next_map = after.find('.map(')
    if next_map > 0:
        after = after[:next_map]
    if 'key=' in after or 'key =' in after:
        has_key_count += 1
    else:
        no_key_count += 1
        line_num = content[:m.start()].count('\n') + 1
        if len(samples) < 8:
            samples.append(f"    L{line_num}: {lines[line_num-1].strip()[:120]}")
results.append(f"  .map() calls with key=: {has_key_count}")
results.append(f"  .map() calls WITHOUT key=: {no_key_count}")
results.append(f"  Samples without key:")
for s in samples:
    results.append(s)

# 4. Gemini model references
results.append("\n=== GEMINI MODEL REFERENCES ===")
model_patterns = [
    r'gemini-[\w\d.-]+',
]
model_refs = {}
for pattern in model_patterns:
    for m in re.finditer(pattern, content):
        model_name = m.group()
        line_num = content[:m.start()].count('\n') + 1
        if model_name not in model_refs:
            model_refs[model_name] = []
        model_refs[model_name].append(line_num)
for model, locs in sorted(model_refs.items()):
    results.append(f"  {model}: {len(locs)} references at lines {', '.join(str(l) for l in locs[:8])}{' ...' if len(locs) > 8 else ''}")

# 5. useState count in AlloFlowContent
results.append("\n=== ALLOFLOWCONTENT STATE COUNT ===")
# Find AlloFlowContent boundaries (rough)
afc_start = content.find('const AlloFlowContent')
afc_useState = 0
if afc_start > 0:
    # Count useState in next ~8000 lines
    afc_section = content[afc_start:afc_start+500000]
    afc_useState = len(re.findall(r'useState\s*\(', afc_section))
    results.append(f"  useState hooks in AlloFlowContent: {afc_useState}")

with open('phase2_analysis.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))

print("Done. See phase2_analysis.txt")
