# -*- coding: utf-8 -*-
"""Find ALL remaining t() references that are at module scope (before AlloFlowContent).
Also check the restored blocks for t references."""

MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find the AlloFlowContent function component start
content_start = None
for i, l in enumerate(lines):
    if 'function AlloFlowContent' in l or 'const AlloFlowContent' in l:
        content_start = i + 1
        print(f"AlloFlowContent starts at L{i+1}: {l.strip()[:100]}")
        break

if content_start is None:
    print("WARNING: AlloFlowContent not found!")
    content_start = len(lines)

# Check the deployed file too
DEPLOY_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\AlloFlowANTI.txt'
try:
    with open(DEPLOY_FILE, 'r', encoding='utf-8') as f:
        deploy_lines = f.readlines()
    print(f"Deploy file: {len(deploy_lines)} lines")
    # Check if deploy file has the fix
    for i, l in enumerate(deploy_lines[8640:8660], start=8641):
        if 'aria-label' in l:
            print(f"  Deploy L{i}: {l.strip()[:100]}")
except:
    print("Could not read deploy file")

# Find all t(' references before AlloFlowContent
print(f"\n=== t() calls before AlloFlowContent (L1-{content_start}) ===")
count = 0
for i in range(0, content_start):
    l = lines[i]
    # Look for t(' pattern - the translation function call
    if "t('" in l or 't("' in l:
        # Filter out obvious non-translation t() calls:
        # - const, let, var declarations using 'at(' 
        # - comments
        stripped = l.strip()
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        # Check if it looks like a real t() call
        import re
        if re.search(r"\bt\s*\(\s*['\"]", l):
            count += 1
            print(f"  L{i+1}: {stripped[:150]}")

print(f"\nTotal: {count} t() calls before AlloFlowContent")
