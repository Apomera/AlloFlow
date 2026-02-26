"""Fix 8b: Add data-help-ignore to wizard Skip button."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Find onClick={handleSkip} and insert data-help-ignore before it
target = 'onClick={handleSkip}'
idx = content.find(target)
if idx < 0:
    print("ERROR: onClick={handleSkip} not found")
    sys.exit(1)

# Check if already fixed
before_context = content[max(0, idx-200):idx]
if 'data-help-ignore' in before_context:
    print("Already patched! data-help-ignore found near handleSkip")
    sys.exit(0)

# Find the <button that precedes this onClick
# Look backwards from idx for '<button'
search_back = content[max(0, idx-200):idx]
btn_pos = search_back.rfind('<button')
if btn_pos < 0:
    print("ERROR: Could not find <button before handleSkip")
    sys.exit(1)

# Insert data-help-ignore after <button
abs_btn_pos = max(0, idx-200) + btn_pos + len('<button')
# Check what's after <button  
after_btn = content[abs_btn_pos:abs_btn_pos+5]
print(f"After <button: {repr(after_btn)}")

# Insert the attribute
insert_text = ' data-help-ignore="true"'
new_content = content[:abs_btn_pos] + insert_text + content[abs_btn_pos:]

with open(FILE, 'w', encoding='utf-8-sig') as f:
    f.write(new_content)

# Verify BOM
with open(FILE, 'rb') as f:
    bom = f.read(3)
print(f"BOM: {bom.hex()} ({'OK' if bom == b'\\xef\\xbb\\xbf' else 'MISSING'})")
print("Fix 8b applied successfully!")
