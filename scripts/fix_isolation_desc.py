with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    c = f.read()
old = "'word_sounds.isolation_desc': 'Identify the beginning, middle, or ending sound in a word'"
new = "'word_sounds.isolation_desc': 'Identify a specific sound by position in a word'"
c = c.replace(old, new)
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(c)
print("Updated isolation_desc")
