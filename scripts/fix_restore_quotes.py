"""Restore the two false-positive quote removals at L26932 and L40008."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0
    
    # Fix 1: L26932 - restore 'My'} from 'My}
    old1 = """isParentMode ? "Your Child's" : 'My} Learning Progress Report"""
    new1 = """isParentMode ? "Your Child's" : 'My'} Learning Progress Report"""
    if old1 in content:
        content = content.replace(old1, new1, 1)
        changes += 1
        print("  Restored L26932: 'My'}")
    
    # Fix 2: L40008 - restore ''} from '}
    old2 = """conventions.` : '}"""
    new2 = """conventions.` : ''}"""
    if old2 in content:
        content = content.replace(old2, new2, 1)
        changes += 1
        print("  Restored L40008: ''}")
    
    SRC.write_text(content, encoding='utf-8')
    print(f"\nDone! {changes} restorations.")

if __name__ == "__main__":
    main()
