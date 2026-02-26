"""Line-based patch for prompt upgrade and phonemeCount"""
FILE = 'AlloFlowANTI.txt'

f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Debug: show exact bytes at key lines
print(f"Total lines: {len(lines)}")
print(f"L1452 starts with: {repr(lines[1451][:80])}")
print(f"L1455 starts with: {repr(lines[1454][:80])}")
print(f"L1503 starts with: {repr(lines[1502][:80])}")
print(f"L1504 starts with: {repr(lines[1503][:80])}")

# Check if the prompt is at the expected lines
prompt_start = None
prompt_end = None
for i in range(1440, 1490):
    if 'const prompt = `' in lines[i]:
        prompt_start = i
    if prompt_start and '`;' in lines[i] and i > prompt_start:
        prompt_end = i
        break

phoneme_line = None
for i in range(1490, 1520):
    if 'phonemes: validatedPhonemes,' in lines[i]:
        phoneme_line = i
        break

print(f"\nPrompt range: L{prompt_start+1 if prompt_start else '?'} to L{prompt_end+1 if prompt_end else '?'}")
print(f"phonemeCount insert after: L{phoneme_line+1 if phoneme_line else '?'}")
