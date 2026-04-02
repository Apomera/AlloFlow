#!/usr/bin/env python3
"""Patch the PDF auto-fix loop: raise default, smarter exit conditions."""

import sys

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Raise default from 2 to 5
old1 = 'const [pdfAutoFixPasses, setPdfAutoFixPasses] = useState(2);'
new1 = 'const [pdfAutoFixPasses, setPdfAutoFixPasses] = useState(5);'
if content.count(old1) == 1:
    content = content.replace(old1, new1)
    changes += 1
    print('1. Default raised: 2 -> 5')
else:
    print(f'1. SKIP: found {content.count(old1)} matches')

# 2. Update slider max from 5 to 10
old2 = 'min="0" max="5" value={pdfAutoFixPasses} onChange={(e) => setPdfAutoFixPasses(parseInt(e.target.value))} className="w-full" aria-label="Auto-fix loop count"'
new2 = 'min="0" max="10" value={pdfAutoFixPasses} onChange={(e) => setPdfAutoFixPasses(parseInt(e.target.value))} className="w-full" aria-label="Auto-fix loop count"'
if content.count(old2) == 1:
    content = content.replace(old2, new2)
    changes += 1
    print('2. Slider max raised: 5 -> 10')
else:
    print(f'2. SKIP: found {content.count(old2)} matches')

# 3. Update slider labels
old3 = "0 (off)</span><span>2 (default)</span><span>5 (max)"
new3 = "0 (off)</span><span>5 (default)</span><span>10 (max)"
if content.count(old3) == 1:
    content = content.replace(old3, new3)
    changes += 1
    print('3. Slider labels updated')
else:
    print(f'3. SKIP: found {content.count(old3)} matches')

# 4. Update the tier labels
old4 = "{pdfAutoFixPasses === 0 ? 'Disabled' : pdfAutoFixPasses <= 2 ? 'Standard' : 'Aggressive'}"
new4 = "{pdfAutoFixPasses === 0 ? 'Disabled' : pdfAutoFixPasses <= 3 ? 'Standard' : pdfAutoFixPasses <= 5 ? 'Thorough' : 'Aggressive'}"
if content.count(old4) == 1:
    content = content.replace(old4, new4)
    changes += 1
    print('4. Tier labels updated')
else:
    print(f'4. SKIP: found {content.count(old4)} matches')

# 5. Fix the loop entry condition: also enter if AI score < 90
old5 = 'if (axeResults && axeResults.totalViolations > 0 && maxFixPasses > 0) {'
new5 = 'if (maxFixPasses > 0 && ((axeResults && axeResults.totalViolations > 0) || bestAiScore < 90)) {'
if content.count(old5) == 1:
    content = content.replace(old5, new5)
    changes += 1
    print('5. Loop entry: now also enters if AI score < 90')
else:
    print(f'5. SKIP: found {content.count(old5)} matches')

# 6. Replace axe-only exit conditions with dual-engine smart exit
# Find and replace the exit block
old6 = """          // If axe-core is clean, stop
          if (newAxeViolations === 0) {
            warnLog('[Auto-fix] Zero violations \u2014 stopping');
            break;
          }

          // If no improvement, stop
          if (newAxeViolations >= bestAxeViolations && fixPass > 0) {
            warnLog('[Auto-fix] No axe improvement \u2014 stopping');
            break;
          }"""

new6 = """          // If BOTH engines are satisfied, stop
          if (newAxeViolations === 0 && newAiScore >= 90) {
            warnLog(`[Auto-fix] Excellent: axe clean + AI ${newAiScore}/100 \u2014 stopping`);
            break;
          }

          // Plateau detection: no improvement on EITHER engine for 2+ consecutive passes
          const axeImproved = newAxeViolations < bestAxeViolations;
          const aiImproved = newAiScore > bestAiScore + 2; // 2-point tolerance for AI noise
          if (!axeImproved && !aiImproved && fixPass > 0) {
            warnLog(`[Auto-fix] Plateau: AI ${newAiScore}, axe ${newAxeViolations} \u2014 no improvement, stopping`);
            break;
          }"""

if content.count(old6) == 1:
    content = content.replace(old6, new6)
    changes += 1
    print('6. Exit conditions: dual-engine smart exit')
else:
    # Try with different line endings
    old6_crlf = old6.replace('\n', '\r\n')
    if content.count(old6_crlf) == 1:
        content = content.replace(old6_crlf, new6.replace('\n', '\r\n'))
        changes += 1
        print('6. Exit conditions: dual-engine smart exit (CRLF)')
    else:
        print(f'6. SKIP: found {content.count(old6)} (LF) / {content.count(old6_crlf)} (CRLF) matches')
        # Debug: show what's actually there
        idx = content.find("// If axe-core is clean, stop")
        if idx >= 0:
            print(f'   Found marker at pos {idx}')
            snippet = content[idx:idx+350]
            print(f'   Snippet: {repr(snippet[:200])}')

# 7. Also need to include AI issues in the fix prompt (not just axe violations)
old7 = """          // AI attempts targeted fixes for remaining axe-core violations
          const violationInstructions = []
            .concat((axeResults.critical || []).map(v => `CRITICAL: ${v.description} (${v.id}, ${v.nodes} elements)`))
            .concat((axeResults.serious || []).map(v => `SERIOUS: ${v.description} (${v.id}, ${v.nodes} elements)`))
            .concat((axeResults.moderate || []).map(v => `MODERATE: ${v.description} (${v.id})`))
            .join('\\n');"""

new7 = """          // AI attempts targeted fixes for remaining violations from BOTH engines
          const axeInstructions = []
            .concat((axeResults ? axeResults.critical || [] : []).map(v => `CRITICAL (axe-core): ${v.description} (${v.id}, ${v.nodes} elements)`))
            .concat((axeResults ? axeResults.serious || [] : []).map(v => `SERIOUS (axe-core): ${v.description} (${v.id}, ${v.nodes} elements)`))
            .concat((axeResults ? axeResults.moderate || [] : []).map(v => `MODERATE (axe-core): ${v.description} (${v.id})`));
          const aiInstructions = verification && verification.issues
            ? verification.issues.map(i => `AI-FLAGGED: ${i.issue || i}`)
            : [];
          const violationInstructions = axeInstructions.concat(aiInstructions).join('\\n');"""

if content.count(old7) == 1:
    content = content.replace(old7, new7)
    changes += 1
    print('7. Fix prompt: now includes AI-flagged issues too')
else:
    old7_crlf = old7.replace('\n', '\r\n')
    if content.count(old7_crlf) == 1:
        content = content.replace(old7_crlf, new7.replace('\n', '\r\n'))
        changes += 1
        print('7. Fix prompt: now includes AI-flagged issues too (CRLF)')
    else:
        print(f'7. SKIP: found {content.count(old7)} (LF) / {content.count(old7_crlf)} (CRLF) matches')

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal changes applied: {changes}/7')
if changes < 7:
    print('WARNING: Some patches did not apply. Check output above.')
    sys.exit(1)
else:
    print('SUCCESS: All patches applied.')
