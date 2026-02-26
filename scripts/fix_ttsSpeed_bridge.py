"""Fix ttsSpeed ReferenceError in Bridge Mode.

ttsSpeed is defined inside WordSoundsGenerator (L4586) but referenced
in AlloFlowApp bridge mode (L70486, L70531, L70608) where it's out of scope.
This script replaces the 3 bare references with a safe typeof check + fallback.
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

target_lines = [70486, 70531, 70608]  # 1-indexed
fixes = 0

for line_num in target_lines:
    idx = line_num - 1  # 0-indexed
    old = lines[idx]
    if '350 / ttsSpeed' in old:
        lines[idx] = old.replace(
            '350 / ttsSpeed',
            '350 / (typeof ttsSpeed !== "undefined" ? ttsSpeed : 1.0)'
        )
        fixes += 1
        print(f'Fixed line {line_num}: {lines[idx].strip()[:120]}')
    else:
        print(f'WARNING: line {line_num} does not match: {old.strip()[:80]}')

if fixes == 3:
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f'\nSuccess: {fixes} lines fixed in AlloFlowANTI.txt')
else:
    print(f'\nABORTED: only {fixes}/3 lines matched')
