import urllib.request, json

old_sha = '2f4da352f722de8468e54e44097286e91a065dc5'

# Get old commit tree
url = f'https://api.github.com/repos/Apomera/AlloFlow/git/trees/{old_sha}?recursive=1'
req = urllib.request.Request(url, headers={'User-Agent': 'AlloFlow'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read().decode('utf-8'))
old_files = {item['path']: item.get('size', 0) for item in data.get('tree', []) if item['type'] == 'blob'}

# Get current tree
url2 = 'https://api.github.com/repos/Apomera/AlloFlow/git/trees/main?recursive=1'
req2 = urllib.request.Request(url2, headers={'User-Agent': 'AlloFlow'})
resp2 = urllib.request.urlopen(req2)
data2 = json.loads(resp2.read().decode('utf-8'))
current_files = {item['path']: item.get('size', 0) for item in data2.get('tree', []) if item['type'] == 'blob'}

missing = set(old_files.keys()) - set(current_files.keys())

# Write results to a file
with open(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\scripts\missing_files_report.txt', 'w') as out:
    out.write(f"Old commit {old_sha[:7]} had {len(old_files)} files\n")
    out.write(f"Current main has {len(current_files)} files\n")
    out.write(f"Missing files: {len(missing)}\n\n")
    for f in sorted(missing):
        out.write(f"  {f} ({old_files[f]:,} bytes)\n")
    out.write(f"\nCurrent files:\n")
    for f in sorted(current_files.keys()):
        out.write(f"  {f}\n")

print(f"Old: {len(old_files)} files, Current: {len(current_files)} files, Missing: {len(missing)}")
for f in sorted(missing):
    print(f"  MISSING: {f} ({old_files[f]:,} bytes)")
