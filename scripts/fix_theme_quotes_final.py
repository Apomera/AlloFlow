"""
fix_theme_quotes_final.py — Fix all instances where trailing quotes were stripped
from theme ternary string literals by the overly broad regex.

Pattern: The regex changed  ...'some-class'} to ...'some-class}
We need to restore the closing quote: ...'some-class'}
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
        
        # Pattern: A theme ternary like:
        #   ${theme === 'dark' ? 'class-a' : theme === 'contrast' ? 'class-b' : 'class-c}
        # The last string is missing its closing quote: 'class-c} should be 'class-c'}
        # Fix: find 'some-class} and add the missing ' before }
        
        # Match: a single-quoted string that ends with } instead of '}
        # Pattern: 'word-chars} followed by space, backtick, ), etc.
        line = re.sub(
            r"'([a-zA-Z0-9\-\[\]#/\s\.]+)\}\s*`",  # 'classes} ` 
            r"'\1'} `",  # 'classes'} `
            line
        )
        line = re.sub(
            r"'([a-zA-Z0-9\-\[\]#/\s\.]+)\}\s*\)",  # 'classes} )
            r"'\1'} )",
            line
        )
        
        if line != orig:
            changes += 1
            lines[i] = line
            print(f"  Fixed L{i+1}")
    
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} fixes applied.")

if __name__ == "__main__":
    main()
