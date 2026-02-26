"""
fix_all_theme_issues.py — ONE definitive fix for ALL theme ternary syntax issues.

Scans every line with 'theme ==' and fixes:
1. Missing closing quote: 'classname} → 'classname'}
2. Nested template: ${theme === → (theme ===  with matching } → )
Runs until no more fixes needed (convergence loop).
"""
from pathlib import Path
import re

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def fix_missing_quotes(line):
    """Fix 'tailwind-class} where ' before } is missing."""
    # Match: single quote, then any tailwind class chars, then } not preceded by '
    # Tailwind classes: letters, digits, -, [, ], #, /, ., :, !, _, (, ), %, space, @, >, ~, *, &
    # Be very permissive with the character class
    result = re.sub(
        r"'([a-zA-Z0-9\-\[\]#/\s\.:\!_\(\)%@>~\*&]+)\}(\s*[`\)])",
        r"'\1'}\2",
        line
    )
    return result

def fix_nested_templates(line):
    """Fix ${theme === inside another ${} expression → (theme === with matching } → )."""
    # Only fix if ${theme is preceded by : or ? (meaning it's nested)
    result = line
    for prefix in [': ${theme ===', '? ${theme ===']:
        replacement = prefix.replace('${theme ===', '(theme ===')
        result = result.replace(prefix, replacement)
    
    # Now fix the matching closing } → ) for (theme === expressions  
    # Find each (theme === and locate its matching }
    output = list(result)
    i = 0
    while i < len(result):
        idx = result.find('(theme ===', i)
        if idx < 0:
            break
        # Walk forward to find the matching } that closes this expression
        # We need to count nested parens to find the right }
        depth = 1  # We're inside the ( that opened before theme
        j = idx + 1
        while j < len(result):
            ch = result[j]
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
                if depth == 0:
                    break  # Already properly closed with )
            elif ch == '}' and depth == 1:
                # This } should be ) — it was the old closing of ${...}
                # Verify: it should be preceded by ' (end of a string literal)
                if j > 0 and result[j-1] == "'":
                    output[j] = ')'
                    break
            j += 1
        i = idx + 10
    
    return ''.join(output)

def main():
    content = SRC.read_text(encoding='utf-8')
    
    total_changes = 0
    iteration = 0
    
    while iteration < 5:  # Max 5 passes for safety
        iteration += 1
        lines = content.split('\n')
        changes = 0
        
        for i, line in enumerate(lines):
            if 'theme ==' not in line:
                continue
            
            orig = line
            line = fix_missing_quotes(line)
            line = fix_nested_templates(line)
            
            if line != orig:
                changes += 1
                lines[i] = line
                print(f"  Pass {iteration} - Fixed L{i+1}")
        
        content = '\n'.join(lines)
        
        if changes == 0:
            break
        
        total_changes += changes
    
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {total_changes} total fixes across {iteration} passes.")
    
    # Final validation
    issues = []
    for i, line in enumerate(content.split('\n')):
        if 'theme ==' not in line:
            continue
        # Check for unterminated strings: 'chars} without closing '
        if re.search(r"'[a-zA-Z0-9\-\[\]#/\s\.:\!_\(\)%@>~\*&]+\}\s*[`\)]", line):
            issues.append(f"L{i+1}: Unterminated string")
        # Check for nested ${theme
        if ': ${theme ==' in line or '? ${theme ==' in line:
            issues.append(f"L{i+1}: Nested template")
    
    if issues:
        print(f"\nWARNING: {len(issues)} issues remain:")
        for iss in issues:
            print(f"  {iss}")
    else:
        print("\n✅ All theme lines validated clean.")

if __name__ == "__main__":
    main()
