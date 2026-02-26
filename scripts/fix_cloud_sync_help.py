"""
Fix: Add Canvas environment limitation to header_cloud_sync help string.
"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The exact old text in the header_cloud_sync string
old_text = (
    'All data is encrypted in transit and at rest via Firebase security.",'
)
new_text = (
    'All data is encrypted in transit and at rest via Firebase security. '
    'Note: Cloud sync is disabled when running inside Google Canvas environments.",'
)

count = content.count(old_text)
print(f"Found {count} occurrence(s) of target text.")

if count == 1:
    content = content.replace(old_text, new_text)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("[FIXED] header_cloud_sync: Added Canvas environment limitation note.")
elif count == 0:
    print("[SKIP] Target text not found — may already be fixed.")
else:
    print(f"[WARN] Found {count} occurrences — not replacing to avoid ambiguity.")

print("\nDone.")
