"""Run the audit and save to UTF-8 file"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

out = []

# Find all ErrorBoundary-wrapped components
eb_wraps = re.findall(r'<ErrorBoundary\s+fallbackMessage=["\'{]([^"\'}\r\n]+)', content)
out.append(f"WRAPPED ({len(eb_wraps)}):")
for msg in eb_wraps:
    out.append(f"  + {msg[:80]}")

# Find all major component definitions (React.memo)
components = re.finditer(r'^const (\w+) = React\.memo\(', content, re.MULTILINE)
comp_list = [(m.group(1), m.start()) for m in components]
out.append(f"\nCOMPONENTS ({len(comp_list)}):")

not_wrapped = []
for name, pos in comp_list:
    usage_pattern = f'<{name}[\\s>/]'
    usages = list(re.finditer(usage_pattern, content))
    
    wrapped = False
    for usage in usages:
        start = max(0, usage.start() - 3000)
        before = content[start:usage.start()]
        if '<ErrorBoundary' in before:
            last_eb_open = before.rfind('<ErrorBoundary')
            last_eb_close = before.rfind('</ErrorBoundary>')
            if last_eb_open > last_eb_close:
                wrapped = True
                break
    
    line_num = content[:pos].count('\n') + 1
    if not wrapped:
        not_wrapped.append((name, line_num))

for name, ln in not_wrapped:
    out.append(f"  NO EB: {name} (L{ln})")

result = '\n'.join(out)
with open('scripts/archive/eb_audit_result.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print(result)
