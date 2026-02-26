"""
fix_all_theme_final.py — Final definitive fix. 

Instead of trying to match Tailwind class contents with a regex character class,
just find the pattern: any string ending with } ` where it should be '} `
"""
from pathlib import Path
import re

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    lines = content.split('\n')
    changes = 0
    
    for i, line in enumerate(lines):
        if 'theme ==' not in line:
            continue
        
        orig = line
        
        # Fix 1: Nested ${theme inside ternary -> (theme with ) closing
        line = line.replace(": ${theme ===", ": (theme ===")
        line = line.replace("? ${theme ===", "? (theme ===")
        
        # Fix 2: Find unterminated strings - look for pattern where
        # a single-quoted string is missing its closing quote before } or )
        # Strategy: find all theme ternary results and ensure they end with '
        # 
        # In a correct ternary: theme === 'dark' ? 'class-a' : 'class-b'
        # In a broken one:      theme === 'dark' ? 'class-a' : 'class-b
        # The broken one is missing the trailing ' before } or )
        #
        # Find pattern: a word char followed by } ` or ) ` that should have ' before }
        # But only if we're in a theme ternary context
        
        # More robust: find } ` or } ) that's inside a className and preceded by
        # what looks like a class name (not a quote)
        # Pattern: [non-quote char]} ` → should be [non-quote char]'} `
        line = re.sub(r"([a-zA-Z0-9\-])\}\s*(`)", r"\1'} \2", line)
        line = re.sub(r"([a-zA-Z0-9\-])\}\s*(\))", r"\1'} \2", line)
        
        # Fix 3: Convert matching } to ) for (theme expressions
        if '(theme ===' in line:
            result = list(line)
            pos = 0
            while True:
                idx = line.find('(theme ===', pos)
                if idx < 0:
                    break
                # Find matching close
                depth = 1
                j = idx + 1
                while j < len(line):
                    ch = line[j]
                    if ch == '(':
                        depth += 1
                    elif ch == ')':
                        depth -= 1
                        if depth == 0:
                            break
                    elif ch == '}' and depth == 1:
                        if j > 0 and line[j-1] == "'":
                            result[j] = ')'
                            break
                    j += 1
                pos = idx + 10
            line = ''.join(result)
        
        if line != orig:
            changes += 1
            lines[i] = line
            print(f"  Fixed L{i+1}")
    
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} fixes applied.")
    
    # Validate
    issues = []
    for i, line in enumerate(content.split('\n')):
        if 'theme ==' not in line:
            continue
        if ': ${theme ==' in line or '? ${theme ==' in line:
            issues.append(f"L{i+1}: Nested template")
        # Check for unterminated: class-name} ` without '
        if re.search(r'[a-zA-Z0-9\-]\}\s*[`)]', line):
            issues.append(f"L{i+1}: Possible unterminated string")
    
    if issues:
        print(f"\nWARNING: {len(issues)} issues remain:")
        for iss in issues:
            print(f"  {iss}")
    else:
        print("\n✅ All theme lines validated clean.")

if __name__ == "__main__":
    main()
