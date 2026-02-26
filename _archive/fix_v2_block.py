"""Remove DISABLE_GEMINI_PHONEMES_V2 dead block"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find const DISABLE_GEMINI_PHONEMES_V2 = false;
v2_const = None
for i in range(5420, 5440):
    if 'DISABLE_GEMINI_PHONEMES_V2' in lines[i] and 'const' in lines[i]:
        v2_const = i
        break

if v2_const is None:
    print("Could not find DISABLE_GEMINI_PHONEMES_V2 const")
    exit(1)

# Find the if block start
v2_if = None  
for i in range(v2_const, v2_const + 10):
    if 'if (DISABLE_GEMINI_PHONEMES_V2)' in lines[i]:
        v2_if = i
        break

# Find the closing brace by counting braces
depth = 0
v2_end = None
found_opening = False
for i in range(v2_if, v2_if + 200):
    for ch in lines[i]:
        if ch == '{':
            depth += 1
            found_opening = True
        elif ch == '}':
            depth -= 1
    if found_opening and depth == 0:
        v2_end = i
        break

if v2_end:
    # Remove from the comment line before const through end of if block
    # Find the comment line (should be L5430: // FEATURE FLAG...)
    start = v2_const
    for j in range(v2_const - 3, v2_const):
        if 'FEATURE FLAG' in lines[j] or 'feature flag' in lines[j].lower():
            start = j
            break
    
    # Also check for blank lines before
    while start > 0 and lines[start-1].strip() == '':
        start -= 1
    start = max(start, v2_const - 3)  # Don't go too far back
    
    removed = v2_end - start + 1
    print(f"Removing L{start+1} to L{v2_end+1} ({removed} lines)")
    print(f"  Start: {lines[start].strip()[:100]}")
    print(f"  End:   {lines[v2_end].strip()[:100]}")
    
    del lines[start:v2_end + 1]
    
    f = open(FILE, 'w', encoding='utf-8')
    f.write(''.join(lines))
    f.close()
    print(f"✅ Removed {removed} lines")
    print(f"New total: {len(lines)} lines")
else:
    print(f"Could not find closing brace (v2_const={v2_const}, v2_if={v2_if})")
