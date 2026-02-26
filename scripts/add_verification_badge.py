#!/usr/bin/env python3
"""Add verification badge to math problem display."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

# Find the problem question display line
for i, l in enumerate(lines):
    if 'formatInlineText(problem.question || problem.problem' in l and i > 73000:
        # Find the closing </div> of the flex-grow section (2 lines after)
        for k in range(i+1, min(i+5, len(lines))):
            if '</div>' in lines[k] and 'flex-grow' not in lines[k]:
                badge = '                                        {problem._verification && <span style={{ fontSize: "11px", marginLeft: "6px", opacity: 0.8 }} title={problem._verification.verified ? "Answer computationally verified" : problem._verification.autoCorrected ? "Answer auto-corrected by evaluator" : ""}>{problem._verification.verified ? "\u2705" : problem._verification.autoCorrected ? "\U0001F527" : ""}</span>}\n'
                lines.insert(k+1, badge)
                print(f'Inserted badge at L{k+2}')
                break
        break

with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
    for l in lines:
        f.write(l.rstrip('\r\n') + '\n')
print(f'Done: {len(lines)} lines')
