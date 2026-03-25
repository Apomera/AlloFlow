import os
import subprocess

target = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\src\stem_lab_module.js'
with open(target, 'r', encoding='utf-8') as f:
    orig = f.read()

def test_syntax():
    try:
        subprocess.check_output(['node', '-c', target], stderr=subprocess.STDOUT)
        return True
    except subprocess.CalledProcessError as e:
        return False

# Attempt with 2 parens
content_2 = orig.replace(')));', '));')
with open(target, 'w', encoding='utf-8') as f:
    f.write(content_2)
if test_syntax():
    print("Passed with 2 parens: ));")
    exit(0)

# Attempt with 1 paren
content_1 = orig.replace(')));', ');')
with open(target, 'w', encoding='utf-8') as f:
    f.write(content_1)
if test_syntax():
    print("Passed with 1 paren: );")
    exit(0)

# Restore
with open(target, 'w', encoding='utf-8') as f:
    f.write(orig)
print("Failed with 1 and 2 parens.")
