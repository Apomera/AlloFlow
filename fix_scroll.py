import sys

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_modal = 'm-2 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"'
new_modal = 'max-h-[96vh] m-2 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"'

if old_modal in text:
    print("Found modal wrapper, replacing...")
    text = text.replace(old_modal, new_modal)
else:
    print("WARNING: Could not find modal wrapper block!")
    
# Also add custom scrollbar styles to the main modal if it doesn't already have one
old_scroll = 'className: "flex-1 overflow-y-auto p-6"'
new_scroll = 'className: "flex-1 overflow-y-auto overflow-x-hidden p-6 styled-scrollbar"'

if old_scroll in text:
    print("Found scroll view wrapper, replacing...")
    text = text.replace(old_scroll, new_scroll)
else:
    print("WARNING: Could not find scroll view block!")

with open('stem_lab_module.js', 'w', encoding='utf-8', newline='') as f:
    f.write(text)

print("Replacement complete.")
