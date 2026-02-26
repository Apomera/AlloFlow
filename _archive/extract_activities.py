import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'const WORD_SOUNDS_STRINGS = \{', text)
if m:
    start = m.start()
    end = text.find('};', start) + 2
    bank = text[start:end]
    
    keys = set()
    matches = re.finditer(r'([A-Za-z0-9_]+)_(?:title|desc)\s*:', bank)
    for match in matches:
        keys.add(match.group(1))
        
    titles = re.findall(r'[A-Za-z0-9_]+_title\s*:\s*[\'"`](.*?)[\'"`]', bank)
    
    out = '=== WORD_SOUNDS_STRINGS Activity Keys ===\n'
    for k in sorted(list(keys)):
        out += k + '\n'
        
    out += '\n=== Activity Titles ===\n'
    for t in titles:
        out += t + '\n'
        
    with open('ws_strings_keys.txt', 'w', encoding='utf-8') as f:
        f.write(out)
