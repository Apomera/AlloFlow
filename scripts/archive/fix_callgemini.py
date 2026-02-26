"""
Fix the TTS decoupling bug: 
try { const result = await callGemini(...); } catch(e) {...}
was used incorrectly — const result is block-scoped.

Fix: Replace with let result; try { result = await callGemini(...); } catch(e) {...}
OR simply remove the wrapping try/catch and let the outer try handle it.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').read()
lines = content.split('\n')

# Find ALL instances of the bad pattern
bad_lines = []
for i, l in enumerate(lines):
    s = l.strip()
    if 'try {' in s and 'const result' in s and 'callGemini' in s:
        bad_lines.append(i)
        print(f"BAD PATTERN L{i+1}: {s[:150]}")

# Also check for try { const content = variants
for i, l in enumerate(lines):
    s = l.strip()
    if 'try {' in s and 'const content' in s and 'callGemini' in s:
        bad_lines.append(i)
        print(f"BAD PATTERN (content) L{i+1}: {s[:150]}")
    if 'try {' in s and 'const response' in s and 'callGemini' in s:
        bad_lines.append(i)
        print(f"BAD PATTERN (response) L{i+1}: {s[:150]}")

# Also check for try { const result = await callImagen
for i, l in enumerate(lines):
    s = l.strip()
    if 'try {' in s and 'const result' in s and 'callImagen' in s:
        bad_lines.append(i)
        print(f"BAD PATTERN (imagen) L{i+1}: {s[:150]}")

print(f"\nTotal bad patterns found: {len(bad_lines)}")
print(f"\nNow fixing all instances...")

# Fix: For each bad line, replace:
#   try { const result = await callGemini(prompt, true); } catch(e) { warnLog('AI generation failed:', e); }
# WITH:
#   const result = await callGemini(prompt, true);
# (just remove the try/catch wrapper — the outer try/catch in handleGenerate will handle errors)
#
# More robust approach: use regex to handle variations

fixed = 0
for i in sorted(set(bad_lines), reverse=True):
    s = lines[i].strip()
    # Pattern: try { const VAR = await FUNC(...); } catch(e) { ... }
    # We want to extract: const VAR = await FUNC(...);
    match = re.match(r'try\s*\{\s*((?:const|let)\s+\w+\s*=\s*await\s+\w+\([^)]*\);?)\s*\}\s*catch\s*\([^)]*\)\s*\{[^}]*\}', s)
    if match:
        inner = match.group(1)
        if not inner.endswith(';'):
            inner += ';'
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        lines[i] = indent + inner + '\r'
        fixed += 1
        print(f"  Fixed L{i+1}: {lines[i].strip()[:120]}")
    else:
        print(f"  Could not auto-fix L{i+1} — pattern didn't match")
        print(f"  Content: {s[:150]}")

content = '\n'.join(lines)
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nFixed {fixed} instances")
print(f"Final lines: {len(lines)}")
