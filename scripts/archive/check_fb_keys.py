import json

with open('audio_bank.json', 'r', encoding='utf-8') as f:
    bank = json.load(f)

print('Categories:', list(bank.keys()))
if 'instructions' in bank:
    fb_keys = sorted([k for k in bank['instructions'].keys() if k.startswith('fb_')])
    print(f'\nFeedback keys in audio_bank.json: {len(fb_keys)}')
    for k in fb_keys:
        val = bank['instructions'][k]
        print(f'  {k}: {len(val)} chars')
    
    needed = ['fb_on_fire', 'fb_excellent', 'fb_wow', 'fb_great_job', 'fb_nice', 
              'fb_keep_going', 'fb_way_to_go', 'fb_perfect', 'fb_super', 
              'fb_terrific', 'fb_correct', 'fb_you_got_it']
    print(f'\nKeys NEEDED by feedback system:')
    missing = []
    for k in needed:
        exists = k in bank.get('instructions', {})
        status = 'YES' if exists else 'MISSING'
        print(f'  {k}: {status}')
        if not exists:
            missing.append(k)
    
    print(f'\nMISSING KEYS: {missing if missing else "None - all present"}')
else:
    print('No instructions category found!')
