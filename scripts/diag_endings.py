"""Diagnose and fix the line ending issue."""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    raw = SRC.read_bytes()
    print(f"File size: {len(raw)} bytes")
    print(f"\\n count: {raw.count(b'\\n')}")
    print(f"\\r count: {raw.count(b'\\r')}")
    print(f"\\r\\n count: {raw.count(b'\\r\\n')}")
    
    # Check the first 500 bytes
    print(f"\nFirst 200 bytes sample:")
    sample = raw[:200]
    for j, b in enumerate(sample):
        if b == 0x0d:
            print(f"  byte {j}: \\r")
        elif b == 0x0a:
            print(f"  byte {j}: \\n")

if __name__ == "__main__":
    main()
