"""
Comprehensive scan for ALL corrupted aria-label lines.

The pattern of corruption is: the heuristic consumed a closing `)}` or similar
from a placeholder={t('...')} expression into the label, then the next line's
className got truncated.

Strategy: Find any aria-label that doesn't have a matching close-quote on the
same line, OR where the line after aria-label has a truncated className.
Also find duplicate className attributes on the same element.
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Track all issues
issues = []

# Check 1: aria-label with unmatched quotes
for i, line in enumerate(lines):
    if 'aria-label="' in line:
        # Count quotes after aria-label="
        after = line[line.index('aria-label="'):]
        # The label should be enclosed: aria-label="something"
        match = re.search(r'aria-label="([^"]*)"', after)
        if not match:
            issues.append(('UNMATCHED_QUOTE', i+1, line.rstrip()[:100]))
            print(f"  UNMATCHED L{i+1}: {line.strip()[:100]}")

# Check 2: Duplicate className= on adjacent lines (within 10 lines)
for i, line in enumerate(lines):
    if '<input' in line or '<textarea' in line or '<select' in line:
        # Scan the next 15 lines to see if there are duplicate classNames before the />
        class_count = 0
        for j in range(i, min(i+15, len(lines))):
            if 'className=' in lines[j]:
                class_count += 1
            if '/>' in lines[j] or '>' in lines[j]:
                break
        if class_count > 1:
            issues.append(('DUPLICATE_CLASS', i+1, line.strip()[:100]))

# Check 3: Lines where className= is followed by a truncated string
for i, line in enumerate(lines):
    match = re.search(r'className=\{`[^`]*?"', line)
    if match and not line.strip().endswith('`}'):
        # className={`...` split across lines is normal, but className={`..." is not
        if "```" not in line and '`}' not in line:
            # Check if the ` is properly closed
            backtick_after = line[line.index('className={`'):]
            if backtick_after.count('`') % 2 != 0:
                pass  # Odd backticks means it spans lines (normal)

print(f"\nTotal issues found: {len(issues)}")

# Now fix the issues
if issues:
    content = ''.join(lines)
    
    # For each unmatched quote issue, we need to find what the original should be
    for issue_type, line_num, _ in issues:
        if issue_type == 'UNMATCHED_QUOTE':
            idx = line_num - 1
            line = lines[idx]
            # Replace the broken label with a simple fallback
            broken_start = line.index('aria-label="') + len('aria-label="')
            # The rest of the line after aria-label=" is part of the broken label
            # Set a simple label and let the remaining attributes flow normally
            prefix = line[:line.index('aria-label="')]
            lines[idx] = prefix + 'aria-label="Text field"\n'
            print(f"  FIXED L{line_num}: replaced broken label with 'Text field'")
    
    # Write back
    with open(FILE, 'w') as f:
        f.writelines(lines)
    
    print(f"\nFixed {len([i for i in issues if i[0] == 'UNMATCHED_QUOTE'])} broken labels")
    
    # Now re-scan for duplicate classNames  
    with open(FILE, 'r') as f:
        content = f.read()
        lines = content.split('\n')
    
    # Fix duplicate classNames: remove the first (truncated) one
    i = 0
    dup_fixes = 0
    while i < len(lines):
        if 'className=' in lines[i]:
            # Look ahead for another className before /> 
            for j in range(i+1, min(i+10, len(lines))):
                if '/>' in lines[j]:
                    break
                if 'className=' in lines[j] and ('type=' in '\n'.join(lines[i:j]) or 'value=' in '\n'.join(lines[i:j])):
                    # Duplicate! Check if lines[i] has the truncated one
                    if lines[i].strip().startswith('className=') and len(lines[i].strip()) < 60:
                        # This is likely the truncated one
                        lines[i] = ''  # Remove it
                        dup_fixes += 1
                        print(f"  Removed truncated className at L{i+1}")
                    break
        i += 1
    
    if dup_fixes > 0:
        with open(FILE, 'w') as f:
            f.write('\n'.join(lines))
        print(f"\nFixed {dup_fixes} duplicate classNames")
