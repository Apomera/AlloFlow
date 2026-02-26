"""Fix doubled line endings: convert all \r\r\n to \r\n"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

def main():
    content = SRC.read_bytes()
    print(f"File size: {len(content)} bytes")
    
    # Count \r\r\n occurrences
    double_cr = content.count(b'\r\r\n')
    print(f"Found {double_cr} doubled CRLF patterns")
    
    # Fix: replace \r\r\n with \r\n
    content = content.replace(b'\r\r\n', b'\r\n')
    
    # Also fix any \r\n\r\n that should just be blank lines (these are fine)
    # But fix \r\r (double CR without LF)
    content = content.replace(b'\r\r', b'\r')
    
    SRC.write_bytes(content)
    
    # Verify
    lines = content.count(b'\n')
    print(f"After fix: {lines} lines, {len(content)} bytes")

if __name__ == "__main__":
    main()
