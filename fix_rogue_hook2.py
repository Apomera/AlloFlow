import sys

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_block = "var _isFuncGrapher = stemLabTab === 'explore' && stemLabTool === 'funcGrapher'; if (!_isFuncGrapher) { React.useEffect(function(){}, []); return null; }"
new_block = "var _isFuncGrapher = stemLabTab === 'explore' && stemLabTool === 'funcGrapher'; if (!_isFuncGrapher) { return null; }"

if old_block in text:
    text = text.replace(old_block, new_block)
    with open('stem_lab_module.js', 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    print("Patch applied successfully.")
else:
    print("WARNING: Could not find exact string.")
