"""Fix remaining async setTimeout by injecting guard line after each one"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0
# Target lines that have setTimeout(async () => { pattern 
# and the NEXT line does NOT already have isMountedRef
targets_found = []
for i, line in enumerate(lines):
    if 'setTimeout(async () =>' in line and i + 1 < len(lines):
        next_line = lines[i + 1]
        if 'isMountedRef' not in next_line:
            # Get indentation of the next line to match it
            indent = len(next_line) - len(next_line.lstrip())
            indent_str = next_line[:indent]
            targets_found.append((i, indent_str, line.strip()[:80]))

print(f"Found {len(targets_found)} async setTimeout without isMountedRef guard:")
for idx, indent, text in targets_found:
    print(f"  L{idx+1}: {text}")

# Insert guard lines (work backwards to preserve line numbers)
for idx, indent_str, _ in reversed(targets_found):
    guard_line = f"{indent_str}if (!isMountedRef.current) return;\r\n"
    lines.insert(idx + 1, guard_line)
    changes += 1

print(f"\nInserted {changes} isMountedRef guards")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.writelines(lines)
print("File saved.")
