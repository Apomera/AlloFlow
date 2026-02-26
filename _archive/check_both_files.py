"""Check if wordSoundsSessionGoal is in Phoneme app.txt
The error says AlloFlowContent at blob L78195 - this could be from Phoneme app.txt"""
FILES = ['AlloFlowANTI.txt', 'Phoneme app.txt']

for f_name in FILES:
    try:
        f = open(f_name, 'r', encoding='utf-8-sig')
        lines = f.readlines()
        f.close()
        print(f"\n=== {f_name} ({len(lines)} lines) ===")
        for i, line in enumerate(lines):
            if 'wordSoundsSessionGoal' in line:
                print(f"  L{i+1}: {line.strip()[:150]}")
    except:
        print(f"  Cannot read {f_name}")
