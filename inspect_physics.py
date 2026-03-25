with open('stem_lab/stem_lab_module.js', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()
for i, l in enumerate(lines):
    if "stemLabTool === 'physics'" in l:
        print("MATCH AT LINE", i+1)
        for j in range(max(0, i-15), min(len(lines), i+10)):
            print(f"{j+1}: {lines[j]}", end="")
