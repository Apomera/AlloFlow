with open('stem_lab/stem_tool_platetectonics.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('—', ' - ')

with open('stem_lab/stem_tool_platetectonics.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Replacement completed successfully!")
