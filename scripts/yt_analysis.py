import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = {}

patterns = {
    'youtube': r'youtu',
    'url_import': r'(importfromurl|importurl|fetchurl|urlimport|loadurl|extractfromurl|urlextract|scrapeurl)',
    'source_text_state': r'(sourceText|setSourceText|sourceContent|setSourceContent)',
    'url_input': r'(urlInput|setUrlInput|urlValue|importUrl)',
    'generateContent': r'generateContent',
    'gemini_api': r'(generativelanguage\.googleapis|gemini.*api)',
    'paste_event': r'onPaste|handlePaste',
    'url_regex': r'(https?://|isValidUrl|isUrl|urlRegex|urlPattern)',
}

for name, pattern in patterns.items():
    results[name] = []
    for i, line in enumerate(lines, 1):
        if re.search(pattern, line, re.IGNORECASE):
            results[name].append(f'L{i}: {line.rstrip()[:140]}')

with open('_yt_analysis.md', 'w', encoding='utf-8') as f:
    for name, hits in results.items():
        f.write(f'\n## {name} ({len(hits)} hits)\n')
        for h in hits[:15]:
            f.write(f'  {h}\n')
        if len(hits) > 15:
            f.write(f'  ... and {len(hits)-15} more\n')

print('Done')
for name, hits in results.items():
    print(f'{name}: {len(hits)} hits')
