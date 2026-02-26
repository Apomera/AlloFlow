"""
fix_theme_comprehensive.py — Comprehensive fix for ALL theme ternary syntax issues.

The root problem: The original theme fix script used '${theme === ...}' patterns
which are wrong in two ways:
1. Single quotes wrapping ${} is invalid (first fix handled this)
2. Bare ${theme ===} inside an outer ${} is a nested template expression (invalid)

The correct pattern is to use parenthesized ternaries:
  WRONG: ${condition ? 'activeClass' : ${theme === 'dark' ? 'a' : 'b'}}
  RIGHT: ${condition ? 'activeClass' : (theme === 'dark' ? 'a' : 'b')}
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
        
        # Fix 1: Replace bare ${theme === with (theme ===
        # This handles cases where ${theme is NOT at the start of a template expression
        # but is nested inside another ${...} expression
        # We need to be careful: ${theme at the START of a template expr (after `) is fine
        # But ${theme after : or ? (inside another expression) is broken
        
        # Pattern: ': ${theme ===' -> ': (theme ==='
        line = line.replace(": ${theme ===", ": (theme ===")
        line = line.replace("? ${theme ===", "? (theme ===")
        
        # Fix 2: If we converted ${theme to (theme, the closing } needs to become )
        # Pattern: ...'classname'} ` needs to stay as is (it closes a ${} template expr)
        # But: ...'classname'}) ` means we over-corrected
        # The key: if the theme was wrapped in ${}, the closing } matched ${
        # Now that we changed ${ to (, we need to close with ) instead of }
        # 
        # We can detect this: after (theme === ... the matching close is }
        # which should now be )
        
        if line != orig:
            # Find the (theme === pattern and its matching }
            # The theme ternary ends with: 'last-class'} or 'last-class')
            # Since we changed ${ to (, we need the matching close to be )
            # Pattern: 'classes'} where } was the close of the old ${...}
            # After our change, this should be 'classes')
            
            # Find positions of (theme === and replace the matching }
            pos = 0
            while True:
                idx = line.find("(theme ===", pos)
                if idx < 0:
                    break
                # Find the matching closing } for this expression
                # It's the } that follows the last string in the ternary chain
                # Pattern: 'some-class'} — this } should become )
                depth = 1
                j = idx + 1
                while j < len(line) and depth > 0:
                    if line[j] == '(':
                        depth += 1
                    elif line[j] == ')':
                        depth -= 1
                    elif line[j] == '}' and depth == 1:
                        # This is our target — it was the matching } for the old ${}
                        # Only convert if it looks like it's closing a theme expression
                        # Check if it's preceded by a ' (closing a string)
                        before = line[max(0, j-1):j]
                        if before == "'":
                            line = line[:j] + ')' + line[j+1:]
                            break
                    j += 1
                pos = idx + 10  # Move past this match
        
        if line != orig:
            changes += 1
            lines[i] = line
            print(f"  Fixed L{i+1}: ...{line.strip()[:80]}...")
    
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} fixes applied.")
    
    # Validate: check for remaining bare ${theme patterns inside ternaries
    content = SRC.read_text(encoding='utf-8')
    remaining = []
    for i, line in enumerate(content.split('\n')):
        if '${theme ==' in line:
            # Check if this ${theme is nested (preceded by : or ?)
            if ': ${theme ==' in line or '? ${theme ==' in line:
                remaining.append(f"L{i+1}")
    
    if remaining:
        print(f"\nWARNING: {len(remaining)} potentially broken nested ${{theme}} patterns remain:")
        for r in remaining:
            print(f"  {r}")
    else:
        print("\nAll nested ${theme} patterns resolved.")

if __name__ == "__main__":
    main()
