import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('phase4_ws_hooks.json', 'r', encoding='utf-8') as f:
    hooks = json.load(f)

print(f"Total Word Sounds hooks: {len(hooks)}\n")
for h in hooks:
    init = h['init'][:50]
    print(f"L{h['line']}: const [{h['var']}, {h['setter']}] = useState({init})")
