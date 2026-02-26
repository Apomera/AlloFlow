"""
Comprehensive verification of the Phase 1 changes.
Check brace balance against backup, verify useCallback placement,
and look for any syntax issues.
"""
import re
import os

# Check if backup exists to compare brace counts
backup_candidates = [
    'AlloFlowANTI_backup.txt',
    'AlloFlowANTI.txt.bak',
]

results = []

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

current_open = content.count('{')
current_close = content.count('}')
current_diff = current_open - current_close

results.append("=== BRACE ANALYSIS ===")
results.append(f"Current file: {current_open} open, {current_close} close, diff={current_diff}")

# Check backup
for backup in backup_candidates:
    if os.path.exists(backup):
        with open(backup, 'r', encoding='utf-8') as f:
            backup_content = f.read()
        backup_open = backup_content.count('{')
        backup_close = backup_content.count('}')
        backup_diff = backup_open - backup_close
        results.append(f"Backup ({backup}): {backup_open} open, {backup_close} close, diff={backup_diff}")
        results.append(f"Brace diff change: {current_diff - backup_diff} (0 = no change)")
        break
else:
    results.append("No backup file found to compare brace counts")

# Check the Tier 2 block more carefully
results.append("\n=== TIER 2 BLOCK DETAIL ===")
lines = content.split('\n')
tier2_start = None
for i, line in enumerate(lines):
    if "PHASE 1 TIER 2" in line:
        tier2_start = i
        break

if tier2_start is not None:
    # Show 25 lines of the tier 2 block
    for j in range(tier2_start, min(len(lines), tier2_start + 25)):
        results.append(f"  L{j+1}: {lines[j]}")
    
    # Count braces in tier 2 block only (until next blank line or end)
    tier2_end = tier2_start
    for j in range(tier2_start + 1, min(len(lines), tier2_start + 60)):
        if lines[j].strip() == '' and j > tier2_start + 5:
            tier2_end = j
            break
        tier2_end = j
    
    tier2_block = '\n'.join(lines[tier2_start:tier2_end+1])
    t2_open = tier2_block.count('{')
    t2_close = tier2_block.count('}')
    results.append(f"\n  Tier 2 block braces: {t2_open} open, {t2_close} close, diff={t2_open - t2_close}")

# Check for common syntax errors in useCallback patterns
results.append("\n=== SYNTAX PATTERN CHECK ===")
# Each useCallback should have balanced ()s and end with );
cb_lines = [i for i, line in enumerate(lines) if 'React.useCallback' in line]
issues = []
for i in cb_lines:
    line = lines[i]
    # Check for matching parens
    open_p = line.count('(')
    close_p = line.count(')')
    if open_p != close_p:
        issues.append(f"  PAREN MISMATCH L{i+1}: {open_p} open, {close_p} close: {line.strip()[:100]}")
    
    open_b = line.count('{')
    close_b = line.count('}')
    # useCallback lines should be balanced except for the function body
    
    if not line.rstrip().endswith(';') and not line.rstrip().endswith('{'):
        issues.append(f"  NO SEMICOLON L{i+1}: {line.strip()[:100]}")

if issues:
    results.append(f"Found {len(issues)} potential issues:")
    for issue in issues[:20]:
        results.append(issue)
else:
    results.append("All useCallback lines pass basic syntax checks")

# Check onClick replacements for proper syntax
results.append("\n=== ONCLICK REPLACEMENT CHECK ===")
# Make sure no onClick={handleXxx has missing closing }
bad_onclicks = []
for m in re.finditer(r'onClick=\{handle\w+[^}]', content):
    # Check if the next char after the handler name is }
    end_idx = m.end()
    if end_idx < len(content) and content[end_idx] != '}':
        line_num = content[:m.start()].count('\n') + 1
        snippet = content[m.start():m.start()+80]
        bad_onclicks.append(f"  L{line_num}: {snippet}")

if bad_onclicks:
    results.append(f"Found {len(bad_onclicks)} malformed onClick replacements:")
    for b in bad_onclicks[:10]:
        results.append(b)
else:
    results.append("All onClick={handleXxx} replacements look well-formed")

# Summary stats
results.append("\n=== SUMMARY ===")
results.append(f"Total lines: {len(lines)}")
results.append(f"Total bytes: {len(content):,}")
results.append(f"useCallback count: {len(re.findall(r'React.useCallback', content))}")
results.append(f"useMemo count: {len(re.findall(r'React.useMemo', content))}")
results.append(f"React.memo count: {len(re.findall(r'React\.memo\(', content))}")
results.append(f"Remaining inline onClick arrows: {len(re.findall(r'onClick=\{[^}]*=>', content))}")
results.append(f"onClick using handler refs: {len(re.findall(r'onClick=\{handle\w+\}', content))}")
results.append(f"inline style count: {len(re.findall(r'style=\{\{', content))}")

with open('full_verification.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))

print(f"Written {len(results)} lines to full_verification.md")
