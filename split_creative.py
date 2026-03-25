"""Split stem_tool_creative.js into stem_tool_art.js and stem_tool_datastudio.js"""

with open('stem_lab/stem_tool_creative.js', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in creative: {len(lines)}")

# The file structure:
# L1-31: StemLab guard + registry stub  
# L33: (function() { 'use strict';
# L36: dataPlot comment
# L38-7116: artStudio registerTool
# L7118-8228: dataStudio registerTool
# L8229: })();

# Find exact boundaries
art_start = None
data_start = None
for i, line in enumerate(lines):
    if "registerTool('artStudio'" in line:
        art_start = i
        print(f"Art Studio starts at line {i+1}")
    if "registerTool('dataStudio'" in line:
        data_start = i
        print(f"Data Studio starts at line {i+1}")

# The guard (StemLab stub) is lines 1-31
guard = ''.join(lines[0:31])

# Find the end of artStudio (the line before dataStudio's registerTool)
# There should be closing });  between the two tools
art_end = data_start  # everything before dataStudio starts is artStudio

# Find end of dataStudio (should end with }); before the final })();
data_end = len(lines) - 1  # last line is the IIFE close

# artStudio body: from the registerTool line to just before dataStudio
art_body = ''.join(lines[art_start:art_end])

# dataStudio body: from the registerTool line to just before the IIFE close
# Find the })(); closing
iife_close = None
for i in range(len(lines)-1, -1, -1):
    if '})();' in lines[i] or "})();" in lines[i]:
        iife_close = i
        break
print(f"IIFE close at line {iife_close+1}")

data_body = ''.join(lines[data_start:iife_close])

# Write stem_tool_art.js
art_content = guard + "\n(function() {\n  'use strict';\n\n" + art_body + "\n})();\n"
with open('stem_lab/stem_tool_art.js', 'w', encoding='utf-8') as f:
    f.write(art_content)
print(f"stem_tool_art.js: {len(art_content.splitlines())} lines")

# Write stem_tool_datastudio.js
data_content = guard + "\n(function() {\n  'use strict';\n\n" + data_body + "\n})();\n"
with open('stem_lab/stem_tool_datastudio.js', 'w', encoding='utf-8') as f:
    f.write(data_content)
print(f"stem_tool_datastudio.js: {len(data_content.splitlines())} lines")

print("Split complete!")
