"""Add Word Families localization keys."""
FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')

if 'word_sounds.word_families_label' in content:
    print('Keys already exist')
else:
    # Find a suitable anchor
    anchors = [
        "'word_sounds.blending_replay_sounds':",
        "'word_sounds.spelling_bee_hint_more':",
        "'word_sounds.session_msg_nice':",
        "'word_sounds.missing_letter_check':",
    ]
    pos = -1
    used_anchor = ''
    for a in anchors:
        pos = content.find(a)
        if pos > 0:
            used_anchor = a
            break
    if pos > 0:
        eol = content.find('\n', pos)
        new_keys = "\n".join([
            "",
            "    'word_sounds.word_families_label': 'Sound Match',",
            "    'word_sounds.word_families_instruction': 'Find all words that match the sound!',",
            "    'word_sounds.word_families_found': 'found',",
            "    'word_sounds.word_families_complete': 'Family Complete! \\u{1F389}',".replace('\\u{1F389}', '\U0001f389'),
            "    'word_sounds.word_families_wrong_hint': \"doesn't match the sound\",",
        ])
        content = content[:eol+1] + new_keys + '\n' + content[eol+1:]
        content = content.replace('\n', '\r\n')
        with open(FILE, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        print(f'Added 5 localization keys (anchor: {used_anchor[:40]})')
    else:
        print('WARNING: no suitable anchor found')
