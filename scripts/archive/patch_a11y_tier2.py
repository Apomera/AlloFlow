"""
Tier 2 Accessibility Fixes:
1. Replace generic aria-labels with contextual ones
2. Add aria-expanded to expandable components

The 226 generic labels are mostly:
- aria-label="Text input" → needs context like "Enter word", "Student name", etc.  
- aria-label="Close" → needs context like "Close settings dialog", "Close modal"

Strategy: Do contextual fixes by examining surrounding code.
Since we can't infer all 226 from code alone, we'll:
A. Fix the most common generic patterns with reasonable defaults
B. Add aria-expanded to modals
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

count = 0

# ============================================================
# FIX 1: aria-label="Text input" → contextual labels
# ============================================================
# These are scattered across the app. We'll find each one and
# try to infer context from the surrounding code (placeholder, nearby text, etc.)

text_input_lines = []
for i, line in enumerate(lines):
    if 'aria-label="Text input"' in line:
        text_input_lines.append(i)

print(f"Found {len(text_input_lines)} instances of aria-label=\"Text input\"")

# For each, try to find a placeholder or nearby label
for idx in text_input_lines:
    line = lines[idx]
    # Check for placeholder=
    ph_match = re.search(r'placeholder="([^"]+)"', line)
    if not ph_match:
        # Check next line
        if idx + 1 < len(lines):
            ph_match = re.search(r'placeholder="([^"]+)"', lines[idx + 1])
    if not ph_match:
        # Check previous line        
        if idx - 1 >= 0:
            ph_match = re.search(r'placeholder="([^"]+)"', lines[idx - 1])
    
    if ph_match:
        context = ph_match.group(1)
        # Truncate long placeholders
        if len(context) > 60:
            context = context[:60]
        lines[idx] = lines[idx].replace('aria-label="Text input"', f'aria-label="{context}"', 1)
        count += 1
    else:
        # Try to find a t('...') nearby for context
        t_match = re.search(r"t\('([^']+)'\)", line)
        if t_match:
            context = t_match.group(1).split('.')[-1].replace('_', ' ').title()
            lines[idx] = lines[idx].replace('aria-label="Text input"', f'aria-label="{context}"', 1)
            count += 1

print(f"  Fixed {count} 'Text input' labels with contextual labels from placeholders")

# ============================================================
# FIX 2: aria-label="Close" → add context
# ============================================================
close_count = 0
for i, line in enumerate(lines):
    if 'aria-label="Close"' in line:
        # Look backward for a modal heading or component name
        context = "Close"
        for j in range(max(0, i-10), i):
            # Look for h2, h3, title patterns
            h_match = re.search(r'<h[23][^>]*>([^<]+)<', lines[j])
            if h_match:
                heading = h_match.group(1).strip()
                if heading and len(heading) < 40:
                    context = f"Close {heading}"
                    break
            # Look for title prop
            title_match = re.search(r'title[=:]"([^"]+)"', lines[j])
            if title_match:
                context = f"Close {title_match.group(1)}"
                break
        
        if context != "Close":
            lines[i] = lines[i].replace('aria-label="Close"', f'aria-label="{context}"', 1)
            close_count += 1

print(f"  Fixed {close_count} 'Close' labels with contextual labels")
count += close_count

# ============================================================  
# FIX 3: Add aria-expanded to modal/expandable components
# ============================================================
# Pattern: isOpen={someState} → add aria-expanded={someState}
# Only for components where isOpen is a boolean prop 

expanded_count = 0
for i, line in enumerate(lines):
    if 'isOpen={' in line and 'aria-expanded' not in line:
        # This is likely a modal container - the isOpen prop suggests expand/collapse
        # We should check if this is a JSX component tag
        match = re.search(r'<(\w+)', line)
        if match:
            comp = match.group(1)
            # Only add to our known modal components
            if comp[0].isupper():  # React component
                # Find the isOpen value
                is_open_match = re.search(r'isOpen=\{([^}]+)\}', line)
                if is_open_match:
                    # Don't add aria-expanded inline — the component should handle it
                    # Instead, we note it for manual review
                    pass

# Better approach: add aria-expanded to the OUTER wrapper divs that serve as modal overlays
# Pattern: fixed inset-0 ... + conditional rendering already handles show/hide
# The main thing missing is aria-expanded on collapsible sections

# Find expandable section patterns (toggle-based content visibility)
# Example: {showX && <div ...>}
# These should have aria-expanded on the toggle button

# For now, let's find and fix existing toggleable patterns
# where a button controls visibility of a section
print(f"  Skipping aria-expanded (requires per-component manual review for safety)")

content = '\n'.join(lines)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Tier 2: Total fixes applied: {count}")
