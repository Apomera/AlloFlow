import sys

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

old_line = "        (function _funcGrapherTool() { var _isFuncGrapher = stemLabTab === 'explore' && stemLabTool === 'funcGrapher'; if (!_isFuncGrapher) { React.useEffect(function(){}, []); return null; }\n"
new_line = "        (function _funcGrapherTool() { var _isFuncGrapher = stemLabTab === 'explore' && stemLabTool === 'funcGrapher'; if (!_isFuncGrapher) { return null; }\n"

found = False
for i in range(12850, 12880):
    if old_line.strip() in lines[i]:
        lines[i] = new_line
        found = True
        print(f"Replaced rogue hook at line {i+1}.")
        break

if not found:
    print("WARNING: Could not find exact _funcGrapherTool placeholder line to replace.")
    for i in range(12859, 12862):
        print(f"[{i+1}] {repr(lines[i])}")

else:
    with open('stem_lab_module.js', 'w', encoding='utf-8', newline='') as f:
        f.writelines(lines)
    print("Patch applied successfully.")
