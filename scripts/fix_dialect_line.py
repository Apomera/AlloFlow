"""Fix L40008 dialect line and find any similar broken empty strings."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    lines = content.split('\n')
    changes = 0
    
    # Find ALL lines containing 'conventions' (the dialect adherence line)
    for i, line in enumerate(lines):
        if 'conventions' in line.lower():
            end = line.rstrip()
            print(f"L{i+1}: last 40 chars = {repr(end[-40:])}")
            # Check if it ends with : ' instead of : ''
            if end.endswith(": '"):
                lines[i] = end + "'" + "\r"  # Add the missing second quote
                changes += 1
                print(f"  -> Fixed! Added missing quote")
    
    # Also scan for any other `: '` endings on template literal lines  
    # that should be `: ''`
    for i, line in enumerate(lines):
        stripped = line.rstrip()
        if stripped.endswith(": '") and '${' in line and '?' in line:
            print(f"L{i+1}: Potential broken empty string: {repr(stripped[-40:])}")
            # Check if the pattern is  ? `...` : '  (should be : '')
            if "` : '" == stripped[-5:]:
                lines[i] = stripped + "'" + "\r"
                changes += 1
                print(f"  -> Fixed!")
    
    content = '\n'.join(lines)
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} fixes.")

if __name__ == "__main__":
    main()
