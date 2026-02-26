
import re

FILE_PATH = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

def audit():
    try:
        with open(FILE_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        print(f"Scanning {len(lines)} lines...")
        
        print("\n--- CHECK ANSWER ---")
        for i, line in enumerate(lines):
            if "const checkAnswer =" in line or "function checkAnswer" in line:
                print(f"L{i+1}: {line.strip()}")
                
        print("\n--- SHOW IMAGE SETTER ---")
        for i, line in enumerate(lines):
            if "setShowImage" in line or "setImageVisible" in line:
                print(f"L{i+1}: {line.strip()}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    audit()
