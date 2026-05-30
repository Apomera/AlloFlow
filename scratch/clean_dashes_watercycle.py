with open('stem_lab/stem_tool_watercycle.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace literal em-dash
text = text.replace('—', ' - ')
# Replace literal en-dash if any
text = text.replace('–', ' - ')
# Replace escaped unicode representations
text = text.replace('\\u2014', '-')
text = text.replace('\\u2013', '-')

with open('stem_lab/stem_tool_watercycle.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Dash normalization completed!")
