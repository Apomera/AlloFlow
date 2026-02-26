"""Fix L52080: Rewrite the timer interval to use FUNC_UPDATE for the countdown"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'

# Find the broken line
target = None
for i in range(52075, 52085):
    if i < len(lines) and 'SET_TIME_LEFT' in lines[i] and 'prevTime' in lines[i]:
        target = i
        break

if target is None:
    print("ERROR: Could not find broken line")
    exit(1)

# Find the end of this block (the closing });  of setInterval callback)
# L52080: dispatchEscape({type: 'SET_TIME_LEFT', value: (prevTime}) => {
# L52081:   const newTime = prevTime - 1;
# L52082-87: warning toasts  
# L52088:   return newTime;
# L52089: });
block_end = None
for i in range(target, target + 15):
    if i < len(lines) and lines[i].strip() == '});':
        block_end = i
        break

print("Replacing L" + str(target+1) + " to L" + str(block_end+1))

# Replace with FUNC_UPDATE that decrements timeLeft
new_block = [
    '        dispatchEscape({type: \'FUNC_UPDATE\', updater: (prev) => {' + le,
    '          const newTime = prev.timeLeft - 1;' + le,
    '          // Time warnings' + le,
    '          if (newTime === 60) {' + le,
    '            addToast(t(\'escape_room.one_minute_warning\'), \'warning\');' + le,
    '          } else if (newTime === 30) {' + le,
    '            addToast(t(\'escape_room.thirty_seconds_warning\'), \'error\');' + le,
    '          }' + le,
    '          return { ...prev, timeLeft: newTime };' + le,
    '        }});' + le,
]

lines[target:block_end + 1] = new_block
print("Replaced with " + str(len(new_block)) + " lines")

f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()
print("Done. Lines: " + str(len(lines)))
