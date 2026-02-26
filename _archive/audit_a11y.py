"""Full Word Sounds a11y audit - all issues, line-range filtered, written to JSON"""
import re, json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

total = len(lines)

def safe(s):
    return s.encode('ascii', 'replace').decode('ascii')[:140]

# Word Sounds lives in L1266-L30000 approximately
WS_START, WS_END = 1266, 30000

def in_ws(linenum):
    return WS_START <= linenum <= WS_END

results = {
    'img_no_alt': [],
    'icon_button_no_label': [],
    'clickable_div_no_keyboard': [],
    'input_no_label': [],
}

icon_patterns = ['<Play', '<Pause', '<Volume', '<X ', '<X/', '<Check ', '<RefreshCw',
    '<ChevronRight', '<ChevronLeft', '<ChevronDown', '<ChevronUp',
    '<Mic', '<Speaker', '<Eye', '<EyeOff', '<SkipForward', '<ArrowRight', 
    '<ArrowLeft', '<RotateCcw', '<Trash', '<Edit2', '<Copy', '<Download', 
    '<Plus ', '<Minus ', '<Settings', '<Info ', '<Star', '<Award',
    '<Send', '<Search', '<MoreVertical', '<Maximize', '<Minimize2']

for i, line in enumerate(lines):
    ln = i + 1
    if not in_ws(ln):
        continue
    
    # 1. IMG no alt
    if '<img' in line and 'alt=' not in line:
        results['img_no_alt'].append({'line': ln, 'code': safe(line.strip())})
    
    # 2. Icon-only buttons
    if '<button' in line and 'aria-label' not in line:
        ctx = ''.join(lines[i:min(i+6, total)])
        if any(p in ctx for p in icon_patterns):
            text_match = re.findall(r'>([A-Za-z]{3,})', ctx)
            if not text_match:
                results['icon_button_no_label'].append({'line': ln, 'code': safe(line.strip())})
    
    # 3. Clickable non-interactive
    if 'onClick={' in line and ('<div ' in line or '<span ' in line):
        ctx = ''.join(lines[max(0,i-1):min(i+3, total)])
        if 'role=' not in ctx and 'tabIndex' not in ctx:
            results['clickable_div_no_keyboard'].append({'line': ln, 'code': safe(line.strip())})
    
    # 4. Input/select no label
    if ('<input' in line or '<select' in line) and 'type="hidden"' not in line:
        ctx = ''.join(lines[max(0,i-3):min(i+3, total)])
        if 'aria-label' not in ctx and 'htmlFor=' not in ctx and 'aria-labelledby' not in ctx:
            results['input_no_label'].append({'line': ln, 'code': safe(line.strip())})

# Write results
with open('ws_a11y_audit.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print("=== WORD SOUNDS A11Y AUDIT (L1266-L30000) ===")
for cat, items in results.items():
    print(f"\n{cat}: {len(items)} issues")
    for item in items[:8]:
        print(f"  L{item['line']}: {item['code']}")
    if len(items) > 8:
        print(f"  ... and {len(items)-8} more")
