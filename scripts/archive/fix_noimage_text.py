"""Fix the no-image word text line to use showWordText guard."""

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the exact line with just {currentWordSoundsWord} in the no-image button
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped == '{currentWordSoundsWord}':
        # Verify context: previous lines should have text-4xl
        context = ''.join(lines[max(0,i-5):i])
        if 'text-4xl' in context:
            indent = line[:len(line)-len(line.lstrip())]
            lines[i] = indent + "{(getEffectiveTextMode() === 'alwaysOn' || showWordText) ? currentWordSoundsWord : '\U0001f50a Listen'}\n"
            print(f"Fixed no-image word text at L{i+1}")
            break
    # Also check for inline version
    elif 'getEffectiveTextMode' not in line and stripped == '{currentWordSoundsWord}':
        pass  # already handled above
else:
    # Fallback: search more broadly
    for i, line in enumerate(lines):
        if '{currentWordSoundsWord}' in line and 'getEffectiveTextMode' not in line:
            ctx_before = ''.join(lines[max(0,i-8):i])
            if 'text-4xl' in ctx_before:
                indent = line[:len(line)-len(line.lstrip())]
                lines[i] = indent + "{(getEffectiveTextMode() === 'alwaysOn' || showWordText) ? currentWordSoundsWord : '\U0001f50a Listen'}\n"
                print(f"Fixed no-image word text (fallback) at L{i+1}")
                break
    else:
        print("WARNING: Could not find no-image word text to fix")
        # Debug: show all currentWordSoundsWord occurrences
        for i, line in enumerate(lines):
            if '{currentWordSoundsWord}' in line:
                print(f"  L{i+1}: {line.strip()[:100]}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Saved")
