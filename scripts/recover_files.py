import urllib.request, os, json

old_sha = '2f4da352f722de8468e54e44097286e91a065dc5'
base = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated'

need_download = [
    'LICENSE', 'README.md', 'allobot.png', 'allobot.svg',
    'calculator.html', 'examples/civil_war.json', 'examples/photosynthesis.json',
    'examples/readme.md', 'features.html', 'help_strings.js', 'index.html',
    'library.html', 'profile-image.jpg', 'rainbow-book.jpg', 'shared.css',
    'src/App.jsx',
]

# Download each from the old commit via raw.githubusercontent.com
for f in need_download:
    url = f'https://raw.githubusercontent.com/Apomera/AlloFlow/{old_sha}/{f}'
    local_path = os.path.join(base, f.replace('/', os.sep))
    
    # Create directory if needed
    os.makedirs(os.path.dirname(local_path) if os.path.dirname(local_path) else '.', exist_ok=True)
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'AlloFlow'})
        resp = urllib.request.urlopen(req)
        data = resp.read()
        with open(local_path, 'wb') as out:
            out.write(data)
        print(f'  Downloaded {f} ({len(data):,} bytes)')
    except urllib.error.HTTPError as e:
        print(f'  FAILED {f}: {e.code} {e.reason}')
    except Exception as e:
        print(f'  ERROR {f}: {e}')

print('\nDone downloading!')
