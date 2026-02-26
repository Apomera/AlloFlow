import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# FIX 1: Duplicate word_families in scaffolding config (L1544-1545)
# Keep one, remove the other
old_dup1 = "            'sound_sort':     'progressive',\n            'word_families':  'progressive',       // Standard scaffolding\n            'word_families':  'progressive',       // Rime-based scaffolding\n"
new_dup1 = "            'sound_sort':     'progressive',       // Phoneme categorization\n            'word_families':  'progressive',       // Rime-based scaffolding\n"
if old_dup1 in content:
    content = content.replace(old_dup1, new_dup1)
    changes += 1
    print("1. Removed duplicate word_families scaffolding key")
else:
    print("1. Pattern not found")

# FIX 2: Duplicate activity_word_families in localization (L11593-11594)
old_dup2 = '                activity_word_families: "Word Families",\n                activity_word_families: "Word Families",\n'
new_dup2 = '    activity_word_families: "Word Families",\n'
if old_dup2 in content:
    content = content.replace(old_dup2, new_dup2)
    changes += 1
    print("2. Removed duplicate activity_word_families key + fixed indentation")
else:
    print("2. Pattern not found")

content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\nFixed {changes} duplicates. Saved.")
