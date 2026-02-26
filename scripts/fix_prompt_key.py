"""Find all word_sounds.*_prompt keys and add missing word_families_prompt"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Show existing prompt keys
lines = content.split('\n')
print("=== Existing word_sounds.*_prompt keys ===")
for i, l in enumerate(lines):
    if '_prompt' in l and 'word_sounds' in l and ':' in l:
        stripped = l.strip()
        if stripped.startswith("'word_sounds") or stripped.startswith('"word_sounds'):
            print("L%d: %s" % (i+1, stripped[:180]))

# Find where to add - after the last existing prompt key
# Let's find where word_families_desc is and add word_families_prompt nearby
print("\n=== word_families_desc location ===")
for i, l in enumerate(lines):
    if 'word_families_desc' in l and ':' in l:
        print("L%d: %s" % (i+1, l.strip()[:180]))

# Add word_families_prompt after word_families_desc in English UI_STRINGS
old_key = "'word_sounds.word_families_desc': 'Build the word family house"
if old_key in content:
    # Find the full line
    idx = content.index(old_key)
    # Find end of this line
    end_of_line = content.index('\n', idx)
    existing_line = content[idx:end_of_line]
    print("\nFound: %s" % existing_line[:150])
    
    # Add the new key after this line
    new_key = "\n        'word_sounds.word_families_prompt': 'Which words belong to the same family?',"
    content = content[:end_of_line] + new_key + content[end_of_line:]
    
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("\nADDED: word_sounds.word_families_prompt key")
else:
    print("\n[WARN] word_families_desc not found with expected prefix")
    # Try alternate search
    for i, l in enumerate(lines):
        if 'word_families_desc' in l:
            print("  L%d: %s" % (i+1, l.strip()[:180]))
