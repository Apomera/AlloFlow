
import re

FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

def find_def():
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        print(f"Scanning {len(lines)} lines...")
        for i, line in enumerate(lines):
            if "const applyWordDataToState" in line or "function applyWordDataToState" in line:
                print(f"Line {i+1}: {line.strip()[:100]}...")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_def()
