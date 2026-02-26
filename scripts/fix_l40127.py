"""Fix L40127 dialect line — missing second quote in empty string."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # The exact broken pattern at L40127
    old = "conventions.` : '}"
    new = "conventions.` : ''}"
    
    count = content.count(old)
    if count > 0:
        content = content.replace(old, new)
        print(f"Fixed {count} instance(s)")
    else:
        print("Pattern not found")
    
    SRC.write_text(content, encoding='utf-8')

if __name__ == "__main__":
    main()
