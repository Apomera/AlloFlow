FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

import re
old_pattern = r'AlloFlow@[a-f0-9]+/word_sounds_module\.js'
matches = re.findall(old_pattern, c)
print(f'Found {len(matches)} WordSounds CDN refs: {matches}')

c = re.sub(old_pattern, 'AlloFlow@cc02b2a/word_sounds_module.js', c)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)

print('WordSounds CDN pinned to @cc02b2a')
