"""Fix Timer is not defined error — replace with Clock which is imported."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_text(encoding='utf-8')
    old = '<Timer size={14} /> Math Fluency Probe (CBM-Math)'
    new = '<Clock size={14} /> Math Fluency Probe (CBM-Math)'
    if old in content:
        content = content.replace(old, new, 1)
        SRC.write_text(content, encoding='utf-8')
        print("✅ Replaced <Timer> with <Clock> (which is in the Lucide import)")
    else:
        print("❌ Could not find anchor")

if __name__ == "__main__":
    main()
