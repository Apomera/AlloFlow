with open('stem_lab/stem_tool_creative.js', encoding='utf-8', errors='ignore') as f:
    c_lines = f.readlines()
c_start = -1
c_end = len(c_lines)
for i, l in enumerate(c_lines):
    if "registerTool('codingPlayground'" in l: c_start = i
    if c_start != -1 and i > c_start and "registerTool('" in l: c_end = i; break

with open('stem_lab/stem_lab_module.js', encoding='utf-8', errors='ignore') as f:
    m_lines = f.readlines()
m_start = -1
m_end = -1
for i, l in enumerate(m_lines):
    if "stemLabTool === 'codingPlayground' && (() => {" in l: m_start = i
    if m_start != -1 and i > m_start+10 and ("stemLabTab === 'explore'" in l or "})()," in l): m_end = i; break

with open('tmp_compare.txt', 'w', encoding='utf-8') as out:
    out.write(f"Creative Plugin Lines: {c_end - c_start}\n")
    out.write(f"Module Inline Lines: {m_end - m_start if m_end != -1 else len(m_lines)-m_start}\n")
