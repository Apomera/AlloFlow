"""Fix L51631: }});  should be });  (it's a .map() closing, not a dispatch)"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

# Find the specific line: displayLetters line followed by }; then }});
for i in range(51625, 51640):
    if i < len(lines) and 'displayLetters' in lines[i]:
        # Next line should be };
        # Line after should be }});  -> change to });
        target = i + 2
        if target < len(lines) and lines[target].strip() == '}});':
            old = lines[target]
            lines[target] = old.replace('}});', '});', 1)
            print("Fixed L" + str(target+1) + ": }});  ->  });")
            break

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Done")
