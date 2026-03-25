import os
import subprocess

target = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\src\stem_lab_module.js'
with open(target, 'r', encoding='utf-8') as f:
    orig = f.read()

def test_syntax(parens_str):
    content = orig.replace(')));', parens_str)
    with open(target, 'w', encoding='utf-8') as f:
        f.write(content)
    try:
        subprocess.check_output(['node', '-c', target], stderr=subprocess.STDOUT)
        print(f"Passed with: {parens_str}")
    except subprocess.CalledProcessError as e:
        print(f"Failed with: {parens_str} - Error: {e.output.decode('utf-8').splitlines()[-3:]}")

test_syntax('));')
test_syntax(');')
test_syntax(';')
test_syntax('')

# Restore
with open(target, 'w', encoding='utf-8') as f:
    f.write(orig)
