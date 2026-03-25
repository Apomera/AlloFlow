import subprocess
for f in ['stem_lab_module.js', 'stem_tool_coding.js', 'stem_tool_creative.js']:
    res = subprocess.run(['node', '-c', f'stem_lab/{f}'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if res.returncode != 0:
        print(f"--- ERROR IN {f} ---")
        print(res.stderr)
        break
    else:
        print(f"{f} OK")
