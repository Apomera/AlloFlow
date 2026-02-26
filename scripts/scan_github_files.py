import os

base = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'

# Files that should be on GitHub (from user's list)
expected_files = [
    'LICENSE', 'README.md', 'allobot.png', 'allobot.svg',
    'audio_bank.json', 'calculator.html', 'features.html',
    'help_strings.js', 'index.html', 'library.html',
    'profile-image.jpg', 'psychometric_literacy_probes.json',
    'psychometric_math_probes.json', 'psychometric_probes.json',
    'rainbow-book.jpg', 'shared.css', 'stem_lab_module.js',
    'ui_strings.js', 'word_audio_bank_part1.json',
    'word_audio_bank_part2.json', 'word_audio_bank_part3.json',
    'word_audio_bank_part4.json', 'word_sounds_module.js',
]

print("=== Root files ===")
for f in expected_files:
    path = os.path.join(base, f)
    if os.path.exists(path):
        size = os.path.getsize(path)
        mb = f'{size/1024/1024:.1f}MB' if size > 1024*1024 else f'{size/1024:.0f}KB'
        print(f'  OK  {mb:>8s}  {f}')
    else:
        # Search for it
        found = False
        for root, dirs, files in os.walk(base):
            if '.git' in root or 'node_modules' in root:
                continue
            if f in files:
                alt = os.path.join(root, f)
                size = os.path.getsize(alt)
                rel = os.path.relpath(alt, base)
                print(f'  FOUND AT  {rel} ({size:,} bytes)')
                found = True
                break
        if not found:
            print(f'  MISSING  {f}')

# Check svg/ folder
print("\n=== svg/ folder ===")
svg_path = os.path.join(base, 'svg')
if os.path.exists(svg_path):
    for f in os.listdir(svg_path):
        full = os.path.join(svg_path, f)
        size = os.path.getsize(full)
        mb = f'{size/1024/1024:.1f}MB' if size > 1024*1024 else f'{size/1024:.0f}KB'
        print(f'  {mb:>8s}  svg/{f}')
else:
    print('  NOT FOUND')

# Check examples/ folder
print("\n=== examples/ folder ===")
ex_path = os.path.join(base, 'examples')
if os.path.exists(ex_path):
    for f in os.listdir(ex_path):
        full = os.path.join(ex_path, f)
        if os.path.isfile(full):
            size = os.path.getsize(full)
            print(f'  {size:>10,} bytes  examples/{f}')
else:
    print('  NOT FOUND')
