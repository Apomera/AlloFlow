"""
Categorize unguarded await calls by risk level.
High-risk: API calls (callGemini, fetch, transcribe), audio operations
Low-risk: await new Promise(setTimeout), simple state delays
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

high_risk = []
medium_risk = []
low_risk = []

for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('*'):
        continue
    if 'await ' not in line:
        continue
    
    # Check if this await is inside a try block
    in_try = False
    brace_depth = 0
    for j in range(i-1, max(0, i-50), -1):
        check = lines[j].strip()
        brace_depth += check.count('}') - check.count('{')
        if ('try {' in check or 'try{' in check or check == 'try') and brace_depth <= 0:
            in_try = True
            break
    
    if in_try:
        continue
    
    ln = i + 1
    
    # Categorize
    if any(k in stripped for k in ['callGemini', 'fetch(', 'transcribe', '.generateContent', 'callAPI']):
        high_risk.append((ln, stripped[:120]))
    elif any(k in stripped for k in ['handleAudio', 'playAudio', 'onPlayAudio', 'playBlending', 'speak(', 'audioCtx', 'decodeAudioData']):
        high_risk.append((ln, stripped[:120]))
    elif any(k in stripped for k in ['Promise.all', 'Promise.race', '.blob()', '.json()', '.text()', '.arrayBuffer()']):
        medium_risk.append((ln, stripped[:120]))
    elif 'new Promise' in stripped and 'setTimeout' in stripped:
        low_risk.append((ln, stripped[:120]))
    elif 'new Promise' in stripped:
        medium_risk.append((ln, stripped[:120]))
    else:
        # Check if it's calling another async function
        if any(k in stripped for k in ['await ', 'Async', 'generate', 'load', 'save', 'upload', 'download', 'convert']):
            medium_risk.append((ln, stripped[:120]))
        else:
            low_risk.append((ln, stripped[:120]))

# Output
out = []
out.append(f"=== HIGH RISK (API/audio calls): {len(high_risk)} ===")
for ln, txt in high_risk:
    out.append(f"  L{ln}: {txt}")

out.append(f"\n=== MEDIUM RISK (Promise chains, data ops): {len(medium_risk)} ===")
for ln, txt in medium_risk:
    out.append(f"  L{ln}: {txt}")

out.append(f"\n=== LOW RISK (setTimeout delays): {len(low_risk)} ===")
for ln, txt in low_risk:
    out.append(f"  L{ln}: {txt}")

out.append(f"\nTOTAL: {len(high_risk) + len(medium_risk) + len(low_risk)}")
out.append(f"  High: {len(high_risk)}")
out.append(f"  Medium: {len(medium_risk)}")
out.append(f"  Low: {len(low_risk)}")

result = '\n'.join(out)
with open('await_risk_report.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"HIGH: {len(high_risk)}, MEDIUM: {len(medium_risk)}, LOW: {len(low_risk)}")
