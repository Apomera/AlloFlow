"""Remove spurious quotes from createElement className ternaries.

The SVG fix script added ' after ) in createElement calls, but only the
SVG transform line (with 'rotate') needs ')' — all other ')' }, patterns
in createElement calls should be ') },
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    lines = content.split('\n')
    changes = 0
    
    for i, line in enumerate(lines):
        if "createElement" not in line:
            continue
        if "transform" in line and "rotate" in line:
            continue  # Skip the actual SVG transform line
        
        orig = line
        # Fix: ')' }, → ') }, where the ')' is NOT a string but ternary close + spurious quote
        # Only match when preceded by a class name ending (like bg-slate-50)
        line = line.replace("')', ", "'), ")  # pattern: ')' , 
        line = line.replace("')' },", "') },")
        line = line.replace("')' }", "') }")
        
        if line != orig:
            changes += 1
            lines[i] = line
            print(f"  Fixed L{i+1}")
    
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} fixes applied.")

if __name__ == "__main__":
    main()
