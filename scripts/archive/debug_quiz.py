"""
Add granular debug breadcrumbs between text check and callGemini to find exact crash point.
Since ALL types fail, the issue is in the shared code path.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

content = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').read()
lines = content.split('\n')

# Remove existing debug logs first
before = len(lines)
lines = [l for l in lines if '[DEBUG-QUIZ]' not in l]
removed = before - len(lines)
print(f"Removed {removed} old debug lines")

# Add breadcrumbs at key points in the shared path
changes = 0

# (A) Function entry
for i, l in enumerate(lines):
    if 'const handleGenerate = async (type' in l.strip():
        lines.insert(i+1, "    console.log('[HG-DEBUG] A: ENTRY type=', type);")
        changes += 1
        break

# (B) After text check passes
for i, l in enumerate(lines):
    if "if (!textToProcess || !textToProcess.trim()) return;" in l.strip() and i > 49400:
        lines.insert(i+1, "    console.log('[HG-DEBUG] B: text OK, len=', textToProcess.length);")
        changes += 1
        break

# (C) After differentiation check (L49556 area - after the if simplified && differentiation block)
for i, l in enumerate(lines):
    s = l.strip()
    if "// generateHelpfulHint moved to end" in s and i > 49500:
        lines.insert(i, "    console.log('[HG-DEBUG] C: past differentiation check');")
        changes += 1
        break

# (D) After setIsProcessing(true) - this means we're in the main generation path
for i, l in enumerate(lines):
    s = l.strip()
    if s == "setIsProcessing(true);" and i > 49580 and i < 49620:
        lines.insert(i+1, "    console.log('[HG-DEBUG] D: setIsProcessing(true) - in main generation path');")
        changes += 1
        break

# (E) At the try block
for i, l in enumerate(lines):
    s = l.strip()
    if s == "let content;" and i > 49630 and i < 49650:
        lines.insert(i+1, "      console.log('[HG-DEBUG] E: inside try block, about to branch on type=', type);")
        changes += 1
        break

# (F) At the glossary branch
for i, l in enumerate(lines):
    s = l.strip()
    if s == "if (type === 'glossary') {" and i > 49630 and i < 49660:
        lines.insert(i+1, "        console.log('[HG-DEBUG] F: entering glossary branch');")
        changes += 1
        break

# (G) At catch block of main try
for i, l in enumerate(lines):
    s = l.strip()
    if '} catch (e) {' in s and i > 49700 and i < 51200:
        next_s = lines[i+1].strip() if i+1 < len(lines) else ''
        if 'warnLog' in next_s:
            lines.insert(i+1, "      console.error('[HG-DEBUG] G: CATCH ERROR:', e?.message, e);")
            changes += 1
            print(f"  Added catch log at L{i+1}")
            break

# (H) Right after the 'All Selected Languages' multi-lang path
for i, l in enumerate(lines):
    s = l.strip()
    if 'effectiveLanguage === ' in s and 'All Selected Languages' in s and i > 49560:
        lines.insert(i, "    console.log('[HG-DEBUG] H: checking effectiveLanguage=', effectiveLanguage, 'type=', type);")
        changes += 1
        break

content = '\n'.join(lines)
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Added {changes} breadcrumbs")
print(f"Final lines: {len(lines)}")
