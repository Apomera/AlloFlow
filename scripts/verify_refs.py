import re
f = open('word_sounds_module.js', 'r', encoding='utf-8', errors='replace')
c = f.read()
f.close()

for n in ['INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK']:
    bare = len(re.findall(r'(?<!__ALLO_)\b' + n + r'\b', c))
    allo = len(re.findall(r'__ALLO_' + n, c))
    print(f"  {n}: bare={bare}, window.__ALLO_={allo}")

print(f"\nTotal window.__ALLO_ refs: {c.count('window.__ALLO_')}")
print(f"Optional chaining: {c.count('?.')}")
print(f"File size: {len(c)} chars")
