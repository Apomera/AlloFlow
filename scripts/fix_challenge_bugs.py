"""
Comprehensive fix for label challenge bugs + smart anchor points.

Fix 1: Move modal from L551 (wrong scope) to inside VPG return (before </div>) at ~L2759
Fix 2: Replace displayPanels -> orderedPanels at L2100 and L2429
Fix 3: Add anchorX/anchorY to label generation prompt (L42880)
Fix 4: Wire generated anchors into aiLabelAnchors initialization in VPG
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# === FIX 1: Move modal from wrong scope to inside VPG ===
# Remove modal block from wrong location (L551 area)
# The modal starts with {/* === Label Challenge Results Modal === */}
# and ends before the next unrelated element
modal_start = content.find('{/* === Label Challenge Results Modal === */}')
if modal_start == -1:
    print("[ERROR] Could not find modal start marker!")
else:
    # Find the modal's closing tag: it ends with </div>\n)}
    # The modal structure is: {showComparison && challengeResult && ( <div>...</div> )}
    # We need to find the matching closing
    search_from = modal_start
    # Find the outermost closing of the conditional render: ends with ")}\n"
    # The structure is:   {showComparison && challengeResult && (\n   <div ...>.....</div>\n   )}
    # We need to find the matching ")}""
    depth = 0
    in_jsx = False
    modal_end = -1
    i = content.find('showComparison && challengeResult', search_from)
    if i != -1:
        # Find the opening paren after &&
        paren_start = content.index('(', i + 30)
        depth = 1
        pos = paren_start + 1
        while depth > 0 and pos < len(content):
            ch = content[pos]
            if ch == '(' and not in_jsx:
                depth += 1
            elif ch == ')' and not in_jsx:
                depth -= 1
            elif ch == '{':
                # Check if it's JSX expression
                pass
            pos += 1
        # pos is now right after the closing )
        # The full block ends at the next } (the closing of {showComparison && ... })
        # Find the closing }
        close_brace = content.index('}', pos - 1)
        modal_end = close_brace + 1
        # Also consume trailing newline
        if modal_end < len(content) and content[modal_end] == '\n':
            modal_end += 1
        if modal_end < len(content) and content[modal_end] == '\r':
            modal_end += 1
        if modal_end < len(content) and content[modal_end] == '\n':
            modal_end += 1
        
        # Extract the modal block
        modal_block = content[modal_start:modal_end].strip()
        
        # Remove it from wrong location
        # Include surrounding whitespace and the line
        line_start = content.rfind('\n', 0, modal_start) + 1
        content = content[:line_start] + content[modal_end:]
        changes.append("Removed modal from wrong scope (L551 area)")
        
        # Now insert modal inside VPG just before the closing </div> + );\n});\n
        # The VPG return closes with: \n        </div>\n    );\n});\n
        # Find the VPG closing pattern
        vpg_close_marker = "        </div>\r\n    );\r\n});"
        vpg_close_idx = content.find(vpg_close_marker)
        if vpg_close_idx == -1:
            # Try without \r
            vpg_close_marker = "        </div>\n    );\n});"
            vpg_close_idx = content.find(vpg_close_marker)
        
        if vpg_close_idx == -1:
            # Look for: orderedPanels.length (inside VPG) then find closing
            print("[WARN] Could not find VPG close marker, trying alternate approach")
            # Find the line "    </div>" that comes just before the ");" that ends VPG
            # Search for pattern after orderedPanels
            idx = content.find("const WordSoundsGenerator")
            if idx != -1:
                # Go back to find the closing })
                search_back = content.rfind("});", 0, idx)
                # Go back further to find </div>
                search_div = content.rfind("</div>", 0, search_back)
                vpg_close_idx = search_div
                vpg_close_marker = "</div>"
        
        if vpg_close_idx != -1:
            # Insert modal block before the closing </div>
            indent = "            "
            modal_insert = "\r\n" + indent + modal_block + "\r\n"
            content = content[:vpg_close_idx] + modal_insert + content[vpg_close_idx:]
            changes.append("Inserted modal inside VPG return (before closing </div>)")
        else:
            print("[ERROR] Could not find VPG closing position for modal insertion!")

# === FIX 2: Replace displayPanels -> orderedPanels ===
count = content.count('displayPanels')
if count > 0:
    content = content.replace('displayPanels', 'orderedPanels')
    changes.append("Replaced %d occurrences of displayPanels -> orderedPanels" % count)
else:
    changes.append("[SKIP] displayPanels not found (may already be fixed)")

# === FIX 3: Add anchorX/anchorY to label generation prompt ===
old_label_schema = '{ "text": "Label text", "position": "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right" }'
new_label_schema = '{ "text": "Label text", "position": "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right", "anchorX": 50, "anchorY": 50 }'

if old_label_schema in content:
    content = content.replace(old_label_schema, new_label_schema)
    changes.append("Added anchorX/anchorY to label JSON schema in prompt")
else:
    print("[WARN] Could not find exact label schema, trying flexible match")
    # Try a regex approach
    pattern = r'\{ "text": "Label text", "position": "top-left"[^}]+\}'
    if re.search(pattern, content):
        content = re.sub(pattern, new_label_schema, content)
        changes.append("Added anchorX/anchorY to label JSON schema (regex)")
    else:
        print("[ERROR] Label schema not found!")

# Also add a note after "Labels should point to specific parts" line
old_label_note = "- Labels should point to specific parts of the image"
new_label_note = "- Labels should point to specific parts of the image\n- anchorX/anchorY (0-100) indicate where on the image the label's leader line should point to (percentage coordinates)"
if old_label_note in content:
    content = content.replace(old_label_note, new_label_note, 1)
    changes.append("Added anchorX/anchorY documentation to prompt RULES")

# === FIX 4: Wire generated anchors into aiLabelAnchors initialization in VPG ===
# When VPG loads, if panels have anchor data from Gemini, use it as initial anchors
# Find where aiLabelAnchors state is initialized
old_anchor_init = "const [aiLabelAnchors, setAiLabelAnchors] = React.useState(initialAnnotations?.aiLabelAnchors || {});"
if old_anchor_init in content:
    new_anchor_init = """const [aiLabelAnchors, setAiLabelAnchors] = React.useState(() => {
        // Merge AI-generated anchor hints with saved annotation overrides
        const saved = initialAnnotations?.aiLabelAnchors || {};
        const fromAI = {};
        if (visualPlan?.panels) {
            visualPlan.panels.forEach((p, pi) => {
                (p.labels || []).forEach((l, li) => {
                    const key = pi + '-' + li;
                    if (l.anchorX != null && l.anchorY != null && !saved[key]) {
                        fromAI[key] = { x: l.anchorX, y: l.anchorY };
                    }
                });
            });
        }
        return { ...fromAI, ...saved };
    });"""
    content = content.replace(old_anchor_init, new_anchor_init)
    changes.append("Wired AI-generated anchorX/anchorY into initial aiLabelAnchors state")
else:
    print("[WARN] Could not find aiLabelAnchors init")

# Write
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n" + "="*60)
print("Applied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)
print("="*60)
