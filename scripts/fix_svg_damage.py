"""Fix SVG chart code that was damaged by the global ')'}' -> ')}' replace.
The SVG transform code has: + ') }, should be + ')' },
Also scan for any other ') } patterns that should be ')' }
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0
    
    # Fix the specific SVG pattern: + ') }, should be + ')' },
    old = "+ ') }, '"
    new = "+ ')' }, '"
    count = content.count(old)
    if count > 0:
        content = content.replace(old, new)
        changes += count
        print(f"Fixed {count} SVG transform patterns")
    
    # Also check for any other ') } that should be ')' }
    # Pattern: createElement(..., ') } — the ')' is a JSX string prop
    old2 = "') },"
    new2 = "')' },"
    # But only fix if NOT inside a theme ternary (theme lines are already fixed)
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'theme ==' in line:
            continue  # Skip theme lines
        if old2 in line and 'createElement' in line:
            line = line.replace(old2, new2)
            lines[i] = line
            changes += 1
            print(f"  Fixed createElement at L{i+1}")
    
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} total fixes.")

if __name__ == "__main__":
    main()
