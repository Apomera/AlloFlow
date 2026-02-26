FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0

# Fix 1: Add timestamp at L10461 (0-indexed: 10460)
line_10461 = lines[10460]
if 'introFiredGlobal = true;' in line_10461 and 'window.__introFiredAt' not in line_10461:
    lines[10460] = line_10461.replace(
        'introFiredGlobal = true;',
        'introFiredGlobal = true; window.__introFiredAt = Date.now();'
    )
    changes += 1
    print(f'Fix 1 applied: L10461 timestamp added')
else:
    print(f'Fix 1 skipped: L10461 = {line_10461.strip()[:80]}')

# Fix 2: Add intro guard at L10487 (0-indexed: 10486)
line_10487 = lines[10486]
if 'if (isTalking || isSystemAudioActive)' in line_10487 and 'introFiredGlobal' not in line_10487:
    lines[10486] = line_10487.replace(
        'if (isTalking || isSystemAudioActive) {',
        'if (isTalking || isSystemAudioActive || (introFiredGlobal && Date.now() - (window.__introFiredAt || 0) < 8000)) {'
    )
    lines[10487] = lines[10487].replace(
        'debugLog("AlloBot: Skipping event tip, already talking.")',
        'debugLog("AlloBot: Skipping event tip, intro cooldown or already talking.")'
    )
    changes += 1
    print(f'Fix 2 applied: L10487 intro guard added')
else:
    print(f'Fix 2 skipped: L10487 = {line_10487.strip()[:80]}')

# Fix 3: Increase delay at L10618 (0-indexed: 10617)
line_10618 = lines[10617]
if '}, 2000);' in line_10618:
    lines[10617] = line_10618.replace('}, 2000);', '}, 5000);')
    changes += 1
    print(f'Fix 3 applied: L10618 delay 2s->5s')
else:
    print(f'Fix 3 skipped: L10618 = {line_10618.strip()[:80]}')

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'\nTotal changes: {changes}/3')
