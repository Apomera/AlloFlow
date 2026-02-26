#!/usr/bin/env python3
"""
Find all ErrorBoundary usages and their context
"""

from pathlib import Path

def find_error_boundaries(file_path):
    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')
    
    matches = []
    for i, line in enumerate(lines):
        if '<ErrorBoundary' in line:
            matches.append((i+1, line.strip()[:100]))
    
    print(f"Found {len(matches)} ErrorBoundary usages:")
    for ln, txt in matches:
        # Get 2 lines before for context
        ctx_start = max(0, ln - 3)
        ctx = lines[ctx_start].strip()[:50] if ctx_start >= 0 else ""
        print(f"L{ln}: {txt}")
        print(f"      ctx: {ctx}")
        print()

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    find_error_boundaries(file_path)
