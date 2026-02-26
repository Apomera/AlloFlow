"""Write results to file"""
FILES = ['AlloFlowANTI.txt', 'Phoneme app.txt']
out = open('_goal_in_both.txt', 'w', encoding='utf-8')

for f_name in FILES:
    try:
        f = open(f_name, 'r', encoding='utf-8-sig')
        lines = f.readlines()
        f.close()
        out.write(f"=== {f_name} ({len(lines)} lines) ===\n")
        count = 0
        for i, line in enumerate(lines):
            if 'wordSoundsSessionGoal' in line:
                out.write(f"  L{i+1}: {line.strip()[:180]}\n")
                count += 1
        out.write(f"  Total: {count} references\n\n")
    except Exception as e:
        out.write(f"  Cannot read {f_name}: {e}\n\n")

out.close()
print("Done -> _goal_in_both.txt")
