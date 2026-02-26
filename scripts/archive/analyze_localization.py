"""
Pass 7: Localization Gap Analysis
Scan for hardcoded English strings that should be in UI_STRINGS/t()
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

results = []

# === 1: Find UI_STRINGS block boundaries ===
results.append("=" * 70)
results.append("ANALYSIS 1: UI_STRINGS Block")
results.append("=" * 70)

ui_strings_start = None
ui_strings_end = None
for i, line in enumerate(lines, 1):
    if 'const UI_STRINGS' in line or 'UI_STRINGS = {' in line:
        ui_strings_start = i
    if ui_strings_start and not ui_strings_end and line.strip() == '};' and i > ui_strings_start + 100:
        ui_strings_end = i
        break

results.append(f"UI_STRINGS block: L{ui_strings_start} to L{ui_strings_end} ({ui_strings_end - ui_strings_start} lines)")

# === 2: Count t() function usage ===
t_calls = sum(1 for l in lines if "t('" in l or 't("' in l or "t(`" in l)
ts_calls = sum(1 for l in lines if "ts('" in l or 'ts("' in l or "ts(`" in l)
results.append(f"\nt() calls: {t_calls}")
results.append(f"ts() calls: {ts_calls}")

# === 3: Find hardcoded English strings in JSX (outside UI_STRINGS) ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 2: Hardcoded Strings in JSX (outside UI_STRINGS)")
results.append("=" * 70)

# Patterns that suggest hardcoded user-facing strings in JSX
# Look for: >Some English Text< or title="..." or aria-label="..." or placeholder="..."
hardcoded = []
skip_patterns = [
    'className=', 'style=', 'key=', 'id=', 'data-', 'onClick', 'onChange',
    'onSubmit', 'onKeyDown', 'onMouseDown', 'src=', 'href=', 'ref=',
    'import ', 'export ', 'const ', 'let ', 'var ', 'function ', 'return ',
    '//', '/*', 'console.', 'warnLog', 'debugLog', 'addToast(t(',
    'type=', 'name=', 'value=', 'htmlFor=', 'xmlns=', 'viewBox=',
    'fill=', 'stroke=', 'd=', 'r=', 'cx=', 'cy=', 'x=', 'y=',
    'width=', 'height=', 'rx=', 'ry=', 'transform=',
]

for i, line in enumerate(lines, 1):
    # Skip UI_STRINGS block
    if ui_strings_start and ui_strings_end and ui_strings_start <= i <= ui_strings_end:
        continue
    
    stripped = line.strip()
    
    # Skip comments, imports, non-JSX lines
    if any(stripped.startswith(p) for p in ['//', '/*', '*', 'import ', 'export ', 'const UI_STRINGS']):
        continue
    
    # Look for addToast with hardcoded strings (not using t())
    toast_match = re.search(r'addToast\(\s*["\']([^"\']{10,})', stripped)
    if toast_match and "t('" not in stripped and 't("' not in stripped:
        hardcoded.append((i, 'TOAST', toast_match.group(1)[:60]))
        continue
    
    # Look for title="English text" (not using t())
    title_match = re.search(r'title=["\']([A-Z][a-z][^"\']{5,})', stripped)
    if title_match and '{t(' not in stripped:
        hardcoded.append((i, 'TITLE', title_match.group(1)[:60]))
        continue
    
    # Look for aria-label="English text" (not using t())  
    aria_match = re.search(r'aria-label=["\']([A-Z][a-z][^"\']{5,})', stripped)
    if aria_match and '{t(' not in stripped:
        hardcoded.append((i, 'ARIA', aria_match.group(1)[:60]))
        continue
    
    # Look for placeholder="English text" (not using t())
    ph_match = re.search(r'placeholder=["\']([A-Z][a-z][^"\']{5,})', stripped)
    if ph_match and '{t(' not in stripped:
        hardcoded.append((i, 'PLACEHOLDER', ph_match.group(1)[:60]))
        continue

results.append(f"Hardcoded strings found: {len(hardcoded)}")
for ln, typ, text in hardcoded[:60]:
    results.append(f"  L{ln} [{typ}]: {text}")

# === 4: Hardcoded addToast messages ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 3: addToast Usage")
results.append("=" * 70)

toast_total = sum(1 for l in lines if 'addToast(' in l)
toast_localized = sum(1 for l in lines if 'addToast(' in l and ("t('" in l or 't("' in l))
toast_hardcoded = toast_total - toast_localized
results.append(f"Total addToast calls: {toast_total}")
results.append(f"Using t(): {toast_localized}")
results.append(f"Hardcoded: {toast_hardcoded}")

# Show hardcoded toasts
results.append("\nHardcoded toast messages:")
for i, line in enumerate(lines, 1):
    if 'addToast(' in line and "t('" not in line and 't("' not in line:
        stripped = line.strip()[:120]
        if not stripped.startswith('//'):
            results.append(f"  L{i}: {stripped}")

# === 5: Button text without t() ===
results.append("")
results.append("=" * 70)
results.append("ANALYSIS 4: Inline Button/Label Text")
results.append("=" * 70)

# Count buttons with literal text children
button_text = 0
button_localized = 0
for i, line in enumerate(lines, 1):
    if ui_strings_start and ui_strings_end and ui_strings_start <= i <= ui_strings_end:
        continue
    if re.search(r'>\s*[A-Z][a-z]+\s*([\w\s]+)?\s*</button>', line):
        if '{t(' not in line:
            button_text += 1
        else:
            button_localized += 1

results.append(f"Buttons with literal text (no t()): {button_text}")
results.append(f"Buttons using t(): {button_localized}")

with open('pass7_results.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print(f"Results written to pass7_results.txt ({len(results)} lines)")
