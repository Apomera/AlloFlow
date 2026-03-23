import re
import sys

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the specific className string using regex to dodge newline issues
pattern = r'className: "w-full max-w-\[98vw\] m-2 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"'
replacement = r'className: "w-full max-h-[96vh] max-w-[98vw] m-2 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"'

text = re.sub(pattern, replacement, text)

with open('stem_lab_module.js', 'w', encoding='utf-8', newline='') as f:
    f.write(text)

print("Replacement complete.")
