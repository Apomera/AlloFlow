"""Fix malformed prefetchNextWords closing — missing ) before }"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find the malformed line (L5332-5333):
#   L5332: "        }"
#   L5333: "    }, [preloadedWords, ..."
# Should be:
#   L5329-5333: just "}, [deps]);" on one line after "return;"

fixed = False
for i in range(5325, 5340):
    if i >= len(lines):
        break
    if 'return;' in lines[i] and 'DISABLED' in lines[i-1]:
        # Next line should be the closing
        next_line = lines[i+1].rstrip()
        deps_line = lines[i+2].rstrip()
        if next_line.endswith('}') and '}, [' in deps_line:
            # Merge the two lines: "        }" + "    }, [deps]);"  ->  "        }, [deps]);"
            merged = lines[i+1].rstrip('\r\n').rstrip() + deps_line.strip()[1:] + le  # Remove leading } from deps line and join
            # Actually, we need: "        }, [deps]);"
            # Current: L5332 = "        }\r\n" and L5333 = "    }, [deps...]);\r\n"
            # We want to replace both with just the deps line but with proper closing
            new_line = '        }, [preloadedWords, isPrefetching, currentWordSoundsWord, wordSoundsActivity, fetchWordData, getDifficultyFilteredPool]);' + le
            lines[i+1] = new_line
            del lines[i+2]
            fixed = True
            print(f"Fixed L{i+2}: merged closing brace with deps array")
            break

if fixed:
    f = open(FILE, 'w', encoding='utf-8')
    f.write(''.join(lines))
    f.close()
    print(f"✅ Build error fixed. Total lines: {len(lines)}")
else:
    print("Could not find the malformed line")
    # Show context
    for i in range(5328, 5336):
        print(f"  L{i+1}: {lines[i].rstrip()[:120]}")
