import sys

with open('stem_lab_module.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

old_line = '        className: "w-full max-w-[98vw] m-2 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" + (_reduceMotion ? "" : " animate-in zoom-in-95 duration-300")\n'
new_line = '        className: "w-full max-h-[96vh] max-w-[98vw] m-2 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" + (_reduceMotion ? "" : " animate-in zoom-in-95 duration-300")\n'

for i in range(1620, 1635):
    if lines[i] == old_line:
        lines[i] = new_line
        print(f"Replaced exactly at line {i+1}.")
        break
else:
    print("WARNING: Could not find exact line to replace.")

with open('stem_lab_module.js', 'w', encoding='utf-8', newline='') as f:
    f.writelines(lines)

print("Replacement complete.")
