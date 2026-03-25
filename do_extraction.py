import os

with open('stem_lab/stem_lab_module.js', encoding='utf-8') as f:
    m_lines = f.readlines()
with open('stem_lab/stem_tool_creative.js', encoding='utf-8') as f:
    c_lines = f.readlines()

# 1. Creative Plugin slice
c_start = -1
for i, l in enumerate(c_lines):
    if "registerTool('codingPlayground'" in l: c_start = i; break
c_end = len(c_lines)
for i in range(c_start+1, len(c_lines)):
    if "registerTool('" in c_lines[i] and not c_lines[i].strip().startswith('//'): c_end = i; break

wrapper_head = []
for i in range(c_start, c_end):
    wrapper_head.append(c_lines[i])
    if "Tool body (codingPlayground)" in c_lines[i]:
        wrapper_head.append("    return (function() {\n")
        break

wrapper_tail = ["    })();\n  }\n});\n"]

# 2. Module Inline slice
m_start = -1
for i, l in enumerate(m_lines):
    if "stemLabTool === 'codingPlayground' && (() => {" in l: m_start = i; break
m_end = len(m_lines)
for i in range(m_start+1, len(m_lines)):
    if "})()," in m_lines[i] and i > m_start+20: m_end = i; break

inline_body = m_lines[m_start+1:m_end]

# 3. Write new file
with open('stem_lab/stem_tool_coding.js', 'w', encoding='utf-8') as f:
    f.writelines(wrapper_head)
    f.writelines(inline_body)
    f.writelines(wrapper_tail)

# 4. Clean stem_tool_creative.js
c_start_actual = c_start
if c_start > 0 and "codingPlayground" in c_lines[c_start-1]:
    c_start_actual = c_start - 1

with open('stem_lab/stem_tool_creative.js', 'w', encoding='utf-8') as f:
    f.writelines(c_lines[:c_start_actual] + c_lines[c_end:])

# 5. Clean stem_lab_module.js
first_line = m_lines[m_start]
keep_prefix = first_line.split("stemLabTab ===")[0]  # usually '        })(), '

new_m_lines = m_lines[:m_start] + [keep_prefix + "\n"] + m_lines[m_end+1:]

p_idx = -1
for i, l in enumerate(new_m_lines):
    if "var _pluginOnlyTools =" in l: p_idx = i; break
if p_idx != -1:
    for i in range(p_idx+1, p_idx+20):
        if "volume: true" in new_m_lines[i]:
            new_m_lines[i] = new_m_lines[i].replace("volume: true,", "volume: true, codingPlayground: true,")
            break

with open('stem_lab/stem_lab_module.js', 'w', encoding='utf-8') as f:
    f.writelines(new_m_lines)

# 6. Update AlloFlowANTI.txt
with open('AlloFlowANTI.txt', encoding='utf-8') as f:
    a_lines = f.readlines()
for i, l in enumerate(a_lines):
    if "stem_tool_creative.js" in l:
        a_lines.insert(i+1, l.replace("stem_tool_creative.js", "stem_tool_coding.js"))
        break
with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.writelines(a_lines)

print("Extraction complete.")
print("Created: stem_tool_coding.js")
print(f"Removed inline body lines {m_start} to {m_end} (Kept prefix: '{keep_prefix.strip()}')")
print(f"Removed creative plugin body lines {c_start} to {c_end}")
