import os

missing_files = [
    'LICENSE', 'README.md', 'allobot.png', 'allobot.svg', 'audio_bank.json',
    'calculator.html', 'examples/civil_war.json', 'examples/photosynthesis.json',
    'examples/readme.md', 'features.html', 'help_strings.js', 'index.html',
    'library.html', 'profile-image.jpg', 'rainbow-book.jpg', 'shared.css',
    'src/App.jsx', 'ui_strings.js',
    'word_audio_bank_part1.json', 'word_audio_bank_part2.json', 
    'word_audio_bank_part3.json', 'word_audio_bank_part4.json',
]

base = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'

local_exists = []
need_download = []

for f in missing_files:
    full = os.path.join(base, f.replace('/', os.sep))
    if os.path.exists(full):
        size = os.path.getsize(full)
        local_exists.append((f, size))
    else:
        need_download.append(f)

print(f"EXIST LOCALLY ({len(local_exists)}) — can just git add + push:")
for f, size in local_exists:
    print(f"  ✓ {f} ({size:,} bytes)")

print(f"\nNOT LOCAL ({len(need_download)}) — need to download from old commit:")
for f in need_download:
    print(f"  ✗ {f}")
