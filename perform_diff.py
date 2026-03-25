import os

with open('stem_lab/stem_tool_creative.js', encoding='utf-8', errors='ignore') as f:
    c_lines = f.readlines()
c_start = -1
for i, l in enumerate(c_lines):
    if "registerTool('codingPlayground'" in l: c_start = i; break
c_end = len(c_lines)
for i in range(c_start+1, len(c_lines)):
    if "registerTool('" in c_lines[i] and not c_lines[i].strip().startswith('//'): c_end = i; break

with open('stem_lab/stem_lab_module.js', encoding='utf-8', errors='ignore') as f:
    m_lines = f.readlines()
m_start = -1
for i, l in enumerate(m_lines):
    if "stemLabTool === 'codingPlayground' && (() => {" in l: m_start = i; break
m_end = len(m_lines)
for i in range(m_start+1, len(m_lines)):
    if "})()," in m_lines[i] and i > m_start+20: m_end = i; break

# Normalize by stripping all leading whitespace and empty lines
norm_c = [l.strip() + '\n' for l in c_lines[c_start:c_end] if l.strip()]
norm_m = [l.strip() + '\n' for l in m_lines[m_start:m_end] if l.strip()]

with open('tmp_c_norm.txt', 'w', encoding='utf-8') as out:
    out.writelines(norm_c)
with open('tmp_m_norm.txt', 'w', encoding='utf-8') as out:
    out.writelines(norm_m)

print(f"Normalized C: {len(norm_c)} lines, Normalized M: {len(norm_m)} lines")
os.system('git diff --no-index --unified=1 tmp_m_norm.txt tmp_c_norm.txt > tmp_coding_diff.txt')
