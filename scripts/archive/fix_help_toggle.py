"""
Remove floating help button, re-insert inside the FAB conditional with a Fragment.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

print("Lines before:", len(lines))

# Step 1: Find and remove the button block
toggle_start = None
toggle_end = None
for i, l in enumerate(lines):
    if 'Floating Help Toggle' in l:
        toggle_start = i
        for j in range(i, i + 20):
            if '</button>' in lines[j]:
                toggle_end = j
                break
        break

if toggle_start is None or toggle_end is None:
    print("Button not found!")
    sys.exit(1)

print("Removing button from L%d to L%d" % (toggle_start+1, toggle_end+1))
del lines[toggle_start:toggle_end + 1]

# Step 2: Find the FAB conditional
zen_line = None
for i, l in enumerate(lines):
    if '!isZenMode' in l and '!showUDLGuide' in l and '&&' in l:
        zen_line = i
        print("Found conditional at L%d: %s" % (i+1, l.strip()[:100]))
        break

if zen_line is None:
    print("Conditional not found!")
    sys.exit(1)

# Step 3: Add Fragment opener <> after the (
# The line looks like: {!isZenMode && !showUDLGuide && (
old_line = lines[zen_line]
# Replace trailing ( with (<>
lines[zen_line] = old_line.rstrip().rstrip('\n').rstrip('\r') + '<>\n'
print("Added <> to end of conditional")

# Step 4: Insert button right after the conditional (before the <div)
button_lines = [
    '      {/* Floating Help Toggle */}\n',
    '      <button\n',
    '        data-help-ignore="true"\n',
    '        onClick={handleToggleIsHelpMode}\n',
    "        aria-label={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}\n",
    "        title={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}\n",
    '        className={`fixed left-3 top-1/2 -translate-y-1/2 z-[10999] w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-300 no-print ${\n',
    '          isHelpMode \n',
    "            ? 'bg-yellow-400 border-yellow-500 text-slate-900 scale-110 animate-pulse shadow-yellow-400/50' \n",
    "            : 'bg-white/60 border-slate-300/50 text-slate-400 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 hover:scale-110 hover:shadow-xl backdrop-blur-sm'\n",
    '        }`}\n',
    "        style={{ fontSize: '16px', fontWeight: 900, lineHeight: 1 }}\n",
    '      >\n',
    "        {isHelpMode ? <X size={16}/> : '?'}\n",
    '      </button>\n',
]

insert_point = zen_line + 1
for j, bl in enumerate(button_lines):
    lines.insert(insert_point + j, bl)

print("Inserted button (%d lines) at L%d" % (len(button_lines), insert_point + 1))

# Step 5: Find the closing )} for this conditional and add </> before it
depth = 0
close_line = None
for i in range(zen_line, min(len(lines), zen_line + 350)):
    for ch in lines[i]:
        if ch == '(' or ch == '<': 
            if ch == '(': depth += 1
        elif ch == ')':
            depth -= 1
    if depth <= 0 and i > zen_line + 15:
        close_line = i
        print("Closing at L%d: %s" % (i+1, lines[i].strip()[:100]))
        break

# Actually, let me just count ( and ) properly (not <)
depth = 0
close_line = None
for i in range(zen_line, min(len(lines), zen_line + 350)):
    for ch in lines[i]:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
    if depth <= 0 and i > zen_line + 15:
        close_line = i
        print("Paren-close at L%d: %s" % (i+1, lines[i].strip()[:100]))
        break

if close_line:
    # Insert </> before the )} line
    lines.insert(close_line, '      </>\n')
    print("Added </> before closing line")
else:
    print("WARNING: Could not find close")

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

# Fix double CRs
with open(FILE, 'rb') as f:
    raw = f.read()
dbl = raw.count(b'\r\r\n')
if dbl > 0:
    raw = raw.replace(b'\r\r\n', b'\r\n')
    with open(FILE, 'wb') as f:
        f.write(raw)
    print("Fixed %d double CRs" % dbl)

print("Lines after:", len(lines))
print("DONE")
