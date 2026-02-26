"""Compare TTS-related code between current and backup AlloFlowANTI files"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

curr_lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8').readlines()
bak_lines = open('AlloFlowANTI.bak.txt', 'r', encoding='utf-8').readlines()

print(f"Current: {len(curr_lines)} lines")
print(f"Backup:  {len(bak_lines)} lines")
print(f"Difference: {len(curr_lines) - len(bak_lines)} lines")
print()

# Find key TTS functions in both files
def find_function(lines, marker):
    """Find line number of a marker"""
    results = []
    for i, line in enumerate(lines):
        if marker in line:
            results.append((i+1, line.rstrip()[:100]))
    return results

markers = [
    'const callTTS',
    'const fetchTTSBytes',  
    'const warnLog',
    'const debugLog',
    'DEBUG_LOG',
    'speechSynthesis.speak',
    'SpeechSynthesisUtterance',
    'const speakWord',
    'onGenerateAudio',
    'ttsQuotaExhausted',
    'playSequence(',
    'GEMINI_MODELS',
    'gemini-2.5-flash-preview-tts',
    'const pcmToWav',
    'fetchTTSBytes returned null',
    'BROWSER TTS',
    'browser TTS',
    'Browser TTS',
    'Falling back to',
]

print("=" * 80)
print("MARKER COMPARISON")
print("=" * 80)
for marker in markers:
    curr_hits = find_function(curr_lines, marker)
    bak_hits = find_function(bak_lines, marker)
    if len(curr_hits) != len(bak_hits):
        print(f"\n*** DIFFERENCE: '{marker}' ***")
        print(f"  Current: {len(curr_hits)} hits")
        print(f"  Backup:  {len(bak_hits)} hits")
        # Show which lines are only in one
        for h in curr_hits:
            print(f"    CURR L{h[0]}: {h[1]}")
        for h in bak_hits:
            print(f"    BAK  L{h[0]}: {h[1]}")

# Now do a focused diff on the callTTS function area
print()
print("=" * 80)
print("FOCUSED DIFF: callTTS function")
print("=" * 80)

def extract_region(lines, start_marker, size=50):
    for i, line in enumerate(lines):
        if start_marker in line:
            return i, lines[i:i+size]
    return -1, []

# Compare callTTS
for func_name in ['const callTTS', 'const fetchTTSBytes', 'const speakWord']:
    ci, curr_region = extract_region(curr_lines, func_name, 60)
    bi, bak_region = extract_region(bak_lines, func_name, 60)
    if ci < 0 and bi < 0:
        continue
    print(f"\n--- {func_name} ---")
    print(f"  Current starts at L{ci+1}, Backup starts at L{bi+1}")
    # Find differences
    diffs = 0
    max_lines = max(len(curr_region), len(bak_region))
    for j in range(max_lines):
        cl = curr_region[j].rstrip() if j < len(curr_region) else "<MISSING>"
        bl = bak_region[j].rstrip() if j < len(bak_region) else "<MISSING>"
        if cl != bl:
            diffs += 1
            if diffs <= 20:  # Limit output
                print(f"  L{ci+1+j} CURR: {cl[:120]}")
                print(f"  L{bi+1+j} BAK:  {bl[:120]}")
                print()
    print(f"  Total differences in first 60 lines: {diffs}")

# Also compare the warnLog/debugLog definitions
print()
print("=" * 80)
print("FOCUSED DIFF: warnLog/debugLog definitions")
print("=" * 80)
for func_name in ['const warnLog', 'const debugLog', 'DEBUG_LOG']:
    for label, lines_list in [('CURR', curr_lines), ('BAK', bak_lines)]:
        for i, line in enumerate(lines_list):
            if func_name in line and i < 200:  # Only check early in file
                print(f"  {label} L{i+1}: {line.rstrip()[:120]}")
