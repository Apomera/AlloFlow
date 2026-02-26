"""
Fix build error: Remove orphaned JSX at lines 7816-7831.
These lines are a partial <button> element (missing opening tag)
left behind after a 'Header Controls' section was removed.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

original_count = len(lines)
print(f"Starting: {original_count} lines")

# Verify the target lines are what we expect
target_start = 7815  # 0-indexed (L7816 in 1-indexed)
target_end = 7830    # 0-indexed (L7831 in 1-indexed)

# Verify markers
assert '// Header Controls (removed' in lines[target_start], f"Expected comment at L{target_start+1}, got: {lines[target_start].strip()}"
assert '</div>' in lines[target_end], f"Expected </div> at L{target_end+1}, got: {lines[target_end].strip()}"

print(f"Removing orphaned JSX L{target_start+1}-L{target_end+1} ({target_end - target_start + 1} lines)")
print(f"  First line: {lines[target_start].strip()}")
print(f"  Last line:  {lines[target_end].strip()}")

del lines[target_start:target_end + 1]

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

final_count = len(lines)
print(f"\nFinal: {final_count} lines (removed {original_count - final_count})")
