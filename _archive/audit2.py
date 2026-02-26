filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
c = open(filepath, 'r', encoding='utf-8').read()

items = [
    ('adventureConsistentCharacters', 'adventureConsistentCharacters'),
    ('isReviewingCharacters', 'isReviewingCharacters'),
    ('handleRefineCharacter', 'handleRefineCharacter'),
    ('Cast of Characters UI', 'Cast of Characters'),
    ('chars JSON export', 'characters: adventureState.characters'),
    ('chars JSON import', 'characters: snapshot.characters'),
    ('Characters in scene imggen', 'Characters in scene:'),
    ('WS activeView header', "activeView === 'word-sounds'"),
    ('WS-gen activeView header', "activeView === 'word-sounds-generator'"),
    ('WS getDefaultTitle', "case 'word-sounds':"),
    ('WS clean remount', 'word-sounds detected'),
    ('currentActiveAudio ref', 'currentActiveAudio'),
    ('BAD else const storedAppearance', '} else const storedAppearance'),
    ('BAD ({hasSavedAdventure', '({hasSavedAdventure'),
]

out = open('audit_out.txt', 'w', encoding='utf-8')
out.write(f'Lines: {len(c.splitlines())}\n\n')
for name, pat in items:
    status = 'OK' if pat in c else 'MISS'
    out.write(f'{status}: {name}\n')
out.close()
print('Done - see audit_out.txt')
