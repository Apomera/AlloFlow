import urllib.request, json

url = 'https://api.github.com/repos/Apomera/AlloFlow/commits/main'
req = urllib.request.Request(url, headers={'User-Agent': 'AlloFlow'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read().decode('utf-8'))
sha = data['sha']
print(f'Latest commit on main: {sha}')
print(f'Short: {sha[:7]}')
msg = data.get('commit', {}).get('message', 'N/A')
print(f'Message: {msg[:80]}')

# Verify the CDN works with the commit hash
for name in ['stem_lab_module.js', 'word_sounds_module.js']:
    test_url = f'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@{sha}/{name}'
    try:
        test_resp = urllib.request.urlopen(test_url)
        test_data = test_resp.read().decode('utf-8')
        has_guard = 'already loaded' in test_data
        has_iife = test_data.startswith('(function')
        has_jsx = '<div className=' in test_data
        print(f'\n{name} via @{sha[:7]}:')
        print(f'  Size: {len(test_data):,}, IIFE: {has_iife}, Guard: {has_guard}, Raw JSX: {has_jsx}')
    except Exception as e:
        print(f'\n{name} via @{sha[:7]}: ERROR - {e}')
