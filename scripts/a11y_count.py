import sys
FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\App.jsx"
with open(FILE, "r", encoding="utf-8") as f:
    c = f.read()
pairs = [
    ("aria-label", "aria-label"),
    ("aria-live", "aria-live"),
    ("role=", 'role="'),
    ("sr-only", "sr-only"),
    ("tabIndex", "tabIndex"),
    ("autoFocus", "autoFocus"),
    ("<button", "<button"),
    ("<input", "<input"),
    ("<img", "<img"),
    ("loading=lazy", 'loading="lazy"'),
    ("alt=", "alt="),
    ("onClick on div", '<div onClick'),
    ("onClick on span", '<span onClick'),
    ("focus-trap", "focus-trap"),
    ("aria-hidden", "aria-hidden"),
    ("aria-describedby", "aria-describedby"),
    ("aria-labelledby", "aria-labelledby"),
    ("aria-expanded", "aria-expanded"),
    ("aria-pressed", "aria-pressed"),
    ("aria-selected", "aria-selected"),
    ("aria-checked", "aria-checked"),
]
for label, pat in pairs:
    print(f"{label}: {c.count(pat)}")
