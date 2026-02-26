"""Fix remaining unterminated string literals in theme ternaries."""
from pathlib import Path
import re

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    lines = content.split('\n')
    changes = 0
    
    # Regex: match a single-quoted string containing Tailwind classes
    # that ends with } instead of '} — i.e. the closing quote was stripped
    # Tailwind classes can contain: a-z A-Z 0-9 - [ ] # / . : ! _ ( ) % space
    tw_chars = r"[a-zA-Z0-9\-\[\]#/\s\.:\!_\(\)%]"
    
    # Pattern 1: 'tailwind-classes} ` (missing ' before })
    pat1 = re.compile(r"'(" + tw_chars + r"+?)\}\s*`")
    # Pattern 2: 'tailwind-classes} ) (missing ' before })
    pat2 = re.compile(r"'(" + tw_chars + r"+?)\}\s*\)")
    
    for i, line in enumerate(lines):
        if 'theme ==' not in line:
            continue
        
        orig = line
        line = pat1.sub(r"'\1'} `", line)
        line = pat2.sub(r"'\1'} )", line)
        
        if line != orig:
            changes += 1
            lines[i] = line
            print(f"  Fixed L{i+1}")
    
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} fixes applied.")

if __name__ == "__main__":
    main()
