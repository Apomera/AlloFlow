#!/usr/bin/env python3
"""
Deep diagnostic analysis for undefined component error
"""

import re
from pathlib import Path

def analyze(file_path):
    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')
    
    print("=== LUCIDE IMPORT ANALYSIS ===")
    
    # Count lucide-react imports
    lucide_count = content.count("lucide-react")
    print(f"lucide-react references: {lucide_count}")
    
    # Find the main import line
    for i, line in enumerate(lines):
        if "from 'lucide-react'" in line or 'from "lucide-react"' in line:
            print(f"Import at L{i+1}")
            # Extract the icon names
            match = re.search(r'\{\s*(.+)\s*\}\s*from', line, re.DOTALL)
            if match:
                icons = [x.strip() for x in match.group(1).split(',') if x.strip()]
                print(f"  Icons imported: {len(icons)}")
    
    print()
    print("=== CHECKING FOR OVERWRITES ===")
    
    # Check if any icon is redefined after import
    icon_samples = ['Edit2', 'ArrowLeft', 'Trash2', 'Cloud', 'XCircle']
    for icon in icon_samples:
        # Look for "const IconName =" that's not in import line
        pattern = f"const {icon} ="
        if pattern in content:
            idx = content.find(pattern)
            ln = content[:idx].count('\n') + 1
            # Skip if it's on line 1-25 (import area)
            if ln > 25:
                ctx = lines[ln-1][:80] if ln <= len(lines) else "N/A"
                print(f"  {icon} redefined at L{ln}: {ctx}")
    
    print()
    print("=== CHECKING FOR UNDEFINED COMPONENT USAGE ===")
    
    # Find all JSX component names used
    jsx_comps = set(re.findall(r'<([A-Z][a-zA-Z0-9]+)', content))
    
    # Get lucide icons from import
    lucide_match = re.search(r'import\s*\{([^}]+)\}\s*from\s*[\'"]lucide-react[\'"]', content, re.DOTALL)
    lucide_icons = set()
    if lucide_match:
        lucide_icons = set(x.strip().split(' as ')[0].strip() for x in lucide_match.group(1).replace('\n', '').split(',') if x.strip())
    
    # Skip React built-ins
    skip = {'React', 'Fragment', 'Suspense', 'Provider', 'LanguageContext'}
    
    # Find components that aren't defined anywhere
    undefined_comps = []
    for comp in jsx_comps:
        if comp in skip or comp in lucide_icons:
            continue
        # Check if defined in file
        patterns = [
            f"const {comp} ",
            f"const {comp}=",
            f"function {comp}",
            f"class {comp}",
        ]
        is_defined = any(p in content for p in patterns)
        if not is_defined:
            idx = content.find(f'<{comp}')
            ln = content[:idx].count('\n') + 1 if idx > 0 else 0
            undefined_comps.append((comp, ln))
    
    if undefined_comps:
        print(f"Found {len(undefined_comps)} potentially undefined components:")
        for comp, ln in sorted(undefined_comps, key=lambda x: x[1])[:10]:
            print(f"  <{comp}> first used at L{ln}")
    else:
        print("All components appear to be defined!")
    
    print()
    print("=== STRUCTURE ANALYSIS ===")
    
    # Check brace/paren balance
    opens = content.count('{')
    closes = content.count('}')
    print(f"Braces: {{ = {opens}, }} = {closes}, diff = {opens - closes}")
    
    parens_open = content.count('(')
    parens_close = content.count(')')
    print(f"Parens: ( = {parens_open}, ) = {parens_close}, diff = {parens_open - parens_close}")
    
    brackets_open = content.count('[')
    brackets_close = content.count(']')
    print(f"Brackets: [ = {brackets_open}, ] = {brackets_close}, diff = {brackets_open - brackets_close}")

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    analyze(file_path)
