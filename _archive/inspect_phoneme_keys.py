
import re

FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

def inspect_keys():
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        print(f"Total lines: {len(lines)}")
        
        in_bank = False
        bank_start = 0
        
        for i, line in enumerate(lines):
            if "const PHONEME_AUDIO_BANK = {" in line or "var PHONEME_AUDIO_BANK = {" in line:
                print(f"BANK START found at line {i+1}")
                in_bank = True
                bank_start = i
            
            if in_bank:
                if "};" in line and line.strip() == "};":
                    # End of bank (heuristic)
                    # print(f"BANK END at line {i+1}")
                    in_bank = False
                
                # Check for 'or' key
                # varying formats: "or":, 'or':, or:
                clean = line.strip()
                if clean.startswith('"or":') or clean.startswith("'or':") or clean.startswith("or:"):
                    print(f"FOUND 'or' KEY at line {i+1}: {clean[:50]}...")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_keys()
