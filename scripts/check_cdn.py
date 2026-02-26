import urllib.request
import json

# Check what GitHub raw has vs what CDN has
print("=== GITHUB RAW (bypasses CDN cache) ===")
for name in ['stem_lab_module.js', 'word_sounds_module.js']:
    url = f'https://raw.githubusercontent.com/Apomera/AlloFlow/main/{name}'
    try:
        response = urllib.request.urlopen(url)
        data = response.read().decode('utf-8')
        lines = data.split('\n')
        has_guard = 'already loaded, skipping' in data
        has_iife = data.startswith('(function()')
        has_jsx = '<div className=' in data
        print(f'\n{name}: {len(data):,} bytes, {len(lines)} lines')
        print(f'  IIFE: {has_iife}, Guard: {has_guard}, Raw JSX: {has_jsx}')
        print(f'  Line 1: {lines[0][:80]}')
        print(f'  Line 2: {lines[1][:80]}')
        print(f'  Last 3 lines:')
        for i in range(max(0, len(lines)-3), len(lines)):
            print(f'    {i+1}: {lines[i][:80]}')
    except Exception as e:
        print(f'\n{name}: ERROR - {e}')

print("\n\n=== CDN (may be cached) ===")
for name in ['stem_lab_module.js', 'word_sounds_module.js']:
    url = f'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/{name}'
    try:
        response = urllib.request.urlopen(url)
        data = response.read().decode('utf-8')
        lines = data.split('\n')
        has_guard = 'already loaded, skipping' in data
        has_iife = data.startswith('(function()')
        has_jsx = '<div className=' in data
        print(f'\n{name}: {len(data):,} bytes, {len(lines)} lines')
        print(f'  IIFE: {has_iife}, Guard: {has_guard}, Raw JSX: {has_jsx}')
    except Exception as e:
        print(f'\n{name}: ERROR - {e}')

print("\n\n=== PURGING CDN CACHE ===")
for name in ['stem_lab_module.js', 'word_sounds_module.js']:
    try:
        url = f'https://purge.jsdelivr.net/gh/Apomera/AlloFlow@main/{name}'
        response = urllib.request.urlopen(url)
        result = response.read().decode('utf-8')
        print(f'{name}: {response.status} - {result[:100]}')
    except Exception as e:
        print(f'{name}: Purge error - {e}')
