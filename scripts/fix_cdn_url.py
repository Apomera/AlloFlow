import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all occurrences of stem_lab_module in CDN URLs
idx = content.find('stem_lab_module')
while idx >= 0:
    # Get context
    start = max(0, idx - 120)
    end = min(len(content), idx + 40)
    context = content[start:end]
    print(f"Found at pos {idx}:")
    print(f"  Context: ...{repr(context[-80:])}...")
    idx = content.find('stem_lab_module', idx + 1)

# Replace @master with @4fcadc9 for stem_lab_module
old = "AlloFlow@master/stem_lab_module.js"
new = "AlloFlow@4fcadc9/stem_lab_module.js"
count = content.count(old)
print(f"\nPattern '{old}' found {count} times")

if count == 0:
    # Try to find any jsdelivr URL for stem_lab
    import re
    matches = re.findall(r'jsdelivr[^\'\"]*stem_lab_module\.js', content)
    print(f"All jsdelivr stem_lab patterns: {matches}")

content = content.replace(old, new)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved")
