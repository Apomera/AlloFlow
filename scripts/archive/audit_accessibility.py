"""
Comprehensive accessibility audit of AlloFlowANTI.txt.

Checks:
1. ARIA attributes (aria-label, aria-labelledby, aria-describedby, role, aria-live)
2. Interactive elements without labels (buttons, inputs)
3. Images without alt text
4. Keyboard handlers (onKeyDown, tabIndex)
5. Focus management (focus(), autoFocus, focus-visible, focus-within)
6. Color contrast awareness (contrast-related CSS)
7. Skip navigation / landmarks
8. Heading hierarchy (h1-h6)
9. Button elements vs clickable divs/spans
10. Form labels
"""
import re
from collections import Counter

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

out = []

# ============================================================
# 1. ARIA ATTRIBUTE COVERAGE
# ============================================================
out.append("=" * 70)
out.append("1. ARIA ATTRIBUTE COVERAGE")
out.append("=" * 70)

aria_attrs = {
    'aria-label': content.count('aria-label='),
    'aria-labelledby': content.count('aria-labelledby='),
    'aria-describedby': content.count('aria-describedby='),
    'aria-live': content.count('aria-live='),
    'aria-hidden': content.count('aria-hidden='),
    'aria-expanded': content.count('aria-expanded='),
    'aria-pressed': content.count('aria-pressed='),
    'aria-checked': content.count('aria-checked='),
    'aria-disabled': content.count('aria-disabled='),
    'aria-selected': content.count('aria-selected='),
    'aria-current': content.count('aria-current='),
    'aria-modal': content.count('aria-modal='),
    'aria-required': content.count('aria-required='),
    'aria-invalid': content.count('aria-invalid='),
    'aria-busy': content.count('aria-busy='),
    'aria-valuemin': content.count('aria-valuemin='),
    'aria-valuemax': content.count('aria-valuemax='),
    'aria-valuenow': content.count('aria-valuenow='),
    'role=': content.count('role='),
}

for k, v in sorted(aria_attrs.items(), key=lambda x: -x[1]):
    status = "✅" if v > 0 else "❌"
    out.append(f"  {status} {k}: {v}")

# ============================================================
# 2. INTERACTIVE ELEMENTS WITHOUT LABELS
# ============================================================
out.append("\n" + "=" * 70)
out.append("2. INTERACTIVE ELEMENTS ANALYSIS")
out.append("=" * 70)

# Count buttons
total_buttons = content.count('<button')
buttons_with_aria = 0
buttons_with_text_fallback = 0
icon_only_buttons = []

for i, line in enumerate(lines):
    if '<button' in line:
        # Check this line and next 5 for aria-label
        block = '\n'.join(lines[i:min(i+6, len(lines))])
        has_aria = 'aria-label' in block
        if has_aria:
            buttons_with_aria += 1

out.append(f"  Total <button>: {total_buttons}")
out.append(f"  With aria-label: {buttons_with_aria}")
out.append(f"  Without aria-label: {total_buttons - buttons_with_aria}")

# Count inputs
total_inputs = content.count('<input')
inputs_with_label = 0
for i, line in enumerate(lines):
    if '<input' in line:
        block = '\n'.join(lines[max(0, i-3):min(i+5, len(lines))])
        if 'aria-label' in block or '<label' in block or 'id=' in line:
            inputs_with_label += 1

out.append(f"\n  Total <input>: {total_inputs}")
out.append(f"  With aria-label or <label>: {inputs_with_label}")
out.append(f"  Without label: {total_inputs - inputs_with_label}")

# Count textareas
total_textarea = content.count('<textarea')
out.append(f"\n  Total <textarea>: {total_textarea}")

# ============================================================
# 3. IMAGES WITHOUT ALT TEXT
# ============================================================
out.append("\n" + "=" * 70)
out.append("3. IMAGE ALT TEXT COVERAGE")
out.append("=" * 70)

total_imgs = content.count('<img')
imgs_with_alt = 0
imgs_empty_alt = 0
imgs_no_alt = 0

for i, line in enumerate(lines):
    if '<img' in line:
        block = '\n'.join(lines[i:min(i+5, len(lines))])
        if 'alt=' in block:
            imgs_with_alt += 1
            if 'alt=""' in block or "alt=''" in block:
                imgs_empty_alt += 1
        else:
            imgs_no_alt += 1

out.append(f"  Total <img>: {total_imgs}")
out.append(f"  With alt text: {imgs_with_alt}")
out.append(f"  With empty alt (decorative): {imgs_empty_alt}")
out.append(f"  Missing alt: {imgs_no_alt}")

# ============================================================
# 4. KEYBOARD NAVIGATION
# ============================================================
out.append("\n" + "=" * 70)
out.append("4. KEYBOARD NAVIGATION")
out.append("=" * 70)

out.append(f"  onKeyDown handlers: {content.count('onKeyDown=')}")
out.append(f"  onKeyUp handlers: {content.count('onKeyUp=')}")
out.append(f"  onKeyPress handlers: {content.count('onKeyPress=')}")
out.append(f"  tabIndex: {content.count('tabIndex=')}")

# Clickable divs without keyboard handlers (a11y anti-pattern)
clickable_divs = 0
for i, line in enumerate(lines):
    if '<div' in line and 'onClick=' in line:
        block = '\n'.join(lines[i:min(i+3, len(lines))])
        if 'onKeyDown' not in block and 'onKeyUp' not in block and 'role=' not in block:
            clickable_divs += 1

out.append(f"\n  ⚠️  Clickable <div> without keyboard handler or role: {clickable_divs}")

# Clickable spans
clickable_spans = 0
for i, line in enumerate(lines):
    if '<span' in line and 'onClick=' in line:
        block = '\n'.join(lines[i:min(i+3, len(lines))])
        if 'onKeyDown' not in block and 'role=' not in block:
            clickable_spans += 1

out.append(f"  ⚠️  Clickable <span> without keyboard handler or role: {clickable_spans}")

# ============================================================
# 5. FOCUS MANAGEMENT
# ============================================================
out.append("\n" + "=" * 70)
out.append("5. FOCUS MANAGEMENT")
out.append("=" * 70)

out.append(f"  .focus() calls: {content.count('.focus(')}")
out.append(f"  autoFocus: {content.count('autoFocus')}")
out.append(f"  focus-visible in CSS: {content.count('focus-visible')}")
out.append(f"  focus-within in CSS: {content.count('focus-within')}")
out.append(f"  outline-none: {content.count('outline-none')}")
out.append(f"  focus:ring: {content.count('focus:ring')}")
out.append(f"  focus:outline: {content.count('focus:outline')}")

# ============================================================
# 6. SEMANTIC HTML
# ============================================================
out.append("\n" + "=" * 70)
out.append("6. SEMANTIC HTML & LANDMARKS")
out.append("=" * 70)

semantic_elements = {
    '<nav': content.count('<nav'),
    '<main': content.count('<main'),
    '<header': content.count('<header'),
    '<footer': content.count('<footer'),
    '<aside': content.count('<aside'),
    '<section': content.count('<section'),
    '<article': content.count('<article'),
    '<figure': content.count('<figure'),
    '<figcaption': content.count('<figcaption'),
    '<details': content.count('<details'),
    '<summary': content.count('<summary'),
}

for k, v in sorted(semantic_elements.items(), key=lambda x: -x[1]):
    status = "✅" if v > 0 else "❌"
    out.append(f"  {status} {k}: {v}")

# ============================================================
# 7. HEADING HIERARCHY
# ============================================================
out.append("\n" + "=" * 70)
out.append("7. HEADING HIERARCHY")
out.append("=" * 70)

for level in range(1, 7):
    count = len(re.findall(rf'<h{level}[\s>]', content))
    out.append(f"  <h{level}>: {count}")

# ============================================================
# 8. COLOR CONTRAST & VISUAL ACCESSIBILITY
# ============================================================
out.append("\n" + "=" * 70)
out.append("8. COLOR CONTRAST & VISUAL ACCESSIBILITY")
out.append("=" * 70)

sr_only_count = content.count('sr-only')
not_sr_only_count = content.count('not-sr-only')
contrast_theme_count = content.count("theme === 'contrast'")
high_contrast_count = content.count('high-contrast')
reduced_motion_count = content.count('reduced-motion')
out.append(f"  'sr-only' (screen reader only): {sr_only_count}")
out.append(f"  'not-sr-only': {not_sr_only_count}")
out.append(f"  'contrast' theme references: {contrast_theme_count}")
out.append(f"  'high-contrast' mentions: {high_contrast_count}")
out.append(f"  'reduced-motion' / prefers-reduced-motion: {reduced_motion_count}")

# ============================================================
# 9. LIVE REGIONS
# ============================================================
out.append("\n" + "=" * 70)
out.append("9. LIVE REGIONS & ANNOUNCEMENTS")
out.append("=" * 70)

live_polite = content.count("aria-live='polite'") + content.count('aria-live="polite"')
live_assertive = content.count("aria-live='assertive'") + content.count('aria-live="assertive"')
role_alert = content.count("role='alert'") + content.count('role="alert"')
role_status = content.count("role='status'") + content.count('role="status"')
out.append(f"  aria-live='polite': {live_polite}")
out.append(f"  aria-live='assertive': {live_assertive}")
out.append(f"  role='alert': {role_alert}")
out.append(f"  role='status': {role_status}")

# ============================================================
# 10. ANTI-PATTERNS
# ============================================================
out.append("\n" + "=" * 70)
out.append("10. ACCESSIBILITY ANTI-PATTERNS")
out.append("=" * 70)

# Generic aria-label="Refresh" or aria-label="Text input" (lazy placeholder labels)
generic_labels = []
for i, line in enumerate(lines):
    match = re.search(r'aria-label="([^"]+)"', line)
    if match:
        label = match.group(1)
        if label in ['Refresh', 'Text input', 'Button', 'Link', 'Icon', 'Close', 'Input']:
            generic_labels.append(f"  L{i+1}: aria-label=\"{label}\" — {line.strip()[:80]}")

out.append(f"\n  Generic/placeholder aria-labels: {len(generic_labels)}")
for gl in generic_labels[:15]:
    out.append(gl)
if len(generic_labels) > 15:
    out.append(f"  ... and {len(generic_labels)-15} more")

# tabIndex=-1 on visible elements
tab_neg = content.count('tabIndex={-1}') + content.count('tabIndex="-1"')
out.append(f"\n  tabIndex=-1 (removed from tab order): {tab_neg}")

# Empty buttons (icon-only without aria-label)
out.append(f"  outline-none without focus replacement: checking...")
outline_none_count = 0
for i, line in enumerate(lines):
    if 'outline-none' in line and 'focus:' not in line and 'focus-' not in line:
        outline_none_count += 1
out.append(f"  outline-none WITHOUT focus style replacement: {outline_none_count}")

with open('_accessibility_audit.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))

print(f"Written to _accessibility_audit.txt")
print(f"\nQUICK SUMMARY:")
print(f"  Buttons without aria-label: {total_buttons - buttons_with_aria}")
print(f"  Inputs without label: {total_inputs - inputs_with_label}")
print(f"  Images without alt: {imgs_no_alt}")
print(f"  Clickable divs without keyboard: {clickable_divs}")
print(f"  Generic aria-labels: {len(generic_labels)}")
