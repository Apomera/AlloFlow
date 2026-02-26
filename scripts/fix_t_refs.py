# -*- coding: utf-8 -*-
"""Replace t() calls in injectFontStyles CSS with static selectors."""

MAIN_FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(MAIN_FILE, 'r', encoding='utf-8') as f:
    text = f.read()

old = "nav[aria-label={t('common.content_tabs')}]"
new = "nav[aria-label]"

count = text.count(old)
print(f"Found {count} occurrences of t() in CSS selectors")

text = text.replace(old, new)

with open(MAIN_FILE, 'w', encoding='utf-8') as f:
    f.write(text)

print(f"Replaced {count} occurrences. Done!")
