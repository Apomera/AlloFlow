"""Fix star button in PhonologyView/IsolationView to use data.correctSound instead of data.correctAnswer"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# The star button code references data.correctAnswer — change to data.correctSound
old = "data.correctAnswer"
count = content.count(old)
print("Found %d occurrences of data.correctAnswer" % count)

# Only replace within the PhonologyView component (should be around L5280-5310)
# Use a more targeted replacement
changes = 0

# Replace all occurrences of data.correctAnswer in the edit mode star button section
# These are the template comparisons we inserted
replacements = [
    ("opt?.toLowerCase() === data.correctAnswer?.toLowerCase()", "opt?.toLowerCase() === data.correctSound?.toLowerCase()"),
]

for old_str, new_str in replacements:
    c = content.count(old_str)
    if c > 0:
        content = content.replace(old_str, new_str)
        changes += c
        print("Replaced %d occurrence(s) of correctAnswer →  correctSound" % c)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d replacements" % changes)
