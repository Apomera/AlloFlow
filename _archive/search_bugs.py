"""Find handleGenerate analysis type and the single-chunk source gen path."""
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find handleGenerate definition
for i, line in enumerate(lines):
    if "handleGenerate" in line and ("= async" in line or "= React.useCallback" in line) and "const " in line:
        print(f"L{i+1}: {line.strip()[:120]}")

# Find where analysis type is processed
print("\n=== analysis type handling ===")
for i, line in enumerate(lines):
    if "'analysis'" in line and ("case " in line or "type ===" in line or "type ==" in line):
        print(f"L{i+1}: {line.strip()[:140]}")

# Find where originalText is set/stored  
print("\n=== originalText assignment ===")
for i, line in enumerate(lines):
    if "originalText" in line and ("=" in line) and ("data." in line or ": " in line):
        s = line.strip()[:140]
        if not s.startswith('//') and not s.startswith('*'):
            print(f"L{i+1}: {s}")

# Find single-chunk source gen (the non-multi-section path)
print("\n=== effIncludeCitations in non-multi-section ===")
for i, line in enumerate(lines):
    if "effIncludeCitations" in line:
        print(f"L{i+1}: {line.strip()[:140]}")
