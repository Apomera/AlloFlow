"""Fix the spurious quote between ) and } in theme ternaries: )'} -> )}"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # Fix: )'} should be )} — the ' between ) and } is spurious
    old = "')'"
    # Actually, the exact pattern from the error is: ...200')'} `}
    # Which means: the string 'bg-slate-100...-200' is correct
    # Then ) closes the (theme === ternary — correct
    # Then ' is spurious
    # Then } closes the ${...} template expression — correct
    # 
    # So: ')' } → ) }  (remove the spurious ')
    
    changes = content.count("')'}")
    content = content.replace("')'}", "')}")
    
    # Also fix ')' } with space
    changes2 = content.count("')' }")
    content = content.replace("')' }", "') }")
    
    SRC.write_text(content, encoding='utf-8')
    print(f"Fixed {changes + changes2} occurrences of spurious quote between ) and }}")

if __name__ == "__main__":
    main()
