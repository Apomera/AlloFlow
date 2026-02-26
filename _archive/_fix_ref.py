import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

old = "latestAnalysis?.data?.originalText || ''"
new = "(history.slice().reverse().find(h => h && h.type === 'analysis')?.data?.originalText) || inputText || ''"

count = text.count(old)
print(f"Found {count} instance(s) of latestAnalysis reference")

if count > 0:
    text = text.replace(old, new)
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.write(text)
    print("FIXED - replaced with history lookup + inputText fallback")
else:
    print("Pattern not found - checking what's actually there")
    lines = text.split('\n')
    for i, l in enumerate(lines):
        if 'latestAnalysis' in l and i > 66000:
            print(f"L{i+1}: {l.strip()[:150]}")
