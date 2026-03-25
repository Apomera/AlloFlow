import subprocess
for f in ['stem_tool_creative.js']:
    res = subprocess.run(['node', '-c', f'stem_lab/{f}'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if res.returncode != 0:
        with open('last_err.txt', 'w', encoding='utf-8') as out:
            out.write(res.stderr)
