#!/usr/bin/env python3
"""
Find imbalanced brackets in the file
"""

from pathlib import Path

def find_imbalance(file_path):
    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')
    
    # Track bracket balance line by line
    balance = 0
    first_negative = None
    negative_lines = []
    
    for i, line in enumerate(lines):
        for char in line:
            if char == '[':
                balance += 1
            elif char == ']':
                balance -= 1
                if balance < 0 and first_negative is None:
                    first_negative = i + 1
                if balance < -20:
                    negative_lines.append((i+1, balance, line[:80]))
    
    print(f"First line where balance goes negative: L{first_negative}")
    print(f"Final balance: {balance}")
    print()
    
    if negative_lines:
        print("Lines with significant negative balance:")
        for ln, bal, text in negative_lines[:10]:
            print(f"  L{ln} (bal={bal}): {text[:60]}")

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    find_imbalance(file_path)
