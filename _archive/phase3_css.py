import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []
for i, l in enumerate(lines):
    if '<style' in l.lower():
        # Check if it's JSX interpolated or plain
        is_jsx = '{`' in l or '>{`' in l
        context = l.strip()[:120]
        results.append((i+1, 'JSX' if is_jsx else 'PLAIN', context))

with open('phase3_style_analysis.txt', 'w', encoding='utf-8') as f:
    f.write("=== STYLE BLOCK ANALYSIS ===\n\n")
    for ln, typ, ctx in results:
        f.write(f"L{ln} [{typ}]: {ctx}\n")
    f.write(f"\nTotal: {len(results)} blocks\n")
    f.write(f"JSX (dynamic, must stay inline): {sum(1 for _,t,_ in results if t=='JSX')}\n")
    f.write(f"PLAIN (static, can consolidate): {sum(1 for _,t,_ in results if t=='PLAIN')}\n")

for ln, typ, ctx in results:
    print(f"L{ln} [{typ}]: {ctx}")
print(f"\nJSX={sum(1 for _,t,_ in results if t=='JSX')}, PLAIN={sum(1 for _,t,_ in results if t=='PLAIN')}")
