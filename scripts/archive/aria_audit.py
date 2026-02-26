"""
Phase 1: Smart Aria-Label Audit
For each <button in the file, extract:
- Whether it has aria-label already
- Whether it has title already
- Whether it has visible text (not just icons)
- Its data-help-key (for context)
- The icon component inside (for generating a label)

Output: a JSON-like report of buttons truly needing aria-label
"""
import sys, re, json
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    lines = f.readlines()

# Parse each button element
# A button starts with <button and ends with </button>
# We need to capture the full element to check for aria-label, title, text content

results = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Find button opening tags (but not ButtonComponent or similar)
    if re.search(r'<button[\s>]', line) and not re.search(r'<button[A-Z]', line):
        # Capture the full button element
        btn_start = i
        btn_lines = [line]
        depth = 0
        found_close = False
        
        # Count <button opens and </button> closes
        for ch_i in range(len(line)):
            if line[ch_i:ch_i+7] == '<button':
                depth += 1
        
        # Look for self-closing or closing tag
        if '/>' in line and '</button>' not in line:
            # Self-closing on same line
            found_close = True
        elif '</button>' in line:
            found_close = True
        
        if not found_close:
            j = i + 1
            while j < min(len(lines), i + 30):
                btn_lines.append(lines[j])
                if '</button>' in lines[j]:
                    found_close = True
                    break
                j += 1
        
        btn_text = ''.join(btn_lines)
        btn_end = i + len(btn_lines) - 1
        
        # Extract properties
        has_aria_label = bool(re.search(r'aria-label', btn_text))
        has_title = bool(re.search(r'title[=\s{]', btn_text))
        has_help_key = re.search(r'data-help-key="([^"]+)"', btn_text)
        help_key = has_help_key.group(1) if has_help_key else None
        
        # Check for visible text (text between > and <, excluding icon components)
        # Strip JSX tags and see if there's remaining text
        inner = re.sub(r'<[^>]+>', '', btn_text)
        inner = re.sub(r'\{[^}]+\}', '', inner)  # Remove JSX expressions
        visible_text = inner.strip()
        has_text = bool(visible_text) and len(visible_text) > 1
        
        # Extract icon names
        icon_match = re.findall(r'<(\w+)\s+size=', btn_text)
        icons = icon_match if icon_match else []
        
        # Extract onClick handler for context
        onclick_match = re.search(r'onClick=\{([^}]+)\}', btn_text)
        onclick = onclick_match.group(1) if onclick_match else None
        
        # Check for data-help-ignore
        has_help_ignore = 'data-help-ignore' in btn_text
        
        if not has_aria_label:
            results.append({
                'line': btn_start + 1,
                'has_title': has_title,
                'has_text': has_text,
                'help_key': help_key,
                'icons': icons,
                'onclick': onclick[:60] if onclick else None,
                'has_help_ignore': has_help_ignore,
                'snippet': lines[btn_start].strip()[:80]
            })
        
        i = btn_end + 1
    else:
        i += 1

# Categorize
has_title_only = [r for r in results if r['has_title'] and not r['has_text']]
has_text_only = [r for r in results if r['has_text'] and not r['has_title']]
has_both = [r for r in results if r['has_text'] and r['has_title']]
has_neither = [r for r in results if not r['has_text'] and not r['has_title']]
has_icons = [r for r in has_neither if r['icons']]

out = open('aria_audit.txt', 'w', encoding='utf-8')
def write(msg):
    out.write(msg + '\n')

write("=" * 70)
write("  ARIA-LABEL ACCESSIBILITY AUDIT")
write("=" * 70)
write(f"\n  Total buttons without aria-label: {len(results)}")
write(f"  Has title (can derive label):     {len(has_title_only)}")
write(f"  Has visible text (adequate):      {len(has_text_only)}")
write(f"  Has both title + text:            {len(has_both)}")
write(f"  Has NEITHER (needs attention):    {len(has_neither)}")
write(f"    of which have icon components:  {len(has_icons)}")

write("\n" + "=" * 70)
write("  STRATEGY")
write("=" * 70)
write("""
  1. Buttons with title= but no aria-label:
     → Add aria-label matching the title (best practice)
  
  2. Buttons with visible text but no aria-label:
     → Already accessible via text content (no change needed)
     
  3. Buttons with NEITHER title nor text (icon-only):
     → Need manual label based on icon/context
""")

write("\n" + "=" * 70)
write("  CATEGORY A: Has title, no aria-label (auto-fixable)")
write("=" * 70)
for r in has_title_only[:30]:
    write(f"  L{r['line']}: {r['snippet']}")
write(f"  ... {len(has_title_only)} total")

write("\n" + "=" * 70)
write("  CATEGORY B: Has visible text (already accessible)")
write("=" * 70)
for r in has_text_only[:10]:
    write(f"  L{r['line']}: {r['snippet']}")
write(f"  ... {len(has_text_only)} total")

write("\n" + "=" * 70)
write("  CATEGORY C: Icon-only, no title, no text (needs label)")
write("=" * 70)
for r in has_icons:
    write(f"  L{r['line']}: icons={r['icons']} | onClick={r['onclick'] or 'N/A'} | help_key={r['help_key'] or 'N/A'}")
write(f"  ... {len(has_icons)} total")

write("\n" + "=" * 70)
write("  CATEGORY D: No title, no text, no icons (needs investigation)")
write("=" * 70)
no_icon_neither = [r for r in has_neither if not r['icons']]
for r in no_icon_neither[:20]:
    write(f"  L{r['line']}: onClick={r['onclick'] or 'N/A'} | {r['snippet']}")
write(f"  ... {len(no_icon_neither)} total")

out.close()

# Also save the JSON for the fix script
with open('aria_audit.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print(f"Wrote aria_audit.txt ({len(results)} buttons)")
print(f"Wrote aria_audit.json")
print(f"\n  Auto-fixable (has title): {len(has_title_only)}")
print(f"  Already accessible (has text): {len(has_text_only) + len(has_both)}")
print(f"  Needs manual label: {len(has_neither)}")
print("DONE")
