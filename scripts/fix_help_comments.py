"""Fix: Strip JS comments from help_strings.js before new Function() parse."""

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The regex we want to insert: .replace(/^\s*\/\/.*$/gm, '').trim()
# This strips lines that are only // comments

# Fix 1: Eager load IIFE
old1 = "const hsText = await hsResp.text();\n      HELP_STRINGS = new Function(\"return \" + hsText)();"
new1 = "const hsText = (await hsResp.text()).replace(/^\\s*\\/\\/.*$/gm, '').trim();\n      HELP_STRINGS = new Function(\"return \" + hsText)();"

c1 = content.count(old1)
assert c1 == 1, f"Fix 1: expected 1 match, got {c1}"
content = content.replace(old1, new1, 1)
print("Fix 1 applied: Strip comments in eager load")

# Fix 2: Language translation flow
old2 = "const hsText = await hsResp.text();\n              _helpStrings = new Function('return ' + hsText)();"
new2 = "const hsText = (await hsResp.text()).replace(/^\\s*\\/\\/.*$/gm, '').trim();\n              _helpStrings = new Function('return ' + hsText)();"

c2 = content.count(old2)
assert c2 == 1, f"Fix 2: expected 1 match, got {c2}"
content = content.replace(old2, new2, 1)
print("Fix 2 applied: Strip comments in translation flow")

with open(FILE, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("Done!")
