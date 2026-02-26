FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()
old = "wordSoundsActivity !== 'word_families')"
new = "wordSoundsActivity !== 'sound_sort')"
count = c.count(old)
print(f'Found {count} occurrences')
if count > 0:
    c = c.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8', newline='') as f:
        f.write(c)
    print('Fixed')
else:
    print('Already fixed or not found')
