import subprocess
out = subprocess.run(['node', '-c', 'stem_lab/stem_lab_module.js'], capture_output=True, text=True, encoding='utf-8')
with open('tmp_syntax_out.txt', 'w', encoding='utf-8') as f:
    f.write(out.stdout)
    f.write(out.stderr)
