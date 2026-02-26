import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt', 'r', encoding='utf-8').read()

# Check specific things that might be failing
items = {
    'Bridge Mode toolbar btn': 'Bridge Mode</button>',
    'help-key attr': 'data-help-key="bridge_send_button"',
    'send panel overlay class': 'bridge-send-overlay',
    'callGeminiImageEdit in bridge': 'callGeminiImageEdit',
}
for name, val in items.items():
    print("%s: %s (count: %d)" % ("PASS" if val in content else "FAIL", name, content.count(val)))

# Find what's actually in the toolbar button area
lines = content.split('\n')
for i, l in enumerate(lines):
    if 'Bridge Mode' in l and i > 56000:
        print("\nL%d: %s" % (i+1, l.rstrip()[:180]))
