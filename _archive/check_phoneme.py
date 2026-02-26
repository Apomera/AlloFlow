"""Quick check: does Phoneme app.txt have the build error at line 5333?"""
FILE = 'Phoneme app.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

print(f"Phoneme app.txt: {len(lines)} lines")

# Show L5330-5336
print("\n=== L5330-5336 ===")
for i in range(5329, min(5336, len(lines))):
    print(f"L{i+1}: {lines[i].rstrip()[:140]}")

# Also check for prefetchNextWords
print("\n=== prefetchNextWords ===")
for i, line in enumerate(lines):
    if 'prefetchNextWords' in line and 'useCallback' in line:
        for j in range(i, min(len(lines), i+10)):
            print(f"L{j+1}: {lines[j].rstrip()[:140]}")
        break
