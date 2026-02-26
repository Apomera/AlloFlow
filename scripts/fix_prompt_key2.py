"""Also add word_families_prompt to the non-English localized keys section"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# Find L13993 area (non-English word_families_desc)
for i, l in enumerate(lines):
    if 'word_families_desc' in l and i > 13000:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Add after the non-English word_families_desc
old_non_en = "word_families_desc: 'Group words by common patterns',"
if old_non_en in content:
    new_non_en = old_non_en + "\n            word_families_prompt: 'Which words belong to the same family?',"
    content = content.replace(old_non_en, new_non_en, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("ADDED: word_families_prompt to non-English section too")
else:
    print("[INFO] Non-English word_families_desc not found (may use flat key format)")
