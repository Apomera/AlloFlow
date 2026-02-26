"""
Comprehensive scan of ui_strings_check.js for structural issues.
Uses Node.js iteratively to find and fix all syntax errors.
"""
import subprocess
import re

def check_syntax(filepath):
    """Returns error message or None if valid"""
    result = subprocess.run(
        ['node', '-e', f"const fs=require('fs');const text=fs.readFileSync('{filepath}','utf8');try{{new Function('return '+text)();console.log('OK:'+Object.keys(new Function('return '+text)()).length)}}catch(e){{console.log('ERR:'+e.message)}}"],
        capture_output=True, text=True
    )
    output = result.stdout.strip()
    if output.startswith('OK:'):
        return None
    return output.replace('ERR:', '')

# Strategy: Find lines that look like orphaned keys
# (keys at wrong indentation that break the object structure)
with open('ui_strings_check.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find all lines with keys at unusual indentation
# Pattern: lines that have 4-8 spaces of indent followed by a key, 
# but previous non-blank line ends with }, (closing a sub-object)
issues = []
for i in range(1, len(lines)):
    line = lines[i]
    stripped = line.strip()
    
    # Skip blank lines, comments, and closing braces
    if not stripped or stripped.startswith('//') or stripped in ['}', '},', '],']:
        continue
    
    # Check for key pattern with wrong indentation
    # Look for lines where indentation suddenly changes 
    prev_indent = len(lines[i-1]) - len(lines[i-1].lstrip()) if lines[i-1].strip() else -1
    curr_indent = len(line) - len(line.lstrip())
    
    # Find lines that look like orphaned keys after closing braces
    # Check if previous non-blank line ends with }, or }
    prev_nonblank = ''
    for j in range(i-1, max(0, i-5), -1):
        if lines[j].strip():
            prev_nonblank = lines[j].strip()
            prev_indent = len(lines[j]) - len(lines[j].lstrip())
            break
    
    # If previous line closes a block and current line has a key at mismatched indent
    if prev_nonblank.endswith('}') or prev_nonblank.endswith('},'):
        if ':' in stripped and not stripped.startswith('{'):
            # Check if this looks like an orphaned key
            # (not properly nested inside the parent)
            if curr_indent > 4 and abs(curr_indent - prev_indent) > 4:
                issues.append((i+1, curr_indent, prev_indent, stripped[:80]))

print(f"\nPotential structural issues ({len(issues)} found):")
for linenum, indent, prev_indent, text in issues:
    print(f"  L{linenum} (indent={indent}, prev={prev_indent}): {text}")

# Now let's check the actual error
err = check_syntax('ui_strings_check.js')
if err:
    print(f"\nCurrent parse error: {err}")
else:
    print("\nFile parses successfully!")
