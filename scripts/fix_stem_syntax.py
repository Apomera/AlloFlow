#!/usr/bin/env python3
"""Fix remaining semicolon at line ~3147 in stem_lab_module.js."""
import subprocess

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Remove semicolon before })() at the Cell Diagram / NEW TOOLS boundary
# Current:   )\r\n  );\r\n})()\r\n// ═══
# Target:    )\r\n  )\r\n})()\r\n// ═══

# Let's find all occurrences of ");\r\n" followed by something that contains "})()"
lines = content.split('\n')
fixed_lines = []
fixed_count = 0

for i, line in enumerate(lines):
    stripped = line.rstrip('\r')
    # Check if this line is "  );" and next line is "})()" and line after that is a comment
    if stripped.strip() == ');\r' or stripped.strip() == ');':
        if i + 1 < len(lines):
            next_stripped = lines[i+1].rstrip('\r').strip()
            if next_stripped == '})()':
                # Check if 2 lines later there's a comment about tools
                if i + 2 < len(lines) and ('NEW TOOLS' in lines[i+2] or 'TIER' in lines[i+2] or '═══' in lines[i+2]):
                    print(f"Line {i+1}: Removing semicolon from '{stripped.strip()}' -> ')'")
                    fixed_lines.append(stripped.replace(');', ')') + '\r' if '\r' in line else stripped.replace(');', ')'))
                    fixed_count += 1
                    continue
    fixed_lines.append(line)

if fixed_count > 0:
    content = '\n'.join(fixed_lines)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {fixed_count} semicolons")
else:
    print("No fixes applied. Trying alternative approach...")
    # Direct string replacement
    patterns = [
        ("    )\r\n   );\r\n})()\r\n//", "    )\r\n   )\r\n})()\r\n//"),
    ]
    # Just replace ); followed by })()
    import re
    # Find all ); immediately before })()
    matches = list(re.finditer(r'\);\s*\n\s*\}\)\(\)', content))
    print(f"Found {len(matches)} ); before })()")
    for m in matches:
        start = m.start()
        # Check context
        ctx_start = max(0, start - 50)
        ctx_end = min(len(content), m.end() + 50)
        ctx = content[ctx_start:ctx_end].replace('\n', '\\n').replace('\r', '\\r')
        print(f"  At pos {start}: ...{ctx[:120]}...")
    
    # Replace ); with ) before each })() that precedes a tool boundary comment
    new_content = content
    for m in reversed(matches):
        # Check if followed by a tool comment
        after = content[m.end():m.end()+200]
        if '═══' in after or 'NEW TOOLS' in after or 'TIER' in after:
            # Replace ); with ) 
            semi_pos = content.index(';', m.start())
            new_content = new_content[:semi_pos] + new_content[semi_pos+1:]
            print(f"  Fixed at position {semi_pos}")
    
    if new_content != content:
        with open(FILE, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Applied fixes via alternative approach")

# Verify
result = subprocess.run(['node', '-e', 
    "const fs=require('fs');try{new Function(fs.readFileSync('stem_lab_module.js','utf8'));console.log('SYNTAX OK');}catch(e){console.log('SYNTAX ERROR:',e.message);}"],
    cwd=r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated",
    capture_output=True, text=True)
print(f"\nSyntax check: {result.stdout.strip()}")

# Also check paren balance
result2 = subprocess.run(['node', '-e', 
    "const fs=require('fs');const lines=fs.readFileSync('stem_lab_module.js','utf8').split('\\n');let stack=0;for(let i=0;i<lines.length;i++){for(const c of lines[i]){if(c==='(')stack++;if(c===')')stack--;}};console.log('Paren balance:',stack);"],
    cwd=r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated",
    capture_output=True, text=True)
print(f"Paren balance: {result2.stdout.strip()}")
