import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Show exact bytes on line 40289
line = lines[40288]  # 0-indexed
print(f"Raw repr: {repr(line[:120])}")

# Check if it has backslash-backtick
if '\\`' in line:
    print("HAS escaped backticks (\\`)")
    # Fix it
    fixed = line.replace('\\`\\`\\`json', '```json').replace('\\`\\`\\`', '```')
    lines[40288] = fixed
    print(f"Fixed: {repr(fixed[:120])}")
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("SAVED")
elif '`' in line:
    print("Has normal backticks already - no fix needed")
    print(f"Content: {line.strip()[:120]}")
else:
    print("No backticks found at all")
