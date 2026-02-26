
import re

FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

def audit():
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        print(f"Scanning {len(lines)} lines...")
        
        print("\n--- ACTIVITY CASES ---")
        for i, line in enumerate(lines):
            if "case '" in line and ":" in line:
                print(f"L{i+1}: {line.strip()}")
                
        print("\n--- IMAGE STATE ---")
        for i, line in enumerate(lines):
            if "const [showImage" in line:
                print(f"L{i+1}: {line.strip()}")
                
        print("\n--- FAMILY MEMBERS USAGE ---")
        for i, line in enumerate(lines):
            if "familyMembers" in line:
                # Print strictly usage in render logic (usually rendering a map)
                if ".map" in line or "length" in line:
                    print(f"L{i+1}: {line.strip()}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    audit()
