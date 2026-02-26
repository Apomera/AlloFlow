"""
Add header normalization to cleanSourceMetaCommentary:
1. Ensure markdown headers always have blank lines before/after them
2. This ensures the paragraph splitter (split by \n\n) treats headers as separate paragraphs
"""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# The header normalization block already exists (from earlier patch), 
# but we need to add BEFORE it: ensure headers have blank lines around them
# This needs to go right after the horizontal rule cleanup and BEFORE 
# the header ratio analysis

target = """        // --- Markdown Header Normalization ---
        // Fixes intermittent Gemini issue where body paragraphs are formatted as headers"""

# Add header spacing enforcement BEFORE the ratio-based normalization
insert = """        // --- Ensure Headers Have Proper Paragraph Breaks ---
        // Gemini sometimes outputs headers with only single newlines, merging them into body paragraphs.
        // This causes the paragraph splitter (split by \\n\\n) to treat header+body as one block.
        // Fix: ensure every markdown header line has a blank line before and after it.
        cleaned = cleaned.replace(/([^\\n])\\n(#{1,4}\\s)/g, '$1\\n\\n$2');
        cleaned = cleaned.replace(/(#{1,4}\\s[^\\n]+)\\n([^#\\n])/g, '$1\\n\\n$2');

        """

if 'Ensure Headers Have Proper Paragraph Breaks' in content:
    print("Header spacing enforcement already present!")
else:
    if target in content:
        content = content.replace(target, insert + target, 1)
        with open('AlloFlowANTI.txt', 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        print("Header spacing enforcement added!")
    else:
        print("ERROR: Target block not found!")
        exit(1)

# Verify
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    v = f.read()

checks = {
    "Header spacing enforcement": "Ensure Headers Have Proper Paragraph Breaks" in v,
    "Header-heavy detection": "Header-heavy text detected" in v,
    "cleanSourceMetaCommentary func": "const cleanSourceMetaCommentary" in v,
}
for label, ok in checks.items():
    print(f"  {'PASS' if ok else 'FAIL'}: {label}")
