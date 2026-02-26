"""
Check how help_mode keys are accessed - static vs dynamic.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Static help_mode t() references
matches = re.findall(r"t[s]?\(['\"`](help_mode\.[^'\"`\s]+)['\"`]", content)
print(f"Static help_mode t() references: {len(matches)}")
for m in sorted(set(matches)):
    print(f"  {m}")

# 2. Dynamic help_mode references like t(`help_mode.${...}`)
dynamic = re.findall(r"t[s]?\(`help_mode\.\$\{[^}]+\}`\)", content)
print(f"\nDynamic help_mode t() references: {len(dynamic)}")
for d in dynamic[:20]:
    print(f"  {d[:100]}")

# 3. HELP_STRINGS[key] references
help_str_refs = re.findall(r"HELP_STRINGS\[([^\]]+)\]", content)
print(f"\nHELP_STRINGS[key] references: {len(help_str_refs)}")
for h in sorted(set(help_str_refs))[:10]:
    print(f"  HELP_STRINGS[{h}]")

# 4. data-help-key attributes (these drive which help_mode keys to look up)
data_help = re.findall(r'data-help-key="([^"]+)"', content)
print(f"\ndata-help-key attributes: {len(data_help)} total, {len(set(data_help))} unique")

# 5. Check how help mode resolves keys
help_resolve = re.findall(r"HELP_STRINGS\[.*?\]|help_mode.*?t\(", content)
print(f"\nHelp resolution patterns: {len(help_resolve)}")
