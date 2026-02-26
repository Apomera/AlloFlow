import re, os, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()
lines = text.split('\n')

out = []
out.append("STYLE_BLOCKS=" + str(sum(1 for l in lines if '<style' in l.lower())))

log_c = len(re.findall(r'console\.log', text))
warn_c = len(re.findall(r'console\.warn', text))
err_c = len(re.findall(r'console\.error', text))
out.append(f"CONSOLE_LOG={log_c}")
out.append(f"CONSOLE_WARN={warn_c}")
out.append(f"CONSOLE_ERROR={err_c}")

lucide = re.search(r"import \{([^}]+)\} from 'lucide-react'", text)
if lucide:
    icons = [x.strip() for x in lucide.group(1).split(',') if x.strip()]
    out.append(f"LUCIDE_ICONS={len(icons)}")

out.append(f"USE_REDUCER={len(re.findall(r'useReducer', text))}")

cm = re.search(r'function AlloFlowContent', text)
if cm:
    sl = text[cm.start():cm.start()+200000]
    out.append(f"USESTATE_IN_CONTENT={len(re.findall(r'useState[(]', sl))}")

tf = [f for f in os.listdir('.') if os.path.isfile(f) and f != 'AlloFlowANTI.txt' and (f.endswith('.py') or f.endswith('.ps1') or f.endswith('.txt'))]
out.append(f"TEMP_FILES={len(tf)}")

with open('phase3_data.txt', 'w', encoding='utf-8') as fout:
    fout.write('\n'.join(out))
print('\n'.join(out))
