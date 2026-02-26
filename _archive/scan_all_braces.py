"""
COMPREHENSIVE FIX: Find every line with dispatchEscape and verify brace balance.
For each dispatch call (single or multi-line), check exact brace/paren count.
Output ALL issues for manual review first.
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'
issues = []

# Track all dispatch calls
i = 0
while i < len(lines):
    line = lines[i]
    
    # Skip non-dispatch lines and reducer/declaration lines
    if 'dispatchEscape' not in line:
        i += 1
        continue
    if 'useReducer' in line or 'function escapeReducer' in line or "case '" in line:
        i += 1
        continue
    
    start = i
    braces = 0
    parens = 0
    
    # Find the full extent of this dispatch call
    j = i
    found_end = False
    while j < min(i + 80, len(lines)):
        for ch in lines[j]:
            if ch == '{': braces += 1
            elif ch == '}': braces -= 1
            elif ch == '(': parens += 1
            elif ch == ')': parens -= 1
        
        # Check if we've closed all braces and parens from the dispatch
        if parens <= 0 and braces <= 0:
            found_end = True
            if braces != 0 or parens != 0:
                issues.append({
                    'start': start,
                    'end': j,
                    'braces': braces,
                    'parens': parens,
                    'lines': [lines[k].rstrip() for k in range(start, j+1)]
                })
            j += 1
            break
        j += 1
    
    if not found_end:
        issues.append({
            'start': start,
            'end': j-1,
            'braces': braces,
            'parens': parens,
            'lines': ['RUNAWAY - did not close within 80 lines']
        })
    
    i = j

# Output all issues
out = open('_brace_issues.txt', 'w', encoding='utf-8')
out.write("Found " + str(len(issues)) + " imbalanced dispatch calls\n\n")
for issue in issues:
    out.write("L" + str(issue['start']+1) + "-L" + str(issue['end']+1) + ": braces=" + str(issue['braces']) + " parens=" + str(issue['parens']) + "\n")
    for line in issue['lines'][:10]:
        out.write("  " + line[:200] + "\n")
    if len(issue['lines']) > 10:
        out.write("  ... (" + str(len(issue['lines'])) + " lines total)\n")
    out.write("\n")

out.close()
print("Done -> _brace_issues.txt (" + str(len(issues)) + " issues)")
