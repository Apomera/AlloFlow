import subprocess

result = subprocess.run(['git', 'show', '46ecdf2:stem_lab_module.js'], capture_output=True, text=True, encoding='utf-8')
old_lines = result.stdout.split('\n')

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    cur_content = f.read()

# Handle potential \r\n
if '\r\n' in cur_content[:10000]:
    line_sep = '\r\n'
    cur_lines = cur_content.split('\r\n')
else:
    line_sep = '\n'
    cur_lines = cur_content.split('\n')

print(f"Current lines: {len(cur_lines)}")

# Replacements (bottom up to preserve indices)
# 1. Art Studio (Current: 39860 - 42598) with (Old: 68775 - 75799)
cur_art_s, cur_art_e = 39860, 42598
old_art_s, old_art_e = 68775, 75799
art_section = old_lines[old_art_s:old_art_e + 1]

print(f"Replacing Art Studio (cur: {cur_art_e - cur_art_s + 1}) with old ({old_art_e - old_art_s + 1})")
cur_lines[cur_art_s:cur_art_e + 1] = art_section

# 2. Titration Lab (Current: 15304 - 15649) with (Old: 108644 - 109736)
cur_titr_s, cur_titr_e = 15304, 15649
old_titr_s, old_titr_e = 108644, 109736
titr_section = old_lines[old_titr_s:old_titr_e + 1]

print(f"Replacing Titration Lab (cur: {cur_titr_e - cur_titr_s + 1}) with old ({old_titr_e - old_titr_s + 1})")
cur_lines[cur_titr_s:cur_titr_e + 1] = titr_section

print(f"Final lines: {len(cur_lines)}")

with open('stem_lab_module.js', 'w', encoding='utf-8', newline='') as f:
    f.write(line_sep.join(cur_lines))
