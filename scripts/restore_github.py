import os, urllib.request, shutil, subprocess

base = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'
old_sha = '2f4da352f722de8468e54e44097286e91a065dc5'

# All files that should be on GitHub
github_files = [
    'LICENSE', 'README.md', 'allobot.png', 'allobot.svg',
    'audio_bank.json', 'calculator.html', 'features.html',
    'help_strings.js', 'index.html', 'library.html',
    'profile-image.jpg', 'psychometric_literacy_probes.json',
    'psychometric_math_probes.json', 'psychometric_probes.json',
    'rainbow-book.jpg', 'shared.css', 'stem_lab_module.js',
    'ui_strings.js', 'word_audio_bank_part1.json',
    'word_audio_bank_part2.json', 'word_audio_bank_part3.json',
    'word_audio_bank_part4.json', 'word_sounds_module.js',
    'examples/civil_war.json', 'examples/photosynthesis.json',
    'examples/readme.md',
]

# Step 1: Download any missing files from old commit
print("=== Step 1: Ensuring all files exist locally ===")
for f in github_files:
    local = os.path.join(base, f.replace('/', os.sep))
    if os.path.exists(local) and os.path.getsize(local) > 0:
        print(f'  EXISTS  {f} ({os.path.getsize(local):,} bytes)')
    else:
        # Try to download from old commit
        url = f'https://raw.githubusercontent.com/Apomera/AlloFlow/{old_sha}/{f}'
        os.makedirs(os.path.dirname(local) or '.', exist_ok=True)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'AlloFlow'})
            resp = urllib.request.urlopen(req)
            data = resp.read()
            with open(local, 'wb') as out:
                out.write(data)
            print(f'  DOWNLOADED  {f} ({len(data):,} bytes)')
        except Exception as e:
            print(f'  FAILED  {f}: {e}')

# Step 2: Create svg/ folder with current AlloFlowANTI.txt
print("\n=== Step 2: Setting up svg/ folder ===")
svg_dir = os.path.join(base, 'svg')
os.makedirs(svg_dir, exist_ok=True)
anti_src = os.path.join(base, 'AlloFlowANTI.txt')
anti_dst = os.path.join(svg_dir, 'AlloFlowANTI.txt')
if os.path.exists(anti_src):
    shutil.copy2(anti_src, anti_dst)
    print(f'  Copied AlloFlowANTI.txt to svg/ ({os.path.getsize(anti_dst):,} bytes)')
    github_files.append('svg/AlloFlowANTI.txt')
else:
    print(f'  AlloFlowANTI.txt not found at root!')

# Step 3: Git add all files
print("\n=== Step 3: Git add ===")
git_add_files = [f for f in github_files if os.path.exists(os.path.join(base, f.replace('/', os.sep)))]
print(f'  Adding {len(git_add_files)} files...')
# Add in batches to avoid command line length limits
batch_size = 5
for i in range(0, len(git_add_files), batch_size):
    batch = git_add_files[i:i+batch_size]
    result = subprocess.run(['git', 'add'] + batch, cwd=base, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'  ERROR adding batch: {result.stderr[:200]}')
    else:
        for f in batch:
            print(f'  Added {f}')

# Step 4: Commit
print("\n=== Step 4: Commit ===")
result = subprocess.run(
    ['git', '-c', 'user.name=AlloFlow', '-c', 'user.email=alloflow@build.local',
     'commit', '-m', 'Restore all GitHub files lost during force-push'],
    cwd=base, capture_output=True, text=True
)
print(result.stdout[:200] if result.stdout else result.stderr[:200])

# Step 5: Push
print("\n=== Step 5: Push ===")
result = subprocess.run(
    ['git', 'push', 'origin', 'master:main'],
    cwd=base, capture_output=True, text=True
)
print(result.stdout[:200] if result.stdout else '')
print(result.stderr[:200] if result.stderr else '')

print("\nDone!")
