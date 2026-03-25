import subprocess
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
    if "stemLabTab === 'explore' && stemLabTool ===" in m_lines[i] or "})()," in m_lines[i] and i > m_start+10: m_end = i; break

with open('tmp_c.js', 'w', encoding='utf-8') as out:
    out.writelines(c_lines[c_start:c_end])
with open('tmp_m.js', 'w', encoding='utf-8') as out:
    out.writelines(m_lines[m_start:m_end])

print(f"C: {c_end-c_start} lines, M: {m_end-m_start} lines")
import os
os.system(':> tmp_diff.txt')
os.system('git diff --no-index --stat tmp_m.js tmp_c.js > tmp_diff.txt')
