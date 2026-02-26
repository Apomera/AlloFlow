import json, sys
sys.stdout.reconfigure(encoding='utf-8')
d = json.load(open('ws_a11y_audit.json', 'r', encoding='utf-8'))
for cat, items in d.items():
    print(f"{cat}: {len(items)} remaining")
    for item in items:
        print(f"  L{item['line']}: {item['code'][:80]}")
