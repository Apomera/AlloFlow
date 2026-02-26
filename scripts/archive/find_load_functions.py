import re

SOURCE_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
OUTPUT_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\loaders.txt'

def find_loaders():
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write("Scanning for loader functions...\n")
        for i, line in enumerate(lines):
            if "function _LOAD" in line or "_LOAD" in line and "function" in line:
                out.write(f"Line {i+1}: {line.strip()}\n")

if __name__ == "__main__":
    find_loaders()
