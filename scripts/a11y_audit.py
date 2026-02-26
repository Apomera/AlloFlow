#!/usr/bin/env python3
"""Accessibility audit scanner for App.jsx.
Scans for common a11y anti-patterns in the 78K-line monolith.
"""
import re, sys, json

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\App.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

findings = {
    "buttons_no_aria": [],
    "onclick_div_span": [],
    "img_no_alt": [],
    "input_no_label": [],
    "color_only_indicators": [],
    "tabindex_positive": [],
    "autofocus_usage": [],
    "missing_role": [],
    "svg_no_aria": [],
    "has_aria_label": 0,
    "has_aria_live": 0,
    "has_role": 0,
    "has_sr_only": 0,
    "has_focus_trap": 0,
    "has_skip_nav": 0,
}

total_buttons = 0
total_inputs = 0
total_imgs = 0
total_svgs = 0
total_onclicks = 0

for i, line in enumerate(lines):
    ln = i + 1
    stripped = line.strip()
    
    # Count aria-label usage (good pattern)
    if 'aria-label' in line:
        findings["has_aria_label"] += 1
    if 'aria-live' in line:
        findings["has_aria_live"] += 1
    if 'role=' in line:
        findings["has_role"] += 1
    if 'sr-only' in line:
        findings["has_sr_only"] += 1
    if 'focus-trap' in line.lower() or 'focustrap' in line.lower():
        findings["has_focus_trap"] += 1
    if 'skip' in line.lower() and 'nav' in line.lower():
        findings["has_skip_nav"] += 1
    
    # 1. Buttons without aria-label or text children (icon-only buttons)
    if '<button' in line and 'aria-label' not in line:
        total_buttons += 1
        # Check next few lines for text content vs just icons
        context = ''.join(lines[i:min(i+3, len(lines))])
        if ('size={' in context or '<svg' in context or 'Icon' in context) and '>' in context:
            # Icon-only button without aria-label
            snippet = stripped[:100]
            findings["buttons_no_aria"].append({"line": ln, "snippet": snippet})
    elif '<button' in line:
        total_buttons += 1
    
    # 2. onClick on non-interactive elements (div, span, etc.)
    if re.search(r'<(div|span)\b[^>]*onClick', line):
        total_onclicks += 1
        snippet = stripped[:120]
        if 'role=' not in line and 'tabIndex' not in line and 'tabindex' not in line:
            findings["onclick_div_span"].append({"line": ln, "snippet": snippet})
    
    # 3. Images without alt text
    if '<img' in line:
        total_imgs += 1
        if 'alt=' not in line and 'alt =' not in line:
            # Check next line too
            next_line = lines[i+1] if i+1 < len(lines) else ''
            if 'alt=' not in next_line:
                snippet = stripped[:120]
                findings["img_no_alt"].append({"line": ln, "snippet": snippet})
    
    # 4. Inputs without associated labels
    if '<input' in line:
        total_inputs += 1
        context = ''.join(lines[max(0,i-2):min(i+2, len(lines))])
        if 'aria-label' not in context and '<label' not in context and 'id=' not in line:
            snippet = stripped[:120]
            findings["input_no_label"].append({"line": ln, "snippet": snippet})
    
    # 5. Positive tabIndex (anti-pattern)
    match = re.search(r'tabIndex[=\s]*["{](\d+)', line)
    if match and match.group(1) != '0':
        findings["tabindex_positive"].append({"line": ln, "value": match.group(1)})
    
    # 6. autoFocus usage (potential a11y issue)
    if 'autoFocus' in line or 'autofocus' in line.lower():
        findings["autofocus_usage"].append({"line": ln, "snippet": stripped[:100]})
    
    # 7. SVG without aria-hidden or aria-label
    if '<svg' in line.lower():
        total_svgs += 1

# Print summary
print("=" * 60)
print("ACCESSIBILITY AUDIT RESULTS")
print("=" * 60)
print()

print("--- GOOD PATTERNS FOUND ---")
print(f"  aria-label occurrences: {findings['has_aria_label']}")
print(f"  aria-live regions: {findings['has_aria_live']}")
print(f"  role attributes: {findings['has_role']}")
print(f"  sr-only classes: {findings['has_sr_only']}")
print(f"  Focus trap patterns: {findings['has_focus_trap']}")
print(f"  Skip navigation: {findings['has_skip_nav']}")
print()

print("--- TOTALS ---")
print(f"  Total <button>: {total_buttons}")
print(f"  Total <input>: {total_inputs}")
print(f"  Total <img>: {total_imgs}")
print(f"  Total onClick on div/span: {total_onclicks}")
print()

print(f"--- ISSUE: Buttons without aria-label ({len(findings['buttons_no_aria'])} found) ---")
for f in findings["buttons_no_aria"][:15]:
    print(f"  L{f['line']}: {f['snippet']}")
print()

print(f"--- ISSUE: onClick on div/span without role (top {min(15, len(findings['onclick_div_span']))}) ---")
for f in findings["onclick_div_span"][:15]:
    print(f"  L{f['line']}: {f['snippet']}")
print()

print(f"--- ISSUE: Images without alt ({len(findings['img_no_alt'])} found) ---")
for f in findings["img_no_alt"][:15]:
    print(f"  L{f['line']}: {f['snippet']}")
print()

print(f"--- ISSUE: Inputs without labels ({len(findings['input_no_label'])} found) ---")
for f in findings["input_no_label"][:15]:
    print(f"  L{f['line']}: {f['snippet']}")
print()

print(f"--- ISSUE: Positive tabIndex ({len(findings['tabindex_positive'])} found) ---")
for f in findings["tabindex_positive"][:10]:
    print(f"  L{f['line']}: tabIndex={f['value']}")
print()

print(f"--- INFO: autoFocus usage ({len(findings['autofocus_usage'])} found) ---")
for f in findings["autofocus_usage"][:10]:
    print(f"  L{f['line']}: {f['snippet']}")

# Summary counts to JSON for machine parsing
summary = {
    "good": {
        "aria_labels": findings["has_aria_label"],
        "aria_live": findings["has_aria_live"],
        "roles": findings["has_role"],
        "sr_only": findings["has_sr_only"],
    },
    "issues": {
        "buttons_no_aria": len(findings["buttons_no_aria"]),
        "onclick_no_role": len(findings["onclick_div_span"]),
        "img_no_alt": len(findings["img_no_alt"]),
        "input_no_label": len(findings["input_no_label"]),
        "tabindex_positive": len(findings["tabindex_positive"]),
        "autofocus": len(findings["autofocus_usage"]),
    }
}
print("\n--- JSON SUMMARY ---")
print(json.dumps(summary, indent=2))
