"""Search for audio_input4 in broader locations"""
import os

locations = [
    os.path.expanduser("~"),
    os.path.expanduser("~/Downloads"),
    os.path.expanduser("~/OneDrive/Desktop"),
    os.path.expanduser("~/OneDrive/Desktop/UDL-Tool-Updated"),
    os.path.expanduser("~/Documents"),
]

out = open('_audio_search.txt', 'w', encoding='utf-8')
out.write("=== Searching for audio_input4 ===\n")

for loc in locations:
    if not os.path.exists(loc):
        continue
    out.write(f"\nSearching: {loc}\n")
    try:
        for item in os.listdir(loc):
            if 'audio_input' in item.lower() or 'input4' in item.lower():
                full = os.path.join(loc, item)
                size = os.path.getsize(full) if os.path.isfile(full) else 0
                out.write(f"  FOUND: {item} ({size} bytes)\n")
    except PermissionError:
        out.write(f"  (permission denied)\n")

# Also walk the UDL folder
udl = os.path.expanduser("~/OneDrive/Desktop/UDL-Tool-Updated")
out.write(f"\nRecursive search in: {udl}\n")
for root, dirs, files in os.walk(udl):
    # Skip node_modules, .git, etc
    dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next']]
    for fname in files:
        if 'audio' in fname.lower() and 'input' in fname.lower():
            full = os.path.join(root, fname)
            size = os.path.getsize(full)
            out.write(f"  FOUND: {full} ({size} bytes)\n")

out.close()
print("Done -> _audio_search.txt")
