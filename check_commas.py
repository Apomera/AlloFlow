with open('stem_lab/stem_lab_module.js', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()
with open('tmp_comma_check.txt', 'w', encoding='utf-8') as out_f:
    for i, l in enumerate(lines):
        if "/* base10" in l or "stemLabTool === 'physics'" in l:
            out_f.write(f"--- MATCH AT LINE {i+1} ---\n")
            for j in range(max(0, i-6), min(len(lines), i+6)):
                out_f.write(f"{j+1}: {lines[j]}")
