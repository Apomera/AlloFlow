"""Find the 'error checking answer' message and its trigger"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
OUT = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\error_check_out.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []
results.append("=== 'error checking answer' or 'try again' in checkAnswer ===")
for i, l in enumerate(lines):
    lower = l.lower()
    if 'error checking' in lower or ('error' in lower and 'try again' in lower and 'check' in lower):
        # Show context (10 lines before)
        results.append("\nL%d: %s" % (i+1, l.strip()[:180]))
        for j in range(max(0, i-15), i):
            results.append("  ctx L%d: %s" % (j+1, lines[j].strip()[:180]))

results.append("\n\n=== checkAnswer function definition ===")
for i, l in enumerate(lines):
    if 'checkAnswer' in l and ('const' in l or 'function' in l) and '=>' in l and i < 12000:
        results.append("DEF L%d: %s" % (i+1, l.strip()[:180]))

results.append("\n\n=== catch blocks in checkAnswer ===")
for i, l in enumerate(lines):
    if 'catch' in l and i > 8000 and i < 12000:
        # Check if near checkAnswer
        for j in range(max(0, i-3), i+3):
            if 'error' in lines[j].lower() and ('try again' in lines[j].lower() or 'check' in lines[j].lower()):
                results.append("L%d (catch): %s" % (i+1, l.strip()[:180]))
                for k in range(i, min(len(lines), i+5)):
                    results.append("  L%d: %s" % (k+1, lines[k].strip()[:180]))
                break

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print("Written %d lines to error_check_out.txt" % len(results))
